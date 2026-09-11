import { BODY_KIND, PHYSICS } from '../core/constants.js';

const MATERIAL_RESPONSE = Object.freeze({
  porousRock: { densityKgM3: 1600, restitution: 0.16, disruptionThresholdJkg: 1.2e5, label: 'porous rock' },
  ice: { densityKgM3: 917, restitution: 0.12, disruptionThresholdJkg: 7.5e4, label: 'water ice' },
  basalt: { densityKgM3: 3000, restitution: 0.09, disruptionThresholdJkg: 3.0e5, label: 'basalt' },
  iron: { densityKgM3: 7800, restitution: 0.05, disruptionThresholdJkg: 1.1e6, label: 'iron-rich' },
  planetRock: { densityKgM3: 3200, restitution: 0.03, disruptionThresholdJkg: 2.5e7, label: 'rocky planetary crust' },
  planetIce: { densityKgM3: 1400, restitution: 0.04, disruptionThresholdJkg: 1.2e7, label: 'icy planetary crust' },
  gasGiant: { densityKgM3: 1200, restitution: 0.0, disruptionThresholdJkg: 1e30, label: 'gas-giant atmosphere/envelope' },
  star: { densityKgM3: 1400, restitution: 0.0, disruptionThresholdJkg: 1e30, label: 'stellar plasma' },
  blackHole: { densityKgM3: Infinity, restitution: 0.0, disruptionThresholdJkg: 1e30, label: 'black-hole sink' },
});

export function reducedMassKg(a, b) {
  return (a.mass * b.mass) / (a.mass + b.mass);
}

export function impactEnergyJoules(a, b, relativeSpeed) {
  const mu = reducedMassKg(a, b);
  return 0.5 * mu * relativeSpeed * relativeSpeed;
}

export function materialProfile(body) {
  if (body.kind === BODY_KIND.BLACK_HOLE) return MATERIAL_RESPONSE.blackHole;
  if (body.kind === BODY_KIND.STAR) return MATERIAL_RESPONSE.star;
  if (body.kind === BODY_KIND.PLANET || body.kind === BODY_KIND.MOON || body.kind === BODY_KIND.ROGUE_PLANET) {
    if (isGasPlanet(body)) return MATERIAL_RESPONSE.gasGiant;
    if (body.planetType === 'ice' || body.planetType === 'frozen') return MATERIAL_RESPONSE.planetIce;
    return MATERIAL_RESPONSE.planetRock;
  }
  return MATERIAL_RESPONSE[body.materialId] ?? MATERIAL_RESPONSE.basalt;
}

export function bodyDensityKgM3(body) {
  return body.densityKgM3 ?? materialProfile(body).densityKgM3;
}

export function impactReport(a, b, relativeSpeed) {
  const mu = reducedMassKg(a, b);
  const energyJ = 0.5 * mu * relativeSpeed * relativeSpeed;
  return {
    reducedMassKg: mu,
    relativeSpeedMps: relativeSpeed,
    centerOfMassEnergyJ: energyJ,
    relativeMomentumKgMps: mu * relativeSpeed,
    specificImpactEnergyJkg: energyJ / (a.mass + b.mass),
    tntMegatons: energyJ / 4.184e15,
  };
}

export function mutualEscapeSpeedMps(a, b) {
  const distance = Math.max(1, a.radius + b.radius);
  return Math.sqrt((2 * PHYSICS.G * (a.mass + b.mass)) / distance);
}

function unit(v) {
  const mag = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / mag, v[1] / mag, v[2] / mag];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function isGasPlanet(body) {
  const type = String(body?.planetType ?? '').toLowerCase();
  return type === 'gas' || type === 'gas giant' || type === 'gas-giant';
}

function chooseTargetImpactor(a, b) {
  const aBlackHole = a.kind === BODY_KIND.BLACK_HOLE;
  const bBlackHole = b.kind === BODY_KIND.BLACK_HOLE;
  if (aBlackHole || bBlackHole) {
    if (aBlackHole && bBlackHole) return a.mass >= b.mass ? { target: a, impactor: b } : { target: b, impactor: a };
    return aBlackHole ? { target: a, impactor: b } : { target: b, impactor: a };
  }
  return a.mass >= b.mass ? { target: a, impactor: b } : { target: b, impactor: a };
}

