/* ===== 出海與美景：遊艇、海豚、鯨魚、鯊魚、飛魚、彩虹、鳥群、流星雨、黃金時刻 ===== */
const SCENES={rainbow:'彩虹',flock:'歸鳥成群',meteor:'流星雨',golden:'黃金時刻',dolphin:'海豚群',whale:'鯨魚',shark:'鯊魚巡游',flyfish:'飛魚掠海'};
function createSea(W,P,AT,c){
'use strict';
const T=THREE, S=W.scene, G=c.G, $=id=>document.getElementById(id);
const clamp=(x,a,b)=>x<a?a:x>b?b:x, rand=(a,b)=>a+Math.random()*(b-a), sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const tv=new T.Vector3(), tv2=new T.Vector3(), tv3=new T.Vector3(), cw=new T.Vector3();
const fwd=(a,o)=>o.set(-Math.sin(a),0,-Math.cos(a));
const base=()=>G.base;
function gradTex(top,bot,mid){ const d=new Uint8Array(4*64); for(let i=0;i<64;i++){ const t=i/63, k=sstep(mid-.12,mid+.12,t); for(let j=0;j<3;j++) d[i*4+j]=bot[j]+(top[j]-bot[j])*k; d[i*4+3]=255; }
  const t=new T.DataTexture(d,1,64,T.RGBAFormat); t.encoding=T.sRGBEncoding; t.magFilter=T.LinearFilter; t.needsUpdate=true; return t; }

/* ---------- 遊艇（船頭甲板、柚木地板、不鏽鋼欄杆） ---------- */
const yacht=new T.Group(); yacht.visible=false; S.add(yacht);
{ const out=[[-1.6,2],[-1.6,-2],[-1.15,-4.5],[0,-6.3],[1.15,-4.5],[1.6,-2],[1.6,2]];
  const shp=new T.Shape(); out.forEach((p,i)=>i?shp.lineTo(p[0],-p[1]):shp.moveTo(p[0],-p[1]));
  const white=new T.MeshPhysicalMaterial({color:0xf4f4f0,roughness:.25,clearcoat:.9,clearcoatRoughness:.1});
  const hull=new T.Mesh(new T.ExtrudeGeometry(shp,{depth:1.6,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:3}),white); hull.rotation.x=-Math.PI/2; hull.position.y=0; yacht.add(hull);
  const stripe=new T.Mesh(new T.ExtrudeGeometry(shp,{depth:.12,bevelEnabled:false}),new T.MeshPhysicalMaterial({color:0x1d3f7a,roughness:.3,clearcoat:.8}));
  stripe.rotation.x=-Math.PI/2; stripe.position.y=1.2; stripe.scale.set(1.012,1.012,1); yacht.add(stripe);
  const teakT=new T.TextureLoader().load('dock_diff.jpg'); teakT.encoding=T.sRGBEncoding; teakT.wrapS=teakT.wrapT=T.RepeatWrapping; teakT.repeat.set(2,4);
  const inner=new T.Shape(); out.forEach((p,i)=>{ const x=p[0]*.9, z=-(p[1]*.94); i?inner.lineTo(x,z):inner.moveTo(x,z); });
  const deck=new T.Mesh(new T.ShapeGeometry(inner),new T.MeshStandardMaterial({map:teakT,color:0xc89a6a,roughness:.7})); deck.rotation.x=-Math.PI/2; deck.position.y=1.69; yacht.add(deck);
  const steel=new T.MeshStandardMaterial({color:0xe6e9ec,metalness:1,roughness:.15});
  const rp=out.slice(0,7).map(p=>new T.Vector3(p[0]*.93,2.45,p[1]*.95));
  yacht.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rp),80,.025,8),steel));
  rp.forEach((p,i)=>{ if(i===3) return; const s=new T.Mesh(new T.CylinderGeometry(.018,.018,.78,8),steel); s.position.set(p.x,2.07,p.z); yacht.add(s); });
  yacht.traverse(o=>{ o.frustumCulled=false; }); }

/* ---------- 船體避讓：所有靠近遊艇的東西都要在船殼外 ---------- */
let HX=1.6, HZ0=-6.3, HZ1=2;
function setHull(x,z0,z1){ HX=x; HZ0=z0; HZ1=z1; }
function hullLocal(p){ const b=base(), h=G.head, cs=Math.cos(h), sn=Math.sin(h), dx=p.x-b.x, dz=p.z-b.z; return [dx*cs-dz*sn, dx*sn+dz*cs, cs, sn, b]; }
function hullClear(p,m){ if(!yacht.visible) return false; const [lx,lz,cs,sn,b]=hullLocal(p), x0=-HX-m, x1=HX+m, z0=HZ0-m, z1=HZ1+m;
  if(!(lx>x0&&lx<x1&&lz>z0&&lz<z1)) return false;
  const dl=[lx-x0,x1-lx,lz-z0,z1-lz], k=dl.indexOf(Math.min(...dl)); let nx=lx, nz=lz;
  if(k===0) nx=x0; else if(k===1) nx=x1; else if(k===2) nz=z0; else nz=z1;
  p.x=b.x+nx*cs+nz*sn; p.z=b.z-nx*sn+nz*cs; return true; }
