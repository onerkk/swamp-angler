/* 濕地垂釣：釣魚抽蝦皮折扣碼（伺服器）
   ・中不中獎由這台伺服器擲骰子決定，遊戲傳來的「我中了」一律不採信；折扣碼只存在環境變數 PROMO_CODES，不在任何程式碼或倉庫裡
   ・玩家身分：Firebase（Google 登入）的 ID token，伺服器驗證後才算數
   ・防刷：每個帳號最多中一次；兩次抽獎至少間隔 MIN_GAP 秒；每天最多 DAY_ROLLS 次；高等級魚（機率 ≥0.1%）每天最多 DAY_RARE 次
   環境變數：FIREBASE_SA（服務帳戶 JSON 全文）、PROMO_CODES（逗號分隔）、PROMO_END（ISO 時間，預設 2026-12-31T23:59:59+08:00）、ALLOW_ORIGIN */
const http=require('http'), admin=require('firebase-admin');
const {rollChance}=require('./chance');
const SA=JSON.parse(process.env.FIREBASE_SA||'{}');
admin.initializeApp(SA.project_id?{credential:admin.credential.cert(SA)}:{});
const db=admin.firestore();
const CODES=(process.env.PROMO_CODES||'').split(',').map(s=>s.trim()).filter(Boolean);
const END=Date.parse(process.env.PROMO_END||'2026-12-31T23:59:59+08:00');
const ORIGIN=process.env.ALLOW_ORIGIN||'https://onerkk.github.io';
const MIN_GAP=12, DAY_ROLLS=300, DAY_RARE=6;
const STATE=db.doc('promo/state');
const day=()=>new Date(Date.now()+8*3600e3).toISOString().slice(0,10);   // 台灣日期
const mask=n=>{ n=String(n||'釣客').trim(); const a=[...n]; return a.length<=1?a[0]+'＊':a.length===2?a[0]+'＊':a.slice(0,2).join('')+'＊'.repeat(Math.min(3,a.length-2)); };
function send(res,code,obj){ res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Cache-Control':'no-store'}); res.end(JSON.stringify(obj)); }
async function user(req){ const h=req.headers.authorization||''; const m=h.match(/^Bearer (.+)$/); if(!m) return null; try{ return await admin.auth().verifyIdToken(m[1]); }catch(e){ return null; } }
async function body(req){ let s=''; for await(const c of req){ s+=c; if(s.length>2000) break; } try{ return JSON.parse(s||'{}'); }catch(e){ return {}; } }
async function status(){ const st=(await STATE.get()).data()||{}; const used=st.used||[]; return {open:Date.now()<END&&used.length<CODES.length, remaining:Math.max(0,CODES.length-used.length), total:CODES.length, ends:new Date(END).toISOString(), winners:(st.winners||[]).map(w=>({name:w.name,fish:w.fish,at:w.at}))}; }
async function roll(u,b){
  if(Date.now()>=END) return {ok:false,why:'活動已結束'};
  const tier=Math.max(0,Math.min(5,Math.floor(+b.tier||0))), fish=String(b.fish||'').slice(0,20), p=rollChance(tier);
  const uref=db.doc('promoUsers/'+u.uid);
  return db.runTransaction(async tx=>{
    const [us,ss]=await Promise.all([tx.get(uref),tx.get(STATE)]); const ud=us.data()||{}, st=ss.data()||{}, used=st.used||[], now=Date.now(), d=day();
    if(ud.code) return {ok:true,win:false,already:true,code:ud.code};
    if(used.length>=CODES.length) return {ok:false,why:'折扣碼已全部送出'};
    if(ud.last&&now-ud.last<MIN_GAP*1000) return {ok:true,win:false,throttled:true};
    const cnt=ud.day===d?ud.n||0:0, rare=ud.day===d?ud.r||0:0;
    if(cnt>=DAY_ROLLS) return {ok:true,win:false,capped:true};
    const isRare=p>=.001; if(isRare&&rare>=DAY_RARE) return {ok:true,win:false,capped:true};
    const win=Math.random()<p; const upd={last:now,day:d,n:cnt+1,r:rare+(isRare?1:0)};
    if(win){ const idx=CODES.findIndex((c,i)=>!used.includes(i)); if(idx<0) return {ok:false,why:'折扣碼已全部送出'};
      const name=mask(u.name||(u.email||'').split('@')[0]); upd.code=CODES[idx]; upd.wonAt=now; upd.fish=fish;
      tx.set(STATE,{used:[...used,idx],winners:[...(st.winners||[]),{name,fish,at:now}]},{merge:true}); tx.set(uref,upd,{merge:true});
      return {ok:true,win:true,code:CODES[idx],name}; }
    tx.set(uref,upd,{merge:true}); return {ok:true,win:false}; }); }
http.createServer(async(req,res)=>{ try{
  if(req.method==='OPTIONS') return send(res,204,{});
  const url=new URL(req.url,'http://x');
  if(url.pathname==='/status') return send(res,200,await status());
  if(url.pathname==='/mine'){ const u=await user(req); if(!u) return send(res,401,{ok:false,why:'請先登入'}); const d=(await db.doc('promoUsers/'+u.uid).get()).data()||{}; return send(res,200,{ok:true,code:d.code||null,fish:d.fish||null}); }
  if(url.pathname==='/roll'&&req.method==='POST'){ const u=await user(req); if(!u) return send(res,401,{ok:false,why:'請先登入'}); return send(res,200,await roll(u,await body(req))); }
  if(url.pathname==='/') return send(res,200,{ok:true,service:'swamp-angler-promo'});
  send(res,404,{ok:false}); }catch(e){ console.error(e); send(res,500,{ok:false,why:'伺服器忙碌，請稍後再試'}); } }).listen(process.env.PORT||3000,()=>console.log('promo up, codes:',CODES.length));
