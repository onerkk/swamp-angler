/* 濕地垂釣 Service Worker：index.html 永遠先抓網路（確保更新）；模型、貼圖、音效放在「資產快取」——
   每次更新遊戲不再整批刪掉重下（原本每次部署都要重新下載 80MB 以上，載入卡住），
   而是先用快取立刻顯示，同時在背景跟伺服器比對，有換過的檔案才重新下載 */
const VER='swamp-20261028131518';
const ASSET='swamp-assets-v1';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER&&k!==ASSET).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
const seen=new Set();
self.addEventListener('fetch',e=>{ const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
  const isPage=u.pathname.endsWith('/')||u.pathname.endsWith('index.html');
  if(isPage){ e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{ const c=r.clone(); caches.open(VER).then(x=>x.put(e.request,c)); return r; }).catch(()=>caches.match(e.request))); return; }
  if(!/\.(glb|jpg|jpeg|png|webp|hdr|mp3|webmanifest)$/.test(u.pathname)) return;
  e.respondWith(caches.open(ASSET).then(cache=>cache.match(e.request).then(hit=>{
    const net=()=>fetch(e.request,{cache:'no-cache'}).then(r=>{ if(r.ok) cache.put(e.request,r.clone()); return r; });
    if(hit){ if(!seen.has(u.pathname)){ seen.add(u.pathname); e.waitUntil(net().catch(()=>{})); } return hit; }   // 有快取：立刻用，背景比對更新
    return net(); }))); });
