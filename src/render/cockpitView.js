import * as THREE from 'three/webgpu';

const SCREEN_UPDATE_MS = 180;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function fmt(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatDistance(value) {
  if (!Number.isFinite(value)) return '—';
  const a = Math.abs(value);
  if (a >= 1.496e9) return `${fmt(value / 1.496e11, 4)} AU`;
  if (a >= 1e9) return `${fmt(value / 1e9, 2)} Gm`;
  if (a >= 1e6) return `${fmt(value / 1e6, 2)} Mm`;
  if (a >= 1e3) return `${fmt(value / 1e3, 1)} km`;
  return `${fmt(value, 0)} m`;
}

function formatSpeed(value) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1e6) return `${fmt(value / 1e6, 2)} Mm/s`;
  if (Math.abs(value) >= 1e3) return `${fmt(value / 1e3, 2)} km/s`;
  return `${fmt(value, 1)} m/s`;
}

function formatRadius(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e6) return `${fmt(value / 1e6, 2)} Mm`;
  if (value >= 1e3) return `${fmt(value / 1e3, 1)} km`;
  return `${fmt(value, 0)} m`;
}

function canvasTexture(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return { canvas, ctx: canvas.getContext('2d'), texture };
}

function drawScreenFrame(ctx, width, height, title, accent = '#8edcff') {
  ctx.clearRect(0, 0, width, height);
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#07131c');
  g.addColorStop(1, '#02070d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(150,210,235,.28)';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, width - 6, height - 6);
  ctx.fillStyle = accent;
  ctx.font = '700 30px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(title, 18, 34);
  ctx.fillStyle = 'rgba(142,220,255,.25)';
  ctx.fillRect(18, 45, width - 36, 2);
}

function drawLine(ctx, label, value, y, width, accent = '#eefaff') {
  ctx.fillStyle = '#7797aa';
  ctx.font = '600 18px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(label.toUpperCase(), 18, y);
  ctx.fillStyle = accent;
  ctx.font = '700 27px ui-monospace, SFMono-Regular, Menlo, monospace';
  const measured = ctx.measureText(String(value)).width;
  ctx.fillText(String(value), Math.max(18, width - 18 - measured), y);
}

function makeScreenMaterial(texture) {
  return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, transparent: false });
}