function hullOut(p,o){ const b=base(); if(!yacht.visible){ o.set(p.x-b.x,0,p.z-b.z); if(o.lengthSq()<1e-4) o.set(0,0,-1); return o.normalize(); }
  const [lx,lz,cs,sn]=hullLocal(p); let vx=lx-clamp(lx,-HX,HX), vz=lz-clamp(lz,HZ0,HZ1);
  if(vx*vx+vz*vz<1e-6){ vx=lx<0?-1:1; vz=0; } const l=Math.hypot(vx,vz); vx/=l; vz/=l; return o.set(vx*cs+vz*sn,0,-vx*sn+vz*cs); }

if(window.__MDL){ window.__MDL.attachYacht(yacht,setHull,SPOTS); }
/* ---------- 海豚 ---------- */
const dTex=gradTex([62,74,90],[214,220,226],.42);
const dMat=new T.MeshPhysicalMaterial({map:dTex,roughness:.35,clearcoat:.8,clearcoatRoughness:.2});
function makeDolphin(){ const g=new T.Group();
  const b=new T.Mesh(new T.SphereGeometry(1,24,16),dMat); b.scale.set(.2,.21,1); g.add(b);
  const sn=new T.Mesh(new T.CylinderGeometry(.03,.06,.22,10),dMat); sn.rotation.x=Math.PI/2; sn.position.set(0,-.04,1.02); g.add(sn);
  const fs=new T.Shape(); fs.moveTo(0,0); fs.quadraticCurveTo(.05,.28,-.18,.36); fs.quadraticCurveTo(-.1,.15,-.3,0); fs.lineTo(0,0);
  const fin=new T.Mesh(new T.ShapeGeometry(fs),dMat); fin.rotation.y=Math.PI/2; fin.position.set(0,.17,.1); g.add(fin);
  const fl=new T.Shape(); fl.moveTo(0,0); fl.quadraticCurveTo(.2,-.1,.38,-.22); fl.quadraticCurveTo(.15,-.18,0,-.08); fl.quadraticCurveTo(-.15,-.18,-.38,-.22); fl.quadraticCurveTo(-.2,-.1,0,0);
  const tail=new T.Mesh(new T.ShapeGeometry(fl),dMat); tail.rotation.x=-Math.PI/2; tail.position.set(0,0,-.92); g.add(tail);
  for(const s of [1,-1]){ const p=new T.Mesh(new T.SphereGeometry(1,10,6),dMat); p.scale.set(.16,.02,.07); p.position.set(s*.2,-.1,.35); p.rotation.y=s*.6; g.add(p); }
  g.scale.setScalar(2.2); g.visible=false; g.traverse(o=>{ o.frustumCulled=false; }); S.add(g); return g; }
const dolphins=[]; for(let i=0;i<6;i++) dolphins.push({g:makeDolphin(),ph:0,t:0,on:false});
if(window.__MDL) dolphins.forEach(o=>window.__MDL.attach(o.g,'dolphin',{len:2.4,target:'+z',clip:'Swim'}));

/* ---------- 鯨魚（座頭鯨） ---------- */
const wTex=gradTex([34,40,48],[180,186,190],.35);
const wMat=new T.MeshPhysicalMaterial({map:wTex,roughness:.55,clearcoat:.4,side:T.DoubleSide});
const whale=new T.Group(); whale.visible=false; whale.rotation.order='YXZ'; S.add(whale);
{ const b=new T.Mesh(new T.SphereGeometry(1,32,20),wMat); b.scale.set(1.6,1.5,7); whale.add(b);
  for(const s of [1,-1]){ const f=new T.Mesh(new T.SphereGeometry(1,12,8),wMat); f.scale.set(2.6,.12,.5); f.position.set(s*2.4,-.6,2.5); f.rotation.set(0,s*.5,s*-.3); whale.add(f); } }
// 座頭鯨（使用者提供側面、俯視設定圖生成）：模型原本頭朝上，載入後自動綁骨，再轉成水平、頭朝 +z
let whaleRig=null; const WP={tail:.18,tailF:1.2,bend:0,arch:0};
let whaleLoaded=false; function loadWhale(){ if(whaleLoaded||!T.GLTFLoader) return; whaleLoaded=true;   // 鯨魚模型 8.6MB：第一次出海才下載
 new T.GLTFLoader().load('models/whale2.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; if(m.material){ m.material.roughness=.42; m.material.metalness=.05; } } });
  o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()); o.scale.setScalar(13/Math.max(sz.y,1e-6)); o.updateMatrixWorld(true);
  const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-c2.y,-c2.z);
  const holder=new T.Group(); holder.add(o); holder.updateMatrixWorld(true); try{ whaleRig=autoRig(o,'tail'); }catch(e){ console.warn('whale rig',e); }
  const turn=new T.Group(); turn.rotation.set(-Math.PI/2,Math.PI,0,'YXZ'); turn.add(holder);
  whale.children.forEach(ch=>{ ch.visible=false; }); whale.add(turn); whale.userData.real=true; },undefined,()=>{ if(window.__MDL) window.__MDL.attach(whale,'whale',{len:13,target:'+z'}); }); }
