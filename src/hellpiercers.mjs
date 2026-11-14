import "./hellpiercers.scss";

import { api } from "./api/index.mjs";
import { activateSocket } from "./api/socket.mjs";
import * as applications from "./applications/index.mjs";
import * as placeables from "./canvas/placeables/index.mjs";
import { placeTemplate } from "./canvas/range-template.mjs";
import { setTargets } from "./canvas/targeting.mjs";
import * as data from "./data/index.mjs";
import * as documents from "./documents/index.mjs";
import { extendActorDirectory } from "./hooks/directory.mjs";
import { onHotbarDrop } from "./hooks/hotbar.mjs";
import { fixDerivedTokenBars } from "./hooks/tokenbars.mjs";
import { extendTokenConfig } from "./hooks/tokenconfig.mjs";
import * as animations from "./integrations/animations.mjs";
import { activateDice, tint } from "./integrations/dice.mjs";
import { checkMigration } from "./migration.mjs";
import { applySheetTheme, registerSettings } from "./settings.mjs";
import { activateStratcom } from "./stratcom/engine.mjs";
import { findCombatant, spendAction, trySpendAction } from "./taccom/actions.mjs";
import { TurnEngine } from "./taccom/engine.mjs";
import { activateProvoke, findProvokers } from "./taccom/provoke.mjs";
import { expendTiles, joinSwarm, swarmAttackPlan } from "./taccom/swarm.mjs";
import { getStatusEffects } from "./util/statuses.mjs";

globalThis.hellpiercers = Object.freeze({
  ...api,
  applications,
  data,
  documents,
  placeables,
  animations: Object.freeze({
    ...animations,
    tint,
  }),
  taccom: Object.freeze({
    engine: TurnEngine,
    findCombatant,
    findProvokers,
    spendAction,
    expendTiles,
    joinSwarm,
    swarmAttackPlan,
    trySpendAction,
  }),
  util: {
    placeTemplate,
    setTargets,
  },
});

