import { apparentAngularRadiusRad, phaseAppearance, illuminationDirectionInObserverBasis, observerStarOccultation, stellarVisibilityAtBody } from './celestialAppearance.js';
import { bodyFixedDirectionToInertial, hasPhysicalRotationModel, surfaceTangentBasis } from './planetaryRotation.js';
const EPSILON = 1e-12;

export const ASTRONOMICAL_OBSERVER_MODE = Object.freeze({
  SHIP: 'ship',
  DESCENT: 'descent',
  SURFACE: 'surface',
});

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function set3(out, x = 0, y = 0, z = 0) {
  out[0] = finite(x); out[1] = finite(y); out[2] = finite(z);
  return out;
}

function copyFinite3(out, source, fallback = [0, 0, 0]) {
  return set3(out,
    Number.isFinite(Number(source?.[0])) ? source[0] : fallback[0],
    Number.isFinite(Number(source?.[1])) ? source[1] : fallback[1],
    Number.isFinite(Number(source?.[2])) ? source[2] : fallback[2]);
}

function normalize3(out, x, y, z, fallback = [0, 1, 0]) {
  const length = Math.hypot(x, y, z);
  if (!(length > EPSILON) || !Number.isFinite(length)) return copyFinite3(out, fallback);
  return set3(out, x / length, y / length, z / length);
}

