# Handoff: HELLPIERCERS for Foundry VTT

Read this first. It is written for the next engineer (human or AI) taking over the project. It says what the
project is, what is finished, how to work on it without breaking things, and where the room for something
really cool is.

**Goal of the next phase.** The system is feature-complete against the Core Rules and styled to the book.
The user wants to find "something really cool to add or change". Treat that as a design task first
(pick one or two ideas from section 8, confirm with the user), then an engineering task.

## 1. The project in one paragraph

A private, polished Foundry VTT **v14.370** game system for HELLPIERCERS: Tactical Harrowing Action (Sandy Pug
Games). It started as the open-source system by Bolts (Codeberg, GPL-3.0, credited in README and
`system.json`) and was upgraded in place, but is deliberately **kept separate**: nothing goes upstream and the
system id stays `hellpiercers`. Repo: private `https://github.com/WookieeMatt/foundryvtt-hellpiercers`
(branch `main`, release tags `v*`). Latest release **v0.8.0**; every release so far was confirmed green in CI
by the user.

The user wants a "masterpiece": very well made, using the modern v14 APIs (ApplicationV2, DataModels,
Regions, the new Combat lifecycle...). Because it is private, book content may be included. They prefer
that you follow the printed rules, ask only when a decision is really theirs, and report outcomes plainly.

## 2. What exists (v0.8.0)

| Area | Done |
| --- | --- |
| **TACCOM** | Turn engine (any-order activation, lifecycle through `Combat#_manageTurnEvents`), action economy (Main/Support/Aux/Move, Haste, Shock, Frozen, Pin), turn effects (Poison, Healing, Blazing spread, Pain Aura, Countdown, Brand, Spawner charge), damage engine (Armor, Bleed, Broken, Wrack, Snakeskin, Glassflesh, Compel, Constrict, Transference, Bound, temp HP), ability cards, Provoke (v14 `moveToken` hook, path-aware, Undo button), Swarms (HP pool, join/merge/break, attack plan, expend tiles), Limit Break credit, Agnosia, Reversal, Rez, boss Variable Action System |
| **STRATCOM** | Party actor (resources, drawn tech tree, item unlock gating, missions, vehicle, Roles, Triumphs, Off-Grid, Grid Manipulation list, Legendary Arms/Aion, Class Mastery), Faction actor (derived Qualities/Crown, locations with build time, convoys, research, upgrades, War Journal, STRATCOM actions, staged map hazards), world Ichor and phase counter, faction rolls, campaign-map scene helper |
| **RECON** | 2D6 + tags, Tone Die, all book roll tables as RollTables |
| **Data** | `player-gear` (73) and `player-abilities` (72) from the original, `faction-units` (95 actors), `recon-tables` (17), `reference` journal, `macros` (18), `systeminfo` manual |
| **Integrations** | Dice So Nice (themed dice), Automated Animations bridge, built-in Sequencer + JB2A effects (Free and Premium auto-detected) |
| **UI** | Parchment and Night themes in the book's style, sheets for all 7 actor types and 8 item types, chat cards, tracker, dialogs, journals; i18n of STRATCOM templates and messages |
| **Docs** | `docs/GUIDE.md`, `docs/API.md`, `docs/THEMING.md`, `CHANGELOG.md`, `ROADMAP.md`, in-Foundry manual |

Read `docs/GUIDE.md` (what it does for a table) and `docs/API.md` (the hooks and macro API) before coding.

## 3. Environment on this machine

