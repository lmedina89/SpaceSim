import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('surface ship renderer includes smoother spacecraft identity and transition FX', async () => {
  const source = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  for (const token of ['createLandedShip','CylinderGeometry(2.9, 3.45, 15.5, 20','SphereGeometry(2.65, 24, 14','makeWing','vtolPlumes','createShipTransitionFx','updateShipTransition']) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
});

test('app gates takeoff on boarding distance and uses guarded ascent handoff', async () => {
  const source = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(source, /const boardingRadius = 36/);
  assert.match(source, /RETURN TO SHIP/);
  assert.match(source, /beginLandingTransition\(this\.surfaceTransition, SURFACE_PHASE\.ASCENDING/);
  assert.match(source, /completeSurfaceAscent\(\)/);
  assert.match(source, /recoverSurfaceRuntime/);
  assert.match(source, /simulationRunning/);
});
