/* Resident fish remain visible from the normal fishing view, including before casting. */
function createSurfaceResidents(W,P,MDL){
  const T=THREE,group=new T.Group();W.scene.add(group);const fish=[],anchor=new T.Vector3();let loc='',retry=0,initialized=false;
  function clear(){for(const f of fish){W.submerged.remove(f.group);group.remove(f.group);f.group.traverse(m=>{if(m.isMesh){m.geometry.dispose();for(const mt of(Array.isArray(m.material)?m.material:[m.material]))mt.dispose();}});}fish.length=0;}
  function populate(G){
    const sea=G.loc==='sea',ids=sea?['amber','mahi','grouper2']:['bluegill','crappie','reba','perch','lmbass','smbass'],count=window.__GFX==='low'?4:6;
    for(let i=fish.length;i<count;i++){
      const id=ids[i%ids.length],sp=P.SPECIES.find(s=>s.id===id);if(!sp||!MDL.fishReady(id))continue;
      const f=MDL.fish(sp);if(!f)continue;const L=sea?.65+(i%3)*.15:.32+(i%3)*.09;
      f.group.scale.setScalar(L);group.add(f.group);W.submerged.add(f.group);fish.push({...f,L,phase:i*2.399,depth:.3+(i%3)*.16,last:null});
    }
  }
  function update(dt,G){
    group.visible=['idle','charge','cast','wait','bite','lure','fight','retrieve','land','catch','post'].includes(G.state)&&G.loc!=='ice';if(!group.visible)return;
    if(loc!==(G.loc||'lake')){clear();loc=G.loc||'lake';initialized=false;retry=0;}
    if(!initialized||anchor.distanceTo(G.base)>18){anchor.copy(G.base);initialized=true;fish.forEach(f=>f.last=null);}
    retry-=dt;if(retry<=0){populate(G);retry=1;}
    const heading=G.head,forward=new T.Vector3(-Math.sin(heading),0,-Math.cos(heading)),right=new T.Vector3(Math.cos(heading),0,-Math.sin(heading));
    for(const f of fish){
      const phase=G.t*.24+f.phase,range=(loc==='sea'?11:5.5)+(1+Math.sin(phase*.43+f.phase))*1.5,side=Math.cos(phase)*2.1;
      const target=anchor.clone().addScaledVector(forward,range).addScaledVector(right,side);target.y=W.swell(target.x,target.z,G.t)-f.depth;
      const safe=f.last?W.fishingPhysics.move(f.last,target,f.L*.3).pos:W.fishingPhysics.resolve(target,f.L*.3),old=f.group.position.clone();f.group.position.set(safe.x,safe.y,safe.z);
      if(f.last){const dx=safe.x-old.x,dz=safe.z-old.z;if(Math.hypot(dx,dz)>.0001){let yaw=Math.atan2(-dz,dx),d=yaw-f.group.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;f.group.rotation.y+=d*(1-Math.exp(-dt*3));}}
      else f.group.rotation.y=-heading;f.last=f.group.position.clone();f.uni.uSwim.value+=dt*4;f.uni.uAmp.value=.035;
    }
  }
  return{update,clear,group};
}

if(typeof module!=='undefined'&&module.exports)module.exports={createSurfaceResidents};
