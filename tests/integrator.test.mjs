import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS } from '../src/core/constants.js';
import { DirectGravitySolver } from '../src/physics/gravity/directGravitySolver.js';
import { VelocityVerletIntegrator } from '../src/physics/integrators/velocityVerlet.js';

const v = (x,y,z) => new Float64Array([x,y,z]);

test('velocity Verlet keeps a near-circular Sun/Earth orbit bounded for one year', () => {
  const orbital = Math.sqrt(PHYSICS.G * PHYSICS.SOLAR_MASS / PHYSICS.AU);
  const sunV = orbital * PHYSICS.EARTH_MASS / PHYSICS.SOLAR_MASS;
  const bodies = [
    { mass: PHYSICS.SOLAR_MASS, radius: PHYSICS.SOLAR_RADIUS, gravitySource: true, position: v(0,0,0), velocity: v(0,0,-sunV) },
    { mass: PHYSICS.EARTH_MASS, radius: PHYSICS.EARTH_RADIUS, gravitySource: true, position: v(PHYSICS.AU,0,0), velocity: v(0,0,orbital) },
  ];
  const integrator = new VelocityVerletIntegrator(new DirectGravitySolver());
  const dt = 3600;
  const steps = Math.round(PHYSICS.YEAR / dt);
  for (let i = 0; i < steps; i += 1) integrator.step(bodies, dt);
  const dx = bodies[1].position[0] - bodies[0].position[0];
  const dy = bodies[1].position[1] - bodies[0].position[1];
  const dz = bodies[1].position[2] - bodies[0].position[2];
  const r = Math.hypot(dx,dy,dz);
  assert.ok(Math.abs(r - PHYSICS.AU) / PHYSICS.AU < 0.01, `radius drift ${(r-PHYSICS.AU)/PHYSICS.AU}`);
});
