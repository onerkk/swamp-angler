/* ===== 主線故事「老漁人的手記」：章節、任務、地圖開放、手記面板 ===== */
function createStory(c){
'use strict';
const S=c.save;
/* 任務類型：catch（可限魚種 sp、地點 zone、地區 loc、時段 per、下雨 rain、稀有度 rar）、perfect、item、scene、boss、moon */
const CH=[
 {id:'c1',spot:'dock',name:'第一章　老漁人的碼頭',open:{},
  intro:'這是老漁人一根一根釘起來的碼頭。先在這裡找回釣魚的手感——他說過，湖會告訴你很多事，只要你願意等。',
  tasks:[{t:'catch',zone:'dock',n:5,txt:'在木碼頭釣到 5 尾魚'},{t:'catch',sp:'bluegill',n:1,txt:'釣到一尾藍鰓太陽魚'},{t:'perfect',n:2,txt:'完美揚竿 2 次'}],
  page:'手記第一頁\n「這座碼頭是我年輕時一根一根釘起來的。湖會告訴你很多事，只要你願意等。\n浮萍灣那邊，傍晚常有東西在葉子底下發光——我花了好幾年才看清楚那是什麼。」',
  xp:600,coins:250,unlock:'浮萍灣（需要獨木舟）'},
 {id:'c2',spot:'lily',name:'第二章　浮萍下的影子',open:{after:'c1',kayak:1},
  intro:'划進浮萍灣，水面鋪滿圓圓的葉子。手記說，老漁人第一次看見「她」，就是在這裡。',
  tasks:[{t:'catch',zone:'lily',sp:'crappie',n:2,txt:'在浮萍灣釣到 2 尾黑斑刺蓋太陽魚'},{t:'catch',loc:'lake',per:'dawn',n:3,txt:'在湖上清晨釣到 3 尾魚'},{t:'item',n:1,txt:'從水裡釣起任何一件寶物（任務進行中機率加倍）'}],
  page:'手記第二頁\n「那天清晨，浮萍下有條銀色的尾巴，比我見過的任何魚都大。我以為眼花了。\n後來那場暴風雨，把東岸的林子整片吹倒在水裡。人們說湖病了，開始在河口築堤。」',
  xp:1500,coins:600,unlock:'倒木區（Lv 5）'},
 {id:'c3',spot:'wood',name:'第三章　暴風雨之後',open:{after:'c2',lv:5},
  intro:'倒木區是那場暴風雨留下的傷口。枯樹橫躺在水裡，成了大魚躲藏的地方。',
  tasks:[{t:'catch',zone:'wood',sp:'channel',n:1,txt:'在倒木區釣到一尾斑點叉尾鮰'},{t:'catch',rain:1,n:3,txt:'下雨天釣到 3 尾魚（可在設定切換天氣）'},{t:'catch',rar:1,n:3,txt:'釣到稀有以上的魚 3 尾'}],
  page:'手記第三頁\n「堤防築好以後，海水不再進來，湖心那條大鱷雀鱔變得越來越兇。\n我在牠肚子裡找到過一張畫在魚皮上的圖——湖的西邊，有個只在月光下才看得見的灣。\n冬天我要去上游看看，河水是從哪裡來的。」',
  xp:3000,coins:1250,unlock:'深水中央（Lv 8）'},
 {id:'ice',spot:'ice',name:'第五章　冰下的歌聲',open:{after:'c4',lv:10},
  intro:'湖心的手記斷在一句「她在等一條回海的路」。剩下的答案，老漁人帶去了上游——他最後一個冬天，在冰湖上度過。',
  tasks:[{t:'catch',loc:'ice',n:3,txt:'在冰湖釣到 3 尾魚'},{t:'catch',sp:'trout',n:1,txt:'釣到一尾虹鱒'},{t:'catch',sp:'char',n:1,txt:'釣到一尾北極紅點鮭（老漁人說牠只在最冷的水裡）'}],
  page:'手記・冰湖（最後一個冬天）\n「冰洞裡傳上來歌聲。冰底下的水是活的，一路流向湖，再從灣底的石縫流進海——那就是汐月回家的路。\n我老了，划不動了。你帶著這盞提燈，在月圓的晚上去灣裡找她。她會認得這盞燈。」',
  xp:3500,coins:1500,baits:{moon:3},unlock:'月光灣（並得到老漁人的提燈與月光餌 ×3）'},
 {id:'c4',spot:'deep',name:'第四章　湖心的秘密',open:{after:'c3',lv:8},
  intro:'深水中央沒有遮蔽，風浪最大，也最安靜。老漁人說，這裡住著湖的主人。',
  tasks:[{t:'catch',zone:'deep',rar:1,n:3,txt:'在深水中央釣到稀有以上的魚 3 尾'},{t:'catch',loc:'lake',per:'night',n:3,txt:'在湖上夜晚釣到 3 尾魚'},{t:'catch',sp:'gar',n:1,txt:'釣到一尾鱷雀鱔'}],
  page:'手記第四頁\n「月亮很圓的晚上，我照著魚皮上的圖划過去。灣裡的水是銀色的，岩石上坐著一個人——\n不，是一條人魚。她說她叫汐月，在等一條回海的路。我答應她，每個滿月都提燈來陪她。」',
  xp:5000,coins:2000,unlock:'冰湖（Lv 10）'},
 {id:'c5',spot:'moon',name:'第六章　月潮',open:{after:'ice'},
  intro:'月光灣只在夜裡發光。汐月還在這裡，等著那個提燈的人。\n提示：晚上（約 19:48～04:48）划獨木舟到月光灣釣魚，有機會在魚肚裡找到月鱗；月亮越圓，找到的機會越高。',
  tasks:[{t:'moon',n:1,txt:'集滿 7 片月鱗，聽完汐月的故事'}],
  page:'手記第五頁\n「我老了，提不動燈了。汐月說，等堤防打開、月潮回來，她就能回家。\n可是河口外的海不平靜——深海裡有什麼東西，從堤防築起那年就一直在發怒。\n我的舊漁船還停在河口的船塢裡。修好它，替我出海看看吧。」',
  xp:8000,coins:3000,unlock:'近海礁岩（需修復老漁人的漁船，在 🗺️ 釣點清單）'},
 {id:'c6',spot:'reef',name:'第七章　河口之外',open:{after:'c5',yacht:1},
  intro:'第一次把船開出河口。汐月回到了大海，海卻變得不安：魚群躁動，鯊魚出現得比以前頻繁。',
  tasks:[{t:'catch',zone:'reef',sp:'amber',n:1,txt:'在近海礁岩釣到一尾紅甘'},{t:'catch',sp:'grouper',n:1,txt:'釣到一尾石斑'},{t:'scene',id:'dolphin',n:1,txt:'拍下一次海豚群（白天出海，海豚出現時按 📷）'}],
  page:'手記最後幾頁（字跡很淡）\n「海王守著深藍的海溝。他以為是人類偷走了月潮。\n只有親手證明人與海可以共處，月潮才會回來。這件事，我沒能做到。」',
  xp:12000,coins:4500,unlock:'遠洋深藍（Lv 18）'},
 {id:'c7',spot:'blue',name:'終章　深淵之王',open:{after:'c6',lv:18},
  intro:'遠洋深藍，海水深得發黑。這裡是海王的領域，也是老漁人一輩子沒能抵達的地方。',
  tasks:[{t:'catch',sp:'marlin',n:1,txt:'釣到一尾旗魚'},{t:'catch',sp:'sail',n:1,txt:'釣到一尾雨傘旗魚'},{t:'boss',id:'king',n:1,txt:'接受大師挑戰，擊敗深淵海王（Lv 24，⭐ 面板）'}],
  page:'終章\n海王沉回深淵前，看了你很久。那天晚上，河口的堤防在大潮中自己裂開了一道縫，月光順著水流進湖裡。\n你回到碼頭，在手記最後一頁寫下：「月潮回來了。換我守著這片湖。」',
  xp:30000,coins:15000,unlock:'全部完成：獲得稱號「守湖人」'}
];
const SPOT_IDS=['dock','lily','wood','deep','moon','reef','blue','ice'];
S.story=S.story||null;
if(!S.story){ // 第一次載入：已經打開的地圖維持開放（沿用舊規則判斷）
  const OLD={dock:1,lily:2,wood:4,deep:6,moon:1,reef:8,blue:12,ice:10}, grand=[];
  SPOT_IDS.forEach(id=>{ if(id==='dock') return; const ok=S.lv>=OLD[id]&&(id!=='moon'||(S.mer&&S.mer.n>=1)); if(ok&&(S.total||0)>0) grand.push(id); });
  S.story={done:[],prog:{},read:[],grand}; }
const st=S.story; st.prog=st.prog||{}; st.done=st.done||[]; st.read=st.read||[]; st.grand=st.grand||[]; st.seen=st.seen||[];
const byId=id=>CH.find(x=>x.id===id), isDone=id=>st.done.indexOf(id)>=0;
function avail(ch){ const o=ch.open; return (!o.after||isDone(o.after))&&(!o.lv||S.lv>=o.lv); }
function why(ch){ const o=ch.open, r=[]; if(o.after&&!isDone(o.after)) r.push('完成「'+byId(o.after).name.replace(/^.*　/,'')+'」'); if(o.lv&&S.lv<o.lv) r.push('Lv '+o.lv); if(o.kayak&&!S.kayak) r.push('獨木舟'); if(o.yacht&&!S.yacht) r.push('漁船'); return r; }
/* 地圖開放：以章節為準；舊存檔已開放的維持開放 */
function lock(i){ const id=SPOT_IDS[i]; if(id==='dock'||st.grand.indexOf(id)>=0) return null; const ch=CH.find(x=>x.spot===id); if(!ch) return null;
  const r=why(ch).filter(x=>x!=='獨木舟'&&x!=='漁船'); return r.length?'需要：'+r.join('、'):null; }
function active(){ return CH.filter(ch=>!isDone(ch.id)&&avail(ch)); }
function prog(ch){ return st.prog[ch.id]=st.prog[ch.id]||ch.tasks.map(()=>0); }
function bump(match){ let changed=false;
  for(const ch of active()){ const p=prog(ch); ch.tasks.forEach((t,i)=>{ if(p[i]>=t.n) return; const d=match(t); if(d>0){ p[i]=Math.min(t.n,p[i]+d); changed=true; if(p[i]>=t.n) c.toast('📜 任務完成：'+t.txt,'good',2400); } });
    if(p.every((v,i)=>v>=ch.tasks[i].n)) finish(ch); }
  if(changed){ c.persist(); dot(); } }
function finish(ch){ if(isDone(ch.id)) return; st.done.push(ch.id); c.addXP(ch.xp); S.coins+=ch.coins; if(ch.baits){ S.baits=S.baits||{}; for(const k in ch.baits) S.baits[k]=(S.baits[k]||0)+ch.baits[k]; } c.setCoins(); if(c.syncHUD) c.syncHUD(); c.persist(); dot();
  if(ch.id==='c7'){ S.titles=S.titles||[]; if(S.titles.indexOf('守湖人')<0) S.titles.push('守湖人'); }
  setTimeout(()=>{ if(ch.id==='c7') showEnding(ch); else showPage(ch,true); c.Snd&&c.Snd.fanfare&&c.Snd.fanfare(2); c.vib&&c.vib([40,40,120]); },1800); }
/* 事件掛鉤 */
function onCatch(fd,ctx){ if(!fd||!fd.sp) return; bump(t=>{ if(t.t!=='catch') return 0;
  if(t.sp&&fd.sp.id!==t.sp) return 0; if(t.zone&&ctx.zone!==t.zone) return 0; if(t.loc&&ctx.loc!==t.loc) return 0; if(t.per&&ctx.per!==t.per) return 0; if(t.rain&&!ctx.rain) return 0; if(t.rar&&fd.sp.rar<t.rar) return 0; return 1; }); }
const onPerfect=()=>bump(t=>t.t==='perfect'?1:0), onItem=()=>bump(t=>t.t==='item'?1:0);
const onScene=id=>bump(t=>t.t==='scene'&&t.id===id?1:0), onBoss=id=>bump(t=>t.t==='boss'&&t.id===id?1:0);
/* 主線正在追的魚：在指定地點（沒指定就任何地方）出現率 ×3；任務完成後恢復 */
function needs(type){ return active().some(ch=>{ const p=prog(ch); return ch.tasks.some((t,i)=>t.t===type&&p[i]<t.n); }); }
function boost(spId,zone){ for(const ch of active()){ const p=prog(ch); for(let i=0;i<ch.tasks.length;i++){ const t=ch.tasks[i]; if(t.t==='catch'&&t.sp===spId&&p[i]<t.n&&(!t.zone||t.zone===zone)) return 3; } } return 1; }
/* ===== 開場過場：電影黑邊＋旁白逐段淡入，背後是即時的湖面 ===== */
const OPEN=['三年前的冬天，湖邊的老漁人走了。','他把碼頭留給了你——一座歪斜的木碼頭，和一間堆滿釣具的小屋。','整理小屋時，你在漁具箱底找到一本泡過水的手記。','大半頁都被撕走了，封面上只剩一行字：','「給下一個守著這片湖的人。」','湖面起霧了。你拿起他留下的釣竿，走上碼頭。'];
const cin=document.createElement('div'); cin.id='cinBox'; cin.className='hidden'; document.body.appendChild(cin);
const ccss=document.createElement('style'); ccss.textContent=`#cinBox{position:fixed;inset:0;z-index:28;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:0 26px;text-align:center;color:#eef2f6;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.55) 50%,rgba(0,0,0,.25))}#cinBox.hidden{display:none}
#cinBox:before,#cinBox:after{content:'';position:absolute;left:0;right:0;height:11vh;background:#000;animation:barIn 1.2s ease forwards}#cinBox:before{top:0;transform:translateY(-100%)}#cinBox:after{bottom:0;transform:translateY(100%)}
@keyframes barIn{to{transform:none}}
body.cine>*:not(#cinBox):not(canvas):not(#toast){visibility:hidden!important}
#cinBox p{margin:8px 0;font-size:17px;line-height:1.75;font-family:serif;text-shadow:0 2px 10px #000;opacity:0;animation:cinIn 1.8s ease forwards}#cinBox p.gold{color:#ffe3a3;font-size:19px}
#cinBox .sk{position:absolute;top:calc(11vh + 10px);right:14px;z-index:2;background:rgba(0,0,0,.45);color:#ddd;border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:5px 14px;font-size:13px}
#cinBox .go{opacity:0;animation:cinIn 1s ease forwards;margin-top:20px;padding:10px 30px;border-radius:999px;border:0;background:#ffd56a;color:#2a1a00;font-weight:800;font-size:15px}
#cinBox .ct{font-size:13px;letter-spacing:4px;color:#d9c08a;opacity:0;animation:cinIn 1s ease forwards}#cinBox h2{margin:6px 0 4px;font-size:24px;color:#ffe3a3;opacity:0;animation:cinIn 1.2s ease forwards;font-family:serif}
#cinBox .tn{font-size:13px;color:#c9d2dc;opacity:0;animation:cinIn 1s ease forwards}
@keyframes cinIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`; document.head.appendChild(ccss);
let cinOn=false;
function showIntro(){ const step=2.6; cinOn=true;
  cin.innerHTML='<button class="sk" data-c="end">略過 ›</button>'+OPEN.map((t,i)=>`<p class="${i===4?'gold':''}" style="animation-delay:${(1+i*step).toFixed(1)}s">${t}</p>`).join('')+
    `<button class="go" data-c="end" style="animation-delay:${(1+OPEN.length*step).toFixed(1)}s">開始</button>`;
  cin.classList.remove('hidden'); document.body.classList.add('cine'); if(c.pan) c.pan(true); }
function endIntro(){ cin.classList.add('hidden'); document.body.classList.remove('cine'); cinOn=false; if(c.pan) c.pan(false); if(!st.intro){ st.intro=1; c.persist(); } cardAt=performance.now()+1200; }
/* ===== 章節開場卡：新章節開放且玩家空閒時出現一次 ===== */
const SPOTN={dock:'木碼頭',lily:'浮萍灣',wood:'倒木區',deep:'深水中央',moon:'月光灣',reef:'近海礁岩',blue:'遠洋深藍',ice:'冰湖'};
function showCard(ch){ cinOn=true; const i=SPOT_IDS.indexOf(ch.spot), here=c.curSpot&&c.curSpot()===i, lk=lock(i), boat=(ch.open.kayak&&!S.kayak)?'獨木舟':(ch.open.yacht&&!S.yacht)?'漁船':null;
  const act=here?'<button class="go" data-c="close" style="animation-delay:2.2s">開始</button>':(!lk&&!boat)?`<button class="go" data-c="go" data-v="${i}" style="animation-delay:2.2s">前往${SPOTN[ch.spot]}</button><br><button class="sk" style="position:static;margin-top:12px;opacity:.8" data-c="close">稍後再去</button>`:`<p class="tn" style="animation-delay:2s">${boat==='漁船'?'先到 🗺️ 釣點清單修復老漁人的漁船':boat?'先到 🗺️ 釣點清單購買'+boat:'尚未開放'}</p><button class="go" data-c="close" style="animation-delay:2.4s">知道了</button>`;
  cin.innerHTML=`<div class="ct" style="animation-delay:.6s">${ch.side?'支線':'新章節'}</div><h2 style="animation-delay:1s">${ch.name.replace(/^.*　/,'')}</h2><div class="ct" style="animation-delay:1.2s;letter-spacing:1px">${ch.name.split('　')[0]}・${SPOTN[ch.spot]}</div><p style="animation-delay:1.6s;font-size:15px">${ch.intro.split('\n')[0]}</p><div class="tn" style="animation-delay:2s">${ch.tasks.length} 個任務，詳情在 📜 手記</div>`+act;
  cin.classList.remove('hidden'); document.body.classList.add('cine'); if(st.seen.indexOf(ch.id)<0){ st.seen.push(ch.id); c.persist(); } }
cin.addEventListener('click',e=>{ const b=e.target.closest('[data-c]'); if(!b) return; const a=b.dataset.c;
  if(a==='end') endIntro(); else { cin.classList.add('hidden'); document.body.classList.remove('cine'); cinOn=false; if(c.pan) c.pan(false); cardAt=performance.now()+1500; if(a==='go') c.goSpot(+b.dataset.v); } });
let cardAt=performance.now()+3000;   // 用真實時間計時，不受每幀時間差上限影響
function tryCard(){ if(cinOn||!st.intro) return; const now=performance.now(); if(now<cardAt) return; cardAt=now+2000;
  if(!box.classList.contains('hidden')||!document.getElementById('endBox').classList.contains('hidden')) return;
  if(c.idle&&!c.idle()) return; const ch=active().find(x=>st.seen.indexOf(x.id)<0); if(ch) showCard(ch); }
let moonClock=0; function tick(dt){ tryCard(); moonClock-=dt; if(moonClock>0) return; moonClock=2; if(S.moon&&S.moon.done) bump(t=>t.t==='moon'?1:0); }
const sb=document.getElementById('startBtn'); if(sb) sb.addEventListener('click',()=>{ if(!st.intro) setTimeout(showIntro,700); });
/* 手記面板 */
const btn=document.createElement('button'); btn.className='chip sm'; btn.id='storyBtn'; btn.setAttribute('aria-label','老漁人的手記'); btn.textContent='📜';
const t2=document.getElementById('top2'); if(t2) t2.appendChild(btn);
const box=document.createElement('div'); box.id='storyBox'; box.className='hidden'; document.body.appendChild(box);
const css=document.createElement('style'); css.textContent=`#storyBtn{position:relative;min-width:38px;min-height:27px;justify-content:center}#storyBtn.dot::after{content:'';position:absolute;top:2px;right:2px;width:9px;height:9px;border-radius:50%;background:#ff5a4a}
#storyBox{position:fixed;inset:0;z-index:9;background:rgba(4,8,7,.66);display:flex;align-items:flex-end;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 40px) 10px calc(env(safe-area-inset-bottom,0px) + 10px)}#storyBox.hidden{display:none}
#storyBox .pn{width:100%;max-width:520px;max-height:100%;overflow:auto;background:linear-gradient(180deg,#2a2216,#1a150e);border:1px solid rgba(230,200,140,.35);border-radius:18px;padding:16px 16px 18px;color:#f1e6cc;box-shadow:0 10px 40px rgba(0,0,0,.5)}
#storyBox h3{margin:0 0 4px;font-size:19px;color:#ffe3a3}#storyBox .x{float:right;background:none;border:0;color:#f1e6cc;font-size:22px}
#storyBox .intro{white-space:pre-line;font-size:14px;line-height:1.7;color:#e6d8b8;margin:6px 0 10px}#storyBox .tk{display:flex;gap:8px;align-items:center;padding:8px 10px;margin:6px 0;border-radius:10px;background:rgba(255,255,255,.05);font-size:14px}
#storyBox .tk.ok{color:#9ee6a0}#storyBox .tk b{margin-left:auto;font-variant-numeric:tabular-nums}#storyBox .sec{margin:14px 0 6px;font-size:13px;color:#d9c08a;font-weight:800}
#storyBox .ch{padding:8px 10px;margin:5px 0;border-radius:10px;border:1px solid rgba(230,200,140,.18);font-size:14px;display:flex;justify-content:space-between;gap:8px}#storyBox .ch small{color:#bfae88}#storyBox .ch button{background:#ffd56a;color:#2a1a00;border:0;border-radius:8px;padding:3px 10px;font-weight:800}
#storyBox .page{white-space:pre-line;font-size:15px;line-height:1.85;padding:14px;border-radius:12px;background:#efe2c4;color:#3a2b14;font-family:serif;box-shadow:inset 0 0 30px rgba(120,80,30,.25)}#storyBox .rw{margin-top:10px;font-size:13px;color:#ffe3a3}`;
document.head.appendChild(css);
function render(){ const act=active(); let h='<div class="pn"><button class="x" data-s="close">✕</button><h3>📜 老漁人的手記</h3>';
  if(!act.length&&isDone('c7')) h+='<div class="intro">所有章節都完成了。月潮回到了湖裡，你成了守湖人。</div>';
  for(const ch of act){ const p=prog(ch); h+=`<div class="sec">${ch.side?'支線':'目前章節'}</div><h3 style="font-size:17px">${ch.name}</h3><div class="intro">${ch.intro}</div>`;
    h+=ch.tasks.map((t,i)=>`<div class="tk${p[i]>=t.n?' ok':''}">${p[i]>=t.n?'✅':'▫️'} ${t.txt}<b>${Math.min(p[i],t.n)}/${t.n}</b></div>`).join('');
    h+=`<div class="rw">完成獎勵：經驗 ${ch.xp.toLocaleString()}、金幣 ${ch.coins.toLocaleString()}，開放 ${ch.unlock}</div>`; }
  const nxt=CH.filter(ch=>!isDone(ch.id)&&!avail(ch));
  if(nxt.length){ h+='<div class="sec">尚未開放</div>'+nxt.map(ch=>`<div class="ch"><span>🔒 ${ch.name}</span><small>需要：${why(ch).join('、')}</small></div>`).join(''); }
  const dn=CH.filter(ch=>isDone(ch.id)); if(dn.length) h+='<div class="sec">已收集的手記</div>'+dn.map(ch=>`<div class="ch"><span>📖 ${ch.name}</span><button data-s="read" data-v="${ch.id}">閱讀</button></div>`).join('');
  box.innerHTML=h+'</div>'; }
/* 終章結局：全螢幕，文字逐段淡入 */
const END=['海王沉回了深淵。','那一夜大潮，河口的堤防在浪裡裂開一道縫。','月光順著海水流進河口，流過倒木、流過浮萍，一路回到碼頭前。','汐月在浪頭上回頭看了你一眼，然後游向大海。','你翻開手記最後一頁，在老漁人的字跡下面寫——','「月潮回來了。換我守著這片湖。」'];
const ed=document.createElement('div'); ed.id='endBox'; ed.className='hidden'; document.body.appendChild(ed);
const ecss=document.createElement('style'); ecss.textContent=`#endBox{position:fixed;inset:0;z-index:27;background:radial-gradient(ellipse at 50% 30%,#1b2c4a,#05080f 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 26px;text-align:center;color:#e9f0ff}#endBox.hidden{display:none}
#endBox p{margin:9px 0;font-size:17px;line-height:1.7;font-family:serif;opacity:0;animation:endIn 1.6s ease forwards}#endBox p.last{font-size:20px;color:#ffe3a3;margin-top:18px}
#endBox .tt{opacity:0;animation:endIn 1.4s ease forwards;margin-top:26px;font-size:15px;color:#ffd56a}#endBox button{opacity:0;animation:endIn 1s ease forwards;margin-top:22px;padding:10px 26px;border-radius:999px;border:0;background:#ffd56a;color:#2a1a00;font-weight:800;font-size:15px}
@keyframes endIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`; document.head.appendChild(ecss);
function showEnding(ch){ const step=2.4;
  ed.innerHTML=END.map((t,i)=>`<p class="${i===END.length-1?'last':''}" style="animation-delay:${(i*step).toFixed(1)}s">${t}</p>`).join('')+
    `<div class="tt" style="animation-delay:${(END.length*step+.5).toFixed(1)}s">🏆 獲得稱號「守湖人」<br><small>經驗 ${ch.xp.toLocaleString()}・金幣 ${ch.coins.toLocaleString()}</small></div><button data-e="ok" style="animation-delay:${(END.length*step+1.5).toFixed(1)}s">回到碼頭</button>`;
  ed.classList.remove('hidden'); st.ending=1; if(st.read.indexOf(ch.id)<0) st.read.push(ch.id); c.persist(); dot(); }
ed.addEventListener('click',e=>{ if(e.target.closest('[data-e=ok]')) ed.classList.add('hidden'); });
function showPage(ch,isNew){ box.innerHTML=`<div class="pn"><button class="x" data-s="back">✕</button><h3>${isNew?'📖 找回了一頁手記':'📖 '+ch.name}</h3><div class="page">${ch.page}</div>${isNew?`<div class="rw">獲得經驗 ${ch.xp.toLocaleString()}、金幣 ${ch.coins.toLocaleString()}<br>開放：${ch.unlock}</div>`:''}</div>`;
  box.classList.remove('hidden'); if(st.read.indexOf(ch.id)<0){ st.read.push(ch.id); c.persist(); } dot(); }
box.addEventListener('click',e=>{ const b=e.target.closest('[data-s]'); if(!b){ if(e.target===box) box.classList.add('hidden'); return; }
  const a=b.dataset.s; if(a==='close') box.classList.add('hidden'); else if(a==='back') render(); else if(a==='read'){ const ch=byId(b.dataset.v); if(ch.id==='c7'){ box.classList.add('hidden'); showEnding(ch); } else showPage(ch,false); } });
btn.addEventListener('click',()=>{ render(); box.classList.remove('hidden'); });
function dot(){ btn.classList.toggle('dot',st.done.some(id=>st.read.indexOf(id)<0)||active().some(ch=>!st.prog[ch.id])); }
dot();
function freePage(t,h){ box.innerHTML=`<div class="pn"><button class="x" data-s="close">✕</button><h3>📖 ${t}</h3><div class="page">${h}</div></div>`; box.classList.remove('hidden'); }
return {page:freePage,intro:showIntro,needs,boost,showEnding:()=>showEnding(byId('c7')),lock,onCatch,onPerfect,onItem,onScene,onBoss,tick,done:isDone};
}
