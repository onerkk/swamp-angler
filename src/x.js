/* ===== 湖裡還有人等燈：林秋月（夜裡偶爾出現的驚嚇事件，之後接隱藏章節） ===== */
function createGhost(W,c){
'use strict';
let ghostRig=null, aliveRig=null;
const T=THREE, S=c.save, GL=T.GLTFLoader?new T.GLTFLoader():null;
let model=null, loading=false, mats=[], ev=null, lastTry=0, sessionStart=performance.now();
let alive=null, aliveLoading=false, fin=null, calm=null, calmTry=0;
// 老漁人的提燈：髮簪與三次相遇完成後的夜裡提在手邊，結局時林秋月看的就是它
let lamp=null, lampLoading=false; const lampL=new T.PointLight(0xffb866,0,7,1.4); W.scene.add(lampL);
function loadLamp(fn){ if(lamp) return fn(lamp); if(lampLoading||!GL) return; lampLoading=true;
  GL.load('models/lantern.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ mt.emissive=new T.Color(0xffc070); mt.emissiveMap=mt.map; mt.emissiveIntensity=.35; } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), sc=.32/Math.max(sz.y,1e-6); o.scale.setScalar(sc); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z); lamp=new T.Group(); lamp.add(o); lamp.visible=false; W.scene.add(lamp); lampLoading=false; fn(lamp); },undefined,()=>{ lampLoading=false; }); }
function lampWanted(){ if(fin) return true; if(!c.storyActive||!c.storyActive('lantern')||!c.progOf) return false; const p=c.progOf('lantern'); return !!p&&p[0]>=1&&p[1]>=3&&c.period()==='night'&&c.loc()==='lake'; }
let lampNeed='', lampNeedT=-99;
function updLamp(dt,t){ const want=lampWanted(); if(want&&!lamp){ loadLamp(()=>{}); }
  if(!lamp){ lampL.intensity=0; return; } lamp.visible=want; if(!want){ lampL.intensity=0; return; }
  if(!fin&&!S.lampHint&&c.toast){ S.lampHint=1; c.persist(); c.toast('🏮 老漁人的燈在你手邊亮了起來。滿月的夜晚（或掛上月光餌），提著它到浮萍灣。','good',5200); }
  const h=c.head(), fw=new T.Vector3(-Math.sin(h),0,-Math.cos(h)), rt=new T.Vector3(Math.cos(h),0,-Math.sin(h)), cp=W.camera.getWorldPosition(new T.Vector3());
  lamp.position.copy(cp).addScaledVector(fw,.75).addScaledVector(rt,.42); lamp.position.y=cp.y-.62+Math.sin(t*1.7)*.015;   /* 右手邊、視線下方 */ lamp.rotation.y=h+Math.sin(t*.9)*.06; lamp.rotation.z=Math.sin(t*1.3)*.04;
  if(!fin&&c.storyActive&&c.storyActive('lantern')&&c.toast){ const atLily=c.zone&&c.zone()==='lily', moonOk=c.moon()>.85||(S.bait==='moon'&&S.baits&&S.baits.moon>0), need=!atLily?'lily':!moonOk?'moon':'';
    if(need&&need!==lampNeed&&t-lampNeedT>8){ lampNeed=need; lampNeedT=t; c.toast(need==='lily'?'🏮 燈在手邊亮著——划到「浮萍灣」，她在那裡等。':'🏮 已經到浮萍灣了。今晚不是滿月：在魚餌裡換上「月光餌」，她就會來。','warn',5200); } if(!need) lampNeed=''; }
  lampL.position.copy(lamp.position); lampL.position.y+=.18; lampL.intensity=1.6+Math.sin(t*11)*.15+Math.random()*.1; }
/* ===== 濕透的女鬼 =====
   剛從湖裡爬出來：越往下越濕（裙襬、袖口濕得發暗發亮），頭髮整片濕黏；表面有水一道道往下流的反光；露出的皮膚灰白發青 */
const ghostU={uT:{value:0}};
function wetGhost(mesh,mt){ const g0=mesh.geometry; if(!g0.boundingBox) g0.computeBoundingBox(); const y0=g0.boundingBox.min.y, y1=g0.boundingBox.max.y, prev=mt.onBeforeCompile;
  mt.onBeforeCompile=(sh,r)=>{ if(prev) prev(sh,r); sh.uniforms.uT=ghostU.uT;
    sh.vertexShader='varying float vWetH; varying vec2 vWetP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vWetH=clamp((transformed.y-('+y0.toFixed(4)+'))/'+Math.max(1e-4,y1-y0).toFixed(4)+',0.,1.); vWetP=transformed.xz/'+Math.max(1e-4,y1-y0).toFixed(4)+';');
    sh.fragmentShader='uniform float uT; varying float vWetH; varying vec2 vWetP;\n'+sh.fragmentShader
      .replace('#include <map_fragment>','#include <map_fragment>\n float wet=clamp(1.-smoothstep(.25,.75,vWetH)+smoothstep(.8,.97,vWetH)*.7,0.,1.); float lum=dot(diffuseColor.rgb,vec3(.3,.59,.11));\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(lum)*vec3(.82,.9,.92),.55)*(1.-.42*wet);')
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n { float a=atan(vWetP.y,vWetP.x); float run=smoothstep(.55,1.,sin(a*38.+sin(a*7.)*2.)*.5+.5)*smoothstep(.2,.9,sin(vWetH*24.+uT*2.6+a*5.)*.5+.5);\n   roughnessFactor=mix(.92,.16,wet*.85+run*.4); }');
  }; const key=mt.customProgramCacheKey?mt.customProgramCacheKey.bind(mt):()=>''; mt.customProgramCacheKey=()=>key()+'|wetGhost'; mt.envMapIntensity=1.1; mt.needsUpdate=true; }
/* 水滴：身上一直往下滴，掉進湖裡起一圈小漣漪 */
const DRIPN=60, dripPos=new Float32Array(DRIPN*3), dripV=new Float32Array(DRIPN), dripG=new T.BufferGeometry(); dripG.setAttribute('position',new T.BufferAttribute(dripPos,3));
const drips=new T.Points(dripG,new T.PointsMaterial({color:0xcfe8f0,size:.022,transparent:true,opacity:.8,depthWrite:false})); drips.frustumCulled=false; drips.visible=false; W.scene.add(drips);
for(let i=0;i<DRIPN;i++){ dripPos[i*3+1]=-99; }
function dripTick(dt,m){ if(!m||!m.visible){ drips.visible=false; return; } drips.visible=true; ghostU.uT.value=performance.now()/1000;
  for(let i=0;i<DRIPN;i++){ let y=dripPos[i*3+1];
    if(y<-50){ if(Math.random()<dt*9){ const a=Math.random()*6.28, r=.12+Math.random()*.16, h=.55+Math.random()*.95; dripPos[i*3]=m.position.x+Math.cos(a)*r; dripPos[i*3+1]=m.position.y+h; dripPos[i*3+2]=m.position.z+Math.sin(a)*r; dripV[i]=0; } continue; }
    dripV[i]-=9.8*dt; y+=dripV[i]*dt; if(y<=0){ if(y>-1&&Math.random()<.25&&W.addRipple) W.addRipple(dripPos[i*3],dripPos[i*3+2],.05); y=-99; } dripPos[i*3+1]=y; }
  dripG.attributes.position.needsUpdate=true; }
let tt=0;
const ov=document.getElementById('scare'), face=ov&&ov.querySelector('img');
// 條件：第六章（月潮）完成後、夜晚、湖區、沒關閉驚嚇效果、正在閒置或等魚
// 測試模式：網址加上 ghost 測試參數，不看章節、時段、次數，閒置或等魚約 5 秒出現、間隔 30 秒（只影響開這一頁的人）
const TEST=/[?&]ghost=(1|glide|peek|behind|jump|grab|creep|bow|stalk)/.test(location.search), TEST_MODE=(location.search.match(/[?&]ghost=(glide|peek|behind|jump|grab|creep|bow|stalk)/)||[])[1]; let testLast=0;
function eligible(){ if(TEST){ const st=c.state(); return (st==='idle'||st==='wait')&&!ev&&performance.now()-testLast>4000&&performance.now()-sessionStart>5000; }   /* 測試：上一段結束 4 秒後就再出現 */
  if(c.storyDone&&c.storyDone('lantern')) return false; const hp0=c.storyActive&&c.storyActive('lantern')&&c.progOf?c.progOf('lantern'):null;
  if(S.noScare&&!(hp0&&hp0[1]<3)) return false;   /* 關了驚嚇也要能完成隱藏章節：那時只用不嚇人的出現方式（遠處飄過、水裡露頭） */
  if(c.period()!=='night'||c.loc()!=='lake') return false; const st=c.state(); if(st!=='idle'&&st!=='wait') return false;
  // 隱藏章節進行中：還沒遇滿 3 次時她出現得更勤（任務才過得了）；遇滿 3 次後就不再嚇人
  const hp=c.storyActive&&c.storyActive('lantern')&&c.progOf?c.progOf('lantern'):null, hunt=!!hp&&hp[1]<3;
  if(hp&&hp[1]>=3) return false;
  if(performance.now()-sessionStart<(hunt?20*1000:10*60*1000)) return false;
  const g=S.ghost=S.ghost||{}; const day=new Date().toDateString(); if(g.day!==day){ g.day=day; g.n=0; }
  if(g.n>=(hunt?10:2)) return false; if(g.last&&Date.now()-g.last<(hunt?2:60)*60*1000) return false; return true; }
let hc=null; window.__GHOSTDBG=()=>({ev:ev&&{mode:ev.mode,phase:ev.phase,t:+ev.t.toFixed(1)},vis:!!(model&&model.visible),pos:model&&model.position.toArray().map(v=>+v.toFixed(2)),hc:!!hc,kids:model&&model.children.length,sk:hc&&hc.mesh.visible});   // 新的女鬼骨架控制器（表情、反頭、伸手、抽搐）
function load(fn){ if(model) return fn(model); if(loading||!GL) return; loading=true;
  if(window.__HUMAN){ GL.load('models/lin_v1.glb',g=>{ const o=g.scene; o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), s=1.68/Math.max(sz.y,1e-6); o.scale.setScalar(s); o.updateMatrixWorld(true);
      const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z); o.updateMatrixWorld(true);
      try{ hc=window.__HUMAN.rig(o,{ghost:true,relax:-.18}); const mt=hc.mesh.material; mt.transparent=true; mt.opacity=.95; mt.fog=true;
        mt.emissive=new T.Color(0x1f6b45); mt.emissiveMap=null; mt.emissiveIntensity=1;
        /* 綠光不是全身一樣亮：臉最亮，往下越來越暗，腳邊幾乎只剩一點點（使用者回報全身同一種綠太假）。
           用模型本身的高度算：頭頂到腳底分成 0～1，發光乘上一條曲線 */
        { const g0=hc.mesh.geometry; if(!g0.boundingBox) g0.computeBoundingBox(); const y0=g0.boundingBox.min.y, y1=g0.boundingBox.max.y, prev=mt.onBeforeCompile, key=mt.customProgramCacheKey?mt.customProgramCacheKey.bind(mt):()=>'';
          mt.onBeforeCompile=(sh,r)=>{ if(prev) prev(sh,r); sh.uniforms.uGlowY0={value:y0}; sh.uniforms.uGlowY1={value:y1};
            sh.vertexShader='uniform float uGlowY0,uGlowY1;\nvarying float vGlowH;\n'+sh.vertexShader.replace('#include <skinning_vertex>','#include <skinning_vertex>\n vGlowH=clamp((transformed.y-uGlowY0)/max(uGlowY1-uGlowY0,1e-4),0.,1.);');
            sh.fragmentShader='varying float vGlowH;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n { float face=smoothstep(.84,.95,vGlowH), neck=smoothstep(.7,.86,vGlowH);\n   vec3 Vv=normalize(vViewPosition); float rim=pow(1.-abs(dot(normalize(vNormal),Vv)),3.);\n   totalEmissiveRadiance=totalEmissiveRadiance*(.015+.12*neck+1.9*face)+vec3(.35,.75,.55)*rim*.22*(.3+.7*smoothstep(.2,.8,vGlowH));\n   diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.3,.59,.11))),diffuseColor.rgb,.35)*mix(.35,.8,face); }   /* 只有臉在發光、脖子漸暗、身體幾乎是暗的，只剩邊緣一圈淡淡冷光；衣服去色 */'); };
          mt.customProgramCacheKey=()=>key()+'|ghostGlowH'; mt.needsUpdate=true; }   /* 綠光用純色疊加：不能用原貼圖當發光圖，否則烘焙在模型上的活人臉會蓋過女鬼臉與表情 */   /* 身上自帶幽幽的綠光：夜裡也看得清楚身體和臉 */
        mats.push(mt); }catch(e){ console.warn('lin rig',e); }
      /* 水面以下交給水下層（跟魚、霜汐同一套）：沉下去時身體在水裡越深越暗、被水面反光蓋住，不再是一刀切掉 */
      if(W.optics) W.optics.add(o); if(W.submerged) W.submerged.add(o,{solid:true});
      model=new T.Group(); model.add(o); { /* 光只照臉附近（短距離、快速衰減），而且像快熄的燈一樣不規則閃 */ const gl=new T.PointLight(0xa8ffd8,1.1,1.8,2.2); gl.position.set(0,1.62,.32); model.add(gl);
        const t0=Math.random()*100; o.traverse(m=>{ if(m.isMesh&&!gl.userData.f){ gl.userData.f=1; m.onBeforeRender=()=>{ const t=performance.now()*.001+t0; const n=Math.sin(t*7.3)*Math.sin(t*2.9+1.3)*Math.sin(t*13.1); gl.intensity=1.1*(.72+.28*Math.sin(t*1.7))*(n>.55?.25:1); }; } }); }
      model.visible=false; W.scene.add(model); loading=false; fn(model); },undefined,()=>{ loading=false; }); return; }
  GL.load('models/ghost.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt){ mt.fog=true; mt.transparent=true; mt.opacity=.88; mt.depthWrite=true; mt.roughness=1; mt.metalness=0; if(mt.map){ mt.emissive=new T.Color(0x8fa0b8); mt.emissiveMap=mt.map; mt.emissiveIntensity=.12; } wetGhost(m,mt); mats.push(mt); } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), s=1.68/Math.max(sz.y,1e-6); o.scale.setScalar(s); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z); o.updateMatrixWorld(true); try{ ghostRig=autoRig(o,'human'); }catch(e){ console.warn('ghost rig',e); }
    if(W.optics) W.optics.add(o); if(W.submerged) W.submerged.add(o,{solid:true});
    model=new T.Group(); model.add(o); model.visible=false; W.scene.add(model); loading=false; fn(model); },undefined,()=>{ loading=false; }); }
