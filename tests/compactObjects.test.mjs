import test from 'node:test';
import assert from 'node:assert/strict';
import { ExperimentRegistry } from '../src/experiments/experimentRegistry.js';
import { registerLabExperiments } from '../src/experiments/labSpawner.js';
import { BODY_KIND, PHYSICS } from '../src/core/constants.js';
import { newtonianModelLimit, propulsionSafeStandOffDistanceMeters } from '../src/physics/flightComputer.js';

test('LAB pulsar spawner creates a physical compact mass with visual-only field metadata', () => {
  const registry = new ExperimentRegistry();
  registerLabExperiments(registry);
  let created = null;
  const context = {
    userBodySerial: 1,
    ship: {
      position: new Float64Array([0, 0, 0]),
      velocity: new Float64Array([0, 0, 0]),
      forward: () => new Float64Array([1, 0, 0]),
    },
    addBody(body) { created = body; return body; },
  };
  const body = registry.run('spawn-neutron-star', context, { compactType: 'pulsar', solarMasses: 1.4, spinPeriodSeconds: 0.5, magneticFieldTesla: 1e8 });
  assert.equal(body, created);
  assert.equal(body.kind, BODY_KIND.NEUTRON_STAR);
  assert.equal(body.compactType, 'pulsar');
  assert.equal(body.radius, 12_000);
  assert.ok(Math.abs(body.mass / PHYSICS.SOLAR_MASS - 1.4) < 1e-12);
  assert.equal(body.gravitySource, true);
  assert.match(body.scientificWarning, /visual proxies/i);
});

test('neutron-star approach stand-off reserves propulsion authority against extreme gravity', () => {
  const target = { kind: BODY_KIND.NEUTRON_STAR, mass: 1.4 * PHYSICS.SOLAR_MASS, radius: 12_000 };
  const standOff = propulsionSafeStandOffDistanceMeters(target, 120);
  const g = PHYSICS.G * target.mass / (standOff * standOff);
  assert.ok(standOff >= 1_000_000);
  assert.ok(g <= 30.000001, `g=${g}`);
});

test('Newtonian validity guard catches near-surface neutron-star flight before pretending GR is optional', () => {
  const body = { id: 'ns', name: 'Test NS', kind: BODY_KIND.NEUTRON_STAR, mass: 1.4 * PHYSICS.SOLAR_MASS, radius: 12_000, position: new Float64Array([0, 0, 0]) };
  const ship = { position: new Float64Array([500_000, 0, 0]), velocity: new Float64Array([0, 0, 0]) };
  const limit = newtonianModelLimit(ship, [body]);
  assert.equal(limit?.reason, 'neutron-star-proximity');
  ship.position[0] = 2_000_000;
  assert.equal(newtonianModelLimit(ship, [body]), null);
});
