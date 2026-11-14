/**
 * The STRATCOM engine: the campaign layer shared by the whole table.
 *
 * Holds the GM's Ichor and the STRATCOM phase counter (world settings), finds the active party, and
 * advances the campaign: construction progresses, convoys arrive, and the GM is told what happened.
 */

import { registerGmOperation } from "../api/socket.mjs";
import { ICHOR_PER_DEFEAT, ICHOR_PER_MISSION } from "./catalog.mjs";
import { FACTIONS_BY_ID } from "./faction-catalog.mjs";
import { availableMaps, createCampaignMap } from "./map.mjs";

const SYSTEM = () => game.system.id;

const ChatMessage = () => getDocumentClass("ChatMessage");

/** Whisper a STRATCOM note to the GMs. */
async function whisperGM(html) {
  return ChatMessage().create({
    content: `<div class="hellpiercers stratcom-note">${html}</div>`,
    whisper: ChatMessage()
      .getWhisperRecipients("GM")
      .map(u => u.id),
    flags: { [SYSTEM()]: { stratcom: true } },
  });
}

/** Announce something to everyone. */
async function announce(html) {
  return ChatMessage().create({
    content: `<div class="hellpiercers stratcom-note">${html}</div>`,
    flags: { [SYSTEM()]: { stratcom: true } },
  });
}

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Ichor                                       */
/* -------------------------------------------- */

export const ichor = Object.freeze({
  /** The GM's current Ichor. */
  get() {
    return game.settings.get(SYSTEM(), "ichor") ?? 0;
  },
  /** Set Ichor directly (GM only). */
  async set(value) {
    if (!game.user.isGM)
      return ui.notifications.warn(game.i18n.localize("HELLPIERCERS.MSG.gmIchorOnly"));
    return game.settings.set(SYSTEM(), "ichor", Math.max(0, Math.floor(value)));
  },
  /**
   * Gain Ichor.
   * @param {number} amount
   * @param {string} [reason]
   */
  async add(amount, reason = "") {
    if (!amount) return ichor.get();
    const total = ichor.get() + Math.floor(amount);
    await ichor.set(total);
    if (reason)
      await whisperGM(
        `<i class="fa-solid fa-droplet"></i> Ichor ${amount > 0 ? "+" : ""}${amount} (${esc(reason)}): ${total}`
      );
    return total;
  },
  /**
   * Spend Ichor. Returns false, and spends nothing, if the GM can't afford it.
   * @param {number} amount
   * @param {string} [reason]
   */
  async spend(amount, reason = "") {
    if (amount <= 0) return true;
    if (ichor.get() < amount) {
      ui.notifications.warn(
        game.i18n.format("HELLPIERCERS.MSG.notEnoughIchor", { have: ichor.get(), need: amount })
      );
      return false;
    }
    await ichor.add(-amount, reason);
    return true;
  },
});

/* -------------------------------------------- */
/*  Phase                                       */
/* -------------------------------------------- */

export const phase = Object.freeze({
  get() {
    return game.settings.get(SYSTEM(), "stratcomPhase") ?? 0;
  },
});

/* -------------------------------------------- */
/*  Parties and factions                        */
/* -------------------------------------------- */

/**
 * The active party: the one chosen in settings, otherwise the first party actor.
 * @returns {foundry.documents.Actor | null}
 */
export function getParty() {
  try {
    const id = game.settings.get(SYSTEM(), "activeParty");
    const chosen = id ? game.actors?.get(id) : null;
    if (chosen?.type === "party") return chosen;
    return game.actors?.find(a => a.type === "party") ?? null;
  } catch {
    return null;
  }
}

/** All faction actors. */
export function getFactions() {
  return game.actors.filter(a => a.type === "faction");
}

/**
 * Create a faction actor from the catalog.
 * @param {string} key  A faction id such as "syncrasis"
 * @param {object} [overrides]
 */
