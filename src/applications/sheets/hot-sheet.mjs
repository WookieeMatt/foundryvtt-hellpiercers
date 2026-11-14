/**
 * Enable HMR for an actor sheet
 * @param {string} type       Actor type corresponding to the sheet
 * @param {string} sheetName  Class name for the sheet
 */
export function hotReloadActorSheet(type, sheetName) {
  return module => {
    const cls = module[sheetName];
    const reSheet = actor => {
      if (!(actor._sheet instanceof oldSheet)) return;
      if (actor.sheet.rendered) {
        const position = { top: actor.sheet.position.top, left: actor.sheet.position.left };
        const tab = actor.sheet.tabGroups;
        const locked = actor.sheet.locked;
        actor.sheet.close({ animate: false });
        actor._sheet = null;
        actor.sheet.render({ force: true, position, locked, tab });
      } else actor._sheet = null;
    };
    const oldSheet = CONFIG.Actor.sheetClasses[type][`${game.system.id}.${sheetName}`].cls;
    const config = foundry.applications.apps.DocumentSheetConfig;
    config.unregisterSheet(Actor, game.system.id, oldSheet, [type]);
    config.registerSheet(Actor, game.system.id, cls, { types: [type], makeDefault: true });
    for (const a of game.actors) {
      if (a.type !== type) continue;
      reSheet(a);
      for (const t of a.getActiveTokens(false, true)) {
        if (t.actor.isToken) reSheet(t.actor);
      }
    }
  };
}

/**
 * Enable HMR for an item sheet
 * @param {string} type       Item type corresponding to the sheet
 * @param {string} sheetName  Class name for the sheet
 */
export function hotReloadItemSheet(type, sheetName) {
  return module => {
    const cls = module[sheetName];
    const reSheet = item => {
      if (!(item._sheet instanceof oldSheet)) return;
      if (item.sheet.rendered) {
        const position = { top: item.sheet.position.top, left: item.sheet.position.left };
        const tab = item.sheet.tabGroups;
        const locked = item.sheet.locked;
        item.sheet.close({ animate: false });
        item._sheet = null;
        item.sheet.render({ force: true, position, locked, tab });
      } else item._sheet = null;
    };
    const oldSheet = CONFIG.Item.sheetClasses[type][`${game.system.id}.${sheetName}`].cls;
    const config = foundry.applications.apps.DocumentSheetConfig;
    config.unregisterSheet(Item, game.system.id, oldSheet, [type]);
    config.registerSheet(Item, game.system.id, cls, { types: [type], makeDefault: true });
    for (const item of game.items) if (item.type === type) reSheet(item);
    for (const actor of game.actors) {
      for (const item of actor.itemTypes[type]) {
        reSheet(item);
      }
      for (const token of actor.getActiveTokens(false, true)) {
        if (token.actor.isToken) {
          for (const item of token.actor.itemTypes[type]) {
            reSheet(item);
          }
        }
      }
    }
  };
}
