import { PHYSICS, SIMULATION } from '../../core/constants.js';

const EPSILON_METERS = 1.0;
const EPSILON2 = EPSILON_METERS * EPSILON_METERS;

export class DirectGravitySolver {
  constructor() {
    this.lastPairCount = 0;
  }

  computeAccelerations(bodies, out) {
    const n = bodies.length;
    if (n > SIMULATION.directGravityBodyLimit) {
      throw new Error(`Direct solver limit exceeded (${n} > ${SIMULATION.directGravityBodyLimit}).`);
    }
    if (!out || out.length !== n * 3) out = new Float64Array(n * 3);
    out.fill(0);
    let pairs = 0;

    for (let i = 0; i < n; i += 1) {
      const a = bodies[i];
      if (!a.gravitySource) continue;
      for (let j = i + 1; j < n; j += 1) {
        const b = bodies[j];
        if (!b.gravitySource) continue;
        const dx = b.position[0] - a.position[0];
        const dy = b.position[1] - a.position[1];
        const dz = b.position[2] - a.position[2];
        const r2 = dx * dx + dy * dy + dz * dz + EPSILON2;
        const invR = 1 / Math.sqrt(r2);
        const invR3 = invR * invR * invR;
        const aScale = PHYSICS.G * b.mass * invR3;
        const bScale = PHYSICS.G * a.mass * invR3;
        const ia = i * 3;
        const ib = j * 3;
        out[ia] += dx * aScale;
        out[ia + 1] += dy * aScale;
        out[ia + 2] += dz * aScale;
        out[ib] -= dx * bScale;
        out[ib + 1] -= dy * bScale;
        out[ib + 2] -= dz * bScale;
        pairs += 1;
      }
    }

    this.lastPairCount = pairs;
    return out;
  }
}
