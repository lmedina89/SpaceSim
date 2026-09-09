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
    this.setCount(count);
  }

  setCount(nextCount) {
    const count = Math.max(0, Math.min(Number(nextCount) || 0, SIMULATION.maxMinorBodyCount));
    this.count = count;
    this.position = new Float64Array(count * 3);
    this.velocity = new Float64Array(count * 3);
    this.renderPosition = new Float32Array(count * 3);
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
      this.velocity[f] = -Math.sin(a) * v;
      this.velocity[f + 1] = Math.cos(a) * v * Math.sin(inclination);
      this.velocity[f + 2] = Math.cos(a) * v * Math.cos(inclination);
    }
  }

  step(dt, gravitySources) {
    const n = this.count;
    const p = this.position;
    const v = this.velocity;
    // Kick-drift-kick test-particle integration. Test particles feel gravity but do not source it.
    for (let i = 0; i < n; i += 1) {
      const k = i * 3;
      let ax = 0, ay = 0, az = 0;
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
