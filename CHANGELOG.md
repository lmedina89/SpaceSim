# Changelog

## v0.1.4.1 — Extreme Objects, Space Weather & Scientific Overlays

Built directly from v0.1.4 Cosmic Phenomena & Deep-Space Exploration without changing save schema, Three.js version, core Newtonian solver, particle budgets, impact policy or bounded-thrust navigation.

### Extreme objects

- Added `BODY_KIND.WHITE_DWARF`, `BODY_KIND.BROWN_DWARF` and `BODY_KIND.ROGUE_PLANET`.
- Added LAB `spawn-extreme-star` experiment with Magnetar, White Dwarf, Brown Dwarf and Rogue Planet presets.
- Magnetar uses the existing neutron-star physical kind/guard plus high-field metadata and a new visual lobe/spark treatment.
- Added distinct white-dwarf, brown-dwarf and rogue-planet render treatments.
- Rogue planets are treated as planet-like rocky targets by impact material/crater logic.

### Seeded exploration

- Generated systems now have a deterministic chance to include one distant physical rogue planet.
- Added deterministic `supernova-remnant` COSMOS source with ~8,500 GPU point shell/filament proxy.
- Rogue planets are also registered as COSMOS phenomena when generated, so they can begin unclassified and use SCAN/OBSERVE/RENDEZVOUS.
- Free-space cosmic phenomena now render from their own position instead of requiring an anchor body.

### Space weather

- Added session-local `SpaceWeatherManager`.
- Added manual and automatic directional CME generation.
- CME fronts have explicit speed, half-angle, launch time, expanding radius and live stellar anchor position.
- Added swept radial-front crossing detection so large simulation substeps cannot skip over a ship crossing.
- COSMOS drawer exposes active front count, next seeded event countdown, active-front telemetry, TRIGGER CME and AUTO WEATHER toggle.
- Added GPU-friendly ~2,600-point directional CME front/cone rendering per active event.
- CME model is explicitly kinematic only; no MHD/radiation/damage model is claimed.

### Scientific overlays

- Added `cosmic/scientificOverlays.js` pure diagnostic math:
  - Hill radius,
  - Roche limit,
  - instantaneous L1–L5 estimates,
  - live Newtonian gravity acceleration,
  - local gravity-vector samples,
  - instantaneous orbital-plane basis.
- Added MORE → OVERLAYS drawer.
- Added target-centric overlay renderer for Lagrange markers, Hill/Roche rings, orbital plane and 25-point local gravity-vector field.
- Overlay master is off by default and render geometry refresh is throttled to reduce mobile allocation churn.

### Safety / compatibility

- Save schema remains 1.
- Space-weather events, overlay settings and discovery state are session-local.
- Existing black-hole/neutron-star near-field and 0.1c Newtonian guards remain.
- Existing normal SHIP VIEW render isolation and visible runtime-error boundary remain.
- Existing v0.1.4 particle, impact, cosmic observation and mobile input architecture remains intact.

### QA

- Added scientific-overlay math tests.
- Added extreme-object preset tests.
- Added CME propagation, directional crossing, automatic scheduling and swept-front crossing tests.
- Existing cosmic tests now require a deterministic supernova-remnant phenomenon and verify rogue-planet phenomenon/body consistency.
- Full automated suite: see `QA-REPORT.md`.
