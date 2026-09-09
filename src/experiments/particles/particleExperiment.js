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
    this.lifecycle = 'active';
    this.completedAtSeconds = null;
    this.peakActiveCount = 0;
    this.lastLiveObservation = null;
    this.initialConfig = { ...config, origin: [...config.origin], baseVelocity: [...(config.baseVelocity ?? [0,0,0])], forward: config.forward ? [...config.forward] : undefined };
    this._initialize(config);
    this.peakActiveCount = this.activeCountValue;
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
  get isComplete() { return this.lifecycle === 'complete'; }

  markComplete() {
    if (this.lifecycle === 'complete') return false;
    this.lifecycle = 'complete';
    this.completedAtSeconds = this.elapsedSeconds;
    return true;
  }

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
    if (this.isComplete) return { simulatedSeconds: 0, droppedSeconds: 0, substeps: 0, completed: true };
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
      this.peakActiveCount = Math.max(this.peakActiveCount, this.activeCountValue);
      remaining -= h;
      substeps += 1;
      if (this.activeCountValue <= 0) { this.markComplete(); remaining = 0; break; }
    }
    return { simulatedSeconds: dt - remaining, droppedSeconds: remaining, substeps, completed: this.isComplete };
  }

  observationState(sampleLimit = 30_000) {
    const active = this.active;
    const position = this.position;
    const velocity = this.velocity;
    const stride = Math.max(1, Math.ceil(this.count / Math.max(1, sampleLimit)));
    let samples = 0;
    let cx = 0, cy = 0, cz = 0;
    let vx = 0, vy = 0, vz = 0;
    for (let i = 0; i < this.count; i += stride) {
      if (!active[i]) continue;
      const k = i * 3;
      cx += position[k]; cy += position[k + 1]; cz += position[k + 2];
      vx += velocity[k]; vy += velocity[k + 1]; vz += velocity[k + 2];
      samples += 1;
    }
    if (!samples) {
      if (this.lastLiveObservation) {
        return { ...this.lastLiveObservation, activeCount: 0, elapsedSeconds: this.elapsedSeconds, lifecycle: this.lifecycle, completedAtSeconds: this.completedAtSeconds };
      }
      // A field may go extinct before the observation camera ever samples it. In that case the
      // particle slots still retain their last finite death/absorption positions, which are a much
      // more useful final-frame record than snapping the camera back to the original spawn point.
      let finalSamples = 0, fx = 0, fy = 0, fz = 0, fvx = 0, fvy = 0, fvz = 0;
      for (let i = 0; i < this.count; i += stride) {
        const k = i * 3;
        if (![position[k], position[k+1], position[k+2]].every(Number.isFinite)) continue;
        fx += position[k]; fy += position[k+1]; fz += position[k+2];
        fvx += velocity[k]; fvy += velocity[k+1]; fvz += velocity[k+2]; finalSamples += 1;
      }
      if (finalSamples) {
        fx /= finalSamples; fy /= finalSamples; fz /= finalSamples; fvx /= finalSamples; fvy /= finalSamples; fvz /= finalSamples;
        let finalR2 = 0;
        for (let i = 0; i < this.count; i += stride) {
          const k = i * 3;
          if (![position[k], position[k+1], position[k+2]].every(Number.isFinite)) continue;
          const dx = position[k]-fx, dy = position[k+1]-fy, dz = position[k+2]-fz;
          finalR2 = Math.max(finalR2, dx*dx+dy*dy+dz*dz);
        }
        return { id:this.id,label:this.label,mode:this.mode,activeCount:0,count:this.count,center:new Float64Array([fx,fy,fz]),velocity:new Float64Array([fvx,fvy,fvz]),radiusMeters:Math.max(10_000,Math.sqrt(finalR2),this.radiusMeters*0.08),elapsedSeconds:this.elapsedSeconds,scientificStatus:this.scientificStatus,lifecycle:this.lifecycle,completedAtSeconds:this.completedAtSeconds };
      }
      return {
        id: this.id, label: this.label, mode: this.mode, activeCount: 0, count: this.count,
        center: new Float64Array(this.origin), velocity: new Float64Array(this.baseVelocity),
        radiusMeters: this.radiusMeters, elapsedSeconds: this.elapsedSeconds, scientificStatus: this.scientificStatus,
        lifecycle: this.lifecycle, completedAtSeconds: this.completedAtSeconds,
      };
    }
    cx /= samples; cy /= samples; cz /= samples;
    vx /= samples; vy /= samples; vz /= samples;
    let maxR2 = 0;
    for (let i = 0; i < this.count; i += stride) {
      if (!active[i]) continue;
      const k = i * 3;
      const dx = position[k] - cx, dy = position[k + 1] - cy, dz = position[k + 2] - cz;
      maxR2 = Math.max(maxR2, dx * dx + dy * dy + dz * dz);
    }
    const state = {
      id: this.id, label: this.label, mode: this.mode, activeCount: this.activeCount, count: this.count,
      center: new Float64Array([cx, cy, cz]),
      velocity: new Float64Array([vx, vy, vz]),
      radiusMeters: Math.max(10_000, Math.sqrt(maxR2), this.radiusMeters * 0.08),
      elapsedSeconds: this.elapsedSeconds, scientificStatus: this.scientificStatus, lifecycle: this.lifecycle, completedAtSeconds: this.completedAtSeconds,
    };
    this.lastLiveObservation = { ...state, center: new Float64Array(state.center), velocity: new Float64Array(state.velocity) };
    return state;
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
      peakActiveCount: this.peakActiveCount,
      lifecycle: this.lifecycle,
      completedAtSeconds: this.completedAtSeconds,
      scientificStatus: this.scientificStatus,
    };
  }
}
