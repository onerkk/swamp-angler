/* 濕地垂釣 Service Worker（簡化穩定版）
   ・index.html 永遠先抓網路（確保拿到最新版）
   ・模型、貼圖、音效：有快取就直接用，沒有才下載並存起來
   ・每次部署會產生 assets.json（每個檔案的指紋）；新版啟用時只刪掉「指紋變了」的檔案，其他都保留，不必整個重下
   ・任何快取動作失敗都不會影響載入（最多就是重新下載那個檔案） */
const VER='swamp-20261028134525';
const ASSET='swamp-assets-v2';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{
  try{ const ks=await caches.keys(); await Promise.all(ks.filter(k=>k!==VER&&k!==ASSET).map(k=>caches.delete(k))); }catch(err){}
  try{ const cache=await caches.open(ASSET); const r=await fetch('assets.json',{cache:'no-store'}); if(r.ok){ const now=await r.json(); const oldR=await cache.match('/__manifest'); const old=oldR?await oldR.json():{};
      const base=self.registration.scope; await Promise.all(Object.keys(old).filter(p=>old[p]!==now[p]).map(p=>cache.delete(new URL(p,base).href)));
      await cache.put('/__manifest',new Response(JSON.stringify(now),{headers:{'content-type':'application/json'}})); } }catch(err){}
  try{ await self.clients.claim(); }catch(err){} })()); });
self.addEventListener('fetch',e=>{ const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
  const isPage=u.pathname.endsWith('/')||u.pathname.endsWith('index.html');
  if(isPage){ e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request))); return; }
  if(!/\.(glb|jpg|jpeg|png|webp|hdr|mp3)$/.test(u.pathname)||e.request.headers.has('range')) return;
  e.respondWith((async()=>{ let cache=null, hit=null; try{ cache=await caches.open(ASSET); hit=await cache.match(e.request); }catch(err){}
    if(hit) return hit;
    const r=await fetch(e.request); if(r.ok&&cache){ cache.put(e.request,r.clone()).catch(()=>{}); } return r; })()); });
