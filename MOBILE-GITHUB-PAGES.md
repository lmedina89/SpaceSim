# Universe Lab v0.1.5.4.2 — Stellar Irradiance / Daylight iPhone Gate

Before physical acceptance of `IRRAD-1542`:

1. Hard reload and confirm **v0.1.5.4.2 / IRRAD-1542 / WebGL2 iOS**.
2. FRAME or navigate between an inner, roughly Earth-flux and outer planet/moon. Confirm reflected disks retain their existing texture/terminator detail but outer worlds are visibly dimmer and inner worlds brighter without turning into flat white walls.
3. Observe a body during an eclipse/occultation if convenient; confirm eclipse darkening still multiplies the new distance/luminosity illumination rather than disappearing.
4. Land on two enabled worlds at meaningfully different stellar flux when available. Confirm direct sun and diffuse daylight differ coherently while atmospheric/vacuum sky behavior remains unchanged.
5. LAND → SAVE/LOAD → TAKEOFF and repeat once. Confirm no stale surface frame, stuck controls, renderer/backend change or version/cache mismatch.
6. Regress cockpit readability, target/scan, FRAME, system map, Observation Planner, surface WALK/LOOK/SCAN and portrait/landscape rotation.

Automated QA cannot physically certify iPhone Safari rendering. This build remains pending physical acceptance until those checks are performed.

---

# Universe Lab v0.1.5.4.1 — Planet/Moon Realism iPhone Gate

Before physical acceptance of `PLANETREAL-1541`:

1. Hard reload and confirm **v0.1.5.4.1 / PLANETREAL-1541 / WebGL2 iOS**.
2. Revisit a very low rocky/moon orbit where v0.1.5.4 could become a pale flat wall. Confirm local relief/roughness remains visible as the disk fills the screen and no severe one-time hitch occurs when close detail first becomes resident.
3. Compare a previously good-looking mid-range body; it should retain its v0.1.5.4 identity rather than being replaced by a new global style.
4. Check h-A or another ice-rich body for fractured/icy close lighting without atmospheric leakage.
5. Check a gas giant; banding/oblateness should remain stable and it should not receive rocky micro-relief.
6. LAB black hole: confirm the disk reads more continuously beneath the plasma particles while the shadow/critical rings remain stable. This is still not GR ray tracing.
7. Regress d/e atmosphere limbs, f-A/h-A vacuum behavior, portrait/landscape, WALK release, LAND/SAVE/LOAD/TAKEOFF, FRAME and Observation Planner.

---

# Universe Lab v0.1.5.4 — Celestial Realism iPhone Gate

Before physically accepting `CELESTREAL-154` on iPhone Safari/WebKit:

1. Hard reload and confirm **v0.1.5.4 / CELESTREAL-154 / WebGL2 iOS**.
2. Approach a rocky planet/moon from far range into low orbit; detail should appear only after the disk becomes resolved, with no startup hitch across the whole system and no flat single-color wall at very close range.
3. Check Caelum-4361 h-A/f-A for distinct ice/rock vs regolith appearance and Caelum-4361 g/h for gas-envelope banding/oblateness.
4. Verify d/e atmospheric limbs from v0.1.5.3.1 remain intact and f-A/h-A remain limb-free.
5. Observe the primary star at safe range: photosphere should retain granulation/corona/prominence layers with darker spot structure; background exposure should remain smooth.
6. LAB-spawn a black hole, pulsar and magnetar. Stay outside compact-object model guards. Confirm the black hole has one narrow critical-curve family rather than stacked decorative rings; neutron-star/magnetar fields should read as dipole-like rather than generic torus cages.
7. Regress portrait↔landscape, surface WALK release, LAND/SAVE/LOAD/TAKEOFF, FRAME, Observation Planner and eclipse/phase behavior.

# Universe Lab v0.1.5.3.1 — Surface Input Release iPhone Gate

Before physically accepting `INPUTREL-1531` on iPhone Safari/WebKit:

1. Hard reload and confirm the **top-left badge**, startup notice and Engineering build identity all report **v0.1.5.3.1 / INPUTREL-1531**.
2. Land on a supported world and hold FORWARD for several seconds, then release normally. The button must immediately lose its held highlight and Local X/Z must stop changing.
3. Repeat while simultaneously using LOOK with a second finger. Releasing LOOK alone must not cancel a still-held FORWARD press; releasing FORWARD must stop movement.
4. Drag a held WALK finger toward/outside the button before release and repeat several times. No direction may remain latched.
5. While holding a surface direction, background/foreground the browser or trigger a page/chrome interruption if convenient; returning must show neutral movement.
6. Regress v0.1.5.3 atmosphere/sky behavior on d/e/f-A/h-A and portrait↔landscape.

---

# Universe Lab v0.1.5.3 — Atmosphere/Sky Optics iPhone Gate

Before physically accepting `ATMOSKY-153` on iPhone Safari/WebKit:

1. Hard reload and confirm **v0.1.5.3**, build **ATMOSKY-153**, and **WebGL2 iOS**.
2. In orbit around **Caelum-4361 d**, confirm a visible but thin atmospheric limb. Around **e**, expect a much subtler limb. **f-A** and **h-A** must not gain a fake atmosphere limb.
3. Land on **d**: daylight sky should be wavelength-dependent rather than a fixed palette; lower primary-star altitude should redden direct light/horizon; daylight should strongly wash out stars without deleting them; an eclipse should dim direct star and diffuse sky together.
4. Land on **e**: its ~573 Pa atmosphere should remain **very dark/thin**, with stars much more visible than on d. Dust/frost weather may increase extinction, but it must not suddenly become an Earth-blue sky.
5. Land on **f-A** and **h-A**: black daylight sky, no atmospheric fog, no wind/weather regression.
6. Rotate portrait ↔ landscape during flight and regress the v0.1.5.1.2 HUD layout.
7. Regress d → f-A → e → h-A → d LAND / SAVE / LOAD / PAUSE SKY / TAKEOFF. No atmosphere/fog state may leak between worlds.
8. Regress Observation Planner, phases/eclipses, FRAME, close-orbit body rendering, impacts and compact objects. This release does not intentionally change those systems.

Physical iPhone Safari remains the final visual/performance release gate. Automated tests cannot certify exact mobile color/exposure composition.

---

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
