# Scientific / Model Notes — Universe Lab v0.1.4.3.1

Universe Lab deliberately mixes physically motivated simulation with clearly labeled speculative/fictional presentation. The boundary matters more as planetary surfaces and anomalies are introduced.

## Authoritative orbital model

- SI units / Float64 state.
- Direct Newtonian gravity for registered major gravity sources.
- Velocity-Verlet major-body integration.
- Finite radii and existing impact handling.
- Existing strong-gravity adaptive-step and 0.1c Newtonian validity warnings remain.

## Surface foundation model status

The Shatterfall Basin surface is **procedural presentation**, not a geophysical solver.

Modeled/derived quantities include a Newtonian surface-gravity estimate from the live planet mass/radius and a simple equilibrium-temperature proxy using stellar luminosity/orbital distance. The atmosphere value is explicitly labeled an `atm PROXY`; it is not a chemistry or radiative-transfer solution.

Terrain is deterministic seeded noise plus large-form crater/ridge/basin functions. Frost, ember, glass and mineral subzones are visual/environmental classifications rather than simulated phase chemistry.

While landed, orbital N-body time is intentionally held. This prevents hidden system evolution and avoids pretending that local EVA time and high-warp orbital integration have already been reconciled into a multi-scale simulation architecture.

## Landing / takeoff boundary

`LAND / DESCEND` and `TAKEOFF / ORBIT` are scripted transitions. v0.1.4.3 does not claim:

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

The v0.1.4.2 free-space anomaly layer remains in `CosmicPhenomenonRegistry`, separate from major gravity bodies. CME weather remains a seeded kinematic cone/front model, not MHD or radiation transport. Scientific overlays remain approximate diagnostic visualizations. TRANSIT remains explicitly fictional coordinate translation while local spacecraft velocity remains Newtonian.
