const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../vendor/three.min.js');
const {tackleFinish,applyTackleFinish}=require('../src/finishes.js'),{marinePart,dressYacht}=require('../src/marine.js');
test('paid gold uses a metallic finish without the dark carbon albedo map',()=>{
 const blank=new T.MeshPhysicalMaterial(),trim=new T.MeshStandardMaterial(),frame=new T.MeshStandardMaterial();blank.userData.tackleRole='blank';trim.userData.tackleRole='trim';frame.userData.tackleRole='frame';const assets={carbon:new T.Texture(),weave:new T.Texture(),brushed:new T.Texture()};
 applyTackleFinish(T,[blank,trim,frame],'gold',null,true,assets);assert.equal(blank.metalness,1);assert.equal(blank.map,null);assert.equal(blank.bumpMap,assets.brushed);assert(blank.color.r>blank.color.g&&blank.color.g>blank.color.b);assert(trim.color.r>trim.color.b);assert(blank.roughness>.1&&blank.roughness<.35);
 applyTackleFinish(T,[blank,trim,frame],'black',null,false,assets);assert.equal(blank.map,assets.carbon);assert(blank.roughness>.5);assert(blank.metalness<.2);assert.equal(blank.bumpMap,assets.weave);
});
test('all saved finish IDs retain a distinct material identity and factory color is respected',()=>{
 for(const id of ['def','black','coral','mint','galaxy','gold'])assert(tackleFinish(id).name);
 assert.equal(tackleFinish('factory','#ff0000',true).color,'#ff0000');assert.equal(tackleFinish('factory','#ff0000',true).gold,true);
 assert(tackleFinish('gold').metalness>tackleFinish('galaxy').metalness);assert(tackleFinish('black').roughness>tackleFinish('coral').roughness);
});
test('deck and hull materials use named source parts and deck UVs remain in physical metres',()=>{
 const wrap=new T.Group(),object=new T.Group();wrap.position.set(10,3,-2);wrap.rotation.y=.8;wrap.add(object);object.scale.setScalar(2);
 const wood=new T.MeshStandardMaterial();wood.name='material_3';const mesh=new T.Mesh(new T.PlaneGeometry(1,4).rotateX(-Math.PI/2),wood);object.add(mesh);
 const original=new T.MeshStandardMaterial();original.name='unknown';const trim=new T.Mesh(new T.BoxGeometry(),original);object.add(trim);const teak=new T.MeshStandardMaterial();dressYacht(T,object,{teak});
 assert.equal(mesh.material,teak);assert.equal(trim.material,original);assert(mesh.castShadow&&mesh.receiveShadow);const uv=mesh.geometry.attributes.uv,u=[],v=[];for(let i=0;i<uv.count;i++){u.push(uv.getX(i));v.push(uv.getY(i));}assert(Math.abs(Math.max(...u)-Math.min(...u)-2)<1e-6);assert(Math.abs(Math.max(...v)-Math.min(...v)-8)<1e-6);
 assert.equal(marinePart('material_5'),'navy');assert.equal(marinePart('material_42'),'steel');assert.equal(marinePart('unknown'),'original');
});
test('shop previews do not spend coins or replace the player’s equipped paid finish',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),calls=[];const S={coins:20000,lv:60,skin:{rod:'gold',bob:'gold'},skinOwn:{rod:['def','gold'],bob:['classic','gold']}};
 const context={window:{addEventListener:()=>{}},document:{getElementById:id=>({id})},setInterval:()=>{},setTimeout:()=>{},TACKLE_FINISHES:require('../src/finishes.js').TACKLE_FINISHES};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../src/l.js'),'utf8'),context);
 const eco=context.createEco({save:S,P:{previewFinish:(canvas,kind,id)=>calls.push([kind,id])},persist:()=>{throw Error('preview persisted a save');},applyRod:()=>{throw Error('preview changed equipped tackle');}});
 eco.click('skinp','rod:black');assert.equal(S.coins,20000);assert.equal(S.skin.rod,'gold');assert.equal(S.skin.bob,'gold');assert.equal(S.skinOwn.rod.length,2);
 const html=eco.render('skin',{});assert(html.includes('rodFinishPreview'));assert(html.includes('霧黑釣竿與捲線器細節'));eco.preview();assert.deepEqual(calls,[['rod','black'],['bob','gold']]);
});
