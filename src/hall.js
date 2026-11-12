/* ===== 標本館：大型標本照真實大小展示的獨立大廳 =====
   小屋天花板只有 2.9 公尺，大白鯊、旗魚這類掛不下。這裡是一座 9 公尺高、長廊式的木造大廳：
   一公尺以上的標本全部照真實長度，用繩子從屋頂桁架吊起來，左右兩排沿著中央走道排開，下面立一塊名牌。
   沒有水、沒有天空與倒影，只有簡單的燈光，大型魚再多也能順順地看。
   操作：拖曳轉頭；「◀ ▶」在標本之間移動，鏡頭會滑到那一隻前面 */
function createTrophyHall(W){
'use strict';
const T=THREE, R=W.renderer, scene=new T.Scene(), cam=new T.PerspectiveCamera(60,1,.05,200);
scene.background=new T.Color(0x14100c); scene.fog=new T.Fog(0x14100c,30,90);
const HW=8, HH=9;   // 半寬、高
let built=false, on=false, len=40, items=[], idx=0, sig='', yaw=0, pitch=0, yawT=0, pitchT=0, camZ=0, camZT=0, camX=0, camXT=0;
const tl=new T.TextureLoader();
function woodTex(rep){ const t=tl.load('dock_diff.jpg'); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(rep[0],rep[1]); t.encoding=T.sRGBEncoding; return t; }
const roomG=new T.Group(), fishG=new T.Group(); scene.add(roomG,fishG);
function buildRoom(){ while(roomG.children.length) roomG.remove(roomG.children[0]);
  const floorM=new T.MeshStandardMaterial({map:woodTex([4,len/4]),color:0xc8a888,roughness:.7}), wallM=new T.MeshStandardMaterial({map:woodTex([6,len/6]),color:0xb08e6e,roughness:.85}), beamM=new T.MeshStandardMaterial({color:0x3a2818,roughness:.8});
  const floor=new T.Mesh(new T.PlaneGeometry(HW*2,len+8),floorM); floor.rotation.x=-Math.PI/2; floor.position.z=-len/2+2; roomG.add(floor);
  for(const s of [-1,1]){ const w=new T.Mesh(new T.PlaneGeometry(len+8,HH),wallM); w.rotation.y=-s*Math.PI/2; w.position.set(s*HW,HH/2,-len/2+2); roomG.add(w); }
  const end=new T.Mesh(new T.PlaneGeometry(HW*2,HH),wallM); end.position.set(0,HH/2,-len-2); roomG.add(end);
  const back=new T.Mesh(new T.PlaneGeometry(HW*2,HH),wallM); back.rotation.y=Math.PI; back.position.set(0,HH/2,6); roomG.add(back);
  const ceil=new T.Mesh(new T.PlaneGeometry(HW*2,len+8),new T.MeshStandardMaterial({color:0x2a1d12,roughness:1})); ceil.rotation.x=Math.PI/2; ceil.position.set(0,HH,-len/2+2); roomG.add(ceil);
  // 屋頂桁架：每 4 公尺一道橫梁，標本就吊在下面
  for(let z=4;z>-len-2;z-=4){ const b=new T.Mesh(new T.BoxGeometry(HW*2,.35,.3),beamM); b.position.set(0,HH-.4,z); roomG.add(b); }
  for(const s of [-1,1]) { const rail=new T.Mesh(new T.BoxGeometry(.3,.35,len+8),beamM); rail.position.set(s*(HW-2.5),HH-.75,-len/2+2); roomG.add(rail); }
  // 中央走道的地毯
  const rugT=tl.load('models/home/fabric_pattern_07_Diffuse.jpg'); rugT.wrapS=rugT.wrapT=T.RepeatWrapping; rugT.repeat.set(1.5,len/2); rugT.encoding=T.sRGBEncoding; const rug=new T.Mesh(new T.PlaneGeometry(2.2,len+4),new T.MeshStandardMaterial({color:0x3e100c,roughness:.95,bumpMap:rugT,bumpScale:.002})); rug.rotation.x=-Math.PI/2; rug.position.set(0,.01,-len/2+2); roomG.add(rug); }
// 燈光：暖色的頂光加兩側補光，不開陰影（大型魚多也不會卡）
const hemiL=new T.HemisphereLight(0xfff0dc,0x6a5440,2.1), ambL=new T.AmbientLight(0xffe8d0,.55); scene.add(hemiL,ambL); const key=new T.DirectionalLight(0xfff2e0,1.6); key.position.set(3,10,4); scene.add(key); const fill=new T.DirectionalLight(0xbcd2ff,.45); fill.position.set(-4,6,-10); scene.add(fill);
function plate(t1,t2){ const cv=document.createElement('canvas'); cv.width=512; cv.height=160; const g=cv.getContext('2d'); g.fillStyle='#c8a050'; g.fillRect(0,0,512,160); g.strokeStyle='#6b4a1a'; g.lineWidth=8; g.strokeRect(6,6,500,148);
  g.fillStyle='#2a1a08'; g.textAlign='center'; g.font='bold 54px serif'; g.fillText(t1,256,70); g.font='32px serif'; g.fillText(t2,256,125); const tx=new T.CanvasTexture(cv); tx.encoding=T.sRGBEncoding; return tx; }
const decoG=new T.Group(); scene.add(decoG); const GL=T.GLTFLoader?new T.GLTFLoader():null, mcache={};
const TAGS={sofa:'🛋️ 點沙發坐下',seat:'點腳凳坐下',shelf:'📚 點書櫃翻手記',chest:'🧰 點寶箱打開',light:'💡 點油燈開關燈'};
function tagSprite(t){ const cv=document.createElement('canvas'); cv.width=512; cv.height=112; const g=cv.getContext('2d'); g.fillStyle='rgba(20,14,8,.82)'; const r=52; g.beginPath(); g.moveTo(r,4); g.arcTo(508,4,508,108,r); g.arcTo(508,108,4,108,r); g.arcTo(4,108,4,4,r); g.arcTo(4,4,508,4,r); g.fill(); g.strokeStyle='rgba(255,213,106,.7)'; g.lineWidth=4; g.stroke();
  g.fillStyle='#ffe9a8'; g.font='bold 48px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(t,256,58); const tx=new T.CanvasTexture(cv); tx.encoding=T.sRGBEncoding;
  const sp=new T.Sprite(new T.SpriteMaterial({map:tx,depthTest:false,transparent:true})); sp.scale.set(1.1,.24,1); sp.renderOrder=10; return sp; }
const tagList=[];
function deco(name,x,y,z,ry,width,use){ if(!GL) return; const go=g=>{ const o=g.scene.clone(true); if(use) o.userData.use=use; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; if(m.material&&m.material.map) m.material.map.anisotropy=8; } });
    o.rotation.y=ry||0; o.updateMatrixWorld(true); let b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()); o.scale.setScalar(width/Math.max(.01,Math.max(sz.x,sz.z))); o.updateMatrixWorld(true); b.setFromObject(o);
    o.position.set(x-(b.min.x+b.max.x)/2,y-b.min.y,z-(b.min.z+b.max.z)/2); decoG.add(o);
    if(use&&TAGS[use]&&!(use==='light'&&name!=='vintage_oil_lamp')&&!(use==='seat'&&x>0)){ const t=tagSprite(TAGS[use]); t.position.set(x,y+(b.max.y-b.min.y)+.35,z); t.userData.ph=Math.random()*6; t.userData.use=use; t.userData.target=o; decoG.add(t); tagList.push(t); } };
  if(mcache[name]) mcache[name].then(go); else { mcache[name]=new Promise(r=>GL.load('models/home/'+name+'.glb',r,undefined,()=>{})); mcache[name].then(go); } }
