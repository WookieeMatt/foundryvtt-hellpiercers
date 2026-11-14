/** @import {ContextMenuEntry} from "../../../client-esm/applications/ui/context.mjs" */
import { HaloUpgradeEditor } from "../dialogs/halo-upgrade-editor.mjs";
import { RangeEditor } from "../dialogs/range-editor.mjs";
import { hotReloadItemSheet } from "./hot-sheet.mjs";
import { HellpiercersItemSheetMixin, ToggleMixin } from "./mixins.mjs";

const ItemSheet = foundry.applications.sheets.ItemSheet;
export class HaloSystemSheet extends HellpiercersItemSheetMixin(ToggleMixin(ItemSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["halo-system"],
    position: { width: 500 },
    actions: {
      addUpgrade: this.#addUpgrade,
      toggleUpgrade: this.#toggleUpgrade,
      editRange: this.#editRange,
    },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/item-header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    details: {
      template: "systems/hellpiercers/templates/sheets/items/halo-system-details.hbs",
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
      ctx.upgrades = await Promise.all(
        ctx.system.upgrades.map(async u => ({
          effect: await TextEditor.enrichHTML(u.effect),
          upgrade: u,
        }))
      );
    }
    return ctx;
  }

  async _onFirstRender(ctx, opts) {
    await super._onFirstRender(ctx, opts);
    this._createContextMenu(this._getUpgradeContextOptions, "[data-context='upgrade']", {
      eventName: "click",
      hookName: "getUpgradeContextOptions",
      fixed: true,
    });
  }

  /** @returns {import("@client/applications/ux/context-menu.mjs").ContextMenuEntry[]} */
  _getUpgradeContextOptions() {
    return [
      {
        label: "Edit",
        onClick: (_ev, html) => {
          const index = Number.parseInt(html.closest("[data-index]")?.dataset.index);
          const upgrades = this.item.system.toObject().upgrades;
          HaloUpgradeEditor.editUpgrade(upgrades.at(index)).then(new_data => {
            upgrades[index] = new_data.toObject();
            this.item.update({ "system.upgrades": upgrades });
          });
        },
        visible: html => html.dataset.context === "upgrade",
        icon: "<i class='fa-solid fa-edit'></i>",
      },
      {
        label: "Delete",
        onClick: (_ev, html) => {
          const index = Number.parseInt(html.closest("[data-index]")?.dataset.index);
          /** @type {object[]} */
          const upgrades = this.item.system.toObject().upgrades;
          upgrades.splice(index, 1);
          this.item.update({ "system.upgrades": upgrades });
        },
        visible: html => html.dataset.context === "upgrade",
        icon: "<i class='fa-solid fa-trash'></i>",
      },
    ];
  }

  // Actions

  static async #addUpgrade() {
    const upgrades = this.item.system.toObject().upgrades;
    upgrades.push({ effect: "<p>New Upgrade</p>" });
    await this.item.update({ "system.upgrades": upgrades });
  }

  /**
   * @param {Event} _ev
   * @param {HTMLElement} target
   */
  static async #toggleUpgrade(_ev, target) {
    if (!this.isEditable) return;
    const index = Number.parseInt(target.closest("[data-index]")?.dataset.index);
    const upgrades = this.item.system.toObject().upgrades;
    upgrades[index].unlocked = !upgrades[index].unlocked;
    await this.item.update({ "system.upgrades": upgrades });
  }

  /** @this WeaponSheet */
  static async #editRange(_ev, target) {
    const index = target.dataset.rangeIndex;
    const range = this.item.system.range[index];
    const new_range = await RangeEditor.editRange(range).catch(() =>
      console.warn("Editing range cancelled")
    );
    if (!new_range) return;
    const update = { "system.range": this.item.system.range.map(r => r.toObject()) };
    update["system.range"][index] = new_range.toObject();
    await this.item.update(update);
  }
}

import.meta.hot?.accept(hotReloadItemSheet("halo_system", "HaloSystemSheet"));
