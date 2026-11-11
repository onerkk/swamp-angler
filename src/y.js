/* ===== 雲端存檔：Google 帳號登入（Firebase），本機進度永遠不會被洗掉 ===== */
function createCloud(c){
'use strict';
// 向瀏覽器申請「持久儲存」：空間吃緊時，瀏覽器不會把這個遊戲的存檔和快取整個清掉（存檔不見的可能原因之一）
try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persisted().then(p=>{ if(!p) navigator.storage.persist(); }); }catch(e){}
// 測試帳號（網址帶 test 參數）：只限擁有者 Google 帳號，存檔另開一份，雲端存在同一份文件的 test 欄位，不會碰到正式存檔
const OWNER=['onerkk@gmail.com'];
const TEST=!!c.test, FIELD=TEST?'test':'save', TFIELD=TEST?'tt':'t';
const KEY='swampAngler.cloud', BK=TEST?'swampAngler.test.backup':'swampAngler.backup';
let auth=null, db=null, user=null, dirtyT=null, inited=null, busy=false, owner=false, gate=null, loggingOut=false;
const isOwner=u=>!!(u&&u.email&&u.emailVerified!==false&&OWNER.includes(u.email.toLowerCase()));
const score=s=>s?((s.lv||1)*1000+(s.xp||0)+Object.keys(s.dex||{}).length*60+Math.min(50000,(s.coins||0))/100):0;
function addScript(u){ return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=u; s.onload=ok; s.onerror=()=>no(new Error('載入失敗 '+u)); document.head.appendChild(s); }); }
async function init(){ if(inited) return inited; if(!window.FIREBASE_CFG) return null;
  inited=(async()=>{ const V='10.14.1'; for(const m of ['app','auth','firestore']) await addScript(`https://www.gstatic.com/firebasejs/${V}/firebase-${m}-compat.js`);
    firebase.initializeApp(window.FIREBASE_CFG); auth=firebase.auth(); db=firebase.firestore();
    try{ await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); }catch(e){}
    try{ const r=await auth.getRedirectResult(); if(r&&r.user) c.toast('已登入 '+(r.user.displayName||''),'good',2000); }catch(e){ c.toast('登入失敗：'+(e.message||e),'bad',3000); }
    auth.onAuthStateChanged(u=>{ let had=false; try{ had=localStorage.getItem(KEY)==='1'; }catch(e){} user=u; owner=isOwner(u); authKnown=true; if(window.__ASSIST) window.__ASSIST.authenticate(u); if(u) localStorage.setItem(KEY,'1');
      else { pulledUid=''; verified=false; if(had&&!loggingOut&&!TEST){ try{ localStorage.removeItem(KEY); }catch(e){} c.toast('⚠️ 雲端登入已失效：進度目前只存在這支裝置，請到設定重新用 Google 登入','warn',6000); } loggingOut=false; } line();
      if(TEST){ showGate(); if(owner){ if(!c.save().testSeeded) copyMain(true); else onLogin().then(()=>{ if(c.grant) c.grant(); }); } }
      else if(u) onLogin().then(r=>{ if(sameUser(u)&&r!=='applied'&&c.assistGrant) c.assistGrant(); });
      c.refresh&&c.refresh(); }); return true; })();
  return inited; }
async function login(){ if(!window.FIREBASE_CFG){ c.toast('Google 登入尚未設定（需要專案擁有者填入 Firebase 設定）','warn',3200); return; }
  if(busy) return; busy=true; try{ await init(); const p=new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({prompt:'select_account'});
    /* 只用彈出視窗登入。以前彈出失敗會改用「整頁跳轉」登入，但遊戲放在 GitHub Pages、登入輔助頁在 firebaseapp.com，
       新版瀏覽器擋第三方儲存空間，跳轉回來讀不到登入結果，就一直要求重新登入（Firebase 官方文件說明的問題，建議改用彈出視窗） */
    try{ await auth.signInWithPopup(p); }catch(e){ const code=e.code||'';
      if(/popup-blocked/.test(code)) c.toast('瀏覽器擋住了登入視窗：請允許這個網站開啟彈出視窗，再按一次登入','warn',5200);
      else if(/popup-closed|cancelled/.test(code)) c.toast('登入視窗被關掉了，再按一次登入就好','warn',3200);
      else throw e; }
  }catch(e){ c.toast('登入失敗：'+(e.message||e),'bad',3200); } busy=false; }
