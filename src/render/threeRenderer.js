import * as THREE from 'three/webgpu';
import { createStarfield } from './starfield.js';
import { createCelestialVisual } from './celestialFactory.js';
import { BODY_KIND, SIMULATION } from '../core/constants.js';

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
    this.sunLight = new THREE.PointLight(0xffffff, 4.5, 120_000, 1.7);
    this.scene.add(this.sunLight);
    this.scene.add(new THREE.AmbientLight(0x46516d, 0.16));
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

  updateMotionCue(ship) {
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0, (now - this._lastMotionAt) / 1000));
    this._lastMotionAt = now;
    const speed = Math.hypot(ship.velocity[0], ship.velocity[1], ship.velocity[2]);
    const inv = speed > 1e-9 ? 1 / speed : 0;
    const dx = ship.velocity[0] * inv, dy = ship.velocity[1] * inv, dz = ship.velocity[2] * inv;
    // Visual-only logarithmic navigation cue. It deliberately exaggerates translation so astronomical
    // flight remains perceptible without changing any authoritative position, velocity, or gravity.
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
      if (body.kind === BODY_KIND.STAR) this.sunLight.position.copy(this._temp);
      visual.rotation.y += body.kind === BODY_KIND.PLANET ? 0.0008 : 0.0002;
    }
    if (minorField) this.updateMinorField(minorField, referenceFrame);
    this.updateTrajectories(referenceFrame);

    if (this.targetBodyId && this.bodyVisuals.has(this.targetBodyId)) {
      const visual = this.bodyVisuals.get(this.targetBodyId);
      this.targetMarker.position.copy(visual.position);
      const distance = Math.max(0.01, visual.position.length());
      // Constant-angular-size center brackets: target indication no longer blankets nearby planets.
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
