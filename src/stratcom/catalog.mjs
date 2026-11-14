/**
 * STRATCOM rules data: resources, the base-building tech tree, mission objectives, vehicles,
 * roles, Triumphs and the GM's research projects. Page numbers refer to the core rulebook.
 *
 * The prerequisites follow the drawn tech tree (pp. 115-117), which differs from the printed
 * paragraph on p. 116:
 *
 *   PRONOIA + Synthetic Spinther Lab -> Archontic Bay
 *   Archontic Bay + HEBDOMAS         -> ANOINT
 *   CHOIC -> EROS         Ignorance-Devouring -> SYZYGOS         APONOIA -> GNOSTIC -> AGNOIA
 *
 * ANCILIA has no drawn prerequisite.
 */

export const RESOURCES = Object.freeze(["hellsteel", "soulfire", "brimstone"]);

/**
 * @typedef {object} BuildingDef
 * @property {string} id
 * @property {string} name
 * @property {Partial<Record<"hellsteel" | "soulfire" | "brimstone", number>>} cost
 * @property {string[]} requires  Buildings that must be constructed first
 * @property {string} mechanic    The mechanic it unlocks
 * @property {Partial<Record<"weapon"|"armor"|"class"|"equipment"|"gear"|"halo_weapon"|"halo_system", string[]>>} unlocks
 */

