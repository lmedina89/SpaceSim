import { PHYSICS } from '../core/constants.js';
import { createRng, hashSeed } from '../util/prng.js';
import { derivePlanetaryEnvironment } from '../physics/planetaryEnvironment.js';
import { SURFACE_ENGINE_PROFILES, surfaceEngineSupport } from './surfaceProfiles.js';

const TAU = Math.PI * 2;

export const SURFACE_REALITY_LABELS = Object.freeze({
  known: 'KNOWN / GEOLOGIC',
  speculative: 'SPECULATIVE',
  anomalous: 'ANOMALOUS',
  impossible: 'IMPOSSIBLE / FICTIONAL',
});

const BIOME_PALETTES = Object.freeze({
  rocky: {
    name: 'Basalt highland', skyTop: 0x182337, skyHorizon: 0x7f6f69, fog: 0x493e3c,
    ground: [0.24, 0.22, 0.21], rock: 0x453f3b, accent: 0x786b5d, atmosphere: 0.48,
  },
  desert: {
    name: 'Ash-desert badlands', skyTop: 0x2b2432, skyHorizon: 0xb06f50, fog: 0x6d493d,
    ground: [0.34, 0.25, 0.20], rock: 0x4a342c, accent: 0xa06d4d, atmosphere: 0.72,
  },
  oceanic: {
    name: 'Exposed mineral continent', skyTop: 0x12314a, skyHorizon: 0x6fa0a4, fog: 0x426b73,
    ground: [0.19, 0.28, 0.27], rock: 0x344a48, accent: 0x6e9b8c, atmosphere: 1.08,
  },
  ice: {
    name: 'Cryogenic stone shelf', skyTop: 0x17293d, skyHorizon: 0xa8c7cf, fog: 0x78949b,
    ground: [0.42, 0.49, 0.52], rock: 0x53636a, accent: 0xaed5db, atmosphere: 0.38,
  },
});

const ANOMALY_TEMPLATES = Object.freeze([
  {
    type: 'fracture-gate', name: 'Fracture Gate', realityClass: 'impossible',
    signal: 'Nonlocal edge coherence', color: 0xc477ff,
    summary: 'A freestanding broken frame encloses a luminous volume whose parallax does not agree with the surrounding terrain.',
    archive: 'No transport or causality effect is simulated. The gate is an intentionally impossible visual anomaly and a future interaction hook.',
  },
  {
    type: 'gravity-knot', name: 'Gravity Knot', realityClass: 'anomalous',
    signal: 'Persistent levitation geometry', color: 0x72d7ff,
    summary: 'Stone fragments orbit an empty point in a stable pattern despite the local terrain remaining otherwise undisturbed.',
    archive: 'The floating stones are visual-only in this foundation. They do not add a hidden gravity source or alter the player movement model.',
  },
  {
    type: 'frozen-lightning', name: 'Frozen Lightning Field', realityClass: 'impossible',
    signal: 'Static high-energy filament', color: 0x8cf7ff,
    summary: 'Branching luminous discharges remain suspended like solid glass with no visible source or return path.',
    archive: 'Intentionally fictional. The arrested discharge is rendered as a persistent structure rather than an electrodynamic simulation.',
  },
  {
    type: 'reverse-shadow', name: 'Reverse Shadow Monolith', realityClass: 'impossible',
    signal: 'Anti-umbra contrast inversion', color: 0xff6abf,
    summary: 'A dark monolith projects its strongest shadow toward the local star instead of away from it.',
    archive: 'The reverse shadow deliberately violates the scene lighting model. It is cosmetic in v0.1.4.3 and exerts no physical force.',
  },
  {
    type: 'vacuum-bloom', name: 'Vacuum Bloom', realityClass: 'speculative',
    signal: 'Coherent spectral petals', color: 0x71ffd0,
    summary: 'A flower-like luminous structure repeatedly opens and closes above sterile ground without exchanging visible matter.',
    archive: 'Inspired loosely by vacuum-state imagery, but not a real quantum-field calculation. The phenomenon is explicitly speculative.',
  },
  {
    type: 'ghost-ruin', name: 'Ghost Ruin', realityClass: 'anomalous',
    signal: 'Phase-offset structural echo', color: 0x9db5ff,
    summary: 'Transparent architectural forms occupy several slightly offset positions at once, as though multiple ruins are being overlaid.',
    archive: 'No historical explanation is generated yet. The phase copies are visual discovery content and do not imply actual timeline branching.',
  },
  {
    type: 'chronal-shear', name: 'Chronal Shear', realityClass: 'impossible',
    signal: 'Repeated local temporal echo', color: 0xffc66e,
    summary: 'Thin planes repeatedly replay drifting dust and light at slightly displaced positions.',
    archive: 'This is a deliberately impossible time-themed anomaly. Simulation time itself is not modified by entering or scanning the site.',
  },
]);

