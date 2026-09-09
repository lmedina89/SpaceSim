import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('app derives one canonical observer solution for orbital and surface render paths', async () => {
  const source = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(source, /this\.astronomy\s*=\s*new AstronomicalObserverModel\(\)/);
  assert.match(source, /solveAstronomicalObserver\(modeOverride = null\)/);
  assert.match(source, /this\.renderer\.renderSurface\(\{[^\n]*astronomy/);
  assert.match(source, /this\.renderer\.render\(\{[^\n]*astronomy/);
  assert.match(source, /simulationTimeSeconds:\s*this\.clock\.elapsedSimSeconds/);
});

test('ship renderer consumes observer position and basis without owning physics', async () => {
  const source = await readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
  assert.match(source, /referenceFrame\.centerOn\(observer\?\.inertialPosition \?\? ship\.position\)/);
  assert.match(source, /const basis = observer \?\? ship\.basis\(\)/);
  assert.doesNotMatch(source, /observer\.inertialPosition\[[^\]]+\]\s*=/);
  assert.match(source, /centerStarfieldOnCamera\(\)/);
});
