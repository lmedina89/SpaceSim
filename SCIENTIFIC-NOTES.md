# v0.1.5.3 scientific boundary notes — atmosphere & sky optics

## What is physically derived

- Molecular Rayleigh optical depth follows a standard dry-air-like wavelength law at representative red/green/blue wavelengths and scales with the canonical pressure column.
- Hydrostatic scale height uses `H = kT/(mg)` from canonical equilibrium-temperature proxy, surface gravity and representative molecular mass.
- Direct stellar extinction follows Beer-Lambert transmission through a bounded Kasten-Young-style optical air mass above the apparent solar horizon.
- Finite-disk eclipse visibility from the existing celestial-appearance solver attenuates direct and diffuse illumination; no eclipse geometry is recomputed here.
- Orbital limb scale is tied to hydrostatic scale height and a spherical tangent-column approximation.

## Explicit proxies / limits

- The environment model does not yet know full atmospheric composition. Rayleigh refractivity therefore uses a **dry-air-like reference**, not a claim that every atmosphere is Earth air.
- Aerosol/Mie extinction uses a weakly wavelength-dependent generic optical-depth proxy; surface weather can increase it. Particle chemistry/size distributions are not solved.
- Twilight below the geometric horizon uses a bounded exponential single-scattering presentation approximation; multiple scattering and refraction are not solved.
- `FogExp2` is used as a local GPU-efficient extinction presentation from the derived 550-nm coefficient; it is not a volumetric radiative-transfer solver.
- Orbital atmosphere shells are bounded visual approximations and do not modify physical radius or atmospheric mass.
- Clouds, absorption bands, ozone/chemistry, polarization, radiative-convective equilibrium, greenhouse warming, fluid circulation and cloud microphysics are outside this milestone.

The canonical v0.1.5.0 atmosphere-pressure and radiative-equilibrium-temperature model boundaries remain unchanged.

---

# v0.1.5.2 scientific boundary notes

The new surface worlds are presentations derived from the canonical planetary-environment model; they do not upgrade that model into a climate/geochemistry solver.

- **Radiative-equilibrium temperature** remains the full-redistribution/unit-emissivity equilibrium estimate. It is not a measured or greenhouse-corrected surface temperature.
- **Atmosphere pressure** remains the seeded formation + simplified thermal-retention/gas-availability proxy introduced in v0.1.5.0.
- **Caelum-4361 e** uses a cold rocky terrain/lighting/fog presentation informed by its canonical environment. Its dust/frost events are deterministic visual weather proxies; no CFD, aerosol microphysics, precipitation cycle or aerodynamic force is solved.
- **Caelum-4361 h-A** uses high-albedo ice/fracture/contaminant terrain proxies informed by its high ice potential and cryogenic equilibrium temperature. This does not claim solved mineralogy, water-ice phase structure, volatile transport, tidal heating or subsurface-ocean state.
- Surface gravity shown/used comes from the canonical body environment (`GM/R²`).
- Gas giants still have no fake ground. Rogues remain surface-disabled until a defensible rotation model exists.
- The suspected FRAME target-body pass-through remains unmodified: the available physical recording did not establish a reproducible intersection, and the user explicitly deferred speculative clearance instrumentation/routing work.
- Close-orbit sphere/texture limitations are rendering limitations and remain scheduled for later near-orbit/celestial rendering milestones rather than being disguised as physics changes.

---

# Universe Lab Scientific Notes — v0.1.5.1.2 Portrait HUD Transparency Hotfix

## v0.1.5.1.2 scientific boundary

This release changes only portrait cockpit presentation. No scientific model, body state, integrator, environment value, observer geometry, landing state, FRAME state, or save field is changed. Reduced portrait MFD opacity is a renderer/UI composition choice only.


The surface engine now consumes the canonical planetary-environment record through a separate architectural profile layer. This does **not** make procedural terrain a new physical authority: body mass/radius/orbit/rotation/atmosphere proxy remain authoritative upstream inputs, while local terrain, regolith color and geology are deterministic presentation/proxy outputs.