/* 大廳的擺設：入口是一組沙發休息區與書櫃；走道上方每 8 公尺一盞吊燈；兩側牆上每 6 公尺一盞壁燈；盆栽、木箱、寶箱點綴 */
function furnish(){ while(decoG.children.length) decoG.remove(decoG.children[0]); tagList.length=0;
  deco('sofa_02',0,0,4.6,Math.PI,2.2,'sofa'); deco('coffee_table_round_01',0,0,3.2,0,.9); deco('Ottoman_01',-1.6,0,3.4,.4,.7,'seat'); deco('Ottoman_01',1.6,0,3.4,-.4,.7,'seat');
  deco('wooden_bookshelf_worn',-HW+.4,0,4.5,Math.PI/2,1.6,'shelf'); deco('wooden_bookshelf_worn',HW-.4,0,4.5,-Math.PI/2,1.6,'shelf');
  deco('potted_plant_01',-HW+.7,0,2.2,0,.7); deco('potted_plant_01',HW-.7,0,2.2,0,.7); deco('potted_plant_01',-HW+.7,0,-len-.8,0,.7); deco('potted_plant_01',HW-.7,0,-len-.8,0,.7);
  deco('treasure_chest',0,0,-len-1.2,0,1.2,'chest');
  deco('bronze_whale_statue',-3.0,0,1.0,Math.PI/2,1.37); deco('wine_barrel_01',3.0,0,1.0,0,.86); deco('bronze_shark_statue',3.0,.985,1.0,-Math.PI/2,.76);   /* 入口兩側：青銅鯨魚像（落地）、橡木桶上的青銅鯊魚像（實物掃描） */ deco('side_table_01',1.75,0,4.75,0,.55); deco('vintage_oil_lamp',1.75,.62,4.75,0,.22,'light');
  for(let z=0;z>-len;z-=8) deco('lantern_chandelier_01',0,HH-2.2,z,0,1.3,'light');
  for(let z=-2;z>-len;z-=6){ deco('industrial_wall_lamp',-HW+.15,3.4,z,Math.PI/2,.5); deco('industrial_wall_lamp',HW-.15,3.4,z,-Math.PI/2,.5); }
  const S=window.__SAVE||{}, pics=(S.merGift||[]).map(f=>'media/mergift/'+f); const fallback=['env_dawn_full.jpg','env_day_full.jpg','env_night_full.jpg'];
  const frameM=new T.MeshStandardMaterial({color:0x3a2412,roughness:.5,metalness:.2});
  for(let k=0;k<6;k++){ const side=k%2?1:-1, z=1.4-Math.floor(k/2)*1.9-(k>1?0:0), src=pics[k]||fallback[k%3], sq=!!pics[k], w=sq?1.1:1.6, h=sq?1.1:.8;
    const fr=new T.Mesh(new T.BoxGeometry(.06,h+.14,w+.14),frameM); fr.position.set(side*(HW-.04),2.2,z); decoG.add(fr);
    const tx=tl.load(src); tx.encoding=T.sRGBEncoding; const pic=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tx,roughness:.6})); pic.rotation.y=-side*Math.PI/2; pic.position.set(side*(HW-.075),2.2,z); decoG.add(pic); }
  for(let z=-4;z>-len;z-=12){ deco('wooden_crate_01',-HW+.6,0,z,.2,.6); deco('planter_box_01',HW-.6,0,z-3,0,.9); } }
