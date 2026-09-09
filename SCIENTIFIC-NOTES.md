# Scientific Notes — Universe Lab v0.1.4.1

Universe Lab distinguishes live physics, scientific approximations, and visual/artificial proxies.

## Authoritative simulation

Major bodies use SI meters/kilograms/seconds with Float64 position and velocity. Mutual major-body gravity is Newtonian:

\[
\mathbf a_i = G \sum_{j \ne i} m_j\frac{\mathbf r_j-\mathbf r_i}{|\mathbf r_j-\mathbf r_i|^3}
\]

and major bodies are advanced with velocity-Verlet. Strong-field compact-object trajectories are not claimed to be relativistic.

## Rogue planets

A seeded rogue planet, when present, is a real major body with finite mass/radius/position/velocity and Newtonian interaction. The generator places it far from the normal planetary architecture with an interstellar-like velocity. This is a sandbox initial condition, not a stellar-cluster ejection/capture formation model.

The cold visual surface/thermal rim is illustrative. Atmosphere, internal heat, chemistry and climate are not solved.

## White dwarfs and brown dwarfs

LAB white/brown dwarfs use physically interpretable preset masses and radii in the live Newtonian solver.

Their visual temperature/bands/glow are not stellar-evolution calculations. Universe Lab does not currently solve electron degeneracy, mass-radius curves, atmospheric chemistry, convection or spectra.

## Magnetars

LAB magnetars use the existing neutron-star physical model: finite 12 km radius, live Newtonian mass and compact-object safety guard. Spin period and magnetic-field strength are metadata.

Field loops, spark populations and glow are visual proxies. Charged-particle dynamics, pair cascades, magnetic reconnection, burst radiation, QED vacuum effects and magnetohydrodynamics are not implemented.

## Supernova remnants

The seeded remnant is a large visual point shell/filament proxy. It is useful as a scale/exploration object but is not a hydrodynamically evolved ejecta field. Visible points have no individual mass, gas pressure, cooling, chemistry, shock solver or collision behavior.

## Space weather / CME model

A v0.1.4.1 CME is a **directional kinematic propagation model**.

Each event has:

- a stellar anchor,
- launch time,
- propagation speed,
- start radius,
- angular half-width,
- shell thickness,
- inertial direction.

The front radius is

\[
r(t)=r_0+v_{CME}(t-t_0)
\]

and the ship crossing test requires both angular inclusion inside the cone and radial intersection with the swept front between simulation steps. Swept detection is important because accelerated simulation can move a front hundreds of thousands of kilometers during one physics substep.

This supports meaningful travel/arrival-time measurements, but it is **not MHD**. The simulator does not currently model:

- magnetic topology/reconnection,
- solar energetic particle spectra,
- radiation dose,
- plasma density/temperature evolution,
- bow shocks,
- geomagnetic storms,
- spacecraft charging or hardware damage.

## Lagrange points

L1/L2 use the small-secondary circular restricted-three-body distance scale near the secondary. L3 uses a first-order circular approximation. L4/L5 use instantaneous equilateral geometry in the plane inferred from current relative position/velocity.

These markers are **diagnostics**, not promises of long-term stability in the full multi-body evolving system.

## Hill sphere

For primary mass \(M\), secondary mass \(m\), semi-major axis \(a\) and eccentricity \(e\), the displayed diagnostic is

\[
r_H \approx a(1-e)\left(\frac{m}{3M}\right)^{1/3}.
\]

This is a useful approximate gravitational sphere-of-influence scale, not an exact boundary.

## Roche limit

The overlay uses the fluid Roche-limit form

\[
d \approx 2.44 R_p\left(\frac{\rho_p}{\rho_s}\right)^{1/3}
\]

with a displayed/reference satellite density of 3,000 kg/m³. It is an estimate; rigidity, rotation, shape and internal strength can substantially change disruption behavior.

## Gravity-vector field

The local 25-point field samples the actual current Newtonian major-body source set and therefore reflects the same instantaneous mass/position state used by the live gravity solver. Vector display lengths are normalized for visibility rather than representing literal meter lengths.

## Orbital plane

The target orbital plane is inferred from instantaneous relative position \(\mathbf r\) and velocity \(\mathbf v\), using angular momentum direction \(\mathbf h=\mathbf r\times\mathbf v\). The drawn ring uses current separation as its display radius; it is a plane/context visualization rather than a predicted closed orbit.

## Existing black holes and neutron stars

Black holes retain Schwarzschild-radius metadata, Newtonian live gravity outside the guard, and visual accretion/photon-ring/jet/lensing cues. Neutron stars/pulsars/magnetars retain live Newtonian mass/radius and visual field/beam proxies.

The simulator pauses near the configured compact-object guard or at ≥0.1c ship speed rather than presenting obviously invalid Newtonian output as adequate strong-field science.

## Mobile level-of-detail principle

Large populations—belts, rings, remnants, CMEs, accretion particles—are rendered as bounded GPU point populations rather than becoming thousands of mutual gravity sources. This separation is intentional and is required for iPhone-scale performance.
