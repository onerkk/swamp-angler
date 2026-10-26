/* ===== 老漁人的小屋：水族箱與標本牆（資料與規則） ===== */
function createHome(c){
'use strict';
const S=c.save;
// 水族箱等級：容量、能放的最大體長（公尺）、價格、需要等級
const TANKS=[{n:'小水族箱',cap:6,maxL:.6,price:0},{n:'大型水族箱',cap:12,maxL:1.0,price:15000},{n:'展示牆水族箱',cap:20,maxL:1.5,price:60000},{n:'水族館',cap:30,maxL:1.6,price:150000}];
const SEA_TANK={n:'海水缸',cap:6,maxL:.8,price:25000}, CHILLER={n:'冷水機',price:12000,lv:10}, MOUNT_MAX=8;
function H(){ const h=S.home=S.home||{}; h.fresh=h.fresh||[]; h.sea=h.sea||[]; h.mounts=h.mounts||[]; h.tier=h.tier||0; return h; }
// 小屋在完成主線第一章後開放（開場就說老漁人留下了小屋）
const unlocked=()=>!!(S.story&&S.story.done&&S.story.done.includes('c1'));
const tank=()=>TANKS[H().tier];
const waterOf=sp=>(sp.water||sp.loc||'lake')==='sea'?'sea':'fresh';   // 月光灣的海水魚雖然在湖區，仍要放海水缸
// 這條魚能不能帶回家：回傳是否可以、是否改做標本、原因、標本費用
function check(fd){
  const sp=fd&&fd.sp, h=H();
  if(!unlocked()) return {ok:false,why:'完成主線第一章後才能整理小屋'};
  if(!sp||fd.item||sp.special==='mermaid') return {ok:false,hide:true};
  if(sp.noSell) return {ok:false,why:'保育類只能放流，不能帶回家'};
  const sea=waterOf(sp)==='sea', t=sea?SEA_TANK:tank();
  if(sea&&!h.seaTank) return big(fd,'海水魚要先在小屋買海水缸','還沒有海水缸');
  if(!sea&&(sp.loc==='ice')&&!h.chiller) return big(fd,'冰湖的魚要先幫水族箱加裝冷水機','還沒有冷水機');
  if(fd.L>t.maxL) return big(fd,t.n+'放不下 '+Math.round(fd.L*100)+' 公分的魚','太大放不進水族箱');
  const list=sea?h.sea:h.fresh; if(list.length>=t.cap) return {ok:false,why:t.n+'已經滿了（'+t.cap+' 條），先回小屋放掉幾條'};
  return {ok:true,water:sea?'sea':'fresh'};
}
// 放不進水族箱的魚可以做成標本（要花錢：約賣價的一半）
function big(fd,why,short){ const h=H(), cost=Math.min(6000,Math.max(200,Math.round(fd.value*.5/10)*10));
  if(h.mounts.length>=MOUNT_MAX) return {ok:false,why:why+'；標本牆也掛滿了（'+MOUNT_MAX+' 個）'};
  return {ok:false,mount:true,cost,why,short}; }
const rec=(fd,spotName)=>({id:fd.sp.id,L:+fd.L.toFixed(3),w:+fd.w.toFixed(3),g:fd.grade||'',d:Date.now(),at:spotName||''});
function keep(fd,spotName){ const r=check(fd); if(!r.ok) return false; H()[r.water].push(rec(fd,spotName)); c.persist(); return true; }
function mount(fd,spotName){ const r=check(fd); if(!r.mount||S.coins<r.cost) return false; S.coins-=r.cost; H().mounts.push(rec(fd,spotName)); c.persist(); c.setCoins(); return true; }
function release(water,i){ const l=H()[water]; if(!l||!l[i]) return null; const f=l.splice(i,1)[0]; c.persist(); return f; }
function buy(what){ const h=H();
  if(what==='tier'){ const nx=TANKS[h.tier+1]; if(!nx) return '已經是最大的水族箱了'; if(S.coins<nx.price) return '金幣不夠';
    S.coins-=nx.price; h.tier++; }
  else if(what==='sea'){ if(h.seaTank) return '已經有海水缸了'; if(!S.yacht) return '有漁船、能出海之後才需要海水缸'; if(S.coins<SEA_TANK.price) return '金幣不夠'; S.coins-=SEA_TANK.price; h.seaTank=true; }
  else if(what==='chiller'){ if(h.chiller) return '已經裝了冷水機'; if(S.coins<CHILLER.price) return '金幣不夠'; S.coins-=CHILLER.price; h.chiller=true; }
  c.persist(); c.setCoins(); return ''; }
return {TANKS,SEA_TANK,CHILLER,MOUNT_MAX,unlocked,check,keep,mount,release,buy,data:H,tank};
}

