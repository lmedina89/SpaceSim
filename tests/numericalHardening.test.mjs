import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY_KIND, PHYSICS } from '../src/core/constants.js';
import { SimulationClock } from '../src/core/simulationClock.js';
import { generateSystem } from '../src/data/systemGenerator.js';
import { massivePairPhysicsStepLimitSeconds } from '../src/physics/massivePairStepControl.js';
import { TestParticleField } from '../src/physics/testParticleField.js';
import { TrajectoryPredictor } from '../src/physics/trajectoryPredictor.js';

const v=(x,y,z)=>new Float64Array([x,y,z]);

test('normal generated ORIGIN system keeps the 300 s major-body ceiling while a close magnetar pair tightens it',()=>{
  const origin=generateSystem('ORIGIN-001').bodies.filter((body)=>body.gravitySource!==false);
  assert.ok(Math.abs(massivePairPhysicsStepLimitSeconds(origin,300)-300)<1e-9);
  const mass=1.55*PHYSICS.SOLAR_MASS;
  const pair=[
    {id:'m1',kind:BODY_KIND.NEUTRON_STAR,mass,radius:12_000,gravitySource:true,position:v(0,0,0),velocity:v(0,0,0)},
    {id:'m2',kind:BODY_KIND.NEUTRON_STAR,mass,radius:12_000,gravitySource:true,position:v(1.2e8,0,0),velocity:v(0,0,0)},
  ];
  const limit=massivePairPhysicsStepLimitSeconds(pair,300);
  assert.ok(limit>0.1 && limit<10,`limit=${limit}`);
});

test('SimulationClock can reevaluate a dynamic substep ceiling after every substep',()=>{
  const clock=new SimulationClock();
  clock.setTimeScale(600);
  const steps=[];
  let calls=0;
  clock.advance(1/60,(dt)=>{steps.push(dt);calls+=1;return true;},()=>calls<2?2:1);
  assert.deepEqual(steps,[2,2,1,1,1,1,1,1]);
  assert.ok(Math.abs(clock.elapsedSimSeconds-10)<1e-12);
});

test('minor test-particle field honors its 30 Hz cadence at 1x-sized frame steps',()=>{
  const star={id:'star',mass:PHYSICS.SOLAR_MASS,position:v(0,0,0),velocity:v(0,0,0)};
  const field=new TestParticleField('CADENCE',star,1);
  const x0=field.position[0];
  assert.equal(field.advance(1/60,[star]),false);
  assert.equal(field.position[0],x0);
  assert.equal(field.advance(1/60,[star]),true);
  assert.notEqual(field.position[0],x0);
});



test('trajectory probe is one-way: changing probe mass does not perturb the predicted path',()=>{
  const earth={id:'earth',name:'Earth',mass:PHYSICS.EARTH_MASS,radius:PHYSICS.EARTH_RADIUS,gravitySource:true,position:v(0,0,0),velocity:v(0,0,0)};
  const r=PHYSICS.EARTH_RADIUS+1_000_000;
  const speed=Math.sqrt(PHYSICS.G*PHYSICS.EARTH_MASS/r);
  const predictor=new TrajectoryPredictor();
  const light=predictor.predict({mass:1,radius:1,position:v(r,0,0),velocity:v(0,0,speed)},[earth],3600,120,'earth');
  const absurdlyHeavy=predictor.predict({mass:1e30,radius:1,position:v(r,0,0),velocity:v(0,0,speed)},[earth],3600,120,'earth');
  assert.deepEqual([...light.points],[...absurdlyHeavy.points]);
});

test('long strong-gravity trajectory prediction stays CPU-bounded and explicitly reports numerical budget limiting',()=>{
  const earth={id:'earth',name:'Earth',mass:PHYSICS.EARTH_MASS,radius:PHYSICS.EARTH_RADIUS,gravitySource:true,position:v(0,0,0),velocity:v(0,0,0)};
  const r=PHYSICS.EARTH_RADIUS+400_000;
  const speed=Math.sqrt(PHYSICS.G*PHYSICS.EARTH_MASS/r);
  const predictor=new TrajectoryPredictor();
  const result=predictor.predict({mass:12_000,radius:5,position:v(r,0,0),velocity:v(0,0,speed)},[earth],30*PHYSICS.DAY,420,'earth');
  assert.equal(result.accuracyLimited,true);
  assert.ok(result.internalSteps<=420*8);
  assert.ok(result.points.length<=420*3);
});
