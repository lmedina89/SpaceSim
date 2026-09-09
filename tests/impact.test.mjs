import test from 'node:test';
import assert from 'node:assert/strict';
import { impactEnergyJoules, impactReport } from '../src/physics/impactModel.js';

test('impact model uses reduced-mass kinetic energy', () => {
  const a = { mass: 1e12 }, b = { mass: 5e24 };
  const e = impactEnergyJoules(a, b, 30_000);
  assert.ok(Math.abs(e - 4.5e20) / 4.5e20 < 1e-9);
});

test('impact telemetry reports symmetric reduced-mass momentum and Q_R', () => {
  const a={mass:2e12},b={mass:6e12},v=12000;
  const r=impactReport(a,b,v);
  const mu=(a.mass*b.mass)/(a.mass+b.mass);
  assert.equal(r.reducedMassKg,mu);
  assert.equal(r.relativeMomentumKgMps,mu*v);
  assert.equal(r.specificImpactEnergyJkg,r.centerOfMassEnergyJ/(a.mass+b.mass));
});
