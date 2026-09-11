import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { generateSystem } from '../src/data/systemGenerator.js';
import { navigationBodySnapshot } from '../src/navigation/systemNavigation.js';
import { frameOrbitInsertionPlan } from '../src/physics/frameOrbitInsertion.js';
import { bodyFixedDirectionToInertial } from '../src/core/planetaryRotation.js';
import { availableSurfaceRegions, generateSurfaceRegion, surfaceHeightAt } from '../src/surface/surfaceGenerator.js';
import { createSurfaceSession, serializeSurfaceSession, surfaceTakeoffReferencePosition } from '../src/surface/surfaceSession.js';
import { createSurfaceWeatherState, stepSurfaceWeather, surfaceWeatherReading } from '../src/surface/surfaceWeather.js';
import { selectProofAirlessMoon, surfaceEngineSupport, SURFACE_ENGINE_PROFILES } from '../src/surface/surfaceProfiles.js';

function origin() {
  const system = generateSystem('ORIGIN-001');
  const home = system.bodies.find((body) => body.id === system.homeId);
  const proof = selectProofAirlessMoon(system.bodies);
  assert.ok(home);
  assert.ok(proof);
  return { system, home, proof };
}

test('ORIGIN enables exactly the legacy home world plus one deterministic airless proof moon', () => {
  const { system, home, proof } = origin();
  assert.equal(proof.id, 'moon-5-1');
  assert.equal(proof.name, 'Caelum-4361 f-A');
  const enabled = system.bodies.filter((body) => surfaceEngineSupport(body, system.bodies).enabled);
  assert.deepEqual(enabled.map((body) => body.id).sort(), [home.id, proof.id].sort());
  assert.equal(surfaceEngineSupport(proof, system.bodies).profileId, SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY);
  assert.deepEqual(availableSurfaceRegions(system, proof, system.bodies), [
    { id: 'airless-regolith', name: 'Regolith Survey Site', subtitle: 'Airless rocky moon proof surface' },
  ]);
});

test('airless proof region is deterministic, finite, vacuum-like, and anomaly/weather free', () => {
  const { system, proof } = origin();
  const a = generateSurfaceRegion(system, proof, 'airless-regolith', system.bodies);
  const b = generateSurfaceRegion(system, proof, 'airless-regolith', system.bodies);
  assert.deepEqual(a, b);
  assert.equal(a.surfaceEngineProfile, SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY);
  assert.equal(a.surfaceArchitectureFamily, 'AIRLESS_ROCKY');
  assert.equal(a.atmosphereMode, 'airless');
  assert.equal(a.weatherEnabled, false);
  assert.equal(a.anomalyVisualsEnabled, false);
  assert.equal(a.anomalies.length, 0);
  assert.ok(a.atmospherePressurePa < 1);
  assert.ok(a.atmosphereAtmProxy < 1e-5);
  assert.equal(a.palette.skyTop, 0);
  assert.equal(a.palette.skyHorizon, 0);
  assert.ok(a.gravityMps2 > 0 && a.gravityMps2 < 2);
  const heights = [[0, 0], [100, 100], [-500, 220], [650, -430]].map(([x, z]) => surfaceHeightAt(a, x, z));
  assert.ok(heights.every(Number.isFinite));
  assert.ok(Math.max(...heights) - Math.min(...heights) > 10);
});

test('legacy home-world region stays byte-identical apart from new architecture metadata', () => {
  const { system, home } = origin();
  const region = generateSurfaceRegion(system, home, 'shatterfall-basin', system.bodies);
  const legacyShape = { ...region };
  for (const key of ['surfaceModelVersion', 'surfaceEngineProfile', 'surfaceArchitectureFamily', 'atmosphereMode', 'weatherEnabled', 'anomalyVisualsEnabled', 'skyMode']) delete legacyShape[key];
  const digest = crypto.createHash('sha256').update(JSON.stringify(legacyShape)).digest('hex');
  assert.equal(digest, 'c8ac739d60d0b0ab639c00b4cc135973a5287da8efc26b2bf3a95762b95753e7');
  assert.equal(region.surfaceEngineProfile, SURFACE_ENGINE_PROFILES.LEGACY_HOME);
  assert.equal(region.weatherEnabled, true);
});

test('airless weather state never schedules wind or atmospheric events while local time still advances', () => {
  const { system, proof } = origin();
  const region = generateSurfaceRegion(system, proof, 'airless-regolith', system.bodies);
  const state = createSurfaceWeatherState(region);
  assert.equal(state.disabled, true);
  for (let i = 0; i < 2000; i += 1) stepSurfaceWeather(state, region, 1 / 30);
  const reading = surfaceWeatherReading(state);
  assert.equal(reading.type, 'vacuum');
  assert.equal(reading.windSpeedMps, 0);
  assert.equal(reading.intensity, 0);
  assert.equal(state.current.type, 'clear');
  assert.equal(state.nextEventAtSeconds, Infinity);
  assert.ok(state.elapsedSeconds > 0);
});

