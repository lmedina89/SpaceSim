import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY_KIND, PHYSICS, schwarzschildRadius } from '../src/core/constants.js';
import { generateSystem } from '../src/data/systemGenerator.js';
import { CollisionMonitor, CollisionStateBuffer } from '../src/physics/collisionMonitor.js';
import { analyzeImpactEvent, estimateCrater, materialProfile } from '../src/physics/impactModel.js';
import { resolveImpact } from '../src/physics/impactResolver.js';

const v = (x,y,z) => new Float64Array([x,y,z]);
const momentum = (bodies) => [0,1,2].map((k)=>bodies.reduce((sum,body)=>sum+body.mass*body.velocity[k],0));
const relativeVectorError = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]) / Math.max(1,Math.hypot(...a));

function earth() {
  return { id:'earth', name:'Earth-like', kind:BODY_KIND.PLANET, planetType:'rocky', mass:PHYSICS.EARTH_MASS, radius:PHYSICS.EARTH_RADIUS, color:0x4477aa, position:v(0,0,0), velocity:v(120,-30,15), gravitySource:true };
}

function asteroid({mass=1e15,density=3000,speed=20_000}={}) {
  const radius=Math.cbrt((3*mass)/(4*Math.PI*density));
  return { id:'impactor', name:'Impactor', kind:BODY_KIND.ASTEROID, materialId:'basalt', densityKgM3:density, mass, radius, color:0x887766, position:v(PHYSICS.EARTH_RADIUS+radius,0,0), velocity:v(120-speed,250,-80), gravitySource:true };
}

test('actual generated gas planets use gas-envelope impact material and never receive a rocky crater',()=>{
  const system=generateSystem('ORIGIN-001');
  const gas=system.bodies.find((body)=>body.planetType==='gas');
  assert.ok(gas,'ORIGIN should contain a generated gas planet');
  const impactor=asteroid();
  const analysis=analyzeImpactEvent({a:gas,b:impactor,relativeSpeed:20_000,contactNormal:[1,0,0]});
  assert.equal(materialProfile(gas).label,'gas-giant atmosphere/envelope');
  assert.equal(estimateCrater(analysis),null);
});

test('fragment resolution conserves represented 3-D linear momentum and cannot exceed its ejecta energy budget',()=>{
  const target=earth(), impactor=asteroid();
  const initial=momentum([target,impactor]);
  const resolution=resolveImpact({a:target,b:impactor,relativeSpeed:20_000,contactNormal:[1,0,0],timeSeconds:123},{maxGravityFragments:2,fragmentGraceSeconds:45});
  assert.equal(resolution.classification.mode,'fragment');
  const final=momentum([target,...resolution.createBodies]);
  assert.ok(relativeVectorError(initial,final)<2e-14,`momentum error ${relativeVectorError(initial,final)}`);
  assert.ok(resolution.representedEjectaKineticEnergyJ<=resolution.ejectaEnergyBudgetJ*(1+1e-12));
});

test('a black hole is always the absorbing sink and its Schwarzschild radius updates after accretion',()=>{
  const bhMass=3*PHYSICS.SOLAR_MASS;
  const starMass=10*PHYSICS.SOLAR_MASS;
  const blackHole={id:'bh',name:'BH',kind:BODY_KIND.BLACK_HOLE,mass:bhMass,radius:schwarzschildRadius(bhMass),position:v(0,0,0),velocity:v(400,0,0),gravitySource:true};
  const star={id:'star',name:'Star',kind:BODY_KIND.STAR,mass:starMass,radius:7e9,position:v(7e9,0,0),velocity:v(-25,10,0),gravitySource:true};
  const initial=momentum([blackHole,star]);
  const resolution=resolveImpact({a:star,b:blackHole,relativeSpeed:425,contactNormal:[-1,0,0]});
  assert.equal(resolution.classification.mode,'absorb');
  assert.equal(resolution.analysis.target.id,'bh');
  assert.deepEqual(resolution.deleteIds,['star']);
  assert.ok(Math.abs(blackHole.mass-(bhMass+starMass))/(bhMass+starMass)<1e-15);
  assert.ok(Math.abs(blackHole.radius-schwarzschildRadius(blackHole.mass))/blackHole.radius<1e-15);
  assert.ok(relativeVectorError(initial,momentum([blackHole]))<2e-15);
});

test('swept collision state uses the first sphere contact root and resolver acts at contact rather than penetrated step end',()=>{
  const a={id:'a',name:'a',kind:BODY_KIND.ASTEROID,materialId:'basalt',mass:1e9,radius:1000,position:v(0,0,0),velocity:v(0,0,0),gravitySource:true};
  const b={id:'b',name:'b',kind:BODY_KIND.ASTEROID,materialId:'basalt',mass:1e9,radius:10,position:v(-5000,0,0),velocity:v(10,0,0),gravitySource:true};
  const snapshot=new CollisionStateBuffer().capture([a,b]);
  b.position[0]=5000;
  const [event]=new CollisionMonitor().scan([a,b],snapshot,1);
  assert.ok(event);
  assert.ok(Math.abs(event.stepFraction-0.399)<1e-12,`fraction=${event.stepFraction}`);
  assert.ok(Math.abs(event.contactPositionB[0]+1010)<1e-9,`contact x=${event.contactPositionB[0]}`);
  event.postContactSeconds=0;
  const resolution=resolveImpact(event,{maxGravityFragments:0});
  assert.equal(resolution.classification.mode,'bounce');
  const separation=Math.hypot(b.position[0]-a.position[0],b.position[1]-a.position[1],b.position[2]-a.position[2]);
  assert.ok(separation<1020 && separation>=1010,`separation=${separation}`);
});

test('collision snapshot storage is reused until massive-body topology changes',()=>{
  const a={id:'a',position:v(1,2,3),velocity:v(4,5,6)};
  const b={id:'b',position:v(7,8,9),velocity:v(10,11,12)};
  const snapshot=new CollisionStateBuffer().capture([a,b]);
  const positions=snapshot.positions, velocities=snapshot.velocities, index=snapshot.indexById;
  a.position[0]=99;
  snapshot.capture([a,b]);
  assert.equal(snapshot.positions,positions);
  assert.equal(snapshot.velocities,velocities);
  assert.equal(snapshot.indexById,index);
  snapshot.capture([a]);
  assert.notEqual(snapshot.positions,positions);
});
