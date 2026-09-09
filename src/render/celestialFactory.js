import * as THREE from 'three/webgpu';
import { BODY_KIND, SIMULATION } from '../core/constants.js';
import { createRng } from '../util/prng.js';

function renderRadius(body) {
  const physical = (body.visualRadiusMeters ?? body.radius) / SIMULATION.metersPerRenderUnit;
  if (body.kind === BODY_KIND.STAR) return Math.max(physical, 18);
  if (body.kind === BODY_KIND.BLACK_HOLE) return Math.max(physical, 8);
  if (body.kind === BODY_KIND.NEUTRON_STAR) return Math.max(physical, 3.5);
  if (body.kind === BODY_KIND.WHITE_DWARF) return Math.max(physical, 4.2);
  if (body.kind === BODY_KIND.BROWN_DWARF) return Math.max(physical, 5.5);
  if (body.kind === BODY_KIND.ROGUE_PLANET) return Math.max(physical, 0.95);
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

function makeLimbDarkeningTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.68, 'rgba(0,0,0,0)');
  grad.addColorStop(0.84, 'rgba(0,0,0,.08)');
  grad.addColorStop(0.94, 'rgba(0,0,0,.24)');
  grad.addColorStop(1, 'rgba(0,0,0,.52)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

let sharedLimbDarkening = null;
function limbDarkeningTexture() { sharedLimbDarkening ??= makeLimbDarkeningTexture(); return sharedLimbDarkening; }

function addGlow(group, color, scale, opacity = 0.3) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sprite.scale.set(scale, scale, 1);
  group.add(sprite);
  return sprite;
}

