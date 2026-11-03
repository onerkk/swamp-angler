/* ===== 第 1 段 · 渲染核心：天空、樹林遠景、水面、光照、時間 ===== */
const SH = {};
SH.common = `
#define EYE_Y 2.4
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uLightCol;
uniform vec3 uSunDisk;
uniform vec3 uSunCol;
uniform vec3 uMoonDir;
uniform vec3 uMoonCol;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uFogCol;
uniform float uFogDen;
uniform float uMist;
uniform float uDay;
uniform float uCloud;
uniform vec3 uEye;
uniform float uRain;
uniform float uDetail;
uniform vec3 uWind;
uniform vec2 uCloudOff;
uniform float uCShadow;
uniform sampler2D uBandA;
uniform sampler2D uBandB;
uniform sampler2D uHzA;
uniform sampler2D uHzB;
uniform sampler2D uFullA;
uniform sampler2D uFullB;
uniform sampler2D uMask;
uniform sampler2D uOvcA;
uniform sampler2D uOvcB;
uniform float uOvcK;
uniform float uPMix;
uniform float uPhoto;
uniform float uYaw;
uniform float uExpo;
uniform float uNight;
uniform float uNightDeep;
uniform float uMoonK;
uniform float uBio;
uniform sampler2D uRefl;
uniform mat4 uReflMat;
uniform float uReflOn;
uniform float uSea;
uniform vec3 uSeaCol;
uniform float uReef;
uniform float uLightK;
float hash11(float p){ p = fract(p*0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
float hash31(vec3 p3){ p3 = fract(p3*0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y)*p3.z); }
float noise1(float x){ float i = floor(x); float f = fract(x); return mix(hash11(i), hash11(i + 1.0), f*f*(3.0 - 2.0*f)); }
float noise2(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm3(vec2 p){ float v = 0.0; float a = 0.5; for(int i = 0; i < 3; i++){ v += a*noise2(p); p = p*2.03 + vec2(11.7, 5.3); a *= 0.5; } return v/0.875; }
float fbm5(vec2 p){ float v = 0.0; float a = 0.5; for(int i = 0; i < 5; i++){ v += a*noise2(p); p = p*2.03 + vec2(11.7, 5.3); a *= 0.5; } return v/0.96875; }
float shoreR(float az){ float d = (az - 0.12)/0.30; return 54.0 + 9.0*sin(az*2.3 + 1.1) + 6.0*sin(az*5.1 + 0.3) + 3.0*sin(az*11.7 + 2.0) + 45.0*exp(-d*d); }
float cloudSh(vec2 xz){ return uCShadow*smoothstep(0.45, 0.75, noise2(xz*0.011 + uCloudOff*1.6)); }
float fogF(float d){ return 1.0 - exp(-d*uFogDen); }
vec3 fogColor(vec3 rd){ float sd = max(dot(rd, uSunDir), 0.0); return uFogCol + uGlow*(pow(sd, 6.0)*0.5 + pow(sd, 48.0)*0.7)*uDay; }

vec3 skyBase(vec3 rd, bool disks, bool lite){
  float e = rd.y;
  float eu = max(e, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.03, 0.85, eu), 0.6));
  float sd = max(dot(rd, uSunDir), 0.0);
  col += uGlow*(pow(sd, 5.0)*0.5 + pow(sd, 1.6)*0.10)*(1.0 - 0.6*eu);
  if(uDay < 0.45 && e > 0.0){
    vec3 sp = rd*360.0; vec3 cell = floor(sp); float h = hash31(cell);
    if(h > 0.9972){ vec3 f = fract(sp) - 0.5; col += vec3(0.75, 0.82, 1.0)*exp(-dot(f, f)*36.0)*(h - 0.9972)*520.0*(0.45 - uDay)*smoothstep(0.02, 0.25, e); }
  }
  if(disks){
    float d1 = dot(rd, uSunDisk);
    col += uSunCol*(smoothstep(0.99988, 0.99995, d1)*28.0 + pow(max(d1, 0.0), 1200.0)*1.2);
    float d2 = dot(rd, uMoonDir);
    col += uMoonCol*smoothstep(0.99982, 0.99988, d2)*7.0;
  }
  if(e > 0.0){
    vec2 cuv = rd.xz/(e + 0.10)*0.6 + uCloudOff;
    float n = lite ? fbm3(cuv) : fbm5(cuv);
    float cov = smoothstep(0.66 - uCloud*0.38, 0.95 - uCloud*0.30, n);
    float n2 = fbm3(cuv + uSunDir.xz*0.08);
    float lit = clamp(0.55 + (n - n2)*2.8, 0.0, 1.0);
    vec3 cDark = mix(uZenith, uHorizon, 0.65)*0.6;
    vec3 cLit = mix(uHorizon*1.05, uLightCol*0.32, 0.4) + uGlow*pow(sd, 3.0)*0.7;
    col = mix(col, mix(cDark, cLit, lit), cov*smoothstep(0.0, 0.16, e)*0.94);
  }
  return col;
}

vec4 nearLayer(float s, float y, float dist, vec3 rd, bool lite){
  if(y > 30.0) return vec4(0.0);
  vec3 amb = mix(uHorizon, uZenith, 0.45)*0.4 + uFogCol*0.15;
  vec3 sunc = uLightCol*0.24*(1.0 - 0.75*uCShadow*smoothstep(0.45, 0.75, noise1(s*0.02 + uCloudOff.x*40.0)));
  vec3 col; float a;
  if(y < 0.25){
    col = vec3(0.022, 0.024, 0.014)*(amb*2.4 + sunc*0.3);
    a = 1.0;
  } else {
    float n = lite ? noise2(vec2(s*0.55, y*0.55)) : fbm3(vec2(s*0.55, y*0.55));
    float n2 = noise2(vec2(s*2.3, y*2.3));
    float lc = lite ? n2 : noise2(vec2(s*5.5 + sin(uTime*1.7 + s)*uWind.z*0.2, y*5.5));
    float sideS = sign(rd.x*uSunDir.z - rd.z*uSunDir.x + 1e-4);
    float cw = 4.6; float ci = floor(s/cw);
    float crown = 0.0; float shade = 0.5; float trunk = 0.0; float hue = 0.5; float cbot = 30.0;
    for(int k = -1; k <= 1; k++){
      float c = ci + float(k);
      float h1 = hash11(c*1.37 + 0.5); float h2 = hash11(c*7.13); float h3 = hash11(c*3.31); float h4 = hash11(c*9.7 + 2.0);
      float cx = (c + 0.15 + 0.7*h2)*cw;
      float H = 8.0 + 10.0*h1;
      float rw = 2.2 + 2.0*h3;
      float rh = H*0.4;
      float cy = H - rh;
      vec2 d = vec2((s - cx)/rw, (y - cy)/rh);
      float r = length(d) + (n - 0.5)*0.7 + (n2 - 0.5)*0.18 + (lc - 0.5)*0.22;
      float m = 1.0 - smoothstep(0.82, 1.0, r);
      if(m > crown){ crown = m; shade = clamp(0.5 + 0.35*d.y + 0.3*d.x*sideS + (n - 0.5)*0.9, 0.0, 1.0); hue = h4; cbot = cy - rh*0.7; }
      float tw = 0.16 + 0.22*h4; float fl = 1.0 + 1.5*exp(-y*0.9);
      float dx = abs(s - cx - (h4 - 0.5)*0.25*y);
      trunk = max(trunk, (1.0 - smoothstep(tw*fl - 0.04, tw*fl + 0.04, dx))*step(y, cy));
    }
    float uTop = 2.2 + 3.2*noise1(s*0.13 + 7.7) + 1.3*noise1(s*0.7);
    float bush = clamp((uTop - y)*0.9 + (n - 0.5)*2.4 + (n2 - 0.5)*0.6, 0.0, 1.0);
    float ms = noise1(s*2.6 + 3.0);
    float moss = smoothstep(0.58, 0.66, ms)*smoothstep(cbot - 3.5*ms, cbot + 1.0, y)*step(y, cbot + 3.0)*(1.0 - crown);
    vec3 g1 = mix(vec3(0.020, 0.050, 0.016), vec3(0.042, 0.062, 0.018), hue);
    vec3 cc = g1*(amb*2.2 + sunc*(0.25 + 1.3*shade))*(0.45 + 0.75*n2)*(0.5 + 0.8*smoothstep(0.2, 0.8, lc));
    vec2 sh2 = uSunDir.xz + vec2(1e-5);
    float sdh = max(dot(normalize(rd.xz + vec2(1e-5)), normalize(sh2)), 0.0);
    cc += uGlow*pow(sdh, 8.0)*crown*(1.0 - crown)*1.4*uDay;
    vec3 tc = vec3(0.045, 0.04, 0.034)*(amb*2.0 + sunc*0.5)*(0.6 + 0.7*n2);
    vec3 bc = vec3(0.018, 0.04, 0.014)*(amb*2.3 + sunc*0.55*(0.3 + n))*(0.6 + 0.8*n2);
    vec3 mc = vec3(0.07, 0.08, 0.062)*(amb*2.3 + sunc*0.6)*(0.7 + 0.5*n2);
    col = tc; a = trunk;
    col = mix(col, mc, moss*0.8); a = max(a, moss*0.8);
    col = mix(col, cc, crown); a = max(a, crown);
    col = mix(col, bc, bush); a = max(a, bush);
  }
  float f = fogF(dist);
  float mist = uMist*exp(-max(y, 0.0)*0.25)*smoothstep(8.0, 70.0, dist);
  col = mix(col, fogColor(rd), clamp(f + mist*0.45, 0.0, 0.97));
  return vec4(col, a);
}

vec4 farLayer(float s, float y, float dist, vec3 rd){
  float top = 9.0 + 6.0*noise1(s*0.03 + 2.0) + 3.5*noise1(s*0.14) + 1.6*noise1(s*0.55) + 0.7*noise1(s*2.1);
  float a = clamp((top - y)*1.2, 0.0, 1.0);
  vec3 amb = mix(uHorizon, uZenith, 0.5)*0.5;
  vec3 col = vec3(0.024, 0.045, 0.022)*(amb*2.0 + uLightCol*0.08);
  col = mix(col, fogColor(rd), clamp(fogF(dist)*1.1 + uMist*0.3, 0.0, 0.985));
  return vec4(col, a);
}

vec3 envRayProc(vec3 P, vec3 dir, bool disks, bool lite){
  vec3 col = skyBase(dir, disks, lite);
  float hl = length(dir.xz);
  if(hl < 1e-4) return col;
  vec2 rh = dir.xz/hl;
  float tanE = dir.y/hl;
  float b = dot(P.xz, rh);
  float c = dot(P.xz, P.xz);
  float R = shoreR(atan(rh.x, -rh.y));
  float t = -b + sqrt(max(b*b - c + R*R, 0.0));
  vec2 H = P.xz + rh*t;
  float az = atan(H.x, -H.y);
  R = shoreR(az);
  t = -b + sqrt(max(b*b - c + R*R, 0.0));
  H = P.xz + rh*t; az = atan(H.x, -H.y);
  float y = P.y + tanE*t;
  if(tanE > 0.0 && y > 28.0) return col;
  float R2 = R + 160.0;
  float t2 = -b + sqrt(max(b*b - c + R2*R2, 0.0));
  vec2 H2 = P.xz + rh*t2;
  float y2 = P.y + tanE*t2;
  vec4 fl = farLayer(atan(H2.x, -H2.y)*R2, y2, length(vec3(H2.x - uEye.x, y2 - uEye.y, H2.y - uEye.z)), dir);
  col = mix(col, fl.rgb, fl.a);
  vec4 nl = nearLayer(az*R, y, length(vec3(H.x - uEye.x, y - uEye.y, H.y - uEye.z)), dir, lite);
  col = mix(col, nl.rgb, nl.a);
  return col;
}
vec3 photoS(sampler2D band, sampler2D full, vec3 d){
  float u = fract(atan(d.x, -d.z)*0.15915494 + uYaw);
  float e = asin(clamp(d.y, -1.0, 1.0));
  float vb = (e + 0.2094395)/1.0471976;
  vec3 c = (vb > 0.003 && vb < 0.997) ? texture2D(band, vec2(u, vb)).rgb : texture2D(full, vec2(u, e*0.31830989 + 0.5)).rgb;
  return pow(c, vec3(2.2));
}
vec3 photoPost(vec3 c, vec3 d);
vec3 photoEnv(vec3 dir){
  vec3 d = normalize(dir);
  return photoPost(mix(photoS(uBandA, uFullA, d), photoS(uBandB, uFullB, d), uPMix), d);
}
// 遠處水面的霧色：取實拍全景地平線上方一段、左右大範圍模糊過的平均色（h.js 載入照片時算好的一條 256 格色帶）。
// 以前直接取照片地平線那一格：照片裡遠山、樹叢的剪影在某個方位突然結束，水面的霧色就跟著在那個方位一刀變色，畫面上出現一條直的接縫
vec3 photoHaze(vec3 dir){
  vec3 d = normalize(dir);
  float u = fract(atan(d.x, -d.z)*0.15915494 + uYaw);
  vec3 c = mix(texture2D(uHzA, vec2(u, 0.5)).rgb, texture2D(uHzB, vec2(u, 0.5)).rgb, uPMix);
  return photoPost(pow(c, vec3(2.2)), d);
}
vec3 photoPost(vec3 c, vec3 d){
  float g = dot(c, vec3(0.3, 0.59, 0.11));
  // 陰天／下雨：天空部分換成實拍的陰天雲層照片（Poly Haven，CC0）；遠山、岸邊等地景保留原照片
  if(uOvcK > 0.01 && d.y > -0.02){
    float ou = fract(atan(d.x, -d.z)*0.15915494 + 0.37), ov = asin(clamp(d.y, -1.0, 1.0))*0.31830989 + 0.5;
    vec3 oc = mix(pow(texture2D(uOvcA, vec2(ou, ov)).rgb, vec3(2.2)), pow(texture2D(uOvcB, vec2(ou, ov)).rgb, vec3(2.2)), clamp(uRain*1.4, 0.0, 1.0));
    float skyK = smoothstep(-0.01, 0.06, d.y)*smoothstep(0.10, 0.26, g);
    float om = dot(oc, vec3(0.3, 0.59, 0.11)); oc = max(vec3(0.0), vec3(om) + (oc - vec3(om))*1.5); oc = mix(vec3(om), oc, 1.0)*mix(1.0, 1.35, smoothstep(0.0, 0.3, d.y));   // 加強雲層明暗層次
    { vec3 tint = c/max(g, 1e-3); tint = clamp(tint, vec3(0.6), vec3(1.6)); oc *= mix(vec3(1.0), tint, 0.4); }   // 帶上當下時段的色調（黃昏陰天偏橘、夜裡偏藍）
    c = mix(c, oc, skyK*uOvcK); g = mix(g, om, skyK*uOvcK);
  }
  float keepSky = 1.0 - 0.8*uOvcK*step(0.0, d.y);   // 天空已是實拍陰天照片，不再整片灰化壓暗
  c = mix(c, vec3(g)*vec3(0.94, 0.97, 1.02), clamp(uCloud - 0.3, 0.0, 1.0)*0.75*keepSky);
  c *= 1.0 - (0.35*clamp(uCloud - 0.4, 0.0, 1.0) + 0.25*uRain)*mix(1.0, 0.45, 1.0 - keepSky);
  c *= mix(1.0, uNightDeep, uNight);
  vec3 navy = mix(vec3(0.006, 0.009, 0.02), vec3(0.0012, 0.002, 0.0065), smoothstep(0.1, 0.9, d.y));
  c = mix(c, navy, uNight*0.9*smoothstep(0.02, 0.35, d.y));
  if(d.y > 0.0){
    vec2 cuv = d.xz/(d.y + 0.10)*0.6 + uCloudOff;
    float n = fbm5(cuv);
    float cov = smoothstep(0.66 - uCloud*0.38, 0.95 - uCloud*0.3, n)*clamp((uCloud - 0.35)*1.8, 0.0, 1.0)*(1.0 - 0.85*uOvcK);   // 已換成實拍雲層時，程式雲幾乎不疊
    float n2 = fbm3(cuv + uSunDir.xz*0.08);
    float lit = clamp(0.55 + (n - n2)*2.8, 0.0, 1.0);
    c = mix(c, mix(vec3(g*0.55), vec3(g*1.15), lit), cov*smoothstep(0.0, 0.16, d.y)*0.92);
  }
  float hz = exp(-abs(d.y)*10.0);
  c = mix(c, vec3(g)*0.9 + uFogCol*0.15, clamp(hz*(uMist*0.35 + max(uFogDen - 0.006, 0.0)*35.0), 0.0, 0.8)*(1.0 - 0.6*uOvcK*step(0.0, d.y)));   // 有實拍雲層時，地平線霧氣不再把雲層蓋掉
  return c;
}
vec3 envRay(vec3 P, vec3 dir, bool disks, bool lite){
  if(uPhoto > 0.5) return photoEnv(dir);
  return envRayProc(P, dir, disks, lite);
}
`;
SH.skyVS = `
varying vec3 vDir;
void main(){ vec4 wp = modelMatrix*vec4(position, 1.0); vDir = wp.xyz - cameraPosition; gl_Position = projectionMatrix*viewMatrix*wp; }
`;
SH.skyFS = `
varying vec3 vDir;
void main(){
  vec3 rd = normalize(vDir);
  vec3 col = envRay(cameraPosition, rd, true, false);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}
`;
SH.waterVS = `
varying vec3 vW;
void main(){ vec4 wp = modelMatrix*vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }
`;
SH.seaVS = `
uniform float uTime;
uniform vec3 uWind;
uniform float uSea;
varying vec3 vW;
varying vec3 vNs;
varying float vH;
${waterWaveGLSL()}
void main(){
  vec4 wp=modelMatrix*vec4(position,1.0);
  vec3 surfaceValue=waterSample(wp.xz,uTime,uWind,uSea);
  float edge=1.0-smoothstep(118.0,149.0,length(position.xz));
  wp.y+=surfaceValue.y*edge;
  vW=wp.xyz;vNs=normalize(vec3(-surfaceValue.x,1.0,-surfaceValue.z));vH=surfaceValue.y;
  gl_Position=projectionMatrix*viewMatrix*wp;
}
`;
SH.waterFS = `
#ifdef SEAGRID
varying vec3 vNs;
varying float vH;
#endif
uniform vec4 uRip[12]; uniform vec4 uBoat;
uniform vec3 uDeep;
uniform sampler2D uLakeBed;
uniform sampler2D uSubmerged;
uniform vec2 uSubmergedSize;
uniform float uSubmergedOn;
uniform vec3 uScatter;
uniform float uWave;
uniform float uSunVis; uniform float uWaterLOD;
varying vec3 vW;
vec3 TM(vec3 x){ if(uPhoto < 0.5) return x; x *= uExpo; return clamp((x*(2.51*x + 0.03))/(x*(2.43*x + 0.59) + 0.14), 0.0, 1.0); }
float causF(vec2 p, float t){
  vec2 q = p*1.7 + 0.8*vec2(noise2(p*0.35 + t*0.12), noise2(p*0.35 - t*0.1 + 5.3));
  float a = abs(sin(q.x*2.3 + t*0.8) + sin(q.y*2.1 - t*0.7) + sin((q.x - q.y)*1.6 + t*0.6));
  return pow(clamp(1.0 - a*0.5, 0.0, 1.0), 5.0);
}
vec2 wv(vec2 p, vec2 d, float len, float amp, float dist){
  float k = 6.2831853/len; float w = sqrt(9.81*k);
  float irregular=noise2(p*.73+vec2(uTime*.09,-uTime*.07))*2.1+noise2(p*1.91-vec2(uTime*.12,uTime*.05))*.8;
  float ph=dot(d,p)*k-w*uTime+irregular;
  float fade = 1.0 - smoothstep(len*22.0*(1.0 + 3.0*uSea), len*80.0*(1.0 + 4.0*uSea), dist);
  return d*(amp*k*cos(ph)*fade);
}
${waterWaveGLSL()}
vec3 noised(vec2 x){
  vec2 i = floor(x); vec2 f = fract(x); vec2 u = f*f*(3.0 - 2.0*f); vec2 du = 6.0*f*(1.0 - f);
  float a = hash21(i); float b = hash21(i + vec2(1.0, 0.0)); float c = hash21(i + vec2(0.0, 1.0)); float d = hash21(i + vec2(1.0, 1.0));
  return vec3(a + (b - a)*u.x + (c - a)*u.y + (a - b - c + d)*u.x*u.y, du*(vec2(b - a, c - a) + (a - b - c + d)*u.yx));
}
void main(){
  vec3 Vv = cameraPosition - vW; float dist = length(Vv); vec3 V = Vv/dist;
  #ifndef SEAGRID
  if(length(vW.xz - cameraPosition.xz) < 139.0) discard;
  #endif
  if(uPhoto > 0.5){ vec3 dv = normalize(vW - uEye); float ev = asin(clamp(dv.y, -1.0, 1.0));
    if(ev > -0.2094){ float uu = fract(atan(dv.x, -dv.z)*0.15915494 + uYaw); if(texture2D(uMask, vec2(uu, clamp((ev + 0.2094)/0.2094, 0.0, 1.0))).r < 0.5) discard; } }
  vec2 p = vW.xz;
  // 獨木舟船艙比水面低：船艙橢圓範圍內的水面跳過，船底就不會透出帶漣漪的水（uBoat 依序是船位置、船頭方向、是否在船上）
  if(uBoat.w > 0.5){ vec2 d = p - uBoat.xy; float c = cos(uBoat.z), s = sin(uBoat.z); vec2 l = vec2(d.x*c - d.y*s, d.x*s + d.y*c + 0.35);
    if((l.x*l.x)/0.1024 + (l.y*l.y)/3.61 < 1.0) discard; }
  float rp = length(p); float Rs = shoreR(atan(p.x, -p.y));
  float nearShore = 1.0 - smoothstep(2.0, 20.0, Rs - rp);
  float nearDock = 1.0 - smoothstep(2.5, 7.0, length(vec2(p.x*0.8, p.y - 0.5)));
  float lane = exp(-p.x*p.x/70.0)*smoothstep(4.0, 12.0, -p.y)*(1.0 - smoothstep(40.0, 80.0, -p.y));
  // 不再畫程式產生的浮萍：真實路線下它看起來像一片假綠毯，也省下每個像素好幾次雜訊計算
  float dw=0.0;
  vec2 wd = normalize(uWind.xy + vec2(1e-4));
  float gust = smoothstep(0.35, 0.75, noise2(p*0.035 - uCloudOff*9.0)*0.7 + noise2(p*0.11 - uCloudOff*20.0)*0.3);
  float csh = uDetail>.5?1.0-0.85*cloudSh(p):1.0;
  float ruff = mix(0.15, 1.0, smoothstep(0.35, 0.7, noise2(p*0.03 + vec2(uTime*0.015, -uTime*0.01))))*(0.35 + 0.65*uWind.z) + gust*uWind.z*1.4;
  float amp = uWave*ruff*(1.0 - 0.85*dw);
  vec3 waveSample=waterSample(p,uTime,uWind,uSea);
  vec2 g=waveSample.xz;
  if(uDetail>.5){
  // Wind ripples change the surface normal between geometry vertices.
  g+=wv(p,wd,.42,.0008+.0018*uWind.z,dist);
  g+=wv(p,vec2(wd.y,-wd.x),.23,.0004+.0009*uWind.z,dist);
  vec2 gd = vec2(0.0); float na = 0.014; float nf = 1.4;
  vec2 drift = vec2(uTime*0.11, uTime*0.07);
  for(int i = 0; i < 4; i++){
    // 細波紋層數依材質等級：高 4 層、中 3 層、低 2 層（最細的層在手機解析度下本來就看不太出來）
    if(float(i) > 3.5 - uWaterLOD) break;
    float fade = 1.0 - smoothstep(50.0*(1.0 + 2.0*uSea)/nf, 180.0*(1.0 + 2.0*uSea)/nf, dist);
    gd += noised(p*nf + drift).yz*nf*na*fade;
    nf *= 2.2; na *= 0.5; drift = vec2(-drift.y, drift.x)*1.3;
  }
  g += gd*amp;
  for(int i = 0; i < 12; i++){
    vec4 r = uRip[i];
    if(r.w > 0.001){
      vec2 dv = p - r.xy; float d = length(dv) + 0.001;
      float x = d - r.z*0.85;
      float env = exp(-x*x*4.0)*r.w*exp(-r.z*0.7)/(1.0 + r.z*1.6);
      g += (dv/d)*sin(x*15.0)*env*(1.0 - 0.6*dw);
    }
  }
  if(uRain > 0.01){
    // 雨打在水面：湖上是一圈圈擴散的漣漪；海上有風有浪，雨點只留下密密麻麻的小凹點，漣漪還沒擴散就被浪打散
    float rf = uRain*(1.0 - smoothstep(mix(8.0, 4.0, uSea), mix(30.0, 16.0, uSea), dist))*(1.0 - 0.8*dw)*(1.0 - 0.45*uSea);
    for(int k = 0; k < 2; k++){
      float sc = (k == 0 ? 2.2 : 3.4)*mix(1.0, 5.5, uSea);
      vec2 q = p*sc + float(k)*7.31;
      vec2 ci = floor(q); vec2 cf = fract(q) - 0.5;
      float h = hash21(ci + float(k)*13.1);
      float ph = fract(uTime*(0.8 + h*0.7) + h*7.0);
      vec2 o = vec2(hash21(ci + 3.1), hash21(ci + 7.7)) - 0.5;
      vec2 dv = cf - o*0.4; float d = length(dv) + 1e-4;
      float x = d - ph*mix(0.42, 0.22, uSea);
      g += (dv/d)*sin(x*55.0)*exp(-x*x*700.0)*(1.0 - ph)*rf*1.4;
    }
    // 海上下雨：整片海面被雨點打出細密的凹凸（像磨砂），遠處也看得到——海面失去鏡面光澤、變得霧霧的
    if(uSea > 0.5){ float pf = uRain*(1.0 - smoothstep(25.0, 140.0, dist))*0.9;
      vec2 pq = p*9.0 + vec2(uTime*0.7, -uTime*0.5);
      float e = 0.07, n0 = noise2(pq), nx = noise2(pq + vec2(e, 0.0)), nz = noise2(pq + vec2(0.0, e));
      vec2 pq2 = p*23.0 - vec2(uTime*1.3, uTime*0.9);
      float m0 = noise2(pq2), mx = noise2(pq2 + vec2(e, 0.0)), mz = noise2(pq2 + vec2(0.0, e));
      g += (vec2(nx - n0, nz - n0)*0.55 + vec2(mx - m0, mz - m0)*0.45)/e*0.06*pf; }
  }
  }
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float NdV = max(dot(N, V), 0.0);
  float F = (0.02 + 0.98*pow(1.0 - NdV, 5.0))*(1.0 - 0.3*uRain*uSea);   // 雨中的海面粗糙，鏡面反光變弱，浪坡不會反出一條條亮線
  vec3 R = reflect(-V, N); R.y = max(R.y, .015); R = normalize(R);
  vec3 refl = envRay(vW, R, false, true);
  refl = mix(refl, vec3(dot(refl, vec3(0.3, 0.59, 0.11))), 0.35*uRain*uSea);   // 雨打花的海面把天空反得糊而灰
  if(uReflOn > 0.5){
    vec4 rp = uReflMat*vec4(vW.x, 0.0, vW.z, 1.0);
    float reflectionReach=mix(.22,.65,uSea)*clamp(dist*.12,1.0,4.0);
    vec4 displaced=uReflMat*vec4(vW.x+N.x*reflectionReach,0.0,vW.z+N.z*reflectionReach,1.0);
    vec2 ruv=displaced.xy/max(displaced.w,.001);
    float inReflection=step(0.0,ruv.x)*step(ruv.x,1.0)*step(0.0,ruv.y)*step(ruv.y,1.0)*step(.001,rp.w);
    vec4 rc = texture2D(uRefl, clamp(ruv, 0.002, 0.998)); rc.rgb = pow(max(rc.rgb, vec3(0.0)), vec3(2.2));
    refl = mix(refl, TM(rc.rgb)*0.92, clamp(rc.a, 0.0, 1.0)*inReflection*(1.0 - 0.35*uRain));
  }
  float sd = max(dot(R, uSunDir), 0.0);
  vec3 glint = uLightCol*(pow(sd, 1600.0)*28.0 + pow(sd, 160.0)*0.5)*uSunVis*csh;
  vec3 amb = mix(uHorizon, uZenith, 0.5);
  float ndl = max(uSunDir.y, 0.0);
  vec3 body = uDeep*(amb*0.7 + uLightCol*ndl*uSunVis*0.22*csh)
            + uScatter*(amb*0.25 + uLightCol*0.12*uSunVis)*(0.5 + 0.5*clamp(dot(N, normalize(uSunDir + vec3(0.0, 0.5, 0.0))), 0.0, 1.0));
  #ifdef SEAGRID
  body += uScatter*(amb*0.5 + uLightCol*0.3*uSunVis)*smoothstep(-0.2, 0.8, vH)*0.9;
  #endif
  vec3 bodyD = TM(body);
  if(uSea < .5&&uDetail>.5){
    vec3 underRay=refract(-V,N,.75);
    float bankDepth=mix(1.15,3.8,smoothstep(2.0,22.0,Rs-rp));
    bankDepth=min(bankDepth,1.25+smoothstep(2.0,32.0,-p.y)*2.6);
    float waterDepth=bankDepth+.22*noise2(p*.23);
    float travel=waterDepth/max(.22,-underRay.y);
    vec2 bedPoint=p+underRay.xz*travel;
    // 湖底卵石：同一張 512 小圖若只用一種尺寸重複鋪，遠看會排成規則的黑點格子。改成兩種尺寸、轉一個角度的取樣，依雜訊混合打散重複感，越遠越接近平均色
    vec2 bedQ=bedPoint*.68, bedR=mat2(.8,-.6,.6,.8)*bedPoint*.27+vec2(.37,.11);
    vec3 gravel=mix(texture2D(uLakeBed,bedQ).rgb,texture2D(uLakeBed,bedR).rgb,smoothstep(.32,.68,noise2(bedPoint*.19)));
    gravel=mix(gravel,vec3(.40,.38,.31),smoothstep(3.0,12.0,dist)*.65);
    gravel=pow(max(gravel,vec3(.001)),vec3(2.2));
    float silt=noise2(bedPoint*.37)*.62+noise2(bedPoint*1.9)*.38;
    gravel=mix(gravel,vec3(.085,.105,.046),smoothstep(.46,.7,silt)*.55);
    float caustic=0.0;if(uDetail>.5)caustic=causF(bedPoint,uTime)*.28+causF(bedPoint*1.73+4.1,uTime*.79)*.12;
    vec3 transmittance=exp(-vec3(.58,.27,.38)*travel);
    vec3 bedLight=gravel*(.38+uLightK*.65+caustic*uSunVis*csh)*(1.0-.65*uRain);
    vec3 transmitted=TM(bedLight*transmittance+body*(1.0-transmittance));
    float clearWater=(1.0-smoothstep(6.0,30.0,dist))*(1.0-.55*uRain)*(1.0-dw);
    bodyD=mix(bodyD,transmitted,clearWater*.92);
  }
  if(uSea > 0.5){
    float lk = 0.22 + 0.78*uLightK;
    vec3 deepC = uSeaCol*lk*(0.72 + 0.56*clamp(dot(N, normalize(vec3(uSunDir.x, 0.6, uSunDir.z))), 0.0, 1.0));
    deepC *= 1.0 - 0.38*uRain - 0.15*(1.0 - uSunVis);
    deepC = mix(deepC, vec3(dot(deepC, vec3(0.3, 0.55, 0.15)))*vec3(0.9, 1.0, 1.02), clamp(0.55*uRain + 0.3*(1.0 - uSunVis), 0.0, 0.7));   // 去掉晴天的飽和藍，偏鉛灰   // 下雨、陰天的海是暗沉的鉛灰藍，不是晴天的亮藍
    bodyD = deepC;
    if(uReef > 0.01&&uDetail>.5){
      vec3 Vr = refract(-V, N, 0.75);
      float iy = 1.0/max(-Vr.y, 0.12);
      vec2 b0 = vW.xz + Vr.xz*4.0*iy;
      float rf_ = noise2(b0*0.08)*0.6 + noise2(b0*0.23 + 3.1)*0.4;
      float reefK = smoothstep(0.50, 0.60, rf_), grass = smoothstep(0.40, 0.48, rf_)*(1.0 - reefK);
      // 熱帶淺海：沙洲淺（約 2 公尺）、溝槽深（約 8 公尺），淺處透出碧綠、深處轉成藍，水面因此一塊亮一塊深
      float depthN = noise2(b0*0.035 + 7.3)*0.7 + noise2(b0*0.11 + 1.7)*0.3;
      float Dd = mix(1.8, 8.0, smoothstep(0.30, 0.75, depthN)) - 1.2*reefK, Lp = Dd*iy;
      vec2 bp = vW.xz + Vr.xz*Lp;
      float cs = 0.0;if(uDetail>.5)cs = (causF(bp, uTime) + 0.6*causF(bp*1.7 + 9.0, uTime*1.2))*mix(0.15, 1.0, uSunVis)*(1.0 - 0.7*uRain)*1.45;   // 陰天下雨沒有陽光，海底不會有亮晶晶的光紋；晴天淺沙上的光紋特別亮
      // 白沙上有被水流推出的細沙紋
      float sr = sin(dot(bp, vec2(0.8, 0.6))*9.0 + noise2(bp*1.3)*4.0)*0.5 + 0.5;
      vec3 sand = vec3(0.93, 0.89, 0.76)*(0.86 + 0.14*sr)*(0.9 + 0.2*noise2(bp*2.7));
      vec3 rk = mix(vec3(0.10, 0.13, 0.11), vec3(0.04, 0.06, 0.06), noise2(bp*0.9));
      vec3 bed = mix(mix(sand, vec3(0.45, 0.50, 0.35), grass*0.6), rk, reefK);
      bed *= lk*(0.62 + 1.05*cs*uLightK*(0.35 + 0.65*uSunVis)*(1.0 - 0.6*reefK)*(1.0 - smoothstep(8.0, 50.0, dist)));
      vec3 Tr = exp(-vec3(0.36, 0.065, 0.045)*(Lp + Dd));
      vec3 inS = mix(vec3(0.06, 0.52, 0.56), vec3(0.02, 0.24, 0.40), smoothstep(2.5, 8.0, Dd))*lk;
      vec3 shal = bed*Tr + inS*(1.0 - Tr);
      shal = mix(shal, vec3(dot(shal, vec3(0.3, 0.55, 0.15)))*vec3(0.85, 1.0, 1.0), 0.45*(1.0 - uSunVis) + 0.3*uRain);
      shal *= 1.0 - 0.45*uRain;   // 下雨：雲厚光弱、水面被雨打花，淺海明顯暗下來   // 陰天：淺水的藍綠色變得灰而柔和
      bodyD = mix(deepC, shal, uReef*(1.0 - smoothstep(20.0, 160.0, dist)));
    }
    #ifdef SEAGRID
    bodyD += vec3(0.04, 0.24, 0.26)*smoothstep(-0.1, 0.9, vH)*uLightK*(0.4 + 0.6*clamp(dot(N, normalize(vec3(uSunDir.x, 0.25, uSunDir.z))), 0.0, 1.0));
    // 浪頭白沫：風越大、浪越高越多；碎成一塊一塊、隨時間消散
    { float wcN = noise2(vW.xz*0.35 + vec2(uTime*0.05, uTime*0.03))*0.6 + noise2(vW.xz*1.3 - uTime*0.08)*0.4;
      float wc = smoothstep(.26,.64,vH+wcN*.12)*clamp((uWind.z-.28)*1.35,0.0,1.0)*(1.0 - smoothstep(60.0, 260.0, dist));
      wc *= smoothstep(0.45, 0.8, noise2(vW.xz*0.06 + vec2(uTime*0.02, 0.0)))*smoothstep(0.3, 0.7, noise2(vW.xz*1.7 + vec2(uTime*.15,-uTime*.11)));   // 白沫零星成塊，不會沿著浪的等高線連成一條條白線
      bodyD = mix(bodyD, vec3(0.82, 0.86, 0.88)*(0.35 + 0.65*uLightK), wc*0.6); }
    #endif
    refl *= vec3(0.74, 0.88, 1.0); F *= 0.82;
    bodyD *= mix(1.0, 0.1, uNight);
  }
  if(uSubmergedOn>.5){
    vec2 subUV=gl_FragCoord.xy/uSubmergedSize+N.xz*.002;
    vec4 subColor=texture2D(uSubmerged,clamp(subUV,vec2(.001),vec2(.999))); subColor.rgb=pow(max(subColor.rgb,vec3(0.0)),vec3(2.2));
    if(subColor.a>.001)bodyD=mix(bodyD,TM(subColor.rgb/max(subColor.a,.001)),subColor.a*(1.0-dw));
  }
  float surfaceRough=clamp(.12+.3*uWind.z+.2*uRain,.12,.65);
  F*=1.0-surfaceRough*.42;
  float slopeLight=clamp(.8+.32*dot(N,normalize(vec3(uSunDir.x,.7,uSunDir.z))),.52,1.15);
  vec3 col=mix(bodyD*slopeLight,refl,F)+TM(glint*(.25+.75*F));
  float crestLight=smoothstep(.04,.2,length(waveSample.xz))*(.02+.045*uWind.z);
  col+=TM(mix(uHorizon,vec3(.32,.48,.5),.6)*crestLight)*(1.0-F*.7);
  if(uMoonK > 0.01){ float md = max(dot(R, uMoonDir), 0.0);
    col += vec3(0.78, 0.84, 1.0)*(pow(md, 700.0)*3.5 + pow(md, 40.0)*0.05)*uMoonK*(0.3 + 0.7*F); }
  if(uBio > 0.01){ float bn = noise2(p*4.2 + vec2(uTime*0.23, -uTime*0.19))*noise2(p*1.1 - uTime*0.05);
    float bs = smoothstep(0.55, 0.8, bn)*(0.5 + 0.5*sin(uTime*3.1 + p.x*5.7 + p.y*3.3));
    col += vec3(0.05, 0.42, 0.8)*bs*uBio*(1.0 - smoothstep(4.0, 50.0, dist))*0.7; }
  float foamS = (1.0 - smoothstep(0.3, 2.5, Rs - rp))*(0.5 + 0.5*noise2(p*1.3 + uTime*0.05))*(1.0 - uSea);
  float cap = smoothstep(0.16, 0.3, length(g))*clamp((uWind.z - 0.45)*2.2, 0.0, 1.0)*(0.5 + 0.5*noise2(p*2.0 - uCloudOff*30.0));
  #ifdef SEAGRID
  cap += smoothstep(0.55, 0.95, vH)*clamp(uWind.z*1.5 - 0.2, 0.0, 1.0)*(0.4 + 0.6*noise2(p*1.7 - uCloudOff*25.0));
  #endif
  float foam = clamp(foamS*0.55 + cap*0.8, 0.0, 0.9)*(1.0 - dw);
  col = mix(col, TM((amb*0.9 + uLightCol*ndl*0.5*csh)*0.55), foam);
  float mist = uMist*0.4*smoothstep(12.0, 90.0, dist);
  vec3 fogC = uPhoto > 0.5 ? photoHaze(vec3(-V.x, 0.015, -V.z)) : fogColor(-V);
  col = mix(col, fogC, clamp((fogF(dist)*0.9 + mist)*(1.0 - 0.6*uSea), 0.0, 0.95));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}
`;
SH.ptsVS = `
attribute float aLife;
attribute float aSize;
uniform float uScale;
varying float vA;
void main(){ vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_PointSize = max(1.0, aSize*uScale/max(-mv.z, 0.05)); gl_Position = projectionMatrix*mv; vA = aLife; }
`;
SH.ptsFS = `
uniform vec3 uCol;
varying float vA;
void main(){
  if(vA <= 0.0) discard;
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  float a = (1.0 - smoothstep(0.15, 0.5, d))*sqrt(vA)*0.85;
  if(a < 0.01) discard;
  gl_FragColor = vec4(uCol, a);
}
`;

