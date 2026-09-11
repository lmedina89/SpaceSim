# Universe Lab v0.1.5.2 — Multi-World Exploration iPhone Gate

Before physically accepting `SURFEXP-152` on iPhone Safari/WebKit:

1. Hard reload and confirm **v0.1.5.2**, build **SURFEXP-152**, and **WebGL2 iOS**.
2. **Regression first:** land on **Caelum-4361 d**. Confirm the familiar terrain/weather, save/load, PAUSE/RESUME SKY and takeoff behavior remain normal.
3. Revisit **Caelum-4361 f-A**. Confirm the accepted airless reference behavior: black daylight sky, no fog/wind/weather, low gravity, save/load and safe local-orbit takeoff.
4. Travel to **Caelum-4361 e**. Confirm NAV exposes the rocky exploration surface and that LAND is available. Expected environment is roughly **218.8 K EQ**, **573 Pa** pressure proxy and **9.91 m/s²** gravity. Surface should look materially distinct from home, with only ordinary dust/frost presentation events and no anomaly-weather behavior.
5. Travel to **Caelum-4361 h-A**. Expected environment is roughly **81.3 K EQ**, **0.23 Pa** pressure proxy and **0.85 m/s²** gravity. Surface should read as cryogenic ice/rock, with black/near-vacuum sky treatment and no weather scheduler.
6. On both new worlds test **LAND → move/look → scan POIs → save → reload → PAUSE/RESUME SKY → TAKEOFF**. Takeoff should return to a finite local circular orbit without a landing-session error.
7. Cross-world isolation: go e → h-A → d (or similar) and confirm terrain/material/fog/weather/scanned-POI state does not leak between worlds.
8. Rotate portrait ↔ landscape during flight to confirm the accepted v0.1.5.1.2 translucent portrait HUD still restores cleanly and no target/engine/sim state resets.
9. Other non-selected solid bodies should remain landing-disabled; gas giants should still report no solid surface; rogues should remain excluded.

Do **not** infer a FRAME route-intersection bug merely from a body filling the screen during a very fast low-orbit arrival. No clearance diagnostic/routing change is part of this release. Close-orbit body visual detail remains a later renderer milestone.

Physical iPhone Safari remains the release gate; automated QA verifies deterministic/state/code boundaries but does not claim exact mobile visual acceptance.
