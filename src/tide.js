/* ===== 潮間帶（蚵仔寮泥灘）：退潮時才能下灘；看泥面痕跡判斷底下是什麼，用手指刮開沙泥把牠挖出來
   ・潮汐：每天兩次退潮（04:30～07:30、16:30～19:30），漲潮前 40／20 分鐘警告並亮出撤離路線，時間到強制撤離
   ・痕跡：單孔會噴水＝文蛤、鑰匙孔雙孔＝赤嘴蛤、細長凹痕＝竹蟶、細爪痕＋小沙球＝海瓜子、大洞＋沙堆＝沙蟹洞、盤繞泥條＝沙蠶、平坦＝多半是空的
   ・挖掘：刮開濕沙→黏泥→碎貝殼層，每層聲音與震動不同；碰到硬殼要放慢清周圍，刮太快會刮破；竹蟶會往下縮、沙蟹會想逃
   ・泥面上還有招潮蟹、彈塗魚、寄居蟹在活動，點牠們可以抓
   ・挖到的放進桶子，離開時可以全部賣掉，或放進保冷箱帶回家烤（文蛤、赤嘴蛤、海瓜子、竹蟶、沙蟹）；沙蠶變成魚餌 ===== */
function createTide(W,c){
'use strict';
const T=THREE, rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const S=new T.Scene(), cam=new T.PerspectiveCamera(58,1,.05,400);
const sky=new T.Color(0xb9c4c8); S.background=sky; S.fog=new T.Fog(sky,25,140);
S.add(new T.HemisphereLight(0xeef4f8,0x6a6050,2.3)); const sun=new T.DirectionalLight(0xfff2dc,1.6); sun.position.set(30,60,-20); S.add(sun);
// 泥灘地面：實拍貼圖＋法線，一般重複（不鏡射，鏡射會出現對稱花紋）；再疊一層大尺度明暗起伏，打散重複感
const TL=new T.TextureLoader(), tx=(f,r,srgb)=>{ const t=TL.load(f); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(r,r); t.rotation=.37; if(srgb) t.encoding=T.sRGBEncoding; t.anisotropy=8; return t; };
const mudT=tx('models/tide/mud_diff.jpg',34,true), mudN=tx('models/tide/mud_nor.jpg',34), sandT=tx('models/tide/sand_diff.jpg',26,true), sandN=tx('models/tide/sand_nor.jpg',26);
const breakUp=m=>{ m.onBeforeCompile=sh=>{ sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vWP;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vWP;').replace('#include <map_fragment>','#include <map_fragment>\n{ float v=sin(vWP.x*.071+sin(vWP.y*.053)*2.)*.5+sin(vWP.y*.089+vWP.x*.031)*.5; diffuseColor.rgb*=0.82+0.18*v; }'); }; return m; };
const ground=new T.Mesh(new T.PlaneGeometry(260,260).rotateX(-Math.PI/2),breakUp(new T.MeshStandardMaterial({map:mudT,normalMap:mudN,normalScale:new T.Vector2(1.2,1.2),roughness:.32,metalness:.05,color:0xd8d0c4}))); S.add(ground);   // 濕泥面微反光
const sandBand=new T.Mesh(new T.PlaneGeometry(260,40).rotateX(-Math.PI/2),breakUp(new T.MeshStandardMaterial({map:sandT,normalMap:sandN,roughness:.8,color:0xe6dccb}))); sandBand.position.set(0,.01,40); S.add(sandBand);
// 海水：從遠處慢慢漲回來
const sea=new T.Mesh(new T.PlaneGeometry(400,300).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x4d6a72,roughness:.12,metalness:.3,transparent:true,opacity:.92})); sea.position.set(0,.06,-200); S.add(sea);
// 撤離路線：插竿＋小旗（漲潮警告時亮起）
const route=new T.Group(); S.add(route); route.visible=false;
for(let i=0;i<9;i++){ const p=new T.Mesh(new T.CylinderGeometry(.03,.03,1.4,6),new T.MeshStandardMaterial({color:0x8a6a44})); p.position.set(Math.sin(i*.6)*1.5,.7,30-i*7); route.add(p);
  const f=new T.Mesh(new T.PlaneGeometry(.45,.28),new T.MeshBasicMaterial({color:0xff5a2a,side:T.DoubleSide})); f.position.set(p.position.x+.23,1.25,p.position.z); route.add(f); }

/* ---------- 生物資料 ---------- */
const CR={
  hardclam:{n:'文蛤',sign:'hole',depth:2.0,size:[.04,.09],hard:1,price:90,desc:'泥面上一個會噴水的小圓孔。'},
  gomphina:{n:'赤嘴蛤',sign:'key',depth:1.8,size:[.03,.06],hard:1,price:110,desc:'並排的兩個小孔，是入水管和出水管。'},
  tellin:{n:'海瓜子',sign:'pellet',depth:1.2,size:[.015,.03],hard:.5,fragile:1,price:60,desc:'細細的爪痕和小沙球附近，殼又薄又脆。'},
  razor:{n:'竹蟶',sign:'slit',depth:2.3,size:[.07,.13],hard:.8,dive:1,price:140,desc:'細長的凹痕，牠直立埋在泥裡，一受驚就往下縮。'},
  ghostcrab:{n:'沙蟹',sign:'burrow',depth:1.6,size:[.04,.07],hard:.6,flee:1,price:70,desc:'洞口有一堆新挖出來的沙。動作太慢牠會從另一頭溜走。'},
  ragworm:{n:'沙蠶',sign:'cast',depth:1.0,size:[.1,.2],hard:0,soft:1,price:20,bait:1,desc:'盤繞的泥條是牠排出來的。挖到可以當魚餌。'}
};
const SURF={fiddler:{n:'招潮蟹',price:40},mudskip:{n:'彈塗魚',price:55},hermit:{n:'寄居蟹',price:35}};
const ALL=Object.assign({},CR,SURF);
/* ---------- 泥面痕跡貼花（程式畫，跟實拍泥地融在一起） ---------- */
function decal(kind){ const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d'); g.translate(64,64);
  const hole=(x,y,r)=>{ const rg=g.createRadialGradient(x,y,0,x,y,r*2.2); rg.addColorStop(0,'rgba(20,16,10,1)'); rg.addColorStop(.45,'rgba(40,32,22,.9)'); rg.addColorStop(.6,'rgba(150,140,120,.5)'); rg.addColorStop(1,'rgba(150,140,120,0)'); g.fillStyle=rg; g.beginPath(); g.arc(x,y,r*2.2,0,7); g.fill(); };
  if(kind==='hole') hole(0,0,6);
  if(kind==='key'){ hole(-6,0,4.5); hole(6,0,4.5); }
  if(kind==='slit'){ g.fillStyle='rgba(28,22,14,.95)'; g.beginPath(); g.ellipse(0,0,14,4,0,0,7); g.fill(); g.strokeStyle='rgba(160,150,128,.6)'; g.lineWidth=3; g.stroke(); }
  if(kind==='pellet'){ for(let i=0;i<46;i++){ const a=Math.random()*7, r=8+Math.random()*34; g.fillStyle='rgba(120,108,88,.95)'; g.beginPath(); g.arc(Math.cos(a)*r,Math.sin(a)*r,2.2+Math.random()*1.6,0,7); g.fill(); }
    g.strokeStyle='rgba(60,50,36,.6)'; g.lineWidth=1.4; for(let i=0;i<12;i++){ const a=Math.random()*7; g.beginPath(); g.moveTo(Math.cos(a)*6,Math.sin(a)*6); g.lineTo(Math.cos(a)*30,Math.sin(a)*30); g.stroke(); } hole(0,0,3); }
  if(kind==='burrow'){ g.fillStyle='rgba(176,164,138,.95)'; g.beginPath(); g.ellipse(14,10,26,16,.4,0,7); g.fill(); hole(-8,-6,9); }
  if(kind==='cast'){ g.strokeStyle='rgba(84,70,50,.95)'; g.lineWidth=6; g.lineCap='round'; g.beginPath(); for(let t=0;t<14;t+=.2){ const r=4+t*2.2; g.lineTo(Math.cos(t)*r,Math.sin(t)*r); } g.stroke(); }
  if(kind==='flat'){ g.fillStyle='rgba(90,80,64,.25)'; g.beginPath(); g.arc(0,0,10,0,7); g.fill(); }
  const t=new T.CanvasTexture(cv); return new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}); }
