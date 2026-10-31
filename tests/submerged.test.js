const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../vendor/three.min.js');
const {waterWaveGLSL}=require('../src/water.js'),{createSubmergedRenderer}=require('../src/submerged.js'),{createSurfaceResidents}=require('../src/surface-life.js'),Physics=require('../src/physics.js');
global.THREE=T;global.waterWaveGLSL=waterWaveGLSL;global.window={__GFX:'high'};
function fixture(){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(62,390/844,.04,2000),parent=new T.Group();scene.add(parent);parent.add(camera);parent.position.set(2,1.4,3);parent.rotation.y=.3;camera.rotation.x=-.34;
 let target=null,color=new T.Color(.1,.2,.3),alpha=.7;const R={toneMapping:T.ACESFilmicToneMapping,outputEncoding:T.sRGBEncoding,shadowMap:{autoUpdate:true},getDrawingBufferSize:v=>v.set(390,844),getRenderTarget:()=>target,setRenderTarget:t=>target=t,getClearColor:c=>c.copy(color),getClearAlpha:()=>alpha,setClearColor:(c,a)=>{color=new T.Color(c);alpha=a;},clear:()=>{},render:()=>{}};
 const W={scene,camera,U:{uTime:{value:2},uWind:{value:new T.Vector3(1,0,.2)},uSea:{value:0}},WU:{},renderer:R};W.submerged=createSubmergedRenderer(W);return{W,R,state:()=>({target,color,alpha})};
}
test('submerged meshes participate in both passes and preserve prior shader animation',()=>{
 const {W}=fixture(),root=new T.Group(),mat=new T.MeshStandardMaterial();let called=0;mat.onBeforeCompile=()=>called++;const mesh=new T.Mesh(new T.BoxGeometry(),mat);root.add(mesh);W.scene.add(root);W.submerged.add(root);W.submerged.add(root);
 assert(((mesh.layers.mask&(1<<0))!==0)&&((mesh.layers.mask&(1<<1))!==0));assert(mat.transparent);assert.equal(mat.depthWrite,false);
 const s={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mat.onBeforeCompile(s,{});assert.equal(called,1);assert.match(s.vertexShader,/subVertex=instanceMatrix\*subVertex/);assert.match(s.fragmentShader,/if\(subDepth>0.0\)discard/);assert.equal(s.uniforms.uSubPass,W.submerged.pass);
});
test('underwater render matches the main camera and restores renderer state, including after failure',()=>{
 for(const fail of [false,true]){
  const {W,R,state}=fixture(),mat=new T.MeshStandardMaterial(),mesh=new T.Mesh(new T.BoxGeometry(),mat);W.scene.add(mesh);W.submerged.add(mesh);
  const bg=new T.Color(.4,.5,.6);W.scene.background=bg;
  R.render=(s,c)=>{assert.equal(W.submerged.pass.value,1);assert(((c.layers.mask&(1<<1))!==0)&&!((c.layers.mask&(1<<0))!==0));assert.deepEqual(c.matrixWorld.elements,W.camera.matrixWorld.elements);assert.equal(R.outputEncoding,T.LinearEncoding);if(fail)throw new Error('GPU failure');};
  if(fail)assert.throws(()=>W.submerged.render(),/GPU failure/);else W.submerged.render();
  assert.equal(W.submerged.pass.value,0);assert.equal(R.toneMapping,T.ACESFilmicToneMapping);assert.equal(R.outputEncoding,T.sRGBEncoding);assert.equal(R.shadowMap.autoUpdate,true);assert.equal(W.scene.background,bg);assert.equal(state().target,null);assert.equal(state().alpha,.7);
 }
});
test('normal idle fishing has visible resident fish below the moving water, even before casting',()=>{
 const {W}=fixture();W.swell=()=>.06;W.fishingPhysics=new Physics();W.fishingPhysics.refresh();
 const ids=['bluegill','crappie','reba','perch','lmbass','smbass','amber','mahi','grouper2'];const P={SPECIES:ids.map(id=>({id}))},MDL={fishReady:()=>true,fish:()=>({group:new T.Mesh(new T.BoxGeometry(1,.2,.15),new T.MeshStandardMaterial()),uni:{uSwim:{value:0},uAmp:{value:0}}})};
 const life=createSurfaceResidents(W,P,MDL),G={state:'idle',loc:'lake',base:new T.Vector3(),head:0,t:0};
 for(let i=0;i<90;i++){G.t=i/30;life.update(1/30,G);}
 assert(life.group.visible);assert.equal(life.group.children.length,6);
 for(const fish of life.group.children){assert(fish.position.y<-.2);assert(fish.position.z< -4);assert(((fish.layers.mask&(1<<1))!==0));assert(fish.position.toArray().every(Number.isFinite));}
 G.state='home';life.update(.1,G);assert.equal(life.group.visible,false);
 G.state='idle';G.loc='sea';life.update(.1,G);assert.equal(life.group.children.length,6);assert(life.group.children.every(f=>f.position.z< -10));
});
test('actual crocodile model dimensions are aligned to the waterline rather than standing above it',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),buffer=fs.readFileSync(require.resolve('../models/gator.glb')),json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)));
 const bounds=json.accessors.find(a=>a.type==='VEC3'&&a.min&&a.max),size=bounds.max.map((v,i)=>v-bounds.min[i]);
 const model=new T.Group();model.add(new T.Mesh(new T.BoxGeometry(...size),new T.MeshStandardMaterial()));
 const host=new T.Group(),ctx={THREE:T,T,RHEAD:{gator:'+x'},ang:a=>({'+x':0,'-z':Math.PI/2,'-x':Math.PI,'+z':-Math.PI/2})[a],onReady:(key,cb)=>cb({scene:model,animations:[]}),mixers:[],Math};vm.createContext(ctx);
 const src=fs.readFileSync(require.resolve('../src/m.js'),'utf8');vm.runInContext(src.slice(src.indexOf('function measure('),src.indexOf('/* 遊艇：')),ctx);
 ctx.attach(host,'gator',{len:3.3,target:'+z',top:.06,anim:false});ctx.gator=host;ctx.patchGator=()=>{};ctx.W={swell:()=>.12,U:{uTime:{value:2}}};ctx.GU={uGT:{value:0},uGA:{value:.5}};ctx.gYaw=0;ctx.gYawInit=false;
 const f=fs.readFileSync(require.resolve('../src/f.js'),'utf8'),start=f.indexOf('function placeGator('),end=f.indexOf('\nfunction ',start+1);vm.runInContext(f.slice(start,end),ctx);ctx.placeGator({x:2,z:-6},.4);host.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(host);assert(Math.abs(box.max.y-(.12+.035))<1e-5);assert(box.min.y<-.3);assert.equal(ctx.mixers.length,0);
});
