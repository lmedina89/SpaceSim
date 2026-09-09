# Changelog

## v0.1.4 — Cosmic Phenomena & Deep-Space Exploration

Built directly from v0.1.3.2.2 after physical iPhone Safari confirmed the runtime-recovery build was healthy at 60 FPS in the tested normal scene.

### Cosmic exploration

- Added data-driven `CosmicPhenomenonRegistry` and deterministic phenomenon generator.
- Added new **COSMOS** drawer with unclassified sources, scan/classification, characteristic radius, anchor body, scientific status, OBSERVE, ORBIT, NEXT SOURCE, physical RENDEZVOUS and SHIP VIEW.
- Cosmic observation is massless and does not alter the spacecraft.
- Phenomena resolve current positions/velocities from their live anchor bodies.

### Physical comets

- Added `BODY_KIND.COMET`.
- Seeded systems now generate 1–2 finite-radius, finite-mass, high-eccentricity Newtonian comet nuclei.
- Comets participate in existing direct major gravity and finite-radius collisions.
- Added a seeded visual tail that points away from the host star and scales visible activity with star distance.

### Large visual populations

- Added a deterministic ~12,000-point circumstellar debris-belt proxy.
- Added deterministic 4,000–7,000-point planetary ring proxies; 1–3 ring systems may appear depending on the seed.
- Each phenomenon is rendered in a single `THREE.Points` object rather than thousands of Three.js entities.
- Belt/ring points are explicitly not individual gravity or collision bodies.

### Stellar presentation

- Added ~1,600-point corona visual population.
- Added animated stellar prominence arcs.
- Added faint seeded galactic-band points and low-opacity nebular backdrop sprites.

### Active black-hole visual overhaul

- Replaced simple black-hole rings with a richer active-accretion proxy:
  - black core,
  - six photon-ring-style layers,
  - ~5,200 accretion particles,
  - radial hot/cool color gradient,
  - layered disk rings,
  - dual polar jet cones,
  - ~1,500 jet particles,
  - pseudo-lensing halo.
- Live mass remains Newtonian; visuals are not a GR ray tracer or plasma simulation.

### Neutron stars / pulsars

- Added `BODY_KIND.NEUTRON_STAR`.
- LAB can spawn a 1.05–2.35 M☉ compact object with 12 km physical radius, selected spin period and magnetic-field metadata.
- Added magnetosphere rings and optional rotating pulsar beams as visual proxies.
- Added neutron-star propulsion-safe stand-off and near-field Newtonian model guard.

### Renderer / navigation

- Added cosmic-phenomenon renderer synchronization.
- Enlarged render-camera far plane for multi-AU observation framing.
- Generalized observation state so particle experiments and cosmic phenomena share the massless-camera framework without changing SHIP VIEW.
- Physical cosmic RENDEZVOUS uses bounded-thrust navigation rather than camera teleportation.

### Retained

- v0.1.3.2.2 particle-warp runtime recovery and class-method integrity QA.
- v0.1.3.2 observation navigation.
- v0.1.3.1 strong-gravity APPROACH/CAPTURE/HOLD safety.
- v0.1.3 particle experiment framework.
- v0.1.2.1 impact stability / fragment-cascade suppression.
- save schema 1, Three.js 0.185.0, branch-root GitHub Pages deployment.

### QA

- 63/63 automated Node tests pass.
- static structure and JS/MJS syntax checks pass.
- `UniverseLabApp`: 49 class methods, 46 direct `this.method()` call names, zero unresolved methods.
- HTML audit: 131 IDs, 131 unique, zero duplicate; 68 direct JS selector IDs, zero missing.
- static local HTTP smoke: 200 for shell/CSS/main/app/cosmic registry/cosmic generator/cosmic renderer/celestial factory/Three renderer.
- 8 seeded systems integrated for 30 simulated days at 900 s steps: zero spontaneous finite-radius major-body collisions; maximum generated body count 24 in this sample.
- Physical iPhone Safari remains the performance/release gate for the new GPU populations and compact-object visuals.

## v0.1.3.2.2 — Particle Warp Runtime Recovery Hotfix

Restored the missing `enforceParticleWarpSafety()` class method after the runtime error was captured on physical iPhone Safari. Added class-method integrity QA so direct `this.method()` calls cannot be satisfied merely by a call-site token.
