/* 終幕「霜汐的邀請」完成後的回禮：先在真實的月光灣 3D 場景演出（z.js 結局系統，霜汐浮出水面、說話、鴨式潛水）
   → 黑畫面上玩家按下「跟著霜汐潛入水中」→ 接上真人美人魚的影片 → 回禮卡。
   影片是玩家提供的真人美人魚表演，轉成 720p H.264（media/mermaid_reward.mp4，約 7MB），要看的時候才下載。 */
(function(){
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
 function close(){ if(!st) return; const s=st; st=null; try{ s.vid&&s.vid.pause(); }catch(_){} try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(_){}
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
 // 3D 演出結束後：黑畫面上一個按鈕。由玩家按下（手勢）再播放影片，手機才允許帶聲音
 function stage(){ const s=st; if(!s) return; s.phase='ready';
  s.line.textContent='她潛進了月光底下的水裡。'; requestAnimationFrame(()=>{ s.box.classList.add('on'); s.line.style.opacity=1; s.go.style.opacity=1; }); }
 window.__mermaidReward=function(ch,after,replay){ if(st) return;
  if(!document.getElementById('mrCss')){ const sc=el('style',{id:'mrCss',textContent:css}); document.head.appendChild(sc); }
  const box=el('div',{id:'mrBox'},document.body), line=el('div',{id:'mrLine'},box), go=el('button',{id:'mrGo',textContent:'▶ 跟著霜汐潛入水中'},box), skip=el('button',{id:'mrSkip',textContent:'跳過'},box);
  box.style.pointerEvents='none'; box.style.background='transparent';
  st={ch,after,replay,box,line,go,phase:'film'};
  go.onclick=()=>{ if(!st||st.phase!=='ready') return; go.style.opacity=0; line.style.opacity=0; playVideo(); };
  skip.onclick=()=>{ if(!st) return; if(st.phase==='video'){ try{ st.vid.pause(); }catch(_){} st.vid.style.opacity=0; card(); } else if(st.phase==='ready') go.onclick(); };
  const show=()=>{ if(!st) return; box.style.pointerEvents=''; box.style.background='#000'; stage(); };
  // 真實場景的演出（結局系統）；萬一不能演（例如還在載入），直接進影片前的畫面
  if(window.__playMermaidInvite){ try{ window.__playMermaidInvite(show); return; }catch(e){ console.warn('mermaid invite',e); } }
  show();
 };
 // 預覽網址：?mermaid=1 直接播終幕回禮（只播放、不發獎勵、不改存檔）
 if(typeof location!=='undefined'&&/[?&]mermaid=1(&|$)/.test(location.search)){ const wait=()=>{ if(window.__GAME_READY&&window.__playMermaidInvite) setTimeout(()=>window.__mermaidReward({title:'海之友',xp:20000,coins:12000},null,false),800); else setTimeout(wait,500); }; setTimeout(wait,1500); }
})();
