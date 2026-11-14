/**
 * The `terrain` RegionBehavior: one behavior type for every HELLPIERCERS terrain type, created by
 * the Terrain Painter (`src/applications/dialogs/terrain-painter.mjs`). The rules live in
 * `src/canvas/terrain.mjs`; this model carries the data and routes the Region events there.
 */

import {
  onAttractor,
  onBlockingMoveIn,
  onLinkedMoveIn,
  onTrapMoveIn,
  TERRAIN_TYPES,
  wearsJehoel,
} from "../canvas/terrain.mjs";

const fields = foundry.data.fields;

export class TerrainBehaviorModel extends foundry.data.regionBehaviors.RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.TERRAIN.BEHAVIOR"];

  static defineSchema() {
    return {
      terrain: new fields.StringField({
        required: true,
        blank: false,
        initial: "uneasy",
        choices: () =>
          Object.fromEntries(Object.keys(TERRAIN_TYPES).map(t => [t, `HELLPIERCERS.TERRAIN.${t}`])),
      }),
      // Obstacles: current HP. Empty = the book's "breaks in one hit".
      hp: new fields.NumberField({ integer: true, nullable: true, initial: null, min: 0 }),
      // Trapped tiles: the damage they deal.
      formula: new fields.StringField({
        initial: "2d6",
        validate: v => !v || foundry.dice.Roll.validate(v),
        validationError: "must be a valid Roll formula",
      }),
      // Ravaging Trapped tiles fire on every entry and never become Standard.
      ravaging: new fields.BooleanField({ initial: false }),
    };
  }

  /** @this {TerrainBehaviorModel} */
  static async #onTokenMoveIn(event) {
    switch (this.terrain) {
      case "trapped":
        return onTrapMoveIn(this.behavior, event);
      case "void":
      case "obstacle":
      case "impassable":
        return onBlockingMoveIn(this.behavior, event);
      case "linked":
        return onLinkedMoveIn(this.behavior, event);
      case "attractor":
        return onAttractor(this.behavior, event);
    }
  }

  /** @this {TerrainBehaviorModel} */
  static async #onTokenTurnEnd(event) {
    if (this.terrain === "attractor") return onAttractor(this.behavior, event);
  }

  static events = {
    [CONST.REGION_EVENTS.TOKEN_MOVE_IN]: this.#onTokenMoveIn,
    [CONST.REGION_EVENTS.TOKEN_TURN_END]: this.#onTokenTurnEnd,
  };

  /**
   * Movement costs: Uneasy costs +1 Speed (p. 100). Blocking terrain is advisory (never blocked),
   * but JEHOEL treats Void, Obstacle and Impassable as Uneasy, so its wearer sees that cost.
   * @override
   */
  _getTerrainEffects(token, _segment, _options) {
    if (this.terrain === "uneasy") return [{ name: "difficulty", difficulty: 2 }];
    if (["void", "obstacle", "impassable"].includes(this.terrain) && wearsJehoel(token.actor)) {
      return [{ name: "difficulty", difficulty: 2 }];
    }
    return [];
  }
}