/** @type {BuildingDef[]} */
export const BUILDINGS = [
  {
    id: "pronoia",
    name: "PRONOIA Arms Modification Protocols",
    cost: { hellsteel: 2 },
    requires: [],
    mechanic: "gear",
    unlocks: {
      weapon: ["Love Without Consideration"],
      armor: ["YADATHAN"],
      class: ["EPEUS"],
      gear: [
        "Assisted Ascension Module",
        "Expanded Aggression Rituals",
        "Soter Assisted Defense System",
      ],
    },
  },
  {
    id: "ancilia",
    name: "ANCILIA Tactical Production",
    cost: { hellsteel: 1 },
    requires: [],
    mechanic: "equipment",
    unlocks: {
      weapon: ["Sabaoth-Class Obliteration Charges"],
      class: ["HEPHAESTUS"],
      equipment: [
        "Hylic Annihilation Corridor",
        "Promethean-Grade Hylic Rejection Field",
        "Thought-Guiding Redirection Circuits",
        "Transient Force Projection",
      ],
    },
  },
  {
    id: "aponoia",
    name: "APONOIA Expedited Enlightenment Process",
    cost: { brimstone: 1 },
    requires: [],
    mechanic: "limit_break",
    unlocks: {
      weapon: ["Ambiguous Intentions"],
      armor: ["MURIEL"],
      class: ["CHRYSAOR"],
      halo_weapon: ["Monadic Offense Manifestation Array"],
    },
  },
  {
    id: "choic",
    name: "CHOIC Spatial Manipulation Sigil Development",
    cost: { brimstone: 1 },
    requires: [],
    mechanic: "weapon_slot",
    unlocks: { weapon: ["Heaven Burning Sword"], class: ["VARUNASTRA"] },
  },
  {
    id: "spinther_lab",
    name: "Synthetic Spinther Manufacturing Lab",
    cost: { brimstone: 4, soulfire: 5 },
    requires: [],
    mechanic: "vehicles",
    unlocks: {
      equipment: ["Motes of Bountiful Forethought"],
      halo_weapon: ["Catalytic-Actuated Positron Rifle"],
    },
  },
  {
    id: "hebdomas",
    name: "HEBDOMAS Aerial Support Wing",
    cost: { soulfire: 2, brimstone: 2 },
    requires: [],
    mechanic: "off_grid",
    unlocks: {
      weapon: ["Paradigm-Shattering Cauldron"],
      armor: ["BARAQIEL"],
      halo_system: ["AEIDIS Combat Drop Protocols"],
    },
  },
  {
    id: "ignorance",
    name: "Ignorance-Devouring Hyper-Spatial Anchor",
    cost: { hellsteel: 3, brimstone: 1 },
    requires: [],
    mechanic: "reversals",
    unlocks: {
      weapon: ["Heaven Or Hell"],
      gear: ["Angelweight Optimization", "Spiked Shoulders"],
    },
  },
  {
    id: "bay",
    name: "Archontic Longinomechanical Pneuma-Engineering Bay",
    cost: { soulfire: 1 },
    requires: ["pronoia", "spinther_lab"],
    mechanic: "halo",
    unlocks: {
      weapon: ["Regrettable Precaution"],
      armor: ["NBAT"],
      class: ["OGMIOS"],
      equipment: ["Inverted Flagellation-Acceleration Praxis"],
      halo_weapon: ["AH-18 Pristir Cannon", "Acherontic Warheads"],
      halo_system: [
        "Desant Anchors",
        "ATLAS Tactical Transmateriel Pods",
        "VELOS Aerial Reconfiguration Suite",
      ],
    },
  },
  {
    id: "anoint",
    name: "ANOINT Reality Manipulation Development",
    cost: { soulfire: 2 },
    requires: ["bay", "hebdomas"],
    mechanic: "grid_manipulation",
    unlocks: {
      weapon: ["Her Tears Formed Our World"],
      armor: ["ABATUR"],
      class: ["DERAFSH KAVIANI"],
      halo_system: ["Emergency Bythos Shunt"],
    },
  },
  {
    id: "eros",
    name: "EROS Management Vault Systems",
    cost: { soulfire: 4, brimstone: 3 },
    requires: ["choic"],
    mechanic: "legendary_arms",
    unlocks: {
      armor: ["JEHOEL"],
      gear: ["Weapon Link", "Ablative Pseudo-Soul"],
      equipment: ["Zoe-Emulation Soul Cloning Engine", "Oblivion Induction Ritual Device"],
      halo_weapon: ["Longinus Driver"],
    },
  },
  {
    id: "syzygos",
    name: "SYZYGOS Automated Adulation Suite",
    cost: { hellsteel: 2, brimstone: 2 },
    requires: ["ignorance"],
    mechanic: "roles",
    unlocks: {
      class: ["ULFBERHT"],
      equipment: ["Constrained Reality Modification Circuits"],
      halo_weapon: ["Keraunos Imas"],
      halo_system: ["Katagnosis Plating"],
    },
  },
  {
    id: "gnostic",
    name: "GNOSTIC Synthesis Chamber",
    cost: { hellsteel: 4, soulfire: 3 },
    requires: ["aponoia"],
    mechanic: "class_mastery",
    unlocks: { weapon: ["Duty Before Indulgence"], armor: ["MACROPROSOPUS"] },
  },
  {
    id: "agnoia",
    name: "AGNOIA Triumph Chamber",
    cost: { hellsteel: 3 },
    requires: ["gnostic"],
    mechanic: "triumph",
    unlocks: {
      weapon: ["Consecrated Behemoth Spines"],
      armor: ["SACHIEL"],
      class: ["ZOMORROD"],
      equipment: ["Hyper-Synaptic Anchor", "Weaponized Pommel"],
      gear: ["Weighted Push", "Leviathan-Eyed Consecration Protocol"],
    },
  },
];

export const BUILDINGS_BY_ID = Object.freeze(Object.fromEntries(BUILDINGS.map(b => [b.id, b])));

/** Options a squad has from the very first session (p. 15). */
export const STARTING_UNLOCKS = Object.freeze({
  weapon: [
    "Ten Thousand Year Reign Shattering Blade",
    "She Speaks The Language Of Kings",
    "Sethian Externalized Annihilation Cannon",
  ],
  armor: ["MALAKBEL", "KUSHIEL", "ASMODEL"],
  class: ["HARPE", "KOPIS", "SHARUR"],
});

/**
 * Gear and Equipment that no building lists are unlocked by the building that adds the slot
 * (PRONOIA for Gear, ANCILIA for Equipment). Everything else that no building lists is available.
 */
export const SLOT_BUILDING = Object.freeze({ gear: "pronoia", equipment: "ancilia" });

