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
  themedDice: "themedDice",
  animationProvider: "animationProvider",
  jb2aTier: "jb2aTier",
  animateAttacks: "animateAttacks",
  animateEffects: "animateEffects",
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

  // Module integrations: Dice So Nice, Automated Animations, Sequencer and JB2A.
  game.settings.register(id, "themedDice", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.themedDice.name",
    hint: "HELLPIERCERS.SETTINGS.themedDice.hint",
    type: new fields.BooleanField({ initial: true }),
  });

  game.settings.register(id, "animationProvider", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.animationProvider.name",
    hint: "HELLPIERCERS.SETTINGS.animationProvider.hint",
    type: new fields.StringField({
      required: true,
      blank: false,
      initial: "auto",
      choices: {
        auto: "HELLPIERCERS.SETTINGS.animationProvider.auto",
        "automated-animations": "HELLPIERCERS.SETTINGS.animationProvider.automated",
        builtin: "HELLPIERCERS.SETTINGS.animationProvider.builtin",
        none: "HELLPIERCERS.SETTINGS.animationProvider.none",
      },
    }),
  });

  game.settings.register(id, "jb2aTier", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.jb2aTier.name",
    hint: "HELLPIERCERS.SETTINGS.jb2aTier.hint",
    type: new fields.StringField({
      required: true,
      blank: false,
      initial: "auto",
      choices: {
        auto: "HELLPIERCERS.SETTINGS.jb2aTier.auto",
        premium: "HELLPIERCERS.SETTINGS.jb2aTier.premium",
        free: "HELLPIERCERS.SETTINGS.jb2aTier.free",
      },
    }),
  });

  game.settings.register(id, "animateAttacks", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.animateAttacks.name",
    hint: "HELLPIERCERS.SETTINGS.animateAttacks.hint",
    type: new fields.BooleanField({ initial: true }),
  });

  game.settings.register(id, "animateEffects", {
    scope: "world",
    config: true,
    name: "HELLPIERCERS.SETTINGS.animateEffects.name",
    hint: "HELLPIERCERS.SETTINGS.animateEffects.hint",
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
