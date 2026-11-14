/**
 * Terrain and Grid Manipulation (pp. 100-102, 120).
 *
 * Each patch of special terrain is a Scene Region carrying a `terrain` RegionBehavior
 * (`src/data/region-behavior.mjs`). Cell-merged types (Uneasy, Cover, Advantageous, Impassable,
 * Void) share one region per scene and type; per-tile types (Obstacle, Linked, Trapped, Attractor)
 * get one region per tile, because each tile has its own state (HP, trap charge, zone).
 *
 * Automation is advisory: effects that the book resolves automatically (Trapped damage, Linked
 * steps, Attractor Pull, Cover -1) are rolled or offered with a button, but movement is never
 * blocked. The *Automate Terrain* setting switches all of it off.
 */

import { Damage } from "../data/damage.mjs";
import { tint } from "../integrations/dice.mjs";
import { getSetting } from "../settings.mjs";

/** How far an Attractor's zone reaches around its tile (Range:2, SHARUR's Back Up). */
export const ATTRACTOR_RANGE = 2;

/**
 * The terrain types of the Core Rules (p. 100) plus the Grid Manipulation types (p. 120).
 * `merged`: one region per scene and type, painted cell by cell. Others are one region per tile.
 * `secret`: visible to the GM only until it triggers (Trapped tiles are "marked in secret").
 */
export const TERRAIN_TYPES = Object.freeze({
  uneasy: { color: "#c7791f", icon: "fa-hill-rockslide", merged: true },
  cover: { color: "#2e6f9e", icon: "fa-shield-halved", merged: true },
  advantageous: { color: "#3f8f4f", icon: "fa-arrow-up-right-dots", merged: true },
  impassable: { color: "#49495a", icon: "fa-ban", merged: true },
  void: { color: "#2a0b3d", icon: "fa-skull", merged: true },
  obstacle: { color: "#6e4a2f", icon: "fa-cube", merged: false },
  linked: { color: "#1f9eb3", icon: "fa-link", merged: false },
  trapped: { color: "#a3242e", icon: "fa-land-mine-on", merged: false, secret: true },
  attractor: { color: "#b3367a", icon: "fa-magnet", merged: false },
});

const FLAG = "terrain";

/** Localized name of a terrain type. */
export function terrainLabel(type) {
  return game.i18n.localize(`HELLPIERCERS.TERRAIN.${type}`);
}

/**
 * The terrain type of a region, or null if it is not a terrain region.
 * @param {foundry.documents.RegionDocument} region
 */
export function terrainTypeOf(region) {
  const flag = region.getFlag(game.system.id, FLAG);
  if (flag in TERRAIN_TYPES) return flag;
  const behavior = region.behaviors.find(b => b.type === "terrain" && !b.disabled);
  return behavior?.system.terrain ?? null;
}

/**
 * Every terrain region of a scene, optionally of one type.
 * @param {foundry.documents.Scene} scene
 * @param {string} [type]
 */
export function terrainRegions(scene, type) {
  return scene.regions.filter(r => {
    const t = terrainTypeOf(r);
    return t && (!type || t === type);
  });
}

/* -------------------------------------------- */
/*  Grid cells                                  */
/* -------------------------------------------- */

/** @typedef {{ i: number, j: number }} Cell  Grid offset (row i, column j). */

/** The grid cell under a canvas point. */
export function cellAt(point) {
  return canvas.grid.getOffset(point);
}

/** The pixel rectangle of a cell. */
export function cellRect(cell) {
  const { x, y } = canvas.grid.getTopLeftPoint(cell);
  return { x, y, width: canvas.grid.sizeX, height: canvas.grid.sizeY };
}

const cellKey = cell => `${cell.i},${cell.j}`;

