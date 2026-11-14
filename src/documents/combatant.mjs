export class HellpiercersCombatant extends foundry.documents.Combatant {
  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
    this.initiative ??= 0;
  }

  activate() {
    this.parent.activateCombatant(this.id);
  }

  deactivate() {
    if (this.parent.combatant === this) this.parent.nextTurn();
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    this.token?._onRelatedUpdate(changed, options);
  }

  _onDelete(options, userId) {
    super._onDelete(options, userId);
    this.token?._onRelatedUpdate({}, options);
  }
}
