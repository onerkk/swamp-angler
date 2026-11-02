/* Aquarium collision uses complete, rotated model bounds, with room for the tail stroke.
   Steering anticipates contact; the swept pose check is the final non-penetration guard. */
function aquariumSpecs(){return [{w:2,h:1,d:.95,st:.7},{w:2.7,h:1.25,d:1.2,st:.65},{w:3.3,h:1.45,d:1.45,st:.6},{w:3.9,h:1.65,d:1.65,st:.55}];}
function aquariumDisplayLength(spec,length,count=1){
 const cap=Math.min(spec.w*.14,spec.d*.27,spec.h*.27)*Math.min(1,Math.pow(16/Math.max(1,count),1/3));
 return Math.min(Math.max(.018,length),cap);
}
function aquariumFitScale(spec,records){const longest=Math.max(.001,...records.map(r=>r.L||.001));return Math.min(1,aquariumDisplayLength(spec,longest,records.length)/longest);}
// Small residents need a readable display size even alongside a very large fish.
function aquariumResidentLength(spec,record,fishScale,bottom,count=1){
 if(!bottom)return Math.max(Math.min(.08,spec.h*.08),Math.max(.001,record.L||.001)*fishScale);
 const minimum=Math.min(.18,spec.d*.12,spec.h*.14),maximum=Math.max(minimum,Math.min(spec.w*.1,spec.d*.22,spec.h*.24)*Math.min(1,Math.sqrt(12/Math.max(1,count))));
 return Math.max(minimum,Math.min(maximum,Math.max(.001,record.L||.001)*1.6));
}
function aquariumCenterModel(T,model,includeHidden=false){
 const box=aquariumModelBounds(T,model,includeHidden);if(box.isEmpty())return null;
 const outer=new T.Group(),pivot=new T.Group();pivot.position.copy(box.getCenter(new T.Vector3())).negate();pivot.add(model);outer.add(pivot);outer.userData={...model.userData};return outer;
}
function aquariumModelBounds(T,root,includeHidden=false){
 root.updateMatrixWorld(true);const box=new T.Box3();root.traverse(o=>{
  if(!o.isMesh||!o.geometry||(o.userData&&o.userData.crustPart))return;if(!includeHidden)for(let p=o;p;p=p.parent)if(!p.visible)return;
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
 });return box;
}
function aquariumBodyBounds(box,length,bottom=false){
 const body=box.clone(),x=length*.08,z=length*(bottom?.08:.25),y=length*.025;
 body.min.x-=x;body.max.x+=x;body.min.z-=z;body.max.z+=z;body.min.y-=y;body.max.y+=y;return body;
}
function createAquariumMotion(T,{min,max,floor}){
 const bodies=[],obstacles=[],matrix=new T.Matrix4(),one=new T.Vector3(1,1,1),margin=-.004;
 function shape(f,pos=f.o.position,q=f.o.quaternion){return f.body.clone().applyMatrix4(matrix.compose(pos,q,one));}
 function overlap(a,b){return a.min.x<b.max.x-margin&&a.max.x>b.min.x+margin&&a.min.y<b.max.y-margin&&a.max.y>b.min.y+margin&&a.min.z<b.max.z-margin&&a.max.z>b.min.z+margin;}
 function bottom(box){let y=min.y;if(floor)for(const x of [box.min.x,box.max.x])for(const z of [box.min.z,box.max.z])y=Math.max(y,floor(x,z));return y;}
 function valid(f,pos=f.o.position,q=f.o.quaternion){
  const box=shape(f,pos,q);if(box.min.x<min.x||box.max.x>max.x||box.min.z<min.z||box.max.z>max.z||box.min.y<bottom(box)||box.max.y>max.y)return false;
  if(obstacles.some(b=>overlap(box,b)))return false;
  return !bodies.some(g=>g!==f&&overlap(box,g.box||shape(g)));
 }
 function add(f){bodies.push(f);f.box=shape(f);}
 function refresh(f){f.box=shape(f);}
 function ground(f,liftOnly=false){const b=shape(f),dy=bottom(b)-b.min.y+.002;f.o.position.y+=liftOnly?Math.max(0,dy):dy;refresh(f);}
 function radius(f){const b=f.body;return Math.sqrt(Math.max(b.min.x*b.min.x,b.max.x*b.max.x)+Math.max(b.min.z*b.min.z,b.max.z*b.max.z)+(f.bottom?0:Math.max(b.min.y*b.min.y,b.max.y*b.max.y)))+.015;}
 function navPoint(f,p){const r=radius(f),v=p.clone();if(f.bottom){const b=f.body;let y=min.y;for(const x of [p.x-r,p.x+r])for(const z of [p.z-r,p.z+r])if(floor)y=Math.max(y,floor(x,z));v.y=y-b.min.y+.004;}return v;}
 function turnClear(f,p){const r=radius(f),v=navPoint(f,p),lo=v.clone().add(new T.Vector3(-r,f.bottom?f.body.min.y:-r,-r)),hi=v.clone().add(new T.Vector3(r,f.bottom?f.body.max.y:r,r));
  if(lo.x<min.x||hi.x>max.x||lo.z<min.z||hi.z>max.z||lo.y<bottom({min:lo,max:hi})-.001||hi.y>max.y)return false;
  return !obstacles.some(b=>overlap({min:lo,max:hi},b));
 }
 function clearLeg(f,a,b){const n=Math.max(1,Math.ceil(a.distanceTo(b)/Math.max(.04,radius(f)*.5)));for(let i=0;i<=n;i++)if(!turnClear(f,a.clone().lerp(b,i/n)))return false;return true;}
 function plan(f){
  const r=radius(f);
  for(let i=0;i<24;i++){const p=navPoint(f,new T.Vector3(min.x+r+Math.random()*(max.x-min.x-2*r),min.y+r+Math.random()*(max.y-min.y-2*r),(f.bottom?min.z+(max.z-min.z)*.52: min.z+r)+Math.random()*(f.bottom?(max.z-min.z)*.48-r:max.z-min.z-2*r)));if(p.distanceTo(f.o.position)>Math.max(.2,r*2)&&clearLeg(f,f.o.position,p)){f.path=[p];f.blockedTime=0;return true;}}
  const step=Math.max(.17,r*1.1),nx=Math.max(2,Math.ceil((max.x-min.x-2*r)/step)+1),nz=Math.max(2,Math.ceil((max.z-min.z-2*r)/step)+1),ny=f.bottom?1:Math.max(2,Math.ceil((max.y-min.y-2*r)/step)+1),points=[];
  const at=(x,y,z)=>(y*nz+z)*nx+x;
  for(let y=0;y<ny;y++)for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const p=navPoint(f,new T.Vector3(min.x+r+(max.x-min.x-2*r)*x/(nx-1),f.bottom?0:min.y+r+(max.y-min.y-2*r)*y/(ny-1),min.z+r+(max.z-min.z-2*r)*z/(nz-1)));points.push(turnClear(f,p)?p:null);}
  let start=-1,near=Infinity;for(let i=0;i<points.length;i++)if(points[i]){const d=points[i].distanceToSquared(f.o.position);if(d<near&&clearLeg(f,f.o.position,points[i])){near=d;start=i;}}
  if(start<0){f.path=[];return false;}
  const queue=[start],prev=new Map([[start,-1]]);for(let j=0;j<queue.length;j++){const i=queue[j],x=i%nx,z=Math.floor(i/nx)%nz,y=Math.floor(i/(nx*nz));for(const [dx,dy,dz]of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],...(f.bottom?[]:[[0,1,0],[0,-1,0]])]){const xx=x+dx,yy=y+dy,zz=z+dz;if(xx<0||xx>=nx||yy<0||yy>=ny||zz<0||zz>=nz)continue;const k=at(xx,yy,zz);if(prev.has(k)||!points[k]||!clearLeg(f,points[i],points[k]))continue;prev.set(k,i);queue.push(k);}}
  const candidates=queue.filter(i=>points[i].distanceTo(f.o.position)>Math.max(.18,r*2));if(!candidates.length){f.path=[];return false;}
  const goal=candidates[Math.floor(Math.random()*candidates.length)],path=[];for(let i=goal;i>=0;i=prev.get(i))path.unshift(points[i]);
  const short=[];let anchor=f.o.position;while(path.length){let k=path.length-1;while(k>0&&!clearLeg(f,anchor,path[k]))k--;short.push(path[k]);anchor=path[k];path.splice(0,k+1);}f.path=short;f.blockedTime=0;return true;
 }
 function direction(f){if(!f.path||!f.path.length)plan(f);while(f.path&&f.path.length&&f.o.position.distanceTo(f.path[0])<.06)f.path.shift();if(!f.path||!f.path.length){plan(f);}
  if(f.path&&f.path.length){return f.path[0].clone().sub(f.o.position).normalize();}return new T.Vector3();}
 function spawnClear(f){return turnClear(f,f.o.position)&&!bodies.some(g=>g!==f&&f.o.position.distanceTo(g.o.position)<radius(f)+radius(g)+.025);}
 function place(f,near=false){
  if(f.bottom)ground(f);
  const start=f.o.position.clone(),size=f.body.getSize(new T.Vector3()),center=f.body.getCenter(new T.Vector3());
  for(let i=0;i<600;i++){
   if(i===0&&valid(f)&&spawnClear(f)){refresh(f);return true;}
   f.o.position.set(min.x+Math.random()*(max.x-min.x),min.y+Math.random()*(max.y-min.y),min.z+Math.random()*(max.z-min.z));
   if(near&&i<100)f.o.position.copy(start).add(new T.Vector3((Math.random()-.5)*size.length()*3,(Math.random()-.5)*size.length(),(Math.random()-.5)*size.length()*3));
   if(f.bottom){if(i<240)f.o.position.z=min.z+(max.z-min.z)*(.58+Math.random()*.38);ground(f);}
   if(valid(f)&&spawnClear(f)){refresh(f);f.path=[];return true;}
  }
  // Deterministic fallback explores the free volume even if random candidates were unlucky.
  const step=Math.max(.04,Math.min(size.x,size.y,size.z)*.65),yStep=f.bottom?max.y-min.y+1:Math.max(.05,size.y*.8);
  for(let y=min.y;y<max.y;y+=yStep)for(let z=min.z;z<max.z;z+=step)for(let x=min.x;x<max.x;x+=step){
   f.o.position.set(x-center.x,y-center.y,z-center.z);if(f.bottom)ground(f);if(valid(f)&&spawnClear(f)){refresh(f);f.path=[];return true;}
  }
  f.o.position.copy(start);refresh(f);return false;
 }
 function pack(){
  // Repack after async scenery/model loads. No creature is hidden or dropped to make space.
  for(let attempt=0;attempt<18;attempt++){
   bodies.forEach(f=>{f.box=null;});let ok=true;
   for(const f of bodies){const index=bodies.indexOf(f);const later=bodies.splice(index+1);if(!place(f,true))ok=false;bodies.push(...later);if(!ok)break;}
   if(ok){bodies.forEach(refresh);return true;}
   for(const f of bodies){f.o.scale.multiplyScalar(.92);f.body.min.multiplyScalar(.92);f.body.max.multiplyScalar(.92);}
  }
  return false;
 }
 function addObstacle(root,parent){
  root.updateWorldMatrix(true,true);parent.updateWorldMatrix(true,false);const inv=parent.matrixWorld.clone().invert();
  root.traverse(o=>{if(!o.isMesh||!o.geometry)return;for(let p=o;p&&p!==parent;p=p.parent)if(!p.visible)return;
   if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));if(!b.isEmpty())obstacles.push(b.expandByScalar(.008));});
  if(bodies.length)pack();
 }
 function socialClear(f,p){return !bodies.some(g=>g!==f&&p.distanceTo(g.o.position)<radius(f)+radius(g)+.01);}
 function steer(f,direction){
  const ahead=Math.max(.1,radius(f)*.8),probe=f.o.position.clone().addScaledVector(direction,ahead),force=new T.Vector3();
  for(const g of bodies){if(g===f)continue;const need=radius(f)+radius(g)+.08,d=probe.distanceTo(g.o.position);if(d>=need)continue;
   const away=f.o.position.clone().sub(g.o.position).normalize();if(f.bottom)away.y=0;force.addScaledVector(away,3*(need-d)/need);
  }
  if(f.bottom)force.y=0;return direction.add(force).normalize();
 }
 function move(f,from,rotation){
  const end=f.o.position.clone(),q=f.o.quaternion.clone(),distance=from.distanceTo(end),angle=rotation.angleTo(q),size=f.body.getSize(new T.Vector3());
  const step=Math.max(.004,Math.min(size.x,size.y,size.z)*.25),n=Math.max(1,Math.ceil(distance/step),Math.ceil(angle/.035)),pos=new T.Vector3(),quat=new T.Quaternion();
  let accepted=0;
  for(let i=1;i<=n;i++){pos.lerpVectors(from,end,i/n);quat.copy(rotation).slerp(q,i/n);if(!valid(f,pos,quat)||!turnClear(f,pos)||!socialClear(f,pos))break;accepted=i/n;}
  f.o.position.lerpVectors(from,end,accepted);f.o.quaternion.copy(rotation).slerp(q,accepted);
  // A blocked forward step must not prevent turning away in place.
  if(accepted<1){const pivot=f.o.quaternion.clone();for(let i=1;i<=Math.max(1,Math.ceil(angle/.035));i++){quat.copy(pivot).slerp(q,i/Math.max(1,Math.ceil(angle/.035)));if(!valid(f,f.o.position,quat))break;f.o.quaternion.copy(quat);}}
  refresh(f);return accepted===1;
 }
 function recover(f,dt){
  const from=f.o.position.clone(),q=f.o.quaternion.clone(),away=new T.Vector3();for(const g of bodies){if(g===f)continue;const d=from.distanceToSquared(g.o.position);if(d<.5)away.addScaledVector(from.clone().sub(g.o.position),1/Math.max(.002,d));}
  const dirs=[away.normalize()];for(let i=0;i<12;i++)dirs.push(new T.Vector3(Math.cos(i*Math.PI/6),0,Math.sin(i*Math.PI/6)));if(!f.bottom)dirs.push(new T.Vector3(0,1,0),new T.Vector3(0,-1,0));
  for(const dir of dirs){if(dir.lengthSq()<.01)continue;const to=from.clone().addScaledVector(dir,(f.bottom?.035:.06)*dt);f.o.position.copy(f.bottom?navPoint(f,to):to);if(move(f,from,q)&&f.o.position.distanceTo(from)>1e-7){f.path=[];return true;}f.o.position.copy(from);f.o.quaternion.copy(q);refresh(f);}return false;
 }
 return{add,addObstacle,place,pack,valid,move,steer,ground,refresh,shape,bodies,obstacles,plan,direction,turnClear,recover};
}
if(typeof module!=='undefined'&&module.exports)module.exports={aquariumSpecs,aquariumDisplayLength,aquariumFitScale,aquariumResidentLength,aquariumCenterModel,aquariumModelBounds,aquariumBodyBounds,createAquariumMotion};
