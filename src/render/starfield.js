import * as THREE from 'three/webgpu';
import { createRng } from '../util/prng.js';

function makeNebulaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,.72)');
  grad.addColorStop(0.22, 'rgba(255,255,255,.34)');
  grad.addColorStop(0.55, 'rgba(255,255,255,.09)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

let nebulaTexture = null;

export function createStarfield(seed, count = 18_000) {
  const rng = createRng(`${seed}:visual-stars-v2`);
  const group = new THREE.Group();

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  const palette = [0xbfd7ff, 0xffffff, 0xffe6bd, 0xd8c8ff, 0xaed9ff, 0xffd7ae];

  for (let i = 0; i < count; i += 1) {
    const radius = rng.range(45_000, 95_000);
    const u = rng.range(-1, 1);
    const theta = rng.range(0, Math.PI * 2);
    const s = Math.sqrt(1 - u * u);
    const k = i * 3;
    positions[k] = Math.cos(theta) * s * radius;
    positions[k + 1] = u * radius;
    positions[k + 2] = Math.sin(theta) * s * radius;
    color.setHex(palette[rng.int(0, palette.length - 1)]);
    colors[k] = color.r; colors[k + 1] = color.g; colors[k + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 3.0,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.name = 'deep-space-stars';
  group.add(points);

  // A faint seeded galactic band gives the sky structure without claiming that the shell
  // is a local gas simulation. It is deliberately camera-scale visual background only.
  const bandCount = 7_000;
  const bandPositions = new Float32Array(bandCount * 3);
  const bandColors = new Float32Array(bandCount * 3);
  const bandPalette = [0x6f82b8, 0x9b75bd, 0x5e9eb4, 0xb07a86];
  for (let i = 0; i < bandCount; i += 1) {
    const radius = rng.range(60_000, 88_000);
    const theta = rng.range(0, Math.PI * 2);
    const latitude = rng.range(-0.09, 0.09) + Math.sin(theta * 2.0) * 0.025;
    const horizontal = Math.cos(latitude);
    const k = i * 3;
    bandPositions[k] = Math.cos(theta) * horizontal * radius;
    bandPositions[k + 1] = Math.sin(latitude) * radius;
    bandPositions[k + 2] = Math.sin(theta) * horizontal * radius;
    color.setHex(bandPalette[rng.int(0, bandPalette.length - 1)]);
    const fade = rng.range(0.28, 0.72);
    bandColors[k] = color.r * fade; bandColors[k + 1] = color.g * fade; bandColors[k + 2] = color.b * fade;
  }
  const bandGeometry = new THREE.BufferGeometry();
  bandGeometry.setAttribute('position', new THREE.BufferAttribute(bandPositions, 3));
  bandGeometry.setAttribute('color', new THREE.BufferAttribute(bandColors, 3));
  const band = new THREE.Points(bandGeometry, new THREE.PointsMaterial({
    size: 7.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  band.frustumCulled = false;
  group.add(band);

  nebulaTexture ??= makeNebulaTexture();
  const nebulaPalette = [0x7357b8, 0x2f7f9e, 0x9d4c83, 0x8a643b];
  for (let i = 0; i < 7; i += 1) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: nebulaPalette[i % nebulaPalette.length],
      transparent: true,
      opacity: rng.range(0.035, 0.085),
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const radius = rng.range(62_000, 82_000);
    const u = rng.range(-0.55, 0.55);
    const theta = rng.range(0, Math.PI * 2);
    const s = Math.sqrt(1 - u * u);
    sprite.position.set(Math.cos(theta) * s * radius, u * radius, Math.sin(theta) * s * radius);
    const scale = rng.range(18_000, 34_000);
    sprite.scale.set(scale * rng.range(1.2, 2.1), scale, 1);
    sprite.material.rotation = rng.range(0, Math.PI * 2);
    group.add(sprite);
  }

  group.name = 'Infinite-looking visual star shell';
  group.userData.visualOnlyBackdrop = true;
  return group;
}
