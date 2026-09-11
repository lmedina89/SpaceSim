import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = () => readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
const htmlSource = () => readFile(new URL('../index.html', import.meta.url), 'utf8');

test('FRAME drive isolates only ShipDynamics while world integration remains on the normal path', async()=>{
  const app=await appSource();
  const start=app.indexOf('physicsStep(dt)');
  const end=app.indexOf('frameSurface(now, realDt)',start);
  const block=app.slice(start,end);
  assert.match(block,/this\.integrator\.step\(sources, dt\);/);
  assert.match(block,/if \(this\.transitState\.active\) \{[\s\S]*this\.ship\.clearNavigationAcceleration\(\);[\s\S]*\} else \{[\s\S]*this\.ship\.step\(dt, sources\);/);
  assert.match(block,/this\.minorField\?\.step\(dt, sources\);/);
  assert.match(block,/this\.particleExperiments\.step\(dt, sources\);/);
  assert.match(block,/this\.spaceWeather\.step/);
});

test('FRAME is a tap-toggle control and not a hold gesture', async()=>{
  const app=await appSource();
  const html=await htmlSource();
  assert.match(html,/id="frameQuick"/);
  assert.match(app,/#frameQuick'\)\.addEventListener\('click', \(\) => this\.engageTransit\(\)\)/);
  assert.doesNotMatch(app,/bindHold\(\$\('#frameQuick'/);
});

test('FRAME can translate while simulation is paused without advancing world time', async()=>{
  const app=await appSource();
  assert.match(app,/if \(this\.transitState\.active\) this\.updateTransit\(orbitalRealDt\);[\s\S]*if \(this\.running\) this\.clock\.advance/);
});

test('FRAME exit policy keeps manual inertial matching while completed body arrivals can use circular orbit insertion', async()=>{
  const app=await appSource();
  assert.match(app,/this\.disengageTransit\(\{ notify: true, restoreWarp: false, matchTarget: true \}\);/);
  assert.match(app,/completeFrameArrival\(locked\)/);
  assert.match(app,/applyFrameOrbitInsertion\(this\.ship, target, plan\)/);
  assert.match(app,/matchTarget: true, reason: `FRAME ARRIVAL:/);
  assert.match(app,/matchTarget: false, reason: 'FRAME target disappeared/);
  assert.match(app,/matchTarget: false, reason: `FRAME safety dropout before/);
  assert.match(app,/planFrameGuardRoute\(this\.ship\.position/);
  assert.match(app,/resolveFrameGuardWaypoint/);
  assert.match(app,/matchFrameExitVelocity\(this\.ship, locked\.target\)/);
});

test('FRAME UI is presented as tap-toggle and refreshes cockpit state immediately', async()=>{
  const app=await appSource();
  const html=await htmlSource();
  assert.match(html,/id="frameQuick"[^>]*aria-pressed="false"[^>]*>FRAME<\/button>/);
  assert.match(html,/id="mapTransitAction"[^>]*>FRAME TO TARGET<\/button>/);
  assert.doesNotMatch(html,/>OPEN TRANSIT<\/button>/);
  const engageStart=app.indexOf('\n  engageTransit()');
  const exitStart=app.indexOf('\n  disengageTransit(', engageStart);
  const updateStart=app.indexOf('\n  updateTransit(realDt)', exitStart);
  assert.ok(engageStart>=0&&exitStart>engageStart&&updateStart>exitStart);
  assert.match(app.slice(engageStart, exitStart),/updateCockpitUi\(\)/);
  assert.match(app.slice(exitStart, updateStart),/updateCockpitUi\(\)/);
});