const fluke=new T.Group(); fluke.visible=false; S.add(fluke);
{ const sh=new T.Shape(); sh.moveTo(0,.25); sh.quadraticCurveTo(-1.2,.5,-2.6,1.6); sh.quadraticCurveTo(-1.7,.6,-1.5,0); sh.quadraticCurveTo(-1.7,-.6,-2.6,-1.6); sh.quadraticCurveTo(-1.2,-.5,0,-.25); sh.lineTo(0,.25);
  const f=new T.Mesh(new T.ShapeGeometry(sh,14),wMat); f.rotation.z=-Math.PI/2; f.position.y=2.6; fluke.add(f);
  const st=new T.Mesh(new T.CylinderGeometry(.35,.9,2.8,14),wMat); st.position.y=1.3; fluke.add(st); }

/* 鯨魚的水花系統：水滴（受重力落回海面）、水霧（噴氣與落水後的白霧，飄散變淡）、海面泡沫圈（往外擴散） */
const dropTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), rg=g.createRadialGradient(16,16,0,16,16,16); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(.45,'rgba(240,248,255,.75)'); rg.addColorStop(1,'rgba(230,240,250,0)'); g.fillStyle=rg; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
function partSys(N,size,opacity,grav,drag){ const pos=new Float32Array(N*3), vel=new Float32Array(N*3), life=new Float32Array(N); const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3));
  const m=new T.PointsMaterial({map:dropTex,size,transparent:true,opacity,depthWrite:false,color:0xf2f8ff}); const pts=new T.Points(g,m); pts.frustumCulled=false; S.add(pts); let head=0;
  for(let i=0;i<N;i++) pos[i*3+1]=-999;
  return {mat:m,emit(x,y,z,n,spd,up,spread,lf){ for(let k=0;k<n;k++){ const i=head; head=(head+1)%N; const a=Math.random()*6.283, r=Math.random()*spread;
      pos[i*3]=x+Math.cos(a)*r; pos[i*3+1]=y+Math.random()*.5; pos[i*3+2]=z+Math.sin(a)*r;
      const hs=spd*(.3+Math.random()*.7); vel[i*3]=Math.cos(a)*hs; vel[i*3+1]=up*(.55+Math.random()*.6); vel[i*3+2]=Math.sin(a)*hs; life[i]=lf*(.6+Math.random()*.6); } },
    tick(dt,wind){ let any=false; for(let i=0;i<N;i++){ if(life[i]<=0) continue; any=true; life[i]-=dt; vel[i*3+1]-=grav*dt; const dk=Math.exp(-drag*dt); vel[i*3]=vel[i*3]*dk+(wind||0)*dt; vel[i*3+2]*=dk; vel[i*3+1]*=grav>3?1:dk;
        pos[i*3]+=vel[i*3]*dt; pos[i*3+1]+=vel[i*3+1]*dt; pos[i*3+2]+=vel[i*3+2]*dt; if(life[i]<=0||pos[i*3+1]<-.3) { life[i]=0; pos[i*3+1]=-999; } }
      if(any) g.attributes.position.needsUpdate=true; pts.visible=any; } }; }
// 霧氣貼圖：不規則的雲絮（多個小團疊成），不是一顆顆圓球
const mistTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=64; const g=cv.getContext('2d');
  for(let i=0;i<14;i++){ const x=16+Math.random()*32, y=16+Math.random()*32, r=6+Math.random()*12, rg=g.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,'rgba(255,255,255,.28)'); rg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=rg; g.fillRect(0,0,64,64); }
  return new T.CanvasTexture(cv); })();
const SPRAY=partSys(2400,.5,.95,9.8,.12), MIST=partSys(900,2.6,.16,1.2,.9); MIST.mat.map=mistTex; MIST.mat.needsUpdate=true;
const foamTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=256; const g=cv.getContext('2d');
  for(let i=0;i<900;i++){ const a=Math.random()*6.283, r=70+Math.random()*55*Math.random()+Math.random()*40, x=128+Math.cos(a)*r*.95, y=128+Math.sin(a)*r*.95, s2=1+Math.random()*4; g.fillStyle=`rgba(255,255,255,${.15+Math.random()*.5})`; g.beginPath(); g.arc(x,y,s2,0,7); g.fill(); }
  const rg=g.createRadialGradient(128,128,10,128,128,128); rg.addColorStop(0,'rgba(255,255,255,.35)'); rg.addColorStop(.6,'rgba(255,255,255,.12)'); rg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=rg; g.fillRect(0,0,256,256); return new T.CanvasTexture(cv); })();
