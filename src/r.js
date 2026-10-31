/* ===== 路亞：收線速度、抽竿、魚的興趣（假餌模型：Zverev、xeofox，CC-BY） ===== */
const LURE_CFG={
 crank:{file:'lure_crank',head:'+x',len:.11,drop:['Material__73'],band:[1.0,2.0],twitch:.03,pause:0,dive:1.4,float:true,tip:'曲柄：快速穩定收線，會往下潛'},
 spoon:{file:'lure_spoon',head:'+y',len:.09,pick:1,split:'x',band:[.45,1.7],twitch:.04,pause:0,dive:.5,sink:true,tip:'亮片：中速穩定收線，閃光吸引魚'},
 minnow:{file:'lure_minnow',head:'-z',len:.12,pick:1,split:'y',band:[.25,1.0],twitch:.18,pause:.1,dive:.6,float:true,tip:'米諾：抽一下、停一下，模仿受傷的小魚'}};
function createLure(W,P,c){
'use strict';
const T=THREE, S=W.scene, G=c.G, ang=a=>({'+x':0,'-z':Math.PI/2,'-x':Math.PI,'+z':-Math.PI/2})[a];
const models={}, holder=new T.Group(); holder.visible=false; S.add(holder);
const loader=T.GLTFLoader?new T.GLTFLoader():null;
/* 頂點資料若是交錯排列（模型工具常用），先轉成分開排列，切割與複製才不會讀錯位 */
function plainGeo(g){ const out=new T.BufferGeometry(); if(g.index) out.setIndex(g.index.clone());
  for(const name in g.attributes){ const a=g.attributes[name], n=a.count, it=a.itemSize, arr=new Float32Array(n*it);
    for(let i=0;i<n;i++){ arr[i*it]=a.getX(i); if(it>1) arr[i*it+1]=a.getY(i); if(it>2) arr[i*it+2]=a.getZ(i); if(it>3) arr[i*it+3]=a.getW(i); }
    out.setAttribute(name,new T.BufferAttribute(arr,it)); }
  out.groups=g.groups.slice(); return out; }
function getModel(k){ if(models[k]!==undefined) return models[k]; models[k]=null; const cf=LURE_CFG[k]; if(!loader) return null;
  loader.load('models/'+cf.file+'.glb',g=>{ try{ g.scene.updateMatrixWorld(true); let ms=[]; g.scene.traverse(o=>{ if(o.isMesh) ms.push(o); });
    /* 模型附帶的釣線（曲柄有一條比餌身還長的線）：拿掉，不然尺寸與朝向會把線算進去，餌身被縮成一小點；遊戲本身會畫釣線 */
    if(cf.drop) ms=ms.filter(m=>!cf.drop.includes(m.material&&m.material.name));
    if(cf.pick!==undefined&&ms.length>=3){ const ctr=m=>new T.Box3().setFromObject(m).getCenter(new T.Vector3()); ms.sort((a,b)=>ctr(a).length()-ctr(b).length()); ms=[ms[0]]; }
    /* 3 個假餌合併在同一個網格裡（米諾上下疊、亮片左右排）：只保留位在中間三分之一的三角面 */
    if(cf.split){ const ax=cf.split, B=new T.Box3(); ms.forEach(m=>B.expandByObject(m)); const lo=B.min[ax]+(B.max[ax]-B.min[ax])/3, hi=B.min[ax]+(B.max[ax]-B.min[ax])*2/3;
      ms=ms.map(m=>{ const gp=plainGeo(m.geometry), g0=gp.index?gp.toNonIndexed():gp; g0.applyMatrix4(m.matrixWorld); const P=g0.attributes.position, keep=[];
        for(let i=0;i<P.count;i+=3){ const gf=ax==='x'?'getX':ax==='y'?'getY':'getZ', cc=(P[gf](i)+P[gf](i+1)+P[gf](i+2))/3; if(cc>=lo&&cc<=hi) keep.push(i); }
        const ng=new T.BufferGeometry(); for(const name in g0.attributes){ const a=g0.attributes[name], it=a.itemSize, arr=new a.array.constructor(keep.length*3*it); keep.forEach((v,j)=>{ for(let q=0;q<3*it;q++) arr[j*3*it+q]=a.array[v*it+q]; }); ng.setAttribute(name,new T.BufferAttribute(arr,it,a.normalized)); }
        const nm=new T.Mesh(ng,m.material); nm.updateMatrixWorld(true); return nm; }).filter(m=>m.geometry.attributes.position.count>0); }
    const grp=new T.Group(); ms.forEach(m=>{ const k2=m.clone(); k2.matrixAutoUpdate=false; k2.matrix.copy(m.matrixWorld); grp.add(k2); });
    const inner=new T.Group(); inner.add(grp);
    if(cf.head==='+y') inner.rotation.x=Math.PI/2; else inner.rotation.y=ang('+z')-ang(cf.head);   // 頭朝 +Z
    const w=new T.Group(); w.add(inner); w.updateMatrixWorld(true);
    const b=new T.Box3().setFromObject(w), sz=b.getSize(new T.Vector3()), s=cf.len/Math.max(sz.z,1e-6); inner.scale.setScalar(s); w.updateMatrixWorld(true);
    const c2=new T.Box3().setFromObject(w).getCenter(new T.Vector3()); inner.position.sub(c2);
    w.traverse(o=>{ o.frustumCulled=false; }); if(window.__seeThrough) window.__seeThrough(w); models[k]=w; if(cur&&cur.k===k) show(k); }catch(e){ console.error('lure model '+k+': '+e.message); } },undefined,e=>console.error('lure load '+k));
  return null; }
let cur=null, chaser=null; const pos=new T.Vector3(), dir=new T.Vector3(), tmp=new T.Vector3();
function hideChaser(){ if(chaser){ chaser.group.visible=false; chaser=null; } }
function show(k){ holder.clear(); const m=models[k]; if(m) holder.add(m); }
/* 介面 */
const st=document.createElement('style'); st.textContent=`#lureHud{position:fixed;left:12px;top:calc(var(--hudY,150px) + 54px);z-index:5;width:min(190px,48vw);padding:6px 10px;border-radius:12px;background:rgba(16,22,28,.7);border:1px solid rgba(255,255,255,.16);color:#eaf2f8;font-size:11px;pointer-events:none}
#lureHud.hidden{display:none}#lureHud .bar{position:relative;height:8px;border-radius:4px;background:rgba(255,255,255,.12);margin:6px 0 4px;overflow:hidden}
#lureHud .bar i{position:absolute;top:0;bottom:0;background:rgba(127,240,168,.35)}#lureHud .bar b{position:absolute;top:-2px;width:4px;height:12px;border-radius:2px;background:#ffd56a}
#lureHud .st{display:flex;justify-content:space-between}#lureHud .chase{color:#7ff0a8;font-weight:800}`;
document.head.appendChild(st);
const hud=document.createElement('div'); hud.id='lureHud'; hud.className='hidden'; hud.innerHTML='<div class="st"><span class="t"></span><span class="chase"></span></div><div class="bar"><i></i><b></b></div><div class="h">按住收線・短按抽竿</div>'; document.body.appendChild(hud);
const hT=hud.querySelector('.t'), hC=hud.querySelector('.chase'), hBand=hud.querySelector('.bar i'), hDot=hud.querySelector('.bar b');
function bobberVis(v){ P.bobber.children.forEach(o=>{ o.visible=v; }); }
function start(at,bait,base){ const k=bait.lure, cf=LURE_CFG[k]; getModel(k); show(k);
  cur={k,cf,base:base.clone(),depth:0,heldT:0,pause:0,speed:0,twitchV:0,chase:null,delay:2+Math.random()*3,interest:0,maxSp:c.reelSpd()*.55,pressT:0};
  pos.copy(at); pos.y=0; holder.position.copy(at); holder.position.y=-.05; holder.visible=true; bobberVis(false); hud.classList.remove('hidden');
  hT.textContent=bait.icon+' '+bait.name; hC.textContent='';
  const mx=2.4; hBand.style.left=(cf.band[0]/mx*100)+'%'; hBand.style.width=((cf.band[1]-cf.band[0])/mx*100)+'%';
  c.toast(cf.tip,'',2600); }
function press(){ if(cur) cur.pressT=performance.now(); }
function release(){ if(!cur) return; if(performance.now()-cur.pressT<220){ cur.twitchV=1.4; cur.twitched=true; c.Snd.plop&&c.Snd.plop(); W.addRipple(pos.x,pos.z,.12); } }
function end(keep){ P.shadow.scale.setScalar(1); if(!keep) hideChaser(); else chaser=null; cur=null; holder.visible=false; hud.classList.add('hidden'); P.shadow.material.opacity=0; }
function update(dt,held){ if(!cur) return null; const cf=cur.cf;
  if(held){ cur.heldT+=dt; cur.pause=0; } else { cur.heldT=0; cur.pause+=dt; }
  const target=held?cur.maxSp*Math.min(1,.4+.6*cur.heldT/1.5):0;
  cur.speed+=(target-cur.speed)*Math.min(1,dt*5); cur.twitchV=Math.max(0,cur.twitchV-dt*4);
  dir.set(cur.base.x-pos.x,0,cur.base.z-pos.z); const dist=dir.length(); dir.normalize();
  const v=cur.speed+cur.twitchV, old=holder.position.clone(), next=old.clone().addScaledVector(dir,v*dt);
  // Pull toward the rod's lateral angle, so the player can steer around structure.
  next.x+=Math.cos(G.head+G.yawT)*Math.sin(G.yawT-(G.aimYawCast||0))*v*dt*.5;
  next.z-=Math.sin(G.head+G.yawT)*Math.sin(G.yawT-(G.aimYawCast||0))*v*dt*.5;
  const q=W.fishingPhysics.move(old,next,.06); pos.set(q.pos.x,0,q.pos.z);
  if(q.contact){ cur.hit=q.contact; cur.incoming=old; holder.position.set(q.pos.x,q.pos.y,q.pos.z); return 'snag'; }
  const want=cur.speed>.2?cf.dive*Math.min(1,cur.speed/cf.band[1]):(cf.sink?Math.min(2.5,cur.depth+dt*.4):(cf.float?0:cur.depth));
  cur.depth+=(want-cur.depth)*Math.min(1,dt*1.5);
  { const q=W.fishingPhysics.move(holder.position,{x:pos.x,y:-cur.depth-.05,z:pos.z},.06); holder.position.set(q.pos.x,q.pos.y,q.pos.z); if(q.contact){cur.hit=q.contact;cur.incoming=old;return 'snag';} } holder.lookAt(tmp.set(cur.base.x,holder.position.y,cur.base.z));
  holder.rotateZ(Math.sin(performance.now()*.02)*(.15+.6*cur.twitchV)); holder.rotateY(Math.sin(performance.now()*.013)*.25*Math.min(1,v));
  hDot.style.left=Math.min(98,v/2.4*100)+'%';
  /* 魚：先等一段時間才有魚注意到；之後依收線方式調整興趣 */
  let ev=null;
  if(!cur.chase){ cur.delay-=dt; if(cur.delay<=0){ cur.chase={d:3.2}; const f=c.onChase?c.onChase():null; if(f){ chaser=f; f.group.visible=true; if(!f.group.parent) S.add(f.group); f.group.scale.setScalar(f.L); } } }
  else { const inBand=cur.speed>=cf.band[0]&&cur.speed<=cf.band[1];
    // 魚況：清晨黃昏、陰天魚活躍——穩定收線最有效；正午、夜裡、冷天魚遲鈍——要多停頓、抽竿逗牠
    const md=c.mood?c.mood():1, act=md>1.1, slow=md<.9;
    let di=0; if(inBand) di+=(act?.42:slow?.16:.3)*dt; else if(cur.speed>cf.band[1]) di-=(slow?.55:.35)*dt;
    if(cur.pause>0){ if(cf.pause&&cur.pause<1.2) di+=cf.pause*(slow?1.8:act?.6:1)*dt; else if(cur.pause>(slow?2.4:1.6)) di-=.22*dt; else if(!cf.pause&&slow&&cur.pause<1) di+=.12*dt; }
    if(cur.twitched){ di+=cf.twitch*(slow?1.6:act?.8:1); cur.twitched=false; }
    if(!cur.moodShown){ cur.moodShown=true; c.toast(act?'🐟 魚況活躍：穩定收線最有效':slow?'🐟 魚況遲鈍：多停頓、抽竿逗牠':'🐟 魚況普通：收線中偶爾停頓','',2200); }
    cur.interest=Math.max(0,Math.min(1.1,cur.interest+di));
    cur.chase.d+=((3.2-2.8*cur.interest)-cur.chase.d)*Math.min(1,dt*2);
    tmp.copy(pos).addScaledVector(dir,-cur.chase.d); P.shadow.position.set(tmp.x,.02,tmp.z); P.shadow.material.opacity=.15+.35*cur.interest;
    P.shadow.rotation&&(P.shadow.rotation.y=Math.atan2(dir.x,dir.z));
    if(chaser){ /* 真實魚模型跟在假餌後面：越有興趣越靠近水面、跟得越緊、尾巴擺得越快 */
      const g=chaser.group, I=cur.interest, wob=Math.sin(performance.now()*.004)*.35*(1-I);
      const oldFish=g.position.clone(); g.position.set(tmp.x+dir.z*wob,-(.25-.3*I)+Math.sin(performance.now()*.006)*.01,tmp.z-dir.x*wob); const q=W.fishingPhysics.move(oldFish,g.position,Math.max(.1,chaser.L*.22)); g.position.set(q.pos.x,q.pos.y,q.pos.z); if(q.contact) cur.interest=Math.min(.7,cur.interest); g.rotation.set(0,Math.atan2(-dir.z,dir.x),0);
      chaser.uni.uSwim.value+=dt*(5+9*(cur.speed+I)); chaser.uni.uAmp.value=.05+.04*I;
      { const far=Math.min(1,Math.max(0,(dist-6)/14)); P.shadow.scale.setScalar(1+1.6*far); P.shadow.material.opacity=Math.min(.75,(.15+.35*I)*(.5+.9*far)); }   // 遠處時加強魚下方的暗影，讓人看得出有魚在跟
      if(I>.75&&Math.random()<dt*6) P.splash(g.position.x-dir.x*chaser.L*.3,0,g.position.z-dir.z*chaser.L*.3,2,.18); }   // 背鰭劃開水面
    cur.fx=(cur.fx||0)-dt; if(cur.interest>.45&&cur.fx<=0){ cur.fx=.9-.6*cur.interest; W.addRipple(tmp.x,tmp.z,.12+.25*cur.interest); if(cur.interest>.75) P.splash(tmp.x,0,tmp.z,4,.25); }   // 魚背攪水
    hC.textContent=cur.interest>.7?'🐟 快咬了！':cur.interest>.25?'🐟 有魚在追':'🐟 魚在觀察';
    if(cur.interest>=1&&Math.random()<dt*3){ ev='strike'; pip.strikeT=.9; pip.burst=false; }
    else if(cur.interest<=0&&cur.wasHigh){ hideChaser(); cur.chase=null; cur.delay=2+Math.random()*3; cur.wasHigh=false; hC.textContent=''; P.shadow.material.opacity=0; ev='lost'; }
    if(cur.interest>.3) cur.wasHigh=true; }
  if(!ev&&dist<3.2) ev='done';
  return ev; }
/* ===== 水下鏡頭小視窗：近距離側拍假餌與追逐的魚（只畫這幾樣，不重畫整個場景） ===== */
const pip={scene:new T.Scene(),cam:new T.PerspectiveCamera(42,4/3,.01,40),lure:null,lureK:'',fish:null,fishSrc:null,strikeT:0,x:0};
pip.scene.background=new T.Color(0x0a3644); pip.scene.fog=new T.Fog(0x0a3644,1.2,6.5);
pip.scene.add(new T.HemisphereLight(0xa8e0ff,0x041820,1.3)); { const dl=new T.DirectionalLight(0xdff4ff,.9); dl.position.set(.4,3,1); pip.scene.add(dl); }
{ const fl=new T.Mesh(new T.PlaneGeometry(30,10).rotateX(-Math.PI/2),new T.MeshLambertMaterial({color:0x2e4a3c})); fl.position.y=-.9; pip.scene.add(fl); }
const PN=220, pg2=new T.BufferGeometry(), pp=new Float32Array(PN*3); for(let i=0;i<PN;i++){ pp[i*3]=(Math.random()-.5)*8; pp[i*3+1]=-.8+Math.random()*2.4; pp[i*3+2]=(Math.random()-.5)*4; }
pg2.setAttribute('position',new T.BufferAttribute(pp,3)); const motes=new T.Points(pg2,new T.PointsMaterial({color:0xcfefff,size:.007,transparent:true,opacity:.55,depthWrite:false})); pip.scene.add(motes);
const rays=[]; for(let i=0;i<5;i++){ const m=new T.Mesh(new T.PlaneGeometry(.35,4),new T.MeshBasicMaterial({color:0x9fdcff,transparent:true,opacity:.07,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide})); m.position.set(-3+i*1.5,.6,-1.2); m.rotation.z=.35; pip.scene.add(m); rays.push(m); }
const bub=[]; for(let i=0;i<14;i++){ const b=new T.Mesh(new T.SphereGeometry(.012,8,6),new T.MeshBasicMaterial({color:0xe8f8ff,transparent:true,opacity:.7})); b.visible=false; pip.scene.add(b); bub.push({b,v:0}); }
const frame=document.createElement('div'); frame.id='pipFrame'; frame.innerHTML='<span>🎥 水下鏡頭</span>'; document.body.appendChild(frame);
const pst=document.createElement('style'); pst.textContent=`#pipFrame{position:fixed;z-index:5;border:2px solid rgba(160,220,255,.7);border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.4);pointer-events:none;display:none}#pipFrame span{position:absolute;left:6px;top:4px;font-size:11px;font-weight:800;color:#dff4ff;text-shadow:0 1px 3px #000}`; document.head.appendChild(pst);
function pipSync(){ if(!cur) return;
  if(!pip.glint){ pip.glint=new T.PointLight(0xfff4e0,1.6,5,1.5); pip.glint.position.set(.6,1,1.4); pip.scene.add(pip.glint); }   // 亮片轉動時的高光來源
  if(pip.lureK!==cur.k&&models[cur.k]){ if(pip.lure) pip.scene.remove(pip.lure);
    const m=models[cur.k].clone(true); m.position.set(0,0,0); m.rotation.set(0,0,0); m.scale.multiplyScalar(2.2); m.updateMatrixWorld(true);
    // 子畫面專用材質複本（只改複本，主畫面與魚不受影響）。子畫面沒有環境貼圖，金屬度高的表面會幾乎全黑，
    // 所以所有假餌都限制金屬度：亮片保留一點金屬感（.35）並靠點光源產生高光；米諾、曲柄實際是塑膠（.15）。
    // 原本就半透明的部分（例如曲柄的潛水板）保持半透明，其餘改為不透明。
    m.traverse(o=>{ if(!o.isMesh) return; const mt=o.material.clone(), seeThru=mt.opacity<.99;
      mt.transparent=seeThru; mt.depthWrite=!seeThru;
      if(mt.metalness!==undefined){ const sp=cur.k==='spoon'; mt.metalness=Math.min(mt.metalness,sp?.35:.15);
        mt.roughness=Math.min(mt.roughness==null?1:mt.roughness,sp?.28:.45);
        if(sp&&mt.emissive){ mt.emissive=new T.Color(0x223338); mt.emissiveIntensity=1; } }
      o.material=mt; o.renderOrder=seeThru?1:0; });
    // 自動量測：最薄的方向轉向鏡頭（正面朝你），最長的方向轉成水平（身體橫向）
    const sz=new T.Box3().setFromObject(m).getSize(new T.Vector3()), d=[sz.x,sz.y,sz.z], A=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)];
    const thin=d.indexOf(Math.min(...d)), lng=[0,1,2].filter(i=>i!==thin).sort((a,b)=>d[b]-d[a])[0];
    const aL=A[lng], aT=A[thin], aM=new T.Vector3().crossVectors(aT,aL);
    const src=new T.Matrix4().makeBasis(aL,aM,aT), dst=new T.Matrix4().makeBasis(new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1));
    m.quaternion.setFromRotationMatrix(dst.multiply(src.transpose()));
    const ctr=new T.Box3().setFromObject(m).getCenter(new T.Vector3()); m.position.sub(ctr);
    pip.lure=new T.Group(); pip.lure.add(m); pip.scene.add(pip.lure); pip.lureK=cur.k; }
  if(chaser&&pip.fishSrc!==chaser.group){ if(pip.fish) pip.scene.remove(pip.fish); pip.fish=chaser.group.clone(true); pip.fish.visible=true; pip.fishSrc=chaser.group; pip.scene.add(pip.fish); }
  if(!chaser&&pip.fish&&pip.strikeT<=0){ pip.scene.remove(pip.fish); pip.fish=null; pip.fishSrc=null; } }
