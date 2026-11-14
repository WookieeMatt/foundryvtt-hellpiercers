export class HellpiercersTokenHUD extends foundry.applications.hud.TokenHUD {
  static DEFAULT_OPTIONS = {
    actions: {
      effect: {
        handler: HellpiercersTokenHUD.#onToggleEffect,
        buttons: [0, 2],
      },
      swarmDelete: HellpiercersTokenHUD.#swarmDelete,
      swarmMerge: HellpiercersTokenHUD.#swarmMerge,
      swarmNew: HellpiercersTokenHUD.#swarmNew,
    },
  };

  async _onRender(ctx, opts) {
    await super._onRender(ctx, opts);

    const combatant = this.object.combatant;
    const actor = this.object.actor;
    if (!combatant || actor.type !== "minion" || !actor.system.tags.has("Horde")) return;
    const swarmBtn = document.createElement("button");
    swarmBtn.type = "button";
    swarmBtn.classList.add("control-icon");
    const icon = document.createElement("i");
    icon.classList.add("fa-solid", "fa-people-group");
    swarmBtn.appendChild(icon);
    Object.assign(swarmBtn.dataset, {
      action: "togglePalette",
      tooltip: "HELLPIERCERS.TokenHUD.swarmActions.tooltip",
      palette: "swarmActions",
    });
    const palette = document.createElement("div");
    palette.classList.add("palette", "swarm-actions");
    Object.assign(palette.dataset, { palette: "swarmActions" });
    /** @type {Set<foundry.documents.CombatantGroup>} */
    const selectedGroups = new Set(
      canvas.tokens.controlled.map(t => t.combatant?.group).filter(g => g?.type === "swarm")
    );
    const ungrouped = canvas.tokens.controlled.some(
      t => t.actor.id === this.object.actor.id && t.combatant?.group?.type !== "swarm"
    );
    const swarmActions = [];
    if (selectedGroups.size > 1 || (selectedGroups.size > 0 && ungrouped)) {
      swarmActions.push({
        label: "HELLPIERCERS.TokenHUD.swarmActions.merge",
        icon: "fa-solid fa-people-group",
        action: "swarmMerge",
      });
    }
    if (canvas.tokens.controlled.every(t => t.combatant?.group?.type !== "swarm")) {
      swarmActions.push({
        label: "HELLPIERCERS.TokenHUD.swarmActions.new",
        icon: "fa-solid fa-plus",
        action: "swarmNew",
      });
    }
    if (this.#hasSwarm()) {
      swarmActions.push({
        label: "HELLPIERCERS.TokenHUD.swarmActions.delete",
        icon: "fa-solid fa-trash",
        action: "swarmDelete",
      });
    }
    for (const action of swarmActions) {
      const a = document.createElement("a");
      a.classList.add("swarm-action-control");
      a.dataset.action = action.action;
      const span = document.createElement("span");
      const icon = document.createElement("i");
      icon.classList.add(...action.icon.split(" "), "fa-fw");
      palette
        .appendChild(a)
        .appendChild(span)
        .appendChild(icon)
        .insertAdjacentText("afterend", ` ${game.i18n.localize(action.label)}`);
    }
    this.element.querySelector(".col.left").appendChild(swarmBtn).after(palette);
  }

  #hasSwarm() {
    return this.object.combatant?.group?.type === "swarm";
  }

  /**
   * @this {HellpiercersTokenHUD}
   * @param {Event} ev
   * @param {HTMLElement} target
   */
  static async #onToggleEffect(ev, target) {
    if (!this.actor) {
      ui.notifications.warn("HUD.WarningEffectNoActor", { localize: true });
      return;
    }
    const statusId = target.dataset.statusId;
    await this.actor.toggleStatusEffect(statusId, { direction: ev.button === 2 ? -1 : 1 });
  }

  /**
   * @this {HellpiercersTokenHUD}
   * @param {Event} ev
   * @param {HTMLElement} target
   */
  static async #swarmNew() {
    this.togglePalette("swarmActions", false);
    const tokens = canvas.tokens.controlled.filter(t => t.actor.id === this.object.actor.id);
    const cls = getDocumentClass("CombatantGroup");
    const group = await cls.create({ type: "swarm" }, { parent: this.object.combatant.combat });
    await group.system.addMembers(tokens);
  }

  /**
   * @this {HellpiercersTokenHUD}
   * @param {Event} ev
   * @param {HTMLElement} target
   */
  static async #swarmMerge() {
    this.togglePalette("swarmActions", false);
    const group =
      this.object.combatant?.group?.type === "swarm"
        ? this.object.combatant.group
        : canvas.tokens.controlled.find(t => t.combatant?.group?.type === "swarm")?.combatant.group;
    if (!group) throw new Error("No group found for merge operation");

    const tokens = canvas.tokens.controlled.filter(t => t.actor.id === this.object.actor.id);
    /** @type {Set<foundry.documents.CombatantGroup>} */
    const groups = new Set(
      tokens.map(t => t.combatant?.group).filter(t => t instanceof foundry.documents.CombatantGroup)
    );
    for (const g of groups) {
      if (g === group) continue;
      await group.system.merge(g);
    }
    await group.system.addMembers(
      tokens.filter(t => !(t.combatant?.group instanceof foundry.documents.CombatantGroup))
    );
  }

  /**
   * @this {HellpiercersTokenHUD}
   * @param {Event} ev
   * @param {HTMLElement} target
   */
  static async #swarmDelete(ev) {
    this.togglePalette("swarmActions", false);
    const group =
      this.object.combatant?.group?.type === "swarm"
        ? this.object.combatant.group
        : canvas.tokens.controlled.find(t => t.combatant?.group?.type === "swarm")?.combatant.group;
    if (ev.shiftKey) group.delete();
    else group.deleteDialog();
  }
}