async function logout(){ if(!auth) return; clearTimeout(dirtyT); dirtyT=null; await push(); loggingOut=true; localStorage.removeItem(KEY); await auth.signOut(); c.toast('已登出，本機進度保留','',2000); }
function docRef(){ return db.collection('saves').doc(user.uid); }
/* 比對是不是同一個帳號要比 uid：登入狀態回呼每次給的使用者物件不一定是同一個，直接比物件會誤判成「換人了」而中途放棄上傳 */
const sameUser=u=>!!(user&&u&&user.uid===u.uid);
/* ===== 雲端存檔第二版（2026-11-11 根治「登入了卻沒有真的存到雲端」）=====
   查過 Firestore 官方限制：一份文件最大 1 MiB、最多 40,000 個索引項目，超過就整筆寫入失敗。
   第一版把存檔整個當成「地圖」存進文件，而且正式存檔、被覆蓋前的備份、每日備份、測試副本全部放在同一份文件裡：
   存檔長大以後容易撞到上限，而且寫入失敗只印在主控台，玩家完全不知道，一直以為有存。
   第二版：
   1. 存檔壓縮成一個字串欄位（gzip＋base64，沒有壓縮功能的瀏覽器存純文字）：體積約剩五分之一，索引項目只算一個
   2. 寫新欄位（m2s…），舊版程式碰不到；讀的時候新舊欄位都看，取進度高的
   3. 上傳有逾時、失敗會顯示原因並自動重試；每次開遊戲第一次上傳後會從伺服器讀回來核對
   4. 登入後讀不到雲端就一直重試，讀到之前不上傳（不會用本機蓋掉雲端）
   5. 上傳改成「有變動後最多 6 秒一定送出」；以前是每次存檔都重新倒數，連續存檔時永遠送不出去 */
const P=TEST?'t2':'m2', LIMIT=900000, OKKEY=TEST?'swampAngler.test.cloudOk':'swampAngler.cloudOk';
const CAN_GZ=typeof CompressionStream==='function'&&typeof DecompressionStream==='function';
async function pack(obj){ const js=JSON.stringify(obj);
  if(CAN_GZ){ try{ const u=new Uint8Array(await new Response(new Blob([js]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); let b=''; for(let i=0;i<u.length;i+=0x8000) b+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000)); return 'gz:'+btoa(b); }catch(e){} }
  return 'js:'+js; }
/* 回傳存檔物件；沒有資料回傳 null；有資料卻讀不懂會丟出錯誤（呼叫端要當成「讀取失敗」，不能當成雲端是空的） */
async function unpack(v){ if(v==null||v==='') return null; if(typeof v==='object') return v; if(typeof v!=='string') throw new Error('unreadable');
  if(v.startsWith('js:')) return JSON.parse(v.slice(3));
  if(v.startsWith('gz:')){ if(!CAN_GZ) throw Object.assign(new Error('這個瀏覽器太舊，讀不了雲端存檔，請更新瀏覽器'),{code:'old-browser'});
    const bin=atob(v.slice(3)), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
    return JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text()); }
  throw new Error('unreadable'); }
const withTimeout=(p,ms,what)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(Object.assign(new Error(what+'逾時'),{code:'timeout'})),ms))]);
async function serverDoc(){ const d=await withTimeout(docRef().get({source:'server'}),20000,'讀取雲端'); return d.exists?(d.data()||{}):{}; }
function errText(e){ const code=(e&&e.code)||''; if(/timeout|unavailable|network|offline/.test(code)||/offline|network/i.test((e&&e.message)||'')) return '網路不通或太慢';
  if(/permission-denied/.test(code)) return '雲端拒絕存取（權限）'; if(/resource-exhausted/.test(code)) return '雲端今天的額度用完了'; if(/invalid-argument/.test(code)) return '存檔太大或格式不被接受';
  return (e&&e.message)||String(e); }
/* 同步狀態：設定頁與開始畫面都會顯示，讓玩家確實知道進度有沒有存到雲端 */
const sync={state:'idle',err:'',lv:0,t:0,raw:0,packed:0}; try{ const o=JSON.parse(localStorage.getItem(OKKEY)||'null'); if(o){ sync.lv=o.lv||0; sync.t=o.t||0; } }catch(e){}
function setSync(state,err,lv,t){ sync.state=state; sync.err=err||''; if(state==='ok'){ sync.lv=lv||sync.lv; sync.t=t||Date.now(); try{ localStorage.setItem(OKKEY,JSON.stringify({lv:sync.lv,t:sync.t})); }catch(e){} } line(); c.refresh&&c.refresh(); }
const hm=t=>{ const d=new Date(t), p=n=>String(n).padStart(2,'0'), same=new Date().toDateString()===d.toDateString(); return (same?'':(d.getMonth()+1)+'/'+d.getDate()+' ')+p(d.getHours())+':'+p(d.getMinutes()); };
function detail(){ if(!user) return ''; const kb=n=>Math.max(1,Math.round(n/1024))+' KB';
  if(sync.state==='ok') return `✅ 雲端已存到 Lv ${sync.lv}（${hm(sync.t)}${sync.raw?'，存檔 '+kb(sync.raw)+(sync.packed<sync.raw?'、壓縮後 '+kb(sync.packed):''):''}）`;
  if(sync.state==='pulling') return '正在讀取雲端存檔…';
  if(sync.state==='pending') return `⏳ 還沒同步上去（${sync.err}），會自動重試`+(sync.t?`；上次成功：Lv ${sync.lv}（${hm(sync.t)}）`:'');
  if(sync.state==='error') return `⚠️ ${sync.err}`+(sync.t?`；上次成功：Lv ${sync.lv}（${hm(sync.t)}）`:'');
  return '連線中…'; }
