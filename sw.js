/* 濕地垂釣 Service Worker（最小版）
   只用來讓遊戲能安裝到桌面：只處理「打開頁面」這一種請求（照常向網路要，斷線時給一頁離線說明），
   模型、貼圖、程式一律不攔截、不快取。Chrome 規定要有實際作用的 fetch 處理，才會跳出「安裝」提示（空的處理會被忽略）。
   （之前由它快取模型貼圖的做法，在部分手機上會讓第二次進入卡在載入畫面，改為交給瀏覽器內建的快取處理） */
const VER='swamp-20261113215606';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ try{ const ks=await caches.keys(); await Promise.all(ks.map(k=>caches.delete(k))); }catch(err){} try{ await self.clients.claim(); }catch(err){} })()); });
self.addEventListener('fetch',e=>{ if(e.request.mode!=='navigate') return;
  e.respondWith(fetch(e.request).catch(()=>new Response('<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><body style="background:#0a1f2e;color:#e8eef2;font-family:sans-serif;text-align:center;padding-top:30vh"><h2>濕地垂釣</h2><p>目前沒有網路連線，連上網路後再打開。</p>',{headers:{'Content-Type':'text/html; charset=utf-8'}}))); });
