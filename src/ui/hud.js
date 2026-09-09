import { PHYSICS } from '../core/constants.js';

function fmt(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function distance(value) {
  if (!Number.isFinite(value)) return '—';
  const a = Math.abs(value);
  if (a >= PHYSICS.AU * 0.01) return `${fmt(value / PHYSICS.AU, 4)} AU`;
  if (a >= 1e9) return `${fmt(value / 1e9, 3)} Gm`;
  if (a >= 1e6) return `${fmt(value / 1e6, 2)} Mm`;
  if (a >= 1e3) return `${fmt(value / 1e3, 2)} km`;
  return `${fmt(value, 1)} m`;
}

function speed(value) {
  if (!Number.isFinite(value)) return '—';
  return Math.abs(value) >= 1000 ? `${fmt(value / 1000, 3)} km/s` : `${fmt(value, 2)} m/s`;
}

function acceleration(value) {
  if (!Number.isFinite(value)) return '—';
  return value >= 0.01 ? `${fmt(value, 4)} m/s²` : `${value.toExponential(3)} m/s²`;
}

export class Hud {
  constructor(root) {
    this.root = root;
    this.fps = root.querySelector('#fpsValue');
    this.renderer = root.querySelector('#rendererValue');
    this.seed = root.querySelector('#seedValue');
    this.simTime = root.querySelector('#simTimeValue');
    this.speed = root.querySelector('#speedValue');
    this.bodyCount = root.querySelector('#bodyCountValue');
    this.minorCount = root.querySelector('#minorCountValue');
    this.physicsMs = root.querySelector('#physicsMsValue');
    this.renderMs = root.querySelector('#renderMsValue');
    this.drawCalls = root.querySelector('#drawCallsValue');
    this.predictionMs = root.querySelector('#predictionMsValue');
    this.message = root.querySelector('#message');
    this.lab = root.querySelector('#labPanel');
    this.science = root.querySelector('#sciencePanel');
    this.scanner = root.querySelector('#scannerPanel');
    this.targetChip = root.querySelector('#targetChip');
    this.targetName = root.querySelector('#targetName');
    this.targetKind = root.querySelector('#targetKind');
    this.targetDistance = root.querySelector('#targetDistance');
    this.targetAltitude = root.querySelector('#targetAltitude');
    this.targetRelativeSpeed = root.querySelector('#targetRelativeSpeed');
    this.targetRadialSpeed = root.querySelector('#targetRadialSpeed');
    this.targetGravity = root.querySelector('#targetGravity');
    this.targetEscape = root.querySelector('#targetEscape');
    this.targetCircular = root.querySelector('#targetCircular');
    this.targetEccentricity = root.querySelector('#targetEccentricity');
    this.targetPeriapsis = root.querySelector('#targetPeriapsis');
    this.targetApoapsis = root.querySelector('#targetApoapsis');
    this.targetOrbitState = root.querySelector('#targetOrbitState');
    this.predictedApproach = root.querySelector('#predictedApproach');
    this.impactReadout = root.querySelector('#impactReadout');
  }

  setRenderer(name) { this.renderer.textContent = name; }
  setSeed(seed) { this.seed.textContent = seed; }
  toggleLab(force) { this.lab.hidden = typeof force === 'boolean' ? !force : !this.lab.hidden; }
  toggleScience(force) { this.science.hidden = typeof force === 'boolean' ? !force : !this.science.hidden; }
  toggleScanner(force) { this.scanner.hidden = typeof force === 'boolean' ? !force : !this.scanner.hidden; }
  notify(text) { this.message.textContent = text; }

  setTarget(body, metrics, prediction = null) {
    if (!body || !metrics) {
      this.targetChip.hidden = true;
      this.targetName.textContent = 'No target';
      return;
    }
    this.targetChip.hidden = false;
    this.targetChip.textContent = `TARGET ${body.name} · ${distance(metrics.distanceMeters)} · Δv ${speed(metrics.relativeSpeedMps)}`;
    this.targetName.textContent = body.name;
    this.targetKind.textContent = `${body.kind}${body.planetType ? ` · ${body.planetType}` : ''}`;
    this.targetDistance.textContent = distance(metrics.distanceMeters);
    this.targetAltitude.textContent = distance(metrics.altitudeMeters);
    this.targetRelativeSpeed.textContent = speed(metrics.relativeSpeedMps);
    this.targetRadialSpeed.textContent = `${metrics.radialSpeedMps >= 0 ? '+' : ''}${speed(metrics.radialSpeedMps)}`;
    this.targetGravity.textContent = acceleration(metrics.gravityMps2);
    this.targetEscape.textContent = speed(metrics.escapeSpeedMps);
    this.targetCircular.textContent = speed(metrics.circularSpeedMps);
    this.targetEccentricity.textContent = fmt(metrics.eccentricity, 5);
    this.targetPeriapsis.textContent = distance(metrics.periapsisAltitudeMeters);
    this.targetApoapsis.textContent = Number.isFinite(metrics.apoapsisAltitudeMeters) ? distance(metrics.apoapsisAltitudeMeters) : 'unbound';
    this.targetOrbitState.textContent = metrics.boundTwoBody ? 'bound (two-body osculating)' : 'unbound / escape-like';
    if (prediction?.impact) {
      this.predictedApproach.textContent = `Impact: ${prediction.impact.bodyName} in ${fmt(prediction.impact.timeSeconds / 3600, 2)} h at ${speed(prediction.impact.relativeSpeedMps)}`;
    } else if (prediction?.targetClosest) {
      this.predictedApproach.textContent = `Predicted closest surface separation: ${distance(prediction.targetClosest.separationMeters)} in ${fmt(prediction.targetClosest.timeSeconds / 3600, 2)} h`;
    } else if (prediction?.closest) {
      this.predictedApproach.textContent = `Closest sampled surface separation: ${distance(prediction.closest.separationMeters)} near ${prediction.closest.bodyName}`;
    } else {
      this.predictedApproach.textContent = 'Prediction not active.';
    }
  }

  setImpact(event, report) {
    if (!event || !report) return;
    this.impactReadout.textContent = `${event.a.name} ↔ ${event.b.name}: ${report.centerOfMassEnergyJ.toExponential(4)} J · Qᴿ ${report.specificImpactEnergyJkg.toExponential(3)} J/kg · μv ${report.relativeMomentumKgMps.toExponential(3)} kg·m/s`;
  }

  update({ fps, elapsedSeconds, shipSpeed, bodyCount, minorCount, physicsMs, renderMs, predictionMs, drawCalls }) {
    this.fps.textContent = `${Math.round(fps)}`;
    this.simTime.textContent = `${fmt(elapsedSeconds / PHYSICS.DAY, 3)} d`;
    this.speed.textContent = speed(shipSpeed);
    this.bodyCount.textContent = `${bodyCount}`;
    this.minorCount.textContent = Number(minorCount).toLocaleString();
    this.physicsMs.textContent = `${fmt(physicsMs, 2)} ms`;
    this.renderMs.textContent = `${fmt(renderMs, 2)} ms`;
    this.predictionMs.textContent = `${fmt(predictionMs, 2)} ms`;
    this.drawCalls.textContent = drawCalls == null ? '—' : String(drawCalls);
  }
}
