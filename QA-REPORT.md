# Universe Lab v0.1.4.6.1.3 — Frame Drive & Cockpit Flight-Control Polish QA Report

## Release identity

- Version: **0.1.4.6.1.3**
- Build marker: **FRAMECTRL-14613**
- Direct baseline: **v0.1.4.6.1.2 — Integrated Cockpit Diagnostics MFD**
- Baseline archive SHA-256: `03d0d658f6c5b38eae699d3ce6a4f16c5a30bd5faf56ae59a1a84422e34b45d2`
- Save schema: **1**, unchanged
- Three.js: **0.185.0**, unchanged
- Deployment target: GitHub Pages branch root
- Physical release gate: iPhone Safari/WebKit

## Implemented scope

This release addresses the two physical-device issues observed after v0.1.4.6.1.2: the lower-right thrust controls obscuring the fixed SYSTEM DIAGNOSTICS MFD, and practical astronomical travel overshooting targets when conventional BOOST is combined with simulation time acceleration.

### Cockpit flight-control polish

- The existing **SYSTEM DIAGNOSTICS** MFD keeps its exact v0.1.4.6.1.2 3D placement, rotation and dimensions.
- THRUST / REV / BRAKE are compacted into a narrower, lower right-side touch cluster so the diagnostics screen is not moved to solve the overlap.
- THRUST retains a large touch control while its visible presentation is reduced and its live acceleration value is updated independently of the label.
- The main bottom cockpit bar now provides **LAB · TARGET · SCAN · APPROACH · FRAME · WARP**.

### Speculative FRAME DRIVE

- Adds a direct **FRAME** tap-toggle control. It is not a hold control.
- FRAME reuses the existing isolated transit architecture rather than introducing a second competing simulation path.
- While FRAME is active, only the player spacecraft's local `ShipDynamics` acceleration/integration path is suspended. Major celestial bodies continue through the same direct Newtonian gravity / velocity-Verlet path, and minor particles, experiments, space weather and collision processing continue through their existing simulation systems.
- FRAME translates spacecraft position toward a locked target using explicitly fictional coordinate-rate tiers rather than accumulating Newtonian spacecraft velocity.
- Normal pilot disengagement and automatic arrival perform an explicitly fictional **spacecraft-only inertial velocity match** to the locked target, after which ordinary `ShipDynamics` and gravity resume.
- Target loss, swept-route safety dropout and forced lifecycle/reset exits do **not** perform a target-frame velocity match; the local spacecraft velocity is preserved.
- Swept massive-body guard checks remain active so a high-rate FRAME step cannot tunnel through a protected celestial body envelope.
- FRAME can still translate the spacecraft if the Newtonian >10% c model-validity guard has paused ordinary simulation advancement, allowing the player to recover without advancing the paused world clock.
- FRAME uses live target position and a propulsion/model-safe stand-off envelope, then ramps coordinate rate down close to arrival.

### Existing real-physics navigation retained

- **APPROACH** remains the bounded-thrust Newtonian flight computer using target-relative state, stopping-distance / braking-envelope logic and safe stand-off behavior.
- **BRAKE**, **STOP RELATIVE**, **TURN & BURN**, FLIGHT, CRUISE and BOOST retain their existing local spacecraft mechanics.
- Celestial gravity, body mass, body velocity, integrator equations and orbital mechanics were not altered for FRAME.

## Protected systems / non-goals

Unchanged:

- direct Newtonian major-body gravity
- velocity-Verlet major-body integration
- authoritative celestial body position / velocity state
- normal `ShipDynamics` propulsion outside FRAME
- astronomical observer / inertial star catalog / sky continuity
- ORBIT → DESCENDING → LANDED → ASCENDING → ORBIT lifecycle and recovery
- fixed-time landed orbital boundary
- save schema 1
- iPhone/iPad WebKit forced-WebGL2 policy
- compact-object, magnetar and collision physics boundaries
- surface generation, weather and environment systems
- particle experiment physical integration rules

FRAME is intentionally documented as fictional travel assistance. It is not presented as anti-gravity, a general-relativistic solution, reactionless propulsion, or a physically modeled FTL mechanism.

## Automated verification

- Exact v0.1.4.6.1.2 baseline SHA was preserved as the source-of-truth handoff identity before this milestone.
- Working-tree `npm run check`: **PASS**.
- Working-tree automated unit/regression suite: **160/160 PASS**.
- Clean-unzip provisional package `npm run qa`: **160/160 PASS**.
- Static structure check: **42 required files PASS**.
- Every JS/MJS file covered by the package check passes `node --check`.
- Local static HTTP checks returned **HTTP 200** for `/`, `/styles.css`, `/src/main.js`, `/src/app/app.js`, `/src/render/cockpitView.js`, `/src/physics/transitDrive.js`, and `/VERSION.json`.
- ZIP integrity check: **PASS** on the provisional package used for clean-unzip verification.
- No `.github/workflows/*` files are present.

Regression coverage specifically verifies:

- FRAME is bound as a click/toggle rather than a hold control.
- the world major-body integrator remains on its normal path while only local spacecraft integration is branched during FRAME.
- FRAME translation remains available while ordinary simulation is paused, without advancing the paused simulation clock.
- normal/arrival exits match only the spacecraft to the target inertial velocity.
- safety exits do not perform the fictional velocity match.
- arrival-distance logic no longer requires a Newtonian braking reserve for pre-entry delta-v because FRAME exit is an explicit fictional frame match.
- coordinate-rate step-down and no-overshoot arrival behavior.
- swept massive-body route guards and start-clearance guards.
- cockpit FRAME telemetry presentation and the unchanged SYSTEM DIAGNOSTICS MFD placement.
- compact iPhone-landscape thrust-control layout.
- existing observer, backend-policy, landing/ascent, surface, stellar, space-weather, collision, compact-object, navigation and trajectory regressions continue to pass.

## Physical iPhone gate

Automated QA does not certify the physical iPhone layout, touch feel, Safari/WebKit rendering or thermal behavior. Before declaring v0.1.4.6.1.3 physically accepted, verify on the target iPhone in landscape that:

1. **SYSTEM DIAGNOSTICS has not moved** and remains readable.
2. THRUST / REV / BRAKE no longer obscure the diagnostics display and remain easy to hit.
3. The bottom bar shows **LAB · TARGET · SCAN · APPROACH · FRAME · WARP** without clipping.
4. One tap on FRAME engages it; no press-and-hold is required.
5. The FLIGHT MFD switches to FRAME telemetry and the locked target, range, frame rate and ETA update coherently.
6. A second FRAME tap exits cleanly with near-zero target-relative velocity, after which ordinary gravity affects the spacecraft again.
7. Automatic arrival stops outside the safe observation envelope rather than crossing the target.
8. Celestial bodies continue evolving according to their existing simulation mechanics while FRAME is active.
9. A route obstruction produces a safe FRAME dropout instead of tunneling through a massive body.
10. If the Newtonian >10% c validity guard has paused normal simulation, FRAME can recover the spacecraft without advancing the paused world clock.
11. APPROACH remains a conventional bounded-thrust option and existing landing/takeoff, save/load, target selection and observer behavior remain intact.
