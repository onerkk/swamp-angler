/* ===== 商店循環：素材掉落、裝備強化、道具、流浪商人、魚市行情、外觀 ===== */
const MATS={scale:{n:'魚鱗',i:'🐟'},bone:{n:'魚骨',i:'🦴'},pearl:{n:'珍珠',i:'⚪'},crystal:{n:'海晶',i:'💎'}};
const CONS=[
 {id:'lure',n:'魚群誘餌',i:'🧆',p:400,d:'立刻在附近引來一群魚'},
 {id:'repel',n:'鯊魚驅逐劑',i:'🧪',p:600,d:'10 分鐘內鯊魚和鱷魚不會來搶魚',min:10},
 {id:'luck',n:'幸運香',i:'🪔',p:800,d:'10 分鐘內稀有魚機率大幅提升',min:10},
 {id:'coin2',n:'金幣加倍券',i:'💰',p:1000,d:'10 分鐘內賣魚金幣 ×2',min:10},
 {id:'glow',n:'夜光浮標',i:'🔆',p:450,d:'15 分鐘內魚咬餌更快',min:15},
 {id:'leader',n:'鋼絲前導線',i:'⛓️',p:500,d:'下一次快斷線時自動撐住（自動使用）'}];
const SKINS={
 rod:[{id:'def',n:'原廠配色',c:null,p:0},{id:'black',n:'霧黑',c:'#1a1c20',p:2000},{id:'coral',n:'珊瑚紅',c:'#d8504a',p:3000},{id:'mint',n:'薄荷綠',c:'#3fbf9f',p:3000},{id:'galaxy',n:'星空紫',c:'#4a2a8a',p:6000,gold:true},{id:'gold',n:'鍍金',c:'#c9a227',p:15000,gold:true}],
 bob:[{id:'classic',n:'經典紅白',t:0xd8301a,b:0xf2efe8,p:0},{id:'lime',n:'螢光綠',t:0x7cff3a,b:0x1a1a1a,p:1500},{id:'panda',n:'熊貓黑白',t:0x111111,b:0xffffff,p:2500},{id:'sakura',n:'櫻花粉',t:0xff8fb8,b:0xfff0f5,p:2500},{id:'gold',n:'黃金浮標',t:0xd9b25a,b:0xf6e6b0,p:5000}]};