/* 開始畫面上的一行字：有沒有登入、有沒有存到雲端，一開遊戲就看得到 */
let lineEl=null;
function line(){ try{ if(!window.FIREBASE_CFG||TEST) return; const intro=document.getElementById('intro'), sb=document.getElementById('startBtn'); if(!intro||!sb) return;
    if(!lineEl){ lineEl=document.createElement('div'); lineEl.id='cloudLine'; lineEl.style.cssText='margin-top:10px;font-size:13px;line-height:1.5;color:#cfe0ea;opacity:.92'; sb.insertAdjacentElement('afterend',lineEl); }
    const wantAuto=localStorage.getItem(KEY)==='1';
    if(user){ lineEl.style.color=sync.state==='error'?'#ffb4a8':sync.state==='pending'?'#efc04c':'#cfe0ea'; lineEl.textContent='☁️ '+(user.displayName||user.email||'已登入')+'：'+detail(); }
    else if(wantAuto&&!authKnown){ lineEl.style.color='#cfe0ea'; lineEl.textContent='☁️ 雲端連線中…'; }
    else { lineEl.style.color='#efc04c'; lineEl.textContent='⚠️ 還沒登入雲端：進度只存在這支裝置，清除瀏覽紀錄或換手機就會不見。進遊戲後到「設定 → Google 登入」'; } }catch(e){} }
let authKnown=false;
// 文件大小估算：每個欄位佔多少，超過上限前先丟最舊的每日備份
let sizes={};
const flen=v=>v==null?0:typeof v==='string'?v.length:JSON.stringify(v).length;
function measure(D){ sizes={}; for(const k in D) sizes[k]=k.length+flen(D[k]); }
const FV=()=>firebase.firestore.FieldValue;
function fit(upd,D){ const s=Object.assign({},sizes); for(const k in upd) s[k]=k.length+flen(upd[k]); const total=()=>Object.values(s).reduce((a,b)=>a+b,0);
  if(total()<=LIMIT) return; const dk=[]; for(let i=0;i<7;i++){ dk.push([P+'d'+i,(D&&D[P+'d'+i+'_d'])||'']); dk.push(['daily'+i+'_'+FIELD,(D&&D['daily'+i+'_'+FIELD+'_d'])||'']); }
  dk.push(['prev_'+FIELD,''],[P+'p','']); dk.sort((a,b)=>new Date(a[1]||0)-new Date(b[1]||0));
  for(const [k] of dk){ if(total()<=LIMIT) break; if(s[k]){ upd[k]=FV().delete(); if(s[k+'_d']){ upd[k+'_d']=FV().delete(); delete s[k+'_d']; } delete s[k]; } } }
/* 列出這個帳號在雲端的每一份存檔（新舊格式都看）：救回存檔、算雲端最高等級都用它 */
async function copies(D){ const C=[]; const add=async(n,v)=>{ if(v==null) return; try{ const s=await unpack(v); if(s&&typeof s==='object') C.push([n,s]); }catch(e){} };
  await add('雲端存檔',D[P+'s']); await add('雲端存檔（舊格式）',D[FIELD]); await add('雲端備份（被覆蓋前的那份）',D[P+'p']); await add('雲端備份（舊格式）',D['prev_'+FIELD]);
  for(let i=0;i<7;i++){ await add('每日備份（'+(D[P+'d'+i+'_d']||'')+'）',D[P+'d'+i]); await add('每日備份（舊格式 '+(D['daily'+i+'_'+FIELD+'_d']||'')+'）',D['daily'+i+'_'+FIELD]); } return C; }
