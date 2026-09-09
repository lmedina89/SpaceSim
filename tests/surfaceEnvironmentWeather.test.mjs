import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import { availableSurfaceRegions, generateSurfaceRegion, surfaceHeightAt } from '../src/surface/surfaceGenerator.js';
import { createSurfaceSession, serializeSurfaceSession } from '../src/surface/surfaceSession.js';
import { SURFACE_WEATHER_TYPES, createSurfaceWeatherState, stepSurfaceWeather, serializeSurfaceWeather, surfaceWeatherReading } from '../src/surface/surfaceWeather.js';

function home(seed = 'ORIGIN-001') {
  const system = generateSystem(seed);
  const body = system.bodies.find((entry) => entry.id === system.homeId);
  assert.ok(body?.landable);
  return { system, body };
}

test('first landable world exposes three deterministic surface regions', () => {
  const { system, body } = home('ENV-REGIONS');
  const regions = availableSurfaceRegions(system, body);
  assert.deepEqual(regions.map((entry) => entry.id), ['shatterfall-basin', 'glasswind-flats', 'frostscar-rise']);
  const generated = regions.map((entry) => generateSurfaceRegion(system, body, entry.id));
  assert.equal(new Set(generated.map((entry) => entry.id)).size, 3);
  for (const region of generated) {
    assert.ok(region.weatherProfile);
    assert.ok(region.landedShip);
    assert.ok(Number.isFinite(surfaceHeightAt(region, region.landedShip.x, region.landedShip.z)));
    assert.ok(region.normalPois.length >= 2);
    assert.ok(region.anomalies.length >= 4);
  }
});

test('surface weather timeline is deterministic for equal seed and time steps', () => {
  const { system, body } = home('ENV-WEATHER-DETERMINISM');
  const region = generateSurfaceRegion(system, body, 'shatterfall-basin');
  const a = createSurfaceWeatherState(region);
  const b = createSurfaceWeatherState(region);
  for (let i = 0; i < 3600; i += 1) {
    stepSurfaceWeather(a, region, 1 / 60);
    stepSurfaceWeather(b, region, 1 / 60);
  }
  assert.deepEqual(serializeSurfaceWeather(a), serializeSurfaceWeather(b));
  assert.deepEqual(surfaceWeatherReading(a), surfaceWeatherReading(b));
});

test('surface weather survives save/load with event progress intact', () => {
  const { system, body } = home('ENV-WEATHER-SAVE');
  const region = generateSurfaceRegion(system, body, 'frostscar-rise');
  const session = createSurfaceSession(region);
  for (let i = 0; i < 4200; i += 1) stepSurfaceWeather(session.weather, region, 1 / 60);
  const before = serializeSurfaceWeather(session.weather);
  const snapshot = serializeSurfaceSession(session);
  const restored = createSurfaceSession(region, snapshot);
  assert.deepEqual(serializeSurfaceWeather(restored.weather), before);
  stepSurfaceWeather(session.weather, region, 0.2);
  stepSurfaceWeather(restored.weather, region, 0.2);
  assert.deepEqual(serializeSurfaceWeather(restored.weather), serializeSurfaceWeather(session.weather));
});

test('weather library explicitly separates ordinary and impossible events', () => {
  const ordinary = Object.values(SURFACE_WEATHER_TYPES).filter((entry) => entry.realityClass === 'known');
  const impossible = Object.entries(SURFACE_WEATHER_TYPES).filter(([, entry]) => entry.realityClass === 'impossible');
  assert.ok(ordinary.length >= 4);
  assert.deepEqual(impossible.map(([key]) => key).sort(), ['shadow-fog', 'sky-fracture', 'suspended-lightning', 'upward-rain']);
});
