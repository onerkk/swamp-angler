/* ===== 樂趣系統：起鉤計時、拋竿距離、連擊、尺寸獎牌、魚群熱點、寶物、釣魚大賽、拍照、美人魚相遇 ===== */
const ITEMS=[
 {id:'boot',name:'破舊雨靴',file:'item_rubber_boots.glb',w:1.4,val:8,size:.45,rare:0,p:24,desc:'不知道誰掉的雨靴，裡面還躲著一隻小蝌蚪。'},
 {id:'tyre',name:'廢棄輪胎',file:'item_old_tyre.glb',w:6,val:15,size:.7,rare:0,p:16,desc:'有人把輪胎丟進濕地，順手清掉，算是做了件好事。'},
 {id:'jug',name:'生鏽鐵壺',file:'item_metal_jug.glb',w:1.1,val:40,size:.35,rare:0,p:20,desc:'老式鐵壺，洗乾淨或許能賣給古董商。'},
 {id:'compass',name:'航海羅盤',file:'item_seadogs_compass.glb',w:.5,val:250,size:.3,rare:2,p:10,desc:'黃銅羅盤。拿到的瞬間，指針指向了一群正在覓食的魚。'},
 {id:'watch',name:'古董懷錶',file:'item_pocket_watch.glb',w:.2,val:400,size:.25,rare:2,p:8,desc:'背面刻著名字和年份，指針停在午夜。帶著它，好運加滿。'},
 {id:'chest',name:'沉沒的寶箱',file:'item_treasure_chest.glb',w:18,val:1200,size:.9,rare:3,p:4,desc:'滿滿的舊金幣！今天是你的幸運日。'},
 {id:'hairpin',name:'褪色的髮簪',file:'item_hairpin.glb',w:.05,val:0,size:.22,rare:3,p:0,desc:'銀質髮簪，花瓣已經褪色。背面刻著一個「蘅」字。釣起來的時候，水面安靜得不像話。'}];
const ITEM_SP={id:'item',name:'物品',rar:0,len:[30,30],k:1,price:0,sh:{H:.1,W:.1},f:{pow:.7,spd:.4,agi:.3,jump:0,stam:.6,win:1.5},time:{},desc:''};

