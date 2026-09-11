import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS } from '../src/core/constants.js';
import { EARTH_REFERENCE_FLUX_WM2, stellarIrradianceForBody, stellarIrradiancePresentation } from '../src/render/stellarIrradiance.js';

test('stellar irradiance presentation matches the canonical solar flux at 1 AU', () => {
  const profile = stellarIrradiancePresentation(1, PHYSICS.AU);
  assert.ok(Math.abs(profile.fluxWm2 - 1361.166) < 0.5, profile.fluxWm2);
  assert.ok(Math.abs(profile.fluxWm2 - EARTH_REFERENCE_FLUX_WM2) < 1e-9);
  assert.ok(Math.abs(profile.earthFluxRatio - 1) < 1e-12);
  assert.equal(profile.displayGain, 1);
});

test('stellar irradiance preserves physical inverse-square flux while applying square-root HDR display compression', () => {
  const halfAu = stellarIrradiancePresentation(1, PHYSICS.AU * 0.5);
  const twoAu = stellarIrradiancePresentation(1, PHYSICS.AU * 2);
  const twiceL = stellarIrradiancePresentation(2, PHYSICS.AU);
  assert.ok(Math.abs(halfAu.earthFluxRatio - 4) < 1e-12);
  assert.ok(Math.abs(twoAu.earthFluxRatio - 0.25) < 1e-12);
  assert.ok(Math.abs(twiceL.earthFluxRatio - 2) < 1e-12);
  assert.equal(halfAu.displayGain, 2);
  assert.equal(twoAu.displayGain, 0.5);
  assert.ok(Math.abs(twiceL.displayGain - Math.sqrt(2)) < 1e-12);
});

test('presentation gain is bounded without changing the reported physical flux', () => {
  const bright = stellarIrradiancePresentation(1, PHYSICS.AU * 0.1);
  const dim = stellarIrradiancePresentation(1, PHYSICS.AU * 200);
  assert.ok(bright.earthFluxRatio > 90);
  assert.equal(bright.displayGain, 5);
  assert.equal(bright.clippedHigh, true);
  assert.ok(dim.earthFluxRatio < 0.0001);
  assert.equal(dim.displayGain, 0.008);
  assert.equal(dim.clippedLow, true);
});

test('body helper reads live body-star geometry without mutating it', () => {
  const star = { luminositySolar: 1.5, position: new Float64Array([0, 0, 0]) };
  const body = { position: new Float64Array([PHYSICS.AU, 0, 0]) };
  const before = [...body.position];
  const profile = stellarIrradianceForBody(body, star);
  assert.ok(Math.abs(profile.earthFluxRatio - 1.5) < 1e-12);
  assert.deepEqual([...body.position], before);
});

test('renderer can reuse an irradiance output record without per-frame result allocation', () => {
  const out = {};
  const a = stellarIrradiancePresentation(1, PHYSICS.AU, out);
  const b = stellarIrradiancePresentation(1, PHYSICS.AU * 2, out);
  assert.equal(a, out);
  assert.equal(b, out);
  assert.ok(Math.abs(out.earthFluxRatio - 0.25) < 1e-12);
  assert.equal(out.displayGain, 0.5);
});
