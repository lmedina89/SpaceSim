import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hashSeed } from '../src/util/prng.js';

test('seed hashing and RNG are deterministic', () => {
  assert.equal(hashSeed('ALPHA'), hashSeed('ALPHA'));
  const a = createRng('ALPHA');
  const b = createRng('ALPHA');
  for (let i = 0; i < 20; i += 1) assert.equal(a.random(), b.random());
});
