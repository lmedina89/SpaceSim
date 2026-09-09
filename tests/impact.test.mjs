import test from 'node:test';
import assert from 'node:assert/strict';
import { impactEnergyJoules } from '../src/physics/impactModel.js';

test('impact model uses reduced-mass kinetic energy', () => {
  const a = { mass: 1e12 }, b = { mass: 5e24 };
  const e = impactEnergyJoules(a, b, 30_000);
  assert.ok(Math.abs(e - 4.5e20) / 4.5e20 < 1e-9);
});
