/* Shared swept collision for tackle, fish and line. Bounds follow visible scene meshes.
   No zone-based dice rolls: only physical contact can snag or abrade a line. */
class FishingPhysics {
  constructor(){ this.items=[]; this.boxes=[]; }
  addBox(min,max,enabled=()=>true,label='障礙物'){ const item={boxes:[{min:{...min},max:{...max},label}],enabled}; this.items.push(item); return item; }
  addObject(root,enabled=()=>true,label='障礙物',dynamic=false){
    const item={root,enabled,label,dynamic,boxes:[]}; this.items.push(item); this.measure(item); return item;
  }
  measure(item){
    const T=THREE; item.root.updateWorldMatrix(true,true); item.boxes=[];
    item.root.traverse(m=>{ if(!m.isMesh||m.isInstancedMesh||!m.geometry) return;
      // Separate mesh bounds preserve gaps between distinct rocks, branches and dock posts.
      if(!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const b=m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
      if(!b.isEmpty()) item.boxes.push({min:{x:b.min.x,y:b.min.y,z:b.min.z},max:{x:b.max.x,y:b.max.y,z:b.max.z},label:item.label});
    });
  }
  refresh(){ this.boxes=[]; for(const i of this.items){ if(!i.enabled()) continue; if(i.update) i.update(); else if(i.dynamic) this.measure(i); this.boxes.push(...i.boxes); } }
  static local(p,b){ if(!b.frame)return {...p}; const f=b.frame,c=Math.cos(f.head),s=Math.sin(f.head),x=p.x-f.x,z=p.z-f.z;return{x:x*c-z*s,y:p.y,z:x*s+z*c}; }
  static world(p,b){ if(!b.frame)return {...p};const f=b.frame,c=Math.cos(f.head),s=Math.sin(f.head);return{x:f.x+p.x*c+p.z*s,y:p.y,z:f.z-p.x*s+p.z*c}; }
  static inside(p,b,r=0){ p=FishingPhysics.local(p,b); return ['x','y','z'].every(k=>p[k]>b.min[k]-r&&p[k]<b.max[k]+r); }
  hit(a,b,r=0,accept=null){
    let best=null;
    for(const box of this.boxes){ if(accept&&!accept(box))continue; const aa=FishingPhysics.local(a,box),bb=FishingPhysics.local(b,box); if(r===.025&&box.label==='睡蓮葉') continue; let lo=0,hi=1,axis=null,sign=0,valid=true;
      for(const k of ['x','y','z']){ const d=bb[k]-aa[k], mn=box.min[k]-r,mx=box.max[k]+r;
        if(Math.abs(d)<1e-10){ if(aa[k]<=mn||aa[k]>=mx){valid=false;break;} continue; }
        let t0=(mn-aa[k])/d,t1=(mx-aa[k])/d,sg=-1; if(t0>t1){[t0,t1]=[t1,t0];sg=1;}
        if(t0>=lo){lo=t0;axis=k;sign=sg;} hi=Math.min(hi,t1); if(lo>hi){valid=false;break;}
      }
      if(valid&&axis&&lo>=0&&lo<=1&&hi>1e-7&&(!best||lo<best.t)) best={t:lo,axis,sign,box,normal:(()=>{const v={x:0,y:0,z:0};v[axis]=sign;if(!box.frame)return v;const c=Math.cos(box.frame.head),s=Math.sin(box.frame.head);return{x:v.x*c+v.z*s,y:v.y,z:-v.x*s+v.z*c};})()};
    } return best;
  }
  clear(p,r=0){ return !this.boxes.some(b=>FishingPhysics.inside(p,b,r)); }
  resolve(p,r=0){ let q={...p};
    for(let n=0;n<16;n++){ const b=this.boxes.find(b=>FishingPhysics.inside(q,b,r)); if(!b) break;
      // Waterborne objects go around posts rather than being pushed onto their tops.
      const local=FishingPhysics.local(q,b),choices=[]; for(const k of ['x','z']) for(const s of [-1,1]){const v=s<0?b.min[k]-r-.002:b.max[k]+r+.002; choices.push({k,v,d:Math.abs(v-local[k])});}
      choices.sort((a,b)=>a.d-b.d); local[choices[0].k]=choices[0].v;q=FishingPhysics.world(local,b);
    } return q;
  }
  move(a,b,r=0,slide=true){
    let p=this.resolve(a,r), target={...b}, contact=null;
    for(let n=0;n<5;n++){ const h=this.hit(p,target,r); if(!h){p=target;break;} contact=contact||h;
      const t=Math.max(0,h.t-.001/Math.max(.001,Math.hypot(target.x-p.x,target.y-p.y,target.z-p.z)));
      const next={x:p.x+(target.x-p.x)*t,y:p.y+(target.y-p.y)*t,z:p.z+(target.z-p.z)*t};
      if(!slide){p=next;break;} const n=h.normal,d=(target.x-next.x)*n.x+(target.y-next.y)*n.y+(target.z-next.z)*n.z;target.x-=d*n.x;target.y-=d*n.y;target.z-=d*n.z;p=next;
    } return {pos:p,contact};
  }
  // Visibility graph around real contact bounds. Every rendered line segment is checked.
  route(a,b,r=.025){
    if(!this.hit(a,b,r)) return [a,b];
    const nodes=[a,b], blockers=this.boxes.filter(o=>(r!==.025||o.label!=='睡蓮葉')&&o.max.y>=Math.min(a.y,b.y)-.04&&o.min.y<=Math.max(a.y,b.y)+.04&&(o.frame||o.max.x>=Math.min(a.x,b.x)-8&&o.min.x<=Math.max(a.x,b.x)+8&&o.max.z>=Math.min(a.z,b.z)-8&&o.min.z<=Math.max(a.z,b.z)+8));
    for(const o of blockers){for(const x of [o.min.x-r-.05,o.max.x+r+.05])for(const z of [o.min.z-r-.05,o.max.z+r+.05]){const p=FishingPhysics.world({x,y:b.y,z},o);if(this.clear(p,r))nodes.push(p);}}
    const dist=nodes.map(()=>Infinity),prev=[],done=new Set(); dist[0]=0;
    for(let step=0;step<nodes.length;step++){let u=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(u<0||dist[i]<dist[u]))u=i;
      if(u<0||!Number.isFinite(dist[u])) break; if(u===1){const path=[];for(let i=1;i!==undefined;i=prev[i])path.unshift(nodes[i]);return path;}
      done.add(u);for(let v=0;v<nodes.length;v++){if(done.has(v)||this.hit(nodes[u],nodes[v],r))continue;
        const d=dist[u]+Math.hypot(nodes[v].x-nodes[u].x,nodes[v].y-nodes[u].y,nodes[v].z-nodes[u].z);if(d<dist[v]){dist[v]=d;prev[v]=u;}}
    }
    // No clear route: terminate at the obstruction, never draw through it.
    const h=this.hit(a,b,r),t=Math.max(0,h.t-.002);return [a,{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t}];
  }
}
if(typeof module!=='undefined'&&module.exports) module.exports=FishingPhysics;
