import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const hud = await readFile(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
const planner = await readFile(new URL('../src/navigation/observationPlanner.js', import.meta.url), 'utf8');

test('observation planner is exposed from NAV without owning authoritative simulation state', () => {
  for (const id of ['mapEventsAction','surfacePlannerButton','eventsPanel','eventObserverName','eventObserverModel','eventHorizon','eventSearch','eventCancel','eventProgressFill','eventResults']) {
    assert.ok(html.includes(`id="${id}"`), `missing planner UI ${id}`);
  }
  for (const token of ['openObservationPlanner','openSurfaceObservationPlanner','startObservationPlanner','cancelObservationPlanner','new ObservationPlannerSearch','requestAnimationFrame(tick)']) {
    assert.ok(app.includes(token), `missing planner app integration ${token}`);
  }
  assert.ok(hud.includes('toggleEvents'));
  assert.ok(planner.includes('cloneBodiesForObservationPlanning'));
  assert.ok(planner.includes('VelocityVerletIntegrator'));
  assert.ok(planner.includes('diskOccultation'));
  assert.ok(planner.includes('CURRENT LANDED SITE'));
  assert.ok(planner.includes('BODY CENTER'));
});

test('planner UI states its scientific limitations instead of promising exact future piloted motion', () => {
  assert.ok(html.includes('temporary copy of the same gravity-source bodies'));
  assert.ok(html.includes('does not predict future pilot motion'));
  assert.ok(html.includes('future collision/fragmentation events'));
  assert.ok(html.includes('Numerical work is bounded'));
});
