/* ===== 湖裡還有人等燈：阿蘅（夜裡偶爾出現的驚嚇事件，之後接隱藏章節） ===== */
function createGhost(W,c){
'use strict';
const T=THREE, S=c.save, GL=T.GLTFLoader?new T.GLTFLoader():null;
let model=null, loading=false, mats=[], ev=null, lastTry=0, sessionStart=performance.now();
let alive=null, aliveLoading=false, fin=null, calm=null, calmTry=0;
// 老漁人的提燈：髮簪與三次相遇完成後的夜裡提在手邊，結局時阿蘅看的就是它
let lamp=null, lampLoading=false; const lampL=new T.PointLight(0xffb866,0,7,1.4); W.scene.add(lampL);
function loadLamp(fn){ if(lamp) return fn(lamp); if(lampLoading||!GL) return; lampLoading=true;
  GL.load('models/lantern.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ mt.emissive=new T.Color(0xffc070); mt.emissiveMap=mt.map; mt.emissiveIntensity=.35; } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), sc=.32/Math.max(sz.y,1e-6); o.scale.setScalar(sc); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z); lamp=new T.Group(); lamp.add(o); lamp.visible=false; W.scene.add(lamp); lampLoading=false; fn(lamp); },undefined,()=>{ lampLoading=false; }); }
function lampWanted(){ if(fin) return true; if(!c.storyActive||!c.storyActive('lantern')||!c.progOf) return false; const p=c.progOf('lantern'); return !!p&&p[0]>=1&&p[1]>=3&&c.period()==='night'&&c.loc()==='lake'; }
function updLamp(dt,t){ const want=lampWanted(); if(want&&!lamp){ loadLamp(()=>{}); }
  if(!lamp){ lampL.intensity=0; return; } lamp.visible=want; if(!want){ lampL.intensity=0; return; }
  const b=c.base(), h=c.head(), fw=new T.Vector3(-Math.sin(h),0,-Math.cos(h)), rt=new T.Vector3(Math.cos(h),0,-Math.sin(h));
  lamp.position.set(b.x,0,b.z).addScaledVector(fw,.9).addScaledVector(rt,-.4); lamp.position.y=1.02+Math.sin(t*1.7)*.015; lamp.rotation.y=h+Math.sin(t*.9)*.06; lamp.rotation.z=Math.sin(t*1.3)*.04;
  lampL.position.copy(lamp.position); lampL.position.y+=.18; lampL.intensity=1.6+Math.sin(t*11)*.15+Math.random()*.1; }
let tt=0;
const ov=document.getElementById('scare'), face=ov&&ov.querySelector('img');
// 條件：第六章（月潮）完成後、夜晚、湖區、沒關閉驚嚇效果、正在閒置或等魚
// 測試模式：網址加上 ghost 測試參數，不看章節、時段、次數，閒置或等魚約 5 秒出現、間隔 30 秒（只影響開這一頁的人）
const TEST=/[?&]ghost=1/.test(location.search); let testLast=0;
function eligible(){ if(TEST){ const st=c.state(); return (st==='idle'||st==='wait')&&!ev&&performance.now()-testLast>30000&&performance.now()-sessionStart>5000; }
  if(S.noScare) return false; if(c.storyDone&&c.storyDone('lantern')) return false;
  if(c.period()!=='night'||c.loc()!=='lake') return false; const st=c.state(); if(st!=='idle'&&st!=='wait') return false;
  if(performance.now()-sessionStart<5*60*1000) return false;   // 剛開始玩的前 5 分鐘不嚇人
  const g=S.ghost=S.ghost||{}; const day=new Date().toDateString(); if(g.day!==day){ g.day=day; g.n=0; }
  if(g.n>=3) return false; if(g.last&&Date.now()-g.last<25*60*1000) return false; return true; }
function load(fn){ if(model) return fn(model); if(loading||!GL) return; loading=true;
  GL.load('models/ghost.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ mt.emissive=new T.Color(0xbfc8d8); mt.emissiveMap=mt.map; mt.emissiveIntensity=.55; mats.push(mt); } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), s=1.68/Math.max(sz.y,1e-6); o.scale.setScalar(s); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z);
    model=new T.Group(); model.add(o); model.visible=false; W.scene.add(model); loading=false; fn(model); },undefined,()=>{ loading=false; }); }
// 真人尖叫與哀鳴（OpenGameArt CC0）
const SFX={}; function sfx(name,vol){ try{ let a=SFX[name]; if(!a){ a=new Audio(name+'.mp3'); a.preload='auto'; SFX[name]=a; } a.volume=Math.max(0,Math.min(1,vol==null?1:vol)); a.currentTime=0; a.play().catch(()=>{}); return a; }catch(e){ return null; } }
['scream_main','scream_b','wail','gasp'].forEach(n=>{ try{ const a=new Audio(n+'.mp3'); a.preload='auto'; SFX[n]=a; }catch(e){} });
const MODES=['glide','peek','behind','jump']; let testIdx=0;
function pickMode(){ if(TEST){ const m=MODES[testIdx%MODES.length]; testIdx++; return m; }
  const st=c.state(), c5=S.story&&S.story.done&&S.story.done.includes('c5');
  const w={glide:40,peek:st==='wait'?30:0,behind:18,jump:c5?22:6}; let tot=0; for(const k in w) tot+=w[k]; let r=Math.random()*tot; for(const k in w){ r-=w[k]; if(r<=0) return k; } return 'glide'; }
function placeRel(m,fw,rt,y){ const b=c.base(), h=c.head(), f=new T.Vector3(-Math.sin(h),0,-Math.cos(h)), r=new T.Vector3(Math.cos(h),0,-Math.sin(h));
  const p=new T.Vector3(b.x,0,b.z).addScaledVector(f,fw).addScaledVector(r,rt); m.position.set(p.x,y,p.z); return p; }
function faceMe(m){ const b=c.base(); m.rotation.y=Math.atan2(b.x-m.position.x,b.z-m.position.z); }
function lookingAt(p,tol){ const b=c.base(), yaw=c.head()+(c.yaw?c.yaw():0); const want=Math.atan2(-(p.x-b.x),-(p.z-b.z)); let d=want-yaw; while(d>Math.PI) d-=Math.PI*2; while(d<-Math.PI) d+=Math.PI*2; return Math.abs(d)<(tol||.45); }
function meet(){ if(TEST) return; const g=S.ghost=S.ghost||{}; g.last=Date.now(); g.n=(g.n||0)+1; g.met=(g.met||0)+1; c.persist(); if(c.onMeet) c.onMeet(g.met); }
// 四種出現方式：遠處飄過、水裡露頭、身後、撲臉
function trigger(force){ if(ev) return false; if(!force&&!eligible()) return false; const mode=pickMode();
  load(m=>{ ev={t:0,mode}; meet();
    if(mode==='jump'){ const side=Math.random()<.5?-1:1; const p=placeRel(m,1.4,side*1.9,-1.7); faceMe(m); ev.p=p; m.visible=true; c.drip&&c.drip(); if(window.__FACE) window.__FACE(p,{dur:2.4,pitch:.05}); }
    else if(mode==='glide'){ const side=Math.random()<.5?-1:1, dist=15+Math.random()*7; const p=placeRel(m,dist,-side*4,-.55); ev.p=p; ev.dir=new T.Vector3(Math.cos(c.head()),0,-Math.sin(c.head())).multiplyScalar(side*.55); m.rotation.y=Math.atan2(ev.dir.x,ev.dir.z); m.visible=true; ev.stare=0; ev.phase='glide'; ev.wail=sfx('wail',.35); }
    else if(mode==='peek'){ const to=c.state()==='wait'&&c.to?c.to():null; const b=c.base(); let p; if(to){ const dx=to.x-b.x, dz=to.z-b.z, L=Math.hypot(dx,dz)||1; p=new T.Vector3(to.x+dx/L*1.6+(Math.random()-.5),0,to.z+dz/L*1.6+(Math.random()-.5)); m.position.set(p.x,-1.95,p.z); } else p=placeRel(m,6,1.5,-1.95); ev.p=p; faceMe(m); m.visible=true; ev.phase='rise'; ev.st0=c.state(); }
    else { const p=placeRel(m,-2.1,0,0); ev.p=p; faceMe(m); m.visible=true; ev.phase='wait'; ev.wail=sfx('wail',.22); c.vib&&c.vib([15,60,15]); } });
  return true; }
function endEv(){ if(model) model.visible=false; if(ov) ov.classList.remove('on'); if(ev&&ev.wail){ try{ ev.wail.pause(); }catch(e){} } ev=null; }
function update(dt){
  if(!ev){ lastTry+=dt; if(lastTry>1){ lastTry=0;
      if(!model&&!loading&&(TEST||!S.noScare&&c.period()==='night'&&c.loc()==='lake')) load(()=>{});
      if(eligible()&&(TEST||Math.random()<1/720)){ if(TEST) testLast=performance.now(); trigger(TEST); } } return; }
  ev.t+=dt; const t=ev.t, m=model; if(!m) return;
  if(ev.mode==='jump'){ m.position.y=Math.min(0,-1.7+t*2.1); faceMe(m); m.rotation.y+=Math.sin(t*9)*.04;
    if(t>.9&&!ev.face){ ev.face=true; if(ov) ov.classList.add('on'); sfx('scream_main',1); c.vib&&c.vib([120,40,160,40,320]); c.shake&&c.shake(3.2); }
    if(t>2.3) endEv(); return; }
  if(ev.mode==='glide'){ if(ev.phase==='glide'){ m.position.addScaledVector(ev.dir,dt); m.position.y=-.55+Math.sin(t*.8)*.04; if(ev.wail) ev.wail.volume=Math.max(0,.35*(1-t/16));
      if(lookingAt(m.position,.35)) ev.stare+=dt; else ev.stare=Math.max(0,ev.stare-dt*.5);
      if(ev.stare>2){ ev.phase='turn'; ev.t2=0; } if(t>16) ev.phase='sink'; }
    if(ev.phase==='turn'){ ev.t2+=dt; const b=c.base(), want=Math.atan2(b.x-m.position.x,b.z-m.position.z); let d=want-m.rotation.y; while(d>Math.PI) d-=Math.PI*2; while(d<-Math.PI) d+=Math.PI*2; m.rotation.y+=d*Math.min(1,dt*1.2); if(ev.t2>3) ev.phase='sink'; }
    if(ev.phase==='sink'){ m.position.y-=dt*.45; if(m.position.y<-2) endEv(); } return; }
  if(ev.mode==='peek'){ if(ev.phase==='rise'){ m.position.y=Math.min(-1.42,m.position.y+dt*.4); if(m.position.y>=-1.42) ev.phase='stare'; }
    else if(ev.phase==='stare'){ faceMe(m); m.position.y=-1.42+Math.sin(t*1.1)*.015; if(c.state()!==ev.st0||t>8){ ev.phase='down'; if(c.state()!==ev.st0){ sfx('gasp',.6); c.vib&&c.vib(40); } } }
    else { m.position.y-=dt*1.6; if(m.position.y<-2.2) endEv(); } return; }
  if(ev.mode==='behind'){ faceMe(m); if(lookingAt(m.position,.6)||t>14){ if(t<14){ sfx('gasp',.7); c.vib&&c.vib([60,30,60]); } endEv(); } return; }
}
// 拍到她：遠處飄過時按 📷，手記多一頁
function onPhoto(){ if(!ev||ev.mode!=='glide'||ev.phase==='sink') return false; const g=S.ghost=S.ghost||{}; if(!g.photo){ g.photo=1; c.persist(); if(window.__STORY&&window.__STORY.page) setTimeout(()=>window.__STORY.page('手記・夾頁：拍到了什麼','那晚我在灣裡拍湖面，回家洗出來，水上多了一個人影。<br><br>白衣，長髮，背對著我。放大看，她的腳不在水裡——她是浮著的。<br><br>我沒有刪掉那張照片。'),900); }
  return true; }
// 生前模樣的模型（結局與之後的安靜出現）
function loadAlive(fn){ if(alive) return fn(alive); if(aliveLoading||!GL) return; aliveLoading=true;
  GL.load('models/ghost_alive.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ mt.emissive=new T.Color(0xe8e2d8); mt.emissiveMap=mt.map; mt.emissiveIntensity=.7; mt.transparent=true; } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), sc=1.66/Math.max(sz.y,1e-6); o.scale.setScalar(sc); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z);
    alive=new T.Group(); alive.add(o); alive.visible=false; W.scene.add(alive); aliveLoading=false; fn(alive); },undefined,()=>{ aliveLoading=false; }); }
function placeAhead(m,dist,side){ const b=c.base(), h=c.head(), fw=new T.Vector3(-Math.sin(h),0,-Math.cos(h)), rt=new T.Vector3(Math.cos(h),0,-Math.sin(h));
  const p=new T.Vector3(b.x,0,b.z).addScaledVector(fw,dist).addScaledVector(rt,side||0); m.position.set(p.x,0,p.z); m.rotation.y=Math.atan2(b.x-p.x,b.z-p.z); return p; }
const setOpacity=(m,a)=>m.traverse(o=>{ if(o.isMesh&&o.material) o.material.opacity=a; });
// 結局：髮簪與三次相遇都完成後，滿月夜在浮萍灣提燈，她以生前的樣子出現
function finaleReady(){ if(!c.storyActive||!c.storyActive('lantern')||!c.progOf) return false; const p=c.progOf('lantern'); if(!p) return false;
  return p[0]>=1&&p[1]>=3&&p[2]<1&&c.period()==='night'&&c.zone&&c.zone()==='lily'&&c.moon()>.85&&(c.state()==='idle'||c.state()==='wait'); }
const LINES=['……燈。','是爸爸的燈。','我等了好久……好久。','謝謝你，把燈提到這裡來。','替我跟他說——我要回家了。'];
function startFinale(){ loadAlive(m=>{ placeAhead(m,5.5,0); m.position.y=-.3; m.visible=true; setOpacity(m,0); fin={t:0,li:0}; c.drip&&c.drip(); }); }
function updFinale(dt){ fin.t+=dt; const t=fin.t; if(!alive) return;
  if(t<3){ setOpacity(alive,Math.min(1,t/3)); alive.position.y=-.3+Math.min(1,t/3)*.3; }
  const li=Math.floor((t-3)/3.4); if(t>3&&li<LINES.length&&li>=fin.li){ fin.li=li+1; c.say&&c.say(LINES[li]); }
  if(t>3+LINES.length*3.4+1&&t<3+LINES.length*3.4+5){ const k=1-(t-(3+LINES.length*3.4+1))/4; setOpacity(alive,Math.max(0,k)); alive.position.y+=dt*.25; }
  if(t>3+LINES.length*3.4+5){ alive.visible=false; fin=null; const g=S.ghost=S.ghost||{}; g.freed=1; c.persist(); if(c.scene) c.scene('lantern'); } }
// 章節完成後：夜裡偶爾在遠處水面安靜地站著看燈，不嚇人
function updCalm(dt){ if(calm){ calm.t+=dt; if(alive){ if(calm.t<2) setOpacity(alive,Math.min(.85,calm.t/2*.85)); if(calm.t>9) setOpacity(alive,Math.max(0,.85*(1-(calm.t-9)/2))); if(calm.t>11){ alive.visible=false; calm=null; } } return; }
  calmTry+=dt; if(calmTry<60) return; calmTry=0; if(c.period()!=='night'||c.loc()!=='lake'||Math.random()>.08) return;
  loadAlive(m=>{ placeAhead(m,12,(Math.random()-.5)*8); m.visible=true; setOpacity(m,0); calm={t:0}; }); }
function update2(dt){ tt+=dt; updLamp(dt,tt); if(fin){ updFinale(dt); return; }
  if(!TEST&&c.storyDone&&c.storyDone('lantern')){ updCalm(dt); return; }
  if(!ev&&finaleReady()&&!aliveLoading){ startFinale(); return; }
  update(dt); }
return {dbg:()=>({ev:ev&&{mode:ev.mode,phase:ev.phase,t:+ev.t.toFixed(1)},pos:model&&model.visible?[+model.position.x.toFixed(2),+model.position.y.toFixed(2),+model.position.z.toFixed(2)]:null,base:[+c.base().x.toFixed(2),+c.base().z.toFixed(2)],head:+c.head().toFixed(2),yaw:+(c.yaw?c.yaw():0).toFixed(2)}),update:update2,trigger,onPhoto,finale:()=>{ startFinale(); },active:()=>!!ev||!!fin};
}
