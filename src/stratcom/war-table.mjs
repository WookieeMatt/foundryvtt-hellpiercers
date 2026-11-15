/**
 * The War Table: the campaign map scene (`map.mjs`) kept in sync with the factions.
 *
 * - Revealed locations become pages of a "War Table" journal (players are Observers) and are
 *   pinned on the faction's map segment; unrevealed and under-construction locations are pinned
 *   as entry-less notes, which Foundry shows only to the GM.
 * - Active map hazards are tinted circles (yellow to red as the stage grows).
 * - Traveling convoys whose endpoints match pinned locations are drawn as routes; a convoy the
 *   players have not spied out is a hidden drawing, so only the GM sees it.
 * - The party's token stands on the map; dragging it offers the RECON Travel roll.
 *
 * The GM can drag every pin, circle and route into place: a resync keeps positions and only
 * creates, retitles or removes what changed. Everything lives on the scene, so players simply
 * look at the map.
 */

import { getSetting } from "../settings.mjs";
import { SEGMENT_HEIGHT, SEGMENT_WIDTH } from "./map.mjs";

const FLAG = "warTable";

/** Pin art for locations. */
const ICONS = {
  active: "icons/svg/village.svg",
  lost: "icons/svg/ruins.svg",
  hidden: "icons/svg/mystery-man.svg",
  building: "icons/svg/hammer.svg",
};

/** Every campaign-map scene. */
export function warTableScenes() {
  return game.scenes.filter(s => s.getFlag(game.system.id, "campaignMap"));
}

/** The faction actor built from a catalog id. */
function factionActor(key) {
  return game.actors.find(a => a.type === "faction" && a.system.key === key) ?? null;
}

/** The journal that holds the revealed locations of a scene's War Table. */
async function getJournal(scene, { create = true } = {}) {
  let journal = game.journal.find(j => j.getFlag(game.system.id, FLAG) === scene.id);
  if (!journal && create) {
    journal = await getDocumentClass("JournalEntry").create({
      name: game.i18n.format("HELLPIERCERS.WARTABLE.journal", { name: scene.name }),
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      flags: { [game.system.id]: { [FLAG]: scene.id, themed: true } },
    });
  }
  return journal;
}

/** What the players know about a location, as journal page HTML. */
function locationPageContent(faction, location) {
  const esc = foundry.utils.escapeHTML;
  const loc = k => game.i18n.localize(k);
  const rows = [
    [loc("HELLPIERCERS.WARTABLE.faction"), faction.name],
    [loc(`HELLPIERCERS.LOCATION.type.${location.type}`), null],
    [loc("HELLPIERCERS.WARTABLE.purpose"), location.purpose],
    [loc("HELLPIERCERS.WARTABLE.terrain"), location.terrain],
    [loc("HELLPIERCERS.WARTABLE.defenses"), location.defenses],
    [loc(`HELLPIERCERS.LOCATION.status.${location.status}`), null],
  ];
  const items = rows
    .map(([a, b]) =>
      b === null
        ? `<li><strong>${esc(a)}</strong></li>`
        : b
          ? `<li><strong>${esc(a)}:</strong> ${esc(b)}</li>`
          : ""
    )
    .join("");
  return `<ul>${items}</ul>`;
}

/** Default pin position: a column on the faction's segment. */
function defaultPinPosition(segment, index) {
  return {
    x: segment * SEGMENT_WIDTH + 170,
    y: 360 + (index % 20) * 160,
  };
}

/** Hazard circle colour by stage: yellow at stage 1 to red at the last stage. */
function hazardColor(hazard) {
  const t = hazard.maxStage > 1 ? (hazard.stage - 1) / (hazard.maxStage - 1) : 1;
  const g = Math.round(190 * (1 - Math.clamp(t, 0, 1)));
  return `#${((0xb3 << 16) | (g << 8) | 0x24).toString(16).padStart(6, "0")}`;
}

