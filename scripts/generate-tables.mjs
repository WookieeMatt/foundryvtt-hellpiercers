#!/usr/bin/env node
/**
 * Generates the YAML sources of the "RECON Tables" RollTable compendium (src/packs/recon-tables).
 * The numbered book tables come from scripts/data/tables.json (extracted with
 * scripts/data/parse_tables.py); the NPC, Item and Location generators are short and listed here.
 *
 *   node scripts/generate-tables.mjs && node scripts/pack.mjs recon-tables
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const OUT = path.resolve("src/packs/recon-tables");
const book = JSON.parse(fs.readFileSync(path.resolve("scripts/data/tables.json"), "utf8"));

const id16 = seed => {
  const h = crypto.createHash("sha1").update(seed).digest();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 16 }, (_, i) => chars[h[i] % chars.length]).join("");
};
const slug = s => s.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
const now = Date.now();
const stats = {
  coreVersion: "14.370",
  systemId: "hellpiercers",
  systemVersion: "0.5.0",
  createdTime: now,
  modifiedTime: now,
};
const strip = html =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
const short = (text, words = 9) => {
  const w = strip(text).split(" ");
  return w.slice(0, words).join(" ") + (w.length > words ? "…" : "");
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const tables = [];

/** @param {string} name @param {string} formula @param {string} description @param {Array<{range:number[], name:string, description?:string}>} results */
const table = (name, formula, description, results, folder = null) =>
  tables.push({ name, formula, description, results, folder });

// Book tables (d20 / d8 / d10) -----------------------------------------------------------------
const BOOK_META = {
  "Chambers of Forbidden Truths": {
    formula: "1d20",
    page: 66,
    text: "Roll when the squad uncovers a Chamber of Forbidden Truths (2 Revelation).",
  },
  Corridors: {
    formula: "1d20",
    page: 70,
    text: "Roll when the squad explores the caverns (1 Supply, gain 1 Revelation).",
  },
  Vaults: { formula: "1d20", page: 74, text: "Roll when the squad opens a Vault." },
  "Legendary Arms": {
    formula: "1d8",
    page: 79,
    text: "The 8 legendary arms held in the Beelzebuthian Armory.",
  },
  Scavenge: {
    formula: "1d10",
    page: 82,
    text: "Roll when the squad scavenges (gain 1 Revelation and roll the Tone Die).",
  },
  Scout: { formula: "1d20", page: 85, text: "Roll when the squad scouts ahead (1 Revelation)." },
  Travel: { formula: "1d20", page: 88, text: "Roll on every leg of travel (2 Fuel)." },
};
for (const [title, entries] of Object.entries(book)) {
  const meta = BOOK_META[title];
  table(
    `RECON: ${title}`,
    meta.formula,
    `<p>${meta.text} <em>(Core Rules p.${meta.page})</em></p>`,
    entries.map(e => {
      const heading = e.blocks.find(([k]) => k === "h")?.[1];
      const body = e.blocks
        .map(([k, v]) =>
          k === "h" ? `<h3>${v}</h3>` : k === "s" ? `<p><strong>${v}</strong></p>` : `<p>${v}</p>`
        )
        .join("");
      const first = e.blocks.find(([k]) => k === "p")?.[1] ?? "";
      return { range: [e.n, e.n], name: heading ?? short(first), description: body };
    }),
    "RECON"
  );
}

