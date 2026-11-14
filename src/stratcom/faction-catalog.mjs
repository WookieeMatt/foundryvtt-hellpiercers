/**
 * Faction rules data (pp. 137-219): crowns, bosses, starting qualities, locations and upgrades.
 *
 * A faction's Qualities are the sum of the Quality its active locations contribute, plus a small
 * `adjust` that reconciles the printed starting values with the printed locations (the book's
 * Autophyes Subterfuge is 2 but its starting locations add up to 3).
 */

/**
 * Parse a compact quality string: "F2 T1" -> { force: 2, territory: 1 }.
 * F = Force, S = Subterfuge, T = Territory, A = Assets.
 * @param {string} text
 */
function q(text = "") {
  const keys = { F: "force", S: "subterfuge", T: "territory", A: "assets" };
  const out = { force: 0, subterfuge: 0, territory: 0, assets: 0 };
  for (const [, letter, n] of text.matchAll(/([FSTA])\s*(\d+)/g)) out[keys[letter]] += Number(n);
  return out;
}

/** @typedef {{ name: string, type: string, quality: ReturnType<typeof q>, buildTime: number, requires?: string, legendary?: boolean }} LocationDef */

/**
 * @param {string} name
 * @param {string} type
 * @param {string} quality
 * @param {number} [buildTime=0]  Build time in STRATCOM phases. 0 = starts the game built.
 * @param {string} [requires]     A prerequisite, as printed in the book.
 * @returns {LocationDef}
 */
function loc(name, type, quality, buildTime, requires) {
  return {
    name,
    type,
    quality: q(quality),
    buildTime: buildTime ?? 0,
    ...(requires ? { requires } : {}),
  };
}

/** @param {string} name @param {number} cost @param {string} [effect] @param {string} [requires] */
function up(name, cost, effect = "", requires = "") {
  return { name, cost, effect, requires };
}

/**
 * @typedef {object} FactionDef
 * @property {string} id
 * @property {string} name        The faction's name
 * @property {string} crown       The Crown sentence
 * @property {string} boss
 * @property {string} map         Matches the map image: "Map(<map>)"
 * @property {{ force: number, subterfuge: number, territory: number, assets: number } | null} start
 * @property {LocationDef[]} starting
 * @property {LocationDef[]} unique
 * @property {Array<{ name: string, cost: number, effect: string, requires: string }>} upgrades
 */

