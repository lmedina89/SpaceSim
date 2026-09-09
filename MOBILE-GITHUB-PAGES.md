# Mobile GitHub Pages deployment — Universe Lab v0.1.3

This archive is intentionally **repository-root-ready** and intentionally contains **no `.github/workflows/*` files**.

## Upload from iPhone

1. Extract the ZIP.
2. Copy/upload the extracted contents directly into the repository root. Do not create an extra `UniverseLab-v0.1.3/` wrapper in the repository.
3. Push/commit normally from the mobile Git client.
4. In GitHub repository Settings → Pages choose:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**

The absence of Actions workflow files avoids the mobile OAuth `workflow`-scope rejection encountered during v0.1.0 deployment.

## iPhone release gate for v0.1.3

After deployment, verify:

- HUD reports **v0.1.3** and WebGPU/WebGL2 backend,
- existing LOOK / THRUST / REV / BRAKE long-press controls remain stable,
- APPROACH/MATCH still work and particle fields cap navigation/time warp to 60× while active,
- LAB → Particle Experiments → Gravity Cloud visibly creates one coherent 3D field ahead of the ship,
- 5,000-particle Gravity Cloud remains responsive,
- Particle Life at 2,000 then 5,000 slots evolves without UI lockup,
- Species Forces at 2,000 then 4,000 slots remains usable,
- Particle Gun launches a visible stream in the ship-forward direction,
- CLEAR PARTICLES removes experiment render fields and restores unrestricted manual warp,
- planet colors remain readable and impact/fragment behavior from v0.1.2.1 remains stable.

Use the HUD FPS / PHYSICS / LAB timing values when reporting limits. Physical iPhone performance is authoritative; Node-side timings in QA are only indicative development measurements.
