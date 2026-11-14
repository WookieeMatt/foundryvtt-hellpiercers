import { DamageEditor } from "../dialogs/damage-editor.mjs";
import { HaloUpgradeEditor } from "../dialogs/halo-upgrade-editor.mjs";
import { RangeEditor } from "../dialogs/range-editor.mjs";
import { hotReloadItemSheet } from "./hot-sheet.mjs";
import { HellpiercersItemSheetMixin, ToggleMixin } from "./mixins.mjs";

const ItemSheet = foundry.applications.sheets.ItemSheet;
export class HaloWeaponSheet extends HellpiercersItemSheetMixin(ToggleMixin(ItemSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["halo-weapon"],
    actions: {
      addProfile: HaloWeaponSheet.#addProfile,
      editDamage: HaloWeaponSheet.#editDamage,
      editRange: HaloWeaponSheet.#editRange,
      removeProfile: HaloWeaponSheet.#removeProfile,
    },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/item-header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    details: {
      template: "systems/hellpiercers/templates/sheets/items/halo-weapon-details.hbs",
      scrollable: ["", ".attack .editor-content", ".secondary .editor-content"],
    },
    profiles: {
      template: "systems/hellpiercers/templates/sheets/items/weapon-profiles.hbs",
      scrollable: [""],
    },
    effects: { template: "systems/hellpiercers/templates/sheets/item-effects.hbs" },
  };

  /** @type {Record<string, foundry.applications.types.ApplicationTabsConfiguration>} */
  static TABS = {
    primary: {
      tabs: [{ id: "details" }, { id: "profiles" }, { id: "effects" }],
      labelPrefix: "HELLPIERCERS.ITEM.TABS",
      initial: "details",
    },
  };

  async _onFirstRender(ctx, opts) {
    await super._onFirstRender(ctx, opts);
    this._createContextMenu(this._getProfileContextOptions, "[data-context='profile']", {
      eventName: "click",
      hookName: "getProfileContextOptions",
      fixed: true,
    });
  }

  /** @returns {import("@client/applications/ux/context-menu.mjs").ContextMenuEntry[]} */
  _getItemContextOptions() {
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

  /** @returns {import("@client/applications/ux/context-menu.mjs").ContextMenuEntry[]} */
  _getProfileContextOptions() {
    return [
      {
        label: "HELLPIERCERS.ITEM.SHEET.profiles.rename",
        icon: '<i class="fa-solid fa-edit"></i>',
        onClick: async (_ev, target) => {
          const index = Number.parseInt(target.dataset.index);
          const top = /** @type {HTMLElement} */ (target).getBoundingClientRect().bottom;
          const left = /** @type {HTMLElement} */ (target).getBoundingClientRect().left - 160;
          const { newName } =
            (await foundry.applications.api.Dialog.input({
              content: `<input type="text" value="${this.item.system.attacks[index].name}" name="newName">`,
              position: { top, left, width: 320 },
            })) ?? {};
          if (!newName) return;
          const attacks = this.item.system.toObject().attacks;
          attacks[index].name = newName;
          await this.item.update({ "system.attacks": attacks });
        },
      },
      {
        label: "HELLPIERCERS.ITEM.SHEET.profiles.remove",
        icon: `<i class="fa-solid fa-trash"></i>`,
        onClick: (_ev, target) => {
          const index = Number.parseInt(target.dataset.index);
          this.item.update({ "system.attacks": this.item.system.attacks.toSpliced(index, 1) });
        },
      },
    ];
  }

  async _preparePartContext(partId, ctx) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    if (Object.keys(ctx.tabs).includes(partId)) ctx.tab = ctx.tabs[partId];
    if (partId === "header") {
      ctx.description = {
        field: ctx.systemFields.description,
        enriched: await TextEditor.enrichHTML(ctx.system.description, {
          secrets: this.item.isOwner,
          rollData: this.actor?.getRollData.bind(this.actor),
        }),
        value: ctx.system.description,
      };
    }
    if (partId === "details") {
      ctx.effect = {
        field: ctx.systemFields.effect,
        value: ctx.system.effect,
        enriched: await TextEditor.enrichHTML(ctx.system.effect, {
          secrets: this.isOwner,
        }),
      };
      ctx.secondary = {
        field: ctx.systemFields.secondary.fields.effect,
        value: ctx.system.secondary.effect,
        enriched: await TextEditor.enrichHTML(ctx.system.secondary.effect, {
          secrets: this.isOwner,
        }),
      };
    }
    if (partId === "effects") ctx.effects = this.item.effects;
    return ctx;
  }

  /** @this {HaloWeaponSheet} */
  static async #editDamage(_ev, target) {
    const index = target.closest("[data-index]").dataset.index;
    const attack = this.item.system.attacks[index].clone();
    const new_damage = await DamageEditor.editDamage(attack.damage).catch(() =>
      console.warn("Editing damage cancelled")
    );
    if (!new_damage) return;
    attack.updateSource({ damage: _replace(new_damage) });
    const update = { "system.attacks": this.item.system.attacks.map(a => a.toObject()) };
    update["system.attacks"][index] = attack.toObject();
    await this.item.update(update);
  }

  /** @this {HaloWeaponSheet} */
  static async #editRange(_ev, target) {
    const index = target.closest("[data-index]").dataset.index;
    const attack = this.item.system.attacks[index].clone();
    const new_range = await RangeEditor.editRange(attack.range).catch(() =>
      console.warn("Editing range cancelled")
    );
    if (!new_range) return;
    attack.updateSource({ range: new_range });
    const update = { "system.attacks": this.item.system.attacks.map(a => a.toObject()) };
    update["system.attacks"][index] = attack.toObject();
    await this.item.update(update);
  }

  /** @this {HaloWeaponSheet} */
  static async #addProfile() {
    await this.item.update({
      "system.attacks": this.item.system.attacks.concat({ name: "New Attack" }),
    });
  }

  /** @this {HaloWeaponSheet} */
  static async #removeProfile(_ev, _target) {
    const index = Number.parseInt(_target.dataset.index);
    const attacks = this.item.system.attacks.toSpliced(index, 1);
    await this.item.update({ "system.attacks": attacks });
  }
}

import.meta.hot?.accept(hotReloadItemSheet("halo_weapon", "HaloWeaponSheet"));
