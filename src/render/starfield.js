import * as THREE from 'three/webgpu';
import { createInertialStarCatalog, projectInertialCatalogBuffer, projectInertialDirection } from '../core/inertialStarCatalog.js';

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

export function createStarfieldView(catalog, { basis = null, horizonOnly = false } = {}) {
  const group = new THREE.Group();
  const stars = projectInertialCatalogBuffer(catalog.positions, catalog.colors, basis, horizonOnly);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(stars.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(stars.colors, 3));
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
  points.userData.role = 'deep-space-stars';
  points.userData.catalogId = catalog.id;
  points.userData.sourceCount = stars.sourceCount;
  material.userData.baseOpacity = 0.9;
  group.add(points);

  // A faint seeded galactic band gives the sky structure without claiming that the shell
  // is a local gas simulation. It is deliberately camera-scale visual background only.
  const bandData = projectInertialCatalogBuffer(catalog.bandPositions, catalog.bandColors, basis, horizonOnly);
  const bandGeometry = new THREE.BufferGeometry();
  bandGeometry.setAttribute('position', new THREE.BufferAttribute(bandData.positions, 3));
  bandGeometry.setAttribute('color', new THREE.BufferAttribute(bandData.colors, 3));
  const band = new THREE.Points(bandGeometry, new THREE.PointsMaterial({
    size: 5.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  band.frustumCulled = false;
  band.userData.role = 'galactic-band';
  band.userData.catalogId = catalog.id;
  band.material.userData.baseOpacity = 0.12;
  group.add(band);

  nebulaTexture ??= makeNebulaTexture();
  for (const entry of catalog.nebulae) {
    const localPosition = basis ? projectInertialDirection(entry.position, basis) : entry.position;
    if (horizonOnly && localPosition[1] < 0) continue;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: entry.color,
      transparent: true,
      opacity: entry.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    sprite.position.set(localPosition[0], localPosition[1], localPosition[2]);
    sprite.scale.set(entry.scaleX, entry.scaleY, 1);
    sprite.material.rotation = entry.rotation;
    sprite.userData.role = 'background-nebula';
    sprite.material.userData.baseOpacity = sprite.material.opacity;
    group.add(sprite);
  }

  group.name = 'Infinite-looking visual star shell';
  group.userData.visualOnlyBackdrop = true;
  group.userData.catalogId = catalog.id;
  group.userData.inertialOrientation = true;
  return group;
}

export function createStarfield(seed, count = 18_000) {
  return createStarfieldView(createInertialStarCatalog(seed, count));
}
