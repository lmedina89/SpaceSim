import { BODY_KIND, PHYSICS } from '../core/constants.js';
import { createRng, hashSeed } from '../util/prng.js';
import { vec3 } from '../physics/vector.js';
import { generateCosmicPhenomena } from '../cosmic/phenomenonGenerator.js';
import { generateAnomalies } from '../cosmic/anomalyGenerator.js';
import { breakupPeriodSeconds, bulkDensityKgM3, gasGiantPropertiesFromSamples } from '../physics/planetaryProperties.js';

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

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalized3(source, fallback = [0, 1, 0]) {
  const magnitude = Math.hypot(Number(source?.[0]) || 0, Number(source?.[1]) || 0, Number(source?.[2]) || 0);
  if (!(magnitude > 1e-12)) return [...fallback];
  return [source[0] / magnitude, source[1] / magnitude, source[2] / magnitude];
}

function parentRelativeState(body, parent) {
  return {
    position: [
      body.position[0] - parent.position[0],
      body.position[1] - parent.position[1],
      body.position[2] - parent.position[2],
    ],
    velocity: [
      body.velocity[0] - parent.velocity[0],
      body.velocity[1] - parent.velocity[1],
      body.velocity[2] - parent.velocity[2],
    ],
  };
}

function orbitalNormal(body, parent) {
  if (!body?.position || !body?.velocity || !parent?.position || !parent?.velocity) return [0, -1, 0];
  const relative = parentRelativeState(body, parent);
  return normalized3(cross3(relative.position, relative.velocity), [0, -1, 0]);
}

function tiltedAxis(referenceAxis, tiltRad, azimuthRad) {
  const axis = normalized3(referenceAxis);
  const reference = Math.abs(axis[1]) < 0.94 ? [0, 1, 0] : [0, 0, 1];
  const tangentX = normalized3(cross3(reference, axis), [1, 0, 0]);
  const tangentZ = normalized3(cross3(axis, tangentX), [0, 0, 1]);
  const s = Math.sin(tiltRad);
  const c = Math.cos(tiltRad);
  return normalized3([
    axis[0] * c + s * (tangentX[0] * Math.cos(azimuthRad) + tangentZ[0] * Math.sin(azimuthRad)),
    axis[1] * c + s * (tangentX[1] * Math.cos(azimuthRad) + tangentZ[1] * Math.sin(azimuthRad)),
    axis[2] * c + s * (tangentX[2] * Math.cos(azimuthRad) + tangentZ[2] * Math.sin(azimuthRad)),
  ], axis);
}

function zeroMeridianBasis(axis) {
  const reference = Math.abs(axis[1]) < 0.94 ? [0, 1, 0] : [0, 0, 1];
  const zeroX = normalized3(cross3(reference, axis), [1, 0, 0]);
  const zeroZ = normalized3(cross3(axis, zeroX), [0, 0, 1]);
  return { zeroX, zeroZ };
}

function planetRotationMetadata(rng, planet, parent) {
  const gas = planet.planetType === 'gas';
  const extremeTilt = rng.random() < 0.09;
  const poleTiltRad = extremeTilt
    ? rng.range(0.90, 1.52)
    : rng.range(0, gas ? 0.48 : 0.72);
  const direction = rng.random() < 0.08 ? -1 : 1;
  const progradeNormal = orbitalNormal(planet, parent);
  const referencePole = direction > 0 ? progradeNormal : progradeNormal.map((value) => -value);
  const spinAxis = tiltedAxis(referencePole, poleTiltRad, rng.range(0, Math.PI * 2));
  const sampledPeriodSeconds = PHYSICS.DAY * (gas ? rng.range(0.29, 0.82) : rng.range(0.38, 3.2));
  const breakupFloor = (breakupPeriodSeconds(planet.mass, planet.radius) ?? 0) * 1.15;
  const rotationPeriodSeconds = Math.max(sampledPeriodSeconds, breakupFloor);
  const physicalObliquityRad = Math.acos(Math.max(-1, Math.min(1, dot3(spinAxis, progradeNormal))));
  return {
    rotationPeriodSeconds,
    rotationDirection: direction,
    rotationAxisInertial: spinAxis,
    rotationPhaseRad: rng.range(0, Math.PI * 2),
    rotationEpochSeconds: 0,
    axialTiltRad: physicalObliquityRad,
    rotationModel: 'rigid-orbital-v2',
  };
}

