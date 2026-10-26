/* ===== 診斷：錯誤記錄、效能取樣、一鍵複製給開發者 ===== */
function createDiag(W,c){
'use strict';
const KEY='swampAngler.log'; let log=[]; try{ log=JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ log=[]; }
function add(kind,msg){ const t=new Date(); log.push(`${t.getMonth()+1}/${t.getDate()} ${t.toTimeString().slice(0,8)} [${kind}] ${String(msg).slice(0,300)}`); if(log.length>30) log=log.slice(-30); try{ localStorage.setItem(KEY,JSON.stringify(log)); }catch(e){} }
window.addEventListener('error',e=>{ if(e.target&&e.target!==window&&(e.target.src||e.target.href)) add('load',e.target.src||e.target.href); else add('error',(e.message||'')+' @'+(e.filename||'').split('/').pop()+':'+(e.lineno||'')); },true);
window.addEventListener('unhandledrejection',e=>add('promise',e.reason&&(e.reason.message||e.reason)));
const ce=console.error.bind(console); console.error=function(){ try{ add('console',[...arguments].map(a=>a&&a.message?a.message:String(a)).join(' ')); }catch(e){} ce(...arguments); };
/* 效能：最近 10 秒的平均與最低幀率 */
const fr=[]; let last=performance.now();
function tick(){ const n=performance.now(), dt=n-last; last=n; if(dt>0&&dt<2000){ fr.push([n,1000/dt]); } while(fr.length&&n-fr[0][0]>10000) fr.shift(); requestAnimationFrame(tick); }
requestAnimationFrame(tick);
function fps(){ if(!fr.length) return {avg:0,min:0}; let s=0,mn=999; for(const f of fr){ s+=f[1]; if(f[1]<mn) mn=f[1]; } return {avg:Math.round(s/fr.length),min:Math.round(mn)}; }
function gpu(){ try{ const gl=W.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info'); return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER); }catch(e){ return '?'; } }
function report(){ const f=fps(), G=c.G, S=c.save;
  return ['【濕地垂釣 診斷資訊】','時間：'+new Date().toLocaleString('zh-TW'),'裝置：'+navigator.userAgent,'螢幕：'+screen.width+'×'+screen.height+' DPR '+(window.devicePixelRatio||1)+'，畫布解析度 '+(W.getPR?W.getPR():'?'),
    '顯示晶片：'+gpu(),'畫質設定：'+(S.gfx||'high'),'幀率（近 10 秒）：平均 '+f.avg+'，最低 '+f.min,
    '位置：'+(G.loc||'?')+'／釣點 '+(G.spot)+'／狀態 '+G.state+'／時間 '+(((G.hour%24)+24)%24).toFixed(1)+'／Lv '+S.lv,
    '錯誤記錄（最近 '+log.length+' 筆）：',...(log.length?log:['（沒有錯誤）'])].join('\n'); }
async function copy(){ const txt=report();
  try{ await navigator.clipboard.writeText(txt); return true; }
  catch(e){ const ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(e2){} ta.remove(); return ok; } }
function clear(){ log=[]; try{ localStorage.removeItem(KEY); }catch(e){} }
return {report,copy,clear,add,count:()=>log.length};
}
