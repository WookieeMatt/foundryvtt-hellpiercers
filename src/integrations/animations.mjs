/**
 * Animations for TACCOM: Automated Animations, or the built-in JB2A effects played through
 * globalThis.Sequencer.
 *
 * Provider (setting `animationProvider`):
 *  - auto                  Automated Animations first; if it has nothing for an attack, the built-in effects
 *  - automated-animations  Automated Animations only
 *  - builtin               The built-in JB2A effects only
 *  - none                  No animations
 *
 * JB2A comes as a Free library (`JB2A_DnD5e`) and a Premium one (`jb2a_patreon`); both register
 * under the same `jb2a.` Sequencer database. Every built-in effect lists candidate paths with the
 * best (Premium) first, and the first one that exists in the installed library is used, so the
 * system works with either. The `jb2aTier` setting can force the Free library when both are active.
 *
 * Status animations: Automated Animations animates Active Effects by itself, so in `auto` and
 * `automated-animations` modes the built-in status effects stay out of its way.
 */

import {
  BEAM,
  BURST,
  CONE,
  IMPACT,
  MELEE,
  RANGED,
  SINGLE,
  STATUS,
  STATUS_ELEMENT,
} from "./jb2a-catalog.mjs";

const MODULE = "HELLPIERCERS";
const active = id => !!game.modules.get(id)?.active;

/** Names of the modules involved, for diagnostics. */
export const MODULES = Object.freeze({
  sequencer: "sequencer",
  automatedAnimations: "autoanimations",
  free: "JB2A_DnD5e",
  premium: "jb2a_patreon",
});

const setting = key => game.settings.get(game.system.id, key);

/* -------------------------------------------- */
/*  What is installed                           */
/* -------------------------------------------- */

/** Whether Sequencer is running (the built-in effects need it). */
export function hasSequencer() {
  return active(MODULES.sequencer) && !!globalThis.Sequence;
}

/** Whether Automated Animations is running. */
export function hasAutomatedAnimations() {
  return active(MODULES.automatedAnimations) && !!globalThis.AutomatedAnimations?.playAnimation;
}

/**
 * Which JB2A library to draw from.
 * @returns {"premium" | "free" | null}
 */
export function jb2aTier() {
  const premium = active(MODULES.premium);
  const free = active(MODULES.free);
  const choice = setting("jb2aTier");
  if (choice === "free" && free) return "free";
  if (choice === "premium" && premium) return "premium";
  if (premium) return "premium";
  if (free) return "free";
  return null;
}

/** The provider the table has chosen, resolved against what is installed. */
export function provider() {
  const choice = setting("animationProvider");
  if (choice === "none") return "none";
  const aa = hasAutomatedAnimations();
  const builtin = hasSequencer() && !!jb2aTier();
  if (choice === "automated-animations") return aa ? "automated-animations" : "none";
  if (choice === "builtin") return builtin ? "builtin" : "none";
  if (aa && builtin) return "auto";
  if (aa) return "automated-animations";
  if (builtin) return "builtin";
  return "none";
}

/** A short, human summary for the settings screen and diagnostics. */
export function describe() {
  return {
    provider: provider(),
    sequencer: hasSequencer(),
    automatedAnimations: hasAutomatedAnimations(),
    tier: jb2aTier(),
    free: active(MODULES.free),
    premium: active(MODULES.premium),
  };
}

const usesBuiltin = () => ["auto", "builtin"].includes(provider());
const usesAA = () => ["auto", "automated-animations"].includes(provider());

/* -------------------------------------------- */
/*  Resolving paths                             */
/* -------------------------------------------- */

/** Whether a `jb2a.` key exists in the Free library's own database. */
function inFreeLibrary(path) {
  const db = game.modules.get(MODULES.free)?.api?.freeDatabase;
  if (!db) return false;
  let node = db;
  for (const part of path.replace(/^jb2a\./, "").split(".")) {
    node = node?.[part];
    if (node === undefined) return false;
  }
  return true;
}

