import * as THREE from 'three/webgpu';
import { createRng } from '../util/prng.js';
import { surfaceColorAt, surfaceHeightAt, surfaceZoneWeights, surfacePois } from '../surface/surfaceGenerator.js';
import { surfaceEyePosition } from '../surface/surfaceSession.js';

function disposeMaterial(material) {
  if (!material) return;
  if (material.map?.userData?.surfaceOwned) material.map.dispose?.();
  material.dispose?.();
}

function disposeTree(root) {
  root?.traverse?.((node) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(disposeMaterial);
    else disposeMaterial(node.material);
  });
}

function cssHex(hex) {
  return `#${(Number(hex) >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
}

function makeSkyTexture(topHex, horizonHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, cssHex(topHex));
  gradient.addColorStop(0.56, cssHex(topHex));
  gradient.addColorStop(0.84, cssHex(horizonHex));
  gradient.addColorStop(1, cssHex(horizonHex));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.surfaceOwned = true;
  return texture;
}

function makeGlowTexture(color = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.12, color);
  const rgb = color.match(/^#([0-9a-f]{6})$/i);
  const mid = rgb ? `rgba(${parseInt(rgb[1].slice(0,2),16)},${parseInt(rgb[1].slice(2,4),16)},${parseInt(rgb[1].slice(4,6),16)},0.33)` : 'rgba(255,255,255,0.33)';
  gradient.addColorStop(0.45, mid);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.surfaceOwned = true;
  return texture;
}

function poiColor(poi) {
  if (poi.realityClass === 'impossible') return 0xff62cf;
  if (poi.realityClass === 'anomalous') return 0xa97cff;
  if (poi.realityClass === 'speculative') return 0x62f5d2;
  return 0xffd27a;
}

function placeOnGround(group, region, x, z, yOffset = 0) {
  group.position.set(x, surfaceHeightAt(region, x, z) + yOffset, z);
}

function createTerrain(region) {
  const size = region.terrainSizeMeters;
  const segments = region.terrainResolution;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i), z = position.getZ(i);
    const y = surfaceHeightAt(region, x, z);
    position.setY(i, y);
    const c = surfaceColorAt(region, x, z, y);
    colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: region.planetType === 'rocky' ? 0.08 : 0.03,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = false;
  return mesh;
}

function createScatter(region, rng) {
  const group = new THREE.Group();
  group.name = 'surface-scatter';
  const dummy = new THREE.Object3D();

  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rockMaterial = new THREE.MeshStandardMaterial({ color: region.palette.rock, roughness: 0.98, metalness: 0.03 });
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 190);
  for (let i = 0; i < rocks.count; i += 1) {
    const x = rng.range(-region.terrainSizeMeters * 0.48, region.terrainSizeMeters * 0.48);
    const z = rng.range(-region.terrainSizeMeters * 0.48, region.terrainSizeMeters * 0.48);
    const y = surfaceHeightAt(region, x, z);
    const s = rng.range(0.8, 4.8) * (rng.random() < 0.08 ? 2.2 : 1);
    dummy.position.set(x, y + s * 0.25, z);
    dummy.rotation.set(rng.range(0, Math.PI), rng.range(0, Math.PI), rng.range(0, Math.PI));
    dummy.scale.set(s * rng.range(0.7, 1.4), s * rng.range(0.45, 1), s * rng.range(0.7, 1.4));
    dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
  }
  group.add(rocks);

  const frostGeometry = new THREE.ConeGeometry(1, 6, 4);
  const frostMaterial = new THREE.MeshStandardMaterial({ color: 0xb7e6ed, roughness: 0.48, metalness: 0.12, emissive: 0x163c48, emissiveIntensity: 0.35 });
  const frost = new THREE.InstancedMesh(frostGeometry, frostMaterial, 52);
  for (let i = 0; i < frost.count; i += 1) {
    const a = rng.range(0, Math.PI * 2), rr = Math.sqrt(rng.random()) * region.zones.frost.radius * 0.78;
    const x = region.zones.frost.x + Math.cos(a) * rr, z = region.zones.frost.z + Math.sin(a) * rr;
    const y = surfaceHeightAt(region, x, z);
    const s = rng.range(0.55, 1.8);
    dummy.position.set(x, y + 2.1 * s, z); dummy.rotation.set(rng.range(-0.15, 0.15), rng.range(0, Math.PI), rng.range(-0.15, 0.15)); dummy.scale.set(s, s, s); dummy.updateMatrix(); frost.setMatrixAt(i, dummy.matrix);
  }
  group.add(frost);

  const crystalGeometry = new THREE.OctahedronGeometry(1, 0);
  const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0x62bda1, roughness: 0.38, metalness: 0.22, emissive: 0x0a332b, emissiveIntensity: 0.5 });
  const crystals = new THREE.InstancedMesh(crystalGeometry, crystalMaterial, 42);
  for (let i = 0; i < crystals.count; i += 1) {
    const a = rng.range(0, Math.PI * 2), rr = Math.sqrt(rng.random()) * region.zones.mineral.radius * 0.74;
    const x = region.zones.mineral.x + Math.cos(a) * rr, z = region.zones.mineral.z + Math.sin(a) * rr;
    const y = surfaceHeightAt(region, x, z), s = rng.range(0.7, 2.8);
    dummy.position.set(x, y + s, z); dummy.rotation.set(rng.range(0, 0.4), rng.range(0, Math.PI), rng.range(0, 0.4)); dummy.scale.set(s * 0.6, s * 1.5, s * 0.6); dummy.updateMatrix(); crystals.setMatrixAt(i, dummy.matrix);
  }
  group.add(crystals);
  return group;
}

function createEmberFissures(region, rng) {
  const positions = [];
  for (let line = 0; line < 18; line += 1) {
    const angle = rng.range(0, Math.PI * 2);
    const rr = rng.range(25, region.zones.ember.radius * 0.7);
    let x = region.zones.ember.x + Math.cos(angle) * rr;
    let z = region.zones.ember.z + Math.sin(angle) * rr;
    for (let s = 0; s < 5; s += 1) {
      const nx = x + rng.range(-18, 18), nz = z + rng.range(-18, 18);
      positions.push(x, surfaceHeightAt(region, x, z) + 0.45, z, nx, surfaceHeightAt(region, nx, nz) + 0.45, nz);
      x = nx; z = nz;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xff6a2f, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false });
  return new THREE.LineSegments(geometry, material);
}

function createBeacon(poi, region) {
  const group = new THREE.Group();
  const color = poiColor(poi);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.5, 0.18, 6, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 9, 5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending }));
  stem.position.y = 4.5; group.add(stem);
  placeOnGround(group, region, poi.x, poi.z, 0.35);
  group.userData.poiId = poi.id;
  group.userData.beaconRing = ring;
  return group;
}

function createFractureGate(poi, region) {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x24172f, roughness: 0.42, metalness: 0.5, emissive: 0x38114f, emissiveIntensity: 0.45 });
  const glowMat = new THREE.MeshBasicMaterial({ color: poi.color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = (x, y, sx, sy, rot = 0) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 1.4), frameMat); mesh.position.set(x, y, 0); mesh.rotation.z = rot; group.add(mesh); };
  beam(-8, 12, 2.2, 24, -0.04); beam(8, 9.5, 2.2, 19, 0.06); beam(-1.5, 23.5, 15, 2.2, 0.08);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(14, 20), glowMat); pane.position.y = 11; group.add(pane);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(6, 0.22, 7, 34), new THREE.MeshBasicMaterial({ color: 0xf1b5ff, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false }));
  inner.position.y = 11; group.add(inner);
  placeOnGround(group, region, poi.x, poi.z, 0);
  group.userData.type = poi.type; group.userData.inner = inner; group.userData.pane = pane;
  return group;
}

function createGravityKnot(poi, region, rng) {
  const group = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({ color: poi.color, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6 + i * 2.2, 0.12, 5, 32), ringMat.clone());
    ring.rotation.set(rng.range(0, Math.PI), rng.range(0, Math.PI), rng.range(0, Math.PI)); group.add(ring);
  }
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x55616a, roughness: 0.82, emissive: 0x07171f, emissiveIntensity: 0.35 });
  for (let i = 0; i < 12; i += 1) {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(rng.range(0.7, 1.9), 0), rockMat);
    const a = (i / 12) * Math.PI * 2; const rr = rng.range(5, 11);
    rock.position.set(Math.cos(a) * rr, rng.range(-3.5, 4.5), Math.sin(a) * rr); rock.userData.orbitAngle = a; rock.userData.orbitRadius = rr; rock.userData.orbitSpeed = rng.range(0.12, 0.28); group.add(rock);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 10), new THREE.MeshBasicMaterial({ color: 0xe7fbff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })); group.add(core);
  placeOnGround(group, region, poi.x, poi.z, 12);
  group.userData.type = poi.type; group.userData.core = core;
  return group;
}

function createFrozenLightning(poi, region, rng) {
  const group = new THREE.Group();
  const positions = [];
  for (let branch = 0; branch < 9; branch += 1) {
    let x = rng.range(-6, 6), y = rng.range(5, 18), z = rng.range(-5, 5);
    for (let s = 0; s < 8; s += 1) {
      const nx = x + rng.range(-3.2, 3.2), ny = y + rng.range(1.3, 4.8), nz = z + rng.range(-2.8, 2.8);
      positions.push(x, y, z, nx, ny, nz); x = nx; y = ny; z = nz;
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: poi.color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(line);
  const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture('#9cfbff'), color: poi.color, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false })); orb.scale.set(22, 22, 1); orb.position.y = 18; group.add(orb);
  placeOnGround(group, region, poi.x, poi.z, 0);
  group.userData.type = poi.type; group.userData.glow = orb;
  return group;
}

function createReverseShadow(poi, region) {
  const group = new THREE.Group();
  const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4.5, 24, 4), new THREE.MeshStandardMaterial({ color: 0x050307, roughness: 0.72, metalness: 0.2, emissive: 0x180716, emissiveIntensity: 0.5 }));
  obelisk.position.y = 12; obelisk.rotation.y = Math.PI * 0.25; group.add(obelisk);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute([-4,0,0, 4,0,0, 12,0,-42, -4,0,0, 12,0,-42, -12,0,-42], 3));
  const shadow = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: 0x020006, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false })); shadow.position.y = 0.18; group.add(shadow);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.13, 5, 26), new THREE.MeshBasicMaterial({ color: poi.color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.4; group.add(rim);
  placeOnGround(group, region, poi.x, poi.z, 0);
  group.userData.type = poi.type; group.userData.rim = rim;
  return group;
}

function createVacuumBloom(poi, region) {
  const group = new THREE.Group();
  const petalMaterial = new THREE.MeshBasicMaterial({ color: poi.color, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 8; i += 1) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(2.8, 12, 8), petalMaterial.clone());
    const a = (i / 8) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 5.4, 0, Math.sin(a) * 5.4); petal.scale.set(1.9, 0.35, 0.75); petal.rotation.y = -a; petal.userData.baseAngle = a; group.add(petal);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 10), new THREE.MeshBasicMaterial({ color: 0xe7fff7, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending })); group.add(core);
  placeOnGround(group, region, poi.x, poi.z, 7.5);
  group.userData.type = poi.type; group.userData.core = core;
  return group;
}

function addArch(group, material, x = 0) {
  const pillarGeom = new THREE.BoxGeometry(1.4, 11, 1.4);
  const left = new THREE.Mesh(pillarGeom, material); left.position.set(x - 4.5, 5.5, 0); group.add(left);
  const right = new THREE.Mesh(pillarGeom, material.clone()); right.position.set(x + 4.5, 5.5, 0); group.add(right);
  const top = new THREE.Mesh(new THREE.BoxGeometry(10.4, 1.4, 1.4), material.clone()); top.position.set(x, 11, 0); group.add(top);
}

function createGhostRuin(poi, region) {
  const group = new THREE.Group();
  for (let copy = 0; copy < 3; copy += 1) {
    const layer = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: poi.color, wireframe: true, transparent: true, opacity: 0.32 - copy * 0.07, blending: THREE.AdditiveBlending, depthWrite: false });
    addArch(layer, mat, 0); addArch(layer, mat.clone(), 13);
    layer.position.set(copy * 1.2 - 1.2, copy * 0.25, copy * -0.9 + 0.9); group.add(layer);
  }
  placeOnGround(group, region, poi.x, poi.z, 0);
  group.userData.type = poi.type;
  group.userData.baseY = group.position.y;
  return group;
}

function createChronalShear(poi, region) {
  const group = new THREE.Group();
  for (let i = 0; i < 6; i += 1) {
    const mat = new THREE.MeshBasicMaterial({ color: poi.color, transparent: true, opacity: 0.13 + i * 0.025, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, wireframe: i % 2 === 0 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(13, 25), mat);
    plane.position.set((i - 2.5) * 2.1, 12.5, 0); plane.rotation.y = (i - 2.5) * 0.08; plane.userData.phase = i * 0.73; group.add(plane);
  }
  placeOnGround(group, region, poi.x, poi.z, 0);
  group.userData.type = poi.type;
  return group;
}

function createAnomalyVisual(poi, region, rng) {
  if (poi.type === 'fracture-gate') return createFractureGate(poi, region);
  if (poi.type === 'gravity-knot') return createGravityKnot(poi, region, rng);
  if (poi.type === 'frozen-lightning') return createFrozenLightning(poi, region, rng);
  if (poi.type === 'reverse-shadow') return createReverseShadow(poi, region);
  if (poi.type === 'vacuum-bloom') return createVacuumBloom(poi, region);
  if (poi.type === 'ghost-ruin') return createGhostRuin(poi, region);
  if (poi.type === 'chronal-shear') return createChronalShear(poi, region);
  return createBeacon(poi, region);
}

function createDust(region, rng) {
  const count = 360;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const x = rng.range(-region.terrainSizeMeters * 0.45, region.terrainSizeMeters * 0.45);
    const z = rng.range(-region.terrainSizeMeters * 0.45, region.terrainSizeMeters * 0.45);
    const y = surfaceHeightAt(region, x, z) + rng.range(1, 30);
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xf5d4b8, size: 0.85, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
  return new THREE.Points(geometry, material);
}

function createLandingBeacon(region) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(8, 9, 40), new THREE.MeshBasicMaterial({ color: 0x76eaff, side: THREE.DoubleSide, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; group.add(ring);
  const light = new THREE.PointLight(0x5eeaff, 45, 80, 2); light.position.y = 2.5; group.add(light);
  placeOnGround(group, region, region.landing.x, region.landing.z, 0);
  return group;
}

export class SurfaceWorldVisual {
  constructor(region, body, star) {
    this.region = region;
    this.body = body;
    this.star = star;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(region.palette.skyTop);
    this.scene.fog = new THREE.FogExp2(region.palette.fog, 0.00115 / Math.max(0.3, region.atmosphereAtmProxy));
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.08, 6200);
    this.rng = createRng(`${region.seed}:render`);
    this.poiGroups = new Map();
    this.animated = [];

    const skyTexture = makeSkyTexture(region.palette.skyTop, region.palette.skyHorizon);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 28, 18), new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, depthWrite: false }));
    sky.position.y = 260; this.scene.add(sky);

    const hemi = new THREE.HemisphereLight(region.palette.skyHorizon, 0x17120f, 1.55); this.scene.add(hemi);
    const sunColor = new THREE.Color(star?.color ?? 0xffe1b0);
    this.sun = new THREE.DirectionalLight(sunColor, 3.2); this.sun.position.set(-900, 1250, -520); this.scene.add(this.sun);
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(cssHex(star?.color ?? 0xffe2b0)), color: star?.color ?? 0xffe2b0, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false }));
    sunSprite.scale.set(260, 260, 1); sunSprite.position.set(-1700, 1900, -2600); this.scene.add(sunSprite);

    this.terrain = createTerrain(region); this.scene.add(this.terrain);
    this.scatter = createScatter(region, this.rng); this.scene.add(this.scatter);
    this.emberFissures = createEmberFissures(region, this.rng); this.scene.add(this.emberFissures);
    this.dust = createDust(region, this.rng); this.scene.add(this.dust);
    this.landingBeacon = createLandingBeacon(region); this.scene.add(this.landingBeacon);

    for (const poi of surfacePois(region)) {
      const beacon = createBeacon(poi, region); this.scene.add(beacon); this.poiGroups.set(`${poi.id}:beacon`, beacon);
      if (poi.realityClass === 'known') continue;
      const visual = createAnomalyVisual(poi, region, createRng(`${region.seed}:${poi.id}:visual`));
      this.scene.add(visual); this.poiGroups.set(poi.id, visual); this.animated.push(visual);
    }
  }

  resize(width, height) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  updatePoiState(scannedPoiIds) {
    for (const poi of surfacePois(this.region)) {
      const beacon = this.poiGroups.get(`${poi.id}:beacon`);
      const scanned = scannedPoiIds?.has?.(poi.id);
      if (beacon?.userData?.beaconRing?.material) beacon.userData.beaconRing.material.opacity = scanned ? 0.9 : 0.34;
    }
  }

  animate(timeSeconds) {
    const t = Number(timeSeconds) || 0;
    this.emberFissures.material.opacity = 0.64 + Math.sin(t * 2.2) * 0.16;
    this.dust.rotation.y = t * 0.006;
    this.landingBeacon.rotation.y = t * 0.18;
    for (const group of this.animated) {
      const type = group.userData.type;
      if (type === 'fracture-gate') {
        group.userData.inner.rotation.z = t * 0.23;
        group.userData.pane.material.opacity = 0.18 + (Math.sin(t * 1.7) + 1) * 0.07;
      } else if (type === 'gravity-knot') {
        group.rotation.y = t * 0.09;
        group.userData.core.scale.setScalar(0.85 + Math.sin(t * 2) * 0.12);
        for (const child of group.children) {
          if (child.userData.orbitRadius == null) continue;
          const a = child.userData.orbitAngle + t * child.userData.orbitSpeed;
          child.position.x = Math.cos(a) * child.userData.orbitRadius;
          child.position.z = Math.sin(a) * child.userData.orbitRadius;
          child.rotation.x += 0.006; child.rotation.y += 0.009;
        }
      } else if (type === 'frozen-lightning') {
        group.userData.glow.material.opacity = 0.5 + (Math.sin(t * 8.7) + 1) * 0.16;
      } else if (type === 'reverse-shadow') {
        group.userData.rim.rotation.z = t * 0.11;
      } else if (type === 'vacuum-bloom') {
        const pulse = 1 + Math.sin(t * 1.15) * 0.17;
        group.rotation.y = t * 0.08;
        group.userData.core.scale.setScalar(0.9 + Math.sin(t * 2.3) * 0.12);
        for (const child of group.children) if (child.userData.baseAngle != null) child.scale.y = 0.35 * pulse;
      } else if (type === 'ghost-ruin') {
        group.position.y = (group.userData.baseY ?? group.position.y) + Math.sin(t * 1.4 + group.position.x * 0.01) * 0.18;
      } else if (type === 'chronal-shear') {
        for (const child of group.children) {
          const phase = child.userData.phase ?? 0;
          child.position.z = Math.sin(t * 1.05 + phase) * 1.8;
          child.material.opacity = 0.11 + (Math.sin(t * 1.8 + phase) + 1) * 0.055;
        }
      }
    }
  }

  render(renderer, session, realTimeSeconds) {
    const eye = surfaceEyePosition(session, this.region);
    const bob = session.lastMoveSpeedMps > 0 ? Math.sin(realTimeSeconds * 8.5) * 0.045 : 0;
    this.camera.position.set(eye[0], eye[1] + bob, eye[2]);
    const cp = Math.cos(session.pitch), sp = Math.sin(session.pitch), sy = Math.sin(session.yaw), cy = Math.cos(session.yaw);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(eye[0] + sy * cp * 100, eye[1] + sp * 100, eye[2] + cy * cp * 100);
    this.animate(realTimeSeconds);
    this.updatePoiState(session.scannedPoiIds);
    renderer.toneMappingExposure = 1.05;
    renderer.render(this.scene, this.camera);
  }

  dispose() { disposeTree(this.scene); }
}