| Thing | Where |
| --- | --- |
| Repo | `D:\Random RPG\Hellpiercers\foundryvtt-hellpiercers` |
| Rulebook PDFs and map art | `D:\Random RPG\Hellpiercers\` (`Hellpiercers Core Rules.pdf`, `...Player Sheet.pdf`, `...Party Sheet.pdf`, `...GM Sheet.pdf`, `Map(<faction>).png/jpg`) |
| Foundry | `D:\FoundryVTT14` (v14 build 370, `http://localhost:30000`, no admin password). Its client source is readable under `D:\FoundryVTT14\Foundry Virtual Tabletop\resources\app\{client,common}`: **read it to verify v14 APIs rather than guessing** |
| System install | `D:\FoundryVTT14\Data\systems\hellpiercers` is a **junction to the repo's `dist/`**; `npx vite build` updates it in place |
| Modules installed | `D:\FoundryVTT14\Data\modules`: `dice-so-nice`, `sequencer`, `socketlib`, `lib-wrapper`, `autoanimations`, `JB2A_DnD5e`, `jb2a_patreon` (all v14-verified), plus unrelated ones |
| Test world | `hellpiercers-test`, user **Gamemaster** (no password). It has a Test Arena scene, one actor of each type, the 7 faction actors, a party, a running combat, and the modules above enabled |
| Memory notes | `C:\Users\mriml\.claude\projects\D--Random-RPG-Hellpiercers\memory\` (rules summaries: core rules parts 1-2, factions 1-2, GM mechanics, graphics-only facts; and `hellpiercers-foundry-system.md`, the project log). If you run in the same project they load automatically; otherwise read them: they are the fastest way to learn the rules |
| Git | `http.sslBackend=schannel` is set on this repo only (the bundled OpenSSL fails certificate checks here). Pushes use Git Credential Manager. There is **no `gh` CLI** and you cannot see CI: ask the user to confirm CI status (they send a screenshot or say "green") |

### Build, reload, test

```bash
npx vite build                      # JS, CSS, templates, lang, and the packs; updates dist/ (the junction)
npx biome check src scripts         # lint (must be clean)
npx dprint fmt                      # format (LF line endings); run before building and committing
node scripts/pack.mjs <pack>        # compile one YAML pack: close the world first (LevelDB lock)
```

To load changes in the running test world: JS, CSS, templates and lang need only a page reload
(`location.reload()`); a changed `system.json` or pack needs the world closed, then POST
`{"action":"resetPackages"}` to `/setup`, then launch the world and join as Gamemaster:

```js
// in the browser pane, on /setup
await fetch("/setup", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"launchWorld", world:"hellpiercers-test"})});
// then open /join, pick Gamemaster, click Join Game Session
```

`game.shutDown()` (in the page) returns the world to setup.

### Testing with the browser pane (important)

- Use the built-in browser tab (`tab-1`, `http://localhost:30000/game`). Call `mcp__ccd_view__show_pane` with
  `preview` first: **a hidden pane freezes the canvas ticker, so animations and `canvas.animatePan` never finish.**
- Prefer `javascript_exec` to drive the game (`game.actors.getName(...)`, `hellpiercers.*` API) and the
  screenshot tool to look at the result. Verify with real data, not just "it built".
- **Never close every entry of `foundry.applications.instances`**: that includes the sidebar and hotbar. Close
  only sheets (`a.options.classes?.includes("sheet") || a.document`).
- To see a sidebar tab: `ui.sidebar.changeTab("combat","primary")`, and click the collapsed tab icon if the
  sidebar is closed.
- The viewport is small; set sheet positions explicitly (`sheet.setPosition({left, top, width, height})`).

## 4. Repository map

```
src/system.json            Manifest: compat, packs, document types, relationships, settings
src/hellpiercers.mjs       Entry: registers models, sheets, settings, hooks; exposes the `hellpiercers` API
src/settings.mjs           All settings (+ applySheetTheme)
src/data/                  DataModels: actor.mjs (human/halo/minion/boss/spawner), party.mjs, faction.mjs,
                           item.mjs, damage.mjs, attack.mjs, range-model.mjs, combatant(.group).mjs, effect.mjs
src/documents/             Document classes: actor.mjs (takeDamage/heal/rez/applyStatus...), item.mjs (use/toChat),
                           combat.mjs, combatant.mjs, token.mjs
src/taccom/                engine.mjs (turn lifecycle), actions.mjs, provoke.mjs, swarm.mjs
src/stratcom/              catalog.mjs (buildings, objectives, triumphs, research), roles.mjs, faction-catalog.mjs
                           (8 factions), faction-actions.mjs + data/faction-actions.json, engine.mjs (ichor,
                           phase, missions), map.mjs (campaign map scene)
src/integrations/          dice.mjs (Dice So Nice), animations.mjs (provider, JB2A resolver, AA bridge),
                           jb2a-catalog.mjs (candidate paths; Node-importable)
src/applications/          sheets/ (ApplicationV2 sheets), dialogs/ (attack HUD, editors), hud/ (token HUD),
                           sidebar/ (combat tracker)
src/canvas/                range-template.mjs, targeting.mjs, adjacency.mjs, placeables/token.mjs
src/api/                   index.mjs (the `hellpiercers` API: damage, status, combat, recon...), socket.mjs
src/styles/                _theme _mixins _fonts _chat _journal _dialogs _overrides, sheets/, stratcom, taccom
public/templates/          Handlebars templates (sheets, chat, dialogs)
public/lang/en.json        Localization: HELLPIERCERS.UI.* (templates), .MSG.* (messages), and the older keys
public/fonts/hp/           Bundled OFL fonts
scripts/                   generate-*.mjs (build compendium sources), pack.mjs, data/ (PDF extractors + output)
docs/                      GUIDE, API, THEMING, HANDOFF
```

