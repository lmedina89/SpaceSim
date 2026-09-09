import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS } from '../src/core/constants.js';
import { TrajectoryPredictor } from '../src/physics/trajectoryPredictor.js';

const v = (x,y,z) => new Float64Array([x,y,z]);

test('trajectory predictor keeps a low Earth circular trajectory bounded for one orbit', () => {
  const earth = { id:'earth', name:'Earth', mass:PHYSICS.EARTH_MASS, radius:PHYSICS.EARTH_RADIUS, gravitySource:true, position:v(0,0,0), velocity:v(0,0,0) };
  const r = PHYSICS.EARTH_RADIUS + 400_000;
  const speed = Math.sqrt(PHYSICS.G * earth.mass / r);
  const period = 2 * Math.PI * Math.sqrt(r ** 3 / (PHYSICS.G * earth.mass));
  const predictor = new TrajectoryPredictor();
  const result = predictor.predict({ mass:12_000, radius:3, position:v(r,0,0), velocity:v(0,0,speed) }, [earth], period, 360, 'earth');
  assert.equal(result.impact, null);
  const k = result.points.length - 3;
  const finalR = Math.hypot(result.points[k], result.points[k+1], result.points[k+2]);
  assert.ok(Math.abs(finalR-r)/r < 0.002, `radius drift ${(finalR-r)/r}`);
});

test('trajectory predictor reports swept finite-radius impact', () => {
  const target = { id:'target', name:'Target', mass:1e18, radius:1_000, gravitySource:true, position:v(0,0,0), velocity:v(0,0,0) };
  const result = new TrajectoryPredictor().predict({ mass:1e6, radius:10, position:v(-10_000,0,0), velocity:v(2_000,0,0) }, [target], 10, 100, 'target');
  assert.equal(result.impact?.bodyId, 'target');
  assert.ok(result.impact.timeSeconds > 0 && result.impact.timeSeconds < 10);
});