function makeStellarSurfaceTexture(body) {
  const rng = createRng(`${body.id}:${body.name}:stellar-surface-v2`);
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(canvas.width, canvas.height);
  const phases = Array.from({ length: 10 }, () => rng.range(0, Math.PI * 2));
  const freqs = Array.from({ length: 10 }, (_, i) => rng.range(2.2 + i * 0.55, 5.0 + i * 1.2));
  for (let y = 0; y < canvas.height; y += 1) {
    const v = y / canvas.height;
    for (let x = 0; x < canvas.width; x += 1) {
      const u = x / canvas.width;
      let n = 0;
      for (let i = 0; i < phases.length; i += 1) {
        const f = freqs[i];
        n += Math.sin((u * f + Math.sin(v * Math.PI * 2 + phases[(i + 3) % phases.length]) * 0.18) * Math.PI * 2 + phases[i]) * (1 / (1 + i * 0.42));
      }
      const cell = 0.5 + 0.5 * Math.sin((u * 43 + Math.sin(v * 17 + phases[0]) * 1.7) * Math.PI * 2) * Math.sin((v * 31 + phases[1]) * Math.PI * 2);
      const brightness = Math.max(0, Math.min(1, 0.70 + n * 0.055 + (cell - 0.5) * 0.18));
      const value = Math.round(138 + brightness * 117);
      const k = (y * canvas.width + x) * 4;
      image.data[k] = value;
      image.data[k + 1] = Math.min(255, value + 8);
      image.data[k + 2] = Math.min(255, value + 14);
      image.data[k + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addOpacityTaggedMaterial(material, baseOpacity) {
  material.userData.baseOpacity = baseOpacity;
  return material;
}

function createCorona(body, radius) {
  const group = new THREE.Group();
  group.userData.role = 'stellar-corona';
  const color = body.color ?? 0xffd4a0;

  const innerHalo = addGlow(group, color, radius * 4.2, 0.30);
  innerHalo.userData.role = 'stellar-corona-halo-inner';
  addOpacityTaggedMaterial(innerHalo.material, 0.30);
  const outerHalo = addGlow(group, 0xffc58a, radius * 7.6, 0.095);
  outerHalo.userData.role = 'stellar-corona-halo-outer';
  addOpacityTaggedMaterial(outerHalo.material, 0.095);

  // Sparse filamentary micro-corona. Large-scale glow and prominences remain visible at range;
  // this noisy layer is the part perceptual LOD is allowed to reduce.
  const rng = createRng(`${body.id}:${body.name}:corona-v2`);
  const count = 620;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const base = new THREE.Color(color);
  const hot = new THREE.Color(0xffffff);
  const c = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const k = i * 3;
    const r = radius * (1.035 + Math.pow(rng.random(), 2.4) * 0.72);
    const u = rng.range(-1, 1);
    const a = rng.range(0, Math.PI * 2);
    const s = Math.sqrt(1 - u * u);
    const filament = 1 + 0.045 * Math.sin(a * 7 + u * 13 + rng.range(-0.7, 0.7));
    positions[k] = Math.cos(a) * s * r * filament;
    positions[k + 1] = u * r;
    positions[k + 2] = Math.sin(a) * s * r * filament;
    c.copy(base).lerp(hot, rng.range(0.18, 0.72));
    const b = rng.range(0.55, 1);
    colors[k] = c.r * b; colors[k + 1] = c.g * b; colors[k + 2] = c.b * b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = addOpacityTaggedMaterial(new THREE.PointsMaterial({
    size: radius * 0.028, vertexColors: true, transparent: true, opacity: 0.22,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }), 0.22);
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.userData.role = 'stellar-corona-micro';
  group.add(points);
  return group;
}

function createProminence(body, radius, index) {
  const rng = createRng(`${body.id}:${body.name}:prominence:${index}`);
  const group = new THREE.Group();
  group.userData.role = 'stellar-prominence';
  group.userData.phase = rng.range(0, Math.PI * 2);
  group.userData.speed = rng.range(0.010, 0.026) * (index % 2 ? -1 : 1);

  const span = rng.range(0.55, 1.05);
  const height = radius * rng.range(0.34, 0.92);
  const foot = radius * rng.range(0.94, 1.02);
  const start = new THREE.Vector3(-Math.sin(span) * foot, 0, Math.cos(span) * foot);
  const end = new THREE.Vector3(Math.sin(span) * foot, 0, Math.cos(span) * foot);
  const apexZ = Math.cos(span * 0.45) * foot + height;
  const c1 = new THREE.Vector3(start.x * 0.55, height * rng.range(0.65, 1.05), apexZ);
  const c2 = new THREE.Vector3(end.x * 0.55, height * rng.range(0.65, 1.05), apexZ);
  const curve = new THREE.CubicBezierCurve3(start, c1, c2, end);

  const haloMaterial = addOpacityTaggedMaterial(new THREE.MeshBasicMaterial({
    color: index % 2 ? 0xff8d54 : 0xffd59b, transparent: true, opacity: 0.21,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }), 0.21);
  const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, radius * 0.010, 6, false), haloMaterial);
  halo.userData.role = 'stellar-prominence-halo';
  group.add(halo);

  const coreMaterial = addOpacityTaggedMaterial(new THREE.MeshBasicMaterial({
    color: 0xfff1c7, transparent: true, opacity: 0.68,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }), 0.68);
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, radius * 0.0038, 5, false), coreMaterial);
  core.userData.role = 'stellar-prominence-core';
  group.add(core);

  group.rotation.set(rng.range(-1.2, 1.2), rng.range(0, Math.PI * 2), rng.range(-0.7, 0.7));
  return group;
}

function createStellarActiveRegions(body, radius) {
  const rng = createRng(`${body.id}:${body.name}:active-regions`);
  const group = new THREE.Group();
  group.userData.role = 'stellar-active-regions';
  for (let i = 0; i < 9; i += 1) {
    const u = rng.range(-0.82, 0.82);
    const a = rng.range(0, Math.PI * 2);
    const s = Math.sqrt(1 - u * u);
    const sprite = new THREE.Sprite(addOpacityTaggedMaterial(new THREE.SpriteMaterial({
      map: glowTexture(), color: i % 3 === 0 ? 0xffffff : 0xffc171, transparent: true,
      opacity: rng.range(0.16, 0.34), depthWrite: false, blending: THREE.AdditiveBlending,
    }), 0.28));
    sprite.position.set(Math.cos(a) * s * radius * 1.012, u * radius * 1.012, Math.sin(a) * s * radius * 1.012);
    const scale = radius * rng.range(0.16, 0.34);
    sprite.scale.set(scale, scale, 1);
    sprite.userData.role = 'stellar-active-region';
    sprite.userData.phase = rng.range(0, Math.PI * 2);
    sprite.userData.pulse = rng.range(0.16, 0.34);
    sprite.material.userData.baseOpacity = sprite.material.opacity;
    group.add(sprite);
  }
  return group;
}

