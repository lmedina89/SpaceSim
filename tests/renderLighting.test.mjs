import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
assert.match(src, /new THREE\.PointLight\(0xffffff,\s*2\.6,\s*0,\s*0\)/, 'stellar renderer light must be exposure-normalized with no render-space attenuation');
assert.match(src, /sunLight\.color\.setHex\(body\.color/, 'stellar light should inherit generated star color');
assert.match(src, /new THREE\.AmbientLight\(0x263149,\s*0\.055\)/, 'ambient light should remain intentionally low');
console.log('renderLighting.test: ok');
