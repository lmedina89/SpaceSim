import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import { BODY_KIND } from '../src/core/constants.js';
import { planFrameGuardRoute, resolveFrameGuardWaypoint } from '../src/navigation/frameGuardRoute.js';
import { firstTransitGuardHit } from '../src/physics/transitDrive.js';

function originStart(system) {
  const home = system.bodies.find((body) => body.id === system.homeId);
  return new Float64Array([home.position[0], home.position[1] + home.radius * 5, home.position[2]]);
}

test('FRAME route planner keeps every ORIGIN planet/moon destination swept-clear without weakening body guards', () => {
  const system = generateSystem('ORIGIN-001');
  const start = originStart(system);
  for (const target of system.bodies.filter((body) => body.kind === BODY_KIND.PLANET || body.kind === BODY_KIND.MOON)) {
    const route = planFrameGuardRoute(start, target.position, system.bodies, target.id);
    assert.equal(route.ok, true, target.name);
    if (!route.needed) {
      assert.equal(firstTransitGuardHit(start, target.position, system.bodies, target.id), null, target.name);
      continue;
    }
    const waypoint = resolveFrameGuardWaypoint(route, system.bodies);
    assert.ok(waypoint, target.name);
    assert.equal(firstTransitGuardHit(start, waypoint, system.bodies, target.id), null, `${target.name} first leg`);
    assert.equal(firstTransitGuardHit(waypoint, target.position, system.bodies, target.id), null, `${target.name} second leg`);
    assert.ok(route.waypoint.clearanceShell > 1, target.name);
  }
});

test('ORIGIN inner moon b-A receives a live parent-planet bypass instead of the old 99.9% safety dropout', () => {
  const system = generateSystem('ORIGIN-001');
  const start = originStart(system);
  const target = system.bodies.find((body) => body.kind === BODY_KIND.MOON && body.name.endsWith('b-A'));
  assert.ok(target);
  const directHit = firstTransitGuardHit(start, target.position, system.bodies, target.id);
  assert.ok(directHit, 'fixture must reproduce the pre-fix blocked direct route');
  const route = planFrameGuardRoute(start, target.position, system.bodies, target.id);
  assert.equal(route.ok, true);
  assert.equal(route.needed, true);
  assert.equal(route.blockedById, target.parentId);
  const waypoint = resolveFrameGuardWaypoint(route, system.bodies);
  assert.equal(firstTransitGuardHit(start, waypoint, system.bodies, target.id), null);
  assert.equal(firstTransitGuardHit(waypoint, target.position, system.bodies, target.id), null);
});

test('FRAME detour waypoint remains anchored to the live blocking body as N-body state moves', () => {
  const system = generateSystem('ORIGIN-001');
  const start = originStart(system);
  const target = system.bodies.find((body) => body.kind === BODY_KIND.MOON && body.name.endsWith('b-A'));
  const route = planFrameGuardRoute(start, target.position, system.bodies, target.id);
  assert.equal(route.needed, true);
  const before = resolveFrameGuardWaypoint(route, system.bodies);
  const blocker = system.bodies.find((body) => body.id === route.waypoint.anchorBodyId);
  const delta = [1_250_000, -430_000, 870_000];
  blocker.position[0] += delta[0]; blocker.position[1] += delta[1]; blocker.position[2] += delta[2];
  const after = resolveFrameGuardWaypoint(route, system.bodies);
  for (let i = 0; i < 3; i += 1) assert.ok(Math.abs((after[i] - before[i]) - delta[i]) < 1e-6);
});
