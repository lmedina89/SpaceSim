# Universe Lab v0.1.5.3 — Physical Atmosphere & Sky Optics

**Build marker:** `ATMOSKY-153`  
**Save schema:** 1 (unchanged)  
**Three.js:** 0.185.0 (unchanged)

## v0.1.5.3 atmosphere / sky optics

This release adds one canonical **read-only atmospheric optics presentation layer** on top of the v0.1.5.0 planetary-environment model and the v0.1.5.2 multi-world exploration loop. It does not change body mass, radius, orbit, gravity, FRAME, landing geometry, environment formation state, or save authority.

`src/physics/atmosphericOptics.js` consumes canonical atmosphere pressure proxy, radiative-equilibrium temperature, surface gravity and representative molecular mass together with the live primary-star altitude/color and finite-disk eclipse visibility. It derives a pressure-scaled dry-air-like Rayleigh reference spectrum, a generic aerosol/Mie optical-depth proxy, hydrostatic scale height, direct stellar transmission, twilight/horizon reddening, diffuse sky brightness, stellar/galactic washout and clear-air extinction.

Surface rendering now uses that current optical state rather than a fixed palette/daylight multiplier. Dense atmospheric worlds can show a bright wavelength-dependent sky and reddened low star; the ~573 Pa atmosphere on Caelum-4361 e remains optically dark rather than becoming a fake Earth-blue sky; f-A and h-A pass zero atmospheric pressure through the surface profile and remain black-sky with no fog. Weather may add bounded aerosol optical depth/transmission without changing canonical atmosphere mass or astronomy.

Space rendering may add a thin atmosphere limb to solid planets/moons when the modeled column is optically meaningful. Limb thickness is derived from hydrostatic scale height and bounded for rendering; color/opacity use a Rayleigh tangent-column proxy. Trace/vacuum worlds receive no fake limb. The shell does not change the physical body radius, collision surface, apparent angular-size science, or landing state.

Scientific boundary: this is **not** a composition-specific radiative-transfer/climate solver. It does not solve line absorption, multiple scattering, refraction, polarization, cloud microphysics, greenhouse feedback, atmospheric circulation, or terrain-shadow radiative transfer. Atmosphere pressure and equilibrium temperature retain their existing canonical proxy/model meanings.

---

# Universe Lab v0.1.5.2 — Multi-World Landing & Exploration

**Build marker:** `SURFEXP-152`  
**Save schema:** 1 (unchanged)  
**Three.js:** 0.185.0 (unchanged)

## v0.1.5.2 exploration expansion

This release turns the v0.1.5.1 surface-profile proof into a deliberately bounded multi-world exploration loop. It does **not** unlock every solid body. Surface access remains data-driven from the canonical v0.1.5.0 planetary-environment record, and only scientifically suitable reference bodies are enabled.

`ORIGIN-001` now exposes four surface-capable reference worlds:

- **Caelum-4361 d** — the accepted detailed atmospheric home world; its legacy generated region/weather path remains the regression baseline.
- **Caelum-4361 f-A** — the accepted airless rocky reference moon.
- **Caelum-4361 e** — a new cold rocky exploration planet, ~218.8 K radiative-equilibrium temperature, ~573 Pa atmosphere proxy and ~9.91 m/s² surface gravity.
- **Caelum-4361 h-A** — a new cryogenic ice/volatile exploration moon, ~81.3 K radiative-equilibrium temperature, ~0.23 Pa atmosphere proxy and ~0.85 m/s² surface gravity.

New rocky and ice surfaces use deterministic profile-specific terrain/material/POI rules rather than recoloring the home world. The rocky profile permits only ordinary dust/frost presentation events; the cryogenic airless profile has no weather/wind scheduler. Neither profile claims solved geology, mineralogy, fluid dynamics, atmospheric chemistry, greenhouse climate, volatile phase equilibrium or thermal inertia.

Surface-session restore is now explicitly body/profile isolated: a snapshot can restore local position/scans/weather only when its saved body and profile identity match the freshly generated region. This prevents state from one world leaking into another. Save schema remains 1.

Generalized takeoff also retains the departing surface session through cleanup so the current rotated body-fixed landing anchor is actually available to the return-orbit handoff. The accepted home-world 5-radius return remains unchanged; generalized surfaces reuse the existing Hill-screened circular-orbit insertion planner.

Rogue surfaces remain disabled until their rotation model is complete. Gas giants remain no-solid-surface. The suspected FRAME target-body pass-through is **not** modified in this release; physical testing did not establish a reproducible intersection, so no speculative clearance diagnostic or route rewrite was added.

Close-orbit planetary visual detail is also intentionally outside this milestone and remains scheduled for later near-orbit/celestial rendering work.

---

# Universe Lab v0.1.5.1.2 — Portrait HUD Transparency & Visual Weight Hotfix

**Build marker:** `PORTHUD-1512`  
**Save schema:** 1 (unchanged)  
**Three.js:** 0.185.0 (unchanged)

## v0.1.5.1.2 portrait HUD glass

This is a presentation-only follow-up to v0.1.5.1.1. In portrait ship view, the central FLIGHT MFD now removes its opaque physical bezel and renders only the smoked-glass background at reduced alpha; telemetry text remains fully opaque and readable. The `NAV / FLIGHT / SCI / SYS` shortcut strip is also substantially more translucent. Landscape cockpit geometry and styling are retained.

No N-body physics, FRAME behavior, celestial appearance, planetary environment, surface architecture, landing/takeoff, save schema, or WebKit backend policy changes are part of this hotfix.


This is a presentation-only hotfix over the accepted v0.1.5.1 multi-world surface architecture. Portrait ship view now becomes an intentional compact flight deck instead of cropping the landscape cockpit: the wide canopy and central FLIGHT MFD remain, landscape side MFDs/diagnostics mount/physical key row are hidden, and direct `NAV / FLIGHT / SCI / SYS` shortcuts dispatch the same existing cockpit actions. LOOK, thrust/reverse/brake and the six-button bottom bar are recomposed around iPhone safe areas. Rotating back to landscape restores the accepted four-MFD cockpit transforms.

