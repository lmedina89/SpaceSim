import { PHYSICS } from '../core/constants.js';

function cross(ax, ay, az, bx, by, bz) {
  return [
    ay * bz - az * by,
    az * bx - ax * bz,
    ax * by - ay * bx,
  ];
}

export function osculatingMetrics(position, velocity, target) {
  if (!target || !(target.mass > 0)) return null;
  const rx = position[0] - target.position[0];
  const ry = position[1] - target.position[1];
  const rz = position[2] - target.position[2];
  const vx = velocity[0] - target.velocity[0];
  const vy = velocity[1] - target.velocity[1];
  const vz = velocity[2] - target.velocity[2];
  const r = Math.hypot(rx, ry, rz);
  const v = Math.hypot(vx, vy, vz);
  if (!(r > 0)) return null;

  const mu = PHYSICS.G * target.mass;
  const radialSpeed = (rx * vx + ry * vy + rz * vz) / r;
  const gravity = mu / (r * r);
  const escapeSpeed = Math.sqrt(2 * mu / r);
  const circularSpeed = Math.sqrt(mu / r);
  const specificEnergy = 0.5 * v * v - mu / r;

  const [hx, hy, hz] = cross(rx, ry, rz, vx, vy, vz);
  const h2 = hx * hx + hy * hy + hz * hz;
  const [cx, cy, cz] = cross(vx, vy, vz, hx, hy, hz);
  const ex = cx / mu - rx / r;
  const ey = cy / mu - ry / r;
  const ez = cz / mu - rz / r;
  const eccentricity = Math.hypot(ex, ey, ez);
  const semiMajorAxis = Math.abs(specificEnergy) > 1e-20 ? -mu / (2 * specificEnergy) : Infinity;
  const p = h2 / mu;
  const periapsisRadius = p / Math.max(1e-12, 1 + eccentricity);
  const apoapsisRadius = eccentricity < 1 ? p / Math.max(1e-12, 1 - eccentricity) : Infinity;

  return {
    distanceMeters: r,
    altitudeMeters: r - (target.radius || 0),
    relativeSpeedMps: v,
    radialSpeedMps: radialSpeed,
    gravityMps2: gravity,
    escapeSpeedMps: escapeSpeed,
    circularSpeedMps: circularSpeed,
    specificOrbitalEnergyJkg: specificEnergy,
    eccentricity,
    semiMajorAxisMeters: semiMajorAxis,
    periapsisAltitudeMeters: periapsisRadius - (target.radius || 0),
    apoapsisAltitudeMeters: Number.isFinite(apoapsisRadius) ? apoapsisRadius - (target.radius || 0) : Infinity,
    boundTwoBody: specificEnergy < 0 && eccentricity < 1,
  };
}

export function angularAlignment(ship, target) {
  const f = ship.forward();
  const dx = target.position[0] - ship.position[0];
  const dy = target.position[1] - ship.position[1];
  const dz = target.position[2] - ship.position[2];
  const r = Math.hypot(dx, dy, dz) || 1;
  return (f[0] * dx + f[1] * dy + f[2] * dz) / r;
}
