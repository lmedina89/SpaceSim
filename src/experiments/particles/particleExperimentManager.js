import { SIMULATION } from '../../core/constants.js';
import { createRng } from '../../util/prng.js';
import { ParticleExperiment } from './particleExperiment.js';

export const PARTICLE_MODES = Object.freeze({
  gravity: {
    id: 'gravity',
    label: 'Gravity Cloud',
    maxCount: 30_000,
    scientificStatus: 'Physical test particles: SI positions/velocities feel all major Newtonian gravity sources but do not source gravity themselves.',
  },
  life: {
    id: 'life',
    label: 'Particle Life',
    maxCount: 6_000,
    scientificStatus: 'Artificial continuous-3D Conway-inspired neighbor rules. Birth/survival/death rules are experimental mathematics, not a physical law.',
  },
  species: {
    id: 'species',
    label: 'Species Forces',
    maxCount: 4_000,
    scientificStatus: 'Artificial short-range three-species attraction/repulsion matrix accelerated with a uniform spatial hash. Not a claim about real matter.',
  },
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class ParticleExperimentManager {
  constructor() {
    this.fields = new Map();
    this.serial = 1;
    this.gunSerial = 1;
    this.maxActiveFields = SIMULATION.particleExperimentMaxActiveFields;
    this.maxTotalParticles = SIMULATION.particleExperimentMaxTotal;
    this.lastStepDroppedSeconds = 0;
  }

  get values() { return [...this.fields.values()]; }
  get totalParticles() { return this.values.reduce((sum, field) => sum + field.count, 0); }
  get activeParticles() { return this.values.reduce((sum, field) => sum + field.activeCount, 0); }
  get activeFieldCount() { return this.values.reduce((sum, field) => sum + (field.activeCount > 0 ? 1 : 0), 0); }
  get completedCount() { return this.values.reduce((sum, field) => sum + (field.isComplete ? 1 : 0), 0); }
  get activeSlotCount() { return this.values.reduce((sum, field) => sum + (field.activeCount > 0 ? field.count : 0), 0); }
  get hasActive() { return this.activeParticles > 0; }
  get newestField() { const values = this.values; return values.length ? values[values.length - 1] : null; }
  get recommendedWarpCap() { return this.hasActive ? SIMULATION.particleExperimentWarpCap : Infinity; }

  clear() {
    this.fields.clear();
    this.lastStepDroppedSeconds = 0;
  }

  remove(id) {
    return this.fields.delete(id);
  }

  _pruneCompleted(maxRetained = 2) {
    const completed = this.values.filter((field) => field.isComplete).sort((a,b) => a.createdAtSimSeconds - b.createdAtSimSeconds);
    while (completed.length > maxRetained) { const field = completed.shift(); this.fields.delete(field.id); }
  }

  _ensureBudget(nextCount) {
    this._pruneCompleted(2);
    if (this.activeFieldCount >= this.maxActiveFields) throw new Error(`Particle-field budget reached (${this.maxActiveFields} active fields). Clear or finish an experiment before spawning another.`);
    if (this.activeSlotCount + nextCount > this.maxTotalParticles) throw new Error(`Particle budget would exceed ${this.maxTotalParticles.toLocaleString()} active slots.`);
  }

  spawnField(context, params) {
    const modeDef = PARTICLE_MODES[params.mode] ?? PARTICLE_MODES.gravity;
    const count = Math.floor(clamp(Number(params.count) || 5_000, 100, modeDef.maxCount));
    this._ensureBudget(count);
    const radiusMeters = clamp(Number(params.radiusMeters) || 2e7, 1e6, 2e8);
    const neighborRadiusMeters = clamp(Number(params.neighborRadiusMeters) || radiusMeters * 0.12, 1e5, radiusMeters);
    const initialSpeedMps = clamp(Number(params.initialSpeedMps) || 1_500, 0, 200_000);
    const localStrengthMps2 = clamp(Number(params.localStrengthMps2) || 20, 0, 250);
    const f = context.ship.forward();
    // Experiments are laboratory objects, not astronomical destinations. Spawn the field just
    // outside its own radius so the ship can see it immediately while OBSERVE can frame it exactly.
    const distance = Math.max(radiusMeters * 1.38, radiusMeters + 1.5e6);
    const origin = new Float64Array([
      context.ship.position[0] + f[0] * distance,
      context.ship.position[1] + f[1] * distance,
      context.ship.position[2] + f[2] * distance,
    ]);
    const id = `particle-field-${this.serial++}`;
    const field = new ParticleExperiment({
      id,
      seed: `${context.system.seed}:particle:${id}`,
      mode: modeDef.id,
      label: `${modeDef.label} ${this.serial - 1}`,
      scientificStatus: modeDef.scientificStatus,
      count,
      radiusMeters,
      neighborRadiusMeters,
      initialSpeedMps,
      localStrengthMps2,
      majorGravity: params.majorGravity !== false,
      origin,
      baseVelocity: context.ship.velocity,
      createdAtSimSeconds: context.clock.elapsedSimSeconds,
    });
    this.fields.set(id, field);
    return field;
  }

  fireGun(context, params) {
    const count = Math.floor(clamp(Number(params.count) || 500, 10, 5_000));
    this._ensureBudget(count);
    const speedMps = clamp(Number(params.speedMps) || 25_000, 0, 1_000_000);
    const spreadDegrees = clamp(Number(params.spreadDegrees) || 4, 0, 60);
    const f = context.ship.forward();
    const origin = new Float64Array([
      context.ship.position[0] + f[0] * 2e6,
      context.ship.position[1] + f[1] * 2e6,
      context.ship.position[2] + f[2] * 2e6,
    ]);
    const id = `particle-gun-${this.gunSerial++}`;
    const field = new ParticleExperiment({
      id,
      seed: `${context.system.seed}:gun:${id}`,
      mode: 'gun',
      label: `Particle Gun ${this.gunSerial - 1}`,
      scientificStatus: 'Ballistic massless test particles with major-body Newtonian gravity. They do not source gravity and are absorbed on finite-radius body contact.',
      count,
      radiusMeters: 2e6,
      neighborRadiusMeters: 2e5,
      initialSpeedMps: speedMps,
      localStrengthMps2: 0,
      majorGravity: true,
      origin,
      baseVelocity: context.ship.velocity,
      forward: f,
      spreadRad: spreadDegrees * Math.PI / 180,
      gunSpawnRadiusMeters: 75_000,
      createdAtSimSeconds: context.clock.elapsedSimSeconds,
    });
    this.fields.set(id, field);
    return field;
  }

  observationState(id) {
    const field = id ? this.fields.get(id) : this.newestField;
    return field?.observationState() ?? null;
  }

  reset(id) {
    const field = this.fields.get(id);
    if (!field) return null;
    const replacement = new ParticleExperiment(field.initialConfig);
    replacement.id = field.id;
    replacement.label = field.label;
    replacement.initialConfig.id = field.id;
    replacement.initialConfig.label = field.label;
    this.fields.set(id, replacement);
    return replacement;
  }

  randomizeArtificialParams(seedText) {
    const rng = createRng(seedText);
    return {
      neighborRadiusFactor: rng.range(0.025, 0.08),
      localStrengthMps2: rng.range(6, 80),
      initialSpeedMps: rng.range(250, 4_000),
    };
  }

  step(dt, gravitySources) {
    let dropped = 0;
    for (const field of this.fields.values()) {
      if (field.isComplete) continue;
      const result = field.step(dt, gravitySources);
      dropped += result.droppedSeconds;
    }
    this.lastStepDroppedSeconds = dropped;
  }

  summaries() {
    return this.values.map((field) => field.summary());
  }
}
