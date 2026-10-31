/* 濕地垂釣 Service Worker（最小版）
   只用來讓遊戲能安裝到桌面；完全不攔截、不快取任何請求。
   （之前由它快取模型貼圖的做法，在部分手機上會讓第二次進入卡在載入畫面，改為交給瀏覽器內建的快取處理） */
const VER='swamp-20261031154327';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ try{ const ks=await caches.keys(); await Promise.all(ks.map(k=>caches.delete(k))); }catch(err){} try{ await self.clients.claim(); }catch(err){} })()); });
