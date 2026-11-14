import { CONVOY_KINDS, LOCATION_TYPES, RESEARCH_PROJECTS } from "../../stratcom/catalog.mjs";
import { ichor, phase, stratcom } from "../../stratcom/engine.mjs";
import { FACTION_ACTIONS, hazardOf } from "../../stratcom/faction-actions.mjs";
import { QUALITY_KEYS } from "../../stratcom/faction-catalog.mjs";
import { HellpiercersActorSheetMixin } from "./mixins.mjs";

const ActorSheet = foundry.applications.sheets.ActorSheet;
const Dialog = () => foundry.applications.api.Dialog;

const qualityText = q =>
  [
    ["force", "F"],
    ["subterfuge", "S"],
    ["territory", "T"],
    ["assets", "A"],
  ]
    .filter(([k]) => q[k])
    .map(([k, l]) => `${l}${q[k]}`)
    .join(" ");

/**
 * The faction sheet: a demon prince's Crown and Qualities, locations, convoys, research and
 * upgrades. Functional rather than final: the visual redesign happens in one pass at the end.
 */
export class FactionSheet extends HellpiercersActorSheetMixin(ActorSheet) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["faction", "stratcom"],
    window: { resizable: true },
    position: { width: 780, height: 780 },
    actions: {
      rollQuality: FactionSheet.#rollQuality,
      addLocation: FactionSheet.#addLocation,
      removeLocation: FactionSheet.#removeLocation,
      buildStep: FactionSheet.#buildStep,
      deployConvoy: FactionSheet.#deployConvoy,
      removeConvoy: FactionSheet.#removeConvoy,
      resolveConvoy: FactionSheet.#resolveConvoy,
      startProject: FactionSheet.#startProject,
      payProject: FactionSheet.#payProject,
      tickProject: FactionSheet.#tickProject,
      scrapProject: FactionSheet.#scrapProject,
      buyUpgrade: FactionSheet.#buyUpgrade,
      useAction: FactionSheet.#useAction,
      addHazard: FactionSheet.#addHazard,
      stepHazard: FactionSheet.#stepHazard,
      clearHazard: FactionSheet.#clearHazard,
      removeHazard: FactionSheet.#removeHazard,
    },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/faction/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    locations: {
      template: "systems/hellpiercers/templates/sheets/faction/locations.hbs",
      scrollable: [""],
    },
    convoys: {
      template: "systems/hellpiercers/templates/sheets/faction/convoys.hbs",
      scrollable: [""],
    },
    research: {
      template: "systems/hellpiercers/templates/sheets/faction/research.hbs",
      scrollable: [""],
    },
    actions: {
      template: "systems/hellpiercers/templates/sheets/faction/actions.hbs",
      scrollable: [""],
    },
    upgrades: {
      template: "systems/hellpiercers/templates/sheets/faction/upgrades.hbs",
      scrollable: [""],
    },
    notes: {
      template: "systems/hellpiercers/templates/sheets/faction/notes.hbs",
      scrollable: ["", ".editor-content"],
    },
  };

  /** @type {Record<string, foundry.applications.types.ApplicationTabsConfiguration>} */
  static TABS = {
    primary: {
      tabs: [
        { id: "locations" },
        { id: "convoys" },
        { id: "research" },
        { id: "actions" },
        { id: "upgrades" },
        { id: "notes" },
      ],
      labelPrefix: "HELLPIERCERS.FACTION.TABS",
      initial: "locations",
    },
  };

  /** @override */
  _prePosition(pos) {
    pos.height = Math.max(450, pos.height ?? 0);
  }

  /** @override */
  async _onRender(ctx, opts) {
    await super._onRender(ctx, opts);
    // Inline edits to embedded array entries (locations, convoys) go through the model's methods.
    for (const el of this.element.querySelectorAll("[data-array][data-field]")) {
      el.addEventListener("change", ev => this.#onArrayFieldChange(ev));
    }
  }

  /** @param {Event} ev */
  async #onArrayFieldChange(ev) {
    if (!this.isEditable) return;
    const el = /** @type {HTMLInputElement} */ (ev.currentTarget);
    const { array, id, field } = el.dataset;
    const value =
      el.type === "checkbox" ? el.checked : el.type === "number" ? Number(el.value) : el.value;
    if (array === "location") await this.actor.system.updateLocation(id, { [field]: value });
    if (array === "convoy") await this.actor.system.updateConvoy(id, { [field]: value });
  }

  async _preparePartContext(partId, ctx, opts) {
    Object.assign(ctx, await super._preparePartContext(partId, ctx, opts));
    const f = this.actor.system;
    const isGM = game.user.isGM;
    if (partId === "header") {
      ctx.isGM = isGM;
      ctx.ichor = isGM ? ichor.get() : null;
      ctx.phase = phase.get();
      ctx.crownPips = Array.from({ length: f.crown.max }, (_, i) => ({
        filled: i < f.crown.value,
      }));
      ctx.qualities = QUALITY_KEYS.map(key => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        value: f.qualities[key],
        raw: f.qualitiesRaw[key],
        dots: Array.from({ length: 5 }, (_, i) => ({ filled: i < f.qualities[key] })),
      }));
      ctx.finalAssaultReady = f.finalAssaultReady;
      ctx.zero = f.zeroQualities.map(z => z.charAt(0).toUpperCase() + z.slice(1)).join(", ");
    }
    if (partId === "locations") this.#prepareLocations(ctx);
    if (partId === "convoys") this.#prepareConvoys(ctx);
    if (partId === "research") this.#prepareResearch(ctx);
    if (partId === "actions") this.#prepareActions(ctx);
    if (partId === "upgrades") this.#prepareUpgrades(ctx);
    if (partId === "notes") await this.#prepareNotes(ctx);
    return ctx;
  }

  #prepareLocations(ctx) {
    const f = this.actor.system;
    ctx.locationTypes = LOCATION_TYPES.map(t => ({
      key: t,
      label: game.i18n.localize(`HELLPIERCERS.LOCATION.type.${t}`),
    }));
    ctx.locations = f.locations.map(l => ({
      id: l.id,
      name: l.name,
      type: l.type,
      status: l.status,
      source: l.source,
      requires: l.requires,
      revealed: l.revealed,
      quality: l.quality,
      qualityText: qualityText(l.quality),
      buildValue: l.buildTime.value,
      buildMax: l.buildTime.max,
      building: l.status === "building",
      typeLabel: game.i18n.localize(`HELLPIERCERS.LOCATION.type.${l.type}`),
      types: ctx.locationTypes.map(t => ({ ...t, selected: t.key === l.type })),
      statuses: ["active", "building", "lost"].map(s => ({
        key: s,
        label: game.i18n.localize(`HELLPIERCERS.LOCATION.status.${s}`),
        selected: s === l.status,
      })),
    }));
  }

  #prepareConvoys(ctx) {
    const f = this.actor.system;
    ctx.convoyKinds = Object.entries(CONVOY_KINDS).map(([key, k]) => ({ key, label: k.label }));
    ctx.currentPhase = phase.get();
    ctx.locationNames = f.locations.map(l => l.name);
    ctx.convoys = f.convoys.map(c => ({
      id: c.id,
      kind: c.kind,
      kindLabel: CONVOY_KINDS[c.kind]?.label ?? c.kind,
      name: c.name,
      from: c.from,
      to: c.to,
      status: c.status,
      statusLabel: game.i18n.localize(`HELLPIERCERS.CONVOY.status.${c.status}`),
      arrivesPhase: c.arrivesPhase,
      outcome: c.outcome,
      outcomes: CONVOY_KINDS[c.kind]?.outcomes ?? [],
      revealed: c.revealed,
      traveling: c.status === "traveling",
      arrived: c.status === "arrived",
    }));
  }

  #prepareResearch(ctx) {
    const f = this.actor.system;
    const started = new Set(f.projects.map(p => p.key));
    ctx.projectChoices = RESEARCH_PROJECTS.map(p => ({
      key: p.id,
      name: p.name,
      cost: p.cost,
      time: p.time,
      disabled: started.has(p.id),
    }));
    ctx.atLimit = f.activeProjects.length >= 2;
    ctx.projects = f.projects.map(p => ({
      id: p.id,
      name: p.name,
      effect: p.effect,
      cost: p.cost,
      paid: p.paid,
      time: p.time,
      progress: p.progress,
      complete: p.status === "complete",
      funded: p.isFunded,
      boxes: Array.from({ length: p.time }, (_, i) => ({ filled: i < p.progress })),
      canTick: phase.get() > p.startedPhase,
    }));
  }

  #prepareActions(ctx) {
    const f = this.actor.system;
    ctx.isGM = game.user.isGM;
    // The faction's plans are the GM's secret.
    const catalog = game.user.isGM
      ? (FACTION_ACTIONS[f.key] ?? { actions: [], mechanics: [] })
      : { actions: [], mechanics: [] };
    const present = list =>
      list.map(a => {
        const hazard = hazardOf(a);
        return {
          name: a.name,
          flavor: a.flavor,
          body: a.body.filter(p => !/^<strong>Stage/.test(p)).join(""),
          crown: a.crown,
          crownPips: a.crown ? Array.from({ length: a.crown }, () => 1) : [],
          locked: a.crown ? !f.canDeployAtCrown(a.crown) : false,
          hazard: hazard
            ? { name: hazard.name, stages: hazard.stages.length, auto: hazard.auto }
            : null,
        };
      });
    ctx.actions = present(catalog.actions);
    ctx.mechanics = present(catalog.mechanics);
    ctx.hasCatalog = !!f.catalog;
    ctx.hazards = f.hazards
      .filter(h => h.status === "active" && game.user.isGM)
      .map(h => {
        const def = h.action
          ? hazardOf(catalog.actions.find(a => a.name === h.action) ?? {})
          : null;
        return {
          id: h.id,
          name: h.name,
          location: h.location,
          stage: h.stage,
          maxStage: h.maxStage,
          auto: h.auto,
          notes: h.notes,
          staged: h.maxStage > 0,
          text: def ? def.stages.slice(0, Math.max(1, h.stage)).join("") : "",
          intro: def?.intro ?? "",
        };
      });
    ctx.clearedHazards = f.hazards.filter(h => h.status === "cleared").map(h => h.name);
  }

  #prepareUpgrades(ctx) {
    const f = this.actor.system;
    ctx.ichor = game.user.isGM ? ichor.get() : null;
    ctx.upgrades = f.availableUpgrades.map(u => ({
      ...u,
      owned: f.upgrades.has(u.name),
    }));
    ctx.hasCatalog = !!f.catalog;
  }

  async #prepareNotes(ctx) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const f = this.actor.system;
    const fields = ctx.systemFields;
    ctx.isGM = game.user.isGM;
    ctx.editors = await Promise.all(
      [
        ["organization", "Organization"],
        ["journal", "War Journal"],
        ["supplyLines", "Supply Lines"],
        ["description", "Description"],
      ].map(async ([key, label]) => ({
        key,
        label,
        field: fields[key],
        value: f[key],
        enriched: await TextEditor.enrichHTML(f[key], { secrets: this.actor.isOwner }),
      }))
    );
    ctx.adjust = QUALITY_KEYS.map(k => ({ key: k, value: f.qualityAdjust[k] }));
    ctx.startTotal = f.startTotal;
    ctx.crownOverride = f.crown.override;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /** @this {FactionSheet} @param {MouseEvent} ev @param {HTMLElement} target */
  static async #rollQuality(ev, target) {
    const quality = target.dataset.quality;
    await this.actor.system.rollQuality(quality, { whisper: !ev.shiftKey });
  }

  /** @this {FactionSheet} */
  static async #addLocation() {
    const f = this.actor.system;
    const present = new Set(f.locations.map(l => l.name));
    const catalog = [...(f.catalog?.unique ?? []), ...(f.catalog?.starting ?? [])].filter(
      l => !present.has(l.name)
    );
    const options = [
      `<option value="">Custom location</option>`,
      ...catalog.map(
        (l, i) =>
          `<option value="${i}">${foundry.utils.escapeHTML(l.name)} (${qualityText(l.quality)}, ${l.buildTime ? `${l.buildTime} phases` : "starting"})</option>`
      ),
    ].join("");
    const result = await Dialog().input({
      window: {
        title: game.i18n.localize("HELLPIERCERS.MSG.addLocation"),
        icon: "fa-solid fa-location-dot",
      },
      content: `<div class="form-group"><label>From catalog</label><div class="form-fields"><select name="preset">${options}</select></div></div>
        <div class="form-group"><label>Custom name</label><div class="form-fields"><input type="text" name="name"></div></div>
        <div class="form-group"><label>Custom type</label><div class="form-fields"><select name="type">${LOCATION_TYPES.map(t => `<option value="${t}">${t}</option>`).join("")}</select></div></div>
        <div class="form-group"><label>Start construction</label><div class="form-fields"><input type="checkbox" name="building" checked></div></div>`,
    });
    if (!result) return;
    const preset = result.preset === "" ? null : catalog[Number(result.preset)];
    const data = preset
      ? { ...preset, source: f.catalog.unique.includes(preset) ? "unique" : "starting" }
      : { name: result.name || "New Location", type: result.type, quality: {}, buildTime: 1 };
    await f.addLocation(data, { building: !!result.building && (preset?.buildTime ?? 1) > 0 });
  }

  /** @this {FactionSheet} @param {Event} _ev @param {HTMLElement} target */
  static async #removeLocation(_ev, target) {
    const id = target.closest("[data-location-id]").dataset.locationId;
    await this.actor.system.removeLocation(id);
  }

  /** Fill one construction box. @this {FactionSheet} @param {Event} _ev @param {HTMLElement} target */
  static async #buildStep(_ev, target) {
    const id = target.closest("[data-location-id]").dataset.locationId;
    const l = this.actor.system.getLocation(id);
    const value = Math.min(l.buildTime.max, l.buildTime.value + 1);
    await this.actor.system.updateLocation(id, {
      "buildTime.value": value,
      status: value >= l.buildTime.max ? "active" : "building",
    });
  }

  /** @this {FactionSheet} */
  static async #deployConvoy() {
    const f = this.actor.system;
    const names = f.locations.map(l => l.name);
    const datalist = `<datalist id="hp-locations">${names.map(n => `<option value="${foundry.utils.escapeHTML(n)}">`).join("")}</datalist>`;
    const result = await Dialog().input({
      window: {
        title: game.i18n.localize("HELLPIERCERS.MSG.deployConvoy"),
        icon: "fa-solid fa-truck-fast",
      },
      content: `${datalist}<div class="form-group"><label>Kind</label><div class="form-fields"><select name="kind">${Object.entries(
        CONVOY_KINDS
      )
        .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
        .join("")}</select></div></div>
        <div class="form-group"><label>Name</label><div class="form-fields"><input type="text" name="name"></div></div>
        <div class="form-group"><label>From</label><div class="form-fields"><input type="text" name="from" list="hp-locations"></div></div>
        <div class="form-group"><label>To</label><div class="form-fields"><input type="text" name="to" list="hp-locations"></div></div>`,
    });
    if (result) await f.deployConvoy(result, phase.get());
  }

  /** @this {FactionSheet} @param {Event} _ev @param {HTMLElement} target */
  static async #removeConvoy(_ev, target) {
    await this.actor.system.removeConvoy(target.closest("[data-convoy-id]").dataset.convoyId);
  }

  /** @this {FactionSheet} @param {Event} _ev @param {HTMLElement} target */
  static async #resolveConvoy(_ev, target) {
    const id = target.closest("[data-convoy-id]").dataset.convoyId;
    await this.actor.system.updateConvoy(id, { status: target.dataset.status ?? "resolved" });
  }

  /** @this {FactionSheet} */
  static async #startProject() {
    const key = this.element.querySelector("select[name='project']")?.value;
    if (!key) return;
    const result = await this.actor.system.startProject(key, phase.get());
    if (!result.ok) {
      const why = {
        limit: game.i18n.localize("HELLPIERCERS.MSG.projectLimit"),
        duplicate: game.i18n.localize("HELLPIERCERS.MSG.projectDuplicate"),
      };
      ui.notifications.warn(why[result.reason] ?? result.reason);
    }
  }

  /** @this {FactionSheet} @param {Event} _ev @param {HTMLElement} target */
  static async #payProject(_ev, target) {
    const id = target.closest("[data-project-id]").dataset.projectId;
    const p = this.actor.system.projects.find(x => x.id === id);
    const pay =
      target.dataset.amount === "all" ? p.cost - p.paid : Number(target.dataset.amount ?? 1);
    await this.actor.system.advanceProject(id, { pay }, phase.get(), stratcom);
  }

  /** @this {FactionSheet} @param {Event} _ev @param {HTMLElement} target */
  static async #tickProject(_ev, target) {
    const id = target.closest("[data-project-id]").dataset.projectId;
    const r = await this.actor.system.advanceProject(id, { tick: true }, phase.get(), stratcom);
    if (r.tickedBlocked)
      ui.notifications.warn(game.i18n.localize("HELLPIERCERS.MSG.projectSamePhase"));
  }

  /** @this {FactionSheet} @param {Event} _ev @param {HTMLElement} target */
  static async #scrapProject(_ev, target) {
    await this.actor.system.scrapProject(
      target.closest("[data-project-id]").dataset.projectId,
      stratcom
    );
  }

  /** @this {FactionSheet} @param {Event} _ev @param {HTMLElement} target */
  /** Use a faction STRATCOM action, asking where when it places a hazard. */
  static async #useAction(ev, target) {
    const name = target.closest("[data-action-name]").dataset.actionName;
    const def = (FACTION_ACTIONS[this.actor.system.key]?.actions ?? []).find(a => a.name === name);
    let location = "";
    if (def && hazardOf(def)) {
      const input = await Dialog().input({
        window: { title: name },
        content: `<div class="form-group"><label>Location</label><div class="form-fields"><input type="text" name="location" autofocus></div><p class="hint">Where the map hazard goes (or which location grows a stage).</p></div>`,
      });
      if (!input) return;
      location = input.location ?? "";
    }
    const result = await this.actor.system.useAction(name, { location, force: ev.shiftKey });
    if (result.reason === "crown") {
      ui.notifications.warn(game.i18n.format("HELLPIERCERS.MSG.crownGate", { name }));
    }
  }

  /** A custom hazard, for the "Create Map Hazard" STRATCOM action. */
  static async #addHazard() {
    const input = await Dialog().input({
      window: { title: game.i18n.localize("HELLPIERCERS.MSG.createMapHazard") },
      content: `<div class="form-group"><label>Name</label><div class="form-fields"><input type="text" name="name" autofocus></div></div><div class="form-group"><label>Between</label><div class="form-fields"><input type="text" name="location" placeholder="Two locations"></div></div>`,
    });
    if (!input?.name) return;
    await this.actor.system.addHazard({ name: input.name, location: input.location ?? "" });
  }

  static async #stepHazard(_ev, target) {
    const { id } = target.closest("[data-hazard]").dataset;
    await this.actor.system.advanceHazard(id, Number(target.dataset.delta));
  }

  static async #clearHazard(_ev, target) {
    await this.actor.system.clearHazard(target.closest("[data-hazard]").dataset.hazard);
  }

  static async #removeHazard(_ev, target) {
    await this.actor.system.removeHazard(target.closest("[data-hazard]").dataset.hazard);
  }

  static async #buyUpgrade(_ev, target) {
    await this.actor.system.buyUpgrade(target.closest("[data-upgrade]").dataset.upgrade, stratcom);
  }
}
