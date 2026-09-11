import * as THREE from 'three/webgpu';
import { BODY_KIND, SIMULATION } from '../core/constants.js';
import { createRng } from '../util/prng.js';
import { solveOrbitalAtmosphereLimb } from '../physics/atmosphericOptics.js';
import { blackHoleAppearanceProfile, nearOrbitDetailProfile, neutronStarAppearanceProfile, planetaryMaterialProfile } from './celestialRealism.js';

function renderRadius(body) {
  const strictPhysicalDisk = body.kind === BODY_KIND.PLANET || body.kind === BODY_KIND.MOON || body.kind === BODY_KIND.ROGUE_PLANET;
  const physicalRadiusMeters = strictPhysicalDisk ? body.radius : (body.visualRadiusMeters ?? body.radius);
  const physical = physicalRadiusMeters / SIMULATION.metersPerRenderUnit;
  if (body.kind === BODY_KIND.STAR) return Math.max(physical, 18);
  if (body.kind === BODY_KIND.BLACK_HOLE) return Math.max(physical, 8);
  if (body.kind === BODY_KIND.NEUTRON_STAR) return Math.max(physical, 3.5);
  if (body.kind === BODY_KIND.WHITE_DWARF) return Math.max(physical, 4.2);
  if (body.kind === BODY_KIND.BROWN_DWARF) return Math.max(physical, 5.5);
  // Resolved planets/moons use their physical radius in render units. Distant discovery remains
  // a UI-marker responsibility rather than inflating the physical celestial disk.
  if (body.kind === BODY_KIND.ROGUE_PLANET) return Math.max(physical, 0.003);
  if (body.kind === BODY_KIND.PLANET) return Math.max(physical, 0.003);
  if (body.kind === BODY_KIND.MOON) return Math.max(physical, 0.003);
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



function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }

function makePlanetarySurfaceMaps(body, profile) {
  const width = profile.textureWidth;
  const height = profile.textureHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width; bumpCanvas.height = height;
  const ctx = canvas.getContext('2d');
  const bumpCtx = bumpCanvas.getContext('2d');
  const image = ctx.createImageData(width, height);
  const bumpImage = bumpCtx.createImageData(width, height);
  const rng = createRng(`${body.id}:${body.name}:celestial-surface-v1`);
  const phases = Array.from({ length: 8 }, () => rng.range(0, Math.PI * 2));
  const base = new THREE.Color(body.color ?? 0x888888);
  const baseRgb = [base.r, base.g, base.b];
  const craters = profile.gas ? [] : Array.from({ length: body.kind === BODY_KIND.MOON ? 10 : 6 }, () => ({
    u: rng.random(), v: rng.range(0.12, 0.88), r: rng.range(0.018, body.kind === BODY_KIND.MOON ? 0.075 : 0.052), depth: rng.range(0.12, 0.34),
  }));
  const storms = profile.gas ? Array.from({ length: 4 }, () => ({ u:rng.random(), v:rng.range(.22,.78), rx:rng.range(.035,.095), ry:rng.range(.012,.045), gain:rng.range(.12,.28) })) : [];

  for (let y = 0; y < height; y += 1) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI;
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      let n = 0;
      n += Math.sin((u * 3.1 + Math.sin(v * 6.7 + phases[0]) * .11) * Math.PI * 2 + phases[1]) * .42;
      n += Math.sin((u * 8.3 - v * 3.7) * Math.PI * 2 + phases[2]) * .24;
      n += Math.sin((u * 21.7 + Math.cos(v * 17.2 + phases[3]) * .07) * Math.PI * 2) * .13;
      n += Math.sin((u * 53.0 + v * 37.0) * Math.PI * 2 + phases[4]) * .055;
      let heightSignal = n;
      let local = n * profile.baseContrast;

      if (profile.gas) {
        const bands = Math.sin(lat * 18 + phases[5]) * .42 + Math.sin(lat * 43 + phases[6]) * .17;
        local = bands * profile.bandStrength + n * .09;
        for (const spot of storms) {
          let du = Math.abs(u - spot.u); du = Math.min(du, 1 - du);
          const dv = v - spot.v;
          const d2 = (du*du)/(spot.rx*spot.rx) + (dv*dv)/(spot.ry*spot.ry);
          if (d2 < 1) local += (1-d2) * spot.gain;
        }
        heightSignal = 0;
      } else {
        for (const crater of craters) {
          let du = Math.abs(u - crater.u); du = Math.min(du, 1 - du);
          const dv = v - crater.v;
          const cosLat = Math.max(.25, Math.cos(lat));
          const d = Math.hypot(du * cosLat, dv) / crater.r;
          if (d < 1) {
            const bowl = -(1 - d*d) * crater.depth;
            const rim = Math.exp(-(((d-.86)/.10)**2)) * crater.depth * .68;
            local += bowl + rim;
            heightSignal += bowl + rim;
          }
        }
      }

      let r = baseRgb[0], g = baseRgb[1], b = baseRgb[2];
      if (profile.id === 'ice-rock') {
        const ice = profile.ice;
        r = 0.55 + ice*.30; g = 0.64 + ice*.27; b = 0.72 + ice*.26;
        const darkRock = clamp01((local + .33) * 1.6);
        r *= .72 + darkRock*.30; g *= .74 + darkRock*.29; b *= .76 + darkRock*.28;
      } else if (profile.id === 'volatile-rock') {
        const land = clamp01(.50 + local * 1.45);
        const ocean = [baseRgb[0]*.58, baseRgb[1]*.70, Math.min(1, baseRgb[2]*1.13+.06)];
        const continent = [Math.min(1, baseRgb[0]*1.14+.06), Math.min(1, baseRgb[1]*1.08+.04), baseRgb[2]*.76];
        const edge = land > .52 ? 1 : 0;
        r = edge ? continent[0] : ocean[0]; g = edge ? continent[1] : ocean[1]; b = edge ? continent[2] : ocean[2];
        const mod = .86 + local*.20; r*=mod; g*=mod; b*=mod;
      } else {
        const mod = .82 + local * .42;
        r *= mod; g *= mod; b *= mod;
        if (profile.desert) { r = Math.min(1, r*1.09); g = Math.min(1, g*1.02); b *= .84; }
      }
      if (profile.gas) {
        const mod = .88 + local*.34; r*=mod; g*=mod; b*=mod;
      }
      const k = (y * width + x) * 4;
      image.data[k] = Math.round(clamp01(r) * 255);
      image.data[k+1] = Math.round(clamp01(g) * 255);
      image.data[k+2] = Math.round(clamp01(b) * 255);
      image.data[k+3] = 255;
      const hv = Math.round(clamp01(.5 + heightSignal * profile.smallScaleContrast) * 255);
      bumpImage.data[k] = hv; bumpImage.data[k+1] = hv; bumpImage.data[k+2] = hv; bumpImage.data[k+3] = 255;
    }
  }
  ctx.putImageData(image,0,0); bumpCtx.putImageData(bumpImage,0,0);
  const map = new THREE.CanvasTexture(canvas); map.wrapS=THREE.RepeatWrapping; map.wrapT=THREE.ClampToEdgeWrapping; map.colorSpace=THREE.SRGBColorSpace; map.anisotropy=4;
  const bumpMap = new THREE.CanvasTexture(bumpCanvas); bumpMap.wrapS=THREE.RepeatWrapping; bumpMap.wrapT=THREE.ClampToEdgeWrapping; bumpMap.anisotropy=2;
  return { map, bumpMap };
}

function applyCanonicalBodyOrientation(visual, body, elapsedSimSeconds) {
  const axis = body?.rotationAxisInertial;
  const period = Math.abs(Number(body?.rotationPeriodSeconds) || 0);
  if (!Array.isArray(axis) || axis.length < 3 || !(period > 0)) return false;
  const a = new THREE.Vector3(Number(axis[0])||0, Number(axis[1])||1, Number(axis[2])||0);
  if (a.lengthSq() < 1e-12) return false;
  a.normalize();
  const align = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), a);
  const direction = Number(body?.rotationDirection) < 0 ? -1 : 1;
  const epoch = Number(body?.rotationEpochSeconds) || 0;
  const phase0 = Number(body?.rotationPhaseRad) || 0;
  const phase = phase0 + direction * ((Number(elapsedSimSeconds)||0) - epoch) * (Math.PI*2/period);
  const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), phase);
  visual.quaternion.copy(align).multiply(spin);
  return true;
}

