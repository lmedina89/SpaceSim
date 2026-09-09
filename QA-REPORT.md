# Universe Lab v0.1.1.2 — QA Report

## Trigger for hotfix

Physical iPhone testing of v0.1.1.1 showed that sustained THRUST/REV/DAMP presses could invoke WebKit text-selection handles/callouts and transfer control away from the button before the hold was finished. Landscape screenshots also showed that the permanent navigation strip was crowding the right-side thruster controls.

This hotfix changes input handling and mobile layout only. Newtonian gravity, SI authoritative state, velocity-Verlet integration, trajectory prediction, engine acceleration magnitudes, impact telemetry, save schema 1, and experiment physics remain unchanged.

## Automated release checks

**PASS — repository/static structure**

- required shell/modules/docs present,
- Three.js remains pinned to 0.185.0,
- shell/package version agree on 0.1.1.2,
- `visualViewport` mobile-height synchronization hook remains present,
- no JavaScript/MJS syntax errors,
- WebKit touch-callout and text-selection suppression contract present,
- large thumb-safe THRUST cluster contract present,
- hardened pointer release lifecycle tokens present.

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

## iOS continuous-input hardening

**PASS — static/input contract**

- simulator controls use `-webkit-user-select: none`, `user-select: none`, and `-webkit-touch-callout: none`,
- sustained flight controls use `touch-action: none`,
- LAB form inputs/selects explicitly retain normal editable selection behavior,
- root control surface suppresses `selectstart`, `contextmenu`, and `dragstart` outside form controls,
- hold controls acquire pointer capture when available,
- hold release paths include element `pointerup`, `pointercancel`, `lostpointercapture`, capture-phase document `pointerup`/`pointercancel`, window blur, and document visibility loss,
- held controls expose `aria-pressed` and a visible `.is-held` state,
- release paths always clear authoritative throttle/RCS state so interrupted touches cannot leave propulsion stuck on.

## Mobile-layout hardening

**PASS — static contract**

- main THRUST control is the large primary pad,
- REV and DAMP occupy separate adjacent pads,
- landscape navigation is narrowed and shifted into the free central region between LOOK and the thruster cluster,
- portrait navigation remains full width while the thruster cluster sits above it,
- existing v0.1.1.1 visual-viewport sizing and compact telemetry remain intact.

## Packaging/static-host checks

**PASS**

- repository-root layout verified,
- no wrapper directory,
- no `.github/workflows/*`,
- HTTP 200 smoke for `index.html`, `styles.css`, `src/main.js`, `src/app/app.js`, `src/render/threeRenderer.js`, and `VERSION.json`,
- ZIP integrity/root/no-workflow checks performed during packaging.

## Interactive rendering limitation

Automated QA cannot reproduce iOS Safari's exact long-press gesture arbitration or the user's browser-toolbar geometry. Physical iPhone Safari remains the release gate for hold continuity and thumb ergonomics.

## Recommended iPhone retest

1. Hard-refresh after deploying v0.1.1.2.
2. At WARP 1× or 60×, hold THRUST continuously for 5–10 real seconds. No blue text-selection handles or highlighted UI text should appear, and thrust should remain active until your finger lifts.
3. Repeat with REV and DAMP.
4. Rotate to landscape and confirm the lower navigation strip no longer crowds/overlaps the thruster cluster.
5. Hold LOOK while simultaneously holding THRUST to test two-finger continuous control.
6. Open MORE → RCS and hold each RCS/ROLL control for several seconds; they use the same hardened hold lifecycle.
7. Force an interrupted gesture by sliding the finger away while still holding; propulsion must release when the pointer is cancelled/lost rather than remaining stuck on.
