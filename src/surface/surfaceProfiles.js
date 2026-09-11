import { derivePlanetaryEnvironment } from '../physics/planetaryEnvironment.js';

export const SURFACE_ARCHITECTURE_VERSION = 1;

export const SURFACE_ARCHITECTURE_FAMILIES = Object.freeze({
  ATMOSPHERIC_ROCKY: 'ATMOSPHERIC_ROCKY',
  AIRLESS_ROCKY: 'AIRLESS_ROCKY',
  ICE_VOLATILE: 'ICE_VOLATILE',
});

export const SURFACE_ENGINE_PROFILES = Object.freeze({
  LEGACY_HOME: 'legacy-atmospheric-anomaly-v1',
  AIRLESS_ROCKY: 'airless-rocky-v1',
  ICE_VOLATILE: 'ice-volatile-v1',
});

function finite(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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
      family: SURFACE_ARCHITECTURE_FAMILIES.AIRLESS_ROCKY,
      profileId: SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY,
      regionId: 'airless-regolith',
      environment,
      reason: 'v0.1.5.1 airless-moon architecture proof surface.',
    };
  }

  const profileId = family === SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE
    ? SURFACE_ENGINE_PROFILES.ICE_VOLATILE
    : family === SURFACE_ARCHITECTURE_FAMILIES.AIRLESS_ROCKY
      ? SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY
      : family === SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY
        ? 'atmospheric-rocky-v1'
        : null;

  return {
    enabled: false,
    proof: false,
    family,
    profileId,
    regionId: null,
    environment,
    reason: environment?.physicalSurfaceExists
      ? 'Solid surface classified; generalized profile exists architecturally but landing remains disabled in this build.'
      : environment?.landingReason ?? 'No supported solid surface.',
  };
}

export function surfaceCapabilityForBuild(body, bodies = []) {
  const support = surfaceEngineSupport(body, bodies);
  if (!support.environment) return null;
  if (support.enabled && support.profileId === SURFACE_ENGINE_PROFILES.LEGACY_HOME) return 'DETAILED SURFACE · CURRENT BUILD';
  if (support.enabled && support.profileId === SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY) return 'AIRLESS PROOF SURFACE · CURRENT BUILD';
  if (support.environment.physicalSurfaceExists) return 'SOLID SURFACE · PROFILE ARCHITECTURE READY · LANDING NOT YET ENABLED';
  return support.environment.surfaceCapability;
}
