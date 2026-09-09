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

export function computeApproachAcceleration(ship, target, maxAccelerationMps2, dtSeconds, options = {}) {
  const state = targetRelativeState(ship, target);
  const standOffDistance = options.standOffDistanceMeters ?? approachStandOffDistanceMeters(target);
  const remainingMeters = state.distanceMeters - standOffDistance;
  const dt = Math.max(1e-3, dtSeconds);
  const accel = Math.max(0.01, maxAccelerationMps2);
  const maxCruiseSpeed = options.maxCruiseSpeedMps ?? 250_000;

  if (remainingMeters <= 0) {
    const match = computeMatchVelocityAcceleration(ship, target, accel, dt);
    return {
      ...match,
      phase: match.complete ? 'arrived' : 'matching',
      remainingMeters,
      standOffDistance,
      stoppingDistanceMeters: stoppingDistanceMeters(state.relativeSpeedMps, accel),
      desiredRelativeSpeedMps: 0,
    };
  }

  // Desired speed follows a braking-safe sqrt(2as) envelope. The factor below leaves
  // margin for target gravity, finite integration steps, and vector/lateral correction.
  const brakingEnvelope = Math.sqrt(Math.max(0, 2 * accel * remainingMeters)) * 0.72;
  const desiredSpeed = Math.min(maxCruiseSpeed, brakingEnvelope);
  const desiredRelativeVelocity = scale(state.direction, desiredSpeed);
  const velocityError = subtract(desiredRelativeVelocity, state.relativeVelocity);
  const desiredAcceleration = scale(velocityError, 1 / dt);
  const command = capVector(desiredAcceleration, accel);
  const stopDistance = stoppingDistanceMeters(Math.max(0, state.closingSpeedMps), accel);
  const braking = state.closingSpeedMps > 0 && stopDistance >= remainingMeters * 0.72;

  return {
    acceleration: command,
    state,
    complete: false,
    phase: braking ? 'braking' : 'approach',
    remainingMeters,
    standOffDistance,
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

export function recommendedWarpCap({ mode, targetState, targetRadius = 0 }) {
  if (!mode || mode === 'manual') return Infinity;
  if (mode === 'match') {
    if (targetState.relativeSpeedMps < 100) return 1;
    if (targetState.relativeSpeedMps < 10_000) return 60;
    return 600;
  }
  const surfaceSeparation = Math.max(0, targetState.distanceMeters - targetRadius);
  const closing = Math.max(1, targetState.closingSpeedMps);
  const timeToSurface = surfaceSeparation / closing;
  if (surfaceSeparation < Math.max(100_000, targetRadius * 0.03) || timeToSurface < 10) return 1;
  if (surfaceSeparation < Math.max(50_000_000, targetRadius * 10) || timeToSurface < 600) return 60;
  return 600;
}
