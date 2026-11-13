/* ===== 釣魚抽蝦皮折扣碼（遊戲端）=====
   中不中獎、折扣碼都由伺服器決定（server/），這裡只負責：把「釣到哪一級的魚」告訴伺服器、顯示活動與結果。
   PROMO_URL 沒設定（伺服器還沒部署）時，整個活動不出現 */
(function(){
const PROMO_URL=window.PROMO_URL||'';
const $=id=>document.getElementById(id);
let st=null, busy=false, mine=null;
const css=document.createElement('style'); css.textContent=`
#promoBar{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 8px);z-index:40;display:none;max-width:92vw;padding:6px 14px;border-radius:999px;background:linear-gradient(90deg,#ee4d2d,#ff7337);color:#fff;font-weight:800;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:0}
body:has(#intro:not(.hidden)) #promoBar{display:block}
#promoChip{position:fixed;right:calc(env(safe-area-inset-right,0px) + 12px);top:calc(env(safe-area-inset-top,0px) + 200px);z-index:30;display:none;padding:6px 10px;border-radius:14px;background:rgba(238,77,45,.9);color:#fff;font-weight:800;font-size:12px;border:0}
body.promoOn:not(:has(#intro:not(.hidden))):not(.sheetOn):not(.athome):not(.attide):not(.inHall):not(.fighting):not(.catching):not(.cine):not(.underwater):not(.ending) #promoChip{display:block}
#promoChip{top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 132px)}
@media (orientation:landscape) and (max-height:540px){#promoChip{bottom:calc(env(safe-area-inset-bottom,0px) + 124px);right:calc(env(safe-area-inset-right,0px) + 20px)}}
#promoBox{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.62);display:none;align-items:center;justify-content:center;padding:16px}
#promoBox.on{display:flex} #promoBox .pc{width:min(420px,92vw);max-height:88vh;overflow:auto;background:#fffaf3;color:#3a2a1a;border-radius:18px;padding:18px 18px 14px;box-shadow:0 18px 50px rgba(0,0,0,.5)}
#promoBox h3{margin:0 0 6px;font-size:19px;color:#ee4d2d} #promoBox p{margin:6px 0;font-size:14px;line-height:1.6} #promoBox .code{font:800 26px/1.2 ui-monospace,monospace;letter-spacing:.08em;text-align:center;padding:12px;border:2px dashed #ee4d2d;border-radius:12px;margin:10px 0;background:#fff}
#promoBox .row{display:flex;gap:8px;margin-top:10px} #promoBox button{flex:1;min-height:42px;border-radius:12px;border:0;font-weight:800;font-size:15px} #promoBox .pri{background:#ee4d2d;color:#fff} #promoBox .sec{background:#eee;color:#333}
#promoBox ul{margin:6px 0;padding-left:20px;font-size:13px} #promoWin{position:fixed;inset:0;z-index:210;pointer-events:none;display:none;background:radial-gradient(circle,rgba(255,210,120,.55),rgba(0,0,0,0) 60%)} #promoWin.on{display:block;animation:pw 1.6s ease-out forwards}@keyframes pw{0%{opacity:0}20%{opacity:1}100%{opacity:0}}`;
document.head.appendChild(css);
const bar=document.createElement('button'); bar.id='promoBar'; document.body.appendChild(bar);
const chip=document.createElement('button'); chip.id='promoChip'; document.body.appendChild(chip);
const box=document.createElement('div'); box.id='promoBox'; box.innerHTML='<div class="pc"></div>'; document.body.appendChild(box);
const flash=document.createElement('div'); flash.id='promoWin'; document.body.appendChild(flash);
box.addEventListener('click',e=>{ if(e.target===box) box.classList.remove('on'); });
const toast=(t,k,ms)=>{ try{ (window.__toast||window.toast||(()=>{}))(t,k,ms); }catch(e){} };
async function token(){ try{ const u=window.firebase&&firebase.auth&&firebase.auth().currentUser; return u?await u.getIdToken():null; }catch(e){ return null; } }
async function api(path,opt){ const r=await fetch(PROMO_URL.replace(/\/$/,'')+path,opt); return r.json(); }
function render(){ if(!st) return; const on=st.open; document.body.classList.toggle('promoOn',on||!!mine);
  bar.textContent=on?`🎁 釣魚抽蝦皮 5 折券！越難釣的魚越容易中・剩 ${st.remaining} 份`:'🎁 蝦皮 5 折券已全部送出，謝謝參加'; bar.style.display=on?'':'none';
  chip.textContent=mine?'🎁 我的折扣碼':`🎁 剩 ${st.remaining} 份`; }
function show(){ const w=(st&&st.winners)||[]; const end=st?new Date(st.ends).toLocaleDateString('zh-TW'):'12/31';
  box.querySelector('.pc').innerHTML=(mine?`<h3>🎉 你的蝦皮 5 折券</h3><div class="code">${mine}</div><p>到「靜月之光」蝦皮賣場結帳時輸入這組代碼。</p>`:`<h3>🎁 釣魚抽蝦皮 5 折券</h3><p>登入 Google 後，每釣到一條魚都有機會抽中「靜月之光」蝦皮賣場的 <b>5 折優惠券</b>。魚越難釣，機率越高：常見魚約十萬分之一，魚王 1%。</p>`)+
   `<ul><li>全部只有 ${st?st.total:3} 份，每人最多中一次，送完為止</li><li>使用期限：${end} 23:59 前</li><li>滿 NT$99 可用，最高折抵 NT$3,000，每組代碼限用一次</li><li>抽獎由伺服器決定，修改遊戲無法提高機率</li></ul>`+
   (w.length?`<p><b>已經釣到的人：</b>${w.map(x=>`${x.name}（${x.fish||'魚'}）`).join('、')}</p>`:'')+
   `<div class="row">${mine?'<button class="pri" data-a="copy">複製代碼</button>':''}<button class="sec" data-a="x">關閉</button></div>`;
  box.querySelectorAll('button').forEach(b=>b.onclick=()=>{ if(b.dataset.a==='copy'){ try{ navigator.clipboard.writeText(mine); toast('已複製代碼','good',1600); }catch(e){} } else box.classList.remove('on'); });
  box.classList.add('on'); }
bar.onclick=chip.onclick=show;
async function refresh(){ if(!PROMO_URL) return; try{ st=await api('/status'); const t=await token(); if(t){ const m=await api('/mine',{headers:{Authorization:'Bearer '+t}}); mine=m&&m.code||null; } render(); }catch(e){} }
/* 釣到魚：把魚的等級（0 常見～5 魚王）送去伺服器抽 */
async function onCatch(sp){ if(!PROMO_URL||!st||!st.open||mine||busy) return; const t=await token(); if(!t) return; busy=true;
  try{ const r=await api('/roll',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({tier:Math.min(5,sp&&sp.rar||0),fish:sp&&sp.name||''})});
    if(r&&r.code){ mine=r.code; if(r.win){ flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on'); try{ navigator.vibrate&&navigator.vibrate([80,60,160]); }catch(e){} setTimeout(show,700); refresh(); } render(); } }
  catch(e){} finally{ busy=false; } }
window.__PROMO={onCatch,refresh,show};
if(PROMO_URL){ refresh(); setInterval(refresh,120000); }
})();