/** The cells covered by a terrain region's rectangle shapes. */
export function regionCells(region) {
  const { sizeX, sizeY } = canvas.grid;
  const cells = [];
  for (const shape of region.shapes) {
    if (shape.type !== "rectangle") continue;
    const i0 = Math.round(shape.y / sizeY);
    const j0 = Math.round(shape.x / sizeX);
    for (let di = 0; di < Math.max(1, Math.round(shape.height / sizeY)); di++) {
      for (let dj = 0; dj < Math.max(1, Math.round(shape.width / sizeX)); dj++) {
        cells.push({ i: i0 + di, j: j0 + dj });
      }
    }
  }
  return cells;
}

/**
 * Every special terrain cell of a scene: cell key -> Set of types.
 * @param {foundry.documents.Scene} scene
 * @returns {Map<string, Set<string>>}
 */
export function specialCells(scene) {
  const map = new Map();
  for (const region of terrainRegions(scene)) {
    const type = terrainTypeOf(region);
    // An Attractor region is its zone; only its centre tile is terrain.
    const cells = type === "attractor" ? [attractorTile(region)] : regionCells(region);
    for (const cell of cells) {
      if (!cell) continue;
      const key = cellKey(cell);
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(type);
    }
  }
  return map;
}

/**
 * Whether a token-sized rectangle (in grid cells, as used by the Provoke engine) touches special
 * terrain. Used for JEHOEL's Quark-Gluon-Celestium Form.
 * @param {Map<string, Set<string>>} special   From {@link specialCells}
 * @param {{ x: number, y: number, w: number, h: number }} rect
 */
export function rectTouchesSpecial(special, rect) {
  for (let di = 0; di < Math.max(1, Math.round(rect.h)); di++) {
    for (let dj = 0; dj < Math.max(1, Math.round(rect.w)); dj++) {
      if (special.has(`${Math.round(rect.y) + di},${Math.round(rect.x) + dj}`)) return true;
    }
  }
  return false;
}

/** The terrain types under a token right now (from the token's live region membership). */
export function terrainAtToken(tokenDoc) {
  const types = new Set();
  for (const region of tokenDoc.regions ?? []) {
    const type = terrainTypeOf(region);
    if (type) types.add(type);
  }
  return types;
}

/** Whether an actor's armor is JEHOEL (no Provoke into/out of special terrain; blocking terrain as Uneasy). */
export function wearsJehoel(actor) {
  return actor?.type === "human" && /jehoel/i.test(actor.system.armor?.name ?? "");
}

/* -------------------------------------------- */
/*  Painting                                    */
/* -------------------------------------------- */

/** The centre tile of an attractor region (its zone is the tile grown by ATTRACTOR_RANGE). */
export function attractorTile(region) {
  const { x, y, width, height } = region.shapes[0] ?? {};
  if (x == null) return null;
  return cellAt({ x: x + width / 2, y: y + height / 2 });
}

/**
 * Build the creation data for one terrain region.
 * @param {string} type
 * @param {Cell[]} cells
 * @param {object} [data]   Extra behavior system data (hp, formula, ravaging)
 */
function regionData(type, cells, data = {}) {
  const def = TERRAIN_TYPES[type];
  let shapes;
  if (type === "attractor") {
    const rect = cellRect(cells[0]);
    const { sizeX, sizeY } = canvas.grid;
    shapes = [
      {
        type: "rectangle",
        x: rect.x - ATTRACTOR_RANGE * sizeX,
        y: rect.y - ATTRACTOR_RANGE * sizeY,
        width: rect.width + 2 * ATTRACTOR_RANGE * sizeX,
        height: rect.height + 2 * ATTRACTOR_RANGE * sizeY,
      },
    ];
  } else {
    shapes = cells.map(cell => ({ type: "rectangle", ...cellRect(cell) }));
  }
  return {
    name: terrainLabel(type),
    color: def.color,
    shapes,
    visibility: def.secret ? CONST.REGION_VISIBILITY.GAMEMASTER : CONST.REGION_VISIBILITY.ALWAYS,
    behaviors: [{ name: terrainLabel(type), type: "terrain", system: { terrain: type, ...data } }],
    flags: { [game.system.id]: { [FLAG]: type } },
  };
}