function cross3(out, a, b) {
  const x = a[1] * b[2] - a[2] * b[1];
  const y = a[2] * b[0] - a[0] * b[2];
  const z = a[0] * b[1] - a[1] * b[0];
  return set3(out, x, y, z);
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function createObserverState() {
  return {
    mode: ASTRONOMICAL_OBSERVER_MODE.SHIP,
    parentBodyId: null,
    inertialPosition: new Float64Array(3),
    forward: new Float64Array([0, 0, 1]),
    right: new Float64Array([1, 0, 0]),
    up: new Float64Array([0, 1, 0]),
    localUp: new Float64Array([0, 1, 0]),
    horizonEast: new Float64Array([1, 0, 0]),
    horizonNorth: new Float64Array([0, 0, 1]),
    localAnchor: new Float64Array(3),
    altitudeMeters: 0,
    simulationTimeSeconds: 0,
    horizonActive: false,
    valid: true,
  };
}

export function shipLookBasis(yaw = 0, pitch = 0, roll = 0, target = createObserverState()) {
  const safeYaw = finite(yaw);
  const safePitch = Math.max(-Math.PI * 0.5, Math.min(Math.PI * 0.5, finite(pitch)));
  const safeRoll = finite(roll);
  const cp = Math.cos(safePitch), sp = Math.sin(safePitch);
  const sy = Math.sin(safeYaw), cy = Math.cos(safeYaw);
  const forward = target.forward;
  set3(forward, sy * cp, sp, cy * cp);
  const baseRight = [cy, 0, -sy];
  const baseUp = new Float64Array(3);
  cross3(baseUp, forward, baseRight);
  const cr = Math.cos(safeRoll), sr = Math.sin(safeRoll);
  set3(target.right,
    baseRight[0] * cr + baseUp[0] * sr,
    baseRight[1] * cr + baseUp[1] * sr,
    baseRight[2] * cr + baseUp[2] * sr);
  set3(target.up,
    baseUp[0] * cr - baseRight[0] * sr,
    baseUp[1] * cr - baseRight[1] * sr,
    baseUp[2] * cr - baseRight[2] * sr);
  return target;
}

export function solveShipObserver({ ship, simulationTimeSeconds = 0, mode = ASTRONOMICAL_OBSERVER_MODE.SHIP } = {}, target = createObserverState()) {
  target.mode = mode === ASTRONOMICAL_OBSERVER_MODE.DESCENT ? mode : ASTRONOMICAL_OBSERVER_MODE.SHIP;
  target.parentBodyId = null;
  copyFinite3(target.inertialPosition, ship?.position);
  shipLookBasis(ship?.yaw, ship?.pitch, ship?.roll, target);
  copyFinite3(target.localUp, target.up);
  copyFinite3(target.horizonEast, target.right);
  copyFinite3(target.horizonNorth, target.forward);
  set3(target.localAnchor, 0, 0, 0);
  target.altitudeMeters = 0;
  target.simulationTimeSeconds = Math.max(0, finite(simulationTimeSeconds));
  target.horizonActive = false;
  target.valid = true;
  return target;
}

export function deriveSurfaceAnchorUp(body, shipPosition, target = new Float64Array(3)) {
  const bx = finite(body?.position?.[0]), by = finite(body?.position?.[1]), bz = finite(body?.position?.[2]);
  return normalize3(target,
    finite(shipPosition?.[0], bx) - bx,
    finite(shipPosition?.[1], by + 1) - by,
    finite(shipPosition?.[2], bz) - bz,
    [0, 1, 0]);
}

export function surfaceHorizonBasis(localUp, east = new Float64Array(3), north = new Float64Array(3)) {
  const reference = Math.abs(localUp?.[1] ?? 1) < 0.9 ? [0, 1, 0] : [0, 0, 1];
  cross3(east, localUp, reference);
  normalize3(east, east[0], east[1], east[2], [1, 0, 0]);
  cross3(north, east, localUp);
  normalize3(north, north[0], north[1], north[2], [0, 0, 1]);
  return { east, north };
}

export function solveSurfaceObserver({
  body,
  shipPosition,
  session,
  eyeHeightMeters = 1.72,
  terrainHeightMeters = 0,
  simulationTimeSeconds = 0,
  mode = ASTRONOMICAL_OBSERVER_MODE.SURFACE,
} = {}, target = createObserverState()) {
  const bodyPosition = body?.position ?? [0, 0, 0];
  const bodyFixedAnchor = session?.bodyFixedAnchor;
  const rotatingAnchor = hasPhysicalRotationModel(body)
    && Array.isArray(bodyFixedAnchor)
    && bodyFixedAnchor.length >= 3
    && bodyFixedAnchor.every((value) => Number.isFinite(Number(value)));
  if (rotatingAnchor) {
    bodyFixedDirectionToInertial(body, bodyFixedAnchor, simulationTimeSeconds, target.localUp);
    surfaceTangentBasis(body, target.localUp, simulationTimeSeconds, target.horizonEast, target.horizonNorth);
  } else {
    deriveSurfaceAnchorUp(body, shipPosition, target.localUp);
    surfaceHorizonBasis(target.localUp, target.horizonEast, target.horizonNorth);
  }
  const x = finite(session?.x), z = finite(session?.z);
  const height = finite(terrainHeightMeters) + Math.max(0, finite(eyeHeightMeters, 1.72));
  const radius = Math.max(0, finite(body?.radius));
  set3(target.inertialPosition,
    finite(bodyPosition[0]) + target.localUp[0] * (radius + height) + target.horizonEast[0] * x + target.horizonNorth[0] * z,
    finite(bodyPosition[1]) + target.localUp[1] * (radius + height) + target.horizonEast[1] * x + target.horizonNorth[1] * z,
    finite(bodyPosition[2]) + target.localUp[2] * (radius + height) + target.horizonEast[2] * x + target.horizonNorth[2] * z);

  const yaw = finite(session?.yaw), pitch = Math.max(-1.54, Math.min(1.54, finite(session?.pitch)));
  const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
  set3(target.forward,
    target.horizonEast[0] * sy * cp + target.localUp[0] * sp + target.horizonNorth[0] * cy * cp,
    target.horizonEast[1] * sy * cp + target.localUp[1] * sp + target.horizonNorth[1] * cy * cp,
    target.horizonEast[2] * sy * cp + target.localUp[2] * sp + target.horizonNorth[2] * cy * cp);
  set3(target.right,
    target.horizonEast[0] * cy - target.horizonNorth[0] * sy,
    target.horizonEast[1] * cy - target.horizonNorth[1] * sy,
    target.horizonEast[2] * cy - target.horizonNorth[2] * sy);
  cross3(target.up, target.forward, target.right);
  normalize3(target.up, target.up[0], target.up[1], target.up[2], target.localUp);
  set3(target.localAnchor, x, height, z);
  target.mode = mode === ASTRONOMICAL_OBSERVER_MODE.DESCENT ? mode : ASTRONOMICAL_OBSERVER_MODE.SURFACE;
  target.parentBodyId = body?.id ?? null;
  target.altitudeMeters = height;
  target.simulationTimeSeconds = Math.max(0, finite(simulationTimeSeconds));
  target.horizonActive = true;
  target.valid = Boolean(body?.position && Number.isFinite(radius));
  return target;
}

function createBodyObservation() {
  return {
    id: null,
    name: '',
    kind: '',
    color: 0xffffff,
    direction: new Float64Array([0, 0, 1]),
    localDirection: new Float64Array([0, 0, 1]),
    rangeMeters: Infinity,
    physicalRadiusMeters: 0,
    apparentAngularRadiusRad: 0,
    angularDiameterRad: 0,
    phaseAngleRad: 0,
    illuminatedFraction: 1,
    illuminationDirectionLocal: new Float64Array([0, 0, 1]),
    stellarVisibilityAtBody: 1,
    stellarEclipseFraction: 0,
    stellarEclipseState: 'none',
    stellarEclipseOcculterId: null,
    stellarEclipseOcculterName: '',
    starAngularSeparationRad: Infinity,
    observerStarVisibleFraction: 1,
    observerStarEclipseFraction: 0,
    observerStarEclipseState: 'none',
    observerStarEclipseOcculterId: null,
    observerStarEclipseOcculterName: '',
    centerAltitudeRad: Math.PI * 0.5,
    aboveHorizon: true,
    visibleAboveHorizon: true,
    finite: true,
  };
}

export function updateCelestialObservation(observer, body, target = createBodyObservation()) {
  target.id = body?.id ?? null;
  target.name = body?.name ?? '';
  target.kind = body?.kind ?? '';
  target.color = Number.isFinite(Number(body?.color)) ? Number(body.color) : 0xffffff;
  const dx = finite(body?.position?.[0]) - observer.inertialPosition[0];
  const dy = finite(body?.position?.[1]) - observer.inertialPosition[1];
  const dz = finite(body?.position?.[2]) - observer.inertialPosition[2];
  const range = Math.hypot(dx, dy, dz);
  normalize3(target.direction, dx, dy, dz, [0, 0, 1]);
  target.rangeMeters = Number.isFinite(range) && range > EPSILON ? range : 0;
  target.physicalRadiusMeters = Math.max(0, finite(body?.radius));
  target.apparentAngularRadiusRad = apparentAngularRadiusRad(target.physicalRadiusMeters, target.rangeMeters);
  target.angularDiameterRad = target.apparentAngularRadiusRad * 2;
  set3(target.localDirection,
    dot3(target.direction, observer.horizonEast),
    dot3(target.direction, observer.localUp),
    dot3(target.direction, observer.horizonNorth));
  const altitudeSin = Math.max(-1, Math.min(1, target.localDirection[1]));
  target.centerAltitudeRad = observer.horizonActive ? Math.asin(altitudeSin) : Math.PI * 0.5;
  target.aboveHorizon = !observer.horizonActive || target.centerAltitudeRad >= 0;
  target.visibleAboveHorizon = !observer.horizonActive || target.centerAltitudeRad + target.apparentAngularRadiusRad > 0;
  target.finite = Number.isFinite(target.rangeMeters)
    && Number.isFinite(target.apparentAngularRadiusRad)
    && [...target.direction, ...target.localDirection].every(Number.isFinite);
  return target;
}

export function angularSeparationRad(a, b) {
  const am = Math.hypot(a?.[0] ?? 0, a?.[1] ?? 0, a?.[2] ?? 0);
  const bm = Math.hypot(b?.[0] ?? 0, b?.[1] ?? 0, b?.[2] ?? 0);
  if (!(am > EPSILON && bm > EPSILON)) return Infinity;
  const cosine = ((a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2])) / (am * bm);
  return Math.acos(Math.max(-1, Math.min(1, cosine)));
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / Math.max(EPSILON, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function surfaceSkyExposure({ starAltitudeRad = -Math.PI * 0.5, atmosphereAtmProxy = 1, weatherTransmission = 1, starVisibleFraction = 1 } = {}) {
  const atmosphere = Math.max(0, finite(atmosphereAtmProxy, 1));
  const transmission = Math.max(0, Math.min(1, finite(weatherTransmission, 1)));
  const visibleStar = Math.max(0, Math.min(1, finite(starVisibleFraction, 1)));
  const geometricDaylight = atmosphere > 0.01 ? smoothstep(-0.12, 0.16, finite(starAltitudeRad, -Math.PI * 0.5)) : 0;
  const daylight = geometricDaylight * visibleStar;
  const atmosphericWashout = Math.min(1, atmosphere * daylight);
  return {
    daylight,
    atmosphere,
    weatherTransmission: transmission,
    starVisibleFraction: visibleStar,
    geometricDaylight,
    starVisibility: Math.max(0.015, 1 - atmosphericWashout * 0.985) * transmission,
    galacticVisibility: Math.max(0.008, 1 - atmosphericWashout * 0.995) * transmission,
    exposure: Math.max(0.72, Math.min(1.08, 0.86 + daylight * 0.19)) * (0.88 + transmission * 0.12),
  };
}

export class AstronomicalObserverModel {
  constructor() {
    this.observer = createObserverState();
    this.bodyObservations = [];
    this._bodyRecords = new Map();
    this._bodySources = [];
    this._appearanceTimeSeconds = -Infinity;
    this._appearanceObserverPosition = new Float64Array([Infinity, Infinity, Infinity]);
  }

  solveShip(input) {
    solveShipObserver(input, this.observer);
    return this.observer;
  }

  solveSurface(input) {
    solveSurfaceObserver(input, this.observer);
    return this.observer;
  }

  updateBodies(bodies = []) {
    this.bodyObservations.length = 0;
    this._bodySources.length = 0;
    const activeIds = new Set();
    let primaryStar = null;
    for (const body of bodies) {
      if (!body?.id || !body?.position) continue;
      if (!primaryStar && body.kind === 'star') primaryStar = body;
      let record = this._bodyRecords.get(body.id);
      if (!record) { record = createBodyObservation(); this._bodyRecords.set(body.id, record); }
      updateCelestialObservation(this.observer, body, record);
      this.bodyObservations.push(record);
      this._bodySources.push(body);
      activeIds.add(body.id);
    }
    for (const id of this._bodyRecords.keys()) if (!activeIds.has(id)) this._bodyRecords.delete(id);

    const appearanceTime = Number(this.observer.simulationTimeSeconds) || 0;
    const ox = Number(this.observer.inertialPosition[0]) || 0;
    const oy = Number(this.observer.inertialPosition[1]) || 0;
    const oz = Number(this.observer.inertialPosition[2]) || 0;
    const movedMeters = Math.hypot(
      ox - this._appearanceObserverPosition[0],
      oy - this._appearanceObserverPosition[1],
      oz - this._appearanceObserverPosition[2],
    );
    const refreshAppearance = !Number.isFinite(this._appearanceTimeSeconds)
      || Math.abs(appearanceTime - this._appearanceTimeSeconds) >= 0.1
      || !Number.isFinite(movedMeters)
      || movedMeters >= 100_000;
    if (!refreshAppearance) return this.bodyObservations;

    this._appearanceTimeSeconds = appearanceTime;
    this._appearanceObserverPosition[0] = ox;
    this._appearanceObserverPosition[1] = oy;
    this._appearanceObserverPosition[2] = oz;
    const starRecord = primaryStar ? this._bodyRecords.get(primaryStar.id) : null;
    const observerOcculters = this.observer.parentBodyId
      ? bodies.filter((body) => body?.id !== this.observer.parentBodyId)
      : bodies;
    const observerEclipse = primaryStar
      ? observerStarOccultation(this.observer.inertialPosition, primaryStar, observerOcculters)
      : null;

    for (let i = 0; i < this.bodyObservations.length; i += 1) {
      const record = this.bodyObservations[i];
      const body = this._bodySources[i];
      record.phaseAngleRad = 0;
      record.illuminatedFraction = body?.kind === 'star' ? 1 : 0;
      record.stellarVisibilityAtBody = 1;
      record.stellarEclipseFraction = 0;
      record.stellarEclipseState = 'none';
      record.stellarEclipseOcculterId = null;
      record.stellarEclipseOcculterName = '';
      record.starAngularSeparationRad = starRecord && record.id !== starRecord.id
        ? angularSeparationRad(record.direction, starRecord.direction)
        : 0;
      record.observerStarVisibleFraction = 1;
      record.observerStarEclipseFraction = 0;
      record.observerStarEclipseState = 'none';
      record.observerStarEclipseOcculterId = null;
      record.observerStarEclipseOcculterName = '';

      if (primaryStar && body && body.id !== primaryStar.id) {
        const phase = phaseAppearance(this.observer.inertialPosition, body.position, primaryStar.position);
        record.phaseAngleRad = phase.phaseAngleRad;
        record.illuminatedFraction = phase.illuminatedFraction;
        illuminationDirectionInObserverBasis(this.observer, body, primaryStar, record.illuminationDirectionLocal);
        const bodyEclipse = stellarVisibilityAtBody(body, primaryStar, bodies);
        record.stellarVisibilityAtBody = bodyEclipse.visibleFraction;
        record.stellarEclipseFraction = bodyEclipse.eclipseFraction;
        record.stellarEclipseState = bodyEclipse.eclipseState;
        record.stellarEclipseOcculterId = bodyEclipse.occulterId;
        record.stellarEclipseOcculterName = bodyEclipse.occulterName;
      } else {
        set3(record.illuminationDirectionLocal, 0, 0, 1);
      }

      if (primaryStar && record.id === primaryStar.id && observerEclipse) {
        record.observerStarVisibleFraction = observerEclipse.visibleFraction;
        record.observerStarEclipseFraction = observerEclipse.eclipseFraction;
        record.observerStarEclipseState = observerEclipse.eclipseState;
        record.observerStarEclipseOcculterId = observerEclipse.occulterId;
        record.observerStarEclipseOcculterName = observerEclipse.occulterName;
      }
    }
    return this.bodyObservations;
  }

  solution() {
    return { observer: this.observer, bodies: this.bodyObservations };
  }
}