For an `AIRLESS_ROCKY` profile, a pressure proxy below 1 Pa is treated as vacuum for surface presentation: no aerodynamic weather, fog, clouds or wind are rendered/scheduled. The black daytime sky is an optical vacuum boundary, while direct stellar illumination and the inertial star/celestial catalog remain active. This is not a thermal-inertia, regolith photometry or shadow-map model.


Moon proof-surface takeoff derives its orbit-planning radial direction from the current rotated body-fixed landing anchor, then reuses the existing Hill-screened circular insertion planner. The accepted home-world return path is unchanged.

The first ORIGIN proof world is Caelum-4361 f-A. Its selection is based on its canonical airless-rocky moon classification and moderate equilibrium-temperature range, not hardcoded visual color. Other solid bodies remain landing-disabled even if their architecture family is known.

---

## What is physical vs modeled

For planets, moons and rogue planets, v0.1.5.0 derives **bulk density, local surface gravity, escape velocity, current/reference stellar irradiance and radiative-equilibrium temperature** from authoritative SI body/star state. These values are not chosen for appearance.

The environment model also needs formation information that cannot be uniquely recovered from the present N-body state. **Bond albedo, volatile inventory, initial atmospheric inventory and a representative atmospheric molecular mass are therefore deterministic seeded model assumptions**, versioned independently from orbital generation. They are not observations.

The solid-world atmosphere value shown in NAV is a **pressure proxy**, calculated from the seeded inventory after a simplified thermal-retention/Jeans diagnostic and a generic temperature-dependent gas-phase-availability factor. This does not solve atmospheric composition, detailed phase equilibria, greenhouse warming, clouds, photochemistry, EUV/stellar-wind escape, climate, or atmospheric optics. Accordingly, `EQ TEMP` is a radiative-equilibrium diagnostic and must not be interpreted as actual surface temperature.

Gas giants are classified as deep H/He envelopes and do not receive a fictitious solid surface or single surface pressure. Solid-world environment families are classification inputs for future multi-world surfaces; v0.1.5.0 intentionally leaves the existing detailed home world as the only enabled landing surface.

### Independent population audit

A 3,000-system post-implementation sweep covered **44,331 modeled worlds** (5,434 gas giants, 38,897 solid worlds, 21,409 moons, 1,889 rogues). It found zero non-finite environment records, zero gas/solid-surface contradictions, zero pressure-cap hits, zero hot bodies mislabeled ice-rich, and zero home-world pressure-continuity failures. Sampled radiative-equilibrium temperatures spanned about **23.29–595.36 K**; solid-world pressure proxies ranged from effectively airless to about **72.64 atm**. These ranges validate numerical/model consistency, not observational truth for a real exoplanet population.

---

# Scientific Notes — v0.1.4.9.1.1 Observation Planner Mobile Layout Hotfix

The observation planner predicts **geometric stellar alignments**, not scripted events. It begins from a snapshot of the current authoritative N-body state, then advances a temporary clone with the same Newtonian force law and velocity-Verlet update used by the live major bodies. Ordinary search samples are no farther apart than 300 s; candidate local minima in apparent star-body angular separation are re-integrated over the surrounding window at a 10 s ceiling before the canonical finite apparent-disk overlap calculation is evaluated.

A listed conjunction is a local minimum in apparent separation within the planner's 5° reporting window; this UI label is an observing aid rather than a formal ecliptic-longitude definition of astronomical conjunction. An eclipse/transit requires the candidate to be geometrically foreground of the primary star and for the finite apparent disks to overlap. Classification reuses v0.1.4.9's `diskOccultation()` states.

**Reference geometry:** BODY CENTER is useful for system-scale planning but ignores surface parallax/horizon. CURRENT LANDED SITE uses the exact saved body-fixed anchor plus local x/z offset and rigid body rotation; star altitude at the predicted event is therefore meaningful for that fixed site. The planner assumes the user remains at that site.

