const STANDARD_PRESSURE_PA = 101_325;
const BOLTZMANN = 1.380649e-23;
const ATOMIC_MASS_UNIT = 1.66053906660e-27;
const DEG = Math.PI / 180;

export const ATMOSPHERIC_OPTICS_MODEL_VERSION = 'atmospheric-optics-v1';
export const REFERENCE_WAVELENGTHS_NM = Object.freeze([680, 550, 440]);

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, finite(value, min)));
}

function safeExpNeg(value) {
  return Math.exp(-Math.min(80, Math.max(0, finite(value, 0))));
}

function rayleighOpticalDepthAtWavelengthMicrons(wavelengthMicrons, pressurePa = STANDARD_PRESSURE_PA) {
  const lambda = Math.max(0.2, finite(wavelengthMicrons, 0.55));
  const inv2 = 1 / (lambda * lambda);
  const inv4 = inv2 * inv2;
  // Bucholtz/Bodhaine-style sea-level air optical-depth approximation. Pressure scales the
  // molecular column. Composition-specific refractivity is intentionally not inferred from the
  // current environment model, so this remains a dry-air-like reference spectrum.
  const standardDepth = 0.008569 * inv4 * (1 + 0.0113 * inv2 + 0.00013 * inv4);
  return standardDepth * clamp(finite(pressurePa) / STANDARD_PRESSURE_PA, 0, 500);
}

export function rayleighVerticalOpticalDepthRgb(pressurePa = STANDARD_PRESSURE_PA) {
  return REFERENCE_WAVELENGTHS_NM.map((wavelengthNm) => rayleighOpticalDepthAtWavelengthMicrons(wavelengthNm / 1000, pressurePa));
}

export function opticalAirMass(starAltitudeRad = Math.PI * 0.5) {
  const altitudeDeg = finite(starAltitudeRad, -Math.PI * 0.5) / DEG;
  if (altitudeDeg <= -0.833) return Infinity;
  const apparentAltitude = Math.max(-0.82, Math.min(90, altitudeDeg));
  const zenithDeg = 90 - apparentAltitude;
  const cosine = Math.cos(zenithDeg * DEG);
  const correctionBase = Math.max(0.001, 96.07995 - zenithDeg);
  const denominator = cosine + 0.50572 * Math.pow(correctionBase, -1.6364);
  return denominator > 0 ? 1 / denominator : Infinity;
}

export function atmosphericScaleHeightMeters({ temperatureK = 288, gravityMps2 = 9.80665, molecularMassAmu = 28.97 } = {}) {
  const temperature = Math.max(1, finite(temperatureK, 288));
  const gravity = Math.max(1e-6, finite(gravityMps2, 9.80665));
  const molecularMass = Math.max(1, finite(molecularMassAmu, 28.97)) * ATOMIC_MASS_UNIT;
  return (BOLTZMANN * temperature) / (molecularMass * gravity);
}

function aerosolVerticalOpticalDepth550({ pressurePa = 0, aerosolOpticalDepth550 = null } = {}) {
  if (Number.isFinite(Number(aerosolOpticalDepth550))) return clamp(aerosolOpticalDepth550, 0, 8);
  const pressureRatio = clamp(finite(pressurePa) / STANDARD_PRESSURE_PA, 0, 50);
  // Baseline aerosol loading is only a generic clear-atmosphere proxy. Weather can supply a
  // larger explicit aerosol depth. This is not an aerosol chemistry or particle-size solver.
  return 0.012 * Math.pow(pressureRatio, 0.42);
}

function mieDepthRgb(tau550) {
  // Weak wavelength dependence for a coarse aerosol/Mie extinction approximation.
  return [tau550 * 0.84, tau550, tau550 * 1.12];
}

function spectralTransmission(rayleighRgb, mieRgb, airMass) {
  if (!Number.isFinite(airMass)) return [0, 0, 0];
  return rayleighRgb.map((tau, i) => safeExpNeg((tau + mieRgb[i]) * airMass));
}

function luminance(rgb) {
  return clamp(rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722, 0, 1);
}

function normalizeRgb(rgb, fallback = [0, 0, 0]) {
  const max = Math.max(...rgb);
  if (!(max > 1e-12)) return [...fallback];
  return rgb.map((v) => clamp(v / max));
}

