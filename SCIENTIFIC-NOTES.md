# Scientific Model Boundaries — Universe Lab v0.1.3

Universe Lab explicitly distinguishes physical models, approximations, visualization layers, and intentionally artificial experiments.

## Authoritative celestial state

- SI meters, kilograms, seconds.
- Float64 positions/velocities.
- Major-body gravity: mutual Newtonian gravity.
- Major-body integrator: velocity-Verlet.
- Rendering: floating-origin transformed coordinates only.

## Gravity Cloud / Particle Gun

Experiment particles in these modes are physical **test particles**. Their trajectories receive Newtonian acceleration from active major gravity sources:

`a = Σ G M_i (r_i-r) / |r_i-r|^3`.

They do not source gravity. Therefore the cloud is valid for studying trajectories in a prescribed major-body gravitational field, but it is **not** a self-gravitating N-body cloud.

Particle integration currently uses bounded semi-implicit Euler substeps rather than the major-body velocity-Verlet kernel. This is a performance/architecture reference implementation; smaller local time steps and test-particle status make the tradeoff explicit.

Finite-radius contact with a major body deactivates a test particle. Individual micro-impacts do not add mass, craters, heat, or ejecta to the target in v0.1.3.

## Particle Life

Particle Life is not physics. It is a continuous-3D cellular-automaton-inspired rule system layered on moving particle slots.

Neighbor population is approximated using occupancy in a particle's current spatial-hash cell and the 26 adjacent cells. Current survival/birth ranges are chosen to produce useful evolving behavior, not to reproduce canonical 2D Conway Life exactly.

Major-body gravity may optionally act on the moving alive particles, allowing a deliberately hybrid experiment: physical external gravity plus artificial life-state rules.

## Species Forces

Species Forces is explicitly fictional/artificial. Three species use a non-reciprocal local attraction/repulsion matrix. Instead of exact particle-pair interactions, each particle interacts with aggregated species populations at nearby spatial-cell centers.

This changes the microscopic rule and should be understood as a coarse-grained artificial force field. It is designed for emergent experimentation and computational scaling, not molecular or plasma fidelity.

## Spatial-hash approximation

The uniform grid removes the need to inspect all N² particle pairs for local-rule modes. Work depends on occupied nearby cells and bounded species aggregates. Cell size is user-configurable through the neighbor-radius control, so changing it changes both the artificial rule scale and computational workload.

## Warp and numerical resolution

While particle experiments exist, global time warp is capped at 60×. This is a numerical-resolution policy, not a physical law. It prevents the application from advancing high-resolution local rules by huge simulation intervals between visible frames.

## Major-body impacts retained

The v0.1.2.1 impact model remains unchanged: swept finite-radius contact, physical impact-frame momentum/energy telemetry, approximate crater scaling, bounded representative fragments, and visual-only unresolved ejecta.

## Ship retained

FLIGHT/CRUISE propulsion remains declared experimental technology. BRAKE, MATCH, and APPROACH produce bounded acceleration commands integrated by ShipDynamics. No velocity is deleted or spatial position teleported.

## Current limits

v0.1.3 does not claim:

- experiment-particle mutual Newtonian gravity,
- fluid dynamics,
- quantum mechanics,
- plasma/MHD physics,
- particle-particle material collisions,
- atmospheric drag/heating,
- relativistic black-hole trajectories.

Those require dedicated future solvers.