function createWorld(opts){
'use strict';
const T = THREE, EYE_Y = 2.4, DEG = Math.PI/180;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
let seaMode=false;
function shoreR(az){ return seaMode?1400:shoreR0(az); }
function shoreR0(az){ const d=(az-0.12)/0.30; return 54+9*Math.sin(az*2.3+1.1)+6*Math.sin(az*5.1+0.3)+3*Math.sin(az*11.7+2.0)+45*Math.exp(-d*d); }

const renderer = new T.WebGLRenderer({canvas:opts.canvas, antialias:!window.__resourcePolicy?.mobile, powerPreference:'high-performance'});
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;

const scene = new T.Scene();
const camera = new T.PerspectiveCamera(70, 1, 0.04, 2500);
const player = new T.Group(); player.position.set(0, EYE_Y, 0); scene.add(player);
const head = new T.Group(); head.rotation.x = -0.16; player.add(head); head.add(camera);

const V = () => new T.Vector3();
const U = { uTime:{value:0}, uSunDir:{value:new T.Vector3(0,1,0)}, uLightCol:{value:V()}, uSunDisk:{value:new T.Vector3(0,1,0)},
  uSunCol:{value:V()}, uMoonDir:{value:new T.Vector3(0,1,0)}, uMoonCol:{value:V()}, uZenith:{value:V()}, uHorizon:{value:V()},
  uGlow:{value:V()}, uFogCol:{value:V()}, uFogDen:{value:0.01}, uMist:{value:0.5}, uDay:{value:1}, uCloud:{value:0.45}, uOvcA:{value:null}, uOvcB:{value:null}, uOvcK:{value:0}, uSunVis:{value:1}, uEye:{value:new T.Vector3(0,2.4,0)}, uRain:{value:0},uDetail:{value:1},uWaterLOD:{value:0},uBoat:{value:new T.Vector4(0,0,0,0)}, uWind:{value:new T.Vector3(1,0,.15)}, uCloudOff:{value:new T.Vector2()}, uCShadow:{value:0}, uBandA:{value:null}, uBandB:{value:null}, uHzA:{value:null}, uHzB:{value:null}, uFullA:{value:null}, uFullB:{value:null}, uMask:{value:null}, uPMix:{value:0}, uPhoto:{value:0}, uYaw:{value:.25}, uExpo:{value:1}, uSea:{value:0}, uSeaCol:{value:new T.Vector3(.012,.075,.13)}, uReef:{value:0}, uNight:{value:0}, uNightDeep:{value:.1}, uMoonK:{value:0}, uBio:{value:0}, uLightK:{value:1} };

// 天空球（含樹林遠景）
const skyMat = new T.ShaderMaterial({uniforms:U, vertexShader:SH.skyVS, fragmentShader:SH.common+SH.skyFS, side:T.BackSide, depthWrite:false, depthTest:false});
const sky = new T.Mesh(new T.SphereGeometry(900, 48, 24), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false; sky.position.set(0, EYE_Y, 0); scene.add(sky);

// 水面：形狀貼合岸線的圓盤
const rip = []; for(let i=0;i<12;i++) rip.push(new T.Vector4(0,0,0,0));
const bedTex=new T.TextureLoader().load('models/home/clean_pebbles_Diffuse.jpg');
bedTex.wrapS=bedTex.wrapT=T.RepeatWrapping; bedTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const WU = Object.assign({}, U, {uLakeBed:{value:bedTex}, uRip:{value:rip}, uDeep:{value:new T.Vector3(0.010,0.019,0.011)}, uScatter:{value:new T.Vector3(0.018,0.045,0.026)}, uWave:{value:1.0} });
const waterMat = new T.ShaderMaterial({uniforms:WU, vertexShader:SH.waterVS, fragmentShader:SH.common+SH.waterFS, extensions:{derivatives:true}, depthWrite:false});
const SEG = 256, wpos = [0,0,0], widx = [];
for(let i=0;i<=SEG;i++){ const az=-Math.PI+2*Math.PI*i/SEG, R=1500; wpos.push(Math.sin(az)*R, 0, -Math.cos(az)*R); }
for(let i=1;i<=SEG;i++) widx.push(0, i+1, i);
const wgeo = new T.BufferGeometry(); wgeo.setAttribute('position', new T.Float32BufferAttribute(wpos,3)); wgeo.setIndex(widx);
const water = new T.Mesh(wgeo, waterMat); water.frustumCulled = false; scene.add(water);
const seaMat = new T.ShaderMaterial({uniforms:WU, vertexShader:SH.seaVS, fragmentShader:SH.common+SH.waterFS, defines:{SEAGRID:1}, extensions:{derivatives:true}, depthWrite:false});
const seaGrid = new T.Mesh(makeWaterGrid(T), seaMat); seaGrid.visible=true; seaGrid.frustumCulled=false; scene.add(seaGrid);

// 光源
const sunLight = new T.DirectionalLight(0xffffff, 0.9); scene.add(sunLight); scene.add(sunLight.target);
renderer.shadowMap.type=T.PCFSoftShadowMap;sunLight.castShadow=true;sunLight.shadow.bias=-.00018;sunLight.shadow.normalBias=.012;sunLight.shadow.radius=2;
Object.assign(sunLight.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.2,far:130});sunLight.shadow.camera.updateProjectionMatrix();
// 陰影一律開著：關掉再打開會讓全場材質重新編譯而卡一下；低畫質改用小張陰影圖、較低更新頻率
function setShadows(q){renderer.shadowMap.enabled=true;const n=q==='ultra'?Math.min(window.__resourcePolicy?.mobile?2048:4096,renderer.capabilities.maxTextureSize):q==='high'?2048:q==='auto'?1024:q==='mid'?1024:512;if(sunLight.shadow.mapSize.x!==n){sunLight.shadow.mapSize.set(n,n);if(sunLight.shadow.map){sunLight.shadow.map.dispose();sunLight.shadow.map=null;}}}
const hemi = new T.HemisphereLight(0xffffff, 0x223322, 0.55); scene.add(hemi);

const materialQuality=createMaterialQuality();let materialScanTimes=new WeakMap();
// 換畫質等級只調數量與頻率；材質種類由固定的 tier 決定，所以這裡不會讓著色器重新編譯，也不再釋放再重建反射與陰影（以前低畫質來回切換會一直重建而卡頓）
function setEffects(level,tier){U.uWaterLOD.value=tier==='high'?0:tier==='mid'?1:2;const prev=materialQuality.tier;materialQuality.set(level,tier);materialQuality.tier=tier;U.uDetail.value=1;if(prev!==tier){materialQuality.apply(scene);if(window.__HOME_SCENE)materialQuality.apply(window.__HOME_SCENE);materialScanTimes=new WeakMap();}}
function prepareScene(root){const now=performance.now();if(now<(materialScanTimes.get(root)||0))return;materialScanTimes.set(root,now+1000);materialQuality.apply(root);}
function qualityTextures(root){materialQuality.apply(root);const max=Math.min(renderer.capabilities.getMaxAnisotropy(),window.__resourcePolicy?.anisotropy||16);root.traverse(m=>{if(!m.isMesh)return;for(const mat of(Array.isArray(m.material)?m.material:[m.material]))if(mat)for(const key of['map','normalMap','roughnessMap','metalnessMap','bumpMap','emissiveMap'])tuneTextureSampling(T,mat[key],max,!!(mat.userData&&mat.userData.packedAtlas));});}
let waterDetail='mid';function setWaterDetail(q){if(q===waterDetail)return;let [rings,segments]=waterDetailSettings(q);if(rings*segments>65535&&!renderer.capabilities.isWebGL2&&!renderer.extensions.get('OES_element_index_uint'))[rings,segments]=waterDetailSettings('high');const old=seaGrid.geometry;seaGrid.geometry=makeWaterGrid(T,150,rings,segments);old.dispose();waterDetail=q;}

// 環境光照貼圖（由同一套天空/樹林產生）
const envScene = new T.Scene();Object.assign(U,{uRadianceA:{value:null},uRadianceB:{value:null},uRadianceReady:{value:0}});
envScene.add(new T.Mesh(new T.SphereGeometry(40,32,16), new T.ShaderMaterial({uniforms:U, vertexShader:SH.skyVS, fragmentShader:photoProbeFragment(SH), side:T.BackSide, depthWrite:false, depthTest:false})));
let envRT = null, envHour = -99;
const envJobs=createProgressiveEnvironment(T,renderer,envScene,rt=>{const old=envRT;envRT=rt;scene.environment=rt.texture;if(old)old.dispose();});
function regenEnv(){envJobs.request();}

const lin = hex => { const c = new T.Color(hex).convertSRGBToLinear(); return new T.Vector3(c.r,c.g,c.b); };
const KEYS = [
 {h:0,    zen:'#03060d',hor:'#0e1622',glow:'#18243a',sun:'#ffb070',si:0,  fog:'#0b121a',fd:0.0072, mist:0.33,day:0,  exp:1.3, cl:.35},
 {h:4.8,  zen:'#060b17',hor:'#1a2230',glow:'#2a3248',sun:'#ff9a60',si:0,  fog:'#151d27',fd:0.0072, mist:0.42, day:.03,exp:1.3, cl:.35},
 {h:6.0,  zen:'#2c4064',hor:'#c89a86',glow:'#ffa868',sun:'#ffaa70',si:1.4,fog:'#6e6a5e',fd:0.0084, mist:0.60,day:.45,exp:1.05,cl:.4},
 {h:7.6,  zen:'#45699a',hor:'#b2bcac',glow:'#ffd6a0',sun:'#ffdcb4',si:2.6,fog:'#7d8a76',fd:0.0066, mist:0.48, day:.85,exp:.95, cl:.45},
 {h:11.5, zen:'#3a69a6',hor:'#b4c4c8',glow:'#fff2dc',sun:'#fff3e4',si:3.1,fog:'#86968a',fd:0.0042, mist:0.18, day:1,  exp:.9,  cl:.5},
 {h:15.5, zen:'#3f6aa2',hor:'#bcc6c0',glow:'#ffe8c8',sun:'#ffeedc',si:3.0,fog:'#8a9482',fd:0.0045,mist:0.18, day:1,  exp:.9,  cl:.5},
 {h:17.6, zen:'#3a5788',hor:'#e6bc8c',glow:'#ffb060',sun:'#ffc48a',si:2.6,fog:'#9a8a6e',fd:0.0057,mist:0.27,day:.9, exp:.95, cl:.45},
 {h:18.5, zen:'#2a3c68',hor:'#e8925a',glow:'#ff7830',sun:'#ff9450',si:1.6,fog:'#8e6c54',fd:0.0066, mist:0.36, day:.55,exp:1.05,cl:.45},
 {h:19.3, zen:'#121a34',hor:'#5a4250',glow:'#7a3a32',sun:'#ff7040',si:.3, fog:'#2e2836',fd:0.0072, mist:0.36, day:.18,exp:1.2, cl:.4},
 {h:20.6, zen:'#04080f',hor:'#111a26',glow:'#1c283e',sun:'#ff7040',si:0,  fog:'#0d141c',fd:0.0072, mist:0.33,day:.02,exp:1.3, cl:.35},
 {h:24,   zen:'#03060d',hor:'#0e1622',glow:'#18243a',sun:'#ffb070',si:0,  fog:'#0b121a',fd:0.0072, mist:0.33,day:0,  exp:1.3, cl:.35},
].map(k=>({h:k.h, zen:lin(k.zen), hor:lin(k.hor), glow:lin(k.glow), sun:lin(k.sun), si:k.si, fog:lin(k.fog), fd:k.fd, mist:k.mist, day:k.day, exp:k.exp, cl:k.cl}));
const MOON = lin('#a9bde6');
const dirFrom = (el, az) => new T.Vector3(Math.sin(az)*Math.cos(el), Math.sin(el), -Math.cos(az)*Math.cos(el));
const moonDir = dirFrom(32*DEG, -0.45);
const tv = V();
const info = {day:1, light:1};

const wx={cloud:0,rain:0,fog:0}; let wxDirty=false, wxLast=0;
function setWeather(c,r,fo){ wx.cloud=c; wx.rain=r; wx.fog=fo; const s=c+r*.6+fo*.6; if(Math.abs(s-wxLast)>.12){ wxDirty=true; wxLast=s; } }
function setTime(hour, force){
  const h = ((hour%24)+24)%24;
  let i = 0; while(i < KEYS.length-2 && KEYS[i+1].h <= h) i++;
  const a = KEYS[i], b = KEYS[i+1], f = sstep(0, 1, (h-a.h)/(b.h-a.h));
  U.uZenith.value.copy(a.zen).lerp(b.zen, f);
  U.uHorizon.value.copy(a.hor).lerp(b.hor, f);
  U.uGlow.value.copy(a.glow).lerp(b.glow, f);
  U.uFogCol.value.copy(a.fog).lerp(b.fog, f);
  U.uFogDen.value = lerp(a.fd, b.fd, f);
  U.uMist.value = lerp(a.mist, b.mist, f);
  U.uDay.value = lerp(a.day, b.day, f);
  U.uCloud.value = lerp(a.cl, b.cl, f);
  { const cK=wx.cloud, rK=wx.rain, fK=wx.fog; U.uCloud.value=Math.max(U.uCloud.value,cK*.98); U.uRain.value=rK;
    for(const v of [U.uZenith.value,U.uHorizon.value,U.uFogCol.value]){ const g=(v.x+v.y+v.z)/3; v.lerp(tv.set(g,g,g*1.03),cK*.75).multiplyScalar(1-.36*cK-.25*rK); }
    U.uGlow.value.multiplyScalar(1-.8*cK); U.uFogDen.value*=1+fK*4+rK*1.6; U.uMist.value=Math.min(1.4,U.uMist.value+fK*.9+rK*.45); U.uCShadow.value=cK*(1-cK)*3.2*Math.min(1,U.uDay.value*2); }
  const si = lerp(a.si, b.si, f);
  const sunCol = tv.copy(a.sun).lerp(b.sun, f).clone();
  const el = 62*DEG*Math.sin(Math.PI*(h-6)/12.4);
  const az = -1.2 + 1.4*clamp((h-6)/12.4, -0.3, 1.3);
  const sd = dirFrom(el, az);
  U.uSunDisk.value.copy(sd);
  const sinEl = Math.sin(el);
  const eTop = Math.atan((12.5-EYE_Y)/shoreR(az));
  const vis = sstep(eTop-0.025, eTop+0.03, el);
  const wS = si*sstep(-0.03, 0.04, sinEl);
  const direct = wS*(0.12+0.88*vis)*(1-0.85*wx.cloud);
  const night = 1 - sstep(-0.14, 0.0, sinEl);
  const wM = 0.42*night;
  U.uSunCol.value.copy(sunCol).multiplyScalar(wS*(1-wx.cloud*.95));
  U.uLightCol.value.copy(sunCol).multiplyScalar(direct).addScaledVector(MOON, wM);
  const ld = sd.clone().multiplyScalar(direct+1e-4).addScaledVector(moonDir, wM).normalize();
  U.uSunDir.value.copy(ld);
  U.uMoonDir.value.copy(moonDir);
  U.uMoonCol.value.copy(MOON).multiplyScalar(night*0.9);
  U.uSunVis.value = (direct*vis + wM)/(direct + wM + 1e-4);
  renderer.toneMappingExposure = lerp(a.exp, b.exp, f)*(1+.1*wx.cloud);
  const lc = U.uLightCol.value;
  sunLight.color.setRGB(lc.x, lc.y, lc.z); sunLight.intensity = 0.85;hemi.intensity=.55;
  sunLight.position.copy(ld).multiplyScalar(60);
  const z = U.uZenith.value, hz = U.uHorizon.value;
  hemi.color.setRGB((z.x+hz.x)*0.6, (z.y+hz.y)*0.6, (z.z+hz.z)*0.6);
  hemi.groundColor.setRGB(0.012, 0.022, 0.014);
  info.day = U.uDay.value; info.light = Math.min(1.2, 0.08 + (lc.x+lc.y+lc.z)/3*0.35 + (hz.x+hz.y+hz.z)/3*0.5);
  if(photoHook){ const o=photoHook(h,wx); if(o){
    U.uSunDir.value.copy(o.dir); U.uSunDisk.value.copy(o.dir); U.uLightCol.value.set(o.lc[0],o.lc[1],o.lc[2]); U.uSunVis.value=1-wx.cloud*.85;
    renderer.toneMappingExposure=o.exp; U.uExpo.value=o.exp; sunLight.color.setRGB(o.lc[0],o.lc[1],o.lc[2]); sunLight.intensity=.7*(1-wx.cloud*.5);
    sunLight.position.copy(o.dir).multiplyScalar(60);hemi.color.setRGB(.18+.35*U.uDay.value,.23+.35*U.uDay.value,.32+.35*U.uDay.value);hemi.groundColor.setRGB(.035,.045,.055);hemi.intensity=.45*(1-wx.cloud*.3);info.light=o.light; } }
  let dh = Math.abs(h - envHour); if(dh > 12) dh = 24 - dh;
  if(force || envHour<0 || dh > 0.35 || wxDirty){ wxDirty = false; envHour = h; regenEnv(); }
  return info;
}

const ripS = []; for(let i=0;i<12;i++) ripS.push({x:0,z:0,age:9,amp:0}); let ripI = 0;
function addRipple(x, z, amp){ const r = ripS[ripI]; ripI = (ripI+1)%12; r.x=x; r.z=z; r.age=0; r.amp=amp; }
function seaH(x,z,t){ return sampleWater(x,z,t,U.uWind.value,true).height; }
function swell(x,z,t){return sampleWaterHeight(x,z,t,U.uWind.value,seaMode);}

// 環境光探針依畫質放慢更新頻率（不關閉），把每秒的工作量壓低
let envAcc=0;function envTick(dt){envAcc+=dt;const hz=window.__effectBudget?.probeHz||15;if(envAcc<1/hz)return;envAcc=0;envJobs.update(dt);}
function updateEnvironment(dt,t){U.uTime.value=t;U.uLightK.value=Math.min(1,Math.max(0,info.light));envTick(window.__frameSeconds||dt);const w=U.uWind.value,k=(.002+.01*w.z)*dt;U.uCloudOff.value.x+=w.x*k;U.uCloudOff.value.y+=w.y*k;}
function update(dt, t){
  {const target=new T.Vector3();camera.getWorldPosition(target);target.y=0;sunLight.target.position.copy(target);sunLight.position.copy(target).addScaledVector(U.uSunDir.value,60);sunLight.target.updateMatrixWorld();}
  envTick(window.__frameSeconds||dt);optics.update();U.uTime.value = t; camera.getWorldPosition(U.uEye.value); U.uLightK.value = Math.min(1, Math.max(0, info.light));
  if(seaGrid.visible) seaGrid.position.set(U.uEye.value.x,0,U.uEye.value.z);
  { const w=U.uWind.value, k=(.002+.01*w.z)*dt; U.uCloudOff.value.x+=w.x*k; U.uCloudOff.value.y+=w.y*k; }
  for(let i=0;i<12;i++){ const r = ripS[i]; r.age += dt; rip[i].set(r.x, r.z, r.age, r.age < 5 ? r.amp : 0); }
}

let pr = window.__resourcePolicy?.mobile?1:Math.min(window.devicePixelRatio || 1, 2), lw = 0, lh = 0;renderer.setPixelRatio(pr);
function resize(w, h){if(w===lw&&h===lh)return;lw = w; lh = h; camera.aspect = w/h; camera.fov = w < h ? FISHING_VIEW.fovPortrait : FISHING_VIEW.fovLandscape; camera.updateProjectionMatrix(); renderer.setSize(w, h); }
function setPR(v){if(Math.abs(v-pr)<.001)return; pr = v; renderer.setPixelRatio(pr); }
/* 水面倒影：鏡像相機只拍物體（不含天空、水面），水面依波紋扭曲取樣 */
const reflRT=new T.WebGLRenderTarget(4,4,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat,depthBuffer:true,encoding:T.sRGBEncoding});
const reflCam=new T.PerspectiveCamera(), reflTM=new T.Matrix4();
WU.uRefl={value:reflRT.texture}; WU.uReflMat={value:reflTM}; WU.uReflOn={value:0};
const _rp=new T.Vector3(), _cp=new T.Vector3(), _rm=new T.Matrix4(), _la=new T.Vector3(), _tg=new T.Vector3(), _n=new T.Vector3(0,1,0), _vw=new T.Vector3();
const _pl=new T.Plane(), _cpl=new T.Vector4(), _q=new T.Vector4(), _sz=new T.Vector2(); let reflScale=.35, reflEnabled=true, reflHide=[];
function setRefl(on,scale){ reflEnabled=on; if(scale) reflScale=scale; WU.uReflOn.value=0; }
let lastRefl=-Infinity, reflCamKey='';
// 倒影只畫水面以上的東西：整個在水面以下或平貼水面的物件（荷葉、碎葉、沉在水裡的東西、魚）在倒影裡看不到，卻佔掉大量繪製；每 1.5 秒重新整理一次名單
let lowList=[], lowScan=-1e9; const _lowBS=new T.Sphere();
function lowReflObjects(){ const now=performance.now(); if(now-lowScan>1500){ lowScan=now; lowList=[]; scene.traverse(o=>{ if(!o.isMesh||!o.visible||o===water||o===seaGrid||o===sky) return; if(o.userData.flatOnWater){ lowList.push(o); return; } if(o.isInstancedMesh||o.isSkinnedMesh||!o.geometry) return; const g=o.geometry; if(!g.boundingSphere) g.computeBoundingSphere(); if(!g.boundingSphere) return; _lowBS.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); if(_lowBS.center.y+_lowBS.radius<.1) lowList.push(o); }); } return lowList; }
function renderRefl(){
  camera.updateMatrixWorld(); _cp.setFromMatrixPosition(camera.matrixWorld);
  if(_cp.y<.05){ WU.uReflOn.value=0; lastRefl=-Infinity; return; }
  // 倒影依畫質用較低頻率更新：水面本來就有波紋，20～30 次／秒肉眼看不出差別，卻省下整整一次全場景繪製；鏡頭大幅移動時立刻補畫
  { const e=camera.matrixWorld.elements, key=[e[8],e[9],e[10],e[12],e[13],e[14]].map(v=>Math.round(v*8)).join(','), hz=window.__effectBudget?.reflectionHz||60, now=U.uTime.value;
    if(reflCamKey===key&&now-lastRefl<1/hz&&now>=lastRefl&&WU.uReflOn.value===1) return; reflCamKey=key; lastRefl=now; }
  renderer.getDrawingBufferSize(_sz); const mobile=!!window.__resourcePolicy?.mobile,cap=mobile?(window.__gfxStatus&&window.__gfxStatus.level>=6?768:window.__GFX==='high'?640:512):(window.__gfxStatus&&window.__gfxStatus.level===7?1536:window.__GFX==='high'?1024:640),k=Math.min(reflScale,cap/Math.max(_sz.x,_sz.y)),w=Math.max(64,Math.round(_sz.x*k)), h=Math.max(64,Math.round(_sz.y*k));
  if(reflRT.width!==w||reflRT.height!==h) reflRT.setSize(w,h);
  _rp.set(_cp.x,0,_cp.z); _vw.subVectors(_rp,_cp).reflect(_n).negate().add(_rp);
  _rm.extractRotation(camera.matrixWorld); _la.set(0,0,-1).applyMatrix4(_rm).add(_cp);
  _tg.subVectors(_rp,_la).reflect(_n).negate().add(_rp);
  reflCam.position.copy(_vw); reflCam.up.set(0,1,0).applyMatrix4(_rm).reflect(_n); reflCam.lookAt(_tg);
  reflCam.far=camera.far; reflCam.near=camera.near; reflCam.updateMatrixWorld(); reflCam.projectionMatrix.copy(camera.projectionMatrix);
  reflTM.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1).multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
  _pl.setFromNormalAndCoplanarPoint(_n,_rp).applyMatrix4(reflCam.matrixWorldInverse);
  _cpl.set(_pl.normal.x,_pl.normal.y,_pl.normal.z,_pl.constant);
  const pm=reflCam.projectionMatrix;
  _q.x=(Math.sign(_cpl.x)+pm.elements[8])/pm.elements[0]; _q.y=(Math.sign(_cpl.y)+pm.elements[9])/pm.elements[5]; _q.z=-1; _q.w=(1+pm.elements[10])/pm.elements[14];
  _cpl.multiplyScalar(2/_cpl.dot(_q)); pm.elements[2]=_cpl.x; pm.elements[6]=_cpl.y; pm.elements[10]=_cpl.z+1-.003; pm.elements[14]=_cpl.w;
  const hid=[water,seaGrid,sky,...reflHide,...lowReflObjects()].filter(o=>o&&o.visible); hid.forEach(o=>o.visible=false);
  const requestedShadow=renderer.shadowMap.needsUpdate;renderer.shadowMap.needsUpdate=false;
  const oc=renderer.getClearColor(new T.Color()), oa=renderer.getClearAlpha(), ort=renderer.getRenderTarget(), bg=scene.background, sh=renderer.shadowMap.autoUpdate, tone=renderer.toneMapping, encoding=renderer.outputEncoding;
  scene.background=null; renderer.shadowMap.autoUpdate=false;
  try{
    // Reflection target stores linear radiance, so the water shader applies exposure once.
    renderer.toneMapping=T.NoToneMapping; renderer.outputEncoding=T.LinearEncoding;
    renderer.setRenderTarget(reflRT);renderer.setClearColor(0x000000,0);renderer.clear();renderer.render(scene,reflCam);
    WU.uReflOn.value=1;
  }finally{
    renderer.setRenderTarget(ort);renderer.setClearColor(oc,oa);scene.background=bg;renderer.shadowMap.autoUpdate=sh;
    renderer.shadowMap.needsUpdate=requestedShadow;renderer.toneMapping=tone;renderer.outputEncoding=encoding;hid.forEach(o=>o.visible=true);
  }
}

