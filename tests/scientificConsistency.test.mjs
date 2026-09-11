import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import { PHYSICS } from '../src/core/constants.js';
import { inertialDirectionToBodyFixed } from '../src/core/planetaryRotation.js';
import { breakupPeriodSeconds, bulkDensityKgM3, specificOrbitalEnergyJkg } from '../src/physics/planetaryProperties.js';

function cross(a, b) {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function normalize(a) {
  const m = Math.hypot(...a);
  return a.map((x) => x / m);
}
function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function relative(a, b, key) { return a[key].map((x, i) => x - b[key][i]); }

// Keep this broad enough to guard generator properties without making routine QA expensive.
test('generated systems satisfy gas coherence, orbital-relative spin, synchronous-moon, and rogue-unbound invariants', () => {
  let gasCount = 0;
  let rogueCount = 0;
  let moonCount = 0;
  for (let seedIndex = 0; seedIndex < 384; seedIndex += 1) {
    const system = generateSystem(`CONSISTENCY-${seedIndex}`);
    const star = system.bodies.find((body) => body.kind === 'star');
    const byId = new Map(system.bodies.map((body) => [body.id, body]));
    for (const body of system.bodies) {
      if (body.kind === 'planet') {
        const orbitalNormal = normalize(cross(relative(body, star, 'position'), relative(body, star, 'velocity')));
        const spin = normalize(body.rotationAxisInertial);
        const alignment = dot(orbitalNormal, spin);
        if (body.rotationDirection > 0) assert.ok(alignment > 0, `${system.seed}/${body.id} PRO spin opposes orbit`);
        else assert.ok(alignment < 0, `${system.seed}/${body.id} RETRO spin follows orbit`);
        const breakup = breakupPeriodSeconds(body.mass, body.radius);
        assert.ok(body.rotationPeriodSeconds >= breakup * 1.15 - 1e-9, `${system.seed}/${body.id} below breakup safety floor`);
        if (body.planetType === 'gas') {
          gasCount += 1;
          const derived = bulkDensityKgM3(body.mass, body.radius);
          assert.ok(body.densityKgM3 >= 450 && body.densityKgM3 <= 2_800);
          assert.ok(Math.abs(body.densityKgM3 - derived) / derived < 1e-13);
          assert.equal(body.physicalPropertyModel, 'coherent-gas-envelope-v2');
        }
      } else if (body.kind === 'moon') {
        moonCount += 1;
        const parent = byId.get(body.parentId);
        const relativePosition = relative(body, parent, 'position');
        const relativeVelocity = relative(body, parent, 'velocity');
        const orbitalNormal = normalize(cross(relativePosition, relativeVelocity));
        assert.ok(dot(orbitalNormal, normalize(body.rotationAxisInertial)) > 1 - 1e-12);
        const expectedPeriod = 2 * Math.PI * Math.sqrt(body.semiMajorAxis ** 3 / (PHYSICS.G * (parent.mass + body.mass)));
        assert.ok(Math.abs(body.rotationPeriodSeconds - expectedPeriod) / expectedPeriod < 1e-14);
        const parentDirection = normalize(relativePosition.map((x) => -x));
        const fixedParent = inertialDirectionToBodyFixed(body, parentDirection, body.rotationEpochSeconds);
        assert.ok(fixedParent[0] > 1 - 1e-12 && Math.abs(fixedParent[1]) < 1e-10 && Math.abs(fixedParent[2]) < 1e-10);
        assert.equal(body.rotationModel, 'synchronous-orbital-v2');
      } else if (body.kind === 'rogue-planet') {
        rogueCount += 1;
        const energy = specificOrbitalEnergyJkg(relative(body, star, 'position'), relative(body, star, 'velocity'), star.mass, body.mass);
        assert.ok(energy > 0, `${system.seed}/${body.id} is bound despite rogue classification`);
        assert.equal(body.rogueOrbitModel, 'positive-energy-v2');
      }
    }
  }
  assert.ok(gasCount > 100);
  assert.ok(moonCount > 100);
  assert.ok(rogueCount > 100);
});