const foams=[]; for(let i=0;i<4;i++){ const m=new T.Mesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:foamTex,transparent:true,opacity:0,depthWrite:false,color:0xf4fbff})); m.visible=false; m.renderOrder=2; S.add(m); foams.push({m,t:9,dur:1,r0:1,r1:1}); }
function foam(x,z,r0,r1,dur){ const f=foams.find(q=>q.t>=q.dur)||foams[0]; Object.assign(f,{t:0,dur,r0,r1}); f.m.position.set(x,.06,z); f.m.rotation.y=Math.random()*6.28; f.m.visible=true; }
function updFoam(dt){ for(const f of foams){ if(f.t>=f.dur){ f.m.visible=false; continue; } f.t+=dt; const k=f.t/f.dur, r=f.r0+(f.r1-f.r0)*(1-Math.pow(1-k,2)); f.m.scale.set(r*2,1,r*2); f.m.material.opacity=.9*(1-k); } }
// 噴氣：一道往上衝、被風吹斜、慢慢散開的白霧柱
function blow(x,z){ for(let k=0;k<6;k++) setTimeout(()=>{ SPRAY.emit(x,.8,z,110,.55,13,.25,1.9); MIST.emit(x,1.5+k*.6,z,26,.6,6.5,.35,3.6); },k*70); c.Snd.splash&&c.Snd.splash(.5); }
// 巨大落水：放射狀水牆、四散水滴、白霧、泡沫圈、海面漣漪、船身震動
function crash(x,z,big){ SPRAY.emit(x,.5,z,big?520:260,big?9:6,big?13:9,big?4:2.5,2.4); SPRAY.emit(x,.5,z,big?200:90,3,big?20:13,1.5,2.8);
  MIST.emit(x,.8,z,big?160:80,3.2,big?3.2:2,big?4:2.5,3.6); foam(x,z,big?3:2,big?22:12,big?9:6); foam(x,z,1,big?12:7,big?6:4);
  for(let i=0;i<3;i++) setTimeout(()=>W.addRipple(x,z,big?2.5:1.5),i*250);
  if(c.Snd.splash){ c.Snd.splash(big?2.6:1.6); if(big) setTimeout(()=>c.Snd.splash(1.8),180); }
  const d=Math.hypot(x-cw.x,z-cw.z); if(big&&d<80){ G.gShake=Math.max(G.gShake||0,1.6*(1-d/90)); if(navigator.vibrate) try{ navigator.vibrate([90,40,140]); }catch(e){} } }

/* ---------- 鯊魚背鰭 ---------- */
const sfMat=new T.MeshStandardMaterial({color:0x40464e,roughness:.45,side:T.DoubleSide});
const sfin=new T.Group(); sfin.visible=false; S.add(sfin);
{ const s=new T.Shape(); s.moveTo(.35,0); s.quadraticCurveTo(.2,.45,-.15,.75); s.quadraticCurveTo(-.12,.35,-.4,0); s.lineTo(.35,0);
if(window.__MDL){  window.__MDL.attach(fluke,'whale',{len:13,target:'+z',pitch:1.25,off:[0,-3.4,2.05]}); window.__MDL.attach(sfin,'gwhite',{len:4.2,target:'+x',top:.34,clip:'Swim'}); }
  const m=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.04,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:2}),sfMat); m.rotation.y=Math.PI/2; m.position.y=-.1; sfin.add(m); sfin.scale.setScalar(1.3); }

/* ---------- 飛魚 ---------- */
const ffMat=new T.MeshPhysicalMaterial({map:gradTex([40,70,120],[230,236,240],.5),metalness:.6,roughness:.25,clearcoat:.6,side:T.DoubleSide});
const flyers=[]; for(let i=0;i<7;i++){ const g=new T.Group(); const b=new T.Mesh(new T.SphereGeometry(1,12,8),ffMat); b.scale.set(.05,.05,.2); g.add(b);
  for(const s of [1,-1]){ const w=new T.Mesh(new T.PlaneGeometry(.22,.12),ffMat); w.rotation.x=-Math.PI/2; w.position.set(s*.13,.01,.05); g.add(w); }
  g.visible=false; S.add(g); flyers.push({g,t:0,on:false}); if(window.__MDL) window.__MDL.attach(g,'flyfish',{len:.32,target:'+z'}); }

