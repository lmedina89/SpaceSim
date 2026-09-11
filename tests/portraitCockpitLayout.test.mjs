import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cockpitSource = () => readFile(new URL('../src/render/cockpitView.js', import.meta.url), 'utf8');
const rendererSource = () => readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
const appSource = () => readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
const htmlSource = () => readFile(new URL('../index.html', import.meta.url), 'utf8');
const cssSource = () => readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('renderer forwards live viewport dimensions into the camera-attached cockpit', async () => {
  const renderer = await rendererSource();
  assert.match(renderer, /this\.cockpitView\?\.setViewport\(width, height\)/);
});

test('portrait cockpit keeps only the central FLIGHT MFD and restores accepted landscape transforms', async () => {
  const cockpit = await cockpitSource();
  assert.match(cockpit, /setViewport\(width, height\)/);
  assert.match(cockpit, /height > width/);
  assert.match(cockpit, /const visible = !portrait \|\| id === 'flight'/);
  assert.match(cockpit, /\[0, -0\.145, -1\.12\]/);
  assert.match(cockpit, /this\.applyScreenTransform\(entry, entry\.basePosition, entry\.baseRotation, 1\)/);
  assert.match(cockpit, /entry\.group\.visible = !portrait/);
  assert.match(cockpit, /entry\.bezel\.visible = visible && !\(portrait && id === 'flight'\)/);
});

test('hidden portrait cockpit objects cannot remain invisible ray-pick targets', async () => {
  const cockpit = await cockpitSource();
  assert.match(cockpit, /visibilityNode\.visible === false/);
  assert.match(cockpit, /if \(!visible\) continue/);
});

test('portrait cockpit exposes direct NAV FLIGHT SCI SYS shortcuts through existing app actions', async () => {
  const html = await htmlSource();
  const app = await appSource();
  for (const id of ['portraitNavMfd', 'portraitFlightMfd', 'portraitScienceMfd', 'portraitSystemMfd']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /#portraitNavMfd'.*handleCockpitAction\('nav-screen'\)/s);
  assert.match(app, /#portraitFlightMfd'.*handleCockpitAction\('flight-screen'\)/s);
  assert.match(app, /#portraitScienceMfd'.*handleCockpitAction\('science-screen'\)/s);
  assert.match(app, /#portraitSystemMfd'.*handleCockpitAction\('diagnostics-screen'\)/s);
});

test('portrait FLIGHT MFD lowers only glass background alpha while keeping telemetry texture opacity intact', async () => {
  const cockpit = await cockpitSource();
  assert.match(cockpit, /hudGlass \? 'rgba\(7,19,28,\.36\)' : 'rgba\(7,19,28,\.82\)'/);
  assert.match(cockpit, /hudGlass \? 'rgba\(2,7,13,\.24\)' : 'rgba\(2,7,13,\.74\)'/);
  assert.match(cockpit, /const portraitFlightHud = this\.viewportMode === 'portrait'/);
  assert.match(cockpit, /\{ hudGlass: portraitFlightHud \}/);
  assert.doesNotMatch(cockpit, /screen\.material\.opacity\s*=/);
});

test('portrait shortcut glass is deliberately translucent instead of an opaque center bar', async () => {
  const css = await cssSource();
  assert.match(css, /background:rgba\(2,8,15,\.38\)/);
  assert.match(css, /background:rgba\(5,15,25,\.40\)/);
  assert.match(css, /-webkit-backdrop-filter:blur\(7px\)/);
});

test('portrait CSS intentionally recomposes controls while landscape rules remain separate', async () => {
  const css = await cssSource();
  assert.match(css, /v0\.1\.5\.1\.2 portrait cockpit HUD glass/);
  assert.match(css, /@media \(orientation:portrait\)[\s\S]*\.ship-cockpit-enabled \.portrait-cockpit-tabs/s);
  assert.match(css, /\.ship-cockpit-enabled \.cockpit-live-status,.ship-cockpit-enabled \.cockpit-touch-hint\{display:none\}/);
  assert.match(css, /\.look-pad\{left:max\(8px,env\(safe-area-inset-left\)\);bottom:max\(70px/);
  assert.match(css, /\.flight-controls\{right:max\(8px,env\(safe-area-inset-right\)\);bottom:max\(70px/);
  assert.match(css, /@media \(orientation:landscape\) and \(max-height:500px\)/);
});
