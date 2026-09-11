import { derivePlanetaryEnvironment } from '../physics/planetaryEnvironment.js';

export const SURFACE_ARCHITECTURE_VERSION = 2;

export const SURFACE_ARCHITECTURE_FAMILIES = Object.freeze({
  ATMOSPHERIC_ROCKY: 'ATMOSPHERIC_ROCKY',
  AIRLESS_ROCKY: 'AIRLESS_ROCKY',
  ICE_VOLATILE: 'ICE_VOLATILE',
});

export const SURFACE_ENGINE_PROFILES = Object.freeze({
  LEGACY_HOME: 'legacy-atmospheric-anomaly-v1',
  ATMOSPHERIC_ROCKY: 'atmospheric-rocky-v1',
  AIRLESS_ROCKY: 'airless-rocky-v1',
  ICE_VOLATILE: 'ice-volatile-v1',
});

function finite(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function legacyHomeBody(bodies = []) {
  return bodies.find((body) => body?.landable && body?.surfaceProfile === 'anomalous-showcase-v1') ?? null;
}

export function architectureFamilyForEnvironment(environment) {
  if (!environment?.physicalSurfaceExists) return null;
  const atmosphere = environment.atmosphereClassId;
  const family = String(environment.surfaceFamily ?? '');
  if (family.includes('ICE') || environment.bodyClassId?.includes?.('ice-rich')) return SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE;
  if (atmosphere === 'airless' || atmosphere === 'trace') return SURFACE_ARCHITECTURE_FAMILIES.AIRLESS_ROCKY;
  return SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY;
}

export function selectProofAirlessMoon(bodies = []) {
  const candidates = [];
  for (const body of bodies) {
    if (body?.kind !== 'moon') continue;
    const environment = derivePlanetaryEnvironment(body, bodies);
    if (!environment?.physicalSurfaceExists) continue;
    if (architectureFamilyForEnvironment(environment) !== SURFACE_ARCHITECTURE_FAMILIES.AIRLESS_ROCKY) continue;
    if (environment.bodyClassId !== 'airless-rocky-moon') continue;
    const pressure = finite(environment.atmospherePressureProxyPa, Infinity);
    const temperature = finite(environment.equilibriumTemperatureK, Infinity);
    if (!(pressure < 1) || !(temperature >= 70 && temperature <= 260)) continue;
    // Favor a clean, temperate-enough vacuum proof case rather than the most extreme moon.
    // Stable body-id tie breaking guarantees deterministic selection without consuming RNG.
    const score = Math.abs(temperature - 150) + pressure * 12;
    candidates.push({ body, environment, score });
  }
  candidates.sort((a, b) => a.score - b.score || String(a.body.id).localeCompare(String(b.body.id)));
  return candidates[0]?.body ?? null;
}

export function selectExplorationRockyWorld(bodies = []) {
  const home = legacyHomeBody(bodies);
  const proof = selectProofAirlessMoon(bodies);
  const candidates = [];
  for (const body of bodies) {
    // v0.1.5.2 intentionally expands to one additional planet, not rogues or every moon.
    if (body?.kind !== 'planet' || body.id === home?.id || body.id === proof?.id || body.planetType === 'gas') continue;
    const environment = derivePlanetaryEnvironment(body, bodies);
    if (!environment?.physicalSurfaceExists) continue;
    if (architectureFamilyForEnvironment(environment) !== SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY) continue;
    const temperature = finite(environment.equilibriumTemperatureK, Infinity);
    const pressure = finite(environment.atmospherePressureProxyPa, Infinity);
    const gravity = finite(environment.surfaceGravityMps2, Infinity);
    if (!(temperature >= 150 && temperature <= 360)) continue;
    if (!(pressure >= 100 && pressure <= 40_000)) continue;
    if (!(gravity >= 2 && gravity <= 25)) continue;
    // Prefer a cold/thin-atmosphere contrast to the established temperate home world.
    const pressureScore = Math.abs(Math.log10(Math.max(1, pressure)) - Math.log10(700)) * 16;
    const score = Math.abs(temperature - 220) + pressureScore + Math.abs(gravity - 9.8) * 1.5;
    candidates.push({ body, score });
  }
  candidates.sort((a, b) => a.score - b.score || String(a.body.id).localeCompare(String(b.body.id)));
  return candidates[0]?.body ?? null;
}

export function selectExplorationIceWorld(bodies = []) {
  const candidates = [];
  for (const body of bodies) {
    // Defer rogue surfaces until their spin model is authoritative enough for body-fixed exploration.
    if (body?.kind !== 'moon' && body?.kind !== 'planet') continue;
    const environment = derivePlanetaryEnvironment(body, bodies);
    if (!environment?.physicalSurfaceExists) continue;
    if (architectureFamilyForEnvironment(environment) !== SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE) continue;
    const temperature = finite(environment.equilibriumTemperatureK, Infinity);
    const pressure = finite(environment.atmospherePressureProxyPa, Infinity);
    const icePotential = finite(environment.icePotential01, 0);
    if (!(temperature >= 35 && temperature <= 190)) continue;
    if (!(pressure >= 0 && pressure <= 500)) continue;
    if (!(icePotential >= 0.5)) continue;
    // Prefer a strongly ice-dominated, low-pressure moon for the first cryogenic reference surface.
    const moonPenalty = body.kind === 'moon' ? 0 : 18;
    const pressurePenalty = Math.log10(1 + pressure) * 5;
    const score = (1 - icePotential) * 100 + Math.abs(temperature - 90) * 0.08 + pressurePenalty + moonPenalty;
    candidates.push({ body, score });
  }
  candidates.sort((a, b) => a.score - b.score || String(a.body.id).localeCompare(String(b.body.id)));
  return candidates[0]?.body ?? null;
}

export function enabledExplorationSurfaceBodies(bodies = []) {
  const selected = [
    legacyHomeBody(bodies),
    selectProofAirlessMoon(bodies),
    selectExplorationRockyWorld(bodies),
    selectExplorationIceWorld(bodies),
  ].filter(Boolean);
  const unique = new Map(selected.map((body) => [body.id, body]));
  return [...unique.values()];
}

export function surfaceEngineSupport(body, bodies = []) {
  if (!body) return {
    enabled: false,
    family: null,
    profileId: null,
    regionId: null,
    reason: 'No body selected.',
  };

  const environment = derivePlanetaryEnvironment(body, bodies);
  const family = architectureFamilyForEnvironment(environment);

  if (body.landable && body.surfaceProfile === 'anomalous-showcase-v1') {
    return {
      enabled: true,
      proof: false,
      exploration: true,
      family: SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY,
      profileId: SURFACE_ENGINE_PROFILES.LEGACY_HOME,
      regionId: body.surfaceRegionId ?? 'shatterfall-basin',
      environment,
      reason: 'Existing detailed atmospheric reference surface.',
    };
  }

  const proofMoon = selectProofAirlessMoon(bodies);
  if (proofMoon?.id === body.id) {
    return {
      enabled: true,
      proof: true,
      exploration: true,
      family: SURFACE_ARCHITECTURE_FAMILIES.AIRLESS_ROCKY,
      profileId: SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY,
      regionId: 'airless-regolith',
      environment,
      reason: 'Airless rocky reference surface.',
    };
  }

  const rockyWorld = selectExplorationRockyWorld(bodies);
  if (rockyWorld?.id === body.id) {
    return {
      enabled: true,
      proof: false,
      exploration: true,
      family: SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY,
      profileId: SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY,
      regionId: 'tenuous-rocky-highland',
      environment,
      reason: 'Cold/tenuous rocky exploration reference surface.',
    };
  }

  const iceWorld = selectExplorationIceWorld(bodies);
  if (iceWorld?.id === body.id) {
    return {
      enabled: true,
      proof: false,
      exploration: true,
      family: SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE,
      profileId: SURFACE_ENGINE_PROFILES.ICE_VOLATILE,
      regionId: 'cryogenic-ice-shelf',
      environment,
      reason: 'Cryogenic ice/volatile exploration reference surface.',
    };
  }

  const profileId = family === SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE
    ? SURFACE_ENGINE_PROFILES.ICE_VOLATILE
    : family === SURFACE_ARCHITECTURE_FAMILIES.AIRLESS_ROCKY
      ? SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY
      : family === SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY
        ? SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY
        : null;

  return {
    enabled: false,
    proof: false,
    exploration: false,
    family,
    profileId,
    regionId: null,
    environment,
    reason: environment?.physicalSurfaceExists
      ? 'Solid surface classified; generalized profile exists architecturally but this world is not enabled in the current exploration set.'
      : environment?.landingReason ?? 'No supported solid surface.',
  };
}

export function surfaceCapabilityForBuild(body, bodies = []) {
  const support = surfaceEngineSupport(body, bodies);
  if (!support.environment) return null;
  if (support.enabled && support.profileId === SURFACE_ENGINE_PROFILES.LEGACY_HOME) return 'DETAILED SURFACE · CURRENT BUILD';
  if (support.enabled && support.proof) return 'AIRLESS REFERENCE SURFACE · CURRENT BUILD';
  if (support.enabled && support.profileId === SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY) return 'ROCKY EXPLORATION SURFACE · CURRENT BUILD';
  if (support.enabled && support.profileId === SURFACE_ENGINE_PROFILES.ICE_VOLATILE) return 'ICE / VOLATILE EXPLORATION SURFACE · CURRENT BUILD';
  if (support.environment.physicalSurfaceExists) return 'SOLID SURFACE · PROFILE ARCHITECTURE READY · LANDING NOT ENABLED';
  return support.environment.surfaceCapability;
}
