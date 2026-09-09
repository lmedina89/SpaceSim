const EMPTY_COORD = 0x7fffffff;

function nextPowerOfTwo(value) {
  let n = 1;
  while (n < value) n <<= 1;
  return n;
}

function hashCell(x, y, z) {
  let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791);
  h ^= h >>> 16;
  return h >>> 0;
}

export class SpatialHashGrid {
  constructor(capacity = 1024) {
    this.resize(capacity);
    this.stamp = 1;
    this.cellSize = 1;
    this.origin = new Float64Array(3);
  }

  resize(capacity) {
    this.capacity = Math.max(1, Math.floor(capacity));
    this.tableSize = nextPowerOfTwo(Math.max(16, this.capacity * 4));
    this.mask = this.tableSize - 1;
    this.keyX = new Int32Array(this.tableSize);
    this.keyY = new Int32Array(this.tableSize);
    this.keyZ = new Int32Array(this.tableSize);
    this.head = new Int32Array(this.tableSize);
    this.slotStamp = new Uint32Array(this.tableSize);
    this.next = new Int32Array(this.capacity);
    this.cellCount = new Uint32Array(this.tableSize);
    this.speciesCount = new Uint32Array(this.tableSize * 3);
    this.particleCellX = new Int32Array(this.capacity);
    this.particleCellY = new Int32Array(this.capacity);
    this.particleCellZ = new Int32Array(this.capacity);
    this.head.fill(-1);
    this.next.fill(-1);
    this.keyX.fill(EMPTY_COORD);
    this.keyY.fill(EMPTY_COORD);
    this.keyZ.fill(EMPTY_COORD);
  }

  _beginBuild() {
    this.stamp = (this.stamp + 1) >>> 0;
    if (this.stamp === 0) {
      this.slotStamp.fill(0);
      this.stamp = 1;
    }
  }

  _findSlot(cx, cy, cz, create = false) {
    let slot = hashCell(cx, cy, cz) & this.mask;
    for (let probe = 0; probe < this.tableSize; probe += 1) {
      if (this.slotStamp[slot] !== this.stamp) {
        if (!create) return -1;
        this.slotStamp[slot] = this.stamp;
        this.keyX[slot] = cx;
        this.keyY[slot] = cy;
        this.keyZ[slot] = cz;
        this.head[slot] = -1;
        this.cellCount[slot] = 0;
        const sk = slot * 3; this.speciesCount[sk] = 0; this.speciesCount[sk + 1] = 0; this.speciesCount[sk + 2] = 0;
        return slot;
      }
      if (this.keyX[slot] === cx && this.keyY[slot] === cy && this.keyZ[slot] === cz) return slot;
      slot = (slot + 1) & this.mask;
    }
    return -1;
  }

  build(position, active, count, origin, cellSize, species = null) {
    if (count > this.capacity) this.resize(count);
    this._beginBuild();
    this.cellSize = Math.max(1e-6, Number(cellSize) || 1);
    this.origin[0] = origin[0]; this.origin[1] = origin[1]; this.origin[2] = origin[2];
    const inv = 1 / this.cellSize;
    for (let i = 0; i < count; i += 1) {
      this.next[i] = -1;
      if (active && active[i] === 0) continue;
      const k = i * 3;
      const cx = Math.floor((position[k] - origin[0]) * inv);
      const cy = Math.floor((position[k + 1] - origin[1]) * inv);
      const cz = Math.floor((position[k + 2] - origin[2]) * inv);
      this.particleCellX[i] = cx;
      this.particleCellY[i] = cy;
      this.particleCellZ[i] = cz;
      const slot = this._findSlot(cx, cy, cz, true);
      if (slot < 0) continue;
      this.next[i] = this.head[slot];
      this.head[slot] = i;
      this.cellCount[slot] += 1;
      if (species) this.speciesCount[slot * 3 + (species[i] % 3)] += 1;
    }
  }

  slotAt(cx, cy, cz) { return this._findSlot(cx, cy, cz, false); }

  headAt(cx, cy, cz) {
    const slot = this.slotAt(cx, cy, cz);
    return slot < 0 ? -1 : this.head[slot];
  }
}