function moonRotationMetadata(planet, moon) {
  const relative = parentRelativeState(moon, planet);
  const spinAxis = normalized3(cross3(relative.position, relative.velocity), [0, -1, 0]);
  const orbitalPeriodSeconds = 2 * Math.PI * Math.sqrt(
    (moon.semiMajorAxis ** 3) / (PHYSICS.G * Math.max(1, planet.mass + moon.mass)),
  );
  const parentDirection = normalized3(relative.position.map((value) => -value), [1, 0, 0]);
  const { zeroX, zeroZ } = zeroMeridianBasis(spinAxis);
  const rotationPhaseRad = Math.atan2(dot3(parentDirection, zeroZ), dot3(parentDirection, zeroX));
  return {
    rotationPeriodSeconds: orbitalPeriodSeconds,
    rotationDirection: 1,
    rotationAxisInertial: spinAxis,
    rotationPhaseRad,
    rotationEpochSeconds: 0,
    axialTiltRad: 0,
    rotationModel: 'synchronous-orbital-v2',
  };
}

function spectralClass(tempK) {
  if (tempK >= 7500) return 'A';
  if (tempK >= 6000) return 'F';
  if (tempK >= 5200) return 'G';
  if (tempK >= 3700) return 'K';
  return 'M';
}

function orbitalState(mu, semiMajorAxis, eccentricity, trueAnomaly, inclination, node) {
  const p = semiMajorAxis * (1 - eccentricity * eccentricity);
  const r = p / (1 + eccentricity * Math.cos(trueAnomaly));
  const speedScale = Math.sqrt(mu / p);
  const x0 = r * Math.cos(trueAnomaly);
  const z0 = r * Math.sin(trueAnomaly);
  const vx0 = -speedScale * Math.sin(trueAnomaly);
  const vz0 = speedScale * (eccentricity + Math.cos(trueAnomaly));
  const ci = Math.cos(inclination), si = Math.sin(inclination);
  const cn = Math.cos(node), sn = Math.sin(node);

  const xi = x0;
  const yi = z0 * si;
  const zi = z0 * ci;
  const vxi = vx0;
  const vyi = vz0 * si;
  const vzi = vz0 * ci;

  return {
    position: vec3(xi * cn + zi * sn, yi, -xi * sn + zi * cn),
    velocity: vec3(vxi * cn + vzi * sn, vyi, -vxi * sn + vzi * cn),
  };
}

function selectPlanetType(rng, semiMajorAxis, snowLine) {
  if (semiMajorAxis > snowLine && rng.random() < 0.58) return PLANET_TYPES[4];
  if (semiMajorAxis > snowLine * 0.65 && rng.random() < 0.42) return PLANET_TYPES[3];
  const u = rng.random();
  if (u < 0.22) return PLANET_TYPES[1];
  if (u < 0.48) return PLANET_TYPES[2];
  if (u < 0.82) return PLANET_TYPES[0];
  return PLANET_TYPES[3];
}

