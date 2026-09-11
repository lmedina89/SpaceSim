import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import { AstronomicalObserverModel } from '../src/core/astronomicalObserver.js';

function createShip(system) {
  const planet = system.bodies.find((body) => body.kind === 'planet');
  return {
    position: new Float64Array([
      planet.position[0] + planet.radius * 8,
      planet.position[1] + planet.radius * 2,
      planet.position[2] - planet.radius * 4,
    ]),
    yaw: 0,
    pitch: 0,
    roll: 0,
  };
}

test('ORIGIN appearance solution stays finite and bounded for every generated major body', () => {
  const system = generateSystem('ORIGIN-001');
  const model = new AstronomicalObserverModel();
  const ship = createShip(system);
  model.solveShip({ ship, simulationTimeSeconds: 12345 });
  const observations = model.updateBodies(system.bodies);
  assert.equal(observations.length, system.bodies.length);
  for (const observed of observations) {
    assert.ok(Number.isFinite(observed.angularDiameterRad));
    assert.ok(observed.angularDiameterRad >= 0 && observed.angularDiameterRad <= Math.PI);
    assert.ok(Number.isFinite(observed.phaseAngleRad));
    assert.ok(observed.phaseAngleRad >= 0 && observed.phaseAngleRad <= Math.PI);
    assert.ok(Number.isFinite(observed.illuminatedFraction));
    assert.ok(observed.illuminatedFraction >= 0 && observed.illuminatedFraction <= 1);
    assert.ok(Number.isFinite(observed.stellarVisibilityAtBody));
    assert.ok(observed.stellarVisibilityAtBody >= 0 && observed.stellarVisibilityAtBody <= 1);
    assert.ok(Number.isFinite(observed.stellarEclipseFraction));
    assert.ok(observed.stellarEclipseFraction >= 0 && observed.stellarEclipseFraction <= 1);
  }
});

test('appearance refresh cadence reuses records and preserves authoritative body arrays', () => {
  const system = generateSystem('ORIGIN-001');
  const model = new AstronomicalObserverModel();
  const ship = createShip(system);
  const before = system.bodies.map((body) => ({ id: body.id, position: [...body.position], velocity: [...body.velocity] }));
  model.solveShip({ ship, simulationTimeSeconds: 100 });
  const first = model.updateBodies(system.bodies);
  const phaseSnapshot = first.map((record) => record.illuminatedFraction);
  model.solveShip({ ship, simulationTimeSeconds: 100.01 });
  const second = model.updateBodies(system.bodies);
  assert.equal(first[0], second[0]);
  assert.deepEqual(second.map((record) => record.illuminatedFraction), phaseSnapshot);
  for (const state of before) {
    const body = system.bodies.find((candidate) => candidate.id === state.id);
    assert.deepEqual([...body.position], state.position);
    assert.deepEqual([...body.velocity], state.velocity);
  }
});
