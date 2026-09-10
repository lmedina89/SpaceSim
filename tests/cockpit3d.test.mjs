import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cockpitSource = () => readFile(new URL('../src/render/cockpitView.js', import.meta.url), 'utf8');
const appSource = () => readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
const rendererSource = () => readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');

test('3D cockpit is camera-attached and exposes four live interactive MFDs', async () => {
  const src = await cockpitSource();
  assert.match(src, /camera\.add\(this\.group\)/);
  assert.match(src, /id: 'nav'.*action: 'nav-screen'/s);
  assert.match(src, /id: 'flight'.*action: 'flight-screen'/s);
  assert.match(src, /id: 'science'.*action: 'science-screen'/s);
  assert.match(src, /id: 'diagnostics'.*action: 'diagnostics-screen'/s);
  assert.match(src, /SYSTEM DIAGNOSTICS/);
  assert.match(src, /rendererBackend/);
  assert.match(src, /predictionMs/);
  assert.match(src, /experimentParticles/);
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


test('cockpit polish keeps MFD faces in front of the glare shield', async () => {
  const src = await cockpitSource();
  assert.match(src, /position: \[-0\.45, -0\.245, -0\.895\]/);
  assert.match(src, /position: \[0, -0\.235, -0\.905\]/);
  assert.match(src, /position: \[0\.45, -0\.245, -0\.895\]/);
  assert.match(src, /\[0, -0\.250, -0\.985\]/);
});

test('cockpit lighting is emissive-only and driven by live status', async () => {
  const src = await cockpitSource();
  for (const id of ['power', 'target', 'nav', 'propulsion', 'caution']) {
    assert.match(src, new RegExp(`id: '${id}'`));
  }
  assert.match(src, /setStatusLight\('target', Boolean\(t\.targetName\)\)/);
  assert.match(src, /setStatusLight\('nav'/);
  assert.match(src, /setStatusLight\('propulsion'/);
  assert.match(src, /setStatusLight\('caution', Boolean\(t\.braking\)\)/);
  assert.doesNotMatch(src, /new THREE\.PointLight/);
  assert.doesNotMatch(src, /new THREE\.SpotLight/);
});

test('FLIGHT MFD remains the system-menu entry while diagnostics has a dedicated engineering drawer', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await appSource();
  assert.doesNotMatch(html, /id="moreToggle"/);
  assert.match(html, /id="morePanel"/);
  assert.match(app, /case 'flight-screen':\s*this\.hud\.toggleMore\(true\)/s);
  assert.match(app, /case 'diagnostics-screen':[\s\S]*this\.hud\.toggleEngineering\(true\)/);
  assert.match(html, /id="cockpitRestore"/);
  assert.match(app, /#cockpitRestore.*toggleCockpit\(true\)/s);
});


test('integrated diagnostics MFD mirrors runtime telemetry without owning simulation state', async () => {
  const cockpit = await cockpitSource();
  const app = await appSource();
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(cockpit, /drawDiagnosticsScreen/);
  assert.match(cockpit, /LIVE · PILOT DEBUG BUS/);
  assert.match(cockpit, /TOUCH → ENGINEERING/);
  assert.match(app, /rendererBackend: this\.rendererBackend/);
  assert.match(app, /drawCalls: runtime\.drawCalls/);
  assert.match(app, /case 'diagnostics-screen':[\s\S]*this\.hud\.toggleEngineering\(true\)/);
  assert.match(css, /ship-cockpit-enabled \.top-hud \.stat\{display:none\}/);
  assert.match(css, /ship-cockpit-enabled \.seed-chip\{display:none\}/);
  assert.match(html, /id="rendererValue"/);
});


test('flight MFD becomes a FRAME status display without moving the diagnostics MFD', async()=>{
  const cockpit=await cockpitSource();
  assert.match(cockpit,/if \(t\.frameActive\)/);
  assert.match(cockpit,/FRAME DRIVE/);
  assert.match(cockpit,/MATCH TARGET/);
  assert.match(cockpit,/SPACECRAFT-ONLY/);
  assert.match(cockpit,/position: \[0\.755, 0\.150, -0\.815\]/);
});

test('mobile thrust overlay is compacted below the fixed diagnostics screen', async()=>{
  const css=await readFile(new URL('../styles.css', import.meta.url),'utf8');
  assert.match(css,/@media \(orientation:landscape\) and \(max-height:500px\)\{\.flight-controls\{[^}]*bottom:max\(26px/);
  assert.match(css,/grid-template-columns:64px 60px/);
  assert.match(css,/\.hold-button\.thrust b\{display:block;font-size:13px/);
});


test('all four cockpit MFDs use translucent smoked-glass presentation while telemetry text stays canvas-rendered', async()=>{
  const cockpit=await cockpitSource();
  assert.match(cockpit,/rgba\(7,19,28,\.82\)/);
  assert.match(cockpit,/rgba\(2,7,13,\.74\)/);
  assert.match(cockpit,/transparent: true/);
  assert.match(cockpit,/depthWrite: false/);
  assert.match(cockpit,/rgba\(4,19,28,\.80\)/);
});

test('diagnostics bezel and projector rail are slimmed without moving the accepted screen transform', async()=>{
  const cockpit=await cockpitSource();
  assert.match(cockpit,/bezelPadding: 0\.020, bezelDepth: 0\.018/);
  assert.match(cockpit,/\[0\.010, 0\.47, 0\.018\], \[0\.896, 0\.150, -0\.790\]/);
  assert.match(cockpit,/position: \[0\.755, 0\.150, -0\.815\]/);
});

test('engineering drawer mirrors diagnostics telemetry and is read-only', async()=>{
  const html=await readFile(new URL('../index.html', import.meta.url),'utf8');
  const hud=await readFile(new URL('../src/ui/hud.js', import.meta.url),'utf8');
  assert.match(html,/id="engineeringPanel"/);
  assert.match(html,/ENGINEERING \/ DIAGNOSTICS/);
  assert.match(html,/No flight controls · no physics authority/);
  for (const id of ['engineeringRenderer','engineeringFps','engineeringPhysics','engineeringRender','engineeringShipSpeed','engineeringSimTime','engineeringSeed','engineeringMajor','engineeringTest','engineeringDraw','engineeringPrediction','engineeringParticles','engineeringLab']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(hud,/toggleEngineering\(force\)/);
  assert.match(hud,/engineeringFps\.textContent/);
  assert.match(hud,/engineeringDraw\.textContent/);
});
