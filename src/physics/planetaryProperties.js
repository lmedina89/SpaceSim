import { PHYSICS } from '../core/constants.js';

const FOUR_THIRDS_PI = (4 / 3) * Math.PI;

function finitePositive(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Mean bulk density implied by the authoritative mass and physical radius. */
export function bulkDensityKgM3(massKg, radiusMeters) {
  const mass = finitePositive(massKg);
  const radius = finitePositive(radiusMeters);
  if (!(mass > 0) || !(radius > 0)) return null;
  return mass / (FOUR_THIRDS_PI * radius ** 3);
}

/**
 * Coherent gas-giant generation proxy for the simulator's 0.16–1.65 M_J population.
 *
 * This is deliberately a bounded bulk-structure relation rather than a detailed equation
 * of state/interior evolution model. Mass is authoritative; a smooth mass-dependent mean
 * density plus modest seeded composition/inflation scatter determines radius. Density is
 * then re-derived from that same mass/radius pair so the three quantities cannot disagree.
 */
export function gasGiantPropertiesFromSamples(massKg, legacyRadiusSample01 = 0.5, densitySample01 = 0.5) {
  const mass = finitePositive(massKg);
  if (!(mass > 0)) return null;
  const massJupiter = mass / PHYSICS.JUPITER_MASS;
  const structure = clamp(Number(legacyRadiusSample01) || 0, 0, 1);
  const composition = clamp(Number(densitySample01) || 0, 0, 1);

  // Smoothly rises from Saturn/sub-Saturn bulk density toward Jupiter/super-Jupiter density.
  const meanDensity = 650 + 700 * Math.pow(clamp(massJupiter, 0.05, 4), 0.8);
  const compositionFactor = 0.92 + 0.16 * composition;
  const radiusInflationFactor = 0.94 + 0.12 * structure;
  const targetDensity = clamp(
    meanDensity * compositionFactor / (radiusInflationFactor ** 3),
    450,
    2_800,
  );
  const radius = Math.cbrt((3 * mass) / (4 * Math.PI * targetDensity));
  const densityKgM3 = bulkDensityKgM3(mass, radius);
  return {
    mass,
    radius,
    densityKgM3,
    model: 'coherent-gas-envelope-v2',
  };
}

/** Equatorial mass-shedding period for a spherical Newtonian body. */
export function breakupPeriodSeconds(massKg, radiusMeters) {
  const mass = finitePositive(massKg);
  const radius = finitePositive(radiusMeters);
  if (!(mass > 0) || !(radius > 0)) return null;
  return 2 * Math.PI * Math.sqrt((radius ** 3) / (PHYSICS.G * mass));
}

/** Two-body specific orbital energy, useful for classifying generated rogue bodies. */
export function specificOrbitalEnergyJkg(relativePosition, relativeVelocity, centralMassKg, bodyMassKg = 0) {
  const r = Math.hypot(
    Number(relativePosition?.[0]) || 0,
    Number(relativePosition?.[1]) || 0,
    Number(relativePosition?.[2]) || 0,
  );
  const v = Math.hypot(
    Number(relativeVelocity?.[0]) || 0,
    Number(relativeVelocity?.[1]) || 0,
    Number(relativeVelocity?.[2]) || 0,
  );
  const totalMass = finitePositive(centralMassKg, 0) + Math.max(0, Number(bodyMassKg) || 0);
  if (!(r > 0) || !(totalMass > 0) || !Number.isFinite(v)) return null;
  return 0.5 * v * v - PHYSICS.G * totalMass / r;
}
