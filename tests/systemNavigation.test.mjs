import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import { BODY_KIND } from '../src/core/constants.js';
import { conservativeHillRadiusMeters, instantaneousHillRadiusMeters, navigationBodySnapshot, orderedNavigationBodies, orbitalPeriodSeconds } from '../src/navigation/systemNavigation.js';

test('NAV hierarchy exposes the complete ORIGIN star → planets → moons registry', () => {
  const system = generateSystem('ORIGIN-001');
  const hierarchy = orderedNavigationBodies(system.bodies);
  assert.ok(hierarchy.star);
  assert.equal(hierarchy.planets.length, 7);
  const moons = [...hierarchy.moonsByParent.values()].flat();
  assert.equal(moons.length, 9);
  for (const moon of moons) assert.ok(hierarchy.planets.some((planet) => planet.id === moon.parentId));
});

test('NAV scientific snapshot reports finite physical values without inventing atmosphere physics', () => {
  const system = generateSystem('ORIGIN-001');
  const home = system.bodies.find((body) => body.id === system.homeId);
  const ship = { position: new Float64Array([home.position[0] + home.radius * 20, home.position[1], home.position[2]]) };
  const snapshot = navigationBodySnapshot(home, system.bodies, ship);
  assert.ok(Number.isFinite(snapshot.shipRangeMeters) && snapshot.shipRangeMeters > 0);
  assert.ok(Number.isFinite(snapshot.starRangeMeters) && snapshot.starRangeMeters > 0);
  assert.ok(Number.isFinite(snapshot.surfaceGravityMps2) && snapshot.surfaceGravityMps2 > 0);
  assert.ok(Number.isFinite(snapshot.orbitalPeriodSeconds) && snapshot.orbitalPeriodSeconds > 0);
  assert.match(snapshot.atmosphereModel, /UNMODELED/i);
  assert.match(snapshot.surfaceCapability, /DETAILED SURFACE/i);
});

test('moon Kepler period uses its actual parent planet', () => {
  const system = generateSystem('ORIGIN-001');
  const moon = system.bodies.find((body) => body.kind === BODY_KIND.MOON);
  const parent = system.bodies.find((body) => body.id === moon.parentId);
  const period = orbitalPeriodSeconds(moon, parent);
  assert.ok(Number.isFinite(period) && period > 0);
  const wrongParent = system.bodies.find((body) => body.kind === BODY_KIND.STAR);
  assert.notEqual(period, orbitalPeriodSeconds(moon, wrongParent));
});

test('conservative Hill screening never exceeds the instantaneous live-separation estimate', () => {
  const system = generateSystem('ORIGIN-001');
  for (const body of system.bodies.filter((entry) => entry.kind === BODY_KIND.PLANET || entry.kind === BODY_KIND.MOON)) {
    const parent = body.parentId
      ? system.bodies.find((entry) => entry.id === body.parentId)
      : system.bodies.find((entry) => entry.kind === BODY_KIND.STAR);
    const instantaneous = instantaneousHillRadiusMeters(body, parent);
    const conservative = conservativeHillRadiusMeters(body, parent);
    assert.ok(Number.isFinite(instantaneous) && instantaneous > 0, body.name);
    assert.ok(Number.isFinite(conservative) && conservative > 0, body.name);
    assert.ok(conservative <= instantaneous * (1 + 1e-12), `${body.name}: ${conservative} > ${instantaneous}`);
  }
});
