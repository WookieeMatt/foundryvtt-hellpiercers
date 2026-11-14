import {
  BUILDINGS,
  BUILDINGS_BY_ID,
  GRID_SUITES,
  gatingBuilding,
  MAX_VEHICLE_UPGRADES,
  OBJECTIVES,
  OFF_GRID_MUNITIONS,
  RESOURCES,
  ROLES,
  VEHICLE_OPTIONS,
  VEHICLE_READINESS,
} from "../stratcom/catalog.mjs";

const fields = foundry.data.fields;

const resource = () =>
  new fields.NumberField({ integer: true, nullable: false, initial: 0, min: 0 });

/** Missions with a class used this many times count towards its mastery (p. 40). */
export const MASTERY_MISSIONS = 5;

/**
 * The party (division): everything the squad shares in STRATCOM.
 * It holds the shared resources, the base, the vehicle and the current mission.
 */
export class PartyModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.PARTY"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/laurels.svg";

  static defineSchema() {
    return {
      tagline: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField(),
      resources: new fields.SchemaField(Object.fromEntries(RESOURCES.map(r => [r, resource()]))),
      /** Ids of constructed buildings. */
      buildings: new fields.SetField(new fields.StringField()),
      /** Actor ids of the squad. */
      members: new fields.SetField(new fields.DocumentIdField()),
      /** Off-Grid Munitions Support selected for the expedition. */
      offGrid: new fields.StringField({ initial: "" }),
      offGridUsed: new fields.BooleanField({ initial: false }),
      gridSuite: new fields.StringField({ initial: "" }),
      legendaryArms: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true, blank: false }),
          /** Sessions the weapon will continue to exist; falls by 1 each session. */
          aion: new fields.NumberField({ integer: true, nullable: false, initial: 3, min: 0 }),
          notes: new fields.StringField(),
        })
      ),
      vehicle: new fields.SchemaField({
        name: new fields.StringField({ initial: "" }),
        readiness: new fields.StringField({
          initial: "ready",
          choices: Object.fromEntries(
            VEHICLE_READINESS.map(r => [r, `HELLPIERCERS.PARTY.vehicle.readiness.${r}`])
          ),
        }),
        /** Upgrades the party has paid for. */
        owned: new fields.SetField(new fields.StringField()),
        /** Upgrades currently installed (at most two). */
        active: new fields.SetField(new fields.StringField()),
        personalization: new fields.StringField({ initial: "" }),
        notes: new fields.StringField({ initial: "" }),
      }),
      /** Who holds each Role this STRATCOM phase. */
      roles: new fields.SchemaField(
        Object.fromEntries(
          Object.keys(ROLES).map(r => [r, new fields.StringField({ initial: "" })])
        )
      ),
      mission: new fields.SchemaField({
        active: new fields.BooleanField({ initial: false }),
        /** The faction actor that is the target of the mission. */
        faction: new fields.StringField({ initial: "" }),
        objectives: new fields.ArrayField(
          new fields.SchemaField({
            key: new fields.StringField({ required: true, choices: Object.keys(OBJECTIVES) }),
            done: new fields.BooleanField({ initial: false }),
          })
        ),
        /** HELLPIERCERS downed this mission. The GM earns 2 Ichor for each. */
        defeats: new fields.NumberField({ integer: true, nullable: false, initial: 0, min: 0 }),
        startedPhase: new fields.NumberField({ integer: true, nullable: false, initial: 0 }),
        notes: new fields.StringField({ initial: "" }),
      }),
      /** Classes used on successful missions, once the GNOSTIC Synthesis Chamber is built. */
      mastery: new fields.TypedObjectField(
        new fields.SchemaField({
          missions: new fields.NumberField({ integer: true, nullable: false, initial: 0, min: 0 }),
          mastered: new fields.BooleanField({ initial: false }),
        })
      ),
      journal: new fields.HTMLField(),
    };
  }

  /* -------------------------------------------- */
  /*  Derived data                                */
  /* -------------------------------------------- */

  prepareDerivedData() {
    /** Mechanics unlocked by the buildings that stand. */
    this.mechanics = new Set(
      [...this.buildings].map(id => BUILDINGS_BY_ID[id]?.mechanic).filter(Boolean)
    );
    this.hasHalo = this.buildings.has("bay");
    this.hasVehicle = this.buildings.has("spinther_lab");
    this.weaponSlots = this.buildings.has("choic") ? 2 : 1;
    this.vehicleOptionsActive = Math.min(this.vehicle.active.size, MAX_VEHICLE_UPGRADES);
  }

  /**
   * The actor's current system data. Methods that read a value and then write it back use this
   * rather than `this`, because an earlier update may have replaced this model instance.
   * @returns {PartyModel}
   */
  get live() {
    return this.parent.system;
  }

  /** @param {string} id */
  has(id) {
    return this.buildings.has(id);
  }

  /* -------------------------------------------- */
  /*  Resources                                   */
  /* -------------------------------------------- */

  /**
   * Whether the party can afford a cost.
   * @param {Partial<Record<string, number>>} cost
   */
  canAfford(cost) {
    return RESOURCES.every(r => (cost[r] ?? 0) <= this.resources[r]);
  }

  /** @param {Partial<Record<string, number>>} amounts */
  async gain(amounts) {
    const update = {};
    for (const r of RESOURCES) {
      if (amounts[r])
        update[`system.resources.${r}`] = Math.max(0, this.live.resources[r] + amounts[r]);
    }
    if (Object.keys(update).length) await this.parent.update(update);
  }

  /**
   * Spend resources. Returns false (and spends nothing) if the party can't afford it.
   * @param {Partial<Record<string, number>>} cost
   */
  async spend(cost) {
    if (!this.canAfford(cost)) return false;
    await this.gain(Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, -v])));
    return true;
  }

  /* -------------------------------------------- */
  /*  Base building                               */
  /* -------------------------------------------- */

  /**
   * Whether a building can be constructed right now.
   * @param {string} id
   * @returns {{ ok: boolean, reasons: string[] }}
   */
  canBuild(id) {
    const def = BUILDINGS_BY_ID[id];
    const reasons = [];
    if (!def) return { ok: false, reasons: ["unknown"] };
    if (this.buildings.has(id)) reasons.push("built");
    const missing = def.requires.filter(r => !this.buildings.has(r));
    if (missing.length) reasons.push(`requires:${missing.join(",")}`);
    if (!this.canAfford(def.cost)) reasons.push("cost");
    return { ok: reasons.length === 0, reasons };
  }

  /**
   * Construct a building: pay its cost, and unlock its mechanic and options.
   * @param {string} id
   */
  async build(id) {
    const { ok, reasons } = this.canBuild(id);
    if (!ok) return { ok, reasons };
    const def = BUILDINGS_BY_ID[id];
    await this.spend(def.cost);
    await this.parent.update({ "system.buildings": [...this.live.buildings, id] });
    return { ok: true, reasons: [] };
  }

  /**
   * Refund a building. Buildings that another standing building needs can't be refunded.
   * @param {string} id
   */
  async refund(id) {
    if (!this.buildings.has(id)) return { ok: false, reason: "not-built" };
    const dependants = BUILDINGS.filter(b => this.buildings.has(b.id) && b.requires.includes(id));
    if (dependants.length)
      return { ok: false, reason: "required", dependants: dependants.map(d => d.id) };
    const def = BUILDINGS_BY_ID[id];
    await this.parent.update({
      "system.buildings": [...this.live.buildings].filter(b => b !== id),
    });
    await this.gain(def.cost);
    return { ok: true };
  }

  /**
   * The state of every building: built, buildable, or locked by a missing prerequisite or cost.
   */
  get buildingStates() {
    return BUILDINGS.map(def => {
      const { ok, reasons } = this.canBuild(def.id);
      const built = this.buildings.has(def.id);
      return {
        ...def,
        built,
        buildable: ok,
        missing: def.requires.filter(r => !this.buildings.has(r)),
        affordable: this.canAfford(def.cost),
        reasons,
      };
    });
  }

  /**
   * Whether an item (weapon, armor, class, gear...) is unlocked for this party.
   * @param {string} type
   * @param {string} name
   * @returns {{ unlocked: boolean, building: string | null }}
   */
  isUnlocked(type, name) {
    const building = gatingBuilding(type, name);
    return { unlocked: !building || this.buildings.has(building), building };
  }

  /* -------------------------------------------- */
  /*  Vehicle                                     */
  /* -------------------------------------------- */

  /** @param {"ready" | "capable" | "ruin"} readiness */
  async setReadiness(readiness) {
    return this.parent.update({ "system.vehicle.readiness": readiness });
  }

  /** A major hit from something bigger than a minion degrades the vehicle one step (p. 128). */
  async degradeVehicle() {
    const i = VEHICLE_READINESS.indexOf(this.vehicle.readiness);
    if (i >= VEHICLE_READINESS.length - 1) return this.vehicle.readiness;
    await this.setReadiness(VEHICLE_READINESS[i + 1]);
    return VEHICLE_READINESS[i + 1];
  }

  /**
   * Purchase a vehicle upgrade or personalization.
   * @param {string} optionId
   */
  async buyVehicleOption(optionId) {
    const option = VEHICLE_OPTIONS.find(o => o.id === optionId);
    if (!option) return { ok: false, reason: "unknown" };
    if (!this.hasVehicle) return { ok: false, reason: "no-vehicle" };
    if (option.requires && !this.buildings.has(option.requires))
      return { ok: false, reason: `requires:${option.requires}` };
    if (this.vehicle.owned.has(optionId)) return { ok: false, reason: "owned" };
    if (!(await this.spend(option.cost))) return { ok: false, reason: "cost" };
    await this.parent.update({ "system.vehicle.owned": [...this.live.vehicle.owned, optionId] });
    return { ok: true };
  }

  /**
   * Install or remove an owned upgrade. At most two upgrades are active at a time.
   * @param {string} optionId
   */
  async toggleVehicleUpgrade(optionId) {
    const option = VEHICLE_OPTIONS.find(o => o.id === optionId);
    if (!option || !this.vehicle.owned.has(optionId)) return { ok: false, reason: "not-owned" };
    if (option.kind === "personalization") {
      await this.parent.update({
        "system.vehicle.personalization": this.vehicle.personalization === optionId ? "" : optionId,
      });
      return { ok: true };
    }
    const active = new Set(this.live.vehicle.active);
    if (active.has(optionId)) active.delete(optionId);
    else if (active.size >= MAX_VEHICLE_UPGRADES) return { ok: false, reason: "limit" };
    else active.add(optionId);
    await this.parent.update({ "system.vehicle.active": [...active] });
    return { ok: true };
  }

  /* -------------------------------------------- */
  /*  Missions                                    */
  /* -------------------------------------------- */

  /**
   * Begin a mission: leaving DIS.
   * @param {object} options
   * @param {string[]} options.objectives  Keys from OBJECTIVES
   * @param {string} [options.faction]     The targeted faction actor id
   * @param {number} [options.phase]
   */
  async startMission({ objectives, faction = "", phase = 0 }) {
    const valid = objectives.filter(k => k in OBJECTIVES);
    await this.parent.update({
      "system.mission": {
        active: true,
        faction,
        objectives: valid.map(key => ({ key, done: false })),
        defeats: 0,
        startedPhase: phase,
        notes: this.mission.notes,
      },
      "system.offGridUsed": false,
    });
    await this.#prepareSquad("leave");
  }

  /** @param {string} key */
  async toggleObjective(key) {
    const objectives = this.mission.objectives.map(o => ({
      ...(o.toObject?.() ?? o),
      done: o.key === key ? !o.done : o.done,
    }));
    await this.parent.update({ "system.mission.objectives": objectives });
  }

  /** Count a downed HELLPIERCER towards the GM's Ichor. */
  async recordDefeat() {
    if (!this.mission.active) return;
    await this.parent.update({ "system.mission.defeats": this.live.mission.defeats + 1 });
  }

  /** Rewards for the objectives that have been completed. */
  get missionRewards() {
    const rewards = Object.fromEntries(RESOURCES.map(r => [r, 0]));
    for (const o of this.mission.objectives) {
      if (!o.done) continue;
      for (const [r, n] of Object.entries(OBJECTIVES[o.key]?.reward ?? {})) rewards[r] += n;
    }
    return rewards;
  }

  /**
   * Finish the mission and return to DIS: pay out resources, advance Class Mastery, and rearm.
   * @param {object} [options]
   * @param {boolean} [options.success=true]  Whether the mission as a whole succeeded
   * @returns {Promise<{ rewards: Record<string, number>, defeats: number, mastered: string[] }>}
   */
  async completeMission({ success = true } = {}) {
    const rewards = this.missionRewards;
    const defeats = this.mission.defeats;
    const mastered = [];

    if (success) await this.gain(rewards);

    // Class Mastery: any player using a class on 5 successful missions masters it.
    if (success && this.buildings.has("gnostic")) {
      const mastery = foundry.utils.deepClone(this.mastery.toObject?.() ?? this.mastery);
      const seen = new Set();
      for (const actor of this.memberActors) {
        const cls = actor.system?.class?.name;
        if (!cls || seen.has(cls)) continue;
        seen.add(cls);
        mastery[cls] ??= { missions: 0, mastered: false };
        const entry = mastery[cls];
        entry.missions += 1;
        if (!entry.mastered && entry.missions >= MASTERY_MISSIONS) {
          entry.mastered = true;
          mastered.push(cls);
        }
      }
      await this.parent.update({ "system.mastery": mastery });
    }

    await this.parent.update({
      "system.mission.active": false,
      "system.mission.objectives": [],
      "system.mission.defeats": 0,
    });
    await this.#prepareSquad("return");
    return { rewards, defeats, mastered };
  }

  /** The member actors that exist. */
  get memberActors() {
    return [...this.members].map(id => game.actors.get(id)).filter(Boolean);
  }

  /**
   * Leaving or returning to DIS rearms the squad (p. 44, 46, 128). Returning also restores HP and
   * clears Effects; leaving empties Limit Break progress.
   * @param {"leave" | "return"} direction
   */
  async #prepareSquad(direction) {
    for (const actor of this.memberActors) {
      if (!actor.isOwner) continue;
      const updates = {};
      if (actor.type === "human") {
        updates["system.reversal_charges.value"] = actor.system.reversal_charges.max ?? 0;
        if (direction === "leave") updates["system.limit.value"] = 0;
      }
      if (direction === "return") {
        updates["system.health.value"] = actor.system.health.max ?? actor.system.health.value;
        updates["system.health.temp"] = 0;
      }
      await actor.update(updates);
      const equipment = actor.itemTypes.equipment.filter(i => i.system.available === false);
      if (equipment.length)
        await actor.updateEmbeddedDocuments(
          "Item",
          equipment.map(i => ({ _id: i.id, "system.available": true }))
        );
      if (direction === "return") {
        const effects = actor.effects.filter(e => !e.statuses.has("dead")).map(e => e.id);
        if (effects.length) await actor.deleteEmbeddedDocuments("ActiveEffect", effects);
        if (actor.statuses.has("dead")) await actor.setDefeated(false);
      }
    }
    await this.parent.update({
      "system.vehicle.readiness": "ready",
      "system.offGridUsed": false,
    });
  }

  /* -------------------------------------------- */
  /*  Legendary Arms                              */
  /* -------------------------------------------- */

  /** Subtract 1 Aion from every Legendary Arm at the end of a session (p. 109). */
  async endSession() {
    const arms = this.legendaryArms.map(a => ({ ...a, aion: Math.max(0, a.aion - 1) }));
    const expired = arms.filter(a => a.aion === 0).map(a => a.name);
    await this.parent.update({ "system.legendaryArms": arms });
    return expired;
  }

  /* -------------------------------------------- */
  /*  Names for the UI                            */
  /* -------------------------------------------- */

  static get offGridChoices() {
    return OFF_GRID_MUNITIONS;
  }

  static get gridSuiteChoices() {
    return GRID_SUITES;
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
