import { DirectGravitySolver } from '../physics/gravity/directGravitySolver.js';
import { VelocityVerletIntegrator } from '../physics/integrators/velocityVerlet.js';
import { massivePairPhysicsStepLimitSeconds } from '../physics/massivePairStepControl.js';
import { apparentAngularRadiusRad, diskOccultation } from '../core/celestialAppearance.js';
import { solveSurfaceObserver } from '../core/astronomicalObserver.js';

const EPSILON = 1e-12;
const DEG = Math.PI / 180;
const DEFAULT_COARSE_STEP_SECONDS = 300;
const DEFAULT_REFINEMENT_STEP_SECONDS = 10;
const DEFAULT_ALIGNMENT_THRESHOLD_RAD = 5 * DEG;
const DEFAULT_MAX_INTERNAL_STEPS = 120_000;
const DEFAULT_MAX_EVENTS = 12;

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dot3(a, b) {
  return finite(a?.[0]) * finite(b?.[0])
    + finite(a?.[1]) * finite(b?.[1])
    + finite(a?.[2]) * finite(b?.[2]);
}

function normalizeDirection(dx, dy, dz, target) {
  const length = Math.hypot(dx, dy, dz);
  if (!(length > EPSILON)) {
    target[0] = 0; target[1] = 0; target[2] = 1;
    return target;
  }
  target[0] = dx / length; target[1] = dy / length; target[2] = dz / length;
  return target;
}

function cloneVector(source) {
  return new Float64Array([
    finite(source?.[0]),
    finite(source?.[1]),
    finite(source?.[2]),
  ]);
}

export function cloneBodiesForObservationPlanning(bodies = []) {
  return bodies
    .filter((body) => body?.gravitySource !== false && body?.position && body?.velocity && Number.isFinite(Number(body?.mass)))
    .map((body) => ({
      id: body.id,
      name: body.name ?? body.id ?? '',
      kind: body.kind ?? '',
      parentId: body.parentId ?? null,
      mass: finite(body.mass),
      radius: Math.max(0, finite(body.radius)),
      gravitySource: body.gravitySource !== false,
      position: cloneVector(body.position),
      velocity: cloneVector(body.velocity),
      rotationPeriodSeconds: Number.isFinite(Number(body.rotationPeriodSeconds)) ? Number(body.rotationPeriodSeconds) : null,
      rotationDirection: finite(body.rotationDirection, 1),
      rotationAxisInertial: body.rotationAxisInertial ? cloneVector(body.rotationAxisInertial) : null,
      rotationPhaseRad: finite(body.rotationPhaseRad),
      rotationEpochSeconds: finite(body.rotationEpochSeconds),
      rotationModel: body.rotationModel ?? null,
    }));
}

function snapshotState(bodies, target) {
  const required = bodies.length * 6;
  const out = target && target.length === required ? target : new Float64Array(required);
  for (let i = 0; i < bodies.length; i += 1) {
    const body = bodies[i];
    const k = i * 6;
    out[k] = body.position[0]; out[k + 1] = body.position[1]; out[k + 2] = body.position[2];
    out[k + 3] = body.velocity[0]; out[k + 4] = body.velocity[1]; out[k + 5] = body.velocity[2];
  }
  return out;
}

function restoreState(bodies, state) {
  for (let i = 0; i < bodies.length; i += 1) {
    const body = bodies[i];
    const k = i * 6;
    body.position[0] = state[k]; body.position[1] = state[k + 1]; body.position[2] = state[k + 2];
    body.velocity[0] = state[k + 3]; body.velocity[1] = state[k + 4]; body.velocity[2] = state[k + 5];
  }
}

function bodyIndexById(bodies, id) {
  return bodies.findIndex((body) => body.id === id);
}

function observerDescriptor({ observerBodyId, surfaceSession = null, terrainHeightMeters = 0 } = {}) {
  return {
    observerBodyId: observerBodyId ?? null,
    surfaceSession: surfaceSession && surfaceSession.bodyId === observerBodyId
      ? {
          active: true,
          bodyId: surfaceSession.bodyId,
          x: finite(surfaceSession.x),
          z: finite(surfaceSession.z),
          yaw: finite(surfaceSession.yaw),
          pitch: finite(surfaceSession.pitch),
          bodyFixedAnchor: Array.isArray(surfaceSession.bodyFixedAnchor)
            ? surfaceSession.bodyFixedAnchor.slice(0, 3).map((value) => finite(value))
            : null,
        }
      : null,
    terrainHeightMeters: finite(terrainHeightMeters),
  };
}