const DEC={}; ['hole','key','slit','pellet','burrow','cast','flat'].forEach(k=>DEC[k]=decal(k));
let signs=[];
function spawnSigns(){ signs.forEach(s=>S.remove(s.m)); signs=[]; const kinds=Object.keys(CR);
  for(let i=0;i<22;i++){ const k=Math.random()<.22?null:kinds[Math.floor(Math.random()*kinds.length)];
    const sign=k?CR[k].sign:'flat', m=new T.Mesh(new T.PlaneGeometry(.9,.9).rotateX(-Math.PI/2),DEC[sign]); m.position.set(rand(-14,14),.02,rand(-26,12)); m.rotation.y=rand(0,6.28); S.add(m);
    signs.push({m,k,sign,done:false,spurt:rand(2,6)}); } }
/* ---------- 泥面上的活生物（3D 模型＋骨架） ---------- */
let roamers=[];
function spawnRoamers(){ roamers.forEach(r=>S.remove(r.g)); roamers=[];
  for(const [id,n] of [['fiddler',6],['mudskip',4],['hermit',3]]) for(let i=0;i<n;i++){ const sp=c.species(id); let f=null; try{ if(window.__MDL&&window.__MDL.fishReady(id)) f=window.__MDL.fish(sp); }catch(e){} if(!f) continue;
    const L=sp?(sp.len[0]+Math.random()*(sp.len[1]-sp.len[0]))/100:.05; f.group.scale.setScalar(L*1.4); f.group.position.set(rand(-12,12),.01,rand(-22,10)); S.add(f.group);
    roamers.push({id,g:f.group,uni:f.uni,h:rand(0,6.28),t:rand(0,3),hop:0,L,flee:0}); } }
