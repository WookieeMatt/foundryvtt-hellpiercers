#!/usr/bin/env node
/**
 * Compile the YAML pack sources in src/packs into LevelDB packs in dist/packs.
 *
 * Usage:
 *   npm run build:packs               compile every pack
 *   npm run build:packs -- macros     compile only the named packs
 *
 * Foundry keeps a lock on packs of a loaded world: close the world (or the server) before
 * recompiling a pack that is already in use.
 */
import fs from "node:fs/promises";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

// https://discord.com/channels/170995199584108546/1090432971850403952/1152119148130881556

const MODULE_ID = process.cwd();
const only = new Set(process.argv.slice(2));

const packs = await fs.readdir("./src/packs");
for (const pack of packs) {
  if (pack === ".gitattributes") continue;
  if (only.size && !only.has(pack)) continue;
  console.log(`Packing ${pack}`);
  await compilePack(`${MODULE_ID}/src/packs/${pack}`, `${MODULE_ID}/dist/packs/${pack}`, {
    yaml: true,
    log: true,
  });
}
