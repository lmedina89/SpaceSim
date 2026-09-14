import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rendererSource = () => readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
const cockpitSource = () => readFile(new URL('../src/render/cockpitView.js', import.meta.url), 'utf8');

test('ship view composites world then cockpit with a depth-only clear', async () => {
  const source = await rendererSource();
  const method = source.slice(source.indexOf('renderWorldWithCockpitOverlay()'), source.indexOf('renderShipView('));
  const worldPass = method.indexOf('this.renderer.render(this.scene, this.camera)');
  const preserveColor = method.indexOf('this.renderer.autoClear = false');
  const clearDepth = method.indexOf('this.renderer.clearDepth()');
  const cockpitLayer = method.indexOf('this.camera.layers.set(COCKPIT_RENDER_LAYER)');
  const cockpitPass = method.indexOf('this.renderer.render(this.scene, this.camera)', worldPass + 1);
  assert.ok(worldPass >= 0);
  assert.ok(worldPass < preserveColor && preserveColor < clearDepth && clearDepth < cockpitLayer && cockpitLayer < cockpitPass);
  assert.match(method, /finally \{[\s\S]*camera\.layers\.mask = previousCameraLayerMask[\s\S]*renderer\.autoClear = previousAutoClear/);
});

test('cockpit descendants use a dedicated render layer while world remains layer zero', async () => {
  const renderer = await rendererSource();
  const cockpit = await cockpitSource();
  assert.match(renderer, /const WORLD_RENDER_LAYER = 0/);
  assert.match(cockpit, /export const COCKPIT_RENDER_LAYER = 1/);
  assert.match(cockpit, /this\.group\.traverse\(\(node\) => node\.layers\.set\(COCKPIT_RENDER_LAYER\)\)/);
  assert.match(renderer, /this\.camera\.layers\.set\(WORLD_RENDER_LAYER\)/);
});

test('cockpit pass keeps internal depth and translucent MFD blending', async () => {
  const cockpit = await cockpitSource();
  assert.match(cockpit, /transparent: true/);
  assert.match(cockpit, /depthWrite: false/);
  assert.doesNotMatch(cockpit, /depthTest:\s*false/);
});

test('cockpit picking selects and restores the dedicated raycaster layer', async () => {
  const cockpit = await cockpitSource();
  const pick = cockpit.slice(cockpit.indexOf('pick(clientX'), cockpit.indexOf('dispose()'));
  assert.match(pick, /previousLayerMask = raycaster\.layers\.mask/);
  assert.match(pick, /raycaster\.layers\.set\(COCKPIT_RENDER_LAYER\)/);
  assert.match(pick, /finally \{[\s\S]*raycaster\.layers\.mask = previousLayerMask/);
});

test('multi-pass diagnostics reset once per frame and aggregate both passes', async () => {
  const renderer = await rendererSource();
  assert.match(renderer, /this\.renderer\.info\.autoReset = false/);
  assert.match(renderer, /beginRenderFrame\(\) \{[\s\S]*this\.renderer\.info\?\.reset\?\.\(\)/);
  assert.match(renderer, /renderShipView\([\s\S]*this\.beginRenderFrame\(\);[\s\S]*this\.renderWorldWithCockpitOverlay\(\)/);
});

test('observation and surface modes remain single-world-pass paths', async () => {
  const renderer = await rendererSource();
  const observation = renderer.slice(renderer.indexOf('renderObservationView('), renderer.indexOf('render({ bodies'));
  assert.match(observation, /this\.camera\.layers\.set\(WORLD_RENDER_LAYER\)/);
  assert.doesNotMatch(observation, /renderWorldWithCockpitOverlay/);
  const surface = renderer.slice(renderer.indexOf('renderSurface('), renderer.indexOf('getStats()'));
  assert.match(surface, /this\.surfaceWorld\.render/);
  assert.doesNotMatch(surface, /renderWorldWithCockpitOverlay/);
});
