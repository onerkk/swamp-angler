/* Landing is measured from the reachable rail, never from the boat's centre. */
function fishingLanding(physics,base,fish,length,boat,dock=false){
 const radius=Math.max(.12,length*.22);
 if(!boat)return{near:Math.hypot(fish.x-base.x,fish.z-base.z)<(dock?4:2.6),boat:false,gap:Infinity};
 const hull=physics.boxes.find(b=>b.label==='船體');
 if(!hull)return{near:false,boat:true,gap:Infinity};
 const p=FishingPhysics.local(fish,hull),q={x:Math.max(hull.min.x,Math.min(hull.max.x,p.x)),y:fish.y,z:Math.max(hull.min.z,Math.min(hull.max.z,p.z))};
 const edge=FishingPhysics.world(q,hull),gap=Math.hypot(p.x-q.x,p.z-q.z),reach=Math.hypot(edge.x-base.x,edge.z-base.z);
 // The bow and nearby side rails are reachable; do not scoop across the whole yacht.
 return{near:gap<=radius+.85&&reach<=5.8,boat:true,gap,reach,edge};
}
function fishingLandingTarget(physics,base,fish,length){
 const hull=physics.boxes.find(b=>b.label==='船體');if(!hull)return{...fish};
 const p=FishingPhysics.local(fish,hull),r=Math.max(.12,length*.22)+.2;
 let q={x:Math.max(hull.min.x,Math.min(hull.max.x,p.x)),y:fish.y,z:Math.max(hull.min.z,Math.min(hull.max.z,p.z))};
 const choices=[{x:hull.min.x-r,y:fish.y,z:q.z},{x:hull.max.x+r,y:fish.y,z:q.z},{x:q.x,y:fish.y,z:hull.min.z-r},{x:q.x,y:fish.y,z:hull.max.z+r}];
 const reachable=choices.filter(v=>{const w=FishingPhysics.world(v,hull);return Math.hypot(w.x-base.x,w.z-base.z)<6.5;});
 if(!reachable.length)reachable.push({x:p.x<0?hull.min.x-r:hull.max.x+r,y:fish.y,z:Math.max(hull.min.z,Math.min(0,p.z))});
 reachable.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
 return physics.resolve(FishingPhysics.world(reachable[0],hull),Math.max(.12,length*.22));
}
if(typeof module!=='undefined'&&module.exports)module.exports={fishingLanding,fishingLandingTarget};
