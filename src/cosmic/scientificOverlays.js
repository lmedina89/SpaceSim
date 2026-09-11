import { PHYSICS, BODY_KIND } from '../core/constants.js';

function mag(v) { return Math.hypot(v[0], v[1], v[2]); }
function sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
function add(a,b){ return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]; }
function scale(v,s){ return [v[0]*s,v[1]*s,v[2]*s]; }
function unit(v){ const m=mag(v)||1; return scale(v,1/m); }
function cross(a,b){ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }

export function hillRadiusMeters(primaryMassKg, secondaryMassKg, semiMajorAxisMeters, eccentricity = 0) {
  if (!(primaryMassKg > 0) || !(secondaryMassKg > 0) || !(semiMajorAxisMeters > 0)) return NaN;
  return semiMajorAxisMeters * (1 - Math.max(0, Math.min(0.99, eccentricity))) * Math.cbrt(secondaryMassKg / (3 * primaryMassKg));
}

export function rocheLimitMeters(primaryRadiusMeters, primaryDensityKgM3, satelliteDensityKgM3 = 3000, fluid = true) {
  if (!(primaryRadiusMeters > 0) || !(primaryDensityKgM3 > 0) || !(satelliteDensityKgM3 > 0)) return NaN;
  const coefficient = fluid ? 2.44 : 1.26;
  return coefficient * primaryRadiusMeters * Math.cbrt(primaryDensityKgM3 / satelliteDensityKgM3);
}

export function densityKgM3(body) {
  if (body?.densityKgM3 > 0) return body.densityKgM3;
  if (!(body?.mass > 0) || !(body?.radius > 0)) return NaN;
  return body.mass / ((4 / 3) * Math.PI * body.radius ** 3);
}

export function gravityAccelerationAt(position, bodies) {
  const a = [0,0,0];
  for (const body of bodies ?? []) {
    if (!body?.gravitySource || !(body.mass > 0)) continue;
    const dx=body.position[0]-position[0],dy=body.position[1]-position[1],dz=body.position[2]-position[2];
    const r2=dx*dx+dy*dy+dz*dz;
    if (!(r2 > 1)) continue;
    const invR=1/Math.sqrt(r2), factor=PHYSICS.G*body.mass*invR*invR*invR;
    a[0]+=dx*factor;a[1]+=dy*factor;a[2]+=dz*factor;
  }
  return a;
}


function collinearCr3bpEquation(x, mu) {
  const primaryX = -mu;
  const secondaryX = 1 - mu;
  const dx1 = x - primaryX;
  const dx2 = x - secondaryX;
  const r1 = Math.abs(dx1);
  const r2 = Math.abs(dx2);
  if (!(r1 > 0) || !(r2 > 0)) return NaN;
  return x - (1 - mu) * dx1 / (r1 * r1 * r1) - mu * dx2 / (r2 * r2 * r2);
}

function bisectCr3bp(mu, lo, hi) {
  let flo = collinearCr3bpEquation(lo, mu);
  let fhi = collinearCr3bpEquation(hi, mu);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return NaN;
  for (let i = 0; i < 96; i += 1) {
    const mid = (lo + hi) * 0.5;
    const fm = collinearCr3bpEquation(mid, mu);
    if (!Number.isFinite(fm)) return NaN;
    if (Math.abs(fm) < 1e-14 || Math.abs(hi - lo) < 1e-14) return mid;
    if (flo * fm <= 0) { hi = mid; fhi = fm; }
    else { lo = mid; flo = fm; }
  }
  return (lo + hi) * 0.5;
}

function collinearLagrangeCoordinates(mu) {
  const primaryX = -mu;
  const secondaryX = 1 - mu;
  const eps = 1e-9;
  const l1 = bisectCr3bp(mu, primaryX + eps, secondaryX - eps);
  const l2 = bisectCr3bp(mu, secondaryX + eps, secondaryX + 8);
  const l3 = bisectCr3bp(mu, primaryX - 8, primaryX - eps);
  return { l1, l2, l3 };
}

export function lagrangePointEstimates(primary, secondary) {
  if (!(primary?.mass > 0) || !(secondary?.mass > 0)) return [];
  const rVec=sub(secondary.position, primary.position), r=mag(rVec);
  if (!(r > 0)) return [];
  const ex=unit(rVec);
  const total=primary.mass+secondary.mass;
  const mu=secondary.mass/total;
  const barycenter=[
    (primary.position[0]*primary.mass+secondary.position[0]*secondary.mass)/total,
    (primary.position[1]*primary.mass+secondary.position[1]*secondary.mass)/total,
    (primary.position[2]*primary.mass+secondary.position[2]*secondary.mass)/total,
  ];
  const roots=collinearLagrangeCoordinates(mu);
  const l1=add(barycenter,scale(ex,roots.l1*r));
  const l2=add(barycenter,scale(ex,roots.l2*r));
  const l3=add(barycenter,scale(ex,roots.l3*r));

  const relV=sub(secondary.velocity, primary.velocity);
  let normal=cross(rVec,relV);
  if (mag(normal)<1e-9) normal=[0,1,0];
  normal=unit(normal);
  const ey=unit(cross(normal,ex));
  const mid=add(primary.position,scale(ex,r*0.5));
  const height=r*Math.sqrt(3)/2;
  const l4=add(mid,scale(ey,height));
  const l5=add(mid,scale(ey,-height));
  return [
    {label:'L1',position:l1,approximation:'instantaneous circular restricted three-body collinear equilibrium root'},
    {label:'L2',position:l2,approximation:'instantaneous circular restricted three-body collinear equilibrium root'},
    {label:'L3',position:l3,approximation:'instantaneous circular restricted three-body collinear equilibrium root'},
    {label:'L4',position:l4,approximation:'instantaneous equilateral circular restricted three-body geometry'},
    {label:'L5',position:l5,approximation:'instantaneous equilateral circular restricted three-body geometry'},
  ];
}

export function overlayTargetPair(target, bodies) {
  if (!target) return null;
  let primary = null;
  if (target.parentId) primary = bodies.find((b)=>b.id===target.parentId) ?? null;
  if (!primary && target.kind !== BODY_KIND.STAR) primary = bodies.find((b)=>b.kind===BODY_KIND.STAR) ?? null;
  return primary ? {primary,secondary:target} : null;
}

export function orbitalPlaneBasis(primary, secondary) {
  const r=sub(secondary.position,primary.position), v=sub(secondary.velocity,primary.velocity);
  const radius=mag(r); if (!(radius>0)) return null;
  const x=unit(r); let n=cross(r,v); if (mag(n)<1e-9) n=[0,1,0]; n=unit(n); const y=unit(cross(n,x));
  return {center:[...primary.position],x,y,normal:n,radiusMeters:radius};
}

export function gravityVectorSamples(center, bodies, spanMeters, grid = 5) {
  const out=[]; const half=Math.floor(grid/2); const step=spanMeters/Math.max(1,grid-1);
  for(let ix=-half;ix<=half;ix+=1){for(let iz=-half;iz<=half;iz+=1){
    const p=[center[0]+ix*step,center[1],center[2]+iz*step]; const a=gravityAccelerationAt(p,bodies); const m=mag(a);
    out.push({position:p,acceleration:a,magnitudeMps2:m});
  }}
  return out;
}