test('surface session saves profile/model identity for multi-world restore without breaking schema-1 fields', () => {
  const { system, proof } = origin();
  const region = generateSurfaceRegion(system, proof, 'airless-regolith', system.bodies);
  const session = createSurfaceSession(region);
  const snapshot = serializeSurfaceSession(session);
  assert.equal(snapshot.bodyId, proof.id);
  assert.equal(snapshot.surfaceProfileId, SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY);
  assert.equal(snapshot.surfaceModelVersion, 1);
  const restored = createSurfaceSession(region, snapshot);
  assert.equal(restored.surfaceProfileId, snapshot.surfaceProfileId);
  assert.equal(restored.surfaceModelVersion, snapshot.surfaceModelVersion);
});

test('NAV advertises the one proof moon as enabled without making every solid moon landable', () => {
  const { system, proof } = origin();
  const proofSnapshot = navigationBodySnapshot(proof, system.bodies, null);
  assert.match(proofSnapshot.surfaceCapability, /AIRLESS PROOF SURFACE · CURRENT BUILD/);
  const otherMoon = system.bodies.find((body) => body.kind === 'moon' && body.id !== proof.id);
  assert.ok(otherMoon);
  const otherSnapshot = navigationBodySnapshot(otherMoon, system.bodies, null);
  assert.match(otherSnapshot.surfaceCapability, /LANDING NOT YET ENABLED|PROFILE ARCHITECTURE READY/);
});

test('proof moon takeoff can use a circular orbit inside its conservative Hill window', () => {
  const { system, proof } = origin();
  const ship = { position: new Float64Array([proof.position[0] + proof.radius * 5, proof.position[1], proof.position[2]]) };
  const plan = frameOrbitInsertionPlan(ship, proof, system.bodies);
  assert.equal(plan.ok, true);
  assert.ok(plan.radiusMeters > proof.radius);
  assert.ok(plan.hillRadiusMeters > 0);
  assert.ok(plan.radiusMeters < plan.hillRadiusMeters * 0.47 + 1e-6);
});

test('airless renderer path explicitly removes fog/weather/ambient atmospheric presentation', () => {
  const source = fs.readFileSync(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(source, /this\.isAirless = region\.atmosphereMode === 'airless'/);
  assert.match(source, /this\.scene\.fog = this\.isAirless \? null/);
  assert.match(source, /region\.weatherEnabled === false \? null : createWeatherRig/);
  assert.match(source, /this\.isAirless \? 0\.025/);
  assert.match(source, /daylightFactor = this\.isAirless \? 0/);
});


test('moon takeoff reference follows the current rotated body-fixed landing anchor', () => {
  const { system, proof } = origin();
  const region = generateSurfaceRegion(system, proof, 'airless-regolith', system.bodies);
  const session = createSurfaceSession(region);
  session.bodyFixedAnchor = [0.61, 0.74, -0.28];
  const n = Math.hypot(...session.bodyFixedAnchor);
  session.bodyFixedAnchor = session.bodyFixedAnchor.map((v) => v / n);
  const t0 = 12345;
  const p0 = surfaceTakeoffReferencePosition(session, proof, t0);
  const p1 = surfaceTakeoffReferencePosition(session, proof, t0 + proof.rotationPeriodSeconds * 0.25);
  assert.ok(p0 && p1);
  const r0 = [p0[0] - proof.position[0], p0[1] - proof.position[1], p0[2] - proof.position[2]];
  const r1 = [p1[0] - proof.position[0], p1[1] - proof.position[1], p1[2] - proof.position[2]];
  assert.ok(Math.abs(Math.hypot(...r0) - proof.radius * 1.2) < 1e-6 * proof.radius);
  assert.ok(Math.abs(Math.hypot(...r1) - proof.radius * 1.2) < 1e-6 * proof.radius);
  const expected0 = bodyFixedDirectionToInertial(proof, session.bodyFixedAnchor, t0);
  const expected1 = bodyFixedDirectionToInertial(proof, session.bodyFixedAnchor, t0 + proof.rotationPeriodSeconds * 0.25);
  const unit0 = r0.map((v) => v / Math.hypot(...r0));
  const unit1 = r1.map((v) => v / Math.hypot(...r1));
  assert.ok(Math.hypot(unit0[0]-expected0[0], unit0[1]-expected0[1], unit0[2]-expected0[2]) < 1e-9);
  assert.ok(Math.hypot(unit1[0]-expected1[0], unit1[1]-expected1[1], unit1[2]-expected1[2]) < 1e-9);
  assert.ok(Math.hypot(unit0[0]-unit1[0], unit0[1]-unit1[1], unit0[2]-unit1[2]) > 0.5);
  const plan = frameOrbitInsertionPlan({ position: p1 }, proof, system.bodies);
  assert.equal(plan.ok, true);
  assert.ok(plan.radiusMeters < plan.hillRadiusMeters * 0.47 + 1e-6);
});

test('app moon return orbit derives its planning position from the live surface anchor', () => {
  const source = fs.readFileSync(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(source, /surfaceTakeoffReferencePosition\(this\.surfaceSession, body, this\.clock\.elapsedSimSeconds\)/);
  assert.match(source, /frameOrbitInsertionPlan\(planningShip, body, this\.bodies\)/);
});
