import { BODY_KIND, PHYSICS } from '../core/constants.js';
import { createRng, hashSeed } from '../util/prng.js';
import { vec3 } from '../physics/vector.js';

const STAR_NAMES = ['Aster', 'Vesper', 'Orison', 'Nadir', 'Eidra', 'Khepri', 'Ilyon', 'Morrow', 'Sable', 'Caelum'];
const PLANET_TYPES = [
  { id: 'rocky', density: 5400, color: 0x9d7c61 },
  { id: 'oceanic', density: 5100, color: 0x3f82ca },
  { id: 'desert', density: 4800, color: 0xc58a50 },
  { id: 'ice', density: 2200, color: 0xa7d7e8 },
  { id: 'gas', density: 1300, color: 0xb8966d },
];

function massFromRadiusDensity(radius, density) {
  return (4 / 3) * Math.PI * radius ** 3 * density;
}

export function generateSystem(seedText = 'ORIGIN-001') {
  const seed = String(seedText || 'ORIGIN-001').trim().slice(0, 64);
  const rng = createRng(seed);
  const seedHash = hashSeed(seed);
  const starMass = PHYSICS.SOLAR_MASS * rng.range(0.78, 1.18);
  const starRadius = PHYSICS.SOLAR_RADIUS * Math.pow(starMass / PHYSICS.SOLAR_MASS, 0.8);
  const starTemp = Math.round(rng.range(4700, 6400));
  const starName = `${rng.pick(STAR_NAMES)}-${String(seedHash % 9973).padStart(4, '0')}`;

  const bodies = [{
    id: 'star-0',
    kind: BODY_KIND.STAR,
    name: starName,
    mass: starMass,
    radius: starRadius,
    temperatureK: starTemp,
    color: starTemp > 5900 ? 0xffe5b7 : 0xffcf8a,
    position: vec3(0, 0, 0),
    velocity: vec3(0, 0, 0),
    gravitySource: true,
    generated: true,
  }];

  const planetCount = rng.int(5, 9);
  let semiMajor = PHYSICS.AU * rng.range(0.28, 0.52);
  let homeId = null;
  let bestHomeScore = Infinity;

  for (let i = 0; i < planetCount; i += 1) {
    if (i > 0) semiMajor *= rng.range(1.55, 2.05);
    const outer = semiMajor > 2.6 * PHYSICS.AU;
    const type = outer && rng.random() < 0.58 ? PLANET_TYPES[4] : rng.pick(PLANET_TYPES.slice(0, 4));
    const radius = type.id === 'gas'
      ? PHYSICS.JUPITER_RADIUS * rng.range(0.45, 1.15)
      : PHYSICS.EARTH_RADIUS * rng.range(0.45, 1.85);
    const mass = type.id === 'gas'
      ? PHYSICS.JUPITER_MASS * rng.range(0.18, 1.8)
      : massFromRadiusDensity(radius, type.density * rng.range(0.86, 1.13));
    const phase = rng.range(0, Math.PI * 2);
    const inclination = rng.range(-0.035, 0.035);
    const x = Math.cos(phase) * semiMajor;
    const zFlat = Math.sin(phase) * semiMajor;
    const y = zFlat * Math.sin(inclination);
    const z = zFlat * Math.cos(inclination);
    const orbitalSpeed = Math.sqrt(PHYSICS.G * starMass / semiMajor);
    const vx = -Math.sin(phase) * orbitalSpeed;
    const vzFlat = Math.cos(phase) * orbitalSpeed;
    const vy = vzFlat * Math.sin(inclination);
    const vz = vzFlat * Math.cos(inclination);
    const id = `planet-${i + 1}`;
    const equilibriumProxy = semiMajor / Math.sqrt(starMass / PHYSICS.SOLAR_MASS);
    const homeScore = type.id === 'gas' ? Infinity : Math.abs(equilibriumProxy / PHYSICS.AU - 1);
    if (homeScore < bestHomeScore) { bestHomeScore = homeScore; homeId = id; }

    bodies.push({
      id,
      kind: BODY_KIND.PLANET,
      name: `${starName} ${String.fromCharCode(98 + i)}`,
      planetType: type.id,
      mass,
      radius,
      semiMajorAxis: semiMajor,
      color: type.color,
      position: vec3(x, y, z),
      velocity: vec3(vx, vy, vz),
      gravitySource: true,
      generated: true,
      landable: false,
    });
  }

  const home = bodies.find((body) => body.id === homeId) ?? bodies[1];
  home.landable = true;
  home.homeCandidate = true;

  // Put the barycenter approximately at rest by balancing total momentum in the star.
  let px = 0, py = 0, pz = 0;
  for (let i = 1; i < bodies.length; i += 1) {
    px += bodies[i].mass * bodies[i].velocity[0];
    py += bodies[i].mass * bodies[i].velocity[1];
    pz += bodies[i].mass * bodies[i].velocity[2];
  }
  bodies[0].velocity[0] = -px / starMass;
  bodies[0].velocity[1] = -py / starMass;
  bodies[0].velocity[2] = -pz / starMass;

  return {
    schemaVersion: 1,
    seed,
    seedHash,
    starName,
    homeId: home.id,
    bodies,
    metadata: {
      generatedAtRuntime: true,
      scientificModel: 'Newtonian point-mass N-body with finite-radius collision monitoring',
    },
  };
}
