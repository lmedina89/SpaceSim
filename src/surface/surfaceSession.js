import { surfaceHeightAt, surfacePois } from './surfaceGenerator.js';
import { createSurfaceWeatherState, serializeSurfaceWeather } from './surfaceWeather.js';

export function createSurfaceSession(region, snapshot = null) {
  const landing = region?.landing ?? { x: 0, z: 0, yaw: 0 };
  const restoredIds = Array.isArray(snapshot?.scannedPoiIds) ? snapshot.scannedPoiIds : [];
  return {
    active: true,
    bodyId: region.bodyId,
    regionId: region.id,
    x: Number.isFinite(snapshot?.x) ? snapshot.x : landing.x,
    z: Number.isFinite(snapshot?.z) ? snapshot.z : landing.z,
    yaw: Number.isFinite(snapshot?.yaw) ? snapshot.yaw : landing.yaw,
    pitch: Number.isFinite(snapshot?.pitch) ? snapshot.pitch : -0.08,
    walkSpeedMps: 14,
    sprintSpeedMps: 24,
    lastMoveSpeedMps: 0,
    scannedPoiIds: new Set(restoredIds),
    selectedPoiId: snapshot?.selectedPoiId ?? null,
    hudExpanded: snapshot?.hudExpanded === true,
    bodyFixedAnchor: Array.isArray(snapshot?.bodyFixedAnchor) && snapshot.bodyFixedAnchor.length >= 3
      ? snapshot.bodyFixedAnchor.slice(0, 3).map((value) => Number(value))
      : null,
    anchorCapturedAtSimSeconds: Number.isFinite(Number(snapshot?.anchorCapturedAtSimSeconds)) ? Number(snapshot.anchorCapturedAtSimSeconds) : null,
    rotationModelVersion: Number.isFinite(Number(snapshot?.rotationModelVersion)) ? Math.max(1, Math.floor(Number(snapshot.rotationModelVersion))) : 1,
    weather: createSurfaceWeatherState(region, snapshot?.weather ?? null),
  };
}

export function serializeSurfaceSession(session) {
  if (!session?.active) return null;
  return {
    active: true,
    bodyId: session.bodyId,
    regionId: session.regionId,
    x: session.x,
    z: session.z,
    yaw: session.yaw,
    pitch: session.pitch,
    scannedPoiIds: [...session.scannedPoiIds],
    selectedPoiId: session.selectedPoiId ?? null,
    hudExpanded: session.hudExpanded === true,
    bodyFixedAnchor: Array.isArray(session.bodyFixedAnchor) ? session.bodyFixedAnchor.slice(0, 3) : null,
    anchorCapturedAtSimSeconds: Number.isFinite(Number(session.anchorCapturedAtSimSeconds)) ? Number(session.anchorCapturedAtSimSeconds) : null,
    rotationModelVersion: Number.isFinite(Number(session.rotationModelVersion)) ? Math.max(1, Math.floor(Number(session.rotationModelVersion))) : 1,
    weather: serializeSurfaceWeather(session.weather),
  };
}

export function stepSurfaceMovement(session, region, input, dt) {
  if (!session?.active || !region || !(dt > 0)) return session;
  const forwardInput = Math.max(-1, Math.min(1, Number(input?.forward) || 0));
  const strafeInput = Math.max(-1, Math.min(1, Number(input?.strafe) || 0));
  const mag = Math.hypot(forwardInput, strafeInput);
  if (mag < 1e-6) { session.lastMoveSpeedMps = 0; return session; }
  const f = forwardInput / Math.max(1, mag);
  const s = strafeInput / Math.max(1, mag);
  const speed = input?.sprint ? session.sprintSpeedMps : session.walkSpeedMps;
  const sin = Math.sin(session.yaw), cos = Math.cos(session.yaw);
  const dx = (sin * f + cos * s) * speed * dt;
  const dz = (cos * f - sin * s) * speed * dt;
  const limit = region.terrainSizeMeters * 0.5 - 28;
  session.x = Math.max(-limit, Math.min(limit, session.x + dx));
  session.z = Math.max(-limit, Math.min(limit, session.z + dz));
  session.lastMoveSpeedMps = speed;
  return session;
}

export function surfaceEyePosition(session, region, eyeHeightMeters = 1.72) {
  return [session.x, surfaceHeightAt(region, session.x, session.z) + eyeHeightMeters, session.z];
}

export function nearestSurfacePoi(session, region) {
  if (!session?.active || !region) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const poi of surfacePois(region)) {
    const d = Math.hypot(poi.x - session.x, poi.z - session.z);
    if (d < bestDistance) { best = poi; bestDistance = d; }
  }
  return best ? { poi: best, distanceMeters: bestDistance } : null;
}

export function scanNearestSurfacePoi(session, region) {
  const nearest = nearestSurfacePoi(session, region);
  if (!nearest) return { ok: false, reason: 'No surface POIs exist in this region.' };
  if (nearest.distanceMeters > (nearest.poi.scanRadiusMeters ?? 80)) {
    return { ok: false, reason: `${nearest.poi.name} is ${nearest.distanceMeters.toFixed(0)} m away; move within ${(nearest.poi.scanRadiusMeters ?? 80).toFixed(0)} m to scan.`, ...nearest };
  }
  const firstScan = !session.scannedPoiIds.has(nearest.poi.id);
  session.scannedPoiIds.add(nearest.poi.id);
  session.selectedPoiId = nearest.poi.id;
  return { ok: true, ...nearest, firstScan };
}
