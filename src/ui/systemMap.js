import { BODY_KIND, PHYSICS } from '../core/constants.js';
import { apparentAngularRadiusRad, phaseAppearance, stellarVisibilityAtBody } from '../core/celestialAppearance.js';
import { ANOMALY_REALITY_LABELS } from '../cosmic/anomalyGenerator.js';
import { frameOrbitInsertionPlan } from '../physics/frameOrbitInsertion.js';
import { navigationBodySnapshot, orderedNavigationBodies } from '../navigation/systemNavigation.js';

function distanceLabel(meters) {
  if (!Number.isFinite(meters)) return '—';
  const abs = Math.abs(meters);
  const au = abs / PHYSICS.AU;
  if (au >= 0.01) return `${au.toFixed(au >= 100 ? 1 : au >= 10 ? 2 : 4)} AU`;
  if (abs >= 1e9) return `${(meters / 1e9).toFixed(2)} Gm`;
  if (abs >= 1e6) return `${(meters / 1e6).toFixed(2)} Mm`;
  if (abs >= 1e3) return `${(meters / 1e3).toFixed(2)} km`;
  return `${meters.toFixed(1)} m`;
}

function massLabel(mass) {
  if (!Number.isFinite(mass) || mass <= 0) return '—';
  if (mass >= PHYSICS.SOLAR_MASS * 0.01) return `${(mass / PHYSICS.SOLAR_MASS).toFixed(4)} M☉`;
  if (mass >= PHYSICS.JUPITER_MASS * 0.25) return `${(mass / PHYSICS.JUPITER_MASS).toFixed(3)} M♃`;
  if (mass >= PHYSICS.EARTH_MASS * 0.01) return `${(mass / PHYSICS.EARTH_MASS).toFixed(3)} M⊕`;
  return `${mass.toExponential(3)} kg`;
}

function periodLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds >= PHYSICS.YEAR) return `${(seconds / PHYSICS.YEAR).toFixed(3)} yr`;
  if (seconds >= PHYSICS.DAY) return `${(seconds / PHYSICS.DAY).toFixed(3)} d`;
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(2)} h`;
  return `${seconds.toFixed(0)} s`;
}

function rotationLabel(body) {
  const seconds = Number(body?.rotationPeriodSeconds);
  if (!(seconds > 0)) return 'STATIC / UNMODELED';
  const direction = Number(body?.rotationDirection) < 0 ? 'RETRO' : 'PRO';
  return `${periodLabel(seconds)} · ${direction}`;
}

function angularDiameterLabel(radians) {
  const degrees = Math.max(0, Number(radians) || 0) * 180 / Math.PI;
  if (degrees >= 1) return `${degrees.toFixed(3)}°`;
  const arcMinutes = degrees * 60;
  if (arcMinutes >= 1) return `${arcMinutes.toFixed(2)}′`;
  return `${(arcMinutes * 60).toFixed(2)}″`;
}

function speedLabel(mps) {
  if (!Number.isFinite(mps) || mps < 0) return '—';
  if (mps >= 1e6) return `${(mps / 1e6).toFixed(3)} Mm/s`;
  if (mps >= 1e3) return `${(mps / 1e3).toFixed(3)} km/s`;
  return `${mps.toFixed(2)} m/s`;
}

function fluxLabel(wm2, earthFlux) {
  if (!Number.isFinite(wm2) || wm2 < 0) return '—';
  const flux = wm2 >= 1000 ? `${wm2.toFixed(0)} W/m²` : wm2 >= 10 ? `${wm2.toFixed(1)} W/m²` : `${wm2.toFixed(3)} W/m²`;
  return Number.isFinite(earthFlux) ? `${flux} · ${earthFlux.toFixed(3)} S⊕` : flux;
}

function pressureLabel(pa, capped = false) {
  if (!Number.isFinite(pa) || pa < 0) return '—';
  let label;
  if (pa >= 100_000) label = `${(pa / 100_000).toFixed(3)} bar`;
  else if (pa >= 1_000) label = `${(pa / 1_000).toFixed(2)} kPa`;
  else if (pa >= 1) label = `${pa.toFixed(1)} Pa`;
  else label = `${pa.toExponential(2)} Pa`;
  return capped ? `≥${label} · MODEL LIMIT` : label;
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

function linearProjection(position, origin, cx, cy, radiusPx, maxMeters, zoom = 1) {
  const x = Number(position?.[0] ?? 0) - Number(origin?.[0] ?? 0);
  const z = Number(position?.[2] ?? 0) - Number(origin?.[2] ?? 0);
  const rMeters = Math.hypot(x, z);
  const scaleMeters = Math.max(1, maxMeters / Math.max(0.55, zoom));
  const factor = radiusPx / scaleMeters;
  return { x: cx + x * factor, y: cy + z * factor, rMeters };
}

function appendOption(group, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  group.appendChild(option);
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
    this.viewMode = 'survey';
    this.includeUnknown = true;
    this._catalogSignature = '';
    this._boundPointer = (event) => this.onPointer(event);
    this.canvas?.addEventListener('pointerdown', this._boundPointer);
  }

  setZoom(value) {
    const n = Number(value);
    this.zoom = Number.isFinite(n) ? Math.max(0.55, Math.min(n, 3.5)) : 1;
    this.draw();
  }

  setViewMode(value) {
    this.viewMode = ['survey', 'true-system', 'true-local'].includes(value) ? value : 'survey';
    this.draw();
    this.updateSelectionText();
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
    for (const body of bodies) entries.push({ type: 'body', id: body.id, label: body.name, kind: body.kind, position: body.position, body });
    for (const phenomenon of phenomena) {
      const state = this.stateForPhenomenon(phenomenon);
      if (!state?.center) continue;
      entries.push({ type: 'phenomenon', id: phenomenon.id, label: phenomenon.label, kind: phenomenon.kind, position: state.center, phenomenon, state });
    }
    const ship = this.app.ship;
    if (ship?.position) entries.push({ type: 'ship', id: 'ship', label: 'SPACECRAFT', kind: 'ship', position: ship.position });
    return { origin, entries, star };
  }

  refreshBodyCatalog(force = false) {
    const select = this.root.querySelector('#mapBodySelect');
    if (!select) return;
    const hierarchy = orderedNavigationBodies(this.app.bodies);
    const signature = this.app.bodies.map((body) => `${body.id}:${body.kind}:${body.parentId ?? ''}`).join('|');
    const desired = this.selection?.type === 'body' ? this.selection.id : this.app.targetId;
    if (!force && signature === this._catalogSignature && select.options.length > 1) {
      if (desired && [...select.options].some((option) => option.value === desired)) select.value = desired;
      return;
    }
    this._catalogSignature = signature;
    select.replaceChildren();

    if (hierarchy.star) {
      const group = document.createElement('optgroup');
      group.label = 'PRIMARY STAR';
      appendOption(group, hierarchy.star.id, `★ ${hierarchy.star.name}`);
      select.appendChild(group);
    }
    for (const planet of hierarchy.planets) {
      const moons = hierarchy.moonsByParent.get(planet.id) ?? [];
      const group = document.createElement('optgroup');
      group.label = `${planet.name} · ${moons.length} moon${moons.length === 1 ? '' : 's'}`;
      appendOption(group, planet.id, `● ${planet.name}`);
      for (const moon of moons) appendOption(group, moon.id, `↳ ${moon.name}`);
      select.appendChild(group);
    }
    if (hierarchy.other.length) {
      const group = document.createElement('optgroup');
      group.label = 'OTHER PHYSICAL BODIES';
      for (const body of hierarchy.other) appendOption(group, body.id, `${body.kind === BODY_KIND.COMET ? '☄' : '◆'} ${body.name}`);
      select.appendChild(group);
    }

    const fallback = desired && [...select.options].some((option) => option.value === desired)
      ? desired
      : hierarchy.planets[0]?.id ?? hierarchy.star?.id ?? select.options[0]?.value;
    if (fallback) {
      select.value = fallback;
      if (!this.selection || this.selection.type === 'body') this.selection = { type: 'body', id: fallback };
    }
  }

  selectedBody() {
    if (this.selection?.type !== 'body') return null;
    return this.app.registry.get(this.selection.id) ?? null;
  }

  localFocusBody() {
    const selected = this.selectedBody() ?? this.app.target;
    if (!selected) return null;
    if (selected.kind === BODY_KIND.PLANET) return selected;
    if (selected.kind === BODY_KIND.MOON && selected.parentId) return this.app.registry.get(selected.parentId) ?? null;
    return null;
  }

  viewContext(collected) {
    if (this.viewMode === 'true-local') {
      const focus = this.localFocusBody();
      if (focus) {
        const family = collected.entries.filter((entry) => entry.type === 'body' && (entry.id === focus.id || entry.body.parentId === focus.id));
        let maxMeters = Math.max(Number(focus.radius) * 12 || 1, 1e7);
        for (const entry of family) {
          maxMeters = Math.max(maxMeters, Math.hypot(entry.position[0] - focus.position[0], entry.position[2] - focus.position[2]));
        }
        const ship = collected.entries.find((entry) => entry.type === 'ship');
        if (ship) {
          const range = Math.hypot(ship.position[0] - focus.position[0], ship.position[2] - focus.position[2]);
          if (range <= maxMeters * 2.5) family.push(ship);
        }
        return { origin: focus.position, entries: family, maxMeters: Math.max(maxMeters * 1.2, 1), linear: true, label: `TRUE LOCAL · ${focus.name} + MOONS` };
      }
    }

    if (this.viewMode === 'true-system') {
      let maxMeters = PHYSICS.AU;
      for (const entry of collected.entries) {
        const dx = Number(entry.position?.[0] ?? 0) - Number(collected.origin?.[0] ?? 0);
        const dz = Number(entry.position?.[2] ?? 0) - Number(collected.origin?.[2] ?? 0);
        maxMeters = Math.max(maxMeters, Math.hypot(dx, dz));
      }
      return { origin: collected.origin, entries: collected.entries, maxMeters: maxMeters * 1.08, linear: true, label: 'TRUE SYSTEM · LINEAR X/Z' };
    }

    let maxAu = 1;
    for (const entry of collected.entries) {
      const dx = Number(entry.position?.[0] ?? 0) - Number(collected.origin?.[0] ?? 0);
      const dz = Number(entry.position?.[2] ?? 0) - Number(collected.origin?.[2] ?? 0);
      maxAu = Math.max(maxAu, Math.hypot(dx, dz) / PHYSICS.AU);
    }
    return { origin: collected.origin, entries: collected.entries, maxAu: Math.max(2.2, maxAu / this.zoom), linear: false, label: 'LOG SURVEY · NON-LINEAR RANGE' };
  }

  project(position, context, cx, cy, radiusPx) {
    if (context.linear) return linearProjection(position, context.origin, cx, cy, radiusPx, context.maxMeters, this.zoom);
    const x = Number(position?.[0] ?? 0) - Number(context.origin?.[0] ?? 0);
    const z = Number(position?.[2] ?? 0) - Number(context.origin?.[2] ?? 0);
    const rMeters = Math.hypot(x, z);
    if (rMeters < 1) return { x: cx, y: cy, rMeters };
    const rAu = rMeters / PHYSICS.AU;
    const compressed = Math.log1p(rAu * 2.4 * this.zoom) / Math.log1p(Math.max(0.01, context.maxAu) * 2.4 * this.zoom);
    const rr = Math.min(radiusPx, compressed * radiusPx);
    const angle = Math.atan2(z, x);
    return { x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr, rMeters };
  }

  drawScaleRings(ctx, context, cx, cy, mapRadius, scale) {
    ctx.save();
    ctx.strokeStyle = 'rgba(120,175,225,.15)';
    ctx.lineWidth = Math.max(1, this.canvas.width / 900);
    ctx.fillStyle = 'rgba(145,177,208,.62)';
    ctx.font = `${Math.max(10, this.canvas.width / 80)}px ui-monospace,monospace`;
    if (!context.linear) {
      for (const au of [0.5, 1, 2, 5, 10, 20, 40]) {
        if (au > context.maxAu * 1.15) continue;
        const rr = Math.log1p(au * 2.4 * this.zoom) / Math.log1p(context.maxAu * 2.4 * this.zoom) * mapRadius;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.fillText(`${au} AU`, cx + rr + 4, cy - 3);
      }
    } else {
      for (const fraction of [0.25, 0.5, 0.75, 1]) {
        const rr = mapRadius * fraction;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.fillText(distanceLabel(context.maxMeters / this.zoom * fraction), cx + rr + 4, cy - 3);
      }
    }
    ctx.restore();
  }

  draw() {
    if (!this.canvas || !this.ctx || this.root.querySelector('#mapPanel')?.hidden) return;
    this.refreshBodyCatalog();
    this.resize();
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#020711'; ctx.fillRect(0, 0, w, h);
    const collected = this.collect();
    const context = this.viewContext(collected);
    const cx = w * 0.5, cy = h * 0.5;
    const mapRadius = Math.max(60, Math.min(w, h) * 0.43);
    const scale = Math.max(1, w / 700);
    this.drawScaleRings(ctx, context, cx, cy, mapRadius, scale);

    this.markers = [];
    for (const entry of context.entries) {
      const point = this.project(entry.position, context, cx, cy, mapRadius);
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
        if (isSelected) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * scale; ctx.beginPath(); ctx.arc(point.x, point.y, 11 * scale, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(235,248,255,.92)'; ctx.font = `${Math.max(10, 9 * scale)}px ui-monospace,monospace`; ctx.fillText(entry.label, point.x + 13 * scale, point.y - 8 * scale);
        }
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
      if (anomaly) { ctx.moveTo(point.x, point.y - rr); ctx.lineTo(point.x + rr, point.y); ctx.lineTo(point.x, point.y + rr); ctx.lineTo(point.x - rr, point.y); ctx.closePath(); }
      else ctx.arc(point.x, point.y, rr, 0, Math.PI * 2);
      if (discovered) ctx.fill(); else ctx.stroke();
      if (!discovered) {
        ctx.fillStyle = '#dce5ef'; ctx.font = `${Math.max(10, 10 * scale)}px ui-monospace,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', point.x, point.y + .5 * scale);
      }
      if (isSelected) { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(point.x, point.y, 12 * scale, 0, Math.PI * 2); ctx.stroke(); }
      this.markers.push({ ...entry, x: point.x, y: point.y, hit: 16 * scale, distanceMeters: point.rMeters });
    }

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(220,238,255,.72)'; ctx.font = `${Math.max(10, w / 80)}px ui-monospace,monospace`;
    ctx.fillText(`${context.label} · ${this.app.cosmicPhenomena.values.filter((x) => x.anomaly).length} seeded anomalies`, 10 * scale, 18 * scale);
    const projection = this.root.querySelector('#mapProjectionModel');
    if (projection) projection.textContent = context.label;
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
    const bodySelect = this.root.querySelector('#mapBodySelect');
    if (best.type === 'body' && bodySelect && [...bodySelect.options].some((option) => option.value === best.id)) bodySelect.value = best.id;
    this.updateSelectionText(best);
    this.draw();
  }

  selectBodyById(id) {
    const body = this.app.registry.get(id);
    if (!body) return false;
    this.selection = { type: 'body', id: body.id };
    const select = this.root.querySelector('#mapBodySelect');
    if (select && [...select.options].some((option) => option.value === body.id)) select.value = body.id;
    this.updateSelectionText();
    this.draw();
    return true;
  }

  setDetail(id, text) {
    const el = this.root.querySelector(id);
    if (el) el.textContent = text;
  }

  updateSelectionText(marker = null) {
    this.refreshBodyCatalog();
    const title = this.root.querySelector('#mapSelectionName');
    const kind = this.root.querySelector('#mapSelectionKind');
    const status = this.root.querySelector('#mapSelectionStatus');
    const landButton = this.root.querySelector('#mapLandAction');
    const selection = marker ?? this.currentMarker();
    if (landButton) { landButton.disabled = true; landButton.title = 'Select the current detailed landable world and move into its near-orbital descent envelope.'; }

    for (const id of ['#mapSelectionDistance','#mapSelectionStarRange','#mapSelectionParent','#mapSelectionClass','#mapSelectionRadius','#mapSelectionMass','#mapSelectionGravity','#mapSelectionOrbit','#mapSelectionEccentricity','#mapSelectionRotation','#mapSelectionHill','#mapSelectionSurface','#mapSelectionAtmosphere','#mapSelectionEscape','#mapSelectionFlux','#mapSelectionEquilibrium','#mapSelectionAlbedo','#mapSelectionPressure','#mapSelectionRetention','#mapSelectionVolatiles','#mapSelectionSurfaceFamily','#mapSelectionTidal','#mapSelectionAngular','#mapSelectionPhase','#mapSelectionShadow','#mapSelectionFrameArrival']) this.setDetail(id, '—');

    if (!selection) {
      if (title) title.textContent = 'Choose a body or tap a marker';
      if (kind) kind.textContent = '—';
      if (status) status.textContent = 'The BODY CATALOG exposes the star → planets → moons hierarchy directly from the authoritative generated body registry.';
      return;
    }

    if (selection.type === 'body') {
      const body = selection.body ?? this.app.registry.get(selection.id);
      if (!body) return;
      const snapshot = navigationBodySnapshot(body, this.app.bodies, this.app.ship);
      if (title) title.textContent = body.name;
      if (kind) kind.textContent = body.kind.toUpperCase();
      this.setDetail('#mapSelectionDistance', distanceLabel(snapshot.shipRangeMeters));
      this.setDetail('#mapSelectionStarRange', distanceLabel(snapshot.starRangeMeters));
      this.setDetail('#mapSelectionParent', snapshot.parent?.name ?? (body.kind === BODY_KIND.STAR ? 'SYSTEM PRIMARY' : 'UNBOUND / NONE'));
      this.setDetail('#mapSelectionClass', snapshot.classLabel);
      this.setDetail('#mapSelectionRadius', distanceLabel(Number(body.radius)));
      this.setDetail('#mapSelectionMass', massLabel(Number(body.mass)));
      this.setDetail('#mapSelectionGravity', Number.isFinite(snapshot.surfaceGravityMps2) ? `${snapshot.surfaceGravityMps2.toFixed(3)} m/s²` : '—');
      this.setDetail('#mapSelectionOrbit', periodLabel(snapshot.orbitalPeriodSeconds));
      this.setDetail('#mapSelectionEccentricity', Number.isFinite(Number(body.eccentricity)) ? Number(body.eccentricity).toFixed(5) : '—');
      this.setDetail('#mapSelectionRotation', rotationLabel(body));
      this.setDetail('#mapSelectionHill', distanceLabel(snapshot.hillRadiusMeters));
      this.setDetail('#mapSelectionSurface', snapshot.surfaceCapability);
      this.setDetail('#mapSelectionAtmosphere', snapshot.atmosphereModel);
      const environment = snapshot.environment;
      this.setDetail('#mapSelectionEscape', speedLabel(environment?.escapeVelocityMps));
      this.setDetail('#mapSelectionFlux', fluxLabel(environment?.currentStellarFluxWm2, environment?.referenceFluxEarth));
      this.setDetail('#mapSelectionEquilibrium', Number.isFinite(environment?.equilibriumTemperatureK)
        ? `${environment.equilibriumTemperatureK.toFixed(1)} K · RADIATIVE EQ`
        : '—');
      this.setDetail('#mapSelectionAlbedo', Number.isFinite(environment?.bondAlbedo) ? environment.bondAlbedo.toFixed(3) : '—');
      this.setDetail('#mapSelectionPressure', environment?.atmosphereClassId === 'deep-envelope'
        ? 'DEPTH-DEPENDENT · NO SURFACE PRESSURE'
        : pressureLabel(environment?.atmospherePressureProxyPa, environment?.atmospherePressureCapped));
      this.setDetail('#mapSelectionRetention', environment?.atmosphereClassId === 'deep-envelope'
        ? 'H/HE ENVELOPE · NOT JEANS-SCORED HERE'
        : Number.isFinite(environment?.atmosphereRetentionScore)
          ? `${(environment.atmosphereRetentionScore * 100).toFixed(1)}% · λ ${Number.isFinite(environment?.atmosphereRetentionParameter) ? environment.atmosphereRetentionParameter.toFixed(2) : '—'}`
          : '—');
      this.setDetail('#mapSelectionVolatiles', environment
        ? `${(environment.volatileInventory01 * 100).toFixed(1)}% formation · ${(environment.icePotential01 * 100).toFixed(1)}% ice proxy`
        : '—');
      this.setDetail('#mapSelectionSurfaceFamily', environment?.surfaceFamily ?? '—');
      this.setDetail('#mapSelectionTidal', environment?.tidalRotationState ?? '—');
      const primaryStar = this.app.bodies.find((candidate) => candidate.kind === BODY_KIND.STAR) ?? null;
      const shipRange = Math.max(0, Number(snapshot.shipRangeMeters) || 0);
      this.setDetail('#mapSelectionAngular', angularDiameterLabel(apparentAngularRadiusRad(body.radius, shipRange) * 2));
      if (body.kind === BODY_KIND.STAR) {
        this.setDetail('#mapSelectionPhase', 'SELF-LUMINOUS');
        this.setDetail('#mapSelectionShadow', 'N/A');
      } else if (primaryStar?.position && this.app.ship?.position) {
        const phase = phaseAppearance(this.app.ship.position, body.position, primaryStar.position);
        this.setDetail('#mapSelectionPhase', `${(phase.illuminatedFraction * 100).toFixed(2)}% · phase ${(phase.phaseAngleRad * 180 / Math.PI).toFixed(2)}°`);
        const shadow = stellarVisibilityAtBody(body, primaryStar, this.app.bodies);
        this.setDetail('#mapSelectionShadow', shadow.eclipseFraction > 0
          ? `${(shadow.eclipseFraction * 100).toFixed(2)}% stellar disk blocked${shadow.occulterName ? ` · ${shadow.occulterName}` : ''}`
          : 'NONE');
      }
      const arrival = frameOrbitInsertionPlan(this.app.ship, body, this.app.bodies);
      this.setDetail('#mapSelectionFrameArrival', arrival.ok
        ? `CIRCULAR +${distanceLabel(arrival.altitudeMeters)}${arrival.hillLimited ? ' · HILL-LIMITED' : ''}`
        : 'INERTIAL FRAME MATCH');
      const landing = this.app.landingEligibility(body);
      if (landButton) { landButton.disabled = !landing.ok; landButton.title = landing.ok ? 'Enter the selected seeded surface region.' : landing.reason; }
      if (status) status.textContent = body.scientificWarning || (landing.ok
        ? `${snapshot.classLabel}. Surface engine enabled for this body; LAND / DESCEND is available now. ${environment?.scientificBoundary ?? ''}`
        : `${snapshot.classLabel}. ${landing.reason ?? environment?.landingReason ?? 'NAV and FRAME use this live body directly.'} ${environment?.scientificBoundary ?? ''}`);
      return;
    }

    if (selection.type === 'ship') {
      if (title) title.textContent = 'SPACECRAFT';
      if (kind) kind.textContent = 'SHIP';
      this.setDetail('#mapSelectionDistance', '0 m');
      if (status) status.textContent = 'Current spacecraft position projected from the live inertial state.';
      return;
    }

    const p = selection.phenomenon;
    if (!p) return;
    const discovered = this.app.discoveredPhenomena.has(p.id);
    const scanDepth = this.app.discoveryScanDepth.get(p.id) ?? (discovered ? 1 : 0);
    if (title) title.textContent = discovered ? p.label : 'UNIDENTIFIED SIGNAL';
    if (kind) kind.textContent = discovered ? (p.anomaly ? (ANOMALY_REALITY_LABELS[p.realityClass] ?? 'ANOMALY') : p.kind.toUpperCase()) : 'UNKNOWN';
    const center = selection.state?.center ?? this.stateForPhenomenon(p)?.center ?? null;
    const shipPosition = this.app.ship?.position ?? null;
    const phenomenonRange = center && shipPosition
      ? Math.hypot(center[0] - shipPosition[0], center[1] - shipPosition[1], center[2] - shipPosition[2])
      : null;
    this.setDetail('#mapSelectionDistance', distanceLabel(phenomenonRange));
    if (status) status.textContent = discovered
      ? `${p.scanSummary ?? p.scientificStatus}${p.anomaly ? ` Scan depth ${scanDepth}/3.` : ''}`
      : 'Passive sensors show a coherent source at this location. SCAN reveals more; its actual classification is hidden.';
  }

  currentMarker() {
    if (!this.selection) return null;
    const marker = this.markers.find((m) => m.type === this.selection.type && m.id === this.selection.id);
    if (marker) return marker;
    if (this.selection.type === 'body') {
      const body = this.app.registry.get(this.selection.id);
      if (body) return { type: 'body', id: body.id, label: body.name, kind: body.kind, position: body.position, body, distanceMeters: navigationBodySnapshot(body, this.app.bodies, this.app.ship).shipRangeMeters };
    }
    if (this.selection.type === 'phenomenon') {
      const phenomenon = this.app.cosmicPhenomena.get(this.selection.id);
      const state = phenomenon ? this.stateForPhenomenon(phenomenon) : null;
      if (phenomenon && state?.center) return { type: 'phenomenon', id: phenomenon.id, phenomenon, state, position: state.center };
    }
    return null;
  }

  selectCurrent() {
    const marker = this.currentMarker();
    if (!marker) return false;
    if (marker.type === 'body') {
      this.app.selectTarget(marker.id);
      this.app.hud.notify(`NAV TARGET: ${marker.body.name} selected from the live body registry.`);
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

  landCurrent() {
    const marker = this.currentMarker();
    if (!marker || marker.type !== 'body') return false;
    this.app.selectTarget(marker.id);
    const ok = this.app.enterSurface(marker.id);
    if (ok) this.app.hud.toggleMap(false);
    return ok;
  }
}
