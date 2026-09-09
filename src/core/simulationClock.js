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

  advance(realDeltaSeconds, stepFn, maxSubstepSeconds = SIMULATION.maxPhysicsSubstepSeconds) {
    if (this.paused || this.timeScale === 0) return 0;
    const realDt = Math.min(Math.max(realDeltaSeconds, 0), SIMULATION.maxFrameDeltaSeconds);
    let remaining = realDt * this.timeScale;
    let steps = 0;
    const substepLimit = Math.max(1e-4, Math.min(SIMULATION.maxPhysicsSubstepSeconds, Number(maxSubstepSeconds) || SIMULATION.maxPhysicsSubstepSeconds));
    while (remaining > 0) {
      const dt = Math.min(remaining, substepLimit);
      const keepGoing = stepFn(dt);
      this.elapsedSimSeconds += dt;
      remaining -= dt;
      steps += 1;
      if (keepGoing === false || this.paused || steps > 512) break;
    }
    return steps;
  }
}
