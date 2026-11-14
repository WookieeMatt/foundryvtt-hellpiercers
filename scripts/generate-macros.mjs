#!/usr/bin/env node
/**
 * Generates the YAML sources for the HELLPIERCERS macro compendium (src/packs/macros).
 * Edit the macro list below, run `node scripts/generate-macros.mjs`, then `npm run build`.
 * IDs are derived from the macro name so they stay stable between runs.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("src/packs/macros");

const input = (title, icon, content) => `const input = await foundry.applications.api.Dialog.input({
  window: { title: "${title}", icon: "${icon}" },
  content: \`${content}\`,
});`;

const statusSelect =
  filter => `const statuses = Object.values(CONFIG.statusEffects).filter(s => ${filter});
const options = statuses.map(s => \`<option value="\${s.id}">\${game.i18n.localize(s.name)}</option>\`).join("");`;

const amountField = (value, min = 0) =>
  `<div class="form-group"><label>Amount</label><div class="form-fields"><input type="number" name="amount" value="${value}" min="${min}" autofocus></div></div>`;

/** @type {Array<{ name: string, img: string, command: string }>} */
const macros = [
  {
    name: "Damage Targets",
    img: "icons/svg/sword.svg",
    command: `${input(
      "Damage Targets",
      "fa-solid fa-burst",
      `${amountField(5)}<div class="form-group"><label>Raw</label><div class="form-fields"><input type="checkbox" name="raw"></div><p class="hint">Skip Armor, Bleed and other modifiers.</p></div>`
    )}
if (!input) return;
const targets = game.user.targets.size ? [...game.user.targets] : canvas.tokens.controlled;
if (!targets.length) return ui.notifications.warn("Target or select a token first.");
await hellpiercers.damage(targets, Number(input.amount), { raw: input.raw });`,
  },
  {
    name: "Apply Status",
    img: "icons/svg/aura.svg",
    command: `${statusSelect("s.hud !== false && !s.flags?.core?.overlay")}
${input(
  "Apply Status",
  "fa-solid fa-plus",
  `<div class="form-group"><label>Status</label><div class="form-fields"><select name="status">\${options}</select></div></div><div class="form-group"><label>Stacks</label><div class="form-fields"><input type="number" name="stacks" value="1" min="1"></div></div>`
)}
if (!input) return;
const targets = canvas.tokens.controlled.length ? canvas.tokens.controlled : [...game.user.targets];
if (!targets.length) return ui.notifications.warn("Select a token first.");
await hellpiercers.status.add(targets, input.status, Number(input.stacks));`,
  },
  {
    name: "Clear Status",
    img: "icons/svg/cancel.svg",
    command: `${statusSelect("s.hud !== false")}
${input(
  "Clear Status",
  "fa-solid fa-eraser",
  `<div class="form-group"><label>Status</label><div class="form-fields"><select name="status">\${options}</select></div></div>`
)}
if (!input) return;
await hellpiercers.status.remove(null, input.status);`,
  },
  {
    name: "Heal Selected",
    img: "icons/svg/heal.svg",
    command: `${input("Heal", "fa-solid fa-heart", amountField(5, 1))}
if (input) await hellpiercers.heal(null, Number(input.amount));`,
  },
  {
    name: "Grant Temporary HP",
    img: "icons/svg/holy-shield.svg",
    command: `${input("Temporary HP", "fa-solid fa-shield-heart", amountField(2, 1))}
if (input) await hellpiercers.tempHP(null, Number(input.amount));`,
  },
  { name: "Rez Selected", img: "icons/svg/angel.svg", command: "await hellpiercers.rez();" },
  {
    name: "RECON Roll",
    img: "icons/svg/d20-grey.svg",
    command: "await hellpiercers.recon.dialog();",
  },
  { name: "Tone Die", img: "icons/svg/d10-grey.svg", command: "await hellpiercers.recon.tone();" },
  {
    name: "End Turn",
    img: "icons/svg/clockwork.svg",
    command: "await hellpiercers.combat.endTurn();",
  },
  {
    name: "Resolve End-of-Turn Effects",
    img: "icons/svg/poison.svg",
    command: `// Runs Poison, Healing, Pain Aura and decay for the selected token without advancing the combat.
const lines = await hellpiercers.combat.resolve(null, "end");
if (!lines.length) ui.notifications.info("Nothing to resolve.");`,
  },
  {
    name: "Refresh Actions",
    img: "icons/svg/upgrade.svg",
    command: "await hellpiercers.combat.refresh();",
  },
  {
    name: "Show Status Stacks",
    img: "icons/svg/eye.svg",
    command: `const actor = hellpiercers.resolve()[0];
if (!actor) return ui.notifications.warn("Select a token first.");
const rows = hellpiercers.status.list().map(id => [id, actor.getStatusStacks(id)]).filter(([, n]) => n > 0);
ui.notifications.info(rows.length ? rows.map(([id, n]) => \`\${id}:\${n}\`).join(", ") : "No active statuses.");`,
  },
];

const stableId = name => `HP${name.replace(/[^A-Za-z0-9]/g, "")}`.slice(0, 16).padEnd(16, "0");

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

const ids = new Set();
macros.forEach((m, i) => {
  const id = stableId(m.name);
  if (ids.has(id)) throw new Error(`Duplicate macro id ${id}`);
  ids.add(id);
  const body = m.command
    .split("\n")
    .map(l => (l.trim() ? `  ${l}` : ""))
    .join("\n");
  const yml = `name: ${m.name}
type: script
command: |-
${body}
img: ${m.img}
author: null
scope: global
folder: null
ownership:
  default: 0
flags: {}
_stats:
  compendiumSource: null
  duplicateSource: null
  coreVersion: '14.370'
  systemId: hellpiercers
  systemVersion: 0.2.0
  createdTime: 1763100000000
  modifiedTime: 1763100000000
  lastModifiedBy: null
  exportSource: null
_id: ${id}
sort: ${i * 100000}
_key: '!macros!${id}'
`;
  fs.writeFileSync(path.join(OUT, `${m.name.replace(/\s+/g, "_")}_${id}.yml`), yml, "utf8");
});
console.log(`Wrote ${macros.length} macros to ${OUT}`);
