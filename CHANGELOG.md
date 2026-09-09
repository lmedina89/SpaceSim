# Changelog

## v0.1.0.1 — Mobile GitHub Upload Hotfix

- Removed `.github/workflows/pages.yml` from the distributable archive to avoid GitHub OAuth `workflow`-scope rejection in mobile Git clients.
- GitHub Pages deployment now uses **Deploy from a branch → main → /(root)**.
- No physics, rendering, simulation, save-schema, or experiment behavior changed from v0.1.0.

## v0.1.0 — Scientific Universe Foundation

- Established repository-root GitHub Pages package.
- Added deterministic seeded solar-system generator.
- Added SI-unit Float64 authoritative physics state.
- Added direct Newtonian N-body solver and velocity-Verlet integration.
- Added high-count typed-array minor test-particle field.
- Added floating-origin render projection.
- Added Three.js WebGPURenderer front end with WebGL2 fallback capability.
- Added first-person mobile spacecraft flight.
- Added lab asteroid launch and Newtonian black-hole spawning.
- Added contact monitoring and physical collision-energy calculation.
- Added local save schema v1.
- Added automated GitHub Pages QA/deployment workflow.
- Added scientific-model disclosure and architecture documentation.