// 真人尖叫與哀鳴（OpenGameArt CC0）
const tv=new T.Vector3();
const SFX={}; function sfx(name,vol){ try{ let a=SFX[name]; if(!a){ a=new Audio(name+'.mp3'); a.preload='auto'; SFX[name]=a; } a.volume=Math.max(0,Math.min(1,vol==null?1:vol)); a.currentTime=0; a.play().catch(()=>{}); return a; }catch(e){ return null; } }
['scream_main','scream_b','wail','gasp'].forEach(n=>{ try{ const a=new Audio(n+'.mp3'); a.preload='auto'; SFX[n]=a; }catch(e){} });
// 喉嚨的「呃呃呃」：低頻鋸齒波＋一頓一頓的音量（咒怨伽椰子的聲音），脖子的喀喀聲，嚇人前把環境音壓到幾乎無聲
let AC=null, croakN=null; const actx=()=>{ try{ AC=AC||new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} return AC; };
function croakOld(on){ const a=actx(); if(!a) return; if(croakN){ try{ croakN.g.gain.setTargetAtTime(0,a.currentTime,.05); const n=croakN; setTimeout(()=>{ try{ n.o.stop(); n.l.stop(); }catch(e){} },400); }catch(e){} croakN=null; } if(!on) return;
  const o=a.createOscillator(), g=a.createGain(), f=a.createBiquadFilter(), l=a.createOscillator(), lg=a.createGain(); o.type='sawtooth'; o.frequency.value=62; f.type='bandpass'; f.frequency.value=480; f.Q.value=1.6;
  l.type='square'; l.frequency.value=13; lg.gain.value=.5; l.connect(lg); lg.connect(g.gain); g.gain.value=.5; o.connect(f); f.connect(g); g.connect(a.destination); o.start(); l.start();
  o.frequency.setValueAtTime(62,a.currentTime); o.frequency.linearRampToValueAtTime(74,a.currentTime+3); croakN={o,g,l}; }
