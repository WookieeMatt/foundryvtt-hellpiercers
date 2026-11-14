/**
 * Data model for system ActiveEffects.
 */
export class EffectModel extends foundry.data.ActiveEffectTypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.EFFECT", ...super.LOCALIZATION_PREFIXES];
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      decay: new fields.StringField({
        blank: false,
        initial: "never",
        choices: Object.fromEntries(
          ["turn", "round", "trigger", "never", "special"].map(v => [
            v,
            `HELLPIERCERS.EFFECT.FIELDS.decay.${v}`,
          ])
        ),
      }),
      stacks: new fields.NumberField({ initial: null, integer: true, min: 1 }),
    };
  }

  /**
   * Manually trigger decay for a single effect.  For turn and round decay,
   * {@link HellpiercersActor#decayEffects} is preferred.
   * @param {"turn" | "round" | "trigger" | "special"} reason
   */
  async triggerDecay(reason, count = 1) {
    if (!["turn", "round", "trigger", "special"].includes(reason)) return;
    if (reason !== this.decay) return;
    if (this.stacks <= count) {
      await this.parent.delete();
    } else {
      await this.parent.update({ "system.stacks": this.stacks - count });
    }
  }
}
