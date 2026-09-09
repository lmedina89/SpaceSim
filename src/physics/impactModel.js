export function reducedMassKg(a, b) {
  return (a.mass * b.mass) / (a.mass + b.mass);
}

export function impactEnergyJoules(a, b, relativeSpeed) {
  const mu = reducedMassKg(a, b);
  return 0.5 * mu * relativeSpeed * relativeSpeed;
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

export function formatEnergy(joules) {
  if (!Number.isFinite(joules) || joules < 0) return '—';
  const tntMegatons = joules / 4.184e15;
  if (tntMegatons >= 1e6) return `${(tntMegatons / 1e6).toFixed(2)} Tt TNT eq.`;
  if (tntMegatons >= 1e3) return `${(tntMegatons / 1e3).toFixed(2)} Gt TNT eq.`;
  if (tntMegatons >= 1) return `${tntMegatons.toFixed(2)} Mt TNT eq.`;
  return `${joules.toExponential(3)} J`;
}
