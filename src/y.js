/* ===== 雲端存檔：Google 帳號登入（Firebase），本機進度永遠不會被洗掉 ===== */
function createCloud(c){
'use strict';
// 測試帳號（網址帶 test 參數）：只限擁有者 Google 帳號，存檔另開一份，雲端存在同一份文件的 test 欄位，不會碰到正式存檔
const OWNER=['onerkk@gmail.com'];
const TEST=!!c.test, FIELD=TEST?'test':'save', TFIELD=TEST?'tt':'t';
const KEY='swampAngler.cloud', BK=TEST?'swampAngler.test.backup':'swampAngler.backup';
let auth=null, db=null, user=null, dirtyT=null, inited=null, busy=false, owner=false, gate=null;
const isOwner=u=>!!(u&&u.email&&u.emailVerified!==false&&OWNER.includes(u.email.toLowerCase()));
const score=s=>s?((s.lv||1)*1000+(s.xp||0)+Object.keys(s.dex||{}).length*60+Math.min(50000,(s.coins||0))/100):0;
function addScript(u){ return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=u; s.onload=ok; s.onerror=()=>no(new Error('載入失敗 '+u)); document.head.appendChild(s); }); }
async function init(){ if(inited) return inited; if(!window.FIREBASE_CFG) return null;
  inited=(async()=>{ const V='10.14.1'; for(const m of ['app','auth','firestore']) await addScript(`https://www.gstatic.com/firebasejs/${V}/firebase-${m}-compat.js`);
    firebase.initializeApp(window.FIREBASE_CFG); auth=firebase.auth(); db=firebase.firestore();
    try{ await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); }catch(e){}
    try{ const r=await auth.getRedirectResult(); if(r&&r.user) c.toast('已登入 '+(r.user.displayName||''),'good',2000); }catch(e){ c.toast('登入失敗：'+(e.message||e),'bad',3000); }
    auth.onAuthStateChanged(u=>{ user=u; owner=isOwner(u); if(u) localStorage.setItem(KEY,'1');
      if(TEST){ showGate(); if(owner){ if(!c.save().testSeeded) copyMain(true); else onLogin().then(()=>{ if(c.grant) c.grant(); }); } }
      else if(u) onLogin();
      c.refresh&&c.refresh(); }); return true; })();
  return inited; }
async function login(){ if(!window.FIREBASE_CFG){ c.toast('Google 登入尚未設定（需要專案擁有者填入 Firebase 設定）','warn',3200); return; }
  if(busy) return; busy=true; try{ await init(); const p=new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({prompt:'select_account'});
    try{ await auth.signInWithPopup(p); }catch(e){ if(/popup|blocked|cancelled|closed/i.test(e.code||'')) await auth.signInWithRedirect(p); else throw e; }
  }catch(e){ c.toast('登入失敗：'+(e.message||e),'bad',3200); } busy=false; }
async function logout(){ if(!auth) return; await push(); await auth.signOut(); localStorage.removeItem(KEY); c.toast('已登出，本機進度保留','',2000); }
function docRef(){ return db.collection('saves').doc(user.uid); }
// merge：正式存檔與測試存檔放在同一份文件的不同欄位，互相不覆蓋
async function push(){ if(!user||!db||(TEST&&!owner)) return; try{ await docRef().set({[FIELD]:c.save(),[TFIELD]:Date.now(),name:user.displayName||'',v:1},{merge:true}); c.refresh&&c.refresh(); }catch(e){ console.warn('cloud push',e); } }
// 登入當下：雲端沒有存檔 → 把本機進度存上去；雲端有而且進度較高 → 詢問；其他情況以本機為準
async function onLogin(){ try{ const d=await docRef().get(); const local=c.save();
    if(!d.exists||!d.data()[FIELD]){ await push(); if(!TEST) c.toast('已把目前的進度存到雲端','good',2400); return; }
    const cloud=d.data()[FIELD]; if(JSON.stringify(cloud)===JSON.stringify(local)) return;
    const sl=score(local), sc=score(cloud);
    if(sc>sl+1&&confirm(`雲端有進度較高的存檔（Lv ${cloud.lv||1}、金幣 ${(cloud.coins||0).toLocaleString()}）。\n要載入雲端存檔嗎？\n目前本機進度會先備份，不會消失。`)){ try{ localStorage.setItem(BK,JSON.stringify(local)); }catch(e){} c.apply(cloud); return; }
    await push(); }catch(e){ console.warn('cloud pull',e); c.toast('雲端存檔讀取失敗，使用本機進度','warn',2600); } }
// 測試帳號：把正式版進度（本機或雲端，取進度較高的那份）複製過來，金幣維持 999,999
async function copyMain(auto){ if(!TEST||!owner) return; let best=null;
  try{ const l=JSON.parse(localStorage.getItem('swampAngler.v1')||'null'); if(l) best=l; }catch(e){}
  try{ const d=await docRef().get(); const cs=d.exists&&d.data().save; if(cs&&score(cs)>score(best)) best=cs; }catch(e){ console.warn('copy main',e); }
  if(!best){ const s=c.save(); s.testSeeded=1; if(auto){ await onLogin(); if(c.grant) c.grant(); } else c.toast('找不到正式版進度','warn',2000); return; }
  const o=JSON.parse(JSON.stringify(best)); o.testSeeded=1; o.coins=Math.max(999999,o.coins||0);
  c.toast(auto?'🧪 測試帳號：已複製正式版進度':'已複製正式版進度','good',1800);
  try{ await docRef().set({[FIELD]:o,[TFIELD]:Date.now()},{merge:true}); }catch(e){}
  setTimeout(()=>c.apply(o),auto?900:600); }