// 咒怨式的喉音：不規則的聲門摩擦聲（一顆一顆的短促氣音、間隔忽快忽慢），經過喉嚨共鳴，加上低沉的嗡鳴
let rattle=null;
function croak(on){ const a=actx(); if(!a) return; if(rattle){ rattle.stop=true; const r=rattle; try{ r.g.gain.setTargetAtTime(0,a.currentTime,.08); }catch(e){} setTimeout(()=>{ try{ r.drone.stop(); }catch(e){} },500); rattle=null; } if(!on) return;
  const g=a.createGain(); g.gain.value=.08; const f1=a.createBiquadFilter(); f1.type='bandpass'; f1.frequency.value=650; f1.Q.value=4; const f2=a.createBiquadFilter(); f2.type='bandpass'; f2.frequency.value=1500; f2.Q.value=6;
  const mix=a.createGain(); mix.gain.value=1; f1.connect(mix); f2.connect(mix); mix.connect(g); g.connect(a.destination);
  const drone=a.createOscillator(), dg=a.createGain(); drone.type='sine'; drone.frequency.value=38; dg.gain.value=.18; drone.connect(dg); dg.connect(g); drone.start();
  const nb=a.createBuffer(1,Math.floor(a.sampleRate*.012),a.sampleRate), d=nb.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.5);
  const R={g,drone,stop:false}; rattle=R; let tNext=a.currentTime+.05, phase=0;
  const pump=()=>{ if(R.stop) return; while(tNext<a.currentTime+.25){ phase+=1; const gap=(Math.sin(phase*.31)>.2?.022:.045)+Math.random()*.03;   // 一串密、一串疏，像卡在喉嚨的氣
      const s=a.createBufferSource(), sg=a.createGain(); s.buffer=nb; s.playbackRate.value=.7+Math.random()*.5; sg.gain.value=.6+Math.random()*.6; s.connect(sg); sg.connect(f1); sg.connect(f2); s.start(tNext); tNext+=gap;
      if(Math.random()<.04) tNext+=.25+Math.random()*.35; }   // 偶爾停一下，像在吸氣
    setTimeout(pump,120); }; pump(); }