**Known limits:** predicted ephemerides do not execute future collision/fragmentation resolution, do not anticipate future user thrust/FRAME maneuvers, and are not relativistic. Close massive pairs use the existing adaptive Newtonian timestep ceiling and may exhaust the planner's bounded mobile work budget. Results beyond an actual future collision require a fresh plan from the post-collision live state.

# Scientific / Model Notes — Universe Lab v0.1.4.9


**v0.1.4.9 note — celestial appearance:** for a spherical target of physical radius `R` at center range `d`, apparent angular radius is `asin(clamp(R/d, 0, 1))`. Phase angle `φ` is the angle at the target between target→observer and target→primary-star directions; illuminated fraction is `(1 + cos φ) / 2`. These are geometry quantities, not fitted visual phases.

Observer-side eclipses/occultations use finite apparent stellar/foreground disks and analytic circle-overlap area. A foreground body must be closer than the background body. The current model reports/applies the **single dominant occulter**; simultaneous overlapping occulting disks are not yet union-solved. Body-centered stellar visibility uses the same finite-disk geometry from the target body's center, so it is an eclipse/shadow diagnostic rather than a full spatial umbra/penumbra illumination map over the target surface.

In space, ordinary planets/moons remain `MeshStandardMaterial` reflectors lit from the primary star's live direction, so the pre-existing geometric terminator behavior is preserved. Their self-emissive floor/readability shell is removed. Renderer light intensity remains exposure-normalized for usability and is **not** a physical inverse-square stellar-flux/radiative-transfer solution.

On the surface, the stellar disk and phase bodies preserve canonical sky direction and physical apparent angular size. Their finite 3-D placement uses a monotonic compressed sky-shell depth solely for floating/render precision and correct nearer-before-farther depth ordering; that depth is not an astronomical distance measurement. Planet/moon surface-sky brightness uses a Lambertian vertex proxy (`max(0,n·l)`) from the canonical target→star direction, multiplied by the body-center stellar-visible fraction. It does not model wavelength-dependent albedo, roughness BRDF, atmospheric scattering, refraction, limb darkening of the illuminating star in eclipse integration, cloud shadowing or thermal emission.

Surface direct-light/daylight presentation is attenuated by the observer's finite-disk stellar visible fraction. This makes a geometrically aligned occultation darken the scene consistently, but it is not yet a full sky/atmosphere radiative-transfer eclipse model. The surface fog/background exposure is recomputed from immutable base colors each frame; it no longer compounds darkness frame-over-frame.

**v0.1.4.8.2 note:** the audited direct Newtonian force law and velocity-Verlet major-body integrator are unchanged. Collision detection now solves the **first finite-radius contact** under linear relative motion over each substep. Position and velocity are interpolated to that contact before impact resolution. The short remaining part of the same substep is then drifted ballistically; this is intentionally not described as a full event-driven N-body collision integrator because gravity is not re-solved during that remainder.

Impact fragmentation is a bounded representative-body model. It conserves represented mass and 3-D linear momentum through center-of-mass-frame fragment velocities plus target recoil, and limits represented fragment/recoil kinetic energy to an available COM impact-energy budget. It does **not** model shock propagation, equations of state, melt/vapor fractions, strength tensors, hydrodynamic ejecta, relativity, or a complete debris-size distribution. Gas giants are treated as gas envelopes for impact classification and do not receive rocky-crater estimates.

Black-hole collision handling remains Newtonian outside the sink boundary. When contact is resolved with a black hole, the black hole absorbs the other represented body, mass-weighted linear momentum is conserved, and the Schwarzschild radius is recomputed from the updated mass. This is not a GR accretion or merger waveform model.

The new massive-pair timestep ceiling is an error-control heuristic based on a fraction of `sqrt(r³ / G(M1+M2))` plus a relative crossing-time cap. It does not make close compact-object motion relativistically correct; it only prevents the ordinary 300 s ceiling from being grossly under-resolved in close LAB encounters. The existing Newtonian validity guards still apply.