const optics=createWaterOptics(U);
const submerged=createSubmergedRenderer({renderer,scene,camera,U,WU});
const godRays=createGodRays({renderer,camera,U}), _grCol=new T.Color(), _grDir=new T.Vector3();
/* 光束的強度：白天看太陽高度（晨昏最明顯、正午很淡）、雲量；夜裡改用月光，弱很多。只在高畫質畫 */
const taa=createTAA({renderer});
function taaOn(){ return materialQuality.tier==='high'&&!window.__noTAA&&!(window.__SAVE&&window.__SAVE.taa===false); }   /* 時間抗鋸齒：高畫質才開，設定裡可關 */
function raysOn(){ return materialQuality.tier==='high'&&!window.__noRays&&!(window.__SAVE&&window.__SAVE.rays===false); }   /* 設定裡可以關掉 */
function raysParams(){ if(!raysOn()) return null; const sd=U.uSunDir.value, vis=U.uSunVis?U.uSunVis.value:1;
  if(sd.y>-.04&&vis>.05){ const low=1-Math.min(1,Math.max(0,(sd.y-.08)/.5)); _grDir.copy(sd).normalize(); _grCol.setRGB(1,.86,.64); if(U.uLightCol) _grCol.lerp(new T.Color(U.uLightCol.value.x,U.uLightCol.value.y,U.uLightCol.value.z).multiplyScalar(.6),.35); return {dir:_grDir,color:_grCol,strength:Math.min(.7,vis*(.08+.62*low*low)),thresh:.6}; }
  const mk=U.uMoonK?U.uMoonK.value:0; if(mk>.05&&U.uMoonDir){ _grDir.copy(U.uMoonDir.value).normalize(); _grCol.setRGB(.62,.72,.95); return {dir:_grDir,color:_grCol,strength:mk*.45,thresh:.16}; }
  return null; }