/* ---------- 狀態 ---------- */
let on=false, yaw=0, pitch=-.32, pos=new T.Vector3(0,1.6,18), bag=[], warned=0, evac=false, endH=0;
const LOW=[[4.5,7.5],[16.5,19.5]];
function lowWin(h){ for(const w of LOW) if(h>=w[0]&&h<w[1]) return w; return null; }
function nextLow(h){ for(const w of LOW) if(h<w[0]) return w[0]; return LOW[0][0]+24; }
/* ---------- HUD ---------- */
const hud=document.createElement('div'); hud.id='tideHud'; hud.innerHTML=`<div id="tdClock"></div><div id="tdBag"></div><div id="tdHint">看泥面的痕跡判斷底下是什麼，點痕跡開挖・拖曳轉頭・兩指或上下拖曳前進</div><button id="tdExit">⬅ 回岸上</button>`;
document.body.appendChild(hud);
const st=document.createElement('style'); st.textContent=`body.attide #top,body.attide #top2,body.attide #act,body.attide #joy,body.attide #hint,body.attide #magWin{display:none!important}
#tideHud{position:fixed;inset:0;pointer-events:none;z-index:6;display:none;font-family:inherit}
#tideHud>div,#tideHud>button{position:absolute;pointer-events:auto}
#tdClock{left:12px;max-width:52vw!important;top:calc(env(safe-area-inset-top,0px) + 12px);background:rgba(10,20,24,.72);color:#fff;border-radius:14px;padding:8px 12px;font-weight:700;font-size:14px;max-width:62vw}
#tdBag{right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);background:rgba(10,20,24,.72);color:#fff;border-radius:14px;padding:8px 12px;font-size:13px}
#tdHint{left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 74px);text-align:center;color:#fff;text-shadow:0 1px 3px #000;font-size:13px}
#tdExit{left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);border:0;border-radius:999px;padding:12px 22px;background:#ffcf66;color:#3a2600;font-weight:800;font-size:15px}
#tdWarn{position:fixed;left:50%;top:30%;transform:translateX(-50%);z-index:8;background:rgba(170,30,20,.92);color:#fff;border-radius:16px;padding:14px 18px;font-weight:800;font-size:15px;text-align:center;display:none;max-width:86vw;line-height:1.5}
#digBox{position:fixed;inset:0;z-index:9;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;flex-direction:column;touch-action:none}
#digBox canvas{border-radius:18px;box-shadow:0 8px 30px rgba(0,0,0,.6);touch-action:none;width:min(88vw,380px);height:min(88vw,380px)}
#digInfo{color:#fff;margin-top:10px;font-size:14px;text-align:center;min-height:42px;padding:0 16px;text-shadow:0 1px 2px #000}
#digBtns{display:flex;gap:10px;margin-top:8px}#digBtns button{border:0;border-radius:999px;padding:10px 18px;font-weight:800}`;
document.head.appendChild(st);
const warnEl=document.createElement('div'); warnEl.id='tdWarn'; document.body.appendChild(warnEl);
const $=id=>document.getElementById(id);
function bagText(){ $('tdBag').textContent='🪣 桶子 '+bag.length+' 個・約 🪙'+bag.reduce((a,b)=>a+b.v,0).toLocaleString(); }
/* ---------- 聲音與震動（每一層不同） ---------- */
let AC=null; function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function noise(dur,f,q,vol){ const a=ac(); if(!a) return; const b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
  const s=a.createBufferSource(); s.buffer=b; const fl=a.createBiquadFilter(); fl.type='bandpass'; fl.frequency.value=f; fl.Q.value=q; const g=a.createGain(); g.gain.value=vol; s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(); }