/* ---------- 彩虹、鳥群、流星 ---------- */
const rbMat=new T.ShaderMaterial({uniforms:{uA:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:'uniform float uA; varying vec2 vP; vec3 sp(float t){ return clamp(vec3(abs(t*6.0-3.0)-1.0, 2.0-abs(t*6.0-2.0), 2.0-abs(t*6.0-4.0)),0.0,1.0); } void main(){ float r=length(vP); float t=clamp((r-700.0)/60.0,0.0,1.0); float e=smoothstep(0.0,0.15,t)*(1.0-smoothstep(0.85,1.0,t)); gl_FragColor=vec4(sp(1.0-t)*e*uA, e*uA); }'});
const rainbow=new T.Mesh(new T.RingGeometry(700,760,160,1,0,Math.PI),rbMat); rainbow.visible=false; rainbow.frustumCulled=false; rainbow.renderOrder=4; S.add(rainbow);
const birdMat=new T.MeshBasicMaterial({color:0x1a1a1a,side:T.DoubleSide});
const birdG=new T.BufferGeometry(); birdG.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.5,.08,-.15,-.05,0,-.05, 0,0,0,.5,.08,-.15,.05,0,-.05],3));
const flock=[]; for(let i=0;i<18;i++){ const m=new T.Mesh(birdG,birdMat); m.visible=false; m.scale.setScalar(1.6); S.add(m); flock.push(m); }
if(window.__MDL) flock.forEach(m=>window.__MDL.attach(m,'gull',{len:.42,target:'+z'}));
const metMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false});
const mets=[]; for(let i=0;i<6;i++){ const m=new T.Mesh(new T.PlaneGeometry(1,1),metMat.clone()); m.visible=false; m.renderOrder=4; S.add(m); mets.push({m,t:9}); }

/* ---------- 地點切換 ---------- */
let loc='lake';
function setLoc(l){ loc=l; G.loc=l; const sea=l==='sea', ice=l==='ice'; if(sea) loadWhale(); W.setSea(sea); if(W.setIce) W.setIce(ice); if(window.__MDL) window.__MDL.preload(l);
  S.children.forEach(o=>{ if(o.userData&&o.userData.lake) o.visible=l==='lake'; });
  if(window.__REAL&&window.__REAL.useSet) window.__REAL.useSet(l);
  yacht.visible=sea; endAll(); if(sea){ evT=6; forced='dolphin'; }
  if(sea){ c.save.seaTrips=(c.save.seaTrips||0)+1; c.persist(); } }

/* ---------- 美景事件 ---------- */
const ev={id:null,t:0,dur:0,shot:false,data:{}}; let evT=rand(20,40), lastRain=0, forced=null, lakeT=0;
const banner=$('scene');
function canEv(id,day,wx){
  const sea=loc==='sea', p=c.period();
  if(id==='rainbow') return day>.5&&wx.c<.75&&(lastRain>0||Math.random()<.2);
  if(id==='flock') return (p==='day'||p==='dusk'||p==='dawn')&&wx.r<.3;
  if(id==='meteor') return p==='night'&&wx.c<.4;
  if(id==='golden') return (p==='dusk'||p==='dawn')&&wx.c<.5;
  if(id==='dolphin'||id==='flyfish') return sea&&day>.3&&wx.r<.6;
  if(id==='whale') return sea&&wx.r<.8;
  if(id==='shark') return sea;
  return false; }
function startEv(id){ Object.assign(ev,{id,t:0,shot:false,data:{}}); const b=base(), hd=G.head;
  if(id==='rainbow'){ ev.dur=55; rainbow.visible=true; }
  else if(id==='flock'){ ev.dur=28; const side=Math.random()<.5?1:-1, d=rand(80,140);
    ev.data={o:fwd(hd,new T.Vector3()).multiplyScalar(d).add(b).add(new T.Vector3(Math.cos(hd)*side*120,rand(28,45),-Math.sin(hd)*side*120)),v:new T.Vector3(-Math.cos(hd)*side*9,0,Math.sin(hd)*side*9)};
    flock.forEach((m,i)=>{ m.visible=true; m.userData.off=new T.Vector3((i%2?1:-1)*Math.ceil(i/2)*2.2,rand(-1,1),Math.ceil(i/2)*2.2*side); m.userData.ph=rand(0,6); }); }
  else if(id==='meteor'){ ev.dur=40; }
  else if(id==='golden'){ ev.dur=40; }
  else if(id==='dolphin'){ ev.dur=26; const side=Math.random()<.5?1:-1, d=rand(18,32);
    ev.data={p:fwd(hd+side*.9,new T.Vector3()).multiplyScalar(d).add(b),v:fwd(hd-side*Math.PI/2,new T.Vector3()).multiplyScalar(-6)};
    dolphins.forEach((o,i)=>{ o.on=i<rand(3,6.9); o.off=new T.Vector3(rand(-4,4),0,rand(-4,4)); o.t=rand(0,2); o.cyc=rand(1.6,2.8); }); c.Snd.bird(); }
  else if(id==='whale'){ ev.dur=34; const a=hd+rand(-.35,.35), p=fwd(a,new T.Vector3()).multiplyScalar(rand(28,38)).add(b), dir=a+Math.PI/2*(Math.random()<.5?1:-1); ev.data={p,dir,stage:0}; }
  else if(id==='shark'){ ev.dur=22; ev.data={a:rand(0,6.28),r:rand(9,15)}; sfin.visible=true; }
  else if(id==='flyfish'){ ev.dur=8; flyers.forEach(f=>{ f.on=true; f.t=-rand(0,4); f.p=fwd(G.head+rand(-.6,.6),new T.Vector3()).multiplyScalar(rand(8,20)).add(b); f.a=G.head+rand(-1.5,1.5); }); }
  banner.innerHTML='✨ '+SCENES[id]+'<small>按 📷 拍下來</small>'; banner.classList.remove('hidden','mini'); clearTimeout(banner._t); banner._t=setTimeout(()=>banner.classList.add('mini'),3500); $('bCam').classList.add('pulse'); }
