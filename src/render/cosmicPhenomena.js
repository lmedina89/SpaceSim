import * as THREE from 'three/webgpu';
import { PHYSICS, SIMULATION } from '../core/constants.js';
import { createRng } from '../util/prng.js';

function makeAnnulusPoints(definition, seed) {
  const rng = createRng(`${seed}:${definition.id}:visual`);
  const count = Math.max(500, Math.min(Number(definition.particleCount) || 4_000, 16_000));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const inner = definition.innerRadiusMeters / SIMULATION.metersPerRenderUnit;
  const outer = definition.outerRadiusMeters / SIMULATION.metersPerRenderUnit;
  const thickness = Math.max(
    definition.kind === 'planetary-rings' ? 0.004 : 0.08,
    (definition.thicknessMeters ?? (definition.outerRadiusMeters - definition.innerRadiusMeters) * 0.02) / SIMULATION.metersPerRenderUnit,
  );
  const c1 = new THREE.Color(definition.colorA ?? 0xb9b1a5);
  const c2 = new THREE.Color(definition.colorB ?? 0x757b83);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const k = i * 3;
    const u = rng.random();
    let radius = Math.sqrt(inner * inner + u * (outer * outer - inner * inner));
    if (definition.kind === 'planetary-rings') {
      // A few sparse gaps make the visual read more like a structured ring system.
      const band = (radius - inner) / Math.max(1e-9, outer - inner);
      if ((band > 0.46 && band < 0.51) || (band > 0.72 && band < 0.745)) radius += (outer - inner) * 0.035;
    }
    const angle = rng.range(0, Math.PI * 2);
    positions[k] = Math.cos(angle) * radius;
    positions[k + 1] = rng.range(-thickness, thickness);
    positions[k + 2] = Math.sin(angle) * radius;
    color.copy(c1).lerp(c2, rng.random());
    const bright = definition.kind === 'planetary-rings' ? rng.range(0.62, 1.0) : rng.range(0.42, 0.9);
    colors[k] = color.r * bright; colors[k + 1] = color.g * bright; colors[k + 2] = color.b * bright;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: definition.kind === 'planetary-rings' ? 0.075 : 0.42,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: definition.kind === 'planetary-rings' ? 0.78 : 0.55,
    depthWrite: false,
    blending: definition.kind === 'planetary-rings' ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function makeSupernovaRemnant(definition, seed) {
  const rng = createRng(`${seed}:${definition.id}:remnant`);
  const count = Math.max(1800, Math.min(Number(definition.particleCount) || 8500, 12000));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const radius = definition.radiusMeters / SIMULATION.metersPerRenderUnit;
  const c1 = new THREE.Color(definition.colorA ?? 0x61dfff);
  const c2 = new THREE.Color(definition.colorB ?? 0xff7b5e);
  const c = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const k = i * 3;
    const u = rng.range(-1, 1);
    const a = rng.range(0, Math.PI * 2);
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    const filament = 0.72 + 0.28 * Math.pow(rng.random(), 0.35);
    const rr = radius * filament * rng.range(0.92, 1.08);
    positions[k] = Math.cos(a) * s * rr;
    positions[k + 1] = u * rr * rng.range(0.78, 1.12);
    positions[k + 2] = Math.sin(a) * s * rr;
    c.copy(c1).lerp(c2, rng.random());
    const bright = rng.range(0.35, 1.0) * (0.55 + 0.45 * Math.sin(a * 7 + u * 11) ** 2);
    colors[k] = c.r * bright; colors[k + 1] = c.g * bright; colors[k + 2] = c.b * bright;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: Math.max(0.18, radius * 0.0024), vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false;
  return points;
}


function makeAnomalySparkCloud(definition, seed, radius) {
  const rng = createRng(`${seed}:${definition.id}:anomaly-sparks`);
  const count = 420;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c1 = new THREE.Color(definition.colorA ?? 0x8bd9ff);
  const c2 = new THREE.Color(definition.colorB ?? 0xc07cff);
  const c = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const k = i * 3;
    const u = rng.range(-1, 1), a = rng.range(0, Math.PI * 2), s = Math.sqrt(Math.max(0, 1-u*u));
    const rr = radius * rng.range(.45, 1.05);
    positions[k] = Math.cos(a)*s*rr; positions[k+1] = u*rr; positions[k+2] = Math.sin(a)*s*rr;
    c.copy(c1).lerp(c2, rng.random()); const bright = rng.range(.45, 1);
    colors[k]=c.r*bright; colors[k+1]=c.g*bright; colors[k+2]=c.b*bright;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({size:Math.max(.2,radius*.012),vertexColors:true,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));
  points.name='anomaly-spark-cloud'; points.frustumCulled=false; return points;
}

function anomalyMaterial(color, opacity=.5) {
  return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
}

function makeFrozenFilament(definition, seed, radius) {
  const rng=createRng(`${seed}:${definition.id}:filament`); const points=[];
  let p=new THREE.Vector3(-radius*.7,0,0); points.push(p.clone());
  for(let i=1;i<22;i+=1){p=p.clone().add(new THREE.Vector3(radius*.07,rng.range(-radius*.12,radius*.12),rng.range(-radius*.10,radius*.10)));points.push(p.clone());}
  const curve=new THREE.CatmullRomCurve3(points);
  const geometry=new THREE.TubeGeometry(curve,80,Math.max(.04,radius*.012),5,false);
  const core=new THREE.Mesh(geometry,anomalyMaterial(definition.colorA??0xc8f8ff,.72)); core.name='anomaly-frozen-filament';
  return core;
}

function makeAnomalyVisual(definition, seed) {
  const group=new THREE.Group();
  const radius=Math.max(8,definition.radiusMeters/SIMULATION.metersPerRenderUnit);
  const a=definition.colorA??0x82e7ff,b=definition.colorB??0xb476ff;
  const ring=(scale=.6,tube=.018,color=a,opacity=.45)=>new THREE.Mesh(new THREE.TorusGeometry(radius*scale,Math.max(.05,radius*tube),8,52),anomalyMaterial(color,opacity));
  const wireSphere=(scale=.5,color=b,opacity=.24)=>new THREE.Mesh(new THREE.IcosahedronGeometry(radius*scale,2),new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));
  group.add(makeAnomalySparkCloud(definition,seed,radius));
  switch(definition.kind){
    case 'anomaly-gravity-scar': {
      for(const [i,scale] of [.28,.46,.68,.9].entries()){const r=ring(scale,.006,i%2?a:b,.28);r.rotation.x=Math.PI/2;group.add(r);} break;
    }
    case 'anomaly-phase-rift': {
      const r1=ring(.58,.03,a,.52),r2=ring(.38,.012,b,.62);r1.rotation.y=.7;r2.rotation.x=1.1;group.add(r1,r2);break;
    }
    case 'anomaly-echo-lattice': {group.add(wireSphere(.63,a,.42)); const inner=wireSphere(.34,b,.38);inner.rotation.y=.55;group.add(inner);break;}
    case 'anomaly-orbital-knot': {
      const r1=ring(.54,.012,a,.55),r2=ring(.54,.012,b,.55),r3=ring(.42,.009,0xffffff,.36);r1.rotation.x=.35;r2.rotation.y=1.05;r3.rotation.x=1.2;r3.rotation.z=.7;group.add(r1,r2,r3);break;
    }
    case 'anomaly-dark-mirror': {
      const sphere=new THREE.Mesh(new THREE.SphereGeometry(radius*.38,20,12),new THREE.MeshBasicMaterial({color:0x010104,transparent:true,opacity:.9,depthWrite:true}));
      const rim=wireSphere(.44,b,.58);group.add(sphere,rim);break;
    }
    case 'anomaly-frozen-lightning': {group.add(makeFrozenFilament(definition,seed,radius));break;}
    case 'anomaly-chronal-shear': {
      for(let i=-2;i<=2;i+=1){const shell=wireSphere(.34+Math.abs(i)*.03,i%2?a:b,.12+(.12*(3-Math.abs(i))));shell.position.x=i*radius*.18;group.add(shell);}break;
    }
    case 'anomaly-ghost-star': {
      const shell=new THREE.Mesh(new THREE.SphereGeometry(radius*.5,24,16),anomalyMaterial(a,.13)); const rim=wireSphere(.54,b,.25);group.add(shell,rim);break;
    }
    case 'anomaly-vacuum-bloom': {
      for(let i=0;i<6;i+=1){const petal=ring(.38,.022,i%2?a:b,.28);petal.scale.set(1,.52,1);petal.rotation.x=Math.PI/2;petal.rotation.z=i*Math.PI/3;petal.position.x=Math.cos(i*Math.PI/3)*radius*.22;petal.position.z=Math.sin(i*Math.PI/3)*radius*.22;group.add(petal);}break;
    }
    case 'anomaly-reverse-shadow': {
      const cone=new THREE.Mesh(new THREE.ConeGeometry(radius*.34,radius*1.15,24,1,true),anomalyMaterial(a,.18));cone.rotation.z=Math.PI/2;cone.position.x=radius*.42;group.add(cone,wireSphere(.18,b,.48));break;
    }
    case 'anomaly-resonant-shell': {
      for(const [i,scale] of [.25,.42,.62,.82].entries()){const shell=wireSphere(scale,i%2?a:b,.18+.06*i);group.add(shell);}break;
    }
    case 'anomaly-fracture-gate': {
      const shape=new THREE.Shape();shape.moveTo(-radius*.42,-radius*.6);shape.lineTo(radius*.42,-radius*.6);shape.lineTo(radius*.42,radius*.6);shape.lineTo(-radius*.42,radius*.6);shape.lineTo(-radius*.42,-radius*.6);
      const pts=shape.getPoints();const geometry=new THREE.BufferGeometry().setFromPoints(pts);const line=new THREE.LineLoop(geometry,new THREE.LineBasicMaterial({color:a,transparent:true,opacity:.8,blending:THREE.AdditiveBlending}));group.add(line); const inner=wireSphere(.22,b,.32);inner.scale.z=.12;group.add(inner);break;
    }
    default: group.add(wireSphere(.5,a,.35),ring(.55,.012,b,.35));
  }
  group.userData.anomalyPulseSeed=(definition.id.length%17)*.37;
  return group;
}