function makeButtonLabel(text, accent = '#c8eeff') {
  const { canvas, ctx, texture } = canvasTexture(192, 80);
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#1a2a34');
  g.addColorStop(1, '#091016');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(150,215,240,.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  ctx.fillStyle = accent;
  ctx.font = '700 42px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
  return texture;
}

function makeBeam(a, b, radius, material) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 12, 1, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function makePanelBox(size, position, rotation, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

export class CockpitView {
  constructor(camera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.name = 'interactive-3d-cockpit';
    this.group.visible = true;
    this.group.renderOrder = 4000;
    camera.add(this.group);

    this.interactives = [];
    this.buttonEntries = new Map();
    this.screenEntries = new Map();
    this.lastScreenUpdateAt = 0;
    this.lastTelemetry = null;
    this.flashUntil = new Map();

    this.shellMaterial = new THREE.MeshStandardMaterial({
      color: 0x151b20,
      metalness: 0.72,
      roughness: 0.33,
      emissive: 0x02070a,
      emissiveIntensity: 0.35,
    });
    this.trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x596570,
      metalness: 0.92,
      roughness: 0.22,
      emissive: 0x071018,
      emissiveIntensity: 0.28,
    });
    this.softMaterial = new THREE.MeshStandardMaterial({ color: 0x0b0e11, metalness: 0.05, roughness: 0.86 });
    this.buttonBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x131c22, metalness: 0.55, roughness: 0.34 });
    this.glowStripMaterial = new THREE.MeshBasicMaterial({ color: 0x58bde6, transparent: true, opacity: 0.58, toneMapped: false });

    this.buildShell();
    this.buildScreensAndControls();
    this.drawScreens({});
  }

  buildShell() {
    const g = this.group;

    // Low dashboard and side consoles. Geometry intentionally stays below the primary astronomy view.
    const dash = makePanelBox([1.34, 0.12, 0.46], [0, -0.43, -0.82], [-0.08, 0, 0], this.shellMaterial);
    g.add(dash);
    const lower = makePanelBox([1.58, 0.19, 0.34], [0, -0.58, -0.62], [-0.18, 0, 0], this.softMaterial);
    g.add(lower);

    const leftConsole = makePanelBox([0.44, 0.18, 0.58], [-0.78, -0.43, -0.68], [-0.10, 0.17, -0.06], this.shellMaterial);
    const rightConsole = makePanelBox([0.44, 0.18, 0.58], [0.78, -0.43, -0.68], [-0.10, -0.17, 0.06], this.shellMaterial);
    g.add(leftConsole, rightConsole);
    for (let i = 0; i < 5; i += 1) {
      const y = -0.405 + i * 0.026;
      g.add(makePanelBox([0.17, 0.008, 0.018], [-0.86, y, -0.925], [0, 0.17, 0], this.trimMaterial));
      g.add(makePanelBox([0.17, 0.008, 0.018], [0.86, y, -0.925], [0, -0.17, 0], this.trimMaterial));
    }

    // Thin canopy structure inspired by the user's wide-window reference images.
    const beams = [
      [[-0.74, -0.34, -0.94], [-0.63, 0.49, -1.04], 0.026],
      [[0.74, -0.34, -0.94], [0.63, 0.49, -1.04], 0.026],
      [[-0.63, 0.49, -1.04], [-0.19, 0.61, -1.04], 0.020],
      [[0.63, 0.49, -1.04], [0.19, 0.61, -1.04], 0.020],
      [[-0.19, 0.61, -1.04], [0.19, 0.61, -1.04], 0.018],
      [[-0.74, -0.34, -0.94], [-0.98, -0.20, -0.70], 0.020],
      [[0.74, -0.34, -0.94], [0.98, -0.20, -0.70], 0.020],
    ];
    for (const [a, b, r] of beams) g.add(makeBeam(a, b, r, this.trimMaterial));

    // Small center console spine and tactile lip add physical depth without blocking the horizon.
    g.add(makePanelBox([0.14, 0.11, 0.52], [0, -0.48, -0.52], [-0.10, 0, 0], this.trimMaterial));
    g.add(makePanelBox([1.25, 0.025, 0.025], [0, -0.30, -1.025], [0, 0, 0], this.glowStripMaterial));

    // A compact glare shield above the MFD bank; deliberately shallow.
    g.add(makePanelBox([1.28, 0.055, 0.17], [0, -0.245, -0.97], [-0.16, 0, 0], this.shellMaterial));
  }

  addScreen({ id, title, position, rotation, width, height, action, accent }) {
    const buffer = canvasTexture(448, 280);
    const material = makeScreenMaterial(buffer.texture);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(width + 0.038, height + 0.038, 0.026), this.trimMaterial);
    bezel.position.set(position[0], position[1], position[2] - 0.018);
    bezel.rotation.set(...rotation);
    this.group.add(bezel);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    screen.position.set(...position);
    screen.rotation.set(...rotation);
    screen.userData.cockpitAction = action;
    screen.userData.cockpitInteractive = true;
    screen.renderOrder = 4500;
    this.group.add(screen);
    this.interactives.push(screen);
    this.screenEntries.set(id, { ...buffer, screen, title, accent });
    return screen;
  }

  addButton({ label, action, position, rotation, width = 0.15, accent = '#c8eeff' }) {
    const button = new THREE.Group();
    button.position.set(...position);
    button.rotation.set(...rotation);
    button.userData.cockpitAction = action;
    button.userData.cockpitInteractive = true;

    const bodyMaterial = this.buttonBodyMaterial.clone();
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, 0.105), bodyMaterial);
    body.position.z = 0;
    button.add(body);

    const labelTexture = makeButtonLabel(label, accent);
    const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture, toneMapped: false });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.90, 0.072), labelMaterial);
    face.position.set(0, 0.024, -0.037);
    face.rotation.x = -Math.PI / 2;
    button.add(face);

    this.group.add(button);
    this.interactives.push(body, face);
    body.userData.cockpitAction = action;
    face.userData.cockpitAction = action;
    this.buttonEntries.set(action, { group: button, body, bodyMaterial, labelMaterial, labelTexture });
  }

  buildScreensAndControls() {
    this.addScreen({
      id: 'nav', title: 'NAVIGATION', action: 'nav-screen', accent: '#6fe4ff',
      position: [-0.45, -0.305, -1.025], rotation: [-0.10, 0.10, 0.015], width: 0.39, height: 0.235,
    });
    this.addScreen({
      id: 'flight', title: 'FLIGHT', action: 'flight-screen', accent: '#b7f8ff',
      position: [0, -0.292, -1.045], rotation: [-0.10, 0, 0], width: 0.36, height: 0.225,
    });
    this.addScreen({
      id: 'science', title: 'SCIENCE', action: 'science-screen', accent: '#91ffcf',
      position: [0.45, -0.305, -1.025], rotation: [-0.10, -0.10, -0.015], width: 0.39, height: 0.235,
    });

    const y = -0.455;
    const z = -1.005;
    const rot = [-0.16, 0, 0];
    const xs = [-0.59, -0.45, -0.31, -0.14, 0, 0.14, 0.31, 0.45, 0.59];
    const defs = [
      ['MAP', 'nav-map', '#78e8ff'],
      ['TGT', 'target-cycle', '#78e8ff'],
      ['APPR', 'approach', '#ffd383'],
      ['ENG', 'engine-cycle', '#ffd383'],
      ['PRO', 'prograde', '#d8efff'],
      ['RET', 'retrograde', '#d8efff'],
      ['SCAN', 'scanner', '#94ffd2'],
      ['SCI', 'science', '#94ffd2'],
      ['OVR', 'overlays', '#b4a8ff'],
    ];
    for (let i = 0; i < defs.length; i += 1) {
      const [label, action, accent] = defs[i];
      this.addButton({ label, action, position: [xs[i], y, z], rotation: rot, width: i === 2 || i === 6 ? 0.13 : 0.115, accent });
    }
  }

  setVisible(visible) { this.group.visible = Boolean(visible); }

  update(telemetry = {}, now = performance.now()) {
    this.lastTelemetry = telemetry;
    if (now - this.lastScreenUpdateAt >= SCREEN_UPDATE_MS) {
      this.drawScreens(telemetry);
      this.lastScreenUpdateAt = now;
    }
    this.updateButtonStates(telemetry, now);
  }

  drawScreens(t) {
    const nav = this.screenEntries.get('nav');
    drawScreenFrame(nav.ctx, nav.canvas.width, nav.canvas.height, nav.title, nav.accent);
    drawLine(nav.ctx, 'TARGET', t.targetName || 'NO TARGET', 72, nav.canvas.width, '#e7fbff');
    drawLine(nav.ctx, 'RANGE', formatDistance(t.targetDistanceMeters), 105, nav.canvas.width);
    drawLine(nav.ctx, 'REL V', formatSpeed(t.targetRelativeSpeedMps), 138, nav.canvas.width);
    drawLine(nav.ctx, 'GUIDANCE', String(t.navigationMode || 'MANUAL').toUpperCase(), 171, nav.canvas.width, t.navigationMode === 'approach' ? '#ffd383' : '#cfeeff');
    drawLine(nav.ctx, 'WARP', `${fmt(t.timeScale ?? 1, 0)}×`, 204, nav.canvas.width);
    nav.ctx.fillStyle = '#63c9e7'; nav.ctx.font = '600 16px ui-monospace, monospace'; nav.ctx.fillText('TOUCH SCREEN → SYSTEM MAP', 18, 250);
    nav.texture.needsUpdate = true;

    const flight = this.screenEntries.get('flight');
    drawScreenFrame(flight.ctx, flight.canvas.width, flight.canvas.height, flight.title, flight.accent);
    drawLine(flight.ctx, 'SPEED', formatSpeed(t.shipSpeedMps), 72, flight.canvas.width, '#ffffff');
    drawLine(flight.ctx, 'ENGINE', String(t.engineMode || 'FLIGHT').toUpperCase(), 105, flight.canvas.width, t.engineMode === 'boost' ? '#ffb66f' : '#b8f5ff');
    drawLine(flight.ctx, 'THRUST CAP', `${fmt(t.mainAccelerationMps2, 0)} m/s²`, 138, flight.canvas.width);
    const thrustState = t.braking ? 'BRAKE' : t.reverseThrottle > 0 ? 'REVERSE' : t.throttle > 0 ? 'THRUST' : 'IDLE';
    drawLine(flight.ctx, 'CONTROL', thrustState, 171, flight.canvas.width, thrustState === 'IDLE' ? '#b8d1df' : '#ffd383');
    drawLine(flight.ctx, 'SIM', `${fmt(t.timeScale ?? 1, 0)}× · ${fmt((t.elapsedSimSeconds ?? 0) / 86400, 2)} d`, 204, flight.canvas.width);
    flight.ctx.fillStyle = '#8dddeb'; flight.ctx.font = '600 16px ui-monospace, monospace'; flight.ctx.fillText('TOUCH SCREEN → FLIGHT / SYSTEM', 18, 250);
    flight.texture.needsUpdate = true;

    const science = this.screenEntries.get('science');
    drawScreenFrame(science.ctx, science.canvas.width, science.canvas.height, science.title, science.accent);
    drawLine(science.ctx, 'OBJECT', String(t.targetKind || '—').toUpperCase(), 72, science.canvas.width, '#dfffee');
    drawLine(science.ctx, 'RADIUS', formatRadius(t.targetRadiusMeters), 105, science.canvas.width);
    drawLine(science.ctx, 'TEMP', Number.isFinite(t.targetTemperatureK) ? `${fmt(t.targetTemperatureK, 0)} K` : '—', 138, science.canvas.width);
    drawLine(science.ctx, 'LOCAL g', Number.isFinite(t.targetGravityMps2) ? `${fmt(t.targetGravityMps2, 5)} m/s²` : '—', 171, science.canvas.width);
    drawLine(science.ctx, 'OVERLAYS', t.overlaysEnabled ? 'ACTIVE' : 'STANDBY', 204, science.canvas.width, t.overlaysEnabled ? '#9effcf' : '#9db4c0');
    science.ctx.fillStyle = '#7ee8b7'; science.ctx.font = '600 16px ui-monospace, monospace'; science.ctx.fillText('TOUCH SCREEN → SCIENCE', 18, 250);
    science.texture.needsUpdate = true;
  }

  updateButtonStates(t, now) {
    const active = new Set();
    if (t.navigationMode === 'approach') active.add('approach');
    if (t.overlaysEnabled) active.add('overlays');
    if (t.engineMode === 'boost' || t.engineMode === 'cruise') active.add('engine-cycle');
    for (const [action, entry] of this.buttonEntries) {
      const flashed = (this.flashUntil.get(action) || 0) > now;
      const isActive = active.has(action);
      entry.bodyMaterial.emissive.setHex(flashed ? 0x1b95bb : isActive ? 0x154e61 : 0x000000);
      entry.bodyMaterial.emissiveIntensity = flashed ? 1.8 : isActive ? 0.8 : 0;
    }
  }

  pick(clientX, clientY, renderer, raycaster, pointer) {
    if (!this.group.visible) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.camera.updateMatrixWorld(true);
    this.group.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, this.camera);
    const hits = raycaster.intersectObjects(this.interactives, true);
    for (const hit of hits) {
      let node = hit.object;
      while (node && node !== this.group.parent) {
        if (node.userData?.cockpitAction) {
          const action = node.userData.cockpitAction;
          this.flashUntil.set(action, performance.now() + 220);
          return action;
        }
        node = node.parent;
      }
    }
    return null;
  }

  dispose() {
    for (const entry of this.screenEntries.values()) {
      entry.texture.dispose();
      entry.screen.geometry.dispose();
      entry.screen.material.dispose();
    }
    for (const entry of this.buttonEntries.values()) {
      entry.labelTexture.dispose();
      entry.labelMaterial.dispose();
      entry.bodyMaterial.dispose();
    }
    this.group.traverse((node) => {
      if (node.geometry && ![...this.screenEntries.values()].some((entry) => entry.screen.geometry === node.geometry)) node.geometry.dispose?.();
    });
    this.shellMaterial.dispose();
    this.trimMaterial.dispose();
    this.softMaterial.dispose();
    this.buttonBodyMaterial.dispose();
    this.glowStripMaterial.dispose();
    this.camera.remove(this.group);
  }
}