const LAYER=[{n:'濕沙',col:[150,138,116],snd:()=>noise(.06,2600,1.2,.12),vib:4,hard:.9},{n:'黏泥',col:[92,80,62],snd:()=>noise(.12,420,3,.2),vib:10,hard:.55},{n:'碎貝殼層',col:[168,158,140],snd:()=>noise(.04,5200,6,.14),vib:6,hard:.4}];
const vib=p=>{ try{ navigator.vibrate&&navigator.vibrate(p); }catch(e){} };
/* ---------- 挖掘小遊戲：30×30 格的深度，手指刮哪一格就往下挖 ---------- */
const box=document.createElement('div'); box.id='digBox'; box.innerHTML='<canvas id="digCv" width="360" height="360"></canvas><div id="digInfo"></div><div id="digBtns"></div>'; document.body.appendChild(box);
const cv=box.querySelector('canvas'), g2=cv.getContext('2d'), N=30, CS=12;
const mudImg=new Image(); mudImg.crossOrigin='anonymous'; mudImg.src=(window.__CDN?window.__CDN.url('tide_mud.jpg'):'tide_mud.jpg');
const spr={}; function sprite(id){ if(!spr[id]){ const im=new Image(); im.crossOrigin='anonymous'; im.src=(window.__CDN?window.__CDN.url('tide_'+id+'.png'):'tide_'+id+'.png'); spr[id]=im; } return spr[id]; }
let dig=null;
function startDig(s){ const k=s.k, cr=k?CR[k]:null; const dep=new Float32Array(N*N); dep.fill(3.2);
  const body={cx:15+rand(-3,3),cy:15+rand(-3,3),rx:0,ry:0,ang:rand(0,3.14)}; if(cr){ const sz=rand(cr.size[0],cr.size[1]); body.rx=clamp(sz*70,2.5,11); body.ry=body.rx*(k==='razor'?.32:k==='ragworm'?.25:.78); }
  dig={s,k,cr,dep,body,depth:cr?cr.depth:9,dmg:0,found:false,hit:0,t:0,fled:false,last:null,lastT:0,size:cr?rand(cr.size[0],cr.size[1]):0};
  $('digInfo').textContent=cr?'用手指刮開沙泥，慢慢往下挖…':'這裡看起來沒什麼痕跡，挖挖看？'; $('digBtns').innerHTML='<button id="dgGive" style="background:#333;color:#fff">放棄</button>';
  $('dgGive').onclick=()=>{ endDig(false); }; box.style.display='flex'; drawDig(); }