/* 依存檔的標本清單排版：一公尺以上的標本照真實長度，左右交錯吊掛 */
function layout(){ const S=window.__SAVE||{}, list=((S.home&&S.home.mounts)||[]).filter(r=>r&&r.L>=1).sort((a,b)=>b.L-a.L), M=window.__MDL, SP=(window.__PROPS&&window.__PROPS.SPECIES)||[];
  const s2=list.map(r=>r.id+r.d+r.L).join('|'); if(s2===sig&&built) return; sig=s2;
  while(fishG.children.length) fishG.remove(fishG.children[0]); items=[];
  // 左右兩排各自往裡排：每一隻佔牠的長度加 3 公尺走動空間
  const cur=[-1,-1]; list.forEach((rec,i)=>{ const side=i%2?1:-1, k=side<0?0:1, sp=SP.find(s=>s.id===rec.id); if(!sp) return; const zc=cur[k]-rec.L/2-1.5; cur[k]-=rec.L+3; items.push({rec,sp,side,z:zc}); });
  len=Math.max(24,-Math.min(cur[0],cur[1])+6); buildRoom(); furnish();
  items.forEach(it=>{ const {rec,sp,side,z}=it, x=side*(HW-3.2);
    /* 名牌座：真實的橡木酒桶（Poly Haven wine_barrel_01，實物掃描），銅牌斜靠在桶面上。以前是用方塊拼的木箱 */
    const bx=x-side*1.8; deco('wine_barrel_01',bx,0,z,side<0?Math.PI/2:-Math.PI/2,.86);
    const pl=new T.Mesh(new T.PlaneGeometry(.8,.25),new T.MeshBasicMaterial({map:plate(sp.name,(rec.w<1?Math.round(rec.w*1000)+' g':rec.w>=100?Math.round(rec.w).toLocaleString()+' kg':rec.w.toFixed(1)+' kg')+'・'+Math.round(rec.L*100)+' cm'),side:T.DoubleSide}));
    pl.rotation.order='YXZ'; pl.rotation.set(-.5,side<0?Math.PI/2:-Math.PI/2,0); pl.position.set(bx-side*.1,1.1,z); fishG.add(pl);   /* 銅牌朝向走道 */
    const back=new T.Mesh(new T.BoxGeometry(.02,.2,.5),new T.MeshStandardMaterial({color:0x3a2416,roughness:.7})); back.position.set(bx+side*.02,1.05,z); back.rotation.z=side*.5; fishG.add(back);   /* 撐住銅牌的小木片 */
    it.ready=false; it.x=x; place(it); }); built=true; }