const ascii_logo = `
░█░█░█▀▀░█░░░█░░░█▀█░▀█▀░█▀▀░█▀▄░█▀▀░█▀▀░█▀▄░█▀▀
░█▀█░█▀▀░█░░░█░░░█▀▀░░█░░█▀▀░█▀▄░█░░░█▀▀░█▀▄░▀▀█
░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀░░░▀▀▀░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀░▀░▀▀▀
`;
Hooks.once("init", () => {
  console.log("hellpiercers | Initializing HELLPIERCERS System", ascii_logo);
  game.system.api = globalThis.hellpiercers;
  const sheets = applications.sheets;
  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;

  registerSettings();
  activateDice();

  // Actors
  Object.assign(CONFIG.Actor.dataModels, {
    boss: data.Actor.BossModel,
    faction: data.Actor.FactionModel,
    halo: data.Actor.HaloModel,
    human: data.Actor.HumanModel,
    minion: data.Actor.MinionModel,
    party: data.Actor.PartyModel,
    spawner: data.Actor.SpawnerModel,
  });
  CONFIG.Actor.documentClass = documents.HellpiercersActor;
  CONFIG.Actor.trackableAttributes = {
    boss: { bar: ["health", "agnosia.bar"], value: ["scale", "speed", "agnosia.value"] },
    faction: {
      bar: ["crown"],
      value: ["qualities.force", "qualities.subterfuge", "qualities.territory", "qualities.assets"],
    },
    halo: { bar: ["health"], value: ["scale", "speed"] },
    human: { bar: ["health", "limit", "reversal_charges"], value: ["scale", "speed"] },
    minion: { bar: ["health", "swarm_hp"], value: ["scale", "speed"] },
    party: { bar: [], value: ["resources.hellsteel", "resources.soulfire", "resources.brimstone"] },
    spawner: { bar: ["health"], value: ["scale", "speed", "spawn.charge"] },
  };
  DocumentSheetConfig.registerSheet(Actor, game.system.id, sheets.BossSheet, {
    types: ["boss"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Actor.boss",
  });
  DocumentSheetConfig.registerSheet(Actor, game.system.id, sheets.HaloSheet, {
    types: ["halo"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Actor.halo",
  });
  DocumentSheetConfig.registerSheet(Actor, game.system.id, sheets.HumanSheet, {
    types: ["human"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Actor.human",
  });
  DocumentSheetConfig.registerSheet(Actor, game.system.id, sheets.FactionSheet, {
    types: ["faction"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Actor.faction",
  });
  DocumentSheetConfig.registerSheet(Actor, game.system.id, sheets.PartySheet, {
    types: ["party"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Actor.party",
  });
  DocumentSheetConfig.registerSheet(Actor, game.system.id, sheets.MinionSheet, {
    types: ["minion"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Actor.minion",
  });
  DocumentSheetConfig.registerSheet(Actor, game.system.id, sheets.SpawnerSheet, {
    types: ["spawner"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Actor.spawner",
  });
  DocumentSheetConfig.registerSheet(Actor, game.system.id, sheets.HumanSheetConfig, {
    types: ["human"],
    canBeDefault: false,
    canConfigure: false,
    makeDefault: false,
  });
  DocumentSheetConfig.registerSheet(Actor, game.system.id, sheets.HaloSheetConfig, {
    types: ["halo"],
    canBeDefault: false,
    canConfigure: false,
    makeDefault: false,
  });

  // Items
  Object.assign(CONFIG.Item.dataModels, {
    ability: data.Item.AbilityModel,
    armor: data.Item.ArmorModel,
    class: data.Item.ClassModel,
    equipment: data.Item.EquipmentModel,
    gear: data.Item.GearModel,
    halo_system: data.Item.HaloSystemModel,
    halo_weapon: data.Item.HaloWeaponModel,
    weapon: data.Item.WeaponModel,
  });
  CONFIG.Item.documentClass = documents.HellpiercersItem;
  DocumentSheetConfig.registerSheet(Item, game.system.id, sheets.AbilitySheet, {
    types: ["ability"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Item.ability",
  });
  DocumentSheetConfig.registerSheet(Item, game.system.id, sheets.ArmorSheet, {
    types: ["armor"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Item.armor",
  });
  DocumentSheetConfig.registerSheet(Item, game.system.id, sheets.ClassSheet, {
    types: ["class"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Item.class",
  });
  DocumentSheetConfig.registerSheet(Item, game.system.id, sheets.EquipmentSheet, {
    types: ["equipment"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Item.equipment",
  });
  DocumentSheetConfig.registerSheet(Item, game.system.id, sheets.GearSheet, {
    types: ["gear"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Item.gear",
  });
  DocumentSheetConfig.registerSheet(Item, game.system.id, sheets.HaloSystemSheet, {
    types: ["halo_system"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Item.halo_system",
  });
  DocumentSheetConfig.registerSheet(Item, game.system.id, sheets.HaloWeaponSheet, {
    types: ["halo_weapon"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Item.halo_weapon",
  });
  DocumentSheetConfig.registerSheet(Item, game.system.id, sheets.WeaponSheet, {
    types: ["weapon"],
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.Item.weapon",
  });

  CONFIG.ActiveEffect.dataModels.base = data.ActiveEffect.EffectModel;
  DocumentSheetConfig.registerSheet(ActiveEffect, game.system.id, sheets.HellpiercersEffectConfig, {
    makeDefault: true,
    label: "HELLPIERCERS.SHEETS.ActiveEffect.base",
  });

  // ChatMessages
  CONFIG.ChatMessage.dataModels.damage = data.ChatMessage.DamageMessageModel;
  CONFIG.ChatMessage.dataModels.response = data.ChatMessage.ResponseMessageModel;

  // Combat & Combatants
  CONFIG.Combat.documentClass = documents.HellpiercersCombat;
  CONFIG.Combat.fallbackTurnMarker = `systems/${game.system.id}/assets/turn-marker.svg`;
  CONFIG.Combatant.documentClass = documents.HellpiercersCombatant;
  CONFIG.Combatant.dataModels.base = data.Combatant.HellpiercersCombatantModel;
  CONFIG.CombatantGroup.dataModels.swarm = data.CombatantGroup.SwarmModel;
  CONFIG.ui.combat = applications.sidebar.tabs.HellpiercersCombatTracker;

  // Tokens
  CONFIG.Token.documentClass = documents.HellpiercersTokenDocument;
  CONFIG.Token.objectClass = placeables.HellpiercersToken;
  CONFIG.Token.hudClass = applications.hud.HellpiercersTokenHUD;

  foundry.applications.settings.menus.FontConfig.loadFont("MedievalSharp", {
    editor: true,
    fonts: [
      {
        style: "normal",
        urls: [`systems/${game.system.id}/fonts/MedievalSharp/MedievalSharp-Regular.ttf`],
      },
    ],
  });

  CONFIG.ui.attackHud = applications.AttackHud;
});

Hooks.once("i18nInit", () => {
  CONFIG.statusEffects = getStatusEffects();
  Object.assign(CONFIG.specialStatusEffects, {
    BLIND: null,
    BURROW: null,
    FLY: "aegis",
    HOVER: "aegis",
    INVISIBLE: null,
  });

  foundry.helpers.Localization.localizeDataModel(data.Damage);
  foundry.helpers.Localization.localizeDataModel(data.HaloUpgradeModel);
});

Hooks.once("ready", () => {
  applySheetTheme();
  activateSocket();
  activateStratcom();
  activateProvoke();
  animations.activateAnimations();
  return checkMigration();
});

// Hooks
// Dialogs and the system's own journals wear the same look as the sheets.
Hooks.on("renderDialogV2", (_app, element) => element.classList.add("hellpiercers", "hp-dialog"));
Hooks.on("renderJournalEntrySheet", (app, element) => {
  const doc = app.document;
  if (doc.getFlag(game.system.id, "themed") || doc.pack?.startsWith(`${game.system.id}.`)) {
    element.classList.add("hellpiercers", "hp-journal");
  }
});
Hooks.on("hotbarDrop", onHotbarDrop);
Hooks.on("renderActorDirectory", extendActorDirectory);
Hooks.on("renderTokenConfig", extendTokenConfig);
Hooks.on("renderPrototypeTokenConfig", extendTokenConfig);
Hooks.on("canvasReady", fixDerivedTokenBars);