function createFun(W,P,AT,c){
'use strict';
const T=THREE, $=id=>document.getElementById(id), G=c.G;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, rand=(a,b)=>a+Math.random()*(b-a);

/* ---------- 起鉤計時（仿參考影片的直立量表） ---------- */
const hk={on:false,t:0,win:1.8,w:3.5,ph:0,good:.3,perf:.22};
const hookEl=$('hook'), hgM=$('hgM'), htF=$('htF');
function hookStart(fd){ const r=fd.sp.rar||0, D=c.D();
  hk.on=true; hk.t=0; hk.win=1.9*(fd.sp.f.win||1)*D.win*(fd.item?1.4:1)*(1-.06*Math.min(5,r)); hk.w=(2.8+.7*r)*(.85+.25*D.jit); hk.ph=rand(0,6.28);
  hk.good=.3; hk.perf=Math.max(.1,.24-.025*r);
  $('hz2').style.bottom=(hk.good*100)+'%'; $('hz2').style.height=(hk.perf*100)+'%'; $('hz3').style.bottom=((hk.good+hk.perf)*100)+'%';
  hookEl.classList.remove('hidden'); }
const hpos=()=>.5+.5*Math.sin(hk.t*hk.w+hk.ph);
function hookPress(){ if(!hk.on) return 'miss'; const p=hpos(); hookEnd(); const r=p<hk.good?'good':p<hk.good+hk.perf?'perfect':'miss';
  pop(r==='perfect'?'完美起鉤！':r==='good'?'上鉤！':'錯過', r); return r; }
function hookEnd(){ hk.on=false; hookEl.classList.add('hidden'); }
const hookExpired=()=>hk.on&&hk.t>=hk.win;
/* ---------- 大字提示 ---------- */
const popEl=$('pop'); let popT=0;
function pop(txt,cls){ popEl.textContent=txt; popEl.className='show '+(cls||''); clearTimeout(popT); popT=setTimeout(()=>{ popEl.className=''; },1100); }
/* ---------- 拋竿距離 ---------- */
const ctEl=$('castTag'); let ctT=0;
function castTag(d){ ctEl.innerHTML='拋竿距離<b>'+d.toFixed(2)+' 米</b>'; ctEl.classList.remove('hidden'); clearTimeout(ctT); ctT=setTimeout(()=>ctEl.classList.add('hidden'),1500); }   // 只閃一下；之後由水面的距離標記接手，不重複顯示
/* ---------- 連擊 ---------- */
const cbEl=$('combo');
function combo(n){ if(n>=2){ cbEl.innerHTML='連擊 <b>×'+n+'</b><small>獎勵 +'+Math.min(n,6)*5+'%</small>'; cbEl.classList.remove('hidden'); cbEl.classList.remove('bump'); void cbEl.offsetWidth; cbEl.classList.add('bump'); } else cbEl.classList.add('hidden'); }
/* ---------- 尺寸獎牌 ---------- */
const medalLv=fd=>fd.u>=.9?3:fd.u>=.7?2:fd.u>=.4?1:0;
const MEDAL=['','🥉 銅牌尺寸','🥈 銀牌尺寸','👑 金冠尺寸'];
function medalBadge(fd){ const m=medalLv(fd), el=$('cMedal'); el.textContent=MEDAL[m]; el.classList.toggle('hidden',!m); el.className='badge md'+m+(m?'':' hidden'); }

/* ---------- 魚群熱點 ---------- */
const hot={on:false,x:0,z:0,t:0}; let hotT=rand(45,90), hotFx=0, hotRip=0;
const hotEl=$('hotChip');
function spawnHot(){ if(window.__ENDON&&window.__ENDON()) return false; const b=c.G.base, a=G.head+rand(-.5,.5), d=rand(14,30);
  const x=b.x-Math.sin(a)*d, z=b.z-Math.cos(a)*d; if(Math.hypot(x,z)>W.shoreR(Math.atan2(x,-z))-5) return false;
  Object.assign(hot,{on:true,x,z,t:55}); c.toast('🐟 魚群出現了！快拋過去','good',2000); c.vib(30); return true; }
const inHot=p=>hot.on&&Math.hypot(p.x-hot.x,p.z-hot.z)<5;
function updHot(dt){
  if(!hot.on){ hotT-=dt; if(hotT<=0){ hotT=rand(70,150); spawnHot(); } hotEl.classList.add('hidden'); return; }
  hot.t-=dt; if(hot.t<=0){ hot.on=false; c.toast('魚群散去了','',1400); return; }
  hotFx-=dt; if(hotFx<=0){ hotFx=rand(.15,.4); AT.ring(hot.x+rand(-3,3),hot.z+rand(-3,3),rand(.25,.5)); if(Math.random()<.35) P.splash(hot.x+rand(-2.5,2.5),0,hot.z+rand(-2.5,2.5),rand(3,8),.45); }
  hotRip-=dt; if(hotRip<=0){ hotRip=2.2; W.addRipple(hot.x+rand(-2,2),hot.z+rand(-2,2),.3); }
  const b=G.base, dx=hot.x-b.x, dz=hot.z-b.z, d=Math.hypot(dx,dz), fwd=G.head+G.yaw;
  let rel=Math.atan2(-dx,-dz)-fwd; while(rel>Math.PI) rel-=6.283; while(rel<-Math.PI) rel+=6.283;
  const arrow=Math.abs(rel)<.2?'⬆':rel>0?(rel>1.2?'⬅':'↖'):(rel<-1.2?'➡':'↗');
  hotEl.innerHTML='🐟 魚群 '+arrow+' '+Math.round(d)+' m <small>'+Math.ceil(hot.t)+' 秒</small>'; hotEl.classList.remove('hidden'); }

/* ---------- 寶物與雜物 ---------- */
const itemSrc={}; const gl=T.GLTFLoader?new T.GLTFLoader():null;
if(gl) for(const it of ITEMS) gl.load(it.file,g=>{ const s=g.scene, box=new T.Box3().setFromObject(s), sz=box.getSize(new T.Vector3()), ctr=box.getCenter(new T.Vector3());
  const k=1/Math.max(sz.x,sz.y,sz.z), wrap=new T.Group(); s.position.sub(ctr).multiplyScalar(k); s.scale.multiplyScalar(k); wrap.add(s); itemSrc[it.id]=wrap; },undefined,()=>{});
function rollItem(){ let tot=0; for(const it of ITEMS) tot+=it.p; let r=Math.random()*tot; for(const it of ITEMS){ r-=it.p; if(r<=0) return it; } return ITEMS[0]; }
function itemFish(it){ const g=new T.Group(); const src=itemSrc[it.id];
  if(src) g.add(src.clone(true)); else g.add(new T.Mesh(new T.IcosahedronGeometry(.5,2),new T.MeshStandardMaterial({color:0x4a4436,roughness:.8})));
  g.traverse(o=>{ o.frustumCulled=false; }); return {group:g,uni:{uSwim:{value:0},uAmp:{value:0}},sp:ITEM_SP}; }
function itemCard(fd,show){ const it=fd.item, R=c.RAR[it.rare];
  $('catch').style.setProperty('--rc',it.rare>=2?R.col:'#9aa4ac');
  $('cLv').textContent='—'; $('cName').textContent=it.name; $('cRar').textContent=it.rare>=2?'寶物 TREASURE':'雜物 JUNK'; $('cSci').textContent='';
  $('cLen').textContent='—'; $('cW').textContent=fd.w.toFixed(1)+' kg'; $('cVal').textContent='🪙 '+fd.value.toLocaleString(); $('cDesc').textContent=it.desc;
  $('cXp').textContent=''; $('cNew').classList.add('hidden'); $('cMedal').classList.add('hidden');
  $('bSell').textContent='收下'; $('bSell').classList.remove('hidden'); $('bRel').classList.add('hidden');
  const tag=$('tag'); tag.style.animation='none'; void tag.offsetWidth; tag.style.animation='';
  show(); c.Snd.fanfare(it.rare>=2?it.rare:0); }
function itemEffect(it){ if(it.id==='compass'){ hotT=0; } else if(it.id==='watch'){ G.luck=.25; } }

/* ---------- 釣魚大賽（5 分鐘，比總重量） ---------- */
const RIV=['老王','釣魚阿伯','小美','阿凱','鬼頭刀阿明'];
const tour={on:false,t:0,me:0,riv:[]}; const tourEl=$('tour'), dlg=$('tourDlg');
const PRIZE=[750,350,150];
function tourOpen(){ if(tour.on) return; $('tourBody').innerHTML='和 5 位釣友比 <b>5 分鐘內釣到的總重量</b>。<br>報名費 🪙100，前三名獎金：🥇750 🥈350 🥉150。<br>小技巧：魚群熱點和大魚最能拉開差距。';
  $('tourGo').textContent='報名開賽（🪙100）'; $('tourGo').dataset.mode='start'; dlg.classList.remove('hidden'); }
function tourStart(){ if(c.save.coins<100){ c.toast('金幣不夠報名','bad'); return; }
  c.save.coins-=100; c.persist(); c.setCoins(); const lv=c.save.lv||1;
  tour.on=true; tour.t=300; tour.me=0; tour.riv=RIV.map((n,i)=>({n,s:0,next:rand(8,30),k:(.5+i*.18)*(1+lv*.06)}));
  dlg.classList.add('hidden'); c.toast('🏆 大賽開始！','good',1600); c.Snd.fanfare(1); }
function tourCatch(fd){ if(tour.on&&!fd.item){ tour.me+=fd.w; c.toast('大賽成績 +'+fd.w.toFixed(2)+' kg','good',1400); } }
let tourDraw=0;
function updTour(dt){ if(!tour.on){ tourEl.classList.add('hidden'); return; }
  tour.t-=dt;
  for(const r of tour.riv){ r.next-=dt; if(r.next<=0){ r.next=rand(14,42); r.s+=Math.exp(rand(-1.4,1.3))*r.k; } }
  tourDraw-=dt; if(tourDraw<=0||tour.t<=0){ tourDraw=.5;
    const list=[{n:'你',s:tour.me,me:true},...tour.riv].sort((a,b)=>b.s-a.s);
    const m=Math.floor(Math.max(0,tour.t)/60), s=Math.floor(Math.max(0,tour.t)%60);
    tourEl.innerHTML='<div class="th">🏆 大賽 '+m+':'+String(s).padStart(2,'0')+'</div>'+list.map((x,i)=>`<div class="tr${x.me?' me':''}"><span>${i+1}. ${x.n}</span><b>${x.s.toFixed(1)} kg</b></div>`).join('');
    tourEl.classList.remove('hidden');
    if(tour.t<=0) tourEnd(list); } }
function tourEnd(list){ tour.on=false; const rank=list.findIndex(x=>x.me)+1, prize=PRIZE[rank-1]||0;
  if(prize){ c.save.coins+=prize; c.setCoins(); }
  if(rank===1) c.save.trophies=(c.save.trophies||0)+1; c.persist();
  $('tourBody').innerHTML=`你的名次：<b>第 ${rank} 名</b>（${tour.me.toFixed(2)} kg）<br>${prize?'獎金 🪙'+prize:'這次沒拿到獎金，再接再厲！'}<br>冠軍獎盃累計：🏆×${c.save.trophies||0}`;
  $('tourGo').textContent='知道了'; $('tourGo').dataset.mode='close'; dlg.classList.remove('hidden'); c.Snd.fanfare(rank===1?4:rank<=3?2:0); }
$('bTour').addEventListener('click',tourOpen);
$('tourGo').addEventListener('click',e=>{ if(e.currentTarget.dataset.mode==='start') tourStart(); else dlg.classList.add('hidden'); });
$('tourX').addEventListener('click',()=>dlg.classList.add('hidden'));

/* ---------- 拍照留念 ---------- */
$('bPhoto').addEventListener('click',()=>{ try{
  W.render(); const src=W.renderer.domElement, cv=document.createElement('canvas'); cv.width=src.width; cv.height=src.height;
  const x=cv.getContext('2d'); x.drawImage(src,0,0); const fd=G.fd, s=cv.width/400;
  const gr=x.createLinearGradient(0,cv.height*.72,0,cv.height); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.75)'); x.fillStyle=gr; x.fillRect(0,cv.height*.72,cv.width,cv.height*.28);
  x.fillStyle='#fff'; x.font=`900 ${22*s}px sans-serif`; x.fillText(fd.item?fd.item.name:fd.sp.name,16*s,cv.height-46*s);
  x.font=`600 ${13*s}px sans-serif`; x.fillStyle='#f0d890';
  x.fillText((fd.item?'':(fd.L*100).toFixed(1)+' cm ・ ')+(fd.w<1?Math.round(fd.w*1000)+' g':fd.w.toFixed(2)+' kg')+' ・ '+new Date().toLocaleDateString('zh-TW')+' ・ 濕地垂釣',16*s,cv.height-22*s);
  const a=document.createElement('a'); a.download='濕地垂釣_'+Date.now()+'.jpg'; a.href=cv.toDataURL('image/jpeg',.92); document.body.appendChild(a); a.click(); a.remove();
  c.toast('照片已存到下載資料夾','good');
}catch(e){ c.toast('這個瀏覽器不支援拍照存檔','bad'); } });

