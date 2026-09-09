# Scientific Notes — Universe Lab v0.1.4.1.1

## Newtonian state remains authoritative locally

Major bodies and the spacecraft continue to use SI units and Float64 Newtonian state. Velocity-Verlet remains the major-body integrator. Existing compact-object and ≥0.1c local ship-velocity guards remain in force.

## FLIGHT / CRUISE / BOOST

These modes declare a bounded acceleration and integrate it into the spacecraft's Newtonian velocity.

- FLIGHT: 20 m/s²
- CRUISE: 120 m/s²
- BOOST: 5,000 m/s²

BOOST is **fictional/speculative propulsion**. A 5,000 m/s² crewed drive is not presented as current technology or biologically survivable acceleration. Its purpose is to make local vector changes practical in a simulator where the player can accumulate very high inertial velocity.

## TURN & BURN

TURN & BURN is not inertial damping. It computes the component of current velocity perpendicular to the captured nose direction and commands bounded acceleration to reduce that lateral component. The velocity state changes only through the declared acceleration integration.

## PROGRADE / RETROGRADE

These are attitude aids only. They rotate the ship orientation to the positive/negative inertial velocity direction and do not apply thrust.

## TRANSIT

TRANSIT is **explicitly fictional**.

The displayed 1c–1000c rate is a coordinate translation rate used to move the spacecraft reference-frame position through the generated system over real time. It is not added to the Newtonian velocity, is not derived from general relativity, and is not claimed to represent a physically realizable warp drive.

This separation is intentional. It prevents exploration convenience from leaving the spacecraft with an absurd FTL local velocity after transit ends.

The destination envelope is intentionally conservative. It includes a propulsion-safe stand-off and a braking reserve derived from the target-relative local velocity:

\[
d_\text{brake}=\frac{v_\text{rel}^2}{2a}
\]

with additional margin before AUTO CAPTURE hands the state back to bounded BOOST-powered APPROACH.

TRANSIT also uses swept finite-radius safety envelopes against intervening massive bodies. This is a game/simulator safety rule, not a physical warp-field prediction.

## Simulation time warp versus transit

Simulation warp accelerates the amount of **simulated Newtonian time** integrated per real second. TRANSIT instead translates position over real time while the Newtonian simulation clock remains at 1×. The two controls therefore have intentionally different meanings.

## Particle experiment completion

Particle Life, Species Forces and other session-local fields can naturally reach zero active particles. A completed field no longer requires fine-step integration, so keeping a 60× global warp cap would have no numerical justification.

The manager therefore reports an infinite/no particle-specific cap once there are no active experiment particles. The last live spatial bounds are retained only for observation and replay; they do not continue running a hidden simulation.

Particle Life remains an artificial Conway-inspired system, not a physical law. Species Forces remains an artificial interaction rule set.

## Retained model boundaries

- CME fronts: directional kinematic approximation; no MHD/plasma/radiation damage solver.
- Lagrange/Hill/Roche overlays: scientific approximations/instantaneous diagnostics.
- Gravity vectors: derived from live Newtonian sources; arrow lengths are visualized for readability.
- Black-hole graphics: accretion/photon-ring/jet/pseudo-lensing visual proxy; live gravity remains Newtonian outside guard.
- Neutron-star/magnetar graphics: field/beam visual proxy; compact mass remains Newtonian outside guard.
- Belts/rings/remnants/nebulae: GPU visual populations rather than thousands of gravity sources.
