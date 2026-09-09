# Architecture — v0.1.0

## Core rule

**The scientific simulation owns the universe. The renderer only draws a local view of it.**

```text
Seed / Saved State
       │
       ▼
Universe Data + Stable Entity IDs
       │
       ├──────────────► Experiment Registry
       │
       ▼
Float64 Authoritative State (SI units)
       │
       ├── Major-body gravity → Direct O(N²), velocity Verlet
       ├── Minor-body field  → Typed arrays, test-particle gravity
       ├── Spacecraft        → Gravity + thrust
       └── Contact monitor   → Geometric impact detection
       │
       ▼
Floating Reference Frame
       │
       ▼
Three.js WebGPURenderer
(WebGPU preferred, WebGL2 fallback)
       │
       └── local meshes + single Points field + visual star shell
```

## Data-oriented state

High-count numerical state uses typed arrays rather than creating one JavaScript object per particle. Major bodies remain readable objects because the count is intentionally small and they carry rich metadata.

### Major bodies

Target scale for the direct solver: <= 128 gravity sources.

A direct all-pairs solver is intentionally used at this scale because it is simple, exact under the Newtonian model, easy to test, and has low structural overhead.

### Minor bodies

The minor asteroid/test-particle field is `Float64Array` position/velocity state with one `Float32Array` render projection. It currently feels gravity from the major sources but does not contribute gravity.

This is the first scalability tier. Future tiers can replace the solver without replacing rendering or save/state architecture.

## Integrator

Major bodies use velocity Verlet. It is second-order and appropriate for conservative position-dependent forces, with much better long-term orbital behavior than naïve forward Euler integration.

Time warp is subdivided so one rendered frame can contain multiple smaller numerical steps. The current maximum physics substep is 300 simulated seconds.

## Coordinates

Authoritative state is SI meters in JavaScript 64-bit floating-point (`Float64Array`).

Rendering uses a floating origin centered on the spacecraft:

```text
renderPosition = (worldPosition - shipWorldPosition) / 10,000,000 m
```

The camera therefore remains numerically near the origin even while authoritative positions can be astronomical.

## Renderer boundary

`src/render/` is the only layer that knows about Three.js. Core physics, generators, experiments, and tests do not import Three.js.

The initial renderer uses `WebGPURenderer`, which can use WebGPU on capable browsers and fall back to WebGL2. Rendering is deliberately replaceable.

## Gravity roadmap

The gravity backend should evolve by body-count regime rather than forcing one algorithm everywhere:

```text
small N        direct all-pairs
larger N       Barnes–Hut octree
very large N   GPU tree / FMM investigation / specialized approximation
visual-only    GPU procedural motion where physical interaction is unnecessary
```

Do not switch away from the direct solver merely because Barnes–Hut is asymptotically better; for small N, tree construction can cost more than the direct calculation.

## Local physics roadmap

Astronomical N-body physics and surface/crash rigid-body physics are separate problems.

Future local frames can activate a WASM rigid-body backend only near spacecraft/surface interactions. This avoids running expensive contact physics for distant celestial bodies.

## Fluid roadmap

There will not be one universal liquid representation.

- Orbital-scale ocean: rendering + large-scale wave model.
- Shallow regional flow: shallow-water solver.
- Local splash/liquid volume: PBF/SPH candidate.
- High-detail impact/deformation research: FLIP/APIC/MPM candidate.
- Ejecta and spray: hybrid ballistic/GPU particles.

All fluid solvers will live behind a fluid-region interface so experiments can select the correct model for the scale.

## Landable planets

Selected worlds, not every generated planet, will gain full surface mode. Planned structure:

```text
planet-local frame
  └── cube-sphere
      └── quadtree LOD
          └── streamed local terrain patches
              ├── local colliders
              ├── atmosphere/weather
              └── local fluid regions
```

## Save strategy

Schema version: `1`.

Seed preserves the procedural base. Current major-body and spacecraft states are snapshot-saved because reproducing an evolved N-body system merely from elapsed time would require replaying the integration. High-count fields can later use deterministic regeneration plus sparse deltas or compressed checkpoints depending on experiment requirements.
