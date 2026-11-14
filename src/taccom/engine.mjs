/**
 * The TACCOM turn engine.
 *
 * Resolves everything the rules say happens automatically at the edges of a unit's activation:
 *  - Start of turn: actions refresh, Blazing burns and spreads, Fortified restores Reversal charges.
 *  - End of turn: Poison, Healing and Pain Aura resolve, then Effects decay.
 *  - End of round: Countdown and Brand tick down (and fire), spawners gain a Charge.
 *
 * These functions are driven by {@link HellpiercersCombat#_manageTurnEvents} and only ever run on
 * the active GM's client. They are also exported on `game.system.api.taccom` so macros can run them.
 */

import { gapDistance, getAdjacentTokens, hasSquareGrid } from "../canvas/adjacency.mjs";
import { getSetting } from "../settings.mjs";

const t = (key, data) => game.i18n.format(`HELLPIERCERS.TACCOM.${key}`, data);

/**
 * @typedef {object} TurnUnit
 * @property {foundry.documents.Combatant} combatant
 * @property {foundry.documents.CombatantGroup | null} group  The swarm this combatant belongs to
 * @property {foundry.documents.Combatant[]} combatants       Every combatant that acts as this unit
 * @property {foundry.documents.Actor[]} actors
 * @property {foundry.documents.Actor | null} actor            The representative actor
 * @property {string} name
 */

/** @typedef {{ icon: string, text: string }} NoteLine */

/**
 * Describe a combatant as a unit. A swarm acts as a single unit made of many tokens.
 * @param {foundry.documents.Combatant} combatant
 * @returns {TurnUnit}
 */
export function getUnit(combatant) {
  const group = combatant.group?.type === "swarm" ? combatant.group : null;
  const combatants = group ? [...group.members] : [combatant];
  const actors = combatants.map(c => c.actor).filter(Boolean);
  return {
    combatant,
    group,
    combatants,
    actors,
    actor: actors[0] ?? null,
    name: (group ? group.name : "") || combatant.name || actors[0]?.name || "?",
  };
}

/** @param {TurnUnit} unit @returns {foundry.canvas.placeables.Token[]} */
function unitTokens(unit) {
  return unit.combatants.map(c => c.token?.object).filter(Boolean);
}

/** Tokens orthogonally adjacent to any token of the unit, excluding the unit's own tokens. */
function adjacentTokens(unit) {
  const own = new Set(unitTokens(unit));
  const seen = new Set();
  for (const token of own) {
    for (const other of getAdjacentTokens(token)) if (!own.has(other)) seen.add(other);
  }
  return [...seen];
}

/** @param {TurnUnit} unit @param {string} statusId */
function stacks(unit, statusId) {
  return unit.actor?.getStatusStacks(statusId) ?? 0;
}

/** Apply a status to every actor that makes up the unit. */
async function applyStatus(unit, statusId, count = 1) {
  await Promise.all(unit.actors.map(a => a.applyStatus(statusId, count)));
}

/** Remove stacks of a status from every actor that makes up the unit. */
async function removeStatus(unit, statusId, count = 1) {
  await Promise.all(unit.actors.map(a => a.removeStatus(statusId, count)));
}

/**
 * Damage a unit. Swarms take the damage once, from the swarm's shared HP pool.
 * @param {TurnUnit} unit
 * @param {number} amount
 */
async function damageUnit(unit, amount) {
  if (!(amount > 0)) return null;
  if (unit.group) {
    const hp = unit.group.system.health.value;
    await unit.group.update({ "system.health.value": Math.max(0, hp - amount) });
    return { dealt: amount };
  }
  return unit.actor?.takeDamage(amount) ?? null;
}

/** @param {TurnUnit} unit @param {number} amount */
async function healUnit(unit, amount) {
  if (!(amount > 0)) return 0;
  if (unit.group) {
    const { value, max } = unit.group.system.health;
    const next = Math.min(max, value + amount);
    if (next > value) await unit.group.update({ "system.health.value": next });
    return Math.max(0, next - value);
  }
  return unit.actor?.heal(amount) ?? 0;
}

/**
 * Post a compact summary of automatic effects to chat.
 * @param {TurnUnit} unit
 * @param {string} headerKey
 * @param {NoteLine[]} lines
 */
