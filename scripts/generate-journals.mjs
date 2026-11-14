#!/usr/bin/env node
/**
 * Generates the YAML sources of the "Rules Reference" JournalEntry compendium
 * (src/packs/reference). Everything is built from the same catalogs the STRATCOM engine uses, so
 * the reference can never drift from the automation.
 *
 *   node scripts/generate-journals.mjs && node scripts/pack.mjs reference
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  BUILDINGS,
  CONVOY_KINDS,
  GRID_SUITES,
  OBJECTIVES,
  OFF_GRID_MUNITIONS,
  RESEARCH_PROJECTS,
  TRIUMPHS,
  VEHICLE_OPTIONS,
} from "../src/stratcom/catalog.mjs";
import { FACTIONS } from "../src/stratcom/faction-catalog.mjs";
import { ROLE_ACTIONS } from "../src/stratcom/roles.mjs";

const OUT = path.resolve("src/packs/reference");
const lang = JSON.parse(fs.readFileSync(path.resolve("public/lang/en.json"), "utf8"));
const STATUSES = lang.HELLPIERCERS.STATUSES;

const id16 = seed => {
  const h = crypto.createHash("sha1").update(seed).digest();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 16 }, (_, i) => chars[h[i] % chars.length]).join("");
};
const now = Date.now();
const stats = {
  coreVersion: "14.370",
  systemId: "hellpiercers",
  systemVersion: "0.5.0",
  createdTime: now,
  modifiedTime: now,
};
const esc = s =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const cost = c => {
  const parts = Object.entries(c ?? {}).map(([k, v]) => `${v} ${k[0].toUpperCase()}${k.slice(1)}`);
  return parts.length ? parts.join(", ") : "—";
};
const table = (head, rows) =>
  `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
const QUALITY = {
  force: "Force",
  subterfuge: "Subterfuge",
  territory: "Territory",
  assets: "Assets",
};
const quality = q =>
  Object.entries(q ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `+${v} ${QUALITY[k]}`)
    .join(", ") || "—";

const pages = [];
const page = (name, html) => pages.push({ name, html });

// Effects -----------------------------------------------------------------------------------------
{
  const rows = Object.values(STATUSES).map(s => [
    `<strong>${esc(s.name)}</strong>`,
    esc(s.description),
  ]);
  page(
    "Effects",
    `<p>Every Effect from the Core Rules (pp. 94-95) plus the faction and equipment Effects. The TACCOM engine applies the automatic ones at the start and end of each turn.</p>${table(["Effect", "Rule"], rows)}`
  );
}

// STRATCOM ----------------------------------------------------------------------------------------
page(
  "STRATCOM Buildings",
  `<p>The base-building tech tree follows the drawn tree (pp. 115-117). Resources: Hellsteel, Soulfire, Brimstone.</p>${table(
    ["Building", "Cost", "Requires", "Unlocks"],
    BUILDINGS.map(b => [
      `<strong>${esc(b.name)}</strong><br><em>${esc(b.mechanic)}</em>`,
      cost(b.cost),
      b.requires.length
        ? b.requires.map(r => esc(BUILDINGS.find(x => x.id === r)?.name ?? r)).join(", ")
        : "—",
      Object.entries(b.unlocks ?? {})
        .map(([k, v]) => `<strong>${esc(k.replace("_", " "))}</strong>: ${v.map(esc).join(", ")}`)
        .join("<br>") || "—",
    ])
  )}`
);

page(
  "Missions & Objectives",
  `<p>Every mission pays out when it succeeds. The GM earns 1 Ichor per mission and 2 per defeated HELLPIERCER (p. 224).</p>${table(
    ["Objective", "Reward", "Notes"],
    Object.values(OBJECTIVES).map(o => [
      `<strong>${esc(o.label)}</strong>`,
      cost(o.reward),
      esc(o.penalty ?? ""),
    ])
  )}`
);

page(
  "Triumphs",
  `<p>A Triumph is a self-imposed challenge for one mission in exchange for a reward (pp. 121-122).</p>${table(
    ["Triumph", "Challenge", "Reward"],
    Object.values(TRIUMPHS).map(t => [
      `<strong>${esc(t.name)}</strong>`,
      esc(t.challenge),
      esc(t.reward),
    ])
  )}`
);

page(
  "Roles",
  Object.entries(ROLE_ACTIONS)
    .map(
      ([role, actions]) =>
        `<h2>${esc(role[0].toUpperCase() + role.slice(1))}</h2>${actions
          .map(a => {
            const c = a.cost
              ? ` <em>(${Object.entries(a.cost)
                  .map(([k, v]) => `${v} ${k}`)
                  .join(", ")})</em>`
              : "";
            const opts = a.options?.length
              ? `<ul>${a.options.map(o => `<li>${esc(o.name)}: ${cost(o.cost)}</li>`).join("")}</ul>`
              : "";
            return `<h3>${esc(a.name)} <small>${a.phase.toUpperCase()}</small>${c}</h3><p>${esc(a.text)}</p>${opts}`;
          })
          .join("")}`
    )
    .join("")
);

page(
  "Off-Grid & Grid Manipulation",
  `<h2>Off-Grid Munitions</h2><ul>${OFF_GRID_MUNITIONS.map(m => `<li>${esc(m)}</li>`).join("")}</ul><h2>Grid Manipulation Suites</h2>${table(
    ["Suite", "Tiles"],
    Object.values(GRID_SUITES).map(g => [`<strong>${esc(g.name)}</strong>`, esc(g.tiles)])
  )}`
);

page(
  "Vehicle",
  `<p>The squad's vehicle has two upgrade slots and a readiness (ready, capable, ruin).</p>${table(
    ["Option", "Kind", "Cost", "Requires"],
    VEHICLE_OPTIONS.map(v => [
      `<strong>${esc(v.name)}</strong>`,
      esc(v.kind),
      cost(v.cost),
      esc(v.requires ?? "—"),
    ])
  )}`
);

// GM side -----------------------------------------------------------------------------------------
page(
  "GM: Research & Convoys",
  `<h2>Research Projects</h2>${table(
    ["Project", "Ichor", "Phases", "Limit", "Effect"],
    RESEARCH_PROJECTS.map(r => [
      `<strong>${esc(r.name)}</strong>`,
      r.cost,
      r.time,
      esc(r.limit ?? "—"),
      esc(r.effect),
    ])
  )}<h2>Convoys</h2>${table(
    ["Kind", "Outcomes"],
    Object.values(CONVOY_KINDS).map(k => [
      `<strong>${esc(k.label)}</strong>`,
      k.outcomes.map(esc).join(", ") || "—",
    ])
  )}`
);

// Factions ----------------------------------------------------------------------------------------
for (const f of FACTIONS) {
  const locs = list =>
    table(
      ["Location", "Type", "Quality", "Build time"],
      list.map(l => [
        `<strong>${esc(l.name)}</strong>${l.requires ? `<br><em>Requires ${esc(l.requires)}</em>` : ""}`,
        esc(l.type),
        quality(l.quality),
        l.buildTime ? "▢".repeat(l.buildTime) : "—",
      ])
    );
  page(
    `Faction: ${f.name}`,
    `<p><em>${esc(f.crown)}</em></p><p><strong>Boss:</strong> ${esc(f.boss)}${f.start ? ` · <strong>Starting Qualities:</strong> Force ${f.start.force}, Subterfuge ${f.start.subterfuge}, Territory ${f.start.territory}, Assets ${f.start.assets}` : ""}</p><h2>Starting locations</h2>${locs(f.starting)}<h2>Unique locations</h2>${f.unique.length ? locs(f.unique) : "<p>—</p>"}<h2>Upgrades</h2>${table(
      ["Upgrade", "Cost", "Effect"],
      f.upgrades.map(u => [
        `<strong>${esc(u.name)}</strong>${u.requires ? `<br><em>Requires ${esc(u.requires)}</em>` : ""}`,
        u.cost,
        esc(u.effect),
      ])
    )}`
  );
}

// Write -------------------------------------------------------------------------------------------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const jid = id16("journal:reference");
const doc = {
  name: "HELLPIERCERS Reference",
  pages: pages.map((p, i) => {
    const pid = id16(`page:${p.name}`);
    return {
      sort: (i + 1) * 100000,
      name: p.name,
      type: "text",
      _id: pid,
      system: {},
      title: { show: true, level: 1 },
      image: {},
      text: { format: 1, content: p.html },
      video: { controls: true, volume: 0.5 },
      src: null,
      ownership: { default: -1 },
      flags: {},
      _stats: stats,
      _key: `!journal.pages!${jid}.${pid}`,
    };
  }),
  folder: null,
  sort: 0,
  ownership: { default: 0 },
  flags: {},
  _stats: stats,
  _id: jid,
  _key: `!journal!${jid}`,
};
fs.writeFileSync(
  path.join(OUT, `HELLPIERCERS_Reference_${jid}.yml`),
  yaml.dump(doc, { lineWidth: 120, noRefs: true })
);
console.log(`${pages.length} pages -> ${OUT}`);
