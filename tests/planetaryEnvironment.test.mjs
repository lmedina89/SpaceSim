import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY_KIND, PHYSICS } from '../src/core/constants.js';
import { generateSystem } from '../src/data/systemGenerator.js';
import {
  derivePlanetaryEnvironment,
  equilibriumTemperatureK,
  escapeVelocityMps,
  pressureFromAtmosphereMassFraction,
  stellarFluxWm2,
  surfaceGravityMps2FromMassRadius,
  thermalRetentionScore,
} from '../src/physics/planetaryEnvironment.js';

const EARTH_ATMOSPHERE_MASS_FRACTION = 5.1480e18 / PHYSICS.EARTH_MASS;

test('hard environment equations reproduce Earth/Sun reference values to expected precision', () => {
  const flux = stellarFluxWm2(PHYSICS.SOLAR_LUMINOSITY, PHYSICS.AU);
  const gravity = surfaceGravityMps2FromMassRadius(PHYSICS.EARTH_MASS, PHYSICS.EARTH_RADIUS);
  const escape = escapeVelocityMps(PHYSICS.EARTH_MASS, PHYSICS.EARTH_RADIUS);
  const equilibrium = equilibriumTemperatureK(flux, 0.30);
  const pressure = pressureFromAtmosphereMassFraction(PHYSICS.EARTH_MASS, PHYSICS.EARTH_RADIUS, EARTH_ATMOSPHERE_MASS_FRACTION);

  assert.ok(Math.abs(flux - 1361.166) < 0.5, flux);
  assert.ok(Math.abs(gravity - 9.8203) < 0.02, gravity);
  assert.ok(Math.abs(escape - 11186) < 25, escape);
  assert.ok(Math.abs(equilibrium - 254.6) < 1.0, equilibrium);
  assert.ok(Math.abs(pressure - 101325) / 101325 < 0.03, pressure);
});

test('thermal retention score is finite, bounded and monotonic', () => {
  const samples = [-10, 0, 8, 12, 20, 28, 100].map(thermalRetentionScore);
  for (const value of samples) assert.ok(value >= 0 && value <= 1);
  for (let i = 1; i < samples.length; i += 1) assert.ok(samples[i] >= samples[i - 1]);
  assert.equal(samples[0], 0);
  assert.equal(samples.at(-1), 1);
});

test('ORIGIN-001 environment is deterministic, does not mutate dynamics, and keeps accepted home atmosphere continuity', () => {
  const a = generateSystem('ORIGIN-001');
  const b = generateSystem('ORIGIN-001');
  const home = a.bodies.find((body) => body.id === a.homeId);
  const beforePosition = [...home.position];
  const beforeVelocity = [...home.velocity];
  const environment = derivePlanetaryEnvironment(home, a.bodies);

  assert.deepEqual([...home.position], beforePosition);
  assert.deepEqual([...home.velocity], beforeVelocity);
  assert.equal(home.environmentModelVersion, 'planetary-environment-v1');
  assert.equal(home.environmentFormationModel, 'seeded-formation-v1');
  assert.deepEqual(home.environmentFormation, b.bodies.find((body) => body.id === home.id).environmentFormation);
  assert.ok(Math.abs(environment.atmospherePressureProxyAtm - 0.72) < 1e-10, environment.atmospherePressureProxyAtm);
  assert.match(environment.surfaceCapability, /DETAILED SURFACE/);
});

test('gas giants never claim a solid surface or a surface-pressure solution', () => {
  const system = generateSystem('ORIGIN-001');
  const gases = system.bodies.filter((body) => body.kind === BODY_KIND.PLANET && body.planetType === 'gas');
  assert.ok(gases.length > 0);
  for (const body of gases) {
    const environment = derivePlanetaryEnvironment(body, system.bodies);
    assert.equal(environment.classLabel, 'GAS GIANT');
    assert.equal(environment.physicalSurfaceExists, false);
    assert.equal(environment.atmospherePressureProxyPa, null);
    assert.match(environment.surfaceCapability, /NO SOLID SURFACE/);
    assert.match(environment.scientificBoundary, /no equation-of-state|no.*solid surface/i);
  }
});

test('broad generated population stays internally bounded and physically classified', () => {
  let worlds = 0;
  let gasGiants = 0;
  let solidWorlds = 0;
  let iceRich = 0;
  for (let seedIndex = 0; seedIndex < 512; seedIndex += 1) {
    const system = generateSystem(`ENVIRONMENT-${seedIndex}`);
    for (const body of system.bodies.filter((entry) => [BODY_KIND.PLANET, BODY_KIND.MOON, BODY_KIND.ROGUE_PLANET].includes(entry.kind))) {
      worlds += 1;
      const positionBefore = [...body.position];
      const velocityBefore = [...body.velocity];
      const environment = derivePlanetaryEnvironment(body, system.bodies);
      assert.ok(environment, `${system.seed}/${body.id}`);
      assert.deepEqual([...body.position], positionBefore, `${system.seed}/${body.id} position mutated`);
      assert.deepEqual([...body.velocity], velocityBefore, `${system.seed}/${body.id} velocity mutated`);
      assert.ok(Number.isFinite(environment.bulkDensityKgM3) && environment.bulkDensityKgM3 > 0);
      assert.ok(Number.isFinite(environment.surfaceGravityMps2) && environment.surfaceGravityMps2 > 0);
      assert.ok(Number.isFinite(environment.escapeVelocityMps) && environment.escapeVelocityMps > 0);
      assert.ok(Number.isFinite(environment.bondAlbedo) && environment.bondAlbedo >= 0.02 && environment.bondAlbedo <= 0.90);
      assert.ok(environment.volatileInventory01 >= 0 && environment.volatileInventory01 <= 1);
      assert.ok(Number.isFinite(environment.currentStellarFluxWm2) && environment.currentStellarFluxWm2 > 0);
      assert.ok(Number.isFinite(environment.equilibriumTemperatureK) && environment.equilibriumTemperatureK > 0);
      assert.ok(environment.classLabel.length > 3);
      assert.equal(body.environmentModelVersion, 'planetary-environment-v1');
      assert.ok(body.environmentFormation && typeof body.environmentFormation === 'object');

      if (body.kind === BODY_KIND.PLANET && body.planetType === 'gas') {
        gasGiants += 1;
        assert.equal(environment.physicalSurfaceExists, false);
        assert.equal(environment.atmosphereClassId, 'deep-envelope');
      } else {
        solidWorlds += 1;
        assert.equal(environment.physicalSurfaceExists, true);
        assert.ok(Number.isFinite(environment.atmospherePressureProxyPa));
        assert.ok(environment.atmospherePressureProxyPa >= 0 && environment.atmospherePressureProxyPa <= 50_000_000);
        assert.ok(environment.atmosphereRetentionScore >= 0 && environment.atmosphereRetentionScore <= 1);
        assert.ok(environment.gasPhaseAvailabilityScore >= 0 && environment.gasPhaseAvailabilityScore <= 1);
        assert.ok(environment.retainedAtmosphereMassFraction <= environment.atmosphereInventoryMassFraction + 1e-30);
      }
      if (environment.bodyClassId.includes('ice-rich')) {
        iceRich += 1;
        assert.ok(environment.equilibriumTemperatureK < 320, `${system.seed}/${body.id} ice-rich at ${environment.equilibriumTemperatureK} K`);
      }
    }
  }
  assert.ok(worlds > 4_000, worlds);
  assert.ok(gasGiants > 500, gasGiants);
  assert.ok(solidWorlds > 3_000, solidWorlds);
  assert.ok(iceRich > 100, iceRich);
});