export const SURFACE_REGION_PROFILES = Object.freeze({
  'shatterfall-basin': Object.freeze({
    id: 'shatterfall-basin',
    name: 'Shatterfall Basin',
    subtitle: 'Anomaly-rich basalt basin',
    biomeName: 'Basalt / ash anomaly basin',
    terrainSizeMeters: 2400, terrainResolution: 76, roughnessMultiplier: 1,
    terrain: { crater: { x: -520, z: -390, radius: 265, depth: 88 }, ridge: { x: 540, z: -220 }, glassBasin: { x: -510, z: 390 } },
    zones: { frost: { x: 360, z: 520, radius: 430 }, ember: { x: 470, z: -470, radius: 390 }, glass: { x: -540, z: 360, radius: 420 }, mineral: { x: -360, z: -500, radius: 410 } },
    anomalyIndexes: [0,1,2,3,4,5,6],
    weatherProfile: { anomalyChance: 0.38, preferred: ['dust-front','electrostatic-storm','fog-bank'], firstEventMinSeconds: 16, firstEventMaxSeconds: 32, calmMinSeconds: 24, calmMaxSeconds: 58 },
  }),
  'glasswind-flats': Object.freeze({
    id: 'glasswind-flats',
    name: 'Glasswind Flats',
    subtitle: 'Wind-polished dark plain',
    biomeName: 'Glasswind basalt flats',
    terrainSizeMeters: 2600, terrainResolution: 72, roughnessMultiplier: 0.58,
    terrain: { crater: { x: 610, z: 420, radius: 210, depth: 58 }, ridge: { x: -650, z: -180 }, glassBasin: { x: 120, z: 160 } },
    zones: { frost: { x: -480, z: 520, radius: 360 }, ember: { x: 580, z: -520, radius: 330 }, glass: { x: 70, z: 120, radius: 680 }, mineral: { x: -570, z: -420, radius: 350 } },
    anomalyIndexes: [0,3,4,6],
    weatherProfile: { anomalyChance: 0.28, preferred: ['dust-front','fog-bank'], firstEventMinSeconds: 18, firstEventMaxSeconds: 36, calmMinSeconds: 30, calmMaxSeconds: 70 },
  }),
  'frostscar-rise': Object.freeze({
    id: 'frostscar-rise',
    name: 'Frostscar Rise',
    subtitle: 'Cold fractured highland',
    biomeName: 'Frostscar mineral highland',
    terrainSizeMeters: 2300, terrainResolution: 78, roughnessMultiplier: 1.18,
    terrain: { crater: { x: -450, z: 500, radius: 230, depth: 76 }, ridge: { x: 310, z: -340 }, glassBasin: { x: 620, z: 430 } },
    zones: { frost: { x: 120, z: 160, radius: 720 }, ember: { x: -620, z: -520, radius: 260 }, glass: { x: 590, z: 390, radius: 310 }, mineral: { x: 420, z: -470, radius: 390 } },
    anomalyIndexes: [1,2,5,6],
    weatherProfile: { anomalyChance: 0.34, preferred: ['frost-squall','electrostatic-storm','fog-bank'], firstEventMinSeconds: 14, firstEventMaxSeconds: 30, calmMinSeconds: 26, calmMaxSeconds: 62 },
  }),
});

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function smooth(t) { return t * t * (3 - 2 * t); }

function hashNoise(ix, iz, seedHash) {
  let h = (seedHash ^ Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iz | 0, 0x165667b1)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(x, z, seedHash) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hashNoise(ix, iz, seedHash);
  const b = hashNoise(ix + 1, iz, seedHash);
  const c = hashNoise(ix, iz + 1, seedHash);
  const d = hashNoise(ix + 1, iz + 1, seedHash);
  const ab = a + (b - a) * fx;
  const cd = c + (d - c) * fx;
  return ab + (cd - ab) * fz;
}

function fbm(x, z, seedHash) {
  let value = 0, amp = 0.56, freq = 1, norm = 0;
  for (let i = 0; i < 4; i += 1) {
    value += (valueNoise(x * freq, z * freq, seedHash + i * 1013) * 2 - 1) * amp;
    norm += amp; amp *= 0.5; freq *= 2.03;
  }
  return value / Math.max(1e-6, norm);
}

function gaussian(x, z, cx, cz, radius) {
  const dx = x - cx, dz = z - cz;
  const r2 = dx * dx + dz * dz;
  return Math.exp(-r2 / Math.max(1, radius * radius));
}

