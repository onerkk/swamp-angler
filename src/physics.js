/* Shared swept collision for tackle, fish and line. Bounds follow visible scene meshes.
   No zone-based dice rolls: only physical contact can snag or abrade a line. */
const AXES=['x','y','z'], HIT_A={x:0,y:0,z:0}, HIT_B={x:0,y:0,z:0};
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
  refresh(){ const out=this.boxes; out.length=0; const items=this.items; for(let n=0;n<items.length;n++){ const i=items[n]; if(!i.enabled()) continue; if(i.update) i.update(); else if(i.dynamic) this.measure(i); const bs=i.boxes; for(let k=0;k<bs.length;k++) out.push(bs[k]); } }
  // 碰撞檢查每幀被呼叫上千次（每段釣線、浮標、船都要查每個障礙物）：全部不配置新物件，以免每秒產生數百 MB 垃圾、觸發長時間的垃圾回收卡頓
  static local(p,b,out){ out=out||{x:0,y:0,z:0}; if(!b.frame){ out.x=p.x; out.y=p.y; out.z=p.z; return out; } const f=b.frame,c=Math.cos(f.head),s=Math.sin(f.head),x=p.x-f.x,z=p.z-f.z; out.x=x*c-z*s; out.y=p.y; out.z=x*s+z*c; return out; }
  static world(p,b){ if(!b.frame)return {...p};const f=b.frame,c=Math.cos(f.head),s=Math.sin(f.head);return{x:f.x+p.x*c+p.z*s,y:p.y,z:f.z-p.x*s+p.z*c}; }
  static inside(p,b,r=0){ let x=p.x,z=p.z; if(b.frame){ const f=b.frame,c=Math.cos(f.head),s=Math.sin(f.head),dx=p.x-f.x,dz=p.z-f.z; x=dx*c-dz*s; z=dx*s+dz*c; } return x>b.min.x-r&&x<b.max.x+r&&p.y>b.min.y-r&&p.y<b.max.y+r&&z>b.min.z-r&&z<b.max.z+r; }
  hit(a,b,r=0,accept=null){
    let best=null;
    const minX=Math.min(a.x,b.x)-r,maxX=Math.max(a.x,b.x)+r,minY=Math.min(a.y,b.y)-r,maxY=Math.max(a.y,b.y)+r,minZ=Math.min(a.z,b.z)-r,maxZ=Math.max(a.z,b.z)+r;
    const boxes=this.boxes;
    for(let bi=0;bi<boxes.length;bi++){ const box=boxes[bi];
      if(r===.025&&(box.label==='睡蓮葉'||box.label==='船體'))continue;   // 釣線不跟荷葉、自己的船殼做碰撞（船殼的箱子比船身粗很多，會讓垂在船邊的線每幀都去算繞路）
      // Reject distant static bounds before transforms, allocations and slab tests.
      if(!box.frame&&(box.min.x>maxX||box.max.x<minX||box.min.y>maxY||box.max.y<minY||box.min.z>maxZ||box.max.z<minZ))continue;
      if(accept&&!accept(box))continue;const aa=box.frame?FishingPhysics.local(a,box,HIT_A):a,bb=box.frame?FishingPhysics.local(b,box,HIT_B):b; let lo=0,hi=1,axis=0,sign=0,valid=true;
      // 三個軸展開寫，不用字串鍵與陣列：手機上這段每幀跑上萬次
      if(valid){ const d=bb.x-aa.x, mn=box.min.x-r, mx=box.max.x+r;
        if(d>-1e-10&&d<1e-10){ if(aa.x<=mn||aa.x>=mx) valid=false; }
        else { let t0=(mn-aa.x)/d,t1=(mx-aa.x)/d,sg=-1; if(t0>t1){const tt=t0;t0=t1;t1=tt;sg=1;} if(t0>=lo){lo=t0;axis=1;sign=sg;} if(t1<hi)hi=t1; if(lo>hi) valid=false; } }
      if(valid){ const d=bb.y-aa.y, mn=box.min.y-r, mx=box.max.y+r;
        if(d>-1e-10&&d<1e-10){ if(aa.y<=mn||aa.y>=mx) valid=false; }
        else { let t0=(mn-aa.y)/d,t1=(mx-aa.y)/d,sg=-1; if(t0>t1){const tt=t0;t0=t1;t1=tt;sg=1;} if(t0>=lo){lo=t0;axis=2;sign=sg;} if(t1<hi)hi=t1; if(lo>hi) valid=false; } }
      if(valid){ const d=bb.z-aa.z, mn=box.min.z-r, mx=box.max.z+r;
        if(d>-1e-10&&d<1e-10){ if(aa.z<=mn||aa.z>=mx) valid=false; }
        else { let t0=(mn-aa.z)/d,t1=(mx-aa.z)/d,sg=-1; if(t0>t1){const tt=t0;t0=t1;t1=tt;sg=1;} if(t0>=lo){lo=t0;axis=3;sign=sg;} if(t1<hi)hi=t1; if(lo>hi) valid=false; } }
      if(valid&&axis&&lo>=0&&lo<=1&&hi>1e-7&&(!best||lo<best.t)){ const k=AXES[axis-1]; best={t:lo,axis:k,sign,box,normal:(()=>{const v={x:0,y:0,z:0};v[k]=sign;if(!box.frame)return v;const c=Math.cos(box.frame.head),s=Math.sin(box.frame.head);return{x:v.x*c+v.z*s,y:v.y,z:-v.x*s+v.z*c};})()}; }
    } return best;
  }
  clear(p,r=0){ const boxes=this.boxes; for(let i=0;i<boxes.length;i++) if(FishingPhysics.inside(p,boxes[i],r)) return false; return true; }
  resolve(p,r=0){ let q={...p};
    for(let n=0;n<16;n++){ let b=null; const boxes=this.boxes; for(let i=0;i<boxes.length;i++) if(FishingPhysics.inside(q,boxes[i],r)){ b=boxes[i]; break; } if(!b) break;
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
    const nodes=[a,b], blockers=this.boxes.filter(o=>(r!==.025||(o.label!=='睡蓮葉'&&o.label!=='船體'))&&o.max.y>=Math.min(a.y,b.y)-.04&&o.min.y<=Math.max(a.y,b.y)+.04&&(o.frame||o.max.x>=Math.min(a.x,b.x)-8&&o.min.x<=Math.max(a.x,b.x)+8&&o.max.z>=Math.min(a.z,b.z)-8&&o.min.z<=Math.max(a.z,b.z)+8));
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
