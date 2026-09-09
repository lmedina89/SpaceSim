import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';

test('same seed generates the same physical initial conditions', () => {
  const a = generateSystem('SCIENCE-42');
  const b = generateSystem('SCIENCE-42');
  assert.equal(a.bodies.length, b.bodies.length);
  for (let i = 0; i < a.bodies.length; i += 1) {
    assert.equal(a.bodies[i].mass, b.bodies[i].mass);
    assert.deepEqual([...a.bodies[i].position], [...b.bodies[i].position]);
    assert.deepEqual([...a.bodies[i].velocity], [...b.bodies[i].velocity]);
  }
});

test('generated system has approximately zero total linear momentum', () => {
  const s = generateSystem('MOMENTUM-TEST');
  let px = 0, py = 0, pz = 0, scale = 0;
  for (const b of s.bodies) {
    px += b.mass * b.velocity[0];
    py += b.mass * b.velocity[1];
    pz += b.mass * b.velocity[2];
    scale += b.mass * Math.hypot(...b.velocity);
  }
  const residual = Math.hypot(px, py, pz);
  assert.ok(residual / scale < 1e-14, `momentum residual ratio ${residual / scale}`);
});
