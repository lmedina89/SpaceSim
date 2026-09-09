# Third-Party Software

## Three.js

Universe Lab v0.1.4.6.1.2 uses **Three.js 0.185.0**, imported from the pinned jsDelivr module URLs in `index.html` / the import map.

Three.js is used for rendering, camera presentation and GPU-visible geometry. Universe Lab's authoritative gravity, orbital integration, collisions, local propulsion, navigation, impacts, cosmic state and particle-experiment state are implemented separately in this project.

The speculative TRANSIT drive is project code and is explicitly fictional; it is not a third-party physics engine or a claim of real FTL physics.

See the Three.js project for its upstream license and notices.

No third-party weather, terrain, spacecraft or anomaly art assets were added in v0.1.4.5; these visuals are generated from Three.js primitives, canvas textures and seeded procedural data.


## v0.1.4.6.1.2 integrated diagnostics MFD

The right-side diagnostics monitor, mounting rail, translucent CanvasTexture UI and cockpit-mode HUD cleanup are original project code/procedural geometry. No generated concept image, marketplace cockpit, GLB, texture pack, icon library, or other external visual asset is bundled into the build. The generated cockpit concept used during planning is reference-only and is not shipped.

## v0.1.4.6.1.1 cockpit

The interactive cockpit in `src/render/cockpitView.js` is original procedural geometry/code created for Universe Lab. No external cockpit model, GLB, texture pack, marketplace asset, or generated-image asset is bundled in this release. The added cockpit lamps/strips are original Three.js emissive geometry tied to live telemetry. Runtime Three.js remains pinned to 0.185.0 through the existing CDN import map.
