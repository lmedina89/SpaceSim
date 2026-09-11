import { PHYSICS } from '../core/constants.js';

function finitePositive(value) { return Number.isFinite(value) && value > 0; }

/**
 * Conservative Newtonian major-body timestep ceiling based on pair encounter timescales.
 * The gravity timescale sqrt(r^3 / G(M1+M2)) is limited to ~1/78 of a circular orbit
 * (0.08 dynamical times), while a fast crossing additionally receives ~20 samples over r.
 * Normal generated systems generally remain at the global ceiling; close LAB compact pairs do not.
 */
export function massivePairPhysicsStepLimitSeconds(bodies, fallbackSeconds = 300) {
  const fallback = Math.max(1e-4, Number(fallbackSeconds) || 300);
  let limit = fallback;
  for (let i = 0; i < (bodies?.length ?? 0); i += 1) {
    const a = bodies[i];
    if (!a || a.gravitySource === false || !finitePositive(a.mass)) continue;
    for (let j = i + 1; j < bodies.length; j += 1) {
      const b = bodies[j];
      if (!b || b.gravitySource === false || !finitePositive(b.mass)) continue;
      const dx = b.position[0] - a.position[0];
      const dy = b.position[1] - a.position[1];
      const dz = b.position[2] - a.position[2];
      const physicalFloor = Math.max(1, (Number(a.radius) || 0) + (Number(b.radius) || 0));
      const separation = Math.max(physicalFloor, Math.hypot(dx, dy, dz));
      const mu = PHYSICS.G * (a.mass + b.mass);
      if (!(mu > 0)) continue;
      const dynamicalTime = Math.sqrt((separation * separation * separation) / mu);
      if (finitePositive(dynamicalTime)) limit = Math.min(limit, Math.max(1e-4, dynamicalTime * 0.08));

      const rvx = b.velocity[0] - a.velocity[0];
      const rvy = b.velocity[1] - a.velocity[1];
      const rvz = b.velocity[2] - a.velocity[2];
      const relativeSpeed = Math.hypot(rvx, rvy, rvz);
      if (relativeSpeed > 1e-6) {
        const crossingLimit = (separation / relativeSpeed) * 0.05;
        if (finitePositive(crossingLimit)) limit = Math.min(limit, Math.max(1e-4, crossingLimit));
      }
    }
  }
  return limit;
}
