/* ===== 變異個體收集 =====
   每種魚除了一般個體，還有三種稀有的變異：白化、黑化、黃金。釣到會記在圖鑑裡（每種魚 3 格），
   價值加倍，另有整套收集的成就。給喜歡「收集、開圖鑑」的玩家一個長期目標：魚種釣齊之後還有三倍的格子要填。
   - 機率：白化、黑化各約 1/45，黃金約 1/220；連續沒出會慢慢提高（保底），不會永遠碰不到
   - 外觀：只改這一條魚的材質顏色（共用模型，離開漁獲畫面就還原），不另外載模型
   - 存檔：save.vars[魚種]={albino:次數,melan:次數,gold:次數}；save.varPity＝連續沒出的次數 */
(function(){
  const VARS=[
    {id:'albino',name:'白化',icon:'🤍',p:1/45,mult:4,desc:'天生缺少色素，全身乳白帶粉。野外極難存活，釣到是運氣。'},
    {id:'melan',name:'黑化',icon:'🖤',p:1/45,mult:4,desc:'黑色素過多，通體墨黑。在水裡幾乎看不見牠。'},
    {id:'gold',name:'黃金',icon:'💛',p:1/220,mult:15,desc:'傳說中的黃金個體，鱗片像鍍了一層金。老漁人說一輩子只見過一次。'}];
  const BY={}; VARS.forEach(v=>BY[v.id]=v);
  const S=()=>window.__SAVE||{};
  function roll(fd,rnd){ if(!fd||fd.item||fd.practice||!fd.sp||fd.sp.special||fd.sp.noSell||fd.sp.loc==='tide') return null;
    const s=S(), pity=s.varPity||0, k=1+Math.min(3,pity/35), r=rnd==null?Math.random():rnd; let acc=0;
    for(const v of VARS){ acc+=v.p*k; if(r<acc){ fd.vr=v.id; fd.value=Math.round(fd.value*v.mult); return v; } }
    return null; }
  function record(fd){ const s=S(); if(!fd||fd.item||fd.practice) return null; if(!fd.vr){ s.varPity=(s.varPity||0)+1; return null; }
    s.varPity=0; s.vars=s.vars||{}; const o=s.vars[fd.sp.id]=s.vars[fd.sp.id]||{}; const first=!o[fd.vr]; o[fd.vr]=(o[fd.vr]||0)+1; return {v:BY[fd.vr],first}; }
  const count=()=>{ const v=S().vars||{}; let n=0; for(const k in v) for(const j in v[k]) if(v[k][j]>0) n++; return n; };
  const countOf=id=>{ const v=S().vars||{}; let n=0; for(const k in v) if(v[k][id]>0) n++; return n; };
  const fullSets=()=>{ const v=S().vars||{}; let n=0; for(const k in v) if(VARS.every(q=>v[k][q.id]>0)) n++; return n; };
  /* 外觀：改材質顏色，記住原值；untint 還原 */
  let tinted=null;
  function untint(){ if(!tinted) return; tinted.traverse(m=>{ if(!m.isMesh) return; (Array.isArray(m.material)?m.material:[m.material]).forEach(mm=>{ const o=mm&&mm.userData&&mm.userData.__vr; if(!o) return;
      mm.color.copy(o.c); if(mm.emissive) mm.emissive.copy(o.e); mm.emissiveIntensity=o.ei; mm.metalness=o.m; mm.roughness=o.r; delete mm.userData.__vr; }); }); tinted=null; }
  function tint(group,id){ untint(); if(!group||!BY[id]||!window.THREE) return; const T=window.THREE; tinted=group;
    group.traverse(m=>{ if(!m.isMesh) return; (Array.isArray(m.material)?m.material:[m.material]).forEach(mm=>{ if(!mm||!mm.color||mm.userData.__vr) return;
      mm.userData.__vr={c:mm.color.clone(),e:mm.emissive?mm.emissive.clone():new T.Color(0),ei:mm.emissiveIntensity||0,m:mm.metalness||0,r:mm.roughness==null?.6:mm.roughness};
      if(id==='albino'){ mm.color.setRGB(2.1,1.95,1.9); if(mm.emissive){ mm.emissive.setRGB(1,.82,.8); mm.emissiveIntensity=.16; } mm.roughness=Math.max(.5,mm.roughness||.6); }
      else if(id==='melan'){ mm.color.setRGB(.16,.16,.2); if(mm.emissive){ mm.emissive.setRGB(0,0,0); mm.emissiveIntensity=0; } mm.roughness=.45; }
      else { mm.color.setRGB(1.9,1.25,.3); if(mm.emissive){ mm.emissive.setRGB(1,.6,.05); mm.emissiveIntensity=.22; } mm.metalness=.65; mm.roughness=.28; } }); }); }
  setInterval(()=>{ const G=window.__G; if(tinted&&G&&G.state!=='catch'&&G.state!=='fight'&&G.state!=='land') untint(); },400);
  /* 圖鑑詳細頁的一列：三格，釣到的亮起來 */
  function dexRow(spId){ const o=(S().vars||{})[spId]||{};
    return '<div class="dexsec"><b>變異個體</b>　'+VARS.map(v=>`<span style="display:inline-block;margin:2px 8px 2px 0;padding:2px 9px;border-radius:99px;border:1px solid rgba(255,255,255,.18);${o[v.id]?'background:rgba(255,213,106,.16)':'opacity:.4'}">${o[v.id]?v.icon+' '+v.name+' ×'+o[v.id]:'？ '+v.name}</span>`).join('')+
      '<br><small style="opacity:.7">白化、黑化約 45 尾出一次，黃金約 220 尾一次；越久沒出機率越高。</small></div>'; }
  const dots=spId=>{ const o=(S().vars||{})[spId]; return o?VARS.filter(v=>o[v.id]>0).map(v=>v.icon).join(''):''; };
  window.__VAR={VARS,BY,roll,record,count,countOf,fullSets,tint,untint,dexRow,dots};
})();