function eventType(overlap, foreground) {
  if (!foreground || !(overlap?.backgroundCoveredFraction > 0)) return 'conjunction';
  if (overlap.state === 'total') return 'total-eclipse';
  if (overlap.state === 'interior') return 'annular-transit';
  return 'partial-eclipse';
}

export function observationEventLabel(event) {
  switch (event?.type) {
    case 'total-eclipse': return 'TOTAL STELLAR ECLIPSE';
    case 'annular-transit': return 'ANNULAR / TRANSIT';
    case 'partial-eclipse': return 'PARTIAL STELLAR ECLIPSE';
    default: return 'STELLAR CONJUNCTION';
  }
}

export class ObservationPlannerSearch {
  constructor({
    bodies = [],
    startTimeSeconds = 0,
    observerBodyId,
    surfaceSession = null,
    terrainHeightMeters = 0,
    horizonSeconds = 30 * 86400,
    coarseStepSeconds = DEFAULT_COARSE_STEP_SECONDS,
    refinementStepSeconds = DEFAULT_REFINEMENT_STEP_SECONDS,
    alignmentThresholdRad = DEFAULT_ALIGNMENT_THRESHOLD_RAD,
    maxInternalSteps = DEFAULT_MAX_INTERNAL_STEPS,
    maxEvents = DEFAULT_MAX_EVENTS,
  } = {}) {
    this.startTimeSeconds = Math.max(0, finite(startTimeSeconds));
    this.currentTimeSeconds = this.startTimeSeconds;
    this.horizonSeconds = Math.max(1, finite(horizonSeconds, 30 * 86400));
    this.endTimeSeconds = this.startTimeSeconds + this.horizonSeconds;
    this.coarseStepSeconds = Math.max(1, finite(coarseStepSeconds, DEFAULT_COARSE_STEP_SECONDS));
    this.refinementStepSeconds = Math.max(0.25, Math.min(this.coarseStepSeconds, finite(refinementStepSeconds, DEFAULT_REFINEMENT_STEP_SECONDS)));
    this.alignmentThresholdRad = Math.max(0, finite(alignmentThresholdRad, DEFAULT_ALIGNMENT_THRESHOLD_RAD));
    this.maxInternalSteps = Math.max(100, Math.floor(finite(maxInternalSteps, DEFAULT_MAX_INTERNAL_STEPS)));
    this.maxEvents = Math.max(1, Math.floor(finite(maxEvents, DEFAULT_MAX_EVENTS)));
    this.reference = observerDescriptor({ observerBodyId, surfaceSession, terrainHeightMeters });
    this.bodies = cloneBodiesForObservationPlanning(bodies);
    this.originalBodyCount = bodies.length;
    this.bodyMap = new Map(this.bodies.map((body) => [body.id, body]));
    this.observerBodyIndex = bodyIndexById(this.bodies, observerBodyId);
    this.starIndex = this.bodies.findIndex((body) => body.kind === 'star');
    this.star = this.starIndex >= 0 ? this.bodies[this.starIndex] : null;
    this.candidates = this.bodies.filter((body, index) => index !== this.starIndex && index !== this.observerBodyIndex && body.radius > 0);
    this.candidateIndexById = new Map(this.candidates.map((body, index) => [body.id, index]));
    this.solver = new DirectGravitySolver();
    this.integrator = new VelocityVerletIntegrator(this.solver);
    this.events = [];
    this.internalSteps = 0;
    this.refinementSteps = 0;
    this.accuracyLimited = false;
    this.done = false;
    this.error = null;
    this._surfaceObserverState = null;
    this._directionStar = new Float64Array(3);
    this._directionBody = new Float64Array(3);

    if (this.observerBodyIndex < 0) this.error = 'Planner reference body is unavailable in the authoritative gravity-source registry.';
    else if (!this.star) this.error = 'Planner requires a primary star in the authoritative body registry.';
    else if (this.bodies.length < 2) this.error = 'Planner requires at least two propagated bodies.';

    this._separationA = new Float64Array(this.candidates.length); this._separationA.fill(Infinity);
    this._separationB = new Float64Array(this.candidates.length); this._separationB.fill(Infinity);
    this._separationC = new Float64Array(this.candidates.length); this._separationC.fill(Infinity);
    const stateLength = this.bodies.length * 6;
    this._stateA = new Float64Array(stateLength);
    this._stateB = new Float64Array(stateLength);
    this._stateC = new Float64Array(stateLength);
    this._timeA = this.currentTimeSeconds;
    this._timeB = this.currentTimeSeconds;
    this._timeC = this.currentTimeSeconds;
    this._historyCount = 0;
    this._nextSampleTime = this.currentTimeSeconds;

    if (!this.error) this._captureInitialSample();
    else this.done = true;
  }