// NPC generator ---------------------------------------------------------------------------------
const NPC = [
  ["Laodice", "New HELLPIERCER, Sentimental", "Find A Purpose"],
  ["Argrophylax", "Crusader's Spirit, Joyously Choleric", "Further Ascension"],
  ["Azra Heydari", "Quantum Alchemist, Capricious", "Liberate A Friendly Soul"],
  ["Zenobia", "Sacred Assassin, Sentimental", "Kill Crowned Demons"],
  ["Sibilia Xenos", "Blind Oracle, Intoxicated Hedonist", "Live In The Present"],
  ["Onesiphoros", "Master Technite, Indolent Wastrel", "Create Strange Art"],
  ["Nasim Al-Zaer", "Phlegmatic, Rebellious Heavenite", "Tend A Farm"],
  ["Chrysanthe", "Dissatisfied HELLPIERCER, Ornery", "Find A Purpose"],
  ["Hypatia Photos", "Strangely Energetic, Genius Crafter", "Invent Wonders"],
  ["The Wandering Eye", "Cryptic Observer, Melancholy", "Talk To Ancient Souls"],
  ["Yazdandar", "Devious Strategist, Melodramatic", "Capture, Study Demons"],
  ["Lysimachos", "Hot-Blooded, Angel Slayer", "Ascend Through Battle"],
  ["Cyril", "Mercurial Spirit, Habitual Paranoid", "Safety Through Power"],
  ["Artavardiya", "Sharp-Tongued, Unlucky Assassin", "Attain Foreknowledge"],
  ["Pandora Kalos", "Sanguine, Hyper-Pharmacist", "Explore New Mind States"],
  ["Jawad the Heretic", "Perfectionist Sage, Pronoiac", "Uncover Hidden Truths"],
  ["Petrus Charinus", "Quixotic Warrior-Poet, Loquacious", "Record Great Battles"],
  ["Zenogene Venator", "Superstitious, Erudite Physicist", "Justify Going Home"],
  ["Libra Nikos", "Loudmouth Punk, Rebellious", "Have A Cat"],
  ["Zaman", "Time-Lost, Purified Spirit", "Change The Future"],
];
const npcDesc =
  "<p>One of the three columns of the NPC Generator. Roll a D20 on each (Name, Traits, Desires). <em>(Core Rules p.234)</em></p>";
const column = (rows, i) => rows.map((r, n) => ({ range: [n + 1, n + 1], name: r[i] }));
table("NPC: Name", "1d20", npcDesc, column(NPC, 0), "Generators");
table("NPC: Traits", "1d20", npcDesc, column(NPC, 1), "Generators");
table("NPC: Desires", "1d20", npcDesc, column(NPC, 2), "Generators");

// Item table (D66) ------------------------------------------------------------------------------
const ITEMS = [
  ...[
    "Fallen Mars model",
    "Alchemic phials",
    "Tatters Of Lost Gold-Skin",
    "Astrological Replicant",
    "Archon statue",
    "Gleaming pearl",
  ],
  ...[
    "Angelic Death Mask",
    "Soul-cage pendant",
    "Abraxas-stone amulet",
    "Rune-carved ammo",
    "Obscure ritual formulae",
    "Ancient bone reliquary",
  ],
  ...[
    "Apotropaic wand",
    "Bezelbubian Propaganda",
    "Chronophage leech jar",
    "Lost Spinther",
    "Cybernetic clawed arm",
    "Tattered Orphite Diagrams",
  ],
  ...[
    "Sentient Brick, Screaming For Its Master",
    "Hellsteel-alloy chains",
    "Fuel, 3 units. Sentient.",
    "Old, shattered crown",
    "Asphodelian psychedelics",
    "Scales of the Second Eve",
  ],
  ...[
    "Soulfire chrysanthemum",
    "Immaterium Navigation Records",
    "Audio-Absorbing Runestone, Full",
    "Adapted Human Tech",
    "Pooled Ogdoadian Remains",
    "Obsidian Pillar, Numbered",
  ],
  ...[
    "Strange Hell Fruit",
    "Archaic comm unit",
    "Syzygos-Wrought Dagger",
    "Anachronistic firearm",
    "Miniaturized magnetar",
    "Nous Bezoar",
  ],
];
table(
  "Item Table",
  "(1d6 * 10) + 1d6",
  "<p>Roll a D66 (a D6 for the tens and a D6 for the units). Demons usually don't drop items. <em>(Core Rules p.235)</em></p>",
  ITEMS.map((name, i) => {
    const n = (Math.floor(i / 6) + 1) * 10 + (i % 6) + 1;
    return { range: [n, n], name };
  }),
  "Generators"
);

