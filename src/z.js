/* ===== 結局演出系統：在真實的湖與海場景裡運鏡，電影黑邊、字幕、配樂、略過、片尾名單 ===== */
function createEnding(W,c){
'use strict';
const T=THREE;
let on=false, shots=[], si=0, st=0, cur=null, onDone=null, hidden=[];
const camP=new T.Vector3(), camL=new T.Vector3(), tA=new T.Vector3(), tB=new T.Vector3(), mtx=new T.Matrix4(), q=new T.Quaternion();
// 畫面層：上下黑邊、字幕、全黑轉場、略過鈕、片尾名單
const css=document.createElement('style');
css.textContent=`#endFX{position:fixed;inset:0;z-index:40;pointer-events:none;font-family:'Noto Serif TC','Songti TC',serif;color:#f2ecdf}
#endFX.hidden{display:none}
#endFX .bar{position:absolute;left:0;right:0;height:12vh;background:#000;transition:transform 1.6s ease}
#endFX .bt{top:0;transform:translateY(-100%)}#endFX .bb{bottom:0;transform:translateY(100%)}
#endFX.in .bt,#endFX.in .bb{transform:none}
#endFX .blk{position:absolute;inset:0;background:#000;opacity:0;transition:opacity 1.2s ease}
#endFX .sub{position:absolute;left:8%;right:8%;bottom:calc(12vh + 18px);text-align:center;font-size:18px;line-height:1.75;text-shadow:0 2px 12px #000,0 0 3px #000;opacity:0;transition:opacity 1.1s ease;white-space:pre-line}
#endFX .sub.show{opacity:1}#endFX .sub.q{color:#ffe7b0}#endFX .sub.big{font-size:22px;letter-spacing:.08em}
#endFX .skip{position:absolute;right:14px;top:calc(12vh + 10px);pointer-events:auto;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.25);color:#ddd;border-radius:999px;padding:6px 14px;font-size:13px;font-family:sans-serif}
#endFX .roll{position:absolute;left:0;right:0;top:100%;text-align:center;line-height:2.1;font-size:16px;text-shadow:0 2px 10px #000}
#endFX .roll h2{font-size:30px;letter-spacing:.25em;margin:0 0 6px;color:#ffe3a3}#endFX .roll .r{opacity:.65;font-size:13px;letter-spacing:.2em;margin-top:26px}
#endFX .roll .n{font-size:18px}#endFX .roll .last{margin-top:60px;font-size:19px;color:#ffe7b0}
body.ending>*:not(#endFX):not(canvas):not(#toast){visibility:hidden!important}
#endFX>*{visibility:visible!important}`;
document.head.appendChild(css);
const fx=document.createElement('div'); fx.id='endFX'; fx.className='hidden';
fx.innerHTML='<div class="blk"></div><div class="bar bt"></div><div class="bar bb"></div><div class="sub"></div><div class="roll"></div><button class="skip">略過 ›</button>';
document.body.appendChild(fx);
const blk=fx.querySelector('.blk'), sub=fx.querySelector('.sub'), roll=fx.querySelector('.roll'), skipB=fx.querySelector('.skip');
let skipArm=0;
skipB.addEventListener('click',()=>{ if(!skipArm){ skipArm=performance.now(); skipB.textContent='再按一次略過'; return; } finish(true); });
// 配樂：兩首 CC0 鋼琴曲（Centurion_of_war〈Emotional Piano〉獨奏版與弦樂版），淡入淡出切換
const MUS={piano:new Audio('end_piano.mp3'),theme:new Audio('end_theme.mp3')}; Object.values(MUS).forEach(a=>{ a.preload='none'; a.volume=0; });
let musWant=null, musVol=.75;
function music(k,vol){ musWant=k; if(vol!=null) musVol=vol; const a=MUS[k]; if(a&&c.soundOn()){ if(a.paused){ a.currentTime=0; a.play().catch(()=>{}); } } }
function updMusic(dt){ for(const [k,a] of Object.entries(MUS)){ const tg=on&&k===musWant&&c.soundOn()?musVol:0; a.volume=Math.max(0,Math.min(1,a.volume+(tg-a.volume)*Math.min(1,dt*.8)));
  if(!on&&a.volume<.01&&!a.paused) a.pause(); if(on&&k===musWant&&a.ended){ a.currentTime=0; a.play().catch(()=>{}); } } }
// 字幕：一次顯示一段，淡入淡出
let subQ=[], subT=0;
function say(txt,cls,d){ subQ.push({txt,cls:cls||'',d:d||4.2}); }
function updSub(dt){ subT-=dt; if(subT>0) return; if(sub.classList.contains('show')){ sub.classList.remove('show'); subT=1.1; return; }
  const n=subQ.shift(); if(!n) return; sub.className='sub '+n.cls; sub.textContent=n.txt; void sub.offsetWidth; sub.classList.add('show'); subT=n.d; }
// 鏡頭：每個鏡位有起點與終點（位置、看向的點），用緩動曲線慢慢推移；也可以每格自訂
const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
// 演出時把第一人稱的釣竿、雙手、頭燈都藏起來（釣竿在場景裡跟著鏡頭，不在頭部底下，所以另外列）
function hideRig(h){ if(h){ hidden=[]; [...W.head.children,...((c.rig&&c.rig())||[])].forEach(o=>{ if(o&&o!==W.camera&&o.visible){ o.visible=false; hidden.push(o); } }); } else { hidden.forEach(o=>o.visible=true); hidden=[]; } }
function place(p,l){ W.player.position.copy(p); W.player.rotation.set(0,0,0); W.head.rotation.set(0,0,0); W.camera.rotation.set(0,0,0); W.camera.position.set(0,0,0);
  mtx.lookAt(p,l,W.camera.up); q.setFromRotationMatrix(mtx); W.player.quaternion.copy(q); }
function startShot(i){ si=i; st=0; cur=shots[i]; if(!cur){ finish(false); return; }
  if(cur.sea!=null) c.setSea(cur.sea); if(cur.hour!=null) c.setHour(cur.hour);
  if(cur.music) music(cur.music,cur.vol); cur.subI=0;
  if(cur.enter) try{ cur.enter(); }catch(e){ console.warn('ending enter',e); }
  blk.style.opacity=cur.fadeIn===false?blk.style.opacity:0; }
function tick(dt){ if(!on) return; st+=dt; const s=cur; if(!s) return; const k=ease(st/s.d);
  // 字幕依鏡頭時間觸發（畫面卡頓時字幕和畫面仍然對得上）
  const sl=s.subs||[]; while(s.subI<sl.length&&st>=sl[s.subI][0]){ const x=sl[s.subI++]; say(x[1],x[2],x[3]); }
  tA.fromArray(s.from[0]).lerp(tB.fromArray(s.to[0]),k); camP.copy(tA); camL.fromArray(s.from[1]).lerp(tB.fromArray(s.to[1]),k);
  let hold=false; if(s.tick) try{ hold=s.tick(st,k,camP,camL)==='hold'; }catch(e){ console.warn('ending tick',e); }
  if(hold) st=Math.min(st,s.d-1.4);
  place(camP,camL); if(s.hour!=null&&s.hourTo!=null) c.setHour(s.hour+(s.hourTo-s.hour)*k);
  if(s.fadeOut!==false&&st>s.d-1.3) blk.style.opacity=1;
  if(st>=s.d){ if(s.exit) try{ s.exit(); }catch(e){} startShot(si+1); } }
function frame(dt){ updMusic(dt); if(on){ updSub(dt); if(skipArm&&performance.now()-skipArm>3000){ skipArm=0; skipB.textContent='略過 ›'; } } }
function play(list,done){ if(on) return; shots=list; onDone=done; on=true; subQ=[]; subT=0; skipArm=0; skipB.textContent='略過 ›';
  document.body.classList.add('ending'); fx.classList.remove('hidden'); roll.style.transition='none'; roll.style.transform='none'; roll.innerHTML='';
  blk.style.transition='none'; blk.style.opacity=1; void blk.offsetWidth; blk.style.transition='opacity 1.2s ease'; hideRig(true); c.begin&&c.begin();
  setTimeout(()=>fx.classList.add('in'),50); startShot(0); }
function finish(skipped){ if(!on) return; on=false; const cb=onDone; onDone=null; shots.forEach(s=>{ if(s.cleanup) try{ s.cleanup(); }catch(e){} });
  fx.classList.remove('in'); sub.classList.remove('show'); blk.style.opacity=1; hideRig(false);
  setTimeout(()=>{ fx.classList.add('hidden'); document.body.classList.remove('ending'); blk.style.opacity=0; c.end&&c.end(); if(cb) cb(skipped); },1300); }
// 片尾名單：由下往上慢慢捲動
function credits(lines,dur){ roll.innerHTML=lines; roll.style.transition='none'; roll.style.transform='translateY(0)'; void roll.offsetWidth;
  const h=roll.offsetHeight+window.innerHeight; roll.style.transition=`transform ${dur}s linear`; roll.style.transform=`translateY(${-h}px)`; }
// 結局裡的片名、手記等畫面元素要放進演出層，才不會被「演出時隱藏其他介面」的規則一起藏掉
return {layer:()=>fx,play,tick,frame,on:()=>on,say,music,credits,fade:v=>{ blk.style.opacity=v; },finish};
}
const ENDING_CREDITS=`<h2>濕地垂釣</h2><div>Swamp Angler</div>
<div class="r">製作</div><div class="n">歐那</div>
<div class="r">故事</div><div class="n">老漁人的手記</div>
<div class="r">音樂</div><div class="n">Emotional Piano — Centurion_of_war（CC0）</div>
<div class="r">3D 模型與貼圖</div><div class="n">Poly Haven（CC0）</div><div class="n">ambientCG（CC0）</div><div class="r">手寫字體</div><div class="n">霞鶩文楷 LXGW WenKai（SIL OFL）</div><div class="n">NASA 月球影像（公有領域）</div>
<div class="r">音效</div><div class="n">OpenGameArt（CC0）</div>
<div class="r">特別感謝</div><div class="n">每一個在碼頭上等過魚的人</div>
<div class="last">謝謝你，陪老漁人走完這一段。</div>`;
/* ===== 結局共用：月潮水光貼圖、碼頭盡頭的紀念（舊搖椅＋竹竿），結局動畫與結局後的湖都用同一份 ===== */
function makeTideTex(){ const T=THREE, cv=document.createElement('canvas'); cv.width=cv.height=256; const g=cv.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,256,256);
  for(let i=0;i<220;i++){ const x=Math.random()*256, y=Math.random()*256, r=8+Math.random()*26, rg=g.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,`rgba(200,222,255,${.05+Math.random()*.09})`); rg.addColorStop(1,'rgba(200,222,255,0)'); g.fillStyle=rg; g.fillRect(x-r,y-r,r*2,r*2); }
  for(let i=0;i<700;i++){ const r=.6+Math.random()*1.4; g.fillStyle=`rgba(240,246,255,${.3+Math.random()*.7})`; g.beginPath(); g.arc(Math.random()*256,Math.random()*256,r,0,7); g.fill(); }
  const t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; return t; }
