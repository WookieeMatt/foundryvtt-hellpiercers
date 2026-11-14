/**
 * The STRATCOM campaign map (p. 110): each Demon Warlord has a map segment, and three segments
 * side by side make the campaign map. DIS is at the bottom of every segment and the faction's
 * final redoubt is at the top.
 *
 * The map art is not part of the system (it is the book's artwork). Put one image per faction at
 * `assets/hellpiercers/maps/<faction id>.webp`, for example `syncrasis.webp`. All segments share
 * a 1:1.8 aspect ratio.
 */

import { FACTIONS_BY_ID } from "./faction-catalog.mjs";

export const MAP_DIR = "assets/hellpiercers/maps";
const SEGMENT_WIDTH = 2000;
const SEGMENT_HEIGHT = 3600;

/**
 * Which map images exist in the maps folder.
 * @returns {Promise<Set<string>>} Faction ids that have an image
 */
export async function availableMaps() {
  const FilePicker = foundry.applications.apps.FilePicker.implementation;
  try {
    const result = await FilePicker.browse("data", MAP_DIR);
    return new Set(
      result.files.map(f =>
        f
          .split("/")
          .pop()
          .replace(/\.[a-z]+$/i, "")
          .toLowerCase()
      )
    );
  } catch {
    return new Set();
  }
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
  await scene.createEmbeddedDocuments(
    "Tile",
    defs.map((d, i) => ({
      texture: { src: `${MAP_DIR}/${d.id}.webp` },
      x: i * SEGMENT_WIDTH,
      y: 0,
      width: SEGMENT_WIDTH,
      height: SEGMENT_HEIGHT,
      locked: true,
    }))
  );
  if (activate) await scene.activate();
  return scene;
}