const radiance=createSceneRadiance(T,renderer,prepareScene),interiorReflection=createInteriorReflection(T,renderer);let lastShadow=-Infinity;
/* 戶外陰影：太陽方向、鏡頭位置與朝向都沒變的時候（等魚咬餌、看風景），每 0.5 秒才重算一次；一有變化就照原本的頻率。
   畫面完全一樣，省下的是每秒十幾次重畫所有投影物（倒木、樹樁一個就 4～8 萬面） */
let _shSig='', _shC=new T.Vector3(), _shD=new T.Vector3();
function shadowSigChanged(){ camera.getWorldPosition(_shC); camera.getWorldDirection(_shD); const sd=U.uSunDir.value;
  const sig=[sd.x,sd.y,sd.z].map(v=>Math.round(v*300)).join(',')+'|'+[_shC.x,_shC.y,_shC.z].map(v=>Math.round(v*5)).join(',')+'|'+[_shD.x,_shD.y,_shD.z].map(v=>Math.round(v*30)).join(',');
  if(sig===_shSig) return false; _shSig=sig; return true; }
function render(){prepareScene(scene);const oldEnv=scene.environment;if(window.__effectBudget?.environment===false)scene.environment=null;const auto=renderer.shadowMap.autoUpdate,request=renderer.shadowMap.needsUpdate;
 try{const now=U.uTime.value,hz=window.__effectBudget?.shadowHz||20;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=now-lastShadow>=1/hz&&(shadowSigChanged()||now-lastShadow>=.5);if(renderer.shadowMap.needsUpdate)lastShadow=now;
  const shadowNow=renderer.shadowMap.needsUpdate;
  pass('sub',()=>submerged.render());
  if(reflEnabled){try{pass('refl',renderRefl);}catch(e){reflEnabled=false;WU.uReflOn.value=0;console.warn('refl off',e);}}
  { const on=taaOn(); try{ taa.begin(camera,on); }catch(e){ window.__noTAA=true; } }
  pass('main',()=>radiance.render(scene,camera));
  { const on=taaOn(); try{ taa.resolve(camera,on); }catch(e){ window.__noTAA=true; console.warn('taa off',e); } }
  { const rp=raysParams(); if(rp){ try{ godRays.render(rp); }catch(e){ window.__noRays=true; console.warn('rays off',e); } } }
  passStats.main.shadow=shadowNow;passStats.main.shadowSize=sunLight.shadow.mapSize.x;passStats.refl.w=reflRT.width;passStats.refl.h=reflRT.height;passStats.sub.w=submerged.target.width;passStats.sub.h=submerged.target.height;passStats.sub.on=WU.uSubmergedOn.value>0;passStats.refl.on=WU.uReflOn.value>0;
 }finally{scene.environment=oldEnv;renderer.shadowMap.autoUpdate=auto;renderer.shadowMap.needsUpdate=request;}
}
// 每個繪製階段的提交時間與繪製次數，給診斷報告判斷瓶頸在哪一個階段（倒影、水下、主畫面＋陰影）
const passStats=window.__passStats={sub:{ms:0,calls:0,tris:0},refl:{ms:0,calls:0,tris:0},main:{ms:0,calls:0,tris:0,shadow:false,shadowSize:0}};
function pass(name,fn){const info=renderer.info,c0=info.render.calls,t0=info.render.triangles,n0=performance.now();fn();const st=passStats[name];st.ms=+(performance.now()-n0).toFixed(2);st.calls=info.render.calls-c0;st.tris=info.render.triangles-t0;}

