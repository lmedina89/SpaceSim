# Universe Lab v0.1.4 — Cosmic Phenomena & Deep-Space Exploration

Universe Lab is a mobile-first scientific/experimental space sandbox built for static GitHub Pages. One deterministic seeded system is simulated at a time with authoritative SI-unit state, Float64 positions/velocities, direct Newtonian gravity for major bodies, velocity-Verlet integration, floating-origin rendering, and a Three.js 0.185.0 WebGPU renderer.

**Build marker:** `COSMOS-140`  
**Save schema:** 1  
**Deployment:** GitHub Pages → `main` → `/(root)`  
**Mobile release gate:** physical iPhone Safari testing

v0.1.4 deliberately improves the *space between the planets* before the landable-planet milestone. The system can now contain physical comets, structured debris belts, planetary ring systems, richer stellar activity, high-detail active black-hole visuals, and LAB-spawned neutron stars/pulsars. A new COSMOS explorer gives those phenomena a discovery and observation workflow.

## New in v0.1.4

### COSMOS explorer and discovery

The new **COSMOS** panel lists seeded local phenomena. Sources initially appear as **UNIDENTIFIED SOURCE** until **SCAN SOURCE** classifies them. After discovery the panel exposes the generated type, characteristic radius, anchor body, and scientific-model status.

Controls:

- **SCAN SOURCE** — reveal classification/model information.
- **OBSERVE** — massless FRAME camera centered on the phenomenon.
- **ORBIT VIEW** — orbit the massless camera around the phenomenon.
- **NEXT SOURCE** — cycle through local phenomena.
- **RENDEZVOUS** — physically fly the spacecraft toward the phenomenon using bounded-thrust navigation.
- **SHIP VIEW** — return instantly to the real spacecraft without changing ship state.

Phenomena anchored to a planet or star follow that live body's Float64 position/velocity instead of storing a frozen generation coordinate.

### Physical comets

Every seeded system now contains one or two deterministic high-eccentricity comet nuclei. The nucleus is a real major body:

- finite physical radius,
- finite mass from generated bulk density,
- high-eccentricity Newtonian orbit,
- participates in direct major-body gravity,
- can collide through the existing finite-radius collision system.

The visible dust/ion-style tail is a **rendering proxy**, not a dust/plasma solver. It points away from the current host-star direction and its visible activity changes with star distance.

### Asteroid / debris belts

Each system contains a deterministic circumstellar debris belt, usually placed into a useful gap between generated planets. The belt is represented by **12,000 seeded GPU-visible points in one Points draw call**.

Those visible points are population proxies only: they do not individually source gravity or participate in collisions. This is intentional so a mobile device can show a rich belt without turning 12,000 rocks into direct N-body gravity sources.

### Planetary ring systems

One to three planets receive deterministic ring phenomena. Ring systems use approximately **4,000–7,000 visual particles per ring system**, with radial structure/gaps and live attachment to the host planet.

Again, the particles are a visual population model in this release, not individually integrated ring rocks.

### Richer stars

Stars now include a visual corona, moving prominence arcs, and the existing generated stellar color. These effects are rendering layers and do not yet model magnetohydrodynamics, stellar wind, or flare radiation physically.

### Active black-hole renderer

LAB black holes keep their live Newtonian mass and Schwarzschild-radius metadata, but the old simple ring presentation has been replaced by a substantially richer real-time visual proxy:

- black event-horizon core,
- six photon-ring-style layers,
- about **5,200 seeded accretion-disk particles**,
- radial temperature/color gradient,
- static approaching-side brightness cue,
- layered disk rings,
- dual polar-jet cones,
- about **1,500 jet particles**,
- pseudo-lensing halo/glow.

This is **not** a GR ray tracer and **not** a plasma/MHD solver. Near-field black-hole trajectories remain outside the validity of the Newtonian live model, so the existing model guard pauses before the simulator presents that regime as valid physics.

### Neutron stars and pulsars

LAB can now spawn a live compact star with configurable:

- neutron-star / pulsar type,
- 1.05–2.35 solar masses,
- 12 km physical radius,
- spin period,
- magnetic-field metadata.

