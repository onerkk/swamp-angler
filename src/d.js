/* ===== 第 1 段 · 遊戲邏輯、操作、介面、音效 ===== */
function startGame(W, P){
'use strict';
const T=THREE, $=id=>document.getElementById(id);
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t, rand=(a,b)=>a+Math.random()*(b-a);
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const RAR=P.RAR, SPECIES=P.SPECIES, MAX_LINE=80;
const easy=()=>!!(window.__ASSIST&&window.__ASSIST.active());
// 捲線器的線量：湖、冰湖 80 公尺；出海用大型捲線器 250 公尺（旗魚、鮪魚一衝就是上百公尺，80 公尺根本留不住，最後一章的旗魚因此釣不到）
const maxLine=()=>G.loc==='sea'?250:MAX_LINE;

/* ---------- 存檔 ---------- */
// 測試帳號：網址加 test 參數，存檔另開一份（只限擁有者 Google 帳號，驗證在 y.js）
const TESTACC=/[?&]test=1(&|$)/.test(location.search);
/* 全開測試網址 ?unlock=1：獨立的一份存檔（不碰正式存檔、不上傳雲端），等級 60、金幣、獨木舟、遊艇、美人魚認可全部到位，所有釣點與章節都能進去 */
const UNLOCK=/[?&]unlock=1(&|$)/.test(location.search); window.__UNLOCK=UNLOCK;
const SAVE_KEY=UNLOCK?'swampAngler.unlockTest':TESTACC?'swampAngler.test':'swampAngler.v1';
window.__SAVE_KEY=SAVE_KEY;
let save={coins:0,total:0,sound:true,dex:{}};
try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); if(s) save=Object.assign(save,s); }catch(e){}
if(UNLOCK){ save.lv=Math.max(save.lv||1,60); save.coins=Math.max(save.coins||0,2000000); save.kayak=1; save.yacht=1; save.mer=Object.assign({n:20},save.mer||{}); if((save.mer.n||0)<20) save.mer.n=20; save.total=Math.max(save.total||0,500); save.intro=1; }
function persist(){ if(window.__SAVE_LOCK) return; try{ localStorage.setItem(SAVE_KEY,JSON.stringify(save)); }catch(e){} if(window.__CLOUD&&!UNLOCK) window.__CLOUD.dirty(); }   /* 全開測試的存檔絕不上傳雲端 */

/* ---------- 音效（全程序合成） ---------- */
const Snd=(()=>{
  let ctx=null,out=null,outdoor=null,soundBus=null,indoor=false,nb=null,rainG=null,AMB=null,on=save.sound!==false; const SMP={}; let reelSrc=null, reelG=null;
  // 捲線器循環：rate 決定轉速（收線慢轉、魚拉走線時高速尖叫），vol 0 就淡出
  function reelLoop(vol,rate){ if(!ctx||!SMP.reel) return false; if(!reelSrc&&vol>.01){ reelSrc=ctx.createBufferSource(); reelSrc.buffer=SMP.reel; reelSrc.loop=true; reelG=ctx.createGain(); reelG.gain.value=0; reelSrc.connect(reelG); reelG.connect(outdoor); reelSrc.start(); }
    if(reelSrc){ reelG.gain.setTargetAtTime(vol,ctx.currentTime,.06); reelSrc.playbackRate.setTargetAtTime(rate,ctx.currentTime,.08); if(vol<=.01){ const s=reelSrc; reelSrc=null; setTimeout(()=>{ try{ s.stop(); }catch(e){} },400); } } return true; }
  function sample(k,vol,rate){ if(!ctx||!SMP[k]) return false; const s=ctx.createBufferSource(); s.buffer=SMP[k]; s.playbackRate.value=rate||1; const g=ctx.createGain(); g.gain.value=vol; s.connect(g); g.connect(soundBus||out); s.start(); return true; }
  function init(){
    if(ctx){ if(ctx.state==='suspended') ctx.resume(); return; }
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    try{ ctx=new AC(); }catch(e){ return; }
    out=ctx.createGain(); out.gain.value=on?.8:0; out.connect(ctx.destination);outdoor=ctx.createGain();outdoor.gain.value=indoor?0:1;outdoor.connect(out); if(indoor) setTimeout(()=>{ if(indoor) musicStart(); },0);
    // 真實錄音音效（OpenGameArt「Fisheefects」，CC0）：捲線器、水花；載入失敗就沿用合成音
    ['reel','splash'].forEach(k=>fetch('sfx_'+k+'.mp3').then(r=>r.arrayBuffer()).then(b=>ctx.decodeAudioData(b)).then(buf=>{ SMP[k]=buf; }).catch(()=>{}));
    nb=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate); const d=nb.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const amb=(rate,type,f,q,g0,lf,lg)=>{ const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true; s.playbackRate.value=rate;
      const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q; const g=ctx.createGain(); g.gain.value=g0;
      const o=ctx.createOscillator(); o.frequency.value=lf; const og=ctx.createGain(); og.gain.value=lg; o.connect(og); og.connect(g.gain);
      s.connect(fl); fl.connect(g); g.connect(outdoor); s.start(); o.start(); };
    amb(1,'lowpass',320,.4,.06,.17,.035);
    amb(.7,'bandpass',2600,.6,.012,.06,.01);
    rainG=ctx.createGain(); rainG.gain.value=0; { const rs=ctx.createBufferSource(); rs.buffer=nb; rs.loop=true; const rf=ctx.createBiquadFilter(); rf.type='highpass'; rf.frequency.value=1800; rs.connect(rf); rf.connect(rainG); rainG.connect(outdoor); rs.start(); }
    const bed=(type,f,q,rate,amHz)=>{ const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true; s.playbackRate.value=rate; const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q;
      const am=ctx.createGain(); am.gain.value=amHz?.5:1; if(amHz){ const o=ctx.createOscillator(); o.frequency.value=amHz; const og=ctx.createGain(); og.gain.value=.5; o.connect(og); og.connect(am.gain); o.start(); }
      const g=ctx.createGain(); g.gain.value=0; s.connect(fl); fl.connect(am); am.connect(g); g.connect(outdoor); s.start(); return {g,fl}; };
    AMB={wind:bed('bandpass',420,.7,.8,0),lap:bed('lowpass',240,.6,.6,.45),cic:bed('bandpass',4800,8,1,31),crk:bed('bandpass',4300,14,1,3.2)};
  }
  function nz(dur,type,f,q,gain,f2){ if(!ctx) return; const t=ctx.currentTime, s=ctx.createBufferSource(); s.buffer=nb;
    const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.setValueAtTime(f,t); if(f2) fl.frequency.exponentialRampToValueAtTime(f2,t+dur); fl.Q.value=q;
    const g=ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+.008); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(fl); fl.connect(g); g.connect(soundBus||out); s.start(t,Math.random()*1.2,dur+.05); }
  function tn(f,dur,type,gain,delay,f2){ if(!ctx) return; const t=ctx.currentTime+(delay||0), o=ctx.createOscillator(); o.type=type;
    o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
    const g=ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g); g.connect(soundBus||out); o.start(t); o.stop(t+dur+.05); }
  document.addEventListener('visibilitychange',()=>{ if(!ctx) return; if(document.hidden) ctx.suspend(); else ctx.resume(); });
  function outdoors(fn){return(...args)=>{if(indoor)return;const previous=soundBus;soundBus=outdoor;try{return fn(...args);}finally{soundBus=previous;}};}
  // 小屋裡的輕音樂：即時合成的木吉他／電鋼琴感分解和弦（Fmaj7 → Em7 → Dm7 → Cmaj7，每分鐘 70 拍），低音輕輕墊底、偶爾一個高音點綴，加一點房間殘響；進門淡入、出門淡出，跟著遊戲音效開關
  let music=null;
  function roomVerb(sec){ const n=Math.floor(ctx.sampleRate*sec), b=ctx.createBuffer(2,n,ctx.sampleRate); for(let c=0;c<2;c++){ const d=b.getChannelData(c); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3); } return b; }
  function musicStart(){ if(!ctx||music||typeof setInterval!=='function') return; const bus=ctx.createGain(); bus.gain.value=0; bus.gain.setTargetAtTime(.5,ctx.currentTime,1.6);
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2400; bus.connect(lp); lp.connect(out);
    if(ctx.createConvolver&&ctx.createBuffer){ try{ const rv=ctx.createConvolver(); rv.buffer=roomVerb(2.4); const wet=ctx.createGain(); wet.gain.value=.32; lp.connect(rv); rv.connect(wet); wet.connect(out); }catch(_){} }
    const beat=60/70, prog=[[53,57,60,64],[52,55,59,62],[50,53,57,60],[48,52,55,59]], pat=[0,2,1,3,2,1,3,2]; let next=ctx.currentTime+.4, step=0;
    const note=(m,t,dur,g,type)=>{ const f=440*Math.pow(2,(m-69)/12), o=ctx.createOscillator(), o2=ctx.createOscillator(), h=ctx.createGain(), e=ctx.createGain(); o.type=type||'triangle'; o.frequency.value=f; o2.type='sine'; o2.frequency.value=f*2.003; h.gain.value=.16;
      e.gain.setValueAtTime(.0001,t); e.gain.exponentialRampToValueAtTime(g,t+.015); e.gain.exponentialRampToValueAtTime(g*.3,t+.45); e.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(e); o2.connect(h); h.connect(e); e.connect(bus); o.start(t); o2.start(t); o.stop(t+dur+.05); o2.stop(t+dur+.05); };
    const tick=()=>{ if(!music) return; while(next<ctx.currentTime+.7){ const ch=prog[Math.floor(step/8)%prog.length], s8=step%8;
      if(s8===0) note(ch[0]-12,next,beat*4.2,.09,'sine');
      if(Math.random()>.12) note(ch[pat[s8]]+12,next+(Math.random()-.5)*.02,beat*1.7,.04+Math.random()*.015);
      if(s8===5&&Math.random()<.45) note(ch[3]+24,next+beat*.25,beat*2.2,.022);
      next+=beat/2; step++; } };
    music={bus,id:0}; music.id=setInterval(tick,120); tick(); }
  function musicStop(){ if(!music) return; const m=music; music=null; clearInterval(m.id); try{ m.bus.gain.setTargetAtTime(0,ctx.currentTime,.5); }catch(_){} setTimeout(()=>{ try{ m.bus.disconnect(); }catch(_){} },3000); }
  function setIndoor(on){indoor=!!on;if(outdoor)outdoor.gain.setTargetAtTime(indoor?0:1,ctx.currentTime,.12);if(indoor){reelLoop(0,1);musicStart();}else musicStop();}
  /* 遊艇引擎聲（全程序合成，跟著船速即時變化）：
     · 柴油雙引擎的低頻隆隆聲：兩個鋸齒波（基音與五度）加一個低八度正弦，過低通濾波；再用一個低頻振盪調變音量，做出「咚咚咚」的運轉節奏
     · 轉速跟著油門與船速：怠速約 42 Hz、全速約 100 Hz，節奏也從慢到快，濾波隨轉速打開（聲音變亮、變吵）
     · 破浪的水聲：雜訊過帶通濾波，音量跟船速平方成正比——停著只有引擎怠速，開快了水聲才蓋上來
     只有站在駕駛座時發動；回到釣位就熄火（下錨釣魚），進小屋也會關 */
  let eng=null;
  function engine(onE,spd,thr){ if(!ctx||!outdoor||!nb) return; spd=Math.max(0,Math.min(1,spd||0)); thr=Math.max(0,Math.min(1,thr||0));
    if(!eng){ if(!onE) return; const g=ctx.createGain(); g.gain.value=0; g.connect(outdoor);
      const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=200; lp.Q.value=.9; const am=ctx.createGain(); am.gain.value=.7;
      const o1=ctx.createOscillator(), o2=ctx.createOscillator(), sub=ctx.createOscillator(), lfo=ctx.createOscillator(), lg=ctx.createGain(), sg=ctx.createGain(), o2g=ctx.createGain();
      o1.type='sawtooth'; o2.type='sawtooth'; sub.type='sine'; lfo.type='sine'; lg.gain.value=.3; sg.gain.value=.9; o2g.gain.value=.45;
      lfo.connect(lg); lg.connect(am.gain); o1.connect(lp); o2.connect(o2g); o2g.connect(lp); sub.connect(sg); sg.connect(am); lp.connect(am); am.connect(g);
      const ns=ctx.createBufferSource(); ns.buffer=nb; ns.loop=true; const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=600; bp.Q.value=.6; const wg=ctx.createGain(); wg.gain.value=0; ns.connect(bp); bp.connect(wg); wg.connect(outdoor);
      for(const n of [o1,o2,sub,lfo,ns]) n.start(); eng={g,lp,o1,o2,sub,lfo,ns,bp,wg,offT:null}; }
    const t=ctx.currentTime, rpm=.16+.84*Math.max(spd,thr*.65), f=42+rpm*58;
    eng.o1.frequency.setTargetAtTime(f,t,.3); eng.o2.frequency.setTargetAtTime(f*1.5,t,.3); eng.sub.frequency.setTargetAtTime(f*.5,t,.3);
    eng.lfo.frequency.setTargetAtTime(7+rpm*19,t,.3); eng.lp.frequency.setTargetAtTime(170+rpm*640,t,.35);
    eng.g.gain.setTargetAtTime(onE?.05+.12*rpm:0,t,onE?.3:.45); eng.wg.gain.setTargetAtTime(onE?.02*spd+.2*spd*spd:0,t,.4); eng.bp.frequency.setTargetAtTime(480+950*spd,t,.4);
    if(onE){ if(eng.offT){ clearTimeout(eng.offT); eng.offT=null; } }
    else if(!eng.offT){ const e=eng; e.offT=setTimeout(()=>{ if(eng===e) eng=null; for(const n of [e.o1,e.o2,e.sub,e.lfo,e.ns]){ try{ n.stop(); }catch(_){} } try{ e.g.disconnect(); e.wg.disconnect(); }catch(_){} },2200); } }
  return { init,setIndoor,engine, isOn:()=>on, set(v){ on=v; if(out) out.gain.value=v?.8:0; },
    whoosh:outdoors(function(){ nz(.4,'bandpass',2400,.9,.18,500); }),
    splash:outdoors(function(s){ s=s||1; if(sample('splash',Math.min(1,.25+.45*s),.85+Math.random()*.3+(s<.5?.25:0))) return; nz(.18+.3*s,'bandpass',1100,.7,.22*s,400); nz(.35+.4*s,'lowpass',700,.5,.16*s); tn(140,.12,'sine',.12*s,0,60); }),
    plop:outdoors(function(){ tn(320,.09,'sine',.14,0,120); nz(.06,'bandpass',1800,2,.05); }),
    reelLoop,
    nibble:outdoors(function(){ tn(260,.06,'sine',.07,0,140); }),
    creak:outdoors(function(k){ k=k||1; tn(70+Math.random()*50,.16,'sawtooth',.035*k,0,40); nz(.08,'bandpass',900+Math.random()*500,3,.02*k); }),   // 竿身承受重量的吱嘎聲
    bite:outdoors(function(){ tn(180,.22,'sine',.28,0,55); nz(.25,'lowpass',900,.6,.12); }),
    click(p){ nz(.014,'highpass',p||3200,.8,.09); },
    snap:outdoors(function(){ nz(.05,'highpass',3000,.6,.5); tn(110,.3,'triangle',.25,0,40); }),
    fanfare(r){ const b=[523.25,659.25,783.99,1046.5,1318.5]; for(let i=0;i<3+r;i++) tn(b[i%5]*(i>=5?2:1),.35,'triangle',.11,i*.09); if(r>=3) tn(261.6,.9,'sine',.12,0); },
    coin(){ tn(1318,.08,'square',.04); tn(1760,.14,'square',.04,.07); },
    rain(k){ if(rainG) rainG.gain.setTargetAtTime(k*.16,ctx.currentTime,.5); },
    thunder:outdoors(function(){ nz(2.6,'lowpass',160,.7,.5,60); nz(.5,'lowpass',900,.5,.22); }),
    eagle:outdoors(function(){ for(let i=0;i<3;i++) tn(2900-i*120,.12,'sine',.05,i*.13,2300); tn(2400,.5,'sine',.04,.45,1700); }),
    frog:outdoors(function(){ const n=2+Math.floor(Math.random()*2); for(let i=0;i<n;i++) tn(140+Math.random()*40,.09,'square',.025,i*.14,110); }),
    bird:outdoors(function(){ const b=2600+Math.random()*1200; for(let i=0;i<3;i++) tn(b+i*200,.07,'sine',.03,i*.09,b+600); }),
    gator:outdoors(function(){ nz(1.2,'lowpass',90,.8,.35); tn(55,1,'sawtooth',.05,0,40); }),
    paddle:outdoors(function(){ nz(.35,'bandpass',700,.8,.14,300); }),
    drip:outdoors(function(){ tn(1200,.08,'sine',.05,0,300); }),
    rumble:outdoors(function(){ nz(1.2,'lowpass',140,.6,.18,90); tn(48,1.0,'sine',.12,0,38); }),
    sizzle(k){ nz(.5+.6*(k||.5),'highpass',3800,.5,.12*(k||.5),6000); },
    scream:outdoors(function(){ if(!ctx) return; const t=ctx.currentTime, o=ctx.createOscillator(), o2=ctx.createOscillator(), g=ctx.createGain(), lfo=ctx.createOscillator(), lg=ctx.createGain();
      o.type='sawtooth'; o2.type='square'; o.frequency.setValueAtTime(850,t); o.frequency.exponentialRampToValueAtTime(1500,t+.35); o.frequency.exponentialRampToValueAtTime(1100,t+1.1);
      o2.frequency.setValueAtTime(1710,t); o2.frequency.exponentialRampToValueAtTime(2900,t+.4); lfo.frequency.value=28; lg.gain.value=60; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.45,t+.04); g.gain.setValueAtTime(.45,t+.8); g.gain.exponentialRampToValueAtTime(.001,t+1.25);
      o.connect(g); o2.connect(g); g.connect(soundBus||out); o.start(t); o2.start(t); lfo.start(t); o.stop(t+1.3); o2.stop(t+1.3); lfo.stop(t+1.3); nz(.5,'highpass',2500,.6,.25,4000); }),
    grind:outdoors(function(){ nz(.06,'bandpass',1200+Math.random()*900,1.2,.05,500); }),
    crackle(){ nz(.03+Math.random()*.05,'highpass',1800+Math.random()*2600,.8,(indoor?.014:.04)+Math.random()*(indoor?.012:.06),900); },
    plip(){ tn(900,.05,'sine',.03,0,500); nz(.08,'bandpass',2500,1.5,.03); },
    setAmb(o){ if(!AMB) return; const t=ctx.currentTime;
      AMB.wind.g.gain.setTargetAtTime(.02+o.wind*.32,t,.6); AMB.wind.fl.frequency.setTargetAtTime(300+o.wind*700,t,.6);
      AMB.lap.g.gain.setTargetAtTime(o.lap*.06,t,1); AMB.cic.g.gain.setTargetAtTime(o.cic*.02,t,2); AMB.crk.g.gain.setTargetAtTime(o.crk*.05,t,2); } };
})();
function vib(p){ if(save.vibe===false) return; try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
const D=()=>DIFF[save.diff]||DIFF.normal;
const stars=fd=>{ const n=Math.max(1,Math.min(5,Math.round(1+fd.sp.rar*.6+Math.log2(fd.w+1)*.7+styOf(fd.sp.id).d))); return '★'.repeat(n)+'☆'.repeat(5-n); };

/* ---------- 介面 ---------- */
const ui={coin:$('coin'),clock:$('clock'),toast:$('toast'),fight:$('fight'),fName:$('fName'),fDist:$('fDist'),tBar:$('tBar'),tFill:$('tFill'),sFill:$('sFill'),
  fTens:$('fTens'),fStam:$('fStam'),steer:$('steer'),actWrap:$('act'),act:$('actBtn'),actLbl:$('actLbl'),pw:$('pw'),sub:$('actSub'),catch:$('catch'),log:$('log')};
ui.netBtn=$('netBtn'); ui.dragBtn=$('dragBtn');
// 洩力按鈕：鬆／中／緊循環切換，記在存檔；搏魚中切換立即生效
/* 洩力改成左右滑動的連續調整（0＝最鬆、1＝最緊）：以前按一下換一段，要從「中」調鬆得先經過「緊」，大魚衝刺時一按就斷線 */
const dragV=()=>save.dragV!=null?save.dragV:(save.drag==null?.5:save.drag/2);
const dragLbl=()=>{ const v=dragV(), el=ui.dragBtn; if(!el) return; el.style.setProperty('--dv',(v*100).toFixed(1)+'%'); el.setAttribute('aria-valuenow',Math.round(v*100)); const t=$('dragVal'); if(t) t.textContent=v<.34?'鬆':v<.67?'中':'緊'; };
if(ui.dragBtn){ dragLbl(); let dPtr=null, lastBuzz=-1;
  const setFrom=e=>{ const r=ui.dragBtn.querySelector('.dtrk').getBoundingClientRect(); const v=clamp((e.clientX-r.left)/Math.max(1,r.width),0,1); save.dragV=Math.round(v*100)/100; save.drag=Math.round(save.dragV*2); if(G.f) G.f.drag=save.dragV; dragLbl(); const z=Math.round(v*10); if(z!==lastBuzz){ lastBuzz=z; vib(4); } };
  ui.dragBtn.addEventListener('pointerdown',e=>{ e.stopPropagation(); e.preventDefault(); dPtr=e.pointerId; try{ ui.dragBtn.setPointerCapture(e.pointerId); }catch(_){} setFrom(e); });
  ui.dragBtn.addEventListener('pointermove',e=>{ if(e.pointerId!==dPtr) return; e.stopPropagation(); setFrom(e); });
  const end=e=>{ if(e.pointerId!==dPtr) return; dPtr=null; persist(); }; ui.dragBtn.addEventListener('pointerup',end); ui.dragBtn.addEventListener('pointercancel',end); }
if(ui.netBtn) ui.netBtn.addEventListener('pointerdown',e=>{ e.stopPropagation(); if(G.f&&G.f.netOn) G.f.netGo=true; });
// 釣棚按鈕：點一下切換淺／中／深；浮標吃水深度跟著改，提示目前這個水層容易遇到哪類魚
const depthTxt=$('depthTxt'), DEPTH_TIP=['水面附近：藍鰓、鱷雀鱔、鬼頭刀、鮪魚等中上層魚','中層：大部分鱸魚、鱒魚、鯛類','觸底：鯰魚、鯉魚、石斑、比目魚、魟等底棲魚'];
const depthLbl=()=>{ if(depthTxt) depthTxt.textContent=['淺棚','中層','深棚'][save.depth==null?1:save.depth]; };
depthLbl(); if($('depthChip')) $('depthChip').addEventListener('click',()=>{ save.depth=((save.depth==null?1:save.depth)+1)%3; depthLbl(); persist(); toast('🎚️ 釣棚：'+window.__LAYER_N[save.depth]+'<br><small>'+DEPTH_TIP[save.depth]+'</small>','',2400); });
let toastTimer=0;
let homeToast=false;   // 小屋裡自己的提示（家具、水族箱、烤魚…）才顯示
function toastHome(...a){ homeToast=true; try{ toast(...a); } finally{ homeToast=false; } }
function toast(msg,cls,ms){ if(G.state==='tide'&&!homeToast) return;   /* 在泥灘上不顯示釣魚那邊的提示（魚群出現等） */ if(window.__ENDON&&window.__ENDON()) return;
  if(G.state==='home'&&!homeToast&&!document.body.classList.contains('sheetOn')) return;   // 在小屋裡（選單開著時除外）收不到外面（湖上、海上、天氣、魚群、鯨魚…）的訊息   // 結局演出時，遊戲裡的任何提示都不顯示
  ui.toast.innerHTML=msg; ui.toast.className='show '+(cls||''); clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ ui.toast.className=''; },ms||1700); }
function setCoins(){ ui.coin.textContent=save.coins.toLocaleString(); }
setCoins();
let lastLbl='', lastSub='', lastHot=null;
function setAct(lbl,sub,hot){ if(lbl!==lastLbl){ ui.actLbl.innerHTML=lbl; lastLbl=lbl; } if(sub!==lastSub){ ui.sub.textContent=sub; lastSub=sub; ui.sub.classList.remove('fade'); void ui.sub.offsetWidth; if(['idle','wait','cast','lure'].indexOf(G.state)>=0) ui.sub.classList.add('fade'); }
  if(hot!==lastHot){ ui.act.classList.toggle('hot',!!hot); lastHot=hot; } }
function setPower(p){ ui.pw.setAttribute('stroke-dashoffset',(301.6*(1-p)).toFixed(1)); }

/* ---------- 狀態 ---------- */
const G={state:'intro',t:0,hour:7.1,yaw:0,yawT:0,power:0,chargeT:0,rodSide:0,rodSideT:0,luck:0,held:false,
  to:new T.Vector3(),from:new T.Vector3(),castT:0,castDur:1,apex:1,castDist:0,delay:0,timer:0,nib:0,dip:0,approach:0,biteT:0,
  sp:null,fd:null,f:null,fish:null,stT:0,landFrom:new T.Vector3(),landQ:new T.Quaternion(),snapped:false,endV:new T.Vector3(),base:new T.Vector3(),head:0,spot:0,chaseV:new T.Vector3()};
const tv=new T.Vector3(), tv2=new T.Vector3(), tq=new T.Quaternion(), te=new T.Euler(0,0,0,'YZX');
const bob=P.bobber, rod=P.rod;
const practice=createDockPractice($('dockPractice'),save,()=>persist());
if(!SPOTS[save.spot]||(SPOTS[save.spot].kayak&&!save.kayak)||(SPOTS[save.spot].yacht&&!save.yacht))save.spot=0;
if(typeof save.hour==='number'&&Number.isFinite(save.hour))G.hour=save.hour;
try{window.__REAL=createReal(W,P,SPOTS[save.spot].loc||'lake');}catch(error){console.warn('場景細節載入失敗',error);}
function period(h){ h=((h%24)+24)%24; return h>=4.8&&h<8.5?'dawn':h<16.5&&h>=8.5?'day':h>=16.5&&h<19.8?'dusk':'night'; }
const PER_WAIT={dawn:.75,day:1.1,dusk:.75,night:1.0};
const tv2b=new T.Vector3(), tv3b=new T.Vector3(), tv4b=new T.Vector3();
function hangPos(out){ return out.copy(rod.tipW).add(tv2.set(Math.sin(G.t*1.3)*.012,-.24,Math.cos(G.t*1.1)*.01)); }   // 浮標收到竿尖下方約 25 公分，像真的釣客收好線

/* ---------- 選魚 ---------- */
function specialK(sp){ if(!sp.special) return 1;
  // 神話海馬獸只在月亮八成五以上、深夜出現
  if(sp.special==='seabeast') return (period(G.hour)==='night'&&window.__MOONPH&&window.__MOONPH.illum()>.85)?1:0;
  const wx=WL.wx(); if(sp.special==='mermaid'){ if(save.mer&&save.mer.last&&Date.now()-save.mer.last<30*60*1000) return 0; return (KY.zone>=3||G.spot>=3||wx.f>.5)?.5:.05; } if(sp.special==='golden') return wx.c<.4?1:.3; if(sp.special==='king') return 0; if(sp.special==='moonkoi') return window.__MOON?window.__MOON.koiK():0; return 1; }
