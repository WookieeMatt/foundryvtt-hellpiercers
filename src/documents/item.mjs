import { getSetting } from "../settings.mjs";
import { trySpendAction } from "../taccom/actions.mjs";

/** Which action an ability type costs when used. `null` means it costs no action. */
const ABILITY_COST = Object.freeze({
  attack: "main",
  limit: "main",
  active: "support",
  movement: null,
  passive: null,
  reversal: null,
  special: null,
});

export class HellpiercersItem extends Item {
  static getDefaultArtwork(itemData) {
    const model = CONFIG.Item.dataModels[itemData?.type];
    if (typeof model?.getDefaultArtwork === "function") return model.getDefaultArtwork(itemData);
    return { img: model?.DEFAULT_ICON ?? this.DEFAULT_ICON };
  }

  /**
   * The action this item costs when it is used.
   * @param {object} [options]
   * @param {"active" | "passive"} [options.part="active"]  Which half of a weapon to use
   * @returns {"main" | "support" | "aux" | null}
   */
  getActionCost({ part = "active" } = {}) {
    switch (this.type) {
      case "ability":
        return ABILITY_COST[this.system.action] ?? null;
      case "weapon":
        return part === "active" ? "main" : null;
      case "equipment":
        return "support";
      case "halo_weapon": {
        const action = this.system.secondary?.action;
        return ["main", "aux", "support"].includes(action) ? action : null;
      }
      default:
        return null;
    }
  }

  /** Whether the item has anything to use. */
  get isUsable() {
    switch (this.type) {
      case "ability":
        return !["passive"].includes(this.system.action);
      case "weapon":
        return !!(this.system.active?.name || this.system.active?.description);
      case "equipment":
      case "halo_weapon":
      case "halo_system":
        return true;
      default:
        return false;
    }
  }

  /**
   * Use this item: spend its action, pay its costs and post a chat card.
   * @param {object} [options]
   * @param {"active" | "passive"} [options.part="active"]  Which half of a weapon to use
   * @param {boolean} [options.spend=true]                  Spend the action in the combat tracker
   * @param {boolean} [options.chat=true]                   Post a chat card
   * @param {boolean} [options.force=false]                 Ignore resource requirements
   * @returns {Promise<foundry.documents.ChatMessage | null | false>} false if the use was refused
   */
  async use({ part = "active", spend = true, chat = true, force = false } = {}) {
    const actor = this.actor;
    if (!actor) return false;

    // Pay resources.
    if (!force) {
      if (this.type === "equipment" && this.system.available === false) {
        ui.notifications.warn(`${this.name} has already been used.`);
        return false;
      }
      if (this.type === "ability" && this.system.action === "reversal") {
        const left = actor.system.reversal_charges?.value ?? 0;
        if (left <= 0) {
          ui.notifications.warn(`${actor.name} has no Reversal charges left.`);
          return false;
        }
      }
      if (this.type === "ability" && this.system.action === "limit") {
        const { value, max } = actor.system.limit ?? {};
        if (max != null && value < max) {
          ui.notifications.warn(`${actor.name}'s Limit Break isn't ready (${value}/${max}).`);
          return false;
        }
      }
    }

    if (spend) {
      const cost = this.getActionCost({ part });
      if (cost && !(await trySpendAction(actor, cost))) return false;
    }

    const updates = [];
    if (this.type === "equipment") await this.update({ "system.available": false });
    if (this.type === "ability" && this.system.action === "reversal") {
      updates.push(["system.reversal_charges.value", actor.system.reversal_charges.value - 1]);
    }
    if (this.type === "ability" && this.system.action === "limit") {
      updates.push(["system.limit.value", 0]);
    }
    if (updates.length) await actor.update(Object.fromEntries(updates));
    await this.#applyAutomaticEffects();

    if (!chat || !getSetting("chatCards")) return null;
    return this.toChat({ part });
  }

  /** Gear whose whole effect is a status on the user: name -> [status, stacks]. */
  static AUTOMATIC_EFFECTS = {
    "expanded aggression rituals": [["aggression", 2]],
  };

  async #applyAutomaticEffects() {
    const effects = HellpiercersItem.AUTOMATIC_EFFECTS[this.name.toLowerCase()];
    for (const [status, stacks] of effects ?? []) await this.actor.applyStatus(status, stacks);
  }

  /**
   * Post this item to chat.
   * @param {object} [options]
   * @param {"active" | "passive"} [options.part="active"]
   */
  async toChat({ part = "active" } = {}) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const actor = this.actor;
    const rollData = actor?.getRollData?.() ?? {};

    let name = this.name;
    let body = "";
    switch (this.type) {
      case "weapon":
        name = this.system[part]?.name ? `${this.name}: ${this.system[part].name}` : this.name;
        body = this.system[part]?.description ?? "";
        break;
      case "ability":
      case "gear":
      case "equipment":
      case "halo_system":
      case "halo_weapon":
        body = this.system.effect ?? this.system.description ?? "";
        break;
      default:
        body = this.system.description ?? "";
    }
    const enriched = await TextEditor.enrichHTML(body, { rollData, relativeTo: this });

    const cost = this.getActionCost({ part });
    const costLabel = cost ? game.i18n.localize(`HELLPIERCERS.ACTION.${cost}`) : "";
    const typeLabel =
      this.type === "ability"
        ? game.i18n.localize(`HELLPIERCERS.ITEM.action.${this.system.action}`)
        : game.i18n.localize(`TYPES.Item.${this.type}`);

    const content = `
      <div class="hellpiercers ability-card" data-item-uuid="${this.uuid}">
        <header>
          <img src="${this.img}" alt="">
          <div class="titles">
            <h3>${foundry.utils.escapeHTML(name)}</h3>
            <span class="meta">${foundry.utils.escapeHTML(typeLabel)}${
              costLabel ? ` &middot; ${foundry.utils.escapeHTML(costLabel)}` : ""
            }</span>
          </div>
        </header>
        <div class="body">${enriched}</div>
      </div>`;
    const ChatMessage = getDocumentClass("ChatMessage");
    return ChatMessage.create({
      content,
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: { [game.system.id]: { abilityCard: true, itemUuid: this.uuid } },
    });
  }
}
