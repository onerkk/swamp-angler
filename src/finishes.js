/* Finish identity is shared by equipped tackle and the shop's 3D preview. */
const TACKLE_FINISHES={
 factory:{name:'原廠配色',color:'#245bb4',metalness:.08,roughness:.28,clearcoat:1,coatRoughness:.1,carbon:true,desc:'碳纖編織・透明保護漆'},
 black:{name:'霧黑',color:'#24282d',metalness:.06,roughness:.62,clearcoat:.18,coatRoughness:.45,carbon:true,desc:'霧面碳纖・黑色陽極五金'},
 coral:{name:'珊瑚紅',color:'#c84435',metalness:.12,roughness:.27,clearcoat:1,coatRoughness:.1,carbon:true,desc:'紅色烤漆・透明亮光層'},
 mint:{name:'薄荷綠',color:'#2f9e88',metalness:.12,roughness:.3,clearcoat:1,coatRoughness:.12,carbon:true,desc:'薄荷綠烤漆・透明亮光層'},
 galaxy:{name:'星空紫',color:'#4c267c',metalness:.38,roughness:.25,clearcoat:1,coatRoughness:.08,carbon:false,gold:true,desc:'紫色金屬漆・金色五金'},
 gold:{name:'鍍金',color:'#ddb35c',metalness:1,roughness:.23,clearcoat:.24,coatRoughness:.16,carbon:false,gold:true,desc:'金屬鍍金反射・細緻拉絲'}
};
function tackleFinish(id,color,gold){
 const base=TACKLE_FINISHES[id==='def'?'factory':id]||TACKLE_FINISHES.factory;
 return {...base,color:id==='factory'&&color?color:base.color,gold:base.gold||!!gold};
}
function applyTackleFinish(T,materials,id,color,gold,assets){
 const f=tackleFinish(id,color,gold);
 for(const m of materials){
  const role=m.userData.tackleRole;
  if(role==='blank'){
   m.color.set(f.color).convertSRGBToLinear();m.map=f.carbon?assets.carbon:null;
   m.bumpMap=f.carbon?assets.weave:assets.brushed;m.bumpScale=f.carbon?.000035:.000018;
   m.roughnessMap=null;m.metalness=f.metalness;m.roughness=f.roughness;m.clearcoat=f.clearcoat;m.clearcoatRoughness=f.coatRoughness;m.envMapIntensity=1;
   m.userData.finish=id;
  }else if(role==='trim'){
   m.color.set(f.gold?'#dfb85f':'#c6cdd2').convertSRGBToLinear();m.metalness=1;m.roughness=f.gold?.22:.19;m.envMapIntensity=1;
  }else if(role==='frame'){
   m.color.set(id==='black'?'#25282b':'#30363c').convertSRGBToLinear();m.metalness=.8;m.roughness=.3;
  }
  m.needsUpdate=true;
 }
 return f;
}
function createTacklePreview(W,build){
 const T=THREE;let rt=null;const scene=new T.Scene(),cam=new T.PerspectiveCamera(30,1,.01,10);
 scene.add(new T.HemisphereLight(0xe9eff4,0x34312d,1.1));const key=new T.DirectionalLight(0xfff4df,2);key.position.set(1.5,2,2);scene.add(key);const rim=new T.DirectionalLight(0xc0ddff,1);rim.position.set(-2,1,-1);scene.add(rim);
 return function(canvas,kind,id){
  if(!canvas||!canvas.isConnected)return;const model=build(kind,id);if(!model)return;scene.add(model.root);scene.environment=W.scene.environment;
  const width=Math.max(2,Math.round(canvas.clientWidth*Math.min(2,window.devicePixelRatio||1))),height=Math.max(2,Math.round(canvas.clientHeight*Math.min(2,window.devicePixelRatio||1)));canvas.width=width;canvas.height=height;
  if(!rt||rt.width!==width||rt.height!==height){if(rt)rt.dispose();rt=new T.WebGLRenderTarget(width,height,{depthBuffer:true});rt.texture.encoding=T.sRGBEncoding;}
  cam.aspect=width/height;cam.updateProjectionMatrix();cam.position.copy(model.focus).add(kind==='rod'?new T.Vector3(.28,.2,.52):new T.Vector3(.18,.1,.52));cam.lookAt(model.focus);
  const R=W.renderer,target=R.getRenderTarget(),scissor=R.getScissorTest(),color=R.getClearColor(new T.Color()),alpha=R.getClearAlpha(),exposure=R.toneMappingExposure;
  try{
   R.setScissorTest(false);R.toneMappingExposure=.95;R.setRenderTarget(rt);R.setClearColor(0x111b1c,1);R.clear();R.render(scene,cam);
   const bytes=new Uint8Array(width*height*4);R.readRenderTargetPixels(rt,0,0,width,height,bytes);const ctx=canvas.getContext('2d'),img=ctx.createImageData(width,height),row=width*4;
   for(let y=0;y<height;y++)img.data.set(bytes.subarray((height-1-y)*row,(height-y)*row),y*row);ctx.putImageData(img,0,0);
  }finally{R.setRenderTarget(target);R.setScissorTest(scissor);R.setClearColor(color,alpha);R.toneMappingExposure=exposure;scene.remove(model.root);if(model.dispose)model.dispose();model.root.traverse(m=>{if(m.isMesh)for(const mat of(Array.isArray(m.material)?m.material:[m.material]))mat.dispose();});}
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports={TACKLE_FINISHES,tackleFinish,applyTackleFinish};
