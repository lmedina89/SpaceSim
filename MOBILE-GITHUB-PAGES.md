# Mobile GitHub Pages Deployment — Universe Lab v0.1.4

This release is packaged for direct repository-root upload from a phone Git client.

## Required Pages configuration

GitHub repository → **Settings → Pages**:

- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/(root)`

The distributable ZIP intentionally contains **no `.github/workflows/*` files** because the existing mobile OAuth workflow does not have GitHub `workflow` scope.

## Upload

The ZIP has no wrapper directory. After extracting/uploading, `index.html`, `styles.css`, `package.json`, `src/`, `tests/`, and docs should sit directly at repository root.

## Confirm the deployed build

After GitHub Pages updates, hard-refresh/reload on iPhone and verify:

- title/HUD says **v0.1.4**,
- system/help marker says **COSMOS-140**,
- FPS/physics/render/ship telemetry populate,
- SIM TIME advances,
- there is no `RUNTIME ERROR` banner.

If the HUD still shows an older version/build marker, the browser or Pages deployment is serving stale files.

## Suggested iPhone validation

1. Let normal SHIP VIEW run untouched for 15–30 seconds.
2. Open **COSMOS**, scan a source, then OBSERVE / ORBIT / SHIP VIEW.
3. Observe a planetary ring or debris belt and watch FPS/thermal behavior.
4. Use physical RENDEZVOUS and verify the ship—not the observation camera—moves.
5. Locate a generated comet; verify the tail looks star-relative as the system evolves.
6. LAB → spawn a pulsar; use SCAN/APPROACH from a safe distance.
7. LAB → spawn an active black hole; inspect accretion/jet visuals without deliberately crossing the model guard.
8. Retest a Gravity Cloud / Particle Life field and one impact preset.

Do not treat desktop/Node timings or static QA as proof of iPhone WebGPU performance. The real phone remains the release gate.
