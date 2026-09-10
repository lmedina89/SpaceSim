import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateSystem } from '../src/data/systemGenerator.js';
import { generateSurfaceRegion } from '../src/surface/surfaceGenerator.js';
import { createSurfaceSession, serializeSurfaceSession } from '../src/surface/surfaceSession.js';

test('surface HUD is compact by default and preserves expanded preference through surface save state', () => {
  const system = generateSystem('SURFHUD-PERSIST');
  const body = system.bodies.find((entry) => entry.id === system.homeId);
  const region = generateSurfaceRegion(system, body, 'shatterfall-basin');
  const fresh = createSurfaceSession(region);
  assert.equal(fresh.hudExpanded, false);
  fresh.hudExpanded = true;
  const restored = createSurfaceSession(region, serializeSurfaceSession(fresh));
  assert.equal(restored.hudExpanded, true);
});

test('compact surface shell keeps scan and sprint visible while save and takeoff live in details', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const compactStart = html.indexOf('<div class="surface-compact-bar">');
  const detailsStart = html.indexOf('<div id="surfaceHudDetails"');
  assert.ok(compactStart >= 0 && detailsStart > compactStart);
  for (const id of ['surfaceScanButton', 'surfaceSprintButton', 'surfaceHudToggle']) {
    const at = html.indexOf(`id="${id}"`);
    assert.ok(at > compactStart && at < detailsStart, `${id} should remain in compact controls`);
  }
  for (const id of ['surfaceSaveButton', 'surfaceTakeoffButton', 'surfaceAstronomyPause']) {
    assert.ok(html.indexOf(`id="${id}"`) > detailsStart, `${id} should be details-only`);
  }
});