/* 魚群警覺：同一個方向一直釣，魚會變少、變小、變慢咬；換方向或換釣點就恢復（每分鐘消退 1） */
/* 透水：水下物體在水面之後繪製，越深越透明、越帶水色（湖底沒有地形，所以讓物體透出來，而不是讓水變透明） */
const SEE_U={value:new THREE.Vector3(.04,.13,.15)}, SEE_K={value:1}; window.__SEE_K=SEE_K;
function seeThrough(obj){if(obj&&W.optics)W.optics.add(obj);if(obj&&W.submerged)W.submerged.add(obj); }
window.__seeThrough=seeThrough;
const DEPL={}; const TR=b=>window.__TAL?window.__TAL.rank(b):0;
function depKey(){ const A=((G.head+(G.fishingYaw||0)+G.yaw)%(2*Math.PI)+2*Math.PI)%(2*Math.PI); return (WL.zoneId?WL.zoneId():'')+':'+Math.floor(A/(Math.PI/3)); }
function depNow(k){ const e=DEPL[k]; return e?Math.max(0,e.v-(performance.now()-e.t)/60000):0; }
function depAdd(k,n){ const v=depNow(k)+n, w=v>=2&&DEPL[k]&&DEPL[k].warned; DEPL[k]={v,t:performance.now(),warned:w}; if(v>=4&&!w){ DEPL[k].warned=true; setTimeout(()=>toast('這一帶的魚變警覺了，轉個方向或換釣點吧','warn',2600),1800); } }
const reachK=()=>G.loc==='ice'?.78:clamp((G.castDist-4)/(24*(1-.05*TR('cast'))),0,1);
// 釣棚：浮標調淺、中、深（觸底）；每種魚有偏好水層，水層對了比較容易咬，差太多就很少咬（路亞、冰釣不受影響）
const LAYER_B=new Set(['lobster','prawn','maori','puffer','channel','flathead','clarias','mekong','eel','carp','crucian','blackcarp','grasscarp','arapaima','reba','burbot','grouper','grouper2','halibut','stingray','emperor','porgy','knifejaw','redbream','wrasse','laketrout','taimen','ghost','moonkoi','golden']);
const LAYER_S=new Set(['wahoo','tarpon','bluegill','crappie','tilapia','silvercarp','gar','spgar','mahi','sail','marlin','swordfish','skipjack','yellowfin','tuna','bigeye','flyfish','ribbon','amberjack','barracuda','sunfish','threadfin','sawara','amber','peacock']);
const layerOf=sp=>LAYER_B.has(sp.id)?2:LAYER_S.has(sp.id)?0:1, LAYER_N=['淺棚・水面','中層','深棚・觸底'];
window.__layerOf=layerOf; window.__LAYER_N=LAYER_N;
function layerK(sp){ const bt=G.baitUsed||BAITS[0]; if(bt.lure||G.loc==='ice'||sp.special) return 1; const d=Math.abs((save.depth==null?1:save.depth)-layerOf(sp)); return d===0?1.6:d===1?.9:.35; }
function pickSpecies(){
  const per=period(G.hour), pw=clamp((G.castDist-6)/30,0,1); let tot=0;
  const ws=SPECIES.map(sp=>{ const bt=G.baitUsed||BAITS[0]; const w=RAR[sp.rar].w*(sp.time[per]??1)*specialK(sp)*(1+sp.rar*(.35*pw+WL.rareB()+(G.hot?.3:0)+(window.__ECO&&window.__ECO.fxOn('luck')?.4:0)+(save.mer&&save.mer.n>=4?.1:0)+(save.mer&&save.mer.n>=10?.1:0)))*(1+sp.rar*G.luck*2)*(sp.rar>=5&&sp.special!=='mermaid'?1+(save.mer&&save.mer.n>=7?.15:0)+(save.mer&&save.mer.n>=13?.15:0):1)*(sp.tide&&window.__MOONPH?(.25+1.5*window.__MOONPH.illum()):1)*WL.spotAff(sp.id)*(sp.spots?(sp.spots.includes(WL.zoneId())?1:0):1)*WL.wxAff(sp.id)*(((sp.loc==='both'&&G.loc!=='ice')||(sp.loc||'lake')===(G.loc||'lake')||(G.loc==='ice'&&sp.ice))?1:0)*(G.loc==='sea'?1+sp.rar*.08*TR('sea'):1)*Math.pow(.12+.88*reachK(),sp.rar)/(1+.3*depNow(G.depK||'')*sp.rar)*(bt.aff[sp.id]||(bt.lure&&G.loc!=='ice'?0:1))*layerK(sp)*(window.__STORY?window.__STORY.boost(sp.id,(SPOTS[G.spot]||{}).id):1)*Math.max(.2,1+sp.rar*bt.rare*.5); tot+=w; return w; });
  let x=Math.random()*tot; for(let i=0;i<ws.length;i++){ x-=ws[i]; if(x<=0) return SPECIES[i]; } return SPECIES[0];
}

/* ---------- 動作 ---------- */
const PH=W.fishingPhysics;
function setPoint(v,p){ v.set(p.x,p.y,p.z); return v; }
function tackleSnag(hit,from){
  if(easy()){ G.snag=false; G.snagHit=null; G.timer=.25; return; }
  if(G.snag) return;
  G.snag=true; G.snagOnce=true; G.snagHit=hit; G.snagFrom=from.clone();
  G.snagYaw=G.yawT; G.snagStress=0; G.snagEase=0; G.timer=99;
  G.fd=null; G.sp=null; ambClear(); exitUW();
  toast('卡到'+hit.box.label+'！先放手卸力，再向側邊拖曳改變拉線角度；持續硬收會斷線','warn',3600); vib([40,40]);
}
function snagTick(dt){
  if(!G.snag) return;
  G.timer=99;
  const turn=Math.abs(G.yawT-G.snagYaw);
  G.snagStress=Math.max(0,(G.snagStress||0)+(G.held?dt*.65:-dt*.4));
  G.snagEase=!G.held&&turn>.22?(G.snagEase||0)+dt:0;
  rod.bendT=.18+G.snagStress*.6;
  if(G.snagStress>=1){ G.snag=false; G.snapped=true; G.state='lost'; G.stT=0; LURE.end(); Snd.snap(); toast('持續硬拉，釣組斷在障礙物上了','bad',2600); return; }
  if(G.snagEase>.8){
    // Back the hook out along its actual incoming path with a changed pull angle is required.
    const at=bob.position.clone(), back=G.snagFrom.clone().sub(at); back.y=0;
    if(back.lengthSq()<.01) back.set(Math.sin(G.head+(G.fishingYaw||0)+G.yawT),0,Math.cos(G.head+(G.fishingYaw||0)+G.yawT));
    back.normalize().multiplyScalar(.5); const q=PH.move(at,at.clone().add(back),.06);
    if(!q.contact){ setPoint(bob.position,q.pos); G.to.set(q.pos.x,0,q.pos.z); G.snag=false; G.snagHit=null; toast('釣組退出卡點了，換個角度收回再拋','good',2200); startRetrieve(); }
    else G.snagEase=0;
  }
}
function startCharge(){ if(SPOTS[G.spot].yacht&&G.boatStation==='helm'){switchBoatStation();return;} if(G.scareT>0){ toast('驚魂未定，等一下再拋竿…','warn',1400); return; } G.state='charge'; G.chargeT=0; G.aimYawCast=G.yawT; }
function cast(){
  G.practiceCast=practice.active();
  G.snag=false; G.snagHit=null; G.snagOnce=false; G.bottom=false; G.baitUsed=G.practiceCast?BAITS[0]:META.useBait(); G.noBait=false; LURE.bobberVis(!(G.baitUsed&&G.baitUsed.lure));
  const p=G.power, dist=G.practiceCast?7+p*3:6+p*META.gear().rod.cast;
  const A=G.practiceCast?0:G.head+(G.fishingYaw||0)+G.yaw, fw=tv.set(-Math.sin(A),0,-Math.cos(A)), bx=(G.angler||G.base).x, bz=(G.angler||G.base).z;
  let x=bx+fw.x*dist, z=bz+fw.z*dist;
  if(!G.practiceCast){x+=rand(-.6,.6);z+=rand(-.6,.6);}
  for(let k=0;k<14;k++){ const r=Math.hypot(x,z), maxR=W.shoreR(Math.atan2(x,-z))-6; if(r<=maxR) break; x=bx+(x-bx)*.9; z=bz+(z-bz)*.9; }
  if(G.spot===0&&z>-4.5) z=-4.5;
  G.to.set(x,0,z); G.castDist=Math.max(3,Math.hypot(x-bx,z-bz)); G.castDur=.55+G.castDist*.028; G.apex=1.2+G.castDist*.12;
  if(G.castDist<dist*.8)toast('前方岸線限制，落點約 '+Math.round(G.castDist)+' 米；轉向開闊水面可拋得更遠','warn',3200);
  G.castT=0; G.delay=.12; G.state='cast'; rod.pitchT=-.32; Snd.whoosh(); setPower(0);
}
function landBobber(){
  const landingHit=G.castHit; G.castHit=null;
  if(landingHit){ G.state='wait'; G.to.set(bob.position.x,0,bob.position.z); G.bottom=false; tackleSnag(landingHit,G.from); return; }
  if(G.baitUsed&&G.baitUsed.lure){ G.state='lure'; P.splash(G.to.x,0,G.to.z,10,.4); W.addRipple(G.to.x,G.to.z,.4); Snd.plop(); G.sp=null; G.fd=null; FUN.castTag(G.castDist); LURE.start(G.to,G.baitUsed,(G.angler||G.base)); return; }
  G.state='wait'; G.prawnDrag=0; G.prawnDone=false; P.splash(G.to.x,0,G.to.z,16,.7); W.addRipple(G.to.x,G.to.z,.55); Snd.plop();
  // 沉底釣：釣棚調到「深棚」又不是路亞時，鉛墜帶著餌沉到底，不看浮標、改看竿尖；結構區會有掛底風險
  G.bottom=!G.practiceCast&&save.depth===2&&!(G.baitUsed&&G.baitUsed.lure)&&G.loc!=='ice'; setTimeout(()=>{ if(G.state==='wait'&&!G.snag) ambStart(); },400); G.snag=false; G.snagMv=0; G.snagFlip=0; G.snagOnce=false;
  if(G.bottom&&!save.bottomTip){ save.bottomTip=1; persist(); setTimeout(()=>toast('🎣 沉底釣：沒有浮標，看竿尖——輕抖是試咬，竿尖被拉彎才揚竿','',3600),600); }
  G.timer=rand(6,15)*PER_WAIT[period(G.hour)]*(1-G.luck*.6)*(G.baitUsed?G.baitUsed.wait:1)*WL.waitK()*(window.__ECO&&window.__ECO.fxOn('glow')?.6:1)*(1+.2*depNow(depKey())); G.nib=Math.floor(rand(0,3.99)); G.approach=0; G.sp=null; G.fd=null;
  FUN.castTag(G.castDist);
  if(G.practiceCast){G.timer=2.2;G.nib=0;G.hot=false;return;}
  // 魚的警戒：同一個地方連續打水、或直接砸進魚群，附近的魚會警戒一陣子（咬口變慢），之後慢慢恢復
  const now=performance.now()/1000, near=G.lastLand&&Math.hypot(G.to.x-G.lastLand.x,G.to.z-G.lastLand.z)<3&&now-G.lastLand.t<25;
  G.spook=Math.min(1.5,(G.spook||0)+(near?.35:0)); G.lastLand={x:G.to.x,z:G.to.z,t:now};
  const hh=FUN.hotHit?FUN.hotHit(G.to):null;
  if(hh==='center'||near){ SCH.scare(G.to.x,G.to.z,14); ambScare(G.to.x,G.to.z); G.spookAt={x:G.to.x,z:G.to.z}; setTimeout(()=>{ if(G.state==='wait') SCH.burst(G.to.x,G.to.z,hh==='center'?14:9); },180); }   // 水面看得到：一群小魚從落點炸開跳逃
  if(hh==='center'){ G.hot=false; G.spook=Math.min(1.5,G.spook+.6); toast('💦 砸進魚群正中間，魚嚇散了！要拋在魚群前方','warn',2400); }
  else { G.hot=FUN.inHot(G.to); if(G.hot){ G.timer*=.3; toast('正中魚群！','good',1200); } }
  if(G.spook>.01){ G.timer*=1+G.spook; if(G.spook>.5&&hh!=='center') toast('水面太吵，附近的魚有點警戒；等一下或換個落點','warn',2200); }
}
/* ===== 餌附近的水下魚：拋竿後落點周圍有幾尾真的在游的魚；之後來咬的就是其中一尾（同魚種就用牠，否則從遠處游進來），
   試咬時會衝向餌又退開、咬住時直接吞下；揚竿錯過或受驚時游走 ===== */
const AMB={list:[],app:null};
function ambMake(sp,L){ let f=null; try{ if(window.__MDL&&window.__MDL.fishReady(sp.id)) f=window.__MDL.fish(sp); }catch(e){} if(!f) return null;
  f.group.scale.setScalar(L); seeThrough(f.group); W.scene.add(f.group);
  // 每尾魚自己對這次的餌有多少興趣：魚餌偏好 × 水層對不對
  const bt=G.baitUsed||BAITS[0], aff=bt.aff&&bt.aff[sp.id]!=null?bt.aff[sp.id]:1, lay=layerK(sp), want=Math.min(2,aff)*lay;
  return {f,sp,L,pos:new THREE.Vector3(),h:Math.random()*6.28,sp0:rand(.25,.55),dep:rand(.45,1.1),wt:0,flee:0,want,aff,lay,insp:0}; }
function ambStart(){ ambClear(); if(G.loc==='ice'||(G.baitUsed&&G.baitUsed.lure)) return; const n=Math.floor(rand(2,4.99)), seen={};
  for(let i=0;i<n;i++){ const sp=pickSpecies(); if(!sp||sp.special||seen[sp.id]) continue; seen[sp.id]=1; const L=lerp(sp.len[0],sp.len[1],Math.random()*.7)/100, a=ambMake(sp,L); if(!a) continue;
    const ang=rand(0,6.28), r=rand(2.2,6); a.pos.set(G.to.x+Math.cos(ang)*r,-a.dep,G.to.z+Math.sin(ang)*r); setPoint(a.pos,PH.resolve(a.pos,Math.max(.1,L*.22))); AMB.list.push(a); } }
function ambClear(){ AMB.told=false; AMB.inspT=null; AMB.list.forEach(a=>{ a.f.group.visible=false; W.submerged.remove(a.f.group); if(a.f.group.parent) a.f.group.parent.remove(a.f.group); }); AMB.list=[]; AMB.app=null; }
function ambScare(x,z){ AMB.list.forEach(a=>{ a.flee=3; a.h=Math.atan2(a.pos.z-z,a.pos.x-x); }); }
function ambUpdate(dt){ if(!AMB.list.length) return; if(G.state!=='wait'&&G.state!=='bite'){ ambClear(); return; }
  // 巡游的魚會輪流過來看餌：有興趣的在旁邊多待（咬口來得快一點）；沒興趣的看一眼就走，並告訴玩家可能的原因（每次拋竿最多提示一次）
  AMB.inspT=(AMB.inspT==null?rand(4,7):AMB.inspT)-dt;
  if(AMB.inspT<=0&&G.state==='wait'){ AMB.inspT=rand(6,10); const c=AMB.list.filter(a=>a!==AMB.app&&!a.flee&&!a.insp); if(c.length){ const a=c[Math.floor(Math.random()*c.length)]; a.insp=5; } }
  AMB.list.forEach(a=>{ if(!(a.insp>0)) return; a.insp-=dt; const dx=G.to.x-a.pos.x, dz=G.to.z-a.pos.z, d=Math.hypot(dx,dz);
    if(a.insp>2.2){ a.ht=Math.atan2(dz,dx); a.wt=1; }
    else if(!a.judged){ a.judged=true;
      if(a.want>=1.1){ a.insp=0; if(G.state==='wait'&&G.timer>2) G.timer=Math.max(1.5,G.timer-2); }   // 有興趣：留在附近，咬口提早
      else { a.ht=a.h+Math.PI; a.wt=3; a.sp0=.9;
        if(!AMB.told){ { const fx=G.to.x, fz=G.to.z; W.addRipple(fx+.25,fz+.15,.35); setTimeout(()=>W.addRipple(fx+.1,fz-.2,.25),250); G.inspDip=.5; let k=0; const away=Math.random()*6.28, iv=setInterval(()=>{ k++; W.addRipple(fx+Math.cos(away)*k*.45,fz+Math.sin(away)*k*.45,.16); if(k>6) clearInterval(iv); },140); }   // 浮標旁一個漩渦、浮標被碰得晃一下，接著一道小水痕往外離開
          AMB.told=true; const why=a.lay<.9?`牠常在「${window.__LAYER_N[layerOf(a.sp)]}」，試試調整釣棚`:a.aff<.8?'牠對這個餌興趣不大，換個餌試試':'牠今天有點警戒';
          toast(`🐟 一尾${a.sp.name}靠近看了看又走了——${why}`,'',3200); } } } });
  // 決定要來咬的那一尾：同魚種就用水裡那條，不然從遠處游一條進來
  if(G.fd&&!G.fd.item&&!AMB.app&&G.nib===0&&G.timer<3.5){ let a=AMB.list.find(q=>q.sp.id===G.fd.sp.id&&!q.flee);
    if(!a){ a=ambMake(G.fd.sp,G.fd.L); if(a){ const ang=rand(0,6.28); a.pos.set(G.to.x+Math.cos(ang)*7,-.9,G.to.z+Math.sin(ang)*7); AMB.list.push(a); } }
    else { a.L=G.fd.L; a.f.group.scale.setScalar(G.fd.L); } AMB.app=a; }
  const bait=tv2.set(G.to.x,G.bottom?-1.1:-.35,G.to.z);
  AMB.list.forEach(a=>{ const old=a.pos.clone(); let sp=a.sp0, ty=-a.dep;
    if(a.flee>0){ a.flee-=dt; sp=2.6; ty=-1.6; a.f.group.visible=a.flee>.4; }
    else if(a===AMB.app){ const dx=bait.x-a.pos.x, dz=bait.z-a.pos.z, d=Math.hypot(dx,dz);
      const want=G.state==='bite'?0:G.dip>0?.05:(G.timer<1.2?.35:.9);   // 試咬時衝到嘴邊，平常在餌旁邊繞
      const th=Math.atan2(dz,dx)+(d<want+.2&&G.dip<=0&&G.state!=='bite'?1.4:0); let dh=th-a.h; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); a.h+=dh*Math.min(1,dt*3);
      sp=d>want?Math.min(1.6,.4+d*.5):.15; ty=bait.y; if(G.state==='bite'){ a.pos.lerp(bait,Math.min(1,dt*6)); sp=0; } }
    else { a.wt-=dt; if(a.wt<=0){ a.wt=rand(1.5,4); a.ht=a.h+rand(-1.2,1.2); const dx=G.to.x-a.pos.x, dz=G.to.z-a.pos.z; if(Math.hypot(dx,dz)>7) a.ht=Math.atan2(dz,dx); } if(a.ht!==undefined) a.h+=(a.ht-a.h)*Math.min(1,dt*.8); }
    a.pos.x+=Math.cos(a.h)*sp*dt; a.pos.z+=Math.sin(a.h)*sp*dt; a.pos.y+=(ty-a.pos.y)*Math.min(1,dt*1.5);
    const q=PH.move(old,a.pos,Math.max(.1,a.L*.22)); setPoint(a.pos,q.pos); if(q.contact){ a.h+=Math.PI*.5; a.ht=a.h; }
    const g=a.f.group; g.position.copy(a.pos); g.rotation.set(0,-a.h,0); a.f.uni.uSwim.value+=dt*(4+sp*7); a.f.uni.uAmp.value=.04+.05*Math.min(1,sp); });
  if(G.state==='bite'&&AMB.app){ /* 咬住：那條魚就在餌上 */ } }
// 水面距離標記：在浮標／入水點／路亞／搏魚中的魚的位置標一個小點和距離（像真實釣魚時估落點），手機上一眼知道線在多遠
const DMK=document.createElement('div'); DMK.style.cssText='position:fixed;z-index:4;pointer-events:none;transform:translate(-50%,-130%);color:#f4f8fa;font:600 12px/1 system-ui,sans-serif;text-shadow:0 1px 3px #000,0 0 6px rgba(0,0,0,.6);display:none;text-align:center';
DMK.innerHTML='<span></span><div style="width:6px;height:6px;border-radius:50%;background:#fff;margin:3px auto 0;box-shadow:0 0 6px rgba(255,255,255,.9)"></div>'; document.body.appendChild(DMK); const DMKt=DMK.querySelector('span'), DMV=new THREE.Vector3();
function updDistMark(){ const st=G.state; let p=null;
  if(st==='wait'||st==='bite') p=G.bottom&&G.entry?G.entry:bob.position; else if(st==='lure'&&LURE.active()) p=LURE.pos(); else if(st==='fight'&&G.f){ fishPos(DMV,0); p=DMV; }
  if(!p||document.body.classList.contains('sheetOn')||UW.active()){ DMK.style.display='none'; return; }   // 水下鏡頭時不顯示水面距離
  const d=Math.hypot(p.x-(G.angler||G.base).x,p.z-(G.angler||G.base).z); DMV.set(p.x,(p.y||0)+.05,p.z).project(W.camera); if(DMV.z>1){ DMK.style.display='none'; return; }
  DMK.style.display='block'; DMK.style.left=((DMV.x+1)/2*innerWidth)+'px'; DMK.style.top=((1-DMV.y)/2*innerHeight)+'px'; DMKt.textContent=d.toFixed(d<10?1:0)+' 米'; }
// 收線：浮標貼著水面被拖回來，到竿尖前方約一公尺才離水提起；以前是從落點直接沿直線飛到竿尖，整段懸在空中
function startRetrieve(msg,cls){ const tip=rod.tipW, b=bob.position, ang=G.angler||G.base, hx=tip.x-ang.x, hz=tip.z-ang.z, hl=Math.hypot(hx,hz)||1;
  const near=new T.Vector3(tip.x+hx/hl*.9,.03,tip.z+hz/hl*.9), from=new T.Vector3(b.x,.03,b.z);
  if(b.y<.5&&from.distanceTo(near)>1.2){ const surf=PH.route(near,from,.085).slice().reverse().map(p=>new T.Vector3(p.x,.03,p.z)); surf[0].copy(b); G.retrievePath=[...surf,tip.clone()]; G.retrieveLift=G.retrievePath.length-1; }
  else { G.retrievePath=PH.route(rod.tipW,bob.position,.085).slice().reverse().map(p=>new T.Vector3(p.x,p.y,p.z)); G.retrieveLift=1; }
  G.retrieveNode=1;G.retrieveClock=0; exitUW(); G.fd=null; G.sp=null; if(msg) toast(msg,cls); G.state='retrieve'; G.stT=0; G.from.copy(bob.position); P.shadow.material.opacity=0; }
function nibble(){ const big=Math.random()<.25; G.dip=big?.75:.28; G.dipMax=G.dip; G.dipAmp=big?.14:.035; W.addRipple(G.to.x,G.to.z,big?.5:.18); if(big){ P.splash(G.to.x,0,G.to.z,5,.35); Snd.bite(); vib([40,30,60]); } else { Snd.nibble(); vib(12); } G.approach=Math.max(G.approach,.01); }
// 體型等級：u 是這條魚在該魚種體型範圍內的位置（0 最小、1 最大，巨物可再超出）
const GRADES=[[.2,'幼魚'],[.7,'成魚'],[.93,'大物'],[9,'巨物']];
const gradeOf=u=>GRADES.find(g=>u<g[0])[1];
const MERTEST=/[?&]mertest=1/.test(location.search);
const FORCE_FISH=(location.search.match(/[?&]fish=([a-z0-9_]+)/)||[])[1];   /* 測試：?fish=魚的代號（例如 sail）每次咬餌都是那種魚，搏魚照正常規則（用來實測線長、拉力） */
function prepFish(){
  if(G.practiceCast){const sp=SPECIES.find(q=>q.id==='bluegill');G.sp=sp;G.fd={sp,L:.18,w:.19,u:.35,grade:'B',lvl:1,value:7,xpMul:1,practice:true};return;}
  if(MERTEST){ const sp=SPECIES.find(q=>q.special==='mermaid'); if(sp){ G.sp=sp; G.fd={sp,L:1.7,w:55,u:.5,grade:'A',lvl:1,value:500,xpMul:1}; return; } }   /* 美人魚測試網址：每一次咬餌都是美人魚 */ const wantPin=window.__STORY&&window.__STORY.wants('hairpin')&&WL.zoneId()==='lily'&&period(G.hour)==='night';
  if(wantPin&&Math.random()<.45){ const it=ITEMS_BY('hairpin'); if(it){ G.sp=FUN.ITEM_SP; G.fd={sp:FUN.ITEM_SP,item:it,L:it.size,w:it.w,lvl:1,value:0,xpMul:1}; return; } }
  if(!FORCE_FISH&&Math.random()<.085*(window.__STORY&&window.__STORY.needs('item')?2:1)){ const it=FUN.rollItem(); G.sp=FUN.ITEM_SP; G.fd={sp:FUN.ITEM_SP,item:it,L:it.size,w:it.w*rand(.85,1.15),lvl:1,value:Math.round(it.val*rand(.8,1.25)),u:.5,xpMul:0}; return; }
  G.depK=depKey(); const sp=(FORCE_FISH&&SPECIES.find(q=>q.id===FORCE_FISH))||pickSpecies(), pw=clamp((G.castDist-6)/30,0,1), seaK=(G.loc||'lake')==='sea'?.62:1, u=Math.pow(Math.random(),(1.6-.5*pw)/WL.sizeB()*(1+(1-reachK())*1.2+.15*depNow(G.depK))*seaK);   // 海裡的魚個頭普遍偏大
  const big=u>.96?1+(u-.96)/.04*.15:1, L=lerp(sp.len[0],sp.len[1],u)/100*big, w=sp.k*L*L*L*rand(.9,1.12);
  G.sp=sp; G.fd={sp,L,w,u,grade:gradeOf(u),lvl:Math.round(lerp(sp.lvl[0],sp.lvl[1],u)),value:Math.round(sp.price*Math.pow(w+.3,.85)*RAR[sp.rar].mult*D().rew*.4*(window.__ECO?window.__ECO.priceMul(sp.id):1)),xpMul:D().rew}; if(window.__TAL) window.__TAL.applyBoss(G,SPECIES,RAR); }
function bite(){ if(!G.fd) prepFish(); UW.bite(); G.state='bite'; G.biteT=0; FUN.hookStart(G.fd); W.addRipple(G.to.x,G.to.z,.75); P.splash(G.to.x,0,G.to.z,8,.5); Snd.bite(); vib([60,40,60]); }
// 沒揚到竿：魚大多會把餌吃掉，沒餌就不會再有魚咬，要收線重新上餌（路亞不會被吃掉）
function missBite(){ if(easy()&&G.fd&&!G.fd.practice){ FUN.hookEnd(); hook(true); return; } const lastFd=G.fd; FUN.hookEnd(); if(AMB.app){ AMB.app.flee=3; AMB.app.h+=Math.PI; AMB.app=null; }
  G.combo=0; FUN.combo(0); G.state='wait'; G.sp=null; G.fd=null; exitUW(); vib(40);
  if(G.practiceCast){G.timer=1.8;G.nib=0;toast('這次錯過了。等下一次浮標下沉，再點「起鉤」。','warn',1700);return;}
  G.timer=rand(4,9);G.nib=Math.floor(rand(0,2.99));toast('太晚了：等浮標下沉、量表亮起就起鉤','warn',1800);
  const lost=fd0=>{ const id=G.baitUsed&&G.baitUsed.id, base={corn:.35,worm:.45,shrimp:.5,live:.3}[id]??.45, sty=fd0?SP_STY[fd0.sp.id]:'';
    return Math.max(.15,Math.min(.75,base+(sty==='nibbler'?.15:sty==='brawler'||sty==='runner'?-.1:0))); };
  if(!(G.baitUsed&&G.baitUsed.lure)){ if(Math.random()<lost(lastFd)){ G.noBait=true; G.stealT=1.6; setTimeout(()=>toast('餌被吃掉了，收線重新上餌','warn',2400),300); } else setTimeout(()=>toast('魚跑了，餌還在','',1600),300); } }
