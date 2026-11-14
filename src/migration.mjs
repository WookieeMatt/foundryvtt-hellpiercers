export function checkMigration() {
  if (!game.user.isGM) return;
  /** @type {string} */
  const migrationVersion = game.settings.get(game.system.id, "migrationVersion");
  if (migrationVersion === "0") {
    initialLaunch();
  } else if (foundry.utils.isNewerVersion(game.system.version, migrationVersion)) {
    postUpgrade();
  }
  game.settings.set(game.system.id, "migrationVersion", game.system.version);
}

function initialLaunch() {
  foundry.documents.ChatMessage.implementation.create({
    content: `${parts.header}
<div style="text-align: center;">Version: ${game.system.version}</div>
<p>Welcome to the HELLPIERCERS system for FoundryVTT.  This is an unofficial implementation and a work in progress.  Your patience is appreciated.</p>
${parts.spg}
<p>@UUID[Compendium.hellpiercers.systeminfo.JournalEntry.dkbDQ8CZlhEazfw7]</p>
<p>@UUID[Compendium.hellpiercers.systeminfo.JournalEntry.dkbDQ8CZlhEazfw7.JournalEntryPage.k6zghMJZcTUWAiII]{Credits}</p>
${parts.footer}`,
  });
}

function postUpgrade() {
  foundry.documents.ChatMessage.implementation.create({
    content: `${parts.header}
<div style="text-align: center;">Version: ${game.system.version}</div>
<p>HELLPIERCERS has upgraded from version ${game.settings.get(game.system.id, "migrationVersion")}.  Please wait for any migrations to finish before continuing.</p>
${parts.spg}
<p>@UUID[Compendium.hellpiercers.systeminfo.JournalEntry.dkbDQ8CZlhEazfw7.JournalEntryPage.MauFU7m4EmDZ7Frx]{Change Log}</p>
<p>@UUID[Compendium.hellpiercers.systeminfo.JournalEntry.dkbDQ8CZlhEazfw7]</p>
<p>@UUID[Compendium.hellpiercers.systeminfo.JournalEntry.dkbDQ8CZlhEazfw7.JournalEntryPage.k6zghMJZcTUWAiII]{Credits}</p>
${parts.footer}`,
  });

  ui.notifications.success("No migrations to run");
}

const parts = Object.freeze({
  header: `<h4 style="font-family: var(--font-h1); text-align: center; margin: unset;">HELLPIERCERS</h4>`,
  spg: `<p style="--color-text-accent: var(--color-warm-3);">HELLPIERCERS was created by <a href="https://sandypuggames.com/">Sandy Pug Games</a> and is available for purchase <a href="https://www.sandypuggames.com/#!/HELLPIERCERS-PDF/p/769460554">here.</a></p>`,
  footer: `<div class="flexrow" style="--color-text-accent: var(--color-warm-3);">
  <span style="text-align: center;">
    <a href="https://codeberg.org/Bolts/foundryvtt-hellpiercers">Development</a>
  </span>
  <span style="text-align: center;">
    <a href="https://codeberg.org/Bolts/foundryvtt-hellpiercers/issues">Bugs</a>
  </span>
  <span style="text-align: center;">
    <a href="https://codeberg.org/Bolts/foundryvtt-hellpiercers/src/branch/main/LICENSE">License</a>
  </span>
</div>`,
});