/* ---------- 美人魚相遇（使用插畫，不再顯示簡陋 3D 模型） ---------- */
const mer=$('mer'), merImg=$('merImg'), merTx=$('merTx');
function vision(){ merImg.src='mermaid_b.jpg'; merTx.innerHTML='水面下……有什麼在發光'; mer.className='vision'; setTimeout(()=>{ if(mer.className==='vision') mer.className='hidden'; },2600); }
function mermaidScene(){ merImg.src='mermaid_a.jpg'; merTx.innerHTML='<b>美人魚</b>她靜靜看著你，彷彿早就知道你會來。<br><small>送她回家，她會留下一份謝禮。</small>'; mer.className='scene'; }
$('merX').addEventListener('click',()=>{ mer.className='hidden'; });
merImg.addEventListener('error',()=>{ if(mer.className!=='hidden') mer.className='hidden'; });

/* ---------- 目標、成就與人魚之約 ---------- */
const S=c.save;
const dexV=()=>Object.values(S.dex||{});
const maxW=()=>dexV().reduce((m,d)=>Math.max(m,d.bw||0),0);
const golds=()=>dexV().filter(d=>(d.md||0)>=3).length;
const merN=()=>(S.mer&&S.mer.n)||0;
// 依釣點自動產生「專屬魚種全收集」成就：新增魚種或釣點時會自動跟著更新
const spotAch=()=>SPOTS.map(s=>{ const ids=P.SPECIES.filter(sp=>sp.spots&&sp.spots.includes(s.id)).map(sp=>sp.id); if(!ids.length) return null;
  return ['spot_'+s.id,s.name+'行家','收集'+s.name+'的全部專屬魚種（'+ids.length+' 種）',()=>[ids.filter(id=>S.dex&&S.dex[id]).length,ids.length],600*ids.length]; }).filter(Boolean);
