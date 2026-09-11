import { BODY_KIND, schwarzschildRadius } from '../core/constants.js';
import { analyzeImpactEvent, classifyImpact, estimateCrater, generateFragments, bodyDensityKgM3 } from './impactModel.js';

function weightedVelocity(a, b) {
  const total = a.mass + b.mass;
  return new Float64Array([
    (a.velocity[0] * a.mass + b.velocity[0] * b.mass) / total,
    (a.velocity[1] * a.mass + b.velocity[1] * b.mass) / total,
    (a.velocity[2] * a.mass + b.velocity[2] * b.mass) / total,
  ]);
}

function weightedPosition(a, b) {
  const total = a.mass + b.mass;
  return new Float64Array([
    (a.position[0] * a.mass + b.position[0] * b.mass) / total,
    (a.position[1] * a.mass + b.position[1] * b.mass) / total,
    (a.position[2] * a.mass + b.position[2] * b.mass) / total,
  ]);
}

function mergedRadius(a, b) {
  return Math.cbrt(a.radius ** 3 + b.radius ** 3);
}

function densityFromMassRadius(mass, radius) {
  if (!(mass > 0) || !(radius > 0)) return null;
  return mass / ((4 / 3) * Math.PI * radius ** 3);
}

function copy3(target, source) {
  if (!target || !source?.length) return;
  target[0] = source[0]; target[1] = source[1]; target[2] = source[2];
}

function moveEventBodiesToContact(event) {
  copy3(event.a?.position, event.contactPositionA);
  copy3(event.b?.position, event.contactPositionB);
  copy3(event.a?.velocity, event.contactVelocityA);
  copy3(event.b?.velocity, event.contactVelocityB);
}

function drift(body, seconds) {
  if (!(seconds > 0) || !body?.position || !body?.velocity) return;
  body.position[0] += body.velocity[0] * seconds;
  body.position[1] += body.velocity[1] * seconds;
  body.position[2] += body.velocity[2] * seconds;
}

function refreshMergedPhysicalMetadata(body) {
  if (body.kind === BODY_KIND.BLACK_HOLE) {
    body.radius = schwarzschildRadius(body.mass);
    body.densityKgM3 = Infinity;
    return;
  }
  if (body.kind === BODY_KIND.STAR) return; // stellar structure/radius evolution is outside this model.
  const density = densityFromMassRadius(body.mass, body.radius);
  if (Number.isFinite(density) && density > 0) body.densityKgM3 = density;
}

function applyBounce(analysis, restitution) {
  const { target, impactor, contactNormal: n } = analysis;
  const rv = [
    impactor.velocity[0] - target.velocity[0],
    impactor.velocity[1] - target.velocity[1],
    impactor.velocity[2] - target.velocity[2],
  ];
  const approaching = rv[0] * n[0] + rv[1] * n[1] + rv[2] * n[2];
  if (approaching >= 0) return;
  const invMass = 1 / target.mass + 1 / impactor.mass;
  const impulse = (-(1 + restitution) * approaching) / invMass;
  for (let k = 0; k < 3; k += 1) {
    target.velocity[k] -= (impulse / target.mass) * n[k];
    impactor.velocity[k] += (impulse / impactor.mass) * n[k];
  }
  // Keep a microscopic separation margin without shifting the system center of mass.
  const desired = (target.radius + impactor.radius) * 1.000001;
  const dx = impactor.position[0] - target.position[0];
  const dy = impactor.position[1] - target.position[1];
  const dz = impactor.position[2] - target.position[2];
  const separation = Math.hypot(dx, dy, dz);
  const correction = Math.max(0, desired - separation);
  if (correction > 0) {
    const total = target.mass + impactor.mass;
    const targetShare = impactor.mass / total;
    const impactorShare = target.mass / total;
    for (let k = 0; k < 3; k += 1) {
      target.position[k] -= n[k] * correction * targetShare;
      impactor.position[k] += n[k] * correction * impactorShare;
    }
  }
}

