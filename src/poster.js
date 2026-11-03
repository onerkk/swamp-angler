/* ===== 戰績海報：分享到 Threads（4:5 直式 1080×1350）=====
   上半部是按下分享那一刻的真實遊戲畫面（只取 3D 畫面，不含按鈕），下半部是旅程紀錄：
   稱號與等級、四格數據、故事進度、最大漁獲、最近的稱號、網址與 QR 碼。手機支援就直接叫出分享選單，不支援就下載圖片 */
(function(){
'use strict';
const W0=1080, H0=1350, URL='onerkk.github.io/swamp-angler';
const SERIF="'Noto Serif TC','Songti TC','PMingLiU',serif", SANS="'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MAIN=[['c1','碼頭'],['c2','浮萍'],['c3','暴雨'],['c4','湖心'],['ice','冰湖'],['c5','月潮'],['c6','河口'],['c7','深淵']], EPI=['e1','e2','e3','e4','e5'];
const qr=new Image(); qr.src='poster_qr.png'; const paper=new Image(); paper.src='end_paper.jpg';
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function fitText(g,t,max,size,font,weight){ let s=size; do{ g.font=`${weight||700} ${s}px ${font}`; s-=2; }while(g.measureText(t).width>max&&s>12); }
/* 這一刻的遊戲畫面：重畫一次 3D 場景後立刻複製（不需要保留繪圖緩衝） */
function grabScene(){ const W=window.__W; if(!W||!W.renderer) return null; try{ if(W.render) W.render(); else W.renderer.render(W.scene,W.camera); const src=W.renderer.domElement, c=document.createElement('canvas'); c.width=src.width; c.height=src.height; c.getContext('2d').drawImage(src,0,0); return c; }catch(e){ return null; } }
function stats(){ const S=window.__SAVE||{}, SP=(window.__PROPS&&window.__PROPS.SPECIES)||[];
  const fish=SP.filter(s=>s.loc!=='tide'&&!s.item), dex=fish.filter(s=>S.dex&&S.dex[s.id]).length;
  const B=typeof BOSS!=='undefined'?BOSS:[], won=B.filter(b=>S.boss&&S.boss[b.id]).length;
  const done=(S.story&&S.story.done)||[], main=MAIN.map(([id,n])=>({n,ok:done.indexOf(id)>=0})), epi=EPI.filter(id=>done.indexOf(id)>=0).length;
  const here=(window.__G&&window.__G.loc)||'lake', locOf=sp=>sp?(sp.loc||'lake'):'', fits=sp=>sp&&!sp.item&&(locOf(sp)===here||locOf(sp)==='both');
  const log=(S.catchLog||[]).filter(r=>r&&r.w>0).sort((a,b)=>b.w-a.w), big=log[0], bigSp=big&&SP.find(s=>s.id===big.id);
  // 主角魚：要跟現在所在的水域一致（湖上不會出現大白鯊），沒有就不放
  const heroRec=log.find(r=>fits(SP.find(s=>s.id===r.id))), heroSp=heroRec&&SP.find(s=>s.id===heroRec.id);
  const mer=(S.merGift||[]).length, merN=window.__MERGIFT?window.__MERGIFT.count():8;
  const title=window.__TAL&&window.__TAL.curTitle?window.__TAL.curTitle():((S.titles||[]).slice(-1)[0]||'');
  return {lv:S.lv||1, title, dex, dexN:fish.length, won, wonN:B.length, bosses:B.map(b=>({n:b.name,ok:!!(S.boss&&S.boss[b.id])})), main, epi, total:S.total||log.length, big, bigSp, heroRec, heroSp, mer, merN, titles:(S.titles||[]).length}; }
/* 主角：最大漁獲的真實 3D 模型，單獨畫在透明底上（畫到離屏目標再讀回像素），疊在遊戲畫面上 */
async function heroFish(sp){ const M=window.__MDL, W=window.__W, T=THREE; if(!M||!sp||!W) return null;
  if(!M.fishReady(sp.id)){ if(M.want) M.want(sp.id); for(let i=0;i<40&&!M.fishReady(sp.id);i++) await new Promise(r=>setTimeout(r,100)); if(!M.fishReady(sp.id)) return null; }
  let f=null; try{ f=M.fish(sp); }catch(e){ return null; } if(!f||!f.group) return null;
  const g=f.group, scn=new T.Scene(); g.position.set(0,0,0); g.rotation.set(0,0,0); g.scale.setScalar(1); g.visible=true; scn.add(g); g.updateMatrixWorld(true);
  let b=new T.Box3().setFromObject(g), sz=b.getSize(new T.Vector3()); if(sz.z>sz.x){ g.rotation.y=Math.PI/2; g.updateMatrixWorld(true); b=new T.Box3().setFromObject(g); sz=b.getSize(new T.Vector3()); }
  g.rotation.z=.14; g.updateMatrixWorld(true); b=new T.Box3().setFromObject(g); sz=b.getSize(new T.Vector3()); const c=b.getCenter(new T.Vector3());
  scn.add(new T.HemisphereLight(0xfff3e0,0x2a3a40,1.25)); const key=new T.DirectionalLight(0xffffff,1.6); key.position.set(-2,4,5); scn.add(key); const rim=new T.DirectionalLight(0x9fd0ff,1.1); rim.position.set(3,1,-4); scn.add(rim);
  const Wd=1024, Hd=512, cam=new T.PerspectiveCamera(24,Wd/Hd,.01,100), fitW=sz.x*1.08/(2*Math.tan(12*Math.PI/180)*cam.aspect), fitH=sz.y*1.2/(2*Math.tan(12*Math.PI/180));
  cam.position.set(c.x,c.y,c.z+Math.max(fitW,fitH)+sz.z/2); cam.lookAt(c);
  const R=W.renderer, rt=new T.WebGLRenderTarget(Wd,Hd,{format:T.RGBAFormat}), old=R.getRenderTarget(), oc=R.getClearColor(new T.Color()), oa=R.getClearAlpha(), ot=R.toneMapping, oe=R.outputEncoding;
  const px=new Uint8Array(Wd*Hd*4);
  try{ R.setRenderTarget(rt); R.setClearColor(0,0); R.clear(); R.outputEncoding=T.LinearEncoding; R.render(scn,cam); R.readRenderTargetPixels(rt,0,0,Wd,Hd,px); }
  finally{ R.setRenderTarget(old); R.setClearColor(oc,oa); R.toneMapping=ot; R.outputEncoding=oe; rt.dispose(); }
  const cv=document.createElement('canvas'); cv.width=Wd; cv.height=Hd; const x=cv.getContext('2d'), id=x.createImageData(Wd,Hd);
  // 讀回來的像素上下顛倒、是線性亮度：翻轉並轉回螢幕的 sRGB
  const gm=new Uint8Array(256); for(let i=0;i<256;i++) gm[i]=Math.round(Math.pow(i/255,1/2.2)*255);
  for(let yy=0;yy<Hd;yy++){ const si=(Hd-1-yy)*Wd*4, di=yy*Wd*4; for(let k=0;k<Wd*4;k+=4){ id.data[di+k]=gm[px[si+k]]; id.data[di+k+1]=gm[px[si+k+1]]; id.data[di+k+2]=gm[px[si+k+2]]; id.data[di+k+3]=px[si+k+3]; } }
  x.putImageData(id,0,0); return cv; }
function wkg(w){ return w>=1?(w>=100?Math.round(w).toLocaleString():w.toFixed(1))+' kg':Math.round(w*1000)+' g'; }
/* 主角鏡頭：魚放進真正的遊戲場景裡（同一套燈光、水面、倒影、水下層），在鏡頭前方躍出水面，
   身體一半還在水裡、濺起水花與水圈；鏡頭貼近水面往上拍。以前是把魚另外畫好再貼上去，光線對不上、像浮在畫面上 */
async function heroShot(sp,rec){ const W=window.__W, M=window.__MDL, P=window.__PROPS, G=window.__G, T=THREE; if(!W||!M||!sp) return null;
  if(!M.fishReady(sp.id)){ if(M.want) M.want(sp.id); for(let i=0;i<50&&!M.fishReady(sp.id);i++) await new Promise(r=>setTimeout(r,100)); if(!M.fishReady(sp.id)) return null; }
  let f=null; try{ f=M.fish(sp); }catch(e){ return null; } if(!f||!f.group) return null;
  const g=f.group, L=Math.max(.3,rec.L||sp.len[1]/100); g.scale.setScalar(L); g.visible=true; g.traverse(o=>{ o.visible=true; o.frustumCulled=false; }); W.scene.add(g); if(window.__seeThrough) window.__seeThrough(g);
  const cam=W.camera, base=new T.Vector3(); cam.getWorldPosition(base); const fwd=new T.Vector3(); cam.getWorldDirection(fwd); fwd.y=0; if(fwd.lengthSq()<1e-4) fwd.set(0,0,-1); fwd.normalize();
  const dist=L*1.9+2.5, fx=base.x+fwd.x*dist, fz=base.z+fwd.z*dist, wy=W.swell?W.swell(fx,fz,G?G.t:0):0;
  g.rotation.order='YXZ'; g.rotation.set(0,Math.atan2(fwd.x,fwd.z),.42); g.position.set(fx,wy+L*.12,fz);
  if(P&&P.splash){ P.splash(fx,wy,fz,90,2.2+L*.4); P.splash(fx-fwd.z*L*.35,wy,fz+fwd.x*L*.35,50,1.6+L*.3); } if(W.addRipple){ W.addRipple(fx,fz,1.2+L*.3); W.addRipple(fx+fwd.z*L*.3,fz-fwd.x*L*.3,.8+L*.2); }
  await new Promise(r=>setTimeout(r,420));   /* 讓水花噴起來 */
  // 低角度機位：在玩家與魚之間、離水面不到一公尺，略往上看
  // 低角度機位：把遊戲鏡頭暫時從玩家身上拿下來，直接放到水面附近對準魚拍（拍完原樣裝回去）
  const parent=cam.parent, cp=cam.position.clone(), cq=cam.quaternion.clone(), cs=cam.scale.clone();
  let out=null;
  try{ const camPos=new T.Vector3(base.x+fwd.x*dist*.18,wy+Math.max(.7,L*.25),base.z+fwd.z*dist*.18), look=new T.Vector3(fx,wy+L*.28,fz);
    if(parent) parent.remove(cam); cam.position.copy(camPos); cam.scale.set(1,1,1); cam.lookAt(look); cam.updateMatrixWorld(true);
    if(W.U&&W.U.uEye) W.U.uEye.value.copy(camPos);
    if(W.render) W.render(); else W.renderer.render(W.scene,cam);
    const src=W.renderer.domElement; out=document.createElement('canvas'); out.width=src.width; out.height=src.height; out.getContext('2d').drawImage(src,0,0); }
  catch(e){ out=null; }
  finally{ if(parent) parent.add(cam); cam.position.copy(cp); cam.quaternion.copy(cq); cam.scale.copy(cs); cam.updateMatrixWorld(true); W.scene.remove(g); }
  return out; }
/* 版面：上半部真實遊戲畫面＋最大漁獲的 3D 模型＋一句挑戰；下半部是老漁人《漁獲簿》的紙頁：玩家、數據、十四枚魚王印章、故事航線 */
async function draw(opt){ opt=opt||{}; const st=stats(), cv=document.createElement('canvas'); cv.width=W0; cv.height=H0; const g=cv.getContext('2d');
  g.fillStyle='#05090d'; g.fillRect(0,0,W0,H0);
  const hs=opt.inScene&&st.heroSp?await heroShot(st.heroSp,st.heroRec):null, shot=hs||grabScene(), SH=720;
  if(shot){ const sr=shot.width/shot.height, tr=W0/SH; let sw=shot.width, sh=shot.height, sx=0, sy=0; if(sr>tr){ sw=sh*tr; sx=(shot.width-sw)/2; } else { sh=sw/tr; sy=(shot.height-sh)*(hs?.5:.3); } g.drawImage(shot,sx,sy,sw,sh,0,0,W0,SH); }   /* 主角鏡頭：魚在畫面正中，直式畫面要從中間裁 */
  // 電影感調色：上下壓暗、四角暗角
  let gr=g.createLinearGradient(0,0,0,SH); gr.addColorStop(0,'rgba(0,0,0,.55)'); gr.addColorStop(.28,'rgba(0,0,0,0)'); gr.addColorStop(.7,'rgba(0,0,0,.05)'); gr.addColorStop(1,'rgba(5,9,13,.92)'); g.fillStyle=gr; g.fillRect(0,0,W0,SH);
  gr=g.createRadialGradient(W0/2,SH*.45,SH*.35,W0/2,SH*.45,SH*.95); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.45)'); g.fillStyle=gr; g.fillRect(0,0,W0,SH);
  // 片名：金色描邊的大字
  g.textAlign='left'; g.textBaseline='alphabetic'; g.font=`900 118px ${SERIF}`; g.lineWidth=6; g.strokeStyle='rgba(60,36,8,.85)'; g.strokeText('濕地垂釣',58,150);
  gr=g.createLinearGradient(0,40,0,160); gr.addColorStop(0,'#fff4d2'); gr.addColorStop(1,'#e6b85c'); g.fillStyle=gr; g.fillText('濕地垂釣',58,150);
  g.font=`600 30px ${SANS}`; g.fillStyle='rgba(255,244,214,.92)'; g.shadowColor='rgba(0,0,0,.8)'; g.shadowBlur=10; g.fillText('真實湖景、海釣、冰湖、傳說中的美人魚',62,200); g.shadowBlur=0;
  // 主角魚
  const hero=!hs&&st.heroSp?await heroFish(st.heroSp):null;
  if(hero){ const hc=document.createElement('canvas'); hc.width=hero.width; hc.height=hero.height; const hx=hc.getContext('2d'); hx.drawImage(hero,0,0);
    // 下面約四分之一沒在水裡：用漸層把魚的下緣淡掉，看起來是從水裡躍出來，不是浮在畫面上
    hx.globalCompositeOperation='destination-out'; const m=hx.createLinearGradient(0,hc.height*.62,0,hc.height*.9); m.addColorStop(0,'rgba(0,0,0,0)'); m.addColorStop(1,'rgba(0,0,0,1)'); hx.fillStyle=m; hx.fillRect(0,0,hc.width,hc.height);
    // 依場景的光線壓暗（夜裡、黃昏不會是一隻打著棚燈的魚）
    const lt=Math.max(.35,Math.min(1,(window.__W&&window.__W.info&&window.__W.info.light)||1)); if(lt<1){ hx.globalCompositeOperation='source-atop'; hx.fillStyle=`rgba(8,14,22,${(1-lt)*.75})`; hx.fillRect(0,0,hc.width,hc.height); }
    g.drawImage(hc,20,SH-430,1040,520);
  }
  // 霜汐拍立得：最近收到的月鱗畫像，用膠帶斜貼在右上角的天空處
  const S0=window.__SAVE||{}, mg=(S0.merGift||[]).slice(-1)[0];
  if(mg){ const im=await new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=()=>r(null); i.src='media/mergift/'+mg; });
    if(im){ g.save(); g.translate(905,190); g.rotate(.09); g.shadowColor='rgba(0,0,0,.55)'; g.shadowBlur=24; g.shadowOffsetY=10; g.fillStyle='#f7f3ea'; g.fillRect(-130,-150,260,310); g.shadowBlur=0; g.shadowOffsetY=0;
      const iw=230, ih=230; g.drawImage(im,-iw/2,-135,iw,ih);
      g.fillStyle='#3a2a18'; g.font=`700 30px ${SERIF}`; g.textAlign='center'; g.fillText('霜汐',0,135);
      g.fillStyle='#8a7350'; g.font=`500 18px ${SANS}`; g.fillText(`月鱗畫像 ${(S0.merGift||[]).length}/${window.__MERGIFT?window.__MERGIFT.count():8}`,0,156-4);
      g.rotate(-.12); g.fillStyle='rgba(235,225,190,.75)'; g.fillRect(-48,-168,96,34); g.restore(); g.textAlign='left'; } }
  // 一句挑戰（用自己的最大漁獲當鉤子）
  if(st.heroRec&&st.heroSp){ const line1=`我拉起了 ${wkg(st.heroRec.w)} 的${st.heroSp.name}`; g.textAlign='right'; g.font=`900 54px ${SERIF}`; g.lineWidth=8; g.strokeStyle='rgba(0,0,0,.75)'; g.strokeText(line1,W0-48,SH-62); g.fillStyle='#fff'; g.fillText(line1,W0-48,SH-62);
    g.font=`800 34px ${SANS}`; g.fillStyle='#ffd56a'; g.strokeText('你呢？',W0-48,SH-16); g.fillText('你呢？',W0-48,SH-16); g.textAlign='left'; }
  // 下半部：漁獲簿紙頁
  const PY=SH+6, PH=H0-PY-150; g.save(); rr(g,30,PY,W0-60,PH,18); g.clip();
  if(paper.complete&&paper.naturalWidth) g.drawImage(paper,30,PY,W0-60,PH); else { g.fillStyle='#e9dcbc'; g.fillRect(30,PY,W0-60,PH); }
  gr=g.createLinearGradient(30,0,W0-30,0); gr.addColorStop(0,'rgba(90,60,25,.35)'); gr.addColorStop(.06,'rgba(90,60,25,0)'); gr.addColorStop(.94,'rgba(90,60,25,0)'); gr.addColorStop(1,'rgba(90,60,25,.3)'); g.fillStyle=gr; g.fillRect(30,PY,W0-60,PH); g.restore();
  const INK='#2c1d0c', INK2='#6b5030';
  let y=PY+64; g.fillStyle=INK; g.font=`900 44px ${SERIF}`; g.fillText(`Lv ${st.lv}`,66,y); g.font=`900 44px ${SERIF}`; g.fillText(`「${st.title||'新手漁人'}」`,220,y);
  g.textAlign='right'; g.fillStyle=INK2; g.font=`600 26px ${SANS}`; g.fillText(`漁獲 ${st.total.toLocaleString()} 尾　圖鑑 ${st.dex}/${st.dexN}　稱號 ${st.titles}`,W0-66,y-4); g.textAlign='left';
  g.strokeStyle='rgba(60,40,15,.35)'; g.lineWidth=2; g.beginPath(); g.moveTo(66,y+20); g.lineTo(W0-66,y+20); g.stroke();
  // 十四枚魚王印章：擊敗的蓋紅印，沒擊敗的只有淡淡的墨線
  y+=46; g.fillStyle=INK2; g.font=`700 26px ${SANS}`; g.fillText(`大師挑戰　${st.won}／${st.wonN}`,66,y+6);
  const cols=7, cw=(W0-132)/cols, r=42; st.bosses.forEach((b,i)=>{ const cx=66+cw*(i%cols)+cw/2, cy=y+62+Math.floor(i/cols)*104;
    g.save(); g.translate(cx,cy); g.rotate((i%3-1)*.08);
    if(b.ok){ g.fillStyle='rgba(178,38,28,.86)'; rr(g,-r,-r,r*2,r*2,12); g.fill(); g.strokeStyle='rgba(255,230,210,.55)'; g.lineWidth=2; rr(g,-r+6,-r+6,r*2-12,r*2-12,8); g.stroke(); g.fillStyle='#fff3e6'; }
    else { g.strokeStyle='rgba(60,40,15,.28)'; g.lineWidth=2; g.setLineDash([5,5]); rr(g,-r,-r,r*2,r*2,12); g.stroke(); g.setLineDash([]); g.fillStyle='rgba(60,40,15,.32)'; }
    const n0=b.n.replace(/^巨型/,''), nm=n0.length>4?n0.slice(0,4):n0; g.textAlign='center'; g.font=`900 ${nm.length>3?22:26}px ${SERIF}`;
    if(nm.length<=2) g.fillText(nm,0,9); else { g.fillText(nm.slice(0,2),0,-4); g.fillText(nm.slice(2),0,26); }
    g.restore(); });
  g.textAlign='left';
  // 故事航線：八章，走過的實線、還沒走的虛線
  y+=246; g.fillStyle=INK2; g.font=`700 26px ${SANS}`; g.fillText('故事',66,y); g.textAlign='right'; g.fillText(st.epi?`後日談 ${st.epi}/5`:`${st.main.filter(m=>m.ok).length}／8 章`,W0-66,y); g.textAlign='left';
  const n=st.main.length, x0=96, x1=W0-96, step=(x1-x0)/(n-1), cy=y+38, last=st.main.map(m=>m.ok).lastIndexOf(true);
  g.lineWidth=4; g.strokeStyle='rgba(60,40,15,.3)'; g.setLineDash([8,8]); g.beginPath(); g.moveTo(x0,cy); g.lineTo(x1,cy); g.stroke(); g.setLineDash([]);
  if(last>0){ g.strokeStyle='#8a5a1c'; g.beginPath(); g.moveTo(x0,cy); g.lineTo(x0+step*last,cy); g.stroke(); }
  st.main.forEach((m,i)=>{ const x=x0+step*i; g.beginPath(); g.arc(x,cy,m.ok?14:10,0,Math.PI*2); g.fillStyle=m.ok?'#8a5a1c':'rgba(60,40,15,.25)'; g.fill(); g.textAlign='center'; g.fillStyle=m.ok?INK:'rgba(60,40,15,.45)'; g.font=`700 24px ${SERIF}`; g.fillText(m.n,x,cy+40); });
  g.textAlign='left';
  // 底部邀請
  y=H0-128; g.fillStyle='#ffd56a'; rr(g,30,y,W0-60,104,22); g.fill();
  if(qr.complete&&qr.naturalWidth) g.drawImage(qr,W0-30-14-88,y+8,88,88);
  g.fillStyle='#2a1a00'; g.font=`900 40px ${SERIF}`; g.fillText('免下載・手機打開就能玩',62,y+50); g.font=`700 26px ${SANS}`; g.fillText(URL,64,y+88);
  return cv; }
