import { PHYSICS } from '../../core/constants.js';
import { createRng } from '../../util/prng.js';
import { SpatialHashGrid } from './spatialHashGrid.js';

const MAX_NEIGHBOR_ACCELERATION = 250;

const SPECIES_MATRIX = Object.freeze([
  [ 0.55, -0.85,  0.18],
  [ 0.72,  0.32, -0.92],
  [-0.42,  0.88,  0.46],
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomDirection(rng) {
  const z = rng.range(-1, 1);
  const a = rng.range(0, Math.PI * 2);
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return [Math.cos(a) * r, z, Math.sin(a) * r];
}

function normalize(v) {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function colorFor(mode, species = 0) {
  if (mode === 'life') return [0.52, 1.0, 0.70];
  if (mode === 'species') return [
    [0.35, 0.82, 1.0],
    [1.0, 0.46, 0.72],
    [1.0, 0.82, 0.32],
  ][species % 3];
  if (mode === 'gun') return [1.0, 0.76, 0.34];
  return [0.67, 0.84, 1.0];
}

export class ParticleExperiment {
  constructor(config) {
    this.id = config.id;
    this.seed = config.seed;
    this.mode = config.mode;
    this.label = config.label ?? config.mode;
    this.scientificStatus = config.scientificStatus ?? '';
    this.count = Math.max(1, Math.floor(config.count));
    this.capacity = this.count;
    this.radiusMeters = Math.max(100, Number(config.radiusMeters) || 1e7);
    this.neighborRadiusMeters = Math.max(100, Math.min(this.radiusMeters, Number(config.neighborRadiusMeters) || this.radiusMeters * 0.12));
    this.initialSpeedMps = Math.max(0, Number(config.initialSpeedMps) || 0);
    this.localStrengthMps2 = clamp(Number(config.localStrengthMps2) || 20, 0, MAX_NEIGHBOR_ACCELERATION);
    this.majorGravity = config.majorGravity !== false;
    this.requiresFineStep = this.mode === 'life' || this.mode === 'species';
    this.createdAtSimSeconds = config.createdAtSimSeconds ?? 0;
    this.elapsedSeconds = 0;
    this.ruleAccumulator = 0;
    this.ruleIntervalSeconds = 0.5;
    this.absorbedCount = 0;
    this.activeCountValue = 0;
    this.births = 0;
    this.deaths = 0;
    this.neighborChecks = 0;
    this.origin = new Float64Array(config.origin);
    this.baseVelocity = new Float64Array(config.baseVelocity ?? [0, 0, 0]);
    this.position = new Float64Array(this.capacity * 3);
    this.velocity = new Float64Array(this.capacity * 3);
    this.renderPosition = new Float32Array(this.capacity * 3);
    this.color = new Float32Array(this.capacity * 3);
    this.active = new Uint8Array(this.capacity);
    this.species = new Uint8Array(this.capacity);
    this.age = new Float32Array(this.capacity);
    this.grid = new SpatialHashGrid(this.capacity);
    this._initialize(config);
  }

  _initialize(config) {
    const rng = createRng(`${this.seed}:${this.id}:${this.mode}:${this.count}`);
    const gunForward = normalize(config.forward ?? [0, 0, -1]);
    const upRef = Math.abs(gunForward[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const gunRight = normalize(cross(gunForward, upRef));
    const gunUp = normalize(cross(gunRight, gunForward));
    const spreadRad = clamp(Number(config.spreadRad) || 0.12, 0, Math.PI * 0.48);
    const gunSpawnRadius = Math.max(10, Number(config.gunSpawnRadiusMeters) || 20_000);

    for (let i = 0; i < this.count; i += 1) {
      const k = i * 3;
      let offset;
      let direction;
      if (this.mode === 'gun') {
        const a = rng.range(0, Math.PI * 2);
        const rr = Math.sqrt(rng.random()) * gunSpawnRadius;
        offset = [gunRight[0] * Math.cos(a) * rr + gunUp[0] * Math.sin(a) * rr,
                  gunRight[1] * Math.cos(a) * rr + gunUp[1] * Math.sin(a) * rr,
                  gunRight[2] * Math.cos(a) * rr + gunUp[2] * Math.sin(a) * rr];
        const jitterA = rng.range(-spreadRad, spreadRad);
        const jitterB = rng.range(-spreadRad, spreadRad);
        direction = normalize([
          gunForward[0] + gunRight[0] * jitterA + gunUp[0] * jitterB,
          gunForward[1] + gunRight[1] * jitterA + gunUp[1] * jitterB,
          gunForward[2] + gunRight[2] * jitterA + gunUp[2] * jitterB,
        ]);
      } else {
        direction = randomDirection(rng);
        const rr = this.radiusMeters * Math.cbrt(rng.random());
        offset = [direction[0] * rr, direction[1] * rr, direction[2] * rr];
        direction = randomDirection(rng);
      }
      this.position[k] = this.origin[0] + offset[0];
      this.position[k + 1] = this.origin[1] + offset[1];
      this.position[k + 2] = this.origin[2] + offset[2];
      const speed = this.mode === 'gun' ? this.initialSpeedMps * rng.range(0.94, 1.06) : this.initialSpeedMps * rng.range(0.15, 1.0);
      this.velocity[k] = this.baseVelocity[0] + direction[0] * speed;
      this.velocity[k + 1] = this.baseVelocity[1] + direction[1] * speed;
      this.velocity[k + 2] = this.baseVelocity[2] + direction[2] * speed;
      const sp = this.mode === 'species' ? rng.int(0, 2) : 0;
      this.species[i] = sp;
      this.active[i] = this.mode === 'life' ? (rng.random() < 0.72 ? 1 : 0) : 1;
      this.activeCountValue += this.active[i] ? 1 : 0;
      const c = colorFor(this.mode, sp);
      this.color[k] = c[0]; this.color[k + 1] = c[1]; this.color[k + 2] = c[2];
    }
  }

  get activeCount() { return this.activeCountValue; }

  _majorGravityAndDrift(dt, gravitySources) {
    const p = this.position;
    const v = this.velocity;
    const active = this.active;
    const n = this.count;
    for (let i = 0; i < n; i += 1) {
      if (!active[i]) continue;
      const k = i * 3;
      let ax = 0, ay = 0, az = 0;
      if (this.majorGravity) {
        for (let s = 0; s < gravitySources.length; s += 1) {
          const source = gravitySources[s];
          const dx = source.position[0] - p[k];
          const dy = source.position[1] - p[k + 1];
          const dz = source.position[2] - p[k + 2];
          const r2 = dx * dx + dy * dy + dz * dz;
          const radius = Math.max(0, source.radius ?? 0);
          if (r2 <= radius * radius) {
            active[i] = 0;
            this.activeCountValue -= 1;
            this.absorbedCount += 1;
            ax = ay = az = 0;
            break;
          }
          const softenedR2 = r2 + 1;
          const invR = 1 / Math.sqrt(softenedR2);
          const scale = PHYSICS.G * source.mass * invR * invR * invR;
          ax += dx * scale; ay += dy * scale; az += dz * scale;
        }
      }
      if (!active[i]) continue;
      v[k] += ax * dt;
      v[k + 1] += ay * dt;
      v[k + 2] += az * dt;
      p[k] += v[k] * dt;
      p[k + 1] += v[k + 1] * dt;
      p[k + 2] += v[k + 2] * dt;
      this.age[i] += dt;
      if (this.mode === 'gun' && this.age[i] > 3600) { active[i] = 0; this.activeCountValue -= 1; }
    }
  }

  _applySpeciesForces(dt) {
    const cell = this.neighborRadiusMeters;
    this.grid.build(this.position, this.active, this.count, this.origin, cell, this.species);
    const p = this.position, v = this.velocity, active = this.active, species = this.species;
    const strength = this.localStrengthMps2;
    let aggregateInteractions = 0;
    for (let i = 0; i < this.count; i += 1) {
      if (!active[i]) continue;
      const k = i * 3;
      const cx = this.grid.particleCellX[i], cy = this.grid.particleCellY[i], cz = this.grid.particleCellZ[i];
      let ax = 0, ay = 0, az = 0;
      for (let ox = -1; ox <= 1; ox += 1) for (let oy = -1; oy <= 1; oy += 1) for (let oz = -1; oz <= 1; oz += 1) {
        const nx = cx + ox, ny = cy + oy, nz = cz + oz;
        const slot = this.grid.slotAt(nx, ny, nz);
        if (slot < 0) continue;
        const centerX = this.origin[0] + (nx + 0.5) * cell;
        const centerY = this.origin[1] + (ny + 0.5) * cell;
        const centerZ = this.origin[2] + (nz + 0.5) * cell;
        const dx = centerX - p[k], dy = centerY - p[k + 1], dz = centerZ - p[k + 2];
        const d = Math.max(cell * 0.22, Math.hypot(dx, dy, dz));
        const falloff = Math.max(0, 1 - d / (cell * 2.8));
        if (falloff <= 0) continue;
        const invD = 1 / d;
        for (let sp = 0; sp < 3; sp += 1) {
          let population = this.grid.speciesCount[slot * 3 + sp];
          if (nx === cx && ny === cy && nz === cz && sp === species[i]) population = Math.max(0, population - 1);
          if (!population) continue;
          aggregateInteractions += 1;
          const coeff = SPECIES_MATRIX[species[i]][sp];
          const weight = Math.sqrt(population);
          const a = coeff * strength * falloff * weight * invD;
          ax += dx * a; ay += dy * a; az += dz * a;
        }
      }
      const mag = Math.hypot(ax, ay, az);
      if (mag > MAX_NEIGHBOR_ACCELERATION) {
        const s = MAX_NEIGHBOR_ACCELERATION / mag;
        ax *= s; ay *= s; az *= s;
      }
      v[k] += ax * dt; v[k + 1] += ay * dt; v[k + 2] += az * dt;
      const drag = Math.exp(-0.018 * dt);
      v[k] *= drag; v[k + 1] *= drag; v[k + 2] *= drag;
    }
    this.neighborChecks = aggregateInteractions;
  }

  _applyLifeRules() {
    const cell = this.neighborRadiusMeters;
    this.grid.build(this.position, this.active, this.count, this.origin, cell);
    const p = this.position, active = this.active;
    const nextState = new Uint8Array(this.count);
    let births = 0, deaths = 0, aggregateChecks = 0;
    const inv = 1 / cell;
    for (let i = 0; i < this.count; i += 1) {
      const k = i * 3;
      const cx = active[i] ? this.grid.particleCellX[i] : Math.floor((p[k] - this.origin[0]) * inv);
      const cy = active[i] ? this.grid.particleCellY[i] : Math.floor((p[k + 1] - this.origin[1]) * inv);
      const cz = active[i] ? this.grid.particleCellZ[i] : Math.floor((p[k + 2] - this.origin[2]) * inv);
      let neighbors = 0;
      for (let ox = -1; ox <= 1; ox += 1) for (let oy = -1; oy <= 1; oy += 1) for (let oz = -1; oz <= 1; oz += 1) {
        const slot = this.grid.slotAt(cx + ox, cy + oy, cz + oz);
        if (slot < 0) continue;
        aggregateChecks += 1;
        neighbors += this.grid.cellCount[slot];
      }
      if (active[i]) neighbors = Math.max(0, neighbors - 1);
      if (active[i]) {
        nextState[i] = neighbors >= 2 && neighbors <= 10 ? 1 : 0;
        if (!nextState[i]) deaths += 1;
      } else if (neighbors >= 3 && neighbors <= 5) {
        nextState[i] = 1;
        births += 1;
      }
    }
    this.active.set(nextState);
    this.activeCountValue += births - deaths;
    this.births += births;
    this.deaths += deaths;
    this.neighborChecks = aggregateChecks;
  }

  step(dt, gravitySources) {
    const maxStep = this.requiresFineStep ? 1.0 : 3.0;
    let remaining = Math.max(0, dt);
    let substeps = 0;
    while (remaining > 1e-9 && substeps < 8) {
      const h = Math.min(maxStep, remaining);
      if (this.mode === 'species') this._applySpeciesForces(h);
      this._majorGravityAndDrift(h, gravitySources);
      if (this.mode === 'life') {
        this.ruleAccumulator += h;
        while (this.ruleAccumulator >= this.ruleIntervalSeconds) {
          this._applyLifeRules();
          this.ruleAccumulator -= this.ruleIntervalSeconds;
        }
      }
      this.elapsedSeconds += h;
      remaining -= h;
      substeps += 1;
    }
    return { simulatedSeconds: dt - remaining, droppedSeconds: remaining, substeps };
  }

  summary() {
    return {
      id: this.id,
      mode: this.mode,
      label: this.label,
      count: this.count,
      activeCount: this.activeCount,
      absorbedCount: this.absorbedCount,
      births: this.births,
      deaths: this.deaths,
      neighborChecks: this.neighborChecks,
      elapsedSeconds: this.elapsedSeconds,
      scientificStatus: this.scientificStatus,
    };
  }
}
