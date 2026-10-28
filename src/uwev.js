/* ===== 水下事件鏡頭：拋竿後在水下發生的事，都在畫面左上的小窗用 3D 演出來（不只是文字）
   受驚：餌旁的魚群被落水聲嚇得四散、底泥揚起、冒泡
   掛底：鉛墜和鉤子卡在枯枝／礁石上，線被拉得繃直、抖動；解開時鉤子彈開
   看餌就走：一條魚游近、用鼻子碰一下餌，掉頭離開
   偷餌：小魚把蚯蚓一口一口啄掉，鉤子變空
   勾到東西：鉤上掛著被勾起來的東西（遺物、垃圾），被慢慢拖著走
   ===== */
function createUWEvents(W,c){
'use strict';
const T=THREE, rand=(a,b)=>a+Math.random()*(b-a);
const S=new T.Scene(), cam=new T.PerspectiveCamera(46,4/3,.01,40);
const fogC=new T.Color(0x0d3a3f); S.background=fogC; S.fog=new T.Fog(fogC,1.0,6.0);
S.add(new T.HemisphereLight(0xb8e6ff,0x08201c,1.25)); { const dl=new T.DirectionalLight(0xe6f6ff,.9); dl.position.set(.5,3,1); S.add(dl); }
// 底床：實拍卵石貼圖
const TL=new T.TextureLoader(), bed=(()=>{ const f=k=>{ const t=TL.load('models/home/clean_pebbles_'+k+'.jpg'); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(5,5); if(k==='Diffuse') t.encoding=T.sRGBEncoding; return t; };
  const m=new T.Mesh(new T.PlaneGeometry(14,10).rotateX(-Math.PI/2),new T.MeshStandardMaterial({map:f('Diffuse'),normalMap:f('nor_gl'),roughness:1,color:0x8a8a80})); m.position.y=-.55; S.add(m); return m; })();
// 光束與懸浮微粒
const rays=[]; for(let i=0;i<4;i++){ const m=new T.Mesh(new T.PlaneGeometry(.3,4),new T.MeshBasicMaterial({color:0x9fdcff,transparent:true,opacity:.06,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide})); m.position.set(-2.4+i*1.6,.8,-1.4); m.rotation.z=.3; S.add(m); rays.push(m); }
const PN=180, pg=new T.BufferGeometry(), pp=new Float32Array(PN*3); for(let i=0;i<PN;i++){ pp[i*3]=rand(-3,3); pp[i*3+1]=rand(-.5,1.6); pp[i*3+2]=rand(-2,1); }
pg.setAttribute('position',new T.BufferAttribute(pp,3)); S.add(new T.Points(pg,new T.PointsMaterial({color:0xcfefff,size:.008,transparent:true,opacity:.5,depthWrite:false})));
// 泡泡、底泥
const bub=[]; for(let i=0;i<24;i++){ const b=new T.Mesh(new T.SphereGeometry(.012,8,6),new T.MeshBasicMaterial({color:0xe8f8ff,transparent:true,opacity:.7})); b.visible=false; S.add(b); bub.push({b,v:0}); }
const silt=[]; { const tx=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), r=g.createRadialGradient(16,16,0,16,16,16); r.addColorStop(0,'rgba(120,110,80,.55)'); r.addColorStop(1,'rgba(120,110,80,0)'); g.fillStyle=r; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
  for(let i=0;i<14;i++){ const s=new T.Sprite(new T.SpriteMaterial({map:tx,transparent:true,depthWrite:false,opacity:0})); s.scale.setScalar(.3); S.add(s); silt.push({s,v:new T.Vector3(),a:0}); } }
// 釣組：線、鉛墜、鉤子、蚯蚓
const rig=new T.Group(); S.add(rig);
const lineM=new T.Mesh(new T.CylinderGeometry(.0015,.0015,1,5),new T.MeshBasicMaterial({color:0xdfeef0,transparent:true,opacity:.7})); S.add(lineM);
const sinker=new T.Mesh(new T.SphereGeometry(.018,10,8),new T.MeshStandardMaterial({color:0x6c6f72,metalness:.6,roughness:.4})); sinker.scale.y=1.4; rig.add(sinker);
const hook=new T.Mesh(new T.TorusGeometry(.016,.0025,6,14,Math.PI*1.4),new T.MeshStandardMaterial({color:0xc9ccd0,metalness:.9,roughness:.25})); hook.position.y=-.06; hook.rotation.z=Math.PI*.8; rig.add(hook);
const worm=new T.Group(); rig.add(worm); const wormSegs=[]; { const wm=new T.MeshStandardMaterial({color:0xb4626a,roughness:.55}); for(let i=0;i<7;i++){ const s=new T.Mesh(new T.SphereGeometry(.011,8,6),wm); s.position.set(Math.sin(i*.8)*.012,-.04-i*.014,0); worm.add(s); wormSegs.push(s); } }
// 障礙物：實拍枯枝、礁石
let branch=null, rock=null;
if(T.GLTFLoader){ const L=new T.GLTFLoader(); L.load('dry_branches_medium_01.glb',g=>{ branch=g.scene; branch.scale.setScalar(1.6); branch.visible=false; S.add(branch); });
  L.load('rock_moss_set_01.glb',g=>{ rock=(g.scene.getObjectByName('rock_moss_set_01_rock04')||g.scene).clone(true); rock.position.set(0,0,0); rock.scale.setScalar(.7); rock.visible=false; S.add(rock); }); }
