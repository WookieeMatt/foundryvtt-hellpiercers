import { ACTION_TYPES } from "../../../data/combatant.mjs";
import { getSetting } from "../../../settings.mjs";

export class HellpiercersCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
  static DEFAULT_OPTIONS = {
    actions: {
      activateCombatantTurn: HellpiercersCombatTracker.#activateCombatantTurn,
      deactivateCombatantTurn: HellpiercersCombatTracker.#deactivateCombatantTurn,
      pingCombatant: HellpiercersCombatTracker.#pingCombatant,
      toggleDefeated: HellpiercersCombatTracker.#toggleDefeated,
    },
  };

  static PARTS = {
    header: { template: "templates/sidebar/tabs/combat/header.hbs" },
    tracker: { template: "systems/hellpiercers/templates/sidebar/combat/tracker.hbs" },
    footer: { template: "templates/sidebar/tabs/combat/footer.hbs" },
  };

  /**
   * @param {foundry.applications.types.ApplicationRenderContext} ctx
   * @param {import("@client/applications/api/handlebars-application.mjs").HandlebarsRenderOptions} opts
   */
  async _prepareTrackerContext(ctx, opts) {
    await super._prepareTrackerContext(ctx, opts);

    const rendered_groups = new Set();
    ctx.turns = ctx.turns?.reduce((arr, t) => {
      const combatant = this.viewed.getEmbeddedDocument("Combatant", t.id);
      const group = combatant.group;
      if (rendered_groups.has(group)) return arr;
      if (group?.type === "swarm") rendered_groups.add(group);
      const buttons = Array.from(Array(combatant?.system.activations.value ?? 0), () => ({
        icon: "fa-solid fa-circle-chevron-right",
        action: "activateCombatantTurn",
      }));
      if (combatant === this.viewed.combatant && combatant.isOwner)
        buttons.push({ icon: "fa-solid fa-circle-xmark", action: "deactivateCombatantTurn" });
      const pips =
        getSetting("trackActions") && this.viewed.started && combatant.actor
          ? ACTION_TYPES.map(id => {
              const check = combatant.system.checkAction(id);
              return {
                id,
                spent: !!combatant.system.actions[id],
                blocked: !check.ok && check.reason !== "spent",
              };
            })
          : null;
      return arr.concat([
        {
          ...t,
          buttons,
          pips,
          groupId: group?.id,
          groupSize: group?.members?.size,
        },
      ]);
    }, []);
  }

  /**
   * @this {HellpiercersCombatTracker}
   * @param {Event} _ev
   * @param {HTMLElement} target
   */
  static async #activateCombatantTurn(_ev, target) {
    const { combatantId } = target.closest("[data-combatant-id]").dataset;
    const combatant = this.viewed.getEmbeddedDocument("Combatant", combatantId);
    if (combatant.isOwner) combatant.system.activate();
  }

  /**
   * @this {HellpiercersCombatTracker}
   * @param {Event} _ev
   * @param {HTMLElement} target
   */
  static async #deactivateCombatantTurn(_ev, target) {
    const { combatantId } = target.closest("[data-combatant-id]").dataset;
    const combatant = this.viewed.getEmbeddedDocument("Combatant", combatantId);
    if (combatant.isOwner) this.viewed.nextTurn();
  }

  /**
   * @this {HellpiercersCombatTracker}
   * @param {Event} _ev
   * @param {HTMLElement} target
   */
  static async #pingCombatant(_ev, target) {
    const { groupId } = target.closest("[data-group-id]").dataset;
    const group = this.viewed.getEmbeddedDocument("CombatantGroup", groupId);
    if (groupId) this._onPingCombatantGroup(group);
    else this._onCombatantControl(_ev, target);
  }

  _onPingCombatantGroup(group) {
    if (!canvas.ready || group.members.first()?.sceneId !== canvas.scene.id) return;
    const tokens = Array.from(group.members)
      .map(c => c.token?.object)
      .filter(o => !!o && this._isTokenVisible(o));
    for (const t of tokens) canvas.ping(t.center);
  }

  /**
   * @this {HellpiercersCombatTracker}
   * @param {Event} _ev
   * @param {HTMLElement} target
   */
  static async #toggleDefeated(_ev, target) {
    const { groupId } = target.closest("[data-group-id]").dataset;
    const group = this.viewed.getEmbeddedDocument("CombatantGroup", groupId);
    if (groupId) this._onToggleGroupDefeatedStatus(group);
    else this._onCombatantControl(_ev, target);
  }

  async _onToggleGroupDefeatedStatus(group) {
    const combatants = Array.from(group.members);
    const isDefeated = !combatants.every(c => c.isDefeated);
    const updates = combatants.map(c => ({ _id: c.id, defeated: isDefeated }));
    await this.viewed.updateEmbeddedDocuments("Combatant", updates);
    const defeatedId = CONFIG.specialStatusEffects.DEFEATED;
    await Promise.all(
      combatants.map(c => c.actor?.toggleStatusEffect(defeatedId, { active: isDefeated }))
    );
  }
}