export function surfaceHeightAt(region, x, z) {
  const seedHash = region.seedHash >>> 0;
  const rough = region.terrain.roughness;
  const broadAmplitude = Number.isFinite(Number(region.terrain.broadAmplitude)) ? Number(region.terrain.broadAmplitude) : 92;
  const mediumAmplitude = Number.isFinite(Number(region.terrain.mediumAmplitude)) ? Number(region.terrain.mediumAmplitude) : 34;
  const ridgeAmplitude = Number.isFinite(Number(region.terrain.ridgeAmplitude)) ? Number(region.terrain.ridgeAmplitude) : 52;
  const baseOffset = Number.isFinite(Number(region.terrain.baseOffset)) ? Number(region.terrain.baseOffset) : -22;
  const broad = fbm(x / 620, z / 620, seedHash) * broadAmplitude * rough;
  const medium = fbm(x / 170 + 11.3, z / 170 - 7.8, seedHash ^ 0x51ed270b) * mediumAmplitude * rough;
  const ridges = Math.abs(fbm(x / 390 - 4, z / 390 + 8, seedHash ^ 0x9e3779b9)) * ridgeAmplitude * rough;
  let h = broad + medium + ridges + baseOffset;

  const crater = region.terrain.crater;
  const dx = x - crater.x, dz = z - crater.z;
  const r = Math.hypot(dx, dz);
  if (r < crater.radius * 1.3) {
    const bowl = clamp01(1 - r / crater.radius);
    h -= bowl * bowl * crater.depth;
    const rim = Math.exp(-((r - crater.radius) ** 2) / Math.max(1, crater.radius * crater.radius * 0.018));
    h += rim * crater.depth * 0.22;
  }

  h += gaussian(x, z, region.terrain.ridge.x, region.terrain.ridge.z, 280) * 78;
  h -= gaussian(x, z, region.terrain.glassBasin.x, region.terrain.glassBasin.z, 240) * 38;
  return h;
}

export function surfaceZoneWeights(region, x, z) {
  const frost = gaussian(x, z, region.zones.frost.x, region.zones.frost.z, region.zones.frost.radius);
  const ember = gaussian(x, z, region.zones.ember.x, region.zones.ember.z, region.zones.ember.radius);
  const glass = gaussian(x, z, region.zones.glass.x, region.zones.glass.z, region.zones.glass.radius);
  const mineral = gaussian(x, z, region.zones.mineral.x, region.zones.mineral.z, region.zones.mineral.radius);
  return { frost, ember, glass, mineral };
}

export function surfaceColorAt(region, x, z, height = surfaceHeightAt(region, x, z)) {
  const base = region.palette.ground;
  if (region.surfaceEngineProfile === SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY) {
    const micro = fbm(x / 88 + 3.1, z / 88 - 5.7, region.seedHash ^ 0x4f1bbcdc);
    const broad = fbm(x / 410 - 8.2, z / 410 + 2.9, region.seedHash ^ 0xa533d49b);
    const high = clamp01((height + 70) / 230);
    const shade = Math.max(0.62, Math.min(1.25, 0.94 + micro * 0.11 + broad * 0.08 + high * 0.08));
    return [clamp01(base[0] * shade), clamp01(base[1] * shade), clamp01(base[2] * shade)];
  }
  if (region.surfaceEngineProfile === SURFACE_ENGINE_PROFILES.ICE_VOLATILE) {
    const micro = fbm(x / 74 + 7.7, z / 74 - 2.4, region.seedHash ^ 0x7a2f19d1);
    const contamination = clamp01((fbm(x / 520 - 1.7, z / 520 + 9.2, region.seedHash ^ 0x19c39f21) + 1) * 0.5);
    const high = clamp01((height + 90) / 240);
    const fracture = Math.abs(fbm(x / 135 + 3.8, z / 135 - 5.3, region.seedHash ^ 0xb17ad00d));
    const bright = Math.max(0.72, Math.min(1.28, 0.91 + high * 0.15 + micro * 0.08 - contamination * 0.13 - fracture * 0.035));
    return [clamp01(base[0] * bright), clamp01(base[1] * bright), clamp01(base[2] * bright)];
  }
  if (region.surfaceEngineProfile === SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY) {
    const micro = fbm(x / 96 - 4.1, z / 96 + 6.4, region.seedHash ^ 0x438e1c97);
    const dust = clamp01((fbm(x / 460 + 5.2, z / 460 - 1.8, region.seedHash ^ 0xd1930ac7) + 1) * 0.5);
    const high = clamp01((height + 80) / 260);
    const shade = Math.max(0.67, Math.min(1.22, 0.9 + high * 0.11 + micro * 0.08 + dust * 0.04));
    return [clamp01(base[0] * shade), clamp01(base[1] * shade), clamp01(base[2] * shade)];
  }
  const w = surfaceZoneWeights(region, x, z);
  const high = clamp01((height + 40) / 190);
  let r = base[0] + high * 0.055, g = base[1] + high * 0.045, b = base[2] + high * 0.04;
  const blend = (target, weight) => {
    const k = clamp01(weight) * 0.72;
    r += (target[0] - r) * k; g += (target[1] - g) * k; b += (target[2] - b) * k;
  };
  blend([0.60, 0.72, 0.76], w.frost);
  blend([0.31, 0.12, 0.07], w.ember);
  blend([0.18, 0.22, 0.25], w.glass);
  blend([0.28, 0.47, 0.39], w.mineral);
  return [clamp01(r), clamp01(g), clamp01(b)];
}