  _observerPositionAt(timeSeconds) {
    const observerBody = this.bodies[this.observerBodyIndex];
    if (!observerBody) return null;
    if (!this.reference.surfaceSession) return observerBody.position;
    this._surfaceObserverState = solveSurfaceObserver({
      body: observerBody,
      shipPosition: observerBody.position,
      session: this.reference.surfaceSession,
      terrainHeightMeters: this.reference.terrainHeightMeters,
      simulationTimeSeconds: timeSeconds,
    }, this._surfaceObserverState ?? undefined);
    return this._surfaceObserverState.inertialPosition;
  }

  _metric(candidate, timeSeconds) {
    const observerPosition = this._observerPositionAt(timeSeconds);
    if (!observerPosition || !candidate || !this.star) return null;
    const sx = this.star.position[0] - observerPosition[0];
    const sy = this.star.position[1] - observerPosition[1];
    const sz = this.star.position[2] - observerPosition[2];
    const bx = candidate.position[0] - observerPosition[0];
    const by = candidate.position[1] - observerPosition[1];
    const bz = candidate.position[2] - observerPosition[2];
    const starRangeMeters = Math.hypot(sx, sy, sz);
    const bodyRangeMeters = Math.hypot(bx, by, bz);
    if (!(starRangeMeters > EPSILON && bodyRangeMeters > EPSILON)) return null;
    normalizeDirection(sx, sy, sz, this._directionStar);
    normalizeDirection(bx, by, bz, this._directionBody);
    const separationRad = Math.acos(clamp(dot3(this._directionStar, this._directionBody), -1, 1));
    const starAngularRadiusRad = apparentAngularRadiusRad(this.star.radius, starRangeMeters);
    const bodyAngularRadiusRad = apparentAngularRadiusRad(candidate.radius, bodyRangeMeters);
    const foreground = bodyRangeMeters < starRangeMeters;
    const overlap = diskOccultation({
      backgroundAngularRadiusRad: starAngularRadiusRad,
      foregroundAngularRadiusRad: bodyAngularRadiusRad,
      separationRad,
      backgroundRangeMeters: starRangeMeters,
      foregroundRangeMeters: bodyRangeMeters,
    });
    let starAltitudeRad = null;
    if (this.reference.surfaceSession && this._surfaceObserverState) {
      const up = this._surfaceObserverState.localUp;
      starAltitudeRad = Math.asin(clamp(dot3(this._directionStar, up), -1, 1));
    }
    return {
      separationRad,
      starAngularRadiusRad,
      bodyAngularRadiusRad,
      starRangeMeters,
      bodyRangeMeters,
      foreground,
      overlap,
      starAltitudeRad,
    };
  }

  _captureSeparations(target, timeSeconds) {
    for (let i = 0; i < this.candidates.length; i += 1) {
      target[i] = this._metric(this.candidates[i], timeSeconds)?.separationRad ?? Infinity;
    }
  }

