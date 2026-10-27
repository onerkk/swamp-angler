/* ===== 第 1 段 · 遊戲邏輯、操作、介面、音效 ===== */
function startGame(W, P){
'use strict';
const T=THREE, $=id=>document.getElementById(id);
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t, rand=(a,b)=>a+Math.random()*(b-a);
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const RAR=P.RAR, SPECIES=P.SPECIES, MAX_LINE=80;

/* ---------- 存檔 ---------- */
// 測試帳號：網址加 test 參數，存檔另開一份（只限擁有者 Google 帳號，驗證在 y.js）
const TESTACC=/[?&]test=1(&|$)/.test(location.search);
const SAVE_KEY=TESTACC?'swampAngler.test':'swampAngler.v1';
window.__SAVE_KEY=SAVE_KEY;
let save={coins:0,total:0,sound:true,dex:{}};
try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); if(s) save=Object.assign(save,s); }catch(e){}
function persist(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(save)); }catch(e){} if(window.__CLOUD) window.__CLOUD.dirty(); }

/* ---------- 音效（全程序合成） ---------- */
const Snd=(()=>{
  let ctx=null,out=null,nb=null,rainG=null,AMB=null,on=save.sound!==false;
  function init(){
    if(ctx){ if(ctx.state==='suspended') ctx.resume(); return; }
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    try{ ctx=new AC(); }catch(e){ return; }
    out=ctx.createGain(); out.gain.value=on?.8:0; out.connect(ctx.destination);
    nb=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate); const d=nb.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const amb=(rate,type,f,q,g0,lf,lg)=>{ const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true; s.playbackRate.value=rate;
      const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q; const g=ctx.createGain(); g.gain.value=g0;
      const o=ctx.createOscillator(); o.frequency.value=lf; const og=ctx.createGain(); og.gain.value=lg; o.connect(og); og.connect(g.gain);
      s.connect(fl); fl.connect(g); g.connect(out); s.start(); o.start(); };
    amb(1,'lowpass',320,.4,.06,.17,.035);
    amb(.7,'bandpass',2600,.6,.012,.06,.01);
    rainG=ctx.createGain(); rainG.gain.value=0; { const rs=ctx.createBufferSource(); rs.buffer=nb; rs.loop=true; const rf=ctx.createBiquadFilter(); rf.type='highpass'; rf.frequency.value=1800; rs.connect(rf); rf.connect(rainG); rainG.connect(out); rs.start(); }
    const bed=(type,f,q,rate,amHz)=>{ const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true; s.playbackRate.value=rate; const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q;
      const am=ctx.createGain(); am.gain.value=amHz?.5:1; if(amHz){ const o=ctx.createOscillator(); o.frequency.value=amHz; const og=ctx.createGain(); og.gain.value=.5; o.connect(og); og.connect(am.gain); o.start(); }
      const g=ctx.createGain(); g.gain.value=0; s.connect(fl); fl.connect(am); am.connect(g); g.connect(out); s.start(); return {g,fl}; };
    AMB={wind:bed('bandpass',420,.7,.8,0),lap:bed('lowpass',240,.6,.6,.45),cic:bed('bandpass',4800,8,1,31),crk:bed('bandpass',4300,14,1,3.2)};
  }
  function nz(dur,type,f,q,gain,f2){ if(!ctx) return; const t=ctx.currentTime, s=ctx.createBufferSource(); s.buffer=nb;
    const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.setValueAtTime(f,t); if(f2) fl.frequency.exponentialRampToValueAtTime(f2,t+dur); fl.Q.value=q;
    const g=ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+.008); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(t,Math.random()*1.2,dur+.05); }
  function tn(f,dur,type,gain,delay,f2){ if(!ctx) return; const t=ctx.currentTime+(delay||0), o=ctx.createOscillator(); o.type=type;
    o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
    const g=ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t+dur+.05); }
  document.addEventListener('visibilitychange',()=>{ if(!ctx) return; if(document.hidden) ctx.suspend(); else ctx.resume(); });
  return { init, isOn:()=>on, set(v){ on=v; if(out) out.gain.value=v?.8:0; },
    whoosh(){ nz(.4,'bandpass',2400,.9,.18,500); },
    splash(s){ s=s||1; nz(.18+.3*s,'bandpass',1100,.7,.22*s,400); nz(.35+.4*s,'lowpass',700,.5,.16*s); tn(140,.12,'sine',.12*s,0,60); },
    plop(){ tn(320,.09,'sine',.14,0,120); nz(.06,'bandpass',1800,2,.05); },
    nibble(){ tn(260,.06,'sine',.07,0,140); },
    bite(){ tn(180,.22,'sine',.28,0,55); nz(.25,'lowpass',900,.6,.12); },
    click(p){ nz(.014,'highpass',p||3200,.8,.09); },
    snap(){ nz(.05,'highpass',3000,.6,.5); tn(110,.3,'triangle',.25,0,40); },
    fanfare(r){ const b=[523.25,659.25,783.99,1046.5,1318.5]; for(let i=0;i<3+r;i++) tn(b[i%5]*(i>=5?2:1),.35,'triangle',.11,i*.09); if(r>=3) tn(261.6,.9,'sine',.12,0); },
    coin(){ tn(1318,.08,'square',.04); tn(1760,.14,'square',.04,.07); },
    rain(k){ if(rainG) rainG.gain.setTargetAtTime(k*.16,ctx.currentTime,.5); },
    thunder(){ nz(2.6,'lowpass',160,.7,.5,60); nz(.5,'lowpass',900,.5,.22); },
    eagle(){ for(let i=0;i<3;i++) tn(2900-i*120,.12,'sine',.05,i*.13,2300); tn(2400,.5,'sine',.04,.45,1700); },
    frog(){ const n=2+Math.floor(Math.random()*2); for(let i=0;i<n;i++) tn(140+Math.random()*40,.09,'square',.025,i*.14,110); },
    bird(){ const b=2600+Math.random()*1200; for(let i=0;i<3;i++) tn(b+i*200,.07,'sine',.03,i*.09,b+600); },
    gator(){ nz(1.2,'lowpass',90,.8,.35); tn(55,1,'sawtooth',.05,0,40); },
    paddle(){ nz(.35,'bandpass',700,.8,.14,300); },
    drip(){ tn(1200,.08,'sine',.05,0,300); },
    rumble(){ nz(1.2,'lowpass',140,.6,.18,90); tn(48,1.0,'sine',.12,0,38); },
    sizzle(k){ nz(.5+.6*(k||.5),'highpass',3800,.5,.12*(k||.5),6000); },
    scream(){ if(!ctx) return; const t=ctx.currentTime, o=ctx.createOscillator(), o2=ctx.createOscillator(), g=ctx.createGain(), lfo=ctx.createOscillator(), lg=ctx.createGain();
      o.type='sawtooth'; o2.type='square'; o.frequency.setValueAtTime(850,t); o.frequency.exponentialRampToValueAtTime(1500,t+.35); o.frequency.exponentialRampToValueAtTime(1100,t+1.1);
      o2.frequency.setValueAtTime(1710,t); o2.frequency.exponentialRampToValueAtTime(2900,t+.4); lfo.frequency.value=28; lg.gain.value=60; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.45,t+.04); g.gain.setValueAtTime(.45,t+.8); g.gain.exponentialRampToValueAtTime(.001,t+1.25);
      o.connect(g); o2.connect(g); g.connect(ctx.destination); o.start(t); o2.start(t); lfo.start(t); o.stop(t+1.3); o2.stop(t+1.3); lfo.stop(t+1.3); nz(.5,'highpass',2500,.6,.25,4000); },
    grind(){ nz(.06,'bandpass',1200+Math.random()*900,1.2,.05,500); },
    crackle(){ nz(.03+Math.random()*.05,'highpass',1800+Math.random()*2600,.8,.04+Math.random()*.06,900); },
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
let toastTimer=0;
function toast(msg,cls,ms){ if(window.__ENDON&&window.__ENDON()) return;   // 結局演出時，遊戲裡的任何提示都不顯示
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
function period(h){ h=((h%24)+24)%24; return h>=4.8&&h<8.5?'dawn':h<16.5&&h>=8.5?'day':h>=16.5&&h<19.8?'dusk':'night'; }
const PER_WAIT={dawn:.75,day:1.1,dusk:.75,night:1.0};
function hangPos(out){ return out.copy(rod.tipW).add(tv2.set(Math.sin(G.t*1.3)*.02,-.5,Math.cos(G.t*1.1)*.015)); }

/* ---------- 選魚 ---------- */
function specialK(sp){ if(!sp.special) return 1;
  // 神話海馬獸只在月亮八成五以上、深夜出現
  if(sp.special==='seabeast') return (period(G.hour)==='night'&&window.__MOONPH&&window.__MOONPH.illum()>.85)?1:0;
  const wx=WL.wx(); if(sp.special==='mermaid'){ if(save.mer&&save.mer.last&&Date.now()-save.mer.last<30*60*1000) return 0; return (KY.zone>=3||G.spot>=3||wx.f>.5)?.5:.05; } if(sp.special==='golden') return wx.c<.4?1:.3; if(sp.special==='king') return 0; if(sp.special==='moonkoi') return window.__MOON?window.__MOON.koiK():0; return 1; }
/* 魚群警覺：同一個方向一直釣，魚會變少、變小、變慢咬；換方向或換釣點就恢復（每分鐘消退 1） */
/* 透水：水下物體在水面之後繪製，越深越透明、越帶水色（湖底沒有地形，所以讓物體透出來，而不是讓水變透明） */
const SEE_U={value:new THREE.Vector3(.04,.13,.15)}, SEE_K={value:1}; window.__SEE_K=SEE_K;
function seeThrough(obj){ if(!obj) return; obj.traverse(m=>{ if(!m.isMesh&&!m.isSkinnedMesh) return; m.renderOrder=10;
  (Array.isArray(m.material)?m.material:[m.material]).forEach(mat=>{ if(!mat||mat.userData.see) return; mat.userData.see=true; mat.transparent=true;
    const prev=mat.onBeforeCompile, prevKey=mat.customProgramCacheKey?mat.customProgramCacheKey.bind(mat):null;
    mat.onBeforeCompile=(s,r)=>{ if(prev) prev(s,r); s.uniforms.uSeeCol=SEE_U; s.uniforms.uSeeK=SEE_K;
      s.vertexShader='varying float vWy_;\n'+s.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvWy_=(modelMatrix*vec4(transformed,1.0)).y;');
      s.fragmentShader='uniform vec3 uSeeCol;\nuniform float uSeeK;\nvarying float vWy_;\n'+s.fragmentShader.replace(/}\s*$/,'  { float d_=max(0.0,-vWy_)*uSeeK; gl_FragColor.rgb=mix(gl_FragColor.rgb,uSeeCol,1.0-exp(-d_*1.3)); gl_FragColor.a*=exp(-d_*1.1); }\n}'); };
    mat.customProgramCacheKey=()=>(prevKey?prevKey():'')+'|see'; mat.needsUpdate=true; }); }); }
