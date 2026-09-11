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

function angularDiameter(value) {
  if (!Number.isFinite(value) || value < 0) return '—';
  const degrees = value * 180 / Math.PI;
  if (degrees >= 1) return `${fmt(degrees, 3)}°`;
  const arcMinutes = degrees * 60;
  if (arcMinutes >= 1) return `${fmt(arcMinutes, 2)}′`;
  return `${fmt(arcMinutes * 60, 2)}″`;
}

function stellarProximity(body, metrics) {
  if (body?.kind !== 'star' || !Number.isFinite(body.radius) || body.radius <= 0 || !Number.isFinite(metrics?.distanceMeters)) return null;
  const radii = metrics.distanceMeters / body.radius;
  if (radii > 25) return null;
  const zone = radii <= 1.08 ? 'PHOTOSPHERE' : radii <= 2 ? 'LOW CORONA' : radii <= 8 ? 'INNER CORONA' : 'STELLAR VICINITY';
  return { zone, radii, temperatureK: Number(body.temperatureK) || null };
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
    this.experimentParticles = root.querySelector('#experimentParticleCountValue');
    this.experimentMs = root.querySelector('#experimentMsValue');
    this.message = root.querySelector('#message');
    this.lab = root.querySelector('#labPanel');
    this.science = root.querySelector('#sciencePanel');
    this.scanner = root.querySelector('#scannerPanel');
    this.more = root.querySelector('#morePanel');
    this.cosmos = root.querySelector('#cosmosPanel');
    this.overlays = root.querySelector('#overlayPanel');
    this.transit = root.querySelector('#transitPanel');
    this.map = root.querySelector('#mapPanel');
    this.engineering = root.querySelector('#engineeringPanel');
    this.engineeringRenderer = root.querySelector('#engineeringRenderer');
    this.engineeringFps = root.querySelector('#engineeringFps');
    this.engineeringPhysics = root.querySelector('#engineeringPhysics');
    this.engineeringRender = root.querySelector('#engineeringRender');
    this.engineeringShipSpeed = root.querySelector('#engineeringShipSpeed');
    this.engineeringSimTime = root.querySelector('#engineeringSimTime');
    this.engineeringSeed = root.querySelector('#engineeringSeed');
    this.engineeringMajor = root.querySelector('#engineeringMajor');
    this.engineeringTest = root.querySelector('#engineeringTest');
    this.engineeringDraw = root.querySelector('#engineeringDraw');
    this.engineeringPrediction = root.querySelector('#engineeringPrediction');
    this.engineeringParticles = root.querySelector('#engineeringParticles');
    this.engineeringLab = root.querySelector('#engineeringLab');
    this._messageTimer = null;
    this.targetChip = root.querySelector('#targetChip');
    this.navChip = root.querySelector('#navChip');
    this.cameraChip = root.querySelector('#cameraChip');
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
    this.targetAngularDiameter = root.querySelector('#targetAngularDiameter');
    this.targetIllumination = root.querySelector('#targetIllumination');
    this.targetStellarShadow = root.querySelector('#targetStellarShadow');
    this.targetImpactCount = root.querySelector('#targetImpactCount');
    this.predictedApproach = root.querySelector('#predictedApproach');
    this.impactReadout = root.querySelector('#impactReadout');
  }

  showRuntimeError(error) {
    const message = error?.message ? String(error.message) : String(error || 'Unknown runtime error');
    this.fps.textContent = 'ERR';
    this.physicsMs.textContent = 'ERR';
    this.renderMs.textContent = 'ERR';
    this.speed.textContent = 'ERR';
    this.notify(`RUNTIME ERROR: ${message}`, 0);
  }

  setRenderer(name) {
    this.renderer.textContent = name;
    if (this.engineeringRenderer) this.engineeringRenderer.textContent = name;
  }
  setSeed(seed) {
    this.seed.textContent = seed;
    if (this.engineeringSeed) this.engineeringSeed.textContent = seed;
  }
  toggleLab(force) { this.lab.hidden = typeof force === 'boolean' ? !force : !this.lab.hidden; }
  toggleScience(force) { this.science.hidden = typeof force === 'boolean' ? !force : !this.science.hidden; }
  toggleScanner(force) { this.scanner.hidden = typeof force === 'boolean' ? !force : !this.scanner.hidden; }
  toggleMore(force) { this.more.hidden = typeof force === 'boolean' ? !force : !this.more.hidden; }
  toggleCosmos(force) { this.cosmos.hidden = typeof force === 'boolean' ? !force : !this.cosmos.hidden; }
  toggleOverlays(force) { this.overlays.hidden = typeof force === 'boolean' ? !force : !this.overlays.hidden; }
  toggleTransit(force) { if (this.transit) this.transit.hidden = typeof force === 'boolean' ? !force : !this.transit.hidden; }
  toggleMap(force) { if (this.map) this.map.hidden = typeof force === 'boolean' ? !force : !this.map.hidden; }
  toggleEngineering(force) { if (this.engineering) this.engineering.hidden = typeof force === 'boolean' ? !force : !this.engineering.hidden; }
  notify(text, holdMs = 4400) {
    this.message.hidden = false;
    this.message.textContent = text;
    clearTimeout(this._messageTimer);
    if (holdMs > 0) this._messageTimer = setTimeout(() => { this.message.hidden = true; }, holdMs);
  }

  setTarget(body, metrics, prediction = null, appearance = null) {
    if (!body || !metrics) {
      this.targetChip.hidden = true;
      this.targetName.textContent = 'No target';
      return;
    }
    this.targetChip.hidden = false;
    const stellar = stellarProximity(body, metrics);
    this.targetChip.textContent = stellar
      ? `${stellar.zone} ${body.name} · ${fmt(stellar.radii, 2)} R★ · Δv ${speed(metrics.relativeSpeedMps)}`
      : `TARGET ${body.name} · ${distance(metrics.distanceMeters)} · Δv ${speed(metrics.relativeSpeedMps)}`;
    this.targetName.textContent = body.name;
    this.targetKind.textContent = body.kind === 'star'
      ? `${body.kind}${body.spectralClass ? ` · ${body.spectralClass}` : ''}${Number.isFinite(body.temperatureK) ? ` · ${fmt(body.temperatureK, 0)} K` : ''}`
      : `${body.kind}${body.planetType ? ` · ${body.planetType}` : ''}`;
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
    if (this.targetAngularDiameter) this.targetAngularDiameter.textContent = appearance ? angularDiameter(appearance.angularDiameterRad) : '—';
    if (this.targetIllumination) this.targetIllumination.textContent = body.kind === 'star'
      ? 'SELF-LUMINOUS'
      : appearance ? `${fmt((appearance.illuminatedFraction ?? 0) * 100, 2)}% · phase ${fmt((appearance.phaseAngleRad ?? 0) * 180 / Math.PI, 2)}°` : '—';
    if (this.targetStellarShadow) this.targetStellarShadow.textContent = body.kind === 'star'
      ? 'N/A'
      : appearance && (appearance.stellarEclipseFraction ?? 0) > 0
        ? `${fmt(appearance.stellarEclipseFraction * 100, 2)}% blocked${appearance.stellarEclipseOcculterName ? ` · ${appearance.stellarEclipseOcculterName}` : ''}`
        : 'NONE';
    this.targetImpactCount.textContent = String(body.damageRecords?.length ?? 0);
    const predictionLimit = prediction?.accuracyLimited ? ' · numerical step budget limited' : '';
    if (prediction?.impact) {
      this.predictedApproach.textContent = `Impact: ${prediction.impact.bodyName} in ${fmt(prediction.impact.timeSeconds / 3600, 2)} h at ${speed(prediction.impact.relativeSpeedMps)}${predictionLimit}`;
    } else if (prediction?.targetClosest) {
      this.predictedApproach.textContent = `Predicted closest surface separation: ${distance(prediction.targetClosest.separationMeters)} in ${fmt(prediction.targetClosest.timeSeconds / 3600, 2)} h${predictionLimit}`;
    } else if (prediction?.closest) {
      this.predictedApproach.textContent = `Closest sampled surface separation: ${distance(prediction.closest.separationMeters)} near ${prediction.closest.bodyName}${predictionLimit}`;
    } else {
      this.predictedApproach.textContent = prediction?.accuracyLimited ? 'Prediction numerical step budget limited.' : 'Prediction not active.';
    }
  }


  setCamera(mode, label = null, style = null, state = null) {
    if (!this.cameraChip) return;
    if (mode !== 'observe') {
      this.cameraChip.hidden = true;
      this.cameraChip.textContent = 'CAMERA SHIP';
      this.cameraChip.classList.remove('observing');
      return;
    }
    this.cameraChip.hidden = false;
    if (state?.activeCount != null) {
      const active = Number(state.activeCount).toLocaleString();
      this.cameraChip.textContent = `CAMERA ${String(style || 'frame').toUpperCase()} · ${label || 'Experiment'} · ${active} active · BUILD ENVWX-144`;
    } else {
      this.cameraChip.textContent = `CAMERA ${String(style || 'frame').toUpperCase()} · ${label || 'Cosmic source'} · BUILD ENVWX-144`;
    }
    this.cameraChip.classList.add('observing');
  }

  setNavigation(status, target, engineMode, accelerationMps2) {
    if (!status || !this.navChip) {
      if (this.navChip) this.navChip.hidden = true;
      return;
    }
    this.navChip.hidden = false;
    const engine = engineMode === 'boost' ? 'BOOST' : engineMode === 'cruise' ? 'CRUISE' : 'FLIGHT';
    if (status.mode === 'frame' || status.mode === 'transit') {
      const remaining = distance(status.remainingMeters);
      this.navChip.textContent = `FRAME ${target?.name ?? ''} · ${fmt(status.multipleC,0)} c · remaining ${remaining} · exit matches target frame`;
      return;
    }
    if (status.mode === 'turn-burn') {
      this.navChip.textContent = `TURN & BURN · lateral ${speed(status.lateralSpeedMps)} · angle ${fmt(status.angleDegrees,1)}° · ${engine} ${fmt(accelerationMps2,0)} m/s²`;
      return;
    }
    if (status.mode === 'brake') {
      this.navChip.textContent = `BRAKE · ${engine} ${fmt(accelerationMps2, 0)} m/s² · speed ${speed(status.relativeSpeedMps)}`;
      return;
    }
    if (!target) { this.navChip.hidden = true; return; }
    if (status.mode === 'match') {
      this.navChip.textContent = `STOP RELATIVE ${target.name} · Δv ${speed(status.relativeSpeedMps)} · ${engine} ${fmt(accelerationMps2, 0)} m/s²`;
      return;
    }
    const remaining = Number.isFinite(status.remainingMeters) ? distance(Math.abs(status.remainingMeters)) : '—';
    const closing = Number.isFinite(status.closingSpeedMps) ? speed(status.closingSpeedMps) : '—';
    const stop = Number.isFinite(status.stoppingDistanceMeters) ? distance(status.stoppingDistanceMeters) : '—';
    if (status.phase === 'holding' || status.phase === 'capture') {
      const rel = Number.isFinite(status.relativeSpeedMps) ? speed(status.relativeSpeedMps) : '—';
      const gravity = Number.isFinite(status.targetGravityMps2) ? `${fmt(status.targetGravityMps2, 2)} m/s²` : '—';
      this.navChip.textContent = `${status.phase.toUpperCase()} ${target.name} · offset ${remaining} · Δv ${rel} · g ${gravity}`;
      return;
    }
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

  update({ fps, elapsedSeconds, shipSpeed, bodyCount, minorCount, physicsMs, renderMs, predictionMs, drawCalls, experimentParticles = 0, experimentMs = 0 }) {
    this.fps.textContent = `${Math.round(fps)}`;
    this.simTime.textContent = `${fmt(elapsedSeconds / PHYSICS.DAY, 3)} d`;
    this.speed.textContent = speed(shipSpeed);
    this.bodyCount.textContent = `${bodyCount}`;
    this.minorCount.textContent = Number(minorCount).toLocaleString();
    this.physicsMs.textContent = `${fmt(physicsMs, 2)} ms`;
    this.renderMs.textContent = `${fmt(renderMs, 2)} ms`;
    this.predictionMs.textContent = `${fmt(predictionMs, 2)} ms`;
    this.drawCalls.textContent = drawCalls == null ? '—' : String(drawCalls);
    if (this.experimentParticles) this.experimentParticles.textContent = Number(experimentParticles).toLocaleString();
    if (this.experimentMs) this.experimentMs.textContent = `${fmt(experimentMs, 2)} ms`;

    // Dedicated read-only engineering drawer mirrors the same telemetry bus as
    // the cockpit diagnostics MFD; it never owns or mutates simulation state.
    if (this.engineeringFps) this.engineeringFps.textContent = `${Math.round(fps)}`;
    if (this.engineeringPhysics) this.engineeringPhysics.textContent = `${fmt(physicsMs, 2)} ms`;
    if (this.engineeringRender) this.engineeringRender.textContent = `${fmt(renderMs, 2)} ms`;
    if (this.engineeringShipSpeed) this.engineeringShipSpeed.textContent = speed(shipSpeed);
    if (this.engineeringSimTime) this.engineeringSimTime.textContent = `${fmt(elapsedSeconds / PHYSICS.DAY, 3)} d`;
    if (this.engineeringMajor) this.engineeringMajor.textContent = `${bodyCount}`;
    if (this.engineeringTest) this.engineeringTest.textContent = Number(minorCount).toLocaleString();
    if (this.engineeringDraw) this.engineeringDraw.textContent = drawCalls == null ? '—' : String(drawCalls);
    if (this.engineeringPrediction) this.engineeringPrediction.textContent = `${fmt(predictionMs, 2)} ms`;
    if (this.engineeringParticles) this.engineeringParticles.textContent = Number(experimentParticles).toLocaleString();
    if (this.engineeringLab) this.engineeringLab.textContent = `${fmt(experimentMs, 2)} ms`;
  }
}
