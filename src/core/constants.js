export const PHYSICS = Object.freeze({
  G: 6.67430e-11,
  C: 299_792_458,
  AU: 149_597_870_700,
  DAY: 86_400,
  YEAR: 31_557_600,
  SOLAR_MASS: 1.98847e30,
  SOLAR_RADIUS: 6.957e8,
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
  shipDryMassKg: 12_000,
  shipThrustAcceleration: 20,
  collisionSafetyFactor: 1.0,
});

export const BODY_KIND = Object.freeze({
  STAR: 'star',
  PLANET: 'planet',
  MOON: 'moon',
  ASTEROID: 'asteroid',
  BLACK_HOLE: 'black-hole',
  SHIP: 'ship',
});

export function schwarzschildRadius(massKg) {
  return (2 * PHYSICS.G * massKg) / (PHYSICS.C * PHYSICS.C);
}
