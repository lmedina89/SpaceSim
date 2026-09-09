import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS } from '../src/core/constants.js';
import { DirectGravitySolver } from '../src/physics/gravity/directGravitySolver.js';

const v = (x,y,z) => new Float64Array([x,y,z]);

test('solar gravity at 1 AU matches GM/r^2', () => {
  const sun = { mass: PHYSICS.SOLAR_MASS, position: v(0,0,0), gravitySource: true };
  const earth = { mass: PHYSICS.EARTH_MASS, position: v(PHYSICS.AU,0,0), gravitySource: true };
  const out = new DirectGravitySolver().computeAccelerations([sun, earth]);
  const expected = PHYSICS.G * PHYSICS.SOLAR_MASS / (PHYSICS.AU * PHYSICS.AU);
  const actual = Math.abs(out[3]);
  assert.ok(Math.abs(actual - expected) / expected < 1e-12);
});
