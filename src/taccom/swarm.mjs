/**
 * Swarm attacks (p. 98-99).
 *
 * A Swarm may attack once for each of its tiles orthogonally adjacent to the target, including the
 * first: at most 4 attacks against a Scale:1 target, 12 against Scale:2. Each attack gains +1 damage
 * for every adjacent Swarm tile at the moment of the strike. Every attack after the first expends
 * one of the adjacent tiles, which lowers the bonus of the attacks that follow.
 */

import { isSwarmUnit } from "../data/combatant-group.mjs";
import { rectsAdjacent } from "./provoke.mjs";

/**
 * @typedef {object} SwarmAttackPlan
 * @property {number} adjacent   Swarm tiles next to the target
 * @property {number} attacks    How many attacks the Swarm makes
 * @property {number[]} bonuses  The damage bonus of each attack, in order
 * @property {number} expended   Tiles the Swarm must expend to make the extra attacks
 * @property {foundry.documents.TokenDocument[]} tiles  The Swarm's tiles next to the target
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
  const tiles = [...group.members]
    .map(c => c.token)
    .filter(t => t && t.id !== target.id && rectsAdjacent(rect(t), targetRect));
  const adjacent = tiles.length;
  if (adjacent === 0) return null;

  const scale = target.actor?.system?.scale ?? 1;
  const cap = scale >= 2 ? 12 : 4;
  const attacks = Math.min(adjacent, cap);
  return {
    adjacent,
    attacks,
    bonuses: Array.from({ length: attacks }, (_, i) => adjacent - i),
    expended: attacks - 1,
    tiles,
  };
}

/**
 * Ask which adjacent tiles a Swarm expends for its extra attacks, then remove them: they leave the
 * Swarm (taking their share of its HP) and their tokens are deleted.
 * @param {SwarmAttackPlan} plan
 * @param {foundry.documents.TokenDocument | undefined} attacker  The tile that made the attack
 * @returns {Promise<number>} How many tiles were expended
 */
export async function expendTiles(plan, attacker) {
  const candidates = plan.tiles.filter(t => t.id !== attacker?.id);
  if (plan.expended <= 0 || !candidates.length) return 0;
  if (!candidates.every(t => t.canUserModify(game.user, "delete"))) return 0;
  const { sizeX, sizeY } = canvas.grid;
  const esc = foundry.utils.escapeHTML;
  const rows = candidates
    .map(
      (t, i) =>
        `<label class="checkbox" data-token-id="${t.id}"><input type="checkbox" name="expend" value="${t.id}"${i < plan.expended ? " checked" : ""}> ${esc(t.name)} (${Math.round(t.x / sizeX)}, ${Math.round(t.y / sizeY)})</label>`
    )
    .join("");
  const picked = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Expend Swarm Tiles", icon: "fa-solid fa-people-group" },
    content: `<p>The Swarm makes ${plan.attacks} attacks and must expend <strong>${plan.expended}</strong> of the ${candidates.length} other adjacent tiles. Hover a row to find the tile.</p><div class="swarm-expend" style="display:grid;gap:4px">${rows}</div>`,
    render: (_event, dialog) => {
      for (const row of dialog.element.querySelectorAll("[data-token-id]")) {
        const token = () => canvas.tokens.get(row.dataset.tokenId);
        row.addEventListener("mouseenter", ev => token()?._onHoverIn(ev, { hoverOutOthers: true }));
        row.addEventListener("mouseleave", ev => token()?._onHoverOut(ev));
      }
    },
    ok: {
      label: "Expend",
      callback: (_event, button) =>
        [...button.form.querySelectorAll("input[name=expend]:checked")].map(i => i.value),
    },
    rejectClose: false,
  });
  if (!picked?.length) return 0;
  const tokens = picked.map(id => canvas.tokens.get(id)).filter(Boolean);
  const group = attacker?.combatant?.group;
  if (group?.type === "swarm") await group.system.removeMembers(tokens);
  await tokens[0].document.parent.deleteEmbeddedDocuments(
    "Token",
    tokens.map(t => t.id)
  );
  return tokens.length;
}

/**
 * Join a unit to the Swarm made of adjacent units of the same name (p. 98): units next to each
 * other combine, adjacent Swarms merge, and a lone pair starts a new Swarm. Spending the action is
 * left to the table.
 * @param {foundry.documents.TokenDocument} token
 * @returns {Promise<foundry.documents.CombatantGroup | null>}
 */
export async function joinSwarm(token) {
  const actor = token?.actor;
  const combat = token?.combatant?.combat;
  if (!isSwarmUnit(actor) || !combat) {
    ui.notifications.warn("Only Swarm units in combat can join a Swarm.");
    return null;
  }
  const { sizeX, sizeY } = canvas.grid;
  const rect = t => ({ x: t.x / sizeX, y: t.y / sizeY, w: t.width ?? 1, h: t.height ?? 1 });
  const neighbours = token.parent.tokens.filter(
    t =>
      t.id !== token.id &&
      t.combatant?.combat === combat &&
      !t.combatant.isDefeated &&
      isSwarmUnit(t.actor) &&
      t.actorId === token.actorId &&
      rectsAdjacent(rect(token), rect(t))
  );
  if (!neighbours.length) {
    ui.notifications.warn(
      `${token.name} has no adjacent ${token.baseActor?.name ?? actor.name} to join.`
    );
    return null;
  }
  const own = token.combatant.group?.type === "swarm" ? token.combatant.group : null;
  const others = neighbours.map(t => t.combatant.group).filter(g => g?.type === "swarm");
  let group = own ?? others[0];
  if (!group) {
    group = await getDocumentClass("CombatantGroup").create({ type: "swarm" }, { parent: combat });
  }
  for (const other of new Set(others)) {
    if (other.id !== group.id && combat.groups.has(other.id)) await group.system.merge(other);
  }
  const loose = [token, ...neighbours].filter(t => t.combatant.group?.id !== group.id);
  await group.system.addMembers(loose.map(t => t.object).filter(Boolean));
  return group;
}