function equilibriumTemperatureK(system, body) {
  const luminosity = Math.max(0.02, Number(system?.metadata?.luminositySolar) || 1);
  const aAu = Math.max(0.08, Number(body?.semiMajorAxis) / PHYSICS.AU || 1);
  return 278.5 * Math.pow(luminosity, 0.25) / Math.sqrt(aAu);
}

function makeAnomalyPoi(template, i, rng) {
  const angle = (i / ANOMALY_TEMPLATES.length) * TAU + rng.range(-0.18, 0.18);
  const radius = 145 + i * 19 + rng.range(-18, 24);
  return {
    id: `surface-anomaly-${i + 1}`,
    ...template,
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    scanRadiusMeters: 78,
  };
}

function generateAirlessRockyRegion(system, body, environment) {
  const regionKey = 'airless-regolith';
  const regionSeed = `${system.seed}:${body.id}:surface:${regionKey}:surface-architecture-v1`;
  const rng = createRng(regionSeed);
  const seedHash = hashSeed(regionSeed);
  const albedo = Math.max(0.02, Math.min(0.9, Number(environment?.bondAlbedo) || 0.16));
  const tone = 0.13 + albedo * 0.24;
  const warmBias = rng.range(-0.015, 0.018);
  const palette = {
    name: 'Airless regolith highland',
    skyTop: 0x000000, skyHorizon: 0x000000, fog: 0x000000,
    ground: [clamp01(tone + warmBias), clamp01(tone + warmBias * 0.45), clamp01(tone - warmBias * 0.25)],
    rock: 0x5a5857, accent: 0xaaa8a2, atmosphere: Math.max(0, Number(environment?.atmospherePressureProxyAtm) || 0),
  };
  const terrainSizeMeters = 2600;
  const craterRadius = rng.range(230, 330);
  const landingYaw = rng.range(-0.35, 0.35);
  const craterAngle = rng.range(0, TAU);
  const craterDistance = rng.range(430, 620);
  const crater = {
    x: Math.cos(craterAngle) * craterDistance,
    z: Math.sin(craterAngle) * craterDistance,
    radius: craterRadius,
    depth: craterRadius * rng.range(0.20, 0.34),
  };
  const ridgeAngle = craterAngle + rng.range(1.4, 2.7);
  const ridge = { x: Math.cos(ridgeAngle) * rng.range(420, 650), z: Math.sin(ridgeAngle) * rng.range(420, 650) };
  const depressionAngle = ridgeAngle + rng.range(1.2, 2.3);
  const glassBasin = { x: Math.cos(depressionAngle) * rng.range(360, 560), z: Math.sin(depressionAngle) * rng.range(360, 560) };
  const landedShip = { x: -18, z: -20, yaw: landingYaw + 0.18 };
  const gravityMps2 = Number(environment?.surfaceGravityMps2) || (PHYSICS.G * body.mass / Math.max(1, body.radius * body.radius));
  const temperatureK = Number(environment?.currentEquilibriumTemperatureK ?? environment?.equilibriumTemperatureK) || equilibriumTemperatureK(system, body);

  return {
    version: 3,
    surfaceModelVersion: 1,
    surfaceEngineProfile: SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY,
    surfaceArchitectureFamily: 'AIRLESS_ROCKY',
    atmosphereMode: 'airless',
    weatherEnabled: false,
    anomalyVisualsEnabled: false,
    skyMode: 'vacuum',
    id: `${body.id}:${regionKey}`,
    regionKey,
    seed: regionSeed,
    seedHash,
    bodyId: body.id,
    bodyName: body.name,
    name: 'Regolith Survey Site',
    subtitle: 'Airless rocky moon proof surface',
    planetType: body.planetType ?? 'rocky',
    gravityMps2,
    temperatureK,
    atmospherePressurePa: Math.max(0, Number(environment?.atmospherePressureProxyPa) || 0),
    atmosphereAtmProxy: Math.max(0, Number(environment?.atmospherePressureProxyAtm) || 0),
    terrainSizeMeters,
    terrainResolution: 76,
    palette,
    landing: { x: 0, z: 0, yaw: landingYaw },
    landedShip,
    terrain: {
      roughness: 0.74 + rng.range(-0.06, 0.08),
      crater,
      ridge,
      glassBasin,
    },
    zones: {
      frost: { x: 20_000, z: 20_000, radius: 1 },
      ember: { x: 20_100, z: 20_100, radius: 1 },
      glass: { x: 20_200, z: 20_200, radius: 1 },
      mineral: { x: 20_300, z: 20_300, radius: 1 },
    },
    weatherProfile: { enabled: false, anomalyChance: 0, preferred: [], firstEventMinSeconds: 1e12, firstEventMaxSeconds: 1e12, calmMinSeconds: 1e12, calmMaxSeconds: 1e12 },
    normalPois: [
      { id: `${regionKey}:crater-rim`, type: 'geology', name: 'Primary Crater Rim', realityClass: 'known', x: crater.x, z: crater.z, scanRadiusMeters: 100, signal: 'Excavated regolith / impact structure', summary: 'A conventional impact basin cut into the airless regolith.', archive: 'Procedural geology proxy only; impact age and mineral chemistry are not yet solved.' },
      { id: `${regionKey}:ejecta-ridge`, type: 'geology', name: 'Ejecta Ridge', realityClass: 'known', x: ridge.x, z: ridge.z, scanRadiusMeters: 95, signal: 'Blocky high-albedo ejecta proxy', summary: 'A raised ridge of impact-processed surface material.', archive: 'Brightness and texture are generated from the environment/profile model, not spectroscopy.' },
    ],
    anomalies: [],
    scientificStatus: 'Multi-world surface architecture proof. This body uses the canonical planetary environment record to drive an airless profile: no atmosphere fog, no wind, no weather events and a black sky. Terrain/albedo/geology remain deterministic procedural proxies; no mineral chemistry, regolith mechanics or thermal-inertia model is solved yet.',
  };
}


