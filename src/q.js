/* ===== 第一人稱雙手（Sketchfab「First Person arms」by bumstrum，CC-BY） ===== */
function createArms(W,P){
'use strict';
const T=THREE, S=W.scene, reel=P.reelObj, crank=P.crankObj, rod=P.rod;
const arms=[]; let ready=false;
// 左手：往前握前握把末端；右手：轉右側搖柄把手（捲線器座標：x 沿竿向前、y 向上、z 搖柄側）
const GRIP=new T.Vector3(-.2,-.012,-.006), KNOB=new T.Vector3(0,-.05,.03);
const SH_R=new T.Vector3(.18,-.88,.12), SH_L=new T.Vector3(-.38,-.86,.1);
const CURL=[.7,1,.8];                       // 手指三節的彎曲比例（−X 為握拳方向，實測）
function setup(g){
  for(const side of ['R','L']){
    const o=T.SkeletonUtils?T.SkeletonUtils.clone(g.scene):g.scene.clone(true);
    let wrist=null, root=null, other=null, palm=null; const fing=[];
    o.traverse(b=>{ if(!b.isBone) return; const n=b.name;
      if(n.indexOf(side+'_wrist')===0) wrist=b; if(n.indexOf(side+'_arm')===0) root=b; if(n.indexOf(side+'_palm')===0) palm=b;
      if(n.indexOf((side==='R'?'L':'R')+'_arm')===0) other=b;
      const m=n.match(new RegExp('^'+side+'_(point|middle|ring|pink)([123])')); if(m) fing.push({b,k:CURL[+m[2]-1],x0:b.rotation.x});
      const th=n.match(new RegExp('^'+side+'_thumb([123])')); if(th) fing.push({b,k:[.45,.6,.5][+th[1]-1],x0:b.rotation.x}); });   // 拇指同樣繞 −X 內收扣住竿子（實測）
    if(!wrist||!root) continue;
    if(other) other.scale.setScalar(1e-4);
    o.traverse(m=>{ m.frustumCulled=false; if(m.isMesh){ m.renderOrder=2; (Array.isArray(m.material)?m.material:[m.material]).forEach(mm=>{ mm.envMapIntensity=.32; mm.roughness=.95; mm.metalness=0; mm.bumpMap=WEAVE; mm.bumpScale=.0016; mm.needsUpdate=true; }); } });   // 布料不像塑膠：降低環境反光、全霧面，加上細細的布紋凹凸
    const grp=new T.Group(); grp.add(o); S.add(grp); grp.updateMatrixWorld(true);
    const wl=new T.Vector3().setFromMatrixPosition(wrist.matrixWorld), rl=new T.Vector3().setFromMatrixPosition(root.matrixWorld);
    const pl=palm?new T.Vector3().setFromMatrixPosition(palm.matrixWorld):wl.clone();
    const ld=new T.Vector3().subVectors(wl,rl), L0=ld.length(); ld.normalize();
    arms.push({side,grp,wl,rl,pl,ld,L0,fing,grip:.85});
    if(W.reflHide) W.reflHide(grp);
  }
  ready=arms.length===2; }
// 布紋：細密的斜紋織布凹凸（外套、袖子），近看有布料質感
const WEAVE=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); const d=x.createImageData(64,64);
  for(let j=0;j<64;j++) for(let i2=0;i2<64;i2++){ const v=128+60*Math.sin((i2+j)*.98)*Math.sin((i2-j)*.98*.5)+(Math.random()-.5)*40, k=(j*64+i2)*4; d.data[k]=d.data[k+1]=d.data[k+2]=v; d.data[k+3]=255; }
  x.putImageData(d,0,0); const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(14,14); return t; })();
if(T.GLTFLoader) new T.GLTFLoader().load('models/arms.glb',setup);
/* 雙手補光：掛在鏡頭上、只照 2 米內，亮度跟著日照，夜裡不會像戴頭燈 */
const fill=new T.PointLight(0xfff2e0,0,2.2,1.6); W.camera.add(fill); fill.position.set(.15,.1,.1); if(!W.camera.parent) S.add(W.camera);
const tg=new T.Vector3(), sh=new T.Vector3(), wd=new T.Vector3(), q=new T.Quaternion(), q2=new T.Quaternion(), cq=new T.Quaternion(),
  upW=new T.Vector3(), upM=new T.Vector3(), sd=new T.Vector3(), tmp=new T.Vector3(), off=new T.Vector3(), pg=new T.Vector3();
