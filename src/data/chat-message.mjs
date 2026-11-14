import { Damage } from "./damage.mjs";

export class DamageMessageModel extends foundry.abstract.TypeDataModel {
  static TEMPLATE = "systems/hellpiercers/templates/chat/damage.hbs";
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      damage: new fields.EmbeddedDataField(Damage, { nullable: false }),
      targets: new fields.ArrayField(new fields.DocumentUUIDField({ type: "Token" })),
      handled: new fields.TypedObjectField(new fields.BooleanField()),
    };
  }

  _preUpdate(changes) {
    if ("handled" in (changes.system ?? {})) {
      for (const k of Object.keys(changes.system.handled)) {
        const group = this.#prepareTargets().find(t => t.uuid === k.replaceAll("-", "."));
        for (const id of group?.units ?? []) {
          changes.system.handled[id.replaceAll(".", "-")] = true;
        }
      }
    }
  }

  /** @param {HTMLElement} html */
  #addListeners(html) {
    html.addEventListener("click", event => {
      /** @type {HTMLElement} */
      const target = event.target;
      const targetButton = target.closest("[data-chat-action]");
      if (targetButton) this.#onClickAction(event, targetButton);
    });
    /** @param {HTMLLIElement} li @returns {foundry.canvas.placeables.Token[]} */
    const getTokens = li => li.dataset.targetTokens.split(",").map(t => fromUuidSync(t).object);
    for (const target of html.querySelectorAll("li.target")) {
      target.addEventListener("mouseenter", event => {
        /** @type {HTMLLIElement} */
        const li = event.currentTarget;
        for (const token of getTokens(li)) {
          token._onHoverIn(event, { hoverOutOthers: false });
        }
      });
      target.addEventListener("mouseleave", event => {
        /** @type {HTMLLIElement} */
        const li = event.currentTarget;
        for (const token of getTokens(li)) {
          token._onHoverOut(event);
        }
      });
    }
  }

  /**
   * @param {MouseEvent} event
   * @param {HTMLElement} targetButton
   */
  async #onClickAction(event, targetButton) {
    event.stopPropagation();
    const chatAction = targetButton.dataset.chatAction;
    const li = targetButton.closest("[data-target-uuid]");
    switch (chatAction) {
      case "applyswarm":
        await this.damage.applyGroup(
          await fromUuid(li.dataset.targetUuid),
          li.dataset.targetTokens.split(","),
          { message: this.parent }
        );
        break;
      case "applytoken":
        await this.damage.apply(await fromUuid(li.dataset.targetUuid), { message: this.parent });
        break;
    }
  }

  async renderHTML({ canDelete, canClose, ...rest } = {}) {
    const conditions = [];
    for (const k in this.damage.conditions) {
      const condition = foundry.utils.duplicate(CONFIG.statusEffects.find(e => e.id === k));
      condition.value = this.damage.conditions[k] === true ? 1 : this.damage.conditions[k];
      conditions.push(condition);
    }
    const qualities = Object.entries(this.damage.qualities).reduce((arr, [k, v]) => {
      if (v) arr.push(`HELLPIERCERS.DAMAGE.FIELDS.qualities.${k}.label`);
      return arr;
    }, []);

    // Construct message data
    const isWhisper = this.parent.whisper.length;
    const sourceDoc = fromUuidSync(this.damage.source);
    const item = sourceDoc?.documentName === "Item" ? sourceDoc : null;
    const actor = item?.parent ?? sourceDoc;

    const messageData = {
      ...rest,
      title: {
        actor: actor?.name,
        item:
          item?.name ?? ((actor?.type === "minion" ? actor.system.strike.name : "") || "Strike"),
      },
      damage: this.damage,
      conditions,
      qualities,
      roll: this.parent.rolls[0],
      rolldata: await this.parent.rolls[0].render(),
      canDelete: canDelete ?? game.user.isGM,
      canClose,
      message: this.parent,
      user: game.user,
      author: this.parent.author,
      speakerActor: this.parent.speakerActor,
      alias: this.parent.alias,
      cssClass: ["ic", isWhisper ? "whisper" : null, this.blind ? "blind" : null].filterJoin(" "),
      isWhisper: this.parent.whisper.length,
      whisperTo: this.parent.whisper.map(u => game.users.get(u)?.name).filterJoin(", "),
      borderColor: this.parent.author?.color.css,
      targets: this.#prepareTargets(),
    };

    // Render the chat message
    let html = await foundry.applications.handlebars.renderTemplate(
      DamageMessageModel.TEMPLATE,
      messageData
    );
    html = foundry.utils.parseHTML(html);
    this.#addListeners(html);

    return html;
  }

  #prepareTargets() {
    const context = [];
    for (const token of this.targets.map(fromUuidSync)) {
      if (!(token instanceof foundry.documents.TokenDocument)) continue;
      if (token.combatant?.group?.type === "swarm") {
        const group = context.find(row => row.uuid === token.combatant.group.uuid);
        if (group) {
          group.count++;
          group.units.push(token.uuid);
        } else {
          const swarm = token.combatant.group;
          context.push({
            type: "swarm",
            uuid: swarm.uuid,
            name: swarm.name || swarm.members.first().actor?.name,
            img: swarm.members.first()?.actor.img,
            owner: swarm.isOwner,
            count: 1,
            units: [token.uuid],
            handled: this.handled[swarm.uuid.replaceAll(".", "-")] ?? false,
          });
        }
      } else {
        context.push({
          type: "token",
          uuid: token.uuid,
          name: token.name,
          img: token.actor.img,
          owner: token.isOwner,
          units: [token.uuid],
          handled: this.handled[token.uuid.replaceAll(".", "-")] ?? false,
        });
      }
    }
    return context;
  }
}

export class ResponseMessageModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      payload: new fields.StringField(),
      message: new fields.DocumentIdField({ nullable: true, initial: null }),
    };
  }

  _onCreate() {
    const message = game.messages.get(this.message);
    if (!message || !message.isOwner) return;
    switch (message.type) {
      case "damage": {
        const handled = this.payload.split(",").reduce((h, id) => {
          h[id.replaceAll(".", "-")] = true;
          return h;
        }, {});
        message.update({ "system.handled": handled });
        break;
      }
      default:
        message.update({ "system.handled": true });
        break;
    }
  }
}