function place(it){ const M=window.__MDL; if(it.ready||!M) return; if(!M.fishReady(it.sp.id)){ if(M.want) M.want(it.sp.id); return; }
  let f=null; try{ f=M.fish(it.sp); }catch(e){} if(!f||!f.group) return; const g=f.group; g.position.set(0,0,0); g.rotation.set(0,0,0); g.scale.setScalar(1); g.updateMatrixWorld(true);
  let b=new T.Box3().setFromObject(g), sz=b.getSize(new T.Vector3()); const longX=sz.x>=sz.z; g.scale.setScalar(it.rec.L/Math.max(.01,longX?sz.x:sz.z));
  // 頭朝走道深處（−z），身體側面朝走道，讓人站在走道上看到整條魚的側面
  g.rotation.y=longX?Math.PI/2:0; g.updateMatrixWorld(true); b=new T.Box3().setFromObject(g); const c=b.getCenter(new T.Vector3()), h=b.max.y-b.min.y;
  const y=Math.max(1.4+h/2,Math.min(HH-1.2-h/2,3.2+h*.15)); g.position.set(it.x-c.x,y-c.y,it.z-c.z); fishG.add(g); g.traverse(o=>{ if(o.isMesh) o.frustumCulled=false; });
  // 兩條吊繩接到屋頂桁架
  // 兩條吊繩：從屋頂桁架垂直往下，打到魚身真正的表面才停（以前停在半空，跟魚沒接上）
  g.updateMatrixWorld(true); const ropeM=new T.MeshStandardMaterial({color:0x8a7a5a,roughness:.9}), rc=new T.Raycaster();
  for(const s of [-.28,.28]){ const top=HH-.6, rz=it.z+s*it.rec.L; rc.set(new T.Vector3(it.x,top,rz),new T.Vector3(0,-1,0)); const hit=rc.intersectObject(g,true)[0]; const bot=hit?hit.point.y:y;
    const r=new T.Mesh(new T.CylinderGeometry(.012,.012,Math.max(.1,top-bot),5),ropeM); r.position.set(it.x,(top+bot)/2,rz); fishG.add(r);
    const knot=new T.Mesh(new T.SphereGeometry(.035,8,6),ropeM); knot.position.set(it.x,bot+.01,rz); fishG.add(knot); }
  enrich(g);
  if(fishG.children.filter(o=>o.isSpotLight).length<10){ const top=HH-.7, dist=top-y, ang=Math.min(1.1,Math.atan((it.rec.L*.62)/Math.max(1,dist))+.12);
    const spl=new T.SpotLight(0xfff0dc,3.2,dist*2.6,ang,.45,1.2); spl.position.set(it.x-it.side*1.2,top,it.z); spl.target.position.set(it.x,y,it.z); fishG.add(spl,spl.target); spl.userData.base=3.2; lightsAll.push(spl);
    deco('hanging_industrial_lamp',spl.position.x,HH-.42-1.36,spl.position.z,0,.55); spl.position.y=HH-1.7;   /* 投射燈的燈具：真實的工業吊燈（Poly Haven hanging_industrial_lamp），從桁架垂下來，光從燈罩口打向標本。以前是一個黑色圓筒 */ }   /* 標本正上方的投射燈 */
  it.ready=true; it.y=y; }