let back=0, fwd=0, lastSt='', reelK=0;
let pullK=0, lungeK=0;
function update(show,st,power,dt,pad){
  if(!ready) return; dt=dt||.016; fill.intensity=show?(W.info?W.info.light:1)*(window.__G&&window.__G.loc==='sea'?3.2:1.6):0;
  /* 揮臂：蓄力時往後上方拉，放開瞬間往前揮，再回原位 */
  if(lastSt==='charge'&&st!=='charge') fwd=1; lastSt=st;
  back+=((st==='charge'?Math.min(1,power||0):0)-back)*Math.min(1,dt*8); fwd=Math.max(0,fwd-dt*2.2);
  const swing=fwd>0?Math.sin((1-fwd)*Math.PI):0;
  const reeling=st==='fight'||st==='retrieve'; reelK+=((reeling?1:0)-reelK)*Math.min(1,dt*6);
  W.camera.getWorldQuaternion(cq);
  // 搏魚用力：按住收線撐魚時雙臂往後上方拉；魚衝刺時被往前拖；張力很大時手在發抖、握得更緊
  const GG=window.__G, ff=GG&&GG.state==='fight'?GG.f:null, T=ff?ff.T||0:0;
  pullK+=(((ff&&GG.held)?T:0)-pullK)*Math.min(1,dt*5); lungeK+=(((ff&&ff.run)?.5+.5*T:0)-lungeK)*Math.min(1,dt*4);
  const shake=T>.78?(T-.78)*.05:0;
  for(const a of arms){ a.grp.visible=show; if(!show) continue;
    if(a.side==='L'){ reel.getWorldPosition(tg); tmp.subVectors(rod.tipW,tg).normalize(); tg.addScaledVector(tmp,.2); }   // 沿竿身往竿尖 20cm，一定在竿上
    else crank.localToWorld(tg.copy(KNOB));
    const pk=pad&&pad.k>.001?pad.k:0; if(pk){ pad.grip(a.side,pg); tg.lerp(pg,pk); }   // 划船：握點移到槳桿
    off.copy(a.side==='R'?SH_R:SH_L); off.y+=.24*back-.08*swing+.06*pullK-.03*lungeK+(Math.random()-.5)*shake; off.z+=.32*back-.3*swing+.13*pullK-.12*lungeK+(Math.random()-.5)*shake; off.x+=(a.side==='R'?.06:-.04)*back;
    W.camera.localToWorld(sh.copy(off));
    wd.subVectors(tg,sh).normalize();
    q.setFromUnitVectors(a.ld,wd);
    upM.set(0,1,0).applyQuaternion(q); upW.set(0,1,0).applyQuaternion(cq);
    upM.addScaledVector(wd,-upM.dot(wd)).normalize(); upW.addScaledVector(wd,-upW.dot(wd)).normalize();
    let roll=Math.atan2(tmp.crossVectors(upM,upW).dot(wd),upM.dot(upW))+(a.side==='R'?-.35:-.6);
    if(a.side==='R') roll+=.45*Math.sin(rod.spin||0)*reelK;                    // 收線：前臂隨搖柄轉動
    q2.setFromAxisAngle(wd,roll); q.premultiply(q2);
    if(a.side==='R'&&reelK>.01){ sd.crossVectors(wd,upW).normalize(); q2.setFromAxisAngle(sd,.22*Math.cos(rod.spin||0)*reelK); q.premultiply(q2); }  // 手腕上下擺
    const s=.5/a.L0; a.grp.scale.setScalar(s); a.grp.quaternion.copy(q);
    // 用掌心對準握點，竿子穿過掌心與手指之間
    upM.set(0,1,0).applyQuaternion(q);
    a.grp.position.copy(tg).sub(tmp.copy(a.pl).multiplyScalar(s).applyQuaternion(q)).addScaledVector(upM,.018);
    const tight=a.grip+(reeling?.1:0)+(st==='charge'?.05:0)+.12*T;
    for(const f of a.fing) f.b.rotation.x=f.x0-tight*f.k; } }
return {update};
}