No gravity, integrator, FRAME, landing, surface, environment, save-schema, WebKit backend or celestial-science behavior is changed by this hotfix.


## v0.1.5.1 multi-world surface architecture

- Adds a data-driven surface-profile layer that consumes the canonical v0.1.5.0 planetary-environment record instead of treating every surface as the home world. Architectural families are `ATMOSPHERIC_ROCKY`, `AIRLESS_ROCKY`, and `ICE_VOLATILE`; only the first two have an enabled proof path in this release.
- The existing home world still uses its accepted anomalous atmospheric generator. Its core generated region and deterministic weather sequence match v0.1.5.0 exactly; new metadata only identifies the surface profile/model.
- Exactly one qualifying airless rocky moon may be enabled as a proof surface per system. `ORIGIN-001` deterministically selects **Caelum-4361 f-A** (`moon-5-1`). Other solid worlds remain landing-disabled.
- Airless profile: black vacuum sky even in daylight, no fog/clouds/wind/weather scheduler, no atmospheric anomalies, deterministic regolith/crater terrain and conventional geology scan sites. Canonical star/planet/moon directions, phases, eclipses, rotation and celestial time remain live.
- Airless terrain color/roughness/cratering are procedural geology/albedo proxies. No mineralogy, regolith mechanics, thermal inertia, dust electrostatics or detailed surface thermodynamics are claimed.
- Surface sessions may persist optional `surfaceProfileId` and `surfaceModelVersion`; old schema-1 home-world saves remain valid.
- Moon takeoff uses the existing Hill-screened circular orbit insertion calculation rather than the legacy planet-only 5-radius return rule. The accepted home-world return path is unchanged.
- No general rollout of additional landable planets/moons occurs in 1.5.1; that remains v0.1.5.2 scope.

---

# Previous milestone: v0.1.5.0 — Planetary Environment Model Foundation

**Build marker:** `ENVSCI-150`  
**Save schema:** 1 (unchanged)  
**Three.js:** 0.185.0 (unchanged)

## v0.1.5.0 planetary environment foundation

This release adds one canonical, read-only planetary-environment model before generalized multi-world surfaces are enabled. It separates quantities that are directly derived from authoritative body/star state from deterministic seeded formation assumptions that cannot yet be observed or solved uniquely.

- Hard-derived science includes bulk density, surface gravity, escape velocity, live/reference stellar flux, and radiative-equilibrium temperature.
- Deterministic formation metadata uses an independent per-body environment RNG stream for Bond albedo, volatile inventory, atmospheric inventory and representative molecular mass. The environment stream cannot perturb orbital generation.
- Solid-world atmosphere pressure is explicitly a **formation + thermal-retention + generic gas-phase-availability proxy**. Greenhouse physics, atmospheric chemistry/condensation, EUV/stellar-wind escape, weather/climate and radiative transfer are not solved here.
- Gas giants expose a deep H/He envelope and **no solid surface**; no fake surface pressure is invented.
- Environment classes distinguish rocky/dry/hot/volatile-rich/ice-rich terrestrial, moon, rogue and gas-giant families. Surface existence is separate from whether a detailed surface engine currently exists.
- NAV exposes environment class, escape velocity, stellar flux, equilibrium temperature, Bond albedo, atmosphere pressure/retention proxy, volatile/ice potential, surface family and tidal-rotation state.
- The cockpit SCIENCE MFD shows **EQ TEMP** for planetary targets rather than pretending the radiative-equilibrium value is a measured surface temperature.
- Existing schema-1 saves retain authoritative mass/radius/orbit/rotation and persisted formation metadata. Older saves deterministically backfill missing environment metadata only.
- The already-shipping detailed home surface remains the only enabled landing surface in this release. **No additional world is made landable in v0.1.5.0.**

The next milestone may generalize the surface architecture only after this environment layer passes physical iPhone validation.

---

# Universe Lab v0.1.4.9.1.1 — Observation Planner Mobile Layout Hotfix

**Build marker:** `OBSUI-14911`  
**Save schema:** 1 (unchanged)  
**Three.js:** 0.185.0 (unchanged)

## v0.1.4.9.1.1 mobile planner fix

This hotfix changes planner presentation only. Physical iPhone testing of v0.1.4.9.1 exposed WebKit landscape text autosizing that enlarged event-card text without expanding the button/card geometry, causing rows to overlap. The planner now suppresses text autosizing inside its own drawer, uses content-sized result cards with explicit line-height/wrapping, and gives the event list its own inertial scroll region.

The observation-planner N-body clone, 300 s coarse propagation, ~10 s local refinement, finite-disk eclipse geometry, live-state isolation, numerical budget, NAV targeting, and landed-site reference behavior are unchanged. Gravity, integration, FRAME, landing, appearance, impacts, and save schema are unchanged.

---

# Universe Lab v0.1.4.9.1 — Observation Planning & Astronomy Validation

**Build marker:** `OBSPLAN-1491`  
**Save schema:** 1 (unchanged)  
**Three.js:** 0.185.0 (unchanged)

## v0.1.4.9.1 observation planning

This hotfix closes the loop on the v0.1.4.9 finite-disk phase/eclipsing geometry by making future stellar alignments intentionally observable instead of requiring the player to stumble across them. The planner is read-only: it clones the current gravity-source body state, propagates that clone with the existing direct Newtonian solver and velocity-Verlet integrator, and reuses the canonical `celestialAppearance` finite-disk geometry. It never advances or edits the live universe.

