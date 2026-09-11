import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS } from '../src/core/constants.js';
import { blackHoleAppearanceProfile, nearOrbitDetailProfile, neutronStarAppearanceProfile, planetaryMaterialProfile, rotationalFlatteningProxy } from '../src/render/celestialRealism.js';

test('planetary material profile separates gas, ice and rocky bodies without inventing physical state', () => {
  const gas = planetaryMaterialProfile({ kind:'planet', planetType:'gas', mass:1e27, radius:6e7, rotationPeriodSeconds:36000 }, { physicalSurfaceExists:false, bondAlbedo:.45 });
  const ice = planetaryMaterialProfile({ kind:'moon', mass:4e22, radius:1.8e6, rotationPeriodSeconds:80000 }, { physicalSurfaceExists:true, surfaceFamily:'ICE / ROCK', icePotential01:.82, bondAlbedo:.68 });
  const rock = planetaryMaterialProfile({ kind:'planet', planetType:'rocky', mass:6e24, radius:6.4e6, rotationPeriodSeconds:86400 }, { physicalSurfaceExists:true, surfaceFamily:'ROCK', bondAlbedo:.25 });
  assert.equal(gas.id, 'gas-envelope'); assert.equal(gas.bumpScale, 0);
  assert.equal(ice.id, 'ice-rock'); assert.ok(ice.roughness < rock.roughness);
  assert.equal(rock.id, 'rock');
});

test('rotation flattening proxy is bounded and gas giants can flatten more than rocky bodies', () => {
  const rocky = rotationalFlatteningProxy({ planetType:'rocky', mass:PHYSICS.EARTH_MASS, radius:6.371e6, rotationPeriodSeconds:86164 });
  const gas = rotationalFlatteningProxy({ planetType:'gas', mass:PHYSICS.JUPITER_MASS, radius:7.1492e7, rotationPeriodSeconds:35730 });
  assert.ok(rocky > 0 && rocky < .01);
  assert.ok(gas > rocky && gas < .13);
});

test('near-orbit detail rises smoothly with apparent angular radius', () => {
  const far = nearOrbitDetailProfile(.002); const near = nearOrbitDetailProfile(.4); const huge = nearOrbitDetailProfile(1.1);
  assert.ok(far.resolved < near.resolved); assert.ok(near.close < huge.close); assert.ok(huge.huge > .5);
});

test('black-hole profile uses Schwarzschild shadow and non-spinning ISCO reference ratios', () => {
  const p = blackHoleAppearanceProfile({ mass:3*PHYSICS.SOLAR_MASS });
  assert.ok(Math.abs(p.shadowRadiusRs - 2.598076211) < 1e-6);
  assert.equal(p.iscoRadiusRs, 3);
  assert.ok(p.schwarzschildRadiusMeters > 8000 && p.schwarzschildRadiusMeters < 10000);
});

test('neutron-star compactness/redshift/light-cylinder diagnostics are finite and physically ordered', () => {
  const p = neutronStarAppearanceProfile({ mass:1.4*PHYSICS.SOLAR_MASS, radius:12000, spinPeriodSeconds:.65, magneticFieldTesla:1e8 });
  assert.ok(p.compactness > .2 && p.compactness < .6);
  assert.ok(p.gravitationalRedshift > 0 && Number.isFinite(p.gravitationalRedshift));
  assert.ok(p.lightCylinderRadiusMeters > 1e7);
  assert.ok(p.fieldExtentVisualRadii >= 3.4);
});