let pulledUid='', cloudLv=0, refusedToast=false, lastDaily='', verified=false, pushing=null, again=false, retryN=0, retryT=null, pullTry=0, pullT=null, errToast='';
function push(extra){ if(!user||!db||(TEST&&!owner)) return Promise.resolve(); if(pulledUid!==user.uid) return Promise.resolve(); if(window.__SAVE_LOCK) return Promise.resolve();
  if(pushing){ again=true; return pushing; }
  pushing=(async()=>{ try{ await doPush(extra); }finally{ pushing=null; if(again){ again=false; dirty(); } } })(); return pushing; }
async function doPush(extra){ const u=user, cur=c.save(), lv=cur.lv||1;
  if(lv<cloudLv){   /* 以等級判斷：花金幣、賣東西都不會讓等級下降，只有存檔被清掉、換成舊進度時才會 */
    setSync('error',`這支裝置的進度（Lv ${lv}）比雲端（Lv ${cloudLv}）低，沒有上傳、雲端不會被蓋掉。要用雲端進度請按「救回存檔」`);
    if(!refusedToast){ refusedToast=true; c.toast('⚠️ 本機進度比雲端低，不會覆蓋雲端。要用雲端進度請到設定按「救回存檔」','warn',5200); } return; }
  try{ const js=JSON.stringify(cur), packed=await pack(cur), now=Date.now(), today=new Date().toDateString();
    const upd=Object.assign({[P+'s']:packed,[P+'t']:now,[P+'lv']:lv,name:u.displayName||'',v:2},extra||{}); let D=null;
    if(lastDaily!==today){ D=await serverDoc(); measure(D); const k=P+'d'+new Date().getDay();
      // 每天第一次上傳：把雲端原本那份留成每日備份（星期一到星期日各一份，保留 7 天）
      const before=D[P+'s']||(D[FIELD]&&typeof D[FIELD]==='object'?await pack(D[FIELD]):null); if(before&&D[k+'_d']!==today&&!upd[k]){ upd[k]=before; upd[k+'_d']=today; } }
    fit(upd,D);
    await withTimeout(docRef().set(upd,{merge:true}),20000,'上傳'); if(!sameUser(u)) return;
    for(const k in upd){ if(upd[k]&&typeof upd[k]==='object'&&typeof upd[k].isEqual==='function'||upd[k]&&upd[k].__del) delete sizes[k]; else sizes[k]=k.length+flen(upd[k]); }
    lastDaily=today; cloudLv=Math.max(cloudLv,lv); sync.raw=js.length; sync.packed=packed.length;
    if(!verified){   /* 每次開遊戲第一次上傳：從伺服器讀回來核對，確定真的存進去了 */
      const D2=await serverDoc(), back=await unpack(D2[P+'s']); if(!back||(back.lv||1)!==lv||(back.total||0)!==(cur.total||0)) throw Object.assign(new Error('上傳後從雲端讀回來的內容不一致'),{code:'verify'});
      verified=true; measure(D2); cleanLegacy(D2,cur); }
    retryN=0; errToast=''; setSync('ok','',lv,now);
  }catch(e){ console.warn('cloud push',e); if(!sameUser(u)) return; retryN++; const txt=errText(e), soft=/timeout|unavailable/.test((e&&e.code)||'')||txt==='網路不通或太慢';
    setSync(soft?'pending':'error',soft?txt:'雲端存檔失敗：'+txt);
    if(!soft&&errToast!==txt){ errToast=txt; c.toast('⚠️ 雲端存檔失敗：'+txt+'。進度目前只存在這支裝置，會自動重試','bad',5200); }
    clearTimeout(retryT); retryT=setTimeout(()=>{ push(); },Math.min(120000,10000*retryN)); } }
/* 新格式確認寫成功之後，把舊格式（地圖形式）的欄位清掉：它們又佔空間又佔索引項目，是撞到文件上限的主因。
   比目前進度還高的舊備份不刪（可能是還沒救回的進度） */
function cleanLegacy(D,cur){ try{ const del={}, sc=score(cur), old=k=>D[k]&&typeof D[k]==='object'&&score(D[k])<=sc+1;
    if(old(FIELD)){ del[FIELD]=FV().delete(); del[TFIELD]=FV().delete(); } if(old('prev_'+FIELD)){ del['prev_'+FIELD]=FV().delete(); del['prevT_'+FIELD]=FV().delete(); }
    for(let i=0;i<7;i++){ const k='daily'+i+'_'+FIELD; if(old(k)){ del[k]=FV().delete(); del[k+'_d']=FV().delete(); } }
    if(Object.keys(del).length) docRef().set(del,{merge:true}).then(()=>{ for(const k in del) delete sizes[k]; }).catch(()=>{}); }catch(e){} }