/**
 * Paint terrain cells on a scene. "standard" erases special terrain (changed terrain stays
 * changed, p. 100). Painting enforces the book's tile rules: Void replaces other terrain, and a
 * tile holds at most 2 special effects (the oldest is replaced).
 * @param {foundry.documents.Scene} scene
 * @param {string} type   A key of TERRAIN_TYPES, or "standard"
 * @param {Cell[]} cells
 * @param {object} [data]   Behavior data for per-tile types ({ hp, formula, ravaging })
 */
export async function paint(scene, type, cells, data = {}) {
  if (!cells.length) return;
  if (type === "standard") return erase(scene, cells);

  const def = TERRAIN_TYPES[type];
  if (!def) throw new Error(`Unknown terrain type "${type}"`);

  // Void replaces every other effect; otherwise keep the newest two. Repainting the same type
  // on a tile replaces it instead of stacking a duplicate.
  if (type === "void") await erase(scene, cells);
  else {
    if (!def.merged) await erase(scene, cells, { types: [type] });
    const special = specialCells(scene);
    const crowded = cells.filter(c => (special.get(cellKey(c))?.size ?? 0) >= 2);
    if (crowded.length) {
      await erase(scene, crowded, { first: true });
      ui.notifications?.info(game.i18n.localize("HELLPIERCERS.TERRAIN.replacedOldest"));
    }
  }

  if (def.merged) {
    const region = terrainRegions(scene, type).find(r =>
      r.behaviors.some(b => b.type === "terrain")
    );
    if (region) {
      const have = new Set(regionCells(region).map(cellKey));
      const add = cells.filter(c => !have.has(cellKey(c)));
      if (add.length) {
        const shapes = [
          ...region.shapes.map(s => s.toObject()),
          ...add.map(cell => ({ type: "rectangle", ...cellRect(cell) })),
        ];
        await region.update({ shapes });
      }
    } else await scene.createEmbeddedDocuments("Region", [regionData(type, cells)]);
  } else {
    await scene.createEmbeddedDocuments(
      "Region",
      cells.map(cell => regionData(type, [cell], data))
    );
  }
  Hooks.callAll("hellpiercers.terrainChanged", scene, type, cells);
}

/**
 * Erase special terrain from cells.
 * @param {foundry.documents.Scene} scene
 * @param {Cell[]} cells
 * @param {object} [options]
 * @param {boolean} [options.first=false]   Remove only the oldest effect of each cell
 * @param {string[]} [options.types]        Erase only these terrain types
 */
export async function erase(scene, cells, { first = false, types = null } = {}) {
  const keys = new Set(cells.map(cellKey));
  const deletions = [];
  const updates = [];
  const remaining = new Set(keys);
  for (const region of terrainRegions(scene)) {
    const type = terrainTypeOf(region);
    if (types && !types.includes(type)) continue;
    const owned =
      type === "attractor" ? [attractorTile(region)].filter(Boolean) : regionCells(region);
    const hit = owned.some(c => keys.has(cellKey(c)) && (!first || remaining.has(cellKey(c))));
    if (!hit) continue;
    if (TERRAIN_TYPES[type]?.merged) {
      const shapes = region.shapes
        .filter(s => {
          const centre = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
          const key = cellKey(cellAt(centre));
          const match = keys.has(key) && (!first || remaining.has(key));
          if (match && first) remaining.delete(key);
          return !match;
        })
        .map(s => s.toObject());
      if (shapes.length) updates.push({ _id: region.id, shapes });
      else deletions.push(region.id);
    } else {
      if (first) for (const c of owned) remaining.delete(cellKey(c));
      deletions.push(region.id);
    }
  }
  if (updates.length) await scene.updateEmbeddedDocuments("Region", updates);
  if (deletions.length) await scene.deleteEmbeddedDocuments("Region", deletions);
  if (updates.length || deletions.length) {
    Hooks.callAll("hellpiercers.terrainChanged", scene, "standard", cells);
  }
}