/* ===== 小屋內部：第一人稱木屋場景（獨立場景，回家時改畫這裡，外面的湖照常運作） ===== */
function createHomeScene(W,c){
'use strict';
const T=THREE, R=W.renderer, scene=new T.Scene(), cam=new T.PerspectiveCamera(62,1,.05,60), TL=new T.TextureLoader();
let on=false, yaw=0, pitch=-.08, yawT=0, pitchT=-.08, drag=null, t=0;
const EYE=1.6, ROOM={x:3.2,zb:-4.2,zf:2.8,h:2.9};
// 站在房間中段：轉頭時左邊窗戶、右邊壁爐都在畫面中央
cam.position.set(0,EYE,.9); scene.background=new T.Color(0x1a120c);
// 真實木紋貼圖（碼頭用的那組），每個用途各自一份，才能設不同重複次數
const wood=(rx,ry,rot,tint)=>{ const mk=f=>{ const x=TL.load(f); x.wrapS=x.wrapT=T.RepeatWrapping; x.repeat.set(rx,ry); x.rotation=rot||0; x.anisotropy=4; return x; };
  const d=mk('dock_diff.jpg'); d.encoding=T.sRGBEncoding; return new T.MeshStandardMaterial({map:d,normalMap:mk('dock_nor.jpg'),roughnessMap:mk('dock_rough.jpg'),roughness:.85,color:tint||0xffffff}); };
const box=(w,h,d,m,x,y,z)=>{ const o=new T.Mesh(new T.BoxGeometry(w,h,d),m); o.position.set(x,y,z); scene.add(o); return o; };
const plane=(w,h,m,x,y,z,ry,rx)=>{ const o=new T.Mesh(new T.PlaneGeometry(w,h),m); o.position.set(x,y,z); o.rotation.set(rx||0,ry||0,0); scene.add(o); return o; };
const RW=ROOM.x*2, RD=ROOM.zf-ROOM.zb, H=ROOM.h, cz=(ROOM.zf+ROOM.zb)/2;
// 地板、牆、天花板
plane(RW,RD,wood(3,4,0,0xd8c0a0),0,0,cz,0,-Math.PI/2);
const wallM=wood(2,6,Math.PI/2,0xc8a888);
plane(RW,H,wallM,0,H/2,ROOM.zb,0); plane(RW,H,wallM,0,H/2,ROOM.zf,Math.PI);
plane(RD,H,wallM,ROOM.x,H/2,cz,-Math.PI/2);   // 左牆有窗，在下面分段做
plane(RW,RD,wood(2,3,0,0x9a7a5a),0,H,cz,0,Math.PI/2);
// 屋樑、牆角柱、踢腳板
const beamM=wood(.5,3,Math.PI/2,0x8a6040);
for(let z=ROOM.zb+.6;z<ROOM.zf;z+=1.3) box(RW,.18,.16,beamM,0,H-.09,z);
for(const x of [-ROOM.x+.08,ROOM.x-.08]) for(const z of [ROOM.zb+.08,ROOM.zf-.08]) box(.16,H,.16,beamM,x,H/2,z);
const trimM=new T.MeshStandardMaterial({color:0x5a3e28,roughness:.7});
box(RW,.12,.03,trimM,0,.06,ROOM.zb+.015); box(.03,.12,RD,trimM,-ROOM.x+.015,.06,cz); box(.03,.12,RD,trimM,ROOM.x-.015,.06,cz);
// 窗戶（左牆）：窗外是真實湖景全景，依時段換成白天／黃昏／夜晚
const WIN={w:1.6,h:1.1,y:1.55,z:.5}, winTex={}; ['day','dawn','night'].forEach(k=>{ const x=TL.load('env_'+k+'_band.jpg'); x.encoding=T.sRGBEncoding; winTex[k]=x; });
const viewM=new T.MeshBasicMaterial({map:winTex.day}); const view=plane(WIN.w*1.6,WIN.h*1.6,viewM,-ROOM.x-.6,WIN.y,WIN.z,Math.PI/2);
{ // 左牆分成窗戶上、下、前、後四塊，窗戶位置真的留空，才看得到窗外
  const yb=WIN.y-WIN.h/2, yt=WIN.y+WIN.h/2, z0=WIN.z-WIN.w/2, z1=WIN.z+WIN.w/2, X=-ROOM.x, r=Math.PI/2;
  plane(RD,yb,wallM,X,yb/2,cz,r); plane(RD,H-yt,wallM,X,(yt+H)/2,cz,r);
  plane(z0-ROOM.zb,WIN.h,wallM,X,WIN.y,(ROOM.zb+z0)/2,r); plane(ROOM.zf-z1,WIN.h,wallM,X,WIN.y,(z1+ROOM.zf)/2,r);
  plane(.3,WIN.h,wallM,X-.15,WIN.y,z0,0); plane(.3,WIN.h,wallM,X-.15,WIN.y,z1,Math.PI); }   // 窗框兩側的牆厚
const frameM=new T.MeshStandardMaterial({color:0xe8dcc8,roughness:.6});
box(.08,.08,WIN.w+.16,frameM,-ROOM.x+.04,WIN.y+WIN.h/2+.04,WIN.z); box(.12,.06,WIN.w+.24,frameM,-ROOM.x+.06,WIN.y-WIN.h/2-.03,WIN.z);
box(.08,WIN.h,.08,frameM,-ROOM.x+.04,WIN.y,WIN.z-WIN.w/2-.04); box(.08,WIN.h,.08,frameM,-ROOM.x+.04,WIN.y,WIN.z+WIN.w/2+.04);
box(.04,WIN.h,.04,frameM,-ROOM.x+.03,WIN.y,WIN.z); box(.04,.04,WIN.w,frameM,-ROOM.x+.03,WIN.y,WIN.z);
// 壁爐（右牆）：石砌、爐火會閃爍
// 壁爐：真實石牆貼圖（Poly Haven castle_brick_07，CC0）
const pbr=(name,rx,ry,extra)=>{ const mk=f=>{ const x=TL.load('models/home/'+name+'_'+f+'.jpg'); x.wrapS=x.wrapT=T.RepeatWrapping; x.repeat.set(rx,ry); x.anisotropy=4; return x; };
  const d=mk('Diffuse'); d.encoding=T.sRGBEncoding; return new T.MeshStandardMaterial(Object.assign({map:d,normalMap:mk('nor_gl'),roughnessMap:mk('Rough'),roughness:1},extra||{})); };
const stoneM=pbr('castle_brick_07',1.2,1.2);
// 壁爐（右牆）：左右石柱＋上方石樑，中間是真的爐口，爐火會閃爍
const FP={z:.5}, FX=ROOM.x-.28;
const fpParts=[];
box(.55,1.3,.32,stoneM,FX,.65,FP.z-.66); box(.55,1.3,.32,stoneM,FX,.65,FP.z+.66);
box(.55,.5,1.0,stoneM,FX,1.05,FP.z); box(.45,1.6,1.0,stoneM,ROOM.x-.22,2.1,FP.z);
box(.75,.08,1.9,new T.MeshStandardMaterial({color:0x5a4030,roughness:.8}),ROOM.x-.36,1.34,FP.z);
box(.06,.8,1.0,new T.MeshBasicMaterial({color:0x0a0604}),ROOM.x-.04,.4,FP.z);   // 爐口後壁燻黑，不受光
box(.9,.06,1.8,stoneM,ROOM.x-.45,.03,FP.z);
// 火焰貼圖：底部亮黃、往上變橘紅再透明，兩片交叉擺放
const flameTex=(()=>{ const cv=document.createElement('canvas'); cv.width=128; cv.height=128; const g=cv.getContext('2d');
  for(let i=0;i<5;i++){ const x=20+i*22, gr=g.createRadialGradient(x,118,2,x,80,46); gr.addColorStop(0,'rgba(255,240,170,1)'); gr.addColorStop(.35,'rgba(255,150,40,.9)'); gr.addColorStop(.7,'rgba(200,50,10,.5)'); gr.addColorStop(1,'rgba(120,20,0,0)');
    g.fillStyle=gr; g.beginPath(); g.ellipse(x,85,20,44,0,0,Math.PI*2); g.fill(); }
  const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return t; })();
const fireM=new T.MeshBasicMaterial({map:flameTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
const fire=plane(.8,.55,fireM,ROOM.x-.3,.42,FP.z,-Math.PI/2); fpParts.push(fire); plane(.7,.5,fireM,ROOM.x-.3,.4,FP.z,-Math.PI/2+.6);
for(let i=0;i<3;i++){ const lg=new T.Mesh(new T.CylinderGeometry(.06,.06,.7,8),new T.MeshStandardMaterial({color:0x3a2416,roughness:.9})); lg.rotation.x=Math.PI/2; lg.position.set(ROOM.x-.3,.13+(i===2?.1:0),FP.z+(i-1)*.12); scene.add(lg); }
const fireL=new T.PointLight(0xff8a40,2.2,9,1.3); fireL.position.set(ROOM.x-1.1,.6,FP.z); scene.add(fireL);
// 家具：Poly Haven 真實模型（CC0），回家時才載入。位置以房間中央偏後的客廳區為主
const GL=new T.GLTFLoader(), mcache={}, glowM=[];
const ART={hanging_picture_frame_01:'mermaid_a.jpg',hanging_picture_frame_02:'mermaid_a.jpg'};
function put(name,x,y,z,ry,sc,fn){ const place=g=>{ const o=g.scene.clone(true); o.position.set(x,y,z); o.rotation.y=ry||0; o.scale.setScalar(sc||1);
    o.traverse(m=>{ if(!m.isMesh) return; m.frustumCulled=false; const mats=Array.isArray(m.material)?m.material:[m.material];
      mats.forEach((mm,i)=>{ if(!mm) return; if(mm.map) mm.map.anisotropy=4;
        if(/_artwork$/.test(mm.name)&&ART[name]){ const nm=mm.clone(); const tx=TL.load(ART[name]); tx.encoding=T.sRGBEncoding; nm.map=tx; nm.color.set(0xffffff); if(Array.isArray(m.material)) m.material[i]=nm; else m.material=nm; }
        if(/_glass$/.test(mm.name)){ const nm=new T.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.12,roughness:.05,metalness:0,depthWrite:false}); if(Array.isArray(m.material)) m.material[i]=nm; else m.material=nm; }
        if(/_lamp$/.test(mm.name)){ const nm=mm.clone(); nm.emissive=new T.Color(0xffd080); nm.emissiveIntensity=1.2; if(Array.isArray(m.material)) m.material[i]=nm; else m.material=nm; glowM.push(nm); } }); });
    scene.add(o); if(fn) fn(o); };
  if(mcache[name]) place(mcache[name]); else GL.load('models/home/'+name+'.glb',g=>{ mcache[name]=g; place(g); },undefined,()=>console.warn('home model',name)); }
const LV={x:-.9,z:-1.9};
// 地毯：真實織物貼圖
plane(2.8,2.0,pbr('fabric_pattern_07',2.2,1.6,{color:0xb86a48}),LV.x+.5,.006,LV.z,0,-Math.PI/2);
put('sofa_02',LV.x-1.0,0,LV.z,Math.PI/2,1);                 // 沙發靠左、面向房間中央
put('throw_pillows_01',LV.x-1.0,.42,LV.z+.1,Math.PI/2,.9);
put('coffee_table_round_01',LV.x+.5,0,LV.z,0,.85);
put('book_encyclopedia_set_01',LV.x+.5,.42,LV.z+.15,.3,.8);   // 老漁人的手記那一疊書
put('vintage_oil_lamp',LV.x+.2,.42,LV.z-.3,0,.8);
put('Rockingchair_01',1.7,-.1,-1.6,-Math.PI/2+.4,1);        // 搖椅在右側、斜對壁爐
put('wooden_bookshelf_worn',-ROOM.x+.32,0,-2.2,Math.PI/2,1); // 書架靠左牆
put('potted_plant_01',-2.5,0,ROOM.zb+.5,0,.9);               // 盆栽在左後角落
put('treasure_chest',2.4,0,ROOM.zb+.45,-.5,.8);              // 寶箱在右後角落（老漁人的漁具箱）
put('mantel_clock_01',ROOM.x-.36,1.38,FP.z+.45,-Math.PI/2,1);  // 壁爐架上：時鐘與木燈籠
put('wooden_lantern_01',ROOM.x-.36,1.38,FP.z-.5,0,.8);
put('hanging_picture_frame_01',-ROOM.x+.02,1.95,-1.0,Math.PI/2,1);   // 掛畫：左牆、水族箱上方
put('hanging_picture_frame_02',0,2.5,ROOM.zb+.02,0,1);
// 燈光：天花板鐵藝吊燈、水族箱兩側壁燈，夜裡全部點亮
put('lantern_chandelier_01',0,H-.02,-1.6,0,1);
const ceilL=new T.PointLight(0xffd9a8,2.4,14,1.0); ceilL.position.set(0,H-.95,-1.6); scene.add(ceilL);
const wallLs=[];
for(const x of [-2.85,2.85]){ put('industrial_wall_lamp',x,2.05,ROOM.zb+.06,0,1); const wl=new T.PointLight(0xffe2b8,1.3,7,1.2); wl.position.set(x,1.9,ROOM.zb+.4); scene.add(wl); wallLs.push(wl); }
const lampL=new T.PointLight(0xffd8a0,1.2,5,1.4); lampL.position.set(LV.x+.2,.9,LV.z-.3); scene.add(lampL);   // 煤油燈

// 水族箱：尺寸跟著等級變；淡水缸在後牆中央，有海水缸時放在右側
const TSPEC=[{w:1.2,h:.6,d:.45,st:.85},{w:1.8,h:.75,d:.55,st:.85},{w:2.6,h:1.0,d:.7,st:.7},{w:3.4,h:1.2,d:.8,st:.55}], SEA_SPEC={w:1.25,h:.62,d:.5,st:.85};
const sandTex={fresh:pbr('clean_pebbles',2,1),sea:pbr('coral_gravel',2,1)};
const rockM=new T.MeshStandardMaterial({color:0x6a665e,roughness:.95});
// 缸背景：深色漸層＋從水面斜射下來的光束＋遠處朦朧的石影，像真正造景缸的背景
const bgTex=(sea)=>{ const cv=document.createElement('canvas'); cv.width=512; cv.height=256; const g=cv.getContext('2d'), gr=g.createLinearGradient(0,0,0,256);
  gr.addColorStop(0,sea?'#2a8ab8':'#2e7a72'); gr.addColorStop(.5,sea?'#0f3f6e':'#123f3f'); gr.addColorStop(1,sea?'#061a30':'#07201f'); g.fillStyle=gr; g.fillRect(0,0,512,256);
  for(let i=0;i<9;i++){ const x=40+i*52+Math.random()*30, w=18+Math.random()*26; const lg=g.createLinearGradient(x,0,x+40,256); lg.addColorStop(0,'rgba(220,245,255,.22)'); lg.addColorStop(.55,'rgba(200,235,255,.05)'); lg.addColorStop(1,'rgba(200,235,255,0)');
    g.fillStyle=lg; g.beginPath(); g.moveTo(x,0); g.lineTo(x+w,0); g.lineTo(x+w+60,256); g.lineTo(x+40,256); g.closePath(); g.fill(); }
  for(let i=0;i<7;i++){ const x=Math.random()*512, r=40+Math.random()*70; const rg=g.createRadialGradient(x,250,0,x,250,r); rg.addColorStop(0,'rgba(0,0,0,.35)'); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=rg; g.fillRect(x-r,250-r,r*2,r*2); }
  const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return t; };
// 圓形柔光氣泡
const bubTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), rg=g.createRadialGradient(13,12,1,16,16,15); rg.addColorStop(0,'rgba(255,255,255,.95)'); rg.addColorStop(.45,'rgba(220,245,255,.35)'); rg.addColorStop(.8,'rgba(200,235,255,.5)'); rg.addColorStop(1,'rgba(200,235,255,0)'); g.fillStyle=rg; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
// 沙底的水波光影（焦散）
const causTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=256; const g=cv.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,256,256); g.strokeStyle='rgba(255,255,255,.9)'; g.lineWidth=2.2;
  for(let i=0;i<28;i++){ g.beginPath(); const x0=Math.random()*256, y0=Math.random()*256; g.moveTo(x0,y0); for(let k=0;k<5;k++) g.quadraticCurveTo(Math.random()*256,Math.random()*256,Math.random()*256,Math.random()*256); g.stroke(); }
  const t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; return t; })();