async function post(unit, headerKey, lines) {
  if (!lines.length) return null;
  const items = lines
    .map(l => `<li><i class="fa-solid ${l.icon}"></i><span>${l.text}</span></li>`)
    .join("");
  const content = `<div class="hellpiercers turn-note"><header>${t(headerKey, {
    name: foundry.utils.escapeHTML(unit.name),
  })}</header><ul>${items}</ul></div>`;
  return getDocumentClass("ChatMessage").create({
    content,
    speaker: getDocumentClass("ChatMessage").getSpeaker({ actor: unit.actor }),
    flags: { [game.system.id]: { turnNote: true } },
  });
}

const esc = name => foundry.utils.escapeHTML(name);

/**
 * How many Pain Aura fields cover the unit. A Pain Aura is a Scale:2 field: the nine squares
 * around the unit that projects it.
 * @param {TurnUnit} unit
 */
function painAuraCount(unit) {
  if (!hasSquareGrid()) return 0;
  const own = unitTokens(unit);
  if (!own.length) return 0;
  let count = 0;
  for (const token of canvas.tokens.placeables) {
    const actor = token.actor;
    if (!actor || (actor.getStatusStacks("pain_aura") ?? 0) <= 0) continue;
    const covered = own.some(o => o === token || gapDistance(o, token) === 0);
    if (covered) count++;
  }
  return count;
}

/* -------------------------------------------- */
/*  Turn start                                  */
/* -------------------------------------------- */

/**
 * Resolve everything that happens at the start of a unit's activation.
 * @param {foundry.documents.Combatant} combatant
 * @returns {Promise<NoteLine[]>}
 */
export async function startTurn(combatant) {
  const unit = getUnit(combatant);
  /** @type {NoteLine[]} */
  const lines = [];

  for (const c of unit.combatants) await c.system.resetActions();

  if (getSetting("automateEffects") && unit.actor) {
    // Blazing: burns at the start of every turn and spreads to units beginning a turn next to it.
    let burning = stacks(unit, "blazing") > 0;
    if (!burning) {
      const spreads = adjacentTokens(unit).some(
        tok => (tok.actor?.getStatusStacks("blazing") ?? 0) > 0
      );
      if (spreads) {
        await applyStatus(unit, "blazing", 1);
        burning = true;
        lines.push({ icon: "fa-fire", text: t("blazingSpread", { name: esc(unit.name) }) });
      }
    }
    if (burning) {
      await damageUnit(unit, 1);
      lines.push({ icon: "fa-fire", text: t("blazing", { name: esc(unit.name), value: 1 }) });
    }

    // Fortified: restore Reversal charges and consume the effect.
    if (stacks(unit, "fortified") > 0 && unit.actor.type === "human") {
      const reversal = unit.actor.system.reversal_charges;
      const next = Math.min(reversal.max ?? reversal.value + 2, reversal.value + 2);
      if (next > reversal.value) {
        await unit.actor.update({ "system.reversal_charges.value": next });
      }
      await removeStatus(unit, "fortified", 1);
    }
  }

  await post(unit, "turnStart", lines);
  Hooks.callAll("hellpiercers.turnStart", combatant, unit, lines);
  return lines;
}

/* -------------------------------------------- */
/*  Turn end                                    */
/* -------------------------------------------- */

/**
 * Resolve everything that happens at the end of a unit's activation.
 * @param {foundry.documents.Combatant} combatant
 * @returns {Promise<NoteLine[]>}
 */
export async function endTurn(combatant) {
  const unit = getUnit(combatant);
  /** @type {NoteLine[]} */
  const lines = [];
  if (!getSetting("automateEffects") || !unit.actor) return lines;

  // Poison: 1 damage per stack, then lose a stack.
  const poison = stacks(unit, "poison");
  if (poison > 0) {
    await damageUnit(unit, poison);
    await removeStatus(unit, "poison", 1);
    lines.push({
      icon: "fa-skull-crossbones",
      text: t("poison", { name: esc(unit.name), value: poison }),
    });
  }

  // Healing: restore HP equal to the stacks, which then decay with the other turn effects.
  const healing = stacks(unit, "healing");
  if (healing > 0) {
    const healed = await healUnit(unit, healing);
    if (healed > 0)
      lines.push({ icon: "fa-heart", text: t("healing", { name: esc(unit.name), value: healed }) });
  }

  // Pain Aura: every aura covering the unit hurts it once at the end of its turn.
  const aura = painAuraCount(unit);
  if (aura > 0) {
    await damageUnit(unit, aura);
    lines.push({ icon: "fa-bolt", text: t("painAura", { name: esc(unit.name), value: aura }) });
  }

  // Blazing only burns out while the unit has no neighbours to feed on.
  if (stacks(unit, "blazing") > 0 && adjacentTokens(unit).length === 0) {
    await removeStatus(unit, "blazing", 1);
  }

  // Everything else that decays at the end of the turn.
  await Promise.all(unit.actors.map(a => a.decayEffects("turn")));

  await post(unit, "turnEnd", lines);
  Hooks.callAll("hellpiercers.turnEnd", combatant, unit, lines);
  return lines;
}

