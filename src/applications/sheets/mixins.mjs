import { ACTION_TYPES } from "../../data/combatant.mjs";
import { findCombatant } from "../../taccom/actions.mjs";

const HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;

/**
 * @template T
 * @param {T} BaseSheet
 */
export const ToggleMixin = BaseSheet =>
  class ToggledSheet extends BaseSheet {
    /** @type {foundry.applications.types.ApplicationConfiguration} */
    static DEFAULT_OPTIONS = {
      actions: { toggleEditMode: ToggledSheet.#toggleLocked },
    };

    /**
     * Whether the sheet is unlocked via the header control
     * @type {boolean}
     */
    locked;

    _configureRenderOptions(opts) {
      super._configureRenderOptions(opts);
      if (opts?.renderContext === `create${this.document?.documentName}`) opts.locked = false;
      this.locked = opts?.locked ?? this.locked ?? true;
    }

    async _renderFrame(opts) {
      const html = await super._renderFrame(opts);
      if (!this.isEditable) return html;
      const header = html.querySelector(".window-title");
      const toggle = '<div class="slide-toggle header-control" data-action="toggleEditMode"></div>';
      header.insertAdjacentHTML("afterend", toggle);
      return html;
    }

    async _prepareContext(opts) {
      const ctx = await super._prepareContext(opts);
      ctx.editable &&= !this.locked;
      return ctx;
    }

    async _onRender(ctx, opts) {
      await super._onRender(ctx, opts);
      this.element.classList.toggle("locked", this.locked);
      this.element
        .querySelector(".window-header .slide-toggle")
        ?.classList.toggle("locked", this.locked);
    }

    // Drag/Drop

    _canDragStart(_selector) {
      return this.isEditable && !this.locked;
    }

    _canDragDrop(_selector) {
      return this.isEditable && !this.locked;
    }

    // Actions

    /** @this {ToggledSheet} */
    static async #toggleLocked() {
      this.render({ locked: !this.locked });
    }
  };

/**
 * @template T
 * @param {T} BaseSheet
 */
