import * as THREE from 'three/webgpu';
import { BODY_KIND, SIMULATION } from '../core/constants.js';
import { createRng } from '../util/prng.js';

function renderRadius(body) {
  const physical = (body.visualRadiusMeters ?? body.radius) / SIMULATION.metersPerRenderUnit;
  if (body.kind === BODY_KIND.STAR) return Math.max(physical, 18);
  if (body.kind === BODY_KIND.BLACK_HOLE) return Math.max(physical, 8);
  if (body.kind === BODY_KIND.NEUTRON_STAR) return Math.max(physical, 3.5);
  if (body.kind === BODY_KIND.PLANET) return Math.max(physical, 0.85);
  if (body.kind === BODY_KIND.MOON) return Math.max(physical, 0.34);
  if (body.kind === BODY_KIND.COMET) return Math.max(physical, 0.08);
  if (body.kind === BODY_KIND.ASTEROID) return Math.max(physical, body.isImpactFragment ? 0.007 : 0.025);
  return Math.max(physical, 0.025);
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.12, 'rgba(255,255,255,.82)');
  grad.addColorStop(0.42, 'rgba(140,120,255,.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

let sharedGlow = null;
function glowTexture() { sharedGlow ??= makeGlowTexture(); return sharedGlow; }

function addGlow(group, color, scale, opacity = 0.3) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sprite.scale.set(scale, scale, 1);
  group.add(sprite);
  return sprite;
}

function createCorona(body, radius) {
  const rng = createRng(`${body.id}:${body.name}:corona`);
  const count = 1_600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const base = new THREE.Color(body.color ?? 0xffd4a0);
  const hot = new THREE.Color(0xffffff);
  const c = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const k = i * 3;
    const r = radius * rng.range(1.04, 1.78);
    const u = rng.range(-1, 1);
    const a = rng.range(0, Math.PI * 2);
    const s = Math.sqrt(1 - u * u);
    positions[k] = Math.cos(a) * s * r;
    positions[k + 1] = u * r;
    positions[k + 2] = Math.sin(a) * s * r;
    c.copy(base).lerp(hot, rng.range(0.05, 0.55));
    colors[k] = c.r; colors[k + 1] = c.g; colors[k + 2] = c.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: radius * 0.055, vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false;
  points.userData.role = 'stellar-corona';
  return points;
}

