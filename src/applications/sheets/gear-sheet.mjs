import { hotReloadItemSheet } from "./hot-sheet.mjs";
import { HellpiercersItemSheetMixin, ToggleMixin } from "./mixins.mjs";

const ItemSheet = foundry.applications.sheets.ItemSheet;
export class GearSheet extends HellpiercersItemSheetMixin(ToggleMixin(ItemSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = { classes: ["gear"], position: { width: 500 } };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/item-header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    details: {
      template: "systems/hellpiercers/templates/sheets/items/gear-details.hbs",
      scrollable: ["", ".editor-content"],
    },
    effects: { template: "systems/hellpiercers/templates/sheets/item-effects.hbs" },
  };

  /** @type {Record<string, foundry.applications.types.ApplicationTabsConfiguration>} */
  static TABS = {
    primary: {
      tabs: [{ id: "details" }, { id: "effects" }],
      labelPrefix: "HELLPIERCERS.ITEM.TABS",
      initial: "details",
    },
  };

  async _preparePartContext(partId, ctx, opts) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    Object.assign(ctx, await super._preparePartContext(partId, ctx, opts));
    if (partId === "details") {
      ctx.effect = {
        field: ctx.systemFields.effect,
        enriched: await TextEditor.enrichHTML(ctx.system.effect, {
          secrets: this.item.isOwner,
          rollData: this.actor?.getRollData.bind(this.actor),
        }),
        value: ctx.system.effect,
      };
    }
    return ctx;
  }
}

import.meta.hot?.accept(hotReloadItemSheet("gear", "GearSheet"));