// 演員：魚（真實 3D 模型）、被勾起的東西
let actors=[], item=null;
const frame=document.createElement('div'); frame.id='uwevFrame'; frame.innerHTML='<span>🎥 水下</span><b></b>'; document.body.appendChild(frame);
const st=document.createElement('style'); st.textContent=`#uwevFrame{position:fixed;z-index:5;border:2px solid rgba(160,220,255,.75);border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.45);pointer-events:none;display:none;overflow:hidden}
#uwevFrame span{position:absolute;left:6px;top:4px;font-size:11px;font-weight:800;color:#dff4ff;text-shadow:0 1px 3px #000}
#uwevFrame b{position:absolute;left:0;right:0;bottom:0;padding:4px 6px;font-size:11px;font-weight:700;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.65));text-shadow:0 1px 2px #000}`; document.head.appendChild(st);
let ev=null;
function clearActors(){ actors.forEach(a=>S.remove(a.g)); actors=[]; if(item){ S.remove(item); item=null; } if(branch) branch.visible=false; if(rock) rock.visible=false; }
function mkFish(sp,L){ try{ if(window.__MDL&&window.__MDL.fishReady(sp.id)){ const f=window.__MDL.fish(sp); f.group.scale.setScalar(L); S.add(f.group); return {g:f.group,uni:f.uni}; } }catch(e){} return null; }
function puffSilt(x,z,n){ silt.slice(0,n||10).forEach(p=>{ p.s.position.set(x+rand(-.15,.15),-.5,z+rand(-.15,.15)); p.v.set(rand(-.25,.25),rand(.1,.35),rand(-.15,.15)); p.a=1; p.s.scale.setScalar(rand(.2,.35)); }); }
function bubbles(x,y,z,n){ let k=0; bub.forEach(o=>{ if(k<n&&!o.b.visible){ o.b.visible=true; o.b.position.set(x+rand(-.1,.1),y+rand(-.05,.05),z+rand(-.1,.1)); o.v=rand(.3,.6); k++; } }); }
/* 開始一段演出：kind 見檔頭；opt 帶入魚種、物品、是否在礁岩等 */
function play(kind,opt){ opt=opt||{}; clearActors(); ev={kind,t:0,dur:opt.dur||(kind==='snag'?99:3.2),opt,txt:opt.txt||''};
  worm.visible=kind!=='item'; wormSegs.forEach(s=>s.visible=true); rig.position.set(0,kind==='snag'?-.36:.05,0); rig.rotation.set(0,0,0);
  const spx=c.species();
  if(kind==='spook'){ const pick=()=>{ const sp=c.pick(); return sp&&!sp.special?sp:null; };
    for(let i=0;i<4;i++){ const sp=pick()||spx[0]; const a=mkFish(sp,rand(.18,.32)); if(!a) continue; const ang=rand(0,6.28); a.p=new T.Vector3(Math.cos(ang)*rand(.35,.7),rand(-.2,.25),Math.sin(ang)*rand(.2,.5)); a.h=ang+Math.PI/2; a.v=0; actors.push(a); }
    puffSilt(0,0,8); }
  if(kind==='inspect'||kind==='steal'){ const sp=opt.sp||c.pick(); if(sp){ const a=mkFish(sp,opt.L||rand(.2,.35)); if(a){ a.p=new T.Vector3(-1.6,.0,.25); a.h=0; actors.push(a); } } }
  if(kind==='snag'){ const o=opt.reef?rock:branch; if(o){ o.visible=true; o.position.set(0,-.55,0); o.rotation.set(0,rand(0,6),0); } puffSilt(0,0,6); }
  if(kind==='item'&&opt.obj){ item=opt.obj; item.position.set(0,-.12,0); S.add(item); }
  frame.querySelector('b').textContent=ev.txt; }
