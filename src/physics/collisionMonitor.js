import { SIMULATION } from '../core/constants.js';

export class CollisionMonitor {
  constructor() {
    this.active = new Set();
  }

  scan(bodies) {
    const events = [];
    const current = new Set();
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i], b = bodies[j];
        const dx = b.position[0] - a.position[0];
        const dy = b.position[1] - a.position[1];
        const dz = b.position[2] - a.position[2];
        const limit = (a.radius + b.radius) * SIMULATION.collisionSafetyFactor;
        if (dx * dx + dy * dy + dz * dz <= limit * limit) {
          const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          current.add(key);
          if (!this.active.has(key)) {
            const rvx = b.velocity[0] - a.velocity[0];
            const rvy = b.velocity[1] - a.velocity[1];
            const rvz = b.velocity[2] - a.velocity[2];
            events.push({ type: 'collision-start', a, b, relativeSpeed: Math.hypot(rvx, rvy, rvz) });
          }
        }
      }
    }
    this.active = current;
    return events;
  }
}
