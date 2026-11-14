import { getParty } from "../stratcom/engine.mjs";
import { Attack } from "./attack.mjs";

/**
 * @import { HellpiercersActor, HellpiercersCombatant, HellpiercersItem } from "../documents/index.mjs";
 * @import { SwarmModel } from "./combatant-group.mjs";
 */

/***/

const fields = foundry.data.fields;

/** Temporary HP is consumed before HP and is lost when TACCOM ends. */
const tempHp = () => new fields.NumberField({ nullable: false, integer: true, initial: 0, min: 0 });

export class HaloModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ACTOR"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/megabot.svg";
  static defineSchema() {
    return {
      biography: new fields.HTMLField({}),
      faction: new fields.StringField({}),
      tags: new fields.SetField(new fields.StringField(), { initial: ["HALO"] }),
      health: new fields.SchemaField({
        value: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 40,
        }),
        temp: tempHp(),
      }),
      callsign: new fields.StringField({}),
      pilot: new fields.ForeignDocumentField(foundry.documents.BaseActor, {
        nullable: true,
        choices: () => {
          const choices = {};
          for (const actor of game.actors) {
            if (actor.type === "human") choices[actor.id] = actor.name;
          }
          return choices;
        },
      }),
      // Progression
      meta: new fields.SchemaField({
        multi_system: new fields.BooleanField({ initial: false }),
      }),
    };
  }

  get counters() {
    return this.parent.counters;
  }

  get systems() {
    return this.parent.itemTypes.halo_system;
  }

  get weapon() {
    return this.parent.itemTypes.halo_weapon.at(0);
  }

  prepareBaseData() {
    this.health.max = 40;
    this.scale = 2;
    this.speed = 3;
    this.standard_armament ??= new Attack(
      {
        name: game.i18n.localize("HELLPIERCERS.ACTOR.FIELDS.standard_armament.label"),
        damage: { formula: "6 + 3D10" },
        range: { kind: "targets", value: 1, modifiers: { range: 3 } },
      },
      { parent: this }
    );
  }

  async _preCreate(data) {
    this.parent.updateSource(
      foundry.utils.mergeObject(
        { prototypeToken: { actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY } },
        data,
        { inplace: false, insertKeys: false, insertValues: false }
      )
    );
  }
}

