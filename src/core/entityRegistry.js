export class EntityRegistry {
  constructor() {
    this._nextId = 1;
    this._entities = new Map();
    this._list = [];
  }

  create(definition) {
    const id = definition.id ?? `entity-${this._nextId++}`;
    if (this._entities.has(id)) throw new Error(`Duplicate entity id: ${id}`);
    const entity = { ...definition, id };
    this._entities.set(id, entity);
    this._list.push(entity);
    const match = /^entity-(\d+)$/.exec(id);
    if (match) this._nextId = Math.max(this._nextId, Number(match[1]) + 1);
    return entity;
  }

  get(id) { return this._entities.get(id) ?? null; }
  has(id) { return this._entities.has(id); }
  delete(id) {
    const entity = this._entities.get(id);
    if (!entity) return false;
    this._entities.delete(id);
    const index = this._list.indexOf(entity);
    if (index >= 0) this._list.splice(index, 1);
    return true;
  }
  clear() { this._entities.clear(); this._list.length = 0; this._nextId = 1; }
  values() { return this._list; }
  filter(predicate) { return this._list.filter(predicate); }
  get size() { return this._list.length; }
}
