export class HellpiercersToken extends foundry.canvas.placeables.Token {
  /** @override */
  async _drawEffects() {
    this.effects.renderable = false;

    // Clear Effects Container
    for (const c of this.effects.removeChildren()) c.destroy();
    this.effects.bg = this.effects.addChild(new PIXI.Graphics());
    this.effects.bg.zIndex = -1;
    this.effects.overlay = null;

    // Categorize effects
    const SHOW_ICON = CONST.ACTIVE_EFFECT_SHOW_ICON;
    const activeEffects =
      this.actor?.appliedEffects.filter(
        e =>
          e.showIcon === SHOW_ICON.ALWAYS || (e.showIcon === SHOW_ICON.CONDITIONAL && e.isTemporary)
      ) ?? [];
    const overlayEffect = activeEffects.findLast(e => e.flags.core?.overlay);

    // Draw effects
    const promises = [];
    for (const [i, effect] of activeEffects.entries()) {
      const promise =
        effect === overlayEffect
          ? this._drawOverlay(effect.img, effect.tint)
          : this._drawEffect(effect.img, effect.tint, effect.system.stacks);
      promises.push(
        promise.then(e => {
          if (e) e.zIndex = i;
        })
      );
    }
    await Promise.allSettled(promises);

    this.effects.sortChildren();
    this.effects.renderable = true;
    this.renderFlags.set({ refreshEffects: true });
  }

  /** @override */
  async _drawEffect(src, tint, val) {
    const icon = await super._drawEffect(src, tint);
    if (val) {
      const num = new foundry.canvas.containers.PreciseText(val, this._getEffectTextStyle());
      num.x = icon.x - icon.width * 0.1;
      num.y = icon.y + icon.height * 0.1;
      num.scale.x = 17;
      num.scale.y = 17;
      icon.addChild(num);
    }
    return icon;
  }

  _getEffectTextStyle() {
    const style = CONFIG.canvasTextStyle.clone();
    style.fontSize = 21;
    if (canvas.dimensions.size >= 200) style.fontSize = 24;
    else if (canvas.dimensions.size < 50) style.fontSize = 18;
    style.wordWrapWidth = this.w * 2.5;
    return style;
  }
}
