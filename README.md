# Universe Lab v0.1.2 — Impact, Fragmentation & Explosion Foundation

Universe Lab is a mobile-first scientific sandbox built for GitHub Pages. The current design simulates one deterministic seeded solar system at a time while rendering an effectively unbounded deep-space backdrop. The spacecraft is the observer and experiment platform.

## v0.1.2 headline

This release turns finite-radius contacts between massive simulation bodies into an explicit response pipeline:

1. swept contact detection,
2. impact-frame analysis,
3. material-response classification,
4. bounce / merge / absorb / fragment response,
5. crater estimate for rocky/icy planets and moons,
6. persistent impact records,
7. a small set of real gravitational fragments,
8. visual impact flash / shock ring / ejecta,
9. scientific impact telemetry.

It also replaces the failed v0.1.1.3 planet-lighting-only attempt with a renderer-independent body-color exposure floor. Seeded planet colors must remain visible on iOS WebGPU even when renderer light units or viewing geometry make the stellar contribution very dark.

## Scientific core retained

- SI meters, kilograms, and seconds are authoritative.
- Authoritative positions/velocities use Float64.
- Major gravity sources mutually interact with Newtonian gravity.
- Velocity-Verlet integrates major-body motion.
- Ship flight remains separate from the renderer.
- Trajectory previews clone the current major system and integrate forward.
- High-count minor test particles feel major gravity but do not source gravity.
- Floating-origin rendering prevents astronomical coordinates from being passed directly to Three.js.
- Save schema remains **1**.

## Impact response

### Contact detection

v0.1.2 adds swept relative-motion contact checking. A fast projectile that crosses an entire body between two integration samples can still be detected instead of tunneling through because only endpoint overlap was checked.

### Impact energy

The event uses reduced-mass center-of-mass kinetic energy:

`E = 1/2 μ v_rel²`

with

`μ = m1 m2 / (m1 + m2)`.

The scanner/report also exposes reduced-mass relative momentum and `Q_R = E / (m1 + m2)`.

### Material response

Current material profiles are deliberately compact approximations for porous rock, water ice, basalt, iron-rich bodies, rocky/icy planetary crust, gas giants, stars, and black holes.

Low-speed asteroid contacts can bounce with a material restitution coefficient. Bound low-energy encounters can merge. High-speed projectile impacts can fragment. Stars/black holes are currently absorbing sinks in the response layer.

This is not a fracture-mechanics solver.

### Crater estimate

For solid planets/moons, the transient crater uses the gravity-regime scaling relation associated with Collins, Melosh & Marcus (2005):

`D_tc = 1.161 (rho_i/rho_t)^(1/3) L^0.78 v^0.44 g^-0.22 sin(theta)^(1/3)`

The final simple crater is `1.25 D_tc`. For complex craters, the project applies the published power-law form using an approximate gravity-scaled simple/complex transition diameter. Depth and excavated mass are intentionally coarser approximations and are explicitly identified as such in the scientific notes.

### Fragments

The resolver keeps only a small number of large fragments as full Newtonian gravity sources. This is a performance architecture decision, not a claim that real impacts make only a handful of fragments. Unresolved material is retained in the surviving target's represented mass while dense visual ejecta remains non-authoritative.

This lets a surviving fragment actually leave, fall back, enter another trajectory, or hit something later without turning one impact into hundreds of expensive gravity sources.

## Impact visuals

Impact visuals are presentation driven by the calculated energy and impact normal:

- additive flash,
- expanding shock/ejecta ring,
- directional ejecta points,
- material-colored glow.

They do **not** add forces or mass and therefore cannot contaminate the physics state.

## Persistent damage records

Solid target bodies can now carry `damageRecords` containing:

- simulation time,
- impactor identity/mass/density,
- relative velocity,
- impact angle,
- impact energy and `Q_R`,
- crater estimate,
- impact location/normal,
- largest resolved fragment,
- estimated ejecta escape fraction,
- model disclosure string.

The scanner displays the number of recorded impacts. Future landable terrain can consume the same records to materialize craters on the surface.

## Impact presets

The LAB includes editable starting presets:

- Small Meteor
- Tunguska-ish
- Chicxulub-class
- Moonlet

They only populate mass/density/speed fields. The user can change every value before previewing or launching.

## Planet visibility repair

The `ORIGIN-001` home world **Caelum-4361 d** is generated as a tan desert world (`#c58a50`). It was still nearly black on the user's real iPhone WebGPU path in v0.1.1.3.

v0.1.2 therefore uses two visual layers for non-stellar bodies:

- a normally lit StandardMaterial for directional stellar shading/terminator,
- a faint color-matched exposure shell plus low emissive floor.

The second layer is intentionally visual-only. It prevents generated color from disappearing because of renderer/light-unit behavior while preserving strong day/night contrast.

## Mobile input

The v0.1.1.2 iOS hold-control hardening remains:

- `touch-action:none` on continuous controls,
- pointer capture,
- document-level pointer release fallback,
- lost-pointer/visibility/blur cleanup,
- selection/callout suppression on the simulation surface,
- editable LAB controls exempted.

## GitHub Pages / phone workflow

The release ZIP is repository-root-ready. Do not create a wrapper directory.

Deploy with GitHub Pages:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

The distributable intentionally contains no `.github/workflows/*` files so mobile OAuth clients do not require GitHub's workflow scope.

## Current model boundaries

Not implemented yet:

- hydrocodes or shock-physics continuum solvers,
- arbitrary mesh fracture,
- atmosphere entry/ablation,
- spacecraft structural crash physics,
- persistent visible terrain deformation,
- fluids,
- Barnes-Hut/FMM gravity,
- GR black-hole trajectories/lensing,
- landable terrain.

Those should remain separate modules rather than being hidden inside this impact foundation.

## Run

No build step is required for GitHub Pages. Serve the repository root over HTTP(S); ES modules cannot reliably be tested by opening `index.html` directly from `file://`.

## QA

Run:

```bash
npm run qa
```

See `QA-REPORT.md` for the exact automated checks and remaining physical-device gate.
