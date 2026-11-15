/**
 * The STRATCOM campaign map (p. 110): each Demon Warlord has a map segment, and three segments
 * side by side make the campaign map. DIS is at the bottom of every segment and the faction's
 * final redoubt is at the top.
 *
 * The seven map segments ship with the system under `systems/hellpiercers/assets/maps/` (the repo
 * is private, so the book's art may be included). A world can override a segment by putting its own
 * `assets/hellpiercers/maps/<faction id>.webp` in the user data folder. All segments share a 1:1.8
 * aspect ratio.
 */

import { FACTIONS_BY_ID } from "./faction-catalog.mjs";
import { syncWarTable } from "./war-table.mjs";

export const MAP_DIR = "assets/hellpiercers/maps";
export const SYSTEM_MAP_DIR = "systems/hellpiercers/assets/maps";
export const SEGMENT_WIDTH = 2000;
export const SEGMENT_HEIGHT = 3600;

/**
 * Which map images exist: faction id -> image path. World images in `assets/hellpiercers/maps`
 * win over the ones the system ships.
 * @returns {Promise<Map<string, string>>}
 */
export async function availableMaps() {
  const FilePicker = foundry.applications.apps.FilePicker.implementation;
  const found = new Map();
  for (const dir of [SYSTEM_MAP_DIR, MAP_DIR]) {
    try {
      const result = await FilePicker.browse("data", dir);
      for (const f of result.files) {
        const id = f
          .split("/")
          .pop()
          .replace(/\.[a-z]+$/i, "")
          .toLowerCase();
        found.set(id, f);
      }
    } catch {
      // Directory does not exist: fine.
    }
  }
  return found;
}

/**
 * Create a campaign map scene from up to three faction map segments, placed side by side. The
 * scene is gridless: it is a picture of the war, not a battlemap.
 * @param {string[]} factionIds  One to three catalog ids, left to right
 * @param {object} [options]
 * @param {string} [options.name]
 * @param {boolean} [options.activate=false]
 * @returns {Promise<foundry.documents.Scene | null>}
 */
export async function createCampaignMap(factionIds, { name, activate = false } = {}) {
  const defs = factionIds.map(id => FACTIONS_BY_ID[id]).filter(f => f?.map);
  if (!defs.length || defs.length > 3) {
    ui.notifications.warn("Choose one to three factions that have a map.");
    return null;
  }
  const available = await availableMaps();
  const missing = defs.filter(d => !available.has(d.id));
  if (missing.length) {
    ui.notifications.warn(
      `Missing map image${missing.length > 1 ? "s" : ""}: ${missing.map(m => `${MAP_DIR}/${m.id}.webp`).join(", ")}`
    );
    return null;
  }
  const sources = new Map(defs.map(d => [d.id, available.get(d.id)]));

  const Scene = getDocumentClass("Scene");
  const scene = await Scene.create({
    name: name || `Campaign Map: ${defs.map(d => d.name).join(", ")}`,
    width: SEGMENT_WIDTH * defs.length,
    height: SEGMENT_HEIGHT,
    padding: 0,
    grid: { type: CONST.GRID_TYPES.GRIDLESS, size: 100, distance: 1 },
    tokenVision: false,
    fog: { exploration: false },
    flags: { [game.system.id]: { campaignMap: defs.map(d => d.id) } },
  });
  // Foundry v14 anchors tiles at their centre (texture.anchorX/Y default 0.5).
  await scene.createEmbeddedDocuments(
    "Tile",
    defs.map((d, i) => ({
      texture: { src: sources.get(d.id) },
      x: i * SEGMENT_WIDTH + SEGMENT_WIDTH / 2,
      y: SEGMENT_HEIGHT / 2,
      width: SEGMENT_WIDTH,
      height: SEGMENT_HEIGHT,
      locked: true,
    }))
  );
  await syncWarTable(scene);
  if (activate) await scene.activate();
  return scene;
}
