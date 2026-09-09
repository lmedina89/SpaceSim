# Scientific Model Boundaries — Universe Lab v0.1.1.2

The project is allowed to be strange and mysterious. It is **not** allowed to blur the line between a physical model and a visual/fictional effect.

Every future experiment should identify itself as **physical**, **approximate**, **demonstrative**, or **experimental/non-physical**.

## Units and constants

Authoritative state uses SI units:

- meters,
- seconds,
- kilograms,
- meters/second,
- meters/second²,
- joules.

Newtonian gravity uses `G = 6.67430 × 10⁻¹¹ m³ kg⁻¹ s⁻²`.

The speed of light constant is stored for future relativity work but is not used to claim relativistic integration in v0.1.1.

## Gravity

Major bodies obey mutual Newtonian point-mass gravity:

`a = GM / r²`

with finite radii used for contact detection/visual metadata.

Major states are integrated with velocity Verlet.

Not modeled yet:

- general relativity,
- frame dragging,
- gravitational radiation,
- relativistic time dilation,
- extended-body gravity harmonics,
- tidal deformation.

A black hole is therefore a Newtonian mass with Schwarzschild-radius metadata and a stylized visual representation. Near-horizon motion is not physically trustworthy.

## Seeded systems

Generated systems are deterministic low-eccentricity near-Keplerian initial conditions intended for a stable scientific sandbox.

The generator uses simplified relationships/proxies for stellar luminosity, spectral class, snow line, planetary composition, density, and satellite availability. It does **not** simulate protoplanetary-disk formation or claim observational realism for every generated combination.

The finished initial state is placed in its center-of-mass rest frame.

## Scanner telemetry

Displayed eccentricity, periapsis, apoapsis, circular speed, escape speed, and specific orbital energy are **osculating two-body values relative to the selected target**.

That means they describe the instantaneous conic orbit implied by the current position/velocity if all other gravitational bodies vanished at that instant.

They are useful diagnostics, not an exact forecast in the multi-body system.

## N-body trajectory prediction

The visible path clones every current major gravity source plus the ship/projectile and integrates that cloned system forward under the same Newtonian direct solver and velocity-Verlet integrator.

It is therefore a real numerical forecast under the current model, subject to these boundaries:

- no future pilot thrust unless encoded in the initial state,
- no minor-particle gravity,
- no relativistic corrections,
- no collision response after first predicted contact,
- timestep resolution varies with selected horizon,
- chaotic systems can diverge rapidly with time.

Finite-radius collision prediction uses a swept geometric test between integration endpoints to reduce timestep tunneling.

## Spacecraft

Gravity and inertial translation are Newtonian within the current model.

Configured experimental drive accelerations:

- forward: 20 m/s²,
- reverse: 12 m/s²,
- RCS translation: 6 m/s².

These are idealized accelerations. There is no propellant equation, power budget, thermal model, human acceleration tolerance, or engine mass flow yet.

Yaw/pitch/roll attitude is pilot-controlled directly. Rotational inertia/torque is not yet modeled.

**DAMP is fictional.** It exponentially removes inertial velocity and is retained only as an explicit navigation aid.

## Mass launcher

Projectile radius is derived from spherical volume:

`r = (3m / 4πρ)^(1/3)`

where `m` is configured mass and `ρ` is configured bulk density.

Material presets currently supply representative sandbox bulk densities, not detailed porosity/composition/equation-of-state models.

Once launched, the projectile is a finite-radius major gravity source and can perturb the rest of the system.

## Collision telemetry

For two bodies with relative speed `v` and reduced mass

`μ = m1 m2 / (m1 + m2)`

the center-of-mass kinetic energy is reported as

`E_cm = 1/2 μv²`.

The simulator also reports:

`p_rel = μv`

and the specific impact energy

`Q_R = E_cm / (m1 + m2)`.

These values describe the pre-response collision state. v0.1.1 does not use them to invent crater size, fragmentation, shock propagation, melt, vapor, fire, or ejecta.

## Minor-body field

Minor particles are numerical test masses. They use Float64 state and feel major gravity but do not attract one another, perturb major bodies, collide, or fragment.

This is an explicit scalability tier.

## Future impact science

v0.1.2 should preserve the energy/momentum budget and add response through clearly separated models:

1. collision geometry and relative impact angle,
2. material parameters,
3. fragmentation/merger decision model,
4. physically budgeted fragment velocities,
5. persistent large debris as simulation bodies,
6. high-count visual ejecta as GPU particles,
7. optional crater/ejecta scaling only where the underlying assumptions apply.

## Future fluids

Different scales require different models. A planet-wide ocean should not be represented as billions of SPH particles. Planned candidates include spectral/shader oceans, shallow-water regional solvers, and local PBF/SPH or FLIP/APIC/MPM experiments.

## Future quantum demonstrations

A double-slit experiment must separate classical ballistic particles from a quantum probability-amplitude model. Individual detector events can be sampled from a computed probability distribution; a decorative wave animation alone will never be labeled a quantum simulation.

## Experimental rule systems

Particle life, Conway-inspired moving automata, negative mass, modified force laws, repulsive gravity, and similar tools will be explicitly labeled **EXPERIMENTAL / NON-PHYSICAL** unless they correspond to a recognized physical model.

## v0.1.1.2 motion perception and time warp

The navigation streaks introduced in v0.1.1.2 are explicitly **not physical dust**. The floating-origin renderer keeps the spacecraft near render coordinate zero while authoritative SI coordinates can move by millions of meters. Deep stars are also decorative and extremely distant, so correct motion may provide little immediate parallax. The motion-reference field therefore maps the magnitude/direction of spacecraft inertial velocity to a logarithmically exaggerated local visual cue. It never feeds back into position, velocity, acceleration, gravity, trajectories, collision tests, or saves.

The quick WARP control advances the same scientific simulation clock at 1×, 60×, 600×, or 3,600×. If thrust is held while time is accelerated, the propulsion acceleration is integrated over the corresponding simulated duration. This is a time-compression control, not a hidden velocity multiplier.


## v0.1.1.2 interaction-only hotfix

The iOS hold-input and control-layout changes are presentation/input changes only. They do not alter SI units, engine acceleration magnitudes, gravity, integrator behavior, simulation time, trajectory prediction, impact calculations, or saved scientific state.
