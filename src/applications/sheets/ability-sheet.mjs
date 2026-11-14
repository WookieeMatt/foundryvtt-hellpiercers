import { DamageEditor } from "../dialogs/damage-editor.mjs";
import { RangeEditor } from "../dialogs/range-editor.mjs";
import { hotReloadItemSheet } from "./hot-sheet.mjs";
import { HellpiercersItemSheetMixin, ToggleMixin } from "./mixins.mjs";

const ItemSheet = foundry.applications.sheets.ItemSheet;
export class AbilitySheet extends HellpiercersItemSheetMixin(ToggleMixin(ItemSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["ability"],
    actions: {
      editDamage: this.#editDamage,
      editRange: this.#editRange,
    },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/item-header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    details: {
      template: "systems/hellpiercers/templates/sheets/items/ability-details.hbs",
      scrollable: ["", ".effect .editor-content"],
    },
    effects: {
      template: "systems/hellpiercers/templates/sheets/item-effects.hbs",
      scrollable: [""],
    },
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
      ctx.item_link = await TextEditor.enrichHTML(`@UUID[${ctx.system.item?.uuid}]`);
    }
    return ctx;
  }

  /** @this {AbilitySheet} */
  static async #editDamage() {
    const damage = this.item.system.attack?.damage ?? { kind: "targets", value: 1 };
    const new_damage = await DamageEditor.editDamage(damage).catch(() =>
      console.warn("Editing damage cancelled")
    );
    if (!new_damage) return;
    const update = { "system.attack.damage": _replace(new_damage.toObject()) };
    await this.item.update(update);
  }

  /** @this {AbilitySheet} */
  static async #editRange() {
    const range = this.item.system.attack?.range ?? { kind: "targets", value: 1 };
    const new_range = await RangeEditor.editRange(range).catch(() =>
      console.warn("Editing range cancelled")
    );
    if (!new_range) return;
    const update = { "system.attack.range": _replace(new_range) };
    await this.item.update(update);
  }
}

import.meta.hot?.accept(hotReloadItemSheet("ability", "AbilitySheet"));
