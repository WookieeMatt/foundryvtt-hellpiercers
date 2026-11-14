import { Damage } from "./damage.mjs";
import { Range } from "./range-model.mjs";

export class Attack extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      name: new fields.StringField(),
      range: new fields.EmbeddedDataField(Range, { initial: new Range().toObject() }),
      damage: new fields.EmbeddedDataField(Damage, { initial: new Damage().toObject() }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}
