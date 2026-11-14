const HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
const DocumentSheet = foundry.applications.api.DocumentSheet;

export class HumanSheetConfig extends HandlebarsApplicationMixin(DocumentSheet) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["hellpiercers", "actor", "config"],
    form: { closeOnSubmit: true, submitOnChange: false },
    window: { contentClasses: ["standard-form"] },
    position: { width: 300 },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    form: { template: "systems/hellpiercers/templates/sheets/config/human.hbs", root: true },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  get title() {
    return game.i18n.format("HELLPIERCERS.DIALOG.SheetConfig.title", this.document);
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.system = this.document.system;
    ctx.systemFields = ctx.system.schema.fields;
    ctx.meta = ctx.system.meta;
    ctx.metaFields = ctx.systemFields.meta.fields;
    ctx.metaSource = ctx.system._source.meta;
    ctx.buttons = [{ label: "Save", icon: "fa-solid fa-check", type: "submit" }];
    return ctx;
  }
}

export class HaloSheetConfig extends HandlebarsApplicationMixin(DocumentSheet) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["hellpiercers", "actor", "config"],
    form: { closeOnSubmit: true, submitOnChange: false },
    window: { contentClasses: ["standard-form"] },
    position: { width: 300 },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    form: { template: "systems/hellpiercers/templates/sheets/config/halo.hbs", root: true },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  get title() {
    return game.i18n.format("HELLPIERCERS.DIALOG.SheetConfig.title", this.document);
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.system = this.document.system;
    ctx.systemFields = ctx.system.schema.fields;
    ctx.meta = ctx.system.meta;
    ctx.metaFields = ctx.systemFields.meta.fields;
    ctx.metaSource = ctx.system._source.meta;
    ctx.buttons = [{ label: "Save", icon: "fa-solid fa-check", type: "submit" }];
    return ctx;
  }
}

import.meta.hot?.accept(({ HumanSheetConfig, HaloSheetConfig }) => {
  const oldHumanSheet = CONFIG.Actor.sheetClasses.human[`${game.system.id}.HumanSheetConfig`].cls;
  const oldHaloSheet = CONFIG.Actor.sheetClasses.halo[`${game.system.id}.HaloSheetConfig`].cls;
  const reSheet = (actor, cls) => {
    for (const [key, sheet] of Object.entries(actor.apps)) {
      if (!(sheet instanceof oldHumanSheet)) continue;
      if (sheet.rendered) {
        const position = { left: sheet.position.left, top: sheet.position.top };
        delete actor[key];
        sheet.close({ animate: false });
        new cls({ document: actor }).render({ force: true, position });
      } else delete actor[key];
    }
  };
  const config = foundry.applications.apps.DocumentSheetConfig;
  config.unregisterSheet(Actor, game.system.id, oldHumanSheet);
  config.unregisterSheet(Actor, game.system.id, oldHaloSheet);
  config.registerSheet(Actor, game.system.id, HumanSheetConfig, {
    types: ["human"],
    canBeDefault: false,
    canConfigure: false,
    makeDefault: false,
  });
  config.registerSheet(Actor, game.system.id, HaloSheetConfig, {
    types: ["halo"],
    canBeDefault: false,
    canConfigure: false,
    makeDefault: false,
  });
  for (const a of game.actors) {
    if (!["human", "halo"].includes(a.type)) continue;
    const newSheet = a.type === "human" ? HumanSheetConfig : HaloSheetConfig;
    reSheet(a, newSheet);
    for (const t of a.getActiveTokens(false, true)) {
      if (t.actor.isToken) reSheet(t.actor, newSheet);
    }
  }
});
