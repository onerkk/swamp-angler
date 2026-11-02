/* 龍蝦與泰國蝦的骨架零件
   身體由 AI 依玩家設定圖生成（頭在 +X、身長 1、背朝 +Y、左側 +Z），腳、螯、觸角、游泳足用程式做成分節零件，
   每一節都掛在自己的關節上，關節再掛在脊椎骨上，所以身體彎、腳也跟著動。
   動作依真實習性：
   - 龍蝦：五對步足波浪式交替走路；粗觸角緩慢掃動探路；受驚或被釣住時腹部猛力往內捲，整隻往後彈射（龍蝦的招牌逃跑方式）
   - 泰國蝦：細步足走路、長螯往前伸著探路並開合；腹部下方的游泳足持續划水；受驚時尾巴一彈往後退 */
const CRUST={
 lobster:{legs:5,leg:[.16,.17,.1],legR:.018,legX:[.4,.33,.26,.19,.12],claw:null,
   ant:{n:10,len:1.25,r0:.019,r1:.003,yaw:.38,pitch:.28,c0:[200,92,70],c1:[70,36,26],x:.46,z:.36},
   antl:{n:6,len:.42,r0:.007,r1:.0025,yaw:.14,pitch:.22,band:true,x:.47,z:.12},
   swim:[-.12,-.2,-.28,-.35],swimC:'#d8c8a0',flip:.36},
 prawn:{legs:4,leg:[.12,.13,.07],legR:.009,legX:[.33,.27,.21,.15],
   claw:{x:.4,seg:[.24,.22,.22],fing:.15,r:.015,yaw:.22,pitch:-.08},
   ant:{n:12,len:1.5,r0:.005,r1:.0012,yaw:.42,pitch:.2,c0:[220,150,60],c1:[200,120,40],x:.47,z:.18},
   antl:{n:8,len:.75,r0:.004,r1:.0012,yaw:.18,pitch:.24,c0:[120,150,200],c1:[200,170,120],x:.48,z:.06},
   swim:[-.06,-.13,-.2,-.27,-.34],swimC:'#c8d4d8',flip:.3}};
function crustBandTex(T,kind,tip){
 const cv=document.createElement('canvas'); cv.width=8; cv.height=128; const x=cv.getContext('2d');
 if(kind==='lobster'){ x.fillStyle='#efe3bf'; x.fillRect(0,0,8,128); x.fillStyle='#1c1a18'; for(const y of [14,58,100]) x.fillRect(0,y,8,22); }
 else { const g=x.createLinearGradient(0,0,0,128); g.addColorStop(0,'#c9d6e6'); g.addColorStop(.5,'#e4ecf2'); g.addColorStop(1,'#9fb6d6'); x.fillStyle=g; x.fillRect(0,0,8,128); x.fillStyle='rgba(90,130,190,.55)'; x.fillRect(0,0,8,10); x.fillRect(0,118,8,10); }
 if(tip){ const g=x.createLinearGradient(0,0,0,128); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.45,'rgba(232,140,40,.4)'); g.addColorStop(1,'rgba(232,140,40,1)'); x.fillStyle=g; x.fillRect(0,0,8,128); }
 const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return t;
}
// 一節：圓錐柱，從關節沿 +X 長出去
// 顏色都是照片上的 sRGB 值，r128 不會自動轉換，要轉成線性色才不會畫出來發白
function lin(T,c){ return new T.Color(c).convertSRGBToLinear(); }
function crustSeg(T,len,r0,r1,mat,rad){ const g=new T.CylinderGeometry(r1,r0,len,rad||8,1); g.rotateZ(-Math.PI/2); g.translate(len/2,0,0); const m=new T.Mesh(g,mat); m.castShadow=true; m.frustumCulled=false; return m; }
function crustJoint(T,parent,x,y,z){ const j=new T.Object3D(); j.position.set(x,y,z); parent.add(j); return j; }
function crustMeasure(grp){ const M={wzC:0,yBotC:0,yTopC:0,wzA:0,yBotA:0};
 grp.traverse(m=>{ if(!m.isMesh) return; const P=m.geometry.attributes.position; for(let i=0;i<P.count;i++){ const x=P.getX(i), y=P.getY(i), z=Math.abs(P.getZ(i));
   if(x>.1&&x<.42){ M.wzC=Math.max(M.wzC,z); M.yBotC=Math.min(M.yBotC,y); M.yTopC=Math.max(M.yTopC,y); }
   if(x<-.04&&x>-.4){ M.wzA=Math.max(M.wzA,z); M.yBotA=Math.min(M.yBotA,y); } } });
 return M; }
