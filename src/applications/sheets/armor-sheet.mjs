import { hotReloadItemSheet } from "./hot-sheet.mjs";
import { HellpiercersItemSheetMixin, ToggleMixin } from "./mixins.mjs";

const ItemSheet = foundry.applications.sheets.ItemSheet;
export class ArmorSheet extends HellpiercersItemSheetMixin(ToggleMixin(ItemSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["armor"],
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/item-header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    details: {
      template: "systems/hellpiercers/templates/sheets/items/armor-details.hbs",
      scrollable: [
        "",
        ".movement .editor-content",
        "ability .editor-content",
        ".reversal .editor-content",
      ],
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
    Object.assign(ctx, await super._preparePartContext(partId, ctx, opts));
    if (partId === "details") {
      ctx.movement = await this._prepareAbilityContext(ctx.systemSource.movement);
      ctx.ability = await this._prepareAbilityContext(ctx.systemSource.ability);
      ctx.reversal = await this._prepareAbilityContext(ctx.systemSource.reversal);
    }
    return ctx;
  }

  async _prepareAbilityContext(uuid) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    /** @type {import("../../documents/item.mjs").HellpiercersItem} */
    const item = await fromUuid(uuid);
    return {
      enriched: await TextEditor.enrichHTML(item.system.effect, { secrets: item.isOwner }),
      anchor: await item.toAnchor().outerHTML,
    };
  }
}

import.meta.hot?.accept(hotReloadItemSheet("armor", "ArmorSheet"));
