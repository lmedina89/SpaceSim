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

test('planet/moon rotation metadata is deterministic, finite, and isolated from legacy orbital generation', () => {
  const a = generateSystem('ORIGIN-001');
  const b = generateSystem('ORIGIN-001');
  const rotating = a.bodies.filter((body) => body.kind === 'planet' || body.kind === 'moon');
  assert.ok(rotating.length > 0);
  for (const body of rotating) {
    const peer = b.bodies.find((entry) => entry.id === body.id);
    assert.ok(Number.isFinite(body.rotationPeriodSeconds) && body.rotationPeriodSeconds > 0);
    assert.ok(body.rotationDirection === 1 || body.rotationDirection === -1);
    assert.equal(body.rotationAxisInertial.length, 3);
    assert.ok(body.rotationAxisInertial.every(Number.isFinite));
    assert.deepEqual(body.rotationAxisInertial, peer.rotationAxisInertial);
    assert.equal(body.rotationPeriodSeconds, peer.rotationPeriodSeconds);
    assert.equal(body.rotationPhaseRad, peer.rotationPhaseRad);
  }

  // Exact pre-v0.1.4.7 ORIGIN-001 orbital signature. Rotation uses a separate RNG stream and
  // must not perturb established seeded system positions/velocities.
  const star = a.bodies.find((body) => body.id === 'star-0');
  const firstPlanet = a.bodies.find((body) => body.id === 'planet-1');
  assert.deepEqual([...star.position], [117306266.1553843, -15060692.902183142, -62950225.12578909]);
  assert.deepEqual([...star.velocity], [3.969701149062927, -0.1603931093549944, 3.5602725445002497]);
  assert.deepEqual([...firstPlanet.position], [35470505321.98423, 775882259.717882, -26509908414.664623]);
  assert.deepEqual([...firstPlanet.velocity], [34914.49964693554, 1467.3991447185356, 45175.81701552086]);
  assert.equal(a.homeId, 'planet-3');
});
