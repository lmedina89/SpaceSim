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


function mass(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toExponential(3)} kg`;
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
    this.more = root.querySelector('#morePanel');
    this._messageTimer = null;
    this.targetChip = root.querySelector('#targetChip');
    this.navChip = root.querySelector('#navChip');
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
    this.targetImpactCount = root.querySelector('#targetImpactCount');
    this.predictedApproach = root.querySelector('#predictedApproach');
    this.impactReadout = root.querySelector('#impactReadout');
  }

  setRenderer(name) { this.renderer.textContent = name; }
  setSeed(seed) { this.seed.textContent = seed; }
  toggleLab(force) { this.lab.hidden = typeof force === 'boolean' ? !force : !this.lab.hidden; }
  toggleScience(force) { this.science.hidden = typeof force === 'boolean' ? !force : !this.science.hidden; }
  toggleScanner(force) { this.scanner.hidden = typeof force === 'boolean' ? !force : !this.scanner.hidden; }
  toggleMore(force) { this.more.hidden = typeof force === 'boolean' ? !force : !this.more.hidden; }
  notify(text, holdMs = 4400) {
    this.message.hidden = false;
    this.message.textContent = text;
    clearTimeout(this._messageTimer);
    if (holdMs > 0) this._messageTimer = setTimeout(() => { this.message.hidden = true; }, holdMs);
  }

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
    this.targetImpactCount.textContent = String(body.damageRecords?.length ?? 0);
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


  setNavigation(status, target, engineMode, accelerationMps2) {
    if (!status || !this.navChip) {
      if (this.navChip) this.navChip.hidden = true;
      return;
    }
    this.navChip.hidden = false;
    const engine = engineMode === 'cruise' ? 'CRUISE' : 'FLIGHT';
    if (status.mode === 'brake') {
      this.navChip.textContent = `BRAKE · ${engine} ${fmt(accelerationMps2, 0)} m/s² · speed ${speed(status.relativeSpeedMps)}`;
      return;
    }
    if (!target) { this.navChip.hidden = true; return; }
    if (status.mode === 'match') {
      this.navChip.textContent = `MATCH ${target.name} · Δv ${speed(status.relativeSpeedMps)} · ${engine} ${fmt(accelerationMps2, 0)} m/s²`;
      return;
    }
    const remaining = Number.isFinite(status.remainingMeters) ? distance(Math.max(0, status.remainingMeters)) : '—';
    const closing = Number.isFinite(status.closingSpeedMps) ? speed(status.closingSpeedMps) : '—';
    const stop = Number.isFinite(status.stoppingDistanceMeters) ? distance(status.stoppingDistanceMeters) : '—';
    this.navChip.textContent = `${String(status.phase || 'approach').toUpperCase()} ${target.name} · remaining ${remaining} · closing ${closing} · brake ${stop}`;
  }

  setImpactResolution(resolution) {
    if (!resolution?.analysis) return;
    const a = resolution.analysis;
    const crater = resolution.crater;
    const craterText = crater ? ` · crater ${distance(crater.finalDiameterMeters)} wide × ${distance(crater.finalDepthMeters)} deep (${crater.simpleComplexClass})` : '';
    const fragments = resolution.createBodies?.length ?? 0;
    const fragmentText = fragments ? ` · ${fragments} resolved fragments · largest ${mass(resolution.largestFragmentMassKg)}` : '';
    this.impactReadout.textContent = `${a.impactor.name} → ${a.target.name}: ${a.centerOfMassEnergyJ.toExponential(4)} J · ${(a.tntMegatons).toExponential(3)} Mt TNT eq. · ${speed(a.relativeSpeedMps)} · angle ${fmt(a.impactAngleDegrees, 1)}° · Qᴿ ${a.specificImpactEnergyJkg.toExponential(3)} J/kg · response ${resolution.classification.mode}${craterText}${fragmentText}`;
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
