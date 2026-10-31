const fs=require('fs'),T=require('../vendor/three.min.js'),{waterWaveGLSL}=require('../src/water.js'),{createSubmergedRenderer}=require('../src/submerged.js');
global.THREE=T;global.waterWaveGLSL=waterWaveGLSL;global.window={};
const W={renderer:{},scene:new T.Scene(),camera:new T.PerspectiveCamera(),U:{uTime:{value:0},uWind:{value:new T.Vector3(1,0,.2)},uSea:{value:0}},WU:{}};
const layer=createSubmergedRenderer(W),mat=new T.MeshBasicMaterial(),mesh=new T.Mesh(new T.PlaneGeometry(),mat);layer.add(mesh);
const s={uniforms:{},vertexShader:'precision highp float;uniform mat4 modelMatrix;attribute vec3 position;void main(){vec3 transformed=position;\n#include <project_vertex>\n}',fragmentShader:'precision highp float;void main(){gl_FragColor=vec4(.6,.4,.2,1.0);}'};
mat.onBeforeCompile(s,{});s.vertexShader=s.vertexShader.replace('#include <project_vertex>','gl_Position=vec4(transformed,1.0);');
const out={vs:s.vertexShader,fs:'precision highp float;\n'+s.fragmentShader,instVS:'#define USE_INSTANCING\nattribute mat4 instanceMatrix;\n'+s.vertexShader};

const physical=new T.MeshStandardMaterial();layer.add(new T.Mesh(new T.BoxGeometry(),physical));
const ps={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};physical.onBeforeCompile(ps,{});
const expand=x=>x.replace(/#include <(\w+)>/g,(_,n)=>expand(T.ShaderChunk[n]));
let defs='#extension GL_OES_standard_derivatives : enable\nprecision highp float;precision highp int;\n#define USE_UV\n#define USE_MAP\n#define USE_NORMALMAP\n#define TANGENTSPACE_NORMALMAP\n';
for(const n of ['NUM_DIR_LIGHTS','NUM_SPOT_LIGHTS','NUM_RECT_AREA_LIGHTS','NUM_POINT_LIGHTS','NUM_HEMI_LIGHTS','NUM_DIR_LIGHT_SHADOWS','NUM_SPOT_LIGHT_SHADOWS','NUM_POINT_LIGHT_SHADOWS','NUM_CLIPPING_PLANES','UNION_CLIPPING_PLANES'])defs+='#define '+n+' 0\n';
const vp='uniform mat4 modelMatrix,modelViewMatrix,projectionMatrix,viewMatrix;uniform mat3 normalMatrix;uniform vec3 cameraPosition;uniform bool isOrthographic;attribute vec3 position,normal;attribute vec2 uv;\n';
const fp='uniform mat4 viewMatrix;uniform vec3 cameraPosition;uniform bool isOrthographic;\n'+T.ShaderChunk.encodings_pars_fragment+'\nvec4 linearToOutputTexel(vec4 v){return v;}vec4 mapTexelToLinear(vec4 v){return sRGBToLinear(v);}vec4 emissiveMapTexelToLinear(vec4 v){return sRGBToLinear(v);}\n';
out.standardVS=defs+vp+expand(ps.vertexShader);out.standardFS=defs+fp+expand(ps.fragmentShader);
out.skinnedVS=defs+'#define USE_SKINNING\n#define MAX_BONES 16\nattribute vec4 skinIndex,skinWeight;\n'+vp+expand(ps.vertexShader);
out.standardInstVS=defs+'#define USE_INSTANCING\nattribute mat4 instanceMatrix;\n'+vp+expand(ps.vertexShader);
process.stdout.write(JSON.stringify(out));