const nmCache=new Map();
function normalFrom(tex){ if(!tex||!tex.image) return null; if(nmCache.has(tex)) return nmCache.get(tex);
  const im=tex.image, w=Math.min(1024,im.width||im.naturalWidth||0), h=Math.min(1024,im.height||im.naturalHeight||0); if(!w||!h) return null;
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const g=cv.getContext('2d'); try{ g.drawImage(im,0,0,w,h); }catch(e){ return null; }
  let d; try{ d=g.getImageData(0,0,w,h); }catch(e){ return null; } const src=d.data, L=new Float32Array(w*h); for(let i=0;i<w*h;i++) L[i]=(src[i*4]*.3+src[i*4+1]*.59+src[i*4+2]*.11)/255;
  const out=g.createImageData(w,h), o=out.data, K=2.2;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const xm=(x-1+w)%w, xp=(x+1)%w, ym=Math.max(0,y-1), yp=Math.min(h-1,y+1);
    const dx=(L[y*w+xp]-L[y*w+xm])*K, dy=(L[yp*w+x]-L[ym*w+x])*K, n=1/Math.sqrt(dx*dx+dy*dy+1), i=(y*w+x)*4; o[i]=(-dx*n*.5+.5)*255; o[i+1]=(dy*n*.5+.5)*255; o[i+2]=n*255; o[i+3]=255; }
  g.putImageData(out,0,0); const t=new T.CanvasTexture(cv); t.flipY=tex.flipY; t.wrapS=tex.wrapS; t.wrapT=tex.wrapT; t.anisotropy=8; nmCache.set(tex,t); return t; }
function enrich(g){ g.traverse(o=>{ if(!o.isMesh||!o.material) return; const mats=Array.isArray(o.material)?o.material:[o.material];
  const nm=mats.map(m=>{ const p=new T.MeshPhysicalMaterial({map:m.map||null,color:m.color?m.color.clone():new T.Color(1,1,1),roughness:.42,metalness:0,clearcoat:.7,clearcoatRoughness:.22,transparent:m.transparent,opacity:m.opacity,alphaTest:m.alphaTest||0,side:m.side,skinning:!!m.skinning});
    if(m.map){ m.map.anisotropy=8; p.normalMap=m.normalMap||normalFrom(m.map); p.normalScale=new T.Vector2(.9,.9); }
    if(m.roughnessMap) p.roughnessMap=m.roughnessMap; return p; });
  o.material=Array.isArray(o.material)?nm:nm[0]; }); }
/* 介面 */
const ui=document.createElement('div'); ui.id='hallUI'; ui.innerHTML='<div class="hj"><i></i></div><div class="ht"></div><div class="hn"></div><div class="hb"><button data-k="prev">◀</button><button data-k="exit">🏠 回小屋</button><button data-k="next">▶</button></div>'; document.body.appendChild(ui);
const st=document.createElement('style'); st.textContent=`#hallUI{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);z-index:30;display:none;flex-direction:column;align-items:center;gap:10px;pointer-events:none}
#hallUI .hj{position:fixed;left:22px;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);width:120px;height:120px;border-radius:50%;background:rgba(20,14,8,.45);border:1px solid rgba(255,213,106,.4);pointer-events:auto;touch-action:none}#hallUI .hj i{position:absolute;left:38px;top:38px;width:44px;height:44px;border-radius:50%;background:rgba(255,233,168,.75)}
#hallUI .ht{position:fixed;left:50%;top:30%;transform:translateX(-50%);max-width:84vw;padding:10px 16px;border-radius:14px;background:rgba(20,14,8,.85);color:#ffe9a8;font-size:15px;line-height:1.6;text-align:center;opacity:0;transition:opacity .4s;pointer-events:none}#hallUI .ht.on{opacity:1}
#hallUI .hn{padding:6px 14px;border-radius:999px;background:rgba(20,14,8,.72);color:#ffe9a8;font-size:14px;font-weight:800}#hallUI .hb{display:flex;gap:10px;pointer-events:auto}
#hallUI button{min-width:64px;padding:12px 16px;border-radius:999px;border:1px solid rgba(255,213,106,.6);background:rgba(42,31,14,.9);color:#ffe9a8;font-size:16px;font-weight:800;font-family:inherit}
body.inHall #hallUI{display:flex}body.inHall #homeUI,body.inHall #top,body.inHall #top2,body.inHall #top3,body.inHall #joy,body.inHall #bCam{display:none!important}`; document.head.appendChild(st);
const nameEl=ui.querySelector('.hn'), joyEl=ui.querySelector('.hj'), knob=joyEl.querySelector('i'); let joy={x:0,y:0,id:null};
function joyAt(e){ const r=joyEl.getBoundingClientRect(), dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2), d=Math.min(1,Math.hypot(dx,dy)/50), a=Math.atan2(dy,dx); joy.x=Math.cos(a)*d; joy.y=Math.sin(a)*d; knob.style.transform=`translate(${joy.x*40}px,${joy.y*40}px)`; }
joyEl.addEventListener('pointerdown',e=>{ joy.id=e.pointerId; joyEl.setPointerCapture(e.pointerId); joyAt(e); e.stopPropagation(); });
joyEl.addEventListener('pointermove',e=>{ if(joy.id===e.pointerId) joyAt(e); });
const joyEnd=e=>{ if(joy.id!==e.pointerId) return; joy.id=null; joy.x=joy.y=0; knob.style.transform=''; }; joyEl.addEventListener('pointerup',joyEnd); joyEl.addEventListener('pointercancel',joyEnd);
function focus(i){ if(!items.length){ nameEl.textContent='還沒有一公尺以上的標本'; camZT=-4; camXT=0; yawT=0; pitchT=0; return; } idx=(i+items.length)%items.length; const it=items[idx];
  // 站在走道上、正對那一隻的側面，距離依魚長拉開到整條看得到
  const d=Math.max(3,Math.min(HW*2-4.5,it.rec.L*1.35+1.5)); camXT=it.x-it.side*d; camZT=it.z; yawT=it.side<0?Math.PI/2:-Math.PI/2; pitchT=.18;
  nameEl.textContent=`${idx+1}／${items.length}　${it.sp.name}　${Math.round(it.rec.L*100)} cm`; }