export const HellpiercersActorSheetMixin = BaseSheet =>
  class HellpiercersActorSheet extends HandlebarsApplicationMixin(BaseSheet) {
    /** @type {foundry.applications.types.ApplicationConfiguration} */
    static DEFAULT_OPTIONS = {
      classes: ["hellpiercers", "actor"],
      actions: {
        createEffect: HellpiercersActorSheet.#createEffect,
        editTags: HellpiercersActorSheet.#editTags,
        toggleEffect: HellpiercersActorSheet.#toggleEffect,
        useItem: HellpiercersActorSheet.#useItem,
        toggleAction: HellpiercersActorSheet.#toggleAction,
        adjustStatus: { handler: HellpiercersActorSheet.#adjustStatus, buttons: [0, 2] },
        addStatus: HellpiercersActorSheet.#addStatus,
        rezActor: HellpiercersActorSheet.#rezActor,
      },
      form: { submitOnChange: true, closeOnSubmit: false },
    };

    async _prepareContext(opts) {
      const ctx = await super._prepareContext(opts);
      Object.assign(ctx, {
        combatState: this._getCombatState(),
        statusChips: this._getStatusChips(),
        isDefeated: this.actor.statuses.has(CONFIG.specialStatusEffects.DEFEATED),
        actor: this.actor,
        system: this.actor.system,
        systemFields: this.actor.system.schema.fields,
        systemSource: this.actor.system._source,
      });
      return ctx;
    }

    async _preparePartContext(partId, ctx, opts) {
      Object.assign(ctx, await super._preparePartContext(partId, ctx, opts));
      ctx.tab = ctx.tabs[partId];
      if (partId === "effects") {
        ctx.effects = await this._getEffects();
      }
      if (partId === "biography") {
        ctx.biography = {
          field: ctx.systemFields.biography,
          enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            ctx.system.biography,
            {
              secrets: this.actor.isOwner,
              rollData: this.actor.getRollData.bind(this.actor),
            }
          ),
          value: ctx.system.biography,
        };
      }
      return ctx;
    }

    async _onFirstRender(ctx, opts) {
      await super._onFirstRender(ctx, opts);
      this._createContextMenu(this._getItemContextOptions, "[data-item-id] [data-context]", {
        eventName: "click",
        hookName: "getItemContextOptions",
        fixed: true,
      });
      this._createContextMenu(this._getEffectContextOptions, "[data-effect-id] [data-context]", {
        eventName: "click",
        hookName: "getEffectContextOptions",
        fixed: true,
      });
    }

    async _onRender(ctx, opts) {
      await super._onRender(ctx, opts);
      // Drag/Drop handler for attack buttons only
      new foundry.applications.ux.DragDrop.implementation({
        dragSelector: '[data-action="onAttack"]',
        dropSelector: '[data-action="onAttack"]',
        permissions: {
          dragstart: function () {
            return this.isEditable;
          }.bind(this),
          drop: () => false,
        },
        callbacks: {
          dragstart: /** @param {DragEvent} event */ function (event) {
            /** @type {HTMLElement} */
            const target = event.currentTarget;
            /** @type {string} */
            const itemId = target.closest("[data-item-id]")?.dataset.itemId;
            const uuid = this.actor.items.get(itemId)?.uuid ?? this.actor.uuid;
            event.dataTransfer.setData("text/plain", JSON.stringify({ type: "attackmacro", uuid }));
          }.bind(this),
        },
      }).bind(this.element);
      for (const input of this.element.querySelectorAll(".charge-input")) {
        /** @type {HTMLInputElement} */ (input).addEventListener(
          "change",
          HellpiercersActorSheet.#onEditItemCounter.bind(this)
        );
      }
    }

    /** @param {foundry.applications.types.ApplicationPosition} pos  */
    _prePosition(pos) {
      super._prePosition(pos);
      pos.width = 600;
      pos.height = Math.max(450, pos.height);
    }

    /** @returns {import("@client/applications/ux/context-menu.mjs").ContextMenuEntry[]} */
    _getItemContextOptions() {
      return [
        {
          label: "HELLPIERCERS.ACTOR.SHEET.context.open",
          icon: '<i class="fas fa-file"></i>',
          onClick: (_ev, html) => {
            const { itemId } = html.closest("[data-item-id]")?.dataset ?? {};
            const doc = this.actor.items.get(itemId) ?? null;
            doc?.sheet.render({
              force: true,
              locked: true,
              position: { top: this.position.top + 40, left: this.position.left + 10 },
            });
          },
        },
        {
          label: "Edit",
          icon: '<i class="fa-solid fa-edit"></i>',
          onClick: (_ev, html) => {
            const { itemId } = html.closest("[data-item-id]")?.dataset ?? {};
            const doc = this.actor.items.get(itemId) ?? null;
            doc?.sheet.render({
              force: true,
              locked: false,
              position: { top: this.position.top + 40, left: this.position.left + 10 },
            });
          },
          visible: () => this.isEditable,
        },
        {
          label: "Delete",
          icon: '<i class="fas fa-trash"></i>',
          onClick: (_ev, html) => {
            const { itemId } = html.closest("[data-item-id]")?.dataset ?? {};
            const doc = this.actor.items.get(itemId) ?? null;
            doc?.deleteDialog({
              position: { top: this.position.top + 40, left: this.position.left + 10 },
            });
          },
          visible: () => this.isEditable && !this.locked,
        },
      ];
    }

    /** @returns {import("@client/applications/ux/context-menu.mjs").ContextMenuEntry[]} */
    _getEffectContextOptions() {
      const effect = html => {
        const effectUuid = html.closest("[data-effect-uuid]")?.dataset.effectUuid;
        return fromUuid(effectUuid, { relative: this.actor });
      };
      return [
        {
          label: "HELLPIERCERS.ACTOR.SHEET.context.open",
          icon: '<i class="fas fa-file"></i>',
          onClick: (_ev, html) =>
            effect(html).then(doc => {
              doc?.sheet.render({
                force: true,
                position: { top: this.position.top + 40, left: this.position.left + 10 },
              });
            }),
        },
        {
          label: "Delete",
          icon: '<i class="fas fa-trash"></i>',
          onClick: (_ev, html) => {
            effect(html).then(doc =>
              doc?.deleteDialog({
                position: { top: this.position.top + 40, left: this.position.left + 10 },
              })
            );
          },
          visible: html => {
            const { effectId } = html.closest("[data-effect-id]")?.dataset ?? {};
            return (
              !!this.actor.getEmbeddedDocument("ActiveEffect", effectId) &&
              this.isEditable &&
              !this.locked
            );
          },
        },
      ];
    }

    async _getEffects() {
      const ctx = {
        temporary: [],
        items: [],
        effects: [],
      };
      for (const effect of this.document.allApplicableEffects()) {
        if (effect.parent !== this.document)
          ctx.items.push({
            effect,
            uuid: foundry.utils.buildRelativeUuid(effect, this.actor),
            link: effect.parent.toAnchor().outerHTML,
          });
        else if (effect.isTemporary)
          ctx.temporary.push({ effect, uuid: foundry.utils.buildRelativeUuid(effect, this.actor) });
        else
          ctx.effects.push({ effect, uuid: foundry.utils.buildRelativeUuid(effect, this.actor) });
      }
      return ctx;
    }

    /**
     * The state of this actor's combatant, used to render the action tracker in the sheet header.
     * @returns {{ active: boolean, actions: Array<{ id: string, spent: boolean, label: string, hint: string, blocked: boolean }>, haste: number } | null}
     */
    _getCombatState() {
      if (!game.settings.get(game.system.id, "trackActions")) return null;
      const combatant = findCombatant(this.actor);
      if (!combatant) return null;
      const actions = ACTION_TYPES.map(id => {
        const check = combatant.system.checkAction(id);
        return {
          id,
          spent: !!combatant.system.actions[id],
          blocked: !check.ok && check.reason !== "spent",
          label: game.i18n.localize(`HELLPIERCERS.ACTIONS.${id}.label`),
          hint: game.i18n.localize(`HELLPIERCERS.ACTIONS.${id}.hint`),
        };
      });
      return {
        active: combatant.combat.combatant === combatant,
        actions,
        haste: this.actor.getStatusStacks("haste"),
      };
    }

    /**
     * Status chips shown on the sheet: one per status with its total stacks.
     * @returns {Array<{ id: string, name: string, img: string, stacks: number | null, description: string }>}
     */
    _getStatusChips() {
      const chips = new Map();
      for (const effect of this.actor.effects) {
        for (const id of effect.statuses) {
          const config = CONFIG.statusEffects[id];
          if (!config || config.hud === false) continue;
          const chip = chips.get(id) ?? {
            id,
            name: game.i18n.localize(config.name),
            img: config.img,
            stacks: 0,
            overlay: !!foundry.utils.getProperty(config, "flags.core.overlay"),
            description: config.description ?? "",
          };
          chip.stacks += effect.system.stacks ?? 1;
          chips.set(id, chip);
        }
      }
      return [...chips.values()].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Actions

    /**
     * Use an item from the sheet.
     * @this {HellpiercersActorSheet}
     * @param {MouseEvent} ev
     * @param {HTMLElement} target
     */
    static async #useItem(ev, target) {
      const itemId = target.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (!item) return;
      await item.use({
        part: target.dataset.part ?? "active",
        force: ev.shiftKey && game.user.isGM,
      });
    }

    /**
     * Toggle an action pip: spend it, or give it back.
     * @this {HellpiercersActorSheet}
     * @param {MouseEvent} _ev
     * @param {HTMLElement} target
     */
    static async #toggleAction(_ev, target) {
      const combatant = findCombatant(this.actor);
      const id = target.dataset.actionId;
      if (!combatant || !ACTION_TYPES.includes(id) || !this.actor.isOwner) return;
      if (combatant.system.actions[id]) await combatant.system.refundAction(id);
      else await combatant.system.spendAction(id, { force: game.user.isGM });
    }

    /**
     * Add or remove a stack of a status from a chip. Left click adds, right click removes.
     * @this {HellpiercersActorSheet}
     * @param {MouseEvent} ev
     * @param {HTMLElement} target
     */
    static async #adjustStatus(ev, target) {
      if (!this.actor.isOwner) return;
      const id = target.dataset.statusId;
      if (ev.button === 2 || ev.shiftKey) await this.actor.removeStatus(id, 1);
      else await this.actor.applyStatus(id, 1);
    }

    /**
     * Pick a status to add to the actor.
     * @this {HellpiercersActorSheet}
     */
    static async #addStatus() {
      if (!this.actor.isOwner) return;
      const options = Object.values(CONFIG.statusEffects)
        .filter(s => s.hud !== false && !foundry.utils.getProperty(s, "flags.core.overlay"))
        .map(s => ({ value: s.id, label: game.i18n.localize(s.name) }))
        .sort((a, b) => a.label.localeCompare(b.label));
      const select = foundry.applications.fields.createSelectInput({
        name: "status",
        options,
        blank: false,
      });
      const stacks = foundry.applications.fields.createNumberInput({
        name: "stacks",
        value: 1,
        min: 1,
        step: 1,
      });
      const content = document.createElement("div");
      content.append(
        foundry.applications.fields.createFormGroup({
          label: "HELLPIERCERS.ACTOR.SHEET.status.label",
          input: select,
          localize: true,
        }),
        foundry.applications.fields.createFormGroup({
          label: "HELLPIERCERS.ACTOR.SHEET.status.stacks",
          input: stacks,
          localize: true,
        })
      );
      const result = await foundry.applications.api.Dialog.input({
        window: { title: "HELLPIERCERS.ACTOR.SHEET.actions.addStatus", icon: "fa-solid fa-plus" },
        content,
        classes: ["hellpiercers", "status-picker"],
      });
      if (result?.status) await this.actor.applyStatus(result.status, Number(result.stacks) || 1);
    }

    /** @this {HellpiercersActorSheet} */
    static async #rezActor() {
      if (!this.actor.isOwner) return;
      await this.actor.rez();
      await ChatMessage.create({
        content: `<div class="hellpiercers turn-note"><header>${game.i18n.format("HELLPIERCERS.TACCOM.rez", { name: foundry.utils.escapeHTML(this.actor.name) })}</header></div>`,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flags: { [game.system.id]: { turnNote: true } },
      });
    }

    /** @this {HellpiercersActorSheet} */
    static async #editTags(_ev, target) {
      if (!this.isEditable) return;
      const content = document.createElement("div");
      content.append(
        this.actor.system.schema.fields.tags.toInput({ value: this.actor.system.tags })
      );
      const newVal = await foundry.applications.api.Dialog.input({
        window: { title: `Edit tags for ${this.actor.name}` },
        classes: ["hellpiercers", "tag-editor"],
        content,
        id: `${this.actor.uuid}-tag-editor`,
        position: {
          top: target.getBoundingClientRect().top - 60,
          left: target.getBoundingClientRect().left - 150,
          width: 300,
        },
      });
      if (newVal) await this.actor.update(newVal);
    }

    /** @this {HellpiercersActorSheet} */
    static async #createEffect() {
      if (!this.isEditable) return;
      const cls = getDocumentClass("ActiveEffect");
      cls.createDialog(
        { img: "icons/svg/aura.svg" },
        { parent: this.document },
        { position: { top: this.position.top + 40, left: this.position.left + 10 } }
      );
    }

    /**
     * @this {HellpiercersActorSheet}
     * @param {MouseEvent} _ev
     * @param {HTMLElement} target
     */
    static async #toggleEffect(_ev, target) {
      const effectUuid = target.closest("[data-effect-uuid]")?.dataset.effectUuid;
      const effect = fromUuidSync(effectUuid, { relative: this.actor });
      effect.update({ disabled: !effect.disabled });
    }

    /**
     * @this {HellpiercersActorSheet}
     * @param {InputEvent} ev
     */
    static async #onEditItemCounter(ev) {
      /** @type {HTMLInputElement} */
      const target = ev.currentTarget;
      const val = parseInt(target.value);
      const itemId = target.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      await item?.update({ "system.counter.value": val });
    }
  };

