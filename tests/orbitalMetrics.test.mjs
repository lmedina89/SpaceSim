import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS } from '../src/core/constants.js';
import { osculatingMetrics } from '../src/physics/orbitalMetrics.js';

const v = (x,y,z) => new Float64Array([x,y,z]);

test('osculating metrics identify a circular orbit', () => {
  const target = { mass: PHYSICS.EARTH_MASS, radius: PHYSICS.EARTH_RADIUS, position: v(0,0,0), velocity: v(0,0,0) };
  const r = PHYSICS.EARTH_RADIUS + 400_000;
  const circular = Math.sqrt(PHYSICS.G * target.mass / r);
  const metrics = osculatingMetrics(v(r,0,0), v(0,0,circular), target);
  assert.ok(metrics.boundTwoBody);
  assert.ok(metrics.eccentricity < 1e-12, `eccentricity ${metrics.eccentricity}`);
  assert.ok(Math.abs(metrics.periapsisAltitudeMeters - 400_000) < 1e-3);
  assert.ok(Math.abs(metrics.apoapsisAltitudeMeters - 400_000) < 1e-3);
});