function createEco(c){
'use strict';
const capOf=()=>Math.min(10,Math.floor((c.save.lv||1)/3));   // 強化上限：每 3 級 +1，Lv 30 到 +10
const S=c.save, now=()=>Date.now();
S.mat=S.mat||{scale:0,bone:0,pearl:0,crystal:0}; S.enh=S.enh||{rod:{},line:{},reel:{}}; S.inv=S.inv||{}; S.fx=S.fx||{};
S.skin=S.skin||{rod:'def',bob:'classic'}; S.skinOwn=S.skinOwn||{rod:['def'],bob:['classic']}; S.merch=S.merch||{};
const fxOn=id=>(S.fx[id]||0)>now();
/* 強化 */
const lvOf=(k,i)=>(S.enh[k]&&S.enh[k][i])||0;
function enhance(g){ const r=lvOf('rod',S.eq.rod), l=lvOf('line',S.eq.line), e=lvOf('reel',S.eq.reel);
  return {rod:Object.assign({},g.rod,{cast:g.rod.cast*(1+.02*r),tens:g.rod.tens*(1-.025*r)}),line:Object.assign({},g.line,{s:g.line.s*(1+.06*l)}),reel:Object.assign({},g.reel,{spd:g.reel.spd*(1+.04*e),drag:g.reel.drag*(1-.03*e)})}; }
function enhCost(lv,tier){ const coins=Math.round(300*Math.pow(1.5,lv)*(1+tier*.5)/10)*10, m={};
  if(lv<3) m.scale=4*(lv+1); else if(lv<6) m.bone=lv-1; else if(lv<9) m.pearl=lv-4; else m.crystal=lv-7; return {coins,m}; }
const TIER=['scale','bone','pearl','crystal'];
/* 付素材：不夠時用上一階抵（1 抵 3），回傳實際扣除量；付不起回傳 null */
function plan(m){ const have={}, use={}; TIER.forEach(k=>{ have[k]=S.mat[k]||0; use[k]=0; });
  const need={}; TIER.forEach(k=>need[k]=m[k]||0);
  for(let i=0;i<TIER.length;i++){ const k=TIER[i]; let n=need[k]; const d=Math.min(n,have[k]); have[k]-=d; use[k]+=d; n-=d;
    if(n>0){ if(i===TIER.length-1) return null; need[TIER[i+1]]+=Math.ceil(n/3); have[k]+=Math.ceil(n/3)*3-n; } }
  use.left=have; return use; }
const has=m=>!!plan(m);
const mtxt=m=>Object.keys(m).filter(k=>MATS[k]&&m[k]>0).map(k=>MATS[k].i+m[k]).join(' ');
/* 掉落 */
let lastD='';
function drop(fd){ const r=fd.sp.rar||0, g={}; const add=(k,n)=>{ if(n>0){ g[k]=(g[k]||0)+n; S.mat[k]=(S.mat[k]||0)+n; } };
  if(r===0) add('scale',1+(Math.random()<.5?1:0)); else if(r===1){ add('scale',2); if(Math.random()<.5) add('bone',1); }
  else if(r===2){ add('scale',2); add('bone',1+(Math.random()<.5?1:0)); } else if(r===3){ add('scale',3); add('bone',2); add('pearl',1); }
  else if(r===4){ add('bone',2); add('pearl',1+(Math.random()<.4?1:0)); if(Math.random()<.3) add('crystal',1); } else { add('pearl',2); add('crystal',1+(Math.random()<.5?1:0)); }
  c.persist(); lastD=Object.keys(g).map(k=>MATS[k].i+'×'+g[k]).join(' '); return lastD; }
function dropItem(it){ if(it.id==='chest'){ S.mat.pearl=(S.mat.pearl||0)+3; S.mat.crystal=(S.mat.crystal||0)+1; c.persist(); setTimeout(()=>c.toast('寶箱裡還有 ⚪×3 💎×1','good',2200),1500); } }
/* 每日魚市 */
function rng(seed){ seed=Math.abs(seed)%2147483646+1; return ()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; }; }
const day=()=>Math.floor(now()/86400000);
let mk=null, mkDay=-1;
function market(){ if(mkDay===day()) return mk; mkDay=day(); const r=rng(mkDay*7919+13), pool=c.SPECIES.filter(s=>!s.special), pick=[];
  while(pick.length<4&&pool.length) pick.push(pool.splice(Math.floor(r()*pool.length),1)[0]);
  mk=[{sp:pick[0],m:2},{sp:pick[1],m:1.6},{sp:pick[2],m:1.3},{sp:pick[3],m:.6}]; return mk; }
