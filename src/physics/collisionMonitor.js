import { SIMULATION } from '../core/constants.js';

function clamp01(value) { return Math.max(0, Math.min(1, value)); }

export class CollisionMonitor {
  constructor() {
    this.active = new Set();
  }

  scan(bodies, previousPositions = null) {
    const events = [];
    const current = new Set();
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i], b = bodies[j];
        const limit = (a.radius + b.radius) * SIMULATION.collisionSafetyFactor;
        let dx = b.position[0] - a.position[0];
        let dy = b.position[1] - a.position[1];
        let dz = b.position[2] - a.position[2];
        let hit = dx * dx + dy * dy + dz * dz <= limit * limit;
        let contactNormal = null;
        let stepFraction = 1;

        if (!hit && previousPositions) {
          const pa = previousPositions.get(a.id);
          const pb = previousPositions.get(b.id);
          if (pa && pb) {
            const r0x = pb[0] - pa[0], r0y = pb[1] - pa[1], r0z = pb[2] - pa[2];
            const r1x = dx, r1y = dy, r1z = dz;
            const sx = r1x - r0x, sy = r1y - r0y, sz = r1z - r0z;
            const denom = sx * sx + sy * sy + sz * sz;
            const tau = denom > 0 ? clamp01(-(r0x * sx + r0y * sy + r0z * sz) / denom) : 0;
            const cx = r0x + sx * tau, cy = r0y + sy * tau, cz = r0z + sz * tau;
            hit = cx * cx + cy * cy + cz * cz <= limit * limit;
            if (hit) {
              dx = cx; dy = cy; dz = cz;
              stepFraction = tau;
            }
          }
        }

        if (hit) {
          const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          current.add(key);
          if (!this.active.has(key)) {
            const rvx = b.velocity[0] - a.velocity[0];
            const rvy = b.velocity[1] - a.velocity[1];
            const rvz = b.velocity[2] - a.velocity[2];
            const normalMag = Math.hypot(dx, dy, dz) || 1;
            contactNormal = [dx / normalMag, dy / normalMag, dz / normalMag];
            events.push({
              type: 'collision-start',
              a,
              b,
              relativeVelocity: [rvx, rvy, rvz],
              relativeSpeed: Math.hypot(rvx, rvy, rvz),
              contactNormal,
              stepFraction,
            });
          }
        }
      }
    }
    this.active = current;
    return events;
  }
}
