const TAU = Math.PI * 2;
const EPSILON = 1e-12;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function set3(out, x = 0, y = 0, z = 0) {
  out[0] = finite(x);
  out[1] = finite(y);
  out[2] = finite(z);
  return out;
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross3(out, a, b) {
  return set3(out,
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]);
}

function normalize3(out, source, fallback = [0, 1, 0]) {
  const x = finite(source?.[0]);
  const y = finite(source?.[1]);
  const z = finite(source?.[2]);
  const magnitude = Math.hypot(x, y, z);
  if (!(magnitude > EPSILON)) return set3(out, fallback[0], fallback[1], fallback[2]);
  return set3(out, x / magnitude, y / magnitude, z / magnitude);
}

export function rotationAxis(body, target = new Float64Array(3)) {
  return normalize3(target, body?.rotationAxisInertial ?? [0, 1, 0], [0, 1, 0]);
}

export function rotationAngleAt(body, simulationTimeSeconds = 0) {
  const period = Math.max(EPSILON, Math.abs(finite(body?.rotationPeriodSeconds, Infinity)));
  if (!Number.isFinite(period)) return finite(body?.rotationPhaseRad);
  const direction = finite(body?.rotationDirection, 1) < 0 ? -1 : 1;
  const epoch = finite(body?.rotationEpochSeconds);
  const phase = finite(body?.rotationPhaseRad);
  const turns = direction * (finite(simulationTimeSeconds) - epoch) / period;
  const angle = phase + TAU * (turns - Math.trunc(turns));
  return ((angle % TAU) + TAU) % TAU;
}

export function bodyRotationBasis(body, simulationTimeSeconds = 0, target = {}) {
  const axis = rotationAxis(body, target.axis ?? new Float64Array(3));
  const reference = Math.abs(axis[1]) < 0.94 ? [0, 1, 0] : [0, 0, 1];
  const zeroX = cross3(target.zeroX ?? new Float64Array(3), reference, axis);
  normalize3(zeroX, zeroX, [1, 0, 0]);
  const zeroZ = cross3(target.zeroZ ?? new Float64Array(3), axis, zeroX);
  normalize3(zeroZ, zeroZ, [0, 0, 1]);

  const angle = rotationAngleAt(body, simulationTimeSeconds);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const x = target.x ?? new Float64Array(3);
  const z = target.z ?? new Float64Array(3);
  set3(x,
    zeroX[0] * cosine + zeroZ[0] * sine,
    zeroX[1] * cosine + zeroZ[1] * sine,
    zeroX[2] * cosine + zeroZ[2] * sine);
  set3(z,
    -zeroX[0] * sine + zeroZ[0] * cosine,
    -zeroX[1] * sine + zeroZ[1] * cosine,
    -zeroX[2] * sine + zeroZ[2] * cosine);
  return { axis, zeroX, zeroZ, x, z, angle };
}

export function bodyFixedDirectionToInertial(body, bodyFixedDirection, simulationTimeSeconds = 0, target = new Float64Array(3)) {
  const basis = bodyRotationBasis(body, simulationTimeSeconds);
  const bx = finite(bodyFixedDirection?.[0]);
  const by = finite(bodyFixedDirection?.[1], 1);
  const bz = finite(bodyFixedDirection?.[2]);
  set3(target,
    basis.x[0] * bx + basis.axis[0] * by + basis.z[0] * bz,
    basis.x[1] * bx + basis.axis[1] * by + basis.z[1] * bz,
    basis.x[2] * bx + basis.axis[2] * by + basis.z[2] * bz);
  return normalize3(target, target, basis.axis);
}

export function inertialDirectionToBodyFixed(body, inertialDirection, simulationTimeSeconds = 0, target = new Float64Array(3)) {
  const direction = normalize3(new Float64Array(3), inertialDirection, [0, 1, 0]);
  const basis = bodyRotationBasis(body, simulationTimeSeconds);
  set3(target, dot3(direction, basis.x), dot3(direction, basis.axis), dot3(direction, basis.z));
  return normalize3(target, target, [0, 1, 0]);
}

export function captureBodyFixedSurfaceAnchor(body, inertialPosition, simulationTimeSeconds = 0, target = new Float64Array(3)) {
  const dx = finite(inertialPosition?.[0]) - finite(body?.position?.[0]);
  const dy = finite(inertialPosition?.[1]) - finite(body?.position?.[1]);
  const dz = finite(inertialPosition?.[2]) - finite(body?.position?.[2]);
  return inertialDirectionToBodyFixed(body, [dx, dy, dz], simulationTimeSeconds, target);
}

export function surfaceTangentBasis(body, localUp, simulationTimeSeconds = 0, east = new Float64Array(3), north = new Float64Array(3)) {
  const up = normalize3(new Float64Array(3), localUp, [0, 1, 0]);
  const axis = rotationAxis(body);
  cross3(east, axis, up);
  if (Math.hypot(east[0], east[1], east[2]) <= 1e-8) {
    const rotation = bodyRotationBasis(body, simulationTimeSeconds);
    cross3(east, rotation.z, up);
  }
  normalize3(east, east, [1, 0, 0]);
  cross3(north, up, east);
  normalize3(north, north, [0, 0, 1]);
  return { east, north };
}

export function surfaceLatitudeLongitude(bodyFixedDirection) {
  const direction = normalize3(new Float64Array(3), bodyFixedDirection, [0, 1, 0]);
  return {
    latitudeRad: Math.asin(clamp(direction[1], -1, 1)),
    longitudeRad: Math.atan2(direction[2], direction[0]),
  };
}

export function hasPhysicalRotationModel(body) {
  return Number.isFinite(Number(body?.rotationPeriodSeconds))
    && Math.abs(Number(body.rotationPeriodSeconds)) > EPSILON
    && body?.rotationAxisInertial != null
    && Number(body.rotationAxisInertial.length) >= 3;
}