- NAV / SYSTEM MAP adds **PLAN OBSERVATIONS** for a selected planet or moon.
- Surface DETAILS adds **PLAN SKY EVENTS**; when the selected reference is the active landed body, the search uses the current body-fixed landing site and reports whether the primary star is above or below the local horizon at each predicted event.
- Non-landed searches use the selected body's center and label that reference explicitly as **BODY CENTER** rather than pretending a surface location is known.
- Searches cover 7, 30, 90 or 180 simulation days. N-body propagation is sampled at a 300 s ceiling, then angular-separation minima are locally re-integrated at a 10 s ceiling before finite-disk overlap is classified.
- Results list stellar conjunctions within 5° plus finite-disk partial/total/annular-transit cases, event T+, angular separation, apparent star/occulter diameters, stellar coverage and—at an exact landed site—star altitude/horizon visibility.
- Search work is chunked across animation frames so long searches do not intentionally monopolize the iPhone UI thread. Dynamically stiff compact-object systems retain the v0.1.4.8.2 close-pair timestep guard; if the bounded planner work budget is exhausted, the result is explicitly **BUDGET LIMITED** instead of silently lowering numerical accuracy.
- The planner does not predict future pilot motion and does not replay future impact/fragmentation resolution. If the live simulation epoch advances materially during/after a search, the UI warns that the timing should be refreshed.

The v0.1.4.9 appearance/phase/eclipse implementation remains the rendering/scientific source of truth below.

# Universe Lab v0.1.4.9 — Celestial Appearance, Phases & Eclipse Geometry

**Build marker:** `CELEST-149`  
**Save schema:** 1 (unchanged)  
**Three.js:** 0.185.0 (unchanged)

## v0.1.4.9 celestial appearance, phases & eclipse geometry

This release turns the existing Sun-directed planet/moon shading into a measured, cross-view celestial-appearance system. The authoritative N-body positions, canonical observer, planetary rotation, impact hardening, NAV/FRAME, landing lifecycle and iPhone WebGL2 backend remain the sources of truth; appearance code is read-only with respect to simulation state.

- Added `src/core/celestialAppearance.js`, a pure geometry layer for physical apparent angular radius, phase angle, illuminated fraction, finite apparent-disk overlap, observer-side stellar occultation and body-centered stellar shadow diagnostics.
- Space planets/moons retain the existing real star-direction `MeshStandardMaterial` terminator, but physical reflectors no longer self-emit or receive the old readability shell. Their physical render radius remains separate from UI target markers. The star light is still exposure-normalized presentation rather than a radiometric inverse-square flux solver.
- Surface-view stars now have a finite angular disk plus a separate glow cue. Planets/moons use phase-shaded 3-D spheres whose displayed angular diameter matches the physical radius/range solution; their shell depth is monotonically compressed only for render precision/occlusion and never changes sky direction or angular size.
- Surface direct stellar lighting and the daylight proxy respond to the visible fraction of the finite stellar disk during an occultation. A foreground moon can therefore cover the rendered stellar disk when actual observer geometry aligns.
- Surface DETAILS, NAV selection and target telemetry expose angular diameter, illuminated fraction/phase and stellar-shadow/occultation diagnostics from the same canonical appearance solution used by rendering.
- Fixed cumulative surface-darkening drift: background/fog exposure is now recomputed from immutable base colors each frame instead of repeatedly multiplying the already-darkened color.
- Appearance enrichment is cadence-bounded and record-reusing; ordinary body-direction observations still update continuously, while phase/eclipse enrichment refreshes at a bounded cadence or after meaningful observer displacement.
- Finite-disk eclipse overlap currently uses the dominant single foreground occulter. Multiple simultaneous overlapping occulters are not union-solved. Surface phase shading is a Lambertian geometric proxy, not a BRDF/albedo/radiative-transfer model, and full atmospheric scattering/refraction remains future work.

## v0.1.4.8.2 impact & numerical hardening

This release addresses the impact/collision and numerical-efficiency findings from the full v0.1.4.8 physics audit while preserving the validated direct Newtonian gravity law, velocity-Verlet major-body integrator, v0.1.4.8.1 generated-system consistency model, NAV/FRAME behavior, rotating-surface astronomy, landing lifecycle, and iPhone WebGL2 backend policy.

- Swept finite-radius collisions now resolve the **first relative sphere-contact root** inside the physics substep. The contact position/velocity is interpolated from a reusable previous-state buffer, impact resolution occurs at that contact state, and only the remaining fraction of the substep is drifted ballistically before normal N-body integration resumes. This is more physical than resolving from an already-penetrated end-of-step state, but it is still not a full event-driven N-body re-integration.
- Gas-world impact typing now recognizes the generated `planetType: "gas"` value and uses the gas-envelope response. Gas giants no longer receive rocky-crater estimates.
- Representative fragmentation is generated in the collision center-of-mass frame. Target recoil balances fragment momentum, so the represented bodies conserve 3-D linear momentum; fragment + recoil kinetic energy is capped to a configured fraction of the available COM impact energy. The fragment model remains a bounded heuristic, not hydrodynamics or a material fracture solver.
- Black holes are mandatory collision sinks. Absorbed mass and momentum are accumulated into the black hole and its Schwarzschild radius is recomputed from the new mass.
- Major-body timestep control now includes a dynamically re-evaluated **pair encounter/crossing ceiling**. Ordinary generated systems continue using the existing 300 s ceiling, while very close/high-speed LAB compact-object pairs automatically force smaller substeps.
- The minor test-particle field now actually uses its existing 30 Hz simulation-time cadence for fine frame-sized steps and reuses source-state scratch storage; large/high-warp substeps still update immediately.
- Trajectory prediction now treats the spacecraft probe as a true **one-way test particle**: major sources gravitate mutually, the probe feels them, and the probe never back-reacts on them. Strong-gravity prediction uses adaptive local/pair step limits under a bounded CPU budget and reports when that budget limits numerical resolution.
- L1/L2/L3 overlay positions now use numerical roots of the circular restricted three-body equilibrium equation at the live separation instead of small-secondary first-order formulas. L4/L5 retain the exact equilateral circular-CR3BP geometry. These overlays remain diagnostics and never alter gravity.
- Collision previous-state storage is now reusable flat typed-array state rather than a fresh `Map` plus per-body typed arrays every physics substep; the pair scanner also avoids per-pair temporary arrays.

The v0.1.4.8.1 scientific-consistency and v0.1.4.8 navigation/exploration feature sets remain intact below.

## v0.1.4.8.1 scientific consistency

