# Scientific Notes — Universe Lab v0.1.4

Universe Lab is designed to be explicit about where a model is physical, approximate, artificial, or purely visual.

## Major-body gravity

Live major bodies use Newtonian gravity:

\[
\mathbf a_i = G \sum_{j \ne i} m_j\frac{\mathbf r_j-\mathbf r_i}{|\mathbf r_j-\mathbf r_i|^3}
\]

with SI units and Float64 state. Major bodies are integrated with velocity-Verlet.

This is appropriate for ordinary system-scale orbital mechanics but not for strong-field relativistic trajectories near compact objects.

## Physical comets

v0.1.4 generated comet nuclei are physical Newtonian bodies with finite mass/radius and high-eccentricity orbital states. Their visible tail is not integrated dust or plasma.

The tail renderer:

- points away from the current host-star direction,
- becomes visually more active nearer the star,
- disappears at large star distance.

This captures the most important visual directionality without claiming solar-wind, ionization, sublimation chemistry, radiation pressure or particle-size distribution physics.

## Debris belts and planetary rings

The ring/belt points are **population proxies**. Their radii, thicknesses, gaps and anchoring are generated coherently, but the individual visual particles:

- do not source gravity,
- do not collide,
- do not undergo resonance migration,
- do not exchange angular momentum.

This is a deliberate level-of-detail model for mobile rendering. A later local interaction mode can promote nearby representative chunks into physical objects while leaving the bulk population GPU-only.

## Black holes

A black-hole body stores a Schwarzschild-radius quantity:

\[
r_s = \frac{2GM}{c^2}
\]

but live trajectories remain Newtonian outside a safety guard. v0.1.4 adds substantially richer visuals—accretion particles, photon-ring cues, a pseudo-lensing halo and polar jets—but those are visual approximations.

The renderer is **not** integrating null geodesics, the Kerr metric, relativistic radiative transfer, magnetohydrodynamics, or accretion-disk plasma.

The simulator pauses before the spacecraft enters the configured near-field guard or reaches 10% of light speed rather than presenting invalid Newtonian results as science.

## Neutron stars / pulsars

The live compact star uses a finite 12 km radius and selected mass in Newtonian gravity/collision code. Spin period and magnetic-field strength are metadata for the visual compact-object presentation.

Magnetosphere rings and sweep beams are visualization proxies. The solver does not currently model:

- general relativity,
- frame dragging,
- neutron-star equation of state,
- radiation pressure,
- charged-particle magnetosphere dynamics,
- synchrotron emission.

A propulsion-safe stand-off and a neutron-star near-field model guard are therefore required.

## Stellar corona / prominences

The new corona particles and prominence arcs are visual activity cues. They do not currently feed a physical stellar-wind or CME model.

## Nebular and galactic backdrop

The faint galactic band and nebular haze are distant visual layers. They have no local density, drag, chemistry or navigation collision volume in v0.1.4.

## Spacecraft propulsion

FLIGHT (20 m/s²) and CRUISE (120 m/s²) are explicitly experimental propulsion models. They are physical accelerations inside the simulation, not claims about present-day spacecraft hardware.

BRAKE applies acceleration opposite inertial velocity; it does not erase velocity. APPROACH/MATCH/HOLD remain bounded by selected engine authority.

## Particle laboratory

- Gravity Cloud / Particle Gun: physical **test-particle** models under major-body Newtonian gravity. They do not source gravity.
- Particle Life: artificial continuous-3D cellular-automaton rules.
- Species Forces: artificial local attraction/repulsion rules.

Artificial modes are experiments in emergent behavior, not descriptions of fundamental forces.

## Impacts

Impact energy and momentum telemetry uses reduced-mass center-of-mass quantities. Crater estimates use simplified established scaling relationships and are not hydrocode/finite-element impact simulations.

## Future accuracy path

Useful future upgrades include:

- GR ray-traced black-hole visualization / optional geodesic test-particle mode,
- Barnes–Hut/FMM/WebGPU self-gravity,
- physical solar-wind/comet-tail particles,
- local promotable ring/belt collision chunks,
- magnetic-field-line / charged-particle experiments,
- more explicit Hill/Roche/Lagrange visualization.