window.__seeThrough=seeThrough;
const DEPL={}; const TR=b=>window.__TAL?window.__TAL.rank(b):0;
function depKey(){ const A=((G.head+G.yaw)%(2*Math.PI)+2*Math.PI)%(2*Math.PI); return (WL.zoneId?WL.zoneId():'')+':'+Math.floor(A/(Math.PI/3)); }
function depNow(k){ const e=DEPL[k]; return e?Math.max(0,e.v-(performance.now()-e.t)/60000):0; }
function depAdd(k,n){ const v=depNow(k)+n, w=v>=2&&DEPL[k]&&DEPL[k].warned; DEPL[k]={v,t:performance.now(),warned:w}; if(v>=4&&!w){ DEPL[k].warned=true; setTimeout(()=>toast('這一帶的魚變警覺了，轉個方向或換釣點吧','warn',2600),1800); } }
const reachK=()=>G.loc==='ice'?.78:clamp((G.castDist-4)/(24*(1-.05*TR('cast'))),0,1);
function pickSpecies(){
  const per=period(G.hour), pw=clamp((G.castDist-6)/30,0,1); let tot=0;
  const ws=SPECIES.map(sp=>{ const bt=G.baitUsed||BAITS[0]; const w=RAR[sp.rar].w*(sp.time[per]??1)*specialK(sp)*(1+sp.rar*(.35*pw+WL.rareB()+(G.hot?.3:0)+(window.__ECO&&window.__ECO.fxOn('luck')?.4:0)+(save.mer&&save.mer.n>=4?.1:0)+(save.mer&&save.mer.n>=10?.1:0)))*(1+sp.rar*G.luck*2)*(sp.rar>=5&&sp.special!=='mermaid'?1+(save.mer&&save.mer.n>=7?.15:0)+(save.mer&&save.mer.n>=13?.15:0):1)*(sp.tide&&window.__MOONPH?(.25+1.5*window.__MOONPH.illum()):1)*WL.spotAff(sp.id)*(sp.spots?(sp.spots.includes(WL.zoneId())?1:0):1)*WL.wxAff(sp.id)*(((sp.loc==='both'&&G.loc!=='ice')||(sp.loc||'lake')===(G.loc||'lake')||(G.loc==='ice'&&sp.ice))?1:0)*(G.loc==='sea'?1+sp.rar*.08*TR('sea'):1)*Math.pow(.12+.88*reachK(),sp.rar)/(1+.3*depNow(G.depK||'')*sp.rar)*(bt.aff[sp.id]||(bt.lure&&G.loc!=='ice'?0:1))*(window.__STORY?window.__STORY.boost(sp.id,(SPOTS[G.spot]||{}).id):1)*Math.max(.2,1+sp.rar*bt.rare*.5); tot+=w; return w; });
  let x=Math.random()*tot; for(let i=0;i<ws.length;i++){ x-=ws[i]; if(x<=0) return SPECIES[i]; } return SPECIES[0];
}

/* ---------- 動作 ---------- */
function startCharge(){ if(G.scareT>0){ toast('驚魂未定，等一下再拋竿…','warn',1400); return; } G.state='charge'; G.chargeT=0; G.aimYawCast=G.yawT; }
function cast(){
  G.baitUsed=META.useBait(); G.noBait=false; LURE.bobberVis(!(G.baitUsed&&G.baitUsed.lure));
  const p=G.power, dist=6+p*META.gear().rod.cast, A=G.head+G.yaw, fw=tv.set(-Math.sin(A),0,-Math.cos(A)), bx=G.base.x, bz=G.base.z;
  let x=bx+fw.x*dist+rand(-.6,.6), z=bz+fw.z*dist+rand(-.6,.6);
  for(let k=0;k<14;k++){ const r=Math.hypot(x,z), maxR=W.shoreR(Math.atan2(x,-z))-6; if(r<=maxR) break; x=bx+(x-bx)*.9; z=bz+(z-bz)*.9; }
  if(G.spot===0&&z>-4.5) z=-4.5;
  G.to.set(x,0,z); G.castDist=Math.max(3,Math.hypot(x-bx,z-bz)); G.castDur=.55+G.castDist*.028; G.apex=1.2+G.castDist*.12;
  G.castT=0; G.delay=.12; G.state='cast'; rod.pitchT=-.32; Snd.whoosh(); setPower(0);
}
function landBobber(){
  if(G.baitUsed&&G.baitUsed.lure){ G.state='lure'; P.splash(G.to.x,0,G.to.z,10,.4); W.addRipple(G.to.x,G.to.z,.4); Snd.plop(); G.sp=null; G.fd=null; FUN.castTag(G.castDist); LURE.start(G.to,G.baitUsed,G.base); return; }
  G.state='wait'; P.splash(G.to.x,0,G.to.z,16,.7); W.addRipple(G.to.x,G.to.z,.55); Snd.plop();
  G.timer=rand(6,15)*PER_WAIT[period(G.hour)]*(1-G.luck*.6)*(G.baitUsed?G.baitUsed.wait:1)*WL.waitK()*(window.__ECO&&window.__ECO.fxOn('glow')?.6:1)*(1+.2*depNow(depKey())); G.nib=Math.floor(rand(0,3.99)); G.approach=0; G.sp=null; G.fd=null;
  FUN.castTag(G.castDist); G.hot=FUN.inHot(G.to); if(G.hot){ G.timer*=.3; toast('正中魚群！','good',1200); }
}
function startRetrieve(msg,cls){ exitUW(); G.fd=null; G.sp=null; if(msg) toast(msg,cls); G.state='retrieve'; G.stT=0; G.from.copy(bob.position); P.shadow.material.opacity=0; }
function nibble(){ const big=Math.random()<.25; G.dip=big?.75:.28; G.dipMax=G.dip; G.dipAmp=big?.14:.035; W.addRipple(G.to.x,G.to.z,big?.5:.18); if(big){ P.splash(G.to.x,0,G.to.z,5,.35); Snd.bite(); vib([40,30,60]); } else { Snd.nibble(); vib(12); } G.approach=Math.max(G.approach,.01); }
// 體型等級：u 是這條魚在該魚種體型範圍內的位置（0 最小、1 最大，巨物可再超出）
const GRADES=[[.2,'幼魚'],[.7,'成魚'],[.93,'大物'],[9,'巨物']];
const gradeOf=u=>GRADES.find(g=>u<g[0])[1];
function prepFish(){ const wantPin=window.__STORY&&window.__STORY.wants('hairpin')&&WL.zoneId()==='lily'&&period(G.hour)==='night';
  if(wantPin&&Math.random()<.45){ const it=ITEMS_BY('hairpin'); if(it){ G.sp=FUN.ITEM_SP; G.fd={sp:FUN.ITEM_SP,item:it,L:it.size,w:it.w,lvl:1,value:0,xpMul:1}; return; } }
  if(Math.random()<.085*(window.__STORY&&window.__STORY.needs('item')?2:1)){ const it=FUN.rollItem(); G.sp=FUN.ITEM_SP; G.fd={sp:FUN.ITEM_SP,item:it,L:it.size,w:it.w*rand(.85,1.15),lvl:1,value:Math.round(it.val*rand(.8,1.25)),u:.5,xpMul:0}; return; }
  G.depK=depKey(); const sp=pickSpecies(), pw=clamp((G.castDist-6)/30,0,1), u=Math.pow(Math.random(),(1.6-.5*pw)/WL.sizeB()*(1+(1-reachK())*1.2+.15*depNow(G.depK)));
  const big=u>.96?1+(u-.96)/.04*.15:1, L=lerp(sp.len[0],sp.len[1],u)/100*big, w=sp.k*L*L*L*rand(.9,1.12);
  G.sp=sp; G.fd={sp,L,w,u,grade:gradeOf(u),lvl:Math.round(lerp(sp.lvl[0],sp.lvl[1],u)),value:Math.round(sp.price*Math.pow(w+.3,.85)*RAR[sp.rar].mult*D().rew*.4*(window.__ECO?window.__ECO.priceMul(sp.id):1)),xpMul:D().rew}; if(window.__TAL) window.__TAL.applyBoss(G,SPECIES,RAR); }
function bite(){ if(!G.fd) prepFish(); UW.bite(); G.state='bite'; G.biteT=0; FUN.hookStart(G.fd); W.addRipple(G.to.x,G.to.z,.75); P.splash(G.to.x,0,G.to.z,8,.5); Snd.bite(); vib([60,40,60]); }
// 沒揚到竿：魚大多會把餌吃掉，沒餌就不會再有魚咬，要收線重新上餌（路亞不會被吃掉）
function missBite(){ const lastFd=G.fd; FUN.hookEnd(); G.combo=0; FUN.combo(0); G.state='wait'; G.timer=rand(4,9); G.nib=Math.floor(rand(0,2.99)); G.sp=null; G.fd=null; exitUW(); vib(40);
  const lost=fd0=>{ const id=G.baitUsed&&G.baitUsed.id, base={corn:.35,worm:.45,shrimp:.5,live:.3}[id]??.45, sty=fd0?SP_STY[fd0.sp.id]:'';
    return Math.max(.15,Math.min(.75,base+(sty==='nibbler'?.15:sty==='brawler'||sty==='runner'?-.1:0))); };
  if(!(G.baitUsed&&G.baitUsed.lure)){ if(Math.random()<lost(lastFd)){ G.noBait=true; setTimeout(()=>toast('餌被吃掉了，收線重新上餌','warn',2400),300); } else setTimeout(()=>toast('魚跑了，餌還在','',1600),300); } }
