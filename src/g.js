/* ===== 沉浸感更新 · 難度、拉扯型態、空氣與水面生態、鏡頭效果 ===== */
const DIFF={
 easy:{n:'休閒',line:1.25,win:1.25,stam:.95,slack:1.9,jit:.8,rew:.8},
 normal:{n:'標準',line:.86,win:.74,stam:1.55,slack:1.15,jit:1.25,rew:1},
 hard:{n:'硬派',line:.76,win:.62,stam:1.85,slack:.9,jit:1.5,rew:1.3},
 expert:{n:'專家',line:.65,win:.5,stam:2.15,slack:.72,jit:1.85,rew:1.6}};
const STY={
 nibbler:{n:'小幅亂竄',run:[.4,.9],rest:[.4,1],mul:1.4,lat:1.6,spd:1,ev:null,evP:0,d:0},
 runner:{n:'長距離狂奔',run:[2.2,4.5],rest:[1.2,2.4],mul:1.5,lat:.6,spd:1.5,ev:'long',evP:.5,d:.8},
 jumper:{n:'甩頭跳水',run:[.8,1.8],rest:[.8,1.8],mul:1.7,lat:1.1,spd:1,ev:'shake',evP:.35,d:.8},
 digger:{n:'往深處鑽',run:[1.5,3],rest:[1,2.5],mul:1.5,lat:.7,spd:.8,ev:'dive',evP:.4,d:1},
 brawler:{n:'短促爆衝',run:[.6,1.2],rest:[.6,1.4],mul:2.0,lat:1.2,spd:1.1,ev:'shake',evP:.2,d:.6}};
const SP_STY={bluegill:'nibbler',crappie:'nibbler',reba:'runner',perch:'brawler',lmbass:'jumper',channel:'digger',bowfin:'brawler',smbass:'jumper',flathead:'digger',gar:'runner',golden:'brawler',ghost:'jumper',mermaid:'runner',barra:'jumper',amber:'runner',grouper:'digger',ribbon:'nibbler',mahi:'jumper',tuna:'runner',marlin:'jumper',shark:'brawler',gwhite:'brawler',sail:'jumper',trout:'jumper',pike:'brawler',moonkoi:'digger',seaking:'digger',crucian:'nibbler',tilapia:'brawler',snakehead:'digger',peacock:'brawler',clarias:'digger',spgar:'runner',carp:'runner',silvercarp:'jumper',grasscarp:'runner',blackcarp:'digger',arapaima:'jumper',char:'runner',burbot:'digger',porgy:'brawler',parrot:'brawler',redbream:'brawler',emperor:'runner',cobia:'runner',wrasse:'digger',skipjack:'runner',sawara:'runner',yellowfin:'runner',eel:'digger',mekong:'digger',yperch:'nibbler',whitefish:'nibbler',laketrout:'digger',taimen:'runner',gt:'digger',swordfish:'runner',clownfish:'nibbler',bluetang:'brawler',blenny:'nibbler',angelfish:'nibbler',copperband:'nibbler',threadfin:'runner',seahorse:'nibbler',seabeast:'runner'};
// 依魚種取拉扯型態；新魚種忘了填也不會讓畫面報錯（預設小幅亂竄）
const styOf=id=>STY[SP_STY[id]]||STY.nibbler;

const SH3={};
SH3.airVS=`
attribute float aPh;
uniform float uTime;
uniform float uScale;
uniform float uSize;
varying float vB;
void main(){
  vec3 p = position;
  p.x += sin(uTime*0.7 + aPh*6.0)*0.25; p.y += sin(uTime*0.9 + aPh*9.0)*0.15; p.z += cos(uTime*0.6 + aPh*4.0)*0.25;
  vec4 mv = modelViewMatrix*vec4(p, 1.0);
  gl_PointSize = max(1.0, uSize*uScale/max(-mv.z, 0.1));
  gl_Position = projectionMatrix*mv;
  vB = pow(max(0.0, sin(uTime*(0.8 + aPh) + aPh*20.0)), 3.0);
}`;
SH3.airFS=`
uniform vec3 uCol;
uniform float uA;
uniform float uBlink;
varying float vB;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  float a = 1.0 - smoothstep(0.0, 0.5, d); a = a*a;
  float b = mix(1.0, vB, uBlink);
  gl_FragColor = vec4(uCol*b, a*uA*b);
}`;

