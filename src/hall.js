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
  const floorM=new T.MeshStandardMaterial({map:woodTex([4,len/4]),color:0x9a8068,roughness:.75}), wallM=new T.MeshStandardMaterial({map:woodTex([6,len/6]),color:0x6e5440,roughness:.9}), beamM=new T.MeshStandardMaterial({color:0x3a2818,roughness:.8});
  const floor=new T.Mesh(new T.PlaneGeometry(HW*2,len+8),floorM); floor.rotation.x=-Math.PI/2; floor.position.z=-len/2+2; roomG.add(floor);
  for(const s of [-1,1]){ const w=new T.Mesh(new T.PlaneGeometry(len+8,HH),wallM); w.rotation.y=-s*Math.PI/2; w.position.set(s*HW,HH/2,-len/2+2); roomG.add(w); }
  const end=new T.Mesh(new T.PlaneGeometry(HW*2,HH),wallM); end.position.set(0,HH/2,-len-2); roomG.add(end);
  const back=new T.Mesh(new T.PlaneGeometry(HW*2,HH),wallM); back.rotation.y=Math.PI; back.position.set(0,HH/2,6); roomG.add(back);
  const ceil=new T.Mesh(new T.PlaneGeometry(HW*2,len+8),new T.MeshStandardMaterial({color:0x2a1d12,roughness:1})); ceil.rotation.x=Math.PI/2; ceil.position.set(0,HH,-len/2+2); roomG.add(ceil);
  // 屋頂桁架：每 4 公尺一道橫梁，標本就吊在下面
  for(let z=4;z>-len-2;z-=4){ const b=new T.Mesh(new T.BoxGeometry(HW*2,.35,.3),beamM); b.position.set(0,HH-.4,z); roomG.add(b); }
  for(const s of [-1,1]) { const rail=new T.Mesh(new T.BoxGeometry(.3,.35,len+8),beamM); rail.position.set(s*(HW-2.5),HH-.75,-len/2+2); roomG.add(rail); }
  // 中央走道的地毯
  const rug=new T.Mesh(new T.PlaneGeometry(2.2,len+4),new T.MeshStandardMaterial({color:0x5a1e18,roughness:1})); rug.rotation.x=-Math.PI/2; rug.position.set(0,.01,-len/2+2); roomG.add(rug); }
// 燈光：暖色的頂光加兩側補光，不開陰影（大型魚多也不會卡）
scene.add(new T.HemisphereLight(0xfff0dc,0x4a3a2a,1.5)); scene.add(new T.AmbientLight(0xffe8d0,.35)); const key=new T.DirectionalLight(0xfff2e0,1.4); key.position.set(3,10,4); scene.add(key); const fill=new T.DirectionalLight(0xbcd2ff,.45); fill.position.set(-4,6,-10); scene.add(fill);
function plate(t1,t2){ const cv=document.createElement('canvas'); cv.width=512; cv.height=160; const g=cv.getContext('2d'); g.fillStyle='#c8a050'; g.fillRect(0,0,512,160); g.strokeStyle='#6b4a1a'; g.lineWidth=8; g.strokeRect(6,6,500,148);
  g.fillStyle='#2a1a08'; g.textAlign='center'; g.font='bold 54px serif'; g.fillText(t1,256,70); g.font='32px serif'; g.fillText(t2,256,125); const tx=new T.CanvasTexture(cv); tx.encoding=T.sRGBEncoding; return tx; }
