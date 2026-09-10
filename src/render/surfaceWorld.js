import * as THREE from 'three/webgpu';
import { createRng } from '../util/prng.js';
import { createStarfieldView, updateStarfieldViewBasis } from './starfield.js';
import { surfaceSkyExposure } from '../core/astronomicalObserver.js';
import { surfaceColorAt, surfaceHeightAt, surfaceZoneWeights, surfacePois } from '../surface/surfaceGenerator.js';
import { surfaceEyePosition } from '../surface/surfaceSession.js';
import { surfaceWeatherReading } from '../surface/surfaceWeather.js';

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
  const site = region.landedShip ?? region.landing;
  placeOnGround(group, region, site.x, site.z, 0);
  return group;
}

function createLandedShip(region) {
  const group = new THREE.Group();
  group.name = 'landed-spacecraft';

  const hull = new THREE.MeshStandardMaterial({ color: 0xc8d0d5, roughness: 0.34, metalness: 0.78 });
  const hullDark = new THREE.MeshStandardMaterial({ color: 0x202a31, roughness: 0.38, metalness: 0.82 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x536773, roughness: 0.42, metalness: 0.66 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x2c4653, roughness: 0.32, metalness: 0.7, emissive: 0x07151b, emissiveIntensity: 0.32 });
  const canopy = new THREE.MeshStandardMaterial({ color: 0x0d3140, roughness: 0.08, metalness: 0.34, transparent: true, opacity: 0.88, emissive: 0x082833, emissiveIntensity: 0.62 });
  const engineGlowBase = { color: 0x6ee9ff, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false };
  const engineMaterials = [];

  // Smooth central pressure hull: long enough to read as a real vehicle, but kept compact for mobile.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.45, 15.5, 20, 2, false), hull);
  body.rotation.x = Math.PI / 2; body.position.set(0, 5.25, -0.3); body.scale.x = 0.92; group.add(body);
  const forwardCollar = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.9, 3.8, 20, 1, false), hull);
  forwardCollar.rotation.x = Math.PI / 2; forwardCollar.position.set(0, 5.35, 8.9); forwardCollar.scale.x = 0.94; group.add(forwardCollar);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(2.45, 8.4, 20, 2, false), hull);
  nose.rotation.x = Math.PI / 2; nose.position.set(0, 5.35, 14.9); nose.scale.x = 0.9; group.add(nose);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.05, 4.6, 20, 1, false), hullDark);
  tail.rotation.x = Math.PI / 2; tail.position.set(0, 5.2, -10.25); tail.scale.x = 0.92; group.add(tail);

  // Lower chine / heat shield gives the hull a believable underside silhouette.
  const belly = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.65, 14.5), hullDark);
  belly.position.set(0, 3.25, -0.4); belly.rotation.x = 0.03; group.add(belly);
  const dorsal = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 11.5), accent);
  dorsal.position.set(0, 7.58, -0.7); group.add(dorsal);

  const canopyMesh = new THREE.Mesh(new THREE.SphereGeometry(2.65, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), canopy);
  canopyMesh.scale.set(0.82, 0.48, 1.42); canopyMesh.rotation.x = -0.16; canopyMesh.position.set(0, 7.1, 7.1); group.add(canopyMesh);
  const canopySpine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 6.2), hullDark);
  canopySpine.position.set(0, 7.92, 7.25); canopySpine.rotation.x = -0.06; group.add(canopySpine);

  const makeWing = (side) => {
    const s = side;
    const geometry = new THREE.BufferGeometry();
    const verts = new Float32Array([
      s * 2.5, 4.55, 3.6,
      s * 11.3, 4.18, -1.5,
      s * 8.4, 4.28, -7.3,
      s * 2.7, 4.52, -5.3,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geometry.setIndex([0,1,2,0,2,3]);
    geometry.computeVertexNormals();
    const wing = new THREE.Mesh(geometry, panel.clone());
    group.add(wing);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 5.4), hullDark);
    edge.position.set(s * 8.9, 4.2, -3.9); edge.rotation.y = s * 0.47; group.add(edge);
  };
  makeWing(-1); makeWing(1);

  // Tail surfaces.
  for (const side of [-1, 1]) {
    const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.42, 3.4), panel);
    stabilizer.position.set(side * 4.15, 5.3, -10.1); stabilizer.rotation.y = side * 0.12; group.add(stabilizer);
  }
  const finGeom = new THREE.BufferGeometry();
  finGeom.setAttribute('position', new THREE.Float32BufferAttribute([0,6.4,-8.4, 0,11.2,-10.6, 0,6.2,-12.0], 3));
  finGeom.setIndex([0,1,2]); finGeom.computeVertexNormals();
  group.add(new THREE.Mesh(finGeom, panel.clone()));

  // Twin main engines and rear nozzles.
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.55, 8.7, 16, 1, false), hullDark);
    pod.rotation.x = Math.PI / 2; pod.position.set(side * 5.8, 4.7, -4.0); group.add(pod);
    const intake = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.14, 6, 18), accent);
    intake.rotation.x = Math.PI / 2; intake.position.set(side * 5.8, 4.7, 0.45); group.add(intake);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.48, 1.8, 16, 1, true), hullDark);
    nozzle.rotation.x = Math.PI / 2; nozzle.position.set(side * 5.8, 4.7, -8.95); group.add(nozzle);
    const glowMat = new THREE.MeshBasicMaterial(engineGlowBase); engineMaterials.push(glowMat);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.94, 20), glowMat);
    glow.position.set(side * 5.8, 4.7, -9.9); group.add(glow);
  }

  // Four downward VTOL thrusters make the scripted landing/takeoff presentation visually coherent.
  const vtolPlumes = [];
  for (const [x, z] of [[-3.2,3.0],[3.2,3.0],[-3.3,-4.5],[3.3,-4.5]]) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.82, 0.9, 12, 1, true), hullDark);
    nozzle.position.set(x, 2.95, z); group.add(nozzle);
    const plumeMat = new THREE.MeshBasicMaterial({ color: 0x8ef3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    engineMaterials.push(plumeMat);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.72, 4.8, 12, 1, true), plumeMat);
    plume.position.set(x, 0.55, z); plume.rotation.x = Math.PI; group.add(plume); vtolPlumes.push(plume);
  }

  // Landing gear: angled struts and broad feet, intentionally simple but proportionally believable.
  const legMat = new THREE.MeshStandardMaterial({ color: 0x68737b, roughness: 0.52, metalness: 0.78 });
  const pads = [[-4.5,2.8],[4.5,2.8],[-4.2,-6.0],[4.2,-6.0]];
  for (const [x,z] of pads) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.28, 4.15, 10), legMat);
    leg.position.set(x * 0.88, 2.15, z); leg.rotation.z = x < 0 ? -0.22 : 0.22; group.add(leg);
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 2.6, 8), legMat);
    brace.position.set(x * 0.66, 2.25, z + 0.5); brace.rotation.z = x < 0 ? 0.62 : -0.62; group.add(brace);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 0.24, 14), hullDark);
    pad.position.set(x, 0.13, z); group.add(pad);
  }

  // Navigation/strobe/landing lights.
  const navPort = new THREE.PointLight(0xff4056, 14, 36, 2); navPort.position.set(-10.5, 4.55, -1.3); group.add(navPort);
  const navStar = new THREE.PointLight(0x55ffa1, 14, 36, 2); navStar.position.set(10.5, 4.55, -1.3); group.add(navStar);
  const landingLight = new THREE.PointLight(0xe8fbff, 55, 70, 2); landingLight.position.set(0, 2.7, 7.0); group.add(landingLight);
  const strobe = new THREE.PointLight(0xffffff, 0, 55, 2); strobe.position.set(0, 8.2, -2.0); group.add(strobe);

  const site = region.landedShip ?? { x: -18, z: -20, yaw: 0 };
  placeOnGround(group, region, site.x, site.z, 0.2);
  group.rotation.y = site.yaw ?? 0;
  group.userData.baseY = group.position.y;
  group.userData.navLights = [navPort, navStar];
  group.userData.landingLight = landingLight;
  group.userData.strobe = strobe;
  group.userData.engineMaterials = engineMaterials;
  group.userData.vtolPlumes = vtolPlumes;
  return group;
}