function endAll(){ ev.id=null; banner.classList.add('hidden'); $('bCam').classList.remove('pulse'); rainbow.visible=false; flock.forEach(m=>m.visible=false); dolphins.forEach(o=>{ o.on=false; o.g.visible=false; });
  whale.visible=false; fluke.visible=false; if(!chase) sfin.visible=false; flyers.forEach(f=>{ f.on=false; f.g.visible=false; }); mets.forEach(m=>m.m.visible=false); }
function updEv(dt,t,wx,day){
  if(c.G&&c.G.state==='home'){ if(ev.id) endAll(); return; }   // 在小屋裡不會發生、也不會提示外面的事件
  W.camera.getWorldPosition(cw); SPRAY.tick(dt,0); MIST.tick(dt,1.2); updFoam(dt);
  if(!ev.id){ evT-=dt; if(evT<=0){ evT=loc==='sea'?rand(30,60):rand(45,90); if(c.underwater()) return;
      if(forced&&canEv(forced,day,wx)){ startEv(forced); forced=null; return; } forced=null;
      const ids=Object.keys(SCENES).filter(id=>canEv(id,day,wx)); if(ids.length) startEv(ids[Math.floor(Math.random()*ids.length)]); } return; }
  ev.t+=dt; const k=ev.t/ev.dur, d=ev.data;
  if(ev.id==='rainbow'){ const sd=W.U.uSunDisk.value; tv.copy(sd).multiplyScalar(-800).add(cw); rainbow.position.copy(tv); rainbow.lookAt(cw); rbMat.uniforms.uA.value=.32*sstep(0,.15,k)*(1-sstep(.8,1,k))*(1-wx.c); }
  else if(ev.id==='flock'){ d.o.addScaledVector(d.v,dt); flock.forEach(m=>{ m.position.copy(d.o).add(m.userData.off); m.lookAt(tv.copy(m.position).add(d.v)); if(!m.userData.real) m.scale.y=1.6*(.4+.6*Math.abs(Math.sin(t*6+m.userData.ph))); }); }
  else if(ev.id==='meteor'){ if(window.__SKY&&Math.random()<dt*2.6) window.__SKY.spawn(Math.random()<.12); }
  else if(ev.id==='dolphin'){ d.p.addScaledVector(d.v,dt);
    for(const o of dolphins){ if(!o.on) continue; o.t+=dt; const cy=o.cyc, ph=(o.t%cy)/cy, jump=ph>.55; const g=o.g;
      tv.copy(d.p).add(o.off); const s=(ph-.55)/.45;
      if(jump){ g.visible=true; const h=1.6; g.position.set(tv.x+d.v.x*.1*s,4*h*s*(1-s)-.3,tv.z+d.v.z*.1*s); hullClear(g.position,1.4); g.lookAt(tv2.copy(g.position).add(d.v)); g.rotateX(-(1-2*s)*.9);
        if(!o.inA&&s>.02){ o.inA=true; P.splash(g.position.x,0,g.position.z,14,.8); AT.ring(g.position.x,g.position.z,.8); }
        if(s>.96&&o.inA){ o.inA=false; P.splash(g.position.x,0,g.position.z,22,1); W.addRipple(g.position.x,g.position.z,.5); } }
      else g.visible=false; } }
  else if(ev.id==='whale'){ const p=d.p, tt=ev.t, dx=Math.sin(d.dir), dz=Math.cos(d.dir), at=(k)=>tv2.set(p.x+dx*k,0,p.z+dz*k);
    // 骨架動作：平常緩緩擺尾；躍出時尾巴猛力上下拍、身體弓起；空中扭身；落水前身體反弓
    if(whaleRig){ const br=tt>16&&tt<20.2, q=(tt-16)/3.6;
      const tail=br?(q<.45?.55:.28):.16, tf=br?(q<.45?3.4:1.6):1.1, arch=br?(q<.45?-.18:q<.75?.12:.3):0, bend=br?(q<.45?0:.18*Math.sin(q*8)):0;
      whaleRig.pose({t:tt,tail,tailF:tf,tailX:true,tailBend:bend,arch,breathe:0}); }
    // 1. 兩次換氣：背脊浮出水面、噴起高高的白霧柱
    if(tt>1.2&&d.stage===0){ d.stage=1; const q=at(-8); blow(q.x,q.z); foam(q.x,q.z,1,5,4); }
    if(tt>7.5&&d.stage===1){ d.stage=2; const q=at(-2); blow(q.x,q.z); foam(q.x,q.z,1,5,4); }
    if(tt<13){ const seg=tt<6.5?(tt-.8)/5.7:(tt-6.8)/5.7, q=at(tt<6.5?-10+tt*1.1:-4+(tt-6.8)*1.1), up=Math.sin(Math.max(0,Math.min(1,seg))*Math.PI);
      whale.visible=seg>0&&seg<1; whale.position.set(q.x,-2.6+2.1*up,q.z); whale.rotation.set(.08-.16*seg,d.dir,0); if(whale.visible&&Math.random()<.2) SPRAY.emit(q.x,.2,q.z,6,1.5,1.2,3,1); }
    // 2. 海面下翻起白浪：要躍出水面了（鏡頭自動轉過去）
    const bp=at(8);
    if(tt>13.5&&d.stage===2){ d.stage=3; whale.visible=false; if(window.__FACE) window.__FACE(new T.Vector3(bp.x,3,bp.z),{dur:6,pitch:.12}); foam(bp.x,bp.z,1,7,5); if(c.toast) c.toast('🐋 鯨魚要躍出水面了！','good',2200); }
    if(tt>13.5&&tt<16) { if(Math.random()<.5) SPRAY.emit(bp.x,.2,bp.z,8,2,2.5,3,1); }
    // 3. 躍身擊浪：幾乎整隻衝出海面、在空中翻身、側身重重砸回海裡
    if(tt>16&&tt<20.2){ const q=(tt-16)/3.6, qq=Math.min(1,q), y=-9+4*12*qq*(1-qq)+ (q>1?-(q-1)*20:0), fw=6*qq;
      whale.visible=true; whale.position.set(bp.x+dx*fw,y,bp.z+dz*fw); whale.rotation.order='YXZ'; whale.rotation.set(-1.45+1.9*qq,d.dir,1.5*sstep(.2,1,qq));
      if(d.stage===3){ d.stage=4; crash(bp.x,bp.z,false); }
      if(qq<.6&&Math.random()<.9) SPRAY.emit(whale.position.x+(Math.random()-.5)*2,Math.max(.5,whale.position.y+(Math.random()-.5)*8),whale.position.z+(Math.random()-.5)*2,10,1.6,1,1.6,1.6);
      if(q>.93&&d.stage===4){ d.stage=5; const cp=tv3.set(bp.x+dx*6.5,0,bp.z+dz*6.5); crash(cp.x,cp.z,true); } }
    else if(tt>=20.2&&tt<23) whale.visible=false;
    // 4. 最後一次換氣，舉起尾鰭慢慢潛下去
    if(tt>23&&d.stage===5){ d.stage=6; const q=at(16); blow(q.x,q.z); }
    if(tt>25&&tt<31){ fluke.visible=true; const q=(tt-25)/6, fp=at(18); fluke.position.set(fp.x,(q<.45?-3+6.5*sstep(0,.45,q):3.5-7*sstep(.45,1,q)),fp.z); hullClear(fluke.position,3); fluke.rotation.set(.25*(1-q),d.dir,0); fluke.scale.setScalar(1.4);
      if(q<.5&&Math.random()<.6) SPRAY.emit(fp.x,fluke.position.y+1.5,fp.z,6,.6,.5,1.6,1.4);
      if(q>.8&&d.stage===6){ d.stage=7; crash(fp.x,fp.z,false); } } else fluke.visible=false; }
  else if(ev.id==='shark'&&!chase){ d.a+=dt*.22; const b=base(); sfin.position.set(b.x+Math.cos(d.a)*d.r,0,b.z+Math.sin(d.a)*d.r); hullClear(sfin.position,.6); sfin.rotation.y=-d.a; sfin.visible=true;
    if(Math.random()<dt*3) AT.ring(sfin.position.x,sfin.position.z,.35); }
  else if(ev.id==='flyfish'){ for(const f of flyers){ if(!f.on) continue; f.t+=dt; if(f.t<0){ f.g.visible=false; continue; } const q=f.t/1.4;
      if(q>1){ f.t=-rand(.5,2.5); P.splash(f.g.position.x,0,f.g.position.z,6,.4); f.p.add(tv.set(-Math.sin(f.a)*9,0,-Math.cos(f.a)*9)); continue; }
      f.g.visible=true; f.g.position.set(f.p.x-Math.sin(f.a)*9*q,.15+.6*Math.sin(q*Math.PI),f.p.z-Math.cos(f.a)*9*q); hullClear(f.g.position,.4); f.g.rotation.set(0,f.a+Math.PI,0); f.g.scale.setScalar(1.6);
      if(q<.03) P.splash(f.g.position.x,0,f.g.position.z,4,.3); } }
  if(ev.t>=ev.dur) endAll();
}
/* ---------- 鯊魚搶魚（出海時） ---------- */
let chase=null, stolenF=false;
function onHook(fd,get){ chase=null; stolenF=false; if(loc==='sea'&&fd.sp.rar>=2&&Math.random()<.2*(1-.12*(window.__TAL?window.__TAL.rank('sea'):0))&&!(window.__ECO&&window.__ECO.fxOn('repel'))) chase={delay:rand(3,7),get,p:null}; }
function updChase(dt){ if(!chase) return; if(chase.delay>0){ chase.delay-=dt; if(chase.delay<=0){ const f=chase.get(); chase.p=new T.Vector3(f.x+rand(-14,14),0,f.z+rand(-14,14)); sfin.visible=true; c.toast('⚠️ 鯊魚衝過來了！快收線！','bad',2400); c.vib([60,60,60]); } return; }
  const f=chase.get(); tv.subVectors(f,chase.p); tv.y=0; const d=tv.length(); tv.normalize(); chase.p.addScaledVector(tv,Math.min(d,1.6*dt)); hullClear(chase.p,.6);
  sfin.position.copy(chase.p); sfin.rotation.y=Math.atan2(tv.x,tv.z)-Math.PI/2; if(Math.random()<dt*4) AT.ring(chase.p.x,chase.p.z,.4);
  if(!chase.q&&d<9){ chase.q=true; const back=tv.clone(); if(window.__KK) window.__KK.offerDodge(()=>{ if(chase) chase.p.addScaledVector(back,-12); if(G.f) G.f.d=Math.max(2.8,G.f.d-3); }); }
  if(d<1.2){ chase=null; sfin.visible=false; if(window.__KK) window.__KK.snatch(f.clone(),()=>{ stolenF=true; }); else stolenF=true; } }