This hotfix corrects generator/rotation consistency findings from the full v0.1.4.8 physics audit without rewriting the validated Newtonian gravity engine, velocity-Verlet integrator, NAV/FRAME foundation, landing lifecycle, or iPhone WebGL2 backend policy.

- Fresh gas giants now use a coherent bounded bulk mass-density-radius proxy. Mass is authoritative, radius follows the proxy, and `densityKgM3` is re-derived from the same mass/radius pair. A conservative 1.15× Newtonian mass-shedding-period floor prevents generated spin below breakup. This is a bulk generation proxy, **not** a detailed planetary equation-of-state/interior-evolution model.
- Fresh planetary spin poles are derived from each body's actual parent-relative orbital angular momentum. `PRO`/`RETRO` now describes the physical spin pole relative to the orbit instead of a global-axis convention.
- Fresh moons use the synchronous two-body period `2π√(a³/G(Mparent+Mmoon))`, align their spin pole with the moon's orbital normal, and face the parent at the rotation epoch. Eccentric-orbit optical libration remains a natural consequence of constant synchronous spin versus nonuniform true anomaly.
- Existing schema-1 saves preserve serialized rotation period/direction/axis/phase/model when present. This is required because existing body-fixed landing anchors were captured in that saved frame. Only genuinely missing legacy rotation fields are backfilled.
- Legacy saved gas planets preserve their saved mass/radius/orbital geometry but re-derive contradictory stored bulk density when the new property-model marker is absent. Fresh systems receive the fully coherent v2 relation.
- Fresh `rogue` planets are forced above the local two-body stellar escape-energy threshold; saved legacy rogue velocities remain authoritative and are not silently rewritten.
- New permanent property tests cover gas coherence, breakup floor, orbital-relative spin direction, synchronous-moon period/facing, positive rogue energy, and save compatibility.

The v0.1.4.8 navigation/exploration feature set remains intact below.

Universe Lab is a mobile-first scientific/experimental space sandbox for static GitHub Pages. Authoritative orbital simulation remains SI-unit Float64 state with direct Newtonian major-body gravity, velocity-Verlet integration, floating-origin rendering, and pinned Three.js 0.185.0 presentation.

**Build marker:** `NAVSYS-148`
**Save schema:** 1 (unchanged; landing/session/weather/cockpit fields remain optional backward-compatible payload fields)
**Three.js:** 0.185.0 (unchanged)
**Deployment:** GitHub Pages → `main` → `/(root)`
**Release gate:** physical iPhone Safari



## v0.1.4.8 planetary system navigation & exploration

v0.1.4.8 makes the already-simulated planetary system directly discoverable and navigable without changing authoritative celestial mechanics. The System Map now exposes the live generated hierarchy as **primary star → planets → moons** in a body catalog, so a world remains selectable even when realistic scale makes its rendered disk or map marker too small to tap.

The map has three explicitly labeled projections. **LOG SURVEY** is a non-linear star-centered discovery view for whole-system usability; it never claims screen spacing is physical distance. **TRUE SYSTEM** is a linear current inertial X/Z projection of the system. **TRUE LOCAL** is a linear planet-centered view of the selected planet and its moons so satellite systems are inspectable without enlarging their physical orbits. All positions come from the current N-body state.

Selecting a physical body exposes live derived navigation data: ship range, star-relative range, parent body, class, physical radius/mass, Newtonian surface gravity, Keplerian period from the stored semi-major axis and parent mass, eccentricity, rigid rotation period/direction, instantaneous Hill radius, surface capability, and explicit atmosphere-model status. The interface deliberately reports atmosphere physics as **unmodeled** rather than inventing pressure/composition from planet artwork. Only the existing detailed home-world surface is currently landable; other solid worlds are identified as orbital-only and gas planets as having no solid surface.

NAV selection now feeds the existing authoritative target ID directly into FRAME. FRAME remains explicitly fictional spacecraft-only coordinate translation. On a normally completed planet/moon/rogue-planet trip, however, the handoff now establishes a physically interpretable **instantaneous circular osculating orbit** around the live target: position is placed outside the physical radius at a conservative minimum altitude, velocity becomes the target's live inertial velocity plus a tangential `sqrt(GM/r)` orbital component, and the insertion radius is constrained to 47% of a conservative Hill estimate when a parent orbit is known. The conservative Hill estimate uses the smaller of the live-separation estimate and the stored-orbit pericenter estimate. This does not guarantee long-term N-body stability, but it avoids the previous zero-relative-velocity planetary arrival. Manual FRAME disengage and unsupported targets retain the explicitly fictional inertial-frame match.

FRAME route safety also remains finite-body aware. If the direct swept segment to a selected target would cross another massive body's existing FRAME clearance guard—as occurs for the tight inner `ORIGIN-001` moon `Caelum-4361 b-A` behind its parent from the normal start—the planner searches a deterministic two-leg bypass. The waypoint is stored relative to the live blocking body so it follows ordinary N-body motion; both legs are checked against every massive-body guard. Guard radii are never reduced and celestial bodies are never moved to manufacture a route. If no clear bypass exists, FRAME refuses the trip rather than clipping through the obstruction.

Save schema remains `1`; the existing target ID was already persisted. Direct Newtonian gravity, velocity-Verlet major-body integration, system generation, the canonical astronomical observer, accepted rotating-surface astronomy, landing/takeoff, and the iPhone/iPad forced-WebGL2 backend remain protected.

## v0.1.4.7.1 surface astronomy diagnostics & pause control

v0.1.4.7.1 is a deliberately surgical follow-up to the physically accepted v0.1.4.7 rotating-surface foundation. It adds no new celestial force, integrator, renderer backend, spacecraft flight behavior, save schema, or star catalog.

Surface **DETAILS** now exposes read-only body-fixed latitude/longitude, current rigid-body rotation phase, primary-star altitude/azimuth, and geometric local solar time. ALT/AZ comes from the same canonical `AstronomicalObserverModel` solution passed to the surface renderer. Local solar time is computed from the body-fixed observer longitude and the primary star's substellar longitude; the longitude zero-meridian is procedural and is not a claim about a real named planetary prime meridian.