/** Normalize a name so "Regrettable Precaution" and "regrettable-precaution" compare equal. */
export function normalizeName(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[−‐-―’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const UNLOCK_INDEX = (() => {
  /** @type {Map<string, string>} type:name -> building id */
  const map = new Map();
  for (const b of BUILDINGS) {
    for (const [type, names] of Object.entries(b.unlocks)) {
      for (const n of names) map.set(`${type}:${normalizeName(n)}`, b.id);
    }
  }
  return map;
})();

/**
 * Which building (if any) gates an item.
 * @param {string} type   Item type
 * @param {string} name   Item name
 * @returns {string | null} A building id, or null if the item is always available
 */
export function gatingBuilding(type, name) {
  const key = normalizeName(name);
  const direct = UNLOCK_INDEX.get(`${type}:${key}`);
  if (direct) return direct;
  if (type === "halo_weapon" || type === "halo_system") return "bay";
  return SLOT_BUILDING[type] ?? null;
}

/* -------------------------------------------- */
/*  Missions                                    */
/* -------------------------------------------- */

/** Default mission objectives and their reward (pp. 113-114). */
export const OBJECTIVES = Object.freeze({
  assault: { label: "Assault A Hardened Target", reward: { hellsteel: 1 } },
  rescue: { label: "Rescue", reward: { brimstone: 1 } },
  intel: { label: "Retrieve Intel", reward: { hellsteel: 1 } },
  assassination: { label: "Assassination", reward: { soulfire: 1 } },
  defense: {
    label: "Defense",
    reward: { brimstone: 1 },
    special: true,
    penalty: "A faction loses 1 Force if the defense fails.",
  },
  final_assault: {
    label: "Final Assault",
    reward: {},
    special: true,
    penalty: "Requires a faction with two Qualities at 0.",
  },
  destroy_prince: { label: "The Destruction of the Demon Prince", reward: {}, special: true },
});

/** Ichor the GM earns: per mission, and per hero defeated (p. 224). */
export const ICHOR_PER_MISSION = 1;
export const ICHOR_PER_DEFEAT = 2;

/* -------------------------------------------- */
/*  Vehicles (pp. 127-130)                      */
/* -------------------------------------------- */

export const VEHICLE_READINESS = Object.freeze(["ready", "capable", "ruin"]);
export const MAX_VEHICLE_UPGRADES = 2;

/** @type {Array<{ id: string, name: string, cost: Record<string, number>, kind: "upgrade" | "personalization", requires?: string }>} */
export const VEHICLE_OPTIONS = [
  {
    id: "munitions",
    kind: "upgrade",
    name: "Vengeance Enabling Hyper-Munitions Adaptation",
    cost: {},
    requires: "hebdomas",
  },
  {
    id: "fob",
    kind: "upgrade",
    name: "Tactical Forward Operating Base Mode",
    cost: { hellsteel: 3, soulfire: 2 },
  },
  { id: "osp", kind: "upgrade", name: "OSP Module", cost: { brimstone: 5, soulfire: 2 } },
  {
    id: "teleport",
    kind: "upgrade",
    name: "Uncontestable Replicative Teleportation Deployment",
    cost: { brimstone: 2, soulfire: 2, hellsteel: 2 },
  },
  {
    id: "motoric",
    kind: "upgrade",
    name: "Motoric Ritual Delivery System",
    cost: { brimstone: 3, soulfire: 1, hellsteel: 1 },
  },
  {
    id: "choic_mode",
    kind: "personalization",
    name: "Hylic Emulation Matrix: CHOIC Mode",
    cost: { soulfire: 5, hellsteel: 5 },
  },
  {
    id: "aquatic",
    kind: "personalization",
    name: "Aquatic Navigation Adaptations",
    cost: { soulfire: 1, hellsteel: 2, brimstone: 3 },
  },
  {
    id: "nonhylic",
    kind: "personalization",
    name: "Enhanced Non-Hylic Navigation Mode",
    cost: { soulfire: 2, hellsteel: 3 },
  },
  {
    id: "abraxian",
    kind: "personalization",
    name: "Critical Form Abraxian Physics Manipulation Suite",
    cost: { brimstone: 2, hellsteel: 3 },
  },
];

/* -------------------------------------------- */
/*  Roles, Off-Grid, Grid Manipulation, Triumphs */
/* -------------------------------------------- */

export const ROLES = Object.freeze({
  skopos: {
    label: "Skopos",
    actions: ["Tulpic Observation Projection", "Veil-Rending Reality Realignment"],
    recon: [
      "Stratiotici Mellonsophia Manipulation Ritual",
      "Crystalline-Fortified Asset Heuristics",
    ],
  },
  mensor: {
    label: "Mensor",
    actions: ["Ogdoad Replication//Emulation", "Vertex-Coil Emergency Ephodia Distribution"],
    recon: ["Preemptive Inventory Supplementation", "Angelhound Squire"],
  },
  chresto: {
    label: "Chresto",
    actions: ["Magnificent Exorcism", "COMPLETE DOMINION"],
    recon: ["Geometrization", "Emergency Soul Triage"],
  },
  mahemikos: {
    label: "Mahemikos",
    actions: ["Collective Bargaining"],
    recon: [
      "Rising Blood Of Twenty Billion Martyred Divines",
      "Mind-Liberating Pseudo-Ascending Activation Phrase",
    ],
  },
});

export const OFF_GRID_MUNITIONS = Object.freeze([
  "Twelve Tone Fusion-Core Shattering Ritual",
  "Directed Oblivion Strike",
  "Void-Transgressing Umbral Needle",
  "Mk.89 Revised Seraphic Veil Adaptation",
  "Neuro-Linked Non-Euclidean Drone Assault Suite",
  "Samothracian-Derived Annihilation Swarm",
  "Eight Heaven Toppling Giga-Bomb",
  "Cryptographic Tempest-Enlightenment Infusion Ritual",
  "Predictive Stygian Nano-Swarm Support Incantation",
  "Mithiran Cataclysm Unifier V.1811.283.31",
]);

export const GRID_SUITES = Object.freeze({
  orphite: {
    name: "Orphite Protective Ritual Suite",
    tiles: "3 Cover, 2 Advantageous, 2 Obstacle:2",
  },
  ogdoad: {
    name: "Ogdoad-Mantling Surefooted Ritual Suite",
    tiles: "4 Standard, 2 Uneasy, 1 Void",
  },
  apocalypse: { name: "Unmitigated Apocalypse Emulation Suite", tiles: "4 Void" },
  hylic: {
    name: "Hylic-Tunneling Enabled Resonance Suite",
    tiles: "2 Linked Tiles, 3 Cover, 3 Advantageous",
  },
  projected: {
    name: "Projected Reality Materialization Suite",
    tiles: "8 Standard, anywhere, including over walls and outside the map",
  },
  sanctuary: {
    name: "Siloed Agape-Infused Sanctuary Ritual Suite",
    tiles: "A whole structure placed anywhere on the map",
  },
  vicious: {
    name: "Vicious Emerald-Staffed Aggression Suite",
    tiles: "1 Void, 3 Trapped (2D6), 2 Ravaging Trapped (1D6 each entry)",
  },
});

/** Triumphs (p. 121-122): a self-imposed challenge in exchange for a reward, for one mission. */
export const TRIUMPHS = Object.freeze({
  bare: {
    challenge: "No gear or mods can be used this mission.",
    reward: "1 additional Off-Grid Munitions use this mission.",
  },
  bleeding: {
    challenge: "You gain Bleed:1 that cannot be removed until you return to DIS.",
    reward: "Next mission you gain Healing:1 that cannot be removed until you return to DIS.",
  },
  reckless: {
    challenge: "You must spend all your Speed every turn; unspent Speed is dealt back as damage.",
    reward: "Gain 2 Charges of Rush: a Free action to double your Speed.",
  },
  echo: {
    challenge:
      "Enemies treat you as occupying both the tile you start and the tile you end your turn on.",
    reward: "Gain 2 resources of any type at mission end.",
  },
  tethered: {
    challenge:
      "Two players take this at once and must end all movement within 2 spaces of each other.",
    reward:
      "Choose Slow:1, Bleed:1 or Poison:1: attacks against creatures already damaged by your partner gain it.",
  },
  magnetic: {
    challenge:
      "Once per turn the GM may declare an enemy Magnetic; you move 2 spaces toward it at turn start (still Provokes).",
    reward: "One player gains Trans-Body Attraction Suite.",
  },
  hunted: {
    challenge: "The GM has 3 Charges to summon a chosen miniboss during your turn.",
    reward: "Charge-bought minibosses drop 1 resource (claim within 2 turns).",
  },
  volatile: {
    challenge:
      "Your attack patterns that overlap a player character apply their Effects and half damage to them.",
    reward: "Gain Stasis-Induction Hyperforge (Aux: mark a tile of your next attack Lingering:1).",
  },
  frugal: {
    challenge:
      "You may heal 1 HP when you damage an adjacent creature, but no other healing except Rez.",
    reward:
      "Advance your Limit Break by 1 each turn (or restore 1 Equipment use per round if you have none).",
  },
  last: {
    challenge: "You take your actions after all enemy units.",
    reward: "Your loadout may include up to 2 options you have not unlocked.",
  },
  shaded: {
    challenge: "All enemy minibosses gain permanent Shaded:1.",
    reward: "+2 Speed on any turn you are or were in a Shaded square.",
  },
  swapped: {
    challenge: "Once per round the GM may swap you with a minion or miniboss.",
    reward:
      "Create an extra shared HELLPIERCER any player can transform into (Aux, once per TACCOM).",
  },
});

/* -------------------------------------------- */
/*  GM side: convoys, locations, research        */
/* -------------------------------------------- */

export const LOCATION_TYPES = Object.freeze([
  "extractive",
  "productive",
  "destructive",
  "defensive",
  "logistical",
  "legendary",
]);

/** Convoys arrive at the start of the second STRATCOM phase after deployment (p. 225). */
export const CONVOY_TRAVEL_PHASES = 2;

export const CONVOY_KINDS = Object.freeze({
  supply: { label: "Supply", outcomes: ["Fortify Stronghold", "Unit Drills", "Research Project"] },
  support: { label: "Support", outcomes: ["Unit Drills", "Research Project"] },
  assault: { label: "Assault", outcomes: ["Retake territory or attack (TACCOM, or roll Force)"] },
  diplomatic: { label: "Diplomatic", outcomes: ["Research Project", "Infernal Mass"] },
  decoy: { label: "Decoy", outcomes: [] },
});

/** @type {Array<{ id: string, name: string, cost: number, time: number, limit?: "game" | "faction", effect: string }>} */
export const RESEARCH_PROJECTS = [
  {
    id: "springtrap",
    name: "Nightmare Sulfur Springtrap",
    cost: 3,
    time: 1,
    effect:
      "A miniboss gains: mark a special terrain tile within Burst:2; when a player moves onto it, it explodes for 2 damage plus 1 in Burst:2 with Lingering:2.",
  },
  {
    id: "silhouette",
    name: "Silhouette Sub-Dimensionalization",
    cost: 3,
    time: 2,
    effect: "A miniboss projects a Scale:2 field in which airstrikes cannot target any space.",
  },
  {
    id: "anthropobythos",
    name: "Anthropobythic Enmity Imbuement",
    cost: 5,
    time: 2,
    effect:
      "A named miniboss resurrects at a ritual site, grows 10 HP each death, and steals a slain HELLPIERCER's kit.",
  },
  {
    id: "bureaucratic",
    name: "Bureaucratic Annihilation Aura",
    cost: 6,
    time: 3,
    limit: "game",
    effect: "Gain one additional STRATCOM action per phase.",
  },
  {
    id: "heretical",
    name: "Heretical Allegiances",
    cost: 7,
    time: 5,
    limit: "faction",
    effect: "Add a non-active faction's building, STRATCOM action and three units to this faction.",
  },
  {
    id: "syzygos_seduction",
    name: "Syzygos Seduction Ritual",
    cost: 11,
    time: 7,
    effect:
      "The faction captures Fallen Mars: its fortress is unassailable, Crown restrictions are waived, and it may assault DIS.",
  },
  {
    id: "boundary",
    name: "Boundary Shattering Reality Violence",
    cost: 15,
    time: 10,
    limit: "game",
    effect: "Destroy one of the faction's buildings and introduce a new faction into play.",
  },
];
