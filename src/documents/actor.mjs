import { RULES_BY_ID } from "../util/statuses.mjs";

/**
 * @typedef {object} DamageResult
 * @property {number} requested   The damage that was asked for, before temporary HP.
 * @property {number} absorbed    Damage absorbed by temporary HP.
 * @property {number} dealt       Damage that reduced HP.
 * @property {number} before      HP before the damage.
 * @property {number} after       HP after the damage.
 * @property {boolean} downed     Whether this damage reduced the actor to 0 HP.
 */

export class HellpiercersActor extends foundry.documents.Actor {
  static getDefaultArtwork(actorData) {
    const model = CONFIG.Actor.dataModels[actorData?.type];
    if (typeof model?.getDefaultArtwork === "function") return model.getDefaultArtwork(actorData);
    return {
      img: model?.DEFAULT_ICON ?? this.DEFAULT_ICON,
      texture: {
        src: model?.DEFAULT_ICON ?? this.DEFAULT_ICON,
      },
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const size = 2 * this.system.scale - 1;
    if (Number.isNaN(size) || size <= 0) return;
    const change = { type: "override", value: size, priority: 50, phase: "initial" };
    this.tokenActiveEffectChanges.initial.push(
      { key: "width", ...change },
      { key: "height", ...change },
      { key: "depth", ...change }
    );
    if (!this.prototypeToken.getFlag(game.system.id, "manual_token_size")) {
      this.prototypeToken.updateSource({ width: size, height: size, depth: size });
    }
  }

  /* -------------------------------------------- */
  /*  Statuses                                    */
  /* -------------------------------------------- */

  /**
   * Total stacks of a status on this actor across all of its effects. Effects with no stack count
   * (overlays or plain toggles) count as a single stack.
   * @param {string} statusId
   * @returns {number}
   */
  getStatusStacks(statusId) {
    let total = 0;
    for (const effect of this.effects) {
      if (!effect.statuses.has(statusId) || effect.disabled) continue;
      total += effect.system.stacks ?? 1;
    }
    return total;
  }

  /**
   * All effects on this actor that carry the given status.
   * @param {string} statusId
   * @returns {foundry.documents.ActiveEffect[]}
   */
  getStatusEffects(statusId) {
    return this.effects.filter(e => e.statuses.has(statusId));
  }

  /**
   * Apply stacks of a status using the status' stacking rule ("add" or "max").
   * @param {string} statusId
   * @param {number} [stacks=1]
   */
  async applyStatus(statusId, stacks = 1, { permanent = false } = {}) {
    if (!(statusId in CONFIG.statusEffects)) {
      throw new Error(`Invalid status ID "${statusId}"`);
    }
    if (!(stacks > 0)) return null;
    if (permanent) return this.#applyPermanentStatus(statusId, stacks);
    const rule = RULES_BY_ID[statusId];
    const current = this.getStatusStacks(statusId);
    if (rule?.stack === "max" && current > 0) {
      if (stacks <= current) return null;
      return this.toggleStatusEffect(statusId, { direction: stacks - current });
    }
    return this.toggleStatusEffect(statusId, { direction: stacks });
  }

  /**
   * Apply a status that does not decay: it lasts until the squad returns to DIS.
   * @param {string} statusId
   * @param {number} stacks
   */
  async #applyPermanentStatus(statusId, stacks) {
    const cls = getDocumentClass("ActiveEffect");
    const effect = await cls.fromStatusEffect(statusId);
    effect.updateSource({ "system.stacks": stacks, "system.decay": "never" });
    return cls.create(effect, { parent: this });
  }

  /**
   * Remove stacks of a status.
   * @param {string} statusId
   * @param {number} [stacks=Infinity]  The number of stacks to remove; omit to remove all.
   */
  async removeStatus(statusId, stacks = Number.POSITIVE_INFINITY) {
    const current = this.getStatusStacks(statusId);
    if (current <= 0) return null;
    if (stacks >= current) return this.toggleStatusEffect(statusId, { active: false });
    return this.toggleStatusEffect(statusId, { direction: -stacks });
  }

