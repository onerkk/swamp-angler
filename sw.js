/* 濕地垂釣 Service Worker：讓遊戲能安裝到桌面；index.html 永遠先抓網路（確保更新），模型與貼圖抓過一次就快取 */
// 版本號由組裝步驟自動換成這次部署的時間；版本一變，舊快取（模型、貼圖）整批刪除，換過的模型才會重新下載
const VER='swamp-20261027090147';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
  const isPage=u.pathname.endsWith('/')||u.pathname.endsWith('index.html');
  if(isPage){ e.respondWith(fetch(e.request).then(r=>{ const c=r.clone(); caches.open(VER).then(x=>x.put(e.request,c)); return r; }).catch(()=>caches.match(e.request))); return; }
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{ if(r.ok&&/\.(glb|jpg|jpeg|png|webp|webmanifest)$/.test(u.pathname)){ const c=r.clone(); caches.open(VER).then(x=>x.put(e.request,c)); } return r; }))); });
