import { hashSeed } from '../util/prng.js';

export const SURFACE_WEATHER_TYPES = Object.freeze({
  clear: { label: 'Clear interval', realityClass: 'known', temperatureOffsetC: 0 },
  'dust-front': { label: 'Dust front', realityClass: 'known', temperatureOffsetC: -2 },
  'fog-bank': { label: 'Low fog bank', realityClass: 'known', temperatureOffsetC: -3 },
  'frost-squall': { label: 'Frost squall', realityClass: 'known', temperatureOffsetC: -8 },
  'electrostatic-storm': { label: 'Electrostatic storm', realityClass: 'speculative', temperatureOffsetC: -4 },
  'upward-rain': { label: 'Upward rain', realityClass: 'impossible', temperatureOffsetC: -2 },
  'shadow-fog': { label: 'Shadow fog', realityClass: 'impossible', temperatureOffsetC: -5 },
  'suspended-lightning': { label: 'Suspended lightning', realityClass: 'impossible', temperatureOffsetC: 1 },
  'sky-fracture': { label: 'Sky fracture', realityClass: 'impossible', temperatureOffsetC: 0 },
});

const NORMAL_TYPES = ['dust-front', 'fog-bank', 'frost-squall', 'electrostatic-storm'];
const ANOMALOUS_TYPES = ['upward-rain', 'shadow-fog', 'suspended-lightning', 'sky-fracture'];

function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function finite(value, fallback) { if (value == null || value === '') return fallback; const n = Number(value); return Number.isFinite(n) ? n : fallback; }

function nextRandom(state) {
  let x = state.rngState >>> 0;
  if (!x) x = 0x6d2b79f5;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17; x >>>= 0;
  x ^= x << 5; x >>>= 0;
  state.rngState = x >>> 0;
  return (state.rngState >>> 0) / 4294967296;
}

function range(state, min, max) { return min + (max - min) * nextRandom(state); }

function chooseEventType(state, region) {
  const anomalyBias = Math.max(0.08, Math.min(0.62, Number(region?.weatherProfile?.anomalyChance) || 0.32));
  const anomalous = nextRandom(state) < anomalyBias;
  const pool = anomalous ? ANOMALOUS_TYPES : NORMAL_TYPES;
  let chosen = pool[Math.floor(nextRandom(state) * pool.length) % pool.length];
  // Region identity nudges normal weather without making every site deterministic in the same way.
  if (!anomalous && region?.weatherProfile?.preferred?.length && nextRandom(state) < 0.56) {
    const preferred = region.weatherProfile.preferred;
    chosen = preferred[Math.floor(nextRandom(state) * preferred.length) % preferred.length];
  }
  return chosen;
}

function scheduleClearInterval(state, region, first = false) {
  const profile = region?.weatherProfile ?? {};
  const min = first ? finite(profile.firstEventMinSeconds, 16) : finite(profile.calmMinSeconds, 28);
  const max = first ? finite(profile.firstEventMaxSeconds, 34) : finite(profile.calmMaxSeconds, 68);
  state.nextEventAtSeconds = state.elapsedSeconds + range(state, min, Math.max(min + 1, max));
}

function startEvent(state, region) {
  const type = chooseEventType(state, region);
  const duration = range(state, 34, 78);
  const intensity = range(state, 0.5, 1);
  const direction = range(state, -Math.PI, Math.PI);
  const baseWind = type === 'fog-bank' || type === 'shadow-fog' ? range(state, 2, 9) : range(state, 12, 38);
  state.eventSerial += 1;
  state.current = {
    type,
    startedAtSeconds: state.elapsedSeconds,
    endsAtSeconds: state.elapsedSeconds + duration,
    intensity,
    windHeadingRad: direction,
    windSpeedMps: baseWind,
    eventSerial: state.eventSerial,
  };
  state.nextEventAtSeconds = Infinity;
}

function clearEvent(state, region) {
  state.current = {
    type: 'clear',
    startedAtSeconds: state.elapsedSeconds,
    endsAtSeconds: Infinity,
    intensity: 0,
    windHeadingRad: state.current?.windHeadingRad ?? 0,
    windSpeedMps: range(state, 0.4, 4.5),
    eventSerial: state.eventSerial,
  };
  scheduleClearInterval(state, region, false);
}