/* 預覽視窗：分享（手機叫出分享選單，可以直接選 Threads）、儲存圖片 */
const st=document.createElement('style'); st.textContent=`#poster{position:fixed;inset:0;z-index:62;background:rgba(0,0,0,.86);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:14px}
#poster img{max-width:min(92vw,460px);max-height:72vh;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.6)}#poster .row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
#poster button{padding:11px 18px;border-radius:999px;border:1px solid rgba(255,213,106,.6);background:#2a1f0e;color:#ffe9a8;font-size:15px;font-weight:800;font-family:inherit}#poster button.pri{background:#ffd56a;color:#2a1a00}#poster small{color:#9fb3c2;font-size:12px}`;
document.head.appendChild(st);
async function open(){ const cv=await draw({inScene:true}), url=cv.toDataURL('image/jpeg',.9), el=document.createElement('div'); el.id='poster';
  el.innerHTML=`<img src="${url}" alt="戰績海報"><div class="row"><button class="pri" data-k="share">📤 分享</button><button data-k="save">💾 儲存圖片</button><button data-k="x">關閉</button></div><small>分享時選 Threads 就能直接貼文</small>`;
  document.body.appendChild(el);
  el.addEventListener('click',async e=>{ const k=e.target.closest('[data-k]'); if(!k) return; const a=k.dataset.k;
    if(a==='x'){ el.remove(); return; }
    const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.92)), file=new File([blob],'swamp-angler.jpg',{type:'image/jpeg'});
    if(a==='share'&&navigator.canShare&&navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],text:'我在《濕地垂釣》的旅程 🎣 免下載，手機打開就能玩：https://'+URL+'/'}); }catch(_){} return; }
    const link=document.createElement('a'); link.href=URL_.createObjectURL(blob); link.download='swamp-angler.jpg'; document.body.appendChild(link); link.click(); link.remove(); }); }
const URL_=window.URL;
window.__POSTER={open,draw};
})();