function multiplyRgb(a, b) {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

function scaleRgb(rgb, scale) {
  return rgb.map((v) => clamp(v * scale));
}

function addRgb(a, b) {
  return [clamp(a[0] + b[0]), clamp(a[1] + b[1]), clamp(a[2] + b[2])];
}

function twilightIllumination(starAltitudeRad) {
  const altitudeDeg = finite(starAltitudeRad, -Math.PI / 2) / DEG;
  if (altitudeDeg >= 0) return 1;
  if (altitudeDeg <= -18) return 0;
  // Approximate civil/nautical/astronomical twilight decay. This is a bounded single-scattering
  // presentation proxy, not full multiple scattering below the geometric horizon.
  return clamp(Math.exp(altitudeDeg / 4.4), 0, 1);
}

export function solveSurfaceAtmosphericOptics({
  pressurePa = 0,
  temperatureK = 288,
  gravityMps2 = 9.80665,
  molecularMassAmu = 28.97,
  starAltitudeRad = -Math.PI * 0.5,
  starVisibleFraction = 1,
  starRgb = [1, 1, 1],
  aerosolOpticalDepth550 = null,
  weatherTransmission = 1,
} = {}) {
  const pressure = Math.max(0, finite(pressurePa));
  const pressureRatio = pressure / STANDARD_PRESSURE_PA;
  const rayleighRgb = rayleighVerticalOpticalDepthRgb(pressure);
  const aerosol550 = aerosolVerticalOpticalDepth550({ pressurePa: pressure, aerosolOpticalDepth550 });
  const mieRgb = mieDepthRgb(aerosol550);
  const starAirMass = opticalAirMass(starAltitudeRad);
  const directRgb = spectralTransmission(rayleighRgb, mieRgb, starAirMass);
  const visibleFraction = clamp(starVisibleFraction);
  const weather = clamp(weatherTransmission);
  const directCombinedRgb = scaleRgb(multiplyRgb(directRgb, starRgb.map((v) => clamp(v))), visibleFraction * weather);
  const directTransmission = luminance(directCombinedRgb);

  const twilight = twilightIllumination(starAltitudeRad);
  const scatteringColumn = rayleighRgb.map((tau) => 1 - safeExpNeg(tau));
  const rayleighStrength = clamp((scatteringColumn[2] / (1 - Math.exp(-rayleighOpticalDepthAtWavelengthMicrons(0.44, STANDARD_PRESSURE_PA)))) * twilight * visibleFraction, 0, 1.3);
  const skyBrightness = clamp(rayleighStrength + (1 - safeExpNeg(aerosol550)) * 2.1 * twilight * visibleFraction, 0, 1);

  const rayleighSpectrum = normalizeRgb([
    scatteringColumn[0] * 0.92,
    scatteringColumn[1],
    scatteringColumn[2] * 1.04,
  ], [0.20, 0.43, 1]);

  const horizonAirMass = 7.5;
  const incomingHorizonRgb = spectralTransmission(rayleighRgb, mieRgb, Number.isFinite(starAirMass) ? Math.max(1, Math.min(38, starAirMass)) : 38);
  const horizonRayleigh = multiplyRgb(rayleighRgb, incomingHorizonRgb);
  const horizonMie = multiplyRgb([aerosol550, aerosol550 * 0.92, aerosol550 * 0.76], incomingHorizonRgb);
  let horizonSpectrum = normalizeRgb(addRgb(scaleRgb(horizonRayleigh, horizonAirMass * 0.65), scaleRgb(horizonMie, horizonAirMass * 1.1)), rayleighSpectrum);
  if (finite(starAltitudeRad) > 18 * DEG) {
    // High-Sun horizons remain pale/blue rather than artificially orange.
    horizonSpectrum = normalizeRgb(addRgb(scaleRgb(rayleighSpectrum, 0.75), scaleRgb(horizonSpectrum, 0.35)), rayleighSpectrum);
  }

  const starColorAtObserver = normalizeRgb(directCombinedRgb, starRgb);
  const topColorRgb = scaleRgb(multiplyRgb(rayleighSpectrum, starRgb), skyBrightness);
  const horizonBrightness = clamp(skyBrightness * (1.06 + aerosol550 * 5), 0, 1);
  const horizonColorRgb = scaleRgb(multiplyRgb(horizonSpectrum, starRgb), horizonBrightness);

  const opticalWashout = clamp(skyBrightness * (0.92 + Math.min(0.45, aerosol550 * 1.6)), 0, 1);
  const starVisibility = clamp((1 - opticalWashout * 0.985) * weather, 0.012, 1);
  const galacticVisibility = clamp((1 - opticalWashout * 0.997) * weather, 0.006, 1);
  const diffuseSkyLight = clamp(skyBrightness * weather, 0, 1);
  const scaleHeightMeters = atmosphericScaleHeightMeters({ temperatureK, gravityMps2, molecularMassAmu });
  const extinctionCoefficient550PerMeter = pressure > 0
    ? (rayleighRgb[1] + mieRgb[1]) / Math.max(1, scaleHeightMeters)
    : 0;

  return {
    modelVersion: ATMOSPHERIC_OPTICS_MODEL_VERSION,
    pressurePa: pressure,
    pressureRatio,
    rayleighOpticalDepthRgb: rayleighRgb,
    aerosolOpticalDepth550: aerosol550,
    mieOpticalDepthRgb: mieRgb,
    starAirMass,
    directStellarTransmissionRgb: directCombinedRgb,
    directStellarTransmission: directTransmission,
    starColorAtObserverRgb: starColorAtObserver,
    twilightIllumination: twilight,
    skyBrightness,
    topSkyColorRgb: topColorRgb,
    horizonSkyColorRgb: horizonColorRgb,
    starVisibility,
    galacticVisibility,
    weatherTransmission: weather,
    daylight: skyBrightness,
    diffuseSkyLight,
    exposure: clamp(0.86 + diffuseSkyLight * 0.16 + directTransmission * 0.04, 0.82, 1.06),
    scaleHeightMeters,
    extinctionCoefficient550PerMeter,
    scientificBoundary: 'Dry-air-like Rayleigh reference spectrum plus a generic aerosol/Mie optical-depth proxy. Atmospheric composition, multiple scattering, refraction, polarization, clouds and line absorption are not solved.',
  };
}

export function solveOrbitalAtmosphereLimb({
  pressurePa = 0,
  temperatureK = 250,
  gravityMps2 = 9.80665,
  molecularMassAmu = 28.97,
  radiusMeters = 1,
  starRgb = [1, 1, 1],
} = {}) {
  const pressure = Math.max(0, finite(pressurePa));
  const radius = Math.max(1, finite(radiusMeters, 1));
  const scaleHeight = atmosphericScaleHeightMeters({ temperatureK, gravityMps2, molecularMassAmu });
  const rayleighRgb = rayleighVerticalOpticalDepthRgb(pressure);
  const vertical550 = rayleighOpticalDepthAtWavelengthMicrons(0.55, pressure);
  const tangentFactor = Math.sqrt(Math.max(1, (2 * Math.PI * radius) / Math.max(1, scaleHeight)));
  const tangentOpticalDepth550 = vertical550 * tangentFactor;
  const opticalOpacity = 1 - safeExpNeg(tangentOpticalDepth550);
  const visible = pressure >= 1 && opticalOpacity > 0.002;
  const shellHeightMeters = visible
    ? Math.min(radius * 0.08, 300_000, Math.max(1_000, scaleHeight * 7))
    : 0;
  const spectrum = normalizeRgb([rayleighRgb[0] * 0.82, rayleighRgb[1], rayleighRgb[2] * 1.12], [0.22, 0.48, 1]);
  const colorRgb = normalizeRgb(multiplyRgb(spectrum, starRgb), spectrum);
  return {
    modelVersion: ATMOSPHERIC_OPTICS_MODEL_VERSION,
    visible,
    scaleHeightMeters: scaleHeight,
    shellHeightMeters,
    shellRadiusScale: 1 + shellHeightMeters / radius,
    tangentOpticalDepth550,
    opacity: visible ? clamp(0.035 + opticalOpacity * 0.31, 0.035, 0.36) : 0,
    colorRgb,
    scientificBoundary: 'Orbital atmosphere limb uses hydrostatic scale height and a dry-air-like Rayleigh tangent optical-depth proxy. It is not a full spherical radiative-transfer or refraction solution.',
  };
}
