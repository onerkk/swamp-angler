/* 走路手感（標本館、小屋共用）
   - 步伐相位依「實際走了多遠」推進：走快步子就快、撞牆沒前進就不晃、停下來慢慢收在兩腳著地
   - 每步：頭部輕微下沉、換腳時極小的左右重心與側傾（幅度照真人步行時眼睛高度約 2～3 公分的起伏）
   - 腳步聲用實錄音檔：木地板、地毯各 5 種（Kenney Impact Sounds，CC0），隨機挑、音高音量微變；
     依腳下是木板還是地毯換聲音。音檔還沒載完時先用合成聲頂著 */
(function(){
  let AC=null; const BUF={wood:[],carpet:[]}; let loading=false;
  const ac=()=>{ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC&&AC.state==='suspended') AC.resume().catch(()=>{}); return AC; };
  const soundOn=()=>((window.__SAVE||{}).sound!==false);
  function load(){ if(loading) return; const a=ac(); if(!a) return; loading=true;
    for(const k of ['wood','carpet']) for(let i=0;i<5;i++) fetch('sfx/step_'+k+'_'+i+'.mp3').then(r=>r.arrayBuffer()).then(b=>new Promise((ok,no)=>a.decodeAudioData(b,ok,no))).then(buf=>{ BUF[k].push(buf); }).catch(()=>{}); }
  let lastIdx=-1;
  function play(surface,vol){ const a=ac(); if(!a||!soundOn()) return; load(); const t=a.currentTime, list=BUF[surface]||BUF.wood;
    const g=a.createGain(); g.gain.value=vol*(.85+Math.random()*.25); g.connect(a.destination);
    if(list.length){ let i=Math.floor(Math.random()*list.length); if(i===lastIdx&&list.length>1) i=(i+1)%list.length; lastIdx=i;
      const s=a.createBufferSource(); s.buffer=list[i]; s.playbackRate.value=.92+Math.random()*.14; s.connect(g); s.start(t); return; }
    const n=Math.floor(a.sampleRate*.14), b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0), soft=surface==='carpet';
    for(let i=0;i<n;i++){ const k=i/n; d[i]=(Math.random()*2-1)*Math.pow(1-k,soft?3:6)*(soft?.5:1); }
    const s=a.createBufferSource(); s.buffer=b; const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=soft?500:1600; s.connect(f); f.connect(g); s.start(t); }
  window.WalkFeel=function(o){ o=o||{}; const stride=o.stride||.7, vol=o.vol==null?.5:o.vol;
    let ph=0, amp=0, lastStep=0;
    const st={dy:0,dx:0,roll:0,pitch:0};
    st.update=function(dt,moved,surface){   // moved：這一幀實際走了幾公尺
      const v=moved/Math.max(dt,1e-3), want=Math.min(1,v/1.3);
      amp+=(want-amp)*Math.min(1,dt*(want>amp?5:3));
      if(moved>1e-5) ph+=moved/stride*Math.PI; else if(amp<.05) ph+=(Math.round(ph/Math.PI)*Math.PI-ph)*Math.min(1,dt*4);
      const n=Math.floor(ph/Math.PI); if(n!==lastStep){ if(moved>1e-5&&amp>.2) play(surface||'wood',vol*Math.min(1,.45+amp*.6)); lastStep=n; }
      const s=Math.sin(ph);
      st.dy=(-Math.abs(s)*.026+.008)*amp; st.dx=Math.cos(ph)*.01*amp; st.roll=Math.cos(ph)*.004*amp; st.pitch=Math.sin(ph*2)*.003*amp; return st; };
    st.preload=load;
    return st; };
})();
