# Scientific Notes — Universe Lab v0.1.4.2

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

## Stellar rendering and perceptual LOD

The v0.1.4.1.2 stellar pass is a **presentation model**, not a stellar-atmosphere solver. It improves scientific readability and scale cues without claiming magnetohydrodynamic or radiative-transfer fidelity.

The star is rendered as several visual layers: photosphere, animated procedural granulation, view-facing limb darkening, additive corona, thin prominence filaments, active regions and rare flare proxies. These layers are seeded from the generated body identity so a regenerated system remains visually stable for the same seed.

Distance handling follows a **perceptual preservation** rule rather than a simple FX cutoff. Tiny/sub-pixel surface detail can fade or simplify, while large luminous phenomena such as prominences, active regions, flares and CME fronts remain available at long range when they are visually significant. The goal is to avoid both aliasing noise and the unscientific impression that large stellar structures suddenly cease to exist when the camera moves away.

Close to a star, camera exposure and deep-space background intensity adapt gradually to the star's apparent angular size. This is a visual camera response only; it does not alter luminosity, temperatures, forces, or any simulated body state.

Prominences and flare sites are visual proxies. Their geometry, timing and motion are not derived from a magnetic-field or plasma simulation. CME fronts likewise remain the existing kinematic space-weather approximation; this release only preserves their macro visibility across a wider range of viewing scales.

## Close stellar approach cues

When a selected star is within 25 stellar radii, the target HUD can report the camera/ship position in stellar radii (R★) and label broad presentation zones such as STELLAR VICINITY, INNER CORONA, LOW CORONA and PHOTOSPHERE. These labels are navigation/visualization aids rather than a calculation of a real star's dynamically varying atmospheric boundaries.

The renderer also adapts the camera near clipping plane close to finite-radius body surfaces. This reduces rendering intersections during extreme approaches; it does not relax collision, model-limit, or strong-gravity safety rules.

## Transit arrival presentation

The TRANSIT streak/FOV cue now releases smoothly after coordinate transit ends instead of visually snapping to zero on the capture frame. This decay changes render-only state. The spacecraft's Newtonian position and velocity handoff remain governed by the same transit arrival envelope and BOOST-powered physical APPROACH logic described above.


## Discovery/anomaly truth labels — v0.1.4.2

The anomaly layer intentionally goes beyond strict realism. This is a creative exploration feature, not an attempt to disguise fictional effects as established science. Discovered sources are labeled as modeled/catalogued, speculative, anomalous, or impossible/fictional.

Anomaly visuals do not add hidden mass, modify the Newtonian force solver, bend simulation time, teleport the spacecraft, or create real wormhole/quantum/causal behavior. The labels and `scientificStatus` text are part of the model boundary.

The SYSTEM MAP is a logarithmically compressed X/Z interface projection. It is useful for navigation/discovery but is not a metric-space or relativistic map.

Space-weather persistence changes chronology/save behavior only; the CME model remains a kinematic cone/front approximation without MHD, radiation transport, reconnection, hardware damage or biological dose.
