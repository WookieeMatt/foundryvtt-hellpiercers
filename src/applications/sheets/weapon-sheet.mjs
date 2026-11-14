import { DamageEditor } from "../dialogs/damage-editor.mjs";
import { RangeEditor } from "../dialogs/range-editor.mjs";
import { hotReloadItemSheet } from "./hot-sheet.mjs";
import { HellpiercersItemSheetMixin, ToggleMixin } from "./mixins.mjs";

const ItemSheet = foundry.applications.sheets.ItemSheet;
export class WeaponSheet extends HellpiercersItemSheetMixin(ToggleMixin(ItemSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["weapon"],
    position: { width: 500 },
    actions: {
      editDamage: WeaponSheet.#editDamage,
      editRange: WeaponSheet.#editRange,
      addProfile: WeaponSheet.#addProfile,
      removeProfile: WeaponSheet.#removeProfile,
    },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/item-header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    details: {
      template: "systems/hellpiercers/templates/sheets/items/weapon-details.hbs",
      scrollable: ["", ".active .editor-content", ".passive .editor-content"],
    },
    profiles: {
      template: "systems/hellpiercers/templates/sheets/items/weapon-profiles.hbs",
      scrollable: [""],
    },
    effects: {
      template: "systems/hellpiercers/templates/sheets/item-effects.hbs",
      scrollable: [""],
    },
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

  async _preparePartContext(partId, ctx, opts) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    Object.assign(ctx, await super._preparePartContext(partId, ctx, opts));
    if (partId === "details") {
      ctx.active = {
        field: ctx.systemFields.active.fields.description,
        enriched: await TextEditor.enrichHTML(ctx.system.active.description, {
          secrets: this.item.isOwner,
          rollData: this.actor?.getRollData.bind(this.actor),
        }),
        value: ctx.system.active.description,
      };
      ctx.passive = {
        field: ctx.systemFields.passive.fields.description,
        enriched: await TextEditor.enrichHTML(ctx.system.passive.description, {
          secrets: this.item.isOwner,
          rollData: this.actor?.getRollData.bind(this.actor),
        }),
        value: ctx.system.passive.description,
      };
    }
    if (partId === "profiles") {
    }
    return ctx;
  }

  /** @this {WeaponSheet} */
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

  /** @this {WeaponSheet} */
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

  /** @this {WeaponSheet} */
  static async #addProfile() {
    await this.item.update({
      "system.attacks": this.item.system.attacks.concat({ name: "New Attack" }),
    });
  }

  static async #removeProfile(_ev, _target) {
    const index = Number.parseInt(_target.dataset.index);
    const attacks = this.item.system.attacks.toSpliced(index, 1);
    await this.item.update({ "system.attacks": attacks });
  }
}

import.meta.hot?.accept(hotReloadItemSheet("weapon", "WeaponSheet"));