// 碼頭木板高 0.8 公尺、湖那一端在 z=-3.2；椅子面向湖
function makeMemorial(load){ const T=THREE, g=new T.Group();
  const chair=new T.Group(); load('models/home/Rockingchair_01.glb',m=>{ const o=m.scene.clone(true); o.traverse(x=>{ x.frustumCulled=false; }); chair.add(o); });
  chair.position.set(.42,.72,-2.55); chair.rotation.y=Math.PI; g.add(chair);
  const poleM=new T.MeshStandardMaterial({color:0xb8975a,roughness:.55}), pole=new T.Group();
  { const m=new T.Mesh(new T.CylinderGeometry(.009,.02,3.2,10),poleM); m.position.y=1.6; pole.add(m);
    for(let i=1;i<9;i++){ const r=new T.Mesh(new T.TorusGeometry(.02-.0011*i,.004,6,14),poleM); r.rotation.x=Math.PI/2; r.position.y=i*.36; pole.add(r); } }
  pole.position.set(.82,.83,-2.45); pole.rotation.set(-.32,0,.12); g.add(pole);
  return {g,chair,pole}; }
/* ===== 結局之後的湖：碼頭盡頭常駐老漁人的椅子、竹竿與月光色的燈；滿月前後的夜晚，湖面亮起月潮 ===== */
function createEndingWorld(W,c){
  const T=THREE, S=W.scene, GL=new T.GLTFLoader(), load=(u,f)=>GL.load(u,f,undefined,()=>console.warn('afterglow model',u));
  let built=false, mem=null, lamp=null, lampL=null, tide=null, tideM=null, t=0;
  // 平常釣魚時椅子往碼頭右側挪一點，不要擋在正前方的拋竿視線上
  function build(){ built=true; mem=makeMemorial(load); mem.g.position.x=.45; S.add(mem.g);
    lamp=new T.Group(); lampL=new T.PointLight(0xcfe0ff,1.6,7,1.6); lampL.position.y=.22; lamp.add(lampL); lamp.position.set(-.05,.86,-2.75); mem.g.add(lamp);
    load('models/lantern.glb',g=>{ const o=g.scene.clone(true); o.scale.setScalar(.26); o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ m.material=mt.clone(); m.material.emissive=new T.Color(0xcfe0ff); m.material.emissiveMap=mt.map; m.material.emissiveIntensity=.5; } } }); lamp.add(o); });
    tideM=new T.MeshBasicMaterial({map:makeTideTex(),transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,color:0xcfe0ff,fog:false}); tideM.map.repeat.set(7,7);
    tide=new T.Mesh(new T.PlaneGeometry(80,80).rotateX(-Math.PI/2),tideM); tide.position.set(-8,.27,-28); tide.renderOrder=3; S.add(tide); }
  function update(dt){ const done=c.done(); if(!done&&!built) return; if(!built) build(); t+=dt;
    const show=done&&c.lake()&&!c.ending(); mem.g.visible=show;
    const h=((c.hour()%24)+24)%24, night=h>=19.8||h<4.8, moon=window.__MOONPH?window.__MOONPH.illum():0;
    lampL.intensity=show?(night?1.8:.6)*(1+.08*Math.sin(t*5)):0;
    const want=show&&night&&moon>.85?.55:0; tideM.opacity+=(want-tideM.opacity)*Math.min(1,dt*.5); tide.visible=tideM.opacity>.01; if(tide.visible) tideM.map.offset.set(t*.004,-t*.006); }
  return {update};
}
/* ===== 結局分鏡（依劇本 src/ENDING.md 分段製作；已完成：演出系統、片尾名單、序幕、第一幕、第二幕、第三幕、第四幕） ===== */
function endingShots(E,c){
  const T=THREE, W=c.W, S=W.scene, GL=new T.GLTFLoader(), cache={}, made=[];
  let pending=0; const load=(u,f)=>{ if(cache[u]) return f(cache[u]); pending++; GL.load(u,g=>{ cache[u]=g; pending--; f(g); },undefined,()=>{ pending--; console.warn('ending model',u); }); };
  const keep=o=>{ S.add(o); made.push(o); return o; };
  const drop=()=>{ made.splice(0).forEach(o=>{ S.remove(o); o.traverse&&o.traverse(m=>{ if(m.material&&m.material.map&&m.material.map.isCanvasTexture) m.material.map.dispose(); }); }); };
  const sw=(x,z,t)=>W.swell?W.swell(x,z,t):0;
  let T0=0; const now=()=>performance.now()/1000-T0;
  // 老漁人的提燈：掛在漁船船頭，暖黃色的燈火（之後幾幕也會用到）
  const lampG=new T.Group(), lampL=new T.PointLight(0xffb866,0,9,1.6); lampG.add(lampL);
  load('models/lantern.glb',g=>{ const o=T.SkeletonUtils?T.SkeletonUtils.clone(g.scene):g.scene.clone(true); o.scale.setScalar(.26); o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ m.material=mt.clone(); m.material.emissive=new T.Color(0xffc070); m.material.emissiveMap=mt.map; m.material.emissiveIntensity=.5; } } }); lampG.add(o); });
  // 海王：深淵之王的模型（約 9 公尺高），面向漁船
  const king=new T.Group(); // 海王模型有骨架（SkinnedMesh），要用 SkeletonUtils 複製，骨頭才會跟著搬到新位置
  load('models/seaking.glb',g=>{ const o=T.SkeletonUtils?T.SkeletonUtils.clone(g.scene):g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; if(m.material){ m.material=m.material.clone(); m.material.emissive=new T.Color(0x0a2a3a); m.material.emissiveIntensity=.6; } } }); o.scale.setScalar(6); king.add(o); });
  const kingEye=new T.PointLight(0x9fe8ff,0,14,2); kingEye.position.set(0,4.2,1.2); king.add(kingEye);
  // 月光海路：從月亮正下方一路鋪到船邊的碎銀光，隨浪閃爍
  const glitTex=(()=>{ const cv=document.createElement('canvas'); cv.width=256; cv.height=512; const g=cv.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,256,512);
    for(let i=0;i<2600;i++){ const y=Math.random()*512, w=(1-y/512)*.7+.3, x=128+(Math.random()-.5)*256*Math.pow(Math.random(),.6)*w; g.fillStyle=`rgba(230,240,255,${.25+Math.random()*.75})`; g.fillRect(x,y,1+Math.random()*3*w,1); }
    const fade=g.createLinearGradient(0,0,256,0); fade.addColorStop(0,'rgba(0,0,0,1)'); fade.addColorStop(.25,'rgba(0,0,0,0)'); fade.addColorStop(.75,'rgba(0,0,0,0)'); fade.addColorStop(1,'rgba(0,0,0,1)'); g.globalCompositeOperation='destination-out'; g.fillStyle=fade; g.fillRect(0,0,256,512);
    const t=new T.CanvasTexture(cv); t.wrapT=T.RepeatWrapping; return t; })();
  const glitM=new T.MeshBasicMaterial({map:glitTex,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,color:0xdfe8ff,fog:false});
  const glit=new T.Mesh(new T.PlaneGeometry(26,420).rotateX(-Math.PI/2).translate(0,0,-210),glitM); glit.renderOrder=3;
  const md=new T.Vector3();
  // 堤防：河口窄灣（湖的正南方約 100 公尺）橫著一道老石堤，三座鐵閘門；石材是真實的城堡石牆貼圖
  const DY={x:12,z:-99,len:34,h:3.2,th:3}, dyke=new T.Group(), chunks=[], cracks=[];
  { const TL=new T.TextureLoader(), mk=f=>{ const x=TL.load('models/home/castle_brick_07_'+f+'.jpg'); x.wrapS=x.wrapT=T.RepeatWrapping; x.repeat.set(2.2,1); x.anisotropy=4; return x; };
    const d=mk('Diffuse'); d.encoding=T.sRGBEncoding; const stoneM=new T.MeshStandardMaterial({map:d,normalMap:mk('nor_gl'),roughnessMap:mk('Rough'),color:0x9a9284,roughness:1,emissive:0x8090b0,emissiveMap:d,emissiveIntensity:.35});   // 夜裡讓石面帶一點月光的冷色，才看得出石材
    const ironM=new T.MeshStandardMaterial({color:0x2a2622,roughness:.55,metalness:.75});
    const n=8, seg=DY.len/n;
    for(let i=0;i<n;i++){ const b=new T.Mesh(new T.BoxGeometry(seg-.04,DY.h+1.2,DY.th),stoneM); b.position.set(-DY.len/2+seg*(i+.5),(DY.h+1.2)/2-1.2,0); dyke.add(b); chunks.push({o:b,mid:i===3||i===4,v:new T.Vector3(),w:new T.Vector3(),p0:b.position.clone()}); }
    for(const gx of [-10,0,10]){ const gt=new T.Mesh(new T.BoxGeometry(2.6,2.2,.18),ironM); gt.position.set(gx,1.2,DY.th/2+.1); dyke.add(gt); chunks.push({o:gt,mid:gx===0,v:new T.Vector3(),w:new T.Vector3(),p0:gt.position.clone()}); }
    const cap=new T.Mesh(new T.BoxGeometry(DY.len+.6,.35,DY.th+.5),stoneM); cap.position.y=DY.h+.18; dyke.add(cap); chunks.push({o:cap,mid:false,split:true,v:new T.Vector3(),w:new T.Vector3(),p0:cap.position.clone()});
    // 裂縫：堤面上透出銀色月光的細線，慢慢往外長
    const crM=new T.MeshBasicMaterial({color:0xcfe6ff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,fog:false});
    for(let i=0;i<14;i++){ let x=(Math.random()-.5)*12, y=Math.random()*DY.h; const pts=[]; for(let k=0;k<6;k++){ pts.push(new T.Vector3(x,y,DY.th/2+.03)); x+=(Math.random()-.5)*1.4; y+=(Math.random()-.4)*.9; }
      const l=new T.Line(new T.BufferGeometry().setFromPoints(pts),crM); dyke.add(l); cracks.push(l); }
    cracks.mat=crM;
    const dir=Math.atan2(DY.x,-DY.z); dyke.position.set(DY.x,0,DY.z); dyke.rotation.y=-dir; }
  // 銀色潮水：從堤防缺口灌進來、往碼頭推進的發光水流
  const floodTex=(()=>{ const cv=document.createElement('canvas'); cv.width=128; cv.height=256; const g=cv.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,128,256);
    // 柔和的月光水紋（模糊的橢圓光斑）＋細碎的閃光
    for(let i=0;i<160;i++){ const x=Math.random()*128, y=Math.random()*256, r=6+Math.random()*16, rg=g.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,`rgba(190,215,255,${.06+Math.random()*.1})`); rg.addColorStop(1,'rgba(190,215,255,0)'); g.fillStyle=rg; g.save(); g.translate(x,y); g.scale(1,2.2); g.translate(-x,-y); g.fillRect(x-r,y-r,r*2,r*2); g.restore(); }
    for(let i=0;i<420;i++){ g.fillStyle=`rgba(235,242,255,${.3+Math.random()*.6})`; g.fillRect(Math.random()*128,Math.random()*256,1+Math.random()*1.5,1); }
    const e=g.createLinearGradient(0,0,128,0); e.addColorStop(0,'rgba(0,0,0,1)'); e.addColorStop(.35,'rgba(0,0,0,0)'); e.addColorStop(.65,'rgba(0,0,0,0)'); e.addColorStop(1,'rgba(0,0,0,1)'); g.globalCompositeOperation='destination-out'; g.fillStyle=e; g.fillRect(0,0,128,256);
    const t=new T.CanvasTexture(cv); t.wrapT=T.RepeatWrapping; return t; })();
  // 月潮水光：只用柔和的光斑與零星亮點，不畫成一條條直線（避免看起來像下雨）
  const tideTex=makeTideTex();
  const floodM=new T.MeshBasicMaterial({map:tideTex,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,color:0xd8e8ff,fog:false});
  const flood=new T.Mesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),floodM); flood.renderOrder=3;
  const fromD=new T.Vector3(DY.x,0,DY.z).multiplyScalar(.97), toD=new T.Vector3(0,0,-6);
  function setFlood(k,t){ const head=fromD.clone().lerp(toD,k), mid=fromD.clone().add(head).multiplyScalar(.5), len=fromD.distanceTo(head)+.01;
    flood.position.set(mid.x,.28,mid.z); flood.rotation.y=-Math.atan2(head.x-fromD.x,-(head.z-fromD.z)); flood.scale.set(8+6*k,1,len); floodM.map.repeat.set(1.2,len/10); floodM.map.offset.y=-t*.18; floodM.map.offset.x=Math.sin(t*.3)*.05;
    return head; }
  const spl=(x,z,n,s)=>{ if(c.P&&c.P.splash) c.P.splash(x,0,z,n,s); };
  const sc={};
  // 結局專用月光：冷藍色的平行光，讓夜景裡的石堤、海王、船看得清楚
  const moonL=keep(new T.DirectionalLight(0xa9bfe8,1.5)), fillL=keep(new T.HemisphereLight(0x5a6c90,0x101418,.45)); moonL.position.set(-60,45,-20); moonL.target.position.set(0,0,-30); keep(moonL.target);
  // 湖面的月潮：一大片柔和水光，慢慢漂移
  const lakeM=new T.MeshBasicMaterial({map:tideTex,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,color:0xcfe0ff,fog:false});
  lakeM.map=tideTex.clone(); lakeM.map.needsUpdate=true; lakeM.map.repeat.set(6,6);
  const lake=new T.Mesh(new T.PlaneGeometry(70,70).rotateX(-Math.PI/2),lakeM); lake.position.set(-8,.27,-24); lake.renderOrder=3;
  // 螢火蟲：岸邊與浮萍間一閃一閃、慢慢飄
  const FN=160, ffP=new Float32Array(FN*3), ffB=[]; for(let i=0;i<FN;i++){ const a=Math.random()*6.283, r=10+Math.random()*26; ffB.push([-10+Math.cos(a)*r,.6+Math.random()*2.2,-22+Math.sin(a)*r*.8,Math.random()*6]); }
  const ffG=new T.BufferGeometry(); ffG.setAttribute('position',new T.BufferAttribute(ffP,3));
  const ffTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), rg=g.createRadialGradient(16,16,0,16,16,16); rg.addColorStop(0,'rgba(255,255,210,1)'); rg.addColorStop(.3,'rgba(220,255,150,.6)'); rg.addColorStop(1,'rgba(200,255,120,0)'); g.fillStyle=rg; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
  const ffM=new T.PointsMaterial({map:ffTex,size:.22,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,color:0xe8ffb0,fog:false}), ff=new T.Points(ffG,ffM); ff.frustumCulled=false;
  function ffTick(t){ for(let i=0;i<FN;i++){ const b=ffB[i]; ffP[i*3]=b[0]+Math.sin(t*.3+b[3])*.8; ffP[i*3+1]=b[1]+Math.sin(t*.7+b[3]*2)*.25*(Math.sin(t*2.3+b[3])>.2?1:.2); ffP[i*3+2]=b[2]+Math.cos(t*.25+b[3])*.8; } ffG.attributes.position.needsUpdate=true; }
  // 魚群躍出水面：用遊戲裡的真實魚模型，拋物線跳起、落水濺起水花
  const JF=['models/bluegill.glb','models/lmbass.glb','models/koi.glb','models/crappie.glb'], jumps=[];
  JF.forEach(u=>load(u,()=>{}));
  function jump(x,z){ const u=JF[Math.floor(Math.random()*JF.length)], g=cache[u]; if(!g) return; const o=g.scene.clone(true); o.traverse(m=>{ m.frustumCulled=false; });
    const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()); o.scale.setScalar(.45/Math.max(sz.x,sz.y,sz.z)); const w=new T.Group(); w.add(o); keep(w);
    const dir=Math.random()*6.283; jumps.push({w,x,z,dx:Math.cos(dir),dz:Math.sin(dir),t:0,h:.8+Math.random()*.7}); spl(x,z,8,1); W.addRipple&&W.addRipple(x,z,2); }
  function updJumps(dt){ for(let i=jumps.length-1;i>=0;i--){ const j=jumps[i]; j.t+=dt; const u=j.t/1.1;
    j.w.position.set(j.x+j.dx*u*1.6,.2+j.h*4*u*(1-u),j.z+j.dz*u*1.6); j.w.rotation.set(0,-Math.atan2(j.dz,j.dx),(.5-u)*2.2);
    if(u>=1){ spl(j.w.position.x,j.w.position.z,10,1.1); W.addRipple&&W.addRipple(j.w.position.x,j.w.position.z,2.5); S.remove(j.w); jumps.splice(i,1); } } }
  // 阿蘅（生前的模樣）與她提的燈；只有完成隱藏章節「湖裡還有人等燈」的玩家才會看到她
  const met=!!(c.save&&c.save.story&&c.save.story.done&&c.save.story.done.indexOf('lantern')>=0);
  const heng=new T.Group(), setOp=(o,a)=>o.traverse(m=>{ if(m.isMesh&&m.material){ m.material.transparent=true; m.material.opacity=a; m.visible=a>.01; } });
  if(met) load('models/ghost_alive.glb',g=>{ const o=g.scene.clone(true); o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt){ m.material=mt.clone(); if(mt.map){ m.material.emissive=new T.Color(0xe8e2d8); m.material.emissiveMap=mt.map; m.material.emissiveIntensity=.55; } } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), k2=1.62/Math.max(sz.y,1e-6); o.scale.setScalar(k2); o.updateMatrixWorld(true); const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z); const w=new T.Group(); w.add(o); heng.add(w); });
  const lamp2=new T.Group(), lamp2L=new T.PointLight(0xffb866,0,8,1.6); lamp2.add(lamp2L);
  load('models/lantern.glb',g=>{ const o=g.scene.clone(true); o.scale.setScalar(.24); o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ m.material=mt.clone(); m.material.emissive=new T.Color(0xffc070); m.material.emissiveMap=mt.map; m.material.emissiveIntensity=.5; } } }); lamp2.add(o); });
  // 第三幕：月光灣的岩石與汐月（玩家設定圖生成的 3D 模型），夜裡用自己的貼圖微微發光
  const BAY=new T.Vector3(-12,0,-44), merG=new T.Group(), merW=new T.Group(); merG.add(merW); merG.position.copy(BAY);
  // 只取石組裡的一顆石頭，半露出水面放在她身後，不要整組散在鏡頭前
  load('rock_moss_set_01.glb',g=>{ const src=g.scene.getObjectByName('rock_moss_set_01_rock02'); if(!src) return; const r=src.clone(true); r.position.set(0,0,0); r.updateMatrixWorld(true);
    const bb=new T.Box3().setFromObject(r), cc=bb.getCenter(new T.Vector3()); const w=new T.Group(); r.position.set(-cc.x,-.75,-cc.z); w.add(r); w.scale.setScalar(.75); w.position.set(-.55,0,-.65); r.traverse(m=>{ m.frustumCulled=false; }); merG.add(w); });
  load('models/mermaid3d.glb',g=>{ const o=g.scene.clone(true); o.traverse(x=>{ if(x.isMesh){ const mp=x.material&&x.material.map; x.frustumCulled=false;
      x.material=new T.MeshStandardMaterial({map:mp||null,roughness:.55,metalness:.05,emissive:new T.Color(0xffffff),emissiveMap:mp||null,emissiveIntensity:.32}); } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()); o.scale.setScalar(1.9/Math.max(sz.y,1e-6)); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-.38-b2.min.y,-c2.z); merW.add(o); });   // 尾巴沒在淺水裡，像從水裡探出半身
  const merL=new T.PointLight(0xcfe0ff,0,7,1.5); merL.position.set(.8,2.2,1.4); merG.add(merL);
  // 最亮的那片月鱗：從汐月手上飄進提燈，燈火由暖黃變成月光色
  const scaleTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=64; const g=cv.getContext('2d'), rg=g.createRadialGradient(32,32,0,32,32,32); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(.25,'rgba(210,230,255,.85)'); rg.addColorStop(1,'rgba(160,200,255,0)'); g.fillStyle=rg; g.fillRect(0,0,64,64); return new T.CanvasTexture(cv); })();
  const moonScale=new T.Sprite(new T.SpriteMaterial({map:scaleTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false})); moonScale.scale.set(.32,.32,1);
  const silverC=new T.Color(0xcfe0ff), warmC=new T.Color(0xffb866);
  // 汐月游走時留下的銀光尾跡
  const trail=[]; function trailDot(x,y,z){ const sp=new T.Sprite(new T.SpriteMaterial({map:scaleTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false,opacity:.9})); sp.scale.set(.5,.5,1); sp.position.set(x,y,z); keep(sp); trail.push({sp,t:0}); }
  function updTrail(dt){ for(let i=trail.length-1;i>=0;i--){ const d=trail[i]; d.t+=dt; d.sp.material.opacity=Math.max(0,.9-d.t/3); d.sp.position.y+=dt*.08; if(d.t>3){ S.remove(d.sp); trail.splice(i,1); } } }
  const merFace=()=>Math.atan2(CAMB.x-BAY.x,CAMB.z-BAY.z), CAMB=new T.Vector3(-10,1.45,-37.2);
  // 第四幕：碼頭盡頭（碼頭木板高 0.8 公尺、湖那一端在 z=-3.2）老漁人的舊椅子（Poly Haven WoodenChair_01）與靠在椅邊的竹竿
  // 老漁人的椅子：和小屋裡同款的舊搖椅（Poly Haven Rockingchair_01），面向湖
  const memo=makeMemorial(load), chair=memo.chair, pole=memo.pole;
  // 手記：真實紙張貼圖（ambientCG Paper001，CC0），老漁人的字一個字一個字浮現；最後一行是你自己的字
  const fl=document.createElement('link'); fl.rel='stylesheet'; fl.href='https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&display=swap';
  const LETTER=['孩子：','如果你讀到這一頁，代表月潮回來了。','我這輩子沒能把阿蘅帶回家，','所以想讓另一個孩子回家。','這件事我做了四十年，最後還是交給了你。','對不起，也謝謝你。','湖就交給你了。記得——','湖會告訴你很多事，只要你願意等。'];
  const MINE='月潮回來了。換我守著這片湖。';
  const page=document.createElement('div');
  page.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-52%) rotate(-1.2deg);width:min(330px,84vw);padding:30px 26px 26px;z-index:41;pointer-events:none;opacity:0;transition:opacity 1.4s ease;"+
    "background:linear-gradient(rgba(214,180,120,.42),rgba(150,110,60,.32)),url(end_paper.jpg) center/cover;min-height:58vh;box-sizing:border-box;box-shadow:0 18px 50px rgba(0,0,0,.65),inset 0 0 60px rgba(90,60,20,.45);border-radius:3px;"+
    "font-family:'LXGW WenKai TC','Kaiti TC','STKaiti','BiauKai',serif;color:#2c1e0e;font-size:18px;line-height:2.05;letter-spacing:.04em";
  const pageTxt=document.createElement('div'), pageMine=document.createElement('div'); pageMine.style.cssText='margin-top:14px;color:#1d3150;font-size:19px;border-top:1px dashed rgba(60,40,20,.35);padding-top:10px';
  page.appendChild(pageTxt); page.appendChild(pageMine);
  const FULL=LETTER.join('\n'); let pn=0, pm=0;
  function writePage(dt){ if(pn<FULL.length){ pn=Math.min(FULL.length,pn+dt*7.5); } else if(pm<MINE.length){ pm=Math.min(MINE.length,pm+dt*5); }
    const a=FULL.slice(0,Math.floor(pn)); pageTxt.innerHTML=a.replace(/\n/g,'<br>')+(pn<FULL.length?'<span style="opacity:.35">▍</span>':'');
    pageMine.textContent=pn>=FULL.length?MINE.slice(0,Math.floor(pm)):''; pageMine.style.display=pn>=FULL.length?'block':'none'; return pn>=FULL.length&&pm>=MINE.length; }
  const title=document.createElement('div'); title.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:41;pointer-events:none;color:#f2ecdf;font-family:serif;opacity:0;transition:opacity 1.6s ease';
  title.innerHTML='<div style="font-size:13px;letter-spacing:.6em;opacity:.7">終章之後</div><div style="font-size:34px;letter-spacing:.5em;margin-top:14px;color:#ffe3a3">月潮</div>';
  return [
    // 開場：黑底片名〈月潮〉；同時等模型載完（最多 12 秒），避免主角還沒出現就開演
    {d:6,hour:20.4,sea:true,music:'piano',vol:.7,fadeOut:true,from:[[3.2,1.5,-3.5],[0,3.2,-28]],to:[[3.2,1.5,-3.5],[0,3.2,-28]],
      enter:()=>{ E.layer().appendChild(title); E.fade(1); setTimeout(()=>title.style.opacity=1,300); sc.wait=0; },
      tick:(t)=>{ E.fade(1); if(t>4.2&&pending>0&&sc.wait<8){ sc.wait+=1/60; return 'hold'; } if(t>4.2) title.style.opacity=0; },
      exit:()=>{ title.remove(); }, cleanup:()=>title.remove()},
    // 序幕一：海王沉向深淵，沉到一半停住，抬頭看船頭的燈
    {d:13,hour:20.4,sea:true,from:[[2.4,1.7,-6.5],[0,4.2,-18]],to:[[1.3,1.4,-9.5],[0,2.6,-18]],
      enter:()=>{ T0=performance.now()/1000; keep(lampG); lampG.position.set(0,1.95,-5.6); lampL.intensity=1.6; keep(king); king.position.set(0,1.2,-18); king.rotation.set(0,0,0); kingEye.intensity=1.2; sc.rip=0; },
      tick:(t)=>{ const sink=t<7?1.2-3.8*(t/7)*(t/7):t<9?-2.6+.3*Math.sin((t-7)/2*Math.PI/2):-2.3; king.position.y=sink+sw(0,-18,t)*.5; king.rotation.x=t>7?-.12*Math.min(1,(t-7)/2):0;
        lampG.position.y=1.95+sw(0,-5.6,t)*.9; lampG.rotation.z=Math.sin(t*1.3)*.06;
        sc.rip-=1/60; if(sc.rip<=0&&t<7.5){ sc.rip=.6; W.addRipple&&W.addRipple((Math.random()-.5)*5,-18+(Math.random()-.5)*4,3+Math.random()*3); if(Math.random()<.5) spl((Math.random()-.5)*4,-16.5,8,1.4); } },
      subs:[[2.2,'海王沉回深淵之前，停了下來。','',4.2],[8,'他抬起頭，看著船頭那盞燈，看了很久。','',4.6]]},
    // 序幕二：反打——從海王身後看向漁船上的燈
    {d:11,hour:20.45,sea:true,from:[[-4.2,6.4,-27],[0,2.4,-5.6]],to:[[-3,5.6,-25],[0,2.2,-5.6]],
      tick:(t)=>{ king.position.y=-2.3+sw(0,-18,t)*.4+Math.sin(t*.6)*.08; lampG.position.y=1.95+sw(0,-5.6,t)*.9; lampL.intensity=1.6+Math.sin(t*7)*.12; },
      subs:[[1,'他以為，是人類偷走了月潮。','',4.4],[6,'月潮，\n是他女兒的名字。','q big',4.8]]},
    // 第一幕一：月亮從雲後出來，月光在海面鋪成一條路
    {d:12,hour:20.5,sea:true,from:[[0,3.4,-1],[0,2.2,-60]],to:[[0,3.6,-1],[0,0,0]],
      enter:()=>{ window.__MOONPH&&window.__MOONPH.dir&&window.__MOONPH.dir(20.5,md); md.y=0; md.normalize(); keep(glit); glit.position.set(0,.08,-1); glit.rotation.y=Math.atan2(-md.x,-md.z); glitM.opacity=0; S.remove(king); },
      tick:(t,k,P,L)=>{ window.__MOONPH.dir(20.5,md); L.set(P.x+md.x*100,P.y+Math.max(8,md.y*100)*Math.min(1,.25+t/9),P.z+md.z*100); const m2=new T.Vector3(md.x,0,md.z).normalize(); L.lerp(new T.Vector3(P.x+m2.x*100,P.y+24*Math.min(1,t/8),P.z+m2.z*100),.5);
        glitM.opacity=Math.min(.85,t/6); glitM.map.offset.y=t*.05; lampG.position.y=1.95+sw(0,-5.6,t)*.9; },
      subs:[[1.5,'那一夜，月亮從雲後出來。','',4.2],[6.4,'海面湧起銀色的大潮，\n一路往河口推過去。','',4.6]]},
    // 第一幕二：河口的老石堤，在浪裡一道一道裂開，中間崩出缺口
    {d:15,hour:21.2,sea:false,from:[[3.5,4.6,-83],[12,1.6,-99]],to:[[6.5,3.3,-88.5],[12,1.8,-99]],
      enter:()=>{ S.remove(glit); S.remove(lampG); S.remove(king); if(W.setRefl) W.setRefl(false); keep(dyke); chunks.forEach(q=>{ q.o.position.copy(q.p0); q.o.rotation.set(0,0,0); q.v.set(0,0,0); q.w.set(0,0,0); }); cracks.mat.opacity=0; cracks.forEach(l=>l.scale.set(.2,.2,1)); keep(flood); floodM.opacity=0; sc.sp=0; sc.fell=false; },
      tick:(t)=>{ sc.sp-=1/60; const back=new T.Vector3(); if(sc.sp<=0&&t<11){ sc.sp=t<5?.7:.35; const a=(Math.random()-.5)*DY.len*.8; const p=dyke.localToWorld(back.set(a,DY.h+.4,-DY.th/2)); spl(p.x,p.z,10+Math.floor(t),2+t*.2); }
        if(t>4.5){ const g=Math.min(1,(t-4.5)/3.5); cracks.mat.opacity=.9*g; cracks.forEach((l,i)=>{ const s2=.2+.8*Math.min(1,g*1.4-(i%4)*.1); l.scale.set(s2,s2,1); }); }
        if(t>8.6&&!sc.fell){ sc.fell=true; chunks.forEach(q=>{ if(q.mid){ q.v.set((Math.random()-.5)*1.5,1.5+Math.random()*1.5,2.5+Math.random()*2); q.w.set(Math.random()*1.5,Math.random(),Math.random()*1.5); } }); W.addRipple&&W.addRipple(DY.x,DY.z+2,8); }
        if(sc.fell){ chunks.forEach(q=>{ if(!q.mid) return; q.v.y-=9.8/60; q.o.position.addScaledVector(q.v,1/60); q.o.rotation.x+=q.w.x/60; q.o.rotation.z+=q.w.z/60; if(q.o.position.y<-4){ q.v.set(0,0,0); q.w.set(0,0,0); } }); floodM.opacity=Math.min(.7,(t-8.6)/1.4); setFlood(Math.min(.35,(t-8.6)*.06),t); }
        cracks.forEach(l=>{ l.material.opacity=cracks.mat.opacity*(.75+.25*Math.sin(t*9+l.id)); }); },
      subs:[[1,'河口的堤防，在浪裡一道一道裂開。','',4.4],[9.6,'四十年來關住的門，終於開了。','q',4.6]]},
    // 第一幕三：銀色的月潮順著窄灣灌進湖裡（接第二幕）
    {d:11,hour:21.3,sea:false,from:[[4,8.5,-78],[8,0,-62]],to:[[2,7.5,-38],[0,0,-12]],
      tick:(t,k)=>{ const head=setFlood(.35+.65*k,t); floodM.opacity=.7; if(Math.random()<.3) spl(head.x+(Math.random()-.5)*6,head.z,6,1); },
      subs:[[1.5,'月光順著河道流進湖裡。','',4.5]]},
    // 第二幕一：月潮流過倒木區與深水中央，魚群躍出水面、岸邊螢火飛起
    {d:13,hour:21.5,sea:false,from:[[-31,3.2,-33],[-22,.4,-17]],to:[[-12,2.6,-26],[2,.3,-12]],
      enter:()=>{ S.remove(dyke); S.remove(flood); keep(lake); lakeM.opacity=0; keep(ff); ffM.opacity=0; sc.jt=0; },
      tick:(t,k,P)=>{ lakeM.opacity=Math.min(.8,t/3); lakeM.map.offset.set(t*.012,-t*.02); ffM.opacity=Math.min(.95,t/4); ffTick(t);
        sc.jt-=1/60; if(sc.jt<=0){ sc.jt=.9+Math.random()*1.2; jump(P.x+(Math.random()-.4)*14,P.z-8-Math.random()*14); } updJumps(1/60); },
      subs:[[1.2,'銀光流過倒木區，流過深水中央。','',4.4],[6.6,'沉在湖底四十年的月光，\n回來了。','',4.8]]},
    // 第二幕二：浮萍灣——完成隱藏章節時，阿蘅提燈站在水面上；沒完成時，只有遠處一盞燈慢慢熄掉
    {d:16,hour:21.7,sea:false,from:[[-1.6,1.7,-8.5],[-7,1.25,-17.5]],to:[[-3.4,1.45,-11.2],[-7,1.35,-17.5]],
      enter:()=>{ lakeM.opacity=.55; keep(lamp2); lamp2.position.set(-7,1.05,-17.3); lamp2L.intensity=1.4; sc.left=false;
        if(met){ keep(heng); heng.position.set(-7.35,.12,-17.9); heng.rotation.set(0,Math.atan2(-1.6+7.35,-8.5+17.9),0); setOp(heng,0); } },
      tick:(t)=>{ ffTick(t+20); updJumps(1/60); lakeM.map.offset.set(t*.01,-t*.015);
        if(met){ setOp(heng,t<2?t/2:t<10.5?1:Math.max(0,1-(t-10.5)/2.4)); heng.position.y=.12+Math.sin(t*1.2)*.02; if(t>4.5&&t<7) heng.children[0]&&(heng.children[0].rotation.x=.12*Math.sin((t-4.5)/2.5*Math.PI));
          if(t>7&&!sc.left){ sc.left=true; } lamp2.position.set(t<7?-7.1:-7.1+(Math.min(1,(t-7)/1.5))*.25,t<7?1.05:1.05-.95*Math.min(1,(t-7)/1.5),-17.4); if(t>10) heng.position.z=-17.9-(t-10)*.25; }
        else { lamp2.position.set(-9,1.0,-27); lamp2L.intensity=t<6?1.4:Math.max(0,1.4*(1-(t-6)/5)); lamp2.visible=t<11.5; } },
      subs:met?[[1,'浮萍灣的水面上，站著一個提燈的女孩。','',4.4],[6.2,'她朝你點點頭，把燈放在荷葉上——','',3.6],[10.6,'轉身，走進了光裡。','q',4.2]]
              :[[1,'浮萍灣深處，有一盞燈亮著。','',4.4],[7,'等你回頭再看，它已經慢慢熄了。','',4.6]]},
    // 第三幕一：月光灣——汐月坐在岩石上，等你
    {d:15,hour:22,sea:false,music:'theme',vol:.7,from:[[-6.5,2.3,-31],[-12,1.6,-44]],to:[[-9.6,1.6,-36.6],[-12,1.7,-44]],
      enter:()=>{ S.remove(lake); S.remove(ff); S.remove(heng); S.remove(lamp2); keep(merG); merW.rotation.set(0,merFace(),0); merW.position.set(0,0,0); merL.intensity=1.6; keep(lampG); lampG.position.set(-8.95,.96,-37.75); lampL.intensity=1.4; lampL.color.copy(warmC); },
      tick:(t)=>{ merW.position.y=Math.sin(t*.9)*.015; lampG.rotation.z=Math.sin(t*1.1)*.04; },
      subs:[[1.2,'「四十年前，堤防關上的那晚，我回不去了。」','q',5],[7.6,'「是他第一個發現我。他什麼也沒問，\n只說：『我會想辦法讓妳回家。』」','q',6]]},
    // 第三幕二：近一點——她說起老漁人
    {d:15,hour:22.05,sea:false,from:[[-10.2,1.5,-38.6],[-12,1.85,-44]],to:[[-10.6,1.5,-40],[-12,1.9,-44]],
      tick:(t)=>{ merW.position.y=Math.sin(t*.9)*.015; merW.rotation.y=merFace()+Math.sin(t*.4)*.05; },
      subs:[[1,'「每個滿月他都提燈來。後來他走不動了，\n就坐在碼頭上，把燈舉得高高的，讓我看得見。」','q',6.4],[8.6,'「他說，他欠一個女孩一盞燈。」','q big',5.4]]},
    // 第三幕三：水道口，海王浮了起來——眼裡的光不再兇狠
    {d:12,hour:22.1,sea:false,from:[[-9,1.9,-37],[-13,3,-58]],to:[[-9.4,1.7,-38],[-13.5,3.6,-60]],
      enter:()=>{ keep(king); king.position.set(-14,-6,-62); king.rotation.set(0,Math.atan2(BAY.x+14,BAY.z+62),0); kingEye.intensity=0; kingEye.color.set(0xcfe8ff); },
      tick:(t)=>{ king.position.y=Math.min(-2.2,-6+t*.9)+Math.sin(t*.7)*.08; kingEye.intensity=Math.min(1,Math.max(0,(t-3)/3)); if(t<5&&Math.random()<.25) spl(-14+(Math.random()-.5)*4,-60,8,1.3); merW.rotation.y=merFace()+Math.min(1,t/3)*1.9; },
      subs:[[5.5,'「……爸爸在外面等我。」','q',5]]},
    // 第三幕四：她把最亮的一片月鱗放進你的燈
    {d:12,hour:22.15,sea:false,from:[[-10.3,1.42,-38.3],[-11.4,1.4,-42.6]],to:[[-10.5,1.36,-38.9],[-11.2,1.3,-41.6]],
      enter:()=>{ merW.rotation.y=merFace(); keep(moonScale); moonScale.visible=false; lampG.position.set(-10.22,1.06,-39.7); sc.ms=0; },
      tick:(t)=>{ merW.position.y=Math.sin(t*.9)*.015; const u=Math.min(1,Math.max(0,(t-2)/3)); moonScale.visible=t>2&&u<1;
        const a=new T.Vector3(BAY.x+.25,1.75,BAY.z+.45), b2=lampG.position.clone().add(new T.Vector3(0,.12,0)); moonScale.position.copy(a.lerp(b2,u)); moonScale.position.y+=Math.sin(u*Math.PI)*.35;
        moonScale.material.rotation=t*2; const g2=Math.min(1,Math.max(0,(t-5)/1.5)); lampL.color.copy(warmC).lerp(silverC,g2); lampL.intensity=1.4+1.4*g2*(1+.15*Math.sin(t*6));
        lampG.traverse(m=>{ if(m.isMesh&&m.material&&m.material.emissive) m.material.emissive.copy(new T.Color(0xffc070).lerp(silverC,g2)); }); },
      subs:[[6.2,'「謝謝你，替他把路走完。」','q big',5]]},
    // 第三幕五：汐月滑進水裡，游向水道口，回頭看你一次，和海王一起沉回大海
    {d:15,hour:22.2,sea:false,from:[[-9.2,2.4,-36],[-12.5,.5,-50]],to:[[-8.6,2.9,-35],[-13.6,.4,-58]],
      enter:()=>{ S.remove(moonScale); sc.tr=0; },
      tick:(t)=>{ const u=Math.min(1,t/9), path=new T.Vector3(BAY.x,0,BAY.z).lerp(new T.Vector3(-13.6,0,-59),u);
        merW.position.set(path.x-BAY.x,(t<1.5?-.4*t/1.5:-.4-.5*Math.min(1,Math.max(0,(t-9)/2)))+(t>4.6&&t<6.6?.35*Math.sin((t-4.6)/2*Math.PI):0),path.z-BAY.z);
        merW.rotation.y=t>4.6&&t<6.6?merFace():Math.atan2(-13.6-BAY.x,-59-BAY.z);
        sc.tr-=1/60; if(sc.tr<=0&&t>1&&t<10.5){ sc.tr=.12; const wp=merW.getWorldPosition(new T.Vector3()); trailDot(wp.x+(Math.random()-.5)*.3,.3,wp.z+(Math.random()-.5)*.3); }
        if(t>9){ king.position.y=-2.2-(t-9)*.9; kingEye.intensity=Math.max(0,1-(t-9)/3); } if(t>10&&t<11) spl(-13.8,-59.5,12,1.6); updTrail(1/60); },
      subs:[[5,'她回頭看了你一眼。','',3.6],[10.5,'月潮回到了大海。','',4]]},
    // 第四幕一：天快亮了，划回碼頭。碼頭盡頭，老漁人的舊椅子和竹竿
    {d:14,hour:5.3,hourTo:5.8,sea:false,music:'piano',vol:.72,from:[[3.4,2.1,-15],[.3,1.1,-2.4]],to:[[1.6,1.7,-8.5],[.4,1.05,-2.6]],
      enter:()=>{ S.remove(merG); S.remove(king); S.remove(lampG); trail.splice(0).forEach(d=>S.remove(d.sp)); keep(chair); keep(pole); document.head.appendChild(fl); },
      subs:[[1.4,'天快亮的時候，你划回了碼頭。','',4.4],[7.2,'碼頭盡頭，老漁人的舊椅子還在。\n椅邊靠著他的竹竿。','',5.4]]},
    // 第四幕二：你把那盞月光色的燈，放在椅子旁邊
    {d:9,hour:5.85,sea:false,from:[[-1.05,1.62,-.9],[.35,.95,-2.75]],to:[[-.8,1.48,-1.35],[.3,.95,-2.75]],
      enter:()=>{ keep(lampG); lampG.position.set(-.05,1.35,-2.5); lampL.color.copy(silverC); lampL.intensity=2; },
      tick:(t)=>{ const u=Math.min(1,t/2.6); lampG.position.set(-.05,1.35-(1.35-.86)*(u*u*(3-2*u)),-2.5-.25*u); lampG.rotation.z=(1-u)*Math.sin(t*3)*.06; },
      subs:[[1,'你把燈，放在椅子旁邊。','',4.2]]},
    // 第四幕三：手記自己翻到最後，出現一頁從沒看過的字
    {d:12,hour:5.95,sea:false,from:[[-.6,1.45,-1.6],[.25,.9,-2.75]],to:[[-.5,1.4,-1.75],[.25,.9,-2.75]],fadeOut:true,
      enter:()=>{ E.layer().appendChild(page); pn=0; pm=0; pageTxt.innerHTML=''; pageMine.textContent=''; setTimeout(()=>page.style.opacity=1,200); sc.pageEnd=0; },
      tick:(t)=>{ if(t<1.2) return; const done=writePage(1/60); if(!done) return 'hold'; sc.pageEnd+=1/60; if(sc.pageEnd<4) return 'hold'; page.style.opacity=0; },
      exit:()=>{ page.remove(); }, cleanup:()=>page.remove()},
    // 第四幕四：太陽升起，一條藍鰓太陽魚躍出水面——就是你在這座碼頭釣到的第一種魚
    {d:12,hour:6.25,hourTo:6.9,sea:false,from:[[1.6,1.05,-4.6],[-.4,.9,-2.4]],to:[[2.2,1.25,-5.6],[-1.5,1.2,-1.8]],
      enter:()=>{ sc.jf=0; },
      tick:(t)=>{ if(t>3.2&&!sc.jf){ sc.jf=1; const u='models/bluegill.glb'; if(cache[u]){ const o=cache[u].scene.clone(true); o.traverse(m=>{ m.frustumCulled=false; }); const bb=new T.Box3().setFromObject(o), sz=bb.getSize(new T.Vector3()); o.scale.setScalar(.32/Math.max(sz.x,sz.y,sz.z)); const w=new T.Group(); w.add(o); keep(w); jumps.push({w,x:.2,z:-4.3,dx:-.7,dz:.7,t:0,h:1.1}); spl(.2,-4.3,10,1); } }
        updJumps(1/60); },
      subs:[[5.6,'陽光照上了碼頭。','',4.2]]},
    // 片尾名單（第二到第四幕完成後，會插在這之前）
    {d:30,hour:6.6,hourTo:8,sea:false,music:'theme',vol:.85,from:[[0,10,14],[0,0,-30]],to:[[0,28,26],[0,0,-40]],
      enter:()=>{ drop(); E.credits(ENDING_CREDITS,28); }, cleanup:drop}
  ];
}