const BG={fresh:bgTex(false),sea:bgTex(true)};
// tanks 依水質存放每個缸：群組、尺寸、位置、魚、水草、氣泡
const tanks={}, causList=[], tv2=new T.Vector3(), tv3=new T.Vector3();
function buildTank(water,spec,x){
  const old=tanks[water]; if(old){ scene.remove(old.g); old.fish.forEach(f=>{}); }
  const g=new T.Group(), z=ROOM.zb+spec.d/2+.08, y=spec.st||.85, STAND=y; g.position.set(x,0,z); scene.add(g);
  const add=(geo,m,px,py,pz)=>{ const o=new T.Mesh(geo,m); o.position.set(px,py,pz); g.add(o); return o; };
  add(new T.BoxGeometry(spec.w+.1,STAND,spec.d+.08),wood(1,1,0,0x6a4630),0,STAND/2,0);
  add(new T.PlaneGeometry(spec.w-.02,spec.h-.02),new T.MeshBasicMaterial({map:BG[water]}),0,y+spec.h/2,-spec.d/2+.012);
  add(new T.BoxGeometry(spec.w-.02,.07,spec.d-.02),sandTex[water],0,y+.035,0);
  for(let i=0;i<2+Math.round(spec.w*1.5);i++){ const px=(Math.random()-.5)*(spec.w-.3), pz=-spec.d/2+.1+Math.random()*spec.d*.3, sc=.025+Math.random()*.025; GL.load('rock_moss_set_01.glb',gg=>{ const o=gg.scene.clone(true); o.position.set(px,y+.06,pz); o.rotation.y=Math.random()*6; o.scale.setScalar(sc); o.traverse(m=>{ m.frustumCulled=false; }); g.add(o); }); }
  const plants=[];
  // 水草：遊戲裡的真實蕨類模型縮小當作水草；沉木用枯枝模型
  const K=Math.round(spec.w*4); for(let i=0;i<K;i++){ const ph=Math.random()*6, side=i%3===0, px=side?(Math.random()<.5?-1:1)*(spec.w/2-.12-Math.random()*.15):(Math.random()-.5)*(spec.w-.3), pz=-spec.d/2+.06+Math.random()*spec.d*(side?.8:.45), sc=(side?.22:.14)+Math.random()*.16;
    GL.load('fern_02.glb',gg=>{ const o=gg.scene.clone(true); o.position.set(px,y+.06,pz); o.rotation.y=Math.random()*6; o.scale.setScalar(sc); o.traverse(m=>{ m.frustumCulled=false; }); g.add(o); plants.push({o,ph}); }); }
  const woods=spec.w>2.5?[[-.3,-.1,.6,.3],[.28,.05,2.6,.26]]:spec.w>1.1?[[-.22,-.1,.6,.28]]:[];
  woods.forEach(([fx,fz,ry,sc])=>GL.load('dry_branches_medium_01.glb',gg=>{ const o=gg.scene.clone(true); o.position.set(spec.w*fx,y+.07,spec.d*fz); o.rotation.set(0,ry,0); o.scale.setScalar(sc); o.traverse(m=>{ m.frustumCulled=false; }); g.add(o); }));
  if(spec.w>1.6) for(const fx of (spec.w>2.5?[-.38,.1,.4]:[.3])) GL.load('rock_moss_set_01.glb',gg=>{ const o=gg.scene.clone(true); o.position.set(spec.w*fx,y+.06,-spec.d*.2); o.rotation.y=Math.random()*6; o.scale.setScalar(.07); o.traverse(m=>{ m.frustumCulled=false; }); g.add(o); });
  const NB=30, bp=new Float32Array(NB*3); for(let i=0;i<NB;i++){ bp[i*3]=(Math.random()-.5)*spec.w*.8; bp[i*3+1]=y+Math.random()*spec.h; bp[i*3+2]=(Math.random()-.5)*spec.d*.6; }
  const bg=new T.BufferGeometry(); bg.setAttribute('position',new T.BufferAttribute(bp,3));
  const bub=new T.Points(bg,new T.PointsMaterial({map:bubTex,color:0xeaf8ff,size:.028,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending})); g.add(bub);
  // 沙底焦散：兩層慢慢漂移的水波光影
  const cm=new T.MeshBasicMaterial({map:causTex,transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false,color:water==='sea'?0x9fdcff:0xbfeedd});
  const ca=add(new T.PlaneGeometry(spec.w-.04,spec.d-.04).rotateX(-Math.PI/2),cm,0,y+.075,0); ca.renderOrder=2; causList.push({m:cm,s:spec.w});
  // 水面：缸內水面有一層細微的反光
  const sm=new T.MeshStandardMaterial({color:0xcfefff,transparent:true,opacity:.22,roughness:.05,metalness:.5,side:T.DoubleSide,depthWrite:false});
  add(new T.PlaneGeometry(spec.w-.04,spec.d-.04).rotateX(-Math.PI/2),sm,0,y+spec.h-.07,0).renderOrder=3;
  const waterM=new T.MeshStandardMaterial({color:water==='sea'?0x0a4a7a:0x0e4a4a,transparent:true,opacity:.14,roughness:.1,depthWrite:false});   // 水體只輕輕染色，不要把整缸刷淡
  const wv=add(new T.BoxGeometry(spec.w-.02,spec.h-.08,spec.d-.02),waterM,0,y+(spec.h-.08)/2,0); wv.renderOrder=3;
  const gl=add(new T.BoxGeometry(spec.w,spec.h,spec.d),new T.MeshStandardMaterial({color:0xdff4ff,transparent:true,opacity:.05,roughness:.05,metalness:.1,depthWrite:false}),0,y+spec.h/2,0); gl.renderOrder=4; gl.userData.tank=water;
  const fr=new T.MeshStandardMaterial({color:0x14110e,roughness:.45,metalness:.3});
  add(new T.BoxGeometry(spec.w+.04,.05,spec.d+.04),fr,0,y+spec.h+.025,0); add(new T.BoxGeometry(spec.w+.04,.04,spec.d+.04),fr,0,y+.02,0);
  for(const sx of [-1,1]) add(new T.BoxGeometry(.03,spec.h,.03),fr,sx*spec.w/2,y+spec.h/2,spec.d/2);
  add(new T.BoxGeometry(spec.w-.1,.03,.06),new T.MeshBasicMaterial({color:0xcfe8ff}),0,y+spec.h-.02,0);
  if(spec.w>2.5){ const L2=new T.PointLight(0x9ad8ff,.6,3,1.4); L2.position.set(-spec.w*.3,y+spec.h-.05,0); g.add(L2); const L3=L2.clone(); L3.position.x=spec.w*.3; g.add(L3); }
  const L=new T.PointLight(water==='sea'?0x8ad0ff:0x9ad8ff,.75,3,1.4); L.position.set(0,y+spec.h-.05,0); g.add(L);
  tanks[water]={g,spec,x,y,z,fish:[],plants,bub,glass:gl,sig:''};
}
// 把水族箱裡記錄的魚做成會游的模型（用遊戲同一個魚模型，按實際體長縮放）
function fishObj(rec){ const sp=c.species(rec.id); if(!sp) return null; const src=c.getFish(sp).group.clone(true); src.position.set(0,0,0); src.rotation.set(0,0,0); src.scale.setScalar(1); src.visible=true;
  src.traverse(o=>{ o.visible=true; o.frustumCulled=false; if(o.isMesh&&o.material){ const mats=Array.isArray(o.material)?o.material:[o.material];
      const nm=mats.map(m=>{ const k=m.clone(); k.onBeforeCompile=()=>{}; k.customProgramCacheKey=()=>'tank'; k.transparent=false; k.opacity=1; k.depthWrite=true; k.needsUpdate=true; return k; });
      o.material=Array.isArray(o.material)?nm:nm[0]; o.renderOrder=1; } }); const w=new T.Group(); w.add(src); w.scale.setScalar(rec.L); w.userData.rec=rec; w.userData.real=c.isReal(rec.id); return w; }
