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
  - [ ] Automatic merge/join rules
- [x] Turn tracking
  - [x] Any-order activations driven by Foundry v14 combat lifecycle events
  - [x] Start/end of turn and end of round automation (Poison, Healing, Blazing, Pain Aura, Countdown, Brand, Spawner charge)
  - [x] Action economy with Haste, Shock, Frozen and Pin
  - [x] Provoke, Limit Break charge from kills, Agnosia for minibosses and bosses
- [x] Faction system
  - [x] Faction actor from the catalog: Crown, four Qualities derived from locations, upgrades, research, convoys, War Journal
  - [x] Ichor, STRATCOM phase counter, faction rolls
  - [ ] Faction units, STRATCOM actions and map hazards (data pass)
- [ ] Include items - pending a public license for HELLPIERCERS

## Release

- [ ] Styling
- [ ] Custom ActiveEffects
- [ ] Art - pending a public license for HELLPIERCERS
