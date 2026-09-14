import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY_KIND, PHYSICS, SIMULATION } from '../src/core/constants.js';
import { generateSystem } from '../src/data/systemGenerator.js';
import { GENERATION_PROFILE_IDS, resolveGenerationProfile } from '../src/data/generationProfiles.js';
import { DirectGravitySolver } from '../src/physics/gravity/directGravitySolver.js';
import { VelocityVerletIntegrator } from '../src/physics/integrators/velocityVerlet.js';
import { bodyClassLabel, orderedNavigationBodies } from '../src/navigation/systemNavigation.js';

function totalResiduals(bodies) {
  let mass = 0, px = 0, py = 0, pz = 0, cx = 0, cy = 0, cz = 0, pScale = 0, xScale = 0;
  for (const body of bodies) {
    mass += body.mass;
    px += body.mass * body.velocity[0]; py += body.mass * body.velocity[1]; pz += body.mass * body.velocity[2];
    cx += body.mass * body.position[0]; cy += body.mass * body.position[1]; cz += body.mass * body.position[2];
    pScale += body.mass * Math.hypot(...body.velocity);
    xScale += body.mass * Math.hypot(...body.position);
  }
  return {
    momentumRatio: Math.hypot(px, py, pz) / Math.max(1, pScale),
    centerRatio: Math.hypot(cx / mass, cy / mass, cz / mass) / Math.max(1, xScale / mass),
  };
}

test('profile resolver defaults unknown and legacy values to Origin', () => {
  assert.equal(resolveGenerationProfile().id, GENERATION_PROFILE_IDS.ORIGIN);
  assert.equal(resolveGenerationProfile('unknown').id, GENERATION_PROFILE_IDS.ORIGIN);
  assert.equal(resolveGenerationProfile('ABYSSAL').id, GENERATION_PROFILE_IDS.ABYSSAL);
});

test('explicit Origin profile preserves the established deterministic physical signature', () => {
  const legacy = generateSystem('ORIGIN-001');
  const explicit = generateSystem('ORIGIN-001', 'origin');
  assert.equal(legacy.generationProfileId, 'origin');
  assert.deepEqual(legacy.bodies, explicit.bodies);
  assert.deepEqual(legacy.phenomena, explicit.phenomena);
  const star = legacy.bodies.find((body) => body.id === 'star-0');
  const firstPlanet = legacy.bodies.find((body) => body.id === 'planet-1');
  const nearVector = (actual, expected, tolerance) => actual.every((value, index) => Math.abs(value - expected[index]) <= tolerance);
  assert.ok(nearVector([...star.position], [117306266.1553843, -15060692.902183142, -62950225.12578909], 1e-6));
  assert.ok(nearVector([...firstPlanet.position], [35470505321.98423, 775882259.717882, -26509908414.664623], 1e-5));
  assert.equal(legacy.metadata.planetCount, 7);
  assert.equal(legacy.metadata.moonCount, 9);
  assert.equal(legacy.metadata.compactCompanionCount, 0);
});