function generateAtmosphericRockyRegion(system, body, environment) {
  const regionKey = 'tenuous-rocky-highland';
  const regionSeed = `${system.seed}:${body.id}:surface:${regionKey}:multiworld-v1`;
  const rng = createRng(regionSeed);
  const seedHash = hashSeed(regionSeed);
  const albedo = Math.max(0.02, Math.min(0.9, Number(environment?.bondAlbedo) || 0.24));
  const pressurePa = Math.max(0, Number(environment?.atmospherePressureProxyPa) || 0);
  const pressureAtm = Math.max(0, Number(environment?.atmospherePressureProxyAtm) || 0);
  const coldness = clamp01((300 - (Number(environment?.equilibriumTemperatureK) || 240)) / 180);
  const tone = 0.18 + (1 - albedo) * 0.13;
  const palette = {
    name: 'Tenuous rocky highland',
    skyTop: 0x10151c,
    skyHorizon: 0x4c403b,
    fog: 0x514640,
    ground: [clamp01(tone + 0.08), clamp01(tone + 0.035), clamp01(tone + 0.015 + coldness * 0.025)],
    rock: 0x47423f,
    accent: 0x8a776b,
    atmosphere: pressureAtm,
  };
  const terrainSizeMeters = 3000;
  const craterRadius = rng.range(250, 390);
  const craterAngle = rng.range(0, TAU);
  const craterDistance = rng.range(520, 760);
  const crater = {
    x: Math.cos(craterAngle) * craterDistance,
    z: Math.sin(craterAngle) * craterDistance,
    radius: craterRadius,
    depth: craterRadius * rng.range(0.16, 0.27),
  };
  const ridgeAngle = craterAngle + rng.range(1.2, 2.6);
  const ridge = { x: Math.cos(ridgeAngle) * rng.range(520, 780), z: Math.sin(ridgeAngle) * rng.range(520, 780) };
  const basinAngle = ridgeAngle + rng.range(1.1, 2.4);
  const glassBasin = { x: Math.cos(basinAngle) * rng.range(430, 700), z: Math.sin(basinAngle) * rng.range(430, 700) };
  const landingYaw = rng.range(-0.35, 0.35);
  const landedShip = { x: -18, z: -20, yaw: landingYaw + 0.18 };
  const gravityMps2 = Number(environment?.surfaceGravityMps2) || (PHYSICS.G * body.mass / Math.max(1, body.radius * body.radius));
  const temperatureK = Number(environment?.currentEquilibriumTemperatureK ?? environment?.equilibriumTemperatureK) || equilibriumTemperatureK(system, body);
  // This is a visibility/presentation proxy only. It deliberately scales down with pressure and
  // does not claim a solved aerosol optical depth or radiative-transfer atmosphere.
  const fogDensityProxy = 0.000018 + Math.sqrt(Math.min(0.03, pressureAtm)) * 0.00038;

  return {
    version: 4,
    surfaceModelVersion: 2,
    surfaceEngineProfile: SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY,
    surfaceArchitectureFamily: 'ATMOSPHERIC_ROCKY',
    atmosphereMode: 'tenuous',
    weatherEnabled: pressurePa >= 100,
    anomalyVisualsEnabled: false,
    skyMode: 'thin-atmosphere-proxy',
    id: `${body.id}:${regionKey}`,
    regionKey,
    seed: regionSeed,
    seedHash,
    bodyId: body.id,
    bodyName: body.name,
    name: 'Tenuous Highland Survey',
    subtitle: 'Cold rocky terrain under a thin modeled atmosphere',
    planetType: body.planetType ?? 'rocky',
    gravityMps2,
    temperatureK,
    temperatureModel: 'radiative-equilibrium',
    atmospherePressurePa: pressurePa,
    atmosphereAtmProxy: pressureAtm,
    fogDensityProxy,
    ambientSkyIntensity: 0.18,
    terrainSizeMeters,
    terrainResolution: 82,
    materialRoughness: 0.93,
    materialMetalness: 0.025,
    palette,
    landing: { x: 0, z: 0, yaw: landingYaw },
    landedShip,
    terrain: {
      roughness: 0.9 + rng.range(-0.05, 0.07),
      broadAmplitude: 108,
      mediumAmplitude: 31,
      ridgeAmplitude: 44,
      baseOffset: -24,
      crater,
      ridge,
      glassBasin,
    },
    zones: {
      frost: { x: 18_000, z: 18_000, radius: 1 },
      ember: { x: 18_100, z: 18_100, radius: 1 },
      glass: { x: 18_200, z: 18_200, radius: 1 },
      mineral: { x: 18_300, z: 18_300, radius: 1 },
    },
    weatherProfile: {
      enabled: pressurePa >= 100,
      anomalyChance: 0,
      allowAnomalous: false,
      allowedTypes: ['dust-front', 'frost-squall'],
      preferred: temperatureK < 235 ? ['frost-squall', 'dust-front'] : ['dust-front'],
      firstEventMinSeconds: 28,
      firstEventMaxSeconds: 58,
      calmMinSeconds: 45,
      calmMaxSeconds: 105,
    },
    normalPois: [
      { id: `${regionKey}:weathered-rim`, type: 'geology', name: 'Weathered Crater Rim', realityClass: 'known', x: crater.x, z: crater.z, scanRadiusMeters: 105, signal: 'Impact-exposed rocky strata proxy', summary: 'A conventional crater rim modified by the local terrain/weather presentation model.', archive: 'Procedural geology only; stratigraphy, mineral chemistry, erosion rate and age are not solved.' },
      { id: `${regionKey}:highland-ridge`, type: 'geology', name: 'Highland Ridge', realityClass: 'known', x: ridge.x, z: ridge.z, scanRadiusMeters: 100, signal: 'Elevated fractured bedrock proxy', summary: 'A raised rocky ridge generated from the body-specific surface seed.', archive: 'Topography is deterministic but not a tectonic reconstruction or spectroscopic composition map.' },
    ],
    anomalies: [],
    scientificStatus: 'Multi-world rocky exploration surface. Canonical gravity, pressure proxy, equilibrium temperature and body rotation drive the local presentation. Terrain and aerosols/weather are deterministic proxies; greenhouse climate, composition, erosion, hydrology and atmospheric radiative transfer are not solved yet.',
  };
}

