/* Cap game updates, not browser callback reporting. Preserve phase at 120 Hz. */
const GAME_FPS_LIMIT=120;
function createFrameLimiter(limit=GAME_FPS_LIMIT,start=0){
 const interval=1000/Math.max(1,Math.min(GAME_FPS_LIMIT,Number(limit)||GAME_FPS_LIMIT));let tickAt=start,renderedAt=start,budget=0;
 function step(now){
  if(!Number.isFinite(now)||now<tickAt)return null;const gap=now-tickAt;budget+=gap;tickAt=now;
  // RAF timestamps jitter around the refresh boundary; retain small timing debt.
  if(budget+.5<interval)return null;budget=gap>interval*2?0:budget-interval;if(budget>=interval)budget%=interval;
  const seconds=(now-renderedAt)/1000;renderedAt=now;return seconds;
 }
 return{step,reset(now){tickAt=renderedAt=now;budget=0;},limit:1000/interval};
}
if(typeof module!=='undefined'&&module.exports)module.exports={GAME_FPS_LIMIT,createFrameLimiter};

/* Count completed game frames, update text twice per second, and never intercept input. */
function createFPSDisplay(doc=document,enabled=true){
 const el=doc.createElement('div');el.id='fpsDisplay';el.setAttribute('data-screenshot-ignore','');el.setAttribute('aria-label','遊戲 FPS');el.style.cssText='position:fixed;left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:155;pointer-events:none;padding:4px 8px;border-radius:8px;background:rgba(0,0,0,.65);color:#b6f5cc;font:600 12px monospace;font-variant-numeric:tabular-nums';el.textContent='FPS —';el.hidden=!enabled;doc.body.appendChild(el);
 let elapsed=0,frames=0,worst=0,visible=enabled;
 function reset(){elapsed=frames=worst=0;el.textContent='FPS —';}
 return{frame(seconds){if(!visible||!Number.isFinite(seconds)||seconds<=0)return;elapsed+=seconds;frames++;worst=Math.max(worst,seconds);if(elapsed>=.5){el.textContent='FPS '+Math.round(frames/elapsed)+' · '+Math.round(worst*1000)+' ms';elapsed=frames=worst=0;}},reset,setEnabled(on){visible=!!on;el.hidden=!visible;reset();}};
}
if(typeof module!=='undefined'&&module.exports)module.exports.createFPSDisplay=createFPSDisplay;
