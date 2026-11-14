import { hotReloadActorSheet } from "./hot-sheet.mjs";
import { HellpiercersActorSheetMixin, ToggleMixin } from "./mixins.mjs";

const ActorSheet = foundry.applications.sheets.ActorSheet;
export class SpawnerSheet extends HellpiercersActorSheetMixin(ToggleMixin(ActorSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["spawner"],
    window: { resizable: true },
    position: { width: 600, height: 580 },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/minion/header.hbs" },
    taccom: { template: "systems/hellpiercers/templates/sheets/taccom-bar.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    abilities: {
      template: "systems/hellpiercers/templates/sheets/spawner/abilities.hbs",
      scrollable: [""],
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
    Object.assign(ctx, await super._preparePartContext(partId, ctx, opts));
    if (partId === "abilities") {
      await this._prepareAbilitiesContext(ctx);
    }
    return ctx;
  }

  async _prepareAbilitiesContext(ctx) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    ctx.spawn = {
      field: ctx.systemFields.spawn.fields.spawn,
      value: ctx.system.spawn.spawn,
      enriched: await TextEditor.enrichHTML(ctx.system.spawn.spawn, {
        rollData: () => this.actor.getRollData(),
        secrets: this.actor.isOwner,
      }),
    };
    ctx.special = {
      field: ctx.systemFields.spawn.fields.special,
      value: ctx.system.spawn.special,
      enriched: await TextEditor.enrichHTML(ctx.system.spawn.special, {
        rollData: () => this.actor.getRollData(),
        secrets: this.actor.isOwner,
      }),
    };
  }
}

import.meta.hot?.accept(hotReloadActorSheet("spawner", "SpawnerSheet"));