function eventVectorForBody(event, body, keyA, keyB, fallback) {
  if (body === event.a && event[keyA]?.length >= 3) return event[keyA];
  if (body === event.b && event[keyB]?.length >= 3) return event[keyB];
  return fallback;
}

export function analyzeImpactEvent(event) {
  const { a, b } = event;
  const aVelocity = eventVectorForBody(event, a, 'contactVelocityA', 'contactVelocityB', a.velocity);
  const bVelocity = eventVectorForBody(event, b, 'contactVelocityA', 'contactVelocityB', b.velocity);
  const aPosition = eventVectorForBody(event, a, 'contactPositionA', 'contactPositionB', a.position);
  const bPosition = eventVectorForBody(event, b, 'contactPositionA', 'contactPositionB', b.position);
  const relativeVelocity = event.relativeVelocity ?? [bVelocity[0] - aVelocity[0], bVelocity[1] - aVelocity[1], bVelocity[2] - aVelocity[2]];
  const relativeSpeed = event.relativeSpeed ?? Math.hypot(...relativeVelocity);
  const eventNormal = unit(event.contactNormal ?? [bPosition[0] - aPosition[0], bPosition[1] - aPosition[1], bPosition[2] - aPosition[2]]);
  const { target, impactor } = chooseTargetImpactor(a, b);
  const targetVelocity = target === a ? aVelocity : bVelocity;
  const impactorVelocity = impactor === a ? aVelocity : bVelocity;
  const targetPosition = target === a ? aPosition : bPosition;
  const impactorPosition = impactor === a ? aPosition : bPosition;
  const normal = target === a ? eventNormal : [-eventNormal[0], -eventNormal[1], -eventNormal[2]];
  const impactorRelativeVelocity = [impactorVelocity[0] - targetVelocity[0], impactorVelocity[1] - targetVelocity[1], impactorVelocity[2] - targetVelocity[2]];
  const velocityDirection = unit(impactorRelativeVelocity);
  const cosNormal = clamp(Math.abs(dot(normal, velocityDirection)), 0, 1);
  const impactAngleDegrees = Math.asin(cosNormal) * (180 / Math.PI); // 90 = straight in, 0 = grazing
  const report = impactReport(a, b, relativeSpeed);
  const mutualEscape = mutualEscapeSpeedMps(a, b);
  const contactPoint = [
    targetPosition[0] + normal[0] * target.radius,
    targetPosition[1] + normal[1] * target.radius,
    targetPosition[2] + normal[2] * target.radius,
  ];
  return {
    ...report,
    a,
    b,
    target,
    impactor,
    timeSeconds: event.timeSeconds ?? 0,
    relativeVelocity: impactorRelativeVelocity,
    relativeSpeedMps: relativeSpeed,
    contactNormal: normal,
    contactPoint,
    targetPosition,
    impactorPosition,
    targetVelocity,
    impactorVelocity,
    impactAngleDegrees,
    mutualEscapeSpeedMps: mutualEscape,
    targetDensityKgM3: bodyDensityKgM3(target),
    impactorDensityKgM3: bodyDensityKgM3(impactor),
    massRatio: impactor.mass / target.mass,
    impactorSpecificEnergyJkg: report.centerOfMassEnergyJ / impactor.mass,
    targetSpecificEnergyJkg: report.centerOfMassEnergyJ / target.mass,
  };
}

