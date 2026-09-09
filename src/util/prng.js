export function hashSeed(input) {
  const text = String(input ?? '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 0x9e3779b9;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seedText) {
  const random = mulberry32(hashSeed(seedText));
  return {
    random,
    range(min, max) { return min + (max - min) * random(); },
    int(min, maxInclusive) { return Math.floor(this.range(min, maxInclusive + 1)); },
    pick(list) { return list[Math.floor(random() * list.length)]; },
    sign() { return random() < 0.5 ? -1 : 1; },
  };
}