function hook(q){
  const sp=G.sp, L=G.fd.L; exitUW(); ambClear();
  const perfect=!!q; if(perfect){ save.perf=(save.perf||0)+1; if(window.__STORY) window.__STORY.onPerfect(); }
  G.f={perfect,hq:perfect?1:.7,drag:dragV(),cover:0,abr:0,coverSide:Math.random()<.5?-1:1,d:G.loc==='ice'?rand(10,18):G.castDist,az0:Math.atan2(-(G.to.x-(G.angler||G.base).x),-(G.to.z-(G.angler||G.base).z)),theta:0,latDir:0,run:true,phaseT:rand(.8,1.6),stam:perfect?85:100,T:.3,brk:0,slk:0,jumpT:0,jumpDur:1,ripT:0,vibT:0,clickA:0};
  if(G.fd.practice){G.f.stam=perfect?46:54;G.f.phaseT=.65;}
  G.f.pos=G.to.clone(); G.f.pos.y=-.35; setPoint(G.f.pos,PH.resolve(G.f.pos,Math.max(.12,L*.22)));
  G.state='fight'; P.splash(G.to.x,0,G.to.z,22,1); W.addRipple(G.to.x,G.to.z,.7); Snd.splash(.7); vib(40);
  toast(perfect?'完美揚竿！':'上鉤了！',perfect?'good':'',1200);
  ui.fight.classList.remove('hidden'); WL.onHook(G.fd,()=>fishPos(G.chaseV,0));
  SEA.onHook(G.fd,()=>fishPos(G.chaseV,0));
  const fish=G.fd.item?FUN.itemFish(G.fd.item):P.getFish(sp); G.fish=fish; fish.group.scale.setScalar(L); fish.group.visible=false; if(!fish.group.parent) W.scene.add(fish.group); seeThrough(fish.group);
  if(G.fd.boss&&window.__TAL) window.__TAL.bossIntro(G,b=>{ P.splash(G.to.x,0,G.to.z,70,2.4); W.addRipple(G.to.x,G.to.z,1.6); Snd.splash(2.2); if(G.loc!=='ice') setTimeout(()=>{ if(G.state==='fight'&&G.f) startJump(); },500); });
}
function fishPos(out,y){ const f=G.f; if(f.pos) out.copy(f.pos); else { const az=f.az0+f.theta; out.set((G.angler||G.base).x-Math.sin(az)*f.d,0,(G.angler||G.base).z-Math.cos(az)*f.d); } out.y=y; if(G.loc==='ice'&&window.__ICE){ const hp=window.__ICE.holePos(); out.x=hp.x; out.z=hp.z; } return out; }
function surgeFish(){ const f=G.f; if(!f.pos) return; const az=f.az0+f.theta, want=new T.Vector3((G.angler||G.base).x-Math.sin(az)*f.d,f.pos.y,(G.angler||G.base).z-Math.cos(az)*f.d); setPoint(f.pos,PH.move(f.pos,want,Math.max(.12,G.fd.L*.22)).pos); }
function sizeWord(w){ return w<.6?'小傢伙':w<2.5?'中型魚':w<8?'大魚！':'巨物！！'; }
const SNAG={g:new THREE.Group()}; // Kept for existing UI cleanup.
// 魚訊放大視窗：等魚時在右上角放大顯示浮標（浮標釣）或竿尖（沉底釣），小螢幕也看得清楚試咬與咬口
const MAG=document.createElement('div'); MAG.id='magWin'; MAG.style.cssText='position:fixed;right:10px;top:calc(var(--hudY,150px) + 54px);z-index:6;width:74px;height:96px;border-radius:12px;background:rgba(10,30,40,.62);border:1px solid rgba(255,255,255,.22);display:none;pointer-events:none;overflow:hidden';
// 放大視窗裡的浮標：用和 3D 浮標同一份外形與配色畫出立體感（左右明暗、清漆高光），不再是平面圖示
function floatImage(){ const P0=window.__FLOAT_PROFILE||[[0,-.095],[.028,0],[.004,.06]], S=560, H=.27, cv=document.createElement('canvas'); cv.width=60; cv.height=Math.round(H*S); const g=cv.getContext('2d'), cx=30, Y=y=>(.17-y)*S;
  const col=y=>{ const v=(y+.095)/.157; return v<.18?'#1d2a22':v<.2?'#c9a24a':v<.58?'#141414':v<.6?'#e8d27a':'#ff4a12'; };
  const rAt=y=>{ for(let i=1;i<P0.length;i++){ const [r0,y0]=P0[i-1],[r1,y1]=P0[i]; if(y>=y0&&y<=y1) return r0+(r1-r0)*(y-y0)/Math.max(1e-6,y1-y0); } return 0; };
  for(let py=0;py<cv.height;py++){ const y=.17-py/S; let r=0, c; if(y<=.062){ r=rAt(y); c=col(y); } else { r=.0035; const k=(y-.06)/.125; c=k<.24?'#ff3b10':k<.44?'#d8ff2a':k<.64?'#ff3b10':k<.8?'#f4f4f0':'#ff3b10'; if(y>.185){ r=.0055*Math.sqrt(Math.max(0,1-((y-.19)/.0055)**2)); c='#fff080'; } }
    const w=r*S; if(w<.3) continue; const gr=g.createLinearGradient(cx-w,0,cx+w,0); gr.addColorStop(0,'rgba(0,0,0,.9)'); gr.addColorStop(.12,c); gr.addColorStop(.38,c); gr.addColorStop(.48,'rgba(255,255,255,.85)'); gr.addColorStop(.58,c); gr.addColorStop(1,'rgba(0,0,0,.95)');
    g.fillStyle=c; g.fillRect(cx-w,py,w*2,1); g.globalAlpha=.55; g.fillStyle=gr; g.fillRect(cx-w,py,w*2,1); g.globalAlpha=1; }
  return {url:cv.toDataURL(),w:cv.width,h:cv.height,wl:Math.round(.17*S)}; }
