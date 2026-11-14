/**
 * Provoke (p. 100): when adjacent units move away from one another, the mover suffers a 1D6 attack
 * before it leaves. Swarms only Provoke when their last square moves away.
 *
 * This watches Foundry v14's `moveToken` hook, which reports the whole path of a movement, so
 * breaking adjacency partway along a long move is caught too. Only the active GM resolves it.
 * Forced movement (macros, Push, Pull) uses the "api" movement method and never Provokes, and
 * flying units (Aegis) don't Provoke.
 */

import { Damage } from "../data/damage.mjs";
import { getSetting } from "../settings.mjs";

const EPS = 1e-3;
const MANUAL_METHODS = new Set(["dragging", "keyboard", "hud", "config"]);

/** @typedef {{ x: number, y: number, w: number, h: number }} CellRect */

/** A token or waypoint rectangle in grid cells. */
function cells(thing) {
  const { sizeX, sizeY } = canvas.grid;
  return { x: thing.x / sizeX, y: thing.y / sizeY, w: thing.width ?? 1, h: thing.height ?? 1 };
}

/**
 * Whether two rectangles share an edge (diagonal contact is not adjacent).
 * @param {CellRect} a
 * @param {CellRect} b
 */
export function rectsAdjacent(a, b) {
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0);
  const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
  if (gapX > EPS || gapY > EPS) return false;
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return overlapX > EPS || overlapY > EPS;
}

const isHostile = d => d === CONST.TOKEN_DISPOSITIONS.HOSTILE;
const isFriendly = d => d === CONST.TOKEN_DISPOSITIONS.FRIENDLY;

/** Whether two dispositions are enemies of one another. */
function areEnemies(a, b) {
  return (isHostile(a) && isFriendly(b)) || (isFriendly(a) && isHostile(b));
}

/** The unit a token belongs to: its swarm, or itself. */
function unitKey(token) {
  const group = token.combatant?.group;
  return group?.type === "swarm" ? `group:${group.id}` : `token:${token.id}`;
}

/** @param {foundry.documents.TokenDocument} token */
function isDefeated(token) {
  return (
    token.combatant?.isDefeated || token.actor?.statuses.has(CONFIG.specialStatusEffects.DEFEATED)
  );
}

/**
 * Work out which enemy units are provoked by a movement.
 * @param {foundry.documents.TokenDocument} mover
 * @param {CellRect[]} path   Positions along the movement, in order
 * @returns {foundry.documents.TokenDocument[]} One token per provoked unit
 */
export function findProvokers(mover, path) {
  const enemies = mover.parent.tokens.filter(
    t =>
      t.id !== mover.id && t.actor && !isDefeated(t) && areEnemies(mover.disposition, t.disposition)
  );
  /** @type {Map<string, foundry.documents.TokenDocument>} */
  const provoked = new Map();
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    for (const enemy of enemies) {
      const key = unitKey(enemy);
      if (provoked.has(key)) continue;
      const rect = cells(enemy);
      if (!rectsAdjacent(from, rect) || rectsAdjacent(to, rect)) continue;
      // A swarm only Provokes once none of its squares is still next to the mover.
      const members = enemies.filter(t => unitKey(t) === key);
      if (members.some(m => rectsAdjacent(to, cells(m)))) continue;
      provoked.set(key, enemy);
    }
  }
  return [...provoked.values()];
}

/**
 * Apply a Damage to a token, treating swarm members as the swarm.
 * @param {Damage} damage
 * @param {foundry.documents.TokenDocument} token
 */
async function strike(damage, token) {
  const group = token.combatant?.group;
  if (group?.type === "swarm") return damage.applyGroup(group, [token.uuid]);
  return damage.apply(token);
}

async function rollD6(source) {
  const roll = await new foundry.dice.Roll("1d6").evaluate();
  const damage = new Damage({
    formula: "1d6",
    value: roll.total,
    roll: JSON.stringify(roll.toJSON()),
    source: source?.uuid ?? null,
  });
  return { roll, damage };
}

/** @param {foundry.documents.TokenDocument} doc @param {object} movement */
async function onMoveToken(doc, movement) {
  if (!game.user.isActiveGM || !getSetting("automateProvoke")) return;
  if (!MANUAL_METHODS.has(movement.method)) return;
  if (!canvas.ready || canvas.scene?.id !== doc.parent?.id || !canvas.grid.isSquare) return;
  const combatant = doc.combatant;
  if (!combatant?.combat?.started || combatant.isDefeated) return;
  const actor = doc.actor;
  if (!actor || actor.getStatusStacks("aegis") > 0 || actor.getFlag(game.system.id, "noProvoke"))
    return;

  // Positions along this movement, without repeating a position.
  const waypoints = [movement.origin, ...(movement.passed?.waypoints ?? []), movement.destination];
  /** @type {CellRect[]} */
  const path = [];
  for (const wp of waypoints) {
    if (!wp) continue;
    const rect = cells({ ...wp, width: wp.width ?? doc.width, height: wp.height ?? doc.height });
    const last = path.at(-1);
    if (last && Math.abs(last.x - rect.x) < EPS && Math.abs(last.y - rect.y) < EPS) continue;
    path.push(rect);
  }
  if (path.length < 2) return;

  const provokers = findProvokers(doc, path);
  if (!provokers.length) return;

  // Offhand Pistol (KOPIS): each enemy you Provoke is shot for 1D6 as well.
  const offhand = actor.items.some(i => i.type === "ability" && /offhand pistol/i.test(i.name));
  const lines = [];
  for (const enemy of provokers) {
    const { roll, damage } = await rollD6(enemy.actor);
    await strike(damage, doc);
    lines.push(
      `<li><i class="fa-solid fa-crosshairs"></i><span>${game.i18n.format(
        "HELLPIERCERS.TACCOM.provoke",
        {
          name: foundry.utils.escapeHTML(enemy.name),
          target: foundry.utils.escapeHTML(doc.name),
          value: roll.total,
        }
      )}</span></li>`
    );
    if (offhand) {
      const { roll: shot, damage: pistol } = await rollD6(actor);
      await strike(pistol, enemy);
      lines.push(
        `<li><i class="fa-solid fa-gun"></i><span>${foundry.utils.escapeHTML(doc.name)} fires back at ${foundry.utils.escapeHTML(enemy.name)}: 1D6 = ${shot.total}${shot.total >= 4 ? " (Push:1)" : ""}.</span></li>`
      );
    }
  }
  const ChatMessage = getDocumentClass("ChatMessage");
  await ChatMessage.create({
    content: `<div class="hellpiercers turn-note"><header>Provoke</header><ul>${lines.join("")}</ul></div>`,
    speaker: ChatMessage.getSpeaker({ token: doc }),
    flags: { [game.system.id]: { turnNote: true, provoke: true } },
  });
  Hooks.callAll("hellpiercers.provoke", doc, provokers);
}

/** Start watching movement. Call once on `ready`. */
export function activateProvoke() {
  Hooks.on("moveToken", onMoveToken);
}