/** Remove every terrain region from a scene. */
export async function clearAll(scene) {
  const ids = terrainRegions(scene).map(r => r.id);
  if (ids.length) await scene.deleteEmbeddedDocuments("Region", ids);
}

/* -------------------------------------------- */
/*  Obstacles                                   */
/* -------------------------------------------- */

/**
 * Damage an Obstacle (p. 100: Obstacles have HP; with no HP listed they break in one hit).
 * @param {foundry.documents.RegionDocument} region
 * @param {number} amount
 * @returns {Promise<boolean>} Whether the obstacle broke
 */
export async function damageObstacle(region, amount) {
  const behavior = region.behaviors.find(b => b.type === "terrain");
  if (!behavior || behavior.system.terrain !== "obstacle") {
    throw new Error("Not an Obstacle region");
  }
  const hp = behavior.system.hp;
  if (hp == null || amount >= hp) {
    await note(
      game.i18n.format("HELLPIERCERS.TERRAIN.MSG.obstacleBroken", { name: region.name }),
      "fa-burst"
    );
    await region.delete();
    return true;
  }
  await behavior.update({ "system.hp": hp - amount });
  return false;
}

/* -------------------------------------------- */
/*  Movement handling (advisory)                */
/* -------------------------------------------- */

/** Post a one-line terrain note to chat. */
async function note(text, icon = "fa-mountain-sun", extra = {}) {
  const cls = getDocumentClass("ChatMessage");
  return cls.create({
    content: `<div class="hellpiercers turn-note"><header>${game.i18n.localize("HELLPIERCERS.TERRAIN.title")}</header><ul><li><i class="fa-solid ${icon}"></i><span>${text}</span></li></ul>${extra.footer ?? ""}</div>`,
    ...extra.data,
  });
}

/** Whether this client should resolve terrain automation. */
function automating() {
  return game.user.isActiveGM && getSetting("automateTerrain");
}

/**
 * A token stepped into a Trapped tile: roll the trap, apply it, reveal the tile. Not Ravaging:
 * the tile becomes Standard. Ravaging: it stays and fires on every entry.
 * @param {foundry.documents.RegionBehavior} behavior
 * @param {object} event
 */
export async function onTrapMoveIn(behavior, event) {
  if (!automating()) return;
  const token = event.data.token;
  const actor = token.actor;
  if (!actor) return;
  const region = behavior.region;
  const roll = await tint(
    new foundry.dice.Roll(behavior.system.formula || "2d6"),
    "damage"
  ).evaluate();
  const damage = new Damage({
    formula: behavior.system.formula || "2d6",
    value: roll.total,
    roll: JSON.stringify(roll.toJSON()),
  });
  const undo = [];
  const group = token.combatant?.group;
  if (group?.type === "swarm") {
    undo.push({ uuid: group.uuid, hp: group.system.health.value });
    await damage.applyGroup(group, [token.uuid]);
  } else {
    const { value, temp } = actor.system.health ?? {};
    undo.push({ uuid: actor.uuid, hp: value, temp });
    await damage.apply(token);
  }
  const text = game.i18n.format(
    behavior.system.ravaging
      ? "HELLPIERCERS.TERRAIN.MSG.ravagingTrap"
      : "HELLPIERCERS.TERRAIN.MSG.trap",
    { name: foundry.utils.escapeHTML(token.name), value: roll.total }
  );
  await note(text, "fa-land-mine-on", {
    footer: `<footer><button type="button" data-action="undoProvoke"><i class="fa-solid fa-rotate-left"></i> ${game.i18n.localize("HELLPIERCERS.TERRAIN.undo")}</button></footer>`,
    data: {
      rolls: [roll],
      speaker: getDocumentClass("ChatMessage").getSpeaker({ token }),
      flags: { [game.system.id]: { turnNote: true, undo } },
    },
  });
  Hooks.callAll("hellpiercers.terrainTriggered", "trapped", token, region);
  if (behavior.system.ravaging) {
    // A sprung Ravaging tile is no longer a secret.
    if (region.visibility !== CONST.REGION_VISIBILITY.ALWAYS) {
      await region.update({ visibility: CONST.REGION_VISIBILITY.ALWAYS });
    }
  } else await region.delete();
}

