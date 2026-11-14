/** @import * as hookEvents from "@client/hooks.mjs"; */

/** @type {typeof hookEvents.hotbarDrop} */
export function onHotbarDrop(hotbar, dropData, slot) {
  if (dropData.type === "attackmacro") {
    handleAttackMacroDrop(hotbar, dropData, slot);
    return false;
  }
  if (dropData.type === "Actor") {
    /** @type {foundry.documents["Actor"]} */
    const cls = getDocumentClass("Actor");
    cls
      ?.fromDropData(dropData)
      .then(d => hotbar._createDocumentSheetToggle(d).then(m => m.update({ img: d.img })))
      .then(macro => game.user.assignHotbarMacro(macro, slot, { fromSlot: dropData.slot }));
    return false;
  }
}

/** @type {typeof hookEvents.hotbarDrop} */
async function handleAttackMacroDrop(_h, dropData, slot) {
  const source = await fromUuid(dropData.uuid);
  if (!source) return;
  const data = {};
  if (source.documentName === "Item") {
    data.item = source.uuid;
  } else {
    data.actor = source.uuid;
  }
  if ("index" in dropData) {
    data.index = dropData.index;
  }
  const command = `ui.attackHud.attack(${JSON.stringify(data, null, 2)});`;
  const cls = getDocumentClass("Macro");
  const macro = await cls.create({
    name: `${source.name} Attack`,
    img: source.img,
    type: CONST.MACRO_TYPES.SCRIPT,
    command,
    [`flags.${game.system.id}.type`]: "attack",
  });
  game.user.assignHotbarMacro(macro, slot);
}

import.meta.hot?.accept(({ onHotbarDrop }) => Hooks.on("hotbarDrop", onHotbarDrop));
import.meta.hot?.dispose(() => Hooks.off("hotbarDrop", onHotbarDrop));