const FIMG=floatImage();
MAG.innerHTML=`<svg viewBox="0 0 74 96" width="74" height="96"><defs><linearGradient id="mw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f7f8c" stop-opacity=".9"/><stop offset="1" stop-color="#0b2c36" stop-opacity=".95"/></linearGradient><linearGradient id="ms" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb7c2"/><stop offset="1" stop-color="#55707c"/></linearGradient></defs>
<rect x="0" y="0" width="74" height="58" fill="url(#ms)" opacity=".55"/>
<g id="magF"><image href="${FIMG.url}" x="${37-FIMG.w/4}" y="${58-FIMG.wl/2}" width="${FIMG.w/2}" height="${FIMG.h/2}"/></g>
<rect x="0" y="58" width="74" height="38" fill="url(#mw)"/><ellipse id="magRip" cx="37" cy="58" rx="9" ry="1.6" fill="none" stroke="rgba(230,250,255,.75)" stroke-width="1"/><line x1="0" y1="58" x2="74" y2="58" stroke="rgba(220,245,255,.55)" stroke-width="1"/>
<g id="magRod" style="display:none"><path id="magR1" d="" stroke="#1a1c20" stroke-width="4.2" fill="none" stroke-linecap="round"/><path id="magR2" d="" stroke="#22252a" stroke-width="3" fill="none" stroke-linecap="round"/><path id="magR3" d="" stroke="#f4f4f0" stroke-width="2" fill="none" stroke-linecap="round"/>
<path id="magRh" d="" stroke="rgba(255,255,255,.28)" stroke-width="1" fill="none" transform="translate(-.8 0)"/>
<circle id="magG0" r="2.4" fill="none" stroke="#a9adb3" stroke-width=".9"/><circle id="magG1" r="2" fill="none" stroke="#a9adb3" stroke-width=".8"/><circle id="magG2" r="1.6" fill="none" stroke="#a9adb3" stroke-width=".7"/><circle id="magG3" r="1.3" fill="none" stroke="#a9adb3" stroke-width=".6"/><circle id="magTip" r="1.6" fill="#ff5a1f"/></g></svg><div id="magT" style="position:absolute;left:0;right:0;bottom:3px;text-align:center;font-size:10px;color:#dff;text-shadow:0 1px 2px #000"></div>`;
document.body.appendChild(MAG); const magF=MAG.querySelector('#magF'), magT=MAG.querySelector('#magT');
function updMag(){ const magOn=save.mag==='on'||(save.mag!=='off'&&(D().n==='休閒'||D().n==='標準')); const on=(G.state==='wait'||G.state==='bite')&&!LURE.active?.()&&G.loc!=='ice'&&magOn; MAG.style.display=on?'block':'none'; if(!on) return;
  if(G.bottom){ magF.style.display='none'; const b=Math.min(1.2,rod.bendT||0), x2=37+b*24, y2=14+b*52, cx=37, cy=46;
    const qp=t=>{ const u=1-t; return [u*u*37+2*u*t*cx+t*t*x2, u*u*96+2*u*t*cy+t*t*y2]; };
    let d=''; const seg=(t0,t1)=>{ const a=qp(t0), m=qp((t0+t1)/2), c=qp(t1); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${(2*m[0]-(a[0]+c[0])/2).toFixed(1)} ${(2*m[1]-(a[1]+c[1])/2).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`; };
    MAG.querySelector('#magR1').setAttribute('d',seg(0,.45)); MAG.querySelector('#magR2').setAttribute('d',seg(.45,.82)); MAG.querySelector('#magR3').setAttribute('d',seg(.82,1));
    MAG.querySelector('#magRh').setAttribute('d',seg(.05,.8));
    [.3,.55,.74,.9].forEach((t,i)=>{ const p=qp(t), gd=MAG.querySelector('#magG'+i); gd.setAttribute('cx',(p[0]+.8).toFixed(1)); gd.setAttribute('cy',p[1].toFixed(1)); });
    const tp=qp(1); MAG.querySelector('#magTip').setAttribute('cx',tp[0].toFixed(1)); MAG.querySelector('#magTip').setAttribute('cy',tp[1].toFixed(1));
    MAG.querySelector('#magRod').style.display=''; magT.textContent=G.state==='bite'?'竿尖拉彎！':G.snag?'掛底':'竿尖'; magT.style.color=G.state==='bite'?'#ffd060':'#dff'; }
  else { MAG.querySelector('#magRod').style.display='none'; magF.style.display=''; const dip=G.state==='bite'?34:Math.max(0,(W.swell(G.to.x,G.to.z,G.t)-bob.position.y))*160; magF.setAttribute('transform',`translate(0 ${Math.min(40,dip).toFixed(1)})`); { const rp=MAG.querySelector('#magRip'); if(rp){ const k=Math.min(1,dip/14); rp.setAttribute('rx',(6+k*16+Math.sin(G.t*3)*.6).toFixed(1)); rp.setAttribute('opacity',(.35+.6*k).toFixed(2)); } } magT.textContent=G.state==='bite'?'沉下去了！':G.dip>0?'輕點（試咬）':'浮標'; magT.style.color=G.state==='bite'?'#ffd060':'#dff'; } }
// 搏魚臨場感：魚衝刺時水面拖出 V 形水痕、線繃緊時入水點甩出細水珠（距離標示原本就有）
const WKV=new THREE.Vector3();
// 搏魚鏡頭：中魚後視角微微拉近、略往水面看；張力越大拉得越近；魚躍出水面時再拉近並輕晃。結束後平滑回到原本
G.fovK=G.fovK||1;
function fightBody(dt){ const f=G.f, fight=G.state==='fight'&&f; G.lean=G.lean||{z:0,y:0,r:0};
  const tz=fight?(f.run?-.07*(.5+f.T):(G.held?.05*f.T:0)):0, ty=fight?-.03*f.T:0, tr=fight?clamp((f.theta||0)*.06,-.05,.05):0;
  G.lean.z+=(tz-G.lean.z)*Math.min(1,dt*4); G.lean.y+=(ty-G.lean.y)*Math.min(1,dt*4); G.lean.r+=(tr-G.lean.r)*Math.min(1,dt*3);
  W.head.position.z=G.lean.z; W.head.position.y=(W.head.userData.y0??(W.head.userData.y0=W.head.position.y))+G.lean.y; W.camera.rotation.z+=G.lean.r; }
function fightCam(dt){ try{ fightBody(dt); }catch(e){} const f=G.f, fight=G.state==='fight'&&f, want=fight?(.86-.08*(f.T||0)-(f.jumpT>0?.08:0)):(G.state==='land'?.9:1);
  G.fovK+=(want-G.fovK)*Math.min(1,dt*(fight?2.2:1.5)); const base=W.camera.aspect<1?70:52, nf=base*G.fovK; if(Math.abs(W.camera.fov-nf)>.05){ W.camera.fov=nf; W.camera.updateProjectionMatrix(); }
  document.body.classList.toggle('fighting',!!fight);
  if(fight&&f.jumpT>0){ G.gShake=Math.max(G.gShake||0,.35); } }
function fightFx(dt){ fightCam(dt); const f=G.f; if(G.state!=='fight'||!f){ if(Snd.reelLoop) Snd.reelLoop(G.state==='retrieve'?.22:0,1.25); return; } fishPos(WKV,0);
  f.wk=(f.wk||0)-dt; if(f.run&&f.wk<=0){ f.wk=.09; const az=f.az0+f.theta, sx=Math.cos(az), sz=-Math.sin(az); W.addRipple(WKV.x+sx*.25,WKV.z+sz*.25,.18); W.addRipple(WKV.x-sx*.25,WKV.z-sz*.25,.18); }
  if(f.T>.6&&Math.random()<dt*(f.T-.5)*12) P.splash(WKV.x,.05,WKV.z,2,.12);
  // 聲音：張力很大時竿身吱嘎作響；魚在水面衝刺時有破水聲
  { const out=f.run&&f.T>.3, vol=G.held?.32:out?.45*f.T+.12:0, rate=G.held?.85+.35*(1-f.T):out?1.5+.6*f.T:1; f.usedLoop=Snd.reelLoop&&Snd.reelLoop(vol,rate); }
  f.ck=(f.ck||0)-dt; if(f.T>.72&&f.ck<=0){ f.ck=rand(.35,.9)*(1.4-f.T); Snd.creak&&Snd.creak(f.T); }
  f.sw=(f.sw||0)-dt; if(f.run&&f.d<18&&f.sw<=0){ f.sw=rand(.5,1.1); Snd.splash&&Snd.splash(.18+.25*f.T); } }
/* ===== 抄網：鋁合金網框＋會下垂的網袋（打結網目貼圖、半透明）＋伸縮手把。按下抄網後：網子從右下伸出→探進水裡到魚底下→
   魚被兜進網袋→整網提出水面（網袋被魚的重量拉垂、一路滴水）→拉到眼前 ===== */
const NET=(()=>{ const g=new THREE.Group(); g.visible=false; W.scene.add(g);
  const cv=document.createElement('canvas'); cv.width=cv.height=64; const c2=cv.getContext('2d'); c2.clearRect(0,0,64,64); c2.strokeStyle='rgba(30,34,30,.95)'; c2.lineWidth=2.2;
  for(let i=-64;i<128;i+=11){ c2.beginPath(); c2.moveTo(i,0); c2.lineTo(i+64,64); c2.stroke(); c2.beginPath(); c2.moveTo(i+64,0); c2.lineTo(i,64); c2.stroke(); }
  const mt=new THREE.CanvasTexture(cv); mt.wrapS=mt.wrapT=THREE.RepeatWrapping; mt.repeat.set(6,3);
  const meshMat=new THREE.MeshStandardMaterial({map:mt,alphaTest:.35,transparent:true,side:THREE.DoubleSide,roughness:.9,color:0x3c4338});
  const alu=new THREE.MeshStandardMaterial({color:0xb9bec4,metalness:.9,roughness:.3}), grip=new THREE.MeshStandardMaterial({color:0x1d1e21,roughness:.85});
  const hoop=new THREE.Mesh(new THREE.TorusGeometry(.5,.012,8,40),alu); hoop.rotation.x=Math.PI/2; g.add(hoop);
  const bagG=new THREE.CylinderGeometry(.5,.1,.7,24,6,true); bagG.translate(0,-.35,0); const bag=new THREE.Mesh(bagG,meshMat); g.add(bag);
  const bp=bagG.attributes.position, b0=Float32Array.from(bp.array);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.016,.02,2.4,10),alu); handle.rotation.z=Math.PI/2; handle.position.set(1.7,0,0); g.add(handle);
  const hg=new THREE.Mesh(new THREE.CylinderGeometry(.024,.024,.5,10),grip); hg.rotation.z=Math.PI/2; hg.position.set(2.7,0,0); g.add(hg);
  // 網袋形狀：sag 0~1 被魚拉垂的程度，sw 擺動
  function shape(sag,sw){ for(let i=0;i<bp.count;i++){ const x=b0[i*3], y=b0[i*3+1], z=b0[i*3+2], k=-y/.7; bp.setXYZ(i,x+Math.sin(sw)*.08*k,y-sag*.35*k*k,z+Math.cos(sw*1.3)*.05*k); } bp.needsUpdate=true; }
  return {g,shape}; })();
function endFightUI(){ SNAG.g.visible=false; if(ui.netBtn) ui.netBtn.classList.add('hidden'); ui.fight.classList.add('hidden'); ui.steer.classList.add('hidden'); ui.tBar.classList.remove('danger'); ui.tBar.classList.remove('slack'); ui.tBar.classList.remove('rub'); }
function lose(reason){ if(easy()&&G.fd&&G.f){ G.f.lostWhy=null; land(); return; } if(MERTEST&&G.fd&&G.fd.sp&&G.fd.sp.special==='mermaid'&&G.state==='fight'){ if(G.f){ G.f.brk=0; G.f.slk=0; G.f.abr=0; G.f.lostWhy=null; } return; }   /* 美人魚測試：任何原因都不會跑掉 */
  endFightUI(); WL.endChase(); SEA.endChase(); G.combo=0; FUN.combo(0); P.shadow.material.opacity=0; if(G.fish){ G.fish.group.visible=false; }
  if(reason==='gator'||reason==='shark'){ fishPos(tv,0); P.splash(tv.x,0,tv.z,60,1.6); W.addRipple(tv.x,tv.z,1.2); Snd.splash(1.5); Snd.gator(); biteFX(reason); }
  const msg={snap:'啪！線斷了……',slack:'線太鬆，魚脫鉤了',spool:'線放光了，魚跑掉了',gator:'鱷魚把你的魚搶走了！',shark:'鯊魚把你的魚咬走了！',shook:'魚甩頭，把鉤甩掉了',jump:'魚在空中甩脫了鉤',rub:'線在障礙物上磨斷了……'}[reason];
  // 失敗原因與改善方法：慢一點跳出，讓玩家知道下次怎麼做
  const tip={snap:'原因：張力在紅區停太久。改善：魚衝刺時先放手，或把洩力調「鬆」。',slack:'原因：魚停下時線鬆太久。改善：魚一停就按住收線。',spool:'原因：魚跑太遠把線放光。改善：魚停下時趁機收線，或把洩力調「緊」一點。',
    gator:'原因：搏魚拖太久引來鱷魚。改善：張力保持在綠黃區、加快收線。',shark:'原因：搏魚拖太久引來鯊魚。改善：張力保持在綠黃區、加快收線。',
    shook:'原因：揚竿不夠準＋甩頭時線鬆。改善：浮標「沉下去」的瞬間揚竿；魚甩頭時保持收線。',jump:'原因：魚跳起時還在硬拉。改善：看到魚躍出水面先放手。',rub:'原因：魚鑽進結構物，線一直在上面磨。改善：看到警告就往反方向控竿；換粗一點的線，或帶鋼絲前導線。'}[reason];
  if(tip) setTimeout(()=>toast('💡 '+tip,'',4200),1900);
  if(reason==='snap'){ Snd.snap(); vib([80,40,120]); toast(msg,'bad',1800); G.state='lost'; G.stT=0; G.snapped=true; bob.visible=false; rod.bendT=0; rod.pitchT=.1; rod.end=null; }
  else { vib(60); startRetrieve(msg,'bad'); }
}
function startJump(){ const f=G.f; f.jumpT=f.jumpDur=.85+.25*Math.sqrt(G.fd.L); fishPos(tv,0); P.splash(tv.x,0,tv.z,30,1.2); W.addRipple(tv.x,tv.z,.9); Snd.splash(1);
  toast('魚躍出水面！先放手！','warn',1100); vib(30); G.fish.group.visible=true; }
function dispDist(){ return Math.max(.42,G.fd.L*(G.fd.sp.sh.snout?3:2.6))*(W.camera.aspect<1?1:.8); }   // 拿在手上的魚約佔畫面寬度七成，看得清楚又不會塞滿
const catchView=$('catchView'),catchPanel=$('catchPanel'),posedCatchBounds=new T.Box3(),catchRotation=new T.Matrix4();
let catchRect=null,catchBounds=null,catchMesh=null;
function positionHeldCatch(g){
  if(catchRect){
    // A recovered item may replace its placeholder with a loaded model.
    if(!catchBounds||catchMesh!==g.children[0]){
      catchMesh=g.children[0];
      catchBounds=marineBodyBounds(T,g);
    }
    if(!catchBounds.isEmpty()){
      posedCatchBounds.copy(catchBounds).applyMatrix4(catchRotation.makeRotationFromQuaternion(g.quaternion));
      catchViewPosition(g.position,W.camera,posedCatchBounds,catchRect,innerWidth,innerHeight,g.scale.x);
      return;
    }
  }
  const d=dispDist();
  g.position.set(0,.14*d,-d);
}
function resizeCatchView(){
  const rect=catchView.getBoundingClientRect();
  catchRect=rect.width>0&&rect.height>0?rect:null;
  if(G.state==='catch'&&G.fish.group.parent===W.camera&&G.fd.sp.special!=='mermaid') positionHeldCatch(G.fish.group);
}
function openCatchPanel(){
  ui.catch.classList.toggle('mermaidCatch',G.fd.sp.special==='mermaid');
  ui.catch.classList.remove('hidden');
  document.body.classList.add('catching');
  ui.actWrap.classList.add('hidden');ui.sub.classList.add('hidden');
  catchPanel.scrollTop=0;
  resizeCatchView();
}
function presentCatch(){
  const g=G.fish.group;
  if(G.fd.sp.special!=='mermaid'){
    W.camera.add(g);g.rotation.set(0,0,0);W.setHeldCatch(g);
  }
  catchBounds=null;catchMesh=null;
  G.state='catch';G.stT=0;
  showCard();
}
function land(){
  if(!easy()&&G.loc==='sea'&&!G.fd.item&&!G.fd.sp.special&&G.fd.sp.id!=='shark'&&G.fd.sp.id!=='gwhite'&&Math.random()<.12*(1-.12*TR('sea'))&&!KK.busy()&&!(window.__ECO&&window.__ECO.fxOn('repel'))){ G.state='snatch'; fishPos(tv,-.05); toast('就在魚出水的瞬間……','warn',1200); KK.snatchOver(tv.clone(),()=>{ G.state='fight'; lose('shark'); }); return; }
  G.netAt=null;G.netSplash=false;G.state='land'; G.stT=0; G.netting=!!(G.f&&G.f.netted); endFightUI(); WL.endChase(); SEA.endChase(); G.combo=(G.combo||0)+1; FUN.combo(G.combo); save.maxCombo=Math.max(save.maxCombo||0,G.combo); fishPos(G.landFrom,-.05); P.splash(G.landFrom.x,0,G.landFrom.z,40,1.3); W.addRipple(G.landFrom.x,G.landFrom.z,1);
  Snd.splash(1.2); vib([30,40,30]); const g=G.fish.group; g.visible=G.fd.sp.special!=='mermaid'; if(g.parent!==W.scene) W.scene.attach(g);
  g.position.copy(G.landFrom); te.set(0,G.f.az0+G.f.theta+Math.PI/2,0); g.quaternion.setFromEuler(te); G.landQ.copy(g.quaternion); P.shadow.material.opacity=0;
}
function showCard(){
  if(G.fd&&!G.fd.item) depAdd(G.depK||depKey(),1+.5*G.fd.sp.rar);
  if(G.fd&&G.fd.boss&&window.__TAL) window.__TAL.bossWin(G.fd);
  if(window.__MOON) window.__MOON.onCatch(G.fd);
  if(G.fd.item){ if(window.__STORY) window.__STORY.onItem(G.fd.item&&G.fd.item.id); save.items=(save.items||0)+1; if(G.fd.item.id==='chest') save.chests=(save.chests||0)+1; if(window.__ECO) window.__ECO.dropItem(G.fd.item); persist(); FUN.goalsDot();
    for(const id of ['bHome','bGrill','bShot']) $(id).classList.add('hidden');
    return FUN.itemCard(G.fd,openCatchPanel); }
  { const cb=1+.05*Math.min(G.combo||0,6); G.fd.value=Math.round(G.fd.value*cb*(window.__ECO&&window.__ECO.fxOn('coin2')?2:1)); G.fd.xpMul=(G.fd.xpMul||1)*cb; }
  FUN.tourCatch(G.fd); if(G.hot) save.hotC=(save.hotC||0)+1; $('bSell').textContent='賣出'; $('bRel').classList.remove('hidden');
  const fd=G.fd, sp=fd.sp, r=RAR[sp.rar], rec=save.dex[sp.id];
  const isNew=!rec, isRec=!!rec&&fd.w>rec.bw;
  // 首次釣獲日期只在第一次釣到時記錄；更新前的舊紀錄沒有日期就不顯示，不亂填
  save.dex[sp.id]={n:(rec?rec.n:0)+1,bw:Math.max(rec?rec.bw:0,fd.w),bl:Math.max(rec?rec.bl:0,fd.L),md:Math.max(rec&&rec.md||0,FUN.medalLv(fd)),f:rec?rec.f:Date.now()}; save.total++;
  practice.finish();
  // 魚獲紀錄：魚種、尺寸、釣點、時段、天氣、餌、釣法、釣棚，放生或賣出都保留紀錄與圖鑑進度
  if(!fd.item){ const wx=WL.wx?WL.wx():{}, wn=wx.r>.5?'雨':wx.r>.15?'毛毛雨':wx.f>.5?'霧':wx.c>.55?'陰':'晴', bt=G.baitUsed||{};
    save.catchLog=save.catchLog||[]; save.catchLog.unshift({id:sp.id,L:+fd.L.toFixed(3),w:+fd.w.toFixed(3),t:Date.now(),h:+G.hour.toFixed(2),z:(WL.zoneId&&WL.zoneId())||'',loc:G.loc||'lake',wx:wn,b:bt.id||'',m:G.loc==='ice'?'冰釣':bt.lure?'路亞':G.bottom?'沉底':'浮標',dp:save.depth==null?1:save.depth,new:isNew,rec:isRec});
    if(save.catchLog.length>300) save.catchLog.length=300; G.logRec=save.catchLog[0]; }
  persist();
  if(window.__STORY&&!G.fd.item) window.__STORY.onCatch(fd,{zone:(SPOTS[G.spot]||{}).id,loc:G.loc,per:period(G.hour),rain:W.U.uRain.value>.25});
  if(window.__PROMO&&!G.fd.item&&!G.fd.practice) window.__PROMO.onCatch(fd.sp);   /* 釣魚抽蝦皮折扣碼：由伺服器決定中不中 */
  { const xp=META.onCatch(fd,{perfect:!!(G.f&&G.f.perfect),per:period(G.hour)}), pm=window.__ECO?window.__ECO.priceMul(sp.id):1; $('cXp').textContent='+'+xp+' 經驗　'+(window.__ECO?window.__ECO.lastDrop():'')+(pm>1?'　🔥行情 ×'+pm:''); }
  ui.catch.style.setProperty('--rc',r.col);
  $('cLv').textContent=fd.lvl; $('cName').textContent=sp.name; $('cRar').textContent=r.name+' '+r.en+(fd.grade?'｜'+fd.grade:''); $('cSci').textContent=sp.sci;
  $('cLen').textContent=(fd.L*100).toFixed(1)+' cm'; $('cW').textContent=fd.w<1?Math.round(fd.w*1000)+' g':fd.w.toFixed(2)+' kg';
  $('cVal').textContent='🪙 '+fd.value.toLocaleString(); $('cDesc').textContent=sp.desc+' 拉扯型態：'+styOf(sp.id).n+'，難度 '+stars(fd)+'。';
  // 搏魚結算：花了多久、揚竿品質、最高張力、魚衝了幾次；刷新最快紀錄時標示
  if(G.f&&!fd.item){ const f=G.f, ft=f.ft||0, mm=Math.floor(ft/60), ss=Math.round(ft%60), bestK='bf_'+sp.id, best=(save.fightBest||{})[bestK];
    const fast=!best||ft<best; save.fightBest=save.fightBest||{}; if(fast) save.fightBest[bestK]=+ft.toFixed(1);
    $('cDesc').textContent+=` 搏魚 ${mm?mm+' 分 ':''}${ss} 秒${fast&&best?'（最快紀錄！）':''}・${f.perfect?'完美揚竿':'普通揚竿'}・最高張力 ${Math.round((f.maxT||0)*100)}%・魚衝刺 ${f.runs||0} 次。`;
    if(G.logRec){ G.logRec.ft=+ft.toFixed(1); G.logRec.hq=f.perfect?1:0; } }
  { const mm=sp.special==='mermaid', ns=mm||!!sp.noSell; $('bSell').classList.toggle('hidden',ns); $('bRel').textContent=mm?'送她回家（收下謝禮）':sp.noSell?'拍照後放流':'放生'; if(mm) $('cW').textContent='？？？';
    if(sp.noSell&&!mm) $('cVal').textContent='保育類・不可販售'; }
  $('bShot').classList.toggle('hidden',!!fd.item||!G.logRec);
  if(G.logRec&&(G.logRec.new||G.logRec.rec)) setTimeout(()=>{ if(G.state==='catch'&&G.logRec&&!G.logRec.ph&&snapPhoto(G.logRec,true)) $('bShot').classList.add('hidden'); },700);
  $('bGrill').classList.toggle('hidden',!canGrill(fd)||!HOME.unlocked()); $('bGrill').textContent='🔥 放進保冷箱，帶回去烤（'+((save.cooler||[]).length)+'/5）';
  { const hr=HOME.check(fd), b=$('bHome'); b.classList.toggle('hidden',!!hr.hide||!HOME.unlocked()); b.textContent=hr.mount?'🖼 '+hr.short+'，做成標本 🪙'+hr.cost.toLocaleString():'🏠 帶回家';
    b.dataset.mode=hr.ok?'keep':hr.mount?'mount':'no'; b.dataset.why=hr.why||''; b.classList.toggle('dim',!hr.ok&&!hr.mount); }
  FUN.medalBadge(fd); FUN.goalsDot(); if(sp.special==='mermaid'){ if(!G.fish.group.userData.merCtl&&window.__MER){ try{ G.fish.group.userData.merCtl=window.__MER.rig(G.fish.group,{}); }catch(e){} } const ctl=G.fish.group.userData.merCtl; if(ctl){ G.merShow={t:0,ctl}; G.fish.group.visible=true; FUN.mermaidScene(true); ctl.smile(6); setTimeout(()=>ctl.talk(3.2),900); } else { G.fish.group.visible=false; FUN.mermaidScene(); } }
  const nb=$('cNew'); nb.textContent=isNew?'新魚種':'新紀錄'; nb.classList.toggle('hidden',!(isNew||isRec));
  const tag=$('tag'); tag.style.animation='none'; void tag.offsetWidth; tag.style.animation='';
  openCatchPanel();
  Snd.fanfare(sp.rar); setTimeout(()=>$('bSell').focus({preventScroll:true}),50);
}
// 回家／出門：小屋是獨立場景，回家時改畫小屋，外面的湖照常運作；出門回到木碼頭
// 回到小屋時：第一次會看到手記附頁；之後每天第一次回家，若收藏了 3 種以上的魚，釣友會來參觀並留下魚餌
function homeEnter(){ const hd=HOME.data();
  if(!hd.page){ hd.page=1; persist(); setTimeout(()=>{ if(window.__STORY&&window.__STORY.page) window.__STORY.page('手記・附頁：小屋的水族箱',
    '牆角那個蒙著灰的玻璃缸，是我年輕時從鎮上扛回來的。<br><br>有些魚，我實在捨不得賣。牠們在缸裡游的樣子，讓我想起釣到牠們的那個早晨、那陣風、那片霧。<br><br>如果你也遇到捨不得的魚，就帶回來吧。太大的就做成標本，掛在牆上，每次經過都會想起那場拉扯。<br><br>對了，常有釣友來敲門想看看缸裡的魚。他們總會留下一點魚餌當謝禮——缸裡的魚越多樣，他們越大方。'); },900); return; }
  const day=new Date().toDateString(); if(hd.visit===day) return;
  const kinds=new Set([...hd.fresh,...hd.sea,...hd.mounts].map(r=>r.id)).size; if(kinds<3) return;
  const pool=BAITS.filter(b=>['corn','shrimp','live'].includes(b.id)&&save.lv>=b.lv), bt=pool[Math.floor(Math.random()*pool.length)]; if(!bt) return;
  const n=Math.min(8,1+Math.floor(kinds/2)); hd.visit=day; save.baits[bt.id]=(save.baits[bt.id]||0)+n; persist();
  setTimeout(()=>toast('釣友來參觀你的 '+kinds+' 種收藏，留下了 '+bt.icon+bt.name+' ×'+n,'good',2600),1200); }
function recoverHome(err){Snd.setIndoor?.(false);if(window.__DIAG)window.__DIAG.action('home','error',err.message);console.error('home recovery',err);try{HOME3D.exit();}catch(_){}G.state='idle';document.body.classList.remove('athome','tankview','tankdive','grilling');fadeEl.classList.remove('on');toast('小屋載入暫時失敗，已返回釣點，遊戲進度保留','warn',4200);}
// 切換場景時黑幕多撐 3 個畫面：新場景第一次繪製要把幾何與貼圖上傳到顯示卡，這一下會卡幾百毫秒，讓它發生在黑幕後面而不是玩家眼前
/* 換地點的黑幕：至少等 3 幀；如果新地點的實拍天空還在下載，最多再等 10 秒（下載好就立刻拉開），不讓玩家看到上一個地點的景色 */
function fadeOutWhenReady(){ let n=3; const t0=performance.now(); const step=()=>{ const wait=!HOME3D.active()&&W.photoReady&&!W.photoReady(G.hour)&&performance.now()-t0<10000;
  if(--n>0||wait) requestAnimationFrame(step); else fadeEl.classList.remove('on'); }; requestAnimationFrame(step); }
function goHome(){if(G.state==='home')return;if(G.state!=='idle'){toast('先收線再回家','warn');return;}if(!HOME.unlocked()){toast('完成主線第一章後才能整理小屋','warn');return;}persist();if(window.__DIAG)window.__DIAG.action('home','begin');G.state='travel';fadeEl.classList.add('on');Snd.paddle();
 setTimeout(()=>{try{if(window.__DIAG)window.__DIAG.scene('home','loading');Snd.setIndoor?.(true);window.__GHOST?.stopAudio?.();if(W.suspendEffects)W.suspendEffects();if(typeof KY!=='undefined')KY.v=KY.w=KY.thr=KY.turn=0;const homeAt=performance.now();HOME3D.enter();window.__DIAG?.event('home-setup',Math.round(performance.now()-homeAt)+'ms');G.state='home';document.body.classList.add('athome');fadeOutWhenReady();toast('回到老漁人的小屋','good',1400);if(window.__DIAG)window.__DIAG.action('home','first-frame');}catch(err){recoverHome(err);}},650);}
function leaveHome(then){ if(G.state!=='home') return; G.state='travel'; fadeEl.classList.add('on');
  setTimeout(()=>{ HOME3D.exit();Snd.setIndoor?.(false); document.body.classList.remove('athome'); G.state='idle'; if(then){ fadeEl.classList.remove('on'); then(); } else if(G.spot!==0){ fadeEl.classList.remove('on'); goSpot(0); } else fadeOutWhenReady(); },650); }
window.__goHome=goHome; window.__startRetrieve=startRetrieve; window.__goSpot=i=>goSpot(i); window.__PROPS=P; window.__testFight=(x,z)=>{ G.to.set(x,0,z); G.castDist=Math.hypot(x-(G.angler||G.base).x,z-(G.angler||G.base).z); bob.position.set(x,0,z); G.state='wait'; bite(); hook(true); };
$('bOut').addEventListener('click',()=>leaveHome());
$('bGrillH').addEventListener('click',()=>{ if(window.__GRILL) window.__GRILL(); });
$('bTankM').addEventListener('click',()=>{ if(window.__openSheet) window.__openSheet('home'); });
// 釣到美人魚：她從船前方的水裡浮上來（腰以上露出水面），轉向你、眨眼、微笑、說話；送她回家時揮手、慢慢沉回水裡
function merPresent(dt){ const m=G.merShow; if(!m) return; const g=G.fish.group; if(!g||!m.ctl){ G.merShow=null; return; } m.t+=dt;
  const cam=W.camera; if(g.parent!==cam){ cam.add(g); }   // 掛在鏡頭前面：不管鏡頭朝哪裡，她一定在畫面中
  const H=1.75; g.scale.setScalar(H); g.visible=true;
  const rise=m.leave?Math.max(0,1-m.leave/2.2):Math.min(1,m.t/1.8), e=1-Math.pow(1-rise,3);
  g.position.set(.05,-.55-(1-e)*1.6+Math.sin(m.t*1.3)*.03,-4.2); g.rotation.set(.04,Math.sin(m.t*.5)*.08,0);   // 從下方浮上來、輕輕晃
  m.ctl.swim(.2); if(!m.waved&&m.t>2.6){ m.waved=1; m.ctl.wave(); }
  if(m.leave){ m.leave+=dt; if(m.leave>2.4){ g.visible=false; cam.remove(g); W.scene.add(g); G.merShow=null; } }
  if(Math.random()<dt*.15&&!m.leave) m.ctl.look(); }
// 釣到美人魚時可以和她互動：點畫面上方（她所在的位置），她會有不同的反應和一句話
const MER_LINES=[['「你的燈……好溫暖。」','smile'],['「我叫霜汐。你呢？」','talk'],['「謝謝你，沒有傷害我。」','smile'],['「月亮圓的時候，我會再來。」','wave'],['「人類的手，原來是暖的。」','smile'],['「別告訴別人你看過我，好嗎？」','look'],['「湖底很安靜……但有點寂寞。」','talk']];
window.addEventListener('pointerdown',e=>{ const m=G.merShow; if(!m||m.leave||m.t<1.6||e.clientY>innerHeight*.62) return; const L=MER_LINES[(m.li=((m.li||0)+1+Math.floor(Math.random()*2))%MER_LINES.length)];
  m.ctl.talk(2.6); if(L[1]==='smile') m.ctl.smile(4); if(L[1]==='wave') m.ctl.wave(); if(L[1]==='look') m.ctl.look(); vib(12);
  const tx=document.getElementById('merTx'); if(tx) tx.innerHTML='<b>霜汐</b>'+L[0]+'<br><small>點她可以再說說話，送她回家，她會留下一份謝禮。</small>'; });
function finishCatch(sell){
  const keep=sell==='keep'; if(keep) sell=false;   // 帶回家：不賣、也不算放生
  if(sell&&G.fd&&G.fd.sp&&(G.fd.sp.noSell||G.fd.sp.special==='mermaid')) sell=false;   // 保育類、美人魚：任何途徑都不能賣
  ui.catch.classList.add('hidden'); document.body.classList.remove('catching'); ui.actWrap.classList.remove('hidden'); ui.sub.classList.remove('hidden');
  const g=G.fish.group;
  W.setHeldCatch(null);catchRect=null;catchBounds=null;catchMesh=null;
  if(G.fd.item) FUN.itemEffect(G.fd.item);
  if(sell){ const v=Math.round(G.fd.value*(1+(save.mer&&save.mer.n>=15?.2:save.mer&&save.mer.n>=8?.1:0))*(1+(window.__TAL&&window.__TAL.titleFx?window.__TAL.titleFx('coin'):0))); save.coins+=v; persist(); Snd.coin(); coinFly(v); }
  else if(keep){ Snd.coin(); }
  else { META.onRelease(); if(G.fd.sp.special==='mermaid'){ if(G.merShow){ G.merShow.leave=.01; G.merShow.ctl.wave(); G.merShow.ctl.smile(3); } const v=G.fd.value; save.coins+=v; persist(); Snd.coin(); coinFly(v); G.luck=.25; FUN.merMeet(); setTimeout(()=>{ if(window.__MERGIFT&&window.__whenFree) window.__whenFree(()=>window.__MERGIFT.give()); },800); }   /* 送她回家：她留下一片月鱗畫像 */ else { G.luck=Math.min(.25,G.luck+.08); toast('放生了，下一竿稀有魚機率提高','good',1800); } }
  W.scene.attach(g); G.state='post'; G.stT=0; G.postSell=sell||keep; G.from.copy(g.position);
}
function coinFly(v){ const el=document.createElement('div'); el.className='fly'; el.textContent='+'+v.toLocaleString()+' 🪙';
  const r=ui.coin.getBoundingClientRect(); el.style.left='42%'; el.style.top='58%';
  el.style.setProperty('--dx',(r.left-window.innerWidth*.42)+'px'); el.style.setProperty('--dy',(r.top-window.innerHeight*.58)+'px');
  document.body.appendChild(el); setTimeout(()=>{ el.remove(); setCoins(); },900); }

/* ---------- 輸入 ---------- */
let actPtr=null, actX0=0, dragPtr=null, dragX0=0, yaw0=0;
function actDown(){
  Snd.init(); G.held=true; ui.act.classList.add('held');
  switch(G.state){
    case 'idle': if(G.loc==='ice'){ if(ICE.drilled()) iceDrop(); } else startCharge(); break;
    case 'lure': LURE.press(); break;
    case 'fight': if(G.f&&G.f.netOn){ G.f.netGo=true;G.held=false;ui.act.classList.remove('held'); } break;
    case 'wait': if(G.snag){ break; }
      if(G.practiceCast){toast('先等浮標下沉，看到「起鉤」再點。','',1600);break;}
      startRetrieve(G.prawnDrag>0?'太早了：蝦還抱著餌在走，等浮標停下來、輕輕往下沉再揚竿':G.dip>0?'太早了：剛剛只是魚在試咬，要等浮標整個沉下去再揚竿':'收線','warn'); break;
    case 'bite': { const r=FUN.hookPress(); if(r==='early'){ missBite(); toast('太早了：牠還含著餌在試探，等量表進到藍色再起鉤','warn',2000); } else if(r==='miss') missBite(); else hook(r==='perfect'); } break;
  }
}
function actUp(){ G.held=false; ui.act.classList.remove('held'); if(G.state==='lure') LURE.release(); if(G.state==='charge') cast(); }
ui.act.addEventListener('pointerdown',e=>{ e.preventDefault(); try{ ui.act.setPointerCapture(e.pointerId); }catch(_){} actPtr=e.pointerId; actX0=e.clientX; actDown(); });
ui.act.addEventListener('pointermove',e=>{ if(e.pointerId!==actPtr) return; if(G.state==='fight') G.rodSideT=clamp((e.clientX-actX0)/70,-1,1); });
const actRel=e=>{ if(e.pointerId!==actPtr) return; actPtr=null; actUp(); if(dragPtr===null) G.rodSideT=0; };
ui.act.addEventListener('pointerup',actRel); ui.act.addEventListener('pointercancel',actRel);
ui.act.addEventListener('contextmenu',e=>e.preventDefault());
const cv=W.renderer.domElement;
cv.addEventListener('pointerdown',e=>{ if(dragPtr!==null) return; dragPtr=e.pointerId; dragX0=e.clientX; yaw0=G.yawT; dragY0=e.clientY; pitch0=G.pitchT||0; try{ cv.setPointerCapture(e.pointerId); }catch(_){} });
cv.addEventListener('pointermove',e=>{ if(e.pointerId!==dragPtr) return; const dx=e.clientX-dragX0;
  if(G.state==='fight') G.rodSideT=clamp(dx/70,-1,1); else if(G.state==='idle'||G.state==='charge'||G.state==='wait'||G.state==='bite'||G.state==='lure') G.yawT=clamp(yaw0-dx*.005,-.95,.95);   // 拋竿後（等魚、咬餌、路亞）也能自由轉視角
  if(G.state==='idle'||G.state==='wait') G.pitchT=clamp(pitch0-(e.clientY-dragY0)*.004,-.4,.72); });   // 向上滑抬頭、向下滑低頭，與小屋鏡頭方向一致
const dragRel=e=>{ if(e.pointerId!==dragPtr) return; dragPtr=null; if(actPtr===null) G.rodSideT=0; };
cv.addEventListener('pointerup',dragRel); cv.addEventListener('pointercancel',dragRel); cv.addEventListener('lostpointercapture',dragRel);
ui.act.addEventListener('lostpointercapture',actRel);
// 保險：手機瀏覽器偶爾會漏掉「放開」事件，讓按鈕／拖曳／搖桿永遠卡住。視窗層級再接一次，螢幕上沒有手指時全部清掉
function releaseAll(){ if(actPtr!==null){ actPtr=null; actUp(); } dragPtr=null; G.rodSideT=0; try{ if(KY.ptr!==null){ KY.ptr=null; KY.thr=0; KY.turn=0; joyK.style.transform=''; } }catch(e){} }   /* KY 還沒建立時（剛開頁就切到背景）不會報錯 */
window.addEventListener('pointerup',e=>{ if(e.pointerId===dragPtr) dragRel(e); if(e.pointerId===actPtr) actRel(e); if(typeof KY!=='undefined'&&e.pointerId===KY.ptr) joyEnd(e); },true);
window.addEventListener('pointercancel',e=>{ if(e.pointerId===dragPtr) dragRel(e); if(e.pointerId===actPtr) actRel(e); if(typeof KY!=='undefined'&&e.pointerId===KY.ptr) joyEnd(e); },true);
window.addEventListener('touchend',e=>{ if(e.touches.length===0) setTimeout(()=>{ if(!(navigator.maxTouchPoints>0&&(dragPtr!==null||actPtr!==null))) return; releaseAll(); },120); },{passive:true});
document.addEventListener('visibilitychange',()=>{ if(document.hidden) releaseAll(); });
let dragY0=0, pitch0=0;
const keys={};
window.addEventListener('keydown',e=>{ if(e.repeat||document.querySelector('[data-photo-preview]')) return; keys[e.code]=true; if(e.code==='Space'&&G.state!=='intro'&&G.state!=='catch'){ e.preventDefault(); actDown(); } });
window.addEventListener('keyup',e=>{ keys[e.code]=false; if(e.code==='Space'){ e.preventDefault(); actUp(); } });

$('startBtn').addEventListener('click',()=>{ if(/[?&]ending=1/.test(location.search)) setTimeout(function endT(){ if(G.state==='idle'&&window.__STORY&&window.__STORY.showEnding) window.__STORY.showEnding(); else setTimeout(endT,800); },2500);   /* 測試：?ending=1 按開始後直接播結局動畫 */ Snd.init(); $('intro').classList.add('hidden'); G.state='idle';if(window.__DIAG)window.__DIAG.start(); toast('按住按鈕蓄力，放開拋竿','',2200);
  // 預覽結局：網址帶 ending 參數時，開始後直接播放結局（測試與重看用）
  if(/[?&]ending=[1-9]/.test(location.search)) setTimeout(()=>window.__playEnding(),1200);
  else if(G.spot===0&&!MERTEST&&!FORCE_FISH)practice.start();
});
// 魚獲照片：截目前畫面縮成小圖（約 6KB），另存一個獨立的位置（不塞進存檔與雲端同步），最多保留 60 張
const PHOTO_KEY='swampAngler.photos';
function photoGet(){ try{ return JSON.parse(localStorage.getItem(PHOTO_KEY)||'{}'); }catch(e){ return {}; } }
function snapPhoto(rec,quiet){ if(!rec) return false; try{ W.render(); const src=W.renderer.domElement, cv=document.createElement('canvas'), w=200;
    const sx=catchRect?catchRect.left*src.width/innerWidth:0, sy=src.height*(catchRect?catchRect.top/innerHeight:.12);
    const sw=src.width*(catchRect?catchRect.width/innerWidth:1), sh=src.height*(catchRect?catchRect.height/innerHeight:.62);
    cv.width=w; cv.height=Math.round(w*sh/sw); cv.getContext('2d').drawImage(src,sx,sy,sw,sh,0,0,cv.width,cv.height);
    const url=cv.toDataURL('image/jpeg',.62); if(url.length<800) return false;   // 空白畫面不存
    const P2=photoGet(); P2[rec.t]=url; const ks=Object.keys(P2).sort(); while(ks.length>60) delete P2[ks.shift()];
    localStorage.setItem(PHOTO_KEY,JSON.stringify(P2)); rec.ph=1; persist(); if(!quiet){ toast('📸 已存進魚獲紀錄','good',1200); vib(15); } return true; }catch(e){ if(!quiet) toast('照片存不下了（手機空間不足）','warn',1600); return false; } }
window.__photoGet=photoGet;
$('bShot').addEventListener('click',()=>{ if(G.state==='catch'&&G.logRec&&!G.logRec.ph) snapPhoto(G.logRec,false); $('bShot').classList.add('hidden'); });
$('bSell').addEventListener('click',()=>{ if(G.state==='catch'){ if(G.logRec) G.logRec.out='賣出'; finishCatch(true); } });
$('bRel').addEventListener('click',()=>{ if(G.state==='catch'){ if(G.logRec) G.logRec.out='放生'; finishCatch(false); } });
// 保冷箱：魚帶回小屋烤（最多 5 條；保冷類、寶物、美人魚與幻想生物不能烤）
function canGrill(fd){ return fd&&fd.sp&&!fd.item&&!fd.sp.noSell&&!fd.sp.special&&fd.sp.rar<5; }
$('bGrill').addEventListener('click',()=>{ if(G.state!=='catch'||!G.fd) return; save.cooler=save.cooler||[];
  if(save.cooler.length>=5){ toast('保冷箱滿了（5 條），先回小屋烤掉幾條','warn',2200); return; }
  save.cooler.push({id:G.fd.sp.id,L:+G.fd.L.toFixed(3),w:+G.fd.w.toFixed(3),d:Date.now()}); persist(); toast('放進保冷箱，回小屋點壁爐就能烤','good',2000); finishCatch('keep'); });
$('bHome').addEventListener('click',()=>{ if(G.state!=='catch'||!G.fd) return; const b=$('bHome'), at=(SPOTS.find(s=>s.id===WL.zoneId())||SPOTS[G.spot]||{}).name;
  if(b.dataset.mode==='keep'){ if(HOME.keep(G.fd,at)){ toast('把'+G.fd.sp.name+'帶回小屋的水族箱了','good',1800); finishCatch('keep'); } return; }
  if(b.dataset.mode==='mount'){ const r=HOME.check(G.fd); if(save.coins<r.cost){ toast('金幣不夠做標本（需要 🪙'+r.cost.toLocaleString()+'）','bad'); return; }
    if(HOME.mount(G.fd,at)){ toast('做成標本，掛在小屋的牆上了','good',1800); finishCatch('keep'); } return; }
  toast(b.dataset.why||'現在不能帶回家','warn',2200); });
const PRESETS=[[6.3,'清晨'],[11.5,'正午'],[17.6,'黃昏'],[21,'夜晚']];
const ITEMS_BY=id=>(FUN.items||[]).find(x=>x.id===id);
window.__GRILL=()=>HOME3D.grill();
// 結局演出：接管主場景的鏡頭；演完回到原本的釣點
// 開始時：天氣改晴、月亮固定滿月、漁船停在原點；結束時全部恢復，並回到原本釣點的海或湖
const ENDSV={};
const END=createEnding(W,{rig:()=>[P.rodGroup,bob],soundOn:()=>save.sound!==false,setSea:on=>{ if((G.loc==='sea')!==on) SEA.setLoc(on?'sea':'lake'); },setHour:h=>{ G.hour=h; W.setTime(h,true); },
  begin:()=>{ ENDSV.hour=G.hour; ENDSV.wx=save.wxMode; ENDSV.loc=G.loc||'lake'; ENDSV.base=G.base.clone(); G.state='ending'; save.wxMode='clear'; G.base.set(0,0,0); if(window.__MOONPH&&window.__MOONPH.fix) window.__MOONPH.fix(.5); },
  end:()=>{ G.state='idle'; W.player.rotation.set(0,0,0); save.wxMode=ENDSV.wx; if(ENDSV.wx===undefined) delete save.wxMode; G.base.copy(ENDSV.base); G.hour=ENDSV.hour; W.setTime(G.hour,true); if(window.__MOONPH&&window.__MOONPH.fix) window.__MOONPH.fix(null); if((G.loc||'lake')!==ENDSV.loc) SEA.setLoc(ENDSV.loc); if(window.__applyGfx) window.__applyGfx(save.gfx||'high'); }});
window.__END=END;
const SCH=createSchools(W,P,{loc:()=>G.loc||'lake',period:()=>period(G.hour),ok:()=>(G.loc==='lake'||G.loc==='sea'||!G.loc)&&G.state!=='home'&&!END.on()&&!UW.active()}); window.__saveNow=()=>persist(); window.__SAVE=save; window.__ENDON=()=>END.on();
// 結局之後的湖：碼頭盡頭的紀念與滿月夜的月潮
const AFTER=createEndingWorld(W,{done:()=>!!(save.story&&save.story.ending),lake:()=>(G.loc||'lake')==='lake'&&G.state!=='home',ending:()=>END.on(),hour:()=>G.hour});
window.__playEnding=done=>{ if(G.state==='home'){ leaveHome(()=>window.__playEnding(done)); return; } END.play(endingShots(END,{save,W,P,G}),done); };
// 後日談終幕〈霜汐的邀請〉：同一套結局演出系統，在真實的月光灣演出後接真人美人魚影片
window.__playMermaidInvite=done=>{ if(G.state==='home'){ leaveHome(()=>window.__playMermaidInvite(done)); return; } END.play(endingShots(END,{save,W,P,G,Snd,mode:'mermaid'}),done); };
// 靜月之光：作者的水晶小店（遊戲免費，喜歡的話可以支持作者）
const SHOP_URL=SHOP_BRAND.url;
let shopReturnFocus=null;
function closeShop(){ $('shopUI').classList.add('hidden');if(shopReturnFocus&&shopReturnFocus.focus)shopReturnFocus.focus(); }
function openShop(){ const ui=$('shopUI');shopReturnFocus=document.activeElement;
  ui.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-labelledby="shopTitle">
    <div class="shop-head"><span>JING YUE · NATURAL STONES</span><button class="shop-close" type="button" data-x="1" aria-label="關閉商品展示">×</button></div>
    <div class="shop-scroll"><div class="shop-intro"><p class="shop-kicker">漁人小屋裡的一間水晶小店</p><h3 id="shopTitle">靜月之光</h3><p class="shop-line">把喜歡的光，戴進日常。</p><p class="sub">從晶透光澤到個性礦石，看看哪一款適合今天的你。<br>以下皆為商品實拍，喜歡就到蝦皮看更多細節。</p></div>
    <div class="shop-featured">${SHOP_BRAND.features.map(f=>`<a class="shop-card" href="${SHOP_URL}" target="_blank" rel="noopener noreferrer" aria-label="到蝦皮挑選${f.label}款式"><img src="${f.image}" alt="${f.label}飾品實拍"><span>${f.label}<b>到賣場挑選 ↗</b></span></a>`).join('')}</div>
    <div class="shop-details"><span>商品實拍</span><span>款式自由挑選</span><span>蝦皮下單</span></div>
    <div class="shop-more"><h4>再看看其他搭配</h4><div class="grid">${[2,3,5,6,7,8].map(i=>`<a href="${SHOP_URL}" target="_blank" rel="noopener noreferrer" aria-label="前往靜月之光蝦皮賣場"><img src="shop${i}.jpg" alt="靜月之光飾品實拍 ${i}" loading="lazy"></a>`).join('')}</div><p class="shop-small">款式、價格與庫存，以蝦皮賣場資訊為準。逛逛小店，也是在支持《濕地垂釣》的製作。</p></div></div>
    <div class="shop-footer"><a class="go" href="${SHOP_URL}" target="_blank" rel="noopener noreferrer">開啟蝦皮・看價格與現貨 <span>↗</span></a><button class="x" type="button" data-x="1">繼續遊戲</button></div></div>`;
  ui.classList.remove('hidden');ui.onclick=e=>{if(e.target===ui||e.target.closest('[data-x]'))closeShop();};ui.querySelector('.shop-close').focus();
}
document.addEventListener('keydown',e=>{const ui=$('shopUI');if(ui.classList.contains('hidden'))return;if(e.key==='Escape')closeShop();if(e.key==='Tab'){const items=ui.querySelectorAll('button,a[href]'),first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
window.__SHOP=openShop;
$('bHomeShop').addEventListener('click',openShop);
window.__CLOUD=createCloud({save:()=>save,toast,test:TESTACC,
  grant:()=>{ if((save.coins||0)<999999){ save.coins=999999; setCoins(); META.syncHUD(); persist(); } toast('🧪 測試帳號：金幣 999,999','good',2600); },refresh:()=>{ if(window.__SHEET&&window.__SHEET.refresh) window.__SHEET.refresh('set'); },
  assistGrant:()=>{ if(window.__ASSIST&&window.__ASSIST.grant(save)){ setCoins(); META.syncHUD(); persist(); toast("輕鬆模式已啟用・全地圖開放・金幣 9,999,999","good",2800); } },
  apply:obj=>{ if(window.__ASSIST) window.__ASSIST.grant(obj);
    /* 根治「救回／補償／載入雲端之後還是舊進度」：以前只把新存檔寫進 localStorage 就重新整理，
       但重新整理前遊戲的自動存檔又把記憶體裡的舊進度寫回去，新存檔被蓋掉。現在先把記憶體裡的存檔整個換成新的，再鎖住所有存檔寫入直到重新整理 */
    try{ for(const k of Object.keys(save)) delete save[k]; Object.assign(save,JSON.parse(JSON.stringify(obj))); }catch(e){}
    try{ localStorage.setItem(SAVE_KEY,JSON.stringify(obj)); }catch(e){} window.__SAVE_LOCK=true; if(window.__DIAG)window.__DIAG.action('navigation','cloud-save-applied');location.reload(); }});
const GHOST=createGhost(W,{toast:(m,c2,ms)=>toast(m,c2,ms),splash:(x,z,n,s)=>P.splash(x,0,z,n,s),ripple:(x,z,r)=>W.addRipple(x,z,r),splashSnd:k=>Snd.splash&&Snd.splash(k),save,persist:()=>persist(),period:()=>period(G.hour),loc:()=>G.loc||'lake',state:()=>uiBusy()?'menu':G.state,base:()=>G.base,head:()=>G.head,yaw:()=>G.yaw,to:()=>G.to,scream:()=>Snd.scream(),drip:()=>Snd.drip(),vib:p=>vib(p),shake:k=>{ G.gShake=k; },onMeet:()=>{ if(window.__STORY) window.__STORY.onMeet(); },storyDone:id=>!!(window.__STORY&&window.__STORY.done(id)),storyActive:id=>!!(window.__STORY&&window.__STORY.isActive&&window.__STORY.isActive(id)),moon:()=>window.__MOONPH?window.__MOONPH.illum():0,progOf:id=>window.__STORY&&window.__STORY.progOf?window.__STORY.progOf(id):null,say:t=>toast(t,'',3200),zone:()=>WL.zoneId(),scene:id=>{ if(window.__STORY) window.__STORY.onScene(id); }});
window.__GHOST=GHOST;
// 烤好了：依兩面熟度評分，吃下去依魚的來源得到效果
// 吃下料理的效果演出：畫面中央浮起效果圖示、發光擴散
function fxBurst(icon){ const el=document.createElement('div'); el.textContent=icon; el.style.cssText='position:fixed;left:50%;top:46%;z-index:40;font-size:64px;transform:translate(-50%,-50%) scale(.4);opacity:0;transition:transform .6s cubic-bezier(.2,1.6,.4,1),opacity .4s;filter:drop-shadow(0 0 18px rgba(255,220,120,.9));pointer-events:none';
  document.body.appendChild(el); requestAnimationFrame(()=>{ el.style.transform='translate(-50%,-50%) scale(1.15)'; el.style.opacity='1'; }); setTimeout(()=>{ el.style.transition='transform 1s,opacity 1s'; el.style.transform='translate(-50%,-140%) scale(.8)'; el.style.opacity='0'; },1100); setTimeout(()=>el.remove(),2300); vib([20,40,20]); }
function onGrilled(rec,a,b,season,who){ const sp=SPECIES.find(s=>s.id===rec.id); if(!sp) return; const lo=season==='lemon'?.72:.78, hi=season==='lemon'?.95:.92, g=x=>x<.55?0:x<lo?1:x<hi?3:-1, ga=g(a), gb=g(b);
  const burnt=ga<0||gb<0, q=burnt?0:Math.min(ga,gb), name=burnt?'烤焦了':q>=3?'完美':q>=1?'半熟':'還是生的';
  // 潮間帶的海味：文蛤好運、海瓜子咬餌更快、竹蟶與沙蟹力氣；赤嘴蛤把身上所有效果延長
  const TFX={hardclam:{id:'luck',n:'好運',i:'🍀'},tellin:{id:'glow',n:'咬餌更快',i:'♨️'},razor:{id:'meal_str',n:'力氣（魚累得更快）',i:'💪'},ghostcrab:{id:'meal_str',n:'力氣（魚累得更快）',i:'💪'},gomphina:{id:'extend',n:'所有效果延長',i:'⏳'}};
  const fx=TFX[rec.id]?TFX[rec.id]:sp.loc==='sea'||sp.water==='sea'?{id:'luck',n:'好運',i:'🍀'}:sp.loc==='ice'||(sp.spots||[]).includes('ice')?{id:'glow',n:'暖身（咬餌更快）',i:'♨️'}:{id:'meal_str',n:'力氣（魚累得更快）',i:'💪'};
  save.cook=save.cook||{}; const ck=save.cook[rec.id]=save.cook[rec.id]||{n:0,best:0}; ck.n++; if(q>ck.best) ck.best=q;
  // 料理圖鑑稱號：完美過的魚種數
  { const perf=Object.keys(save.cook).filter(k=>save.cook[k].best>=3).length; save.titles=save.titles||[]; for(const [n,tt] of [[5,'烤魚師傅'],[15,'爐火大師']]) if(perf>=n&&save.titles.indexOf(tt)<0){ save.titles.push(tt); setTimeout(()=>toastHome('🏅 獲得稱號「'+tt+'」：完美烤過 '+n+' 種魚','good',3200),1600); } }
  if(q<=0){ persist(); toastHome('🔥 '+sp.name+'：'+name+(who==='friend'?'……釣友客氣地吃了一口':'……吞不下去，沒有效果'),'warn',2600); return; }
  const legend=(sp.rar||0)>=4&&q>=3;
  if(who==='friend'){ const coins=Math.round((sp.price||20)*Math.pow((rec.w||.5)+.3,.85)*(q>=3?2.2:1.2)*(legend?2:1)); save.coins+=coins; setCoins();
    save.baits=save.baits||{}; const bt=q>=3?(legend?'moon':'live'):'shrimp', bn=q>=3?(legend?1:3):2; save.baits[bt]=(save.baits[bt]||0)+bn; persist();
    toastHome('🎁 釣友吃得很開心'+(q>=3?'，直說好吃！':'')+' 🪙'+coins+'・'+({moon:'月光餌',live:'活魚餌',shrimp:'活蝦'}[bt])+' ×'+bn,'good',3200); Snd.coin&&Snd.coin(); return; }
  const min=Math.round((q>=3?12:5)*Math.min(2,.6+Math.sqrt(rec.w||.5)*.5)*({salt:1.2,lemon:1.3}[season]||1)*(legend?2:1)*HOME.grillFxK()); save.fx=save.fx||{}; if(fx.id==='extend'){ const now=Date.now(); let any=0; for(const k of Object.keys(save.fx)){ if(save.fx[k]>now){ save.fx[k]+=min*60000; any++; } } if(!any) save.fx.luck=now+Math.round(min*.5)*60000; }   /* 赤嘴蛤：延長身上所有效果；沒有效果時給一點好運 */
  else save.fx[fx.id]=Math.max(save.fx[fx.id]||0,Date.now())+min*60000;
  // 香草：不論熟度都附加「咬餌更快」，完美時效果時間更長
  if(season==='herb') save.fx.glow=Math.max(save.fx.glow||0,Date.now())+Math.round(min*(q>=3?.6:.35))*60000;
  if(legend){ const other=fx.id==='luck'?'meal_str':'luck'; save.fx[other]=Math.max(save.fx[other]||0,Date.now())+min*60000; }
  persist(); if(window.__ECO&&window.__ECO.render) window.__ECO.render();
  toastHome((legend?'👑 傳說料理！':'🍽 ')+sp.name+'：'+name+'！<br>'+fx.i+' '+fx.n+' '+min+' 分鐘'+(season==='herb'?'・♨️ 咬餌更快 '+Math.round(min*(q>=3?.6:.35))+' 分鐘':'')+(legend?'・雙重效果':'')+'<br><small>'+({salt:'🧂 鹽：效果時間 +20%',lemon:'🍋 檸檬：效果時間 +30%、完美更好烤',herb:'🌿 香草：附加咬餌更快'}[season]||'')+'（出門釣魚時生效）</small>','good',4200); fxBurst(fx.i); Snd.coin&&Snd.coin(); }
/* ===== 潮間帶 ===== */
let tideScene;
const TIDE=window.__TIDE={
  low:h=>!!tideWindow(h,easy()||/[?&]tidetest=1/.test(location.search)),nextLow:nextLowTide,
  active:()=>!!tideScene?.active(),render:dt=>tideScene?.render(dt),
  makeModel:id=>getTideScene().makeModel(id)
};
function getTideScene(){return tideScene??=createTide(W,{species:id=>SPECIES.find(q=>q.id===id),hour:()=>G.hour,toast:(...a)=>toastHome(...a),onExit:(bag,forced)=>tideDone(bag,forced),
  sellNow:v=>{ save.coins+=v; setCoins(); persist(); Snd.coin&&Snd.coin(); },
  toCooler:(id,L)=>{ save.cooler=save.cooler||[]; if(save.cooler.length>=5) return false; save.cooler.push({id,L,w:+(L*L*L*600).toFixed(3),d:Date.now()}); persist(); return true; },
  keepTank:(id,L)=>{ const sp=SPECIES.find(q=>q.id===id); if(!sp||!window.__HOME) return '小屋還沒開放'; const fd={sp,L,w:+(L*L*L*600).toFixed(3)}; const r=window.__HOME.check(fd); if(!r.ok) return r.why||'放不進去'; window.__HOME.keep(fd,'潮間帶'); return true; },
  dex:(id,L)=>{ try{ const sp=SPECIES.find(s=>s.id===id); if(sp&&window.__STORY) window.__STORY.onCatch({sp},{zone:'tide',loc:'tide',per:period(G.hour)}); }catch(_){}  const r=save.dex[id]; save.dex[id]={n:(r?r.n:0)+1,bw:Math.max(r?r.bw||0:0,L),bl:Math.max(r?r.bl||0:0,L),md:r?r.md||0:0,f:r?r.f:Date.now()}; persist(); }});}
window.__P_splash=(x,y,z)=>{ try{ P.splash(x,.02,z,8,.25); }catch(e){} };
function goTide(){
  if(G.state!=='idle'){toast('先收線再下灘','warn');return;}
  if(!TIDE.low(G.hour)){toast('退潮後才能下灘','warn');return;}
  practice.finish();MDL.preload('tide');G.state='travel';fadeEl.classList.add('on');
  setTimeout(()=>{
    try{G.state=getTideScene().enter()?'tide':'idle';}
    catch(error){G.state='idle';window.__DIAG?.add('tide',error.message);toast('潮間帶載入失敗，請再試一次。','warn');}
    finally{fadeOutWhenReady();}
  },650);
  return true;
}
window.__W=W; window.__testMer=()=>{ const sp=SPECIES.find(q=>q.special==='mermaid'); G.sp=sp; G.fd={sp,L:1.7,w:55,lvl:1,value:500,xpMul:1,grade:'A',u:.5}; const fish=P.getFish(sp); G.fish=fish; if(!fish.group.parent) W.scene.add(fish.group); G.state='catch'; try{ showCard(); }catch(e){ return 'card '+e.message; } if(G.merShow) G.merShow.t=2; return !!fish.group.userData.merCtl; }; window.__HS=()=>HOME3D; window.__goTide=goTide;
function tideDone(bag0,forced){ const handled=bag0.filter(b=>b.done).length; let bag=bag0.filter(b=>!b.done); if(!bag.length&&handled){ persist(); toast(forced?'被救回岸邊':'回到岸上了，這次處理了 '+handled+' 個收穫','good',2000); G.state='idle'; return; } G.state='idle';
  // 圖鑑：挖到的都算發現
  bag.forEach(b=>{ const r=save.dex[b.id]; save.dex[b.id]={n:(r?r.n:0)+1,bw:Math.max(r?r.bw||0:0,b.L),bl:Math.max(r?r.bl||0:0,b.L),md:r?r.md||0:0,f:r?r.f:Date.now()}; });
  if(!bag.length){ persist(); toast(forced?'被救回岸邊，這次什麼都沒帶到':'回到岸上了','',1800); return; }
  // 挖到的沙蠶直接變成魚餌（不賣、不烤）
  { const nw=bag.filter(b=>b.id==='ragworm'&&!b.broken).length*3; if(nw){ save.baits=save.baits||{}; save.baits.ragworm=(save.baits.ragworm||0)+nw; bag=bag.filter(b=>b.id!=='ragworm'); setTimeout(()=>toast('🪱 沙蠶 ×'+nw+' 放進魚餌盒了（海釣萬用餌）','good',2600),400); if(!bag.length){ persist(); return; } } }
  const grill=['hardclam','gomphina','tellin','razor','ghostcrab'], total=bag.reduce((a,b)=>a+b.v,0), canKeep=bag.filter(b=>grill.includes(b.id)&&!b.broken);
  const el=document.createElement('div'); el.style.cssText='position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center';
  const names={}; bag.forEach(b=>{ const sp=SPECIES.find(q=>q.id===b.id); names[b.id]=(names[b.id]||0)+1; });
  el.innerHTML=`<div style="background:#1b2226;color:#fff;border-radius:18px;padding:18px;width:min(88vw,360px);line-height:1.6"><div style="font-weight:800;font-size:17px;margin-bottom:8px">🪣 這次的收穫</div>
    <div style="font-size:14px;opacity:.9">${Object.entries(names).map(([id,n])=>(SPECIES.find(q=>q.id===id)||{name:id}).name+' ×'+n).join('、')}</div>
    <div style="margin:10px 0;font-size:13px;opacity:.8">保冷箱可以帶回家烤：文蛤、赤嘴蛤、海瓜子、竹蟶、沙蟹（完整的才行，最多 5 個）</div>
    <div style="display:flex;gap:8px;flex-direction:column"><button id="tdSell" class="sbtn pri" style="padding:10px">全部賣掉 🪙${total.toLocaleString()}</button>
    ${canKeep.length?`<button id="tdKeep" class="sbtn" style="padding:10px">能烤的放保冷箱，其他賣掉</button>`:''}</div></div>`;
  document.body.appendChild(el);
  const fin=keep=>{ let earn=0; save.cooler=save.cooler||[]; bag.forEach(b=>{ if(keep&&grill.includes(b.id)&&!b.broken&&save.cooler.length<5) save.cooler.push({id:b.id,L:b.L,w:+(b.L*b.L*b.L*600).toFixed(3),d:Date.now()}); else earn+=b.v; });
    save.coins+=earn; setCoins(); persist(); Snd.coin&&Snd.coin(); el.remove(); toast(earn?'賣了 🪙'+earn.toLocaleString():'放進保冷箱了，回小屋就能烤','good',2200); };
  el.querySelector('#tdSell').onclick=()=>fin(false); const k=el.querySelector('#tdKeep'); if(k) k.onclick=()=>fin(true); }
const HOME3D=createLazyHomeScene(()=>createHomeScene(W,{openShop:()=>openShop(),save,home:()=>HOME,grillHeat:()=>HOME.grillHeat(),coin:()=>{ Snd.coin&&Snd.coin(); },toast:(...a)=>toastHome(...a),persist:()=>persist(),onGrilled,buy:(id,p)=>{ if(save.coins<p){ toast('金幣不夠','warn',1400); return false; } save.coins-=p; setCoins(); persist(); return true; },sizzle:k=>{ Snd.sizzle&&Snd.sizzle(k); },joy:()=>({thr:KY.thr,turn:KY.turn}),hour:()=>G.hour,data:()=>HOME.data(),species:id=>SPECIES.find(s=>s.id===id),getFish:sp=>P.getFish(sp),
  isReal:id=>!!(window.__MDL&&window.__MDL.fishReady(id)),want:id=>{ if(window.__MDL&&window.__MDL.want) window.__MDL.want(id); },
  crackle:()=>Snd.crackle(), onEnter:()=>homeEnter(), rain:()=>{ if(window.__rainTest!=null) return window.__rainTest; const wx=WL.wx?WL.wx():{}; return wx.r||0; },
  showFish:(rec,card)=>{ const sp=SPECIES.find(s=>s.id===rec.id)||{name:rec.id,rar:0}, r=RAR[sp.rar]; card.style.setProperty('--rc',r.col);
    card.innerHTML=`<b>${sp.name}</b><small>${r.name}${rec.g?'｜'+rec.g:''}</small><div class="fg"><span>長度</span><div>${(rec.L*100).toFixed(1)} 公分</div><span>重量</span><div>${rec.w<1?Math.round(rec.w*1000)+' 公克':rec.w.toFixed(2)+' 公斤'}</div><span>釣到地點</span><div>${rec.at||'—'}</div><span>釣到日期</span><div>${new Date(rec.d).toLocaleDateString('zh-TW')}</div></div>`;
    card.classList.remove('hidden'); }}));
window.__HOME=createHome({save,persist:()=>persist(),toast:(...a)=>toastHome(...a),setCoins:()=>setCoins(),addXP:x=>META.addXP(x),syncHUD:()=>META.syncHUD(),hour:()=>G.hour,setHour:h=>{ G.hour=h; W.setTime(h,true); },fxChanged:()=>{ if(window.__ECO&&window.__ECO.render) window.__ECO.render(); }}); const HOME=window.__HOME;
const META=createMeta({W,save,persist,toast,Snd,SPECIES,RAR,P,setCoins,vib,PRESETS,goSpot,curSpot:()=>G.spot,setHour:h=>{ G.hour=h; W.setTime(h,true); }});
const UW=createUnderwater(W,P);
const tvSea=new THREE.Vector3();
window.__MDL=createModels(W); const MDL=window.__MDL,RESIDENTS=createSurfaceResidents(W,P,MDL);
// 打開設定、商店等面板或新手指引時，鱷魚與女鬼都不會發動（玩家沒在看湖面）
const uiBusy=()=>{ const sh=document.getElementById('sheet'); return practice.active()||G.fd?.practice&&G.state==='fight'||(sh&&!sh.classList.contains('hidden'))||!$('shopUI').classList.contains('hidden')||!!document.getElementById('tutOv'); };
const WL=createWild(W,P,Snd,save,toast,vib,{period:()=>period(G.hour),base:()=>G.base,head:()=>G.head,
  state:()=>uiBusy()?'menu':G.state, loc:()=>G.loc||'lake', kayak:()=>({on:!!SPOTS[G.spot].kayak,v:Math.abs(KY.v),yaw:G.head}),
  onBite:(pos)=>{ if(easy()) return; faceThreat(pos,{dur:2.6,pitch:-.25}); if(G.state==='wait'||G.state==='bite'){ G.state='lost'; G.stT=0; G.snapped=true; }   // 鱷魚咬船：斷線、連擊歸零、驚魂未定
    G.combo=0; FUN.combo(0); G.scareT=6; G.gShake=1.6; vib([200,60,260,60,200]); biteFX('gator'); Snd.splash(2); toast('🐊 ……！','bad',1600); },
  onScare:why=>{ const ram=why==='ram', xp=Math.round(window.__LVINFO.xpNext(save.lv)*(ram?.04:.02)), cn=Math.round((ram?20:10)+save.lv*(ram?10:5));
    if(ram) save.gatorRam=(save.gatorRam||0)+1; else save.gatorScare=(save.gatorScare||0)+1; META.addXP(xp); save.coins+=cn; setCoins(); META.syncHUD(); persist(); G.gShake=ram?.9:.3;
    toast(`+${xp} 經驗　🪙${cn}`,'good',2200); } });
const AT=createAtmos(W,P,Snd,WL,{underwater:()=>UW.active(),period:()=>period(G.hour),base:()=>G.base,head:()=>G.head,spot:()=>G.spot,toast});
const FUN=createFun(W,P,AT,{G,save,persist,toast,Snd,vib,RAR,setCoins,D,SPN:SPECIES.length,period:()=>period(G.hour)}); window.__FUN=FUN;
const SEA=createSea(W,P,AT,{G,save,persist,toast,Snd,vib,setCoins,period:()=>period(G.hour),wx:()=>WL.wx(),underwater:()=>UW.active()});
const KK=createThrill(W,P,AT,{G,toast,Snd,vib,underwater:()=>UW.active(),hullDims:()=>SEA.hullDims(),hullClear:(p,m)=>SEA.hullClear(p,m),hullOut:(p,o)=>SEA.hullOut(p,o)}); window.__KK=KK;
G.saveRef=save;
window.__STORY=createStory({save,persist,toast,Snd,vib,goSpot:i=>goSpot(i),curSpot:()=>G.spot,practice:practice.active,idle:()=>G.state==='idle'&&!uiBusy(),pan:on=>{ G.cinePan=on; if(!on) G.yawT=0; },addXP:x=>META.addXP(x),setCoins:()=>setCoins(),syncHUD:()=>META.syncHUD()});
const SKY=createNightSky(W,G); window.__SKY=SKY;
/* Adaptive profiles change resolution, reflection, shadow and effect budgets together. */
window.__gfxCap=()=>{const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight),limit=W.renderer.capabilities.maxTextureSize||4096;const px=window.__resourcePolicy?.mobile?2200000:12000000;
 // 手機上限約 220 萬像素（接近 1080p）：手機螢幕的實際像素密度常到 3 倍以上，照原生密度畫整片水面會讓 GPU 每幀多做幾倍的工作，肉眼卻看不出差別
 return Math.max(.35,Math.min(3.25,Math.max(2,window.devicePixelRatio||1),Math.sqrt(px/(w*h)),limit/w,limit/h));};
const gfxAuto=createAdaptiveGraphics({cap:window.__gfxCap,initialLevel:window.__resourcePolicy?.mobile?1:4,profile:(p,scope,cap)=>{if(window.__resourcePolicy?.recovery&&p.mode==='auto'){const safe={...p,...graphicsProfiles(cap)[Math.min(p.level,2)],maxLevel:2,reason:'前次中斷後的保護模式'};return{...safe,pr:Math.min(safe.pr,.8)};}return stableCabinGraphicsProfile(aquariumGraphicsProfile(p,scope,cap),scope,window.__resourcePolicy?.mobile);},apply:s=>{
  window.__GFX=s.effect;window.__gfxStatus=s;window.__waterQuality=s.water;const tier=effectTier(s.mode,!!window.__resourcePolicy?.mobile);window.__effectTier=tier;window.__effectBudget=effectBudget(s.effectLevel??s.level,tier);if(W.setEffects)W.setEffects(s.effectLevel??s.level,tier);
  if(W.setWaterDetail)W.setWaterDetail(s.geometry);if(W.setShadows)W.setShadows(s.shadow);if(W.setRefl)W.setRefl(s.reflection>0,s.reflection);W.setPR(s.pr);
  document.body.dataset.gfx=s.effect;document.body.dataset.gfxMode=s.mode;const el=document.getElementById('gfxLive');if(el)el.textContent=graphicsStatusText(s);
},onSample:s=>{window.__FPS=s.fps;window.__gfxStatus=s;const el=document.getElementById('gfxLive');if(el)el.textContent=graphicsStatusText(s);}});
window.__applyGfx=q=>{gfxAuto.configure(q);if(window.__toastGfx)window.__toastGfx(q);};
window.addEventListener('resize',()=>gfxAuto.refresh());document.addEventListener('visibilitychange',()=>gfxAuto.pause());
if(W.qualityTextures)W.qualityTextures(W.scene);
if(recoverMobileGraphics(save,window.matchMedia('(pointer:coarse)').matches,window.devicePixelRatio||1)){persist();setTimeout(()=>toast('已改用自動畫質，掉幀時會自動降低負載；仍可在設定手動選擇','',3800),1800);}
window.__applyGfx(save.gfx||'auto');
const ICE=createIce(W,{loc:()=>G.loc,base:()=>G.base,head:()=>G.head,state:()=>G.state,tens:()=>G.f?G.f.T:0,held:()=>G.held,grind:()=>Snd.grind&&Snd.grind(),splash:(p,k)=>{ P.splash(p.x,.02,p.z,Math.round(4+10*k),.25+.35*k); if(k>.85) vib(15); },chips:p=>{ P.splash(p.x+(Math.random()-.5)*.3,.05,p.z+(Math.random()-.5)*.3,3,.25); if(Math.random()<.5) Snd.click(); vib(8); },done:p=>{ P.splash(p.x,.05,p.z,24,.6); W.addRipple(p.x,p.z,.3); Snd.plop(); vib([20,30,40]); toast('冰洞鑿開了！點擊放線','good',1800); }});
function iceDrop(){ G.noBait=false; const bt=META.useBait(); G.baitUsed=bt&&bt.lure?Object.assign({},bt,{lure:null,wait:(bt.wait||1)*.85}):bt; LURE.bobberVis(true); G.to.copy(ICE.holePos()); G.castDist=1.6; bob.position.set(G.to.x,.6,G.to.z); Snd.plop(); landBobber(); } window.__ICE=ICE;
const MIST=createMorningMist(W,{hour:()=>G.hour,wx:()=>WL.wx(),sea:()=>G.loc==='sea',underwater:()=>UW.active(),wind:()=>WL.wind()}); window.__MIST=MIST;
const ARMS=createArms(W,P); window.__ARMS=ARMS;
const LURE=createLure(W,P,{G,toast,Snd,mood:()=>{ const p=period(G.hour), wx=WL.wx(); return (p==='dawn'||p==='dusk'?1.25:p==='day'?.85:.8)*(wx.c>.5?1.12:1)*(G.loc==='ice'?.8:1); },uwOn:()=>save.uw!==false,reelSpd:()=>META.gear().reel.spd,onChase:()=>{ if(!G.fd) prepFish(); if(!G.fd||G.fd.item) return null; const f=P.getFish(G.fd.sp); if(f) seeThrough(f.group); return f?{group:f.group,uni:f.uni,L:G.fd.L}:null; }}); window.__G=G;
window.__MOON=createMoonBay(W,{G,save,persist,toast,Snd,vib,hour:()=>((G.hour%24)+24)%24,zoneId:()=>WL.zoneId?WL.zoneId():'',period:()=>period(G.hour),giveRod:()=>{ const i=GEAR.rod.findIndex(r=>r.req==='moon'); if(i>=0&&save.gear.rod.indexOf(i)<0){ save.gear.rod.push(i); persist(); } }});
window.__TAL=createTalents({save,persist,toast,Snd,vib,setCoins,addXP:x=>META.addXP(x),loc:()=>G.loc||'lake',zoneId:()=>WL.zoneId?WL.zoneId():'',period:()=>period(G.hour)}); window.__SEA=SEA;
{ const s=SPOTS[save.spot]; G.spot=save.spot; G.base.set(s.pos[0],0,s.pos[1]); G.head=s.head; WL.setSpot(save.spot); SEA.setLoc(s.loc||'lake'); }
function goSpot(i){ if(G.state==='home'){ leaveHome(()=>goSpot(i)); return; }   // 在小屋裡選了釣點：先出門再過去
  if(G.state!=='idle'){ toast('先收線再移動','warn'); return; } { const lk=window.__STORY&&window.__STORY.lock(i); if(lk){ toast('🔒 '+lk,'warn',2400); return; } }
  // 上一行：所有入口共用的開放檢查
  const s=SPOTS[i]; if(i!==0)practice.finish();G.state='travel'; fadeEl.classList.add('on'); Snd.paddle(); setTimeout(()=>Snd.paddle(),380);
  setTimeout(()=>{ G.spot=i; G.base.set(s.pos[0],0,s.pos[1]); G.head=s.head;G.boatStation='fishing';G.angler=null;G.fishingYaw=0; G.yaw=G.yawT=0; save.spot=i; persist(); WL.setSpot(i); if((s.loc||'lake')!==SEA.loc()) SEA.setLoc(s.loc||'lake'); fadeOutWhenReady(); G.state='idle'; toast('抵達'+s.name); if(s.id==='moon'&&!save.lagoonPg){ save.lagoonPg=1; persist(); setTimeout(()=>{ if(window.__STORY&&window.__STORY.page) window.__STORY.page('手記・附頁：月光灣的秘密','月光灣不是普通的湖灣。<br><br>灣底有一條很深的石縫，一路通到外海。平常潮水進不來，可是每逢月圓、大潮漲到最高的那幾夜，海水就會從石縫湧進灣裡。<br><br>那幾夜，我在這裡釣過小丑魚、藍色的刺尾鯛、拖著長絲的鰺……都是海裡才有的魚。月亮越圓，牠們越多。<br><br>霜汐說，她就是順著那條水道游進來的。<br><br>還有一件事，我只敢寫在這裡：有一年滿月的深夜，我看見一隻長著鹿角的海馬，比我的船還長，在月光下慢慢游過灣口。'); },1600); }; },750); }
const KY={v:0,w:0,thr:0,turn:0,wake:0,ptr:null,x0:0,y0:0,zone:-1};
const joy=$('joy'), joyK=$('joyK');
function joyMove(e){ if(e.pointerId!==KY.ptr) return; let dx=(e.clientX-KY.x0)/45, dy=(e.clientY-KY.y0)/45; const L=Math.hypot(dx,dy); if(L>1){ dx/=L; dy/=L; }
  KY.thr=-dy; KY.turn=dx; joyK.style.transform=`translate(${(dx*34).toFixed(0)}px,${(dy*34).toFixed(0)}px)`; }
joy.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); Snd.init(); try{ joy.setPointerCapture(e.pointerId); }catch(_){} KY.ptr=e.pointerId; const r=joy.getBoundingClientRect(); KY.x0=r.left+r.width/2; KY.y0=r.top+r.height/2; joyMove(e); });
joy.addEventListener('pointermove',joyMove);
const joyEnd=e=>{ if(e.pointerId!==KY.ptr) return; KY.ptr=null; KY.thr=0; KY.turn=0; joyK.style.transform=''; };
joy.addEventListener('pointerup',joyEnd); joy.addEventListener('pointercancel',joyEnd);
function zoneOf(x,z){ let best=G.spot, bd=22; for(let i=1;i<SPOTS.length;i++){ const s=SPOTS[i]; if(s.loc==='sea') continue; if(s.req==='mer1'&&!(save.mer&&save.mer.n>=1)) continue; const d=Math.hypot(x-s.pos[0],z-s.pos[1]); if(d<bd){ bd=d; best=i; } } return best; }
// 握槳時把竿子降低、竿尖朝前放倒在船裡（pk＝握槳程度 0～1）
function stowRod(pk){ P.rodGroup.position.set(0,-.55*pk,.1*pk); P.rodGroup.rotation.x=-.75*pk; }
const boatStationButton=document.createElement('button');boatStationButton.id='boatStation';boatStationButton.hidden=true;boatStationButton.className='btn';boatStationButton.style.cssText='position:fixed;right:16px;bottom:calc(210px + env(safe-area-inset-bottom));z-index:25;padding:12px 16px;border-radius:22px;background:#163b37;color:#fff;border:1px solid #c6ab6c;font:600 14px sans-serif';document.body.appendChild(boatStationButton);
function switchBoatStation(){if(!SPOTS[G.spot].yacht||G.state!=='idle')return;G.boatStation=G.boatStation==='helm'?'fishing':'helm';KY.v=KY.w=KY.thr=KY.turn=0;G.yaw=G.yawT=0;toast(G.boatStation==='helm'?'駕駛座：搖桿控制航行，停船後返回側舷釣位':'船艉側舷釣位：已停船，向船外拋竿');}
boatStationButton.addEventListener('click',switchBoatStation);
function updateKayak(dt){
  if(HOME3D.active()){ boatStationButton.hidden=true;joy.classList.remove('hidden'); Snd.engine(false,0,0); return; }
  const s=SPOTS[G.spot], can=(s.kayak||(s.yacht&&G.boatStation==='helm'))&&G.state==='idle'&&!document.body.classList.contains('catching');
  joy.classList.toggle('hidden',!can);
  const z=s.kayak?zoneOf(G.base.x,G.base.z):G.spot; if(z!==KY.zone){ KY.zone=z; WL.setZone(z); }
  boatStationButton.hidden=!(s.yacht&&G.state==='idle'&&!HOME3D.active());boatStationButton.textContent=G.boatStation==='helm'?'🎣 返回釣位':'🚤 前往駕駛座';
  let thr=KY.thr, turn=KY.turn;
  if(keys.KeyW) thr=1; if(keys.KeyS) thr=-.6; if(keys.KeyA) turn=-1; if(keys.KeyD) turn=1;
  if(!can){ thr=0; turn=0; if(s.yacht){KY.v=0;KY.w=0;} }
  Snd.engine(!!s.yacht&&G.boatStation==='helm'&&G.state!=='travel',Math.abs(KY.v)/16.5,Math.abs(thr));   /* 遊艇引擎聲：站上駕駛座發動，船速越快越響 */
  if(!s.kayak&&!s.yacht){ KY.v=0; KY.w=0; G.boatV=0; G.boatW=0; WL.paddle(dt,0); stowRod(WL.padOn()); return; }
  KY.v+=(thr*(s.yacht?9.9:1.5)-KY.v*(s.yacht?.6:.65))*dt;   /* 17 呎中控台釣魚艇＋90 匹船外機：極速約每秒 16.5 公尺（約 32 節），約 4 秒衝到八成 */   /* 遊艇雙引擎全速約每秒 22 公尺（約 43 節，運動型釣魚遊艇的極速），約 4 秒內衝到八成；獨木舟約 2.3 公尺 */ KY.w+=(turn*.55*(.4+Math.min(1,Math.abs(KY.v)))-KY.w)*Math.min(1,dt*3);
  WL.paddle(dt,s.yacht?0:clamp(Math.max(Math.abs(thr),Math.abs(turn)*.7),0,1),AT.ring);   // 遊艇靠引擎，不划槳
  stowRod(s.yacht&&G.boatStation==='helm'?1:WL.padOn());
  G.boatV=KY.v; G.boatW=KY.w;   /* 遊艇的姿態（抬頭、轉彎側傾）與艏浪、航跡依船速計算 */
  if(Math.abs(KY.v)<.002&&Math.abs(KY.w)<.002) return;
  G.head-=KY.w*dt;
  const fx=-Math.sin(G.head), fz=-Math.cos(G.head);
  let nx=G.base.x+fx*KY.v*dt, nz=G.base.z+fz*KY.v*dt;
  const r=Math.hypot(nx,nz), Rm=W.shoreR(Math.atan2(nx,-nz))-5; if(r>Rm){ nx*=Rm/r; nz*=Rm/r; KY.v*=-.2; }
  if(G.loc!=='sea'&&Math.abs(nx)<2.2&&nz>-4.6&&nz<7){ if(2.2-Math.abs(nx)<nz+4.6){ nx=nx<0?-2.2:2.2; } else nz=-4.6; KY.v*=.3; }
  // Sweep the boat through the same visible structures, excluding its own hull.
  const boxes=PH.boxes; PH.boxes=boxes.filter(b=>b.label!=='船體'&&b.label!=='睡蓮葉');
  const boatHit=PH.move({x:G.base.x,y:0,z:G.base.z},{x:nx,y:0,z:nz},s.yacht?1.8:.55);
  PH.boxes=boxes; nx=boatHit.pos.x; nz=boatHit.pos.z; if(boatHit.contact) KY.v*=.4;
  G.base.x=nx; G.base.z=nz;
  if(Math.abs(thr)>.1) G.yawT+=(0-G.yawT)*Math.min(1,dt*1.5);
  KY.wake-=dt; const spd=Math.abs(KY.v);
  if(!s.yacht&&spd>.25&&KY.wake<=0){   /* 遊艇的艏浪與航跡由 wake.js 畫（留在水上、往外散開），這裡的水圈只給獨木舟 */ KY.wake=.4; AT.ring(G.base.x-fx*1.9,G.base.z-fz*1.9,.6+spd*.5); AT.ring(G.base.x+fx*1.8,G.base.z+fz*1.8,.3+spd*.3); if(spd>.9) P.splash(G.base.x+fx*1.9,0,G.base.z+fz*1.9,3,.3); }
}
// 任何一個面板（釣具店、手記、天賦與挑戰、霜汐對話、故事）打開時，主畫面上浮著的按鈕（拍照、駕駛座、距離標記）都要收起來，不能蓋在面板上
{ const st=document.createElement('style'); st.textContent='body.sheetOn #boatStation{display:none!important}'; document.head.appendChild(st);
  const PANELS=['sheet','talBox','moonBox','storyBox'].map(id=>document.getElementById(id)).filter(Boolean);
  const sync=()=>document.body.classList.toggle('sheetOn',PANELS.some(e=>!e.classList.contains('hidden')));
  const mo=new MutationObserver(sync); PANELS.forEach(e=>mo.observe(e,{attributes:true,attributeFilter:['class']})); sync(); }
const fadeEl=$('fade'), uwTag=$('uwTag');
// 診斷：替幾個可能很重的動作計時，長任務就能指名是誰（存檔、換釣點、場景釋放、避障路徑、小屋進出）
if(window.__DIAG&&window.__DIAG.timed){ const D=window.__DIAG; persist=D.timed('存檔',persist); startRetrieve=D.timed('收線路徑',startRetrieve); goSpot=D.timed('換釣點',goSpot);
  for(const [o,k,n] of [[WL,'setSpot','載入釣點場景'],[WL,'setZone','載入水域'],[W,'suspendEffects','釋放場景顯示資源'],[PH,'route','避障路徑'],[HOME3D,'enter','進小屋'],[HOME3D,'exit','離開小屋']]) if(o&&typeof o[k]==='function') o[k]=D.timed(n,o[k]); }
// 切到背景：把湖區的幾何、貼圖、倒影、陰影從顯示卡釋放，背景時佔的記憶體小很多，比較不會被手機系統直接結束；回來時黑幕下重新上傳
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ if(['idle','wait','bite','lure','retrieve'].includes(G.state)&&W.suspendEffects){ try{ W.suspendEffects(); G.bgReleased=true; window.__DIAG?.event('bg-release'); }catch(_){} } }
  else if(G.bgReleased){ G.bgReleased=false; fadeEl.classList.add('on'); fadeOutWhenReady(); } }); window.__HOMEOK=()=>HOME.unlocked();