/**
 * Pick the first candidate that the installed JB2A library has.
 * @param {string[]} candidates
 * @returns {string | null}
 */
export function resolve(candidates = []) {
  if (!hasSequencer()) return null;
  const freeOnly = jb2aTier() === "free" && active(MODULES.premium);
  for (const path of candidates) {
    if (!globalThis.Sequencer.Database.entryExists(path)) continue;
    if (freeOnly && !inFreeLibrary(path)) continue;
    return path;
  }
  return null;
}

/** @param {Record<string, string[]>} group @param {string} element */
const forElement = (group, element) =>
  resolve(group[element] ?? []) ?? resolve(group.physical ?? []);

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/** @param {foundry.canvas.placeables.Token | foundry.documents.TokenDocument | null | undefined} token */
const placeable = token => (token?.document ? token : (token?.object ?? null));

/** @param {object[]} refs */
const placeables = refs => [...(refs ?? [])].map(placeable).filter(Boolean);

/** The element a Damage (or a set of Status conditions) is themed by. */
export function elementOf(conditions = {}) {
  for (const key of Object.keys(conditions ?? {})) {
    if (STATUS_ELEMENT[key]) return STATUS_ELEMENT[key];
  }
  return "physical";
}

/**
 * Run a Sequencer sequence for the built-in effects, never throwing.
 * @param {(seq: Sequence) => void} build
 */
async function sequence(build) {
  if (!hasSequencer()) return;
  try {
    const seq = new globalThis.Sequence({ moduleName: MODULE, softFail: true });
    build(seq);
    await seq.play();
  } catch (err) {
    console.warn(`${MODULE} | animation failed`, err);
  }
}

/* -------------------------------------------- */
/*  Built-in effects                            */
/* -------------------------------------------- */

/**
 * The built-in effect for an attack.
 * @param {object} options
 * @param {foundry.canvas.placeables.Token} options.source
 * @param {foundry.canvas.placeables.Token[]} options.targets
 * @param {{ kind: string, value: number }} options.range
 * @param {string} [options.element]
 */
async function builtinAttack({ source, targets, range, element = "physical" }) {
  if (!source || !targets.length) return false;
  const kind = range?.kind ?? "targets";
  const sizeOf = t => Math.max(t.document.width, t.document.height);

  if (["burst", "blast", "ring", "star", "blob", "wall"].includes(kind)) {
    const path = forElement(BURST, element);
    if (!path) return false;
    await sequence(seq => {
      for (const target of targets) {
        seq
          .effect()
          .file(path)
          .atLocation(target)
          .scaleToObject(Math.max(2.2, 1.6 + sizeOf(target)))
          .randomRotation();
      }
    });
    return true;
  }
  if (kind === "cone") {
    const path = resolve(CONE.default);
    if (!path) return false;
    await sequence(seq => {
      seq.effect().file(path).atLocation(source).stretchTo(targets[0]);
    });
    return true;
  }
  if (["line", "arc", "charge"].includes(kind)) {
    const path = forElement(BEAM, element);
    if (!path) return false;
    await sequence(seq => {
      for (const target of targets) seq.effect().file(path).atLocation(source).stretchTo(target);
    });
    return true;
  }
  // Single targets: a swing up close, a bolt at range.
  const melee = (range?.value ?? 1) <= 1;
  const path = forElement(melee ? MELEE : RANGED, element);
  if (!path) return false;
  await sequence(seq => {
    for (const target of targets) {
      seq.effect().file(path).atLocation(source).stretchTo(target).waitUntilFinished(-300);
    }
  });
  return true;
}

/** The hit that lands on a target. */
async function builtinImpact(token, element = "physical") {
  const path = forElement(IMPACT, element);
  if (!path || !token) return false;
  await sequence(seq => {
    seq.effect().file(path).atLocation(token).scaleToObject(1.5).randomRotation();
  });
  return true;
}