function createBlackHoleVisual(group, body, radius) {
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  group.add(core);

  const photonGroup = new THREE.Group();
  photonGroup.userData.role = 'photon-rings';
  for (let i = 0; i < 6; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * (1.08 + i * 0.065), Math.max(radius * (0.012 + i * 0.002), 0.035), 8, 128),
      new THREE.MeshBasicMaterial({
        color: i < 2 ? 0xfff5da : i < 4 ? 0xffb95f : 0x77dfff,
        transparent: true,
        opacity: 0.7 - i * 0.075,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    photonGroup.add(ring);
  }
  group.add(photonGroup);

  const rng = createRng(`${body.id}:${body.name}:accretion`);
  const count = body.visualParticleCount ?? 5_200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const inner = radius * 1.25;
  const outer = radius * 5.2;
  const hot = new THREE.Color(0xfff6da);
  const mid = new THREE.Color(0xff8d2f);
  const cool = new THREE.Color(0x6e8fff);
  const temp = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const k = i * 3;
    const q = Math.pow(rng.random(), 1.55);
    const r = inner + q * (outer - inner);
    const a = rng.range(0, Math.PI * 2);
    const thickness = radius * (0.025 + q * 0.15);
    positions[k] = Math.cos(a) * r;
    positions[k + 1] = rng.range(-thickness, thickness);
    positions[k + 2] = Math.sin(a) * r;
    const innerHeat = 1 - q;
    temp.copy(cool).lerp(mid, Math.min(1, innerHeat * 1.5)).lerp(hot, Math.pow(innerHeat, 2.5));
    const approaching = 0.58 + 0.42 * Math.max(0, Math.cos(a - 0.45));
    const brightness = rng.range(0.45, 1.0) * approaching;
    colors[k] = temp.r * brightness; colors[k + 1] = temp.g * brightness; colors[k + 2] = temp.b * brightness;
  }
  const diskGeometry = new THREE.BufferGeometry();
  diskGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  diskGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const diskPoints = new THREE.Points(diskGeometry, new THREE.PointsMaterial({
    size: Math.max(0.10, radius * 0.032), vertexColors: true, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  diskPoints.frustumCulled = false;
  const diskGroup = new THREE.Group();
  diskGroup.rotation.z = 0.18;
  diskGroup.userData.role = 'accretion-disk';
  diskGroup.add(diskPoints);

  for (let i = 0; i < 5; i += 1) {
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(radius * (1.45 + i * 0.67), Math.max(radius * (0.055 + i * 0.012), 0.08), 8, 128),
      new THREE.MeshBasicMaterial({
        color: [0xfff0c4, 0xffa13c, 0xff6b29, 0x91a1ff, 0x586fd6][i],
        transparent: true,
        opacity: 0.28 - i * 0.025,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    torus.rotation.x = Math.PI / 2;
    diskGroup.add(torus);
  }
  group.add(diskGroup);

  if (body.activeAccretion !== false) {
    const jetGroup = new THREE.Group();
    jetGroup.userData.role = 'relativistic-jets-visual';
    for (const sign of [-1, 1]) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.32, radius * 12, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x78caff, transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      cone.position.y = sign * radius * 6.7;
      if (sign < 0) cone.rotation.z = Math.PI;
      jetGroup.add(cone);
    }
    const jetCount = 1_500;
    const jetPositions = new Float32Array(jetCount * 3);
    for (let i = 0; i < jetCount; i += 1) {
      const k = i * 3;
      const sign = i % 2 ? 1 : -1;
      const t = rng.random();
      const radial = radius * rng.range(0.01, 0.22 + t * 0.08);
      const a = rng.range(0, Math.PI * 2);
      jetPositions[k] = Math.cos(a) * radial;
      jetPositions[k + 1] = sign * radius * (1.2 + t * 12);
      jetPositions[k + 2] = Math.sin(a) * radial;
    }
    const jetGeometry = new THREE.BufferGeometry();
    jetGeometry.setAttribute('position', new THREE.BufferAttribute(jetPositions, 3));
    const jets = new THREE.Points(jetGeometry, new THREE.PointsMaterial({
      color: 0x9ee7ff, size: Math.max(0.08, radius * 0.027), transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    jets.frustumCulled = false;
    jetGroup.add(jets);
    group.add(jetGroup);
  }

  addGlow(group, body.color ?? 0x7658ff, radius * 10, 0.16);
  const lensHalo = addGlow(group, 0x9bcfff, radius * 15, 0.06);
  lensHalo.userData.role = 'pseudo-lensing-halo';
  group.userData.visualScientificStatus = 'Active-accretion visual proxy with photon-ring and lens-halo cues; not a GR ray tracer or plasma solver.';
}

function createNeutronStarVisual(group, body, radius) {
  const color = body.color ?? 0xbfe8ff;
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 22),
    new THREE.MeshBasicMaterial({ color }),
  );
  group.add(star);
  addGlow(group, color, radius * 6, 0.5);

  const magnetosphere = new THREE.Group();
  magnetosphere.userData.role = 'magnetosphere';
  for (let i = 0; i < 5; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * (1.65 + i * 0.55), Math.max(radius * 0.025, 0.03), 8, 96),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0x8f6cff : 0x79eaff, transparent: true, opacity: 0.26 - i * 0.025, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    ring.rotation.set(0.35 + i * 0.2, 0.4 + i * 0.31, 0.2 * i);
    magnetosphere.add(ring);
  }
  group.add(magnetosphere);

  if (body.compactType === 'pulsar') {
    const beamPivot = new THREE.Group();
    beamPivot.userData.role = 'pulsar-beam-pivot';
    beamPivot.rotation.z = 0.35;
    for (const sign of [-1, 1]) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.34, radius * 14, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xb9f4ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      cone.position.y = sign * radius * 7.2;
      if (sign < 0) cone.rotation.z = Math.PI;
      beamPivot.add(cone);
    }
    group.add(beamPivot);
  }
  group.userData.visualScientificStatus = 'Magnetosphere and radiation beams are visualization proxies. Compact-object gravity remains Newtonian outside the model guard.';
}

function createCometVisual(group, body, radius) {
  const nucleus = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, 2),
    new THREE.MeshStandardMaterial({ color: 0xaeb9b7, roughness: 0.95, metalness: 0.0, emissive: 0x7fc9da, emissiveIntensity: 0.05 }),
  );
  group.add(nucleus);
  addGlow(group, 0xc6f3ff, radius * 6, 0.22);

  const rng = createRng(`${body.id}:${body.name}:tail`);
  const tail = new THREE.Group();
  tail.userData.role = 'comet-tail';
  const count = 950;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const white = new THREE.Color(0xe8f7ff);
  const blue = new THREE.Color(0x7bdcff);
  const c = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const k = i * 3;
    const t = Math.pow(rng.random(), 0.72);
    const length = radius * (4 + t * 65);
    const width = radius * (0.35 + t * 4.5);
    positions[k] = length;
    positions[k + 1] = rng.range(-width, width) * rng.random();
    positions[k + 2] = rng.range(-width, width) * rng.random();
    c.copy(white).lerp(blue, t);
    const alpha = 1 - t * 0.75;
    colors[k] = c.r * alpha; colors[k + 1] = c.g * alpha; colors[k + 2] = c.b * alpha;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: Math.max(0.025, radius * 0.22), vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false;
  tail.add(points);
  group.add(tail);
  group.userData.cometTail = tail;
}

export function createCelestialVisual(body) {
  const group = new THREE.Group();
  group.userData.entityId = body.id;
  const radius = renderRadius(body);

  if (body.kind === BODY_KIND.BLACK_HOLE) {
    createBlackHoleVisual(group, body, radius);
  } else if (body.kind === BODY_KIND.NEUTRON_STAR) {
    createNeutronStarVisual(group, body, radius);
  } else if (body.kind === BODY_KIND.COMET) {
    createCometVisual(group, body, radius);
  } else {
    const bodyColor = body.color ?? 0x888888;
    const material = body.kind === BODY_KIND.STAR
      ? new THREE.MeshBasicMaterial({ color: bodyColor })
      : new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.82, metalness: 0.02, emissive: bodyColor, emissiveIntensity: 0.13 });
    const geometry = new THREE.SphereGeometry(radius, body.kind === BODY_KIND.STAR ? 36 : 24, body.kind === BODY_KIND.STAR ? 24 : 16);
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    if (body.kind !== BODY_KIND.STAR) {
      // Exposure-floor shell: visual-only, deliberately faint, and independent of renderer light units.
      // It guarantees a seeded body color remains readable on WebGPU/iOS while the StandardMaterial
      // underneath still supplies the starward day/night shading and terminator.
      const exposureShell = new THREE.Mesh(
        geometry.clone(),
        new THREE.MeshBasicMaterial({ color: bodyColor, transparent: true, opacity: 0.10, depthWrite: false }),
      );
      exposureShell.scale.setScalar(1.002);
      exposureShell.renderOrder = 1;
      group.add(exposureShell);
    }
    if (body.kind === BODY_KIND.STAR) {
      group.add(createCorona(body, radius));
      for (let i = 0; i < 3; i += 1) {
        const prominence = new THREE.Mesh(
          new THREE.TorusGeometry(radius * (1.18 + i * 0.10), radius * 0.035, 8, 96, Math.PI * 1.35),
          new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff884c : 0xffd07e, transparent: true, opacity: 0.15, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        prominence.rotation.set(i * 0.7, i * 1.1, i * 0.4);
        prominence.userData.role = 'stellar-prominence';
        group.add(prominence);
      }
    }
  }

  if (body.kind === BODY_KIND.STAR) addGlow(group, body.color ?? 0xffffff, radius * 6, 0.55);

  group.userData.renderRadius = radius;
  group.userData.visualVersion = body.visualVersion ?? 0;
  group.userData.bodyColor = body.color ?? null;
  return group;
}

