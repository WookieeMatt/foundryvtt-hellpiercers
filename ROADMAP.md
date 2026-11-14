# Roadmap

Targets Foundry VTT **v14.370**. See `docs/API.md` for the scripting API.

## Alpha

- [x] Enemy sheets
- [x] Basic class items
- [x] Class mastery (Still needs UI)
- [x] Attack templates
- [x] Targeting
- [x] Attack dialogs

## Beta

- [ ] Good character sheet - Currently have a basic placeholder sheets
  - [x] Action pips (Main / Support / Aux / Move), status chips with stacks, Rez, add-status picker
  - [x] Use buttons on abilities and weapon actives, with chat cards
  - [ ] Full redesign of the HELLPIERCER sheet
- [x] Dice So Nice (themed dice), Automated Animations bridge, built-in Sequencer/JB2A effects (Free and Premium)
- [ ] Babele support - if needed
- [x] STRATCOM layer
  - [x] Party actor: resources, base building on the drawn tech tree, item unlocks, missions, vehicle, roles, Class Mastery, Legendary Arms Aion
  - [x] Unlocks derived from party buildings (Limit Breaks, Reversals, Cross Class, weapon slots)
  - [x] Roles' STRATCOM actions and RECON moves, Triumphs (Bleeding, Reckless, No Gear, Echo automatic)
  - [x] Campaign map scene helper
- [x] Damage Application
  - [x] Armor, Bleed, Constrict, Broken, Wrack, Snakeskin, Glassflesh, Compel
  - [x] Transference, Bound, Temporary HP, auto-defeat, Rez
- [ ] Swarm tech - track tokens and actors associated with a swarm
  - [x] Swarm HP pool, merge/split, Breaker
  - [x] Swarm attack plan (attacks and bonuses per adjacent tile)
  - [x] Join adjacent units (token HUD), merge adjacent Swarms, expend tiles dialog after a Swarm attack
- [x] Turn tracking
  - [x] Any-order activations driven by Foundry v14 combat lifecycle events
  - [x] Start/end of turn and end of round automation (Poison, Healing, Blazing, Pain Aura, Countdown, Brand, Spawner charge)
  - [x] Action economy with Haste, Shock, Frozen and Pin
  - [x] Provoke (Expanded Aggression range 2, MURIEL pass-through, Undo button for JEHOEL and table rulings), Limit Break charge from kills, Agnosia for minibosses and bosses
- [x] Faction system
  - [x] Faction actor from the catalog: Crown, four Qualities derived from locations, upgrades, research, convoys, War Journal
  - [x] Ichor, STRATCOM phase counter, faction rolls
  - [x] Faction Units compendium: all 95 bosses, minibosses, minions, spawners and fortifications, one folder per faction
  - [x] RECON Tables compendium (Chambers, Corridors, Vaults, Legendary Arms, Scavenge, Scout, Travel, NPC, Item D66, Location generator) and a Rules Reference journal
  - [x] Per-faction STRATCOM actions (Actions tab), staged map hazards (Devolve, Eyerot), Create Map Hazard
  - [x] Boss variable-action stat shown and recalculable
- [ ] Include items - pending a public license for HELLPIERCERS

## Release

- [x] Styling: the book's look (parchment and night themes, ribbons, ink panels, blackletter) across every sheet, chat card, dialog and the combat tracker
- [x] Night theme audited everywhere; Rules Reference and Manual journals styled
- [x] User guide, theming guide and changelog (`docs/`, `CHANGELOG.md`), the in-Foundry manual is generated from them
- [x] i18n of the STRATCOM sheets and system messages (`HELLPIERCERS.UI`, `HELLPIERCERS.MSG`)
- [ ] Custom ActiveEffects
- [ ] Art - pending a public license for HELLPIERCERS
