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
