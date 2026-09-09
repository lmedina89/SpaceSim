import { BODY_KIND, PHYSICS, SIMULATION } from '../core/constants.js';
import { propulsionSafeStandOffDistanceMeters, stoppingDistanceMeters, targetRelativeState } from './flightComputer.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// TRANSIT is explicitly speculative reference-frame translation. These are coordinate-speed
// multipliers of c, not Newtonian spacecraft velocity and not a claim that FTL travel is physical.
// The high tiers are intentional: 1 c still takes ~8.3 minutes per AU, which is not useful for a
// phone exploration tool. 1,000 c crosses 30 AU in roughly 15 real seconds before arrival ramp-down.
export const TRANSIT_TIERS = Object.freeze([
  { multipleC: 1, label: '1 c' },
  { multipleC: 10, label: '10 c' },
  { multipleC: 100, label: '100 c' },
  { multipleC: 500, label: '500 c' },
  { multipleC: 1000, label: '1,000 c' },
]);

export function normalizeTransitMultiple(value) {
  const requested = Number(value);
  if (!Number.isFinite(requested)) return 100;
  let best = TRANSIT_TIERS[0].multipleC;
  let bestDelta = Infinity;
  for (const tier of TRANSIT_TIERS) {
    const delta = Math.abs(tier.multipleC - requested);
    if (delta < bestDelta) { best = tier.multipleC; bestDelta = delta; }
  }
  return best;
}

export function transitSpeedMps(multipleC) {
  return normalizeTransitMultiple(multipleC) * PHYSICS.C;
}

export function transitBodyGuardRadius(body) {
  const radius = Math.max(1, Number(body?.radius) || 1);
  if (body?.kind === BODY_KIND.BLACK_HOLE) return Math.max(radius * 150, 100_000_000);
  if (body?.kind === BODY_KIND.NEUTRON_STAR) return Math.max(radius * 100, 50_000_000);
  if (body?.kind === BODY_KIND.STAR || body?.kind === BODY_KIND.WHITE_DWARF || body?.kind === BODY_KIND.BROWN_DWARF) return Math.max(radius * 8, 100_000_000);
  if (body?.kind === BODY_KIND.PLANET || body?.kind === BODY_KIND.ROGUE_PLANET) return Math.max(radius * 4, 10_000_000);
  return Math.max(radius * 4, 5_000_000);
}

export function transitClearanceCheck(position, bodies, targetId = null) {
  let nearest = null;
  for (const body of bodies ?? []) {
    if (!body?.position || body.id === targetId) continue;
    const dx = position[0] - body.position[0];
    const dy = position[1] - body.position[1];
    const dz = position[2] - body.position[2];
    const distanceMeters = Math.hypot(dx, dy, dz);
    const guardRadiusMeters = transitBodyGuardRadius(body);
    if (distanceMeters < guardRadiusMeters && (!nearest || distanceMeters / guardRadiusMeters < nearest.ratio)) {
      nearest = { body, distanceMeters, guardRadiusMeters, ratio: distanceMeters / guardRadiusMeters };
    }
  }
  return nearest;
}

function segmentSphereFraction(start, end, center, radius) {
  const dx = end[0] - start[0], dy = end[1] - start[1], dz = end[2] - start[2];
  const fx = start[0] - center[0], fy = start[1] - center[1], fz = start[2] - center[2];
  const a = dx * dx + dy * dy + dz * dz;
  if (!(a > 0)) return null;
  const b = 2 * (fx * dx + fy * dy + fz * dz);
  const c = fx * fx + fy * fy + fz * fz - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const t0 = (-b - root) / (2 * a);
  const t1 = (-b + root) / (2 * a);
  if (t0 >= 0 && t0 <= 1) return t0;
  if (t1 >= 0 && t1 <= 1) return t1;
  return null;
}

export function firstTransitGuardHit(start, end, bodies, targetId = null) {
  let best = null;
  for (const body of bodies ?? []) {
    if (!body?.position || body.id === targetId) continue;
    const guardRadiusMeters = transitBodyGuardRadius(body);
    const fraction = segmentSphereFraction(start, end, body.position, guardRadiusMeters);
    if (fraction == null) continue;
    if (!best || fraction < best.fraction) best = { body, fraction, guardRadiusMeters };
  }
  return best;
}

export function transitArrivalDistanceMeters(ship, target, captureAccelerationMps2 = SIMULATION.shipBoostAcceleration) {
  if (!ship || !target) return 50_000_000;
  const state = targetRelativeState(ship, target);
  const physicalStandOff = target.mass > 0
    ? propulsionSafeStandOffDistanceMeters(target, captureAccelerationMps2, { gravityFraction: 0.2 })
    : Math.max(50_000, Number(target.radius) || 50_000);
  // Transit never rewrites local inertial velocity. Leave enough real distance for BOOST to remove
  // the pre-existing target-relative velocity after the frame translation ends.
  const brakingReserve = stoppingDistanceMeters(state.relativeSpeedMps, captureAccelerationMps2) * 1.35;
  return Math.max(physicalStandOff * 2.0, 50_000_000, physicalStandOff + brakingReserve);
}

export function effectiveTransitMultiple(maxMultipleC, distanceMeters, arrivalDistanceMeters) {
  const cap = normalizeTransitMultiple(maxMultipleC);
  const remaining = Math.max(0, distanceMeters - Math.max(0, arrivalDistanceMeters));
  // Deliberately step down near arrival so the visual transition is readable even though the
  // swept guard makes overshooting impossible.
  if (remaining > PHYSICS.AU * 10) return cap;
  if (remaining > PHYSICS.AU * 2) return Math.min(cap, 500);
  if (remaining > PHYSICS.AU * 0.5) return Math.min(cap, 100);
  if (remaining > PHYSICS.AU * 0.10) return Math.min(cap, 10);
  return Math.min(cap, 1);
}

export function advanceTransitPosition(position, targetPosition, maxMultipleC, realDtSeconds, arrivalDistanceMeters) {
  const dx = targetPosition[0] - position[0];
  const dy = targetPosition[1] - position[1];
  const dz = targetPosition[2] - position[2];
  const distanceMeters = Math.hypot(dx, dy, dz);
  const remainingMeters = distanceMeters - Math.max(0, arrivalDistanceMeters);
  if (!(remainingMeters > 0)) {
    return { nextPosition: new Float64Array(position), arrived: true, distanceMeters, remainingMeters: 0, multipleC: 0, speedMps: 0 };
  }
  const multipleC = effectiveTransitMultiple(maxMultipleC, distanceMeters, arrivalDistanceMeters);
  const speedMps = multipleC * PHYSICS.C;
  const travelMeters = Math.min(remainingMeters, speedMps * clamp(Number(realDtSeconds) || 0, 0, 0.1));
  const inv = distanceMeters > 0 ? 1 / distanceMeters : 0;
  const nextPosition = new Float64Array([
    position[0] + dx * inv * travelMeters,
    position[1] + dy * inv * travelMeters,
    position[2] + dz * inv * travelMeters,
  ]);
  return { nextPosition, arrived: travelMeters >= remainingMeters - 1e-6, distanceMeters, remainingMeters: Math.max(0, remainingMeters - travelMeters), multipleC, speedMps };
}