function endChase(){ chase=null; if(ev.id!=='shark') sfin.visible=false; }

/* ---------- 拍照收集 ---------- */
$('bCam').addEventListener('click',()=>{ if(window.__GHOST&&window.__GHOST.onPhoto&&window.__GHOST.onPhoto()) toast('……照片裡好像多了什麼','warn',2400); try{
  W.render(); const src=W.renderer.domElement, cv=document.createElement('canvas'); cv.width=src.width; cv.height=src.height; const x=cv.getContext('2d'); x.drawImage(src,0,0);
  const s=cv.width/400, lbl=ev.id?SCENES[ev.id]:(loc==='sea'?'外海':'濕地'); x.fillStyle='rgba(0,0,0,.45)'; x.fillRect(0,cv.height-44*s,cv.width,44*s);
  x.fillStyle='#fff'; x.font=`800 ${15*s}px sans-serif`; x.fillText('濕地垂釣・'+lbl+'・'+new Date().toLocaleDateString('zh-TW'),14*s,cv.height-17*s);
  const a=document.createElement('a'); a.download='濕地垂釣_美景_'+Date.now()+'.jpg'; a.href=cv.toDataURL('image/jpeg',.92); document.body.appendChild(a); a.click(); a.remove();
  if(ev.id&&!ev.shot){ ev.shot=true; const sv=c.save; sv.scenes=sv.scenes||{}; const first=!sv.scenes[ev.id]; sv.scenes[ev.id]=(sv.scenes[ev.id]||0)+1; if(window.__STORY) window.__STORY.onScene(ev.id);
    const rw=first?1000:200; sv.coins+=rw; c.persist(); c.setCoins(); c.Snd.coin(); c.toast((first?'📸 新美景收錄：':'📸 美景照片：')+SCENES[ev.id]+'　🪙'+rw,'good',2400); }
  else c.toast('照片已存到下載資料夾','good');
}catch(e){ c.toast('這個瀏覽器不支援拍照存檔','bad'); } });

