# HELLPIERCERS User Guide

This guide is the source of the in-Foundry manual (the **Manual & Notes** journal in the System
Information compendium). `scripts/generate-manual.mjs` rebuilds that journal from this file and
`CHANGELOG.md`, so edit the text here. Each `##` heading becomes a journal page.

## Welcome

HELLPIERCERS for Foundry VTT automates the three layers of the tabletop game for **Foundry v14.370**:

- **TACCOM**, the grid combat: turn order, action tracking, damage, Effects, Provoke, Swarms, Limit Breaks and AGNOSIA.
- **STRATCOM**, the campaign: the division's base and tech tree, missions and rewards, the GM's factions, convoys, research, map hazards and Ichor.
- **RECON**, exploration: 2D6 + tags rolls, the Tone Die and every roll table in the Core Rules.

Everything is optional. The system never takes a decision away from the table: automation can be
switched off in the settings, and every automatic result is posted to chat so it can be corrected.

The system is a private fan tool and contains no official art. HELLPIERCERS is by Sandy Pug Games.

## Quick Start

**Game Master**

1. Create a world with the HELLPIERCERS system. Enable **Dice So Nice**, **Automated Animations** (with Sequencer and socketlib) and a **JB2A** library if you want them; none are required.
2. Open the Actors tab. The **Faction / Party** button in its header creates the squad's Party and the Factions.
3. Create one Party for the squad and three Factions for the campaign. Factions are built from the book: Crown, Qualities, starting locations and upgrades are already filled in.
4. Import the units you need from the **Faction Units** compendium and place them on a scene.
5. Start a combat, add the squad and the enemies, and press play.

**Players**

1. Create a **HELLPIERCER** actor. Drag a class, an armor and weapons from the **Player Gear** compendium onto the sheet; their abilities come with them.
2. Sheets open locked. Flip the switch in the header to edit stats and items, then flip it back to play.
3. In combat use the **Main / Support / Aux / Move** pips under the name, the bolt on an ability to use it, and the dice icon on a weapon to attack.

## TACCOM

**Turns.** Players act in any order, then the GM activates each enemy. Click a combatant in the tracker to start its turn. Bosses use the Variable Action System: the Actions stat is `actions/players`, so `1/2` is one action for every two players, rounded down, minimum 1. The boss sheet shows the result and a button to recalculate it when players join or leave.

**Actions.** Each unit has Main, Support, Aux and Move pips. Spending a spent action uses a stack of Haste. Shock makes every action count one tier higher, Frozen blocks Aux and Pin blocks Move.

**Turn effects.** At the start and end of a turn the system resolves Poison, Healing, Blazing (and its spread), Pain Aura, Countdown, Brand and the Spawner's charge, then decays Effects. Each result is posted to chat. *Automate Turn Effects* switches this off.

**Attacks.** Click the dice icon on a weapon, strike or boss attack. The attack dialog shows the damage and range; area attacks have a range button that places a template and targets everything inside it. Confirm and the system rolls and posts one damage card per target. A button on each card applies the damage with Armor, Bleed, Broken, Wrack, Snakeskin, Glassflesh, Compel and Constrict taken into account, plus Transference and Bound on the attacker and Temporary HP on the target.

**Effects.** Chips under the name show each Effect and its stacks; click to add or remove a stack, or use the plus chip to add a new one. A unit at 0 HP is defeated and offers a Rez button (Main Action).

**Provoke.** When a token is dragged away from an adjacent enemy the GM client rolls the 1D6 Provoke attack, per enemy unit and along the whole path. Flying (Aegis) units, forced movement and anything flagged `hellpiercers.noProvoke` are exempt; MURIEL ignores enemies she moved through this turn; KOPIS's Offhand Pistol fires back automatically. Every Provoke card has an **Undo** button for the GM, for terrain exemptions such as JEHOEL's or any table ruling. *Expanded Aggression Rituals* applies Aggression, which makes the user Provoke out to Range:2.

