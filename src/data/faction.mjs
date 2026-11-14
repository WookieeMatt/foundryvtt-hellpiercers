import {
  CONVOY_KINDS,
  CONVOY_TRAVEL_PHASES,
  LOCATION_TYPES,
  RESEARCH_PROJECTS,
} from "../stratcom/catalog.mjs";
import {
  FACTIONS_BY_ID,
  MAX_CROWN,
  MAX_QUALITY,
  QUALITY_KEYS,
} from "../stratcom/faction-catalog.mjs";

const fields = foundry.data.fields;

const newId = () => foundry.utils.randomID();
const idField = () =>
  new fields.StringField({ required: true, blank: false, nullable: false, initial: newId });
const count = (initial = 0, extra = {}) =>
  new fields.NumberField({ integer: true, nullable: false, initial, ...extra });

/** A single point of Quality per key. */
const qualitySchema = (min = 0) =>
  new fields.SchemaField(Object.fromEntries(QUALITY_KEYS.map(k => [k, count(0, { min })])));

/* -------------------------------------------- */
/*  Embedded models                             */
/* -------------------------------------------- */

/** A building or point of interest in a faction's territory (pp. 221-223). */
export class LocationModel extends foundry.abstract.DataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.LOCATION"];
  static defineSchema() {
    return {
      id: idField(),
      name: new fields.StringField({ required: true, blank: false, initial: "New Location" }),
      type: new fields.StringField({
        initial: "productive",
        choices: Object.fromEntries(
          LOCATION_TYPES.map(t => [t, `HELLPIERCERS.LOCATION.type.${t}`])
        ),
      }),
      purpose: new fields.StringField({ initial: "" }),
      terrain: new fields.StringField({ initial: "" }),
      defenses: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" }),
      /** The Quality this location contributes while it is active. */
      quality: qualitySchema(0),
      /** Phases of construction. `value` boxes are filled one per STRATCOM phase. */
      buildTime: new fields.SchemaField({ value: count(0, { min: 0 }), max: count(0, { min: 0 }) }),
      /** building: under construction (hidden from players). active: standing. lost: taken by the players. */
      status: new fields.StringField({
        initial: "active",
        choices: {
          building: "HELLPIERCERS.LOCATION.status.building",
          active: "HELLPIERCERS.LOCATION.status.active",
          lost: "HELLPIERCERS.LOCATION.status.lost",
        },
      }),
      source: new fields.StringField({ initial: "custom" }),
      requires: new fields.StringField({ initial: "" }),
      /** Whether the players know this location exists. */
      revealed: new fields.BooleanField({ initial: true }),
      notes: new fields.StringField({ initial: "" }),
    };
  }

  /** Total Quality points this location contributes. */
  get qualityTotal() {
    return QUALITY_KEYS.reduce((sum, k) => sum + this.quality[k], 0);
  }
}

/** A hidden convoy: arrives at the start of the second STRATCOM phase after deployment (p. 225). */
export class ConvoyModel extends foundry.abstract.DataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.CONVOY"];
  static defineSchema() {
    return {
      id: idField(),
      kind: new fields.StringField({
        initial: "supply",
        choices: Object.fromEntries(Object.entries(CONVOY_KINDS).map(([k, v]) => [k, v.label])),
      }),
      name: new fields.StringField({ initial: "" }),
      from: new fields.StringField({ initial: "" }),
      to: new fields.StringField({ initial: "" }),
      deployedPhase: count(0, { min: 0 }),
      arrivesPhase: count(0, { min: 0 }),
      status: new fields.StringField({
        initial: "traveling",
        choices: {
          traveling: "HELLPIERCERS.CONVOY.status.traveling",
          arrived: "HELLPIERCERS.CONVOY.status.arrived",
          resolved: "HELLPIERCERS.CONVOY.status.resolved",
          intercepted: "HELLPIERCERS.CONVOY.status.intercepted",
        },
      }),
      /** What the convoy does on arrival (a Supply convoy might Fortify Stronghold, for example). */
      outcome: new fields.StringField({ initial: "" }),
      /** Players learn what a convoy is only through spy actions. */
      revealed: new fields.BooleanField({ initial: false }),
      notes: new fields.StringField({ initial: "" }),
    };
  }
}