Trajectory prediction now treats the spacecraft/probe as massless for back-reaction purposes. Major sources evolve mutually; the probe samples their time-dependent Newtonian field. The predictor intentionally bounds CPU work. When `accuracyLimited` is true, the displayed path is a coarse bounded forecast and should not be interpreted as a precision ephemeris for that requested horizon.

L1/L2/L3 overlay locations use numerical roots of the **circular restricted three-body** equilibrium equation at the instantaneous separation and masses. This is much better for comparable masses than the old small-secondary approximations, but it still assumes a circular rotating two-primary model and therefore is not a general equilibrium solution for eccentric or strongly perturbed N-body configurations.

**v0.1.4.8.1 note:** gas-giant generation now enforces internal bulk-property consistency: `ρ = M / (4/3 π R³)` exactly for fresh generated gas worlds. The mass-dependent density/radius trend is a bounded population proxy for plausible 0.16–1.65 Jupiter-mass gas giants, not a detailed equation of state, thermal-contraction history, irradiation-inflation model, or atmospheric structure solver. Generated spin periods are bounded above the spherical Newtonian mass-shedding limit by a 15% safety margin.

Fresh planetary PRO/RETRO semantics are now orbital-relative. The spin pole is compared with the actual parent-relative `r × v` orbital normal. Fresh synchronous moons use `G(Mparent+Mmoon)` and are oriented toward the parent at epoch. On eccentric moon orbits, constant synchronous angular rate versus nonuniform orbital true anomaly can produce physical optical libration; this is not an error.

Save compatibility takes precedence over silently rewriting established worlds. A schema-1 save containing v1 rotation metadata keeps that exact axis/phase/sign convention because saved surface anchors are body-fixed in that frame. Fresh systems use v2. Legacy gas saves retain saved mass/radius/orbital state; only contradictory stored density is safely re-derived when the new property marker is absent.

Fresh rogue planets are generated with positive two-body specific orbital energy relative to the primary star. This guarantees the `rogue` label is energetically unbound at generation time; it does not model the body's formation/scattering history or guarantee that later N-body encounters cannot alter its orbit.

**v0.1.4.8 note:** the navigation catalog and map are views of the authoritative live N-body body registry, not a separate ephemeris. LOG SURVEY is intentionally non-linear and is labeled as such; TRUE SYSTEM and TRUE LOCAL are linear X/Z projections. Displayed surface gravity is `GM/R²`; displayed orbital period is the two-body Kepler estimate from stored semi-major axis and parent+body mass. Hill radius is a diagnostic approximation.

Normal completed FRAME travel to a supported planet/moon now returns the spacecraft to ordinary physics in an instantaneous circular **two-body osculating** state. Circular speed is `sqrt(GM/r)` relative to the target and is added to the target's current inertial velocity. The selected radius is outside the physical surface and is screened against a conservative prograde Hill estimate using the smaller of the live-separation estimate and stored-orbit pericenter estimate, with a 0.47 Hill fraction. This is not a proof of long-term stability in the full N-body system and it does not model propulsion or momentum exchange; FRAME remains explicitly fictional. Manual FRAME disengage still performs the previous fictional target-frame velocity match.

FRAME detour routing is likewise a **navigation/safety rule inside the fictional FRAME mechanism**, not a physical trajectory solver, geodesic calculation, or modeled propulsion maneuver. It uses the existing finite-radius massive-body FRAME guards as exclusion volumes. A direct blocked segment may be replaced by two swept-clear segments through a deterministic waypoint anchored to the blocking body's live position; every candidate leg is checked against all guards. The planner never changes a body's mass, radius, position or velocity and never shrinks a guard to make a route pass. Ordinary N-body motion remains authoritative while FRAME is active.

Atmospheric composition, pressure, scale height, drag, heating and radiative transfer are **not inferred** for the newly discoverable worlds. NAV reports that absence directly. Only the existing detailed home-world surface is currently implemented; additional solid planets/moons remain orbital destinations until their surface/environment models are built.