/** A one-off effect on a token: heal, rez, defeat, provoke, limit, agnosia, teleport. */
async function builtinSingle(kind, token) {
  const path = resolve(SINGLE[kind] ?? []);
  if (!path || !token) return false;
  const scale = kind === "agnosia" ? 3 : kind === "limit" ? 1.2 : 1.5;
  await sequence(seq => {
    seq.effect().file(path).atLocation(token).scaleToObject(scale);
  });
  return true;
}

/** The name of a status's persistent effect on a token. */
const loopName = (token, status) => `hp-${token.id}-${status}`;

/** @param {foundry.canvas.placeables.Token} token @param {string} status @param {"on" | "off"} phase */
async function builtinStatus(token, status, phase) {
  const def = STATUS[status];
  if (!def || !token || !hasSequencer()) return false;
  if (phase === "off") {
    await globalThis.Sequencer.EffectManager.endEffects({
      name: loopName(token, status),
      object: token,
    });
    return true;
  }
  const once = resolve(def.on ?? []);
  const loop = resolve(def.loop ?? []);
  if (!once && !loop) return false;
  await sequence(seq => {
    if (once) seq.effect().file(once).atLocation(token).scaleToObject(1.5);
    if (
      loop &&
      !globalThis.Sequencer.EffectManager.getEffects({ name: loopName(token, status) }).length
    ) {
      seq
        .effect()
        .file(loop)
        .attachTo(token)
        .scaleToObject(1.3)
        .name(loopName(token, status))
        .persist()
        .fadeIn(400)
        .fadeOut(400)
        .belowTokens(status !== "aegis");
    }
  });
  return true;
}

/* -------------------------------------------- */
/*  Automated Animations bridge                 */
/* -------------------------------------------- */

/**
 * Ask Automated Animations to play an item or attack. It matches on the item's name through its own
 * Automatic Recognition menu or the item's configured animation, so the extra names let a GM write
 * one rule for a whole kind of attack ("HELLPIERCERS Melee", "HELLPIERCERS Burst Fire").
 *
 * @returns {Promise<boolean>} true if AA found an animation to play
 */
async function aaPlay({ source, targets, item, actor, attack, range, element }) {
  if (!hasAutomatedAnimations() || !source) return false;
  const kind = range?.kind ?? "targets";
  const melee = kind === "targets" && (range?.value ?? 1) <= 1;
  const shape = melee ? "melee" : kind === "targets" ? "ranged" : kind;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const names = [
    `HELLPIERCERS ${cap(shape)} ${cap(element ?? "physical")}`,
    `HELLPIERCERS ${cap(shape)}`,
  ];
  // Minions and bosses strike without an Item: give Automated Animations something to name.
  const subject = item ?? {
    name: attack?.name || actor?.system?.strike?.name || "Strike",
    img: actor?.img,
    uuid: actor?.uuid,
    parent: actor,
    type: "attack",
    flags: {},
  };
  try {
    const handler = await globalThis.AutomatedAnimations.playAnimation(source, subject, {
      targets,
      hit: true,
      extraNames: names,
    });
    return !!handler;
  } catch (err) {
    console.warn(`${MODULE} | Automated Animations failed`, err);
    return false;
  }
}

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

/**
 * Play the animation for an attack.
 * @param {object} options
 * @param {foundry.documents.Actor} [options.actor]
 * @param {foundry.documents.Item} [options.item]
 * @param {object} [options.attack]       The Attack data (name, range, damage)
 * @param {Array} options.targets         Tokens or token documents
 * @param {foundry.canvas.placeables.Token | foundry.documents.TokenDocument} [options.source]
 * @returns {Promise<boolean>} whether anything played
 */
export async function attack({ actor, item, attack: data, targets, source } = {}) {
  if (provider() === "none" || !setting("animateAttacks")) return false;
  const from =
    placeable(source) ??
    placeable(actor?.token) ??
    actor?.getActiveTokens?.()[0] ??
    placeables(canvas.tokens?.controlled)[0];
  const to = placeables(targets);
  const range = data?.range ?? item?.system?.attack?.range ?? actor?.system?.strike?.range;
  const element = elementOf(data?.damage?.conditions ?? item?.system?.attack?.damage?.conditions);
  const context = { source: from, targets: to, item, actor, attack: data, range, element };
  if (usesAA() && (await aaPlay(context))) return true;
  if (usesBuiltin()) return builtinAttack(context);
  return false;
}