function boneAt(bones,BX,x){ let k=0; while(k<BX.length-1&&x<BX[k+1]) k++; return bones[k]; }
function attachAt(T,bone,grp,x,y,z){ grp.updateMatrixWorld(true); const v=new T.Vector3(x,y,z); grp.localToWorld(v); bone.worldToLocal(v); return crustJoint(T,bone,v.x,v.y,v.z); }
// 一條分節的觸角：每節一個關節，可以整條彎、末端擺得比根部大
function crustAntenna(T,base,cfg,side,tex){ const segs=[]; let par=base; const L=cfg.len/cfg.n;
 for(let i=0;i<cfg.n;i++){ const f=i/cfg.n, r0=cfg.r0+(cfg.r1-cfg.r0)*f, r1=cfg.r0+(cfg.r1-cfg.r0)*(i+1)/cfg.n;
   const col=cfg.c0?lin(T,`rgb(${Math.round(cfg.c0[0]+(cfg.c1[0]-cfg.c0[0])*f)},${Math.round(cfg.c0[1]+(cfg.c1[1]-cfg.c0[1])*f)},${Math.round(cfg.c0[2]+(cfg.c1[2]-cfg.c0[2])*f)})`):new T.Color(1,1,1);
   const mat=new T.MeshStandardMaterial({color:col,map:cfg.band?tex:null,roughness:.55,metalness:0});
   const j=i===0?par:crustJoint(T,par,L,0,0); j.add(crustSeg(T,L,r0,r1,mat,6)); segs.push(j); par=j; }
 return segs; }
function buildCrust(T,r,kind){ const C=CRUST[kind], grp=r.grp, bones=r.bones, BX=r.BX, M=crustMeasure(grp), P={kind,legs:[],claws:[],ant:[],swim:[],flip:{t:9,next:2+Math.random()*3},C};
 const legTex=crustBandTex(T,kind,false), tipTex=crustBandTex(T,kind,true);
 const legMat=new T.MeshStandardMaterial({map:legTex,roughness:.5,metalness:0}), tipMat=new T.MeshStandardMaterial({map:tipTex,roughness:.5,metalness:0});
 const zA=Math.max(M.wzC*.82,.03), yA=M.yBotC*.55;
 // 步足：三節（大腿、小腿、腳尖），前面的腳往前張、後面的往後張
 C.legX.forEach((x,i)=>{ for(const s of [1,-1]){ const b=boneAt(bones,BX,x), hip=attachAt(T,b,grp,x,yA,s*zA), fan=(.55-i/(C.legs-1||1)*1.1);
   const yaw=crustJoint(T,hip,0,0,0); yaw.rotation.y=s>0?-Math.PI/2+fan:Math.PI/2-fan; const pit=crustJoint(T,yaw,0,0,0); pit.rotation.z=.4;
   pit.add(crustSeg(T,C.leg[0],C.legR,C.legR*.85,legMat)); const knee=crustJoint(T,pit,C.leg[0],0,0); knee.rotation.z=-1.3;
   knee.add(crustSeg(T,C.leg[1],C.legR*.85,C.legR*.6,legMat)); const ank=crustJoint(T,knee,C.leg[1],0,0); ank.rotation.z=-.35;
   ank.add(crustSeg(T,C.leg[2],C.legR*.6,C.legR*.15,tipMat)); P.legs.push({i,s,yaw,pit,knee,ank,yaw0:yaw.rotation.y,pit0:.4,knee0:-1.3}); } });
 // 泰國蝦的長螯：三節藍色帶刺的螯臂，末端兩根可以開合的指
 if(C.claw){ const K=C.claw, armMat=new T.MeshStandardMaterial({color:lin(T,0x2f58c8),roughness:.38,metalness:.05}), jointMat=new T.MeshStandardMaterial({color:lin(T,0xe08a30),roughness:.5}), fingMat=new T.MeshStandardMaterial({color:lin(T,0x1a2a64),roughness:.4});
   for(const s of [1,-1]){ const b=boneAt(bones,BX,K.x), sh=attachAt(T,b,grp,K.x,yA*.6,s*zA*.7); const yaw=crustJoint(T,sh,0,0,0); yaw.rotation.y=s*-K.yaw; const pit=crustJoint(T,yaw,0,0,0); pit.rotation.z=K.pitch;
     let par=pit; const js=[];
     K.seg.forEach((L,n)=>{ const j=n===0?par:crustJoint(T,par,K.seg[n-1],0,0); if(n>0){ const knob=new T.Mesh(new T.SphereGeometry(K.r*1.15,8,6),jointMat); j.add(knob); j.rotation.y=s*-.08; } j.add(crustSeg(T,L,K.r*(n===2?1.25:1),K.r*(n===2?1.1:.9),armMat)); js.push(j); par=j; });
     const tipJ=crustJoint(T,par,K.seg[2],0,0), f1=crustJoint(T,tipJ,0,0,0), f2=crustJoint(T,tipJ,0,0,0);
     f1.add(crustSeg(T,K.fing,K.r*.8,K.r*.15,fingMat)); f2.add(crustSeg(T,K.fing,K.r*.8,K.r*.15,fingMat));
     P.claws.push({s,yaw,pit,js,f1,f2,yaw0:yaw.rotation.y,pit0:K.pitch}); } }
 // 觸角：粗觸角（龍蝦）／長觸角（蝦），加上一對細的小觸角
 for(const cfg of [C.ant,C.antl]){ for(const s of [1,-1]){ const b=bones[0], base=attachAt(T,b,grp,cfg.x,M.yTopC*.25,s*Math.max(M.wzC*cfg.z,.01));
   const yaw=crustJoint(T,base,0,0,0); yaw.rotation.y=s*-cfg.yaw; const pit=crustJoint(T,yaw,0,0,0); pit.rotation.z=cfg.pitch;
   const segs=crustAntenna(T,pit,cfg,s,legTex); P.ant.push({s,yaw,segs,yaw0:yaw.rotation.y,thick:cfg===C.ant,big:kind==='lobster'&&cfg===C.ant}); } }
 // 游泳足：腹部下方一對對小葉片
 const swMat=new T.MeshStandardMaterial({color:lin(T,C.swimC),roughness:.6,transparent:true,opacity:.7,side:T.DoubleSide});
 C.swim.forEach((x,i)=>{ for(const s of [1,-1]){ const b=boneAt(bones,BX,x), j=attachAt(T,b,grp,x,M.yBotA*.9,s*Math.max(M.wzA*.45,.015)); const g=new T.PlaneGeometry(.045,.05); g.translate(0,-.024,0);
   const m=new T.Mesh(g,swMat); m.frustumCulled=false; j.add(m); P.swim.push({i,j}); } });
 return P; }
