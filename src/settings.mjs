export const SETTINGS = Object.freeze({
  playerCountOverride: "playerCountOverride",
  migrationVersion: "migrationVersion",
  automateEffects: "automateEffects",
  armorRule: "armorRule",
  bleedRule: "bleedRule",
  trackActions: "trackActions",
  chatCards: "chatCards",
  automateProvoke: "automateProvoke",
  ichor: "ichor",
  stratcomPhase: "stratcomPhase",
  activeParty: "activeParty",
  deriveUnlocks: "deriveUnlocks",
});

/**
 * Read a system setting.
 * @param {keyof typeof SETTINGS} key
 */
export function getSetting(key) {
  return game.settings.get(game.system.id, SETTINGS[key]);
}

export function registerSettings() {
  const fields = foundry.data.fields;
  const id = game.system.id;
  const ruleChoices = key => ({
    flat: `HELLPIERCERS.SETTINGS.${key}.flat`,
    stacks: `HELLPIERCERS.SETTINGS.${key}.stacks`,
  });

  game.settings.register(id, "playerCountOverride", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.playerCountOverride.name",
    hint: "HELLPIERCERS.SETTINGS.playerCountOverride.hint",
    type: new fields.NumberField({ initial: null, min: 0 }),
  });

  game.settings.register(id, "automateEffects", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.automateEffects.name",
    hint: "HELLPIERCERS.SETTINGS.automateEffects.hint",
    type: new fields.BooleanField({ initial: true }),
  });

  game.settings.register(id, "armorRule", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.armorRule.name",
    hint: "HELLPIERCERS.SETTINGS.armorRule.hint",
    type: new fields.StringField({
      required: true,
      blank: false,
      initial: "flat",
      choices: ruleChoices("armorRule"),
    }),
  });

  game.settings.register(id, "bleedRule", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.bleedRule.name",
    hint: "HELLPIERCERS.SETTINGS.bleedRule.hint",
    type: new fields.StringField({
      required: true,
      blank: false,
      initial: "flat",
      choices: ruleChoices("bleedRule"),
    }),
  });

  game.settings.register(id, "trackActions", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.trackActions.name",
    hint: "HELLPIERCERS.SETTINGS.trackActions.hint",
    type: new fields.BooleanField({ initial: true }),
    onChange: () => ui.combat?.render(),
  });

  game.settings.register(id, "chatCards", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.chatCards.name",
    hint: "HELLPIERCERS.SETTINGS.chatCards.hint",
    type: new fields.BooleanField({ initial: true }),
  });

  game.settings.register(id, "automateProvoke", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.automateProvoke.name",
    hint: "HELLPIERCERS.SETTINGS.automateProvoke.hint",
    type: new fields.BooleanField({ initial: true }),
  });

  game.settings.register(id, "ichor", {
    scope: "world",
    config: false,
    type: new fields.NumberField({
      required: true,
      integer: true,
      nullable: false,
      initial: 0,
      min: 0,
    }),
    onChange: () => rerenderStratcom(),
  });

  game.settings.register(id, "stratcomPhase", {
    scope: "world",
    config: false,
    type: new fields.NumberField({
      required: true,
      integer: true,
      nullable: false,
      initial: 0,
      min: 0,
    }),
    onChange: () => rerenderStratcom(),
  });

  game.settings.register(id, "activeParty", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.activeParty.name",
    hint: "HELLPIERCERS.SETTINGS.activeParty.hint",
    type: new fields.StringField({
      required: false,
      blank: true,
      initial: "",
      choices: () => ({
        "": "HELLPIERCERS.SETTINGS.activeParty.auto",
        ...Object.fromEntries(
          (game.actors?.filter(a => a.type === "party") ?? []).map(a => [a.id, a.name])
        ),
      }),
    }),
    onChange: () => rerenderStratcom(),
  });

  game.settings.register(id, "deriveUnlocks", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.deriveUnlocks.name",
    hint: "HELLPIERCERS.SETTINGS.deriveUnlocks.hint",
    type: new fields.BooleanField({ initial: true }),
    onChange: () => rerenderStratcom(),
  });

  game.settings.register(id, "migrationVersion", {
    scope: "world",
    config: false,
    type: new fields.StringField({ required: true, initial: "0" }),
  });
}

/** Refresh everything that displays campaign state. */
function rerenderStratcom() {
  for (const actor of game.actors ?? []) {
    if (actor.type === "human") actor.prepareData();
    if (["party", "faction", "human"].includes(actor.type) && actor.sheet?.rendered)
      actor.sheet.render();
  }
}
