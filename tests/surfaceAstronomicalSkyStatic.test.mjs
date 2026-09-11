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
  assert.match(source, /createSurfacePhaseSphere/);
  assert.match(source, /compressedSkyShellDistance/);
  assert.match(source, /shellDistance \* Math\.sin\(angularRadius\)/);
  assert.match(source, /2 \* shellDistance \* Math\.tan\(angularRadius\)/);
  assert.doesNotMatch(source, /visualProxyDiameter/);
});

test('surface planets and moons derive phase from canonical target-to-star geometry', async () => {
  const source = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(source, /illuminationDirectionLocal/);
  assert.match(source, /stellarVisibilityAtBody/);
  assert.match(source, /const lambert = cosine \* visibility/);
  assert.match(source, /physical-stellar-disk/);
});

test('surface Sun lighting direction and brightness derive from the live finite-disk star observation', async () => {
  const source = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(source, /starObservation\?\.centerAltitudeRad/);
  assert.match(source, /starVisibleFraction: starObservation\?\.observerStarVisibleFraction/);
  assert.match(source, /this\.sun\.position\.set\(eye\[0\] \+ direction\[0\]/);
  assert.match(source, /this\.sun\.target\.position\.set\(eye\[0\], eye\[1\], eye\[2\]\)/);
  assert.match(source, /observed\.observerStarVisibleFraction/);
  assert.match(source, /this\.sun\.visible = observed\.visibleAboveHorizon/);
  assert.doesNotMatch(source, /sunSprite\.position\.set\(-1700, 1900, -2600\)/);
});

test('surface atmosphere changes visibility without deleting astronomical records', async () => {
  const source = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(source, /surfaceSkyExposure/);
  assert.match(source, /node\.material\.opacity = base/);
  assert.doesNotMatch(source, /astronomy\.bodies\.splice/);
});

test('surface daylight exposure is recomputed from immutable base colors instead of accumulating darkness', async () => {
  const source = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(source, /_baseBackgroundColor/);
  assert.match(source, /_baseFogColor/);
  assert.match(source, /background\.copy\(this\._baseBackgroundColor\)\.multiplyScalar/);
  assert.match(source, /fog\.color\.copy\(this\._baseFogColor\)\.multiplyScalar/);
  assert.doesNotMatch(source, /background\?\.multiplyScalar/);
});
