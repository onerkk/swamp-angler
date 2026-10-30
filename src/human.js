/* ===== 人形角色（林秋月／女鬼）的骨架與表情 =====
   骨架：臀→腰→胸→頸→頭；左右肩→上臂→前臂→手（寬袖跟著手臂垂掛）；左右大腿→小腿（長裙跟著擺）；長髮 4 節
   表情：活人臉、女鬼臉兩套，各 6 種（平常／閉眼／說話／圓口或尖叫／微笑或詭笑／含淚或哀傷）
   動作：站立呼吸、眨眼、說話、轉頭（可轉到 180 度：反頭）、頭歪、伸手抓、頭髮垂臉、抖動抽搐、僵硬爬行姿勢
   用法：window.__HUMAN.rig(模型根節點,{ghost:true}) → 控制器 */
window.__HUMAN=(()=>{ let T=null, RECT=null; const init=()=>{ if(!T){ T=window.THREE; RECT=new T.Vector4(.1317,.0442,.1695,.1220); } };   // 臉在模型貼圖上的位置
  const tex={}; const faceT=f=>{ init(); if(!tex[f]){ const t=new T.TextureLoader().load(f); t.encoding=T.sRGBEncoding; t.anisotropy=8; tex[f]=t; } return tex[f]; };
  function faceMat(mat,U){ mat.onBeforeCompile=sh=>{ sh.uniforms.tA=U.tA; sh.uniforms.tB=U.tB; sh.uniforms.uMix=U.mix; sh.uniforms.uRect={value:U.rect||RECT}; sh.uniforms.uW1=U.w1; sh.uniforms.uW2=U.w2; sh.uniforms.uPale=U.pale; sh.uniforms.uVeil=U.veil;
    sh.fragmentShader=sh.fragmentShader.replace('#include <map_pars_fragment>','#include <map_pars_fragment>\nuniform sampler2D tA,tB; uniform float uMix,uPale,uVeil; uniform vec4 uRect,uW1,uW2;\nvec3 cellOf(sampler2D t,int i,vec2 f){ float cx=float(i-3*(i/3)), cy=float(i/3); return sRGBToLinear(texture2D(t,vec2((cx+f.x)/3.,1.-(cy+f.y)/2.))).rgb; }\nvec3 faceOf(sampler2D t,vec2 f){ float s=uW1.x+uW1.y+uW1.z+uW1.w+uW2.x; return cellOf(t,0,f)*max(0.,1.-s)+cellOf(t,1,f)*uW1.x+cellOf(t,2,f)*uW1.y+cellOf(t,3,f)*uW1.z+cellOf(t,4,f)*uW1.w+cellOf(t,5,f)*uW2.x; }')
      .replace('#include <map_fragment>',`#include <map_fragment>
  { vec2 f=(vUv-uRect.xy)/(uRect.zw-uRect.xy); if(f.x>0.&&f.x<1.&&f.y>0.&&f.y<1.){ float m=smoothstep(0.,.2,f.x)*smoothstep(1.,.8,f.x)*smoothstep(0.,.14,f.y)*smoothstep(1.,.86,f.y);
      vec3 c=mix(faceOf(tA,f),faceOf(tB,f),uMix); diffuseColor.rgb=mix(diffuseColor.rgb,c,m*.96); } }
  { vec2 f=(vUv-uRect.xy)/(uRect.zw-uRect.xy); if(uVeil>0.&&f.x>-.15&&f.x<1.15&&f.y>-.3&&f.y<1.25){   /* 貞子：濕黑長髮一縷一縷垂在臉前，縫隙間隱約看到眼睛 */
      float s=fract(f.x*17.+sin(f.y*4.+f.x*9.)*.45+sin(f.x*41.)*.08); float sid=floor(f.x*17.+sin(f.y*4.+f.x*9.)*.45); float pick=step(.62,fract(sin(sid*12.9898)*43758.5)); float gap=pick*smoothstep(.7,.82,s)*smoothstep(.99,.88,s)*smoothstep(.2,.42,f.y)*smoothstep(.75,.55,f.y);   /* 只有少數幾縷之間有縫，剛好露出一點眼睛 */
      float edge=smoothstep(-.15,.05,f.x)*smoothstep(1.15,.95,f.x)*smoothstep(-.3,-.05,f.y)*smoothstep(1.22,1.05,f.y+.25*fract(sin(sid*3.3)*77.1));   /* 每一縷髮尾長短不一 */
      vec3 hairC=vec3(.02,.018,.022)*(.8+.4*fract(sin(sid*7.1)*913.7))+vec3(.015)*smoothstep(.4,.5,s)*smoothstep(.6,.5,s);
      diffuseColor.rgb=mix(diffuseColor.rgb,hairC,uVeil*edge*(1.-gap*.85)); } }
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.3,.55,.15)))*vec3(.86,.9,.95),uPale);   /* 變成女鬼：全身失去血色、偏青灰 */`)
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
  #ifdef USE_EMISSIVEMAP
  { vec2 f=(vUv-uRect.xy)/(uRect.zw-uRect.xy); if(f.x>0.&&f.x<1.&&f.y>0.&&f.y<1.){ float m=smoothstep(0.,.2,f.x)*smoothstep(1.,.8,f.x)*smoothstep(0.,.14,f.y)*smoothstep(1.,.86,f.y);
      totalEmissiveRadiance=mix(totalEmissiveRadiance,mix(faceOf(tA,f),faceOf(tB,f),uMix)*emissive,m*.96); } }
  { vec2 f=(vUv-uRect.xy)/(uRect.zw-uRect.xy); if(uVeil>0.&&f.x>-.15&&f.x<1.15&&f.y>-.3&&f.y<1.25) totalEmissiveRadiance*=1.-uVeil*.85; }   /* 發光圖也換成表情臉，否則烘焙的臉會從發光層透出來 */
  #endif`); };
    mat.customProgramCacheKey=()=>'humanFace'+(U.key||''); mat.needsUpdate=true; }
  function rig(root,opt){ init(); opt=opt||{}; const U={tA:{value:faceT(opt.faceA||'lin_face_alive.jpg')},tB:{value:faceT(opt.faceB||opt.faceA||'lin_face_ghost.jpg')},rect:opt.rect?new T.Vector4(...opt.rect):null,key:opt.faceA||'',mix:{value:opt.ghost?1:0},w1:{value:new T.Vector4()},w2:{value:new T.Vector4()},pale:{value:opt.ghost?.55:0},veil:{value:0}};
    root.updateMatrixWorld(true); let src=null; root.traverse(o=>{ if(o.isMesh&&!src) src=o; }); if(!src) return null;
    const geo=src.geometry.clone(); geo.applyMatrix4(new T.Matrix4().copy(root.matrixWorld).invert().multiply(src.matrixWorld)); geo.computeBoundingBox();
    const bb=geo.boundingBox, H=bb.max.y-bb.min.y, top=bb.max.y, Y=f=>top-f*H, Wd=(bb.max.x-bb.min.x)/2, cx=(bb.max.x+bb.min.x)/2, cz=(bb.max.z+bb.min.z)/2;
    // 清掉異常拉長的薄面（生成工具偶爾留下一條從手拉到腳的細線）
    if(geo.index){ const I=geo.index.array, P0=geo.attributes.position, a=new T.Vector3(), b=new T.Vector3(), c=new T.Vector3(), keep=[];
      for(let k=0;k<I.length;k+=3){ a.fromBufferAttribute(P0,I[k]); b.fromBufferAttribute(P0,I[k+1]); c.fromBufferAttribute(P0,I[k+2]); if(Math.max(a.distanceTo(b),b.distanceTo(c),c.distanceTo(a))>H*.12) continue; keep.push(I[k],I[k+1],I[k+2]); } geo.setIndex(keep); }
    const B={}, mk=(n,p,x,f,z)=>{ const b=new T.Bone(); b.name=n; b.userData.w=new T.Vector3(cx+x*Wd,Y(f),cz+(z||0)); B[n]=b; if(p) B[p].add(b); return b; };
    mk('root',null,0,.5); mk('hips','root',0,.5); mk('spine','hips',0,.42); mk('chest','spine',0,.3); const CH=opt.chin??.14; mk('neck','chest',0,CH+.04); mk('head','neck',0,CH);   /* 下巴的位置依角色（臉的大小不同） */
    for(const [s,k] of [['L',-1],['R',1]]){ mk('sh'+s,'chest',k*.16,.215); mk('up'+s,'sh'+s,k*.3,.225); mk('fo'+s,'up'+s,k*.6,.35); mk('ha'+s,'fo'+s,k*.86,.47); mk('he'+s,'ha'+s,k*.98,.5);
      mk('th'+s,'hips',k*.11,.52); mk('kn'+s,'th'+s,k*.12,.74); mk('an'+s,'kn'+s,k*.12,.95); }
    mk('hr1','chest',0,.13,-.09);   /* 長髮掛在身體上，不掛在頭上：轉頭、歪頭時背後的頭髮和洋裝不會被甩出去 */ mk('hr2','hr1',0,.25,-.1); mk('hr3','hr2',0,.38,-.09); mk('hr4','hr3',0,.5,-.08);
    const list=Object.values(B); list.forEach(b=>{ const pw=b.parent&&b.parent.isBone?b.parent.userData.w:new T.Vector3(); b.position.copy(b.userData.w).sub(pw); });
    const P=geo.attributes.position, n=P.count, si=new Uint16Array(n*4), sw=new Float32Array(n*4), idx=nm=>list.indexOf(B[nm]), v=new T.Vector3();
    const segD=(p,a,b)=>{ const ab=b.clone().sub(a), t=Math.max(0,Math.min(1,p.clone().sub(a).dot(ab)/ab.lengthSq())); return [a.clone().addScaledVector(ab,t).distanceTo(p),t,a.clone().addScaledVector(ab,t)]; };
    const spineC=['head','neck','chest','spine','hips'];
    for(let i=0;i<n;i++){ v.fromBufferAttribute(P,i); const f=(top-v.y)/H, ax=Math.abs(v.x-cx)/Wd; let out=null;
      // 手臂與垂掛的寬袖：從正面看，在手臂線上方一點到下方 0.3H 之間、肩膀以外的部分（只看 x、y，不看前後）
      if(f>.19&&f<.86&&ax>.3){ const s=v.x<cx?'L':'R', ch=['up'+s,'fo'+s,'ha'+s,'he'+s].map(nm=>B[nm].userData.w), dx=Math.abs(v.x-cx);
        let k=0; while(k<2&&dx>Math.abs(ch[k+1].x-cx)) k++; const A=ch[k], Bb=ch[k+1], t=Math.max(0,Math.min(1,(dx-Math.abs(A.x-cx))/Math.max(1e-4,Math.abs(Bb.x-cx)-Math.abs(A.x-cx)))), ly=A.y+(Bb.y-A.y)*t;
        if(v.y<ly+.05*H&&v.y>ly-.42*H){ const nm=['up'+s,'fo'+s,'ha'+s][k], soft=Math.min(1,Math.max(0,(ax-.3)/.1)), body=f<.5?'chest':'hips';
          out=k===0&&t<.35?[[nm,soft*(.35+t*1.85)],['chest',1-soft*(.35+t*1.85)]]:[[nm,soft],[body,1-soft]]; } }
      // 長髮
      if(!out&&v.z<B.neck.userData.w.z-.045&&f>.12&&f<(opt.hairMax??.58)&&ax<.24){   /* 頭髮的長度依角色：短髮的小女孩、老漁人不能把背部衣服當成頭髮 */ const k=Math.min(3,Math.max(0,(f-.13)/.12)), a=Math.floor(Math.min(2.999,k)); out=[['hr'+(a+1),1-(k-a)],['hr'+(a+2),k-a]]; if(f>.5){ const g=(f-.5)/.08; out=[[out[0][0],out[0][1]*(1-g)],[out[1][0],out[1][1]*(1-g)],['hips',g]]; } }
      // 下半身：裙子跟著左右腿擺動（越往下越跟腿，中間兩腿混合）
      if(!out&&f>.5){ const s=v.x<cx?'L':'R', o=s==='L'?'R':'L', side=Math.min(1,ax/.18), g=Math.min(1,(f-.5)/.12); const leg=f<.74?'th':(f<.95?'kn':'an');
        const wl=g*(.5+.5*side); out=[['hips',1-g],[leg+s,wl],[leg+o,g-wl]]; }
      // 頭與兩側垂下的頭髮整塊跟頭走：轉頭、歪頭時臉和頭髮不會被扯開（原本兩側頭髮綁在脖子和胸口，頭一轉就拉出長長的貼圖）
      if(!out&&f<(opt.headMax??.3)){ const hx=Math.abs(v.x-cx)/Wd, chinF=CH;
        if(f<chinF) out=[['head',1]];
        
        else if(f<CH+.05&&hx<.06){ const k=(f-chinF)/.05; out=[['head',1-k],['neck',k]]; }   // 脖子本身：短短一段過渡
        else if(f<CH+.05){ out=[['chest',1]]; } }   /* 脖子以外（領口、肩膀）一律跟身體，轉頭時不會撕開洋裝 */
      if(!out){ const ys=spineC.map(c2=>B[c2].userData.w.y); let a=0; while(a<spineC.length-2&&v.y<ys[a+1]) a++; const t=Math.max(0,Math.min(1,(ys[a]-v.y)/Math.max(1e-4,ys[a]-ys[a+1]))); out=[[spineC[a],1-t],[spineC[a+1],t]]; }
      out.slice(0,4).forEach(([b,w],k)=>{ si[i*4+k]=idx(b); sw[i*4+k]=Math.max(0,w); }); const s2=sw[i*4]+sw[i*4+1]+sw[i*4+2]+sw[i*4+3]||1; for(let k=0;k<4;k++) sw[i*4+k]/=s2; }
    geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4)); geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
    const mat=src.material.clone(); mat.skinning=true; faceMat(mat,U);
    if(opt.debugW){ const col=new Float32Array(n*3); for(let i=0;i<n;i++){ const nm=list[si[i*4]].name; const c=/^(up|fo|ha|he[LR]|sh)/.test(nm)?[1,.1,.1]:/^hr/.test(nm)?[.2,.3,1]:/^(th|kn|an)/.test(nm)?[.1,1,.2]:[1,1,1]; col.set(c,i*3); } geo.setAttribute('color',new T.Float32BufferAttribute(col,3)); mat.vertexColors=true; mat.map=null; mat.emissiveMap=null; mat.onBeforeCompile=()=>{}; }
    const sk=new T.SkinnedMesh(geo,mat); sk.frustumCulled=false; src.parent.remove(src); root.add(sk); sk.add(B.root); sk.updateMatrixWorld(true); sk.bind(new T.Skeleton(list));
    const rest={}; list.forEach(b=>rest[b.name]=b.quaternion.clone()); const q=new T.Quaternion(), e=new T.Euler(0,0,0,'YXZ');
    const rot=(b,x,y,z)=>{ e.set(x,y,z,'YXZ'); q.setFromEuler(e); B[b].quaternion.copy(rest[b]).multiply(q); };
    // 狀態：可由劇情設定的姿勢參數（0～1 平滑過渡）
    const st={t:0,last:performance.now(),blink:0,nb:2,talk:0,hy:0,hp:0,hr:0,reach:0,hairFace:0,twitch:0,crawl:0,expr:-1,exprK:0,lean:0,armUp:0,walk:0,wph:0},
      tg={hy:0,hp:0,hr:0,reach:0,hairFace:0,twitch:0,crawl:0,lean:0,armUp:0,walk:0};
    const tick=()=>{ const now=performance.now(), dt=Math.min(.05,(now-st.last)/1000); st.last=now; if(dt<=0) return; st.t+=dt; const t=st.t;
      for(const k in tg){ const sp=k==='hy'?(opt.snap?40:3):k==='twitch'?20:4; st[k]+=(tg[k]-st[k])*Math.min(1,dt*sp); }
      st.nb-=dt; if(st.nb<=0){ st.blink=.15; st.nb=2+Math.random()*4; } st.blink=Math.max(0,st.blink-dt); const bl=st.blink>0?Math.sin((1-st.blink/.15)*Math.PI):0;
      st.talk=Math.max(0,st.talk-dt); const tk=st.talk>0?1:0, ah=tk*Math.max(0,Math.sin(t*10)*.5+Math.sin(t*6.7)*.5);
      st.exprK+=((st.expr>=0?1:0)-st.exprK)*Math.min(1,dt*(st.expr===3?14:5));
      const E=[0,0,0,0,0], ek=st.exprK; if(st.expr===3) E[2]=ek; if(st.expr===4) E[3]=ek; if(st.expr===5) E[4]=ek;
      U.w1.value.set(bl*(st.expr===3?0:1),ah*.9*(1-ek),Math.max(tk*.25*Math.max(0,Math.sin(t*5.1)),E[2]),E[3]); U.w2.value.set(E[4],0,0,0);
      const tw=st.twitch, jit=()=>tw*(Math.random()-.5)*.35;   // 抽搐：關節突然一跳一跳
      const br=Math.sin(t*1.6)*.02;
      rot('hips',st.crawl*1.35,0,0); rot('spine',(st.lean+st.reach*.6)*.25+br*.5+jit(),jit(),jit()); rot('chest',br+st.crawl*-.2+jit(),0,jit());
      rot('neck',st.hp*.35+jit(),st.hy*.3,st.hr*.35); rot('head',st.hp*.65+Math.sin(t*.5)*.03*(1-tw)+jit(),st.hy*.7+jit(),st.hr*.65+jit());
      for(const [s,k] of [['L',-1],['R',1]]){ const relax=(opt.relax||0)*(1-st.reach)*(1-st.armUp);   /* 寬袖和洋裝是連在一起的：手臂只微微放下（女鬼略張的雙手），避免把布料拉開 */
        rot('up'+s,-st.reach*.25-st.crawl*1.0+jit(),0,k*(relax+st.armUp*.9+.03*Math.sin(t*.8+k))+jit());   /* 這個模型手臂往下的方向和美人魚相反 */   // 伸手往前抓／爬行時手撐地
        rot('fo'+s,-st.reach*1.1,-k*.15,k*st.crawl*.6+jit()); rot('ha'+s,-st.reach*.5,0,k*.1+jit()+k*st.reach*.3*Math.sin(t*14));   /* 手指一抓一抓 */
        const wl=st.walk*Math.sin(st.wph+(k>0?Math.PI:0)); rot('th'+s,-st.crawl*1.4-wl*.12,0,0); rot('kn'+s,st.crawl*2.0+Math.max(0,-wl)*.15*st.walk,0,0);   /* 走路：兩腿交替跨步 */ rot('an'+s,0,0,0); }
      ['hr1','hr2','hr3','hr4'].forEach((nm,i)=>rot(nm,.05+Math.sin(t*.9-i*.6)*.04*(i+1)-st.hairFace*(i===0?2.6:.25),Math.sin(t*.5-i*.4)*.05,0));   /* 頭歪時長髮仍然往下垂，不會跟著頭橫出去 */   // 頭髮垂到臉前
    };
    sk.onBeforeRender=tick;
    return {mesh:sk,bones:B,step:d=>{ st.wph+=d; },set:(k,v2)=>{ tg[k]=v2; },now:(k,v2)=>{ tg[k]=v2; st[k]=v2; },talk:s=>{ st.talk=Math.max(st.talk,s||2.5); },expr:i=>{ st.expr=i; },ghost:k=>{ U.mix.value=k; U.pale.value=k*.55; },veil:k=>{ U.veil.value=k; },adv:sec=>{ for(let k=0;k<sec/.05;k++){ st.last-=50; tick(); } }}; }
  // 其他角色：小女孩（生前的林秋月）、老漁人
  const PRESET={girl:{faceA:'girl_face.jpg',rect:[.1424,.0638,.1964,.1641],relax:-.55,hairMax:.27,chin:.155},old:{faceA:'old_face.jpg',rect:[.1479,.0451,.1937,.1292],relax:-.12,hairMax:.12,chin:.13}};
  return {rig,preset:(name,root,o)=>rig(root,Object.assign({},PRESET[name]||{},o||{})),PRESET};
})();
