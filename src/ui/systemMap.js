import { BODY_KIND, PHYSICS } from '../core/constants.js';
import { ANOMALY_REALITY_LABELS } from '../cosmic/anomalyGenerator.js';

function distanceLabel(meters) {
  if (!Number.isFinite(meters)) return '—';
  const au = meters / PHYSICS.AU;
  if (Math.abs(au) >= 0.01) return `${au.toFixed(Math.abs(au) >= 100 ? 1 : 3)} AU`;
  if (Math.abs(meters) >= 1e9) return `${(meters / 1e9).toFixed(2)} Gm`;
  return `${(meters / 1e6).toFixed(2)} Mm`;
}

function bodyColor(body) {
  if (body.kind === BODY_KIND.STAR) return '#ffe39a';
  if (body.kind === BODY_KIND.MOON) return '#c8d0d8';
  if (body.kind === BODY_KIND.COMET) return '#b9f2ff';
  if (body.kind === BODY_KIND.ROGUE_PLANET) return '#7398c8';
  if (body.kind === BODY_KIND.BLACK_HOLE) return '#d188ff';
  if (body.kind === BODY_KIND.NEUTRON_STAR || body.kind === BODY_KIND.WHITE_DWARF) return '#d9f4ff';
  return '#74c8ff';
}

function realityColor(realityClass) {
  if (realityClass === 'impossible') return '#ff79da';
  if (realityClass === 'anomalous') return '#b184ff';
  if (realityClass === 'speculative') return '#6af5e4';
  return '#a7bad0';
}

export class SystemMapController {
  constructor(app, root) {
    this.app = app;
    this.root = root;
    this.canvas = root.querySelector('#systemMapCanvas');
    this.ctx = this.canvas?.getContext('2d') ?? null;
    this.selection = null;
    this.markers = [];
    this.zoom = 1;
    this.includeUnknown = true;
    this._boundPointer = (event) => this.onPointer(event);
    this.canvas?.addEventListener('pointerdown', this._boundPointer);
  }

