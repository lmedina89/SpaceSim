import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('surface frame advances celestial time through a spacecraft-isolated world step', async () => {
  const source = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(source, /surfaceAstronomyStep\(dt\)/);
  assert.match(source, /this\.clock\.advance\(realDt, \(dt\) => this\.surfaceAstronomyStep\(dt\)/);
  const method = source.match(/surfaceAstronomyStep\(dt\) \{([\s\S]*?)\n  \}\n\n  frameSurface/);
  assert.ok(method, 'surface astronomy method should remain directly inspectable');
  assert.match(method[1], /this\.integrator\.step\(sources, dt\)/);
  assert.match(method[1], /this\.minorField\?\.step\(dt, sources\)/);
  assert.doesNotMatch(method[1], /this\.ship\.step\(/, 'parked spacecraft must not be integrated by ShipDynamics');
  assert.doesNotMatch(method[1], /updateNavigation\(/, 'surface celestial stepping must not own navigation');
});

test('surface entry captures a body-fixed anchor and preserves pause state instead of freezing by mode', async () => {
  const source = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(source, /captureBodyFixedSurfaceAnchor\(body, this\.ship\.position, this\.clock\.elapsedSimSeconds\)/);
  assert.match(source, /this\.running = previousRunning/);
  assert.match(source, /SURFACE 1×/);
});

test('old schema-1 saves backfill deterministic rotation metadata without replacing saved position or velocity', async () => {
  const source = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(source, /Rotation metadata is deterministic/);
  assert.match(source, /generated\.rotationAxisInertial/);
  assert.match(source, /const restored = restoreBody\(raw\)/);
});