Their mass/radius participate in live Newtonian gravity and collision code. The visible magnetosphere rings and pulsar sweep beams are visualization proxies.

APPROACH now includes a neutron-star propulsion-safe stand-off, and the Newtonian model guard blocks near-surface compact-object flight where relativistic physics would be required.

### Deeper space backdrop

The seeded sky now has the original starfield plus a faint galactic-band population and several low-opacity nebular haze sprites. These are distant visual backdrop only; they are not local gas volumes or navigation bodies.

## Retained scientific flight and navigation

- **FLIGHT:** 20 m/s² experimental main thrust.
- **CRUISE:** 120 m/s² experimental main thrust.
- **BRAKE:** bounded thrust opposite inertial velocity; no hidden velocity deletion.
- **MATCH VELOCITY:** physically reduces target-relative velocity.
- **APPROACH:** braking-safe bounded-thrust guidance.
- **CAPTURE → HOLD:** maintains stand-off and target-relative velocity instead of dropping guidance at arrival.
- strong gravity adaptively reduces physics substep size.
- black-hole / neutron-star near-field guards and the 10% of c Newtonian speed guard pause the model instead of silently continuing into invalid physics.

Time warp is a simulation-time tool, not a gas pedal. Active local particle experiments continue to cap warp at 60×.

## Retained v0.1.3 particle laboratory

The reusable typed-array particle framework remains intact:

- **Gravity Cloud:** up to 30,000 physical test particles affected by major-body Newtonian gravity; they do not source gravity.
- **Particle Life:** up to 6,000 artificial continuous-3D Conway-inspired particles.
- **Species Forces:** up to 4,000 artificial short-range species-interaction particles.
- **Particle Gun:** 10–5,000 luminous ballistic test particles.
- global experiment budget: 40,000 particle slots.
- typed-array spatial hash for neighbor modes.
- one Three.js `Points` draw call per particle field.
- experiment FRAME/TRACK/ORBIT observation and physical RENDEZVOUS.

Particle experiments remain session-local and are deliberately not written into save schema 1.

## Impact foundation retained

The impact system still includes swept finite-radius collision detection, reduced-mass impact telemetry, crater scaling, bounce/merge/absorb/fragment response, persistent damage records, a maximum of two primary resolved fragments per impact, and recursive fragment-family suppression.

## Scientific boundaries

Universe Lab labels three different categories rather than mixing them:

1. **Live physical model** — SI/Newtonian state actually integrated by the simulation.
2. **Approximate scientific model** — established simplified relations such as crater scaling or osculating two-body telemetry.
3. **Visual / artificial proxy** — accretion disks, magnetosphere beams, debris populations, nebular backdrop, Particle Life, Species Forces, etc.

v0.1.4 does not claim general relativity, magnetohydrodynamics, radiative transfer, full comet-tail plasma physics, or individually integrated ring/belt populations.

## Mobile testing order

After deployment, first confirm the HUD says **v0.1.4** and **COSMOS-140** and runs normally. Then:

1. Open **COSMOS**, scan the debris belt and a ring system.
2. Try **OBSERVE** and **ORBIT VIEW**, then **SHIP VIEW**.
3. Use **RENDEZVOUS** on a phenomenon and verify the spacecraft uses physical guidance.
4. Find a generated comet and watch its tail orientation/activity.
5. LAB → spawn a **Pulsar**, but do not manually dive through its surface; test SCAN/APPROACH and confirm the compact-object safety behavior.
6. LAB → spawn an **Active Black Hole** and inspect the new accretion/photon-ring/jet rendering from a safe distance.
7. Finally retest particle experiments and impacts to catch regressions.

Automated QA cannot establish real iPhone WebGPU frame rate or thermal behavior; physical device testing remains the release gate.

## Next roadmap

If v0.1.4 is stable on-device, the next cosmic pass can add magnetars, white dwarfs/brown dwarfs, rogue planets, supernova remnants, Lagrange/Hill/Roche overlays, gravity-field visualization, richer comet populations and more discovery events. The **first landable planet** milestone is intentionally postponed until the surrounding universe feels worth exploring.
