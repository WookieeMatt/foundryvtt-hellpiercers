import { Damage } from "../../data/damage.mjs";

const { Application, HandlebarsApplicationMixin } = foundry.applications.api;

export class DamageEditor extends HandlebarsApplicationMixin(Application) {
  static PARTS = {
    head: { template: "systems/hellpiercers/templates/dialogs/damage-editor/head.hbs" },
    conditions: { template: "systems/hellpiercers/templates/dialogs/damage-editor/conditions.hbs" },
    modifiers: { template: "systems/hellpiercers/templates/dialogs/damage-editor/modifiers.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" },
  };
  static DEFAULT_OPTIONS = {
    tag: "form",
    window: { title: "HELLPIERCERS.DIALOG.DamageEditor.title" },
    position: { width: "275" },
    form: {
      handler: this.#formHandler,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    classes: ["hellpiercers", "damage-editor"],
    actions: { addCondition: this.#addCondition, removeCondition: this.#removeCondition },
  };

  /** @type {Damage} */
  #damage;
  /** @type {((value: any) => void) | null} */
  #resolve = null;
  /** @type {((value: any) => void) | null} */
  #reject = null;

  /**
   * Static helper to get a promise that resoves to a new range with the changes applied
   * @returns {Promise<Damage>}
   */
  static editDamage(damage) {
    const app = new this(damage ?? {});
    return new Promise((resolve, reject) => {
      app.#resolve = resolve;
      app.#reject = reject;
      app.render(true);
    });
  }

  constructor(damage, options = {}) {
    super(options);
    this.#damage = new Damage(damage);
  }

  async _prepareContext() {
    return {
      damage: this.#damage,
      fields: this.#damage.schema.fields,
      buttons: [{ type: "submit", name: "submit", icon: "fa-solid fa-save", label: "Save" }],
      rootId: this.id,
    };
  }

  async _preparePartContext(partId, ctx) {
    if (partId === "conditions") {
      ctx.conditions = { choices: this.#getConditionSelectOpts() };
    }
    return ctx;
  }

  #getConditionSelectOpts() {
    const choices = [];
    for (const effect of CONFIG.statusEffects) {
      if (effect.flags?.core?.overlay) continue;
      choices.push({ value: effect.id, label: effect.name });
    }
    return choices;
  }

  /** @this {DamageEditor} */
  static async #addCondition() {
    const cond_list = this.element.querySelector("ol.condition-inputs");
    const idx = cond_list.querySelectorAll("li[data-index]").length;
    const li = document.createElement("li");
    li.dataset.index = idx;
    li.classList.add("flexrow");
    const control = document.createElement("a");
    control.classList.add("control");
    control.dataset.action = "removeCondition";
    control.innerHTML = '<i class="fa-solid fa-minus"></i>';
    li.append(
      foundry.applications.fields.createSelectInput({
        name: `c.${idx}.id`,
        options: this.#getConditionSelectOpts(),
        localize: true,
      }),
      foundry.applications.fields.createNumberInput({ name: `c.${idx}.value`, value: 1 }),
      control
    );
    cond_list.append(li);
    await li.animate(
      [
        { height: "0px", opacity: "0" },
        { height: "32px", opacity: "1" },
      ],
      { duration: 150 }
    ).finished;
    this.setPosition();
  }

  /**
   * @param {Event} _ev
   * @param {HTMLElement} target
   * @this {DamageEditor}
   */
  static async #removeCondition(_ev, target) {
    const li = target.closest("[data-index]");
    await li.animate(
      [
        { height: "32px", opacity: "1" },
        { height: "0px", opacity: "0" },
      ],
      { duration: 150 }
    ).finished;
    li.remove();
    this.element.querySelectorAll("ol.condition-inputs li[data-index]").forEach((e, i) => {
      e.dataset.index = i;
      e.querySelector("select").setAttribute("name", `c.${i}.id`);
      e.querySelector("input").setAttribute("name", `c.${i}.value`);
    });
  }

  /** @this {DamageEditor} */
  static async #formHandler(_ev, _form, formData) {
    const data = formData.object;
    const conditions = {};
    for (const condition of Object.values(foundry.utils.expandObject(data).c ?? {})) {
      conditions[condition.id] = condition.value;
    }
    this.#damage.updateSource({ conditions }, { recursive: false });
    this.#damage.updateSource(data);
    this.#resolve?.(this.#damage);
    this.#reject = null;
  }

  async _preClose() {
    this.#reject?.(new Error("Range Editor closed without saving"));
  }
}
