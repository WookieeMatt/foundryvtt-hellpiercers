export class HellpiercersTokenDocument extends foundry.documents.TokenDocument {
  _onOverrideSize(changes) {
    if (this.getFlag(game.system.id, "manual_token_size") || !this.isOwner || !this.id) return;
    this.resize(changes, { pan: false });
  }

  _prepareBars() {
    super._prepareBars();
    for (const key of ["bar1", "bar2"]) {
      if (this[key].type !== "bar") this[key].max = null;
    }
  }

  getBarAttribute(barName, { alternative } = {}) {
    const bar = super.getBarAttribute(barName, { alternative });
    if (bar?.attribute === "swarm_hp") bar.editable = true;
    return bar;
  }
}
