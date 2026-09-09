import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('surface world consumes the shared inertial catalog and canonical astronomical solution', async () => {
  const source = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(source, /createStarfieldView\(this\.starCatalog/);
  assert.match(source, /horizonOnly:\s*true/);
  assert.match(source, /surface-inertial-starfield/);
  assert.match(source, /astronomy\.bodies/);
  assert.match(source, /observed\.visibleAboveHorizon/);
  assert.match(source, /observed\.apparentAngularRadiusRad/);
  assert.match(source, /physicalDiameterAtSkyShell/);
  assert.match(source, /visualProxyDiameter/);
});

test('surface Sun lighting direction is derived from the live star observation', async () => {
  const source = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(source, /starObservation\?\.centerAltitudeRad/);
  assert.match(source, /this\.sun\.position\.set\(eye\[0\] \+ direction\[0\]/);
  assert.match(source, /this\.sun\.visible = observed\.visibleAboveHorizon/);
  assert.doesNotMatch(source, /sunSprite\.position\.set\(-1700, 1900, -2600\)/);
});

test('surface atmosphere changes visibility without deleting astronomical records', async () => {
  const source = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(source, /surfaceSkyExposure/);
  assert.match(source, /node\.material\.opacity = base/);
  assert.doesNotMatch(source, /astronomy\.bodies\.splice/);
});
