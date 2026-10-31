const fs=require('fs'),vm=require('vm'),T=require('../vendor/three.min.js');
function iceFixture(){
 const api={...T,TextureLoader:class{load(file){const t=new T.Texture();t.userData={file};return t;}}};
 const gradient={addColorStop:()=>{}},canvas=()=>({width:8,height:128,getContext:()=>({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,fillRect:()=>{}})});
 const scene=new T.Scene(),base=new T.Vector3(),state={loc:'ice',head:0},W={scene,camera:new T.PerspectiveCamera(),info:{light:1},U:{uRain:{value:0},uCloud:{value:0}},addRipple:()=>{}};
 const context={THREE:api,document:{createElement:canvas},performance:{now:()=>0}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../src/t.js'),'utf8')+'\nthis.create=createIce;',context);
 const ice=context.create(W,{loc:()=>state.loc,base:()=>base,head:()=>state.head});ice.update(.016);
 const group=scene.children[0],sheet=group.children[0],hole=group.children[1],rim=hole.children.find(m=>m.geometry?.type==='RingGeometry');
 const shader=mat=>{const sh={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mat.onBeforeCompile(sh);return sh;};
 return{T,ice,scene,base,state,sheet,hole,rim,shader};
}
module.exports={iceFixture};