export function classifyImpact(analysis) {
  const { target, impactor } = analysis;
  if (target.kind === BODY_KIND.BLACK_HOLE || impactor.kind === BODY_KIND.BLACK_HOLE) return { mode: 'absorb', reason: 'black-hole sink' };
  if (target.kind === BODY_KIND.STAR || impactor.kind === BODY_KIND.STAR) return { mode: 'absorb', reason: 'stellar envelope absorption' };
  const targetProfile = materialProfile(target);
  const impactorProfile = materialProfile(impactor);
  const restitution = Math.min(targetProfile.restitution, impactorProfile.restitution);
  const projectileDisruptionThreshold = impactorProfile.disruptionThresholdJkg;
  const targetDisruptionThreshold = targetProfile.disruptionThresholdJkg;
  const asteroidPair = target.kind === BODY_KIND.ASTEROID && impactor.kind === BODY_KIND.ASTEROID;
  if (asteroidPair && analysis.relativeSpeedMps < 100 && analysis.impactorSpecificEnergyJkg < projectileDisruptionThreshold * 0.05) {
    return { mode: 'bounce', restitution, reason: 'low-speed material encounter' };
  }
  if (analysis.relativeSpeedMps < analysis.mutualEscapeSpeedMps * 0.9 && analysis.impactorSpecificEnergyJkg < projectileDisruptionThreshold * 0.12) {
    return { mode: 'merge', reason: 'gravitationally bound sub-disruptive collision' };
  }
  const craterForming = [BODY_KIND.PLANET, BODY_KIND.MOON, BODY_KIND.ROGUE_PLANET].includes(target.kind) && analysis.relativeSpeedMps >= 500;
  const projectileDisrupted = analysis.impactorSpecificEnergyJkg > projectileDisruptionThreshold * 0.15;
  if (craterForming || projectileDisrupted) {
    const catastrophic = analysis.specificImpactEnergyJkg > targetDisruptionThreshold || (analysis.massRatio > 0.08 && analysis.relativeSpeedMps > analysis.mutualEscapeSpeedMps * 1.2);
    return { mode: 'fragment', catastrophic, disruptionThresholdJkg: targetDisruptionThreshold, reason: catastrophic ? 'catastrophic target disruption regime' : 'projectile disruption / crater-forming impact' };
  }
  return { mode: 'merge', reason: 'sub-disruptive inelastic collision' };
}

export function estimateCrater(analysis) {
  const { target, impactor } = analysis;
  if (!([BODY_KIND.PLANET, BODY_KIND.MOON, BODY_KIND.ROGUE_PLANET].includes(target.kind)) || isGasPlanet(target)) return null;
  const g = (PHYSICS.G * target.mass) / (target.radius * target.radius);
  const Dp = Math.max(1, impactor.radius * 2);
  const rhoRatio = Math.max(0.15, Math.min(8, analysis.impactorDensityKgM3 / Math.max(1, analysis.targetDensityKgM3)));
  const theta = Math.max(0.12, Math.sin((analysis.impactAngleDegrees * Math.PI) / 180));
  // Gravity-regime transient crater scaling used by Collins, Melosh & Marcus (2005):
  // D_tc = 1.161 (rho_i/rho_t)^(1/3) L^0.78 v^0.44 g^-0.22 sin(theta)^(1/3), SI units.
  const transientDiameter = 1.161 * Math.pow(rhoRatio, 1 / 3) * Math.pow(Dp, 0.78) * Math.pow(Math.max(1, analysis.relativeSpeedMps), 0.44) * Math.pow(Math.max(1e-6, g), -0.22) * Math.pow(theta, 1 / 3);
  // Approximate simple-to-complex transition with inverse surface gravity, anchored near 3.2 km on Earth.
  const transitionDiameter = Math.max(1_000, Math.min(80_000, 3_200 * (9.80665 / Math.max(0.05, g))));
  const simple = transientDiameter <= transitionDiameter;
  const finalDiameter = simple
    ? 1.25 * transientDiameter
    : 1.17 * Math.pow(transientDiameter, 1.13) / Math.pow(transitionDiameter, 0.13);
  const finalDepth = finalDiameter * (simple ? 0.20 : 0.10);
  const excavatedMass = (Math.PI / 24) * analysis.targetDensityKgM3 * finalDiameter * finalDiameter * finalDepth;
  return {
    transientDiameterMeters: transientDiameter,
    finalDiameterMeters: finalDiameter,
    finalDepthMeters: finalDepth,
    excavatedMassKg: excavatedMass,
    simpleComplexTransitionMeters: transitionDiameter,
    simpleComplexClass: simple ? 'simple' : 'complex',
    model: 'Collins-Melosh-Marcus gravity-regime crater scaling with approximate gravity-scaled simple/complex transition',
  };
}

