import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('observation planner disables iOS text autosizing only inside planner boundary', () => {
  assert.match(css, /\.event-planner-panel\{[^}]*-webkit-text-size-adjust:100%/);
  assert.match(css, /\.event-planner-panel \*\{[^}]*-webkit-text-size-adjust:100%/);
});

test('observation event cards are content-sized and independently scrollable in short landscape', () => {
  assert.match(css, /\.event-results\{[^}]*grid-auto-rows:max-content[^}]*overflow-y:auto[^}]*-webkit-overflow-scrolling:touch/);
  assert.match(css, /\.event-result-card\{[^}]*height:auto[^}]*min-height:72px[^}]*white-space:normal[^}]*overflow:visible/);
  assert.match(css, /max-height:500px\)[^{]*\{[^}]*\.event-planner-panel\{[^}]*width:min\(760px,97vw\)/);
  assert.match(css, /\.event-results\{height:clamp\(138px,38svh,180px\);min-height:138px;max-height:none/);
  assert.match(css, /\.event-result-card\{min-height:68px/);
});