A new landed-only **PAUSE SKY / RESUME SKY** control exposes the pause path that already existed underneath v0.1.4.7. It toggles the same simulation-running flag used by the main pause control. While paused, celestial N-body time is held, while local walking and deterministic surface weather remain responsive. The control is disabled during descent/ascent so it cannot complicate the accepted landing handoff lifecycle.

The surface HUD refresh now consumes the same already-solved astronomy frame used for rendering, avoiding a duplicate observer solution in the normal render loop. Save schema remains `1`; Three.js remains `0.185.0`; iPhone/iPad WebKit remains forced to WebGL2; FRAME, ordinary ShipDynamics, direct Newtonian gravity, velocity-Verlet, surface save/load, and the accepted takeoff recovery path are unchanged.

## v0.1.4.7 planetary rotation & continuous surface astronomy

v0.1.4.7 extends the fixed-time sky-continuity foundation into a continuously evolving landed observer without replacing the canonical astronomy work. Generated planets and moons gain deterministic rigid-rotation metadata from an **independent per-body RNG stream**, so legacy seeded orbital systems keep the same bodies, positions and velocities.

At touchdown the surface anchor is captured in the parent body's rotating **body-fixed frame**. While landed and unpaused, major-body Newtonian N-body integration and the canonical astronomical clock now continue at a forced **1×**; ordinary spacecraft `ShipDynamics` and navigation are deliberately not stepped, so the parked craft remains surface-constrained instead of being treated as a free-orbiting ship. The local horizon is reconstructed from the rotating anchor each frame.

The one inertial star catalog is dynamically reprojected against that changing horizon without reseeding. Sun/body observations continue to come from authoritative live major-body positions. A bounded daylight/twilight/night presentation response is driven by the physically derived stellar altitude; it is explicitly not a radiative-transfer or atmospheric-scattering solver. Surface astronomy is limited to 1× in this foundation build.

Save schema remains `1`. Existing saves are backfilled with deterministic rotation metadata for generated bodies, and active surface sessions may optionally persist the body-fixed anchor/capture metadata. Three.js 0.185.0, FRAME isolation, the accepted iPhone/iPad forced-WebGL2 policy, landing/ascent recovery, and ordinary orbital `ShipDynamics` remain protected.

## v0.1.4.6.1.3.1 Cockpit MFD transparency & engineering diagnostics polish

This is a contained cockpit/UI polish release built directly from v0.1.4.6.1.3 after physical iPhone review. All four camera-attached cockpit displays now use a modest smoked-glass alpha background so the starfield/target scene remains faintly visible behind the telemetry while text stays crisp and opaque. No screen position or simulation authority changes.

The right-side **SYSTEM DIAGNOSTICS** pane keeps its accepted location but its cyan outline, physical bezel and projector rail are reduced/repositioned so the display edge no longer masks the telemetry. Tapping SYSTEM DIAGNOSTICS now opens a dedicated read-only **ENGINEERING / DIAGNOSTICS** drawer that mirrors the same runtime telemetry bus instead of reopening the existing Flight/System controls already represented by the center FLIGHT MFD.

The HTML shell now version-tags `styles.css` and `src/main.js` with `?v=146131` to reduce stale mixed-asset loads on iPhone Safari/GitHub Pages. FRAME, APPROACH, ShipDynamics, direct Newtonian gravity, velocity-Verlet body integration, save schema 1, Three.js 0.185.0 and the forced iPhone/iPad WebGL2 policy are unchanged.

## v0.1.4.6.1.3 Frame Drive & cockpit flight-control polish

This release is built directly from the physically reviewed v0.1.4.6.1.2 cockpit-diagnostics build. The right-side **SYSTEM DIAGNOSTICS** MFD stays at the exact accepted 3D position; the overlapping HTML THRUST / REV / BRAKE cluster is made smaller and lower/right on short landscape viewports instead of moving the monitor. The bottom primary strip adds a direct **FRAME** control. FRAME is tap-toggle: one tap engages toward the currently selected target, another tap exits.

**FRAME DRIVE is explicitly fictional and spacecraft-only.** It reuses the existing isolated transit module internally, but no longer presents the feature as a conventional velocity. While FRAME is active, the spacecraft position is translated toward the locked body/COSMOS target at a selected coordinate-rate tier while local `ShipDynamics` acceleration/integration is suspended. Major bodies continue through the existing direct Newtonian gravity + velocity-Verlet path, and particle/weather/collision systems keep their existing authority. Normal FRAME exit or automatic arrival matches only the spacecraft to the target's inertial velocity; ordinary `ShipDynamics` and gravity then resume immediately. Forced safety dropouts preserve the pre-FRAME local spacecraft velocity instead of performing a target match.

FRAME locks simulation warp to 1× while active. It can still translate the spacecraft if the simulation has been paused by the 0.1c Newtonian model guard, which provides a recovery path without advancing the paused world's simulation clock. The existing **APPROACH** controller remains the real-physics option: bounded propulsion, braking-safe target-relative guidance, capture and station keeping are unchanged.

The FLIGHT cockpit MFD becomes a temporary FRAME status screen while engaged, showing range, frame rate, exit rule, local Δv and ETA. Save schema remains 1, Three.js remains pinned to 0.185.0, and the iPhone/iPad WebKit forced-WebGL2 policy is unchanged.

## v0.1.4.6.1.2 integrated cockpit diagnostics

This is a contained cockpit-presentation release built directly from v0.1.4.6.1.1 after the physical iPhone cockpit screenshot showed that the live renderer/performance/debug telemetry was visually useful but looked detached when spread across the top of the canopy.

Ship view now adds a fourth live camera-attached CanvasTexture display: a right-side **SYSTEM DIAGNOSTICS** MFD mounted into the procedural cockpit with a slim physical rail and a translucent/holographic presentation. It mirrors the existing live renderer backend, FPS, physics/render timings, ship speed, simulation time, seed, major/test counts, draw calls, prediction timing, experiment particle count and experiment timing. The display owns no simulation state; every value still comes from the existing app/renderer telemetry path.

