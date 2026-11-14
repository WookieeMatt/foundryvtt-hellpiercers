import { createFaction, createParty } from "../stratcom/engine.mjs";
import { FACTIONS } from "../stratcom/faction-catalog.mjs";

/**
 * Add "Faction" and "Party" shortcuts to the Actor Directory so the GM can create them from the
 * catalog without opening the generic create dialog.
 * @param {foundry.applications.sidebar.tabs.ActorDirectory} _app
 * @param {HTMLElement} html
 */
export function extendActorDirectory(_app, html) {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const actions = root?.querySelector(".header-actions");
  if (!actions || actions.querySelector(".hp-stratcom-create")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("hp-stratcom-create");
  button.innerHTML = '<i class="fa-solid fa-flag"></i> Faction / Party';
  button.addEventListener("click", showCreateDialog);
  actions.append(button);
}

async function showCreateDialog() {
  const existing = new Set(game.actors.filter(a => a.type === "faction").map(a => a.system.key));
  const options = FACTIONS.map(
    f =>
      `<option value="${f.id}" ${existing.has(f.id) ? "disabled" : ""}>${f.name}${existing.has(f.id) ? " (exists)" : ""}</option>`
  ).join("");
  const result = await foundry.applications.api.Dialog.input({
    window: { title: "Create Faction or Party", icon: "fa-solid fa-flag" },
    content: `<div class="form-group"><label>Create</label><div class="form-fields"><select name="kind"><option value="faction">Faction</option><option value="party">Party</option></select></div></div>
      <div class="form-group"><label>Faction</label><div class="form-fields"><select name="faction">${options}</select></div></div>
      <div class="form-group"><label>Party name</label><div class="form-fields"><input type="text" name="name" value="Division"></div></div>`,
  });
  if (!result) return;
  const actor =
    result.kind === "party"
      ? await createParty(result.name || "Division")
      : await createFaction(result.faction);
  actor?.sheet.render({ force: true });
}
