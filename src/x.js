/* ===== 湖裡還有人等燈：阿蘅（夜裡偶爾出現的驚嚇事件，之後接隱藏章節） ===== */
function createGhost(W,c){
'use strict';
const T=THREE, S=c.save, GL=T.GLTFLoader?new T.GLTFLoader():null;
let model=null, loading=false, mats=[], ev=null, lastTry=0, sessionStart=performance.now();
const ov=document.getElementById('scare'), face=ov&&ov.querySelector('img');
// 條件：第六章（月潮）完成後、夜晚、湖區、沒關閉驚嚇效果、正在閒置或等魚
function eligible(){ if(S.noScare) return false; if(!(S.story&&S.story.done&&S.story.done.includes('c5'))) return false;
  if(c.period()!=='night'||c.loc()!=='lake') return false; const st=c.state(); if(st!=='idle'&&st!=='wait') return false;
  if(performance.now()-sessionStart<5*60*1000) return false;   // 剛開始玩的前 5 分鐘不嚇人
  const g=S.ghost=S.ghost||{}; const day=new Date().toDateString(); if(g.day!==day){ g.day=day; g.n=0; }
  if(g.n>=2) return false; if(g.last&&Date.now()-g.last<40*60*1000) return false; return true; }
function load(fn){ if(model) return fn(model); if(loading||!GL) return; loading=true;
  GL.load('models/ghost.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ mt.emissive=new T.Color(0xbfc8d8); mt.emissiveMap=mt.map; mt.emissiveIntensity=.55; mats.push(mt); } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), s=1.68/Math.max(sz.y,1e-6); o.scale.setScalar(s); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z);
    model=new T.Group(); model.add(o); model.visible=false; W.scene.add(model); loading=false; fn(model); },undefined,()=>{ loading=false; }); }
// 驚嚇流程：0.9 秒從水裡浮出來站在身旁 → 臉部特寫撲上來＋尖叫 1.3 秒 → 消失
function trigger(force){ if(ev) return false; if(!force&&!eligible()) return false;
  load(m=>{ const b=c.base(), h=c.head(), side=Math.random()<.5?-1:1, rt=new T.Vector3(Math.cos(h),0,-Math.sin(h)), fw=new T.Vector3(-Math.sin(h),0,-Math.cos(h));
    const p=new T.Vector3(b.x,0,b.z).addScaledVector(rt,side*1.9).addScaledVector(fw,1.4); m.position.set(p.x,-1.7,p.z);
    m.rotation.y=Math.atan2(b.x-p.x,b.z-p.z); m.visible=true; ev={t:0,side,p}; const g=S.ghost=S.ghost||{}; g.last=Date.now(); g.n=(g.n||0)+1; g.met=(g.met||0)+1; c.persist();
    if(c.onMeet) c.onMeet(g.met); c.drip&&c.drip(); }); return true; }
function update(dt){
  if(!ev){ lastTry+=dt; if(lastTry>1){ lastTry=0; if(eligible()&&Math.random()<1/900) trigger(); } return; }   // 夜裡平均約 15 分鐘一次
  ev.t+=dt; const t=ev.t;
  if(model){ model.position.y=Math.min(0,-1.7+t*2.1); const b=c.base(); model.rotation.y=Math.atan2(b.x-ev.p.x,b.z-ev.p.z)+Math.sin(t*9)*.04; }
  if(t>.9&&!ev.face){ ev.face=true; if(ov){ ov.classList.add('on'); } c.scream&&c.scream(); c.vib&&c.vib([120,40,160,40,320]); c.shake&&c.shake(3.2); }
  if(t>2.3){ if(model) model.visible=false; if(ov) ov.classList.remove('on'); ev=null; }
}
return {update,trigger,active:()=>!!ev};
}
