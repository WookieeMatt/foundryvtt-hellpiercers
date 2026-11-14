/**
 * Extend TokenConfig and PrototypeTokenConfig to add system-specific fields
 * @type {typeof import("@client/hooks.mjs").renderApplicationV2}
 * @param {foundry.applications.sheets.TokenConfig} app
 */
export function extendTokenConfig(app, html, _context, options) {
  if (
    (options.parts && !options.parts.includes("appearance")) ||
    !foundry.utils.hasProperty(app.token, "actor.system.scale")
  )
    return;
  const manual_size = app.token.getFlag(game.system.id, "manual_token_size");
  const lock = foundry.applications.fields.createCheckboxInput({
    name: `flags.${game.system.id}.manual_token_size`,
    classes: "lock hellpiercers icon",
    dataset: { tooltip: "" },
    aria: { label: game.i18n.localize("HELLPIERCERS.TokenConfig.manual_token_size.tooltip") },
    value: manual_size,
  });
  /** @type {HTMLInputElement} */
  const width = html.querySelector("[name=width]");
  /** @type {HTMLInputElement} */
  const height = html.querySelector("[name=height]");
  /** @type {HTMLInputElement} */
  const depth = html.querySelector("[name=depth]");
  width.closest(".form-group").querySelector("label").before(lock);

  lock.addEventListener("change", ev => {
    width.disabled = !ev.currentTarget.checked;
    height.disabled = !ev.currentTarget.checked;
    depth.disabled = !ev.currentTarget.checked;
  });
  width.disabled = !manual_size;
  height.disabled = !manual_size;
  depth.disabled = !manual_size;
}

import.meta.hot?.accept(({ extendTokenConfig }) => {
  Hooks.on("renderTokenConfig", extendTokenConfig);
  Hooks.on("renderPrototypeTokenConfig", extendTokenConfig);
  for (const app of foundry.applications.instances.values()) {
    if (
      app instanceof foundry.applications.sheets.TokenConfig ||
      app instanceof foundry.applications.sheets.PrototypeTokenConfig
    ) {
      app.render();
    }
  }
});

import.meta.hot?.dispose(() => {
  Hooks.off("renderTokenConfig", extendTokenConfig);
  Hooks.off("renderPrototypeTokenConfig", extendTokenConfig);
});
