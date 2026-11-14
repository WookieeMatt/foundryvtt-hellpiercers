import {
  BUILDINGS_BY_ID,
  GRID_SUITES,
  OBJECTIVES,
  OFF_GRID_MUNITIONS,
  RESOURCES,
  ROLES,
  TRIUMPHS,
  VEHICLE_OPTIONS,
  VEHICLE_READINESS,
} from "../../stratcom/catalog.mjs";
import {
  advancePhase,
  completeMission,
  getFactions,
  ichor,
  phase,
} from "../../stratcom/engine.mjs";
import { ROLE_ACTIONS } from "../../stratcom/roles.mjs";
import { placeSuite } from "../dialogs/terrain-painter.mjs";
import { HellpiercersActorSheetMixin } from "./mixins.mjs";

const ActorSheet = foundry.applications.sheets.ActorSheet;
const Dialog = () => foundry.applications.api.Dialog;

const costText = cost =>
  RESOURCES.filter(r => cost[r])
    .map(r => `${cost[r]} ${game.i18n.localize(`HELLPIERCERS.RESOURCES.${r}`)}`)
    .join(", ") || "Free";

/**
 * The party (division) sheet: the squad's shared resources, base, vehicle and mission.
 * This sheet is functional rather than final: the visual redesign happens in one pass at the end.
 */
