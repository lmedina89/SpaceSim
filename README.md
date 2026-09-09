# Universe Lab v0.1.0.1 — Mobile GitHub Upload Hotfix

A mobile-first, browser-based 3D scientific sandbox for flying an experimental spacecraft through a seeded solar system and eventually running gravity, collision, fluid, particle, quantum-demonstration, and artificial-life experiments.

This archive is **repository-root ready**: unzip directly into a GitHub repository. There is no wrapper folder required inside the ZIP.

## What v0.1.0.1 includes

- Deterministic seeded single-solar-system generation.
- SI-unit authoritative physics (`m`, `kg`, `s`) using `Float64Array` state.
- Mutual Newtonian gravity for major bodies using a direct solver.
- Velocity-Verlet integration for major celestial bodies.
- 1,000–20,000 minor **test particles** using typed-array state and a single GPU points object.
- Floating-origin rendering: physics keeps astronomical coordinates while the renderer stays spacecraft-local.
- First-person mobile flight with inertial motion, gravitational acceleration, touch look, experimental thrust, and an explicitly fictional damping control.
- Lab spawning of launched asteroids and Newtonian black-hole masses.
- Geometric collision detection plus physically derived collision-energy reporting.
- Local save/load schema v1.
- Performance HUD exposing FPS and physics frame cost.
- Phone-safe GitHub Pages deployment from `main` → `/(root)` with no workflow file required.

## Run it

### GitHub Pages — mobile-safe setup

1. Unzip this archive directly into the root of a GitHub repository.
2. Commit/push the files to `main`.
3. On GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose **main** and **/(root)**, then Save.

This release intentionally contains **no `.github/workflows/*` files**. Some iPhone Git clients authenticate through OAuth without GitHub's special `workflow` scope, and GitHub rejects pushes that create or modify workflow files. Removing the workflow avoids that failure while keeping the app fully deployable as a static GitHub Pages site. QA is run before the release ZIP is packaged.

The app itself is static. Three.js is pinned through an import map to `0.185.0`.

### Local development

ES modules require an HTTP server; do not open `index.html` with `file://`.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Controls

### Phone / tablet

- Drag **LOOK** to rotate the spacecraft view.
- Hold **THRUST** to apply 20 m/s² along the ship's forward vector.
- Hold **DAMP** for the deliberately fictional inertial-damping navigation aid.
- **LAB** opens system generation, time warp, particle count, asteroid launcher, and black-hole spawning.
- **SCIENCE** explains which parts of the current build are physical, approximate, or fictional.
- **HOME** returns the craft to a stable starting neighborhood near the designated landable-world candidate.

### Keyboard

- `W`: thrust
- `S`: damping
- Arrow keys: look

## Scientific integrity

The simulator distinguishes numerical physics from visualization and fictional tools. In particular:

- Newtonian gravity uses the CODATA gravitational constant `G = 6.67430e-11 m³ kg⁻¹ s⁻²`.
- Major bodies mutually gravitate.
- Minor particles currently **do not** gravitate toward one another and do not affect major bodies.
- Black holes currently use Newtonian gravity outside a visualized horizon. General relativity is not claimed.
- Collisions are detected and impact energy is calculated, but crater formation, fragmentation, deformation, fluid response, and explosion propagation are future modules.
- The DAMP control is explicitly non-physical.

See `SCIENTIFIC-NOTES.md` for the full model boundaries.

## Why this architecture

The renderer is not the universe database. Three.js receives spacecraft-relative render coordinates from the simulation. The simulation owns 64-bit world state independently.

That separation lets future versions replace or extend rendering, physics backends, WebAssembly, WebGPU compute, Barnes–Hut gravity, local rigid-body physics, terrain, and fluids without rewriting the universe model.

See `ARCHITECTURE.md`.

## Validation

```bash
npm run qa
```

The QA suite checks repository structure, JavaScript syntax, deterministic seeded generation, momentum balancing, solar gravity at 1 AU, a one-year orbital integration test, and impact-energy calculation.

## Planned next milestones

- **v0.1.1 — Scientific Flight & Instrumentation:** target scanning, orbital telemetry, acceleration vectors, predicted trajectory, physical/visual scale controls.
- **v0.2.0 — Experiment Framework:** richer configurable mass launcher, probe fields, gravity laboratory, reusable experiment serialization.
- **v0.3.x — Collision & Impact Foundation:** continuous collision detection, impact regimes, fragmentation/debris, crater/ejecta models.
- **Later:** Barnes–Hut/FMM gravity path, WebGPU compute, Rust/WASM numerical kernels, selected landable planet cube-sphere terrain, atmosphere, local Rapier rigid bodies, specialized fluid solvers, quantum demonstrations, cellular automata/particle-life modules.
