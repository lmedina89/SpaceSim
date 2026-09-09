import * as THREE from 'three/webgpu';
import { BODY_KIND, SIMULATION } from '../core/constants.js';

function renderRadius(body) {
  const physical = (body.visualRadiusMeters ?? body.radius) / SIMULATION.metersPerRenderUnit;
  if (body.kind === BODY_KIND.STAR) return Math.max(physical, 18);
  if (body.kind === BODY_KIND.BLACK_HOLE) return Math.max(physical, 8);
  if (body.kind === BODY_KIND.PLANET) return Math.max(physical, 0.85);
  if (body.kind === BODY_KIND.MOON) return Math.max(physical, 0.34);
  return Math.max(physical, 0.16);
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

export function createCelestialVisual(body) {
  const group = new THREE.Group();
  group.userData.entityId = body.id;
  const radius = renderRadius(body);

  if (body.kind === BODY_KIND.BLACK_HOLE) {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 28, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
    );
    group.add(core);
    const disk = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.7, Math.max(radius * 0.16, 0.4), 10, 64),
      new THREE.MeshBasicMaterial({ color: body.color ?? 0x7658ff, transparent: true, opacity: 0.82 }),
    );
    disk.rotation.x = 1.12;
    group.add(disk);
    const outer = disk.clone();
    outer.scale.setScalar(1.42);
    outer.material = disk.material.clone();
    outer.material.color.setHex(0x59dfff);
    outer.material.opacity = 0.4;
    group.add(outer);
  } else {
    const emissive = body.kind === BODY_KIND.STAR ? body.color : 0x000000;
    const material = body.kind === BODY_KIND.STAR
      ? new THREE.MeshBasicMaterial({ color: body.color ?? 0xffd38a })
      : new THREE.MeshStandardMaterial({ color: body.color ?? 0x888888, roughness: 0.82, metalness: 0.02, emissive, emissiveIntensity: 0.04 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, body.kind === BODY_KIND.STAR ? 36 : 24, body.kind === BODY_KIND.STAR ? 24 : 16), material);
    group.add(mesh);
  }

  if (body.kind === BODY_KIND.STAR || body.kind === BODY_KIND.BLACK_HOLE) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(),
      color: body.color ?? 0xffffff,
      transparent: true,
      opacity: body.kind === BODY_KIND.STAR ? 0.55 : 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    sprite.scale.set(radius * 6, radius * 6, 1);
    group.add(sprite);
  }

  group.userData.renderRadius = radius;
  return group;
}
