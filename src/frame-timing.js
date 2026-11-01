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
 return{step,limit:1000/interval};
}
if(typeof module!=='undefined'&&module.exports)module.exports={GAME_FPS_LIMIT,createFrameLimiter};
