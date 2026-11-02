/* ===== 天賦與大師挑戰 ===== */
const TAL={
  cast:{n:'遠投',i:'🎯',d:r=>`拋投距離 +${r*4}%，稀有魚需要的拋投距離 −${r*5}%`},
  power:{n:'力量',i:'💪',d:r=>`線張力 −${r*3}%，爆線累積 −${r*5}%`},
  sea:{n:'海洋',i:'🌊',d:r=>`海上稀有魚 +${r*8}%，鯊魚搶魚機率 −${r*12}%，閃避少點 ${Math.floor(r/2)} 下`},
  /* 進階天賦（Lv 25／30 開放）：給後面的大師挑戰用，點滿約 28 點 */
  fight:{n:'搏魚',i:'🎣',max:8,lv:25,d:r=>`魚的體力消耗 +${r*5}%，遛魚更快`},
  reel:{n:'捲線',i:'⚙️',max:8,lv:25,d:r=>`收線速度 +${r*4}%`},
  calm:{n:'定力',i:'🧘',max:8,lv:30,d:r=>`Boss 的拉力 −${r*3}%、衝刺速度 −${r*3}%`},
  hunt:{n:'尋蹤',i:'🧭',max:4,lv:30,d:r=>`Boss 出現機率 +${r*5}%，連續 ${4-Math.floor(r/2)} 次咬餌內一定現身`}};
const TAL_MAX=6, TAL_RESET=5000;
const talMax=k=>TAL[k].max||TAL_MAX, talZero=()=>Object.fromEntries(Object.keys(TAL).map(k=>[k,0]));
/* Boss 拉力以實際搏魚程式模擬校準：該等級買得到的裝備，熟練玩家一定拉得上來（大白鯊女王原本 1.6：任何裝備開場 1 秒內就斷線） */
const BOSS=[
  {id:'gar',lv:15,name:'巨型鱷雀鱔',sp:'gar',loc:'lake',zone:'deep',per:['dusk','night'],size:1.5,pow:1.35,title:'鱷雀鱔獵人',hint:'深水中央・黃昏或夜晚',coins:15000,cry:2},
  {id:'flat',lv:18,name:'鯰魚之王',sp:'flathead',loc:'lake',zone:'wood',per:['night'],size:1.45,pow:1.45,title:'鯰魚王者',hint:'倒木區・夜晚',coins:20000,cry:3},
  {id:'marlin',lv:20,name:'旗魚王',sp:'marlin',loc:'sea',zone:'blue',per:['dawn','day'],size:1.35,pow:1.5,title:'怒海旗手',hint:'遠洋深藍・清晨或白天',coins:30000,cry:4},
  {id:'gw',lv:25,name:'大白鯊女王',sp:'gwhite',loc:'sea',zone:'blue',per:['dusk','night'],size:1.3,pow:.92,title:'深海霸主',hint:'遠洋深藍・黃昏或夜晚',coins:50000,cry:6},
  {id:'king',lv:24,name:'滄淵',sp:'seaking',loc:'sea',zone:'blue',per:['night'],size:1,pow:1.75,title:'滄淵征服者',hint:'遠洋深藍・夜晚',coins:80000,cry:10},
  /* 老漁人《漁獲簿》：他四十年來沒釣上岸的魚，一頁一隻。拉力、衝刺、耐力倍率以實際搏魚程式模擬校準：
     該等級買得到的裝備＋強化上限，熟練玩家十場十勝；裝備落後 8 級幾乎都會失敗（月下銀王、老青例外：湖區線量 80 公尺，靠長時間搏魚） */
  {id:'arapaima',lv:28,name:'沉鐘',sp:'arapaima',loc:'lake',zone:'deep',per:['day','dusk'],size:1.3,pow:2.6,spd:1.05,stam:1.15,title:'聽鐘人',hint:'深水中央・白天或黃昏',coins:60000,cry:6,tide:2,
    page:'民國六十八年夏。深水中央有東西浮上來換氣，聲音像寺廟的鐘。我拉了牠一個下午，竿子斷成三截。'},
  {id:'mekong',lv:32,name:'石佛',sp:'mekong',loc:'lake',zone:'deep',per:['night'],size:1.25,pow:3.1,spd:1.1,stam:1.35,title:'撼佛者',hint:'深水中央・夜晚',coins:75000,cry:7,tide:2,
    page:'牠趴在湖底一動也不動，像一尊石佛。秋月說牠在睡覺，叫我別吵牠。那年她七歲。'},
  {id:'taimen',lv:35,name:'冰湖之狼',sp:'taimen',loc:'ice',zone:'ice',per:['dawn','dusk'],size:1.4,pow:6,spd:1.15,stam:1.5,title:'冰原獵手',hint:'冰湖・清晨或黃昏',coins:90000,cry:8,tide:3,
    page:'冰層底下有狼。牠咬走我三支假餌，每一支都是秋月替我挑的顏色。'},
  {id:'grouper',lv:38,name:'礁洞之主',sp:'grouper2',loc:'sea',zone:'reef',per:['day'],size:1.2,pow:2.9,spd:1.2,stam:1.65,title:'礁洞征服者',hint:'近海礁岩・白天',coins:110000,cry:9,tide:3,
    page:'牠一上鉤就鑽回洞裡，線在礁石上磨斷的聲音，我到現在還記得。'},
  {id:'gt',lv:42,name:'斷線者',sp:'gt',loc:'sea',zone:'reef',per:['dawn','dusk'],size:1.35,pow:6.2,spd:1.25,stam:1.85,title:'斷線終結者',hint:'近海礁岩・清晨或黃昏',coins:130000,cry:10,tide:4,
    page:'港口的人都叫牠斷線者。那年我換了最粗的線，還是被牠在浪頭上拉斷。'},
  {id:'tuna',lv:46,name:'黑潮之王',sp:'tuna',loc:'sea',zone:'blue',per:['dawn','day'],size:1.3,pow:6.3,spd:1.3,stam:2.05,title:'黑潮之王',hint:'遠洋深藍・清晨或白天',coins:160000,cry:12,tide:4,
    page:'跟著黑潮北上的那一條，拉了我兩個鐘頭。我答應秋月颱風前回家，所以剪了線。'},
  {id:'sword',lv:50,name:'夜行劍客',sp:'swordfish',loc:'sea',zone:'blue',per:['night'],size:1.15,pow:5,spd:1.36,stam:2.25,title:'月下劍客',hint:'遠洋深藍・夜晚',coins:190000,cry:14,tide:5,
    page:'牠只在沒有月亮的夜裡上來吃魷魚。那天晚上颱風來了，我沒有回去。'},
  {id:'tarpon',lv:53,name:'月下銀王',sp:'tarpon',loc:'lake',zone:'moon',per:['night'],size:2.6,pow:8,spd:1.4,stam:7,title:'銀王之友',hint:'月光灣・夜晚',coins:220000,cry:16,tide:5,
    page:'霜汐說，月光灣有一條銀色的老魚，比她還老。牠是看著秋月長大的。'},
  {id:'oldblue',lv:60,name:'老青',sp:'blackcarp',loc:'lake',zone:'deep',per:['night'],size:1.9,pow:6,spd:1.5,stam:12,title:'老漁人的傳人',hint:'深水中央・夜晚',coins:300000,cry:20,tide:6,
    page:'最後一頁。老青是我這輩子的對手。如果有一天你把牠拉上來了，替我摸摸牠的頭，然後放牠回去。我的竹竿，就交給你了。'}];
