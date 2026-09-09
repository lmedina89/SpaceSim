# Universe Lab v0.1.4 — QA Report

## Release identity

- Version: **0.1.4**
- Milestone: **Cosmic Phenomena & Deep-Space Exploration**
- Build marker: **COSMOS-140**
- Save schema: **1**
- Three.js: **0.185.0**
- Deployment: GitHub Pages branch-root
- Workflow files: intentionally absent

## Automated QA

Final command:

```text
npm run qa
```

Result: **63/63 automated tests PASS**, plus static structure checks and `node --check` over all JS/MJS source/test files.

New v0.1.4 coverage includes:

- deterministic physical comets and deterministic local cosmic phenomena,
- debris-belt and planetary-ring generation,
- live phenomenon-anchor position/velocity resolution,
- LAB pulsar/neutron-star physical properties,
- neutron-star propulsion-safe stand-off,
- neutron-star near-field Newtonian validity guard.

Retained suites cover:

- direct Newtonian gravity,
- velocity-Verlet orbital stability,
- generator determinism / barycentric correction,
- trajectory prediction and swept impact,
- impact/crater/fragment behavior,
- fragment cascade suppression,
- physical BRAKE and experimental FLIGHT/CRUISE acceleration,
- APPROACH/BRAKING/CAPTURE/HOLD,
- black-hole propulsion-safe stand-off / model guards,
- adaptive physics substeps,
- observation camera isolation,
- runtime error boundary,
- typed-array particle framework / spatial hash / particle budgets,
- v0.1.3.2.2 app class-method integrity.

## App method integrity

Static audit of `UniverseLabApp`:

- class method definitions: **49**
- unique direct `this.method()` call names: **46**
- unresolved direct method calls: **0**

This retains the regression check created after the v0.1.3.2.1 runtime failure.

## HTML / UI integrity

- HTML IDs: **131**
- unique IDs: **131**
- duplicate IDs: **0**
- direct JS selector IDs audited: **68**
- missing selector IDs: **0**

The static suite additionally requires the COSMOS controls, compact-star controls and `COSMOS-140` marker.

## Local static-host smoke

A local HTTP server returned **200** for:

- `index.html`
- `styles.css`
- `src/main.js`
- `src/app/app.js`
- `src/cosmic/phenomenonRegistry.js`
- `src/cosmic/phenomenonGenerator.js`
- `src/render/cosmicPhenomena.js`
- `src/render/celestialFactory.js`
- `src/render/threeRenderer.js`

## Long-run generated-system stress

Eight deterministic systems were integrated for **30 simulated days each** at **900-second** major-body steps using the direct Newtonian solver and velocity-Verlet integrator.

Sample results:

| Seed | Major bodies | Planets | Moons | Comets | Phenomena | Spontaneous collisions |
|---|---:|---:|---:|---:|---:|---:|
| COSMOS-A | 8 | 5 | 1 | 1 | 2 | 0 |
| COSMOS-B | 18 | 7 | 9 | 1 | 2 | 0 |
| COSMOS-C | 20 | 8 | 10 | 1 | 4 | 0 |
| COSMOS-D | 24 | 9 | 12 | 2 | 4 | 0 |
| COSMOS-E | 11 | 5 | 3 | 2 | 3 | 0 |
| COSMOS-F | 14 | 6 | 6 | 1 | 3 | 0 |
| COSMOS-G | 12 | 6 | 3 | 2 | 4 | 0 |
| COSMOS-H | 19 | 6 | 10 | 2 | 4 | 0 |

- Total spontaneous finite-radius collisions: **0**
- Maximum generated body count in this sample: **24**
- Non-finite position/velocity state: **0**

This is a stability regression, not proof that physical comet impacts can never occur for every possible seed or long timescale.

## Renderer scope checked statically

The static suite requires the expected visual architecture tokens for:

- stellar corona,
- active black-hole accretion disk,
- photon-ring group,
- visual relativistic jets,
- pseudo-lensing halo,
- pulsar beam pivot,
- comet tail,
- cosmic phenomenon `THREE.Points` renderer.

The container environment does not provide a reliable iPhone/WebGPU interactive GPU backend, so these checks do **not** establish real device performance or visual correctness.

## Physical iPhone release gate

The user's physical iPhone Safari test of v0.1.3.2.2 established the current stable baseline: normal scene running at 60 FPS in the shown test, sim time advancing, planet visible, no runtime ERR.

v0.1.4 still requires fresh physical validation because it adds substantial new GPU-visible populations.

Recommended release-gate order:

1. verify **v0.1.4 / COSMOS-140**, no runtime error, sim time advances;
2. COSMOS → scan debris belt/ring → OBSERVE → ORBIT → SHIP VIEW;
3. monitor FPS while framing the 12k debris belt and ring systems;
4. physical RENDEZVOUS to a phenomenon;
5. inspect a generated comet and tail behavior;
6. spawn pulsar and test safe APPROACH/model guard;
7. spawn active black hole and inspect accretion/jet rendering;
8. retest particle experiments and impacts.

Do not treat this QA report as a claim of interactive iPhone performance.
