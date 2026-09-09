import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('UniverseLabApp direct this.method() calls all have class method definitions', async () => {
  const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  const definitions = new Set([...app.matchAll(/^\s{2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^\n]*\)\s*\{/gm)].map((match) => match[1]));
  const calls = new Set([...app.matchAll(/\bthis\.([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]));
  const missing = [...calls].filter((name) => !definitions.has(name)).sort();
  assert.deepEqual(missing, []);
  assert.ok(definitions.has('enforceParticleWarpSafety'));
});