export function syncPlanetaryRealismVisual(visual, body, environment) {
  if (!visual || !body) return null;
  const core = visual.children.find((child) => child.userData?.role === 'physical-reflector');
  if (!core?.material) return null;
  const profile = planetaryMaterialProfile(body, environment);
  core.material.roughness = profile.roughness;
  core.material.userData.baseBumpScale = profile.bumpScale;
  core.material.userData.celestialRealismProfile = profile.id;
  core.scale.set(1, 1 - profile.flattening, 1);
  visual.userData.planetaryMaterialProfile = profile;
  // Keep a lightweight reference for lazy near-orbit texture creation. No authoritative
  // body/environment fields are mutated by the renderer.
  visual.userData.planetaryTextureSource = body;
  visual.userData.visualScientificStatusSurface = profile.scientificBoundary;
  return profile;
}

export function applyPlanetaryPerceptualProfile(visual, apparentRadiusRad) {
  const core = visual?.children?.find?.((child) => child.userData?.role === 'physical-reflector');
  if (!core?.material) return null;
  const profile = nearOrbitDetailProfile(apparentRadiusRad);
  const materialProfile = visual.userData?.planetaryMaterialProfile;
  const body = visual.userData?.planetaryTextureSource;
  // Build close-detail maps only after the disk is genuinely resolved. This avoids allocating
  // global textures for every distant body at startup on iPhone Safari.
  if (!core.material.map && body && materialProfile && apparentRadiusRad >= 0.006) {
    const maps = makePlanetarySurfaceMaps(body, materialProfile);
    core.material.map = maps.map;
    core.material.bumpMap = materialProfile.bumpScale > 0 ? maps.bumpMap : null;
    if (!core.material.bumpMap) maps.bumpMap.dispose();
    core.material.bumpScale = materialProfile.bumpScale * profile.bumpMultiplier;
    core.material.color.setRGB(1,1,1);
    core.material.needsUpdate = true;
    core.material.userData.disposeMap = true;
    core.material.userData.disposeBumpMap = Boolean(core.material.bumpMap);
    visual.userData.nearOrbitTextureResident = true;
  }
  const baseBump = Number(core.material.userData?.baseBumpScale) || 0;
  if (core.material.bumpMap) core.material.bumpScale = baseBump * profile.bumpMultiplier;
  core.material.roughness = Math.max(.35, Math.min(1, Number(materialProfile?.roughness ?? .82) - profile.close*.08));
  visual.userData.nearOrbitDetailProfile = profile;
  return profile;
}

