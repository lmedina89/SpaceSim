import * as THREE from 'three/webgpu';
import { SIMULATION } from '../core/constants.js';
import { createRng } from '../util/prng.js';

function dispose(root){root.traverse?.((n)=>{n.geometry?.dispose?.();n.material?.dispose?.();});}

function createCmeVisual(event, seed){
  const group=new THREE.Group();group.userData.weatherId=event.id;
  const rng=createRng(`${seed}:${event.id}:cme-visual`);const count=2600;
  const pos=new Float32Array(count*3);const color=new Float32Array(count*3);const c1=new THREE.Color(0x9feeff),c2=new THREE.Color(0xffb16a),c=new THREE.Color();
  const dir=new THREE.Vector3(...event.direction).normalize();const z=new THREE.Vector3(0,0,1);const q=new THREE.Quaternion().setFromUnitVectors(z,dir);
  for(let i=0;i<count;i+=1){
    const az=rng.range(0,Math.PI*2);const cosTheta=rng.range(Math.cos(event.halfAngleRad),1);const sinTheta=Math.sqrt(Math.max(0,1-cosTheta*cosTheta));
    const v=new THREE.Vector3(Math.cos(az)*sinTheta,Math.sin(az)*sinTheta,cosTheta).applyQuaternion(q);
    const k=i*3;pos[k]=v.x;pos[k+1]=v.y;pos[k+2]=v.z;c.copy(c1).lerp(c2,rng.random());const b=rng.range(.45,1);color[k]=c.r*b;color[k+1]=c.g*b;color[k+2]=c.b*b;
  }
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(pos,3));geom.setAttribute('color',new THREE.BufferAttribute(color,3));
  const points=new THREE.Points(geom,new THREE.PointsMaterial({size:.14,vertexColors:true,transparent:true,opacity:.48,depthWrite:false,blending:THREE.AdditiveBlending}));points.frustumCulled=false;group.add(points);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.55,1.8,32,1,true),new THREE.MeshBasicMaterial({color:0xffa46e,transparent:true,opacity:.025,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);cone.position.copy(dir.clone().multiplyScalar(.9));group.add(cone);
  return group;
}

export function syncSpaceWeatherVisuals(scene,map,states,referenceFrame,seed='COSMOS'){
  const ids=new Set(states.map((s)=>s.id));
  for(const [id,visual] of map){if(!ids.has(id)){scene.remove(visual);dispose(visual);map.delete(id);}}
  const temp=new THREE.Vector3();
  for(const state of states){let visual=map.get(state.id);if(!visual){visual=createCmeVisual(state,seed);map.set(state.id,visual);scene.add(visual);}referenceFrame.toRender(state.center,temp);visual.position.copy(temp);const scale=Math.max(.02,state.radiusMeters/SIMULATION.metersPerRenderUnit);visual.scale.setScalar(scale);visual.visible=true;visual.userData.perceptualMacroPreserved=true;}
}
