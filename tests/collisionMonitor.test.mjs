import test from 'node:test';
import assert from 'node:assert/strict';
import { CollisionMonitor } from '../src/physics/collisionMonitor.js';

const v=(x,y,z)=>new Float64Array([x,y,z]);

test('swept collision monitor catches a fast body tunneling through a target between steps',()=>{
  const a={id:'a',radius:1000,position:v(0,0,0),velocity:v(0,0,0)};
  const b={id:'b',radius:10,position:v(5000,0,0),velocity:v(20000,0,0)};
  const prev=new Map([['a',v(0,0,0)],['b',v(-5000,0,0)]]);
  const events=new CollisionMonitor().scan([a,b],prev);
  assert.equal(events.length,1);
  assert.ok(events[0].stepFraction>0 && events[0].stepFraction<1);
});