// 每幀：依 uSwim（步態相位）與 uAmp（用力程度）擺動
function poseCrust(r,dt){ const P=r.crust, u=r.uni.uSwim.value, a=r.uni.uAmp.value, amp=Math.min(1,.2+a*5), C=P.C;
 const w=u*1.25;
 for(const L of P.legs){ const ph=w-L.i*.95+(L.s>0?0:Math.PI), sw=Math.sin(ph), lift=Math.max(0,Math.cos(ph));
   L.yaw.rotation.y=L.yaw0+L.s*sw*.3*amp; L.pit.rotation.z=L.pit0+lift*.32*amp; L.knee.rotation.z=L.knee0-lift*.25*amp; }
 // 尾巴彈射：用力時每隔一兩秒猛力捲一次腹部，平常偶爾小彈一下
 const F=P.flip; F.t+=dt; F.next-=dt;
 if(F.next<=0){ F.t=0; F.big=a>.17; F.next=F.big?1+Math.random()*1.4:9+Math.random()*12; }
 const t=F.t, curl=t<.11?t/.11:t<.5?1-(t-.11)/.39:0, flex=curl*(F.big?C.flip:C.flip*.4);
 for(let i=2;i<r.bones.length;i++) r.bones[i].rotation.z+=flex*(i===2?.5:1);
 for(const A of P.ant){ const sway=Math.sin(u*.22+A.s*1.3)*(A.big?.16:.1)+Math.sin(u*.9+A.s)*.05*amp-curl*.35;
   A.yaw.rotation.y=A.yaw0+sway*A.s; A.segs.forEach((j,n)=>{ if(n===0) return; j.rotation.z=-.03-(A.big?.015:.03)*Math.sin(u*.6+n*.5); j.rotation.y=Math.sin(u*.8+n*.6+A.s)*.035*(1+amp); }); }
 for(const K of P.claws){ const reach=Math.sin(u*.35+K.s)*.12, open=.12+Math.max(0,Math.sin(u*.7+K.s))*.35*amp;
   K.yaw.rotation.y=K.yaw0+K.s*reach*.5; K.pit.rotation.z=K.pit0+Math.sin(u*.5)*.08*amp+curl*.4; K.f1.rotation.z=open; K.f2.rotation.z=-open*.6; }
 const paddle=C===CRUST.prawn?.4+a*4:a*3;
 for(const S of P.swim){ S.j.rotation.z=Math.sin(u*2.6-S.i*.9)*Math.min(.7,.15+paddle*.5); } }
if(typeof module!=='undefined'&&module.exports) module.exports={CRUST,buildCrust,poseCrust,crustMeasure};
