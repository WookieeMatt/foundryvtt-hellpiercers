export class HellpiercersEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {
  static DEFAULT_OPTIONS = {
    classes: ["hellpiercers"],
  };

  static PARTS = foundry.utils.mergeObject(
    super.PARTS,
    { duration: { template: "systems/hellpiercers/templates/sheets/effect-duration.hbs" } },
    { inplace: false }
  );

  async _preparePartContext(partId, context) {
    const partContext = await super._preparePartContext(partId, context);
    if (partId === "duration") {
      partContext.systemFields = this.document.system.schema.fields;
      partContext.system = this.document.system;
    }
    return partContext;
  }
}

import.meta.hot?.accept(({ HellpiercersEffectConfig }) => {
  const reSheet = effect => {
    if (!(effect._sheet instanceof oldSheet)) return;
    if (effect.sheet.rendered) {
      const position = { top: effect.sheet.position.top, left: effect.sheet.position.left };
      const tab = effect.sheet.tabGroups;
      effect._sheet.close({ animate: false });
      effect._sheet = null;
      effect.sheet.render({ force: true, position, tab });
    } else effect._sheet = null;
  };
  const oldSheet =
    CONFIG.ActiveEffect.sheetClasses.base[`${game.system.id}.HellpiercersEffectConfig`].cls;
  const config = foundry.applications.apps.DocumentSheetConfig;
  config.unregisterSheet(ActiveEffect, game.system.id, oldSheet);
  config.registerSheet(ActiveEffect, game.system.id, HellpiercersEffectConfig, {
    makeDefault: true,
  });
  for (const item of game.items) for (const effect of item.effects) reSheet(effect);
  for (const actor of game.actors) {
    for (const item of actor.items) for (const effect of item.effects) reSheet(effect);
    for (const effect of actor.effects) reSheet(effect);
  }
});
