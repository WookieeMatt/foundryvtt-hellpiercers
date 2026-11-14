/**
 * The four things a unit can do on its activation (p. 93).
 * @typedef {"main" | "support" | "aux" | "move"} ActionType
 */

/** Tiers used by Shock: each action is treated as one tier higher. */
const SHOCK_ESCALATION = { aux: "support", support: "main", main: null, move: "move" };

export const ACTION_TYPES = Object.freeze(["main", "support", "aux", "move"]);

export class HellpiercersCombatantModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const spent = () => new fields.BooleanField({ initial: false });
    return {
      activations: new fields.SchemaField({
        value: new fields.NumberField({ initial: null }),
        max: new fields.NumberField({ initial: null }),
      }),
      /** Which of this combatant's actions have been used during the current activation. */
      actions: new fields.SchemaField({
        main: spent(),
        support: spent(),
        aux: spent(),
        move: spent(),
      }),
    };
  }

  prepareBaseData() {
    if (typeof this.parent.actor?.system._getActivations === "function") {
      this.activations.max ??= this.parent.actor?.system._getActivations() ?? 1;
    } else {
      this.activations.max ??= 1;
    }
    if (!this.parent.parent.started) this.activations.value = 0;
    this.activations.value ??= this.activations.max;
  }

  activate() {
    this.parent.activate();
  }

  deactivate() {
    this.parent.deactivate();
  }

  /* -------------------------------------------- */
  /*  Action economy                              */
  /* -------------------------------------------- */

  /**
   * Work out whether an action may be used right now and what it would actually consume once
   * Shock, Frozen, Pin and Haste are accounted for.
   * @param {ActionType} type
   * @returns {{ ok: boolean, type: ActionType | null, reason?: string, haste?: boolean }}
   */
  checkAction(type) {
    const actor = this.parent.actor;
    const stacks = id => actor?.getStatusStacks?.(id) ?? 0;
    let effective = type;

    if (stacks("shock") > 0) {
      effective = SHOCK_ESCALATION[type];
      if (!effective) return { ok: false, type: null, reason: "shock" };
    }
    if (type === "aux" && stacks("frozen") > 0) return { ok: false, type: null, reason: "frozen" };
    if (type === "move" && stacks("pin") > 0) return { ok: false, type: null, reason: "pin" };

    if (!this.actions[effective]) return { ok: true, type: effective };
    if (stacks("haste") > 0) return { ok: true, type: effective, haste: true };
    return { ok: false, type: effective, reason: "spent" };
  }

  /**
   * Spend an action. Spending an already used action consumes a stack of Haste.
   * @param {ActionType} type
   * @param {object} [options]
   * @param {boolean} [options.force=false]  Spend the action even if it is unavailable.
   * @returns {Promise<{ ok: boolean, type: ActionType | null, reason?: string }>}
   */
  async spendAction(type, { force = false } = {}) {
    if (!ACTION_TYPES.includes(type)) throw new Error(`Unknown action type "${type}"`);
    const check = this.checkAction(type);
    if (!check.ok && !force) return check;
    const effective = check.type ?? type;
    if (check.haste) await this.parent.actor?.consumeStatus("haste", 1);
    else await this.parent.update({ [`system.actions.${effective}`]: true });
    return { ok: true, type: effective };
  }

  /** Free an action again (undo, or for abilities that refund actions). */
  async refundAction(type) {
    if (!ACTION_TYPES.includes(type)) throw new Error(`Unknown action type "${type}"`);
    return this.parent.update({ [`system.actions.${type}`]: false });
  }

  /** Reset every action for a fresh activation. */
  async resetActions() {
    const anySpent = ACTION_TYPES.some(a => this.actions[a]);
    if (!anySpent) return this.parent;
    return this.parent.update({
      "system.actions": Object.fromEntries(ACTION_TYPES.map(a => [a, false])),
    });
  }

  /** Whether any action is still available this activation. */
  get hasActionsLeft() {
    return ACTION_TYPES.some(a => this.checkAction(a).ok);
  }
}
