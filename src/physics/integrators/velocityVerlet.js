export class VelocityVerletIntegrator {
  constructor(gravitySolver) {
    this.gravitySolver = gravitySolver;
    this._a0 = null;
    this._a1 = null;
  }

  step(bodies, dt) {
    const required = bodies.length * 3;
    if (!this._a0 || this._a0.length !== required) {
      this._a0 = new Float64Array(required);
      this._a1 = new Float64Array(required);
    }

    this.gravitySolver.computeAccelerations(bodies, this._a0);
    const halfDt2 = 0.5 * dt * dt;
    for (let i = 0; i < bodies.length; i += 1) {
      const body = bodies[i];
      const k = i * 3;
      body.position[0] += body.velocity[0] * dt + this._a0[k] * halfDt2;
      body.position[1] += body.velocity[1] * dt + this._a0[k + 1] * halfDt2;
      body.position[2] += body.velocity[2] * dt + this._a0[k + 2] * halfDt2;
    }

    this.gravitySolver.computeAccelerations(bodies, this._a1);
    const halfDt = 0.5 * dt;
    for (let i = 0; i < bodies.length; i += 1) {
      const body = bodies[i];
      const k = i * 3;
      body.velocity[0] += (this._a0[k] + this._a1[k]) * halfDt;
      body.velocity[1] += (this._a0[k + 1] + this._a1[k + 1]) * halfDt;
      body.velocity[2] += (this._a0[k + 2] + this._a1[k + 2]) * halfDt;
    }
  }
}
