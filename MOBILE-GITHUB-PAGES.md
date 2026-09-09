# Mobile GitHub Pages Deployment — Universe Lab v0.1.4.1

This archive is intended for direct repository-root upload from the existing phone workflow.

## GitHub Pages

Repository → **Settings → Pages**:

- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/(root)`

The distributable ZIP intentionally contains **no `.github/workflows/*` files**.

## Archive layout

There is no wrapper directory. After extraction/upload, repository root should directly contain:

- `index.html`
- `styles.css`
- `package.json`
- `VERSION.json`
- `src/`
- `tests/`
- documentation files

## Confirm the deployed release

On iPhone, reload/hard-refresh and verify:

- HUD/title says **v0.1.4.1**,
- MORE help shows **EXTREME-141**,
- FPS/physics/render/ship telemetry populate,
- SIM TIME advances,
- no `RUNTIME ERROR` banner appears.

An older version/build marker means Safari or Pages is still serving stale files.

## Recommended device test order

1. Normal SHIP VIEW, untouched, 15–30 seconds.
2. COSMOS → supernova-remnant SCAN / OBSERVE / ORBIT / SHIP VIEW.
3. COSMOS → TRIGGER CME; verify active-front radius grows with simulated time.
4. Toggle AUTO WEATHER and inspect next-event countdown.
5. Select a planet → MORE → OVERLAYS → enable master, then Lagrange/Hill/Roche/orbit plane.
6. Enable gravity vectors separately and watch FPS/thermal behavior.
7. LAB → Magnetar; inspect from a safe distance and test APPROACH guard.
8. LAB → White Dwarf, Brown Dwarf, Rogue Planet individually.
9. Retest active black hole, a ring/belt, a physical comet, one particle experiment and one impact preset.

Automated Node/static QA cannot prove iPhone WebGPU frame rate, GPU compatibility, touch ergonomics or thermal behavior. Physical Safari testing remains the release gate.
