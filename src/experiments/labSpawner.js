import { BODY_KIND, PHYSICS, schwarzschildRadius } from '../core/constants.js';
import { vec3 } from '../physics/vector.js';

function sphereRadiusFromMass(mass, density) {
  return Math.cbrt((3 * mass) / (4 * Math.PI * density));
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
    name: 'Launch basalt asteroid',
    scientificStatus: 'Newtonian trajectory; impact effects not yet simulated',
    run(context, params) {
      const mass = Math.max(1e8, Math.min(Number(params.massKg) || 1e15, 1e22));
      const speed = Math.max(0, Math.min(Number(params.speedMps) || 25_000, 300_000));
      const placement = spawnInFront(context, 2.5e8, speed);
      return context.addBody({
        kind: BODY_KIND.ASTEROID,
        name: `LAB Asteroid ${context.userBodySerial++}`,
        mass,
        radius: sphereRadiusFromMass(mass, 3000),
        color: 0x9d8065,
        gravitySource: true,
        generated: false,
        ...placement,
      });
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
