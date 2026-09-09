import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('normal SHIP VIEW has an isolated render path and observation is opt-in only', async () => {
  const renderer = await readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
  assert.match(renderer, /renderShipView\(/);
  assert.match(renderer, /renderObservationView\(/);
  assert.match(renderer, /const observing = Boolean\(cameraView && cameraView\.mode === 'observe' && cameraView\.center\)/);
  assert.match(renderer, /if \(!observing\) \{\s*this\.renderShipView/);
  assert.match(renderer, /referenceFrame\.centerOn\(observer\?\.inertialPosition \?\? ship\.position\)/);
});

test('runtime frame failures are surfaced in the HUD instead of silently freezing', async () => {
  const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  const hud = await readFile(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  assert.match(app, /try \{\s*this\.frame\(time\)/);
  assert.match(app, /this\.hud\.showRuntimeError\(error\)/);
  assert.match(hud, /showRuntimeError\(error\)/);
  assert.match(hud, /RUNTIME ERROR:/);
});
