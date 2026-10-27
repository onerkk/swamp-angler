/* ===== 被咬特效：鱷魚或鯊魚咬到時，畫面閃紅、出現兩排咬痕與流下的血痕，再慢慢淡掉 ===== */
function biteFX(kind){ try{
  const big=kind==='shark', el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:55;pointer-events:none;opacity:1;transition:opacity 1.6s ease 1s';
  // 齒痕：上下兩排尖牙孔，略帶弧度、大小不一；鯊魚的牙比較密、弧度比較大
  const W=innerWidth, H=innerHeight, n=big?13:9, cx=W/2+(Math.random()-.5)*W*.15, cy=H*.48, rx=W*(big?.46:.38), ry=H*(big?.2:.15);
  let teeth=''; for(const s of [-1,1]) for(let i=0;i<n;i++){ const a=Math.PI*(.12+.76*i/(n-1)), x=cx-Math.cos(a)*rx, y=cy+s*(Math.sin(a)*ry*.55+ry*.25), w=(big?20:16)*(.7+Math.random()*.6), h=w*1.7;
    // 牙尖朝向咬合中心（上排往下、下排往上）；只有部分齒孔流下短短的血痕
    const tip=y-s*h; teeth+=`<path d="M${x-w/2},${y} Q${x},${y-s*h*.35} ${x},${tip} Q${x},${y-s*h*.35} ${x+w/2},${y} Z" fill="url(#g)" opacity="${.8+Math.random()*.2}"/>`;
    if(Math.random()<.4){ const sy=Math.max(y,tip); teeth+=`<path d="M${x},${sy} q${(Math.random()-.5)*5},${H*.02} ${(Math.random()-.5)*3},${H*(.025+Math.random()*.05)}" stroke="#6a0006" stroke-width="${2.5+Math.random()*2.5}" fill="none" stroke-linecap="round" opacity=".8"/>`; } }
  el.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(150,0,0,0) 30%,rgba(150,0,0,.55) 75%,rgba(90,0,0,.85) 100%)"></div>
<div class="bf" style="position:absolute;inset:0;background:rgba(220,20,20,.45);transition:opacity .35s"></div>
<svg width="${W}" height="${H}" style="position:absolute;inset:0"><defs><radialGradient id="g"><stop offset="0" stop-color="#3a0004"/><stop offset=".6" stop-color="#8a0010"/><stop offset="1" stop-color="#c41a1a" stop-opacity=".2"/></radialGradient></defs>${teeth}</svg>`;
  document.body.appendChild(el); void el.offsetWidth; setTimeout(()=>{ el.querySelector('.bf').style.opacity=0; el.style.opacity=0; },60);
  // 畫面震動
  const cv=document.getElementById('c'); if(cv){ let k=0; const sh=setInterval(()=>{ k++; cv.style.transform=k>10?'':`translate(${(Math.random()-.5)*16*(1-k/11)}px,${(Math.random()-.5)*16*(1-k/11)}px)`; if(k>10) clearInterval(sh); },35); }
  setTimeout(()=>el.remove(),2900); }catch(e){ console.warn('biteFX',e); } }

/* ===== 新手指引：第一次開始遊戲時，一步一步圈出每個按鈕並說明用途；可略過，也能從設定重看 ===== */
const TUT_STEPS=[
 [null,'歡迎來到濕地','這裡是老漁人留下的碼頭。跟著指引，一分鐘學會怎麼玩。'],
 ['#actBtn','拋竿','按住這個按鈕蓄力，力道條最滿時放開，就能拋得最遠。'],
 [null,'提竿與收線','浮標被拉進水裡時，立刻點一下提竿。拉扯時按住收線；魚衝刺時先放手，往魚游走的反方向滑動拉竿，別讓張力爆表。'],
 [null,'轉向瞄準','在畫面空白處左右拖曳，就能轉身換方向拋竿。'],
 ['#baitChip','魚餌','點這裡換魚餌。不同的餌吸引不同的魚，稀有的餌要到釣具店買。'],
 ['#bMap','釣點','到不同的釣點，會遇到不同的魚。有些地方要獨木舟或修好的漁船才去得了。'],
 ['#bShop','釣具店','買釣竿、魚餌、道具，也能升級裝備。'],
 ['#bQuest','任務','每天都有新委託，完成可以拿金幣和經驗。'],
 ['#bLog','圖鑑與手記','記錄釣過的每一種魚，老漁人的手記故事也在這裡。'],
 ['#bGoal','目標與成就','看看下一個目標，還有「人魚之約」的進度。'],
 ['#bTour','釣魚大賽','限時比賽，釣得越大名次越高。'],
 ['#bCam','拍照','把風景或剛釣到的魚拍下來。'],
 ['#bSet','設定','音效、畫質、存檔，想重看這份新手指引也在這裡。'],
 [null,'開始吧','湖會告訴你很多事，只要你願意等。祝你好運！']];
function startTutorial(force){ try{
  const S=window.__G&&window.__G.saveRef; if(!force&&S&&S.tutDone) return;
  // 開場故事、結局或其他全畫面演出還在播時先等，播完再開始指引
  if(document.body.classList.contains('cine')||document.body.classList.contains('ending')||document.querySelector('#story:not(.hidden)')){ setTimeout(()=>startTutorial(force),1200); return; }
  if(document.getElementById('tutOv')) return;
  let i=0; const ov=document.createElement('div'); ov.id='tutOv';
  ov.style.cssText='position:fixed;inset:0;z-index:70;pointer-events:auto';
  ov.innerHTML='<div class="hole" style="position:absolute;border-radius:14px;box-shadow:0 0 0 9999px rgba(0,0,0,.66);border:2px solid #ffcf66;transition:all .35s;pointer-events:none"></div>'+
   '<div class="box" style="position:absolute;left:50%;transform:translateX(-50%);width:min(330px,86vw);background:rgba(18,26,40,.96);border:1px solid rgba(255,207,102,.55);border-radius:16px;padding:14px 16px;color:#eef3fa;font-size:14px;line-height:1.65;box-shadow:0 10px 30px rgba(0,0,0,.5)">'+
   '<div style="display:flex;justify-content:space-between;align-items:center"><b class="tt" style="color:#ffd27a;font-size:16px"></b><small class="no" style="opacity:.6"></small></div><div class="tx" style="margin:6px 0 10px"></div>'+
   '<div style="display:flex;gap:8px;justify-content:flex-end"><button class="sk" style="border:0;background:none;color:#9aa8bb;padding:8px 10px">略過指引</button><button class="nx" style="border:0;border-radius:999px;background:#ffcf66;color:#3a2600;font-weight:700;padding:8px 18px">下一步</button></div></div>';
  document.body.appendChild(ov);
  const hole=ov.querySelector('.hole'), box=ov.querySelector('.box');
  const done=()=>{ ov.remove(); const S2=window.__G&&window.__G.saveRef; if(S2){ S2.tutDone=1; if(window.__saveNow) window.__saveNow(); } };
  function show(){ const [sel,t,x]=TUT_STEPS[i]; ov.querySelector('.tt').textContent=t; ov.querySelector('.tx').textContent=x; ov.querySelector('.no').textContent=(i+1)+' / '+TUT_STEPS.length;
    ov.querySelector('.nx').textContent=i<TUT_STEPS.length-1?'下一步':'開始釣魚';
    const el=sel&&document.querySelector(sel), r=el&&el.offsetParent!==null?el.getBoundingClientRect():null;
    if(r&&r.width){ const p=6; Object.assign(hole.style,{left:(r.left-p)+'px',top:(r.top-p)+'px',width:(r.width+p*2)+'px',height:(r.height+p*2)+'px',opacity:1});
      const below=r.top<innerHeight*.5; box.style.top=below?(r.bottom+16)+'px':''; box.style.bottom=below?'':(innerHeight-r.top+16)+'px'; }
    else { Object.assign(hole.style,{left:'50%',top:'50%',width:'0px',height:'0px'}); box.style.top=''; box.style.bottom=Math.round(innerHeight*.38)+'px'; } }
  ov.querySelector('.nx').addEventListener('click',()=>{ if(i<TUT_STEPS.length-1){ i++; show(); } else done(); });
  ov.querySelector('.sk').addEventListener('click',done);
  show(); }catch(e){ console.warn('tutorial',e); } }
