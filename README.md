# HELLPIERCERS for Foundry VTT

A private build of the **HELLPIERCERS: Tactical Harrowing Action** system for Foundry VTT **v14.370**.

It covers all three layers of play:

- **TACCOM** - grid combat with automatic turn effects, action tracking, damage and Effects
- **STRATCOM** - the division's base, resources and tech tree, missions, and the GM's factions
- **RECON** - 2D6 + tags rolls and the Tone Die

See [`docs/API.md`](docs/API.md) for the macro API and [`ROADMAP.md`](ROADMAP.md) for progress.

## Install

Manifest URL: `https://github.com/wookieematt/foundryvtt-hellpiercers/releases/latest/download/system.json`

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
