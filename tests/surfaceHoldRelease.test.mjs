import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../src/app/app.js', import.meta.url);

function bindHoldSource(source) {
  const start = source.indexOf('    const bindHold = (element, on, off) => {');
  const end = source.indexOf("    bindHold($('#thrustButton')", start);
  assert.ok(start >= 0 && end > start, 'bindHold source block must exist');
  return source.slice(start, end);
}

test('hold controls have independent touchend/touchcancel release fallback for iPhone WebKit', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const binding = bindHoldSource(source);
  assert.match(binding, /const releaseTouchFallback = \(event\) =>/);
  assert.match(binding, /event\?\.targetTouches\?\.length > 0/);
  assert.match(binding, /element\.addEventListener\('touchend', releaseTouchFallback, \{ passive: true \}\)/);
  assert.match(binding, /element\.addEventListener\('touchcancel', releaseTouchFallback, \{ passive: true \}\)/);
  assert.match(binding, /release\(null, true\)/);
});

test('all-touches-up and pagehide force-clear every held control', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  assert.match(source, /const releaseHoldsWhenAllTouchesEnd = \(event\) =>/);
  assert.match(source, /\(event\?\.touches\?\.length \?\? 0\) === 0\) this\.releaseAllHeldControls\(\)/);
  assert.match(source, /document\.addEventListener\('touchend', releaseHoldsWhenAllTouchesEnd, true\)/);
  assert.match(source, /document\.addEventListener\('touchcancel', releaseHoldsWhenAllTouchesEnd, true\)/);
  assert.match(source, /window\.addEventListener\('pagehide', \(\) => this\.releaseAllHeldControls\(\)\)/);
});

test('surface direction releases remain sign-safe when opposite controls share one axis', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  assert.match(source, /surfaceForward'\), \(\) => \{ this\.surfaceInput\.forward = 1; \}, \(\) => \{ if \(this\.surfaceInput\.forward > 0\) this\.surfaceInput\.forward = 0; \}/);
  assert.match(source, /surfaceBack'\), \(\) => \{ this\.surfaceInput\.forward = -1; \}, \(\) => \{ if \(this\.surfaceInput\.forward < 0\) this\.surfaceInput\.forward = 0; \}/);
  assert.match(source, /surfaceLeft'\), \(\) => \{ this\.surfaceInput\.strafe = -1; \}, \(\) => \{ if \(this\.surfaceInput\.strafe < 0\) this\.surfaceInput\.strafe = 0; \}/);
  assert.match(source, /surfaceRight'\), \(\) => \{ this\.surfaceInput\.strafe = 1; \}, \(\) => \{ if \(this\.surfaceInput\.strafe > 0\) this\.surfaceInput\.strafe = 0; \}/);
});
