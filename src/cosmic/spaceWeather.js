import { PHYSICS } from '../core/constants.js';
import { createRng } from '../util/prng.js';

function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function mag(v){return Math.hypot(v[0],v[1],v[2]);}
function unit(v){const m=mag(v)||1;return [v[0]/m,v[1]/m,v[2]/m];}

export class SpaceWeatherManager {
  constructor(){ this.reset('ORIGIN-001',0); }

  _initRng(seed, drawCount=0){
    this._rngDrawCount=0;
    const base=createRng(`${seed}:space-weather-v1`);
    for(let i=0;i<Math.max(0,Math.floor(drawCount));i+=1) base.random();
    this._rngDrawCount=Math.max(0,Math.floor(drawCount));
    this.rng={
      random:()=>{this._rngDrawCount+=1;return base.random();},
      range:(min,max)=>{this._rngDrawCount+=1;return min+(max-min)*base.random();},
      int:(min,maxInclusive)=>{this._rngDrawCount+=1;return Math.floor(min+(maxInclusive+1-min)*base.random());},
      pick:(list)=>{this._rngDrawCount+=1;return list[Math.floor(base.random()*list.length)];},
    };
  }

  reset(seed='ORIGIN-001', elapsedSeconds=0){
    this.seed=String(seed); this._initRng(this.seed,0); this.events=[]; this.serial=1;
    this.autoEnabled=true; this.nextAutoEventSeconds=elapsedSeconds+this.rng.range(0.7,2.4)*PHYSICS.DAY; this.lastShipHitEventId=null;
  }

  serialize(){
    return {
      version:1,
      seed:this.seed,
      rngDrawCount:this._rngDrawCount,
      serial:this.serial,
      autoEnabled:this.autoEnabled,
      nextAutoEventSeconds:this.nextAutoEventSeconds,
      lastShipHitEventId:this.lastShipHitEventId,
      events:this.events.filter((event)=>!event.expired).map((event)=>({
        id:event.id,kind:event.kind,label:event.label,anchorBodyId:event.anchorBodyId,launchTimeSeconds:event.launchTimeSeconds,
        speedMps:event.speedMps,halfAngleRad:event.halfAngleRad,direction:[...event.direction],startRadiusMeters:event.startRadiusMeters,
        thicknessMeters:event.thicknessMeters,scientificStatus:event.scientificStatus,previousRadiusMeters:event.previousRadiusMeters,
        expired:Boolean(event.expired),hitShip:Boolean(event.hitShip),
      })),
    };
  }

  restore(snapshot, seed='ORIGIN-001', elapsedSeconds=0){
    if(!snapshot || snapshot.version!==1 || String(snapshot.seed)!==String(seed)) { this.reset(seed,elapsedSeconds); return false; }
    this.seed=String(seed);
    this._initRng(this.seed,Number(snapshot.rngDrawCount)||0);
    this.serial=Math.max(1,Math.floor(Number(snapshot.serial)||1));
    this.autoEnabled=snapshot.autoEnabled!==false;
    this.nextAutoEventSeconds=Number.isFinite(Number(snapshot.nextAutoEventSeconds))?Number(snapshot.nextAutoEventSeconds):elapsedSeconds+this.rng.range(0.7,2.4)*PHYSICS.DAY;
    this.lastShipHitEventId=typeof snapshot.lastShipHitEventId==='string'?snapshot.lastShipHitEventId:null;
    this.events=Array.isArray(snapshot.events)?snapshot.events.map((raw)=>({
      id:String(raw.id),kind:'cme',label:String(raw.label||raw.id),anchorBodyId:String(raw.anchorBodyId||'star-0'),
      launchTimeSeconds:Number(raw.launchTimeSeconds)||0,speedMps:Math.max(250_000,Math.min(Number(raw.speedMps)||800_000,3_000_000)),
      halfAngleRad:Math.max(.18,Math.min(Number(raw.halfAngleRad)||.6,1.25)),direction:unit(Array.isArray(raw.direction)?raw.direction:[1,0,0]),
      startRadiusMeters:Math.max(1,Number(raw.startRadiusMeters)||1e9),thicknessMeters:Math.max(1,Number(raw.thicknessMeters)||2.5e8),
      scientificStatus:String(raw.scientificStatus||'Restored kinematic CME front.'),previousRadiusMeters:Math.max(1,Number(raw.previousRadiusMeters)||Number(raw.startRadiusMeters)||1e9),
      expired:Boolean(raw.expired),hitShip:Boolean(raw.hitShip),
    })).filter((event)=>!event.expired):[];
    return true;
  }

