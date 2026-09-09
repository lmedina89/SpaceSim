import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASTRONOMICAL_OBSERVER_MODE,
  AstronomicalObserverModel,
  angularSeparationRad,
  deriveSurfaceAnchorUp,
  solveShipObserver,
  solveSurfaceObserver,
  surfaceSkyExposure,
  updateCelestialObservation,
} from '../src/core/astronomicalObserver.js';

const near = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const norm = (v) => Math.hypot(...v);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

test('ship observer copies inertial position and produces an orthonormal look basis', () => {
  const position = new Float64Array([1e12, -2e11, 3e10]);
  const ship = { position, yaw: 0.7, pitch: -0.3, roll: 0.4 };
  const before = [...position];
  const observer = solveShipObserver({ ship, simulationTimeSeconds: 42 });
  assert.deepEqual([...observer.inertialPosition], before);
  near(norm(observer.forward), 1); near(norm(observer.right), 1); near(norm(observer.up), 1);
  near(dot(observer.forward, observer.right), 0);
  near(dot(observer.forward, observer.up), 0);
  near(dot(observer.right, observer.up), 0);
  assert.deepEqual([...position], before, 'observer solve must not mutate spacecraft physics');
  assert.equal(observer.simulationTimeSeconds, 42);
});

test('atmospheric exposure preserves stars in the model while visibility responds to daylight', () => {
  const day = surfaceSkyExposure({ starAltitudeRad: 0.8, atmosphereAtmProxy: 1, weatherTransmission: 1 });
  const night = surfaceSkyExposure({ starAltitudeRad: -0.8, atmosphereAtmProxy: 1, weatherTransmission: 1 });
  const airless = surfaceSkyExposure({ starAltitudeRad: 0.8, atmosphereAtmProxy: 0, weatherTransmission: 1 });
  assert.ok(day.starVisibility > 0 && day.starVisibility < night.starVisibility);
  assert.ok(airless.starVisibility > day.starVisibility);
  assert.equal(typeof day.starVisibility, 'number');
});

test('surface anchor points away from parent center and local basis is finite/orthonormal', () => {
  const body = { id: 'planet', radius: 6e6, position: new Float64Array([10, 20, 30]) };
  const shipPosition = new Float64Array([10, 6e6 + 20, 30]);
  const anchor = deriveSurfaceAnchorUp(body, shipPosition);
  assert.deepEqual([...anchor], [0, 1, 0]);
  const observer = solveSurfaceObserver({ body, shipPosition, session: { x: 120, z: -80, yaw: 0.4, pitch: 0.2 }, terrainHeightMeters: 15, simulationTimeSeconds: 90 });
  assert.equal(observer.mode, ASTRONOMICAL_OBSERVER_MODE.SURFACE);
  assert.equal(observer.parentBodyId, 'planet');
  assert.ok([...observer.inertialPosition, ...observer.forward, ...observer.right, ...observer.up].every(Number.isFinite));
  near(norm(observer.localUp), 1); near(norm(observer.horizonEast), 1); near(norm(observer.horizonNorth), 1);
  near(dot(observer.localUp, observer.horizonEast), 0);
  near(dot(observer.localUp, observer.horizonNorth), 0);
  near(dot(observer.horizonEast, observer.horizonNorth), 0);
  near(observer.altitudeMeters, 16.72);
});

test('major-body direction and physical apparent angular radius are correct', () => {
  const observer = solveShipObserver({ ship: { position: new Float64Array([0, 0, 0]) } });
  const body = { id: 'known', kind: 'planet', radius: 1_000, position: new Float64Array([0, 0, 10_000]) };
  const observed = updateCelestialObservation(observer, body);
  assert.deepEqual([...observed.direction], [0, 0, 1]);
  near(observed.rangeMeters, 10_000);
  near(observed.apparentAngularRadiusRad, Math.asin(0.1));
  assert.equal(observed.finite, true);
});

test('surface horizon distinguishes center and finite disk visibility', () => {
  const body = { id: 'planet', radius: 1_000, position: new Float64Array([0, 0, 0]) };
  const observer = solveSurfaceObserver({ body, shipPosition: new Float64Array([0, 1_100, 0]), session: { x: 0, z: 0, yaw: 0, pitch: 0 } });
  const above = updateCelestialObservation(observer, { id: 'above', radius: 1, position: new Float64Array([0, 10_000, 0]) });
  const below = updateCelestialObservation(observer, { id: 'below', radius: 1, position: new Float64Array([0, -10_000, 0]) });
  assert.equal(above.aboveHorizon, true);
  assert.equal(above.visibleAboveHorizon, true);
  assert.equal(below.aboveHorizon, false);
  assert.equal(below.visibleAboveHorizon, false);
});

