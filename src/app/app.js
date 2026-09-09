import { EntityRegistry } from '../core/entityRegistry.js';
import { SimulationClock } from '../core/simulationClock.js';
import { FloatingReferenceFrame } from '../core/referenceFrame.js';
import { SaveSystem } from '../core/saveSystem.js';
import { PHYSICS, SIMULATION, BODY_KIND } from '../core/constants.js';
import { generateSystem } from '../data/systemGenerator.js';
import { DirectGravitySolver } from '../physics/gravity/directGravitySolver.js';
import { VelocityVerletIntegrator } from '../physics/integrators/velocityVerlet.js';
import { CollisionMonitor } from '../physics/collisionMonitor.js';
import { TestParticleField } from '../physics/testParticleField.js';
import { ShipDynamics } from '../physics/shipDynamics.js';
import { computeApproachAcceleration, computeMatchVelocityAcceleration, computeAbsoluteBrakeAcceleration, recommendedWarpCap, targetRelativeState, navigationPhysicsStepLimitSeconds, newtonianModelLimit } from '../physics/flightComputer.js';
import { formatEnergy } from '../physics/impactModel.js';
import { resolveImpact } from '../physics/impactResolver.js';
import { osculatingMetrics, angularAlignment } from '../physics/orbitalMetrics.js';
import { TrajectoryPredictor } from '../physics/trajectoryPredictor.js';
import { ExperimentRegistry } from '../experiments/experimentRegistry.js';
import { registerLabExperiments, MATERIALS, asteroidDefinitionFromParams, sphereRadiusFromMassDensity } from '../experiments/labSpawner.js';
import { ParticleExperimentManager, PARTICLE_MODES } from '../experiments/particles/particleExperimentManager.js';
import { UniverseRenderer } from '../render/threeRenderer.js';
import { Hud } from '../ui/hud.js';

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function serializeBody(body) {
  return {
    id: body.id,
    kind: body.kind,
    name: body.name,
    mass: body.mass,
    radius: body.radius,
    visualRadiusMeters: body.visualRadiusMeters,
    temperatureK: body.temperatureK,
    luminositySolar: body.luminositySolar,
    spectralClass: body.spectralClass,
    color: body.color,
    gravitySource: body.gravitySource,
    generated: body.generated,
    landable: body.landable,
    homeCandidate: body.homeCandidate,
    surfaceProfile: body.surfaceProfile,
    planetType: body.planetType,
    parentId: body.parentId,
    densityKgM3: body.densityKgM3,
    materialId: body.materialId,
    visualVersion: body.visualVersion,
    damageRecords: body.damageRecords,
    semiMajorAxis: body.semiMajorAxis,
    eccentricity: body.eccentricity,
    inclinationRad: body.inclinationRad,
    scientificWarning: body.scientificWarning,
    isImpactFragment: body.isImpactFragment,
    fragmentGenerationDepth: body.fragmentGenerationDepth,
    fragmentFamilyId: body.fragmentFamilyId,
    fragmentParentTargetId: body.fragmentParentTargetId,
    collisionGraceUntil: body.collisionGraceUntil,
    position: [...body.position],
    velocity: [...body.velocity],
  };
}

function restoreBody(raw) {
  return {
    ...raw,
    position: new Float64Array(raw.position),
    velocity: new Float64Array(raw.velocity),
  };
}

