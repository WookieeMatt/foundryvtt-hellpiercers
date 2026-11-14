/**
 * HELLPIERCERS status effects.
 *
 * Every Effect from the core book is defined here once, together with the rules metadata the TACCOM
 * engine needs (when it decays, how it stacks, and what it does at the start/end of a turn).
 *
 * - `decay`  When a stack is removed. "turn" = end of the afflicted unit's turn, "round" = end of
 *            the round, "trigger" = removed by the rule that consumes it, "special" = custom
 *            handling in the engine, "never" = manual only.
 * - `stack`  "add" sums stacks from separate sources, "max" keeps the highest (e.g. Blazing).
 * - `group`  Used to organise the HUD and effect pickers.
 */

/** @typedef {"turn" | "round" | "trigger" | "special" | "never"} DecayTrigger */
/**
 * @typedef {object} StatusRule
 * @property {string} id
 * @property {string} img
 * @property {DecayTrigger} decay
 * @property {"add" | "max"} [stack="add"]
 * @property {"core" | "faction" | "equipment" | "state"} group
 * @property {boolean} [overlay]
 */

/** @type {StatusRule[]} */
export const STATUS_RULES = [
  // Core effects (pp. 94-95)
  { id: "aegis", img: "icons/svg/wing.svg", decay: "turn", group: "core" },
  { id: "armor", img: "icons/svg/shield.svg", decay: "turn", group: "core" },
  { id: "blazing", img: "icons/svg/fire.svg", decay: "special", stack: "max", group: "core" },
  { id: "bleed", img: "icons/svg/blood.svg", decay: "turn", group: "core" },
  { id: "bound", img: "icons/svg/net.svg", decay: "turn", group: "core" },
  { id: "broken", img: "icons/svg/degen.svg", decay: "trigger", group: "core" },
  { id: "compel", img: "icons/svg/target.svg", decay: "trigger", group: "core" },
  { id: "countdown", img: "icons/svg/clockwork.svg", decay: "round", group: "core" },
  { id: "enrage", img: "icons/svg/terror.svg", decay: "turn", group: "core" },
  { id: "fortified", img: "icons/svg/holy-shield.svg", decay: "trigger", group: "core" },
  { id: "haste", img: "icons/svg/wingfoot.svg", decay: "trigger", group: "core" },
  { id: "healing", img: "icons/svg/heal.svg", decay: "turn", group: "core" },
  { id: "pain_aura", img: "icons/svg/aura.svg", decay: "turn", group: "core" },
  { id: "pin", img: "icons/svg/anchor.svg", decay: "turn", group: "core" },
  { id: "poison", img: "icons/svg/poison.svg", decay: "special", group: "core" },
  { id: "shaded", img: "icons/svg/mystery-man.svg", decay: "turn", group: "core" },
  { id: "shock", img: "icons/svg/paralysis.svg", decay: "turn", group: "core" },
  { id: "slow", img: "icons/svg/down.svg", decay: "turn", group: "core" },
  { id: "transference", img: "icons/svg/regen.svg", decay: "turn", group: "core" },

  // Faction and ability specific effects
  { id: "frozen", img: "icons/svg/frozen.svg", decay: "turn", group: "faction" },
  { id: "wound", img: "icons/svg/bones.svg", decay: "never", group: "faction" },
  { id: "wrack", img: "icons/svg/explosion.svg", decay: "trigger", group: "equipment" },
  { id: "constrict", img: "icons/svg/net.svg", decay: "never", group: "faction" },
  { id: "brand", img: "icons/svg/fire-shield.svg", decay: "round", group: "equipment" },
  { id: "retaliation", img: "icons/svg/sword.svg", decay: "special", group: "equipment" },
  { id: "retrieve", img: "icons/svg/teleport.svg", decay: "trigger", group: "equipment" },
  { id: "rush", img: "icons/svg/lightning.svg", decay: "trigger", group: "equipment" },
  { id: "magnetic", img: "icons/svg/lightning.svg", decay: "turn", group: "faction" },
  { id: "snakeskin", img: "icons/svg/acid.svg", decay: "trigger", group: "faction" },
  { id: "aggression", img: "icons/svg/combat.svg", decay: "turn", group: "equipment" },
  { id: "glassflesh", img: "icons/svg/ice-shield.svg", decay: "trigger", group: "equipment" },

  // States. Agnosia is applied by the boss data model, Dead is a core overlay.
  { id: "agnosia", img: "icons/svg/explosion.svg", decay: "never", group: "state", overlay: false },
  {
    id: "dead",
    name: "EFFECT.StatusDead",
    description: "",
    img: "icons/svg/skull.svg",
    decay: "never",
    group: "state",
    overlay: true,
  },
];

/** Lookup of rules by status id. */
export const RULES_BY_ID = Object.freeze(Object.fromEntries(STATUS_RULES.map(r => [r.id, r])));

/**
 * Transform the status rules into valid data for CONFIG.statusEffects
 * @returns {Record<string, CONFIG.StatusEffectConfig>}
 */
export function getStatusEffects() {
  return Object.fromEntries(
    STATUS_RULES.map((rule, order) => {
      const config = {
        id: rule.id,
        name: rule.name ?? `HELLPIERCERS.STATUSES.${rule.id}.name`,
        description:
          rule.description ?? game.i18n.localize(`HELLPIERCERS.STATUSES.${rule.id}.description`),
        img: rule.img,
        order,
        "system.decay": rule.decay,
        "flags.hellpiercers.group": rule.group,
        "flags.hellpiercers.stack": rule.stack ?? "add",
      };
      if (rule.overlay) config["flags.core.overlay"] = true;
      if (rule.id === "agnosia") config.hud = false;
      return [
        rule.id,
        /** @type {CONFIG.StatusEffectConfig} */ (foundry.utils.expandObject(config)),
      ];
    })
  );
}

import.meta.hot?.accept(({ getStatusEffects }) => {
  CONFIG.statusEffects = getStatusEffects();
  canvas.tokens.hud.render();
});