const ACH=[
 ['first','第一條魚','釣到第一條魚',()=>[S.total||0,1],100],
 ['gram1','鱷口脫險','划獨木舟撞開鬧場的鱷魚',()=>[S.gatorRam||0,1],600],
 ['gram10','鱷魚剋星','撞開鬧場的鱷魚 10 次',()=>[S.gatorRam||0,10],3000],
 ['ice1','冰上漁人','在冰湖釣到第一條魚',()=>[S.iceN||0,1],1500],
 ['pike','冰下霸主','釣到白斑狗魚',()=>[(S.dex&&S.dex.pike&&S.dex.pike.n)||0,1],3000],
 ['c50','釣魚老手','累計釣到 50 尾',()=>[S.total||0,50],1000],
 ['c200','濕地傳奇','累計釣到 200 尾',()=>[S.total||0,200],5000],
 ['sp6','小小圖鑑家','發現 6 種魚',()=>[dexV().length,6],800],
 ['sp15','圖鑑新手','發現 15 種魚',()=>[dexV().length,15],1500],
 ['sp30','圖鑑達人','發現 30 種魚',()=>[dexV().length,30],4000],
 ['sp45','圖鑑大師','發現 45 種魚',()=>[dexV().length,45],7000],
 ['spAll','圖鑑全收集','發現所有魚種',()=>[dexV().length,c.SPN],10000],
 ['gold1','第一頂金冠','釣到金冠尺寸的魚',()=>[golds(),1],500],
 ['gold8','金冠收藏家','8 種魚拿到金冠',()=>[golds(),8],4000],
 ['big10','十公斤巨物','釣到 10 公斤以上的魚',()=>[maxW(),10],1500],
 ['big30','濕地巨獸','釣到 30 公斤以上的魚',()=>[maxW(),30],6000],
 ['combo5','五連擊','連續釣到 5 尾',()=>[S.maxCombo||0,5],800],
 ['combo10','十連擊大師','連續釣到 10 尾',()=>[S.maxCombo||0,10],3000],
 ['perf20','起鉤神手','完美起鉤 20 次',()=>[S.perf||0,20],1500],
 ['hot10','追魚群的人','在魚群熱點釣到 10 尾',()=>[S.hotC||0,10],1200],
 ['tour1','大賽冠軍','贏得 1 次釣魚大賽',()=>[S.trophies||0,1],1500],
 ['tour5','常勝軍','贏得 5 次釣魚大賽',()=>[S.trophies||0,5],6000],
 ['item10','拾荒者','撈起 10 件物品',()=>[S.items||0,10],600],
 ['chest','尋寶人','撈到沉沒的寶箱',()=>[S.chests||0,1],1000],
 ['lv10','十級釣手','等級達到 10',()=>[S.lv||1,10],3000],
 ['mer1','傳說之約','第一次遇見美人魚',()=>[merN(),1],3000],
 ['mer5','人魚的知己','和美人魚相遇 5 次',()=>[merN(),5],15000],
 ['sea1','揚帆出海','第一次開遊艇出海',()=>[S.seaTrips||0,1],2000],
 ['scene3','美景獵人','拍下 3 種美景',()=>[Object.keys(S.scenes||{}).length,3],1200],
 ['sceneAll','美景收藏家','拍下全部 8 種美景',()=>[Object.keys(S.scenes||{}).length,8],8000]];
