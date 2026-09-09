function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function smoothstep(edge0, edge1, value) {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Visual-only stellar LOD policy.
 *
 * This deliberately preserves macro stellar phenomena at distance. It only
 * suppresses sub-pixel/noisy micro detail and shifts that energy into smooth
 * halo/prominence cues so distant stars remain visually dramatic.
 */
export function stellarPerceptualProfile(apparentRadiusRad = 0) {
  const angularRadius = clamp(apparentRadiusRad, 0, Math.PI / 2);
  const surfaceDetail = smoothstep(0.012, 0.16, angularRadius);
  const close = smoothstep(0.055, 0.46, angularRadius);
  const veryClose = smoothstep(0.24, 0.95, angularRadius);
  const microCorona = 0.18 + 0.82 * smoothstep(0.014, 0.18, angularRadius);
  const distantMacroBoost = 1.0 + 0.34 * (1 - smoothstep(0.028, 0.24, angularRadius));
  const haloBoost = 1.04 + 0.26 * (1 - smoothstep(0.035, 0.32, angularRadius));
  const backgroundFactor = clamp(1 - close * 0.58 - veryClose * 0.18, 0.20, 1);
  const galacticBandFactor = clamp(1 - close * 0.74 - veryClose * 0.16, 0.10, 1);
  const exposure = clamp(1 - close * 0.22 - veryClose * 0.10, 0.66, 1);

  return {
    angularRadius,
    surfaceDetail,
    microCorona,
    distantMacroBoost,
    haloBoost,
    backgroundFactor,
    galacticBandFactor,
    exposure,
  };
}

export function apparentAngularRadius(radiusRender, distanceRender) {
  const radius = Math.max(0, Number(radiusRender) || 0);
  const distance = Math.max(1e-9, Number(distanceRender) || 0);
  return Math.atan2(radius, distance);
}
