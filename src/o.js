/* ===== 天賦與大師挑戰 ===== */
const TAL={
  cast:{n:'遠投',i:'🎯',d:r=>`拋投距離 +${r*4}%，稀有魚需要的拋投距離 −${r*5}%`},
  power:{n:'力量',i:'💪',d:r=>`線張力 −${r*3}%，爆線累積 −${r*5}%`},
  sea:{n:'海洋',i:'🌊',d:r=>`海上稀有魚 +${r*8}%，鯊魚搶魚機率 −${r*12}%，閃避少點 ${Math.floor(r/2)} 下`}};
const TAL_MAX=6, TAL_RESET=5000;
const BOSS=[
  {id:'gar',lv:15,name:'巨型鱷雀鱔',sp:'gar',loc:'lake',zone:'deep',per:['dusk','night'],size:1.5,pow:1.35,title:'鱷雀鱔獵人',hint:'深水中央・黃昏或夜晚',coins:15000,cry:2},
  {id:'flat',lv:18,name:'鯰魚之王',sp:'flathead',loc:'lake',zone:'wood',per:['night'],size:1.45,pow:1.45,title:'鯰魚王者',hint:'倒木區・夜晚',coins:20000,cry:3},
  {id:'marlin',lv:20,name:'旗魚王',sp:'marlin',loc:'sea',zone:'blue',per:['dawn','day'],size:1.35,pow:1.5,title:'怒海旗手',hint:'遠洋深藍・清晨或白天',coins:30000,cry:4},
  {id:'gw',lv:25,name:'大白鯊女王',sp:'gwhite',loc:'sea',zone:'blue',per:['dusk','night'],size:1.3,pow:1.6,title:'深海霸主',hint:'遠洋深藍・黃昏或夜晚',coins:50000,cry:6},
  {id:'king',lv:24,name:'深淵海王',sp:'seaking',loc:'sea',zone:'blue',per:['night'],size:1,pow:1.75,title:'海王征服者',hint:'遠洋深藍・夜晚',coins:80000,cry:10}];
const PER_NAME={dawn:'清晨',day:'白天',dusk:'黃昏',night:'夜晚'};

function createTalents(c){
'use strict';
const S=c.save; S.tal=S.tal||{cast:0,power:0,sea:0}; S.boss=S.boss||{}; S.titles=S.titles||[];
const spent=()=>Object.values(S.tal).reduce((a,b)=>a+b,0), pts=()=>Math.max(0,(S.lv||1)-4)-spent(), rank=b=>S.tal[b]||0;
function apply(g){ g.rod.cast*=1+.04*rank('cast'); g.rod.tens*=1-.03*rank('power'); return g; }

/* Boss：指定釣點與時段，咬餌時 30% 機率出現，連續 4 次沒出現就保證出現 */
let tries=0;
function bossRoll(){ const b=BOSS.find(x=>x.id===S.bossOn); if(!b) return null;
  if(c.loc()!==b.loc||c.zoneId()!==b.zone||b.per.indexOf(c.period())<0) return null;
  tries++; if(Math.random()<.3||tries>=4){ tries=0; return b; } return null; }
function applyBoss(G,SPECIES,RAR){ const b=bossRoll(); if(!b) return false; const sp=SPECIES.find(x=>x.id===b.sp); if(!sp) return false;
  const L=sp.len[1]/100*b.size, w=sp.k*L*L*L, sp2=Object.assign({},sp);
  G.sp=sp2; G.fd={sp:sp2,L,w,u:1,lvl:99,boss:b,value:Math.round(sp.price*Math.pow(w+.3,.85)*RAR[sp.rar].mult*2.5),xpMul:3};
  c.toast('👑 有什麼巨大的東西在靠近……','warn',2400); c.vib([60,40,60]); return true; }
function bossWin(fd){ const b=fd.boss, first=!S.boss[b.id]; S.boss[b.id]=(S.boss[b.id]||0)+1; S.bossOn=null; if(window.__STORY) window.__STORY.onBoss(b.id);
  let bxp=0; if(first){ S.coins+=b.coins; S.mat=S.mat||{}; S.mat.crystal=(S.mat.crystal||0)+b.cry; if(S.titles.indexOf(b.title)<0) S.titles.push(b.title); c.setCoins(); if(c.addXP&&window.__LVINFO){ bxp=Math.round(window.__LVINFO.xpNext(S.lv||1)*.3); c.addXP(bxp); } }
  showTitle(); c.persist(); setTimeout(()=>c.toast(first?`👑 擊敗${b.name}！稱號「${b.title}」・🪙${b.coins.toLocaleString()}・💎×${b.cry}${bxp?'・經驗 '+bxp.toLocaleString():''}`:`👑 再次擊敗${b.name}！`,'good',4200),1600); c.Snd.fanfare(2); dot(); }

/* Boss 登場演出與光暈 */
const T=THREE, bc=document.createElement('canvas'); bc.width=bc.height=128; { const x=bc.getContext('2d'), gr=x.createRadialGradient(64,64,4,64,64,64); gr.addColorStop(0,'rgba(255,230,140,.9)'); gr.addColorStop(.35,'rgba(255,150,60,.45)'); gr.addColorStop(1,'rgba(255,80,40,0)'); x.fillStyle=gr; x.fillRect(0,0,128,128); }
const aura=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(bc),blending:T.AdditiveBlending,depthWrite:false,transparent:true})); aura.renderOrder=6;
const bb=document.createElement('div'); bb.id='bossBan'; bb.className='hidden'; document.body.appendChild(bb);
const fl=document.createElement('div'); fl.id='bossFlash'; document.body.appendChild(fl);
let auraOn=null;
function bossIntro(G,fx){ const b=G.fd&&G.fd.boss; if(!b) return;
  bb.innerHTML=`<b>👑 ${b.name}</b><small>大師挑戰・Boss 出現！</small>`; bb.classList.remove('hidden','out'); void bb.offsetWidth; bb.classList.add('in');
  setTimeout(()=>bb.classList.add('out'),2600); setTimeout(()=>bb.classList.add('hidden'),3300);
  fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
  c.vib([120,60,220,60,120]); if(fx) fx(b);
  if(G.fish&&G.fish.group){ auraOn=G.fish.group; auraOn.add(aura); aura.position.set(0,0,0); } }
