const{test}=require('node:test'),assert=require('node:assert/strict'),T=require('../vendor/three.min.js'),{createSceneRadiance}=require('../src/radiance.js');
test('all quality levels draw a single beauty pass without SSR allocations or scene mutation',()=>{
 for(let level=0;level<8;level++){
  global.window={__gfxStatus:{level},__effectBudget:{environment:level>=2}};
  const scene=new T.Scene(),env=new T.Texture();scene.environment=env;let draws=0,prepared=0;
  const R={render(s){draws++;assert.equal(s,scene);assert.equal(s.environment,level>=2?env:null);}};
  const guarded=new Proxy(T,{get(t,k){if(k==='SSRPass'||k==='WebGLRenderTarget')throw Error('expensive pass accessed');return t[k];}});
  const fx=createSceneRadiance(guarded,R,()=>prepared++);
  for(let i=0;i<20;i++)fx.render(scene,new T.PerspectiveCamera());
  assert.equal(draws,20);assert.equal(prepared,20);assert.equal(scene.environment,env);assert.equal(fx.status.active,false);fx.release();fx.dispose();
 }
});
test('beauty pass restores environment even when the renderer throws',()=>{
 global.window={__effectBudget:{environment:false}};const scene=new T.Scene(),env=new T.Texture();scene.environment=env;
 const fx=createSceneRadiance(T,{render(){throw Error('GPU failure');}});assert.throws(()=>fx.render(scene,new T.PerspectiveCamera()),/GPU failure/);assert.equal(scene.environment,env);
});