// 登入當下：先從伺服器把雲端讀回來比對——雲端沒有存檔就上傳本機；雲端進度較高就載入雲端（本機先備份）；其他情況以本機為準並把雲端原本那份留成備份
/* 同一個帳號同時只讀一次；已經讀回比對過就不再重來（登入狀態回呼可能連續觸發兩次） */
let pullP=null, pullFor='';
function onLogin(){ const u=user; if(!u||!db) return Promise.resolve(); if(pulledUid===u.uid) return Promise.resolve(); if(pullP&&pullFor===u.uid) return pullP;
  pullFor=u.uid; pullP=pullOnce().finally(()=>{ pullP=null; }); return pullP; }
async function pullOnce(){ const u=user; if(!u||!db) return; setSync('pulling'); let D;
  try{ D=await serverDoc(); }
  catch(e){ if(!sameUser(u)) return; pullTry++; const wait=Math.min(60000,[3000,6000,15000,30000][pullTry-1]||60000);
    setSync('error',`讀不到雲端存檔（${errText(e)}），${Math.round(wait/1000)} 秒後自動重試。讀到之前不會上傳，雲端的進度不會被蓋掉`);
    if(pullTry===1) c.toast('雲端存檔暫時讀不到，會自動重試；先用這支裝置上的進度','warn',3600);
    clearTimeout(pullT); pullT=setTimeout(()=>{ if(sameUser(u)&&pulledUid!==u.uid) onLogin().then(r=>{ if(r!=='applied'&&r!=='retry'&&!TEST&&c.assistGrant) c.assistGrant(); }); },wait); return 'retry'; }
  if(!sameUser(u)) return; let main=null;
  try{ main=await unpack(D[P+'s']); }catch(e){ setSync('error',(e&&e.code==='old-browser'?e.message:'雲端存檔讀不出來')+'。為了安全，這支裝置不會上傳'); return 'unreadable'; }
  const legacy=D[FIELD]&&typeof D[FIELD]==='object'?D[FIELD]:null, cloud=score(legacy)>score(main)?legacy:main;   /* 還沒更新的舊版程式存的那份如果比較新，也算數 */
  const all=await copies(D); cloudLv=Math.max(0,...all.map(x=>x[1].lv||0)); measure(D); pullTry=0; pulledUid=u.uid;
  const local=c.save();
  if(!cloud){ await push(); if(!TEST&&sync.state==='ok') c.toast('已把目前的進度存到雲端','good',2400); return; }
  const sl=score(local), sc=score(cloud);
  // 雲端進度較高：直接載入雲端，本機原本的進度先備份
  if(sc>sl+1){ try{ localStorage.setItem(BK,JSON.stringify(local)); }catch(e){}
    c.toast(`已載入雲端存檔（Lv ${cloud.lv||1}），本機原本的進度已備份`,'good',3200); setSync('ok','',cloud.lv||1,D[P+'t']||D[TFIELD]||Date.now()); c.apply(cloud); return 'applied'; }
  // 以本機為準：雲端原本那份（跟本機不一樣時）先留成「被覆蓋前的備份」再上傳
  let extra=null; if(JSON.stringify(cloud)!==JSON.stringify(local)){ try{ extra={[P+'p']:cloud===main&&typeof D[P+'s']==='string'?D[P+'s']:await pack(cloud),[P+'pt']:Date.now()}; }catch(e){} }
  await push(extra); }
// 測試帳號：把正式版進度（本機或雲端，取進度較高的那份）複製過來，金幣維持 999,999
async function copyMain(auto){ if(!TEST||!owner) return; let best=null;
  try{ const l=JSON.parse(localStorage.getItem('swampAngler.v1')||'null'); if(l) best=l; }catch(e){}
  try{ const D=await serverDoc(); for(const v of [D.m2s,D.save]){ let cs=null; try{ cs=await unpack(v); }catch(e){} if(cs&&score(cs)>score(best)) best=cs; } }catch(e){ console.warn('copy main',e); }
  if(!best){ const s=c.save(); s.testSeeded=1; if(auto){ await onLogin(); if(c.grant) c.grant(); } else c.toast('找不到正式版進度','warn',2000); return; }
  const o=JSON.parse(JSON.stringify(best)); o.testSeeded=1; o.coins=Math.max(999999,o.coins||0);
  c.toast(auto?'🧪 測試帳號：已複製正式版進度':'已複製正式版進度','good',1800);
  try{ const D0=await serverDoc(), upd={[P+'s']:await pack(o),[P+'t']:Date.now(),[P+'lv']:o.lv||1}; if(D0[P+'s']){ upd[P+'p']=D0[P+'s']; upd[P+'pt']=Date.now(); }   /* 蓋掉測試存檔前先在雲端留一份（救回存檔找得到） */
    await withTimeout(docRef().set(upd,{merge:true}),20000,'上傳'); }catch(e){ console.warn('copy main write',e); }
  setTimeout(()=>c.apply(o),auto?900:600); }
