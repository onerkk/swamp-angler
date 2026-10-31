/* ===== 第 3 段 · 天氣、野生動物、獨木舟與釣點 ===== */
const SPOTS=[
 {id:'dock',name:'木碼頭',sub:'岸邊碼頭，各種魚都有一點',pos:[0,0],head:0,eye:2.4,kayak:false,lv:1,aff:{},size:1,rare:0},
 {id:'lily',name:'浮萍灣',sub:'睡蓮和水草多，黑鱸、太陽魚聚集',pos:[-7,-17],head:.25,eye:1.0,kayak:true,lv:2,aff:{bluegill:1.5,crappie:1.3,lmbass:1.7,smbass:1.4},size:1,rare:.1},
 {id:'wood',name:'倒木區',sub:'枯樹和沉木，鯰魚、弓鰭魚的地盤',pos:[-27,-22],head:-.45,eye:1.0,kayak:true,lv:4,aff:{channel:1.8,bowfin:2,flathead:1.8,perch:1.5},size:1.05,rare:.2},
 {id:'deep',name:'深水中央',sub:'最深的水域，大型魚出沒',pos:[6,-58],head:.1,eye:1.0,kayak:true,lv:6,aff:{gar:2.5,flathead:1.5,reba:1.3,channel:1.3},size:1.15,rare:.35},
 {id:'moon',name:'月光灣',sub:'美人魚透露的秘境，夜裡傳說生物頻繁出沒',pos:[-10,-40],head:.35,eye:1.0,kayak:true,lv:1,req:'mer1',aff:{mermaid:4,ghost:3,golden:2},size:1.2,rare:.6},
 {id:'reef',name:'近海礁岩',loc:'sea',sub:'藍綠色海水下的礁區，石斑、紅甘出沒',pos:[0,0],head:0,eye:3.2,kayak:false,yacht:true,lv:8,aff:{grouper:2,amber:2,ribbon:1.5},size:1.05,rare:.15},
 {id:'blue',name:'遠洋深藍',loc:'sea',sub:'一望無際的深藍外海，大型洄游魚與鯊魚的領域',pos:[0,0],head:0,eye:3.2,kayak:false,yacht:true,lv:12,aff:{tuna:2,marlin:2,mahi:2,shark:1.5,gwhite:1.2,sail:1.6},size:1.2,rare:.4},
 {id:'ice',name:'冰湖',loc:'ice',sub:'結冰的湖面，鑿開冰洞垂釣鱒魚與狗魚',pos:[0,0],head:0,eye:1.6,kayak:false,yacht:false,lv:10,aff:{trout:2,pike:1.6,bluegill:1.3,crappie:1.3},size:1,rare:.1}
];
const WXT={clear:{c:0,r:0,f:0,w:1.5,g:.3,n:'晴',i:'☀️'},breezy:{c:.25,r:0,f:0,w:5.5,g:.8,n:'晴有風',i:'🍃'},cloudy:{c:.75,r:0,f:.15,w:3,g:.5,n:'陰',i:'☁️'},drizzle:{c:.85,r:.4,f:.35,w:2,g:.3,n:'毛毛雨',i:'🌦️'},rain:{c:1,r:.8,f:.3,w:4,g:.6,n:'雨',i:'🌧️'},storm:{c:1,r:1,f:.45,w:9,g:1,n:'雷雨',i:'⛈️'},fog:{c:.45,r:0,f:1,w:.5,g:.1,n:'霧',i:'🌫️'}};