export class HumanModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ACTOR"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/spiked-halo.svg";
  static defineSchema() {
    return {
      biography: new fields.HTMLField({}),
      faction: new fields.StringField({}),
      tags: new fields.SetField(new fields.StringField(), { initial: ["Tag"] }),
      health: new fields.SchemaField({
        value: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 10,
        }),
        temp: tempHp(),
      }),
      limit: new fields.SchemaField({
        value: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
      }),
      reversal_charges: new fields.SchemaField({
        value: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 5,
          min: 0,
        }),
      }),
      pronouns: new fields.StringField({}),
      callsign: new fields.StringField({}),
      meta: new fields.SchemaField({
        cross_class: new fields.BooleanField({ initial: false }),
        limit_break: new fields.BooleanField({ initial: false }),
        reversal: new fields.BooleanField({ initial: false }),
        weapon_slots: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 2,
          min: 2,
        }),
      }),
    };
  }

  get counters() {
    return this.parent.counters;
  }

  get class() {
    return this.parent.itemTypes.class.at(0) ?? null;
  }

  get armor() {
    return this.parent.itemTypes.armor.at(0) ?? null;
  }

  get weapon() {
    return this.weapon_pri;
  }

  get weapon_pri() {
    return this.parent.itemTypes.weapon.sort((a, b) => a.sort > b.sort).at(0);
  }

  get weapon_sec() {
    return this.parent.itemTypes.weapon.sort((a, b) => a.sort > b.sort).at(1);
  }

  prepareBaseData() {
    this.health.max = this.class?.system.health ?? null;
    this.scale = 1;
    this.speed = this.armor?.system?.speed ?? null;
    this.abilities = {
      /** @type {Record<"active" | "passive" | "limit", HellpiercersItem | null>} */
      class: Object.defineProperties(
        {},
        {
          active: { get: () => this.#getAbility("class", "active"), enumerable: true },
          passive: { get: () => this.#getAbility("class", "passive"), enumerable: true },
          limit: { get: () => this.#getAbility("class", "limit"), enumerable: true },
        }
      ),
      /** @type {Record<"ability" | "movement" | "reversal", HellpiercersItem | null>} */
      armor: Object.defineProperties(
        {},
        {
          ability: { get: () => this.#getAbility("armor", "active"), enumerable: true },
          movement: { get: () => this.#getAbility("armor", "movement"), enumerable: true },
          reversal: { get: () => this.#getAbility("armor", "reversal"), enumerable: true },
        }
      ),
    };
    this.limit.max = this.abilities.class.limit?.system.break_value;
    this.reversal_charges.max = this.abilities.armor.reversal?.system.uses;
  }

  /**
   * The party's buildings decide which advanced options are unlocked (Cross Class Development,
   * Limit Breaks, Reversals and the second weapon slot). The "Configure Unlocks" toggles still apply
   * when the world has no party, or when unlocks are not derived from the party.
   */
  prepareDerivedData() {
    let derive = false;
    try {
      derive = game.settings.get(game.system.id, "deriveUnlocks");
    } catch {
      return;
    }
    const party = derive ? getParty() : null;
    if (!party) return;
    this.meta.cross_class = party.system.has("gnostic");
    this.meta.limit_break = party.system.has("aponoia");
    this.meta.reversal = party.system.has("ignorance");
    // HARPE's Boundless Dokeo grants one additional weapon.
    const dokeo = /harpe/i.test(this.class?.name ?? "") ? 1 : 0;
    this.meta.weapon_slots = party.system.weaponSlots + dokeo;
  }

  /**
   * @param {string} type Equipment type
   * @param {string} action Action type
   * @returns {HellpiercersItem | null}
   */
  #getAbility(type, action) {
    return (
      this.parent.itemTypes.ability.find(
        a => a.system.item.type === type && a.system.action === action
      ) ?? null
    );
  }

  /**
   * @param {string | HellpiercersItem} cls
   */
  async applyClass(cls) {
    /** @type {HellpiercersActor & foundry.documents.Actor} */
    const actor = this.parent;
    /** @type {HellpiercersItem} */
    const item = cls.id ? cls : actor.getEmbeddedDocument("Item", cls);
    if (!item || !actor || item.actor !== actor) return;
    const active_data = game.items.fromCompendium(await fromUuid(item.system.active), {
      keepId: true,
    });
    active_data.system.action = "active";
    active_data.system.item.type = "class";
    const passive_data = game.items.fromCompendium(await fromUuid(item.system.passive), {
      keepId: true,
    });
    passive_data.system.action = "passive";
    passive_data.system.item.type = "class";
    const limit_data = game.items.fromCompendium(await fromUuid(item.system.limit), {
      keepId: true,
    });
    limit_data.system.action = "limit";
    limit_data.system.item.type = "class";
    await actor.deleteEmbeddedDocuments(
      "Item",
      actor.itemTypes.ability.filter(i => i.system.item.type === "class").map(i => i.id)
    );
    return actor.createEmbeddedDocuments("Item", [active_data, passive_data, limit_data], {
      keepId: true,
    });
  }

  async applyArmor(armor) {
    /** @type {HellpiercersActor} */
    const actor = this.parent;
    /** @type {HellpiercersItem} */
    const item = armor.id ? armor : actor.getEmbeddedDocument("Item", armor);
    if (!item || !actor || item.actor !== actor) return;
    const movement_data = game.items.fromCompendium(await fromUuid(item.system.movement), {
      keepId: true,
    });
    movement_data.system.action = "movement";
    movement_data.system.item.type = "armor";
    const ability_data = game.items.fromCompendium(await fromUuid(item.system.ability), {
      keepId: true,
    });
    ability_data.system.action = "active";
    ability_data.system.item.type = "armor";
    const reversal_data = game.items.fromCompendium(await fromUuid(item.system.reversal), {
      keepId: true,
    });
    reversal_data.system.action = "reversal";
    reversal_data.system.item.type = "armor";
    await actor.deleteEmbeddedDocuments(
      "Item",
      actor.itemTypes.ability.filter(i => i.system.item.type === "armor").map(i => i.id)
    );
    return actor.createEmbeddedDocuments("Item", [movement_data, ability_data, reversal_data], {
      keepId: true,
    });
  }

  async _preCreate(data) {
    this.parent.updateSource(
      foundry.utils.mergeObject(
        { prototypeToken: { actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY } },
        data,
        { inplace: false, insertKeys: false, insertValues: false }
      )
    );
  }
}

export class MinionModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ACTOR"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/cultist.svg";
  static defineSchema() {
    return {
      biography: new fields.HTMLField({}),
      faction: new fields.StringField({}),
      tags: new fields.SetField(new fields.StringField(), { initial: ["Tag"] }),
      health: new fields.SchemaField({
        value: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 10,
        }),
        temp: tempHp(),
        max: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 10,
        }),
      }),
      scale: new fields.NumberField({
        nullable: false,
        integer: true,
        initial: 1,
      }),
      speed: new fields.NumberField({
        nullable: false,
        integer: true,
        initial: 4,
      }),
      strike: new fields.EmbeddedDataField(Attack, {
        initial: new Attack({ name: "Strike", range: { kind: "targets", value: 1 } }),
      }),
      special: new fields.SchemaField({
        name: new fields.StringField({ initial: "Special" }),
        description: new fields.HTMLField({}),
      }),
      /** Minibosses have an AGNOSIA threshold too. Leave the value empty for ordinary minions. */
      agnosia: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, nullable: true, initial: null, min: 0 }),
        effect: new fields.HTMLField({}),
        triggered: new fields.BooleanField({ initial: false }),
      }),
    };
  }

  get counters() {
    return this.parent.counters;
  }

  /** @returns {foundry.documents.CombatantGroup & { type: "swarm", system: SwarmModel }} */
  get swarm() {
    /** @type {HellpiercersActor}*/
    const actor = this.parent;
    /** @type {HellpiercersCombatant|null} */
    const combatant = actor.inCombat ? actor.getActiveTokens(true).at(0)?.combatant : null;
    const group = combatant?.group;
    return (group?.type === "swarm" ? group : null) ?? null;
  }

  get swarm_hp() {
    return this.swarm?.system.health ?? undefined;
  }

  /**
   * @param {number} value
   * @param {boolean} isDelta
   * @returns {Promise<MinionModel["swarm"]>} */
  async modifySwarmHp(value, isDelta) {
    const current = this.swarm_hp.value;
    const v = Math.clamp(isDelta ? current + value : value, 0, this.swarm_hp.max);
    const update = { "system.health.value": v };

    const allowed = Hooks.call(
      "modifyTokenAttribute",
      { attribute: "swarm_hp", value, isDelta, isBar: true },
      update,
      this.swarm
    );
    return allowed !== false ? this.swarm.update(update) : this.swarm;
  }

  async _preCreate(data) {
    this.parent.updateSource(
      foundry.utils.mergeObject(
        { prototypeToken: { actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE } },
        data,
        { inplace: false, insertKeys: false, insertValues: false }
      )
    );
  }
}