function createShipTransitionFx(region) {
  const group = new THREE.Group();
  group.name = 'ship-transition-fx';
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd7b07d, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(5, 14, 36), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.18; group.add(ring);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x8feeff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const core = new THREE.Mesh(new THREE.CircleGeometry(5.4, 28), coreMat); core.rotation.x = -Math.PI / 2; core.position.y = 0.2; group.add(core);
  const light = new THREE.PointLight(0xb8f5ff, 0, 95, 2); light.position.y = 4; group.add(light);
  const site = region.landedShip ?? region.landing ?? { x: 0, z: 0 };
  placeOnGround(group, region, site.x, site.z, 0);
  group.userData.ring = ring; group.userData.core = core; group.userData.light = light;
  return group;
}

function makeCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 192; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const [x, y, r, a] of [[40,54,30,.26],[72,40,34,.31],[108,48,42,.34],[145,55,28,.24],[96,65,38,.28]]) {
    const g = ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0, `rgba(230,240,245,${a})`);
    g.addColorStop(.65, `rgba(190,205,215,${a*.55})`);
    g.addColorStop(1, 'rgba(120,140,155,0)');
    ctx.fillStyle = g; ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.surfaceOwned = true;
  return texture;
}

function createWeatherRig(region, rng) {
  const group = new THREE.Group();
  group.name = 'surface-weather-rig';
  const cloudTexture = makeCloudTexture();
  cloudTexture.userData.surfaceOwned = false;
  const clouds = new THREE.Group();
  for (let i = 0; i < 18; i += 1) {
    const mat = new THREE.SpriteMaterial({ map: cloudTexture, color: 0xb9c7cf, transparent: true, opacity: 0, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    const a = rng.range(0, Math.PI * 2), radius = rng.range(130, 520);
    sprite.position.set(Math.cos(a) * radius, rng.range(90, 230), Math.sin(a) * radius);
    const size = rng.range(120, 260); sprite.scale.set(size * 1.8, size, 1);
    clouds.add(sprite);
  }
  group.add(clouds);

  const makePoints = (count, color, size) => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i*3] = rng.range(-110, 110); positions[i*3+1] = rng.range(1, 72); positions[i*3+2] = rng.range(-110, 110);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geometry, material); points.frustumCulled = false; group.add(points); return points;
  };
  const dust = makePoints(560, 0xd6a77f, 1.35);
  const frost = makePoints(460, 0xdffaff, 1.05);

  const rainCount = 220;
  const rainPositions = new Float32Array(rainCount * 6);
  const rainBase = [];
  for (let i = 0; i < rainCount; i += 1) rainBase.push([rng.range(-95,95), rng.range(0,72), rng.range(-95,95), rng.range(1.1,3.2)]);
  const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.LineBasicMaterial({ color: 0x8edcff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial); rain.frustumCulled = false; rain.userData.base = rainBase; group.add(rain);

  const lightningPositions = [];
  for (let branch = 0; branch < 7; branch += 1) {
    let x = rng.range(-70,70), y = rng.range(48,76), z = rng.range(-70,70);
    for (let s = 0; s < 7; s += 1) {
      const nx=x+rng.range(-5,5), ny=y-rng.range(4,9), nz=z+rng.range(-5,5);
      lightningPositions.push(x,y,z,nx,ny,nz); x=nx;y=ny;z=nz;
    }
  }
  const lightningGeo = new THREE.BufferGeometry(); lightningGeo.setAttribute('position', new THREE.Float32BufferAttribute(lightningPositions,3));
  const lightning = new THREE.LineSegments(lightningGeo, new THREE.LineBasicMaterial({ color: 0xb6f4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite:false })); group.add(lightning);

  const fracturePositions = [];
  for (let i=0;i<5;i+=1) {
    const x=rng.range(-100,100), z=rng.range(-100,100), y=rng.range(82,135);
    fracturePositions.push(x,y,z,x+rng.range(22,55),y+rng.range(-10,22),z+rng.range(-18,18));
  }
  const fractureGeo=new THREE.BufferGeometry(); fractureGeo.setAttribute('position',new THREE.Float32BufferAttribute(fracturePositions,3));
  const fracture=new THREE.LineSegments(fractureGeo,new THREE.LineBasicMaterial({color:0xff7be9,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false})); group.add(fracture);

  const flash = new THREE.PointLight(0xbceeff, 0, 260, 2); flash.position.set(0, 55, 0); group.add(flash);
  return { group, clouds, dust, frost, rain, lightning, fracture, flash, cloudTexture };
}

