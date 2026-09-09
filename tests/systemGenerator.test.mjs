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

test('generated system starts in a barycentric rest frame', () => {
  const s = generateSystem('MOMENTUM-TEST');
  let px=0,py=0,pz=0,cx=0,cy=0,cz=0,total=0,momentumScale=0,positionScale=0;
  for (const b of s.bodies) {
    total += b.mass;
    px += b.mass*b.velocity[0]; py += b.mass*b.velocity[1]; pz += b.mass*b.velocity[2];
    cx += b.mass*b.position[0]; cy += b.mass*b.position[1]; cz += b.mass*b.position[2];
    momentumScale += b.mass*Math.hypot(...b.velocity);
    positionScale += b.mass*Math.hypot(...b.position);
  }
  const residualP=Math.hypot(px,py,pz);
  const residualC=Math.hypot(cx/total,cy/total,cz/total);
  assert.ok(residualP/Math.max(1,momentumScale)<1e-14, `momentum residual ratio ${residualP/momentumScale}`);
  assert.ok(residualC/Math.max(1,positionScale/total)<1e-14, `COM residual ratio ${residualC/(positionScale/total)}`);
});

test('metadata moon and planet counts match generated bodies', () => {
  const s=generateSystem('MOON-COUNT-7');
  const planets=s.bodies.filter(b=>b.kind==='planet').length;
  const moons=s.bodies.filter(b=>b.kind==='moon').length;
  assert.equal(s.metadata.planetCount,planets);
  assert.equal(s.metadata.moonCount,moons);
  assert.ok(s.metadata.starSpectralClass);
});
