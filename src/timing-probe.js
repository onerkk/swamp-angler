/* 卡頓歸因探針（最先載入）：把 setInterval／setTimeout／requestAnimationFrame 的回呼包一層計時，
   超過 30 毫秒的記到 window.__slowCalls（名稱＝函式名或原始碼開頭），診斷報告的「長任務」就能寫出是哪個計時器或哪一幀造成的。
   只在超時時記一筆，平常只多兩次 performance.now()，不影響效能 */
(function(){
  if(typeof window==='undefined'||window.__slowCalls) return; const slow=window.__slowCalls=[];
  const label=fn=>{ try{ return (fn.name&&fn.name.length>1?fn.name:String(fn).replace(/\s+/g,' ').slice(0,70)); }catch(_){ return '?'; } };
  const wrap=(kind,fn)=>{ if(typeof fn!=='function') return fn; let name=null; return function(){ const n=performance.now(); try{ return fn.apply(this,arguments); } finally{ const ms=performance.now()-n; if(ms>30){ if(name===null) name=kind+' '+label(fn); slow.push({name,ms,at:n}); if(slow.length>80) slow.shift(); } } }; };
  const si=window.setInterval, st=window.setTimeout, raf=window.requestAnimationFrame;
  window.setInterval=function(fn,ms,...a){ return si.call(window,wrap('定時 '+(ms|0)+'ms',fn),ms,...a); };
  window.setTimeout=function(fn,ms,...a){ return st.call(window,wrap('延遲',fn),ms,...a); };
  if(raf) window.requestAnimationFrame=function(fn){ return raf.call(window,wrap('畫面更新',fn)); };
})();
