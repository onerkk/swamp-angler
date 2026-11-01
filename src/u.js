/* ===== 診斷：錯誤記錄、效能取樣、一鍵複製給開發者 ===== */
function createDiag(W,c){
'use strict';
const KEY='swampAngler.log',startedAt=new Date();let current=[];let log=[]; try{ log=JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ log=[]; }
let history=log.slice(),lastScene='',previousScene=null;try{previousScene=JSON.parse(localStorage.getItem('swampAngler.scene')||'null');}catch(_){}
function scene(name,phase){const key=name+':'+phase;if(key===lastScene)return;lastScene=key;try{localStorage.setItem('swampAngler.scene',JSON.stringify({scene:name,phase,version:window.__APP_VER||'unknown',at:Date.now()}));}catch(_){}}
function add(kind,msg){ const t=new Date(); const entry=`${t.getMonth()+1}/${t.getDate()} ${t.toTimeString().slice(0,8)} [${kind}] ${String(msg).slice(0,600)}`;current.push(entry);if(current.length>30)current.shift();log.push(entry); if(log.length>30) log=log.slice(-30); try{ localStorage.setItem(KEY,JSON.stringify(log)); }catch(e){} }
window.addEventListener('error',e=>{ if(e.target&&e.target!==window&&(e.target.src||e.target.href)) add('load',e.target.src||e.target.href); else add('error',(e.message||'')+' @'+(e.filename||'').split('/').pop()+':'+(e.lineno||'')); },true);
window.addEventListener('unhandledrejection',e=>add('promise',e.reason&&(e.reason.message||e.reason)));
const ce=console.error.bind(console); console.error=function(){ try{ add('console',[...arguments].map(a=>a&&a.message?a.message:String(a)).join(' ')); }catch(e){} ce(...arguments); };
/* 效能：最近 10 秒的平均與最低幀率 */
const fr=[];
function frame(seconds){const n=performance.now(),dt=seconds*1000;if(dt>0&&dt<2000)fr.push([n,dt]);while(fr.length&&n-fr[0][0]>10000)fr.shift();}
function fps(){if(!fr.length)return{avg:0,min:0,worst:0};let total=0,worst=0;for(const f of fr){total+=f[1];worst=Math.max(worst,f[1]);}return{avg:Math.round(1000*fr.length/total),min:Math.round(1000/worst),worst:Math.round(worst)};}
function gpu(){ try{ const gl=W.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info'); return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER); }catch(e){ return '?'; } }
function report(){ const f=fps(), G=c.G, S=c.save;
  return ['【濕地垂釣 診斷資訊】','程式版本：'+(window.__APP_VER||'未知'),'本次啟動：'+startedAt.toLocaleString('zh-TW'),'時間：'+new Date().toLocaleString('zh-TW'),'裝置：'+navigator.userAgent,'螢幕：'+screen.width+'×'+screen.height+' DPR '+(window.devicePixelRatio||1)+'，畫布解析度 '+(W.getPR?W.getPR():'?'),
    'GPU 資源數量：'+(W.renderer.info?JSON.stringify(W.renderer.info.memory):'未知'),'上次頁面狀態（不代表閃退）：'+(previousScene?JSON.stringify(previousScene):'無紀錄'),'遊戲幀率上限：'+(window.__frameLimit||120)+' FPS（實際遊戲更新取樣）','畫布實際像素：'+(W.renderer.domElement?W.renderer.domElement.width+'×'+W.renderer.domElement.height:'?'),'顯示晶片：'+gpu(),'畫質設定：'+(S.gfx||'auto')+'／實際等級 '+(window.__gfxStatus?window.__gfxStatus.level:'?'),'幀率（近 10 秒）：平均 '+f.avg+'，最低 '+f.min+'，最長幀耗時 '+f.worst+' ms',
    '位置：'+(G.loc||'?')+'／釣點 '+(G.spot)+'／狀態 '+G.state+'／時間 '+(((G.hour%24)+24)%24).toFixed(1)+'／Lv '+S.lv,
    '本次執行錯誤（最近 '+current.length+' 筆）：',...(current.length?current:['（本次沒有記錄到錯誤）']),'歷史錯誤（本次啟動前留存 '+history.length+' 筆）：',...(history.length?history:['（沒有歷史錯誤）'])].join('\n'); }
async function copy(){ const txt=report();
  try{ await navigator.clipboard.writeText(txt); return true; }
  catch(e){ const ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(e2){} ta.remove(); return ok; } }
function clear(){ current=[];history=[];log=[]; try{ localStorage.removeItem(KEY); }catch(e){} }
return {scene,frame,report,copy,clear,add,count:()=>current.length};
}