function createAtmos(W,P,Snd,WL,ctx){
'use strict';
const T=THREE, S=W.scene;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, rand=(a,b)=>a+Math.random()*(b-a);
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function hashI(x,y){ let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function vn(x,y){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hashI(xi,yi), b=hashI(xi+1,yi), c=hashI(xi,yi+1), d=hashI(xi+1,yi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,o){ let s=0,a=.5,n=0; for(let i=0;i<o;i++){ s+=a*vn(x,y); n+=a; x=x*2.03+17.1; y=y*2.03+9.7; a*=.5; } return s/n; }
function dataTex(w,h,fn,srgb){ const d=new Uint8Array(w*h*4), o=[0,0,0,255];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ o[3]=255; fn(x/w,y/h,o); const i=(y*w+x)*4; for(let k=0;k<4;k++){ const v=o[k]; d[i+k]=v<0?0:v>255?255:v; } }
  const t=new T.DataTexture(d,w,h,T.RGBAFormat); t.magFilter=T.LinearFilter; t.minFilter=T.LinearMipmapLinearFilter; t.generateMipmaps=true; if(srgb!==false) t.encoding=T.sRGBEncoding; t.needsUpdate=true; return t; }
const fwd=(a,o)=>o.set(-Math.sin(a),0,-Math.cos(a));
const tv=new T.Vector3(), tv2=new T.Vector3(), cw=new T.Vector3();
const base=()=>ctx.base(), head=()=>ctx.head();

/* ---------- 水面薄霧 ---------- */
const mistTex=dataTex(128,64,(u,v,o)=>{ const n=fbm(u*4,v*3,4), e=Math.sin(Math.PI*u)*Math.sin(Math.PI*v); o[0]=o[1]=o[2]=255; o[3]=255*clamp((n-.32)*2.4,0,1)*Math.pow(Math.max(e,0),1.2); },false);
const wisps=[];
function placeWisp(m,init){ const b=base(), wd=WL.wind(); const a=head()+rand(-1.3,1.3), d=init?rand(8,60):rand(30,60);
  m.position.copy(fwd(a,tv).multiplyScalar(d)).add(b); if(!init){ m.position.x-=wd.x*20; m.position.z-=wd.z*20; } m.position.y=rand(.4,1.5); }
for(let i=0;i<16;i++){ const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:mistTex,transparent:true,depthWrite:false,fog:false,opacity:0}));
  m.scale.set(rand(10,22),rand(1.5,3.2),1); m.renderOrder=3; placeWisp(m,true); S.add(m); wisps.push(m); }