function tangentBasis(normal) {
  const ref = Math.abs(normal[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  const tangent = unit([
    ref[1] * normal[2] - ref[2] * normal[1],
    ref[2] * normal[0] - ref[0] * normal[2],
    ref[0] * normal[1] - ref[1] * normal[0],
  ]);
  const bitangent = unit([
    normal[1] * tangent[2] - normal[2] * tangent[1],
    normal[2] * tangent[0] - normal[0] * tangent[2],
    normal[0] * tangent[1] - normal[1] * tangent[0],
  ]);
  return { tangent, bitangent };
}

function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateFragments(analysis, options = {}) {
  const { target, impactor, contactNormal } = analysis;
  const fragmentCount = Math.max(0, Math.min(2, Number.isFinite(options.maxFragments) ? options.maxFragments : 2));
  const sourceMass = impactor.mass;
  // Only a small fraction of impactor mass is promoted to expensive, mutually gravitating fragments.
  // The remaining represented mass is accreted into the target; visual dust/ejecta carries no hidden mass.
  const largeMassShare = [BODY_KIND.PLANET, BODY_KIND.MOON, BODY_KIND.ROGUE_PLANET].includes(target.kind) ? 0.08 : 0.14;
  const gravitationalFragmentBudget = fragmentCount;
  const largeMass = gravitationalFragmentBudget > 0 ? sourceMass * largeMassShare : 0;
  const masses = [];
  for (let i = 0; i < gravitationalFragmentBudget; i += 1) masses.push(1 / (i + 1.35));
  const sum = masses.reduce((acc, value) => acc + value, 0);
  for (let i = 0; i < masses.length; i += 1) masses[i] = sum > 0 ? (masses[i] / sum) * largeMass : 0;

  const fragmentMass = masses.reduce((acc, value) => acc + value, 0);
  const unresolvedAccretedMassKg = Math.max(0, sourceMass - fragmentMass);
  const finalTargetMass = target.mass + unresolvedAccretedMassKg;
  const totalMass = target.mass + impactor.mass;
  const targetVelocity = analysis.targetVelocity ?? target.velocity;
  const impactorVelocity = analysis.impactorVelocity ?? impactor.velocity;
  const centerOfMassVelocity = [
    (targetVelocity[0] * target.mass + impactorVelocity[0] * impactor.mass) / totalMass,
    (targetVelocity[1] * target.mass + impactorVelocity[1] * impactor.mass) / totalMass,
    (targetVelocity[2] * target.mass + impactorVelocity[2] * impactor.mass) / totalMass,
  ];

  const { tangent, bitangent } = tangentBasis(contactNormal);
  const nominalEjectaSpeed = Math.max(
    analysis.relativeSpeedMps * 0.18,
    Math.sqrt(Math.max(1, analysis.centerOfMassEnergyJ / Math.max(sourceMass, 1))),
  );
  const origin = analysis.contactPoint ?? [
    (analysis.targetPosition ?? target.position)[0] + contactNormal[0] * target.radius,
    (analysis.targetPosition ?? target.position)[1] + contactNormal[1] * target.radius,
    (analysis.targetPosition ?? target.position)[2] + contactNormal[2] * target.radius,
  ];

  const templates = masses.map((mass, index) => {
    const radius = Math.cbrt((3 * mass) / (4 * Math.PI * analysis.impactorDensityKgM3));
    const r1 = pseudoRandom(analysis.centerOfMassEnergyJ * 1e-21 + index * 12.9898);
    const r2 = pseudoRandom(analysis.centerOfMassEnergyJ * 3e-21 + index * 78.233);
    const spreadA = (r1 - 0.5) * 0.9;
    const spreadB = (r2 - 0.5) * 0.9;
    const localScale = 0.65 + r1 * 0.75;
    const dir = unit([
      contactNormal[0] * 1.2 + tangent[0] * spreadA + bitangent[0] * spreadB,
      contactNormal[1] * 1.2 + tangent[1] * spreadA + bitangent[1] * spreadB,
      contactNormal[2] * 1.2 + tangent[2] * spreadA + bitangent[2] * spreadB,
    ]);
    const speed = nominalEjectaSpeed * localScale * (index === 0 ? 1.3 : 0.55 + r2 * 0.85);
    return { mass, radius, dir, rawOffset: [dir[0] * speed, dir[1] * speed, dir[2] * speed] };
  });

  // Resolve ejecta in the collision COM frame. Target recoil exactly balances the represented
  // fragment momentum, and the ejecta kinetic energy is capped to a fraction of the available
  // center-of-mass impact energy so the heuristic debris model cannot create kinetic energy.
  let rawPx = 0, rawPy = 0, rawPz = 0;
  let rawFragmentEnergy = 0;
  for (const item of templates) {
    rawPx += item.mass * item.rawOffset[0];
    rawPy += item.mass * item.rawOffset[1];
    rawPz += item.mass * item.rawOffset[2];
    rawFragmentEnergy += 0.5 * item.mass * (item.rawOffset[0] ** 2 + item.rawOffset[1] ** 2 + item.rawOffset[2] ** 2);
  }
  const rawTargetRecoil = finalTargetMass > 0 ? [-rawPx / finalTargetMass, -rawPy / finalTargetMass, -rawPz / finalTargetMass] : [0, 0, 0];
  const rawTargetEnergy = 0.5 * finalTargetMass * (rawTargetRecoil[0] ** 2 + rawTargetRecoil[1] ** 2 + rawTargetRecoil[2] ** 2);
  const rawEjectaEnergy = rawFragmentEnergy + rawTargetEnergy;
  const requestedEnergyFraction = clamp(Number(options.ejectaEnergyFraction) || 0.25, 0, 0.5);
  const ejectaEnergyBudgetJ = Math.max(0, analysis.centerOfMassEnergyJ * requestedEnergyFraction);
  const energyScale = rawEjectaEnergy > ejectaEnergyBudgetJ && rawEjectaEnergy > 0
    ? Math.sqrt(ejectaEnergyBudgetJ / rawEjectaEnergy)
    : 1;

  let px = 0, py = 0, pz = 0;
  let fragmentEnergy = 0;
  const fragments = templates.map((item, index) => {
    const ux = item.rawOffset[0] * energyScale;
    const uy = item.rawOffset[1] * energyScale;
    const uz = item.rawOffset[2] * energyScale;
    px += item.mass * ux; py += item.mass * uy; pz += item.mass * uz;
    fragmentEnergy += 0.5 * item.mass * (ux * ux + uy * uy + uz * uz);
    return {
      name: `Fragment ${index + 1}`,
      isImpactFragment: true,
      fragmentGenerationDepth: (impactor.fragmentGenerationDepth ?? 0) + 1,
      mass: item.mass,
      radius: item.radius,
      densityKgM3: analysis.impactorDensityKgM3,
      materialId: impactor.materialId ?? 'basalt',
      color: impactor.color ?? 0x9a816b,
      gravitySource: true,
      generated: false,
      kind: BODY_KIND.ASTEROID,
      position: [
        origin[0] + item.dir[0] * (item.radius * 2.4),
        origin[1] + item.dir[1] * (item.radius * 2.4),
        origin[2] + item.dir[2] * (item.radius * 2.4),
      ],
      velocity: [
        centerOfMassVelocity[0] + ux,
        centerOfMassVelocity[1] + uy,
        centerOfMassVelocity[2] + uz,
      ],
    };
  });
  const targetRecoil = finalTargetMass > 0 ? [-px / finalTargetMass, -py / finalTargetMass, -pz / finalTargetMass] : [0, 0, 0];
  const targetVelocityAfter = [
    centerOfMassVelocity[0] + targetRecoil[0],
    centerOfMassVelocity[1] + targetRecoil[1],
    centerOfMassVelocity[2] + targetRecoil[2],
  ];
  const targetRecoilEnergy = 0.5 * finalTargetMass * (targetRecoil[0] ** 2 + targetRecoil[1] ** 2 + targetRecoil[2] ** 2);
  const representedEjectaKineticEnergyJ = fragmentEnergy + targetRecoilEnergy;
  const characteristicEjectaSpeed = templates.length
    ? Math.max(...templates.map((item) => Math.hypot(...item.rawOffset) * energyScale))
    : 0;

  return {
    fragments,
    targetVelocityAfter,
    centerOfMassVelocity,
    largestFragmentMassKg: masses.length ? Math.max(...masses) : 0,
    unresolvedAccretedMassKg,
    representedEjectaKineticEnergyJ,
    ejectaEnergyBudgetJ,
    estimatedEscapingFraction: Math.min(0.95, Math.max(0.08, characteristicEjectaSpeed / Math.max(1, Math.sqrt((2 * PHYSICS.G * target.mass) / target.radius)) * 0.18)),
  };
}

export function formatEnergy(joules) {
  if (!Number.isFinite(joules) || joules < 0) return '—';
  const tntMegatons = joules / 4.184e15;
  if (tntMegatons >= 1e6) return `${(tntMegatons / 1e6).toFixed(2)} Tt TNT eq.`;
  if (tntMegatons >= 1e3) return `${(tntMegatons / 1e3).toFixed(2)} Gt TNT eq.`;
  if (tntMegatons >= 1) return `${tntMegatons.toFixed(2)} Mt TNT eq.`;
  return `${joules.toExponential(3)} J`;
}
