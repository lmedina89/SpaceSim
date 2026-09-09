# Mobile GitHub Pages Setup — v0.1.2

This ZIP is designed to unzip directly into the GitHub repository root.

## Phone workflow

1. Download the v0.1.2 ZIP.
2. Extract it into the SpaceSim/Universe Lab repository root.
3. Confirm `index.html`, `src/`, `tests/`, `package.json`, etc. are directly at repository root.
4. Commit/push from the iPhone Git client.
5. GitHub repository → Settings → Pages.
6. Choose **Deploy from a branch**.
7. Branch: **main**.
8. Folder: **/(root)**.
9. Save and wait for Pages to publish.

There is intentionally no `.github/workflows/pages.yml`; the previous workflow file caused mobile OAuth clients without `workflow` scope to be rejected by GitHub.

## Cache warning

After replacing files, Safari may retain an older module briefly. Check the HUD version. It must display **v0.1.2**. If it does not, reload/hard-refresh or close/reopen the tab.

## First v0.1.2 device checks

1. Confirm the home planet has visible seeded color instead of a featureless black sphere.
2. Hold THRUST 5–10 seconds; no text-selection handles/callouts should appear.
3. LAB → load Chicxulub-class preset.
4. AIM TARGET.
5. PREVIEW TRAJECTORY and verify contact telemetry before launch.
6. Launch the body.
7. Use moderate WARP only if necessary; watch for contact.
8. Verify impact flash/ring/ejecta appears and the scanner's impact count increases.
9. Open SCAN and inspect the last resolved impact report.
10. Save/load and confirm the target's recorded-impact count persists.

Physical iPhone Safari remains the release gate for WebGPU body readability, impact-effect visibility, hold-control continuity, and real device performance.
