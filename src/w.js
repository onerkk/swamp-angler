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
/* 家具：每件都能升級（換真實模型或加擺件），也都真的能用；冷卻與累積都用真實時間 */
const BAITN={shrimp:'活蝦',live:'活魚餌',moon:'月光餌'};
const FURN=[
 {id:'sofa',n:'沙發',i:'🛋️',use:'坐下來看水族箱，心情放鬆',act:'坐下休息',lv:[
   {d:'🍀 好運 8 分鐘（稀有魚機率提升）・冷卻 30 分鐘',min:8,cd:30},
   {n:'加真皮腳凳',p:3000,need:6,d:'🍀 好運 15 分鐘・冷卻 25 分鐘',min:15,cd:25},
   {n:'換雕花古董沙發',p:9000,need:12,d:'🍀 好運 25 分鐘・冷卻 20 分鐘',min:25,cd:20}]},
 {id:'rock',n:'搖椅',i:'🪑',use:'在爐火邊打個盹',act:'打個盹',lv:[
   {d:'時間跳到下一個時段（清晨／正午／黃昏／夜晚）',fx:0},
   {n:'加邊桌',p:2000,need:5,d:'跳到下一個時段，睡醒 💪 力氣 10 分鐘',fx:10},
   {n:'加毛毯籃',p:6000,need:10,d:'可以選要睡到哪個時段，睡醒 💪 力氣 20 分鐘',fx:20,pick:true}]},
 {id:'shelf',n:'書架',i:'📚',use:'翻翻老漁人留下的釣魚手記',act:'讀手記',lv:[
   {d:'經驗 +等級×20・冷卻 20 分鐘',k:20,cd:20},
   {n:'擺滿手記',p:2500,need:6,d:'經驗 +等級×35・冷卻 20 分鐘',k:35,cd:20},
   {n:'換玻璃古董書櫃',p:8000,need:12,d:'經驗 +等級×55・冷卻 15 分鐘',k:55,cd:15}]},
 {id:'chest',n:'漁具箱',i:'🧰',use:'老漁人的漁具箱，每天補一次魚餌',act:'領補給',lv:[
   {d:'每天：活蝦 ×3',g:{shrimp:3}},
   {n:'疊上木箱',p:4000,need:8,d:'每天：活蝦 ×5、活魚餌 ×2',g:{shrimp:5,live:2}},
   {n:'再添長木箱',p:12000,need:14,d:'每天：活蝦 ×5、活魚餌 ×4、月光餌 ×1',g:{shrimp:5,live:4,moon:1}}]},
 {id:'herb',n:'窗邊香草',i:'🌿',use:'窗邊曬得到太陽，香草和檸檬會慢慢長出來（烤魚調味用）',act:'採收',lv:[
   {d:'每 60 分鐘長 1 份香草（最多存 2 份）',hb:60,hc:2},
   {n:'加香草木箱',p:1500,need:4,d:'每 30 分鐘 1 份香草（最多存 4 份）',hb:30,hc:4},
   {n:'加檸檬木箱',p:5000,need:9,d:'每 25 分鐘 1 份香草、每 40 分鐘 1 顆檸檬（各存 5 份）',hb:25,hc:5,lm:40,lc:5}]},
 {id:'fire',n:'壁爐',i:'🔥',use:'烤魚用的壁爐，點它就能烤魚',act:'烤魚',lv:[
   {d:'一般火力'},
   {n:'掛上鑄鐵燉鍋',p:3500,need:7,d:'火力更旺，烤熟速度 ×1.25',heat:1.25},
   {n:'加銅鍋',p:10000,need:13,d:'烤熟速度 ×1.25，吃下去的效果時間 ×1.3',heat:1.25,fxK:1.3}]}];
function FD(){ const h=H(); h.furn=h.furn||{}; FURN.forEach(d=>{ h.furn[d.id]=h.furn[d.id]||{lv:0}; }); return h.furn; }
const fdef=id=>FURN.find(d=>d.id===id);
const flv=id=>{ const f=FD()[id]; return f?f.lv:0; };
const now=()=>Date.now();
// 香草／檸檬：從上次採收起算累積了幾份
function grown(st,k,every,cap){ if(!every) return 0; const t=st[k]||(st[k]=now()); return Math.min(cap,Math.floor((now()-t)/(every*60000))); }
// 某件家具現在能不能用：ok、還要等幾分鐘、說明
function state(id){ const d=fdef(id), st=FD()[id], L=d.lv[st.lv];
  if(id==='sofa'||id==='shelf'){ const w=st.t?Math.ceil((st.t+L.cd*60000-now())/60000):0; return w>0?{ok:false,wait:w,txt:'還要 '+w+' 分鐘'}:{ok:true,txt:'可以使用'}; }
  if(id==='chest'){ const day=new Date().toDateString(); return st.day===day?{ok:false,txt:'今天領過了，明天再來'}:{ok:true,txt:'今天的補給還沒領'}; }
  if(id==='herb'){ const h=grown(st,'th',L.hb,L.hc), l=grown(st,'tl',L.lm,L.lc||0);
    return h+l>0?{ok:true,h,l,txt:'可以採收：香草 '+h+(L.lm?'、檸檬 '+l:'')}:{ok:false,txt:'還在長，'+Math.ceil(((st.th||now())+L.hb*60000-now())/60000)+' 分鐘後可以採'}; }
  return {ok:true,txt:''}; }
function info(id){ const d=fdef(id), lv=flv(id); return {def:d,lv,cur:d.lv[lv],next:d.lv[lv+1]||null,st:state(id)}; }
function upgrade(id){ const d=fdef(id), st=FD()[id], nx=d.lv[st.lv+1]; if(!nx) return '已經升到最高級了';
  if((S.lv||1)<nx.need) return '需要等級 Lv '+nx.need; if(S.coins<nx.p) return '金幣不夠';
  // 升級香草時，先把已經長好的收進去，免得換箱子後重新計時吃掉進度
  if(id==='herb'&&state('herb').ok) use('herb');
  S.coins-=nx.p; st.lv++; c.persist(); c.setCoins(); return ''; }
// 使用：回傳訊息與種類；種類有值時表示沒用成功
function use(id,opt){ const d=fdef(id), st=FD()[id], L=d.lv[st.lv], s=state(id), fx=S.fx=S.fx||{}, add=(k,m)=>{ fx[k]=Math.max(fx[k]||0,now())+m*60000; };
  if(id==='sofa'){ if(!s.ok) return {msg:'剛休息過，'+s.txt,kind:'warn'}; st.t=now(); add('luck',L.min); c.persist(); c.fxChanged&&c.fxChanged(); return {msg:'🛋️ 窩在沙發上看魚游來游去……🍀 好運 '+L.min+' 分鐘'}; }
  if(id==='shelf'){ if(!s.ok) return {msg:'剛讀過，'+s.txt,kind:'warn'}; st.t=now(); const xp=Math.round((S.lv||1)*L.k); c.persist(); c.addXP&&c.addXP(xp);
    const tips=['「霧天的清晨，大魚會游到淺水邊。」','「月亮越圓，月光灣的海水魚越多。」','「魚衝的時候放手，牠累了自然會回來。」','「冰洞底下的鱒魚，喜歡活蝦。」','「倒木區的鯰魚，入夜才肯開口。」'];
    return {msg:'📚 '+tips[Math.floor(Math.random()*tips.length)]+'　經驗 +'+xp}; }
  if(id==='chest'){ if(!s.ok) return {msg:s.txt,kind:'warn'}; st.day=new Date().toDateString(); S.baits=S.baits||{}; const got=[];
    for(const [b,n] of Object.entries(L.g)){ S.baits[b]=(S.baits[b]||0)+n; got.push((BAITN[b]||b)+' ×'+n); } c.persist(); c.syncHUD&&c.syncHUD(); return {msg:'🧰 打開漁具箱：'+got.join('、')}; }
  if(id==='herb'){ if(!s.ok) return {msg:s.txt,kind:'warn'}; const inv=S.inv=S.inv||{}, ev=L.hb*60000, el=(L.lm||0)*60000;
    if(s.h){ inv.herb=(inv.herb||0)+s.h; st.th=s.h>=L.hc?now():st.th+s.h*ev; }
    if(s.l){ inv.lemon=(inv.lemon||0)+s.l; st.tl=s.l>=L.lc?now():st.tl+s.l*el; }
    c.persist(); return {msg:'🌿 採收了'+[s.h?'香草 ×'+s.h:'',s.l?'檸檬 ×'+s.l:''].filter(Boolean).join('、')+'（烤魚調味用）'}; }
  if(id==='rock'){ const P=[[6.3,'清晨'],[11.5,'正午'],[17.6,'黃昏'],[21,'夜晚']], h=((c.hour()%24)+24)%24;
    let tg; if(L.pick&&opt!=null) tg=P[opt]; else { tg=P.find(p=>p[0]>h+.25)||P[0]; }
    c.setHour(tg[0]); if(L.fx) add('meal_str',L.fx); c.persist(); c.fxChanged&&c.fxChanged();
    return {msg:'🪑 搖著搖著睡著了……醒來已經是'+tg[1]+(L.fx?'・💪 力氣 '+L.fx+' 分鐘':'')}; }
  return {msg:''}; }
const grillHeat=()=>fdef('fire').lv[flv('fire')].heat||1;
const grillFxK=()=>fdef('fire').lv[flv('fire')].fxK||1;
return {TANKS,SEA_TANK,CHILLER,MOUNT_MAX,unlocked,check,keep,mount,release,buy,data:H,tank,FURN,furnInfo:info,furnUp:upgrade,furnUse:use,furnLv:flv,grillHeat,grillFxK};
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
// 場景裡的指引標籤：輕輕上下浮動，告訴玩家哪裡可以點
function drawTag(g,text,hot){ g.clearRect(0,0,512,128);
  g.fillStyle=hot?'rgba(120,70,10,.85)':'rgba(20,14,10,.72)'; g.beginPath(); g.roundRect?g.roundRect(8,14,496,100,50):g.rect(8,14,496,100); g.fill(); g.strokeStyle=hot?'rgba(255,214,110,.95)':'rgba(255,210,150,.6)'; g.lineWidth=hot?7:4; g.stroke();
  g.fillStyle=hot?'#fff2c0':'#ffe9c8'; g.font='bold 54px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,256,66); }
function makeTag(text){ const cv=document.createElement('canvas'); cv.width=512; cv.height=128; const g=cv.getContext('2d'); drawTag(g,text,false);
  const tx=new T.CanvasTexture(cv); tx.encoding=T.sRGBEncoding; const sp=new T.Sprite(new T.SpriteMaterial({map:tx,transparent:true,depthTest:false,depthWrite:false})); sp.scale.set(.62,.155,1); sp.renderOrder=20; sp.userData.g=g; sp.userData.txt=text; return sp; }
// 換標籤文字（有東西可以領、可以採時改成金色醒目的樣式）；文字沒變就不重畫
function setTag(sp,text,hot){ const k=text+(hot?'*':''); if(sp.userData.txt===k) return; sp.userData.txt=k; drawTag(sp.userData.g,text,hot); sp.material.map.needsUpdate=true; }
const tags=[];
// 靜月之光水晶展示櫃：入口牆上的木框玻璃櫃，陳列作者的水晶作品，點擊可前往作者的蝦皮小店
const shopParts=[];
{ const cab=new T.Group(); cab.position.set(0,1.55,ROOM.zf-.12); cab.rotation.y=Math.PI; scene.add(cab);
  const woodM=new T.MeshStandardMaterial({color:0x4a2e1c,roughness:.6,metalness:.05});
  const back=new T.Mesh(new T.BoxGeometry(1.56,1.2,.06),new T.MeshStandardMaterial({color:0x1a1412,roughness:.9})); back.position.z=-.08; cab.add(back);
  for(const [w,h,x,y] of [[1.66,.07,0,.63],[1.66,.07,0,-.63],[.07,1.3,-.8,0],[.07,1.3,.8,0],[1.56,.03,0,.2],[1.56,.03,0,-.2]]){ const b=new T.Mesh(new T.BoxGeometry(w,h,.2),woodM); b.position.set(x,y,0); cab.add(b); }
  for(let i=0;i<9;i++){ const tx=TL.load('shop'+(i+1)+'.jpg'); tx.encoding=T.sRGBEncoding; const r=Math.floor(i/3), cI=i%3;
    const ph=new T.Mesh(new T.PlaneGeometry(.42,.34),new T.MeshStandardMaterial({map:tx,roughness:.5,emissive:0xffffff,emissiveMap:tx,emissiveIntensity:.25})); ph.position.set((cI-1)*.5,(1-r)*.4,-.045); cab.add(ph); shopParts.push(ph); }
  const glass=new T.Mesh(new T.PlaneGeometry(1.56,1.2),new T.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.08,roughness:.05,metalness:.3,depthWrite:false})); glass.position.z=.1; cab.add(glass); shopParts.push(glass);
  const lamp=new T.SpotLight(0xfff0d8,1.4,3.2,.7,.5,1.2); lamp.position.set(0,1.0,.6); lamp.target=back; cab.add(lamp);
  const tg=makeTag('💎 靜月之光 水晶'); tg.position.set(0,2.32,ROOM.zf-.2); scene.add(tg); tags.push({s:tg,y:2.32,k:'shop'}); }
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
const fire=plane(.8,.55,fireM,ROOM.x-.3,.42,FP.z,-Math.PI/2); fpParts.push(fire);
{ const hitBox=new T.Mesh(new T.BoxGeometry(.5,1.3,1.5),new T.MeshBasicMaterial({visible:false})); hitBox.position.set(ROOM.x-.45,.65,FP.z); scene.add(hitBox); fpParts.push(hitBox);
  const tg=makeTag('🔥 點壁爐烤魚'); tg.position.set(ROOM.x-.55,1.62,FP.z); scene.add(tg); tags.push({s:tg,y:1.62,k:'grill'}); } plane(.7,.5,fireM,ROOM.x-.3,.4,FP.z,-Math.PI/2+.6);
