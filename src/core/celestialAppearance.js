const EPSILON = 1e-12;
const HALF_PI = Math.PI * 0.5;
const TWO_PI = Math.PI * 2;

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function vectorBetween(from, to) {
  return [
    finite(to?.[0]) - finite(from?.[0]),
    finite(to?.[1]) - finite(from?.[1]),
    finite(to?.[2]) - finite(from?.[2]),
  ];
}

function magnitude(vector) {
  return Math.hypot(finite(vector?.[0]), finite(vector?.[1]), finite(vector?.[2]));
}

function normalized(vector, fallback = [0, 0, 1]) {
  const length = magnitude(vector);
  if (!(length > EPSILON)) return [...fallback];
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function dot(a, b) {
  return finite(a?.[0]) * finite(b?.[0])
    + finite(a?.[1]) * finite(b?.[1])
    + finite(a?.[2]) * finite(b?.[2]);
}

export function apparentAngularRadiusRad(radiusMeters, rangeMeters) {
  const radius = Math.max(0, finite(radiusMeters));
  const range = Math.max(0, finite(rangeMeters));
  if (!(range > EPSILON)) return radius > 0 ? HALF_PI : 0;
  return Math.asin(clamp(radius / range, 0, 1));
}

export function phaseAngleRad(observerPosition, bodyPosition, starPosition) {
  const bodyToObserver = normalized(vectorBetween(bodyPosition, observerPosition));
  const bodyToStar = normalized(vectorBetween(bodyPosition, starPosition));
  return Math.acos(clamp(dot(bodyToObserver, bodyToStar), -1, 1));
}

export function illuminatedFractionFromPhaseAngle(phaseAngle) {
  const phase = clamp(finite(phaseAngle), 0, Math.PI);
  return clamp((1 + Math.cos(phase)) * 0.5, 0, 1);
}

export function phaseAppearance(observerPosition, bodyPosition, starPosition) {
  const phase = phaseAngleRad(observerPosition, bodyPosition, starPosition);
  return {
    phaseAngleRad: phase,
    illuminatedFraction: illuminatedFractionFromPhaseAngle(phase),
  };
}

export function circleOverlapArea(radiusA, radiusB, separation) {
  const r1 = Math.max(0, finite(radiusA));
  const r2 = Math.max(0, finite(radiusB));
  const d = Math.max(0, finite(separation));
  if (!(r1 > 0 && r2 > 0)) return 0;
  if (d >= r1 + r2) return 0;
  const minRadius = Math.min(r1, r2);
  if (d <= Math.abs(r1 - r2)) return Math.PI * minRadius * minRadius;

  const x1 = clamp((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1);
  const x2 = clamp((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1);
  const term = Math.max(0,
    (-d + r1 + r2)
    * (d + r1 - r2)
    * (d - r1 + r2)
    * (d + r1 + r2));
  return r1 * r1 * Math.acos(x1)
    + r2 * r2 * Math.acos(x2)
    - 0.5 * Math.sqrt(term);
}

export function diskOccultation({
  backgroundAngularRadiusRad,
  foregroundAngularRadiusRad,
  separationRad,
  backgroundRangeMeters = Infinity,
  foregroundRangeMeters = 0,
} = {}) {
  const backgroundRadius = Math.max(0, finite(backgroundAngularRadiusRad));
  const foregroundRadius = Math.max(0, finite(foregroundAngularRadiusRad));
  const separation = Math.max(0, finite(separationRad, Infinity));
  const backgroundRange = finite(backgroundRangeMeters, Infinity);
  const foregroundRange = finite(foregroundRangeMeters, Infinity);

  if (!(backgroundRadius > 0 && foregroundRadius > 0)
    || !(foregroundRange < backgroundRange)
    || separation >= backgroundRadius + foregroundRadius) {
    return {
      state: 'none',
      overlapAreaRad2: 0,
      backgroundCoveredFraction: 0,
      foregroundInsideBackground: false,
      backgroundFullyCovered: false,
    };
  }

  const overlapAreaRad2 = circleOverlapArea(backgroundRadius, foregroundRadius, separation);
  const backgroundArea = Math.PI * backgroundRadius * backgroundRadius;
  const covered = clamp(overlapAreaRad2 / Math.max(EPSILON, backgroundArea), 0, 1);
  const foregroundInsideBackground = separation + foregroundRadius <= backgroundRadius + EPSILON;
  const backgroundFullyCovered = foregroundRadius >= backgroundRadius
    && separation + backgroundRadius <= foregroundRadius + EPSILON;
  const state = backgroundFullyCovered
    ? 'total'
    : foregroundInsideBackground
      ? 'interior'
      : 'partial';
  return {
    state,
    overlapAreaRad2,
    backgroundCoveredFraction: covered,
    foregroundInsideBackground,
    backgroundFullyCovered,
  };
}

function angularSeparationDirections(a, b) {
  return Math.acos(clamp(dot(normalized(a), normalized(b)), -1, 1));
}

function bodyObservationGeometry(observerPosition, body) {
  const relative = vectorBetween(observerPosition, body?.position);
  const rangeMeters = magnitude(relative);
  const direction = normalized(relative);
  const angularRadius = apparentAngularRadiusRad(body?.radius, rangeMeters);
  return { rangeMeters, direction, angularRadius };
}

export function dominantOccultationFromPoint(observerPosition, backgroundBody, candidateBodies = []) {
  if (!backgroundBody?.position) return null;
  const background = bodyObservationGeometry(observerPosition, backgroundBody);
  if (!(background.rangeMeters > EPSILON && background.angularRadius > 0)) return null;
  let best = null;

  for (const body of candidateBodies) {
    if (!body?.position || body.id === backgroundBody.id) continue;
    const foreground = bodyObservationGeometry(observerPosition, body);
    if (!(foreground.rangeMeters > EPSILON && foreground.rangeMeters < background.rangeMeters)) continue;
    const separationRad = angularSeparationDirections(background.direction, foreground.direction);
    const overlap = diskOccultation({
      backgroundAngularRadiusRad: background.angularRadius,
      foregroundAngularRadiusRad: foreground.angularRadius,
      separationRad,
      backgroundRangeMeters: background.rangeMeters,
      foregroundRangeMeters: foreground.rangeMeters,
    });
    if (!(overlap.backgroundCoveredFraction > 0)) continue;
    if (!best || overlap.backgroundCoveredFraction > best.coveredFraction) {
      best = {
        occulterId: body.id ?? null,
        occulterName: body.name ?? '',
        separationRad,
        coveredFraction: overlap.backgroundCoveredFraction,
        visibleFraction: 1 - overlap.backgroundCoveredFraction,
        state: overlap.state,
        backgroundAngularRadiusRad: background.angularRadius,
        foregroundAngularRadiusRad: foreground.angularRadius,
      };
    }
  }
  return best;
}

export function stellarVisibilityAtBody(body, star, candidateBodies = []) {
  if (!body?.position || !star?.position || body.id === star.id) {
    return { visibleFraction: 1, eclipseFraction: 0, eclipseState: 'none', occulterId: null, occulterName: '' };
  }
  const eclipse = dominantOccultationFromPoint(body.position, star, candidateBodies.filter((candidate) => candidate?.id !== body.id));
  if (!eclipse) return { visibleFraction: 1, eclipseFraction: 0, eclipseState: 'none', occulterId: null, occulterName: '' };
  return {
    visibleFraction: clamp(eclipse.visibleFraction, 0, 1),
    eclipseFraction: clamp(eclipse.coveredFraction, 0, 1),
    eclipseState: eclipse.state,
    occulterId: eclipse.occulterId,
    occulterName: eclipse.occulterName,
  };
}

export function observerStarOccultation(observerPosition, star, candidateBodies = []) {
  if (!star?.position) return { visibleFraction: 1, eclipseFraction: 0, eclipseState: 'none', occulterId: null, occulterName: '', separationRad: Infinity };
  const eclipse = dominantOccultationFromPoint(observerPosition, star, candidateBodies.filter((candidate) => candidate?.id !== star.id));
  if (!eclipse) return { visibleFraction: 1, eclipseFraction: 0, eclipseState: 'none', occulterId: null, occulterName: '', separationRad: Infinity };
  return {
    visibleFraction: clamp(eclipse.visibleFraction, 0, 1),
    eclipseFraction: clamp(eclipse.coveredFraction, 0, 1),
    eclipseState: eclipse.state,
    occulterId: eclipse.occulterId,
    occulterName: eclipse.occulterName,
    separationRad: eclipse.separationRad,
  };
}

export function illuminationDirectionInObserverBasis(observer, body, star, target = new Float64Array(3)) {
  const targetToStar = normalized(vectorBetween(body?.position, star?.position));
  const east = observer?.horizonEast ?? [1, 0, 0];
  const up = observer?.localUp ?? [0, 1, 0];
  const north = observer?.horizonNorth ?? [0, 0, 1];
  target[0] = dot(targetToStar, east);
  target[1] = dot(targetToStar, up);
  target[2] = dot(targetToStar, north);
  return target;
}

export function classifyStarEclipse(occultation) {
  if (!occultation || !(occultation.eclipseFraction > 0)) return 'NONE';
  if (occultation.eclipseState === 'total') return 'TOTAL';
  if (occultation.eclipseState === 'interior') return 'ANNULAR / TRANSIT';
  return 'PARTIAL';
}

export function radiansToArcseconds(radians) {
  return finite(radians) * (180 / Math.PI) * 3600;
}

export function normalizeRadians(angle) {
  const value = finite(angle) % TWO_PI;
  return value < 0 ? value + TWO_PI : value;
}
