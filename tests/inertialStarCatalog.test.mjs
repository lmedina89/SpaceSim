import test from 'node:test';
import assert from 'node:assert/strict';
import { createInertialStarCatalog, projectInertialCatalogBuffer, projectInertialDirection } from '../src/core/inertialStarCatalog.js';

test('inertial star catalog is deterministic and stable for a system seed', () => {
  const a = createInertialStarCatalog('SKY-STABILITY', 256);
  const b = createInertialStarCatalog('SKY-STABILITY', 256);
  assert.equal(a.id, b.id);
  assert.deepEqual(a.positions, b.positions);
  assert.deepEqual(a.colors, b.colors);
  assert.deepEqual(a.bandPositions, b.bandPositions);
  assert.deepEqual(a.nebulae, b.nebulae);
});

test('surface projection uses the same inertial catalog without reseeding and filters the lower hemisphere', () => {
  const catalog = createInertialStarCatalog('LANDING-NO-RESEED', 512);
  const basis = { east: [1, 0, 0], up: [0, 1, 0], north: [0, 0, 1] };
  const view = projectInertialCatalogBuffer(catalog.positions, catalog.colors, basis, true);
  assert.equal(view.sourceCount, catalog.count);
  assert.ok(view.visibleCount > catalog.count * 0.4 && view.visibleCount < catalog.count * 0.6);
  for (let k = 1; k < view.positions.length; k += 3) assert.ok(view.positions[k] >= 0);
  assert.equal(catalog.id, createInertialStarCatalog('LANDING-NO-RESEED', 512).id);
});

test('inertial direction projection follows the supplied surface horizon basis', () => {
  const basis = { east: [0, 0, -1], up: [1, 0, 0], north: [0, 1, 0] };
  assert.deepEqual(projectInertialDirection([1, 0, 0], basis), [0, 1, 0]);
  assert.deepEqual(projectInertialDirection([0, 1, 0], basis), [0, 0, 1]);
});