function hook(q){
  const sp=G.sp, L=G.fd.L; exitUW();
  const perfect=!!q; if(perfect){ save.perf=(save.perf||0)+1; if(window.__STORY) window.__STORY.onPerfect(); }
  G.f={perfect,d:G.loc==='ice'?rand(10,18):G.castDist,az0:Math.atan2(-(G.to.x-G.base.x),-(G.to.z-G.base.z)),theta:0,latDir:0,run:true,phaseT:rand(.8,1.6),stam:perfect?85:100,T:.3,brk:0,slk:0,jumpT:0,jumpDur:1,ripT:0,vibT:0,clickA:0};
  G.state='fight'; P.splash(G.to.x,0,G.to.z,22,1); W.addRipple(G.to.x,G.to.z,.7); Snd.splash(.7); vib(40);
  toast(perfect?'完美揚竿！':'上鉤了！',perfect?'good':'',1200);
  ui.fight.classList.remove('hidden'); WL.onHook(G.fd,()=>fishPos(G.chaseV,0)); SEA.onHook(G.fd,()=>fishPos(G.chaseV,0));
  const fish=G.fd.item?FUN.itemFish(G.fd.item):P.getFish(sp); G.fish=fish; fish.group.scale.setScalar(L); fish.group.visible=false; if(!fish.group.parent) W.scene.add(fish.group); seeThrough(fish.group);
  if(G.fd.boss&&window.__TAL) window.__TAL.bossIntro(G,b=>{ P.splash(G.to.x,0,G.to.z,70,2.4); W.addRipple(G.to.x,G.to.z,1.6); Snd.splash(2.2); if(G.loc!=='ice') setTimeout(()=>{ if(G.state==='fight'&&G.f) startJump(); },500); });
}
function fishPos(out,y){ const az=G.f.az0+G.f.theta; out.set(G.base.x-Math.sin(az)*G.f.d,y,G.base.z-Math.cos(az)*G.f.d); if(G.loc==='sea') SEA.hullClear(out,.35); else if(G.loc==='ice'&&window.__ICE){ const hp=window.__ICE.holePos(); out.x=hp.x; out.z=hp.z; } return out; }
function sizeWord(w){ return w<.6?'小傢伙':w<2.5?'中型魚':w<8?'大魚！':'巨物！！'; }
function endFightUI(){ ui.fight.classList.add('hidden'); ui.steer.classList.add('hidden'); ui.tBar.classList.remove('danger'); ui.tBar.classList.remove('slack'); }
function lose(reason){
  endFightUI(); WL.endChase(); SEA.endChase(); G.combo=0; FUN.combo(0); P.shadow.material.opacity=0; if(G.fish){ G.fish.group.visible=false; }
  if(reason==='gator'||reason==='shark'){ fishPos(tv,0); P.splash(tv.x,0,tv.z,60,1.6); W.addRipple(tv.x,tv.z,1.2); Snd.splash(1.5); Snd.gator(); biteFX(reason); }
  const msg={snap:'啪！線斷了……',slack:'線太鬆，魚脫鉤了',spool:'線放光了，魚跑掉了',gator:'鱷魚把你的魚搶走了！',shark:'鯊魚把你的魚咬走了！'}[reason];
  if(reason==='snap'){ Snd.snap(); vib([80,40,120]); toast(msg,'bad',1800); G.state='lost'; G.stT=0; G.snapped=true; bob.visible=false; rod.bendT=0; rod.pitchT=.1; rod.end=null; }
  else { vib(60); startRetrieve(msg,'bad'); }
}
function startJump(){ const f=G.f; f.jumpT=f.jumpDur=.85+.25*Math.sqrt(G.fd.L); fishPos(tv,0); P.splash(tv.x,0,tv.z,30,1.2); W.addRipple(tv.x,tv.z,.9); Snd.splash(1);
  toast('魚躍出水面！先放手！','warn',1100); vib(30); G.fish.group.visible=true; }
function dispDist(){ return Math.max(.38,G.fd.L*(G.fd.sp.sh.snout?2.5:2.1))*(W.camera.aspect<1?1:.8); }
function land(){
  if(G.loc==='sea'&&!G.fd.item&&!G.fd.sp.special&&G.fd.sp.id!=='shark'&&G.fd.sp.id!=='gwhite'&&Math.random()<.12*(1-.12*TR('sea'))&&!KK.busy()&&!(window.__ECO&&window.__ECO.fxOn('repel'))){ G.state='snatch'; fishPos(tv,-.05); toast('就在魚出水的瞬間……','warn',1200); KK.snatchOver(tv.clone(),()=>{ G.state='fight'; lose('shark'); }); return; }
  G.state='land'; G.stT=0; endFightUI(); WL.endChase(); SEA.endChase(); G.combo=(G.combo||0)+1; FUN.combo(G.combo); save.maxCombo=Math.max(save.maxCombo||0,G.combo); fishPos(G.landFrom,-.05); P.splash(G.landFrom.x,0,G.landFrom.z,40,1.3); W.addRipple(G.landFrom.x,G.landFrom.z,1);
  Snd.splash(1.2); vib([30,40,30]); const g=G.fish.group; g.visible=G.fd.sp.special!=='mermaid'; if(g.parent!==W.scene) W.scene.attach(g);
  g.position.copy(G.landFrom); te.set(0,G.f.az0+G.f.theta+Math.PI/2,0); g.quaternion.setFromEuler(te); G.landQ.copy(g.quaternion); P.shadow.material.opacity=0;
}
function showCard(){
  if(G.fd&&!G.fd.item) depAdd(G.depK||depKey(),1+.5*G.fd.sp.rar);
  if(G.fd&&G.fd.boss&&window.__TAL) window.__TAL.bossWin(G.fd);
  if(window.__MOON) window.__MOON.onCatch(G.fd);
  if(G.fd.item){ if(window.__STORY) window.__STORY.onItem(G.fd.item&&G.fd.item.id); save.items=(save.items||0)+1; if(G.fd.item.id==='chest') save.chests=(save.chests||0)+1; if(window.__ECO) window.__ECO.dropItem(G.fd.item); persist(); FUN.goalsDot();
    return FUN.itemCard(G.fd,()=>{ ui.catch.classList.remove('hidden'); ui.actWrap.classList.add('hidden'); ui.sub.classList.add('hidden'); document.body.classList.add('catching'); }); }
  { const cb=1+.05*Math.min(G.combo||0,6); G.fd.value=Math.round(G.fd.value*cb*(window.__ECO&&window.__ECO.fxOn('coin2')?2:1)); G.fd.xpMul=(G.fd.xpMul||1)*cb; }
  FUN.tourCatch(G.fd); if(G.hot) save.hotC=(save.hotC||0)+1; $('bSell').textContent='賣出'; $('bRel').classList.remove('hidden');
  const fd=G.fd, sp=fd.sp, r=RAR[sp.rar], rec=save.dex[sp.id];
  const isNew=!rec, isRec=!!rec&&fd.w>rec.bw;
  // 首次釣獲日期只在第一次釣到時記錄；更新前的舊紀錄沒有日期就不顯示，不亂填
  save.dex[sp.id]={n:(rec?rec.n:0)+1,bw:Math.max(rec?rec.bw:0,fd.w),bl:Math.max(rec?rec.bl:0,fd.L),md:Math.max(rec&&rec.md||0,FUN.medalLv(fd)),f:rec?rec.f:Date.now()}; save.total++; persist();
  if(window.__STORY&&!G.fd.item) window.__STORY.onCatch(fd,{zone:(SPOTS[G.spot]||{}).id,loc:G.loc,per:period(G.hour),rain:W.U.uRain.value>.25});
  { const xp=META.onCatch(fd,{perfect:!!(G.f&&G.f.perfect),per:period(G.hour)}), pm=window.__ECO?window.__ECO.priceMul(sp.id):1; $('cXp').textContent='+'+xp+' 經驗　'+(window.__ECO?window.__ECO.lastDrop():'')+(pm>1?'　🔥行情 ×'+pm:''); }
  ui.catch.style.setProperty('--rc',r.col);
  $('cLv').textContent=fd.lvl; $('cName').textContent=sp.name; $('cRar').textContent=r.name+' '+r.en+(fd.grade?'｜'+fd.grade:''); $('cSci').textContent=sp.sci;
  $('cLen').textContent=(fd.L*100).toFixed(1)+' cm'; $('cW').textContent=fd.w<1?Math.round(fd.w*1000)+' g':fd.w.toFixed(2)+' kg';
  $('cVal').textContent='🪙 '+fd.value.toLocaleString(); $('cDesc').textContent=sp.desc+' 拉扯型態：'+styOf(sp.id).n+'，難度 '+stars(fd)+'。';
  { const mm=sp.special==='mermaid', ns=mm||!!sp.noSell; $('bSell').classList.toggle('hidden',ns); $('bRel').textContent=mm?'送她回家（收下謝禮）':sp.noSell?'拍照後放流':'放生'; if(mm) $('cW').textContent='？？？';
    if(sp.noSell&&!mm) $('cVal').textContent='保育類・不可販售'; }
  $('bGrill').classList.toggle('hidden',!canGrill(fd)||!HOME.unlocked()); $('bGrill').textContent='🔥 放進保冷箱，帶回去烤（'+((save.cooler||[]).length)+'/5）';
  { const hr=HOME.check(fd), b=$('bHome'); b.classList.toggle('hidden',!!hr.hide||!HOME.unlocked()); b.textContent=hr.mount?'🖼 '+hr.short+'，做成標本 🪙'+hr.cost.toLocaleString():'🏠 帶回家';
    b.dataset.mode=hr.ok?'keep':hr.mount?'mount':'no'; b.dataset.why=hr.why||''; b.classList.toggle('dim',!hr.ok&&!hr.mount); }
  FUN.medalBadge(fd); FUN.goalsDot(); if(sp.special==='mermaid'){ G.fish.group.visible=false; FUN.mermaidScene(); }
  const nb=$('cNew'); nb.textContent=isNew?'新魚種':'新紀錄'; nb.classList.toggle('hidden',!(isNew||isRec));
  const tag=$('tag'); tag.style.animation='none'; void tag.offsetWidth; tag.style.animation='';
  ui.catch.classList.remove('hidden'); document.body.classList.add('catching'); ui.actWrap.classList.add('hidden'); ui.sub.classList.add('hidden');
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
function goHome(){ if(G.state==='home') return; if(G.state!=='idle'){ toast('先收線再回家','warn'); return; } if(!HOME.unlocked()){ toast('完成主線第一章後才能整理小屋','warn'); return; }
  G.state='travel'; fadeEl.classList.add('on'); Snd.paddle();
  setTimeout(()=>{ try{ HOME3D.enter(); }catch(err){ console.error('goHome',err); } G.state='home'; document.body.classList.add('athome'); fadeEl.classList.remove('on'); toast('回到老漁人的小屋','good',1400); },650); }
function leaveHome(then){ if(G.state!=='home') return; G.state='travel'; fadeEl.classList.add('on');
  setTimeout(()=>{ HOME3D.exit(); document.body.classList.remove('athome'); G.state='idle'; fadeEl.classList.remove('on'); if(then) then(); else if(G.spot!==0) goSpot(0); },650); }
window.__goHome=goHome;
$('bOut').addEventListener('click',()=>leaveHome());
$('bGrillH').addEventListener('click',()=>{ if(window.__GRILL) window.__GRILL(); });
$('bTankM').addEventListener('click',()=>{ if(window.__openSheet) window.__openSheet('home'); });
function finishCatch(sell){
  const keep=sell==='keep'; if(keep) sell=false;   // 帶回家：不賣、也不算放生
  if(sell&&G.fd&&G.fd.sp&&(G.fd.sp.noSell||G.fd.sp.special==='mermaid')) sell=false;   // 保育類、美人魚：任何途徑都不能賣
  ui.catch.classList.add('hidden'); document.body.classList.remove('catching'); ui.actWrap.classList.remove('hidden'); ui.sub.classList.remove('hidden');
  const g=G.fish.group;
  if(G.fd.item) FUN.itemEffect(G.fd.item);
  if(sell){ const v=Math.round(G.fd.value*(1+(save.mer&&save.mer.n>=15?.2:save.mer&&save.mer.n>=8?.1:0))); save.coins+=v; persist(); Snd.coin(); coinFly(v); }
  else if(keep){ Snd.coin(); }
  else { META.onRelease(); if(G.fd.sp.special==='mermaid'){ const v=G.fd.value; save.coins+=v; persist(); Snd.coin(); coinFly(v); G.luck=.25; FUN.merMeet(); } else { G.luck=Math.min(.25,G.luck+.08); toast('放生了，下一竿稀有魚機率提高','good',1800); } }
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
    case 'wait': startRetrieve(G.dip>0?'太早了，魚被嚇跑了':'收線','warn'); break;
    case 'bite': { const r=FUN.hookPress(); if(r==='miss') missBite(); else hook(r==='perfect'); } break;
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
  if(G.state==='idle'||G.state==='wait') G.pitchT=clamp(pitch0+(e.clientY-dragY0)*.004,0,.62); });   // 上下拖曳：抬頭看天空
