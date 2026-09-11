# Scientific / Model Notes — Universe Lab v0.1.4.7

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