function moonDefinitions(rng, starMass, planet, basePosition, baseVelocity, planetIndex) {
  const planetA = planet.semiMajorAxis;
  const hill = planetA * (1 - planet.eccentricity) * Math.cbrt(planet.mass / (3 * starMass));
  const minOrbit = Math.max(planet.radius * 4.5, 2.5e7);
  const maxOrbit = Math.min(hill * 0.18, planet.radius * (planet.planetType === 'gas' ? 85 : 45));
  if (!(maxOrbit > minOrbit * 1.25)) return { planetPosition: basePosition, planetVelocity: baseVelocity, moons: [] };

  let count = 0;
  if (planet.planetType === 'gas') count = rng.int(1, 3);
  else if (rng.random() < 0.58) count = rng.random() < 0.18 ? 2 : 1;
  const moonData = [];
  let orbit = minOrbit * rng.range(1.05, 1.35);

  for (let i = 0; i < count; i += 1) {
    if (i > 0) orbit *= rng.range(1.8, 2.8);
    if (orbit >= maxOrbit) break;
    const fraction = planet.planetType === 'gas' ? rng.range(2e-6, 1.6e-4) : rng.range(2e-5, 0.012);
    const mass = planet.mass * fraction;
    const density = planet.planetType === 'gas' ? rng.range(1600, 3400) : rng.range(2100, 4100);
    const radius = Math.cbrt((3 * mass) / (4 * Math.PI * density));
    const e = rng.range(0, 0.035);
    const nu = rng.range(0, Math.PI * 2);
    const inc = rng.range(-0.08, 0.08);
    const node = rng.range(0, Math.PI * 2);
    const state = orbitalState(PHYSICS.G * (planet.mass + mass), orbit, e, nu, inc, node);
    moonData.push({
      id: `moon-${planetIndex + 1}-${i + 1}`,
      kind: BODY_KIND.MOON,
      name: `${planet.name}-${String.fromCharCode(65 + i)}`,
      mass,
      radius,
      densityKgM3: density,
      physicalPropertyModel: 'bulk-density-v1',
      semiMajorAxis: orbit,
      eccentricity: e,
      color: planet.planetType === 'ice' ? 0xb9ddea : 0x9d9990,
      gravitySource: true,
      generated: true,
      relativePosition: state.position,
      relativeVelocity: state.velocity,
    });
  }

  if (!moonData.length) return { planetPosition: basePosition, planetVelocity: baseVelocity, moons: [] };
  const totalMass = planet.mass + moonData.reduce((sum, moon) => sum + moon.mass, 0);
  const positionCorrection = vec3();
  const velocityCorrection = vec3();
  for (const moon of moonData) {
    positionCorrection[0] += moon.mass * moon.relativePosition[0];
    positionCorrection[1] += moon.mass * moon.relativePosition[1];
    positionCorrection[2] += moon.mass * moon.relativePosition[2];
    velocityCorrection[0] += moon.mass * moon.relativeVelocity[0];
    velocityCorrection[1] += moon.mass * moon.relativeVelocity[1];
    velocityCorrection[2] += moon.mass * moon.relativeVelocity[2];
  }
  const planetPosition = vec3(
    basePosition[0] - positionCorrection[0] / totalMass,
    basePosition[1] - positionCorrection[1] / totalMass,
    basePosition[2] - positionCorrection[2] / totalMass,
  );
  const planetVelocity = vec3(
    baseVelocity[0] - velocityCorrection[0] / totalMass,
    baseVelocity[1] - velocityCorrection[1] / totalMass,
    baseVelocity[2] - velocityCorrection[2] / totalMass,
  );

  const moons = moonData.map((moon) => ({
    ...moon,
    position: vec3(
      planetPosition[0] + moon.relativePosition[0],
      planetPosition[1] + moon.relativePosition[1],
      planetPosition[2] + moon.relativePosition[2],
    ),
    velocity: vec3(
      planetVelocity[0] + moon.relativeVelocity[0],
      planetVelocity[1] + moon.relativeVelocity[1],
      planetVelocity[2] + moon.relativeVelocity[2],
    ),
    parentId: planet.id,
  }));
  for (const moon of moons) { delete moon.relativePosition; delete moon.relativeVelocity; }
  return { planetPosition, planetVelocity, moons };
}


