// Renderer backend selection is intentionally a boot-time policy. Do not hot-swap GPU backends.
// Universe Lab currently forces the WebGPURenderer WebGL2 backend on iPhone/iPad-class WebKit
// devices while native WebGPU surface/space presentation handoff is under physical investigation.
export function isAppleMobileWebKit(navigatorLike = globalThis.navigator) {
  const nav = navigatorLike ?? {};
  const ua = String(nav.userAgent ?? '');
  const platform = String(nav.platform ?? '');
  const touchPoints = Number(nav.maxTouchPoints ?? 0);

  const mobileAppleUa = /iPad|iPhone|iPod/i.test(ua);
  // iPadOS can request a desktop-class UA and report MacIntel while retaining touch input.
  const desktopUaIpad = platform === 'MacIntel' && touchPoints > 1;
  return mobileAppleUa || desktopUaIpad;
}

export function rendererBackendPolicy(navigatorLike = globalThis.navigator) {
  const forceWebGL = isAppleMobileWebKit(navigatorLike);
  return Object.freeze({
    forceWebGL,
    reason: forceWebGL ? 'ios-webkit-presentation-isolation' : 'automatic',
  });
}