function makeStellarSurfaceTexture(body) {
  const rng = createRng(`${body.id}:${body.name}:stellar-surface-v2`);
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(canvas.width, canvas.height);
  const phases = Array.from({ length: 10 }, () => rng.range(0, Math.PI * 2));
  const freqs = Array.from({ length: 10 }, (_, i) => rng.range(2.2 + i * 0.55, 5.0 + i * 1.2));
  const spots = Array.from({ length: 7 }, () => ({ u:rng.random(), v:rng.range(.18,.82), r:rng.range(.018,.055), depth:rng.range(.14,.34) }));
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
      let spotDarkening = 0;
      for (const spot of spots) {
        let du = Math.abs(u - spot.u); du = Math.min(du, 1 - du);
        const dv = v - spot.v;
        const d = Math.hypot(du * Math.max(.25, Math.cos((v-.5)*Math.PI)), dv) / spot.r;
        if (d < 1) spotDarkening = Math.max(spotDarkening, (1-d*d) * spot.depth);
      }
      const brightness = Math.max(0, Math.min(1, 0.70 + n * 0.055 + (cell - 0.5) * 0.18 - spotDarkening));
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
  const profile = blackHoleAppearanceProfile(body);
  group.userData.blackHoleAppearanceProfile = profile;

  // The LAB black hole is deliberately enlarged for readability. Within that visual scale,
  // preserve the Schwarzschild critical-curve / shadow / ISCO ratios rather than stacking
  // arbitrary decorative rings.
  const shadowRadius = radius * profile.shadowRadiusRs;
  const shadow = new THREE.Mesh(
    new THREE.SphereGeometry(shadowRadius, 56, 36),
    new THREE.MeshBasicMaterial({ color: 0x000000, depthWrite: true }),
  );
  shadow.userData.role = 'black-hole-shadow-proxy';
  group.add(shadow);

  const criticalCurve = new THREE.Mesh(
    new THREE.TorusGeometry(radius * profile.criticalCurveRadiusRs, Math.max(radius * 0.020, 0.028), 10, 160),
    addOpacityTaggedMaterial(new THREE.MeshBasicMaterial({
      color: 0xfff2cf, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending,
    }), 0.82),
  );
  criticalCurve.rotation.x = Math.PI / 2;
  criticalCurve.userData.role = 'black-hole-critical-curve';
  group.add(criticalCurve);

  const secondary = new THREE.Mesh(
    new THREE.TorusGeometry(radius * profile.secondaryRingRadiusRs, Math.max(radius * 0.010, 0.018), 8, 160),
    addOpacityTaggedMaterial(new THREE.MeshBasicMaterial({
      color: 0x9ccfff, transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending,
    }), 0.24),
  );
  secondary.rotation.x = Math.PI / 2;
  secondary.userData.role = 'black-hole-secondary-ring';
  group.add(secondary);

  const rng = createRng(`${body.id}:${body.name}:accretion-gr-v1`);
  const count = Math.max(1600, Math.min(Number(body.visualParticleCount) || 5200, 6200));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const inner = radius * profile.iscoRadiusRs;
  const outer = radius * profile.diskOuterRadiusRs;
  const hot = new THREE.Color(0xfff3d2);
  const mid = new THREE.Color(0xff8c32);
  const cool = new THREE.Color(0x697fff);
  const blue = new THREE.Color(0xbfe6ff);
  const temp = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const k = i * 3;
    const q = Math.pow(rng.random(), 1.72);
    const r = inner + q * (outer - inner);
    const a = rng.range(0, Math.PI * 2);
    const thickness = radius * (0.030 + q * 0.19);
    positions[k] = Math.cos(a) * r;
    positions[k + 1] = rng.range(-thickness, thickness) * (0.35 + q * 0.65);
    positions[k + 2] = Math.sin(a) * r;
    const heat = 1 - q;
    temp.copy(cool).lerp(mid, Math.min(1, heat * 1.7)).lerp(hot, Math.pow(heat, 2.2));
    // Screen-space GR beaming is not solved; this is an inclination-independent first-order
    // brightness/color asymmetry cue for approaching vs receding orbital material.
    const losVelocityCue = Math.cos(a - 0.42);
    const boost = 1 + profile.dopplerAsymmetry * losVelocityCue;
    if (losVelocityCue > 0) temp.lerp(blue, Math.min(.22, losVelocityCue*.18));
    const brightness = rng.range(0.56, 1.0) * Math.max(.32, boost);
    colors[k] = temp.r * brightness; colors[k + 1] = temp.g * brightness; colors[k + 2] = temp.b * brightness;
  }
  const diskGeometry = new THREE.BufferGeometry();
  diskGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  diskGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const diskPoints = new THREE.Points(diskGeometry, new THREE.PointsMaterial({
    size: Math.max(0.08, radius * 0.038), vertexColors: true, transparent: true, opacity: 0.92,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  diskPoints.frustumCulled = false;
  const diskGroup = new THREE.Group();
  diskGroup.rotation.z = 0.24;
  diskGroup.rotation.x = 0.11;
  diskGroup.userData.role = 'accretion-disk';
  diskGroup.add(diskPoints);

  // A faint lensed-backside cue bends the far-side disk visually over/under the shadow.
  // It is intentionally a rendering approximation, not a sampled null geodesic solution.
  for (const sign of [-1, 1]) {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(radius * profile.criticalCurveRadiusRs * 1.06, Math.max(radius*.030,.035), 8, 160, Math.PI * .84),
      addOpacityTaggedMaterial(new THREE.MeshBasicMaterial({
        color: sign > 0 ? 0xffb55d : 0x9cb7ff, transparent: true, opacity: .23,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }), .23),
    );
    arc.userData.role = 'black-hole-lensed-disk-cue';
    arc.rotation.set(Math.PI/2, sign * .20, sign > 0 ? -.43 : Math.PI-.43);
    arc.position.y = sign * radius * .08;
    diskGroup.add(arc);
  }
  group.add(diskGroup);

  if (body.activeAccretion !== false) {
    const jetGroup = new THREE.Group();
    jetGroup.userData.role = 'relativistic-jets-visual';
    for (const sign of [-1, 1]) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.28, radius * 15, 24, 1, true),
        addOpacityTaggedMaterial(new THREE.MeshBasicMaterial({
          color: 0x8bd6ff, transparent: true, opacity: 0.035, side: THREE.DoubleSide,
          depthWrite: false, blending: THREE.AdditiveBlending,
        }), 0.035),
      );
      cone.position.y = sign * radius * 8.1;
      if (sign < 0) cone.rotation.z = Math.PI;
      jetGroup.add(cone);
    }
    group.add(jetGroup);
  }

  const lensHalo = addGlow(group, 0xa8d8ff, radius * 18, 0.045);
  lensHalo.userData.role = 'black-hole-lensing-field-cue';
  group.userData.visualScientificStatus = profile.scientificBoundary;
}

