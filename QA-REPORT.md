# Universe Lab v0.1.4.5.4 — WebKit Renderer Handoff Reliability Hotfix QA Report

## Release identity

- Version: **0.1.4.5.4**
- Build marker: **RENDER-1454**
- Base: exact v0.1.4.5.3 archive (`a14c8749747fd076fb7ed553855203be0fc7f80dc9423a9c42554bbacc03ada1`)
- Save schema: **1** unchanged
- Three.js: **0.185.0** pinned
- Deployment: GitHub Pages branch root
- Physical release gate: **iPhone/iPad WebKit**

## Physically reported failure being isolated

v0.1.4.5.3 reached the temporary diagnostic state `ORBIT VERIFIED · surface=OFF · render=SPACE · run=YES · input=YES`, yet the visible canvas still showed the brown local planetary surface. That result narrows the failure away from the CPU landing lifecycle and toward renderer/backend presentation on the physical iPhone path.

This release intentionally keeps the v0.1.4.5.3 ascent logic unchanged and changes one meaningful runtime variable: the renderer backend chosen at boot on Apple mobile WebKit.

## v0.1.4.5.4 corrective/isolation scope

1. Added `src/render/backendPolicy.js` with deterministic Apple-mobile detection.
2. iPhone/iPod user agents force `THREE.WebGPURenderer({ forceWebGL: true })`.
3. iPadOS desktop-class UA mode is also detected through `platform === "MacIntel"` plus multi-touch capability.
4. Desktop Mac, Android and other platforms retain automatic Three.js WebGPU/WebGL2 selection.
5. Backend selection occurs only at renderer construction; there is no live GPU-backend hot swap.
6. Top telemetry reports **WebGL2 iOS** when the forced physical-test path is active.
7. Existing landing/ascent state machine, prograde return, input reset, 1× running restore and three-frame orbital verification remain unchanged.
8. No astronomy, real-sky, cockpit redesign, physics, propulsion, surface generation, save-schema or Three.js-version changes.

## Automated verification

- `npm run check`: **PASS**
- Static structure check: **PASS**
- JS/MJS `node --check`: **PASS**
- `npm test`: **123/123 PASS**
- Backend policy unit coverage: iPhone UA, iPad desktop UA, desktop Mac, non-Apple mobile.
- Static verification confirms `forceWebGL: this.backendPolicy.forceWebGL` is wired into the existing `WebGPURenderer` construction and that the forced backend HUD label exists.

## Physical acceptance sequence

Automated QA cannot prove that WebKit presents a fresh GPU frame after the surface → space scene switch. On the physical iPhone test:

1. fresh load and confirm the top renderer HUD reads **WebGL2 iOS**;
2. LAND / DESCEND → board → TAKEOFF;
3. green diagnostic should reach **ORBIT VERIFIED · surface=OFF · render=SPACE · run=YES · input=YES**;
4. the visible canvas must now show the actual orbital space scene rather than retaining local surface terrain;
5. immediately verify LOOK, THRUST, REV and BRAKE responsiveness;
6. LAND again without refresh → TAKEOFF again;
7. if the canvas still retains the surface frame under **WebGL2 iOS**, the next investigation target is shared-renderer resource teardown/presentation timing rather than backend selection.

Do not call the takeoff bug physically fixed until this passes on-device.
