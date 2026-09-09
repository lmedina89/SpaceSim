export const SURFACE_PHASE = Object.freeze({
  ORBIT: 'orbit',
  DESCENDING: 'descending',
  LANDED: 'landed',
  ASCENDING: 'ascending',
});

export const SURFACE_TRANSITION_SECONDS = Object.freeze({
  descent: 1.65,
  ascent: 1.75,
});

export function createLandingTransition() {
  return {
    phase: SURFACE_PHASE.ORBIT,
    elapsedSeconds: 0,
    durationSeconds: 0,
    bodyId: null,
    regionId: null,
    serial: 0,
  };
}

export function beginLandingTransition(state, phase, { durationSeconds = 0, bodyId = null, regionId = null } = {}) {
  if (!state) throw new Error('Landing transition state is required.');
  if (![SURFACE_PHASE.ORBIT, SURFACE_PHASE.DESCENDING, SURFACE_PHASE.LANDED, SURFACE_PHASE.ASCENDING].includes(phase)) {
    throw new Error(`Unknown surface phase: ${phase}`);
  }
  state.phase = phase;
  state.elapsedSeconds = 0;
  state.durationSeconds = Math.max(0, Number(durationSeconds) || 0);
  state.bodyId = bodyId ?? null;
  state.regionId = regionId ?? null;
  state.serial = (Number(state.serial) || 0) + 1;
  return state;
}

export function setLandingPhase(state, phase, identity = {}) {
  return beginLandingTransition(state, phase, { ...identity, durationSeconds: 0 });
}

export function stepLandingTransition(state, dt) {
  if (!state) return { phase: SURFACE_PHASE.ORBIT, progress: 1, completed: false };
  const transitioning = state.phase === SURFACE_PHASE.DESCENDING || state.phase === SURFACE_PHASE.ASCENDING;
  if (!transitioning) return { phase: state.phase, progress: 1, completed: false };
  state.elapsedSeconds += Math.max(0, Number(dt) || 0);
  const duration = Math.max(1e-6, state.durationSeconds || 0);
  const progress = Math.max(0, Math.min(1, state.elapsedSeconds / duration));
  return { phase: state.phase, progress, completed: progress >= 1, serial: state.serial };
}

export function transitionProgress(state) {
  if (!state) return 1;
  if (state.phase !== SURFACE_PHASE.DESCENDING && state.phase !== SURFACE_PHASE.ASCENDING) return 1;
  return Math.max(0, Math.min(1, state.elapsedSeconds / Math.max(1e-6, state.durationSeconds || 0)));
}

export function isSurfaceTransitioning(state) {
  return state?.phase === SURFACE_PHASE.DESCENDING || state?.phase === SURFACE_PHASE.ASCENDING;
}

export function canEnterSurface(state) {
  return !state || state.phase === SURFACE_PHASE.ORBIT;
}

export function canWalkSurface(state) {
  return state?.phase === SURFACE_PHASE.LANDED;
}

export function canRequestTakeoff(state) {
  return state?.phase === SURFACE_PHASE.LANDED;
}
