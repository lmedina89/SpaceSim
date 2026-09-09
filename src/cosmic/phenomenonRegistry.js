export class CosmicPhenomenonRegistry {
  constructor() {
    this.entries = new Map();
  }

  reset(definitions = []) {
    this.entries.clear();
    for (const definition of definitions) {
      if (!definition?.id) continue;
      this.entries.set(definition.id, Object.freeze({ ...definition }));
    }
  }

  get values() { return [...this.entries.values()]; }
  get size() { return this.entries.size; }
  get(id) { return this.entries.get(id) ?? null; }
  has(id) { return this.entries.has(id); }

  state(id, bodyLookup) {
    const phenomenon = this.get(id);
    if (!phenomenon) return null;
    const anchor = phenomenon.anchorBodyId ? bodyLookup?.(phenomenon.anchorBodyId) : null;
    const center = anchor
      ? new Float64Array(anchor.position)
      : new Float64Array(phenomenon.position ?? [0, 0, 0]);
    const velocity = anchor
      ? new Float64Array(anchor.velocity)
      : new Float64Array(phenomenon.velocity ?? [0, 0, 0]);
    return {
      ...phenomenon,
      center,
      velocity,
      radiusMeters: Number(phenomenon.radiusMeters ?? phenomenon.outerRadiusMeters ?? 1e9),
    };
  }
}