function createStellarFlareSites(body, radius) {
  const rng = createRng(`${body.id}:${body.name}:flare-sites-v2`);
  const group = new THREE.Group();
  group.userData.role = 'stellar-flare-sites';
  for (let i = 0; i < 3; i += 1) {
    const anchor = new THREE.Group();
    anchor.userData.role = 'stellar-flare';
    anchor.userData.phase = rng.range(0, 1);
    anchor.userData.period = rng.range(18, 34);
    anchor.userData.duration = rng.range(1.4, 3.2);
    const u = rng.range(-0.72, 0.72), a = rng.range(0, Math.PI * 2), s = Math.sqrt(1 - u * u);
    const outward = new THREE.Vector3(Math.cos(a) * s, u, Math.sin(a) * s);
    anchor.position.copy(outward.clone().multiplyScalar(radius * 1.03));
    anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward);

    const flash = new THREE.Sprite(addOpacityTaggedMaterial(new THREE.SpriteMaterial({
      map: glowTexture(), color: 0xfff1c8, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }), 0.74));
    flash.userData.role = 'stellar-flare-flash';
    flash.scale.set(radius * 0.42, radius * 0.42, 1);
    anchor.add(flash);

    const jet = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 0.045, radius * 0.72, 10, 1, true),
      addOpacityTaggedMaterial(new THREE.MeshBasicMaterial({
        color: 0xffd08a, transparent: true, opacity: 0, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }), 0.34),
    );
    jet.userData.role = 'stellar-flare-jet';
    jet.position.y = radius * 0.34;
    anchor.add(jet);
    group.add(anchor);
  }
  return group;
}

export function applyStellarPerceptualProfile(visual, profile) {
  if (!visual || !profile) return;
  visual.traverse((node) => {
    const role = node.userData?.role;
    const material = node.material;
    if (!material || material.userData?.baseOpacity == null) return;
    const base = material.userData.baseOpacity;
    if (role === 'stellar-granulation') material.opacity = base * (0.12 + profile.surfaceDetail * 0.88);
    else if (role === 'stellar-corona-micro') material.opacity = base * profile.microCorona;
    else if (role === 'stellar-prominence-halo' || role === 'stellar-prominence-core') material.opacity = Math.min(1, base * profile.distantMacroBoost);
    else if (role === 'stellar-corona-halo-inner' || role === 'stellar-corona-halo-outer') material.opacity = Math.min(1, base * profile.haloBoost);
    else if (role === 'stellar-active-region') material.opacity = Math.min(1, base * (0.25 + profile.surfaceDetail * 0.75));
  });
  visual.userData.stellarPerceptualProfile = profile;
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

  if (body.compactType === 'magnetar') {
    const lobes = new THREE.Group();
    lobes.userData.role = 'magnetar-lobes';
    for (let i = 0; i < 7; i += 1) {
      const loop = new THREE.Mesh(
        new THREE.TorusGeometry(radius * (2.0 + i * 0.62), Math.max(radius * 0.018, 0.025), 8, 128, Math.PI * 1.55),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x7beaff : 0xe4c4ff, transparent: true, opacity: 0.22 - i * 0.018, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      loop.rotation.set(0.25 + i * 0.22, i * 0.73, 0.18 + i * 0.31);
      lobes.add(loop);
    }
    const rng = createRng(`${body.id}:${body.name}:magnetar-bursts`);
    const count = 1200, positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const k = i * 3, r = radius * rng.range(1.4, 8.0), a = rng.range(0, Math.PI * 2), u = rng.range(-1, 1), q = Math.sqrt(1 - u*u);
      positions[k] = Math.cos(a) * q * r; positions[k + 1] = u * r; positions[k + 2] = Math.sin(a) * q * r;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sparks = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xb9f6ff, size: Math.max(0.035, radius * 0.06), transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending }));
    sparks.frustumCulled = false; lobes.add(sparks); group.add(lobes);
  }

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

