import { PHYSICS } from '../core/constants.js';
import { createRng } from '../util/prng.js';

const ARCHETYPES = Object.freeze([
  {
    key: 'gravity-scar', realityClass: 'speculative', kind: 'anomaly-gravity-scar',
    titles: ['Gravitational Scar', 'Curvature Wake', 'Tidal Wound'],
    colors: [0x8bd9ff, 0x9b7cff],
    summary: 'A thin region where the visualized local curvature proxy appears folded into repeating concentric gradients.',
    science: 'Speculative visualization. No general-relativistic metric is solved; the anomaly has no extra gravity source in the Newtonian integrator.',
  },
  {
    key: 'phase-rift', realityClass: 'anomalous', kind: 'anomaly-phase-rift',
    titles: ['Phase Rift', 'Vacuum Seam', 'Null Aperture'],
    colors: [0x66f6ff, 0xe071ff],
    summary: 'A luminous seam whose apparent near/far ordering changes with viewing angle.',
    science: 'Deliberately anomalous visual phenomenon. It does not claim a known physical mechanism and does not alter ship position, causality or local forces.',
  },
  {
    key: 'echo-lattice', realityClass: 'speculative', kind: 'anomaly-echo-lattice',
    titles: ['Quantum Echo Lattice', 'Vacuum Lattice', 'Interference Cathedral'],
    colors: [0x8fffd5, 0x6e8cff],
    summary: 'A geometric standing-wave structure suspended in free space with no visible material support.',
    science: 'Exotic/speculative art-science proxy inspired by field interference. It is not a quantum-field calculation.',
  },
  {
    key: 'orbital-knot', realityClass: 'impossible', kind: 'anomaly-orbital-knot',
    titles: ['Impossible Orbital Knot', 'Closed Orbit Tangle', 'Kepler Violation'],
    colors: [0xffd36c, 0xff6f91],
    summary: 'Several luminous paths appear to cross and close while sharing incompatible orbital planes and periods.',
    science: 'Intentionally impossible under the current Newtonian model. This is a fictional anomaly and is explicitly not integrated as physical matter.',
  },
  {
    key: 'dark-mirror', realityClass: 'anomalous', kind: 'anomaly-dark-mirror',
    titles: ['Dark Mirror', 'Negative Reflection', 'Black Glass Sphere'],
    colors: [0x11131d, 0x78dfff],
    summary: 'A dark spherical region rimmed by displaced starlight-like echoes that do not match the actual background.',
    science: 'Fictional optical anomaly. The rim is a rendering proxy, not gravitational lensing or a ray-traced refractive object.',
  },
  {
    key: 'frozen-lightning', realityClass: 'impossible', kind: 'anomaly-frozen-lightning',
    titles: ['Frozen Lightning', 'Static Thunder Filament', 'Arrested Discharge'],
    colors: [0xbdf8ff, 0x8c7dff],
    summary: 'A branching electrical-looking filament remains stationary in vacuum for astronomical timescales.',
    science: 'Intentionally impossible presentation. It is a luminous visual structure with no electrical plasma solver or persistent material channel.',
  },
  {
    key: 'chronal-shear', realityClass: 'impossible', kind: 'anomaly-chronal-shear',
    titles: ['Chronal Shear', 'Time-Slice Echo', 'Temporal Wake'],
    colors: [0xff8bc8, 0x76d7ff],
    summary: 'Multiple offset copies of the same structure appear to occupy adjacent positions as if several moments were visible at once.',
    science: 'Deliberately fictional time anomaly. Simulation time remains single-valued and causal; the echoes are visual only.',
  },
  {
    key: 'ghost-star', realityClass: 'anomalous', kind: 'anomaly-ghost-star',
    titles: ['Ghost Star Echo', 'Orphan Photosphere', 'Stellar Afterimage'],
    colors: [0xffdf9f, 0x87d8ff],
    summary: 'A star-sized luminous shell appears without enough modeled mass to produce a corresponding gravitational signature.',
    science: 'Fictional anomaly. It intentionally violates the normal mass/luminosity relationship and contributes no hidden gravity source.',
  },
  {
    key: 'vacuum-bloom', realityClass: 'anomalous', kind: 'anomaly-vacuum-bloom',
    titles: ['Vacuum Bloom', 'Probability Flower', 'Nothingness Bloom'],
    colors: [0x7dffc7, 0xf58cff],
    summary: 'Petal-like luminous sheets repeatedly unfold and collapse around an empty center.',
    science: 'Fictional emergent-space visual. No vacuum decay, exotic matter or quantum probability amplitude is simulated.',
  },
  {
    key: 'reverse-shadow', realityClass: 'impossible', kind: 'anomaly-reverse-shadow',
    titles: ['Reverse Shadow', 'Anti-Umbra', 'Luminous Occlusion'],
    colors: [0xffffff, 0x6375ff],
    summary: 'A bright occlusion-like cone points toward nearby light sources instead of away from them.',
    science: 'Intentionally nonphysical anomaly. It is a visual paradox and does not participate in the lighting or radiation model.',
  },
  {
    key: 'resonant-shell', realityClass: 'speculative', kind: 'anomaly-resonant-shell',
    titles: ['Resonant Shell', 'Standing Gravity Choir', 'Harmonic Bubble'],
    colors: [0x7acbff, 0xa7ffef],
    summary: 'Nested translucent shells pulse at stable ratios around a point with no visible central body.',
    science: 'Speculative field-resonance visualization. It does not add forces to the live Newtonian solver.',
  },
  {
    key: 'fracture-gate', realityClass: 'impossible', kind: 'anomaly-fracture-gate',
    titles: ['Fracture Gate', 'Impossible Door', 'Nonlocal Window'],
    colors: [0xffa35c, 0x7c6cff],
    summary: 'A rectangular tear appears to reveal a starfield orientation that does not correspond to any camera direction.',
    science: 'Explicitly fictional/nonlocal visual. It is not a wormhole solver, teleport mechanic, or traversable topology in this build.',
  },
]);

