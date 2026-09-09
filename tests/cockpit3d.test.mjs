import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cockpitSource = () => readFile(new URL('../src/render/cockpitView.js', import.meta.url), 'utf8');
const appSource = () => readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
const rendererSource = () => readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');

test('3D cockpit is camera-attached and exposes three live interactive MFDs', async () => {
  const src = await cockpitSource();
  assert.match(src, /camera\.add\(this\.group\)/);
  assert.match(src, /id: 'nav'.*action: 'nav-screen'/s);
  assert.match(src, /id: 'flight'.*action: 'flight-screen'/s);
  assert.match(src, /id: 'science'.*action: 'science-screen'/s);
  assert.match(src, /CanvasTexture/);
  assert.match(src, /SCREEN_UPDATE_MS/);
});

test('every visible physical cockpit key maps to a real action', async () => {
  const src = await cockpitSource();
  const expected = [
    ['MAP', 'nav-map'], ['TGT', 'target-cycle'], ['APPR', 'approach'],
    ['ENG', 'engine-cycle'], ['PRO', 'prograde'], ['RET', 'retrograde'],
    ['SCAN', 'scanner'], ['SCI', 'science'], ['OVR', 'overlays'],
  ];
  for (const [label, action] of expected) {
    assert.match(src, new RegExp(`\\['${label}', '${action}'`));
  }
});

test('cockpit picking is routed before celestial body picking', async () => {
  const app = await appSource();
  const cockpitIndex = app.indexOf('pickCockpitControl(event.clientX, event.clientY)');
  const bodyIndex = app.indexOf('pickBodyAt(event.clientX, event.clientY)');
  assert.ok(cockpitIndex > 0);
  assert.ok(bodyIndex > cockpitIndex);
  assert.match(app, /handleCockpitAction\(cockpitAction\)/);
});

test('cockpit actions reuse existing app systems instead of owning simulation state', async () => {
  const app = await appSource();
  for (const token of ['handleCockpitAction(action)', 'cycleTarget()', 'setNavigationMode(', 'cycleEngineMode()', 'alignVelocityAttitude(1)', 'alignVelocityAttitude(-1)', 'toggleScanner(true)', 'toggleScience(true)', 'toggleOverlays(true)']) {
    assert.ok(app.includes(token), `missing cockpit action route: ${token}`);
  }
});

test('renderer owns only cockpit visibility telemetry and picking bridge', async () => {
  const renderer = await rendererSource();
  assert.match(renderer, /new CockpitView\(this\.camera\)/);
  assert.match(renderer, /setCockpitVisible\(visible\)/);
  assert.match(renderer, /updateCockpitTelemetry\(telemetry/);
  assert.match(renderer, /pickCockpitControl\(clientX, clientY\)/);
});
