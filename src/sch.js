/* ===== 水面魚群：湖與海偶爾會有一群小魚貼著水面游，背鰭與水紋露出水面、偶爾有一尾跳起；船靠太近會受驚散開往下鑽 ===== */
function createSchools(W,P,c){
'use strict';
const T=THREE, S=W.scene, rand=(a,b)=>a+Math.random()*(b-a);
// 小魚外型：細長紡錘身體＋叉狀尾鰭，頭朝 +x；用 InstancedMesh 一次畫整群
function fishGeo(){ const body=new T.SphereGeometry(.5,10,6); body.scale(1,.24,.13);
  const tail=new T.BufferGeometry(); tail.setAttribute('position',new T.Float32BufferAttribute([-.45,0,0,-.72,.16,0,-.62,0,0,-.45,0,0,-.62,0,0,-.72,-.16,0],3)); tail.computeVertexNormals();
  // 自己把身體和尾鰭的頂點接在一起（不依賴額外的合併工具）
  const b=body.toNonIndexed(), pa=b.attributes.position.array, ta=tail.attributes.position.array, all=new Float32Array(pa.length+ta.length); all.set(pa); all.set(ta,pa.length);
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(all,3)); g.computeVertexNormals(); return g; }
const GEO=fishGeo();
const MATS={lake:new T.MeshStandardMaterial({color:0x6d7a64,roughness:.35,metalness:.55,side:T.DoubleSide}),
  sea:new T.MeshStandardMaterial({color:0x5f88a8,roughness:.3,metalness:.65,side:T.DoubleSide})};
// 水面上的閃光：魚轉身時鱗片反光
const glintTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), rg=g.createRadialGradient(16,16,0,16,16,16); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(.3,'rgba(230,245,255,.5)'); rg.addColorStop(1,'rgba(230,245,255,0)'); g.fillStyle=rg; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
const N=36, schools=[], M=new T.Matrix4(), Q=new T.Quaternion(), V=new T.Vector3(), SC=new T.Vector3(), E=new T.Euler(0,0,0,'YXZ'), cam=new T.Vector3();
for(let s=0;s<3;s++){ const im=new T.InstancedMesh(GEO,MATS.lake,N); im.frustumCulled=false; im.visible=false; S.add(im);
  const gl=new T.Points(new T.BufferGeometry(),new T.PointsMaterial({map:glintTex,size:.35,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.9}));
  gl.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(6*3),3)); gl.frustumCulled=false; gl.visible=false; S.add(gl);
  const off=[]; for(let i=0;i<N;i++) off.push({x:rand(-1.6,1.6),z:rand(-.9,.9),d:rand(0,.12),ph:rand(0,6.28),sz:rand(.75,1.25)});
  schools.push({im,gl,off,on:false,t:0,life:0,x:0,z:0,h:0,sp:0,turn:0,fear:0,depth:0,next:rand(4,14)+s*6,jump:null,gt:0}); }
function waterY(x,z,t){ return (c.loc()==='sea'&&W.swell)?W.swell(x,z,t):0; }
function spawn(s){ W.camera.getWorldPosition(cam); const a=rand(0,6.28), d=rand(16,42), x=cam.x+Math.sin(a)*d, z=cam.z+Math.cos(a)*d;
  if(c.loc()!=='sea'&&W.shoreR&&Math.hypot(x,z)>W.shoreR(Math.atan2(x,-z))-6) return false;
  const sea=c.loc()==='sea'; s.im.material=sea?MATS.sea:MATS.lake; s.scale=sea?rand(.28,.42):rand(.16,.26);
  Object.assign(s,{on:true,t:0,life:rand(35,70),x,z,h:rand(0,6.28),sp:rand(.6,1.2),turn:0,fear:0,depth:0,jump:null,gt:rand(.5,2)}); s.im.visible=true; s.gl.visible=true; return true; }