ACH.push(...spotAch());
const MER_NEXT=['第 1 次相遇：她會告訴你一個秘密地點','第 2 次相遇：她會送你月光餌','第 3 次相遇：人魚之竿','第 4 次相遇：人魚的祝福','第 5 次相遇：月下之歌',
  '第 6 次相遇：月光餌 ×5','第 7 次相遇：潮汐之語（傳說魚 +15%）','第 8 次相遇：人魚的鱗片（賣魚收入 +10%）','第 9 次相遇：沉船裡的金幣','第 10 次相遇：人魚的祝福・貳（稀有魚再提升）',
  '第 11 次相遇：月光餌 ×10','第 12 次相遇：滄淵的回禮','第 13 次相遇：月潮之歌（傳說魚再 +15%）','第 14 次相遇：月光餌 ×15','第 15 次相遇：月潮的守護者（賣魚收入 +20%）'];
// 第 6 次以後的禮物（加成本身在釣魚與賣魚時依相遇次數判斷）
const MER_GIFT={6:{moon:5},9:{coins:20000},11:{moon:10},12:{coins:50000},14:{moon:15},15:{coins:100000}};
const STORY=[
 ['她把一片發光的鱗片放在你掌心，用指尖在水面畫出一個位置。「月光灣……只告訴你。」','解鎖秘境：月光灣（獨木舟可前往，夜裡傳說生物最多）'],
 ['她記得你了。這次她從水底撈起一串散發微光的餌，輕輕掛在你的釣竿上。','月光餌 ×3'],
 ['她送你一根像月光般潔白的釣竿，竿身刻著看不懂的古老文字。','人魚之竿（到釣具店免費裝備）'],
 ['她握住你的手，低聲唱了一段旋律。從今以後，濕地的魚似乎都對你特別友善。','人魚的祝福：稀有魚機率永久提升'],
 ['滿月的夜裡，她在月光灣為你唱完整首歌。整片濕地的螢火蟲同時亮了起來。','成就「人魚的知己」可以領取 🪙15000'],
 ['她從水底捧起一把發光的餌，像撒星星一樣撒進你的餌盒。','月光餌 ×5'],
 ['她教你聽水的聲音。「潮水會告訴你，傳說在哪裡呼吸。」','潮汐之語：傳說魚上鉤機率永久 +15%'],
 ['她拔下一片最亮的鱗片，繫在你的釣竿上。「魚市的人會知道，這是被人魚祝福過的魚。」','人魚的鱗片：賣魚收入永久 +10%'],
 ['她帶你看湖底一艘很老很老的沉船，從船艙裡推出一只生鏽的錢箱。','金幣 🪙20000'],
 ['她又握住你的手，這次唱得更久。湖面上的月光，一路鋪到你的船邊。','人魚的祝福・貳：稀有魚機率再提升'],
 ['「這些給你，滿月的晚上用。」她把餌一顆一顆排在你的船舷上。','月光餌 ×10'],
 ['她說：「爸爸（滄淵）要我把這個交給你。」是一袋被海水磨亮的古老金幣。','滄淵的回禮 🪙50000'],
 ['她在月光灣唱起一首你從沒聽過的歌，遠方的海也跟著輕輕應和。','月潮之歌：傳說魚上鉤機率再 +15%'],
 ['她把一整串發光的餌掛在你的燈下。「這樣，湖裡的大家都知道你來了。」','月光餌 ×15'],
 ['滿月正圓。她在你面前低下頭，像當年老漁人對她那樣，輕聲說：「謝謝你，一直守著這片湖。」','稱號「月潮的守護者」・賣魚收入 +20%・🪙100000']];
