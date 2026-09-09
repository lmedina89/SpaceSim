import test from 'node:test';
import assert from 'node:assert/strict';
import { isAppleMobileWebKit, rendererBackendPolicy } from '../src/render/backendPolicy.js';

test('iPhone-class user agents force the WebGL2 backend', () => {
  const nav = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15', platform: 'iPhone', maxTouchPoints: 5 };
  assert.equal(isAppleMobileWebKit(nav), true);
  assert.deepEqual(rendererBackendPolicy(nav), { forceWebGL: true, reason: 'ios-webkit-presentation-isolation' });
});

test('iPad desktop-class UA is still recognized', () => {
  const nav = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 5 };
  assert.equal(isAppleMobileWebKit(nav), true);
  assert.equal(rendererBackendPolicy(nav).forceWebGL, true);
});

test('desktop Mac is not forced onto WebGL2', () => {
  const nav = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 0 };
  assert.equal(isAppleMobileWebKit(nav), false);
  assert.equal(rendererBackendPolicy(nav).forceWebGL, false);
});

test('non-Apple mobile devices keep automatic backend selection', () => {
  const nav = { userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel) AppleWebKit/537.36', platform: 'Linux armv8l', maxTouchPoints: 5 };
  assert.equal(isAppleMobileWebKit(nav), false);
  assert.equal(rendererBackendPolicy(nav).forceWebGL, false);
});