function inBody(x,y){ const b=dig.body; const dx=x+.5-b.cx, dy=y+.5-b.cy, ca=Math.cos(b.ang), sa=Math.sin(b.ang); const u=(dx*ca+dy*sa)/b.rx, v=(-dx*sa+dy*ca)/b.ry; return u*u+v*v<=1; }
function drawDig(){ const d=dig; g2.clearRect(0,0,360,360);
  if(mudImg.complete) g2.drawImage(mudImg,0,0,mudImg.width*.3,mudImg.height*.3,0,0,360,360); else { g2.fillStyle='#8a7a62'; g2.fillRect(0,0,360,360); }
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const z=d.dep[y*N+x]; if(z>3) continue; const li=z>2?0:z>1?1:2, c=LAYER[li].col, sh=.75+.25*(z%1);
    g2.fillStyle=`rgb(${c[0]*sh|0},${c[1]*sh|0},${c[2]*sh|0})`; g2.fillRect(x*CS,y*CS,CS,CS); }
  // 露出的殼／身體：只畫已經挖到那個深度的格子
  if(d.cr&&!d.fled){ const im=sprite(d.k); if(im.complete&&im.naturalWidth){ g2.save(); g2.beginPath(); let any=false;
      for(let y=0;y<N;y++) for(let x=0;x<N;x++){ if(inBody(x,y)&&d.dep[y*N+x]<=3-d.depth*.9){ g2.rect(x*CS,y*CS,CS,CS); any=true; } }
      if(any){ g2.clip(); const b=d.body; g2.translate(b.cx*CS,b.cy*CS); g2.rotate(b.ang); const w=b.rx*2*CS*1.05, h=b.ry*2*CS*1.05; g2.drawImage(im,-w/2,-h/2,w,h); }
      g2.restore(); } }
  if(d.dmg>0&&d.cr){ g2.strokeStyle='rgba(255,255,255,'+Math.min(.8,d.dmg*.25)+')'; g2.lineWidth=2; g2.beginPath(); const b=d.body; for(let i=0;i<d.dmg;i++){ g2.moveTo(b.cx*CS+rand(-8,8),b.cy*CS+rand(-8,8)); g2.lineTo(b.cx*CS+rand(-14,14),b.cy*CS+rand(-14,14)); } g2.stroke(); } }
