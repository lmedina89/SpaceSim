import { BODY_KIND, PHYSICS } from '../core/constants.js';
import { derivePlanetaryEnvironment, surfaceGravityMps2FromMassRadius } from '../physics/planetaryEnvironment.js';

function finite(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function navigationParent(body, bodies = []) {
  if (!body) return null;
  if (body.parentId) return bodies.find((candidate) => candidate.id === body.parentId) ?? null;
  if ([BODY_KIND.PLANET, BODY_KIND.COMET].includes(body.kind)) {
    return bodies.find((candidate) => candidate.kind === BODY_KIND.STAR) ?? null;
  }
  return null;
}

export function bodyClassLabel(body, bodies = []) {
  if (!body) return 'UNKNOWN';
  const environment = derivePlanetaryEnvironment(body, bodies);
  if (environment?.classLabel) return environment.classLabel;
  if (body.kind === BODY_KIND.STAR) return body.spectralClass ? `${body.spectralClass}-CLASS STAR` : 'STAR';
  if (body.kind === BODY_KIND.COMET) return 'COMET NUCLEUS';
  if (body.kind === BODY_KIND.BLACK_HOLE) return 'BLACK HOLE';
  if (body.kind === BODY_KIND.NEUTRON_STAR) return 'NEUTRON STAR';
  if (body.kind === BODY_KIND.WHITE_DWARF) return 'WHITE DWARF';
  if (body.kind === BODY_KIND.BROWN_DWARF) return 'BROWN DWARF';
  if (body.kind === BODY_KIND.ASTEROID) return 'ASTEROID';
  return String(body.kind || 'unknown').toUpperCase();
}

export function surfaceCapabilityLabel(body, bodies = []) {
  if (!body) return '—';
  const environment = derivePlanetaryEnvironment(body, bodies);
  if (environment?.surfaceCapability) return environment.surfaceCapability;
  return 'NOT APPLICABLE';
}

export function atmosphereModelLabel(body, bodies = []) {
  if (!body) return '—';
  const environment = derivePlanetaryEnvironment(body, bodies);
  if (environment?.atmosphereLabel) return environment.atmosphereLabel;
  return 'NOT APPLICABLE';
}

export function surfaceGravityMps2(body) {
  return surfaceGravityMps2FromMassRadius(body?.mass, body?.radius);
}

export function orbitalPeriodSeconds(body, parent) {
  const a = finite(body?.semiMajorAxis, 0);
  const totalMass = finite(body?.mass, 0) + finite(parent?.mass, 0);
  if (!(a > 0) || !(totalMass > 0)) return null;
  return 2 * Math.PI * Math.sqrt((a ** 3) / (PHYSICS.G * totalMass));
}

export function instantaneousHillRadiusMeters(body, parent) {
  const mass = finite(body?.mass, 0);
  const parentMass = finite(parent?.mass, 0);
  if (!(mass > 0) || !(parentMass > 0) || !body?.position || !parent?.position) return null;
  const dx = body.position[0] - parent.position[0];
  const dy = body.position[1] - parent.position[1];
  const dz = body.position[2] - parent.position[2];
  const separation = Math.hypot(dx, dy, dz);
  if (!(separation > 0)) return null;
  return separation * Math.cbrt(mass / (3 * parentMass));
}

// Conservative navigation diagnostic: for an eccentric child orbit, use the smaller of the
// live-separation Hill estimate and a pericenter Hill estimate. This is intentionally a screening
// heuristic, not an N-body long-term stability proof.
export function conservativeHillRadiusMeters(body, parent) {
  const instantaneous = instantaneousHillRadiusMeters(body, parent);
  const mass = finite(body?.mass, 0);
  const parentMass = finite(parent?.mass, 0);
  const semiMajorAxis = finite(body?.semiMajorAxis, 0);
  const eccentricity = finite(body?.eccentricity, null);
  if (!(mass > 0) || !(parentMass > 0) || !(semiMajorAxis > 0) || eccentricity === null) return instantaneous;
  const e = Math.min(0.999999999, Math.max(0, eccentricity));
  const pericenterDistance = semiMajorAxis * (1 - e);
  if (!(pericenterDistance > 0)) return instantaneous;
  const pericenterHill = pericenterDistance * Math.cbrt(mass / (3 * parentMass));
  if (!(pericenterHill > 0) || !Number.isFinite(pericenterHill)) return instantaneous;
  return instantaneous && Number.isFinite(instantaneous)
    ? Math.min(instantaneous, pericenterHill)
    : pericenterHill;
}

export function shipRangeMeters(ship, body) {
  if (!ship?.position || !body?.position) return null;
  return Math.hypot(
    Number(ship.position[0]) - Number(body.position[0]),
    Number(ship.position[1]) - Number(body.position[1]),
    Number(ship.position[2]) - Number(body.position[2]),
  );
}

export function starRangeMeters(body, bodies = []) {
  const star = bodies.find((candidate) => candidate.kind === BODY_KIND.STAR) ?? null;
  if (!body?.position || !star?.position) return null;
  if (body.id === star.id) return 0;
  return Math.hypot(
    Number(body.position[0]) - Number(star.position[0]),
    Number(body.position[1]) - Number(star.position[1]),
    Number(body.position[2]) - Number(star.position[2]),
  );
}

export function navigationBodySnapshot(body, bodies = [], ship = null) {
  const parent = navigationParent(body, bodies);
  const moons = bodies.filter((candidate) => candidate.kind === BODY_KIND.MOON && candidate.parentId === body?.id);
  const environment = derivePlanetaryEnvironment(body, bodies);
  return {
    body,
    parent,
    environment,
    classLabel: environment?.classLabel ?? bodyClassLabel(body, bodies),
    surfaceCapability: environment?.surfaceCapability ?? surfaceCapabilityLabel(body, bodies),
    atmosphereModel: environment?.atmosphereLabel ?? atmosphereModelLabel(body, bodies),
    shipRangeMeters: shipRangeMeters(ship, body),
    starRangeMeters: starRangeMeters(body, bodies),
    surfaceGravityMps2: surfaceGravityMps2(body),
    orbitalPeriodSeconds: orbitalPeriodSeconds(body, parent),
    hillRadiusMeters: instantaneousHillRadiusMeters(body, parent),
    conservativeHillRadiusMeters: conservativeHillRadiusMeters(body, parent),
    moonCount: moons.length,
  };
}

export function orderedNavigationBodies(bodies = []) {
  const star = bodies.find((body) => body.kind === BODY_KIND.STAR) ?? null;
  const planets = bodies
    .filter((body) => body.kind === BODY_KIND.PLANET)
    .sort((a, b) => finite(a.semiMajorAxis, Infinity) - finite(b.semiMajorAxis, Infinity));
  const moonsByParent = new Map();
  for (const moon of bodies.filter((body) => body.kind === BODY_KIND.MOON)) {
    if (!moonsByParent.has(moon.parentId)) moonsByParent.set(moon.parentId, []);
    moonsByParent.get(moon.parentId).push(moon);
  }
  for (const moons of moonsByParent.values()) {
    moons.sort((a, b) => finite(a.semiMajorAxis, Infinity) - finite(b.semiMajorAxis, Infinity));
  }
  const other = bodies.filter((body) => ![BODY_KIND.STAR, BODY_KIND.PLANET, BODY_KIND.MOON].includes(body.kind));
  return { star, planets, moonsByParent, other };
}