let uwBusy=false;
function enterUW(){ if(UW.active()||uwBusy||(G.uwBlock&&G.t<G.uwBlock)) return; uwBusy=true; fadeEl.classList.add('on');
  setTimeout(()=>{ if(G.fd&&(G.state==='wait'||G.state==='bite')){ UW.start(G.fd); document.body.classList.add('underwater'); if(G.state==='bite') UW.bite(); const r=RAR[G.fd.sp.rar];
    // 水下特寫顯示眼前魚種與學名，物品仍保留發現提示。
    const L=G.fd.L||.3, hint=G.fd.item?'好像勾到什麼東西…':L>1.2?'水裡有個很大的影子…':L>.6?'看起來不小…':L>.3?'有東西靠過來了…':'小小的影子在打轉…';
    uwTag.style.setProperty('--rc',r.col||'#9cae84'); $('uLv').textContent=G.fd.lvl||1; $('uName').textContent=G.fd.item?'水下發現':G.fd.sp.name; $('uRar').textContent=G.fd.item?hint:(r.name||r.n||'')+' · '+(G.fd.sp.sci||'正在接近魚餌'); uwTag.classList.remove('hidden');
    if(!G.fd.item&&(G.fd.sp.rar||0)>=2) Snd.rumble&&Snd.rumble(); }
    fadeEl.classList.remove('on'); uwBusy=false; },180); }