/* 有變動後最多 6 秒一定送出（節流）。以前是「每次存檔都重新倒數 6 秒」，連續存檔時計時器一直被重設，永遠輪不到上傳 */
function dirty(){ if(!user||(TEST&&!owner)) return; if(dirtyT) return; dirtyT=setTimeout(()=>{ dirtyT=null; push(); },6000); }
// 切到背景、關閉頁面前立刻把進度推上雲端（不等 6 秒），減少「玩了一段卻沒同步到」的情況
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&user){ clearTimeout(dirtyT); dirtyT=null; push(); } });
window.addEventListener('online',()=>{ if(user){ if(pulledUid!==user.uid){ clearTimeout(pullT); onLogin(); } else if(sync.state!=='ok') push(); } });
/* 設定頁的「立即同步」：馬上上傳並從伺服器讀回來核對，換手機、清除瀏覽紀錄之前按一下就能確認 */
async function syncNow(){ if(!user){ c.toast('請先用 Google 登入','warn',2000); return; }
  if(pulledUid!==user.uid){ c.toast('正在讀取雲端存檔…','',1600); clearTimeout(pullT); const r=await onLogin(); if(r==='applied'||r==='retry'||r==='unreadable'){ if(r!=='applied') c.toast(detail(),'warn',4200); return; } }
  verified=false; refusedToast=false; clearTimeout(dirtyT); dirtyT=null; await push();
  c.toast(sync.state==='ok'?`☁️ 已確認存到雲端：Lv ${sync.lv}`:detail(),sync.state==='ok'?'good':'warn',sync.state==='ok'?2600:5200); }
function status(){ if(!window.FIREBASE_CFG) return {state:'nocfg'}; if(!user) return {state:'out'}; return {state:'in',name:(user.displayName||user.email||'')+(TEST?'（測試帳號）':''),owner:isOwner(user),detail:detail(),sync:sync.state}; }
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
/* 之前登入過：自動連上雲端。連不上（沒網路、載入被擋）要講出來並持續重試——以前失敗就靜悄悄地不管，玩家以為有登入其實整段都沒同步 */
let connTry=0;
function autoConnect(){ if(TEST||localStorage.getItem(KEY)!=='1'||!window.FIREBASE_CFG) return;
  init().catch(e=>{ inited=null; connTry++; if(lineEl){ lineEl.style.color='#efc04c'; lineEl.textContent='⚠️ 連不上雲端（網路不通或被擋），進度先存在這支裝置，會自動重試'; }
    if(connTry===1) c.toast('⚠️ 連不上雲端存檔，進度先存在這支裝置，連上後會自動同步','warn',4200); setTimeout(autoConnect,Math.min(60000,5000*connTry)); }); }
line(); autoConnect();
window.addEventListener('beforeunload',()=>{ if(user&&dirtyT){ clearTimeout(dirtyT); dirtyT=null; push(); } });
async function rescue(){ if(!user){ c.toast('請先用 Google 登入','warn',2000); return; } try{ await init(); const D=await serverDoc(); const C=await copies(D);
    try{ const b=JSON.parse(localStorage.getItem(BK)||'null'); if(b) C.push(['本機備份',b]); }catch(e){}
    if(!TEST){ for(const v of [D.t2s,D.test]){ let t=null; try{ t=await unpack(v); }catch(e){} if(!t||typeof t!=='object') continue; t=JSON.parse(JSON.stringify(t)); if(t.testSeeded){ t.coins=Math.min(t.coins||0,(c.save().coins)||0); delete t.testSeeded; } C.push(['測試帳號裡的進度副本（金幣不沿用）',t]); } }
    if(!C.length){ c.toast('這個帳號找不到任何存檔','warn',2400); return; }
    C.sort((a,b)=>score(b[1])-score(a[1])); const [nm,best]=C[0], cur=c.save();
    const info=C.map(([n,s])=>`・${n}：Lv ${s.lv||1}、圖鑑 ${Object.keys(s.dex||{}).length} 種、金幣 ${(s.coins||0).toLocaleString()}`).join('\n');
    if(score(best)<=score(cur)+1){ alert('找到的存檔：\n'+info+'\n\n目前的進度已經是最高的，不需要救回。'); return; }
    if(confirm('找到的存檔：\n'+info+`\n\n要救回進度最高的「${nm}」嗎？目前的進度會先備份。`)){ try{ localStorage.setItem(BK,JSON.stringify(cur)); }catch(e){} c.toast('已救回存檔','good',2400); c.apply(best); } }
  catch(e){ console.warn('rescue',e); c.toast('讀取雲端失敗，請稍後再試','warn',2400); } }