function croakVol(v){ try{ if(rattle&&AC) rattle.g.gain.setTargetAtTime(Math.min(1,v*1.6),AC.currentTime,.2); }catch(e){} }
function crack(){ const a=actx(); if(!a) return; const b=a.createBuffer(1,a.sampleRate*.06,a.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,6);
  const s=a.createBufferSource(), f=a.createBiquadFilter(), g=a.createGain(); f.type='highpass'; f.frequency.value=1800; g.gain.value=.9; s.buffer=b; s.connect(f); f.connect(g); g.connect(a.destination); s.start(); }
function stopAudio(){croak(false);croakOld(false);for(const a of Object.values(SFX))try{a.pause();a.currentTime=0;}catch(_){} }
function muteAll(on){ try{ if(c.mute) c.mute(on); }catch(e){} }
const MODES=['glide','peek','behind','jump','grab','creep','bow','stalk']; let testIdx=0;
function pickMode(){ if(TEST){ if(TEST_MODE) return TEST_MODE; const m=MODES[testIdx%MODES.length]; testIdx++; return m; }
  const st=c.state(), c5=S.story&&S.story.done&&S.story.done.includes('c5');
  const w={glide:40,peek:st==='wait'?30:0,behind:18,jump:c5?22:6,grab:hc?(c5?16:6):0,creep:hc?12:0,bow:hc?12:0,stalk:hc?12:0};
  if(S.noScare){ for(const k in w) if(k!=='glide'&&k!=='peek') w[k]=0; if(!w.peek) w.glide=1; }   /* 關了驚嚇：只遠處飄過或水裡露頭 */ let tot=0; for(const k in w) tot+=w[k]; let r=Math.random()*tot; for(const k in w){ r-=w[k]; if(r<=0) return k; } return 'glide'; }
function placeRel(m,fw,rt,y){ const b=c.base(), h=c.head(), f=new T.Vector3(-Math.sin(h),0,-Math.cos(h)), r=new T.Vector3(Math.cos(h),0,-Math.sin(h));
  const p=new T.Vector3(b.x,0,b.z).addScaledVector(f,fw).addScaledVector(r,rt); m.position.set(p.x,y,p.z); return p; }
function faceMe(m){ const b=c.base(); m.rotation.y=Math.atan2(b.x-m.position.x,b.z-m.position.z); }
function lookingAt(p,tol){ const b=c.base(), yaw=c.head()+(c.yaw?c.yaw():0); const want=Math.atan2(-(p.x-b.x),-(p.z-b.z)); let d=want-yaw; while(d>Math.PI) d-=Math.PI*2; while(d<-Math.PI) d+=Math.PI*2; return Math.abs(d)<(tol||.45); }
function meet(){ if(TEST) return; const g=S.ghost=S.ghost||{}; g.last=Date.now(); g.n=(g.n||0)+1; g.met=(g.met||0)+1; c.persist(); if(c.onMeet) c.onMeet(g.met); }
// 四種出現方式：遠處飄過、水裡露頭、身後、撲臉
function trigger(force){ if(ev) return false; if(!force&&!eligible()) return false; const mode=pickMode();
  load(m=>{ ev={t:0,mode}; meet();
    if(mode==='jump'){ const side=Math.random()<.5?-1:1; const p=placeRel(m,1.4,side*1.9,-1.9); faceMe(m); ev.p=p; m.visible=true; c.drip&&c.drip(); waterFx(p,true); if(window.__FACE) window.__FACE(p,{dur:2.4,pitch:.05}); }
    else if(mode==='glide'){ const side=Math.random()<.5?-1:1, dist=9+Math.random()*3; const p=placeRel(m,dist,-side*3.5,-1.8); ev.rise=1; ev.p=p; ev.dir=new T.Vector3(Math.cos(c.head()),0,-Math.sin(c.head())).multiplyScalar(side*.55); m.rotation.y=Math.atan2(ev.dir.x,ev.dir.z); m.visible=true; ev.stare=0; ev.phase='glide'; ev.wail=sfx('wail',.35); }
    else if(mode==='peek'){ const to=c.state()==='wait'&&c.to?c.to():null; const b=c.base(); let p; if(to){ const dx=to.x-b.x, dz=to.z-b.z, L=Math.hypot(dx,dz)||1; const sd=(Math.random()<.5?-1:1)*1.4; p=new T.Vector3(to.x+dx/L*1.2-dz/L*sd,0,to.z+dz/L*1.2+dx/L*sd); m.position.set(p.x,-1.95,p.z); } else p=placeRel(m,6,(Math.random()<.5?-1:1)*1.8,-1.95); ev.p=p; faceMe(m); m.visible=true; ev.phase='rise'; ev.st0=c.state(); }
    else if(mode==='creep'&&hc){ const side=Math.random()<.5?-1:1; const p=placeRel(m,13,side*4,-.05); ev.p=p; faceMe(m); m.visible=true; ev.phase='creep'; ev.away=0; ev.jumps=0; hc.now('hy',0); hc.now('reach',0); hc.now('hp',.35); hc.now('hr',.4); hc.expr(-1); croak(true); croakVol(.08); }   /* 一二三木頭人：你看她時她不動，轉開視線她就更近一步 */
    else if(mode==='stalk'&&hc){ const p=placeRel(m,12,(Math.random()-.5)*3,-.05); ev.p=p; faceMe(m); m.visible=true; ev.phase='walk'; ev.burst=0; ev.hold=0; hc.now('hy',0); hc.now('hp',.3); hc.now('hr',.5); hc.now('walk',0); hc.expr(-1); croak(true); croakVol(.05); }   /* 關節錯位地走過來：走一下、停一下，頭歪向一邊亂晃 */
    else if(mode==='bow'&&hc){ const p=placeRel(m,5.5,(Math.random()-.5)*1.5,-.05); ev.p=p; faceMe(m); m.visible=true; ev.phase='bow'; hc.now('hy',0); hc.now('hp',.4); hc.now('hairFace',0); hc.veil(1); hc.expr(5); muteAll(true); }   /* 貞子式：低頭、長髮蓋住臉，慢慢飄近 */
    else if(mode==='grab'&&hc){ const camY=(W.camera.getWorldPosition(new T.Vector3()).y), deck=camY-1.62; const p=placeRel(m,-.8,.12,deck); ev.deck=deck;   /* 站在你身後的碼頭上，臉跟你一樣高 */ ev.p=p; faceMe(m); m.rotation.y+=Math.PI; m.visible=true; ev.phase='silence'; hc.now('hy',0); hc.now('reach',0); hc.now('twitch',0); hc.expr(-1); muteAll(true); }   // 《大法師》式：她貼在你背後、身體背對你
    else { const p=placeRel(m,-2.1,0,-.28); ev.p=p; faceMe(m); m.visible=true; ev.phase='wait'; ev.wail=sfx('wail',.22); c.vib&&c.vib([15,60,15]); } });
  return true; }