  setZoom(value) {
    const n = Number(value);
    this.zoom = Number.isFinite(n) ? Math.max(0.55, Math.min(n, 3.5)) : 1;
    this.draw();
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(320, Math.floor(rect.width * dpr));
    const height = Math.max(230, Math.floor(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  stateForPhenomenon(phenomenon) {
    return this.app.cosmicPhenomena.state(phenomenon.id, (id) => this.app.registry.get(id));
  }

  collect() {
    const star = this.app.bodies.find((body) => body.kind === BODY_KIND.STAR);
    const origin = star?.position ?? [0, 0, 0];
    const bodies = this.app.bodies.filter((body) => body.generated !== false || body.kind !== BODY_KIND.ASTEROID);
    const phenomena = this.app.cosmicPhenomena.values.filter((entry) => this.includeUnknown || this.app.discoveredPhenomena.has(entry.id));
    const entries = [];
    for (const body of bodies) {
      entries.push({ type: 'body', id: body.id, label: body.name, kind: body.kind, position: body.position, body });
    }
    for (const phenomenon of phenomena) {
      const state = this.stateForPhenomenon(phenomenon);
      if (!state?.center) continue;
      entries.push({ type: 'phenomenon', id: phenomenon.id, label: phenomenon.label, kind: phenomenon.kind, position: state.center, phenomenon, state });
    }
    const ship = this.app.ship;
    if (ship?.position) entries.push({ type: 'ship', id: 'ship', label: 'SPACECRAFT', kind: 'ship', position: ship.position });
    return { origin, entries, star };
  }

  project(position, origin, cx, cy, radiusPx, maxAu) {
    const x = Number(position?.[0] ?? 0) - Number(origin?.[0] ?? 0);
    const z = Number(position?.[2] ?? 0) - Number(origin?.[2] ?? 0);
    const rMeters = Math.hypot(x, z);
    if (rMeters < 1) return { x: cx, y: cy, rMeters };
    const rAu = rMeters / PHYSICS.AU;
    const compressed = Math.log1p(rAu * 2.4 * this.zoom) / Math.log1p(Math.max(0.01, maxAu) * 2.4 * this.zoom);
    const rr = Math.min(radiusPx, compressed * radiusPx);
    const angle = Math.atan2(z, x);
    return { x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr, rMeters };
  }

  draw() {
    if (!this.canvas || !this.ctx || this.root.querySelector('#mapPanel')?.hidden) return;
    this.resize();
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#020711'; ctx.fillRect(0, 0, w, h);
    const { origin, entries } = this.collect();
    let maxAu = 1;
    for (const entry of entries) {
      const dx = Number(entry.position?.[0] ?? 0) - Number(origin?.[0] ?? 0);
      const dz = Number(entry.position?.[2] ?? 0) - Number(origin?.[2] ?? 0);
      maxAu = Math.max(maxAu, Math.hypot(dx, dz) / PHYSICS.AU);
    }
    maxAu = Math.max(2.2, maxAu / this.zoom);
    const cx = w * 0.5, cy = h * 0.5;
    const mapRadius = Math.max(60, Math.min(w, h) * 0.43);

    ctx.save();
    ctx.strokeStyle = 'rgba(120,175,225,.15)'; ctx.lineWidth = Math.max(1, w / 900);
    for (const au of [0.5, 1, 2, 5, 10, 20, 40]) {
      if (au > maxAu * 1.15) continue;
      const rr = Math.log1p(au * 2.4 * this.zoom) / Math.log1p(maxAu * 2.4 * this.zoom) * mapRadius;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(145,177,208,.62)'; ctx.font = `${Math.max(10, w / 80)}px ui-monospace,monospace`;
      ctx.fillText(`${au} AU`, cx + rr + 4, cy - 3);
    }
    ctx.restore();

    this.markers = [];
    const scale = Math.max(1, w / 700);
    for (const entry of entries) {
      const point = this.project(entry.position, origin, cx, cy, mapRadius, maxAu);
      const isSelected = this.selection?.type === entry.type && this.selection?.id === entry.id;
      if (entry.type === 'ship') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(point.x, point.y - 7 * scale); ctx.lineTo(point.x - 5 * scale, point.y + 6 * scale); ctx.lineTo(point.x + 5 * scale, point.y + 6 * scale); ctx.closePath(); ctx.fill();
        this.markers.push({ ...entry, x: point.x, y: point.y, hit: 15 * scale, distanceMeters: point.rMeters });
        continue;
      }
      if (entry.type === 'body') {
        const size = entry.kind === BODY_KIND.STAR ? 8 : entry.kind === BODY_KIND.MOON ? 3.3 : 5;
        ctx.fillStyle = bodyColor(entry.body);
        ctx.beginPath(); ctx.arc(point.x, point.y, (size + (isSelected ? 2 : 0)) * scale, 0, Math.PI * 2); ctx.fill();
        if (isSelected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * scale; ctx.beginPath(); ctx.arc(point.x, point.y, 11 * scale, 0, Math.PI * 2); ctx.stroke(); }
        this.markers.push({ ...entry, x: point.x, y: point.y, hit: 14 * scale, distanceMeters: point.rMeters });
        continue;
      }
      const discovered = this.app.discoveredPhenomena.has(entry.id);
      const anomaly = Boolean(entry.phenomenon?.anomaly);
      ctx.strokeStyle = anomaly ? realityColor(entry.phenomenon?.realityClass) : '#7bd8ff';
      ctx.fillStyle = discovered ? ctx.strokeStyle : '#8893a5';
      ctx.lineWidth = (isSelected ? 2.2 : 1.4) * scale;
      const rr = (anomaly ? 6.5 : 5) * scale;
      ctx.beginPath();
      if (anomaly) {
        ctx.moveTo(point.x, point.y - rr); ctx.lineTo(point.x + rr, point.y); ctx.lineTo(point.x, point.y + rr); ctx.lineTo(point.x - rr, point.y); ctx.closePath();
      } else {
        ctx.arc(point.x, point.y, rr, 0, Math.PI * 2);
      }
      if (discovered) ctx.fill(); else ctx.stroke();
      if (!discovered) {
        ctx.fillStyle = '#dce5ef'; ctx.font = `${Math.max(10, 10 * scale)}px ui-monospace,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', point.x, point.y + .5 * scale);
      }
      if (isSelected) { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(point.x, point.y, 12 * scale, 0, Math.PI * 2); ctx.stroke(); }
      this.markers.push({ ...entry, x: point.x, y: point.y, hit: 16 * scale, distanceMeters: point.rMeters });
    }

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(220,238,255,.72)'; ctx.font = `${Math.max(10, w / 80)}px ui-monospace,monospace`;
    ctx.fillText(`LOG SYSTEM VIEW · extent ${maxAu.toFixed(1)} AU · ${this.app.cosmicPhenomena.values.filter((x) => x.anomaly).length} seeded anomalies`, 10 * scale, 18 * scale);
  }

  onPointer(event) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / Math.max(1, rect.width);
    const sy = this.canvas.height / Math.max(1, rect.height);
    const x = (event.clientX - rect.left) * sx;
    const y = (event.clientY - rect.top) * sy;
    let best = null, bestDistance = Infinity;
    for (const marker of this.markers) {
      const d = Math.hypot(x - marker.x, y - marker.y);
      if (d <= marker.hit && d < bestDistance) { best = marker; bestDistance = d; }
    }
    if (!best) return;
    this.selection = { type: best.type, id: best.id };
    this.updateSelectionText(best);
    this.draw();
  }

  updateSelectionText(marker = null) {
    const title = this.root.querySelector('#mapSelectionName');
    const kind = this.root.querySelector('#mapSelectionKind');
    const distance = this.root.querySelector('#mapSelectionDistance');
    const status = this.root.querySelector('#mapSelectionStatus');
    const selection = marker ?? this.currentMarker();
    if (!selection) {
      if (title) title.textContent = 'Tap a map marker';
      if (kind) kind.textContent = '—';
      if (distance) distance.textContent = '—';
      if (status) status.textContent = 'Bodies are physical targets. Cosmic markers may be known phenomena or unidentified anomaly signatures.';
      return;
    }
    if (selection.type === 'body') {
      if (title) title.textContent = selection.body.name;
      if (kind) kind.textContent = selection.body.kind.toUpperCase();
      if (distance) distance.textContent = distanceLabel(selection.distanceMeters);
      if (status) status.textContent = selection.body.scientificWarning || 'Physical major-body target. TARGET selects it for scanner/navigation; TRANSIT opens the speculative travel layer.';
      return;
    }
    if (selection.type === 'ship') {
      if (title) title.textContent = 'SPACECRAFT'; if (kind) kind.textContent = 'SHIP'; if (distance) distance.textContent = distanceLabel(selection.distanceMeters);
      if (status) status.textContent = 'Current spacecraft position projected into the logarithmic system map.';
      return;
    }
    const p = selection.phenomenon;
    const discovered = this.app.discoveredPhenomena.has(p.id);
    const scanDepth = this.app.discoveryScanDepth.get(p.id) ?? (discovered ? 1 : 0);
    if (title) title.textContent = discovered ? p.label : 'UNIDENTIFIED SIGNAL';
    if (kind) kind.textContent = discovered ? (p.anomaly ? (ANOMALY_REALITY_LABELS[p.realityClass] ?? 'ANOMALY') : p.kind.toUpperCase()) : 'UNKNOWN';
    if (distance) distance.textContent = distanceLabel(selection.distanceMeters);
    if (status) status.textContent = discovered
      ? `${p.scanSummary ?? p.scientificStatus}${p.anomaly ? ` Scan depth ${scanDepth}/3.` : ''}`
      : `Passive sensors show a coherent source at this location. SCAN reveals more; its actual classification is hidden.`;
  }

  currentMarker() {
    if (!this.selection) return null;
    return this.markers.find((m) => m.type === this.selection.type && m.id === this.selection.id) ?? null;
  }

  selectCurrent() {
    const marker = this.currentMarker();
    if (!marker) return false;
    if (marker.type === 'body') {
      this.app.selectTarget(marker.id);
      this.app.hud.notify(`MAP TARGET: ${marker.body.name} selected for scanner/navigation.`);
      return true;
    }
    if (marker.type === 'phenomenon') {
      this.app.selectPhenomenon(marker.id, false);
      this.app.hud.notify(`MAP SOURCE: ${this.app.discoveredPhenomena.has(marker.id) ? marker.phenomenon.label : 'UNIDENTIFIED SIGNAL'} selected in COSMOS.`);
      return true;
    }
    return false;
  }

  scanCurrent() {
    const marker = this.currentMarker();
    if (!marker || marker.type !== 'phenomenon') return false;
    this.app.selectPhenomenon(marker.id, false);
    this.app.scanPhenomenon();
    this.updateSelectionText(this.currentMarker());
    this.draw();
    return true;
  }

  transitCurrent() {
    const marker = this.currentMarker();
    if (!marker || marker.type === 'ship') return false;
    if (marker.type === 'body') {
      this.app.selectTarget(marker.id);
      const source = this.root.querySelector('#transitTargetSource'); if (source) source.value = 'body';
    } else {
      this.app.selectPhenomenon(marker.id, false);
      const source = this.root.querySelector('#transitTargetSource'); if (source) source.value = 'cosmic';
    }
    this.app.updateTransitPanel();
    this.app.hud.toggleMap(false);
    this.app.hud.toggleTransit(true);
    return true;
  }
}
