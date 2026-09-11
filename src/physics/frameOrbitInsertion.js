import { BODY_KIND, PHYSICS } from '../core/constants.js';
import { conservativeHillRadiusMeters, instantaneousHillRadiusMeters, navigationParent } from '../navigation/systemNavigation.js';

export const PROGRADE_HILL_STABILITY_FRACTION = 0.47;

function magnitude(v) { return Math.hypot(Number(v?.[0]) || 0, Number(v?.[1]) || 0, Number(v?.[2]) || 0); }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return new Float64Array([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]); }
function subtract(a, b) { return new Float64Array([a[0] - b[0], a[1] - b[1], a[2] - b[2]]); }
function scale(v, s) { return new Float64Array([v[0] * s, v[1] * s, v[2] * s]); }
function normalize(v, fallback = [1, 0, 0]) {
  const m = magnitude(v);
  if (m > 1e-12) return scale(v, 1 / m);
  const fm = magnitude(fallback) || 1;
  return new Float64Array([fallback[0] / fm, fallback[1] / fm, fallback[2] / fm]);
}

export function supportsFrameOrbitInsertion(target) {
  return Boolean(target && [BODY_KIND.PLANET, BODY_KIND.MOON, BODY_KIND.ROGUE_PLANET].includes(target.kind)
    && Number(target.mass) > 0 && Number(target.radius) > 0 && target.position && target.velocity);
}

export function minimumFrameOrbitAltitudeMeters(target) {
  const radius = Math.max(1, Number(target?.radius) || 1);
  if (target?.kind === BODY_KIND.MOON) return Math.max(25_000, radius * 0.04);
  if (target?.kind === BODY_KIND.ROGUE_PLANET) return Math.max(250_000, radius * 0.05);
  if (target?.kind === BODY_KIND.PLANET && target?.planetType === 'gas') return Math.max(500_000, radius * 0.08);
  return Math.max(200_000, radius * 0.05);
}

function preferredOrbitNormal(target, parent) {
  if (parent?.position && parent?.velocity) {
    const r = subtract(target.position, parent.position);
    const v = subtract(target.velocity, parent.velocity);
    const h = cross(r, v);
    if (magnitude(h) > 1e-9) return normalize(h, [0, 1, 0]);
  }
  if (target?.rotationAxisInertial && magnitude(target.rotationAxisInertial) > 1e-9) return normalize(target.rotationAxisInertial, [0, 1, 0]);
  return new Float64Array([0, 1, 0]);
}

function orbitNormalPerpendicularToRadius(preferred, radial) {
  const projected = new Float64Array([
    preferred[0] - radial[0] * dot(preferred, radial),
    preferred[1] - radial[1] * dot(preferred, radial),
    preferred[2] - radial[2] * dot(preferred, radial),
  ]);
  if (magnitude(projected) > 1e-9) return normalize(projected, [0, 1, 0]);
  const fallbackAxis = Math.abs(radial[1]) < 0.85 ? [0, 1, 0] : [1, 0, 0];
  return normalize(cross(radial, fallbackAxis), [0, 0, 1]);
}

export function frameOrbitInsertionPlan(ship, target, bodies = []) {
  if (!supportsFrameOrbitInsertion(target) || !ship?.position) return { ok: false, reason: 'unsupported-target' };

  const parent = navigationParent(target, bodies);
  const desiredAltitude = minimumFrameOrbitAltitudeMeters(target);
  const surfaceRadius = Math.max(1, Number(target.radius));
  const minimumRadius = surfaceRadius + Math.max(10_000, surfaceRadius * 0.015);
  let orbitRadius = surfaceRadius + desiredAltitude;

  const instantaneousHillRadius = instantaneousHillRadiusMeters(target, parent);
  const hillRadius = conservativeHillRadiusMeters(target, parent);
  let hillLimited = false;
  if (hillRadius && Number.isFinite(hillRadius)) {
    const maximumProgradeRadius = hillRadius * PROGRADE_HILL_STABILITY_FRACTION;
    if (!(maximumProgradeRadius > minimumRadius)) {
      return { ok: false, reason: 'no-resolved-hill-stable-window', hillRadiusMeters: hillRadius, instantaneousHillRadiusMeters: instantaneousHillRadius };
    }
    if (orbitRadius > maximumProgradeRadius) {
      orbitRadius = maximumProgradeRadius;
      hillLimited = true;
    }
  }

  const radialUnit = normalize(subtract(ship.position, target.position), [1, 0, 0]);
  const orbitNormal = orbitNormalPerpendicularToRadius(preferredOrbitNormal(target, parent), radialUnit);
  let tangentUnit = normalize(cross(orbitNormal, radialUnit), [0, 0, 1]);
  if (parent?.velocity) {
    const targetRelativeVelocity = subtract(target.velocity, parent.velocity);
    if (magnitude(targetRelativeVelocity) > 1e-9 && dot(tangentUnit, targetRelativeVelocity) < 0) tangentUnit = scale(tangentUnit, -1);
  }

  const circularSpeedMps = Math.sqrt(PHYSICS.G * Number(target.mass) / orbitRadius);
  if (!Number.isFinite(circularSpeedMps) || !(circularSpeedMps > 0)) return { ok: false, reason: 'invalid-circular-speed' };

  return {
    ok: true,
    targetId: target.id,
    parentId: parent?.id ?? null,
    radiusMeters: orbitRadius,
    altitudeMeters: orbitRadius - surfaceRadius,
    circularSpeedMps,
    radialUnit,
    tangentUnit,
    orbitNormal,
    hillRadiusMeters: hillRadius,
    instantaneousHillRadiusMeters: instantaneousHillRadius,
    hillLimited,
    model: 'instantaneous-newtonian-circular-orbit-v1',
  };
}

export function applyFrameOrbitInsertion(ship, target, plan) {
  if (!plan?.ok || !ship?.position || !ship?.velocity || !target?.position || !target?.velocity) return { applied: false };
  for (let i = 0; i < 3; i += 1) {
    ship.position[i] = target.position[i] + plan.radialUnit[i] * plan.radiusMeters;
    ship.velocity[i] = target.velocity[i] + plan.tangentUnit[i] * plan.circularSpeedMps;
  }
  return { applied: true, altitudeMeters: plan.altitudeMeters, circularSpeedMps: plan.circularSpeedMps, hillLimited: Boolean(plan.hillLimited) };
}
