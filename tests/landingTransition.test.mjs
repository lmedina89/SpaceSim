import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SURFACE_PHASE,
  SURFACE_TRANSITION_SECONDS,
  createLandingTransition,
  beginLandingTransition,
  setLandingPhase,
  stepLandingTransition,
  canEnterSurface,
  canWalkSurface,
  canRequestTakeoff,
} from '../src/surface/landingTransition.js';

test('landing lifecycle begins in orbit and blocks duplicate surface entry during transitions', () => {
  const state = createLandingTransition();
  assert.equal(state.phase, SURFACE_PHASE.ORBIT);
  assert.equal(canEnterSurface(state), true);
  beginLandingTransition(state, SURFACE_PHASE.DESCENDING, { durationSeconds: SURFACE_TRANSITION_SECONDS.descent, bodyId: 'p1', regionId: 'r1' });
  assert.equal(canEnterSurface(state), false);
  assert.equal(canWalkSurface(state), false);
  assert.equal(canRequestTakeoff(state), false);
});

test('descent completes deterministically into a state that can become landed', () => {
  const state = createLandingTransition();
  beginLandingTransition(state, SURFACE_PHASE.DESCENDING, { durationSeconds: 1 });
  let result = stepLandingTransition(state, 0.4);
  assert.equal(result.completed, false);
  assert.ok(result.progress > 0.39 && result.progress < 0.41);
  result = stepLandingTransition(state, 0.7);
  assert.equal(result.completed, true);
  setLandingPhase(state, SURFACE_PHASE.LANDED, { bodyId: 'p1', regionId: 'r1' });
  assert.equal(canWalkSurface(state), true);
  assert.equal(canRequestTakeoff(state), true);
});

test('ascent locks walking/takeoff until orbital handoff resets the lifecycle', () => {
  const state = createLandingTransition();
  setLandingPhase(state, SURFACE_PHASE.LANDED, { bodyId: 'p1', regionId: 'r1' });
  beginLandingTransition(state, SURFACE_PHASE.ASCENDING, { durationSeconds: 0.5, bodyId: 'p1', regionId: 'r1' });
  assert.equal(canWalkSurface(state), false);
  assert.equal(canRequestTakeoff(state), false);
  assert.equal(stepLandingTransition(state, 0.5).completed, true);
  setLandingPhase(state, SURFACE_PHASE.ORBIT);
  assert.equal(canEnterSurface(state), true);
});
