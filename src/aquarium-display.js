/* The aquarium is a close-up exhibit: keep texture detail and reduce repeated draw calls. */
function aquariumGraphicsProfile(profile,scope,cap){
 if(scope!=='home-aquarium'||profile.mode!=='auto')return profile;
 return{...profile,pr:Math.min(cap,Math.max(1.15,profile.pr))};
}
function createAquariumPlantBatch(T,parent,plants){
 const batches=[],matrix=new T.Matrix4();let entries=[],disposed=false;
 function rebuild(){
  for(const b of batches){parent.remove(b.mesh);if(b.mesh.dispose)b.mesh.dispose();}batches.length=0;entries=[];const groups=new Map();
  for(const p of plants){p.o.visible=true;p.o.updateMatrixWorld(true);const inv=p.o.matrixWorld.clone().invert();p.o.traverse(m=>{
   if(!m.isMesh||m.isSkinnedMesh||!m.geometry)return;for(let a=m;a&&a!==p.o;a=a.parent)if(!a.visible)return;
   const mats=Array.isArray(m.material)?m.material:[m.material],key=m.geometry.uuid+':'+mats.map(x=>x.uuid).join(',');if(!groups.has(key))groups.set(key,{geometry:m.geometry,material:m.material,items:[]});
   groups.get(key).items.push({root:p.o,local:new T.Matrix4().multiplyMatrices(inv,m.matrixWorld)});
  });p.o.visible=false;}
  for(const g of groups.values()){const mesh=new T.InstancedMesh(g.geometry,g.material,g.items.length);mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(mesh);batches.push({mesh,items:g.items});}
  entries=plants.map(p=>p.o);update();
 }
 function update(){if(disposed)return;for(const root of entries)root.updateMatrix();for(const b of batches){b.items.forEach((item,i)=>{matrix.multiplyMatrices(item.root.matrix,item.local);b.mesh.setMatrixAt(i,matrix);});b.mesh.instanceMatrix.needsUpdate=true;}}
 function dispose(){for(const b of batches){parent.remove(b.mesh);if(b.mesh.dispose)b.mesh.dispose();}batches.length=0;disposed=true;}
 return{rebuild,update,dispose,batches};
}
function aquariumCameraPosition(T,tk,fromWorld,toWorld){
 const r=.105,s=tk.spec,lo=new T.Vector3(-s.w/2+r,tk.y+r,-s.d/2+r),hi=new T.Vector3(s.w/2-r,tk.y+s.h-r,s.d/2-r),offset=new T.Vector3(tk.x||0,0,tk.z||0),boxes=[...(tk.motion?.obstacles||[]),...(tk.fish||[]).map(f=>f.box||tk.motion.shape(f))];
 const clamp=p=>{p.clamp(lo,hi);if(tk.hAt){let floor=0;for(const x of[p.x-r,p.x+r])for(const z of[p.z-r,p.z+r])floor=Math.max(floor,tk.hAt(x,z));p.y=Math.max(p.y,tk.y+floor+r);}return p;};
 const safe=p=>p.y<=hi.y&&boxes.every(b=>{const q=p.clone().clamp(b.min,b.max);return p.distanceToSquared(q)>r*r;});
 let from=clamp(fromWorld.clone().sub(offset)),target=clamp(toWorld.clone().sub(offset));
 if(!safe(from)){
  let best=null,distance=Infinity;
  for(let ring=1;ring<=12&&!best;ring++)for(let y=-1;y<=1;y++)for(let i=0;i<16;i++){const a=i*Math.PI/8,p=clamp(from.clone().add(new T.Vector3(Math.cos(a)*r*ring,y*r*ring,Math.sin(a)*r*ring)));const d=p.distanceToSquared(from);if(d<distance&&safe(p)){best=p;distance=d;}}
  if(best)from=best;else return from.add(offset);
 }
 const delta=target.clone().sub(from),n=Math.max(1,Math.ceil(delta.length()/.035)),step=delta.multiplyScalar(1/n);
 for(let i=0;i<n;i++){const next=clamp(from.clone().add(step));if(safe(next)){from=next;continue;}for(const axis of['x','z','y']){const slide=from.clone();slide[axis]+=step[axis];clamp(slide);if(safe(slide))from=slide;}}
 return from.add(offset);
}
if(typeof module!=='undefined'&&module.exports)module.exports={aquariumGraphicsProfile,createAquariumPlantBatch,aquariumCameraPosition};