const fmt=v=>v%1?v.toFixed(1):v;
function merHearts(m){ return '💗'.repeat(Math.min(m,5))+'🤍'.repeat(Math.max(0,5-m))+(m>=5?' '+'🌕'.repeat(Math.min(m-5,10))+'🌑'.repeat(Math.max(0,10-(m-5))):''); }
function goalsRender(){ const m=merN();
  let h=`<div class="merbox"><b>🧜 人魚之約</b><span>${merHearts(m)}</span><small>${m<15?'下一步：'+MER_NEXT[m]:'你已是月潮的守護者，她仍會在夜裡來看你'}</small><small style="opacity:.7">每次相遇後，她要過一段時間才會再出現</small>${m===0?'<small>提示：夜晚、起霧或深水中央，用月光餌最容易遇見她。</small>':''}</div>`;
  h+=ACH.map(a=>{ const [cur,g]=a[3](), done=cur>=g, cl=S.ach&&S.ach[a[0]];
    return `<div class="row"><div class="nm"><b>${a[1]}</b><small>${a[2]}（${fmt(Math.min(cur,g))}/${g}）</small><span class="pbar"><i style="width:${Math.min(100,cur/g*100)}%"></i></span></div><div class="rt">${cl?'<span class="eqd">已領取</span>':done?`<button class="sbtn pri" data-ach="${a[0]}">領 🪙${Math.round(a[4]*.5)}</button>`:`<small>🪙${Math.round(a[4]*.5)}</small>`}</div></div>`; }).join('');
  $('goalB').innerHTML=h; }
