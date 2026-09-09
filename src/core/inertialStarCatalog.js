import { createRng } from '../util/prng.js';

function rgb(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

export function createInertialStarCatalog(seed, count = 18_000) {
  const safeCount = Math.max(64, Math.min(50_000, Math.floor(Number(count) || 18_000)));
  const catalogSeed = `${String(seed ?? 'ORIGIN-001')}:visual-stars-v2`;
  const rng = createRng(catalogSeed);
  const positions = new Float32Array(safeCount * 3);
  const colors = new Float32Array(safeCount * 3);
  const palette = [0xbfd7ff, 0xffffff, 0xffe6bd, 0xd8c8ff, 0xaed9ff, 0xffd7ae].map(rgb);

  for (let i = 0; i < safeCount; i += 1) {
    const radius = rng.range(45_000, 95_000);
    const u = rng.range(-1, 1);
    const theta = rng.range(0, Math.PI * 2);
    const s = Math.sqrt(1 - u * u);
    const k = i * 3;
    positions[k] = Math.cos(theta) * s * radius;
    positions[k + 1] = u * radius;
    positions[k + 2] = Math.sin(theta) * s * radius;
    const color = palette[rng.int(0, palette.length - 1)];
    colors[k] = color[0]; colors[k + 1] = color[1]; colors[k + 2] = color[2];
  }

  const bandCount = 5_500;
  const bandPositions = new Float32Array(bandCount * 3);
  const bandColors = new Float32Array(bandCount * 3);
  const bandPalette = [0x6f82b8, 0x9b75bd, 0x5e9eb4, 0xb07a86].map(rgb);
  for (let i = 0; i < bandCount; i += 1) {
    const radius = rng.range(60_000, 88_000);
    const theta = rng.range(0, Math.PI * 2);
    const latitude = rng.range(-0.16, 0.16) + Math.sin(theta * 2 + Math.sin(theta * 0.7) * 0.8) * 0.055;
    const horizontal = Math.cos(latitude);
    const k = i * 3;
    bandPositions[k] = Math.cos(theta) * horizontal * radius;
    bandPositions[k + 1] = Math.sin(latitude) * radius;
    bandPositions[k + 2] = Math.sin(theta) * horizontal * radius;
    const color = bandPalette[rng.int(0, bandPalette.length - 1)];
    const fade = rng.range(0.28, 0.72);
    bandColors[k] = color[0] * fade; bandColors[k + 1] = color[1] * fade; bandColors[k + 2] = color[2] * fade;
  }

  const nebulaPalette = [0x7357b8, 0x2f7f9e, 0x9d4c83, 0x8a643b];
  const nebulae = [];
  for (let i = 0; i < 7; i += 1) {
    const radius = rng.range(62_000, 82_000);
    const u = rng.range(-0.55, 0.55);
    const theta = rng.range(0, Math.PI * 2);
    const s = Math.sqrt(1 - u * u);
    const scale = rng.range(18_000, 34_000);
    nebulae.push(Object.freeze({
      position: Object.freeze([Math.cos(theta) * s * radius, u * radius, Math.sin(theta) * s * radius]),
      color: nebulaPalette[i % nebulaPalette.length],
      opacity: rng.range(0.035, 0.085),
      scaleX: scale * rng.range(1.2, 2.1),
      scaleY: scale,
      rotation: rng.range(0, Math.PI * 2),
    }));
  }

  return Object.freeze({
    id: `inertial-stars:${catalogSeed}:${safeCount}`,
    seed: catalogSeed,
    count: safeCount,
    positions,
    colors,
    bandPositions,
    bandColors,
    nebulae: Object.freeze(nebulae),
  });
}

export function projectInertialCatalogBuffer(positions, colors, basis = null, horizonOnly = false) {
  if (!basis && !horizonOnly) return { positions, colors, sourceCount: positions.length / 3, visibleCount: positions.length / 3 };
  const east = basis?.east ?? [1, 0, 0];
  const up = basis?.up ?? [0, 1, 0];
  const north = basis?.north ?? [0, 0, 1];
  let visibleCount = 0;
  for (let k = 0; k < positions.length; k += 3) {
    const y = positions[k] * up[0] + positions[k + 1] * up[1] + positions[k + 2] * up[2];
    if (!horizonOnly || y >= 0) visibleCount += 1;
  }
  const projectedPositions = new Float32Array(visibleCount * 3);
  const projectedColors = colors ? new Float32Array(visibleCount * 3) : null;
  let out = 0;
  for (let k = 0; k < positions.length; k += 3) {
    const x0 = positions[k], y0 = positions[k + 1], z0 = positions[k + 2];
    const y = x0 * up[0] + y0 * up[1] + z0 * up[2];
    if (horizonOnly && y < 0) continue;
    projectedPositions[out] = x0 * east[0] + y0 * east[1] + z0 * east[2];
    projectedPositions[out + 1] = y;
    projectedPositions[out + 2] = x0 * north[0] + y0 * north[1] + z0 * north[2];
    if (projectedColors) {
      projectedColors[out] = colors[k]; projectedColors[out + 1] = colors[k + 1]; projectedColors[out + 2] = colors[k + 2];
    }
    out += 3;
  }
  return { positions: projectedPositions, colors: projectedColors, sourceCount: positions.length / 3, visibleCount };
}

export function projectInertialDirection(direction, basis) {
  const east = basis?.east ?? [1, 0, 0], up = basis?.up ?? [0, 1, 0], north = basis?.north ?? [0, 0, 1];
  return [
    direction[0] * east[0] + direction[1] * east[1] + direction[2] * east[2],
    direction[0] * up[0] + direction[1] * up[1] + direction[2] * up[2],
    direction[0] * north[0] + direction[1] * north[1] + direction[2] * north[2],
  ];
}
