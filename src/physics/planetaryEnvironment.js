import { BODY_KIND, PHYSICS } from '../core/constants.js';
import { bulkDensityKgM3 } from './planetaryProperties.js';

const STEFAN_BOLTZMANN = 5.670374419e-8;
const BOLTZMANN = 1.380649e-23;
const ATOMIC_MASS_UNIT = 1.66053906660e-27;
const STANDARD_ATMOSPHERE_PA = 101_325;
const FOUR_PI = 4 * Math.PI;

function finitePositive(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep01(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function distance3(a, b) {
  if (!a || !b) return null;
  const dx = Number(a[0]) - Number(b[0]);
  const dy = Number(a[1]) - Number(b[1]);
  const dz = Number(a[2]) - Number(b[2]);
  const distance = Math.hypot(dx, dy, dz);
  return Number.isFinite(distance) && distance > 0 ? distance : null;
}

function primaryStar(bodies = []) {
  return bodies.find((candidate) => candidate.kind === BODY_KIND.STAR) ?? null;
}

function parentOf(body, bodies = []) {
  if (!body?.parentId) return null;
  return bodies.find((candidate) => candidate.id === body.parentId) ?? null;
}

function referenceOrbit(body, bodies = []) {
  if (!body) return { semiMajorAxisMeters: null, eccentricity: null, model: 'UNAVAILABLE' };
  if (body.kind === BODY_KIND.PLANET) {
    const a = finitePositive(body.semiMajorAxis);
    const e = Number.isFinite(Number(body.eccentricity)) ? clamp(Number(body.eccentricity), 0, 0.999999) : 0;
    return { semiMajorAxisMeters: a, eccentricity: e, model: a ? 'BODY KEPLER ELEMENTS' : 'UNAVAILABLE' };
  }
  if (body.kind === BODY_KIND.MOON) {
    const parent = parentOf(body, bodies);
    const a = finitePositive(parent?.semiMajorAxis);
    const e = Number.isFinite(Number(parent?.eccentricity)) ? clamp(Number(parent.eccentricity), 0, 0.999999) : 0;
    return { semiMajorAxisMeters: a, eccentricity: e, model: a ? 'PARENT PLANET KEPLER ELEMENTS' : 'UNAVAILABLE' };
  }
  return { semiMajorAxisMeters: null, eccentricity: null, model: body.kind === BODY_KIND.ROGUE_PLANET ? 'CURRENT DISTANCE · UNBOUND' : 'UNAVAILABLE' };
}

export function surfaceGravityMps2FromMassRadius(massKg, radiusMeters) {
  const mass = finitePositive(massKg);
  const radius = finitePositive(radiusMeters);
  if (!(mass > 0) || !(radius > 0)) return null;
  return PHYSICS.G * mass / (radius * radius);
}

export function escapeVelocityMps(massKg, radiusMeters) {
  const mass = finitePositive(massKg);
  const radius = finitePositive(radiusMeters);
  if (!(mass > 0) || !(radius > 0)) return null;
  return Math.sqrt((2 * PHYSICS.G * mass) / radius);
}

export function stellarFluxWm2(luminosityWatts, distanceMeters) {
  const luminosity = finitePositive(luminosityWatts);
  const distance = finitePositive(distanceMeters);
  if (!(luminosity > 0) || !(distance > 0)) return null;
  return luminosity / (FOUR_PI * distance * distance);
}

export function equilibriumTemperatureK(fluxWm2, bondAlbedo = 0.3) {
  const flux = finitePositive(fluxWm2);
  if (!(flux > 0)) return null;
  const albedo = clamp(Number(bondAlbedo) || 0, 0, 0.95);
  // Full heat redistribution, unit long-wave emissivity. This is a radiative-equilibrium
  // diagnostic, not a surface-temperature or greenhouse/climate solution.
  return Math.pow((flux * (1 - albedo)) / (4 * STEFAN_BOLTZMANN), 0.25);
}

export function jeansEscapeParameter(massKg, radiusMeters, temperatureK, molecularMassAmu = 28) {
  const mass = finitePositive(massKg);
  const radius = finitePositive(radiusMeters);
  const temperature = finitePositive(temperatureK);
  const amu = finitePositive(molecularMassAmu);
  if (!(mass > 0) || !(radius > 0) || !(temperature > 0) || !(amu > 0)) return null;
  return (PHYSICS.G * mass * amu * ATOMIC_MASS_UNIT) / (radius * BOLTZMANN * temperature);
}

export function thermalRetentionScore(jeansParameter) {
  const lambda = Number(jeansParameter);
  if (!Number.isFinite(lambda)) return 0;
  // λ <~ 8 is poor long-term Jeans retention; λ >~ 28 is robust in this deliberately
  // simplified thermal-retention diagnostic. Stellar wind, EUV escape and chemistry are
  // explicitly outside this model.
  return smoothstep01((lambda - 8) / 20);
}

export function pressureFromAtmosphereMassFraction(massKg, radiusMeters, atmosphereMassFraction) {
  const mass = finitePositive(massKg);
  const radius = finitePositive(radiusMeters);
  const fraction = Math.max(0, Number(atmosphereMassFraction) || 0);
  const gravity = surfaceGravityMps2FromMassRadius(mass, radius);
  if (!(mass > 0) || !(radius > 0) || !(gravity > 0)) return null;
  const atmosphereMass = mass * fraction;
  return atmosphereMass * gravity / (FOUR_PI * radius * radius);
}

function atmosphereClassFromPressure(pressurePa) {
  const p = Math.max(0, Number(pressurePa) || 0);
  if (p < 1) return { id: 'airless', label: 'AIRLESS / EXOSPHERE PROXY' };
  if (p < 100) return { id: 'trace', label: 'TRACE ATMOSPHERE PROXY' };
  if (p < 2_000) return { id: 'tenuous', label: 'TENUOUS ATMOSPHERE PROXY' };
  if (p < 30_000) return { id: 'thin', label: 'THIN ATMOSPHERE PROXY' };
  if (p < 300_000) return { id: 'substantial', label: 'SUBSTANTIAL ATMOSPHERE PROXY' };
  if (p < 2_000_000) return { id: 'dense', label: 'DENSE ATMOSPHERE PROXY' };
  return { id: 'very-dense', label: 'VERY DENSE ATMOSPHERE PROXY' };
}


function genericGasPhaseAvailability(temperatureK) {
  const t = Number(temperatureK);
  if (!Number.isFinite(t) || t <= 0) return 0;
  // Generic heavy-volatile availability proxy only. This deliberately avoids claiming a
  // particular composition/phase diagram before atmospheric chemistry exists.
  if (t >= 190) return 1;
  if (t >= 140) return 0.35 + 0.65 * ((t - 140) / 50);
  if (t >= 90) return 0.05 + 0.30 * ((t - 90) / 50);
  if (t >= 60) return 0.005 + 0.045 * ((t - 60) / 30);
  return 0.002;
}

function sizeWord(body) {
  const massEarth = finitePositive(body?.mass, 0) / PHYSICS.EARTH_MASS;
  if (massEarth >= 2) return 'SUPER-EARTH';
  if (massEarth < 0.1) return 'DWARF';
  return 'TERRESTRIAL';
}

function solidClass(body, equilibriumK, volatileInventory01, icePotential01, atmosphereClass) {
  const hot = Number(equilibriumK) > 500;
  const veryDry = volatileInventory01 < 0.2;
  const volatileRich = volatileInventory01 > 0.62;
  const suffix = sizeWord(body);

  if (body.kind === BODY_KIND.MOON) {
    if (icePotential01 > 0.5) return { id: 'ice-rich-moon', label: 'ICE-RICH MOON' };
    if (volatileRich) return { id: 'volatile-rich-moon', label: 'VOLATILE-RICH MOON' };
    if (atmosphereClass.id === 'airless' || atmosphereClass.id === 'trace') return { id: 'airless-rocky-moon', label: 'AIRLESS ROCKY MOON' };
    return { id: 'rocky-moon', label: 'ROCKY MOON' };
  }

  if (body.kind === BODY_KIND.ROGUE_PLANET) {
    if (icePotential01 > 0.5) return { id: 'ice-rich-rogue', label: 'ICE-RICH ROGUE PLANET' };
    if (volatileRich) return { id: 'volatile-rich-rogue', label: 'VOLATILE-RICH ROGUE PLANET' };
    return { id: 'rocky-rogue', label: 'ROCKY ROGUE PLANET' };
  }

  if (icePotential01 > 0.58) return { id: 'ice-rich-terrestrial', label: `ICE-RICH ${suffix}` };
  if (hot && veryDry) return { id: 'hot-rocky', label: `HOT ROCKY ${suffix}` };
  if (volatileRich) return { id: 'volatile-rich-terrestrial', label: `VOLATILE-RICH ${suffix}` };
  if (veryDry) return { id: 'dry-rocky', label: `DRY ROCKY ${suffix}` };
  return { id: 'rocky-terrestrial', label: `ROCKY ${suffix}` };
}

function surfaceFamily(classId) {
  if (classId === 'gas-giant') return 'FLUID GAS ENVELOPE';
  if (classId.includes('ice-rich')) return 'ICE / ROCK';
  if (classId.includes('volatile-rich')) return 'VOLATILE-RICH ROCK';
  if (classId.includes('hot-rocky')) return 'HOT ROCK';
  if (classId.includes('dry-rocky')) return 'DRY ROCK';
  return 'ROCK';
}

function skyRegime(atmosphereClass, bodyClassId) {
  if (bodyClassId === 'gas-giant') return 'DEEP ATMOSPHERE · NO SOLID-SURFACE SKY';
  if (['airless', 'trace'].includes(atmosphereClass.id)) return 'AIRLESS / BLACK-SKY CANDIDATE';
  if (['tenuous', 'thin'].includes(atmosphereClass.id)) return 'THIN-ATMOSPHERE SKY CANDIDATE';
  return 'ATMOSPHERIC SKY CANDIDATE';
}

function tidalRotationState(body, parent) {
  if (body?.kind !== BODY_KIND.MOON || !parent) return 'NOT ASSESSED';
  const period = finitePositive(body.rotationPeriodSeconds);
  const a = finitePositive(body.semiMajorAxis);
  const totalMass = finitePositive(body.mass, 0) + finitePositive(parent.mass, 0);
  if (!(period > 0) || !(a > 0) || !(totalMass > 0)) return 'UNKNOWN';
  const orbitalPeriod = 2 * Math.PI * Math.sqrt((a ** 3) / (PHYSICS.G * totalMass));
  const mismatch = Math.abs(period / orbitalPeriod - 1);
  return mismatch < 1e-3 ? 'SYNCHRONOUS ROTATION' : mismatch < 0.05 ? 'NEAR-SYNCHRONOUS' : 'NON-SYNCHRONOUS';
}

/**
 * Canonical read-only planetary environment derivation.
 *
 * Hard quantities (g, escape speed, radiative flux, equilibrium temperature) are derived
 * from authoritative mass/radius/orbit/star state. Formation quantities such as Bond albedo,
 * volatile inventory and initial atmospheric inventory are deterministic seeded initial
 * conditions stored on generated bodies. Pressure is therefore a MODEL/PROXY, not an observed
 * atmosphere or a climate/chemistry solution.
 */
export function derivePlanetaryEnvironment(body, bodies = []) {
  if (!body) return null;
  const supported = [BODY_KIND.PLANET, BODY_KIND.MOON, BODY_KIND.ROGUE_PLANET].includes(body.kind);
  if (!supported) return null;

  const star = primaryStar(bodies);
  const parent = parentOf(body, bodies);
  const mass = finitePositive(body.mass);
  const radius = finitePositive(body.radius);
  if (!(mass > 0) || !(radius > 0)) return null;

  const formation = body.environmentFormation && typeof body.environmentFormation === 'object'
    ? body.environmentFormation
    : {};
  const bondAlbedo = clamp(Number(formation.bondAlbedo) || 0.3, 0.02, 0.90);
  const volatileInventory01 = clamp(Number(formation.volatileInventory01) || 0, 0, 1);
  const atmosphereInventoryMassFraction = Math.max(0, Number(formation.atmosphereInventoryMassFraction) || 0);
  const representativeMolecularMassAmu = clamp(Number(formation.representativeAtmosphereMolecularMassAmu) || 28, 2, 60);

  const currentStarDistanceMeters = star ? distance3(body.position, star.position) : null;
  const luminosityWatts = finitePositive(star?.luminositySolar)
    ? star.luminositySolar * PHYSICS.SOLAR_LUMINOSITY
    : null;
  const currentFluxWm2 = stellarFluxWm2(luminosityWatts, currentStarDistanceMeters);

  const orbit = referenceOrbit(body, bodies);
  let referenceFluxWm2 = null;
  if (luminosityWatts && orbit.semiMajorAxisMeters) {
    const meanInverseR2Factor = 1 / Math.sqrt(Math.max(1e-12, 1 - (orbit.eccentricity ?? 0) ** 2));
    referenceFluxWm2 = stellarFluxWm2(luminosityWatts, orbit.semiMajorAxisMeters) * meanInverseR2Factor;
  } else {
    referenceFluxWm2 = currentFluxWm2;
  }

  const equilibriumK = equilibriumTemperatureK(referenceFluxWm2, bondAlbedo);
  const currentEquilibriumK = equilibriumTemperatureK(currentFluxWm2, bondAlbedo);
  const gravity = surfaceGravityMps2FromMassRadius(mass, radius);
  const escape = escapeVelocityMps(mass, radius);
  const density = bulkDensityKgM3(mass, radius);

  if (body.kind === BODY_KIND.PLANET && body.planetType === 'gas') {
    const classInfo = { id: 'gas-giant', label: 'GAS GIANT' };
    return {
      modelVersion: body.environmentModelVersion ?? 'planetary-environment-v1',
      formationModel: body.environmentFormationModel ?? 'seeded-formation-v1',
      bodyClassId: classInfo.id,
      classLabel: classInfo.label,
      physicalSurfaceExists: false,
      surfaceFamily: surfaceFamily(classInfo.id),
      surfaceCapability: 'NO SOLID SURFACE · ATMOSPHERIC/PROBE FLIGHT FUTURE',
      landingReason: 'Gas giant: no physical solid surface is modeled.',
      bulkDensityKgM3: density,
      surfaceGravityMps2: gravity,
      escapeVelocityMps: escape,
      bondAlbedo,
      volatileInventory01: 1,
      icePotential01: 0,
      currentStarDistanceMeters,
      referenceStellarFluxWm2: referenceFluxWm2,
      currentStellarFluxWm2: currentFluxWm2,
      referenceFluxEarth: referenceFluxWm2 ? referenceFluxWm2 / stellarFluxWm2(PHYSICS.SOLAR_LUMINOSITY, PHYSICS.AU) : null,
      equilibriumTemperatureK: equilibriumK,
      currentEquilibriumTemperatureK: currentEquilibriumK,
      atmospherePressureProxyPa: null,
      atmospherePressureProxyAtm: null,
      atmosphereClassId: 'deep-envelope',
      atmosphereLabel: 'DEEP H/HE ENVELOPE · PRESSURE DEPENDS ON DEPTH',
      atmosphereRetentionScore: 1,
      atmosphereRetentionParameter: null,
      representativeAtmosphereMolecularMassAmu: 2.3,
      skyRegime: skyRegime({ id: 'deep-envelope' }, classInfo.id),
      tidalRotationState: 'NOT ASSESSED',
      referenceDistanceModel: orbit.model,
      scientificBoundary: 'Gas-envelope bulk environment only; no equation-of-state, cloud chemistry, radiative-convective atmosphere or solid surface is modeled.',
    };
  }

  const lambda = jeansEscapeParameter(mass, radius, Math.max(30, equilibriumK ?? currentEquilibriumK ?? 250), representativeMolecularMassAmu);
  const retention = thermalRetentionScore(lambda);
  const gasPhaseAvailabilityScore = genericGasPhaseAvailability(equilibriumK ?? currentEquilibriumK);
  const retainedAtmosphereMassFraction = atmosphereInventoryMassFraction * retention * retention * gasPhaseAvailabilityScore;
  // Beyond a few hundred bars, this simple hydrostatic inventory proxy should not be allowed
  // to masquerade as a solved supercritical/deep atmosphere. Cap and mark it as a model limit.
  const rawPressure = pressureFromAtmosphereMassFraction(mass, radius, retainedAtmosphereMassFraction) ?? 0;
  const pressureProxyPa = Math.min(rawPressure, 50_000_000);
  const pressureCapped = rawPressure > pressureProxyPa;
  const atmosphereClass = atmosphereClassFromPressure(pressureProxyPa);

  const temperatureColdness = equilibriumK === null ? 0 : clamp((300 - equilibriumK) / 160, 0, 1);
  const densityIceBias = density === null ? 0 : clamp((3_200 - density) / 1_600, 0, 1);
  const icePotential01 = clamp(volatileInventory01 * (0.55 * temperatureColdness + 0.45 * densityIceBias), 0, 1);
  const classInfo = solidClass(body, equilibriumK, volatileInventory01, icePotential01, atmosphereClass);
  const detailedSurface = Boolean(body.landable && body.surfaceProfile && body.surfaceProfile !== 'orbital-only');

  return {
    modelVersion: body.environmentModelVersion ?? 'planetary-environment-v1',
    formationModel: body.environmentFormationModel ?? 'seeded-formation-v1',
    bodyClassId: classInfo.id,
    classLabel: classInfo.label,
    physicalSurfaceExists: true,
    surfaceFamily: surfaceFamily(classInfo.id),
    surfaceCapability: detailedSurface
      ? 'DETAILED SURFACE · CURRENT BUILD'
      : 'SOLID SURFACE · MULTI-WORLD ENGINE NOT YET ENABLED',
    landingReason: detailedSurface
      ? 'Current detailed surface profile is available.'
      : 'A solid surface is physically classified, but this build intentionally has no generalized multi-world surface engine yet.',
    bulkDensityKgM3: density,
    surfaceGravityMps2: gravity,
    escapeVelocityMps: escape,
    bondAlbedo,
    volatileInventory01,
    icePotential01,
    currentStarDistanceMeters,
    referenceStellarFluxWm2: referenceFluxWm2,
    currentStellarFluxWm2: currentFluxWm2,
    referenceFluxEarth: referenceFluxWm2 ? referenceFluxWm2 / stellarFluxWm2(PHYSICS.SOLAR_LUMINOSITY, PHYSICS.AU) : null,
    equilibriumTemperatureK: equilibriumK,
    currentEquilibriumTemperatureK: currentEquilibriumK,
    atmosphereInventoryMassFraction,
    retainedAtmosphereMassFraction,
    gasPhaseAvailabilityScore,
    atmospherePressureProxyPa: pressureProxyPa,
    atmospherePressureProxyAtm: pressureProxyPa / STANDARD_ATMOSPHERE_PA,
    atmospherePressureCapped: pressureCapped,
    atmosphereClassId: atmosphereClass.id,
    atmosphereLabel: `${atmosphereClass.label} · FORMATION/RETENTION MODEL`,
    atmosphereRetentionScore: retention,
    atmosphereRetentionParameter: lambda,
    representativeAtmosphereMolecularMassAmu: representativeMolecularMassAmu,
    skyRegime: skyRegime(atmosphereClass, classInfo.id),
    tidalRotationState: tidalRotationState(body, parent),
    referenceDistanceModel: orbit.model,
    scientificBoundary: body.kind === BODY_KIND.ROGUE_PLANET
      ? 'Current stellar irradiation is real geometry, but long-term rogue thermal history, geothermal heat and capture/scattering history are not modeled.'
      : `Equilibrium temperature assumes Bond albedo ${bondAlbedo.toFixed(3)}, full heat redistribution and unit emissivity. Atmosphere pressure is a seeded formation + thermal-retention + generic gas-phase availability proxy; greenhouse, detailed chemistry/condensation, EUV/stellar-wind escape and climate are not solved.`,
  };
}
