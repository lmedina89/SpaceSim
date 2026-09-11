import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rayleighVerticalOpticalDepthRgb,
  opticalAirMass,
  atmosphericScaleHeightMeters,
  solveSurfaceAtmosphericOptics,
  solveOrbitalAtmosphereLimb,
} from '../src/physics/atmosphericOptics.js';

test('Rayleigh reference optical depth is finite, pressure-scaled, and stronger toward blue', () => {
  const earth = rayleighVerticalOpticalDepthRgb(101325);
  const half = rayleighVerticalOpticalDepthRgb(50662.5);
  assert.ok(earth.every(Number.isFinite));
  assert.ok(earth[2] > earth[1] && earth[1] > earth[0]);
  for (let i = 0; i < 3; i += 1) assert.ok(Math.abs(half[i] / earth[i] - 0.5) < 1e-12);
});

test('air mass grows strongly toward the horizon and becomes unavailable below the refracted solar horizon', () => {
  const zenith = opticalAirMass(Math.PI / 2);
  const horizon = opticalAirMass(0);
  assert.ok(zenith > 0.99 && zenith < 1.01);
  assert.ok(horizon > 30 && horizon < 45);
  assert.equal(opticalAirMass(-2 * Math.PI / 180), Infinity);
});

test('Earth-like scale height is in the expected dry-air order of magnitude', () => {
  const h = atmosphericScaleHeightMeters({ temperatureK: 288, gravityMps2: 9.80665, molecularMassAmu: 28.97 });
  assert.ok(h > 7_500 && h < 9_000, `unexpected scale height ${h}`);
});

test('surface optics produce blue-weighted daylight, redder low-Sun transmission, and black airless sky', () => {
  const noon = solveSurfaceAtmosphericOptics({ pressurePa: 101325, starAltitudeRad: Math.PI / 2 });
  const sunset = solveSurfaceAtmosphericOptics({ pressurePa: 101325, starAltitudeRad: 0 });
  const vacuum = solveSurfaceAtmosphericOptics({ pressurePa: 0, starAltitudeRad: Math.PI / 2 });
  assert.ok(noon.topSkyColorRgb[2] > noon.topSkyColorRgb[0]);
  assert.ok(sunset.starColorAtObserverRgb[0] > sunset.starColorAtObserverRgb[2]);
  assert.ok(noon.skyBrightness > 0.4);
  assert.equal(vacuum.skyBrightness, 0);
  assert.deepEqual(vacuum.topSkyColorRgb, [0, 0, 0]);
  assert.equal(vacuum.starVisibility, 1);
});

test('thin atmosphere stays optically much darker than an Earth-like column', () => {
  const earth = solveSurfaceAtmosphericOptics({ pressurePa: 101325, starAltitudeRad: 45 * Math.PI / 180 });
  const thin = solveSurfaceAtmosphericOptics({ pressurePa: 573, starAltitudeRad: 45 * Math.PI / 180 });
  assert.ok(thin.skyBrightness < earth.skyBrightness * 0.08);
  assert.ok(thin.starVisibility > earth.starVisibility);
});

test('eclipse visible fraction reduces direct stellar transmission and diffuse sky light without changing geometry', () => {
  const full = solveSurfaceAtmosphericOptics({ pressurePa: 72_000, starAltitudeRad: 45 * Math.PI / 180, starVisibleFraction: 1 });
  const partial = solveSurfaceAtmosphericOptics({ pressurePa: 72_000, starAltitudeRad: 45 * Math.PI / 180, starVisibleFraction: 0.2 });
  assert.ok(partial.directStellarTransmission < full.directStellarTransmission * 0.3);
  assert.ok(partial.diffuseSkyLight < full.diffuseSkyLight * 0.3);
});

test('orbital limb follows hydrostatic scale height and disappears for vacuum-like pressure', () => {
  const earth = solveOrbitalAtmosphereLimb({ pressurePa: 101325, temperatureK: 288, gravityMps2: 9.80665, molecularMassAmu: 28.97, radiusMeters: 6_371_000 });
  const trace = solveOrbitalAtmosphereLimb({ pressurePa: 0.2, temperatureK: 100, gravityMps2: 1.2, molecularMassAmu: 28, radiusMeters: 1_000_000 });
  assert.equal(earth.visible, true);
  assert.ok(earth.shellHeightMeters > 40_000 && earth.shellHeightMeters < 100_000);
  assert.ok(earth.shellRadiusScale > 1);
  assert.ok(earth.opacity > 0.1);
  assert.equal(trace.visible, false);
  assert.equal(trace.opacity, 0);
});
