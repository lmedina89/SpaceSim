import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SURFACE_PHASE, validateOrbitHandoff } from '../src/surface/landingTransition.js';

function methodSource(source, name, nextName) {
  const start = source.indexOf(`  ${name}(`);
  const end = source.indexOf(`\n  ${nextName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `${name} source range must be discoverable`);
  return source.slice(start, end);
}

test('orbital handoff invariant accepts only a fully detached finite ship-view state', () => {
  const clean = validateOrbitHandoff({
    phase: SURFACE_PHASE.ORBIT,
    sessionActive: false,
    regionActive: false,
    rendererSurfaceActive: false,
    rootSurfaceActive: false,
    cameraMode: 'ship',
    timeScale: 1,
    shipPosition: new Float64Array([1, 2, 3]),
    shipVelocity: new Float64Array([4, 5, 6]),
  });
  assert.equal(clean.ok, true);
  assert.deepEqual(clean.problems, []);

  const stale = validateOrbitHandoff({
    phase: SURFACE_PHASE.ORBIT,
    sessionActive: true,
    regionActive: true,
    rendererSurfaceActive: true,
    rootSurfaceActive: true,
    cameraMode: 'ship',
    timeScale: 1,
    shipPosition: new Float64Array([1, 2, 3]),
    shipVelocity: new Float64Array([4, 5, 6]),
  });
  assert.equal(stale.ok, false);
  assert.match(stale.problems.join(' | '), /surfaceSession still active/);
  assert.match(stale.problems.join(' | '), /surface renderer still active/);
});

test('orbital handoff invariant rejects wrong camera, warp, and non-finite ship state', () => {
  const bad = validateOrbitHandoff({
    phase: SURFACE_PHASE.ASCENDING,
    cameraMode: 'observe',
    timeScale: 60,
    shipPosition: [NaN, 0, 0],
    shipVelocity: [0, Infinity, 0],
  });
  assert.equal(bad.ok, false);
  const joined = bad.problems.join(' | ');
  assert.match(joined, /phase=ascending/);
  assert.match(joined, /cameraMode=observe/);
  assert.match(joined, /timeScale=60/);
  assert.match(joined, /ship position is not finite/);
  assert.match(joined, /ship velocity is not finite/);
});

test('ascent queues success until a real orbital render commits the handoff', async () => {
  const source = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  const complete = methodSource(source, 'completeSurfaceAscent', 'commitSurfaceOrbitHandoff');
  const commit = methodSource(source, 'commitSurfaceOrbitHandoff', 'updateSurface');
  const frame = methodSource(source, 'frame', 'serialize');

  assert.match(complete, /this\._surfaceOrbitHandoffPending\s*=\s*\{/);
  assert.doesNotMatch(complete, /ASCENT COMPLETE:/, 'success must not be announced before an orbital frame renders');
  assert.match(commit, /Post-render orbital handoff invariant failed/);
  assert.match(commit, /ASCENT COMPLETE:/);

  const surfaceCall = frame.indexOf('this.frameSurface(now, realDt);');
  const conditionalReturn = frame.indexOf('if (this.surfaceSession?.active) return;', surfaceCall);
  const orbitalRender = frame.indexOf('this.renderer.render({', conditionalReturn);
  const handoffCommit = frame.indexOf('this.commitSurfaceOrbitHandoff()', orbitalRender);
  assert.ok(surfaceCall >= 0, 'frame must enter the surface path');
  assert.ok(conditionalReturn > surfaceCall, 'frame may return only if the surface is still active after update');
  assert.ok(orbitalRender > conditionalReturn, 'completed ascent must fall through to the orbital renderer in the same animation callback');
  assert.ok(handoffCommit > orbitalRender, 'ASCENT COMPLETE commit must occur only after the orbital render call');
  assert.match(frame, /const orbitalRealDt = this\._surfaceOrbitHandoffPending \? 0 : realDt/);
});

test('surface renderer detaches ownership before disposing its local world', async () => {
  const source = await readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
  const start = source.indexOf('  exitSurface() {');
  const end = source.indexOf('\n  renderSurface(', start);
  assert.ok(start >= 0 && end > start);
  const method = source.slice(start, end);
  const detach = method.indexOf('this.surfaceWorld = null;');
  const dispose = method.indexOf('surfaceWorld?.dispose();');
  assert.ok(detach >= 0 && dispose > detach, 'surface renderer ownership must be cleared before disposal can throw');
  assert.match(method, /finally\s*\{/);
});