test('fixed-time descent and surface modes preserve the same astronomical directions', () => {
  const body = { id: 'planet', radius: 6e6, position: new Float64Array([1e9, 2e9, -3e9]) };
  const shipPosition = new Float64Array([1e9, 2e9 + 3e7, -3e9]);
  const session = { x: 0, z: 0, yaw: 0.2, pitch: 0.1 };
  const target = { id: 'star', radius: 7e8, position: new Float64Array([1e11, 2e10, -5e10]) };
  const descent = solveSurfaceObserver({ body, shipPosition, session, simulationTimeSeconds: 500, mode: ASTRONOMICAL_OBSERVER_MODE.DESCENT });
  const a = [...updateCelestialObservation(descent, target).direction];
  const surface = solveSurfaceObserver({ body, shipPosition, session, simulationTimeSeconds: 500 });
  const b = [...updateCelestialObservation(surface, target).direction];
  near(angularSeparationRad(a, b), 0);
});

test('fixed-time surface to orbit handoff preserves celestial direction at the same observer position', () => {
  const body = { id: 'planet', radius: 6e6, position: new Float64Array([1e9, -2e9, 3e9]) };
  const shipPosition = new Float64Array([1e9, -1.97e9, 3e9]);
  const session = { x: 12, z: -7, yaw: 0.7, pitch: -0.1 };
  const target = { id: 'star', radius: 7e8, position: new Float64Array([1.4e11, 8e10, -2e10]) };
  const surface = solveSurfaceObserver({ body, shipPosition, session, terrainHeightMeters: 3, simulationTimeSeconds: 750 });
  const surfaceDirection = [...updateCelestialObservation(surface, target).direction];
  const orbit = solveShipObserver({
    ship: { position: new Float64Array(surface.inertialPosition), yaw: 0.7, pitch: -0.1, roll: 0 },
    simulationTimeSeconds: 750,
  });
  const orbitDirection = [...updateCelestialObservation(orbit, target).direction];
  near(angularSeparationRad(surfaceDirection, orbitDirection), 0);
});

test('schema-1-equivalent restored state reconstructs the same surface observer without cached observer data', () => {
  const body = { id: 'planet', radius: 6e6, position: new Float64Array([10, 20, 30]) };
  const shipPosition = new Float64Array([10, 30_000_020, 30]);
  const session = { x: 44, z: -91, yaw: 1.1, pitch: -0.2 };
  const first = solveSurfaceObserver({ body, shipPosition, session, terrainHeightMeters: 7, simulationTimeSeconds: 1234 });
  const snapshot = JSON.parse(JSON.stringify({ body: { ...body, position: [...body.position] }, shipPosition: [...shipPosition], session, elapsedSimSeconds: 1234 }));
  const restored = solveSurfaceObserver({ body: snapshot.body, shipPosition: snapshot.shipPosition, session: snapshot.session, terrainHeightMeters: 7, simulationTimeSeconds: snapshot.elapsedSimSeconds });
  assert.deepEqual([...restored.inertialPosition], [...first.inertialPosition]);
  assert.deepEqual([...restored.forward], [...first.forward]);
  assert.deepEqual([...restored.localUp], [...first.localUp]);
});

test('invalid observer inputs are bounded to finite values', () => {
  const model = new AstronomicalObserverModel();
  model.solveShip({ ship: { position: [NaN, Infinity, -Infinity], yaw: NaN, pitch: Infinity, roll: NaN }, simulationTimeSeconds: Infinity });
  model.updateBodies([{ id: 'bad', radius: Infinity, position: [NaN, Infinity, -Infinity] }]);
  assert.ok([...model.observer.inertialPosition, ...model.observer.forward, ...model.observer.right, ...model.observer.up].every(Number.isFinite));
  assert.equal(model.bodyObservations[0].finite, true);
});

test('observer model reuses body records and never mutates authoritative arrays', () => {
  const model = new AstronomicalObserverModel();
  const ship = { position: new Float64Array([2, 3, 4]), yaw: 0, pitch: 0, roll: 0 };
  const body = { id: 'body', radius: 2, position: new Float64Array([5, 7, 11]) };
  const beforeShip = [...ship.position], beforeBody = [...body.position];
  model.solveShip({ ship, simulationTimeSeconds: 1 });
  const first = model.updateBodies([body])[0];
  model.solveShip({ ship, simulationTimeSeconds: 2 });
  const second = model.updateBodies([body])[0];
  assert.equal(first, second);
  assert.deepEqual([...ship.position], beforeShip);
  assert.deepEqual([...body.position], beforeBody);
});
