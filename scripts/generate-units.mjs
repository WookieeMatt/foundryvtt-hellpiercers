#!/usr/bin/env node
/**
 * Generates the YAML sources of the "Faction Units" Actor compendium (src/packs/faction-units)
 * from scripts/data/units.json (extracted from the rulebook with scripts/data/parse_units.py).
 * IDs derive from the unit name so they stay stable between runs.
 *
 *   node scripts/generate-units.mjs && node scripts/pack.mjs faction-units
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const OUT = path.resolve("src/packs/faction-units");
const units = JSON.parse(fs.readFileSync(path.resolve("scripts/data/units.json"), "utf8"));

const ICONS = {
  boss: "systems/hellpiercers/assets/icons/warlord-helmet.svg",
  spawner: "systems/hellpiercers/assets/icons/portal.svg",
  minion: "systems/hellpiercers/assets/icons/cultist.svg",
};
const FACTION_NAMES = {
  syncrasis: "SYNCRASIS",
  henosis: "HENOSIS",
  autophyes: "AUTOPHYES",
  mixis: "MIXIS",
  metricos: "METRICOS",
  paracletus: "PARACLETUS",
  theletus: "THELETUS",
  ekklesia: "EKKLESIA",
};
const FACTION_COLORS = {
  syncrasis: "#8a2b2b",
  henosis: "#7d6a2a",
  autophyes: "#3f6b3a",
  mixis: "#5b3a73",
  metricos: "#a02f57",
  paracletus: "#2f6a73",
  theletus: "#3a5a8a",
  ekklesia: "#6b5a4a",
};

/** The parser mis-reads a few tag lines and one speed; the book values are applied here. */
const OVERRIDES = {
  "The Birth-Cap": { tags: ["Spawner", "Immobile"] },
  "Singing Scythe": { tags: ["Minion"] },
  "Stain Creep": { tags: ["Minion"] },
  "Latent Pudding": { tags: ["Minion"] },
  "Requiem Acolyte": { speed: "7" },
};

