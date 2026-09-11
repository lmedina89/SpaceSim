import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateSystem } from '../src/data/systemGenerator.js';
import { derivePlanetaryEnvironment } from '../src/physics/planetaryEnvironment.js';
import { planetaryMaterialProfile, rotationalFlatteningProxy } from '../src/render/celestialRealism.js';

test('ORIGIN planetary realism profiles are deterministic, finite and environment-driven', () => {
  const system = generateSystem('ORIGIN-001');
  const byId = new Map(system.bodies.map((b)=>[b.id,b]));
  const ids = ['planet-3','planet-4','moon-5-1','planet-6','moon-7-1'];
  const profiles = Object.fromEntries(ids.map((id)=>{
    const body=byId.get(id); const env=derivePlanetaryEnvironment(body,system.bodies);
    return [id, planetaryMaterialProfile(body,env)];
  }));
  assert.equal(profiles['planet-6'].id,'gas-envelope');
  assert.equal(profiles['moon-7-1'].id,'ice-rock');
  assert.equal(profiles['moon-5-1'].id,'rock');
  for (const p of Object.values(profiles)) {
    for (const k of ['flattening','roughness','baseContrast','smallScaleContrast']) assert.ok(Number.isFinite(p[k]), `${p.id}.${k}`);
    assert.ok(p.flattening >= 0 && p.flattening <= .13);
  }
});

test('generated planet/moon flattening proxy remains bounded over a population', () => {
  for (let i=0;i<300;i+=1) {
    const system=generateSystem(`REALISM-${i}`);
    for (const body of system.bodies) {
      if (body.kind !== 'planet' && body.kind !== 'moon') continue;
      const f=rotationalFlatteningProxy(body);
      assert.ok(Number.isFinite(f) && f>=0 && f<=.13, `${body.id} flattening=${f}`);
    }
  }
});

test('renderer keeps near-orbit maps lazy and canonical body rotation visual-only', async () => {
  const factory=await readFile(new URL('../src/render/celestialFactory.js',import.meta.url),'utf8');
  const renderer=await readFile(new URL('../src/render/threeRenderer.js',import.meta.url),'utf8');
  assert.match(factory,/apparentRadiusRad >= 0\.006/);
  assert.match(factory,/planetaryTextureSource/);
  assert.match(factory,/rotationAxisInertial/);
  assert.match(factory,/rotationPeriodSeconds/);
  assert.match(factory,/applyCanonicalBodyOrientation/);
  assert.match(renderer,/updatePlanetaryPerception\(\)/);
  assert.match(renderer,/Math\.min\(this\._stellarExposure, this\._planetaryExposure\)/);
});

test('compact-object renderer uses GR-informed ratio cues but keeps explicit model limits', async () => {
  const factory=await readFile(new URL('../src/render/celestialFactory.js',import.meta.url),'utf8');
  const model=await readFile(new URL('../src/render/celestialRealism.js',import.meta.url),'utf8');
  for (const token of ['black-hole-shadow-proxy','black-hole-critical-curve','black-hole-secondary-ring','black-hole-lensed-disk-cue','dipole-field-line','magnetar-reconnection-arc']) assert.match(factory,new RegExp(token));
  assert.match(model,/3 \* Math\.sqrt\(3\) \/ 2/);
  assert.match(model,/iscoRadiusRs = 3/);
  assert.match(model,/not geodesically ray-traced/);
  assert.match(model,/plasma transport/);
});