export function createCosmicPhenomenonVisual(definition, seed) {
  const group = new THREE.Group();
  group.userData.phenomenonId = definition.id;
  group.userData.kind = definition.kind;
  group.userData.anchorBodyId = definition.anchorBodyId ?? null;
  group.userData.baseInclination = Number(definition.inclinationRad) || 0;

  if (definition.kind === 'asteroid-belt' || definition.kind === 'planetary-rings') {
    group.add(makeAnnulusPoints(definition, seed));
    group.rotation.x = group.userData.baseInclination;
  } else if (definition.kind === 'supernova-remnant') {
    group.add(makeSupernovaRemnant(definition, seed));
  } else if (definition.anomaly || String(definition.kind).startsWith('anomaly-')) {
    group.add(makeAnomalyVisual(definition, seed));
  }

  return group;
}

export function updateCosmicPhenomenonVisual(group, definition, anchorBody, referenceFrame, elapsedSimSeconds) {
  if (!group || !definition) return;
  const sourcePosition = anchorBody?.position ?? definition.position;
  if (!sourcePosition) return;
  const position = new THREE.Vector3();
  referenceFrame.toRender(sourcePosition, position);
  group.position.copy(position);

  if (definition.kind === 'asteroid-belt') {
    const meanRadius = (definition.innerRadiusMeters + definition.outerRadiusMeters) * 0.5;
    const period = 2 * Math.PI * Math.sqrt((meanRadius ** 3) / Math.max(1, PHYSICS.G * anchorBody.mass));
    group.rotation.y = (elapsedSimSeconds / Math.max(1, period)) * Math.PI * 2;
  } else if (definition.kind === 'planetary-rings') {
    group.rotation.y = (elapsedSimSeconds / 80_000) % (Math.PI * 2);
  } else if (definition.kind === 'supernova-remnant') {
    group.rotation.y = (elapsedSimSeconds / 2_500_000) % (Math.PI * 2);
    group.rotation.z = 0.08 * Math.sin(elapsedSimSeconds / 900_000);
  } else if (definition.anomaly || String(definition.kind).startsWith('anomaly-')) {
    const phase=(elapsedSimSeconds/12000)+(group.userData.anomalyPulseSeed||0);
    group.rotation.y=(elapsedSimSeconds/180000)% (Math.PI*2);
    group.rotation.x=0.12*Math.sin(phase*.33);
    const pulse=1+0.035*Math.sin(phase); group.scale.setScalar(pulse);
  }
}
