/* Raw RAF timing, independent of the simulation's capped timestep. */
function graphicsProfiles(cap){
 const scales=[.3,.4,.5,.62,.75,.88,1,1],effects=['low','low','mid','mid','high','high','high','high'],shadows=['low','low','mid','mid','auto','high','high','high'],refl=[0,0,.22,.32,.5,.65,.85,1],water=[.45,.5,.6,.7,.8,.9,1,1];
 return scales.map((k,i)=>({level:i,name:['極省效能','省效能','流暢','均衡','細緻','高','極高','最高'][i],effect:effects[i],shadow:shadows[i],pr:Math.max(Math.min(.55,cap),cap*k),reflection:refl[i],water:water[i]}));
}
function createAdaptiveGraphics({cap,apply,onSample=()=>{}}){
 let mode='auto',level=4,scope='',elapsed=0,frames=0,slow=0,warm=3,cool=0,fast=0,bad=0,clock=0,blocked=-1,blockedUntil=0,probe=null,fps=0,reason='初始化';
 const reset=()=>{elapsed=0;frames=0;slow=0;fast=0;bad=0;};
 function status(){return{mode,level,maxLevel:7,fps,reason,...graphicsProfiles(cap())[level]};}
 function commit(next,why){level=Math.max(0,Math.min(7,next));reason=why;apply(status());reset();cool=4;}
 function configure(next){mode=['auto','high','mid','low'].includes(next)?next:'auto';probe=null;blocked=-1;warm=3;reset();level=mode==='auto'?4:mode==='high'?7:mode==='mid'?3:0;commit(level,mode==='auto'?'開始自動調整':'固定畫質');}
 function pause(){reset();warm=3;probe=null;}
 function sample(seconds,{ready=true,scene='',enabled=true}={}){
  if(!ready||!enabled||!Number.isFinite(seconds)||seconds<=0){pause();return;}
  if(scene!==scope){scope=scene;pause();blocked=-1;}
  clock+=seconds;cool=Math.max(0,cool-seconds);
  if(warm>0){warm-=seconds;return;}
  elapsed+=seconds;frames++;if(seconds>1/45)slow++;
  if(elapsed<2)return;
  fps=frames/elapsed;const jank=slow/frames;elapsed=0;frames=0;slow=0;onSample(status());
  if(mode!=='auto')return;
  if(fps<24){if(level===0){reason='已達最低畫質';return;}if(probe!==null){blocked=level;blockedUntil=clock+45;probe=null;}commit(level-2,'幀率過低，立即降低負載');return;}
  if(cool>0)return;
  if(fps<50||jank>.28||(probe!==null&&fps<56)){if(level===0){bad=0;reason='已達最低畫質';return;}bad++;fast=0;if(bad>=2){if(probe!==null){blocked=level;blockedUntil=clock+45;const previous=probe;probe=null;commit(Math.min(level-1,previous),'升級後變慢，退回穩定畫質');}else commit(level-1,'持續掉幀，降低畫質');}return;}
  bad=0;
  // 60 Hz displays cannot report >60: sustained near-60 frames permit a guarded probe.
  if(fps>=58&&jank<.08){fast++;const stable=fps>60.5?3:4;if(fast>=stable&&level<7&&(level+1!==blocked||clock>=blockedUntil)){probe=level;commit(level+1,'幀率穩定，提升畫質');}}
  else fast=0;
 }
 return{configure,sample,pause,status,refresh:()=>apply(status())};
}
function graphicsStatusText(s){return `${s.mode==='auto'?'自動':'固定'}畫質：${s.name}（${s.level+1}/${s.maxLevel+1}）・${s.pr.toFixed(2)} 倍解析度・${Math.round(s.fps||0)} FPS`;}
if(typeof module!=='undefined'&&module.exports)module.exports={graphicsProfiles,createAdaptiveGraphics,graphicsStatusText};
