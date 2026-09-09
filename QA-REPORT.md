# Universe Lab v0.1.1.1 — QA Report

## Trigger for hotfix

Physical iPhone testing of v0.1.1 showed two user-facing problems:

1. portrait flight/system controls could extend behind the iOS browser chrome because the page height followed the layout viewport rather than the actually visible viewport;
2. correct astronomical translation felt visually weak because the ship-centered floating origin and distant decorative starfield intentionally remove most nearby parallax.

This hotfix changes presentation and mobile control access only. Newtonian gravity, SI authoritative state, velocity-Verlet integration, trajectory prediction, save schema 1, and v0.1.1 experiment physics remain intact.

## Automated release checks

**PASS — repository/static structure**

- required shell/modules/docs present,
- Three.js remains pinned to 0.185.0,
- shell/package version agree on 0.1.1.1,
- `visualViewport` mobile-height synchronization hook present,
- six-button primary control bar and MORE drawer present,
- no JavaScript/MJS syntax errors.

**PASS — 15/15 numerical/unit tests**

1. solar gravity at 1 AU matches `GM/r²`,
2. reduced-mass impact energy,
3. impact momentum and Q_R telemetry,
4. one-year velocity-Verlet Sun/Earth orbit bounded,
5. launcher spherical radius from mass+density,
6. circular osculating orbit telemetry,
7. deterministic PRNG,
8. orthonormal spacecraft local basis with roll,
9. main engine produces its declared 20 m/s² physical acceleration,
10. 60 simulated seconds of continuous thrust produce 1.2 km/s delta-v and 36 km displacement from rest,
11. deterministic seeded physical initial state,
12. barycentric center-of-mass/rest-frame initialization,
13. generated planet/moon metadata consistency,
14. forward trajectory keeps a low-Earth circular trajectory bounded for one orbit,
15. swept predictor detects a finite-radius impact.

The new thrust tests directly guard against accidental “fake movement”: the authoritative spacecraft state really changes according to the declared acceleration. The new navigation streaks/FOV response are renderer-only cues layered on top of that state.

## Mobile-layout hardening

**PASS — static contract**

- `.app-shell` height is controlled by `--app-height`,
- `src/main.js` updates that value from `window.visualViewport.height` when available,
- orientation/resize/browser-toolbar changes re-run the synchronization,
- portrait THRUST/REV/DAMP are a horizontal row instead of a vertical stack,
- primary bottom bar contains only LAB/TARGET/SCAN/PATH/WARP/MORE,
- secondary controls are in a compact drawer,
- ship speed remains visible in compact portrait telemetry,
- transient messages automatically clear.

## Flight-perception hardening

The renderer now provides:

- small constant-angular-size target-center brackets instead of a giant target ring,
- a visual-only logarithmic inertial motion-reference field,
- a small thrust-responsive FOV cue,
- a prograde-biased HOME/new-system pilot view instead of pointing directly at the planet center,
- quick 1×/60×/600×/3,600× scientific time-compression control.

The motion-reference field does **not** modify the entity registry, SI ship state, gravity, trajectories, collision tests, experiment results, or saves.

## Packaging/static-host checks

**PASS**

- repository-root layout verified,
- no wrapper directory,
- no `.github/workflows/*`,
- HTTP 200 smoke for shell, CSS, main module, app module, renderer module, and version manifest,
- HTML ID/query-selector audit: no duplicate IDs and no missing queried elements.

## Interactive rendering limitation

The release environment still lacks a reliable interactive iOS/WebGPU browser target. Therefore automated QA cannot certify exact Safari toolbar geometry, touch ergonomics, or perceived motion. The user's physical iPhone remains the release gate for those presentation details.

## Recommended iPhone retest

1. Replace v0.1.1 with v0.1.1.1 and hard-refresh the Pages site.
2. Test portrait with the browser bottom toolbar visible: THRUST, REV, DAMP and the six-button bottom bar should all remain fully visible.
3. Press HOME once to load the improved orbital pilot attitude.
4. Hold THRUST at WARP 60× and confirm the navigation streaks/FOV cue make acceleration obvious while ship speed changes.
5. Cycle WARP to 600× only when you deliberately want faster orbital-distance travel; remember that engine burn duration is also time-compressed.
6. Rotate LOOK and confirm the target marker is now a compact center bracket rather than a huge cyan ring around the planet.
7. Open MORE and verify RCS/SCIENCE/HOME/PAUSE/SAVE/LOAD are reachable without covering the permanent flight controls.
8. Repeat in landscape, then continue the v0.1.1 scanner/path/launcher tests.