export function resolveImpact(event, options = {}) {
  // CollisionMonitor supplies an interpolated first-contact state when a swept collision occurred.
  // Resolve there instead of at the penetrated end-of-substep state. The short remainder is then
  // advanced ballistically; full N-body gravity resumes on the next global substep.
  moveEventBodiesToContact(event);
  const postContactSeconds = Math.max(0, Number(event.postContactSeconds) || 0);
  const analysis = analyzeImpactEvent(event);
  const classification = classifyImpact(analysis);
  const crater = estimateCrater(analysis);
  const result = {
    analysis,
    classification,
    crater,
    deleteIds: [],
    createBodies: [],
    unresolvedAccretedMassKg: 0,
    largestFragmentMassKg: 0,
    escapingFraction: 0,
    representedEjectaKineticEnergyJ: 0,
    ejectaEnergyBudgetJ: 0,
    targetDamageRecord: null,
  };

  if (classification.mode === 'bounce') {
    applyBounce(analysis, classification.restitution ?? 0.05);
    drift(analysis.target, postContactSeconds);
    drift(analysis.impactor, postContactSeconds);
    return result;
  }

  const { target, impactor } = analysis;
  if (classification.mode === 'absorb' || classification.mode === 'merge') {
    const combinedMass = target.mass + impactor.mass;
    target.velocity = weightedVelocity(target, impactor);
    target.position = weightedPosition(target, impactor);
    target.mass = combinedMass;
    if (target.kind === BODY_KIND.BLACK_HOLE) {
      target.radius = schwarzschildRadius(combinedMass);
    } else if (classification.mode === 'merge' && target.kind !== BODY_KIND.STAR) {
      target.radius = mergedRadius(target, impactor);
    }
    refreshMergedPhysicalMetadata(target);
    target.visualVersion = (target.visualVersion ?? 0) + 1;
    result.deleteIds.push(impactor.id);
    drift(target, postContactSeconds);
    return result;
  }

  const generated = generateFragments(analysis, {
    crater,
    maxFragments: options.maxGravityFragments,
    ejectaEnergyFraction: classification.catastrophic ? 0.35 : 0.20,
  });
  const fragmentMass = generated.fragments.reduce((sum, fragment) => sum + fragment.mass, 0);
  const accretedMass = Math.max(0, impactor.mass - fragmentMass);
  target.mass += accretedMass;
  copy3(target.velocity, generated.targetVelocityAfter);
  refreshMergedPhysicalMetadata(target);
  target.visualVersion = (target.visualVersion ?? 0) + 1;
  result.deleteIds.push(impactor.id);
  const fragmentFamilyId = `impact-family-${impactor.id}-${Math.floor(event.timeSeconds ?? 0)}`;
  const graceUntil = (event.timeSeconds ?? 0) + Math.max(0, Number(options.fragmentGraceSeconds) || 0);
  result.createBodies = generated.fragments.map((fragment) => ({
    ...fragment,
    fragmentFamilyId,
    fragmentParentTargetId: target.id,
    collisionGraceUntil: graceUntil,
    position: new Float64Array(fragment.position),
    velocity: new Float64Array(fragment.velocity),
  }));
  result.unresolvedAccretedMassKg = accretedMass;
  result.largestFragmentMassKg = generated.largestFragmentMassKg;
  result.escapingFraction = generated.estimatedEscapingFraction;
  result.representedEjectaKineticEnergyJ = generated.representedEjectaKineticEnergyJ;
  result.ejectaEnergyBudgetJ = generated.ejectaEnergyBudgetJ;

  if (crater) {
    const normal = analysis.contactNormal;
    result.targetDamageRecord = {
      id: `impact-${Date.now()}-${Math.floor(analysis.centerOfMassEnergyJ % 1e6)}`,
      timeSeconds: event.timeSeconds ?? 0,
      impactorName: impactor.name,
      impactorMassKg: impactor.mass,
      impactorDensityKgM3: bodyDensityKgM3(impactor),
      relativeSpeedMps: analysis.relativeSpeedMps,
      impactAngleDegrees: analysis.impactAngleDegrees,
      energyJ: analysis.centerOfMassEnergyJ,
      specificImpactEnergyJkg: analysis.specificImpactEnergyJkg,
      crater,
      contactPosition: [...analysis.contactPoint],
      contactNormal: [...normal],
      largestFragmentMassKg: generated.largestFragmentMassKg,
      estimatedEscapingFraction: generated.estimatedEscapingFraction,
      representedEjectaKineticEnergyJ: generated.representedEjectaKineticEnergyJ,
      ejectaEnergyBudgetJ: generated.ejectaEnergyBudgetJ,
      model: 'gravity-regime crater scaling approximation + momentum-conserving bounded-energy representative fragments',
    };
    target.damageRecords ??= [];
    target.damageRecords.push(result.targetDamageRecord);
  }

  drift(target, postContactSeconds);
  for (const fragment of result.createBodies) drift(fragment, postContactSeconds);
  return result;
}
