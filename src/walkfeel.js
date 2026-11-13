/* 走路手感（標本館、小屋共用）：用「實際走了多遠」推步伐相位，所以走快步伐就快、停下來就慢慢收住。
   每一步：頭往下沉一點再起來、左右重心換腳的微晃與側傾、落腳時一聲木地板腳步聲。
   以前這兩個場景推搖桿只是鏡頭平移（小屋還在原地轉身時也在晃），沒有走路的感覺。 */
(function(){
  let AC=null;
  const ac=()=>{ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC&&AC.state==='suspended') AC.resume().catch(()=>{}); return AC; };
  const soundOn=()=>((window.__SAVE||{}).sound!==false);
  function thud(vol,soft){ const a=ac(); if(!a||!soundOn()) return; const t=a.currentTime, n=Math.floor(a.sampleRate*.16), b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<n;i++){ const k=i/n; d[i]=(Math.random()*2-1)*Math.pow(1-k,soft?3:5)+Math.sin(i/a.sampleRate*2*Math.PI*(soft?90:120))*Math.pow(1-k,8)*.8; }
    const s=a.createBufferSource(); s.buffer=b; s.playbackRate.value=.9+Math.random()*.2; const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=soft?700:1400+Math.random()*500;
    const g=a.createGain(); g.gain.value=vol*(.8+Math.random()*.3); s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); }
  window.WalkFeel=function(o){ o=o||{}; const stride=o.stride||.72, vol=o.vol==null?.18:o.vol;
    let ph=0, amp=0, lastStep=0;
    const st={dy:0,dx:0,roll:0,pitch:0};
    st.update=function(dt,moved,dir){ // moved：這一幀實際走了幾公尺（撞牆沒前進就不晃）
      const v=moved/Math.max(dt,1e-3), want=Math.min(1,v/1.2);
      amp+=(want-amp)*Math.min(1,dt*(want>amp?6:3));
      if(moved>1e-5) ph+=moved/stride*Math.PI; else if(amp<.05) ph+=(Math.round(ph/Math.PI)*Math.PI-ph)*Math.min(1,dt*4);   // 停下來時腳步收在兩腳著地的位置
      const n=Math.floor(ph/Math.PI); if(n!==lastStep){ if(moved>1e-5&&amp>.15) thud(vol*Math.min(1,.4+amp),o.soft); lastStep=n; }
      const s=Math.sin(ph);
      st.dy=-Math.abs(s)*.045*amp+.012*amp; st.dx=Math.cos(ph)*.022*amp; st.roll=Math.cos(ph)*.011*amp; st.pitch=Math.sin(ph*2)*.008*amp; return st; };
    st.reset=()=>{ ph=0; amp=0; lastStep=0; st.dy=st.dx=st.roll=st.pitch=0; };
    return st; };
})();
