import { PHYSICS, SIMULATION } from '../core/constants.js';
import { DirectGravitySolver } from './gravity/directGravitySolver.js';
import { VelocityVerletIntegrator } from './integrators/velocityVerlet.js';
import { massivePairPhysicsStepLimitSeconds } from './massivePairStepControl.js';

function cloneBody(body) {
  return {
    id: body.id,
    name: body.name,
    mass: body.mass,
    radius: body.radius || 0,
    gravitySource: body.gravitySource !== false,
    position: new Float64Array(body.position),
    velocity: new Float64Array(body.velocity),
  };
}

function segmentSphereHit(p0, p1, c0Flat, c0Offset, c1, radius) {
  const c0x = c0Flat[c0Offset], c0y = c0Flat[c0Offset + 1], c0z = c0Flat[c0Offset + 2];
  const rx0 = p0[0] - c0x, ry0 = p0[1] - c0y, rz0 = p0[2] - c0z;
  const rvx = (p1[0] - p0[0]) - (c1[0] - c0x);
  const rvy = (p1[1] - p0[1]) - (c1[1] - c0y);
  const rvz = (p1[2] - p0[2]) - (c1[2] - c0z);
  const a = rvx * rvx + rvy * rvy + rvz * rvz;
  const b = 2 * (rx0 * rvx + ry0 * rvy + rz0 * rvz);
  const c = rx0 * rx0 + ry0 * ry0 + rz0 * rz0 - radius * radius;
  if (c <= 0) return 0;
  if (a <= 1e-30) return null;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const t0 = (-b - root) / (2 * a);
  if (t0 >= 0 && t0 <= 1) return t0;
  const t1 = (-b + root) / (2 * a);
  return t1 >= 0 && t1 <= 1 ? t1 : null;
}

function probeAcceleration(probePosition, sources, out) {
  let ax = 0, ay = 0, az = 0;
  for (const source of sources) {
    if (source.gravitySource === false || !(source.mass > 0)) continue;
    const dx = source.position[0] - probePosition[0];
    const dy = source.position[1] - probePosition[1];
    const dz = source.position[2] - probePosition[2];
    const r2 = dx * dx + dy * dy + dz * dz + 1;
    const invR = 1 / Math.sqrt(r2);
    const scale = PHYSICS.G * source.mass * invR * invR * invR;
    ax += dx * scale; ay += dy * scale; az += dz * scale;
  }
  out[0] = ax; out[1] = ay; out[2] = az;
  return out;
}

function localProbeStepLimitSeconds(probe, sources, fallback) {
  let limit = fallback;
  for (const source of sources) {
    if (source.gravitySource === false || !(source.mass > 0)) continue;
    const dx = source.position[0] - probe.position[0];
    const dy = source.position[1] - probe.position[1];
    const dz = source.position[2] - probe.position[2];
    const r = Math.max(1, source.radius + probe.radius, Math.hypot(dx, dy, dz));
    const dynamical = Math.sqrt((r * r * r) / (PHYSICS.G * source.mass));
    if (Number.isFinite(dynamical) && dynamical > 0) limit = Math.min(limit, dynamical * 0.08);
    const rvx = probe.velocity[0] - source.velocity[0];
    const rvy = probe.velocity[1] - source.velocity[1];
    const rvz = probe.velocity[2] - source.velocity[2];
    const relativeSpeed = Math.hypot(rvx, rvy, rvz);
    if (relativeSpeed > 1e-6) limit = Math.min(limit, (r / relativeSpeed) * 0.05);
  }
  return Math.max(SIMULATION.trajectoryMinStepSeconds, limit);
}

function interpolateInto(out, a, b, t) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
}

export class TrajectoryPredictor {
  constructor() {
    this.solver = new DirectGravitySolver();
    this.integrator = new VelocityVerletIntegrator(this.solver);
    this._probeA0 = new Float64Array(3);
    this._probeA1 = new Float64Array(3);
    this._previousProbe = new Float64Array(3);
    this._sampleScratch = new Float64Array(3);
    this._previousSources = new Float64Array(0);
  }

  _ensureSourceScratch(count) {
    const required = count * 3;
    if (this._previousSources.length !== required) this._previousSources = new Float64Array(required);
  }

