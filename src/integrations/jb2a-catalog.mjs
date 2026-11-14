/**
 * JB2A animation catalog.
 *
 * Every effect lists candidate Sequencer database paths in order of preference. The Premium
 * (Patreon) library has many more colours than the Free one, so the best candidates come first and
 * the Free-library paths close each list; the resolver picks the first path that exists in the
 * library the table has installed (or that the GM selected). Paths are `jb2a.` database keys.
 *
 * This file has no Foundry dependencies so it can be checked against the JB2A databases from Node.
 */

/** Damage "elements" the effects are themed by. */
export const ELEMENTS = ["physical", "fire", "cold", "shock", "poison", "blood", "void"];

/**
 * Status Effects to the element that themes their animation.
 * Anything else falls back to physical.
 */
export const STATUS_ELEMENT = Object.freeze({
  blazing: "fire",
  brand: "fire",
  frozen: "cold",
  slow: "cold",
  shock: "shock",
  magnetic: "shock",
  poison: "poison",
  bleed: "blood",
  wound: "blood",
  wrack: "void",
  compel: "void",
  shaded: "void",
});

/** Melee swings, themed. */
export const MELEE = {
  physical: [
    "jb2a.melee_generic.slash.02.001.orange",
    "jb2a.melee_generic.slash.01.orange",
    "jb2a.sword.melee.01.white",
    "jb2a.unarmed_strike.physical.01",
  ],
  fire: [
    "jb2a.sword.melee.fire",
    "jb2a.melee_generic.slash.01.orange",
    "jb2a.sword.melee.01.white",
  ],
  cold: [
    "jb2a.melee_generic.slash.02.001.blue",
    "jb2a.sword.melee.01.blue",
    "jb2a.melee_generic.slash.02.001.orange",
  ],
  shock: [
    "jb2a.sword.melee.01.yellow",
    "jb2a.melee_generic.slash.01.greenyellow",
    "jb2a.melee_generic.slash.02.001.blue",
    "jb2a.melee_generic.slash.02.001.orange",
  ],
  poison: [
    "jb2a.melee_generic.slash.01.greenyellow",
    "jb2a.sword.melee.01.white",
    "jb2a.melee_generic.slash.01.orange",
  ],
  blood: [
    "jb2a.melee_generic.slash.02.001.orange",
    "jb2a.melee_generic.creature_attack.claw.001.red",
    "jb2a.melee_generic.slash.01.orange",
  ],
  void: [
    "jb2a.melee_generic.slash.02.001.purple",
    "jb2a.sword.melee.01.purple",
    "jb2a.melee_generic.slash.02.001.blue",
  ],
};

/** Single-target ranged attacks: stretched from the attacker to the target. */
export const RANGED = {
  physical: ["jb2a.bullet.01.red", "jb2a.bullet.01.orange", "jb2a.bullet.02.orange"],
  fire: ["jb2a.fire_bolt.dark_red", "jb2a.fire_bolt.orange"],
  cold: ["jb2a.bolt.cold.blue", "jb2a.energy_beam.normal.blue.01", "jb2a.bullet.03.blue"],
  shock: ["jb2a.chain_lightning.primary.orange", "jb2a.chain_lightning.primary.blue"],
  poison: [
    "jb2a.bolt.poison.green",
    "jb2a.arrow.poison.green.01",
    "jb2a.bullet.01.green",
    "jb2a.bullet.01.orange",
  ],
  blood: ["jb2a.bullet.01.red", "jb2a.fire_bolt.dark_red", "jb2a.bullet.01.orange"],
  void: [
    "jb2a.eldritch_blast.dark_purple",
    "jb2a.eldritch_blast.purple",
    "jb2a.magic_missile.purple.30ft",
  ],
};

/** Beams for Line, Arc and Charge attacks. */
export const BEAM = {
  physical: ["jb2a.lasershot.red", "jb2a.energy_beam.normal.blue.01"],
  fire: ["jb2a.fireball.beam.dark_red", "jb2a.fireball.beam.orange", "jb2a.lasershot.orange"],
  cold: ["jb2a.energy_beam.normal.blue.01", "jb2a.lasershot.blue"],
  shock: ["jb2a.chain_lightning.primary.orange", "jb2a.chain_lightning.primary.blue"],
  poison: [
    "jb2a.lasershot.green",
    "jb2a.energy_beam.normal.dark_green.01",
    "jb2a.energy_beam.normal.blue.01",
  ],
  blood: ["jb2a.lasershot.red", "jb2a.fireball.beam.dark_red", "jb2a.energy_beam.normal.blue.01"],
  void: [
    "jb2a.eldritch_blast.dark_purple",
    "jb2a.eldritch_blast.purple",
    "jb2a.energy_beam.normal.blue.01",
  ],
};

/** Cones. */
export const CONE = {
  default: ["jb2a.burning_hands.01", "jb2a.burning_hands.02"],
};

/** Area bursts centred on a target. */
export const BURST = {
  physical: ["jb2a.explosion.01", "jb2a.explosion.02"],
  fire: ["jb2a.explosion.01", "jb2a.fireball.explosion", "jb2a.explosion.02"],
  cold: ["jb2a.ice_spikes.radial.burst", "jb2a.explosion.03"],
  shock: ["jb2a.static_electricity.01", "jb2a.explosion.03", "jb2a.explosion.01"],
  poison: ["jb2a.smoke.puff.centered.dark_green", "jb2a.explosion.02", "jb2a.explosion.01"],
  blood: ["jb2a.explosion.shrapnel.bomb.01", "jb2a.explosion.01"],
  void: ["jb2a.particle_burst.01.circle", "jb2a.explosion.03", "jb2a.explosion.01"],
};