/**
 * @template T
 * @param {T} BaseSheet
 */
export const HellpiercersItemSheetMixin = BaseSheet =>
  class HellpiercersItemSheet extends HandlebarsApplicationMixin(BaseSheet) {
    /** @type {foundry.applications.types.ApplicationConfiguration} */
    static DEFAULT_OPTIONS = {
      classes: ["hellpiercers", "item"],
      actions: { createEffect: HellpiercersItemSheet.#createEffect },
      form: { submitOnChange: true, closeOnSubmit: false },
      position: { width: 500 },
    };

    async _prepareContext(opts) {
      const ctx = await super._prepareContext(opts);
      Object.assign(ctx, {
        item: this.item,
        actor: this.item.actor,
        system: this.document.system,
        systemFields: this.document.system.schema.fields,
        systemSource: this.document.system._source,
      });
      return ctx;
    }

    async _preparePartContext(partId, ctx, opts) {
      Object.assign(ctx, await super._preparePartContext(partId, ctx, opts));
      ctx.tab = ctx.tabs[partId];
      if (partId === "header") {
        ctx.description = await this._prepareHeaderContext();
      }
      if (partId === "effects") {
        ctx.effects = this.item.effects;
      }
      return ctx;
    }

    async _prepareHeaderContext() {
      if (!this.item.system.schema.fields.description) return null;
      const description = {
        field: this.item.system.schema.fields.description,
        enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.item.system.description,
          {
            secrets: this.item.isOwner,
            rollData: this.actor?.getRollData.bind(this.actor),
          }
        ),
        value: this.item.system.description,
      };
      return description;
    }

    async _onFirstRender(ctx, opts) {
      await super._onFirstRender(ctx, opts);
      this._createContextMenu(this._getEffectContextOptions, "[data-effect-id] [data-context]", {
        eventName: "click",
        hookName: "getEffectContextOptions",
        fixed: true,
      });
    }

    /** @returns {import("@client/applications/ux/context-menu.mjs").ContextMenuEntry[]} */
    _getEffectContextOptions() {
      const effect = html => {
        const effectId = html.closest("[data-effect-id]")?.dataset.effectId;
        return this.item.effects.get(effectId);
      };
      return [
        {
          label: "HELLPIERCERS.ACTOR.SHEET.context.open",
          icon: '<i class="fas fa-file"></i>',
          onClick: (_ev, html) =>
            effect(html)?.sheet.render({
              force: true,
              position: { top: this.position.top + 40, left: this.position.left + 10 },
            }),
        },
        {
          label: "Delete",
          icon: '<i class="fas fa-trash"></i>',
          onClick: (_ev, html) => {
            effect(html)?.deleteDialog({
              position: { top: this.position.top + 40, left: this.position.left + 10 },
            });
          },
          visible: () => this.isEditable && !this.locked,
        },
      ];
    }

    // Actions

    /** @this {HellpiercersItemSheet} */
    static async #createEffect() {
      if (!this.isEditable) return;
      const cls = getDocumentClass("ActiveEffect");
      cls.createDialog(
        { img: this.item.img },
        { parent: this.item },
        { position: { top: this.position.top + 40, left: this.position.left + 10 } }
      );
    }
  };
