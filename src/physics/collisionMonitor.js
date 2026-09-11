import { SIMULATION } from '../core/constants.js';

function clamp01(value) { return Math.max(0, Math.min(1, value)); }

function sameTopology(ids, bodies) {
  if (ids.length !== bodies.length) return false;
  for (let i = 0; i < bodies.length; i += 1) if (ids[i] !== bodies[i].id) return false;
  return true;
}

/**
 * Reusable collision sweep snapshot. The id->slot map and flat Float64 storage are
 * rebuilt only when the massive-body topology changes, not every physics substep.
 */
export class CollisionStateBuffer {
  constructor() {
    this.ids = [];
    this.indexById = new Map();
    this.positions = new Float64Array(0);
    this.velocities = new Float64Array(0);
  }

  capture(bodies) {
    if (!sameTopology(this.ids, bodies)) {
      this.ids = bodies.map((body) => body.id);
      this.indexById.clear();
      for (let i = 0; i < this.ids.length; i += 1) this.indexById.set(this.ids[i], i);
      this.positions = new Float64Array(bodies.length * 3);
      this.velocities = new Float64Array(bodies.length * 3);
    }
    for (let i = 0; i < bodies.length; i += 1) {
      const k = i * 3;
      const body = bodies[i];
      this.positions[k] = body.position[0];
      this.positions[k + 1] = body.position[1];
      this.positions[k + 2] = body.position[2];
      this.velocities[k] = body.velocity[0];
      this.velocities[k + 1] = body.velocity[1];
      this.velocities[k + 2] = body.velocity[2];
    }
    return this;
  }

  offsetFor(id) {
    const index = this.indexById.get(id);
    return Number.isInteger(index) ? index * 3 : -1;
  }
}

function firstSphereContactFraction(r0x, r0y, r0z, sx, sy, sz, radius) {
  const c = r0x * r0x + r0y * r0y + r0z * r0z - radius * radius;
  if (c <= 0) return 0;
  const a = sx * sx + sy * sy + sz * sz;
  if (a <= 1e-30) return null;
  const b = 2 * (r0x * sx + r0y * sy + r0z * sz);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const t0 = (-b - root) / (2 * a);
  if (t0 >= 0 && t0 <= 1) return t0;
  const t1 = (-b + root) / (2 * a);
  return t1 >= 0 && t1 <= 1 ? t1 : null;
}


export class CollisionMonitor {
  constructor() {
    this.active = new Set();
  }

  scan(bodies, previousState = null, simTimeSeconds = 0) {
    const events = [];
    const current = new Set();
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i], b = bodies[j];
        if (a.fragmentFamilyId && a.fragmentFamilyId === b.fragmentFamilyId) continue;
        const aGrace = Number(a.collisionGraceUntil) || 0;
        const bGrace = Number(b.collisionGraceUntil) || 0;
        if (simTimeSeconds < aGrace || simTimeSeconds < bGrace) continue;

        const limit = (a.radius + b.radius) * SIMULATION.collisionSafetyFactor;
        const endDx = b.position[0] - a.position[0];
        const endDy = b.position[1] - a.position[1];
        const endDz = b.position[2] - a.position[2];
        let dx = endDx, dy = endDy, dz = endDz;
        let hit = dx * dx + dy * dy + dz * dz <= limit * limit;
        let stepFraction = 1;

        let hasPrevious = false;
        let hasPreviousVelocity = false;
        let pax = 0, pay = 0, paz = 0, pbx = 0, pby = 0, pbz = 0;
        let vax = 0, vay = 0, vaz = 0, vbx = 0, vby = 0, vbz = 0;

        if (previousState instanceof CollisionStateBuffer) {
          const oa = previousState.offsetFor(a.id);
          const ob = previousState.offsetFor(b.id);
          if (oa >= 0 && ob >= 0) {
            hasPrevious = true;
            hasPreviousVelocity = true;
            pax = previousState.positions[oa]; pay = previousState.positions[oa + 1]; paz = previousState.positions[oa + 2];
            pbx = previousState.positions[ob]; pby = previousState.positions[ob + 1]; pbz = previousState.positions[ob + 2];
            vax = previousState.velocities[oa]; vay = previousState.velocities[oa + 1]; vaz = previousState.velocities[oa + 2];
            vbx = previousState.velocities[ob]; vby = previousState.velocities[ob + 1]; vbz = previousState.velocities[ob + 2];
          }
        } else if (previousState instanceof Map) {
          const pa = previousState.get(a.id);
          const pb = previousState.get(b.id);
          if (pa && pb) {
            hasPrevious = true;
            pax = pa[0]; pay = pa[1]; paz = pa[2];
            pbx = pb[0]; pby = pb[1]; pbz = pb[2];
          }
        }

        if (hasPrevious) {
          const r0x = pbx - pax, r0y = pby - pay, r0z = pbz - paz;
          const sx = endDx - r0x, sy = endDy - r0y, sz = endDz - r0z;
          const tau = firstSphereContactFraction(r0x, r0y, r0z, sx, sy, sz, limit);
          if (tau !== null) {
            hit = true;
            stepFraction = clamp01(tau);
            dx = r0x + sx * stepFraction;
            dy = r0y + sy * stepFraction;
            dz = r0z + sz * stepFraction;
          }
        }

        if (!hit) continue;
        const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        current.add(key);
        if (this.active.has(key)) continue;

        let contactPositionA = null;
        let contactPositionB = null;
        let contactVelocityA = null;
        let contactVelocityB = null;
        if (hasPrevious) {
          contactPositionA = [
            pax + (a.position[0] - pax) * stepFraction,
            pay + (a.position[1] - pay) * stepFraction,
            paz + (a.position[2] - paz) * stepFraction,
          ];
          contactPositionB = [
            pbx + (b.position[0] - pbx) * stepFraction,
            pby + (b.position[1] - pby) * stepFraction,
            pbz + (b.position[2] - pbz) * stepFraction,
          ];
          if (hasPreviousVelocity) {
            contactVelocityA = [
              vax + (a.velocity[0] - vax) * stepFraction,
              vay + (a.velocity[1] - vay) * stepFraction,
              vaz + (a.velocity[2] - vaz) * stepFraction,
            ];
            contactVelocityB = [
              vbx + (b.velocity[0] - vbx) * stepFraction,
              vby + (b.velocity[1] - vby) * stepFraction,
              vbz + (b.velocity[2] - vbz) * stepFraction,
            ];
          }
        }
        const av = contactVelocityA ?? a.velocity;
        const bv = contactVelocityB ?? b.velocity;
        const rvx = bv[0] - av[0];
        const rvy = bv[1] - av[1];
        const rvz = bv[2] - av[2];
        const normalMag = Math.hypot(dx, dy, dz) || 1;
        events.push({
          type: 'collision-start',
          a,
          b,
          relativeVelocity: [rvx, rvy, rvz],
          relativeSpeed: Math.hypot(rvx, rvy, rvz),
          contactNormal: [dx / normalMag, dy / normalMag, dz / normalMag],
          stepFraction,
          contactPositionA,
          contactPositionB,
          contactVelocityA,
          contactVelocityB,
        });
      }
    }
    this.active = current;
    return events;
  }
}