/** The hit that lands on a target when damage is applied. */
export const IMPACT = {
  physical: ["jb2a.impact.001", "jb2a.impact.002", "jb2a.impact.003"],
  fire: ["jb2a.impact.004", "jb2a.impact.001"],
  cold: ["jb2a.side_impact.ice_shard", "jb2a.impact.005", "jb2a.impact.001"],
  shock: ["jb2a.static_electricity.02", "jb2a.impact.006", "jb2a.impact.001"],
  poison: [
    "jb2a.smoke.puff.centered.dark_green",
    "jb2a.smoke.puff.centered.grey",
    "jb2a.impact.001",
  ],
  blood: ["jb2a.impact.007", "jb2a.impact.002", "jb2a.impact.001"],
  void: ["jb2a.impact.009", "jb2a.particle_burst.01.circle", "jb2a.impact.001"],
};

/** One-off effects on a single token. */
export const SINGLE = {
  heal: ["jb2a.healing_generic.burst", "jb2a.healing_generic.03.burst", "jb2a.cure_wounds.400px"],
  rez: ["jb2a.cure_wounds.400px", "jb2a.healing_generic.400px", "jb2a.healing_generic.burst"],
  defeat: [
    "jb2a.smoke.puff.centered.dark_black",
    "jb2a.smoke.puff.centered.grey",
    "jb2a.explosion.01",
  ],
  provoke: ["jb2a.melee_generic.slash.02.001.orange", "jb2a.melee_generic.slash.01.orange"],
  limit: ["jb2a.token_border.circle.spinning.orange", "jb2a.token_border.circle.spinning.blue"],
  agnosia: ["jb2a.explosion.02", "jb2a.explosion.01"],
  teleport: ["jb2a.misty_step.01", "jb2a.teleport.01"],
  burst: ["jb2a.explosion.01"],
};

/**
 * Status Effect animations. `on` plays once when the Effect is applied; `loop` stays on the token
 * until the Effect ends.
 */
export const STATUS = {
  aegis: { loop: ["jb2a.token_border.circle.static.blue"], on: ["jb2a.misty_step.01"] },
  aggression: {
    loop: [
      "jb2a.token_border.circle.static.dark_red",
      "jb2a.token_border.circle.static.orange",
      "jb2a.token_border.circle.static.blue",
    ],
  },
  armor: { on: ["jb2a.shield.01.intro"], loop: ["jb2a.shield.01.loop"] },
  blazing: { loop: ["jb2a.flames.orange", "jb2a.flames.01"], on: ["jb2a.explosion.01"] },
  bleed: { on: ["jb2a.impact.007", "jb2a.impact.002"] },
  bound: { on: ["jb2a.energy_strands.in.green.01", "jb2a.entangle.02.complete.02"] },
  brand: { loop: ["jb2a.flames.orange", "jb2a.flames.01"] },
  compel: { on: ["jb2a.energy_strands.overlay.blue", "jb2a.particle_burst.01.rune"] },
  countdown: {
    loop: ["jb2a.token_border.circle.spinning.orange", "jb2a.token_border.circle.spinning.blue"],
  },
  enrage: {
    loop: [
      "jb2a.token_border.circle.static.dark_red",
      "jb2a.token_border.circle.static.orange",
      "jb2a.token_border.circle.static.blue",
    ],
  },
  fortified: { on: ["jb2a.shield.01.intro"], loop: ["jb2a.shield.01.loop"] },
  frozen: { loop: ["jb2a.ice_spikes.radial.loop"], on: ["jb2a.ice_spikes.radial.burst"] },
  haste: { on: ["jb2a.smoke.puff.ring.01.white", "jb2a.misty_step.02"] },
  healing: { loop: ["jb2a.healing_generic.loop"], on: ["jb2a.healing_generic.burst"] },
  pain_aura: {
    loop: ["jb2a.token_border.circle.spinning.orange", "jb2a.token_border.circle.spinning.blue"],
  },
  pin: { on: ["jb2a.entangle.02.complete.02", "jb2a.energy_strands.in.green.01"] },
  poison: { on: ["jb2a.smoke.puff.centered.dark_green", "jb2a.smoke.puff.centered.grey"] },
  shaded: { on: ["jb2a.smoke.puff.centered.dark_black", "jb2a.smoke.puff.centered.grey"] },
  shock: {
    on: ["jb2a.static_electricity.01"],
    loop: ["jb2a.static_electricity.03", "jb2a.static_electricity.02"],
  },
  transference: { on: ["jb2a.energy_strands.in.green.01", "jb2a.healing_generic.burst"] },
  wrack: { on: ["jb2a.particle_burst.01.circle", "jb2a.explosion.01"] },
};

/** Every candidate path in the catalog (for verification scripts). */
export function allPaths() {
  const out = new Set();
  const take = list => {
    for (const p of list) out.add(p);
  };
  for (const group of [MELEE, RANGED, BEAM, CONE, BURST, IMPACT, SINGLE]) {
    for (const list of Object.values(group)) take(list);
  }
  for (const entry of Object.values(STATUS)) {
    take(entry.on ?? []);
    take(entry.loop ?? []);
  }
  return [...out];
}