function generateIceVolatileRegion(system, body, environment) {
  const regionKey = 'cryogenic-ice-shelf';
  const regionSeed = `${system.seed}:${body.id}:surface:${regionKey}:multiworld-v1`;
  const rng = createRng(regionSeed);
  const seedHash = hashSeed(regionSeed);
  const albedo = Math.max(0.02, Math.min(0.9, Number(environment?.bondAlbedo) || 0.55));
  const pressurePa = Math.max(0, Number(environment?.atmospherePressureProxyPa) || 0);
  const pressureAtm = Math.max(0, Number(environment?.atmospherePressureProxyAtm) || 0);
  const icePotential = clamp01(Number(environment?.icePotential01) || 0.6);
  const brightness = 0.42 + albedo * 0.34 + icePotential * 0.08;
  const palette = {
    name: 'Cryogenic ice / rock shelf',
    skyTop: 0x000000,
    skyHorizon: 0x000000,
    fog: 0x000000,
    ground: [clamp01(brightness * 0.84), clamp01(brightness * 0.94), clamp01(brightness)],
    rock: 0x51616b,
    accent: 0xc6e6ee,
    atmosphere: pressureAtm,
  };
  const terrainSizeMeters = 2800;
  const craterRadius = rng.range(210, 310);
  const craterAngle = rng.range(0, TAU);
  const craterDistance = rng.range(480, 710);
  const crater = {
    x: Math.cos(craterAngle) * craterDistance,
    z: Math.sin(craterAngle) * craterDistance,
    radius: craterRadius,
    depth: craterRadius * rng.range(0.13, 0.22),
  };
  const ridgeAngle = craterAngle + rng.range(1.3, 2.5);
  const ridge = { x: Math.cos(ridgeAngle) * rng.range(470, 720), z: Math.sin(ridgeAngle) * rng.range(470, 720) };
  const basinAngle = ridgeAngle + rng.range(1.2, 2.4);
  const glassBasin = { x: Math.cos(basinAngle) * rng.range(380, 620), z: Math.sin(basinAngle) * rng.range(380, 620) };
  const landingYaw = rng.range(-0.35, 0.35);
  const landedShip = { x: -18, z: -20, yaw: landingYaw + 0.18 };
  const gravityMps2 = Number(environment?.surfaceGravityMps2) || (PHYSICS.G * body.mass / Math.max(1, body.radius * body.radius));
  const temperatureK = Number(environment?.currentEquilibriumTemperatureK ?? environment?.equilibriumTemperatureK) || equilibriumTemperatureK(system, body);
  const effectivelyAirless = pressurePa < 1;

  return {
    version: 4,
    surfaceModelVersion: 2,
    surfaceEngineProfile: SURFACE_ENGINE_PROFILES.ICE_VOLATILE,
    surfaceArchitectureFamily: 'ICE_VOLATILE',
    atmosphereMode: effectivelyAirless ? 'airless' : 'trace',
    weatherEnabled: false,
    anomalyVisualsEnabled: false,
    skyMode: effectivelyAirless ? 'vacuum' : 'trace-atmosphere-proxy',
    id: `${body.id}:${regionKey}`,
    regionKey,
    seed: regionSeed,
    seedHash,
    bodyId: body.id,
    bodyName: body.name,
    name: 'Cryogenic Ice Shelf',
    subtitle: 'Ice-rich volatile terrain reference surface',
    planetType: 'ice',
    gravityMps2,
    temperatureK,
    temperatureModel: 'radiative-equilibrium',
    atmospherePressurePa: pressurePa,
    atmosphereAtmProxy: pressureAtm,
    fogDensityProxy: 0,
    ambientSkyIntensity: 0.02,
    terrainSizeMeters,
    terrainResolution: 82,
    materialRoughness: 0.62,
    materialMetalness: 0.015,
    palette,
    landing: { x: 0, z: 0, yaw: landingYaw },
    landedShip,
    terrain: {
      roughness: 0.7 + rng.range(-0.05, 0.08),
      broadAmplitude: 74,
      mediumAmplitude: 27,
      ridgeAmplitude: 36,
      baseOffset: -16,
      crater,
      ridge,
      glassBasin,
    },
    zones: {
      frost: { x: 17_000, z: 17_000, radius: 1 },
      ember: { x: 17_100, z: 17_100, radius: 1 },
      glass: { x: 17_200, z: 17_200, radius: 1 },
      mineral: { x: 17_300, z: 17_300, radius: 1 },
    },
    weatherProfile: { enabled: false, anomalyChance: 0, allowAnomalous: false, allowedTypes: [], preferred: [], firstEventMinSeconds: 1e12, firstEventMaxSeconds: 1e12, calmMinSeconds: 1e12, calmMaxSeconds: 1e12 },
    normalPois: [
      { id: `${regionKey}:fracture-field`, type: 'geology', name: 'Fractured Ice Field', realityClass: 'known', x: ridge.x, z: ridge.z, scanRadiusMeters: 105, signal: 'High-reflectance fractured surface proxy', summary: 'A field of disrupted ice-rich material crossing an older ridge.', archive: 'Ice abundance comes from the environment proxy; crystal phase, salts, organics and fracture mechanics are not solved.' },
      { id: `${regionKey}:dark-ejecta`, type: 'geology', name: 'Dark Ejecta Patch', realityClass: 'known', x: crater.x, z: crater.z, scanRadiusMeters: 105, signal: 'Low-albedo contaminant/ejecta proxy', summary: 'Darker impact-processed material interrupts the brighter cryogenic surface.', archive: 'The contrast is procedural and does not claim a measured contaminant composition.' },
    ],
    anomalies: [],
    scientificStatus: 'Multi-world cryogenic exploration surface. Canonical gravity, equilibrium temperature, albedo, ice potential and body rotation drive the local presentation. Ice texture, fracture fields and dark contaminants are deterministic geological proxies; subsurface ocean state, composition, phase transitions and thermal evolution are not solved.',
  };
}

