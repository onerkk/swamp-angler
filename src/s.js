/* ===== 晨霧：貼著水面的低霧層，迎光處被照亮 ===== */
const SH6={};
SH6.vs=`varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
SH6.fs=`
uniform float uTime, uK; uniform vec3 uFog, uSunDir, uSunCol; uniform vec2 uWind; varying vec3 vW;
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
void main(){
  vec2 p=vW.xz*0.045 + uWind*uTime*0.02;
  float n=n2(p)*0.55 + n2(p*2.3 + 7.0 - uWind*uTime*0.015)*0.3 + n2(p*5.1 + 3.0)*0.15;
  vec3 V=vW - cameraPosition; float d=length(V); V/=d;
  float graze=1.0 - smoothstep(0.05, 0.5, abs(V.y));            // 平視水面時最濃
  float a=uK*smoothstep(0.32, 0.85, n)*graze*smoothstep(3.0, 14.0, d)*(1.0 - smoothstep(90.0, 120.0, d));
  float fwd=pow(max(dot(V, normalize(uSunDir)), 0.0), 6.0);      // 迎著太陽：前向散射
  vec3 col=mix(uFog*1.15 + 0.03, uSunCol*0.9 + uFog*0.4, fwd*0.8);
  gl_FragColor=vec4(col, a*0.7);
}`;
function createMorningMist(W,c){
'use strict';
const T=THREE, U={uTime:W.U.uTime,uK:{value:0},uFog:W.U.uFogCol,uSunDir:W.U.uSunDir,uSunCol:W.U.uSunCol||{value:new T.Vector3(1,.85,.6)},uWind:{value:new T.Vector2(1,0)}};
const layers=[]; for(const y of [.35,.9]){ const m=new T.Mesh(new T.PlaneGeometry(240,240).rotateX(-Math.PI/2),new T.ShaderMaterial({uniforms:U,vertexShader:SH6.vs,fragmentShader:SH6.fs,transparent:true,depthWrite:false,side:T.DoubleSide,fog:false}));
  m.position.y=y; m.renderOrder=4; m.frustumCulled=false; W.scene.add(m); layers.push(m); if(W.reflHide) W.reflHide(m); }
const cam=new T.Vector3(); let k=0, wet=0;
/* 晨光光束：沿陽光方向斜射的細長光帶，繞光軸面向鏡頭（軸向看板） */
const sc=document.createElement('canvas'); sc.width=64; sc.height=256; { const x=sc.getContext('2d'), im=x.createImageData(64,256);
  const subs=[]; for(let k=0;k<5;k++) subs.push({c:(Math.random()-.5)*.7,w:.03+Math.random()*.07,b:.45+Math.random()*.55});   // 光帶內數條細光線，中間有暗縫
  for(let j=0;j<256;j++) for(let i=0;i<64;i++){ const u=(i+.5)/64-.5, v=j/255; let st=0; for(const q of subs) st=Math.max(st,q.b*Math.exp(-Math.pow((u-q.c)/q.w,2)));
    const a=(.25*Math.exp(-u*u*28)+.75*st)*Math.pow(Math.max(0,Math.sin(Math.PI*v)),.8)*(.35+.65*(1-v)); const o=(j*64+i)*4; im.data[o]=255; im.data[o+1]=240; im.data[o+2]=210; im.data[o+3]=Math.round(255*Math.min(1,a)); }
  x.putImageData(im,0,0); }
const sTex=new T.CanvasTexture(sc), shafts=[];
for(let i=0;i<10;i++){ const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:sTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false,opacity:0,color:0xffe2b8}));
  m.matrixAutoUpdate=false; m.frustumCulled=false; m.renderOrder=5; m.visible=false; W.scene.add(m); if(W.reflHide) W.reflHide(m);
  shafts.push({m,occ:1,occT:1,off:(i/9-.5)*0.9+(Math.random()-.5)*.12,dist:16+Math.random()*30,w:2.2+Math.random()*3.6,len:24+Math.random()*14,ph:Math.random()*6.28}); }
/* 遮擋：每 1.5 秒對每道光束的左中右三點往太陽方向打射線，被樹、枯木、岩石、遊艇擋住就變暗 */
const rc=new T.Raycaster(); rc.far=70; const ro=new T.Vector3(); let occClock=0;
function occluders(){ const list=[]; W.scene.children.forEach(o=>{ if(!o.visible) return; if((o.userData&&o.userData.lake)||o.userData.occ) list.push(o); }); if(c.extraOcc) c.extraOcc().forEach(o=>o&&o.visible&&list.push(o)); return list; }
function updOcc(sd2,rt2){ const occ=occluders(); if(!occ.length){ shafts.forEach(s2=>s2.occT=1); return; }
  for(const s2 of shafts){ let hit=0; const b=s2.base||ro;
    for(const k of [-.35,0,.35]){ ro.copy(b).addScaledVector(rt2,k*s2.w).setY(.3); rc.set(ro,sd2); if(rc.intersectObjects(occ,true).length) hit++; }
    s2.occT=1-.8*(hit/3); } }
const sd=new T.Vector3(), hs=new T.Vector3(), ctr=new T.Vector3(), vd=new T.Vector3(), rt=new T.Vector3(), nm=new T.Vector3(), base=new T.Vector3();
function updShafts(dt){ const sun=W.U.uSunDir.value, vis=(W.U.uSunVis?W.U.uSunVis.value:1)*(1-.9*Math.min(1,(W.U.uCloud?W.U.uCloud.value:0)));
  const K=Math.min(1,k*1.6)*vis*(sun.y>-.02?1:0); hs.set(sun.x,0,sun.z); const hl=hs.length(); if(hl<1e-3||K<.01){ shafts.forEach(s=>s.m.visible=false); return; } hs.divideScalar(hl);
  const el=Math.max(.42,Math.atan2(sun.y,hl)); sd.set(hs.x*Math.cos(el),Math.sin(el),hs.z*Math.cos(el));   // 太低時抬高光束角度，避免躺平
  W.camera.getWorldDirection(vd); const face=Math.max(0,vd.x*hs.x+vd.z*hs.z), tt=performance.now()*.001;
  occClock-=dt; if(occClock<=0){ occClock=1.5; rt.set(-hs.z,0,hs.x); updOcc(sd,rt); }
  for(const s of shafts){ const a=Math.atan2(hs.x,hs.z)+s.off; base.set(cam.x+Math.sin(a)*s.dist,0,cam.z+Math.cos(a)*s.dist); s.base=(s.base||new T.Vector3()).copy(base); s.occ+=(s.occT-s.occ)*Math.min(1,dt*1.5);
    ctr.copy(base).addScaledVector(sd,s.len*.5); vd.subVectors(cam,ctr).normalize();
    rt.crossVectors(sd,vd).normalize(); nm.crossVectors(rt,sd).normalize();
    s.m.matrix.makeBasis(rt.clone().multiplyScalar(s.w),sd.clone().multiplyScalar(s.len),nm).setPosition(ctr); s.m.matrixWorld.copy(s.m.matrix);
    s.m.material.opacity=Math.min(.9,K*(.25+.7*face)*(.55+.45*Math.sin(tt*.35+s.ph))*2.0*s.occ); s.m.visible=true; } }
function mistK(){ const h=((c.hour()%24)+24)%24; const dawn=Math.exp(-Math.pow((h-6.5)/1.1,2)), dusk=.35*Math.exp(-Math.pow((h-19.2)/.9,2)); return Math.max(dawn,dusk); }
function update(dt){ W.camera.getWorldPosition(cam); const wx=c.wx?c.wx():{r:0};
  wet=Math.max(wet-dt/240,(wx.r||0)>.3?1:0);                          // 雨後幾分鐘內的早晨更濃
  const target=mistK()*(.75+.5*wet)*(c.sea()?.5:1)*(c.underwater()?0:1);
  k+=(target-k)*Math.min(1,dt*.5); U.uK.value=k;
  const wd=c.wind?c.wind():null; if(wd) U.uWind.value.set(wd.x||1,wd.z||0);
  const q=window.__GFX||'high';
  for(const m of layers){ m.visible=k>.01&&q!=='low'; m.position.x=cam.x; m.position.z=cam.z; }
  if(q==='high') updShafts(dt); else shafts.forEach(s2=>s2.m.visible=false); }
return {update,level:()=>k};
}
