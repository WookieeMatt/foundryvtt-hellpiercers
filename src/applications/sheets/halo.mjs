import { hotReloadActorSheet } from "./hot-sheet.mjs";
import { HellpiercersActorSheetMixin, ToggleMixin } from "./mixins.mjs";

const ActorSheet = foundry.applications.sheets.ActorSheet;
export class HaloSheet extends HellpiercersActorSheetMixin(ToggleMixin(ActorSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["halo"],
    position: { width: 600, height: 700 },
    window: {
      resizable: true,
      controls: [
        {
          action: "configureUnlocks",
          icon: "fa-solid  fa-sliders",
          label: "HELLPIERCERS.ACTOR.SHEET.meta.configure",
          ownership: "OWNER",
        },
      ],
    },
    actions: {
      configureUnlocks: HaloSheet.#configureUnlocks,
      onAttack: this.#onAttack,
      switchWeaponProfile: HaloSheet.#switchWeaponProfile,
    },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/halo/header.hbs" },
    taccom: { template: "systems/hellpiercers/templates/sheets/taccom-bar.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    abilities: {
      template: "systems/hellpiercers/templates/sheets/halo/abilities.hbs",
      classes: ["flexcol", "scrollable"],
      scrollable: [
        "",
        ".effect .editor-content",
        ".secondary .editor-content",
        ".system0 .editor-content",
        ".system1 .editor-content",
      ],
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
      if (this.actor.system.weapon) {
        ctx.weapon = {};
        ctx.weapon.effect = {
          enriched: await TextEditor.enrichHTML(this.actor.system.weapon.system.effect),
        };
        ctx.weapon.secondary = {
          enriched: await TextEditor.enrichHTML(this.actor.system.weapon.system.secondary.effect),
        };
      }
      ctx.systems = [];
      for (const system of this.actor.itemTypes.halo_system.sort((a, b) => a.sort > b.sort)) {
        /** @type {string} */
        const effect =
          system.system.effect +
          system.system.upgrades
            .filter(u => u.unlocked)
            .map(u => u.effect)
            .join("\n");
        ctx.systems.push({
          item: system,
          effect: await TextEditor.enrichHTML(effect),
        });
      }
      for (
        let i = 0;
        i < (this.actor.system.meta.multi_system ? 2 : 1) - this.actor.itemTypes.halo_system.length;
        ++i
      ) {
        const text = game.i18n.localize("HELLPIERCERS.ACTOR.SHEET.missing.halo_system");
        ctx.systems.push({
          item: { name: text },
          effect: `<p>${text}</p>`,
        });
      }
    }
    return ctx;
  }

  async _onRender(ctx, opts) {
    await super._onRender(ctx, opts);
    if (opts.parts && !opts.parts.includes("abilities")) return;
    if (!this.isEditable) return;
    for (const switcher of this.element.querySelectorAll(".weapon .profile")) {
      /** @type {HTMLDivElement} */ (switcher).addEventListener("wheel", ev => {
        const delta = ev.deltaY > 0 ? 1 : -1;
        const weaponId = switcher.closest("[data-item-id]")?.dataset.itemId;
        const weapon = this.actor.items.get(weaponId);
        weapon.system.changeAttack(delta, { delta: true });
      });
    }
  }

  // Drag/Drop

  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null;
    if (this.actor.uuid === item.parent?.uuid) return super._onDropItem(event, item);
    switch (item.type) {
      case "halo_system":
        return this._onDropSystem(event, item);
      case "halo_weapon":
        return this._onDropWeapon(event, item);
      default:
        return super._onDropItem(event, item);
    }
  }

  async _onDropSystem(event, item) {
    const container = event.target.closest(".item.system");
    const toReplace = container?.dataset.itemId;
    if (container == null) return null;
    if (toReplace) {
      const existing = this.actor.items.get(toReplace);
      const proceed = await foundry.applications.api.Dialog.confirm({
        content: game.i18n.format("HELLPIERCERS.DIALOG.replaceItem.content", {
          old: existing.name,
          new: item.name,
        }),
      });
      if (!proceed) return null;
      await existing.delete();
    }
    return super._onDropItem(event, item);
  }

  async _onDropWeapon(event, item) {
    const container = event.target.closest(".item.weapon");
    const toReplace = container?.dataset.itemId;
    if (container == null) return null;
    if (toReplace) {
      const existing = this.actor.items.get(toReplace);
      const proceed = await foundry.applications.api.Dialog.confirm({
        content: game.i18n.format("HELLPIERCERS.DIALOG.replaceItem.content", {
          old: existing.name,
          new: item.name,
        }),
      });
      if (!proceed) return null;
      await existing.delete();
    }
    return super._onDropItem(event, item);
  }

  // Actions

  /** @this {HaloSheet} */
  static async #configureUnlocks() {
    const HaloSheetConfig = CONFIG.Actor.sheetClasses.halo[`${game.system.id}.HaloSheetConfig`].cls;
    await new HaloSheetConfig({ document: this.document }).render({ force: true });
  }

  /**
   * @this {HaloSheet}
   * @param {MouseEvent} _ev
   * @param {HTMLElement} target
   */
  static async #onAttack(_ev, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    // if (!item) throw new Error("Invalid item or uuid");
    this.minimize();
    await ui.attackHud.attack({ actor: this.actor, item });
    this.maximize();
  }

  /**
   * @this {HaloSheet}
   * @param {MouseEvent} _ev
   * @param {HTMLElement} target
   */
  static async #switchWeaponProfile(_ev, target) {
    const delta = Number.parseInt(target.dataset.delta);
    /** @type {string} */
    const weaponId = target.closest("[data-item-id]")?.dataset.itemId;
    const weapon = this.actor.items.get(weaponId);
    await weapon.system.changeAttack(delta, { delta: true });
  }
}

import.meta.hot?.accept(hotReloadActorSheet("halo", "HaloSheet"));
