/* Aquarium collision uses complete, rotated model bounds, with room for the tail stroke.
   Steering anticipates contact; the swept pose check is the final non-penetration guard. */
function aquariumSpecs(){return [{w:2,h:1,d:.95,st:.7},{w:2.7,h:1.25,d:1.2,st:.65},{w:3.3,h:1.45,d:1.45,st:.6},{w:3.9,h:1.65,d:1.65,st:.55}];}
function aquariumDisplayLength(spec,length,count=1){
 const cap=Math.min(spec.w*.25,spec.d*.58,spec.h*.58)*Math.min(1,Math.pow(12/Math.max(1,count),1/3));
 return Math.min(Math.max(.025,length),cap);
}
function aquariumModelBounds(T,root){
 root.updateMatrixWorld(true);const box=new T.Box3();root.traverse(o=>{
  if(!o.isMesh||!o.geometry)return;for(let p=o;p;p=p.parent)if(!p.visible)return;
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
 });return box;
}
function aquariumBodyBounds(box,length,bottom=false){
 const body=box.clone(),x=length*.08,z=length*(bottom?.08:.25),y=length*.025;
 body.min.x-=x;body.max.x+=x;body.min.z-=z;body.max.z+=z;body.min.y-=y;body.max.y+=y;return body;
}
function createAquariumMotion(T,{min,max,floor}){
 const bodies=[],obstacles=[],matrix=new T.Matrix4(),one=new T.Vector3(1,1,1),temp=new T.Box3(),margin=-.004;
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
 function place(f,near=false){
  const start=f.o.position.clone(),size=f.body.getSize(new T.Vector3()),center=f.body.getCenter(new T.Vector3());
  for(let i=0;i<600;i++){
   if(i===0&&valid(f)){refresh(f);return true;}
   f.o.position.set(min.x+Math.random()*(max.x-min.x),min.y+Math.random()*(max.y-min.y),min.z+Math.random()*(max.z-min.z));
   if(near&&i<100)f.o.position.copy(start).add(new T.Vector3((Math.random()-.5)*size.length()*3,(Math.random()-.5)*size.length(),(Math.random()-.5)*size.length()*3));
   if(f.bottom)ground(f);
   if(valid(f)){refresh(f);return true;}
  }
  // Deterministic fallback explores the free volume even if random candidates were unlucky.
  const step=Math.max(.04,Math.min(size.x,size.y,size.z)*.65),yStep=f.bottom?max.y-min.y+1:Math.max(.05,size.y*.8);
  for(let y=min.y;y<max.y;y+=yStep)for(let z=min.z;z<max.z;z+=step)for(let x=min.x;x<max.x;x+=step){
   f.o.position.set(x-center.x,y-center.y,z-center.z);if(f.bottom)ground(f);if(valid(f)){refresh(f);return true;}
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
 function steer(f,direction){
  const size=f.body.getSize(new T.Vector3()),ahead=Math.max(.12,size.x*.6),box=f.box||shape(f),center=box.getCenter(new T.Vector3()),probe=center.clone().addScaledVector(direction,ahead),force=new T.Vector3();
  const half=box.getSize(new T.Vector3()).multiplyScalar(.5).addScalar(.035);
  for(const b of [...obstacles,...bodies.filter(g=>g!==f).map(g=>g.box||shape(g))]){
   temp.copy(b);temp.min.sub(half);temp.max.add(half);if(!temp.containsPoint(probe))continue;
   let best=Infinity,axis='x',sign=1;for(const k of ['x','y','z'])for(const s of [-1,1]){const distance=s<0?probe[k]-temp.min[k]:temp.max[k]-probe[k];if(distance<best){best=distance;axis=k;sign=s;}}
   force[axis]+=sign*2.5;
  }
  for(const k of ['x','y','z']){const cushion=half[k]+ahead*.6;if(center[k]<min[k]+cushion)force[k]+=2;if(center[k]>max[k]-cushion)force[k]-=2;}
  if(f.bottom)force.y=0;return direction.add(force).normalize();
 }
 function move(f,from,rotation){
  const end=f.o.position.clone(),q=f.o.quaternion.clone(),distance=from.distanceTo(end),angle=rotation.angleTo(q),size=f.body.getSize(new T.Vector3());
  const step=Math.max(.004,Math.min(size.x,size.y,size.z)*.25),n=Math.max(1,Math.ceil(distance/step),Math.ceil(angle/.035)),pos=new T.Vector3(),quat=new T.Quaternion();
  let accepted=0;
  for(let i=1;i<=n;i++){pos.lerpVectors(from,end,i/n);quat.copy(rotation).slerp(q,i/n);if(!valid(f,pos,quat))break;accepted=i/n;}
  f.o.position.lerpVectors(from,end,accepted);f.o.quaternion.copy(rotation).slerp(q,accepted);refresh(f);return accepted===1;
 }
 return{add,addObstacle,place,pack,valid,move,steer,ground,refresh,shape,bodies,obstacles};
}
if(typeof module!=='undefined'&&module.exports)module.exports={aquariumSpecs,aquariumDisplayLength,aquariumModelBounds,aquariumBodyBounds,createAquariumMotion};
