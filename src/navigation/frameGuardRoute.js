import { firstTransitGuardHit, transitClearanceCheck } from '../physics/transitDrive.js';

function magnitude(v) { return Math.hypot(Number(v?.[0]) || 0, Number(v?.[1]) || 0, Number(v?.[2]) || 0); }
function subtract(a, b) { return new Float64Array([a[0] - b[0], a[1] - b[1], a[2] - b[2]]); }
function add(a, b) { return new Float64Array([a[0] + b[0], a[1] + b[1], a[2] + b[2]]); }
function scale(v, s) { return new Float64Array([v[0] * s, v[1] * s, v[2] * s]); }
function normalize(v, fallback = [1, 0, 0]) {
  const m = magnitude(v);
  if (m > 1e-12) return scale(v, 1 / m);
  return new Float64Array(fallback);
}

function fibonacciDirections(count = 64) {
  const directions = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = golden * i;
    directions.push(new Float64Array([Math.cos(angle) * radius, y, Math.sin(angle) * radius]));
  }
  return directions;
}

const DETOUR_DIRECTIONS = fibonacciDirections(72);

function pathLength(a, b) { return magnitude(subtract(a, b)); }

function candidateClear(start, waypoint, end, bodies, targetId) {
  if (transitClearanceCheck(waypoint, bodies, targetId)) return false;
  if (firstTransitGuardHit(start, waypoint, bodies, targetId)) return false;
  if (firstTransitGuardHit(waypoint, end, bodies, targetId)) return false;
  return true;
}

// FRAME is already an explicitly fictional translation layer, but its swept safety route still
// respects the live finite-radius massive-body guards. When a direct segment is blocked, this
// planner searches deterministic waypoints anchored to the blocking body's live inertial position.
// No celestial state is changed and the guard radius is never reduced to make a route succeed.
export function planFrameGuardRoute(start, targetPosition, bodies = [], targetId = null) {
  if (!start || !targetPosition) return { ok: false, needed: false, reason: 'invalid-route-endpoints' };
  const hit = firstTransitGuardHit(start, targetPosition, bodies, targetId);
  if (!hit) return { ok: true, needed: false, waypoint: null, model: 'direct-swept-clear-v1' };

  const obstacle = hit.body;
  const center = obstacle.position;
  const baseGuard = Number(hit.guardRadiusMeters);
  if (!center || !(baseGuard > 0)) return { ok: false, needed: true, reason: 'invalid-guard', blockedById: obstacle?.id ?? null };

  // Prefer directions related to the actual geometry before the deterministic sphere samples.
  const fromCenter = normalize(subtract(start, center));
  const toCenter = normalize(subtract(targetPosition, center));
  const geometryDirections = [
    normalize(add(fromCenter, toCenter), DETOUR_DIRECTIONS[0]),
    normalize(subtract(fromCenter, toCenter), DETOUR_DIRECTIONS[1]),
    normalize(subtract(toCenter, fromCenter), DETOUR_DIRECTIONS[2]),
  ];
  const directions = [...geometryDirections, ...DETOUR_DIRECTIONS];
  let best = null;

  // Escalating clearance shells give near-grazing routes a compact bypass but leave room for
  // starts/targets that sit close to the guard boundary. Candidate segments are rechecked against
  // every massive-body guard, not just the originally blocking body.
  for (const shell of [1.18, 1.35, 1.6, 2.0, 2.6]) {
    const radius = baseGuard * shell;
    for (const direction of directions) {
      const offset = scale(direction, radius);
      const waypoint = add(center, offset);
      if (!candidateClear(start, waypoint, targetPosition, bodies, targetId)) continue;
      const score = pathLength(start, waypoint) + pathLength(waypoint, targetPosition);
      if (!best || score < best.score) best = { waypoint, offset, score, shell };
    }
    if (best) break;
  }

  if (!best) {
    return {
      ok: false,
      needed: true,
      reason: 'no-clear-detour',
      blockedById: obstacle.id,
      blockedByName: obstacle.name,
      guardRadiusMeters: baseGuard,
    };
  }

  return {
    ok: true,
    needed: true,
    waypoint: {
      anchorBodyId: obstacle.id,
      offset: best.offset,
      clearanceShell: best.shell,
      guardRadiusMeters: baseGuard,
    },
    blockedById: obstacle.id,
    blockedByName: obstacle.name,
    directHitFraction: hit.fraction,
    model: 'live-body-anchored-swept-detour-v1',
  };
}

export function resolveFrameGuardWaypoint(route, bodies = []) {
  const waypoint = route?.waypoint;
  if (!waypoint?.anchorBodyId || !waypoint.offset) return null;
  const anchor = bodies.find((body) => body.id === waypoint.anchorBodyId);
  if (!anchor?.position) return null;
  return new Float64Array([
    anchor.position[0] + waypoint.offset[0],
    anchor.position[1] + waypoint.offset[1],
    anchor.position[2] + waypoint.offset[2],
  ]);
}