/* ---------- 螢火蟲、陽光下的微塵 ---------- */
function airPts(n,spread,mkPos,col,size,blink,additive){
  const pos=new Float32Array(n*3), ph=new Float32Array(n);
  for(let i=0;i<n;i++){ mkPos(tv); pos[i*3]=tv.x; pos[i*3+1]=tv.y; pos[i*3+2]=tv.z; ph[i]=Math.random(); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('aPh',new T.BufferAttribute(ph,1));
  const u={uTime:W.U.uTime,uScale:{value:800},uSize:{value:size},uCol:{value:new T.Color().copy(col)},uA:{value:0},uBlink:{value:blink}};
  const p=new T.Points(g,new T.ShaderMaterial({uniforms:u,vertexShader:SH3.airVS,fragmentShader:SH3.airFS,transparent:true,depthWrite:false,blending:additive?T.AdditiveBlending:T.NormalBlending}));
  p.frustumCulled=false; S.add(p); return {p,u};
}
const flies=airPts(150,0,o=>{ const a=rand(-1.4,1.4), d=rand(3,26); o.set(-Math.sin(a)*d,rand(.25,2.2),-Math.cos(a)*d); },new T.Color(1.6,2.4,.5),.07,1,true);
const motes=airPts(240,0,o=>{ o.set(rand(-6,6),rand(-2.2,2.5),rand(-7,-1)); },new T.Color(1,.95,.85),.014,.35,false);

/* ---------- 蜻蜓 ---------- */
const dfMat=new T.MeshStandardMaterial({color:0x1f6f8a,metalness:.6,roughness:.3});
const wingMat=new T.MeshBasicMaterial({color:0xe8f0f4,transparent:true,opacity:.3,side:T.DoubleSide,depthWrite:false});
const wingG=new T.PlaneGeometry(.055,.012); wingG.rotateX(-Math.PI/2); wingG.translate(.0275,0,0);
const dflies=[];
for(let k=0;k<3;k++){ const g=new T.Group(); const b=new T.Mesh(new T.CylinderGeometry(.0035,.0022,.075,6),dfMat); b.rotation.x=Math.PI/2; g.add(b);
  const h=new T.Mesh(new T.SphereGeometry(.007,8,6),dfMat); h.position.z=.04; g.add(h); const ws=[];
  for(const zz of [.016,.002]) for(const s of [1,-1]){ const w=new T.Mesh(wingG,wingMat); w.position.set(0,.004,zz); w.scale.x=s; g.add(w); ws.push([w,s]); }
  g.scale.setScalar(1.7); g.visible=false; g.userData={ws,tgt:new T.Vector3(),hold:0}; S.add(g); dflies.push(g); }

/* ---------- 漂浮落葉 ---------- */
const leafTex=dataTex(32,32,(u,v,o)=>{ const x=u*2-1, y=v*2-1, e=x*x+(y*1.8)*(y*1.8); const n=fbm(u*6,v*6,2), t=hashI(Math.floor(u*3),7)*.0;
  o[0]=150+60*n; o[1]=96+40*n; o[2]=40; o[3]=e<1&&Math.abs(y)>.02?255:0; });
const leafMat=new T.MeshStandardMaterial({map:leafTex,alphaTest:.5,side:T.DoubleSide,roughness:.7});
const leafG=new T.PlaneGeometry(.09,.09); leafG.rotateX(-Math.PI/2);
const NL=30, leaves=new T.InstancedMesh(leafG,leafMat,NL), lf=[];
const m4=new T.Matrix4(), q4=new T.Quaternion(), eu=new T.Euler(), sv=new T.Vector3(1,1,1);
function placeLeaf(L,init){ const b=base(), wd=WL.wind(), a=head()+rand(-1.2,1.2), d=init?rand(3,30):rand(18,32);
  L.x=b.x-Math.sin(a)*d-(init?0:wd.x*10); L.z=b.z-Math.cos(a)*d-(init?0:wd.z*10); L.r=rand(0,6.28); L.sp=rand(-.3,.3); L.c=rand(.6,1.1); }
for(let i=0;i<NL;i++){ const L={}; placeLeaf(L,true); lf.push(L); leaves.setColorAt(i,new T.Color(L.c,L.c*rand(.7,1),L.c*rand(.5,.9))); }
leaves.frustumCulled=false; S.add(leaves);

/* ---------- 螢幕雨滴、太陽眩光 ---------- */
const dc=document.getElementById('drops'), dx=dc.getContext('2d'); let drops=[], dW=1, dH=1, dOn=false;
function rsz(){ dW=dc.width=Math.max(1,Math.round(innerWidth*.6)); dH=dc.height=Math.max(1,Math.round(innerHeight*.6)); }
rsz(); window.addEventListener('resize',rsz);
const fl=document.getElementById('flare'), fg=fl.querySelector('.fg'), ghs=[...fl.querySelectorAll('.gh')];
let flOp=-1;

/* ---------- 細碎漣漪圈（不占用主漣漪槽） ---------- */
const ringTex=dataTex(64,64,(u,v,o)=>{ const d=Math.hypot(u-.5,v-.5)*2, a=Math.exp(-Math.pow((d-.82)/.07,2))+.35*Math.exp(-Math.pow((d-.6)/.06,2)); o[0]=o[1]=o[2]=255; o[3]=d<1?255*clamp(a,0,1):0; },false);
const ringGeo=new T.PlaneGeometry(1,1); ringGeo.rotateX(-Math.PI/2);
const rings=[]; let ringI=0;
for(let i=0;i<28;i++){ const m=new T.Mesh(ringGeo,new T.MeshBasicMaterial({map:ringTex,transparent:true,depthWrite:false,opacity:0})); m.visible=false; m.renderOrder=2; S.add(m); rings.push({m,t:9,s:1}); }
function ring(x,z,size){ const r=rings[ringI]; ringI=(ringI+1)%rings.length; r.t=0; r.s=size; r.m.position.set(x,.016,z); r.m.visible=true; }
/* ---------- 水黽 ---------- */
const stMat=new T.MeshStandardMaterial({color:0x1a1a16,roughness:.5});
const legG=new T.CylinderGeometry(.0009,.0009,.06,3); legG.rotateZ(Math.PI/2); legG.translate(.03,0,0);
const striders=[];
for(let k=0;k<7;k++){ const g=new T.Group(); const bd=new T.Mesh(new T.SphereGeometry(1,8,6),stMat); bd.scale.set(.004,.003,.013); g.add(bd);
  [-.55,0,.55].forEach((a,j)=>{ for(const s of [1,-1]){ const l=new T.Mesh(legG,stMat); l.position.z=(1-j)*.006; l.rotation.y=s>0?a:Math.PI-a; g.add(l); } });
  g.scale.setScalar(1.6); g.visible=false; g.userData={vx:0,vz:0,t:0}; S.add(g); striders.push(g); }
/* ---------- 跳出水面的魚 ---------- */
const jumpers={}; let jf=null;
function startJump(x,z){ const ids=['bluegill','crappie','reba','lmbass'], id=ids[Math.floor(Math.random()*ids.length)];
  if(!jumpers[id]){ const src=P.getFish(P.SPECIES.find(s=>s.id===id)); const g=src.group.clone(); g.traverse(o=>{ o.frustumCulled=false; }); S.add(g); jumpers[id]={g,uni:src.uni}; }
  const J=jumpers[id]; J.g.visible=true; J.g.scale.setScalar(rand(.18,.32)); jf={J,x,z,t:0,dur:rand(.5,.7),h:rand(.25,.45),a:rand(0,6.28)};
  P.splash(x,0,z,10,.5); W.addRipple(x,z,.25); }
/* ---------- 夜裡偶爾露出的美人魚尾巴 ---------- */
const tailM=new T.MeshPhysicalMaterial({color:0x2fa8a0,metalness:.6,roughness:.3,clearcoat:.8,emissive:0x0a4848,emissiveIntensity:.5,side:T.DoubleSide});
const fluke=new T.Group(); fluke.visible=false; S.add(fluke);
{ const sh=new T.Shape(); sh.moveTo(0,.06); sh.quadraticCurveTo(-.25,.15,-.5,.42); sh.quadraticCurveTo(-.38,.12,-.32,0); sh.quadraticCurveTo(-.38,-.12,-.5,-.42); sh.quadraticCurveTo(-.25,-.15,0,-.06); sh.lineTo(0,.06);
  const f=new T.Mesh(new T.ShapeGeometry(sh,12),tailM); f.rotation.z=-Math.PI/2; f.position.y=.6; fluke.add(f);
  const shaft=new T.Mesh(new T.CylinderGeometry(.05,.09,.62,14),tailM); shaft.position.y=.3; fluke.add(shaft); fluke.scale.setScalar(1.2); }
/* 3D 美人魚：上下顛倒，只讓魚尾那一截露出水面（模型依玩家設定圖生成） */
if(T.GLTFLoader) new T.GLTFLoader().load('models/mermaid3d.glb',gl=>{ const o=gl.scene;
  o.traverse(x=>{ if(x.isMesh){ const mp=x.material.map; if(mp){ mp.generateMipmaps=false; mp.minFilter=T.LinearFilter; } x.material=new T.MeshStandardMaterial({map:mp||null,vertexColors:!mp&&!!x.geometry.attributes.color,roughness:.4,metalness:.1,emissive:new T.Color(0x3a6f8a),emissiveIntensity:.25}); x.frustumCulled=false; } });
  const w=new T.Group(); w.add(o); o.updateMatrixWorld(true); let b=new T.Box3().setFromObject(o); o.scale.setScalar(1.6/Math.max(b.getSize(new T.Vector3()).y,1e-6));
  w.rotation.x=Math.PI; w.rotation.z=.18; w.updateMatrixWorld(true); b=new T.Box3().setFromObject(w); const c=b.getCenter(new T.Vector3());
  w.position.set(-c.x,(.85/1.2)-b.max.y,-c.z);
  fluke.children.forEach(ch=>{ ch.visible=false; }); fluke.add(w); });
let tease=null, teaseT=rand(60,140), teaseN=0;
let riseT=rand(3,8), t0=0;
function update(dt,t){
  const uw=ctx.underwater(), day=W.info.day, light=W.info.light, wd=WL.wind(), wx=WL.wx(), b=base(), per=ctx.period();
  W.camera.getWorldPosition(cw);
  // 薄霧
  const mist=W.U.uMist.value, fc=W.U.uFogCol.value;
  for(const m of wisps){ m.position.x+=wd.x*(.4+wd.s*3)*dt; m.position.z+=wd.z*(.4+wd.s*3)*dt;
    const d=Math.hypot(m.position.x-cw.x,m.position.z-cw.z); if(d>75||d<4) placeWisp(m,false);
    m.rotation.y=Math.atan2(cw.x-m.position.x,cw.z-m.position.z);
    m.material.opacity=clamp(mist*.42+(window.__MIST?window.__MIST.level()*.35:0),0,.62)*sstep(4,12,d)*(1-sstep(55,75,d));
    m.material.color.setRGB(fc.x*1.25+.02,fc.y*1.25+.02,fc.z*1.25+.02); }
  // 螢火蟲：黃昏後、無雨
  flies.p.position.copy(b); flies.p.rotation.y=head();
  flies.u.uA.value=(1-sstep(.12,.4,day))*(1-clamp(wx.r*2,0,1))*(W.isSea()?0:.9);
  // 微塵：晴天白天，跟著鏡頭
  motes.p.position.copy(cw); motes.p.rotation.y=W.player.rotation.y;
  motes.u.uA.value=clamp(day*1.2-.3,0,1)*(1-wx.c*.8)*(1-wx.r)*.55; motes.u.uCol.value.setRGB(light,light*.95,light*.85);
  const sc=window.innerHeight*W.getPR()/(2*Math.tan(W.camera.fov*Math.PI/360)); flies.u.uScale.value=sc; motes.u.uScale.value=sc;
  // 蜻蜓
  const dfOn=day>.55&&wx.r<.2&&wd.s<.6&&!W.isSea();
  for(const g of dflies){ if(!dfOn){ g.visible=false; continue; } const u=g.userData;
    if(!g.visible){ g.visible=true; fwd(head()+rand(-.6,.6),tv).multiplyScalar(rand(3,9)).add(b); g.position.set(tv.x,rand(.3,1.3),tv.z); u.hold=0; }
    u.hold-=dt; if(u.hold<=0){ fwd(head()+rand(-.7,.7),tv).multiplyScalar(rand(2.5,9)).add(b); u.tgt.set(tv.x,rand(.25,1.4),tv.z); u.hold=rand(.8,2.6); }
    tv.subVectors(u.tgt,g.position); const d=tv.length();
    if(d>.05){ g.position.addScaledVector(tv.normalize(),Math.min(d,5*dt)); g.lookAt(u.tgt); }
    else g.position.y+=Math.sin(t*9+g.id)*.002;
    for(const [w,s] of u.ws) w.rotation.z=s*Math.sin(t*95+s)*.5; }
  // 魚在水面覓食的漣漪
  riseT-=dt; if(riseT<=0){ riseT=(per==='dawn'||per==='dusk'?rand(3,8):rand(6,15))*(1+wx.r);
    if(!uw){ const a=head()+rand(-1,1), d=rand(8,40); fwd(a,tv).multiplyScalar(d).add(b);
      if(Math.hypot(tv.x,tv.z)<W.shoreR(Math.atan2(tv.x,-tv.z))-4){ if(!jf&&d<30&&day>.15&&Math.random()<.4) startJump(tv.x,tv.z); else { W.addRipple(tv.x,tv.z,.32); P.splash(tv.x,0,tv.z,5,.35); if(d<25) Snd.plip(); } } } }
  // 漣漪圈
  for(const r of rings){ if(r.t>=2.2){ r.m.visible=false; continue; } r.t+=dt; const k=r.t/2.2; r.m.scale.setScalar(r.s*(.15+k*1.6)); r.m.material.opacity=(1-k)*.35*clamp(light,.15,1); }
  // 水黽
  const stOn=day>.45&&wx.r<.15&&wd.s<.5&&!uw&&!W.isSea();
  for(const g of striders){ const u=g.userData; if(!stOn){ g.visible=false; continue; }
    if(!g.visible){ g.visible=true; fwd(head()+rand(-.8,.8),tv).multiplyScalar(rand(2.5,8)).add(b); g.position.set(tv.x,0,tv.z); u.t=rand(0,1); }
    u.t-=dt; if(u.t<=0){ u.t=rand(.5,1.8); const a=rand(0,6.28), s=rand(.4,.9); u.vx=Math.cos(a)*s; u.vz=Math.sin(a)*s; g.rotation.y=Math.atan2(u.vx,u.vz); ring(g.position.x,g.position.z,.14); }
    g.position.x+=u.vx*dt; g.position.z+=u.vz*dt; u.vx*=1-dt*2.2; u.vz*=1-dt*2.2; g.position.y=W.swell(g.position.x,g.position.z,t)+.002;
    if(Math.hypot(g.position.x-b.x,g.position.z-b.z)>11) g.visible=false; }
  // 跳魚
  if(jf){ jf.t+=dt; const s=jf.t/jf.dur, g=jf.J.g; g.position.set(jf.x+Math.cos(jf.a)*.5*s,4*jf.h*s*(1-s)-.05,jf.z+Math.sin(jf.a)*.5*s); g.rotation.set(0,-jf.a,(1-2*s)*1.1);
    jf.J.uni.uAmp.value=.12; jf.J.uni.uSwim.value+=dt*20;
    if(s>=1){ g.visible=false; P.splash(g.position.x,0,g.position.z,14,.6); W.addRipple(g.position.x,g.position.z,.3); Snd.plip(); jf=null; } }
  // 美人魚尾巴
  // 月潮回來後美人魚更常出現
  if(!tease){ teaseT-=dt; if(teaseT<=0&&!(window.__ENDON&&window.__ENDON())){ const ended=window.__STORY&&window.__STORY.done('c7'); teaseT=ended?rand(30,70):rand(60,140); if(day<.3&&!uw&&Math.random()<(ended?.7:.45)){ fwd(head()+rand(-.6,.6),tv).multiplyScalar(rand(18,40)).add(b);
      if(Math.hypot(tv.x,tv.z)<W.shoreR(Math.atan2(tv.x,-tv.z))-5){ tease={t:0,x:tv.x,z:tv.z,ry:rand(0,6.28),hit:false}; fluke.visible=true; } } } }
  else { tease.t+=dt; const tt=tease.t; let y,rx;
    if(tt<1.2){ const e=sstep(0,1,tt/1.2); y=-.9+1.2*e; rx=.5-.7*e; } else if(tt<1.8){ y=.3+Math.sin((tt-1.2)*8)*.03; rx=-.2+Math.sin((tt-1.2)*6)*.08; } else { const e=sstep(0,1,(tt-1.8)/.4); y=.3-1.3*e; rx=-.2+1.5*e; }
    fluke.position.set(tease.x,y,tease.z); fluke.rotation.set(rx,tease.ry,0);
    if(tt>2.0&&!tease.hit){ tease.hit=true; P.splash(tease.x,0,tease.z,60,1.6); W.addRipple(tease.x,tease.z,1.1); ring(tease.x,tease.z,2.5); Snd.splash(1.4); teaseN++;
      if(ctx.toast) ctx.toast(teaseN===1?'……剛剛那是什麼的尾巴？':'又是那條發光的尾巴……傳說也許是真的','warn',2600); }
    if(tt>2.4){ fluke.visible=false; tease=null; } }
  // 落葉
  for(let i=0;i<NL;i++){ const L=lf[i]; L.x+=(wd.x*(.05+wd.s*.4)+Math.sin(t*.3+i)*.01)*dt; L.z+=(wd.z*(.05+wd.s*.4)+Math.cos(t*.27+i)*.01)*dt; L.r+=L.sp*dt*(.3+wd.s);
    const d=Math.hypot(L.x-b.x,L.z-b.z); if(d>36||Math.hypot(L.x,L.z)>W.shoreR(Math.atan2(L.x,-L.z))-2) placeLeaf(L,false);
    q4.setFromEuler(eu.set(Math.sin(t*1.3+i)*.06,L.r,Math.cos(t*1.1+i)*.06)); tv2.set(L.x,W.swell(L.x,L.z,t)+.006,L.z); m4.compose(tv2,q4,sv); leaves.setMatrixAt(i,m4); }
  leaves.instanceMatrix.needsUpdate=true; leaves.visible=!W.isSea();
  // 環境音
  Snd.setAmb({wind:wd.s, lap:ctx.spot()===0?.7:.35, cic:(per==='day'&&wx.r<.2&&wx.c<.7)?1:0, crk:(per==='night'||per==='dusk')&&wx.r<.3?1:0});
  // 螢幕雨滴
  const rk=(uw||(window.__G&&window.__G.loc==='ice'))?0:W.U.uRain.value;
  if(rk>.05){ if(!dOn){ dOn=true; dc.style.opacity='1'; }
    if(Math.random()<dt*rk*7&&drops.length<42) drops.push({x:Math.random()*dW,y:Math.random()*dH*.9,r:rand(3,9)*dW/600,v:0,life:rand(4,10),sl:Math.random()<.35});
    dx.clearRect(0,0,dW,dH);
    for(const d of drops){ d.life-=dt; if(d.sl){ d.v+=dt*rand(0,40); d.y+=d.v*dt; }
      dx.globalAlpha=clamp(d.life,0,1);
      if(d.sl&&d.v>4){ dx.strokeStyle='rgba(220,230,235,.12)'; dx.lineWidth=d.r*.5; dx.beginPath(); dx.moveTo(d.x,d.y-d.r); dx.lineTo(d.x,d.y-d.r-Math.min(60,d.v*.8)); dx.stroke(); }
      const g=dx.createRadialGradient(d.x-d.r*.3,d.y-d.r*.35,d.r*.1,d.x,d.y,d.r); g.addColorStop(0,'rgba(255,255,255,.3)'); g.addColorStop(.55,'rgba(200,215,220,.07)'); g.addColorStop(1,'rgba(0,0,0,.24)');
      dx.fillStyle=g; dx.beginPath(); dx.ellipse(d.x,d.y,d.r,d.r*(d.sl?1.25:1),0,0,6.283); dx.fill(); }
    dx.globalAlpha=1; drops=drops.filter(d=>d.life>0&&d.y<dH+20);
  } else if(dOn){ dOn=false; dc.style.opacity='0'; setTimeout(()=>{ if(!dOn){ drops=[]; dx.clearRect(0,0,dW,dH); } },700); }
  // 太陽眩光
  let op=0;
  if(!uw){ tv.copy(cw).addScaledVector(W.U.uSunDisk.value,500).project(W.camera);
    if(tv.z<1&&Math.abs(tv.x)<1.3&&Math.abs(tv.y)<1.3){ const s=W.U.uSunCol.value, k=clamp((s.x+s.y+s.z)/3/2.2,0,1)*W.U.uSunVis.value;
      op=k*(1-sstep(.85,1.3,Math.max(Math.abs(tv.x),Math.abs(tv.y))));
      if(op>.01){ const X=(tv.x*.5+.5)*innerWidth, Y=(-tv.y*.5+.5)*innerHeight, cx=innerWidth/2, cy=innerHeight/2;
        fg.style.transform=`translate(${X.toFixed(0)}px,${Y.toFixed(0)}px)`;
        [.45,.8,1.25].forEach((f,i)=>{ ghs[i].style.transform=`translate(${(cx+(cx-X)*f).toFixed(0)}px,${(cy+(cy-Y)*f).toFixed(0)}px)`; }); } } }
  op=Math.round(op*50)/50; if(op!==flOp){ flOp=op; fl.style.opacity=op; }
}
return {update,ring};
}
