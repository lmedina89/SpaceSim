import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS, BODY_KIND } from '../src/core/constants.js';
import { ShipDynamics } from '../src/physics/shipDynamics.js';
import {
  normalizeTransitMultiple,
  transitSpeedMps,
  transitArrivalDistanceMeters,
  effectiveTransitMultiple,
  advanceTransitPosition,
  transitClearanceCheck,
  firstTransitGuardHit,
  matchFrameExitVelocity,
} from '../src/physics/transitDrive.js';

const v=(x,y,z)=>new Float64Array([x,y,z]);

test('frame tiers are explicitly coordinate-rate multiples of c, not local ship velocity',()=>{
  assert.equal(normalizeTransitMultiple(87),100);
  assert.equal(transitSpeedMps(100),100*PHYSICS.C);
});

test('frame arrival envelope is based on safe stand-off rather than pre-entry Newtonian delta-v',()=>{
  const target={name:'Planet',kind:BODY_KIND.PLANET,mass:PHYSICS.EARTH_MASS,radius:PHYSICS.EARTH_RADIUS,position:v(5*PHYSICS.AU,0,0),velocity:v(0,0,0)};
  const slow=new ShipDynamics();
  const fast=new ShipDynamics();
  fast.velocity.set([23_000_000,0,0]);
  const slowArrival=transitArrivalDistanceMeters(slow,target,5000);
  const fastArrival=transitArrivalDistanceMeters(fast,target,5000);
  assert.equal(fastArrival,slowArrival);
  assert.ok(slowArrival>target.radius);
});

test('normal frame exit matches only the spacecraft to target inertial velocity',()=>{
  const ship=new ShipDynamics();
  ship.velocity.set([23_000_000,-1200,450]);
  const target={position:v(9,8,7),velocity:v(29_800,55,-11)};
  const targetPositionBefore=[...target.position];
  const targetVelocityBefore=[...target.velocity];
  const result=matchFrameExitVelocity(ship,target);
  assert.equal(result.matched,true);
  assert.ok(result.deltaVMps>1_000_000);
  assert.deepEqual([...ship.velocity],targetVelocityBefore);
  assert.deepEqual([...target.position],targetPositionBefore);
  assert.deepEqual([...target.velocity],targetVelocityBefore);
});

test('frame rate automatically steps down near target',()=>{
  const arrival=1e8;
  assert.equal(effectiveTransitMultiple(1000,20*PHYSICS.AU,arrival),1000);
  assert.equal(effectiveTransitMultiple(1000,1*PHYSICS.AU,arrival),100);
  assert.equal(effectiveTransitMultiple(1000,.2*PHYSICS.AU,arrival),10);
  assert.equal(effectiveTransitMultiple(1000,.05*PHYSICS.AU,arrival),1);
});

test('frame position step never overshoots its arrival envelope',()=>{
  const start=v(0,0,0),target=v(PHYSICS.AU,0,0),arrival=1e8;
  let p=start;
  for(let i=0;i<2500;i++){
    const step=advanceTransitPosition(p,target,1000,.1,arrival);
    p=step.nextPosition;
    if(step.arrived) break;
  }
  const remaining=Math.hypot(target[0]-p[0],target[1]-p[1],target[2]-p[2]);
  assert.ok(remaining>=arrival-1,`${remaining}`);
  assert.ok(Math.abs(remaining-arrival)<10,`${remaining} vs ${arrival}`);
});

test('swept frame guard catches a massive body crossed between frames',()=>{
  const body={id:'planet',name:'Planet',kind:BODY_KIND.PLANET,radius:PHYSICS.EARTH_RADIUS,position:v(0,0,0)};
  const start=v(-5e8,0,0),end=v(5e8,0,0);
  const hit=firstTransitGuardHit(start,end,[body]);
  assert.equal(hit?.body.id,'planet');
  assert.ok(hit.fraction>0&&hit.fraction<1);
});

test('frame engagement clearance rejects starting inside a body safety envelope',()=>{
  const body={id:'star',name:'Star',kind:BODY_KIND.STAR,radius:PHYSICS.SOLAR_RADIUS,position:v(0,0,0)};
  const result=transitClearanceCheck(v(PHYSICS.SOLAR_RADIUS*2,0,0),[body]);
  assert.equal(result?.body.id,'star');
});
