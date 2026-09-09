# Scientific Model Boundaries — v0.1.0

The project should be visually mysterious without being scientifically dishonest. Every simulation module must identify whether it is **physical**, **approximate**, **demonstrative**, or **fictional**.

## Physical constants and units

Authoritative quantities use SI units.

- Length: meter
- Time: second
- Mass: kilogram
- Velocity: meter/second
- Acceleration: meter/second²
- Energy: joule
- Gravitational constant: `6.67430 × 10⁻¹¹ m³ kg⁻¹ s⁻²`
- Speed of light constant is stored for future relativistic modules, but v0.1.0 does not integrate relativistic motion.

## Gravity

For two bodies, v0.1.0 implements:

`a = G M / r²`

Major gravity sources mutually interact using a direct pair solver. Positions and velocities are advanced with velocity Verlet.

### Not yet modeled

- General relativity
- Frame dragging
- gravitational radiation
- relativistic time dilation
- true black-hole geodesics
- tidal deformation
- extended-mass gravitational fields

A spawned black hole therefore behaves as a Newtonian point mass for trajectories. Its Schwarzschild radius is calculated for metadata/visual scale, but the renderer is not claiming to show a GR-correct event horizon.

## Procedural systems

Seeds generate plausible sandbox initial conditions, not catalog-quality astrophysical system formation. Circular/near-circular orbits are deliberately favored to give stable, understandable starting systems.

The generated planet taxonomy and appearance are gameplay/sandbox metadata. Their orbital dynamics use physical mass, distance, and velocity values.

## Minor-body field

Minor bodies are test particles. They:

- have 64-bit positions/velocities,
- are accelerated by major gravity sources,
- are numerically integrated,
- are rendered in one high-count point field.

They do **not** currently:

- attract one another,
- perturb planets,
- collide with one another,
- fragment.

This is a deliberate performance/scalability boundary, not an accidental omission.

## Spacecraft

Gravity and inertial velocity are physical under the Newtonian model. The default experimental thruster applies 20 m/s² while held.

The `DAMP` control is explicitly fictional. It exponentially reduces velocity and exists to make early mobile navigation usable before a more complete propulsion/autopilot layer is built.

## Collision energy

When two finite-radius major bodies overlap, the simulator records relative velocity and estimates center-of-mass kinetic energy using reduced mass:

`E = 1/2 μ v²`

where `μ = m1 m2 / (m1 + m2)`.

No crater size, shock propagation, deformation, melting, vaporization, atmosphere response, ocean response, or fragmentation is claimed yet.

## Future impact modeling

A scientifically grounded impact pipeline should combine:

1. real pre-impact trajectory,
2. relative impact velocity and angle,
3. projectile/target material model,
4. accepted impact-scaling relations,
5. localized numerical simulation where worthwhile,
6. physically seeded debris/ejecta particles,
7. rendering that visualizes rather than invents the underlying energy budget.

## Quantum demonstrations

Future double-slit and related experiments must distinguish classical particle trajectories from quantum probability-amplitude demonstrations. A visually pleasing particle animation is not, by itself, a quantum simulation.

## Artificial rules

Conway-inspired particle life, negative mass, repulsive gravity, altered force laws, time fields, and similar sandbox rules will be labeled **EXPERIMENTAL / NON-PHYSICAL** unless they are implementing a recognized physical model.