export class BossModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ACTOR"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/warlord-helmet.svg";
  static defineSchema() {
    return {
      biography: new fields.HTMLField({ label: "HELLPIERCERS.Biography" }),
      faction: new fields.StringField({}),
      tags: new fields.SetField(new fields.StringField(), { initial: ["Boss"] }),
      health: new fields.SchemaField({
        value: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 50,
        }),
        temp: tempHp(),
        max: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 50,
        }),
      }),
      scale: new fields.NumberField({
        nullable: false,
        integer: true,
        initial: 1,
      }),
      speed: new fields.NumberField({
        nullable: false,
        integer: true,
        initial: 4,
      }),
      actions: new fields.StringField({ initial: "1" }),
      agnosia: new fields.SchemaField({
        value: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 10,
        }),
        effect: new fields.HTMLField({}),
        /** AGNOSIA is a single-use move: set when it fires, cleared when the unit is healed above it. */
        triggered: new fields.BooleanField({ initial: false }),
      }),
    };
  }

  get counters() {
    return this.parent.counters;
  }

  get attacks() {
    return this.parent.itemTypes.ability
      .filter(a => a.system.action === "attack")
      .sort((a, b) => a.sort > b.sort);
  }

  get special() {
    return this.parent.itemTypes.ability.find(a => a.system.action === "special") ?? null;
  }

  prepareBaseData() {
    this.agnosia.bar = {
      value: this.health.max - this.health.value,
      max: this.health.max - this.agnosia.value,
    };
  }

  _getActivations() {
    if (this.actions === "1") return 1;
    const players =
      game.settings.get(game.system.id, "playerCountOverride") ??
      game.users.filter(u => u.character).length;
    return foundry.dice.Roll.safeEval(`max(1, round((${this.actions}) * ${players}))`);
  }

  async _preCreate(data) {
    const items = [1, 2].map(i =>
      new foundry.documents.Item.implementation({
        name: `Attack ${i}`,
        type: "ability",
        system: {
          action: "attack",
          attack: { damage: { formula: "5" }, range: { kind: "targets", value: 1 } },
        },
      }).toObject()
    );
    this.parent.updateSource(
      foundry.utils.mergeObject(
        {
          prototypeToken: { actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE },
          items,
        },
        data,
        { inplace: false, insertKeys: false, insertValues: false }
      )
    );
  }

  _onUpdate(_changed, _options, userId) {
    if (game.user.id === userId) this.#checkAgnosia();
  }

  async #checkAgnosia() {
    const actor = this.parent;
    const agnosia = this.health.value <= this.agnosia.value;
    const effect = actor.effects.find(e => e.statuses.has("agnosia"));
    if (!agnosia) return effect?.delete();
    if (effect) return;
    return foundry.documents.ActiveEffect.implementation.create(
      {
        _id: "agnosia000000000",
        name: game.i18n.localize("HELLPIERCERS.ACTOR.FIELDS.agnosia.label"),
        img: "icons/svg/explosion.svg",
        statuses: ["agnosia"],
        showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
      },
      { parent: this.parent, keepId: true }
    );
  }
}

