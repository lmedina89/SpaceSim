import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('surface details expose canonical astronomy diagnostics and an accessible sky pause control', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['surfaceLatLon','surfaceRotationPhase','surfaceStarAltAz','surfaceSolarTime','surfaceStarDisk','surfaceEclipse','surfaceTargetPhase','surfaceTargetAngular','surfaceAstronomyPause']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} should be present in surface details`);
  }
  const detailsStart = html.indexOf('<div id="surfaceHudDetails"');
  for (const id of ['surfaceLatLon','surfaceRotationPhase','surfaceStarAltAz','surfaceSolarTime','surfaceStarDisk','surfaceEclipse','surfaceTargetPhase','surfaceTargetAngular','surfaceAstronomyPause']) {
    assert.ok(html.indexOf(`id="${id}"`) > detailsStart, `${id} should remain details-only`);
  }
  assert.match(html, /procedural body-fixed zero-meridian/);
  assert.match(html, /primary-star hour angle/);
});

test('surface diagnostics reuse the canonical observer solution and sky pause only gates celestial stepping', async () => {
  const source = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(source, /updateSurfaceHud\(astronomy = null\)/);
  assert.match(source, /const astronomySolution = astronomy \?\? this\.solveAstronomicalObserver\(\)/);
  assert.match(source, /const observedStar = primaryStar \? astronomySolution\?\.bodies\?\.find/);
  assert.match(source, /localSolarTimeHours\(parentBody, observerBodyFixed, starDirection, astronomySeconds\)/);
  assert.match(source, /rotationAngleAt\(parentBody, astronomySeconds\)/);
  assert.match(source, /inertialDirectionToBodyFixed\(parentBody, observerFromCenter, astronomySeconds\)/);
  assert.match(source, /surfaceLatitudeLongitude\(observerBodyFixed\)/);
  assert.match(source, /horizontalAzimuthDegrees\(observedStar\.localDirection\)/);
  assert.match(source, /toggleSurfaceAstronomyPause\(\)/);
  assert.match(source, /#surfaceAstronomyPause/);
  assert.match(source, /if \(this\.running\) this\.clock\.advance\(realDt, \(dt\) => this\.surfaceAstronomyStep\(dt\)/);
  assert.match(source, /stepSurfaceWeather\(this\.surfaceSession\.weather, this\.surfaceRegion, realDt\)/);
});

test('surface HUD refresh happens after the canonical astronomy solve in the render frame', async () => {
  const source = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  const method = source.match(/frameSurface\(now, realDt\) \{([\s\S]*?)\n  \}\n\n  frame\(now\)/);
  assert.ok(method, 'frameSurface should remain inspectable');
  const solveAt = method[1].indexOf('const astronomy = this.solveAstronomicalObserver()');
  const hudAt = method[1].indexOf('this.updateSurfaceHud(astronomy)');
  const renderAt = method[1].indexOf('this.renderer.renderSurface');
  assert.ok(solveAt >= 0 && hudAt > solveAt && renderAt > hudAt, 'diagnostics and renderer should share one solved astronomical frame');
});