While the 3D cockpit is active, the duplicated top renderer/stat cards and seed/debug strip are hidden so the forward canopy is cleaner. The normal top HUD telemetry remains available whenever the cockpit is deliberately hidden. The compact target ribbon remains visible. Tapping the diagnostics MFD opens the existing **Flight / System** drawer, reusing the same control path rather than creating a second settings/debug state machine.

The change is deliberately mobile-safe: one additional low-frequency CanvasTexture refresh (same 180 ms cockpit cadence), basic/emissive materials only, no new dynamic lights, no external cockpit asset, no physics/save/observer/landing/backend change, and save schema remains 1.

## v0.1.4.6.1.1 cockpit ergonomics / lighting polish

This is a deliberately narrow polish release built directly from v0.1.4.6.1 after physical iPhone testing showed the overall cockpit concept was liked but the three MFD faces appeared visually tucked behind the glare-shield bar. No astronomy, physics, landing, save-schema, or renderer-backend redesign is included.

The **NAVIGATION / FLIGHT / SCIENCE** MFD faces and bezels are moved forward of the glare shield and slightly raised/retuned toward the pilot, while the shield itself is thinner and remains behind the displays. The intent is to improve legibility and physical mounting without sacrificing the wide forward astronomy window.

The redundant bottom **MORE** launcher is removed. The existing **FLIGHT** MFD remains the intended entry to the same Flight/System drawer, so those controls are not duplicated. A tiny **COCKPIT** restore failsafe appears only when the user deliberately hides the cockpit, preventing an off-state save/load from trapping a phone user without a way to re-enable it.

Cockpit illumination gains restrained, mobile-safe emissive accents and five live status lamps: **POWER, TARGET, NAV, PROPULSION, CAUTION**. They are indicators tied to real telemetry, not fake buttons, and no new dynamic PointLight/SpotLight cost is added. Every visible cockpit button and screen remains functional.

## v0.1.4.6.1 interactive 3D cockpit

This release builds directly on the physically accepted v0.1.4.6 sky-continuity foundation without changing orbital physics, observer math, landing lifecycle, save schema, or the iPhone WebGL2 backend policy. The old decorative DOM/CSS cockpit shell is replaced visually by a camera-attached Three.js cockpit designed around a wide astronomy window.

The cockpit has three live CanvasTexture MFDs: **NAVIGATION**, **FLIGHT**, and **SCIENCE**. Each displays live simulation data and is itself touch-active. Nine visible physical keys are also functional: **MAP, TGT, APPR, ENG, PRO, RET, SCAN, SCI, OVR**. No visible cockpit button or screen is decorative-only. The controls dispatch the existing authoritative app actions rather than creating a second flight/science state machine. OBSERVE and surface modes still auto-hide the cockpit, and the existing cockpit preference remains schema-1 compatible.

The procedural shell is deliberately modular. A future licensed/optimized GLB cockpit can replace the geometry while keeping the live MFD, telemetry, action-routing, visibility, and save-preference interfaces.


## v0.1.4.6 astronomical observer and sky continuity

The sky is now derived from one read-only canonical observer solution in ship, descent and surface modes. Major bodies use authoritative live inertial positions relative to that observer; the solution also exposes range, physical apparent angular radius, local up/horizon, orientation and above/below-horizon state.

Space and surface views reuse one deterministic inertial star catalog. Landing does not reseed it. Surface projection is built once for the landing basis, hides the lower hemisphere, follows local heading through the camera, and attenuates visibility through daylight/weather hooks without deleting stars from the model. Orbital N-body time remains intentionally held while landed, so this release guarantees fixed-time continuity rather than inventing a second ephemeris clock.

Repeated LAB magnetars now receive deterministic collision-safe placement offsets. Their masses already participated in mutual Newtonian gravity; magnetic lobes remain visual only and no MHD force was added.

The accepted iPhone/iPad policy is preserved: Three.js WebGPURenderer uses its forced WebGL2 backend on Apple mobile WebKit. Physical iPhone Safari remains the release gate.

## v0.1.4.5.4 renderer-handoff isolation

Physical iPhone testing of v0.1.4.5.3 reached `ORBIT VERIFIED · surface=OFF · render=SPACE · run=YES · input=YES` while the canvas still visibly showed the local surface. That means this release intentionally does **not** add another ascent state rewrite. It isolates the graphics backend instead.

On iPhone/iPad-class WebKit, Universe Lab now keeps the same Three.js `WebGPURenderer` architecture but constructs it with `forceWebGL: true`. The active backend should therefore read **WebGL2 iOS** in the top HUD. Other platforms retain automatic backend selection. This is a controlled physical test for an iOS/WebKit presentation-stall hypothesis, not a permanent claim that WebGPU is unusable.

The v0.1.4.5.3 landing/ascent lifecycle and diagnostic chip are otherwise preserved so backend selection is the meaningful variable under test. The astronomy/real-sky phase remains blocked until takeoff is visibly and interactively reliable on-device.

## v0.1.4.5.2 ascent/orbit handoff hotfix

v0.1.4.5.2 is a focused corrective release built directly from the physically tested v0.1.4.5.1 startup-hotfix baseline. It addresses the reported iPhone Safari failure where the scripted ascent visibly lifted the parked ship, the UI/cockpit switched back to ORBIT, but the last surface framebuffer remained on screen and the transition appeared frozen.

The handoff is now transactional: surface renderer/session/UI ownership is detached first, the physical ship is restored to the safe 5-radius orbit at 1×, camera and lifecycle invariants are validated, and the *same animation callback* immediately renders an orbital ship-view frame at zero simulation dt. **ASCENT COMPLETE is not announced until that orbital render has succeeded.** Surface renderer ownership is also cleared before local resource disposal, so cleanup cannot leave the renderer logically stuck in surface mode if disposal itself faults.

No orbital physics, propulsion values, BOOST/TRANSIT behavior, surface generation, weather, anomalies, spacecraft geometry or save schema was redesigned in this hotfix.

## v0.1.4.5.1 startup hotfix

