/* ===== 雲端存檔：Google 帳號登入（Firebase），本機進度永遠不會被洗掉 ===== */
function createCloud(c){
'use strict';
const KEY='swampAngler.cloud', BK='swampAngler.backup';
let auth=null, db=null, user=null, dirtyT=null, inited=null, busy=false;
const score=s=>s?((s.lv||1)*1000+(s.xp||0)+Object.keys(s.dex||{}).length*60+Math.min(50000,(s.coins||0))/100):0;
function addScript(u){ return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=u; s.onload=ok; s.onerror=()=>no(new Error('載入失敗 '+u)); document.head.appendChild(s); }); }
async function init(){ if(inited) return inited; if(!window.FIREBASE_CFG) return null;
  inited=(async()=>{ const V='10.14.1'; for(const m of ['app','auth','firestore']) await addScript(`https://www.gstatic.com/firebasejs/${V}/firebase-${m}-compat.js`);
    firebase.initializeApp(window.FIREBASE_CFG); auth=firebase.auth(); db=firebase.firestore();
    try{ await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); }catch(e){}
    try{ const r=await auth.getRedirectResult(); if(r&&r.user) c.toast('已登入 '+(r.user.displayName||''),'good',2000); }catch(e){ c.toast('登入失敗：'+(e.message||e),'bad',3000); }
    auth.onAuthStateChanged(u=>{ user=u; if(u){ localStorage.setItem(KEY,'1'); onLogin(); } c.refresh&&c.refresh(); }); return true; })();
  return inited; }
async function login(){ if(!window.FIREBASE_CFG){ c.toast('Google 登入尚未設定（需要專案擁有者填入 Firebase 設定）','warn',3200); return; }
  if(busy) return; busy=true; try{ await init(); const p=new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({prompt:'select_account'});
    try{ await auth.signInWithPopup(p); }catch(e){ if(/popup|blocked|cancelled|closed/i.test(e.code||'')) await auth.signInWithRedirect(p); else throw e; }
  }catch(e){ c.toast('登入失敗：'+(e.message||e),'bad',3200); } busy=false; }
async function logout(){ if(!auth) return; await push(); await auth.signOut(); localStorage.removeItem(KEY); c.toast('已登出，本機進度保留','',2000); }
function docRef(){ return db.collection('saves').doc(user.uid); }
async function push(){ if(!user||!db) return; try{ await docRef().set({save:c.save(),t:Date.now(),name:user.displayName||'',v:1}); c.refresh&&c.refresh(); }catch(e){ console.warn('cloud push',e); } }
// 登入當下：雲端沒有存檔 → 把本機進度存上去；雲端有而且進度較高 → 詢問；其他情況以本機為準
async function onLogin(){ try{ const d=await docRef().get(); const local=c.save();
    if(!d.exists||!d.data().save){ await push(); c.toast('已把目前的進度存到雲端','good',2400); return; }
    const cloud=d.data().save; if(JSON.stringify(cloud)===JSON.stringify(local)) return;
    const sl=score(local), sc=score(cloud);
    if(sc>sl+1&&confirm(`雲端有進度較高的存檔（Lv ${cloud.lv||1}、金幣 ${(cloud.coins||0).toLocaleString()}）。\n要載入雲端存檔嗎？\n目前本機進度會先備份，不會消失。`)){ try{ localStorage.setItem(BK,JSON.stringify(local)); }catch(e){} c.apply(cloud); return; }
    await push(); }catch(e){ console.warn('cloud pull',e); c.toast('雲端存檔讀取失敗，使用本機進度','warn',2600); } }
function dirty(){ if(!user) return; clearTimeout(dirtyT); dirtyT=setTimeout(push,6000); }
function status(){ if(!window.FIREBASE_CFG) return {state:'nocfg'}; if(!user) return {state:'out'}; return {state:'in',name:user.displayName||user.email||''}; }
// 之前登入過就自動接上
if(localStorage.getItem(KEY)==='1'&&window.FIREBASE_CFG) init().catch(()=>{});
window.addEventListener('beforeunload',()=>{ if(user&&dirtyT){ clearTimeout(dirtyT); push(); } });
return {login,logout,dirty,status,restoreBackup:()=>{ const b=localStorage.getItem(BK); if(!b){ c.toast('沒有備份','warn',1600); return; } c.apply(JSON.parse(b)); }};
}
/* ===== 安裝到桌面（PWA） ===== */
const PWA=(()=>{ let deferred=null, installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; });
  window.addEventListener('appinstalled',()=>{ installed=true; deferred=null; });
  if('serviceWorker' in navigator) window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
  async function install(){ if(installed) return 'installed'; if(deferred){ deferred.prompt(); const r=await deferred.userChoice; deferred=null; return r.outcome; }
    return /iPhone|iPad/.test(navigator.userAgent)?'ios':'manual'; }
  return {install,canPrompt:()=>!!deferred,installed:()=>installed};
})();