function cometDefinitions(rng, starMass, starName, count = 2) {
  const comets = [];
  for (let i = 0; i < count; i += 1) {
    const eccentricity = rng.range(0.72, 0.94);
    const periapsis = PHYSICS.AU * rng.range(0.38, 1.85);
    const semiMajorAxis = periapsis / (1 - eccentricity);
    const anomaly = rng.range(Math.PI * 0.72, Math.PI * 1.28);
    const inclination = rng.range(-0.42, 0.42);
    const node = rng.range(0, Math.PI * 2);
    const radius = rng.range(2_000, 15_000);
    const density = rng.range(450, 850);
    const mass = massFromRadiusDensity(radius, density);
    const state = orbitalState(PHYSICS.G * (starMass + mass), semiMajorAxis, eccentricity, anomaly, inclination, node);
    comets.push({
      id: `comet-${i + 1}`,
      kind: BODY_KIND.COMET,
      name: `${starName} C${i + 1}`,
      mass,
      radius,
      densityKgM3: density,
      physicalPropertyModel: 'bulk-density-v1',
      semiMajorAxis,
      eccentricity,
      inclinationRad: inclination,
      color: i % 2 ? 0xc8e8ff : 0xd8f5ff,
      gravitySource: true,
      generated: true,
      materialId: 'ice',
      scientificWarning: 'Nucleus follows live Newtonian N-body gravity. Dust/ion tail is a visual activity proxy, not a gas/plasma solver.',
      position: state.position,
      velocity: state.velocity,
    });
  }
  return comets;
}

function roguePlanetDefinition(rng, starName, starMass) {
  const mass = PHYSICS.EARTH_MASS * rng.range(0.35, 4.5);
  const density = rng.range(3800, 7200);
  const radius = Math.cbrt((3 * mass) / (4 * Math.PI * density));
  const distance = PHYSICS.AU * rng.range(14, 34);
  const a = rng.range(0, Math.PI * 2);
  const y = rng.range(-0.18, 0.18) * distance;
  const planar = Math.sqrt(Math.max(0, distance * distance - y * y));
  const sampledSpeed = rng.range(9_000, 32_000);
  const escapeSpeed = Math.sqrt(2 * PHYSICS.G * (starMass + mass) / distance);
  const speed = Math.max(sampledSpeed, escapeSpeed * 1.08);
  const tangent = [-Math.sin(a), rng.range(-0.18, 0.18), Math.cos(a)];
  const tm = Math.hypot(...tangent) || 1;
  return {
    id: 'rogue-planet-1',
    kind: BODY_KIND.ROGUE_PLANET,
    name: `${starName} Rogue-1`,
    mass,
    radius,
    visualRadiusMeters: Math.max(radius, 1.1e8),
    densityKgM3: density,
    color: 0x263d58,
    gravitySource: true,
    generated: true,
    landable: false,
    surfaceProfile: 'orbital-only',
    physicalPropertyModel: 'bulk-density-v1',
    rogueOrbitModel: 'positive-energy-v2',
    scientificWarning: 'Seeded unbound interstellar/rogue body with live Newtonian mass and positive two-body orbital energy relative to the primary star. Thermal history and scattering/capture origin are not modeled.',
    position: vec3(Math.cos(a) * planar, y, Math.sin(a) * planar),
    velocity: vec3(tangent[0] / tm * speed, tangent[1] / tm * speed, tangent[2] / tm * speed),
  };
}

function assignRotationMetadata(seed, bodies) {
  const byId = new Map(bodies.map((body) => [body.id, body]));
  const star = bodies.find((body) => body.kind === BODY_KIND.STAR) ?? null;
  for (const body of bodies) {
    if (body.kind === BODY_KIND.PLANET && star) {
      Object.assign(body, planetRotationMetadata(createRng(`${seed}:rotation:${body.id}:v2`), body, star));
    } else if (body.kind === BODY_KIND.MOON) {
      const parent = byId.get(body.parentId);
      if (parent) Object.assign(body, moonRotationMetadata(parent, body));
    }
  }
}