  _captureInitialSample() {
    snapshotState(this.bodies, this._stateB);
    this._timeB = this.currentTimeSeconds;
    this._captureSeparations(this._separationB, this.currentTimeSeconds);
    this._historyCount = 1;
    this._nextSampleTime = Math.min(this.endTimeSeconds, this.currentTimeSeconds + this.coarseStepSeconds);
    // If the system opens during an eclipse, report the live event immediately instead of
    // waiting for a future local minimum.
    for (const candidate of this.candidates) {
      const metric = this._metric(candidate, this.currentTimeSeconds);
      if (metric?.overlap?.backgroundCoveredFraction > 0 && metric.foreground) {
        this._recordEvent(candidate, this.currentTimeSeconds, metric, { current: true });
      }
    }
  }

  _recordEvent(candidate, timeSeconds, metric, { current = false } = {}) {
    if (!metric) return;
    const coverage = clamp(metric.overlap?.backgroundCoveredFraction ?? 0, 0, 1);
    if (!(coverage > 0) && !(metric.separationRad <= this.alignmentThresholdRad)) return;
    const type = eventType(metric.overlap, metric.foreground);
    const event = {
      bodyId: candidate.id,
      bodyName: candidate.name,
      bodyKind: candidate.kind,
      timeSeconds,
      secondsFromStart: Math.max(0, timeSeconds - this.startTimeSeconds),
      separationRad: metric.separationRad,
      starAngularRadiusRad: metric.starAngularRadiusRad,
      bodyAngularRadiusRad: metric.bodyAngularRadiusRad,
      eclipseFraction: coverage,
      starVisibleFraction: 1 - coverage,
      eclipseState: metric.overlap?.state ?? 'none',
      type,
      label: observationEventLabel({ type }),
      foreground: metric.foreground,
      starAltitudeRad: metric.starAltitudeRad,
      aboveHorizon: metric.starAltitudeRad == null ? null : metric.starAltitudeRad + metric.starAngularRadiusRad > 0,
      current,
      referenceModel: this.reference.surfaceSession ? 'surface-site' : 'body-center',
    };
    const duplicate = this.events.find((existing) => existing.bodyId === event.bodyId
      && Math.abs(existing.timeSeconds - event.timeSeconds) <= Math.max(this.refinementStepSeconds * 2, 20));
    if (duplicate) {
      if (event.separationRad < duplicate.separationRad) Object.assign(duplicate, event);
      return;
    }
    this.events.push(event);
    this.events.sort((a, b) => a.timeSeconds - b.timeSeconds || a.separationRad - b.separationRad);
  }

  _refineCandidate(candidate, startState, startTimeSeconds, endTimeSeconds, restoreStateBuffer) {
    restoreState(this.bodies, startState);
    let time = startTimeSeconds;
    let bestMetric = this._metric(candidate, time);
    let bestTime = time;
    while (time < endTimeSeconds - 1e-9) {
      if (this.internalSteps + this.refinementSteps >= this.maxInternalSteps) {
        this.accuracyLimited = true;
        break;
      }
      const pairLimit = massivePairPhysicsStepLimitSeconds(this.bodies, this.refinementStepSeconds);
      const dt = Math.min(this.refinementStepSeconds, pairLimit, endTimeSeconds - time);
      this.integrator.step(this.bodies, dt);
      time += dt;
      this.refinementSteps += 1;
      const metric = this._metric(candidate, time);
      if (metric && (!bestMetric || metric.separationRad < bestMetric.separationRad)) {
        bestMetric = metric;
        bestTime = time;
      }
    }
    restoreState(this.bodies, restoreStateBuffer);
    return bestMetric ? { timeSeconds: bestTime, metric: bestMetric } : null;
  }

  _processNewSample() {
    snapshotState(this.bodies, this._stateC);
    this._timeC = this.currentTimeSeconds;
    this._captureSeparations(this._separationC, this.currentTimeSeconds);

    if (this._historyCount >= 2) {
      for (let i = 0; i < this.candidates.length; i += 1) {
        const a = this._separationA[i];
        const b = this._separationB[i];
        const c = this._separationC[i];
        if (!(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c))) continue;
        if (!(b <= a && b <= c && (b < a || b < c))) continue;
        const refined = this._refineCandidate(this.candidates[i], this._stateA, this._timeA, this._timeC, this._stateC);
        if (refined) this._recordEvent(this.candidates[i], refined.timeSeconds, refined.metric);
      }
    }

