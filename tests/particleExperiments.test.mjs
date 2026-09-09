import test from 'node:test';
import assert from 'node:assert/strict';
import { SpatialHashGrid } from '../src/experiments/particles/spatialHashGrid.js';
import { ParticleExperiment } from '../src/experiments/particles/particleExperiment.js';
import { ParticleExperimentManager } from '../src/experiments/particles/particleExperimentManager.js';
import { PHYSICS } from '../src/core/constants.js';

const v = (x,y,z) => new Float64Array([x,y,z]);

test('typed spatial hash places nearby particles in retrievable cells', () => {
  const p = new Float64Array([0,0,0, 9,0,0, 31,0,0]);
  const active = new Uint8Array([1,1,1]);
  const grid = new SpatialHashGrid(3);
  grid.build(p, active, 3, v(0,0,0), 10);
  const head0 = grid.headAt(0,0,0);
  const chain=[]; for(let i=head0;i>=0;i=grid.next[i]) chain.push(i);
  assert.deepEqual(new Set(chain), new Set([0,1]));
  assert.equal(grid.headAt(3,0,0), 2);
});

test('gravity cloud uses SI major-body gravity without sourcing gravity itself', () => {
  const field = new ParticleExperiment({ id:'g',seed:'g',mode:'gravity',count:1,radiusMeters:1e6,initialSpeedMps:0,origin:v(7e6,0,0),baseVelocity:v(0,0,0),majorGravity:true });
  field.position.set([7e6,0,0]); field.velocity.fill(0); field.active[0]=1; field.activeCountValue=1;
  const earth={mass:PHYSICS.EARTH_MASS,radius:PHYSICS.EARTH_RADIUS,position:v(0,0,0),velocity:v(0,0,0)};
  field.step(0.1,[earth]);
  assert.ok(field.velocity[0] < 0, 'particle should accelerate toward Earth');
  assert.equal(field.mass, undefined, 'experiment particles are not gravity-source bodies');
});

test('particle life can birth a dead slot from exactly three live neighbors', () => {
  const field = new ParticleExperiment({ id:'life',seed:'life',mode:'life',count:4,radiusMeters:100,neighborRadiusMeters:10,initialSpeedMps:0,origin:v(0,0,0),baseVelocity:v(0,0,0),majorGravity:false });
  field.position.set([0,0,0, 2,0,0, -2,0,0, 0,2,0]);
  field.velocity.fill(0);
  field.active.set([0,1,1,1]); field.activeCountValue=3;
  field._applyLifeRules();
  assert.equal(field.active[0],1);
  assert.ok(field.births >= 1);
});

test('species spatial-neighbor work stays far below all-pairs in a sparse field', () => {
  const n=2000;
  const field = new ParticleExperiment({ id:'species',seed:'sparse',mode:'species',count:n,radiusMeters:2e8,neighborRadiusMeters:2e6,initialSpeedMps:0,localStrengthMps2:20,origin:v(0,0,0),baseVelocity:v(0,0,0),majorGravity:false });
  field._applySpeciesForces(0.1);
  assert.ok(field.neighborChecks < n*n*0.05, `checks=${field.neighborChecks}`);
});

test('particle manager caps active experiment warp and total budget', () => {
  const manager=new ParticleExperimentManager();
  const context={system:{seed:'x'},clock:{elapsedSimSeconds:0},ship:{position:v(0,0,0),velocity:v(0,0,0),forward:()=>v(0,0,-1)}};
  const field=manager.spawnField(context,{mode:'gravity',count:5000,radiusMeters:2e7,neighborRadiusMeters:2e6,initialSpeedMps:0,majorGravity:false});
  assert.equal(field.count,5000);
  assert.equal(manager.recommendedWarpCap,60);
  manager.spawnField(context,{mode:'gravity',count:30000,radiusMeters:2e7});
  assert.throws(()=>manager.spawnField(context,{mode:'gravity',count:10000,radiusMeters:2e7}),/budget/i);
});

test('particle gun inherits ship velocity and points generally forward', () => {
  const manager=new ParticleExperimentManager();
  const context={system:{seed:'x'},clock:{elapsedSimSeconds:0},ship:{position:v(0,0,0),velocity:v(100,20,30),forward:()=>v(0,0,-1)}};
  const gun=manager.fireGun(context,{count:100,speedMps:10000,spreadDegrees:1});
  let meanVz=0; for(let i=0;i<gun.count;i++) meanVz += gun.velocity[i*3+2]; meanVz/=gun.count;
  assert.ok(meanVz < -9800 + 30, `meanVz=${meanVz}`);
});

test('finite-radius major body absorbs experiment particles on contact', () => {
  const field = new ParticleExperiment({ id:'hit',seed:'hit',mode:'gravity',count:1,radiusMeters:1e6,initialSpeedMps:0,origin:v(0,0,0),baseVelocity:v(0,0,0),majorGravity:true });
  field.position.set([10,0,0]); field.active[0]=1; field.activeCountValue=1;
  const body={mass:1e20,radius:100,position:v(0,0,0),velocity:v(0,0,0)};
  field.step(0.1,[body]);
  assert.equal(field.activeCount,0);
  assert.equal(field.absorbedCount,1);
});

test('mode-specific mobile limits clamp expensive artificial fields', () => {
  const manager=new ParticleExperimentManager();
  const context={system:{seed:'x'},clock:{elapsedSimSeconds:0},ship:{position:v(0,0,0),velocity:v(0,0,0),forward:()=>v(0,0,-1)}};
  const species=manager.spawnField(context,{mode:'species',count:30000,radiusMeters:2e7,neighborRadiusMeters:1e6,majorGravity:false});
  assert.equal(species.count,4000);
});

test('fine particle modes fully consume a 3-second particle-safe frame interval', () => {
  const field = new ParticleExperiment({ id:'fine',seed:'fine',mode:'life',count:1000,radiusMeters:2e7,neighborRadiusMeters:1e6,initialSpeedMps:0,origin:v(0,0,0),baseVelocity:v(0,0,0),majorGravity:false });
  const result=field.step(3,[]);
  assert.equal(result.droppedSeconds,0);
  assert.equal(result.simulatedSeconds,3);
  assert.equal(result.substeps,3);
});