ui.addEventListener('click',e=>{ const k=e.target.closest('[data-k]'); if(!k) return; const a=k.dataset.k; if(a==='exit') exit(); else focus(idx+(a==='next'?1:-1)); });
// 拖曳轉頭：在標本館裡攔下畫布的觸控，不讓小屋收到
const tipEl=ui.querySelector('.ht'); let tipT=null; function tip(t,ms){ tipEl.textContent=t; tipEl.classList.add('on'); clearTimeout(tipT); tipT=setTimeout(()=>tipEl.classList.remove('on'),ms||2800); }
let camY=1.65, camYT=1.65, seated=false, dim=false; const lightsAll=[];
function use(id,o){ const H=window.__HOME, r=(k)=>{ try{ return H&&H.furnUse?H.furnUse(k):null; }catch(e){ return null; } };
  if(id==='sofa'||id==='seat'){ const b=new T.Box3().setFromObject(o), c=b.getCenter(new T.Vector3()); camXT=c.x; camZT=c.z-(id==='sofa'?.1:0); camYT=b.min.y+(id==='sofa'?1.12:1.05); yawT=0; pitchT=.12; seated=true;
    tip(id==='sofa'?'窩進沙發，抬頭看著滿屋子的戰利品……':'坐下來歇一會兒',2600); if(id==='sofa'){ const res=r('sofa'); if(res&&res.msg) setTimeout(()=>tip(res.msg,3400),2700); } return; }
  if(id==='shelf'){ const res=r('shelf'); tip(res&&res.msg?res.msg.replace(/^📚 /,''):'書架上都是老漁人的手記',4200); return; }
  if(id==='chest'){ const res=r('chest'); tip(res&&res.msg?res.msg:'寶箱裡塞滿了老漁人的舊漁具',3400); return; }
  if(id==='light'){ dim=!dim; lightsAll.forEach(l=>{ l.intensity=l.userData.base*(dim&&!l.isSpotLight?.25:1); }); tip(dim?'燈調暗了，只剩標本上方的頂燈':'燈全開',1600); } }
function pick(e){ const r=el.getBoundingClientRect(), v=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1), rc=new T.Raycaster(); rc.setFromCamera(v,cam);
  const h=rc.intersectObject(decoG,true)[0]; if(!h||h.distance>9) return; let o=h.object; while(o&&!(o.userData&&o.userData.use)) o=o.parent; if(o) use(o.userData.use,o.userData.target||o); }
