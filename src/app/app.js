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
import { impactReport, formatEnergy } from '../physics/impactModel.js';
import { osculatingMetrics, angularAlignment } from '../physics/orbitalMetrics.js';
import { TrajectoryPredictor } from '../physics/trajectoryPredictor.js';
import { ExperimentRegistry } from '../experiments/experimentRegistry.js';
import { registerLabExperiments, MATERIALS, asteroidDefinitionFromParams, sphereRadiusFromMassDensity } from '../experiments/labSpawner.js';
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
    semiMajorAxis: body.semiMajorAxis,
    eccentricity: body.eccentricity,
    inclinationRad: body.inclinationRad,
    scientificWarning: body.scientificWarning,
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
    this._lookPointer = null;
    this._lookLast = [0, 0];
    this._viewportTap = null;
    this._rollDirection = 0;
  }

  get bodies() { return this.registry.values(); }
  get target() { return this.targetId ? this.registry.get(this.targetId) : null; }

  rebuildBodyCaches() {
    this.massiveBodies = this.registry.values().filter((body) => body.gravitySource);
  }

  async init() {
    const backend = await this.renderer.init();
    this.hud.setRenderer(backend);
    this.bindUi();
    this.newSystem(this.root.querySelector('#seedInput').value || 'ORIGIN-001');
    this.renderer.renderer.setAnimationLoop((time) => this.frame(time));
    this.hud.notify('v0.1.1.1 online. Mobile controls and flight motion cues are active.');
  }

  newSystem(seed) {
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

  physicsStep(dt) {
    const sources = this.massiveBodies;
    this.integrator.step(sources, dt);
    this.ship.step(dt, sources);
    this.minorField?.step(dt, sources);

    const collisions = this.collisionMonitor.scan(sources);
    for (const event of collisions) {
      const report = impactReport(event.a, event.b, event.relativeSpeed);
      this.hud.setImpact(event, report);
      this.hud.notify(`CONTACT: ${event.a.name} / ${event.b.name} · ${formatEnergy(report.centerOfMassEnergyJ)} · Qᴿ ${report.specificImpactEnergyJkg.toExponential(2)} J/kg. No deformation is invented yet.`);
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
        this.hud.notify(`SHIP CONTACT: ${currentContact.name} at ${Math.abs(metrics?.relativeSpeedMps ?? 0).toFixed(1)} m/s relative speed. Crash response is reserved for v0.1.2.`);
      }
    }
  }

  frame(now) {
    const realDt = Math.min(SIMULATION.maxFrameDeltaSeconds, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const physicsStart = performance.now();
    if (this.running) this.clock.advance(realDt, (dt) => this.physicsStep(dt));
    this.physicsMs = performance.now() - physicsStart;
    if (this._rollDirection) { this.ship.rotateRoll(this._rollDirection * realDt * 1.4); this.invalidatePredictions(); }

    this.refreshPredictions(now);
    const renderStart = performance.now();
    this.renderer.render({ bodies: this.bodies, ship: this.ship, referenceFrame: this.referenceFrame, minorField: this.minorField });
    this.renderMs = performance.now() - renderStart;
    this.updateTargetTelemetry();

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
    };
  }

  loadSave() {
    const payload = this.saveSystem.load();
    if (!payload?.seed || !Array.isArray(payload.bodies)) {
      this.hud.notify('No valid local save found.');
      return;
    }
    this.system = generateSystem(payload.seed);
    this.registry.clear();
    for (const raw of payload.bodies) this.registry.create(restoreBody(raw));
    this.rebuildBodyCaches();
    this.renderer.resetSystem(payload.seed);
    this.renderer.syncBodies(this.bodies);
    const star = this.registry.get('star-0') ?? this.bodies.find((b) => b.kind === BODY_KIND.STAR);
    this.minorField = new TestParticleField(payload.seed, star, payload.minorCount ?? SIMULATION.defaultMinorBodyCount);
    this.renderer.setMinorField(this.minorField);
    this.ship.restore(payload.ship);
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
    this.root.querySelector('#pathToggle').textContent = this.shipPathEnabled ? 'PATH ON' : 'PATH';
    this.hud.setSeed(payload.seed);
    this.selectTarget(payload.targetId && this.registry.has(payload.targetId) ? payload.targetId : this.system.homeId);
    this.invalidatePredictions();
    this.hud.notify('Save restored. High-count minor field was deterministically regenerated; major-body and spacecraft state were snapshot-restored.');
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
    $('#pauseToggle').addEventListener('click', (e) => {
      this.hud.toggleMore(false);
      this.running = !this.running;
      e.currentTarget.textContent = this.running ? 'PAUSE' : 'RESUME';
      this.hud.notify(this.running ? 'Simulation resumed.' : 'Simulation paused.');
    });
    $('#saveButton').addEventListener('click', () => { this.hud.toggleMore(false); this.saveSystem.save(this.serialize()); this.hud.notify('Saved locally on this device.'); });
    $('#loadButton').addEventListener('click', () => { this.hud.toggleMore(false); this.loadSave(); });
    $('#homeButton').addEventListener('click', () => { this.hud.toggleMore(false); this.placeShipNearHome(); this.selectTarget(this.system.homeId); this.hud.notify('Ship returned to the seeded orbital demonstration position with a prograde-biased pilot view.'); });
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

    const lookPad = $('#lookPad');
    lookPad.addEventListener('pointerdown', (event) => {
      this._lookPointer = event.pointerId;
      this._lookLast = [event.clientX, event.clientY];
      lookPad.setPointerCapture(event.pointerId);
    });
    lookPad.addEventListener('pointermove', (event) => {
      if (this._lookPointer !== event.pointerId) return;
      const dx = event.clientX - this._lookLast[0];
      const dy = event.clientY - this._lookLast[1];
      this._lookLast = [event.clientX, event.clientY];
      this.ship.rotateLook(-dx * 0.0045, dy * 0.0038);
      this.invalidatePredictions();
    });
    const releaseLook = (event) => { if (event.pointerId === this._lookPointer) this._lookPointer = null; };
    lookPad.addEventListener('pointerup', releaseLook);
    lookPad.addEventListener('pointercancel', releaseLook);

    const bindHold = (element, on, off) => {
      element.addEventListener('pointerdown', (event) => { event.preventDefault(); element.setPointerCapture?.(event.pointerId); on(); this.invalidatePredictions(); });
      element.addEventListener('pointerup', (event) => { event.preventDefault(); off(); this.invalidatePredictions(); });
      element.addEventListener('pointercancel', () => { off(); this.invalidatePredictions(); });
      element.addEventListener('lostpointercapture', () => { off(); this.invalidatePredictions(); });
    };
    bindHold($('#thrustButton'), () => { this.ship.throttle = 1; }, () => { this.ship.throttle = 0; });
    bindHold($('#reverseButton'), () => { this.ship.reverseThrottle = 1; }, () => { this.ship.reverseThrottle = 0; });
    bindHold($('#brakeButton'), () => { this.ship.braking = true; }, () => { this.ship.braking = false; });
    bindHold($('#rcsLeft'), () => { this.ship.strafe = -1; }, () => { if (this.ship.strafe < 0) this.ship.strafe = 0; });
    bindHold($('#rcsRight'), () => { this.ship.strafe = 1; }, () => { if (this.ship.strafe > 0) this.ship.strafe = 0; });
    bindHold($('#rcsUp'), () => { this.ship.lift = 1; }, () => { if (this.ship.lift > 0) this.ship.lift = 0; });
    bindHold($('#rcsDown'), () => { this.ship.lift = -1; }, () => { if (this.ship.lift < 0) this.ship.lift = 0; });
    bindHold($('#rollLeft'), () => { this._rollDirection = -1; }, () => { if (this._rollDirection < 0) this._rollDirection = 0; });
    bindHold($('#rollRight'), () => { this._rollDirection = 1; }, () => { if (this._rollDirection > 0) this._rollDirection = 0; });
    $('#rcsToggle').addEventListener('click', () => { this.hud.toggleMore(false); $('#rcsPanel').hidden = !$('#rcsPanel').hidden; });

    const viewport = $('#viewport');
    viewport.addEventListener('pointerdown', (event) => { this._viewportTap = { id: event.pointerId, x: event.clientX, y: event.clientY }; });
    viewport.addEventListener('pointerup', (event) => {
      const tap = this._viewportTap;
      this._viewportTap = null;
    this._rollDirection = 0;
      if (!tap || tap.id !== event.pointerId || Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 12) return;
      const id = this.renderer.pickBodyAt(event.clientX, event.clientY);
      if (id) this.selectTarget(id);
    });
    viewport.addEventListener('pointercancel', () => { this._viewportTap = null; });

    window.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === 'KeyW') this.ship.throttle = 1;
      if (event.code === 'KeyX') this.ship.reverseThrottle = 1;
      if (event.code === 'KeyS') this.ship.braking = true;
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
