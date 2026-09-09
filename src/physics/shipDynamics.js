import { PHYSICS, SIMULATION } from '../core/constants.js';
import { vec3 } from './vector.js';

export class ShipDynamics {
  constructor() {
    this.position = vec3();
    this.velocity = vec3();
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.throttle = 0;
    this.reverseThrottle = 0;
    this.strafe = 0;
    this.lift = 0;
    this.braking = false;
    this.mass = SIMULATION.shipDryMassKg;
    this._forward = new Float64Array(3);
    this._right = new Float64Array(3);
    this._up = new Float64Array(3);
    this._a0 = new Float64Array(3);
    this._a1 = new Float64Array(3);
  }

  basis() {
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    const f = this._forward;
    f[0] = sy * cp;
    f[1] = sp;
    f[2] = cy * cp;

    const baseRightX = cy;
    const baseRightY = 0;
    const baseRightZ = -sy;
    const baseUpX = f[1] * baseRightZ - f[2] * baseRightY;
    const baseUpY = f[2] * baseRightX - f[0] * baseRightZ;
    const baseUpZ = f[0] * baseRightY - f[1] * baseRightX;
    const cr = Math.cos(this.roll);
    const sr = Math.sin(this.roll);
    const right = this._right;
    const up = this._up;
    right[0] = baseRightX * cr + baseUpX * sr;
    right[1] = baseRightY * cr + baseUpY * sr;
    right[2] = baseRightZ * cr + baseUpZ * sr;
    up[0] = baseUpX * cr - baseRightX * sr;
    up[1] = baseUpY * cr - baseRightY * sr;
    up[2] = baseUpZ * cr - baseRightZ * sr;
    return { forward: f, right, up };
  }

  forward(target = this._forward) {
    const { forward } = this.basis();
    if (target !== forward) target.set(forward);
    return target;
  }

  right(target = this._right) {
    const { right } = this.basis();
    if (target !== right) target.set(right);
    return target;
  }

  up(target = this._up) {
    const { up } = this.basis();
    if (target !== up) target.set(up);
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

  rotateLook(deltaYaw, deltaPitch) {
    this.yaw += deltaYaw;
    this.pitch = Math.max(-1.54, Math.min(1.54, this.pitch + deltaPitch));
  }

  rotateRoll(deltaRoll) {
    this.roll += deltaRoll;
    if (this.roll > Math.PI) this.roll -= Math.PI * 2;
    if (this.roll < -Math.PI) this.roll += Math.PI * 2;
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

    const { forward, right, up } = this.basis();
    const forwardAccel = SIMULATION.shipThrustAcceleration * Math.min(1, Math.max(0, this.throttle));
    const reverseAccel = SIMULATION.shipReverseAcceleration * Math.min(1, Math.max(0, this.reverseThrottle));
    const strafeAccel = SIMULATION.shipRcsAcceleration * Math.max(-1, Math.min(1, this.strafe));
    const liftAccel = SIMULATION.shipRcsAcceleration * Math.max(-1, Math.min(1, this.lift));
    const longitudinal = forwardAccel - reverseAccel;
    ax += forward[0] * longitudinal + right[0] * strafeAccel + up[0] * liftAccel;
    ay += forward[1] * longitudinal + right[1] * strafeAccel + up[1] * liftAccel;
    az += forward[2] * longitudinal + right[2] * strafeAccel + up[2] * liftAccel;

    out[0] = ax; out[1] = ay; out[2] = az;
    return out;
  }

  step(dt, gravitySources) {
    // Velocity-Verlet spacecraft integration. Pilot accelerations are held constant over a substep.
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
      // Experimental inertial damping. Deliberately non-physical and labeled as a navigation aid.
      const damping = Math.exp(-0.65 * dt);
      this.velocity[0] *= damping;
      this.velocity[1] *= damping;
      this.velocity[2] *= damping;
    }
  }

  serialize() {
    return {
      position: [...this.position],
      velocity: [...this.velocity],
      yaw: this.yaw,
      pitch: this.pitch,
      roll: this.roll,
    };
  }

  restore(data) {
    if (!data || !Array.isArray(data.position) || !Array.isArray(data.velocity)) return false;
    this.position.set(data.position.slice(0, 3));
    this.velocity.set(data.velocity.slice(0, 3));
    this.yaw = Number(data.yaw) || 0;
    this.pitch = Number(data.pitch) || 0;
    this.roll = Number(data.roll) || 0;
    return true;
  }
}
