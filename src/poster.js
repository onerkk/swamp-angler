/* ===== 戰績海報：分享到 Threads（4:5 直式 1080×1350）=====
   上半部是按下分享那一刻的真實遊戲畫面（只取 3D 畫面，不含按鈕），下半部是旅程紀錄：
   稱號與等級、四格數據、故事進度、最大漁獲、最近的稱號、網址與 QR 碼。手機支援就直接叫出分享選單，不支援就下載圖片 */
(function(){
'use strict';
const W0=1080, H0=1350, URL='onerkk.github.io/swamp-angler';
const SERIF="'Noto Serif TC','Songti TC','PMingLiU',serif", SANS="'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MAIN=[['c1','碼頭'],['c2','浮萍'],['c3','暴雨'],['c4','湖心'],['ice','冰湖'],['c5','月潮'],['c6','河口'],['c7','深淵']], EPI=['e1','e2','e3','e4','e5'];
const qr=new Image(); qr.src='poster_qr.png'; const paper=new Image(); paper.src='end_paper.jpg';
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function fitText(g,t,max,size,font,weight){ let s=size; do{ g.font=`${weight||700} ${s}px ${font}`; s-=2; }while(g.measureText(t).width>max&&s>12); }
/* 這一刻的遊戲畫面：重畫一次 3D 場景後立刻複製（不需要保留繪圖緩衝） */
function grabScene(){ const W=window.__W; if(!W||!W.renderer) return null; try{ if(W.render) W.render(); else W.renderer.render(W.scene,W.camera); const src=W.renderer.domElement, c=document.createElement('canvas'); c.width=src.width; c.height=src.height; c.getContext('2d').drawImage(src,0,0); return c; }catch(e){ return null; } }
function stats(){ const S=window.__SAVE||{}, SP=(window.__PROPS&&window.__PROPS.SPECIES)||[];
  const fish=SP.filter(s=>s.loc!=='tide'&&!s.item), dex=fish.filter(s=>S.dex&&S.dex[s.id]).length;
  const B=typeof BOSS!=='undefined'?BOSS:[], won=B.filter(b=>S.boss&&S.boss[b.id]).length;
  const done=(S.story&&S.story.done)||[], main=MAIN.map(([id,n])=>({n,ok:done.indexOf(id)>=0})), epi=EPI.filter(id=>done.indexOf(id)>=0).length;
  const log=(S.catchLog||[]).filter(r=>r&&r.w>0), big=log.slice().sort((a,b)=>b.w-a.w)[0], bigSp=big&&SP.find(s=>s.id===big.id);
  const mer=(S.merGift||[]).length, merN=window.__MERGIFT?window.__MERGIFT.count():8;
  const title=window.__TAL&&window.__TAL.curTitle?window.__TAL.curTitle():((S.titles||[]).slice(-1)[0]||'');
  return {lv:S.lv||1, title, dex, dexN:fish.length, won, wonN:B.length, main, epi, total:S.total||log.length, big, bigSp, mer, merN, titles:(S.titles||[]).slice(-4).reverse(), coins:S.coins||0}; }
function draw(){ const st=stats(), cv=document.createElement('canvas'); cv.width=W0; cv.height=H0; const g=cv.getContext('2d');
  // 底：深夜湖色
  const bg=g.createLinearGradient(0,0,0,H0); bg.addColorStop(0,'#0b1620'); bg.addColorStop(1,'#05090d'); g.fillStyle=bg; g.fillRect(0,0,W0,H0);
  // 上半部：遊戲畫面（裁成 1080×760，往下漸暗接到資料區）
  const shot=grabScene(), SH=640;
  if(shot){ const sr=shot.width/shot.height, tr=W0/SH; let sw=shot.width, sh=shot.height, sx=0, sy=0; if(sr>tr){ sw=sh*tr; sx=(shot.width-sw)/2; } else { sh=sw/tr; sy=(shot.height-sh)*.35; } g.drawImage(shot,sx,sy,sw,sh,0,0,W0,SH); }
  const fade=g.createLinearGradient(0,SH*.45,0,SH+40); fade.addColorStop(0,'rgba(5,9,13,0)'); fade.addColorStop(1,'rgba(5,9,13,1)'); g.fillStyle=fade; g.fillRect(0,0,W0,SH+40);
  const top=g.createLinearGradient(0,0,0,220); top.addColorStop(0,'rgba(0,0,0,.55)'); top.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=top; g.fillRect(0,0,W0,220);
  // 片名
  g.textAlign='left'; g.textBaseline='alphabetic'; g.fillStyle='#f3e7c9'; g.shadowColor='rgba(0,0,0,.6)'; g.shadowBlur=18;
  g.font=`900 104px ${SERIF}`; g.fillText('濕地垂釣',64,148); g.shadowBlur=0;
  g.font=`500 30px ${SANS}`; g.fillStyle='rgba(243,231,201,.85)'; g.fillText('替老漁人，把四十年沒釣上岸的魚釣上來',68,198);
  // 玩家條
  let y=SH-112; g.fillStyle='rgba(12,20,26,.78)'; rr(g,48,y,W0-96,100,26); g.fill(); g.strokeStyle='rgba(255,213,106,.55)'; g.lineWidth=2; g.stroke();
  g.fillStyle='#ffd56a'; g.font=`900 52px ${SANS}`; g.fillText('Lv '+st.lv,80,y+70);
  g.fillStyle='#f3e7c9'; fitText(g,'「'+(st.title||'新手漁人')+'」',560,44,SERIF,800); g.fillText('「'+(st.title||'新手漁人')+'」',250,y+68);
  g.textAlign='right'; g.fillStyle='#9fc2d8'; g.font=`600 28px ${SANS}`; g.fillText('累積漁獲 '+st.total.toLocaleString()+' 尾',W0-80,y+66); g.textAlign='left';
  // 四格數據
  y=SH+6; const tiles=[['📖','圖鑑',st.dex+' / '+st.dexN],['👑','大師挑戰',st.won+' / '+st.wonN],['📜','漁獲簿',st.won+' 頁'],['🌙','月鱗畫像',st.mer+' / '+st.merN]], tw=(W0-96-3*18)/4;
  tiles.forEach((t,i)=>{ const x=48+i*(tw+18); g.fillStyle='rgba(255,255,255,.06)'; rr(g,x,y,tw,140,22); g.fill(); g.strokeStyle='rgba(255,255,255,.12)'; g.lineWidth=1.5; g.stroke();
    g.textAlign='center'; g.font=`400 40px ${SANS}`; g.fillText(t[0],x+tw/2,y+48); g.fillStyle='#ffe9a8'; g.font=`900 36px ${SANS}`; g.fillText(t[2],x+tw/2,y+96); g.fillStyle='#9fb3c2'; g.font=`500 24px ${SANS}`; g.fillText(t[1],x+tw/2,y+128); g.fillStyle='#fff'; });
  g.textAlign='left';
  // 故事進度：八章加後日談，走過的點亮
  y+=180; g.fillStyle='#cfe0ea'; g.font=`700 28px ${SANS}`; g.fillText('故事進度',56,y);
  const n=st.main.length, x0=70, x1=W0-70, step=(x1-x0)/(n-1), cy=y+52;
  g.strokeStyle='rgba(255,255,255,.18)'; g.lineWidth=6; g.beginPath(); g.moveTo(x0,cy); g.lineTo(x1,cy); g.stroke();
  const last=st.main.map(m=>m.ok).lastIndexOf(true); if(last>=0){ g.strokeStyle='#ffd56a'; g.beginPath(); g.moveTo(x0,cy); g.lineTo(x0+step*last,cy); g.stroke(); }
  st.main.forEach((m,i)=>{ const x=x0+step*i; g.beginPath(); g.arc(x,cy,m.ok?17:13,0,Math.PI*2); g.fillStyle=m.ok?'#ffd56a':'#26323b'; g.fill(); if(m.ok){ g.fillStyle='#2a1a00'; g.font=`900 20px ${SANS}`; g.textAlign='center'; g.fillText('✓',x,cy+7); }
    g.textAlign='center'; g.fillStyle=m.ok?'#ffe9a8':'#6f8291'; g.font=`600 24px ${SANS}`; g.fillText(m.n,x,cy+52); });
  g.textAlign='right'; g.fillStyle=st.epi?'#f6c1d4':'#6f8291'; g.font=`700 24px ${SANS}`; g.fillText(st.epi?`後日談 ${st.epi}/5`:'後日談 未開啟',W0-56,y); g.textAlign='left';
  // 最大漁獲＋最近稱號
  y=cy+84; const half=(W0-96-18)/2;
  g.fillStyle='rgba(255,255,255,.06)'; rr(g,48,y,half,170,22); g.fill(); rr(g,48+half+18,y,half,170,22); g.fill();
  g.fillStyle='#9fb3c2'; g.font=`600 24px ${SANS}`; g.fillText('🏆 最大漁獲',74,y+42); g.fillText('🎖️ 最近的稱號',48+half+44,y+42);
  if(st.big&&st.bigSp){ g.fillStyle='#fff'; fitText(g,st.bigSp.name,half-52,46,SERIF,900); g.fillText(st.bigSp.name,74,y+102); g.fillStyle='#ffd56a'; g.font=`800 30px ${SANS}`; g.fillText((st.big.w>=1?st.big.w.toFixed(1)+' kg':Math.round(st.big.w*1000)+' g')+(st.big.L?'・'+Math.round(st.big.L*100)+' cm':''),74,y+146); }
  else { g.fillStyle='#6f8291'; g.font=`600 28px ${SANS}`; g.fillText('第一尾還在等你',74,y+110); }
  let tx=48+half+44, ty=y+70; g.font=`700 24px ${SANS}`;
  (st.titles.length?st.titles:['還沒有稱號']).forEach(t=>{ const w=g.measureText(t).width+28; if(tx+w>W0-60){ tx=48+half+44; ty+=46; } if(ty>y+140) return; g.fillStyle='rgba(255,213,106,.14)'; rr(g,tx,ty,w,38,19); g.fill(); g.strokeStyle='rgba(255,213,106,.5)'; g.lineWidth=1.5; g.stroke(); g.fillStyle='#ffe9a8'; g.fillText(t,tx+14,ty+28); tx+=w+10; });
  // 底部：網址、QR、邀請
  y=H0-148; g.fillStyle='rgba(243,231,201,.96)'; rr(g,48,y,W0-96,124,26); g.fill();
  if(qr.complete&&qr.naturalWidth) g.drawImage(qr,W0-48-14-104,y+10,104,104);
  g.fillStyle='#2a1a08'; g.font=`900 36px ${SERIF}`; g.fillText('免下載・手機打開就能玩',80,y+52);
  g.font=`600 26px ${SANS}`; g.fillStyle='#5a4220'; g.fillText('🎣 '+URL,80,y+96);
  return cv; }
/* 預覽視窗：分享（手機叫出分享選單，可以直接選 Threads）、儲存圖片 */
const st=document.createElement('style'); st.textContent=`#poster{position:fixed;inset:0;z-index:62;background:rgba(0,0,0,.86);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:14px}
#poster img{max-width:min(92vw,460px);max-height:72vh;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.6)}#poster .row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
#poster button{padding:11px 18px;border-radius:999px;border:1px solid rgba(255,213,106,.6);background:#2a1f0e;color:#ffe9a8;font-size:15px;font-weight:800;font-family:inherit}#poster button.pri{background:#ffd56a;color:#2a1a00}#poster small{color:#9fb3c2;font-size:12px}`;
document.head.appendChild(st);
function open(){ const cv=draw(), url=cv.toDataURL('image/jpeg',.9), el=document.createElement('div'); el.id='poster';
  el.innerHTML=`<img src="${url}" alt="戰績海報"><div class="row"><button class="pri" data-k="share">📤 分享</button><button data-k="save">💾 儲存圖片</button><button data-k="x">關閉</button></div><small>分享時選 Threads 就能直接貼文</small>`;
  document.body.appendChild(el);
  el.addEventListener('click',async e=>{ const k=e.target.closest('[data-k]'); if(!k) return; const a=k.dataset.k;
    if(a==='x'){ el.remove(); return; }
    const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.92)), file=new File([blob],'swamp-angler.jpg',{type:'image/jpeg'});
    if(a==='share'&&navigator.canShare&&navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],text:'我在《濕地垂釣》的旅程 🎣 免下載，手機打開就能玩：https://'+URL+'/'}); }catch(_){} return; }
    const link=document.createElement('a'); link.href=URL_.createObjectURL(blob); link.download='swamp-angler.jpg'; document.body.appendChild(link); link.click(); link.remove(); }); }
const URL_=window.URL;
window.__POSTER={open,draw};
})();
