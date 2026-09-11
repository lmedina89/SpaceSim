# Universe Lab v0.1.5.1.2 — Portrait HUD Transparency & Visual Weight Hotfix QA Report

- Version: **v0.1.5.1.2**
- Build marker: **PORTHUD-1512**
- Baseline: **v0.1.5.1.1 / PORTRAIT-1511**
- Save schema: **1 (unchanged)**
- Three.js: **0.185.0 (unchanged)**
- iPhone/iPad WebKit policy: **forced WebGL2 (unchanged)**

## Scope

Presentation-only follow-up to the portrait cockpit hotfix. Portrait ship view keeps the compact single-FLIGHT-MFD composition, but the central MFD now removes its opaque physical bezel and draws only its smoked-glass background at substantially lower alpha. Telemetry text remains fully opaque. The portrait NAV/FLIGHT/SCI/SYS shortcut tray/buttons are also more translucent with Safari-compatible backdrop blur.

Landscape cockpit presentation remains on the accepted v0.1.5.1.1 path. No changes are intended to gravity, integration, system generation, planetary environment science, FRAME physics/routing/insertion, celestial appearance/eclipses, observation planning, collision/impact behavior, multi-world surface generation/weather, landing/takeoff, save schema, or WebKit backend policy.

## Automated QA

- Frozen v0.1.5.1.1 baseline `npm run qa`: **253/253 PASS**.
- Final versioned v0.1.5.1.2 worktree `npm run qa`: **255/255 PASS**.
- Static structure: **53 required files PASS**.
- All JS/MJS syntax: **PASS**.
- Two added portrait-HUD regressions verify:
  - portrait FLIGHT uses low-alpha background glass while telemetry texture opacity is not globally reduced;
  - portrait shortcut tray/buttons remain intentionally translucent with WebKit-compatible backdrop blur.
- Existing portrait regressions additionally verify central-MFD-only layout, exact landscape transform restoration, hidden-object ray-pick rejection and existing shortcut action routing.

## Baseline-protection audit

Compared the exact v0.1.5.1.1 archive against the frozen v0.1.5.1.2 worktree:

- **16 files changed**, all within the explicit presentation/version/test/documentation allowlist; **0 files added or removed**.
- **55 protected scientific/runtime modules checked, 0 mismatches**. Protected areas include `src/core`, `src/physics`, `src/data`, `src/navigation`, `src/surface`, `src/cosmic`, `src/experiments`, surface rendering, backend policy, observation camera/perception, starfield/cosmic overlays, and the HUD/System Map modules.
- `src/main.js`: cache tag only.
- `src/app/app.js`: cache tags + startup/build notice only.
- `src/render/threeRenderer.js`: cockpit cache tag only.
- `src/render/cockpitView.js`: portrait background-glass drawing + portrait FLIGHT bezel visibility only.
- `styles.css`: portrait shortcut-tray translucency only within the existing portrait block.

## Physical iPhone gate

Automated tests do **not** claim exact Safari visual acceptance. On-device acceptance should verify:

1. Landscape four-MFD cockpit remains visually unchanged from v0.1.5.1.1.
2. Rotate to portrait with a bright planet behind the center: FLIGHT MFD is visibly see-through, no opaque black bezel remains, and telemetry is still readable.
3. NAV / FLIGHT / SCI / SYS shortcut row is visibly lighter/translucent and still opens the same existing drawers.
4. Portrait ↔ landscape rotation does not reset target, attitude, engine/FRAME state, sim time or save state.
5. Home-world and Caelum-4361 f-A LAND/SAVE/LOAD/TAKEOFF still behave as before.

## Packaging

Archive-level verification is recorded below after clean extraction.

## Release-candidate archive verification

- RC ZIP integrity: **PASS** (`unzip -t`).
- Clean-unzip `npm run qa`: **255/255 PASS**; static structure 53 required files; all JS/MJS syntax valid.
- Local HTTP shell/module smoke: **15/15 returned 200**.
- `.github/workflows/*`: **0 files**.
- Clean-extracted RC vs frozen worktree: **136 files, byte-for-byte identical**.

The final handoff archive is rebuilt from this frozen worktree and rechecked independently below.