function freeSpacePosition(rng) {
  const distance = PHYSICS.AU * rng.range(0.65, 36);
  const azimuth = rng.range(0, Math.PI * 2);
  const elevation = rng.range(-0.48, 0.48);
  const planar = Math.cos(elevation) * distance;
  return [Math.cos(azimuth) * planar, Math.sin(elevation) * distance, Math.sin(azimuth) * planar];
}

function anomalyRadius(rng, kind) {
  const large = ['anomaly-ghost-star', 'anomaly-resonant-shell', 'anomaly-gravity-scar'].includes(kind);
  return PHYSICS.AU * (large ? rng.range(0.08, 0.42) : rng.range(0.018, 0.18));
}

export function generateAnomalies(seed, bodies = []) {
  const rng = createRng(`${seed}:anomaly-field-v1`);
  const desired = rng.int(9, 15);
  const shuffled = [...ARCHETYPES];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const results = [];
  for (let i = 0; i < desired; i += 1) {
    const archetype = shuffled[i % shuffled.length];
    const variant = Math.floor(i / shuffled.length) + 1;
    const radiusMeters = anomalyRadius(rng, archetype.kind);
    const title = rng.pick(archetype.titles);
    const id = `anomaly-${archetype.key}-${String(i + 1).padStart(2, '0')}`;
    const position = freeSpacePosition(rng);
    results.push({
      id,
      kind: archetype.kind,
      anomaly: true,
      anomalyFamily: archetype.key,
      label: variant > 1 ? `${title} ${variant}` : title,
      position,
      velocity: [0, 0, 0],
      radiusMeters,
      outerRadiusMeters: radiusMeters,
      colorA: archetype.colors[0],
      colorB: archetype.colors[1],
      realityClass: archetype.realityClass,
      detectionClass: rng.pick(['broadband distortion', 'coherent narrowband signal', 'optical contradiction', 'gravity-like residual', 'periodic geometric echo', 'unknown multi-band source']),
      stability: rng.pick(['stable', 'slowly drifting', 'pulsing', 'intermittent', 'quasi-periodic', 'apparently static']),
      scanSummary: archetype.summary,
      scientificStatus: archetype.science,
      navigable: true,
      mapPriority: 2,
    });
  }

  // Keep anomalies away from exact body centers so a map marker never becomes indistinguishable from a planet/star marker.
  for (const anomaly of results) {
    for (const body of bodies) {
      const dx = anomaly.position[0] - body.position[0];
      const dy = anomaly.position[1] - body.position[1];
      const dz = anomaly.position[2] - body.position[2];
      const d = Math.hypot(dx, dy, dz);
      const safe = Math.max(anomaly.radiusMeters * 2.5, body.radius * 20);
      if (d < safe) {
        anomaly.position[0] += safe * 1.35;
        anomaly.position[2] -= safe * 0.65;
      }
    }
  }
  return results;
}

export const ANOMALY_REALITY_LABELS = Object.freeze({
  'known-physics': 'KNOWN PHYSICS',
  speculative: 'SPECULATIVE',
  anomalous: 'ANOMALOUS',
  impossible: 'IMPOSSIBLE / FICTIONAL',
});