**Swarms.** The token HUD has a Swarm palette: **New Swarm**, **Join adjacent** (units of the same type that touch), **Merge selected** and **Delete**. A Swarm has 10 HP per tile and breaks into smaller Swarms when tiles stop touching. When a Swarm attacks, the dialog makes one attack per adjacent tile (at most 4 against Scale 1, 12 against Scale 2), each with +1 damage per adjacent tile, then asks which tiles to expend.

**Limit Breaks, AGNOSIA and Reversal.** Every enemy a HELLPIERCER defeats adds to their Limit Break (each Swarm tile counts). Bosses and Minibosses announce their AGNOSIA once, when they first reach the threshold. Reversal charges and Equipment uses are spent when the ability is used.

## STRATCOM

**The Party.** The Party sheet holds the division's Hellsteel, Soulfire and Brimstone, its buildings, the active mission, the vehicle, Roles, Triumphs, Off-Grid Munitions, Grid Manipulation suites, Legendary Arms (and their Aion) and Class Mastery.

- **Buildings** follow the drawn tech tree. Buildings unlock gear, weapons, armor and classes; items that are still locked cannot be dropped on a sheet. Cross Class Development, Limit Breaks, Reversals and weapon slots follow the Party's buildings (setting *Unlocks From Party Buildings*).
- **Missions.** Pick the objectives and the target faction, then **Leave DIS**. When the squad comes back, **Return to DIS** pays the rewards, rearms and heals the squad, advances Class Mastery and gives the GM Ichor (1 per mission, 2 per hero defeated).
- **Roles and Triumphs** list their STRATCOM and RECON actions; using one pays the cost and posts it. Bleeding, Reckless, No Gear and Echo are automatic.

**Factions.** A Faction's four Qualities are the sum of its active locations, and its Crown falls by one for every two Quality points lost. The dice icon next to a Quality rolls it (1D6 per dot, a 6 is a Success; shift-click rolls publicly). Tabs:

- **Locations** with build time, status (active, under construction, lost) and what players know.
- **Convoys** arrive at the start of the second phase after they are deployed.
- **Research** projects: pay Ichor, fill Research Time boxes, at most two at a time.
- **Actions** (GM only): the faction's STRATCOM actions, with their Crown gates. Using one posts it to the GM. Some create a **map hazard**: Devolve advances a stage every STRATCOM phase, Eyerot grows one stage each time the action is used at a location. Create Map Hazard adds a custom one.
- **Upgrades** unlocked with Ichor, and **Notes** with the War Journal.

**Ichor and the phase.** The GM's Ichor and the STRATCOM phase are shown in the header of the Party and Faction sheets. **Advance phase** (a button there, or the *Advance STRATCOM Phase* macro) builds locations, moves convoys and grows hazards, and whispers a summary to the GM. *Gain Ichor* and *Gain Resources* are macros too.

**Campaign map.** The *Create Campaign Map* macro builds a gridless scene from the three faction map segments. Put one 1:1.8 image per faction at `assets/hellpiercers/maps/<faction id>.webp`; the book's art is not included.

## RECON

- **RECON Roll** (macro): 2D6 plus one for each relevant Tag. 7 or less fails, 8 to 9 succeeds with a major drawback, 10 or more succeeds beyond expectations.
- **Tone Die** (macro): a D10 for how heated a scene is. 1 is de-escalated, 10 is TACCOM.
- The **RECON Tables** compendium holds every table in the Core Rules as a RollTable: Chambers of Forbidden Truths, Corridors, Vaults, Legendary Arms, Scavenge, Scout, Travel, the NPC generator (Name, Traits, Desires), the Item Table (a D66) and the Location Generator (six columns).

## Compendiums