  triggerCme(star, elapsedSeconds, options={}){
    if(!star) return null;
    const direction=unit(options.direction ?? [this.rng.range(-1,1),this.rng.range(-.45,.45),this.rng.range(-1,1)]);
    const speedMps=Math.max(250_000,Math.min(Number(options.speedMps)||this.rng.range(450_000,1_900_000),3_000_000));
    const halfAngleRad=Math.max(.18,Math.min(Number(options.halfAngleRad)||this.rng.range(.45,.9),1.25));
    const event={
      id:`cme-${this.serial++}`,kind:'cme',label:`CME ${this.serial-1}`,anchorBodyId:star.id,launchTimeSeconds:elapsedSeconds,
      speedMps,halfAngleRad,direction,startRadiusMeters:Math.max(star.radius*1.15,1e9),thicknessMeters:Math.max(star.radius*.4,2.5e8),
      scientificStatus:'Kinematic coronal-mass-ejection front: measured propagation speed and arrival geometry are modeled; plasma/MHD, magnetic reconnection and radiation transport are not.',
      previousRadiusMeters:Math.max(star.radius*1.15,1e9),expired:false,hitShip:false,
    };
    this.events.push(event); return event;
  }

  eventState(event, star, elapsedSeconds){
    const age=Math.max(0,elapsedSeconds-event.launchTimeSeconds);
    const radiusMeters=event.startRadiusMeters+event.speedMps*age;
    return {...event,ageSeconds:age,radiusMeters,center:new Float64Array(star?.position ?? [0,0,0]),velocity:new Float64Array(star?.velocity ?? [0,0,0])};
  }

  step(elapsedSeconds, star, ship){
    const notices=[];
    if(this.autoEnabled && star && elapsedSeconds>=this.nextAutoEventSeconds){
      const event=this.triggerCme(star,elapsedSeconds); notices.push({type:'start',event});
      this.nextAutoEventSeconds=elapsedSeconds+this.rng.range(1.2,4.5)*PHYSICS.DAY;
    }
    for(const event of this.events){
      if(event.expired||!star) continue;
      const state=this.eventState(event,star,elapsedSeconds);
      if(state.radiusMeters>18*PHYSICS.AU || state.ageSeconds>45*PHYSICS.DAY){event.expired=true;continue;}
      if(ship&&!event.hitShip){
        const rel=[ship.position[0]-star.position[0],ship.position[1]-star.position[1],ship.position[2]-star.position[2]],d=mag(rel);
        const angular=dot(unit(rel),event.direction);
        const insideCone=angular>=Math.cos(event.halfAngleRad);
        const previous=Math.max(event.startRadiusMeters, Number(event.previousRadiusMeters)||event.startRadiusMeters);
        const lo=Math.min(previous,state.radiusMeters)-event.thicknessMeters;
        const hi=Math.max(previous,state.radiusMeters)+event.thicknessMeters;
        const crossedFront=d>=lo&&d<=hi;
        if(insideCone&&crossedFront){event.hitShip=true;this.lastShipHitEventId=event.id;notices.push({type:'ship-hit',event,state,distanceMeters:d});}
      }
      event.previousRadiusMeters=state.radiusMeters;
    }
    this.events=this.events.filter((e)=>!e.expired);
    return notices;
  }

  states(star,elapsedSeconds){ return this.events.filter((e)=>!e.expired).map((e)=>this.eventState(e,star,elapsedSeconds)); }
}