function createDipoleFieldGeometry(radius, extentRadii, phi, hemisphereScale = 1) {
  const points = [];
  const L = radius * extentRadii;
  for (let i = 0; i <= 72; i += 1) {
    const theta = 0.22 + (Math.PI - 0.44) * (i / 72);
    const r = L * Math.sin(theta) ** 2;
    const radial = r * Math.sin(theta);
    points.push(new THREE.Vector3(
      Math.cos(phi) * radial,
      Math.cos(theta) * r * hemisphereScale,
      Math.sin(phi) * radial,
    ));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function createNeutronStarVisual(group, body, radius) {
  const color = body.color ?? 0xbfe8ff;
  const profile = neutronStarAppearanceProfile(body);
  group.userData.neutronStarAppearanceProfile = profile;
  const observedColor = new THREE.Color(color);
  const redshiftCue = Math.max(0, Math.min(.18, (Number(profile.gravitationalRedshift) || 0) * .22));
  observedColor.lerp(new THREE.Color(0xffd8c9), redshiftCue);
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    new THREE.MeshBasicMaterial({ color: observedColor }),
  );
  star.userData.role = 'neutron-star-surface';
  group.add(star);
  addGlow(group, color, radius * 5.5, 0.42);

  const magnetosphere = new THREE.Group();
  magnetosphere.userData.role = 'magnetosphere';
  const lineCount = body.compactType === 'magnetar' ? 16 : 10;
  for (let i = 0; i < lineCount; i += 1) {
    const phi = (i / lineCount) * Math.PI * 2;
    const extent = profile.fieldExtentVisualRadii * (0.68 + (i % 4) * 0.105);
    const line = new THREE.Line(
      createDipoleFieldGeometry(radius, extent, phi),
      addOpacityTaggedMaterial(new THREE.LineBasicMaterial({
        color: i % 2 ? 0x91dfff : 0xbda8ff,
        transparent: true,
        opacity: body.compactType === 'magnetar' ? 0.24 : 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }), body.compactType === 'magnetar' ? 0.24 : 0.16),
    );
    line.userData.role = 'dipole-field-line';
    magnetosphere.add(line);
  }
  magnetosphere.rotation.z = body.compactType === 'pulsar' ? 0.31 : 0.18;
  group.add(magnetosphere);

  if (body.compactType === 'magnetar') {
    const lobes = new THREE.Group();
    lobes.userData.role = 'magnetar-lobes';
    const rng = createRng(`${body.id}:${body.name}:magnetar-bursts-v2`);
    // Sparse reconnecting arc cues rather than an isotropic spark cloud.
    for (let i = 0; i < 5; i += 1) {
      const phi = rng.range(0, Math.PI*2);
      const extent = radius * rng.range(3.0, 7.6);
      const pts = [];
      for (let k=0;k<=42;k+=1) {
        const t=k/42;
        const theta=.34 + t*(Math.PI-.68);
        const r=extent*Math.sin(theta)**2;
        const wobble=1+.06*Math.sin(t*Math.PI*5+i);
        pts.push(new THREE.Vector3(Math.cos(phi)*r*Math.sin(theta)*wobble, r*Math.cos(theta), Math.sin(phi)*r*Math.sin(theta)*wobble));
      }
      const arc = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        addOpacityTaggedMaterial(new THREE.LineBasicMaterial({ color:i%2?0xd9c7ff:0xa9f4ff, transparent:true, opacity:.30, depthWrite:false, blending:THREE.AdditiveBlending }), .30),
      );
      arc.userData.role='magnetar-reconnection-arc';
      lobes.add(arc);
    }
    group.add(lobes);
  }

  if (body.compactType === 'pulsar') {
    const beamPivot = new THREE.Group();
    beamPivot.userData.role = 'pulsar-beam-pivot';
    beamPivot.rotation.z = 0.35;
    const height = radius * 15;
    const beamRadius = Math.max(radius*.16, Math.tan(profile.beamOpeningRadians) * height);
    for (const sign of [-1, 1]) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(beamRadius, height, 28, 1, true),
        addOpacityTaggedMaterial(new THREE.MeshBasicMaterial({
          color: 0xb9f4ff, transparent: true, opacity: 0.055, side: THREE.DoubleSide,
          depthWrite: false, blending: THREE.AdditiveBlending,
        }), 0.055),
      );
      cone.position.y = sign * height * .52;
      if (sign < 0) cone.rotation.z = Math.PI;
      beamPivot.add(cone);
    }
    group.add(beamPivot);
  }
  group.userData.visualScientificStatus = profile.scientificBoundary;
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
    const physicalReflector = body.kind === BODY_KIND.PLANET || body.kind === BODY_KIND.MOON;
    const material = body.kind === BODY_KIND.STAR
      ? new THREE.MeshBasicMaterial({ color: bodyColor })
      : new THREE.MeshStandardMaterial({
          color: bodyColor,
          roughness: 0.82,
          metalness: 0.02,
          emissive: physicalReflector ? 0x000000 : bodyColor,
          emissiveIntensity: physicalReflector ? 0 : 0.13,
        });
    const geometry = new THREE.SphereGeometry(radius, body.kind === BODY_KIND.STAR ? 64 : (physicalReflector ? 64 : 28), body.kind === BODY_KIND.STAR ? 40 : (physicalReflector ? 40 : 20));
    const mesh = new THREE.Mesh(geometry, material);
    if (body.kind === BODY_KIND.STAR) mesh.userData.role = 'stellar-photosphere';
    else {
      mesh.userData.role = physicalReflector ? 'physical-reflector' : 'celestial-core';
      mesh.material.userData.baseBodyColor = bodyColor;
    }
    group.add(mesh);
    if (body.kind !== BODY_KIND.STAR && !physicalReflector) {
      // Non-planetary small-body readability proxy retained for legacy experiment objects.
      // Planets and moons intentionally do not receive this shell in the physical-appearance path.
      const exposureShell = new THREE.Mesh(
        geometry.clone(),
        new THREE.MeshBasicMaterial({ color: bodyColor, transparent: true, opacity: 0.10, depthWrite: false }),
      );
      exposureShell.scale.setScalar(1.002);
      exposureShell.renderOrder = 1;
      exposureShell.userData.role = 'small-body-readability-proxy';
      group.add(exposureShell);
    }
    if (body.kind === BODY_KIND.STAR) {
      // The seeded photosphere map is applied to the physical disk so dark starspots can
      // actually subtract brightness instead of existing only inside an additive overlay.
      const stellarSurfaceMap = makeStellarSurfaceTexture(body);
      mesh.material.map = stellarSurfaceMap;
      mesh.material.userData.disposeMap = true;
      mesh.material.needsUpdate = true;
      // A second additive layer retains sub-cell granulation sparkle without altering radius.
      const granulationMaterial = addOpacityTaggedMaterial(new THREE.MeshBasicMaterial({
        color: bodyColor, map: stellarSurfaceMap, transparent: true, opacity: 0.34,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }), 0.34);
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

function hexRgb01(hex = 0xffffff) {
  const value = Number(hex) >>> 0;
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export function syncPlanetaryAtmosphereVisual(visual, body, environment, starBody = null) {
  if (!visual || !body) return null;
  const existing = visual.children.find((child) => child.userData?.role === 'planetary-atmosphere-limb');
  const solidBody = body.kind === BODY_KIND.PLANET || body.kind === BODY_KIND.MOON || body.kind === BODY_KIND.ROGUE_PLANET;
  if (!solidBody || body.planetType === 'gas' || !environment?.physicalSurfaceExists) {
    if (existing) { visual.remove(existing); existing.geometry?.dispose?.(); existing.material?.dispose?.(); }
    return null;
  }
  const optics = solveOrbitalAtmosphereLimb({
    pressurePa: environment.atmospherePressureProxyPa,
    temperatureK: environment.currentEquilibriumTemperatureK ?? environment.equilibriumTemperatureK,
    gravityMps2: environment.surfaceGravityMps2,
    molecularMassAmu: environment.representativeAtmosphereMolecularMassAmu,
    radiusMeters: body.radius,
    starRgb: hexRgb01(starBody?.color ?? 0xffffff),
  });
  if (!optics.visible) {
    if (existing) { visual.remove(existing); existing.geometry?.dispose?.(); existing.material?.dispose?.(); }
    visual.userData.atmosphericOptics = optics;
    return optics;
  }
  const radius = Math.max(1e-9, Number(visual.userData.renderRadius) || renderRadius(body));
  let shell = existing;
  if (!shell) {
    shell = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 20),
      new THREE.MeshBasicMaterial({
        color: 0x7ab9ff,
        transparent: true,
        opacity: optics.opacity,
        depthWrite: false,
        depthTest: true,
        side: THREE.BackSide,
        blending: THREE.NormalBlending,
      }),
    );
    shell.userData.role = 'planetary-atmosphere-limb';
    shell.renderOrder = 3;
    visual.add(shell);
  }
  shell.scale.setScalar(optics.shellRadiusScale);
  shell.material.opacity = optics.opacity;
  shell.material.color.setRGB(...optics.colorRgb);
  shell.visible = true;
  visual.userData.atmosphericOptics = optics;
  visual.userData.visualScientificStatusAtmosphere = optics.scientificBoundary;
  return optics;
}

