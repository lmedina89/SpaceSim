import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { generateSystem } from '../src/data/systemGenerator.js';
import { navigationBodySnapshot } from '../src/navigation/systemNavigation.js';
import { frameOrbitInsertionPlan } from '../src/physics/frameOrbitInsertion.js';
import { generateSurfaceRegion, availableSurfaceRegions } from '../src/surface/surfaceGenerator.js';
import { createSurfaceSession, surfaceTakeoffReferencePosition } from '../src/surface/surfaceSession.js';
import { createSurfaceWeatherState, stepSurfaceWeather, surfaceWeatherReading } from '../src/surface/surfaceWeather.js';
import {
  enabledExplorationSurfaceBodies,
  selectExplorationRockyWorld,
  selectExplorationIceWorld,
  surfaceEngineSupport,
  SURFACE_ENGINE_PROFILES,
} from '../src/surface/surfaceProfiles.js';

function origin() {
  const system = generateSystem('ORIGIN-001');
  const rocky = selectExplorationRockyWorld(system.bodies);
  const ice = selectExplorationIceWorld(system.bodies);
  assert.ok(rocky);
  assert.ok(ice);
  return { system, rocky, ice };
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

test('ORIGIN exploration selectors choose the intended contrasting rocky planet and icy moon', () => {
  const { system, rocky, ice } = origin();
  assert.equal(rocky.id, 'planet-4');
  assert.equal(rocky.name, 'Caelum-4361 e');
  assert.equal(ice.id, 'moon-7-1');
  assert.equal(ice.name, 'Caelum-4361 h-A');
  assert.deepEqual(enabledExplorationSurfaceBodies(system.bodies).map((body) => body.id), ['planet-3', 'moon-5-1', 'planet-4', 'moon-7-1']);
  assert.equal(system.bodies.some((body) => body.kind === 'rogue' && surfaceEngineSupport(body, system.bodies).enabled), false);
});

test('cold rocky exploration surface consumes canonical environment without inheriting home anomaly content', () => {
  const { system, rocky } = origin();
  const support = surfaceEngineSupport(rocky, system.bodies);
  assert.equal(support.profileId, SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY);
  assert.deepEqual(availableSurfaceRegions(system, rocky, system.bodies), [
    { id: 'tenuous-rocky-highland', name: 'Tenuous Highland Survey', subtitle: 'Cold rocky terrain under a thin modeled atmosphere' },
  ]);
  const a = generateSurfaceRegion(system, rocky, 'tenuous-rocky-highland', system.bodies);
  const b = generateSurfaceRegion(system, rocky, 'tenuous-rocky-highland', system.bodies);
  assert.deepEqual(a, b);
  assert.equal(a.surfaceArchitectureFamily, 'ATMOSPHERIC_ROCKY');
  assert.equal(a.surfaceEngineProfile, SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY);
  assert.equal(a.atmosphereMode, 'tenuous');
  assert.equal(a.temperatureModel, 'radiative-equilibrium');
  assert.ok(a.atmospherePressurePa > 500 && a.atmospherePressurePa < 700);
  assert.ok(a.gravityMps2 > 9 && a.gravityMps2 < 11);
  assert.ok(a.temperatureK > 210 && a.temperatureK < 235);
  assert.ok(a.fogDensityProxy > 0 && a.fogDensityProxy < 0.0001);
  assert.equal(a.anomalies.length, 0);
  assert.equal(a.anomalyVisualsEnabled, false);
});

test('generalized rocky weather stays ordinary and profile-restricted', () => {
  const { system, rocky } = origin();
  const region = generateSurfaceRegion(system, rocky, 'tenuous-rocky-highland', system.bodies);
  const state = createSurfaceWeatherState(region);
  const seen = new Set();
  for (let i = 0; i < 120_000; i += 1) {
    stepSurfaceWeather(state, region, 0.25);
    seen.add(surfaceWeatherReading(state).type);
  }
  assert.equal(state.disabled, false);
  for (const type of seen) assert.ok(['clear', 'dust-front', 'frost-squall'].includes(type), `unexpected generalized rocky weather ${type}`);
  assert.ok(seen.has('dust-front') || seen.has('frost-squall'));
});

test('ice/volatile exploration surface is cryogenic, deterministic, and atmosphere/weather conservative', () => {
  const { system, ice } = origin();
  const support = surfaceEngineSupport(ice, system.bodies);
  assert.equal(support.profileId, SURFACE_ENGINE_PROFILES.ICE_VOLATILE);
  assert.deepEqual(availableSurfaceRegions(system, ice, system.bodies), [
    { id: 'cryogenic-ice-shelf', name: 'Cryogenic Ice Shelf', subtitle: 'Ice-rich volatile terrain reference surface' },
  ]);
  const a = generateSurfaceRegion(system, ice, 'cryogenic-ice-shelf', system.bodies);
  const b = generateSurfaceRegion(system, ice, 'cryogenic-ice-shelf', system.bodies);
  assert.deepEqual(a, b);
  assert.equal(a.surfaceArchitectureFamily, 'ICE_VOLATILE');
  assert.equal(a.surfaceEngineProfile, SURFACE_ENGINE_PROFILES.ICE_VOLATILE);
  assert.equal(a.atmosphereMode, 'airless');
  assert.equal(a.weatherEnabled, false);
  assert.equal(a.palette.skyTop, 0);
  assert.equal(a.palette.skyHorizon, 0);
  assert.equal(a.temperatureModel, 'radiative-equilibrium');
  assert.ok(a.temperatureK > 70 && a.temperatureK < 95);
  assert.ok(a.atmospherePressurePa < 1);
  assert.ok(a.gravityMps2 > 0.7 && a.gravityMps2 < 1.0);
  assert.equal(a.anomalies.length, 0);
  const weather = createSurfaceWeatherState(a);
  for (let i = 0; i < 1000; i += 1) stepSurfaceWeather(weather, a, 1 / 30);
  assert.equal(surfaceWeatherReading(weather).type, 'vacuum');
});

test('NAV exposes only the selected exploration set and leaves other solids locked', () => {
  const { system, rocky, ice } = origin();
  assert.match(navigationBodySnapshot(rocky, system.bodies, null).surfaceCapability, /ROCKY EXPLORATION SURFACE/);
  assert.match(navigationBodySnapshot(ice, system.bodies, null).surfaceCapability, /ICE \/ VOLATILE EXPLORATION SURFACE/);
  const enabled = new Set(enabledExplorationSurfaceBodies(system.bodies).map((body) => body.id));
  for (const body of system.bodies) {
    if (!['planet', 'moon', 'rogue'].includes(body.kind) || enabled.has(body.id) || body.planetType === 'gas') continue;
    assert.equal(surfaceEngineSupport(body, system.bodies).enabled, false, `${body.id} should remain locked`);
  }
});

test('new generalized worlds hand back to finite local circular insertion plans from body-fixed surface anchors', () => {
  const { system, rocky, ice } = origin();
  for (const body of [rocky, ice]) {
    const region = generateSurfaceRegion(system, body, undefined, system.bodies);
    const session = createSurfaceSession(region);
    session.bodyFixedAnchor = [0.55, 0.72, -0.42];
    const n = Math.hypot(...session.bodyFixedAnchor);
    session.bodyFixedAnchor = session.bodyFixedAnchor.map((value) => value / n);
    const reference = surfaceTakeoffReferencePosition(session, body, 123_456);
    assert.ok(reference);
    const plan = frameOrbitInsertionPlan({ position: reference }, body, system.bodies);
    assert.equal(plan.ok, true, `${body.name}: ${plan.reason ?? ''}`);
    assert.ok(plan.radiusMeters > body.radius);
    if (plan.hillRadiusMeters) assert.ok(plan.radiusMeters < plan.hillRadiusMeters * 0.47 + 1e-6);
  }
});

test('generating and stepping another world does not mutate the accepted home surface/weather payload', () => {
  const { system, rocky, ice } = origin();
  const home = system.bodies.find((body) => body.id === system.homeId);
  const beforeRegion = generateSurfaceRegion(system, home, 'shatterfall-basin', system.bodies);
  const beforeWeather = createSurfaceWeatherState(beforeRegion);
  for (let i = 0; i < 3600; i += 1) stepSurfaceWeather(beforeWeather, beforeRegion, 1 / 60);
  const beforeDigest = digest({ region: beforeRegion, weather: beforeWeather });

  for (const body of [rocky, ice]) {
    const region = generateSurfaceRegion(system, body, undefined, system.bodies);
    const weather = createSurfaceWeatherState(region);
    for (let i = 0; i < 2400; i += 1) stepSurfaceWeather(weather, region, 1 / 60);
  }

  const afterRegion = generateSurfaceRegion(system, home, 'shatterfall-basin', system.bodies);
  const afterWeather = createSurfaceWeatherState(afterRegion);
  for (let i = 0; i < 3600; i += 1) stepSurfaceWeather(afterWeather, afterRegion, 1 / 60);
  assert.equal(digest({ region: afterRegion, weather: afterWeather }), beforeDigest);
});


test('surface session rejects cross-body/profile restore state instead of leaking local state', () => {
  const { system, rocky, ice } = origin();
  const rockyRegion = generateSurfaceRegion(system, rocky, undefined, system.bodies);
  const iceRegion = generateSurfaceRegion(system, ice, undefined, system.bodies);
  const foreign = createSurfaceSession(rockyRegion);
  foreign.x = 999; foreign.z = -777; foreign.scannedPoiIds.add('foreign-poi');
  const snapshot = {
    ...foreign,
    scannedPoiIds: [...foreign.scannedPoiIds],
    weather: { elapsedSeconds: 900, current: { type: 'dust-front' } },
  };
  const restored = createSurfaceSession(iceRegion, snapshot);
  assert.equal(restored.bodyId, ice.id);
  assert.equal(restored.surfaceProfileId, SURFACE_ENGINE_PROFILES.ICE_VOLATILE);
  assert.equal(restored.x, iceRegion.landing.x);
  assert.equal(restored.z, iceRegion.landing.z);
  assert.equal(restored.scannedPoiIds.size, 0);
  assert.equal(surfaceWeatherReading(restored.weather).type, 'vacuum');
});

test('surface renderer has explicit ice scatter and profile-specific fog/material hooks without replacing legacy defaults', () => {
  const source = fs.readFileSync(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(source, /surfaceArchitectureFamily === 'ICE_VOLATILE'/);
  assert.match(source, /region\.fogDensityProxy/);
  assert.match(source, /region\.materialRoughness/);
  assert.match(source, /this\._profileHemiIntensity/);
});

test('surface exit preserves departing session/region until generalized orbit handoff planning is complete', () => {
  const source = fs.readFileSync(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(source, /const departingSession = this\.surfaceSession;/);
  assert.match(source, /const departingRegion = this\.surfaceRegion;/);
  assert.match(source, /placeShipInSurfaceReturnOrbit\(body, departingSession, departingRegion\)/);
  assert.match(source, /surfaceTakeoffReferencePosition\(departingSession, body, this\.clock\.elapsedSimSeconds\)/);
  assert.match(source, /surfaceEngineProfile !== SURFACE_ENGINE_PROFILES\.LEGACY_HOME/);
});