// Location generator (D10 per column) -----------------------------------------------------------
const LOCATION = {
  Purpose: [
    "Military Outpost",
    "Open-Pit Mine",
    "Agriculture",
    "Circus",
    "Construction Yard",
    "Strategic Center",
    "Barracks",
    "Mercenary Base",
    "Laboratory",
    "Hell Resort",
  ],
  Geography: [
    "Lava Pits",
    "Lush Forest",
    "Stone Forest",
    "Beach",
    "Non-Geometric Space",
    "Frozen",
    "Shadowy Karst",
    "Glaciovolcano",
    "Floating Island",
    "Strange Ruins",
  ],
  Garrison: [
    "Occupied",
    "Skeleton Crew",
    "Floating Above",
    "Deep Below",
    "Total Lockdown",
    "Faction Mutiny",
    "Faction War",
    "Eternal Battlefield",
    "Seemingly Empty",
    "Hosting Guests",
  ],
  Resources: [
    "Bodies",
    "Souls",
    "Monsters",
    "Oil",
    "Ore",
    "Brimstone",
    "Hellsteel",
    "Obsidian",
    "Forgotten Ritual",
    "Lost Research",
  ],
  Defenses: [
    "Weapons Array",
    "Cloaking Engine",
    "Ancient Battlements",
    "Shifting Labyrinth",
    "Enslaved Souls",
    "Insect Swarms",
    "Spike Fields",
    "Sentient Megafauna",
    "Chimeric Abominations",
    "Undead Swarm",
  ],
  "Who's In Charge": [
    "Paranoid Tyrant",
    "Bloodthirsty Warlord",
    "Armchair Commander",
    "Gilded Merchant",
    "Craven Torturer",
    "Cunning Spymaster",
    "Gilded Merchant",
    "Ruthless Engineer",
    "Cruel Strategist",
    "Reclusive Technophile",
  ],
};
for (const [col, values] of Object.entries(LOCATION)) {
  table(
    `Location: ${col}`,
    "1d10",
    "<p>One of the six columns of the Location Generator. Roll a D10 on each. <em>(Core Rules p.236)</em></p>",
    values.map((name, n) => ({ range: [n + 1, n + 1], name })),
    "Generators"
  );
}

// Folders ---------------------------------------------------------------------------------------
const folderIds = {};
["RECON", "Generators"].forEach((name, i) => {
  const _id = id16(`folder:${name}`);
  folderIds[name] = _id;
  fs.writeFileSync(
    path.join(OUT, `_Folder_${name}_${_id}.yml`),
    yaml.dump({
      name,
      type: "RollTable",
      folder: null,
      sorting: "a",
      sort: i * 100000,
      color: null,
      flags: {},
      _id,
      description: "",
      _stats: stats,
      _key: `!folders!${_id}`,
    })
  );
});

// Tables ----------------------------------------------------------------------------------------
let order = 0;
for (const t of tables) {
  const _id = id16(`table:${t.name}`);
  const results = t.results.map(r => {
    const rid = id16(`${t.name}:${r.range[0]}`);
    return {
      _id: rid,
      type: "text",
      name: r.name,
      img: null,
      description: r.description ?? "",
      weight: 1,
      range: r.range,
      drawn: false,
      flags: {},
      _stats: stats,
      _key: `!tables.results!${_id}.${rid}`,
    };
  });
  fs.writeFileSync(
    path.join(OUT, `${slug(t.name)}_${_id}.yml`),
    yaml.dump(
      {
        name: t.name,
        img: "icons/svg/d20-grey.svg",
        description: t.description,
        results,
        formula: t.formula,
        replacement: true,
        displayRoll: true,
        folder: folderIds[t.folder] ?? null,
        sort: order++ * 100000,
        ownership: { default: 0 },
        flags: {},
        _stats: stats,
        _id,
        _key: `!tables!${_id}`,
      },
      { lineWidth: 110, noRefs: true }
    )
  );
}
console.log(`${tables.length} tables -> ${OUT}`);
