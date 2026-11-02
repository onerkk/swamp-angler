/* ===== 月鱗畫像：送霜汐回家後，她留下一片月鱗，鱗面映出她的樣子（使用者用 AI 產生的美人魚圖） =====
   每次隨機一張，優先給還沒收集到的；收集過的可以在霜汐的對話視窗裡「🖼 月鱗畫像」重看
   圖片放在 media/mergift/，新增圖片只要把檔名加進 MERGIFT 清單 */
const MERGIFT=[];
(function(){
'use strict';
const st=document.createElement('style'); st.textContent=`
#mgBox{position:fixed;inset:0;z-index:58;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:radial-gradient(ellipse at 50% 40%,rgba(30,50,90,.75),rgba(2,6,14,.94));opacity:0;transition:opacity .5s;padding:16px;font-family:inherit}
#mgBox.on{opacity:1}#mgBox .t{color:#cfe6ff;font-size:13px;letter-spacing:.4em}#mgBox .n{color:#f6d9e4;font-size:20px;letter-spacing:.2em}
#mgBox .fr{position:relative;max-width:min(92vw,520px);max-height:66vh;border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px rgba(200,225,255,.35),0 0 40px rgba(140,190,255,.35);transform:scale(.92);transition:transform .9s cubic-bezier(.2,1.1,.3,1)}
#mgBox.on .fr{transform:none}#mgBox img{display:block;max-width:min(92vw,520px);max-height:66vh;object-fit:contain;background:#000}
#mgBox .fr::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.28) 50%,transparent 65%);transform:translateX(-120%);animation:mgShine 2.4s ease .6s 1 forwards}
@keyframes mgShine{to{transform:translateX(120%)}}
#mgBox .row{display:flex;gap:10px}#mgBox button{padding:10px 18px;border-radius:999px;border:1px solid rgba(200,225,255,.45);background:rgba(20,40,70,.85);color:#e6f0ff;font-size:14px;font-family:inherit}
#mgBox .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(92vw,520px);max-height:66vh;overflow:auto}#mgBox .grid img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px}#mgBox .grid .lk{aspect-ratio:3/4;border-radius:8px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;color:#8aa4c4;font-size:22px}`;
document.head.appendChild(st);
const save=()=>window.__SAVE||null;
function got(){ const s=save(); if(!s) return []; s.merGift=s.merGift||[]; return s.merGift; }
function box(html){ const old=document.getElementById('mgBox'); if(old) old.remove(); const el=document.createElement('div'); el.id='mgBox'; el.innerHTML=html; document.body.appendChild(el); requestAnimationFrame(()=>el.classList.add('on')); return el; }
function close(el){ el.classList.remove('on'); setTimeout(()=>el.remove(),500); }
/* 送她回家後呼叫：隨機一張，沒收集過的優先 */
function give(){ if(!MERGIFT.length) return false; const have=got(), fresh=MERGIFT.filter(f=>have.indexOf(f)<0), pool=fresh.length?fresh:MERGIFT, f=pool[Math.floor(Math.random()*pool.length)];
  const isNew=have.indexOf(f)<0; if(isNew){ have.push(f); if(window.__saveNow) window.__saveNow(); }
  const el=box(`<div class="t">霜汐留下的月鱗</div><div class="n">${isNew?'新的畫像':'月鱗畫像'}（${have.length}/${MERGIFT.length}）</div><div class="fr"><img src="media/mergift/${f}" alt="霜汐"></div><div class="row"><button data-k="all">🖼 全部畫像</button><button data-k="x">收下</button></div>`);
  el.querySelector('img').addEventListener('error',()=>close(el));
  el.addEventListener('click',e=>{ const k=e.target.closest('[data-k]'); if(!k) return; if(k.dataset.k==='all'){ close(el); setTimeout(album,350); } else close(el); });
  return true; }
/* 相簿：收集到的可以點開看大圖，沒收集到的顯示鎖 */
function album(){ const have=got();
  const el=box(`<div class="t">月鱗畫像</div><div class="n">${have.length}/${MERGIFT.length}</div><div class="grid">${MERGIFT.map(f=>have.indexOf(f)>=0?`<img src="media/mergift/${f}" data-f="${f}" alt="">`:'<div class="lk">🔒</div>').join('')}</div><div class="row"><button data-k="x">關閉</button></div>`);
  el.addEventListener('click',e=>{ const im=e.target.closest('img[data-f]'); if(im){ const f=im.dataset.f; close(el); setTimeout(()=>{ const v=box(`<div class="fr"><img src="media/mergift/${f}" alt=""></div><div class="row"><button data-k="back">返回</button></div>`); v.addEventListener('click',ev=>{ if(ev.target.closest('[data-k]')){ close(v); setTimeout(album,350); } }); },350); return; }
    if(e.target.closest('[data-k]')) close(el); }); }
window.__MERGIFT={give,album,count:()=>MERGIFT.length};
})();