export async function createFaction(key, overrides = {}) {
  const FactionModel = CONFIG.Actor.dataModels.faction;
  const actor = await getDocumentClass("Actor").create(
    FactionModel.dataFromCatalog(key, overrides)
  );
  return actor;
}

/** Create a party (division). */
export async function createParty(name = "Division", overrides = {}) {
  return getDocumentClass("Actor").create({ name, type: "party", ...overrides });
}

/* -------------------------------------------- */
/*  Item unlocks                                */
/* -------------------------------------------- */

/**
 * Whether an item is unlocked by the party's buildings. With no party everything is unlocked.
 * @param {foundry.documents.Item | { type: string, name: string }} item
 * @param {foundry.documents.Actor | null} [party]
 * @returns {{ unlocked: boolean, building: string | null }}
 */
export function checkUnlocked(item, party = getParty()) {
  if (!party?.system?.isUnlocked) return { unlocked: true, building: null };
  return party.system.isUnlocked(item.type, item.name);
}

/* -------------------------------------------- */
/*  Phase advancement                           */
/* -------------------------------------------- */

/**
 * Advance the campaign by one STRATCOM phase (GM only):
 *  - every location under construction gains a build box, and goes live when complete
 *  - convoys that have travelled long enough arrive
 * The GM gets a private summary; players are only told a new phase began.
 * @returns {Promise<{ phase: number, built: string[], arrived: string[], grown: string[] }>}
 */
export async function advancePhase() {
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("HELLPIERCERS.MSG.gmPhaseOnly"));
    return { phase: phase.get(), built: [], arrived: [], grown: [] };
  }
  const next = phase.get() + 1;
  await game.settings.set(SYSTEM(), "stratcomPhase", next);

  const built = [];
  const arrived = [];
  const grown = [];
  for (const faction of getFactions()) {
    const system = faction.system;
    const locations = system.locations.map(l => l.toObject());
    const convoys = system.convoys.map(c => c.toObject());
    const hazards = system.hazards.map(h => h.toObject());
    let changed = false;

    // Staged map hazards that grow on their own (Devolve) take a step every phase.
    for (const hazard of hazards) {
      if (hazard.status !== "active" || !hazard.auto || hazard.stage >= hazard.maxStage) continue;
      hazard.stage += 1;
      changed = true;
      grown.push(`${faction.name}: ${hazard.name} reaches stage ${hazard.stage}`);
    }

    for (const location of locations) {
      if (location.status !== "building") continue;
      location.buildTime.value = Math.min(location.buildTime.max, location.buildTime.value + 1);
      changed = true;
      if (location.buildTime.value >= location.buildTime.max) {
        location.status = "active";
        built.push(`${faction.name}: ${location.name}`);
      }
    }
    for (const convoy of convoys) {
      if (convoy.status === "traveling" && convoy.arrivesPhase <= next) {
        convoy.status = "arrived";
        changed = true;
        arrived.push(
          `${faction.name}: ${convoy.name || convoy.kind} (${convoy.kind}) to ${convoy.to || "?"}`
        );
      }
    }
    if (changed) {
      await faction.update({
        "system.locations": locations,
        "system.convoys": convoys,
        "system.hazards": hazards,
      });
    }
  }

  const lines = [
    ...built.map(b => `<li><i class="fa-solid fa-hammer"></i> Completed: ${esc(b)}</li>`),
    ...arrived.map(a => `<li><i class="fa-solid fa-truck-fast"></i> Arrived: ${esc(a)}</li>`),
    ...grown.map(g => `<li><i class="fa-solid fa-biohazard"></i> ${esc(g)}</li>`),
  ];
  await announce(`<header>STRATCOM phase ${next}</header>`);
  if (lines.length)
    await whisperGM(`<header>Phase ${next}: GM summary</header><ul>${lines.join("")}</ul>`);
  Hooks.callAll("hellpiercers.stratcomPhase", next, { built, arrived, grown });
  return { phase: next, built, arrived, grown };
}