function bounds(tk,L){ const s=tk.spec, m=Math.min(L*.55,s.w*.4); return {x0:-s.w/2+m+.03,x1:s.w/2-m-.03,y0:tk.y+.1+L*.12,y1:tk.y+s.h-.1-L*.12,z0:-s.d/2+.06+L*.12,z1:s.d/2-.06-L*.12}; }
function pickTarget(f,tk){ const b=bounds(tk,f.rec.L), r=(a,b)=>a+Math.random()*Math.max(0,b-a); f.tgt.set(r(b.x0,b.x1),r(b.y0,b.y1),r(Math.min(b.z0,b.z1),Math.max(b.z0,b.z1))); }
function syncFish(){ const hd=c.data(), want={fresh:hd.fresh,sea:hd.seaTank?hd.sea:[]};
  const tierSig='t'+hd.tier+(hd.seaTank?'s':'');
  if(tanks._tier!==tierSig){ tanks._tier=tierSig; buildTank('fresh',TSPEC[hd.tier]||TSPEC[0],hd.seaTank?(hd.tier>=3?-.75:-.55):0); if(hd.seaTank) buildTank('sea',SEA_SPEC,2.25); else if(tanks.sea){ scene.remove(tanks.sea.g); delete tanks.sea; } }
  for(const w of ['fresh','sea']){ const tk=tanks[w]; if(!tk) continue; const list=want[w]||[], sig=list.map(r=>r.id+r.d+(c.isReal(r.id)?'r':'')).join('|');
    if(sig===tk.sig) continue; tk.sig=sig; tk.fish.forEach(f=>tk.g.remove(f.o)); tk.fish=[];
    list.forEach(rec=>{ try{ c.want(rec.id); const o=fishObj(rec); if(!o) return; const f={o,rec,tgt:new T.Vector3(),sp:.05+Math.random()*.06,ph:Math.random()*6}; const b=bounds(tk,rec.L);
      o.position.set(b.x0+Math.random()*(b.x1-b.x0),b.y0+Math.random()*(b.y1-b.y0),(Math.random()-.5)*.1); o.rotation.y=Math.random()<.5?0:Math.PI; pickTarget(f,tk); tk.g.add(o); tk.fish.push(f);
      }catch(err){ console.error('tank fish',rec&&rec.id,err); } }); } }
