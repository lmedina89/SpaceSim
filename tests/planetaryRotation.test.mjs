import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bodyFixedDirectionToInertial,
  captureBodyFixedSurfaceAnchor,
  inertialDirectionToBodyFixed,
  localSolarTimeHours,
  rotationAngleAt,
  surfaceLatitudeLongitude,
} from '../src/core/planetaryRotation.js';
import { solveSurfaceObserver } from '../src/core/astronomicalObserver.js';

const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const separation = (a, b) => {
  const am = Math.hypot(...a), bm = Math.hypot(...b);
  const c = (a[0]*b[0] + a[1]*b[1] + a[2]*b[2]) / (am*bm);
  return Math.acos(Math.max(-1, Math.min(1, c)));
};

function rotatingBody() {
  return {
    id: 'planet',
    radius: 6_000_000,
    position: new Float64Array([1e9, -2e9, 3e9]),
    rotationPeriodSeconds: 100,
    rotationDirection: 1,
    rotationAxisInertial: [0, 1, 0],
    rotationPhaseRad: 0.37,
    rotationEpochSeconds: 0,
  };
}

test('body-fixed/inertial conversion round-trips at the same simulation instant', () => {
  const body = rotatingBody();
  const inertial = [0.3, 0.4, -0.5];
  const fixed = inertialDirectionToBodyFixed(body, inertial, 23);
  const restored = bodyFixedDirectionToInertial(body, fixed, 23);
  near(separation(inertial, restored), 0, 2e-8);
});

test('captured landing anchor follows rigid body rotation instead of remaining inertially frozen', () => {
  const body = rotatingBody();
  const landingPosition = [body.position[0] + body.radius, body.position[1], body.position[2]];
  const anchor = captureBodyFixedSurfaceAnchor(body, landingPosition, 0);
  const atStart = bodyFixedDirectionToInertial(body, anchor, 0);
  const quarterTurn = bodyFixedDirectionToInertial(body, anchor, 25);
  near(separation(atStart, quarterTurn), Math.PI / 2, 2e-8);
});

test('surface observer remains attached to translating body while its local up rotates with time', () => {
  const body = rotatingBody();
  const shipPosition = new Float64Array([body.position[0] + body.radius * 3, body.position[1], body.position[2]]);
  const anchor = [...captureBodyFixedSurfaceAnchor(body, shipPosition, 0)];
  const session = { x: 0, z: 0, yaw: 0, pitch: 0, bodyFixedAnchor: anchor };
  const first = solveSurfaceObserver({ body, shipPosition, session, simulationTimeSeconds: 0 });
  const firstUp = [...first.localUp];
  body.position[0] += 50_000;
  body.position[2] -= 20_000;
  const later = solveSurfaceObserver({ body, shipPosition, session, simulationTimeSeconds: 25 });
  near(separation(firstUp, later.localUp), Math.PI / 2, 2e-8);
  near(Math.hypot(
    later.inertialPosition[0] - body.position[0],
    later.inertialPosition[1] - body.position[1],
    later.inertialPosition[2] - body.position[2],
  ), body.radius + 1.72, 1e-5);
});

test('rotation angle and body-fixed latitude/longitude remain finite and periodic', () => {
  const body = rotatingBody();
  near(rotationAngleAt(body, 5), rotationAngleAt(body, 105), 1e-12);
  const coordinates = surfaceLatitudeLongitude([1, 0, 0]);
  near(coordinates.latitudeRad, 0);
  near(coordinates.longitudeRad, 0);
});


test('local solar time is noon at the substellar longitude and midnight opposite it', () => {
  const body = rotatingBody();
  const observerAnchor = [0.8, 0.2, 0.4];
  const starAtNoon = bodyFixedDirectionToInertial(body, observerAnchor, 17);
  near(localSolarTimeHours(body, observerAnchor, starAtNoon, 17), 12, 1e-10);
  const starAtMidnight = [-starAtNoon[0], -starAtNoon[1], -starAtNoon[2]];
  const midnight = localSolarTimeHours(body, observerAnchor, starAtMidnight, 17);
  assert.ok(midnight < 1e-10 || Math.abs(midnight - 24) < 1e-10, `expected midnight, got ${midnight}`);
});
