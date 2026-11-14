#!/usr/bin/env node
/**
 * Generates the "Manual & Notes" journal (src/packs/systeminfo) from docs/GUIDE.md and CHANGELOG.md.
 * Every `##` heading in the guide becomes a page; the changelog becomes the Change Log page.
 *
 *   node scripts/generate-manual.mjs && node scripts/pack.mjs systeminfo
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const OUT = path.resolve("src/packs/systeminfo");
const guide = fs.readFileSync(path.resolve("docs/GUIDE.md"), "utf8");
const changelog = fs.readFileSync(path.resolve("CHANGELOG.md"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.resolve("src/system.json"), "utf8"));

const id16 = seed => {
  const h = crypto.createHash("sha1").update(seed).digest();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 16 }, (_, i) => chars[h[i] % chars.length]).join("");
};
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Inline Markdown: code, bold, italic, links. */
function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${esc(c)}</code>`);
    return `@@c${codes.length - 1}@@`;
  });
  s = esc(s)
    .replace(/&lt;(https?:\/\/[^&]+?)&gt;/g, '<a href="$1">$1</a>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  return s.replace(/@@c(\d+)@@/g, (_, i) => codes[Number(i)]);
}

/** Block Markdown: headings (### and below), paragraphs, lists, tables. */
function blocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = line.match(/^(#{3,4})\s+(.*)/);
    if (h) {
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = r =>
        r
          .replace(/^\||\|$/g, "")
          .split("|")
          .map(c => c.trim());
      const [head, , ...body] = rows;
      out.push(
        `<table><thead><tr>${cells(head)
          .map(c => `<th>${inline(c)}</th>`)
          .join("")}</tr></thead><tbody>${body
          .map(
            r =>
              `<tr>${cells(r)
                .map(c => `<td>${inline(c)}</td>`)
                .join("")}</tr>`
          )
          .join("")}</tbody></table>`
      );
      continue;
    }
    const list = line.match(/^(\s*)([-*]|\d+\.)\s+/);
    if (list) {
      const ordered = /\d/.test(list[2]);
      const items = [];
      while (i < lines.length && /^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) {
        let text = lines[i++].replace(/^(\s*)([-*]|\d+\.)\s+/, "");
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) text += ` ${lines[i++].trim()}`;
        items.push(`<li>${inline(text)}</li>`);
      }
      out.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{3,4}\s|\||(\s*)([-*]|\d+\.)\s)/.test(lines[i])
    )
      para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("");
}

/** Split a Markdown document into { title, lines } sections at `## `. */
function sections(md) {
  const result = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.*)/);
    if (m) {
      cur = { title: m[1], lines: [] };
      result.push(cur);
    } else if (cur) cur.lines.push(line);
  }
  return result;
}

const pages = sections(guide).map(s => ({ name: s.title, html: blocks(s.lines) }));

// Change Log: every version heading becomes an h2 in one page.
const log = sections(changelog)
  .map(s => `<h2>${inline(s.title)}</h2>${blocks(s.lines)}`)
  .join("");
pages.splice(Math.max(0, pages.length - 1), 0, { name: "Change Log", html: log });
pages.splice(1, 0, {
  name: "Version",
  html: `<p>HELLPIERCERS for Foundry VTT <strong>${pkg.version}</strong>, for Foundry v${pkg.compatibility.verified}. Source: <a href="${pkg.url}">${pkg.url}</a></p>`,
});

const now = Date.now();
const stats = {
  coreVersion: "14.370",
  systemId: "hellpiercers",
  systemVersion: pkg.version,
  createdTime: now,
  modifiedTime: now,
};
const jid = "dkbDQ8CZlhEazfw7";
const doc = {
  name: "Manual & Notes",
  pages: pages.map((p, i) => {
    const pid = id16(`manual:${p.name}`);
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
      category: null,
      _key: `!journal.pages!${jid}.${pid}`,
    };
  }),
  folder: null,
  sort: 0,
  ownership: { default: 0 },
  flags: { hellpiercers: { themed: true } },
  _stats: stats,
  _id: jid,
  _key: `!journal!${jid}`,
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, `Manual___Notes_${jid}.yml`),
  yaml.dump(doc, { lineWidth: 120, noRefs: true })
);
console.log(`${pages.length} pages: ${pages.map(p => p.name).join(", ")}`);