const dragRel=e=>{ if(e.pointerId!==dragPtr) return; dragPtr=null; if(actPtr===null) G.rodSideT=0; };
cv.addEventListener('pointerup',dragRel); cv.addEventListener('pointercancel',dragRel); cv.addEventListener('lostpointercapture',dragRel);
ui.act.addEventListener('lostpointercapture',actRel);
// 保險：手機瀏覽器偶爾會漏掉「放開」事件，讓按鈕／拖曳／搖桿永遠卡住。視窗層級再接一次，螢幕上沒有手指時全部清掉
function releaseAll(){ if(actPtr!==null){ actPtr=null; actUp(); } dragPtr=null; G.rodSideT=0; if(typeof KY!=='undefined'&&KY.ptr!==null){ KY.ptr=null; KY.thr=0; KY.turn=0; joyK.style.transform=''; } }
window.addEventListener('pointerup',e=>{ if(e.pointerId===dragPtr) dragRel(e); if(e.pointerId===actPtr) actRel(e); if(typeof KY!=='undefined'&&e.pointerId===KY.ptr) joyEnd(e); },true);
window.addEventListener('pointercancel',e=>{ if(e.pointerId===dragPtr) dragRel(e); if(e.pointerId===actPtr) actRel(e); if(typeof KY!=='undefined'&&e.pointerId===KY.ptr) joyEnd(e); },true);
window.addEventListener('touchend',e=>{ if(e.touches.length===0) setTimeout(()=>{ if(!(navigator.maxTouchPoints>0&&(dragPtr!==null||actPtr!==null))) return; releaseAll(); },120); },{passive:true});
document.addEventListener('visibilitychange',()=>{ if(document.hidden) releaseAll(); });
let dragY0=0, pitch0=0;
const keys={};
window.addEventListener('keydown',e=>{ if(e.repeat) return; keys[e.code]=true; if(e.code==='Space'&&G.state!=='intro'&&G.state!=='catch'){ e.preventDefault(); actDown(); } });
window.addEventListener('keyup',e=>{ keys[e.code]=false; if(e.code==='Space'){ e.preventDefault(); actUp(); } });

$('startBtn').addEventListener('click',()=>{ Snd.init(); $('intro').classList.add('hidden'); G.state='idle'; toast('按住按鈕蓄力，放開拋竿','',2200);
  // 預覽結局：網址帶 ending 參數時，開始後直接播放結局（測試與重看用）
  if(/[?&]ending=[1-9]/.test(location.search)) setTimeout(()=>window.__playEnding(),1200);
  else if(!save.tutDone&&!(save.total>0)) setTimeout(()=>startTutorial(),2400);   // 新玩家：第一次開始遊戲時跑新手指引
  else if(!save.tutDone){ save.tutDone=1; persist(); } });
$('bSell').addEventListener('click',()=>{ if(G.state==='catch') finishCatch(true); });
$('bRel').addEventListener('click',()=>{ if(G.state==='catch') finishCatch(false); });
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
window.__END=END; window.__saveNow=()=>persist(); window.__ENDON=()=>END.on();
// 結局之後的湖：碼頭盡頭的紀念與滿月夜的月潮
const AFTER=createEndingWorld(W,{done:()=>!!(save.story&&save.story.ending),lake:()=>(G.loc||'lake')==='lake'&&G.state!=='home',ending:()=>END.on(),hour:()=>G.hour});
window.__playEnding=done=>{ if(G.state==='home'){ leaveHome(()=>window.__playEnding(done)); return; } END.play(endingShots(END,{save,W,P,G}),done); };
// 靜月之光：作者的水晶小店（遊戲免費，喜歡的話可以支持作者）
const SHOP_URL='https://tw.shp.ee/BcamsN2F';
function openShop(){ const ui=$('shopUI'); ui.innerHTML=`<div class="box"><h3>💎 靜月之光・水晶手作</h3>
  <div class="sub">《濕地垂釣》完全免費。做這個遊戲的人，平常也親手挑選、串製天然水晶。<br>老漁人說：「月光灣的石頭會發光，這些也是。」喜歡的話，歡迎逛逛。</div>
  <div class="grid">${[1,2,3,4,5,6,7,8,9].map(i=>`<img src="shop${i}.jpg" alt="水晶作品" loading="lazy">`).join('')}</div>
  <a class="go" href="${SHOP_URL}" target="_blank" rel="noopener">🛍 前往蝦皮賣場「靜月之光」</a><button class="x" data-x="1">關閉</button></div>`;
  ui.classList.remove('hidden'); ui.onclick=e=>{ if(e.target===ui||e.target.dataset.x) ui.classList.add('hidden'); }; }
window.__SHOP=openShop;
window.__CLOUD=createCloud({save:()=>save,toast,test:TESTACC,
  grant:()=>{ if((save.coins||0)<999999){ save.coins=999999; setCoins(); META.syncHUD(); persist(); } toast('🧪 測試帳號：金幣 999,999','good',2600); },refresh:()=>{ if(window.__SHEET&&window.__SHEET.refresh) window.__SHEET.refresh('set'); },
  apply:obj=>{ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(obj)); }catch(e){} location.reload(); }});
const GHOST=createGhost(W,{toast:(m,c2,ms)=>toast(m,c2,ms),splash:(x,z,n,s)=>P.splash(x,0,z,n,s),ripple:(x,z,r)=>W.addRipple(x,z,r),splashSnd:k=>Snd.splash&&Snd.splash(k),save,persist:()=>persist(),period:()=>period(G.hour),loc:()=>G.loc||'lake',state:()=>uiBusy()?'menu':G.state,base:()=>G.base,head:()=>G.head,yaw:()=>G.yaw,to:()=>G.to,scream:()=>Snd.scream(),drip:()=>Snd.drip(),vib:p=>vib(p),shake:k=>{ G.gShake=k; },onMeet:()=>{ if(window.__STORY) window.__STORY.onMeet(); },storyDone:id=>!!(window.__STORY&&window.__STORY.done(id)),storyActive:id=>!!(window.__STORY&&window.__STORY.isActive&&window.__STORY.isActive(id)),moon:()=>window.__MOONPH?window.__MOONPH.illum():0,progOf:id=>window.__STORY&&window.__STORY.progOf?window.__STORY.progOf(id):null,say:t=>toast(t,'',3200),zone:()=>WL.zoneId(),scene:id=>{ if(window.__STORY) window.__STORY.onScene(id); }});
window.__GHOST=GHOST;
// 烤好了：依兩面熟度評分，吃下去依魚的來源得到效果
function onGrilled(rec,a,b,season,who){ const sp=SPECIES.find(s=>s.id===rec.id); if(!sp) return; const lo=season==='lemon'?.72:.78, hi=season==='lemon'?.95:.92, g=x=>x<.55?0:x<lo?1:x<hi?3:-1, ga=g(a), gb=g(b);
  const burnt=ga<0||gb<0, q=burnt?0:Math.min(ga,gb), name=burnt?'烤焦了':q>=3?'完美':q>=1?'半熟':'還是生的';
  const fx=sp.loc==='sea'||sp.water==='sea'?{id:'luck',n:'好運',i:'🍀'}:sp.loc==='ice'||(sp.spots||[]).includes('ice')?{id:'glow',n:'暖身（咬餌更快）',i:'♨️'}:{id:'meal_str',n:'力氣（魚累得更快）',i:'💪'};
  save.cook=save.cook||{}; const ck=save.cook[rec.id]=save.cook[rec.id]||{n:0,best:0}; ck.n++; if(q>ck.best) ck.best=q;
  // 料理圖鑑稱號：完美過的魚種數
  { const perf=Object.keys(save.cook).filter(k=>save.cook[k].best>=3).length; save.titles=save.titles||[]; for(const [n,tt] of [[5,'烤魚師傅'],[15,'爐火大師']]) if(perf>=n&&save.titles.indexOf(tt)<0){ save.titles.push(tt); setTimeout(()=>toast('🏅 獲得稱號「'+tt+'」：完美烤過 '+n+' 種魚','good',3200),1600); } }
  if(q<=0){ persist(); toast('🔥 '+sp.name+'：'+name+(who==='friend'?'……釣友客氣地吃了一口':'……吞不下去，沒有效果'),'warn',2600); return; }
  const legend=(sp.rar||0)>=4&&q>=3;
  if(who==='friend'){ const coins=Math.round((sp.price||20)*Math.pow((rec.w||.5)+.3,.85)*(q>=3?2.2:1.2)*(legend?2:1)); save.coins+=coins; setCoins();
    save.baits=save.baits||{}; const bt=q>=3?(legend?'moon':'live'):'shrimp', bn=q>=3?(legend?1:3):2; save.baits[bt]=(save.baits[bt]||0)+bn; persist();
    toast('🎁 釣友吃得很開心'+(q>=3?'，直說好吃！':'')+' 🪙'+coins+'・'+({moon:'月光餌',live:'活魚餌',shrimp:'活蝦'}[bt])+' ×'+bn,'good',3200); Snd.coin&&Snd.coin(); return; }
  const min=Math.round((q>=3?12:5)*Math.min(2,.6+Math.sqrt(rec.w||.5)*.5)*({salt:1.2,lemon:1.3}[season]||1)*(legend?2:1)*HOME.grillFxK()); save.fx=save.fx||{}; save.fx[fx.id]=Math.max(save.fx[fx.id]||0,Date.now())+min*60000;
  if(q>=3&&season==='herb') save.fx.glow=Math.max(save.fx.glow||0,Date.now())+Math.round(min*.6)*60000;
  if(legend){ const other=fx.id==='luck'?'meal_str':'luck'; save.fx[other]=Math.max(save.fx[other]||0,Date.now())+min*60000; }
  persist(); if(window.__ECO&&window.__ECO.render) window.__ECO.render();
  toast((legend?'👑 傳說料理！':'🍽 ')+sp.name+'：'+name+'！'+fx.i+' '+fx.n+' '+min+' 分鐘'+(q>=3&&season==='herb'?'・♨️ 咬餌更快':'')+(legend?'・雙重效果':''),'good',3200); Snd.coin&&Snd.coin(); }
const HOME3D=createHomeScene(W,{openShop:()=>openShop(),save,home:()=>HOME,grillHeat:()=>HOME.grillHeat(),coin:()=>{ Snd.coin&&Snd.coin(); },toast:(...a)=>toast(...a),persist:()=>persist(),onGrilled,buy:(id,p)=>{ if(save.coins<p){ toast('金幣不夠','warn',1400); return false; } save.coins-=p; setCoins(); persist(); return true; },sizzle:k=>{ Snd.sizzle&&Snd.sizzle(k); },joy:()=>({thr:KY.thr,turn:KY.turn}),hour:()=>G.hour,data:()=>HOME.data(),species:id=>SPECIES.find(s=>s.id===id),getFish:sp=>P.getFish(sp),
  isReal:id=>!!(window.__MDL&&window.__MDL.fishReady(id)),want:id=>{ if(window.__MDL&&window.__MDL.want) window.__MDL.want(id); },
  crackle:()=>Snd.crackle(), onEnter:()=>homeEnter(),
  showFish:(rec,card)=>{ const sp=SPECIES.find(s=>s.id===rec.id)||{name:rec.id,rar:0}, r=RAR[sp.rar]; card.style.setProperty('--rc',r.col);
    card.innerHTML=`<b>${sp.name}</b><small>${r.name}${rec.g?'｜'+rec.g:''}</small><div class="fg"><span>長度</span><div>${(rec.L*100).toFixed(1)} 公分</div><span>重量</span><div>${rec.w<1?Math.round(rec.w*1000)+' 公克':rec.w.toFixed(2)+' 公斤'}</div><span>釣到地點</span><div>${rec.at||'—'}</div><span>釣到日期</span><div>${new Date(rec.d).toLocaleDateString('zh-TW')}</div></div>`;
    card.classList.remove('hidden'); }});
