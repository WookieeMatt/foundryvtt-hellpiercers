# HELLPIERCERS scripting API

Everything below is available from macros and modules as `hellpiercers` (the same object as
`game.system.api`). References (`ref`) can be an Actor, Token, TokenDocument, UUID, an array of
those, or `null` to use your controlled tokens (falling back to your assigned character).

## Health

| Call | Description |
| --- | --- |
| `await hellpiercers.damage(ref, amount, { conditions, qualities, source, raw })` | Deal damage. Accounts for Armor, Bleed, Constrict, Broken, Wrack, Snakeskin and Glassflesh on the target, Transference and Bound on the `source`. `raw: true` skips modifiers. |
| `await hellpiercers.heal(ref, amount)` | Restore HP, capped at max. |
| `await hellpiercers.tempHP(ref, amount, { add })` | Grant Temporary HP (keeps the larger value unless `add`). |
| `await hellpiercers.rez(ref)` | Back on their feet with full HP. |

On an actor: `actor.takeDamage(n)`, `actor.heal(n)`, `actor.grantTempHP(n)`, `actor.rez()`,
`actor.setDefeated(bool)`.

## Statuses

```js
await hellpiercers.status.add(null, "poison", 3);   // stacks follow each status' rule (add / max)
await hellpiercers.status.remove(null, "poison", 1); // omit the count to clear it
hellpiercers.status.get(null, "bleed");              // total stacks
hellpiercers.status.list();                          // every status id
```

On an actor: `actor.applyStatus(id, n)`, `actor.removeStatus(id, n)`, `actor.getStatusStacks(id)`,
`actor.consumeStatus(id, n)`, `actor.decayEffects("turn" | "round")`.

## Combat

```js
hellpiercers.combat.combatant(ref);        // the Combatant for an actor
await hellpiercers.combat.spend(ref, "main"); // "main" | "support" | "aux" | "move"
await hellpiercers.combat.refund(ref, "main");
await hellpiercers.combat.refresh(ref);    // refresh all actions
await hellpiercers.combat.activate(ref);   // start their turn
await hellpiercers.combat.endTurn();       // end the current turn
await hellpiercers.combat.resolve(ref, "start" | "end"); // run turn effects without advancing
```

Spending an action that is already spent consumes a stack of Haste. Shock treats each action as one
tier higher (Main becomes impossible), Frozen blocks Aux and Pin blocks Move.

The engine itself is at `hellpiercers.taccom.engine` (`startTurn`, `endTurn`, `startRound`,
`endRound`).

## Items

`await item.use({ part, spend, chat, force })` spends the item's action, pays Reversal charges,
Limit Break progress or Equipment uses, and posts a chat card. `item.getActionCost()` tells you
what it costs. Shift-click the bolt on a sheet as GM to ignore resource checks.

## STRATCOM

```js
const S = hellpiercers.stratcom;
S.getParty();                          // the active party actor
S.getFactions();                       // every faction actor
await S.createFaction('syncrasis');    // from the catalog (Crown, boss, starting locations)
await S.createParty('Hellfire Division');
S.ichor.get(); await S.ichor.add(2, 'reason'); await S.ichor.spend(3, 'reason'); // GM only
S.phase.get(); await S.advancePhase(); // construction progresses, convoys arrive (GM only)
await S.completeMission({ success: true }); // pay out, rearm the squad, Ichor to the GM
S.checkUnlocked(item);                 // { unlocked, building } for an item
```

Party (`actor.system`): `canBuild(id)`, `build(id)`, `refund(id)`, `gain({hellsteel, soulfire, brimstone})`,
`spend(cost)`, `startMission({objectives, faction, phase})`, `toggleObjective(key)`, `completeMission()`,
`buyVehicleOption(id)`, `toggleVehicleUpgrade(id)`, `setReadiness(r)`, `endSession()` (Aion -1),
`isUnlocked(type, name)`. Buildings follow the drawn tech tree: PRONOIA + Synthetic Spinther Lab ->
Archontic Bay; Bay + HEBDOMAS -> ANOINT; CHOIC -> EROS; Ignorance-Devouring -> SYZYGOS; APONOIA ->
GNOSTIC -> AGNOIA.

Faction (`actor.system`): Qualities and Crown are derived from the active locations.
`addLocation(def, {building})`, `setLocationStatus(id, status)`, `rollQuality(keys, {advantage, whisper})`,
`buyUpgrade(name, stratcom)`, `startProject(key, phase)`, `advanceProject(id, {pay, tick}, phase, stratcom)`,
`deployConvoy(data, phase)`. `system.finalAssaultReady` is true when two Qualities are at 0.

