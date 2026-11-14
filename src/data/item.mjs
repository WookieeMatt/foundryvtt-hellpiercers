import { Attack } from "./attack.mjs";
import { HaloUpgradeModel } from "./halo-upgrade-model.mjs";

const fields = foundry.data.fields;

export class AbilityModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ITEM"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/round-star.svg";
  static defineSchema() {
    return {
      action: new fields.StringField({
        initial: "active",
        required: true,
        blank: false,
        choices: {
          active: "HELLPIERCERS.ITEM.action.active",
          attack: "HELLPIERCERS.ITEM.action.attack",
          limit: "HELLPIERCERS.ITEM.action.limit",
          movement: "HELLPIERCERS.ITEM.action.movement",
          passive: "HELLPIERCERS.ITEM.action.passive",
          reversal: "HELLPIERCERS.ITEM.action.reversal",
          special: "HELLPIERCERS.ITEM.action.special",
        },
      }),
      attack: new fields.EmbeddedDataField(Attack, {
        nullable: true,
        initial: null,
      }),
      counter: new fields.SchemaField({
        enabled: new fields.BooleanField({ initial: false }),
        value: new fields.NumberField({ integer: true, initial: 0 }),
        max: new fields.NumberField({ integer: true, initial: null }),
      }),
      uses: new fields.NumberField({ initial: null, nullable: true }),
      trigger: new fields.StringField({ initial: null, nullable: true }),
      break_value: new fields.NumberField({ initial: 10 }),
      effect: new fields.HTMLField({}),
      item: new fields.SchemaField({
        uuid: new fields.DocumentUUIDField({ nullable: true, initial: null, type: "Item" }),
        type: new fields.StringField({
          blank: true,
          initial: "",
          choices: {
            armor: "TYPES.Item.armor",
            class: "TYPES.Item.class",
            weapon: "TYPES.Item.weapon",
          },
        }),
      }),
    };
  }

  prepareBaseData() {
    if (this.item.uuid) {
      const type = fromUuidSync(this.item.uuid)?.type;
      if (type) this.item.type = type;
    }
  }
}

/**
 * Data model for PC weapons
 */
export class WeaponModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ITEM"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/war-axe.svg";
  static defineSchema() {
    return {
      description: new fields.HTMLField({}),
      attacks: new fields.ArrayField(new fields.EmbeddedDataField(Attack), {
        initial: [new Attack({ name: "Attack", damage: { formula: "1 + 1d6" } }).toObject()],
      }),
      selected_attack: new fields.NumberField({
        initial: 0,
        integer: true,
        nullable: false,
        min: 0,
      }),
      counter: new fields.SchemaField({
        enabled: new fields.BooleanField({ initial: false }),
        value: new fields.NumberField({ integer: true, initial: 0 }),
        max: new fields.NumberField({ integer: true, initial: null }),
      }),
      active: new fields.SchemaField({
        name: new fields.StringField({}),
        description: new fields.HTMLField({}),
      }),
      passive: new fields.SchemaField({
        name: new fields.StringField({}),
        description: new fields.HTMLField({}),
      }),
    };
  }

  get attack() {
    return this.attacks[this.selected_attack];
  }

  async changeAttack(v, { delta = true }) {
    const len = this.attacks.length;
    const cur = Math.clamp(this.selected_attack, 0, len - 1);
    const newVal = delta ? (cur + v + Math.abs(v) * len) % len : Math.clamp(v, 0, len - 1);
    await this.parent.update({ "system.selected_attack": newVal });
  }
}

export class ArmorModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ITEM"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/abdominal-armor.svg";
  static defineSchema() {
    return {
      description: new fields.HTMLField({}),
      speed: new fields.NumberField({}),
      movement: new fields.DocumentUUIDField({ initial: null, type: "Item" }),
      ability: new fields.DocumentUUIDField({ initial: null, type: "Item" }),
      reversal: new fields.DocumentUUIDField({ initial: null, type: "Item" }),
    };
  }
}

export class ClassModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ITEM"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/laurels.svg";
  static defineSchema() {
    return {
      description: new fields.HTMLField({}),
      health: new fields.NumberField({ integer: true, initial: 15 }),
      active: new fields.DocumentUUIDField({ nullable: true, initial: null, type: "Item" }),
      passive: new fields.DocumentUUIDField({ nullable: true, initial: null, type: "Item" }),
      limit: new fields.DocumentUUIDField({ nullable: true, initial: null, type: "Item" }),
    };
  }
}

export class GearModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ITEM"];
  static defineSchema() {
    return {
      kind: new fields.StringField({
        required: true,
        initial: "weapon",
        choices: {
          armor: "TYPES.Item.armor",
          weapon: "TYPES.Item.weapon",
        },
      }),
      target: new fields.StringField({ initial: "" }),
      effect: new fields.HTMLField({}),
      description: new fields.HTMLField({}),
    };
  }
}

export class EquipmentModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ITEM"];
  static defineSchema() {
    return {
      description: new fields.HTMLField({}),
      effect: new fields.HTMLField({}),
      available: new fields.BooleanField({ initial: true }),
    };
  }

  prepareBaseData() {
    if (this.parent.parent == null) {
      this.available = true;
    }
  }
}

export class HaloSystemModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ITEM"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/circuitry.svg";
  static defineSchema() {
    return {
      description: new fields.HTMLField(),
      effect: new fields.HTMLField(),
      upgrades: new fields.ArrayField(new fields.EmbeddedDataField(HaloUpgradeModel)),
    };
  }
}

export class HaloWeaponModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ITEM"];
  static DEFAULT_ICON = "systems/hellpiercers/assets/icons/warhammer.svg";
  static defineSchema() {
    return {
      description: new fields.HTMLField(),
      attacks: new fields.ArrayField(new fields.EmbeddedDataField(Attack), {
        initial: [new Attack({ name: "Attack", damage: { formula: "6 + 3d10" } }).toObject()],
      }),
      selected_attack: new fields.NumberField({
        initial: 0,
        integer: true,
        nullable: false,
        min: 0,
      }),
      counter: new fields.SchemaField({
        enabled: new fields.BooleanField({ initial: false }),
        value: new fields.NumberField({ integer: true, initial: 0 }),
        max: new fields.NumberField({ integer: true, initial: null }),
      }),
      effect: new fields.HTMLField(),
      tags: new fields.SetField(
        new fields.StringField({
          choices: () => ({
            piercing: "Piercing",
            overpenetrating: "Overpenetrating",
          }),
        })
      ),
      secondary: new fields.SchemaField({
        action: new fields.StringField({
          required: true,
          blank: false,
          initial: "main",
          choices: {
            main: "HELLPIERCERS.ACTION.main",
            aux: "HELLPIERCERS.ACTION.aux",
            support: "HELLPIERCERS.ACTION.support",
            passive: "HELLPIERCERS.ACTION.passive",
          },
        }),
        effect: new fields.HTMLField(),
      }),
    };
  }

  get attack() {
    return this.attacks[this.selected_attack];
  }

  async changeAttack(v, { delta = true }) {
    const len = this.attacks.length;
    const cur = Math.clamp(this.selected_attack, 0, len - 1);
    const newVal = delta ? (cur + v + Math.abs(v) * len) % len : Math.clamp(v, 0, len - 1);
    await this.parent.update({ "system.selected_attack": newVal });
  }
}
