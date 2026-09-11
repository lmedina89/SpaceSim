import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateSystem } from '../src/data/systemGenerator.js';
import { derivePlanetaryEnvironment } from '../src/physics/planetaryEnvironment.js';
import { solveOrbitalAtmosphereLimb, solveSurfaceAtmosphericOptics } from '../src/physics/atmosphericOptics.js';

function named(system, name) {
  const body = system.bodies.find((entry) => entry.name === name);
  assert.ok(body, `missing ${name}`);
  return body;
}

test('ORIGIN atmospheric reference worlds separate dense, thin and vacuum optical regimes', () => {
  const system = generateSystem('ORIGIN-001');
  const d = derivePlanetaryEnvironment(named(system, 'Caelum-4361 d'), system.bodies);
  const e = derivePlanetaryEnvironment(named(system, 'Caelum-4361 e'), system.bodies);
  const fA = derivePlanetaryEnvironment(named(system, 'Caelum-4361 f-A'), system.bodies);
  const hA = derivePlanetaryEnvironment(named(system, 'Caelum-4361 h-A'), system.bodies);
  const noon = (environment) => solveSurfaceAtmosphericOptics({
    pressurePa: environment.atmospherePressureProxyPa,
    temperatureK: environment.equilibriumTemperatureK,
    gravityMps2: environment.surfaceGravityMps2,
    molecularMassAmu: environment.representativeAtmosphereMolecularMassAmu,
    starAltitudeRad: Math.PI / 2,
  });
  const dSky = noon(d), eSky = noon(e), fSky = noon(fA), hSky = noon(hA);
  assert.ok(dSky.skyBrightness > 0.5);
  assert.ok(eSky.skyBrightness < 0.02 && eSky.skyBrightness > 0);
  assert.ok(fSky.skyBrightness < 1e-5);
  assert.ok(hSky.skyBrightness < 1e-5);
  assert.ok(eSky.starVisibility > dSky.starVisibility);
});

test('ORIGIN orbital atmosphere limb appears on d/e but remains absent on vacuum reference moons', () => {
  const system = generateSystem('ORIGIN-001');
  for (const [name, expected] of [
    ['Caelum-4361 d', true],
    ['Caelum-4361 e', true],
    ['Caelum-4361 f-A', false],
    ['Caelum-4361 h-A', false],
  ]) {
    const body = named(system, name);
    const environment = derivePlanetaryEnvironment(body, system.bodies);
    const limb = solveOrbitalAtmosphereLimb({
      pressurePa: environment.atmospherePressureProxyPa,
      temperatureK: environment.equilibriumTemperatureK,
      gravityMps2: environment.surfaceGravityMps2,
      molecularMassAmu: environment.representativeAtmosphereMolecularMassAmu,
      radiusMeters: body.radius,
    });
    assert.equal(limb.visible, expected, `${name} limb visibility`);
  }
});

test('surface renderer consumes wavelength optics without mutating canonical astronomy', async () => {
  const source = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(source, /solveSurfaceAtmosphericOptics/);
  assert.match(source, /rayleigh|wavelength-dependent optics solution/i);
  assert.match(source, /directStellarTransmission/);
  assert.match(source, /starColorAtObserverRgb/);
  assert.match(source, /extinctionCoefficient550PerMeter/);
  assert.match(source, /updateSkyTexture/);
  assert.doesNotMatch(source, /astronomy\.bodies\.(?:splice|push|pop|shift|unshift)/);
});

test('space renderer adds atmosphere limb from canonical environment only when optically justified', async () => {
  const factory = await readFile(new URL('../src/render/celestialFactory.js', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
  assert.match(factory, /syncPlanetaryAtmosphereVisual/);
  assert.match(factory, /planetary-atmosphere-limb/);
  assert.match(factory, /solveOrbitalAtmosphereLimb/);
  assert.match(factory, /THREE\.BackSide/);
  assert.match(renderer, /derivePlanetaryEnvironment\(body, bodies\)/);
  assert.match(renderer, /syncPlanetaryAtmosphereVisual\(visual, body, environment, primaryStar\)/);
});
