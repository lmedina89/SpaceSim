import * as THREE from 'three/webgpu';
import { createStarfield } from './starfield.js';
import { createCelestialVisual } from './celestialFactory.js';
import { BODY_KIND } from '../core/constants.js';

function disposeObject(root) {
  root.traverse?.((node) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((m) => m?.dispose?.());
    else node.material?.dispose?.();
  });
}

function makeTargetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(116,229,255,.95)';
  ctx.lineWidth = 8;
  const inset = 62, arm = 38, far = 194;
  const corners = [
    [inset, inset, 1, 1], [far, inset, -1, 1], [inset, far, 1, -1], [far, far, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath(); ctx.moveTo(x, y + sy * arm); ctx.lineTo(x, y); ctx.lineTo(x + sx * arm, y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath(); ctx.arc(128, 128, 5, 0, Math.PI * 2); ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.12, 'rgba(255,255,255,.92)');
  grad.addColorStop(0.45, 'rgba(255,190,90,.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

let sharedGlow = null;
function glowTexture() { sharedGlow ??= makeGlowTexture(); return sharedGlow; }

function unit(v) {
  const mag = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / mag, v[1] / mag, v[2] / mag];
}

export class UniverseRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010207);
    this.camera = new THREE.PerspectiveCamera(66, 1, 0.02, 160_000);
    this.renderer = new THREE.WebGPURenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.container.appendChild(this.renderer.domElement);
    this.bodyVisuals = new Map();
    this.minorPoints = null;
    this.minorGeometry = null;
    this.systemSeed = null;
    this.sunLight = new THREE.PointLight(0xffffff, 5.5, 0, 0);
    this.scene.add(this.sunLight);
    this.scene.add(new THREE.AmbientLight(0x263149, 0.055));
    this.trajectories = new Map();
    this.targetBodyId = null;
    this.targetMarker = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeTargetTexture(),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      depthTest: false,
    }));
    this.targetMarker.visible = false;
    this.targetMarker.renderOrder = 1000;
    this.scene.add(this.targetMarker);
    this.impactEffects = [];
    this.impactEffectGroup = new THREE.Group();
    this.impactEffectGroup.renderOrder = 900;
    this.scene.add(this.impactEffectGroup);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._temp = new THREE.Vector3();
    this._motionCueCount = 180;
    this._motionCenters = new Float32Array(this._motionCueCount * 3);
    this._motionPositions = new Float32Array(this._motionCueCount * 6);
    this._motionGeometry = new THREE.BufferGeometry();
    this._motionGeometry.setAttribute('position', new THREE.BufferAttribute(this._motionPositions, 3));
    this._motionMaterial = new THREE.LineBasicMaterial({ color: 0x8bdfff, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending });
    this._motionLines = new THREE.LineSegments(this._motionGeometry, this._motionMaterial);
    this._motionLines.frustumCulled = false;
    this._motionLines.renderOrder = 2;
    for (let i = 0; i < this._motionCueCount; i += 1) {
      const k = i * 3;
      this._motionCenters[k] = (Math.random() * 2 - 1) * 34;
      this._motionCenters[k + 1] = (Math.random() * 2 - 1) * 24;
      this._motionCenters[k + 2] = (Math.random() * 2 - 1) * 34;
    }
    this.scene.add(this._motionLines);
    this._lastMotionAt = performance.now();
    this._lastImpactFxAt = performance.now();
    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(this.container);
  }

  async init() {
    await this.renderer.init();
    this.resize();
    return this.backendName();
  }

  backendName() {
    if (this.renderer.backend?.isWebGPUBackend) return 'WebGPU';
    return 'WebGL2 fallback';
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(2, Math.floor(rect.width));
    const height = Math.max(2, Math.floor(rect.height));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  resetSystem(seed) {
    for (const visual of this.bodyVisuals.values()) { this.scene.remove(visual); disposeObject(visual); }
    this.bodyVisuals.clear();
    if (this.minorPoints) {
      this.scene.remove(this.minorPoints);
      this.minorGeometry?.dispose();
      this.minorPoints.material.dispose();
      this.minorPoints = null;
    }
    for (const id of [...this.trajectories.keys()]) this.clearTrajectory(id);
    this.setTarget(null);
    const oldStars = this.scene.getObjectByName('visual-starfield');
    if (oldStars) { this.scene.remove(oldStars); disposeObject(oldStars); }
    for (const fx of this.impactEffects) this.impactEffectGroup.remove(fx.group);
    this.impactEffects.length = 0;
    const stars = createStarfield(seed);
    stars.name = 'visual-starfield';
    this.scene.add(stars);
    this.systemSeed = seed;
  }

  syncBodies(bodies) {
    const ids = new Set(bodies.map((b) => b.id));
    for (const [id, visual] of this.bodyVisuals) {
      if (!ids.has(id)) { this.scene.remove(visual); disposeObject(visual); this.bodyVisuals.delete(id); }
    }
    for (const body of bodies) {
      const existing = this.bodyVisuals.get(body.id);
      if (existing && (existing.userData?.visualVersion !== (body.visualVersion ?? 0) || existing.userData?.bodyColor !== (body.color ?? null))) {
        this.scene.remove(existing);
        disposeObject(existing);
        this.bodyVisuals.delete(body.id);
      }
      if (!this.bodyVisuals.has(body.id)) {
        const visual = createCelestialVisual(body);
        this.bodyVisuals.set(body.id, visual);
        this.scene.add(visual);
      }
    }
  }

  setMinorField(field) {
    if (this.minorPoints) {
      this.scene.remove(this.minorPoints);
      this.minorGeometry.dispose();
      this.minorPoints.material.dispose();
    }
    this.minorGeometry = new THREE.BufferGeometry();
    this.minorGeometry.setAttribute('position', new THREE.BufferAttribute(field.renderPosition, 3));
    const material = new THREE.PointsMaterial({
      color: 0xaebbd7,
      size: 0.85,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    this.minorPoints = new THREE.Points(this.minorGeometry, material);
    this.minorPoints.frustumCulled = false;
    this.scene.add(this.minorPoints);
  }

  updateMinorField(field, referenceFrame) {
    const out = field.renderPosition;
    const origin = referenceFrame.origin;
    const scale = referenceFrame.scale;
    const source = field.position;
    for (let i = 0; i < field.count; i += 1) {
      const k = i * 3;
      out[k] = (source[k] - origin[0]) * scale;
      out[k + 1] = (source[k + 1] - origin[1]) * scale;
      out[k + 2] = (source[k + 2] - origin[2]) * scale;
    }
    if (this.minorGeometry) this.minorGeometry.attributes.position.needsUpdate = true;
  }

  setTarget(bodyId) {
    this.targetBodyId = bodyId || null;
    this.targetMarker.visible = Boolean(bodyId);
  }

  setTrajectory(id, physicalPoints, color = 0x62e6ff, opacity = 0.8) {
    this.clearTrajectory(id);
    if (!physicalPoints || physicalPoints.length < 6) return;
    const renderPositions = new Float32Array(physicalPoints.length);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(renderPositions, 3));
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.renderOrder = 20;
    this.scene.add(line);
    this.trajectories.set(id, { physicalPoints, renderPositions, geometry, material, line });
  }

  clearTrajectory(id) {
    const existing = this.trajectories.get(id);
    if (!existing) return;
    this.scene.remove(existing.line);
    existing.geometry.dispose();
    existing.material.dispose();
    this.trajectories.delete(id);
  }

  updateTrajectories(referenceFrame) {
    const origin = referenceFrame.origin;
    const scale = referenceFrame.scale;
    for (const trajectory of this.trajectories.values()) {
      const src = trajectory.physicalPoints;
      const out = trajectory.renderPositions;
      for (let k = 0; k < src.length; k += 3) {
        out[k] = (src[k] - origin[0]) * scale;
        out[k + 1] = (src[k + 1] - origin[1]) * scale;
        out[k + 2] = (src[k + 2] - origin[2]) * scale;
      }
      trajectory.geometry.attributes.position.needsUpdate = true;
    }
  }

  addImpactEffect({ position, normal = [0, 1, 0], energyJ = 1e12, color = 0xffb05f }) {
    while (this.impactEffects.length >= 6) {
      const old = this.impactEffects.shift();
      this.impactEffectGroup.remove(old.group);
      old.points.geometry.dispose(); old.points.material.dispose(); old.ring.geometry.dispose(); old.ring.material.dispose(); old.flash.material.dispose();
    }
    const group = new THREE.Group();
    const scaleBase = Math.max(0.24, Math.min(5.2, Math.log10(energyJ + 10) * 0.16));
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(),
      color,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    flash.scale.set(scaleBase * 2.2, scaleBase * 2.2, 1);
    group.add(flash);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(scaleBase * 0.35, scaleBase * 0.5, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    const n = unit(normal);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(n[0], n[1], n[2]));
    group.add(ring);

    const pointCount = 96;
    const positions = new Float32Array(pointCount * 3);
    const velocities = new Float32Array(pointCount * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({
      color,
      size: Math.max(0.08, scaleBase * 0.065),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    group.add(points);

    const up = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const tangent = unit([
      up[1] * n[2] - up[2] * n[1],
      up[2] * n[0] - up[0] * n[2],
      up[0] * n[1] - up[1] * n[0],
    ]);
    const bitangent = unit([
      n[1] * tangent[2] - n[2] * tangent[1],
      n[2] * tangent[0] - n[0] * tangent[2],
      n[0] * tangent[1] - n[1] * tangent[0],
    ]);
    const ejectaSpeed = Math.max(0.35, Math.min(18, Math.log10(energyJ + 10) * 0.48));
    for (let i = 0; i < pointCount; i += 1) {
      const p = i * 3;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.8;
      const lift = 0.75 + Math.random() * 0.85;
      const dir = unit([
        n[0] * lift + tangent[0] * Math.cos(a) * r + bitangent[0] * Math.sin(a) * r,
        n[1] * lift + tangent[1] * Math.cos(a) * r + bitangent[1] * Math.sin(a) * r,
        n[2] * lift + tangent[2] * Math.cos(a) * r + bitangent[2] * Math.sin(a) * r,
      ]);
      velocities[p] = dir[0] * ejectaSpeed * (0.6 + Math.random() * 0.9);
      velocities[p + 1] = dir[1] * ejectaSpeed * (0.6 + Math.random() * 0.9);
      velocities[p + 2] = dir[2] * ejectaSpeed * (0.6 + Math.random() * 0.9);
    }

    group.frustumCulled = false;
    this.impactEffectGroup.add(group);
    this.impactEffects.push({ group, flash, ring, points, positions, velocities, origin: [...position], age: 0, duration: 2.2 + scaleBase * 0.08, flashBase: scaleBase * 2.2 });
  }

  updateImpactEffects(referenceFrame) {
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0, (now - this._lastImpactFxAt) / 1000));
    this._lastImpactFxAt = now;
    const origin = referenceFrame.origin;
    const scale = referenceFrame.scale;
    for (let i = this.impactEffects.length - 1; i >= 0; i -= 1) {
      const fx = this.impactEffects[i];
      fx.age += dt;
      const t = fx.age / fx.duration;
      if (t >= 1) {
        this.impactEffectGroup.remove(fx.group);
        fx.points.geometry.dispose();
        fx.points.material.dispose();
        fx.ring.geometry.dispose();
        fx.ring.material.dispose();
        fx.flash.material.dispose();
        this.impactEffects.splice(i, 1);
        continue;
      }
      const opacity = 1 - t;
      fx.flash.material.opacity = 0.72 * opacity;
      const flashScale = fx.flashBase * (1 + t * 3.8);
      fx.flash.scale.set(flashScale, flashScale, 1);
      fx.ring.material.opacity = 0.72 * opacity;
      fx.ring.scale.setScalar(1 + t * 9);
      for (let p = 0; p < fx.positions.length; p += 3) {
        fx.positions[p] = fx.velocities[p] * fx.age;
        fx.positions[p + 1] = fx.velocities[p + 1] * fx.age;
        fx.positions[p + 2] = fx.velocities[p + 2] * fx.age;
      }
      fx.points.geometry.attributes.position.needsUpdate = true;
      fx.points.material.opacity = 0.85 * opacity;
      fx.group.position.set((fx.origin[0] - origin[0]) * scale, (fx.origin[1] - origin[1]) * scale, (fx.origin[2] - origin[2]) * scale);
    }
  }

  updateMotionCue(ship) {
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0, (now - this._lastMotionAt) / 1000));
    this._lastMotionAt = now;
    const speed = Math.hypot(ship.velocity[0], ship.velocity[1], ship.velocity[2]);
    const inv = speed > 1e-9 ? 1 / speed : 0;
    const dx = ship.velocity[0] * inv, dy = ship.velocity[1] * inv, dz = ship.velocity[2] * inv;
    const baseRate = Math.max(0.15, Math.min(8, (Math.log10(speed + 10) - 1) * 1.55));
    const thrustBoost = ship.throttle > 0 ? 3.5 : ship.reverseThrottle > 0 ? 1.8 : 0;
    const rate = baseRate + thrustBoost;
    const trail = Math.max(0.04, Math.min(1.35, 0.05 + rate * 0.13));
    const limitX = 34, limitY = 24, limitZ = 34;
    const move = rate * dt;
    for (let i = 0; i < this._motionCueCount; i += 1) {
      const c = i * 3;
      this._motionCenters[c] -= dx * move;
      this._motionCenters[c + 1] -= dy * move;
      this._motionCenters[c + 2] -= dz * move;
      if (this._motionCenters[c] > limitX) this._motionCenters[c] -= limitX * 2;
      if (this._motionCenters[c] < -limitX) this._motionCenters[c] += limitX * 2;
      if (this._motionCenters[c + 1] > limitY) this._motionCenters[c + 1] -= limitY * 2;
      if (this._motionCenters[c + 1] < -limitY) this._motionCenters[c + 1] += limitY * 2;
      if (this._motionCenters[c + 2] > limitZ) this._motionCenters[c + 2] -= limitZ * 2;
      if (this._motionCenters[c + 2] < -limitZ) this._motionCenters[c + 2] += limitZ * 2;
      const p = i * 6;
      const x = this._motionCenters[c], y = this._motionCenters[c + 1], z = this._motionCenters[c + 2];
      this._motionPositions[p] = x; this._motionPositions[p + 1] = y; this._motionPositions[p + 2] = z;
      this._motionPositions[p + 3] = x + dx * trail;
      this._motionPositions[p + 4] = y + dy * trail;
      this._motionPositions[p + 5] = z + dz * trail;
    }
    this._motionGeometry.attributes.position.needsUpdate = true;
    this._motionMaterial.opacity = Math.max(0.04, Math.min(0.32, 0.035 + rate * 0.028));
  }

  pickBodyAt(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const roots = [...this.bodyVisuals.values()];
    const hits = this.raycaster.intersectObjects(roots, true);
    for (const hit of hits) {
      let node = hit.object;
      while (node) {
        if (node.userData?.entityId) return node.userData.entityId;
        node = node.parent;
      }
    }
    return null;
  }

  getStats() {
    const info = this.renderer.info;
    const render = info?.render ?? info;
    return {
      drawCalls: Number.isFinite(render?.calls) ? render.calls : null,
      triangles: Number.isFinite(render?.triangles) ? render.triangles : null,
    };
  }

  render({ bodies, ship, referenceFrame, minorField }) {
    referenceFrame.centerOn(ship.position);
    this.syncBodies(bodies);
    for (const body of bodies) {
      const visual = this.bodyVisuals.get(body.id);
      referenceFrame.toRender(body.position, this._temp);
      visual.position.copy(this._temp);
      if (body.kind === BODY_KIND.STAR) {
        this.sunLight.position.copy(this._temp);
        this.sunLight.color.setHex(body.color ?? 0xffffff);
      }
      visual.rotation.y += body.kind === BODY_KIND.PLANET ? 0.0008 : 0.0002;
    }
    if (minorField) this.updateMinorField(minorField, referenceFrame);
    this.updateTrajectories(referenceFrame);
    this.updateImpactEffects(referenceFrame);

    if (this.targetBodyId && this.bodyVisuals.has(this.targetBodyId)) {
      const visual = this.bodyVisuals.get(this.targetBodyId);
      this.targetMarker.position.copy(visual.position);
      const distance = Math.max(0.01, visual.position.length());
      const size = Math.max(0.22, distance * 0.045);
      this.targetMarker.scale.set(size, size, 1);
      this.targetMarker.visible = true;
    } else {
      this.targetMarker.visible = false;
    }

    this.updateMotionCue(ship);
    const desiredFov = 66 + (ship.throttle > 0 ? 5 : 0) + (ship.reverseThrottle > 0 ? 2 : 0);
    const nextFov = this.camera.fov + (desiredFov - this.camera.fov) * 0.14;
    if (Math.abs(nextFov - this.camera.fov) > 0.005) { this.camera.fov = nextFov; this.camera.updateProjectionMatrix(); }
    this.camera.position.set(0, 0, 0);
    const basis = ship.basis();
    this.camera.up.set(basis.up[0], basis.up[1], basis.up[2]);
    this.camera.lookAt(basis.forward[0] * 100, basis.forward[1] * 100, basis.forward[2] * 100);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._resizeObserver.disconnect();
    for (const id of [...this.trajectories.keys()]) this.clearTrajectory(id);
    this._motionGeometry.dispose();
    this._motionMaterial.dispose();
    this.renderer.dispose();
  }
}