Hooks: `hellpiercers.stratcomPhase (phase, {built, arrived})`, `hellpiercers.missionComplete (party, result)`,
`hellpiercers.actorDowned (actor)`.

## More TACCOM rules

- **Limit Break:** every enemy a HELLPIERCER defeats (each Swarm square counts) adds to `system.limit.value`
  up to the class's Break Value, and a chat note announces when it is ready. Using the Limit Break
  ability resets it; leaving DIS also resets it.
- **Agnosia:** Bosses and Minibosses (set `system.agnosia.value` on a minion) announce their Agnosia
  once when HP first reaches the threshold, with the Agnosia text, and get the Agnosia status. Healing
  above the threshold re-arms it. Hook: `hellpiercers.agnosia (actor)`.
- **Provoke:** when a token is dragged away from an adjacent enemy during combat the GM client rolls
  the 1D6 Provoke attack, per enemy unit (a Swarm only once its last square leaves), checked along
  the whole path of the move. Aegis (flying) units, forced movement (`method: "api"`) and actors
  with the flag `hellpiercers.noProvoke` are exempt. KOPIS's Offhand Pistol fires back automatically.
  Toggle with the Automate Provoke setting. `hellpiercers.taccom.findProvokers(token, path)`.
- **Provoke extras:** units with the Aggression status (Expanded Aggression Rituals gear, 2 stacks)
  Provoke out to Range:2. MURIEL's Nous-Agnostic Deployment skips enemies the unit moved through that
  turn. Every Provoke card has an Undo button (GM) that restores the HP it took, for JEHOEL's
  special-terrain exemption or any table ruling.
- **Swarms:** `hellpiercers.taccom.joinSwarm(tokenDoc)` joins a Swarm-tagged unit to the adjacent
  units of the same type (merging adjacent Swarms); the token HUD has a Join adjacent button.
  `hellpiercers.taccom.expendTiles(plan, attackerTokenDoc)` asks which adjacent tiles a Swarm expends
  after attacking and removes them. The attack dialog does this automatically.
- **Swarm attacks:** the attack dialog makes one attack per Swarm tile adjacent to the target (max
  4 vs Scale 1, 12 vs Scale 2), each with +1 damage per adjacent tile, and tells you how many tiles
  to expend. `hellpiercers.taccom.swarmAttackPlan(attackerActor, targetTokenDoc)`.

## STRATCOM extras

- **Roles:** `party.system.useRoleAction(role, actionId, { option, resource })` pays the cost and
  posts the action. The party sheet lists each Role's STRATCOM actions and RECON moves
  (`src/stratcom/roles.mjs`).
- **Triumphs:** pick one per squad member on the party sheet. Bleeding, Reckless, No Gear and Echo are
  automatic (permanent Bleed:1, Rush:2, an extra Off-Grid use, 2 resources of any type at the end);
  the rest are posted as a reminder when the mission starts. Permanent effects last until you return
  to DIS: `actor.applyStatus(id, n, { permanent: true })`.
- **Campaign map:** `await hellpiercers.stratcom.createCampaignMap(["syncrasis", "henosis", "autophyes"])`
  builds a gridless scene with the three map segments side by side. Put one 1:1.8 image per
  faction at `assets/hellpiercers/maps/<faction id>.webp` (not shipped: it is the book's art).

## RECON

```js
await hellpiercers.recon.dialog();          // choose tags, roll 2D6 + tags
await hellpiercers.recon.roll({ actor, tags: 2, label: "Pick the lock" });
await hellpiercers.recon.tone("Arrive");    // the Tone Die (D10)
```

## Delegating to the GM

Players can't modify actors they don't own. `hellpiercers.asGM(operation, payload)` asks the active
GM to run `damage`, `heal`, `statusAdd` or `statusRemove`. `payload.targets` must be UUIDs.

```js
await hellpiercers.asGM("damage", { targets: [token.document.uuid], amount: 4, options: {} });
```

## Hooks

| Hook | Arguments |
| --- | --- |
| `hellpiercers.turnStart` | `combatant, unit, lines` |
| `hellpiercers.turnEnd` | `combatant, unit, lines` |
| `hellpiercers.roundStart` | `combat` |
| `hellpiercers.roundEnd` | `combat, lines` |
| `hellpiercers.countdownExpired` | `combatant, actor` |

## Settings

`automateEffects`, `armorRule` (RAW flat -1, or per stack), `bleedRule`, `trackActions`,
`chatCards`, `playerCountOverride`.

## Module integrations

All optional; the system runs without any of them.

- **Dice So Nice** (setting *Themed Dice*): damage, healing, RECON, the Tone Die, Provoke and every
  faction's Quality dice get their own HELLPIERCERS colourset (`hellpiercers-damage`, `-heal`, `-tone`,
  `-recon`, `-provoke`, `-quality`, `-<faction id>`). `hellpiercers.animations.tint(roll, "damage")`
  tints a roll before you evaluate it. Provoke dice are attached to the Provoke card so they roll in 3D.
