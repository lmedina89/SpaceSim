import { PHYSICS } from '../core/constants.js';

function fmt(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export class Hud {
  constructor(root) {
    this.root = root;
    this.fps = root.querySelector('#fpsValue');
    this.renderer = root.querySelector('#rendererValue');
    this.seed = root.querySelector('#seedValue');
    this.simTime = root.querySelector('#simTimeValue');
    this.speed = root.querySelector('#speedValue');
    this.bodyCount = root.querySelector('#bodyCountValue');
    this.minorCount = root.querySelector('#minorCountValue');
    this.physicsMs = root.querySelector('#physicsMsValue');
    this.message = root.querySelector('#message');
    this.lab = root.querySelector('#labPanel');
    this.science = root.querySelector('#sciencePanel');
  }

  setRenderer(name) { this.renderer.textContent = name; }
  setSeed(seed) { this.seed.textContent = seed; }
  toggleLab(force) { this.lab.hidden = typeof force === 'boolean' ? !force : !this.lab.hidden; }
  toggleScience(force) { this.science.hidden = typeof force === 'boolean' ? !force : !this.science.hidden; }
  notify(text) { this.message.textContent = text; }

  update({ fps, elapsedSeconds, shipSpeed, bodyCount, minorCount, physicsMs }) {
    this.fps.textContent = `${Math.round(fps)}`;
    this.simTime.textContent = `${fmt(elapsedSeconds / PHYSICS.DAY, 3)} d`;
    this.speed.textContent = shipSpeed >= 1000 ? `${fmt(shipSpeed / 1000, 2)} km/s` : `${fmt(shipSpeed, 1)} m/s`;
    this.bodyCount.textContent = `${bodyCount}`;
    this.minorCount.textContent = Number(minorCount).toLocaleString();
    this.physicsMs.textContent = `${fmt(physicsMs, 2)} ms`;
  }
}