// 強制面對威脅（鯊魚、鱷魚、林秋月）：鏡頭轉向攻擊者（可超過平常的轉頭限制），持續一段時間後回到原本視角；水下鏡頭立刻關閉且幾秒內不重開
function faceThreat(pos,opt){ opt=opt||{}; if(!pos) return; G.look={x:pos.x,z:pos.z,until:G.t+(opt.dur||2.4),snap:!!opt.snap,prev:G.look?G.look.prev:G.yawT,pitch:opt.pitch||0}; exitUW(); G.uwBlock=G.t+5; }
window.__FACE=faceThreat;
let uwExiting=false;
function exitUW(){ document.body.classList.remove('underwater'); uwTag.classList.add('hidden'); if(!UW.active()||uwExiting) return; uwExiting=true; fadeEl.classList.add('on'); setTimeout(()=>{ UW.end(); fadeEl.classList.remove('on'); uwExiting=false; },160); }
// 水下鏡頭只屬於「等魚、咬餌」：任何原因離開這兩個狀態（鱷魚、斷線、拉魚…）都自動關掉
function guardUW(){ if(UW.active()&&!uwExiting&&G.state!=='wait'&&G.state!=='bite') exitUW(); }

/* ---------- 每幀更新 ---------- */
function updateFight(dt){
  // 天賦等級（沒有天賦系統時一律當 0）
  const talR=k=>window.__TAL&&window.__TAL.rank?window.__TAL.rank(k):0, ttlF=k=>window.__TAL&&window.__TAL.titleFx?window.__TAL.titleFx(k):0;
  if(easy()&&!G.fd.practice){
    const f=G.f,boat=!!(SPOTS[G.spot].kayak||SPOTS[G.spot].yacht);f.assistT=(f.assistT||0)+dt;f.T=.35;f.brk=0;f.slk=0;f.abr=0;f.lostWhy=null;
    if(boat&&!G.fd.item&&!G.fd.sp.special){
      f.stam=0;f.run=false;
      const target=fishingLandingTarget(PH,(G.angler||G.base),f.pos,G.fd.L),r=Math.max(.12,G.fd.L*.22),path=PH.route(f.pos,target,r+.04);
      let budget=Math.max(8,Math.hypot(target.x-f.pos.x,target.z-f.pos.z)/Math.max(.08,window.__ASSIST.policy.fishSeconds-f.assistT))*dt;
      for(let i=1;i<path.length&&budget>0;i++){const to=path[i],d=Math.hypot(to.x-f.pos.x,to.y-f.pos.y,to.z-f.pos.z),step=Math.min(d,budget),k=step/Math.max(.00001,d),want={x:f.pos.x+(to.x-f.pos.x)*k,y:f.pos.y+(to.y-f.pos.y)*k,z:f.pos.z+(to.z-f.pos.z)*k};setPoint(f.pos,PH.move(f.pos,want,r).pos);budget-=step;if(step<d)break;}
      f.d=Math.hypot(f.pos.x-(G.angler||G.base).x,f.pos.z-(G.angler||G.base).z);f.theta=Math.atan2(-(f.pos.x-(G.angler||G.base).x),-(f.pos.z-(G.angler||G.base).z))-f.az0;
      bob.position.set(f.pos.x,W.swell(f.pos.x,f.pos.z,G.t)-.08,f.pos.z);rod.end=G.endV.copy(f.pos);rod.bendT=.5;
      setAct('自動收魚','魚靠船邊後自動使用抄網',false);
      if(f.assistT>=window.__ASSIST.policy.fishSeconds&&fishingLanding(PH,(G.angler||G.base),f.pos,G.fd.L,true).near){f.netted=true;land();}
    }else if(f.assistT>=window.__ASSIST.policy.fishSeconds)land();
    return;
  }
  const f=G.f, sp=G.fd.sp, fs=sp.f, fd=G.fd;
  if(f.pos&&G.loc!=='ice'){ f.d=Math.hypot(f.pos.x-(G.angler||G.base).x,f.pos.z-(G.angler||G.base).z); }
  f.ft=(f.ft||0)+dt; f.maxT=Math.max(f.maxT||0,f.T); if(f.run&&!f.wasRun) f.runs=(f.runs||0)+1; f.wasRun=f.run;   // 搏魚統計：時間、最高張力、衝刺次數
  const ST=styOf(fd.sp.id), DF=fd.practice?DIFF.easy:D();
  f.phaseT-=dt;
  if(f.phaseT<=0){
    if(f.run){ f.run=false; f.ev=null; f.phaseT=rand(ST.rest[0],ST.rest[1])*(1.3-fs.agi*.3); f.latDir=0; }
    else { f.run=true; f.phaseT=rand(ST.run[0],ST.run[1]); f.latDir=Math.abs(f.theta)>.45?-Math.sign(f.theta):(Math.random()<.5?-1:1); vib(25);
      if(ST.ev&&f.stam>15&&Math.random()<ST.evP){ f.ev={k:ST.ev,t:0};
        if(ST.ev==='long'){ f.phaseT*=1.6; toast('魚在長距離狂奔！先放線','warn',1400); }
        else if(ST.ev==='shake') toast('魚在甩頭！放手卸力！','warn',1200);
        else if(ST.ev==='dive'){ f.phaseT=Math.max(f.phaseT,2.6); toast('魚往水底鑽！穩住別硬拉','warn',1400); } } }
  }
  if(f.ev) f.ev.t+=dt;
  const shake=(f.ev&&f.ev.k==='shake'&&f.ev.t<1.15&&((f.ev.t/.28)%1)<.45)?1:0;
  const dive=(f.ev&&f.ev.k==='dive')?1:0;
  if(shake&&!f.shV) vib(30); f.shV=shake;
  // 掛鉤品質：揚竿不完美時，魚甩頭又剛好線鬆、或魚躍出水面你還硬拉，就可能把鉤甩掉
  if(shake&&f.T<.18&&!fd.item&&Math.random()<dt*1.6*(1-f.hq)) { f.lostWhy='shook'; }
  if(f.jumpT>0&&G.held&&f.T>.85&&!fd.item&&Math.random()<dt*1.2*(1.15-f.hq)) { f.lostWhy='jump'; }
  const stamF=.4+.6*f.stam/100;
  const F=fs.pow*(.8+.25*Math.pow(fd.w,.45))*(1+.22*sp.rar)*(fd.boss?fd.boss.pow*(1-.03*talR('calm'))*(1-ttlF('boss')):1)*stamF*(f.run?ST.mul:1)*(dive?1.35:1);
  const good=-f.latDir*G.rodSide, steerMul=1-.28*clamp(good,0,1)+.15*clamp(-good,0,1);
  // Contact and line wear are evaluated after the swept fish motion below.
  // 魚種的線組容錯（f.win）：牙齒會咬線、嘴巴骨質硬容易脫鉤、會往礁洞鑽磨線的魚，同樣的拉力下線更容易斷
  let Tt=(F*(G.held?1:.35)+(G.held?.5:0))/(META.gear().line.s*DF.line*(fs.win||1))*steerMul*META.gear().rod.tens;
  if(f.jumpT>0&&G.held) Tt+=.45;
  if(shake) Tt+=G.held?.38:.12;
  Tt+=(Math.sin(G.t*13.1)+Math.sin(G.t*7.3))*.015*(f.run?2:1)*DF.jit;
  // 洩力：鬆／中／緊。拉力超過洩力門檻的部分改成出線（魚把線拉走），而不是全部變成張力
  const dcap=.66+.28*f.drag, over=Math.max(0,Tt-dcap); if(over>0){ Tt=dcap+over*.3; f.d+=over*2.2*dt; if(Math.random()<dt*8) Snd.click(4800); }
  f.T+=(Tt-f.T)*Math.min(1,dt*5);
  if(f.T>.9) f.brk+=dt*(f.T-.9)*14*META.gear().reel.drag*(1-.05*TR('power')); else f.brk=Math.max(0,f.brk-dt*.8);
  // 線太鬆：只有「沒在收線」而且張力過低時才累積——按住收線時線一定是繃的；小魚、漂流物本來就拉不出張力，不能因此判脫鉤
  const lightCatch=!!(fd.item||fs.pow<.7||fd.w<.25);   // 漂流物、遺物（fd.item）、力氣很小或很輕的魚
  if(f.T<.1&&!G.held&&!lightCatch) f.slk+=dt/(2.8*DF.slack); else f.slk=Math.max(0,f.slk-dt*(G.held?3:1.5));
  const zone=f.T>.4&&f.T<.8;
  const drain=(3+18*f.T)*(1+.8*clamp(good,0,1))*(zone?1.2:1)/(fs.stam*DF.stam*(.7+.25*Math.sqrt(fd.w))*(fd.boss&&fd.boss.stam||1)/((1+.05*talR('fight'))*(1+ttlF('stam'))));   /* Boss 的耐力倍率：越後面的 Boss 遛越久；搏魚天賦讓魚體力掉得快 */
  f.stam=clamp(f.stam-drain*(window.__ECO&&window.__ECO.fxOn('meal_str')?1.3:1)*dt+(f.T<.2?2.5*dt:0),0,100);
  const reel=G.held?(.75+.45*f.drag)*META.gear().reel.spd*clamp(1.25-f.T,.15,1)*(f.stam<8?1.4:1)*(zone?1.15:1)*(dive?.3:1):0;
  const run=f.run?fs.spd*ST.spd*stamF*1.5*(G.held?.35:1)*(dive?.4:1)*(fd.boss?(fd.boss.spd||1)*(1-.03*talR('calm'))*(1-ttlF('boss')):1):(G.held?0:.05);   /* Boss 的衝刺速度倍率：衝得越快越容易把線放光，捲線器的速度與線量就變得重要 */
  f.d=Math.max(0,f.d+(run-reel)*dt);
  f.theta=clamp(f.theta+f.latDir*fs.agi*ST.lat*.16*stamF*dt*(G.held?.7:1),-.85,.85);
  let az=f.az0+f.theta; { fishPos(tv,0); const r=Math.hypot(tv.x,tv.z), Rm=W.shoreR(Math.atan2(tv.x,-tv.z))-3; if(r>Rm) f.d=Math.max(2,f.d-(r-Rm)); }
  if(G.loc!=='ice'){
    const old=f.pos.clone(), want=new T.Vector3((G.angler||G.base).x-Math.sin(az)*f.d,f.pos.y,(G.angler||G.base).z-Math.cos(az)*f.d);
    // Lateral rod pressure changes the fish's path, not merely the tension number.
    want.x+=Math.cos(az)*G.rodSide*dt*1.6; want.z-=Math.sin(az)*G.rodSide*dt*1.6;
    if(G.loc!=='sea'){ const Rm=W.shoreR(Math.atan2(want.x,-want.z))-3,r=Math.hypot(want.x,want.z); if(r>Rm){want.x*=Rm/r;want.z*=Rm/r;} }
    const moved=PH.move(old,want,Math.max(.12,fd.L*.22)); setPoint(f.pos,moved.pos);
    const landing=fishingLanding(PH,(G.angler||G.base),f.pos,fd.L,!!(SPOTS[G.spot].kayak||SPOTS[G.spot].yacht),G.spot===0);
    const lineHit=PH.hit(rod.tipW,f.pos,.025,box=>!(landing.near&&box.label==='船體')); f.cover=lineHit?1:0;
    if(moved.contact){ f.latDir=G.rodSide>.05?-1:G.rodSide<-.05?1:-f.latDir||1; f.theta+=f.latDir*dt*.3; }
    if(lineHit){
      f.abr+=dt*(.025+.22*f.T)*(G.held?1.7:.35)/((.7+.3*META.gear().line.s)*DF.line*((G.fd&&G.fd.sp.f.win)||1));
      if(!f.rubW){f.rubW=1;toast('魚線碰到'+lineHit.box.label+'！放手降低張力，左右控竿尋找能把魚帶出的角度','warn',2800);}
      // Reeling against a bend cannot pull the fish through the object.
      if(G.held){ f.T=Math.min(1.2,f.T+dt*.3); f.brk+=dt*.14*f.T; }
    }else f.rubW=0;
    ui.tBar.classList.toggle('rub',!!lineHit);
    f.d=Math.hypot(f.pos.x-(G.angler||G.base).x,f.pos.z-(G.angler||G.base).z);
    const actual=Math.atan2(-(f.pos.x-(G.angler||G.base).x),-(f.pos.z-(G.angler||G.base).z));
    f.theta=Math.atan2(Math.sin(actual-f.az0),Math.cos(actual-f.az0)); az=f.az0+f.theta;
  }
  if(G.held){ f.clickA+=reel*dt*9; while(f.clickA>=1){ Snd.click(); f.clickA-=1; } rod.spin-=reel*dt*14; }
  else if(f.run&&f.T>.3){ f.clickA+=dt*28; while(f.clickA>=1){ Snd.click(4500); f.clickA-=1; } }
  f.vibT-=dt; if(f.vibT<=0){ if(f.T>.85){ vib(14); f.vibT=.22; } else if(f.run){ vib(Math.round(5+8*f.T)); f.vibT=.32; } else f.vibT=.2; }
  fishPos(tv,0);
  // 搏魚翻白：魚在水面附近掙扎就攪出白沫，衝刺、甩頭越用力越大片，游過的地方留下慢慢散開的泡沫尾跡；魚往深處鑽時水面只剩零星泡沫
  if(P.foam&&G.loc!=='ice'&&!(f.jumpT>0)){ const depth=Math.max(0,-((f.pos&&f.pos.y)||0)), nearS=clamp(1-depth/2.6,.12,1), I=clamp((.22+.55*f.T+(f.run?.45:0)+(shake?.35:0))*nearS,0,1.5), L=fd.L||.5;
    f.foamT=(f.foamT||0)-dt; while(f.foamT<=0){ f.foamT+=1/(4+22*I); const j=.22*L+.08; P.foam(tv.x+(Math.random()-.5)*j,tv.z+(Math.random()-.5)*j,(.32+.55*L)*(.7+.6*Math.random())*(.6+.5*I),1.3+1.9*Math.random(),Math.min(1,.4+.5*I)); }
    f.sprayT=(f.sprayT||0)-dt; if(f.sprayT<=0){ f.sprayT=rand(.3,1)/Math.max(.35,I); if(I>.5) P.splash(tv.x,.02,tv.z,Math.round(4+10*I),.22+.35*I); } }
  f.ripT-=dt; if(f.ripT<=0){ f.ripT=f.run?rand(.12,.3):rand(.4,.8); W.addRipple(tv.x,tv.z,.15+.35*f.T+(f.run?.12:0)); if(f.run) P.splash(tv.x,0,tv.z,Math.round(3+8*f.T),.25+.35*f.T); }
  // 跳水
  const g=G.fish.group;
  if(f.jumpT>0){
    f.jumpT-=dt; const s=1-f.jumpT/f.jumpDur, h=.5+.45*Math.sqrt(fd.L), y=4*h*s*(1-s)-.15*fd.L;
    { const q=PH.move(f.pos,{x:tv.x,y,z:tv.z},Math.max(.12,fd.L*.22)); g.position.set(q.pos.x,q.pos.y,q.pos.z); } te.set(0,az+(f.latDir<0?Math.PI:0)+Math.PI/2,clamp(4*h*(1-2*s)/(1.2*fd.L+.5),-1.2,1.2)); g.quaternion.setFromEuler(te);
    G.fish.uni.uAmp.value=.14; G.fish.uni.uSwim.value+=dt*18;
    if(f.jumpT<=0){ g.visible=false; P.splash(tv.x,0,tv.z,30,1.1); W.addRipple(tv.x,tv.z,.9); Snd.splash(1); if(P.foamBurst) P.foamBurst(tv.x,tv.z,12,.5+.5*(fd.L||.5)); }
  } else if(f.run&&fs.jump>0&&fd.sp.special!=='mermaid'&&f.stam>20&&f.d>4&&G.loc!=='ice'&&Math.random()<fs.jump*.3*dt) startJump();
  // 魚影
  const sh=P.shadow; sh.position.set(tv.x-Math.sin(az)*.4,.012,tv.z-Math.cos(az)*.4); sh.rotation.y=az+(f.latDir<0?-Math.PI/2:Math.PI/2); sh.scale.setScalar(fd.L*1.15);
  sh.material.opacity=f.jumpT>0?0:.4*(1-sstep(3,10,f.d));
  // 水面下看得到掙扎的魚：離船 14 公尺內就把魚本體放在水面下，透過水面的折射與吸收看到魚身左右甩、翻身；甩頭時尾巴拍水，水花朝甩的方向噴出一道弧
  if(!(f.jumpT>0)){ const vis=!fd.item&&G.loc!=='ice'&&f.d<14&&fd.sp.special!=='mermaid'; g.visible=vis;
    if(vis){ const L=fd.L||.5, dep=Math.max(0,-(f.pos.y||0)), thr=(f.run||shake)?1:.35;
      // 魚頭朝向：衝刺時朝外跑；你收線、魚沒在衝時，魚被線拉著頭轉向船（魚嘴掛著線）；轉向是慢慢轉過去的
      const tgtY=(G.held&&!f.run)?az+Math.PI*1.5:az+(f.latDir<0?Math.PI:0)+Math.PI/2; if(f.headY===undefined) f.headY=tgtY;
      const dY=((tgtY-f.headY)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI; f.headY+=dY*Math.min(1,dt*3); const yaw=f.headY+Math.sin(G.t*3.1)*.28*thr;
      g.position.set(tv.x,-(.2+.18*L)-dep*.6,tv.z); te.set(Math.sin(G.t*9.5)*.38*thr,yaw,0,'YXZ'); g.quaternion.setFromEuler(te); te.order='YZX'; G.fish.uni.uAmp.value=.08+.16*thr; G.fish.uni.uSwim.value+=dt*(6+16*thr);
      f.slapT=(f.slapT||0)-dt; if(f.slapT<=0&&thr>.9&&dep<1.2){ f.slapT=rand(.45,1.2); const s=Math.random()<.5?1:-1, tx=Math.cos(yaw)*s, tz=-Math.sin(yaw)*s; P.splash(tv.x,.02,tv.z,Math.round(8+10*L),.35+.3*Math.min(1.5,L),tx,tz); W.addRipple(tv.x,tv.z,.25+.2*L); if(P.foam) P.foam(tv.x+tx*.3*L,tv.z+tz*.3*L,.45+.4*L,1.6,.9); }
      // 衝刺時貼著水面劃出 V 形尾浪：沿著游的方向往後兩側各留一串小漣漪
      f.wakeT=(f.wakeT||0)-dt; if(f.run&&dep<.8&&f.wakeT<=0){ f.wakeT=.12; const bx=Math.sin(az), bz=Math.cos(az), px=-bz, pz=bx; for(const sd of [-1,1]) W.addRipple(tv.x+bx*.3*L+px*sd*.35*L,tv.z+bz*.3*L+pz*sd*.35*L,.08+.05*L); } } }
  // 浮標與釣竿
  { const pull=clamp(f.T*1.1+(f.run?.15:0),0,1);   // 浮標被拖進水裡、朝釣竿方向傾斜
    { const rt=rod.tipW, k=Math.min(.35,1.2/Math.max(2,f.d)); bob.position.set(tv.x+(rt.x-tv.x)*k,W.swell(tv.x,tv.z,G.t)-.03-.28*pull+Math.sin(G.t*9)*.012*(f.run?1:.4),tv.z+(rt.z-tv.z)*k); const q=PH.move(tv,bob.position,.065); setPoint(bob.position,q.pos); }   // 浮標沿魚線移動並避開實體
    bob.rotation.set(-.6*pull,0,Math.sin(G.t*7)*.25*(1-pull*.6)); bob.visible=!(f.jumpT>0)&&!G.bottom; }
  { const load=clamp(.25+.35*Math.min(1,fd.w/3),.25,.6), jit=(f.run||shake)?Math.sin(G.t*38)*.05*(.5+f.T):0;   // 掛上魚就有弧度，張力再加深，衝刺甩頭時竿尖抖動
    rod.end=G.endV.copy(f.pos||tv); rod.pitchT=.18+.08*f.T; rod.bendT=clamp(load+.85*f.T+(f.run?.12:0)+jit,0,1.25);
    // 竿子跟著魚：魚往哪邊衝，竿身就被往那邊拖過去；衝刺時再往下壓
    rod.side=clamp((rod.side||0)+((G.rodSide||0)*.5+clamp(f.theta*.7,-.4,.4)-(rod.side||0))*Math.min(1,dt*3),-.6,.6); /* 竿子跟著魚擺，但不會甩出畫面 */ rod.pitchT-=(f.run?.06:0)+.05*f.T; }
  G.yawT=clamp(az-G.head-(G.fishingYaw||0),-.95,.95);
  // HUD
  ui.tFill.style.width=(f.T*100).toFixed(1)+'%'; ui.tFill.style.background=f.T<.65?'var(--good)':f.T<.9?'var(--warn)':'var(--bad)';
  ui.tBar.classList.toggle('danger',f.T>.9); ui.fTens.textContent=Math.round(f.T*100)+'%';
  ui.sFill.style.width=f.stam.toFixed(1)+'%'; ui.fStam.textContent=Math.round(f.stam)+'%';
  ui.fDist.textContent=f.d.toFixed(1)+' m'; ui.fName.textContent=(fd.boss?'👑 '+fd.boss.name+'　':'')+stars(fd)+' '+sizeWord(fd.w)+(dive?'，往深處鑽':shake?'，甩頭中':f.run?'，正在衝刺':'')+WL.chaseTxt();
  if(f.latDir!==0){ ui.steer.classList.remove('hidden'); ui.steer.textContent=f.latDir>0?'◀ 往左拉竿':'往右拉竿 ▶'; ui.steer.classList.toggle('ok',good>.4); }
  else ui.steer.classList.add('hidden');
  if(f.slk>.3&&!f.slkW){ f.slkW=1; vib([40,40,40]); } if(f.slk<.1) f.slkW=0; ui.tBar.classList.toggle('slack',f.slk>.3);
  setAct(G.held?'收線中':'按住<br>收線', f.cover>.55?'🪨 線在磨！往反方向拉竿，把魚帶離障礙物':f.slk>.3?'⚠️ 線太鬆了，快按住收線！':f.run&&G.held&&f.T>.8?'魚在衝刺，先放手！':!f.run&&!G.held?'魚停了，快按住收線':'魚往哪游，就往反方向滑動拉竿', false);
  if(WL.stolen()) return lose('gator');
  if(SEA.stolen()) return lose('shark');
  if(f.brk>=1){ if(window.__ECO&&window.__ECO.useLeader()){ f.brk=.35; toast('⛓️ 鋼絲前導線撐住了！','good',1600); vib(60); } else return lose('snap'); }
  if(f.abr>=1){ if(window.__ECO&&window.__ECO.useLeader()){ f.abr=.4; f.cover=.2; toast('⛓️ 鋼絲前導線擋住了磨擦！','good',1600); vib(60); } else return lose('rub'); }
  if(f.slk>=1) return lose('slack');
  if(f.lostWhy) return lose(f.lostWhy);
  if(f.d>maxLine()*.7) f.stam=Math.max(0,f.stam-dt*(f.d/maxLine())*8);   /* 線快放光時捲線器剩下的線越少、阻力越大，魚衝不動、體力掉得快 */
  if(f.d>maxLine()) return lose('spool');
  const landing=fishingLanding(PH,(G.angler||G.base),f.pos||tv,fd.L,!!(SPOTS[G.spot].kayak||SPOTS[G.spot].yacht),G.spot===0);
  if(G.loc==='ice')landing.near=f.d<2.6;
  if(!landing.near||f.cover>=.5){f.netOn=false;f.netGo=false;f.calmT=0;f.runT=0;ui.netBtn.classList.add('hidden');}
  if(landing.boat&&!landing.near&&landing.gap<1.5) setAct(G.held?'收線中':'按住<br>收線','魚靠在遠側船身，左右控竿把魚帶到船頭或近側船邊',false);
  if(f.cover<.5&&landing.near){
    // 魚還有力氣就拉不上來：靠近時再衝出去，要遛到沒力才能收進來
    // 衝出去會消耗魚的體力，最多衝兩次；體力低於 45% 或衝過兩次就拉得上來
    f.surges=f.surges||0; if(f.stam<=45||f.surges>=2){
      const big=!fd.item&&!fd.sp.special&&(landing.boat||fd.w>3||(fd.u>.9&&fd.w>1.5)||fd.boss); /* 船釣一般魚都可抄網；岸釣保留大魚抄網。 */ if(!big) return land();
      // 大魚要抄網：魚靠近又沒在衝刺時按「抄網」才算起魚；急著在牠衝刺時抄網會讓牠再衝出去
      if(!f.netOn){ f.netOn=true; ui.netBtn.classList.remove('hidden'); toast('🥅 魚已靠邊！放開收線，等魚停下後按「抄網」','good',2200); }
      // 按鈕即時顯示能不能抄：魚在衝＝灰色等待；魚停下＝亮起並震一下。魚剛開始衝的 0.4 秒內按下仍算成功
      if(f.run){ f.calmT=0; f.runT=(f.runT||0)+dt; ui.netBtn.textContent='⏳ 魚在衝，等一下'; ui.netBtn.style.background='rgba(255,255,255,.22)'; ui.netBtn.style.color='#fff'; }
      else { if(!(f.calmT>0)) vib(25); f.calmT=(f.calmT||0)+dt; f.runT=0; ui.netBtn.textContent='🥅 現在抄網！'; ui.netBtn.style.background='#7dff9a'; ui.netBtn.style.color='#0b3a14'; }
      setAct(f.run?'等待魚<br>停止衝刺':'🥅 抄網',f.run?'先放鬆，等魚穩定後再抄網':'魚在船邊，點擊主按鈕把網兜到魚身下方',false);
      if(f.netGo){ f.netGo=false; if(!f.run||f.runT<.4){ ui.netBtn.classList.add('hidden'); f.netted=true; return land(); } f.netOn=false; ui.netBtn.classList.add('hidden'); f.d+=3+Math.random()*2; surgeFish(); f.stam=Math.max(0,f.stam-10); toast('魚還在衝，被網子嚇到又衝出去了！','warn',1600); vib([30,30,60]); }
      return; }
    f.surges++; f.stam=Math.max(0,f.stam-25); f.d+=2+Math.random()*2; surgeFish(); f.run=true; f.phaseT=rand(1,1.8); P.splash(G.to.x,0,G.to.z,14,.8); vib([30,20,40]);
    if(!f.surgeTip){ f.surgeTip=1; toast('魚還有力氣，又衝出去了','warn',1500); } }
}

function update(dt,elapsed=dt){
  if(G.state!=='home')PH.refresh();
  if(document.body.dataset.fishingState!==G.state) document.body.dataset.fishingState=G.state;
  if(easy()&&!G.practiceCast){
    if(G.state==='wait'){ G.snag=false; G.noBait=false; G.nib=0; G.timer=Math.min(G.timer,.6); }
    if(G.state==='lure'){ G.easyLureT=(G.easyLureT||0)+dt; if(G.easyLureT>.6){ G.to.copy(bob.position); G.to.y=0; LURE.end(); if(!G.fd) prepFish(); bite(); } } else G.easyLureT=0;
    if(G.state==='bite'&&G.fd){ FUN.hookEnd(); hook(true); }
  }
  // 拉魚開始時記住拋竿瞄準的方向；離開拉魚（釣到、跑掉、斷線）就轉回去。放在最前面，不受後面任何錯誤影響
  // 離開拉魚：釣竿傾斜一律歸零，不受手指狀態影響
  if(G.prevSt==='fight'&&G.state!=='fight'){ G.yawT=G.aimYaw||0; G.rodSideT=0; }
  if(G.state==='fight'&&G.prevSt!=='fight') G.aimYaw=G.aimYawCast!=null?G.aimYawCast:G.yawT; G.prevSt=G.state;
  G.t+=elapsed; G.hour+=elapsed/(G.state==='tide'?240:40);   // 在泥灘上時間放慢 6 倍
  G.hSave=(G.hSave||0)+elapsed; if(G.hSave>10){ G.hSave=0; save.hour=((G.hour%24)+24)%24; persist(); }
  const info=W.setTime(G.hour);if(G.state==='home'){W.updateEnvironment(dt,G.t);updateKayak(dt);return;}W.update(dt,G.t); updateKayak(dt);
  if(keys.ArrowLeft||keys.ArrowRight){ const k=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0); if(G.state==='fight') G.rodSideT=k; else if(G.state==='idle'||G.state==='charge'||G.state==='wait'||G.state==='bite'||G.state==='lure') G.yawT=clamp(G.yawT-k*dt*1.2,-.95,.95); }
  G.rodSide+=(G.rodSideT-G.rodSide)*Math.min(1,dt*8); rod.side=G.rodSide;
  if(G.state!=='fight'){ rod.end=null; rod.bendT=.03; } bob.visible=!G.snapped&&!((G.drillK||0)>.5)&&!(G.bottom&&(G.state==='wait'||G.state==='bite'||G.state==='fight'))&&!(G.state==='fight'&&G.f&&G.f.jumpT>0); bob.rotation.set(0,0,0);
  let lineEnd=null, slack=.35, lineOn=!G.snapped, trem=0;
  const st=G.state;
  if(st==='intro'||st==='idle'||st==='charge'){
    rod.pitchT=st==='charge'?.15+.5*G.power:Math.sin(G.t*.8)*.01;
    if(st==='charge'){ G.chargeT+=elapsed; G.power=(1-Math.cos(G.chargeT*2.4))/2; setPower(G.power); setAct('放開<br>拋竿','力道條滿格時放開最遠',false); }
    else if(st==='idle'){ if(G.loc==='ice'){ if(!ICE.drilled()){ if(G.held) ICE.drill(easy()?dt*12:dt); setAct(G.held?'鑿冰中 '+Math.round(ICE.progress()*100)+'%':'按住<br>鑿冰洞','冰釣：先在前方鑿開冰洞',false); } else setAct('點擊<br>放線','把浮標從冰洞放下去',false); } else if(SPOTS[G.spot].yacht&&G.boatStation==='helm')setAct('返回<br>釣位','駕駛座：搖桿控制航行；停船後返回釣位',false);else setAct('按住<br>蓄力','左右拖曳畫面可以轉向瞄準',false); }
  }
  P.updateRod(dt);
  { const near=st==='idle'||st==='intro'||st==='charge'||(st==='cast'&&G.delay>0)||st==='retrieve'; const ts=near?1:2; bob.scale.setScalar(bob.scale.x+(ts-bob.scale.x)*Math.min(1,dt*(near?6:2.5))); }   // 浮標在手邊是真實大小，拋到遠處才放大方便看魚訊
  if(st==='idle'&&rod.guidesW&&rod.guidesW.length>3){ /* 沒拋竿時：像真的釣客把鉤子扣在竿上的掛鉤環，浮標貼著竿身中段，不在眼前晃 */
    G.idleF=Math.min(1,(G.idleF||0)+dt*1.5); hangPos(tv2b); bob.position.copy(tv2b).lerp(tv3b.copy(rod.guidesW[2]).add(tv4b.set(0,-.05,0)),sstep(0,1,G.idleF)); lineEnd=bob.position; slack=.02; }
  else if(st==='intro'||st==='idle'||st==='charge'){ G.idleF=0; hangPos(bob.position); lineEnd=bob.position; slack=.05; }
  else if(st==='cast'){
    stepFishingPhysics(elapsed,step=>{
    if(G.delay>0){ G.delay-=step; hangPos(bob.position); if(G.delay<=0) G.from.copy(bob.position); }
    else { G.castT+=step; const s=Math.min(1,G.castT/G.castDur);
      const old=bob.position.clone(), want=new T.Vector3(lerp(G.from.x,G.to.x,s),lerp(G.from.y,0,s)+4*G.apex*s*(1-s),lerp(G.from.z,G.to.z,s));
      const q=PH.move(old,want,.06,false); setPoint(bob.position,q.pos);
      if(q.contact){ G.castHit=q.contact; G.to.set(q.pos.x,0,q.pos.z); landBobber(); }

      if(G.castT>.25) rod.pitchT=.05; if(s>=1&&G.state==='cast') landBobber(); }
    return G.state==='cast';
    });
    lineEnd=bob.position; slack=.1; setAct('・・・','',false);
  }
  else if(st==='lure'){
      const ev=LURE.update(dt,G.held); bob.position.copy(LURE.pos()); lineEnd=bob.position; slack=.08; if(G.held){ rod.spin-=dt*14; if(Math.random()<dt*10) Snd.click(); }
      setAct(G.held?'收線中':'按住收線<br>點擊抽竿',LURE.interest()>.25?'魚在追！照這個節奏繼續':'按住收線、短按抽竿，找出魚喜歡的節奏',false);
      if(ev==='snag'){ const old=bob.position.clone(); G.to.set(old.x,0,old.z); G.state='wait'; G.bottom=false; const hit=LURE.contact(); const from=LURE.incoming(); LURE.end(); if(hit) tackleSnag(hit,from); }
      else if(ev==='strike'){ G.to.set(bob.position.x,0,bob.position.z); G.castDist=Math.hypot(G.to.x-(G.angler||G.base).x,G.to.z-(G.angler||G.base).z); { const ch=LURE.chaser(); if(ch){ ch.group.position.set(G.to.x,-.05,G.to.z); } } LURE.end(); if(!G.fd) prepFish(); P.splash(G.to.x,0,G.to.z,40,1.3); W.addRipple(G.to.x,G.to.z,.9); Snd.splash&&Snd.splash(1.2); vib([40,30,80]); bite(); toast('咬了！','good',900); }
      else if(ev==='lost'){ G.fd=null; toast('魚失去興趣游走了','warn',1400); }
      else if(ev==='done'){ LURE.end(); startRetrieve('路亞收回來了，這次沒有魚咬','warn'); LURE.bobberVis(true); }
    }
  else if((st==='wait'||st==='bite')&&G.snag){
    snagTick(dt); lineEnd=bob.position; slack=G.held?0:.14;
    setAct(G.held?'硬拉中':'放手解掛','先放手，再向側邊拖曳改變角度；持續硬拉會斷線',false);
  }
  else if(st==='wait'||st==='bite'){
    rod.pitchT=.05;
    const y=W.swell(G.to.x,G.to.z,G.t)-.005;
    if(st==='wait'){
      G.timer-=elapsed; if(G.dip>0) G.dip-=elapsed;
      if(G.noBait) G.timer=99;
      // 泰國蝦咬餌：先用螯抱住餌拖著走（浮標橫向慢慢移動），停下來開始吃才真正咬住；拖著走的時候揚竿只會拉到空鉤
      if(G.prawnDrag>0){ G.prawnDrag-=elapsed; const k=.16*elapsed; G.to.x+=G.dragDir.x*k; G.to.z+=G.dragDir.z*k; G.dragRip=(G.dragRip||0)-elapsed; if(G.dragRip<=0){ G.dragRip=.45; W.addRipple(G.to.x,G.to.z,.08); } if(G.prawnDrag<=0){ G.prawnDrag=0; bite(); } }
      else if(G.timer<=0){ if(G.nib>0){ G.nib--; nibble(); G.timer+=rand(.7,2.2); } else { if(!G.fd) prepFish(); if(G.fd&&G.fd.sp.id==='prawn'&&!G.prawnDone){ G.prawnDone=true; G.prawnDrag=rand(2.5,5); G.timer=99; const a=Math.random()*6.283; G.dragDir={x:Math.cos(a),z:Math.sin(a)}; W.addRipple(G.to.x,G.to.z,.15); Snd.nibble(); vib(10); } else bite(); } }
      if(G.state==='wait'&&G.nib===0&&G.timer<3&&!G.fd){ prepFish(); if(!G.fd.practice&&!G.fd.item&&(save.uw!==false||G.fd.sp.special==='mermaid')) enterUW(); }
      if(UW.active()&&G.state==='wait') UW.setProgress(1-G.timer/3);
      if(G.fd&&G.state==='wait'){ G.bubT=(G.bubT||0)-dt; if(G.bubT<=0){ G.bubT=rand(.25,.7); W.addRipple(G.to.x+rand(-.3,.3),G.to.z+rand(-.3,.3),.05); P.splash(G.to.x+rand(-.25,.25),0,G.to.z+rand(-.25,.25),1,.15); } }
      { const wv=WL.wind(), old=new T.Vector3(G.to.x,y,G.to.z), want=old.clone();
        if(!G.bottom){ want.x+=wv.x*wv.s*.05*dt; want.z+=wv.z*wv.s*.05*dt; }
        const q=PH.move(old,want,.065); G.to.x=q.pos.x; G.to.z=q.pos.z;
        if(q.contact) tackleSnag(q.contact,old);
      }
      const dip=G.dip>0?Math.sin((G.dip/(G.dipMax||.28))*Math.PI)*(G.dipAmp||.035):0;
      bob.position.set(G.to.x,y-dip,G.to.z);
      if(G.nib===0&&G.timer<3) G.approach=Math.min(1,G.approach+dt*.5);
      if(G.approach>0){ const a=G.t*.8; P.shadow.position.set(G.to.x+Math.cos(a)*.9,.012,G.to.z+Math.sin(a)*.9); P.shadow.rotation.y=-a; P.shadow.scale.setScalar(.45); P.shadow.material.opacity=.18*G.approach; }
      if(G.stealT>0){ G.stealT-=dt; const tap=Math.max(0,Math.sin(G.stealT*22))*.03; bob.position.y-=tap; if(Math.random()<dt*5) W.addRipple(G.to.x,G.to.z,.12); }   // 小魚一口一口啄餌：浮標快速點水
      if(G.noBait&&!(G.stealT>0)&&!G.bottom) bob.position.y+=.025*bob.scale.x;   // 餌沒了：浮標少了重量，浮得比較高
      if(G.inspDip>0){ G.inspDip-=dt; bob.position.y-=Math.sin(G.inspDip*18)*.02; bob.rotation.z=Math.sin(G.inspDip*14)*.25; }
      setAct(G.practiceCast?'等魚<br>咬餌':'收線',G.snag?'掛底了！左右拖曳改變拉線角度':UW.active()?'魚正在靠近餌……':G.bottom?'竿尖拉彎時，看量表起鉤':'浮標下沉時，看量表起鉤',false);
      if(G.bottom){ const dropFrom=bob.position.clone(); bob.position.y=-1.2; rod.bendT=.1+(G.dip>0?.22*Math.sin((G.dip/(G.dipMax||.28))*Math.PI):0)+Math.sin(G.t*1.3)*.012;   // 竿尖：試咬時輕抖、平常隨水流微微晃
        const hookAt=new T.Vector3(G.to.x,-1.2,G.to.z), q=PH.move(dropFrom,hookAt,.065,false);
        setPoint(bob.position,q.pos); if(q.contact) tackleSnag(q.contact,dropFrom);
      }

    } else {
      G.biteT+=elapsed; bob.position.set(G.to.x+Math.sin(G.biteT*3)*.15,G.bottom?-1.2:y-.13-.04*Math.sin(G.biteT*12),G.to.z+G.biteT*.2); if(G.bottom){ rod.bendT=.55+.08*Math.sin(G.biteT*14); rod.pitchT=-.02; }
      { const q=PH.move(new T.Vector3(G.to.x,y,G.to.z),bob.position,.065); setPoint(bob.position,q.pos); }
      P.shadow.material.opacity=0;
      setAct('起鉤','紅色＝還在試探別拉・藍色＝完美・黃色＝上鉤',true);
      if(FUN.advanceHook(elapsed)){FUN.pop('錯過','miss');missBite();}
    }
    lineEnd=bob.position; slack=.35;
    if(G.bottom){ const pull=st==='bite'?Math.min(1,G.biteT*1.5):0, tw=G.dip>0?.15:0;
      G.entry=G.entry||new THREE.Vector3(); G.entry.set(G.to.x*.82+(G.angler||G.base).x*.18+Math.sin(G.t*.4)*.12+pull*.6, W.swell(G.to.x,G.to.z,G.t), G.to.z*.82+(G.angler||G.base).z*.18+pull*.4);
      lineEnd=G.entry; slack=G.snag?.0:.22-.18*pull-tw;   // 魚咬時線被拉直；掛底時線完全繃直
      G.entT=(G.entT||0)-dt; if(G.entT<=0){ G.entT=pull>0?.25:rand(1.2,2.4); W.addRipple(G.entry.x,G.entry.z,pull>0?.22:.08); } }
  }
  else if(st==='fight'){ stepFishingPhysics(elapsed,step=>{updateFight(step);return G.state==='fight';}); if(G.state==='fight'){ const f=G.f; lineEnd=rod.end; slack=clamp(.1*(1-f.T*1.4),0,.1);   // 魚掛在線上：線幾乎繃直
      trem=(.012+.05*f.T)*(f.run?1.6:1); } }
  else if(st==='retrieve'){
    const path=G.retrievePath||[bob.position.clone(),rod.tipW.clone()];
    const retrieveSeconds=Math.max(0,window.__frameSeconds||dt);let budget=retrieveTravelBudget(path,G.retrieveNode,bob.position,G.retrieveClock||0,retrieveSeconds);G.retrieveClock=(G.retrieveClock||0)+retrieveSeconds;
    while(budget>0&&G.retrieveNode<path.length){
      const target=path[G.retrieveNode], old=bob.position.clone(), distance=old.distanceTo(target), step=Math.min(distance,budget);
      const want=old.clone().lerp(target,distance>.0001?step/distance:1), q=PH.move(old,want,.065);
      setPoint(bob.position,q.pos); budget-=step;
      if(q.contact){ G.state='wait'; G.bottom=false; G.to.set(q.pos.x,0,q.pos.z); tackleSnag(q.contact,old); break; }
      if(distance<=step+.001) G.retrieveNode++; else break;
    }
    // 還在水面段：浮標跟著水面起伏、往拉的方向傾斜，後面拖出一串小水紋
    if(G.state==='retrieve'&&G.retrieveNode<(G.retrieveLift||1)){ const pz=bob.position; pz.y=W.swell(pz.x,pz.z,G.t); const tg=path[Math.min(G.retrieveNode,path.length-1)], dx=tg.x-pz.x, dz=tg.z-pz.z, dl=Math.hypot(dx,dz)||1;
      bob.quaternion.setFromAxisAngle(tv4b.set(dz/dl,0,-dx/dl),.5); G.wakeT=(G.wakeT||0)-dt; if(G.wakeT<=0){ G.wakeT=.16; W.addRipple(pz.x,pz.z,.07); } }
    rod.spin-=dt*20; if(Math.random()<dt*14) Snd.click(); lineEnd=bob.position; slack=.06; setAct('收線中','拖曳改變竿角可避開前方障礙物',false);
    if(G.state==='retrieve'&&G.retrieveNode>=path.length) G.state='idle';
  }

  else if(st==='lost'){ G.stT+=elapsed; lineOn=false; setAct('・・・','',false); if(G.stT>1.3){ G.snapped=false; G.state='idle'; } }
  else if(st==='land'||st==='catch'||st==='post'){
    const g=G.fish.group; rod.pitchT=.45; bob.visible=false; lineOn=st!=='post';
    W.head.updateMatrixWorld(true);
    if(st==='land'&&G.netting){
      // 抄網起魚：①網子伸到魚旁、探進水裡 ②魚被兜進網袋 ③整網提出水面（網袋被拉垂、滴水）④拉到眼前，魚在網裡掙扎
      G.stT+=elapsed; const t=G.stT, L=G.fd.L, n=NET.g, hoopR=Math.max(.55,L*.6);
      // 抄網時低頭看水面（魚就在船邊），提起來後再抬頭
      n.visible=true; n.scale.setScalar(hoopR/.5); W.head.getWorldQuaternion(tq); const yaw=new THREE.Euler().setFromQuaternion(tq,'YXZ').y;
      const fishAt=G.landFrom, start=W.head.localToWorld(tv2.set(.7,-.35,-1.6)), distance=Math.max(1.6,L*2.2);
      const lift=W.head.localToWorld(new T.Vector3(.15,.12*distance,-distance));
      lift.y=Math.max(lift.y,W.swell(lift.x,lift.z,G.t)+hoopR*1.6);
      const p2=sstep(.7,1.15,t), p3=sstep(1.25,1.95,t), p4=sstep(1.95,2.6,t);
      if(!G.netAt) G.netAt=fishAt.clone();
      const water=W.swell(G.netAt.x,G.netAt.z,G.t),rim=new THREE.Vector3(G.netAt.x,water+.08,G.netAt.z);
      const railY=Math.max(start.y,W.player.position.y+.15),overRail=new THREE.Vector3(rim.x,railY,rim.z);
      const pos=new THREE.Vector3().copy(start).lerp(overRail,sstep(0,.4,t));if(t>.4)pos.copy(overRail).lerp(rim,sstep(.4,.7,t));pos.y-=.2*p2*(1-p3);
      // Clear the rail before swinging the net in front of the player.
      const onBoat=!!(SPOTS[G.spot].kayak||SPOTS[G.spot].yacht);
      const raisedY=Math.max(lift.y,W.player.position.y+hoopR*2.1);
      pos.y+=(raisedY-pos.y)*p3;
      pos.x=lerp(pos.x,lift.x,p4);pos.z=lerp(pos.z,lift.z,p4);
      pos.y=lerp(pos.y,lift.y,onBoat?sstep(2.25,2.7,t):p4);
      n.position.copy(pos); n.rotation.set(0,yaw-Math.PI/4,0,'YXZ'); n.rotateZ(-.25-(1-p3)*.2);   /* 手把朝向右下的自己，網框微微朝鏡頭傾斜看得到網袋 */
      NET.shape(p2*(1-.4*p3)+.15,t*6);
      if(t>.7){ const inBag=new T.Vector3(0,-.25*hoopR/.5,0).applyQuaternion(n.quaternion).add(n.position); g.position.lerp(inBag,Math.max(p3,Math.min(1,dt*10))); te.set(0,yaw+lerp(Math.PI/2,.25,p4),0,'YXZ'); g.quaternion.slerp(tq.setFromEuler(te).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),.5)),Math.min(1,dt*8)); }
      if(t>.7&&!G.netSplash){ G.netSplash=true; P.splash(G.netAt.x,0,G.netAt.z,50,1.4); W.addRipple(G.netAt.x,G.netAt.z,1.2); Snd.splash(1.2); vib([40,30,60]); }
      if(p3>0&&p3<1&&Math.random()<dt*30) P.splash(n.position.x+rand(-.3,.3),n.position.y-.35*hoopR,n.position.z+rand(-.3,.3),1,.14);   // 網袋一路滴水
      G.fish.uni.uAmp.value=.08+.25*Math.max(0,Math.sin(t*7)); G.fish.uni.uSwim.value+=dt*14;
      rod.pitchT=.3; rod.bendT=.35;
      if(t>=3.0){ G.netting=false; G.netSplash=false; G.netAt=null; n.visible=false; presentCatch(); }
    }
    else if(st==='land'){
      // 起魚三段：①竿子高舉，魚被線吊出水面、頭朝上掛在竿尖下甩動掙扎、身上滴水 ②把吊著的魚拉到眼前晃著 ③轉成展示角度
      G.stT+=elapsed; const T1=1.1, T2=2.3, T3=2.75, t=G.stT, L=G.fd.L, D=dispDist();
      rod.pitchT=t<T1?.38:t<T2?.3:.45; rod.bendT=t<T2?.55+.12*Math.sin(t*9):.3;
      const tip=rod.tipW, hangLen=.55+L*.2;
      if(!G.swing) G.swing={a:0,v:1.6};
      G.swing.v+=(-9.8/Math.max(.4,hangLen)*Math.sin(G.swing.a))*dt+(Math.random()-.5)*dt*6*(t<T2?1:.3); G.swing.v*=Math.exp(-dt*.8); G.swing.a+=G.swing.v*dt;   // 擺盪＋魚掙扎
      W.head.getWorldQuaternion(tq); const yaw=new THREE.Euler().setFromQuaternion(tq,'YXZ').y;
      if(t<T2){ const hl=.55+L*.2; let hang=tv.copy(tip); if(t>=T1){ const DD=Math.max(D*1.15,L*1.7+.5); W.head.localToWorld(tv2.set(.06,.3*DD+.12+L*.35,-DD)); hang.lerp(tv2,sstep(T1,T2,t)); }   // 大魚吊得遠一點、高一點，不會穿過鏡頭和手
        const sx=Math.sin(G.swing.a)*hl, mouth=tv2.set(hang.x+Math.cos(yaw)*sx,hang.y-hl*Math.cos(G.swing.a),hang.z-Math.sin(yaw)*sx);
        if(t<T1){ const e=sstep(0,T1,t), from=new THREE.Vector3().copy(G.landFrom); mouth.copy(from.lerp(mouth,e)); mouth.y+=Math.sin(Math.PI*e)*.35; }   // 從水裡被拉起、劃一道弧線到竿尖下
        te.set(0,yaw+Math.sin(t*1.7)*.35,0,'YXZ'); g.quaternion.setFromEuler(te); /* 魚身側面朝向鏡頭，隨吊線慢慢轉 */ g.rotateZ(Math.PI/2+G.swing.a*.6); g.updateMatrixWorld(true);
        const off=new THREE.Vector3(.5,0,0).applyQuaternion(g.quaternion).multiplyScalar(L); g.position.copy(mouth).sub(off);
        // 吊著的魚：不是一直細碎抖動，而是一陣一陣用力彎成 C 字甩動，甩完短暫垂著喘氣
        G.hf=(G.hf||0)-dt; if(G.hf<=0){ G.hf=rand(.7,1.5); G.hfT=.5; } const fl=G.hfT>0?(G.hfT-=dt,Math.sin((.5-G.hfT)/.5*Math.PI)):0;
        G.fish.uni.uAmp.value=.05+.42*fl; G.fish.uni.uSwim.value+=dt*(3+fl*16); G.swing.v+=fl*dt*(Math.random()<.5?-6:6);
        if(t<T1&&g.position.y>-.1&&!G.liftSplash){ G.liftSplash=true; P.splash(g.position.x,0,g.position.z,46,1.4); W.addRipple(g.position.x,g.position.z,1.1); if(P.foamBurst) P.foamBurst(g.position.x,g.position.z,10,.45+.4*(G.fd&&G.fd.L||.5)); Snd.splash(1.3); vib([20,30,60]); }
        if(Math.random()<dt*14) P.splash(g.position.x,g.position.y-L*.45,g.position.z,1,.12);   // 身上滴水
      } else { const s=sstep(T2,T3,t); W.head.localToWorld(tv.set(0,.14*D,-D)); g.position.lerp(tv,s); g.quaternion.slerp(tq,s); G.fish.uni.uAmp.value=.1; G.fish.uni.uSwim.value+=dt*12; }
      if(t>=T3){ G.swing=null; G.liftSplash=false; presentCatch(); }
    } else if(st==='catch'){
      // 拿在手上的魚：不時用力甩尾掙扎（整條魚跟著扭），身上一直滴水，鰓蓋呼吸般微微起伏
      G.stT+=dt; G.thr=(G.thr||0)-dt; if(G.thr<=0){ G.thr=rand(1.6,3.4); G.thrT=.55; vib(12); }
      const th=G.thrT>0?(G.thrT-=dt,Math.sin(G.thrT*28)*Math.min(1,G.thrT*3)):0;
      g.rotation.set(th*.12,Math.sin(G.stT*.6)*.3+th*.25,Math.sin(G.stT*.9)*.05+th*.18);
      if(g.parent===W.camera&&G.fd.sp.special!=='mermaid') positionHeldCatch(g);
      G.fish.uni.uAmp.value=.035+.03*Math.max(0,Math.sin(G.stT*2.1))+Math.abs(th)*.14; G.fish.uni.uSwim.value+=dt*(7+Math.abs(th)*30);
      G.drip=(G.drip||0)-dt; if(G.drip<=0){ G.drip=rand(.08,.25); g.updateMatrixWorld(true); const dp=g.localToWorld(new THREE.Vector3(rand(-.4,.4),-.12,0)); P.splash(dp.x,dp.y,dp.z,1,.08); }
    } else {
      G.stT+=dt; const s=Math.min(1,G.stT/.6);
      if(G.postSell){ g.scale.setScalar(G.fd.L*(1-s)); }
      else { g.position.y=G.from.y-9.8*.5*G.stT*G.stT; if(g.position.y<0&&!G.splashed){ G.splashed=true; P.splash(g.position.x,0,g.position.z,30,1); W.addRipple(g.position.x,g.position.z,.8); Snd.splash(.8); } }
      if(s>=1&&(G.postSell||g.position.y<-1)){ g.visible=false; g.scale.setScalar(1); G.splashed=false; G.state='idle'; }
    }
    // 魚線一直綁在魚嘴上：起魚飛上來的過程中，線跟著魚走，不會先跑到手邊等魚
    if(lineOn){ g.updateMatrixWorld(true); g.localToWorld(tv.set(.5,.02,0)); lineEnd=tv; slack=st==='land'?.02:.05; }
  }
  if((G.drillK||0)>.5) lineOn=false;
  const atHelm=!!(SPOTS[G.spot].yacht&&G.boatStation==='helm');
  const landscapeCatch=G.state==='catch'&&!!catchRect;
  P.rodGroup.visible=!atHelm&&!landscapeCatch;if(atHelm)bob.visible=false;
  P.setLine(lineEnd||rod.tipW, slack, !atHelm&&!landscapeCatch&&lineOn&&!!lineEnd, info.light, trem);
  if(st!=='fight'&&st!=='wait'&&st!=='lure') { if(st!=='bite') P.shadow.material.opacity=Math.max(0,P.shadow.material.opacity-dt); }
  const showing=st==='land'||st==='catch';
  practice.update(G.state,G.snag);
  P.updateFx(dt,info.light); UW.update(dt); WL.update(dt,G.t); AT.update(dt,G.t); FUN.update(dt,elapsed); SEA.update(dt,G.t); KK.update(dt,G.t); MDL.update(dt); SCH.update(dt,G.t);
  { const z=WL.zoneId?WL.zoneId():'dock'; if(z!==G.wzone&&G.loc!=='sea'){ G.wzone=z; const T2={dock:[[.010,.019,.011],[.018,.045,.026]],lily:[[.010,.026,.010],[.028,.07,.028]],wood:[[.020,.019,.009],[.05,.044,.02]],deep:[[.006,.015,.017],[.012,.034,.04]],moon:[[.007,.017,.02],[.016,.04,.05]]}[z]; if(T2&&W.setWaterTint) W.setWaterTint(T2[0],T2[1]); } if(W.tintTick) W.tintTick(dt); } try{ fightFx(dt); }catch(e){} try{ updDistMark(); }catch(e){} try{ ambUpdate(dt); }catch(e){ console.warn('amb',e); } try{ updMag(); }catch(e){} if(G.spook>0){ const was=G.spook; G.spook=Math.max(0,G.spook-dt*.03);
    // 警戒退下來時，嚇跑的魚群從外側游回剛才的落水點附近
    if(was>=.15&&G.spook<.15&&G.spookAt&&(G.loc==='lake'||G.loc==='sea')){ if(SCH.comeBack(G.spookAt.x,G.spookAt.z)) toast('🐟 剛才嚇跑的魚慢慢游回來了，可以再試試','good',2200); G.spookAt=null; } } if(!save.lookTip&&W.info.day<.15&&G.state==='idle'&&G.t>20){ save.lookTip=1; persist(); toast('🌌 上下拖曳畫面可以抬頭看星空','good',3500); }
  if(G.cinePan) G.yawT=Math.sin(performance.now()*.00011)*.55;   // 開場過場：鏡頭緩慢左右擺動
  window.__MOON.update(dt); if(window.__TAL) window.__TAL.tick(G); if(window.__STORY) window.__STORY.tick(dt); { const dr=G.loc==='ice'&&G.held&&G.state==='idle'&&ICE.drilling&&ICE.drilling(); G.drillK=(G.drillK||0)+((dr?1:0)-(G.drillK||0))*Math.min(1,dt*8); if(G.drillK>.01){ stowRod(Math.max(WL.padOn(),G.drillK)); G.pitchT=Math.min(G.pitchT||0,-.4*G.drillK); }
    ARMS.update(!UW.active()&&G.state!=='ending'&&!landscapeCatch,G.state,G.power,dt,G.drillK>.01?{k:G.drillK,grip:(sd,o)=>ICE.grip(sd,o)}:{k:WL.padOn(),grip:WL.padGrip}); } SKY.update(dt,((G.hour%24)+24)%24); MIST.update(dt); ICE.update(dt);
  { const z=WL.zoneId?WL.zoneId():'', tgt=G.loc==='ice'?[.03,.08,.12]:G.loc==='sea'?(z==='reef'?[.02,.2,.25]:[.01,.08,.2]):[.04,.13,.15], v=SEE_U.value, k=Math.min(1,dt*1.5);   // 水下物體混入的水色依地點
    v.set(v.x+(tgt[0]-v.x)*k,v.y+(tgt[1]-v.y)*k,v.z+(tgt[2]-v.z)*k); }
  { const zr=WL.zoneId&&WL.zoneId()==='reef'?1:0, k=Math.min(1,dt*.8); W.U.uReef.value+=(zr-W.U.uReef.value)*k;
    const sc=W.U.uSeaCol.value; if(zr) sc.lerp(tvSea.set(.02,.30,.40),k); else sc.lerp(tvSea.set(.008,.065,.115),k); }
  if(G.look){ if(G.t>G.look.until){ G.yawT=clamp(G.look.prev,-.95,.95); G.look=null; }
    else { let a=Math.atan2(-(G.look.x-(G.angler||G.base).x),-(G.look.z-(G.angler||G.base).z))-G.head-(G.fishingYaw||0); while(a-G.yaw>Math.PI) a-=Math.PI*2; while(a-G.yaw<-Math.PI) a+=Math.PI*2; G.yawT=a; if(G.look.snap){ G.yaw=a; G.look.snap=false; } } }
  G.yaw+=(G.yawT-G.yaw)*Math.min(1,dt*(G.look?9:st==='fight'?2.5:6)); W.player.rotation.y=G.head+(G.fishingYaw||0)+G.yaw;
  if(G.state!=='idle'&&G.state!=='wait') G.pitchT=0; if(G.look) G.pitchT=G.look.pitch; if(G.netting&&G.state==='land') G.pitchT=(G.stT||0)<1.3?-.12:0;   /* 抄網時低頭看船邊的魚 */ G.pitch=(G.pitch||0)+((G.pitchT||0)-(G.pitch||0))*Math.min(1,dt*5);   // 蓄力、拉魚時視角自動回正
  if(G.scareT>0) G.scareT-=dt; if(G.gShake>0) G.gShake=Math.max(0,G.gShake-dt*.7);
  { const f=G.state==='fight'?G.f:null, want=(f?((f.run?.45:0)+(f.ev&&f.ev.k==='shake'?.6:0)+(f.T>.85?.35:0)):0)+(G.gShake||0); G.shk=(G.shk||0)+(want-(G.shk||0))*Math.min(1,dt*6);
    let viewPitch=fishingViewPitch(G.state,G.state==='fight'&&G.f?G.f.d:G.castDist,W.player.position.y,G.loc==='sea');
    if(G.state==='land'&&G.netting) viewPitch=lerp(viewPitch,clamp((G.fd.L-1)*.09,-.06,.2),sstep(1.3,2.15,G.stT));
    // Raise the view while holding a large fish so the release starts above the water.
    if((G.state==='catch'||G.state==='post')&&G.fd&&G.fish){ const D=dispDist(), eye=W.camera.getWorldPosition(tv4b).y, r=(.3+(G.fd.L||.5)*.32-eye)/D, k=Math.hypot(1,.14);
      if(r>-k){ const need=Math.asin(Math.max(-1,Math.min(1,r/k)))-Math.atan(.14); if(need>viewPitch) viewPitch=Math.min(.35,need); } }
    G.viewPitch=(G.viewPitch??viewPitch)+(viewPitch-(G.viewPitch??viewPitch))*(1-Math.exp(-dt*3));
    W.head.rotation.z=0;W.head.rotation.x=G.viewPitch+(G.pitch||0)+Math.sin(G.t*.5)*.004+Math.sin(G.t*29)*.005*G.shk; W.camera.rotation.z=0; }
  showLightSet(showing);
  const hh=((G.hour%24)+24)%24, cl=String(Math.floor(hh)).padStart(2,'0')+':'+String(Math.floor((hh%1)*60)).padStart(2,'0');
  if(ui.clock.textContent!==cl) ui.clock.textContent=cl;
}
let showL=null; W.head.children.forEach(c=>{ if(c.isPointLight) showL=c; });
function showLightSet(on){ if(showL) showL.intensity+=((on?1.4:0)-showL.intensity)*.1; }

