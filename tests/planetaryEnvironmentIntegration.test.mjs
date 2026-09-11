import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app/app.js', import.meta.url), 'utf8');
const map = readFileSync(new URL('../src/ui/systemMap.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cockpit = readFileSync(new URL('../src/render/cockpitView.js', import.meta.url), 'utf8');

test('schema-1 serialization persists seeded environment formation metadata without creating new dynamics', () => {
  assert.match(app, /environmentModelVersion: body\.environmentModelVersion/);
  assert.match(app, /environmentFormationModel: body\.environmentFormationModel/);
  assert.match(app, /environmentFormation: body\.environmentFormation/);
  assert.match(app, /applyGeneratedBodyCompatibility\(restored, generated\)/);
});

test('NAV exposes canonical planetary environment diagnostics and proxy boundaries', () => {
  for (const id of ['mapSelectionEscape','mapSelectionFlux','mapSelectionEquilibrium','mapSelectionAlbedo','mapSelectionPressure','mapSelectionRetention','mapSelectionVolatiles','mapSelectionSurfaceFamily','mapSelectionTidal']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.match(map, /snapshot\.environment/);
  assert.match(map, /RADIATIVE EQ/);
  assert.match(map, /FORMATION\/RETENTION MODEL|H\/HE ENVELOPE/);
});

test('cockpit science MFD labels modeled planetary temperature as radiative equilibrium', () => {
  assert.match(app, /derivePlanetaryEnvironment\(target, this\.bodies\)/);
  assert.match(app, /targetTemperatureModel:.*RADIATIVE EQ/s);
  assert.match(cockpit, /targetTemperatureModel === 'RADIATIVE EQ' \? 'EQ TEMP' : 'TEMP'/);
});
