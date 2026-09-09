import { BODY_KIND, PHYSICS } from '../core/constants.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function magnitude(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function unit(v) {
  const m = magnitude(v) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function capVector(v, maxMagnitude) {
  const m = magnitude(v);
  if (m <= maxMagnitude || m === 0) return v;
  return scale(v, maxMagnitude / m);
}

export function stoppingDistanceMeters(speedMps, accelerationMps2) {
  if (!(accelerationMps2 > 0) || !(speedMps > 0)) return 0;
  return (speedMps * speedMps) / (2 * accelerationMps2);
}

export function targetRelativeState(ship, target) {
  const toTarget = [
    target.position[0] - ship.position[0],
    target.position[1] - ship.position[1],
    target.position[2] - ship.position[2],
  ];
  const distanceMeters = magnitude(toTarget);
  const direction = unit(toTarget);
  const relativeVelocity = [
    ship.velocity[0] - target.velocity[0],
    ship.velocity[1] - target.velocity[1],
    ship.velocity[2] - target.velocity[2],
  ];
  const relativeSpeedMps = magnitude(relativeVelocity);
  const closingSpeedMps = dot(relativeVelocity, direction);
  return { toTarget, distanceMeters, direction, relativeVelocity, relativeSpeedMps, closingSpeedMps };
}

export function targetGravityMps2(target, distanceMeters) {
  if (!(target?.mass > 0) || !(distanceMeters > 0)) return 0;
  return (PHYSICS.G * target.mass) / (distanceMeters * distanceMeters);
}

export function computeMatchVelocityAcceleration(ship, target, maxAccelerationMps2, dtSeconds) {
  const state = targetRelativeState(ship, target);
  if (state.relativeSpeedMps < 0.05) return { acceleration: [0, 0, 0], state, complete: true };
  const dt = Math.max(1e-3, dtSeconds);
  const desiredAcceleration = scale(state.relativeVelocity, -1 / dt);
  return {
    acceleration: capVector(desiredAcceleration, maxAccelerationMps2),
    state,
    complete: false,
  };
}

export function approachStandOffDistanceMeters(target) {
  const altitude = Math.max(100_000, target.radius * 0.35);
  return target.radius + altitude;
}

export function propulsionSafeStandOffDistanceMeters(target, maxAccelerationMps2, options = {}) {
  const base = approachStandOffDistanceMeters(target);
  if (!(target?.mass > 0) || !(maxAccelerationMps2 > 0)) return base;
  const gravityFraction = clamp(options.gravityFraction ?? 0.25, 0.05, 0.6);
  const supportedGravity = Math.max(1e-6, maxAccelerationMps2 * gravityFraction);
  const gravityLimitedRadius = Math.sqrt((PHYSICS.G * target.mass) / supportedGravity);
  const relativisticGuardRadius = target.kind === BODY_KIND.BLACK_HOLE
    ? Math.max(target.radius * 100, target.radius + 100_000)
    : 0;
  return Math.max(base, gravityLimitedRadius, relativisticGuardRadius);
}

export function computeStationKeepAcceleration(ship, target, maxAccelerationMps2, dtSeconds, options = {}) {
  const state = targetRelativeState(ship, target);
  const accel = Math.max(0.01, maxAccelerationMps2);
  const dt = Math.max(1e-3, dtSeconds);
  const standOffDistance = options.standOffDistanceMeters ?? propulsionSafeStandOffDistanceMeters(target, accel, options);
  const remainingMeters = state.distanceMeters - standOffDistance;
  const gravity = targetGravityMps2(target, Math.max(target.radius, state.distanceMeters));
  const antiGravity = scale(state.direction, -Math.min(gravity, accel * 0.45));

  const positionToleranceMeters = Math.max(500, standOffDistance * 0.002);
  const velocityToleranceMps = Math.max(0.5, Math.min(10, accel * 0.04));
  const maxCaptureSpeed = Math.max(10, Math.min(5_000, Math.sqrt(Math.max(0, 2 * accel * Math.abs(remainingMeters))) * 0.45));
  const desiredClosingSpeed = clamp(remainingMeters / 12, -maxCaptureSpeed, maxCaptureSpeed);
  const desiredRelativeVelocity = scale(state.direction, desiredClosingSpeed);
  const velocityError = subtract(desiredRelativeVelocity, state.relativeVelocity);
  const correctionBudget = Math.max(accel * 0.25, accel - Math.min(gravity, accel * 0.45));
  const correction = capVector(scale(velocityError, 1 / dt), correctionBudget);
  const command = capVector(add(antiGravity, correction), accel);
  const stable = Math.abs(remainingMeters) <= positionToleranceMeters && state.relativeSpeedMps <= velocityToleranceMps;

  return {
    acceleration: command,
    state,
    complete: false,
    phase: stable ? 'holding' : 'capture',
    remainingMeters,
    standOffDistance,
    targetGravityMps2: gravity,
    positionToleranceMeters,
    velocityToleranceMps,
    desiredRelativeSpeedMps: Math.abs(desiredClosingSpeed),
    stoppingDistanceMeters: stoppingDistanceMeters(state.relativeSpeedMps, accel),
  };
}

