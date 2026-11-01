const fs=require('fs'),T=require('../vendor/three.min.js');global.THREE=T;require('../vendor/SSRShader.js');
const expand=s=>s.replace(/#include <(\w+)>/g,(_,n)=>expand(T.ShaderChunk[n]));const defs='precision highp float;precision highp int;\n#define MAX_STEP 64\n#define PERSPECTIVE_CAMERA\n#define DISTANCE_ATTENUATION\n#define FRESNEL\n#define SELECTIVE\n';
const out={vs:defs+'attribute vec3 position;attribute vec2 uv;uniform mat4 modelViewMatrix,projectionMatrix;\n'+T.SSRShader.vertexShader,fs:defs+expand(T.SSRShader.fragmentShader)};
const nd='#extension GL_OES_standard_derivatives : enable\nprecision highp float;precision highp int;\n#define USE_NORMALMAP\n#define USE_UV\n#define TANGENTSPACE_NORMALMAP\n#define NUM_CLIPPING_PLANES 0\n#define UNION_CLIPPING_PLANES 0\n';
const vp='uniform mat4 modelMatrix,modelViewMatrix,projectionMatrix,viewMatrix;uniform mat3 normalMatrix;uniform vec3 cameraPosition;uniform bool isOrthographic;attribute vec3 position,normal;attribute vec2 uv;\n';
out.normalVS=nd+vp+expand(T.ShaderLib.normal.vertexShader);out.normalFS=nd+'uniform mat4 viewMatrix;uniform bool isOrthographic;\n'+expand(T.ShaderLib.normal.fragmentShader);
out.skinNormalVS=nd+'#define USE_SKINNING\n#define MAX_BONES 16\nattribute vec4 skinIndex,skinWeight;\n'+vp+expand(T.ShaderLib.normal.vertexShader);
out.instNormalVS=nd+'#define USE_INSTANCING\nattribute mat4 instanceMatrix;\n'+vp+expand(T.ShaderLib.normal.vertexShader);
console.log(JSON.stringify(out));
