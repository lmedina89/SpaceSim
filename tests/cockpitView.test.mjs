import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ship-view cockpit overlay shell and styling tokens exist', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(html, /id="cockpitOverlay"/);
  assert.match(html, /id="cockpitStatus"/);
  assert.match(html, /id="cockpitToggle"/);
  assert.match(css, /\.cockpit-overlay/);
  assert.match(css, /\.observe-active \.cockpit-overlay/);
  assert.match(css, /\.surface-active \.cockpit-overlay/);
});

test('app persists and updates cockpit view state', async () => {
  const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(app, /this\.cockpitEnabled = true/);
  assert.match(app, /cockpitEnabled: this\.cockpitEnabled/);
  assert.match(app, /this\.cockpitEnabled = payload\.cockpitEnabled !== false/);
  assert.match(app, /toggleCockpit\(/);
  assert.match(app, /updateCockpitUi\(/);
  assert.match(app, /syncViewClasses\(/);
});