function update(dt,t){ const ok=c.ok(); W.camera.getWorldPosition(cam);
  const p=c.period(), want=ok?(p==='dawn'||p==='dusk'?3:p==='day'?2:1):0;   // 清晨黃昏魚群最活躍，夜裡少
  let active=0; schools.forEach(s=>{ if(s.on) active++; });
  schools.forEach((s,si)=>{
    if(!s.on){ s.next-=dt; if(ok&&active<want&&s.next<=0){ if(spawn(s)) active++; s.next=rand(20,50); } return; }
    s.t+=dt; const dCam=Math.hypot(s.x-cam.x,s.z-cam.z);
    if(dCam<7&&s.fear<=0){ s.fear=4; s.h=Math.atan2(s.x-cam.x,s.z-cam.z); s.sp=3.2; if(P&&P.splash) P.splash(s.x,0,s.z,14,.6); }   // 船靠太近：受驚散開
    if(s.fear>0){ s.fear-=dt; s.depth=Math.min(1,s.depth+dt*.6); } else { s.sp+=(1-s.sp)*dt*.5; s.depth=Math.max(0,s.depth-dt*.2); }
    s.turn-=dt; if(s.turn<=0){ s.turn=rand(3,7); s.ht=s.h+rand(-1.2,1.2); } if(s.ht!==undefined) s.h+=(s.ht-s.h)*Math.min(1,dt*.6);
    s.x+=Math.sin(s.h)*s.sp*dt; s.z+=Math.cos(s.h)*s.sp*dt;
    const fade=Math.min(1,s.t/2)*Math.min(1,(s.life-s.t)/3)*(1-s.depth*.9);
    if(s.t>s.life||dCam>70||!ok){ s.on=false; s.im.visible=false; s.gl.visible=false; return; }
    const sc=s.scale, wy=waterY(s.x,s.z,t);
    for(let i=0;i<N;i++){ const o=s.off[i], wob=Math.sin(t*3.1+o.ph)*.22, lx=o.x+Math.sin(t*.7+o.ph)*.25, lz=o.z+Math.cos(t*.9+o.ph)*.2;
      const ch=Math.cos(s.h), sh=Math.sin(s.h), px=s.x+sh*lx+ch*lz, pz=s.z+ch*lx-sh*lz;
      V.set(px,wy-.04-o.d-s.depth*.9-(1-fade)*.4,pz); E.set(0,s.h-Math.PI/2+wob*.35,Math.sin(t*9+o.ph)*.12); Q.setFromEuler(E); SC.setScalar(sc*o.sz);
      M.compose(V,Q,SC); s.im.setMatrixAt(i,M); }
    s.im.instanceMatrix.needsUpdate=true;
    // 水面騷動：魚群上方不時冒出小水紋，偶爾一尾跳出水面
    if(Math.random()<dt*1.4*fade&&W.addRipple) W.addRipple(s.x+rand(-1.2,1.2),s.z+rand(-1.2,1.2),.25);
    if(!s.jump&&s.fear<=0&&Math.random()<dt*.18*fade) s.jump={t:0,i:Math.floor(rand(0,N))};
    if(s.jump){ const j=s.jump; j.t+=dt; const u=j.t/.55, o=s.off[j.i], px=s.x+Math.sin(s.h)*o.x, pz=s.z+Math.cos(s.h)*o.x;
      V.set(px,wy+Math.sin(Math.min(1,u)*Math.PI)*.45,pz); E.set(-.9+1.8*Math.min(1,u),s.h-Math.PI/2,0); Q.setFromEuler(E); SC.setScalar(sc*1.1); M.compose(V,Q,SC); s.im.setMatrixAt(j.i,M);
      if(u>=1){ if(P&&P.splash) P.splash(px,0,pz,6,.25); if(W.addRipple) W.addRipple(px,pz,.3); s.jump=null; } }
    // 鱗片反光
    s.gt-=dt; const ga=s.gl.geometry.attributes.position; if(s.gt<=0){ s.gt=rand(.3,1.2); for(let k=0;k<6;k++){ const o=s.off[Math.floor(rand(0,N))]; ga.setXYZ(k,s.x+Math.sin(s.h)*o.x+rand(-.3,.3),wy+.02,s.z+Math.cos(s.h)*o.x+rand(-.3,.3)); } ga.needsUpdate=true; }
    s.gl.material.opacity=.75*fade*(c.period()==='night'?.2:1)*(.6+.4*Math.sin(t*7+si));
  }); }
// 受驚：落水點附近的魚群往外逃、往下鑽；如果附近沒有魚群，就在落水點炸出一群逃竄的小魚（讓玩家看得到魚被嚇跑）
function scare(x,z,r){ let hit=0; schools.forEach(s=>{ if(!s.on) return; const d=Math.hypot(s.x-x,s.z-z); if(d<r){ s.fear=5; s.h=Math.atan2(s.x-x,s.z-z); s.sp=3.4; hit++; } });
  if(!hit){ const s=schools.find(q=>!q.on); if(s&&spawn(s)){ s.x=x; s.z=z; s.t=2.5; s.life=12; s.fear=5; s.h=Math.random()*6.28; s.sp=3.6; if(P&&P.splash) P.splash(x,0,z,18,.7); } } }
// 回來：警戒退了以後，一群魚從外側慢慢游回落水點附近
function comeBack(x,z){ const s=schools.find(q=>!q.on)||schools[0]; if(!spawn(s)) return false; const a=Math.random()*6.28, d=rand(9,13);
  s.x=x+Math.sin(a)*d; s.z=z+Math.cos(a)*d; s.h=Math.atan2(x-s.x,z-s.z); s.ht=s.h; s.turn=8; s.sp=.9; s.t=0; s.life=60; return true; }
// 測試用：在鏡頭正前方放一群
function force(d){ const s=schools.find(q=>!q.on)||schools[0]; W.camera.getWorldPosition(cam); const dir=new T.Vector3(); W.camera.getWorldDirection(dir); dir.y=0; dir.normalize();
  spawn(s); s.x=cam.x+dir.x*(d||12); s.z=cam.z+dir.z*(d||12); s.h=Math.atan2(dir.z,dir.x); s.t=3; }
return {update,force,scare,comeBack};
}
