# Scientific Model Boundaries — Universe Lab v0.1.2.1

Universe Lab intentionally separates authoritative physical state from visual effects and from experimental/fictional controls.

## Authoritative numerical state

- Units: SI meters, kilograms, seconds.
- Position/velocity: Float64.
- Major-body gravity: Newtonian point/spherical-body gravity outside finite-radius collision handling.
- Major-body integrator: velocity-Verlet.
- Minor test particles: feel major gravity but contribute no gravity.
- Rendering: floating origin + compressed Three.js coordinates; render coordinates are never authoritative.

## Collision detection

A finite-radius body pair collides when the center separation reaches the sum of radii. v0.1.2 performs both endpoint overlap and swept relative-segment testing over one physics substep. Swept testing substantially reduces high-speed tunneling but does not replace a fully adaptive continuous collision solver for all curved trajectories.

## Impact energy

For two bodies with relative speed `v`, reduced mass `μ` is

`μ = m1 m2 / (m1 + m2)`

and center-of-mass kinetic energy is

`E_cm = 1/2 μ v²`.

`Q_R = E_cm / (m1 + m2)` is retained because it is useful for disruption-regime comparisons. For small projectiles striking large planets, `Q_R` is deliberately not used by itself to decide whether a visible crater-forming event exists; projectile-specific energy and impact speed are also considered.

## Impact angle

The UI reports 90° for a locally normal/head-on impact and 0° for a grazing impact. This convention matches the `sin(theta)` form used by the crater relation in this release.

## Crater scaling

For solid target bodies v0.1.2 uses the gravity-regime transient-crater expression quoted in literature using Collins, Melosh & Marcus (2005):

`D_tc = 1.161 (rho_i/rho_t)^(1/3) L^0.78 v_i^0.44 g^-0.22 sin(theta)^(1/3)`

where all quantities are SI and `L` is projectile diameter.

Simple final diameter uses approximately `1.25 D_tc`.

For complex craters the code uses

`D_f = 1.17 D_tr^1.13 / D_c^0.13`

and currently estimates `D_c` by inverse surface-gravity scaling anchored at ~3.2 km for Earth gravity. That transition estimate is a deliberate simplification. Depth uses ~0.20 final diameter for simple craters and ~0.10 for complex craters; these are coarse morphology proxies, not detailed collapse calculations.

References consulted for this implementation:

- Collins, Melosh & Marcus (2005), Earth Impact Effects Program scaling relations.
- Lunar and Planetary Institute impact-cratering educational/modeling material describing crater dependence on impactor size, velocity, density, target properties, gravity, and simple/complex morphology.
- Holsapple/Schmidt impact-scaling literature for the general distinction between gravity and strength regimes.

The simulator does not claim hydrocode fidelity. Real crater formation includes shock propagation, melting/vaporization, strength, porosity, target layering, phase changes, collapse, and ejecta dynamics that this release does not solve.

## Material response classification

The current bounce/merge/fragment thresholds are engineering heuristics wrapped around physical momentum/energy variables. They are not empirically calibrated universal fragmentation laws.

- Bounce: low-speed asteroid-like encounters with restitution.
- Merge: low-energy/bound inelastic encounter.
- Fragment: crater-forming planetary impact or energetic projectile disruption.
- Absorb: current treatment for star/black-hole contact.

These response modes are intentionally isolated in `src/physics/impactResolver.js` so future calibrated fragmentation models can replace them without changing detection, rendering, or save architecture.

## Fragment mass accounting

Only a bounded number of representative large fragments becomes authoritative gravity sources. v0.1.2.1 permits at most two from a primary event, uses a separate 16-fragment global budget, suppresses same-family recursive collisions, and generates no new resolved gravity fragments from secondary fragment impacts. For planet/moon impacts, resolved fragments receive at most about 8% of projectile mass. The surviving target accretes the unresolved remainder, keeping represented gravitational mass conserved in the current approximation.

The visual ejecta particle field has no independent mass. It is a visual proxy for unresolved debris and must never be interpreted as additional material on top of the authoritative mass budget.

## Planet visibility / exposure floor

The v0.1.1.3 point-light adjustment did not make body colors reliably readable on the tested iPhone WebGPU path. v0.1.2 therefore adds a faint body-color exposure floor (emissive term plus transparent basic-color shell) underneath/around the physically shaded surface material.

This is explicitly a visualization/exposure model. It does not represent planetary self-emission, and it does not feed any physical calculation. Stellar direction still determines the StandardMaterial's directional day/night illumination.

## Black holes

Black-hole gravity remains Newtonian. Schwarzschild radius metadata is calculated, but trajectories, accretion visualization, and contact behavior are not general relativity.

## Ship

Main/reverse/RCS accelerations are declared experimental propulsion parameters. FLIGHT mode provides 20 m/s² main acceleration; CRUISE mode provides 120 m/s². The old fictional DAMP velocity deletion is removed. BRAKE, MATCH VELOCITY, and APPROACH instead generate bounded acceleration commands that are integrated by the spacecraft solver. APPROACH/MATCH may automatically change simulation time scale between 600×, 60×, and 1× for usability and braking resolution; this advances simulated time rather than multiplying spatial motion. Guidance completion or manual override returns time scale to 1×. Celestial impact response still does not provide detailed spacecraft structural crash mechanics.

## Future scientific upgrades

Candidate upgrades include:

- adaptive collision substeps / stronger continuous collision detection,
- calibrated catastrophic-disruption `Q*_RD` models,
- atmospheric entry, drag, heating and fragmentation,
- local rigid-body spacecraft collision solver,
- Barnes-Hut/FMM or GPU gravity for much larger source counts,
- fluid solvers,
- terrain crater materialization,
- GR-specific black-hole module.