export function availableSurfaceRegions(system, body, bodies = system?.bodies ?? []) {
  if (!system?.seed || !body?.id) return [];
  const support = surfaceEngineSupport(body, bodies);
  if (!support.enabled) return [];
  if (support.profileId === SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY) {
    return [{ id: 'airless-regolith', name: 'Regolith Survey Site', subtitle: 'Airless rocky reference surface' }];
  }
  if (support.profileId === SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY) {
    return [{ id: 'tenuous-rocky-highland', name: 'Tenuous Highland Survey', subtitle: 'Cold rocky terrain under a thin modeled atmosphere' }];
  }
  if (support.profileId === SURFACE_ENGINE_PROFILES.ICE_VOLATILE) {
    return [{ id: 'cryogenic-ice-shelf', name: 'Cryogenic Ice Shelf', subtitle: 'Ice-rich volatile terrain reference surface' }];
  }
  return Object.values(SURFACE_REGION_PROFILES).map((profile) => ({
    id: profile.id,
    name: profile.name,
    subtitle: profile.subtitle,
  }));
}

export function generateSurfaceRegion(system, body, requestedRegionId = 'shatterfall-basin', bodies = system?.bodies ?? []) {
  if (!system?.seed || !body?.id) throw new Error('Surface generation requires a system seed and body.');
  const support = surfaceEngineSupport(body, bodies);
  if (!support.enabled) throw new Error(`Surface engine is not enabled for ${body.name ?? body.id}.`);
  if (support.profileId === SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY) {
    return generateAirlessRockyRegion(system, body, support.environment ?? derivePlanetaryEnvironment(body, bodies));
  }
  if (support.profileId === SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY) {
    return generateAtmosphericRockyRegion(system, body, support.environment ?? derivePlanetaryEnvironment(body, bodies));
  }
  if (support.profileId === SURFACE_ENGINE_PROFILES.ICE_VOLATILE) {
    return generateIceVolatileRegion(system, body, support.environment ?? derivePlanetaryEnvironment(body, bodies));
  }
  const profile = SURFACE_REGION_PROFILES[requestedRegionId] ?? SURFACE_REGION_PROFILES['shatterfall-basin'];
  const regionSeed = `${system.seed}:${body.id}:surface:${profile.id}:environment-v2`;
  const rng = createRng(regionSeed);
  const seedHash = hashSeed(regionSeed);
  const basePalette = BIOME_PALETTES[body.planetType] ?? BIOME_PALETTES.rocky;
  const palette = { ...basePalette, name: profile.biomeName ?? basePalette.name };
  const gravityMps2 = PHYSICS.G * body.mass / Math.max(1, body.radius * body.radius);
  const regionTemperatureBias = profile.id === 'frostscar-rise' ? -24 : profile.id === 'glasswind-flats' ? 6 : 0;
  const tempK = equilibriumTemperatureK(system, body) + regionTemperatureBias + rng.range(-14, 12);
  const anomalies = profile.anomalyIndexes.map((templateIndex, i) => makeAnomalyPoi(ANOMALY_TEMPLATES[templateIndex], i, rng));
  const terrainSizeMeters = profile.terrainSizeMeters;
  const landingYaw = rng.range(-0.35, 0.35);
  const landedShip = { x: -18, z: -20, yaw: landingYaw + 0.18 };

  return {
    version: 2,
    surfaceModelVersion: 1,
    surfaceEngineProfile: SURFACE_ENGINE_PROFILES.LEGACY_HOME,
    surfaceArchitectureFamily: 'ATMOSPHERIC_ROCKY',
    atmosphereMode: 'atmospheric',
    weatherEnabled: true,
    anomalyVisualsEnabled: true,
    skyMode: 'atmospheric-proxy',
    id: `${body.id}:${profile.id}`,
    regionKey: profile.id,
    seed: regionSeed,
    seedHash,
    bodyId: body.id,
    bodyName: body.name,
    name: profile.name,
    subtitle: profile.subtitle,
    planetType: body.planetType ?? 'rocky',
    gravityMps2,
    temperatureK: tempK,
    atmosphereAtmProxy: palette.atmosphere,
    terrainSizeMeters,
    terrainResolution: profile.terrainResolution,
    palette,
    landing: { x: 0, z: 0, yaw: landingYaw },
    landedShip,
    terrain: {
      roughness: (body.planetType === 'ice' ? 0.72 : body.planetType === 'oceanic' ? 0.86 : 1) * profile.roughnessMultiplier,
      crater: { ...profile.terrain.crater },
      ridge: { ...profile.terrain.ridge },
      glassBasin: { ...profile.terrain.glassBasin },
    },
    zones: {
      frost: { ...profile.zones.frost },
      ember: { ...profile.zones.ember },
      glass: { ...profile.zones.glass },
      mineral: { ...profile.zones.mineral },
    },
    weatherProfile: { ...profile.weatherProfile },
    normalPois: [
      { id: `${profile.id}:geology-crater`, type: 'geology', name: 'Impact Basin Rim', realityClass: 'known', x: profile.terrain.crater.x, z: profile.terrain.crater.z, scanRadiusMeters: 95, signal: 'Shock-fractured terrain', summary: 'A conventional impact basin with a raised rim and exposed subsurface layers.', archive: 'Modeled as procedural terrain only; no detailed ejecta stratigraphy or impact age solver is active.' },
      { id: `${profile.id}:geology-ridge`, type: 'geology', name: 'Mineral Ridge', realityClass: 'known', x: profile.terrain.ridge.x, z: profile.terrain.ridge.z, scanRadiusMeters: 95, signal: 'Reflective mineral band', summary: 'A high ridge exposes bright mineral-bearing rock above the surrounding terrain.', archive: 'Geologic dressing derived from the seeded surface profile, not a mineral chemistry simulation.' },
    ],
    anomalies,
    scientificStatus: 'Planetary environment foundation. Terrain, atmosphere, weather, parked spacecraft and anomalies are seeded procedural presentation. Surface weather advances on a separate local real-time clock while celestial N-body time continues at 1× through a body-fixed rotating surface observer. Weather can alter visibility and presentation but does not yet apply aerodynamic force, wetness, erosion, damage or thermodynamic simulation.',
  };
}

export function surfacePois(region) {
  return [...(region?.normalPois ?? []), ...(region?.anomalies ?? [])];
}
