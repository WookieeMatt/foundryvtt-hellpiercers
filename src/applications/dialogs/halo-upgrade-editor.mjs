import { HaloUpgradeModel } from "../../data/halo-upgrade-model.mjs";

const { Application, HandlebarsApplicationMixin } = foundry.applications.api;

export class HaloUpgradeEditor extends HandlebarsApplicationMixin(Application) {
  static PARTS = {
    head: { template: "systems/hellpiercers/templates/dialogs/halo-upgrade-editor/head.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" },
  };
  static DEFAULT_OPTIONS = {
    tag: "form",
    window: { title: "HELLPIERCERS.DIALOG.HaloUpgradeEditor.title" },
    form: {
      handler: this.#formHandler,
      submitOnChange: false,
      closeOnSubmit: false,
    },
    classes: ["hellpiercers", "range-editor"],
    actions: {},
  };

  /** @type {HaloUpgradeModel} */
  #model;
  /** @type {((value: any) => void) | null} */
  #resolve = null;
  /** @type {((value: any) => void) | null} */
  #reject = null;

  /**
   * Static helper to get a promise that resoves to a new range with the changes applied
   * @returns {Promise<Range>}
   */
  static editUpgrade(upgrade) {
    const app = new this(upgrade);
    return new Promise((resolve, reject) => {
      app.#resolve = resolve;
      app.#reject = reject;
      app.render({ force: true });
    });
  }

  constructor(upgrade, options = {}) {
    super(options);
    this.#model = new HaloUpgradeModel(upgrade);
  }

  async _prepareContext() {
    return {
      model: this.#model,
      fields: this.#model.schema.fields,
      buttons: [{ type: "submit", name: "submit", icon: "fa-solid fa-save", label: "Save" }],
      rootId: this.id,
    };
  }

  async _preparePartContext(partId, ctx) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    if (partId === "head") {
      ctx.effect = {
        enriched: await TextEditor.enrichHTML(ctx.model.effect),
        value: ctx.model.effect,
        field: ctx.fields.effect,
      };
    }
    return ctx;
  }

  /** @this {HaloUpgradeEditor} */
  static async #formHandler(ev, _form, formData) {
    const data = formData.object;
    this.#model.updateSource(data);
    this.render();
    if (ev.type === "submit") {
      this.#resolve?.(this.#model);
      this.#reject = null;
      this.close();
    }
  }

  async _preClose() {
    this.#reject?.(new Error("Range Editor closed without saving"));
  }
}
