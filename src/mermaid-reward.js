/* 終幕「霜汐的邀請」完成後的回禮：月光灣滿月的夜景動畫（月亮升起、水面月光、遠處霜汐的尾巴在月光下揮一下）
   → 玩家按下「跟著霜汐潛入水中」→ 畫面沉入水裡（水面往上退、光束、氣泡）→ 接上真人美人魚的影片 → 回禮卡。
   影片是玩家提供的真人美人魚表演，轉成 720p H.264（media/mermaid_reward.mp4，約 7MB），要看的時候才下載。 */
(function(){
 const LINES=['滿月的夜晚，月光灣的水面亮了起來。','遠處的水面，輕輕動了一下。','一條粉色的尾巴在月光下揮了一下，又沉了下去。','「你替我們守住了這片湖。」','「跟我來——讓你看看我在水裡的樣子。」'];
 const css=`#mrBox{position:fixed;inset:0;z-index:320;background:#000;color:#f2ecdf;font-family:inherit;overflow:hidden;opacity:0;transition:opacity 1.2s}
#mrBox.on{opacity:1}#mrBox canvas{position:absolute;inset:0;width:100%;height:100%}
#mrLine{position:absolute;left:8%;right:8%;bottom:22%;text-align:center;font-size:20px;line-height:1.7;letter-spacing:.06em;text-shadow:0 2px 12px #000;opacity:0;transition:opacity 1.1s}
#mrBox button{position:absolute;left:50%;transform:translateX(-50%);border:1px solid #f0d7a8;background:rgba(20,30,50,.55);color:#f6ead2;border-radius:24px;padding:12px 22px;font-size:17px;letter-spacing:.08em}
#mrGo{bottom:9%;opacity:0;transition:opacity 1s;white-space:nowrap}#mrSkip{top:calc(env(safe-area-inset-top,0px) + 14px);right:14px;left:auto!important;transform:none!important;padding:6px 14px!important;font-size:14px!important;opacity:.7}
#mrVid{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;opacity:0;transition:opacity 1.4s}
#mrTip{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);text-align:center;font-size:13px;opacity:.6}
#mrCard{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:0 10%;background:radial-gradient(ellipse at 50% 40%,#1c2c4a,#04070f);opacity:0;transition:opacity 1.2s}
#mrCard h2{font-size:24px;letter-spacing:.12em;margin:0;color:#f6d9e4}#mrCard p{margin:0;line-height:1.8;opacity:.9}
#mrCard button{position:static!important;transform:none!important;margin-top:10px}`;
 let st=null;
 function el(tag,attrs,parent){ const e=document.createElement(tag); Object.assign(e,attrs||{}); if(parent) parent.appendChild(e); return e; }
 function close(){ if(!st) return; const s=st; st=null; cancelAnimationFrame(s.raf); try{ s.vid&&s.vid.pause(); }catch(_){} try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(_){}
  s.box.classList.remove('on'); setTimeout(()=>{ s.box.remove(); if(s.after) s.after(); },900); }
 function card(){ const s=st; if(!s||s.carded) return; s.carded=true; const ch=s.ch, c=el('div',{id:'mrCard'},s.box);
  c.innerHTML=`<h2>🧜‍♀️ 霜汐的回禮</h2><p>她游得那麼自在，像整片海都是她的。<br>游到水面前，她停下來，對你揮了揮手。</p>`+(s.replay?'':`<p>🏆 獲得稱號「${ch.title||'海之友'}」<br><small>經驗 ${(ch.xp||0).toLocaleString()}・金幣 ${(ch.coins||0).toLocaleString()}</small></p>`)+`<p><small style="opacity:.7">想再看一次：📖 手記 →「終幕」→ 閱讀</small></p><button>回到遊戲</button>`;
  c.querySelector('button').onclick=close; requestAnimationFrame(()=>c.style.opacity=1); }
 function playVideo(){ const s=st; if(!s) return; s.phase='video';
  // 兩種格式：瀏覽器自己挑能播的那個（H.264 MP4 給大多數手機，WebM 給不支援 H.264 的瀏覽器）
  const v=s.vid=el('video',{id:'mrVid',poster:'media/mermaid_reward_poster.jpg',playsInline:true,preload:'auto'},s.box); v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
  for(const [src,type] of [['media/mermaid_reward.mp4','video/mp4; codecs="avc1.640028, mp4a.40.2"'],['media/mermaid_reward.webm','video/webm; codecs="vp9, opus"']]){ const so=document.createElement('source'); so.src=src; so.type=type; v.appendChild(so); }
  const tip=el('div',{id:'mrTip',textContent:'橫放手機看得更清楚'},s.box);
  v.onended=()=>{ v.style.opacity=0; tip.remove(); setTimeout(card,800); };
  const fail=()=>{ tip.textContent='影片載入失敗，請稍後在手記裡重看'; setTimeout(card,1600); }; v.onerror=fail; v.lastChild.addEventListener('error',fail);
  requestAnimationFrame(()=>v.style.opacity=1);
  const p=v.play(); if(p&&p.catch) p.catch(()=>{ v.muted=true; v.play().catch(()=>{}); });
  try{ const r=s.box.requestFullscreen&&s.box.requestFullscreen(); if(r&&r.then) r.then(()=>{ try{ screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{}); }catch(_){} }).catch(()=>{}); }catch(_){} }
 // 夜景與潛水的畫布動畫
 function draw(now){ const s=st; if(!s) return; s.raf=requestAnimationFrame(draw); const t=(now-s.t0)/1000, cv=s.cv, x=s.ctx, W=cv.width, H=cv.height, m=Math.min(W,H);
  const dive=s.phase==='dive'?Math.min(1,(now-s.diveAt)/2400):s.phase==='video'?1:0;
  // 天空與星星
  const y0=H*(.56-dive*.72);
  let g=x.createLinearGradient(0,0,0,Math.max(1,y0)); g.addColorStop(0,'#03060f'); g.addColorStop(1,'#16274a'); x.fillStyle=g; x.fillRect(0,0,W,Math.max(0,y0));
  for(const sp of s.stars){ const a=.35+.65*Math.abs(Math.sin(t*sp.f+sp.p)); x.fillStyle=`rgba(255,248,230,${a*sp.b})`; x.fillRect(sp.x*W,sp.y*y0,1.6,1.6); }
  // 月亮：慢慢升起，帶光暈
  const mr=m*.065, mx=W*.68, my=H*(.44-.22*Math.min(1,t/7))-dive*H*.7;
  let gl=x.createRadialGradient(mx,my,mr*.6,mx,my,mr*5); gl.addColorStop(0,'rgba(255,240,205,.45)'); gl.addColorStop(1,'rgba(255,240,205,0)'); x.fillStyle=gl; x.fillRect(mx-mr*5,my-mr*5,mr*10,mr*10);
  x.fillStyle='#fdf3d8'; x.beginPath(); x.arc(mx,my,mr,0,6.283); x.fill();
  // 水面
  g=x.createLinearGradient(0,y0,0,H); g.addColorStop(0,dive>0?'#123a66':'#0c1d36'); g.addColorStop(1,dive>0?'#061a36':'#02060f'); x.fillStyle=g; x.fillRect(0,y0,W,H-y0);
  // 月光倒影：越近越寬、碎成一條條晃動的亮紋
  if(dive<.6){ x.globalCompositeOperation='lighter'; for(let i=0;i<110;i++){ const k=i/110, yy=y0+(H-y0)*Math.pow(k,1.7), wd=(3+k*k*W*.16)*(.3+.7*Math.abs(Math.sin(i*7.3+t*1.7))), off=Math.sin(i*3.1+t*1.3)*k*W*.05+Math.sin(i*11.7)*k*W*.03;
    x.fillStyle=`rgba(255,214,150,${Math.max(0,(.42-k*.22)*(.35+.65*Math.sin(i*5.7+t*2.3)))*(1-dive*1.6)})`; x.fillRect(mx-wd/2+off,yy,wd,1+k*2); } x.globalCompositeOperation='source-over'; }
  // 遠處的霜汐：水紋一圈圈擴散，尾巴在月光下揮一下
  const tt=t-6.6; if(tt>0&&tt<6&&dive===0){ const cx=W*.32, cy=y0+(H-y0)*.18;
   for(let r=0;r<3;r++){ const rr=(tt-r*.6)*m*.05; if(rr<=0) continue; x.strokeStyle=`rgba(220,230,255,${Math.max(0,.5-rr/(m*.25))})`; x.lineWidth=1.4; x.beginPath(); x.ellipse(cx,cy,rr,rr*.22,0,0,6.283); x.stroke(); }
   if(tt<1.8){ const up=Math.sin(Math.min(1,tt/1.8)*Math.PI), h=m*.09*up, sw=Math.sin(tt*4)*.25;
    x.save(); x.translate(cx,cy); x.rotate(sw); x.fillStyle='rgba(240,150,190,.9)'; x.beginPath(); x.moveTo(-m*.008,0); x.quadraticCurveTo(-m*.012,-h*.6,-m*.035,-h); x.quadraticCurveTo(0,-h*.82,m*.035,-h); x.quadraticCurveTo(m*.012,-h*.6,m*.008,0); x.closePath(); x.fill();
    x.strokeStyle='rgba(255,235,245,.8)'; x.lineWidth=1; x.stroke(); x.restore(); } }
  // 潛入水中：光束與氣泡
  if(dive>0){ for(let i=0;i<6;i++){ const bx=W*(.15+i*.15)+Math.sin(t*.4+i)*W*.03; x.fillStyle=`rgba(160,210,255,${.06*dive})`; x.beginPath(); x.moveTo(bx-W*.03,Math.max(0,y0)); x.lineTo(bx+W*.03,Math.max(0,y0)); x.lineTo(bx+W*.12,H); x.lineTo(bx-W*.06,H); x.fill(); }
   for(const b of s.bub){ b.y-=b.v*(1/60); if(b.y<-.05){ b.y=1.05; b.x=Math.random(); } x.strokeStyle='rgba(220,240,255,.55)'; x.lineWidth=1; x.beginPath(); x.arc(b.x*W+Math.sin(t*2+b.p)*6,b.y*H,b.r*m,0,6.283); x.stroke(); }
   if(s.phase==='dive'&&dive>=1) playVideo(); }
  // 旁白
  if(s.phase==='night'){ const i=Math.floor((t-.8)/3); if(i>=0&&i<LINES.length&&i!==s.li){ s.li=i; s.line.style.opacity=0; setTimeout(()=>{ if(!st) return; s.line.textContent=LINES[i]; s.line.style.opacity=1; },500); }
   if(t>.8+LINES.length*3&&s.go.style.opacity!=='1'){ s.go.style.opacity=1; } } }
 window.__mermaidReward=function(ch,after,replay){ if(st) return;
  if(!document.getElementById('mrCss')){ const sc=el('style',{id:'mrCss',textContent:css}); document.head.appendChild(sc); }
  const box=el('div',{id:'mrBox'},document.body), cv=el('canvas',{},box), line=el('div',{id:'mrLine'},box), go=el('button',{id:'mrGo',textContent:'▶ 跟著霜汐潛入水中'},box), skip=el('button',{id:'mrSkip',textContent:'跳過'},box);
  const fit=()=>{ const d=Math.min(2,window.devicePixelRatio||1); cv.width=Math.round(innerWidth*d); cv.height=Math.round(innerHeight*d); }; fit(); addEventListener('resize',fit);
  st={ch,after,replay,box,cv,ctx:cv.getContext('2d'),line,go,phase:'night',li:-1,t0:performance.now(),
   stars:Array.from({length:140},()=>({x:Math.random(),y:Math.random()*.95,b:.4+Math.random()*.6,f:.5+Math.random()*2,p:Math.random()*6})),
   bub:Array.from({length:46},()=>({x:Math.random(),y:Math.random()*1.1,r:.003+Math.random()*.01,v:.12+Math.random()*.3,p:Math.random()*6}))};
  // 按鈕是玩家的手勢，之後播放影片才能帶聲音
  go.onclick=()=>{ if(!st||st.phase!=='night') return; st.phase='dive'; st.diveAt=performance.now(); go.style.opacity=0; line.style.opacity=0; const pre=document.createElement('link'); pre.rel='preload'; pre.as='video'; pre.href=document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"')?'media/mermaid_reward.mp4':'media/mermaid_reward.webm'; document.head.appendChild(pre); };
  skip.onclick=()=>{ if(!st) return; if(st.phase==='video'){ try{ st.vid.pause(); }catch(_){} st.vid.style.opacity=0; card(); } else if(st.phase==='night'){ go.onclick(); } else { st.diveAt=-1e9; } };
  requestAnimationFrame(()=>box.classList.add('on')); st.raf=requestAnimationFrame(draw);
 };
 // 預覽網址：?mermaid=1 直接播終幕回禮（只播放、不發獎勵、不改存檔）
 if(typeof location!=='undefined'&&/[?&]mermaid=1(&|$)/.test(location.search)) setTimeout(()=>window.__mermaidReward({title:'海之友',xp:20000,coins:12000},null,false),2500);
})();