function reveal(){ const d=dig; let tot=0,vis=0; for(let y=0;y<N;y++) for(let x=0;x<N;x++) if(inBody(x,y)){ tot++; if(d.dep[y*N+x]<=3-d.depth*.9) vis++; } return tot?vis/tot:0; }
function scrape(px,py,spd){ const d=dig; if(!d||d.done) return; const gx=px/CS, gy=py/CS, R=1.6; let layerHit=-1, onShell=false;
  for(let y=Math.floor(gy-R);y<=gy+R;y++) for(let x=Math.floor(gx-R);x<=gx+R;x++){ if(x<0||y<0||x>=N||y>=N) continue; const r=Math.hypot(x+.5-gx,y+.5-gy); if(r>R) continue;
    const i=y*N+x, z=d.dep[i], li=z>2?0:z>1?1:2; let amt=.09*(1-r/R)*LAYER[li].hard;
    if(d.cr&&!d.fled&&inBody(x,y)&&z<=3-d.depth*.9+.05){ onShell=true; amt=0; }   // 殼本身挖不下去
    d.dep[i]=Math.max(0,z-amt); layerHit=li; }
  const now=performance.now(); if(now-d.lastT>70&&layerHit>=0){ d.lastT=now; LAYER[layerHit].snd(); vib(LAYER[layerHit].vib); }
  if(onShell&&d.cr){ if(!d.found){ d.found=true; vib([30,40,30]); noise(.05,1600,8,.25); $('digInfo').textContent=d.cr.soft?'碰到軟軟的東西了，輕一點把周圍的泥撥開':'碰到硬硬的東西了！放慢速度，沿著周圍清掉泥'; }
    const lim=d.cr.fragile?600:d.cr.soft?700:1000; if(spd>lim&&now-d.hit>220){ d.hit=now; d.dmg++; vib(60); noise(.08,900,4,.35); $('digInfo').textContent=d.cr.soft?'太用力了，'+d.cr.n+'被扯斷了一截！':'喀！刮太快把殼刮傷了（'+d.dmg+'）'; } }
  drawDig(); const rv=reveal();
  if(d.found&&rv>.82){ d.done=true; const ok=d.dmg<3, cr=d.cr, v=Math.round(cr.price*(.6+d.size*6)*(ok?1-d.dmg*.2:.3));
    bag.push({id:d.k,v,L:+d.size.toFixed(3),broken:!ok}); bagText(); vib([20,30,60]);
    $('digInfo').innerHTML=`<b>${ok?'完整取出':'取出了，但殼破了'}：${cr.n}</b> ${Math.round(d.size*100)} 公分・🪙${v}<br><small>${cr.desc}</small>`;
    $('digBtns').innerHTML='<button id="dgOk" style="background:#ffcf66;color:#3a2600">放進桶子</button>'; $('dgOk').onclick=()=>endDig(true); }
  else if(d.found&&rv>.15&&!(d.cr.fragile||d.cr.soft)) $('digInfo').textContent='露出 '+Math.round(rv*100)+'%・繼續慢慢清周圍'; }
function endDig(got){ if(!dig) return; dig.s.done=true; dig.s.m.material=DEC.flat; if(got&&dig.k){ showCatch(dig.k,dig.s.m.position); } dig=null; box.style.display='none'; }
let ptr=null;
cv.addEventListener('pointerdown',e=>{ ptr={x:e.offsetX*360/cv.clientWidth,y:e.offsetY*360/cv.clientHeight,t:performance.now()}; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove',e=>{ if(!ptr||!dig) return; const x=e.offsetX*360/cv.clientWidth, y=e.offsetY*360/cv.clientHeight, now=performance.now(), dt=Math.max(1,now-ptr.t), spd=Math.hypot(x-ptr.x,y-ptr.y)/dt*1000;
  const steps=Math.ceil(Math.hypot(x-ptr.x,y-ptr.y)/4); for(let i=1;i<=steps;i++) scrape(ptr.x+(x-ptr.x)*i/steps,ptr.y+(y-ptr.y)*i/steps,spd); ptr={x,y,t:now}; });
cv.addEventListener('pointerup',()=>{ ptr=null; });
// 竹蟶往下縮、沙蟹想逃：挖得太慢就會失手
function digTick(dt){ const d=dig; if(!d||d.done||!d.cr) return; d.t+=dt;
  if(d.cr.dive&&d.found){ d.depth=Math.min(3.1,d.depth+dt*.08); if(d.depth>3.05){ d.fled=true; d.done=true; $('digInfo').textContent='竹蟶縮到深處去了…要挖得又快又準'; $('digBtns').innerHTML='<button id="dgOk" style="background:#555;color:#fff">好吧</button>'; $('dgOk').onclick=()=>endDig(false); drawDig(); } }
  if(d.cr.flee&&!d.found&&d.t>9){ d.fled=true; d.done=true; $('digInfo').textContent='沙蟹從另一個出口溜走了！洞口有沙堆的要挖快一點'; $('digBtns').innerHTML='<button id="dgOk" style="background:#555;color:#fff">可惜</button>'; $('dgOk').onclick=()=>endDig(false); } }
