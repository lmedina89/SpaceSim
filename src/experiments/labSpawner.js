import { BODY_KIND, PHYSICS, schwarzschildRadius } from '../core/constants.js';
import { vec3 } from '../physics/vector.js';

export const MATERIALS = Object.freeze({
  porousRock: { id: 'porousRock', label: 'Porous rock', densityKgM3: 1600, color: 0x8f806f },
  ice: { id: 'ice', label: 'Water ice', densityKgM3: 917, color: 0xb6dceb },
  basalt: { id: 'basalt', label: 'Basalt', densityKgM3: 3000, color: 0x75675e },
  iron: { id: 'iron', label: 'Iron-rich', densityKgM3: 7800, color: 0x8f969c },
});

export function sphereRadiusFromMassDensity(mass, density) {
  return Math.cbrt((3 * mass) / (4 * Math.PI * density));
}

export function asteroidDefinitionFromParams(context, params, { addSerial = false } = {}) {
  const mass = Math.max(1e8, Math.min(Number(params.massKg) || 1e15, 1e24));
  const preset = MATERIALS[params.material] ?? MATERIALS.basalt;
  const density = Math.max(100, Math.min(Number(params.densityKgM3) || preset.densityKgM3, 30_000));
  const speed = Math.max(0, Math.min(Number(params.speedMps) || 25_000, 1_000_000));
  const radius = sphereRadiusFromMassDensity(mass, density);
  const spawnDistance = Math.max(radius * 4, Math.min(2.5e8, Math.max(5e6, radius * 20)));
  const f = context.ship.forward();
  return {
    kind: BODY_KIND.ASTEROID,
    name: addSerial ? `LAB Asteroid ${context.userBodySerial++}` : 'Launch Preview',
    mass,
    radius,
    densityKgM3: density,
    materialId: preset.id,
    color: preset.color,
    gravitySource: true,
    generated: false,
    position: vec3(
      context.ship.position[0] + f[0] * spawnDistance,
      context.ship.position[1] + f[1] * spawnDistance,
      context.ship.position[2] + f[2] * spawnDistance,
    ),
    velocity: vec3(
      context.ship.velocity[0] + f[0] * speed,
      context.ship.velocity[1] + f[1] * speed,
      context.ship.velocity[2] + f[2] * speed,
    ),
  };
}

function spawnInFront(context, distanceMeters, speedMetersPerSecond) {
  const f = context.ship.forward();
  return {
    position: vec3(
      context.ship.position[0] + f[0] * distanceMeters,
      context.ship.position[1] + f[1] * distanceMeters,
      context.ship.position[2] + f[2] * distanceMeters,
    ),
    velocity: vec3(
      context.ship.velocity[0] + f[0] * speedMetersPerSecond,
      context.ship.velocity[1] + f[1] * speedMetersPerSecond,
      context.ship.velocity[2] + f[2] * speedMetersPerSecond,
    ),
  };
}

export function registerLabExperiments(registry) {
  registry.register({
    id: 'spawn-asteroid',
    name: 'Launch configured asteroid',
    scientificStatus: 'Live mutual Newtonian trajectory after launch; finite-radius contact monitoring',
    run(context, params) {
      return context.addBody(asteroidDefinitionFromParams(context, params, { addSerial: true }));
    },
  });

  registry.register({
    id: 'spawn-black-hole',
    name: 'Spawn black-hole mass',
    scientificStatus: 'Newtonian gravity only; no general-relativistic trajectories near horizon',
    run(context, params) {
      const solarMasses = Math.max(0.1, Math.min(Number(params.solarMasses) || 3, 100));
      const mass = solarMasses * PHYSICS.SOLAR_MASS;
      const placement = spawnInFront(context, 1.2e10, 0);
      return context.addBody({
        kind: BODY_KIND.BLACK_HOLE,
        name: `LAB Black Hole ${context.userBodySerial++}`,
        mass,
        radius: schwarzschildRadius(mass),
        visualRadiusMeters: 2.2e8,
        color: 0x7658ff,
        gravitySource: true,
        generated: false,
        scientificWarning: 'Newtonian gravity approximation outside the event-horizon visualization.',
        ...placement,
      });
    },
  });
}
