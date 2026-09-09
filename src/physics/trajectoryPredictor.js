import { SIMULATION } from '../core/constants.js';
import { DirectGravitySolver } from './gravity/directGravitySolver.js';
import { VelocityVerletIntegrator } from './integrators/velocityVerlet.js';

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

function segmentSphereHit(p0, p1, c0, c1, radius) {
  const rx0 = p0[0] - c0[0], ry0 = p0[1] - c0[1], rz0 = p0[2] - c0[2];
  const rvx = (p1[0] - p0[0]) - (c1[0] - c0[0]);
  const rvy = (p1[1] - p0[1]) - (c1[1] - c0[1]);
  const rvz = (p1[2] - p0[2]) - (c1[2] - c0[2]);
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

export class TrajectoryPredictor {
  constructor() {
    this.solver = new DirectGravitySolver();
    this.integrator = new VelocityVerletIntegrator(this.solver);
  }

  predict(bodyDefinition, gravitySources, horizonSeconds, requestedSamples = SIMULATION.trajectoryMaxSamples, targetBodyId = null) {
    const horizon = Math.max(1, Number(horizonSeconds) || 1);
    const sampleBudget = Math.max(24, Math.min(Number(requestedSamples) || SIMULATION.trajectoryMaxSamples, SIMULATION.trajectoryMaxSamples));
    const dt = Math.max(
      SIMULATION.trajectoryMinStepSeconds,
      Math.min(SIMULATION.trajectoryMaxStepSeconds, horizon / Math.max(1, sampleBudget - 1)),
    );
    const steps = Math.max(1, Math.ceil(horizon / dt));
    const sources = gravitySources.map(cloneBody);
    const probe = cloneBody({
      id: '__trajectory-probe__',
      name: 'Trajectory Probe',
      mass: Math.max(1, Number(bodyDefinition.mass) || 1),
      radius: Math.max(0, Number(bodyDefinition.radius) || 0),
      gravitySource: true,
      position: bodyDefinition.position,
      velocity: bodyDefinition.velocity,
    });
    const bodies = [...sources, probe];
    const points = new Float64Array((steps + 1) * 3);
    points[0] = probe.position[0]; points[1] = probe.position[1]; points[2] = probe.position[2];
    let impact = null;
    let minTarget = null;
    let targetClosest = null;
    let elapsed = 0;

    for (let step = 1; step <= steps; step += 1) {
      const actualDt = Math.min(dt, horizon - elapsed);
      if (!(actualDt > 0)) break;
      const previousProbe = new Float64Array(probe.position);
      const previousSources = sources.map((source) => new Float64Array(source.position));
      this.integrator.step(bodies, actualDt);
      elapsed += actualDt;
      const k = step * 3;
      points[k] = probe.position[0]; points[k + 1] = probe.position[1]; points[k + 2] = probe.position[2];

      for (let i = 0; i < sources.length; i += 1) {
        const source = sources[i];
        const radius = source.radius + probe.radius;
        const hitFraction = segmentSphereHit(previousProbe, probe.position, previousSources[i], source.position, radius);
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
            timeSeconds: elapsed - actualDt + actualDt * hitFraction,
            relativeSpeedMps: Math.hypot(rvx, rvy, rvz),
          };
        }
      }
      if (impact) {
        return { points: points.slice(0, (step + 1) * 3), stepSeconds: dt, horizonSeconds: elapsed, impact, closest: minTarget, targetClosest };
      }
    }

    return { points, stepSeconds: dt, horizonSeconds: horizon, impact, closest: minTarget, targetClosest };
  }
}
