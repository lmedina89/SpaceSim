# Universe Lab v0.1.5.1.2 — Portrait HUD Glass iPhone Gate

Before physically accepting `PORTHUD-1512` on iPhone Safari/WebKit:

1. Hard reload and confirm **v0.1.5.1.2**, build **PORTHUD-1512**, and **WebGL2 iOS**.
2. In landscape, confirm the accepted four-MFD cockpit still looks and behaves like v0.1.5.1.1.
3. Rotate during live flight to portrait. Confirm the central FLIGHT MFD is visibly translucent, has no opaque physical bezel, and its text remains crisp/readable over stars and a bright planet.
4. Confirm the `NAV / FLIGHT / SCI / SYS` shortcut strip is translucent and all four actions still open the existing panels.
5. Rotate portrait → landscape → portrait while moving/targeting; confirm target, ship state, engine/FRAME state and simulation time do not reset.
6. Regress home-world and Caelum-4361 f-A LAND/SAVE/LOAD/TAKEOFF.

Physical iPhone composition remains the visual release gate; automated tests certify state isolation and code boundaries, not Safari's exact final pixels.