/* 依存檔的標本清單排版：一公尺以上的標本照真實長度，左右交錯吊掛 */
function layout(){ const S=window.__SAVE||{}, list=((S.home&&S.home.mounts)||[]).filter(r=>r&&r.L>=1).sort((a,b)=>b.L-a.L), M=window.__MDL, SP=(window.__PROPS&&window.__PROPS.SPECIES)||[];
  const s2=list.map(r=>r.id+r.d+r.L).join('|'); if(s2===sig&&built) return; sig=s2;
  while(fishG.children.length) fishG.remove(fishG.children[0]); items=[];
  // 左右兩排各自往裡排：每一隻佔牠的長度加 3 公尺走動空間
  const cur=[-1,-1]; list.forEach((rec,i)=>{ const side=i%2?1:-1, k=side<0?0:1, sp=SP.find(s=>s.id===rec.id); if(!sp) return; const zc=cur[k]-rec.L/2-1.5; cur[k]-=rec.L+3; items.push({rec,sp,side,z:zc}); });
  len=Math.max(24,-Math.min(cur[0],cur[1])+6); buildRoom();
  items.forEach(it=>{ const {rec,sp,side,z}=it, x=side*(HW-3.2);
    const ped=new T.Mesh(new T.BoxGeometry(1.4,1.0,.5),new T.MeshStandardMaterial({color:0x3a2416,roughness:.7})); ped.rotation.y=Math.PI/2; ped.position.set(x-side*1.8,.5,z); fishG.add(ped);
    const pl=new T.Mesh(new T.PlaneGeometry(1.3,.4),new T.MeshBasicMaterial({map:plate(sp.name,(rec.w<1?Math.round(rec.w*1000)+' g':rec.w>=100?Math.round(rec.w).toLocaleString()+' kg':rec.w.toFixed(1)+' kg')+'・'+Math.round(rec.L*100)+' cm')})); pl.rotation.order='YXZ'; pl.rotation.set(-.35,side<0?Math.PI/2:-Math.PI/2,0); pl.position.set(x-side*2.06,1.02,z); fishG.add(pl);   /* 銅牌朝向走道 */
    it.ready=false; it.x=x; place(it); }); built=true; }
function place(it){ const M=window.__MDL; if(it.ready||!M) return; if(!M.fishReady(it.sp.id)){ if(M.want) M.want(it.sp.id); return; }
  let f=null; try{ f=M.fish(it.sp); }catch(e){} if(!f||!f.group) return; const g=f.group; g.position.set(0,0,0); g.rotation.set(0,0,0); g.scale.setScalar(1); g.updateMatrixWorld(true);
  let b=new T.Box3().setFromObject(g), sz=b.getSize(new T.Vector3()); const longX=sz.x>=sz.z; g.scale.setScalar(it.rec.L/Math.max(.01,longX?sz.x:sz.z));
  // 頭朝走道深處（−z），身體側面朝走道，讓人站在走道上看到整條魚的側面
  g.rotation.y=longX?Math.PI/2:0; g.updateMatrixWorld(true); b=new T.Box3().setFromObject(g); const c=b.getCenter(new T.Vector3()), h=b.max.y-b.min.y;
  const y=Math.max(1.4+h/2,Math.min(HH-1.2-h/2,3.2+h*.15)); g.position.set(it.x-c.x,y-c.y,it.z-c.z); fishG.add(g); g.traverse(o=>{ if(o.isMesh) o.frustumCulled=false; });
  // 兩條吊繩接到屋頂桁架
  const ropeM=new T.MeshStandardMaterial({color:0x8a7a5a,roughness:.9}); for(const s of [-.3,.3]){ const top=HH-.6, bot=y+h*.35, r=new T.Mesh(new T.CylinderGeometry(.012,.012,Math.max(.1,top-bot),5),ropeM); r.position.set(it.x,(top+bot)/2,it.z+s*it.rec.L); fishG.add(r); }
  if(fishG.children.filter(o=>o.isLight).length<10){ const sp2=new T.PointLight(0xffe2b8,1.6,Math.max(8,it.rec.L*2.2),1.6); sp2.position.set(it.x-it.side*1.5,HH-1.6,it.z); fishG.add(sp2); }   /* 每一隻標本一盞暖色頂燈 */
  it.ready=true; it.y=y; }