// 入水／出水：水花、泡泡、擴散的水紋與水聲
// 她自己的水面效果（依人的尺度，不借用魚的小水花）：水線泡沫環、移動時的尾跡水紋、出入水的水花與大水圈
const ringGeo=new T.RingGeometry(.86,1,48).rotateX(-Math.PI/2);
const rings=[]; for(let i=0;i<18;i++){ const m=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:0xe6eef2,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide})); m.visible=false; m.renderOrder=11; W.scene.add(m); rings.push({m,t:0,life:1,r0:.3,r1:1.5,a:.5}); }
const dropTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), rg=g.createRadialGradient(16,16,1,16,16,15); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(.5,'rgba(230,240,248,.7)'); rg.addColorStop(1,'rgba(230,240,248,0)'); g.fillStyle=rg; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
const drops=[]; for(let i=0;i<70;i++){ const s=new T.Sprite(new T.SpriteMaterial({map:dropTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; W.scene.add(s); drops.push({s,v:new T.Vector3(),t:0,life:1}); }
const foam=new T.Mesh(new T.RingGeometry(.2,.46,40).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xf2f6f8,transparent:true,opacity:0,depthWrite:false})); foam.renderOrder=11; foam.visible=false; W.scene.add(foam);
function ring(p,r0,r1,life,a){ const R=rings.find(q=>!q.m.visible)||rings[0]; Object.assign(R,{t:0,life,r0,r1,a}); R.m.position.set(p.x,.035,p.z); R.m.visible=true; }
function burst(p,n,pow){ for(let i=0;i<n;i++){ const D=drops.find(q=>!q.s.visible); if(!D) break; const a=Math.random()*6.283, r=Math.random()*.35;
    D.s.position.set(p.x+Math.cos(a)*r,.05,p.z+Math.sin(a)*r); D.v.set(Math.cos(a)*(.4+Math.random())*pow,(1.6+Math.random()*2.2)*pow,Math.sin(a)*(.4+Math.random())*pow); D.t=0; D.life=.7+Math.random()*.6; const sc=.05+Math.random()*.09; D.s.scale.set(sc,sc,1); D.s.visible=true; } }
function waterFx(p,big){ if(!p) return; burst(p,big?46:22,big?1.15:.7); ring(p,.3,big?3.2:2,1.8,.7); setTimeout(()=>ring(p,.25,big?2.4:1.5,1.6,.55),220); setTimeout(()=>ring(p,.2,big?1.6:1.1,1.4,.45),480);
  c.splash&&c.splash(p.x,p.z,big?26:12,big?.9:.5); c.splashSnd&&c.splashSnd(big?1:.5); }
let bubT=0; function bubbles(p,dt,rate){ bubT-=dt; if(bubT<=0){ bubT=rate; burst(new T.Vector3(p.x+(Math.random()-.5)*.5,0,p.z+(Math.random()-.5)*.5),3,.25); ring({x:p.x+(Math.random()-.5)*.4,z:p.z+(Math.random()-.5)*.4},.08,.6,1.1,.5); } }
let wakeT=0;
function fxTick(dt){
  rings.forEach(R=>{ if(!R.m.visible) return; R.t+=dt; const k=R.t/R.life; if(k>=1){ R.m.visible=false; return; } const r=R.r0+(R.r1-R.r0)*(1-Math.pow(1-k,2)); R.m.scale.set(r,1,r); R.m.material.opacity=R.a*(1-k); });
  drops.forEach(D=>{ if(!D.s.visible) return; D.t+=dt; if(D.t>=D.life||D.s.position.y<0){ if(D.s.position.y<0&&D.t<D.life) ring(D.s.position,.03,.25,.6,.35); D.s.visible=false; return; } D.v.y-=9.8*dt; D.s.position.addScaledVector(D.v,dt); D.s.material.opacity=.9*(1-D.t/D.life); });
  // 水線泡沫環：她的身體穿過水面的地方
  const m=model; const inWater=m&&m.visible&&m.position.y<-.05&&m.position.y>-1.75;
  foam.visible=!!inWater; if(inWater){ foam.position.set(m.position.x,.03,m.position.z); const f=.35+.12*Math.sin(performance.now()*.006); foam.material.opacity=f; foam.scale.setScalar(1+.06*Math.sin(performance.now()*.004));
    wakeT-=dt; if(wakeT<=0){ wakeT=.45; ring(m.position,.35,1.8,2.2,.4); } } }
function endEv(){ if(hc&&hc.veil) hc.veil(0); if(TEST) testLast=performance.now(); croak(false); muteAll(false); if(model) model.visible=false; if(ov) ov.classList.remove('on'); if(ev&&ev.wail){ try{ ev.wail.pause(); }catch(e){} } ev=null; }
// 跟著環境亮度：越暗越只剩月光般的微光；腳下（水面交界）有一圈水紋
let ripT=0;
function blend(dt){ dripTick(dt,model); if(!model||!model.visible) return; const lt=W.info?W.info.light:1; mats.forEach(m=>{ if(m.emissiveIntensity!==undefined) m.emissiveIntensity=.1+Math.max(0,.5-lt)*.7; });
  ripT-=dt; if(ripT<=0&&model.position.y>-1.9){ ripT=.9+Math.random()*.6; if(W.addRipple) W.addRipple(model.position.x,model.position.z,.35); } }
function update(dt){ { const tt=performance.now()/1000; if(ghostRig&&!hc) ghostRig.pose({t:tt,breathe:.004,headRoll:.14+.05*Math.sin(tt*.7),headPitch:.12,skirt:.05}); if(aliveRig) aliveRig.pose({t:tt,headPitch:.08,skirt:.025}); } blend(dt);
  if(!ev){ lastTry+=dt; if(lastTry>1){ lastTry=0;
      if(!model&&!loading&&(TEST||!S.noScare&&c.period()==='night'&&c.loc()==='lake')) load(()=>{});
      // 每秒擲一次：平常約 40 分鐘可出現的時間才遇到一次；隱藏章節要遇見她時約半分鐘（兩次之間至少隔 2 分鐘），一個晚上就能遇滿 3 次（使用者回報原本太少、任務過不了）
      const hp=c.storyActive&&c.storyActive('lantern')&&c.progOf?c.progOf('lantern'):null, hunt=!!hp&&hp[1]<3;
      if(eligible()&&(TEST||Math.random()<(hunt?1/30:1/2400))){ if(TEST) testLast=performance.now(); trigger(TEST); } } return; }
  ev.t+=dt; const t=ev.t, m=model; if(!m) return;
  if(ev.mode==='jump'){ m.position.y=Math.min(-.28,-1.9+t*2.1); faceMe(m); m.rotation.y+=Math.sin(t*9)*.04;
    if(t>.9&&!ev.face){ ev.face=true; if(ov) ov.classList.add('on'); sfx('scream_main',1); c.vib&&c.vib([120,40,160,40,320]); c.shake&&c.shake(3.2); }
    if(t>2.3){ waterFx(m.position,true); endEv(); } return; }
  if(ev.mode==='glide'){ if(ev.phase==='glide'){ const sp=.28+.1*Math.sin(t*.35); m.position.addScaledVector(ev.dir,dt*sp/.55); const b=c.base(); tv.set(b.x-m.position.x,0,b.z-m.position.z); const dist=tv.length(); tv.normalize(); if(dist>4.2) m.position.addScaledVector(tv,dt*.32);
      if(ev.rise){ ev.rT=(ev.rT||0)-dt; if(ev.rT<=0){ ev.rT=.09+Math.random()*.26; if(Math.random()>.22){ m.position.y=Math.min(-.45,m.position.y+.06+Math.random()*.13); c.vib&&c.vib(8); } } if(m.position.y>=-.45){ ev.rise=0; }   /* 一頓一頓往上浮：停住、突然冒出一截 */ if(!ev.rose){ ev.rose=1; waterFx(m.position,false); } } else m.position.y=-.45+Math.sin(t*.8)*.04; m.rotation.z=Math.sin(t*.6)*.05; m.rotation.x=Math.sin(t*.45+1)*.03;
      if(ev.lookT===undefined) ev.lookT=0; ev.lookT+=dt; const tgt=Math.atan2(ev.dir.x,ev.dir.z)+Math.sin(ev.lookT*.3)*.5; let dd=tgt-m.rotation.y; while(dd>Math.PI) dd-=Math.PI*2; while(dd<-Math.PI) dd+=Math.PI*2; m.rotation.y+=dd*Math.min(1,dt*.8);
      if(Math.random()<dt*.8) c.ripple&&c.ripple(m.position.x,m.position.z,.25); if(ev.wail) ev.wail.volume=Math.max(0,.35*(1-t/16));
      if(lookingAt(m.position,.35)) ev.stare+=dt; else ev.stare=Math.max(0,ev.stare-dt*.5);
      if(ev.stare>4){ ev.phase='turn'; ev.t2=0; } if(t>16) ev.phase='sink'; }
    if(ev.phase==='turn'){ ev.t2+=dt; { const b2=c.base(); tv.set(b2.x-m.position.x,0,b2.z-m.position.z); const d2=tv.length(); if(d2>3.5) m.position.addScaledVector(tv.normalize(),dt*.55); } const b=c.base(), want=Math.atan2(b.x-m.position.x,b.z-m.position.z); let d=want-m.rotation.y; while(d>Math.PI) d-=Math.PI*2; while(d<-Math.PI) d+=Math.PI*2; m.rotation.y+=d*Math.min(1,dt*1.2); if(ev.t2>3) ev.phase='sink'; }
    if(ev.phase==='sink'){ if(!ev.sk){ ev.sk=0; waterFx(m.position,false); } ev.sk+=dt; m.position.y-=dt*(.2+ev.sk*1.1); m.rotation.z*=.95; bubbles(m.position,dt,.12); if(m.position.y<-2.1){ waterFx(m.position,false); endEv(); } } return; }
  if(ev.mode==='peek'){ if(ev.phase==='rise'){ if(!ev.rs){ ev.rs=1; c.ripple&&c.ripple(m.position.x,m.position.z,.5); } m.position.y=Math.min(-1.42,m.position.y+dt*.4); bubbles(m.position,dt,.25); if(m.position.y>=-1.42) ev.phase='stare'; }
    else if(ev.phase==='stare'){ faceMe(m); m.position.y=-1.42+Math.sin(t*1.1)*.015; if(c.state()!==ev.st0||t>8){ ev.phase='down'; ev.fast=c.state()!==ev.st0; if(ev.fast){ sfx('gasp',.6); c.vib&&c.vib(40); } waterFx(m.position,ev.fast); } }
    else { m.position.y-=dt*(ev.fast?2.4:.7); bubbles(m.position,dt,.1); if(m.position.y<-2.2){ c.ripple&&c.ripple(m.position.x,m.position.z,.4); endEv(); } } return; }
  if(ev.mode==='creep'&&hc){ const b=c.base(); tv.set(b.x-m.position.x,0,b.z-m.position.z); const dist=tv.length(); m.position.y=-.05; faceMe(m);
    if(ev.phase==='creep'){ const look=lookingAt(m.position,.5); if(look){ ev.away=0; ev.seen=(ev.seen||0)+dt; ev.act=(ev.act??2)-dt; } else ev.away+=dt;
      if(look&&ev.act<=0&&dist>2.4){ ev.act=1.6+Math.random()*1.8; const r=Math.random();   // 你一直盯著她，她也不會乾站著：每隔一兩秒就有令人發毛的小動作
        if(r<.3){ hc.now('hr',(Math.random()<.5?-1:1)*(.6+Math.random()*.8)); hc.now('twitch',1); setTimeout(()=>hc&&hc.set('twitch',0),160); crack(); c.vib&&c.vib(20); }   // 頭猛然歪向一邊
        else if(r<.55){ let n=0; const fl=setInterval(()=>{ if(!model||!ev){ clearInterval(fl); return; } model.visible=!model.visible; if(++n>=6){ clearInterval(fl); model.visible=true; tv.set(c.base().x-model.position.x,0,c.base().z-model.position.z); model.position.addScaledVector(tv.normalize(),Math.min(2.5,tv.length()-2)); faceMe(model); crack(); } },70); ev.jumps++; croakVol(Math.min(.6,.1+ev.jumps*.1)); }   // 一閃一閃，閃完就更近了
        else if(r<.75){ hc.set('reach',.55); hc.talk(1.8); setTimeout(()=>hc&&hc.set('reach',0),1800); }   // 慢慢抬手指向你、嘴巴無聲地動
        else { hc.expr(4); hc.now('hp',-.2); setTimeout(()=>{ if(hc){ hc.expr(-1); hc.now('hp',.35); } },1200); } }   // 突然咧嘴笑一下又收起來
      if(ev.away>.9&&dist>1.8){ ev.away=0; ev.jumps++; const step=Math.min(dist-1.4,2.2+Math.random()*1.4); m.position.addScaledVector(tv.normalize(),step); hc.now('hr',(Math.random()-.5)*.9); hc.now('hp',.2+Math.random()*.5); hc.expr(ev.jumps>3?4:-1); crack(); croakVol(Math.min(.6,.1+ev.jumps*.1)); c.vib&&c.vib(18); }   // 轉開視線再轉回來：她更近了、頭的角度也變了
      if(dist<2.1){ ev.phase='face'; ev.tf=0; placeRel(m,.75,0,-.05); faceMe(m); hc.now('hp',0); hc.now('hr',0); hc.expr(3); hc.set('reach',1); croak(false); sfx('scream_main',1); if(ov) ov.classList.add('on'); c.vib&&c.vib([120,40,160,40,320]); c.shake&&c.shake(3); }
      if(t>45){ croak(false); endEv(); } }
    else { ev.tf+=dt; if(ev.tf>1.4){ hc.now('reach',0); hc.expr(-1); endEv(); } }
    return; }
  if(ev.mode==='stalk'&&hc){ const b=c.base(); tv.set(b.x-m.position.x,0,b.z-m.position.z); const dist=tv.length(); faceMe(m); m.position.y=-.05;
    if(ev.phase==='walk'){ if(ev.hold>0){ ev.hold-=dt; hc.set('walk',0); }   // 停住：一動也不動
      else { ev.burst+=dt; hc.set('walk',1); hc.step(dt*7); m.position.addScaledVector(tv.normalize(),dt*.9); m.rotation.z=Math.sin(t*7)*.06;   // 一抽一抽地走
        if(ev.burst>.35+Math.random()*.4){ ev.burst=0; ev.hold=.25+Math.random()*.7; hc.now('hr',(Math.random()<.5?-1:1)*(.5+Math.random()*.9)); hc.now('hp',Math.random()*.6); hc.now('twitch',1); setTimeout(()=>hc&&hc.set('twitch',0),140); crack(); } }   // 每走幾步頭就突然歪到另一邊、關節喀一聲
      croakVol(Math.min(.55,.05+(12-dist)*.05));
      if(dist<2){ ev.phase='tilt'; ev.tt=0; hc.set('walk',0); croak(false); muteAll(true); hc.set('hr',1.55); hc.set('hp',0); } if(t>40){ croak(false); endEv(); } }   // 到你面前：一片死寂，頭慢慢歪成九十度
    else if(ev.phase==='tilt'){ ev.tt+=dt; if(ev.tt>2.2&&!ev.scr){ ev.scr=1; muteAll(false); hc.expr(3); hc.now('hr',.2); hc.set('reach',1); placeRel(m,.8,0,-.05); faceMe(m); sfx('scream_main',1); if(ov) ov.classList.add('on'); c.vib&&c.vib([120,40,160,40,320]); c.shake&&c.shake(3.2); }
      if(ev.tt>3.6){ hc.now('reach',0); hc.now('hr',0); hc.expr(-1); endEv(); } }
    return; }
  if(ev.mode==='bow'&&hc){ const b=c.base(); tv.set(b.x-m.position.x,0,b.z-m.position.z); const dist=tv.length(); faceMe(m);
    if(ev.phase==='bow'){ m.position.addScaledVector(tv.normalize(),dt*.35); m.position.y=-.05+Math.sin(t*1.3)*.02; hc.set('twitch',Math.random()<dt*1.5?1:0);
      if(dist<2.2||t>9){ ev.phase='up'; ev.tu=0; hc.veil(0); hc.now('hp',-.15); hc.expr(3); muteAll(false); sfx('scream_main',1); if(ov) ov.classList.add('on'); c.vib&&c.vib([150,40,200,40,300]); c.shake&&c.shake(3.4); } }   // 走到面前猛然抬頭：女鬼臉、尖叫
    else { ev.tu+=dt; hc.set('reach',ev.tu>.3?1:0); if(ev.tu>1.6){ hc.now('reach',0); hc.now('hp',0); hc.expr(-1); endEv(); } }
    return; }
  if(ev.mode==='grab'&&hc){ const st=ev.phase; m.position.y=ev.deck;
    if(st==='silence'&&t>1.2){ ev.phase='grab'; ev.tg=0; c.vib&&c.vib([200]); c.shake&&c.shake(1.6); sfx('gasp',.9); if(window.__FACE) window.__FACE(m.position.clone().setY(ev.deck+1.45),{dur:9,pitch:.02}); }   // 一片死寂後，一隻手抓住你的肩膀，你被扳過身
    if(st==='grab'){ ev.tg+=dt; if(ev.tg>1.4){ ev.phase='turn'; ev.hy=0; ev.step=0; croak(true); } }
    if(st==='turn'){ ev.step-=dt; if(ev.step<=0){ ev.step=.32+Math.random()*.25; ev.hy=Math.min(Math.PI,ev.hy+.28+Math.random()*.12); hc.set('hy',ev.hy); hc.now('twitch',1); setTimeout(()=>hc&&hc.set('twitch',0),110); crack(); c.vib&&c.vib(25); }   // 頭一格一格地喀、喀轉過來
      if(ev.hy>=Math.PI-.01){ ev.phase='stare'; ev.ts=0; hc.expr(4); } }   // 臉轉到背後，對你詭笑
    if(st==='stare'){ ev.ts+=dt; if(ev.ts>1.6&&!ev.scr){ ev.scr=1; croak(false); hc.expr(3); hc.set('reach',1); sfx('scream_main',1); if(ov) ov.classList.add('on'); c.vib&&c.vib([120,40,160,40,320]); c.shake&&c.shake(3.4); }   // 尖叫、伸手撲過來
      if(ev.ts>3.0){ hc.now('reach',0); hc.expr(-1); hc.now('hy',0); muteAll(false); endEv(); } }
    return; }
  if(ev.mode==='behind'){ if(ev.phase==='wait'){ faceMe(m); m.position.y=-.28+Math.sin(t*1.2)*.01; if(Math.random()<dt*.6) c.ripple&&c.ripple(m.position.x,m.position.z,.2);
      if(!ev.br&&t>5){ ev.br=1; croak(true); croakVol(.35); c.vib&&c.vib([20,40,20]); c.shake&&c.shake(.5); }   /* 一直沒回頭：耳邊傳來喉音、頸後一陣寒意 */
      if(lookingAt(m.position,.6)||t>9){ croak(false); ev.phase='drop'; ev.fast=t<9; if(ev.fast){ sfx('gasp',.7); c.vib&&c.vib([60,30,60]); } waterFx(m.position,ev.fast); } }
    else { m.position.y-=dt*(ev.fast?3:.8); bubbles(m.position,dt,.08); if(m.position.y<-2.1) endEv(); } return; }
}
// 拍到她：遠處飄過時按 📷，手記多一頁
function photoTarget(){return !!(ev&&ev.mode==='glide'&&ev.phase!=='sink');}
function onPhoto(eligible=photoTarget()){ if(!eligible) return false; const g=S.ghost=S.ghost||{}; if(!g.photo){ g.photo=1; c.persist(); if(window.__STORY&&window.__STORY.page) setTimeout(()=>window.__STORY.page('手記・夾頁：拍到了什麼','那晚我在灣裡拍湖面，回家洗出來，水上多了一個人影。<br><br>白衣，長髮，背對著我。放大看，她的腳不在水裡——她是浮著的。<br><br>我沒有刪掉那張照片。'),900); }
  return true; }
// 生前模樣的模型（結局與之後的安靜出現）
function loadAlive(fn){ if(alive) return fn(alive); if(aliveLoading||!GL) return; aliveLoading=true;
  GL.load('models/girl.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ mt.emissive=new T.Color(0xe8e2d8); mt.emissiveMap=mt.map; mt.emissiveIntensity=.7; mt.transparent=true; } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), sc=1.35/Math.max(sz.y,1e-6); o.scale.setScalar(sc); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z); o.updateMatrixWorld(true); try{ aliveRig=autoRig(o,'human'); }catch(e){ console.warn('alive rig',e); }
    alive=new T.Group(); alive.add(o); alive.visible=false; W.scene.add(alive); aliveLoading=false; fn(alive); },undefined,()=>{ aliveLoading=false; }); }
