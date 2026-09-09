import test from 'node:test';
import assert from 'node:assert/strict';
import { ExperimentRegistry } from '../src/experiments/experimentRegistry.js';
import { registerLabExperiments } from '../src/experiments/labSpawner.js';
import { BODY_KIND, PHYSICS } from '../src/core/constants.js';

function context(){return {userBodySerial:1,ship:{position:new Float64Array([0,0,0]),velocity:new Float64Array([0,0,0]),forward:()=>new Float64Array([1,0,0])},addBody(b){return b;}};}

test('extreme-object presets create distinct live Newtonian body kinds',()=>{
  const r=new ExperimentRegistry();registerLabExperiments(r);
  const magnetar=r.run('spawn-extreme-star',context(),{extremeType:'magnetar'});
  assert.equal(magnetar.kind,BODY_KIND.NEUTRON_STAR);assert.equal(magnetar.compactType,'magnetar');assert.ok(magnetar.magneticFieldTesla>=1e10);
  const white=r.run('spawn-extreme-star',context(),{extremeType:'white-dwarf'});
  assert.equal(white.kind,BODY_KIND.WHITE_DWARF);assert.ok(white.mass>0.5*PHYSICS.SOLAR_MASS);assert.ok(white.radius<1.2e7);
  const brown=r.run('spawn-extreme-star',context(),{extremeType:'brown-dwarf'});
  assert.equal(brown.kind,BODY_KIND.BROWN_DWARF);assert.ok(brown.mass>13*PHYSICS.JUPITER_MASS && brown.mass<80*PHYSICS.JUPITER_MASS);
  const rogue=r.run('spawn-extreme-star',context(),{extremeType:'rogue-planet'});
  assert.equal(rogue.kind,BODY_KIND.ROGUE_PLANET);assert.equal(rogue.gravitySource,true);
});