window.__HOME=createHome({save,persist:()=>persist(),toast:(...a)=>toast(...a),setCoins:()=>setCoins(),addXP:x=>META.addXP(x),syncHUD:()=>META.syncHUD(),hour:()=>G.hour,setHour:h=>{ G.hour=h; W.setTime(h,true); },fxChanged:()=>{ if(window.__ECO&&window.__ECO.render) window.__ECO.render(); }}); const HOME=window.__HOME;
const META=createMeta({W,save,persist,toast,Snd,SPECIES,RAR,P,setCoins,vib,PRESETS,goSpot,curSpot:()=>G.spot,setHour:h=>{ G.hour=h; W.setTime(h,true); }});
const UW=createUnderwater(W,P);
const tvSea=new THREE.Vector3();
window.__MDL=createModels(W); const MDL=window.__MDL; MDL.preload('lake');
// 打開設定、商店等面板或新手指引時，鱷魚與女鬼都不會發動（玩家沒在看湖面）
const uiBusy=()=>{ const sh=document.getElementById('sheet'); return (sh&&!sh.classList.contains('hidden'))||!!document.getElementById('tutOv'); };
const WL=createWild(W,P,Snd,save,toast,vib,{period:()=>period(G.hour),base:()=>G.base,head:()=>G.head,
  state:()=>uiBusy()?'menu':G.state, loc:()=>G.loc||'lake', kayak:()=>({on:!!SPOTS[G.spot].kayak,v:Math.abs(KY.v),yaw:G.head}),
  onBite:(pos)=>{ faceThreat(pos,{dur:2.6,pitch:-.25}); if(G.state==='wait'||G.state==='bite'){ G.state='lost'; G.stT=0; G.snapped=true; }   // 鱷魚咬船：斷線、連擊歸零、驚魂未定
    G.combo=0; FUN.combo(0); G.scareT=6; G.gShake=1.6; vib([200,60,260,60,200]); biteFX('gator'); Snd.splash(2); toast('🐊 ……！','bad',1600); },
  onScare:why=>{ const ram=why==='ram', xp=Math.round(window.__LVINFO.xpNext(save.lv)*(ram?.04:.02)), cn=Math.round((ram?20:10)+save.lv*(ram?10:5));
    if(ram) save.gatorRam=(save.gatorRam||0)+1; else save.gatorScare=(save.gatorScare||0)+1; META.addXP(xp); save.coins+=cn; setCoins(); META.syncHUD(); persist(); G.gShake=ram?.9:.3;
    toast(`+${xp} 經驗　🪙${cn}`,'good',2200); } });
const AT=createAtmos(W,P,Snd,WL,{underwater:()=>UW.active(),period:()=>period(G.hour),base:()=>G.base,head:()=>G.head,spot:()=>G.spot,toast});
const FUN=createFun(W,P,AT,{G,save,persist,toast,Snd,vib,RAR,setCoins,D,SPN:SPECIES.length,period:()=>period(G.hour)}); window.__FUN=FUN;
const SEA=createSea(W,P,AT,{G,save,persist,toast,Snd,vib,setCoins,period:()=>period(G.hour),wx:()=>WL.wx(),underwater:()=>UW.active()});
const KK=createThrill(W,P,AT,{G,toast,Snd,vib,underwater:()=>UW.active(),hullDims:()=>SEA.hullDims(),hullClear:(p,m)=>SEA.hullClear(p,m),hullOut:(p,o)=>SEA.hullOut(p,o)}); window.__KK=KK;
G.saveRef=save;
window.__STORY=createStory({save,persist,toast,Snd,vib,goSpot:i=>goSpot(i),curSpot:()=>G.spot,idle:()=>G.state==='idle',pan:on=>{ G.cinePan=on; if(!on) G.yawT=0; },addXP:x=>META.addXP(x),setCoins:()=>setCoins(),syncHUD:()=>META.syncHUD()});
const SKY=createNightSky(W,G); window.__SKY=SKY;
/* 畫質：高／中／低，影響倒影、霧層光束、雨圈、草叢與解析度上限 */
// 自動（預設）：特效全開，解析度依實際幀率上下調整；高／中／低：固定，不自動改
window.__gfxCap=()=>Math.min(window.devicePixelRatio||1,2.5);
window.__applyGfx=q=>{ window.__GFX=q; const cap={high:2.5,mid:1.5,low:1,auto:2.5}[q]||2.5;
  if(W.setRefl) W.setRefl(q!=='low',q==='mid'?.22:.35); W.setPR(Math.min(window.devicePixelRatio||1,cap)); };
window.__applyGfx(save.gfx||'auto');
const ICE=createIce(W,{loc:()=>G.loc,base:()=>G.base,head:()=>G.head,state:()=>G.state,tens:()=>G.f?G.f.T:0,held:()=>G.held,grind:()=>Snd.grind&&Snd.grind(),splash:(p,k)=>{ P.splash(p.x,.02,p.z,Math.round(4+10*k),.25+.35*k); if(k>.85) vib(15); },chips:p=>{ P.splash(p.x+(Math.random()-.5)*.3,.05,p.z+(Math.random()-.5)*.3,3,.25); if(Math.random()<.5) Snd.click(); vib(8); },done:p=>{ P.splash(p.x,.05,p.z,24,.6); W.addRipple(p.x,p.z,.3); Snd.plop(); vib([20,30,40]); toast('冰洞鑿開了！點擊放線','good',1800); }});
function iceDrop(){ G.noBait=false; const bt=META.useBait(); G.baitUsed=bt&&bt.lure?Object.assign({},bt,{lure:null,wait:(bt.wait||1)*.85}):bt; LURE.bobberVis(true); G.to.copy(ICE.holePos()); G.castDist=1.6; bob.position.set(G.to.x,.6,G.to.z); Snd.plop(); landBobber(); } window.__ICE=ICE;
const MIST=createMorningMist(W,{hour:()=>G.hour,wx:()=>WL.wx(),sea:()=>G.loc==='sea',underwater:()=>UW.active(),wind:()=>WL.wind()}); window.__MIST=MIST;
const ARMS=createArms(W,P); window.__ARMS=ARMS;
const LURE=createLure(W,P,{G,toast,Snd,uwOn:()=>save.uw!==false,reelSpd:()=>META.gear().reel.spd,onChase:()=>{ if(!G.fd) prepFish(); if(!G.fd||G.fd.item) return null; const f=P.getFish(G.fd.sp); if(f) seeThrough(f.group); return f?{group:f.group,uni:f.uni,L:G.fd.L}:null; }}); window.__G=G;
window.__MOON=createMoonBay(W,{G,save,persist,toast,Snd,vib,hour:()=>((G.hour%24)+24)%24,zoneId:()=>WL.zoneId?WL.zoneId():'',period:()=>period(G.hour),giveRod:()=>{ const i=GEAR.rod.findIndex(r=>r.req==='moon'); if(i>=0&&save.gear.rod.indexOf(i)<0){ save.gear.rod.push(i); persist(); } }});
window.__TAL=createTalents({save,persist,toast,Snd,vib,setCoins,addXP:x=>META.addXP(x),loc:()=>G.loc||'lake',zoneId:()=>WL.zoneId?WL.zoneId():'',period:()=>period(G.hour)}); window.__SEA=SEA;
if(!SPOTS[save.spot]||(SPOTS[save.spot].kayak&&!save.kayak)||(SPOTS[save.spot].yacht&&!save.yacht)) save.spot=0;
{ const s=SPOTS[save.spot]; G.spot=save.spot; G.base.set(s.pos[0],0,s.pos[1]); G.head=s.head; WL.setSpot(save.spot); SEA.setLoc(s.loc||'lake'); }
function goSpot(i){ if(G.state==='home'){ leaveHome(()=>goSpot(i)); return; }   // 在小屋裡選了釣點：先出門再過去
  if(G.state!=='idle'){ toast('先收線再移動','warn'); return; } { const lk=window.__STORY&&window.__STORY.lock(i); if(lk){ toast('🔒 '+lk,'warn',2400); return; } }
  // 上一行：所有入口共用的開放檢查
  const s=SPOTS[i]; G.state='travel'; fadeEl.classList.add('on'); Snd.paddle(); setTimeout(()=>Snd.paddle(),380);
  setTimeout(()=>{ G.spot=i; G.base.set(s.pos[0],0,s.pos[1]); G.head=s.head; G.yaw=G.yawT=0; save.spot=i; persist(); WL.setSpot(i); if((s.loc||'lake')!==SEA.loc()) SEA.setLoc(s.loc||'lake'); fadeEl.classList.remove('on'); G.state='idle'; toast('抵達'+s.name); if(s.id==='moon'&&!save.lagoonPg){ save.lagoonPg=1; persist(); setTimeout(()=>{ if(window.__STORY&&window.__STORY.page) window.__STORY.page('手記・附頁：月光灣的秘密','月光灣不是普通的湖灣。<br><br>灣底有一條很深的石縫，一路通到外海。平常潮水進不來，可是每逢月圓、大潮漲到最高的那幾夜，海水就會從石縫湧進灣裡。<br><br>那幾夜，我在這裡釣過小丑魚、藍色的刺尾鯛、拖著長絲的鰺……都是海裡才有的魚。月亮越圓，牠們越多。<br><br>汐月說，她就是順著那條水道游進來的。<br><br>還有一件事，我只敢寫在這裡：有一年滿月的深夜，我看見一隻長著鹿角的海馬，比我的船還長，在月光下慢慢游過灣口。'); },1600); }; },750); }
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
function updateKayak(dt){
  if(HOME3D.active()){ joy.classList.remove('hidden'); return; }
  const s=SPOTS[G.spot], can=(s.kayak||s.yacht)&&G.state==='idle'&&!document.body.classList.contains('catching');
  joy.classList.toggle('hidden',!can);
  const z=s.kayak?zoneOf(G.base.x,G.base.z):G.spot; if(z!==KY.zone){ KY.zone=z; WL.setZone(z); }
  let thr=KY.thr, turn=KY.turn;
  if(keys.KeyW) thr=1; if(keys.KeyS) thr=-.6; if(keys.KeyA) turn=-1; if(keys.KeyD) turn=1;
  if(!can){ thr=0; turn=0; }
  if(!s.kayak&&!s.yacht){ KY.v=0; KY.w=0; WL.paddle(dt,0); stowRod(WL.padOn()); return; }
  KY.v+=(thr*(s.yacht?4:1.5)-KY.v*.65)*dt; KY.w+=(turn*.55*(.4+Math.min(1,Math.abs(KY.v)))-KY.w)*Math.min(1,dt*3);
  WL.paddle(dt,s.yacht?0:clamp(Math.max(Math.abs(thr),Math.abs(turn)*.7),0,1),AT.ring);   // 遊艇靠引擎，不划槳
  stowRod(WL.padOn());
  if(Math.abs(KY.v)<.002&&Math.abs(KY.w)<.002) return;
  G.head-=KY.w*dt;
  const fx=-Math.sin(G.head), fz=-Math.cos(G.head);
  let nx=G.base.x+fx*KY.v*dt, nz=G.base.z+fz*KY.v*dt;
  const r=Math.hypot(nx,nz), Rm=W.shoreR(Math.atan2(nx,-nz))-5; if(r>Rm){ nx*=Rm/r; nz*=Rm/r; KY.v*=-.2; }
  if(G.loc!=='sea'&&Math.abs(nx)<2.2&&nz>-4.6&&nz<7){ if(2.2-Math.abs(nx)<nz+4.6){ nx=nx<0?-2.2:2.2; } else nz=-4.6; KY.v*=.3; }
  if(G.loc!=='sea') for(const o of WL.obstacles){ const dx=nx-o[0], dz=nz-o[1], dd=Math.hypot(dx,dz)||.01, m=o[2]+1; if(dd<m){ nx=o[0]+dx/dd*m; nz=o[1]+dz/dd*m; KY.v*=.5; } }
  G.base.x=nx; G.base.z=nz;
  if(Math.abs(thr)>.1) G.yawT+=(0-G.yawT)*Math.min(1,dt*1.5);
  KY.wake-=dt; const spd=Math.abs(KY.v);
  if(spd>.25&&KY.wake<=0){ KY.wake=.4; AT.ring(G.base.x-fx*1.9,G.base.z-fz*1.9,.6+spd*.5); AT.ring(G.base.x+fx*1.8,G.base.z+fz*1.8,.3+spd*.3); if(spd>.9) P.splash(G.base.x+fx*1.9,0,G.base.z+fz*1.9,3,.3); }
}
const fadeEl=$('fade'), uwTag=$('uwTag');
let uwBusy=false;
function enterUW(){ if(UW.active()||uwBusy||(G.uwBlock&&G.t<G.uwBlock)) return; uwBusy=true; fadeEl.classList.add('on');
  setTimeout(()=>{ if(G.fd&&(G.state==='wait'||G.state==='bite')){ UW.start(G.fd); if(G.state==='bite') UW.bite(); const r=RAR[G.fd.sp.rar];
    // 咬餌之前不揭露魚種：只給模糊的體型暗示，留住期待感（稀有以上有低沉的提示聲）
    const L=G.fd.L||.3, hint=G.fd.item?'好像勾到什麼東西…':L>1.2?'水裡有個很大的影子…':L>.6?'看起來不小…':L>.3?'有東西靠過來了…':'小小的影子在打轉…';
    uwTag.style.setProperty('--rc','#9aa4ae'); $('uLv').textContent='?'; $('uName').textContent='？？？'; $('uRar').textContent=hint; uwTag.classList.remove('hidden');
    if(!G.fd.item&&(G.fd.sp.rar||0)>=2) Snd.rumble&&Snd.rumble(); }
    fadeEl.classList.remove('on'); uwBusy=false; },180); }