export class PartySheet extends HellpiercersActorSheetMixin(ActorSheet) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["party", "stratcom"],
    window: { resizable: true },
    position: { width: 760, height: 780 },
    actions: {
      advancePhase: PartySheet.#advancePhase,
      buildBuilding: PartySheet.#buildBuilding,
      refundBuilding: PartySheet.#refundBuilding,
      startMission: PartySheet.#startMission,
      toggleObjective: PartySheet.#toggleObjective,
      finishMission: PartySheet.#finishMission,
      removeMember: PartySheet.#removeMember,
      openMember: PartySheet.#openMember,
      addArm: PartySheet.#addArm,
      removeArm: PartySheet.#removeArm,
      endSession: PartySheet.#endSession,
      setReadiness: PartySheet.#setReadiness,
      buyVehicleOption: PartySheet.#buyVehicleOption,
      toggleVehicleOption: PartySheet.#toggleVehicleOption,
      useRoleAction: PartySheet.#useRoleAction,
      placeSuite: PartySheet.#placeSuite,
    },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/party/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    overview: {
      template: "systems/hellpiercers/templates/sheets/party/overview.hbs",
      scrollable: [""],
    },
    base: { template: "systems/hellpiercers/templates/sheets/party/base.hbs", scrollable: [""] },
    vehicle: {
      template: "systems/hellpiercers/templates/sheets/party/vehicle.hbs",
      scrollable: [""],
    },
    notes: {
      template: "systems/hellpiercers/templates/sheets/party/notes.hbs",
      scrollable: ["", ".editor-content"],
    },
  };

  /** @type {Record<string, foundry.applications.types.ApplicationTabsConfiguration>} */
  static TABS = {
    primary: {
      tabs: [{ id: "overview" }, { id: "base" }, { id: "vehicle" }, { id: "notes" }],
      labelPrefix: "HELLPIERCERS.PARTY.TABS",
      initial: "overview",
    },
  };

  /** @override */
  _prePosition(pos) {
    // The generic actor sheet clamps to 600px wide; the party sheet is wider.
    pos.height = Math.max(450, pos.height ?? 0);
  }

  /** @override */
  async _onRender(ctx, opts) {
    await super._onRender(ctx, opts);
    // Each member's Triumph is stored on the party, keyed by actor id.
    for (const el of this.element.querySelectorAll("select[data-triumph-for]")) {
      el.addEventListener("change", async ev => {
        const select = /** @type {HTMLSelectElement} */ (ev.currentTarget);
        const id = select.dataset.triumphFor;
        await this.actor.update({
          [`system.triumphs.${select.value ? id : `-=${id}`}`]: select.value || null,
        });
      });
    }
    // Inline edits to Legendary Arms go through the model, not the form.
    for (const el of this.element.querySelectorAll("[data-array='arm'][data-field]")) {
      el.addEventListener("change", async ev => {
        if (!this.isEditable) return;
        const input = /** @type {HTMLInputElement} */ (ev.currentTarget);
        const arms = this.actor.system.legendaryArms.map(a => a.toObject?.() ?? { ...a });
        const arm = arms[Number(input.dataset.index)];
        if (!arm) return;
        arm[input.dataset.field] = input.type === "number" ? Number(input.value) : input.value;
        await this.actor.update({ "system.legendaryArms": arms });
      });
    }
  }

  async _preparePartContext(partId, ctx, opts) {
    Object.assign(ctx, await super._preparePartContext(partId, ctx, opts));
    const party = this.actor.system;
    const isGM = game.user.isGM;
    if (partId === "header") {
      ctx.isGM = isGM;
      ctx.phase = phase.get();
      ctx.ichor = isGM ? ichor.get() : null;
      ctx.resources = RESOURCES.map(key => ({
        key,
        label: game.i18n.localize(`HELLPIERCERS.RESOURCES.${key}`),
        value: party.resources[key],
      }));
    }
    if (partId === "overview") await this.#prepareOverview(ctx);
    if (partId === "base") this.#prepareBase(ctx);
    if (partId === "vehicle") this.#prepareVehicle(ctx);
    if (partId === "notes") {
      ctx.journal = {
        field: ctx.systemFields.journal,
        enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          party.journal,
          {
            secrets: this.actor.isOwner,
          }
        ),
        value: party.journal,
      };
    }
    return ctx;
  }

  async #prepareOverview(ctx) {
    const party = this.actor.system;
    const mission = party.mission;
    ctx.mission = {
      active: mission.active,
      defeats: mission.defeats,
      objectives: mission.objectives.map(o => ({
        key: o.key,
        done: o.done,
        label: OBJECTIVES[o.key]?.label ?? o.key,
        reward: costText(OBJECTIVES[o.key]?.reward ?? {}),
      })),
      choices: Object.entries(OBJECTIVES).map(([key, o]) => ({
        key,
        label: o.label,
        reward: costText(o.reward),
        special: !!o.special,
      })),
      factions: getFactions().map(f => ({
        id: f.id,
        name: f.name,
        selected: f.id === mission.faction,
      })),
      factionName: game.actors.get(mission.faction)?.name ?? "",
      rewards: costText(party.missionRewards),
    };
    ctx.hasTriumph = party.mechanics.has("triumph");
    ctx.triumphs = Object.entries(TRIUMPHS).map(([key, t]) => ({ key, name: t.name }));
    ctx.members = party.memberActors.map(a => ({
      triumph: party.triumphs[a.id] ?? "",
      id: a.id,
      name: a.name,
      img: a.img,
      className: a.system.class?.name ?? "",
      armorName: a.system.armor?.name ?? "",
      hp: a.system.health?.value,
      hpMax: a.system.health?.max,
    }));
    ctx.hasOffGrid = party.mechanics.has("off_grid");
    ctx.offGridExtra = party.offGridExtra;
    ctx.offGrid = OFF_GRID_MUNITIONS.map(name => ({ name, selected: name === party.offGrid }));
    ctx.hasGrid = party.mechanics.has("grid_manipulation");
    ctx.gridSuites = Object.entries(GRID_SUITES).map(([key, s]) => ({
      key,
      name: s.name,
      tiles: s.tiles,
      selected: key === party.gridSuite,
    }));
    ctx.hasLegendary = party.mechanics.has("legendary_arms");
    ctx.arms = party.legendaryArms.map((a, index) => ({ ...a, index }));
    ctx.hasRoles = party.mechanics.has("roles");
    ctx.roles = Object.entries(ROLES).map(([key, role]) => ({
      key,
      label: role.label,
      holder: party.roles[key],
      actions: (ROLE_ACTIONS[key] ?? []).map(a => ({
        id: a.id,
        name: a.name,
        phase: a.phase,
        text: a.text,
        cost: a.cost?.any ? `${a.cost.any} of any resource` : "",
      })),
      members: ctx.members.map(m => ({ ...m, selected: m.id === party.roles[key] })),
    }));
    ctx.hasMastery = party.mechanics.has("class_mastery");
    ctx.mastery = Object.entries(party.mastery).map(([name, m]) => ({
      name,
      missions: m.missions,
      mastered: m.mastered,
    }));
  }

  #prepareBase(ctx) {
    const party = this.actor.system;
    ctx.buildings = party.buildingStates.map(b => ({
      id: b.id,
      name: b.name,
      mechanic: b.mechanic,
      built: b.built,
      buildable: b.buildable,
      affordable: b.affordable,
      cost: costText(b.cost),
      missing: b.missing.map(id => BUILDINGS_BY_ID[id]?.name ?? id),
      unlocks: Object.entries(b.unlocks).map(([type, names]) => ({
        type: game.i18n.localize(`TYPES.Item.${type}`),
        names: names.join(", "),
      })),
      refundable: b.built && !party.buildingStates.some(o => o.built && o.requires.includes(b.id)),
    }));
  }

  #prepareVehicle(ctx) {
    const party = this.actor.system;
    ctx.hasVehicle = party.hasVehicle;
    ctx.readiness = VEHICLE_READINESS.map(r => ({
      key: r,
      label: game.i18n.localize(`HELLPIERCERS.PARTY.vehicle.readiness.${r}`),
      current: r === party.vehicle.readiness,
    }));
    ctx.vehicleOptions = VEHICLE_OPTIONS.map(o => {
      const owned =
        party.vehicle.owned.has(o.id) ||
        (o.requires && !Object.keys(o.cost).length && party.buildings.has(o.requires));
      const installed =
        o.kind === "personalization"
          ? party.vehicle.personalization === o.id
          : party.vehicle.active.has(o.id);
      return {
        id: o.id,
        name: o.name,
        kind: o.kind,
        cost: costText(o.cost),
        owned,
        installed,
        locked: !!o.requires && !party.buildings.has(o.requires),
      };
    });
  }

  /* -------------------------------------------- */
  /*  Drag and drop                               */
  /* -------------------------------------------- */

  /** Dropping a HELLPIERCER onto the party adds them to the squad. */
  async _onDropActor(_event, actor) {
    if (!this.actor.isOwner || actor.type !== "human") return null;
    const members = new Set(this.actor.system.members);
    if (members.has(actor.id)) return actor;
    members.add(actor.id);
    await this.actor.update({ "system.members": [...members] });
    return actor;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /** @this {PartySheet} */
  static async #advancePhase() {
    await advancePhase();
    this.render();
  }

  /** @this {PartySheet} @param {Event} _ev @param {HTMLElement} target */
  static async #buildBuilding(_ev, target) {
    const id = target.closest("[data-building-id]").dataset.buildingId;
    const result = await this.actor.system.build(id);
    if (!result.ok) ui.notifications.warn(`Can't build: ${result.reasons.join(", ")}`);
    else {
      await ChatMessage.create({
        content: `<div class="hellpiercers stratcom-note"><header>${foundry.utils.escapeHTML(this.actor.name)} constructs ${foundry.utils.escapeHTML(BUILDINGS_BY_ID[id].name)}</header></div>`,
      });
    }
  }

  /** @this {PartySheet} @param {Event} _ev @param {HTMLElement} target */
  static async #refundBuilding(_ev, target) {
    const id = target.closest("[data-building-id]").dataset.buildingId;
    const result = await this.actor.system.refund(id);
    if (!result.ok) {
      const needs = (result.dependants ?? []).map(d => BUILDINGS_BY_ID[d]?.name).join(", ");
      ui.notifications.warn(`Can't refund: ${result.reason}${needs ? ` (${needs})` : ""}`);
    }
  }

  /** @this {PartySheet} */
  static async #startMission() {
    const form = this.element.querySelector(".mission-planner");
    const objectives = [...form.querySelectorAll("input[name='objective']:checked")].map(
      i => i.value
    );
    if (!objectives.length)
      return ui.notifications.warn(game.i18n.localize("HELLPIERCERS.MSG.chooseObjective"));
    const faction = form.querySelector("select[name='faction']")?.value ?? "";
    await this.actor.system.startMission({ objectives, faction, phase: phase.get() });
  }

  /** @this {PartySheet} @param {Event} _ev @param {HTMLElement} target */
  static async #toggleObjective(_ev, target) {
    await this.actor.system.toggleObjective(target.closest("[data-objective]").dataset.objective);
  }

  /** @this {PartySheet} @param {Event} _ev @param {HTMLElement} target */
  static async #finishMission(_ev, target) {
    const success = target.dataset.success !== "false";
    const proceed = await Dialog().confirm({
      window: {
        title: success
          ? game.i18n.localize("HELLPIERCERS.MSG.returnToDis")
          : game.i18n.localize("HELLPIERCERS.MSG.missionFailed"),
      },
      content: success
        ? "<p>Return to DIS? Rewards are paid out, the squad is rearmed and healed, and the GM earns Ichor.</p>"
        : "<p>Abandon the mission and return to DIS without rewards?</p>",
    });
    if (proceed) await completeMission({ success });
  }

  /** @this {PartySheet} @param {Event} _ev @param {HTMLElement} target */
  static async #removeMember(_ev, target) {
    const id = target.closest("[data-member-id]").dataset.memberId;
    const members = [...this.actor.system.members].filter(m => m !== id);
    await this.actor.update({ "system.members": members });
  }

  /** @this {PartySheet} @param {Event} _ev @param {HTMLElement} target */
  static async #openMember(_ev, target) {
    game.actors
      .get(target.closest("[data-member-id]").dataset.memberId)
      ?.sheet.render({ force: true });
  }

  /** @this {PartySheet} */
  static async #addArm() {
    const result = await Dialog().input({
      window: {
        title: game.i18n.localize("HELLPIERCERS.MSG.addLegendaryArm"),
        icon: "fa-solid fa-gem",
      },
      content: `<div class="form-group"><label>Name</label><div class="form-fields"><input type="text" name="name" autofocus></div></div>
        <div class="form-group"><label>Aion (sessions)</label><div class="form-fields"><input type="number" name="aion" value="3" min="1"></div></div>`,
    });
    if (!result?.name) return;
    const arms = this.actor.system.legendaryArms.map(a => a.toObject?.() ?? a);
    arms.push({ name: result.name, aion: Number(result.aion) || 3, notes: "" });
    await this.actor.update({ "system.legendaryArms": arms });
  }

  /** @this {PartySheet} @param {Event} _ev @param {HTMLElement} target */
  static async #removeArm(_ev, target) {
    const index = Number(target.closest("[data-arm-index]").dataset.armIndex);
    const arms = this.actor.system.legendaryArms
      .map(a => a.toObject?.() ?? a)
      .filter((_, i) => i !== index);
    await this.actor.update({ "system.legendaryArms": arms });
  }

  /** @this {PartySheet} */
  static async #endSession() {
    const expired = await this.actor.system.endSession();
    ui.notifications.info(
      expired.length
        ? game.i18n.format("HELLPIERCERS.MSG.armsExpired", { arms: expired.join(", ") })
        : game.i18n.localize("HELLPIERCERS.MSG.sessionEnded")
    );
  }

  /** @this {PartySheet} @param {Event} _ev @param {HTMLElement} target */
  /** Open the Terrain Painter loaded with the selected Grid Manipulation suite. @this {PartySheet} */
  static async #placeSuite() {
    const key = this.actor.system.gridSuite;
    if (!key) {
      ui.notifications?.warn(game.i18n.localize("HELLPIERCERS.TERRAIN.noSuite"));
      return;
    }
    await placeSuite(key);
  }

  static async #useRoleAction(_ev, target) {
    const role = target.dataset.role;
    const actionId = target.dataset.roleAction;
    const def = ROLE_ACTIONS[role].find(a => a.id === actionId);
    const choice = {};
    if (def.options || def.cost?.any) {
      const optionHtml = def.options
        ? `<div class="form-group"><label>Option</label><div class="form-fields"><select name="option">${def.options
            .map((o, i) => `<option value="${i}">${o.name} (${costText(o.cost)})</option>`)
            .join("")}</select></div></div>`
        : "";
      const resourceHtml = def.cost?.any
        ? `<div class="form-group"><label>Pay ${def.cost.any} with</label><div class="form-fields"><select name="resource">${RESOURCES.map(r => `<option value="${r}">${game.i18n.localize(`HELLPIERCERS.RESOURCES.${r}`)}</option>`).join("")}</select></div></div>`
        : "";
      const picked = await Dialog().input({
        window: { title: def.name, icon: "fa-solid fa-bolt" },
        content: optionHtml + resourceHtml,
      });
      if (!picked) return;
      if (picked.option !== undefined) choice.option = Number(picked.option);
      if (picked.resource) choice.resource = picked.resource;
    }
    const result = await this.actor.system.useRoleAction(role, actionId, choice);
    if (!result.ok) ui.notifications.warn(`Can't use ${def.name}: ${result.reason}`);
  }

  /** @this {PartySheet} @param {Event} _ev @param {HTMLElement} target */
  static async #setReadiness(_ev, target) {
    await this.actor.system.setReadiness(target.dataset.readiness);
  }

  /** @this {PartySheet} @param {Event} _ev @param {HTMLElement} target */
  static async #buyVehicleOption(_ev, target) {
    const result = await this.actor.system.buyVehicleOption(
      target.closest("[data-option-id]").dataset.optionId
    );
    if (!result.ok) ui.notifications.warn(`Can't buy: ${result.reason}`);
  }

  /** @this {PartySheet} @param {Event} _ev @param {HTMLElement} target */
  static async #toggleVehicleOption(_ev, target) {
    const result = await this.actor.system.toggleVehicleUpgrade(
      target.closest("[data-option-id]").dataset.optionId
    );
    if (!result.ok) ui.notifications.warn(`Can't change: ${result.reason}`);
  }
}