export function createSurfaceWeatherState(region, snapshot = null) {
  const state = {
    version: 1,
    regionId: region?.id ?? null,
    elapsedSeconds: Math.max(0, finite(snapshot?.elapsedSeconds, 0)),
    rngState: (Number(snapshot?.rngState) >>> 0) || (hashSeed(`${region?.seed ?? 'surface'}:surface-weather-v1`) >>> 0) || 1,
    eventSerial: Math.max(0, Math.floor(finite(snapshot?.eventSerial, 0))),
    nextEventAtSeconds: finite(snapshot?.nextEventAtSeconds, NaN),
    current: null,
  };

  if (snapshot?.current && SURFACE_WEATHER_TYPES[snapshot.current.type]) {
    state.current = {
      type: snapshot.current.type,
      startedAtSeconds: finite(snapshot.current.startedAtSeconds, state.elapsedSeconds),
      endsAtSeconds: finite(snapshot.current.endsAtSeconds, Infinity),
      intensity: clamp01(snapshot.current.intensity),
      windHeadingRad: finite(snapshot.current.windHeadingRad, 0),
      windSpeedMps: Math.max(0, finite(snapshot.current.windSpeedMps, 0)),
      eventSerial: Math.max(0, Math.floor(finite(snapshot.current.eventSerial, state.eventSerial))),
    };
    state.eventSerial = Math.max(state.eventSerial, state.current.eventSerial);
    if (!Number.isFinite(state.nextEventAtSeconds) && state.current.type === 'clear') scheduleClearInterval(state, region, false);
  } else {
    state.current = { type: 'clear', startedAtSeconds: state.elapsedSeconds, endsAtSeconds: Infinity, intensity: 0, windHeadingRad: range(state, -Math.PI, Math.PI), windSpeedMps: range(state, 0.4, 4), eventSerial: 0 };
    scheduleClearInterval(state, region, true);
  }
  return state;
}

export function stepSurfaceWeather(state, region, dtSeconds) {
  if (!state || !region || !(dtSeconds > 0)) return state;
  // Bound progression after a background/resume hitch so a tab wake does not skip an entire showcase event.
  state.elapsedSeconds += Math.min(0.25, dtSeconds);
  if (state.current?.type !== 'clear' && state.elapsedSeconds >= state.current.endsAtSeconds) clearEvent(state, region);
  if (state.current?.type === 'clear' && state.elapsedSeconds >= state.nextEventAtSeconds) startEvent(state, region);
  return state;
}

export function serializeSurfaceWeather(state) {
  if (!state) return null;
  return {
    version: 1,
    regionId: state.regionId ?? null,
    elapsedSeconds: Math.max(0, finite(state.elapsedSeconds, 0)),
    rngState: Number(state.rngState) >>> 0,
    eventSerial: Math.max(0, Math.floor(finite(state.eventSerial, 0))),
    nextEventAtSeconds: Number.isFinite(state.nextEventAtSeconds) ? state.nextEventAtSeconds : null,
    current: state.current ? {
      type: state.current.type,
      startedAtSeconds: finite(state.current.startedAtSeconds, 0),
      endsAtSeconds: Number.isFinite(state.current.endsAtSeconds) ? state.current.endsAtSeconds : null,
      intensity: clamp01(state.current.intensity),
      windHeadingRad: finite(state.current.windHeadingRad, 0),
      windSpeedMps: Math.max(0, finite(state.current.windSpeedMps, 0)),
      eventSerial: Math.max(0, Math.floor(finite(state.current.eventSerial, 0))),
    } : null,
  };
}

export function surfaceWeatherReading(state) {
  if (!state?.current) return { type: 'clear', label: 'Clear interval', realityClass: 'known', intensity: 0, windHeadingRad: 0, windSpeedMps: 0, temperatureOffsetC: 0, secondsRemaining: Infinity, nextEventSeconds: Infinity };
  const def = SURFACE_WEATHER_TYPES[state.current.type] ?? SURFACE_WEATHER_TYPES.clear;
  return {
    type: state.current.type,
    label: def.label,
    realityClass: def.realityClass,
    intensity: clamp01(state.current.intensity),
    windHeadingRad: finite(state.current.windHeadingRad, 0),
    windSpeedMps: Math.max(0, finite(state.current.windSpeedMps, 0)),
    temperatureOffsetC: finite(def.temperatureOffsetC, 0) * (state.current.type === 'clear' ? 0 : (0.55 + 0.45 * clamp01(state.current.intensity))),
    secondsRemaining: state.current.type === 'clear' ? Infinity : Math.max(0, finite(state.current.endsAtSeconds, state.elapsedSeconds) - state.elapsedSeconds),
    nextEventSeconds: state.current.type === 'clear' && Number.isFinite(state.nextEventAtSeconds) ? Math.max(0, state.nextEventAtSeconds - state.elapsedSeconds) : Infinity,
  };
}