function createWhiteDwarfVisual(group, body, radius) {
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 36, 24), new THREE.MeshBasicMaterial({ color: body.color ?? 0xe8f7ff }));
  group.add(core);
  addGlow(group, 0xeefaff, radius * 7.5, 0.5);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.45, Math.max(.035, radius * .025), 8, 96), new THREE.MeshBasicMaterial({ color: 0x8edcff, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.rotation.x = 1.15; halo.userData.role = 'white-dwarf-halo'; group.add(halo);
  group.userData.visualScientificStatus = 'Compact white-dwarf visual proxy; luminosity/spectrum and degenerate-matter physics are not solved.';
}

function createBrownDwarfVisual(group, body, radius) {
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 22), new THREE.MeshStandardMaterial({ color: body.color ?? 0xa45b3d, roughness: .78, metalness: 0, emissive: 0x6f2419, emissiveIntensity: .12 }));
  group.add(core);
  for (let i = 0; i < 5; i += 1) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius * (1.002 + i*.001), radius * (.035 + i*.008), 8, 96), new THREE.MeshBasicMaterial({ color: i%2 ? 0xdc7b52 : 0x63314a, transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending }));
    band.rotation.x = Math.PI/2; band.position.y = radius * (-.55 + i*.27); band.scale.x = Math.sqrt(Math.max(.05,1-(band.position.y/radius)**2)); band.scale.z = band.scale.x; group.add(band);
  }
  addGlow(group, 0xb74f3e, radius * 4.5, .16);
  group.userData.visualScientificStatus = 'Brown-dwarf atmospheric bands/glow are visual proxies; chemistry, convection and stellar evolution are not modeled.';
}