export function updateCelestialVisual(visual, body, starBody, realDt = 0.016, elapsedSimSeconds = 0, appearanceObservation = null) {
  if (!visual) return;
  const dt = Math.min(0.05, Math.max(0, realDt));
  if (body.kind === BODY_KIND.PLANET || body.kind === BODY_KIND.MOON) {
    const core = visual.children.find((child) => child.userData?.role === 'physical-reflector');
    if (core?.material?.color) {
      const baseColor = Number(core.material.userData?.baseBodyColor ?? body.color ?? 0x888888);
      const stellarVisibility = Math.max(0, Math.min(1, Number(appearanceObservation?.stellarVisibilityAtBody ?? 1)));
      if (core.material.map) core.material.color.setRGB(stellarVisibility, stellarVisibility, stellarVisibility);
      else core.material.color.setHex(baseColor).multiplyScalar(stellarVisibility);
    }
  }
  if (body.kind === BODY_KIND.PLANET || body.kind === BODY_KIND.MOON) {
    if (!applyCanonicalBodyOrientation(visual, body, elapsedSimSeconds)) visual.rotation.y += dt * (body.kind === BODY_KIND.PLANET ? 0.09 : 0.035);
  } else if (body.kind === BODY_KIND.ASTEROID) visual.rotation.y += dt * 0.035;
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
    const critical = visual.children.find((child) => child.userData?.role === 'black-hole-critical-curve');
    const secondary = visual.children.find((child) => child.userData?.role === 'black-hole-secondary-ring');
    const jets = visual.children.find((child) => child.userData?.role === 'relativistic-jets-visual');
    if (disk) disk.rotation.y += dt * 0.32;
    if (critical) critical.rotation.z += dt * 0.018;
    if (secondary) secondary.rotation.z -= dt * 0.011;
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
