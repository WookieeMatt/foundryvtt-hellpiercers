/**
 * The Terrain Painter: a GM palette that paints HELLPIERCERS terrain onto the scene, cell by cell.
 * Left-click paints the active type, right-click erases. It can also walk a Grid Manipulation
 * suite's tile list (the Party sheet's "Place suite" button): each click places the next tile.
 */

import { erase, paint, TERRAIN_TYPES, terrainLabel } from "../../canvas/terrain.mjs";
import { GRID_SUITES } from "../../stratcom/catalog.mjs";

const { Application, HandlebarsApplicationMixin } = foundry.applications.api;

export class TerrainPainter extends HandlebarsApplicationMixin(Application) {
  static PARTS = {
    body: { template: "systems/hellpiercers/templates/dialogs/terrain-painter.hbs" },
  };

  static DEFAULT_OPTIONS = {
    id: "hellpiercers-terrain-painter",
    window: { title: "HELLPIERCERS.TERRAIN.painter", icon: "fa-solid fa-mountain-sun" },
    position: { width: 320 },
    classes: ["hellpiercers", "hp-dialog", "terrain-painter"],
    actions: {
      pickType: this.#pickType,
      clearScene: this.#clearScene,
    },
  };

  /** The open painter, if any. */
  static #instance = null;

