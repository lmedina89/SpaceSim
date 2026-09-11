import { PHYSICS } from '../core/constants.js';
import { stellarFluxWm2 } from '../physics/planetaryEnvironment.js';

const EARTH_REFERENCE_FLUX_WM2 = stellarFluxWm2(PHYSICS.SOLAR_LUMINOSITY, PHYSICS.AU);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function distance3(a, b) {
  if (!a || !b) return null;
  const dx = Number(a[0]) - Number(b[0]);
  const dy = Number(a[1]) - Number(b[1]);
  const dz = Number(a[2]) - Number(b[2]);
  const distance = Math.hypot(dx, dy, dz);
  return Number.isFinite(distance) && distance > 0 ? distance : null;
}

/**
 * Read-only bridge from canonical stellar luminosity/distance to reflected-light presentation.
 * The physical flux and S⊕ ratio are exact within the existing luminosity model. The display gain
 * is square-root compressed through a bounded HDR window so very dim/bright systems remain usable
 * on mobile displays without pretending the renderer is a radiometric instrument.
 */
export function stellarIrradiancePresentation(luminositySolar = 1, distanceMeters = null, out = null) {
  const result = out ?? {};
  const luminosity = Number(luminositySolar);
  const distance = Number(distanceMeters);
  const valid = Number.isFinite(luminosity) && luminosity > 0 && Number.isFinite(distance) && distance > 0;
  if (!valid || !(EARTH_REFERENCE_FLUX_WM2 > 0)) {
    result.fluxWm2 = null;
    result.earthFluxRatio = 1;
    result.displayGain = 1;
    result.clippedLow = false;
    result.clippedHigh = false;
    result.scientificBoundary = 'Stellar irradiance unavailable; renderer falls back to neutral presentation gain without changing simulation state.';
    return result;
  }

  const fluxWm2 = stellarFluxWm2(luminosity * PHYSICS.SOLAR_LUMINOSITY, distance);
  const earthFluxRatio = Math.max(0, Number(fluxWm2) / EARTH_REFERENCE_FLUX_WM2);
  const minimumGain = 0.008;
  const maximumGain = 5.0;
  const unboundedDisplayGain = Math.sqrt(earthFluxRatio);
  result.fluxWm2 = fluxWm2;
  result.earthFluxRatio = earthFluxRatio;
  result.displayGain = clamp(unboundedDisplayGain, minimumGain, maximumGain);
  result.clippedLow = unboundedDisplayGain < minimumGain;
  result.clippedHigh = unboundedDisplayGain > maximumGain;
  result.scientificBoundary = 'Physical stellar flux follows inverse-square distance and modeled stellar luminosity. Display gain uses a square-root HDR compression with extreme visibility bounds; this is a presentation tone curve, not altered irradiance physics.';
  return result;
}

export function stellarIrradianceForBody(body, starBody, out = null) {
  const distanceMeters = distance3(body?.position, starBody?.position);
  return stellarIrradiancePresentation(starBody?.luminositySolar, distanceMeters, out);
}

export { EARTH_REFERENCE_FLUX_WM2 };