const id16 = seed => {
  const h = crypto.createHash("sha1").update(seed).digest();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 16 }, (_, i) => chars[h[i] % chars.length]).join("");
};
const slug = s => s.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Repair column-wrap hyphenation the PDF extraction left behind ("dam- age", "AM- DUSIAS"). */
const tidy = html =>
  html
    .replace(/([a-z])- ([a-z])/g, "$1$2")
    .replace(/([A-Z]{2})- ([A-Z]{2})/g, "$1$2")
    .replace(/<\/strong>\s*<strong>/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
const para = html => `<p>${tidy(html)}</p>`;
const paras = list => list.map(p => (p.startsWith("<h4>") ? p : para(p))).join("");

const now = Date.now();
const stats = {
  coreVersion: "14.370",
  systemId: "hellpiercers",
  systemVersion: "0.5.0",
  createdTime: now,
  modifiedTime: now,
};

/** Pull a damage formula and a range out of the printed text ("Arc:3, Damage:2"; "Burst:3 for 5 damage"). */
const KINDS = ["burst", "blast", "line", "cone", "ring", "star", "charge", "wall", "arc"];
const parseAttack = html => {
  const text = html.replace(/<[^>]+>/g, " ");
  const dmg = text.match(/Damage:\s*(\d+)/i) ?? text.match(/(\d+)\s+damage/i);
  const shape = text.match(new RegExp(String.raw`\b(${KINDS.join("|")})\s*:?\s*(\d+)`, "i"));
  const range = text.match(/Range:\s*(\d+)/i);
  return {
    formula: dmg ? dmg[1] : "0",
    range: shape
      ? { kind: shape[1].toLowerCase(), value: Number(shape[2]) }
      : { kind: "targets", value: range ? Number(range[1]) : 1 },
  };
};

/** An embedded ability on a boss. `action` is attack or special. */
const ability = (actorId, name, action, effect, sort) => ({
  _id: id16(`${actorId}:${name}:${sort}`),
  name,
  type: "ability",
  img: "systems/hellpiercers/assets/icons/round-star.svg",
  system: {
    action,
    effect: effect ?? "",
    attack:
      action === "attack"
        ? {
            range: { ...parseAttack(effect ?? "").range, name: "Range" },
            damage: { formula: parseAttack(effect ?? "").formula },
            description: effect ?? "",
          }
        : null,
    uses: null,
    trigger: null,
  },
  effects: [],
  sort: sort * 100000,
  flags: {},
  ownership: { default: 0 },
  _stats: stats,
  _key: `!actors.items!${actorId}.${id16(`${actorId}:${name}:${sort}`)}`,
});

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const write = (file, doc) =>
  fs.writeFileSync(path.join(OUT, file), yaml.dump(doc, { lineWidth: 100, noRefs: true }));

const folderIds = {};
let order = 0;
for (const [fid, name] of Object.entries(FACTION_NAMES)) {
  const _id = id16(`folder:${fid}`);
  folderIds[fid] = _id;
  write(`_Folder_${name}_${_id}.yml`, {
    name,
    type: "Actor",
    folder: null,
    sorting: "a",
    sort: order++ * 100000,
    color: FACTION_COLORS[fid],
    flags: {},
    _id,
    description: "",
    _stats: stats,
    _key: `!folders!${_id}`,
  });
}

const summary = [];
for (const raw of units) {
  const u = { ...raw, ...(OVERRIDES[raw.name] ?? {}) };
  const tags = u.tags.length ? u.tags : ["Minion"];
  const has = t => tags.some(x => x.toLowerCase() === t);
  const type = u.boss ? "boss" : has("spawner") ? "spawner" : "minion";
  const _id = id16(`unit:${u.faction}:${u.name}`);
  const speed = Number.parseInt(u.speed ?? "0", 10) || 0;
  const scale = u.scale ?? 1;
  const hp = u.hp ?? 1;

  const bio = [];
  if (u.subtitle) bio.push(`<p><em>${u.subtitle}</em></p>`);
  if (u.flavor) bio.push(`<p>${tidy(u.flavor)}</p>`);
  const facts = [];
  if (u.code) facts.push(`Codename: ${u.code}`);
  if (u.hp_total) facts.push("HP is shared by the whole Swarm (HP Total)");
  if (/\(/.test(u.speed ?? "")) facts.push(`Speed: ${u.speed}`);
  if (u.sprawl) facts.push(`Sprawl: ${u.sprawl}`);
  if (u.crown) facts.push(`Crown cost: ${u.crown}`);
  if (u.actions) facts.push(`Actions: ${u.actions} per player`);
  if (facts.length) bio.push(`<p>${facts.join(" · ")}</p>`);

  const agnosiaEffect = u.agnosia_text.length ? paras(u.agnosia_text) : "";
  const system = {
    biography: bio.join(""),
    faction: FACTION_NAMES[u.faction],
    tags,
    health: { value: hp, max: hp, temp: 0 },
    scale,
    speed,
  };
  const items = [];

  if (type === "boss") {
    system.actions = u.actions ?? "1";
    system.agnosia = { value: u.agnosia ?? 10, effect: agnosiaEffect, triggered: false };
    for (const [i, a] of u.attacks.entries()) {
      items.push(ability(_id, `Attack ${i + 1}`, "attack", para(a), i));
    }
    // A "special" paragraph is a rule; phase headings stay together as one block.
    if (u.special_text.length) {
      items.push(ability(_id, "Special", "special", paras(u.special_text), u.attacks.length));
    }
  } else if (type === "spawner") {
    const [first, ...rest] = u.special_text;
    system.spawn = {
      spawn: first ? para(first) : "",
      special: rest.length ? paras(rest) : "",
      name: "Special",
      charge: 0,
    };
  } else {
    const [first, ...rest] = u.attacks;
    const strike = parseAttack(first ?? "");
    system.strike = {
      name: "Strike",
      range: strike.range,
      damage: { formula: strike.formula },
      description: first ? para(first) : "",
    };
    for (const [i, a] of rest.entries()) {
      items.push(ability(_id, `Attack ${i + 2}`, "attack", para(a), i));
    }
    system.special = {
      name: "Special",
      description: u.special_text.length ? paras(u.special_text) : "",
    };
    system.agnosia = { value: u.agnosia ?? null, effect: agnosiaEffect, triggered: false };
  }

  const img = ICONS[type];
  write(`${slug(u.name)}_${_id}.yml`, {
    name: u.name,
    type,
    img,
    system,
    prototypeToken: {
      name: u.name,
      actorLink: false,
      disposition: -1,
      width: 2 * scale - 1, // Scale:2 is a 3x3 unit
      height: 2 * scale - 1,
      texture: { src: img },
      displayName: 20,
      displayBars: 20,
      bar1: { attribute: "health" },
    },
    items,
    effects: [],
    folder: folderIds[u.faction],
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: stats,
    _id,
    _key: `!actors!${_id}`,
  });
  summary.push(`${u.faction.padEnd(11)} ${type.padEnd(8)} ${u.name}`);
}
console.log(summary.join("\n"));
console.log(`\n${units.length} units, ${Object.keys(folderIds).length} folders -> ${OUT}`);
