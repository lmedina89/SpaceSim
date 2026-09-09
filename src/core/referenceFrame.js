import { SIMULATION } from './constants.js';

export class FloatingReferenceFrame {
  constructor() {
    this.origin = new Float64Array(3);
    this.scale = 1 / SIMULATION.metersPerRenderUnit;
  }

  centerOn(position) {
    this.origin[0] = position[0];
    this.origin[1] = position[1];
    this.origin[2] = position[2];
  }

  toRender(position, target = { x: 0, y: 0, z: 0 }) {
    target.x = (position[0] - this.origin[0]) * this.scale;
    target.y = (position[1] - this.origin[1]) * this.scale;
    target.z = (position[2] - this.origin[2]) * this.scale;
    return target;
  }
}
