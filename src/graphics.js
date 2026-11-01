/* Recover a legacy fixed-high setting once on high-DPR touch devices. */
function recoverMobileGraphics(save,touch,dpr){if(!touch||dpr<2.5||save.gfx!=='high'||save.gfxRecoveryVersion)return false;save.gfx='auto';save.gfxRecoveryVersion=1;return true;}
/* Raw RAF timing, independent of the simulation's capped timestep. */
function graphicsProfiles(cap){
 const scales=[.3,.4,.5,.62,.75,.88,1,1],effects=['low','low','mid','mid','high','high','high','high'],shadows=['low','low','mid','mid','auto','high','high','ultra'],refl=[0,0,.22,.32,.5,.65,.85,1],water=[.45,.5,.6,.7,.8,.9,1,1];
 return scales.map((k,i)=>({level:i,name:['極省效能','省效能','流暢','均衡','細緻','高','極高','最高'][i],effect:effects[i],shadow:shadows[i],pr:Math.max(Math.min(.55,cap),cap*k),reflection:refl[i],water:water[i],geometry:i<2?'low':i<4?'mid':i<6?'high':'ultra'}));
}
function createAdaptiveGraphics({cap,apply,onSample=()=>{},profile=null}){
 const sceneLevels=new Map();let emergencyTime=0,emergencyFrames=0;
 let mode='auto',level=4,scope='',elapsed=0,frames=0,slow=0,warm=3,cool=0,fast=0,bad=0,clock=0,blocked=-1,blockedUntil=0,probe=null,fps=0,reason='初始化';
 const reset=()=>{elapsed=0;frames=0;slow=0;fast=0;bad=0;};
 function status(){const s={mode,level,maxLevel:7,fps,reason,...graphicsProfiles(cap())[level]};return profile?profile(s,scope,cap()):s;}
 function commit(next,why){level=Math.max(0,Math.min(7,next));if(scope)sceneLevels.set(scope,level);emergencyTime=emergencyFrames=0;reason=why;apply(status());reset();cool=4;}
 function configure(next){sceneLevels.clear();emergencyTime=emergencyFrames=0;mode=['auto','high','mid','low'].includes(next)?next:'auto';probe=null;blocked=-1;warm=3;reset();level=mode==='auto'?4:mode==='high'?7:mode==='mid'?3:0;commit(level,mode==='auto'?'開始自動調整':'固定畫質');}
 function pause(){reset();warm=3;probe=null;emergencyTime=emergencyFrames=0;}
 function sample(seconds,{ready=true,scene='',enabled=true}={}){
  if(!ready||!enabled||!Number.isFinite(seconds)||seconds<=0){pause();return;}
  if(scene!==scope){const previousLevel=level;if(scope)sceneLevels.set(scope,level);scope=scene;pause();blocked=-1;if(mode==='auto')level=sceneLevels.has(scope)?sceneLevels.get(scope):(scope==='home-aquarium'?6:4);if(profile||previousLevel!==level)apply(status());}
  clock+=seconds;cool=Math.max(0,cool-seconds);
  if(mode==='auto'){if(seconds>1/30){emergencyTime+=seconds;emergencyFrames++;}else{emergencyTime=emergencyFrames=0;}if(emergencyTime>=.8&&emergencyFrames>=8){const severe=emergencyFrames/emergencyTime<22;emergencyTime=emergencyFrames=0;if(severe&&level>0){commit(level-2,'嚴重掉幀，快速降低負載');warm=.5;return;}}}
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
function graphicsStatusText(s){const a=typeof window!=='undefined'?window.__materialLightingAudit:null;return `${s.mode==='auto'?'自動':'固定'}畫質：${s.name}（${s.level+1}/${s.maxLevel+1}）・${s.pr.toFixed(2)} 倍解析度・${Math.round(s.fps||0)} FPS・上限 120`+(a?`・受光材質 ${a.lit}／法線 ${a.normalMapped}／凹凸 ${a.bumpMapped}`:'');}
if(typeof module!=='undefined'&&module.exports)module.exports={recoverMobileGraphics,graphicsProfiles,createAdaptiveGraphics,graphicsStatusText};

function waterDetailSettings(quality){return{low:[64,128],mid:[112,192],high:[160,256],ultra:[224,320]}[quality]||[112,192];}
function tuneTextureSampling(T,texture,maxAnisotropy,atlas=false){
 if(!texture||texture.isRenderTargetTexture)return;
 const image=texture.image,w=image&&(image.width||image.videoWidth),h=image&&(image.height||image.videoHeight),pot=n=>n>0&&(n&(n-1))===0;
 const anisotropy=Math.min(16,maxAnisotropy||1);let changed=texture.anisotropy!==anisotropy;texture.anisotropy=anisotropy;
 if(!atlas&&!texture.isCompressedTexture&&pot(w)&&pot(h)){changed=changed||texture.minFilter!==T.LinearMipmapLinearFilter||!texture.generateMipmaps;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;}
 if(changed)texture.needsUpdate=true;
}
if(typeof module!=='undefined'&&module.exports)Object.assign(module.exports,{waterDetailSettings,tuneTextureSampling});