**v0.1.4.7.1 note:** surface diagnostics do not add a second astronomy model. Body-fixed LAT/LON and rotation phase expose the existing rigid-spin coordinates; primary-star ALT/AZ comes from the canonical observer body record used by rendering. Local solar time is geometric hour-angle time: 12:00 occurs when the observer body-fixed longitude matches the primary star's substellar longitude. The procedural body-fixed zero-meridian is arbitrary and should not be interpreted as a real-world named prime meridian. PAUSE SKY holds celestial simulation time only; surface weather/walking remain on their existing real-time local path.

**v0.1.4.7 note:** landed astronomy now advances the authoritative major-body N-body solution at forced 1× while the spacecraft remains surface-constrained. A deterministic rigid spin model converts a persisted body-fixed landing direction into the current inertial local horizon. The model is intentionally a rotation/observer foundation, not a formation-history, precession/nutation, tidal-evolution or atmospheric-scattering solution. Generated spin metadata comes from independent per-body RNG streams so legacy orbital seed state is not perturbed.

**v0.1.4.6.1.3.1 note:** MFD transparency, diagnostics bezel/rail geometry, the dedicated Engineering/Diagnostics drawer and shell cache-busting are presentation/telemetry-only. They do not alter celestial gravity, body integration, ShipDynamics, FRAME translation/exit matching, observer math, landing state or save authority.

**v0.1.4.6.1.3 note:** FRAME DRIVE is intentionally nonphysical convenience travel and is kept outside the celestial mechanics model. While active it translates only the spacecraft position and temporarily suspends local spacecraft Newtonian acceleration/integration; direct Newtonian major-body gravity and velocity-Verlet body integration are not altered. A normal FRAME exit instantaneously matches only the spacecraft to the locked target inertial velocity. That velocity match is itself fictional and must not be interpreted as modeled propulsion, momentum exchange, anti-gravity or general relativity. Forced safety dropouts preserve the existing spacecraft velocity. The real-physics APPROACH/BRAKE path remains available and unchanged.

**v0.1.4.6.1.2 note:** the new ship-mounted SYSTEM DIAGNOSTICS MFD and cockpit-mode top-HUD cleanup are presentation/input-only. Renderer/FPS/timing/count values are mirrored from existing runtime state; no diagnostic value feeds gravity, integration, navigation, observation, landing, weather or save authority. The v0.1.4.6 scientific model below is unchanged.

**v0.1.4.6.1.1 note:** cockpit MFD placement, menu cleanup, and emissive/status lighting are presentation/input-only; the v0.1.4.6 scientific model below is unchanged.

Universe Lab deliberately mixes physically motivated simulation with clearly labeled speculative/fictional presentation. The boundary matters more as planetary surfaces and anomalies are introduced.

## Authoritative orbital model

- SI units / Float64 state.
- Direct Newtonian gravity for registered major gravity sources.
- Velocity-Verlet major-body integration.
- Finite radii and existing impact handling.
- Existing strong-gravity adaptive-step and 0.1c Newtonian validity warnings remain.

## Astronomical observer and sky

Major-body apparent directions are computed from authoritative live positions minus the observer inertial position. Range and physical angular radius use `asin(radius/range)`; render proxies may be enlarged for legibility and are stored separately. Surface visibility uses the local tangent horizon and includes partial disks whose centers are slightly below it.

The seeded background catalog is a stable inertial visual reference, not a real-star astrometric catalog. It is generated once per system seed and reused across space and surface scenes. Daylight and weather reduce presentation visibility but do not remove catalog entries.

As of v0.1.4.7, landed celestial time can continue at forced 1×. The body-fixed landing anchor rotates with the generated parent-body spin model, so the local horizon evolves against the same inertial catalog and live major-body ephemerides. Surface weather remains a separate local clock and does not drive celestial motion.

LAB magnetars have real Newtonian mass and mutually accelerate when separated. Repeated spawns are deterministically separated to avoid identical initial positions. Magnetic fields, plasma, radiation pressure and MHD coupling remain unmodeled visual metadata/effects.