function goalsDot(){ $('bGoal').classList.toggle('dotn',ACH.some(a=>{ const [cur,g]=a[3](); return cur>=g&&!(S.ach&&S.ach[a[0]]); })); }
$('bGoal').addEventListener('click',()=>{ goalsRender(); $('goal').classList.remove('hidden'); });
$('goalX').addEventListener('click',()=>$('goal').classList.add('hidden'));
$('goal').addEventListener('click',e=>{ if(e.target.id==='goal') $('goal').classList.add('hidden'); const b=e.target.closest('[data-ach]'); if(!b) return;
  const a=ACH.find(x=>x[0]===b.dataset.ach); if(!a) return; S.ach=S.ach||{}; if(S.ach[a[0]]) return;
  const ac=Math.round(a[4]*.5); S.ach[a[0]]=1; S.coins+=ac; c.persist(); c.setCoins(); c.Snd.coin(); c.toast('成就達成：'+a[1]+'　🪙'+ac,'good',2200); goalsRender(); goalsDot(); });
function merMeet(){ S.mer=S.mer||{n:0}; S.mer.n++; S.mer.last=Date.now(); const n=S.mer.n;
  if(n===2){ S.baits=S.baits||{}; S.baits.moon=(S.baits.moon||0)+3; }
  const gf=MER_GIFT[n]; if(gf){ if(gf.moon){ S.baits=S.baits||{}; S.baits.moon=(S.baits.moon||0)+gf.moon; } if(gf.coins){ S.coins+=gf.coins; if(c.setCoins) c.setCoins(); } }
  G.luck=.25; c.persist(); goalsDot();
  const st=STORY[n-1]||['她又來看你了，在你的浮標旁繞了一圈才離開。','好運加滿'];
  $('stT').textContent='人魚之約　'+merHearts(n); $('stB').textContent=st[0]; $('stR').textContent='獲得：'+st[1];
  $('story').classList.remove('hidden'); c.Snd.fanfare(4); }
$('stX').addEventListener('click',()=>$('story').classList.add('hidden'));
setTimeout(goalsDot,500);
let dotT=0;
function update(dt){
  dotT-=dt; if(dotT<=0){ dotT=3; goalsDot(); }
  if(hk.on){ hk.t+=dt; hgM.style.bottom=(hpos()*100)+'%'; htF.style.height=(clamp(1-hk.t/hk.win,0,1)*100)+'%'; }
  updHot(dt); updTour(dt);
}
// 落點和魚群的關係：砸在正中間會把魚群嚇散；落在魚群前方最好
function hotHit(p){ if(!hot.on) return null; const d=Math.hypot(p.x-hot.x,p.z-hot.z); if(d<1.6){ hot.on=false; hot.t=0; hotEl.classList.add('hidden'); return 'center'; } return d<5?'in':null; }
return {hotHit,items:ITEMS,spawnHot,goalsDot,merMeet,ITEM_SP,hookStart,hookPress,hookEnd,hookExpired,pop,castTag,combo,medalLv,medalBadge,inHot,rollItem,itemFish,itemCard,itemEffect,tourCatch,vision,mermaidScene,update};
}
