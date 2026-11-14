# Theming

The look of the system comes from the book: aged parchment, thick black ink, gold ribbon labels, a crimson
paint edge and blackletter titles. This page explains how it is built so you can extend or change it.

## The two palettes

| Palette | Body class | Inspired by |
| --- | --- | --- |
| Parchment (default) | `hp-theme-parchment` | The pages of the Core Rules |
| Night | `hp-theme-night` | The cover: slate and violet with gold, crimson and teal |

The **Sheet Theme** setting is per user (client scope). `applySheetTheme()` in `src/settings.mjs` puts the
class on `<body>` on `ready` and whenever the setting changes. Everything else is CSS.

## Tokens

Both palettes define the same CSS custom properties on `body.system-hellpiercers` (`src/styles/_theme.scss`):

| Token | Meaning |
| --- | --- |
| `--hp-surface`, `--hp-surface-2`, `--hp-surface-3` | Page, panel fill, subtle overlay |
| `--hp-paper` | The window background (gradients, fibres and noise; no image files) |
| `--hp-text`, `--hp-text-dim` | Body and secondary text |
| `--hp-border`, `--hp-border-soft`, `--hp-line` | Ink, soft ink, gold rule |
| `--hp-accent`, `--hp-hero` | Crimson (or magenta) accents; the orange (or gold) used for big numbers |
| `--hp-good`, `--hp-bad` | Success and failure |
| `--hp-chrome`, `--hp-chrome-text` | The black window bar and its gold text |
| `--hp-input` | Form field background |
| `--hp-gold`, `--hp-crimson`, `--hp-teal`, `--hp-magenta`... | Fixed brand colours |
| `--hp-font-body`, `--hp-font-label`, `--hp-font-stencil`, `--hp-font-black` | EB Garamond, Big Shoulders Display, Big Shoulders Stencil, Pirata One |

Use the tokens, never hard-coded colours, so both palettes keep working. Inside `.hellpiercers.application`
Foundry's own variables (`--color-text-primary`, `--input-background-color`, `--button-*`...) are re-pointed at
the tokens, so stock form controls follow the theme.

## Shapes

`src/styles/_mixins.scss` holds the shapes of the book:

- `ribbon($height)` - the gold label with the notched left end (`clip-path`). It is `inline-block` on purpose:
  `inline-flex` drops the whitespace between words.
- `tag` - the black chamfered label used for sheet sections.
- `ink-panel($fill)` - a thick black border with slightly off-square corners and a hard printed shadow.
- `paint-edge($side)` - the crimson edge down one side of a page.

Utility classes `.hp-ribbon`, `.hp-tag` and `.hp-panel` expose them to templates.

## Where things live

| File | Styles |
| --- | --- |
| `_fonts.scss` | `@font-face` for the bundled fonts (`public/fonts/hp`, SIL OFL) |
| `_theme.scss` | Tokens, window chrome, tabs, buttons, inputs, editors |
| `_mixins.scss` | Shapes |
| `sheets/_components.scss`, `sheets/_actor.scss`, `sheets/_item.scss` | Header boxes, ability blocks, lists, per-type layouts |
| `stratcom.scss` | Party and faction sheets |
| `taccom.scss` | Action pips, status chips, tracker pips |
| `_chat.scss` | Chat cards (ability, damage, rolls, turn notes) |
| `_journal.scss` | The system's journals (Rules Reference, Manual) |
| `_dialogs.scss`, `_overrides.scss` | Editors, the attack dialog, token HUD, combat tracker |

## What gets themed

- Every window with the `hellpiercers` class (all system sheets and dialogs).
- Every `DialogV2` (the `renderDialogV2` hook adds `hellpiercers hp-dialog`).
- Journals from the system's compendiums, or with the flag `hellpiercers.themed` (the `renderJournalEntrySheet`
  hook adds `hellpiercers hp-journal`). Set that flag on your own journals to use the rules-page look.
- Chat messages that contain `.hellpiercers` markup.
- The combat tracker, which is always dark (ink, gold and crimson) whatever the palette.

## Rules of thumb

1. Put colours in tokens, shapes in mixins, layout in the component files.
2. Do not set `font-family` on buttons that are icons: use `button:not(.icon, [class*="fa-"])`.
3. Do not close every entry of `foundry.applications.instances` while testing: that includes the sidebar.
4. The stylesheet is loaded in `@layer system`; core styles are in lower layers, so selectors do not need `!important`.
5. After changing templates or styles, run `npx vite build` and reload the world.

## Checking contrast

A quick console audit helps when adding colours: for every element with text, compare `getComputedStyle(el).color`
against the nearest opaque background and flag a contrast ratio under 3.2. Run it with each palette on each sheet
tab; the release checks in `CHANGELOG.md` were done this way.