function createRoguePlanetVisual(group, body, radius) {
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 20), new THREE.MeshStandardMaterial({ color: body.color ?? 0x263d58, roughness: .9, metalness: .02, emissive: 0x0a1728, emissiveIntensity: .16 }));
  group.add(core);
  const rim = addGlow(group, 0x517ca6, radius * 4.8, .09); rim.userData.role = 'rogue-thermal-rim';
  group.userData.visualScientificStatus = 'Cold rogue-planet appearance is illustrative; atmosphere, internal heat and formation history are not modeled.';
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
  group.userData.bodyKind = body.kind;
  const radius = renderRadius(body);

  if (body.kind === BODY_KIND.BLACK_HOLE) {
    createBlackHoleVisual(group, body, radius);
  } else if (body.kind === BODY_KIND.NEUTRON_STAR) {
    createNeutronStarVisual(group, body, radius);
  } else if (body.kind === BODY_KIND.WHITE_DWARF) {
    createWhiteDwarfVisual(group, body, radius);
  } else if (body.kind === BODY_KIND.BROWN_DWARF) {
    createBrownDwarfVisual(group, body, radius);
  } else if (body.kind === BODY_KIND.ROGUE_PLANET) {
    createRoguePlanetVisual(group, body, radius);
  } else if (body.kind === BODY_KIND.COMET) {
    createCometVisual(group, body, radius);
  } else {
    const bodyColor = body.color ?? 0x888888;
    const material = body.kind === BODY_KIND.STAR
      ? new THREE.MeshBasicMaterial({ color: bodyColor })
      : new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.82, metalness: 0.02, emissive: bodyColor, emissiveIntensity: 0.13 });
    const geometry = new THREE.SphereGeometry(radius, body.kind === BODY_KIND.STAR ? 56 : 24, body.kind === BODY_KIND.STAR ? 36 : 16);
    const mesh = new THREE.Mesh(geometry, material);
    if (body.kind === BODY_KIND.STAR) mesh.userData.role = 'stellar-photosphere';
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
      // Close-range photosphere detail is a separate visual layer so it can fade smoothly
      // without changing the star's physical radius or long-range brightness.
      const granulationMaterial = addOpacityTaggedMaterial(new THREE.MeshBasicMaterial({
        color: bodyColor, map: makeStellarSurfaceTexture(body), transparent: true, opacity: 0.50,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }), 0.50);
      granulationMaterial.userData.disposeMap = true;
      const granulation = new THREE.Mesh(geometry.clone(), granulationMaterial);
      granulation.scale.setScalar(1.0015);
      granulation.renderOrder = 2;
      granulation.userData.role = 'stellar-granulation';
      group.add(granulation);

      const limb = new THREE.Sprite(new THREE.SpriteMaterial({
        map: limbDarkeningTexture(), color: 0x000000, transparent: true, opacity: 0.76,
        depthWrite: false, depthTest: false, blending: THREE.NormalBlending,
      }));
      limb.scale.set(radius * 2.035, radius * 2.035, 1);
      limb.renderOrder = 8;
      limb.userData.role = 'stellar-limb-darkening';
      group.add(limb);

      group.add(createCorona(body, radius));
      for (let i = 0; i < 5; i += 1) group.add(createProminence(body, radius, i));
      group.add(createStellarActiveRegions(body, radius));
      group.add(createStellarFlareSites(body, radius));
      group.userData.stellarVisualTime = 0;
      group.userData.visualScientificStatus = 'Layered photosphere/granulation, corona, prominence and flare visuals are perceptual proxies; stellar MHD, radiative transfer and convection are not numerically solved.';
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
    visual.userData.stellarVisualTime = (visual.userData.stellarVisualTime ?? 0) + dt;
    const visualTime = visual.userData.stellarVisualTime;
    const profile = visual.userData.stellarPerceptualProfile;
    for (const child of visual.children) {
      if (child.userData?.role === 'stellar-corona') child.rotation.y -= dt * 0.018;
      if (child.userData?.role === 'stellar-prominence') {
        child.rotation.z += dt * (child.userData.speed ?? 0.018);
        child.rotation.x += dt * 0.0025 * Math.sin(visualTime * 0.23 + (child.userData.phase ?? 0));
      }
      if (child.userData?.role === 'stellar-active-regions') {
        for (const region of child.children) {
          const base = region.material?.userData?.baseOpacity ?? 0.24;
          const detail = 0.25 + (profile?.surfaceDetail ?? 1) * 0.75;
          const pulse = 0.82 + (region.userData.pulse ?? 0.2) * Math.sin(visualTime * 0.7 + (region.userData.phase ?? 0));
          if (region.material) region.material.opacity = Math.max(0, Math.min(1, base * detail * pulse));
        }
      }
      if (child.userData?.role === 'stellar-flare-sites') {
        for (const flare of child.children) {
          const period = Math.max(8, flare.userData.period ?? 24);
          const duration = Math.min(period * 0.35, Math.max(0.5, flare.userData.duration ?? 2));
          const phaseSeconds = (flare.userData.phase ?? 0) * period;
          const cycle = (visualTime + phaseSeconds) % period;
          const strength = cycle < duration ? Math.sin(Math.PI * cycle / duration) ** 2 : 0;
          for (const part of flare.children) {
            if (!part.material) continue;
            const base = part.material.userData?.baseOpacity ?? 0.5;
            part.material.opacity = base * strength;
            if (part.userData?.role === 'stellar-flare-flash') {
              const scale = visual.userData.renderRadius * (0.28 + strength * 0.72);
              part.scale.set(scale, scale, 1);
            }
          }
        }
      }
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
    const lobes = visual.children.find((child) => child.userData?.role === 'magnetar-lobes');
    if (lobes) { lobes.rotation.y += dt * 0.6; lobes.rotation.z = 0.12 * Math.sin(elapsedSimSeconds / 2.3); }
  } else if (body.kind === BODY_KIND.WHITE_DWARF) {
    visual.rotation.y += dt * 0.18;
    const halo = visual.children.find((child) => child.userData?.role === 'white-dwarf-halo');
    if (halo) halo.rotation.z += dt * 0.22;
  } else if (body.kind === BODY_KIND.BROWN_DWARF || body.kind === BODY_KIND.ROGUE_PLANET) {
    visual.rotation.y += dt * 0.055;
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