- **Animations** (setting *Animations*): `auto` tries Automated Animations first and falls back to the
  built-in JB2A effects; `automated-animations`, `builtin` and `none` pick one. Built-in effects need
  Sequencer and a JB2A library. The *JB2A Library* setting picks Free or Premium; in `auto` Premium is
  used when `jb2a_patreon` is active, and every effect falls back to the best path the installed library
  has (`src/integrations/jb2a-catalog.mjs` lists them, Premium first, Free last). Automated Animations
  matches on the attack's name, or on `HELLPIERCERS Melee|Ranged|Burst|Line|Cone... [Element]`, and
  animates Status Effects itself.
- Hooks fired for animations (use them from your own modules): `hellpiercers.attack ({ actor, item,
  attack, targets })`, `hellpiercers.hit ({ tokens, damage })`, `hellpiercers.healed (actor, amount)`,
  `hellpiercers.rezzed (actor)`, `hellpiercers.limitReady (actor)`.
- Macro API: `await hellpiercers.animations.attack({ actor, targets, attack })`,
  `.impact(tokens, { conditions })`, `.single("heal" | "rez" | "defeat" | "provoke" | "limit" | "agnosia" | "teleport", token)`,
  `.status(token, "blazing", "on" | "off")`, `.describe()` (what is installed and which provider/tier
  is in use).

## Faction actions and map hazards

`faction.system.useAction(name, { location, force })` posts a faction's STRATCOM action to the GM and
places its staged map hazard if it has one (Devolve advances every STRATCOM phase; Eyerot grows by 1
per use at the chosen location). `addHazard`, `advanceHazard(id, delta)`, `clearHazard(id)`,
`removeHazard(id)` manage hazards by hand ("Create Map Hazard"). The data is in
`src/stratcom/data/faction-actions.json` (extracted by `scripts/data/parse_actions.py`); the faction
sheet has an Actions tab (GM only).

## Theme

The client setting `game.settings.get("hellpiercers", "sheetTheme")` is `"parchment"` or `"night"`; `applySheetTheme()` in
`src/settings.mjs` applies it. Journals can opt into the rules-page look with the flag `hellpiercers.themed`.
See `docs/THEMING.md`.

## Boss actions

A Boss's Actions stat is `actions/players` (1/2 is one action for every two players, rounded down,
minimum 1). The boss sheet shows the result and a button to recalculate it mid-encounter.

## Compendiums

`HELLPIERCERS Macros`, `Player Gear`, `Player Abilities`, plus (v0.5.0): `Faction Units` (95 Actors
from the Core Rules, grouped by faction; bosses carry their attacks as ability items), `RECON Tables`
(every RollTable of the Core Rules: Chambers, Corridors, Vaults, Legendary Arms, Scavenge, Scout,
Travel, the NPC, Item D66 and Location generators) and `Rules Reference` (Effects, buildings,
missions, Triumphs, Roles, vehicles, research and every faction's locations/upgrades). The sources
are generated by `scripts/generate-units.mjs`, `generate-tables.mjs` and `generate-journals.mjs`;
the extracted rulebook data is under `scripts/data/`.

## Macro compendium

`HELLPIERCERS Macros` ships ready-made macros: Damage Targets, Apply/Clear Status, Heal, Temporary
HP, Rez, RECON Roll, Tone Die, End Turn, Resolve End-of-Turn Effects, Refresh Actions and Show Status
Stacks. They are generated by `scripts/generate-macros.mjs`.

## Development

```
npm install --ignore-scripts
npx vite build                         # builds dist/ (system, styles, lang, templates)
node scripts/pack.mjs [macros ...]     # compile YAML packs (close the world first)
node scripts/generate-macros.mjs       # regenerate the macro pack sources
node scripts/generate-units.mjs && node scripts/generate-tables.mjs && node scripts/generate-journals.mjs
node scripts/generate-manual.mjs        # the Manual & Notes journal, from docs/GUIDE.md and CHANGELOG.md
npx biome check src scripts && npx dprint check
```

Link `dist` into Foundry: `New-Item -ItemType Junction -Path <Data>\systems\hellpiercers -Target <repo>\dist`.
After changing `system.json`, POST `{"action":"resetPackages"}` to `/setup` (or restart Foundry) and
relaunch the world.
