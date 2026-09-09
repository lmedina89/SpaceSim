import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS, BODY_KIND } from '../src/core/constants.js';
import { ShipDynamics } from '../src/physics/shipDynamics.js';
import { SimulationClock } from '../src/core/simulationClock.js';
import {
  stoppingDistanceMeters,
  computeMatchVelocityAcceleration,
  computeApproachAcceleration,
  computeStationKeepAcceleration,
  computeAbsoluteBrakeAcceleration,
  computeTurnAndBurnAcceleration,
  recommendedWarpCap,
  propulsionSafeStandOffDistanceMeters,
  targetGravityMps2,
  navigationPhysicsStepLimitSeconds,
  newtonianModelLimit,
} from '../src/physics/flightComputer.js';

const v=(x,y,z)=>new Float64Array([x,y,z]);
const ship=(position=v(0,0,0),velocity=v(0,0,0))=>({position,velocity});
const target=(position=v(1e9,0,0),velocity=v(0,0,0),radius=6e6,mass=0)=>({position,velocity,radius,mass,name:'Target'});

test('stopping distance follows v^2/(2a)',()=>{
  assert.equal(stoppingDistanceMeters(1000,20),25_000);
});

test('MATCH acceleration is bounded and opposes target-relative velocity',()=>{
  const s=ship(v(0,0,0),v(1000,200,0));
  const t=target(v(1e8,0,0),v(100,0,0));
  const r=computeMatchVelocityAcceleration(s,t,20,1);
  assert.ok(Math.hypot(...r.acceleration)<=20+1e-12);
  assert.ok(r.acceleration[0]<0 && r.acceleration[1]<0);
});

test('far APPROACH accelerates generally toward target while respecting cap',()=>{
  const r=computeApproachAcceleration(ship(),target(),120,1);
  assert.ok(r.acceleration[0]>0);
  assert.ok(Math.hypot(...r.acceleration)<=120+1e-12);
  assert.equal(r.phase,'approach');
});

test('near fast APPROACH commands braking rather than overshooting',()=>{
  const t=target(v(20_000_000,0,0),v(0,0,0),6_000_000);
  const s=ship(v(0,0,0),v(80_000,0,0));
  const r=computeApproachAcceleration(s,t,120,1);
  assert.ok(r.acceleration[0]<0, `${r.acceleration[0]}`);
  assert.equal(r.phase,'braking');
});

test('BRAKE uses bounded acceleration opposite inertial velocity instead of deleting velocity',()=>{
  const s=ship(v(0,0,0),v(100,0,0));
  const r=computeAbsoluteBrakeAcceleration(s,20,1);
  assert.ok(Math.abs(r.acceleration[0] + 20) < 1e-12);
  assert.ok(Math.abs(r.acceleration[1]) < 1e-12 && Math.abs(r.acceleration[2]) < 1e-12);
});

test('navigation warp recommendation collapses near a target',()=>{
  const cap=recommendedWarpCap({mode:'approach',targetState:{distanceMeters:6.05e6,closingSpeedMps:10_000,relativeSpeedMps:10_000},targetRadius:6e6});
  assert.equal(cap,1);
});

test('APPROACH transitions into persistent HOLD instead of dropping guidance at stand-off',()=>{
  const s=ship(v(0,0,0),v(0,0,0));
  const t=target(v(1e9,0,0),v(0,0,0),6e6,0);
  let frames=0,command=null,minDistance=Infinity;
  while(frames<5000){
    const pre=computeApproachAcceleration(s,t,120,1/60);
    const warp=recommendedWarpCap({mode:'approach',targetState:pre.state,targetRadius:t.radius,phase:pre.phase,targetGravityMps2:pre.targetGravityMps2,maxAccelerationMps2:120});
    const dt=warp/60;
    command=computeApproachAcceleration(s,t,120,dt);
    minDistance=Math.min(minDistance,command.state.distanceMeters);
    for(let k=0;k<3;k++){s.position[k]+=s.velocity[k]*dt+0.5*command.acceleration[k]*dt*dt;s.velocity[k]+=command.acceleration[k]*dt;}
    frames++;
    if(command.phase==='holding') break;
  }
  assert.equal(command.phase,'holding');
  assert.ok(frames/60<45, `${frames/60}s real-time equivalent`);
  assert.ok(minDistance>7.9e6, `unexpected overshoot ${minDistance}`);
  assert.ok(command.state.relativeSpeedMps < 10);
});

test('propulsion-safe stand-off keeps black-hole gravity below reserved engine fraction',()=>{
  const mass=3*PHYSICS.SOLAR_MASS;
  const rs=2*PHYSICS.G*mass/(PHYSICS.C*PHYSICS.C);
  const bh={kind:BODY_KIND.BLACK_HOLE,mass,radius:rs,position:v(0,0,0),velocity:v(0,0,0),name:'BH'};
  const r=propulsionSafeStandOffDistanceMeters(bh,120);
  assert.ok(r > 1e9, `stand-off ${r}`);
  assert.ok(targetGravityMps2(bh,r) <= 30.000001);
});

