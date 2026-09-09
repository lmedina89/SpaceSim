# Mobile GitHub Pages Setup — v0.1.2.1

This ZIP is designed to unzip directly into the GitHub repository root.

## Phone workflow

1. Download the v0.1.2.1 ZIP.
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

After replacing files, Safari may retain an older module briefly. Check the HUD version. It must display **v0.1.2.1**. If it does not, reload/hard-refresh or close/reopen the tab.

## First v0.1.2.1 device checks

1. Confirm the home planet still has visible seeded color.
2. Hold THRUST 5–10 seconds; no text-selection handles/callouts should appear.
3. MORE → ENGINE CRUISE. The main control should read **THRUST 120**.
4. Select a planet and press **APPROACH**. Confirm the navigation chip appears and WARP changes automatically between safe levels rather than requiring manual high warp.
5. Let APPROACH run long enough to see it transition toward braking as distance falls. It should not simply fly through the target.
6. Cancel APPROACH with manual THRUST, then test **BRAKE**. Speed should decrease through modeled acceleration, not instantly disappear.
7. MORE → **MATCH VELOCITY** with a selected target and verify target-relative Δv trends down.
8. LAB → Chicxulub-class → AIM TARGET → PREVIEW → LAUNCH.
9. Confirm the impact still produces flash/ring/ejecta, but no more than two large representative fragment bodies appear from the primary event.
10. Keep the simulation running after impact: MAJOR should not climb toward the 128-source ceiling from recursive fragment breakups.
11. Check FPS after impact settles and compare with v0.1.2.
12. Save/load and confirm the target's recorded-impact count persists; navigation should restore in MANUAL for safety.

Physical iPhone Safari remains the release gate for WebGPU body readability, impact-effect visibility, hold-control continuity, and real device performance.
