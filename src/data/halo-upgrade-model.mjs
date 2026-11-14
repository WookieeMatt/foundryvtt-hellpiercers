const fields = foundry.data.fields;

export class HaloUpgradeModel extends foundry.abstract.DataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.UPGRADE"];
  static defineSchema() {
    return {
      cost: new fields.SchemaField({
        brimstone: new fields.NumberField({ initial: 0, integer: true }),
        hellsteel: new fields.NumberField({ initial: 0, integer: true }),
        soulfire: new fields.NumberField({ initial: 0, integer: true }),
      }),
      effect: new fields.HTMLField(),
      unlocked: new fields.BooleanField({ initial: false }),
    };
  }
}
