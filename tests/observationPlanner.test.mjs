import test from 'node:test';
import assert from 'node:assert/strict';
import { ObservationPlannerSearch, runObservationPlannerToCompletion } from '../src/navigation/observationPlanner.js';
import { generateSystem } from '../src/data/systemGenerator.js';

function body({ id, name = id, kind, mass = 0, radius = 1, position, velocity = [0, 0, 0], gravitySource = true, ...extra }) {
  return {
    id, name, kind, mass, radius, gravitySource,
    position: new Float64Array(position),
    velocity: new Float64Array(velocity),
    ...extra,
  };
}

test('observation planner predicts a finite stellar transit without mutating authoritative bodies', () => {
  const observer = body({ id: 'observer', kind: 'planet', radius: 1e6, position: [0, 0, 0], gravitySource: true });
  const star = body({ id: 'star', kind: 'star', radius: 5e7, position: [0, 0, 1e9], gravitySource: true });
  const occulter = body({ id: 'moon', kind: 'moon', radius: 8e6, position: [5e7, 0, 5e8], velocity: [-1e5, 0, 0], gravitySource: true });
  // Set masses tiny enough that the fixture is effectively linear while still using the real integrator.
  observer.mass = 1; star.mass = 1; occulter.mass = 1;
  const bodies = [star, observer, occulter];
  const before = bodies.map((b) => ({ p: [...b.position], v: [...b.velocity] }));
  const result = runObservationPlannerToCompletion({
    bodies,
    observerBodyId: observer.id,
    horizonSeconds: 1000,
    coarseStepSeconds: 50,
    refinementStepSeconds: 1,
    alignmentThresholdRad: 10 * Math.PI / 180,
  });
  assert.equal(result.status, 'complete');
  const event = result.events.find((entry) => entry.bodyId === occulter.id);
  assert.ok(event, 'expected a predicted stellar alignment');
  assert.ok(event.eclipseFraction > 0, 'expected finite stellar-disk overlap');
  assert.ok(['partial-eclipse', 'annular-transit', 'total-eclipse'].includes(event.type));
  assert.ok(Math.abs(event.secondsFromStart - 500) < 5, `crossing time ${event.secondsFromStart}`);
  for (let i = 0; i < bodies.length; i += 1) {
    assert.deepEqual([...bodies[i].position], before[i].p);
    assert.deepEqual([...bodies[i].velocity], before[i].v);
  }
});

test('incremental planner reports progress and reaches the same event window', () => {
  const bodies = [
    body({ id: 'star', kind: 'star', mass: 1, radius: 5e7, position: [0, 0, 1e9] }),
    body({ id: 'observer', kind: 'planet', mass: 1, radius: 1e6, position: [0, 0, 0] }),
    body({ id: 'moon', kind: 'moon', mass: 1, radius: 8e6, position: [5e7, 0, 5e8], velocity: [-1e5, 0, 0] }),
  ];
  const search = new ObservationPlannerSearch({ bodies, observerBodyId: 'observer', horizonSeconds: 1000, coarseStepSeconds: 50, refinementStepSeconds: 1 });
  let sawPartialProgress = false;
  while (!search.done) {
    const progress = search.stepChunk(3);
    if (progress.fraction > 0 && progress.fraction < 1) sawPartialProgress = true;
  }
  assert.equal(sawPartialProgress, true);
  const event = search.result().events.find((entry) => entry.bodyId === 'moon');
  assert.ok(event);
  assert.ok(Math.abs(event.secondsFromStart - 500) < 5);
});

test('surface-site reference stays tied to body-fixed rotation and returns horizon metadata', () => {
  const rotationPeriodSeconds = 1000;
  const bodies = [
    body({ id: 'star', kind: 'star', mass: 1, radius: 5e7, position: [0, 0, 1e9] }),
    body({
      id: 'observer', kind: 'planet', mass: 1, radius: 1e6, position: [0, 0, 0],
      rotationPeriodSeconds, rotationDirection: 1,
      rotationAxisInertial: new Float64Array([0, 1, 0]), rotationPhaseRad: 0, rotationEpochSeconds: 0,
      rotationModel: 'rigid-body-fixed-orbital-v2',
    }),
    body({ id: 'moon', kind: 'moon', mass: 1, radius: 2e6, position: [1e7, 0, 5e8], velocity: [-2e4, 0, 0] }),
  ];
  const result = runObservationPlannerToCompletion({
    bodies,
    observerBodyId: 'observer',
    surfaceSession: { bodyId: 'observer', x: 0, z: 0, yaw: 0, pitch: 0, bodyFixedAnchor: [1, 0, 0] },
    horizonSeconds: 1000,
    coarseStepSeconds: 50,
    refinementStepSeconds: 2,
  });
  assert.equal(result.reference.model, 'CURRENT LANDED SITE');
  for (const event of result.events) {
    assert.ok(event.starAltitudeRad === null || Number.isFinite(event.starAltitudeRad));
    assert.ok(event.aboveHorizon === null || typeof event.aboveHorizon === 'boolean');
  }
});

test('planner surfaces numerical work budget instead of silently claiming completion', () => {
  const bodies = [
    body({ id: 'star', kind: 'star', mass: 1.989e30, radius: 7e8, position: [0, 0, 0] }),
    body({ id: 'observer', kind: 'planet', mass: 5.9e24, radius: 6.4e6, position: [1.5e11, 0, 0], velocity: [0, 0, 29780] }),
    body({ id: 'moon', kind: 'moon', mass: 7.3e22, radius: 1.7e6, position: [1.504e11, 0, 0], velocity: [0, 0, 30800] }),
  ];
  const search = new ObservationPlannerSearch({ bodies, observerBodyId: 'observer', horizonSeconds: 30 * 86400, maxInternalSteps: 5 });
  while (!search.done) search.stepChunk(5);
  const result = search.result();
  assert.equal(result.status, 'budget-limited');
  assert.equal(result.accuracyLimited, true);
  assert.ok(result.reachedTimeSeconds < result.requestedEndTimeSeconds);
});


test('ORIGIN default observation planner returns finite events without mutating the canonical generated ephemeris', () => {
  const system = generateSystem('ORIGIN-001');
  const bodies = system.bodies ?? system;
  const observer = bodies.find((entry) => entry.kind === 'planet');
  assert.ok(observer, 'ORIGIN must provide a planetary observation reference');
  const before = bodies.map((entry) => ({
    id: entry.id,
    position: [...entry.position],
    velocity: [...entry.velocity],
  }));
  const result = runObservationPlannerToCompletion({
    bodies,
    observerBodyId: observer.id,
    horizonSeconds: 7 * 86400,
  });
  assert.equal(result.status, 'complete');
  assert.ok(result.events.length > 0, 'ORIGIN should provide at least one reportable stellar alignment in the 7-day fixture');
  for (const event of result.events) {
    assert.ok(Number.isFinite(event.timeSeconds));
    assert.ok(Number.isFinite(event.separationRad));
    assert.ok(Number.isFinite(event.starAngularRadiusRad));
    assert.ok(Number.isFinite(event.bodyAngularRadiusRad));
    assert.ok(event.eclipseFraction >= 0 && event.eclipseFraction <= 1);
    assert.ok(event.starVisibleFraction >= 0 && event.starVisibleFraction <= 1);
  }
  for (let index = 0; index < bodies.length; index += 1) {
    assert.equal(bodies[index].id, before[index].id);
    assert.deepEqual([...bodies[index].position], before[index].position);
    assert.deepEqual([...bodies[index].velocity], before[index].velocity);
  }
});
