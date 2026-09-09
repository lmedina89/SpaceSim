export function vec3(x = 0, y = 0, z = 0) {
  return new Float64Array([x, y, z]);
}

export function magnitude3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

export function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function clone3(v) {
  return new Float64Array([v[0], v[1], v[2]]);
}
