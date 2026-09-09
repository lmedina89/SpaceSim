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
if (!html.includes('Universe Lab v0.1.1')) throw new Error('Shell version is not v0.1.1.');
if (pkg.version !== '0.1.1') throw new Error('package.json version mismatch.');
console.log(`Static structure OK (${required.length} required files).`);
