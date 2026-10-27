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
  if(s.tick) try{ s.tick(st,k,camP,camL); }catch(e){ console.warn('ending tick',e); }
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
return {play,tick,frame,on:()=>on,say,music,credits,fade:v=>{ blk.style.opacity=v; },finish};
}
/* ===== 結局分鏡（依劇本 src/ENDING.md 分段製作；目前完成：演出系統、片尾名單） ===== */
function endingShots(E,c){
  const CRED=`<h2>濕地垂釣</h2><div>Swamp Angler</div>
<div class="r">製作</div><div class="n">歐那</div>
<div class="r">故事</div><div class="n">老漁人的手記</div>
<div class="r">音樂</div><div class="n">Emotional Piano — Centurion_of_war（CC0）</div>
<div class="r">3D 模型與貼圖</div><div class="n">Poly Haven（CC0）</div><div class="n">ambientCG（CC0）</div>
<div class="r">音效</div><div class="n">OpenGameArt（CC0）</div>
<div class="r">特別感謝</div><div class="n">每一個在碼頭上等過魚的人</div>
<div class="last">謝謝你，陪老漁人走完這一段。</div>`;
  return [
    {d:9,hour:22.5,sea:false,music:'piano',from:[[0,7,12],[-6,0,-45]],to:[[-2,4.5,2],[-8,0,-42]],
      subs:[[1.5,'月光順著河道流進湖裡。','',4],[6,'流過倒木，流過浮萍，一路回到碼頭前。','',3]]},
    {d:9,hour:5.6,hourTo:6.4,music:'piano',from:[[3,1.9,6],[0,1.2,-12]],to:[[1.2,1.6,2.2],[0,1.1,-14]],
      subs:[[2,'「月潮回來了。換我守著這片湖。」','q big',5.5]]},
    {d:30,hour:6.6,hourTo:8,music:'theme',vol:.85,from:[[0,10,14],[0,0,-30]],to:[[0,28,26],[0,0,-40]],fadeOut:true,
      enter:()=>E.credits(CRED,28)}
  ];
}
