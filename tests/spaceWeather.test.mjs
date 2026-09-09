import test from 'node:test';
import assert from 'node:assert/strict';
import { SpaceWeatherManager } from '../src/cosmic/spaceWeather.js';
import { PHYSICS, BODY_KIND } from '../src/core/constants.js';

test('CME front propagates at the configured kinematic speed', () => {
  const m = new SpaceWeatherManager(); m.reset('WEATHER-TEST',0); m.autoEnabled=false;
  const star={id:'star',kind:BODY_KIND.STAR,radius:PHYSICS.SOLAR_RADIUS,position:new Float64Array([0,0,0]),velocity:new Float64Array([0,0,0])};
  const e=m.triggerCme(star,0,{direction:[1,0,0],speedMps:1_000_000,halfAngleRad:.5});
  const a=m.eventState(e,star,1000),b=m.eventState(e,star,2000);
  assert.equal(b.radiusMeters-a.radiusMeters,1_000_000_000);
  assert.equal(a.speedMps,1_000_000);
});

test('CME crossing detector reports ship hit only inside the directional cone', () => {
  const m = new SpaceWeatherManager();m.reset('WEATHER-HIT',0);m.autoEnabled=false;
  const star={id:'star',radius:1e9,position:new Float64Array([0,0,0]),velocity:new Float64Array([0,0,0])};
  const e=m.triggerCme(star,0,{direction:[1,0,0],speedMps:1_000_000,halfAngleRad:.4});
  const t=1000;const state=m.eventState(e,star,t);
  const ship={position:new Float64Array([state.radiusMeters,0,0]),velocity:new Float64Array([0,0,0])};
  const notices=m.step(t,star,ship);
  assert.ok(notices.some((n)=>n.type==='ship-hit'));
  assert.equal(e.hitShip,true);
});

test('automatic seeded space weather schedules a future event', () => {
  const m=new SpaceWeatherManager();m.reset('WEATHER-AUTO',0);
  assert.ok(m.nextAutoEventSeconds>=.7*PHYSICS.DAY && m.nextAutoEventSeconds<=2.4*PHYSICS.DAY);
});

test('CME swept-front crossing is not missed when one simulation step moves the front past the ship', () => {
  const m = new SpaceWeatherManager(); m.reset('WEATHER-SWEPT',0); m.autoEnabled=false;
  const star={id:'star',radius:1e9,position:new Float64Array([0,0,0]),velocity:new Float64Array([0,0,0])};
  const e=m.triggerCme(star,0,{direction:[1,0,0],speedMps:1_000_000,halfAngleRad:.5});
  const ship={position:new Float64Array([2.0e9,0,0]),velocity:new Float64Array([0,0,0])};
  m.step(50,star,ship);
  ship.position[0]=1.5e9;
  const notices=m.step(700,star,ship);
  assert.ok(notices.some((n)=>n.type==='ship-hit'));
  assert.equal(e.hitShip,true);
});