// 強制面對威脅（鯊魚、鱷魚、阿蘅）：鏡頭轉向攻擊者（可超過平常的轉頭限制），持續一段時間後回到原本視角；水下鏡頭立刻關閉且幾秒內不重開
function faceThreat(pos,opt){ opt=opt||{}; if(!pos) return; G.look={x:pos.x,z:pos.z,until:G.t+(opt.dur||2.4),snap:!!opt.snap,prev:G.look?G.look.prev:G.yawT,pitch:opt.pitch||0}; exitUW(); G.uwBlock=G.t+5; }
window.__FACE=faceThreat;
let uwExiting=false;
function exitUW(){ uwTag.classList.add('hidden'); if(!UW.active()||uwExiting) return; uwExiting=true; fadeEl.classList.add('on'); setTimeout(()=>{ UW.end(); fadeEl.classList.remove('on'); uwExiting=false; },160); }
// 水下鏡頭只屬於「等魚、咬餌」：任何原因離開這兩個狀態（鱷魚、斷線、拉魚…）都自動關掉
function guardUW(){ if(UW.active()&&!uwExiting&&G.state!=='wait'&&G.state!=='bite') exitUW(); }

/* ---------- 每幀更新 ---------- */
function updateFight(dt){
  const f=G.f, sp=G.fd.sp, fs=sp.f, fd=G.fd;
  const ST=styOf(fd.sp.id), DF=D();
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
  const stamF=.4+.6*f.stam/100;
  const F=fs.pow*(.8+.25*Math.pow(fd.w,.45))*(1+.22*sp.rar)*(fd.boss?fd.boss.pow:1)*stamF*(f.run?ST.mul:1)*(dive?1.35:1);
  const good=-f.latDir*G.rodSide, steerMul=1-.28*clamp(good,0,1)+.15*clamp(-good,0,1);
  let Tt=(F*(G.held?1:.35)+(G.held?.5:0))/(META.gear().line.s*DF.line)*steerMul*META.gear().rod.tens;
  if(f.jumpT>0&&G.held) Tt+=.45;
  if(shake) Tt+=G.held?.38:.12;
  Tt+=(Math.sin(G.t*13.1)+Math.sin(G.t*7.3))*.015*(f.run?2:1)*DF.jit;
  f.T+=(Tt-f.T)*Math.min(1,dt*5);
  if(f.T>.9) f.brk+=dt*(f.T-.9)*14*META.gear().reel.drag*(1-.05*TR('power')); else f.brk=Math.max(0,f.brk-dt*.8);
  if(f.T<.1) f.slk+=dt/(2.8*DF.slack); else f.slk=Math.max(0,f.slk-dt*1.5);
  const zone=f.T>.4&&f.T<.8;
  const drain=(3+18*f.T)*(1+.8*clamp(good,0,1))*(zone?1.2:1)/(fs.stam*DF.stam*(.7+.25*Math.sqrt(fd.w)));
  f.stam=clamp(f.stam-drain*(window.__ECO&&window.__ECO.fxOn('meal_str')?1.3:1)*dt+(f.T<.2?2.5*dt:0),0,100);
  const reel=G.held?META.gear().reel.spd*clamp(1.25-f.T,.15,1)*(f.stam<8?1.4:1)*(zone?1.15:1)*(dive?.3:1):0;
  const run=f.run?fs.spd*ST.spd*stamF*1.5*(G.held?.35:1)*(dive?.4:1):(G.held?0:.05);
  f.d=Math.max(0,f.d+(run-reel)*dt);
  f.theta=clamp(f.theta+f.latDir*fs.agi*ST.lat*.16*stamF*dt*(G.held?.7:1),-.85,.85);
  const az=f.az0+f.theta; { fishPos(tv,0); const r=Math.hypot(tv.x,tv.z), Rm=W.shoreR(Math.atan2(tv.x,-tv.z))-3; if(r>Rm) f.d=Math.max(2,f.d-(r-Rm)); }
  if(G.held){ f.clickA+=reel*dt*9; while(f.clickA>=1){ Snd.click(); f.clickA-=1; } rod.spin-=reel*dt*14; }
  else if(f.run&&f.T>.3){ f.clickA+=dt*28; while(f.clickA>=1){ Snd.click(4500); f.clickA-=1; } }
  f.vibT-=dt; if(f.vibT<=0){ if(f.T>.85){ vib(14); f.vibT=.22; } else if(f.run){ vib(Math.round(5+8*f.T)); f.vibT=.32; } else f.vibT=.2; }
  fishPos(tv,0);
  f.ripT-=dt; if(f.ripT<=0){ f.ripT=f.run?rand(.12,.3):rand(.4,.8); W.addRipple(tv.x,tv.z,.15+.35*f.T+(f.run?.12:0)); if(f.run) P.splash(tv.x,0,tv.z,Math.round(3+8*f.T),.25+.35*f.T); }
  // 跳水
  const g=G.fish.group;
  if(f.jumpT>0){
    f.jumpT-=dt; const s=1-f.jumpT/f.jumpDur, h=.5+.45*Math.sqrt(fd.L), y=4*h*s*(1-s)-.15*fd.L;
    g.position.set(tv.x,y,tv.z); te.set(0,az+(f.latDir<0?Math.PI:0)+Math.PI/2,clamp(4*h*(1-2*s)/(1.2*fd.L+.5),-1.2,1.2)); g.quaternion.setFromEuler(te);
    G.fish.uni.uAmp.value=.14; G.fish.uni.uSwim.value+=dt*18;
    if(f.jumpT<=0){ g.visible=false; P.splash(tv.x,0,tv.z,30,1.1); W.addRipple(tv.x,tv.z,.9); Snd.splash(1); }
  } else if(f.run&&fs.jump>0&&fd.sp.special!=='mermaid'&&f.stam>20&&f.d>4&&G.loc!=='ice'&&Math.random()<fs.jump*.3*dt) startJump();
  // 魚影
  const sh=P.shadow; sh.position.set(tv.x-Math.sin(az)*.4,.012,tv.z-Math.cos(az)*.4); sh.rotation.y=az+(f.latDir<0?-Math.PI/2:Math.PI/2); sh.scale.setScalar(fd.L*1.15);
  sh.material.opacity=f.jumpT>0?0:.4*(1-sstep(3,10,f.d));
  // 浮標與釣竿
  { const pull=clamp(f.T*1.1+(f.run?.15:0),0,1);   // 浮標被拖進水裡、朝釣竿方向傾斜
    bob.position.set(tv.x,-.03-.28*pull+Math.sin(G.t*9)*.012*(f.run?1:.4),tv.z); bob.rotation.set(-.6*pull,0,Math.sin(G.t*7)*.25*(1-pull*.6)); }
  { const load=clamp(.25+.35*Math.min(1,fd.w/3),.25,.6), jit=(f.run||shake)?Math.sin(G.t*38)*.05*(.5+f.T):0;   // 掛上魚就有弧度，張力再加深，衝刺甩頭時竿尖抖動
    rod.end=G.endV.copy(tv); rod.pitchT=.18+.08*f.T; rod.bendT=clamp(load+.75*f.T+(f.run?.08:0)+jit,0,1.15); }
  G.yawT=clamp(az-G.head,-.95,.95);
  // HUD
  ui.tFill.style.width=(f.T*100).toFixed(1)+'%'; ui.tFill.style.background=f.T<.65?'var(--good)':f.T<.9?'var(--warn)':'var(--bad)';
  ui.tBar.classList.toggle('danger',f.T>.9); ui.fTens.textContent=Math.round(f.T*100)+'%';
  ui.sFill.style.width=f.stam.toFixed(1)+'%'; ui.fStam.textContent=Math.round(f.stam)+'%';
  ui.fDist.textContent=f.d.toFixed(1)+' m'; ui.fName.textContent=(fd.boss?'👑 '+fd.boss.name+'　':'')+stars(fd)+' '+sizeWord(fd.w)+(dive?'，往深處鑽':shake?'，甩頭中':f.run?'，正在衝刺':'')+WL.chaseTxt();
  if(f.latDir!==0){ ui.steer.classList.remove('hidden'); ui.steer.textContent=f.latDir>0?'◀ 往左拉竿':'往右拉竿 ▶'; ui.steer.classList.toggle('ok',good>.4); }
  else ui.steer.classList.add('hidden');
  if(f.slk>.3&&!f.slkW){ f.slkW=1; vib([40,40,40]); } if(f.slk<.1) f.slkW=0; ui.tBar.classList.toggle('slack',f.slk>.3);
  setAct(G.held?'收線中':'按住<br>收線', f.slk>.3?'⚠️ 線太鬆了，快按住收線！':f.run&&G.held&&f.T>.8?'魚在衝刺，先放手！':!f.run&&!G.held?'魚停了，快按住收線':'魚往哪游，就往反方向滑動拉竿', false);
  if(WL.stolen()) return lose('gator');
  if(SEA.stolen()) return lose('shark');
  if(f.brk>=1){ if(window.__ECO&&window.__ECO.useLeader()){ f.brk=.35; toast('⛓️ 鋼絲前導線撐住了！','good',1600); vib(60); } else return lose('snap'); }
  if(f.slk>=1) return lose('slack');
  if(f.d>MAX_LINE) return lose('spool');
  if(f.d<(G.spot===0?4.0:2.6)){
    // 魚還有力氣就拉不上來：靠近時再衝出去，要遛到沒力才能收進來
    // 衝出去會消耗魚的體力，最多衝兩次；體力低於 45% 或衝過兩次就拉得上來
    f.surges=f.surges||0; if(f.stam<=45||f.surges>=2) return land();
    f.surges++; f.stam=Math.max(0,f.stam-25); f.d+=2+Math.random()*2; f.run=true; f.phaseT=rand(1,1.8); P.splash(G.to.x,0,G.to.z,14,.8); vib([30,20,40]);
    if(!f.surgeTip){ f.surgeTip=1; toast('魚還有力氣，又衝出去了','warn',1500); } }
}