  predict(bodyDefinition, gravitySources, horizonSeconds, requestedSamples = SIMULATION.trajectoryMaxSamples, targetBodyId = null) {
    const horizon = Math.max(1, Number(horizonSeconds) || 1);
    const sampleBudget = Math.max(24, Math.min(Number(requestedSamples) || SIMULATION.trajectoryMaxSamples, SIMULATION.trajectoryMaxSamples));
    const sampleInterval = horizon / Math.max(1, sampleBudget - 1);
    const nominalStep = Math.max(
      SIMULATION.trajectoryMinStepSeconds,
      Math.min(SIMULATION.trajectoryMaxStepSeconds, sampleInterval),
    );
    // Allow up to 8 internal integration steps per displayed trajectory sample. If a requested
    // long horizon in strong gravity would require more, keep CPU bounded and flag the prediction
    // as numerically budget-limited rather than silently pretending the coarse path is high fidelity.
    const maxInternalSteps = sampleBudget * 8;
    const budgetStepFloor = horizon / maxInternalSteps;
    const sources = gravitySources.map(cloneBody);
    const probe = cloneBody({
      id: '__trajectory-probe__',
      name: 'Trajectory Probe',
      mass: Math.max(1, Number(bodyDefinition.mass) || 1),
      radius: Math.max(0, Number(bodyDefinition.radius) || 0),
      gravitySource: false,
      position: bodyDefinition.position,
      velocity: bodyDefinition.velocity,
    });
    this._ensureSourceScratch(sources.length);

    const points = new Float64Array(sampleBudget * 3);
    points[0] = probe.position[0]; points[1] = probe.position[1]; points[2] = probe.position[2];
    let pointCount = 1;
    let impact = null;
    let minTarget = null;
    let targetClosest = null;
    let elapsed = 0;
    let nextSampleTime = sampleInterval;
    let internalSteps = 0;
    let minimumIntegrationStep = Infinity;
    let accuracyLimited = false;

    while (elapsed < horizon - 1e-9 && internalSteps < maxInternalSteps) {
      let physicalLimit = Math.min(
        nominalStep,
        localProbeStepLimitSeconds(probe, sources, nominalStep),
        massivePairPhysicsStepLimitSeconds(sources, nominalStep),
      );
      if (physicalLimit < budgetStepFloor) {
        physicalLimit = budgetStepFloor;
        accuracyLimited = true;
      }
      const actualDt = Math.min(physicalLimit, horizon - elapsed);
      if (!(actualDt > 0)) break;
      minimumIntegrationStep = Math.min(minimumIntegrationStep, actualDt);
      internalSteps += 1;

      this._previousProbe[0] = probe.position[0];
      this._previousProbe[1] = probe.position[1];
      this._previousProbe[2] = probe.position[2];
      for (let i = 0; i < sources.length; i += 1) {
        const k = i * 3;
        this._previousSources[k] = sources[i].position[0];
        this._previousSources[k + 1] = sources[i].position[1];
        this._previousSources[k + 2] = sources[i].position[2];
      }

      // The spacecraft/probe is a true test particle here: the major bodies mutually gravitate,
      // while the prediction probe feels them without exerting a fictitious back-reaction.
      probeAcceleration(probe.position, sources, this._probeA0);
      this.integrator.step(sources, actualDt);
      const halfDt2 = 0.5 * actualDt * actualDt;
      probe.position[0] += probe.velocity[0] * actualDt + this._probeA0[0] * halfDt2;
      probe.position[1] += probe.velocity[1] * actualDt + this._probeA0[1] * halfDt2;
      probe.position[2] += probe.velocity[2] * actualDt + this._probeA0[2] * halfDt2;
      probeAcceleration(probe.position, sources, this._probeA1);
      const halfDt = 0.5 * actualDt;
      probe.velocity[0] += (this._probeA0[0] + this._probeA1[0]) * halfDt;
      probe.velocity[1] += (this._probeA0[1] + this._probeA1[1]) * halfDt;
      probe.velocity[2] += (this._probeA0[2] + this._probeA1[2]) * halfDt;

      const startElapsed = elapsed;
      elapsed += actualDt;

      for (let i = 0; i < sources.length; i += 1) {
        const source = sources[i];
        const k = i * 3;
        const radius = source.radius + probe.radius;
        const hitFraction = segmentSphereHit(this._previousProbe, probe.position, this._previousSources, k, source.position, radius);
        const dx = probe.position[0] - source.position[0];
        const dy = probe.position[1] - source.position[1];
        const dz = probe.position[2] - source.position[2];
        const separation = Math.hypot(dx, dy, dz) - radius;
        const closestRecord = { bodyId: source.id, bodyName: source.name, separationMeters: separation, timeSeconds: elapsed };
        if (!minTarget || separation < minTarget.separationMeters) minTarget = closestRecord;
        if (source.id === targetBodyId && (!targetClosest || separation < targetClosest.separationMeters)) targetClosest = closestRecord;
        if (hitFraction !== null && !impact) {
          const rvx = probe.velocity[0] - source.velocity[0];
          const rvy = probe.velocity[1] - source.velocity[1];
          const rvz = probe.velocity[2] - source.velocity[2];
          impact = {
            bodyId: source.id,
            bodyName: source.name,
            timeSeconds: startElapsed + actualDt * hitFraction,
            relativeSpeedMps: Math.hypot(rvx, rvy, rvz),
          };
        }
      }

      while (pointCount < sampleBudget && nextSampleTime <= elapsed + 1e-9) {
        const t = actualDt > 0 ? Math.max(0, Math.min(1, (nextSampleTime - startElapsed) / actualDt)) : 1;
        interpolateInto(this._sampleScratch, this._previousProbe, probe.position, t);
        const k = pointCount * 3;
        points[k] = this._sampleScratch[0]; points[k + 1] = this._sampleScratch[1]; points[k + 2] = this._sampleScratch[2];
        pointCount += 1;
        nextSampleTime += sampleInterval;
      }

      if (impact) break;
    }

    if (!impact && elapsed < horizon - 1e-6) accuracyLimited = true;
    if (pointCount < sampleBudget && (!impact || elapsed > 0)) {
      const k = pointCount * 3;
      points[k] = probe.position[0]; points[k + 1] = probe.position[1]; points[k + 2] = probe.position[2];
      pointCount += 1;
    }

    return {
      points: points.slice(0, pointCount * 3),
      stepSeconds: nominalStep,
      minimumIntegrationStepSeconds: Number.isFinite(minimumIntegrationStep) ? minimumIntegrationStep : nominalStep,
      internalSteps,
      accuracyLimited,
      horizonSeconds: elapsed,
      requestedHorizonSeconds: horizon,
      impact,
      closest: minTarget,
      targetClosest,
    };
  }
}