fire.visible=false; fireM.visible=false;
// 火焰：每片是噪聲驅動、往上竄的火舌（底部白黃、中段橘、頂端暗紅漸透明），四片交叉成立體的火
const FU={uT:{value:0},uK:{value:1}};
const flameMat=new T.ShaderMaterial({uniforms:FU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:`uniform float uT; uniform float uK; varying vec2 vU;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=0.5; } return v; }
    void main(){ vec2 u=vU; float y=u.y;
      vec2 q=vec2(u.x*3.0, y*2.2-uT*1.9); float d=fbm(q+vec2(0.0,fbm(q*1.7+uT*0.6)*0.9));
      float w=1.0-abs(u.x-0.5)*2.0; w=smoothstep(0.05,0.9,w)*(1.0-y*0.55);
      float shape=w*(1.05-y*1.15)+(d-0.5)*0.85; float f=smoothstep(0.12,0.6,shape)*smoothstep(1.0,0.45,y)*smoothstep(0.0,0.14,y)*uK;
      vec3 c=mix(vec3(0.55,0.06,0.0),vec3(1.0,0.45,0.05),smoothstep(0.1,0.5,f)); c=mix(c,vec3(1.0,0.86,0.45),smoothstep(0.55,0.9,f)); c=mix(c,vec3(1.0,0.97,0.85),smoothstep(0.85,1.0,f)*(1.0-y));
      gl_FragColor=vec4(c*f*0.55,f*0.8); }`});