function update(dt){
  // 拉魚開始時記住拋竿瞄準的方向；離開拉魚（釣到、跑掉、斷線）就轉回去。放在最前面，不受後面任何錯誤影響
  // 離開拉魚：釣竿傾斜一律歸零，不受手指狀態影響
  if(G.prevSt==='fight'&&G.state!=='fight'){ G.yawT=G.aimYaw||0; G.rodSideT=0; }
  if(G.state==='fight'&&G.prevSt!=='fight') G.aimYaw=G.aimYawCast!=null?G.aimYawCast:G.yawT; G.prevSt=G.state;
  G.t+=dt; G.hour+=dt/40;
  G.hSave=(G.hSave||0)+dt; if(G.hSave>10){ G.hSave=0; save.hour=((G.hour%24)+24)%24; persist(); }
  const info=W.setTime(G.hour); W.update(dt,G.t); updateKayak(dt);
  if(keys.ArrowLeft||keys.ArrowRight){ const k=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0); if(G.state==='fight') G.rodSideT=k; else if(G.state==='idle'||G.state==='charge'||G.state==='wait'||G.state==='bite'||G.state==='lure') G.yawT=clamp(G.yawT-k*dt*1.2,-.95,.95); }
  G.rodSide+=(G.rodSideT-G.rodSide)*Math.min(1,dt*8); rod.side=G.rodSide;
  if(G.state!=='fight'){ rod.end=null; rod.bendT=.03; } bob.visible=!G.snapped&&!((G.drillK||0)>.5); bob.rotation.set(0,0,0);
  let lineEnd=null, slack=.35, lineOn=!G.snapped, trem=0;
  const st=G.state;
  if(st==='intro'||st==='idle'||st==='charge'){
    rod.pitchT=st==='charge'?.15+.5*G.power:Math.sin(G.t*.8)*.01;
    if(st==='charge'){ G.chargeT+=dt; G.power=(1-Math.cos(G.chargeT*2.4))/2; setPower(G.power); setAct('放開<br>拋竿','力道條滿格時放開最遠',false); }
    else if(st==='idle'){ if(G.loc==='ice'){ if(!ICE.drilled()){ if(G.held) ICE.drill(dt); setAct(G.held?'鑿冰中 '+Math.round(ICE.progress()*100)+'%':'按住<br>鑿冰洞','冰釣：先在前方鑿開冰洞',false); } else setAct('點擊<br>放線','把浮標從冰洞放下去',false); } else setAct('按住<br>蓄力','左右拖曳畫面可以轉向瞄準',false); }
  }
  P.updateRod(dt);
  if(st==='intro'||st==='idle'||st==='charge'){ hangPos(bob.position); lineEnd=bob.position; slack=.05; }
  else if(st==='cast'){
    if(G.delay>0){ G.delay-=dt; hangPos(bob.position); if(G.delay<=0) G.from.copy(bob.position); }
    else { G.castT+=dt; const s=Math.min(1,G.castT/G.castDur);
      bob.position.set(lerp(G.from.x,G.to.x,s),lerp(G.from.y,0,s)+4*G.apex*s*(1-s),lerp(G.from.z,G.to.z,s));
      if(G.castT>.25) rod.pitchT=.05; if(s>=1) landBobber(); }
    lineEnd=bob.position; slack=.1; setAct('・・・','',false);
  }
  else if(st==='lure'){
      const ev=LURE.update(dt,G.held); bob.position.copy(LURE.pos()); lineEnd=bob.position; slack=.08; if(G.held){ rod.spin-=dt*14; if(Math.random()<dt*10) Snd.click(); }
      setAct(G.held?'收線中':'按住收線<br>點擊抽竿',LURE.interest()>.25?'魚在追！照這個節奏繼續':'按住收線、短按抽竿，找出魚喜歡的節奏',false);
      if(ev==='strike'){ G.to.set(bob.position.x,0,bob.position.z); G.castDist=Math.hypot(G.to.x-G.base.x,G.to.z-G.base.z); { const ch=LURE.chaser(); if(ch){ ch.group.position.set(G.to.x,-.05,G.to.z); } } LURE.end(); if(!G.fd) prepFish(); P.splash(G.to.x,0,G.to.z,40,1.3); W.addRipple(G.to.x,G.to.z,.9); Snd.splash&&Snd.splash(1.2); vib([40,30,80]); bite(); toast('咬了！','good',900); }
      else if(ev==='lost'){ G.fd=null; toast('魚失去興趣游走了','warn',1400); }
      else if(ev==='done'){ LURE.end(); startRetrieve('路亞收回來了，這次沒有魚咬','warn'); LURE.bobberVis(true); }
    }
  else if(st==='wait'||st==='bite'){
    rod.pitchT=.05;
    const y=W.swell(G.to.x,G.to.z,G.t)-.005;
    if(st==='wait'){
      G.timer-=dt; if(G.dip>0) G.dip-=dt;
      if(G.noBait) G.timer=99;
if(G.timer<=0){ if(G.nib>0){ G.nib--; nibble(); G.timer=rand(.7,2.2); } else bite(); }
      if(G.state==='wait'&&G.nib===0&&G.timer<3&&!G.fd){ prepFish(); if(!G.fd.item&&(save.uw!==false||G.fd.sp.special==='mermaid')) enterUW(); }
      if(UW.active()&&G.state==='wait') UW.setProgress(1-G.timer/3);
      if(G.fd&&G.state==='wait'){ G.bubT=(G.bubT||0)-dt; if(G.bubT<=0){ G.bubT=rand(.25,.7); W.addRipple(G.to.x+rand(-.3,.3),G.to.z+rand(-.3,.3),.05); P.splash(G.to.x+rand(-.25,.25),0,G.to.z+rand(-.25,.25),1,.15); } }
      { const wv=WL.wind(); G.to.x+=wv.x*wv.s*.05*dt; G.to.z+=wv.z*wv.s*.05*dt; }
      const dip=G.dip>0?Math.sin((G.dip/(G.dipMax||.28))*Math.PI)*(G.dipAmp||.035):0;
      bob.position.set(G.to.x,y-dip,G.to.z);
      if(G.nib===0&&G.timer<3) G.approach=Math.min(1,G.approach+dt*.5);
      if(G.approach>0){ const a=G.t*.8; P.shadow.position.set(G.to.x+Math.cos(a)*.9,.012,G.to.z+Math.sin(a)*.9); P.shadow.rotation.y=-a; P.shadow.scale.setScalar(.45); P.shadow.material.opacity=.18*G.approach; }
      setAct('收線',UW.active()?'魚正在靠近餌……':'浮標被拉進水裡時，立刻點擊！',false);
    } else {
      G.biteT+=dt; bob.position.set(G.to.x+Math.sin(G.biteT*3)*.15,y-.13-.04*Math.sin(G.biteT*12),G.to.z+G.biteT*.2);
      P.shadow.material.opacity=0;
      setAct('起鉤','藍色區按下＝完美，黃色區＝上鉤',true);
      if(FUN.hookExpired()){ FUN.pop('錯過','miss'); missBite(); }
    }
    lineEnd=bob.position; slack=.35;
  }
  else if(st==='fight'){ updateFight(dt); if(G.state==='fight'){ const f=G.f; lineEnd=rod.end; slack=clamp(.1*(1-f.T*1.4),0,.1);   // 魚掛在線上：線幾乎繃直
      trem=(.012+.05*f.T)*(f.run?1.6:1); } }
  else if(st==='retrieve'){
    G.stT+=dt; const s=Math.min(1,G.stT/.9), e=sstep(0,1,s); hangPos(tv);
    bob.position.set(lerp(G.from.x,tv.x,e),s<.7?W.swell(bob.position.x,bob.position.z,G.t):lerp(0,tv.y,(s-.7)/.3),lerp(G.from.z,tv.z,e));
    rod.spin-=dt*20; if(Math.random()<dt*14) Snd.click(); lineEnd=bob.position; slack=.15; setAct('收線中','',false);
    if(s>=1) G.state='idle';
  }
  else if(st==='lost'){ G.stT+=dt; lineOn=false; setAct('・・・','',false); if(G.stT>1.3){ G.snapped=false; G.state='idle'; } }
  else if(st==='land'||st==='catch'||st==='post'){
    const g=G.fish.group, D=dispDist(); rod.pitchT=.45; bob.visible=false; lineOn=st!=='post';
    W.head.updateMatrixWorld(true);
    if(st==='land'){
      G.stT+=dt; const s=Math.min(1,G.stT/1.25), e=s*s*(3-2*s);
      W.head.localToWorld(tv.set(0,.14*D,-D)); W.head.getWorldQuaternion(tq);
      g.position.copy(G.landFrom).lerp(tv,e); g.position.y+=Math.sin(Math.PI*s)*.6;
      g.quaternion.copy(G.landQ).slerp(tq,e); G.fish.uni.uAmp.value=.12; G.fish.uni.uSwim.value+=dt*16;
      if(s>=1){ W.head.attach(g); g.position.set(0,.14*D,-D); g.rotation.set(0,0,0); G.state='catch'; G.stT=0; showCard(); }
    } else if(st==='catch'){
      G.stT+=dt; g.rotation.set(0,Math.sin(G.stT*.6)*.35,Math.sin(G.stT*.9)*.05);
      G.fish.uni.uAmp.value=.035+.03*Math.max(0,Math.sin(G.stT*2.1)); G.fish.uni.uSwim.value+=dt*7;
    } else {
      G.stT+=dt; const s=Math.min(1,G.stT/.6);
      if(G.postSell){ g.scale.setScalar(G.fd.L*(1-s)); }
      else { g.position.y=G.from.y-9.8*.5*G.stT*G.stT; if(g.position.y<0&&!G.splashed){ G.splashed=true; P.splash(g.position.x,0,g.position.z,30,1); W.addRipple(g.position.x,g.position.z,.8); Snd.splash(.8); } }
      if(s>=1&&(G.postSell||g.position.y<-1)){ g.visible=false; g.scale.setScalar(1); G.splashed=false; G.state='idle'; }
    }
    if(lineOn){ W.head.localToWorld(tv.set(0,.14*D+.03,-D+.02)); lineEnd=tv; slack=.05; }
  }
  if((G.drillK||0)>.5) lineOn=false;
  P.setLine(lineEnd||rod.tipW, slack, lineOn&&!!lineEnd, info.light, trem);
  if(st!=='fight'&&st!=='wait'&&st!=='lure') { if(st!=='bite') P.shadow.material.opacity=Math.max(0,P.shadow.material.opacity-dt); }
  const showing=st==='land'||st==='catch';
  P.updateFx(dt,info.light); UW.update(dt); WL.update(dt,G.t); AT.update(dt,G.t); FUN.update(dt); SEA.update(dt,G.t); KK.update(dt,G.t); MDL.update(dt); if(!save.lookTip&&W.info.day<.15&&G.state==='idle'&&G.t>20){ save.lookTip=1; persist(); toast('🌌 上下拖曳畫面可以抬頭看星空','good',3500); }
  if(G.cinePan) G.yawT=Math.sin(performance.now()*.00011)*.55;   // 開場過場：鏡頭緩慢左右擺動
  window.__MOON.update(dt); if(window.__TAL) window.__TAL.tick(G); if(window.__STORY) window.__STORY.tick(dt); { const dr=G.loc==='ice'&&G.held&&G.state==='idle'&&ICE.drilling&&ICE.drilling(); G.drillK=(G.drillK||0)+((dr?1:0)-(G.drillK||0))*Math.min(1,dt*8); if(G.drillK>.01){ stowRod(Math.max(WL.padOn(),G.drillK)); G.pitchT=Math.min(G.pitchT||0,-.4*G.drillK); }
    ARMS.update(!UW.active()&&G.state!=='ending',G.state,G.power,dt,G.drillK>.01?{k:G.drillK,grip:(sd,o)=>ICE.grip(sd,o)}:{k:WL.padOn(),grip:WL.padGrip}); } SKY.update(dt,((G.hour%24)+24)%24); MIST.update(dt); ICE.update(dt);
  { const z=WL.zoneId?WL.zoneId():'', tgt=G.loc==='ice'?[.03,.08,.12]:G.loc==='sea'?(z==='reef'?[.02,.2,.25]:[.01,.08,.2]):[.04,.13,.15], v=SEE_U.value, k=Math.min(1,dt*1.5);   // 水下物體混入的水色依地點
    v.set(v.x+(tgt[0]-v.x)*k,v.y+(tgt[1]-v.y)*k,v.z+(tgt[2]-v.z)*k); }
  { const zr=WL.zoneId&&WL.zoneId()==='reef'?1:0, k=Math.min(1,dt*.8); W.U.uReef.value+=(zr-W.U.uReef.value)*k;
    const sc=W.U.uSeaCol.value; if(zr) sc.lerp(tvSea.set(.02,.30,.40),k); else sc.lerp(tvSea.set(.012,.12,.30),k); }
  if(G.look){ if(G.t>G.look.until){ G.yawT=clamp(G.look.prev,-.95,.95); G.look=null; }
    else { let a=Math.atan2(-(G.look.x-G.base.x),-(G.look.z-G.base.z))-G.head; while(a-G.yaw>Math.PI) a-=Math.PI*2; while(a-G.yaw<-Math.PI) a+=Math.PI*2; G.yawT=a; if(G.look.snap){ G.yaw=a; G.look.snap=false; } } }
  G.yaw+=(G.yawT-G.yaw)*Math.min(1,dt*(G.look?9:st==='fight'?2.5:6)); W.player.rotation.y=G.head+G.yaw;
  if(G.state!=='idle'&&G.state!=='wait') G.pitchT=0; if(G.look) G.pitchT=G.look.pitch; G.pitch=(G.pitch||0)+((G.pitchT||0)-(G.pitch||0))*Math.min(1,dt*5);   // 蓄力、拉魚時視角自動回正
  if(G.scareT>0) G.scareT-=dt; if(G.gShake>0) G.gShake=Math.max(0,G.gShake-dt*.7);
  { const f=G.state==='fight'?G.f:null, want=(f?((f.run?.45:0)+(f.ev&&f.ev.k==='shake'?.6:0)+(f.T>.85?.35:0)):0)+(G.gShake||0); G.shk=(G.shk||0)+(want-(G.shk||0))*Math.min(1,dt*6);
    W.head.rotation.x=-.16+(G.pitch||0)+Math.sin(G.t*.5)*.004+Math.sin(G.t*29)*.005*G.shk; W.camera.rotation.z=Math.sin(G.t*.37)*.003+Math.sin(G.t*23+1.7)*.004*G.shk; }
  showLightSet(showing);
  const hh=((G.hour%24)+24)%24, cl=String(Math.floor(hh)).padStart(2,'0')+':'+String(Math.floor((hh%1)*60)).padStart(2,'0');
  if(ui.clock.textContent!==cl) ui.clock.textContent=cl;
}
let showL=null; W.head.children.forEach(c=>{ if(c.isPointLight) showL=c; });
function showLightSet(on){ if(showL) showL.intensity+=((on?1.4:0)-showL.intensity)*.1; }