function suspendEffects(){if(typeof godRays!=='undefined')godRays.release();if(typeof taa!=='undefined')taa.release();releaseSceneGPU(scene);if(sunLight.shadow.map){sunLight.shadow.map.dispose();sunLight.shadow.map=null;}lastShadow=-Infinity;reflRT.setSize(4,4);WU.uReflOn.value=0;submerged.target.setSize(4,4);WU.uSubmergedOn.value=0;radiance.release();}
function resetGraphics(){suspendEffects();if(envRT){envRT.dispose();envRT=null;scene.environment=null;}envJobs.reset();invalidateEnvironment();}
function setIce(on){water.visible=!on;seaGrid.visible=!on;}
function setSea(on){ seaMode=on; U.uSea.value=on?1:0; seaGrid.visible=water.visible; if(on){ WU.uDeep.value.set(.006,.03,.06); WU.uScatter.value.set(.02,.10,.12); } else { WU.uDeep.value.set(.010,.019,.011); WU.uScatter.value.set(.018,.045,.026); } }
let photoHook=null;
function invalidateEnvironment(){wxDirty=true;}
function setPhotoHook(f){ photoHook=f;wxDirty=true; }
function setPhotoActive(){ wxDirty=true;envHour=-99;U.uPhoto.value=1; skyMat.toneMapped=false; skyMat.needsUpdate=true; waterMat.toneMapped=false; waterMat.needsUpdate=true; seaMat.toneMapped=false; seaMat.needsUpdate=true; }
function setWind(x,z,s){ U.uWind.value.set(x,z,s); }
// 水色：每個水域的水本身顏色不同（浮萍灣藻綠、倒木區單寧茶色、深水中央墨綠藍…），換釣點時慢慢轉過去
const WT={d:new T.Vector3(.010,.019,.011),s:new T.Vector3(.018,.045,.026)};
function setWaterTint(d,s){ WT.d.set(d[0],d[1],d[2]); WT.s.set(s[0],s[1],s[2]); }
function tintTick(dt){ const k=Math.min(1,dt*.6); WU.uDeep.value.lerp(WT.d,k); WU.uScatter.value.lerp(WT.s,k); }
return { godRays,raysOn,setEffects,prepareScene,updateEnvironment,resetGraphics,suspendEffects,invalidateEnvironment,interiorReflection,radiance,qualityTextures,setWaterDetail,optics,setShadows,submerged,setWaterTint, tintTick, setIce, setRefl, reflHide:o=>reflHide.push(o), setSea, isSea:()=>seaMode, setPhotoHook, setPhotoActive, setWind, setWeather, renderer, scene, camera, player, head, U, EYE_Y, shoreR, setTime, update, addRipple, swell, resize, setPR, getPR:()=>pr, render, info };
}
