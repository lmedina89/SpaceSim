import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateSystem } from '../src/data/systemGenerator.js';
import { stellarIrradianceForBody } from '../src/render/stellarIrradiance.js';

test('generated ORIGIN bodies receive finite distance-ordered stellar irradiance', () => {
  const system = generateSystem('ORIGIN-001');
  const star = system.bodies.find((body) => body.kind === 'star');
  const planets = system.bodies.filter((body) => body.kind === 'planet');
  assert.ok(star && planets.length >= 2);
  const records = planets.map((body) => ({ body, profile: stellarIrradianceForBody(body, star) }))
    .sort((a, b) => a.profile.earthFluxRatio - b.profile.earthFluxRatio);
  for (const { profile } of records) {
    assert.ok(Number.isFinite(profile.fluxWm2) && profile.fluxWm2 > 0);
    assert.ok(Number.isFinite(profile.earthFluxRatio) && profile.earthFluxRatio > 0);
    assert.ok(profile.displayGain >= 0.008 && profile.displayGain <= 5);
  }
  assert.ok(records.at(-1).profile.earthFluxRatio > records[0].profile.earthFluxRatio);
});

test('orbital and surface renderers consume the same read-only irradiance bridge', async () => {
  const factory = await readFile(new URL('../src/render/celestialFactory.js', import.meta.url), 'utf8');
  const surface = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(factory, /stellarIrradianceForBody/);
  assert.match(factory, /reflectedLightGain = stellarVisibility \* irradiance\.displayGain/);
  assert.match(surface, /stellarIrradiancePresentation/);
  assert.match(surface, /daylightGain \* exposure\.directStellarTransmission/);
  assert.match(surface, /\* daylightGain/);
});