/**
 * Bring a campaign-map scene up to date with its factions. GM only; safe to call repeatedly.
 * @param {foundry.documents.Scene} scene
 */
export async function syncWarTable(scene) {
  if (!game.user.isGM) return;
  const keys = scene.getFlag(game.system.id, "campaignMap") ?? [];
  const journal = await getJournal(scene);

  const wantedPins = new Map(); // pinKey -> data
  const wantedHazards = new Map();
  const wantedRoutes = new Map();
  const pinPositions = new Map(); // location name -> {x, y} (for convoy endpoints)

  for (const [segment, key] of keys.entries()) {
    const faction = factionActor(key);
    if (!faction) continue;

    faction.system.locations.forEach((location, index) => {
      const pinKey = `${key}.${location.id}`;
      wantedPins.set(pinKey, { faction, location, segment, index, pinKey });
    });
    for (const hazard of faction.system.hazards) {
      if (hazard.status !== "active") continue;
      wantedHazards.set(`${key}.${hazard.id}`, { faction, hazard, segment });
    }
    for (const convoy of faction.system.convoys) {
      if (convoy.status !== "traveling") continue;
      wantedRoutes.set(`${key}.${convoy.id}`, { faction, convoy, segment });
    }
  }

  /* ---- Journal pages for revealed locations ---- */
  const pageUpdates = [];
  const pageCreates = [];
  const pageIds = new Map(); // pinKey -> pageId
  for (const { faction, location, pinKey } of wantedPins.values()) {
    if (!location.revealed) continue;
    const content = locationPageContent(faction, location);
    const page = journal.pages.find(p => p.getFlag(game.system.id, FLAG) === pinKey);
    if (page) {
      pageIds.set(pinKey, page.id);
      if (page.name !== location.name || page.text.content !== content) {
        pageUpdates.push({ _id: page.id, name: location.name, "text.content": content });
      }
    } else {
      pageCreates.push({
        name: location.name,
        type: "text",
        text: { content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
        flags: { [game.system.id]: { [FLAG]: pinKey } },
      });
    }
  }
  if (pageUpdates.length) await journal.updateEmbeddedDocuments("JournalEntryPage", pageUpdates);
  if (pageCreates.length) {
    const created = await journal.createEmbeddedDocuments("JournalEntryPage", pageCreates);
    for (const page of created) pageIds.set(page.getFlag(game.system.id, FLAG), page.id);
  }
  // Remove pages for locations that no longer exist or were un-revealed.
  const stalePages = journal.pages
    .filter(p => {
      const pinKey = p.getFlag(game.system.id, FLAG);
      return pinKey && !pageIds.has(pinKey);
    })
    .map(p => p.id);
  if (stalePages.length) await journal.deleteEmbeddedDocuments("JournalEntryPage", stalePages);

  /* ---- Notes (pins) ---- */
  const noteCreates = [];
  const noteUpdates = [];
  const seenNotes = new Set();
  for (const { location, segment, index, pinKey } of wantedPins.values()) {
    const icon = !location.revealed
      ? ICONS.hidden
      : (ICONS[location.status === "building" ? "building" : location.status] ?? ICONS.active);
    const revealed = !!location.revealed;
    const data = {
      entryId: revealed ? journal.id : null,
      pageId: revealed ? (pageIds.get(pinKey) ?? null) : null,
      text: revealed
        ? location.name
        : `${location.name} (${game.i18n.localize("HELLPIERCERS.WARTABLE.unknown")})`,
      "texture.src": icon,
      iconSize: 56,
      fontSize: 28,
      global: true,
    };
    const note = scene.notes.find(n => n.getFlag(game.system.id, FLAG) === pinKey);
    if (note) {
      seenNotes.add(note.id);
      pinPositions.set(location.name, { x: note.x, y: note.y });
      const changed = Object.entries(data).some(
        ([k, v]) => foundry.utils.getProperty(note, k.replace("texture.src", "texture.src")) !== v
      );
      if (changed) noteUpdates.push({ _id: note.id, ...data });
    } else {
      const { x, y } = defaultPinPosition(segment, index);
      pinPositions.set(location.name, { x, y });
      noteCreates.push({ ...data, x, y, flags: { [game.system.id]: { [FLAG]: pinKey } } });
    }
  }
  const staleNotes = scene.notes
    .filter(
      n =>
        n.getFlag(game.system.id, FLAG) &&
        !seenNotes.has(n.id) &&
        !wantedPins.has(n.getFlag(game.system.id, FLAG))
    )
    .map(n => n.id);
  if (noteUpdates.length) await scene.updateEmbeddedDocuments("Note", noteUpdates);
  if (noteCreates.length) await scene.createEmbeddedDocuments("Note", noteCreates);
  if (staleNotes.length) await scene.deleteEmbeddedDocuments("Note", staleNotes);

  /* ---- Hazards and convoy routes (drawings) ---- */
  const drawingCreates = [];
  const drawingUpdates = [];
  const keepDrawings = new Set();
  for (const [hazardKey, { hazard, segment }] of wantedHazards) {
    const label = `${hazard.name} (${hazard.stage}/${hazard.maxStage || "?"})`;
    const color = hazardColor(hazard);
    const drawing = scene.drawings.find(d => d.getFlag(game.system.id, FLAG) === hazardKey);
    if (drawing) {
      keepDrawings.add(drawing.id);
      if (drawing.text !== label || drawing.strokeColor.css !== color) {
        drawingUpdates.push({ _id: drawing.id, text: label, strokeColor: color, fillColor: color });
      }
    } else {
      drawingCreates.push({
        x: segment * SEGMENT_WIDTH + SEGMENT_WIDTH / 2 - 220,
        y: SEGMENT_HEIGHT / 2 - 220,
        shape: { type: "e", width: 440, height: 440 },
        fillType: CONST.DRAWING_FILL_TYPES.SOLID,
        fillColor: color,
        fillAlpha: 0.2,
        strokeColor: color,
        strokeWidth: 10,
        text: label,
        fontSize: 40,
        interface: true,
        flags: { [game.system.id]: { [FLAG]: hazardKey } },
      });
    }
  }
  for (const [routeKey, { convoy }] of wantedRoutes) {
    const from = pinPositions.get(convoy.from);
    const to = pinPositions.get(convoy.to);
    if (!from || !to) continue;
    const label = convoy.revealed
      ? convoy.name || game.i18n.localize("HELLPIERCERS.WARTABLE.convoy")
      : "";
    const x = Math.min(from.x, to.x);
    const y = Math.min(from.y, to.y);
    const points = [from.x - x, from.y - y, to.x - x, to.y - y];
    const data = {
      x,
      y,
      shape: { type: "p", width: Math.abs(to.x - from.x), height: Math.abs(to.y - from.y), points },
      strokeColor: "#b8860b",
      strokeWidth: 12,
      strokeAlpha: 0.8,
      text: label,
      fontSize: 36,
      hidden: !convoy.revealed,
      interface: true,
    };
    const drawing = scene.drawings.find(d => d.getFlag(game.system.id, FLAG) === routeKey);
    if (drawing) {
      keepDrawings.add(drawing.id);
      drawingUpdates.push({ _id: drawing.id, ...data });
    } else {
      drawingCreates.push({ ...data, flags: { [game.system.id]: { [FLAG]: routeKey } } });
    }
  }
  const staleDrawings = scene.drawings
    .filter(d => {
      const k = d.getFlag(game.system.id, FLAG);
      return k && !keepDrawings.has(d.id) && !wantedHazards.has(k) && !wantedRoutes.has(k);
    })
    .map(d => d.id);
  if (drawingUpdates.length) await scene.updateEmbeddedDocuments("Drawing", drawingUpdates);
  if (drawingCreates.length) await scene.createEmbeddedDocuments("Drawing", drawingCreates);
  if (staleDrawings.length) await scene.deleteEmbeddedDocuments("Drawing", staleDrawings);

  /* ---- The party's token ---- */
  const party = hellpiercers.stratcom.getParty();
  if (party && !scene.tokens.some(t => t.actorId === party.id)) {
    const proto = party.prototypeToken.toObject();
    await scene.createEmbeddedDocuments("Token", [
      {
        ...proto,
        actorId: party.id,
        x: SEGMENT_WIDTH / 2,
        y: SEGMENT_HEIGHT - 400,
        width: 2,
        height: 2,
      },
    ]);
  }

  Hooks.callAll("hellpiercers.warTableSynced", scene);
  return scene;
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/** Dragging the party token on the War Table offers the RECON Travel roll. */
async function onMoveToken(doc, movement) {
  if (!game.user.isActiveGM) return;
  if (!doc.parent?.getFlag(game.system.id, "campaignMap")) return;
  if (doc.actor?.type !== "party") return;
  if (!["dragging", "keyboard", "hud"].includes(movement.method)) return;
  const cls = getDocumentClass("ChatMessage");
  await cls.create({
    content: `<div class="hellpiercers turn-note"><header>${game.i18n.localize("HELLPIERCERS.WARTABLE.title")}</header><ul><li><i class="fa-solid fa-route"></i><span>${game.i18n.format("HELLPIERCERS.WARTABLE.travel", { name: foundry.utils.escapeHTML(doc.name) })}</span></li></ul><footer><button type="button" data-action="hpTravelRoll"><i class="fa-solid fa-dice"></i> ${game.i18n.localize("HELLPIERCERS.WARTABLE.travelRoll")}</button></footer></div>`,
    speaker: cls.getSpeaker({ token: doc }),
  });
}

/** The Travel roll button draws from the RECON Travel table. */
function onRenderChatMessage(_message, html) {
  const button = html.querySelector("[data-action='hpTravelRoll']");
  if (!button) return;
  button.addEventListener("click", async () => {
    const pack = game.packs.get(`${game.system.id}.recon-tables`);
    const index = await pack?.getIndex();
    const entry = index?.find(e => /travel/i.test(e.name));
    if (!entry) {
      ui.notifications?.warn(game.i18n.localize("HELLPIERCERS.WARTABLE.noTravelTable"));
      return;
    }
    const table = await pack.getDocument(entry._id);
    await table.draw();
    button.disabled = true;
  });
}

/** Double-clicking a GM-only pin opens the faction's sheet instead of a missing journal. */
function onActivateNote(note, _options) {
  const pinKey = note.document.getFlag(game.system.id, FLAG);
  if (!pinKey || note.document.entryId) return true;
  const faction = factionActor(pinKey.split(".")[0]);
  if (faction) {
    Promise.resolve(faction.sheet.render({ force: true }))
      .then(app => app?.changeTab?.("locations", "primary"))
      .catch(() => {});
  }
  return false;
}

let syncTimer = null;

/** Resync every War Table a moment after faction data changes. */
function queueSync() {
  if (!game.user.isGM || syncTimer) return;
  const scenes = warTableScenes();
  if (!scenes.length) return;
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    for (const scene of warTableScenes()) {
      try {
        await syncWarTable(scene);
      } catch (err) {
        console.error("hellpiercers | War Table sync failed", err);
      }
    }
  }, 250);
}

function onUpdateActor(actor, changes) {
  if (actor.type !== "faction" || !getSetting("warTableSync")) return;
  const system = changes.system ?? {};
  if ("locations" in system || "hazards" in system || "convoys" in system) queueSync();
}

/** Start watching. Call once on `ready`. */
export function activateWarTable() {
  Hooks.on("moveToken", onMoveToken);
  Hooks.on("renderChatMessageHTML", onRenderChatMessage);
  Hooks.on("activateNote", onActivateNote);
  Hooks.on("updateActor", onUpdateActor);
  Hooks.on("hellpiercers.stratcomPhase", () => getSetting("warTableSync") && queueSync());
}
