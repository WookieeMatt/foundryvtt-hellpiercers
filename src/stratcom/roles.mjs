/**
 * Role actions (pp. 122-127).
 *
 * Each Role adds STRATCOM actions and RECON moves. `cost.any` is paid with one resource type of
 * the player's choice; `options` lists variants that each have their own cost. Descriptions are
 * condensed from the book.
 *
 * @typedef {object} RoleAction
 * @property {string} id
 * @property {string} name
 * @property {"stratcom" | "recon"} phase
 * @property {Record<string, number>} [cost]
 * @property {Array<{ name: string, cost: Record<string, number> }>} [options]
 * @property {string} text
 */

/** @type {Record<string, RoleAction[]>} */
export const ROLE_ACTIONS = {
  skopos: [
    {
      id: "tulpic",
      name: "Tulpic Observation Projection",
      phase: "stratcom",
      cost: { any: 2 },
      text: "Select a landmark on the last map you visited, then two more to draw a triangle. Any GM STRATCOM action that passes through or happens inside the triangle must be announced, with no detail. You may remove your spy to read the exact War Journal entry, which erases the triangle.",
    },
    {
      id: "veil_rending",
      name: "Veil-Rending Reality Realignment",
      phase: "stratcom",
      cost: { any: 4 },
      text: "Write down two locations. The next convoy to arrive at one of them actually arrives at the other. Only one pair is active at a time; reassign at the start of any STRATCOM phase for 4 more.",
    },
    {
      id: "mellonsophia",
      name: "Stratiotici Mellonsophia Manipulation Ritual",
      phase: "recon",
      text: "Name three NPCs, two important objects and one ending. At any point during the current mission you may declare that any one of the six presents itself to the party.",
    },
    {
      id: "asset_heuristics",
      name: "Crystalline-Fortified Asset Heuristics",
      phase: "recon",
      text: "When you receive this role, choose an enemy faction. Once per mission, point to a location on the STRATCOM map and ask the GM 3 questions about its current situation. You may burn 2 questions to appear there as a psionic projection for about a minute.",
    },
  ],
  mensor: [
    {
      id: "ogdoad",
      name: "Ogdoad Replication//Emulation",
      phase: "stratcom",
      options: [
        { name: "Empheryn Nanodrone Control Center", cost: { hellsteel: 3 } },
        { name: "18-Hands Material Annihilation Sacrament", cost: { soulfire: 3 } },
        { name: "Vertex-Coil Emergency Ephodia Distribution System", cost: { brimstone: 3 } },
      ],
      text: "Point to a place you stopped on the map outside of Locations and place one of: an Empheryn Nanodrone Control Center (generates 1 Fuel and 1 Soulfire whenever visited); an 18-Hands Material Annihilation Sacrament (when visited, destroy it to open a one-time tunnel to another location); a Vertex-Coil Emergency Ephodia Distribution System (choose 4 numbered points; leaving one, roll a D4, and on a match restock as if you had returned to DIS).",
    },
    {
      id: "inventory",
      name: "Preemptive Inventory Supplementation",
      phase: "recon",
      text: "Before leaving DIS select two single-use items: Charonic Healing Salve (full HP; an ally also ignores the next damage), Portable Reality Crushing Matrix (a portal to a visited location, or six connected Void tiles in TACCOM), Terrain-Adaptive Restriction Embargo (destroy a Hazard), Hardlight Skyway Generating Xenoglossia (halve travel time, or a 3-wide bridge in TACCOM). Usable in any phase; refreshed only by returning to DIS.",
    },
    {
      id: "angelhound",
      name: "Angelhound Squire",
      phase: "recon",
      text: "Once per STRATCOM, a machine of Angelic Metals carrying a Nephilic Seed matures it into a Legendary Arm of your choice. It withers after one combat encounter.",
    },
  ],
  chresto: [
    {
      id: "exorcism",
      name: "Magnificent Exorcism",
      phase: "stratcom",
      text: "On a conquered location build a Pneuma Fortifying Gnostic Beacon: Consecrated Ground at Ascendance 1 (HELLPIERCERS begin TACCOM with Aegis:1 or Haste:1). Using this on a location with a Beacon raises its tier: 2 = buildings can't be demolished or demons can't hide; 3 = between three or more Beacons, demons can't build, fortify or create map hazards, or HELLPIERCERS can't die within the border.",
    },
    {
      id: "dominion",
      name: "Complete Dominion",
      phase: "stratcom",
      text: "After defeating a faction, co-opt their final fortress. Answer: what defenses did you keep, what is it called now, its biggest weakness, how do you decorate, who wants it back. Choose three tags from: Mobile, Underground, Aerial, Aquatic, Weaponized, Hidden, Overt, Ornate, Vulgar, Haunted, Living, Inaccessible, Scry-Proof, Labyrinthine, Leyline-Nexus, Non-Hylic Metamaterials. Visiting it counts as returning to DIS.",
    },
    {
      id: "geometrization",
      name: "Geometrization",
      phase: "recon",
      text: "When delving into the Catacombs below DIS, consult your map and rearrange its layout however you see fit.",
    },
    {
      id: "soul_triage",
      name: "Emergency Soul Triage",
      phase: "recon",
      text: "Restore a human soul to its divine form and ask the GM two questions from: What happened here? What are they planning? What should we be on the lookout for? Who's in charge? What's the twist? They must answer honestly.",
    },
  ],
  mahemikos: [
    {
      id: "bargaining",
      name: "Collective Bargaining",
      phase: "stratcom",
      options: [
        { name: "Rampaging Tyrant Slayers", cost: { hellsteel: 2 } },
        { name: "Dragon-Minded Free Hellions", cost: { soulfire: 2 } },
        { name: "The Vengeful Unquiet", cost: { brimstone: 2 } },
      ],
      text: "Select a friendly structure and spawn a unit. Rampaging Tyrant Slayers move to the nearest enemy location or convoy, give its faction -1 Force and stop a convoy from moving while attached, then retreat the next phase. Dragon-Minded Free Hellions are a growing community with 3 Growth Boxes: each phase fill one to give the faction a leader, miniboss or minion, or make it friendly to humans. The Vengeful Unquiet let you demand a War Journal page or active project at the location and remove one progress mark or decoy convoy.",
    },
    {
      id: "martyrs",
      name: "Rising Blood Of Twenty Billion Martyred Divines",
      phase: "recon",
      text: "Whenever you revisit a location, gain 2 Charges. At any time you may declare that you sabotaged a piece of equipment, machine, ritual or process there on a previous visit: spend 1 Charge and say how, and what happens next.",
    },
    {
      id: "activation_phrase",
      name: "Mind-Liberating Pseudo-Ascending Activation Phrase",
      phase: "recon",
      text: "Before leaving DIS, mark a location and write down a minion or miniboss type. In TACCOM there, a Support Action declares one such unit a Traitor: it switches sides, and is cooperative afterwards. Name it and give it a goal.",
    },
  ],
};
