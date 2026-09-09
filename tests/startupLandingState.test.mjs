import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  SURFACE_PHASE,
  SURFACE_TRANSITION_SECONDS,
  createLandingTransition,
  beginLandingTransition,
  setLandingPhase,
  stepLandingTransition,
  canEnterSurface,
  canRequestTakeoff,
} from '../src/surface/landingTransition.js';

test('UniverseLabApp constructor initializes landing lifecycle and recovery guard before startup newSystem can use them', async () => {
  const source = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  const start = source.indexOf('  constructor(root) {');
  const end = source.indexOf('\n  get bodies()', start);
  assert.ok(start >= 0 && end > start, 'constructor source range must be discoverable');
  const constructorSource = source.slice(start, end);
  assert.match(constructorSource, /this\.surfaceTransition\s*=\s*createLandingTransition\(\)/);
  assert.match(constructorSource, /this\._surfaceRecoveryGuard\s*=\s*false/);

  const newSystemStart = source.indexOf('  newSystem(seed) {');
  const firstTransitionUse = source.indexOf('setLandingPhase(this.surfaceTransition', newSystemStart);
  assert.ok(firstTransitionUse > newSystemStart, 'newSystem should use the initialized landing state');
});

test('landing lifecycle supports descent, takeoff, orbital reset, then immediate second landing', () => {
  const state = createLandingTransition();
  assert.equal(canEnterSurface(state), true);

  beginLandingTransition(state, SURFACE_PHASE.DESCENDING, {
    durationSeconds: SURFACE_TRANSITION_SECONDS.descent,
    bodyId: 'planet',
    regionId: 'region',
  });
  assert.equal(stepLandingTransition(state, SURFACE_TRANSITION_SECONDS.descent).completed, true);
  setLandingPhase(state, SURFACE_PHASE.LANDED, { bodyId: 'planet', regionId: 'region' });
  assert.equal(canRequestTakeoff(state), true);

  beginLandingTransition(state, SURFACE_PHASE.ASCENDING, {
    durationSeconds: SURFACE_TRANSITION_SECONDS.ascent,
    bodyId: 'planet',
    regionId: 'region',
  });
  assert.equal(stepLandingTransition(state, SURFACE_TRANSITION_SECONDS.ascent).completed, true);
  setLandingPhase(state, SURFACE_PHASE.ORBIT);
  assert.equal(canEnterSurface(state), true);

  beginLandingTransition(state, SURFACE_PHASE.DESCENDING, {
    durationSeconds: SURFACE_TRANSITION_SECONDS.descent,
    bodyId: 'planet',
    regionId: 'region',
  });
  assert.equal(state.phase, SURFACE_PHASE.DESCENDING);
  assert.equal(canEnterSurface(state), false);
});