v0.1.4.5.1 is a minimal corrective release built from v0.1.4.5. It initializes the landing transition controller and recovery guard in the app constructor before `newSystem()` can use them. This fixes the startup error `Landing transition state is required.` without changing the planned landing/ship feature scope.

## v0.1.4.5 landing reliability + spacecraft presence

v0.1.4.5 is built directly from the physically tested v0.1.4.4.1 surface-HUD baseline. It fixes the surface/orbit lifecycle instead of patching TAKEOFF in isolation.

The landing path now has explicit states: **ORBIT → DESCENDING → LANDED → ASCENDING → ORBIT**. LAND cannot be re-entered while a transition is in progress, surface movement/scan/save controls are locked during descent/ascent, and any failed entry/ascent cleanup falls back to a valid orbital state rather than leaving the app half-landed. Successful ascent hands control back at safe 5-radius orbit and 1× Newtonian flight.

TAKEOFF is now a boarding action. The compact HUD shows ship distance/readiness; the player must be within 36 m of the parked spacecraft before **BOARD / TAKEOFF** can start. Fresh descent and ascent automatically face the ship so the scripted VTOL sequence is actually visible.

The exterior spacecraft was rebuilt with a smoother 20-segment fuselage/nose, dark heat-shield chine, canopy/spine, swept wing geometry, tail surfaces, twin engine pods/nozzles, four VTOL thrusters, landing struts/pads, nav/strobe/landing lights and ground transition glow. It remains a lightweight renderer-local representation; authoritative orbital `ShipDynamics` is unchanged.

Save/load now also preserves the pre-surface simulation running state and orbital time-scale intent as optional schema-1 fields, preventing a loaded surface session from accidentally inheriting the temporary landed pause as its orbital state.

v0.1.4.3 is built directly from v0.1.4.2 System Map + Discovery & Anomalies. It preserves System Map/discovery, persistent space weather, stellar rendering, Newtonian flight, BOOST, TRANSIT, impacts, experiments, compact objects and scientific overlays while introducing the first deliberately bounded planetary surface architecture.

v0.1.4.3.1 is built directly from v0.1.4.3 Planetary Landing Foundation. It preserves the surface landing architecture and adds a **default-on, low-obstruction ship cockpit overlay** so SHIP VIEW feels like the player is inside an actual spacecraft without sacrificing the wide forward view.


## v0.1.4.4.1 surface exploration UI

v0.1.4.4.1 is a focused mobile UX pass built directly from v0.1.4.4. It does not redesign the surface renderer or environment model. The default landed view now uses a small top-right exploration strip rather than the full scientific panel.

Compact view keeps the information/actions needed while moving: current world/region, weather, nearest signal, discoveries, **SCAN** and **SPRINT**. Tap **DETAILS** to reveal the full gravity/temperature/atmosphere/coordinates/weather/archive panel plus **SAVE** and **TAKEOFF / ORBIT**. Tap **HIDE** to collapse it again. The expanded/collapsed preference is stored with an active surface-session save without changing schema 1.

The WALK pad is also smaller and sits tighter against the bottom-right safe edge to preserve more of the planetary view.

## v0.1.4.4 environment layer

v0.1.4.4 builds directly from v0.1.4.3.1 and turns the first planetary surface from a single static showcase into a small deterministic environment framework. The first landable planet now exposes three seeded landing regions:

- **Shatterfall Basin** — the original anomaly-rich basalt/ash showcase, retaining all seven surface anomaly families.
- **Glasswind Flats** — smoother wind-polished glass-darkened terrain with stronger dust/fog emphasis and four anomaly sites.
- **Frostscar Rise** — rougher cold mineral highland with broad frost coverage, frost/electrostatic weather emphasis and four anomaly sites.

The Flight Scanner contains a **Landing region** selector. System Map landing still defaults safely to Shatterfall unless another region was selected. Region generation remains deterministic from system seed + body ID + region ID.

### Persistent local weather

Surface weather retains its own deterministic local real-time clock. As of v0.1.4.7 the celestial N-body clock can continue independently at surface 1×, while weather remains a separate local presentation timeline. The first seeded change is scheduled soon enough to be testable on iPhone, then later clear/event intervals continue deterministically. Save/load preserves the exact event, remaining duration, next clear-interval timer and weather RNG state.

Modeled/ordinary presentation events are Dust Front, Low Fog Bank, Frost Squall and Electrostatic Storm. The anomaly layer can also produce intentionally impossible Upward Rain, Shadow Fog, Suspended Lightning and Sky Fracture. Impossible events are explicitly labeled in the surface HUD.

Weather currently changes visual cloud/fog/particle layers, visibility, scene exposure, wind/temperature readouts and lightning/fracture presentation. It **does not** apply aerodynamic forces, surface damage, erosion, precipitation accumulation, wetness, fluid dynamics or hidden time/gravity effects.

### Parked spacecraft

A lightweight procedural exterior spacecraft now sits at the landing site. It includes a metallic fuselage, canopy, wings, engine pods, landing gear, navigation lights and the existing landing beacon. The surface HUD shows distance back to the ship. This model is a local visual representation only; ordinary orbital `ShipDynamics` is constrained while landed even though the celestial N-body world continues advancing at 1×. TAKEOFF / ORBIT returns the authoritative spacecraft to the parent body’s current safe orbital state.

## Ship cockpit view

SHIP VIEW now includes a restrained canopy presentation: a thin top arch, narrow side struts, subtle lower dashboard panels and faint canopy reflections. The center of the screen remains intentionally open so stars, planets and anomalies still dominate the view.

The cockpit is:

- visual only,
- enabled by default,
- automatically hidden while using OBSERVE camera modes,
- automatically hidden during planetary surface sessions, and
- user-toggleable from **MORE → COCKPIT ON/OFF**.

The cockpit preference is optionally saved as `cockpitEnabled` without changing save schema `1`.


## First landable world

The generated solid home-candidate planet is now the first detailed landing target. For the default `ORIGIN-001` system this is **Caelum-4361 d**.

The first local region is **Shatterfall Basin**, a deterministic 2.4 km × 2.4 km showcase region. It is designed to read as believable terrain first and anomalous terrain second rather than as an abstract effects room.

