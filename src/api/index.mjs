/**
 * The HELLPIERCERS scripting API. Its members are merged into `game.system.api` (a.k.a. the global
 * `hellpiercers`), so `hellpiercers.damage(...)`, `hellpiercers.status.add(...)` and so on.
 *
 * Everything here is safe to call from macros: references can be an Actor, Token, TokenDocument,
 * UUID, an array of those, or omitted to use the controlled tokens (falling back to your character).
 *
 * @example
 * // Poison every selected token for 3, then deal 4 damage to the first target
 * await hellpiercers.status.add(null, "poison", 3);
 * await hellpiercers.damage(game.user.targets.first(), 4);
 */

import { Damage } from "../data/damage.mjs";
import { stratcom } from "../stratcom/engine.mjs";
import { findCombatant, spendAction } from "../taccom/actions.mjs";
import { TurnEngine } from "../taccom/engine.mjs";
import { gmDo, registerGmOperation } from "./socket.mjs";

/** @typedef {foundry.documents.Actor | foundry.documents.TokenDocument | foundry.canvas.placeables.Token | string} ActorRef */

/**
 * Resolve any reference into a list of actors.
 * @param {ActorRef | ActorRef[] | null | undefined} ref
 * @returns {foundry.documents.Actor[]}
 */
export function resolve(ref) {
  if (ref == null) {
    const controlled = canvas?.tokens?.controlled ?? [];
    if (controlled.length) return controlled.map(t => t.actor).filter(Boolean);
    return game.user.character ? [game.user.character] : [];
  }
  const list = Array.isArray(ref) ? ref : (ref.contents ?? (ref instanceof Set ? [...ref] : [ref]));
  const actors = [];
  for (let item of list) {
    if (typeof item === "string") item = fromUuidSync(item);
    if (!item) continue;
    if (item.document) item = item.document; // placeable -> document
    if (item.documentName === "Token") item = item.actor;
    if (item?.documentName === "Actor") actors.push(item);
  }
  return actors;
}

/* -------------------------------------------- */
/*  Health                                      */
/* -------------------------------------------- */

/**
 * Deal damage, accounting for Armor, Bleed and other Effects on the target.
 * @param {ActorRef | ActorRef[]} ref
 * @param {number} amount
 * @param {object} [options]
 * @param {Record<string, number | boolean>} [options.conditions]  Effects to inflict, e.g. `{ bleed: 2 }`
 * @param {Partial<Record<"piercing"|"transference"|"breaker"|"overpenetrating", boolean>>} [options.qualities]
 * @param {ActorRef} [options.source]  The attacker, for Transference and Bound
 * @param {boolean} [options.raw=false]  Skip modifiers and deal exactly `amount`
 */
export async function damage(
  ref,
  amount,
  { conditions = {}, qualities = {}, source, raw = false } = {}
) {
  const sourceActor = source ? resolve(source)[0] : null;
  const results = [];
  for (const actor of resolve(ref)) {
    if (raw) {
      results.push(await actor.takeDamage(amount));
      continue;
    }
    const dmg = new Damage({
      formula: String(amount),
      value: Math.floor(amount),
      conditions,
      qualities,
      source: sourceActor?.uuid ?? null,
    });
    results.push(await dmg.apply(actor));
  }
  return results;
}

/** Heal actors. @param {ActorRef | ActorRef[]} ref @param {number} amount */
export async function heal(ref, amount) {
  const out = [];
  for (const actor of resolve(ref)) out.push(await actor.heal(amount));
  return out;
}

/** Grant temporary HP. */
export async function tempHP(ref, amount, options) {
  const out = [];
  for (const actor of resolve(ref)) out.push(await actor.grantTempHP(amount, options));
  return out;
}

/** Rez downed actors: back on their feet with full HP. */
export async function rez(ref) {
  for (const actor of resolve(ref)) await actor.rez();
}

/* -------------------------------------------- */
/*  Statuses                                    */
/* -------------------------------------------- */

export const status = Object.freeze({
  /** Add stacks of a status to the actors. */
  async add(ref, statusId, stacks = 1) {
    for (const actor of resolve(ref)) await actor.applyStatus(statusId, stacks);
  },
  /** Remove stacks of a status (omit `stacks` to remove it entirely). */
  async remove(ref, statusId, stacks) {
    for (const actor of resolve(ref)) await actor.removeStatus(statusId, stacks);
  },
  /** Total stacks of a status on the first actor. */
  get(ref, statusId) {
    return resolve(ref)[0]?.getStatusStacks(statusId) ?? 0;
  },
  /** All available status ids. */
  list() {
    return Object.keys(CONFIG.statusEffects);
  },
});

/* -------------------------------------------- */
/*  Combat                                      */
/* -------------------------------------------- */

export const combat = Object.freeze({
  /** The combatant for an actor in the active combat. */
  combatant: ref => findCombatant(resolve(ref)[0]),
  /** Spend an action ("main" | "support" | "aux" | "move") for an actor. */
  spend: (ref, type) => spendAction(resolve(ref)[0], type),
  /** Give an action back. */
  async refund(ref, type) {
    await findCombatant(resolve(ref)[0])?.system.refundAction(type);
  },
  /** Refresh all actions for an actor. */
  async refresh(ref) {
    await findCombatant(resolve(ref)[0])?.system.resetActions();
  },
  /** Start a combatant's turn. */
  async activate(ref) {
    const combatant = findCombatant(resolve(ref)[0]);
    if (combatant) await combatant.activate();
  },
  /** End the current turn. */
  async endTurn() {
    await game.combat?.nextTurn();
  },
  /** Resolve start-of-turn or end-of-turn effects for an actor without advancing the combat. */
  async resolve(ref, phase = "end") {
    const combatant = findCombatant(resolve(ref)[0]);
    if (!combatant) return [];
    return phase === "start" ? TurnEngine.startTurn(combatant) : TurnEngine.endTurn(combatant);
  },
});