// 標本牆：右牆、壁爐後方，兩排各四個；大魚統一縮到木板放得下的長度
const MSLOT=[]; for(const y of [1.5,2.15]) for(const z of [-3.65,-2.85,-2.05,-1.25]) MSLOT.push({y,z});   // 先掛視線高度那一排
const mountG=new T.Group(); scene.add(mountG); let mountSig='';
const plaqueM=new T.MeshStandardMaterial({color:0x3a2416,roughness:.6}), plaqueEdge=new T.MeshStandardMaterial({color:0x8a6a3a,roughness:.4,metalness:.3});
function nameTex(t1,t2){ const cv=document.createElement('canvas'); cv.width=256; cv.height=64; const g=cv.getContext('2d');
  g.fillStyle='#c8a050'; g.fillRect(0,0,256,64); g.fillStyle='#3a2410'; g.font='bold 24px sans-serif'; g.textAlign='center'; g.fillText(t1,128,28); g.font='18px sans-serif'; g.fillText(t2,128,54);
  const tx=new T.CanvasTexture(cv); tx.encoding=T.sRGBEncoding; return tx; }
function syncMounts(){ const list=c.data().mounts, sig=list.map(r=>r.id+r.d+(c.isReal(r.id)?'r':'')).join('|'); if(sig===mountSig) return; mountSig=sig;
  while(mountG.children.length) mountG.remove(mountG.children[0]);
  list.slice(0,MSLOT.length).forEach((rec,i)=>{ try{ const sl=MSLOT[i], sp=c.species(rec.id); if(!sp) return; c.want(rec.id);
    const b=new T.Mesh(new T.BoxGeometry(.04,.48,.62),plaqueM); b.position.set(ROOM.x-.03,sl.y,sl.z); mountG.add(b);
    const e=new T.Mesh(new T.BoxGeometry(.02,.52,.66),plaqueEdge); e.position.set(ROOM.x-.015,sl.y,sl.z); mountG.add(e);
    const f=fishObj(rec); if(f){ f.scale.setScalar(.56); f.rotation.set(0,-Math.PI/2,0); f.position.set(ROOM.x-.13,sl.y+.04,sl.z); f.userData.rec=rec; mountG.add(f); }
    const np=new T.Mesh(new T.PlaneGeometry(.36,.09),new T.MeshBasicMaterial({map:nameTex(sp.name,(rec.w<1?Math.round(rec.w*1000)+' g':rec.w.toFixed(1)+' kg')+'・'+new Date(rec.d).toLocaleDateString('zh-TW'))}));
    np.position.set(ROOM.x-.055,sl.y-.2,sl.z); np.rotation.y=-Math.PI/2; mountG.add(np);
    }catch(err){ console.error('mount',rec&&rec.id,err); } }); }   // 單一個標本出錯就跳過，不影響其他東西
const tv=new T.Vector3();
function updTanks(dt){ for(const w of ['fresh','sea']){ const tk=tanks[w]; if(!tk) continue;
  tk.plants.forEach(p=>{ p.o.rotation.z=Math.sin(t*1.2+p.ph)*.06; p.o.rotation.x=Math.sin(t*.9+p.ph)*.04; });
  causList.forEach(c2=>{ c2.m.map.offset.set(t*.012,t*.009); c2.m.map.repeat.set(c2.s*1.6,1.2); });
  const bp=tk.bub.geometry.attributes.position; for(let i=0;i<bp.count;i++){ let yy=bp.getY(i)+dt*(.12+(i%5)*.03); if(yy>tk.y+tk.spec.h-.06) yy=tk.y+.08; bp.setY(i,yy); } bp.needsUpdate=true;
  const fs=tk.fish;
  fs.forEach(f=>{ const o=f.o; f.v=f.v||0; f.rest=f.rest||0;
    // 偶爾停下來懸浮一會兒
    if(f.rest>0){ f.rest-=dt; f.v+=(0.015-f.v)*Math.min(1,dt*2); }
    else if(Math.random()<dt*.06){ f.rest=1.5+Math.random()*3; }
    tv.subVectors(f.tgt,o.position); const d=tv.length(); if(d<.06){ pickTarget(f,tk); }
    tv.normalize();
    // 跟其他魚保持距離
    fs.forEach(g2=>{ if(g2===f) return; tv2.subVectors(o.position,g2.o.position); const dd=tv2.length(), need=(f.rec.L+g2.rec.L)*.45; if(dd<need&&dd>1e-4){ tv.addScaledVector(tv2.normalize(),(need-dd)/need*1.5); } });
    tv.y*=.6; tv.normalize();
    const want=Math.atan2(-tv.z,tv.x); let dy=want-o.rotation.y; while(dy>Math.PI) dy-=Math.PI*2; while(dy<-Math.PI) dy+=Math.PI*2;
    const turn=Math.min(1,dt*(0.9+f.rec.L*.5)); o.rotation.y+=dy*turn;
    const vmax=f.sp*Math.min(1,.5+f.rec.L*2)*(Math.abs(dy)>1.2?.25:1); if(f.rest<=0) f.v+=(vmax-f.v)*Math.min(1,dt*1.2);
    // 身體隨速度輕微擺動與傾斜（整體小幅擺尾，不會變形）
    const wag=Math.sin(t*(4+f.v*30)+f.ph); o.rotation.y+=wag*.025*Math.min(1,f.v*12)*dt*60/60; o.rotation.z=wag*.04*Math.min(1,f.v*12)+Math.max(-.35,Math.min(.35,tv.y*.5))*-Math.cos(o.rotation.y);
    o.rotation.x=Math.max(-.3,Math.min(.3,-tv.y*.4*Math.sin(o.rotation.y)));
    const fwd=tv3.set(Math.cos(o.rotation.y),tv.y*.6,-Math.sin(o.rotation.y)).normalize(); o.position.addScaledVector(fwd,f.v*dt);
    const b=bounds(tk,f.rec.L); o.position.x=Math.max(b.x0,Math.min(b.x1,o.position.x)); o.position.y=Math.max(b.y0,Math.min(b.y1,o.position.y)); o.position.z=Math.max(Math.min(b.z0,b.z1),Math.min(Math.max(b.z0,b.z1),o.position.z)); }); } }
// 環境光：白天從窗戶進來的光多、夜裡靠爐火和檯燈
const hemi=new T.HemisphereLight(0xfff0dd,0x3a2a1a,.5); scene.add(hemi);
const sun=new T.DirectionalLight(0xfff4e0,.8); sun.position.set(-6,4,-1); sun.target.position.set(0,0,-1); scene.add(sun,sun.target);
function daylight(){ const h=((c.hour()%24)+24)%24; return Math.max(0,Math.min(1,Math.min(h-5.5,19-h)/2)); }
function syncTime(){ const dl=daylight(), h=((c.hour()%24)+24)%24;
  viewM.map=dl>.6?winTex.day:dl>.05?winTex.dawn:winTex.night; viewM.needsUpdate=true; viewM.color.setScalar(.35+.65*dl);
  hemi.intensity=.75+.15*dl; sun.intensity=.5*dl; ceilL.intensity=5.0-2.4*dl; wallLs.forEach(w=>w.intensity=2.6-1.3*dl); lampL.intensity=1.6-.8*dl; glowM.forEach(m=>m.emissiveIntensity=1.6-1.2*dl); }