test('station keeping counter-thrusts target gravity at a safe stand-off',()=>{
  const t={kind:BODY_KIND.PLANET,mass:PHYSICS.EARTH_MASS,radius:PHYSICS.EARTH_RADIUS,position:v(0,0,0),velocity:v(0,0,0),name:'Earth'};
  const r=propulsionSafeStandOffDistanceMeters(t,120);
  const s=ship(v(r,0,0),v(0,0,0));
  const c=computeStationKeepAcceleration(s,t,120,1,{standOffDistanceMeters:r});
  assert.equal(c.phase,'holding');
  assert.ok(c.acceleration[0]>0, `expected outward +x counter-thrust, got ${c.acceleration[0]}`);
  assert.ok(Math.hypot(...c.acceleration)<=120+1e-12);
});

test('strong gravity reduces allowed physics substep',()=>{
  const t={kind:BODY_KIND.PLANET,mass:PHYSICS.EARTH_MASS,radius:PHYSICS.EARTH_RADIUS,position:v(0,0,0),velocity:v(0,0,0)};
  const s=ship(v(PHYSICS.EARTH_RADIUS+400_000,0,0),v(0,0,0));
  const limit=navigationPhysicsStepLimitSeconds(s,[t],300);
  assert.ok(limit < 30 && limit > 1, `${limit}`);
});

test('Newtonian model guard catches relativistic ship state and deep black-hole proximity',()=>{
  const fast=ship(v(0,0,0),v(PHYSICS.C*0.11,0,0));
  assert.equal(newtonianModelLimit(fast,[],0.1)?.reason,'speed');
  const mass=3*PHYSICS.SOLAR_MASS,rs=2*PHYSICS.G*mass/(PHYSICS.C*PHYSICS.C);
  const bh={kind:BODY_KIND.BLACK_HOLE,mass,radius:rs,position:v(0,0,0),velocity:v(0,0,0),name:'BH'};
  const close=ship(v(rs*50,0,0),v(0,0,0));
  assert.equal(newtonianModelLimit(close,[bh],0.1)?.reason,'black-hole-proximity');
});


test('cruise APPROACH to a 3-solar-mass black hole captures at propulsion-safe stand-off without relativistic runaway',()=>{
  const mass=3*PHYSICS.SOLAR_MASS;
  const rs=2*PHYSICS.G*mass/(PHYSICS.C*PHYSICS.C);
  const bh={kind:BODY_KIND.BLACK_HOLE,mass,radius:rs,position:v(0,0,0),velocity:v(0,0,0),name:'BH'};
  const s=new ShipDynamics(); s.engineMode='cruise'; s.position.set([1e10,0,0]);
  const clock=new SimulationClock();
  let phase='approach',modelLimit=null,maxSpeed=0,frames=0;
  for(;frames<7000;frames++){
    const pre=computeApproachAcceleration(s,bh,120,1);
    const warp=recommendedWarpCap({mode:'approach',targetState:pre.state,targetRadius:bh.radius,standOffDistanceMeters:pre.standOffDistance,phase:pre.phase,targetGravityMps2:pre.targetGravityMps2,maxAccelerationMps2:120});
    clock.setTimeScale(warp);
    clock.advance(1/60,(dt)=>{
      const cmd=computeApproachAcceleration(s,bh,120,dt);
      s.setNavigationAcceleration(cmd.acceleration);
      phase=cmd.phase;
      s.step(dt,[bh]);
      maxSpeed=Math.max(maxSpeed,Math.hypot(...s.velocity));
      modelLimit=newtonianModelLimit(s,[bh],0.1);
      return !modelLimit;
    },navigationPhysicsStepLimitSeconds(s,[bh],300));
    if(modelLimit||phase==='holding') break;
  }
  const safe=propulsionSafeStandOffDistanceMeters(bh,120);
  const radius=Math.hypot(...s.position);
  assert.equal(modelLimit,null);
  assert.equal(phase,'holding');
  assert.ok(frames/60<110, `${frames/60}s real-time equivalent`);
  assert.ok(Math.abs(radius-safe)/safe<1e-5, `${radius} vs ${safe}`);
  assert.ok(Math.hypot(...s.velocity)<10, `residual ${Math.hypot(...s.velocity)}`);
  assert.ok(maxSpeed<PHYSICS.C*0.1, `max speed ${maxSpeed}`);
});


test('TURN & BURN uses bounded acceleration to remove lateral velocity toward captured nose direction',()=>{
  const s=ship(v(0,0,0),v(1000,0,500));
  const command=computeTurnAndBurnAcceleration(s,[0,0,1],120,1);
  assert.ok(Math.hypot(...command.acceleration)<=120+1e-12);
  assert.ok(command.acceleration[0]<0,'should cancel +x lateral velocity');
  assert.ok(command.lateralSpeedMps>900);
  assert.equal(command.complete,false);
});

test('TURN & BURN is complete when velocity already follows desired direction',()=>{
  const s=ship(v(0,0,0),v(0,0,1000));
  const command=computeTurnAndBurnAcceleration(s,[0,0,1],5000,1);
  assert.equal(command.complete,true);
  assert.deepEqual(command.acceleration,[0,0,0]);
});
