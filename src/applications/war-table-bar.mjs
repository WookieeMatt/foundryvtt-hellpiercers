/**
 * The War Table bar: a slim overlay shown while a campaign-map scene is viewed. It names the
 * STRATCOM phase, the GM's Ichor, and every faction on the table with its Crown; clicking a
 * faction opens its sheet, and the GM can advance the phase or resync the map from here.
 */

import { advancePhase, getFactions, ichor, phase } from "../stratcom/engine.mjs";
import { syncWarTable } from "../stratcom/war-table.mjs";

const { Application, HandlebarsApplicationMixin } = foundry.applications.api;

export class WarTableBar extends HandlebarsApplicationMixin(Application) {
  static PARTS = {
    body: { template: "systems/hellpiercers/templates/dialogs/war-table-bar.hbs" },
  };

  static DEFAULT_OPTIONS = {
    id: "hellpiercers-war-table-bar",
    window: { frame: false, positioned: false },
    classes: ["hellpiercers", "war-table-bar"],
    actions: {
      openFaction: this.#openFaction,
      advancePhase: this.#advancePhase,
      syncMap: this.#syncMap,
    },
  };

  static #instance = null;

  /** Show the bar for a campaign-map scene, or hide it. */
  static refresh() {
    const isWarTable = !!canvas.scene?.getFlag(game.system.id, "campaignMap");
    if (!isWarTable) {
      WarTableBar.#instance?.close();
      WarTableBar.#instance = null;
      return;
    }
    WarTableBar.#instance ??= new WarTableBar();
    WarTableBar.#instance.render({ force: true });
  }

  /** Re-render if the bar is open. */
  static rerender() {
    if (WarTableBar.#instance?.rendered) WarTableBar.#instance.render();
  }

  async _prepareContext() {
    const keys = canvas.scene?.getFlag(game.system.id, "campaignMap") ?? [];
    const factions = keys
      .map(key => getFactions().find(f => f.system.key === key))
      .filter(Boolean)
      .map(f => ({
        id: f.id,
        name: f.name,
        crown: Array.fromRange(f.system.crown?.max ?? 5).map(i => i < (f.system.crown?.value ?? 0)),
        finalAssault: !!f.system.finalAssaultReady,
      }));
    return {
      phase: phase.get(),
      isGM: game.user.isGM,
      ichor: game.user.isGM ? ichor.get() : null,
      factions,
    };
  }

  /** @this {WarTableBar} */
  static #openFaction(_ev, target) {
    game.actors.get(target.dataset.id)?.sheet.render({ force: true });
  }

  /** @this {WarTableBar} */
  static async #advancePhase() {
    await advancePhase();
    this.render();
  }

  /** @this {WarTableBar} */
  static async #syncMap() {
    if (canvas.scene) await syncWarTable(canvas.scene);
    ui.notifications?.info(game.i18n.localize("HELLPIERCERS.WARTABLE.synced"));
  }
}

/** Keep the bar in step with the canvas and the campaign. Call once on `ready`. */
export function activateWarTableBar() {
  Hooks.on("canvasReady", () => WarTableBar.refresh());
  Hooks.on("hellpiercers.stratcomPhase", () => WarTableBar.rerender());
  Hooks.on("updateActor", actor => {
    if (actor.type === "faction") WarTableBar.rerender();
  });
  Hooks.on("updateSetting", setting => {
    if (/hellpiercers\.(ichor|stratcomPhase)/.test(setting.key)) WarTableBar.rerender();
  });
  if (canvas?.ready) WarTableBar.refresh();
}