const vs=new T.Vector2();
let pipEnv=null;
function makePipEnv(renderer){ const es=new T.Scene(), g=new T.Mesh(new T.SphereGeometry(10,32,16),new T.ShaderMaterial({side:T.BackSide,
    vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec3 vP; void main(){ float h=normalize(vP).y; vec3 c=mix(vec3(0.03,0.09,0.11),vec3(0.32,0.5,0.55),smoothstep(-0.3,0.9,h)); c+=vec3(0.55,0.65,0.6)*pow(max(h,0.0),10.0); gl_FragColor=vec4(c,1.0); }'}));
  es.add(g); const pm=new T.PMREMGenerator(renderer), rt=pm.fromScene(es,0,.1,50); pm.dispose(); return rt.texture; }   // 子畫面專屬的水下環境反射，金屬假餌才會發亮
function renderPiP(renderer,dt){ const on=(cur||pip.strikeT>0)&&(!c.uwOn||c.uwOn());
  if(!on){ frame.style.display='none'; return; } dt=dt||.016;  pipSync();
  const sp=cur?(cur.speed+cur.twitchV):0, I=cur?cur.interest:1, t=performance.now()*.001;
  const p=motes.geometry.attributes.position.array; for(let i=0;i<PN;i++){ p[i*3]+=dt*(.15+sp*.9); if(p[i*3]>4) p[i*3]-=8; } motes.geometry.attributes.position.needsUpdate=true;
  if(pip.lure){ const k=pip.lureK, tw=cur?cur.twitchV:0, ws=.6+(cur?cur.speed:0); pip.lure.position.set(0,.35+Math.sin(t*2.2)*.02,0);
    // 依假餌種類做真實泳姿（身體軸＝X、正面＝Z）：亮片沿長軸翻轉閃光；曲柄快速擺尾；米諾細微搖擺、抽竿時大擺。收線越快擺得越快
    if(k==='spoon') pip.lure.rotation.set(Math.sin(t*9*ws)*1.15,Math.sin(t*4.5)*.12,Math.sin(t*9*ws+1)*.06);
    else if(k==='crank') pip.lure.rotation.set(Math.sin(t*16*ws+1)*.16,Math.sin(t*16*ws)*.24,Math.sin(t*3)*.04);
    else pip.lure.rotation.set(Math.sin(t*7)*(.1+.5*tw),Math.sin(t*7)*(.07+.6*tw),Math.sin(t*2.6)*.04); }
  let span=.5;
  if(pip.fish){ const L=pip.fishSrc?pip.fishSrc.scale.x:.4; let dx;
    if(pip.strikeT>0){ pip.strikeT-=dt; const k=Math.min(1,(.9-pip.strikeT)/.25); dx=pip.x*(1-k); if(k>=1&&!pip.burst){ pip.burst=true; bub.forEach(o=>{ o.b.visible=true; o.b.position.set((Math.random()-.5)*.2,.35+(Math.random()-.5)*.15,(Math.random()-.5)*.2); o.v=.3+Math.random()*.5; }); } }
    else { dx=.12+L*.55+(cur?cur.chase.d*.32:0)*(1-.6*I); pip.x=dx; }
    pip.fish.position.set(dx,.35-.12*(1-I)+Math.sin(t*1.7)*.03,Math.sin(t*.9)*.08*(1-I)); pip.fish.rotation.set(0,Math.PI,0); span=dx+L*.6; }
  bub.forEach(o=>{ if(!o.b.visible) return; o.b.position.y+=o.v*dt; o.b.position.x+=dt*.2; if(o.b.position.y>1.4) o.b.visible=false; });
  if(pip.strikeT<=0&&!cur){ frame.style.display='none'; pip.burst=false; bub.forEach(o=>o.b.visible=false); return; }
  pip.cam.position.set(span*.45,.42,Math.max(.75,span*1.25)); pip.cam.lookAt(span*.4,.33,0);
  renderer.getSize(vs); const w=Math.round(Math.min(vs.x*.44,240)), h=Math.round(w*.75), x=vs.x-w-10;
  const hy=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hudY'))||150, top=hy+52, yb=vs.y-top-h;
  pip.cam.aspect=w/h; pip.cam.updateProjectionMatrix();
  const ac=renderer.autoClear; renderer.setScissorTest(true); renderer.setScissor(x,yb,w,h); renderer.setViewport(x,yb,w,h); renderer.autoClear=true;
  renderer.render(pip.scene,pip.cam); renderer.setScissorTest(false); renderer.setViewport(0,0,vs.x,vs.y); renderer.autoClear=ac;
  Object.assign(frame.style,{display:'block',left:x+'px',top:top+'px',width:w+'px',height:h+'px'}); }
return {contact:()=>cur&&cur.hit,incoming:()=>cur&&cur.incoming?cur.incoming.clone():holder.position.clone(),renderPiP,start,update,press,release,end,chaser:()=>chaser,bobberVis,pos:()=>holder.position,interest:()=>cur?cur.interest:0,active:()=>!!cur};
}
