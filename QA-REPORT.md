# Universe Lab v0.1.1.3 QA Report

## Scope
Rendering-only hotfix for stellar illumination/readability, built from v0.1.1.2. Authoritative physics and save behavior are unchanged.

## Automated checks
- `npm run check`: PASS
- `npm test`: PASS — 16/16 tests
- Stellar-render regression: PASS — exposure-normalized positional star light, generated star color propagation, deliberately low ambient light
- JS/MJS syntax checks: PASS
- Static repository structure: PASS
- No `.github/workflows/*` in distributable: PASS
- Repository-root ZIP layout: PASS

## Scientific regression status
Unchanged from v0.1.1.2:
- SI Float64 authoritative state
- direct mutual Newtonian gravity for major bodies
- velocity-Verlet integration
- 20 m/s² forward thrust, 12 m/s² reverse, 6 m/s² RCS
- deterministic seeded generation
- N-body trajectory prediction and swept finite-radius contact prediction
- impact telemetry and save schema 1

## Rendering correction
The old renderer applied point-light distance falloff to already-compressed renderer coordinates. That is not an authoritative photometric model and caused planetary surfaces to appear nearly black. v0.1.1.3 uses an exposure-normalized positional stellar light with zero render-space attenuation. The star's simulated render position still determines the lit hemisphere direction. Night sides retain only a low ambient term and therefore remain intentionally dark.

Absolute stellar irradiance, spectral radiometry, atmospheric scattering, albedo maps, and photometrically calibrated exposure remain future modules.

## Interactive gate
Physical iPhone Safari/GitHub Pages remains the release gate for visual confirmation of day-side color, terminator readability, and night-side darkness.
