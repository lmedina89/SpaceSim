import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS, BODY_KIND } from '../src/core/constants.js';
import { hillRadiusMeters, rocheLimitMeters, lagrangePointEstimates, gravityAccelerationAt, gravityVectorSamples, orbitalPlaneBasis } from '../src/cosmic/scientificOverlays.js';

test('Earth-like Hill and Roche diagnostic scales are finite and plausible', () => {
  const hill = hillRadiusMeters(PHYSICS.SOLAR_MASS, PHYSICS.EARTH_MASS, PHYSICS.AU, 0.0167);
  assert.ok(hill > 1.3e9 && hill < 1.7e9, `hill=${hill}`);
  const roche = rocheLimitMeters(PHYSICS.EARTH_RADIUS, 5514, 3000, true);
  assert.ok(roche > PHYSICS.EARTH_RADIUS * 2 && roche < PHYSICS.EARTH_RADIUS * 4.5, `roche=${roche}`);
});

test('instantaneous L4/L5 estimates form near-equilateral geometry', () => {
  const primary = { mass: PHYSICS.SOLAR_MASS, position: new Float64Array([0,0,0]), velocity: new Float64Array([0,0,0]) };
  const secondary = { mass: PHYSICS.EARTH_MASS, position: new Float64Array([PHYSICS.AU,0,0]), velocity: new Float64Array([0,0,29_780]) };
  const pts = lagrangePointEstimates(primary, secondary);
  assert.equal(pts.length, 5);
  const l4 = pts.find((p)=>p.label==='L4').position;
  const dPrimary = Math.hypot(l4[0],l4[1],l4[2]);
  const dSecondary = Math.hypot(l4[0]-PHYSICS.AU,l4[1],l4[2]);
  assert.ok(Math.abs(dPrimary-PHYSICS.AU)/PHYSICS.AU < 1e-10);
  assert.ok(Math.abs(dSecondary-PHYSICS.AU)/PHYSICS.AU < 1e-10);
});

test('gravity vector samples use live Newtonian sources', () => {
  const star = { kind: BODY_KIND.STAR, mass: PHYSICS.SOLAR_MASS, gravitySource: true, position: new Float64Array([0,0,0]) };
  const p = [PHYSICS.AU,0,0];
  const a = gravityAccelerationAt(p,[star]);
  assert.ok(a[0] < 0);
  assert.ok(Math.abs(Math.hypot(...a) - PHYSICS.G*PHYSICS.SOLAR_MASS/(PHYSICS.AU**2)) < 1e-12);
  const samples = gravityVectorSamples(p,[star],1e9,5);
  assert.equal(samples.length,25);
  assert.ok(samples.every((s)=>Number.isFinite(s.magnitudeMps2)));
});

test('orbital plane basis is orthonormal enough for overlay drawing', () => {
  const primary={position:new Float64Array([0,0,0]),velocity:new Float64Array([0,0,0])};
  const secondary={position:new Float64Array([1e9,0,0]),velocity:new Float64Array([0,0,1000])};
  const b=orbitalPlaneBasis(primary,secondary);
  assert.ok(b);
  const dot=b.x[0]*b.y[0]+b.x[1]*b.y[1]+b.x[2]*b.y[2];
  assert.ok(Math.abs(dot)<1e-12);
  assert.equal(b.radiusMeters,1e9);
});