function resize(){ const s=R.getSize(new T.Vector2()), a=s.x/s.y; cam.aspect=a;
  cam.fov=Math.max(62,Math.min(80,2*Math.atan(Math.tan(23*Math.PI/180)/a)*180/Math.PI)); cam.updateProjectionMatrix(); }   // 直式手機水平視野很窄，垂直視角放大一點
// 輸入：拖曳轉頭；輕點水族箱進入觀賞模式；觀賞模式裡點魚看資料
const el=R.domElement, ray=new T.Raycaster(), ndc=new T.Vector2();
let mode='room', viewTank=null, vb=0, pan=0, panT=0, down=null, dYaw=0, dPitch=0, dYawT=0, dPitchT=0;
const ui={view:document.getElementById('homeView'),card:document.getElementById('fishCard'),hint:document.querySelector('#homeUI .hh'),btns:document.querySelector('#homeUI .hb')};
function hit(e){ const r=el.getBoundingClientRect(); ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(ndc,cam); }
function tapRoom(){ const gl=Object.keys(tanks).filter(k=>k!=='_tier').map(k=>tanks[k].glass), h=ray.intersectObjects(gl,false)[0], hm=ray.intersectObjects(mountG.children,true)[0];
  if(hm&&(!h||hm.distance<h.distance)){ let o=hm.object; while(o&&!o.userData.rec) o=o.parent; if(o){ c.showFish(o.userData.rec,ui.card); return; } }
  ui.card.classList.add('hidden'); if(h){ enterView(h.object.userData.tank); return; }
  const hf=ray.intersectObjects(fpParts,true)[0]; if(hf) pickFish(); }
function tapView(){ const tk=tanks[viewTank]; if(!tk) return; const h=ray.intersectObjects(tk.fish.map(f=>f.o),true)[0];
  if(!h){ ui.card.classList.add('hidden'); return; } let o=h.object; while(o&&!o.userData.rec) o=o.parent; if(o) c.showFish(o.userData.rec,ui.card); }
function enterView(w){ mode='view'; viewTank=w; pan=panT=0; ui.view.classList.remove('hidden'); ui.btns.classList.add('hidden'); ui.hint.textContent='點一條魚看牠的資料・左右拖曳移動'; }
function exitView(){ mode='room'; ui.view.classList.add('hidden'); ui.card.classList.add('hidden'); ui.btns.classList.remove('hidden'); ui.hint.textContent='搖桿走動・拖曳畫面轉頭・點水族箱靠近觀賞'; }
document.getElementById('bViewBack').addEventListener('click',()=>{ if(mode==='dive') exitDive(); exitView(); });
// 潛入缸內：鏡頭進到水裡，像人在缸中，可以四處轉頭近看魚；水裡有藍綠色的霧
const diveB=document.getElementById('bDive'), fogDive=new T.FogExp2(0x15565c,.9);
function enterDive(){ if(mode!=='view') return; mode='dive'; dYaw=dYawT=0; dPitch=dPitchT=0; scene.fog=fogDive; diveB.textContent='↑ 浮出水面'; ui.hint.textContent='拖曳轉頭四處看・點一條魚看牠的資料'; }
function exitDive(){ if(mode!=='dive') return; mode='view'; scene.fog=null; diveB.textContent='🤿 潛入缸內'; ui.hint.textContent='點一條魚看牠的資料・左右拖曳移動'; }
diveB.addEventListener('click',()=>{ if(mode==='dive') exitDive(); else enterDive(); });
el.addEventListener('pointerdown',e=>{ if(!on) return; down={x:e.clientX,y:e.clientY,t:performance.now()}; drag={x:e.clientX,y:e.clientY,yaw:yawT,pitch:pitchT,pan:panT,dy:dYawT,dp:dPitchT}; });
el.addEventListener('pointermove',e=>{ if(!on||!drag) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(mode==='dive'){ dYawT=Math.max(-1.3,Math.min(1.3,drag.dy-dx*.005)); dPitchT=Math.max(-.6,Math.min(.6,drag.dp-dy*.004)); return; }
  if(mode==='view'){ const w=tanks[viewTank]?tanks[viewTank].spec.w:1; panT=Math.max(-w*.35,Math.min(w*.35,drag.pan-dx*.003)); return; }
  yawT=drag.yaw-dx*.006; pitchT=Math.max(-.7,Math.min(.6,drag.pitch-dy*.005)); });
window.addEventListener('pointerup',e=>{ if(on&&down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<10&&performance.now()-down.t<450){ hit(e); if(mode==='room') tapRoom(); else tapView(); } drag=null; down=null; });   // 移動很少、時間很短才算點擊
/* ===== 壁爐烤魚：魚串在鐵叉上，靠火的那面會熟；魚皮依熟度從生色→金黃→焦黑，出現烤痕；冒煙、油滴竄火、滋滋聲 ===== */
const GR={on:false};
const grillUI=document.getElementById('grillUI'), pickUI=document.getElementById('grillPick');
const smokeTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=64; const g=cv.getContext('2d'), rg=g.createRadialGradient(32,32,2,32,32,30); rg.addColorStop(0,'rgba(255,255,255,.55)'); rg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=rg; g.fillRect(0,0,64,64); return new T.CanvasTexture(cv); })();
const smokes=[]; for(let i=0;i<26;i++){ const m=new T.Sprite(new T.SpriteMaterial({map:smokeTex,transparent:true,depthWrite:false,opacity:0})); m.visible=false; scene.add(m); smokes.push({m,t:0,life:0}); }
const sparkM=new T.SpriteMaterial({map:smokeTex,color:0xffb050,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}); const flare=new T.Sprite(sparkM); flare.scale.set(.5,.5,1); flare.visible=false; scene.add(flare);
const GP=new T.Vector3(ROOM.x-.62,.66,FP.z);
const rig=new T.Group(); rig.position.copy(GP); rig.visible=false; scene.add(rig);
{ const iron=new T.MeshStandardMaterial({color:0x2a2622,metalness:.8,roughness:.45});
  const sk=new T.Mesh(new T.CylinderGeometry(.006,.006,.95,8),iron); sk.rotation.x=Math.PI/2; rig.add(sk);
  for(const z of [-.42,.42]){ const st=new T.Mesh(new T.CylinderGeometry(.01,.012,.66,8),iron); st.position.set(0,-.33,z); rig.add(st); const y1=new T.Mesh(new T.CylinderGeometry(.007,.007,.07,6),iron); y1.position.set(.025,.02,z); y1.rotation.z=.6; rig.add(y1); const y2=y1.clone(); y2.position.x=-.025; y2.rotation.z=-.6; rig.add(y2); } }