function placeAhead(m,dist,side){ const b=c.base(), h=c.head(), fw=new T.Vector3(-Math.sin(h),0,-Math.cos(h)), rt=new T.Vector3(Math.cos(h),0,-Math.sin(h));
  const p=new T.Vector3(b.x,0,b.z).addScaledVector(fw,dist).addScaledVector(rt,side||0); m.position.set(p.x,0,p.z); m.rotation.y=Math.atan2(b.x-p.x,b.z-p.z); return p; }
const setOpacity=(m,a)=>m.traverse(o=>{ if(o.isMesh&&o.material) o.material.opacity=a; });
// 結局：髮簪與三次相遇都完成後，滿月夜在浮萍灣提燈，她以生前的樣子出現
function finaleReady(){ if(!c.storyActive||!c.storyActive('lantern')||!c.progOf) return false; const p=c.progOf('lantern'); if(!p) return false;
  return p[0]>=1&&p[1]>=3&&p[2]<1&&c.period()==='night'&&c.zone&&c.zone()==='lily'&&(c.moon()>.85||(window.__G&&window.__G.baitUsed&&window.__G.baitUsed.id==='moon')||(S.bait==='moon'&&S.baits&&S.baits.moon>0))&&(c.state()==='idle'||c.state()==='wait'); }
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
function update2(dt){ tt+=dt; fxTick(dt); updLamp(dt,tt); if(fin){ updFinale(dt); return; }
  if(!TEST&&c.storyDone&&c.storyDone('lantern')){ updCalm(dt); return; }
  if(!ev&&finaleReady()&&!aliveLoading){ startFinale(); return; }
  update(dt); }
return {dbg:()=>({ev:ev&&{mode:ev.mode,phase:ev.phase,t:+ev.t.toFixed(1)},pos:model&&model.visible?[+model.position.x.toFixed(2),+model.position.y.toFixed(2),+model.position.z.toFixed(2)]:null,base:[+c.base().x.toFixed(2),+c.base().z.toFixed(2)],head:+c.head().toFixed(2),yaw:+(c.yaw?c.yaw():0).toFixed(2)}),update:update2,stopAudio,trigger,onPhoto,photoTarget,finale:()=>{ startFinale(); },active:()=>!!ev||!!fin};
}
