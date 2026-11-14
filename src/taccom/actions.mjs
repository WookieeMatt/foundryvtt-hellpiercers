import { getSetting } from "../settings.mjs";

/** @import { ActionType } from "../data/combatant.mjs" */

/**
 * Find the combatant that represents an actor in the active combat, if any.
 * @param {foundry.documents.Actor} actor
 * @returns {foundry.documents.Combatant | null}
 */
export function findCombatant(actor) {
  const combat = game.combat;
  if (!combat?.started || !actor) return null;
  return combat.getCombatantsByActor(actor)[0] ?? null;
}

/**
 * Spend an action for an actor. Does nothing (and succeeds) if action tracking is disabled or the
 * actor isn't in a started combat.
 * @param {foundry.documents.Actor} actor
 * @param {ActionType | null} type
 * @param {object} [options]
 * @param {boolean} [options.notify=true]  Warn the user if the action isn't available.
 * @returns {Promise<{ ok: boolean, type: ActionType | null, reason?: string, skipped?: boolean }>}
 */
export async function spendAction(actor, type, { notify = true } = {}) {
  if (!type || !getSetting("trackActions")) return { ok: true, type: null, skipped: true };
  const combatant = findCombatant(actor);
  if (!combatant) return { ok: true, type, skipped: true };

  const result = await combatant.system.spendAction(type, { force: false });
  if (!result.ok && notify) {
    const key = result.reason === "spent" ? "spent" : (result.reason ?? "spent");
    const label = game.i18n.localize(`HELLPIERCERS.ACTIONS.${type}.label`);
    const reason = ["shock", "frozen"].includes(key)
      ? game.i18n.localize(`HELLPIERCERS.ACTIONS.${key}`)
      : game.i18n.localize("HELLPIERCERS.ACTIONS.spent");
    ui.notifications.warn(`${combatant.name}: ${label} - ${reason}`);
  }
  return result;
}

/**
 * Like {@link spendAction}, but the GM may override an unavailable action and players may not.
 * @param {foundry.documents.Actor} actor
 * @param {ActionType | null} type
 * @returns {Promise<boolean>} Whether the caller may proceed
 */
export async function trySpendAction(actor, type) {
  const result = await spendAction(actor, type);
  if (result.ok) return true;
  if (!game.user.isGM) return false;
  const combatant = findCombatant(actor);
  await combatant?.system.spendAction(type, { force: true });
  return true;
}
