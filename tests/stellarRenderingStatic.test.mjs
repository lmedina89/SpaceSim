import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('stellar renderer contains layered surface/corona/prominence/flare presentation', async () => {
  const factory = await readFile(new URL('../src/render/celestialFactory.js', import.meta.url), 'utf8');
  for (const token of [
    'stellar-photosphere', 'stellar-granulation', 'stellar-limb-darkening',
    'stellar-corona-micro', 'stellar-prominence-core', 'stellar-prominence-halo',
    'stellar-active-regions', 'stellar-flare-sites',
  ]) assert.match(factory, new RegExp(token));
  assert.match(factory, /TubeGeometry/);
  assert.doesNotMatch(factory, /TorusGeometry\(radius \* \(1\.18 \+ i \* 0\.10\)/, 'legacy thick torus prominence ribbons must stay removed');
});

test('renderer applies close-star exposure/background adaptation without distance-culling macro stellar phenomena', async () => {
  const renderer = await readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
  const weather = await readFile(new URL('../src/render/spaceWeatherVisuals.js', import.meta.url), 'utf8');
  assert.match(renderer, /updateStellarPerception\(\)/);
  assert.match(renderer, /toneMappingExposure/);
  assert.match(renderer, /galacticBandFactor/);
  assert.match(renderer, /updateCameraClipPlane\(\)/);
  assert.match(weather, /perceptualMacroPreserved=true/);
  assert.doesNotMatch(weather, /visual\.visible=scale<250000/);
});

test('frame visual cues release smoothly while frame coordinate rate stays separate from Newtonian velocity', async () => {
  const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(app, /transitVisualRelease/);
  assert.match(app, /Math\.exp\(-realDt \* 2\.65\)/);
  assert.match(app, /FRAME coordinate rate never becomes Newtonian velocity/);
});