  /**
   * Trigger decay for all effects that decay on the specified event
   * @param {"round" | "turn"} reason
   * @param {number} [count=1]
   * @param {object} [options]
   * @param {Set<string>} [options.skip]  Status ids that should be skipped.
   */
  async decayEffects(reason, count = 1, { skip } = {}) {
    if (!["turn", "round"].includes(reason)) return;
    const changes = this.effects.reduce(
      (changes, effect) => {
        if (skip?.size && [...effect.statuses].some(s => skip.has(s))) return changes;
        if (effect.system.decay === reason && effect.system.stacks != null) {
          if (effect.system.stacks > count) {
            changes.updates.push({ _id: effect.id, "system.stacks": effect.system.stacks - count });
          } else changes.deletions.push(effect.id);
        }
        return changes;
      },
      { updates: [], deletions: [] }
    );
    if (changes.updates.length) await this.updateEmbeddedDocuments("ActiveEffect", changes.updates);
    if (changes.deletions.length)
      await this.deleteEmbeddedDocuments("ActiveEffect", changes.deletions);
  }

  /**
   * Consume stacks of a status that decays "when triggered" (Haste, Broken, Compel, Wrack...).
   * @param {string} statusId
   * @param {number} [count=1]
   */
  async consumeStatus(statusId, count = 1) {
    return this.removeStatus(statusId, count);
  }

  /** @override */
  async toggleStatusEffect(statusId, { direction, active, overlay } = {}) {
    const status = CONFIG.statusEffects[statusId];
    if (!status)
      throw new Error(`Invalid status ID "${statusId}" provided to Actor#toggleStatusEffect`);

    const existing = [];

    // Find the effect with the static _id of the status effect
    if (status._id) {
      const effect = this.effects.get(status._id);
      if (effect) existing.push(effect.toObject());
    } else {
      // If no static _id, find all single-status effects that have this status
      for (const e of this.effects) {
        if (e.statuses.size === 1 && e.statuses.has(status.id)) existing.push(e.toObject());
      }
    }

    if (existing.length > 0) {
      for (const e of existing) {
        overlay ??= foundry.utils.getProperty(e, "flags.core.overlay");
        const value = foundry.utils.getProperty(e, "system.stacks") ?? 1;
        foundry.utils.setProperty(
          e,
          "system.stacks",
          overlay ? (active ? null : 0) : value + (direction ?? (active ? 1 : -value))
        );
      }

      const deletions = existing.filter(e => (e.system.stacks ?? 1) <= 0).map(e => e._id);
      const updates = existing.filter(e => (e.system.stacks ?? 1) > 0);

      return Promise.allSettled([
        this.deleteEmbeddedDocuments("ActiveEffect", deletions),
        this.updateEmbeddedDocuments("ActiveEffect", updates),
      ]).then(r => r.flatMap(p => (p.status === "fulfilled" ? p.value : null)));
    }
    if ((direction > 0 || direction == null) && active !== false) {
      // Create the effect with a count of direction
      /** @type {foundry.documents["ActiveEffect"]} */
      const cls = getDocumentClass("ActiveEffect");
      const effect = await cls.fromStatusEffect(statusId);
      overlay ??= effect.getFlag("core", "overlay");
      effect.updateSource({ "system.stacks": overlay ? null : (direction ?? 1) });
      return cls.create(effect, { parent: this, keepId: true });
    }
  }

  /* -------------------------------------------- */
  /*  Health                                      */
  /* -------------------------------------------- */

  /**
   * Apply damage to this actor. Temporary HP is consumed first. This method applies the number it
   * is given: use {@link Damage#resolveFor} to account for Armor, Bleed and other modifiers.
   * @param {number} amount
   * @param {object} [options]
   * @param {boolean} [options.autoDefeat=true]  Mark the actor defeated when it reaches 0 HP.
   * @returns {Promise<DamageResult>}
   */
  async takeDamage(amount, { autoDefeat = true } = {}) {
    const health = this.system.health;
    const before = health.value ?? 0;
    const requested = Math.max(0, Math.floor(amount));
    const temp = health.temp ?? 0;
    const absorbed = Math.min(temp, requested);
    const dealt = requested - absorbed;
    const after = Math.max(0, before - dealt);
    const update = { "system.health.value": after };
    if (absorbed > 0) update["system.health.temp"] = temp - absorbed;
    await this.update(update);

    const downed = before > 0 && after <= 0;
    await this.#checkAgnosia(before, after);
    if (downed && autoDefeat) await this.setDefeated(true);
    if (downed) Hooks.callAll("hellpiercers.actorDowned", this);
    return { requested, absorbed, dealt, before, after, downed };
  }

