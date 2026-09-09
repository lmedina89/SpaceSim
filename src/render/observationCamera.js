function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function computeObservationCameraPose({
  radiusMeters,
  metersPerRenderUnit,
  fovDegrees = 58,
  yaw = 0,
  pitch = 0.18,
  style = 'frame',
  velocity = null,
}) {
  const scale = 1 / Math.max(1e-12, metersPerRenderUnit);
  const radiusRender = Math.max(0.08, Math.max(0, Number(radiusMeters) || 0) * scale);
  const fov = clamp(Number(fovDegrees) || 58, 10, 120) * Math.PI / 180;
  const distance = Math.max(1.1, radiusRender / Math.tan(fov * 0.5) * 1.28);
  const safePitch = clamp(Number(pitch) || 0, -1.35, 1.35);
  const safeYaw = Number(yaw) || 0;
  let position;
  if (style === 'track' && velocity) {
    const vx = Number(velocity[0]) || 0, vy = Number(velocity[1]) || 0, vz = Number(velocity[2]) || 0;
    const mag = Math.hypot(vx, vy, vz);
    if (mag > 1e-6) {
      position = [-vx / mag * distance, Math.max(radiusRender * 0.35, distance * 0.16), -vz / mag * distance];
    }
  }
  if (!position) {
    position = [
      Math.sin(safeYaw) * Math.cos(safePitch) * distance,
      Math.sin(safePitch) * distance,
      Math.cos(safeYaw) * Math.cos(safePitch) * distance,
    ];
  }
  return { position, lookAt: [0, 0, 0], up: [0, 1, 0], distance, radiusRender };
}