/* 介面 */
const ui=document.createElement('div'); ui.id='hallUI'; ui.innerHTML='<div class="hn"></div><div class="hb"><button data-k="prev">◀</button><button data-k="exit">🏠 回小屋</button><button data-k="next">▶</button></div>'; document.body.appendChild(ui);
const st=document.createElement('style'); st.textContent=`#hallUI{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);z-index:30;display:none;flex-direction:column;align-items:center;gap:10px;pointer-events:none}
#hallUI .hn{padding:6px 14px;border-radius:999px;background:rgba(20,14,8,.72);color:#ffe9a8;font-size:14px;font-weight:800}#hallUI .hb{display:flex;gap:10px;pointer-events:auto}
#hallUI button{min-width:64px;padding:12px 16px;border-radius:999px;border:1px solid rgba(255,213,106,.6);background:rgba(42,31,14,.9);color:#ffe9a8;font-size:16px;font-weight:800;font-family:inherit}
body.inHall #hallUI{display:flex}body.inHall #homeUI,body.inHall #top,body.inHall #top2,body.inHall #top3,body.inHall #joy,body.inHall #bCam{display:none!important}`; document.head.appendChild(st);
const nameEl=ui.querySelector('.hn');
function focus(i){ if(!items.length){ nameEl.textContent='還沒有一公尺以上的標本'; camZT=-4; camXT=0; yawT=0; pitchT=0; return; } idx=(i+items.length)%items.length; const it=items[idx];
  // 站在走道上、正對那一隻的側面，距離依魚長拉開到整條看得到
  const d=Math.max(3,Math.min(HW*2-4.5,it.rec.L*1.35+1.5)); camXT=it.x-it.side*d; camZT=it.z; yawT=it.side<0?Math.PI/2:-Math.PI/2; pitchT=.18;
  nameEl.textContent=`${idx+1}／${items.length}　${it.sp.name}　${Math.round(it.rec.L*100)} cm`; }
ui.addEventListener('click',e=>{ const k=e.target.closest('[data-k]'); if(!k) return; const a=k.dataset.k; if(a==='exit') exit(); else focus(idx+(a==='next'?1:-1)); });
// 拖曳轉頭：在標本館裡攔下畫布的觸控，不讓小屋收到
let drag=null; const el=R.domElement;
el.addEventListener('pointerdown',e=>{ if(!on) return; drag={x:e.clientX,y:e.clientY,yaw:yawT,pitch:pitchT}; e.stopImmediatePropagation(); },true);
el.addEventListener('pointermove',e=>{ if(!on||!drag) return; yawT=drag.yaw-(e.clientX-drag.x)*.006; pitchT=Math.max(-.6,Math.min(.9,drag.pitch-(e.clientY-drag.y)*.006)); e.stopImmediatePropagation(); },true);
el.addEventListener('pointerup',e=>{ if(!on) return; drag=null; e.stopImmediatePropagation(); },true);
el.addEventListener('click',e=>{ if(on) e.stopImmediatePropagation(); },true);
function enter(){ on=true; built=false; sig=''; layout(); document.body.classList.add('inHall'); camX=camXT=0; camZ=camZT=3; yaw=yawT=0; pitch=pitchT=.1; idx=0; setTimeout(()=>focus(0),400); }
function exit(){ on=false; document.body.classList.remove('inHall'); }
function render(dt){ if(!on) return; items.forEach(it=>{ if(!it.ready) place(it); });
  const k=Math.min(1,dt*3); camX+=(camXT-camX)*k; camZ+=(camZT-camZ)*k; yaw+=(yawT-yaw)*Math.min(1,dt*6); pitch+=(pitchT-pitch)*Math.min(1,dt*6);
  const s=R.getSize(new T.Vector2()); cam.aspect=s.x/s.y; cam.fov=s.x<s.y?72:58; cam.updateProjectionMatrix();
  cam.position.set(camX,1.65,camZ); cam.rotation.order='YXZ'; cam.rotation.set(pitch,yaw,0);
  const prev=R.getRenderTarget(); R.setRenderTarget(null); R.render(scene,cam); R.setRenderTarget(prev); }
return {enter,exit,render,active:()=>on,info:()=>items.map(it=>({id:it.rec.id,ready:it.ready,x:+(it.x||0).toFixed(1),y:+(it.y||0).toFixed(1),z:+it.z.toFixed(1)})).concat([{cam:[+camX.toFixed(1),+camZ.toFixed(1)],len}])};
}
if(typeof module!=='undefined'&&module.exports) module.exports={createTrophyHall};
