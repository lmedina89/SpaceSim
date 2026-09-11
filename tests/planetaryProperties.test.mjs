import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS } from '../src/core/constants.js';
import {
  breakupPeriodSeconds,
  bulkDensityKgM3,
  gasGiantPropertiesFromSamples,
  specificOrbitalEnergyJkg,
} from '../src/physics/planetaryProperties.js';

const rel = (a, b) => Math.abs(a - b) / Math.max(1, Math.abs(b));

test('gas-giant proxy derives a coherent radius and density from authoritative mass', () => {
  for (const massRatio of [0.16, 0.3, 1, 1.65]) {
    for (const structure of [0, 0.5, 1]) {
      for (const composition of [0, 0.5, 1]) {
        const props = gasGiantPropertiesFromSamples(PHYSICS.JUPITER_MASS * massRatio, structure, composition);
        assert.ok(props.mass > 0 && props.radius > 0 && props.densityKgM3 > 0);
        assert.ok(props.radius / PHYSICS.JUPITER_RADIUS > 0.5 && props.radius / PHYSICS.JUPITER_RADIUS < 1.3);
        assert.ok(props.densityKgM3 >= 450 && props.densityKgM3 <= 2_800);
        assert.ok(rel(bulkDensityKgM3(props.mass, props.radius), props.densityKgM3) < 1e-14);
      }
    }
  }
});

test('Newtonian breakup period is the equatorial gravity/centrifugal balance period', () => {
  const period = breakupPeriodSeconds(PHYSICS.EARTH_MASS, PHYSICS.EARTH_RADIUS);
  const expected = 2 * Math.PI * Math.sqrt(PHYSICS.EARTH_RADIUS ** 3 / (PHYSICS.G * PHYSICS.EARTH_MASS));
  assert.ok(rel(period, expected) < 1e-14);
});

test('specific orbital energy classifies below/above escape speed correctly', () => {
  const r = PHYSICS.AU;
  const escape = Math.sqrt(2 * PHYSICS.G * PHYSICS.SOLAR_MASS / r);
  assert.ok(specificOrbitalEnergyJkg([r, 0, 0], [0, 0, escape * 0.99], PHYSICS.SOLAR_MASS) < 0);
  assert.ok(specificOrbitalEnergyJkg([r, 0, 0], [0, 0, escape * 1.01], PHYSICS.SOLAR_MASS) > 0);
});