export function updateCelestialVisual(visual, body, starBody, realDt = 0.016, elapsedSimSeconds = 0) {
  if (!visual) return;
  const dt = Math.min(0.05, Math.max(0, realDt));
  if (body.kind === BODY_KIND.PLANET) visual.rotation.y += dt * 0.09;
  else if (body.kind === BODY_KIND.MOON || body.kind === BODY_KIND.ASTEROID) visual.rotation.y += dt * 0.035;
  else if (body.kind === BODY_KIND.STAR) {
    visual.rotation.y += dt * 0.015;
    for (const child of visual.children) {
      if (child.userData?.role === 'stellar-corona') child.rotation.y -= dt * 0.025;
      if (child.userData?.role === 'stellar-prominence') child.rotation.z += dt * 0.03;
    }
  } else if (body.kind === BODY_KIND.BLACK_HOLE) {
    const disk = visual.children.find((child) => child.userData?.role === 'accretion-disk');
    const photons = visual.children.find((child) => child.userData?.role === 'photon-rings');
    const jets = visual.children.find((child) => child.userData?.role === 'relativistic-jets-visual');
    if (disk) disk.rotation.y += dt * 0.32;
    if (photons) photons.rotation.y -= dt * 0.07;
    if (jets) jets.rotation.y += dt * 0.04;
  } else if (body.kind === BODY_KIND.NEUTRON_STAR) {
    const magnetosphere = visual.children.find((child) => child.userData?.role === 'magnetosphere');
    const beam = visual.children.find((child) => child.userData?.role === 'pulsar-beam-pivot');
    const period = Math.max(0.02, Number(body.spinPeriodSeconds) || 0.65);
    const spin = Math.min(18, (Math.PI * 2) / period);
    visual.rotation.y += dt * Math.min(8, spin * 0.15);
    if (magnetosphere) magnetosphere.rotation.y -= dt * Math.min(4, spin * 0.08);
    if (beam) beam.rotation.y = (elapsedSimSeconds * spin) % (Math.PI * 2);
  } else if (body.kind === BODY_KIND.COMET) {
    const nucleus = visual.children.find((child) => child.isMesh && child.geometry?.type === 'IcosahedronGeometry');
    if (nucleus) { nucleus.rotation.x += dt * 0.13; nucleus.rotation.y += dt * 0.2; }
    const tail = visual.userData.cometTail;
    if (tail && starBody) {
      const dx = body.position[0] - starBody.position[0];
      const dy = body.position[1] - starBody.position[1];
      const dz = body.position[2] - starBody.position[2];
      const m = Math.hypot(dx, dy, dz) || 1;
      const away = new THREE.Vector3(dx / m, dy / m, dz / m);
      tail.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), away);
      const activity = Math.max(0.15, Math.min(1.5, (2.2 * 149_597_870_700) / Math.max(149_597_870_700 * 0.18, m)));
      tail.scale.setScalar(activity);
      tail.visible = m < 6.5 * 149_597_870_700;
    }
  }
}