Key design facts:

- **Engine hooks, not core patches.** TACCOM listens to Foundry v14 combat events; it sets `turn: null`
  between activations, so lifecycle runs in an override of `Combat#_manageTurnEvents` (GM client only, skipped
  on rewind). The system never monkey-patches core except through documented hooks.
- **Read-modify-write on a model must read `this.parent.system`** (the `live` getter), not `this`, or a stale
  instance can drop an earlier change (this bit the party build).
- **Derived data**: faction Qualities come from active locations (`qualityAdjust` reconciles book discrepancies);
  Crown falls 1 per 2 points lost; the party derives Cross Class/Limit Break/Reversal/weapon slots from buildings.
- **`CONFIG.statusEffects` is a plain object keyed by id**: use `[id]`, never `.find`.
- **Spawner tokens are unlinked**: read charges from the token actor.
- **Styling**: tokens are CSS variables `--hp-*` (two palettes); shapes are mixins. See `docs/THEMING.md`.
  Ribbons must stay `inline-block`; never set `font-family` on icon buttons.
- **Modules are optional**. Never make a feature require Dice So Nice, Sequencer, JB2A or Automated
  Animations; detect, then degrade silently.

## 5. Source of truth for the rules

1. The Core Rules PDF (printed page = PDF page). Extract text with `pdftotext "Hellpiercers Core Rules.pdf" core.txt`
   (non-layout) or PyMuPDF; the glyph `U+0398` (Θ) in the faction pages means a dot, box or Crown pip. Fonts
   carry meaning (see `scripts/data/parse_*.py` for how unit, table and action pages are segmented).
2. Some information exists **only in graphics** (tech tree, quality dots, Crown gates, generator tables). It is
   recorded in `hellpiercers-graphics-supplement.md` in the memory notes and in the catalogs in `src/stratcom`.