function shiftToBarycentricFrame(bodies) {
  let totalMass = 0, cx = 0, cy = 0, cz = 0, cvx = 0, cvy = 0, cvz = 0;
  for (const body of bodies) {
    totalMass += body.mass;
    cx += body.mass * body.position[0]; cy += body.mass * body.position[1]; cz += body.mass * body.position[2];
    cvx += body.mass * body.velocity[0]; cvy += body.mass * body.velocity[1]; cvz += body.mass * body.velocity[2];
  }
  cx /= totalMass; cy /= totalMass; cz /= totalMass;
  cvx /= totalMass; cvy /= totalMass; cvz /= totalMass;
  for (const body of bodies) {
    body.position[0] -= cx; body.position[1] -= cy; body.position[2] -= cz;
    body.velocity[0] -= cvx; body.velocity[1] -= cvy; body.velocity[2] -= cvz;
  }
}

export function generateSystem(seedText = 'ORIGIN-001') {
  const seed = String(seedText || 'ORIGIN-001').trim().slice(0, 64);
  const rng = createRng(seed);
  const seedHash = hashSeed(seed);
  const massRatio = rng.range(0.68, 1.28);
  const starMass = PHYSICS.SOLAR_MASS * massRatio;
  const starRadius = PHYSICS.SOLAR_RADIUS * Math.pow(massRatio, 0.8);
  const starTemp = Math.round(5772 * Math.pow(massRatio, 0.50));
  const luminositySolar = Math.pow(massRatio, 3.5);
  const starName = `${rng.pick(STAR_NAMES)}-${String(seedHash % 9973).padStart(4, '0')}`;
  const starClass = spectralClass(starTemp);
  const snowLine = 2.7 * Math.sqrt(luminositySolar) * PHYSICS.AU;
  const habitableProxy = Math.sqrt(luminositySolar) * PHYSICS.AU;

  const bodies = [{
    id: 'star-0',
    kind: BODY_KIND.STAR,
    name: starName,
    mass: starMass,
    radius: starRadius,
    temperatureK: starTemp,
    luminositySolar,
    spectralClass: starClass,
    color: starTemp > 6200 ? 0xfff0d8 : starTemp > 5300 ? 0xffdfaa : 0xffbd78,
    position: vec3(0, 0, 0),
    velocity: vec3(0, 0, 0),
    gravitySource: true,
    generated: true,
  }];

  const planetCount = rng.int(5, 9);
  let semiMajor = PHYSICS.AU * rng.range(0.30, 0.54);
  let homeId = null;
  let bestHomeScore = Infinity;

  for (let i = 0; i < planetCount; i += 1) {
    if (i > 0) semiMajor *= rng.range(1.52, 1.92);
    const type = selectPlanetType(rng, semiMajor, snowLine);
    // Preserve the legacy RNG call sequence while making gas-giant mass/radius/density coherent.
    const radiusSample = type.id === 'gas' ? rng.range(0.42, 1.18) : rng.range(0.42, 1.78);
    const densitySample = rng.range(0.86, 1.13);
    const gasMassSample = type.id === 'gas' ? rng.range(0.16, 1.65) : null;
    let radius;
    let density;
    let mass;
    let physicalPropertyModel;
    if (type.id === 'gas') {
      const structure01 = (radiusSample - 0.42) / (1.18 - 0.42);
      const density01 = (densitySample - 0.86) / (1.13 - 0.86);
      const properties = gasGiantPropertiesFromSamples(PHYSICS.JUPITER_MASS * gasMassSample, structure01, density01);
      ({ radius, densityKgM3: density, mass } = properties);
      physicalPropertyModel = properties.model;
    } else {
      radius = PHYSICS.EARTH_RADIUS * radiusSample;
      density = type.density * densitySample;
      mass = massFromRadiusDensity(radius, density);
      density = bulkDensityKgM3(mass, radius);
      physicalPropertyModel = 'bulk-density-v1';
    }
    const eccentricity = rng.range(0.002, 0.075);
    const anomaly = rng.range(0, Math.PI * 2);
    const inclination = rng.range(-0.045, 0.045);
    const node = rng.range(0, Math.PI * 2);
    const state = orbitalState(PHYSICS.G * (starMass + mass), semiMajor, eccentricity, anomaly, inclination, node);
    const id = `planet-${i + 1}`;
    const planet = {
      id,
      kind: BODY_KIND.PLANET,
      name: `${starName} ${String.fromCharCode(98 + i)}`,
      planetType: type.id,
      mass,
      radius,
      densityKgM3: density,
      physicalPropertyModel,
      semiMajorAxis: semiMajor,
      eccentricity,
      inclinationRad: inclination,
      color: type.color,
      position: state.position,
      velocity: state.velocity,
      gravitySource: true,
      generated: true,
      landable: false,
      surfaceProfile: 'orbital-only',
      surfaceRegionId: null,
    };

    const moonResult = moonDefinitions(rng, starMass, planet, state.position, state.velocity, i);
    planet.position = moonResult.planetPosition;
    planet.velocity = moonResult.planetVelocity;
    bodies.push(planet, ...moonResult.moons);

    const homeScore = type.id === 'gas' ? Infinity : Math.abs(semiMajor / habitableProxy - 1);
    if (homeScore < bestHomeScore) { bestHomeScore = homeScore; homeId = id; }
  }

  const home = bodies.find((body) => body.id === homeId) ?? bodies.find((body) => body.kind === BODY_KIND.PLANET);
  home.landable = true;
  home.homeCandidate = true;
  home.surfaceProfile = 'anomalous-showcase-v1';
  home.surfaceRegionId = 'shatterfall-basin';

  // A second non-gas world may be marked as a future detailed-surface candidate, but no terrain is generated yet.
  const candidates = bodies
    .filter((body) => body.kind === BODY_KIND.PLANET && body.id !== home.id && body.planetType !== 'gas')
    .sort((a, b) => Math.abs(a.semiMajorAxis / habitableProxy - 1) - Math.abs(b.semiMajorAxis / habitableProxy - 1));
  if (candidates[0]) candidates[0].surfaceProfile = 'selected-future-surface';

  const cometCount = rng.random() < 0.42 ? 1 : 2;
  bodies.push(...cometDefinitions(rng, starMass, starName, cometCount));
  if (rng.random() < 0.62) bodies.push(roguePlanetDefinition(rng, starName, starMass));

  shiftToBarycentricFrame(bodies);
  assignRotationMetadata(seed, bodies);
  const phenomena = [...generateCosmicPhenomena(seed, bodies), ...generateAnomalies(seed, bodies)];

  return {
    schemaVersion: 1,
    seed,
    seedHash,
    starName,
    homeId: home.id,
    bodies,
    phenomena,
    metadata: {
      generatedAtRuntime: true,
      starSpectralClass: starClass,
      starTemperatureK: starTemp,
      luminositySolar,
      habitableZoneProxyMeters: habitableProxy,
      snowLineMeters: snowLine,
      planetCount,
      moonCount: bodies.filter((body) => body.kind === BODY_KIND.MOON).length,
      cometCount: bodies.filter((body) => body.kind === BODY_KIND.COMET).length,
      roguePlanetCount: bodies.filter((body) => body.kind === BODY_KIND.ROGUE_PLANET).length,
      phenomenonCount: phenomena.length,
      anomalyCount: phenomena.filter((entry) => entry.anomaly).length,
      landablePlanetCount: bodies.filter((body) => body.kind === BODY_KIND.PLANET && body.landable).length,
      physicalPropertyModel: 'coherent-gas-envelope-v2',
      rotationModel: 'orbital-relative-v2',
      roguePopulationModel: 'positive-energy-v2',
      scientificModel: 'Newtonian finite-radius N-body initial conditions with near-Keplerian planet/moon orbits, coherent gas-giant bulk mass/radius/density generation, orbital-relative rigid-body planetary spin axes, synchronous moon rotation aligned to the parent direction at epoch, high-eccentricity physical comet nuclei, optional positive-energy unbound rogue planets, and separately labeled visual population phenomena plus an explicitly labeled speculative/fictional anomaly layer',
    },
  };
}
