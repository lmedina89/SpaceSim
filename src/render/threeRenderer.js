import * as THREE from 'three/webgpu';
import { createStarfield } from './starfield.js';
import { createCelestialVisual } from './celestialFactory.js';
import { SIMULATION, BODY_KIND } from '../core/constants.js';


function disposeObject(root) {
  root.traverse?.((node) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((m) => m?.dispose?.());
    else node.material?.dispose?.();
  });
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

  render({ bodies, ship, referenceFrame, minorField }) {
    referenceFrame.centerOn(ship.position);
    this.syncBodies(bodies);
    const temp = new THREE.Vector3();
    for (const body of bodies) {
      const visual = this.bodyVisuals.get(body.id);
      referenceFrame.toRender(body.position, temp);
      visual.position.copy(temp);
      if (body.kind === BODY_KIND.STAR) this.sunLight.position.copy(temp);
      visual.rotation.y += body.kind === BODY_KIND.PLANET ? 0.0008 : 0.0002;
    }
    if (minorField) this.updateMinorField(minorField, referenceFrame);

    this.camera.position.set(0, 0, 0);
    const f = ship.forward();
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(f[0] * 100, f[1] * 100, f[2] * 100);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._resizeObserver.disconnect();
    this.renderer.dispose();
  }
}