function priceMul(id){ const e=market().find(x=>x.sp.id===id); return e?e.m:1; }
/* 流浪商人（每 4 小時換貨） */
const ROT=4*3600000, rot=()=>Math.floor(now()/ROT);
function offers(){ const r=rng(rot()*104729+7), pool=[
  {id:'b_lure',n:'魚群誘餌 ×3',i:'🧆',p:840,give:{inv:{lure:3}}},{id:'b_luck',n:'幸運香 ×2',i:'🪔',p:1100,give:{inv:{luck:2}}},
  {id:'b_coin',n:'金幣加倍券 ×2',i:'💰',p:1400,give:{inv:{coin2:2}}},{id:'b_repel',n:'鯊魚驅逐劑 ×3',i:'🧪',p:1260,give:{inv:{repel:3}}},
  {id:'b_moon',n:'月光餌 ×3',i:'🌙',p:1200,give:{bait:{moon:3}}},{id:'b_live',n:'活魚餌 ×10',i:'🐟',p:900,give:{bait:{live:10}}},
  {id:'m_bone',n:'魚骨 ×4',i:'🦴',p:1600,give:{mat:{bone:4}}},{id:'m_pearl',n:'珍珠 ×2',i:'⚪',p:3500,give:{mat:{pearl:2}}},
  {id:'m_crys',n:'海晶 ×1',i:'💎',p:6000,give:{mat:{crystal:1}}},{id:'s_glow',n:'夜光浮標 ×3',i:'🔆',p:950,give:{inv:{glow:3}}},
  {id:'s_lead',n:'鋼絲前導線 ×3',i:'⛓️',p:1050,give:{inv:{leader:3}}}], out=[];
  while(out.length<4) out.push(pool.splice(Math.floor(r()*pool.length),1)[0]); return out; }
const bought=()=>S.merch[rot()]||[];
/* 道具 */
function useCon(id){ const it=CONS.find(x=>x.id===id); if(!it||(S.inv[id]||0)<=0) return;
  if(id==='lure'){ if(!(window.__FUN&&window.__FUN.spawnHot())){ c.toast('這裡引不來魚群，換個方向試試','warn'); return; } }
  else if(id==='leader'){ c.toast('鋼絲前導線會在快斷線時自動使用','',1800); return; }
  else S.fx[id]=Math.max(now(),S.fx[id]||0)+it.min*60000;
  S.inv[id]--; c.persist(); c.Snd.coin(); if(id!=='lure') c.toast(it.i+' '+it.n+' 生效 '+it.min+' 分鐘','good'); }
function useLeader(){ if((S.inv.leader||0)>0){ S.inv.leader--; c.persist(); return true; } return false; }
/* 外觀 */
function applySkins(){ const rs=SKINS.rod.find(s=>s.id===S.skin.rod); if(rs&&rs.c) c.P.setRodLook(rs.c,!!rs.gold);
  const bs=SKINS.bob.find(s=>s.id===S.skin.bob)||SKINS.bob[0], ch=c.P.bobber.children; ch[0].material.color.setHex(bs.t); ch[1].material.color.setHex(bs.b); }