function createWild(W,P,Snd,save,toast,vib,ctx){
'use strict';
const T=THREE, S=W.scene;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t, rand=(a,b)=>a+Math.random()*(b-a);
function hashI(x,y){ let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function vn(x,y){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hashI(xi,yi), b=hashI(xi+1,yi), c=hashI(xi,yi+1), d=hashI(xi+1,yi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,o){ let s=0,a=.5,n=0; for(let i=0;i<o;i++){ s+=a*vn(x,y); n+=a; x=x*2.03+17.1; y=y*2.03+9.7; a*=.5; } return s/n; }
function dataTex(w,h,fn){ const d=new Uint8Array(w*h*4), o=[0,0,0,255];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ o[3]=255; fn(x/w,y/h,o); const i=(y*w+x)*4; for(let k=0;k<4;k++){ const v=o[k]; d[i+k]=v<0?0:v>255?255:v; } }
  const t=new T.DataTexture(d,w,h,T.RGBAFormat); t.wrapS=t.wrapT=T.RepeatWrapping; t.magFilter=T.LinearFilter; t.minFilter=T.LinearMipmapLinearFilter; t.generateMipmaps=true; t.encoding=T.sRGBEncoding; t.needsUpdate=true; return t; }
const fwd=(a,out)=>out.set(-Math.sin(a),0,-Math.cos(a));
const inShore=(v,bx,bz,m)=>{ for(let k=0;k<20;k++){ const r=Math.hypot(v.x,v.z), R=W.shoreR(Math.atan2(v.x,-v.z))-m; if(r<=R) break; v.x=bx+(v.x-bx)*.9; v.z=bz+(v.z-bz)*.9; } return v; };
let spotI=0, zoneI=0; const spd={};
const sp=()=>{ const s=SPOTS[spotI], b=ctx.base?ctx.base():null, z=SPOTS[zoneI]; spd.pos=b?[b.x,b.z]:s.pos; spd.head=ctx.head?ctx.head():s.head; spd.kayak=s.kayak; spd.yacht=!!s.yacht; spd.eye=s.eye; spd.aff=z.aff; spd.size=z.size; spd.rare=z.rare; return spd; };
const tv=new T.Vector3(), tv2=new T.Vector3(), cw=new T.Vector3();

/* ---------- 倒木區的枯樹與浮木 ---------- */
const barkTex=dataTex(64,128,(u,v,o)=>{ const n=fbm(u*12,v*3,3), k=.5+.7*n; o[0]=52*k; o[1]=46*k; o[2]=38*k; });
const snagMat=new T.MeshStandardMaterial({map:barkTex,roughness:.9});
// 倒木區的枯樹：改用實拍掃描的枯樹幹（Poly Haven dead_tree_trunk_02），斜插在水裡、露出半截，取代原本用圓柱拼出來的假樹
const SNAGQ=[]; let snagSrc=null;
function snag(x,z,h){ SNAGQ.push([x,z,h]); if(snagSrc) placeSnag(x,z,h); }
function placeSnag(x,z,h){ const o=snagSrc.clone(true), g=new T.Group(); g.add(o);
  const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), long=Math.max(sz.x,sz.y,sz.z);
  if(long===sz.x) o.rotation.z=Math.PI/2; else if(long===sz.z) o.rotation.x=Math.PI/2;   // 長軸立起來
  o.updateMatrixWorld(true); const b2=new T.Box3().setFromObject(o), c=b2.getCenter(new T.Vector3()); o.position.set(-c.x,-b2.min.y,-c.z);
  const sc=(h+1.2)/long; g.scale.setScalar(sc); g.position.set(x,-1.0,z); g.rotation.set(rand(-.35,.35),Math.random()*6.28,rand(.25,.55)*(Math.random()<.5?-1:1));
  // 水面以下的部分裁掉（水不夠透，水下的樹幹會讓整棵樹看起來浮在半空）；水線處加深成濕木色，並不時冒出一圈漣漪
  W.renderer.localClippingEnabled=true;
  g.traverse(m=>{ if(m.isMesh){ m.frustumCulled=true; m.castShadow=false; const conv=mm=>{ const k=mm.clone(); k.clippingPlanes=[SNAG_CLIP]; k.clipShadows=true;
      k.onBeforeCompile=sh=>{ sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying float vWY;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWY=(modelMatrix*vec4(transformed,1.0)).y;');
        sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vWY;').replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb*=mix(0.45,1.0,smoothstep(0.0,0.55,vWY));'); };
      return k; }; m.material=Array.isArray(m.material)?m.material.map(conv):conv(m.material); } });
  g.userData.lake=true; g.visible=!(W.isSea&&W.isSea()); S.add(g); W.fishingPhysics.addObject(g,()=>g.visible,"倒木"); SNAG_RIP.push([x,z]); }
const SNAG_CLIP=new T.Plane(new T.Vector3(0,1,0),.01), SNAG_RIP=[];
if(T.GLTFLoader) new T.GLTFLoader().load('dead_tree_trunk_02.glb',gl=>{ snagSrc=gl.scene; SNAGQ.forEach(a=>placeSnag(...a)); });
snag(-33,-30,5); snag(-22,-35,3.6); snag(-36,-17,6.5); snag(-18,-29,2.4); snag(-29,-39,4.2); snag(-40,-26,3.2);
// 原本的圓柱浮木拿掉（像一根黑色水管）；倒木區已有實拍的倒木、樹樁、枯枝