    // Rotate fixed buffers without allocating.
    [this._stateA, this._stateB, this._stateC] = [this._stateB, this._stateC, this._stateA];
    [this._separationA, this._separationB, this._separationC] = [this._separationB, this._separationC, this._separationA];
    this._timeA = this._timeB;
    this._timeB = this._timeC;
    this._historyCount = Math.min(3, this._historyCount + 1);
  }

  stepChunk(maxIntegratorSteps = 180) {
    if (this.done) return this.progress();
    const budget = Math.max(1, Math.floor(finite(maxIntegratorSteps, 180)));
    let used = 0;
    while (!this.done && used < budget) {
      if (this.internalSteps + this.refinementSteps >= this.maxInternalSteps) {
        this.accuracyLimited = true;
        this.done = true;
        break;
      }
      if (this.currentTimeSeconds >= this.endTimeSeconds - 1e-9) {
        this.done = true;
        break;
      }
      const pairLimit = massivePairPhysicsStepLimitSeconds(this.bodies, this.coarseStepSeconds);
      const nextBoundary = Math.min(this._nextSampleTime, this.endTimeSeconds);
      const dt = Math.min(this.coarseStepSeconds, pairLimit, nextBoundary - this.currentTimeSeconds);
      if (!(dt > 0)) {
        this._processNewSample();
        this._nextSampleTime = Math.min(this.endTimeSeconds, this._nextSampleTime + this.coarseStepSeconds);
        continue;
      }
      this.integrator.step(this.bodies, dt);
      this.currentTimeSeconds += dt;
      this.internalSteps += 1;
      used += 1;
      if (this.currentTimeSeconds >= nextBoundary - 1e-8) {
        this._processNewSample();
        this._nextSampleTime = Math.min(this.endTimeSeconds, this._nextSampleTime + this.coarseStepSeconds);
      }
    }
    if (this.currentTimeSeconds >= this.endTimeSeconds - 1e-9) this.done = true;
    return this.progress();
  }

  progress() {
    return {
      done: this.done,
      error: this.error,
      fraction: clamp((this.currentTimeSeconds - this.startTimeSeconds) / this.horizonSeconds, 0, 1),
      currentTimeSeconds: this.currentTimeSeconds,
      endTimeSeconds: this.endTimeSeconds,
      internalSteps: this.internalSteps,
      refinementSteps: this.refinementSteps,
      accuracyLimited: this.accuracyLimited,
      eventCount: this.events.length,
    };
  }

  result() {
    const observerBody = this.bodies[this.observerBodyIndex] ?? null;
    return {
      status: this.error ? 'error' : this.accuracyLimited ? 'budget-limited' : this.done ? 'complete' : 'running',
      error: this.error,
      startTimeSeconds: this.startTimeSeconds,
      requestedEndTimeSeconds: this.endTimeSeconds,
      reachedTimeSeconds: this.currentTimeSeconds,
      horizonSeconds: this.horizonSeconds,
      coarseStepSeconds: this.coarseStepSeconds,
      refinementStepSeconds: this.refinementStepSeconds,
      alignmentThresholdRad: this.alignmentThresholdRad,
      reference: {
        bodyId: observerBody?.id ?? this.reference.observerBodyId,
        bodyName: observerBody?.name ?? this.reference.observerBodyId ?? '—',
        model: this.reference.surfaceSession ? 'CURRENT LANDED SITE' : 'BODY CENTER',
      },
      bodyCount: this.bodies.length,
      internalSteps: this.internalSteps,
      refinementSteps: this.refinementSteps,
      accuracyLimited: this.accuracyLimited,
      events: this.events.slice(0, this.maxEvents),
      limitations: [
        'Temporary cloned N-body ephemeris only; authoritative bodies are never moved by the planner.',
        this.reference.surfaceSession
          ? 'Surface prediction holds the current local site fixed in the rotating body frame; future walking is not predicted.'
          : 'Body-center reference ignores surface parallax/horizon until an exact landed site is selected.',
        'Future impact/fragmentation events are not replayed inside the planner; predictions beyond a real collision require a fresh search.',
      ],
    };
  }
}

export function runObservationPlannerToCompletion(options = {}) {
  const search = new ObservationPlannerSearch(options);
  while (!search.done) search.stepChunk(10_000);
  return search.result();
}
