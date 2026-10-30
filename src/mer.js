/* ===== 美人魚的骨架與表情（依新設定圖生成的模型，載入後在執行時自動加骨架）=====
   骨架：臀→腰→胸→頸→頭；左右肩→上臂→前臂→手；尾巴 6 節＋尾鰭；頭髮 3 節
   表情：臉部那一小塊改用高解析度表情貼圖（平常／閉眼／說話啊／說話喔／微笑／看旁邊）混合，會眨眼、說話嘴巴開合、微笑、偶爾看旁邊
   用法：window.__MER.rig(載入的模型根節點) → 回傳控制器（自己跟著畫面更新；可呼叫 talk(秒)、wave()、smile(秒)、look(秒)、swim(0~1)） */
window.__MER=(()=>{ let T=null, FACE_RECT=null;   /* 3D 引擎（THREE）可能比這段程式晚載好：用到時才取用，不能在載入時就碰 THREE */
  const init=()=>{ if(!T){ T=window.THREE; FACE_RECT=new T.Vector4(.16929,.05296,.20686,.10781); } };   // 臉在模型貼圖上的位置（u0,v0,u1,v1；v 由上往下）
  let faceTex=null; const faceT=()=>{ init(); if(!faceTex){ faceTex=new T.TextureLoader().load('mer_face2.jpg'); faceTex.encoding=T.sRGBEncoding; faceTex.anisotropy=8; } return faceTex; };
  function faceMat(mat,W){ mat.onBeforeCompile=sh=>{ sh.uniforms.tFace={value:faceT()}; sh.uniforms.uRect={value:FACE_RECT}; sh.uniforms.uFW=W.a; sh.uniforms.uFW2=W.b;
    sh.fragmentShader=sh.fragmentShader.replace('#include <map_pars_fragment>','#include <map_pars_fragment>\nuniform sampler2D tFace; uniform vec4 uRect, uFW, uFW2;\nvec3 cellC(int i, vec2 f){ float cx=float(i-3*(i/3)), cy=float(i/3); return sRGBToLinear(texture2D(tFace,vec2((cx+f.x)/3.,1.-(cy+f.y)/2.))).rgb; }')
      .replace('#include <map_fragment>',`#include <map_fragment>
  { vec2 f=(vUv-uRect.xy)/(uRect.zw-uRect.xy); if(f.x>0.&&f.x<1.&&f.y>0.&&f.y<1.){ float m=smoothstep(0.,.2,f.x)*smoothstep(1.,.8,f.x)*smoothstep(0.,.16,f.y)*smoothstep(1.,.84,f.y);
      float wsum=uFW.x+uFW.y+uFW.z+uFW.w+uFW2.x; vec3 c=cellC(0,f)*max(0.,1.-wsum)+cellC(1,f)*uFW.x+cellC(2,f)*uFW.y+cellC(3,f)*uFW.z+cellC(4,f)*uFW.w+cellC(5,f)*uFW2.x;
      diffuseColor.rgb=mix(diffuseColor.rgb,c,m*.96); } }`); };
    mat.customProgramCacheKey=()=>'merFace'; mat.needsUpdate=true; }
  function rig(root,opt){ init(); opt=opt||{}; faceT(); root.updateMatrixWorld(true);   /* 表情貼圖一開始就下載（第一次畫到臉之前要載好，否則那塊會是黑的） */ let src=null; root.traverse(o=>{ if(o.isMesh&&!src) src=o; }); if(!src) return null;
    const geo=src.geometry.clone(); geo.applyMatrix4(new T.Matrix4().copy(root.matrixWorld).invert().multiply(src.matrixWorld)); geo.computeBoundingBox();
    const bb=geo.boundingBox, H=bb.max.y-bb.min.y, top=bb.max.y, Y=f=>top-f*H, Wd=(bb.max.x-bb.min.x)/2, cx=(bb.max.x+bb.min.x)/2, cz=(bb.max.z+bb.min.z)/2;
    // 骨頭（位置用設定圖的身體比例）
    const B={}, mk=(n,p,x,f,z)=>{ const b=new T.Bone(); b.name=n; b.userData.w=new T.Vector3(cx+x*Wd,Y(f),cz+(z||0)); B[n]=b; if(p) B[p].add(b); return b; };
    mk('root',null,0,.36); mk('hips','root',0,.36); mk('spine','hips',0,.29); mk('chest','spine',0,.21); mk('neck','chest',0,.155); mk('head','neck',0,.125);
    for(const [s,k] of [['L',-1],['R',1]]){ mk('sh'+s,'chest',k*.14,.17); mk('up'+s,'sh'+s,k*.27,.18); mk('fo'+s,'up'+s,k*.58,.3); mk('ha'+s,'fo'+s,k*.86,.36); mk('he'+s,'ha'+s,k*1,.38); }
    let pr='hips'; ['t1','t2','t3','t4','t5','t6'].forEach((n,i)=>{ mk(n,pr,0,.44+i*.085); pr=n; }); mk('fin','t6',0,.94);
    mk('hr1','head',0,.14,-.07); mk('hr2','hr1',0,.24,-.08); mk('hr3','hr2',0,.33,-.07); mk('hr4','hr3',0,.42,-.06);
    const list=Object.values(B); list.forEach(b=>{ const pw=b.parent&&b.parent.isBone?b.parent.userData.w:new T.Vector3(); b.position.copy(b.userData.w).sub(pw); });
    // 權重
    const P=geo.attributes.position, n=P.count, si=new Uint16Array(n*4), sw=new Float32Array(n*4), idx=n2=>list.indexOf(B[n2]);
    const segD=(p,a,b)=>{ const ab=b.clone().sub(a), t=Math.max(0,Math.min(1,p.clone().sub(a).dot(ab)/ab.lengthSq())); return [a.clone().addScaledVector(ab,t).distanceTo(p),t]; };
    const v=new T.Vector3(); const chain=['head','neck','chest','spine','hips','t1','t2','t3','t4','t5','t6','fin'];
    for(let i=0;i<n;i++){ v.fromBufferAttribute(P,i); const f=(top-v.y)/H, ax=Math.abs(v.x-cx)/Wd; let out=null;
      // 手臂：A 字張開的手臂離身體中線夠遠
      if(f>.15&&f<.42&&ax>.23){ const s=v.x<cx?'L':'R'; const segs=[['up'+s,'fo'+s],['fo'+s,'ha'+s],['ha'+s,'he'+s]]; let best=9,bi=0,bt=0; segs.forEach((sg,k)=>{ const [d,t]=segD(v,B[sg[0]].userData.w,B[sg[1]].userData.w); if(d<best){ best=d; bi=k; bt=t; } });
        if(best<.04*H){ const a=segs[bi][0], b=segs[bi][1]; out=bt>.85&&bi<2?[[a,1-(bt-.85)/.3],[segs[bi+1][0],(bt-.85)/.3]]:bt<.15&&bi>0?[[a,.5+bt/.3],[segs[bi-1][0],.5-bt/.3]]:[[a,1]]; if(bi===0&&bt<.3) out=[['up'+s,.3+bt*2.33],['chest',.7-bt*2.33]]; } }   // 肩膀附近和胸部平滑過渡，舉手時腋下不會拉出一大片
      // 頭髮：頭後面垂下來的長髮
      if(!out&&v.z<cz-(f>.3?.055:.02)&&f>.13&&f<.43&&ax<.24){ const k=Math.min(3,Math.max(0,(f-.14)/.09)), a=Math.floor(Math.min(2.999,k)); out=[['hr'+(a+1),1-(k-a)],['hr'+(a+2),k-a]]; if(f>.37){ const g=(f-.37)/.06; out=[[out[0][0],out[0][1]*(1-g)],[out[1][0],out[1][1]*(1-g)],['hips',g]]; } }   // 長髮到腰，髮尾和腰慢慢過渡
      if(!out){ const ys=chain.map(c2=>B[c2].userData.w.y); let a=0; while(a<chain.length-2&&v.y<ys[a+1]) a++; const t=Math.max(0,Math.min(1,(ys[a]-v.y)/Math.max(1e-4,ys[a]-ys[a+1]))); out=[[chain[a],1-t],[chain[a+1],t]]; }
      out.slice(0,4).forEach(([b,w],k)=>{ si[i*4+k]=idx(b); sw[i*4+k]=Math.max(0,w); }); const s2=sw[i*4]+sw[i*4+1]+sw[i*4+2]+sw[i*4+3]||1; for(let k=0;k<4;k++) sw[i*4+k]/=s2; }
    geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4)); geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
    const W={a:{value:new T.Vector4()},b:{value:new T.Vector4()}}, mat=src.material.clone(); mat.skinning=true; faceMat(mat,W);   /* r128 要明確開啟 skinning */
    const sk=new T.SkinnedMesh(geo,mat); sk.frustumCulled=false; src.parent.remove(src); root.add(sk);   // 幾何已轉到根節點座標，蒙皮網格直接掛在根節點下
    sk.add(B.root); sk.updateMatrixWorld(true); sk.bind(new T.Skeleton(list));   // 先放好位置再綁定，綁定姿勢才正確
    // 控制
    const st={t:0,blink:0,nextBlink:2,talk:0,smile:0,look:0,lookT:6,wave:0,swim:.5,last:performance.now()}, rest={}; list.forEach(b=>rest[b.name]=b.quaternion.clone());
    const q=new T.Quaternion(), e=new T.Euler(), rot=(b,x,y,z)=>{ e.set(x,y,z); q.setFromEuler(e); B[b].quaternion.copy(rest[b]).multiply(q); };
    const tick=()=>{ const now=performance.now(), dt=Math.min(.05,(now-st.last)/1000); st.last=now; if(dt<=0) return; st.t+=dt; if(opt.uni) st.swim=Math.min(1,.25+opt.uni.uAmp.value*3);
      { const hz=opt.horiz&&opt.horiz()?1:0; st.hz=(st.hz||0)+(hz-(st.hz||0))*Math.min(1,dt*3); sk.rotation.order='YXZ'; sk.rotation.set(Math.PI/2*st.hz,Math.PI/2*st.hz,0);   /* 頭朝前（+X）、背朝上、肚子朝下 */ if(hz) st.swim=Math.max(st.swim,.85); }   /* 水下：身體趴平、頭朝前游（海豚式擺尾），雙手往後貼著身體 */ const t=st.t, sw2=st.swim;   /* 跟著遊戲裡的掙扎／游動強度 */
      // 眨眼：每 2～5 秒一次，約 0.15 秒
      st.nextBlink-=dt; if(st.nextBlink<=0){ st.blink=.16; st.nextBlink=2+Math.random()*3; } st.blink=Math.max(0,st.blink-dt); const bl=st.blink>0?Math.sin((1-st.blink/.16)*Math.PI):0;
      // 說話：嘴巴在「啊」「喔」之間開合
      st.talk=Math.max(0,st.talk-dt); const tk=st.talk>0?1:0, ah=tk*Math.max(0,Math.sin(t*11)*.5+Math.sin(t*7.3)*.5), oo=tk*Math.max(0,Math.sin(t*5.1+1))*.6;
      st.smile=Math.max(0,st.smile-dt); st.lookT-=dt; if(st.lookT<=0){ st.look=1.6; st.lookT=7+Math.random()*8; } st.look=Math.max(0,st.look-dt); const lk=st.look>0?Math.min(1,Math.min(st.look,1.6-st.look)*3):0;
      const sm=Math.min(1,st.smile*2)*(1-tk);
      W.a.value.set(bl,ah*.9,oo,sm*(1-bl)); W.b.value.set(lk*(1-bl)*(1-tk),0,0,0);
      // 身體：尾巴由上往下的波浪、頭髮慢慢跟著飄、雙手輕輕划水
      const ph=t*(1.6+sw2*2.2), A=.08+sw2*.18;
      ['t1','t2','t3','t4','t5','t6','fin'].forEach((nm,i)=>rot(nm,Math.sin(ph-i*.7)*A*(.35+i*.18),0,0));
      rot('hips',Math.sin(ph+1.2)*A*.25,0,0); rot('spine',Math.sin(ph+1.6)*A*.15,Math.sin(t*.4)*.05,0); rot('chest',Math.sin(ph+2)*A*.1+Math.sin(t*1.7)*.025,0,0);   /* 呼吸 */
      rot('neck',(st.hp||0)*.4,Math.sin(t*.37)*.12*(1-Math.min(1,Math.abs(st.hy||0)))+(st.hy||0)*.45,0); rot('head',Math.sin(t*.53)*.06+(st.hp||0)*.6,Math.sin(t*.29)*.15*(1-Math.min(1,Math.abs(st.hy||0)))+(st.hy||0)*.55,Math.sin(t*.41)*.06);   /* 劇情可指定她轉頭、低頭 */
      ['hr1','hr2','hr3','hr4'].forEach((nm,i)=>rot(nm,.08+Math.sin(ph-1.5-i*.6)*.12*(i+1)*.5,Math.sin(t*.7-i*.5)*.08,0));
      st.wave=Math.max(0,st.wave-dt); const wv=st.wave>0?Math.min(1,Math.min(st.wave,2.4-st.wave)*2.5):0;
      for(const [s,k] of [['L',-1],['R',1]]){ const paddle=Math.sin(ph*.6+(k>0?0:Math.PI))*(.15+sw2*.25), w=k>0?wv:0;
        const relax=(window.__MERARM??-.62)*(1-w), stream=Math.max(0,sw2-.55)/.45;   // 手臂從 A 字放下到身體兩側；游得快時手往後收貼著身體
        rot('up'+s,stream*.5,0,k*(relax-stream*.25+paddle*.35+.04*Math.sin(t*.9+k))+k*w*1.6); rot('fo'+s,0,-k*(.25+paddle*.25+.1*Math.sin(t*.7))*(1-w),k*w*(.6+Math.sin(t*9)*.35)+k*.08*Math.sin(t*.6)); rot('ha'+s,0,k*.15*Math.sin(t*1.1+k),k*(paddle*.3+.15)); }   // 右手揮手時舉起來左右擺
    };
    sk.onBeforeRender=tick;
    return {head:(y,p)=>{ st.hy=y; st.hp=p; },adv:sec=>{ for(let k=0;k<sec/.05;k++){ st.last-=50; tick(); } },mesh:sk,bones:B,talk:s=>{ st.talk=Math.max(st.talk,s||2.5); },smile:s=>{ st.smile=Math.max(st.smile,s||3); },wave:()=>{ st.wave=2.4; },look:()=>{ st.look=1.6; },swim:k=>{ st.swim=k; }}; }
  return {rig};
})();