/* ---------- 挖出來的生物：在洞旁邊用 3D 模型＋骨架動一下 ---------- */
const shown=[];
function showCatch(id,p){ const sp=c.species(id); if(!sp) return; try{ if(!window.__MDL||!window.__MDL.fishReady(id)) return; const f=window.__MDL.fish(sp); f.group.scale.setScalar(Math.max(.06,(sp.len[0]+sp.len[1])/200)*1.5); f.group.position.set(p.x+.3,.05,p.z); S.add(f.group); shown.push({f,t:0}); }catch(e){} }
/* ---------- 進入／離開 ---------- */
function enter(){ const h=c.hour(), w=lowWin(h); if(!w){ const n=nextLow(h); c.toast(`🌊 現在是滿潮，泥灘都在水下。下次退潮 ${String(Math.floor(n%24)).padStart(2,'0')}:${n%1?'30':'00'}`,'warn',3200); return false; }
  on=true; endH=w[1]; warned=0; evac=false; bag=[]; yaw=0; pitch=-.32; pos.set(0,1.6,18); spawnSigns(); spawnRoamers(); bagText(); hud.style.display='block'; document.body.classList.add('attide');
  c.toast('🦀 退潮了！看泥面痕跡找生物。注意右上角的漲潮時間','good',3200); return true; }
function exit(forced){ if(!on) return; on=false; hud.style.display='none'; warnEl.style.display='none'; box.style.display='none'; dig=null; document.body.classList.remove('attide');
  roamers.forEach(r=>S.remove(r.g)); roamers=[]; shown.forEach(s=>S.remove(s.f.group)); shown.length=0;
  if(forced&&bag.length){ bag.splice(Math.ceil(bag.length/2)); }
  c.onExit(bag.slice(),forced); bag=[]; }
$('tdExit').onclick=()=>exit(false);
/* ---------- 操作：拖曳轉頭與前進、點痕跡或活生物 ---------- */
const canvas=W.renderer.domElement; let drag=null;
const ray=new T.Raycaster(), v2=new T.Vector2();
function down(e){ if(!on||dig) return; drag={x:e.clientX,y:e.clientY,yaw,moved:0,t:performance.now()}; }
function move(e){ if(!on||!drag||dig) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y; drag.moved=Math.max(drag.moved,Math.hypot(dx,dy)); yaw=drag.yaw-dx*.005;
  const sp=-dy*.0009; pos.x+=-Math.sin(yaw)*sp*20*.05; pos.z+=-Math.cos(yaw)*sp*20*.05; pos.x=clamp(pos.x,-18,18); pos.z=clamp(pos.z,-30,22); }
function up(e){ if(!on||!drag||dig) return; const was=drag; drag=null; if(was.moved>10) return;
  v2.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(v2,cam);
  const rh=ray.intersectObjects(roamers.map(r=>r.g),true); if(rh.length){ let o=rh[0].object; const r=roamers.find(q=>{ let x=o; while(x){ if(x===q.g) return true; x=x.parent; } return false; });
      if(r&&r.g.position.distanceTo(pos)<6){ if(Math.random()<.55){ const sp=c.species(r.id); bag.push({id:r.id,v:SURF[r.id].price+Math.round(Math.random()*30),L:r.L}); bagText(); S.remove(r.g); roamers.splice(roamers.indexOf(r),1); vib(30); c.toast('抓到'+SURF[r.id].n+'了！','good',1400); }
        else { r.flee=2; r.h=Math.atan2(r.g.position.x-pos.x,r.g.position.z-pos.z); c.toast(SURF[r.id].n+'溜走了，慢慢靠近再試','',1400); } return; } }
  const hits=ray.intersectObjects(signs.filter(s=>!s.done).map(s=>s.m)); if(hits.length){ const s=signs.find(q=>q.m===hits[0].object); if(s.m.position.distanceTo(pos)>7){ c.toast('走近一點才能挖','',1200); return; } startDig(s); } }
