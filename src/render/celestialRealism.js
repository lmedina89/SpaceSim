import { PHYSICS } from '../core/constants.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function smoothstep(edge0, edge1, value) {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function rotationalFlatteningProxy(body) {
  const mass = Math.max(0, Number(body?.mass) || 0);
  const radius = Math.max(0, Number(body?.radius) || 0);
  const period = Math.abs(Number(body?.rotationPeriodSeconds) || 0);
  if (!(mass > 0 && radius > 0 && period > 0)) return 0;
  const omega = (Math.PI * 2) / period;
  const q = (omega * omega * radius ** 3) / (PHYSICS.G * mass);
  // First-order hydrostatic visual proxy. Real flattening depends on interior structure.
  // The cap prevents unstable/unphysical geometry for bodies outside this approximation.
  const cap = body?.planetType === 'gas' ? 0.13 : 0.045;
  return clamp(0.72 * q, 0, cap);
}

export function planetaryMaterialProfile(body, environment = null) {
  const gas = body?.planetType === 'gas' || environment?.physicalSurfaceExists === false;
  const family = String(environment?.surfaceFamily ?? '').toUpperCase();
  const bodyClass = String(environment?.bodyClassId ?? '').toLowerCase();
  const ice = clamp(environment?.icePotential01 ?? (family.includes('ICE') ? 0.72 : 0), 0, 1);
  const volatile = clamp(environment?.volatileInventory01 ?? 0.2, 0, 1);
  const albedo = clamp(environment?.bondAlbedo ?? 0.28, 0.02, 0.92);
  const pressure = Math.max(0, Number(environment?.atmospherePressureProxyPa) || 0);
  const rocky = !gas && !family.includes('ICE');
  const oceanic = String(body?.planetType ?? '').toLowerCase() === 'oceanic' || bodyClass.includes('volatile-rich');
  const desert = String(body?.planetType ?? '').toLowerCase() === 'desert' || bodyClass.includes('dry-rocky');

  return {
    id: gas ? 'gas-envelope' : ice > 0.48 || family.includes('ICE') ? 'ice-rock' : oceanic ? 'volatile-rock' : desert ? 'dry-rock' : 'rock',
    gas,
    rocky,
    oceanic,
    desert,
    ice,
    volatile,
    albedo,
    pressurePa: pressure,
    flattening: rotationalFlatteningProxy(body),
    baseContrast: gas ? 0.26 : desert ? 0.31 : ice > 0.48 ? 0.23 : oceanic ? 0.28 : 0.34,
    smallScaleContrast: gas ? 0.08 : ice > 0.48 ? 0.18 : 0.24,
    roughness: gas ? 0.58 : ice > 0.48 ? 0.68 : oceanic ? 0.70 : 0.88,
    bumpScale: gas ? 0 : rocky ? 0.020 + (1 - albedo) * 0.018 : 0.012,
    textureWidth: body?.kind === 'moon' ? 512 : 768,
    textureHeight: body?.kind === 'moon' ? 256 : 384,
    bandStrength: gas ? 0.72 : 0,
    hazeHint: clamp(Math.log10(1 + pressure) / 6, 0, 1),
    scientificBoundary: gas
      ? 'Banding is a deterministic visual proxy driven by canonical gas-envelope classification; atmospheric dynamics and cloud chemistry are not solved.'
      : 'Surface color/relief is a deterministic multiscale appearance proxy driven by canonical environment class/albedo/ice potential; mineralogy and global topography are not solved.',
  };
}

export function nearOrbitDetailProfile(apparentRadiusRad = 0) {
  const angle = clamp(apparentRadiusRad, 0, Math.PI / 2);
  const resolved = smoothstep(0.010, 0.12, angle);
  const close = smoothstep(0.08, 0.52, angle);
  const huge = smoothstep(0.42, 1.25, angle);
  return {
    apparentRadiusRad: angle,
    resolved,
    close,
    huge,
    bumpMultiplier: 0.25 + 0.75 * resolved,
    contrastMultiplier: 0.72 + 0.28 * resolved,
    markerSuppression: smoothstep(0.18, 0.65, angle),
  };
}

export function blackHoleAppearanceProfile(body) {
  const mass = Math.max(0, Number(body?.mass) || 0);
  const schwarzschildRadiusMeters = mass > 0 ? (2 * PHYSICS.G * mass) / (PHYSICS.C ** 2) : Math.max(0, Number(body?.radius) || 0);
  // For a Schwarzschild black hole, the critical impact parameter / shadow radius is
  // 3*sqrt(3) GM/c^2 = 2.598... Schwarzschild radii for a distant observer.
  const shadowRadiusRs = 3 * Math.sqrt(3) / 2;
  // Non-spinning ISCO = 6 GM/c^2 = 3 Schwarzschild radii.
  const iscoRadiusRs = 3;
  const diskOuterRadiusRs = 12;
  return {
    schwarzschildRadiusMeters,
    shadowRadiusRs,
    criticalCurveRadiusRs: shadowRadiusRs * 1.015,
    secondaryRingRadiusRs: shadowRadiusRs * 1.08,
    iscoRadiusRs,
    diskOuterRadiusRs,
    dopplerAsymmetry: 0.46,
    scientificBoundary: 'GR-informed Schwarzschild shadow/critical-curve/ISCO ratios are used as rendering cues on an enlarged readability scale. Background light rays are not geodesically ray-traced and the accretion flow is not GRMHD.',
  };
}

export function neutronStarAppearanceProfile(body) {
  const mass = Math.max(0, Number(body?.mass) || 0);
  const radius = Math.max(1, Number(body?.radius) || 1);
  const rs = mass > 0 ? (2 * PHYSICS.G * mass) / (PHYSICS.C ** 2) : 0;
  const compactness = clamp(rs / radius, 0, 0.92);
  const gravitationalRedshift = compactness < 1 ? (1 / Math.sqrt(Math.max(1e-6, 1 - compactness))) - 1 : Infinity;
  const period = Math.max(0.001, Number(body?.spinPeriodSeconds) || 1);
  const lightCylinderRadiusMeters = PHYSICS.C * period / (2 * Math.PI);
  const magneticFieldTesla = Math.max(0, Number(body?.magneticFieldTesla) || 0);
  return {
    schwarzschildRadiusMeters: rs,
    compactness,
    gravitationalRedshift,
    lightCylinderRadiusMeters,
    magneticFieldTesla,
    fieldExtentVisualRadii: clamp(3.4 + Math.log10(1 + magneticFieldTesla / 1e7) * 1.4, 3.4, 9.5),
    beamOpeningRadians: clamp((6.5 * Math.PI / 180) / Math.sqrt(Math.max(0.02, period)), 0.045, 0.36),
    scientificBoundary: 'Compactness/redshift/light-cylinder values are physically derived diagnostics. Magnetic field lines and radiation beams are scaled visualization proxies; spacetime lensing, plasma transport and radiation transfer are not solved.',
  };
}
