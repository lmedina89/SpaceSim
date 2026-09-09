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


function drawDiagnosticsScreen(entry, t) {
  const { canvas, ctx, texture } = entry;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, 'rgba(4,19,28,.92)');
  bg.addColorStop(0.55, 'rgba(2,11,18,.86)');
  bg.addColorStop(1, 'rgba(1,7,12,.78)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(105,232,255,.78)';
  ctx.lineWidth = 4;
  ctx.strokeRect(7, 7, width - 14, height - 14);
  ctx.strokeStyle = 'rgba(105,232,255,.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  ctx.fillStyle = '#8beaff';
  ctx.font = '800 25px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText('SYSTEM DIAGNOSTICS', 24, 42);
  ctx.fillStyle = '#507b8d';
  ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText('LIVE · PILOT DEBUG BUS', 24, 63);
  ctx.fillStyle = 'rgba(105,232,255,.32)';
  ctx.fillRect(24, 75, width - 48, 2);

  const row = (label, value, y, accent = '#eefaff') => {
    ctx.fillStyle = '#7096a9';
    ctx.font = '700 15px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(label, 26, y);
    ctx.fillStyle = accent;
    ctx.font = '800 25px ui-monospace, SFMono-Regular, Menlo, monospace';
    const text = String(value ?? '—');
    const measured = ctx.measureText(text).width;
    ctx.fillText(text, Math.max(26, width - 26 - measured), y);
  };

  row('RENDERER', t.rendererBackend || 'INIT', 111, '#bff6ff');
  row('FPS', Number.isFinite(t.fps) ? `${Math.round(t.fps)}` : '—', 151);
  row('PHYSICS', Number.isFinite(t.physicsMs) ? `${fmt(t.physicsMs, 2)} ms` : '—', 191);
  row('RENDER', Number.isFinite(t.renderMs) ? `${fmt(t.renderMs, 2)} ms` : '—', 231);
  row('SHIP', formatSpeed(t.shipSpeedMps), 271, '#ffffff');
  row('SIM TIME', `${fmt((t.elapsedSimSeconds ?? 0) / 86400, 3)} d`, 311);

  ctx.fillStyle = 'rgba(105,232,255,.24)';
  ctx.fillRect(24, 333, width - 48, 2);

  const compact = (label, value, y, accent = '#d9f7ff') => {
    ctx.fillStyle = '#628697';
    ctx.font = '700 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(label, 26, y);
    ctx.fillStyle = accent;
    ctx.font = '800 20px ui-monospace, SFMono-Regular, Menlo, monospace';
    const text = String(value ?? '—');
    const measured = ctx.measureText(text).width;
    ctx.fillText(text, Math.max(26, width - 26 - measured), y);
  };

  compact('SEED', t.seed || 'ORIGIN-001', 370, '#bfeeff');
  compact('MAJOR', Number.isFinite(t.bodyCount) ? String(t.bodyCount) : '—', 404);
  compact('TEST', Number.isFinite(t.minorCount) ? Number(t.minorCount).toLocaleString() : '—', 438);
  compact('DRAW', Number.isFinite(t.drawCalls) ? String(t.drawCalls) : '—', 472);
  compact('PRED', Number.isFinite(t.predictionMs) ? `${fmt(t.predictionMs, 2)} ms` : '—', 506);
  compact('EXP', Number.isFinite(t.experimentParticles) ? Number(t.experimentParticles).toLocaleString() : '0', 540, '#b7ffd7');
  compact('LAB', Number.isFinite(t.experimentMs) ? `${fmt(t.experimentMs, 2)} ms` : '0 ms', 574, '#b7ffd7');

  ctx.fillStyle = 'rgba(105,232,255,.18)';
  ctx.fillRect(24, 602, width - 48, 2);
  ctx.fillStyle = '#6fbfd3';
  ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TOUCH → FLIGHT / SYSTEM', width / 2, 632);
  ctx.textAlign = 'start';
  ctx.fillStyle = 'rgba(105,232,255,.06)';
  for (let y = 90; y < 600; y += 28) ctx.fillRect(18, y, width - 36, 1);
  texture.needsUpdate = true;
}