// 一次性補償（只限擁有者）：存檔救不回時，把等級、金幣、劇情進度恢復到遺失前的狀態（圖鑑與魚獲紀錄無法還原）
function compensate(){ if(!isOwner(user)){ c.toast('只有擁有者帳號可以使用','warn',2000); return; }
  /* 2026-11-04 遺失前的狀態（依使用者截圖還原）：Lv 63、金幣 1,377,251、累積 586 尾、主線八章完成、擊敗五隻魚王、標本館八件大型標本 */
  if(!confirm('把存檔恢復成遺失前的狀態：\nLv 63、金幣 1,377,251、主線八章完成、擊敗鱷雀鱔／鯰魚之王／旗魚王／大白鯊女王／滄淵、獨木舟與遊艇、Lv 63 以下的裝備、稱號、標本館八件大型標本。\n（天賦點數全部退回讓你重新分配；圖鑑以 32 種常見魚恢復）\n目前的進度會先備份。確定嗎？')) return;
  const s=JSON.parse(JSON.stringify(c.save())); try{ localStorage.setItem(BK,JSON.stringify(s)); }catch(e){}
  const P=window.__PROPS, SP=(P&&P.SPECIES)||[], G=window.__GEARDEF;
  s.lv=63; s.xp=0; s.coins=Math.max(s.coins||0,1377251); s.total=Math.max(s.total||0,586); s.kayak=true; s.yacht=true; s.tutDone=1; s.loaded=1; s.spot=0;
  s.story=s.story||{}; s.story.intro=1; s.story.done=Array.from(new Set([...(s.story.done||[]),'c1','c2','c3','c4','ice','c5','c6','c7'])); s.story.backfill=1; s.story.seen=s.story.seen||[]; s.story.read=s.story.read||[];
  s.titles=Array.from(new Set([...(s.titles||[]),'見習漁人','湖畔好手','老練漁夫','傳說釣手','守湖宗師','鱷雀鱔獵人','鯰魚王者','怒海旗手','深海霸主','滄淵征服者','守湖人','老漁人的傳人'])); s.titleSel='老漁人的傳人'; s.title='老漁人的傳人';
  s.boss=Object.assign({},s.boss||{},{gar:Math.max(1,(s.boss||{}).gar||0),flat:Math.max(1,(s.boss||{}).flat||0),marlin:Math.max(1,(s.boss||{}).marlin||0),gw:Math.max(1,(s.boss||{}).gw||0),king:Math.max(1,(s.boss||{}).king||0)});
  s.baits=s.baits||{}; s.baits.moon=Math.max(s.baits.moon||0,3);
  // 裝備：Lv 63 以下、不是魚王獎勵的全部擁有，裝上最好的
  if(G){ s.gear=s.gear||{}; s.eq=s.eq||{}; for(const k of ['rod','line','reel']){ const own=[]; let best=0; (G[k]||[]).forEach((x,i)=>{ if(!x.req&&(x.lv||1)<=63){ own.push(i); if((x.lv||1)>=((G[k][best]||{}).lv||1)) best=i; } }); s.gear[k]=Array.from(new Set([...(s.gear[k]||[]),...own])); s.eq[k]=best; } }
  // 圖鑑：等級需求最低的 32 種（遺失前是 32 種）
  s.dex=s.dex||{}; SP.filter(x=>!x.item&&x.loc!=='tide').sort((a,b)=>(a.lv||0)-(b.lv||0)).slice(0,32).forEach(x=>{ s.dex[x.id]=s.dex[x.id]||1; });
  // 標本館的八件大型標本（重量依截圖）
  const big=[['gwhite',1544.6,6.76],['mekong',474.6],['arapaima',260.4],['marlin',265.7],['blackcarp',197.6],['gar',161.7],['shark',143.8],['flathead',83.7]], now=Date.now();
  s.home=s.home||{}; s.home.mounts=s.home.mounts||[]; s.catchLog=s.catchLog||[];
  big.forEach(([id,w,L],k)=>{ const sp=SP.find(x=>x.id===id); if(!sp) return; const len=L||(sp.len?sp.len[1]*.9/100:2); const rec={id,w,L:+len.toFixed(2),d:now-k*1000,t:now-k*1000,z:''}; if(!s.home.mounts.some(m=>m.id===id&&Math.abs(m.w-w)<.1)) s.home.mounts.push(rec); s.catchLog.push(Object.assign({},rec)); s.dex[id]=s.dex[id]||1; });
  s.tal={}; s.testSeeded=1; c.apply(s); setTimeout(push,1500); }
