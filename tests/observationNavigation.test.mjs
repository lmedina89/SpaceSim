import test from 'node:test';
import assert from 'node:assert/strict';
import { ParticleExperimentManager } from '../src/experiments/particles/particleExperimentManager.js';
import { computeObservationCameraPose } from '../src/render/observationCamera.js';
import { computeApproachAcceleration } from '../src/physics/flightComputer.js';
import { SIMULATION } from '../src/core/constants.js';

function context() {
  return {
    ship: {
      position: new Float64Array([0, 0, 0]),
      velocity: new Float64Array([0, 0, 0]),
      forward: () => [0, 0, -1],
    },
    system: { seed: 'OBS-TEST' },
    clock: { elapsedSimSeconds: 0 },
  };
}

test('particle fields spawn just outside their own extent instead of tens of thousands of km minimum', () => {
  const manager = new ParticleExperimentManager();
  const field = manager.spawnField(context(), {
    mode: 'life', count: 1000, radiusMeters: 2e6, neighborRadiusMeters: 2e5,
    initialSpeedMps: 0, localStrengthMps2: 20, majorGravity: false,
  });
  const d = Math.hypot(field.origin[0], field.origin[1], field.origin[2]);
  assert.ok(d >= field.radiusMeters + 1.49e6);
  assert.ok(d <= field.radiusMeters * 1.39 + 1.6e6);
  assert.ok(d < 10e6, `spawn distance ${d}`);
});

test('observation state exposes centroid, mean velocity, and framing radius without moving simulation state', () => {
  const manager = new ParticleExperimentManager();
  const field = manager.spawnField(context(), {
    mode: 'gravity', count: 500, radiusMeters: 5e6, neighborRadiusMeters: 5e5,
    initialSpeedMps: 100, localStrengthMps2: 0, majorGravity: false,
  });
  const p0 = field.position.slice(0, 12);
  const state = manager.observationState(field.id);
  assert.equal(state.id, field.id);
  assert.ok(Number.isFinite(state.center[0]) && Number.isFinite(state.velocity[2]));
  assert.ok(state.radiusMeters > 0);
  assert.deepEqual([...field.position.slice(0, 12)], [...p0]);
});

test('frame camera scales with experiment radius and does not require astronomical coordinates', () => {
  const small = computeObservationCameraPose({ radiusMeters: 1e6, metersPerRenderUnit: SIMULATION.metersPerRenderUnit, yaw: 0.5, pitch: 0.2 });
  const large = computeObservationCameraPose({ radiusMeters: 1e8, metersPerRenderUnit: SIMULATION.metersPerRenderUnit, yaw: 0.5, pitch: 0.2 });
  assert.ok(large.distance > small.distance);
  assert.deepEqual(small.lookAt, [0, 0, 0]);
  assert.ok(small.position.every(Number.isFinite));
});

test('track camera places camera behind mean experiment velocity', () => {
  const pose = computeObservationCameraPose({
    radiusMeters: 1e7,
    metersPerRenderUnit: SIMULATION.metersPerRenderUnit,
    style: 'track',
    velocity: [1000, 0, 0],
  });
  assert.ok(pose.position[0] < 0, `expected behind +X motion, got ${pose.position[0]}`);
});

test('massless experiment rendezvous target still receives bounded physical approach acceleration', () => {
  const ship = { position: new Float64Array([0,0,0]), velocity: new Float64Array([0,0,0]) };
  const target = { mass: 0, radius: 2e6, position: new Float64Array([20e6,0,0]), velocity: new Float64Array([0,0,0]), kind: 'experiment' };
  const command = computeApproachAcceleration(ship, target, 120, 1);
  const accel = Math.hypot(...command.acceleration);
  assert.ok(accel > 0 && accel <= 120 + 1e-9);
  assert.ok(command.standOffDistance > target.radius);
});
