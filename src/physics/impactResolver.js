import { BODY_KIND } from '../core/constants.js';
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
  const overlap = Math.max(1, target.radius + impactor.radius);
  for (let k = 0; k < 3; k += 1) impactor.position[k] = target.position[k] + n[k] * overlap * 1.001;
}

export function resolveImpact(event, options = {}) {
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
    targetDamageRecord: null,
  };

  if (classification.mode === 'bounce') {
    applyBounce(analysis, classification.restitution ?? 0.05);
    return result;
  }

  const { target, impactor } = analysis;
  if (classification.mode === 'absorb' || classification.mode === 'merge') {
    const combinedMass = target.mass + impactor.mass;
    target.velocity = weightedVelocity(target, impactor);
    target.position = weightedPosition(target, impactor);
    target.mass = combinedMass;
    if (classification.mode === 'merge' && target.kind !== BODY_KIND.STAR && target.kind !== BODY_KIND.BLACK_HOLE) {
      target.radius = mergedRadius(target, impactor);
    }
    target.visualVersion = (target.visualVersion ?? 0) + 1;
    result.deleteIds.push(impactor.id);
    return result;
  }

  const generated = generateFragments(analysis, { crater, maxFragments: options.maxGravityFragments });
  const fragmentMass = generated.fragments.reduce((sum, fragment) => sum + fragment.mass, 0);
  const accretedMass = Math.max(0, impactor.mass - fragmentMass);
  target.mass += accretedMass;
  target.visualVersion = (target.visualVersion ?? 0) + 1;
  result.deleteIds.push(impactor.id);
  result.createBodies = generated.fragments.map((fragment) => ({
    ...fragment,
    position: new Float64Array(fragment.position),
    velocity: new Float64Array(fragment.velocity),
  }));
  result.unresolvedAccretedMassKg = generated.unresolvedAccretedMassKg;
  result.largestFragmentMassKg = generated.largestFragmentMassKg;
  result.escapingFraction = generated.estimatedEscapingFraction;

  if (crater) {
    const normal = analysis.contactNormal;
    const contactPosition = [
      target.position[0] + normal[0] * target.radius,
      target.position[1] + normal[1] * target.radius,
      target.position[2] + normal[2] * target.radius,
    ];
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
      contactPosition,
      contactNormal: [...normal],
      largestFragmentMassKg: generated.largestFragmentMassKg,
      estimatedEscapingFraction: generated.estimatedEscapingFraction,
      model: 'gravity-regime crater scaling approximation + heuristic fragment partition',
    };
    target.damageRecords ??= [];
    target.damageRecords.push(result.targetDamageRecord);
  }
  return result;
}