canvas.addEventListener('pointerdown',down); window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
/* ---------- 每一格 ---------- */
let t=0;
let rspawn=0;
function render(dt){ if(!on) return; t+=dt; if(!roamers.length&&(rspawn-=dt)<=0){ rspawn=2; spawnRoamers(); } /* 模型下載好就放出泥面上的生物 */ const h=c.hour(), left=(endH-h)*60;   // 剩下幾分鐘（遊戲時間）
  $('tdClock').innerHTML=left>40?`🌊 退潮中・離漲潮還有 ${Math.floor(left)} 分`:`<span style="color:#ffb39a">⚠️ 漲潮倒數 ${Math.max(0,Math.floor(left))} 分</span>`;
  if(left<=40&&warned<1){ warned=1; warnEl.innerHTML='🌊 潮水開始回漲了！<br><small>請沿著插著橘色旗子的路線往岸邊移動</small>'; warnEl.style.display='block'; setTimeout(()=>warnEl.style.display='none',3800); vib([80,60,80]); route.visible=true; }
  if(left<=20&&warned<2){ warned=2; warnEl.innerHTML='⚠️ 二十分鐘後滿潮！立刻撤離<br><small>真實的泥灘：漲潮速度常比走路快，泥灘也會陷住腳。一定要先查潮汐表、結伴、提早離開</small>'; warnEl.style.display='block'; setTimeout(()=>warnEl.style.display='none',5200); vib([120,80,120,80,120]); }
  if(left<=0&&!evac){ evac=true; c.toast('🌊 潮水漲上來了！你被救生員帶回岸邊，桶子裡掉了一半','warn',4200); setTimeout(()=>exit(true),600); }
  // 海水往岸邊推進
  const k=clamp(1-left/40,0,1); sea.position.z=-200+k*k*175;
  // 噴水的文蛤孔、會動的痕跡
  signs.forEach(s=>{ if(s.done||s.k!=='hardclam') return; s.spurt-=dt; if(s.spurt<=0){ s.spurt=rand(3,7); if(s.m.position.distanceTo(pos)<9&&window.__P_splash) window.__P_splash(s.m.position.x,0,s.m.position.z); } });
  // 活生物：招潮蟹橫著走、彈塗魚一跳一跳、寄居蟹慢慢爬；骨架擺動
  roamers.forEach(r=>{ r.t-=dt; if(r.t<=0){ r.t=rand(1.5,4); r.h+=rand(-1.4,1.4); } const near=r.g.position.distanceTo(pos)<2.5; if(near&&r.flee<=0){ r.flee=1.5; r.h=Math.atan2(r.g.position.x-pos.x,r.g.position.z-pos.z); }
    r.flee-=dt; const sp=(r.id==='hermit'?.05:r.id==='fiddler'?.18:.12)*(r.flee>0?3:1);
    if(r.id==='mudskip'){ r.hop-=dt; if(r.hop<=0){ r.hop=rand(.8,2.2); r.jy=.35; } r.jy=Math.max(0,(r.jy||0)-dt*1.4); r.g.position.y=Math.sin(Math.min(1,(.35-r.jy)/.35)*Math.PI)*.08; }
    const side=r.id==='fiddler'?Math.PI/2:0; r.g.position.x+=Math.sin(r.h)*sp*dt; r.g.position.z+=Math.cos(r.h)*sp*dt; r.g.rotation.y=r.h-Math.PI/2+side;
    r.g.position.x=clamp(r.g.position.x,-18,18); r.g.position.z=clamp(r.g.position.z,-30,20); r.uni.uSwim.value+=dt*(4+sp*30); r.uni.uAmp.value=.05+sp*.4; });
  shown.forEach(s=>{ s.t+=dt; s.f.uni.uSwim.value+=dt*8; s.f.uni.uAmp.value=.08+.06*Math.sin(s.t*3); s.f.group.rotation.y+=dt*.6; });
  digTick(dt);
  cam.position.copy(pos); cam.rotation.set(pitch,yaw,0,'YXZ'); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix();
  W.renderer.render(S,cam); }
return {testDig:k=>{ const s=signs.find(q=>q.k===k&&!q.done)||signs.find(q=>q.k); if(s) startDig(s); return !!s; },enter,exit,render,active:()=>on,low:h=>!!lowWin(h),nextLow,CR,SURF,ALL};
}