export class SurfaceWorldVisual {
  constructor(region, body, star, starCatalog = null) {
    this.region = region;
    this.body = body;
    this.star = star;
    this.starCatalog = starCatalog;
    this.astronomicalSky = null;
    this._astronomicalSkyProjectionTime = -Infinity;
    this.astronomicalBodies = new Map();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(region.palette.skyTop);
    this._baseFogDensity = 0.00115 / Math.max(0.3, region.atmosphereAtmProxy);
    this.scene.fog = new THREE.FogExp2(region.palette.fog, this._baseFogDensity);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.08, 6200);
    this.rng = createRng(`${region.seed}:render`);
    this.poiGroups = new Map();
    this.animated = [];

    const skyTexture = makeSkyTexture(region.palette.skyTop, region.palette.skyHorizon);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 28, 18), new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, depthWrite: false }));
    sky.position.y = 260; this.scene.add(sky); this.sky = sky;

    const hemi = new THREE.HemisphereLight(region.palette.skyHorizon, 0x17120f, 1.55); this.scene.add(hemi); this.hemi = hemi;
    const sunColor = new THREE.Color(star?.color ?? 0xffe1b0);
    this.sun = new THREE.DirectionalLight(sunColor, 3.2); this.scene.add(this.sun);

    this.terrain = createTerrain(region); this.scene.add(this.terrain);
    this.scatter = createScatter(region, this.rng); this.scene.add(this.scatter);
    this.emberFissures = createEmberFissures(region, this.rng); this.scene.add(this.emberFissures);
    this.dust = createDust(region, this.rng); this.scene.add(this.dust);
    this.landingBeacon = createLandingBeacon(region); this.scene.add(this.landingBeacon);
    this.landedShip = createLandedShip(region); this.scene.add(this.landedShip);
    this.shipTransitionFx = createShipTransitionFx(region); this.scene.add(this.shipTransitionFx);
    this.weatherRig = createWeatherRig(region, createRng(`${region.seed}:weather-visuals`)); this.scene.add(this.weatherRig.group);

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

  ensureAstronomicalSky(astronomy) {
    if (this.astronomicalSky || !this.starCatalog || !astronomy?.observer) return;
    const observer = astronomy.observer;
    this.astronomicalSky = createStarfieldView(this.starCatalog, {
      basis: { east: observer.horizonEast, up: observer.localUp, north: observer.horizonNorth },
      horizonOnly: true,
      dynamicBasis: true,
    });
    this.astronomicalSky.name = 'surface-inertial-starfield';
    this.astronomicalSky.scale.setScalar(0.04);
    this.scene.add(this.astronomicalSky);
  }

  updateAstronomicalSky(astronomy, eye, weather) {
    if (!astronomy?.observer || !Array.isArray(astronomy.bodies)) return null;
    this.ensureAstronomicalSky(astronomy);
    if (this.astronomicalSky) {
      const projectionTime = Number(astronomy.observer.simulationTimeSeconds) || 0;
      if (!Number.isFinite(this._astronomicalSkyProjectionTime) || Math.abs(projectionTime - this._astronomicalSkyProjectionTime) >= 0.25) {
        updateStarfieldViewBasis(this.astronomicalSky, this.starCatalog, {
          east: astronomy.observer.horizonEast,
          up: astronomy.observer.localUp,
          north: astronomy.observer.horizonNorth,
        }, { horizonOnly: true });
        this._astronomicalSkyProjectionTime = projectionTime;
      }
      this.astronomicalSky.position.set(eye[0], eye[1], eye[2]);
    }

    const starObservation = astronomy.bodies.find((observed) => observed.id === this.star?.id || observed.kind === 'star');
    const transmission = weather?.type === 'shadow-fog' ? 0.12
      : weather?.type === 'dust-front' ? Math.max(0.25, 1 - weather.intensity * 0.65)
        : weather?.type === 'fog-bank' ? Math.max(0.35, 1 - weather.intensity * 0.5) : 1;
    const exposure = surfaceSkyExposure({
      starAltitudeRad: starObservation?.centerAltitudeRad,
      atmosphereAtmProxy: this.region.atmosphereAtmProxy,
      weatherTransmission: transmission,
    });
    // This is a bounded presentation proxy, not an atmospheric scattering solver. The physically
    // derived star altitude controls whether the local sky is day/twilight/night; weather then
    // attenuates visibility separately. The underlying celestial directions remain untouched.
    const daylightFactor = this.region.atmosphereAtmProxy > 0.01 ? 0.075 + exposure.daylight * 0.925 : 0.025;
    if (this.sky?.material?.color) this.sky.material.color.setScalar(daylightFactor);
    if (this.hemi) this.hemi.intensity = 0.12 + exposure.daylight * 1.43;
    this.scene.background?.multiplyScalar?.(Math.max(0.04, daylightFactor));
    this.scene.fog?.color?.multiplyScalar?.(Math.max(0.10, daylightFactor));
    this.astronomicalSky?.traverse((node) => {
      if (!node.material) return;
      const base = node.material.userData?.baseOpacity ?? node.material.opacity ?? 1;
      node.material.opacity = base * (node.userData?.role === 'galactic-band' ? exposure.galacticVisibility : exposure.starVisibility);
    });

    const liveIds = new Set();
    for (const observed of astronomy.bodies) {
      if (!observed?.id || observed.id === this.body?.id) continue;
      liveIds.add(observed.id);
      let sprite = this.astronomicalBodies.get(observed.id);
      if (!sprite) {
        const material = new THREE.SpriteMaterial({
          map: makeGlowTexture(cssHex(observed.color)), color: observed.color,
          transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
        });
        sprite = new THREE.Sprite(material);
        sprite.name = `surface-celestial-${observed.id}`;
        this.astronomicalBodies.set(observed.id, sprite);
        this.scene.add(sprite);
      }
      const direction = observed.localDirection;
      const shellDistance = 2700;
      sprite.position.set(eye[0] + direction[0] * shellDistance, eye[1] + direction[1] * shellDistance, eye[2] + direction[2] * shellDistance);
      const physicalDiameterAtSkyShell = 2 * shellDistance * Math.tan(observed.apparentAngularRadiusRad);
      const visualProxyDiameter = Math.max(observed.kind === 'star' ? 34 : 8, Math.min(260, physicalDiameterAtSkyShell));
      sprite.scale.set(visualProxyDiameter, visualProxyDiameter, 1);
      sprite.userData.physicalDiameterAtSkyShell = physicalDiameterAtSkyShell;
      sprite.userData.visualProxyDiameter = visualProxyDiameter;
      sprite.visible = observed.visibleAboveHorizon;
      sprite.material.opacity = Math.max(0.08, exposure.weatherTransmission) * (observed.kind === 'star' ? 0.95 : 0.82);
      if (observed === starObservation) {
        this.sun.position.set(eye[0] + direction[0] * 900, eye[1] + direction[1] * 900, eye[2] + direction[2] * 900);
        this.sun.visible = observed.visibleAboveHorizon;
        this.sun.intensity = observed.visibleAboveHorizon ? 3.2 * Math.max(0.18, exposure.weatherTransmission) : 0;
      }
    }
    for (const [id, sprite] of this.astronomicalBodies) {
      if (liveIds.has(id)) continue;
      this.scene.remove(sprite); disposeTree(sprite); this.astronomicalBodies.delete(id);
    }
    return exposure;
  }

  updatePoiState(scannedPoiIds) {
    for (const poi of surfacePois(this.region)) {
      const beacon = this.poiGroups.get(`${poi.id}:beacon`);
      const scanned = scannedPoiIds?.has?.(poi.id);
      if (beacon?.userData?.beaconRing?.material) beacon.userData.beaconRing.material.opacity = scanned ? 0.9 : 0.34;
    }
  }

  updateWeather(session, timeSeconds) {
    const reading = surfaceWeatherReading(session?.weather);
    const rig = this.weatherRig;
    if (!rig) return reading;
    rig.group.position.x = session.x;
    rig.group.position.y = surfaceHeightAt(this.region, session.x, session.z);
    rig.group.position.z = session.z;
    const intensity = reading.intensity;
    const type = reading.type;
    const isStorm = type === 'dust-front' || type === 'electrostatic-storm' || type === 'shadow-fog' || type === 'suspended-lightning' || type === 'sky-fracture';
    const cloudOpacity = type === 'clear' ? 0.05 : type === 'fog-bank' ? 0.18 : Math.min(0.46, 0.16 + intensity * 0.34);
    for (const sprite of rig.clouds.children) {
      sprite.material.opacity = cloudOpacity;
      sprite.material.color.setHex(type === 'shadow-fog' ? 0x4a4654 : type === 'electrostatic-storm' ? 0x697782 : 0xb9c7cf);
    }
    rig.clouds.rotation.y = (reading.windHeadingRad || 0) + timeSeconds * Math.max(0.001, reading.windSpeedMps * 0.00022);

    rig.dust.material.opacity = type === 'dust-front' ? 0.28 + intensity * 0.34 : 0;
    rig.dust.rotation.y = reading.windHeadingRad + timeSeconds * reading.windSpeedMps * 0.008;
    rig.frost.material.opacity = type === 'frost-squall' ? 0.34 + intensity * 0.42 : 0;
    rig.frost.rotation.y = -reading.windHeadingRad + timeSeconds * 0.12;

    const upward = type === 'upward-rain';
    const frostStreak = type === 'frost-squall';
    const rainVisible = upward || frostStreak;
    rig.rain.material.opacity = rainVisible ? (0.34 + intensity * 0.42) : 0;
    rig.rain.material.color.setHex(upward ? 0x83d9ff : 0xe5fbff);
    if (rainVisible) {
      const pos = rig.rain.geometry.attributes.position.array;
      const speed = upward ? 18 : -22;
      for (let i=0;i<rig.rain.userData.base.length;i+=1) {
        const [x,baseY,z,len]=rig.rain.userData.base[i];
        const y=((baseY + timeSeconds*speed + 7200) % 72 + 72) % 72;
        const k=i*6; pos[k]=x;pos[k+1]=y;pos[k+2]=z;pos[k+3]=x;pos[k+4]=y+(upward?len:-len);pos[k+5]=z;
      }
      rig.rain.geometry.attributes.position.needsUpdate=true;
    }

    const lightningOn = type === 'electrostatic-storm' || type === 'suspended-lightning';
    const pulse = Math.max(0, Math.sin(timeSeconds * (type === 'suspended-lightning' ? 2.1 : 7.7)));
    rig.lightning.material.opacity = lightningOn ? (type === 'suspended-lightning' ? 0.44 + 0.28*pulse : (pulse > 0.88 ? 0.75 : 0.08)) * intensity : 0;
    rig.flash.intensity = lightningOn && pulse > 0.9 ? 95 * intensity : 0;
    rig.fracture.material.opacity = type === 'sky-fracture' ? (0.34 + 0.26*Math.sin(timeSeconds*1.7)**2) * intensity : 0;

    let fogFactor = 1;
    if (type === 'fog-bank') fogFactor = 2.8 + intensity * 2.2;
    else if (type === 'shadow-fog') fogFactor = 3.6 + intensity * 2.9;
    else if (type === 'dust-front') fogFactor = 1.5 + intensity * 1.8;
    else if (type === 'frost-squall') fogFactor = 1.4 + intensity * 1.2;
    else if (isStorm) fogFactor = 1.25 + intensity * 1.25;
    this.scene.fog.density = this._baseFogDensity * fogFactor;
    this.scene.fog.color.setHex(type === 'shadow-fog' ? 0x241f2a : type === 'dust-front' ? 0x72513f : this.region.palette.fog);
    this.scene.background.setHex(type === 'shadow-fog' ? 0x111019 : this.region.palette.skyTop);
    return reading;
  }

  updateShipTransition(transition, timeSeconds) {
    if (!this.landedShip) return;
    const phase = transition?.phase ?? 'landed';
    const duration = Math.max(1e-6, Number(transition?.durationSeconds) || 1);
    const p = Math.max(0, Math.min(1, (Number(transition?.elapsedSeconds) || 0) / duration));
    const easeOut = 1 - Math.pow(1 - p, 3);
    const easeIn = p * p * p;
    let lift = 0;
    let thrust = 0.16;
    if (phase === 'descending') { lift = 48 * (1 - easeOut); thrust = 0.96 - p * 0.28; }
    else if (phase === 'ascending') { lift = 78 * easeIn; thrust = 0.72 + p * 0.28; }
    this.landedShip.position.y = (this.landedShip.userData.baseY ?? this.landedShip.position.y) + lift;
    this.landedShip.rotation.z = phase === 'descending' ? (1 - p) * 0.025 : phase === 'ascending' ? p * -0.018 : 0;
    if (this.landedShip.userData.engineMaterials) for (const material of this.landedShip.userData.engineMaterials) {
      material.opacity = phase === 'landed' ? 0.18 : Math.min(0.96, thrust * (0.78 + Math.sin(timeSeconds * 16) * 0.08));
    }
    if (this.landedShip.userData.vtolPlumes) for (const plume of this.landedShip.userData.vtolPlumes) {
      const scale = phase === 'landed' ? 0.05 : 0.68 + thrust * 0.72;
      plume.scale.y = scale;
      plume.visible = phase !== 'landed';
    }
    if (this.landedShip.userData.navLights) for (const light of this.landedShip.userData.navLights) light.intensity = 12 + (Math.sin(timeSeconds * 2.4) + 1) * 7;
    if (this.landedShip.userData.landingLight) this.landedShip.userData.landingLight.intensity = phase === 'landed' ? 38 : 70;

    const fx = this.shipTransitionFx;
    if (fx?.userData?.ring) {
      const active = phase === 'descending' || phase === 'ascending';
      const groundPulse = active ? Math.max(0, 1 - Math.min(1, lift / 48)) : 0;
      fx.userData.ring.material.opacity = active ? 0.18 + groundPulse * 0.32 : 0;
      fx.userData.ring.scale.setScalar(0.8 + (phase === 'ascending' ? p : 1 - p) * 0.75);
      fx.userData.core.material.opacity = active ? 0.12 + groundPulse * 0.24 : 0;
      fx.userData.light.intensity = active ? 28 + groundPulse * 62 : 0;
    }
  }

  animate(timeSeconds) {
    const t = Number(timeSeconds) || 0;
    this.emberFissures.material.opacity = 0.64 + Math.sin(t * 2.2) * 0.16;
    this.dust.rotation.y = t * 0.006;
    this.landingBeacon.rotation.y = t * 0.18;
    if (this.landedShip?.userData?.strobe) this.landedShip.userData.strobe.intensity = Math.sin(t * 4.2) > 0.965 ? 42 : 0;
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

  render(renderer, session, realTimeSeconds, transition = null, astronomy = null) {
    const eye = surfaceEyePosition(session, this.region);
    const bob = session.lastMoveSpeedMps > 0 ? Math.sin(realTimeSeconds * 8.5) * 0.045 : 0;
    this.camera.position.set(eye[0], eye[1] + bob, eye[2]);
    const cp = Math.cos(session.pitch), sp = Math.sin(session.pitch), sy = Math.sin(session.yaw), cy = Math.cos(session.yaw);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(eye[0] + sy * cp * 100, eye[1] + sp * 100, eye[2] + cy * cp * 100);
    const weather = this.updateWeather(session, realTimeSeconds);
    const skyExposure = this.updateAstronomicalSky(astronomy, eye, weather);
    this.updateShipTransition(transition, realTimeSeconds);
    this.animate(realTimeSeconds);
    this.updatePoiState(session.scannedPoiIds);
    renderer.toneMappingExposure = skyExposure?.exposure ?? (weather?.type === 'shadow-fog' ? 0.78 : weather?.type === 'electrostatic-storm' ? 0.94 : weather?.type === 'dust-front' ? 0.98 : 1.05);
    renderer.render(this.scene, this.camera);
  }

  dispose() { this.weatherRig?.cloudTexture?.dispose?.(); disposeTree(this.scene); }
}
