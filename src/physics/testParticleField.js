import { PHYSICS, SIMULATION } from '../core/constants.js';
import { createRng } from '../util/prng.js';

export class TestParticleField {
  constructor(seed, centralBody, count = SIMULATION.defaultMinorBodyCount) {
    this.seed = seed;
    this.centralBody = centralBody;
    this.count = 0;
    this.position = null;
    this.velocity = null;
    this.renderPosition = null;
    this._pendingDt = 0;
    this._sourceIds = [];
    this._sourceStartPositions = new Float64Array(0);
    this.setCount(count);
  }

  setCount(nextCount) {
    const count = Math.max(0, Math.min(Number(nextCount) || 0, SIMULATION.maxMinorBodyCount));
    this.count = count;
    this.position = new Float64Array(count * 3);
    this.velocity = new Float64Array(count * 3);
    this.renderPosition = new Float32Array(count * 3);
    this._pendingDt = 0;
    const rng = createRng(`${this.seed}:minor:${count}`);
    const center = this.centralBody.position;
    const m = this.centralBody.mass;
    const minR = 0.45 * PHYSICS.AU;
    const maxR = 4.8 * PHYSICS.AU;
    for (let i = 0; i < count; i += 1) {
      const f = i * 3;
      const u = rng.random();
      const r = minR * Math.pow(maxR / minR, u);
      const a = rng.range(0, Math.PI * 2);
      const inclination = rng.range(-0.025, 0.025);
      const x = Math.cos(a) * r;
      const z0 = Math.sin(a) * r;
      const y = z0 * Math.sin(inclination);
      const z = z0 * Math.cos(inclination);
      const v = Math.sqrt(PHYSICS.G * m / r) * rng.range(0.94, 1.06);
      this.position[f] = center[0] + x;
      this.position[f + 1] = center[1] + y;
      this.position[f + 2] = center[2] + z;
      this.velocity[f] = this.centralBody.velocity[0] - Math.sin(a) * v;
      this.velocity[f + 1] = this.centralBody.velocity[1] + Math.cos(a) * v * Math.sin(inclination);
      this.velocity[f + 2] = this.centralBody.velocity[2] + Math.cos(a) * v * Math.cos(inclination);
    }
  }

  _ensureSourceScratch(gravitySources) {
    let rebuild = this._sourceIds.length !== gravitySources.length;
    if (!rebuild) {
      for (let i = 0; i < gravitySources.length; i += 1) {
        if (this._sourceIds[i] !== gravitySources[i].id) { rebuild = true; break; }
      }
    }
    if (rebuild) {
      this._sourceIds = gravitySources.map((source) => source.id);
      this._sourceStartPositions = new Float64Array(gravitySources.length * 3);
      this._pendingDt = 0;
    }
  }

  _captureSourceStart(gravitySources, previousState = null) {
    this._ensureSourceScratch(gravitySources);
    for (let s = 0; s < gravitySources.length; s += 1) {
      const source = gravitySources[s];
      const k = s * 3;
      const offset = typeof previousState?.offsetFor === 'function' ? previousState.offsetFor(source.id) : -1;
      if (offset >= 0 && previousState?.positions) {
        this._sourceStartPositions[k] = previousState.positions[offset];
        this._sourceStartPositions[k + 1] = previousState.positions[offset + 1];
        this._sourceStartPositions[k + 2] = previousState.positions[offset + 2];
      } else {
        this._sourceStartPositions[k] = source.position[0];
        this._sourceStartPositions[k + 1] = source.position[1];
        this._sourceStartPositions[k + 2] = source.position[2];
      }
    }
  }

  /**
   * Accumulate tiny real-time steps and update the visualization-tier test field at its declared
   * cadence. Large/high-warp physics substeps still update immediately. The first KDK kick uses
   * the major-source positions from the beginning of the accumulated interval; the second uses
   * their authoritative current positions.
   */
  advance(dt, gravitySources, previousState = null, updateHz = SIMULATION.minorFieldUpdateHz) {
    if (!(dt > 0) || this.count <= 0) return false;
    const interval = 1 / Math.max(1, Number(updateHz) || 1);
    if (this._pendingDt <= 0) this._captureSourceStart(gravitySources, previousState);
    this._pendingDt += dt;
    if (this._pendingDt + 1e-12 < interval) return false;
    const accumulatedDt = this._pendingDt;
    this._pendingDt = 0;
    this.step(accumulatedDt, gravitySources, this._sourceStartPositions);
    return true;
  }

  step(dt, gravitySources, sourceStartPositions = null) {
    const n = this.count;
    const p = this.position;
    const v = this.velocity;
    // Kick-drift-kick test-particle integration. Test particles feel gravity but do not source it.
    // When supplied, sourceStartPositions represents the authoritative source state at interval start.
    for (let i = 0; i < n; i += 1) {
      const k = i * 3;
      let ax = 0, ay = 0, az = 0;
      for (let s = 0; s < gravitySources.length; s += 1) {
        const source = gravitySources[s];
        const f = s * 3;
        const sx = sourceStartPositions?.length === gravitySources.length * 3 ? sourceStartPositions[f] : source.position[0];
        const sy = sourceStartPositions?.length === gravitySources.length * 3 ? sourceStartPositions[f + 1] : source.position[1];
        const sz = sourceStartPositions?.length === gravitySources.length * 3 ? sourceStartPositions[f + 2] : source.position[2];
        const dx = sx - p[k];
        const dy = sy - p[k + 1];
        const dz = sz - p[k + 2];
        const r2 = dx * dx + dy * dy + dz * dz + 1;
        const invR = 1 / Math.sqrt(r2);
        const scale = PHYSICS.G * source.mass * invR * invR * invR;
        ax += dx * scale; ay += dy * scale; az += dz * scale;
      }
      v[k] += ax * dt * 0.5; v[k + 1] += ay * dt * 0.5; v[k + 2] += az * dt * 0.5;
      p[k] += v[k] * dt; p[k + 1] += v[k + 1] * dt; p[k + 2] += v[k + 2] * dt;

      ax = 0; ay = 0; az = 0;
      for (let s = 0; s < gravitySources.length; s += 1) {
        const source = gravitySources[s];
        const dx = source.position[0] - p[k];
        const dy = source.position[1] - p[k + 1];
        const dz = source.position[2] - p[k + 2];
        const r2 = dx * dx + dy * dy + dz * dz + 1;
        const invR = 1 / Math.sqrt(r2);
        const scale = PHYSICS.G * source.mass * invR * invR * invR;
        ax += dx * scale; ay += dy * scale; az += dz * scale;
      }
      v[k] += ax * dt * 0.5; v[k + 1] += ay * dt * 0.5; v[k + 2] += az * dt * 0.5;
    }
  }
}