/* ---------- 黃色獨木舟與槳 ---------- */
let padG=null; const paddleTilt={x:0,z:0};
/* 槳掛在鏡頭上（永遠在胸前、轉頭也跟著）：鏡頭座標下方 .27、前方 .82；padOn＝握槳程度（0 握竿、1 握槳），划船時升起、停下後收回畫面下方 */
const PAD_Y=-.27, PAD_Z=-.82; let padOn=0;
const boat=new T.Group(); boat.visible=false; S.add(boat);
const canoeCollider=W.fishingPhysics.addBox({x:-.4,y:-.3,z:-2.45},{x:.4,y:.3,z:1.75},()=>boat.visible,'船體');
canoeCollider.update=()=>{
  const b=ctx.base(),h=ctx.head(),cs=Math.cos(h),sn=Math.sin(h),xs=[],zs=[];
  for(const x of [-.4,.4])for(const z of [-2.45,1.75]){xs.push(b.x+x*cs+z*sn);zs.push(b.z-x*sn+z*cs);}
  Object.assign(canoeCollider.boxes[0].min,{x:Math.min(...xs),y:-.3,z:Math.min(...zs)});
  Object.assign(canoeCollider.boxes[0].max,{x:Math.max(...xs),y:.3,z:Math.max(...zs)});
};
/* 原木獨木舟（依玩家設定圖生成）：載入後取代程式做的塑膠艇；船頭朝 −Z，長 4.2 米 */
if(T.GLTFLoader) new T.GLTFLoader().load('models/canoe.glb',g=>{ const o=g.scene; o.traverse(x=>{ if(x.isMesh){ const mp=x.material.map; if(mp){ mp.generateMipmaps=false; mp.minFilter=T.LinearFilter; } x.material=new T.MeshStandardMaterial({map:mp||null,vertexColors:!mp&&!!x.geometry.attributes.color,roughness:.85,metalness:0}); x.castShadow=false; } });
  const w=new T.Group(); w.add(o); w.rotation.y=Math.PI; w.updateMatrixWorld(true); let b=new T.Box3().setFromObject(w); const sz=b.getSize(new T.Vector3()); w.scale.set(.78/Math.max(sz.x,1e-6),.42/Math.max(sz.y,1e-6),4.2/Math.max(sz.z,1e-6));   // 長寬高分開縮放成真實獨木舟比例
  w.updateMatrixWorld(true); b=new T.Box3().setFromObject(w); const c=b.getCenter(new T.Vector3()); w.position.set(-c.x,-.2-b.min.y,-.35-c.z);
  boat.children.forEach(ch=>{ if(ch!==padG) ch.visible=false; }); boat.add(w); });   // 只藏舊塑膠艇的船身，槳要留著
{ const yel=new T.MeshStandardMaterial({color:0xf2b705,roughness:.32}), blk=new T.MeshStandardMaterial({color:0x151515,roughness:.6}), gry=new T.MeshStandardMaterial({color:0x33363b,metalness:.5,roughness:.4});
  const hull=new T.Mesh(new T.SphereGeometry(1,48,20),yel); hull.scale.set(.36,.22,1.95); hull.position.set(0,.02,-.15); boat.add(hull);
  const ridge=new T.Mesh(new T.SphereGeometry(1,24,10),yel); ridge.scale.set(.06,.05,1.2); ridge.position.set(0,.215,-.9); boat.add(ridge);
  const hatch=new T.Mesh(new T.CylinderGeometry(.12,.12,.025,24),blk); hatch.scale.z=1.35; hatch.position.set(0,.235,-.75); boat.add(hatch);
  for(const s of [1,-1]){ const b=new T.Mesh(new T.CylinderGeometry(.004,.004,.62,5),blk); b.rotation.set(Math.PI/2,0,s*.45); b.position.set(0,.232,-1.3); boat.add(b); }
  const rim=new T.Mesh(new T.TorusGeometry(.3,.025,8,24),blk); rim.scale.set(.85,1.6,1); rim.rotation.x=Math.PI/2; rim.position.set(0,.22,.2); boat.add(rim);
  const pad=new T.Group(); pad.position.set(0,PAD_Y-.6,PAD_Z); pad.visible=false; W.camera.add(pad); padG=pad;
  /* 木槳（配原木獨木舟）：木色槳桿、兩端橢圓槳葉 */
  const wood=new T.MeshStandardMaterial({color:0x8a5a32,roughness:.7}), woodD=new T.MeshStandardMaterial({color:0x6e4524,roughness:.75});
  const sh=new T.Mesh(new T.CylinderGeometry(.018,.018,2.1,8),wood); sh.rotation.z=Math.PI/2; pad.add(sh);
  for(const s of [1,-1]){ const bl=new T.Mesh(new T.SphereGeometry(1,20,8),woodD); bl.scale.set(.24,.012,.085); bl.position.x=s*1.22; bl.rotation.x=s*.25; pad.add(bl);
    const nk=new T.Mesh(new T.CylinderGeometry(.018,.03,.12,8),wood); nk.rotation.z=Math.PI/2; nk.position.x=s*1.0; pad.add(nk); } }

/* ---------- 雨絲 ---------- */
const NR=1400, rpos=new Float32Array(NR*6), roff=new Float32Array(NR*3);
for(let i=0;i<NR;i++){ roff[i*3]=rand(-10,10); roff[i*3+1]=rand(-2,12); roff[i*3+2]=rand(-10,10); }
const rgeo=new T.BufferGeometry(); rgeo.setAttribute('position',new T.BufferAttribute(rpos,3));
const rmat=new T.LineBasicMaterial({color:0xb8c4cc,transparent:true,opacity:0,depthWrite:false});
const rainL=new T.LineSegments(rgeo,rmat); rainL.frustumCulled=false; rainL.visible=false; S.add(rainL);

/* ---------- 鱷魚 ---------- */
const gskin=dataTex(64,64,(u,v,o)=>{ const n=fbm(u*10,v*10,3), cx=u*12-Math.floor(u*12)-.5, cy=v*8-Math.floor(v*8)-.5, bump=1-Math.min(1,Math.hypot(cx,cy*1.3)*2);
  const k=.45+.5*n+.25*bump; o[0]=46*k; o[1]=49*k; o[2]=33*k; });
const gm=new T.MeshStandardMaterial({map:gskin,roughness:.5});
const gEye=new T.MeshStandardMaterial({color:0x2a2410,roughness:.08,emissive:0xff6a10,emissiveIntensity:0});
const gator=new T.Group(); gator.visible=false; S.add(gator);
{ const hd=new T.Mesh(new T.SphereGeometry(1,28,12),gm); hd.scale.set(.17,.07,.58); gator.add(hd);
  for(const s of [1,-1]){ const eb=new T.Mesh(new T.SphereGeometry(.055,14,8),gm); eb.scale.y=.8; eb.position.set(s*.085,.04,-.22); gator.add(eb);
    const e=new T.Mesh(new T.SphereGeometry(.027,12,8),gEye); e.position.set(s*.088,.076,-.2); gator.add(e); }
  const no=new T.Mesh(new T.SphereGeometry(.035,12,8),gm); no.scale.set(1.3,.6,1); no.position.set(0,.035,.5); gator.add(no);
  for(let i=0;i<14;i++){ const k=1-i/18, sc=new T.Mesh(new T.SphereGeometry(.055*k,10,6),gm); sc.scale.set(1,.45,1.4); sc.position.set(i<9?(i%2?.11:-.11)*k:0,-.008,-.78-i*.23); gator.add(sc); } }
