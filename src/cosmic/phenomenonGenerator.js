import { BODY_KIND, PHYSICS } from '../core/constants.js';
import { createRng } from '../util/prng.js';

function ringDefinition(rng, planet, serial) {
  const inner = planet.radius * rng.range(1.45, 1.85);
  const outer = planet.radius * rng.range(2.4, planet.planetType === 'gas' ? 4.2 : 3.1);
  return {
    id: `ring-system-${serial}`,
    kind: 'planetary-rings',
    label: `${planet.name} ring system`,
    anchorBodyId: planet.id,
    radiusMeters: outer,
    innerRadiusMeters: inner,
    outerRadiusMeters: outer,
    inclinationRad: rng.range(-0.18, 0.18),
    particleCount: planet.planetType === 'gas' ? 7_000 : 4_000,
    colorA: planet.planetType === 'ice' ? 0xcfeeff : 0xe0c49a,
    colorB: planet.planetType === 'gas' ? 0xa98d70 : 0x9eaaa8,
    scientificStatus: 'Visual particle population proxy tied to the planet. Ring particles are not individually integrated in v0.1.4.1.',
    navigable: true,
  };
}

function asteroidBeltDefinition(rng, star, planets, serial = 1) {
  const sorted = planets.filter((p) => Number.isFinite(p.semiMajorAxis)).sort((a, b) => a.semiMajorAxis - b.semiMajorAxis);
  let inner = 1.8 * PHYSICS.AU;
  let outer = 3.2 * PHYSICS.AU;
  let bestGap = 0;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i].semiMajorAxis;
    const b = sorted[i + 1].semiMajorAxis;
    const gap = b / Math.max(1, a);
    if (gap > bestGap && a > 0.65 * PHYSICS.AU && b < 8.5 * PHYSICS.AU) {
      bestGap = gap;
      const mid = Math.sqrt(a * b);
      inner = mid * rng.range(0.78, 0.86);
      outer = mid * rng.range(1.13, 1.24);
    }
  }
  if (!(outer > inner)) outer = inner * 1.35;
  return {
    id: `asteroid-belt-${serial}`,
    kind: 'asteroid-belt',
    label: `${star.name} debris belt ${serial}`,
    anchorBodyId: star.id,
    radiusMeters: outer,
    innerRadiusMeters: inner,
    outerRadiusMeters: outer,
    inclinationRad: rng.range(-0.09, 0.09),
    thicknessMeters: (outer - inner) * rng.range(0.025, 0.055),
    particleCount: 12_000,
    colorA: 0xaeb8c6,
    colorB: 0x756d64,
    scientificStatus: 'Seeded visual population proxy for a circumstellar debris belt. Individual belt points are not gravity sources or collision bodies.',
    navigable: true,
  };
}


function supernovaRemnantDefinition(rng, star, serial = 1) {
  const distance = PHYSICS.AU * rng.range(9, 22);
  const angle = rng.range(0, Math.PI * 2);
  const elevation = rng.range(-0.28, 0.28);
  const planar = Math.cos(elevation) * distance;
  const radius = PHYSICS.AU * rng.range(0.45, 1.5);
  return {
    id: `supernova-remnant-${serial}`,
    kind: 'supernova-remnant',
    label: `${star.name} ancient supernova remnant ${serial}`,
    position: [Math.cos(angle) * planar, Math.sin(elevation) * distance, Math.sin(angle) * planar],
    velocity: [0, 0, 0],
    radiusMeters: radius,
    outerRadiusMeters: radius,
    particleCount: 8_500,
    colorA: 0x61dfff,
    colorB: 0xff7b5e,
    scientificStatus: 'Seeded visual shell/filament proxy representing an old supernova remnant. It is not hydrodynamically evolved and has no individual gas-particle gravity.',
    navigable: true,
  };
}

function roguePhenomenon(body) {
  return {
    id: `phenomenon-${body.id}`,
    kind: 'rogue-planet',
    label: body.name,
    anchorBodyId: body.id,
    radiusMeters: Math.max(body.visualRadiusMeters ?? body.radius, body.radius * 8),
    scientificStatus: 'Physical rogue planet: live Newtonian mass/radius/velocity. Its dark thermal appearance is a visual proxy; atmospheric and formation history are not solved.',
    navigable: true,
  };
}

export function generateCosmicPhenomena(seed, bodies) {
  const rng = createRng(`${seed}:cosmic-phenomena-v1`);
  const star = bodies.find((body) => body.kind === BODY_KIND.STAR);
  const planets = bodies.filter((body) => body.kind === BODY_KIND.PLANET);
  if (!star) return [];

  const phenomena = [asteroidBeltDefinition(rng, star, planets, 1), supernovaRemnantDefinition(rng, star, 1)];
  const rogue = bodies.find((body) => body.kind === BODY_KIND.ROGUE_PLANET);
  if (rogue) phenomena.push(roguePhenomenon(rogue));
  let ringSerial = 1;
  const ringCandidates = planets
    .filter((planet) => planet.planetType === 'gas' || planet.planetType === 'ice' || rng.random() < 0.22)
    .sort((a, b) => (a.planetType === 'gas' ? -1 : 1) - (b.planetType === 'gas' ? -1 : 1));

  for (const planet of ringCandidates.slice(0, 3)) {
    if (planet.planetType === 'gas' || rng.random() < 0.62) phenomena.push(ringDefinition(rng, planet, ringSerial++));
  }

  if (!phenomena.some((entry) => entry.kind === 'planetary-rings') && planets.length) {
    const fallback = planets.find((p) => p.planetType === 'gas') ?? planets[planets.length - 1];
    phenomena.push(ringDefinition(rng, fallback, ringSerial++));
  }

  return phenomena;
}