  /**
   * Restore HP, never beyond max HP.
   * @param {number} amount
   * @returns {Promise<number>} The amount of HP actually restored
   */
  async heal(amount) {
    const health = this.system.health;
    const max = health.max ?? Number.POSITIVE_INFINITY;
    const before = health.value ?? 0;
    const after = Math.min(max, before + Math.max(0, Math.floor(amount)));
    if (after === before) return 0;
    await this.update({ "system.health.value": after });
    if (before <= 0 && after > 0) await this.setDefeated(false);
    const agnosia = this.system.agnosia;
    if (agnosia?.triggered && agnosia.value != null && after > agnosia.value) {
      await this.update({ "system.agnosia.triggered": false });
    }
    return after - before;
  }

  /**
   * AGNOSIA: when a Boss or Miniboss drops to its threshold it makes one final desperate move. This
   * announces it once (the move is played out immediately, and is not one of the unit's turns).
   * @param {number} before
   * @param {number} after
   */
  async #checkAgnosia(before, after) {
    const agnosia = this.system.agnosia;
    if (!agnosia || agnosia.value == null || agnosia.triggered) return;
    if (!(before > agnosia.value && after <= agnosia.value)) return;
    await this.update({ "system.agnosia.triggered": true });
    // Bosses keep their Agnosia effect in sync themselves.
    if (this.type !== "boss" && !this.statuses.has("agnosia")) await this.applyStatus("agnosia", 1);
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const enriched = await TextEditor.enrichHTML(agnosia.effect ?? "", { relativeTo: this });
    const ChatMessage = getDocumentClass("ChatMessage");
    await ChatMessage.create({
      content: `<div class="hellpiercers turn-note agnosia"><header>${game.i18n.format("HELLPIERCERS.TACCOM.agnosia", { name: foundry.utils.escapeHTML(this.name) })}</header><div>${enriched}</div></div>`,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flags: { [game.system.id]: { agnosia: true } },
    });
    Hooks.callAll("hellpiercers.agnosia", this);
  }

  /**
   * Grant Temporary HP. Temporary HP does not stack: the larger value is kept.
   * @param {number} amount
   * @param {object} [options]
   * @param {boolean} [options.add=false]  Add to existing temporary HP instead of taking the max.
   */
  async grantTempHP(amount, { add = false } = {}) {
    const current = this.system.health.temp ?? 0;
    const next = add ? current + amount : Math.max(current, amount);
    if (next === current) return current;
    await this.update({ "system.health.temp": Math.max(0, next) });
    return next;
  }

  /**
   * Mark this actor as defeated or revive it.
   * @param {boolean} defeated
   */
  async setDefeated(defeated) {
    const deadId = CONFIG.specialStatusEffects.DEFEATED;
    const isDefeated = this.statuses.has(deadId);
    if (isDefeated !== defeated) await this.toggleStatusEffect(deadId, { active: defeated });
    const combatants = this.getActiveTokens(true, true)
      .map(t => t.combatant)
      .filter(Boolean);
    for (const combatant of combatants) {
      if (combatant.defeated !== defeated) await combatant.update({ defeated });
    }
  }

  /**
   * Rez: bring a downed ally back to their feet with full HP (Main Action).
   */
  async rez() {
    await this.update({
      "system.health.value": this.system.health.max ?? this.system.health.value,
    });
    await this.setDefeated(false);
  }

  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    if (attribute === "swarm_hp" && this.type === "minion") {
      return this.system.modifySwarmHp(value, isDelta, isBar);
    }
    return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
  }

  counters = new Proxy(
    { _parent: this },
    {
      get(target, p) {
        if (p === "parent") return target._parent;
        const item = target._parent.items.get(p);
        return item?.system?.counter;
      },
      ownKeys(target) {
        return target._parent.items.filter(i => !!i.system?.counter?.enabled).map(i => i.id);
      },
      has(target, p) {
        return target._parent.items.some(i => i.id === p && i.system.counter.enabled);
      },
    }
  );
}