/* ---------- 主迴圈與自動畫質 ---------- */
function onResize(){ W.resize(window.innerWidth,window.innerHeight); UW.resize(window.innerWidth,window.innerHeight); if(G.state==='catch')resizeCatchView(); }
window.addEventListener('resize',onResize); onResize();
W.setTime(G.hour,true);
dockCameraButton($('bCam'),$('cameraSlot'),$('top'));
const screenCapture=createScreenCapture({canvas:W.renderer.domElement,button:$('bCam'),report:(m,k)=>toast(m,k,2200),captureState:scene=>SEA.photoTarget(scene),onCaptured:(scene,target)=>SEA.recordPhoto(scene,target),scene:()=>TIDE.active()?'tide':HOME3D.active()?'home':UW.active()?'underwater':END.on()?'ending':G.loc||'lake',save:persist});
const fpsDisplay=createFPSDisplay(document,save.fps!==false);window.__setFPSVisible=on=>fpsDisplay.setEnabled(on);document.addEventListener('visibilitychange',()=>fpsDisplay.reset());
const frameLimiter=createFrameLimiter(GAME_FPS_LIMIT,performance.now());window.__frameLimit=GAME_FPS_LIMIT;
document.addEventListener('visibilitychange',()=>frameLimiter.reset(performance.now()));
const gpuStatus=document.createElement('div');gpuStatus.style.cssText='display:none;position:fixed;inset:0;z-index:200;background:rgba(6,16,20,.92);color:white;align-items:center;justify-content:center;text-align:center;padding:28px;font:18px sans-serif';document.body.appendChild(gpuStatus);
const graphicsRecovery=createGraphicsRecovery(W.renderer.domElement,{save:persist,report:(kind,msg)=>{if(window.__DIAG)window.__DIAG.add(kind,msg);},lost:()=>{screenCapture.cancel();releaseAll();if(window.__DIAG)window.__DIAG.scene(G.state==='home'?'home':G.loc||'lake','context-lost');gpuStatus.textContent='畫面正在恢復，遊戲進度已保存。';gpuStatus.style.display='flex';setTimeout(()=>{if(graphicsRecovery.paused()){gpuStatus.innerHTML='<div>畫面尚未恢復，遊戲進度已保存。<br><button style="margin-top:20px;padding:12px 24px">重新載入</button></div>';gpuStatus.querySelector('button').onclick=()=>{persist();if(window.__DIAG)window.__DIAG.action('navigation','manual-gpu-recovery');location.reload();};}},8000);},restored:()=>{W.resetGraphics();HOME3D.resetGraphics();frameLimiter.reset(performance.now());gfxAuto.pause();gpuStatus.style.display='none';}});
let homeWarmAt=0;
/* 標本館：一公尺以上的標本照真實大小吊掛展示（從小屋進去） */
const TROPHY_HALL=createTrophyHall(W);
{ const hb=document.getElementById('bHall'); if(hb) hb.addEventListener('click',()=>{ Snd.init&&Snd.init(); TROPHY_HALL.enter(); }); }
let lastIntroRender=-Infinity;
function frame(now){
  const frameSeconds=frameLimiter.step(now);
  if(frameSeconds===null){requestAnimationFrame(frame);return;}
  if(graphicsRecovery.paused()||document.hidden||screenCapture.paused()){
    frameLimiter.reset(now);requestAnimationFrame(frame);return;
  }
  const elapsed=gameplayElapsed(frameSeconds),dt=Math.min(.05,elapsed);
  window.__frameSeconds=frameSeconds;
  // Resolution changes clear the drawing buffer: apply them before drawing this frame.
  const home=HOME3D.active(), tide=TIDE.active(), underwater=UW.active();
  const scope=tide?'tide':home?HOME3D.qualityScope():underwater?'underwater':G.loc||'lake';
  gfxAuto.sample(frameSeconds,{enabled:!screenCapture.isBusy(),ready:G.state!=='intro',scene:scope});
  const diag=window.__DIAG;
  try{
    diag?.beginFrame();
    window.__UWON=underwater;
    update(dt,elapsed);
    diag?.stage('simulation');
    if(!HOME3D.active()){
      merPresent(dt);
      if(MERTEST&&G.state==='fight'){
        if(G.f){G.f.brk=0;G.f.slk=0;G.f.abr=0;G.f.d=Math.min(G.f.d,20);G.f.lostWhy=null;}
        G.mtT=(G.mtT||0)+elapsed;
        if(G.mtT>3){G.mtT=0;land();}
      }else G.mtT=0;
      if(END.on()){END.tick(dt);bob.visible=false;P.rodGroup.visible=false;P.setLine(rod.tipW,0,false,0,0);}
      END.frame(dt);AFTER.update(dt);guardUW();MDL.glowTick();RESIDENTS.update(dt,G);
      if(!END.on())GHOST.update(dt);
    }
    diag?.stage('actors');
    if(TROPHY_HALL.active())TROPHY_HALL.render(dt);
    else if(TIDE.active())TIDE.render(dt);
    else if(HOME3D.active())HOME3D.render(dt);
    else if(UW.active())UW.render();
    else if(G.state!=='intro'||now-lastIntroRender>=50){
      lastIntroRender=now;
      window.__GEOLOD?.update(W.scene,W.camera,dt,window.__effectTier);
      W.render();LURE.renderPiP(W.renderer,dt);
    }
    if(HOME3D.active()){
      if(!homeWarmAt)homeWarmAt=now;
      if(homeWarmAt>0&&now-homeWarmAt>5000){homeWarmAt=-1;diag?.action('home','done','5 seconds rendered');}
    }else homeWarmAt=0;
    diag?.stage('render');screenCapture.afterFrame();
    if(G.state!=='intro')fpsDisplay.frame(frameSeconds);
    diag?.frame(frameSeconds);diag?.scene(G.state==='home'?'home':G.loc||'lake','ready');
  }catch(error){
    if(G.state==='home'||HOME3D.active())recoverHome(error);
    else console.error(error);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
}

(function boot(){
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',boot,{once:true});return;}
  if(!window.THREE||!THREE.GLTFLoader||!THREE.DRACOLoader){
    showErr('3D 引擎載入失敗。請確認網路連線後重新整理頁面。');return;
  }
  // 模型、貼圖、音效從 jsDelivr 下載（實測比 GitHub 快約 8 倍）；某個檔案從 CDN 下載失敗，就只對那個檔案改從本站重抓，不影響其他檔案
  try{ const C=window.__CDN, wrap=(proto)=>{ const orig=proto.load; proto.load=function(url,onLoad,onProg,onErr){ const cu=C.url(url); if(cu===url) return orig.call(this,url,onLoad,onProg,onErr);
      const self=this; return orig.call(this,cu,onLoad,onProg,e=>{ console.warn('CDN 失敗，改從本站下載',url); orig.call(self,url,onLoad,onProg,onErr); }); }; };
    wrap(THREE.FileLoader.prototype); wrap(THREE.ImageLoader.prototype);
    // 所有模型都經過 Draco 幾何壓縮（體積約剩 1/4）：每個 GLTF 載入器自動接上同一個 Draco 解壓器
    let resourceSave={};try{resourceSave=JSON.parse(localStorage.getItem('swampAngler.v1')||'{}');}catch(_){}const previous=readDiagnosticJournal();const recovery=!!(previous&&!previous.clean&&Date.now()-previous.at<600000&&((previous.started&&previous.visible!==false)||previous.recovery));window.__resourcePolicy=deviceResourcePolicy(navigator.userAgent,resourceSave.gfx||'auto',recovery);window.__imageBudget=createImageBudget(window.__resourcePolicy);installImageBudget(THREE,window.__imageBudget);
    if(THREE.DRACOLoader&&THREE.GLTFLoader){ const dl=new THREE.DRACOLoader();dl.setWorkerLimit(1); dl.setDecoderPath('vendor/draco/'); dl.preload();
      const parse=THREE.GLTFLoader.prototype.parse;
      THREE.GLTFLoader.prototype.parse=function(...args){if(!this.dracoLoader)this.setDRACOLoader(dl);return parse.apply(this,args);};
    }
    if(THREE.ImageBitmapLoader)wrap(THREE.ImageBitmapLoader.prototype);
    window.__GEOLOD=createGeometryLOD();window.__GEOLOD.install(THREE);
  }catch(e){console.warn('3D 資源初始化',e);}
  try{
    const W=createWorld({canvas:document.getElementById('c')});W.renderer.info.autoReset=false; window.__DIAG=createDiag(W,{get G(){ return window.__G||{}; },get save(){ return (window.__G&&window.__G.saveRef)||{}; },persist:()=>{if(window.__SAVE_LOCK)return;if(window.__G?.saveRef)localStorage.setItem(window.__SAVE_KEY||'swampAngler.v1',JSON.stringify(window.__G.saveRef));}}); const P=createProps(W);
    startGame(W,P);
    window.__GAME_READY=true;
    const start=document.getElementById('startBtn'),note=document.getElementById('loadNote');
    start.textContent=window.__resourcePolicy.recovery?'開始釣魚（保護模式）':'開始釣魚';
    start.disabled=false;
    note.textContent='可以開始釣魚。場景細節會陸續載入。';
  }
  catch(e){ console.error(e); showErr('這個瀏覽器無法啟動 WebGL 3D 畫面。<br><small>'+String(e&&e.message||e)+'</small>'); }
})();
