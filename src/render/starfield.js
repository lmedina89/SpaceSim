import * as THREE from 'three/webgpu';
import { createRng } from '../util/prng.js';

export function createStarfield(seed, count = 18_000) {
  const rng = createRng(`${seed}:visual-stars`);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  const palette = [0xbfd7ff, 0xffffff, 0xffe6bd, 0xd8c8ff];

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
  points.name = 'Infinite-looking visual star shell';
  return points;
}