/* 介面 */
const row=(name,sub,right)=>`<div class="row"><div class="nm"><b>${name}</b><small>${sub}</small></div><div class="rt">${right}</div></div>`;
const matLine=()=>`<div class="note">${Object.keys(MATS).map(k=>MATS[k].i+' '+MATS[k].n+' '+(S.mat[k]||0)).join('　')}</div>`;
const fmtT=ms=>{ const s=Math.max(0,Math.floor(ms/1000)); return Math.floor(s/3600)+':'+String(Math.floor(s%3600/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };
function render(tab,GEAR){
  let h='';
  if(tab==='enh'){
    h+='<div class="note">釣魚會掉落素材。越稀有的魚掉越好的素材，強化越後面越需要稀有素材。</div>';
    [['rod','釣竿'],['line','釣線'],['reel','捲線器']].forEach(([k,label])=>{ const idx=S.eq[k], it=GEAR[k][idx], lv=lvOf(k,idx);
      const st='★'.repeat(Math.min(lv,10))+'☆'.repeat(Math.max(0,10-lv));
      const eff=k==='rod'?`拋投 +${lv*2}%、張力 −${(lv*2.5).toFixed(1)}%`:k==='line'?`強度 +${lv*6}%`:`收線 +${lv*4}%、爆線累積 −${lv*3}%`;
      if(lv>=10){ h+=row(`${label}：${it.name} +10`,`${st}<br>${eff}`,'<span class="eqd">已滿級</span>'); return; }
      if(lv>=capOf()){ h+=row(`${label}：${it.name} +${lv}`,`${st}<br>${eff}`,`<span class="lk">Lv ${(lv+1)*3} 解鎖 +${lv+1}</span>`); return; }
      const cs=enhCost(lv,idx), pl=plan(cs.m), cOk=S.coins>=cs.coins, ok=cOk&&!!pl;
      let st2=''; if(!cOk) st2+=`<span class="bad">金幣差 ${(cs.coins-S.coins).toLocaleString()}</span> `;
      if(!pl) st2+=`<span class="bad">素材不夠</span>`; else if(Object.keys(cs.m).some(x=>pl[x]!==cs.m[x])) st2+=`<span class="cv">將使用 ${mtxt(pl)}（高階素材自動抵扣）</span>`;
      h+=row(`${label}：${it.name} +${lv}`,`${st}<br>${eff}<br>下一級：🪙${cs.coins.toLocaleString()} ${mtxt(cs.m)}${st2?'<br>'+st2:''}`,`<button class="sbtn${ok?' pri':''}" data-a="enh" data-v="${k}">強化</button>`); });
    h+='<div class="note">素材不夠時，會自動用高一階的素材抵：1 魚骨＝3 魚鱗、1 珍珠＝3 魚骨、1 海晶＝3 珍珠。</div>';
    h+='<div class="note">換裝其他裝備時，各自的強化等級會保留。</div>';
  } else if(tab==='item'){
    const left=ROT-(now()%ROT), bs=bought();
    h+=`<div class="merch"><b>🧳 流浪商人</b><small>${fmtT(left)} 後換貨，每樣限購一次</small></div>`;
    h+=offers().map(o=>row(`${o.i} ${o.n}`,'限時商品',bs.includes(o.id)?'<span class="eqd">已購買</span>':`<button class="sbtn pri" data-a="merch" data-v="${o.id}">🪙 ${o.p.toLocaleString()}</button>`)).join('');
    h+='<div class="note" style="margin-top:12px">道具</div>';
    h+=CONS.map(it=>{ const n=S.inv[it.id]||0, act=fxOn(it.id)?`（剩 ${Math.ceil((S.fx[it.id]-now())/60000)} 分）`:'';
      return row(`${it.i} ${it.n} <small class="cnt">×${n}</small>`,it.d+act,`<div class="bb"><button class="sbtn" data-a="buyc" data-v="${it.id}">+1 🪙${it.p}</button>${n>0&&it.id!=='leader'?`<button class="sbtn pri" data-a="usec" data-v="${it.id}">使用</button>`:''}</div>`); }).join('');
  } else if(tab==='skin'){
    h+='<div class="note">釣竿配色（不影響數值）</div>';
    h+=SKINS.rod.map(s=>{ const own=S.skinOwn.rod.includes(s.id), on=S.skin.rod===s.id;
      return row(`<span class="sw" style="background:${s.c||'#1d4fb8'}"></span>${s.n}`,s.gold?'附金色導環':'',on?'<span class="eqd">使用中</span>':own?`<button class="sbtn" data-a="skine" data-v="rod:${s.id}">換上</button>`:`<button class="sbtn pri" data-a="skinb" data-v="rod:${s.id}">🪙 ${s.p.toLocaleString()}</button>`); }).join('');
    h+='<div class="note" style="margin-top:12px">浮標造型</div>';
    h+=SKINS.bob.map(s=>{ const own=S.skinOwn.bob.includes(s.id), on=S.skin.bob===s.id, hx=n=>'#'+n.toString(16).padStart(6,'0');
      return row(`<span class="sw" style="background:linear-gradient(${hx(s.t)} 50%,${hx(s.b)} 50%)"></span>${s.n}`,'',on?'<span class="eqd">使用中</span>':own?`<button class="sbtn" data-a="skine" data-v="bob:${s.id}">換上</button>`:`<button class="sbtn pri" data-a="skinb" data-v="bob:${s.id}">🪙 ${s.p.toLocaleString()}</button>`); }).join('');
  } else if(tab==='market'){
    const left=86400000-(now()%86400000);
    h+=`<div class="note">今日魚市行情（${fmtT(left)} 後更新）。賣出時自動套用。</div>`;
    h+=market().map(e=>row(`${e.m>1?'🔥':'🧊'} ${e.sp.name}`,`${e.sp.loc==='sea'?'海釣':'湖釣'}・${c.RAR[e.sp.rar].name}`,`<b style="color:${e.m>1?'#ffb347':'#8ab4d8'}">收購價 ×${e.m}</b>`)).join('');
  }
  return h;
}
function click(a,v,GEAR){
  if(a==='enh'){ const idx=S.eq[v], lv=lvOf(v,idx); if(lv>=10) return true; if(lv>=capOf()){ c.toast('等級不足：Lv '+(lv+1)*3+' 才能強化到 +'+(lv+1),'warn',2200); return true; } const cs=enhCost(lv,idx);
    const pl=plan(cs.m); if(S.coins<cs.coins||!pl) return true;
    S.coins-=cs.coins; TIER.forEach(k=>{ S.mat[k]=pl.left[k]; }); S.enh[v]=S.enh[v]||{}; S.enh[v][idx]=lv+1; c.persist(); c.setCoins(); c.Snd.fanfare(1); c.toast('強化成功！+'+(lv+1),'good'); return true; }
  if(a==='buyc'){ const it=CONS.find(x=>x.id===v); if(S.coins<it.p){ c.toast('金幣不夠','bad'); return true; } S.coins-=it.p; S.inv[v]=(S.inv[v]||0)+1; c.persist(); c.setCoins(); c.Snd.coin(); return true; }
  if(a==='usec'){ useCon(v); return true; }
  if(a==='merch'){ const o=offers().find(x=>x.id===v); if(!o||bought().includes(v)) return true; if(S.coins<o.p){ c.toast('金幣不夠','bad'); return true; }
    S.coins-=o.p; const g=o.give; for(const k in g.inv||{}) S.inv[k]=(S.inv[k]||0)+g.inv[k]; for(const k in g.bait||{}) S.baits[k]=(S.baits[k]||0)+g.bait[k]; for(const k in g.mat||{}) S.mat[k]=(S.mat[k]||0)+g.mat[k];
    S.merch={[rot()]:[...bought(),v]}; c.persist(); c.setCoins(); c.Snd.coin(); c.toast('買到了：'+o.n,'good'); return true; }
  if(a==='skinb'||a==='skine'){ const [k,id]=v.split(':'), s=SKINS[k].find(x=>x.id===id);
    if(a==='skinb'){ if(S.coins<s.p){ c.toast('金幣不夠','bad'); return true; } S.coins-=s.p; S.skinOwn[k].push(id); c.Snd.coin(); }
    S.skin[k]=id; c.persist(); c.setCoins(); c.applyRod(); return true; }
  return false;
}
/* 生效中的道具、自動調整提示位置 */
const fxBar=document.getElementById('fxBar');
function tick(){ const t1=document.getElementById('top'), t2=document.getElementById('top2');
  const bot=e=>{ if(!e) return 0; const r=e.getBoundingClientRect(); return r.height>0?r.bottom:0; }; const y=Math.max(bot(t1),bot(t2));
  document.documentElement.style.setProperty('--hudY',Math.round(y)+'px');
  if(fxBar) fxBar.innerHTML=CONS.filter(it=>it.min&&fxOn(it.id)).map(it=>`<span>${it.i} ${Math.ceil((S.fx[it.id]-now())/60000)}分</span>`).join('')+(fxOn('meal_str')?`<span>💪 ${Math.ceil((S.fx.meal_str-now())/60000)}分</span>`:''); }
setInterval(tick,1000); window.addEventListener('resize',tick); setTimeout(tick,300);
return {fxOn,enhance,drop,dropItem,lastDrop:()=>lastD,priceMul,useLeader,applySkins,render,click,matLine};
}
