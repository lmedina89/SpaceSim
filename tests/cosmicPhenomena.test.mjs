import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import { CosmicPhenomenonRegistry } from '../src/cosmic/phenomenonRegistry.js';
import { BODY_KIND } from '../src/core/constants.js';

test('seeded systems include deterministic physical comets and local visual cosmic phenomena', () => {
  const a = generateSystem('COSMOS-TEST-14');
  const b = generateSystem('COSMOS-TEST-14');
  const comets = a.bodies.filter((body) => body.kind === BODY_KIND.COMET);
  assert.ok(comets.length >= 1 && comets.length <= 2);
  assert.equal(a.metadata.cometCount, comets.length);
  for (const comet of comets) {
    assert.ok(comet.mass > 0);
    assert.ok(comet.radius >= 2_000 && comet.radius <= 15_000);
    assert.ok(comet.eccentricity >= 0.72 && comet.eccentricity <= 0.94);
    assert.equal(comet.gravitySource, true);
  }
  assert.deepEqual(a.phenomena, b.phenomena);
  assert.ok(a.phenomena.some((entry) => entry.kind === 'asteroid-belt'));
  assert.ok(a.phenomena.some((entry) => entry.kind === 'planetary-rings'));
  assert.equal(a.metadata.phenomenonCount, a.phenomena.length);
  const ids = new Set(a.bodies.map((body) => body.id));
  for (const entry of a.phenomena) assert.ok(!entry.anchorBodyId || ids.has(entry.anchorBodyId));
});

test('cosmic phenomenon registry resolves a live anchor position instead of freezing generation coordinates', () => {
  const registry = new CosmicPhenomenonRegistry();
  registry.reset([{ id: 'ring-x', kind: 'planetary-rings', label: 'Ring X', anchorBodyId: 'planet-x', radiusMeters: 2e8 }]);
  const body = { id: 'planet-x', position: new Float64Array([1, 2, 3]), velocity: new Float64Array([4, 5, 6]) };
  let state = registry.state('ring-x', () => body);
  assert.deepEqual([...state.center], [1, 2, 3]);
  body.position[0] = 99;
  body.velocity[2] = -12;
  state = registry.state('ring-x', () => body);
  assert.deepEqual([...state.center], [99, 2, 3]);
  assert.deepEqual([...state.velocity], [4, 5, -12]);
});