| Compendium | Contents |
| --- | --- |
| Player Gear | Classes, armor, weapons, gear, equipment and HALO items |
| Player Abilities | The abilities that belong to them |
| Faction Units | 95 bosses, minibosses, minions, spawners and fortifications, one folder per faction |
| RECON Tables | 17 roll tables |
| Rules Reference | Effects, buildings, missions, Triumphs, Roles, vehicle, research and every faction |
| HELLPIERCERS Macros | 18 ready-made macros |
| System Information | This manual |

## Macros and API

The macro compendium covers damage, healing, Effects, Rez, Temporary HP, End Turn, Refresh Actions, RECON, the Tone Die, Faction Rolls, Ichor, resources, the STRATCOM phase, Return to DIS and the campaign map. Everything is also available to your own macros and modules as `hellpiercers`; see `docs/API.md` in the repository for every call and hook.

## Modules and Settings

**Dice So Nice.** With *Themed Dice* on, damage, healing, RECON, the Tone Die, Provoke and each faction's Quality dice roll in their own colours.

**Animations.** *Animations* picks the provider: *Automatic* tries Automated Animations first and falls back to the built-in effects; the other choices use one provider or none. Automated Animations matches on the attack's name, or on rules you write named `HELLPIERCERS Melee`, `HELLPIERCERS Ranged`, `HELLPIERCERS Burst Fire` and so on. The built-in effects need Sequencer and a JB2A library. The system detects whether the **Free** or the **Premium (Patreon)** library is active, uses Premium when both are, and every effect falls back to the best animation the installed library has. *JB2A Library* can force Free.

**Sheet Theme.** *Parchment* is the book's pages; *Night* is the cover's slate and violet. It is a per-user setting.

| Setting | What it does |
| --- | --- |
| Player Count Override | Number of players for boss actions; blank detects them |
| Automate Turn Effects | The GM client resolves turn effects and decay |
| Armor / Bleed Stack Rule | Flat as written, or per stack |
| Track Actions | Action pips in the combat tracker |
| Post Ability Cards | Using an ability posts a card and spends its action |
| Automate Provoke | Roll Provoke when a token leaves an enemy |
| Active Party | The Party whose buildings unlock items |
| Unlocks From Party Buildings | Derive unlocks from the Party |
| Sheet Theme | Parchment or Night, per user |
| Themed Dice | Dice So Nice colours |
| Animations, JB2A Library, Animate Attacks, Animate Effects | Animation provider and what is animated |

## Building Items

Most items come from the Player Gear compendium. To build your own:

1. **Weapons** have one or more attack profiles. The cog next to the range opens the range editor (a standard shape or a bespoke pattern, drawn facing east); the cog next to the damage opens the damage editor for Effects and qualities.
2. **Classes and armor** list their abilities by link. Create the ability items first, then drop the class or armor on each ability's UUID field and drop the abilities back onto the class slots (Active, Passive, Limit Break; or Movement, Active, Reversal for armor).
3. **Bosses** have a button on the sheet to add attacks and a special; **minions** carry a strike and a special and need no items, and Minibosses add extra attacks as items.

## Troubleshooting

- **A compendium is missing or empty.** After updating the system, restart Foundry or reload the world so the packs are re-read.
- **No animations.** Check that Sequencer and a JB2A library (or Automated Animations) are enabled in the world, and that *Animations* is not set to none. The provider and the JB2A library in use are shown by `hellpiercers.animations.describe()`.
- **Provoke does not trigger.** It needs a started combat on a square grid, a manual move (drag, keyboard or HUD) and the *Automate Provoke* setting.
- **Sheets look unstyled.** Hard-refresh the page (Ctrl+F5) after updating; make sure the world runs Foundry v14.370.

## Credits and Licence

HELLPIERCERS is by Sandy Pug Games. This system began as the open-source HELLPIERCERS system by Bolts (Joe Nosie), <https://codeberg.org/Bolts/foundryvtt-hellpiercers>, and keeps its GPL-3.0 licence. Icons are from game-icons.net (CC BY 3.0). The fonts Big Shoulders, EB Garamond and Pirata One are used under the SIL Open Font License.
