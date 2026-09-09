import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const required = [
  'index.html','styles.css','src/main.js','src/app/app.js','src/core/constants.js','src/data/systemGenerator.js',
  'src/physics/gravity/directGravitySolver.js','src/physics/integrators/velocityVerlet.js','src/physics/orbitalMetrics.js',
  'src/physics/trajectoryPredictor.js','src/physics/shipDynamics.js','src/physics/flightComputer.js','src/physics/impactResolver.js',
  'src/experiments/particles/spatialHashGrid.js','src/experiments/particles/particleExperiment.js','src/experiments/particles/particleExperimentManager.js',
  'src/render/threeRenderer.js','src/render/observationCamera.js','README.md','ARCHITECTURE.md','SCIENTIFIC-NOTES.md'
];
for (const file of required) await access(new URL(`../${file}`, import.meta.url), constants.R_OK);
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (!html.includes('three@0.185.0')) throw new Error('Three.js version is not pinned.');
if (!html.includes('./src/main.js')) throw new Error('Main module missing from shell.');
if (!html.includes('Universe Lab v0.1.3.2.2')) throw new Error('Shell version is not v0.1.3.2.2.');
if (pkg.version !== '0.1.3.2.2') throw new Error('package.json version mismatch.');
if (!html.includes('id="warpQuick"')) throw new Error('Quick time-warp control missing.');
if (!html.includes('id="morePanel"')) throw new Error('Secondary mobile control drawer missing.');
if (!html.includes('id="approachButton"') || !html.includes('id="matchVelocity"') || !html.includes('id="engineModeButton"')) throw new Error('Scientific flight-computer controls missing.');
if (!html.includes('>BRAKE</button>')) throw new Error('Physical BRAKE control missing.');
for (const id of ['particleMode','particleCount','spawnParticleField','fireParticleGun','clearParticleExperiments','particleStatus','experimentSelect','observeExperiment','trackExperiment','orbitExperiment','rendezvousExperiment','shipViewButton','cameraChip']) if (!html.includes(`id=\"${id}\"`)) throw new Error(`Particle experiment control missing: ${id}`);
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
if (!html.includes('data-preset="chicxulub"')) throw new Error('Impact preset controls missing.');
const factory = await readFile(new URL('../src/render/celestialFactory.js', import.meta.url), 'utf8');
if (!factory.includes('Exposure-floor shell')) throw new Error('WebGPU body-color exposure floor missing.');
const impactResolver = await readFile(new URL('../src/physics/impactResolver.js', import.meta.url), 'utf8');
if (!impactResolver.includes('resolveImpact')) throw new Error('Impact resolver missing.');
const flightComputer = await readFile(new URL('../src/physics/flightComputer.js', import.meta.url), 'utf8');
for (const token of ['computeApproachAcceleration','computeStationKeepAcceleration','propulsionSafeStandOffDistanceMeters','navigationPhysicsStepLimitSeconds','newtonianModelLimit','computeMatchVelocityAcceleration','computeAbsoluteBrakeAcceleration','recommendedWarpCap']) if (!flightComputer.includes(token)) throw new Error(`Flight-computer function missing: ${token}`);
const particleManager = await readFile(new URL('../src/experiments/particles/particleExperimentManager.js', import.meta.url), 'utf8');
for (const token of ['Gravity Cloud','Particle Life','Species Forces','recommendedWarpCap']) if (!particleManager.includes(token)) throw new Error(`Particle framework token missing: ${token}`);
const spatialHash = await readFile(new URL('../src/experiments/particles/spatialHashGrid.js', import.meta.url), 'utf8');
if (!spatialHash.includes('Int32Array') || !spatialHash.includes('headAt')) throw new Error('Typed-array spatial hash missing.');
const impactModel = await readFile(new URL('../src/physics/impactModel.js', import.meta.url), 'utf8');
if (!impactModel.includes('Math.min(2')) throw new Error('Per-impact resolved-fragment cap missing.');
if (!app.includes('spawnParticleField') || !app.includes('fireParticleGun')) throw new Error('Particle app integration missing.');
const classMethodDefinitions = new Set([...app.matchAll(/^\s{2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^\n]*\)\s*\{/gm)].map((match) => match[1]));
const directThisCalls = new Set([...app.matchAll(/\bthis\.([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]));
for (const method of directThisCalls) if (!classMethodDefinitions.has(method)) throw new Error(`UniverseLabApp calls missing class method: ${method}`);
if (!classMethodDefinitions.has('enforceParticleWarpSafety')) throw new Error('Particle warp safety method definition missing.');
for (const token of ['enterObservation','currentCameraView','rendezvousExperiment','experimentNavigationTarget','particleFieldParams','updateParticleLabStatus']) if (!app.includes(token)) throw new Error(`Observation/navigation app function missing: ${token}`);
const renderer = await readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
for (const token of ['experimentVisuals','syncParticleExperiments','PointsMaterial','particleExperiments = []','cameraView = null','renderShipView','renderObservationView','referenceFrame.centerOn(ship.position)']) if (!renderer.includes(token)) throw new Error(`Particle renderer token missing: ${token}`);
if (!app.includes('showRuntimeError') || !app.includes('_runtimeFaulted')) throw new Error('Runtime freeze diagnostic boundary missing.');
console.log(`Static structure OK (${required.length} required files).`);
