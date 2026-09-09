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
import { impactEnergyJoules, formatEnergy } from '../physics/impactModel.js';
import { ExperimentRegistry } from '../experiments/experimentRegistry.js';
import { registerLabExperiments } from '../experiments/labSpawner.js';
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
    color: body.color,
    gravitySource: body.gravitySource,
    generated: body.generated,
    landable: body.landable,
    planetType: body.planetType,
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
    this.experiments = new ExperimentRegistry();
    registerLabExperiments(this.experiments);
    this.renderer = new UniverseRenderer(root.querySelector('#viewport'));
    this.system = null;
    this.minorField = null;
    this.userBodySerial = 1;
    this.massiveBodies = [];
    this.running = true;
    this.lastFrame = performance.now();
    this.fpsClock = this.lastFrame;
    this.fpsFrames = 0;
    this.fps = 60;
    this.physicsMs = 0;
    this._lookPointer = null;
    this._lookLast = [0, 0];
  }

  get bodies() { return this.registry.values(); }

  rebuildBodyCaches() {
    this.massiveBodies = this.registry.values().filter((body) => body.gravitySource);
  }

  async init() {
    const backend = await this.renderer.init();
    this.hud.setRenderer(backend);
    this.bindUi();
    this.newSystem(this.root.querySelector('#seedInput').value || 'ORIGIN-001');
    this.renderer.renderer.setAnimationLoop((time) => this.frame(time));
    this.hud.notify('Scientific foundation online. Drag LOOK, hold THRUST, or open LAB.');
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
    this.hud.notify(`Generated ${this.system.starName}: ${this.system.bodies.length - 1} planets. Seed is deterministic.`);
  }

  placeShipNearHome() {
    const home = this.registry.get(this.system.homeId);
    const distance = home.radius * 5;
    this.ship.position[0] = home.position[0];
    this.ship.position[1] = home.position[1] + distance;
    this.ship.position[2] = home.position[2];
    const orbital = Math.sqrt(PHYSICS.G * home.mass / distance);
    this.ship.velocity[0] = home.velocity[0] + orbital;
    this.ship.velocity[1] = home.velocity[1];
    this.ship.velocity[2] = home.velocity[2];
    this.ship.lookAt(home.position);
  }

  addBody(definition) {
    const body = this.registry.create(definition);
    this.rebuildBodyCaches();
    this.renderer.syncBodies(this.bodies);
    return body;
  }

  physicsStep(dt) {
    const sources = this.massiveBodies;
    this.integrator.step(sources, dt);
    this.ship.step(dt, sources);
    this.minorField?.step(dt, sources);

    const collisions = this.collisionMonitor.scan(sources);
    for (const event of collisions) {
      const energy = impactEnergyJoules(event.a, event.b, event.relativeSpeed);
      this.hud.notify(`COLLISION DETECTED: ${event.a.name} / ${event.b.name} · ${formatEnergy(energy)}. Response model arrives in impact milestone.`);
    }

    for (const body of sources) {
      const dx = body.position[0] - this.ship.position[0];
      const dy = body.position[1] - this.ship.position[1];
      const dz = body.position[2] - this.ship.position[2];
      if (dx * dx + dy * dy + dz * dz <= body.radius * body.radius) {
        this.hud.notify(`SHIP SURFACE CONTACT: ${body.name}. v0.1.0 detects contact; rigid-body crash response is deliberately not faked yet.`);
      }
    }
  }

  frame(now) {
    const realDt = Math.min(SIMULATION.maxFrameDeltaSeconds, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const start = performance.now();
    if (this.running) this.clock.advance(realDt, (dt) => this.physicsStep(dt));
    this.physicsMs = performance.now() - start;

    this.renderer.render({ bodies: this.bodies, ship: this.ship, referenceFrame: this.referenceFrame, minorField: this.minorField });
    this.fpsFrames += 1;
    if (now - this.fpsClock >= 500) {
      this.fps = (this.fpsFrames * 1000) / (now - this.fpsClock);
      this.fpsFrames = 0;
      this.fpsClock = now;
    }
    this.hud.update({
      fps: this.fps,
      elapsedSeconds: this.clock.elapsedSimSeconds,
      shipSpeed: Math.hypot(...this.ship.velocity),
      bodyCount: this.bodies.length,
      minorCount: this.minorField?.count ?? 0,
      physicsMs: this.physicsMs,
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
    this.root.querySelector('#timeScale').value = String(this.clock.timeScale);
    this.root.querySelector('#minorCount').value = String(this.minorField.count);
    this.root.querySelector('#seedInput').value = payload.seed;
    this.userBodySerial = payload.userBodySerial ?? 1;
    this.hud.setSeed(payload.seed);
    this.hud.notify('Save restored. Minor-body field is deterministically regenerated in v0.1.0 rather than snapshot-saved.');
  }

  bindUi() {
    const $ = (selector) => this.root.querySelector(selector);
    $('#labToggle').addEventListener('click', () => this.hud.toggleLab());
    $('#labClose').addEventListener('click', () => this.hud.toggleLab(false));
    $('#scienceToggle').addEventListener('click', () => this.hud.toggleScience());
    $('#scienceClose').addEventListener('click', () => this.hud.toggleScience(false));
    $('#regenerate').addEventListener('click', () => this.newSystem($('#seedInput').value));
    $('#randomSeed').addEventListener('click', () => this.newSystem(`SYS-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16).toUpperCase()}`));
    $('#timeScale').addEventListener('change', (e) => this.clock.setTimeScale(e.target.value));
    $('#minorCount').addEventListener('change', (e) => {
      this.minorField.setCount(e.target.value);
      this.renderer.setMinorField(this.minorField);
      this.hud.notify(`Minor test-particle field rebuilt: ${this.minorField.count.toLocaleString()} bodies. They feel gravity but do not source it.`);
    });
    $('#pauseToggle').addEventListener('click', (e) => {
      this.running = !this.running;
      e.currentTarget.textContent = this.running ? 'PAUSE' : 'RESUME';
      this.hud.notify(this.running ? 'Simulation resumed.' : 'Simulation paused.');
    });
    $('#saveButton').addEventListener('click', () => { this.saveSystem.save(this.serialize()); this.hud.notify('Saved locally on this device.'); });
    $('#loadButton').addEventListener('click', () => this.loadSave());
    $('#homeButton').addEventListener('click', () => { this.placeShipNearHome(); this.hud.notify('Ship returned near the designated landable candidate.'); });

    $('#spawnAsteroid').addEventListener('click', () => {
      const body = this.experiments.run('spawn-asteroid', this, { massKg: $('#asteroidMass').value, speedMps: $('#asteroidSpeed').value });
      this.hud.notify(`${body.name} launched. Its trajectory is live Newtonian physics.`);
    });
    $('#spawnBlackHole').addEventListener('click', () => {
      const body = this.experiments.run('spawn-black-hole', this, { solarMasses: $('#blackHoleMass').value });
      this.hud.notify(`${body.name} spawned. WARNING: gravity is Newtonian; near-horizon GR is not implemented.`);
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
      this.ship.yaw -= dx * 0.0045;
      this.ship.pitch = Math.max(-1.45, Math.min(1.45, this.ship.pitch + dy * 0.0038));
    });
    const releaseLook = (event) => { if (event.pointerId === this._lookPointer) this._lookPointer = null; };
    lookPad.addEventListener('pointerup', releaseLook);
    lookPad.addEventListener('pointercancel', releaseLook);

    const bindHold = (element, on, off) => {
      element.addEventListener('pointerdown', (event) => { event.preventDefault(); element.setPointerCapture(event.pointerId); on(); });
      element.addEventListener('pointerup', (event) => { event.preventDefault(); off(); });
      element.addEventListener('pointercancel', off);
      element.addEventListener('lostpointercapture', off);
    };
    bindHold($('#thrustButton'), () => { this.ship.throttle = 1; }, () => { this.ship.throttle = 0; });
    bindHold($('#brakeButton'), () => { this.ship.braking = true; }, () => { this.ship.braking = false; });

    window.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === 'KeyW') this.ship.throttle = 1;
      if (event.code === 'KeyS') this.ship.braking = true;
      if (event.code === 'ArrowLeft') this.ship.yaw += 0.05;
      if (event.code === 'ArrowRight') this.ship.yaw -= 0.05;
      if (event.code === 'ArrowUp') this.ship.pitch -= 0.04;
      if (event.code === 'ArrowDown') this.ship.pitch += 0.04;
    });
    window.addEventListener('keyup', (event) => {
      if (event.code === 'KeyW') this.ship.throttle = 0;
      if (event.code === 'KeyS') this.ship.braking = false;
    });
  }
}
