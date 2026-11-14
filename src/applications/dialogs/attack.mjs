import { Damage } from "../../data/damage.mjs";
import { tint } from "../../integrations/dice.mjs";
import { trySpendAction } from "../../taccom/actions.mjs";
import { expendTiles, swarmAttackPlan } from "../../taccom/swarm.mjs";

const { Application, HandlebarsApplicationMixin } = foundry.applications.api;

export class AttackHud extends HandlebarsApplicationMixin(Application) {
  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    window: { title: "HELLPIERCERS.DIALOG.AttackDialog.title", frame: false, positioned: false },
    id: "attack-hud",
    classes: ["hellpiercers", "attack-dialog", "application"],
    actions: {
      cancel() {
        this.close();
      },
      confirm: this.#confirm,
      placeTemplate: this.#placeTemplate,
      switchProfile: AttackHud.#switchProfile,
    },
  };

  /** @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>} */
  static PARTS = {
    header: { template: "systems/hellpiercers/templates/dialogs/attack/header.hbs" },
    main: { template: "systems/hellpiercers/templates/dialogs/attack/main.hbs" },
    footer: { template: "templates/generic/form-footer.hbs", classes: ["flexrow"] },
  };

  /**
   * Show the attack hud for an attack
   */
  attack({ actor, item, attack }, options = {}) {
    const { resolve, promise } = Promise.withResolvers();
    this.#resolve = resolve;
    this.sourceItem = item?.id ? item : fromUuidSync(item);
    this.sourceActor = actor?.id ? actor : (fromUuidSync(actor) ?? this.sourceItem?.actor);
    if (attack) {
      this.#attack = attack;
    } else if (["weapon", "ability", "halo_weapon"].includes(this.sourceItem?.type)) {
      this.#attack = this.sourceItem.system.attack;
    } else if (this.sourceActor?.type === "minion") {
      this.#attack = this.sourceActor.system.strike;
    } else if (this.sourceActor?.type === "halo") {
      this.#attack = this.sourceActor.system.standard_armament;
    }
    this.render({ ...options, force: true });
    return promise;
  }

  /** @type {import("../../data/attack.mjs").Attack} */
  #attack = null;
  #resolve = () => {};
  // #reject = () => {};
  /** @type {number} */
  #targetHook;

  /** @param {HTMLElement} element  */
  _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else document.getElementById("ui-right-column-1").append(element);
  }

  async _prepareContext() {
    return {
      attacker: this.sourceActor,
      item: this.sourceItem,
      attack: this.#attack,
      aoe: !["arc", "blob", "targets"].includes(this.#attack.range.kind),
      targets: game.user.targets,
      buttons: [
        { type: "button", label: "Confirm", icon: "fa-solid fa-check", action: "confirm" },
        { type: "button", label: "Cancel", icon: "fa-solid fa-cancel", action: "cancel" },
      ],
      hasProfiles: this.sourceItem?.type === "weapon" && this.sourceItem.system.attacks.length > 1,
    };
  }

  async _preFirstRender(ctx, opts) {
    await super._preFirstRender(ctx, opts);
    this.#targetHook = Hooks.on("targetToken", user => {
      if (user.id !== game.userId) return;
      this.render({ force: false });
    });
  }

  async _onFirstRender(ctx, opts) {
    if (opts.animate !== false) this.element.classList.add("opening");
    await super._onFirstRender(ctx, opts);
  }

  async _onRender(ctx, opts) {
    await super._onRender(ctx, opts);
    /** @type {HTMLElement} */
    const element = this.element;
    const target_divs = element.querySelectorAll("div.target");
    for (const div of target_divs) {
      div.addEventListener("mouseenter", ev => {
        const { tokenId } = ev.target.dataset;
        const token = canvas.tokens.get(tokenId);
        token?._onHoverIn(ev, { hoverOutOthers: true });
      });
      div.addEventListener("mouseleave", ev => {
        const { tokenId } = ev.target.dataset;
        const token = canvas.tokens.get(tokenId);
        token?._onHoverOut(ev);
      });
    }
  }

  async _postRender(ctx, opts) {
    await super._postRender(ctx, opts);
    setTimeout(() => this.element.classList.remove("opening"), 25);
  }

  async _preClose(opts) {
    await super._preClose(opts);
    this.#resolve();
  }

  _tearDown(opts) {
    super._tearDown(opts);
    Hooks.off("targetToken", this.#targetHook);
    this.#resolve = () => {};
  }

  /** @this {AttackHud} */
  static async #confirm() {
    // Attacking costs the action of the item that makes the attack (a Main Action for weapons).
    const cost = this.sourceItem?.getActionCost?.() ?? "main";
    if (this.sourceActor && !(await trySpendAction(this.sourceActor, cost))) return;

    const targets = game.user.targets.map(t => t.document.uuid);
    const baseFormula = this.#attack.damage.formula.replace(
      "@charge",
      `@counters.${this.sourceItem?.id}.value`
    );

    // A Swarm attacks once per adjacent tile, each gaining +1 damage per adjacent tile.
    const plan =
      this.sourceActor?.type === "minion" && game.user.targets.size === 1
        ? swarmAttackPlan(this.sourceActor, game.user.targets.first().document)
        : null;
    const bonuses = plan ? plan.bonuses : [0];

    Hooks.callAll("hellpiercers.attack", {
      actor: this.sourceActor,
      item: this.sourceItem,
      attack: this.#attack,
      targets: game.user.targets.map(t => t.document),
    });

    for (const bonus of bonuses) {
      const formula = bonus ? `${baseFormula} + ${bonus}` : baseFormula;
      const roll = await tint(
        new foundry.dice.Roll(formula, this.sourceActor.getRollData()),
        "damage"
      ).evaluate();
      const damageData = this.#attack.damage.toObject();
      if (bonus) damageData.formula = formula;
      damageData.roll = JSON.stringify(roll.toJSON());
      damageData.source = this.sourceItem?.uuid ?? this.sourceActor.uuid;
      damageData.value = roll.total;
      await new Damage(damageData).toMessage(roll, targets);
    }
    if (plan && plan.expended > 0) {
      const attackerToken =
        this.sourceActor.token ?? this.sourceActor.getActiveTokens(true, true)[0];
      const expended = await expendTiles(plan, attackerToken);
      const left = plan.expended - expended;
      const done = expended ? `${expended} tile${expended === 1 ? "" : "s"} expended.` : "";
      const todo =
        left > 0
          ? ` The Swarm must still expend ${left} adjacent tile${left === 1 ? "" : "s"}: remove them from the Swarm.`
          : "";
      await ChatMessage.create({
        content: `<div class="hellpiercers turn-note"><header>Swarm attack</header><p>${plan.attacks} attacks (${plan.adjacent} tiles adjacent). ${done}${todo}</p></div>`,
        speaker: ChatMessage.getSpeaker({ actor: this.sourceActor }),
      });
    }
    this.close();
  }

  /**
   * @this {AttackHud}
   * @param {HTMLButtonElement} target
   */
  static async #placeTemplate(_ev, target) {
    const range = this.#attack.range;
    range.updateSource({ "modifiers.scale": this.sourceActor?.system.scale ?? 1 });
    target.disabled = true;
    await hellpiercers.util
      .placeTemplate(range, { actor: this.sourceActor, flags: { "hellpiercers.attack": true } })
      .then(hellpiercers.util.setTargets)
      .catch(() => {});
    if (target.disabled) target.disabled = false;
  }

  /**
   * @this {AttackHud}
   * @param {HTMLButtonElement} target
   */
  static async #switchProfile(_ev, target) {
    const delta = parseInt(target.dataset.delta);
    await this.sourceItem.system.changeAttack(delta, { delta: true });
    this.#attack = this.sourceItem.system.attack;
    this.render();
  }
}

import.meta.hot?.accept(({ AttackHud }) => {
  CONFIG.ui.attackHud = AttackHud;
  const sourceItem = ui.attackHud.sourceItem;
  const sourceActor = ui.attackHud.sourceActor;
  const rendered = ui.attackHud.rendered;
  ui.attackHud.close({ animate: false });
  ui.attackHud = new CONFIG.ui.attackHud();
  if (rendered) ui.attackHud.attack({ actor: sourceActor, item: sourceItem }, { animate: false });
});
