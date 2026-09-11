import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGeneratedBodyCompatibility } from '../src/core/generatedBodyCompatibility.js';
import { bulkDensityKgM3 } from '../src/physics/planetaryProperties.js';

test('saved v1 rotation metadata is never overwritten by a v2 generator', () => {
  const restored = {
    id: 'planet-1', kind: 'planet', planetType: 'rocky', mass: 5, radius: 2,
    rotationPeriodSeconds: 123, rotationDirection: -1, rotationAxisInertial: [1, 0, 0],
    rotationPhaseRad: 0.4, rotationEpochSeconds: 17, axialTiltRad: 2.8, rotationModel: 'rigid-seeded-v1',
    position: new Float64Array([1, 2, 3]), velocity: new Float64Array([4, 5, 6]),
  };
  const generated = {
    ...restored,
    rotationPeriodSeconds: 999, rotationDirection: 1, rotationAxisInertial: [0, -1, 0],
    rotationPhaseRad: 2.1, rotationEpochSeconds: 0, axialTiltRad: 0.1, rotationModel: 'rigid-orbital-v2',
    physicalPropertyModel: 'bulk-density-v1',
  };
  applyGeneratedBodyCompatibility(restored, generated);
  assert.equal(restored.rotationPeriodSeconds, 123);
  assert.equal(restored.rotationDirection, -1);
  assert.deepEqual(restored.rotationAxisInertial, [1, 0, 0]);
  assert.equal(restored.rotationPhaseRad, 0.4);
  assert.equal(restored.rotationEpochSeconds, 17);
  assert.equal(restored.axialTiltRad, 2.8);
  assert.equal(restored.rotationModel, 'rigid-seeded-v1');
  assert.deepEqual([...restored.position], [1, 2, 3]);
  assert.deepEqual([...restored.velocity], [4, 5, 6]);
});

test('pre-rotation schema-1 bodies backfill missing v2 rotation metadata only', () => {
  const restored = { id: 'planet-1', kind: 'planet', planetType: 'rocky', mass: 5, radius: 2 };
  const generated = {
    id: 'planet-1', kind: 'planet', planetType: 'rocky', mass: 5, radius: 2,
    rotationPeriodSeconds: 999, rotationDirection: 1, rotationAxisInertial: [0, -1, 0],
    rotationPhaseRad: 2.1, rotationEpochSeconds: 0, axialTiltRad: 0.1, rotationModel: 'rigid-orbital-v2',
    physicalPropertyModel: 'bulk-density-v1',
  };
  applyGeneratedBodyCompatibility(restored, generated);
  assert.equal(restored.rotationPeriodSeconds, 999);
  assert.deepEqual(restored.rotationAxisInertial, [0, -1, 0]);
  assert.equal(restored.rotationModel, 'rigid-orbital-v2');
});

test('legacy gas saves preserve mass/radius but repair contradictory stored density', () => {
  const restored = { id: 'planet-6', kind: 'planet', planetType: 'gas', mass: 1.2e27, radius: 4.0e7, densityKgM3: 1200 };
  const generated = { ...restored, radius: 7.0e7, densityKgM3: 835, physicalPropertyModel: 'coherent-gas-envelope-v2' };
  const oldMass = restored.mass;
  const oldRadius = restored.radius;
  applyGeneratedBodyCompatibility(restored, generated);
  assert.equal(restored.mass, oldMass);
  assert.equal(restored.radius, oldRadius);
  assert.equal(restored.densityKgM3, bulkDensityKgM3(oldMass, oldRadius));
  assert.equal(restored.physicalPropertyModel, 'legacy-gas-geometry-preserved-v1');
});
