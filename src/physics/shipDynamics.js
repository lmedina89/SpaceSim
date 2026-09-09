import { PHYSICS, SIMULATION } from '../core/constants.js';
import { vec3 } from './vector.js';

export class ShipDynamics {
  constructor() {
    this.position = vec3();
    this.velocity = vec3();
    this.yaw = 0;
    this.pitch = 0;
    this.throttle = 0;
    this.braking = false;
    this.mass = SIMULATION.shipDryMassKg;
    this._forward = new Float64Array(3);
    this._a0 = new Float64Array(3);
    this._a1 = new Float64Array(3);
  }

  forward(target = this._forward) {
    const cp = Math.cos(this.pitch);
    target[0] = Math.sin(this.yaw) * cp;
    target[1] = Math.sin(this.pitch);
    target[2] = Math.cos(this.yaw) * cp;
    return target;
  }

  lookAt(targetPosition) {
    const dx = targetPosition[0] - this.position[0];
    const dy = targetPosition[1] - this.position[1];
    const dz = targetPosition[2] - this.position[2];
    const r = Math.hypot(dx, dy, dz) || 1;
    this.pitch = Math.asin(dy / r);
    this.yaw = Math.atan2(dx, dz);
  }

  accelerationAt(position, gravitySources, out) {
    let ax = 0, ay = 0, az = 0;
    for (let i = 0; i < gravitySources.length; i += 1) {
      const source = gravitySources[i];
      const dx = source.position[0] - position[0];
      const dy = source.position[1] - position[1];
      const dz = source.position[2] - position[2];
      const r2 = dx * dx + dy * dy + dz * dz + Math.max(1, source.radius * source.radius * 1e-12);
      const invR = 1 / Math.sqrt(r2);
      const scale = PHYSICS.G * source.mass * invR * invR * invR;
      ax += dx * scale; ay += dy * scale; az += dz * scale;
    }
    if (this.throttle > 0) {
      const f = this.forward();
      const thrust = SIMULATION.shipThrustAcceleration * Math.min(1, this.throttle);
      ax += f[0] * thrust; ay += f[1] * thrust; az += f[2] * thrust;
    }
    out[0] = ax; out[1] = ay; out[2] = az;
    return out;
  }

  step(dt, gravitySources) {
    // Velocity-Verlet spacecraft integration. Thrust is treated as constant during each substep.
    this.accelerationAt(this.position, gravitySources, this._a0);
    const halfDt2 = 0.5 * dt * dt;
    this.position[0] += this.velocity[0] * dt + this._a0[0] * halfDt2;
    this.position[1] += this.velocity[1] * dt + this._a0[1] * halfDt2;
    this.position[2] += this.velocity[2] * dt + this._a0[2] * halfDt2;
    this.accelerationAt(this.position, gravitySources, this._a1);
    const halfDt = 0.5 * dt;
    this.velocity[0] += (this._a0[0] + this._a1[0]) * halfDt;
    this.velocity[1] += (this._a0[1] + this._a1[1]) * halfDt;
    this.velocity[2] += (this._a0[2] + this._a1[2]) * halfDt;

    if (this.braking) {
      // Experimental inertial damping system. Explicitly non-physical; useful for navigation.
      const damping = Math.exp(-0.65 * dt);
      this.velocity[0] *= damping;
      this.velocity[1] *= damping;
      this.velocity[2] *= damping;
    }
  }

  serialize() {
    return { position: [...this.position], velocity: [...this.velocity], yaw: this.yaw, pitch: this.pitch };
  }

  restore(data) {
    if (!data || !Array.isArray(data.position) || !Array.isArray(data.velocity)) return false;
    this.position.set(data.position.slice(0, 3));
    this.velocity.set(data.velocity.slice(0, 3));
    this.yaw = Number(data.yaw) || 0;
    this.pitch = Number(data.pitch) || 0;
    return true;
  }
}
