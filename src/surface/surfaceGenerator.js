import { PHYSICS } from '../core/constants.js';
import { createRng, hashSeed } from '../util/prng.js';

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
  const broad = fbm(x / 620, z / 620, seedHash) * 92 * rough;
  const medium = fbm(x / 170 + 11.3, z / 170 - 7.8, seedHash ^ 0x51ed270b) * 34 * rough;
  const ridges = Math.abs(fbm(x / 390 - 4, z / 390 + 8, seedHash ^ 0x9e3779b9)) * 52 * rough;
  let h = broad + medium + ridges - 22;

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

export function generateSurfaceRegion(system, body) {
  if (!system?.seed || !body?.id) throw new Error('Surface generation requires a system seed and body.');
  const regionSeed = `${system.seed}:${body.id}:surface:showcase-v1`;
  const rng = createRng(regionSeed);
  const seedHash = hashSeed(regionSeed);
  const palette = BIOME_PALETTES[body.planetType] ?? BIOME_PALETTES.rocky;
  const gravityMps2 = PHYSICS.G * body.mass / Math.max(1, body.radius * body.radius);
  const tempK = equilibriumTemperatureK(system, body) + rng.range(-18, 16);
  const terrainSizeMeters = 2400;
  const anomalies = ANOMALY_TEMPLATES.map((template, i) => makeAnomalyPoi(template, i, rng));

  return {
    version: 1,
    id: `${body.id}:shatterfall-basin`,
    seed: regionSeed,
    seedHash,
    bodyId: body.id,
    bodyName: body.name,
    name: 'Shatterfall Basin',
    subtitle: 'Anomalous surface showcase region',
    planetType: body.planetType ?? 'rocky',
    gravityMps2,
    temperatureK: tempK,
    atmosphereAtmProxy: palette.atmosphere,
    terrainSizeMeters,
    terrainResolution: 72,
    palette,
    landing: { x: 0, z: 0, yaw: rng.range(-0.35, 0.35) },
    terrain: {
      roughness: body.planetType === 'ice' ? 0.72 : body.planetType === 'oceanic' ? 0.86 : 1,
      crater: { x: -520, z: -390, radius: 265, depth: 88 },
      ridge: { x: 540, z: -220 },
      glassBasin: { x: -510, z: 390 },
    },
    zones: {
      frost: { x: 360, z: 520, radius: 430 },
      ember: { x: 470, z: -470, radius: 390 },
      glass: { x: -540, z: 360, radius: 420 },
      mineral: { x: -360, z: -500, radius: 410 },
    },
    normalPois: [
      { id: 'surface-poi-crater', type: 'geology', name: 'Impact Basin Rim', realityClass: 'known', x: -520, z: -390, scanRadiusMeters: 95, signal: 'Shock-fractured terrain', summary: 'A conventional impact basin with a raised rim and exposed subsurface layers.', archive: 'Modeled as procedural terrain only; no detailed ejecta stratigraphy or impact age solver is active.' },
      { id: 'surface-poi-ridge', type: 'geology', name: 'Mineral Ridge', realityClass: 'known', x: 530, z: -180, scanRadiusMeters: 95, signal: 'Reflective mineral band', summary: 'A high ridge exposes bright mineral-bearing rock above the surrounding badlands.', archive: 'Geologic dressing derived from the seeded surface profile, not a mineral chemistry simulation.' },
    ],
    anomalies,
    scientificStatus: 'First landable-region foundation. Terrain, atmosphere, anomalies and environmental zones are seeded procedural presentation. Orbital N-body time is held while the local surface instance is active; atmospheric entry, fluid weather, ecosystems and surface rigid-body physics are future layers.',
  };
}

export function surfacePois(region) {
  return [...(region?.normalPois ?? []), ...(region?.anomalies ?? [])];
}