/** A research project: spend Ichor and fill Research Time boxes (p. 226). */
export class ProjectModel extends foundry.abstract.DataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.PROJECT"];
  static defineSchema() {
    return {
      id: idField(),
      key: new fields.StringField({ initial: "" }),
      name: new fields.StringField({ required: true, blank: false, initial: "Research Project" }),
      effect: new fields.StringField({ initial: "" }),
      cost: count(1, { min: 0 }),
      paid: count(0, { min: 0 }),
      time: count(1, { min: 0 }),
      progress: count(0, { min: 0 }),
      /** The STRATCOM phase the project was started in. It can't be finished in that same phase. */
      startedPhase: count(0, { min: 0 }),
      status: new fields.StringField({
        initial: "active",
        choices: {
          active: "HELLPIERCERS.PROJECT.status.active",
          complete: "HELLPIERCERS.PROJECT.status.complete",
        },
      }),
    };
  }

  get isFunded() {
    return this.paid >= this.cost;
  }

  get isTimed() {
    return this.progress >= this.time;
  }
}

/* -------------------------------------------- */
/*  Faction actor                               */
/* -------------------------------------------- */

export class FactionModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ACTOR"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/flying-flag.svg";

  static defineSchema() {
    return {
      description: new fields.HTMLField(),
      /** Catalog id this faction was created from ("syncrasis"), or "" for a custom faction. */
      key: new fields.StringField({ initial: "" }),
      boss: new fields.StringField({ initial: "" }),
      crown: new fields.SchemaField({
        description: new fields.StringField(),
        /** Set to override the automatic Crown (it normally falls as Qualities are lost). */
        override: new fields.NumberField({
          integer: true,
          nullable: true,
          initial: null,
          min: 1,
          max: MAX_CROWN,
        }),
      }),
      /** Reconciles the printed starting Qualities with the sum of the starting locations. */
      qualityAdjust: new fields.SchemaField(
        Object.fromEntries(QUALITY_KEYS.map(k => [k, count(0)]))
      ),
      /** Total Quality the faction started with; the Crown falls by 1 per 2 points lost from it. */
      startTotal: count(0, { min: 0 }),
      locations: new fields.ArrayField(new fields.EmbeddedDataField(LocationModel)),
      upgrades: new fields.SetField(new fields.StringField()),
      projects: new fields.ArrayField(new fields.EmbeddedDataField(ProjectModel)),
      convoys: new fields.ArrayField(new fields.EmbeddedDataField(ConvoyModel)),
      organization: new fields.HTMLField(),
      journal: new fields.HTMLField(),
      supplyLines: new fields.HTMLField(),
    };
  }

  /* -------------------------------------------- */
  /*  Derived data                                */
  /* -------------------------------------------- */

  prepareDerivedData() {
    const totals = Object.fromEntries(QUALITY_KEYS.map(k => [k, 0]));
    for (const location of this.locations) {
      if (location.status !== "active") continue;
      for (const k of QUALITY_KEYS) totals[k] += location.quality[k];
    }
    /** @type {Record<string, number>} Qualities, 0 to 5 dots. */
    this.qualities = {};
    /** @type {Record<string, number>} Quality before it is capped at 5 dots. */
    this.qualitiesRaw = {};
    for (const k of QUALITY_KEYS) {
      const raw = Math.max(0, totals[k] + this.qualityAdjust[k]);
      this.qualitiesRaw[k] = raw;
      this.qualities[k] = Math.min(MAX_QUALITY, raw);
    }
    this.qualityTotal = QUALITY_KEYS.reduce((sum, k) => sum + this.qualities[k], 0);

    // Crown falls by one for every two Quality points lost, and recovers as they are regained.
    const lost = Math.max(0, this.startTotal - this.qualityTotal);
    const automatic = Math.min(MAX_CROWN, Math.max(1, MAX_CROWN - Math.floor(lost / 2)));
    this.crown.value = this.crown.override ?? automatic;
    this.crown.max = MAX_CROWN;
    this.crown.lost = lost;

    this.zeroQualities = QUALITY_KEYS.filter(k => this.qualities[k] === 0);
    /** Two Qualities at 0 unlock the Final Assault (p. 130). */
    this.finalAssaultReady = this.zeroQualities.length >= 2;
    /** The catalog entry, if this faction came from one. */
    this.catalog = FACTIONS_BY_ID[this.key] ?? null;
  }

  /** Whether a unit gated at the given Crown value can be deployed (p. 139). */
  canDeployAtCrown(gate) {
    return this.crown.value <= gate;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @param {string} id */
  getLocation(id) {
    return this.locations.find(l => l.id === id) ?? null;
  }

  /**
   * Apply a transformation to an embedded array and save it.
   * @param {"locations" | "projects" | "convoys"} path
   * @param {(items: object[]) => object[] | void} fn
   */
  async #mutate(path, fn) {
    const items = this.parent.system[path].map(i => i.toObject());
    const result = fn(items) ?? items;
    return this.parent.update({ [`system.${path}`]: result });
  }

  /* -------------------------------------------- */
  /*  Locations                                   */
  /* -------------------------------------------- */

  /**
   * Add a location, either from a catalog definition or custom data.
   * @param {object} data
   * @param {object} [options]
   * @param {boolean} [options.building=false]  Begin construction (uses the location's build time).
   */
  async addLocation(data, { building = false } = {}) {
    const location = {
      id: newId(),
      name: data.name ?? "New Location",
      type: data.type ?? "productive",
      purpose: data.purpose ?? "",
      terrain: data.terrain ?? "",
      defenses: data.defenses ?? "",
      quality: { force: 0, subterfuge: 0, territory: 0, assets: 0, ...(data.quality ?? {}) },
      buildTime: { value: 0, max: data.buildTime?.max ?? data.buildTime ?? 0 },
      source: data.source ?? "custom",
      requires: data.requires ?? "",
      revealed: data.revealed ?? !building,
      status: building && (data.buildTime?.max ?? data.buildTime ?? 0) > 0 ? "building" : "active",
    };
    await this.#mutate("locations", items => {
      items.push(location);
    });
    return location;
  }

  /**
   * @param {string} id
   * @param {"active" | "building" | "lost"} status
   */
  async setLocationStatus(id, status) {
    await this.#mutate("locations", items => {
      const location = items.find(l => l.id === id);
      if (!location) return;
      location.status = status;
      if (status === "active") location.buildTime.value = location.buildTime.max;
      if (status === "lost") location.revealed = true;
    });
  }

  /** @param {string} id */
  async removeLocation(id) {
    await this.#mutate("locations", items => items.filter(l => l.id !== id));
  }

  /** Update fields of a location by id. @param {string} id @param {object} changes */
  async updateLocation(id, changes) {
    await this.#mutate("locations", items => {
      const location = items.find(l => l.id === id);
      if (location) foundry.utils.mergeObject(location, foundry.utils.expandObject(changes));
    });
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  /**
   * Roll a Quality: 1D6 per dot, and every 6 is a Success (p. 224).
   * @param {string | string[]} quality  One Quality, or two to combine (the larger plus up to two dots of the smaller)
   * @param {object} [options]
   * @param {boolean} [options.advantage=false]  Roll one extra die
   * @param {number} [options.bonus=0]           Extra dice
   * @param {string} [options.label]
   * @param {boolean} [options.whisper=false]    Roll privately
   */
  async rollQuality(quality, { advantage = false, bonus = 0, label = "", whisper = false } = {}) {
    const keys = [quality].flat();
    const values = keys.map(k => this.qualities[k] ?? 0).sort((a, b) => b - a);
    const dice = (values[0] ?? 0) + Math.min(2, values[1] ?? 0) + (advantage ? 1 : 0) + bonus;
    return rollSuccesses(this.parent, dice, { label: label || keys.join(" + "), whisper });
  }

  /* -------------------------------------------- */
  /*  Upgrades and research (Ichor)               */
  /* -------------------------------------------- */

  /** Upgrade definitions for this faction's catalog entry. */
  get availableUpgrades() {
    return this.catalog?.upgrades ?? [];
  }

  /**
   * Unlock a faction upgrade, spending Ichor.
   * @param {string} name
   * @param {object} stratcom  The STRATCOM engine (injected to avoid an import cycle)
   */
  async buyUpgrade(name, stratcom) {
    const def = this.availableUpgrades.find(u => u.name === name);
    if (!def) throw new Error(`Unknown upgrade "${name}"`);
    if (this.upgrades.has(name)) return false;
    if (!(await stratcom.ichor.spend(def.cost, `${this.parent.name}: ${name}`))) return false;
    await this.parent.update({ "system.upgrades": [...this.parent.system.upgrades, name] });
    return true;
  }

  /** Each faction may have at most 2 projects in development (p. 227). */
  get activeProjects() {
    return this.projects.filter(p => p.status === "active");
  }

  /**
   * Begin a research project.
   * @param {string} key   A key from RESEARCH_PROJECTS
   * @param {number} phase The current STRATCOM phase
   * @returns {Promise<{ ok: boolean, reason?: string }>}
   */
  async startProject(key, phase) {
    const def = RESEARCH_PROJECTS.find(p => p.id === key);
    if (!def) return { ok: false, reason: "unknown" };
    if (this.activeProjects.length >= 2) return { ok: false, reason: "limit" };
    if (this.projects.some(p => p.key === key)) return { ok: false, reason: "duplicate" };
    await this.#mutate("projects", items => {
      items.push({
        id: newId(),
        key,
        name: def.name,
        effect: def.effect,
        cost: def.cost,
        paid: 0,
        time: def.time,
        progress: 0,
        startedPhase: phase,
        status: "active",
      });
    });
    return { ok: true };
  }

  /**
   * Advance a research project by one tick of time and/or pay some of its Ichor.
   * @param {string} id
   * @param {object} options
   * @param {number} [options.pay=0]    Ichor to pay (spent from the GM's pool)
   * @param {boolean} [options.tick=false]  Fill one Research Time box
   * @param {number} phase
   * @param {object} stratcom
   */
  async advanceProject(id, { pay = 0, tick = false }, phase, stratcom) {
    const project = this.projects.find(p => p.id === id);
    if (!project || project.status !== "active") return { ok: false, reason: "inactive" };
    const payment = Math.max(0, Math.min(pay, project.cost - project.paid));
    if (
      payment > 0 &&
      !(await stratcom.ichor.spend(payment, `${this.parent.name}: ${project.name}`))
    )
      return { ok: false, reason: "ichor" };
    const canTick = phase > project.startedPhase;
    await this.#mutate("projects", items => {
      const p = items.find(i => i.id === id);
      p.paid += payment;
      if (tick && canTick && p.progress < p.time) p.progress += 1;
      if (p.paid >= p.cost && p.progress >= p.time) p.status = "complete";
    });
    return { ok: true, tickedBlocked: tick && !canTick };
  }

  /** Scrap a project, refunding half of the Ichor invested. */
  async scrapProject(id, stratcom) {
    const project = this.projects.find(p => p.id === id);
    if (!project) return;
    await stratcom.ichor.add(Math.floor(project.paid / 2), `Scrapped ${project.name}`);
    await this.#mutate("projects", items => items.filter(p => p.id !== id));
  }

  /* -------------------------------------------- */
  /*  Convoys                                     */
  /* -------------------------------------------- */

  /**
   * Deploy a convoy. It arrives at the start of the second STRATCOM phase after this one.
   * @param {object} data
   * @param {number} phase  The current STRATCOM phase
   */
  async deployConvoy(data, phase) {
    await this.#mutate("convoys", items => {
      items.push({
        id: newId(),
        kind: data.kind ?? "supply",
        name: data.name ?? "",
        from: data.from ?? "",
        to: data.to ?? "",
        deployedPhase: phase,
        arrivesPhase: phase + CONVOY_TRAVEL_PHASES,
        status: "traveling",
        outcome: data.outcome ?? "",
        revealed: false,
        notes: data.notes ?? "",
      });
    });
  }

  /** @param {string} id @param {object} changes */
  async updateConvoy(id, changes) {
    await this.#mutate("convoys", items => {
      const convoy = items.find(c => c.id === id);
      if (convoy) foundry.utils.mergeObject(convoy, foundry.utils.expandObject(changes));
    });
  }

  /** @param {string} id */
  async removeConvoy(id) {
    await this.#mutate("convoys", items => items.filter(c => c.id !== id));
  }

  /* -------------------------------------------- */
  /*  Creation                                    */
  /* -------------------------------------------- */

  async _preCreate(data) {
    this.parent.updateSource(
      foundry.utils.mergeObject(
        { prototypeToken: { actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL } },
        data,
        { inplace: false, insertKeys: false, insertValues: false }
      )
    );
  }

  /**
   * Build the data for a new faction from the catalog: its Crown, boss, starting locations and the
   * adjustment that makes the derived Qualities match the printed ones.
   * @param {string} key  A catalog id such as "syncrasis"
   * @param {object} [overrides]
   */
  static dataFromCatalog(key, overrides = {}) {
    const def = FACTIONS_BY_ID[key];
    if (!def) throw new Error(`Unknown faction "${key}"`);
    const locations = def.starting.map(l => ({
      id: newId(),
      name: l.name,
      type: l.type,
      quality: l.quality,
      buildTime: { value: 0, max: 0 },
      status: "active",
      source: "starting",
      requires: l.requires ?? "",
      revealed: true,
    }));
    const sums = Object.fromEntries(QUALITY_KEYS.map(k => [k, 0]));
    for (const l of locations) for (const k of QUALITY_KEYS) sums[k] += l.quality[k];
    const adjust = Object.fromEntries(
      QUALITY_KEYS.map(k => [k, def.start ? def.start[k] - sums[k] : 0])
    );
    const startTotal = def.start ? QUALITY_KEYS.reduce((s, k) => s + def.start[k], 0) : 0;
    return foundry.utils.mergeObject(
      {
        name: def.name,
        type: "faction",
        system: {
          key: def.id,
          boss: def.boss,
          crown: { description: def.crown },
          qualityAdjust: adjust,
          startTotal,
          locations,
        },
      },
      overrides
    );
  }
}

