/**
 * Each faction's STRATCOM Actions (pp. 143-220), extracted from the Core Rules by
 * scripts/data/parse_actions.py. Ekklesia prints none.
 *
 * @typedef {object} FactionAction
 * @property {string} name
 * @property {number | null} crown     Crown gate: usable once the faction's Crown has fallen to this value
 * @property {string} flavor
 * @property {string[]} body           Rules paragraphs (HTML)
 * @property {Array<{ name: string, flavor: string, body: string[] }>} subs
 */

import data from "./data/faction-actions.json";

/** @type {Record<string, { actions: FactionAction[], mechanics: FactionAction[] }>} */
export const FACTION_ACTIONS = data;

/** The book names a hazard in its rules text rather than its heading in these cases. */
const HAZARD_NAMES = { "Scour of Babel": "Eyerot" };

const STAGE = /^<strong>Stage\s*(\d+)/;
const plain = html =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The staged map hazard an action creates, if it has one (Syncrasis' Devolve, Paracletus' Eyerot).
 * @param {FactionAction} action
 * @returns {{ name: string, intro: string, stages: string[], auto: boolean } | null}
 */
export function hazardOf(action) {
  const sections = [{ name: action.name, body: action.body }, ...action.subs];
  for (const section of sections) {
    const stages = section.body.filter(p => STAGE.test(p));
    if (!stages.length) continue;
    const intro = section.body.filter(p => !STAGE.test(p)).join(" ");
    const name =
      HAZARD_NAMES[action.name] ?? (section.name ?? action.name).replace(/\s*Map Hazard\s*$/i, "");
    return {
      name,
      intro,
      stages,
      // "For each STRATCOM turn this hazard is present, advance along the track"
      auto: /for each stratcom turn/i.test(plain(intro)),
    };
  }
  return null;
}

/**
 * Look an action up by name for a faction.
 * @param {string} factionKey
 * @param {string} name
 */
export function findAction(factionKey, name) {
  const f = FACTION_ACTIONS[factionKey];
  return [...(f?.actions ?? []), ...(f?.mechanics ?? [])].find(a => a.name === name) ?? null;
}