/* ---------- 主迴圈與自動畫質 ---------- */
function onResize(){ W.resize(window.innerWidth,window.innerHeight); UW.resize(window.innerWidth,window.innerHeight); }
window.addEventListener('resize',onResize); onResize();
if(typeof save.hour==='number'&&isFinite(save.hour)) G.hour=save.hour;
W.setTime(G.hour,true);
let last=performance.now(), prAcc=0, prN=0, prChecks=0;
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000)); last=now;
  try{ update(dt); if(END.on()){ END.tick(dt); bob.visible=false; P.setLine(rod.tipW,0,false,0,0); } END.frame(dt); AFTER.update(dt); guardUW(); MDL.glowTick(); if(!HOME3D.active()&&!END.on()) GHOST.update(dt); if(HOME3D.active()) HOME3D.render(dt); else if(UW.active()) UW.render(); else { W.render(); LURE.renderPiP(W.renderer,dt); } }catch(e){ console.error(e); }
  prAcc+=dt; prN++;
  if(prAcc>2){ const fps=prN/prAcc, mode=save.gfx||'auto', ready=window.__REALDONE&&document.getElementById('intro').classList.contains('hidden')&&!document.hidden;
    if(ready){ G.gfxWarm=(G.gfxWarm||0)+1; }
    // 載入與剛開始的前 3 個量測區間不算（下載、編譯著色器時本來就會卡），之後連續偏慢才降、連續很順才升
    if(ready&&G.gfxWarm>3&&mode==='auto'){ const pr=W.getPR(), cap=window.__gfxCap();
      if(fps<27){ G.gSlow=(G.gSlow||0)+1; G.gFast=0; } else if(fps>=50){ G.gFast=(G.gFast||0)+1; G.gSlow=0; } else { G.gSlow=0; G.gFast=0; }
      if(G.gSlow>=2&&pr>1.01){ W.setPR(Math.max(1,pr-.25)); G.gSlow=0; }
      else if(G.gSlow>=3&&pr<=1.01&&!G.gReflOff){ G.gReflOff=true; if(W.setRefl) W.setRefl(true,.22); G.gSlow=0; }
      else if(G.gFast>=4&&pr<cap-.01){ W.setPR(Math.min(cap,pr+.25)); G.gFast=0; } }
    else if(ready&&G.gfxWarm===8&&fps<27&&mode==='high'&&!G.gfxHint){ G.gfxHint=true; toast('畫面有點卡，可以到設定把畫質調成「自動」或「中」','warn',3500); }
    window.__FPS=fps; prChecks++; prAcc=0; prN=0; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
}

(function boot(){
  if(!window.THREE){ boot.n=(boot.n||0)+1; if(boot.n>240){ showErr('3D 引擎載入失敗。請確認網路連線後重新整理頁面。'); return; } setTimeout(boot,50); return; }
  try{ const W=createWorld({canvas:document.getElementById('c')}); window.__DIAG=createDiag(W,{get G(){ return window.__G||{}; },get save(){ return (window.__G&&window.__G.saveRef)||{}; }}); const P=createProps(W);
    // 主畫面的載入提示：進度條、第一次進入的說明、網路慢時的提醒（避免玩家以為當機）
    const ln=document.getElementById('loadNote'), lbox=document.getElementById('loadBox'), lbar=document.querySelector('#loadBar i'), ltip=document.getElementById('loadTip'), sb=document.getElementById('startBtn');
    const first=!localStorage.getItem('swampAngler.loaded'); let lastP=-1, lastT=performance.now();
    if(ltip) ltip.textContent=first?'第一次進入需要下載真實的湖景、模型與貼圖（約 60MB），視網路速度約 1～3 分鐘。下載完會存在裝置裡，下次幾秒就好。':'正在從裝置讀取場景，請稍候…';
    if(sb&&first){ sb.dataset.t=sb.textContent; sb.textContent='場景下載中，請稍候…'; sb.style.opacity=.7; }
    const slow=setInterval(()=>{ if(lbox&&lbox.classList.contains('done')){ clearInterval(slow); return; } if(performance.now()-lastT>15000&&ltip) ltip.textContent='網路比較慢，仍在下載中，請不要關閉畫面…（也可以先按「開始釣魚」，畫面會在下載完後自動變成真實場景）'; },3000);
    try{ window.__REAL=createReal(W,P,(p,done,err)=>{ if(!ln) return; if(p!==lastP){ lastP=p; lastT=performance.now(); }
      if(lbar) lbar.style.width=Math.max(3,Math.round((done?1:p)*100))+'%';
      if(done||Math.round(p*100)>=100){ window.__REALDONE=true; ln.textContent='✅ 真實場景已載入'; if(lbox) lbox.classList.add('done'); try{ localStorage.setItem('swampAngler.loaded','1'); }catch(e){} if(sb&&sb.dataset.t){ sb.textContent=sb.dataset.t; sb.style.opacity=''; } }
      else if(err&&p===0) ln.textContent='部分場景檔案載入失敗，暫用簡化畫面（'+err+'）';
      else ln.textContent='正在載入真實場景… '+Math.round(p*100)+'%'; }); }catch(e){ console.warn(e); }
    startGame(W,P); }
  catch(e){ console.error(e); showErr('這個瀏覽器無法啟動 WebGL 3D 畫面。<br><small>'+String(e&&e.message||e)+'</small>'); }
})();
