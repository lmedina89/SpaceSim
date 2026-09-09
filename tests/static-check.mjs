import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const required = [
  'index.html', 'styles.css', 'src/main.js', 'src/app/app.js',
  'src/core/constants.js', 'src/data/systemGenerator.js',
  'src/physics/gravity/directGravitySolver.js',
  'src/physics/integrators/velocityVerlet.js',
  'src/render/threeRenderer.js', 'README.md', 'ARCHITECTURE.md', 'SCIENTIFIC-NOTES.md'
];
for (const file of required) await access(new URL(`../${file}`, import.meta.url), constants.R_OK);
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
if (!html.includes('three@0.185.0')) throw new Error('Three.js version is not pinned.');
if (!html.includes('./src/main.js')) throw new Error('Main module missing from shell.');
console.log(`Static structure OK (${required.length} required files).`);