/**
 * The impact of damage landing on tokens.
 * @param {Array} tokens
 * @param {object} [options]
 * @param {Record<string, number>} [options.conditions]  The Damage's conditions, which theme the hit
 */
export async function impact(tokens, { conditions } = {}) {
  if (!usesBuiltin() || !setting("animateAttacks")) return false;
  const element = elementOf(conditions);
  for (const token of placeables(tokens)) await builtinImpact(token, element);
  return true;
}

/**
 * A one-off effect on a token: heal, rez, defeat, provoke, limit, agnosia or teleport.
 * @param {"heal" | "rez" | "defeat" | "provoke" | "limit" | "agnosia" | "teleport"} kind
 * @param {object} token
 */
export async function single(kind, token) {
  if (!usesBuiltin() || !setting("animateEffects")) return false;
  return builtinSingle(kind, placeable(token));
}

/**
 * A Status Effect arriving on, or leaving, a token.
 * @param {object} token
 * @param {string} status
 * @param {"on" | "off"} phase
 */
export async function status(token, status, phase = "on") {
  // Automated Animations animates Active Effects on its own.
  if (provider() !== "builtin" || !setting("animateEffects")) return false;
  return builtinStatus(placeable(token), status, phase);
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/** The tokens an actor currently has on the active scene. */
function tokensOf(actor) {
  if (!actor || !canvas.ready) return [];
  return actor.getActiveTokens(true);
}

function onCreateEffect(effect, _options, userId) {
  if (userId !== game.user.id || !(effect.parent?.documentName === "Actor")) return;
  for (const id of effect.statuses) {
    for (const token of tokensOf(effect.parent)) status(token, id, "on");
  }
}

function onDeleteEffect(effect, _options, userId) {
  if (userId !== game.user.id || !(effect.parent?.documentName === "Actor")) return;
  for (const id of effect.statuses) {
    for (const token of tokensOf(effect.parent)) status(token, id, "off");
  }
}

/** Start listening. Call once on `ready`. */
export function activateAnimations() {
  Hooks.on("createActiveEffect", onCreateEffect);
  Hooks.on("deleteActiveEffect", onDeleteEffect);
  Hooks.on("hellpiercers.attack", data => attack(data));
  Hooks.on("hellpiercers.hit", ({ tokens, damage }) => {
    impact(tokens, { conditions: damage?.conditions });
  });
  Hooks.on("hellpiercers.healed", actor => {
    for (const token of tokensOf(actor)) single("heal", token);
  });
  Hooks.on("hellpiercers.actorDowned", actor => {
    for (const token of tokensOf(actor)) single("defeat", token);
  });
  Hooks.on("hellpiercers.rezzed", actor => {
    for (const token of tokensOf(actor)) single("rez", token);
  });
  Hooks.on("hellpiercers.provoke", (token, provokers) => {
    if (!usesBuiltin() || !setting("animateAttacks")) return;
    const path = resolve(SINGLE.provoke);
    if (!path) return;
    for (const enemy of placeables(provokers)) {
      sequence(seq => seq.effect().file(path).atLocation(enemy).stretchTo(placeable(token)));
    }
  });
  Hooks.on("hellpiercers.limitReady", actor => {
    for (const token of tokensOf(actor)) single("limit", token);
  });
  Hooks.on("hellpiercers.agnosia", actor => {
    for (const token of tokensOf(actor)) single("agnosia", token);
  });

  // Tell the GM what is, and isn't, available.
  if (game.user.isGM) {
    const info = describe();
    if (setting("animationProvider") !== "none" && info.provider === "none") {
      console.info(`${MODULE} | No animation provider available`, info);
    }
  }
}
