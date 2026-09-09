import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS, BODY_KIND } from '../src/core/constants.js';
import { analyzeImpactEvent, estimateCrater, generateFragments } from '../src/physics/impactModel.js';
import { resolveImpact } from '../src/physics/impactResolver.js';

const v = (x,y,z) => new Float64Array([x,y,z]);

function earth() {
  return { id:'earth', name:'Earth-like', kind:BODY_KIND.PLANET, planetType:'rocky', mass:PHYSICS.EARTH_MASS, radius:PHYSICS.EARTH_RADIUS, color:0x4477aa, position:v(0,0,0), velocity:v(0,0,0), gravitySource:true };
}

function asteroid({ mass=1e15, density=3000, radius=null, speed=20_000 }={}) {
  const r = radius ?? Math.cbrt((3*mass)/(4*Math.PI*density));
  return { id:'impactor', name:'Impactor', kind:BODY_KIND.ASTEROID, materialId:'basalt', densityKgM3:density, mass, radius:r, color:0x887766, position:v(PHYSICS.EARTH_RADIUS+r,0,0), velocity:v(-speed,0,0), gravitySource:true };
}

test('head-on impact angle is approximately 90 degrees', () => {
  const target=earth(), impactor=asteroid();
  const event={a:target,b:impactor,relativeVelocity:[-20000,0,0],relativeSpeed:20000,contactNormal:[1,0,0]};
  const a=analyzeImpactEvent(event);
  assert.ok(Math.abs(a.impactAngleDegrees-90)<1e-9);
});

test('Collins-style Chicxulub-class crater estimate is in a physically plausible large-crater range', () => {
  const target=earth(), impactor=asteroid({mass:1e15,speed:20_000});
  const a=analyzeImpactEvent({a:target,b:impactor,relativeVelocity:[-20000,0,0],relativeSpeed:20000,contactNormal:[1,0,0]});
  const crater=estimateCrater(a);
  assert.ok(crater.finalDiameterMeters > 50_000 && crater.finalDiameterMeters < 300_000, `${crater.finalDiameterMeters}`);
  assert.equal(crater.simpleComplexClass,'complex');
});

test('fragment generator never allocates more resolved fragment mass than the impactor mass', () => {
  const target=earth(), impactor=asteroid();
  const a=analyzeImpactEvent({a:target,b:impactor,relativeVelocity:[-20000,0,0],relativeSpeed:20000,contactNormal:[1,0,0]});
  const generated=generateFragments(a,{crater:estimateCrater(a),maxFragments:6});
  const resolved=generated.fragments.reduce((s,f)=>s+f.mass,0);
  assert.ok(resolved <= impactor.mass * 0.081);
  assert.ok(generated.fragments.length <= 2);
});

test('energetic asteroid-to-planet resolution conserves represented gravitational mass', () => {
  const target=earth(), impactor=asteroid();
  const initial=target.mass+impactor.mass;
  const resolution=resolveImpact({a:target,b:impactor,relativeVelocity:[-20000,0,0],relativeSpeed:20000,contactNormal:[1,0,0],timeSeconds:123},{maxGravityFragments:2,fragmentGraceSeconds:45});
  const final=target.mass+resolution.createBodies.reduce((s,b)=>s+b.mass,0);
  assert.ok(Math.abs(final-initial)/initial < 1e-14);
  assert.equal(resolution.deleteIds.includes(impactor.id),true);
  assert.ok(target.damageRecords?.length===1);
});

test('low-energy asteroid collision bounce conserves total linear momentum', () => {
  const a={id:'a',name:'a',kind:BODY_KIND.ASTEROID,materialId:'basalt',mass:1e9,radius:100,position:v(0,0,0),velocity:v(5,0,0),gravitySource:true};
  const b={id:'b',name:'b',kind:BODY_KIND.ASTEROID,materialId:'basalt',mass:1e9,radius:100,position:v(200,0,0),velocity:v(-5,0,0),gravitySource:true};
  const p0=a.mass*a.velocity[0]+b.mass*b.velocity[0];
  const r=resolveImpact({a,b,relativeVelocity:[-10,0,0],relativeSpeed:10,contactNormal:[1,0,0]},{maxGravityFragments:2,fragmentGraceSeconds:45});
  assert.equal(r.classification.mode,'bounce');
  const p1=a.mass*a.velocity[0]+b.mass*b.velocity[0];
  assert.ok(Math.abs(p1-p0)<1e-6);
});

test('secondary impact fragments can be resolved with zero new gravity fragments to prevent cascades', () => {
  const target=earth(), impactor=asteroid({mass:1e13,speed:15_000});
  impactor.fragmentGenerationDepth=1;
  impactor.isImpactFragment=true;
  const r=resolveImpact({a:target,b:impactor,relativeVelocity:[-15000,0,0],relativeSpeed:15000,contactNormal:[1,0,0],timeSeconds:50},{maxGravityFragments:0,fragmentGraceSeconds:45});
  assert.equal(r.createBodies.length,0);
});