const flames=[]; for(let i=0;i<4;i++){ const fm=new T.Mesh(new T.PlaneGeometry(.7,.52),flameMat.clone()); fm.material.uniforms={uT:{value:i*3.1},uK:FU.uK}; fm.position.set(ROOM.x-.3+(i%2?.04:-.04),.4,FP.z+(i-1.5)*.05); fm.rotation.y=-Math.PI/2+(i-1.5)*.55; scene.add(fm); flames.push(fm); fpParts.push(fm); }
// 木柴：真實樹皮貼圖、不規則形狀；燒焦端用燒過的地面貼圖，裂縫透出橘紅餘燼光
const barkM=(()=>{ const ld=f=>{ const x=TL.load('models/home/bark_brown_02_'+f+'.jpg'); x.wrapS=x.wrapT=T.RepeatWrapping; x.repeat.set(1,2.2); return x; }; const d=ld('Diffuse'); d.encoding=T.sRGBEncoding; return new T.MeshStandardMaterial({map:d,normalMap:ld('nor_gl'),roughnessMap:ld('Rough'),roughness:1}); })();
const emberU={uT:{value:0}};
const charM=(()=>{ const ld=f=>{ const x=TL.load('models/home/burned_ground_01_'+f+'.jpg'); x.wrapS=x.wrapT=T.RepeatWrapping; x.repeat.set(.8,.8); return x; }; const d=ld('Diffuse'); d.encoding=T.sRGBEncoding;
  const m=new T.MeshStandardMaterial({map:d,normalMap:ld('nor_gl'),roughness:1,color:0x3a3430,emissive:0xff5a10});
  m.onBeforeCompile=sh=>{ sh.uniforms.uT=emberU.uT; sh.fragmentShader='uniform float uT;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float lum_=dot(texture2D(map,vUv).rgb,vec3(0.33)); float crack_=smoothstep(0.32,0.12,lum_); float pulse_=0.65+0.35*sin(uT*2.3+vUv.x*17.0)*sin(uT*1.7+vUv.y*11.0);
      totalEmissiveRadiance=vec3(1.0,0.32,0.05)*crack_*pulse_*1.6;`); }; m.customProgramCacheKey=()=>'ember'; return m; })();
for(let i=0;i<3;i++){ const geo=new T.CylinderGeometry(.065,.075,.72,14,6); const ps=geo.attributes.position; for(let j=0;j<ps.count;j++){ const y=ps.getY(j), a=Math.atan2(ps.getZ(j),ps.getX(j)); const r=1+.08*Math.sin(a*3+i)+.05*Math.sin(y*9+a*2); ps.setX(j,ps.getX(j)*r); ps.setZ(j,ps.getZ(j)*r); } geo.computeVertexNormals();
  const lg=new T.Mesh(geo,[barkM,charM,charM]); lg.rotation.x=Math.PI/2; lg.rotation.z=(i-1)*.18; lg.position.set(ROOM.x-.3,.11+(i===2?.11:0),FP.z+(i-1)*.12); scene.add(lg);
  const coal=new T.Mesh(new T.CylinderGeometry(.055,.06,.5,12,1,true),charM); coal.rotation.copy(lg.rotation); coal.position.copy(lg.position); coal.position.y+=.012; coal.scale.set(1.12,1,1.12); scene.add(coal); }
const bed=new T.Mesh(new T.CircleGeometry(.36,24).rotateX(-Math.PI/2),charM); bed.position.set(ROOM.x-.3,.035,FP.z); bed.scale.set(.8,1,1.3); scene.add(bed);
// 火星：從火堆往上飄、一閃一閃
const sparkTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=16; const g=cv.getContext('2d'), rg=g.createRadialGradient(8,8,0,8,8,8); rg.addColorStop(0,'rgba(255,230,160,1)'); rg.addColorStop(.4,'rgba(255,140,40,.8)'); rg.addColorStop(1,'rgba(255,80,0,0)'); g.fillStyle=rg; g.fillRect(0,0,16,16); return new T.CanvasTexture(cv); })();
const sparks=[]; for(let i=0;i<30;i++){ const s=new T.Sprite(new T.SpriteMaterial({map:sparkTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending})); s.scale.set(.025,.025,1); s.visible=false; scene.add(s); sparks.push({s,v:new T.Vector3(),t:0,life:1}); }
const fireL=new T.PointLight(0xff8a40,2.2,9,1.3); fireL.position.set(ROOM.x-1.1,.6,FP.z); scene.add(fireL);
// 家具：Poly Haven 真實模型（CC0），回家時才載入。位置以房間中央偏後的客廳區為主
const GL=new T.GLTFLoader(), mcache={}, glowM=[];
const ART={hanging_picture_frame_01:'mermaid_a.jpg',hanging_picture_frame_02:'mermaid_a.jpg'};
function put(name,x,y,z,ry,sc,fn){ const place=g=>{ const o=g.scene.clone(true); o.position.set(x,y,z); o.rotation.y=ry||0; o.scale.setScalar(sc||1);
    o.traverse(m=>{ if(!m.isMesh) return; m.frustumCulled=false; const mats=Array.isArray(m.material)?m.material:[m.material];
      mats.forEach((mm,i)=>{ if(!mm) return; if(mm.map) mm.map.anisotropy=4;
        if(/_artwork$/.test(mm.name)&&ART[name]){ const nm=mm.clone(); const tx=TL.load(ART[name]); tx.encoding=T.sRGBEncoding; tx.flipY=false; nm.map=tx; nm.color.set(0xffffff); if(Array.isArray(m.material)) m.material[i]=nm; else m.material=nm; }
        if(/_glass$/.test(mm.name)){ const nm=new T.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.12,roughness:.05,metalness:0,depthWrite:false}); if(Array.isArray(m.material)) m.material[i]=nm; else m.material=nm; }
        if(/_lamp$/.test(mm.name)){ const nm=mm.clone(); nm.emissive=new T.Color(0xffd080); nm.emissiveIntensity=1.2; if(Array.isArray(m.material)) m.material[i]=nm; else m.material=nm; glowM.push(nm); } }); });
    scene.add(o); addObs(o); if(fn) fn(o); };
  if(mcache[name]) place(mcache[name]); else GL.load('models/home/'+name+'.glb',g=>{ mcache[name]=g; place(g); },undefined,()=>console.warn('home model',name)); }
const LV={x:-.9,z:-1.9};
// 碰撞：落地的家具用實際模型的外框當障礙（升級換模型也自動跟著變），走路時不能穿過去
const OBS=[];
function addObs(o){ o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o); if(b.isEmpty()||b.min.y>.25||b.max.y-b.min.y<.12) return;
  OBS.push({o,x0:b.min.x,x1:b.max.x,z0:b.min.z,z1:b.max.z}); }
function dropObs(o){ for(let i=OBS.length-1;i>=0;i--) if(OBS[i].o===o) OBS.splice(i,1); }
function blocked(x,z){ const r=.28; return OBS.some(b=>x>b.x0-r&&x<b.x1+r&&z>b.z0-r&&z<b.z1+r); }
// 地毯：真實織物貼圖
plane(2.8,2.0,pbr('fabric_pattern_07',2.2,1.6,{color:0xb86a48}),LV.x+.5,.006,LV.z,0,-Math.PI/2);
// 茶几與桌上的手記、煤油燈（不分等級，一直都在）
put('coffee_table_round_01',LV.x+.5,0,LV.z,0,.85);
put('book_encyclopedia_set_01',LV.x+.5,.42,LV.z+.15,.3,.8);
put('vintage_oil_lamp',LV.x+.2,.42,LV.z-.3,0,.8);
// 家具依等級擺放：每一項標明屬於哪件家具、在哪幾級出現；升級時換模型或加擺件
const FITEMS=[
 {f:'sofa',lv:[0,1],m:'sofa_02',p:[LV.x-1.0,0,LV.z,Math.PI/2,1]},
 {f:'sofa',lv:[0,1],m:'throw_pillows_01',p:[LV.x-1.0,.42,LV.z+.1,Math.PI/2,.9]},
 {f:'sofa',lv:[1,2],m:'Ottoman_01',p:[LV.x-.65,0,LV.z+1.15,Math.PI/2,.8]},
 {f:'sofa',lv:[2,2],m:'sofa_03',p:[LV.x-1.05,0,LV.z,Math.PI/2,.72]},
 {f:'shelf',lv:[0,1],m:'wooden_bookshelf_worn',p:[-ROOM.x+.32,0,-2.2,Math.PI/2,1]},
 {f:'shelf',lv:[1,1],m:'book_encyclopedia_set_01',p:[-ROOM.x+.32,2.06,-2.2,Math.PI/2,.8]},
 {f:'shelf',lv:[2,2],m:'vintage_cabinet_01',p:[-ROOM.x+.3,0,-2.25,Math.PI/2,.8]},
 {f:'rock',lv:[0,2],m:'Rockingchair_01',p:[1.7,-.1,-1.6,-Math.PI/2+.4,1]},
 {f:'rock',lv:[1,2],m:'side_table_01',p:[2.35,0,-1.0,-.3,.85],tint:0x8a6448},
 {f:'rock',lv:[2,2],m:'wicker_basket_01',p:[2.3,0,-2.3,.4,1.7]},
 {f:'herb',lv:[0,2],m:'potted_plant_01',p:[-2.5,0,ROOM.zb+.5,0,.9]},
 {f:'herb',lv:[1,2],m:'planter_box_01',p:[-ROOM.x+.24,0,-.15,Math.PI/2,1],herbs:.46},
 {f:'herb',lv:[2,2],m:'planter_box_02',p:[-ROOM.x+.25,0,1.0,Math.PI/2,1],herbs:.62},
 {f:'chest',lv:[0,2],m:'treasure_chest',p:[2.4,0,ROOM.zb+.45,-.5,.8]},
 {f:'chest',lv:[1,2],m:'wooden_crate_01',p:[ROOM.x-.22,0,-3.0,Math.PI/2,.75]},
 {f:'chest',lv:[2,2],m:'wooden_crate_02',p:[ROOM.x-.32,0,-2.0,0,1]},
 {f:'fire',lv:[1,2],m:'pot_enamel_01',p:[ROOM.x-.35,0,FP.z+1.55,0,1.4]},
 {f:'fire',lv:[2,2],m:'brass_pan_01',p:[ROOM.x-.3,0,FP.z-1.05,.8,1.4]}];
// 香草箱裡種真實的蕁麻草模型（Poly Haven nettle_plant），沿著木箱長邊排一排
function plantHerbs(o,half){ const ld=g=>{ const names=['nettle_plant_tall_a_LOD0','nettle_plant_medium_a_LOD0','nettle_plant_tall_b_LOD0','nettle_plant_medium_b_LOD0'];
    const n=Math.round(half*10); for(let i=0;i<n;i++){ const src=g.scene.getObjectByName(names[i%4]); if(!src) continue; const k=new T.Group(), sk=src.clone(true); sk.position.set(0,0,0); k.add(sk);
      k.position.set(-half+.08+(2*half-.16)*i/Math.max(1,n-1),.3,(i%2?.06:-.06)); k.rotation.set(0,i*1.7,0); k.scale.setScalar(1.9+(i%3)*.25); o.add(k); } };
  if(mcache.nettle_plant) ld(mcache.nettle_plant); else GL.load('models/home/nettle_plant.glb',g=>{ mcache.nettle_plant=g; ld(g); }); }
function syncFurn(){ const H=c.home&&c.home(); if(!H) return;
  for(const it of FITEMS){ const lv=H.furnLv(it.f), want=lv>=it.lv[0]&&lv<=it.lv[1];
    if(want&&!it.obj&&!it.loading){ it.loading=true; const [x,y,z,ry,sc]=it.p;
      put(it.m,x,y,z,ry,sc,o=>{ it.loading=false; o.userData.furn=it.f; if(it.herbs) plantHerbs(o,it.herbs);
        // 新木色太亮的家具壓暗成老木屋的舊木色
        if(it.tint) o.traverse(m=>{ if(m.isMesh){ m.material=m.material.clone(); m.material.color.multiply(new T.Color(it.tint)); } });
        if(!(H.furnLv(it.f)>=it.lv[0]&&H.furnLv(it.f)<=it.lv[1])){ scene.remove(o); dropObs(o); return; } it.obj=o; }); }
    else if(!want&&it.obj){ scene.remove(it.obj); dropObs(it.obj); it.obj=null; } } }
put('mantel_clock_01',ROOM.x-.36,1.38,FP.z+.45,-Math.PI/2,1,o=>{ o.userData.furn='clock'; });  // 壁爐架上：時鐘與木燈籠
put('wooden_lantern_01',ROOM.x-.36,1.38,FP.z-.5,0,.8);
put('hanging_picture_frame_01',-ROOM.x+.02,1.95,-1.0,Math.PI/2,1);   // 掛畫：左牆、水族箱上方
put('hanging_picture_frame_02',0,2.5,ROOM.zb+.02,0,1);
// 燈光：天花板鐵藝吊燈、水族箱兩側壁燈，夜裡全部點亮
put('lantern_chandelier_01',0,H-.02,-1.6,0,1,o=>{ o.userData.furn='light'; lampObj=o; });
const ceilL=new T.PointLight(0xffd9a8,2.4,14,1.0); ceilL.position.set(0,H-.95,-1.6); scene.add(ceilL);
const wallLs=[];
for(const x of [-2.85,2.85]){ put('industrial_wall_lamp',x,2.05,ROOM.zb+.06,0,1); const wl=new T.PointLight(0xffe2b8,1.3,7,1.2); wl.position.set(x,1.9,ROOM.zb+.4); scene.add(wl); wallLs.push(wl); }
const lampL=new T.PointLight(0xffd8a0,1.2,5,1.4); lampL.position.set(LV.x+.2,.9,LV.z-.3); scene.add(lampL);   // 煤油燈

// 水族箱：尺寸跟著等級變；淡水缸在後牆中央，有海水缸時放在右側
const TSPEC=[{w:1.2,h:.6,d:.45,st:.85},{w:1.8,h:.75,d:.55,st:.85},{w:2.6,h:1.0,d:.7,st:.7},{w:3.4,h:1.2,d:.8,st:.55}], SEA_SPEC={w:1.25,h:.62,d:.5,st:.85};
// 底砂壓暗成自然溪砂的灰褐色（原本在缸燈下太白、像雪）
const sandTex={fresh:pbr('clean_pebbles',2,1,{color:0x9c8f78}),sea:pbr('coral_gravel',2,1,{color:0xc8bca6})};
const rockM=new T.MeshStandardMaterial({color:0x6a665e,roughness:.95});
// 缸背景：像真正造景缸貼的霧面背景板——上亮下暗的柔和漸層，中間一團淡淡的光，沒有生硬的線條
const bgTex=(sea)=>{ const cv=document.createElement('canvas'); cv.width=512; cv.height=256; const g=cv.getContext('2d'), gr=g.createLinearGradient(0,0,0,256);
  gr.addColorStop(0,sea?'#3f9cc8':'#3f8f86'); gr.addColorStop(.45,sea?'#145a8a':'#175650'); gr.addColorStop(1,sea?'#04182c':'#06201c'); g.fillStyle=gr; g.fillRect(0,0,512,256);
  const rg=g.createRadialGradient(256,70,10,256,90,260); rg.addColorStop(0,sea?'rgba(190,235,255,.35)':'rgba(200,250,225,.3)'); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=rg; g.fillRect(0,0,512,256);
  const vg=g.createRadialGradient(256,128,120,256,128,330); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.55)'); g.fillStyle=vg; g.fillRect(0,0,512,256);
  const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return t; };
// 圓形柔光氣泡
const bubTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), rg=g.createRadialGradient(13,12,1,16,16,15); rg.addColorStop(0,'rgba(255,255,255,.95)'); rg.addColorStop(.45,'rgba(220,245,255,.35)'); rg.addColorStop(.8,'rgba(200,235,255,.5)'); rg.addColorStop(1,'rgba(200,235,255,0)'); g.fillStyle=rg; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
// 沙底的水波光影（焦散）
const causTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=256; const g=cv.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,256,256); g.strokeStyle='rgba(255,255,255,.9)'; g.lineWidth=2.2;
  for(let i=0;i<28;i++){ g.beginPath(); const x0=Math.random()*256, y0=Math.random()*256; g.moveTo(x0,y0); for(let k=0;k<5;k++) g.quadraticCurveTo(Math.random()*256,Math.random()*256,Math.random()*256,Math.random()*256); g.stroke(); }
  const t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; return t; })();
// 燈具打下來的柔和光束：上濃下淡、左右邊緣柔化
const shaftTex=(()=>{ const cv=document.createElement('canvas'); cv.width=64; cv.height=256; const g=cv.getContext('2d');
  for(let x=0;x<64;x++){ const e=Math.sin(Math.PI*x/63); const gr=g.createLinearGradient(0,0,0,256); gr.addColorStop(0,`rgba(255,255,255,${.9*e})`); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(x,0,1,256); }
  return new T.CanvasTexture(cv); })();
const BG={fresh:bgTex(false),sea:bgTex(true)};
const metalBlack=new T.MeshStandardMaterial({color:0x111214,roughness:.35,metalness:.6});
const glassEdgeM=new T.MeshStandardMaterial({color:0x7fd0b8,transparent:true,opacity:.5,roughness:.1,metalness:.1,depthWrite:false});
const siliconeM=new T.MeshStandardMaterial({color:0x0c0d0e,roughness:.8,transparent:true,opacity:.85});
const brassM=new T.MeshStandardMaterial({color:0xb08a4a,roughness:.3,metalness:.85});
// tanks 依水質存放每個缸：群組、尺寸、位置、魚、水草、氣泡
const tanks={}, causList=[], shaftList=[], tv2=new T.Vector3(), tv3=new T.Vector3();
// 造景缸的木製底櫃：檯面板、門框、內嵌門片、黃銅把手、踢腳
function standCabinet(g,W,Hs,D){ const add=(geo,m,px,py,pz)=>{ const o=new T.Mesh(geo,m); o.position.set(px,py,pz); g.add(o); return o; };
  const body=wood(1,1,0,0x4e3322), face=wood(1,1,Math.PI/2,0x5e3e28), top=wood(2,1,0,0x3e2818);
  add(new T.BoxGeometry(W-.04,Hs-.1,D-.04),body,0,(Hs-.1)/2+.06,0);
  add(new T.BoxGeometry(W+.04,.04,D+.04),top,0,Hs-.02,0);
  add(new T.BoxGeometry(W-.02,.06,D-.06),new T.MeshStandardMaterial({color:0x1e140c,roughness:.8}),0,.03,-.01);
  const n=W>2.4?4:W>1.5?3:2, dw=(W-.1)/n, dh=Hs-.22, fz=D/2-.015;
  for(let i=0;i<n;i++){ const cx=-W/2+.05+dw*(i+.5), cy=.1+dh/2+.02;
    add(new T.BoxGeometry(dw-.02,dh,.02),face,cx,cy,fz);
    for(const [w2,h2,ox,oy] of [[dw-.06,.035,0,dh/2-.045],[dw-.06,.035,0,-dh/2+.045],[.035,dh-.06,-(dw-.06)/2+.0175,0],[.035,dh-.06,(dw-.06)/2-.0175,0]]) add(new T.BoxGeometry(w2,h2,.016),body,cx+ox,cy+oy,fz+.017);
    const kb=add(new T.SphereGeometry(.014,12,8),brassM,cx+(i%2?-1:1)*(dw/2-.07),cy+.02,fz+.03); kb.scale.z=.7; } }
function buildTank(water,spec,x){
  const old=tanks[water]; if(old){ scene.remove(old.g); for(let i=causList.length-1;i>=0;i--) if(causList[i].g===old.g) causList.splice(i,1); for(let i=shaftList.length-1;i>=0;i--) if(shaftList[i].g===old.g) shaftList.splice(i,1); }
  const g=new T.Group(), z=ROOM.zb+spec.d/2+.08, y=spec.st||.85, W=spec.w, D=spec.d, Hh=spec.h; g.position.set(x,0,z); scene.add(g);
  const add=(geo,m,px,py,pz)=>{ const o=new T.Mesh(geo,m); o.position.set(px,py,pz); g.add(o); return o; };
  standCabinet(g,W+.06,y,D+.06);
  // 背景板
  add(new T.PlaneGeometry(W-.02,Hh-.02),new T.MeshBasicMaterial({map:BG[water]}),0,y+Hh/2,-D/2+.012);
  // 底砂：前低後高的斜坡（真正造景的作法），表面有細微起伏；正面看得到底砂的斷面
  const sg=new T.PlaneGeometry(W-.03,D-.03,Math.round(W*14),8).rotateX(-Math.PI/2), sp=sg.attributes.position, hAt=(px,pz)=>{ const back=(D/2-.015-pz)/(D-.03); return .05+back*Math.min(.13,Hh*.14)+Math.sin(px*7.3+pz*5)*.006+Math.sin(px*15)*.003; };
  for(let i=0;i<sp.count;i++) sp.setY(i,hAt(sp.getX(i),sp.getZ(i))); sg.computeVertexNormals();
  add(sg,sandTex[water],0,y,0);
  const sf=new T.PlaneGeometry(W-.03,.05,Math.round(W*14),1), sfp=sf.attributes.position; for(let i=0;i<sfp.count;i++){ if(sfp.getY(i)>0) sfp.setY(i,hAt(sfp.getX(i),D/2-.016)-.025); }
  const sfm=sandTex[water].clone(); sfm.color=new T.Color(0x9a9288); add(sf,sfm,0,y+.025,D/2-.016);
  // 石組：一大兩小呈三角構圖（岩組造景），放在黃金分割的位置
  // 每顆石頭取石組模型裡的單一顆（真實掃描岩石），依缸高決定大小，下半部埋進砂裡
  const rocks=[['rock04',-.19,-.14,.5,0],['rock02',.13,-.18,.3,1.3],['rock05',-.02,.02,.2,2.4],['rock06',.34,-.06,.22,4.1],['rock03',-.38,.06,.18,.7]].slice(0,W>2.5?5:W>1.5?4:3);
  rocks.forEach(([nm,fx,fz,hk,ry])=>GL.load('rock_moss_set_01.glb',gg=>{ const src=gg.scene.getObjectByName('rock_moss_set_01_'+nm); if(!src) return; const k=src.clone(true); k.position.set(0,0,0);
    const b=new T.Box3().setFromObject(k), ctr=b.getCenter(new T.Vector3()); k.position.set(-ctr.x,0,-ctr.z); const o=new T.Group(); o.add(k);
    const px=W*fx, pz=D*fz, sz=b.getSize(new T.Vector3()), sc=Math.min(Hh*hk/Math.max(.2,b.max.y),W*hk*.7/Math.max(sz.x,sz.z)); o.position.set(px,y+hAt(px,pz)-.01,pz); o.rotation.y=ry; o.scale.setScalar(sc); o.traverse(m=>{ m.frustumCulled=false; }); g.add(o); }));
  const woods=W>2.5?[[-.3,-.1,.6,.3],[.28,.05,2.6,.26]]:W>1.1?[[-.22,-.1,.6,.28]]:[];
  woods.forEach(([fx,fz,ry,sc])=>GL.load('dry_branches_medium_01.glb',gg=>{ const o=gg.scene.clone(true); const px=W*fx, pz=D*fz; o.position.set(px,y+hAt(px,pz),pz); o.rotation.set(0,ry,0); o.scale.setScalar(sc); o.traverse(m=>{ m.frustumCulled=false; }); g.add(o); }));
  const plants=[];
  // 水草分三層：後景高的有莖草（真實蕁麻草模型）、中景蕨類、前景低矮的草皮
  const putP=(file,pick,px,pz,sc,ry)=>GL.load(file,gg=>{ let o; if(pick){ const src=gg.scene.getObjectByName(pick); if(!src) return; o=new T.Group(); const k=src.clone(true); k.position.set(0,0,0); k.updateMatrixWorld(true); const c2=new T.Box3().setFromObject(k).getCenter(new T.Vector3()); k.position.set(-c2.x,0,-c2.z); o.add(k); } else o=gg.scene.clone(true);
    o.position.set(px,y+hAt(px,pz)-.005,pz); o.rotation.y=ry; o.scale.setScalar(sc); o.traverse(m=>{ m.frustumCulled=false; }); g.add(o); plants.push({o,ph:Math.random()*6}); });
  // 後景有莖草一叢一叢種：每叢 4～7 株擠在一起、高矮不齊，兩側最高、往中間漸低（造景常用的凹形構圖）
  const stems=['nettle_plant_tall_a_LOD0','nettle_plant_tall_b_LOD0','nettle_plant_medium_a_LOD0','nettle_plant_medium_b_LOD0'], NC=Math.max(3,Math.round(W*2.6));
  for(let c2=0;c2<NC;c2++){ const cx=-W/2+.1+(W-.2)*(c2+.5)/NC+(Math.random()-.5)*.08, edge=Math.abs(cx)/(W/2), hk=.42+.38*edge*edge, n=4+Math.floor(Math.random()*4);
    for(let k=0;k<n;k++){ const px=cx+(Math.random()-.5)*.13, pz=-D/2+.045+Math.random()*D*.2;
      putP('models/home/nettle_plant.glb',stems[(c2+k)%4],px,pz,(Hh*hk/.21)*(.65+Math.random()*.5),Math.random()*6); } }
  for(let i=0;i<Math.round(W*3.2);i++){ const side=i%3===0, px=side?(Math.random()<.5?-1:1)*(W/2-.12-Math.random()*.15):(Math.random()-.5)*(W-.3), pz=-D/2+.08+Math.random()*D*(side?.6:.35);
    putP('fern_02.glb',null,px,pz,(side?.2:.13)+Math.random()*.12,Math.random()*6); }
  for(let i=0;i<Math.round(W*6);i++){ const px=(Math.random()-.5)*(W-.12), pz=D*(.05+Math.random()*.3); putP('grass_medium_01.glb',['grass_medium_01_small_a_LOD0','grass_medium_01_small_b_LOD0','grass_medium_01_mid_c_LOD0'][i%3],px,pz,.5+Math.random()*.3,Math.random()*6); }
  // 氣泡：一半從後角的氣石往上冒成一串，一半零星散在水裡
  const NB=34, bp=new Float32Array(NB*3); for(let i=0;i<NB;i++){ const col=i<18; bp[i*3]=col?W*.42+(Math.random()-.5)*.03:(Math.random()-.5)*W*.8; bp[i*3+1]=y+Math.random()*Hh; bp[i*3+2]=col?-D*.32+(Math.random()-.5)*.03:(Math.random()-.5)*D*.6; }
  const bg=new T.BufferGeometry(); bg.setAttribute('position',new T.BufferAttribute(bp,3));
  const bub=new T.Points(bg,new T.PointsMaterial({map:bubTex,color:0xeaf8ff,size:.024,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending})); g.add(bub);
  add(new T.CylinderGeometry(.018,.022,.02,12),new T.MeshStandardMaterial({color:0x8a8f94,roughness:.9}),W*.42,y+hAt(W*.42,-D*.32)+.005,-D*.32);
  // 沙底焦散：兩層慢慢漂移的水波光影
  const cm=new T.MeshBasicMaterial({map:causTex,transparent:true,opacity:.2,blending:T.AdditiveBlending,depthWrite:false,color:water==='sea'?0x9fdcff:0xbfeedd});
  const cg=sg.clone(); cg.translate(0,.004,0); const ca=new T.Mesh(cg,cm); ca.position.y=y; g.add(ca); ca.renderOrder=2; causList.push({m:cm,s:W,g});
  // 燈具打下來的光束
  for(let i=0;i<Math.round(W*2.2);i++){ const sm=new T.MeshBasicMaterial({map:shaftTex,transparent:true,opacity:.07,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,color:water==='sea'?0xbfe6ff:0xdaf5e6});
    const sh=add(new T.PlaneGeometry(.12+Math.random()*.12,Hh-.1),sm,-W/2+.15+(W-.3)*Math.random(),y+Hh/2,-D*.2+Math.random()*D*.4); sh.rotation.set(0,Math.random()*.6-.3,(Math.random()-.5)*.25); sh.renderOrder=3; shaftList.push({m:sm,ph:Math.random()*6,g}); }
  // 水面：細微反光；正面水線有一條亮亮的彎月面
  const sm2=new T.MeshStandardMaterial({color:0xcfefff,transparent:true,opacity:.22,roughness:.05,metalness:.5,side:T.DoubleSide,depthWrite:false});
  add(new T.PlaneGeometry(W-.03,D-.03).rotateX(-Math.PI/2),sm2,0,y+Hh-.07,0).renderOrder=3;
  add(new T.PlaneGeometry(W-.03,.008),new T.MeshBasicMaterial({color:0xe8f8ff,transparent:true,opacity:.55,depthWrite:false}),0,y+Hh-.07,D/2-.008).renderOrder=5;
  const waterM=new T.MeshStandardMaterial({color:water==='sea'?0x0a4a7a:0x0e4a4a,transparent:true,opacity:.12,roughness:.1,depthWrite:false});   // 水體只輕輕染色，不要把整缸刷淡
  const wv=add(new T.BoxGeometry(W-.02,Hh-.08,D-.02),waterM,0,y+(Hh-.08)/2,0); wv.renderOrder=3;
  // 無框超白玻璃：幾乎透明，只有轉角的玻璃厚度透出淡綠色，接縫是黑色矽利康
  const gl=add(new T.BoxGeometry(W,Hh,D),new T.MeshStandardMaterial({color:0xeaf8ff,transparent:true,opacity:.04,roughness:.03,metalness:.2,depthWrite:false}),0,y+Hh/2,0); gl.renderOrder=4; gl.userData.tank=water;
  for(const sx of [-1,1]) for(const sz of [-1,1]){ add(new T.BoxGeometry(.012,Hh,.012),glassEdgeM,sx*(W/2-.006),y+Hh/2,sz*(D/2-.006)).renderOrder=5; add(new T.BoxGeometry(.006,Hh-.01,.006),siliconeM,sx*(W/2-.014),y+Hh/2,sz*(D/2-.014)); }
  for(const sz of [-1,1]) add(new T.BoxGeometry(W,.012,.012),glassEdgeM,0,y+Hh-.006,sz*(D/2-.006)).renderOrder=5;
  for(const sx of [-1,1]) add(new T.BoxGeometry(.012,.012,D),glassEdgeM,sx*(W/2-.006),y+Hh-.006,0).renderOrder=5;
  add(new T.BoxGeometry(W+.004,.012,D+.004),siliconeM,0,y+.006,0);
  // 吊燈式水族燈：黑色鋁燈架跨在缸上，底面發光
  const ly=y+Hh+.16; add(new T.BoxGeometry(W*.9,.022,Math.min(.16,D*.4)),metalBlack,0,ly,0);
  add(new T.PlaneGeometry(W*.88,Math.min(.14,D*.36)).rotateX(Math.PI/2),new T.MeshBasicMaterial({color:water==='sea'?0xd6eeff:0xfff6e6}),0,ly-.012,0);
  for(const sx of [-1,1]){ add(new T.BoxGeometry(.012,.17,.012),metalBlack,sx*(W*.45-.01),ly-.08,D*.12); add(new T.BoxGeometry(.012,.17,.012),metalBlack,sx*(W*.45-.01),ly-.08,-D*.12); }
  if(!tags.some(q=>q.k==='tank_'+water)){ const tg=makeTag(water==='sea'?'👆 點海水缸觀賞':'👆 點水族箱觀賞'); tg.position.set(x,ly+.2,z); scene.add(tg); tags.push({s:tg,y:ly+.2,k:'tank_'+water}); } else { const tg=tags.find(q=>q.k==='tank_'+water); tg.s.position.set(x,ly+.2,z); tg.y=ly+.2; }
  if(W>2.5){ const L2=new T.PointLight(0x9ad8ff,.6,3,1.4); L2.position.set(-W*.3,y+Hh-.05,0); g.add(L2); const L3=L2.clone(); L3.position.x=W*.3; g.add(L3); }
  const L=new T.PointLight(water==='sea'?0x8ad0ff:0x9ad8ff,.75,3,1.4); L.position.set(0,y+Hh-.05,0); g.add(L);
  tanks[water]={g,spec,x,y,z,fish:[],plants,bub,glass:gl,sig:''};
}

// 把水族箱裡記錄的魚做成會游的模型（用遊戲同一個魚模型，按實際體長縮放）
function fishObj(rec){ const sp=c.species(rec.id); if(!sp) return null; const src=c.getFish(sp).group.clone(true); src.position.set(0,0,0); src.rotation.set(0,0,0); src.scale.setScalar(1); src.visible=true;
  src.traverse(o=>{ o.visible=true; o.frustumCulled=false; if(o.isMesh&&o.material){ const mats=Array.isArray(o.material)?o.material:[o.material];
      const nm=mats.map(m=>{ const k=m.clone(); k.onBeforeCompile=()=>{}; k.customProgramCacheKey=()=>'tank'; const see=m.transparent&&m.opacity<.95; k.transparent=see; k.opacity=see?m.opacity:1; k.depthWrite=!see; k.needsUpdate=true; return k; });   // 半透明的幽靈魚保持半透明
      o.material=Array.isArray(o.material)?nm:nm[0]; o.renderOrder=1; } });
  const w=new T.Group(); w.add(src); const bones=rigFish(src); w.scale.setScalar(rec.L); w.userData.rec=rec; w.userData.real=c.isReal(rec.id); w.userData.bones=bones; return w; }
// 執行時綁骨：魚頭朝群組的 +x；在每個網格的本地座標裡找出「往前」與「往上」的方向，沿長軸放 7 節骨頭，依前後位置線性分配權重
const NB_=7;
function rigFish(root){ root.updateMatrixWorld(true); const inv=new T.Matrix4(), all=[]; const meshes=[]; root.traverse(o=>{ if(o.isMesh&&!o.isSkinnedMesh&&o.geometry&&o.geometry.attributes.position) meshes.push(o); });
  meshes.forEach(o=>{ const g=o.geometry.clone(); const pos=g.attributes.position;
    inv.copy(o.matrixWorld).invert(); const fw=new T.Vector3(1,0,0).transformDirection(inv).normalize(), up=new T.Vector3(0,1,0).transformDirection(inv).normalize();
    let lo=Infinity, hi=-Infinity; for(let i=0;i<pos.count;i++){ const s=pos.getX(i)*fw.x+pos.getY(i)*fw.y+pos.getZ(i)*fw.z; if(s<lo) lo=s; if(s>hi) hi=s; } const len=Math.max(1e-6,hi-lo);
    const si=new Uint16Array(pos.count*4), sw=new Float32Array(pos.count*4);
    for(let i=0;i<pos.count;i++){ const s=pos.getX(i)*fw.x+pos.getY(i)*fw.y+pos.getZ(i)*fw.z, u=(hi-s)/len*(NB_-1), a=Math.min(NB_-2,Math.max(0,Math.floor(u))), f=Math.min(1,Math.max(0,u-a)); si[i*4]=a; si[i*4+1]=a+1; sw[i*4]=1-f; sw[i*4+1]=f; }
    g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4)); g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
    const bones=[]; const c0=new T.Vector3(); g.computeBoundingBox(); g.boundingBox.getCenter(c0); const off=c0.clone().sub(fw.clone().multiplyScalar(c0.dot(fw))); 
    for(let k=0;k<NB_;k++){ const b=new T.Bone(); if(k===0) b.position.copy(off).addScaledVector(fw,hi); else b.position.copy(fw).multiplyScalar(-len/(NB_-1)); if(k>0) bones[k-1].add(b); bones.push(b); }
    const sm=new T.SkinnedMesh(g,o.material); sm.add(bones[0]); sm.bind(new T.Skeleton(bones)); sm.position.copy(o.position); sm.quaternion.copy(o.quaternion); sm.scale.copy(o.scale); sm.frustumCulled=false; sm.renderOrder=1;
    const mats=Array.isArray(sm.material)?sm.material:[sm.material]; mats.forEach(m=>{ m.skinning=true; m.needsUpdate=true; });
    o.parent.add(sm); o.parent.remove(o); all.push({bones,up}); });
  return all; }
const qb_=new T.Quaternion();
// 骨架游泳：擺動波從頭傳到尾，頭幾乎不動、尾巴擺最大；速度越快擺越快越大；轉彎時身體彎成 C 形
function swimBones(f,dt){ const rig=f.o.userData.bones; if(!rig||!rig.length) return; const spd=Math.min(1,f.v*10);
  f.sw=(f.sw||0)+dt*(2.2+spd*7.5); const A=.05+.13*spd, bend=Math.max(-.5,Math.min(.5,f.turnRate||0))*.22;
  rig.forEach(r=>{ r.bones.forEach((b,k)=>{ const u=k/(NB_-1); const amp=k===0?A*.12:A*(.25+.95*u*u); const ang=amp*Math.sin(f.sw-k*.9)+(k>0?bend*u:0); qb_.setFromAxisAngle(r.up,ang); b.quaternion.copy(qb_); }); }); }
// 缸內顯示長度：超過缸寬三成的大魚等比例壓小（保留大小順序），每條魚才有空間真的游來游去
function dispL(tk,L){ const cap=tk.spec.w*.3; return L<=cap?L:cap+(L-cap)*.18; }
function bounds(tk,L){ L=dispL(tk,L); const s=tk.spec, m=Math.min(L*.55,s.w*.4); return {x0:-s.w/2+m+.03,x1:s.w/2-m-.03,y0:tk.y+.16+L*.22,y1:tk.y+s.h-.12-L*.18,z0:-s.d/2+.06+L*.12,z1:s.d/2-.06-L*.12}; }
function pickTarget(f,tk){ const b=bounds(tk,f.rec.L), r=(a,b)=>a+Math.random()*Math.max(0,b-a); const cy=f.o?f.o.position.y:(b.y0+b.y1)/2, dyMax=(b.y1-b.y0)*.3; f.tgt.set(r(b.x0,b.x1),Math.max(b.y0,Math.min(b.y1,cy+(Math.random()-.5)*2*dyMax)),r(Math.min(b.z0,b.z1),Math.max(b.z0,b.z1))); }
function syncFish(){ const hd=c.data(), want={fresh:hd.fresh,sea:hd.seaTank?hd.sea:[]};
  const tierSig='t'+hd.tier+(hd.seaTank?'s':'');
  if(tanks._tier!==tierSig){ tanks._tier=tierSig; buildTank('fresh',TSPEC[hd.tier]||TSPEC[0],hd.seaTank?(hd.tier>=3?-.75:-.55):0); if(hd.seaTank) buildTank('sea',SEA_SPEC,2.25); else if(tanks.sea){ scene.remove(tanks.sea.g); delete tanks.sea; } }
  for(const w of ['fresh','sea']){ const tk=tanks[w]; if(!tk) continue; const list=want[w]||[], sig=list.map(r=>r.id+r.d+(c.isReal(r.id)?'r':'')).join('|');
    if(sig===tk.sig) continue; tk.sig=sig; tk.fish.forEach(f=>tk.g.remove(f.o)); tk.fish=[];
    list.forEach(rec=>{ try{ c.want(rec.id); const o=fishObj(rec); if(!o) return; o.scale.setScalar(dispL(tk,rec.L)); const f={o,rec,tgt:new T.Vector3(),sp:.09+Math.random()*.08,ph:Math.random()*6}; const b=bounds(tk,rec.L);
      o.position.set(b.x0+Math.random()*(b.x1-b.x0),b.y0+Math.random()*(b.y1-b.y0),(Math.random()-.5)*.1); o.rotation.y=Math.random()<.5?0:Math.PI; f.yaw=o.rotation.y; f.o=o; pickTarget(f,tk); tk.g.add(o); tk.fish.push(f);
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
  shaftList.forEach(q=>{ q.m.opacity=.05+.035*Math.sin(t*.35+q.ph); });
  const bp=tk.bub.geometry.attributes.position; for(let i=0;i<bp.count;i++){ let yy=bp.getY(i)+dt*(.12+(i%5)*.03); if(yy>tk.y+tk.spec.h-.08) yy=tk.y+.1; bp.setY(i,yy); } bp.needsUpdate=true;
  const fs=tk.fish;
  fs.forEach(f=>{ const o=f.o; f.v=f.v||0; f.rest=f.rest||0;
    // 偶爾停下來懸浮一會兒
    if(f.rest>0){ f.rest-=dt; f.v+=(0.015-f.v)*Math.min(1,dt*2); }
    else if(Math.random()<dt*.06){ f.rest=1.5+Math.random()*3; }
    tv.subVectors(f.tgt,o.position); const d=tv.length(); if(d<.06){ pickTarget(f,tk); }
    tv.normalize();
    // 跟其他魚保持距離
    fs.forEach(g2=>{ if(g2===f) return; tv2.subVectors(o.position,g2.o.position); const dd=tv2.length(), need=(dispL(tk,f.rec.L)+dispL(tk,g2.rec.L))*.5; if(dd<need&&dd>1e-4){ const k=(need-dd)/need; tv.addScaledVector(tv2.normalize(),k*3.2); if(k>.5) o.position.addScaledVector(tv2,dt*.08*k); } });
    tv.y*=.6; tv.normalize();
    // 航向與俯仰分開控制：航向平滑轉，俯仰限制在 ±17 度內，不會再垂直朝上
    f.yaw=f.yaw===undefined?o.rotation.y:f.yaw; f.pitch=f.pitch||0;
    const want=Math.atan2(-tv.z,tv.x); let dy=want-f.yaw; while(dy>Math.PI) dy-=Math.PI*2; while(dy<-Math.PI) dy+=Math.PI*2;
    const turn=Math.min(1,dt*(0.9+dispL(tk,f.rec.L)*.5)); const dYaw=dy*turn; f.yaw+=dYaw; f.turnRate=dt>0?dYaw/dt:0;
    const pT=Math.max(-.3,Math.min(.3,Math.atan2(tv.y,Math.hypot(tv.x,tv.z))*.7)); f.pitch+=(pT-f.pitch)*Math.min(1,dt*1.5);
    const vmax=f.sp*Math.min(1,.5+dispL(tk,f.rec.L)*2)*(Math.abs(dy)>1.2?.3:1); if(f.rest<=0) f.v+=(vmax-f.v)*Math.min(1,dt*1.2);
    const roll=Math.max(-.25,Math.min(.25,-(f.turnRate||0)*.12));
    o.rotation.order='YZX'; o.rotation.set(roll,f.yaw,f.pitch);
    swimBones(f,dt);
    const cp=Math.cos(f.pitch); const fwd=tv3.set(Math.cos(f.yaw)*cp,Math.sin(f.pitch),-Math.sin(f.yaw)*cp); o.position.addScaledVector(fwd,f.v*dt);
    const b=bounds(tk,f.rec.L); o.position.x=Math.max(b.x0,Math.min(b.x1,o.position.x)); o.position.y=Math.max(b.y0,Math.min(b.y1,o.position.y)); o.position.z=Math.max(Math.min(b.z0,b.z1),Math.min(Math.max(b.z0,b.z1),o.position.z)); }); } }
// 環境光：白天從窗戶進來的光多、夜裡靠爐火和檯燈
const hemi=new T.HemisphereLight(0xfff0dd,0x3a2a1a,.5); scene.add(hemi);
const sun=new T.DirectionalLight(0xfff4e0,.8); sun.position.set(-6,4,-1); sun.target.position.set(0,0,-1); scene.add(sun,sun.target);
function daylight(){ const h=((c.hour()%24)+24)%24; return Math.max(0,Math.min(1,Math.min(h-5.5,19-h)/2)); }
function syncTime(){ const dl=daylight(), h=((c.hour()%24)+24)%24;
  viewM.map=dl>.6?winTex.day:dl>.05?winTex.dawn:winTex.night; viewM.needsUpdate=true; viewM.color.setScalar(.35+.65*dl);
  const lk=lightsOff()?0:1;
  hemi.intensity=(.75+.15*dl)*(lk?1:.45+.55*dl); sun.intensity=.5*dl; ceilL.intensity=(5.0-2.4*dl)*lk; wallLs.forEach(w=>w.intensity=(2.6-1.3*dl)*lk); lampL.intensity=(1.6-.8*dl)*lk; glowM.forEach(m=>m.emissiveIntensity=(1.6-1.2*dl)*lk); }
// 吊燈：點它開關燈（關燈時只剩爐火和窗外的光）
function lightsOff(){ const H=c.home&&c.home(); return !!(H&&H.data().lightOff); }
function resize(){ const s=R.getSize(new T.Vector2()), a=s.x/s.y; cam.aspect=a;
  cam.fov=Math.max(62,Math.min(80,2*Math.atan(Math.tan(23*Math.PI/180)/a)*180/Math.PI)); cam.updateProjectionMatrix(); }   // 直式手機水平視野很窄，垂直視角放大一點
const HINT='點水族箱、壁爐、家具就能使用';
// 輸入：拖曳轉頭；輕點水族箱進入觀賞模式；觀賞模式裡點魚看資料
const el=R.domElement, ray=new T.Raycaster(), ndc=new T.Vector2();
let mode='room', viewTank=null, vb=0, pan=0, panT=0, down=null, dYaw=0, dPitch=0, dYawT=0, dPitchT=0;
const ui={view:document.getElementById('homeView'),card:document.getElementById('fishCard'),hint:document.querySelector('#homeUI .hh'),btns:document.querySelector('#homeUI .hb')};
function hit(e){ const r=el.getBoundingClientRect(); ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(ndc,cam); }
function furnOf(o){ while(o&&!(o.userData&&o.userData.furn)) o=o.parent; return o?o.userData.furn:null; }
function tapRoom(){ const gl=Object.keys(tanks).filter(k=>k!=='_tier').map(k=>tanks[k].glass), h=ray.intersectObjects(gl,false)[0], hm=ray.intersectObjects(mountG.children,true)[0];
  // 家具：取最靠近鏡頭、看得見的那個物體；它屬於某件家具才算點到
  const near=ray.intersectObjects(scene.children,true).find(x=>!x.object.isSprite&&x.object.visible&&!(x.object.material&&x.object.material.visible===false)), fu=near&&furnOf(near.object);
  if(fu&&(!h||near.distance<h.distance)&&(!hm||near.distance<hm.distance)){ ui.card.classList.add('hidden'); tapFurn(fu); return; }
  if(hm&&(!h||hm.distance<h.distance)){ let o=hm.object; while(o&&!o.userData.rec) o=o.parent; if(o){ c.showFish(o.userData.rec,ui.card); return; } }
  ui.card.classList.add('hidden'); if(h){ enterView(h.object.userData.tank); return; }
  const hf=ray.intersectObjects(fpParts,true)[0]; if(hf){ pickFish(); return; }
  const hs=ray.intersectObjects(shopParts,false)[0]; if(hs&&c.openShop) c.openShop(); }
function tapView(){ const tk=tanks[viewTank]; if(!tk) return; const h=ray.intersectObjects(tk.fish.map(f=>f.o),true)[0];
  if(!h){ ui.card.classList.add('hidden'); return; } let o=h.object; while(o&&!o.userData.rec) o=o.parent; if(o) c.showFish(o.userData.rec,ui.card); }
function enterView(w){ mode='view'; document.body.classList.add('tankview'); viewTank=w; pan=panT=0; ui.view.classList.remove('hidden'); ui.btns.classList.add('hidden'); ui.hint.textContent='點一條魚看牠的資料・左右拖曳移動'; }
function exitView(){ mode='room'; document.body.classList.remove('tankview'); ui.view.classList.add('hidden'); ui.card.classList.add('hidden'); ui.btns.classList.remove('hidden'); ui.hint.textContent=HINT; }
document.getElementById('bViewBack').addEventListener('click',()=>{ if(mode==='dive') exitDive(); exitView(); });
// 潛入缸內：鏡頭進到水裡，像人在缸中，可以四處轉頭近看魚；水裡有藍綠色的霧
const diveB=document.getElementById('bDive'), fogDive=new T.FogExp2(0x15565c,.42);
function enterDive(){ if(mode!=='view') return; mode='dive'; document.body.classList.add('tankdive'); dYaw=dYawT=0; dPitch=dPitchT=0; scene.fog=fogDive; diveB.textContent='↑ 浮出水面'; ui.hint.textContent='搖桿在缸裡游動・拖曳轉頭・點魚看資料'; }
const DV={on:false,p:new T.Vector3()};
function exitDive(){ if(mode!=='dive') return; DV.on=false; document.body.classList.remove('tankdive'); mode='view'; scene.fog=null; diveB.textContent='🤿 潛入缸內'; ui.hint.textContent='點一條魚看牠的資料・左右拖曳移動'; }
diveB.addEventListener('click',()=>{ if(mode==='dive') exitDive(); else enterDive(); });
el.addEventListener('pointerdown',e=>{ if(!on) return; down={x:e.clientX,y:e.clientY,t:performance.now()}; drag={x:e.clientX,y:e.clientY,yaw:yawT,pitch:pitchT,pan:panT,dy:dYawT,dp:dPitchT}; });
el.addEventListener('pointermove',e=>{ if(!on||!drag||mode==='act') return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(mode==='dive'){ dYawT=drag.dy-dx*.005; dPitchT=Math.max(-.8,Math.min(.8,drag.dp-dy*.004)); return; }   // 缸裡可以 360 度轉頭
  if(mode==='view'){ const w=tanks[viewTank]?tanks[viewTank].spec.w:1; panT=Math.max(-w*.35,Math.min(w*.35,drag.pan-dx*.003)); return; }
  yawT=drag.yaw-dx*.006; pitchT=Math.max(-.7,Math.min(.6,drag.pitch-dy*.005)); });
window.addEventListener('pointerup',e=>{ if(on&&down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<10&&performance.now()-down.t<450){ hit(e); if(mode==='room') tapRoom(); else if(mode!=='act') tapView(); } drag=null; down=null; });   // 移動很少、時間很短才算點擊
/* ===== 家具使用的動作演出：鏡頭走到家具前（坐下時視線變低），家具本身也會動，做完再回到原位 ===== */
let ACT=null;
const actFade=document.createElement('div'); actFade.style.cssText='position:fixed;inset:0;z-index:21;background:#000;opacity:0;pointer-events:none;display:flex;align-items:center;justify-content:center;color:#cfd8ff;font-size:28px;letter-spacing:.3em;transition:none';
document.body.appendChild(actFade);
const notePg=document.createElement('div'); notePg.className='hidden';
notePg.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:23;width:min(340px,86vw);padding:26px 22px 18px;border-radius:6px;background:linear-gradient(180deg,#efe2c2,#dcc79c);color:#3a2812;font-family:serif;box-shadow:0 12px 40px rgba(0,0,0,.6);line-height:1.9;font-size:17px';
document.body.appendChild(notePg);
notePg.addEventListener('click',()=>{ notePg.classList.add('hidden'); if(ACT) ACT.wait=false; });
const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
// 飄起來的小圖示：拿到魚餌、採到香草時，從家具上方飄起淡出
const pops=[];
function popIcons(list,x,y,z){ list.forEach((em,i)=>{ const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d'); g.font='96px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(em,64,70);
  const tx=new T.CanvasTexture(cv); const sp=new T.Sprite(new T.SpriteMaterial({map:tx,transparent:true,depthTest:false,depthWrite:false})); sp.scale.set(.2,.2,1); sp.renderOrder=21;
  sp.position.set(x+(i-(list.length-1)/2)*.2,y,z); scene.add(sp); pops.push({sp,t:-i*.18,y}); }); }
function updPops(dt){ for(let i=pops.length-1;i>=0;i--){ const q=pops[i]; q.t+=dt; const k=Math.max(0,q.t)/1.8; q.sp.visible=q.t>=0; q.sp.position.y=q.y+k*.55; q.sp.material.opacity=k<.7?1:Math.max(0,1-(k-.7)/.3);
  if(k>=1){ scene.remove(q.sp); q.sp.material.map.dispose(); pops.splice(i,1); } } }
const objOf=m=>{ const it=FITEMS.find(x=>x.m===m); return it&&it.obj; };
// 演出：pos 鏡頭位置、look 看向哪裡、hold 停留秒數、mid 停下來時套用效果、anim 每格的家具動作、fade 是否睡著變暗
function playAct(o){ closeFurn(); mode='act'; document.body.classList.add('acting'); ui.btns.classList.add('hidden'); ui.card.classList.add('hidden'); ui.hint.textContent=o.txt||'';
  const pT=new T.Vector3(...o.pos); lookM.lookAt(pT,tv.set(...o.look),cam.up);
  ACT=Object.assign({t:0,ph:'go',p0:cam.position.clone(),q0:cam.quaternion.clone(),pT,qT:new T.Quaternion().setFromRotationMatrix(lookM),go:.9,back:.8,fired:false,wait:false},o); }
function endAct(){ if(ACT&&ACT.end) ACT.end(); ACT=null; mode='room'; document.body.classList.remove('acting'); actFade.style.opacity=0; actFade.textContent=''; ui.btns.classList.remove('hidden'); ui.hint.textContent=HINT; updFurnTags(); }
function updAct(dt){ updPops(dt); if(!ACT) return; const A=ACT; A.t+=dt;
  if(A.ph==='go'){ const k=ease(A.t/A.go); cam.position.lerpVectors(A.p0,A.pT,k); cam.quaternion.copy(A.q0).slerp(A.qT,k); if(A.t>=A.go){ A.ph='hold'; A.t=0; } return; }
  if(A.ph==='hold'){ if(!A.fired&&A.t>=(A.midAt||0)){ A.fired=true; try{ A.mid&&A.mid(); }catch(e){ console.warn('act mid',e); } }
    cam.position.copy(A.pT); cam.quaternion.copy(A.qT); if(A.anim) A.anim(A.t,dt);
    if(A.t>=A.hold&&!A.wait){ A.ph='back'; A.t=0; A.p0=cam.position.clone(); A.q0=cam.quaternion.clone(); } return; }
  if(A.ph==='back'){ const k=ease(A.t/A.back); if(A.anim) A.anim(A.hold+A.t,dt,true); cam.position.lerpVectors(A.p0,pRoom,k); cam.quaternion.copy(A.q0).slerp(qRoom,k); if(A.t>=A.back) endAct(); } }
// 每件家具的演出
function actFor(id){ if(ACT) return; const H=c.home(), lv=H.furnLv(id), toastR=r=>{ if(r&&r.msg) c.toast&&c.toast(r.msg,r.kind||'good',r.kind?1800:3400); };
  if(id==='sofa'){ playAct({pos:[LV.x-.78,1.0,LV.z+.05],look:[0,1.3,ROOM.zb+.4],hold:3.4,txt:'窩在沙發上，看魚游來游去……',mid:()=>toastR(H.furnUse('sofa')),
    anim:(t)=>{ cam.position.y=1.0+Math.sin(t*1.6)*.006; }}); return; }
  if(id==='rock'){ const ch=objOf('Rockingchair_01'), ry=ch?ch.rotation.y:0; if(ch) ch.rotation.order='YXZ';
    let res=null; playAct({pos:[1.72,1.06,-1.55],look:[ROOM.x-.3,.55,FP.z],hold:5.2,txt:'搖著搖著，眼皮越來越重……',midAt:2.4,mid:()=>{ res=H.furnUse('rock',ACT.opt); syncTime(); actFade.textContent='💤'; },opt:ACT_OPT,
      anim:(t,dt,back)=>{ const a=back?.12*Math.max(0,1-(t-5.2)/.8):.12; const sw=Math.sin(t*2.1)*a; if(ch){ ch.rotation.x=sw; ch.rotation.y=ry; } if(!back){ cam.position.y=1.06+sw*.25; cam.rotateX(sw*.35); }
        const f=t<1?0:t<2.3?(t-1)/1.3:t<3.6?1:t<4.8?1-(t-3.6)/1.2:0; actFade.style.opacity=back?0:f; if(t>=3.6&&actFade.textContent) actFade.textContent=''; },
      end:()=>{ if(ch) ch.rotation.x=0; toastR(res); }}); return; }
  if(id==='shelf'){ playAct({pos:[-1.72,1.56,-2.2],look:[-ROOM.x+.3,1.3,-2.2],hold:.6,txt:'從書架抽出一本手記……',wait:true,mid:()=>{ const r=H.furnUse('shelf'); const m=(r.msg||'').replace(/^📚 /,'').split('　');
      notePg.innerHTML=`<div style="font-size:13px;letter-spacing:.2em;opacity:.7;margin-bottom:8px">— 老漁人的手記 —</div><div>${m[0]||''}</div><div style="margin-top:14px;font-size:14px;color:#7a4a10;font-family:sans-serif">✨ ${m[1]||''}</div><div style="margin-top:12px;font-size:12px;opacity:.6;font-family:sans-serif;text-align:right">點一下闔上手記</div>`;
      notePg.classList.remove('hidden'); }}); return; }
  if(id==='chest'){ const ch=objOf('treasure_chest'), lid=ch&&ch.getObjectByName('treasure_chest_lid'), cur=H.furnInfo('chest').cur, IC={shrimp:'🦐',live:'🐟',moon:'🌙'};
    playAct({pos:[1.55,1.38,-2.7],look:[2.4,.42,ROOM.zb+.45],hold:2.8,txt:'打開老漁人的漁具箱……',midAt:.7,mid:()=>{ toastR(H.furnUse('chest')); popIcons(Object.keys(cur.g).map(k=>IC[k]||'🎣'),2.4,.85,ROOM.zb+.45); },
      anim:(t,dt,back)=>{ if(lid) lid.rotation.x=back?-1.15*(1-ease((t-2.8)/.6)):-1.15*ease(t/.6); }, end:()=>{ if(lid) lid.rotation.x=0; }}); return; }
  if(id==='herb'){ const sp=lv>0, pl=FITEMS.filter(it=>it.f==='herb'&&it.obj).map(it=>it.obj), F=H.furnInfo('herb').st;
    const pos=sp?[-1.85,1.32,.4]:[-1.7,1.35,-2.75], look=sp?[-ROOM.x+.25,.38,.4]:[-2.5,.7,ROOM.zb+.5];
    playAct({pos,look,hold:2.4,txt:'彎下腰採收……',midAt:.6,mid:()=>{ toastR(H.furnUse('herb')); popIcons([...Array(Math.min(3,F.h||0)).fill('🌿'),...Array(Math.min(2,F.l||0)).fill('🍋')],look[0]+.15,look[1]+.45,look[2]); },
      anim:(t)=>{ pl.forEach((o,i)=>o.children.forEach((k,j)=>{ if(k.isGroup&&k.children.length===1) k.rotation.z=Math.sin(t*9+j+i)*.12*Math.max(0,1-t/2); })); }}); return; }
  if(id==='clock'){ playAct({pos:[ROOM.x-1.45,1.55,FP.z+.45],look:[ROOM.x-.36,1.46,FP.z+.45],hold:2.6,txt:'',midAt:.2,mid:()=>clockToast()}); return; } }
let ACT_OPT=null;
function clockToast(){ const h=((c.hour()%24)+24)%24, hh=Math.floor(h), mm=Math.floor((h-hh)*60), per=h>=4.8&&h<8.5?'清晨':h>=8.5&&h<16.5?'白天':h>=16.5&&h<19.8?'黃昏':'夜晚';
  const mi=window.__MOONPH&&window.__MOONPH.illum?Math.round(window.__MOONPH.illum()*100):null;
  c.toast&&c.toast(`🕰 ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}・${per}${mi!=null?'・今晚月亮 '+mi+'% 圓'+(mi>=85?'（滿月前後，月光灣的潮最旺）':''):''}`,'',3200); }
// 吊燈：開關燈時整盞燈輕輕晃幾下
let swingT=0; function swingLamp(dt){ const o=lampObj; if(!o||swingT<=0) return; swingT-=dt; o.rotation.z=Math.sin((2.5-swingT)*5)*.08*Math.max(0,swingT/2.5); if(swingT<=0) o.rotation.z=0; }
let lampObj=null;
/* ===== 家具面板：點家具跳出來，可以使用、看效果、升級 ===== */
const furnUI=document.createElement('div'); furnUI.id='furnPick'; furnUI.className='hidden'; document.body.appendChild(furnUI);
let furnId=null;
function closeFurn(){ furnUI.classList.add('hidden'); document.body.classList.remove('furnOn'); furnId=null; }
function tapFurn(id){ const H=c.home&&c.home(); if(!H||ACT) return;
  if(id==='light'){ const d=H.data(); d.lightOff=!d.lightOff; c.persist&&c.persist(); syncTime(); swingT=2.5; c.click&&c.click(); updFurnTags(); c.toast&&c.toast(d.lightOff?'💡 關燈了，只剩爐火和窗外的光':'💡 開燈','',1400); return; }
  if(id==='clock'){ actFor('clock'); return; }
  if(id==='mount') return;
  furnId=id; renderFurn(); furnUI.classList.remove('hidden'); document.body.classList.add('furnOn'); }
function renderFurn(){ const H=c.home(), F=H.furnInfo(furnId), d=F.def, nx=F.next, lvS=c.save.lv||1, coins=c.save.coins||0;
  const stars='★'.repeat(F.lv+1)+'☆'.repeat(d.lv.length-1-F.lv);
  let h=`<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:800;font-size:16px">${d.i} ${d.n} <span style="color:#e8b84a">${stars}</span></div><button class="sbtn" data-f="x">關閉</button></div>
    <div style="font-size:13px;opacity:.8;margin:4px 0 8px">${d.use}${F.cur.n?'・目前：'+F.cur.n:''}</div>
    <div class="it"><span>${F.cur.d}<br><small style="opacity:.75">${F.st.txt}</small></span></div>`;
  if(furnId==='fire') h+=`<div class="it"><span>點壁爐就能烤魚</span><button class="sbtn pri" data-f="grill">🔥 烤魚</button></div>`;
  else if(furnId==='rock'&&F.cur.pick) h+=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">`+['清晨','正午','黃昏','夜晚'].map((n,i)=>`<button class="sbtn pri" data-f="use" data-o="${i}" style="flex:1">睡到${n}</button>`).join('')+`</div>`;
  else h+=`<div style="margin:8px 0"><button class="btn pri" data-f="use" style="width:100%;padding:10px${F.st.ok?'':';opacity:.45'}">${d.act}</button></div>`;
  if(furnId==='shelf'&&window.__STORY&&window.__STORY.done&&window.__STORY.done('c7')) h+=`<div style="margin:8px 0"><button class="btn" data-f="book" style="width:100%;padding:10px;background:#f3e2bf;color:#3a2610">📖 月潮・完整的故事</button></div>`;
  if(nx){ const can=lvS>=nx.need&&coins>=nx.p;
    h+=`<div style="font-weight:700;margin-top:6px">升級：${nx.n}</div><div class="it"><span>${nx.d}<br><small style="opacity:.75">需要 Lv ${nx.need}${lvS<nx.need?'（目前 Lv '+lvS+'）':''}</small></span><button class="sbtn${can?' pri':''}" data-f="up">🪙 ${nx.p.toLocaleString()}</button></div>`; }
  else h+=`<div style="font-size:12px;opacity:.7;margin-top:6px">已經升到最高級</div>`;
  furnUI.innerHTML=h; }
furnUI.addEventListener('click',e=>{ const b=e.target.closest('[data-f]'); if(!b||!furnId) return; const H=c.home(), a=b.dataset.f;
  if(a==='x'){ closeFurn(); return; }
  if(a==='grill'){ closeFurn(); pickFish(); return; }
  if(a==='book'){ closeFurn(); if(typeof showStoryBook==='function') showStoryBook(); return; }
  if(a==='up'){ const m=H.furnUp(furnId); if(m){ c.toast&&c.toast(m,'warn',1600); return; } syncFurn(); c.toast&&c.toast('升級好了：'+H.furnInfo(furnId).cur.n,'good',1800); c.coin&&c.coin(); renderFurn(); return; }
  if(a==='use'){ const id=furnId, st=H.furnInfo(id).st; if(!st.ok&&id!=='rock'){ c.toast&&c.toast(st.txt,'warn',1800); return; }
    ACT_OPT=b.dataset.o!=null?+b.dataset.o:null; actFor(id); } });
// 每件能點的家具上方都有提示標籤；有東西可以領、可以採、可以用時變成金色
const FTAG=[['sofa',[LV.x-1.0,1.3,LV.z]],['rock',[1.7,1.48,-1.6]],['shelf',[-ROOM.x+.35,2.45,-2.2]],['chest',[2.4,1.32,ROOM.zb+.45]],['herb',[-2.75,1.05,.35]],['light',[0,2.52,-1.15]],['clock',[ROOM.x-.4,2.0,FP.z+.6]],['mount',[ROOM.x-.12,2.62,-2.45]]];
const furnTags=FTAG.map(([f,pos])=>{ const tg=makeTag(''); tg.position.set(...pos); scene.add(tg); const r={s:tg,y:pos[1],k:'f_'+f,f,ready:false}; tags.push(r); return r; });
function tagTxt(f,H){ if(f==='light') return [lightsOff()?'💡 點吊燈開燈':'💡 點吊燈關燈',false];
  if(f==='clock') return ['🕰 點時鐘看時間',false];
  if(f==='mount') return ['🖼 點標本看資料',false];
  const F=H.furnInfo(f), ok=F.st.ok;
  if(f==='sofa') return ok?['🛋️ 坐下休息',true]:['🛋️ 沙發・'+F.st.wait+' 分後',false];
  if(f==='rock') return ['🪑 搖椅打個盹',false];
  if(f==='shelf') return ok?['📚 讀手記',true]:['📚 書架・'+F.st.wait+' 分後',false];
  if(f==='chest') return ok?['🧰 補給可以領！',true]:['🧰 漁具箱',false];
  if(f==='herb') return ok?['🌿 可以採收！',true]:['🌿 香草生長中',false];
  return ['',false]; }
function updFurnTags(){ const H=c.home&&c.home(); if(!H) return; const mounts=(c.data().mounts||[]).length;
  furnTags.forEach(t=>{ const [txt,hot]=tagTxt(t.f,H); setTag(t.s,txt,hot); t.ready=t.f==='mount'?mounts>0:true;
    if(t.f==='herb'){ if(H.furnLv('herb')===0){ t.s.position.set(-2.5,1.6,ROOM.zb+.5); t.y=1.6; } else { t.s.position.set(-2.75,1.05,.35); t.y=1.05; } } }); }
let furnTick=0;
// 開遊戲時就把目前等級的家具載好；其他等級的模型等一下在背景預先載入，升級時立刻換好，不用等
setTimeout(()=>{ try{ syncFurn(); }catch(e){ console.warn('furn init',e); } },1500);
setTimeout(()=>{ const names=[...new Set(FITEMS.map(it=>it.m).concat(['nettle_plant']))].filter(n=>!mcache[n]);
  const next=()=>{ const n=names.shift(); if(!n) return; if(mcache[n]){ next(); return; } GL.load('models/home/'+n+'.glb',g=>{ mcache[n]=g; setTimeout(next,400); },undefined,()=>setTimeout(next,400)); };
  next(); },25000);
window.__HOMEFURN=()=>{ syncFurn(); syncTime(); updFurnTags(); };
window.__HOMETAP=id=>{ if(on) tapFurn(id); };
/* ===== 壁爐烤魚：魚串在鐵叉上，靠火的那面會熟；魚皮依熟度從生色→金黃→焦黑，出現烤痕；冒煙、油滴竄火、滋滋聲 ===== */
const GR={on:false, drops:[]};
{ const dt_=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=16; const g=cv.getContext('2d'), rg=g.createRadialGradient(8,8,0,8,8,8); rg.addColorStop(0,'rgba(255,236,170,1)'); rg.addColorStop(.6,'rgba(230,170,60,.8)'); rg.addColorStop(1,'rgba(200,120,20,0)'); g.fillStyle=rg; g.fillRect(0,0,16,16); return new T.CanvasTexture(cv); })();
  for(let i=0;i<12;i++){ const s=new T.Sprite(new T.SpriteMaterial({map:dt_,transparent:true,depthWrite:false})); s.visible=false; scene.add(s); GR.drops.push({s,vy:0}); } }
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
function cookMat(m,bb){ const k=m.clone(); const ax=(bb.max.x-bb.min.x)>=(bb.max.z-bb.min.z)?0:2, lo=ax?bb.min.z:bb.min.x, hi=ax?bb.max.z:bb.max.x, yl=bb.min.y, yh=bb.max.y;
  k.onBeforeCompile=sh=>{ sh.uniforms.uCA=GR.uA; sh.uniforms.uCB=GR.uB; sh.uniforms.uCurl=GR.uCurl;
    sh.vertexShader='uniform float uCurl;\nvarying float vSZ;\nvarying float vL;\nvarying float vH;\nvarying vec3 vOP;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vSZ=normal.${ax?'x':'z'}; float L_=(${ax?'position.z':'position.x'}-(${lo.toFixed(4)}))/(${(hi-lo).toFixed(4)}); vL=L_; vH=(position.y-(${yl.toFixed(4)}))/(${(yh-yl).toFixed(4)}); vOP=position;
      float e_=(L_-0.5)*2.0; transformed.y+=uCurl*e_*e_*${((hi-lo)*.05).toFixed(4)};`);
    sh.fragmentShader='uniform float uCA;\nuniform float uCB;\nvarying float vSZ;\nvarying float vL;\nvarying float vH;\nvarying vec3 vOP;\n'+
      'float hh_(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }\nfloat nn_(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(hh_(i),hh_(i+vec3(1,0,0)),f.x),mix(hh_(i+vec3(0,1,0)),hh_(i+vec3(1,1,0)),f.x),f.y),mix(mix(hh_(i+vec3(0,0,1)),hh_(i+vec3(1,0,1)),f.x),mix(hh_(i+vec3(0,1,1)),hh_(i+vec3(1,1,1)),f.x),f.y),f.z); }\n'+
      sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec3 P_=vOP*${(14/Math.max(1e-4,hi-lo)).toFixed(3)};
      float ck=mix(uCB,uCA,smoothstep(-0.35,0.35,vSZ));
      float edge=max(smoothstep(0.78,0.98,abs(vL-0.5)*2.0),smoothstep(0.82,0.98,vH)*0.8);
      float patchy=nn_(P_*0.9)*0.5+nn_(P_*2.3)*0.3+nn_(P_*5.1)*0.2;
      float k_=ck*(0.78+0.45*patchy)+edge*ck*0.55;
      vec3 skin=diffuseColor.rgb;
      vec3 c=skin*mix(vec3(1.0),vec3(1.06,0.95,0.80),smoothstep(0.1,0.4,k_));
      c=c*mix(vec3(1.0),vec3(0.80,0.56,0.30),smoothstep(0.35,0.85,k_));
      c=mix(c,c*vec3(0.62,0.38,0.18)+vec3(0.06,0.03,0.0),smoothstep(0.7,1.0,k_)*0.8);
      float crk=smoothstep(0.93,0.99,1.0-abs(nn_(P_*vec3(2.2,7.0,2.2))*2.0-1.0))*smoothstep(0.6,0.9,ck)*smoothstep(0.5,0.8,nn_(P_*0.7));
      c=mix(c,vec3(0.90,0.80,0.62),crk*0.55);
      float bl=smoothstep(0.78,0.95,nn_(P_*6.0))*smoothstep(0.6,0.95,k_);
      c=mix(c,c*0.45,bl*0.7);
      c=mix(c,vec3(0.05,0.035,0.03),smoothstep(0.95,1.3,k_));
      diffuseColor.rgb=c;`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=mix(roughnessFactor,0.28,smoothstep(0.3,0.75,ck))*mix(1.0,2.6,smoothstep(1.0,1.3,ck));
      roughnessFactor=clamp(roughnessFactor,0.15,1.0);`); };
  k.customProgramCacheKey=()=>'grillfish2'; k.needsUpdate=true; return k; }
GR.uA={value:0}; GR.uB={value:0}; GR.uCurl={value:0};
function pickFish(){ const list=(c.save.cooler||[]);
  const inv=c.save.inv=c.save.inv||{}, sea=GR.season||'salt';
  const SZ=[['salt','🧂 鹽','免費・效果時間 +20%',null],['lemon','🍋 檸檬','完美的範圍變寬・效果時間 +30%',150],['herb','🌿 香草','完美時再多一個效果（咬餌更快）',300]];
  const sz=SZ.map(([id,n,d,p])=>{ const have=p===null?'∞':(inv[id]||0), on=sea===id;
    return `<div class="it"><span>${n} <small>${d}</small><br><small style="opacity:.7">持有 ${have}</small></span><span>${p!==null?`<button class="sbtn" data-buy="${id}" data-p="${p}">買 🪙${p}</button> `:''}<button class="sbtn${on?' pri':''}" data-sz="${id}">${on?'使用中':'使用'}</button></span></div>`; }).join('');
  const ck=c.save.cook||{}, perf=Object.keys(ck).filter(k=>ck[k].best>=3);
  const dex=`<div style="margin-top:10px;font-weight:700">📖 料理圖鑑：完美 ${perf.length} 種</div><div style="font-size:12px;opacity:.85;line-height:1.8">${Object.keys(ck).map(k=>{ const sp=c.species(k); return (sp?sp.name:k)+(ck[k].best>=3?'⭐':ck[k].best>=1?'🟡':'⚫'); }).join('　')||'還沒烤過魚'}</div>`;
  const empty=list.length?'':'<div style="font-size:13px;line-height:1.7;opacity:.9;padding:6px 2px 10px">保冷箱是空的。<br>出門釣魚，釣到魚時在漁獲卡按「<b>🔥 放進保冷箱，帶回去烤</b>」，回來就能在這裡烤（最多 5 條）。</div>';
  pickUI.innerHTML='<div style="font-weight:700;margin-bottom:6px">🔥 壁爐烤魚・保冷箱（'+list.length+'/5）</div>'+empty+list.map((r,i)=>{ const sp=c.species(r.id); return `<div class="it"><span>${sp?sp.name:r.id}　<small>${Math.round(r.L*100)} 公分</small></span><button class="sbtn pri" data-g="${i}">烤這條</button></div>`; }).join('')
    +'<div style="margin-top:10px;font-weight:700">調味</div>'+sz+dex+'<div style="text-align:right;margin-top:8px"><button class="sbtn" data-g="x">關閉</button></div>';
  pickUI.classList.remove('hidden'); document.body.classList.add('grilling'); }
pickUI.addEventListener('click',e=>{ const bz=e.target.closest('[data-sz],[data-buy]');
  if(bz){ if(bz.dataset.buy){ if(c.buy&&c.buy(bz.dataset.buy,+bz.dataset.p)){ c.save.inv[bz.dataset.buy]=(c.save.inv[bz.dataset.buy]||0)+1; c.persist&&c.persist(); } }
    else { const id=bz.dataset.sz; if(id!=='salt'&&!(c.save.inv[id]>0)){ c.toast&&c.toast('先買一份','warn',1400); return; } GR.season=id; }
    document.body.classList.remove('grilling'); pickFish(); return; }
  if(e.target.closest('[data-eat]')) return; const b=e.target.closest('[data-g]'); if(!b) return; pickUI.classList.add('hidden'); if(b.dataset.g==='x'){ document.body.classList.remove('grilling'); return; } startGrill(+b.dataset.g); });
function startGrill(i){ const rec=(c.save.cooler||[])[i]; if(!rec) return; const sp=c.species(rec.id); if(!sp){ document.body.classList.remove('grilling'); return; }
  const src=c.getFish(sp).group.clone(true); src.position.set(0,0,0); src.rotation.set(0,0,0); src.scale.setScalar(1); src.visible=true;
  src.traverse(o=>{ o.visible=true; o.frustumCulled=false; if(o.isMesh&&o.material){ const ms=Array.isArray(o.material)?o.material:[o.material]; o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox; const nm=ms.map(mm=>cookMat(mm,bb)); o.material=Array.isArray(o.material)?nm:nm[0]; } });
  const L=Math.min(.55,Math.max(.18,rec.L)); const w=new T.Group(); w.add(src); w.scale.setScalar(L); w.rotation.y=Math.PI/2;
  spin.clear(); spin.add(w); spin.rotation.set(0,0,0); rig.visible=true;
  const need=7+Math.min(14,Math.sqrt(rec.w||.5)*6);
  let season=GR.season||'salt'; if(season!=='salt'){ const inv=c.save.inv||{}; if((inv[season]||0)>0) inv[season]--; else season='salt'; }
  Object.assign(GR,{on:true,i,rec,sp,a:0,b:0,face:0,flipT:0,need,t:0,dripT:1,smT:0,useSeason:season}); GR.uA.value=0; GR.uB.value=0;
  document.getElementById('gTitle').textContent='烤 '+sp.name+'（約 '+Math.round(need)+' 秒一面）';
  grillUI.classList.remove('hidden'); pickUI.classList.add('hidden'); document.body.classList.add('grilling'); mode='grill'; }
function endGrill(){ GR.drops.forEach(D=>D.s.visible=false); GR.on=false; rig.visible=false; spin.clear(); grillUI.classList.add('hidden'); document.body.classList.remove('grilling'); mode='room'; smokes.forEach(s=>{ s.m.visible=false; }); flare.visible=false; }
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
  const heat=(1/GR.need)*(fireM.opacity+.3)/1.15*(c.grillHeat?c.grillHeat():1);
  GR.uCurl.value=Math.min(1,(GR.a+GR.b)*.5);
  if(GR.flipT<=0){ if(GR.face===0) GR.a+=heat*dt; else GR.b+=heat*dt; }
  GR.uA.value=GR.a; GR.uB.value=GR.b;
  const top=GR.face===0?GR.a:GR.b, oth=GR.face===0?GR.b:GR.a;
  document.getElementById('gA').style.left=Math.min(100,top*82)+'%'; document.getElementById('gB').style.left=Math.min(100,oth*82)+'%';
  document.getElementById('gHint').textContent=top>1.05?'冒黑煙了！快翻面！':top>.78?'這面完美了，可以翻面':top>.55?'魚皮開始金黃…':top>.25?'滋滋作響，魚肉漸漸變白':'等魚皮慢慢變色…';
  // 煙：熟度越高越多，焦了變黑煙
  GR.smT-=dt; if(GR.smT<=0&&top>.15){ GR.smT=top>1?.06:.18; const s=smokes.find(x=>!x.m.visible); if(s){ s.m.visible=true; s.t=0; s.life=1.6+Math.random()*1.2; s.m.position.copy(GP).add(tv.set((Math.random()-.5)*.1,.03,(Math.random()-.5)*.35)); s.dark=top>1; s.m.material.color.set(top>1?0x2a2420:0xd8d4cc); } }
  smokes.forEach(s=>{ if(!s.m.visible) return; s.t+=dt; const k=s.t/s.life; if(k>=1){ s.m.visible=false; return; } s.m.position.y+=dt*.35; s.m.position.x-=dt*.05; const sc=.12+k*.45; s.m.scale.set(sc,sc,1); s.m.material.opacity=(s.dark?.55:.32)*Math.sin(k*Math.PI); });
  // 油滴進火：火光竄起、滋滋聲
  // 油滴：熟到一定程度，金黃的油從魚身滴下，落進火裡才竄起火光、滋一聲
  GR.dripT-=dt; if(GR.dripT<=0&&top>.3){ GR.dripT=(top>.7?.25:.6)+Math.random()*.9; const D=GR.drops.find(q=>!q.s.visible); if(D){ D.s.position.copy(GP).add(tv.set(.03,-.05,(Math.random()-.5)*Math.min(.45,GR.rec.L*.8))); D.vy=0; D.s.visible=true; } }
  GR.drops.forEach(D=>{ if(!D.s.visible) return; D.vy-=9.8*dt; D.s.position.y+=D.vy*dt; D.s.scale.set(.012,.02+Math.min(.03,-D.vy*.01),1);
    if(D.s.position.y<.3){ D.s.visible=false; flare.visible=true; flare.position.set(D.s.position.x+.05,.36,D.s.position.z); sparkM.opacity=.95; fireL.intensity*=1.5; c.sizzle&&c.sizzle(.3+Math.random()*.35); } });
  if(flare.visible){ sparkM.opacity-=dt*2.2; flare.scale.setScalar(.35+(.9-sparkM.opacity)*.3); if(sparkM.opacity<=0) flare.visible=false; }
  spin.position.y=Math.sin(GR.t*1.3)*.003; }
function enter(){ on=true; yaw=yawT=0; pitch=pitchT=-.08; vb=0; pRoom.set(0,EYE,.9); resize(); for(const f of [syncTime,syncFish,syncMounts,exitView,syncFurn,updFurnTags,closeFurn]){ try{ f(); }catch(err){ console.error('home enter',err); } } try{ if(c.onEnter) c.onEnter(); }catch(err){ console.error(err); } }
function exit(){ on=false; drag=null; if(GR.on) endGrill(); pickUI.classList.add('hidden'); closeFurn(); if(ACT) endAct(); notePg.classList.add('hidden'); document.body.classList.remove('grilling'); exitDive(); exitView(); }
const qDive=new T.Quaternion(), pDive=new T.Vector3(), qRoom=new T.Quaternion(), qView=new T.Quaternion(), pRoom=new T.Vector3(0,EYE,.9), bobT={v:0}, pView=new T.Vector3(), eul=new T.Euler(0,0,0,'YXZ'), lookM=new T.Matrix4();
let syncT=0;
function render(dt){ t+=dt; yaw+=(yawT-yaw)*Math.min(1,dt*8); pitch+=(pitchT-pitch)*Math.min(1,dt*8); pan+=(panT-pan)*Math.min(1,dt*6);
  vb+=((mode!=='room'&&mode!=='act'?1:0)-vb)*Math.min(1,dt*4); dYaw+=(dYawT-dYaw)*Math.min(1,dt*6); dPitch+=(dPitchT-dPitch)*Math.min(1,dt*6);
  // 在房間裡用搖桿走動：前進／後退、左右轉；不能走進水族箱、壁爐和牆
  if(mode==='room'&&c.joy){ const j=c.joy(); if(Math.abs(j.thr)>.05||Math.abs(j.turn)>.05){ yawT-=j.turn*dt*1.7; const sp=1.3*j.thr*dt, fx=-Math.sin(yaw), fz=-Math.cos(yaw); let nx=pRoom.x+fx*sp, nz=pRoom.z+fz*sp;
      nx=Math.max(-ROOM.x+.5,Math.min(ROOM.x-.5,nx)); nz=Math.max(ROOM.zb+1.6,Math.min(ROOM.zf-.5,nz)); if(nx>ROOM.x-1.3&&Math.abs(nz-FP.z)<1.2) nx=ROOM.x-1.3;
      // 撞到家具：先試沿 x、再試沿 z 滑過去，都不行就停住
      if(blocked(nx,nz)){ if(!blocked(nx,pRoom.z)) nz=pRoom.z; else if(!blocked(pRoom.x,nz)) nx=pRoom.x; else { nx=pRoom.x; nz=pRoom.z; } }
      pRoom.x=nx; pRoom.z=nz; bobT.v+=dt*7; } pRoom.y=EYE+Math.sin(bobT.v)*.012; }
  eul.set(pitch,yaw,0); qRoom.setFromEuler(eul);
  const tk=tanks[viewTank]||tanks.fresh;
  if(tk){ const s=tk.spec, hf=Math.atan(Math.tan(cam.fov*Math.PI/360)*cam.aspect), dist=Math.max(s.h*.75/Math.tan(cam.fov*Math.PI/360),(s.w*.42)/Math.tan(hf))+s.d/2;
    pView.set(tk.x+pan,tk.y+s.h/2,tk.z+dist);
    // 觀賞模式：把鏡頭和魚缸之間的家具（茶几等）裁掉，畫面只留魚缸
    { const nr=mode==='view'?Math.max(.05,(dist-s.d/2-.35)*vb):.05; if(Math.abs(cam.near-nr)>.01){ cam.near=nr; cam.updateProjectionMatrix(); } } lookM.lookAt(pView,tv.set(tk.x+pan,tk.y+s.h/2,tk.z),cam.up); qView.setFromRotationMatrix(lookM); }
  if(mode==='grill'){ pDive.set(ROOM.x-1.45,1.0,FP.z-.15); lookM.lookAt(pDive,tv.set(GP.x,GP.y-.05,GP.z),cam.up); qDive.setFromRotationMatrix(lookM); cam.position.lerp(pDive,Math.min(1,dt*3)); cam.quaternion.slerp(qDive,Math.min(1,dt*4)); }
  else if(mode==='dive'&&tk){ const s2=tk.spec; if(!DV.on){ DV.on=true; DV.p.set(tk.x,tk.y+s2.h*.5,tk.z+s2.d*.3); }
    // 缸內游動：搖桿前後游、左右轉向，拖曳畫面轉頭；碰到玻璃就停住
    if(c.joy){ const j=c.joy(); dYawT-=j.turn*dt*1.4; const sp=.35*j.thr*dt, cp=Math.cos(dPitch); DV.p.x+=-Math.sin(dYaw)*cp*sp; DV.p.z+=-Math.cos(dYaw)*cp*sp; DV.p.y+=Math.sin(dPitch)*sp; }
    DV.p.x=Math.max(tk.x-s2.w/2+.06,Math.min(tk.x+s2.w/2-.06,DV.p.x)); DV.p.y=Math.max(tk.y+.12,Math.min(tk.y+s2.h-.08,DV.p.y)); DV.p.z=Math.max(tk.z-s2.d/2+.05,Math.min(tk.z+s2.d/2-.05,DV.p.z));
    pDive.copy(DV.p); pDive.y+=Math.sin(t*.9)*.006; eul.set(dPitch,dYaw,0); qDive.setFromEuler(eul);
    cam.position.lerp(pDive,Math.min(1,dt*3)); cam.quaternion.slerp(qDive,Math.min(1,dt*4)); }
  else { const k=vb*vb*(3-2*vb); cam.position.lerpVectors(pRoom,pView,k); cam.quaternion.copy(qRoom).slerp(qView,k); }
  const fl=.85+.15*Math.sin(t*9)+.08*Math.sin(t*23)+.05*Math.sin(t*41); fireL.intensity=2.2*fl; fireM.opacity=.7+.3*fl;
  flames.forEach((f,i)=>{ f.material.uniforms.uT.value=t*(1+i*.07)+i*3.1; f.scale.y=.92+.12*Math.sin(t*(3.1+i))+.06*Math.sin(t*11+i); }); emberU.uT.value=t; FU.uK.value=1;
  if(Math.random()<dt*7){ const S=sparks.find(q=>!q.s.visible); if(S){ S.s.position.set(ROOM.x-.3+(Math.random()-.5)*.15,.25,FP.z+(Math.random()-.5)*.4); S.v.set((Math.random()-.5)*.15,.5+Math.random()*.6,(Math.random()-.5)*.15); S.t=0; S.life=.8+Math.random()*1.2; S.s.visible=true; } }
  sparks.forEach(S=>{ if(!S.s.visible) return; S.t+=dt; if(S.t>S.life){ S.s.visible=false; return; } S.v.x+=Math.sin(t*5+S.life*9)*dt*.3; S.s.position.addScaledVector(S.v,dt); S.s.material.opacity=(1-S.t/S.life)*(.6+.4*Math.sin(t*30+S.life*50)); });
  if((syncT+=dt)>1){ syncT=0; try{ syncTime(); syncFish(); syncMounts(); }catch(err){ console.error('home sync',err); } }   // 每秒同步一次：剛帶回的魚、升級的缸、晚一步載好的真實模型
  if(c.crackle&&Math.random()<dt*2.2) c.crackle();
  tags.forEach((g,j)=>{ g.s.position.y=g.y+Math.sin(t*2+j)*.03; g.s.visible=mode==='room'&&!GR.on&&pickUI.classList.contains('hidden')&&furnUI.classList.contains('hidden')&&(!g.f||g.ready); });
  updAct(dt); swingLamp(dt);
  furnTick-=dt; if(furnTick<=0){ furnTick=3; updFurnTags(); syncTime(); }
  updGrill(dt);   // 爐火劈啪聲，隨機間隔
  updTanks(dt); R.setRenderTarget(null); R.render(scene,cam); }
window.addEventListener('resize',()=>{ if(on) resize(); });
return {enter,exit,render,active:()=>on,scene,cam,grill:()=>pickFish(),grillSet:(a,b,f)=>{ if(!GR.on) return; GR.a=a; GR.b=b; if(f!=null){ GR.face=f; spin.rotation.z=f*Math.PI; } }};
}
