export const PHYSICS = Object.freeze({
  G: 6.67430e-11,
  C: 299_792_458,
  AU: 149_597_870_700,
  DAY: 86_400,
  YEAR: 31_557_600,
  SOLAR_MASS: 1.98847e30,
  SOLAR_RADIUS: 6.957e8,
  SOLAR_LUMINOSITY: 3.828e26,
  EARTH_MASS: 5.9722e24,
  EARTH_RADIUS: 6.371e6,
  JUPITER_MASS: 1.89813e27,
  JUPITER_RADIUS: 6.9911e7,
});

export const SIMULATION = Object.freeze({
  schemaVersion: 1,
  metersPerRenderUnit: 1.0e7,
  maxPhysicsSubstepSeconds: 300,
  maxFrameDeltaSeconds: 0.05,
  directGravityBodyLimit: 128,
  defaultMinorBodyCount: 4_000,
  maxMinorBodyCount: 20_000,
  minorFieldUpdateHz: 30,
  particleExperimentMaxTotal: 40_000,
  particleExperimentWarpCap: 60,
  particleExperimentMaxStepSeconds: 1,
  particleExperimentMaxActiveFields: 4,
  shipDryMassKg: 12_000,
  shipThrustAcceleration: 20,
  shipCruiseAcceleration: 120,
  shipReverseAcceleration: 12,
  shipCruiseReverseAcceleration: 72,
  shipRcsAcceleration: 6,
  impactResolvedFragmentLimit: 16,
  impactFragmentsPerEvent: 2,
  impactFragmentGraceSeconds: 45,
  collisionSafetyFactor: 1.0,
  trajectoryMaxSamples: 420,
  trajectoryMinStepSeconds: 1,
  trajectoryMaxStepSeconds: 7_200,
  trajectoryRefreshRealSeconds: 0.45,
});

export const BODY_KIND = Object.freeze({
  STAR: 'star',
  PLANET: 'planet',
  MOON: 'moon',
  ASTEROID: 'asteroid',
  BLACK_HOLE: 'black-hole',
  NEUTRON_STAR: 'neutron-star',
  WHITE_DWARF: 'white-dwarf',
  BROWN_DWARF: 'brown-dwarf',
  ROGUE_PLANET: 'rogue-planet',
  COMET: 'comet',
  SHIP: 'ship',
});

export function schwarzschildRadius(massKg) {
  return (2 * PHYSICS.G * massKg) / (PHYSICS.C * PHYSICS.C);
}
