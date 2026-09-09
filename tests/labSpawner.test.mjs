import test from 'node:test';
import assert from 'node:assert/strict';
import { sphereRadiusFromMassDensity } from '../src/experiments/labSpawner.js';

test('mass launcher derives radius from spherical bulk density', () => {
  const density=3000, radius=1000;
  const mass=(4/3)*Math.PI*radius**3*density;
  assert.ok(Math.abs(sphereRadiusFromMassDensity(mass,density)-radius)<1e-9);
});