## Surface foundation model status

The Shatterfall Basin surface is **procedural presentation**, not a geophysical solver.

Modeled/derived quantities include a Newtonian surface-gravity estimate from the live planet mass/radius and a simple equilibrium-temperature proxy using stellar luminosity/orbital distance. The atmosphere value is explicitly labeled an `atm PROXY`; it is not a chemistry or radiative-transfer solution.

Terrain is deterministic seeded noise plus large-form crater/ridge/basin functions. Frost, ember, glass and mineral subzones are visual/environmental classifications rather than simulated phase chemistry.

While landed, major-body N-body time now advances at forced 1× when the simulation is running. The parked spacecraft is excluded from ordinary ShipDynamics/navigation integration. High surface time-warp remains intentionally unavailable until multi-scale landed evolution, performance and handoff behavior are validated.

## Landing / takeoff boundary

`LAND / DESCEND` and `BOARD / TAKEOFF` are scripted visual transitions. v0.1.4.5 models their software lifecycle explicitly; v0.1.4.5.2 hardens surface-renderer detachment; and v0.1.4.5.3 hardens live-flight/input/prograde multi-frame verification after ascent, but none of these releases claims:

- atmospheric entry heating,
- lift/drag/aerodynamics,
- powered descent guidance,
- terrain collision rigid-body dynamics,
- fuel/mass-flow propulsion,
- re-entry plasma,
- physically integrated surface-to-orbit ascent.

## Surface anomalies

Reality classes remain explicit:

- KNOWN / GEOLOGIC
- SPECULATIVE
- ANOMALOUS
- IMPOSSIBLE / FICTIONAL

Fracture gates, frozen lightning, reverse shadows and chronal shears intentionally need not make physical sense. Their existence in the scene does not mean the Newtonian simulation secretly implements wormholes, anti-light, stationary lightning or time manipulation.

The Gravity Knot is also visual-only in this build: floating stones do not add a hidden local gravity source.

## Existing free-space notes

The v0.1.4.2 free-space anomaly layer remains in `CosmicPhenomenonRegistry`, separate from major gravity bodies. CME weather remains a seeded kinematic cone/front model, not MHD or radiation transport. Scientific overlays remain approximate diagnostic visualizations. FRAME DRIVE remains explicitly fictional spacecraft-only coordinate translation. Its coordinate rate is not Newtonian velocity; normal exit performs an explicitly fictional target-frame velocity match before ordinary spacecraft gravity/integration resumes.

## Surface weather / environment model

Surface weather in v0.1.4.4 is a deterministic presentation model, not atmospheric fluid dynamics. Ordinary event labels describe recognizable environmental appearances; wind speed and temperature offset are seeded UI/visual parameters rather than outputs from Navier–Stokes, radiative-convective or cloud-microphysics solvers.

`Upward Rain`, `Shadow Fog`, `Suspended Lightning` and `Sky Fracture` are intentionally impossible/fictional anomaly-weather classes. They are labeled as such and do not modify gravity, time, causality, player movement or orbital state.

Local weather time advances only while the surface session is actively rendered. Large tab/background hitches are bounded so reopening Safari does not skip an entire event. Celestial N-body time is separate and may advance at surface 1× when unpaused.

The landed spacecraft exterior is a visual proxy. No rigid-body landing gear, mass distribution, aerodynamic entry, fuel, structural stress or terrain collision is solved in this release.

The upgraded surface spacecraft, VTOL plumes, landing glow and ascent/descent motion are presentation only. They do not model thrust mass flow, aerodynamics, rigid-body landing gear loads, terrain contact dynamics or real atmospheric ascent.


## v0.1.4.9.1.1 scientific boundary
No scientific model changes. This release only corrects iPhone Safari planner layout/text sizing and event-list scrolling.

## Portrait layout scientific boundary

Portrait cockpit adaptation changes only presentation geometry and HTML control placement. It does not change camera attitude mathematics, observer position, body state, gravity, time integration, navigation, celestial appearance, environment science, landing state, or save schema.