const gH=window.__MDL?window.__MDL.attach(gator,'gator',{len:3.3,target:'+z',top:.07}):null;
// 鱷魚游動：模型沒有骨架，用頂點著色器做身體的 S 形擺動（頭幾乎不動、越往尾巴擺越大，波從頭傳到尾）
const GU={uGT:{value:0},uGA:{value:.3}}; let gPatched=false, gYaw=0, gYawInit=false;
function patchGator(){ if(gPatched) return; let hit=false;
  gator.traverse(o=>{ if(!o.isMesh||!o.material||o.userData.gw) return; o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox; if(bb.max.x-bb.min.x<2) return; hit=true; o.userData.gw=1;
    const head=bb.max.x, len=bb.max.x-bb.min.x, m=o.material=o.material.clone();
    m.onBeforeCompile=sh=>{ sh.uniforms.uGT=GU.uGT; sh.uniforms.uGA=GU.uGA;
      sh.vertexShader='uniform float uGT;\nuniform float uGA;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float tl_=clamp((${head.toFixed(3)}-position.x)/${len.toFixed(3)},0.0,1.0);
        float w_=0.05+0.95*pow(tl_,1.6);
        transformed.z+=uGA*w_*${(len*0.11).toFixed(3)}*sin(uGT-tl_*6.2);
        transformed.y+=uGA*${(len*0.006).toFixed(3)}*sin(uGT*0.5+tl_*2.0);`); };
    m.customProgramCacheKey=()=>'gatorswim'; m.needsUpdate=true; });
  if(hit) gPatched=true; }
let gs={mode:'off'}, gTimer=rand(40,90), gRip=0, chaseDelay=-1, chaseGet=null, stolenF=false;
const gS=new T.Vector3(), gE=new T.Vector3(), gP=new T.Vector3();
function placeGator(p,yaw){ gator.position.set(p.x,-.03+Math.sin(performance.now()*.0015)*.008,p.z);
  if(!gYawInit||!gator.visible){ gYaw=yaw; gYawInit=true; } else { let d=yaw-gYaw; while(d>Math.PI) d-=Math.PI*2; while(d<-Math.PI) d+=Math.PI*2; gYaw+=d*Math.min(1,.016*3); }
  gator.rotation.y=gYaw+Math.sin(GU.uGT.value)*.04*GU.uGA.value; gator.visible=true; }
function spawnPass(){ const s=sp(), bx=s.pos[0], bz=s.pos[1], sg=Math.random()<.5?1:-1;
  gS.copy(fwd(s.head-.75*sg,tv)).multiplyScalar(rand(24,32)).add(tv2.set(bx,0,bz)); inShore(gS,bx,bz,4);
  gE.copy(fwd(s.head+.75*sg,tv)).multiplyScalar(rand(24,32)).add(tv2.set(bx,0,bz)); inShore(gE,bx,bz,4);
  gs={mode:'pass',t:0,dur:gS.distanceTo(gE)/.55}; gP.copy(gS); if(gS.distanceTo(tv2.set(bx,0,bz))<26) Snd.gator(); }
/* ===== 鱷魚鬧場：直接衝向玩家；獨木舟可以撞開，碼頭上連拍水面嚇走 ===== */
const tapB=document.createElement('button'); tapB.id='gatorTap'; tapB.className='hidden'; tapB.textContent='🪵 拍水'; document.body.appendChild(tapB);
const tcss=document.createElement('style'); tcss.textContent='#gatorTap{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 190px);transform:translateX(-50%);z-index:7;padding:14px 26px;border-radius:999px;border:2px solid #ffb4a0;background:#c0392b;color:#fff;font-size:18px;font-weight:900;box-shadow:0 0 24px rgba(255,80,60,.7);animation:gtp .5s ease-in-out infinite alternate}#gatorTap.hidden{display:none}@keyframes gtp{to{transform:translateX(-50%) scale(1.08)}}';
document.head.appendChild(tcss);
let taps=0; tapB.addEventListener('pointerdown',e=>{ e.preventDefault(); if(gs.mode!=='raid') return; taps++; Snd.splash&&Snd.splash(.6); const b=ctx.base(); P.splash(b.x+Math.sin(ctx.head())*-1.2,0,b.z-Math.cos(ctx.head())*1.2,6,.4); vib(15); if(taps>=6) gatorFlee('scare'); });
function raidOk(){ const s=sp(); return !(ctx.loc&&ctx.loc()!=='lake')&&ctx.state&&['idle','wait'].indexOf(ctx.state())>=0&&!s.yacht; }
function spawnRaid(dist){ const b=ctx.base(), s=sp(), side=Math.random()<.5?1:-1, a=ctx.head()+side*rand(.25,.7), D=dist||16;
  gP.set(b.x-Math.sin(a)*D,0,b.z-Math.cos(a)*D); inShore(gP,b.x,b.z,4); gs={mode:'raid',t:0,d:16}; taps=0;
  Snd.gator(); vib([80,60,80,60,120]); W.addRipple(gP.x,gP.z,1.2);
  if(!save.gatorTip){ save.gatorTip=1; setTimeout(()=>toast(s.kayak?'🛶 划船撞開牠！':'🪵 快拍水嚇走牠！','warn',2600),900); }   // 只在第一次遇到時提示一次   // 不用文字宣告，只靠叫聲、震動、水紋讓玩家自己察覺
  if(!s.kayak) tapB.classList.remove('hidden'); }
function gatorFlee(why){ const b=ctx.base(); tapB.classList.add('hidden'); gs={mode:'flee',t:0,dir:tv3.subVectors(gP,b).setY(0).normalize().clone(),why};
  P.splash(gP.x,0,gP.z,why==='ram'?40:22,why==='ram'?1.4:.9); W.addRipple(gP.x,gP.z,why==='ram'?1.4:.9); vib(why==='ram'?[150,40,200]:[60,40,90]);
  if(ctx.onScare) ctx.onScare(why); }
const tv3=new T.Vector3(), bow=new T.Vector3();
function updateGator(dt){
  if(gator.visible){ patchGator(); const fast=gs.mode==='chase'||gs.mode==='raid'||gs.mode==='flee', slow=gs.mode==='sink'||gs.mode==='off';
    const tf=fast?7.5:slow?1.2:3.2, ta=fast?1:slow?.15:.5; GU.uGA.value+=(ta-GU.uGA.value)*Math.min(1,dt*2.5); GU.uGT.value+=dt*tf; }
  if((W.isSea&&W.isSea())||(ctx.loc&&ctx.loc()==='ice')){ gator.visible=false; if(gs.mode==='raid') tapB.classList.add('hidden'); return; }   // 海上、冰湖沒有鱷魚
  if(gs.mode==='off'){ if(chaseDelay<0){ gTimer-=dt; if(gTimer<=0){ if(raidOk()&&Math.random()<.35) spawnRaid(); else spawnPass(); gTimer=rand(55,140); } } }
  else if(gs.mode==='raid'){ gs.t+=dt; const b=ctx.base(); tv.subVectors(b,gP); tv.y=0; const d=tv.length(); tv.normalize(); gs.d=d;
    const spd=d<4?2.6:1.2+.04*gs.t; gP.addScaledVector(tv,Math.min(d,spd*dt)); placeGator(gP,Math.atan2(tv.x,tv.z)); gator.rotation.x=d<4?-.22*Math.sin(gs.t*9):0;   // 最後 4 米撲上來
    const k=ctx.kayak?ctx.kayak():null;
    if(k&&k.on&&k.v>.55){ bow.set(b.x-Math.sin(k.yaw)*1.6,0,b.z-Math.cos(k.yaw)*1.6); if(bow.distanceTo(tv3.set(gP.x,0,gP.z))<1.7){ gator.rotation.x=0; gatorFlee('ram'); return; } }   // 獨木舟夠快撞上 → 撞開
    if(d<1.4){ gator.rotation.x=0; tapB.classList.add('hidden'); if(ctx.onBite) ctx.onBite(gP); P.splash(gP.x,0,gP.z,30,1.1); gs={mode:'leave',t:0,dir:tv.clone().negate()}; }
    if(gs.mode==='raid'&&gs.t>40){ tapB.classList.add('hidden'); gs={mode:'sink',t:0}; } }
  else if(gs.mode==='flee'){ gs.t+=dt; gP.addScaledVector(gs.dir,dt*3.2); placeGator(gP,Math.atan2(gs.dir.x,gs.dir.z)); gator.rotation.z=gs.why==='ram'&&gs.t<.8?Math.sin(gs.t*20)*.6:0;
    if(gs.t>2.4){ gator.rotation.z=0; gs={mode:'sink',t:0}; } }
  else if(gs.mode==='pass'){ gs.t+=dt; const s=gs.t/gs.dur; gP.copy(gS).lerp(gE,Math.min(1,s)); placeGator(gP,Math.atan2(gE.x-gS.x,gE.z-gS.z)); if(s>=1) gs={mode:'sink',t:0}; }
  else if(gs.mode==='chase'){ const tg=chaseGet(); tv.subVectors(tg,gP); tv.y=0; const d=tv.length(); tv.normalize();
    gP.addScaledVector(tv,Math.min(d,1.15*dt)); placeGator(gP,Math.atan2(tv.x,tv.z)); gs.d=d;
    if(d<1.1){ stolenF=true; gs={mode:'sink',t:0}; vib([100,50,150]); } }
  else if(gs.mode==='leave'){ gs.t+=dt; gP.addScaledVector(gs.dir,dt); placeGator(gP,Math.atan2(gs.dir.x,gs.dir.z)); if(gs.t>3) gs={mode:'sink',t:0}; }
  else if(gs.mode==='sink'){ gs.t+=dt; gator.position.y-=dt*.12; if(gs.t>1.6){ gator.visible=false; gs={mode:'off'}; } }
  if(gator.visible&&gs.mode!=='sink'){ const fast=gs.mode==='chase'||gs.mode==='raid'||gs.mode==='flee'; gRip-=dt; if(gRip<=0){ W.addRipple(gator.position.x,gator.position.z,fast?.3:.14); gRip=fast?.45:1.7; } }
  if(chaseDelay>0){ chaseDelay-=dt; if(chaseDelay<=0){ chaseDelay=-1; const fp=chaseGet(), s=sp();
      tv.set(fp.x-s.pos[0],0,fp.z-s.pos[1]).normalize(); const side=Math.random()<.5?1:-1;
      gP.set(fp.x+tv.x*12+tv.z*side*5,0,fp.z+tv.z*12-tv.x*side*5); inShore(gP,fp.x,fp.z,3);
      gs={mode:'chase',d:99}; toast('⚠️ 鱷魚盯上你的魚了！快收線！','bad',2400); Snd.gator(); vib([60,60,60]); } }
}

/* ---------- 老鷹 ---------- */
const eagle=new T.Group(); eagle.visible=false; S.add(eagle);
const lw=new T.Group(), rw=new T.Group();
{ const eb=new T.MeshStandardMaterial({color:0x3a2818,roughness:.8,side:T.DoubleSide}), ew=new T.MeshStandardMaterial({color:0xece6d6,roughness:.7,side:T.DoubleSide}), ey=new T.MeshStandardMaterial({color:0xe0b030,roughness:.5});
  const bd=new T.Mesh(new T.SphereGeometry(1,16,10),eb); bd.scale.set(.15,.13,.42); eagle.add(bd);
  const hd=new T.Mesh(new T.SphereGeometry(.09,12,8),ew); hd.position.set(0,.05,.42); eagle.add(hd);
  const bk=new T.Mesh(new T.ConeGeometry(.028,.09,8),ey); bk.rotation.x=Math.PI/2; bk.position.set(0,.03,.53); eagle.add(bk);
  const ts=new T.Shape(); ts.moveTo(-.05,0); ts.lineTo(-.14,-.3); ts.lineTo(.14,-.3); ts.lineTo(.05,0); const tg=new T.ShapeGeometry(ts); tg.rotateX(Math.PI/2);
  const tl=new T.Mesh(tg,ew); tl.position.set(0,0,-.36); eagle.add(tl);
  const ws=new T.Shape(); ws.moveTo(0,-.12); ws.lineTo(.45,-.2); ws.lineTo(.85,-.14); ws.lineTo(1.0,-.06); ws.lineTo(1.03,0); ws.lineTo(.97,.04); ws.lineTo(1.0,.07); ws.lineTo(.9,.1); ws.lineTo(.6,.16); ws.lineTo(.2,.18); ws.lineTo(0,.15);
  const wg=new T.ShapeGeometry(ws); wg.rotateX(Math.PI/2);
  const l=new T.Mesh(wg,eb); lw.add(l); lw.position.set(.1,.03,0); eagle.add(lw);
  const r=new T.Mesh(wg,eb); r.scale.x=-1; rw.add(r); rw.position.set(-.1,.03,0); eagle.add(rw); }
if(window.__MDL) window.__MDL.attach(eagle,'eagle',{len:.95,target:'+z'});
let ea={mode:'off'}, eTimer=rand(45,100);
const eC=new T.Vector3(), eP=new T.Vector3(), eV=new T.Vector3(), e0=new T.Vector3(), e1=new T.Vector3(), eT=new T.Vector3();
function updateEagle(dt,t){
  const s=sp(), base=tv2.set(s.pos[0],0,s.pos[1]);
  if(ea.mode==='off'){ eTimer-=dt; if(eTimer<=0){ eTimer=rand(70,160); if(W.info.day>.5&&cur.r<.5){
      eC.copy(fwd(s.head+rand(-.5,.5),tv)).multiplyScalar(rand(35,55)).add(base); ea={mode:'circle',t:0,life:rand(12,20),R:rand(22,32),ang:rand(0,6.283),dive:Math.random()<.65,yell:false}; } } return; }
  const prev=tv.copy(eP); ea.t+=dt; let flap=0;
  if(ea.mode==='circle'){ ea.ang+=dt*.28; eP.set(eC.x+Math.cos(ea.ang)*ea.R,26+Math.sin(ea.t*.5)*2,eC.z+Math.sin(ea.ang)*ea.R); flap=Math.sin(ea.t*.35)>.55?1:0;
    if(!ea.yell&&ea.t>3){ ea.yell=true; Snd.eagle(); }
    if(ea.t>ea.life){ if(ea.dive){ e0.copy(eP); eT.copy(fwd(s.head+rand(-.35,.35),eV)).multiplyScalar(rand(14,28)).add(base); eT.y=.25; ea={mode:'dive',t:0}; Snd.eagle(); }
      else { e0.copy(eP); e1.copy(eP).add(eV.set(eP.x-base.x,0,eP.z-base.z).normalize().multiplyScalar(260)); e1.y=60; ea={mode:'exit',t:0}; } } }
  else if(ea.mode==='dive'){ const k=Math.min(1,ea.t/3.2), a=(1-k)*(1-k), b=2*(1-k)*k, c=k*k;
    eP.set(a*e0.x+b*eT.x+c*eT.x, a*e0.y+b*e0.y*.55+c*eT.y, a*e0.z+b*eT.z+c*eT.z); flap=-1;
    if(k>=1){ P.splash(eT.x,0,eT.z,45,1.3); W.addRipple(eT.x,eT.z,1); Snd.splash(1); e0.copy(eT); e1.copy(eT).addScaledVector(fwd(s.head,eV),45); e1.y=32; ea={mode:'climb',t:0}; } }
  else if(ea.mode==='climb'){ const k=Math.min(1,ea.t/3.5); eP.copy(e0).lerp(e1,k*k*(3-2*k)); flap=2; if(k>=1){ e0.copy(eP); e1.copy(eP).addScaledVector(fwd(s.head,eV),220); e1.y=70; ea={mode:'exit',t:0}; } }
  else if(ea.mode==='exit'){ const k=Math.min(1,ea.t/9); eP.copy(e0).lerp(e1,k); flap=1; if(k>=1){ eagle.visible=false; ea={mode:'off'}; return; } }
  eagle.visible=true; eagle.position.copy(eP); eV.subVectors(eP,prev);
  if(eV.lengthSq()>1e-8){ eagle.lookAt(tv.copy(eP).add(eV)); if(ea.mode==='circle') eagle.rotateZ(-.35); }
  const fa=flap===-1?-.15:flap===0?Math.sin(t*1.5)*.05+.08:Math.sin(t*(flap===2?11:7))*.6;
  lw.rotation.z=fa; rw.rotation.z=-fa;
}

/* ---------- 天氣 ---------- */
let wxType=WXT[save.wxCur]?save.wxCur:'cloudy', wxT=rand(45,90);
const onIce=()=>window.__G&&window.__G.loc==='ice', SNOWN={drizzle:['小雪','🌨️'],rain:['下雪','❄️'],storm:['暴風雪','🌨️']};
const wxName=k=>onIce()&&SNOWN[k]?SNOWN[k][0]:WXT[k].n, wxEmo=k=>onIce()&&SNOWN[k]?SNOWN[k][1]:WXT[k].i;
const cur={c:WXT[wxType].c,r:WXT[wxType].r,f:WXT[wxType].f,w:WXT[wxType].w};
let windAng=Math.random()*6.283, windNow=1, wt=0;
let thT=rand(20,40), flash=0, sT=rand(3,8), lastIcon='';
const wxIcon=$id=>document.getElementById($id);
function pickWx(){ for(let k=0;k<8;k++){ const n=pickWx0(); if(n!==wxType) return n; } return 'cloudy'; }
function pickWx0(){ let r=Math.random(); if(ctx.period()==='dawn'&&r<.3) return 'fog'; r=Math.random(); for(const [k,w] of [['clear',.3],['breezy',.15],['cloudy',.18],['drizzle',.1],['rain',.12],['storm',.06],['fog',.09]]){ r-=w; if(r<=0) return k; } return 'clear'; }
let wxPend=null;
function updateWeather(dt){
  const mode=save.wxMode||'auto';
  if(mode!=='auto'&&WXT[mode]) wxType=mode;
  else { wxT-=dt; if(wxT<=0){ const n=pickWx(); if(n!==wxType){ wxType=n; const tg0=WXT[n]; wxPend={n,d0:Math.max(.05,Math.abs(tg0.c-cur.c)+Math.abs(tg0.r-cur.r)+Math.abs(tg0.f-cur.f))}; } wxT=rand(70,150); save.wxCur=wxType; } }
  const tg=WXT[wxType], k=Math.min(1,dt*.22);
  cur.c+=(tg.c-cur.c)*k; cur.r+=(tg.r-cur.r)*k; cur.f+=(tg.f-cur.f)*k;
  // 天空、雨、霧真的變化過半時才提示，不會提示「轉晴」時還在下大雨
  if(wxPend){ const d=Math.abs(tg.c-cur.c)+Math.abs(tg.r-cur.r)+Math.abs(tg.f-cur.f); if(wxPend.n!==wxType) wxPend=null; else if(d<wxPend.d0*.45){ toast('天氣轉為'+wxName(wxType)+' '+wxEmo(wxType)); wxPend=null; } }
  wt+=dt; cur.w+=(tg.w-cur.w)*k; windAng+=dt*.012*Math.sin(wt*.05);
  windNow=Math.max(0,cur.w*(1+tg.g*(Math.sin(wt*.37)*.35+Math.sin(wt*1.13+1.7)*.25+Math.sin(wt*2.9+.4)*.12)));
  W.setWind(Math.cos(windAng),Math.sin(windAng),clamp(windNow*(W.isSea&&W.isSea()?1.6:1)/12,0,1));   // 海上沒有遮蔽，風比湖上大
  W.setWeather(cur.c,cur.r,cur.f); Snd.rain(cur.r);
  if(wxType==='storm'&&cur.r>.7){ thT-=dt; if(thT<=0){ thT=rand(25,60); flash=1; setTimeout(()=>Snd.thunder(),rand(300,1600)); } }
  if(flash>0){ W.renderer.toneMappingExposure*=1+flash*(Math.random()<.5?2.2:1.2); flash=Math.max(0,flash-dt*4); }
  const ic=((W.info.day<.2&&cur.c<.4)?(window.__MOONPH?window.__MOONPH.emo():'🌙'):wxEmo(wxType))+' '+Math.round(windNow*(W.isSea&&W.isSea()?1.6:1))+'m/s'; if(ic!==lastIcon){ lastIcon=ic; const el=wxIcon('wxI'); if(el) el.textContent=ic; }
}
function updateRain(dt){
  if(cur.r<.02||(window.__G&&window.__G.loc==='ice')){ rainL.visible=false; return; }
  rainL.visible=true; W.camera.getWorldPosition(cw); rainL.position.copy(cw);
  const ws=clamp(windNow/12,0,1), wvx=Math.cos(windAng)*ws, wvz=Math.sin(windAng)*ws;
  for(let i=0;i<NR;i++){ let y=roff[i*3+1]-dt*10; roff[i*3]+=wvx*dt*6; roff[i*3+2]+=wvz*dt*6; if(roff[i*3]>10) roff[i*3]-=20; if(roff[i*3]<-10) roff[i*3]+=20; if(roff[i*3+2]>10) roff[i*3+2]-=20; if(roff[i*3+2]<-10) roff[i*3+2]+=20; if(cw.y+y<-.1) y+=14; roff[i*3+1]=y; const x=roff[i*3], z=roff[i*3+2];
    rpos[i*6]=x; rpos[i*6+1]=y; rpos[i*6+2]=z; rpos[i*6+3]=x-wvx*.35+.01; rpos[i*6+4]=y+.38; rpos[i*6+5]=z-wvz*.35; }
  rgeo.attributes.position.needsUpdate=true; rmat.opacity=.45*cur.r; rmat.color.setScalar(.75*clamp(W.info.light,.2,1));
}

const OBST=[[-33,-30,.6],[-22,-35,.6],[-36,-17,.6],[-18,-29,.6],[-29,-39,.6],[-40,-26,.6],[-24,-28,1.8]];
let padPh=0; const bladeW=new T.Vector3();
// 到了某個釣點（含划獨木舟進入該區域）才下載這裡的專屬魚模型，不在一開始全部下載
function wantSpot(i){ const id=SPOTS[i]&&SPOTS[i].id; if(!id||!window.__MDL||!window.__MDL.want) return;
  P.SPECIES.forEach(sp=>{ if(sp.spots&&sp.spots.includes(id)) window.__MDL.want(sp.id); }); }
function paddle(dt,k,ringFn){
  if(!padG) return;
  padOn+=((k>.05?1:0)-padOn)*Math.min(1,dt*(k>.05?5:2.2)); padG.visible=padOn>.01;
  const low=(1-padOn)*.6;   // 還沒完全握好時槳在畫面下方
  if(k>.05){ const prev=Math.sin(padPh); padPh+=dt*(4.5+k*2.5); const sn=Math.sin(padPh);
    padG.rotation.z=sn*.4; padG.rotation.y=Math.cos(padPh)*.3; padG.position.y=PAD_Y-low+.04-Math.abs(sn)*.05; paddleTilt.z=sn*.025*k; paddleTilt.x=-.01*k;
    if(padOn>.6&&((prev<.85&&sn>=.85)||(prev>-.85&&sn<=-.85))){ bladeW.set(sn>0?-1.25:1.25,-.25,0); padG.localToWorld(bladeW);
      P.splash(bladeW.x,0,bladeW.z,10,.6); if(ringFn) ringFn(bladeW.x,bladeW.z,.5); Snd.paddle(); } }
  else { padG.rotation.z*=.9; padG.rotation.y*=.9; padG.position.y+=(PAD_Y-low-padG.position.y)*.15; paddleTilt.z*=.9; paddleTilt.x*=.9; }
}
const padGrip=(side,out)=>padG?padG.localToWorld(out.set(side==='L'?-.28:.28,0,0)):out;   // 兩手握在槳桿中段左右
let snagRipT=0;
function update(dt,t){
  snagRipT-=dt; if(snagRipT<=0&&SNAG_RIP.length&&!(W.isSea&&W.isSea())){ snagRipT=.7+Math.random()*.9; const r=SNAG_RIP[Math.floor(Math.random()*SNAG_RIP.length)]; W.addRipple(r[0]+(Math.random()-.5)*.4,r[1]+(Math.random()-.5)*.4,.22); }   // 樹幹入水處的小漣漪
  const s=sp(), bx=s.pos[0], bz=s.pos[1];
  if(s.kayak){ const sw=W.swell(bx,bz,t)*2.2; boat.visible=true; boat.position.set(bx,sw,bz); boat.rotation.set(Math.sin(t*1.3)*.012+paddleTilt.x,s.head,Math.sin(t*1.1)*.02+paddleTilt.z);
    W.player.position.set(bx,s.eye+sw,bz); W.head.rotation.z=Math.sin(t*1.1)*.012+paddleTilt.z*.5; }
  else if(s.yacht){ boat.visible=false; const sw=W.swell(bx,bz,t)*.9; W.player.position.set(bx,s.eye+sw,bz); W.head.rotation.z=(W.swell(bx+1.5,bz,t)-W.swell(bx-1.5,bz,t))*-.12; }
  else { boat.visible=false; W.player.position.set(0,2.4,0); W.head.rotation.z=0; }
  updateWeather(dt); updateRain(dt); updateGator(dt); updateEagle(dt,t);
  gEye.emissiveIntensity=(1-W.info.day)*2.2;
  sT-=dt; if(sT<=0){ sT=rand(3,9); if(cur.r<.5){ const per=ctx.period(); if(per==='night'||per==='dusk') Snd.frog(); else Snd.bird(); } }
}
return {
  update, paddle, padOn:()=>padOn, padGrip, obstacles:OBST, setZone(i){ zoneI=i; wantSpot(i); }, zoneId:()=>SPOTS[zoneI].id, setSpot(i){ spotI=i; zoneI=i; wantSpot(i); gs={mode:'off'}; gator.visible=false; tapB.classList.add('hidden'); },
  raid:dist=>{ if(gs.mode==='off'&&raidOk()){ spawnRaid(dist); return true; } return false; }, gatorMode:()=>gs.mode,
  spotAff:id=>sp().aff[id]||1, sizeB:()=>sp().size, rareB:()=>sp().rare+.15*cur.f,
  wxAff(id){ let m=1; if(cur.r>.5&&['lmbass','smbass','channel','bowfin'].includes(id)) m*=1.3; if(cur.c>.5&&['lmbass','smbass'].includes(id)) m*=1.15; return m; },
  waitK:()=>1-.2*cur.r,
  wind:()=>({x:Math.cos(windAng),z:Math.sin(windAng),s:clamp(windNow/12,0,1),speed:windNow}),
  wx:()=>({c:cur.c,r:cur.r,f:cur.f,type:wxType}),
  onHook(fd,get){ chaseGet=get; stolenF=false; chaseDelay=(fd.sp.rar>=1&&Math.random()<.22&&!(W.isSea&&W.isSea())&&!(window.__ECO&&window.__ECO.fxOn('repel')))?rand(3,7):-1; },
  endChase(){ chaseDelay=-1; if(gs.mode==='chase'){ const s=sp(); gs={mode:'leave',t:0,dir:new T.Vector3(gP.x-s.pos[0],0,gP.z-s.pos[1]).normalize()}; } },
  stolen(){ const v=stolenF; stolenF=false; return v; },
  chaseTxt:()=>gs.mode==='chase'?`，鱷魚距離 ${Math.max(0,gs.d-1.1).toFixed(1)} m`:''
};
}
