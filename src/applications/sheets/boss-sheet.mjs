import { hotReloadActorSheet } from "./hot-sheet.mjs";
import { HellpiercersActorSheetMixin, ToggleMixin } from "./mixins.mjs";

const ActorSheet = foundry.applications.sheets.ActorSheet;
export class BossSheet extends HellpiercersActorSheetMixin(ToggleMixin(ActorSheet)) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["boss"],
    window: { resizable: true },
    position: { width: 600, height: 700 },
    actions: {
      addAttack: this.#addAttack,
      addSpecial: this.#addSpecial,
      onAttack: this.#onAttack,
    },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/sheets/boss/header.hbs" },
    taccom: { template: "systems/hellpiercers/templates/sheets/taccom-bar.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    abilities: {
      template: "systems/hellpiercers/templates/sheets/boss/abilities.hbs",
      scrollable: [""],
    },
    biography: {
      template: "systems/hellpiercers/templates/sheets/biography-toggled.hbs",
      scrollable: [""],
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

  async _preparePartContext(partId, ctx) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    Object.assign(ctx, super._preparePartContext(partId, ctx));
    if (partId === "abilities") {
      ctx.attacks = [];
      for (const attack of this.actor.system.attacks) {
        const effect = await TextEditor.enrichHTML(attack.system.effect, {
          secrets: this.actor.isOwner,
          rollData: this.actor.getRollData.bind(this.actor),
        });
        ctx.attacks.push({ attack, effect });
      }
      ctx.special = {
        item: ctx.system.special,
        effect: await TextEditor.enrichHTML(ctx.system.special?.system.effect, {
          secrets: this.actor.isOwner,
          rollData: this.actor.getRollData.bind(this.actor),
        }),
      };
      ctx.agnosia = {
        field: ctx.systemFields.agnosia.fields.effect,
        enriched: await TextEditor.enrichHTML(ctx.system.agnosia.effect, {
          secrets: this.actor.isOwner,
          rollData: this.actor.getRollData.bind(this.actor),
        }),
        value: ctx.system.agnosia.effect,
      };
    }
    return ctx;
  }

  static async #addAttack() {
    const createData = {
      name: `Attack  ${(this.actor.system.attacks?.length ?? 0) + 1}`,
      type: "ability",
      system: {
        action: "attack",
        attack: { "damage.formula": "5", range: { kind: "targets", value: 1 } },
      },
    };
    const cls = getDocumentClass("Item");
    cls.create(createData, { parent: this.actor, renderSheet: true });
  }

  static async #addSpecial() {
    const createData = {
      name: "Special",
      type: "ability",
      "system.action": "special",
    };
    const cls = getDocumentClass("Item");
    cls.create(createData, { parent: this.actor, renderSheet: true });
  }

  /**
   * @this BossSheet
   * @param {MouseEvent} _ev
   * @param {HTMLElement} target
   */
  static async #onAttack(_ev, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    this.minimize();
    await ui.attackHud.attack({ actor: this.actor, item });
    this.maximize();
  }
}

import.meta.hot?.accept(hotReloadActorSheet("boss", "BossSheet"));