return {compensate,rescue,login,logout,dirty,status,syncNow,isTest:()=>TEST,copyMain:()=>copyMain(false),restoreBackup:()=>{ const b=localStorage.getItem(BK); if(!b){ c.toast('沒有備份','warn',1600); return; } c.apply(JSON.parse(b)); }};
}
/* ===== 安裝到桌面（PWA） ===== */
const PWA=(()=>{ let deferred=null, installed=matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;   /* 安裝設定是全螢幕模式，也要算已安裝 */
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; });
  window.addEventListener('appinstalled',()=>{ installed=true; deferred=null; });
/* 自動偵測新版本：網頁內建這次部署的版本號，定時（開啟時、每 10 分鐘、切回畫面時）比對伺服器上的 version.json；
   有新版就在畫面上方跳出「有新版本」，玩家按下後清掉舊快取並重新載入（存檔在 localStorage，不受影響） */
(()=>{ const APP_VER='__APP_BUILD__'; window.__APP_VER=APP_VER; if(APP_VER.indexOf('APP_BUILD')>=0) return;
  { const tag=document.createElement('div'); tag.id='verTag'; tag.textContent='版本 '+APP_VER.slice(4,8)+'-'+APP_VER.slice(8,12); tag.style.cssText='position:fixed;right:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 6px);z-index:95;font:11px system-ui;color:rgba(255,255,255,.45);pointer-events:none';
    document.body.appendChild(tag); const sb=document.getElementById('startBtn'); if(sb) sb.addEventListener('click',()=>setTimeout(()=>tag.remove(),400)); }   /* 標題畫面右下角顯示版本號：一眼就能確認手機上跑的是不是最新版 */
  const bar=document.createElement('div'); bar.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);z-index:90;display:none;align-items:center;gap:10px;padding:9px 14px;border-radius:999px;background:rgba(20,30,48,.92);border:1px solid rgba(255,214,120,.6);color:#ffe3a3;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.45);font-family:sans-serif';
  bar.innerHTML='<span>🔄 有新版本</span><button style="border:0;border-radius:999px;padding:6px 14px;background:#ffcf66;color:#3a2600;font-weight:700">立即更新</button><button style="border:0;background:none;color:#aab;font-size:16px">✕</button>';
  document.body.appendChild(bar); const [upB,noB]=bar.querySelectorAll('button'); let dismissed='';
  let pendingVersion='';
  async function doUpdate(){if(!pendingVersion)return;upB.textContent='更新中…';upB.disabled=true;
    try{if(window.__DIAG)window.__DIAG.action('navigation','intentional-update',pendingVersion);if(window.__saveNow)window.__saveNow();}catch(e){}
    try{const r=await navigator.serviceWorker.getRegistration();if(r)await r.update();}catch(e){}
    try{localStorage.setItem('swampAngler.updatedTo',pendingVersion);}catch(e){}const u=new URL(location.href);u.searchParams.set('v',pendingVersion);location.replace(u.toString());
  }
  upB.addEventListener('click',doUpdate);noB.addEventListener('click',()=>{bar.style.display='none';dismissed=bar.dataset.v||'';});
  // 版本檢查只提示，不因回家、閒置、拍照切回頁面而中斷遊戲。
  async function check(){try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json();if(j.v&&j.v!==APP_VER&&j.v>APP_VER){pendingVersion=j.v;bar.dataset.v=j.v;if(dismissed!==j.v)bar.style.display='flex';if(window.__DIAG)window.__DIAG.event('update-available',j.v);}}catch(e){}}
  setTimeout(check,1500);setInterval(check,3*60*1000);
  try{ const up=localStorage.getItem('swampAngler.updatedTo'); if(up&&up===APP_VER){ localStorage.removeItem('swampAngler.updatedTo'); setTimeout(()=>{ const t=document.createElement('div'); t.textContent='✅ 已更新到最新版本'; t.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);z-index:90;padding:8px 14px;border-radius:999px;background:rgba(10,30,20,.85);color:#bff5c8;font-size:14px'; document.body.appendChild(t); setTimeout(()=>t.remove(),3000); },2500); } }catch(e){} document.addEventListener('visibilitychange',()=>{ if(!document.hidden) check(); });
})();
  if('serviceWorker' in navigator) window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
  async function install(){ if(installed) return 'installed'; if(deferred){ deferred.prompt(); const r=await deferred.userChoice; deferred=null; return r.outcome; }
    return /iPhone|iPad/.test(navigator.userAgent)?'ios':'manual'; }
  return {install,canPrompt:()=>!!deferred,installed:()=>installed};
})();