function formatRadiusMeters(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e6) return `${(value / 1e6).toFixed(3)} Mm`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(3)} km`;
  return `${value.toFixed(2)} m`;
}

export class UniverseLabApp {
  constructor(root) {
    this.root = root;
    this.hud = new Hud(root);
    this.registry = new EntityRegistry();
    this.clock = new SimulationClock();
    this.referenceFrame = new FloatingReferenceFrame();
    this.saveSystem = new SaveSystem();
    this.gravitySolver = new DirectGravitySolver();
    this.integrator = new VelocityVerletIntegrator(this.gravitySolver);
    this.collisionMonitor = new CollisionMonitor();
    this.ship = new ShipDynamics();
    this.trajectoryPredictor = new TrajectoryPredictor();
    this.experiments = new ExperimentRegistry();
    registerLabExperiments(this.experiments);
    this.particleExperiments = new ParticleExperimentManager();
    this.renderer = new UniverseRenderer(root.querySelector('#viewport'));
    this.system = null;
    this.minorField = null;
    this.userBodySerial = 1;
    this.massiveBodies = [];
    this.running = true;
    this.targetId = null;
    this.shipPathEnabled = true;
    this.launchPreviewEnabled = false;
    this.shipPrediction = null;
    this.launchPrediction = null;
    this.predictionMs = 0;
    this.renderMs = 0;
    this.nextPredictionAt = 0;
    this.shipContactId = null;
    this.lastFrame = performance.now();
    this.fpsClock = this.lastFrame;
    this.fpsFrames = 0;
    this.fps = 60;
    this.physicsMs = 0;
    this.experimentMs = 0;
    this._particleWarpNoticeAt = 0;
    this._nextParticleStatusAt = 0;
    this._lookPointer = null;
    this._lookLast = [0, 0];
    this._viewportTap = null;
    this._rollDirection = 0;
    this.navigationMode = 'manual';
    this.navigationStatus = null;
    this.navigationExperimentId = null;
    this._lastWarpSafetyNotice = 0;
    this._lastNavigationPhase = null;
    this._modelLimitLatched = false;
    this.cameraMode = 'ship';
    this.observationStyle = 'frame';
    this.observationYaw = 0;
    this.observationPitch = 0.18;
    this.selectedExperimentId = null;
    this.navigationExperimentId = null;
    this._observationState = null;
    this._nextObservationRefreshAt = 0;
  }

  get bodies() { return this.registry.values(); }
  get target() { return this.targetId ? this.registry.get(this.targetId) : null; }
  get selectedExperiment() { return this.selectedExperimentId ? this.particleExperiments.fields.get(this.selectedExperimentId) ?? null : null; }
  get navigationTarget() { return this.navigationExperimentId ? this.experimentNavigationTarget(this.navigationExperimentId) : this.target; }

  rebuildBodyCaches() {
    this.massiveBodies = this.registry.values().filter((body) => body.gravitySource);
  }

  async init() {
    const backend = await this.renderer.init();
    this.hud.setRenderer(backend);
    this.bindUi();
    this.newSystem(this.root.querySelector('#seedInput').value || 'ORIGIN-001');
    this._runtimeFaulted = false;
    this.renderer.renderer.setAnimationLoop((time) => {
      if (this._runtimeFaulted) return;
      try {
        this.frame(time);
      } catch (error) {
        this._runtimeFaulted = true;
        console.error('Universe Lab runtime frame failure', error);
        this.running = false;
        this.hud.showRuntimeError(error);
      }
    });
    window.addEventListener('unhandledrejection', (event) => {
      if (this._runtimeFaulted) return;
      this._runtimeFaulted = true;
      console.error('Universe Lab unhandled promise rejection', event.reason);
      this.running = false;
      this.hud.showRuntimeError(event.reason);
    });
    this.hud.notify('v0.1.3.2.1 online. Ship renderer isolated from observation mode. Build OBSNAV-1321.');
  }

  newSystem(seed) {
    this.cancelNavigation();
    this.particleExperiments.clear();
    this.returnToShipView(false);
    this.selectedExperimentId = null;
    this.system = generateSystem(seed);
    this.registry.clear();
    for (const body of this.system.bodies) this.registry.create(body);
    this.rebuildBodyCaches();
    this.renderer.resetSystem(this.system.seed);
    this.renderer.syncBodies(this.bodies);
    const star = this.registry.get('star-0');
    const minorCount = safeNumber(this.root.querySelector('#minorCount').value, SIMULATION.defaultMinorBodyCount);
    this.minorField = new TestParticleField(this.system.seed, star, minorCount);
    this.renderer.setMinorField(this.minorField);
    this.clock.elapsedSimSeconds = 0;
    this.clock.setTimeScale(this.root.querySelector('#timeScale').value);
    this.userBodySerial = 1;
    this.placeShipNearHome();
    this.hud.setSeed(this.system.seed);
    this.root.querySelector('#seedInput').value = this.system.seed;
    this.selectTarget(this.system.homeId);
    this.invalidatePredictions();
    this.hud.notify(`Generated ${this.system.starName} (${this.system.metadata.starSpectralClass}-class): ${this.system.metadata.planetCount} planets, ${this.system.metadata.moonCount} moons.`);
  }

  placeShipNearHome() {
    const home = this.registry.get(this.system.homeId) ?? this.bodies.find((body) => body.kind === BODY_KIND.PLANET && body.landable) ?? this.bodies.find((body) => body.kind === BODY_KIND.PLANET);
    if (!home) { this.hud.notify('No planetary home body exists in this state.'); return; }
    this.system.homeId = home.id;
    const distance = home.radius * 5;
    this.ship.position[0] = home.position[0];
    this.ship.position[1] = home.position[1] + distance;
    this.ship.position[2] = home.position[2];
    const orbital = Math.sqrt(PHYSICS.G * home.mass / distance);
    this.ship.velocity[0] = home.velocity[0] + orbital;
    this.ship.velocity[1] = home.velocity[1];
    this.ship.velocity[2] = home.velocity[2];
    this.ship.roll = 0;
    // Start in a useful orbital pilot view instead of staring directly into the planet center.
    // The ship still occupies the same physical orbit; only camera attitude changes.
    this.ship.lookAt(new Float64Array([
      this.ship.position[0] + distance * 0.55,
      this.ship.position[1] - distance * 0.84,
      this.ship.position[2],
    ]));
    this.shipContactId = null;
    this.invalidatePredictions();
  }

  addBody(definition) {
    if (definition.gravitySource && this.massiveBodies.length >= SIMULATION.directGravityBodyLimit) {
      throw new Error(`Direct gravity source budget reached (${SIMULATION.directGravityBodyLimit}). Barnes–Hut is not active yet.`);
    }
    const body = this.registry.create(definition);
    this.rebuildBodyCaches();
    this.renderer.syncBodies(this.bodies);
    this.invalidatePredictions();
    return body;
  }

  selectTarget(id) {
    const body = id ? this.registry.get(id) : null;
    this.targetId = body?.id ?? null;
    if (body && this.navigationMode === 'manual') this.navigationExperimentId = null;
    this.renderer.setTarget(this.targetId);
    if (body) this.hud.notify(`Target locked: ${body.name}. Scanner uses two-body osculating telemetry plus N-body path prediction.`);
    this.invalidatePredictions();
    this.updateTargetTelemetry();
  }

  selectReticleTarget() {
    let best = null;
    let bestAlignment = -Infinity;
    for (const body of this.bodies) {
      const alignment = angularAlignment(this.ship, body);
      if (alignment > bestAlignment) { bestAlignment = alignment; best = body; }
    }
    if (!best) return;
    this.selectTarget(best.id);
    if (bestAlignment < 0.92) this.hud.notify(`Nearest reticle direction selected ${best.name}; aim closer for precise visual targeting.`);
  }

  cycleTarget() {
    const ordered = [...this.bodies].sort((a, b) => {
      const da = Math.hypot(a.position[0] - this.ship.position[0], a.position[1] - this.ship.position[1], a.position[2] - this.ship.position[2]);
      const db = Math.hypot(b.position[0] - this.ship.position[0], b.position[1] - this.ship.position[1], b.position[2] - this.ship.position[2]);
      return da - db;
    });
    if (!ordered.length) return;
    const current = ordered.findIndex((body) => body.id === this.targetId);
    this.selectTarget(ordered[(current + 1 + ordered.length) % ordered.length].id);
  }

  aimAtTarget() {
    const target = this.target;
    if (!target) { this.hud.notify('No target selected.'); return; }
    this.ship.lookAt(target.position);
    this.invalidatePredictions();
    this.hud.notify(`Ship attitude aligned toward ${target.name}. No autopilot thrust was applied.`);
  }

  experimentNavigationTarget(id = this.selectedExperimentId) {
    const state = this.particleExperiments.observationState(id);
    if (!state) return null;
    return {
      id: `experiment:${state.id}`,
      experimentId: state.id,
      name: state.label,
      kind: 'experiment',
      mass: 0,
      radius: Math.max(50_000, state.radiusMeters),
      position: state.center,
      velocity: state.velocity,
      gravitySource: false,
    };
  }

  selectExperiment(id, notify = true) {
    const field = id ? this.particleExperiments.fields.get(id) : null;
    this.selectedExperimentId = field?.id ?? null;
    const select = this.root.querySelector('#experimentSelect');
    if (select && field) select.value = field.id;
    if (!field && this.cameraMode === 'observe') this.returnToShipView(false);
    if (notify && field) this.hud.notify(`Experiment selected: ${field.label}. OBSERVE moves only the camera; RENDEZVOUS moves the physical ship.`);
    this.updateParticleLabStatus();
    return field;
  }

  cycleExperiment() {
    const fields = this.particleExperiments.values;
    if (!fields.length) { this.hud.notify('No active particle experiments.'); return null; }
    const index = fields.findIndex((field) => field.id === this.selectedExperimentId);
    const field = fields[(index + 1 + fields.length) % fields.length];
    this.selectExperiment(field.id);
    return field;
  }

  refreshObservationState(now = performance.now(), force = false) {
    if (this.cameraMode !== 'observe') return null;
    if (!force && now < this._nextObservationRefreshAt && this._observationState?.id === this.selectedExperimentId) return this._observationState;
    const state = this.particleExperiments.observationState(this.selectedExperimentId);
    if (!state) { this.returnToShipView(false); return null; }
    this._observationState = state;
    this._nextObservationRefreshAt = now + 180;
    return state;
  }

  currentCameraView(now = performance.now(), realDt = 0) {
    if (this.cameraMode !== 'observe') return { mode: 'ship' };
    const state = this.refreshObservationState(now);
    if (!state) return { mode: 'ship' };
    if (this.observationStyle === 'orbit') this.observationYaw += Math.min(0.05, Math.max(0, realDt)) * 0.32;
    return {
      mode: 'observe',
      style: this.observationStyle === 'track' ? 'track' : 'frame',
      center: state.center,
      velocity: state.velocity,
      radiusMeters: state.radiusMeters,
      yaw: this.observationYaw,
      pitch: this.observationPitch,
      label: state.label,
    };
  }

  enterObservation(style = 'frame') {
    const field = this.selectedExperiment ?? this.particleExperiments.newestField;
    if (!field) { this.hud.notify('Spawn or select a particle experiment first.'); return; }
    this.selectExperiment(field.id, false);
    this.cameraMode = 'observe';
    this.observationStyle = ['frame', 'track', 'orbit'].includes(style) ? style : 'frame';
    if (style === 'frame') { this.observationYaw = 0.55; this.observationPitch = 0.22; }
    this._nextObservationRefreshAt = 0;
    const state = this.refreshObservationState(performance.now(), true);
    this.hud.setCamera('observe', field.label, this.observationStyle, state);
    const quickReturn = this.root.querySelector('#approachButton');
    if (quickReturn) quickReturn.textContent = 'SHIP VIEW';
    this.hud.toggleLab(false);
    this.hud.notify(`OBSERVE: ${field.label}. Camera reposition only — the spacecraft and experiment physics are untouched. Drag LOOK to orbit; SHIP VIEW returns instantly.`);
  }

  returnToShipView(notify = true) {
    this.cameraMode = 'ship';
    this._observationState = null;
    this.hud?.setCamera('ship', null, null, null);
    const approach = this.root?.querySelector?.('#approachButton');
    if (approach) approach.textContent = this.navigationMode === 'approach' ? (this.navigationStatus?.phase === 'holding' ? 'HOLDING' : 'APPROACH ON') : 'APPROACH';
    if (notify) this.hud.notify('SHIP VIEW restored. Observation camera never moved the spacecraft.');
  }

  rendezvousExperiment() {
    const field = this.selectedExperiment ?? this.particleExperiments.newestField;
    if (!field) { this.hud.notify('Spawn or select a particle experiment first.'); return; }
    this.selectExperiment(field.id, false);
    this.returnToShipView(false);
    this.navigationExperimentId = field.id;
    this.setNavigationMode('approach');
    this.hud.toggleLab(false);
    this.hud.notify(`RENDEZVOUS engaged toward ${field.label}. This one moves the real ship with bounded thrust and target-relative braking.`);
  }

  predictionHorizonSeconds() {
    return Math.max(60, safeNumber(this.root.querySelector('#trajectoryHorizon').value, PHYSICS.DAY));
  }

  asteroidParams() {
    return {
      material: this.root.querySelector('#asteroidMaterial').value,
      densityKgM3: this.root.querySelector('#asteroidDensity').value,
      massKg: this.root.querySelector('#asteroidMass').value,
      speedMps: this.root.querySelector('#asteroidSpeed').value,
    };
  }

  updateAsteroidDerived() {
    const params = this.asteroidParams();
    const preset = MATERIALS[params.material] ?? MATERIALS.basalt;
    const density = Math.max(100, Math.min(safeNumber(params.densityKgM3, preset.densityKgM3), 30_000));
    const mass = Math.max(1e8, Math.min(safeNumber(params.massKg, 1e15), 1e24));
    const radius = sphereRadiusFromMassDensity(mass, density);
    this.root.querySelector('#asteroidRadius').textContent = formatRadiusMeters(radius);
    if (this.launchPreviewEnabled) this.invalidatePredictions();
  }

  invalidatePredictions() {
    this.nextPredictionAt = 0;
  }

  refreshPredictions(now = performance.now(), force = false) {
    if (!force && now < this.nextPredictionAt) return;
    if (!this.shipPathEnabled && !this.launchPreviewEnabled && !this.targetId) {
      this.predictionMs = 0;
      return;
    }
    const start = performance.now();
    const horizon = this.predictionHorizonSeconds();
    const targetId = this.targetId;

    if (this.shipPathEnabled || this.targetId) {
      this.shipPrediction = this.trajectoryPredictor.predict({
        mass: this.ship.mass,
        radius: 3,
        position: this.ship.position,
        velocity: this.ship.velocity,
      }, this.massiveBodies, horizon, SIMULATION.trajectoryMaxSamples, targetId);
      if (this.shipPathEnabled) this.renderer.setTrajectory('ship', this.shipPrediction.points, 0x62e6ff, 0.82);
      else this.renderer.clearTrajectory('ship');
    } else {
      this.shipPrediction = null;
      this.renderer.clearTrajectory('ship');
    }

    if (this.launchPreviewEnabled) {
      const preview = asteroidDefinitionFromParams(this, this.asteroidParams());
      this.launchPrediction = this.trajectoryPredictor.predict(preview, this.massiveBodies, horizon, SIMULATION.trajectoryMaxSamples, targetId);
      this.renderer.setTrajectory('launch', this.launchPrediction.points, 0xffb55c, 0.9);
      const impact = this.launchPrediction.impact;
      this.root.querySelector('#launchPrediction').textContent = impact
        ? `Predicted contact: ${impact.bodyName} in ${(impact.timeSeconds / 3600).toFixed(2)} h at ${(impact.relativeSpeedMps / 1000).toFixed(3)} km/s.`
        : `No finite-radius contact in ${(horizon / 3600).toFixed(2)} h. Closest sampled body: ${this.launchPrediction.closest?.bodyName ?? '—'}.`;
    } else {
      this.launchPrediction = null;
      this.renderer.clearTrajectory('launch');
      this.root.querySelector('#launchPrediction').textContent = 'Launch preview off.';
    }

    this.predictionMs = performance.now() - start;
    this.nextPredictionAt = now + SIMULATION.trajectoryRefreshRealSeconds * 1000;
    this.updateTargetTelemetry();
  }

  updateTargetTelemetry() {
    const target = this.target;
    if (!target) { this.hud.setTarget(null, null); return; }
    const metrics = osculatingMetrics(this.ship.position, this.ship.velocity, target);
    this.hud.setTarget(target, metrics, this.shipPrediction);
  }

  engineAcceleration() {
    return this.ship.currentMainAcceleration();
  }

  cancelNavigation(message = null) {
    const wasAutomatic = this.navigationMode !== 'manual';
    this.navigationMode = 'manual';
    this.navigationStatus = null;
    this._lastNavigationPhase = null;
    this.ship.clearNavigationAcceleration();
    if (wasAutomatic) {
      this.clock.setTimeScale(1);
      const select = this.root.querySelector('#timeScale');
      if (select) select.value = '1';
    }
    const button = this.root.querySelector('#approachButton');
    if (button) button.textContent = 'APPROACH';
    const matchButton = this.root.querySelector('#matchVelocity');
    if (matchButton) matchButton.textContent = 'MATCH VELOCITY';
    const warpButton = this.root.querySelector('#warpQuick');
    if (warpButton) warpButton.textContent = `WARP ${this.clock.timeScale.toLocaleString()}×`;
    if (message) this.hud.notify(message);
  }


  finishNavigation(message) {
    this.clock.setTimeScale(1);
    const select = this.root.querySelector('#timeScale');
    if (select) select.value = '1';
    const warpButton = this.root.querySelector('#warpQuick');
    if (warpButton) warpButton.textContent = 'WARP 1×';
    this.cancelNavigation(message);
  }

  setNavigationMode(mode) {
    const navTarget = this.navigationTarget;
    if (mode !== 'manual' && !navTarget) { this.hud.notify('Select a celestial target or particle experiment first.'); return; }
    if (mode === 'manual') { this.cancelNavigation(); return; }
    this.ship.throttle = 0;
    this.ship.reverseThrottle = 0;
    this.ship.braking = false;
    this.ship.clearNavigationAcceleration();
    this.navigationMode = mode;
    this.root.querySelector('#approachButton').textContent = mode === 'approach' ? 'APPROACH ON' : 'APPROACH';
    this.root.querySelector('#matchVelocity').textContent = mode === 'match' ? 'MATCHING…' : 'MATCH VELOCITY';
    if (mode === 'approach') this.hud.notify(`Approach computer engaged toward ${navTarget.name}. Uses real thrust and braking; no teleportation.`);
    if (mode === 'match') this.hud.notify(`Matching velocity with ${navTarget.name} using bounded physical thrust.`);
  }

  updateNavigation(dt) {
    this.ship.clearNavigationAcceleration();
    const maxAccel = this.engineAcceleration();
    if (this.ship.braking) {
      const command = computeAbsoluteBrakeAcceleration(this.ship, maxAccel, dt);
      this.ship.setNavigationAcceleration(command.acceleration);
      this.navigationStatus = { mode: 'brake', phase: command.complete ? 'stopped' : 'braking', relativeSpeedMps: command.speedMps };
      return;
    }
    const target = this.navigationTarget;
    if (!target || this.navigationMode === 'manual') { this.navigationStatus = null; this._lastNavigationPhase = null; return; }
    if (this.navigationMode === 'match') {
      const command = computeMatchVelocityAcceleration(this.ship, target, maxAccel, dt);
      this.ship.setNavigationAcceleration(command.acceleration);
      this.navigationStatus = { mode: 'match', phase: command.complete ? 'matched' : 'matching', ...command.state };
      if (command.complete) this.finishNavigation('Target-relative velocity matched. Navigation returned to 1×.');
      return;
    }
    const command = computeApproachAcceleration(this.ship, target, maxAccel, dt);
    this.ship.setNavigationAcceleration(command.acceleration);
    this.navigationStatus = { mode: 'approach', ...command, ...command.state };
    const approachButton = this.root.querySelector('#approachButton');
    if (approachButton && this.cameraMode !== 'observe') approachButton.textContent = command.phase === 'holding' ? 'HOLDING' : command.phase === 'capture' ? 'CAPTURE' : 'APPROACH ON';
    if (command.phase === 'holding' && this._lastNavigationPhase !== 'holding') {
      this.clock.setTimeScale(1);
      const select = this.root.querySelector('#timeScale');
      if (select) select.value = '1';
      const warpButton = this.root.querySelector('#warpQuick');
      if (warpButton) warpButton.textContent = 'AUTO 1×';
      this.hud.notify(`Station-keeping established near ${target.name}. APPROACH remains engaged and is using real thrust to hold target-relative position. Manual input releases HOLD.`);
    }
    this._lastNavigationPhase = command.phase;
  }

  enforceNavigationWarpSafety() {
    const navTarget = this.navigationTarget;
    if (this.navigationMode === 'manual' || !navTarget) return;
    const state = targetRelativeState(this.ship, navTarget);
    const maxAccel = this.engineAcceleration();
    const desiredWarp = recommendedWarpCap({
      mode: this.navigationMode,
      targetState: state,
      targetRadius: navTarget.radius,
      standOffDistanceMeters: this.navigationStatus?.standOffDistance ?? null,
      phase: this.navigationStatus?.phase ?? null,
      targetGravityMps2: this.navigationStatus?.targetGravityMps2 ?? 0,
      maxAccelerationMps2: maxAccel,
    });
    const particleCap = this.particleExperiments.activeCount ? this.particleExperiments.recommendedWarpCap : Infinity;
    const finalWarp = Math.min(desiredWarp, particleCap);
    if (!Number.isFinite(finalWarp) || this.clock.timeScale === finalWarp) return;
    this.clock.setTimeScale(finalWarp);
    const select = this.root.querySelector('#timeScale');
    if (![...select.options].some((option) => Number(option.value) === finalWarp)) {
      const option = document.createElement('option'); option.value = String(finalWarp); option.textContent = `${finalWarp.toLocaleString()}×`; select.appendChild(option);
    }
    select.value = String(finalWarp);
    this.root.querySelector('#warpQuick').textContent = `AUTO ${finalWarp.toLocaleString()}×`;
    const now = performance.now();
    if (now - this._lastWarpSafetyNotice > 1500) {
      this.hud.notify(`Navigation auto-warp ${finalWarp.toLocaleString()}×. Strong gravity, capture, and HOLD force smaller time steps instead of letting the trajectory numerically explode.`);
      this._lastWarpSafetyNotice = now;
    }
  }

  checkNewtonianModelLimit() {
    const limit = newtonianModelLimit(this.ship, this.massiveBodies, 0.1);
    if (!limit) { this._modelLimitLatched = false; return false; }
    if (!this._modelLimitLatched) {
      this._modelLimitLatched = true;
      this.running = false;
      this.clock.setTimeScale(1);
      this.cancelNavigation();
      const pause = this.root.querySelector('#pauseToggle');
      if (pause) pause.textContent = 'RESUME';
      if (limit.reason === 'speed') {
        this.hud.notify(`MODEL LIMIT: ship reached ${(limit.speedMps / 1000).toLocaleString(undefined,{maximumFractionDigits:0})} km/s (>10% c). Newtonian spacecraft integration is no longer scientifically adequate, so the simulation paused instead of allowing superluminal numerical runaway. Use HOME or reduce the state before resuming.`, 0);
      } else {
        this.hud.notify(`MODEL LIMIT: ${limit.body.name} is too close for this Newtonian black-hole model (${(limit.distanceMeters / Math.max(1, limit.body.radius)).toFixed(1)} Schwarzschild radii). Simulation paused before pretending this is valid GR.`, 0);
      }
    }
    return true;
  }

  currentPhysicsSubstepLimit() {
    return navigationPhysicsStepLimitSeconds(this.ship, this.massiveBodies, SIMULATION.maxPhysicsSubstepSeconds);
  }

  particleFieldParams() {
    return {
      mode: this.root.querySelector('#particleMode').value,
      count: this.root.querySelector('#particleCount').value,
      radiusMeters: safeNumber(this.root.querySelector('#particleRadiusKm').value, 5_000) * 1000,
      neighborRadiusMeters: safeNumber(this.root.querySelector('#particleNeighborKm').value, 500) * 1000,
      initialSpeedMps: this.root.querySelector('#particleSpeed').value,
      localStrengthMps2: this.root.querySelector('#particleStrength').value,
      majorGravity: this.root.querySelector('#particleMajorGravity').checked,
    };
  }

  updateParticleLabStatus() {
    const element = this.root.querySelector('#particleStatus');
    const select = this.root.querySelector('#experimentSelect');
    if (!element) return;
    const fields = this.particleExperiments.values;
    if (this.navigationExperimentId && !this.particleExperiments.fields.has(this.navigationExperimentId)) {
      this.cancelNavigation('Experiment rendezvous target expired or was cleared. Navigation returned to MANUAL at 1×.');
    }
    if (select) {
      const previous = this.selectedExperimentId;
      select.replaceChildren();
      if (!fields.length) {
        const option = document.createElement('option'); option.value = ''; option.textContent = 'No active experiment'; select.appendChild(option);
      } else {
        for (const field of fields) {
          const option = document.createElement('option'); option.value = field.id; option.textContent = field.label; select.appendChild(option);
        }
        if (!previous || !this.particleExperiments.fields.has(previous)) this.selectedExperimentId = fields[fields.length - 1].id;
        select.value = this.selectedExperimentId;
      }
    }
    const summaries = this.particleExperiments.summaries();
    if (!summaries.length) {
      element.textContent = 'No active particle experiments. Fields are session-local in v0.1.3.2.1 and are intentionally not written into schema-1 saves.';
      if (this.cameraMode === 'observe') this.returnToShipView(false);
      return;
    }
    const selectedState = this.particleExperiments.observationState(this.selectedExperimentId);
    let selectedText = '';
    if (selectedState) {
      const dx = selectedState.center[0] - this.ship.position[0], dy = selectedState.center[1] - this.ship.position[1], dz = selectedState.center[2] - this.ship.position[2];
      const dKm = Math.hypot(dx, dy, dz) / 1000;
      selectedText = `Selected ${selectedState.label}: ${(dKm).toLocaleString(undefined,{maximumFractionDigits:0})} km from ship · field radius ~${(selectedState.radiusMeters/1000).toLocaleString(undefined,{maximumFractionDigits:0})} km. `;
    }
    element.textContent = selectedText + summaries.map((s) => `${s.label}: ${s.activeCount.toLocaleString()}/${s.count.toLocaleString()} active${s.absorbedCount ? ` · ${s.absorbedCount.toLocaleString()} absorbed` : ''}${s.mode === 'life' ? ` · births ${s.births.toLocaleString()} · deaths ${s.deaths.toLocaleString()}` : ''}`).join(' | ');
  }

  applyImpactResolution(event) {
    if (!this.registry.has(event.a.id) || !this.registry.has(event.b.id)) return;
    event.timeSeconds ??= this.clock.elapsedSimSeconds;
    const activeImpactFragments = this.massiveBodies.filter((body) => body.isImpactFragment).length;
    const fragmentBudgetRemaining = Math.max(0, SIMULATION.impactResolvedFragmentLimit - activeImpactFragments);
    const secondaryImpact = (event.a.fragmentGenerationDepth ?? 0) > 0 || (event.b.fragmentGenerationDepth ?? 0) > 0;
    const maxGravityFragments = secondaryImpact ? 0 : Math.max(0, Math.min(SIMULATION.impactFragmentsPerEvent, fragmentBudgetRemaining, SIMULATION.directGravityBodyLimit - this.massiveBodies.length + 1));
    const resolution = resolveImpact(event, { maxGravityFragments, fragmentGraceSeconds: SIMULATION.impactFragmentGraceSeconds });
    const { analysis, classification, crater } = resolution;

    for (const id of resolution.deleteIds) this.registry.delete(id);
    for (const fragment of resolution.createBodies) {
      if (this.registry.size >= 10_000 || this.massiveBodies.length >= SIMULATION.directGravityBodyLimit) break;
      this.registry.create(fragment);
    }
    this.rebuildBodyCaches();
    this.renderer.syncBodies(this.bodies);
    this.invalidatePredictions();

    const contactPosition = resolution.targetDamageRecord?.contactPosition ?? [
      analysis.target.position[0] + analysis.contactNormal[0] * analysis.target.radius,
      analysis.target.position[1] + analysis.contactNormal[1] * analysis.target.radius,
      analysis.target.position[2] + analysis.contactNormal[2] * analysis.target.radius,
    ];
    this.renderer.addImpactEffect({
      position: contactPosition,
      normal: analysis.contactNormal,
      energyJ: analysis.centerOfMassEnergyJ,
      color: analysis.impactor.color ?? 0xffb05f,
    });
    this.hud.setImpactResolution(resolution);

    const craterText = crater ? ` · crater ≈ ${(crater.finalDiameterMeters / 1000).toFixed(2)} km × ${(crater.finalDepthMeters / 1000).toFixed(2)} km` : '';
    const fragmentText = resolution.createBodies.length ? ` · ${resolution.createBodies.length} resolved fragments` : '';
    this.hud.notify(`IMPACT ${classification.mode.toUpperCase()}: ${analysis.impactor.name} → ${analysis.target.name} · ${formatEnergy(analysis.centerOfMassEnergyJ)} · ${analysis.impactAngleDegrees.toFixed(1)}°${craterText}${fragmentText}.`, 7600);

    if (this.targetId && !this.registry.has(this.targetId)) this.selectTarget(analysis.target.id);
  }

  physicsStep(dt) {
    const sources = this.massiveBodies;
    const previousPositions = new Map(sources.map((body) => [body.id, new Float64Array(body.position)]));
    this.integrator.step(sources, dt);
    this.updateNavigation(dt);
    this.ship.step(dt, sources);
    if (this.checkNewtonianModelLimit()) return false;
    this.minorField?.step(dt, sources);
    const experimentStart = performance.now();
    this.particleExperiments.step(dt, sources);
    this.experimentMs += performance.now() - experimentStart;

    const collisions = this.collisionMonitor.scan(sources, previousPositions, this.clock.elapsedSimSeconds + dt);
    for (const event of collisions) {
      event.timeSeconds = this.clock.elapsedSimSeconds + dt * (event.stepFraction ?? 1);
      this.applyImpactResolution(event);
    }

    let currentContact = null;
    for (const body of sources) {
      const dx = body.position[0] - this.ship.position[0];
      const dy = body.position[1] - this.ship.position[1];
      const dz = body.position[2] - this.ship.position[2];
      if (dx * dx + dy * dy + dz * dz <= body.radius * body.radius) { currentContact = body; break; }
    }
    if (currentContact?.id !== this.shipContactId) {
      this.shipContactId = currentContact?.id ?? null;
      if (currentContact) {
        const metrics = osculatingMetrics(this.ship.position, this.ship.velocity, currentContact);
        this.hud.notify(`SHIP CONTACT: ${currentContact.name} at ${Math.abs(metrics?.relativeSpeedMps ?? 0).toFixed(1)} m/s relative speed. Spacecraft structural crash response is a later local rigid-body module; v0.1.2 resolves celestial-body impacts only.`);
      }
    }
    return true;
  }

  frame(now) {
    const realDt = Math.min(SIMULATION.maxFrameDeltaSeconds, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const physicsStart = performance.now();
    this.experimentMs = 0;
    this.enforceNavigationWarpSafety();
    this.enforceParticleWarpSafety();
    if (this.running) this.clock.advance(realDt, (dt) => this.physicsStep(dt), this.currentPhysicsSubstepLimit());
    this.physicsMs = performance.now() - physicsStart;
    if (this._rollDirection) { this.ship.rotateRoll(this._rollDirection * realDt * 1.4); this.invalidatePredictions(); }

    this.refreshPredictions(now);
    const renderStart = performance.now();
    const cameraView = this.currentCameraView(now, realDt);
    this.renderer.render({ bodies: this.bodies, ship: this.ship, referenceFrame: this.referenceFrame, minorField: this.minorField, particleExperiments: this.particleExperiments.values, cameraView });
    this.renderMs = performance.now() - renderStart;
    this.updateTargetTelemetry();
    this.hud.setNavigation(this.navigationStatus, this.navigationTarget, this.ship.engineMode, this.ship.currentMainAcceleration());
    if (this.cameraMode === 'observe') this.hud.setCamera('observe', this.selectedExperiment?.label ?? 'Experiment', this.observationStyle, this._observationState);
    if (now >= this._nextParticleStatusAt) { this.updateParticleLabStatus(); this._nextParticleStatusAt = now + 500; }

    this.fpsFrames += 1;
    if (now - this.fpsClock >= 500) {
      this.fps = (this.fpsFrames * 1000) / (now - this.fpsClock);
      this.fpsFrames = 0;
      this.fpsClock = now;
    }
    const renderStats = this.renderer.getStats();
    this.hud.update({
      fps: this.fps,
      elapsedSeconds: this.clock.elapsedSimSeconds,
      shipSpeed: Math.hypot(...this.ship.velocity),
      bodyCount: this.bodies.length,
      minorCount: this.minorField?.count ?? 0,
      physicsMs: this.physicsMs,
      renderMs: this.renderMs,
      predictionMs: this.predictionMs,
      drawCalls: renderStats.drawCalls,
      experimentParticles: this.particleExperiments.activeParticles,
      experimentMs: this.experimentMs,
    });
  }

  serialize() {
    return {
      seed: this.system.seed,
      elapsedSimSeconds: this.clock.elapsedSimSeconds,
      timeScale: this.clock.timeScale,
      ship: this.ship.serialize(),
      bodies: this.bodies.map(serializeBody),
      minorCount: this.minorField?.count ?? 0,
      userBodySerial: this.userBodySerial,
      targetId: this.targetId,
      shipPathEnabled: this.shipPathEnabled,
      trajectoryHorizon: this.predictionHorizonSeconds(),
      navigationMode: this.navigationMode,
    };
  }

  loadSave() {
    const payload = this.saveSystem.load();
    if (!payload?.seed || !Array.isArray(payload.bodies)) {
      this.hud.notify('No valid local save found.');
      return;
    }
    this.system = generateSystem(payload.seed);
    this.particleExperiments.clear();
    this.returnToShipView(false);
    this.selectedExperimentId = null;
    this.registry.clear();
    for (const raw of payload.bodies) this.registry.create(restoreBody(raw));
    this.rebuildBodyCaches();
    this.renderer.resetSystem(payload.seed);
    this.renderer.syncBodies(this.bodies);
    const star = this.registry.get('star-0') ?? this.bodies.find((b) => b.kind === BODY_KIND.STAR);
    this.minorField = new TestParticleField(payload.seed, star, payload.minorCount ?? SIMULATION.defaultMinorBodyCount);
    this.renderer.setMinorField(this.minorField);
    this.ship.restore(payload.ship);
    const engineModeButton = this.root.querySelector('#engineModeButton');
    if (engineModeButton) engineModeButton.textContent = this.ship.engineMode === 'cruise' ? 'ENGINE CRUISE' : 'ENGINE FLIGHT';
    const thrustButton = this.root.querySelector('#thrustButton');
    if (thrustButton) thrustButton.textContent = this.ship.engineMode === 'cruise' ? 'THRUST 120' : 'THRUST 20';
    this.clock.elapsedSimSeconds = safeNumber(payload.elapsedSimSeconds, 0);
    this.clock.setTimeScale(payload.timeScale ?? 60);
    const timeSelect = this.root.querySelector('#timeScale');
    if (![...timeSelect.options].some((option) => Number(option.value) === this.clock.timeScale)) {
      const option = document.createElement('option');
      option.value = String(this.clock.timeScale);
      option.textContent = `${this.clock.timeScale.toLocaleString()}×`;
      timeSelect.appendChild(option);
    }
    timeSelect.value = String(this.clock.timeScale);
    const warpButton = this.root.querySelector('#warpQuick');
    if (warpButton) warpButton.textContent = `WARP ${this.clock.timeScale.toLocaleString()}×`;
    this.root.querySelector('#minorCount').value = String(this.minorField.count);
    this.root.querySelector('#seedInput').value = payload.seed;
    if (payload.trajectoryHorizon) this.root.querySelector('#trajectoryHorizon').value = String(payload.trajectoryHorizon);
    this.userBodySerial = payload.userBodySerial ?? 1;
    const restoredHome = this.bodies.find((body) => body.kind === BODY_KIND.PLANET && body.landable) ?? this.registry.get(this.system.homeId) ?? this.bodies.find((body) => body.kind === BODY_KIND.PLANET);
    if (restoredHome) this.system.homeId = restoredHome.id;
    this.shipPathEnabled = payload.shipPathEnabled !== false;
    this.navigationMode = 'manual';
    this.ship.clearNavigationAcceleration();
    this.root.querySelector('#pathToggle').textContent = this.shipPathEnabled ? 'PATH ON' : 'PATH';
    this.hud.setSeed(payload.seed);
    this.selectTarget(payload.targetId && this.registry.has(payload.targetId) ? payload.targetId : this.system.homeId);
    this.invalidatePredictions();
    this.updateParticleLabStatus();
    this.hud.notify('Save restored. High-count minor field was deterministically regenerated; major-body and spacecraft state were snapshot-restored. Session-local particle experiments were cleared.');
  }

  bindUi() {
    const $ = (selector) => this.root.querySelector(selector);
    const updateWarpButton = () => { $('#warpQuick').textContent = `WARP ${this.clock.timeScale.toLocaleString()}×`; };
    $('#labToggle').addEventListener('click', () => this.hud.toggleLab());
    $('#moreToggle').addEventListener('click', () => this.hud.toggleMore());
    $('#moreClose').addEventListener('click', () => this.hud.toggleMore(false));
    $('#labClose').addEventListener('click', () => this.hud.toggleLab(false));
    $('#scienceToggle').addEventListener('click', () => { this.hud.toggleMore(false); this.hud.toggleScience(); });
    $('#scienceClose').addEventListener('click', () => this.hud.toggleScience(false));
    $('#scannerToggle').addEventListener('click', () => this.hud.toggleScanner());
    $('#scannerClose').addEventListener('click', () => this.hud.toggleScanner(false));
    $('#targetButton').addEventListener('click', () => this.selectReticleTarget());
    $('#approachButton').addEventListener('click', () => { if (this.cameraMode === 'observe') { this.returnToShipView(); return; } if (this.navigationMode !== 'approach') this.navigationExperimentId = null; this.setNavigationMode(this.navigationMode === 'approach' ? 'manual' : 'approach'); });
    $('#matchVelocity').addEventListener('click', () => { if (this.navigationMode !== 'match') this.navigationExperimentId = null; this.setNavigationMode(this.navigationMode === 'match' ? 'manual' : 'match'); });
    $('#engineModeButton').addEventListener('click', (event) => {
      this.ship.engineMode = this.ship.engineMode === 'cruise' ? 'flight' : 'cruise';
      event.currentTarget.textContent = this.ship.engineMode === 'cruise' ? 'ENGINE CRUISE' : 'ENGINE FLIGHT';
      this.root.querySelector('#thrustButton').textContent = this.ship.engineMode === 'cruise' ? 'THRUST 120' : 'THRUST 20';
      this.hud.notify(`${this.ship.engineMode === 'cruise' ? 'CRUISE' : 'FLIGHT'} propulsion selected: ${this.ship.currentMainAcceleration().toFixed(0)} m/s² maximum main acceleration.`);
    });
    $('#nextTarget').addEventListener('click', () => this.cycleTarget());
    $('#aimTarget').addEventListener('click', () => this.aimAtTarget());
    $('#regenerate').addEventListener('click', () => this.newSystem($('#seedInput').value));
    $('#randomSeed').addEventListener('click', () => this.newSystem(`SYS-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16).toUpperCase()}`));
    $('#timeScale').addEventListener('change', (e) => { this.clock.setTimeScale(e.target.value); updateWarpButton(); });
    $('#warpQuick').addEventListener('click', () => {
      const levels = [1, 60, 600, 3600];
      const current = this.clock.timeScale;
      const next = levels.find((value) => value > current) ?? levels[0];
      this.clock.setTimeScale(next);
      const select = $('#timeScale');
      if (![...select.options].some((option) => Number(option.value) === next)) {
        const option = document.createElement('option');
        option.value = String(next); option.textContent = `${next.toLocaleString()}×`; select.appendChild(option);
      }
      select.value = String(next);
      updateWarpButton();
      this.hud.notify(`Time warp ${next.toLocaleString()}×. Gravity and thrust are integrated over accelerated simulation time; this is not a visual speed cheat.`);
    });
    $('#trajectoryHorizon').addEventListener('change', () => this.invalidatePredictions());
    $('#minorCount').addEventListener('change', (e) => {
      this.minorField.setCount(e.target.value);
      this.renderer.setMinorField(this.minorField);
      this.hud.notify(`Minor test-particle field rebuilt: ${this.minorField.count.toLocaleString()} bodies. They feel major gravity but do not source it.`);
    });
    const updateParticleModeHelp = () => {
      const mode = PARTICLE_MODES[$('#particleMode').value] ?? PARTICLE_MODES.gravity;
      const countInput = $('#particleCount');
      countInput.max = String(mode.maxCount);
      if (Number(countInput.value) > mode.maxCount) countInput.value = String(mode.maxCount);
      $('#particleModeHelp').textContent = `${mode.scientificStatus} Current mobile-first mode limit: ${mode.maxCount.toLocaleString()} slots.`;
    };
    $('#particleMode').addEventListener('change', () => {
      updateParticleModeHelp();
      const mode = $('#particleMode').value;
      if (mode === 'life' || mode === 'species') { $('#particleRadiusKm').value = '2000'; $('#particleNeighborKm').value = '250'; }
      else { $('#particleRadiusKm').value = '10000'; $('#particleNeighborKm').value = '1000'; }
    });
    updateParticleModeHelp();
    $('#randomizeParticleRules').addEventListener('click', () => {
      const mode = $('#particleMode').value;
      if (mode === 'gravity') { this.hud.notify('Gravity Cloud uses physical major-body gravity; there are no artificial neighbor rules to randomize.'); return; }
      const randomized = this.particleExperiments.randomizeArtificialParams(`${this.system.seed}:${performance.now()}`);
      $('#particleNeighborKm').value = String(Math.max(100, Math.round(safeNumber($('#particleRadiusKm').value, 20_000) * randomized.neighborRadiusFactor)));
      $('#particleStrength').value = randomized.localStrengthMps2.toFixed(1);
      $('#particleSpeed').value = randomized.initialSpeedMps.toFixed(0);
      this.hud.notify('Artificial particle-rule parameters randomized. The rule family itself is unchanged and remains explicitly non-physical.');
    });
    $('#spawnParticleField').addEventListener('click', () => {
      try {
        const field = this.particleExperiments.spawnField(this, this.particleFieldParams());
        this.clock.setTimeScale(Math.min(this.clock.timeScale, this.particleExperiments.recommendedWarpCap));
        $('#timeScale').value = String(this.clock.timeScale); updateWarpButton();
        this.selectExperiment(field.id, false);
        this.updateParticleLabStatus();
        this.enterObservation('frame');
        this.hud.notify(`${field.label} spawned nearby and automatically framed: ${field.count.toLocaleString()} slots in a ${(field.radiusMeters / 1000).toLocaleString()} km region. OBSERVE moved only the camera. ${field.scientificStatus}`, 7000);
      } catch (error) { this.hud.notify(`Particle field rejected: ${error.message}`); }
    });
    $('#fireParticleGun').addEventListener('click', () => {
      try {
        const field = this.particleExperiments.fireGun(this, { count: $('#particleGunCount').value, speedMps: $('#particleGunSpeed').value, spreadDegrees: $('#particleGunSpread').value });
        this.clock.setTimeScale(Math.min(this.clock.timeScale, this.particleExperiments.recommendedWarpCap));
        $('#timeScale').value = String(this.clock.timeScale); updateWarpButton();
        this.selectExperiment(field.id, false);
        this.updateParticleLabStatus();
        this.hud.notify(`${field.label} fired: ${field.count.toLocaleString()} ballistic test particles at ${Number($('#particleGunSpeed').value).toLocaleString()} m/s. Use OBSERVE to follow the shot without moving the ship.`);
      } catch (error) { this.hud.notify(`Particle gun rejected: ${error.message}`); }
    });
    $('#clearParticleExperiments').addEventListener('click', () => {
      this.particleExperiments.clear();
      this.selectedExperimentId = null;
      if (this.navigationExperimentId) this.cancelNavigation();
      this.returnToShipView(false);
      this.updateParticleLabStatus();
      this.hud.notify('All session-local particle experiments cleared. Camera returned to SHIP VIEW.');
    });
    $('#experimentSelect').addEventListener('change', (event) => this.selectExperiment(event.target.value, false));
    $('#observeExperiment').addEventListener('click', () => this.enterObservation('frame'));
    $('#frameExperiment').addEventListener('click', () => this.enterObservation('frame'));
    $('#trackExperiment').addEventListener('click', () => this.enterObservation('track'));
    $('#orbitExperiment').addEventListener('click', () => this.enterObservation('orbit'));
    $('#nextExperiment').addEventListener('click', () => this.cycleExperiment());
    $('#shipViewButton').addEventListener('click', () => { this.hud.toggleLab(false); this.returnToShipView(); });
    $('#rendezvousExperiment').addEventListener('click', () => this.rendezvousExperiment());

    $('#pauseToggle').addEventListener('click', (e) => {
      this.hud.toggleMore(false);
      this.running = !this.running;
      e.currentTarget.textContent = this.running ? 'PAUSE' : 'RESUME';
      this.hud.notify(this.running ? 'Simulation resumed.' : 'Simulation paused.');
    });
    $('#saveButton').addEventListener('click', () => { this.hud.toggleMore(false); this.saveSystem.save(this.serialize()); this.hud.notify('Saved locally on this device.'); });
    $('#loadButton').addEventListener('click', () => { this.hud.toggleMore(false); this.loadSave(); });
    $('#homeButton').addEventListener('click', () => { this.hud.toggleMore(false); this.cancelNavigation(); this.placeShipNearHome(); this.selectTarget(this.system.homeId); this.hud.notify('Ship returned to the seeded orbital demonstration position with a prograde-biased pilot view.'); });
    $('#pathToggle').addEventListener('click', (event) => {
      this.shipPathEnabled = !this.shipPathEnabled;
      event.currentTarget.textContent = this.shipPathEnabled ? 'PATH ON' : 'PATH';
      if (!this.shipPathEnabled) this.renderer.clearTrajectory('ship');
      this.invalidatePredictions();
    });

    const updateMaterial = () => {
      const material = MATERIALS[$('#asteroidMaterial').value] ?? MATERIALS.basalt;
      $('#asteroidDensity').value = String(material.densityKgM3);
      this.updateAsteroidDerived();
    };
    $('#asteroidMaterial').addEventListener('change', updateMaterial);
    $('#asteroidDensity').addEventListener('input', () => this.updateAsteroidDerived());
    $('#asteroidMass').addEventListener('input', () => this.updateAsteroidDerived());
    $('#asteroidSpeed').addEventListener('input', () => this.invalidatePredictions());
    const impactPresets = {
      meteor: { material: 'basalt', mass: 1e9, density: 3000, speed: 12000 },
      tunguska: { material: 'porousRock', mass: 3.0e8, density: 1600, speed: 17000 },
      chicxulub: { material: 'basalt', mass: 1.0e15, density: 3000, speed: 20000 },
      moonlet: { material: 'basalt', mass: 1.0e20, density: 3200, speed: 10000 },
    };
    this.root.querySelectorAll('.impact-preset').forEach((button) => button.addEventListener('click', () => {
      const preset = impactPresets[button.dataset.preset];
      if (!preset) return;
      $('#asteroidMaterial').value = preset.material;
      $('#asteroidDensity').value = String(preset.density);
      $('#asteroidMass').value = String(preset.mass);
      $('#asteroidSpeed').value = String(preset.speed);
      this.updateAsteroidDerived();
      this.invalidatePredictions();
      this.hud.notify(`${button.textContent.trim()} preset loaded. Values are editable before launch.`);
    }));
    this.updateAsteroidDerived();
    updateWarpButton();

    $('#previewAsteroid').addEventListener('click', (event) => {
      this.launchPreviewEnabled = !this.launchPreviewEnabled;
      event.currentTarget.textContent = this.launchPreviewEnabled ? 'PREVIEW ON' : 'PREVIEW TRAJECTORY';
      if (!this.launchPreviewEnabled) this.renderer.clearTrajectory('launch');
      this.invalidatePredictions();
      this.refreshPredictions(performance.now(), true);
    });

    $('#spawnAsteroid').addEventListener('click', () => {
      try {
        const body = this.experiments.run('spawn-asteroid', this, this.asteroidParams());
        this.selectTarget(body.id);
        this.hud.notify(`${body.name} launched: ${(body.mass).toExponential(3)} kg, radius ${formatRadiusMeters(body.radius)}. Its live trajectory is mutually Newtonian.`);
      } catch (error) {
        this.hud.notify(`Launch rejected: ${error.message}`);
      }
    });
    $('#spawnBlackHole').addEventListener('click', () => {
      try {
        const body = this.experiments.run('spawn-black-hole', this, { solarMasses: $('#blackHoleMass').value });
        this.selectTarget(body.id);
        this.hud.notify(`${body.name} spawned. WARNING: live gravity is Newtonian; near-horizon GR is not implemented.`);
      } catch (error) {
        this.hud.notify(`Spawn rejected: ${error.message}`);
      }
    });

    // The simulator is an interactive surface, not a document. In particular, iOS Safari
    // otherwise starts text-selection/callout gestures during a sustained thruster press.
    const clearSelection = () => window.getSelection?.()?.removeAllRanges?.();
    const suppressGameGesture = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      event.preventDefault();
    };
    this.root.addEventListener('contextmenu', suppressGameGesture);
    this.root.addEventListener('selectstart', suppressGameGesture);
    this.root.addEventListener('dragstart', suppressGameGesture);

    const lookPad = $('#lookPad');
    lookPad.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      clearSelection();
      this._lookPointer = event.pointerId;
      this._lookLast = [event.clientX, event.clientY];
      lookPad.setPointerCapture?.(event.pointerId);
    });
    lookPad.addEventListener('pointermove', (event) => {
      if (this._lookPointer !== event.pointerId) return;
      event.preventDefault();
      const dx = event.clientX - this._lookLast[0];
      const dy = event.clientY - this._lookLast[1];
      this._lookLast = [event.clientX, event.clientY];
      if (this.cameraMode === 'observe') {
        this.observationYaw -= dx * 0.006;
        this.observationPitch = Math.max(-1.25, Math.min(1.25, this.observationPitch + dy * 0.0045));
        if (this.observationStyle === 'track') this.observationStyle = 'frame';
      } else {
        this.ship.rotateLook(-dx * 0.0045, dy * 0.0038);
        this.invalidatePredictions();
      }
    });
    const releaseLook = (event) => {
      if (event.pointerId === this._lookPointer) this._lookPointer = null;
    };
    lookPad.addEventListener('pointerup', releaseLook);
    lookPad.addEventListener('pointercancel', releaseLook);
    lookPad.addEventListener('lostpointercapture', releaseLook);

    const bindHold = (element, on, off) => {
      let activePointer = null;
      const release = (event = null, force = false) => {
        if (!force && event?.pointerId != null && activePointer !== null && event.pointerId !== activePointer) return;
        if (activePointer === null && !force) return;
        activePointer = null;
        element.classList.remove('is-held');
        element.setAttribute('aria-pressed', 'false');
        off();
        this.invalidatePredictions();
      };
      element.setAttribute('aria-pressed', 'false');
      element.addEventListener('pointerdown', (event) => {
        if (activePointer !== null) return;
        event.preventDefault();
        event.stopPropagation();
        clearSelection();
        activePointer = event.pointerId;
        element.classList.add('is-held');
        element.setAttribute('aria-pressed', 'true');
        try { element.setPointerCapture?.(event.pointerId); } catch (_) {}
        on();
        this.invalidatePredictions();
      });
      element.addEventListener('pointerup', (event) => { event.preventDefault(); release(event); });
      element.addEventListener('pointercancel', (event) => release(event));
      element.addEventListener('lostpointercapture', (event) => release(event));
      // Capture-phase document releases protect against WebKit occasionally transferring the
      // pointer away from a button during browser/chrome gesture arbitration.
      document.addEventListener('pointerup', (event) => release(event), true);
      document.addEventListener('pointercancel', (event) => release(event), true);
      window.addEventListener('blur', () => release(null, true));
      document.addEventListener('visibilitychange', () => { if (document.hidden) release(null, true); });
    };
    bindHold($('#thrustButton'), () => { this.returnToShipView(false); this.cancelNavigation(); this.ship.throttle = 1; }, () => { this.ship.throttle = 0; });
    bindHold($('#reverseButton'), () => { this.returnToShipView(false); this.cancelNavigation(); this.ship.reverseThrottle = 1; }, () => { this.ship.reverseThrottle = 0; });
    bindHold($('#brakeButton'), () => { this.returnToShipView(false); this.cancelNavigation(); this.ship.braking = true; }, () => { this.ship.braking = false; this.ship.clearNavigationAcceleration(); });
    bindHold($('#rcsLeft'), () => { this.cancelNavigation(); this.ship.strafe = -1; }, () => { if (this.ship.strafe < 0) this.ship.strafe = 0; });
    bindHold($('#rcsRight'), () => { this.cancelNavigation(); this.ship.strafe = 1; }, () => { if (this.ship.strafe > 0) this.ship.strafe = 0; });
    bindHold($('#rcsUp'), () => { this.cancelNavigation(); this.ship.lift = 1; }, () => { if (this.ship.lift > 0) this.ship.lift = 0; });
    bindHold($('#rcsDown'), () => { this.cancelNavigation(); this.ship.lift = -1; }, () => { if (this.ship.lift < 0) this.ship.lift = 0; });
    bindHold($('#rollLeft'), () => { this._rollDirection = -1; }, () => { if (this._rollDirection < 0) this._rollDirection = 0; });
    bindHold($('#rollRight'), () => { this._rollDirection = 1; }, () => { if (this._rollDirection > 0) this._rollDirection = 0; });
    $('#rcsToggle').addEventListener('click', () => { this.hud.toggleMore(false); $('#rcsPanel').hidden = !$('#rcsPanel').hidden; });

    const viewport = $('#viewport');
    viewport.addEventListener('pointerdown', (event) => { this._viewportTap = { id: event.pointerId, x: event.clientX, y: event.clientY }; });
    viewport.addEventListener('pointerup', (event) => {
      const tap = this._viewportTap;
      this._viewportTap = null;
      if (!tap || tap.id !== event.pointerId || Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 12) return;
      const id = this.renderer.pickBodyAt(event.clientX, event.clientY);
      if (id) this.selectTarget(id);
    });
    viewport.addEventListener('pointercancel', () => { this._viewportTap = null; });

    window.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === 'KeyW') { this.cancelNavigation(); this.ship.throttle = 1; }
      if (event.code === 'KeyX') { this.cancelNavigation(); this.ship.reverseThrottle = 1; }
      if (event.code === 'KeyS') { this.cancelNavigation(); this.ship.braking = true; }
      if (event.code === 'KeyA') this.ship.strafe = -1;
      if (event.code === 'KeyD') this.ship.strafe = 1;
      if (event.code === 'KeyR') this.ship.lift = 1;
      if (event.code === 'KeyF') this.ship.lift = -1;
      if (event.code === 'KeyQ') this._rollDirection = -1;
      if (event.code === 'KeyE') this._rollDirection = 1;
      if (event.code === 'ArrowLeft') this.ship.rotateLook(0.05, 0);
      if (event.code === 'ArrowRight') this.ship.rotateLook(-0.05, 0);
      if (event.code === 'ArrowUp') this.ship.rotateLook(0, -0.04);
      if (event.code === 'ArrowDown') this.ship.rotateLook(0, 0.04);
      if (event.code === 'KeyT') this.selectReticleTarget();
      if (event.code === 'KeyP') $('#pathToggle').click();
      this.invalidatePredictions();
    });
    window.addEventListener('keyup', (event) => {
      if (event.code === 'KeyW') this.ship.throttle = 0;
      if (event.code === 'KeyX') this.ship.reverseThrottle = 0;
      if (event.code === 'KeyS') this.ship.braking = false;
      if (event.code === 'KeyA' && this.ship.strafe < 0) this.ship.strafe = 0;
      if (event.code === 'KeyD' && this.ship.strafe > 0) this.ship.strafe = 0;
      if (event.code === 'KeyR' && this.ship.lift > 0) this.ship.lift = 0;
      if (event.code === 'KeyF' && this.ship.lift < 0) this.ship.lift = 0;
      if ((event.code === 'KeyQ' && this._rollDirection < 0) || (event.code === 'KeyE' && this._rollDirection > 0)) this._rollDirection = 0;
      this.invalidatePredictions();
    });
  }
}