test('ABYSSAL-001 deterministically builds a bounded dense system and physical Abyssal Sentinel', () => {
  const a = generateSystem('ABYSSAL-001', 'abyssal');
  const b = generateSystem('ABYSSAL-001', 'abyssal');
  assert.deepEqual(a, b);
  assert.equal(a.generationProfileId, 'abyssal');
  assert.equal(a.metadata.planetCount, 9);
  assert.equal(a.metadata.cometCount, 2);
  assert.equal(a.metadata.roguePlanetCount, 1);
  assert.equal(a.metadata.compactCompanionCount, 1);
  assert.ok(a.bodies.length < SIMULATION.directGravityBodyLimit);
  assert.ok(a.metadata.anomalyCount >= 15 && a.metadata.anomalyCount <= 18);
  const sentinel = a.bodies.find((body) => body.name === 'Abyssal Sentinel');
  const star = a.bodies.find((body) => body.id === 'star-0');
  assert.ok(sentinel);
  assert.equal(sentinel.kind, BODY_KIND.NEUTRON_STAR);
  assert.equal(sentinel.compactType, 'magnetar');
  assert.equal(sentinel.gravitySource, true);
  assert.equal(bodyClassLabel(sentinel, a.bodies), 'MAGNETAR');
  const r = sentinel.position.map((value, index) => value - star.position[index]);
  const v = sentinel.velocity.map((value, index) => value - star.velocity[index]);
  const distance = Math.hypot(...r);
  const speed = Math.hypot(...v);
  const radialFraction = Math.abs(r[0] * v[0] + r[1] * v[1] + r[2] * v[2]) / (distance * speed);
  assert.ok(Math.abs(distance / PHYSICS.AU - 420) < 1e-9);
  assert.ok(radialFraction < 1e-12);
  assert.ok(Math.abs(speed ** 2 / (PHYSICS.G * (star.mass + sentinel.mass) / distance) - 1) < 1e-12);
  const residual = totalResiduals(a.bodies);
  assert.ok(residual.momentumRatio < 1e-14, String(residual.momentumRatio));
  assert.ok(residual.centerRatio < 1e-14, String(residual.centerRatio));
});

test('Abyssal compact companion remains navigable and a seven-day integration stays finite', () => {
  const system = generateSystem('ABYSSAL-001', 'abyssal');
  const hierarchy = orderedNavigationBodies(system.bodies);
  assert.ok(hierarchy.other.some((body) => body.name === 'Abyssal Sentinel'));
  const bodies = system.bodies.map((body) => ({ ...body, position: new Float64Array(body.position), velocity: new Float64Array(body.velocity) }));
  const integrator = new VelocityVerletIntegrator(new DirectGravitySolver());
  const steps = Math.ceil((7 * PHYSICS.DAY) / SIMULATION.maxPhysicsSubstepSeconds);
  for (let i = 0; i < steps; i += 1) integrator.step(bodies, SIMULATION.maxPhysicsSubstepSeconds);
  for (const body of bodies) {
    assert.ok(body.position.every(Number.isFinite), body.name);
    assert.ok(body.velocity.every(Number.isFinite), body.name);
  }
  const residual = totalResiduals(bodies);
  assert.ok(residual.momentumRatio < 2e-13, String(residual.momentumRatio));
  assert.ok(residual.centerRatio < 2e-13, String(residual.centerRatio));
});

test('broad Abyssal population remains finite, unique and inside direct-solver/mobile budgets', () => {
  for (let index = 0; index < 250; index += 1) {
    const system = generateSystem(`ABYSSAL-POP-${index}`, 'abyssal');
    assert.equal(system.metadata.planetCount, 9);
    assert.equal(system.metadata.cometCount, 2);
    assert.equal(system.metadata.roguePlanetCount, 1);
    assert.equal(system.metadata.compactCompanionCount, 1);
    assert.ok(system.bodies.length < SIMULATION.directGravityBodyLimit);
    assert.equal(new Set(system.bodies.map((body) => body.id)).size, system.bodies.length);
    assert.equal(new Set(system.phenomena.map((entry) => entry.id)).size, system.phenomena.length);
    for (const body of system.bodies) {
      assert.ok(Number.isFinite(body.mass) && body.mass > 0, `${index}:${body.name}:mass`);
      assert.ok(body.position.every(Number.isFinite), `${index}:${body.name}:position`);
      assert.ok(body.velocity.every(Number.isFinite), `${index}:${body.name}:velocity`);
    }
  }
});

test('app save contract stores the profile and loads legacy saves as Origin', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/app/app.js', import.meta.url), 'utf8'));
  assert.match(source, /generationProfileId: this\.system\.generationProfileId \?\? 'origin'/);
  assert.match(source, /generateSystem\(payload\.seed, payload\.generationProfileId \?\? 'origin'\)/);
  assert.match(source, /this\.system\.generationProfileId/);
});
