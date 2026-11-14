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
- [ ] STRATCOM layer - Possibly base/map interaction
- [x] Damage Application
  - [x] Armor, Bleed, Constrict, Broken, Wrack, Snakeskin, Glassflesh, Compel
  - [x] Transference, Bound, Temporary HP, auto-defeat, Rez
- [ ] Swarm tech - track tokens and actors associated with a swarm
  - [x] Swarm HP pool, merge/split, Breaker
  - [ ] Automatic merge/join rules, Swarm attack bonuses
- [x] Turn tracking
  - [x] Any-order activations driven by Foundry v14 combat lifecycle events
  - [x] Start/end of turn and end of round automation (Poison, Healing, Blazing, Pain Aura, Countdown, Brand, Spawner charge)
  - [x] Action economy with Haste, Shock, Frozen and Pin
  - [ ] Provoke, Limit Break charge tracking from kills, Agnosia triggers for minibosses
- [ ] Faction system
- [ ] Include items - pending a public license for HELLPIERCERS

## Release

- [ ] Styling
- [ ] Custom ActiveEffects
- [ ] Art - pending a public license for HELLPIERCERS