3. **Decisions the user already made** (do not re-litigate): follow the **drawn** tech tree where the printed
   paragraph disagrees (PRONOIA + Synthetic Spinther Lab -> Archontic Bay; Bay + HEBDOMAS -> ANOINT;
   CHOIC -> EROS; Ignorance-Devouring -> SYZYGOS; APONOIA -> GNOSTIC -> AGNOIA; ANCILIA has no prerequisite).
   Enemy actions round **down** (the book's rounding rule). The "Geographical Rot" upgrade is undefined in the
   book and shipped as a flagged placeholder. Autophyes' printed Subterfuge (2) disagrees with its starting
   locations (3): handled by `qualityAdjust`.
4. **Book art may be used and committed** (the user confirmed this) because the repo stays **private**. The seven
   faction maps currently live outside the repo at `D:\FoundryVTT14\Data\assets\hellpiercers\maps\<faction>.webp`
   (converted from the PNGs/PDFs in `D:\Random RPG\Hellpiercers\`). Moving them into `public/assets` so they ship
   with the system is a sensible first step (WebP, a few MB each at most).

## 6. Working agreements

- **Plan visibly, verify live.** Every behavioural change is exercised in the test world through the real API or
  UI. State what you did not verify.
- **Before every commit:** `npx dprint fmt`, `npx biome check src scripts` (clean), `npx vite build`.
- **Release process.** Bump `version` and the `download` URL in `src/system.json`; add a section to
  `CHANGELOG.md`; update `docs/` and `ROADMAP.md`; if the manual changed, `node scripts/generate-manual.mjs`
  and `node scripts/pack.mjs systeminfo` (world closed); commit; `git tag vX.Y.Z`; `git push origin main --tags`.
  CI (`check.yml`, `release.yml`) builds `system.zip`/`system.json` on `v*` tags. Ask the user to confirm CI.
- **Commit messages** end with the attribution line given by your harness (this project used
  `Co-Authored-By: Claude <noreply@anthropic.com>`-style trailers). Never push to anywhere but `origin`.
- **Compendium sources are generated** by `scripts/generate-*.mjs` from catalogs and extracted data; change the
  generator or data, not the YAML, then re-pack with the world closed.
- **Localization:** new UI text goes in `public/lang/en.json` (`HELLPIERCERS.UI.*` for templates, `.MSG.*` for
  messages). Validate that every `localize` key used in templates exists.
- **Tooling quirks:** Bash heredocs with many quotes fail (write a script file instead); `rm -rf dist/*` is blocked
  (rebuild over the existing `dist`); `dprint` rewrites templates, so patch with read-then-edit, not exact-match
  scripts; macro IDs are exactly 16 characters.
- **Do not** add upstream-facing changes, rename the system id, or make the repo public. The decision is made: **the
  repo stays private for now**, and book art and text may be included. If that ever changes, the book's text and
  art become a copyright question, so ask first.

## 7. Known gaps and debt

- **Terrain system shipped in v0.9.0** (idea A below): every terrain type as a `terrain` RegionBehavior, the
  Terrain Painter, suite placement from the Party sheet, advisory automation, JEHOEL. Still manual:
  Interactables, and attacking an Obstacle goes through `hellpiercers.terrain.damageObstacle` rather than
  the attack dialog.
- **Amdusias' Slumber/Thrashing phases** and similar boss phase mechanics are text on the sheet, not automated.
- **Unit extraction is approximate** for the multi-attack minibosses: damage and range are parsed from the text
  with a regex, some hyphenation artifacts remain, and a few units carry free text only.
- **Non-staged faction actions and hazards** are posted to chat; only Devolve and Eyerot have tracks.
- **No automated tests.** Behaviour is verified live. A Quench suite (or Vitest for the pure logic in
  `src/taccom`, `src/stratcom` and the catalogs) would protect the engine.
- **Translations:** English only; some long dialog texts and the RECON outcome wording are literals.
- **Automated Animations presets:** the system names things (`HELLPIERCERS Melee`...) but ships no AA autorec
  entries.
- **Art:** token art uses the original's icons; no portraits or art are shipped.

## 8. Ideas for "something really cool"

Ordered by how well they fit the project and what a table would feel. Each has a sketch, the v14 hooks to use,
the risks and how to verify. Pick with the user; do not start them all.

### A. Terrain and the Grid Manipulation placer (recommended)

The one real rules gap, and it makes pre-battle suites and map hazards come alive. Model each terrain type as a
**Scene Region** with a behavior (`foundry.data.regionBehaviors`): custom behaviors for **Uneasy** (movement
cost), **Void** (drops tokens at a random space), **Trapped** (damage on entry, optionally Ravaging), **Linked**
(teleports between linked tiles: JEHOEL converts any special terrain), **Attractor** (Pull), **Obstacle:N** (HP,
breaks on damage), **Cover/Advantageous** (visual plus flag the damage engine reads). Add a toolbar palette to
paint them, a "place Grid Manipulation suite" action on the Party sheet (e.g. "Orphite Protective Ritual Suite:
3 Cover, 2 Advantageous, 2 Obstacle:2" is already in `GRID_SUITES`), and hook the Provoke code so entering or
leaving special terrain can be exempted automatically for JEHOEL. Regions give you token enter/exit events
(`regionEvent`) for free. Risk: movement-cost rules interact with Foundry's v14 movement system; read
`client/canvas/placeables/token.mjs` and the region docs first. Verify by dragging tokens across each type.

### B. The War Table: an interactive STRATCOM map

A GM and player view of the campaign: the three faction map segments (the images are user-provided) with
locations as pins from `faction.system.locations` (revealed only if `revealed`), convoys drawn as dashed routes
moving each phase, hazards as stage-tinted regions, the party's position and vehicle, and a phase scrubber.
Build on `src/stratcom/map.mjs` (it already makes the scene) and `hellpiercers.stratcomPhase`. Click a pin to open
the location, drag the party token to travel (RECON Travel table roll). The book's
map art may be used (private repo): ship it under `public/assets`. Keep it a scene, not a new canvas layer,
unless you have a strong reason.

### C. The Director: encounter builder for the GM

Pick a faction, a Crown budget and the squad size; the Director proposes a legal force from `faction-units` (Crown
gates on units, Ichor for convoys/spawns, the Variable Action System for the boss), drops it on the map with
spawn zones, wires Spawner charges to the round tick (already automated) and shows a threat meter. Includes the
book's **Rituals** (pp. 228-232: Orb Run and others) as scene templates with their rules as Regions/Countdowns.
Risk: balance guidance is not in the book; keep it a suggestion with sliders, never an enforcement.

### D. Cinematics and juice

Cut-ins for Limit Break, AGNOSIA, boss phase changes and a mission-complete splash using token art and the
book's palette; a "Hellpiercer turn" banner; screen-edge pulses on Provoke; optional music cues per faction via
playlists. You already have the hooks: `hellpiercers.limitReady`, `.agnosia`, `.actorDowned`, `.provoke`,
`.stratcomPhase`. A module is installed locally (`holosuite-critical-cutin`) that shows a pattern for cut-ins.
Cheap, high impact, low risk. Keep everything behind settings and `prefers-reduced-motion`.

### E. Character creation wizard

A guided HELLPIERCER builder (class, armor, weapons, backgrounds/tags, loadout) using `player-gear`, honoring
party unlocks, with live previews of patterns (`range-model.mjs` already renders them) and a printable
Player Sheet. Fits new players and one-shots. Risk: moderate UI work; reuse the sheet components.

### F. Mission control squad HUD

A slim always-visible bar for players: every PC's HP, pips, Limit Break and Reversal charges, plus the
initiative state (who has acted). Sockets are already in place (`src/api/socket.mjs`). Pairs well with D.

### G. After-action reports and the War Journal

On `completeMission`, generate a journal page: objectives, kills, damage, MVP stats, rewards, Ichor, what the
factions did. Append faction events to the War Journal automatically (convoys arriving, locations built, hazards
growing). Cheap, high table value, builds trust in the STRATCOM layer.

### H. Test suite and CI

Add Vitest for the pure logic (damage resolution, swarm plan, Crown/Quality derivation, tech-tree gating,
catalog integrity: every unit/action/table parses) and a Quench batch for in-Foundry checks (turn lifecycle,
Provoke, swarm join/expend). Add it to `.github/workflows/check.yml`. Unglamorous, but it is what lets you
change the engine boldly.

### I. Smaller polish worth doing

Pattern preview on hover in the attack dialog; Automated Animations autorec presets shipped as an importable
JSON; translations; token art pack; compendium folders for player-gear; macro bar presets; a `Status` reference
tooltip on chips with the full rule text.

**Recommendation.** If the user wants one headline feature: **A** (it closes the largest rules gap and
unlocks hazards and Rituals). If they want a wow demo with low risk: **D + G**. If they want longevity: **H**
first, then A.

## 9. Definition of done for any feature

1. Works in the test world through real UI and API, in **both** themes, with the optional modules **off**.
2. Lint, format and build are clean; every new `localize` key exists.
3. Docs updated: `docs/GUIDE.md` (user-facing), `docs/API.md` (hooks/API), `CHANGELOG.md`, `ROADMAP.md`; manual
   regenerated and packed if `GUIDE.md` or `CHANGELOG.md` changed.
4. No secrets, no upstream changes, the repo stays private; shipped images are web-sized; contrast checked for any new colours.
5. Committed, tagged, pushed; the user has confirmed CI.

## 10. Open questions for the user

- *(Decided)* The repo stays **private**; book art and text are fine to include. Foundry therefore installs from the
  local junction, not the manifest URL.
- Which of section 8 do they want? Do they want terrain automation to be strict or advisory?
- Any table (their group) pain points from actual play? Real play feedback beats every idea above.

## 11. A good first hour

1. Read this file, `docs/GUIDE.md`, `docs/API.md` and the memory notes.
2. Run `npx vite build`, launch the test world, join as Gamemaster, show the browser pane, and click through a
   HELLPIERCER sheet, the faction Actions tab, a combat with a Swarm and a Provoke, in both themes.
3. Skim `src/taccom/engine.mjs`, `src/data/actor.mjs`, `src/stratcom/engine.mjs` and `src/integrations/animations.mjs`.
4. Ask the user which idea to pursue; write a short design note in the chat; then build it in small, verified
   steps with a release at the end.
