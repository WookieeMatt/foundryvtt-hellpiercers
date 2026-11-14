import { endRound, endTurn, startRound, startTurn } from "../taccom/engine.mjs";

export class HellpiercersCombat extends foundry.documents.Combat {
  /**
   * Direction of the most recent update (1 = forwards, -1 = rewind). Rewinding must never resolve
   * end-of-turn effects like Poison a second time.
   * @type {number}
   */
  #direction = 1;

  /** @override */
  getTimeDelta(fromRound, fromTurn, toRound, toTurn) {
    const rounds = Math.max(toRound, 1) - Math.max(fromRound, 1);
    let turns = Math.max(rounds - 1, 0) * this.turns.length;
    if (fromTurn == null && toTurn != null) turns += 1;
    return rounds * CONFIG.time.roundTime + turns * CONFIG.time.turnTime;
  }

  /** @override */
  async startCombat() {
    this._playCombatSound("startEncounter");
    for (const c of this.combatants) {
      c.updateSource({
        "system.activations.value":
          this.settings.skipDefeated && c.isDefeated ? 0 : c.system.activations.max,
      });
    }
    const combatants = this.combatants.toObject();
    const updateData = { round: 1, turn: null, combatants: _replace(combatants) };
    const updateOptions = { direction: 1 };
    Hooks.callAll("combatStart", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    await foundry.documents.ActiveEffect.registry.refresh("combatStart", { combat: this });
    return this;
  }

  /** @override */
  async nextRound() {
    for (const c of this.combatants) {
      c.updateSource({
        "system.activations.value":
          this.settings.skipDefeated && c.isDefeated ? 0 : c.system.activations.max,
      });
    }
    const nextRound = this.round + 1;
    const advanceTime = this.getTimeDelta(this.round, this.turn, nextRound, null);

    const combatants = this.combatants.toObject();
    const updateData = { round: nextRound, turn: null, combatants: _replace(combatants) };
    const updateOptions = { direction: 1, worldTime: { delta: advanceTime } };
    Hooks.callAll("combatRound", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /** @override */
  async previousRound() {
    if (this.round === 0) return this;
    const previousRound = this.round - 1;
    const advanceTime = this.getTimeDelta(this.round, this.turn, previousRound, null);

    const updateData = { round: previousRound, turn: null };
    const updateOptions = { direction: -1, worldTime: { delta: advanceTime } };
    Hooks.callAll("combatRound", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /** @override */
  async nextTurn() {
    if (this.round === 0) return this.startCombat();

    const advanceTime = this.getTimeDelta(this.round, this.turn, this.round, null);
    const updateData = { round: this.round, turn: null };
    const updateOptions = { direction: 0, worldTime: { delta: advanceTime } };
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /** @override */
  async previousTurn() {
    if (this.round === 0) return this;
    this.turns[this.turn]?.updateSource({
      "system.activations.value": this.turns[this.turn].system.activations.value + 1,
    });

    const advanceTime = -this.getTimeDelta(this.round, null, this.round, this.turn);
    const combatants = this.combatants.toObject();
    const updateData = { round: this.round, turn: null, combatants: _replace(combatants) };
    const updateOptions = { direction: -1, worldTime: { delta: advanceTime } };
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /**
   * Set the current turn to the specified combatant
   * @param {foundry.documents.Combatant | string} combatant  The combatant to activate or its id
   */
  async activateCombatant(combatant) {
    /**@type {string}*/
    const id = combatant?.id ?? combatant;
    const doc = this.turns.find(c => c.id === id);
    const turn = this.turns.indexOf(doc);

    if (
      this.round === 0 ||
      (!this.isOwner && this.turn != null) ||
      doc.system.activations.value === 0
    )
      return this;

    await doc.update({ "system.activations.value": doc.system.activations.value - 1 });
    const advanceTime = this.getTimeDelta(this.round, null, this.round, turn);
    const updateData = { round: this.round, turn };
    const updateOptions = { direction: 1, worldTime: { delta: advanceTime } };
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /** @override
   * @param {"startEncounter"|"nextUp"|"yourTurn"} announcement
   */
  _playCombatSound(announcement) {
    if (announcement === "nextUp") return;
    return super._playCombatSound(announcement);
  }

  /** @override
   * @param {foundry.documents.Combatant} a
   * @param {foundry.documents.Combatant} b
   */
  _sortCombatants(a, b) {
    /** @type {number} */
    const da =
      a.token?.disposition ??
      a.actor?.prototypeToken.disposition ??
      CONST.TOKEN_DISPOSITIONS.SECRET;
    /** @type {number} */
    const db =
      b.token?.disposition ??
      b.actor?.prototypeToken.disposition ??
      CONST.TOKEN_DISPOSITIONS.SECRET;
    return db - da || super._sortCombatants(a, b);
  }

  /* -------------------------------------------- */
  /*  Turn lifecycle                              */
  /* -------------------------------------------- */

  /** @override */
  _onUpdate(changed, options, userId) {
    this.#direction = options.direction ?? 1;
    super._onUpdate(changed, options, userId);
  }

  /**
   * Foundry only fires turn events for a fixed initiative order. HELLPIERCERS lets units activate in
   * any order, so the lifecycle is derived from changes to the active combatant instead. Only the
   * active GM resolves automation; every client still receives the `combatTurnChange` hook.
   * @override
   */
  async _manageTurnEvents() {
    if (!this.started) return;
    const { current, previous } = this;
    if (game.user.isActiveGM && previous && this.#direction >= 0) {
      try {
        await this.#resolveLifecycle(current, previous);
      } catch (err) {
        console.error("hellpiercers | Failed to resolve turn lifecycle", err);
      }
    }
    Hooks.callAll("combatTurnChange", this, previous, current);
  }

  /**
   * @param {{ round: number, turn: number | null, combatantId: string | null }} current
   * @param {{ round: number, turn: number | null, combatantId: string | null }} previous
   */
  async #resolveLifecycle(current, previous) {
    const roundChanged = current.round !== previous.round;
    const prior = previous.combatantId ? this.combatants.get(previous.combatantId) : null;
    const next = current.combatantId ? this.combatants.get(current.combatantId) : null;

    if (roundChanged) {
      if (prior) await endTurn(prior);
      if (previous.round > 0) await endRound(this, previous.round);
      await startRound(this);
      if (next) await startTurn(next);
      return;
    }

    if (previous.combatantId === current.combatantId) return;
    if (prior) await endTurn(prior);
    if (next) await startTurn(next);
  }

  _onDelete(options, userId) {
    super._onDelete(options, userId);
    for (const combatant of this.combatants) {
      combatant.token?._onRelatedUpdate({}, options);
    }
  }
}
