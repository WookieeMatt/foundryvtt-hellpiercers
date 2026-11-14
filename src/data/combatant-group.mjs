const fields = foundry.data.fields;

export class SwarmModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["HELLPIERCERS.ACTOR"];
  static defineSchema() {
    return {
      health: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 0 }),
      }),
    };
  }

  /**
   * Add new members to the swarm and increase the hp accordingly
   * @param {foundry.canvas.placeables.Token[]} tokens
   * @returns The tokens that were added to the swarm
   */
  async addMembers(tokens) {
    const additions = tokens.filter(
      t => t.actor.type === "minion" && t.actor.system.tags.has("Horde") && t.combatant
    );
    const newHp = this.health.value + additions.length * 10;
    // /** @type {foundry.documents.Combat} */
    // const combat = this.parent.parent
    for (const token of additions) {
      await token.combatant?.update({ group: this.parent });
    }
    await this.parent.update({ "system.health.value": newHp });
    return additions;
  }

  /**
   * Remove a member from the swarm
   * @param {foundry.canvas.placeables.Token[]} tokens
   * @returns The tokens that were removed from the swarm
   */
  async removeMembers(tokens) {
    const removals = tokens.filter(
      t => t.actor.type === "minion" && t.actor.system.tags.has("Horde")
    );
    const newHp = this.health.value - this.getUnitHealth().value * removals.length;
    for (const token of removals) {
      await token.combatant.update({ group: null });
    }
    await this.parent.update({ "system.health.value": newHp });
    return removals;
  }

  /**
   * Divide the swarm's tokens based on adjacency
   * @returns An array of sets of adjacent tokens
   */
  partition() {
    const parts = [];
    for (const token of this.parent.members.map(m => m.token.object)) {
      if (parts.some(p => p.has(token))) continue;
      parts.push(ffill(token, t => this.parent.members.has(t.combatant)));
    }
    return parts;
  }

  /**
   * Split the this swarm into multiple swarms based on adjacency
   */
  async break() {
    /** @type {foundry.documents.Combat} */
    const combat = this.parent.parent;
    const parts = this.partition();
    const hp = this.health.value;
    const size = this.size;
    const updates = [];
    /** @type {foundry.documents.CombatantGroup[]} */
    const groups = [];
    for (const part of parts) {
      if (part.size === 1) {
        for (const token of part) updates.push({ _id: token.combatant._id, group: null });
        continue;
      }
      const pct = part.size / size;
      /** @type {foundry["documents"]["CombatantGroup"]} */
      const cls = getDocumentClass("CombatantGroup");
      /** @type {foundry.documents.CombatantGroup} */
      const group = groups.includes(this.parent)
        ? await cls.create(
            { type: "swarm", "system.health.value": Math.floor(pct * hp) },
            { parent: combat }
          )
        : this.parent;
      if (group === this.parent)
        await this.parent.update({ "system.health.value": Math.floor(pct * hp) });
      groups.push(group);
      for (const token of part) updates.push({ _id: token.combatant._id, group });
    }
    await combat.updateEmbeddedDocuments("Combatant", updates);
    return groups;
  }

  /**
   * Add the members of the other combatant group to this one and delete the other.
   * @param {foundry.documents.CombatantGroup} other
   */
  async merge(other) {
    if (other.type !== "swarm") throw new TypeError("other must be a swarm");
    /** @type {foundry.documents.Combat} */
    const combat = this.parent.parent;
    const updates = [];
    for (const combatant of other.members) {
      updates.push({ _id: combatant._id, group: this.parent });
    }
    await combat.updateEmbeddedDocuments("Combatant", updates);
    await this.parent.update({
      "system.health.value": this.health.value + other.system.health.value,
    });
    await other.delete();
    return this;
  }

  prepareBaseData() {
    Object.defineProperty(this.health, "max", { get: () => this.size * 10 });
  }

  /** @returns {number} */
  get size() {
    return this.parent.members?.size ?? 0;
  }

  _onUpdate(changed, options) {
    for (const c of this.parent.members ?? []) c.token?._onRelatedUpdate(changed, options);
  }

  async _preDelete() {
    const updates = [];
    for (const c of this.parent.members ?? []) {
      updates.push({ _id: c.id, group: null });
    }
    await this.parent.parent.updateEmbeddedDocuments("Combatant", updates);
  }

  /**
   * Get the health value for an individual member of this horde
   */
  getUnitHealth() {
    return { value: Math.floor(this.health.value / this.size), max: 10 };
  }
}

/**
 * Flood fill to find connected scale 1 tokens
 * @param {foundry.canvas.placeables.Token} token  The basis token for the partition.
 * @param {(token: foundry.canvas.placeables.Token) => boolean} cond  Condition to add the token to the partition.
 */
export function ffill(token, cond = () => true) {
  const partition = new Set([token]);
  const stack = [token];
  const { sizeX, sizeY } = canvas.grid;
  while (stack.length > 0) {
    const token = stack.pop();
    const rect_v = new PIXI.Rectangle(
      token.bounds.left + sizeX / 2,
      token.bounds.top - sizeY / 2,
      token.bounds.width - sizeX,
      token.bounds.height + sizeY
    );
    const rect_h = new PIXI.Rectangle(
      token.bounds.left - sizeX / 2,
      token.bounds.top + sizeY / 2,
      token.bounds.width + sizeX,
      token.bounds.height - sizeY
    );
    for (const rect of [rect_v, rect_h]) {
      const neighbors = canvas.tokens.quadtree.getObjects(rect, {
        /** @param {{t: foundry.canvas.placeables.Token}} o */
        collisionTest: ({ t: token }) => cond(token),
      });
      for (const v of neighbors) {
        if (!partition.has(v)) {
          stack.push(v);
          partition.add(v);
        }
      }
    }
  }
  return partition;
}