function dirty(){ if(!user||(TEST&&!owner)) return; clearTimeout(dirtyT); dirtyT=setTimeout(push,6000); }
function status(){ if(!window.FIREBASE_CFG) return {state:'nocfg'}; if(!user) return {state:'out'}; return {state:'in',name:(user.displayName||user.email||'')+(TEST?'（測試帳號）':'')}; }
// 測試帳號的門：沒登入或不是擁有者就整個畫面擋住，驗證通過才放行
function showGate(){ if(!TEST) return;
  if(owner){ if(gate){ gate.remove(); gate=null; } return; }
  if(!gate){ gate=document.createElement('div'); gate.id='testGate';
    gate.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(6,10,14,.94);color:#eef;font-family:inherit;text-align:center';
    document.body.appendChild(gate);
    gate.addEventListener('click',e=>{ const a=e.target.dataset&&e.target.dataset.g; if(a==='in') login(); else if(a==='out') logout(); }); }
  const btn='height:48px;padding:0 22px;border-radius:14px;border:0;font:inherit;font-size:16px;font-weight:800;margin:6px;cursor:pointer';
  const home=location.pathname;
  const msg=!window.FIREBASE_CFG?'Google 登入尚未設定，測試帳號無法使用。'
    :user?`目前登入的是 ${user.email||user.displayName||'其他帳號'}，這個帳號沒有測試權限。`
    :'測試帳號只限擁有者的 Google 帳號，請先登入。';
  gate.innerHTML=`<div style="max-width:420px"><div style="font-size:40px">🧪</div><div style="font-size:20px;font-weight:900;margin:8px 0">濕地垂釣・測試帳號</div>
    <div style="opacity:.8;line-height:1.7;margin-bottom:14px">${msg}</div>
    ${window.FIREBASE_CFG?(user?`<button data-g="out" style="${btn};background:#444;color:#fff">登出換帳號</button>`:`<button data-g="in" style="${btn};background:#e8b84a;color:#1d1606">Google 登入</button>`):''}
    <a href="${home}" style="display:inline-block;${btn};line-height:48px;background:#2a3440;color:#fff;text-decoration:none">回到正式版</a></div>`; }
if(TEST){ const go=()=>{ showGate(); if(window.FIREBASE_CFG) init().catch(()=>{}); };
  if(document.body) go(); else document.addEventListener('DOMContentLoaded',go); }
// 之前登入過就自動接上
if(!TEST&&localStorage.getItem(KEY)==='1'&&window.FIREBASE_CFG) init().catch(()=>{});
window.addEventListener('beforeunload',()=>{ if(user&&dirtyT){ clearTimeout(dirtyT); push(); } });
return {login,logout,dirty,status,isTest:()=>TEST,copyMain:()=>copyMain(false),restoreBackup:()=>{ const b=localStorage.getItem(BK); if(!b){ c.toast('沒有備份','warn',1600); return; } c.apply(JSON.parse(b)); }};
}
/* ===== 安裝到桌面（PWA） ===== */
const PWA=(()=>{ let deferred=null, installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; });
  window.addEventListener('appinstalled',()=>{ installed=true; deferred=null; });
/* 自動偵測新版本：網頁內建這次部署的版本號，定時（開啟時、每 10 分鐘、切回畫面時）比對伺服器上的 version.json；
   有新版就在畫面上方跳出「有新版本」，玩家按下後清掉舊快取並重新載入（存檔在 localStorage，不受影響） */
(()=>{ const APP_VER='__APP_BUILD__'; window.__APP_VER=APP_VER; if(APP_VER.indexOf('APP_BUILD')>=0) return;
  const bar=document.createElement('div'); bar.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);z-index:90;display:none;align-items:center;gap:10px;padding:9px 14px;border-radius:999px;background:rgba(20,30,48,.92);border:1px solid rgba(255,214,120,.6);color:#ffe3a3;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.45);font-family:sans-serif';
  bar.innerHTML='<span>🔄 有新版本</span><button style="border:0;border-radius:999px;padding:6px 14px;background:#ffcf66;color:#3a2600;font-weight:700">立即更新</button><button style="border:0;background:none;color:#aab;font-size:16px">✕</button>';
  document.body.appendChild(bar); const [upB,noB]=bar.querySelectorAll('button'); let dismissed='';
  async function doUpdate(){ upB.textContent='更新中…'; upB.disabled=true;
    try{ if(window.__saveNow) window.__saveNow(); }catch(e){}
    try{ const ks=await caches.keys(); await Promise.all(ks.filter(k=>!k.startsWith('swamp-assets')).map(k=>caches.delete(k))); /* 更新時保留模型貼圖快取，不必重新下載整個遊戲 */ }catch(e){}
    try{ const r=await navigator.serviceWorker.getRegistration(); if(r) await r.update(); }catch(e){}
    location.reload(); }
  upB.addEventListener('click',doUpdate); noB.addEventListener('click',()=>{ bar.style.display='none'; dismissed=bar.dataset.v||''; });
  async function check(){ try{ const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'}); if(!r.ok) return; const j=await r.json();
      if(j.v&&j.v!==APP_VER&&j.v>APP_VER&&j.v!==dismissed){ bar.dataset.v=j.v; bar.style.display='flex'; } }catch(e){} }
  setTimeout(check,4000); setInterval(check,10*60*1000); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) check(); });
})();
  if('serviceWorker' in navigator) window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
  async function install(){ if(installed) return 'installed'; if(deferred){ deferred.prompt(); const r=await deferred.userChoice; deferred=null; return r.outcome; }
    return /iPhone|iPad/.test(navigator.userAgent)?'ios':'manual'; }
  return {install,canPrompt:()=>!!deferred,installed:()=>installed};
})();