function stop(){ ev=null; frame.style.display='none'; clearActors(); }
const vs=new T.Vector2(), up=new T.Vector3(0,1,0), tv=new T.Vector3();
function render(renderer,dt){ if(!ev){ frame.style.display='none'; return; } if(c.blocked&&c.blocked()){ frame.style.display='none'; return; }
  ev.t+=dt; const t=ev.t, k=ev.kind, now=performance.now()*.001;
  // 鉤子、蚯蚓的自然擺動
  rig.rotation.z=Math.sin(now*1.3)*.08; wormSegs.forEach((s,i)=>{ s.position.x=Math.sin(now*4+i*.9)*.012*(1+i*.15); });
  if(k==='spook'){ actors.forEach((a,i)=>{ const away=Math.atan2(a.p.z,a.p.x); if(t<.25){ a.v=.1; } else { a.h+=(away-a.h)*Math.min(1,dt*8); a.v=Math.min(3.2,a.v+dt*9); }
      a.p.x+=Math.cos(a.h)*a.v*dt; a.p.z+=Math.sin(a.h)*a.v*dt*.6; a.p.y+=dt*(i%2?.25:-.1); a.g.position.copy(a.p); a.g.rotation.set(0,-a.h,0); a.uni.uSwim.value+=dt*(6+a.v*10); a.uni.uAmp.value=.05+.07*Math.min(1,a.v); });
    if(t>.25&&t<.35) bubbles(0,0,0,10); }
  if(k==='inspect'||k==='steal'){ const a=actors[0]; if(a){ const tgt=tv.set(-.08,.02,.0); let sp=.6;
      if(k==='inspect'){ if(t<1.4){ a.h=Math.atan2(tgt.z-a.p.z,tgt.x-a.p.x); } else if(t<1.9){ sp=.08; } else { a.h+=(Math.PI-a.h)*Math.min(1,dt*3); sp=1.4; } }
      else { if(t<1.2){ a.h=Math.atan2(tgt.z-a.p.z,tgt.x-a.p.x); } else { sp=.05; const n=Math.min(7,Math.floor((t-1.2)/.35)); wormSegs.forEach((s,i)=>{ s.visible=i>=n; }); if(Math.random()<dt*6) a.p.x+=(Math.random()-.5)*.04; if(n>=7&&t>4.1){ a.h=Math.PI; sp=1.2; } } }
      if(t<1.4||sp>.5){ a.p.x+=Math.cos(a.h)*sp*dt; a.p.z+=Math.sin(a.h)*sp*dt; } a.g.position.copy(a.p); a.g.rotation.set(0,-a.h,0); a.uni.uSwim.value+=dt*(5+sp*8); a.uni.uAmp.value=.04+.04*Math.min(1,sp); } }
  if(k==='snag'){ const sh=ev.opt.free?0:Math.sin(now*30)*.01*(c.tension?c.tension():1); rig.position.x=sh; if(ev.opt.free){ const f=(t-ev.opt.freeAt); rig.position.y=-.36+Math.min(.4,f*1.2); rig.rotation.z=Math.sin(f*20)*.3*(1-Math.min(1,f)); if(f>.05&&f<.12) bubbles(0,-.36,0,6); } }
  if(k==='item'&&item){ item.position.x=Math.sin(now*.7)*.05; item.rotation.y+=dt*.4; item.position.y=-.12+Math.sin(now*1.1)*.02; }
  // 底泥、泡泡
  silt.forEach(p=>{ if(p.a<=0) return; p.a-=dt*.35; p.s.position.addScaledVector(p.v,dt); p.v.multiplyScalar(1-dt*1.2); p.s.material.opacity=Math.max(0,p.a)*.8; p.s.scale.multiplyScalar(1+dt*.4); });
  bub.forEach(o=>{ if(!o.b.visible) return; o.b.position.y+=o.v*dt; o.b.position.x+=Math.sin(now*6+o.v*9)*.002; if(o.b.position.y>1.4) o.b.visible=false; });
  rays.forEach((m,i)=>{ m.material.opacity=.04+.03*Math.sin(now*.8+i); });
  // 線：從上方畫進來接到鉛墜
  { const top=tv.set(rig.position.x+.05,1.6,rig.position.z), bot=new T.Vector3().copy(rig.position).add(sinker.position); const L=top.distanceTo(bot);
    lineM.position.copy(top).add(bot).multiplyScalar(.5); lineM.scale.set(1,L,1); lineM.quaternion.setFromUnitVectors(up,top.clone().sub(bot).normalize()); }
  cam.position.set(.15,.12,1.25); cam.lookAt(0,-.05,0);
  if(t>ev.dur){ stop(); return; }
  renderer.getSize(vs); const w=Math.round(Math.min(vs.x*.46,250)), h=Math.round(w*.72), x=10;
  const hy=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hudY'))||150, top2=hy+52, yb=vs.y-top2-h;
  cam.aspect=w/h; cam.updateProjectionMatrix();
  const ac=renderer.autoClear; renderer.setScissorTest(true); renderer.setScissor(x,yb,w,h); renderer.setViewport(x,yb,w,h); renderer.autoClear=true;
  renderer.render(S,cam); renderer.setScissorTest(false); renderer.setViewport(0,0,vs.x,vs.y); renderer.autoClear=ac;
  Object.assign(frame.style,{display:'block',left:x+'px',top:top2+'px',width:w+'px',height:h+'px'}); }
return {play,stop,render,free:()=>{ if(ev&&ev.kind==='snag'){ ev.opt.free=true; ev.opt.freeAt=ev.t; ev.dur=ev.t+1.3; ev.txt='解開了！'; frame.querySelector('b').textContent='解開了！鉤子彈開'; } },active:()=>!!ev,kind:()=>ev&&ev.kind};
}