/* -------------------------------------------- */
/*  RECON                                       */
/* -------------------------------------------- */

const RECON_OUTCOMES = Object.freeze({
  fail: { key: "fail", label: "Failure", hint: "They fail in the biggest way you can imagine." },
  partial: {
    key: "partial",
    label: "Success, with a drawback",
    hint: "They succeed with at least one major drawback.",
  },
  success: { key: "success", label: "Triumph", hint: "They succeed above their estimations." },
});

/**
 * Roll 2D6 plus one for every relevant Tag (p. 61). 7 or below fails, 8-9 succeeds with a major
 * drawback, 10+ succeeds beyond expectations.
 * @param {object} [options]
 * @param {ActorRef} [options.actor]
 * @param {number} [options.tags=0]  Number of relevant tags
 * @param {string} [options.label]   What the character is attempting
 */
export async function reconRoll({ actor, tags = 0, label = "" } = {}) {
  const speakerActor = resolve(actor)[0] ?? null;
  const roll = await new foundry.dice.Roll("2d6 + @tags", { tags }).evaluate();
  const outcome =
    roll.total >= 10
      ? RECON_OUTCOMES.success
      : roll.total >= 8
        ? RECON_OUTCOMES.partial
        : RECON_OUTCOMES.fail;
  const ChatMessage = getDocumentClass("ChatMessage");
  const content = `
    <div class="hellpiercers recon-roll ${outcome.key}">
      <header>${foundry.utils.escapeHTML(label || "RECON")}</header>
      <div class="result"><strong>${outcome.label}</strong> <span>(${roll.total})</span></div>
      <p>${outcome.hint}</p>
    </div>`;
  return ChatMessage.create({
    content,
    rolls: [roll],
    speaker: ChatMessage.getSpeaker({ actor: speakerActor }),
    flags: { [game.system.id]: { reconRoll: outcome.key } },
  });
}

/**
 * Roll the Tone Die (D10): how heated is the situation? 1 is de-escalated, 10 is TACCOM.
 * @param {string} [label]
 */
export async function toneDie(label = "") {
  const roll = await new foundry.dice.Roll("1d10").evaluate();
  const t = roll.total;
  const band =
    t <= 2
      ? "Weapons are down, attention is elsewhere, alarms are quiet."
      : t <= 4
        ? "Tension, but nobody has committed yet."
        : t <= 6
          ? "Things are getting heated."
          : t <= 8
            ? "Someone is about to act. Reinforcements may be inbound."
            : "The world is exploding. You're probably headed to TACCOM.";
  const ChatMessage = getDocumentClass("ChatMessage");
  return ChatMessage.create({
    content: `<div class="hellpiercers tone-die"><header>Tone Die${label ? `: ${foundry.utils.escapeHTML(label)}` : ""}</header><div class="result"><strong>${t}</strong> / 10</div><p>${band}</p></div>`,
    rolls: [roll],
    flags: { [game.system.id]: { toneDie: t } },
  });
}

/**
 * Ask the user which tags apply, then roll a RECON check for the actor.
 * @param {ActorRef} [ref]
 */
export async function reconDialog(ref) {
  const actor = resolve(ref)[0];
  if (!actor) return ui.notifications.warn("Select a token or assign a character first.");
  const names = new Set(actor.system.tags ?? []);
  for (const type of ["class", "armor", "weapon", "equipment"]) {
    for (const item of actor.itemTypes[type] ?? []) names.add(item.name);
  }
  const content = document.createElement("div");
  content.classList.add("recon-dialog");
  const label = document.createElement("input");
  label.type = "text";
  label.name = "label";
  label.placeholder = "What are you attempting?";
  content.append(label);
  const list = document.createElement("div");
  list.classList.add("tag-list");
  for (const name of names) {
    const row = document.createElement("label");
    row.classList.add("checkbox");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = `tag.${[...names].indexOf(name)}`;
    row.append(input, ` ${name}`);
    list.append(row);
  }
  content.append(list);
  const data = await foundry.applications.api.Dialog.input({
    window: { title: `RECON: ${actor.name}`, icon: "fa-solid fa-dice" },
    classes: ["hellpiercers", "recon-roll-dialog"],
    content,
  });
  if (!data) return null;
  const tags = Object.entries(data).filter(([k, v]) => k.startsWith("tag.") && v).length;
  return reconRoll({ actor, tags, label: data.label });
}

/* -------------------------------------------- */
/*  GM delegation                               */
/* -------------------------------------------- */

registerGmOperation("damage", ({ targets, amount, options }) => damage(targets, amount, options));
registerGmOperation("heal", ({ targets, amount }) => heal(targets, amount));
registerGmOperation("statusAdd", ({ targets, status: s, stacks }) =>
  status.add(targets, s, stacks)
);
registerGmOperation("statusRemove", ({ targets, status: s, stacks }) =>
  status.remove(targets, s, stacks)
);

/**
 * Ask the active GM to run an operation on actors you don't own. Players use this from macros.
 * @param {"damage" | "heal" | "statusAdd" | "statusRemove"} operation
 * @param {object} payload  `targets` must be UUIDs.
 */
export const asGM = gmDo;

export const api = Object.freeze({
  resolve,
  damage,
  heal,
  tempHP,
  rez,
  status,
  combat,
  stratcom,
  recon: Object.freeze({ roll: reconRoll, dialog: reconDialog, tone: toneDie }),
  asGM,
});
