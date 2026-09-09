# Third-party components

## Three.js

Universe Lab pins Three.js **0.185.0** through browser ESM import maps in `index.html`.

Three.js provides the rendering/WebGPU-WebGL abstraction only. Universe Lab's authoritative universe, flight, impact, and particle-experiment numerical state lives outside Three.js.

No additional runtime third-party libraries were added in v0.1.3. The spatial hash and particle experiment solvers are project code.
