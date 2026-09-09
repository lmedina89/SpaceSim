import test from 'node:test';
import assert from 'node:assert/strict';
import { apparentAngularRadius, stellarPerceptualProfile } from '../src/render/stellarPerception.js';

test('perceptual stellar LOD preserves macro phenomena while reducing only distant micro detail', () => {
  const far = stellarPerceptualProfile(0.002);
  assert.ok(far.surfaceDetail < 0.05);
  assert.ok(far.microCorona < 0.3);
  assert.ok(far.distantMacroBoost > 1.25, 'macro prominence cues should be boosted rather than culled at long range');
  assert.equal(far.backgroundFactor, 1);
  assert.equal(far.exposure, 1);
});

test('close stellar views reveal surface detail and adapt exposure/background instead of flattening the star', () => {
  const near = stellarPerceptualProfile(0.55);
  assert.ok(near.surfaceDetail > 0.95);
  assert.ok(near.microCorona > 0.95);
  assert.ok(near.distantMacroBoost >= 1);
  assert.ok(near.backgroundFactor < 0.5);
  assert.ok(near.galacticBandFactor < near.backgroundFactor);
  assert.ok(near.exposure < 0.8 && near.exposure >= 0.66);
});

test('apparent angular radius grows smoothly with approach', () => {
  const radius = 70;
  const far = apparentAngularRadius(radius, 70_000);
  const medium = apparentAngularRadius(radius, 700);
  const near = apparentAngularRadius(radius, 90);
  assert.ok(far < medium && medium < near);
  assert.ok(Math.abs(near - Math.atan2(70, 90)) < 1e-12);
});