  /**
   * Open the painter (bringing the open one to front), optionally with a suite queue.
   * @param {object} [options]
   * @param {Array<{type: string, count: number, hp?: number, formula?: string, ravaging?: boolean}>} [options.queue]
   * @param {string} [options.label]   A heading for the queue (the suite's name)
   */
  static open({ queue = null, label = null } = {}) {
    if (!game.user.isGM) {
      ui.notifications?.warn(game.i18n.localize("HELLPIERCERS.TERRAIN.gmOnly"));
      return null;
    }
    if (!TerrainPainter.#instance) TerrainPainter.#instance = new TerrainPainter();
    const app = TerrainPainter.#instance;
    app.#queue = queue?.map(q => ({ ...q, left: q.count })) ?? null;
    app.#queueLabel = label;
    if (queue?.length) app.#active = queue[0].type;
    app.render({ force: true });
    return app;
  }

  /** @type {string} The active terrain type, "standard", or "erase". */
  #active = "uneasy";

  /** @type {Array<{type: string, left: number, hp?: number, formula?: string, ravaging?: boolean}> | null} */
  #queue = null;

  #queueLabel = null;

  /** Cells painted during the current drag, keyed "i,j". */
  #drag = null;

  #listeners = null;

  async _prepareContext() {
    const types = Object.entries(TERRAIN_TYPES).map(([key, def]) => ({
      key,
      color: def.color,
      icon: def.icon,
      label: terrainLabel(key),
      active: this.#active === key,
      secret: !!def.secret,
    }));
    const queueItem = this.#queue?.find(q => q.left > 0) ?? null;
    return {
      types,
      standardActive: this.#active === "standard",
      eraseActive: this.#active === "erase",
      isObstacle: this.#active === "obstacle",
      isTrapped: this.#active === "trapped",
      obstacleHP: this.#obstacleHP,
      trapFormula: this.#trapFormula,
      trapRavaging: this.#trapRavaging,
      queue: this.#queue?.map(q => ({
        label: terrainLabel(q.type),
        detail: q.ravaging
          ? game.i18n.localize("HELLPIERCERS.TERRAIN.ravaging")
          : q.hp
            ? `HP ${q.hp}`
            : "",
        left: q.left,
        done: q.left <= 0,
        current: q === queueItem,
      })),
      queueLabel: this.#queueLabel,
    };
  }

  #obstacleHP = null;

  #trapFormula = "2d6";

  #trapRavaging = false;

  /** @this {TerrainPainter} */
  static #pickType(_ev, target) {
    this.#active = target.dataset.type;
    this.#queue = null;
    this.#queueLabel = null;
    this.render();
  }

  /** @this {TerrainPainter} */
  static async #clearScene() {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("HELLPIERCERS.TERRAIN.clearScene") },
      content: `<p>${game.i18n.localize("HELLPIERCERS.TERRAIN.clearSceneConfirm")}</p>`,
    });
    if (ok) await hellpiercers.terrain.clearAll(canvas.scene);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector("[name='obstacleHP']")?.addEventListener("change", ev => {
      this.#obstacleHP = ev.currentTarget.value ? Number(ev.currentTarget.value) : null;
    });
    this.element.querySelector("[name='trapFormula']")?.addEventListener("change", ev => {
      this.#trapFormula = ev.currentTarget.value || "2d6";
    });
    this.element.querySelector("[name='trapRavaging']")?.addEventListener("change", ev => {
      this.#trapRavaging = ev.currentTarget.checked;
    });
    if (!this.#listeners) this.#attach();
  }

  /** Listen to the canvas while the painter is open. */
  #attach() {
    if (!canvas?.stage) return;
    const down = ev => this.#onPointerDown(ev);
    const move = ev => this.#onPointerMove(ev);
    const up = ev => this.#onPointerUp(ev);
    canvas.stage.on("pointerdown", down);
    canvas.stage.on("pointermove", move);
    canvas.stage.on("pointerup", up);
    canvas.stage.on("pointerupoutside", up);
    this.#listeners = { down, move, up };
    canvas.regions?.activate();
  }

  #detach() {
    if (!this.#listeners || !canvas?.stage) return;
    canvas.stage.off("pointerdown", this.#listeners.down);
    canvas.stage.off("pointermove", this.#listeners.move);
    canvas.stage.off("pointerup", this.#listeners.up);
    canvas.stage.off("pointerupoutside", this.#listeners.up);
    this.#listeners = null;
  }

  /** The grid cell under a pointer event. `canvas.mousePosition` can be stale, so the event's
   * own coordinates come first. */
  #cellUnderPointer(ev) {
    let point = null;
    try {
      if (ev?.getLocalPosition) point = ev.getLocalPosition(canvas.stage);
      else if (ev?.global) point = canvas.stage.toLocal(ev.global);
    } catch {
      point = null;
    }
    point ??= canvas.mousePosition;
    if (!point) return null;
    return canvas.grid.getOffset(point);
  }

  #onPointerDown(ev) {
    if (!canvas.ready || !this.rendered) return;
    const button = ev.button ?? ev.data?.button ?? 0;
    if (button !== 0 && button !== 2) return;
    const cell = this.#cellUnderPointer(ev);
    if (!cell) return;
    this.#drag = { erase: button === 2, cells: new Map([[`${cell.i},${cell.j}`, cell]]) };
  }

  #onPointerMove(ev) {
    // Right-drag pans the canvas, so erasing never collects a swath.
    if (!this.#drag || this.#drag.erase) return;
    const cell = this.#cellUnderPointer(ev);
    if (cell) this.#drag.cells.set(`${cell.i},${cell.j}`, cell);
  }

  /** Pending paint work. Clicks are committed one after another: two quick clicks must not both
   * read the queue (or the merged region) before the first write lands. */
  #work = Promise.resolve();

  #onPointerUp() {
    const drag = this.#drag;
    this.#drag = null;
    if (!drag || !canvas.ready) return;
    const cells = [...drag.cells.values()];
    this.#work = this.#work
      .then(() => this.#commit(drag.erase, cells))
      .catch(err => console.error("hellpiercers | Terrain paint failed", err));
  }

  async #commit(eraseMode, cells) {
    if (eraseMode || this.#active === "erase") return erase(canvas.scene, cells);
    if (this.#queue) return this.#paintQueue(cells);
    const data = {};
    if (this.#active === "obstacle" && this.#obstacleHP) data.hp = this.#obstacleHP;
    if (this.#active === "trapped") {
      data.formula = this.#trapFormula;
      data.ravaging = this.#trapRavaging;
    }
    await paint(canvas.scene, this.#active, cells, data);
  }

  /** Place suite tiles: each painted cell takes the next tile of the queue. */
  async #paintQueue(cells) {
    for (const cell of cells) {
      const item = this.#queue.find(q => q.left > 0);
      if (!item) break;
      const data = {};
      if (item.hp) data.hp = item.hp;
      if (item.formula) data.formula = item.formula;
      if (item.ravaging) data.ravaging = item.ravaging;
      await paint(canvas.scene, item.type, [cell], data);
      item.left--;
      this.#active = (this.#queue.find(q => q.left > 0) ?? item).type;
    }
    if (!this.#queue.some(q => q.left > 0)) {
      const label = this.#queueLabel;
      this.#queue = null;
      this.#queueLabel = null;
      if (label) {
        await getDocumentClass("ChatMessage").create({
          content: `<div class="hellpiercers turn-note"><header>${game.i18n.localize("HELLPIERCERS.TERRAIN.title")}</header><ul><li><i class="fa-solid fa-chess-board"></i><span>${game.i18n.format("HELLPIERCERS.TERRAIN.MSG.suitePlaced", { name: foundry.utils.escapeHTML(label) })}</span></li></ul></div>`,
        });
      }
    }
    this.render();
  }

  async _preClose(options) {
    await super._preClose(options);
    this.#detach();
    TerrainPainter.#instance = null;
  }
}

/**
 * Open the painter loaded with a Grid Manipulation suite's tiles (p. 120). Suites without a tile
 * list (Sanctuary's whole structure) just post their description to chat.
 * @param {string} key   A key of GRID_SUITES
 */
export async function placeSuite(key) {
  const suite = GRID_SUITES[key];
  if (!suite) throw new Error(`Unknown Grid Manipulation suite "${key}"`);
  if (!suite.cells?.length) {
    await getDocumentClass("ChatMessage").create({
      content: `<div class="hellpiercers turn-note"><header>${foundry.utils.escapeHTML(suite.name)}</header><ul><li><i class="fa-solid fa-chess-board"></i><span>${foundry.utils.escapeHTML(suite.tiles)}</span></li></ul></div>`,
    });
    return null;
  }
  return TerrainPainter.open({ queue: suite.cells, label: suite.name });
}
