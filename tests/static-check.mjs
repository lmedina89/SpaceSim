import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const required = [
  'index.html','styles.css','src/main.js','src/app/app.js','src/core/constants.js','src/data/systemGenerator.js',
  'src/physics/gravity/directGravitySolver.js','src/physics/integrators/velocityVerlet.js','src/physics/orbitalMetrics.js',
  'src/physics/trajectoryPredictor.js','src/physics/shipDynamics.js','src/render/threeRenderer.js','README.md','ARCHITECTURE.md','SCIENTIFIC-NOTES.md'
];
for (const file of required) await access(new URL(`../${file}`, import.meta.url), constants.R_OK);
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (!html.includes('three@0.185.0')) throw new Error('Three.js version is not pinned.');
if (!html.includes('./src/main.js')) throw new Error('Main module missing from shell.');
if (!html.includes('Universe Lab v0.1.1.2')) throw new Error('Shell version is not v0.1.1.2.');
if (pkg.version !== '0.1.1.2') throw new Error('package.json version mismatch.');
if (!html.includes('id="warpQuick"')) throw new Error('Quick time-warp control missing.');
if (!html.includes('id="morePanel"')) throw new Error('Secondary mobile control drawer missing.');
const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
if (!css.includes('--app-height')) throw new Error('Visual viewport height CSS hook missing.');
if (!css.includes('-webkit-touch-callout:none')) throw new Error('iOS touch-callout suppression missing.');
if (!css.includes('user-select:none')) throw new Error('Game-surface text-selection suppression missing.');
if (!css.includes('.hold-button.thrust{grid-row:1 / span 2')) throw new Error('Large thumb-safe thrust cluster missing.');
const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
if (!main.includes('visualViewport')) throw new Error('VisualViewport mobile sizing hook missing.');
const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
for (const token of ['selectstart','contextmenu','lostpointercapture','document.addEventListener(\'pointerup\'','aria-pressed','is-held']) {
  if (!app.includes(token)) throw new Error(`Hardened iOS hold-input token missing: ${token}`);
}
console.log(`Static structure OK (${required.length} required files).`);