const PER_NAME={dawn:'清晨',day:'白天',dusk:'黃昏',night:'夜晚'};

function createTalents(c){
'use strict';
const S=c.save; S.tal=Object.assign(talZero(),S.tal||{}); S.boss=S.boss||{}; S.titles=S.titles||[];
const spent=()=>Object.values(S.tal).reduce((a,b)=>a+b,0), pts=()=>Math.max(0,(S.lv||1)-4)-spent(), rank=b=>S.tal[b]||0;
function apply(g){ g.rod.cast*=1+.04*rank('cast'); g.rod.tens*=1-.03*rank('power'); g.reel.spd*=1+.04*rank('reel'); return g; }

/* Boss：指定釣點與時段，咬餌時 30% 機率出現，連續 4 次沒出現就保證出現 */
let tries=0;
function bossRoll(){ const b=BOSS.find(x=>x.id===S.bossOn); if(!b) return null;
  if(c.loc()!==b.loc||c.zoneId()!==b.zone||b.per.indexOf(c.period())<0) return null;
  tries++; if(Math.random()<.3+.05*rank('hunt')||tries>=4-Math.floor(rank('hunt')/2)){ tries=0; return b; } return null; }
function applyBoss(G,SPECIES,RAR){ const b=bossRoll(); if(!b) return false; const sp=SPECIES.find(x=>x.id===b.sp); if(!sp) return false;
  const L=sp.len[1]/100*b.size, w=sp.k*L*L*L, sp2=Object.assign({},sp);
  G.sp=sp2; G.fd={sp:sp2,L,w,u:1,lvl:99,boss:b,value:Math.round(sp.price*Math.pow(w+.3,.85)*RAR[sp.rar].mult*2.5),xpMul:3};
  c.toast('👑 有什麼巨大的東西在靠近……','warn',2400); c.vib([60,40,60]); return true; }
function bossWin(fd){ const b=fd.boss, first=!S.boss[b.id]; S.boss[b.id]=(S.boss[b.id]||0)+1; S.bossOn=null; if(window.__STORY) window.__STORY.onBoss(b.id);
  let bxp=0; S.mat=S.mat||{}; const tide=first?(b.tide||1):1; S.mat.tide=(S.mat.tide||0)+tide;   /* 潮心石：首勝給 Boss 設定的數量，再戰每次 1 顆（強化 +11 起要用） */
  if(b.id==='oldblue'&&window.__GEARIDX){ const i=window.__GEARIDX('rod','oldrod'); if(i>=0&&S.gear&&S.gear.rod&&S.gear.rod.indexOf(i)<0) S.gear.rod.push(i); }   /* 老青：老漁人的竹節竿交到你手上 */
  if(first){ S.coins+=b.coins; S.mat.crystal=(S.mat.crystal||0)+b.cry; if(S.titles.indexOf(b.title)<0) S.titles.push(b.title); c.setCoins(); if(c.addXP&&window.__LVINFO){ bxp=Math.round(window.__LVINFO.xpNext(S.lv||1)*.3); c.addXP(bxp); } }
  showTitle(); c.persist(); setTimeout(()=>c.toast(first?`👑 擊敗${b.name}！稱號「${b.title}」・🪙${b.coins.toLocaleString()}・💎×${b.cry}・🔷潮心石×${tide}${bxp?'・經驗 '+bxp.toLocaleString():''}`:`👑 再次擊敗${b.name}！🔷潮心石×${tide}`,'good',4200),1600); c.Snd.fanfare(2); dot(); }

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
#bossFlash{position:fixed;inset:0;z-index:24;background:#fff;opacity:0;pointer-events:none}#bossFlash.go{animation:bfl .6s ease-out}@keyframes bfl{0%{opacity:.85}100%{opacity:0}}#talBox .lock{color:var(--fg-dim);font-size:12px}#talBox .on{color:#7ff0a8;font-weight:800}
#bossBtn{position:fixed;right:12px;top:calc(env(safe-area-inset-top,0px) + 196px);z-index:6;display:flex;flex-direction:column;align-items:flex-end;gap:1px;padding:7px 14px 7px 12px;border-radius:16px;border:1px solid rgba(255,213,106,.7);background:linear-gradient(135deg,rgba(92,58,8,.92),rgba(150,98,20,.9));color:#ffe9a8;font-family:inherit;box-shadow:0 2px 10px rgba(0,0,0,.35);max-width:58vw;text-align:right}
#bossBtn b{font-size:14px;letter-spacing:.5px;white-space:nowrap}#bossBtn small{font-size:11px;color:#ffd9a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52vw}
#bossBtn.glow{animation:bossGlow 1.6s ease-in-out infinite alternate}@keyframes bossGlow{from{box-shadow:0 0 0 1px rgba(255,213,106,.5),0 0 6px rgba(255,190,80,.4)}to{box-shadow:0 0 0 2px #ffd56a,0 0 18px rgba(255,190,80,.9)}}
#bossBtn.on{background:linear-gradient(135deg,rgba(110,30,20,.94),rgba(170,70,25,.92))}#bossBtn.ready{border-color:#7ff0a8;box-shadow:0 0 14px rgba(127,240,168,.6)}
body.sheetOn #bossBtn,body.ending #bossBtn,body.athome #bossBtn,body.catching #bossBtn{display:none!important}
#talBox .bcards{display:flex;flex-direction:column;gap:10px;margin-top:10px}
#talBox .bcard{padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,rgba(255,213,106,.10),rgba(255,140,60,.05));border:1px solid rgba(255,213,106,.28)}
#talBox .bcard.on{border-color:#ffb067;background:linear-gradient(135deg,rgba(255,120,60,.18),rgba(255,213,106,.06))}#talBox .bcard.done{border-color:rgba(127,240,168,.35)}#talBox .bcard.lock{opacity:.5}
#talBox .bh{display:flex;justify-content:space-between;align-items:baseline}#talBox .bh b{font-size:18px;color:#ffe9a8}#talBox .bh small{color:#d8c79a}
#talBox .bi{font-size:13px;color:#d9dde2;margin-top:4px;line-height:1.5}#talBox .bp{margin-top:6px;padding:8px 10px;border-radius:10px;background:rgba(232,214,170,.08);color:#e8d6aa;font-size:13px;line-height:1.6;font-style:italic}
#talBox .ba{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}#talBox .ba .big{padding:10px 18px;font-size:15px}#talBox .bst{width:100%;font-size:13px;color:#ffd9a0}#talBox .bst.ok{color:#7ff0a8;font-weight:800}`;
document.head.appendChild(st);
const box=document.createElement('div'); box.id='talBox'; box.className='hidden'; box.innerHTML='<div class="tb"></div>'; document.body.appendChild(box);
const btn=document.createElement('button'); btn.className='chip sm'; btn.id='talBtn'; btn.setAttribute('aria-label','天賦與挑戰'); btn.textContent='⭐';
const t2=document.getElementById('top2'); if(t2) t2.appendChild(btn);
function dot(){ btn.classList.toggle('dot',pts()>0||(!S.bossOn&&BOSS.some(b=>(S.lv||1)>=b.lv&&!S.boss[b.id]))); }
const row=(a,b,r)=>`<div class="row"><div class="nm"><b>${a}</b><small>${b}</small></div><div class="rt">${r}</div></div>`;
let mode='tal';
const spotIdx=z=>typeof SPOTS!=='undefined'?SPOTS.findIndex(q=>q.id===z):-1;
/* 挑戰的狀態：在不在對的釣點、對的時段 */
function bossState(b){ const here=c.loc()===b.loc&&c.zoneId()===b.zone, timeOk=b.per.indexOf(c.period())>=0; return {here,timeOk,ready:here&&timeOk}; }
function bossView(){
  let h=`<h3>👑 大師挑戰<button class="sbtn" data-t="x">✕</button></h3><div class="pt">老漁人的《漁獲簿》：他四十年來沒釣上岸的魚。接受挑戰後，到指定的釣點與時段，牠就會來咬餌。</div>`;
  h+=`<div class="bcards">`;
  for(const b of BOSS){ const done=S.boss[b.id]||0, on=S.bossOn===b.id, lock=(S.lv||1)<b.lv, st=bossState(b);
    const cls=lock?'lock':on?'on':done?'done':'open';
    let act='';
    if(lock) act=`<span class="lk">🔒 Lv ${b.lv} 解鎖</span>`;
    else if(on) act=`<div class="bst ${st.ready?'ok':''}">${st.ready?'✅ 條件符合，等牠咬餌':!st.here?'📍 還沒到'+b.hint.split('・')[0]:'⏳ 等到'+b.per.map(x=>PER_NAME[x]).join('或')}</div>${!st.here&&spotIdx(b.zone)>=0?`<button class="sbtn pri" data-t="go" data-v="${b.id}">前往${b.hint.split('・')[0]}</button>`:''}<button class="sbtn" data-t="quit">放棄</button>`;
    else act=`<button class="sbtn big${done?'':' pri'}" data-t="boss" data-v="${b.id}">${done?'再戰（🔷×1）':'接受挑戰'}</button>`;
    h+=`<div class="bcard ${cls}"><div class="bh"><b>${done?'👑':'🐉'} ${b.name}</b><small>Lv ${b.lv}</small></div>
      <div class="bi">📍 ${b.hint}</div>
      <div class="bi">首勝：稱號「${b.title}」・🪙${b.coins.toLocaleString()}・💎×${b.cry}・🔷×${b.tide||1}${done?`<br>已擊敗 ${done} 次`:''}</div>
      ${done&&b.page?`<div class="bp">📖 ${b.page}</div>`:''}<div class="ba">${act}</div></div>`; }
  return h+'</div>'; }
function render(){ if(mode==='boss'){ box.firstChild.innerHTML=bossView(); return; } const p=pts();
  let h=`<h3>⭐ 天賦<button class="sbtn" data-t="x">✕</button></h3>`;
  h+=`<div class="pt">${(S.lv||1)<5?'Lv 5 起每升一級得 1 點天賦':`可用天賦點：${p}（Lv ${S.lv}，已用 ${spent()}）`}</div>`;
  for(const k in TAL){ const r=rank(k), T=TAL[k], mx=talMax(k), lock=(S.lv||1)<(T.lv||0);
    h+=row(`${T.i} ${T.n} <span class="pips">${'●'.repeat(r)}${'○'.repeat(mx-r)}</span>`,lock?`<span class="lock">Lv ${T.lv} 開放：${T.d(1)}（每級）</span>`:r?T.d(r):'尚未投入',lock?'🔒':r>=mx?'<span class="on">滿級</span>':`<button class="sbtn${p>0?' pri':''}" data-t="add" data-v="${k}">＋1</button>`); }
  if(spent()>0) h+=`<div style="text-align:right;margin-top:6px"><button class="sbtn danger" data-t="reset">重置天賦（🪙${TAL_RESET.toLocaleString()}）</button></div>`;
  h+=`<div class="sec"><button class="sbtn pri" data-t="mode" data-v="boss" style="width:100%">👑 大師挑戰（${BOSS.filter(x=>(S.lv||1)>=x.lv&&!S.boss[x.id]).length} 隻可挑戰）</button></div>`;
  if(window.__LVINFO){ const L=window.__LVINFO, lv=S.lv||1, need=L.xpNext(lv), up=[]; for(let k=lv+1;k<=lv+12&&up.length<4;k++){ const g=L.gains(k).filter(x=>x!=='天賦點 +1'); if(g.length) up.push(`<div class="tk"><b>Lv ${k}</b>　${g.join('、')}</div>`); }
    h+=`<div class="sec">等級里程碑</div><div class="pt">Lv ${lv}：經驗 ${Math.floor(S.xp||0).toLocaleString()} / ${need.toLocaleString()}　｜　強化上限 +${enhCapAt(lv)}</div>${up.join('')}`; }
  if(S.titles.length){ const cur=S.titleSel&&S.titles.indexOf(S.titleSel)>=0?S.titleSel:S.titles[S.titles.length-1]; h+=`<div class="sec">已獲得稱號（點選要顯示在主畫面的稱號）</div><div>${S.titles.map(t=>`<button class="ttl${t===cur?' on':''}" data-t="title" data-v="${t}">${t}</button>`).join('')}</div>`; }
  box.firstChild.innerHTML=h; }
btn.addEventListener('click',()=>{ c.Snd.init&&c.Snd.init(); mode='tal'; render(); box.classList.remove('hidden'); });
/* 主畫面的大師挑戰入口：金色膠囊按鈕。沒接挑戰時顯示可挑戰數量並發光；接了挑戰顯示目標、地點與目前是否符合條件 */
const bb2=document.createElement('button'); bb2.id='bossBtn'; bb2.setAttribute('aria-label','大師挑戰'); document.body.appendChild(bb2);
function bossBtn(){ const b=BOSS.find(x=>x.id===S.bossOn), avail=BOSS.filter(x=>(S.lv||1)>=x.lv&&!S.boss[x.id]).length;
  if(b){ const st=bossState(b); bb2.className='on'+(st.ready?' ready':''); bb2.innerHTML=`<b>👑 ${b.name}</b><small>${st.ready?'✅ 條件符合，等牠咬餌':b.hint}</small>`; }
  else { bb2.className=avail?'glow':''; bb2.innerHTML=`<b>👑 大師挑戰</b><small>${avail?avail+' 隻等你挑戰':'漁獲簿'}</small>`; }
  bb2.style.display=(S.lv||1)>=15?'':'none'; }
bb2.addEventListener('click',()=>{ c.Snd.init&&c.Snd.init(); mode='boss'; render(); box.classList.remove('hidden'); });
box.addEventListener('click',e=>{ if(e.target===box){ box.classList.add('hidden'); return; } const b=e.target.closest('[data-t]'); if(!b) return; const t=b.dataset.t, v=b.dataset.v;
  if(t==='x'){ box.classList.add('hidden'); return; }
  if(t==='mode'){ mode=v; render(); box.firstChild.scrollTop=0; return; }
  if(t==='go'){ const B=BOSS.find(x=>x.id===v), i=B?spotIdx(B.zone):-1; const why=window.__STORY&&window.__STORY.lock?window.__STORY.lock(i):null;
    if(i<0) return; if(why){ c.toast(why,'warn'); return; } box.classList.add('hidden'); if(window.__goSpot) window.__goSpot(i); return; }
  if(t==='add'&&TAL[v]&&pts()>0&&rank(v)<talMax(v)&&(S.lv||1)>=(TAL[v].lv||0)){ S.tal[v]=rank(v)+1; c.Snd.coin(); }
  if(t==='reset'){ if(S.coins<TAL_RESET){ c.toast('金幣不夠','bad'); } else { S.coins-=TAL_RESET; S.tal=talZero(); c.setCoins(); } }
  if(t==='boss'){ S.bossOn=v; tries=0; const B=BOSS.find(x=>x.id===v); c.toast(`🐉 已接受挑戰：${B.name}（${B.hint}）`,'good',3000); }
  if(t==='quit') S.bossOn=null;
  if(t==='title'){ S.titleSel=v; showTitle(); }
  c.persist(); render(); dot(); });
setInterval(()=>{ dot(); bossBtn(); },2000); dot(); bossBtn();
return {rank,apply,applyBoss,bossWin,bossIntro,tick};
}