function makeScreenMaterial(texture, { holographic = false } = {}) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    transparent: holographic,
    opacity: holographic ? 0.94 : 1,
    depthWrite: !holographic,
  });
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
    this.glowStripMaterial = new THREE.MeshBasicMaterial({ color: 0x58bde6, transparent: true, opacity: 0.52, toneMapped: false });
    this.utilityGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xe3ad64, transparent: true, opacity: 0.20, toneMapped: false });
    this.statusLights = new Map();

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

    // Restrained instrument illumination: emissive geometry only (no extra dynamic lights on mobile).
    g.add(makePanelBox([1.18, 0.014, 0.018], [0, -0.318, -0.905], [0, 0, 0], this.glowStripMaterial));
    g.add(makePanelBox([0.28, 0.010, 0.018], [-0.82, -0.355, -0.845], [0, 0.17, 0], this.utilityGlowMaterial));
    g.add(makePanelBox([0.28, 0.010, 0.018], [0.82, -0.355, -0.845], [0, -0.17, 0], this.utilityGlowMaterial));

    // Compact glare shield remains behind the MFD faces so it no longer visually slices through them.
    g.add(makePanelBox([1.24, 0.040, 0.12], [0, -0.250, -0.985], [-0.14, 0, 0], this.shellMaterial));

    // Right-side engineering display mount. The actual live pane sits slightly inboard of this
    // physical rail so it reads as a ship-installed holo/MFD rather than a windshield HUD card.
    g.add(makePanelBox([0.080, 0.55, 0.10], [0.925, 0.150, -0.735], [0, -0.26, -0.015], this.shellMaterial));
    g.add(makePanelBox([0.036, 0.53, 0.110], [0.888, 0.150, -0.765], [0, -0.26, -0.015], this.trimMaterial));
    g.add(makePanelBox([0.026, 0.47, 0.018], [0.865, 0.150, -0.790], [0, -0.26, -0.015], this.glowStripMaterial));
    g.add(makeBeam([0.86, -0.12, -0.79], [0.76, -0.31, -0.88], 0.012, this.trimMaterial));
  }

  addScreen({ id, title, position, rotation, width, height, action, accent, bufferWidth = 448, bufferHeight = 280, holographic = false }) {
    const buffer = canvasTexture(bufferWidth, bufferHeight);
    const material = makeScreenMaterial(buffer.texture, { holographic });
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

  addStatusLight({ id, position, activeColor, dimColor = 0x10191d }) {
    const material = new THREE.MeshBasicMaterial({ color: dimColor, toneMapped: false });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 12, 8), material);
    lamp.position.set(...position);
    lamp.renderOrder = 4550;
    this.group.add(lamp);
    this.statusLights.set(id, { lamp, material, activeColor, dimColor });
    return lamp;
  }

  setStatusLight(id, active) {
    const entry = this.statusLights.get(id);
    if (!entry) return;
    entry.material.color.setHex(active ? entry.activeColor : entry.dimColor);
  }

  buildScreensAndControls() {
    // MFD faces are deliberately forward of the glare shield/dash lip so text is never occluded.
    this.addScreen({
      id: 'nav', title: 'NAVIGATION', action: 'nav-screen', accent: '#6fe4ff',
      position: [-0.45, -0.245, -0.895], rotation: [-0.075, 0.095, 0.012], width: 0.39, height: 0.235,
    });
    this.addScreen({
      id: 'flight', title: 'FLIGHT', action: 'flight-screen', accent: '#b7f8ff',
      position: [0, -0.235, -0.905], rotation: [-0.070, 0, 0], width: 0.36, height: 0.225,
    });
    this.addScreen({
      id: 'science', title: 'SCIENCE', action: 'science-screen', accent: '#91ffcf',
      position: [0.45, -0.245, -0.895], rotation: [-0.075, -0.095, -0.012], width: 0.39, height: 0.235,
    });
    this.addScreen({
      id: 'diagnostics', title: 'SYSTEM DIAGNOSTICS', action: 'diagnostics-screen', accent: '#73e8ff',
      position: [0.755, 0.150, -0.815], rotation: [-0.018, -0.26, -0.015], width: 0.250, height: 0.500,
      bufferWidth: 330, bufferHeight: 660, holographic: true,
    });

    // Real status lamps: POWER, TARGET, NAV, PROPULSION and CAUTION.
    // These are indicators only, not fake buttons, and mirror live simulation state.
    const lampY = -0.104;
    const lampZ = -0.895;
    this.addStatusLight({ id: 'power', position: [-0.10, lampY, lampZ], activeColor: 0x72e8ff });
    this.addStatusLight({ id: 'target', position: [-0.05, lampY, lampZ], activeColor: 0x72e8ff });
    this.addStatusLight({ id: 'nav', position: [0.00, lampY, lampZ], activeColor: 0xffc76e });
    this.addStatusLight({ id: 'propulsion', position: [0.05, lampY, lampZ], activeColor: 0xffb15d });
    this.addStatusLight({ id: 'caution', position: [0.10, lampY, lampZ], activeColor: 0xff6158 });

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
    drawLine(nav.ctx, 'GUIDANCE', String(t.navigationMode || 'MANUAL').toUpperCase(), 171, nav.canvas.width, t.navigationMode === 'approach' ? '#ffd383' : t.frameActive ? '#d7c4ff' : '#cfeeff');
    drawLine(nav.ctx, t.frameActive ? 'SIM' : 'WARP', t.frameActive ? '1× LOCK' : `${fmt(t.timeScale ?? 1, 0)}×`, 204, nav.canvas.width, t.frameActive ? '#d7c4ff' : '#cfeeff');
    nav.ctx.fillStyle = '#63c9e7'; nav.ctx.font = '600 16px ui-monospace, monospace'; nav.ctx.fillText('TOUCH SCREEN → SYSTEM MAP', 18, 250);
    nav.texture.needsUpdate = true;

    const flight = this.screenEntries.get('flight');
    if (t.frameActive) {
      drawScreenFrame(flight.ctx, flight.canvas.width, flight.canvas.height, 'FRAME DRIVE', '#c7a9ff');
      drawLine(flight.ctx, 'RANGE', formatDistance(t.targetDistanceMeters), 72, flight.canvas.width, '#ffffff');
      drawLine(flight.ctx, 'FRAME RATE', `${fmt(t.frameMultipleC ?? 0, 0)} c`, 105, flight.canvas.width, '#dcc8ff');
      drawLine(flight.ctx, 'EXIT', 'MATCH TARGET', 138, flight.canvas.width, '#bff6ff');
      drawLine(flight.ctx, 'LOCAL ΔV', formatSpeed(t.targetRelativeSpeedMps), 171, flight.canvas.width, '#dceeff');
      drawLine(flight.ctx, 'ETA', Number.isFinite(t.frameEtaSeconds) ? `${fmt(t.frameEtaSeconds, 1)} s` : '—', 204, flight.canvas.width, '#ffd383');
      flight.ctx.fillStyle = '#c7a9ff'; flight.ctx.font = '600 16px ui-monospace, monospace'; flight.ctx.fillText('SPACECRAFT-ONLY · TAP FRAME TO EXIT', 18, 250);
    } else {
      drawScreenFrame(flight.ctx, flight.canvas.width, flight.canvas.height, flight.title, flight.accent);
      drawLine(flight.ctx, 'SPEED', formatSpeed(t.shipSpeedMps), 72, flight.canvas.width, '#ffffff');
      drawLine(flight.ctx, 'ENGINE', String(t.engineMode || 'FLIGHT').toUpperCase(), 105, flight.canvas.width, t.engineMode === 'boost' ? '#ffb66f' : '#b8f5ff');
      drawLine(flight.ctx, 'THRUST CAP', `${fmt(t.mainAccelerationMps2, 0)} m/s²`, 138, flight.canvas.width);
      const thrustState = t.braking ? 'BRAKE' : t.reverseThrottle > 0 ? 'REVERSE' : t.throttle > 0 ? 'THRUST' : 'IDLE';
      drawLine(flight.ctx, 'CONTROL', thrustState, 171, flight.canvas.width, thrustState === 'IDLE' ? '#b8d1df' : '#ffd383');
      drawLine(flight.ctx, 'SIM', `${fmt(t.timeScale ?? 1, 0)}× · ${fmt((t.elapsedSimSeconds ?? 0) / 86400, 2)} d`, 204, flight.canvas.width);
      flight.ctx.fillStyle = '#8dddeb'; flight.ctx.font = '600 16px ui-monospace, monospace'; flight.ctx.fillText('TOUCH SCREEN → FLIGHT / SYSTEM', 18, 250);
    }
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

    const diagnostics = this.screenEntries.get('diagnostics');
    if (diagnostics) drawDiagnosticsScreen(diagnostics, t);
  }

  updateButtonStates(t, now) {
    this.setStatusLight('power', true);
    this.setStatusLight('target', Boolean(t.targetName));
    this.setStatusLight('nav', Boolean(t.navigationMode && t.navigationMode !== 'manual'));
    this.setStatusLight('propulsion', Boolean(t.frameActive) || t.engineMode === 'boost' || t.engineMode === 'cruise' || t.throttle > 0 || t.reverseThrottle > 0);
    this.setStatusLight('caution', Boolean(t.braking));

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
    this.utilityGlowMaterial.dispose();
    for (const entry of this.statusLights.values()) entry.material.dispose();
    this.camera.remove(this.group);
  }
}
