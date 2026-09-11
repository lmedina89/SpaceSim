import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import { BODY_KIND } from '../src/core/constants.js';
import { conservativeHillRadiusMeters, navigationParent } from '../src/navigation/systemNavigation.js';
import { applyFrameOrbitInsertion, frameOrbitInsertionPlan, PROGRADE_HILL_STABILITY_FRACTION, supportsFrameOrbitInsertion } from '../src/physics/frameOrbitInsertion.js';
import { osculatingMetrics } from '../src/physics/orbitalMetrics.js';

function testShipFor(target) {
  return {
    position: new Float64Array([target.position[0] + Math.max(target.radius * 80, 2e9), target.position[1] + target.radius * 3, target.position[2] + target.radius * 11]),
    velocity: new Float64Array([0, 0, 0]),
  };
}

test('every ORIGIN planet and moon gets an exterior circular FRAME insertion window inside conservative Hill screening', () => {
  const system = generateSystem('ORIGIN-001');
  const destinations = system.bodies.filter((body) => body.kind === BODY_KIND.PLANET || body.kind === BODY_KIND.MOON);
  assert.ok(destinations.length > 0);
  for (const target of destinations) {
    const plan = frameOrbitInsertionPlan(testShipFor(target), target, system.bodies);
    assert.equal(plan.ok, true, target.name);
    assert.ok(plan.altitudeMeters > 0, target.name);
    assert.ok(plan.radiusMeters > target.radius, target.name);
    assert.ok(plan.circularSpeedMps > 0, target.name);
    const parent = navigationParent(target, system.bodies);
    const hill = conservativeHillRadiusMeters(target, parent);
    if (hill) assert.ok(plan.radiusMeters <= hill * PROGRADE_HILL_STABILITY_FRACTION * (1 + 1e-12), target.name);
  }
});

test('FRAME insertion yields an initially circular bound two-body osculating state without mutating target state', () => {
  const system = generateSystem('ORIGIN-001');
  const target = system.bodies.find((body) => body.id === system.homeId);
  const ship = testShipFor(target);
  const targetPosition = [...target.position];
  const targetVelocity = [...target.velocity];
  const plan = frameOrbitInsertionPlan(ship, target, system.bodies);
  const applied = applyFrameOrbitInsertion(ship, target, plan);
  assert.equal(applied.applied, true);
  assert.deepEqual([...target.position], targetPosition);
  assert.deepEqual([...target.velocity], targetVelocity);
  const metrics = osculatingMetrics(ship.position, ship.velocity, target);
  assert.equal(metrics.boundTwoBody, true);
  assert.ok(metrics.eccentricity < 1e-10, `e=${metrics.eccentricity}`);
  assert.ok(Math.abs(metrics.radialSpeedMps) < 1e-6, `radial=${metrics.radialSpeedMps}`);
  assert.ok(Math.abs(metrics.periapsisAltitudeMeters - plan.altitudeMeters) < 0.05);
  assert.ok(Math.abs(metrics.apoapsisAltitudeMeters - plan.altitudeMeters) < 0.05);
});

test('FRAME orbit insertion stays limited to planet/moon/rogue-planet destinations', () => {
  const system = generateSystem('ORIGIN-001');
  const star = system.bodies.find((body) => body.kind === BODY_KIND.STAR);
  const comet = system.bodies.find((body) => body.kind === BODY_KIND.COMET);
  assert.equal(supportsFrameOrbitInsertion(star), false);
  if (comet) assert.equal(supportsFrameOrbitInsertion(comet), false);
  assert.equal(frameOrbitInsertionPlan(testShipFor(star), star, system.bodies).ok, false);
});