/**
 * A token stepped into the Void, an Obstacle or Impassable terrain. Advisory: warn, and for the
 * Void offer the instant-death button (p. 100: pushed into the Void is instant death; JEHOEL may
 * treat all three as Uneasy).
 */
export async function onBlockingMoveIn(behavior, event) {
  const token = event.data.token;
  const type = behavior.system.terrain;
  if (wearsJehoel(token.actor)) return;
  if (event.user.isSelf && !BLOCKED_NOTIFIED.has(token.id)) {
    BLOCKED_NOTIFIED.add(token.id);
    setTimeout(() => BLOCKED_NOTIFIED.delete(token.id), 2000);
    ui.notifications?.warn(
      game.i18n.format("HELLPIERCERS.TERRAIN.MSG.blocked", {
        name: token.name,
        terrain: terrainLabel(type),
      })
    );
  }
  if (type !== "void" || !automating()) return;
  const forced =
    event.data.movement?.method === "api" ||
    event.data.movement?.passed?.waypoints?.at(-1)?.action === "displace";
  await note(
    game.i18n.format(
      forced ? "HELLPIERCERS.TERRAIN.MSG.voidForced" : "HELLPIERCERS.TERRAIN.MSG.void",
      {
        name: foundry.utils.escapeHTML(token.name),
      }
    ),
    "fa-skull",
    {
      footer: `<footer><button type="button" data-action="hpVoidDeath" data-token="${token.uuid}"><i class="fa-solid fa-skull"></i> ${game.i18n.localize("HELLPIERCERS.TERRAIN.voidDeath")}</button></footer>`,
      data: { speaker: getDocumentClass("ChatMessage").getSpeaker({ token }) },
    }
  );
  Hooks.callAll("hellpiercers.terrainTriggered", type, token, behavior.region);
}

const BLOCKED_NOTIFIED = new Set();

/**
 * A token stepped onto a Linked tile: offer the hop to any other Linked tile at no cost (p. 120).
 * Runs on the moving user's client.
 */
export async function onLinkedMoveIn(behavior, event) {
  if (!event.user.isSelf || !getSetting("automateTerrain")) return;
  const token = event.data.token;
  const scene = behavior.scene;
  const here = behavior.region;
  const others = terrainRegions(scene, "linked").filter(r => r.id !== here.id);
  if (!others.length) return;
  const options = others
    .map(r => {
      const cell = regionCells(r)[0];
      return { value: r.id, label: `${r.name} (${cell ? `${cell.j}, ${cell.i}` : "?"})` };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const content = `
    <p>${game.i18n.format("HELLPIERCERS.TERRAIN.MSG.linked", { name: foundry.utils.escapeHTML(token.name) })}</p>
    ${options.length > 1 ? `<select name="destination">${options.map(o => `<option value="${o.value}">${foundry.utils.escapeHTML(o.label)}</option>`).join("")}</select>` : ""}`;
  const result = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("HELLPIERCERS.TERRAIN.linked") },
    content,
    yes: {
      label: "HELLPIERCERS.TERRAIN.step",
      callback: (_ev, button) => button.form?.elements.destination?.value ?? options[0].value,
    },
    no: { label: "HELLPIERCERS.TERRAIN.stay" },
  });
  if (!result) return;
  const destination = scene.regions.get(typeof result === "string" ? result : options[0].value);
  if (!destination) return;
  await destination.teleportToken(token, { placement: "center", snap: true });
  Hooks.callAll("hellpiercers.terrainTriggered", "linked", token, here);
}