/* -------------------------------------------- */
/*  Missions                                    */
/* -------------------------------------------- */

/**
 * Finish the active party's mission and pay out: resources to the party, Ichor to the GM.
 * @param {object} [options]
 * @param {boolean} [options.success=true]
 */
export async function completeMission({ success = true } = {}) {
  const party = getParty();
  if (!party) return null;
  if (!game.user.isGM && !party.isOwner) return null;
  const { rewards, defeats, mastered, bonusAny } = await party.system.completeMission({ success });

  // A Triumph can promise resources of any type: ask which.
  if (bonusAny > 0) {
    const options = ["hellsteel", "soulfire", "brimstone"]
      .map(
        r => `<option value="${r}">${game.i18n.localize(`HELLPIERCERS.RESOURCES.${r}`)}</option>`
      )
      .join("");
    const choice = await foundry.applications.api.Dialog.input({
      window: { title: game.i18n.format("HELLPIERCERS.MSG.triumphReward", { count: bonusAny }) },
      content: `<div class="form-group"><label>Resource</label><div class="form-fields"><select name="resource">${options}</select></div></div>`,
    });
    const resource = choice?.resource ?? "hellsteel";
    await party.system.gain({ [resource]: bonusAny });
    rewards[resource] = (rewards[resource] ?? 0) + bonusAny;
  }

  const ichorGain = ICHOR_PER_MISSION + ICHOR_PER_DEFEAT * defeats;
  if (game.user.isGM)
    await ichor.add(ichorGain, `Mission${defeats ? `, ${defeats} defeated` : ""}`);

  const gained = Object.entries(rewards)
    .filter(([, n]) => n)
    .map(([r, n]) => `${n} ${r}`)
    .join(", ");
  await announce(
    `<header>${esc(party.name)} returns to DIS</header><p>${
      success ? (gained ? `Gained ${esc(gained)}.` : "No resources gained.") : "The mission failed."
    }</p>${mastered.length ? `<p>Class mastered: ${esc(mastered.join(", "))}</p>` : ""}`
  );
  Hooks.callAll("hellpiercers.missionComplete", party, { success, rewards, defeats, ichorGain });
  return { rewards, defeats, mastered, ichorGain };
}

/**
 * A HELLPIERCER went down: the GM earns Ichor for it at the end of the mission. This runs on
 * whichever client dealt the damage, so players ask the GM to record it.
 * @param {foundry.documents.Actor} actor
 */
async function onActorDowned(actor) {
  if (actor?.type !== "human") return;
  const party = getParty();
  if (!party?.system.mission.active) return;
  if (!party.system.members.has(actor.id)) return;
  if (game.user.isGM) return party.system.recordDefeat();
  // Players can't update the party unless they own it.
  if (party.isOwner) return party.system.recordDefeat();
}

registerGmOperation("recordDefeat", async ({ actorUuid }) => {
  const actor = await fromUuid(actorUuid);
  return onActorDowned(actor);
});

/** Hook up STRATCOM listeners. Call once on `ready`. */
export function activateStratcom() {
  Hooks.on("hellpiercers.actorDowned", onActorDowned);

  // When the party's buildings change, recompute everything derived from them.
  Hooks.on("updateActor", (actor, changes) => {
    if (actor.type !== "party" || !("system" in changes)) return;
    for (const a of game.actors) {
      if (a.type !== "human") continue;
      a.prepareData();
      if (a.sheet?.rendered) a.sheet.render();
    }
  });
}

export const FACTION_CATALOG = FACTIONS_BY_ID;

export const stratcom = Object.freeze({
  ichor,
  phase,
  getParty,
  getFactions,
  createFaction,
  createParty,
  checkUnlocked,
  advancePhase,
  completeMission,
  createCampaignMap,
  availableMaps,
});
