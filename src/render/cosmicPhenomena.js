import * as THREE from 'three/webgpu';
import { PHYSICS, SIMULATION } from '../core/constants.js';
import { createRng } from '../util/prng.js';

function makeAnnulusPoints(definition, seed) {
  const rng = createRng(`${seed}:${definition.id}:visual`);
  const count = Math.max(500, Math.min(Number(definition.particleCount) || 4_000, 16_000));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const inner = definition.innerRadiusMeters / SIMULATION.metersPerRenderUnit;
  const outer = definition.outerRadiusMeters / SIMULATION.metersPerRenderUnit;
  const thickness = Math.max(
    definition.kind === 'planetary-rings' ? 0.004 : 0.08,
    (definition.thicknessMeters ?? (definition.outerRadiusMeters - definition.innerRadiusMeters) * 0.02) / SIMULATION.metersPerRenderUnit,
  );
  const c1 = new THREE.Color(definition.colorA ?? 0xb9b1a5);
  const c2 = new THREE.Color(definition.colorB ?? 0x757b83);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const k = i * 3;
    const u = rng.random();
    let radius = Math.sqrt(inner * inner + u * (outer * outer - inner * inner));
    if (definition.kind === 'planetary-rings') {
      // A few sparse gaps make the visual read more like a structured ring system.
      const band = (radius - inner) / Math.max(1e-9, outer - inner);
      if ((band > 0.46 && band < 0.51) || (band > 0.72 && band < 0.745)) radius += (outer - inner) * 0.035;
    }
    const angle = rng.range(0, Math.PI * 2);
    positions[k] = Math.cos(angle) * radius;
    positions[k + 1] = rng.range(-thickness, thickness);
    positions[k + 2] = Math.sin(angle) * radius;
    color.copy(c1).lerp(c2, rng.random());
    const bright = definition.kind === 'planetary-rings' ? rng.range(0.62, 1.0) : rng.range(0.42, 0.9);
    colors[k] = color.r * bright; colors[k + 1] = color.g * bright; colors[k + 2] = color.b * bright;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: definition.kind === 'planetary-rings' ? 0.075 : 0.42,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: definition.kind === 'planetary-rings' ? 0.78 : 0.55,
    depthWrite: false,
    blending: definition.kind === 'planetary-rings' ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function makeSupernovaRemnant(definition, seed) {
  const rng = createRng(`${seed}:${definition.id}:remnant`);
  const count = Math.max(1800, Math.min(Number(definition.particleCount) || 8500, 12000));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const radius = definition.radiusMeters / SIMULATION.metersPerRenderUnit;
  const c1 = new THREE.Color(definition.colorA ?? 0x61dfff);
  const c2 = new THREE.Color(definition.colorB ?? 0xff7b5e);
  const c = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const k = i * 3;
    const u = rng.range(-1, 1);
    const a = rng.range(0, Math.PI * 2);
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    const filament = 0.72 + 0.28 * Math.pow(rng.random(), 0.35);
    const rr = radius * filament * rng.range(0.92, 1.08);
    positions[k] = Math.cos(a) * s * rr;
    positions[k + 1] = u * rr * rng.range(0.78, 1.12);
    positions[k + 2] = Math.sin(a) * s * rr;
    c.copy(c1).lerp(c2, rng.random());
    const bright = rng.range(0.35, 1.0) * (0.55 + 0.45 * Math.sin(a * 7 + u * 11) ** 2);
    colors[k] = c.r * bright; colors[k + 1] = c.g * bright; colors[k + 2] = c.b * bright;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: Math.max(0.18, radius * 0.0024), vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false;
  return points;
}

export function createCosmicPhenomenonVisual(definition, seed) {
  const group = new THREE.Group();
  group.userData.phenomenonId = definition.id;
  group.userData.kind = definition.kind;
  group.userData.anchorBodyId = definition.anchorBodyId ?? null;
  group.userData.baseInclination = Number(definition.inclinationRad) || 0;

  if (definition.kind === 'asteroid-belt' || definition.kind === 'planetary-rings') {
    group.add(makeAnnulusPoints(definition, seed));
    group.rotation.x = group.userData.baseInclination;
  } else if (definition.kind === 'supernova-remnant') {
    group.add(makeSupernovaRemnant(definition, seed));
  }

  return group;
}

export function updateCosmicPhenomenonVisual(group, definition, anchorBody, referenceFrame, elapsedSimSeconds) {
  if (!group || !definition) return;
  const sourcePosition = anchorBody?.position ?? definition.position;
  if (!sourcePosition) return;
  const position = new THREE.Vector3();
  referenceFrame.toRender(sourcePosition, position);
  group.position.copy(position);

  if (definition.kind === 'asteroid-belt') {
    const meanRadius = (definition.innerRadiusMeters + definition.outerRadiusMeters) * 0.5;
    const period = 2 * Math.PI * Math.sqrt((meanRadius ** 3) / Math.max(1, PHYSICS.G * anchorBody.mass));
    group.rotation.y = (elapsedSimSeconds / Math.max(1, period)) * Math.PI * 2;
  } else if (definition.kind === 'planetary-rings') {
    group.rotation.y = (elapsedSimSeconds / 80_000) % (Math.PI * 2);
  } else if (definition.kind === 'supernova-remnant') {
    group.rotation.y = (elapsedSimSeconds / 2_500_000) % (Math.PI * 2);
    group.rotation.z = 0.08 * Math.sin(elapsedSimSeconds / 900_000);
  }
}
