import { DamageEditor } from "../dialogs/damage-editor.mjs";
import { RangeEditor } from "../dialogs/range-editor.mjs";
import { hotReloadActorSheet } from "./hot-sheet.mjs";
import { HellpiercersActorSheetMixin, ToggleMixin } from "./mixins.mjs";

const ActorSheet = foundry.applications.sheets.ActorSheet;
export class MinionSheet extends HellpiercersActorSheetMixin(ToggleMixin(ActorSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["minion"],
    actions: {
      editDamage: MinionSheet.#editDamage,
      editRange: MinionSheet.#editRange,
      onAttack: MinionSheet.#onAttack,
    },
    window: { resizable: true },
    position: { width: 600, height: 681 },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/minion/header.hbs" },
    taccom: { template: "systems/hellpiercers/templates/sheets/taccom-bar.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    abilities: {
      template: "systems/hellpiercers/templates/sheets/minion/abilities.hbs",
      scrollable: ["", ".strike .effect", ".special .effect"],
    },
    biography: {
      template: "systems/hellpiercers/templates/sheets/biography-toggled.hbs",
      scrollable: ["", ".editor-content"],
    },
    effects: {
      template: "systems/hellpiercers/templates/sheets/actor-effects-toggled.hbs",
      scrollable: [""],
    },
  };

  /** @type {Record<string, foundry.applications.types.ApplicationTabsConfiguration>} */
  static TABS = {
    primary: {
      tabs: [{ id: "abilities" }, { id: "biography" }, { id: "effects" }],
      labelPrefix: "HELLPIERCERS.ACTOR.TABS",
      initial: "abilities",
    },
  };

  async _preparePartContext(partId, ctx, opts) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    Object.assign(ctx, await super._preparePartContext(partId, ctx, opts));
    if (partId === "abilities") {
      ctx.strike = {
        field: ctx.systemFields.strike.fields.description,
        enriched: await TextEditor.enrichHTML(this.actor.system.strike.description, {
          secrets: this.actor.isOwner,
          rollData: this.actor.getRollData.bind(this.actor),
        }),
        value: ctx.system.strike.description,
      };
      ctx.special = {
        field: ctx.systemFields.special.fields.description,
        enriched: await TextEditor.enrichHTML(this.actor.system.special.description, {
          secrets: this.actor.isOwner,
          rollData: this.actor.getRollData.bind(this.actor),
        }),
        value: ctx.system.special.description,
      };
      ctx.agnosia = {
        field: ctx.systemFields.agnosia.fields.effect,
        enriched: await TextEditor.enrichHTML(this.actor.system.agnosia.effect, {
          secrets: this.actor.isOwner,
          rollData: this.actor.getRollData.bind(this.actor),
        }),
        value: ctx.system.agnosia.effect,
      };
    }
    return ctx;
  }

  async _onRender(ctx, opts) {
    await super._onRender(ctx, opts);
    this.element
      .querySelector(".swarm-input")
      ?.addEventListener("change", MinionSheet.#onEditSwarmHp.bind(this));
  }

  // Actions

  /** @this {MinionSheet} */
  static async #editDamage() {
    const damage = this.document.system.strike.damage;
    const new_damage = await DamageEditor.editDamage(damage).catch(() =>
      console.warn("Editing damage cancelled")
    );
    if (!new_damage) return;
    await this.document.update({ "system.strike.damage": _replace(new_damage) });
  }

  /** @this {MinionSheet} */
  static async #editRange() {
    const range = this.document.system.strike.range;
    const new_range = await RangeEditor.editRange(range).catch(() =>
      console.warn("Editing range cancelled")
    );
    if (!new_range) return;
    await this.document.update({ "system.strike.range": _replace(new_range) });
  }

  /** @this {MinionSheet} */
  static async #onAttack() {
    this.minimize();
    await ui.attackHud.attack({ actor: this.actor });
    this.maximize();
  }

  /**
   * @this {MinionSheet}
   * @param {InputEvent} ev
   */
  static async #onEditSwarmHp(ev) {
    /** @type {HTMLInputElement} */
    const target = ev.currentTarget;
    const val = parseInt(target.value);
    await this.actor.modifyTokenAttribute("swarm_hp", val, false);
  }
}

import.meta.hot?.accept(hotReloadActorSheet("minion", "MinionSheet"));
