# Universe Lab v0.1.4.6 — Astronomical Observer & Sky Continuity Foundation QA Report

## Release identity

- Version: **0.1.4.6**
- Build marker: **SKYOBS-146**
- Baseline archive SHA-256: `eb4b2a66d9d323718e36525cf8dd2701495425fd41f1bbbb45ecc9f38f5132d0`
- Baseline identity: **v0.1.4.5.4 / RENDER-1454**
- Save schema: **1**, unchanged
- Three.js: **0.185.0**, pinned
- Deployment: GitHub Pages branch root; no workflows
- Physical release gate: **iPhone/iPad Safari/WebKit**

## Baseline verification

The uploaded archive name had a harmless `(1)` suffix. Its content hash exactly matched the required authoritative baseline. Root layout, VERSION.json, package.json, schema, Three.js import pin, renderer policy and absence of `.github/workflows/*` were verified before editing. Baseline automated QA passed **123/123**.

## Implemented and verified

- Canonical ship/descent/surface observer position and orthonormal orientation/local horizon bases.
- Read-only live-body direction/range/horizon records with physical apparent angular radius.
- Stable deterministic inertial catalog reused without landing reseed.
- Fixed-time descent → surface and surface → orbit direction continuity.
- Surface lower-hemisphere occlusion, live Sun direction and bounded major-body visual proxies.
- Daylight/weather exposure hooks preserve model/catalog existence.
- Schema-1 save/load reconstructs observer state without duplicate persisted data.
- NaN/Infinity guards and renderer isolation from authoritative physics.
- Existing iOS forced WebGL2 backend policy and ascent regressions remain covered.
- Two separated 1.55-solar-mass magnetars receive equal/opposite Newtonian acceleration.
- Repeated LAB magnetars use deterministic 120,000 km collision-safe placement offsets; no magnetic force was introduced.

## Automated verification

- `npm run check`: **PASS**
- Static structure/import-token checks: **PASS**
- Every JS/MJS file via `node --check`: **PASS**
- `npm test`: **143/143 PASS**
- Save schema: **1**
- Three.js import map: **0.185.0**
- iPhone/iPad renderer policy: **WebGPURenderer forced to WebGL2**
- GitHub-root layout: **PASS**
- `.github/workflows/*`: **absent**

## Performance review

The inertial catalog uses stable typed arrays and is generated once per system seed. Surface horizon projection is created once per surface-world entry, not rebuilt each frame. Per-frame work is limited to the small major-body list, cached sprites and opacity/transform updates; observer records are reused. No renderer backend hot-swap or hidden landed N-body simulation was added.

## Known boundary

Orbital N-body time remains intentionally held while landed. The surface sky therefore preserves the same astronomical instant across the transition but does not yet advance with a body rotation/ephemeris model. Surface weather retains its independent bounded clock.

## Physical iPhone release gate

Automated testing cannot prove WebKit framebuffer presentation, visual continuity, touch behavior, sustained FPS or thermal behavior. Follow the on-device sequence in `MOBILE-GITHUB-PAGES.md`: verify **WebGL2 iOS**, compare a recognizable sky/body arrangement through orbit → descent → surface → ascent → orbit, rotate the surface view, repeat a landing cycle and repeat after schema-1 SAVE/LOAD. Do not declare physical acceptance until that test passes.

