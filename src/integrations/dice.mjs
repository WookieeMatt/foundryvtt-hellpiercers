/**
 * Dice So Nice: themed dice.
 *
 * Rolls that are posted to chat already roll in 3D with no help from the system. This registers a
 * colourset per kind of roll (damage, healing, the Tone Die, RECON, Provoke and one per faction) and
 * lets the system tint a roll before it is evaluated. Dice So Nice reads
 * `die.options.appearance.colorset`, so the formula shown in chat is not affected. If the module
 * is missing, or the "Themed dice" setting is off, tinting does nothing.
 */

import { FACTIONS } from "../stratcom/faction-catalog.mjs";

const PREFIX = "hellpiercers";

/** @type {Record<string, { foreground: string, background: string, outline: string, edge: string, material: string, description: string }>} */
const BASE = {
  damage: {
    description: "Damage",
    foreground: "#fff1e0",
    background: "#8f1d0c",
    outline: "#2a0502",
    edge: "#c43a1d",
    material: "plastic",
  },
  heal: {
    description: "Healing",
    foreground: "#ecffe9",
    background: "#1f6b3a",
    outline: "#072412",
    edge: "#3aa766",
    material: "plastic",
  },
  tone: {
    description: "Tone Die",
    foreground: "#ffd978",
    background: "#15110f",
    outline: "#000000",
    edge: "#5c4a1f",
    material: "metal",
  },
  recon: {
    description: "RECON",
    foreground: "#1d1304",
    background: "#d3a23a",
    outline: "#5a3d08",
    edge: "#f2cf7a",
    material: "metal",
  },
  provoke: {
    description: "Provoke",
    foreground: "#ffe6ee",
    background: "#4b0a1c",
    outline: "#14020a",
    edge: "#a01f45",
    material: "plastic",
  },
  quality: {
    description: "Faction Quality",
    foreground: "#f0ece4",
    background: "#2b2723",
    outline: "#000000",
    edge: "#6b5a4a",
    material: "plastic",
  },
};

/** Faction dice colours: the faction's own hue. */
const FACTION_COLORS = {
  syncrasis: "#8a2b2b",
  henosis: "#7d6a2a",
  autophyes: "#3f6b3a",
  mixis: "#5b3a73",
  metricos: "#a02f57",
  paracletus: "#2f6a73",
  theletus: "#3a5a8a",
  ekklesia: "#6b5a4a",
};

const id = key => `${PREFIX}-${key}`;

/** Whether themed dice are switched on and Dice So Nice is running. */
function enabled() {
  return !!game.dice3d && game.settings.get(game.system.id, "themedDice");
}

/**
 * Tint every die of a roll with a HELLPIERCERS colourset. Call before `evaluate()`.
 * @template {foundry.dice.Roll} T
 * @param {T} roll
 * @param {string} key  damage, heal, tone, recon, provoke, quality or a faction id
 * @returns {T}
 */
export function tint(roll, key) {
  if (!enabled() || !key) return roll;
  for (const die of roll.dice) {
    die.options.appearance = { ...(die.options.appearance ?? {}), colorset: id(key) };
  }
  return roll;
}

/** Register the coloursets. Call once during `init`. */
export function activateDice() {
  Hooks.once("diceSoNiceReady", dice3d => {
    for (const [key, set] of Object.entries(BASE)) {
      dice3d.addColorset(
        {
          name: id(key),
          description: `HELLPIERCERS: ${set.description}`,
          category: "HELLPIERCERS",
          foreground: set.foreground,
          background: set.background,
          outline: set.outline,
          edge: set.edge,
          texture: "none",
          material: set.material,
        },
        "no"
      );
    }
    for (const faction of FACTIONS) {
      const color = FACTION_COLORS[faction.id] ?? "#6b5a4a";
      dice3d.addColorset(
        {
          name: id(faction.id),
          description: `HELLPIERCERS: ${faction.name}`,
          category: "HELLPIERCERS",
          foreground: "#f6f1e8",
          background: color,
          outline: "#0b0807",
          edge: color,
          texture: "none",
          material: "plastic",
        },
        "no"
      );
    }
  });
}
