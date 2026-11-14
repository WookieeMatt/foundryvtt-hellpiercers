export {};

declare global {
  // Merge in missing layers properties
  interface Canvas extends foundry.canvas.Canvas {
    control: foundry.canvas.layers.ControlsLayer;
    drawings: foundry.canvas.layers.DrawingsLayer;
    lighting: foundry.canvas.layers.LightingLayer;
    note: foundry.canvas.layers.NotesLayer;
    regions: foundry.canvas.layers.RegionLayer;
    sound: foundry.canvas.layers.SoundsLayer;
    tile: foundry.canvas.layers.TilesLayer;
    tokens: foundry.canvas.layers.TokenLayer;
    wall: foundry.canvas.layers.WallsLayer;
    weather: foundry.canvas.layers.WeatherEffects;
  }

  interface Game extends foundry.Game {
    /**
     * The singleton game Canvas.
     * @readonly
     */
    canvas: Canvas;
  }

  /**
   * A simple event framework used throughout Foundry Virtual Tabletop.
   * When key actions or events occur, a "hook" is defined where user-defined callback functions can execute.
   * This class manages the registration and execution of hooked callback functions.
   */
  class Hooks extends foundry.helpers.Hooks {}

  /**
   * Retrieve a Document by its Universally Unique Identifier (uuid).
   * @param {string} uuid                      The uuid of the Document to retrieve.
   * @param {object} [options]                 Options to configure how a UUID is resolved.
   * @param {Document} [options.relative]      A Document to resolve relative UUIDs against.
   * @param {boolean} [options.invalid=false]  Allow retrieving an invalid Document.
   * @returns {Promise<Document|null>}         Returns the Document if it could be found, otherwise null.
   */
  const fromUuid: typeof foundry.utils.fromUuid;

  /**
   * Retrieve a Document by its Universally Unique Identifier (uuid) synchronously. If the uuid resolves to a compendium
   * document, that document's index entry will be returned instead.
   * @param {string} uuid                      The uuid of the Document to retrieve.
   * @param {object} [options]                 Options to configure how a UUID is resolved.
   * @param {Document} [options.relative]      A Document to resolve relative UUIDs against.
   * @param {boolean} [options.invalid=false]  Allow retrieving an invalid Document.
   * @param {boolean} [options.strict=true]    Throw an error if the UUID cannot be resolved synchronously.
   * @returns {Document|object|null}           The Document or its index entry if it resides in a Compendium, otherwise
   *                                           null.
   * @throws If the uuid resolves to a Document that cannot be retrieved synchronously, and the strict option is true.
   */
  const fromUuidSync: typeof foundry.utils.fromUuidSync;

  const _del: foundry.data.operators.ForcedDeletion;

  const _replace: typeof foundry.data.operators.ForcedReplacement.create;
}
