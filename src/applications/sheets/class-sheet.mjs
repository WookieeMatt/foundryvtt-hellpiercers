import { hotReloadItemSheet } from "./hot-sheet.mjs";
import { HellpiercersItemSheetMixin, ToggleMixin } from "./mixins.mjs";

const ItemSheet = foundry.applications.sheets.ItemSheet;
export class ClassSheet extends HellpiercersItemSheetMixin(ToggleMixin(ItemSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["class"],
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/item-header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    details: {
      template: "systems/hellpiercers/templates/sheets/items/class-details.hbs",
      scrollable: [
        "",
        ".active .editor-content",
        ".passive .editor-content",
        ".limit .editor-content",
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
      ctx.active = await this._prepareAbilityContext(ctx.systemSource.active);
      ctx.passive = await this._prepareAbilityContext(ctx.systemSource.passive);
      ctx.limit = await this._prepareAbilityContext(ctx.systemSource.limit);
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

import.meta.hot?.accept(hotReloadItemSheet("class", "ClassSheet"));