function tick(G){ if(!auraOn) return; const live=G.fd&&G.fd.boss&&G.fish&&G.fish.group===auraOn&&['fight','land','catch'].indexOf(G.state)>=0;
  if(!live){ auraOn.remove(aura); auraOn=null; return; } const t=performance.now()*.004; aura.scale.setScalar(2.6+.5*Math.sin(t)); aura.material.opacity=.55+.25*Math.sin(t*1.7); }
/* 主畫面稱號 */
const lv=document.getElementById('lvN'); let tEl=null;
if(lv&&lv.closest('.chip')){ tEl=document.createElement('small'); tEl.id='titleC'; lv.closest('.chip').appendChild(tEl); }
function showTitle(){ if(!tEl) return; const t=S.titleSel&&S.titles.indexOf(S.titleSel)>=0?S.titleSel:S.titles[S.titles.length-1]; tEl.textContent=t?'「'+t+'」':''; tEl.style.display=t?'':'none'; }
showTitle();
/* 介面 */
const st=document.createElement('style'); st.textContent=`
#talBtn{position:relative}#talBtn.dot::after{content:'';position:absolute;top:2px;right:2px;width:9px;height:9px;border-radius:50%;background:#ff5a4a}
#talBox{position:fixed;inset:0;z-index:9;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}
#talBox.hidden{display:none}
#talBox .tb{width:min(560px,100%);max-height:86vh;overflow:auto;touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:rgba(18,22,26,.97);border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));color:var(--fg)}
#talBox h3{margin:0 0 4px;font-size:20px;display:flex;justify-content:space-between;align-items:center}
#talBox .pt{font-size:13px;color:#ffd56a;margin-bottom:6px}#talBox .sec{margin:14px 0 4px;font-size:13px;color:var(--fg-dim)}
#talBox .pips{letter-spacing:2px;color:#ffd56a}#talBox .tk{padding:6px 10px;margin:4px 0;border-radius:10px;background:rgba(255,255,255,.05);font-size:13px}#talBox .tk b{color:#ffd56a}#talBox .ttl{display:inline-block;margin:4px 6px 0 0;padding:4px 10px;border-radius:999px;border:1px solid rgba(255,213,106,.4);background:rgba(255,213,106,.08);color:#ffe9a8;font-size:13px}#talBox .ttl.on{background:#ffd56a;color:#2a1a00;font-weight:800}
#titleC{display:block;font-size:10px;color:#ffd56a;font-weight:800;line-height:1;margin-top:1px;white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis}
#bossBan{position:fixed;left:50%;top:30%;transform:translate(-50%,-50%) scale(.6);z-index:25;text-align:center;padding:14px 28px;border-radius:18px;background:linear-gradient(135deg,rgba(60,10,10,.92),rgba(120,40,10,.92));border:2px solid #ffd56a;box-shadow:0 0 40px rgba(255,150,60,.7);opacity:0;pointer-events:none;transition:transform .35s cubic-bezier(.2,1.6,.4,1),opacity .35s}
#bossBan.in{opacity:1;transform:translate(-50%,-50%) scale(1)}#bossBan.out{opacity:0;transform:translate(-50%,-60%) scale(.9)}#bossBan.hidden{display:none}
#bossBan b{display:block;font-size:30px;color:#ffe9a8;letter-spacing:2px;text-shadow:0 2px 12px rgba(255,120,40,.9)}#bossBan small{display:block;margin-top:4px;font-size:13px;color:#ffd0a0;font-weight:700}
#bossFlash{position:fixed;inset:0;z-index:24;background:#fff;opacity:0;pointer-events:none}#bossFlash.go{animation:bfl .6s ease-out}@keyframes bfl{0%{opacity:.85}100%{opacity:0}}#talBox .lock{color:var(--fg-dim);font-size:12px}#talBox .on{color:#7ff0a8;font-weight:800}`;
document.head.appendChild(st);
const box=document.createElement('div'); box.id='talBox'; box.className='hidden'; box.innerHTML='<div class="tb"></div>'; document.body.appendChild(box);
const btn=document.createElement('button'); btn.className='chip sm'; btn.id='talBtn'; btn.setAttribute('aria-label','天賦與挑戰'); btn.textContent='⭐';
const t2=document.getElementById('top2'); if(t2) t2.appendChild(btn);
function dot(){ btn.classList.toggle('dot',pts()>0||(!S.bossOn&&BOSS.some(b=>(S.lv||1)>=b.lv&&!S.boss[b.id]))); }
const row=(a,b,r)=>`<div class="row"><div class="nm"><b>${a}</b><small>${b}</small></div><div class="rt">${r}</div></div>`;
function render(){ const p=pts();
  let h=`<h3>天賦與大師挑戰<button class="sbtn" data-t="x">✕</button></h3>`;
  h+=`<div class="pt">${(S.lv||1)<5?'Lv 5 起每升一級得 1 點天賦':`可用天賦點：${p}（Lv ${S.lv}，已用 ${spent()}）`}</div>`;
  for(const k in TAL){ const r=rank(k), T=TAL[k];
    h+=row(`${T.i} ${T.n} <span class="pips">${'●'.repeat(r)}${'○'.repeat(TAL_MAX-r)}</span>`,r?T.d(r):'尚未投入',r>=TAL_MAX?'<span class="on">滿級</span>':`<button class="sbtn${p>0?' pri':''}" data-t="add" data-v="${k}">＋1</button>`); }
  if(spent()>0) h+=`<div style="text-align:right;margin-top:6px"><button class="sbtn danger" data-t="reset">重置天賦（🪙${TAL_RESET.toLocaleString()}）</button></div>`;
  h+='<div class="sec">大師挑戰：接受後，在指定釣點與時段會遇到 Boss。Boss 體型巨大、拉力極強，建議先強化裝備。</div>';
  for(const b of BOSS){ const done=S.boss[b.id], on=S.bossOn===b.id, lock=(S.lv||1)<b.lv;
    const sub=lock?`<span class="lock">Lv ${b.lv} 解鎖</span>`:`${b.hint}<br>首勝：稱號「${b.title}」・🪙${b.coins.toLocaleString()}・💎×${b.cry}${done?`<br>已擊敗 ${done} 次`:''}`;
    const r=lock?'🔒':on?'<span class="on">進行中</span><br><button class="sbtn" data-t="quit">放棄</button>':`<button class="sbtn${done?'':' pri'}" data-t="boss" data-v="${b.id}">${done?'再戰':'接受挑戰'}</button>`;
    h+=row(`${done?'👑':'🐉'} ${b.name}`,sub,r); }
  if(window.__LVINFO){ const L=window.__LVINFO, lv=S.lv||1, need=L.xpNext(lv), up=[]; for(let k=lv+1;k<=lv+12&&up.length<4;k++){ const g=L.gains(k).filter(x=>x!=='天賦點 +1'); if(g.length) up.push(`<div class="tk"><b>Lv ${k}</b>　${g.join('、')}</div>`); }
    h+=`<div class="sec">等級里程碑</div><div class="pt">Lv ${lv}：經驗 ${Math.floor(S.xp||0).toLocaleString()} / ${need.toLocaleString()}　｜　強化上限 +${Math.min(10,Math.floor(lv/3))}</div>${up.join('')}`; }
  if(S.titles.length){ const cur=S.titleSel&&S.titles.indexOf(S.titleSel)>=0?S.titleSel:S.titles[S.titles.length-1]; h+=`<div class="sec">已獲得稱號（點選要顯示在主畫面的稱號）</div><div>${S.titles.map(t=>`<button class="ttl${t===cur?' on':''}" data-t="title" data-v="${t}">${t}</button>`).join('')}</div>`; }
  box.firstChild.innerHTML=h; }
btn.addEventListener('click',()=>{ c.Snd.init&&c.Snd.init(); render(); box.classList.remove('hidden'); });
box.addEventListener('click',e=>{ if(e.target===box){ box.classList.add('hidden'); return; } const b=e.target.closest('[data-t]'); if(!b) return; const t=b.dataset.t, v=b.dataset.v;
  if(t==='x'){ box.classList.add('hidden'); return; }
  if(t==='add'&&pts()>0&&rank(v)<TAL_MAX){ S.tal[v]=rank(v)+1; c.Snd.coin(); }
  if(t==='reset'){ if(S.coins<TAL_RESET){ c.toast('金幣不夠','bad'); } else { S.coins-=TAL_RESET; S.tal={cast:0,power:0,sea:0}; c.setCoins(); } }
  if(t==='boss'){ S.bossOn=v; tries=0; const B=BOSS.find(x=>x.id===v); c.toast(`🐉 已接受挑戰：${B.name}（${B.hint}）`,'good',3000); }
  if(t==='quit') S.bossOn=null;
  if(t==='title'){ S.titleSel=v; showTitle(); }
  c.persist(); render(); dot(); });
setInterval(dot,3000); dot();
return {rank,apply,applyBoss,bossWin,bossIntro,tick};
}
