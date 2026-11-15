# Changelog

All notable changes to the HELLPIERCERS system for Foundry VTT. Versions follow the git tags. The in-Foundry
**Change Log** page is generated from this file by `scripts/generate-manual.mjs`.

## 0.10.0

- The War Table: the campaign map is now alive. Location pins per faction segment (revealed ones open War Table journal pages, hidden ones are GM-only), stage-tinted hazard circles, convoy routes (GM-only until spied out), and the party's token on the map.
- The War Table bar while a campaign scene is viewed: STRATCOM phase, Ichor, every faction's Crown, advance-phase and resync buttons; click a faction to open its sheet, double-click a GM pin for the faction's Locations tab.
- Auto-sync behind the new *War Table Auto-Sync* setting: the map updates when faction data changes and when the phase advances. Pins keep the positions the GM dragged them to.
- Dragging the party token posts the travel card with a RECON Travel table roll button.
- The seven faction map segments ship with the system (private repo); a world image at `assets/hellpiercers/maps/<id>.webp` still overrides them.
- Fixed the campaign map tiles rendering at half position: Foundry v14 anchors tiles at their centre.

## 0.9.0

- Terrain on Scene Regions: every type of the Core Rules (Uneasy, Cover, Advantageous, Impassable, Void, Obstacle, Linked, Trapped, Attractor) as a `terrain` RegionBehavior, painted cell by cell.
- The Terrain Painter: a palette on the Regions toolbar; left-click or drag paints, right-click erases, Standard erases specials. Tile rules enforced: two special effects per tile at most (oldest replaced), the Void replaces everything.
- Advisory automation behind the new *Automate Terrain* setting: Trapped rolls its damage (with Undo) and becomes Standard, Ravaging tiles persist and reveal themselves, Linked tiles offer the free step and teleport, Attractor zones post Pull:1 with a one-click pull, the Void posts the instant-death card on forced entry, Cover adds -1 in the damage engine, Uneasy shows +1 Speed in the ruler.
- Grid Manipulation suites placed from the Party sheet: **Place suite** walks the suite's tile list click by click.
- JEHOEL automated: no Provoke when moving into or out of special terrain; Void, Obstacle and Impassable as Uneasy.
- API: `hellpiercers.terrain` (paint, erase, clearAll, regions, at, damageObstacle, pullTowards, openPainter, placeSuite) and the hooks `hellpiercers.terrainChanged`, `hellpiercers.terrainTriggered`.

## 0.8.0

- Night theme audited on every sheet, tab, dialog, chat card and journal; contrast checked.
- Rules Reference and Manual journals styled like the book: ribbon headings, inked tables, a black page list.
- Dialogs (including the ones sheets open) wear the same look as the sheets.
- The Manual & Notes journal rewritten for the current system; generated from `docs/GUIDE.md`.
- New documentation: user guide, theming guide, this changelog.
- Fixed a stray character in the faction Actions tab and a heading that wrapped its button.

## 0.7.0

- The book's look: aged parchment, thick black ink, gold ribbon labels, crimson paint edge, blackletter titles.
- Two palettes with a per-user Sheet Theme setting: Parchment and Night.
- Restyled every actor and item sheet, chat card, the attack dialog, action pips, status chips and the combat tracker.
- Bundled Big Shoulders, EB Garamond and Pirata One (SIL OFL).
- STRATCOM sheets and system messages localized.

## 0.6.0

- Dice So Nice: themed dice for damage, healing, RECON, the Tone Die, Provoke and every faction.
- Animations: Automated Animations bridge plus built-in Sequencer effects using JB2A Free or Premium, detected automatically.
- Faction STRATCOM actions for every faction, staged map hazards (Devolve, Eyerot) and Create Map Hazard.
- Boss Variable Action System: actions per players, rounded in the players' favour, with a recalculate button.
- Minibosses' extra attacks as items, with damage and range read from the book.

## 0.5.0

- Faction Units compendium: 95 bosses, minibosses, minions, spawners and fortifications.
- RECON Tables compendium: every roll table in the Core Rules, the NPC and Location generators and the Item D66.
- Rules Reference journal built from the same catalogs the engine uses.
- Swarms: join adjacent units, merge Swarms, expend tiles after an attack.
- Provoke: Aggression and Range:2, MURIEL's pass-through, an Undo button on every Provoke card.

## 0.4.0

- Limit Break credit from kills, AGNOSIA for bosses and Minibosses, Provoke, the Swarm attack plan.
- Role actions and Triumph effects, the campaign map helper.

## 0.3.0

- STRATCOM: the Party (resources, tech tree, item unlocks, missions, vehicle, Roles, Class Mastery, Legendary Arms) and the Faction (Crown, Qualities, locations, convoys, research, upgrades, War Journal).
- Ichor and the STRATCOM phase, faction rolls, 17 macros.

## 0.2.0

- TACCOM: the turn engine, action economy, damage engine, ability cards, Effects with stacks and the scripting API.

## 0.1.0

- Upgrade of the community HELLPIERCERS system to Foundry v14.370, kept as a separate private build.