/** @type {FactionDef[]} */
export const FACTIONS = [
  {
    id: "syncrasis",
    name: "SYNCRASIS",
    crown: "CONQUER, DESTROY, RETVRN",
    boss: "Abigor, The Archo-Tyrannus",
    map: "Syncrasis",
    start: { force: 5, subterfuge: 2, territory: 3, assets: 2 },
    starting: [
      loc("Oraios's Vengeance", "destructive", "F2 T1"),
      loc("Lethian Tunnels", "extractive", "S1 A1"),
      loc("The Asphodeal Outposts", "defensive", "F2 T1"),
      loc("Cyclopean Ergastirion", "productive", "F1 A1"),
      loc("Thera's Temno", "logistical", "T1"),
      loc("Perceived 14th Layer Korphe", "legendary", "S1"),
    ],
    unique: [
      loc("Mt Ararat", "productive", "A1", 1),
      loc("Pelagoios", "logistical", "S2", 3, "Geographical Rot upgrade"),
      loc("The Hidden World", "legendary", "F1 T1", 2),
      loc("The Garden of Rancorous Edens", "destructive", "A1 S1", 3),
      loc("Pseudes-Sophia", "legendary", "A1 S1", 3),
    ],
    upgrades: [
      up("Triassic Hebdomian Ritual", 1, "Unlock ABIGOR as a deployable unit."),
      up(
        "Cariniferal Sigil Research",
        3,
        "Replace Abigor's first attack with the Obstacle-spawning boxes."
      ),
      up("Sidiria Lithourgia", 2, "Wall-Strider may devour adjacent Obstacles for Armor:1."),
      up("Sentience Granting Undermind Rite", 2, "Unlock the Howling Primordia unit."),
      up(
        "Anima-Hylic Synthesis Ritual",
        2,
        "Little Ghosts move through player characters and gain Swarm."
      ),
      up("Fleet Deployment Orders", 2, "Gain the Fleet Deployment STRATCOM action (battleships)."),
      up(
        "Geographical Rot",
        2,
        "Required for Pelagoios. The book does not define this upgrade: cost and effect are a placeholder."
      ),
    ],
  },
  {
    id: "henosis",
    name: "HENOSIS",
    crown: "BRING ALL UNDER THE YOKE OF AAMON'S SPORES",
    boss: "Aamon, The Rot Blossom",
    map: "Henosis",
    start: { force: 3, subterfuge: 3, territory: 5, assets: 2 },
    starting: [
      loc("Temple of Spore-Laden Breath", "legendary", "T2 F1"),
      loc("Ascent of the Night's Veil", "productive", "F2 A1"),
      loc("Steel-Sharpening Coliseum Annex", "defensive", "T1 S1"),
      loc("Hastily Converted Mills", "productive", "S2 T1"),
      loc("Underground Cultivation Complex", "productive", "A1 T1"),
    ],
    unique: [
      loc("Spore Farm", "productive", "T1", 1),
      loc("The Lashing Thorns", "destructive", "F1", 2),
      loc("Night's Veil", "destructive", "F1 S1", 3),
      loc("Necrophagic Facility", "productive", "A1", 2),
    ],
    upgrades: [
      up("Myconic Ascension", 1, "Unlock AAMON as a deployable unit."),
      up("Teknon Moks", 1, "Unlock the Teknon Moks (Birth-Cap) spawner."),
      up(
        "Total Subjectification",
        3,
        "Non-minion Henosis units adjacent to Swarms count as part of the Swarm."
      ),
      up("Rot Conflagrator", 2, "Unlock the Rot Conflagrator fortification."),
      up("Deathcap Meteor", 2, "The Reflector may raise the elevation of the unit it protects."),
      up("Spore Hub", 2, "Unlock the Spore Hub fortification."),
      up("Shatter The Sleeper's Chains", 2, "Unlock the Star Shooter for deployment."),
      up(
        "Sacrifice Most Regrettable",
        3,
        "The Petty Tyrant may redirect attacks onto weaker allies."
      ),
    ],
  },
  {
    id: "autophyes",
    name: "AUTOPHYES",
    crown: "CONSUME, EXPLOIT, RETAIN AT ALL COST",
    boss: "Haagenti, The Never-Sated",
    map: "Autophyes",
    start: { force: 2, subterfuge: 2, territory: 3, assets: 5 },
    starting: [
      loc("Omphalos", "legendary", "S1 A3"),
      loc("Mnemosyne Garden", "legendary", "A1"),
      loc("Ouroboric Manufactoria", "productive", "A1 F1"),
      loc("River of Nepenthe", "logistical", "T1"),
      loc("Drained Grail", "logistical", "F1 S1"),
      loc("March of Marasmos", "defensive", "T2 S1"),
    ],
    unique: [
      loc("The Nihilith", "logistical", "S1", 2),
      loc("Boneyard", "extractive", "F1", 1),
      loc("Crooked Obelisk", "defensive", "F1", 2),
      loc("Abyssal Exsanguinator", "extractive", "T1", 2),
      loc("Vault of Plenty", "legendary", "A1", 3),
    ],
    upgrades: [
      up("Depleted Uranium Claws", 2, "Extractor attacks +1 damage.", "Boneyard"),
      up("Burrowing Frenzy", 1, "Yearnlings can burrow.", "Boneyard"),
      up("Cerebrospinal Propellants", 2, "Unlock the Whaler minion."),
      up("Skinweaver Looms", 2, "Unlock the Singing Scythe minion."),
      up(
        "Hellblood Infusion Regimen",
        3,
        "Once per TACCOM, +3 Speed for 3 turns, then lose half starting health.",
        "Abyssal Exsanguinator"
      ),
      up(
        "Thanatological Punch Cards",
        2,
        "Minions dying near Bulwarks revive at full health.",
        "The Nihilith"
      ),
      up("Hematic Combustion", 3, "Unlock The Engine miniboss.", "Abyssal Exsanguinator"),
      up("ANATHEMATIC Condensers", 3, "Unlock the Crooked Obelisk and Nihilith locations."),
      up(
        "Apotheotic Avarice",
        5,
        "Place the Vault of Plenty location (GM gains 2 Ichor per turn)."
      ),
      up("Carcinogenic Defensive Upgrade", 1, "Unlock the Wireweal Outbreak STRATCOM action."),
    ],
  },
  {
    id: "mixis",
    name: "MIXIS",
    crown: "A NEW GNOSIS, A NEW WORLD",
    boss: "Obizu, The Leviathan Reborn",
    map: "Mixis",
    start: { force: 3, subterfuge: 4, territory: 2, assets: 3 },
    starting: [
      loc("Belias's Final Redoubt", "logistical", "F1 S1 T1"),
      loc("Eqwesh-AGE-2x10^22-1", "extractive", "T1 A1"),
      loc("The Mind of Peleset", "logistical", "S3"),
      loc("A-World-To-Come", "destructive", "F2 A2"),
    ],
    unique: [
      loc("The Memory Of The Shekelesh", "legendary", "F1 A1", 3),
      loc("Shardan-Elysium", "legendary", "S2", 1),
      loc("Echos of Tohu Wa-Bohu", "legendary", "T2 A1", 3),
      loc("Dor, the Egress Of Tjeker", "productive", "S1 T1", 2),
      loc("The Danunan Loom", "productive", "A2 F1", 3),
    ],
    upgrades: [
      up("Orphite Truth-Revealing Ritual", 1, "Unlock OBIZU as a unit."),
      up(
        "Gold-skinned Serpent Ascension",
        2,
        "Choros gains an appendage; its attacks inflict Poison:1."
      ),
      up("Oktapous Summoning Cista Mystica", 2, "Allows the deployment of She-Who-Eats."),
      up("Eight Limbed Tartarus-Rending Fist", 1, "Sekos's attack gains Blast:2."),
      up("Bull-Dragon Slaying Leviathan Secrets", 2, "OBIZU may Consume player units."),
      up(
        "Apocalyptic World-Soul Devouring Cataclysm Invocation",
        1,
        "Unlock the Awakened World-Choking Python action."
      ),
      up("Circles-In-Circles", 1, "Overlay another faction's map (Reality Bends Like A Snake)."),
    ],
  },
  {
    id: "metricos",
    name: "METRICOS",
    crown: "A PLACE FOR EVERY DEMON & EVERY DEMON IN ITS PLACE",
    boss: "Caim, The First Bloodied",
    map: "Metricos",
    start: { force: 3, subterfuge: 2, territory: 4, assets: 4 },
    starting: [
      loc("Dikasteria Sanguinis", "defensive", "F2 T1"),
      loc("Labyrinth", "legendary", "T3 F1"),
      loc("Thymosian Springs", "legendary", "A3 S1"),
      loc("Coagulatoreum", "defensive", "S1 A1"),
    ],
    unique: [
      loc("Roiling Hippodrome", "defensive", "A1", 2),
      loc("Pit of Kesterion", "productive", "F1", 3),
    ],
    upgrades: [
      up("Agile Certification", 2, "Swarms can move one square after taking damage."),
      up("Machinequus Breaking", 1, "Unlock the Apokrotos unit."),
      up(
        "Ignoble Indoctrination",
        1,
        "Non-Swarm Metricos units can grow, dealing and taking double damage."
      ),
      up("Rite of Command", 2, "Unlock the Ixodes unit."),
      up("Bloodcharge Efficiency", 1, "Bloodshield Phalanx base scale +1."),
      up(
        "Demignostic Rites",
        3,
        "Unlock the Pit of Kesterion location and the Rising Echo action."
      ),
    ],
  },
  {
    id: "paracletus",
    name: "PARACLETUS",
    crown: "REMAKE THE STRANGE INTO SOMETHING FAMILIAR",
    boss: "Orobas, The Speaker",
    map: "Paracletus",
    start: { force: 2, subterfuge: 2, territory: 5, assets: 2 },
    starting: [
      loc("Stain Springs", "defensive", "S2 T1"),
      loc("Ekhinos Field", "logistical", "F1 T1"),
      loc("Vandalous Nimbus", "logistical", "F1 T2"),
      loc("Stygian Reef", "defensive", "A2 T1"),
    ],
    unique: [
      loc("The Teethlands", "destructive", "F1", 2),
      loc("Brightwater Runs", "productive", "T1", 1),
      loc("Fleshturn Vaults", "productive", "T1", 2),
    ],
    upgrades: [
      up("Living Tide", 2, "Stained squares can move like a Swarm (Speed 4)."),
      up("Extrarterran Evolution", 3, "Unlock Potagon and Chalazaor for deployment."),
      up("Efficient Building", 2, "Latent Pudding can transform on any square."),
      up("Storm Mastery", 3, "One additional Seideonic cloud per location."),
      up("Interatomic Dowsing", 2, "Stain Geyser draws a 6x6 square."),
    ],
  },
  {
    id: "theletus",
    name: "THELETUS",
    crown: "The Great Sleep must not come",
    boss: "Amdusias, The Reluctant Slumberer",
    map: "Theletus",
    start: { force: 5, subterfuge: 2, territory: 3, assets: 3 },
    starting: [
      loc("The Slumberer's Bedchambers", "logistical", "T1 F2"),
      loc("The Dreamthief's Tundra", "productive", "S2 A1"),
      loc("Razing Crags", "defensive", "T2 F1"),
      loc("Tithing Storehouses", "logistical", "A2"),
      loc("Somnic Enforcer", "destructive", "F2"),
    ],
    unique: [
      loc("The Bracing Pools", "defensive", "F1", 1),
      loc("The Clangorous Abbey", "productive", "S1", 2),
      loc("Slumbering Barrows", "defensive", "T1", 3),
      loc("The Railing Grounds", "defensive", "F1", 1),
    ],
    upgrades: [
      up("Night Must Not Come", 1, "Unlock AMDUSIAS."),
      up("The Children Awaken Anew", 1, "Unlock the Myoclonic Awakening Chamber."),
      up("Lord of the Unnavigable Pass", 2, "Unlock the Megas unit."),
      up(
        "Tender Fruit Finally Born",
        3,
        "Unlock The Perfected Scream STRATCOM action.",
        "The Clangorous Abbey and The Railing Grounds"
      ),
      up("Singing Nexus", 2, "Unlock the Singing Nexus fortification."),
      up("Bell of Awakening", 2, "Unlock the Bell of Awakening fortification."),
      up("Explosive Momentum", 2, "The Ice-Glider gains +1 damage per Shatter this round."),
      up(
        "Sanguine Gluttony",
        1,
        "The Ice-In-The-Veins gains a Pull attack against Bleeding enemies."
      ),
    ],
  },
  {
    id: "ekklesia",
    name: "EKKLESIA",
    crown: "Bannerless princelings starved of power and prestige",
    boss: "Morax, Of the Broken Horn",
    map: "",
    start: null,
    starting: [],
    unique: [
      loc("The Molten Gold Castle", "defensive", "T1", 2),
      loc("Ruined Babel", "legendary", "A2", 3),
      loc("Tooth-Lined Road Of The Golden Path", "logistical", "F1", 1),
      loc("Dream Devouring Leviathan Pit", "productive", "T1", 1),
      loc("Akkadia-Babylon", "defensive", "S1 A1", 3),
    ],
    upgrades: [],
  },
];

export const FACTIONS_BY_ID = Object.freeze(Object.fromEntries(FACTIONS.map(f => [f.id, f])));

export const QUALITY_KEYS = Object.freeze(["force", "subterfuge", "territory", "assets"]);
export const MAX_QUALITY = 5;
export const MAX_CROWN = 5;
