# HELLPIERCERS for Foundry VTT

A private build of the **HELLPIERCERS: Tactical Harrowing Action** system for Foundry VTT **v14.370**.

It covers all three layers of play:

- **TACCOM** - grid combat with automatic turn effects, action tracking, damage and Effects
- **STRATCOM** - the division's base, resources and tech tree, missions, and the GM's factions
- **RECON** - 2D6 + tags rolls and the Tone Die

Optional modules (all recommended in the manifest): **Dice So Nice** (themed dice),
**Automated Animations** with **Sequencer** and **socketlib**, and **JB2A** (Free or Premium; the
system detects which and falls back to the best animation each library has). See *Settings*.

The sheets follow the book's look. *Settings > Sheet Theme* switches between **Parchment** (the book's pages) and **Night** (the cover's slate and violet), per user. Fonts (Big Shoulders, EB Garamond, Pirata One) are SIL OFL; licences are in `public/fonts/hp`.

## Documentation

| | |
| --- | --- |
| [`docs/GUIDE.md`](docs/GUIDE.md) | User guide for GMs and players (also the in-Foundry **Manual & Notes** journal) |
| [`docs/API.md`](docs/API.md) | Macro and module API, hooks, settings |
| [`docs/THEMING.md`](docs/THEMING.md) | How the Parchment and Night themes are built |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Handoff for the next engineer: state, environment, workflow, gaps and ideas |
| [`CHANGELOG.md`](CHANGELOG.md) | What changed in each version |
| [`ROADMAP.md`](ROADMAP.md) | Progress and what is left |

## Install

Manifest URL: `https://github.com/WookieeMatt/foundryvtt-hellpiercers/releases/latest/download/system.json`

## Development

```
npm install --ignore-scripts
npx vite build
```

Link `dist` into your Foundry `Data/systems/hellpiercers` folder (see `docs/API.md`).

## Credits and license

This project started from the open-source HELLPIERCERS system by **Bolts** (Joe Nosie),
<https://codeberg.org/Bolts/foundryvtt-hellpiercers>, and keeps its GPL-3.0 license (see `LICENSE`).
HELLPIERCERS is by Sandy Pug Games; this is an unofficial fan tool and contains no official art.

Icons from <https://game-icons.net/> under CC BY 3.0. MedievalSharp font by Wojciech Kalinowski, OFL.
