import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import {
  generateSurfaceRegion,
  surfaceHeightAt,
  surfacePois,
  SURFACE_REALITY_LABELS,
} from '../src/surface/surfaceGenerator.js';
import {
  createSurfaceSession,
  serializeSurfaceSession,
  stepSurfaceMovement,
  scanNearestSurfacePoi,
} from '../src/surface/surfaceSession.js';

function homeFor(seed = 'ORIGIN-001') {
  const system = generateSystem(seed);
  const body = system.bodies.find((entry) => entry.id === system.homeId);
  assert.ok(body, 'generated home planet should exist');
  return { system, body };
}

test('first generated home planet exposes the anomalous showcase landing profile', () => {
  const { system, body } = homeFor();
  assert.equal(body.kind, 'planet');
  assert.notEqual(body.planetType, 'gas');
  assert.equal(body.landable, true);
  assert.equal(body.surfaceProfile, 'anomalous-showcase-v1');
  assert.equal(body.surfaceRegionId, 'shatterfall-basin');
  assert.equal(system.metadata.landablePlanetCount, 1);

  const region = generateSurfaceRegion(system, body);
  assert.equal(region.name, 'Shatterfall Basin');
  assert.equal(region.bodyId, body.id);
  assert.equal(region.normalPois.length, 2);
  assert.equal(region.anomalies.length, 7);
  assert.equal(surfacePois(region).length, 9);
  const realityClasses = new Set(region.anomalies.map((entry) => entry.realityClass));
  for (const realityClass of ['speculative', 'anomalous', 'impossible']) assert.ok(realityClasses.has(realityClass));
  for (const entry of surfacePois(region)) assert.ok(SURFACE_REALITY_LABELS[entry.realityClass]);
});

test('surface generation is deterministic for the same system/body and changes with another seed', () => {
  const a = homeFor('SURFACE-DETERMINISM');
  const b = homeFor('SURFACE-DETERMINISM');
  const ra = generateSurfaceRegion(a.system, a.body);
  const rb = generateSurfaceRegion(b.system, b.body);
  assert.deepEqual(ra, rb);

  const c = homeFor('SURFACE-DETERMINISM-ALT');
  const rc = generateSurfaceRegion(c.system, c.body);
  assert.notEqual(ra.seedHash, rc.seedHash);
  assert.notDeepEqual(ra.anomalies.map(({ x, z }) => [x, z]), rc.anomalies.map(({ x, z }) => [x, z]));
});

test('seeded terrain is finite, non-flat, and bounded by the local surface region', () => {
  const { system, body } = homeFor('SURFACE-TERRAIN');
  const region = generateSurfaceRegion(system, body);
  const samples = [
    [0, 0], [100, 100], [-350, 210], [520, -390], [-700, 600], [800, -500],
  ].map(([x, z]) => surfaceHeightAt(region, x, z));
  for (const value of samples) assert.ok(Number.isFinite(value));
  assert.ok(Math.max(...samples) - Math.min(...samples) > 20, 'terrain should have meaningful elevation variation');
  assert.ok(region.terrainSizeMeters >= 2000);
  assert.ok(region.terrainResolution >= 64);
});

test('surface movement respects heading, sprint speed, and hard region bounds', () => {
  const { system, body } = homeFor('SURFACE-MOVEMENT');
  const region = generateSurfaceRegion(system, body);
  const session = createSurfaceSession(region);
  session.yaw = 0;
  stepSurfaceMovement(session, region, { forward: 1, strafe: 0, sprint: false }, 1);
  assert.equal(session.x, 0);
  assert.equal(session.z, session.walkSpeedMps);
  assert.equal(session.lastMoveSpeedMps, session.walkSpeedMps);

  const beforeSprint = session.z;
  stepSurfaceMovement(session, region, { forward: 1, strafe: 0, sprint: true }, 1);
  assert.equal(session.z - beforeSprint, session.sprintSpeedMps);

  session.x = region.terrainSizeMeters;
  session.z = -region.terrainSizeMeters;
  stepSurfaceMovement(session, region, { forward: 1, strafe: 1, sprint: true }, 1);
  const limit = region.terrainSizeMeters * 0.5 - 28;
  assert.ok(Math.abs(session.x) <= limit);
  assert.ok(Math.abs(session.z) <= limit);
});

test('surface scan requires local proximity and scan discoveries survive session serialization', () => {
  const { system, body } = homeFor('SURFACE-SCAN');
  const region = generateSurfaceRegion(system, body);
  const session = createSurfaceSession(region);
  const firstPoi = region.anomalies[0];

  const far = scanNearestSurfacePoi(session, region);
  assert.equal(far.ok, false);
  assert.equal(session.scannedPoiIds.size, 0);

  session.x = firstPoi.x;
  session.z = firstPoi.z;
  const scanned = scanNearestSurfacePoi(session, region);
  assert.equal(scanned.ok, true);
  assert.equal(scanned.firstScan, true);
  assert.equal(scanned.poi.id, firstPoi.id);
  assert.ok(session.scannedPoiIds.has(firstPoi.id));

  const again = scanNearestSurfacePoi(session, region);
  assert.equal(again.ok, true);
  assert.equal(again.firstScan, false);

  const snapshot = serializeSurfaceSession(session);
  const restored = createSurfaceSession(region, snapshot);
  assert.ok(restored.scannedPoiIds.has(firstPoi.id));
  assert.equal(restored.selectedPoiId, firstPoi.id);
  assert.equal(restored.x, firstPoi.x);
  assert.equal(restored.z, firstPoi.z);
});
