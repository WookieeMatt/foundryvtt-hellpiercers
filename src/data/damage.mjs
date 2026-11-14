/** import { HellpiercersTokenDocument } from "../documents/token.mjs"; */

import { terrainAtToken } from "../canvas/terrain.mjs";
import { getSetting } from "../settings.mjs";

const fields = foundry.data.fields;

/**
 * @typedef {object} DamageModifier
 * @property {string} id      The status or rule that caused the modifier
 * @property {number} delta   How much it changed the damage
 */

/**
 * @typedef {object} ResolvedDamage
 * @property {number} base                     The rolled damage before modifiers
 * @property {number} total                    Damage after all modifiers
 * @property {DamageModifier[]} modifiers
 * @property {Array<[string, number]>} consume Statuses that are spent by this attack and how many stacks
 */

export class Damage extends foundry.abstract.DataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.DAMAGE"];
  static defineSchema() {
    return {
      formula: new fields.StringField({
        initial: "1",
        validate: v => foundry.dice.Roll.validate(v),
        validationError: "must be a valid Roll formula",
      }),
      source: new fields.DocumentUUIDField({ nullable: true, initial: null }),
      conditions: new fields.ObjectField(),
      qualities: new fields.SchemaField({
        piercing: new fields.BooleanField({ initial: false }),
        transference: new fields.BooleanField({ initial: false }),
        breaker: new fields.BooleanField({ initial: false }),
        overpenetrating: new fields.BooleanField({ initial: false }),
      }),
      wrack: new fields.NumberField({ integer: true, initial: null }),
      value: new fields.NumberField({ integer: true, initial: null }),
      roll: new fields.JSONField(),
    };
  }

  get evaluated() {
    return this.value != null;
  }

  get qualities_text() {
    const text = Object.entries(this.qualities)
      .reduce((text, [quality, active]) => {
        if (active)
          text.push(game.i18n.localize(`HELLPIERCERS.DAMAGE.FIELDS.qualities.${quality}.label`));
        return text;
      }, [])
      .join(", ");
    return text;
  }

  get short_text() {
    const text = [this.formula];
    for (const k in this.conditions) {
      const status = CONFIG.statusEffects[k];
      const name = status ? game.i18n.localize(status.name) : k;
      text.push(`${name}:  ${this.conditions[k]}`);
    }
    return text.join(", ");
  }

  get full_text() {
    const b = this.short_text;
    const q = this.qualities_text;
    if (q) return `${b}, ${q}`;
    return b;
  }

  /** The actor that produced this damage, if it can be found. */
  get attacker() {
    if (!this.source) return null;
    const doc = fromUuidSync(this.source);
    if (!doc) return null;
    return doc.documentName === "Item" ? doc.actor : doc;
  }

  /* -------------------------------------------- */
  /*  Resolution                                  */
  /* -------------------------------------------- */

  /**
   * Recompute the total of the rolled dice with Broken (every die is maxed) or Wrack (no die rolls
   * lower than the Wrack value, never above the die's maximum).
   * @param {object} options
   * @param {boolean} [options.max=false]
   * @param {number} [options.floor=0]
   * @returns {number | null} The new total, or null if it can't be recomputed.
   */
  #recompute({ max = false, floor = 0 } = {}) {
    if (!this.roll || this.value == null) return null;
    let data;
    try {
      data = typeof this.roll === "string" ? JSON.parse(this.roll) : this.roll;
      const roll = foundry.dice.Roll.fromData(data);
      const { DiceTerm, NumericTerm, OperatorTerm } = foundry.dice.terms;
      const parts = [];
      for (const term of roll.terms) {
        if (term instanceof DiceTerm) {
          if (max) {
            parts.push(term.number * term.faces);
            continue;
          }
          let sum = 0;
          for (const r of term.results) {
            if (!r.active) continue;
            sum += floor ? Math.min(term.faces, Math.max(r.result, floor)) : r.result;
          }
          parts.push(sum);
        } else if (term instanceof NumericTerm) parts.push(term.number);
        else if (term instanceof OperatorTerm) parts.push(term.operator);
        else if (term.isDeterministic) parts.push(term.total);
        else return null;
      }
      const total = foundry.dice.Roll.safeEval(parts.join(" "));
      return Number.isFinite(total) ? Math.floor(total) : null;
    } catch (err) {
      console.warn("hellpiercers | Could not recompute damage dice", err);
      return null;
    }
  }

  /**
   * Work out how much damage a particular target takes once its Effects are accounted for.
   * This does not change anything: see {@link Damage#apply}.
   * @param {foundry.documents.Actor} actor
   * @param {object} [options]
   * @param {foundry.documents.TokenDocument} [options.token]   The target token, for positional
   *   modifiers (Cover terrain, p. 100)
   * @returns {ResolvedDamage}
   */
  resolveFor(actor, { token = null } = {}) {
    const stacks = id => actor?.getStatusStacks?.(id) ?? 0;
    /** @type {DamageModifier[]} */
    const modifiers = [];
    /** @type {Array<[string, number]>} */
    const consume = [];
    const value = this.value ?? 0;
    let total = value;

    // Snakeskin negates the next attack completely.
    if (stacks("snakeskin") > 0) {
      consume.push(["snakeskin", stacks("snakeskin")]);
      modifiers.push({ id: "snakeskin", delta: -total });
      return { base: value, total: 0, modifiers, consume };
    }

    // Dice manipulation: Broken maxes every die, Wrack sets a floor on each.
    const broken = stacks("broken") > 0;
    const wrack = stacks("wrack");
    if (broken) consume.push(["broken", 1]);
    if (wrack > 0) consume.push(["wrack", wrack]);
    if (broken || wrack > 0) {
      const adjusted = this.#recompute({ max: broken, floor: wrack });
      if (adjusted != null && adjusted !== total) {
        modifiers.push({ id: broken ? "broken" : "wrack", delta: adjusted - total });
        total = adjusted;
      }
    }

    // Flat modifiers from Effects.
    const armorStacks = stacks("armor");
    if (armorStacks > 0) {
      const delta = getSetting("armorRule") === "stacks" ? armorStacks : 1;
      modifiers.push({ id: "armor", delta: -delta });
      total -= delta;
    }
    const bleedStacks = stacks("bleed");
    if (bleedStacks > 0) {
      const delta = getSetting("bleedRule") === "stacks" ? bleedStacks : 1;
      modifiers.push({ id: "bleed", delta });
      total += delta;
    }
    const constrict = stacks("constrict");
    if (constrict > 0) {
      modifiers.push({ id: "constrict", delta: constrict });
      total += constrict;
    }
    // Cover terrain: -1 damage while the target stands in Cover (p. 100).
    if (token && getSetting("automateTerrain") && terrainAtToken(token).has("cover")) {
      modifiers.push({ id: "cover", delta: -1 });
      total -= 1;
    }
    total = Math.max(0, total);

    // Glassflesh doubles the damage of the next attack.
    const glass = stacks("glassflesh");
    if (glass > 0) {
      modifiers.push({ id: "glassflesh", delta: total });
      total *= 2;
      consume.push(["glassflesh", glass]);
    }

    // Compel is spent by each attack against the compelling unit.
    if (stacks("compel") > 0) consume.push(["compel", 1]);

    return { base: value, total, modifiers, consume };
  }

  /* -------------------------------------------- */
  /*  Application                                 */
  /* -------------------------------------------- */

  /**
   * Apply this damage to a token.  Follow on to swarm if the token is in one.
   * @param {HellpiercersTokenDocument} target
   * @returns {Promise<ResolvedDamage & { result: import("../documents/actor.mjs").DamageResult }>}
   */
  async apply(target, { message = null } = {}) {
    if (!target.canUserModify(game.user, "update")) throw new Error("Cannot modify target");

    // Accepts a TokenDocument, or an Actor directly.
    const actor = target.documentName === "Actor" ? target : target.actor;
    const resolved = this.resolveFor(actor, {
      token: target.documentName === "Token" ? target : null,
    });
    const result = await actor.takeDamage(resolved.total);
    await this.#consume(actor, resolved.consume);
    await this.#applyTransference(result.dealt);
    await this.#applyConditions([actor]);
    if (result.downed && actor.type !== "human") await this.#creditKills(1);
    if (result.dealt > 0 || result.absorbed > 0) {
      Hooks.callAll("hellpiercers.hit", { tokens: actor.getActiveTokens(true), damage: this });
    }

    if (message) await this.#printConfirmation(resolved.total, message, [target.uuid]);
    return { ...resolved, result };
  }

  /**
   * @param {foundry.documents.CombatantGroup} group
   * @param {string[]} [tokens=[]]
   */
  async applyGroup(group, tokens = [], { message = null } = {}) {
    if (!group.canUserModify(game.user, "update")) throw new Error("Cannot modify swarm");

    /** @type {foundry.documents.Actor[]} */
    const actors = Array.from(group.members)
      .map(c => c.actor)
      .filter(Boolean);
    const resolved = this.resolveFor(actors[0]);
    // A swarm counts as having an Effect if any of its members does.
    for (const extra of ["armor", "bleed"]) {
      if (resolved.modifiers.some(m => m.id === extra)) continue;
      if (!actors.some(a => a.getStatusStacks(extra) > 0)) continue;
      const delta = extra === "armor" ? -1 : 1;
      resolved.modifiers.push({ id: extra, delta });
      resolved.total = Math.max(0, resolved.total + delta);
    }
    const dealt = resolved.total;

    // Bust shit up
    let brokenSquares = 0;
    if (this.qualities.breaker && dealt > group.system.getUnitHealth().value) {
      brokenSquares = tokens.length;
      await group.update({
        "system.health.value": Math.max(
          0,
          group.system.health.value - tokens.length * group.system.getUnitHealth().value
        ),
      });
      await Promise.allSettled(
        tokens.map(async t => {
          /** @type {foundry.documents.TokenDocument} */
          const target = fromUuidSync(t);
          await target.actor.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, {
            active: true,
          });
          await target.combatant.update({ group: null });
        })
      );
      await group.system.break();
    } else {
      await group.update({ "system.health.value": Math.max(0, group.system.health.value - dealt) });
    }
    await this.#consume(actors[0], resolved.consume);
    await this.#applyTransference(dealt);
    await this.#applyConditions(actors);
    if (dealt > 0) {
      Hooks.callAll("hellpiercers.hit", {
        tokens: tokens.map(uuid => fromUuidSync(uuid)).filter(Boolean),
        damage: this,
      });
    }
    // Every square of a Swarm that is defeated counts as an enemy defeated (p. 102).
    if (group.system.health.value <= 0) {
      await Promise.all(actors.map(a => a.setDefeated(true)));
      await this.#creditKills(actors.length);
    } else if (brokenSquares > 0) {
      await this.#creditKills(brokenSquares);
    }
    if (message) await this.#printConfirmation(dealt, message, [group.uuid, tokens]);
    return resolved;
  }

  /**
   * Credit defeated enemies towards the attacker's Limit Break (p. 102).
   * @param {number} count
   */
  async #creditKills(count) {
    const attacker = this.attacker;
    const limit = attacker?.system?.limit;
    if (attacker?.type !== "human" || !limit || !(count > 0)) return;
    const max = limit.max ?? Number.POSITIVE_INFINITY;
    const before = limit.value ?? 0;
    const after = Math.min(max, before + count);
    if (after === before) return;
    await attacker.update({ "system.limit.value": after });
    if (before < max && after >= max) {
      Hooks.callAll("hellpiercers.limitReady", attacker);
      await getDocumentClass("ChatMessage").create({
        content: `<div class="hellpiercers turn-note"><header>${game.i18n.format("HELLPIERCERS.TACCOM.limitReady", { name: foundry.utils.escapeHTML(attacker.name) })}</header></div>`,
        speaker: getDocumentClass("ChatMessage").getSpeaker({ actor: attacker }),
      });
    }
  }

  /**
   * Spend the Effects that this attack consumed.
   * @param {foundry.documents.Actor} actor
   * @param {Array<[string, number]>} consume
   */
  async #consume(actor, consume) {
    for (const [status, count] of consume) await actor.consumeStatus(status, count);
  }

  /** Heal the attacker for the damage they dealt if the attack or the attacker has Transference. */
  async #applyTransference(dealt) {
    if (!(dealt > 0)) return;
    const attacker = this.attacker;
    if (!attacker?.heal) return;
    if (!this.qualities.transference && attacker.getStatusStacks("transference") <= 0) return;
    await attacker.heal(dealt);
  }

  /**
   * Apply this attack's conditions to the actors. A Bound attacker can't inflict Effects.
   * @param {foundry.documents.Actor[]} actors
   */
  async #applyConditions(actors) {
    if (!Object.keys(this.conditions).length) return;
    if (this.attacker?.getStatusStacks?.("bound") > 0) return;
    for (const cond in this.conditions) {
      const val = this.conditions[cond];
      for (const actor of actors) {
        if (typeof val === "number") await actor.applyStatus(cond, val);
        else if (val) await actor.applyStatus(cond, 1);
        else await actor.removeStatus(cond);
      }
    }
  }

  /**
   * @param {*} value
   * @param {string} message
   * @param {string[]} targets
   */
  async #printConfirmation(value, message, targets) {
    const target = fromUuidSync(targets.at(0));
    const name = target?.name || target?.members?.first()?.actor.name;
    const damage_msg = `Applied <strong>${value}</strong> damage to ${name}`;
    const statuses = [];
    for (const cond in this.conditions) {
      statuses.push(`<strong>${cond}:${this.conditions[cond]}</strong>`);
    }
    const status_msg = statuses.length ? ` and ${statuses.join(", ")}` : "";
    const cls = getDocumentClass("ChatMessage");
    cls.create({
      type: "response",
      content: `${damage_msg}${status_msg}.`,
      "system.payload": targets.join(","),
      "system.message": message,
    });
  }

  /**
   * @param {InstanceType<foundry["dice"]["Roll"]>} roll
   * @returns {Promise<foundry.documents.ChatMessage>}
   */
  toMessage(roll, targets) {
    const cls = getDocumentClass("ChatMessage");
    return cls.create(
      { type: "damage", rolls: [roll], system: { damage: this, targets } },
      { rollMode: game.settings.get("core", "rollMode") }
    );
  }
}
