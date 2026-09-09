import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationClock } from '../src/core/simulationClock.js';

test('simulation clock honors a caller-supplied adaptive substep ceiling',()=>{
  const clock=new SimulationClock();
  clock.setTimeScale(600);
  const steps=[];
  clock.advance(1/60,(dt)=>{steps.push(dt);return true;},2);
  assert.equal(steps.length,5);
  assert.ok(steps.every((dt)=>dt<=2+1e-12));
  assert.ok(Math.abs(clock.elapsedSimSeconds-10)<1e-12);
});

test('simulation clock stops remaining substeps when the scientific model asks it to halt',()=>{
  const clock=new SimulationClock();
  clock.setTimeScale(600);
  let calls=0;
  clock.advance(1/60,()=>{calls+=1;return false;},1);
  assert.equal(calls,1);
  assert.equal(clock.elapsedSimSeconds,1);
});
