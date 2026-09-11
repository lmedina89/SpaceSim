# Universe Lab v0.1.5.1.1 — Portrait Flight UX & Responsive Cockpit Hotfix QA Report

- Version: **v0.1.5.1.1**
- Build marker: **PORTRAIT-1511**
- Baseline: **v0.1.5.1 / SURFARCH-151**
- Save schema: **1 (unchanged)**
- Three.js: **0.185.0 (unchanged)**
- iPhone/iPad WebKit policy: **forced WebGL2 (unchanged)**

## Scope

Presentation-only narrow-viewport cockpit hotfix. Portrait ship view keeps the canopy and one central FLIGHT MFD, hides wide-layout side MFDs/diagnostics mount/physical key row, adds direct NAV/FLIGHT/SCI/SYS shortcuts through existing app actions, and recomposes mobile controls around safe areas. Landscape restores the accepted v0.1.5.1 cockpit transforms.

No changes are intended to gravity, integration, system generation, planetary environment science, FRAME physics/routing/insertion, celestial appearance/eclipses, observation planning, collision/impact behavior, landing/surface generation/weather, save schema, or WebKit backend policy.

## Automated QA

- Final versioned worktree `npm run qa`: **PASS**.
- Static structure: **53 required files PASS**.
- All JS/MJS syntax: **PASS**.
- Node tests: **253/253 PASS** (248 retained + 5 portrait-layout regressions).
- Portrait regressions verify:
  - renderer forwards current viewport dimensions to `CockpitView`;
  - portrait keeps only the central FLIGHT MFD while landscape restores stored accepted transforms;
  - hidden MFD/key geometry cannot remain invisible ray-pick targets;
  - NAV/FLIGHT/SCI/SYS portrait shortcuts dispatch existing cockpit actions;
  - portrait-only CSS recomposes controls while landscape media rules remain separate.

## Baseline-protection audit

Compared exact v0.1.5.1 archive against the v0.1.5.1.1 worktree:

- **120 protected baseline files checked, 0 mismatches** outside the explicit hotfix allowlist.
- **57 protected source JS modules checked, 0 mismatches** outside `src/main.js`, `src/app/app.js`, `src/render/threeRenderer.js`, and `src/render/cockpitView.js`.
- `src/app/app.js` changes are limited to cache tags, startup/build text, and four portrait shortcut event bindings.
- `src/render/threeRenderer.js` changes are limited to the cockpit cache tag and forwarding viewport width/height after camera/renderer resize.
- Existing landscape MFD coordinates remain the accepted v0.1.5.1 literals and are restored by `basePosition`/`baseRotation`.
- Existing CSS rules are retained; v0.1.5.1.1 portrait rules are appended as orientation-specific overrides.

## Physical iPhone gate

Automated tests do **not** claim physical Safari visual acceptance. On-device acceptance should verify:

1. Landscape four-MFD cockpit is unchanged.
2. Rotate to portrait during live flight: one readable central FLIGHT MFD, no cropped side MFDs/diagnostics/key row, sky remains dominant.
3. NAV / FLIGHT / SCI / SYS shortcuts open the correct existing drawers.
4. LOOK and THRUST/REV/BRAKE do not overlap the six-button bottom bar or browser safe area.
5. Portrait → landscape → portrait does not reset target, attitude, throttle/controls, FRAME, sim time, or save state.
6. Home-world and Caelum-4361 f-A landing/takeoff still behave exactly as v0.1.5.1.

## Packaging

Final archive verification is recorded after the frozen worktree is zipped and clean-extracted.

## Release-candidate archive verification

- RC ZIP integrity: **PASS** (`unzip -t`).
- Clean-unzip `npm run qa`: **253/253 PASS**; static structure 53 required files; all JS/MJS syntax valid.
- Local HTTP shell/module smoke: **15/15 returned 200**.
- `.github/workflows/*`: **0 files**.
- Clean-extracted archive vs frozen worktree: **136 files, byte-for-byte identical**.

The final handoff archive is rebuilt from this frozen worktree and rechecked independently below.