/* -------------------------------------------- */
/*  Rounds                                      */
/* -------------------------------------------- */

/**
 * Resolve the start of a round.
 * @param {foundry.documents.Combat} combat
 */
export async function startRound(combat) {
  const updates = combat.combatants.map(c => ({
    _id: c.id,
    "system.actions": { main: false, support: false, aux: false, move: false },
  }));
  if (updates.length) await combat.updateEmbeddedDocuments("Combatant", updates);
  Hooks.callAll("hellpiercers.roundStart", combat);
}

/**
 * Resolve the end of a round: round-based decay, Countdown and Brand expiry, spawner charges.
 * @param {foundry.documents.Combat} combat
 * @param {number} [round]  The round that just ended. Defaults to the combat's current round.
 * @returns {Promise<NoteLine[]>}
 */
export async function endRound(combat, round = combat.round) {
  /** @type {NoteLine[]} */
  const lines = [];
  const automate = getSetting("automateEffects");

  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;

    // Find expiring Countdown and Brand effects before they decay.
    const expiring = [];
    if (automate) {
      for (const effect of actor.effects) {
        if (effect.system.decay !== "round" || effect.system.stacks == null) continue;
        if (effect.system.stacks > 1) continue;
        for (const status of effect.statuses)
          if (["countdown", "brand"].includes(status)) expiring.push(status);
      }
    }

    await actor.decayEffects("round");

    for (const status of expiring) {
      if (status === "brand") await detonateBrand(combatant, lines);
      else {
        lines.push({
          icon: "fa-hourglass-end",
          text: t("countdown", { name: esc(combatant.name) }),
        });
        Hooks.callAll("hellpiercers.countdownExpired", combatant, actor);
      }
    }

    // Spawning: gains a Charge at the end of every round.
    if (automate && actor.type === "spawner") {
      await actor.update({ "system.spawn.charge": (actor.system.spawn.charge ?? 0) + 1 });
    }
  }

  if (lines.length) {
    const ChatMessage = getDocumentClass("ChatMessage");
    const items = lines
      .map(l => `<li><i class="fa-solid ${l.icon}"></i><span>${l.text}</span></li>`)
      .join("");
    await ChatMessage.create({
      content: `<div class="hellpiercers turn-note"><header>${t("roundEnd", { round })}</header><ul>${items}</ul></div>`,
      flags: { [game.system.id]: { turnNote: true } },
    });
  }
  Hooks.callAll("hellpiercers.roundEnd", combat, lines);
  return lines;
}

/**
 * A Brand reaching 0 detonates: 4D6 damage to the target and 6 damage to every adjacent target.
 * @param {foundry.documents.Combatant} combatant
 * @param {NoteLine[]} lines
 */
async function detonateBrand(combatant, lines) {
  const actor = combatant.actor;
  const roll = await new foundry.dice.Roll("4d6").evaluate();
  await actor.takeDamage(roll.total);
  lines.push({
    icon: "fa-burst",
    text: `${esc(combatant.name)}: Brand detonates for ${roll.total} damage.`,
  });
  const token = combatant.token?.object;
  if (!token) return;
  for (const neighbour of getAdjacentTokens(token)) {
    if (!neighbour.actor) continue;
    await neighbour.actor.takeDamage(6);
    lines.push({
      icon: "fa-burst",
      text: `${esc(neighbour.name)} takes 6 damage from the blast.`,
    });
  }
}

export const TurnEngine = Object.freeze({
  getUnit,
  startTurn,
  endTurn,
  startRound,
  endRound,
});