const spin=new T.Group(); rig.add(spin);
function cookMat(m){ const k=m.clone(); k.onBeforeCompile=sh=>{ sh.uniforms.uCA=GR.uA; sh.uniforms.uCB=GR.uB;
    sh.vertexShader='varying float vSZ;\nvarying vec3 vWP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSZ=normal.z;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader='uniform float uCA;\nuniform float uCB;\nvarying float vSZ;\nvarying vec3 vWP;\n'+sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float ck=mix(uCB,uCA,smoothstep(-0.35,0.35,vSZ));
      vec3 flesh=mix(diffuseColor.rgb,vec3(0.86,0.78,0.66),0.45);
      vec3 gold=vec3(0.62,0.38,0.16), char_=vec3(0.06,0.045,0.035);
      vec3 c=mix(diffuseColor.rgb,flesh,smoothstep(0.05,0.35,ck));
      c=mix(c,gold*(0.7+0.5*dot(diffuseColor.rgb,vec3(0.33))),smoothstep(0.35,0.85,ck));
      float mark=smoothstep(0.82,0.98,sin(vWP.z*55.0))*smoothstep(0.5,0.8,ck);
      c=mix(c,c*0.35,mark);
      c=mix(c,char_,smoothstep(0.92,1.25,ck));
      diffuseColor.rgb=c;`); };
  k.customProgramCacheKey=()=>'grillfish'; k.needsUpdate=true; return k; }
GR.uA={value:0}; GR.uB={value:0};
function pickFish(){ const list=(c.save.cooler||[]); if(!list.length){ c.toast&&c.toast('保冷箱是空的：釣到魚時按「🔥 放進保冷箱」','warn',2600); return; }
  const inv=c.save.inv=c.save.inv||{}, sea=GR.season||'salt';
  const SZ=[['salt','🧂 鹽','免費・效果時間 +20%',null],['lemon','🍋 檸檬','完美的範圍變寬・效果時間 +30%',150],['herb','🌿 香草','完美時再多一個效果（咬餌更快）',300]];
  const sz=SZ.map(([id,n,d,p])=>{ const have=p===null?'∞':(inv[id]||0), on=sea===id;
    return `<div class="it"><span>${n} <small>${d}</small><br><small style="opacity:.7">持有 ${have}</small></span><span>${p!==null?`<button class="sbtn" data-buy="${id}" data-p="${p}">買 🪙${p}</button> `:''}<button class="sbtn${on?' pri':''}" data-sz="${id}">${on?'使用中':'使用'}</button></span></div>`; }).join('');
  const ck=c.save.cook||{}, perf=Object.keys(ck).filter(k=>ck[k].best>=3);
  const dex=`<div style="margin-top:10px;font-weight:700">📖 料理圖鑑：完美 ${perf.length} 種</div><div style="font-size:12px;opacity:.85;line-height:1.8">${Object.keys(ck).map(k=>{ const sp=c.species(k); return (sp?sp.name:k)+(ck[k].best>=3?'⭐':ck[k].best>=1?'🟡':'⚫'); }).join('　')||'還沒烤過魚'}</div>`;
  pickUI.innerHTML='<div style="font-weight:700;margin-bottom:6px">保冷箱（'+list.length+'/5）・選一條來烤</div>'+list.map((r,i)=>{ const sp=c.species(r.id); return `<div class="it"><span>${sp?sp.name:r.id}　<small>${Math.round(r.L*100)} 公分</small></span><button class="sbtn pri" data-g="${i}">烤這條</button></div>`; }).join('')
    +'<div style="margin-top:10px;font-weight:700">調味</div>'+sz+dex+'<div style="text-align:right;margin-top:8px"><button class="sbtn" data-g="x">關閉</button></div>';
  pickUI.classList.remove('hidden'); document.body.classList.add('grilling'); }
pickUI.addEventListener('click',e=>{ const bz=e.target.closest('[data-sz],[data-buy]');
  if(bz){ if(bz.dataset.buy){ if(c.buy&&c.buy(bz.dataset.buy,+bz.dataset.p)){ c.save.inv[bz.dataset.buy]=(c.save.inv[bz.dataset.buy]||0)+1; c.persist&&c.persist(); } }
    else { const id=bz.dataset.sz; if(id!=='salt'&&!(c.save.inv[id]>0)){ c.toast&&c.toast('先買一份','warn',1400); return; } GR.season=id; }
    document.body.classList.remove('grilling'); pickFish(); return; }
  if(e.target.closest('[data-eat]')) return; const b=e.target.closest('[data-g]'); if(!b) return; pickUI.classList.add('hidden'); if(b.dataset.g==='x'){ document.body.classList.remove('grilling'); return; } startGrill(+b.dataset.g); });
function startGrill(i){ const rec=(c.save.cooler||[])[i]; if(!rec) return; const sp=c.species(rec.id); if(!sp){ document.body.classList.remove('grilling'); return; }
  const src=c.getFish(sp).group.clone(true); src.position.set(0,0,0); src.rotation.set(0,0,0); src.scale.setScalar(1); src.visible=true;
  src.traverse(o=>{ o.visible=true; o.frustumCulled=false; if(o.isMesh&&o.material){ const ms=Array.isArray(o.material)?o.material:[o.material]; const nm=ms.map(cookMat); o.material=Array.isArray(o.material)?nm:nm[0]; } });
  const L=Math.min(.55,Math.max(.18,rec.L)); const w=new T.Group(); w.add(src); w.scale.setScalar(L); w.rotation.y=Math.PI/2;
  spin.clear(); spin.add(w); spin.rotation.set(0,0,0); rig.visible=true;
  const need=7+Math.min(14,Math.sqrt(rec.w||.5)*6);
  let season=GR.season||'salt'; if(season!=='salt'){ const inv=c.save.inv||{}; if((inv[season]||0)>0) inv[season]--; else season='salt'; }
  Object.assign(GR,{on:true,i,rec,sp,a:0,b:0,face:0,flipT:0,need,t:0,dripT:1,smT:0,useSeason:season}); GR.uA.value=0; GR.uB.value=0;
  document.getElementById('gTitle').textContent='烤 '+sp.name+'（約 '+Math.round(need)+' 秒一面）';
  grillUI.classList.remove('hidden'); pickUI.classList.add('hidden'); document.body.classList.add('grilling'); mode='grill'; }
function endGrill(){ GR.on=false; rig.visible=false; spin.clear(); grillUI.classList.add('hidden'); document.body.classList.remove('grilling'); mode='room'; smokes.forEach(s=>{ s.m.visible=false; }); flare.visible=false; }
document.getElementById('gFlip').addEventListener('click',()=>{ if(!GR.on||GR.flipT>0) return; GR.flipT=.6; c.sizzle&&c.sizzle(.6); });
document.getElementById('gQuit').addEventListener('click',()=>{ if(!GR.on) return; endGrill(); });
document.getElementById('gDone').addEventListener('click',()=>{ if(!GR.on) return; const r=GR.rec, a=GR.a, b=GR.b, sz=GR.useSeason; c.save.cooler.splice(GR.i,1); c.persist&&c.persist(); endGrill();
  const sp=c.species(r.id); pickUI.innerHTML=`<div style="font-weight:700;margin-bottom:8px">🍽 ${sp?sp.name:''}起鍋了</div><div style="font-size:13px;opacity:.85;margin-bottom:10px">要自己吃，還是招待來訪的釣友？</div>
    <div class="gbtns" style="display:flex;gap:8px"><button class="btn pri" data-eat="me" style="flex:1;padding:10px">自己吃（得到效果）</button><button class="btn" data-eat="friend" style="flex:1;padding:10px">招待釣友（金幣＋魚餌）</button></div>`;
  pickUI.classList.remove('hidden'); document.body.classList.add('grilling');
  pickUI.onclick=e=>{ const bt=e.target.closest('[data-eat]'); if(!bt) return; pickUI.onclick=null; pickUI.classList.add('hidden'); document.body.classList.remove('grilling'); if(c.onGrilled) c.onGrilled(r,a,b,sz,bt.dataset.eat); }; });
const grade=x=>x<.55?'生':x<.78?'半熟':x<.92?'完美':'焦';
function updGrill(dt){ if(!GR.on) return; GR.t+=dt;
  // 翻面：整支鐵叉轉 180 度
  if(GR.flipT>0){ GR.flipT-=dt; const p=1-Math.max(0,GR.flipT)/.6; spin.rotation.z=(GR.face+p)*Math.PI; if(GR.flipT<=0){ GR.face=(GR.face+1)%2; spin.rotation.z=GR.face*Math.PI; } }
  const heat=(1/GR.need)*(fireM.opacity+.3)/1.15;
  if(GR.flipT<=0){ if(GR.face===0) GR.a+=heat*dt; else GR.b+=heat*dt; }
  GR.uA.value=GR.a; GR.uB.value=GR.b;
  const top=GR.face===0?GR.a:GR.b, oth=GR.face===0?GR.b:GR.a;
  document.getElementById('gA').style.left=Math.min(100,top*82)+'%'; document.getElementById('gB').style.left=Math.min(100,oth*82)+'%';
  document.getElementById('gHint').textContent=top>1.05?'冒黑煙了！快翻面！':top>.78?'這面完美了，可以翻面':top>.55?'魚皮開始金黃…':top>.25?'滋滋作響，魚肉漸漸變白':'等魚皮慢慢變色…';
  // 煙：熟度越高越多，焦了變黑煙
  GR.smT-=dt; if(GR.smT<=0&&top>.15){ GR.smT=top>1?.06:.18; const s=smokes.find(x=>!x.m.visible); if(s){ s.m.visible=true; s.t=0; s.life=1.6+Math.random()*1.2; s.m.position.copy(GP).add(tv.set((Math.random()-.5)*.1,.03,(Math.random()-.5)*.35)); s.dark=top>1; s.m.material.color.set(top>1?0x2a2420:0xd8d4cc); } }
  smokes.forEach(s=>{ if(!s.m.visible) return; s.t+=dt; const k=s.t/s.life; if(k>=1){ s.m.visible=false; return; } s.m.position.y+=dt*.35; s.m.position.x-=dt*.05; const sc=.12+k*.45; s.m.scale.set(sc,sc,1); s.m.material.opacity=(s.dark?.55:.32)*Math.sin(k*Math.PI); });
  // 油滴進火：火光竄起、滋滋聲
  GR.dripT-=dt; if(GR.dripT<=0&&top>.3){ GR.dripT=.6+Math.random()*1.6; flare.visible=true; flare.position.copy(GP).add(tv.set(.12,-.2,(Math.random()-.5)*.3)); sparkM.opacity=.9; fireL.intensity*=1.6; c.sizzle&&c.sizzle(.35+Math.random()*.3); }
  if(flare.visible){ sparkM.opacity-=dt*2.2; flare.scale.setScalar(.35+(.9-sparkM.opacity)*.3); if(sparkM.opacity<=0) flare.visible=false; }
  spin.position.y=Math.sin(GR.t*1.3)*.003; }
function enter(){ on=true; yaw=yawT=0; pitch=pitchT=-.08; vb=0; pRoom.set(0,EYE,.9); resize(); for(const f of [syncTime,syncFish,syncMounts,exitView]){ try{ f(); }catch(err){ console.error('home enter',err); } } try{ if(c.onEnter) c.onEnter(); }catch(err){ console.error(err); } }
function exit(){ on=false; drag=null; if(GR.on) endGrill(); pickUI.classList.add('hidden'); document.body.classList.remove('grilling'); exitDive(); exitView(); }
const qDive=new T.Quaternion(), pDive=new T.Vector3(), qRoom=new T.Quaternion(), qView=new T.Quaternion(), pRoom=new T.Vector3(0,EYE,.9), bobT={v:0}, pView=new T.Vector3(), eul=new T.Euler(0,0,0,'YXZ'), lookM=new T.Matrix4();
let syncT=0;
function render(dt){ t+=dt; yaw+=(yawT-yaw)*Math.min(1,dt*8); pitch+=(pitchT-pitch)*Math.min(1,dt*8); pan+=(panT-pan)*Math.min(1,dt*6);
  vb+=((mode!=='room'?1:0)-vb)*Math.min(1,dt*4); dYaw+=(dYawT-dYaw)*Math.min(1,dt*6); dPitch+=(dPitchT-dPitch)*Math.min(1,dt*6);
  // 在房間裡用搖桿走動：前進／後退、左右轉；不能走進水族箱、壁爐和牆
  if(mode==='room'&&c.joy){ const j=c.joy(); if(Math.abs(j.thr)>.05||Math.abs(j.turn)>.05){ yawT-=j.turn*dt*1.7; const sp=1.3*j.thr*dt, fx=-Math.sin(yaw), fz=-Math.cos(yaw); let nx=pRoom.x+fx*sp, nz=pRoom.z+fz*sp;
      nx=Math.max(-ROOM.x+.5,Math.min(ROOM.x-.5,nx)); nz=Math.max(ROOM.zb+1.6,Math.min(ROOM.zf-.5,nz)); if(nx>ROOM.x-1.3&&Math.abs(nz-FP.z)<1.2) nx=ROOM.x-1.3;
      pRoom.x=nx; pRoom.z=nz; bobT.v+=dt*7; } pRoom.y=EYE+Math.sin(bobT.v)*.012; }
  eul.set(pitch,yaw,0); qRoom.setFromEuler(eul);
  const tk=tanks[viewTank]||tanks.fresh;
  if(tk){ const s=tk.spec, hf=Math.atan(Math.tan(cam.fov*Math.PI/360)*cam.aspect), dist=Math.max(s.h*.75/Math.tan(cam.fov*Math.PI/360),(s.w*.42)/Math.tan(hf))+s.d/2;
    pView.set(tk.x+pan,tk.y+s.h/2,tk.z+dist); lookM.lookAt(pView,tv.set(tk.x+pan,tk.y+s.h/2,tk.z),cam.up); qView.setFromRotationMatrix(lookM); }
  if(mode==='grill'){ pDive.set(ROOM.x-1.45,1.0,FP.z-.15); lookM.lookAt(pDive,tv.set(GP.x,GP.y-.05,GP.z),cam.up); qDive.setFromRotationMatrix(lookM); cam.position.lerp(pDive,Math.min(1,dt*3)); cam.quaternion.slerp(qDive,Math.min(1,dt*4)); }
  else if(mode==='dive'&&tk){ const s2=tk.spec; pDive.set(tk.x+Math.sin(t*.25)*s2.w*.12,tk.y+s2.h*.5+Math.sin(t*.4)*.02,tk.z+s2.d*.32); eul.set(dPitch,dYaw,0); qDive.setFromEuler(eul);
    cam.position.lerp(pDive,Math.min(1,dt*3)); cam.quaternion.slerp(qDive,Math.min(1,dt*4)); }
  else { const k=vb*vb*(3-2*vb); cam.position.lerpVectors(pRoom,pView,k); cam.quaternion.copy(qRoom).slerp(qView,k); }
  const fl=.85+.15*Math.sin(t*9)+.08*Math.sin(t*23); fireL.intensity=2.2*fl; fireM.opacity=.7+.3*fl; fire.scale.y=.9+.15*Math.sin(t*7);
  if((syncT+=dt)>1){ syncT=0; try{ syncTime(); syncFish(); syncMounts(); }catch(err){ console.error('home sync',err); } }   // 每秒同步一次：剛帶回的魚、升級的缸、晚一步載好的真實模型
  if(c.crackle&&Math.random()<dt*2.2) c.crackle();
  updGrill(dt);   // 爐火劈啪聲，隨機間隔
  updTanks(dt); R.setRenderTarget(null); R.render(scene,cam); }
window.addEventListener('resize',()=>{ if(on) resize(); });
return {enter,exit,render,active:()=>on,scene,cam,grill:()=>pickFish()};
}