export function computeApproachAcceleration(ship, target, maxAccelerationMps2, dtSeconds, options = {}) {
  const state = targetRelativeState(ship, target);
  const accel = Math.max(0.01, maxAccelerationMps2);
  const standOffDistance = options.standOffDistanceMeters ?? propulsionSafeStandOffDistanceMeters(target, accel, options);
  const remainingMeters = state.distanceMeters - standOffDistance;
  const dt = Math.max(1e-3, dtSeconds);
  const maxCruiseSpeed = options.maxCruiseSpeedMps ?? 5_000_000;
  const captureBand = Math.max(2_500, standOffDistance * 0.006);

  if (remainingMeters <= captureBand) {
    return computeStationKeepAcceleration(ship, target, accel, dt, { ...options, standOffDistanceMeters: standOffDistance });
  }

  // Desired speed follows a braking-safe sqrt(2as) envelope. The margin leaves room for
  // target gravity, finite integration steps, and lateral/velocity correction.
  const brakingEnvelope = Math.sqrt(Math.max(0, 2 * accel * remainingMeters)) * 0.62;
  const desiredSpeed = Math.min(maxCruiseSpeed, brakingEnvelope);
  const desiredRelativeVelocity = scale(state.direction, desiredSpeed);
  const velocityError = subtract(desiredRelativeVelocity, state.relativeVelocity);
  const desiredAcceleration = scale(velocityError, 1 / dt);
  const command = capVector(desiredAcceleration, accel);
  const stopDistance = stoppingDistanceMeters(Math.max(0, state.closingSpeedMps), accel);
  const braking = state.closingSpeedMps > 0 && stopDistance >= remainingMeters * 0.58;

  return {
    acceleration: command,
    state,
    complete: false,
    phase: braking ? 'braking' : 'approach',
    remainingMeters,
    standOffDistance,
    targetGravityMps2: targetGravityMps2(target, Math.max(target.radius, state.distanceMeters)),
    stoppingDistanceMeters: stopDistance,
    desiredRelativeSpeedMps: desiredSpeed,
  };
}

export function computeAbsoluteBrakeAcceleration(ship, maxAccelerationMps2, dtSeconds) {
  const speed = magnitude(ship.velocity);
  if (speed < 0.05) return { acceleration: [0, 0, 0], complete: true, speedMps: speed };
  const dt = Math.max(1e-3, dtSeconds);
  return {
    acceleration: capVector(scale(ship.velocity, -1 / dt), maxAccelerationMps2),
    complete: false,
    speedMps: speed,
  };
}

export function recommendedWarpCap({ mode, targetState, targetRadius = 0, standOffDistanceMeters = null, phase = null, targetGravityMps2 = 0, maxAccelerationMps2 = Infinity }) {
  if (!mode || mode === 'manual') return Infinity;
  if (phase === 'holding') return 1;
  if (phase === 'capture') return 60;
  if (mode === 'match') {
    if (targetState.relativeSpeedMps < 100) return 1;
    if (targetState.relativeSpeedMps < 10_000) return 60;
    return 600;
  }
  if (Number.isFinite(maxAccelerationMps2) && targetGravityMps2 > maxAccelerationMps2 * 0.4) return 60;
  const navigationRadius = Math.max(targetRadius, Number(standOffDistanceMeters) || 0);
  const remaining = Math.max(0, targetState.distanceMeters - navigationRadius);
  const closing = Math.max(1, targetState.closingSpeedMps);
  const timeToStandOff = remaining / closing;
  if (timeToStandOff < 10) return 1;
  if (remaining < Math.max(50_000_000, navigationRadius * 0.05) || timeToStandOff < 600) return 60;
  return 600;
}

export function navigationPhysicsStepLimitSeconds(ship, bodies, fallbackSeconds = 300) {
  let limit = Math.max(0.01, fallbackSeconds);
  for (const body of bodies ?? []) {
    if (!(body?.mass > 0)) continue;
    const dx = body.position[0] - ship.position[0];
    const dy = body.position[1] - ship.position[1];
    const dz = body.position[2] - ship.position[2];
    const r = Math.max(body.radius || 1, Math.hypot(dx, dy, dz));
    const g = targetGravityMps2(body, r);
    if (!(g > 1e-9)) continue;
    const dynamicalTime = Math.sqrt(r / g);
    limit = Math.min(limit, clamp(dynamicalTime * 0.02, 0.05, fallbackSeconds));
  }
  return limit;
}

export function newtonianModelLimit(ship, bodies, speedFractionC = 0.1) {
  const speed = magnitude(ship.velocity);
  if (speed >= PHYSICS.C * speedFractionC) {
    return { reason: 'speed', speedMps: speed, limitMps: PHYSICS.C * speedFractionC };
  }
  for (const body of bodies ?? []) {
    if (body.kind !== BODY_KIND.BLACK_HOLE) continue;
    const dx = body.position[0] - ship.position[0];
    const dy = body.position[1] - ship.position[1];
    const dz = body.position[2] - ship.position[2];
    const distanceMeters = Math.hypot(dx, dy, dz);
    const guardRadius = Math.max(body.radius * 100, body.radius + 100_000);
    if (distanceMeters <= guardRadius) return { reason: 'black-hole-proximity', body, distanceMeters, guardRadius };
  }
  return null;
}
