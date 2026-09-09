export class ExperimentRegistry {
  constructor() { this._experiments = new Map(); }
  register(definition) {
    if (!definition?.id || typeof definition.run !== 'function') throw new Error('Experiment requires id and run().');
    this._experiments.set(definition.id, definition);
  }
  get(id) { return this._experiments.get(id) ?? null; }
  list() { return [...this._experiments.values()].map(({ id, name, scientificStatus }) => ({ id, name, scientificStatus })); }
  run(id, context, params = {}) {
    const exp = this.get(id);
    if (!exp) throw new Error(`Unknown experiment: ${id}`);
    return exp.run(context, params);
  }
}