/**
 * A token entered an Attractor zone, or ended its turn inside one: Pull:1 toward the Attractor
 * (SHARUR's Back Up). Advisory: the GM gets a button.
 */
export async function onAttractor(behavior, event) {
  if (!automating()) return;
  const token = event.data.token;
  const region = behavior.region;
  const tile = attractorTile(region);
  if (!tile) return;
  // Standing on the Attractor tile itself pulls no further.
  const at = cellAt(token.getCenterPoint?.() ?? { x: token.x, y: token.y });
  if (at.i === tile.i && at.j === tile.j) return;
  const entering = event.name === CONST.REGION_EVENTS.TOKEN_MOVE_IN;
  await note(
    game.i18n.format(
      entering
        ? "HELLPIERCERS.TERRAIN.MSG.attractorEnter"
        : "HELLPIERCERS.TERRAIN.MSG.attractorTurn",
      { name: foundry.utils.escapeHTML(token.name) }
    ),
    "fa-magnet",
    {
      footer: `<footer><button type="button" data-action="hpAttractorPull" data-token="${token.uuid}" data-region="${region.uuid}"><i class="fa-solid fa-magnet"></i> ${game.i18n.localize("HELLPIERCERS.TERRAIN.pull")}</button></footer>`,
      data: { speaker: getDocumentClass("ChatMessage").getSpeaker({ token }) },
    }
  );
}

/**
 * Move a token one space toward a point (orthogonally, largest gap first). Forced movement: it
 * uses the API movement method, so it never Provokes.
 * @param {foundry.documents.TokenDocument} token
 * @param {Cell} tile
 */
export async function pullTowards(token, tile) {
  const at = cellAt({ x: token.x, y: token.y });
  const di = Math.sign(tile.i - at.i);
  const dj = Math.sign(tile.j - at.j);
  const step =
    Math.abs(tile.i - at.i) >= Math.abs(tile.j - at.j)
      ? { i: at.i + di, j: at.j }
      : { i: at.i, j: at.j + dj };
  const { x, y } = canvas.grid.getTopLeftPoint(step);
  await token.update({ x, y });
}

/* -------------------------------------------- */
/*  Activation                                  */
/* -------------------------------------------- */

/** Chat buttons on terrain cards (GM only). */
function onRenderChatMessage(_message, html) {
  const death = html.querySelector("[data-action='hpVoidDeath']");
  const pull = html.querySelector("[data-action='hpAttractorPull']");
  if (!death && !pull) return;
  if (!game.user.isGM) {
    death?.remove();
    pull?.remove();
    return;
  }
  death?.addEventListener("click", async () => {
    const token = await fromUuid(death.dataset.token);
    const actor = token?.actor;
    if (!actor) return;
    await actor.update({ "system.health.value": 0 });
    await actor.setDefeated?.(true);
    death.disabled = true;
  });
  pull?.addEventListener("click", async () => {
    const token = await fromUuid(pull.dataset.token);
    const region = await fromUuid(pull.dataset.region);
    if (!token || !region) return;
    const tile = attractorTile(region);
    if (tile) await pullTowards(token, tile);
  });
}

/** Add the Terrain Painter tool to the Regions scene controls. */
function onGetSceneControlButtons(controls) {
  const regions = controls.regions;
  if (!regions || !game.user.isGM) return;
  regions.tools.hellpiercersTerrain = {
    name: "hellpiercersTerrain",
    order: 99,
    title: "HELLPIERCERS.TERRAIN.painter",
    icon: "fa-solid fa-mountain-sun",
    button: true,
    onChange: () => hellpiercers.applications.TerrainPainter.open(),
  };
}

/** Start listening. Call once on `ready`. */
export function activateTerrain() {
  Hooks.on("renderChatMessageHTML", onRenderChatMessage);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtons);
}