let drag=null; const el=R.domElement;
el.addEventListener('pointerdown',e=>{ if(!on) return; drag={x:e.clientX,y:e.clientY,yaw:yawT,pitch:pitchT}; e.stopImmediatePropagation(); },true);
el.addEventListener('pointermove',e=>{ if(!on||!drag) return; yawT=drag.yaw-(e.clientX-drag.x)*.006; pitchT=Math.max(-.6,Math.min(.9,drag.pitch-(e.clientY-drag.y)*.006)); e.stopImmediatePropagation(); },true);
el.addEventListener('pointerup',e=>{ if(!on) return; if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8) pick(e); drag=null; e.stopImmediatePropagation(); },true);
el.addEventListener('click',e=>{ if(on) e.stopImmediatePropagation(); },true);
const bgm=new Audio('end_piano.mp3'); bgm.loop=true; bgm.volume=0; let fadeT=null;
function fadeTo(v,stop){ clearInterval(fadeT); fadeT=setInterval(()=>{ const d=v-bgm.volume; if(Math.abs(d)<.02){ bgm.volume=v; clearInterval(fadeT); if(stop) bgm.pause(); return; } bgm.volume=Math.max(0,Math.min(1,bgm.volume+Math.sign(d)*.02)); },60); }
function music(on2){ const S=window.__SAVE||{}; if(on2&&S.sound!==false){ bgm.play().catch(()=>{}); fadeTo(.32); } else fadeTo(0,true); }
function enter(){ on=true; music(true); lightsAll.length=0; [hemiL,ambL,key,fill].forEach(l=>{ l.userData.base=l.userData.base||l.intensity; lightsAll.push(l); }); seated=false; camY=camYT=1.65; built=false; sig=''; layout(); document.body.classList.add('inHall'); camX=camXT=0; camZ=camZT=3; yaw=yawT=0; pitch=pitchT=.1; idx=0; setTimeout(()=>focus(0),400); }
function exit(){ on=false; music(false); document.body.classList.remove('inHall'); }
function render(dt){ if(!on) return; const tt=performance.now()/1000; tagList.forEach(t=>{ if(t.parent) t.position.y+=Math.sin(tt*2+t.userData.ph)*.0015; }); items.forEach(it=>{ if(!it.ready) place(it); });
  if((joy.x||joy.y)&&seated){ seated=false; camYT=1.65; }   /* 推搖桿就站起來 */
  if(joy.x||joy.y){ const sp=2.6*dt, fx=-Math.sin(yaw), fz=-Math.cos(yaw), rx=Math.cos(yaw), rz=-Math.sin(yaw);
    camXT=camX=Math.max(-HW+.8,Math.min(HW-.8,camX+(fx*-joy.y+rx*joy.x)*sp)); camZT=camZ=Math.max(-len-1.5,Math.min(5.2,camZ+(fz*-joy.y+rz*joy.x)*sp)); }
  const k=Math.min(1,dt*3); camX+=(camXT-camX)*k; camZ+=(camZT-camZ)*k; yaw+=(yawT-yaw)*Math.min(1,dt*6); pitch+=(pitchT-pitch)*Math.min(1,dt*6);
  const s=R.getSize(new T.Vector2()); cam.aspect=s.x/s.y; cam.fov=s.x<s.y?72:58; cam.updateProjectionMatrix();
  camY+=(camYT-camY)*Math.min(1,dt*3); cam.position.set(camX,camY,camZ); cam.rotation.order='YXZ'; cam.rotation.set(pitch,yaw,0);
  const prev=R.getRenderTarget(), ex=R.toneMappingExposure, tm=R.toneMapping; R.toneMapping=T.ACESFilmicToneMapping; R.toneMappingExposure=1.25; R.setRenderTarget(null); try{ R.render(scene,cam); } finally { R.toneMappingExposure=ex; R.toneMapping=tm; R.setRenderTarget(prev); } }   /* 標本館自己的曝光，不受外面晝夜影響 */
function faceUse(id){ let t=null; decoG.traverse(o=>{ if(!t&&o.userData&&o.userData.use===id) t=o; }); if(!t) return null; const c=new T.Box3().setFromObject(t).getCenter(new T.Vector3());
  camXT=camX=Math.max(-HW+.8,Math.min(HW-.8,c.x)); camZT=camZ=Math.min(5.2,c.z-3.2); yawT=yaw=Math.atan2(-(c.x-camX),-(c.z-camZ)); pitchT=pitch=-.25; cam.position.set(camX,camY,camZ); cam.rotation.set(pitch,yaw,0); cam.updateMatrixWorld(true);
  const v=c.clone().project(cam), r=el.getBoundingClientRect(); return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height}; }
return {enter,exit,render,faceUse,active:()=>on,info:()=>items.map(it=>({id:it.rec.id,ready:it.ready,x:+(it.x||0).toFixed(1),y:+(it.y||0).toFixed(1),z:+it.z.toFixed(1)})).concat([{cam:[+camX.toFixed(1),+camZ.toFixed(1)],len}])};
}
if(typeof module!=='undefined'&&module.exports) module.exports={createTrophyHall};
