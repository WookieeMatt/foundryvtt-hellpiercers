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
import { tint } from "../integrations/dice.mjs";
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

/** Whether two rectangles overlap (share at least part of a cell). */
function rectsOverlap(a, b) {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox > EPS && oy > EPS;
}

/**
 * Whether `a` is within `range` spaces of `b` (range 1 = adjacent). A larger range grows `b` by
 * range - 1 spaces on every side, then tests adjacency.
 */
export function rectsInRange(a, b, range = 1) {
  const grow = Math.max(0, range - 1);
  const grown = { x: b.x - grow, y: b.y - grow, w: b.w + 2 * grow, h: b.h + 2 * grow };
  return rectsAdjacent(a, grown);
}

/** Units a token has moved through this turn (MURIEL's Nous-Agnostic Deployment), by token id. */
const passedThrough = new Map();

/** Keys of the enemy units whose spaces the mover crossed during one movement. */
function crossedUnits(enemies, path) {
  const crossed = new Set();
  const size = { w: path[0].w, h: path[0].h };
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) * 4));
    for (let n = 0; n <= steps; n++) {
      const at = {
        x: from.x + ((to.x - from.x) * n) / steps,
        y: from.y + ((to.y - from.y) * n) / steps,
        ...size,
      };
      for (const enemy of enemies) if (rectsOverlap(at, cells(enemy))) crossed.add(unitKey(enemy));
    }
  }
  return crossed;
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
      // Expanded Aggression Rituals: an enemy with Aggression Provokes out to Range:2.
      const range = enemy.actor?.statuses.has("aggression") ? 2 : 1;
      if (!rectsInRange(from, rect, range) || rectsInRange(to, rect, range)) continue;
      // A swarm only Provokes once none of its squares is still next to the mover.
      const members = enemies.filter(t => unitKey(t) === key);
      if (members.some(m => rectsInRange(to, cells(m), range))) continue;
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
async function strike(damage, token, undo = []) {
  const group = token.combatant?.group;
  if (group?.type === "swarm") {
    undo.push({ uuid: group.uuid, hp: group.system.health.value });
    return damage.applyGroup(group, [token.uuid]);
  }
  const { value, temp } = token.actor.system.health;
  undo.push({ uuid: token.actor.uuid, hp: value, temp });
  return damage.apply(token);
}

/** Rolls made while resolving a Provoke, attached to its chat card so they roll in 3D. */
let provokeRolls = [];

async function rollD6(source) {
  const roll = await tint(new foundry.dice.Roll("1d6"), "provoke").evaluate();
  provokeRolls.push(roll);
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

  let provokers = findProvokers(doc, path);

  // MURIEL (Nous-Agnostic Deployment): no Provoke from enemies moved through this turn.
  if (actor.items.some(i => i.type === "ability" && /nous.agnostic/i.test(i.name))) {
    const enemies = doc.parent.tokens.filter(
      t => t.id !== doc.id && t.actor && areEnemies(doc.disposition, t.disposition)
    );
    const seen = passedThrough.get(doc.id) ?? new Set();
    for (const key of crossedUnits(enemies, path)) seen.add(key);
    passedThrough.set(doc.id, seen);
    provokers = provokers.filter(t => !seen.has(unitKey(t)));
  }
  if (!provokers.length) return;

  // Offhand Pistol (KOPIS): each enemy you Provoke is shot for 1D6 as well.
  const offhand = actor.items.some(i => i.type === "ability" && /offhand pistol/i.test(i.name));
  const lines = [];
  const undo = [];
  provokeRolls = [];
  for (const enemy of provokers) {
    const { roll, damage } = await rollD6(enemy.actor);
    await strike(damage, doc, undo);
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
      await strike(pistol, enemy, undo);
      lines.push(
        `<li><i class="fa-solid fa-gun"></i><span>${foundry.utils.escapeHTML(doc.name)} fires back at ${foundry.utils.escapeHTML(enemy.name)}: 1D6 = ${shot.total}${shot.total >= 4 ? " (Push:1)" : ""}.</span></li>`
      );
    }
  }
  const ChatMessage = getDocumentClass("ChatMessage");
  await ChatMessage.create({
    content: `<div class="hellpiercers turn-note"><header>Provoke</header><ul>${lines.join("")}</ul><footer><button type="button" data-action="undoProvoke"><i class="fa-solid fa-rotate-left"></i> ${game.i18n.localize("HELLPIERCERS.TACCOM.undoProvoke")}</button></footer></div>`,
    speaker: ChatMessage.getSpeaker({ token: doc }),
    rolls: provokeRolls,
    flags: { [game.system.id]: { turnNote: true, provoke: true, undo } },
  });
  Hooks.callAll("hellpiercers.provoke", doc, provokers);
}

/**
 * Take back a Provoke (JEHOEL's Quark-Gluon-Celestium Form, terrain effects and so on): restores
 * the HP of everything the Provoke card damaged.
 * @param {foundry.documents.ChatMessage} message
 */
export async function undoProvoke(message) {
  const entries = message.getFlag(game.system.id, "undo") ?? [];
  for (const entry of entries) {
    const doc = await fromUuid(entry.uuid);
    if (!doc) continue;
    if (doc.documentName === "Actor") {
      await doc.update({ "system.health.value": entry.hp, "system.health.temp": entry.temp ?? 0 });
      if (entry.hp > 0) await doc.setDefeated?.(false);
    } else {
      await doc.update({ "system.health.value": entry.hp });
    }
  }
  await message.update({
    content: message.content.replace(
      /<footer>.*<\/footer>/s,
      "<footer><em>Provoke undone.</em></footer>"
    ),
    [`flags.${game.system.id}.undo`]: [],
  });
}

/** Add the Undo button handler to Provoke cards (GM only). */
function onRenderChatMessage(message, html) {
  const button = html.querySelector("[data-action='undoProvoke']");
  if (!button) return;
  if (!game.user.isGM) return button.remove();
  button.addEventListener("click", () => undoProvoke(message));
}

/** Start watching movement. Call once on `ready`. */
export function activateProvoke() {
  Hooks.on("moveToken", onMoveToken);
  Hooks.on("renderChatMessageHTML", onRenderChatMessage);
  Hooks.on("hellpiercers.turnStart", combatant => passedThrough.delete(combatant.tokenId));
}