function update(dt,t){
  const wx=c.wx(), day=W.info.day;
  if(wx.r>.4) lastRain=60; else lastRain=Math.max(0,lastRain-dt);
  updEv(dt,t,wx,day); updChase(dt);
  lakeT-=dt; if(lakeT<=0){ lakeT=.25; const sea=(G.loc||loc)!=='lake'; S.children.forEach(o=>{ if(o.userData&&o.userData.lake){ const want=!sea&&!(o.userData.veg&&window.__GFX==='low'); if(o.visible!==want) o.visible=want; } }); }
  if(yacht.visible){ const b=base(); const h0=W.swell(b.x,b.z,t), fx=-Math.sin(G.head), fz=-Math.cos(G.head);
    const hf=W.swell(b.x+fx*3,b.z+fz*3,t), hs=W.swell(b.x-fz*1.5,b.z+fx*1.5,t);
    yacht.position.set(b.x,h0*.9-.05,b.z); yacht.rotation.set((hf-h0)/3*.7,G.head,(hs-h0)/1.5*-.5,'YXZ'); }
}
return {hullClear,hullOut,hullDims:()=>({HX,HZ0,HZ1}),setLoc,update,onHook,endChase,stolen:()=>{ const v=stolenF; stolenF=false; return v; },loc:()=>loc};
}
