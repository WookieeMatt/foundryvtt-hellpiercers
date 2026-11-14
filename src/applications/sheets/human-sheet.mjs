import { hotReloadActorSheet } from "./hot-sheet.mjs";
import { HellpiercersActorSheetMixin, ToggleMixin } from "./mixins.mjs";

const ActorSheet = foundry.applications.sheets.ActorSheet;
export class HumanSheet extends HellpiercersActorSheetMixin(ToggleMixin(ActorSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["human"],
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
    position: { width: 600, height: 700 },
    actions: {
      configureUnlocks: HumanSheet.#configureUnlocks,
      switchWeaponProfile: HumanSheet.#switchWeaponProfile,
      onAttack: HumanSheet.#onAttack,
      toggleEquipemnt: HumanSheet.#toggleEquipemnt,
    },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/human/header.hbs" },
    taccom: { template: "systems/hellpiercers/templates/sheets/taccom-bar.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    abilities: {
      template: "systems/hellpiercers/templates/sheets/human/abilities.hbs",
      scrollable: [
        "",
        ".armor .active .description",
        ".armor .movement .description",
        ".class .active .description",
        ".class .passive .description",
        ".special .limit .description",
        ".special .reversal .description",
      ],
    },
    loadout: {
      template: "systems/hellpiercers/templates/sheets/human/loadout.hbs",
      scrollable: [
        "",
        ".gear0 .editor-content",
        ".gear1 .editor-content",
        ".equipment0 .editor-content",
        ".equipment1 .editor-content",
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
      tabs: [{ id: "abilities" }, { id: "loadout" }, { id: "biography" }, { id: "effects" }],
      labelPrefix: "HELLPIERCERS.ACTOR.TABS",
      initial: "abilities",
    },
  };

  async _preparePartContext(partId, ctx, opts) {
    Object.assign(ctx, await super._preparePartContext(partId, ctx, opts));
    if (partId === "abilities") {
      await this._prepareAbilitiesContext(ctx);
    }
    if (partId === "loadout") {
      await this._prepareLoadoutContext(ctx);
    }
    return ctx;
  }

  async _onRender(ctx, opts) {
    await super._onRender(ctx, opts);
    if (opts.parts && !opts.parts.includes("abilities")) return;
    for (const switcher of this.element.querySelectorAll(".attack div.switcher")) {
      /** @type {HTMLDivElement} */ (switcher).addEventListener("wheel", ev => {
        const delta = ev.deltaY > 0 ? -1 : 1;
        const weaponId = switcher.closest("[data-item-id]")?.dataset.itemId;
        const weapon = this.actor.items.get(weaponId);
        weapon.system.changeAttack(delta, { delta: true });
      });
    }
  }

  async _prepareAbilitiesContext(ctx) {
    ctx.weaponPri = await this._getWeaponContext(this.actor.system.weapon_pri, "pri");
    ctx.weaponSec = await this._getWeaponContext(this.actor.system.weapon_sec, "sec");
    ctx.armor = await this._getArmorContext(this.actor.system.armor);
    ctx.class = await this._getClassContext(this.actor.system.class);
    return ctx;
  }

  async _prepareLoadoutContext(ctx) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    ctx.itemTypes = Object.fromEntries(
      Object.entries(this.actor.itemTypes).map(([key, arr]) => [
        key,
        arr.sort((a, b) => a.sort > b.sort).map(item => ({ item })),
      ])
    );
    ctx.itemTypes.gear = await Promise.all(
      ctx.itemTypes.gear.map(async ({ item }) => ({
        item,
        effect: await TextEditor.enrichHTML(item.system.effect),
      }))
    );
    ctx.itemTypes.equipment = await Promise.all(
      ctx.itemTypes.equipment.map(async ({ item }) => ({
        item,
        effect: await TextEditor.enrichHTML(item.system.effect),
      }))
    );
  }

  async _getWeaponContext(weapon, which) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const name = `system.weapon_${which}`;
    const classes = `weapon_${which}`;
    if (!weapon?.id) return { name, classes };
    const ctx = {
      name,
      classes,
      id: weapon._id,
      item: weapon,
      active_desc: await TextEditor.enrichHTML(weapon.system.active.description),
      passive_desc: await TextEditor.enrichHTML(weapon.system.passive.description),
    };
    return ctx;
  }

  async _getArmorContext(armor) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const ctx = {
      item: armor,
      ability: {
        item: this.actor.system.abilities.armor.ability,
        classes: "active",
        key: "armor.active",
        desc: await TextEditor.enrichHTML(this.actor.system.abilities.armor.ability?.system.effect),
      },
      movement: {
        item: this.actor.system.abilities.armor.movement,
        classes: "movement",
        key: "armor.movement",
        desc: await TextEditor.enrichHTML(
          this.actor.system.abilities.armor.movement?.system.effect
        ),
      },
      reversal: {
        item: this.actor.system.abilities.armor.reversal,
        classes: "reversal",
        key: "armor.reversal",
        bar: {
          label: "HELLPIERCERS.ACTOR.FIELDS.reversal_charges.label",
          valueField: this.actor.system.schema.getField("reversal_charges.value"),
          value: this.actor.system.reversal_charges.value,
          max: this.actor.system.reversal_charges.max,
        },
        desc: await TextEditor.enrichHTML(
          this.actor.system.abilities.armor.reversal?.system.effect
        ),
      },
    };
    return ctx;
  }

  async _getClassContext(cls) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const ctx = {
      item: cls,
      active: {
        item: this.actor.system.abilities.class.active,
        classes: "active",
        key: "class.active",
        desc: await TextEditor.enrichHTML(this.actor.system.abilities.class.active?.system.effect),
      },
      passive: {
        item: this.actor.system.abilities.class.passive,
        classes: "passive",
        key: "class.passive",
        desc: await TextEditor.enrichHTML(this.actor.system.abilities.class.passive?.system.effect),
      },
      limit: {
        item: this.actor.system.abilities.class.limit,
        classes: "limit bar",
        key: "class.limit",
        bar: {
          label: "HELLPIERCERS.ACTOR.FIELDS.limit.label",
          valueField: this.actor.system.schema.getField("limit.value"),
          value: this.actor.system.limit.value,
          max: this.actor.system.limit.max,
        },
        desc: await TextEditor.enrichHTML(this.actor.system.abilities.class.limit?.system.effect),
      },
    };
    return ctx;
  }

  // Drag/Drop

  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null;
    if (this.actor.uuid === item.parent?.uuid) return super._onDropItem(event, item);
    switch (item.type) {
      case "weapon":
        return this._onDropWeapon(event, item);
      case "armor":
        return this._onDropArmor(event, item);
      case "class":
        return this._onDropClass(event, item);
      case "ability":
        return this._onDropAbility(event, item);
      case "gear":
        return this._onDropGear(event, item);
      case "equipment":
        return this._onDropEquipment(event, item);
      default:
        return super._onDropItem(event, item);
    }
  }

  async _onDropWeapon(event, item) {
    /** @type {HTMLElement} */
    const container = event.target.closest(".item.weapon") ?? event.target.closest("ol.weapons");
    const toReplace = container?.dataset.itemId;
    if (container == null) return null;
    if (container.classList.contains("weapons")) {
      if (this.actor.itemTypes.weapon.length < this.actor.system.meta.weapon_slots) {
        return super._onDropItem(event, item);
      }
      return null;
    }
    if (!toReplace && this.actor.itemTypes.weapon.length < 2) return super._onDropItem(event, item);
    const oldItem = this.actor.items.get(toReplace);
    const keepId = !this.actor.items.has(item.id);
    const newItem = game.items.fromCompendium(item, { keepId });
    const proceed = await foundry.applications.api.Dialog.confirm({
      content: game.i18n.format("HELLPIERCERS.DIALOG.replaceItem.content", {
        old: oldItem.name,
        new: newItem.name,
      }),
    });
    if (!proceed) return null;
    newItem.sort = oldItem.sort;
    oldItem.delete();
    const result = await foundry.documents.Item.implementation.create(newItem, {
      parent: this.actor,
      keepId,
    });
    return result ?? null;
  }

  async _onDropArmor(event, item) {
    const existing = this.actor.system.armor;
    const container = event.target.closest(".item.armor");
    if (container == null) return null;
    if (existing) {
      const proceed = await foundry.applications.api.Dialog.confirm({
        content: game.i18n.format("HELLPIERCERS.DIALOG.replaceItem.content", {
          old: existing.name,
          new: item.name,
        }),
      });
      if (!proceed) return null;
      await existing.delete();
    }
    const armor = await super._onDropItem(event, item);
    if (armor) await this.actor.system.applyArmor(armor);
    return armor ?? null;
  }

  async _onDropClass(event, item) {
    const existing = this.actor.system.class;
    const container = event.target.closest(".item.class");
    if (container == null) return null;
    if (existing) {
      const proceed = await foundry.applications.api.Dialog.confirm({
        content: game.i18n.format("HELLPIERCERS.DIALOG.replaceItem.content", {
          old: existing.name,
          new: item.name,
        }),
      });
      if (!proceed) return null;
      await existing.delete();
    }
    const cls = await super._onDropItem(event, item);
    if (cls) await this.actor.system.applyClass(cls);
    return cls ?? null;
  }

  /**
   * @param {DragEvent} event
   * @param {import("../../documents/item.mjs").HellpiercersItem} item
   */
  async _onDropAbility(event, item) {
    /** @type {HTMLElement} */
    const container = event.target.closest(".item.ability");
    if (container == null) return null;
    const oldAbility = this.actor.items.get(container.dataset.itemId);
    const [type, action] = container.dataset.abilityKey.split(".");
    const keepId = !this.actor.items.has(item.id) || item.id === oldAbility?.id;
    const itemData = game.items.fromCompendium(item, { keepId });
    if (itemData.system.action !== action || itemData.system.item.type !== type) {
      return null;
    }
    const proceed = oldAbility
      ? await foundry.applications.api.Dialog.confirm({
          content: game.i18n.format("HELLPIERCERS.DIALOG.replaceItem.content", {
            old: oldAbility.name,
            new: item.name,
          }),
        })
      : true;
    if (!proceed) return null;
    await oldAbility?.delete();
    const result = await getDocumentClass("Item").create(itemData, { parent: this.actor, keepId });
    return result ?? null;
  }

  /**
   * @param {DragEvent} event
   * @param {import("../../documents/item.mjs").HellpiercersItem} item
   */
  async _onDropGear(event, item) {
    const container = event.target.closest("ol.items.gear");
    if (container == null) return null;
    return super._onDropItem(event, item);
  }

  /**
   * @param {DragEvent} event
   * @param {import("../../documents/item.mjs").HellpiercersItem} item
   */
  async _onDropEquipment(event, item) {
    const container = event.target.closest("ol.items.equipment");
    if (container == null) return null;
    return super._onDropItem(event, item);
  }

  // Actions

  /** @this {HumanSheet} */
  static async #configureUnlocks() {
    const HumanSheetConfig =
      CONFIG.Actor.sheetClasses.human[`${game.system.id}.HumanSheetConfig`].cls;
    await new HumanSheetConfig({ document: this.document }).render({ force: true });
  }

  /**
   * @this {HumanSheet}
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

  /**
   * @this {HumanSheet}
   * @param {MouseEvent} _ev
   * @param {HTMLElement} target
   */
  static async #onAttack(_ev, target) {
    const id = /** @type {HTMLElement} */ (target.closest("[data-item-id]"))?.dataset.itemId;
    const item = this.actor.items.get(id);
    this.minimize();
    await ui.attackHud.attack({ actor: this.actor, item, index: item.system.selected_attack });
    this.maximize();
  }

  /**
   * @this {HumanSheet}
   * @param {MouseEvent} _ev
   * @param {HTMLElement} target
   */
  static async #toggleEquipemnt(_ev, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(id);
    await item.update({ "system.available": !item.system.available });
  }
}

import.meta.hot?.accept(hotReloadActorSheet("human", "HumanSheet"));
