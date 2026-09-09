import test from 'node:test';
import assert from 'node:assert/strict';
import { stoppingDistanceMeters, computeMatchVelocityAcceleration, computeApproachAcceleration, computeAbsoluteBrakeAcceleration, recommendedWarpCap } from '../src/physics/flightComputer.js';

const v=(x,y,z)=>new Float64Array([x,y,z]);
const ship=(position=v(0,0,0),velocity=v(0,0,0))=>({position,velocity});
const target=(position=v(1e9,0,0),velocity=v(0,0,0),radius=6e6)=>({position,velocity,radius,name:'Target'});

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


test('auto-warp APPROACH reaches a planetary stand-off quickly without crossing the target in a kinematic regression',()=>{
  const s=ship(v(0,0,0),v(0,0,0));
  const t=target(v(1e9,0,0),v(0,0,0),6e6);
  let frames=0,command=null,minDistance=Infinity;
  while(frames<5000){
    const state={
      distanceMeters:Math.hypot(t.position[0]-s.position[0],t.position[1]-s.position[1],t.position[2]-s.position[2]),
      closingSpeedMps:0,relativeSpeedMps:0,
    };
    const to=[t.position[0]-s.position[0],t.position[1]-s.position[1],t.position[2]-s.position[2]];
    const d=Math.hypot(...to)||1; const dir=to.map(x=>x/d);
    const rv=[s.velocity[0]-t.velocity[0],s.velocity[1]-t.velocity[1],s.velocity[2]-t.velocity[2]];
    state.relativeSpeedMps=Math.hypot(...rv); state.closingSpeedMps=rv[0]*dir[0]+rv[1]*dir[1]+rv[2]*dir[2];
    const warp=recommendedWarpCap({mode:'approach',targetState:state,targetRadius:t.radius});
    const dt=warp/60;
    command=computeApproachAcceleration(s,t,120,dt);
    minDistance=Math.min(minDistance,command.state.distanceMeters);
    for(let k=0;k<3;k++){s.position[k]+=s.velocity[k]*dt+0.5*command.acceleration[k]*dt*dt;s.velocity[k]+=command.acceleration[k]*dt;}
    frames++;
    if(command.phase==='arrived'&&command.state.relativeSpeedMps<1) break;
  }
  assert.equal(command.phase,'arrived');
  assert.ok(frames/60<40, `${frames/60}s real-time equivalent`);
  assert.ok(minDistance>7.9e6, `unexpected overshoot ${minDistance}`);
});