The base surface includes:

- seeded rolling/broken terrain with crater, ridge and basin-scale relief,
- rock fields and exposed mineral formations,
- an ash/basalt/desert base appropriate to the default home world,
- frost/crystal, ember/fissure, glass-darkened and mineral-rich subzones,
- atmosphere/sky/fog/star-light presentation derived from the generated planet profile,
- two conventional geology scan sites.

The surface is generated from the system seed + body ID, so the same save/system returns to the same landscape and POI layout.

## Surface anomaly showcase

Shatterfall deliberately contains **seven anomaly families** near the landing site so the first landing demonstrates the range of Universe Lab's anomaly direction:

1. **Fracture Gate** — impossible/fictional nonlocal-looking frame.
2. **Gravity Knot** — anomalous levitating orbital-stone geometry.
3. **Frozen Lightning Field** — impossible arrested discharge structure.
4. **Reverse Shadow Monolith** — impossible shadow projected toward the star.
5. **Vacuum Bloom** — speculative luminous petal structure.
6. **Ghost Ruin** — anomalous phase-offset architectural echoes.
7. **Chronal Shear** — impossible local visual time-echo planes.

They are intentionally spectacular but remain honest about the model boundary. In v0.1.4.3 they are **visual/discovery content only**. They do not secretly add gravity, teleport the player, change simulation time or override the orbital solver.

## Landing / surface loop

- Select the landable home world.
- Enter the near-orbital descent envelope. `HOME / ORBIT` returns the spacecraft to the seeded demonstration orbit if needed.
- Use **LAND / DESCEND** from the normal target controls or System Map.
- While landed and unpaused, major-body N-body time continues at forced 1×; the spacecraft remains surface-constrained and is not stepped through ordinary ShipDynamics/navigation.
- Use the existing LOOK pad plus the surface directional controls to explore.
- Hold **SPRINT** for faster local traversal.
- Approach a geology/anomaly site and press **SCAN LOCAL**.
- Surface scan discoveries persist through SAVE/LOAD.
- **TAKEOFF / ORBIT** performs a clearly scripted ascent and returns the spacecraft to a safe 5-radius orbit, then restores normal Newtonian flight at 1×.

This is not yet a full atmospheric flight model. Atmospheric entry, heating, aerodynamics, terrain collision rigid-body dynamics and physically modeled ascent are future layers.

## Surface persistence

The existing schema remains `1`. The save payload now optionally stores an active `surfaceSession` containing:

- body + region identity,
- local X/Z position,
- local look yaw/pitch,
- scanned surface POI IDs,
- selected surface POI,
- optional body-fixed landing anchor + astronomical capture time/model version.

Older schema-1 saves remain valid. When loading an older save, deterministic landing-capability metadata for the generated home world is refreshed without replacing the saved body's physical position/velocity/mass/radius state.

## Retained v0.1.4.2 discovery systems

- interactive logarithmic SYSTEM MAP,
- persistent 0–3 COSMOS scan depth,
- ~9–15 deterministic free-space anomaly signals per system,
- KNOWN / SPECULATIVE / ANOMALOUS / IMPOSSIBLE-FICTIONAL reality classes,
- persistent automatic space-weather timeline and active CME fronts,
- anomaly visuals kept out of the massive-body gravity registry.

## Retained navigation/physics foundation

- FLIGHT 20 m/s²
- CRUISE 120 m/s²
- explicit speculative BOOST 5,000 m/s²
- inertial velocity marker, PROGRADE / RETROGRADE, TURN & BURN
- STOP RELATIVE
- propulsion-safe APPROACH → BRAKING → CAPTURE → HOLD
- explicitly fictional 1c / 10c / 100c / 500c / 1000c FRAME coordinate-rate travel, isolated to the spacecraft
- FRAME swept-body guards, target-frame velocity matching on normal exit, and preserved local velocity on forced safety dropout
- direct Newtonian major-body gravity + velocity-Verlet
- adaptive strong-gravity substeps + 10% c Newtonian model guard
- compact-object spawners, impacts, crater/fragment response
- particle experiments and deterministic replay
- scientific Lagrange/Hill/Roche/orbital-plane/gravity-vector overlays
- stellar perceptual LOD that preserves major spectacle at range

## Recommended first iPhone test

1. Confirm **v0.1.4.4 / ENVWX-144** and no runtime `ERR`.
2. On a fresh `ORIGIN-001` run, the home world should already be selected and the ship should begin in the landing envelope.
3. Press **LAND / DESCEND**.
4. Confirm Shatterfall Basin renders as actual ground/sky/terrain rather than a flat orbital sphere.
5. Drag LOOK and hold the on-screen surface directional controls; verify no stuck-input behavior after releasing a finger.
6. Find the closest signal (the first anomaly is roughly a few hundred meters or less from the landing site), move into scan range and press **SCAN LOCAL**.
7. Confirm the HUD reveals the POI's reality class and model-boundary text after scanning.
8. Visit several differently colored/structured anomaly sites and conventional geology.
9. SAVE while on the surface, refresh/load, and verify local position + scanned POIs return.
10. Press **TAKEOFF / ORBIT** and verify the normal ship HUD/flight controls return in safe orbit at 1×.
11. Regress SYSTEM MAP, free-space anomalies, weather continuity, stellar approaches, BOOST, APPROACH/HOLD, FRAME, compact objects, overlays, impacts and particle experiments.

## Automated QA

`npm run qa` passes **98/98 tests** plus the static structure and syntax checks. New tests cover deterministic surface generation, landable-profile identity, terrain variation, local movement bounds, proximity scanning and surface-session persistence.

Automated QA does **not** prove real iPhone WebGPU performance, touch feel, thermal behavior or subjective terrain/anomaly visual quality. Physical iPhone Safari remains the release gate.

## Next likely milestone

After physical acceptance of v0.1.4.4, the sensible next step is **v0.1.4.5 Surface Exploration, Resources & POIs**: deeper scan interactions, sample/resource collection, caves/ruins, region-specific discoveries and first surface objectives while preserving the mobile streaming budget.
