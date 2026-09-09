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
import { computeApproachAcceleration, computeMatchVelocityAcceleration, computeTurnAndBurnAcceleration, computeAbsoluteBrakeAcceleration, recommendedWarpCap, targetRelativeState, navigationPhysicsStepLimitSeconds, newtonianModelLimit } from '../physics/flightComputer.js';
import { formatEnergy } from '../physics/impactModel.js';
import { resolveImpact } from '../physics/impactResolver.js';
import { osculatingMetrics, angularAlignment } from '../physics/orbitalMetrics.js';
import { TrajectoryPredictor } from '../physics/trajectoryPredictor.js';
import { ExperimentRegistry } from '../experiments/experimentRegistry.js';
import { registerLabExperiments, MATERIALS, asteroidDefinitionFromParams, sphereRadiusFromMassDensity } from '../experiments/labSpawner.js';
import { ParticleExperimentManager, PARTICLE_MODES } from '../experiments/particles/particleExperimentManager.js';
import { CosmicPhenomenonRegistry } from '../cosmic/phenomenonRegistry.js';
import { SpaceWeatherManager } from '../cosmic/spaceWeather.js';
import { ANOMALY_REALITY_LABELS } from '../cosmic/anomalyGenerator.js';
import { TRANSIT_TIERS, normalizeTransitMultiple, transitArrivalDistanceMeters, transitClearanceCheck, firstTransitGuardHit, advanceTransitPosition } from '../physics/transitDrive.js';
import { UniverseRenderer } from '../render/threeRenderer.js';
import { Hud } from '../ui/hud.js';
import { SystemMapController } from '../ui/systemMap.js';
import { generateSurfaceRegion, availableSurfaceRegions, SURFACE_REALITY_LABELS, surfacePois } from '../surface/surfaceGenerator.js';
import { createSurfaceSession, serializeSurfaceSession, stepSurfaceMovement, nearestSurfacePoi, scanNearestSurfacePoi } from '../surface/surfaceSession.js';
import { SURFACE_PHASE, SURFACE_TRANSITION_SECONDS, createLandingTransition, beginLandingTransition, setLandingPhase, stepLandingTransition, transitionProgress, canEnterSurface, canWalkSurface, canRequestTakeoff, validateOrbitHandoff } from '../surface/landingTransition.js';
import { stepSurfaceWeather, surfaceWeatherReading } from '../surface/surfaceWeather.js';

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
    surfaceRegionId: body.surfaceRegionId,
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
    compactType: body.compactType,
    spinPeriodSeconds: body.spinPeriodSeconds,
    magneticFieldTesla: body.magneticFieldTesla,
    activeAccretion: body.activeAccretion,
    visualParticleCount: body.visualParticleCount,
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
    this.cosmicPhenomena = new CosmicPhenomenonRegistry();
    this.spaceWeather = new SpaceWeatherManager();
    this.scientificOverlays = { enabled: false, lagrange: true, hill: true, roche: true, gravity: false, orbitPlane: true };
    this.renderer = new UniverseRenderer(root.querySelector('#viewport'));
    this.systemMap = new SystemMapController(this, root);
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
    this._holdReleases = new Set();
    this._rollDirection = 0;
    this.navigationMode = 'manual';
    this.navigationStatus = null;
    this.navigationExperimentId = null;
    this._lastWarpSafetyNotice = 0;
    this._lastNavigationPhase = null;
    this.turnBurnDirection = null;
    this.transitState = { active: false, targetType: 'body', targetId: null, maxMultipleC: 100, autoCapture: true, previousTimeScale: 1, status: null };
    this._particleWarpRestoreScale = null;
    this._particleWarpCapActive = false;
    this._announcedExperimentCompletions = new Set();
    this._modelLimitLatched = false;
    this.cameraMode = 'ship';
    this.observationStyle = 'frame';
    this.observationYaw = 0;
    this.observationPitch = 0.18;
    this.selectedExperimentId = null;
    this.selectedPhenomenonId = null;
    this.navigationExperimentId = null;
    this.navigationPhenomenonId = null;
    this.observationSource = 'experiment';
    this.discoveredPhenomena = new Set();
    this.discoveryScanDepth = new Map();
    this._observationState = null;
    this._nextObservationRefreshAt = 0;
    this._nextSpaceWeatherPanelAt = 0;
    this._nextMapUpdateAt = 0;
    this.surfaceRegion = null;
    this.surfaceSession = null;
    this.surfaceTransition = createLandingTransition();
    this._surfaceRecoveryGuard = false;
    this._surfaceOrbitHandoffPending = null;
    this._ascentDiagnosticUntil = 0;
    this.surfaceInput = { forward: 0, strafe: 0, sprint: false };
    this._surfacePreviousRunning = true;
    this._surfacePreviousTimeScale = 1;
    this.selectedSurfaceRegionId = 'shatterfall-basin';
    this.cockpitEnabled = true;
  }

  get bodies() { return this.registry.values(); }
  get target() { return this.targetId ? this.registry.get(this.targetId) : null; }
  get selectedExperiment() { return this.selectedExperimentId ? this.particleExperiments.fields.get(this.selectedExperimentId) ?? null : null; }
  get selectedPhenomenon() { return this.selectedPhenomenonId ? this.cosmicPhenomena.get(this.selectedPhenomenonId) : null; }
  get navigationTarget() {
    if (this.navigationExperimentId) return this.experimentNavigationTarget(this.navigationExperimentId);
    if (this.navigationPhenomenonId) return this.phenomenonNavigationTarget(this.navigationPhenomenonId);
    return this.target;
  }

  rebuildBodyCaches() {
    this.massiveBodies = this.registry.values().filter((body) => body.gravitySource);
  }

  async init() {
    const backend = await this.renderer.init();
    this.hud.setRenderer(backend);
    this.bindUi();
    this.newSystem(this.root.querySelector('#seedInput').value || 'ORIGIN-001');
    this.updateCockpitUi();
    this.syncViewClasses();
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
    this.hud.notify('v0.1.4.5.3 online. Takeoff flight-recovery hotfix active: ascent now returns to an unmistakable prograde orbital view, force-restores live flight/input, clears held controls, and verifies multiple orbital frames before success. Build SHIPLAND-1453.');
  }

  newSystem(seed) {
    this.selectedSurfaceRegionId = 'shatterfall-basin';
    this._surfaceOrbitHandoffPending = null;
    if (this.surfaceSession?.active) this.exitSurface({ returnToOrbit: false, notify: false, preserveRunning: true });
    setLandingPhase(this.surfaceTransition, SURFACE_PHASE.ORBIT);
    this.running = true;
    if (this.transitState.active) this.disengageTransit({ notify: false, restoreWarp: false });
    this._particleWarpRestoreScale = null;
    this._particleWarpCapActive = false;
    this._announcedExperimentCompletions.clear();
    this.cancelNavigation();
    this.particleExperiments.clear();
    this.returnToShipView(false);
    this.selectedExperimentId = null;
    this.selectedPhenomenonId = null;
    this.navigationPhenomenonId = null;
    this.discoveredPhenomena.clear();
    this.discoveryScanDepth.clear();
    this.systemMap.selection = null;
    this.system = generateSystem(seed);
    this.cosmicPhenomena.reset(this.system.phenomena ?? []);
    this.spaceWeather.reset(this.system.seed, 0);
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
    this.selectPhenomenon(this.cosmicPhenomena.values[0]?.id ?? null, false);
    this.invalidatePredictions();
    this.hud.notify(`Generated ${this.system.starName} (${this.system.metadata.starSpectralClass}-class): ${this.system.metadata.planetCount} planets, ${this.system.metadata.moonCount} moons, ${this.system.metadata.cometCount ?? 0} comets, ${this.system.metadata.roguePlanetCount ?? 0} rogue planets, and ${this.system.metadata.anomalyCount ?? 0} seeded anomaly signals among ${this.system.metadata.phenomenonCount ?? 0} cosmic sources.`);
    this.updateSpaceWeatherPanel();
    this.updateOverlayPanel();
    this.updateCockpitUi();
    this.syncViewClasses();
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


  landingEligibility(body = this.target) {
    if (!body) return { ok: false, reason: 'Select a planetary target first.' };
    if (!canEnterSurface(this.surfaceTransition) || this.surfaceSession?.active) return { ok: false, reason: `Surface transition is ${this.surfaceTransition?.phase ?? 'active'}.` };
    if (body.kind !== BODY_KIND.PLANET || body.planetType === 'gas') return { ok: false, reason: 'This target has no solid landing foundation.' };
    if (!body.landable || body.surfaceProfile !== 'anomalous-showcase-v1') return { ok: false, reason: 'Detailed surface generation is not enabled for this world yet.' };
    if (this.transitState.active) return { ok: false, reason: 'Disengage TRANSIT before descent.' };
    if (this.particleExperiments.activeParticles > 0) return { ok: false, reason: 'Clear or finish the active particle experiment before changing into a local surface scene.' };
    const dx = this.ship.position[0] - body.position[0], dy = this.ship.position[1] - body.position[1], dz = this.ship.position[2] - body.position[2];
    const centerDistance = Math.hypot(dx, dy, dz);
    const altitude = centerDistance - body.radius;
    const relativeSpeed = Math.hypot(this.ship.velocity[0] - body.velocity[0], this.ship.velocity[1] - body.velocity[1], this.ship.velocity[2] - body.velocity[2]);
    if (altitude > body.radius * 6.5) return { ok: false, reason: `Move closer before descent. Current altitude is ${(altitude / 1e6).toFixed(1)} Mm; the first landing transition is available from near-orbital space.` };
    if (relativeSpeed > 80_000) return { ok: false, reason: `Relative speed ${(relativeSpeed / 1000).toFixed(1)} km/s is outside the scripted descent envelope. STOP RELATIVE first.` };
    return { ok: true, body, altitudeMeters: altitude, relativeSpeedMps: relativeSpeed };
  }

  updateSurfaceRegionUi(body = this.target) {
    const select = this.root.querySelector('#surfaceRegionSelect');
    const label = this.root.querySelector('#surfaceRegionLabel');
    if (!select) return;
    const bodyKey = body?.landable ? body.id : '';
    if (select.dataset.bodyId === bodyKey && select.options.length) {
      if ([...select.options].some((option) => option.value === this.selectedSurfaceRegionId)) select.value = this.selectedSurfaceRegionId;
      return;
    }
    const regions = body?.landable ? availableSurfaceRegions(this.system, body) : [];
    const previous = this.selectedSurfaceRegionId;
    select.replaceChildren();
    select.dataset.bodyId = bodyKey;
    if (!regions.length) {
      const option = document.createElement('option'); option.value = ''; option.textContent = 'No detailed surface regions'; select.appendChild(option);
      select.disabled = true; if (label) label.style.opacity = '0.55';
      return;
    }
    for (const region of regions) {
      const option = document.createElement('option'); option.value = region.id; option.textContent = `${region.name} — ${region.subtitle}`; select.appendChild(option);
    }
    this.selectedSurfaceRegionId = regions.some((region) => region.id === previous) ? previous : regions[0].id;
    select.value = this.selectedSurfaceRegionId;
    select.disabled = false; if (label) label.style.opacity = '1';
  }

  updateLandingUi() {
    this.updateSurfaceRegionUi(this.target);
    const eligibility = this.landingEligibility(this.target);
    for (const selector of ['#landTarget', '#surfaceLandButton']) {
      const button = this.root.querySelector(selector);
      if (!button) continue;
      button.disabled = !eligibility.ok;
      button.textContent = eligibility.ok ? 'LAND / DESCEND' : (this.target?.landable ? 'LAND LOCKED' : 'LAND TARGET');
      button.title = eligibility.ok ? `Enter ${this.selectedSurfaceRegionId || 'the selected seeded region'}.` : eligibility.reason;
    }
  }

  placeShipInSurfaceReturnOrbit(body) {
    if (!body) return;
    const distance = body.radius * 5;
    this.ship.position[0] = body.position[0];
    this.ship.position[1] = body.position[1] + distance;
    this.ship.position[2] = body.position[2];
    const orbital = Math.sqrt(PHYSICS.G * body.mass / distance);
    this.ship.velocity[0] = body.velocity[0] + orbital;
    this.ship.velocity[1] = body.velocity[1];
    this.ship.velocity[2] = body.velocity[2];
    this.ship.yaw = 0; this.ship.pitch = 0; this.ship.roll = 0;
    this.ship.throttle = 0; this.ship.reverseThrottle = 0; this.ship.strafe = 0; this.ship.lift = 0; this.ship.braking = false;
    this.ship.clearNavigationAcceleration();

    // The v0.1.4.5.2 return pose looked steeply back toward the planet, which could make a
    // successful orbital handoff look indistinguishable from a frozen surface view. Point the
    // ship along its actual body-relative prograde vector instead. This does not change the orbit;
    // it only makes the post-takeoff state visually and operationally unambiguous.
    const rvx = this.ship.velocity[0] - body.velocity[0];
    const rvy = this.ship.velocity[1] - body.velocity[1];
    const rvz = this.ship.velocity[2] - body.velocity[2];
    const relativeSpeed = Math.hypot(rvx, rvy, rvz) || 1;
    this.ship.lookAt(new Float64Array([
      this.ship.position[0] + (rvx / relativeSpeed) * distance,
      this.ship.position[1] + (rvy / relativeSpeed) * distance,
      this.ship.position[2] + (rvz / relativeSpeed) * distance,
    ]));
    this.shipContactId = null;
    this.invalidatePredictions();
  }

  surfaceShipDistanceMeters() {
    if (!this.surfaceSession?.active || !this.surfaceRegion) return Infinity;
    const site = this.surfaceRegion.landedShip ?? this.surfaceRegion.landing ?? { x: 0, z: 0 };
    return Math.hypot(this.surfaceSession.x - site.x, this.surfaceSession.z - site.z);
  }

  setSurfaceControlsEnabled(enabled) {
    const active = enabled === true;
    for (const selector of ['#surfaceForward','#surfaceBack','#surfaceLeft','#surfaceRight','#surfaceSprintButton','#surfaceScanButton']) {
      const button = this.root.querySelector(selector);
      if (button) button.disabled = !active;
    }
    const move = this.root.querySelector('#surfaceMovePad');
    if (move) move.classList.toggle('transition-locked', !active);
    if (!active) this.surfaceInput = { forward: 0, strafe: 0, sprint: false };
  }

  releaseAllHeldControls() {
    // WebKit can transfer/cancel a captured pointer while UI layers are being hidden. The old
    // bindHold closure would then still believe a pointer was active and ignore the next press.
    // Force every registered hold binding through its normal release path before changing modes.
    for (const release of this._holdReleases ?? []) {
      try { release(); } catch (error) { console.warn('Held-control release failed', error); }
    }
    this._lookPointer = null;
    this._viewportTap = null;
    this._rollDirection = 0;
    this.surfaceInput = { forward: 0, strafe: 0, sprint: false };
    this.ship.throttle = 0;
    this.ship.reverseThrottle = 0;
    this.ship.strafe = 0;
    this.ship.lift = 0;
    this.ship.braking = false;
    this.ship.clearNavigationAcceleration();
    for (const element of this.root.querySelectorAll('.is-held,[aria-pressed="true"]')) {
      element.classList.remove('is-held');
      if (element.hasAttribute('aria-pressed')) element.setAttribute('aria-pressed', 'false');
    }
    this.invalidatePredictions();
  }

  pilotControlsNeutral() {
    const nav = this.ship.navigationAcceleration;
    const navigationNeutral = !nav || (Math.abs(nav[0]) < 1e-12 && Math.abs(nav[1]) < 1e-12 && Math.abs(nav[2]) < 1e-12);
    return this._lookPointer === null
      && this._rollDirection === 0
      && this.ship.throttle === 0
      && this.ship.reverseThrottle === 0
      && this.ship.strafe === 0
      && this.ship.lift === 0
      && this.ship.braking === false
      && navigationNeutral
      && !this.root.querySelector('.is-held,[aria-pressed="true"]');
  }

  showAscentDiagnostic(text, holdMs = 0) {
    const chip = this.root.querySelector('#ascentDiagnostic');
    if (!chip) return;
    chip.textContent = text;
    chip.hidden = false;
    this._ascentDiagnosticUntil = holdMs > 0 ? performance.now() + holdMs : Infinity;
  }

  updateAscentDiagnosticVisibility(now = performance.now()) {
    if (this._surfaceOrbitHandoffPending) return;
    if (!(Number.isFinite(this._ascentDiagnosticUntil) && now >= this._ascentDiagnosticUntil)) return;
    const chip = this.root.querySelector('#ascentDiagnostic');
    if (chip) chip.hidden = true;
    this._ascentDiagnosticUntil = 0;
  }

  updateSurfaceTransitionUi() {
    const phase = this.surfaceTransition?.phase ?? SURFACE_PHASE.ORBIT;
    const takeoff = this.root.querySelector('#surfaceTakeoffButton');
    const phaseLabel = this.root.querySelector('#surfacePhase');
    const shipCompact = this.root.querySelector('#surfaceShipCompact');
    const shipDistance = this.surfaceShipDistanceMeters();
    const boardingRadius = 36;
    if (phaseLabel) phaseLabel.textContent = phase.toUpperCase();
    if (shipCompact) {
      if (!Number.isFinite(shipDistance)) shipCompact.textContent = 'SHIP —';
      else if (phase === SURFACE_PHASE.ASCENDING) shipCompact.textContent = 'SHIP ASCENDING';
      else if (phase === SURFACE_PHASE.DESCENDING) shipCompact.textContent = 'SHIP DESCENDING';
      else shipCompact.textContent = `SHIP ${shipDistance.toFixed(0)} m${shipDistance <= boardingRadius ? ' · BOARD' : ''}`;
    }
    const save = this.root.querySelector('#surfaceSaveButton');
    if (save) save.disabled = phase !== SURFACE_PHASE.LANDED;
    if (takeoff) {
      if (phase === SURFACE_PHASE.ASCENDING) {
        takeoff.disabled = true;
        takeoff.textContent = 'ASCENDING…';
      } else if (phase === SURFACE_PHASE.DESCENDING) {
        takeoff.disabled = true;
        takeoff.textContent = 'LANDING…';
      } else if (phase === SURFACE_PHASE.LANDED) {
        takeoff.disabled = !(shipDistance <= boardingRadius);
        takeoff.textContent = shipDistance <= boardingRadius ? 'BOARD / TAKEOFF' : `RETURN TO SHIP (${shipDistance.toFixed(0)} m)`;
      } else {
        takeoff.disabled = true;
        takeoff.textContent = 'TAKEOFF / ORBIT';
      }
    }
  }

  enterSurface(bodyId = this.targetId, options = {}) {
    const body = bodyId ? this.registry.get(bodyId) : null;
    if (!body) { this.hud.notify('Landing failed: target body is unavailable.'); return false; }
    if (!options.fromLoad && !canEnterSurface(this.surfaceTransition)) {
      this.hud.notify(`LANDING LOCKED: spacecraft transition is currently ${this.surfaceTransition.phase.toUpperCase()}.`);
      return false;
    }
    if (!options.fromLoad) {
      const eligibility = this.landingEligibility(body);
      if (!eligibility.ok) { this.hud.notify(`LANDING LOCKED: ${eligibility.reason}`); return false; }
    } else if (!body.landable || body.surfaceProfile !== 'anomalous-showcase-v1') {
      this.hud.notify('Saved surface session no longer matches a landable world in this build. Remaining in orbit.');
      return false;
    }

    this._surfaceOrbitHandoffPending = null;
    const previousRunning = this.running;
    const previousTimeScale = this.clock.timeScale;
    this._surfacePreviousRunning = previousRunning;
    this._surfacePreviousTimeScale = previousTimeScale;

    try {
      if (this.transitState.active) this.disengageTransit({ notify: false, restoreWarp: false });
      this.returnToShipView(false);
      this.cancelNavigation();
      this.releaseAllHeldControls();
      this.clock.setTimeScale(1);
      const timeSelect = this.root.querySelector('#timeScale'); if (timeSelect) timeSelect.value = '1';
      const warpButton = this.root.querySelector('#warpQuick'); if (warpButton) warpButton.textContent = 'SURFACE';
      this.running = false;

      const savedRegionId = options.snapshot?.regionId;
      const savedRegionKey = typeof savedRegionId === 'string' && savedRegionId.startsWith(`${body.id}:`) ? savedRegionId.slice(body.id.length + 1) : null;
      const regionKey = options.regionId ?? savedRegionKey ?? this.selectedSurfaceRegionId ?? body.surfaceRegionId ?? 'shatterfall-basin';
      this.surfaceRegion = generateSurfaceRegion(this.system, body, regionKey);
      this.selectedSurfaceRegionId = this.surfaceRegion.regionKey ?? regionKey;
      this.surfaceSession = createSurfaceSession(this.surfaceRegion, options.snapshot ?? null);
      this.surfaceInput = { forward: 0, strafe: 0, sprint: false };

      // Fresh landings deliberately face the parked spacecraft so the descent is visible.
      if (!options.fromLoad) {
        const site = this.surfaceRegion.landedShip ?? this.surfaceRegion.landing;
        if (site) this.surfaceSession.yaw = Math.atan2(site.x - this.surfaceSession.x, site.z - this.surfaceSession.z);
      }

      const star = this.registry.get('star-0') ?? this.bodies.find((entry) => entry.kind === BODY_KIND.STAR) ?? null;
      this.renderer.enterSurface(this.surfaceRegion, body, star);
      this.root.classList.add('surface-active');
      this.syncViewClasses();
      for (const id of ['morePanel','labPanel','scannerPanel','sciencePanel','cosmosPanel','overlayPanel','mapPanel','transitPanel']) {
        const panel = this.root.querySelector(`#${id}`); if (panel) panel.hidden = true;
      }
      const hud = this.root.querySelector('#surfaceHud'); if (hud) hud.hidden = false;
      const move = this.root.querySelector('#surfaceMovePad'); if (move) move.hidden = false;
      const velocity = this.root.querySelector('#velocityMarker'); if (velocity) velocity.hidden = true;
      this.setSurfaceHudExpanded(this.surfaceSession.hudExpanded === true, false);
      if (options.fromLoad) {
        setLandingPhase(this.surfaceTransition, SURFACE_PHASE.LANDED, { bodyId: body.id, regionId: this.surfaceRegion.id });
        this.setSurfaceControlsEnabled(true);
      } else {
        beginLandingTransition(this.surfaceTransition, SURFACE_PHASE.DESCENDING, { durationSeconds: SURFACE_TRANSITION_SECONDS.descent, bodyId: body.id, regionId: this.surfaceRegion.id });
        this.setSurfaceControlsEnabled(false);
      }
      this.selectTarget(body.id);
      this.updateSurfaceHud();
      this.updateSurfaceTransitionUi();
      if (options.notify !== false) this.hud.notify(options.fromLoad
        ? `SURFACE RESTORED: ${body.name} · ${this.surfaceRegion.name}. Local exploration resumed beside the parked spacecraft.`
        : `DESCENT: ${body.name} · ${this.surfaceRegion.name}. Scripted landing sequence engaged; controls unlock after touchdown. Orbital N-body time is held while the local surface instance is active.`, 6500);
      return true;
    } catch (error) {
      console.error('Surface entry failure', error);
      this.recoverSurfaceRuntime({ body, reason: `Landing transition failed: ${error?.message ?? error}`, restoreOrbit: false, previousRunning, previousTimeScale });
      return false;
    }
  }

  recoverSurfaceRuntime({ body = null, reason = 'Surface transition recovery.', restoreOrbit = true, previousRunning = this._surfacePreviousRunning, previousTimeScale = this._surfacePreviousTimeScale } = {}) {
    if (this._surfaceRecoveryGuard) return false;
    this._surfaceRecoveryGuard = true;
    this._surfaceOrbitHandoffPending = null;
    try {
      try { this.renderer.exitSurface(); } catch (error) { console.error('Surface renderer recovery cleanup failed', error); }
      this.surfaceSession = null;
      this.surfaceRegion = null;
      this.releaseAllHeldControls();
      this.root.classList.remove('surface-active');
      const hud = this.root.querySelector('#surfaceHud'); if (hud) hud.hidden = true;
      const move = this.root.querySelector('#surfaceMovePad'); if (move) move.hidden = true;
      if (restoreOrbit && body) {
        this.placeShipInSurfaceReturnOrbit(body);
        this.selectTarget(body.id);
        this.returnToShipView(false);
      }
      const scale = Math.max(1, Number(previousTimeScale) || 1);
      this.clock.setTimeScale(scale);
      const timeSelect = this.root.querySelector('#timeScale');
      if (timeSelect) {
        if (![...timeSelect.options].some((option) => Number(option.value) === scale)) {
          const option = document.createElement('option'); option.value = String(scale); option.textContent = `${scale.toLocaleString()}×`; timeSelect.appendChild(option);
        }
        timeSelect.value = String(scale);
      }
      const warpButton = this.root.querySelector('#warpQuick'); if (warpButton) warpButton.textContent = `WARP ${scale.toLocaleString()}×`;
      this.running = restoreOrbit ? true : previousRunning !== false;
      const pause = this.root.querySelector('#pauseToggle'); if (pause) pause.textContent = this.running ? 'PAUSE' : 'RESUME';
      setLandingPhase(this.surfaceTransition, SURFACE_PHASE.ORBIT);
      this.syncViewClasses();
      this.updateLandingUi();
      this.showAscentDiagnostic(`ORBIT RECOVERY · surface=OFF · render=SPACE · run=${this.running ? 'YES' : 'NO'} · input=${this.pilotControlsNeutral() ? 'YES' : 'NO'}`, 9000);
      this.hud.notify(`SURFACE RECOVERY: ${reason} Returned to a valid orbital state instead of leaving the simulation half-transitioned.`, 7600);
      return true;
    } finally {
      this._surfaceRecoveryGuard = false;
    }
  }

  exitSurface({ returnToOrbit = true, notify = true, preserveRunning = false } = {}) {
    if (!this.surfaceSession?.active && !this.surfaceRegion) {
      if (!this.renderer.surfaceWorld) setLandingPhase(this.surfaceTransition, SURFACE_PHASE.ORBIT);
      return false;
    }
    const bodyId = this.surfaceSession?.bodyId ?? this.surfaceRegion?.bodyId;
    const body = bodyId ? this.registry.get(bodyId) : null;

    // Keep the lifecycle in DESCENDING/LANDED/ASCENDING until every surface-owned subsystem
    // has been detached. ORBIT is the commit state, not the start of cleanup.
    this.setSurfaceControlsEnabled(false);
    this.releaseAllHeldControls();
    try { this.renderer.exitSurface(); } catch (error) { console.error('Surface renderer exit cleanup failed', error); }
    this.surfaceSession = null;
    this.surfaceRegion = null;
    this.surfaceInput = { forward: 0, strafe: 0, sprint: false };
    this.root.classList.remove('surface-active');
    const hud = this.root.querySelector('#surfaceHud'); if (hud) hud.hidden = true;
    const move = this.root.querySelector('#surfaceMovePad'); if (move) move.hidden = true;
    if (returnToOrbit && body) {
      this.cancelNavigation();
      this.placeShipInSurfaceReturnOrbit(body);
      this.selectTarget(body.id);
      this.returnToShipView(false);
      // A successful ascent always hands control back at 1×. The pre-surface orbital scale is
      // preserved in saves/recovery metadata, but is not re-applied automatically after landing.
      const restoreScale = 1;
      this.clock.setTimeScale(restoreScale);
      const timeSelect = this.root.querySelector('#timeScale'); if (timeSelect) timeSelect.value = '1';
      const warpButton = this.root.querySelector('#warpQuick'); if (warpButton) warpButton.textContent = 'WARP 1×';
    }
    // A completed takeoff must always return to an actively stepping flight loop. A pre-landing
    // pause should never masquerade as a post-takeoff freeze; the player can pause again manually.
    if (returnToOrbit) {
      this.running = true;
      this._surfacePreviousRunning = true;
      this._surfacePreviousTimeScale = 1;
    } else if (!preserveRunning) {
      this.running = false;
    }
    const pause = this.root.querySelector('#pauseToggle'); if (pause) pause.textContent = this.running ? 'PAUSE' : 'RESUME';

    // Commit ORBIT only after renderer/session/UI/camera/ship state has been detached/restored.
    setLandingPhase(this.surfaceTransition, SURFACE_PHASE.ORBIT);
    this.syncViewClasses();
    this.updateLandingUi();
    if (notify && returnToOrbit) this.hud.notify(`ORBIT RESTORED: spacecraft returned to a safe 5-radius orbit around ${body?.name ?? 'the landing world'}. Normal Newtonian flight is active again.`, 7000);
    return true;
  }

  requestSurfaceTakeoff() {
    if (!this.surfaceSession?.active || !this.surfaceRegion) { this.hud.notify('No active landed spacecraft session.'); return false; }
    if (!canRequestTakeoff(this.surfaceTransition)) { this.hud.notify(`TAKEOFF LOCKED: transition is ${this.surfaceTransition.phase.toUpperCase()}.`); return false; }
    const distance = this.surfaceShipDistanceMeters();
    const boardingRadius = 36;
    if (!(distance <= boardingRadius)) {
      this.hud.notify(`RETURN TO SHIP: you are ${distance.toFixed(0)} m from the spacecraft. Move within ${boardingRadius} m to board and take off.`);
      this.updateSurfaceTransitionUi();
      return false;
    }
    const shipSite = this.surfaceRegion.landedShip ?? this.surfaceRegion.landing;
    if (shipSite) {
      this.surfaceSession.yaw = Math.atan2(shipSite.x - this.surfaceSession.x, shipSite.z - this.surfaceSession.z);
      this.surfaceSession.pitch = 0.06;
    }
    this._surfaceOrbitHandoffPending = null;
    beginLandingTransition(this.surfaceTransition, SURFACE_PHASE.ASCENDING, {
      durationSeconds: SURFACE_TRANSITION_SECONDS.ascent,
      bodyId: this.surfaceSession.bodyId,
      regionId: this.surfaceRegion.id,
    });
    this.setSurfaceControlsEnabled(false);
    this.releaseAllHeldControls();
    this.setSurfaceHudExpanded(false, false);
    this.updateSurfaceTransitionUi();
    this.showAscentDiagnostic('ASCENT · surface=ON · render=SURFACE · run=HELD · input=LOCKED');
    this.hud.notify('BOARDING COMPLETE: ascent sequence engaged. VTOL thrusters are lifting the spacecraft clear of the landing site before orbital handoff.', 5200);
    return true;
  }

  surfaceOrbitHandoffStatus() {
    return validateOrbitHandoff({
      phase: this.surfaceTransition?.phase,
      sessionActive: Boolean(this.surfaceSession?.active),
      regionActive: Boolean(this.surfaceRegion),
      rendererSurfaceActive: Boolean(this.renderer.surfaceWorld),
      rootSurfaceActive: this.root.classList.contains('surface-active'),
      cameraMode: this.cameraMode,
      timeScale: this.clock.timeScale,
      running: this.running,
      pilotControlsNeutral: this.pilotControlsNeutral(),
      shipPosition: this.ship.position,
      shipVelocity: this.ship.velocity,
    });
  }

  completeSurfaceAscent() {
    const bodyId = this.surfaceSession?.bodyId ?? this.surfaceRegion?.bodyId;
    const body = bodyId ? this.registry.get(bodyId) : null;
    try {
      if (!body) throw new Error('Landing body was lost during ascent.');
      const exited = this.exitSurface({ returnToOrbit: true, notify: false });
      if (!exited) throw new Error('Surface session disappeared before orbital handoff could detach it.');
      const status = this.surfaceOrbitHandoffStatus();
      if (!status.ok) throw new Error(`Orbital handoff invariant failed: ${status.problems.join('; ')}`);

      // Do not announce success yet. The animation callback must successfully render one orbital
      // frame after the surface renderer is gone; this prevents a stale surface framebuffer with
      // the cockpit/UI already switched back to ORBIT.
      this._surfaceOrbitHandoffPending = {
        bodyId: body.id,
        bodyName: body.name,
        transitionSerial: this.surfaceTransition.serial,
        renderedFrames: 0,
        requiredFrames: 3,
      };
      this.showAscentDiagnostic('HANDOFF · surface=OFF · render=SPACE · run=YES · input=YES · frame=0/3');
      return true;
    } catch (error) {
      console.error('Surface ascent completion failure', error);
      this._surfaceOrbitHandoffPending = null;
      return this.recoverSurfaceRuntime({ body, reason: `Ascent handoff failed: ${error?.message ?? error}`, restoreOrbit: true });
    }
  }

  commitSurfaceOrbitHandoff() {
    const pending = this._surfaceOrbitHandoffPending;
    if (!pending) return false;
    const status = this.surfaceOrbitHandoffStatus();
    if (!status.ok) {
      const body = this.registry.get(pending.bodyId) ?? null;
      const reason = `Post-render orbital handoff invariant failed: ${status.problems.join('; ')}`;
      console.error(reason);
      this._surfaceOrbitHandoffPending = null;
      this.showAscentDiagnostic(`HANDOFF FAILED · ${status.problems.join(' · ')}`, 10000);
      // Never allow an invariant miss to escape into the animation-loop fault latch. Recover to
      // a clean, live 1× orbital state and keep the renderer alive for physical debugging.
      return this.recoverSurfaceRuntime({ body, reason, restoreOrbit: true, previousRunning: true, previousTimeScale: 1 });
    }
    pending.renderedFrames = (Number(pending.renderedFrames) || 0) + 1;
    const requiredFrames = Math.max(1, Number(pending.requiredFrames) || 3);
    this.showAscentDiagnostic(`VERIFY ORBIT · surface=OFF · render=SPACE · run=YES · input=YES · frame=${pending.renderedFrames}/${requiredFrames}`);
    if (pending.renderedFrames < requiredFrames) return false;
    this._surfaceOrbitHandoffPending = null;
    this.updateLandingUi();
    this.showAscentDiagnostic('ORBIT VERIFIED · surface=OFF · render=SPACE · run=YES · input=YES', 9000);
    this.hud.notify(`ASCENT COMPLETE: ${pending.bodyName} surface cleared, live flight controls are restored, and multiple orbital frames verified successfully. The ship is now facing prograde in safe orbit.`, 7200);
    return true;
  }

  updateSurface(realDt) {
    if (!this.surfaceSession?.active || !this.surfaceRegion) return;
    const step = stepLandingTransition(this.surfaceTransition, realDt);
    if (this.surfaceTransition.phase === SURFACE_PHASE.DESCENDING) {
      this.surfaceSession.lastMoveSpeedMps = 0;
      if (step.completed) {
        setLandingPhase(this.surfaceTransition, SURFACE_PHASE.LANDED, { bodyId: this.surfaceSession.bodyId, regionId: this.surfaceRegion.id });
        this.setSurfaceControlsEnabled(true);
        this.hud.notify(`TOUCHDOWN: ${this.surfaceRegion.name}. Surface controls unlocked; the spacecraft beacon remains active for return/boarding.`);
      }
    } else if (this.surfaceTransition.phase === SURFACE_PHASE.ASCENDING) {
      this.surfaceSession.lastMoveSpeedMps = 0;
      if (step.completed) {
        this.completeSurfaceAscent();
        return;
      }
    } else if (canWalkSurface(this.surfaceTransition)) {
      stepSurfaceMovement(this.surfaceSession, this.surfaceRegion, this.surfaceInput, realDt);
    }
    if (this.surfaceSession?.active && this.surfaceRegion) {
      stepSurfaceWeather(this.surfaceSession.weather, this.surfaceRegion, realDt);
      this.updateSurfaceHud();
      this.updateSurfaceTransitionUi();
    }
  }

  setSurfaceHudExpanded(expanded, notify = false) {
    const value = expanded === true;
    if (this.surfaceSession?.active) this.surfaceSession.hudExpanded = value;
    const hud = this.root.querySelector('#surfaceHud');
    const details = this.root.querySelector('#surfaceHudDetails');
    const toggle = this.root.querySelector('#surfaceHudToggle');
    if (hud) {
      hud.classList.toggle('expanded', value);
      hud.classList.toggle('compact', !value);
    }
    if (details) details.hidden = !value;
    if (toggle) {
      toggle.textContent = value ? 'HIDE' : 'DETAILS';
      toggle.setAttribute('aria-expanded', value ? 'true' : 'false');
    }
    if (notify) this.hud.notify(value ? 'Surface details expanded.' : 'Surface HUD collapsed to exploration view.');
    return value;
  }

  toggleSurfaceHud() {
    return this.setSurfaceHudExpanded(!(this.surfaceSession?.hudExpanded === true), false);
  }

  scanSurface() {
    if (!this.surfaceSession?.active || !this.surfaceRegion) { this.hud.notify('No active surface session.'); return false; }
    const result = scanNearestSurfacePoi(this.surfaceSession, this.surfaceRegion);
    if (!result.ok) { this.hud.notify(`SURFACE SCAN: ${result.reason}`); this.updateSurfaceHud(); return false; }
    const reality = SURFACE_REALITY_LABELS[result.poi.realityClass] ?? result.poi.realityClass.toUpperCase();
    this.hud.notify(`SURFACE DISCOVERY: ${result.poi.name} · ${reality}. ${result.poi.summary}`, 7600);
    this.updateSurfaceHud();
    return true;
  }

  updateSurfaceHud() {
    if (!this.surfaceSession?.active || !this.surfaceRegion) return;
    const region = this.surfaceRegion;
    const nearest = nearestSurfacePoi(this.surfaceSession, region);
    const set = (selector, text) => { const el = this.root.querySelector(selector); if (el) el.textContent = text; };
    set('#surfaceWorldName', `${region.bodyName} · ${region.name}`);
    set('#surfaceBiome', region.palette.name.toUpperCase());
    set('#surfaceGravity', `${region.gravityMps2.toFixed(2)} m/s²`);
    const weatherNow = surfaceWeatherReading(this.surfaceSession.weather);
    set('#surfaceTemperature', `${(region.temperatureK - 273.15 + weatherNow.temperatureOffsetC).toFixed(0)} °C`);
    set('#surfaceAtmosphere', `${region.atmosphereAtmProxy.toFixed(2)} atm PROXY`);
    set('#surfaceCoords', `${this.surfaceSession.x.toFixed(0)}, ${this.surfaceSession.z.toFixed(0)} m`);
    const weather = weatherNow;
    set('#surfaceWeather', `${weather.label.toUpperCase()}${weather.realityClass === 'impossible' ? ' ⚠' : ''}`);
    set('#surfaceWind', `${weather.windSpeedMps.toFixed(0)} m/s`);
    const shipSite = region.landedShip ?? region.landing;
    const shipDistance = Math.hypot(this.surfaceSession.x - shipSite.x, this.surfaceSession.z - shipSite.z);
    set('#surfaceShipDistance', `${shipDistance.toFixed(0)} m`);
    set('#surfaceClock', `${Math.floor(this.surfaceSession.weather?.elapsedSeconds ?? 0)} s`);
    set('#surfaceDiscoveries', `${this.surfaceSession.scannedPoiIds.size}/${surfacePois(region).length}`);
    const weatherStatus = this.root.querySelector('#surfaceWeatherStatus');
    if (weatherStatus) {
      const boundary = weather.realityClass === 'impossible' ? 'IMPOSSIBLE / VISUAL-ONLY' : weather.realityClass === 'speculative' ? 'SPECULATIVE WEATHER' : 'MODELED ENVIRONMENT';
      const timing = weather.type === 'clear' ? (Number.isFinite(weather.nextEventSeconds) ? `Next seeded change ~${weather.nextEventSeconds.toFixed(0)} s.` : 'Stable interval.') : `Event remaining ~${weather.secondsRemaining.toFixed(0)} s.`;
      weatherStatus.textContent = `${boundary} · ${weather.label} · wind ${weather.windSpeedMps.toFixed(0)} m/s. ${timing} Weather changes visibility/presentation only; no aerodynamic force or damage is applied.`;
    }
    if (nearest) {
      const scanned = this.surfaceSession.scannedPoiIds.has(nearest.poi.id);
      const reality = scanned ? (SURFACE_REALITY_LABELS[nearest.poi.realityClass] ?? nearest.poi.realityClass.toUpperCase()) : 'UNCLASSIFIED';
      set('#surfaceNearest', `${nearest.poi.name} · ${nearest.distanceMeters.toFixed(0)} m · ${reality}`);
    } else set('#surfaceNearest', 'No POI signal');
    const selected = surfacePois(region).find((poi) => poi.id === this.surfaceSession.selectedPoiId);
    const status = this.root.querySelector('#surfaceScanStatus');
    if (status) status.textContent = selected
      ? `${SURFACE_REALITY_LABELS[selected.realityClass] ?? selected.realityClass}: ${selected.signal}. ${selected.summary} ${selected.archive}`
      : `${region.name} mixes conventional terrain with ${region.anomalies?.length ?? 0} seeded anomaly sites. Surface weather and anomaly visuals are presentation/discovery layers only: no hidden gravity, teleportation, time manipulation or aerodynamic damage is applied.`;
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
    if (body && this.navigationMode === 'manual') { this.navigationExperimentId = null; this.navigationPhenomenonId = null; }
    this.renderer.setTarget(this.targetId);
    if (body) this.hud.notify(`Target locked: ${body.name}. Scanner uses two-body osculating telemetry plus N-body path prediction.`);
    this.invalidatePredictions();
    this.updateTargetTelemetry();
    this.updateTransitPanel();
    this.updateLandingUi();
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


  updateEngineUi() {
    const mode = this.ship.engineMode;
    const label = mode === 'boost' ? 'BOOST' : mode === 'cruise' ? 'CRUISE' : 'FLIGHT';
    const engineButton = this.root.querySelector('#engineModeButton');
    if (engineButton) engineButton.textContent = `ENGINE ${label}`;
    const thrustButton = this.root.querySelector('#thrustButton');
    if (thrustButton) thrustButton.textContent = `THRUST ${this.ship.currentMainAcceleration().toLocaleString()}`;
  }

  syncViewClasses() {
    this.root.classList.toggle('observe-active', this.cameraMode === 'observe');
    this.root.classList.toggle('surface-active', Boolean(this.surfaceSession?.active));
    const showCockpit = this.cockpitEnabled && this.cameraMode === 'ship' && !this.surfaceSession?.active;
    this.root.classList.toggle('ship-cockpit-enabled', showCockpit);
    this.root.classList.toggle('cockpit-hidden', !showCockpit);
  }

  updateCockpitUi() {
    const button = this.root.querySelector('#cockpitToggle');
    if (button) button.textContent = `COCKPIT ${this.cockpitEnabled ? 'ON' : 'OFF'}`;
    const status = this.root.querySelector('#cockpitStatus');
    if (status) status.textContent = this.cameraMode === 'observe' ? 'OBSERVE' : (this.ship.engineMode === 'boost' ? 'BOOST' : this.ship.engineMode === 'cruise' ? 'CRUISE' : 'CLEAR');
    this.syncViewClasses();
  }

  toggleCockpit(force = null) {
    this.cockpitEnabled = typeof force === 'boolean' ? force : !this.cockpitEnabled;
    this.updateCockpitUi();
    this.hud.notify(this.cockpitEnabled
      ? 'Cockpit canopy enabled. SHIP VIEW now shows a low-obstruction interior frame for scale and presence.'
      : 'Cockpit canopy hidden. SHIP VIEW returned to the unobstructed camera view.');
  }

  alignVelocityAttitude(sign = 1) {
    const speed = Math.hypot(...this.ship.velocity);
    if (speed < 0.5) { this.hud.notify('Velocity is too small to define a useful prograde/retrograde direction.'); return; }
    const direction = sign >= 0 ? 1 : -1;
    this.ship.lookAt(new Float64Array([
      this.ship.position[0] + this.ship.velocity[0] * direction,
      this.ship.position[1] + this.ship.velocity[1] * direction,
      this.ship.position[2] + this.ship.velocity[2] * direction,
    ]));
    this.invalidatePredictions();
    this.hud.notify(`${direction > 0 ? 'PROGRADE' : 'RETROGRADE'} attitude aligned to the current inertial velocity vector. Attitude changed; velocity did not.`);
  }

  engageTurnAndBurn() {
    if (this.transitState.active) this.disengageTransit({ notify: false, restoreWarp: false });
    const f = this.ship.forward(new Float64Array(3));
    this.turnBurnDirection = new Float64Array(f);
    this.navigationExperimentId = null;
    this.navigationPhenomenonId = null;
    this.setNavigationMode('turn-burn');
    this.hud.toggleMore(false);
    this.hud.notify(`TURN & BURN captured the current nose direction. The computer will cancel sideways velocity with bounded ${this.ship.engineMode.toUpperCase()} thrust until the real velocity vector follows the nose.`);
  }

  selectedTransitTarget() {
    const source = this.root.querySelector('#transitTargetSource')?.value ?? 'body';
    if (source === 'cosmic') {
      const target = this.phenomenonNavigationTarget(this.selectedPhenomenonId);
      return target ? { type: 'cosmic', id: this.selectedPhenomenonId, target } : null;
    }
    const target = this.target;
    return target ? { type: 'body', id: target.id, target } : null;
  }

  lockedTransitTarget() {
    if (!this.transitState.targetId) return null;
    if (this.transitState.targetType === 'cosmic') {
      const target = this.phenomenonNavigationTarget(this.transitState.targetId);
      return target ? { type: 'cosmic', id: this.transitState.targetId, target } : null;
    }
    const target = this.registry.get(this.transitState.targetId);
    return target ? { type: 'body', id: target.id, target } : null;
  }

  updateTransitPanel() {
    const panel = this.root.querySelector('#transitPanel');
    if (!panel) return;
    const locked = this.transitState.active ? this.lockedTransitTarget() : this.selectedTransitTarget();
    const target = locked?.target ?? null;
    const set = (id, text) => { const el = this.root.querySelector(id); if (el) el.textContent = text; };
    set('#transitTargetName', target?.name ?? '—');
    if (target) {
      const dx = target.position[0] - this.ship.position[0], dy = target.position[1] - this.ship.position[1], dz = target.position[2] - this.ship.position[2];
      const d = Math.hypot(dx, dy, dz);
      set('#transitDistance', d >= PHYSICS.AU * 0.01 ? `${(d / PHYSICS.AU).toFixed(4)} AU` : `${(d / 1e6).toLocaleString(undefined,{maximumFractionDigits:1})} Mm`);
      const rel = Math.hypot(this.ship.velocity[0] - target.velocity[0], this.ship.velocity[1] - target.velocity[1], this.ship.velocity[2] - target.velocity[2]);
      set('#transitLocalVelocity', rel >= 1000 ? `${(rel / 1000).toLocaleString(undefined,{maximumFractionDigits:2})} km/s` : `${rel.toFixed(1)} m/s`);
    } else {
      set('#transitDistance', '—'); set('#transitLocalVelocity', '—');
    }
    const status = this.transitState.status;
    set('#transitEffectiveSpeed', this.transitState.active && status ? `${status.multipleC.toLocaleString()} c` : '—');
    set('#transitEta', this.transitState.active && status?.speedMps > 0 ? `${Math.max(0, status.remainingMeters / status.speedMps).toFixed(1)} s` : '—');
    const engage = this.root.querySelector('#transitEngage');
    if (engage) engage.textContent = this.transitState.active ? 'DISENGAGE TRANSIT' : 'ENGAGE TRANSIT';
  }

  engageTransit() {
    if (this.transitState.active) { this.disengageTransit({ notify: true, restoreWarp: false, reason: 'TRANSIT disengaged at 1×. Local Newtonian velocity was preserved for safe manual control.' }); return; }
    const chosen = this.selectedTransitTarget();
    if (!chosen) { this.hud.notify('TRANSIT requires a current celestial TARGET or selected COSMOS source.'); return; }
    if (this.particleExperiments.activeParticles > 0) { this.hud.notify('TRANSIT blocked while a live local particle experiment is running. Clear or finish the experiment first so its fine-step physics is not skipped.'); return; }
    if (this.shipContactId) { this.hud.notify('TRANSIT blocked while the spacecraft is in finite-radius contact with a body.'); return; }
    const targetBodyId = chosen.type === 'body' ? chosen.id : (chosen.target.anchorBodyId ?? null);
    const clearance = transitClearanceCheck(this.ship.position, this.massiveBodies, targetBodyId);
    if (clearance) {
      this.hud.notify(`TRANSIT blocked: too close to ${clearance.body.name}. Move outside the ${(clearance.guardRadiusMeters / 1000).toLocaleString(undefined,{maximumFractionDigits:0})} km transit-clearance envelope first.`);
      return;
    }
    const arrival = transitArrivalDistanceMeters(this.ship, chosen.target, SIMULATION.shipBoostAcceleration);
    const dx = chosen.target.position[0] - this.ship.position[0], dy = chosen.target.position[1] - this.ship.position[1], dz = chosen.target.position[2] - this.ship.position[2];
    if (Math.hypot(dx, dy, dz) <= arrival) { this.hud.notify('Already inside the transit arrival envelope. Use BOOST + APPROACH / STOP RELATIVE for local maneuvering.'); return; }
    const previousTimeScale = this.clock.timeScale;
    this.returnToShipView(false);
    this.cancelNavigation();
    this.clock.setTimeScale(1);
    const timeSelect = this.root.querySelector('#timeScale'); if (timeSelect) timeSelect.value = '1';
    const multipleC = normalizeTransitMultiple(this.root.querySelector('#transitTier')?.value ?? 100);
    this.transitState = {
      active: true,
      targetType: chosen.type,
      targetId: chosen.id,
      maxMultipleC: multipleC,
      autoCapture: this.root.querySelector('#transitAutoCapture')?.checked !== false,
      previousTimeScale,
      status: null,
    };
    this.ship.transitVisualFactor = Math.min(1, Math.log10(Math.max(1, multipleC)) / 3);
    this.ship.transitVisualRelease = false;
    this.ship.transitDirection = new Float64Array(3);
    this.root.querySelector('#warpQuick').textContent = 'TRANSIT';
    this.hud.toggleTransit(false);
    this.hud.toggleMore(false);
    this.hud.notify(`SPECULATIVE TRANSIT engaged toward ${chosen.target.name} at up to ${multipleC.toLocaleString()} c. This translates the ship reference frame and does NOT add transit speed to the Newtonian velocity state.`);
    this.updateTransitPanel();
  }

  disengageTransit({ notify = true, restoreWarp = true, reason = null } = {}) {
    if (!this.transitState.active) return;
    const previous = this.transitState.previousTimeScale;
    this.transitState.active = false;
    this.transitState.status = null;
    // Keep the purely visual streak/FOV state for a short exponential release instead of
    // snapping it off on the arrival frame. Newtonian position/velocity remain untouched.
    this.ship.transitVisualRelease = (Number(this.ship.transitVisualFactor) || 0) > 0.001;
    if (!this.ship.transitVisualRelease) {
      this.ship.transitVisualFactor = 0;
      this.ship.transitDirection = null;
    }
    if (restoreWarp && this.navigationMode === 'manual' && !this.particleExperiments.hasActive) {
      this.clock.setTimeScale(previous || 1);
      const select = this.root.querySelector('#timeScale');
      if (select) {
        if (![...select.options].some((option) => Number(option.value) === this.clock.timeScale)) {
          const option = document.createElement('option'); option.value = String(this.clock.timeScale); option.textContent = `${this.clock.timeScale.toLocaleString()}×`; select.appendChild(option);
        }
        select.value = String(this.clock.timeScale);
      }
    }
    const warp = this.root.querySelector('#warpQuick'); if (warp) warp.textContent = `WARP ${this.clock.timeScale.toLocaleString()}×`;
    if (notify) this.hud.notify(reason ?? 'TRANSIT disengaged. Newtonian local velocity was preserved.');
    this.updateTransitPanel();
  }

  updateTransit(realDt) {
    if (!this.transitState.active) return;
    const locked = this.lockedTransitTarget();
    if (!locked) { this.disengageTransit({ notify: true, restoreWarp: false, reason: 'TRANSIT target disappeared; returned to normal flight at 1×.' }); return; }
    const target = locked.target;
    const arrivalDistance = transitArrivalDistanceMeters(this.ship, target, SIMULATION.shipBoostAcceleration);
    const start = new Float64Array(this.ship.position);
    const step = advanceTransitPosition(start, target.position, this.transitState.maxMultipleC, realDt, arrivalDistance);
    const targetBodyId = locked.type === 'body' ? locked.id : (locked.target.anchorBodyId ?? null);
    const hit = firstTransitGuardHit(start, step.nextPosition, this.massiveBodies, targetBodyId);
    if (hit) {
      const safeFraction = Math.max(0, hit.fraction - 0.002);
      this.ship.position[0] = start[0] + (step.nextPosition[0] - start[0]) * safeFraction;
      this.ship.position[1] = start[1] + (step.nextPosition[1] - start[1]) * safeFraction;
      this.ship.position[2] = start[2] + (step.nextPosition[2] - start[2]) * safeFraction;
      this.disengageTransit({ notify: true, restoreWarp: false, reason: `TRANSIT safety dropout before ${hit.body.name}. A swept clearance guard prevented the reference-frame path from crossing a massive body.` });
      return;
    }
    this.ship.position.set(step.nextPosition);
    const dx = target.position[0] - this.ship.position[0], dy = target.position[1] - this.ship.position[1], dz = target.position[2] - this.ship.position[2];
    const mag = Math.hypot(dx,dy,dz) || 1;
    this.ship.transitDirection[0] = dx / mag; this.ship.transitDirection[1] = dy / mag; this.ship.transitDirection[2] = dz / mag;
    this.ship.transitVisualFactor = Math.min(1, Math.log10(Math.max(1, step.multipleC)) / 3);
    this.transitState.status = { mode: 'transit', phase: 'transit', multipleC: step.multipleC, speedMps: step.speedMps, remainingMeters: step.remainingMeters, arrivalDistanceMeters: arrivalDistance, distanceMeters: step.distanceMeters };
    this.invalidatePredictions();
    if (step.arrived) {
      const autoCapture = this.transitState.autoCapture;
      const targetType = this.transitState.targetType;
      const targetId = this.transitState.targetId;
      const targetName = target.name;
      this.disengageTransit({ notify: false, restoreWarp: false });
      if (autoCapture) {
        this.ship.engineMode = 'boost';
        this.updateEngineUi();
        if (targetType === 'cosmic') { this.navigationExperimentId = null; this.navigationPhenomenonId = targetId; }
        else { this.navigationExperimentId = null; this.navigationPhenomenonId = null; this.selectTarget(targetId); }
        this.setNavigationMode('approach');
        this.hud.notify(`TRANSIT arrival envelope reached near ${targetName}. BOOST auto-capture is now removing the preserved local Δv with real bounded thrust; transit speed itself was not added to velocity.`);
      } else {
        this.hud.notify(`TRANSIT arrival envelope reached near ${targetName}. Local Newtonian velocity is unchanged; use STOP RELATIVE or BOOST APPROACH to capture.`);
      }
    }
    this.updateTransitPanel();
  }

  updateVelocityMarker() {
    const marker = this.root.querySelector('#velocityMarker');
    if (!marker) return;
    const speed = Math.hypot(...this.ship.velocity);
    if (this.cameraMode !== 'ship' || speed < 1) { marker.hidden = true; return; }
    const basis = this.ship.basis();
    const vx = this.ship.velocity[0] / speed, vy = this.ship.velocity[1] / speed, vz = this.ship.velocity[2] / speed;
    const x = vx * basis.right[0] + vy * basis.right[1] + vz * basis.right[2];
    const y = vx * basis.up[0] + vy * basis.up[1] + vz * basis.up[2];
    const z = vx * basis.forward[0] + vy * basis.forward[1] + vz * basis.forward[2];
    const yaw = Math.atan2(x, z);
    const pitch = Math.asin(Math.max(-1, Math.min(1, y)));
    const viewport = this.root.querySelector('#viewport')?.getBoundingClientRect();
    if (!viewport?.width || !viewport?.height) { marker.hidden = true; return; }
    const nx = Math.max(-1, Math.min(1, yaw / (Math.PI * 0.55)));
    const ny = Math.max(-1, Math.min(1, pitch / (Math.PI * 0.42)));
    marker.style.left = `${50 + nx * 43}%`;
    marker.style.top = `${50 - ny * 38}%`;
    marker.classList.toggle('behind', z < 0);
    marker.textContent = z < 0 ? 'V⃗ BACK' : 'V⃗';
    marker.hidden = false;
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
    if (!field && this.cameraMode === 'observe' && this.observationSource === 'experiment') this.returnToShipView(false);
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


  replaySelectedExperiment() {
    const field = this.selectedExperiment;
    if (!field) { this.hud.notify('Select an experiment to replay.'); return null; }
    const replay = this.particleExperiments.reset(field.id);
    if (!replay) return null;
    this._announcedExperimentCompletions.delete(replay.id);
    this.selectExperiment(replay.id, false);
    this._particleWarpRestoreScale = this.clock.timeScale > this.particleExperiments.recommendedWarpCap ? this.clock.timeScale : this._particleWarpRestoreScale;
    this.enforceParticleWarpSafety();
    this.enterObservation('frame');
    this.hud.notify(`${replay.label} replayed from its original deterministic initial state. FRAME follows the live particle bounds.`);
    return replay;
  }

  refreshObservationState(now = performance.now(), force = false) {
    if (this.cameraMode !== 'observe') return null;
    const selectedId = this.observationSource === 'cosmic' ? this.selectedPhenomenonId : this.selectedExperimentId;
    if (!force && now < this._nextObservationRefreshAt && this._observationState?.id === selectedId) return this._observationState;
    const state = this.observationSource === 'cosmic'
      ? this.phenomenonState(this.selectedPhenomenonId)
      : this.particleExperiments.observationState(this.selectedExperimentId);
    if (!state) { this.returnToShipView(false); return null; }
    this._observationState = state;
    this._nextObservationRefreshAt = now + (this.observationSource === 'cosmic' ? 300 : 180);
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
    this.observationSource = 'experiment';
    this.cameraMode = 'observe';
    const requestedStyle = ['frame', 'track', 'orbit'].includes(style) ? style : 'frame';
    this.observationStyle = field.isComplete ? 'frame' : requestedStyle;
    if (style === 'frame') { this.observationYaw = 0.55; this.observationPitch = 0.22; }
    this._nextObservationRefreshAt = 0;
    const state = this.refreshObservationState(performance.now(), true);
    this.hud.setCamera('observe', field.label, this.observationStyle, state);
    this.updateCockpitUi();
    const quickReturn = this.root.querySelector('#approachButton');
    if (quickReturn) quickReturn.textContent = 'SHIP VIEW';
    this.hud.toggleLab(false);
    this.hud.notify(field.isComplete ? `FINAL FRAME: ${field.label} is complete/extinct. Showing its last valid live bounds; TRACK/ORBIT no longer chase an empty centroid. Use REPLAY FIELD to run it again.` : `OBSERVE: ${field.label}. Camera reposition only — the spacecraft and experiment physics are untouched. Drag LOOK to orbit; SHIP VIEW returns instantly.`);
  }

  returnToShipView(notify = true) {
    this.cameraMode = 'ship';
    this._observationState = null;
    this.hud?.setCamera('ship', null, null, null);
    const approach = this.root?.querySelector?.('#approachButton');
    if (approach) approach.textContent = this.navigationMode === 'approach' ? (this.navigationStatus?.phase === 'holding' ? 'HOLDING' : 'APPROACH ON') : 'APPROACH';
    this.updateCockpitUi();
    if (notify) this.hud.notify('SHIP VIEW restored. Observation camera never moved the spacecraft.');
  }

  rendezvousExperiment() {
    const field = this.selectedExperiment ?? this.particleExperiments.newestField;
    if (!field) { this.hud.notify('Spawn or select a particle experiment first.'); return; }
    if (field.isComplete || field.activeCount <= 0) { this.hud.notify(`${field.label} is complete/extinct. REPLAY it before attempting a physical rendezvous.`); return; }
    this.selectExperiment(field.id, false);
    this.returnToShipView(false);
    this.navigationPhenomenonId = null;
    this.navigationExperimentId = field.id;
    this.setNavigationMode('approach');
    this.hud.toggleLab(false);
    this.hud.notify(`RENDEZVOUS engaged toward ${field.label}. This one moves the real ship with bounded thrust and target-relative braking.`);
  }

  phenomenonState(id = this.selectedPhenomenonId) {
    return this.cosmicPhenomena.state(id, (bodyId) => this.registry.get(bodyId));
  }

  phenomenonNavigationTarget(id = this.selectedPhenomenonId) {
    const state = this.phenomenonState(id);
    if (!state) return null;
    const anchor = state.anchorBodyId ? this.registry.get(state.anchorBodyId) : null;
    return {
      id: `phenomenon:${state.id}`,
      phenomenonId: state.id,
      anchorBodyId: state.anchorBodyId ?? null,
      name: state.label,
      kind: 'phenomenon',
      mass: anchor?.mass ?? 0,
      radius: Math.max(50_000, state.radiusMeters),
      position: state.center,
      velocity: state.velocity,
      gravitySource: false,
    };
  }

  selectPhenomenon(id, notify = true) {
    const phenomenon = id ? this.cosmicPhenomena.get(id) : null;
    this.selectedPhenomenonId = phenomenon?.id ?? null;
    const select = this.root.querySelector('#phenomenonSelect');
    if (select && phenomenon) select.value = phenomenon.id;
    if (!phenomenon && this.cameraMode === 'observe' && this.observationSource === 'cosmic') this.returnToShipView(false);
    this.updateCosmosPanel();
    if (notify && phenomenon) this.hud.notify(`Cosmic source selected: ${this.discoveredPhenomena.has(phenomenon.id) ? phenomenon.label : 'UNIDENTIFIED SOURCE'}. SCAN SOURCE reveals its generated classification and model status.`);
    return phenomenon;
  }

  cyclePhenomenon() {
    const items = this.cosmicPhenomena.values;
    if (!items.length) { this.hud.notify('No local cosmic phenomena generated in this seed.'); return null; }
    const index = items.findIndex((item) => item.id === this.selectedPhenomenonId);
    const item = items[(index + 1 + items.length) % items.length];
    this.selectPhenomenon(item.id);
    return item;
  }

  scanPhenomenon() {
    const phenomenon = this.selectedPhenomenon;
    if (!phenomenon) { this.hud.notify('Select a cosmic source first.'); return; }
    const previousDepth = this.discoveryScanDepth.get(phenomenon.id) ?? 0;
    const depth = Math.min(3, previousDepth + 1);
    this.discoveryScanDepth.set(phenomenon.id, depth);
    this.discoveredPhenomena.add(phenomenon.id);
    this.updateCosmosPanel();
    this.systemMap.updateSelectionText();
    this.systemMap.draw();
    if (depth === 1) {
      const reality = phenomenon.anomaly ? (ANOMALY_REALITY_LABELS[phenomenon.realityClass] ?? 'ANOMALOUS') : 'CATALOGUED COSMIC SOURCE';
      this.hud.notify(`DISCOVERY 1/3: ${phenomenon.label} · ${reality}. ${phenomenon.scanSummary ?? phenomenon.scientificStatus}`);
    } else if (depth === 2) {
      const signal = phenomenon.detectionClass ? ` Sensor signature: ${phenomenon.detectionClass}; stability: ${phenomenon.stability}.` : '';
      this.hud.notify(`DISCOVERY 2/3: ${phenomenon.label}.${signal} Deeper classification recorded.`);
    } else {
      this.hud.notify(`DISCOVERY COMPLETE 3/3: ${phenomenon.label}. ${phenomenon.scientificStatus}`);
    }
  }

  updateCosmosPanel() {
    const select = this.root.querySelector('#phenomenonSelect');
    if (!select) return;
    const items = this.cosmicPhenomena.values;
    const previous = this.selectedPhenomenonId;
    select.replaceChildren();
    if (!items.length) {
      const option = document.createElement('option'); option.value = ''; option.textContent = 'No local phenomena'; select.appendChild(option);
      this.selectedPhenomenonId = null;
    } else {
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        const option = document.createElement('option');
        option.value = item.id;
        const discovered = this.discoveredPhenomena.has(item.id);
        option.textContent = discovered ? `${item.anomaly ? '⚠ ' : ''}${item.label}` : `UNIDENTIFIED SIGNAL ${String(i + 1).padStart(2, '0')}`;
        select.appendChild(option);
      }
      if (!previous || !this.cosmicPhenomena.has(previous)) this.selectedPhenomenonId = items[0].id;
      select.value = this.selectedPhenomenonId;
    }

    const state = this.phenomenonState(this.selectedPhenomenonId);
    const discovered = state ? this.discoveredPhenomena.has(state.id) : false;
    const depth = state ? (this.discoveryScanDepth.get(state.id) ?? (discovered ? 1 : 0)) : 0;
    const setText = (id, text) => { const el = this.root.querySelector(id); if (el) el.textContent = text; };
    if (!state) {
      setText('#phenomenonDiscovery', '—'); setText('#phenomenonKind', '—'); setText('#phenomenonRadius', '—'); setText('#phenomenonAnchor', '—');
      setText('#phenomenonReality', '—'); setText('#phenomenonScanDepth', '0/3');
      const status = this.root.querySelector('#phenomenonStatus'); if (status) status.textContent = 'No local cosmic phenomenon selected.';
      return;
    }
    const anchor = state.anchorBodyId ? this.registry.get(state.anchorBodyId) : null;
    setText('#phenomenonDiscovery', discovered ? (depth >= 3 ? 'ARCHIVED' : 'CLASSIFIED') : 'UNIDENTIFIED');
    setText('#phenomenonKind', discovered ? state.kind : 'unknown');
    setText('#phenomenonRadius', discovered ? formatRadiusMeters(state.radiusMeters) : '—');
    setText('#phenomenonAnchor', discovered ? (anchor?.name ?? 'free-space') : '—');
    setText('#phenomenonReality', discovered ? (state.anomaly ? (ANOMALY_REALITY_LABELS[state.realityClass] ?? 'ANOMALOUS') : 'MODELED / CATALOGUED') : '—');
    setText('#phenomenonScanDepth', `${depth}/3`);
    const status = this.root.querySelector('#phenomenonStatus');
    if (status) {
      if (!discovered) status.textContent = 'Unclassified local signal. SCAN SOURCE reveals the first layer. Repeated scans deepen the record instead of instantly dumping every detail.';
      else if (depth === 1) status.textContent = `${state.label}: ${state.scanSummary ?? state.scientificStatus}`;
      else if (depth === 2) status.textContent = `${state.label}: ${state.scanSummary ?? state.scientificStatus}${state.detectionClass ? ` Signature: ${state.detectionClass}; stability: ${state.stability}.` : ''}`;
      else status.textContent = `${state.label}: ${state.scientificStatus}`;
    }
  }

  enterCosmicObservation(style = 'frame') {
    const phenomenon = this.selectedPhenomenon ?? this.cosmicPhenomena.values[0];
    if (!phenomenon) { this.hud.notify('No local cosmic phenomenon is available.'); return; }
    this.selectPhenomenon(phenomenon.id, false);
    this.observationSource = 'cosmic';
    this.cameraMode = 'observe';
    this.observationStyle = style === 'orbit' ? 'orbit' : 'frame';
    this.observationYaw = 0.58;
    this.observationPitch = 0.24;
    this._nextObservationRefreshAt = 0;
    const state = this.refreshObservationState(performance.now(), true);
    this.hud.setCamera('observe', this.discoveredPhenomena.has(phenomenon.id) ? phenomenon.label : 'UNIDENTIFIED SOURCE', this.observationStyle, state);
    this.updateCockpitUi();
    const quickReturn = this.root.querySelector('#approachButton');
    if (quickReturn) quickReturn.textContent = 'SHIP VIEW';
    this.hud.toggleCosmos(false);
    this.hud.notify(`COSMIC OBSERVE: camera framed ${this.discoveredPhenomena.has(phenomenon.id) ? phenomenon.label : 'the selected source'}. The camera is massless; the spacecraft did not teleport.`);
  }

  rendezvousPhenomenon() {
    const phenomenon = this.selectedPhenomenon;
    if (!phenomenon) { this.hud.notify('Select a cosmic source first.'); return; }
    this.returnToShipView(false);
    this.navigationExperimentId = null;
    this.navigationPhenomenonId = phenomenon.id;
    this.setNavigationMode('approach');
    this.hud.toggleCosmos(false);
    this.hud.notify(`COSMIC RENDEZVOUS engaged toward ${this.discoveredPhenomena.has(phenomenon.id) ? phenomenon.label : 'UNIDENTIFIED SOURCE'}. Physical ship thrust is used; no teleportation.`);
  }

  triggerSpaceWeather() {
    const star = this.bodies.find((body) => body.kind === BODY_KIND.STAR);
    if (!star) { this.hud.notify('No stellar source available for a CME.'); return null; }
    const event = this.spaceWeather.triggerCme(star, this.clock.elapsedSimSeconds);
    this.updateSpaceWeatherPanel();
    this.hud.notify(`SPACE WEATHER: ${event.label} launched at ${(event.speedMps / 1000).toFixed(0)} km/s with a ${(event.halfAngleRad * 180 / Math.PI).toFixed(0)}° half-angle cone. Propagation is kinematic; plasma/MHD is not solved.`);
    return event;
  }

  updateSpaceWeatherPanel() {
    const status = this.root.querySelector('#spaceWeatherStatus');
    const active = this.root.querySelector('#spaceWeatherActive');
    const next = this.root.querySelector('#spaceWeatherNext');
    const autoButton = this.root.querySelector('#autoWeatherToggle');
    if (autoButton) autoButton.textContent = `AUTO WEATHER ${this.spaceWeather.autoEnabled ? 'ON' : 'OFF'}`;
    const star = this.bodies.find((body) => body.kind === BODY_KIND.STAR);
    const states = star ? this.spaceWeather.states(star, this.clock.elapsedSimSeconds) : [];
    if (active) active.textContent = String(states.length);
    if (next) {
      const remain = Math.max(0, this.spaceWeather.nextAutoEventSeconds - this.clock.elapsedSimSeconds);
      next.textContent = this.spaceWeather.autoEnabled ? `${(remain / PHYSICS.DAY).toFixed(2)} d` : 'AUTO OFF';
    }
    if (status) status.textContent = states.length
      ? states.map((s) => `${s.label}: ${(s.radiusMeters / PHYSICS.AU).toFixed(3)} AU · ${(s.speedMps / 1000).toFixed(0)} km/s${s.hitShip ? ' · SHIP CROSSED FRONT' : ''}`).join(' | ')
      : 'No active CME fronts. AUTO WEATHER can seed events in simulated time, or TRIGGER CME launches one immediately.';
  }

  updateOverlayPanel() {
    const summary = this.root.querySelector('#overlayStatus');
    if (summary) summary.textContent = this.scientificOverlays.enabled
      ? `Target-centric overlay active: ${this.renderer.scientificOverlayHolder?.summary ?? 'updating…'}. Lagrange/Hill/Roche are approximate diagnostics; gravity vectors use the live Newtonian body set.`
      : 'Scientific overlays are off. Enable the master switch, then choose target-centric layers.';
    const master = this.root.querySelector('#overlayMaster'); if (master) master.checked = this.scientificOverlays.enabled;
    for (const key of ['lagrange','hill','roche','gravity','orbitPlane']) {
      const el = this.root.querySelector(`#overlay${key[0].toUpperCase()}${key.slice(1)}`); if (el) el.checked = Boolean(this.scientificOverlays[key]);
    }
  }

  setOverlaySetting(key, value) {
    if (key === 'enabled') this.scientificOverlays.enabled = Boolean(value);
    else if (Object.hasOwn(this.scientificOverlays, key)) this.scientificOverlays[key] = Boolean(value);
    this.renderer.invalidateScientificOverlays();
    this.updateOverlayPanel();
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
    if (this.transitState.active) { this.renderer.clearTrajectory('ship'); this.shipPrediction = null; this.predictionMs = 0; return; }
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
    if (!target) { this.hud.setTarget(null, null); this.updateLandingUi(); return; }
    const metrics = osculatingMetrics(this.ship.position, this.ship.velocity, target);
    this.hud.setTarget(target, metrics, this.shipPrediction);
    this.updateLandingUi();
  }

  manualPilotTakeover() {
    if (this.transitState.active) this.disengageTransit({ notify: false, restoreWarp: false });
    this.returnToShipView(false);
    this.cancelNavigation();
  }

  requestTimeScale(requestedValue, notify = true) {
    const requested = Math.max(1, safeNumber(requestedValue, 1));
    if (this.transitState.active) {
      this.clock.setTimeScale(1);
      const select = this.root.querySelector('#timeScale'); if (select) select.value = '1';
      const warp = this.root.querySelector('#warpQuick'); if (warp) warp.textContent = 'TRANSIT';
      if (notify) this.hud.notify('Simulation warp is locked to 1× while the speculative TRANSIT reference-frame drive is active. Transit speed is controlled separately.');
      return 1;
    }
    const cap = this.particleExperiments?.recommendedWarpCap ?? Infinity;
    let applied = requested;
    if (Number.isFinite(cap) && requested > cap) {
      this._particleWarpRestoreScale = requested;
      this._particleWarpCapActive = true;
      applied = cap;
      if (notify) this.hud.notify(`Live particle experiment requires ≤${cap.toLocaleString()}×. Requested ${requested.toLocaleString()}× is remembered and will restore automatically when the last live particle completes.`);
    } else if (Number.isFinite(cap)) {
      // A pilot-selected lower warp supersedes any older automatic restore request.
      this._particleWarpRestoreScale = null;
      this._particleWarpCapActive = true;
    }
    this.clock.setTimeScale(applied);
    const select = this.root.querySelector('#timeScale');
    if (select) {
      if (![...select.options].some((option) => Number(option.value) === applied)) {
        const option = document.createElement('option'); option.value = String(applied); option.textContent = `${applied.toLocaleString()}×`; select.appendChild(option);
      }
      select.value = String(applied);
    }
    const warp = this.root.querySelector('#warpQuick'); if (warp) warp.textContent = Number.isFinite(cap) && applied === cap ? `LAB ${cap.toLocaleString()}×` : `WARP ${applied.toLocaleString()}×`;
    if (notify && applied === requested) this.hud.notify(`Time warp ${applied.toLocaleString()}×. Newtonian gravity/thrust integrate over accelerated simulation time; this is separate from fictional TRANSIT travel.`);
    return applied;
  }

  engineAcceleration() {
    return this.ship.currentMainAcceleration();
  }

  cancelNavigation(message = null) {
    const wasAutomatic = this.navigationMode !== 'manual';
    this.navigationMode = 'manual';
    this.navigationStatus = null;
    this._lastNavigationPhase = null;
    this.turnBurnDirection = null;
    this.ship.clearNavigationAcceleration();
    if (wasAutomatic) {
      this.clock.setTimeScale(1);
      const select = this.root.querySelector('#timeScale');
      if (select) select.value = '1';
    }
    const button = this.root.querySelector('#approachButton');
    if (button) button.textContent = 'APPROACH';
    const matchButton = this.root.querySelector('#matchVelocity');
    if (matchButton) matchButton.textContent = 'STOP RELATIVE';
    const turnButton = this.root.querySelector('#turnBurnButton');
    if (turnButton) turnButton.textContent = 'TURN & BURN';
    const warpButton = this.root.querySelector('#warpQuick');
    if (warpButton) warpButton.textContent = `WARP ${this.clock.timeScale.toLocaleString()}×`;
    const pauseButton = this.root.querySelector('#pauseToggle'); if (pauseButton) pauseButton.textContent = this.running ? 'PAUSE' : 'RESUME';
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
    if (mode !== 'manual' && mode !== 'turn-burn' && !navTarget) { this.hud.notify('Select a celestial target, particle experiment, or cosmic phenomenon first.'); return; }
    if (mode === 'manual') { this.cancelNavigation(); return; }
    this.ship.throttle = 0;
    this.ship.reverseThrottle = 0;
    this.ship.braking = false;
    this.ship.clearNavigationAcceleration();
    this.navigationMode = mode;
    this.root.querySelector('#approachButton').textContent = mode === 'approach' ? 'APPROACH ON' : 'APPROACH';
    this.root.querySelector('#matchVelocity').textContent = mode === 'match' ? 'STOPPING…' : 'STOP RELATIVE';
    const turnButton = this.root.querySelector('#turnBurnButton');
    if (turnButton) turnButton.textContent = mode === 'turn-burn' ? 'TURNING…' : 'TURN & BURN';
    if (mode === 'approach') this.hud.notify(`Approach computer engaged toward ${navTarget.name}. Uses real thrust and braking; no teleportation.`);
    if (mode === 'match') this.hud.notify(`STOP RELATIVE engaged with ${navTarget.name}: bounded physical thrust is matching the target velocity.`);
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
    if (this.navigationMode === 'turn-burn') {
      if (!this.turnBurnDirection) { this.cancelNavigation('TURN & BURN direction was lost; returned to manual flight.'); return; }
      const command = computeTurnAndBurnAcceleration(this.ship, this.turnBurnDirection, maxAccel, dt);
      this.ship.setNavigationAcceleration(command.acceleration);
      this.navigationStatus = { mode: 'turn-burn', phase: command.complete ? 'aligned' : 'vectoring', ...command };
      if (command.complete) this.finishNavigation('TURN & BURN complete: the inertial velocity vector now follows the captured nose direction.');
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
    if (this.transitState.active || this.navigationMode === 'manual') return;
    const navTarget = this.navigationTarget;
    let desiredWarp;
    if (this.navigationMode === 'turn-burn') {
      desiredWarp = recommendedWarpCap({ mode: 'turn-burn', targetState: { lateralSpeedMps: this.navigationStatus?.lateralSpeedMps ?? Math.hypot(...this.ship.velocity), relativeSpeedMps: this.navigationStatus?.lateralSpeedMps ?? 0 } });
    } else {
      if (!navTarget) return;
      const state = targetRelativeState(this.ship, navTarget);
      const maxAccel = this.engineAcceleration();
      desiredWarp = recommendedWarpCap({
        mode: this.navigationMode,
        targetState: state,
        targetRadius: navTarget.radius,
        standOffDistanceMeters: this.navigationStatus?.standOffDistance ?? null,
        phase: this.navigationStatus?.phase ?? null,
        targetGravityMps2: this.navigationStatus?.targetGravityMps2 ?? 0,
        maxAccelerationMps2: maxAccel,
      });
    }
    const particleCap = this.particleExperiments.recommendedWarpCap;
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

  enforceParticleWarpSafety() {
    const cap = this.particleExperiments?.recommendedWarpCap ?? Infinity;
    if (!Number.isFinite(cap)) {
      if (this._particleWarpCapActive) {
        this._particleWarpCapActive = false;
        const restore = this._particleWarpRestoreScale;
        this._particleWarpRestoreScale = null;
        if (Number.isFinite(restore) && restore > 0 && this.navigationMode === 'manual' && !this.transitState.active) {
          this.clock.setTimeScale(restore);
          const select = this.root.querySelector('#timeScale');
          if (select) {
            if (![...select.options].some((option) => Number(option.value) === restore)) { const option = document.createElement('option'); option.value = String(restore); option.textContent = `${restore.toLocaleString()}×`; select.appendChild(option); }
            select.value = String(restore);
          }
          const button = this.root.querySelector('#warpQuick'); if (button) button.textContent = `WARP ${restore.toLocaleString()}×`;
          this.hud.notify(`Particle experiment completed: fine-step warp cap released and your previous ${restore.toLocaleString()}× warp restored.`);
        } else {
          const button = this.root.querySelector('#warpQuick'); if (button && !this.transitState.active) button.textContent = `WARP ${this.clock.timeScale.toLocaleString()}×`;
        }
      }
      return;
    }

    this._particleWarpCapActive = true;
    if (this.clock.timeScale <= cap) return;
    if (!Number.isFinite(this._particleWarpRestoreScale)) this._particleWarpRestoreScale = this.clock.timeScale;
    this.clock.setTimeScale(cap);
    const select = this.root.querySelector('#timeScale');
    if (select) {
      if (![...select.options].some((option) => Number(option.value) === cap)) { const option = document.createElement('option'); option.value = String(cap); option.textContent = `${cap.toLocaleString()}×`; select.appendChild(option); }
      select.value = String(cap);
    }
    const button = this.root.querySelector('#warpQuick');
    if (button) button.textContent = `LAB ${cap.toLocaleString()}×`;
    const now = performance.now();
    if (now - this._particleWarpNoticeAt > 1800) {
      this.hud.notify(`Live particle experiment: warp capped at ${cap.toLocaleString()}×. The cap now releases automatically when the last active particle dies or the field is cleared.`);
      this._particleWarpNoticeAt = now;
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
      } else if (limit.reason === 'black-hole-proximity') {
        this.hud.notify(`MODEL LIMIT: ${limit.body.name} is too close for this Newtonian black-hole model (${(limit.distanceMeters / Math.max(1, limit.body.radius)).toFixed(1)} Schwarzschild radii). Simulation paused before pretending this is valid GR.`, 0);
      } else {
        this.hud.notify(`MODEL LIMIT: ${limit.body.name} is inside the neutron-star compact-object guard (${(limit.distanceMeters / 1000).toFixed(0)} km from center). Newtonian gravity and the visual magnetosphere are no longer scientifically adequate here, so the simulation paused.`, 0);
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
    if (this.navigationExperimentId) {
      const navField = this.particleExperiments.fields.get(this.navigationExperimentId);
      if (!navField || navField.isComplete || navField.activeCount <= 0) this.cancelNavigation('Experiment rendezvous target completed or was cleared. Navigation returned to MANUAL at 1×.');
    }
    if (select) {
      const previous = this.selectedExperimentId;
      select.replaceChildren();
      if (!fields.length) {
        const option = document.createElement('option'); option.value = ''; option.textContent = 'No experiment'; select.appendChild(option);
      } else {
        for (const field of fields) {
          const option = document.createElement('option'); option.value = field.id; option.textContent = `${field.label}${field.isComplete ? ' · COMPLETE' : ''}`; select.appendChild(option);
        }
        if (!previous || !this.particleExperiments.fields.has(previous)) this.selectedExperimentId = fields[fields.length - 1].id;
        select.value = this.selectedExperimentId;
      }
    }
    const summaries = this.particleExperiments.summaries();
    if (!summaries.length) {
      element.textContent = 'No particle experiments. Fields remain session-local and are intentionally not written into schema-1 saves.';
      if (this.cameraMode === 'observe' && this.observationSource === 'experiment') this.returnToShipView(false);
      return;
    }
    const selectedField = this.selectedExperiment;
    const selectedState = this.particleExperiments.observationState(this.selectedExperimentId);
    let selectedText = '';
    if (selectedState) {
      const dx = selectedState.center[0] - this.ship.position[0], dy = selectedState.center[1] - this.ship.position[1], dz = selectedState.center[2] - this.ship.position[2];
      const dKm = Math.hypot(dx, dy, dz) / 1000;
      selectedText = `Selected ${selectedState.label}: ${dKm.toLocaleString(undefined,{maximumFractionDigits:0})} km from ship · ${selectedField?.isComplete ? 'FINAL frame' : `live radius ~${(selectedState.radiusMeters/1000).toLocaleString(undefined,{maximumFractionDigits:0})} km`}. `;
    }
    for (const field of fields) {
      if (field.isComplete && !this._announcedExperimentCompletions.has(field.id)) {
        this._announcedExperimentCompletions.add(field.id);
        if (this.cameraMode === 'observe' && this.observationSource === 'experiment' && this.selectedExperimentId === field.id) {
          this.observationStyle = 'frame';
          this._nextObservationRefreshAt = 0;
        }
        this.hud.notify(`${field.label} ${field.mode === 'life' ? 'EXTINCT' : 'COMPLETE'} after ${field.elapsedSeconds.toFixed(1)} simulated seconds. Warp safety is released because it has 0 active particles; the final live frame remains inspectable and REPLAY FIELD can restart it.`);
      }
    }
    element.textContent = selectedText + summaries.map((s) => `${s.label}: ${s.lifecycle === 'complete' ? 'COMPLETE' : `${s.activeCount.toLocaleString()}/${s.count.toLocaleString()} active`}${s.mode === 'life' ? ` · peak ${s.peakActiveCount.toLocaleString()} · births ${s.births.toLocaleString()} · deaths ${s.deaths.toLocaleString()}` : ''}${s.absorbedCount ? ` · ${s.absorbedCount.toLocaleString()} absorbed` : ''}`).join(' | ');
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
    const star = sources.find((body) => body.kind === BODY_KIND.STAR) ?? null;
    const weatherNotices = this.spaceWeather.step(this.clock.elapsedSimSeconds + dt, star, this.ship);
    for (const notice of weatherNotices) {
      if (notice.type === 'start') this.hud.notify(`STELLAR EVENT: ${notice.event.label} launched automatically at ${(notice.event.speedMps / 1000).toFixed(0)} km/s. COSMOS → SPACE WEATHER tracks the front.`);
      if (notice.type === 'ship-hit') this.hud.notify(`SPACE WEATHER CROSSING: ${notice.event.label} reached the spacecraft at ${(notice.distanceMeters / PHYSICS.AU).toFixed(3)} AU. This records geometric front arrival only; radiation/plasma damage is not simulated yet.`, 7600);
    }

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


  frameSurface(now, realDt) {
    this.physicsMs = 0;
    this.experimentMs = 0;
    this.updateSurface(realDt);

    // Ascent completion can detach the local surface during updateSurface(). In that case this
    // callback must immediately fall through to the orbital renderer instead of returning with
    // the previous surface framebuffer still on screen.
    if (!this.surfaceSession?.active || !this.surfaceRegion) {
      this.renderMs = 0;
      return false;
    }

    const renderStart = performance.now();
    this.renderer.renderSurface({ session: this.surfaceSession, transition: this.surfaceTransition, realTimeSeconds: now / 1000 });
    this.renderMs = performance.now() - renderStart;
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
      shipSpeed: this.surfaceSession.lastMoveSpeedMps ?? 0,
      bodyCount: this.bodies.length,
      minorCount: this.minorField?.count ?? 0,
      physicsMs: 0,
      renderMs: this.renderMs,
      predictionMs: 0,
      drawCalls: renderStats.drawCalls,
      experimentParticles: 0,
      experimentMs: 0,
    });
    return true;
  }

  frame(now) {
    const realDt = Math.min(SIMULATION.maxFrameDeltaSeconds, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.updateAscentDiagnosticVisibility(now);
    if (!this.transitState.active && this.ship.transitVisualRelease) {
      this.ship.transitVisualFactor = Math.max(0, (Number(this.ship.transitVisualFactor) || 0) * Math.exp(-realDt * 2.65));
      if (this.ship.transitVisualFactor < 0.008) {
        this.ship.transitVisualFactor = 0;
        this.ship.transitVisualRelease = false;
        this.ship.transitDirection = null;
      }
    }
    if (this.surfaceSession?.active) {
      this.frameSurface(now, realDt);
      if (this.surfaceSession?.active) return;
    }

    // The first orbital frame after ASCENDING is a visual/state commit frame: render the restored
    // ship/orbit immediately but do not advance N-body time in the same callback that tore down
    // the local surface world.
    const orbitalRealDt = this._surfaceOrbitHandoffPending ? 0 : realDt;
    const physicsStart = performance.now();
    this.experimentMs = 0;
    if (this.running) this.updateTransit(orbitalRealDt);
    this.enforceNavigationWarpSafety();
    this.enforceParticleWarpSafety();
    if (this.running) this.clock.advance(orbitalRealDt, (dt) => this.physicsStep(dt), this.currentPhysicsSubstepLimit());
    this.physicsMs = performance.now() - physicsStart;
    if (this._rollDirection) { this.ship.rotateRoll(this._rollDirection * orbitalRealDt * 1.4); this.invalidatePredictions(); }

    this.refreshPredictions(now);
    const renderStart = performance.now();
    const cameraView = this.currentCameraView(now, orbitalRealDt);
    this.renderer.render({ bodies: this.bodies, ship: this.ship, referenceFrame: this.referenceFrame, minorField: this.minorField, particleExperiments: this.particleExperiments.values, cosmicPhenomena: this.cosmicPhenomena.values, spaceWeather: this.spaceWeather.states(this.bodies.find((body) => body.kind === BODY_KIND.STAR), this.clock.elapsedSimSeconds), scientificOverlays: this.scientificOverlays, target: this.target, elapsedSimSeconds: this.clock.elapsedSimSeconds, cameraView });
    this.renderMs = performance.now() - renderStart;
    if (this._surfaceOrbitHandoffPending) this.commitSurfaceOrbitHandoff();
    this.updateTargetTelemetry();
    this.updateVelocityMarker();
    this.updateTransitPanel();
    const displayedNavigationStatus = this.transitState.active ? this.transitState.status : this.navigationStatus;
    const displayedNavigationTarget = this.transitState.active ? this.lockedTransitTarget()?.target : this.navigationTarget;
    this.hud.setNavigation(displayedNavigationStatus, displayedNavigationTarget, this.ship.engineMode, this.ship.currentMainAcceleration());
    if (this.cameraMode === 'observe') this.hud.setCamera('observe', this.observationSource === 'cosmic' ? (this.selectedPhenomenon?.label ?? 'Cosmic phenomenon') : (this.selectedExperiment?.label ?? 'Experiment'), this.observationStyle, this._observationState);
    if (now >= this._nextParticleStatusAt) { this.updateParticleLabStatus(); this._nextParticleStatusAt = now + 500; }
    if (now >= this._nextSpaceWeatherPanelAt) { this.updateSpaceWeatherPanel(); if (this.scientificOverlays.enabled) this.updateOverlayPanel(); this._nextSpaceWeatherPanelAt = now + 700; }
    if (!this.root.querySelector('#mapPanel')?.hidden && now >= this._nextMapUpdateAt) { this.systemMap.draw(); this._nextMapUpdateAt = now + 500; }

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
      timeScale: this.surfaceSession?.active ? this._surfacePreviousTimeScale : this.clock.timeScale,
      simulationRunning: this.surfaceSession?.active ? this._surfacePreviousRunning : this.running,
      ship: this.ship.serialize(),
      bodies: this.bodies.map(serializeBody),
      minorCount: this.minorField?.count ?? 0,
      userBodySerial: this.userBodySerial,
      targetId: this.targetId,
      shipPathEnabled: this.shipPathEnabled,
      trajectoryHorizon: this.predictionHorizonSeconds(),
      navigationMode: this.navigationMode,
      selectedSurfaceRegionId: this.selectedSurfaceRegionId,
      cockpitEnabled: this.cockpitEnabled,
      selectedPhenomenonId: this.selectedPhenomenonId,
      discoveredPhenomena: [...this.discoveredPhenomena],
      discoveryScanDepth: [...this.discoveryScanDepth.entries()],
      spaceWeather: this.spaceWeather.serialize(),
      surfaceSession: serializeSurfaceSession(this.surfaceSession),
    };
  }

  loadSave() {
    if (this.surfaceSession?.active) this.exitSurface({ returnToOrbit: false, notify: false, preserveRunning: true });
    setLandingPhase(this.surfaceTransition, SURFACE_PHASE.ORBIT);
    if (this.transitState.active) this.disengageTransit({ notify: false, restoreWarp: false });
    this._particleWarpRestoreScale = null;
    this._particleWarpCapActive = false;
    this._announcedExperimentCompletions.clear();
    const payload = this.saveSystem.load();
    if (!payload?.seed || !Array.isArray(payload.bodies)) {
      this.hud.notify('No valid local save found.');
      return;
    }
    this.system = generateSystem(payload.seed);
    this.cosmicPhenomena.reset(this.system.phenomena ?? []);
    this.particleExperiments.clear();
    this.returnToShipView(false);
    this.selectedExperimentId = null;
    this.selectedPhenomenonId = null;
    this.navigationPhenomenonId = null;
    this.discoveredPhenomena.clear();
    this.discoveryScanDepth.clear();
    this.systemMap.selection = null;
    this.registry.clear();
    const generatedBodyById = new Map((this.system.bodies ?? []).map((body) => [body.id, body]));
    for (const raw of payload.bodies) {
      const restored = restoreBody(raw);
      const generated = generatedBodyById.get(restored.id);
      // Schema-1 saves from before the landing foundation did not know the new surface profile.
      // Refresh only surface-capability metadata from deterministic generation; physical state remains saved state.
      if (generated?.landable) {
        restored.landable = true;
        restored.homeCandidate = generated.homeCandidate;
        restored.surfaceProfile = generated.surfaceProfile;
        restored.surfaceRegionId = generated.surfaceRegionId;
      }
      this.registry.create(restored);
    }
    this.rebuildBodyCaches();
    this.renderer.resetSystem(payload.seed);
    this.renderer.syncBodies(this.bodies);
    const star = this.registry.get('star-0') ?? this.bodies.find((b) => b.kind === BODY_KIND.STAR);
    this.minorField = new TestParticleField(payload.seed, star, payload.minorCount ?? SIMULATION.defaultMinorBodyCount);
    this.renderer.setMinorField(this.minorField);
    this.ship.restore(payload.ship);
    this.cockpitEnabled = payload.cockpitEnabled !== false;
    this.updateEngineUi();
    this.updateCockpitUi();
    this.clock.elapsedSimSeconds = safeNumber(payload.elapsedSimSeconds, 0);
    const weatherRestored = this.spaceWeather.restore(payload.spaceWeather, this.system.seed, this.clock.elapsedSimSeconds);
    if (Array.isArray(payload.discoveredPhenomena)) for (const id of payload.discoveredPhenomena) if (this.cosmicPhenomena.has(id)) this.discoveredPhenomena.add(id);
    if (Array.isArray(payload.discoveryScanDepth)) for (const entry of payload.discoveryScanDepth) {
      if (!Array.isArray(entry) || entry.length < 2 || !this.cosmicPhenomena.has(entry[0])) continue;
      this.discoveryScanDepth.set(entry[0], Math.max(0, Math.min(3, Math.floor(Number(entry[1]) || 0))));
    }
    this.running = payload.simulationRunning !== false;
    this._surfacePreviousRunning = this.running;
    this._surfacePreviousTimeScale = Math.max(1, safeNumber(payload.timeScale, 60));
    this.clock.setTimeScale(this._surfacePreviousTimeScale);
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
    const pauseButton = this.root.querySelector('#pauseToggle'); if (pauseButton) pauseButton.textContent = this.running ? 'PAUSE' : 'RESUME';
    this.root.querySelector('#minorCount').value = String(this.minorField.count);
    this.root.querySelector('#seedInput').value = payload.seed;
    if (payload.trajectoryHorizon) this.root.querySelector('#trajectoryHorizon').value = String(payload.trajectoryHorizon);
    this.userBodySerial = payload.userBodySerial ?? 1;
    this.selectedSurfaceRegionId = typeof payload.selectedSurfaceRegionId === 'string' ? payload.selectedSurfaceRegionId : 'shatterfall-basin';
    const restoredHome = this.bodies.find((body) => body.kind === BODY_KIND.PLANET && body.landable) ?? this.registry.get(this.system.homeId) ?? this.bodies.find((body) => body.kind === BODY_KIND.PLANET);
    if (restoredHome) this.system.homeId = restoredHome.id;
    this.shipPathEnabled = payload.shipPathEnabled !== false;
    this.navigationMode = 'manual';
    this.ship.clearNavigationAcceleration();
    this.root.querySelector('#pathToggle').textContent = this.shipPathEnabled ? 'PATH ON' : 'PATH';
    this.hud.setSeed(payload.seed);
    this.selectTarget(payload.targetId && this.registry.has(payload.targetId) ? payload.targetId : this.system.homeId);
    this.selectPhenomenon(payload.selectedPhenomenonId && this.cosmicPhenomena.has(payload.selectedPhenomenonId) ? payload.selectedPhenomenonId : (this.cosmicPhenomena.values[0]?.id ?? null), false);
    this.invalidatePredictions();
    this.updateParticleLabStatus();
    this.updateCosmosPanel();
    this.updateSpaceWeatherPanel();
    this.updateOverlayPanel();
    this.systemMap.draw();
    const savedSurface = payload.surfaceSession?.active ? payload.surfaceSession : null;
    const restoredSurfaceBody = savedSurface?.bodyId ? this.registry.get(savedSurface.bodyId) : null;
    const surfaceRestored = Boolean(savedSurface && restoredSurfaceBody && this.enterSurface(restoredSurfaceBody.id, { fromLoad: true, snapshot: savedSurface, notify: false }));
    this.syncViewClasses();
    this.updateCockpitUi();
    this.hud.notify(surfaceRestored
      ? `Save restored directly to ${this.surfaceRegion?.name ?? 'the surface'}. Orbital time remains held until TAKEOFF; surface discoveries and the ${weatherRestored ? 'saved' : 'new'} space-weather timeline are preserved.`
      : `Save restored. Major-body/ship state, discovery records and ${weatherRestored ? 'space-weather timeline' : 'a newly scheduled space-weather timeline'} are active. Session-local particle experiments were cleared.`);
  }

  bindUi() {
    const $ = (selector) => this.root.querySelector(selector);
    const updateWarpButton = () => { $('#warpQuick').textContent = `WARP ${this.clock.timeScale.toLocaleString()}×`; };
    const transitTierSelect = $('#transitTier');
    if (transitTierSelect) {
      transitTierSelect.replaceChildren();
      for (const tier of TRANSIT_TIERS) {
        const option = document.createElement('option');
        option.value = String(tier.multipleC);
        option.textContent = tier.label;
        transitTierSelect.appendChild(option);
      }
      transitTierSelect.value = '100';
    }
    $('#labToggle').addEventListener('click', () => this.hud.toggleLab());
    $('#moreToggle').addEventListener('click', () => this.hud.toggleMore());
    $('#moreClose').addEventListener('click', () => this.hud.toggleMore(false));
    $('#transitToggle').addEventListener('click', () => { this.hud.toggleMore(false); this.updateTransitPanel(); this.hud.toggleTransit(); });
    $('#transitClose').addEventListener('click', () => this.hud.toggleTransit(false));
    $('#transitTargetSource').addEventListener('change', () => this.updateTransitPanel());
    $('#transitTier').addEventListener('change', () => this.updateTransitPanel());
    $('#transitEngage').addEventListener('click', () => this.engageTransit());
    $('#labClose').addEventListener('click', () => this.hud.toggleLab(false));
    $('#scienceToggle').addEventListener('click', () => { this.hud.toggleMore(false); this.hud.toggleScience(); });
    $('#scienceClose').addEventListener('click', () => this.hud.toggleScience(false));
    $('#cosmosToggle').addEventListener('click', () => { this.hud.toggleMore(false); this.updateCosmosPanel(); this.hud.toggleCosmos(); });
    $('#mapToggle').addEventListener('click', () => { this.hud.toggleMore(false); this.hud.toggleMap(true); this.systemMap.updateSelectionText(); requestAnimationFrame(() => this.systemMap.draw()); });
    $('#mapClose').addEventListener('click', () => this.hud.toggleMap(false));
    $('#mapZoom').addEventListener('change', (event) => this.systemMap.setZoom(event.target.value));
    $('#mapUnknownToggle').addEventListener('change', (event) => { this.systemMap.includeUnknown = event.target.checked; this.systemMap.draw(); });
    $('#mapSelectAction').addEventListener('click', () => { if (!this.systemMap.selectCurrent()) this.hud.notify('Tap a body or cosmic marker on the SYSTEM MAP first.'); });
    $('#mapScanAction').addEventListener('click', () => { if (!this.systemMap.scanCurrent()) this.hud.notify('SCAN SIGNAL applies to a cosmic/anomaly marker. Tap one of those map markers first.'); });
    $('#mapTransitAction').addEventListener('click', () => { if (!this.systemMap.transitCurrent()) this.hud.notify('Tap a body or cosmic marker before opening TRANSIT.'); });
    $('#mapLandAction').addEventListener('click', () => { if (!this.systemMap.landCurrent()) this.hud.notify('LAND / DESCEND requires the current landable world inside its near-orbital descent envelope.'); });
    $('#mapCosmosAction').addEventListener('click', () => {
      const marker = this.systemMap.currentMarker();
      if (!marker) { this.hud.notify('Tap a map marker first.'); return; }
      this.systemMap.selectCurrent(); this.hud.toggleMap(false);
      if (marker.type === 'phenomenon') { this.updateCosmosPanel(); this.hud.toggleCosmos(true); }
      else if (marker.type === 'body') this.hud.toggleScanner(true);
    });
    $('#cosmosClose').addEventListener('click', () => this.hud.toggleCosmos(false));
    $('#overlayToggle').addEventListener('click', () => { this.hud.toggleMore(false); this.updateOverlayPanel(); this.hud.toggleOverlays(); });
    $('#cockpitToggle').addEventListener('click', () => { this.hud.toggleMore(false); this.toggleCockpit(); });
    $('#overlayClose').addEventListener('click', () => this.hud.toggleOverlays(false));
    $('#overlayMaster').addEventListener('change', (event) => this.setOverlaySetting('enabled', event.target.checked));
    $('#overlayLagrange').addEventListener('change', (event) => this.setOverlaySetting('lagrange', event.target.checked));
    $('#overlayHill').addEventListener('change', (event) => this.setOverlaySetting('hill', event.target.checked));
    $('#overlayRoche').addEventListener('change', (event) => this.setOverlaySetting('roche', event.target.checked));
    $('#overlayGravity').addEventListener('change', (event) => this.setOverlaySetting('gravity', event.target.checked));
    $('#overlayOrbitPlane').addEventListener('change', (event) => this.setOverlaySetting('orbitPlane', event.target.checked));
    $('#scannerToggle').addEventListener('click', () => this.hud.toggleScanner());
    $('#scannerClose').addEventListener('click', () => this.hud.toggleScanner(false));
    $('#surfaceRegionSelect').addEventListener('change', (event) => { this.selectedSurfaceRegionId = event.target.value || 'shatterfall-basin'; this.updateLandingUi(); });
    $('#landTarget').addEventListener('click', () => { this.hud.toggleScanner(false); this.enterSurface(this.targetId); });
    $('#surfaceLandButton').addEventListener('click', () => { this.hud.toggleMore(false); this.enterSurface(this.targetId); });
    $('#surfaceHudToggle').addEventListener('click', () => this.toggleSurfaceHud());
    $('#phenomenonSelect').addEventListener('change', (event) => this.selectPhenomenon(event.target.value, false));
    $('#scanPhenomenon').addEventListener('click', () => this.scanPhenomenon());
    $('#observePhenomenon').addEventListener('click', () => this.enterCosmicObservation('frame'));
    $('#orbitPhenomenon').addEventListener('click', () => this.enterCosmicObservation('orbit'));
    $('#nextPhenomenon').addEventListener('click', () => this.cyclePhenomenon());
    $('#rendezvousPhenomenon').addEventListener('click', () => this.rendezvousPhenomenon());
    $('#shipViewCosmos').addEventListener('click', () => { this.hud.toggleCosmos(false); this.returnToShipView(); });
    $('#triggerCme').addEventListener('click', () => this.triggerSpaceWeather());
    $('#autoWeatherToggle').addEventListener('click', (event) => {
      this.spaceWeather.autoEnabled = !this.spaceWeather.autoEnabled;
      event.currentTarget.textContent = `AUTO WEATHER ${this.spaceWeather.autoEnabled ? 'ON' : 'OFF'}`;
      this.updateSpaceWeatherPanel();
    });
    $('#targetButton').addEventListener('click', () => this.selectReticleTarget());
    $('#approachButton').addEventListener('click', () => { if (this.cameraMode === 'observe') { this.returnToShipView(); return; } if (this.navigationMode !== 'approach') { this.navigationExperimentId = null; this.navigationPhenomenonId = null; } this.setNavigationMode(this.navigationMode === 'approach' ? 'manual' : 'approach'); });
    $('#matchVelocity').addEventListener('click', () => { if (this.transitState.active) this.disengageTransit({ notify: false, restoreWarp: false }); if (this.navigationMode !== 'match') { this.navigationExperimentId = null; this.navigationPhenomenonId = null; } this.setNavigationMode(this.navigationMode === 'match' ? 'manual' : 'match'); });
    $('#progradeButton').addEventListener('click', () => { this.hud.toggleMore(false); this.alignVelocityAttitude(1); });
    $('#retrogradeButton').addEventListener('click', () => { this.hud.toggleMore(false); this.alignVelocityAttitude(-1); });
    $('#turnBurnButton').addEventListener('click', () => this.engageTurnAndBurn());
    $('#engineModeButton').addEventListener('click', () => {
      const next = this.ship.engineMode === 'flight' ? 'cruise' : this.ship.engineMode === 'cruise' ? 'boost' : 'flight';
      this.ship.engineMode = next;
      this.updateEngineUi();
      this.updateCockpitUi();
      const status = next === 'boost' ? 'SPECULATIVE BOOST' : next.toUpperCase();
      if (next === 'boost' && this.navigationMode === 'manual' && !this.transitState.active && this.clock.timeScale > 1) this.requestTimeScale(1, false);
      this.hud.notify(`${status} propulsion selected: ${this.ship.currentMainAcceleration().toLocaleString()} m/s² maximum bounded main acceleration.${next === 'boost' ? ' BOOST is fictional and intended for rapid local vector changes; manual selection drops simulation warp to 1× for control.' : ''}`);
    });
    $('#nextTarget').addEventListener('click', () => this.cycleTarget());
    $('#aimTarget').addEventListener('click', () => this.aimAtTarget());
    $('#regenerate').addEventListener('click', () => this.newSystem($('#seedInput').value));
    $('#randomSeed').addEventListener('click', () => this.newSystem(`SYS-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16).toUpperCase()}`));
    $('#timeScale').addEventListener('change', (e) => this.requestTimeScale(e.target.value));
    $('#warpQuick').addEventListener('click', () => {
      if (this.transitState.active) { this.hud.notify('TRANSIT drive is active. Simulation warp remains locked to 1×; change the transit tier in the TRANSIT drawer instead.'); return; }
      const levels = [1, 60, 600, 3600];
      const currentRequested = Number.isFinite(this._particleWarpRestoreScale) ? this._particleWarpRestoreScale : this.clock.timeScale;
      const next = levels.find((value) => value > currentRequested) ?? levels[0];
      this.requestTimeScale(next);
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
        this.enforceParticleWarpSafety();
        this.selectExperiment(field.id, false);
        this.updateParticleLabStatus();
        this.enterObservation('frame');
        this.hud.notify(`${field.label} spawned nearby and automatically framed: ${field.count.toLocaleString()} slots in a ${(field.radiusMeters / 1000).toLocaleString()} km region. OBSERVE moved only the camera. ${field.scientificStatus}`, 7000);
      } catch (error) { this.hud.notify(`Particle field rejected: ${error.message}`); }
    });
    $('#fireParticleGun').addEventListener('click', () => {
      try {
        const field = this.particleExperiments.fireGun(this, { count: $('#particleGunCount').value, speedMps: $('#particleGunSpeed').value, spreadDegrees: $('#particleGunSpread').value });
        this.enforceParticleWarpSafety();
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
      this.enforceParticleWarpSafety();
      this.hud.notify('All session-local particle experiments cleared. Camera returned to SHIP VIEW; any active-particle warp cap was released.');
    });
    $('#experimentSelect').addEventListener('change', (event) => this.selectExperiment(event.target.value, false));
    $('#observeExperiment').addEventListener('click', () => this.enterObservation('frame'));
    $('#frameExperiment').addEventListener('click', () => this.enterObservation('frame'));
    $('#trackExperiment').addEventListener('click', () => this.enterObservation('track'));
    $('#orbitExperiment').addEventListener('click', () => this.enterObservation('orbit'));
    $('#nextExperiment').addEventListener('click', () => this.cycleExperiment());
    $('#replayExperiment').addEventListener('click', () => this.replaySelectedExperiment());
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
    $('#homeButton').addEventListener('click', () => { this.hud.toggleMore(false); if (this.transitState.active) this.disengageTransit({ notify: false, restoreWarp: false }); this.cancelNavigation(); this.placeShipNearHome(); this.selectTarget(this.system.homeId); this.hud.notify('Ship returned to the seeded orbital demonstration position with a prograde-biased pilot view.'); });
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
    $('#spawnNeutronStar').addEventListener('click', () => {
      try {
        const body = this.experiments.run('spawn-neutron-star', this, {
          compactType: $('#compactObjectType').value,
          solarMasses: $('#neutronStarMass').value,
          spinPeriodSeconds: $('#pulsarSpinPeriod').value,
          magneticFieldTesla: $('#pulsarMagneticField').value,
        });
        this.selectTarget(body.id);
        this.hud.notify(`${body.name} spawned: ${(body.mass / PHYSICS.SOLAR_MASS).toFixed(2)} M☉, physical radius ${(body.radius / 1000).toFixed(1)} km, spin ${body.spinPeriodSeconds.toFixed(3)} s. Gravity is live Newtonian; magnetosphere/beams are visual proxies.`);
      } catch (error) {
        this.hud.notify(`Compact-object spawn rejected: ${error.message}`);
      }
    });
    $('#spawnExtremeObject').addEventListener('click', () => {
      try {
        const body = this.experiments.run('spawn-extreme-star', this, { extremeType: $('#extremeObjectType').value });
        this.selectTarget(body.id);
        const solar = body.mass / PHYSICS.SOLAR_MASS;
        const massText = solar >= 0.01 ? `${solar.toFixed(3)} M☉` : `${(body.mass / PHYSICS.EARTH_MASS).toFixed(2)} M⊕`;
        this.hud.notify(`${body.name} spawned: ${massText}, physical radius ${(body.radius / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km. Gravity is live Newtonian; specialized field/thermal visuals are labeled proxies.`);
      } catch (error) {
        this.hud.notify(`Extreme-object spawn rejected: ${error.message}`);
      }
    });
    $('#spawnBlackHole').addEventListener('click', () => {
      try {
        const body = this.experiments.run('spawn-black-hole', this, { solarMasses: $('#blackHoleMass').value });
        this.selectTarget(body.id);
        this.hud.notify(`${body.name} spawned with active accretion visuals. Live gravity remains Newtonian; photon-ring/lensing/jet graphics are visual proxies and the model guard still blocks invalid near-horizon states.`);
      } catch (error) {
        this.hud.notify(`Spawn rejected: ${error.message}`);
      }
    });

    $('#surfaceScanButton').addEventListener('click', () => this.scanSurface());
    $('#surfaceSaveButton').addEventListener('click', () => { this.saveSystem.save(this.serialize()); this.hud.notify('Surface position and discoveries saved locally on this device.'); });
    $('#surfaceTakeoffButton').addEventListener('click', () => this.requestSurfaceTakeoff());

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
      if (this.surfaceSession?.active) {
        this.surfaceSession.yaw -= dx * 0.0045;
        this.surfaceSession.pitch = Math.max(-1.32, Math.min(1.32, this.surfaceSession.pitch + dy * 0.0038));
      } else if (this.cameraMode === 'observe') {
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
      this._holdReleases.add(() => release(null, true));
    };
    bindHold($('#thrustButton'), () => { this.manualPilotTakeover(); this.ship.throttle = 1; }, () => { this.ship.throttle = 0; });
    bindHold($('#reverseButton'), () => { this.manualPilotTakeover(); this.ship.reverseThrottle = 1; }, () => { this.ship.reverseThrottle = 0; });
    bindHold($('#brakeButton'), () => { this.manualPilotTakeover(); this.ship.braking = true; }, () => { this.ship.braking = false; this.ship.clearNavigationAcceleration(); });
    bindHold($('#rcsLeft'), () => { this.manualPilotTakeover(); this.ship.strafe = -1; }, () => { if (this.ship.strafe < 0) this.ship.strafe = 0; });
    bindHold($('#rcsRight'), () => { this.manualPilotTakeover(); this.ship.strafe = 1; }, () => { if (this.ship.strafe > 0) this.ship.strafe = 0; });
    bindHold($('#rcsUp'), () => { this.manualPilotTakeover(); this.ship.lift = 1; }, () => { if (this.ship.lift > 0) this.ship.lift = 0; });
    bindHold($('#rcsDown'), () => { this.manualPilotTakeover(); this.ship.lift = -1; }, () => { if (this.ship.lift < 0) this.ship.lift = 0; });
    bindHold($('#rollLeft'), () => { this._rollDirection = -1; }, () => { if (this._rollDirection < 0) this._rollDirection = 0; });
    bindHold($('#rollRight'), () => { this._rollDirection = 1; }, () => { if (this._rollDirection > 0) this._rollDirection = 0; });
    bindHold($('#surfaceForward'), () => { this.surfaceInput.forward = 1; }, () => { if (this.surfaceInput.forward > 0) this.surfaceInput.forward = 0; });
    bindHold($('#surfaceBack'), () => { this.surfaceInput.forward = -1; }, () => { if (this.surfaceInput.forward < 0) this.surfaceInput.forward = 0; });
    bindHold($('#surfaceLeft'), () => { this.surfaceInput.strafe = -1; }, () => { if (this.surfaceInput.strafe < 0) this.surfaceInput.strafe = 0; });
    bindHold($('#surfaceRight'), () => { this.surfaceInput.strafe = 1; }, () => { if (this.surfaceInput.strafe > 0) this.surfaceInput.strafe = 0; });
    bindHold($('#surfaceSprintButton'), () => { this.surfaceInput.sprint = true; }, () => { this.surfaceInput.sprint = false; });
    $('#rcsToggle').addEventListener('click', () => { this.hud.toggleMore(false); $('#rcsPanel').hidden = !$('#rcsPanel').hidden; });

    const viewport = $('#viewport');
    viewport.addEventListener('pointerdown', (event) => { this._viewportTap = { id: event.pointerId, x: event.clientX, y: event.clientY }; });
    viewport.addEventListener('pointerup', (event) => {
      const tap = this._viewportTap;
      this._viewportTap = null;
      if (!tap || tap.id !== event.pointerId || Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 12) return;
      if (this.surfaceSession?.active) return;
      const id = this.renderer.pickBodyAt(event.clientX, event.clientY);
      if (id) this.selectTarget(id);
    });
    viewport.addEventListener('pointercancel', () => { this._viewportTap = null; });

    window.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (this.surfaceSession?.active) {
        if (event.code === 'KeyW') this.surfaceInput.forward = 1;
        if (event.code === 'KeyS') this.surfaceInput.forward = -1;
        if (event.code === 'KeyA') this.surfaceInput.strafe = -1;
        if (event.code === 'KeyD') this.surfaceInput.strafe = 1;
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.surfaceInput.sprint = true;
        if (event.code === 'ArrowLeft') this.surfaceSession.yaw += 0.05;
        if (event.code === 'ArrowRight') this.surfaceSession.yaw -= 0.05;
        if (event.code === 'ArrowUp') this.surfaceSession.pitch = Math.max(-1.32, this.surfaceSession.pitch - 0.04);
        if (event.code === 'ArrowDown') this.surfaceSession.pitch = Math.min(1.32, this.surfaceSession.pitch + 0.04);
        if (event.code === 'KeyT') this.scanSurface();
        return;
      }
      if (event.code === 'KeyW') { this.manualPilotTakeover(); this.ship.throttle = 1; }
      if (event.code === 'KeyX') { this.manualPilotTakeover(); this.ship.reverseThrottle = 1; }
      if (event.code === 'KeyS') { this.manualPilotTakeover(); this.ship.braking = true; }
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
      if (this.surfaceSession?.active) {
        if (event.code === 'KeyW' && this.surfaceInput.forward > 0) this.surfaceInput.forward = 0;
        if (event.code === 'KeyS' && this.surfaceInput.forward < 0) this.surfaceInput.forward = 0;
        if (event.code === 'KeyA' && this.surfaceInput.strafe < 0) this.surfaceInput.strafe = 0;
        if (event.code === 'KeyD' && this.surfaceInput.strafe > 0) this.surfaceInput.strafe = 0;
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.surfaceInput.sprint = false;
        return;
      }
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
