import test from 'node:test';
import assert from 'node:assert/strict';
import { ShipDynamics } from '../src/physics/shipDynamics.js';

function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}

test('ship forward/right/up basis stays orthonormal with roll', () => {
  const ship = new ShipDynamics();
  ship.yaw = .7; ship.pitch = -.4; ship.roll = 1.1;
  const {forward,right,up}=ship.basis();
  assert.ok(Math.abs(Math.hypot(...forward)-1)<1e-12);
  assert.ok(Math.abs(Math.hypot(...right)-1)<1e-12);
  assert.ok(Math.abs(Math.hypot(...up)-1)<1e-12);
  assert.ok(Math.abs(dot(forward,right))<1e-12);
  assert.ok(Math.abs(dot(forward,up))<1e-12);
  assert.ok(Math.abs(dot(right,up))<1e-12);
});

test('experimental main engine produces the declared physical acceleration', () => {
  const ship = new ShipDynamics();
  ship.throttle = 1;
  ship.step(1, []);
  assert.ok(Math.abs(ship.velocity[2] - 20) < 1e-12);
  assert.ok(Math.abs(ship.position[2] - 10) < 1e-12);
});

test('60 simulated seconds of continuous thrust integrate to 1.2 km/s delta-v', () => {
  const ship = new ShipDynamics();
  ship.throttle = 1;
  ship.step(60, []);
  assert.ok(Math.abs(ship.velocity[2] - 1200) < 1e-9);
  assert.ok(Math.abs(ship.position[2] - 36000) < 1e-6);
});

test('cruise engine mode produces declared 120 m/s² acceleration', () => {
  const ship = new ShipDynamics();
  ship.engineMode = 'cruise';
  ship.throttle = 1;
  ship.step(1, []);
  assert.ok(Math.abs(ship.velocity[2] - 120) < 1e-12);
  assert.ok(Math.abs(ship.position[2] - 60) < 1e-12);
});

test('braking flag alone does not magically damp velocity', () => {
  const ship = new ShipDynamics();
  ship.velocity[0] = 100;
  ship.braking = true;
  ship.step(1, []);
  assert.ok(Math.abs(ship.velocity[0] - 100) < 1e-12);
});
