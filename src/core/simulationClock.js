import { SIMULATION } from './constants.js';

export class SimulationClock {
  constructor() {
    this.elapsedSimSeconds = 0;
    this.timeScale = 60;
    this.paused = false;
  }

  setTimeScale(scale) {
    const n = Number(scale);
    this.timeScale = Number.isFinite(n) ? Math.max(0, Math.min(n, 1_000_000)) : 1;
  }

  advance(realDeltaSeconds, stepFn) {
    if (this.paused || this.timeScale === 0) return 0;
    const realDt = Math.min(Math.max(realDeltaSeconds, 0), SIMULATION.maxFrameDeltaSeconds);
    let remaining = realDt * this.timeScale;
    let steps = 0;
    while (remaining > 0) {
      const dt = Math.min(remaining, SIMULATION.maxPhysicsSubstepSeconds);
      stepFn(dt);
      this.elapsedSimSeconds += dt;
      remaining -= dt;
      steps += 1;
      if (steps > 128) break;
    }
    return steps;
  }
}