/**
 * Roll a pool of d6 and count the 6s as Successes.
 * @param {foundry.documents.Actor} actor
 * @param {number} dice
 * @param {object} [options]
 */
export async function rollSuccesses(actor, dice, { label = "", whisper = false } = {}) {
  const n = Math.max(0, Math.floor(dice));
  const ChatMessage = getDocumentClass("ChatMessage");
  const roll = n > 0 ? await new foundry.dice.Roll(`${n}d6`).evaluate() : null;
  const successes = roll ? roll.dice[0].results.filter(r => r.result === 6).length : 0;
  const content = `<div class="hellpiercers faction-roll ${successes ? "success" : "fail"}">
    <header>${foundry.utils.escapeHTML(actor?.name ?? "")}${label ? `: ${foundry.utils.escapeHTML(label)}` : ""}</header>
    <div class="result"><strong>${successes}</strong> ${successes === 1 ? "Success" : "Successes"} <span>(${n}D6)</span></div>
  </div>`;
  const data = { content, flags: { [game.system.id]: { factionRoll: successes } } };
  if (roll) data.rolls = [roll];
  if (whisper) data.whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
  await ChatMessage.create(data);
  return { successes, dice: n, roll };
}

/**
 * Opposed Quality roll between two factions: the most Successes wins; no Successes on either side
 * is a tie (p. 224).
 * @param {foundry.documents.Actor} a
 * @param {string | string[]} qualityA
 * @param {foundry.documents.Actor} b
 * @param {string | string[]} qualityB
 */
export async function opposedRoll(a, qualityA, b, qualityB, { whisper = true } = {}) {
  const ra = await a.system.rollQuality(qualityA, { whisper });
  const rb = await b.system.rollQuality(qualityB, { whisper });
  const winner = ra.successes === rb.successes ? null : ra.successes > rb.successes ? a : b;
  const ChatMessage = getDocumentClass("ChatMessage");
  const data = {
    content: `<div class="hellpiercers faction-roll"><header>Opposed roll</header><div class="result"><strong>${
      winner ? `${foundry.utils.escapeHTML(winner.name)} prevails` : "Tie"
    }</strong> <span>(${ra.successes} to ${rb.successes})</span></div></div>`,
  };
  if (whisper) data.whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
  await ChatMessage.create(data);
  return { winner, a: ra, b: rb };
}
