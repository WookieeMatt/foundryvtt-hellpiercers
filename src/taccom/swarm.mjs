/**
 * Swarm attacks (p. 98-99).
 *
 * A Swarm may attack once for each of its tiles orthogonally adjacent to the target, including the
 * first: at most 4 attacks against a Scale:1 target, 12 against Scale:2. Each attack gains +1 damage
 * for every adjacent Swarm tile at the moment of the strike. Every attack after the first expends
 * one of the adjacent tiles, which lowers the bonus of the attacks that follow.
 */

import { rectsAdjacent } from "./provoke.mjs";

/**
 * @typedef {object} SwarmAttackPlan
 * @property {number} adjacent   Swarm tiles next to the target
 * @property {number} attacks    How many attacks the Swarm makes
 * @property {number[]} bonuses  The damage bonus of each attack, in order
 * @property {number} expended   Tiles the Swarm must expend to make the extra attacks
 */

/**
 * Work out a Swarm's attacks against a target.
 * @param {foundry.documents.Actor} attacker  A minion that belongs to a Swarm
 * @param {foundry.documents.TokenDocument} target
 * @returns {SwarmAttackPlan | null} null if the attacker is not in a Swarm or has no tile next to the target
 */
export function swarmAttackPlan(attacker, target) {
  if (!target || !canvas.ready || !canvas.grid.isSquare) return null;
  const token = attacker?.token ?? attacker?.getActiveTokens(true, true)[0];
  const group = token?.combatant?.group;
  if (group?.type !== "swarm") return null;

  const { sizeX, sizeY } = canvas.grid;
  const rect = t => ({ x: t.x / sizeX, y: t.y / sizeY, w: t.width ?? 1, h: t.height ?? 1 });
  const targetRect = rect(target);
  const adjacent = [...group.members].filter(c => {
    const t = c.token;
    return t && t.id !== target.id && rectsAdjacent(rect(t), targetRect);
  }).length;
  if (adjacent === 0) return null;

  const scale = target.actor?.system?.scale ?? 1;
  const cap = scale >= 2 ? 12 : 4;
  const attacks = Math.min(adjacent, cap);
  return {
    adjacent,
    attacks,
    bonuses: Array.from({ length: attacks }, (_, i) => adjacent - i),
    expended: attacks - 1,
  };
}