export class SpawnerModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ACTOR"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/portal.svg";
  static defineSchema() {
    return {
      biography: new fields.HTMLField({}),
      tags: new fields.SetField(new fields.StringField(), { initial: ["Spawner", "Immobile"] }),
      health: new fields.SchemaField({
        value: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 50,
        }),
        temp: tempHp(),
        max: new fields.NumberField({
          nullable: false,
          integer: true,
          initial: 50,
        }),
      }),
      scale: new fields.NumberField({
        nullable: false,
        integer: true,
        initial: 1,
      }),
      speed: new fields.NumberField({
        nullable: false,
        integer: true,
        initial: 0,
      }),
      spawn: new fields.SchemaField({
        spawn: new fields.HTMLField({
          initial: () => game.i18n.localize("HELLPIERCERS.ACTOR.FIELDS.spawn.spawn.initial"),
        }),
        special: new fields.HTMLField({}),
        name: new fields.StringField({ initial: "Special" }),
        charge: new fields.NumberField({
          nullable: false,
          integer: true,
          min: 0,
          initial: 0,
        }),
      }),
    };
  }

  async _preCreate(data) {
    this.parent.updateSource(
      foundry.utils.mergeObject(
        { prototypeToken: { actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE } },
        data,
        { inplace: false, insertKeys: false, insertValues: false }
      )
    );
  }
}

export { FactionModel } from "./faction.mjs";
export { PartyModel } from "./party.mjs";
