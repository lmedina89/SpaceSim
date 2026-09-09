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

test('fragments from the same representative family do not recursively collide',()=>{
  const a={id:'f1',radius:100,position:v(0,0,0),velocity:v(0,0,0),fragmentFamilyId:'family-1'};
  const b={id:'f2',radius:100,position:v(150,0,0),velocity:v(0,0,0),fragmentFamilyId:'family-1'};
  assert.equal(new CollisionMonitor().scan([a,b],null,1000).length,0);
});

test('new impact fragments honor collision grace time',()=>{
  const a={id:'f1',radius:100,position:v(0,0,0),velocity:v(0,0,0),collisionGraceUntil:100};
  const b={id:'planet',radius:1000,position:v(1000,0,0),velocity:v(0,0,0)};
  assert.equal(new CollisionMonitor().scan([a,b],null,50).length,0);
});
