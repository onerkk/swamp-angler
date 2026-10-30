/*APPV:20261030052941*/
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
uniform vec3 uWind;
uniform vec2 uCloudOff;
uniform float uCShadow;
uniform sampler2D uBandA;
uniform sampler2D uBandB;
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
vec3 photoEnv(vec3 dir){
  vec3 d = normalize(dir);
  vec3 c = mix(photoS(uBandA, uFullA, d), photoS(uBandB, uFullB, d), uPMix);
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
varying vec3 vW;
varying vec3 vNs;
varying float vH;
vec3 gW(vec2 p0, vec2 d, float L, float A, float Q, inout vec3 n){
  float k = 6.2831853/L; float w = sqrt(9.81*k); float th = k*dot(d, p0) - w*uTime; float c = cos(th); float s = sin(th);
  n.x -= d.x*k*A*c; n.z -= d.y*k*A*c; n.y -= Q*k*A*s;
  return vec3(Q*A*d.x*c, A*s, Q*A*d.y*c);
}
void main(){
  vec4 wp = modelMatrix*vec4(position, 1.0); vec2 p0 = wp.xz;
  vec2 rel = wp.xz - modelMatrix[3].xz;
  float edge = 1.0 - smoothstep(105.0, 148.0, max(abs(rel.x), abs(rel.y)));
  vec2 wd = normalize(uWind.xy + vec2(1e-4)); float s = (0.45 + 1.1*uWind.z + 1.7*max(0.0, uWind.z - 0.6))*edge;
  vec2 d2 = vec2(wd.x*0.77 - wd.y*0.64, wd.y*0.77 + wd.x*0.64); vec2 d3 = vec2(wd.x*0.77 + wd.y*0.64, wd.y*0.77 - wd.x*0.64);
  vec2 d4 = vec2(wd.x*0.34 - wd.y*0.94, wd.y*0.34 + wd.x*0.94);
  vec3 n = vec3(0.0, 1.0, 0.0); vec3 off = vec3(0.0);
  off += gW(p0, wd, 38.0, 0.42*s, 0.45, n);
  off += gW(p0, d2, 23.0, 0.28*s, 0.5, n);
  off += gW(p0, d3, 15.0, 0.18*s, 0.5, n);
  off += gW(p0, d4, 9.0, 0.11*s, 0.55, n);
  off += gW(p0, vec2(0.6, 0.8), 5.5, 0.06*s, 0.6, n);
  off += gW(p0, vec2(-0.8, 0.6), 3.2, 0.035*s, 0.6, n);
  wp.xyz += off; vW = wp.xyz; vNs = normalize(n); vH = off.y/(1.1*s + 1e-3);
  gl_Position = projectionMatrix*viewMatrix*wp;
}
`;
SH.waterFS = `
#ifdef SEAGRID
varying vec3 vNs;
varying float vH;
#endif
uniform vec4 uRip[12];
uniform vec3 uDeep;
uniform vec3 uScatter;
uniform float uWave;
uniform float uSunVis;
varying vec3 vW;
vec3 TM(vec3 x){ if(uPhoto < 0.5) return x; x *= uExpo; return clamp((x*(2.51*x + 0.03))/(x*(2.43*x + 0.59) + 0.14), 0.0, 1.0); }
float causF(vec2 p, float t){
  vec2 q = p*1.7 + 0.8*vec2(noise2(p*0.35 + t*0.12), noise2(p*0.35 - t*0.1 + 5.3));
  float a = abs(sin(q.x*2.3 + t*0.8) + sin(q.y*2.1 - t*0.7) + sin((q.x - q.y)*1.6 + t*0.6));
  return pow(clamp(1.0 - a*0.5, 0.0, 1.0), 5.0);
}
vec2 wv(vec2 p, vec2 d, float len, float amp, float dist){
  float k = 6.2831853/len; float w = sqrt(9.81*k);
  float ph = dot(d, p)*k - w*uTime;
  float fade = 1.0 - smoothstep(len*22.0*(1.0 + 3.0*uSea), len*80.0*(1.0 + 4.0*uSea), dist);
  return d*(amp*k*cos(ph)*fade);
}
vec3 noised(vec2 x){
  vec2 i = floor(x); vec2 f = fract(x); vec2 u = f*f*(3.0 - 2.0*f); vec2 du = 6.0*f*(1.0 - f);
  float a = hash21(i); float b = hash21(i + vec2(1.0, 0.0)); float c = hash21(i + vec2(0.0, 1.0)); float d = hash21(i + vec2(1.0, 1.0));
  return vec3(a + (b - a)*u.x + (c - a)*u.y + (a - b - c + d)*u.x*u.y, du*(vec2(b - a, c - a) + (a - b - c + d)*u.yx));
}
void main(){
  vec3 Vv = cameraPosition - vW; float dist = length(Vv); vec3 V = Vv/dist;
  #ifndef SEAGRID
  if(uSea > 0.5 && length(vW.xz - cameraPosition.xz) < 138.0) discard;
  #endif
  if(uPhoto > 0.5){ vec3 dv = normalize(vW - uEye); float ev = asin(clamp(dv.y, -1.0, 1.0));
    if(ev > -0.2094){ float uu = fract(atan(dv.x, -dv.z)*0.15915494 + uYaw); if(texture2D(uMask, vec2(uu, clamp((ev + 0.2094)/0.2094, 0.0, 1.0))).r < 0.5) discard; } }
  vec2 p = vW.xz;
  float rp = length(p); float Rs = shoreR(atan(p.x, -p.y));
  float nearShore = 1.0 - smoothstep(2.0, 20.0, Rs - rp);
  float nearDock = 1.0 - smoothstep(2.5, 7.0, length(vec2(p.x*0.8, p.y - 0.5)));
  float lane = exp(-p.x*p.x/70.0)*smoothstep(4.0, 12.0, -p.y)*(1.0 - smoothstep(40.0, 80.0, -p.y));
  float dens = fbm3(p*0.055 + vec2(7.3, 2.1)) + nearShore*0.26 + nearDock*0.12 - lane*0.3 - 0.22*smoothstep(0.55, 0.78, noise2(p*0.45 + 3.7));
  float px = length(fwidth(p));
  float fadeD = 1.0 - smoothstep(0.012, 0.03, px);
  float leaf = noise2(p*42.0)*0.6 + noise2(p*11.0)*0.4;
  float dw = smoothstep(0.6, 0.64, dens + (leaf - 0.5)*0.16*fadeD)*(1.0 - uSea);
  vec2 wd = normalize(uWind.xy + vec2(1e-4));
  float gust = smoothstep(0.35, 0.75, noise2(p*0.035 - uCloudOff*9.0)*0.7 + noise2(p*0.11 - uCloudOff*20.0)*0.3);
  float csh = 1.0 - 0.85*cloudSh(p);
  float ruff = mix(0.15, 1.0, smoothstep(0.35, 0.7, noise2(p*0.03 + vec2(uTime*0.015, -uTime*0.01))))*(0.35 + 0.65*uWind.z) + gust*uWind.z*1.4;
  float amp = uWave*ruff*(1.0 - 0.85*dw);
  vec2 g = vec2(0.0);
  g += wv(p, vec2(0.958, 0.287), 5.3, 0.010, dist);
  g += wv(p, vec2(0.6, -0.8), 3.1, 0.006, dist);
  g += wv(p, vec2(-0.316, 0.949), 1.9, 0.004, dist);
  g += wv(p, vec2(0.894, 0.447), 1.1, 0.0022, dist);
  g += wv(p, vec2(-0.857, 0.514), 0.63, 0.0012, dist);
  g += wv(p, vec2(0.196, -0.981), 0.37, 0.0007, dist);
  g += wv(p, wd, 0.8, 0.0035*uWind.z, dist) + wv(p, vec2(wd.x*0.9 - wd.y*0.42, wd.y*0.9 + wd.x*0.42), 0.5, 0.0022*uWind.z, dist);
  g *= amp;
  #ifndef SEAGRID
  g += uSea*(wv(p, vec2(0.8, 0.6), 18.0, 0.32, dist) + wv(p, vec2(0.3, -0.954), 11.0, 0.18, dist) + wv(p, vec2(-0.707, 0.707), 7.0, 0.1, dist))*(0.6 + 0.8*uWind.z);
  #endif
  vec2 gd = vec2(0.0); float na = 0.005; float nf = 1.4;
  vec2 drift = vec2(uTime*0.11, uTime*0.07);
  for(int i = 0; i < 4; i++){
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
  #ifdef SEAGRID
  g += vec2(-vNs.x, -vNs.z)/max(vNs.y, 0.2);
  #endif
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float NdV = max(dot(N, V), 0.0);
  float F = (0.02 + 0.98*pow(1.0 - NdV, 5.0))*(1.0 - 0.3*uRain*uSea);   // 雨中的海面粗糙，鏡面反光變弱，浪坡不會反出一條條亮線
  vec3 R = reflect(-V, N); R.y = max(R.y, 0.003); R = normalize(R);
  vec3 refl = envRay(vW, R, false, true);
  refl = mix(refl, vec3(dot(refl, vec3(0.3, 0.59, 0.11))), 0.35*uRain*uSea);   // 雨打花的海面把天空反得糊而灰
  if(uReflOn > 0.5){
    vec4 rp = uReflMat*vec4(vW.x, 0.0, vW.z, 1.0);
    vec2 ruv = rp.xy/rp.w + N.xz*(0.03 + 0.05*uSea)*(1.0 - smoothstep(30.0, 160.0, dist)*0.6);
    vec4 rc = texture2D(uRefl, clamp(ruv, 0.002, 0.998));
    refl = mix(refl, TM(rc.rgb)*0.92, clamp(rc.a, 0.0, 1.0)*(1.0 - 0.35*uRain));
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
  if(uSea > 0.5){
    float lk = 0.22 + 0.78*uLightK;
    vec3 deepC = uSeaCol*lk*(0.72 + 0.56*clamp(dot(N, normalize(vec3(uSunDir.x, 0.6, uSunDir.z))), 0.0, 1.0));
    deepC *= 1.0 - 0.38*uRain - 0.15*(1.0 - uSunVis);
    deepC = mix(deepC, vec3(dot(deepC, vec3(0.3, 0.55, 0.15)))*vec3(0.9, 1.0, 1.02), clamp(0.55*uRain + 0.3*(1.0 - uSunVis), 0.0, 0.7));   // 去掉晴天的飽和藍，偏鉛灰   // 下雨、陰天的海是暗沉的鉛灰藍，不是晴天的亮藍
    bodyD = deepC;
    if(uReef > 0.01){
      vec3 Vr = refract(-V, N, 0.75);
      float iy = 1.0/max(-Vr.y, 0.12);
      vec2 b0 = vW.xz + Vr.xz*4.5*iy;
      float rf_ = noise2(b0*0.08)*0.6 + noise2(b0*0.23 + 3.1)*0.4;
      float reefK = smoothstep(0.46, 0.56, rf_), grass = smoothstep(0.38, 0.46, rf_)*(1.0 - reefK);
      float Dd = 4.5 - 1.6*reefK, Lp = Dd*iy;
      vec2 bp = vW.xz + Vr.xz*Lp;
      float cs = (causF(bp, uTime) + 0.6*causF(bp*1.7 + 9.0, uTime*1.2))*mix(0.15, 1.0, uSunVis)*(1.0 - 0.7*uRain);   // 陰天下雨沒有陽光，海底不會有亮晶晶的光紋
      vec3 rk = mix(vec3(0.10, 0.13, 0.11), vec3(0.04, 0.06, 0.06), noise2(bp*0.9));
      vec3 bed = mix(mix(vec3(0.92, 0.88, 0.72), vec3(0.45, 0.50, 0.35), grass*0.6), rk, reefK);
      bed *= lk*(0.6 + 0.75*cs*uLightK*(0.35 + 0.65*uSunVis)*(1.0 - 0.6*reefK)*(1.0 - smoothstep(6.0, 40.0, dist)));
      vec3 Tr = exp(-vec3(0.38, 0.075, 0.055)*(Lp + Dd));
      vec3 shal = bed*Tr + vec3(0.02, 0.30, 0.36)*lk*(1.0 - Tr);
      shal = mix(shal, vec3(dot(shal, vec3(0.3, 0.55, 0.15)))*vec3(0.85, 1.0, 1.0), 0.45*(1.0 - uSunVis) + 0.3*uRain);
      shal *= 1.0 - 0.45*uRain;   // 下雨：雲厚光弱、水面被雨打花，淺海明顯暗下來   // 陰天：淺水的藍綠色變得灰而柔和
      bodyD = mix(deepC, shal, uReef*(1.0 - smoothstep(20.0, 160.0, dist)));
    }
    #ifdef SEAGRID
    bodyD += vec3(0.04, 0.24, 0.26)*smoothstep(-0.1, 0.9, vH)*uLightK*(0.4 + 0.6*clamp(dot(N, normalize(vec3(uSunDir.x, 0.25, uSunDir.z))), 0.0, 1.0));
    // 浪頭白沫：風越大、浪越高越多；碎成一塊一塊、隨時間消散
    { float wcN = noise2(vW.xz*0.35 + vec2(uTime*0.05, uTime*0.03))*0.6 + noise2(vW.xz*1.3 - uTime*0.08)*0.4;
      float wc = smoothstep(0.62, 0.9, vH*0.75 + wcN*0.55)*clamp(uWind.z*1.4 - 0.25, 0.0, 1.0)*(1.0 - smoothstep(60.0, 260.0, dist));
      wc *= smoothstep(0.45, 0.8, noise2(vW.xz*0.06 + vec2(uTime*0.02, 0.0)))*smoothstep(0.3, 0.7, noise2(vW.xz*0.9 + uTime*0.1));   // 白沫零星成塊，不會沿著浪的等高線連成一條條白線
      bodyD = mix(bodyD, vec3(0.82, 0.86, 0.88)*(0.35 + 0.65*uLightK), wc*0.6); }
    #endif
    refl *= vec3(0.74, 0.88, 1.0); F *= 0.82;
    bodyD *= mix(1.0, 0.1, uNight);
  }
  vec3 col = mix(bodyD, refl, F) + TM(glint*(0.25 + 0.75*F));
  if(uMoonK > 0.01){ float md = max(dot(R, uMoonDir), 0.0);
    col += vec3(0.78, 0.84, 1.0)*(pow(md, 700.0)*3.5 + pow(md, 40.0)*0.05)*uMoonK*(0.3 + 0.7*F); }
  if(uBio > 0.01){ float bn = noise2(p*4.2 + vec2(uTime*0.23, -uTime*0.19))*noise2(p*1.1 - uTime*0.05);
    float bs = smoothstep(0.55, 0.8, bn)*(0.5 + 0.5*sin(uTime*3.1 + p.x*5.7 + p.y*3.3));
    col += vec3(0.05, 0.42, 0.8)*bs*uBio*(1.0 - smoothstep(4.0, 50.0, dist))*0.7; }
  vec3 dwc = vec3(0.09, 0.19, 0.024)*(0.65 + 0.55*mix(0.5, leaf, fadeD))*(amb*0.75 + uLightCol*ndl*uSunVis*0.42*csh + 0.02);
  col = mix(col, TM(dwc), dw);
  float foamS = (1.0 - smoothstep(0.3, 2.5, Rs - rp))*(0.5 + 0.5*noise2(p*1.3 + uTime*0.05))*(1.0 - uSea);
  float cap = smoothstep(0.16, 0.3, length(g))*clamp((uWind.z - 0.45)*2.2, 0.0, 1.0)*(0.5 + 0.5*noise2(p*2.0 - uCloudOff*30.0));
  #ifdef SEAGRID
  cap += smoothstep(0.55, 0.95, vH)*clamp(uWind.z*1.5 - 0.2, 0.0, 1.0)*(0.4 + 0.6*noise2(p*1.7 - uCloudOff*25.0));
  #endif
  float foam = clamp(foamS*0.55 + cap*0.8, 0.0, 0.9)*(1.0 - dw);
  col = mix(col, TM((amb*0.9 + uLightCol*ndl*0.5*csh)*0.55), foam);
  float mist = uMist*0.4*smoothstep(12.0, 90.0, dist);
  vec3 fogC = uPhoto > 0.5 ? photoEnv(normalize(vec3(-V.x, 0.015, -V.z))) : fogColor(-V);
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

const renderer = new T.WebGLRenderer({canvas:opts.canvas, antialias:true, powerPreference:'high-performance'});
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;

const scene = new T.Scene();
const camera = new T.PerspectiveCamera(70, 1, 0.04, 2500);
const player = new T.Group(); player.position.set(0, EYE_Y, 0); scene.add(player);
const head = new T.Group(); head.rotation.x = -0.16; player.add(head); head.add(camera);

const V = () => new T.Vector3();
const U = { uTime:{value:0}, uSunDir:{value:new T.Vector3(0,1,0)}, uLightCol:{value:V()}, uSunDisk:{value:new T.Vector3(0,1,0)},
  uSunCol:{value:V()}, uMoonDir:{value:new T.Vector3(0,1,0)}, uMoonCol:{value:V()}, uZenith:{value:V()}, uHorizon:{value:V()},
  uGlow:{value:V()}, uFogCol:{value:V()}, uFogDen:{value:0.01}, uMist:{value:0.5}, uDay:{value:1}, uCloud:{value:0.45}, uOvcA:{value:null}, uOvcB:{value:null}, uOvcK:{value:0}, uSunVis:{value:1}, uEye:{value:new T.Vector3(0,2.4,0)}, uRain:{value:0}, uWind:{value:new T.Vector3(1,0,.15)}, uCloudOff:{value:new T.Vector2()}, uCShadow:{value:0}, uBandA:{value:null}, uBandB:{value:null}, uFullA:{value:null}, uFullB:{value:null}, uMask:{value:null}, uPMix:{value:0}, uPhoto:{value:0}, uYaw:{value:.25}, uExpo:{value:1}, uSea:{value:0}, uSeaCol:{value:new T.Vector3(.035,.25,.40)}, uReef:{value:0}, uNight:{value:0}, uNightDeep:{value:.1}, uMoonK:{value:0}, uBio:{value:0}, uLightK:{value:1} };

// 天空球（含樹林遠景）
const skyMat = new T.ShaderMaterial({uniforms:U, vertexShader:SH.skyVS, fragmentShader:SH.common+SH.skyFS, side:T.BackSide, depthWrite:false, depthTest:false});
const sky = new T.Mesh(new T.SphereGeometry(900, 48, 24), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false; sky.position.set(0, EYE_Y, 0); scene.add(sky);

// 水面：形狀貼合岸線的圓盤
const rip = []; for(let i=0;i<12;i++) rip.push(new T.Vector4(0,0,0,0));
const WU = Object.assign({}, U, { uRip:{value:rip}, uDeep:{value:new T.Vector3(0.010,0.019,0.011)}, uScatter:{value:new T.Vector3(0.018,0.045,0.026)}, uWave:{value:1.0} });
const waterMat = new T.ShaderMaterial({uniforms:WU, vertexShader:SH.waterVS, fragmentShader:SH.common+SH.waterFS, extensions:{derivatives:true}, depthWrite:false});
const SEG = 256, wpos = [0,0,0], widx = [];
for(let i=0;i<=SEG;i++){ const az=-Math.PI+2*Math.PI*i/SEG, R=1500; wpos.push(Math.sin(az)*R, 0, -Math.cos(az)*R); }
for(let i=1;i<=SEG;i++) widx.push(0, i+1, i);
const wgeo = new T.BufferGeometry(); wgeo.setAttribute('position', new T.Float32BufferAttribute(wpos,3)); wgeo.setIndex(widx);
const water = new T.Mesh(wgeo, waterMat); water.frustumCulled = false; scene.add(water);
const seaMat = new T.ShaderMaterial({uniforms:WU, vertexShader:SH.seaVS, fragmentShader:SH.common+SH.waterFS, defines:{SEAGRID:1}, extensions:{derivatives:true}, depthWrite:false});
const seaGrid = new T.Mesh(new T.PlaneGeometry(300,300,220,220).rotateX(-Math.PI/2), seaMat); seaGrid.visible=false; seaGrid.frustumCulled=false; scene.add(seaGrid);

// 光源
const sunLight = new T.DirectionalLight(0xffffff, 0.9); scene.add(sunLight); scene.add(sunLight.target);
const hemi = new T.HemisphereLight(0xffffff, 0x223322, 0.55); scene.add(hemi);

// 環境光照貼圖（由同一套天空/樹林產生）
const pmrem = new T.PMREMGenerator(renderer);
const envScene = new T.Scene();
envScene.add(new T.Mesh(new T.SphereGeometry(40,32,16), new T.ShaderMaterial({uniforms:U, vertexShader:SH.skyVS, fragmentShader:SH.common+SH.skyFS, side:T.BackSide, depthWrite:false, depthTest:false})));
let envRT = null, envHour = -99;
function regenEnv(){ const rt = pmrem.fromScene(envScene, 0, 0.1, 100); if(envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture; }

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
  sunLight.color.setRGB(lc.x, lc.y, lc.z); sunLight.intensity = 0.85;
  sunLight.position.copy(ld).multiplyScalar(60);
  const z = U.uZenith.value, hz = U.uHorizon.value;
  hemi.color.setRGB((z.x+hz.x)*0.6, (z.y+hz.y)*0.6, (z.z+hz.z)*0.6);
  hemi.groundColor.setRGB(0.012, 0.022, 0.014);
  info.day = U.uDay.value; info.light = Math.min(1.2, 0.08 + (lc.x+lc.y+lc.z)/3*0.35 + (hz.x+hz.y+hz.z)/3*0.5);
  if(photoHook){ const o=photoHook(h,wx); if(o){
    U.uSunDir.value.copy(o.dir); U.uSunDisk.value.copy(o.dir); U.uLightCol.value.set(o.lc[0],o.lc[1],o.lc[2]); U.uSunVis.value=1-wx.cloud*.85;
    renderer.toneMappingExposure=o.exp; U.uExpo.value=o.exp; sunLight.color.setRGB(o.lc[0],o.lc[1],o.lc[2]); sunLight.intensity=.35*(1-wx.cloud*.8);
    sunLight.position.copy(o.dir).multiplyScalar(60); hemi.intensity=0; info.light=o.light; return info; } }
  let dh = Math.abs(h - envHour); if(dh > 12) dh = 24 - dh;
  if(force || dh > 0.35 || wxDirty){ wxDirty = false; envHour = h; regenEnv(); }
  return info;
}

const ripS = []; for(let i=0;i<12;i++) ripS.push({x:0,z:0,age:9,amp:0}); let ripI = 0;
function addRipple(x, z, amp){ const r = ripS[ripI]; ripI = (ripI+1)%12; r.x=x; r.z=z; r.age=0; r.amp=amp; }
function seaH(x,z,t){ const w=U.uWind.value, L=Math.hypot(w.x,w.y)||1, dx=w.x/L, dz=w.y/L, s=.45+1.1*w.z+1.7*Math.max(0,w.z-.6);   /* 大風時浪高非線性增加：暴風雨約兩倍 */
  const D=[[dx,dz],[dx*.77-dz*.64,dz*.77+dx*.64],[dx*.77+dz*.64,dz*.77-dx*.64],[dx*.34-dz*.94,dz*.34+dx*.94],[.6,.8],[-.8,.6]], LL=[38,23,15,9,5.5,3.2], A=[.42,.28,.18,.11,.06,.035];
  let h=0; for(let i=0;i<6;i++){ const k=6.2831853/LL[i]; h+=A[i]*s*Math.sin(k*(D[i][0]*x+D[i][1]*z)-Math.sqrt(9.81*k)*t); } return h; }
function swell(x, z, t){ if(seaMode) return seaH(x,z,t); return 0.006*Math.sin(t*1.9+x*0.7) + 0.004*Math.sin(t*2.6+z*0.9+1.3); }
function update(dt, t){
  U.uTime.value = t; camera.getWorldPosition(U.uEye.value); U.uLightK.value = Math.min(1, Math.max(0, info.light));
  if(seaGrid.visible) seaGrid.position.set(Math.round(U.uEye.value.x/1.5)*1.5, 0, Math.round(U.uEye.value.z/1.5)*1.5);
  { const w=U.uWind.value, k=(.002+.01*w.z)*dt; U.uCloudOff.value.x+=w.x*k; U.uCloudOff.value.y+=w.y*k; }
  for(let i=0;i<12;i++){ const r = ripS[i]; r.age += dt; rip[i].set(r.x, r.z, r.age, r.age < 5 ? r.amp : 0); }
}

let pr = Math.min(window.devicePixelRatio || 1, 2), lw = 1, lh = 1;
function resize(w, h){ lw = w; lh = h; camera.aspect = w/h; camera.fov = w < h ? 70 : 52; camera.updateProjectionMatrix(); renderer.setPixelRatio(pr); renderer.setSize(w, h); }
function setPR(v){ pr = v; renderer.setPixelRatio(pr); renderer.setSize(lw, lh); }
/* 水面倒影：鏡像相機只拍物體（不含天空、水面），水面依波紋扭曲取樣 */
const reflRT=new T.WebGLRenderTarget(4,4,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat,depthBuffer:true});
const reflCam=new T.PerspectiveCamera(), reflTM=new T.Matrix4();
WU.uRefl={value:reflRT.texture}; WU.uReflMat={value:reflTM}; WU.uReflOn={value:0};
const _rp=new T.Vector3(), _cp=new T.Vector3(), _rm=new T.Matrix4(), _la=new T.Vector3(), _tg=new T.Vector3(), _n=new T.Vector3(0,1,0), _vw=new T.Vector3();
const _pl=new T.Plane(), _cpl=new T.Vector4(), _q=new T.Vector4(), _sz=new T.Vector2(); let reflScale=.35, reflEnabled=true, reflHide=[];
function setRefl(on,scale){ reflEnabled=on; if(scale) reflScale=scale; WU.uReflOn.value=0; }
function renderRefl(){
  camera.updateMatrixWorld(); _cp.setFromMatrixPosition(camera.matrixWorld);
  if(_cp.y<.05){ WU.uReflOn.value=0; return; }
  renderer.getDrawingBufferSize(_sz); const w=Math.max(64,Math.round(_sz.x*reflScale)), h=Math.max(64,Math.round(_sz.y*reflScale));
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
  const hid=[water,seaGrid,sky,...reflHide].filter(o=>o&&o.visible); hid.forEach(o=>o.visible=false);
  const oc=renderer.getClearColor(new T.Color()), oa=renderer.getClearAlpha(), ort=renderer.getRenderTarget(), bg=scene.background, sh=renderer.shadowMap.autoUpdate;
  scene.background=null; renderer.shadowMap.autoUpdate=false;
  renderer.setRenderTarget(reflRT); renderer.setClearColor(0x000000,0); renderer.clear(); renderer.render(scene,reflCam);
  renderer.setRenderTarget(ort); renderer.setClearColor(oc,oa); scene.background=bg; renderer.shadowMap.autoUpdate=sh;
  hid.forEach(o=>o.visible=true); WU.uReflOn.value=1; }
function render(){ if(reflEnabled){ try{ renderRefl(); }catch(e){ reflEnabled=false; WU.uReflOn.value=0; console.warn('refl off',e); } } renderer.render(scene, camera); }

function setIce(on){ water.visible=!on; if(on) seaGrid.visible=false; }
function setSea(on){ seaMode=on; U.uSea.value=on?1:0; seaGrid.visible=on; if(on){ WU.uDeep.value.set(.006,.03,.06); WU.uScatter.value.set(.02,.10,.12); } else { WU.uDeep.value.set(.010,.019,.011); WU.uScatter.value.set(.018,.045,.026); } }
let photoHook=null;
function setPhotoHook(f){ photoHook=f; }
function setPhotoActive(){ U.uPhoto.value=1; skyMat.toneMapped=false; skyMat.needsUpdate=true; waterMat.toneMapped=false; waterMat.needsUpdate=true; seaMat.toneMapped=false; seaMat.needsUpdate=true; }
function setWind(x,z,s){ U.uWind.value.set(x,z,s); }
// 水色：每個水域的水本身顏色不同（浮萍灣藻綠、倒木區單寧茶色、深水中央墨綠藍…），換釣點時慢慢轉過去
const WT={d:new T.Vector3(.010,.019,.011),s:new T.Vector3(.018,.045,.026)};
function setWaterTint(d,s){ WT.d.set(d[0],d[1],d[2]); WT.s.set(s[0],s[1],s[2]); }
function tintTick(dt){ const k=Math.min(1,dt*.6); WU.uDeep.value.lerp(WT.d,k); WU.uScatter.value.lerp(WT.s,k); }
return { setWaterTint, tintTick, setIce, setRefl, reflHide:o=>reflHide.push(o), setSea, isSea:()=>seaMode, setPhotoHook, setPhotoActive, setWind, setWeather, renderer, scene, camera, player, head, U, EYE_Y, shoreR, setTime, update, addRipple, swell, resize, setPR, getPR:()=>pr, render, info };
}
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
/* ===== 人形角色（林秋月／女鬼）的骨架與表情 =====
   骨架：臀→腰→胸→頸→頭；左右肩→上臂→前臂→手（寬袖跟著手臂垂掛）；左右大腿→小腿（長裙跟著擺）；長髮 4 節
   表情：活人臉、女鬼臉兩套，各 6 種（平常／閉眼／說話／圓口或尖叫／微笑或詭笑／含淚或哀傷）
   動作：站立呼吸、眨眼、說話、轉頭（可轉到 180 度：反頭）、頭歪、伸手抓、頭髮垂臉、抖動抽搐、僵硬爬行姿勢
   用法：window.__HUMAN.rig(模型根節點,{ghost:true}) → 控制器 */
window.__HUMAN=(()=>{ let T=null, RECT=null; const init=()=>{ if(!T){ T=window.THREE; RECT=new T.Vector4(.1317,.0442,.1695,.1220); } };   // 臉在模型貼圖上的位置
  const tex={}; const faceT=f=>{ init(); if(!tex[f]){ const t=new T.TextureLoader().load(f); t.encoding=T.sRGBEncoding; t.anisotropy=8; tex[f]=t; } return tex[f]; };
  function faceMat(mat,U){ mat.onBeforeCompile=sh=>{ sh.uniforms.tA=U.tA; sh.uniforms.tB=U.tB; sh.uniforms.uMix=U.mix; sh.uniforms.uRect={value:RECT}; sh.uniforms.uW1=U.w1; sh.uniforms.uW2=U.w2; sh.uniforms.uPale=U.pale;
    sh.fragmentShader=sh.fragmentShader.replace('#include <map_pars_fragment>','#include <map_pars_fragment>\nuniform sampler2D tA,tB; uniform float uMix,uPale; uniform vec4 uRect,uW1,uW2;\nvec3 cellOf(sampler2D t,int i,vec2 f){ float cx=float(i-3*(i/3)), cy=float(i/3); return sRGBToLinear(texture2D(t,vec2((cx+f.x)/3.,1.-(cy+f.y)/2.))).rgb; }\nvec3 faceOf(sampler2D t,vec2 f){ float s=uW1.x+uW1.y+uW1.z+uW1.w+uW2.x; return cellOf(t,0,f)*max(0.,1.-s)+cellOf(t,1,f)*uW1.x+cellOf(t,2,f)*uW1.y+cellOf(t,3,f)*uW1.z+cellOf(t,4,f)*uW1.w+cellOf(t,5,f)*uW2.x; }')
      .replace('#include <map_fragment>',`#include <map_fragment>
  { vec2 f=(vUv-uRect.xy)/(uRect.zw-uRect.xy); if(f.x>0.&&f.x<1.&&f.y>0.&&f.y<1.){ float m=smoothstep(0.,.2,f.x)*smoothstep(1.,.8,f.x)*smoothstep(0.,.14,f.y)*smoothstep(1.,.86,f.y);
      vec3 c=mix(faceOf(tA,f),faceOf(tB,f),uMix); diffuseColor.rgb=mix(diffuseColor.rgb,c,m*.96); } }
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.3,.55,.15)))*vec3(.86,.9,.95),uPale);   /* 變成女鬼：全身失去血色、偏青灰 */`); };
    mat.customProgramCacheKey=()=>'humanFace'; mat.needsUpdate=true; }
  function rig(root,opt){ init(); opt=opt||{}; const U={tA:{value:faceT('lin_face_alive.jpg')},tB:{value:faceT('lin_face_ghost.jpg')},mix:{value:opt.ghost?1:0},w1:{value:new T.Vector4()},w2:{value:new T.Vector4()},pale:{value:opt.ghost?.55:0}};
    root.updateMatrixWorld(true); let src=null; root.traverse(o=>{ if(o.isMesh&&!src) src=o; }); if(!src) return null;
    const geo=src.geometry.clone(); geo.applyMatrix4(new T.Matrix4().copy(root.matrixWorld).invert().multiply(src.matrixWorld)); geo.computeBoundingBox();
    const bb=geo.boundingBox, H=bb.max.y-bb.min.y, top=bb.max.y, Y=f=>top-f*H, Wd=(bb.max.x-bb.min.x)/2, cx=(bb.max.x+bb.min.x)/2, cz=(bb.max.z+bb.min.z)/2;
    // 清掉異常拉長的薄面（生成工具偶爾留下一條從手拉到腳的細線）
    if(geo.index){ const I=geo.index.array, P0=geo.attributes.position, a=new T.Vector3(), b=new T.Vector3(), c=new T.Vector3(), keep=[];
      for(let k=0;k<I.length;k+=3){ a.fromBufferAttribute(P0,I[k]); b.fromBufferAttribute(P0,I[k+1]); c.fromBufferAttribute(P0,I[k+2]); if(Math.max(a.distanceTo(b),b.distanceTo(c),c.distanceTo(a))>H*.12) continue; keep.push(I[k],I[k+1],I[k+2]); } geo.setIndex(keep); }
    const B={}, mk=(n,p,x,f,z)=>{ const b=new T.Bone(); b.name=n; b.userData.w=new T.Vector3(cx+x*Wd,Y(f),cz+(z||0)); B[n]=b; if(p) B[p].add(b); return b; };
    mk('root',null,0,.5); mk('hips','root',0,.5); mk('spine','hips',0,.42); mk('chest','spine',0,.3); mk('neck','chest',0,.2); mk('head','neck',0,.165);
    for(const [s,k] of [['L',-1],['R',1]]){ mk('sh'+s,'chest',k*.16,.215); mk('up'+s,'sh'+s,k*.3,.225); mk('fo'+s,'up'+s,k*.6,.35); mk('ha'+s,'fo'+s,k*.86,.47); mk('he'+s,'ha'+s,k*.98,.5);
      mk('th'+s,'hips',k*.11,.52); mk('kn'+s,'th'+s,k*.12,.74); mk('an'+s,'kn'+s,k*.12,.95); }
    mk('hr1','head',0,.13,-.09); mk('hr2','hr1',0,.25,-.1); mk('hr3','hr2',0,.38,-.09); mk('hr4','hr3',0,.5,-.08);
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
      if(!out&&v.z<B.neck.userData.w.z-.045&&f>.12&&f<.58&&ax<.24){ const k=Math.min(3,Math.max(0,(f-.13)/.12)), a=Math.floor(Math.min(2.999,k)); out=[['hr'+(a+1),1-(k-a)],['hr'+(a+2),k-a]]; if(f>.5){ const g=(f-.5)/.08; out=[[out[0][0],out[0][1]*(1-g)],[out[1][0],out[1][1]*(1-g)],['hips',g]]; } }
      // 下半身：裙子跟著左右腿擺動（越往下越跟腿，中間兩腿混合）
      if(!out&&f>.5){ const s=v.x<cx?'L':'R', o=s==='L'?'R':'L', side=Math.min(1,ax/.18), g=Math.min(1,(f-.5)/.12); const leg=f<.74?'th':(f<.95?'kn':'an');
        const wl=g*(.5+.5*side); out=[['hips',1-g],[leg+s,wl],[leg+o,g-wl]]; }
      if(!out){ const ys=spineC.map(c2=>B[c2].userData.w.y); let a=0; while(a<spineC.length-2&&v.y<ys[a+1]) a++; const t=Math.max(0,Math.min(1,(ys[a]-v.y)/Math.max(1e-4,ys[a]-ys[a+1]))); out=[[spineC[a],1-t],[spineC[a+1],t]]; }
      out.slice(0,4).forEach(([b,w],k)=>{ si[i*4+k]=idx(b); sw[i*4+k]=Math.max(0,w); }); const s2=sw[i*4]+sw[i*4+1]+sw[i*4+2]+sw[i*4+3]||1; for(let k=0;k<4;k++) sw[i*4+k]/=s2; }
    geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4)); geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
    const mat=src.material.clone(); mat.skinning=true; faceMat(mat,U);
    if(opt.debugW){ const col=new Float32Array(n*3); for(let i=0;i<n;i++){ const nm=list[si[i*4]].name; const c=/^(up|fo|ha|he[LR]|sh)/.test(nm)?[1,.1,.1]:/^hr/.test(nm)?[.2,.3,1]:/^(th|kn|an)/.test(nm)?[.1,1,.2]:[1,1,1]; col.set(c,i*3); } geo.setAttribute('color',new T.Float32BufferAttribute(col,3)); mat.vertexColors=true; mat.map=null; mat.emissiveMap=null; mat.onBeforeCompile=()=>{}; }
    const sk=new T.SkinnedMesh(geo,mat); sk.frustumCulled=false; src.parent.remove(src); root.add(sk); sk.add(B.root); sk.updateMatrixWorld(true); sk.bind(new T.Skeleton(list));
    const rest={}; list.forEach(b=>rest[b.name]=b.quaternion.clone()); const q=new T.Quaternion(), e=new T.Euler(0,0,0,'YXZ');
    const rot=(b,x,y,z)=>{ e.set(x,y,z,'YXZ'); q.setFromEuler(e); B[b].quaternion.copy(rest[b]).multiply(q); };
    // 狀態：可由劇情設定的姿勢參數（0～1 平滑過渡）
    const st={t:0,last:performance.now(),blink:0,nb:2,talk:0,hy:0,hp:0,hr:0,reach:0,hairFace:0,twitch:0,crawl:0,expr:-1,exprK:0,lean:0,armUp:0},
      tg={hy:0,hp:0,hr:0,reach:0,hairFace:0,twitch:0,crawl:0,lean:0,armUp:0};
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
      rot('neck',st.hp*.4+jit(),st.hy*.45,st.hr*.5); rot('head',st.hp*.6+Math.sin(t*.5)*.03*(1-tw)+jit(),st.hy*.55+jit(),st.hr*.7+jit());
      for(const [s,k] of [['L',-1],['R',1]]){ const relax=0;   /* 寬袖和洋裝是連在一起的：手臂只微微放下（女鬼略張的雙手），避免把布料拉開 */
        rot('up'+s,-st.reach*.25-st.crawl*1.0+jit(),0,k*(relax+st.armUp*.9+.03*Math.sin(t*.8+k))+jit());   /* 這個模型手臂往下的方向和美人魚相反 */   // 伸手往前抓／爬行時手撐地
        rot('fo'+s,-st.reach*1.1,-k*.15,k*st.crawl*.6+jit()); rot('ha'+s,-st.reach*.5,0,k*.1+jit()+k*st.reach*.3*Math.sin(t*14));   /* 手指一抓一抓 */
        rot('th'+s,-st.crawl*1.4,0,0); rot('kn'+s,st.crawl*2.0,0,0); rot('an'+s,0,0,0); }
      ['hr1','hr2','hr3','hr4'].forEach((nm,i)=>rot(nm,.05+Math.sin(t*.9-i*.6)*.04*(i+1)-st.hairFace*(i===0?2.6:.25),Math.sin(t*.5-i*.4)*.05,0));   // 頭髮垂到臉前
    };
    sk.onBeforeRender=tick;
    return {mesh:sk,bones:B,set:(k,v2)=>{ tg[k]=v2; },now:(k,v2)=>{ tg[k]=v2; st[k]=v2; },talk:s=>{ st.talk=Math.max(st.talk,s||2.5); },expr:i=>{ st.expr=i; },ghost:k=>{ U.mix.value=k; U.pale.value=k*.55; },adv:sec=>{ for(let k=0;k<sec/.05;k++){ st.last-=50; tick(); } }}; }
  return {rig};
})();
const SCAN_TINT=`#include <map_fragment>
{ vec3 al_ = diffuseColor.rgb; float L_ = dot(al_, vec3(0.3, 0.59, 0.11));
  float vy_ = clamp(vOP_.y/0.13*0.5 + 0.5, 0.0, 1.0);
  vec3 tn_ = mix(uBelly, uBack, smoothstep(0.25, 0.8, vy_));
  float bars_ = 1.0 - uBarK*smoothstep(0.55, 0.9, 0.5 + 0.5*cos(vOP_.x*uBarN*6.2831))*smoothstep(-0.38, -0.12, vOP_.x)*(1.0 - smoothstep(0.22, 0.32, vOP_.x))*smoothstep(0.3, 0.6, vy_);
  diffuseColor.rgb = mix(al_, L_*tn_*2.2, uTintK)*bars_; }`;
/* ===== 第 1 段 · 場景物件：碼頭、植物、釣竿、釣線、浮標、水花、魚 ===== */
function createProps(W){
'use strict';
const T = THREE, {scene, player, head, camera, U} = W;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function hashI(x,y){ let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function vn(x,y){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hashI(xi,yi), b=hashI(xi+1,yi), c=hashI(xi,yi+1), d=hashI(xi+1,yi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,o){ let s=0,a=.5,n=0; for(let i=0;i<o;i++){ s+=a*vn(x,y); n+=a; x=x*2.03+17.1; y=y*2.03+9.7; a*=.5; } return s/n; }
function dataTex(w,h,fn,srgb){
  const d=new Uint8Array(w*h*4), o=[0,0,0,255];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ o[3]=255; fn(x/w,y/h,o); const i=(y*w+x)*4;
    for(let k=0;k<4;k++){ const v=o[k]; d[i+k]=v<0?0:v>255?255:v; } }
  const t=new T.DataTexture(d,w,h,T.RGBAFormat); t.wrapS=t.wrapT=T.RepeatWrapping; t.magFilter=T.LinearFilter;
  t.minFilter=T.LinearMipmapLinearFilter; t.generateMipmaps=true; if(srgb!==false) t.encoding=T.sRGBEncoding; t.needsUpdate=true; return t;
}
const hex=s=>{ const n=parseInt(s.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; };
const mix3=(a,b,t)=>[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
function rng(seed){ return ()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const m4=new T.Matrix4(), q4=new T.Quaternion(), eu=new T.Euler(), pv=new T.Vector3(), sv=new T.Vector3();

/* ---------- 木碼頭 ---------- */
const woodTex=dataTex(256,256,(u,v,o)=>{ const n=fbm(u*3,v*20,3); const gr=Math.sin((v*46+n*6+fbm(u*12,v*3,2)*2.5)*Math.PI); const wt=fbm(u*5+3,v*5,3);
  const k=.62+.12*gr+.28*(n-.5); o[0]=118*k+40*wt; o[1]=96*k+34*wt; o[2]=74*k+30*wt; });
const plankMat=new T.MeshStandardMaterial({map:woodTex, roughness:.9, metalness:0});
const NPL=46, planks=new T.InstancedMesh(new T.BoxGeometry(2.5,.055,.19), plankMat, NPL);
{ const R=rng(7); for(let i=0;i<NPL;i++){ eu.set((R()-.5)*.02,(R()-.5)*.03,(R()-.5)*.015); q4.setFromEuler(eu);
  pv.set((R()-.5)*.06,.8+R()*.01,-3.2+i*.205); sv.set(1+R()*.03,1,1); m4.compose(pv,q4,sv); planks.setMatrixAt(i,m4);
  const c=.72+R()*.38; planks.setColorAt(i,new T.Color(c,c*(.95+R()*.06),c*(.9+R()*.08))); } }
// 每片木板取照片上不同的一段（隨機錯開紋理），不會每片長得一模一樣、排成一格一格的地磚
{ const off=new Float32Array(NPL*2), R=rng(19); for(let i=0;i<NPL;i++){ off[i*2]=R(); off[i*2+1]=R(); }
  planks.geometry.setAttribute('iOff',new T.InstancedBufferAttribute(off,2));
  plankMat.onBeforeCompile=sh=>{ sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 iOff;').replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_UV\nvUv += iOff;\n#endif'); };
  plankMat.customProgramCacheKey=()=>'plankOff'; }
planks.userData.lake=true; scene.add(planks);
const postTex=dataTex(64,128,(u,v,o)=>{ const n=fbm(u*8,v*30,3), g=sstep(.58,.66,v), w=[34,38,24], dr=[96,80,62];
  for(let k=0;k<3;k++) o[k]=(w[k]+(dr[k]-w[k])*g)*(.7+.6*n); });
const postMat=new T.MeshStandardMaterial({map:postTex, roughness:.85});
// 樁頂：鋸開的木頭斷面（深褐年輪、龜裂），不是會反光的白色圓盤
const endTex=dataTex(64,64,(u,v,o)=>{ const x=u*2-1, y=v*2-1, r=Math.hypot(x,y), ring=.5+.5*Math.sin(r*38+fbm(u*6,v*6,2)*6), crack=Math.pow(Math.abs(Math.sin(Math.atan2(y,x)*3+fbm(u*3,v*3,2)*4)),40)*.6;
  const k=(.55+.25*ring)*(1-crack)*(1-.35*sstep(.8,1,r)); o[0]=78*k; o[1]=62*k; o[2]=46*k; });
const endMat=new T.MeshStandardMaterial({map:endTex, roughness:.97, metalness:0});
for(const x of [-1.18,1.18]) for(const z of [-3.1,-.4,2.3,5.0]){ const m=new T.Mesh(new T.CylinderGeometry(.11,.12,2.6,10),[postMat,endMat,endMat]); m.position.set(x,-.3,z); m.rotation.y=Math.random()*6.28; m.userData.lake=true; scene.add(m); }
const beamMat=new T.MeshStandardMaterial({map:woodTex, color:0x8a7a68, roughness:.9});
for(const x of [-1.0,1.0]){ const m=new T.Mesh(new T.BoxGeometry(.12,.16,9.5),beamMat); m.position.set(x,.7,1.4); m.userData.lake=true; scene.add(m); }

/* ---------- 睡蓮葉、花、蘆葦 ---------- */
const padTex=dataTex(128,128,(u,v,o)=>{ const x=u*2-1, y=v*2-1, r=Math.hypot(x,y), a=Math.atan2(y,x);
  const vein=Math.pow(Math.abs(Math.cos(a*7)),60)*sstep(.1,.3,r)*.5, n=fbm(u*9,v*9,3);
  const k=.78+.35*n-vein*.6+.12*sstep(.85,1,r); o[0]=58*k; o[1]=92*k; o[2]=34*k; });
const padGeo=new T.CircleGeometry(1,24,.16,Math.PI*2-.32); padGeo.rotateX(-Math.PI/2);
const padMat=new T.MeshStandardMaterial({map:padTex, roughness:.68, metalness:0, side:T.DoubleSide, envMapIntensity:.35});   // 葉面蠟質只有淡淡光澤，陰天不會反射成一片白
const padPos=[];
{ const R=rng(11); const cl=[[-3.0,-5.5,9],[-2.4,-9.5,8],[3.4,-7.2,10],[2.9,-13,7],[-5.5,-15,10],[6,-18,9],[-3.8,-24,8],[5,-28,7],[-7,-30,9],[3.4,-4.6,6],[-3.3,-3.6,5]];
  for(const c of cl) for(let i=0;i<c[2];i++){ const a=R()*6.283, r=Math.sqrt(R())*1.6; padPos.push([c[0]+Math.cos(a)*r, c[1]+Math.sin(a)*r, .13+R()*.22, R()*6.283]); } }
const pads=new T.InstancedMesh(padGeo,padMat,padPos.length);
padPos.forEach((p,i)=>{ q4.setFromEuler(eu.set(0,p[3],0)); pv.set(p[0],.006+i*.00003,p[1]); sv.set(p[2],1,p[2]); m4.compose(pv,q4,sv); pads.setMatrixAt(i,m4);
  const c=.85+((i*7919)%100)/100*.3; pads.setColorAt(i,new T.Color(c,c,c*.9)); });
pads.userData.lake=true; scene.add(pads);
const petalMat=new T.MeshStandardMaterial({color:0xf3dfe4, roughness:.5, emissive:0x1a0a0c});
const coreMat=new T.MeshStandardMaterial({color:0xe8c040, roughness:.6});
const petalGeo=new T.SphereGeometry(1,10,8);
for(const k of [3,12,25,40,57,70]){ const p=padPos[k%padPos.length]; const g=new T.Group();
  for(let i=0;i<10;i++){ const m=new T.Mesh(petalGeo,petalMat); const a=i/10*6.283; m.scale.set(.05,.014,.022); m.position.set(Math.cos(a)*.04,.02,Math.sin(a)*.04); m.rotation.set(0,-a,.55); g.add(m); }
  const cm=new T.Mesh(new T.SphereGeometry(.022,10,8),coreMat); cm.position.y=.025; g.add(cm); g.position.set(p[0]+.05,.01,p[1]); g.userData.lake=true; scene.add(g); }

const bladeGeo=new T.PlaneGeometry(.022,1,1,5); bladeGeo.translate(0,.5,0);
{ const p=bladeGeo.attributes.position; for(let i=0;i<p.count;i++){ const y=p.getY(i); p.setX(i,p.getX(i)*(1-y*.9)); p.setZ(i,y*y*.06); } bladeGeo.computeVertexNormals(); }
const reedMat=new T.MeshStandardMaterial({color:0xffffff, roughness:.75, side:T.DoubleSide});
reedMat.onBeforeCompile=(s)=>{ s.uniforms.uTime=U.uTime; s.uniforms.uWind=U.uWind; s.vertexShader='uniform float uTime;\nuniform vec3 uWind;\n'+s.vertexShader.replace('#include <begin_vertex>',
 `#include <begin_vertex>
 float ph_ = 0.0;
 #ifdef USE_INSTANCING
 ph_ = instanceMatrix[3].x*0.9 + instanceMatrix[3].z*0.6;
 #endif
 float ws_ = 0.3 + uWind.z*2.2;
 float sw_ = (sin(uTime*(1.4 + uWind.z*2.0) + ph_)*0.6 + sin(uTime*2.3 + ph_*1.7)*0.4)*ws_;
 transformed.x += (sw_*0.07 + uWind.x*uWind.z*0.14)*position.y*position.y;
 transformed.z += (cos(uTime*1.1 + ph_)*0.03*ws_ + uWind.y*uWind.z*0.14)*position.y*position.y;`); };
const reedPos=[];
{ const R=rng(23); const cl=[[-3.4,-5.2,1.4,150],[-3.6,-9.5,1.4,90],[3.6,-4.4,1.2,120],[4.4,-8.5,1.2,70],[-6.5,-2,2,80],[7,-4,2,70]];
  for(const c of cl) for(let i=0;i<c[3];i++){ const a=R()*6.283, r=Math.sqrt(R())*c[2]; reedPos.push([c[0]+Math.cos(a)*r, c[1]+Math.sin(a)*r, .9+R()*1.1, R()]); } }
const reeds=new T.InstancedMesh(bladeGeo,reedMat,reedPos.length);
{ const R=rng(5); reedPos.forEach((p,i)=>{ eu.set((R()-.5)*.25,R()*6.283,(R()-.5)*.25); q4.setFromEuler(eu); pv.set(p[0],-.05,p[1]); sv.set(1,p[2],1); m4.compose(pv,q4,sv); reeds.setMatrixAt(i,m4);
  const t=p[3]; reeds.setColorAt(i,new T.Color().setRGB(lerp(.24,.46,t),lerp(.32,.42,t),lerp(.1,.16,t))); }); }
reeds.userData.lake=true; scene.add(reeds);

/* ---------- 釣竿（藍色碳纖竿、導環、紡車捲線器） ---------- */
const rod={pitch:0, pitchT:0, side:0, bend:0, bendT:0, spin:0, end:null, tipW:new T.Vector3(), spoolW:new T.Vector3(), guidesW:[]};
const R_BASE=new T.Vector3(0.21,-0.80,-0.78), R_DIR=new T.Vector3(-0.07,0.42,-0.9).normalize(), R_LEN=2.65, NS=20;
// 真實釣竿材質：碳纖編織紋竿身＋透明亮光漆、EVA 發泡握把（細小氣孔）、捲線器線杯纏著一圈圈釣線
const texC=(w,h,draw,rx,ry)=>{ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; draw(cv.getContext('2d'),w,h); const t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(rx||1,ry||1); return t; };
const carbonTex=texC(64,64,(g,w,h)=>{ g.fillStyle='#16181c'; g.fillRect(0,0,w,h); for(let y=0;y<h;y+=8) for(let x=0;x<w;x+=8){ const on=((x+y)/8)%2===0, gr=g.createLinearGradient(x,y,on?x+8:x,on?y:y+8); gr.addColorStop(0,'#1c1f24'); gr.addColorStop(.5,on?'#3a414b':'#2c323a'); gr.addColorStop(1,'#1c1f24'); g.fillStyle=gr; g.fillRect(x+.5,y+.5,7,7); } },3,4);
const evaTex=texC(64,64,(g,w,h)=>{ g.fillStyle='#202124'; g.fillRect(0,0,w,h); for(let i=0;i<500;i++){ g.fillStyle=Math.random()<.5?'rgba(0,0,0,.55)':'rgba(70,72,78,.35)'; g.beginPath(); g.arc(Math.random()*w,Math.random()*h,Math.random()*1.3+.3,0,7); g.fill(); } },2,6);
const blankMat=new T.MeshPhysicalMaterial({color:0xffffff,map:carbonTex,metalness:.25,roughness:.38,clearcoat:1,clearcoatRoughness:.05});
const gripMat=new T.MeshStandardMaterial({color:0xffffff,map:evaTex,bumpMap:evaTex,bumpScale:.002,roughness:.92});
const chromeMat=new T.MeshStandardMaterial({color:0xdde2e6, metalness:1, roughness:.16});
const darkMetal=new T.MeshStandardMaterial({color:0x2a2e35, metalness:.75, roughness:.3});
const goldMat=new T.MeshStandardMaterial({color:0xd9b25a, metalness:1, roughness:.2});
const spoolTex=texC(16,128,(g,w,h)=>{ for(let y=0;y<h;y++){ const v=170+Math.round(60*Math.abs(Math.sin(y*1.7))); g.fillStyle=`rgb(${v-30},${v},${v+10})`; g.fillRect(0,y,w,1); } },6,1);
const blueAno=new T.MeshPhysicalMaterial({color:0xffffff,map:spoolTex,metalness:.2,roughness:.35,clearcoat:.6});   // 線杯上纏滿的透明尼龍線
const rRad=s=>s<.1?.0155:s<.155?.0105:s<.21?.0128:lerp(.0082,.0021,(s-.21)/.79);
const rodGroup=new T.Group(); player.add(rodGroup);
const segs=[];
for(let i=0;i<NS;i++){ const s0=i/NS, s1=(i+1)/NS, sm=(s0+s1)/2;
  const mat=sm<.1?gripMat:sm<.155?chromeMat:sm<.21?gripMat:blankMat;
  const m=new T.Mesh(new T.CylinderGeometry(rRad(s1),rRad(s0),1,10),mat); rodGroup.add(m); segs.push(m); }
const GS=[.3,.42,.53,.63,.72,.8,.87,.93,.975];
const sicMat=new T.MeshStandardMaterial({color:0x2a2c30,metalness:.4,roughness:.25});
const guides=GS.map(s=>{ const r=.004+.008*(1-s); const m=new T.Mesh(new T.TorusGeometry(r,.0011,6,14),chromeMat); const ins=new T.Mesh(new T.TorusGeometry(r*.78,.0009,6,14),sicMat); m.add(ins); rodGroup.add(m); rod.guidesW.push(new T.Vector3()); return m; });   // 金屬導環架＋深色陶瓷內環
const tipTop=new T.Mesh(new T.TorusGeometry(.0035,.001,6,10),chromeMat); rodGroup.add(tipTop);
// 捲線器
const reel=new T.Group(); rodGroup.add(reel);
{ const foot=new T.Mesh(new T.BoxGeometry(.05,.008,.012),darkMetal); foot.position.y=-.016; reel.add(foot);
  const stem=new T.Mesh(new T.BoxGeometry(.012,.05,.01),darkMetal); stem.position.y=-.045; reel.add(stem);
  const body=new T.Mesh(new T.CylinderGeometry(.027,.031,.055,18),darkMetal); body.rotation.z=Math.PI/2; body.position.set(-.006,-.085,0); reel.add(body);
  const spool=new T.Mesh(new T.CylinderGeometry(.028,.028,.03,22),blueAno); spool.rotation.z=Math.PI/2; spool.position.set(.04,-.085,0); reel.add(spool);
  const lip=new T.Mesh(new T.CylinderGeometry(.031,.031,.004,22),chromeMat); lip.rotation.z=Math.PI/2; lip.position.set(.056,-.085,0); reel.add(lip);
  const bail=new T.Mesh(new T.TorusGeometry(.034,.0016,6,20,Math.PI),chromeMat); bail.rotation.y=Math.PI/2; bail.position.set(.044,-.085,0); reel.add(bail); }
const crank=new T.Group(); crank.position.set(-.008,-.085,.034); reel.add(crank);
{ const arm=new T.Mesh(new T.BoxGeometry(.006,.055,.005),darkMetal); arm.position.y=-.024; crank.add(arm);
  const knob=new T.Mesh(new T.CylinderGeometry(.008,.008,.022,12),gripMat); knob.rotation.x=Math.PI/2; knob.position.set(0,-.05,.014); crank.add(knob); }
const pts=[]; for(let i=0;i<=NS;i++) pts.push(new T.Vector3());
const AX=new T.Vector3(1,0,0), AY=new T.Vector3(0,1,0), AZ=new T.Vector3(0,0,1);
const dir=new T.Vector3(), bdir=new T.Vector3(), tmp=new T.Vector3(), tmp2=new T.Vector3(), tan=new T.Vector3(), dn=new T.Vector3(), sd=new T.Vector3();
const basis=new T.Matrix4();
function rodAt(s,out){ const f=s*NS, i=Math.min(NS-1,Math.floor(f)); return out.copy(pts[i]).lerp(pts[i+1],f-i); }
function frameAt(s){ const i=Math.min(NS-1,Math.floor(s*NS)); tan.subVectors(pts[i+1],pts[i]).normalize(); dn.set(0,-1,0).addScaledVector(tan,tan.y).normalize(); sd.crossVectors(tan,dn).normalize(); }
function updateRod(dt){
  rod.pitch+=(rod.pitchT-rod.pitch)*Math.min(1,dt*9);
  rod.bend+=(rod.bendT-rod.bend)*Math.min(1,dt*7);
  dir.copy(R_DIR).applyAxisAngle(AX,rod.pitch).applyAxisAngle(AY,-rod.side*0.42);
  player.updateMatrixWorld(true);
  if(rod.end){ tmp.copy(rod.end); rodGroup.updateMatrixWorld(true); rodGroup.worldToLocal(tmp); tmp2.copy(R_BASE).addScaledVector(dir,R_LEN); bdir.subVectors(tmp,tmp2); }
  else bdir.set(0,-1,0);
  bdir.addScaledVector(dir,-bdir.dot(dir)); if(bdir.lengthSq()<1e-6) bdir.set(0,-1,0); bdir.normalize();
  const b=Math.max(0.035,rod.bend);
  // 竿身越往竿尖越軟：每一小段的彎曲角度隨位置平方增加，重魚時竿尖可以被拉成很深的弧（握把段幾乎不彎）
  pts[0].copy(R_BASE); { let x=0,y=0; const st=R_LEN/NS; for(let i=1;i<=NS;i++){ const s=(i-.5)/NS, th=Math.min(1.9,b*1.55*Math.pow(Math.max(0,s-.18)/.82,1.8)); x+=Math.cos(th)*st; y+=Math.sin(th)*st; pts[i].copy(R_BASE).addScaledVector(dir,x).addScaledVector(bdir,y); } }
  for(let i=0;i<NS;i++){ const a=pts[i], c=pts[i+1]; const m=segs[i]; m.position.addVectors(a,c).multiplyScalar(.5);
    tmp.subVectors(c,a); const L=tmp.length(); m.quaternion.setFromUnitVectors(AY,tmp.divideScalar(L)); m.scale.set(1,L,1); }
  GS.forEach((s,k)=>{ rodAt(s,tmp); frameAt(s); const g=guides[k]; g.position.copy(tmp).addScaledVector(dn,.008+.026*(1-s)); g.quaternion.setFromUnitVectors(AZ,tan);
    rod.guidesW[k].copy(g.position); rodGroup.localToWorld(rod.guidesW[k]); });
  tipTop.position.copy(pts[NS]); frameAt(.999); tipTop.quaternion.setFromUnitVectors(AZ,tan);
  rodAt(.125,tmp); frameAt(.125); basis.makeBasis(tan, tmp2.copy(dn).negate(), sd); reel.position.copy(tmp); reel.quaternion.setFromRotationMatrix(basis);
  crank.rotation.z=rod.spin;
  rod.tipW.copy(pts[NS]); rodGroup.localToWorld(rod.tipW);
  reel.updateMatrixWorld(true); rod.spoolW.set(.058,-.085,0); reel.localToWorld(rod.spoolW);
}

/* ---------- 釣線（固定像素寬度的帶狀網格） ---------- */
const LN=72, lpos=new Float32Array(LN*2*3), lidx=[];
for(let i=0;i<LN-1;i++){ const a=i*2; lidx.push(a,a+1,a+2, a+1,a+3,a+2); }
const lgeo=new T.BufferGeometry(); lgeo.setAttribute('position',new T.BufferAttribute(lpos,3)); lgeo.setIndex(lidx);
const lineMat=new T.MeshBasicMaterial({color:0xdfe6e8, transparent:true, opacity:.42, side:T.DoubleSide, depthWrite:false});   // 尼龍線是半透明的，只在反光處看得清楚
const lineMesh=new T.Mesh(lgeo,lineMat); lineMesh.frustumCulled=false; scene.add(lineMesh);
const LP=[]; for(let i=0;i<LN;i++) LP.push(new T.Vector3());
const camW=new T.Vector3(), lt=new T.Vector3(), lc=new T.Vector3(), ls=new T.Vector3();
function setLine(end, slack, visible, light, trem){
  lineMesh.visible=!!visible; if(!visible) return;
  let n=0; LP[n++].copy(rod.spoolW); for(const g of rod.guidesW) LP[n++].copy(g); LP[n++].copy(rod.tipW);
  const tip=rod.tipW, dist=tip.distanceTo(end), sag=slack*Math.min(dist,40)*0.12, NC=LN-n;
  const ctrl=tmp2.copy(tip).add(end).multiplyScalar(.5); ctrl.y-=sag*2;
  if(trem){ const tq=performance.now()*.001; ctrl.x+=Math.sin(tq*61)*trem; ctrl.y+=Math.sin(tq*47+1.3)*trem*.7; ctrl.z+=Math.cos(tq*53)*trem; }   // 繃緊的釣線細微顫動
  for(let i=1;i<=NC;i++){ const t=i/NC, a=(1-t)*(1-t), b=2*(1-t)*t, c=t*t;
    LP[n++].set(a*tip.x+b*ctrl.x+c*end.x, a*tip.y+b*ctrl.y+c*end.y, a*tip.z+b*ctrl.z+c*end.z); }
  camera.getWorldPosition(camW);
  const pix=2*Math.tan(camera.fov*Math.PI/360)/Math.max(300,window.innerHeight);
  for(let i=0;i<n;i++){ const p=LP[i]; const pa=LP[Math.max(0,i-1)], pb=LP[Math.min(n-1,i+1)];
    lt.subVectors(pb,pa); lc.subVectors(camW,p); const d=lc.length(); ls.crossVectors(lt,lc); const L=ls.length()||1;
    const w=Math.max(.0006,d*pix*1.25)*.5; ls.multiplyScalar(w/L);
    lpos[i*6]=p.x-ls.x; lpos[i*6+1]=p.y-ls.y; lpos[i*6+2]=p.z-ls.z; lpos[i*6+3]=p.x+ls.x; lpos[i*6+4]=p.y+ls.y; lpos[i*6+5]=p.z+ls.z; }
  lgeo.attributes.position.needsUpdate=true; lgeo.setDrawRange(0,(n-1)*6);
  const k=clamp(light,.12,1); lineMat.color.setRGB(.8*k,.86*k,.88*k);
}

/* ---------- 浮標：照真實的磯釣棒浮標做——輕木紡錘形浮身、上段螢光漆、下段深色、細長的天線（彩色刻度）、
   頂端夜光珠、底部金屬轉環；亮光漆有清漆反光。原點在水線：水面上只露出天線和浮身最上面一小截 ---------- */
const bobber=new T.Group(); scene.add(bobber);
const FLOAT_PROFILE=[[0,-.095],[.0035,-.095],[.004,-.08],[.009,-.06],[.019,-.035],[.026,-.01],[.028,.006],[.025,.022],[.017,.038],[.009,.05],[.0045,.058],[.0042,.062]];
const floatTex=(()=>{ const cv=document.createElement('canvas'); cv.width=8; cv.height=256; const g=cv.getContext('2d');
  // 由下到上：深墨綠浮腳、金色細線、黑色底漆、水線上方螢光橘
  const bands=[[0,.18,'#1d2a22'],[.18,.2,'#c9a24a'],[.2,.58,'#141414'],[.58,.6,'#e8d27a'],[.6,1,'#ff4a12']];
  bands.forEach(([a,b,c])=>{ g.fillStyle=c; g.fillRect(0,(1-b)*256,8,(b-a)*256); }); const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return t; })();
const bTopMat=new T.MeshPhysicalMaterial({map:floatTex,roughness:.32,clearcoat:1,clearcoatRoughness:.08});
const bBotMat=bTopMat;
const tipMat=new T.MeshStandardMaterial({color:0xfff080, emissive:0xffb020, emissiveIntensity:0, roughness:.25});
{ const body=new T.Mesh(new T.LatheGeometry(FLOAT_PROFILE.map(([r,y])=>new T.Vector2(r,y)),28),bTopMat); bobber.add(body);
  // 天線：一節一節的彩色刻度（橘、黃綠、橘、白），浮標在水面上下時看得出吃水
  const segs=[['#ff3b10',.03],['#d8ff2a',.025],['#ff3b10',.025],['#f4f4f0',.02],['#ff3b10',.025]]; let y=.06;
  segs.forEach(([c,h])=>{ const m=new T.Mesh(new T.CylinderGeometry(.0034,.0036,h,12),new T.MeshPhysicalMaterial({color:new T.Color(c),roughness:.3,clearcoat:1,clearcoatRoughness:.1})); m.position.y=y+h/2; bobber.add(m); y+=h; });
  const tp=new T.Mesh(new T.SphereGeometry(.0055,14,10),tipMat); tp.position.y=y+.003; bobber.add(tp);
  const ring=new T.Mesh(new T.TorusGeometry(.0045,.0012,8,16),new T.MeshStandardMaterial({color:0xb8b8b8,metalness:.9,roughness:.25})); ring.position.y=-.1; ring.rotation.y=Math.PI/2; bobber.add(ring); }
window.__FLOAT_PROFILE=FLOAT_PROFILE;
bobber.scale.setScalar(2.0);

/* ---------- 水花粒子 ---------- */
const MAXP=500, pPos=new Float32Array(MAXP*3), pLife=new Float32Array(MAXP), pSize=new Float32Array(MAXP), pVel=new Float32Array(MAXP*3), pMax=new Float32Array(MAXP);
const pgeo=new T.BufferGeometry(); pgeo.setAttribute('position',new T.BufferAttribute(pPos,3)); pgeo.setAttribute('aLife',new T.BufferAttribute(pLife,1)); pgeo.setAttribute('aSize',new T.BufferAttribute(pSize,1));
const pU={uScale:{value:800}, uCol:{value:new T.Color(1,1,1)}};
const pts3=new T.Points(pgeo,new T.ShaderMaterial({uniforms:pU, vertexShader:SH.ptsVS, fragmentShader:SH.ptsFS, transparent:true, depthWrite:false}));
pts3.frustumCulled=false; scene.add(pts3);
let pCur=0;
function splash(x,y,z,n,pw){ for(let k=0;k<n;k++){ const i=pCur; pCur=(pCur+1)%MAXP; const a=Math.random()*6.283, sp=(.25+Math.random())*pw;
  pPos[i*3]=x+Math.cos(a)*.05; pPos[i*3+1]=y+.01; pPos[i*3+2]=z+Math.sin(a)*.05;
  pVel[i*3]=Math.cos(a)*sp*.9; pVel[i*3+1]=(1.2+Math.random()*2.6)*pw; pVel[i*3+2]=Math.sin(a)*sp*.9;
  pMax[i]=.45+Math.random()*.7; pLife[i]=1; pSize[i]=.01+Math.random()*.028*Math.min(pw,1.6); } }
function updateFx(dt, light){
  for(let i=0;i<MAXP;i++){ if(pLife[i]<=0) continue; pVel[i*3+1]-=9.8*dt;
    pPos[i*3]+=pVel[i*3]*dt; pPos[i*3+1]+=pVel[i*3+1]*dt; pPos[i*3+2]+=pVel[i*3+2]*dt;
    pLife[i]-=dt/pMax[i]; if(pPos[i*3+1]<-.02&&pVel[i*3+1]<0) pLife[i]=0; if(pLife[i]<0) pLife[i]=0; }
  pgeo.attributes.position.needsUpdate=true; pgeo.attributes.aLife.needsUpdate=true;
  const k=clamp(light,.15,1); pU.uCol.value.setRGB(.85*k,.9*k,.92*k);
  pU.uScale.value=window.innerHeight*W.getPR()/(2*Math.tan(camera.fov*Math.PI/360));
  tipMat.emissiveIntensity=(1-W.info.day)*3.5;
}

/* ---------- 魚影 ---------- */
const shTex=dataTex(64,32,(u,v,o)=>{ const x=u*2-1, y=v*2-1; const wdt=.42*(1-.55*Math.max(0,-x))+.06; const d=x*x+(y/wdt)*(y/wdt);
  o[0]=o[1]=o[2]=0; o[3]=255*(1-sstep(.35,1,d)); },false);
const shadow=new T.Mesh(new T.PlaneGeometry(1,.4).rotateX(-Math.PI/2), new T.MeshBasicMaterial({map:shTex, color:0x000000, transparent:true, opacity:0, depthWrite:false}));
shadow.position.y=.012; shadow.renderOrder=2; scene.add(shadow);

/* ---------- 魚種 ---------- */
const RAR=[
 {name:'普通', en:'COMMON', col:'#b9c2c8', w:60, mult:1},
 {name:'稀有', en:'RARE', col:'#4aa3ff', w:26, mult:2.2},
 {name:'史詩', en:'EPIC', col:'#b26cff', w:10, mult:4.5},
 {name:'傳說', en:'LEGENDARY', col:'#ffb12b', w:3, mult:9},
 {name:'神話', en:'MYTHICAL', col:'#ff4f6d', w:1, mult:20},
 {name:'幻想', en:'FANTASY', col:'#5ef2ff', w:1.2, mult:15}];
const BASS_D=[[-.3,0],[-.25,.1],[-.12,.09],[-.04,.04],[.04,.09],[.16,.08],[.22,0]], BASS_A=[[-.3,0],[-.24,.08],[-.13,.06],[-.08,0]];
const SPECIES=[
 /* ---------- 月光灣專屬：通往大海的潟湖，滿月漲潮時海水魚會游進來（依玩家設定圖生成）---------- */
 {id:'clownfish',spots:['moon'],name:'公子小丑魚',sci:'Amphiprion ocellaris',rar:0,lvl:[10, 25],len:[5, 11],k:20,price:26,tide:true,water:'sea',
  sh:{H:.3,W:.07,prof:1.2,eyeT:.84,eye:.034,tail:.2,fork:.2,dorsal:[[-.3,0],[-.25,.14],[.12,.12],[.2,0]],anal:[[-.3,0],[-.25,.1],[-.1,0]]},
  col:{back:'#e86a1a',flank:'#f08a2a',belly:'#f8c070',fin:'#e86a1a',eye:'#202020'},pat:{t:'bars',n:3,k:.9,c:'#ffffff'},scale:1,metal:.3,
  f:{pow:.6,spd:.9,agi:1.3,jump:0,stam:.7,win:1.1},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'橘色魚身配三條白帶。原本住在海葵裡，滿月漲潮時被海水帶進潟湖，躲在月光灣的水草間。'},
 {id:'bluetang',spots:['moon'],name:'擬刺尾鯛',sci:'Paracanthurus hepatus',rar:1,lvl:[20, 40],len:[12, 31],k:22,price:34,tide:true,water:'sea',
  sh:{H:.3,W:.07,prof:1.2,eyeT:.84,eye:.034,tail:.2,fork:.2,dorsal:[[-.3,0],[-.25,.14],[.12,.12],[.2,0]],anal:[[-.3,0],[-.25,.1],[-.1,0]]},
  col:{back:'#1a3ad8',flank:'#2a5aff',belly:'#8aa8ff',fin:'#f0d020',eye:'#202020'},pat:{t:'band',k:.8},scale:1,metal:.3,
  f:{pow:.9,spd:1.3,agi:1.3,jump:.05,stam:1,win:1},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'寶藍色魚身、黑色花紋、黃色尾鰭。尾柄有一對像刀片的硬棘，拿的時候要小心。'},
 {id:'blenny',spots:['moon'],name:'鬚鳚',sci:'Blenniidae（鳚科）',rar:1,lvl:[18, 38],len:[12, 30],k:8,price:30,tide:true,water:'sea',
  sh:{H:.1,W:.06,prof:1.5,eyeT:.88,eye:.03,tail:.18,fork:0,dorsal:[[-.36,0],[-.33,.08],[.25,.08],[.28,0]],anal:[[-.36,0],[-.33,.06],[0,.06],[.02,0]]},
  col:{back:'#6a5a40',flank:'#c8b898',belly:'#ece4d8',fin:'#d8c8a8',eye:'#c08030'},pat:{t:'spots',n:16,d:.3,r:.3,k:.7,c:'#3a2a1a'},scale:1,metal:.3,
  f:{pow:.8,spd:.9,agi:1.4,jump:0,stam:.9,win:1.05},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'頭上長著鬚狀突起，背鰭和臀鰭又長又密。白天藏在石縫裡，月光下才出來覓食。'},
 {id:'angelfish',spots:['moon'],name:'神仙魚',sci:'Pterophyllum scalare',rar:1,lvl:[15, 35],len:[8, 18],k:30,price:28,
  sh:{H:.3,W:.07,prof:1.2,eyeT:.84,eye:.034,tail:.2,fork:.2,dorsal:[[-.3,0],[-.25,.14],[.12,.12],[.2,0]],anal:[[-.3,0],[-.25,.1],[-.1,0]]},
  col:{back:'#8a8050',flank:'#d8d8c8',belly:'#f0f0e8',fin:'#c8c8b8',eye:'#c03020'},pat:{t:'bars',n:4,k:.85,c:'#1a1a14'},scale:1,metal:.3,
  f:{pow:.6,spd:.8,agi:1.2,jump:0,stam:.7,win:1.1},time:{dawn:.8,day:.6,dusk:1.2,night:1.5},desc:'高大的三角形身體、黑色直條紋、長長的腹鰭。月光灣裡唯一土生土長的淡水觀賞魚。'},
 {id:'copperband',spots:['moon'],name:'長吻蝴蝶魚',sci:'Chelmon rostratus',rar:2,lvl:[25, 45],len:[10, 20],k:25,price:40,tide:true,water:'sea',
  sh:{H:.3,W:.07,prof:1.2,eyeT:.84,eye:.034,tail:.2,fork:.2,dorsal:[[-.3,0],[-.25,.14],[.12,.12],[.2,0]],anal:[[-.3,0],[-.25,.1],[-.1,0]]},
  col:{back:'#d8a020',flank:'#f0f0e8',belly:'#f8f4ec',fin:'#f0c020',eye:'#202020'},pat:{t:'bars',n:4,k:.8,c:'#e08020'},scale:1,metal:.3,
  f:{pow:.6,spd:.9,agi:1.4,jump:0,stam:.7,win:1.1},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'橘白相間的直條紋，背鰭上有一個假眼斑。用細長的吻部伸進石縫裡夾食物。'},
 {id:'threadfin',spots:['moon'],name:'絲鰺',sci:'Alectis ciliaris',rar:2,lvl:[35, 60],len:[40, 130],k:10,price:46,tide:true,water:'sea',
  sh:{H:.3,W:.07,prof:1.2,eyeT:.84,eye:.034,tail:.2,fork:.2,dorsal:[[-.3,0],[-.25,.14],[.12,.12],[.2,0]],anal:[[-.3,0],[-.25,.1],[-.1,0]]},
  col:{back:'#4a6a7a',flank:'#c8d4dc',belly:'#eef2f4',fin:'#3a4a5a',eye:'#202020'},pat:{t:'plain'},scale:1,metal:.3,
  f:{pow:1.6,spd:1.6,agi:1.1,jump:.2,stam:1.4,win:.9},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'銀色側扁的身體，背鰭和臀鰭拖著長長的細絲，在月光下像一面飄動的旗子。'},
 {id:'seahorse',spots:['moon'],name:'海馬',sci:'Hippocampus kuda',rar:3,lvl:[30, 60],len:[10, 30],k:6,price:0,tide:true,water:'sea',noSell:true,
  sh:{H:.14,W:.08,prof:1.4,eyeT:.86,eye:.03,tail:.1,fork:0,dorsal:[[-.1,0],[-.05,.06],[.05,0]],anal:[[-.3,0],[-.28,.02],[-.26,0]]},
  col:{back:'#a88030',flank:'#d8b050',belly:'#e8d090',fin:'#f0e8d0',eye:'#202020'},pat:{t:'spots',n:12,d:.2,r:.2,k:.6,c:'#4a3010'},scale:1,metal:.3,
  f:{pow:.3,spd:.3,agi:.6,jump:0,stam:.5,win:1.2},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'直立游動、尾巴會捲住水草。全球保育類（華盛頓公約附錄二），釣到只能拍照後放流。'},
 {id:'seabeast',spots:['moon'],name:'神話海馬獸',sci:'Hippocampus draconis（幻想）',rar:5,lvl:[90, 99],len:[180, 260],k:3,price:120,water:'sea',special:'seabeast',
  sh:{H:.08,W:.06,prof:1.6,eyeT:.9,eye:.02,tail:.24,fork:0,dorsal:[[-.3,0],[-.2,.12],[.3,.12],[.35,0]],anal:[[-.3,0],[-.25,.05],[-.1,0]]},
  col:{back:'#2a5a8a',flank:'#8ab0c8',belly:'#e8e0c8',fin:'#5a8ad8',eye:'#c09030'},pat:{t:'plain'},scale:1,metal:.3,
  f:{pow:2.6,spd:2,agi:1.6,jump:.6,stam:2.6,win:.8},time:{dawn:0,day:0,dusk:.3,night:2},desc:'頭長鹿角、身披藍金色長鰭的海中神獸。傳說只在滿月深夜，順著潮水游進月光灣。'},
 /* ---------- 最後一批（依玩家重畫的設定圖生成）---------- */
 {id:'eel',loc:'lake',spots:['wood'],name:'鱸鰻',sci:'Anguilla marmorata',rar:3,lvl:[35, 60],len:[60, 180],k:2.2,price:58,
  sh:{H:.07,W:.06,prof:1.7,eyeT:.92,eye:.016,tail:.1,fork:0,dorsal:[[-.4,0],[-.38,.04],[.1,.04],[.12,0]],anal:[[-.4,0],[-.38,.03],[-.05,.03],[-.03,0]]},
  col:{back:'#3a3018',flank:'#8a7838',belly:'#e8e0c8',fin:'#4a3a20',eye:'#c09030'},pat:{t:'mottle',k:.7},scale:1,metal:.35,
  f:{pow:2,spd:1,agi:1.3,jump:0,stam:1.8,win:1},time:{dawn:.8,day:.3,dusk:1.3,night:1.9},desc:'黃褐色大理石斑紋的巨大鰻魚，白天藏在倒木洞裡，夜裡才出來獵食。中魚後會死命往洞裡鑽。'},
 {id:'mekong',loc:'lake',spots:['deep'],name:'湄公河巨鯰',sci:'Pangasianodon gigas',rar:4,lvl:[65, 90],len:[120, 300],k:9,price:40,
  sh:{H:.15,W:.08,prof:1.4,eyeT:.9,eye:.018,tail:.2,fork:.7,dorsal:[[-.05,0],[0,.12],[.06,.1],[.1,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#3a3e42',flank:'#8a9096',belly:'#ece8e4',fin:'#6a5a5a',eye:'#2a2a2a'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:2.4,spd:1,agi:.7,jump:0,stam:2.4,win:1.1},time:{dawn:1,day:1.2,dusk:1.3,night:.8},desc:'世界最大的淡水魚之一，成魚幾乎沒有鬚、眼睛長得很低。只吃藻類和植物，卻有驚人的力氣。'},
 {id:'yperch',loc:'ice',spots:['ice'],name:'黃金鱸',sci:'Perca flavescens',rar:0,lvl:[10, 25],len:[12, 38],k:14,price:18,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#4a4a1a',flank:'#d8c040',belly:'#f0ecd8',fin:'#e86a2a',eye:'#c09030'},pat:{t:'bars',n:7,k:.7,c:'#2a2a10'},scale:1,metal:.35,
  f:{pow:.8,spd:1,agi:1.2,jump:.05,stam:.8,win:1.05},time:{dawn:1.3,day:1.2,dusk:1.2,night:.4},desc:'金黃色魚身、6～8 條黑色直條紋，魚鰭橘紅。冬天在冰下成群活動，是冰釣最常見的魚。'},
 {id:'whitefish',loc:'ice',spots:['ice'],name:'白鮭',sci:'Coregonus clupeaformis',rar:0,lvl:[12, 30],len:[25, 65],k:11,price:20,
  sh:{H:.15,W:.065,prof:1.4,eyeT:.88,eye:.026,tail:.2,fork:.4,dorsal:[[-.05,0],[0,.11],[.08,.09],[.12,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#5a5a4a',flank:'#c8ccc8',belly:'#f2f2f0',fin:'#8a8a84',eye:'#202020'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:1,spd:1.1,agi:1,jump:.1,stam:1,win:1},time:{dawn:1.1,day:1.3,dusk:1,night:.5},desc:'全身銀白沒有斑點，頭小、嘴巴小且朝下，在湖底吸食小蟲。肉質細緻，是北方湖泊的重要漁獲。'},
 {id:'laketrout',loc:'ice',spots:['ice'],name:'湖紅點鮭',sci:'Salvelinus namaycush',rar:1,lvl:[25, 55],len:[40, 110],k:9.5,price:32,
  sh:{H:.15,W:.065,prof:1.4,eyeT:.88,eye:.026,tail:.2,fork:.4,dorsal:[[-.05,0],[0,.11],[.08,.09],[.12,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#3a4030',flank:'#7a7e64',belly:'#ece8dc',fin:'#c87a3a',eye:'#c09030'},pat:{t:'spots',n:16,d:.25,r:.25,k:.6,c:'#e8dcb0'},scale:1,metal:.35,
  f:{pow:1.6,spd:1.3,agi:1,jump:.1,stam:1.6,win:.95},time:{dawn:1.4,day:.9,dusk:1.4,night:.6},desc:'灰綠色身體佈滿淡黃色斑點，尾鰭深分叉。喜歡冰冷的深水，中魚後會一直往湖底拉。'},
 {id:'taimen',loc:'ice',spots:['ice'],name:'哲羅鮭',sci:'Hucho taimen',rar:3,lvl:[55, 85],len:[70, 180],k:9,price:46,
  sh:{H:.15,W:.065,prof:1.4,eyeT:.88,eye:.026,tail:.2,fork:.4,dorsal:[[-.05,0],[0,.11],[.08,.09],[.12,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#4a4436',flank:'#9a8a78',belly:'#ece4dc',fin:'#b85a4a',eye:'#c09030'},pat:{t:'spots',n:14,d:.2,r:.2,k:.7,c:'#1a1a14'},scale:1,metal:.35,
  f:{pow:2.2,spd:1.6,agi:1.1,jump:.3,stam:2,win:.85},time:{dawn:1.2,day:.7,dusk:1.6,night:1},desc:'世界最大的鮭魚，被稱為「河中之狼」。頭部寬大、尾鰭泛紅，連水鼠和鴨子都會獵食。'},
 {id:'gt',loc:'sea',spots:['reef'],name:'浪人鰺',sci:'Caranx ignobilis',rar:3,lvl:[45, 70],len:[50, 170],k:13,price:52,
  sh:{H:.2,W:.1,prof:1.2,eyeT:.88,eye:.03,tail:.26,fork:.9,dorsal:[[-.05,0],[0,.12],[.08,.04],[.14,0]],anal:[[-.28,0],[-.24,.08],[-.18,0]]},
  col:{back:'#2a2e34',flank:'#9aa0a8',belly:'#eef0f2',fin:'#3a3e44',eye:'#c09030'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:2.4,spd:1.8,agi:1.1,jump:.05,stam:2,win:.8},time:{dawn:1.5,day:1,dusk:1.5,night:.6},desc:'頭部陡峭像斷崖，礁岩區的頂級掠食者。中魚後會全力衝進礁岩割線，是路亞釣客的終極目標。'},
 {id:'swordfish',loc:'sea',spots:['blue'],name:'劍旗魚',sci:'Xiphias gladius',rar:4,lvl:[70, 95],len:[150, 450],k:4.5,price:40,
  sh:{H:.12,W:.08,prof:1.4,eyeT:.82,eye:.024,tail:.28,fork:.95,snout:1.2,dorsal:[[.05,0],[.1,.14],[.16,.03],[.18,0]],anal:[[-.28,0],[-.24,.06],[-.18,0]]},
  col:{back:'#1a1e2e',flank:'#6a7080',belly:'#e8eaee',fin:'#2a2e3a',eye:'#202020'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:2.6,spd:2.2,agi:1,jump:.6,stam:2.4,win:.8},time:{dawn:.8,day:.5,dusk:1.3,night:1.8},desc:'又寬又扁的劍狀上顎能劈砍獵物，沒有腹鰭。白天潛到深海，夜裡才浮上來覓食。'},
 /* ---------- 冰湖、近海礁岩、遠洋深藍專屬（依玩家設定圖生成）---------- */
 {id:'char',loc:'ice',spots:['ice'],name:'北極紅點鮭',sci:'Salvelinus alpinus',rar:2,lvl:[30, 60],len:[30, 80],k:10,price:40,
  sh:{H:.15,W:.065,prof:1.4,eyeT:.88,eye:.026,tail:.2,fork:.4,dorsal:[[-.05,0],[0,.11],[.08,.09],[.12,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#2e3428',flank:'#6a6a50',belly:'#e8603a',fin:'#d85a3a',eye:'#c09030'},pat:{t:'spots',n:14,d:.25,r:.25,k:.5,c:'#e8d8c0'},scale:1,metal:.35,
  f:{pow:1.4,spd:1.5,agi:1.2,jump:.3,stam:1.3,win:.95},time:{dawn:1.4,day:.9,dusk:1.4,night:.6},desc:'背部深綠、腹部和魚鰭鮮紅，魚鰭鑲白邊。只生活在冰冷清澈的湖水裡，冬天的紅腹最漂亮。'},
 {id:'burbot',loc:'ice',spots:['ice'],name:'江鱈',sci:'Lota lota',rar:1,lvl:[20, 45],len:[30, 90],k:6,price:30,
  sh:{H:.12,W:.07,prof:1.6,eyeT:.9,eye:.022,tail:.16,fork:0,barbels:1,dorsal:[[-.36,0],[-.33,.06],[.05,.06],[.08,0]],anal:[[-.36,0],[-.33,.05],[-.02,.05],[0,0]]},
  col:{back:'#4a3e22',flank:'#8a7444',belly:'#ece2c8',fin:'#5a4a2a',eye:'#2a2010'},pat:{t:'mottle',k:.55},scale:1,metal:.35,
  f:{pow:1.2,spd:.8,agi:.8,jump:0,stam:1.4,win:1.05},time:{dawn:.8,day:.4,dusk:1.2,night:1.9},desc:'淡水裡唯一的鱈魚，下巴一根鬚、第二背鰭很長。最冷的冬夜最活躍，會在冰下產卵。'},
 {id:'porgy',loc:'sea',spots:['reef'],name:'黑鯛',sci:'Acanthopagrus schlegelii',rar:0,lvl:[18, 30],len:[20, 50],k:18,price:34,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#2a2c30',flank:'#8a8e94',belly:'#e4e6e8',fin:'#3a3c40',eye:'#c09040'},pat:{t:'bars',n:6,k:.35,c:'#2a2c30'},scale:1,metal:.35,
  f:{pow:1.3,spd:1.1,agi:1.2,jump:.05,stam:1.1,win:1},time:{dawn:1.4,day:.9,dusk:1.4,night:.8},desc:'銀黑色、體高、背鰭硬棘尖銳。在礁岩縫隙找螃蟹貝類，中魚後會往岩縫裡衝。'},
 {id:'parrot',loc:'sea',spots:['reef'],name:'鸚哥魚',sci:'Scarus ghobban',rar:0,lvl:[16, 28],len:[25, 75],k:13,price:30,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#2a8a8a',flank:'#5ac0b0',belly:'#d8e8e4',fin:'#3a7ad8',eye:'#c09040'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:1.1,spd:1.1,agi:1.2,jump:.05,stam:1,win:1.05},time:{dawn:1,day:1.4,dusk:.8,night:.15},desc:'藍綠色大鱗片、嘴巴像鳥喙，啃食珊瑚上的藻類。夜裡會吐黏液包住自己睡覺。'},
 {id:'redbream',loc:'sea',spots:['reef'],name:'真鯛',sci:'Pagrus major',rar:1,lvl:[22, 38],len:[25, 90],k:15,price:48,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#c84a4a',flank:'#e8908a',belly:'#f4e4e0',fin:'#e06060',eye:'#c08030'},pat:{t:'spots',n:16,d:.15,r:.2,k:.4,c:'#6ab0e8'},scale:1,metal:.35,
  f:{pow:1.5,spd:1.2,agi:1,jump:.05,stam:1.3,win:.95},time:{dawn:1.4,day:1,dusk:1.3,night:.6},desc:'粉紅色魚身散布藍色小點，日本稱為「魚中之王」。中魚後會分好幾段往下衝。'},
 {id:'emperor',loc:'sea',spots:['reef'],name:'青嘴龍占',sci:'Lethrinus nebulosus',rar:1,lvl:[22, 36],len:[30, 86],k:14,price:44,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#3a6a6a',flank:'#a8b890',belly:'#e8ecdc',fin:'#d8c040',eye:'#c08030'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:1.5,spd:1.4,agi:1.1,jump:.05,stam:1.3,win:.95},time:{dawn:1,day:.8,dusk:1.4,night:1.3},desc:'嘴唇和臉頰泛藍色，魚鰭帶黃色。夜裡離開礁岩到沙地覓食，拉力強勁。'},
 {id:'hardclam',loc:'tide',name:'文蛤',sci:'Meretrix lusoria',rar:1,lvl:[1,10],len:[4, 9],k:600,price:90,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#d9c7a6',flank:'#c8b08a',belly:'#efe4d0',fin:'#a08060',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'台灣潮間帶最有名的貝類，殼上的鋸齒紋每顆都不一樣。泥面上會噴水的小圓孔底下就是牠。'},
 {id:'gomphina',loc:'tide',name:'赤嘴蛤',sci:'Gomphina aequilatera',rar:2,lvl:[1,10],len:[3, 6],k:650,price:110,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#d8d2c8',flank:'#b08a80',belly:'#efe8e0',fin:'#8a5a60',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'殼緣帶一圈紅紫色。牠的入水管和出水管在泥面留下鑰匙孔一樣的兩個小洞。'},
 {id:'tellin',loc:'tide',name:'海瓜子',sci:'Moerella iridescens',rar:1,lvl:[1,10],len:[1.5, 3],k:300,price:60,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#f0b8a0',flank:'#e8a890',belly:'#f8e0d0',fin:'#d08070',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'殼又薄又透、帶著虹彩，像瓜子一樣小。挖的時候要非常輕，不然一下就碎。'},
 {id:'razor',loc:'tide',name:'竹蟶',sci:'Solen strictus',rar:2,lvl:[1,10],len:[7, 13],k:120,price:140,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#c8a060',flank:'#b89050',belly:'#e8d8b0',fin:'#a07840',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'直直地埋在泥裡，一受驚就往深處縮。泥面上細長的凹痕是牠的位置。'},
 {id:'ghostcrab',loc:'tide',name:'沙蟹',sci:'Ocypode ceratophthalmus',rar:2,lvl:[1,10],len:[4, 7],k:150,price:70,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#d8c8a0',flank:'#c8b890',belly:'#efe6d0',fin:'#b0a080',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1.3,day:.7,dusk:1.3,night:1.5},desc:'眼睛上長著小角，跑得非常快。洞口有一堆新沙的就是牠家，挖太慢會從另一頭溜走。'},
 {id:'ragworm',loc:'tide',name:'沙蠶',sci:'Perinereis aibuhitensis',rar:1,lvl:[1,10],len:[10, 20],k:8,price:20,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#a05040',flank:'#806040',belly:'#c08060',fin:'#c09070',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'身上有虹彩光澤的多毛類。泥面上盤繞的泥條是牠的排遺，是很好的魚餌。'},
 {id:'fiddler',loc:'tide',name:'招潮蟹',sci:'Uca arcuata',rar:1,lvl:[1,10],len:[2, 4],k:300,price:40,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#305060',flank:'#d05030',belly:'#e0c0a0',fin:'#c06040',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'雄蟹有一隻特別大的橘紅色螯，退潮時會在洞口揮舞。'},
 {id:'mudskip',loc:'tide',name:'彈塗魚',sci:'Periophthalmus modestus',rar:1,lvl:[1,10],len:[6, 12],k:10,price:55,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#706048',flank:'#a09070',belly:'#d8ccb0',fin:'#806850',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'會離開水在泥灘上爬跳的魚，大眼睛長在頭頂。'},
 {id:'hermit',loc:'tide',name:'寄居蟹',sci:'Coenobita rugosus',rar:1,lvl:[1,10],len:[2, 5],k:400,price:35,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#c8b090',flank:'#d06030',belly:'#e8c8a0',fin:'#c05030',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'背著撿來的螺殼過日子，長大了就換一個更大的殼。'},
 {id:'cobia',loc:'sea',spots:['reef'],name:'海鱺',sci:'Rachycentron canadum',rar:2,lvl:[32, 50],len:[60, 180],k:6.5,price:44,
  sh:{H:.13,W:.08,prof:1.5,eyeT:.88,eye:.024,tail:.22,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#3a2a1a',flank:'#7a6448',belly:'#ece6dc',fin:'#3a2e22',eye:'#a08030'},pat:{t:'band',k:.7},scale:1,metal:.35,
  f:{pow:1.9,spd:1.5,agi:1,jump:.15,stam:1.7,win:.9},time:{dawn:1,day:1.3,dusk:1.1,night:.6},desc:'深褐色細長身體、頭部扁平像鯊魚，身側一條白色縱帶。常跟著大魚或漂流物游動。'},
 {id:'barracuda',loc:'sea',spots:['reef'],name:'巴拉金梭魚',sci:'Sphyraena barracuda',rar:2,lvl:[34, 55],len:[80, 180],k:5.5,price:52,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#3e5250',flank:'#b9c4c4',belly:'#eef2f2',fin:'#5a6464',eye:'#c8a040'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.0,spd:2.4,agi:1.6,jump:.35,stam:1.6,win:.85},time:{dawn:1.1,day:1.2,dusk:1.3,night:.6},desc:'銀色魚雷般的身體，下顎突出、滿口尖牙。爆發力驚人，咬餌後會猛然衝刺。'},
 {id:'grouper2',loc:'sea',spots:['reef'],name:'龍膽石斑',sci:'Epinephelus lanceolatus',rar:4,lvl:[55, 80],len:[100, 270],k:16,price:70,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#5a4e38',flank:'#a89a74',belly:'#d8ceb0',fin:'#b08a30',eye:'#806020'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:3.0,spd:1.1,agi:.8,jump:0,stam:2.8,win:.8},time:{dawn:1,day:.8,dusk:1.1,night:1.4},desc:'礁岩深處的巨無霸，大嘴一張能吞下整條魚。上鉤後會死命往洞裡鑽，力氣大得嚇人。'},
 {id:'bigeye',loc:'sea',spots:['blue'],name:'大眼鮪',sci:'Thunnus obesus',rar:3,lvl:[48, 72],len:[100, 230],k:17,price:66,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#1a2a5a',flank:'#8090b0',belly:'#eef0f4',fin:'#d0b030',eye:'#202020'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.6,spd:2.6,agi:1.2,jump:.1,stam:2.6,win:.8},time:{dawn:1.3,day:.8,dusk:1.4,night:1.1},desc:'眼睛特別大的鮪魚，習慣在深一點的水層覓食。耐力極強，拉扯常常持續很久。'},
 {id:'stingray',loc:'sea',spots:['reef'],name:'赤魟',sci:'Hemitrygon akajei',rar:2,lvl:[30, 50],len:[60, 200],k:3.2,price:30,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#a04a28',flank:'#c06a40',belly:'#f0e4d8',fin:'#a04a28',eye:'#d0a040'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.2,spd:.9,agi:.7,jump:0,stam:2.2,win:.9},time:{dawn:1,day:.9,dusk:1.2,night:1.3},desc:'紅褐色的扁平身體貼著海底，尾巴上有帶倒鉤的毒棘。上鉤後會整片吸在沙地上不肯起來。'},
 {id:'amberjack',loc:'sea',spots:['reef','blue'],name:'青甘鰺',sci:'Seriola lalandi',rar:2,lvl:[40, 62],len:[80, 180],k:9,price:58,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#2a4a6a',flank:'#c0ccd4',belly:'#eef2f4',fin:'#e0c030',eye:'#d0a020'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.4,spd:2.1,agi:1.3,jump:.1,stam:2.3,win:.85},time:{dawn:1.3,day:1,dusk:1.3,night:.6},desc:'身側一條黃線、尾鰭鮮黃。成群在礁岩外圍巡游，衝刺力道是海釣客最愛的挑戰。'},
 {id:'knifejaw',loc:'sea',spots:['reef'],name:'石鯛',sci:'Oplegnathus fasciatus',rar:1,lvl:[25, 45],len:[40, 80],k:18,price:48,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#303030',flank:'#d8d8d4',belly:'#eeeeea',fin:'#404040',eye:'#c09040'},pat:{t:'band',k:.9},scale:1,metal:.3,
  f:{pow:1.8,spd:1.2,agi:1.5,jump:0,stam:1.6,win:.95},time:{dawn:1.2,day:1.1,dusk:1,night:.5},desc:'身上七條黑色橫紋，嘴像鸚鵡喙一樣能咬碎貝殼。被稱為磯釣之王，警覺又難纏。'},
 {id:'halibut',loc:'sea',spots:['blue'],name:'大比目魚',sci:'Hippoglossus stenolepis',rar:3,lvl:[45, 70],len:[50, 200],k:6,price:60,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#4a4430',flank:'#7a6e50',belly:'#f4f2ee',fin:'#6a5e40',eye:'#a08040'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.4,spd:.9,agi:.9,jump:0,stam:2.4,win:.85},time:{dawn:1.1,day:1,dusk:1.1,night:1},desc:'兩隻眼睛長在同一邊，平時貼在海底等獵物經過。大尾的像一扇門板那麼大。'},
 {id:'sunfish',loc:'sea',spots:['blue'],name:'翻車魚',sci:'Mola mola',rar:4,lvl:[60, 85],len:[150, 330],k:28,price:40,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#5a6068',flank:'#a0a8b0',belly:'#e8eaec',fin:'#5a6068',eye:'#303030'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.2,spd:.6,agi:.5,jump:0,stam:3.2,win:.9},time:{dawn:.8,day:1.4,dusk:.8,night:.3},desc:'世界上最重的硬骨魚，身體像被切掉一半的大圓盤。晴天會躺在海面曬太陽，罕見又溫和。'},
 {id:'wrasse',loc:'sea',spots:['reef'],name:'曲紋唇魚',sci:'Cheilinus undulatus',rar:3,lvl:[40, 70],len:[60, 200],k:12,price:0,noSell:true,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#2a6a5a',flank:'#5a9a7a',belly:'#d0e0d4',fin:'#2a5aa0',eye:'#c08030'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:2,spd:1,agi:.9,jump:0,stam:1.9,win:1},time:{dawn:.9,day:1.4,dusk:.9,night:.2},desc:'俗稱蘇眉，頭上有隆起、嘴唇厚。全球保育類（華盛頓公約附錄二），釣到只能拍照後放流。'},
 {id:'skipjack',loc:'sea',spots:['blue'],name:'正鰹',sci:'Katsuwonus pelamis',rar:0,lvl:[25, 40],len:[40, 100],k:16,price:30,
  sh:{H:.2,W:.1,prof:1.2,eyeT:.88,eye:.03,tail:.26,fork:.95,dorsal:[[-.05,0],[0,.12],[.08,.04],[.14,0]],anal:[[-.28,0],[-.24,.08],[-.18,0]]},
  col:{back:'#1a2a4a',flank:'#a8b4c4',belly:'#eef0f2',fin:'#2a3a50',eye:'#202020'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:1.4,spd:1.8,agi:1.1,jump:.1,stam:1.2,win:.95},time:{dawn:1.4,day:1.2,dusk:1,night:.4},desc:'紡錘形身體、腹部有 4～6 條深色縱紋。成群高速洄游，是柴魚的原料。'},
 {id:'sawara',loc:'sea',spots:['blue'],name:'土魠',sci:'Scomberomorus commerson',rar:1,lvl:[30, 50],len:[60, 200],k:4.5,price:46,
  sh:{H:.2,W:.1,prof:1.2,eyeT:.88,eye:.03,tail:.26,fork:.95,dorsal:[[-.05,0],[0,.12],[.08,.04],[.14,0]],anal:[[-.28,0],[-.24,.08],[-.18,0]]},
  col:{back:'#1e2e4a',flank:'#b4bcc8',belly:'#eef0f4',fin:'#2a3448',eye:'#202020'},pat:{t:'bars',n:14,k:.3,c:'#3a4a68'},scale:1,metal:.35,
  f:{pow:1.5,spd:1.9,agi:1.2,jump:.2,stam:1.2,win:.9},time:{dawn:1.4,day:1,dusk:1.3,night:.5},desc:'細長銀色身體、身側波浪狀直紋，牙齒銳利能咬斷釣線。台灣冬季的人氣魚。'},
 {id:'yellowfin',loc:'sea',spots:['blue'],name:'黃鰭鮪',sci:'Thunnus albacares',rar:3,lvl:[50, 70],len:[80, 200],k:18,price:50,
  sh:{H:.2,W:.1,prof:1.2,eyeT:.88,eye:.03,tail:.26,fork:.95,dorsal:[[-.05,0],[0,.12],[.08,.04],[.14,0]],anal:[[-.28,0],[-.24,.08],[-.18,0]]},
  col:{back:'#14204a',flank:'#b0b8c8',belly:'#f0f2f4',fin:'#e8c020',eye:'#202020'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:2,spd:2,agi:1,jump:.1,stam:2,win:.85},time:{dawn:1.4,day:1.3,dusk:1,night:.5},desc:'第二背鰭和臀鰭又長又黃，身側一條金黃縱帶。速度驚人，一口氣能拉走上百公尺的線。'},
 /* ---------- 倒木區、木碼頭、深水中央專屬（依玩家設定圖生成）---------- */
 {id:'clarias',spots:['wood'],name:'塘蝨',sci:'Clarias batrachus',rar:0,lvl:[3,14],len:[20,50],k:8,price:26,
  sh:{H:.12,W:.07,prof:1.6,eyeT:.9,eye:.02,tail:.16,fork:0,barbels:1,dorsal:[[-.36,0],[-.34,.06],[.22,.06],[.24,0]],anal:[[-.36,0],[-.34,.05],[0,.05],[.02,0]]},
  col:{back:'#4a3e28',flank:'#7e6a48',belly:'#e8dcc4',fin:'#5a4a34',eye:'#2a2010'},pat:{t:'mottle',k:.5},scale:.5,metal:.1,
  f:{pow:1.2,spd:.9,agi:.9,jump:0,stam:1.3,win:1.05},time:{dawn:.9,day:.5,dusk:1.3,night:1.7},desc:'4 對長鬚、鰻魚般的身體，能在泥裡呼吸空氣。夜裡在倒木間覓食，中魚後一直往障礙物裡鑽。'},
 {id:'spgar',spots:['wood'],name:'斑點雀鱔',sci:'Lepisosteus oculatus',rar:1,lvl:[12,28],len:[40,100],k:3.2,price:40,
  sh:{H:.09,W:.06,prof:1.7,eyeT:.82,eye:.022,tail:.16,fork:0,snout:1,dorsal:[[-.3,0],[-.27,.06],[-.18,0]],anal:[[-.3,0],[-.27,.05],[-.2,0]]},
  col:{back:'#4a4a2a',flank:'#8a8452',belly:'#ece6d0',fin:'#9a8e5a',eye:'#c09030'},pat:{t:'spots',n:9,d:.4,r:.3,k:.8,c:'#1e1a10'},scale:.9,metal:.2,
  f:{pow:1.3,spd:1.4,agi:.9,jump:.2,stam:1.1,win:.95},time:{dawn:1,day:1.2,dusk:1.3,night:.6},desc:'細長尖嘴佈滿利齒，全身和魚鰭都是黑色斑點。常靜靜浮在倒木邊，突然衝刺咬住小魚。'},
 {id:'carp',spots:['dock'],name:'鯉魚',sci:'Cyprinus carpio',rar:0,lvl:[3,16],len:[25,80],k:14,price:30,
  sh:{H:.19,W:.075,prof:1.3,eyeT:.87,barbels:1,eye:.03,tail:.22,fork:.6,dorsal:[[-.05,0],[0,.12],[.1,.1],[.16,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#5a4a24',flank:'#b8963e',belly:'#ece0c4',fin:'#a8643a',eye:'#c8a040'},pat:{t:'plain'},scale:1.3,metal:.3,
  f:{pow:1.5,spd:1.1,agi:.9,jump:.05,stam:1.4,win:1.1},time:{dawn:1.4,day:.8,dusk:1.4,night:1},desc:'金褐色大鱗片、嘴邊兩對鬚。在碼頭下的泥底翻找食物，大鯉魚一跑就是好幾十公尺。'},
 {id:'silvercarp',spots:['deep'],name:'鰱魚',sci:'Hypophthalmichthys molitrix',rar:0,lvl:[6,20],len:[35,90],k:11,price:22,
  sh:{H:.19,W:.075,prof:1.3,eyeT:.87,eye:.03,tail:.22,fork:.6,dorsal:[[-.05,0],[0,.12],[.1,.1],[.16,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#5a6264',flank:'#c8ccc8',belly:'#f0f0ec',fin:'#7a7e80',eye:'#d0c080'},pat:{t:'plain'},scale:.6,metal:.5,
  f:{pow:1.2,spd:1.4,agi:1.1,jump:.9,stam:1,win:1},time:{dawn:1,day:1.3,dusk:1,night:.5},desc:'銀白色、眼睛長得特別低。受到驚嚇會成群跳出水面，中魚後也常常高高躍起。'},
 {id:'grasscarp',spots:['deep'],name:'草魚',sci:'Ctenopharyngodon idella',rar:1,lvl:[12,30],len:[40,110],k:10,price:34,
  sh:{H:.19,W:.075,prof:1.3,eyeT:.87,eye:.03,tail:.22,fork:.6,dorsal:[[-.05,0],[0,.12],[.1,.1],[.16,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#4a4a30',flank:'#a4a07a',belly:'#ece8d8',fin:'#6a6a54',eye:'#c8b060'},pat:{t:'plain'},scale:1.2,metal:.3,
  f:{pow:1.5,spd:1.3,agi:.9,jump:.1,stam:1.4,win:1},time:{dawn:1,day:1.3,dusk:1.2,night:.6},desc:'茶綠色圓筒身、大鱗片，專吃水草。體型大、耐力好，拉扯起來很有份量。'},
 {id:'blackcarp',spots:['deep'],name:'青魚',sci:'Mylopharyngodon piceus',rar:2,lvl:[22,45],len:[50,140],k:10.5,price:40,
  sh:{H:.19,W:.075,prof:1.3,eyeT:.87,eye:.03,tail:.22,fork:.6,dorsal:[[-.05,0],[0,.12],[.1,.1],[.16,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#1e2224',flank:'#3e4448',belly:'#c8cccc',fin:'#1a1c1e',eye:'#a09060'},pat:{t:'plain'},scale:1.2,metal:.25,
  f:{pow:1.9,spd:1.1,agi:.8,jump:.05,stam:1.7,win:1.15},time:{dawn:.9,day:.6,dusk:1.4,night:1.5},desc:'外型像草魚但全身青黑，用喉嚨的硬齒壓碎螺貝。是深水區裡力氣最大的鯉科魚。'},
 {id:'arapaima',spots:['deep'],name:'巨骨舌魚',sci:'Arapaima gigas',rar:4,lvl:[55,80],len:[120,280],k:6,price:42,
  sh:{H:.13,W:.07,prof:1.5,eyeT:.88,eye:.018,tail:.14,fork:0,dorsal:[[-.36,0],[-.33,.08],[-.15,.08],[-.12,0]],anal:[[-.36,0],[-.33,.08],[-.15,.07],[-.12,0]]},
  col:{back:'#3a4038',flank:'#7a7e6c',belly:'#e4e0d4',fin:'#8a2a20',eye:'#c0a040'},pat:{t:'plain'},scale:1.2,metal:.3,
  f:{pow:2.2,spd:1.3,agi:.8,jump:.7,stam:2,win:.85},time:{dawn:1,day:1.2,dusk:1.3,night:.7},desc:'世界最大的淡水魚之一，後半身鱗片鑲紅邊。要浮上水面換氣，中魚後會整條躍出水面甩頭。'},
 /* ---------- 浮萍灣專屬（依玩家設定圖以 Hunyuan3D-2mv 生成）---------- */
 {id:'crucian',spots:['lily'],name:'鯽魚',sci:'Carassius auratus',rar:0,lvl:[1,10],len:[10,35],k:18,price:24,
  sh:{H:.2,W:.07,prof:1.3,eyeT:.86,eye:.03,tail:.22,fork:.5,dorsal:[[-.28,0],[-.2,.1],[.1,.08],[.18,0]],anal:[[-.3,0],[-.25,.06],[-.18,0]]},
  col:{back:'#4a4a36',flank:'#a8a48a',belly:'#e8e4d8',fin:'#6e6a58',eye:'#c8a040'},pat:{t:'plain'},scale:1.1,metal:.35,
  f:{pow:.8,spd:1.1,agi:1.2,jump:.05,stam:.8,win:1.05},time:{dawn:1.3,day:1,dusk:1.3,night:.6},desc:'銀灰色、體高側扁，沒有嘴鬚。水草邊成群覓食，是浮萍灣最常見的魚。'},
 {id:'tilapia',spots:['lily'],name:'吳郭魚',sci:'Oreochromis niloticus',rar:0,lvl:[2,12],len:[15,45],k:15,price:26,
  sh:{H:.2,W:.07,prof:1.25,eyeT:.86,eye:.032,tail:.2,fork:.1,dorsal:[[-.3,0],[-.25,.1],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#3e4436',flank:'#8e927c',belly:'#ddd8c8',fin:'#7a5a58',eye:'#b04020'},pat:{t:'bars',n:8,k:.25,c:'#2e3428'},scale:.9,metal:.2,
  f:{pow:1,spd:1.1,agi:1.2,jump:.1,stam:1,win:1},time:{dawn:1,day:1.3,dusk:1,night:.5},desc:'灰黑魚身帶淡淡直條紋、尾鰭紅邊。適應力超強，白天在淺水草區很活躍。'},
 {id:'snakehead',spots:['lily'],name:'線鱧',sci:'Channa striata',rar:2,lvl:[16,32],len:[30,90],k:7,price:46,
  sh:{H:.12,W:.07,prof:1.6,eyeT:.9,eye:.026,tail:.18,fork:0,dorsal:[[-.36,0],[-.34,.07],[.28,.07],[.3,0]],anal:[[-.36,0],[-.34,.05],[0,.05],[.02,0]]},
  col:{back:'#2e2a22',flank:'#6e6450',belly:'#e6e0d4',fin:'#3a342a',eye:'#c09030'},pat:{t:'band',k:.6},scale:.8,metal:.15,
  f:{pow:1.6,spd:1.2,agi:1.1,jump:.15,stam:1.4,win:.9},time:{dawn:1.1,day:.6,dusk:1.5,night:1.4},desc:'圓筒身、蛇一般的頭，身側一條深色縱帶。中魚後會拚命往水草堆裡鑽。'},
 {id:'peacock',spots:['lily'],name:'孔雀鱸',sci:'Cichla ocellaris',rar:3,lvl:[24,40],len:[30,75],k:13,price:62,
  sh:{H:.18,W:.075,prof:1.3,eyeT:.86,eye:.034,tail:.22,fork:.1,dorsal:[[-.3,0],[-.25,.11],[-.05,.08],[.2,.1],[.24,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#4a5a20',flank:'#d8c040',belly:'#f0ead0',fin:'#c85030',eye:'#c04020'},pat:{t:'bars',n:3,k:.8,c:'#1a1a14'},scale:.9,metal:.25,
  f:{pow:1.7,spd:1.6,agi:1.5,jump:.5,stam:1.3,win:.85},time:{dawn:1.2,day:1.4,dusk:1,night:.3},desc:'黃綠色魚身、三條黑色橫帶，尾鰭有眼斑。攻擊路亞極為兇猛，中魚後爆發力驚人。'},
 {id:'bluegill',ice:true,name:'藍鰓太陽魚',sci:'Lepomis macrochirus',rar:0,lvl:[1,9],len:[12,28],k:32,price:30,
  sh:{H:.23,W:.065,prof:1.25,eyeT:.86,eye:.034,tail:.2,fork:.3,dorsal:[[-.32,0],[-.26,.1],[-.12,.11],[0,.09],[.14,.08],[.2,0]],anal:[[-.32,0],[-.25,.08],[-.12,.07],[-.05,0]]},
  col:{back:'#2c3d36',flank:'#6f7d4a',belly:'#dc9a3c',fin:'#3a4a3e',eye:'#3a2a14'},pat:{t:'bars',n:7,k:.45,c:'#26332a'},op:true,scale:.55,metal:.18,
  f:{pow:.9,spd:1.3,agi:1.6,jump:.15,stam:.8,win:1.0},time:{dawn:1.2,day:1.3,dusk:1,night:.4},desc:'鰓蓋後方有一塊深藍黑斑，咬餌積極，是濕地最常見的訪客。'},
 {id:'crappie',ice:true,name:'黑斑刺蓋太陽魚',sci:'Pomoxis nigromaculatus',rar:0,lvl:[3,12],len:[15,35],k:22,price:32,
  sh:{H:.2,W:.055,prof:1.3,eyeT:.86,eye:.034,tail:.2,fork:.35,dorsal:[[-.3,0],[-.24,.12],[-.08,.12],[.05,.05],[.1,0]],anal:[[-.3,0],[-.24,.11],[-.06,.08],[0,0]]},
  col:{back:'#36463c',flank:'#b4bea6',belly:'#e9ebe0',fin:'#48524a',eye:'#2a2a20'},pat:{t:'spots',n:10,d:.45,r:.38,k:.85,c:'#1a211b'},scale:.5,metal:.32,
  f:{pow:.8,spd:1.2,agi:1.2,jump:.1,stam:.8,win:1.0},time:{dawn:1.3,day:.8,dusk:1.4,night:1},desc:'銀綠色身體佈滿黑色斑點，喜歡在倒木和水草邊成群活動。'},
 {id:'reba',name:'印度鯪',sci:'Cirrhinus reba',rar:0,lvl:[4,14],len:[20,45],k:13,price:28,
  sh:{H:.14,W:.06,prof:1.4,eyeT:.88,eye:.028,tail:.24,fork:.85,dorsal:[[-.05,0],[0,.13],[.06,.12],[.14,.02],[.16,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#38485a',flank:'#a9b8c6',belly:'#eef2f4',fin:'#8a97a4',eye:'#c8b070'},pat:{t:'plain'},scale:1.0,metal:.55,
  f:{pow:1.1,spd:1.5,agi:1,jump:.2,stam:1,win:1.1},time:{dawn:1,day:1.1,dusk:1,night:.8},desc:'銀藍色鱗片在光下閃亮，力氣比外表看起來大。'},
 {id:'perch',name:'鱖魚',sci:'Siniperca chuatsi',rar:1,lvl:[10,22],len:[25,55],k:17,price:45,
  sh:{H:.16,W:.065,prof:1.35,eyeT:.86,eye:.03,tail:.18,fork:0,dorsal:[[-.35,0],[-.3,.08],[-.15,.07],[-.05,.09],[.1,.08],[.22,.06],[.27,0]],anal:[[-.33,0],[-.27,.07],[-.15,.06],[-.1,0]]},
  col:{back:'#43361c',flank:'#b1894a',belly:'#ecd9a8',fin:'#6a5430',eye:'#b08a3a'},pat:{t:'blotch',k:.75,c:'#2a1d0e'},scale:.3,metal:.1,
  f:{pow:1.3,spd:1.5,agi:1.4,jump:.25,stam:1.1,win:.9},time:{dawn:1,day:.6,dusk:1.5,night:1.6},desc:'又稱桂魚，背鰭硬棘尖銳，傍晚和夜裡最愛伏擊小魚。'},
 {id:'lmbass',name:'大口黑鱸',sci:'Micropterus salmoides',rar:1,lvl:[12,26],len:[25,62],k:15,price:50,
  sh:{H:.15,W:.068,prof:1.35,eyeT:.86,eye:.03,tail:.2,fork:.35,dorsal:BASS_D,anal:BASS_A},
  col:{back:'#28401f',flank:'#899a5c',belly:'#e6e2c2',fin:'#4c573a',eye:'#9a6a20'},pat:{t:'band',k:.8,c:'#1b2716'},scale:.65,metal:.15,
  f:{pow:1.5,spd:1.6,agi:1.6,jump:.9,stam:1.1,win:.85},time:{dawn:1.5,day:.8,dusk:1.5,night:.7},desc:'側線上一條深色斷續縱帶，中魚後常跳出水面甩頭。'},
 {id:'channel',name:'斑點叉尾鮰',sci:'Ictalurus punctatus',rar:2,lvl:[18,32],len:[40,95],k:9,price:40,
  sh:{H:.11,W:.085,prof:1.55,flat:.55,barbels:true,eyeT:.9,eye:.022,tail:.22,fork:.8,dorsal:[[.05,0],[.09,.11],[.15,.08],[.18,0]],anal:[[-.36,0],[-.3,.06],[-.08,.05],[-.04,0]]},
  col:{back:'#374451',flank:'#9aa4ad',belly:'#eceeef',fin:'#4e5862',eye:'#1a1a1a'},pat:{t:'spots',n:14,d:.35,r:.3,k:.9,c:'#161a1e'},scale:0,metal:.25,
  f:{pow:1.8,spd:1.5,agi:.9,jump:.05,stam:1.4,win:1.2},time:{dawn:.9,day:.5,dusk:1.4,night:1.8},desc:'無鱗、叉尾、四對觸鬚，夜裡靠嗅覺覓食，拉力沉穩。'},
 {id:'bowfin',name:'弓鰭魚',sci:'Amia calva',rar:2,lvl:[20,34],len:[40,80],k:10,price:55,
  sh:{H:.12,W:.075,prof:1.5,eyeT:.88,eye:.024,tail:.18,fork:0,dorsal:[[-.32,0],[-.3,.07],[.1,.07],[.18,.05],[.2,0]],anal:[[-.33,0],[-.28,.05],[-.2,0]]},
  col:{back:'#384024',flank:'#6c7246',belly:'#d8d3a6',fin:'#3e4a2a',eye:'#8a6a20'},pat:{t:'mottle',k:.7,c:'#252b17'},oc:true,scale:.2,metal:.1,
  f:{pow:2.0,spd:1.6,agi:1.2,jump:.4,stam:1.4,win:.9},time:{dawn:1.2,day:.7,dusk:1.3,night:1.2},desc:'活化石級的古老魚種，尾柄上有一顆黑底橘圈的眼斑。'},
 {id:'smbass',name:'小口黑鱸',sci:'Micropterus dolomieu',rar:3,lvl:[15,30],len:[30,60],k:15,price:60,
  sh:{H:.145,W:.066,prof:1.35,eyeT:.86,eye:.03,tail:.2,fork:.35,dorsal:BASS_D,anal:BASS_A},
  col:{back:'#573a1a',flank:'#c27a34',belly:'#f0d6a4',fin:'#7a4a22',eye:'#b0201a'},pat:{t:'bars',n:9,k:.55,c:'#3e2410'},scale:.65,metal:.2,
  f:{pow:1.9,spd:1.9,agi:1.8,jump:1.0,stam:1.3,win:.8},time:{dawn:1.4,day:1,dusk:1.3,night:.6},desc:'紅眼、古銅色身體配深色橫紋，同體型裡最會打架的魚。'},
 {id:'flathead',name:'扁頭鯰',sci:'Pylodictis olivaris',rar:4,lvl:[40,50],len:[70,140],k:10,price:45,
  sh:{H:.1,W:.09,prof:1.6,flat:1.0,barbels:true,eyeT:.92,eye:.018,tail:.2,fork:.1,dorsal:[[0,0],[.04,.08],[.1,.06],[.12,0]],anal:[[-.35,0],[-.3,.06],[-.12,.05],[-.08,0]]},
  col:{back:'#5a4826',flank:'#b08856',belly:'#ead6b4',fin:'#5a4628',eye:'#1a1a1a'},pat:{t:'mottle',k:.7,c:'#3a2912'},scale:0,metal:.08,
  f:{pow:2.4,spd:1.4,agi:.8,jump:0,stam:1.7,win:1.2},time:{dawn:.6,day:.3,dusk:1.2,night:2.2},desc:'下顎突出的扁平大頭，只吃活餌，深夜才離開倒木洞穴。'},
 {id:'gar',name:'鱷雀鱔',sci:'Atractosteus spatula',rar:4,lvl:[45,55],len:[100,220],k:4.5,price:40,
  sh:{H:.065,W:.055,prof:1.2,snout:1,eyeT:.8,eye:.02,tail:.14,fork:0,dorsal:[[-.36,0],[-.33,.06],[-.27,.05],[-.25,0]],anal:[[-.36,0],[-.33,.06],[-.27,.05],[-.25,0]]},
  col:{back:'#48482e',flank:'#9e9874',belly:'#e0dac2',fin:'#5c5838',eye:'#c0a040'},pat:{t:'spots',n:16,d:.3,r:.3,k:.7,c:'#26261a'},scale:.9,metal:.1,
  f:{pow:2.6,spd:1.6,agi:.7,jump:.3,stam:1.8,win:1.0},time:{dawn:1,day:1,dusk:1,night:1},desc:'長吻滿口利牙、全身菱形硬鱗，沼澤裡體型最大的掠食者。'},
 {id:'barra',name:'金目鱸',sci:'Lates calcarifer',rar:1,lvl:[14,28],len:[40,100],k:12,price:48,
  sh:{H:.15,W:.068,prof:1.35,eyeT:.86,eye:.03,tail:.2,fork:.1,dorsal:BASS_D,anal:BASS_A},
  col:{back:'#4a5240',flank:'#a8aca0',belly:'#e4e4dc',fin:'#3a3a34',eye:'#c8a040'},pat:{t:'plain'},scale:.8,metal:.3,
  f:{pow:1.6,spd:1.7,agi:1.4,jump:.8,stam:1.2,win:.9},time:{dawn:1.3,day:.9,dusk:1.4,night:1},desc:'台灣常見的金目鱸，野生個體力氣大、愛跳，眼睛在光下會反射金光。'},
 {id:'golden',name:'黃金錦鯉',sci:'Cyprinus aurum（傳說）',rar:5,lvl:[60,70],len:[45,80],k:14,price:60,special:'golden',
  sh:{H:.15,W:.075,prof:1.4,eyeT:.88,eye:.03,tail:.24,fork:.5,dorsal:[[-.25,0],[-.2,.1],[.1,.09],[.2,0]],anal:[[-.32,0],[-.27,.06],[-.2,0]]},
  col:{back:'#c88a10',flank:'#f2c03a',belly:'#fff0b0',fin:'#f0b030',eye:'#2a1a08'},pat:{t:'plain'},scale:1.4,metal:1,
  f:{pow:1.6,spd:1.4,agi:1.2,jump:.4,stam:1.3,win:1.2},time:{dawn:1,day:1.4,dusk:.8,night:0},desc:'傳說只在晴朗白天現身的金色錦鯉，鱗片像打磨過的金箔。'},
 {id:'seaking',loc:'sea',name:'滄淵',sci:'Rex abyssi（傳說）',rar:5,lvl:[99,99],len:[300,320],k:9,price:90,special:'king',
  sh:{H:.15,W:.075,prof:1.4,eyeT:.88,eye:.03,tail:.24,fork:.5,dorsal:[[-.25,0],[-.2,.1],[.1,.09],[.2,0]],anal:[[-.32,0],[-.27,.06],[-.2,0]]},
  col:{back:'#1c3c5c',flank:'#2f6f9a',belly:'#b8c8d0',fin:'#4a8ab0',eye:'#7fe8ff'},pat:{t:'plain'},scale:1.4,metal:.6,
  f:{pow:3.6,spd:2.0,agi:1.2,jump:.2,stam:3.4,win:1.0},time:{dawn:0,day:0,dusk:.5,night:1.5},desc:'統御深海的古老王者，手持三叉戟、頭戴珊瑚王冠。傳說只在無月的深夜，從遠洋深處浮上來。'},
 {id:'moonkoi',name:'月神鯉',sci:'Cyprinus selene（傳說）',rar:5,lvl:[90,99],len:[90,130],k:14,price:110,special:'moonkoi',
  sh:{H:.15,W:.075,prof:1.4,eyeT:.88,eye:.03,tail:.24,fork:.5,dorsal:[[-.25,0],[-.2,.1],[.1,.09],[.2,0]],anal:[[-.32,0],[-.27,.06],[-.2,0]]},
  col:{back:'#9fc4ea',flank:'#dcecff',belly:'#ffffff',fin:'#b8d8ff',eye:'#203050'},pat:{t:'plain'},scale:1.4,metal:1,
  f:{pow:3.0,spd:1.8,agi:1.4,jump:.5,stam:2.6,win:1.2},time:{dawn:0,day:0,dusk:0,night:1},desc:'月光灣的守護者，銀藍色的鱗片會映出月光。只在月夜的月光灣現身，是霜汐故事的關鍵。'},
 {id:'trout',loc:'ice',name:'虹鱒',sci:'Oncorhynchus mykiss',rar:1,lvl:[20,60],len:[30,70],k:11,price:16,
  sh:{H:.2,W:.1,prof:1.6,eyeT:.86,eye:.022,tail:.24,fork:.3,dorsal:[[-.05,0],[0,.1],[.12,.08],[.15,0]],anal:[[-.3,0],[-.26,.05],[-.2,0]]},
  col:{back:'#5b6b4a',flank:'#c8a0a8',belly:'#f0eee8',fin:'#8a8f78',eye:'#101010'},pat:{t:'plain'},scale:.6,metal:.5,
  f:{pow:1.3,spd:1.6,agi:1.5,jump:.5,stam:1.3,win:1.4},time:{dawn:1.3,day:1,dusk:1.3,night:.6},desc:'冷水中的明星魚種，身上有一條粉紅色側線。冬天的冰湖下特別活躍。'},
 {id:'pike',loc:'ice',name:'白斑狗魚',sci:'Esox lucius',rar:2,lvl:[40,85],len:[50,120],k:7,price:28,
  sh:{H:.14,W:.08,prof:1.3,eyeT:.88,eye:.018,tail:.2,fork:.25,dorsal:[[-.3,0],[-.25,.08],[-.15,.07],[-.12,0]],anal:[[-.32,0],[-.28,.06],[-.2,0]]},
  col:{back:'#4a5a2a',flank:'#8a9a50',belly:'#e8e6c8',fin:'#9a7a40',eye:'#c8b040'},pat:{t:'plain'},scale:.5,metal:.3,
  f:{pow:1.9,spd:2.0,agi:1.3,jump:.3,stam:1.6,win:1.3},time:{dawn:1.2,day:1.1,dusk:1.2,night:.5},desc:'冰下的頂級掠食者，長吻和滿口利牙，咬上時會猛力衝刺。'},
 {id:'sail',loc:'sea',name:'雨傘旗魚',sci:'Istiophorus platypterus',rar:3,lvl:[60,90],len:[150,280],k:3,price:48,
  sh:{H:.13,W:.06,prof:1.5,eyeT:.86,eye:.016,tail:.26,fork:.75,dorsal:[[-.15,0],[-.1,.35],[.25,.3],[.3,0]],anal:[[-.3,0],[-.27,.05],[-.2,0]]},
  col:{back:'#1c2f6a',flank:'#8fa6c8',belly:'#e8eef4',fin:'#2a3f8a',eye:'#101010'},pat:{t:'plain'},scale:.4,metal:.7,
  f:{pow:2.3,spd:2.4,agi:1.6,jump:.9,stam:2.0,win:1.3},time:{dawn:1.3,day:1.1,dusk:1.2,night:.4},desc:'海中最快的魚之一，巨大的帆狀背鰭像一把張開的雨傘。上鉤後會連續躍出水面。'},
 {id:'ghost',name:'月光幽靈魚',sci:'Lumina spectra（傳說）',rar:5,lvl:[62,72],len:[30,60],k:9,price:60,special:'ghost',
  sh:{H:.12,W:.05,prof:1.3,eyeT:.87,eye:.034,tail:.26,fork:.7,dorsal:[[-.3,0],[-.2,.14],[.05,.12],[.15,0]],anal:[[-.32,0],[-.25,.1],[-.1,.08],[-.05,0]]},
  col:{back:'#5a8ab8',flank:'#a8d8f0',belly:'#e8f8ff',fin:'#8ad0ff',eye:'#9ff4ff'},pat:{t:'plain'},scale:.6,metal:.3,
  f:{pow:1.4,spd:2.0,agi:1.8,jump:.6,stam:1.2,win:.8},time:{dawn:0,day:0,dusk:.3,night:1.6},desc:'只在夜裡出現，身體半透明、會發出藍光，有人說牠是落進水裡的月光。'},
 {id:'mermaid',loc:'both',name:'美人魚',sci:'Sirena paludis（幻想）',rar:5,lvl:[88,99],len:[150,185],k:4.5,price:120,special:'mermaid',
  sh:{H:.075,W:.06,prof:4.2,eyeT:.9,eye:.02,tail:.26,fork:.9,dorsal:[[0,0],[.01,0]],anal:[[0,0],[.01,0]]},
  col:{back:'#1f6f78',flank:'#3fb8b0',belly:'#bff0e0',fin:'#5fe0d0',eye:'#2a1a1a'},pat:{t:'plain'},scale:1.6,metal:.6,
  f:{pow:2.8,spd:2.0,agi:1.9,jump:.2,stam:2.7,win:1.15},time:{dawn:.2,day:0,dusk:.4,night:1.5},desc:'濕地最古老的傳說。她不能被賣掉；送她回家，她會留下一份謝禮。'},
 {id:'amber',name:'紅甘',sci:'Seriola dumerili',loc:'sea',rar:0,lvl:[20,32],len:[45,110],k:11,price:40,
  sh:{H:.12,W:.06,prof:1.4,eyeT:.88,eye:.026,tail:.26,fork:.9,dorsal:[[-.2,0],[-.15,.08],[.05,.05],[.1,0]],anal:[[-.25,0],[-.2,.06],[-.05,0]]},
  col:{back:'#5a5e46',flank:'#c8c2b0',belly:'#f2f0ea',fin:'#8a7a50',eye:'#b09040'},pat:{t:'band',k:.5,c:'#b08a3a'},scale:.4,metal:.6,
  f:{pow:1.9,spd:2.0,agi:1.3,jump:.1,stam:1.5,win:1.0},time:{dawn:1.3,day:1,dusk:1.3,night:.5},desc:'台灣海釣人氣魚，衝刺力道驚人，一上鉤就往礁區鑽。'},
 {id:'grouper',name:'石斑',sci:'Epinephelus coioides',loc:'sea',rar:1,lvl:[24,36],len:[35,100],k:16,price:55,
  sh:{H:.16,W:.08,prof:1.3,eyeT:.86,eye:.026,tail:.2,fork:0,dorsal:[[-.3,0],[-.25,.08],[.1,.07],[.2,0]],anal:[[-.3,0],[-.24,.07],[-.12,0]]},
  col:{back:'#4a4030',flank:'#8a7458',belly:'#d8ccb0',fin:'#5a4a34',eye:'#c09040'},pat:{t:'spots',n:12,d:.5,r:.4,k:.6,c:'#3a2a1a'},scale:.3,metal:.1,
  f:{pow:2.0,spd:1.0,agi:.8,jump:0,stam:1.4,win:1.2},time:{dawn:1,day:1,dusk:1.2,night:1.2},desc:'礁岩裡的霸主，中魚後拚命往洞裡鑽，拉不出來就會斷線。'},
 {id:'ribbon',name:'白帶魚',sci:'Trichiurus lepturus',loc:'sea',rar:0,lvl:[15,26],len:[60,140],k:1.2,price:35,
  sh:{H:.05,W:.015,prof:2.5,eyeT:.95,eye:.016,tail:.05,fork:0,dorsal:[[-.45,0],[-.4,.03],[.42,.03],[.45,0]],anal:[[-.1,0],[-.05,.01],[0,0]]},
  col:{back:'#c8d0d8',flank:'#e8eef4',belly:'#f6f8fa',fin:'#d8e0e8',eye:'#e0d090'},pat:{t:'plain'},scale:0,metal:1,
  f:{pow:.8,spd:1.4,agi:1.6,jump:0,stam:.8,win:.8},time:{dawn:.6,day:.4,dusk:1.4,night:2},desc:'像一條銀色緞帶，夜裡成群浮上來覓食。'},
 {id:'mahi',name:'鬼頭刀',sci:'Coryphaena hippurus',loc:'sea',rar:2,lvl:[30,44],len:[60,130],k:7,price:50,
  sh:{H:.13,W:.05,prof:1.1,flat:.4,eyeT:.9,eye:.022,tail:.26,fork:.95,dorsal:[[-.38,0],[-.35,.08],[.4,.1],[.45,0]],anal:[[-.38,0],[-.34,.06],[-.05,0]]},
  col:{back:'#1f7a5a',flank:'#c8c83a',belly:'#f0e870',fin:'#3a90c0',eye:'#2a2a10'},pat:{t:'spots',n:16,d:.35,r:.25,k:.6,c:'#1a5a8a'},scale:0,metal:.7,
  f:{pow:2.0,spd:2.2,agi:1.8,jump:1.2,stam:1.4,win:.9},time:{dawn:1.3,day:1.3,dusk:1,night:.3},desc:'金綠色的海上霓虹，中魚後不停跳出水面，離水後顏色會快速褪去。'},
 {id:'tuna',name:'黑鮪魚',sci:'Thunnus orientalis',loc:'sea',rar:3,lvl:[50,65],len:[120,260],k:14,price:70,
  sh:{H:.12,W:.09,prof:1.3,eyeT:.88,eye:.02,tail:.24,fork:1,dorsal:[[-.08,0],[-.02,.12],[.08,.05],[.14,0]],anal:[[-.15,0],[-.1,.08],[-.05,0]]},
  col:{back:'#141e3a',flank:'#8a96a8',belly:'#eef2f6',fin:'#d8b040',eye:'#1a1a1a'},pat:{t:'plain'},scale:.2,metal:.8,
  f:{pow:2.8,spd:2.4,agi:.9,jump:.1,stam:2.2,win:1.0},time:{dawn:1.4,day:1,dusk:1.3,night:.6},desc:'海洋的黑色子彈，一尾動輒上百公斤，是所有海釣人的夢想。'},
 {id:'marlin',name:'旗魚',sci:'Makaira nigricans',loc:'sea',rar:4,lvl:[60,78],len:[180,300],k:4,price:80,
  sh:{H:.08,W:.05,prof:1.2,snout:1,eyeT:.8,eye:.018,tail:.26,fork:1,dorsal:[[-.3,0],[-.25,.25],[.2,.3],[.28,0]],anal:[[-.3,0],[-.25,.05],[-.15,0]]},
  col:{back:'#16305a',flank:'#6a88b0',belly:'#e4ecf4',fin:'#2a5aa0',eye:'#1a1a1a'},pat:{t:'bars',n:12,k:.35,c:'#5ab0e8'},scale:0,metal:.6,
  f:{pow:2.6,spd:2.6,agi:1.4,jump:1.4,stam:2.0,win:.8},time:{dawn:1.3,day:1.2,dusk:1.2,night:.4},desc:'背鰭像一面帆，上鉤後會整條躍出水面甩頭，是海上最華麗的對決。'},
 {id:'shark',name:'虎鯊',sci:'Galeocerdo cuvier',loc:'sea',rar:4,lvl:[70,90],len:[250,400],k:6,price:60,
  sh:{H:.09,W:.08,prof:1.4,flat:.5,eyeT:.88,eye:.014,tail:.3,fork:.6,dorsal:[[-.05,0],[0,.18],[.12,.05],[.14,0]],anal:[[-.32,0],[-.3,.05],[-.25,0]]},
  col:{back:'#4a5058',flank:'#7a8088',belly:'#e8e8e4',fin:'#4a5058',eye:'#0a0a0a'},pat:{t:'bars',n:14,k:.3,c:'#2a2e34'},scale:0,metal:.15,
  f:{pow:3.0,spd:1.8,agi:1.0,jump:0,stam:2.6,win:1.0},time:{dawn:1,day:.8,dusk:1.2,night:1.5},desc:'身上有老虎般的條紋，海裡最難纏的對手。'},
 {id:'gwhite',name:'大白鯊',sci:'Carcharodon carcharias',loc:'sea',rar:4,lvl:[85,99],len:[300,520],k:5,price:70,
  sh:{H:.1,W:.085,prof:1.5,flat:.3,eyeT:.88,eye:.012,tail:.3,fork:.7,dorsal:[[0,0],[.05,.2],[.14,.05],[.16,0]],anal:[[-.33,0],[-.31,.04],[-.27,0]]},
  col:{back:'#5c646c',flank:'#8a9096',belly:'#f0f0ec',fin:'#5c646c',eye:'#050505'},pat:{t:'plain'},scale:0,metal:.15,
  f:{pow:3.2,spd:2.0,agi:1.1,jump:.3,stam:3.0,win:1.0},time:{dawn:1.2,day:.7,dusk:1.3,night:1.2},desc:'海洋頂級掠食者，上鉤後猛烈衝刺、甚至躍出水面，是你職涯中最危險的一場對決。'},
];

/* ---------- 程序化魚模型 ---------- */
function bodyR0(t,sh){ const u=Math.pow(t,sh.prof||1.4); return Math.pow(Math.max(0,Math.sin(Math.PI*u)),.72); }
function bodyR(t,sh){ let r;
  if(!sh.snout&&t>.72){ const r72=bodyR0(.72,sh), q=(t-.72)/.28; r=Math.max(r72*Math.sqrt(Math.max(0,1-Math.pow(q,2.4)))*(1-.12*q), bodyR0(t,sh)); }
  else r=bodyR0(t,sh);
  if(sh.snout) r*=1-.72*sstep(.8,.93,t)*sh.snout;
  return Math.max(r,.0001); }
const snoutX=(t,sh)=>sh.snout?.22*sh.snout*sstep(.82,1,t):0;
const flatK=(t,sh)=>sh.flat?sstep(.62,1,t)*sh.flat:0;
function fishBody(sh){
  const P=[]; for(let i=0;i<=44;i++){ const t=i/44; P.push(new T.Vector2(bodyR(t,sh),t)); }
  const g=new T.LatheGeometry(P,36,Math.PI*1.5,Math.PI*2), p=g.attributes.position;
  for(let i=0;i<p.count;i++){ const lx=p.getX(i), t=p.getY(i), lz=p.getZ(i); const fk=flatK(t,sh);
    let Y=lx*sh.H; if(Y<0) Y*=1.08; Y*=1-.45*fk; const Z=-lz*sh.W*(1+.55*fk);
    p.setXYZ(i, t-.5+snoutX(t,sh), Y-.012*sstep(.85,1,t)*sh.H*4, Z); }
  g.computeVertexNormals(); return g;
}
function spotMask(t,u,P){ const gx=t*P.n, gy=u*P.n*2.4, ix=Math.floor(gx), iy=Math.floor(gy); let m=0;
  for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++){ const cx=ix+a, cy=iy+b; if(hashI(cx*7+3,cy*13+1)>P.d) continue;
    const px=cx+hashI(cx,cy*3+5), py=cy+hashI(cx*5+2,cy), r=P.r*(.6+.6*hashI(cx+11,cy+7)); m=Math.max(m,1-sstep(r*.65,r,Math.hypot(gx-px,gy-py))); }
  return m; }
function fishTex(sp){
  const c=sp.col, P=sp.pat, back=hex(c.back), flank=hex(c.flank), belly=hex(c.belly), pc=hex(P.c||'#000000'), sc=sp.scale||0;
  return dataTex(128,256,(u,t,o)=>{
    const vert=-Math.cos(2*Math.PI*u);
    let col=mix3(belly,flank,sstep(-.8,-.1,vert)); col=mix3(col,back,sstep(.05,.75,vert));
    let k=.92+.16*fbm(t*20,u*12,2), d=0; const body=sstep(.04,.12,t)*(1-sstep(.8,.86,t));
    if(P.t==='bars'){ const b=.5+.5*Math.cos((t*P.n+.35*fbm(t*5,u*6,2))*2*Math.PI); d=P.k*sstep(.45,.8,b)*sstep(-.55,.05,vert)*body; }
    else if(P.t==='band'){ const w=Math.abs(vert-.12+.22*(fbm(t*10,u*2,2)-.5)); d=P.k*(1-sstep(.06,.2,w))*body*(.55+.6*fbm(t*26,u*9,2)); }
    else if(P.t==='spots'){ d=P.k*spotMask(t,u,P)*sstep(-.7,-.25,vert)*(t<.9?1:0); }
    else if(P.t==='blotch'){ d=P.k*sstep(.5,.62,fbm(t*11+3,u*7,3))*sstep(-.6,0,vert)*body+P.k*.6*spotMask(t,u,{n:14,d:.25,r:.25})*sstep(-.3,.2,vert); }
    else if(P.t==='mottle'){ d=P.k*sstep(.42,.66,fbm(t*8,u*5,4))*sstep(-.85,-.25,vert); }
    col=mix3(col,pc,clamp(d,0,.95));
    if(sp.op){ const qd=Math.hypot((t-.8)*7,(vert-.15)*1.6); col=mix3(col,[18,22,40],1-sstep(.18,.3,qd)); }
    if(sp.oc){ const qd=Math.hypot((t-.09)*9,(vert-.25)*1.3); col=mix3(col,[20,18,10],1-sstep(.12,.17,qd)); col=mix3(col,[230,140,40],sstep(.12,.17,qd)*(1-sstep(.22,.28,qd))); }
    if(t>.06&&t<.8) k*=1+.12*(1-sstep(.004,.02,Math.abs(vert-.18)));
    if(!sp.sh.snout&&sp.special!=='mermaid'&&t>.86){ const ml=Math.abs(vert-(-.05-(1-t)*.5)); if(ml<.035) k*=.3+.7*sstep(.01,.035,ml); }
    const gl=Math.abs(t-.79-.035*vert*vert); k*=1-.35*(1-sstep(.004,.012,gl))*(1-sstep(.7,.95,Math.abs(vert)));
    if(sc>0){ const hd=sstep(.76,.82,t), sx=t*44, row=Math.floor(sx), off=(row&1)*.5, sy=u*96+off, fx=sx-row, fy=sy-Math.floor(sy);
      const edge=sstep(.4,.56,Math.hypot((fx-.1)*1.1,fy-.5)); k*=1-(sc*.2*edge-sc*.06*(1-fx))*(1-hd); }
    o[0]=col[0]*k; o[1]=col[1]*k; o[2]=col[2]*k;
  });
}
const FIN_TEX=dataTex(64,64,(u,v,o)=>{ const ray=.5+.5*Math.cos(u*2*Math.PI*9); const k=.72+.28*Math.pow(ray,4);
  o[0]=o[1]=o[2]=255*k; o[3]=255*(.8+.18*Math.pow(ray,4))*(1-.4*sstep(.8,1,v)); });
function bend(mat,uni){ mat.onBeforeCompile=(s)=>{ s.uniforms.uSwim=uni.uSwim; s.uniforms.uAmp=uni.uAmp;
  s.vertexShader='uniform float uSwim;\nuniform float uAmp;\n'+s.vertexShader.replace('#include <begin_vertex>',
  '#include <begin_vertex>\nfloat bx_=clamp(0.5-position.x,0.0,1.6);\ntransformed.z+=sin(uSwim-position.x*5.5)*bx_*bx_*uAmp;'); }; return mat; }
function profH(prof,x){ for(let i=0;i<prof.length-1;i++){ const a=prof[i], b=prof[i+1]; if(x>=a[0]&&x<=b[0]) return lerp(a[1],b[1],sstep(0,1,(x-a[0])/(b[0]-a[0]||1))); } return 0; }
function finStrip(sh,prof,sign){
  const N=16, pos=[], uv=[], idx=[], x0=prof[0][0], x1=prof[prof.length-1][0];
  for(let i=0;i<=N;i++){ const x=lerp(x0,x1,i/N), h=profH(prof,x), t=x+.5, yb=sign*bodyR(t,sh)*sh.H*(sign<0?1.08:1)*.9;
    pos.push(x,yb,0, x-h*.45,yb+sign*h*1.3,0); uv.push(i/N,0,i/N,1); }
  for(let i=0;i<N;i++){ const a=i*2; idx.push(a,a+1,a+2,a+1,a+3,a+2); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function tailGeo(sh){
  const s=sh.tail*1.12, f=sh.fork, cx=-s*(1.12-.42*f), shp=new T.Shape();
  shp.moveTo(0,.03); shp.quadraticCurveTo(-s*.45,.05+s*.3,-s,s*.78); shp.quadraticCurveTo(cx,s*.32,-s*(1-.55*f),0);
  shp.quadraticCurveTo(cx,-s*.32,-s,-s*.78); shp.quadraticCurveTo(-s*.45,-.05-s*.3,0,-.03); shp.lineTo(0,.03);
  const g=new T.ShapeGeometry(shp,10); g.translate(-.47,0,0);
  const p=g.attributes.position, uv=g.attributes.uv; for(let i=0;i<p.count;i++) uv.setXY(i,p.getY(i)/(s*1.6)+.5,(-.47-p.getX(i))/s);
  return g;
}
function buildMermaid(sp){
  const uni={uSwim:{value:0},uAmp:{value:0}}, g=new T.Group();
  const tg=fishBody(sp.sh); tg.scale(.6,1,1); tg.translate(-.2,0,0);
  const tm=bend(new T.MeshPhysicalMaterial({map:fishTex(sp),roughness:.3,metalness:.55,clearcoat:.85,clearcoatRoughness:.18,emissive:new T.Color(0x0a4848),emissiveIntensity:.3}),uni);
  g.add(new T.Mesh(tg,tm));
  const fm=bend(new T.MeshStandardMaterial({color:new T.Color(sp.col.fin),map:FIN_TEX,transparent:true,side:T.DoubleSide,roughness:.4,metalness:.3,depthWrite:false,emissive:new T.Color(0x0a5050),emissiveIntensity:.4}),uni);
  const fl=tailGeo({tail:.26,fork:.9}); fl.rotateX(Math.PI/2); g.add(new T.Mesh(fl,fm));
  const skin=new T.MeshStandardMaterial({color:0xe9b998,roughness:.55});
  const prof=[[0,.0001],[0,.058],[.06,.05],[.14,.058],[.22,.068],[.29,.072],[.33,.05],[.36,.024],[.39,.022],[.39,.0001]];
  const tor=new T.LatheGeometry(prof.map(p=>new T.Vector2(p[1],p[0])),28); tor.rotateZ(-Math.PI/2); tor.scale(1,.78,1.15); g.add(new T.Mesh(tor,skin));
  const hd=new T.Mesh(new T.SphereGeometry(.046,24,16),skin); hd.scale.set(1.08,1,.9); hd.position.set(.44,.012,0); g.add(hd);
  const ink=new T.MeshStandardMaterial({color:0x1a1010,roughness:.2});
  for(const s of [1,-1]){ const e=new T.Mesh(new T.SphereGeometry(.0055,8,6),ink); e.position.set(.484,.02,s*.016); g.add(e); }
  const hair=new T.MeshStandardMaterial({color:0x8a2a1c,roughness:.5});
  for(let i=0;i<11;i++){ const zz=(i/10-.5)*.075, P3=[]; for(let k=0;k<=8;k++){ const s=k/8; P3.push(new T.Vector3(.46-s*.36,.062+.028*(1-s)+Math.sin(s*6+i)*.007,zz*(1+s*.9)+Math.sin(s*5+i*1.3)*.012)); }
    g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(P3),24,.009,6),hair)); }
  const limb=(a,b,r)=>{ const d=new T.Vector3().subVectors(b,a), L=d.length(), m=new T.Mesh(new T.CylinderGeometry(r*.8,r,L,10),skin); m.position.addVectors(a,b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()); return m; };
  for(const s of [1,-1]){ const sh=new T.Vector3(.31,0,s*.085), el=new T.Vector3(.22,-.03,s*.1), hn=new T.Vector3(.13,-.03,s*.085);
    g.add(limb(sh,el,.014)); g.add(limb(el,hn,.012)); const h=new T.Mesh(new T.SphereGeometry(.012,10,8),skin); h.position.copy(hn); g.add(h); }
  const shell=new T.MeshStandardMaterial({color:0xb070c0,metalness:.6,roughness:.3});
  for(const s of [1,-1]){ const m=new T.Mesh(new T.SphereGeometry(.022,12,8),shell); m.scale.set(1,.5,1); m.position.set(.24,-.048,s*.03); g.add(m); }
  g.traverse(o=>{ o.frustumCulled=false; });
  return {group:g, uni, sp};
}
const fishCache={};
/* ---------- 真實掃描魚模型（Barramundi Fish, Microsoft 2017, CC0） ---------- */
const SCAN={ready:false};
const SCANMAP={
 barra:{tk:0},
 lmbass:{back:'#5d7a3a',belly:'#e6e2c6',tk:.75},
 smbass:{back:'#7a5226',belly:'#ecd2a0',tk:.8,barN:9,barK:.35},
 perch:{back:'#6e5428',belly:'#e8d6a4',tk:.75,barN:6,barK:.3},
 reba:{back:'#5d7088',belly:'#eef2f4',tk:.5,sy:.85},
 crappie:{back:'#56684e',belly:'#e4e8dc',tk:.6,sy:1.2,barN:12,barK:.18},
 bluegill:{back:'#3d5240',belly:'#e09a40',tk:.75,sy:1.45,barN:7,barK:.25},
 golden:{back:'#e8a820',belly:'#ffe9a0',tk:1,metal:.85,emis:0xffa010},
 ghost:{back:'#6fb0e0',belly:'#e8f8ff',tk:.9,ghost:true},
 amber:{back:'#6a6a4a',belly:'#f0eee6',tk:.55,sy:.85},
 grouper:{back:'#5a4a30',belly:'#d8c8a8',tk:.8,sy:1.1,barN:5,barK:.35}};
(function initScan(){
  if(typeof SCAN_DATA==='undefined') return;
  const dec=(s,Ty)=>{ const b=atob(s), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Ty(u.buffer); };
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.BufferAttribute(dec(SCAN_DATA.pos,Float32Array),3));
  geo.setAttribute('normal',new T.BufferAttribute(dec(SCAN_DATA.nrm,Float32Array),3));
  const uv=new T.BufferAttribute(dec(SCAN_DATA.uv,Float32Array),2); geo.setAttribute('uv',uv); geo.setAttribute('uv2',uv);
  geo.setIndex(new T.BufferAttribute(dec(SCAN_DATA.idx,SCAN_DATA.i32?Uint32Array:Uint16Array),1));
  const tl=new T.TextureLoader(); let left=3;
  const done=()=>{ if(--left===0){ SCAN.ready=true; for(const id in fishCache) if(SCANMAP[id]) delete fishCache[id]; } };
  const ld=(u,srgb)=>{ const t=tl.load(u,done,undefined,()=>{}); t.flipY=false; if(srgb) t.encoding=T.sRGBEncoding; t.anisotropy=4; return t; };
  SCAN.geo=geo; SCAN.tex={col:ld(SCAN_DATA.col,true),mr:ld(SCAN_DATA.mr,false),nm:ld(SCAN_DATA.nm,false)};
})();
function buildScan(sp,cfg){
  const uni={uSwim:{value:0},uAmp:{value:0}}, g=new T.Group(), tx=SCAN.tex;
  const m=new T.MeshPhysicalMaterial({map:tx.col,roughnessMap:tx.mr,metalnessMap:tx.mr,aoMap:tx.mr,normalMap:tx.nm,roughness:1,metalness:cfg.metal||1,clearcoat:.55,clearcoatRoughness:.25,envMapIntensity:1.25});
  const tu={uBack:{value:new T.Color(cfg.back||'#ffffff').convertSRGBToLinear()},uBelly:{value:new T.Color(cfg.belly||'#ffffff').convertSRGBToLinear()},uTintK:{value:cfg.tk||0},uBarN:{value:cfg.barN||0},uBarK:{value:cfg.barK||0}};
  m.onBeforeCompile=s=>{ Object.assign(s.uniforms,{uSwim:uni.uSwim,uAmp:uni.uAmp},tu);
    s.vertexShader='uniform float uSwim;\nuniform float uAmp;\nvarying vec2 vOP_;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOP_ = position.xy;\nfloat bx_ = clamp(0.5 - position.x, 0.0, 1.6);\ntransformed.z += sin(uSwim - position.x*5.5)*bx_*bx_*uAmp;');
    s.fragmentShader='uniform vec3 uBack;\nuniform vec3 uBelly;\nuniform float uTintK;\nuniform float uBarN;\nuniform float uBarK;\nvarying vec2 vOP_;\n'+s.fragmentShader.replace('#include <map_fragment>',SCAN_TINT); };
  if(cfg.ghost){ m.transparent=true; m.opacity=.75; m.emissive=new T.Color(0x5fc8ff); m.emissiveIntensity=.7; }
  if(cfg.emis){ m.emissive=new T.Color(cfg.emis); m.emissiveIntensity=.12; }
  const mesh=new T.Mesh(SCAN.geo,m); if(cfg.sy) mesh.scale.y=cfg.sy; g.add(mesh);
  g.traverse(o=>{ o.frustumCulled=false; });
  return {group:g,uni,sp,scan:true};
}
function getFish(sp){
  const fc=fishCache[sp.id];
  if(fc&&(fc.real||!(window.__MDL&&window.__MDL.fishReady(sp.id)))) return fc;
  if(window.__MDL){ const r=window.__MDL.fish(sp); if(r) return (fishCache[sp.id]=r); }
  if(sp.special==='mermaid') return (fishCache[sp.id]=buildMermaid(sp));
  if(SCAN.ready&&SCANMAP[sp.id]) return (fishCache[sp.id]=buildScan(sp,SCANMAP[sp.id]));
  const sh=sp.sh, uni={uSwim:{value:0},uAmp:{value:0}}, g=new T.Group();
  const bm=bend(new T.MeshPhysicalMaterial({map:fishTex(sp), roughness:.38, metalness:sp.metal*.8, clearcoat:.75, clearcoatRoughness:.22, envMapIntensity:1.3}),uni);
  if(sp.special==='golden'){ bm.emissive=new T.Color(0xffa010); bm.emissiveIntensity=.14; bm.roughness=.22; }
  if(sp.special==='ghost'){ bm.transparent=true; bm.opacity=.72; bm.emissive=new T.Color(0x5fc8ff); bm.emissiveIntensity=.85; bm.metalness=.1; }
  g.add(new T.Mesh(fishBody(sh),bm));
  const fm=bend(new T.MeshStandardMaterial({color:new T.Color(sp.col.fin).multiplyScalar(.85), map:FIN_TEX, transparent:true, side:T.DoubleSide, roughness:.45, depthWrite:false}),uni);
  if(sp.special==='ghost'){ fm.emissive=new T.Color(0x5fc8ff); fm.emissiveIntensity=.9; }
  g.add(new T.Mesh(tailGeo(sh),fm)); g.add(new T.Mesh(finStrip(sh,sh.dorsal,1),fm)); g.add(new T.Mesh(finStrip(sh,sh.anal,-1),fm));
  const pg=new T.CircleGeometry(.06,12); pg.scale(1.4,.6,1);
  for(const s of [1,-1]){ const pm=new T.Mesh(pg,fm); pm.position.set(.24,-.35*sh.H,s*sh.W*.85); pm.rotation.set(s*.3,s*.7,-.4); g.add(pm);
    const pl=new T.Mesh(pg,fm); pl.scale.setScalar(.7); pl.position.set(.06,-.85*sh.H,s*.02); pl.rotation.set(s*1.0,s*.4,-.3); g.add(pl); }
  const eyeMat=new T.MeshStandardMaterial({color:sp.col.eye, roughness:.25, metalness:.3}), pupMat=new T.MeshStandardMaterial({color:0x050505, roughness:.05});
  const te=sh.eyeT, re=bodyR(te,sh), fk=flatK(te,sh), ex=te-.5+snoutX(te,sh), ey=re*sh.H*.32*(1-.45*fk), ez=re*sh.W*(1+.55*fk)*.9;
  for(const s of [1,-1]){ const e=new T.Mesh(new T.SphereGeometry(sh.eye,14,10),eyeMat); e.scale.set(1,1,.55); e.position.set(ex,ey,s*ez); g.add(e);
    const pu=new T.Mesh(new T.SphereGeometry(sh.eye*.58,12,8),pupMat); pu.scale.set(1,1,.5); pu.position.set(ex,ey,s*(ez+sh.eye*.3)); g.add(pu); }
  if(sh.barbels){ const bm=new T.MeshStandardMaterial({color:0x2a2620, roughness:.6});
    for(const s of [1,-1]) for(const k of [0,1]){ const c=new T.CatmullRomCurve3([new T.Vector3(.5,-.01-k*.02,s*.025),new T.Vector3(.56,-.03-k*.03,s*(.06+k*.02)),new T.Vector3(.6+k*.03,-.06-k*.04,s*(.1+k*.03))]);
      g.add(new T.Mesh(new T.TubeGeometry(c,8,.0035,5),bm)); } }
  g.traverse(o=>{ o.frustumCulled=false; });
  return (fishCache[sp.id]={group:g, uni, sp});
}

const showLight=new T.PointLight(0xfff4e8,0,6,1.2); showLight.position.set(.5,.6,.3); head.add(showLight);

function setRodLook(col,gold){ blankMat.color.set(col).lerp(new T.Color(1,1,1),.5);   // 不同竿子在碳纖紋上帶一點顏色（像真的有色碳纖竿），不是整根塗成純色
  const gm=gold?goldMat:chromeMat; guides.forEach(g=>{ g.material=gm; }); tipTop.material=gm; }
return { dockMats:{plankMat,postMat,beamMat}, rodGroup, reelObj:reel, crankObj:crank, setRodLook, rod, updateRod, setLine, bobber, splash, updateFx, shadow, SPECIES, RAR, getFish };
}
/* ===== 第 2 段 · 水下鏡頭、釣具店、等級與任務 ===== */
const SH2 = {};
SH2.bgVS = `
varying vec3 vD;
void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }
`;
SH2.bgFS = `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBot;
varying vec3 vD;
void main(){
  float y = vD.y;
  vec3 c = y > 0.0 ? mix(uMid, uTop, pow(clamp(y, 0.0, 1.0), 0.7)) : mix(uMid, uBot, pow(clamp(-y, 0.0, 1.0), 0.6));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}
`;
SH2.surfVS = `
varying vec3 vW;
void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }
`;
SH2.surfFS = `
uniform float uTime;
uniform vec3 uCol;
uniform vec3 uFog;
uniform float uDen;
varying vec3 vW;
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
float nn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), u.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), u.x), u.y); }
void main(){
  vec2 p = vW.xz;
  float w = nn(p*1.3 + vec2(uTime*0.3, uTime*0.2))*0.6 + nn(p*3.1 - vec2(uTime*0.4, -uTime*0.25))*0.4;
  float dw = smoothstep(0.55, 0.62, nn(p*0.35 + vec2(3.0, 7.0))*0.7 + nn(p*4.0)*0.3);
  vec3 c = uCol*(0.55 + 0.7*w)*(1.0 - 0.75*dw);
  float d = length(cameraPosition - vW);
  c = mix(c, uFog, 1.0 - exp(-d*uDen*0.55));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}
`;

function createUnderwater(W, P){
'use strict';
const T=THREE, R=W.renderer;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t, rand=(a,b)=>a+Math.random()*(b-a);
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const lin=h=>new T.Color(h).convertSRGBToLinear();
function hashI(x,y){ let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function vn(x,y){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hashI(xi,yi), b=hashI(xi+1,yi), c=hashI(xi,yi+1), d=hashI(xi+1,yi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,o){ let s=0,a=.5,n=0; for(let i=0;i<o;i++){ s+=a*vn(x,y); n+=a; x=x*2.03+17.1; y=y*2.03+9.7; a*=.5; } return s/n; }
function dataTex(w,h,fn,srgb){ const d=new Uint8Array(w*h*4), o=[0,0,0,255];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ o[3]=255; fn(x/w,y/h,o); const i=(y*w+x)*4; for(let k=0;k<4;k++){ const v=o[k]; d[i+k]=v<0?0:v>255?255:v; } }
  const t=new T.DataTexture(d,w,h,T.RGBAFormat); t.wrapS=t.wrapT=T.RepeatWrapping; t.magFilter=T.LinearFilter; t.minFilter=T.LinearMipmapLinearFilter;
  t.generateMipmaps=true; if(srgb!==false) t.encoding=T.sRGBEncoding; t.needsUpdate=true; return t; }

const scene=new T.Scene(), cam=new T.PerspectiveCamera(60,1,.03,90); scene.add(cam);
const fog=new T.FogExp2(new T.Color(),.17); scene.fog=fog;
const bgU={uTop:{value:new T.Color()},uMid:{value:new T.Color()},uBot:{value:new T.Color()}};
const bg=new T.Mesh(new T.SphereGeometry(60,32,16),new T.ShaderMaterial({uniforms:bgU,vertexShader:SH2.bgVS,fragmentShader:SH2.bgFS,side:T.BackSide,depthWrite:false}));
bg.renderOrder=-5; bg.frustumCulled=false; scene.add(bg);
const hemi=new T.HemisphereLight(0xffffff,0x101010,1); scene.add(hemi);
const sunL=new T.DirectionalLight(0xffffff,.6); sunL.position.set(3,10,2); scene.add(sunL);
const camLight=new T.PointLight(0xcfe8d8,0,4,1.5); cam.add(camLight);

// 由下往上看的水面
const surfU={uTime:W.U.uTime,uCol:{value:new T.Color()},uFog:{value:new T.Color()},uDen:{value:.17}};
const surf=new T.Mesh(new T.PlaneGeometry(120,120),new T.ShaderMaterial({uniforms:surfU,vertexShader:SH2.surfVS,fragmentShader:SH2.surfFS,side:T.DoubleSide,depthWrite:false}));
surf.rotation.x=Math.PI/2; scene.add(surf);

// 湖底（泥沙、焦散光紋）
const bottomY=(x,z)=>{ const r=Math.hypot(x,z); return -3.6+.35*Math.sin(x*.4)*Math.cos(z*.33)+.2*Math.sin(x*1.3+z*.7)+(r>10?(r-10)*.09:0); };
const mud=dataTex(256,256,(u,v,o)=>{ const n=fbm(u*8,v*8,4), peb=sstep(.68,.74,fbm(u*40,v*40,2)), k=.6+.6*n;
  o[0]=(70+40*peb)*k; o[1]=(64+34*peb)*k; o[2]=(40+30*peb)*k; });
mud.repeat.set(10,10);
const bgeo=new T.PlaneGeometry(70,70,80,80); bgeo.rotateX(-Math.PI/2);
{ const p=bgeo.attributes.position; for(let i=0;i<p.count;i++) p.setY(i,bottomY(p.getX(i),p.getZ(i))); bgeo.computeVertexNormals(); }
const cau={value:new T.Color(0,0,0)};
const TLu=new T.TextureLoader(), pbrT=(n,rep)=>{ const f=k=>{ const t=TLu.load('models/home/'+n+'_'+k+'.jpg'); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(rep,rep); if(k==='Diffuse') t.encoding=T.sRGBEncoding; return t; }; return {map:f('Diffuse'),normalMap:f('nor_gl'),roughnessMap:f('Rough')}; };
const BED={lake:pbrT('clean_pebbles',18),sea:pbrT('coral_gravel',14)};   // 湖底與海底改用實拍的卵石、珊瑚砂貼圖
const botMat=new T.MeshStandardMaterial(Object.assign({roughness:1,color:0x9a9488},BED.lake));
// 真實水草：湖底散佈實際掃描的植物模型（蕁麻草叢、蕨類），隨水流輕輕搖
const plants=new T.Group(); scene.add(plants); const plantList=[];
if(T.GLTFLoader){ const L=new T.GLTFLoader(), put=(g,pick,n,sc)=>{ for(let i=0;i<n;i++){ const src=pick?g.scene.getObjectByName(pick[i%pick.length]):g.scene; if(!src) continue; const o=src.clone(true); o.position.set(0,0,0); const w=new T.Group(); w.add(o);
      const a=Math.random()*6.28, r=1.5+Math.random()*9; w.position.set(Math.cos(a)*r,0,Math.sin(a)*r); w.position.y=bottomY(w.position.x,w.position.z); w.rotation.y=Math.random()*6.28; w.scale.setScalar(sc*(.7+Math.random()*.6));
      w.traverse(m=>{ m.frustumCulled=false; if(m.isMesh&&m.material){ m.material=m.material.clone(); m.material.color&&m.material.color.multiplyScalar(.75); } }); plants.add(w); plantList.push({w,ph:Math.random()*6}); } };
  L.load('models/home/nettle_plant.glb',g=>put(g,['nettle_plant_tall_a_LOD0','nettle_plant_tall_b_LOD0','nettle_plant_medium_a_LOD0'],26,5.5));
  L.load('fern_02.glb',g=>put(g,null,10,.9)); }
botMat.onBeforeCompile=s=>{ s.uniforms.uTime=W.U.uTime; s.uniforms.uCau=cau;
  s.vertexShader='varying vec3 vWp;\n'+s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWp = (modelMatrix*vec4(transformed, 1.0)).xyz;');
  s.fragmentShader='uniform float uTime;\nuniform vec3 uCau;\nvarying vec3 vWp;\nfloat cau_(vec2 p, float t){ vec2 q = p*1.1; float c = 0.0; for(int i = 0; i < 3; i++){ q += vec2(sin(q.y*1.7 + t*0.9), cos(q.x*1.5 - t*0.7))*0.6; c += pow(abs(sin(q.x + q.y)), 10.0); q *= 1.7; } return c; }\n'
    +s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += uCau*cau_(vWp.xz, uTime)*diffuseColor.rgb;'); };
scene.add(new T.Mesh(bgeo,botMat));

// 水草
const wg=new T.PlaneGeometry(.05,1,1,6); wg.translate(0,.5,0);
{ const p=wg.attributes.position; for(let i=0;i<p.count;i++){ const y=p.getY(i); p.setX(i,p.getX(i)*(1-y*.85)); p.setZ(i,y*y*.12); } wg.computeVertexNormals(); }
const weedMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.7,side:T.DoubleSide});
weedMat.onBeforeCompile=s=>{ s.uniforms.uTime=W.U.uTime; s.vertexShader='uniform float uTime;\n'+s.vertexShader.replace('#include <begin_vertex>',
 `#include <begin_vertex>
 float wp_ = 0.0;
 #ifdef USE_INSTANCING
 wp_ = instanceMatrix[3].x*1.3 + instanceMatrix[3].z*0.8;
 #endif
 transformed.x += sin(uTime*0.9 + wp_)*position.y*position.y*0.18;
 transformed.z += cos(uTime*0.7 + wp_*1.3)*position.y*position.y*0.1;`); };
const NW=420, weeds=new T.InstancedMesh(wg,weedMat,NW);
{ const m4=new T.Matrix4(), q=new T.Quaternion(), e=new T.Euler(), p=new T.Vector3(), s=new T.Vector3();
  for(let i=0;i<NW;i++){ const a=Math.random()*6.283, r=1.8+Math.pow(Math.random(),.7)*13, x=Math.cos(a)*r, z=Math.sin(a)*r;
    e.set((Math.random()-.5)*.3,Math.random()*6.283,(Math.random()-.5)*.3); q.setFromEuler(e); p.set(x,bottomY(x,z)-.05,z); s.set(1,rand(.5,2.6),1);
    m4.compose(p,q,s); weeds.setMatrixAt(i,m4); const t=Math.random(); weeds.setColorAt(i,new T.Color().setRGB(lerp(.16,.34,t),lerp(.3,.5,t),lerp(.07,.14,t))); } }
scene.add(weeds);
// 石頭、沉木
const rockMat=new T.MeshStandardMaterial({map:mud,color:0x8a8a78,roughness:.95});
for(let i=0;i<12;i++){ const g=new T.IcosahedronGeometry(1,3), p=g.attributes.position; for(let k=0;k<p.count;k++){ const vx=p.getX(k), vy=p.getY(k), vz=p.getZ(k), f=.8+.35*fbm(vx*1.7+i,vz*1.7+vy,3); p.setXYZ(k,p.getX(k)*f,p.getY(k)*f*.7,p.getZ(k)*f); }
  g.computeVertexNormals(); const m=new T.Mesh(g,rockMat), a=Math.random()*6.283, r=2.2+Math.random()*9, x=Math.cos(a)*r, z=Math.sin(a)*r;
  m.scale.setScalar(rand(.2,.7)); m.position.set(x,bottomY(x,z)-m.scale.x*.25,z); m.rotation.y=Math.random()*6; scene.add(m); }
const barkTex=dataTex(64,128,(u,v,o)=>{ const n=fbm(u*14,v*3,3), k=.55+.6*n; o[0]=58*k; o[1]=46*k; o[2]=34*k; });
const log=new T.Mesh(new T.CylinderGeometry(.22,.27,7,12),new T.MeshStandardMaterial({map:barkTex,roughness:.9}));
log.rotation.set(0,.6,Math.PI/2-.15); log.position.set(-2.6,bottomY(-2.6,-3.4)+.2,-3.4); scene.add(log);

// 懸浮微粒
const NP=700, pp=new Float32Array(NP*3);
for(let i=0;i<NP;i++){ pp[i*3]=rand(-8,8); pp[i*3+1]=rand(-3.4,-.1); pp[i*3+2]=rand(-8,8); }
const pgeo=new T.BufferGeometry(); pgeo.setAttribute('position',new T.BufferAttribute(pp,3));
const soft=dataTex(32,32,(u,v,o)=>{ const d=Math.max(0,1-Math.hypot(u-.5,v-.5)*2); o[0]=o[1]=o[2]=255; o[3]=255*d*d; },false);
const pm=new T.PointsMaterial({size:.022,map:soft,transparent:true,depthWrite:false,opacity:.75});
const parts=new T.Points(pgeo,pm); parts.frustumCulled=false; scene.add(parts);

// 光束
const rayTex=dataTex(32,128,(u,v,o)=>{ o[0]=o[1]=o[2]=255; o[3]=255*Math.pow(Math.sin(u*Math.PI),2)*Math.pow(v,1.6); },false);
const rays=[];
for(let i=0;i<8;i++){ const m=new T.Mesh(new T.PlaneGeometry(.8+Math.random()*1.4,18),new T.MeshBasicMaterial({map:rayTex,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false,side:T.DoubleSide,opacity:.1}));
  m.position.set(rand(-7,7),-9,rand(-7,7)); m.rotation.order='YXZ'; m.userData.ph=Math.random()*6; scene.add(m); rays.push(m); }

// 釣組：浮標底部、子線、咬鉛、魚鉤、蚯蚓
const rig=new T.Group(); scene.add(rig);
{ const l=new T.Mesh(new T.CylinderGeometry(.0014,.0014,1.3,4),new T.MeshBasicMaterial({color:0xcfd8d8,transparent:true,opacity:.55})); l.position.y=-.65; rig.add(l);
  const b=new T.Mesh(new T.SphereGeometry(.063,16,8,0,Math.PI*2,Math.PI/2,Math.PI/2),new T.MeshStandardMaterial({color:0xe8e4da,roughness:.4})); b.scale.y=1.3; b.position.y=-.005; rig.add(b);
  const s=new T.Mesh(new T.SphereGeometry(.013,10,8),new T.MeshStandardMaterial({color:0x6a6e72,metalness:.8,roughness:.4})); s.position.y=-.95; rig.add(s);
  const h=new T.Mesh(new T.TorusGeometry(.014,.0018,6,14,Math.PI*1.3),new T.MeshStandardMaterial({color:0xb8bcc0,metalness:1,roughness:.2})); h.position.y=-1.3; h.rotation.z=Math.PI*.6; rig.add(h); }
const V3=(x,y,z)=>new T.Vector3(x,y,z);
const worm=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([V3(0,-1.27,0),V3(.02,-1.3,.01),V3(0,-1.33,-.01),V3(-.025,-1.35,0),V3(-.01,-1.39,.02),V3(.02,-1.41,0)]),24,.0065,6),
  new T.MeshStandardMaterial({color:0xa8574d,roughness:.35}));
rig.add(worm);
const BAIT=new T.Vector3(0,-1.32,0);
// 美人魚：用角色設定圖的正面／背面去背圖，在水中永遠面向鏡頭，尾巴與頭髮有擺動
const merTL=new T.TextureLoader(), merUni={uSwim:{value:0},uAmp:{value:0}}; let merG=null;
function merSprite(){ if(merG) return merG; const g=new T.Group();
  const mk=(file,ry)=>{ const t=merTL.load(file); t.encoding=T.sRGBEncoding; t.anisotropy=4;
    const m=new T.MeshStandardMaterial({map:t,alphaTest:.4,roughness:.55,metalness:.1,emissive:new T.Color(0x0a2a3a),emissiveIntensity:.35});
    m.onBeforeCompile=s=>{ s.uniforms.uSwim=merUni.uSwim; s.vertexShader='uniform float uSwim;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat ty_ = clamp(0.48 - uv.y, 0.0, 1.0);\ntransformed.x += sin(uSwim*2.2 - uv.y*7.0)*ty_*ty_*0.16;\nfloat hy_ = smoothstep(0.55, 0.95, uv.y)*abs(position.x)*4.0;\ntransformed.x += sin(uSwim*1.3 + uv.y*5.0)*hy_*0.012;'); };
    const me=new T.Mesh(new T.PlaneGeometry(.497,1,10,48),m);   /* 新設定圖的寬高比（張開雙手） */ me.rotation.y=ry; me.frustumCulled=false; g.add(me); };
  mk('mer_front2.png',0); mk('mer_back2.png',Math.PI); g.userData.mer=true; merG=g; return g; }

// 魚
let on=false, fish=null, uni=null, fd=null, prog=0, biteT=-1, camA=0, yaw=0, tt=0;
const S=new T.Vector3(), C=new T.Vector3(), dirv=new T.Vector3(), perp=new T.Vector3(), pos=new T.Vector3(), prev=new T.Vector3(), focus=new T.Vector3();
const cDark=lin('#07110d'), cMid=lin('#2a5240'), cSea=lin('#1d5a7a'), cTint=lin('#3c4a1c'), tmpC=new T.Color();
function start(fdIn){
  end(); fd=fdIn; const merReal=fd.sp.special==='mermaid'&&window.__MDL&&window.__MDL.fishReady(fd.sp.id); if(fd.sp.special==='mermaid'&&!merReal){ fish=merSprite(); uni=merUni; } else {   /* 美人魚：有 3D 模型就用有骨架的真模型（水下趴平游泳），沒有才用平面圖 */ let src=null; try{ if(window.__MDL&&window.__MDL.fishReady(fd.sp.id)) src=window.__MDL.fish(fd.sp); }catch(e){}   // 用真實的 3D 魚模型（有骨架），不是簡化的魚
    if(src){ uni=src.uni; fish=src.group; } else { src=P.getFish(fd.sp); uni=src.uni; fish=src.group.clone(); } fish.traverse(o=>{ o.frustumCulled=false; if(o.isMesh&&o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ m.fog=true; }); } }); }
  fish.visible=true; fish.scale.setScalar(fd.L); scene.add(fish);
  const a0=Math.random()*Math.PI*2, R0=3.2+fd.L*2;
  S.set(Math.cos(a0)*R0,BAIT.y+rand(-.5,.3),Math.sin(a0)*R0);
  dirv.subVectors(BAIT,S); dirv.y=0; dirv.normalize(); perp.set(-dirv.z,0,dirv.x);
  C.copy(BAIT).addScaledVector(dirv,-(fd.L*(fd.sp.sh.snout?.72:.5)+.02)); C.y=BAIT.y-.02;
  camA=Math.atan2(perp.z,perp.x)+rand(-.35,.35); prog=0; biteT=-1; worm.visible=true;
  pos.copy(S); prev.copy(S); yaw=Math.atan2(-dirv.z,dirv.x); tt=0; on=true; scene.environment=W.scene.environment;
}
function end(){ on=false; if(fish){ scene.remove(fish); fish=null; } }
function update(dt){
  if(!on) return; tt+=dt;
  const L=Math.max(clamp(W.info.light,0,1.2),.62), day=W.info.day;   // 夜裡水下鏡頭保留月光亮度，才看得清楚魚
  const sea=W.isSea&&W.isSea(); weeds.visible=!sea; plants.visible=!sea; { const bd=sea?BED.sea:BED.lake; if(botMat.map!==bd.map){ Object.assign(botMat,bd); botMat.needsUpdate=true; } } const mid=tmpC.copy(cDark).lerp(sea?cSea:cMid,clamp(L,0,1));
  fog.density+=((biteT<0?.3:.09)-fog.density)*Math.min(1,dt*3); { const tt=performance.now()/1000; plantList.forEach(p=>{ p.w.rotation.z=Math.sin(tt*.7+p.ph)*.08; p.w.rotation.x=Math.cos(tt*.55+p.ph)*.06; }); }   // 能見度約 10 公尺，看得到魚從遠處游過來
  fog.color.copy(mid); bgU.uMid.value.copy(mid); bgU.uTop.value.copy(mid).multiplyScalar(2.4).add(cTint.clone().multiplyScalar(L*.6)); bgU.uBot.value.copy(mid).multiplyScalar(.35);
  surfU.uCol.value.copy(mid).multiplyScalar(5); surfU.uFog.value.copy(mid);
  hemi.color.copy(mid).multiplyScalar(3.2); hemi.groundColor.copy(mid).multiplyScalar(.6);
  const lc=W.U.uLightCol.value; sunL.color.setRGB(lc.x*.5,lc.y*.55,lc.z*.45);
  cau.value.setRGB(.5,.6,.45).multiplyScalar(L*.9*clamp(day,0,1));
  pm.color.copy(mid).multiplyScalar(4); camLight.intensity=(1-day)*.9;
  parts.position.y=Math.sin(tt*.1)*.1; parts.rotation.y=tt*.01;
  // 魚的動作
  if(biteT<0){
    if(prog<1){ const e=sstep(0,1,prog); pos.copy(S).lerp(C,e).addScaledVector(perp,Math.sin(e*Math.PI*1.6)*.35*(1-e)); pos.y+=Math.sin(e*5)*.05; }
    else { pos.copy(C).addScaledVector(dirv,Math.sin(tt*3)*.03-.05); }
  } else {
    biteT+=dt; const k=Math.min(1,biteT/.15); pos.copy(C).addScaledVector(dirv,.05*k);
    if(biteT>.15) worm.visible=false;
    if(biteT>.3){ const s=biteT-.3; pos.addScaledVector(perp,s*.7).addScaledVector(dirv,-s*.2); pos.y-=s*.15; }
  }
  const vx=pos.x-prev.x, vz=pos.z-prev.z, sp=Math.hypot(vx,vz)/Math.max(dt,1e-4);
  if(sp>.02){ let ty=Math.atan2(-vz,vx), d=ty-yaw; while(d>Math.PI) d-=6.283; while(d<-Math.PI) d+=6.283; yaw+=d*Math.min(1,dt*4); }
  fish.position.copy(pos); fish.rotation.set(0,yaw,clamp((pos.y-prev.y)/Math.max(dt,1e-4)*.4,-.3,.3)); prev.copy(pos);
  if(fish.userData.mer){ const cx=cam.position.x-pos.x, cz=cam.position.z-pos.z, cl=Math.hypot(cx,cz)||1, vl=Math.hypot(vx,vz)||1e-5;
    const away=sp>.05&&(vx*cx+vz*cz)/(cl*vl)<-.4;
    fish.rotation.set(0,Math.atan2(cx,cz)+(away?Math.PI:0),clamp(-(vx*cz-vz*cx)/cl*8,-.25,.25)); fish.position.y+=Math.sin(tt*1.4)*.04; }
  uni.uSwim.value+=dt*(5+sp*14); uni.uAmp.value=.035+clamp(sp*.05,0,.08)+(biteT>=0&&biteT<.6?.06:0);
  worm.rotation.y=Math.sin(tt*3)*.25; rig.rotation.z=Math.sin(tt*.8)*.02;
  // 鏡頭
  camA+=dt*.05; focus.copy(BAIT).lerp(pos,.5); const cd=Math.max(1.3,pos.distanceTo(BAIT)*.95+fd.L*1.8);
  cam.position.set(focus.x+Math.cos(camA)*cd,focus.y+.18+Math.sin(tt*.7)*.03,focus.z+Math.sin(camA)*cd); cam.lookAt(focus);
  bg.position.copy(cam.position);
  for(const r of rays){ r.rotation.set(0,Math.atan2(cam.position.x-r.position.x,cam.position.z-r.position.z),.18); r.material.opacity=.09*L*(.6+.4*Math.sin(tt*.5+r.userData.ph)); r.material.color.setRGB(.8,1,.75); }
}
function resize(w,h){ cam.aspect=w/h; cam.fov=w<h?62:48; cam.updateProjectionMatrix(); }
return { start, end, update, resize, active:()=>on, setProgress:a=>{ prog=clamp(a,0,1); }, bite:()=>{ if(on&&biteT<0) biteT=0; }, render:()=>R.render(scene,cam) };
}

/* ---------- 釣具與魚餌資料 ---------- */
const GEAR={
 rod:[{name:'入門碳竿',price:0,lv:1,cast:30,tens:1,col:'#1d4fb8'},{name:'中調碳竿',price:1500,lv:3,cast:36,tens:.92,col:'#1f6e48'},
      {name:'高模數競技竿',price:6000,lv:6,cast:42,tens:.85,col:'#141418',gold:true},{name:'傳奇手工竿',price:20000,lv:10,cast:50,tens:.78,col:'#8e1a20',gold:true},{name:'人魚之竿',price:0,lv:1,cast:54,tens:.72,col:'#dfeef4',gold:true,req:'mer3'},{name:'月神之竿',price:0,lv:1,cast:60,tens:.64,col:'#bcd8ff',gold:true,req:'moon'}],
 line:[{name:'尼龍線 6 lb',price:0,lv:1,s:4.2},{name:'尼龍線 10 lb',price:800,lv:2,s:5.0},{name:'碳纖線 14 lb',price:3000,lv:4,s:6.0},
       {name:'PE 編織線 20 lb',price:9000,lv:7,s:7.2},{name:'PE 編織線 30 lb',price:25000,lv:11,s:8.6}],
 reel:[{name:'2000 型紡車輪',price:0,lv:1,spd:1.9,drag:1},{name:'3000 型紡車輪',price:1200,lv:3,spd:2.2,drag:.85},
       {name:'4000 型高速輪',price:5000,lv:5,spd:2.6,drag:.7},{name:'碳纖旗艦輪',price:16000,lv:9,spd:3.0,drag:.55}]};
const BAITS=[
 {id:'worm',name:'蚯蚓',icon:'🪱',price:0,pack:0,lv:1,desc:'什麼魚都吃一點，用不完',aff:{},rare:0,wait:1},
 {id:'corn',name:'甜玉米',icon:'🌽',price:60,pack:10,lv:1,desc:'鯉魚、草魚、鯽魚、印度鯪愛吃，咬口快',aff:{reba:2.2,bluegill:1.6,crappie:1.3,crucian:2.2,tilapia:1.8,carp:2.5,grasscarp:2.2,silvercarp:1.2,clarias:.5,mekong:1.5,yperch:.8,whitefish:.8},rare:-.2,wait:.75},
 {id:'ragworm',name:'沙蠶',icon:'🪱',price:0,pack:0,lv:1,shop:false,desc:'潮間帶挖來的沙蠶，海釣的萬用餌：黑鯛、真鯛、石斑、沙梭都愛',aff:{porgy:2.2,redbream:2,grouper:1.6,grouper2:1.4,knifejaw:1.8,emperor:1.6,wrasse:2,flathead:1.3,cobia:1.2,amber:1.2}},
 {id:'shrimp',name:'活蝦',icon:'🦐',price:180,pack:10,lv:2,desc:'鱖魚、鯰魚、黑鯛、真鯛、江鱈的最愛',aff:{perch:2.2,channel:2,flathead:1.4,clarias:1.8,blackcarp:2,carp:1.2,porgy:2.2,redbream:2,emperor:1.8,burbot:1.8,wrasse:1.2,yperch:1.8,whitefish:1.6,eel:1.6,laketrout:1.2,clownfish:1.6,copperband:1.6,bluetang:1.2,seahorse:1.8,blenny:1.4,angelfish:1.2},rare:.35,wait:1},
 {id:'soft',name:'軟蟲路亞',icon:'🐛',price:240,pack:10,lv:3,desc:'專攻黑鱸和弓鰭魚',aff:{lmbass:2.6,smbass:2.6,bowfin:1.5,snakehead:1.8,peacock:1.5},rare:.4,wait:1.05},
 {id:'live',name:'活魚餌',icon:'🐟',price:600,pack:5,lv:5,desc:'小魚幾乎不碰，大型掠食魚才會咬',aff:{flathead:3,gar:3,bowfin:2,channel:1.6,snakehead:2.2,peacock:2.4,arapaima:3,spgar:2,clarias:.6,cobia:2,yellowfin:1.5,sawara:1.5,emperor:1.2,char:1.6,burbot:1.5,bluegill:.2,crappie:.2,reba:.2,crucian:.2,tilapia:.3,eel:2.5,taimen:2.5,laketrout:2,gt:2.2,swordfish:1.8,mekong:.3,yperch:.3,whitefish:.3,threadfin:2},rare:1.0,wait:1.4},
 {id:'spoon',lure:'spoon',name:'金屬亮片',icon:'🥄',price:900,pack:15,lv:4,desc:'中速穩定收線，閃光吸引掠食魚（路亞：自己收線操作）',aff:{perch:2,lmbass:1.8,smbass:1.8,amber:1.6,ribbon:2,peacock:1.8,snakehead:1.2,spgar:1.2,sawara:2.2,skipjack:2,yellowfin:1.2,char:1.4,laketrout:1.8,taimen:1.6,yperch:1.2,gt:1.2,threadfin:1.4},rare:.4,wait:1},
 {id:'crank',lure:'crank',name:'曲柄硬餌',icon:'🐠',price:1400,pack:15,lv:6,desc:'快速收線會下潛，黑鱸、金目鱸最愛（需要好捲線器）',aff:{lmbass:2.5,smbass:2.2,barra:2,gar:1.5,grouper:1.5,mahi:1.4,peacock:2.2,spgar:1.2,arapaima:1.2,emperor:1.2,cobia:1.4,gt:1.6,taimen:1.4},rare:.5,wait:1},
 {id:'minnow',lure:'minnow',name:'米諾',icon:'🐟',price:1800,pack:15,lv:8,desc:'抽一下、停一下，模仿受傷小魚，大型掠食魚無法抗拒',aff:{smbass:2.2,barra:2.2,lmbass:1.6,tuna:1.6,mahi:1.8,marlin:1.4,peacock:2.6,snakehead:1.6,spgar:1.6,arapaima:1.5,yellowfin:1.8,sawara:1.6,skipjack:1.4,cobia:1.5,gt:2.4,taimen:2,laketrout:1.6,swordfish:1.2,threadfin:1.6},rare:.6,wait:1},
 {id:'moon',name:'月光餌',icon:'🌙',price:1500,pack:3,lv:3,desc:'散發微光的神秘餌，傳說中的生物會被吸引',aff:{mermaid:7,ghost:12,golden:12,seabeast:10},rare:.6,wait:1.3}];
const BOAT_COST={coins:25000,scale:30,bone:10,pearl:2};   // 修復老漁人的漁船
const xpNext=lv=>Math.round(120*Math.pow(lv,1.75));   // 升級曲線：Lv 10 約 6,700、Lv 20 約 22,600
/* 等級里程碑：每級解鎖什麼（升級提示與 ⭐ 面板共用） */
const LV_TITLES={10:'見習漁人',20:'湖畔好手',30:'老練漁夫',40:'傳說釣手',50:'守湖宗師'};
const LV_EVENTS={5:'主線第三章「暴風雨之後」',8:'主線第四章「湖心的秘密」',10:'主線第五章「冰下的歌聲」',15:'大師挑戰：巨型鱷雀鱔',18:'主線終章「深淵之王」、大師挑戰：鯰魚之王',20:'大師挑戰：旗魚王',24:'大師挑戰：滄淵',25:'大師挑戰：大白鯊女王'};
function lvGains(lv){ const g=[]; if(lv>=5) g.push('天賦點 +1'); if(lv%3===0&&lv<=30) g.push('強化上限提高到 +'+Math.min(10,lv/3)); if(LV_TITLES[lv]) g.push('稱號「'+LV_TITLES[lv]+'」'); if(LV_EVENTS[lv]) g.push(LV_EVENTS[lv]); return g; }
window.__LVINFO={gains:lvGains,titles:LV_TITLES,xpNext:lv=>xpNext(lv)};

function createMeta(c){
'use strict';
const {save,persist,toast,Snd,SPECIES,RAR,P,setCoins,vib,PRESETS,setHour}=c;
const $=id=>document.getElementById(id);
save.gear=save.gear||{rod:[0],line:[0],reel:[0]}; save.eq=save.eq||{rod:0,line:0,reel:0}; save.baits=save.baits||{};
save.bait=save.bait||'worm'; save.xp=save.xp||0; save.lv=save.lv||1; save.quests=save.quests||[];
if(save.uw===undefined) save.uw=true; if(save.vibe===undefined) save.vibe=true;
const sheet=$('sheet'), shT=$('shT'), shB=$('shB');
const ECO=createEco({save,persist,toast,Snd,P,SPECIES,RAR,setCoins:()=>setCoins(),applyRod:()=>applyRod()}); window.__ECO=ECO;
let cur=null, shopTab='rod', resetArm=false, dexSel=null;
const fmtW=w=>w<1?Math.round(w*1000)+' g':w.toFixed(2)+' kg';
const PERN={dawn:'清晨',dusk:'黃昏',night:'夜晚'};

// 這個釣點現在去得了嗎（跟釣點地圖用同一套判斷：主線開放＋有需要的船）
function spotOK(i){ const s=SPOTS[i], why=window.__STORY?window.__STORY.lock(i):(save.lv<s.lv||(s.req==='mer1'&&!(save.mer&&save.mer.n>=1)));
  return !why&&!((s.kayak&&!save.kayak)||(s.yacht&&!save.yacht)); }
// 這種魚可以去哪裡釣：回傳地點文字；目前去不了任何一個出沒釣點就回傳 null
function whereOf(sp){ const L=sp.loc||'lake';
  const ok=SPOTS.map((s,i)=>i).filter(i=>spotOK(i)&&((SPOTS[i].loc||'lake')===L||(L==='both'&&SPOTS[i].loc!=='ice')||(SPOTS[i].loc==='ice'&&sp.ice))&&(!sp.spots||sp.spots.includes(SPOTS[i].id)));
  if(!ok.length) return null; if(sp.spots) return ok.map(i=>SPOTS[i].name).join('、');
  return L==='sea'?'海上':L==='ice'?'冰湖':'濕地任一處'; }
function newQuest(ex){
  const lv=save.lv, per=['dawn','dusk','night'][Math.floor(Math.random()*3)];
  const pool={
    count:()=>{ const n=3+Math.floor(lv*.6); return {n,txt:`釣到任意魚 ${n} 尾`}; },
    rare:()=>{ const n=lv<4?1:2; return {n,min:1,txt:`釣到稀有以上的魚 ${n} 尾`}; },
    weight:()=>{ const n=Math.round(3+lv*2.5); return {n,txt:`累計漁獲重量 ${n} kg`}; },
    sp:()=>{ const cs=SPECIES.map(s=>[s,whereOf(s)]).filter(([s,w])=>w&&!s.special&&!s.noSell&&s.rar<=Math.min(4,Math.floor(lv/3)+1)&&s.lvl[0]<=lv*1.5+10);   // 魚的等級太高（太難釣）就先不出成任務
      const [s,w]=cs[Math.floor(Math.random()*cs.length)]||[SPECIES.find(x=>x.id==='bluegill'),'木碼頭'], n=s.rar>=2?1:2; return {n,id:s.id,txt:`釣到${s.name} ${n} 尾（${w}）`}; },
    per:()=>{ const n=2+Math.floor(lv/4); return {n,per,txt:`在${PERN[per]}釣到魚 ${n} 尾`}; },
    perfect:()=>{ const n=2+Math.floor(lv/5); return {n,txt:`完美揚竿 ${n} 次`}; },
    release:()=>({n:2,txt:'放生 2 尾魚'}),
    ice:()=>{ const n=2+Math.floor(lv/8); return {n,txt:`在冰湖釣到魚 ${n} 尾`}; }};
  const keys=Object.keys(pool).filter(k=>!ex.includes(k)&&(k!=='ice'||lv>=10)), k=keys[Math.floor(Math.random()*keys.length)];
  const q=Object.assign({k,prog:0},pool[k]()); const diff={count:1,rare:1.6,weight:1.2,sp:1.5,per:1.2,perfect:1.3,release:.8,ice:1.4}[k];
  q.reward=Math.round((60+lv*45)*diff/10)*10; q.xp=Math.round(xpNext(lv)*.06*diff); return q;   // 任務經驗依這一級所需經驗按比例給
}
const QDIFF={count:1,rare:1.6,weight:1.2,sp:1.5,per:1.2,perfect:1.3,release:.8,ice:1.4};
(save.quests||[]).forEach(q=>{ const want=Math.round(xpNext(save.lv)*.06*(QDIFF[q.k]||1)); if(!q.xp||q.xp<want*.5) q.xp=want; });   // 舊任務的經驗用新公式重算
function fillQuests(){ while(save.quests.length<3) save.quests.push(newQuest(save.quests.map(q=>q.k))); persist(); }
function addXP(x){ save.xp+=x; while(save.xp>=xpNext(save.lv)){ save.xp-=xpNext(save.lv); save.lv++; const lv=save.lv;
  if(LV_TITLES[lv]){ save.titles=save.titles||[]; if(save.titles.indexOf(LV_TITLES[lv])<0) save.titles.push(LV_TITLES[lv]); }
  const gs=lvGains(lv); setTimeout(()=>{ toast('升級！Lv '+lv+(gs.length?'<br><small>'+gs.join('、')+'</small>':''),'good',3600); Snd.fanfare(2); vib([40,40,80]); },1600); } }
{ save.titles=save.titles||[]; Object.keys(LV_TITLES).forEach(k=>{ if(save.lv>=+k&&save.titles.indexOf(LV_TITLES[k])<0) save.titles.push(LV_TITLES[k]); }); }   // 舊存檔補發等級稱號
function gear(){ const g0=ECO.enhance({rod:GEAR.rod[save.eq.rod]||GEAR.rod[0], line:GEAR.line[save.eq.line]||GEAR.line[0], reel:GEAR.reel[save.eq.reel]||GEAR.reel[0]}); return window.__TAL?window.__TAL.apply(g0):g0; }
function applyRod(){ const r=GEAR.rod[save.eq.rod]||GEAR.rod[0]; P.setRodLook(r.col,!!r.gold); ECO.applySkins(); }
function curBait(){ return BAITS.find(b=>b.id===save.bait)||BAITS[0]; }
function useBait(){ const b=curBait(); if(b.id==='worm') return b; const n=save.baits[b.id]||0;
  if(n<=0){ save.bait='worm'; persist(); syncHUD(); toast(b.name+'用完了，改用蚯蚓','warn'); return BAITS[0]; }
  save.baits[b.id]=n-1; persist(); syncHUD(); return b; }
function syncHUD(){
  $('lvN').textContent=save.lv; $('xpF').style.width=Math.min(100,save.xp/xpNext(save.lv)*100).toFixed(1)+'%';
  const b=curBait(); $('baitI').textContent=b.icon; $('baitN').textContent=b.name; $('baitC').textContent=b.id==='worm'?'∞':(save.baits[b.id]||0);
  $('bQuest').classList.toggle('dotn',save.quests.some(q=>q.prog>=q.n));
}
function onCatch(fd,o){
  const xp=Math.round((fd.lvl+3)*RAR[fd.sp.rar].mult*(fd.xpMul||1)); addXP(xp);
  if(window.__G&&window.__G.loc==='ice') save.iceN=(save.iceN||0)+1;
  for(const q of save.quests){ if(q.prog>=q.n) continue; let d=0;
    if(q.k==='count') d=1; else if(q.k==='rare') d=fd.sp.rar>=q.min?1:0; else if(q.k==='weight') d=fd.w;
    else if(q.k==='sp') d=fd.sp.id===q.id?1:0; else if(q.k==='per') d=o.per===q.per?1:0; else if(q.k==='perfect') d=o.perfect?1:0; else if(q.k==='ice') d=(window.__G&&window.__G.loc==='ice')?1:0;
    if(d>0){ q.prog=Math.min(q.n,q.prog+d); if(q.prog>=q.n){ const t=q.txt; setTimeout(()=>toast('任務完成：'+t,'good',2200),2600); } } }
  ECO.drop(fd); persist(); syncHUD(); return xp;
}
function onRelease(){ for(const q of save.quests) if(q.k==='release'&&q.prog<q.n){ q.prog++; if(q.prog>=q.n) toast('任務完成：'+q.txt,'good',2200); } persist(); syncHUD(); }
function claim(i){ const q=save.quests[i]; if(!q||q.prog<q.n) return; save.coins+=q.reward; addXP(q.xp); save.quests.splice(i,1); fillQuests(); setCoins(); Snd.coin(); toast(`領取 🪙 ${q.reward} 與 ${q.xp} 經驗`,'good'); }

const row=(name,sub,right,col)=>`<div class="row"${col?` style="--rc:${col}"`:''}>${col?'<span class="dot"></span>':''}<div class="nm"><b>${name}</b><small>${sub}</small></div><div class="rt">${right}</div></div>`;
function render(){
  let h='';
  if(cur==='shop'){
    shT.textContent='釣具店';
    h+='<div class="tabs">'+[['rod','釣竿'],['line','釣線'],['reel','捲線器'],['bait','魚餌'],['enh','🔨 強化'],['item','🧳 道具'],['skin','🎨 外觀'],['market','📈 魚市']].map(t=>`<button class="tab${shopTab===t[0]?' on':''}" data-a="tab" data-v="${t[0]}">${t[1]}</button>`).join('')+'</div>';
    h+=`<div class="note">🪙 ${save.coins.toLocaleString()}，Lv ${save.lv}</div>`+ECO.matLine();
    if(['enh','item','skin','market'].includes(shopTab)) h+=ECO.render(shopTab,GEAR);
    else if(shopTab!=='bait'){
      h+=GEAR[shopTab].map((it,i)=>{ const own=save.gear[shopTab].includes(i), eq=save.eq[shopTab]===i, lock=save.lv<it.lv||(it.req==='mer3'&&!(save.mer&&save.mer.n>=3))||(it.req==='moon'&&!(save.moon&&save.moon.done));
        const sub=shopTab==='rod'?`拋投 ${it.cast} m，拉扯張力 −${Math.round((1-it.tens)*100)}%`:shopTab==='line'?`強度 ${it.s.toFixed(1)}，越高越不容易斷`:`收線 ${it.spd} m/s，爆線累積 −${Math.round((1-it.drag)*100)}%`;
        const btn=eq?'<span class="eqd">使用中</span>':own?`<button class="sbtn" data-a="eq" data-v="${i}">裝備</button>`:lock?`<span class="lk">${it.req==='moon'?'完成月光灣的故事':it.req?'美人魚第 3 次相遇':'Lv '+it.lv+' 解鎖'}</span>`:`<button class="sbtn pri" data-a="buy" data-v="${i}">🪙 ${it.price.toLocaleString()}</button>`;
        return row(it.name,sub,btn); }).join('');
    } else {
      h+=BAITS.map((b,i)=>{ const n=b.id==='worm'?'∞':(save.baits[b.id]||0), lock=save.lv<b.lv, using=save.bait===b.id;
        let btn=''; if(b.shop===false){ if(!n) return ''; } else if(b.id!=='worm') btn+=lock?`<span class="lk">Lv ${b.lv} 解鎖</span>`:`<button class="sbtn" data-a="bb" data-v="${i}">+${b.pack} 🪙${b.price}</button>`;
        btn+=using?'<span class="eqd">使用中</span>':(b.id==='worm'||n>0)?`<button class="sbtn pri" data-a="ub" data-v="${i}">使用</button>`:'';
        return row(`${b.icon} ${b.name} <small class="cnt">×${n}</small>`,b.desc,`<div class="bb">${btn}</div>`); }).join('');
    }
  } else if(cur==='quest'){
    shT.textContent='任務';
    h+='<div class="note">完成後點領取，會立刻補上新任務</div>';
    h+=save.quests.map((q,i)=>{ const done=q.prog>=q.n, pg=q.k==='weight'?`${q.prog.toFixed(1)}/${q.n}`:`${q.prog}/${q.n}`;
      return `<div class="row qrow"><div class="nm"><b>${q.txt}</b><small>${pg}，獎勵 🪙 ${q.reward} 與 ${q.xp} 經驗</small><span class="pbar"><i style="width:${Math.min(100,q.prog/q.n*100)}%"></i></span></div>`+
        `<div class="rt">${done?`<button class="sbtn pri" data-a="claim" data-v="${i}">領取</button>`:''}</div></div>`; }).join('');
  } else if(cur==='log'){
    shT.textContent='漁獲圖鑑';
    const found=SPECIES.filter(s=>save.dex[s.id]).length;
    h+=`<div class="tabs" style="margin-bottom:6px"><button class="tab${logMode!=='list'?' on':''}" data-a="logmode" data-v="dex">📖 圖鑑</button><button class="tab${logMode==='list'?' on':''}" data-a="logmode" data-v="list">🧾 魚獲紀錄</button></div>`;
    if(logMode==='list'){ h+=logList(); } else {
    h+=`<div class="note">已發現 ${found}/${SPECIES.length} 種，總漁獲 ${save.total} 尾</div>`;
    const dsp=dexSel&&SPECIES.find(s=>s.id===dexSel);
    if(dsp){ h=dexPage(dsp); }
    else { const RG=[['all','全部'],['lake','湖'],['ice','冰湖'],['sea','海'],['tide','潮間帶']], rg=window.__DEXRG||'all', inRg=sp=>rg==='all'||(sp.loc||'lake')===rg||(rg==='lake'&&sp.loc==='both')||(rg==='sea'&&sp.loc==='both');
    h+='<div class="tabs" style="flex-wrap:wrap;margin-bottom:6px">'+RG.map(([k,n])=>{ const L=SPECIES.filter(s=>k==='all'||(s.loc||'lake')===k||(s.loc==='both'&&(k==='lake'||k==='sea'))); return `<button class="tab${rg===k?' on':''}" data-a="dexrg" data-v="${k}">${n} ${L.filter(s=>save.dex[s.id]).length}/${L.length}</button>`; }).join('')+'</div>';
    h+='<div class="note" style="font-size:12px">點任一種查看詳細資料</div>';
    h+=SPECIES.filter(inRg).map(sp=>{ const d=save.dex[sp.id], r=RAR[sp.rar];
      return `<div class="dexrow" data-a="dex" data-v="${sp.id}"><img class="dexth" data-th="${sp.id}" alt="" src="${DEXV.cached(sp.id,!!d)||DEXV.BLANK}">`+row(d?sp.name:'？？？',`${r.name}，LVL ${sp.lvl[0]}–${sp.lvl[1]}，${styOf(sp.id).n}`,d?`${d.n} 尾<br><small>最大 ${fmtW(d.bw)}</small>`:'<small>未釣獲</small>',r.col)+'</div>'; }).join(''); }
  }
  } else if(cur==='home'){
    const HM=window.__HOME, hd=HM.data(), t=HM.tank(), nm=id=>(SPECIES.find(s=>s.id===id)||{}).name||id, dt=d=>new Date(d).toLocaleDateString('zh-TW');
    shT.textContent='老漁人的小屋'; h+='<button class="sbtn" data-a="mapBack">← 返回釣點</button>';
    const fl=(arr,water)=>arr.length?arr.map((f,i)=>row(nm(f.id)+(f.g?' <small class="cnt">'+f.g+'</small>':''),`${Math.round(f.L*100)} 公分・${fmtW(f.w)}・${f.at||''} ${dt(f.d)}`,`<button class="sbtn" data-a="hrel" data-v="${water}:${i}">放回湖裡</button>`)).join(''):'<div class="note" style="font-size:12px">還是空的。釣到魚時按「🏠 帶回家」就會放進來。</div>';
    h+=`<div class="note">${t.n}（淡水）${hd.fresh.length}/${t.cap}・最大可放 ${Math.round(t.maxL*100)} 公分${hd.chiller?'・已裝冷水機':''}</div>`+fl(hd.fresh,'fresh');
    if(hd.seaTank) h+=`<div class="note">海水缸 ${hd.sea.length}/${HM.seaT().cap}・最大可放 ${Math.round(HM.seaT().maxL*100)} 公分</div>`+fl(hd.sea,'sea');
    h+=`<div class="note">標本牆 ${hd.mounts.length}/${HM.MOUNT_MAX}</div>`+(hd.mounts.length?hd.mounts.map((f,i)=>row('🖼 '+nm(f.id),`${Math.round(f.L*100)} 公分・${fmtW(f.w)}・${f.at||''} ${dt(f.d)}`,`<button class="sbtn" data-a="hrel" data-v="mounts:${i}">取下</button>`)).join(''):'<div class="note" style="font-size:12px">放不進水族箱的大魚，可以花錢做成標本掛在牆上。</div>');
    h+='<div class="note">小屋設備</div>'; const nx=HM.TANKS[hd.tier+1];
    if(nx) h+=row('換成'+nx.n,`容量 ${nx.cap} 條、最大可放 ${Math.round(nx.maxL*100)} 公分`,`<button class="sbtn pri" data-a="hbuy" data-v="tier">🪙 ${nx.price.toLocaleString()}</button>`);
    if(!hd.chiller) h+=row('冷水機','裝了才能養冰湖的魚',`<button class="sbtn pri" data-a="hbuy" data-v="chiller">🪙 ${HM.CHILLER.price.toLocaleString()}</button>`);
    if(hd.seaTank){ const sn=HM.SEA_TANKS[(hd.seaTier||0)+1]; if(sn) h+=row('海水缸換成'+sn.n,`容量 ${sn.cap} 條、最大可放 ${Math.round(sn.maxL*100)} 公分`,`<button class="sbtn pri" data-a="hbuy" data-v="seaTier">🪙 ${sn.price.toLocaleString()}</button>`); }
    if(!hd.seaTank) h+=row('海水缸','另一個水族箱，專門養海水魚',!save.yacht?'<span class="lk">需要漁船</span>':`<button class="sbtn pri" data-a="hbuy" data-v="sea">🪙 ${HM.SEA_TANK.price.toLocaleString()}</button>`);
    // 家具：每件顯示目前效果、能不能用、下一級；在小屋裡才能使用，升級哪裡都可以
    h+='<div class="note">家具（在小屋裡點家具也能使用與升級）</div>'; const home=document.body.classList.contains('athome');
    HM.FURN.forEach(d=>{ const F=HM.furnInfo(d.id), nx=F.next, st='★'.repeat(F.lv+1)+'☆'.repeat(d.lv.length-1-F.lv);
      const useB=d.id==='fire'?'':home?`<button class="sbtn${F.st.ok?' pri':''}" data-a="fuse" data-v="${d.id}">${d.act}</button>`:'';
      const upB=nx?`<button class="sbtn${(save.lv||1)>=nx.need&&save.coins>=nx.p?' pri':''}" data-a="fup" data-v="${d.id}">升級 🪙${nx.p.toLocaleString()}</button>`:'<span class="lk">最高級</span>';
      h+=row(`${d.i} ${d.n} <small style="color:#e8b84a">${st}</small>`,`${F.cur.d}${d.id!=='fire'&&d.id!=='rock'?'・'+F.st.txt:''}${nx?'<br>下一級「'+nx.n+'」：'+nx.d+'（Lv '+nx.need+'）':''}`,`<div class="bb">${useB}${upB}</div>`); });
  } else if(cur==='set'){
    shT.textContent='設定';
    h+='<div class="note">切換時段</div><div class="tabs">'+PRESETS.map((p,i)=>`<button class="tab" data-a="time" data-v="${i}">${p[1]}</button>`).join('')+'</div>';
    { const gq=save.gfx||'auto'; h+='<div class="note">畫質</div><div class="tabs">'+[['auto','自動'],['high','高'],['mid','中'],['low','低']].map(([k,n])=>`<button class="tab${gq===k?' on':''}" data-a="gfx" data-v="${k}">${n}</button>`).join('')+'</div><div class="note" style="font-size:12px">自動（建議）：特效全開，依手機實際順暢度調整解析度｜高：固定最高｜中：關光束、倒影降解析｜低：關倒影、霧層、雨圈、草叢</div>'+`<div class="note" style="font-size:12px">目前解析度 ${(c.W&&c.W.getPR?c.W.getPR():1).toFixed(2)} 倍（螢幕最高 ${Math.min(window.devicePixelRatio||1,2.5).toFixed(1)} 倍）・每秒 ${Math.round(window.__FPS||0)} 張畫面</div>`; }
    { const n=window.__DIAG?window.__DIAG.count():0; h+=`<div class="note">問題回報（目前記錄 ${n} 筆錯誤）</div><div class="tabs"><button class="tab" data-a="diag" data-v="copy">📋 複製診斷資訊</button><button class="tab" data-a="diag" data-v="clear">清除記錄</button></div><div class="note" style="font-size:12px">遇到怪問題時，按「複製診斷資訊」再貼給開發者，就能看到你手機上實際發生的錯誤和幀率。</div>`; }
    h+='<div class="note">天氣</div><div class="tabs">'+[['auto','自動'],['clear','晴'],['breezy','有風'],['cloudy','陰'],['drizzle','毛毛雨'],['rain','雨'],['storm','雷雨'],['fog','霧']].map(w=>`<button class="tab${(save.wxMode||'auto')===w[0]?' on':''}" data-a="wx" data-v="${w[0]}">${w[1]}</button>`).join('')+'</div>';
    h+='<div class="note">釣魚難度（越難，金幣與經驗越多）</div><div class="tabs">'+Object.keys(DIFF).map(k=>`<button class="tab${(save.diff||'normal')===k?' on':''}" data-a="diff" data-v="${k}">${DIFF[k].n}</button>`).join('')+'</div>';
    h+='<div class="note">魚訊放大視窗（自動：休閒、標準開，硬派、專家關）</div><div class="tabs">'+[['auto','自動'],['on','開'],['off','關']].map(m=>`<button class="tab${(save.mag||'auto')===m[0]?' on':''}" data-a="mag" data-v="${m[0]}">${m[1]}</button>`).join('')+'</div>';
    const tg=(k,name,sub,onv)=>row(name,sub,`<button class="sbtn${onv?' pri':''}" data-a="tg" data-v="${k}">${onv?'開':'關'}</button>`);
    h+=tg('sound','音效','環境聲、捲線器、水花',Snd.isOn());
    h+=tg('vibe','震動','咬餌、拉扯時的手機震動',save.vibe!==false);
    { const st=window.__CLOUD?window.__CLOUD.status():{state:'nocfg'};
      if(st.state==='in') h+=row('☁️ 雲端存檔','已登入 '+st.name+'，進度會自動同步到你的 Google 帳號',`<button class="sbtn" data-a="cloud" data-v="out">登出</button>`);
      else if(st.state==='out') h+=row('☁️ 雲端存檔','用 Google 帳號登入，換手機或清除瀏覽器也不會丟進度。目前的本機進度會先上傳，不會被洗掉',`<button class="sbtn pri" data-a="cloud" data-v="in">Google 登入</button>`);
      else h+=row('☁️ 雲端存檔','Google 登入尚未設定',`<span class="lk">尚未設定</span>`);
      if(st.state==='in') h+=row('🛟 救回存檔','進度不見時用：檢查雲端存檔、雲端備份、本機備份，救回進度最高的那份',`<button class="sbtn" data-a="cloud" data-v="rescue">檢查並救回</button>`);
      if(st.state==='in'&&window.__CLOUD.compensate&&st.owner) h+=row('🩹 一次性補償','存檔救不回時用：恢復 Lv 18、金幣、主線到終章前（圖鑑無法還原）',`<button class="sbtn" data-a="cloud" data-v="comp">恢復進度</button>`);
      if(st.state==='in'&&window.__CLOUD.isTest&&window.__CLOUD.isTest()) h+=row('🧪 測試帳號','把正式版目前的進度複製過來覆蓋測試存檔（金幣維持 999,999）',`<button class="sbtn" data-a="cloud" data-v="copy">複製正式進度</button>`);
      h+=row('📘 新手指引','重新看一次每個按鈕的用途',`<button class="sbtn" data-a="tut">重看</button>`);
      h+=row('📲 安裝到桌面',PWA.installed()?'已安裝成 App，從桌面開啟時進度一樣保留':'像 App 一樣從手機桌面開啟，進度與瀏覽器共用',PWA.installed()?`<span class="lk">已安裝</span>`:`<button class="sbtn pri" data-a="pwa">安裝</button>`); }
    h+=row('💎 支持作者','遊戲完全免費。作者的水晶小店「靜月之光」，喜歡的話歡迎逛逛',`<button class="sbtn pri" data-a="shop">逛逛</button>`);
    h+=tg('uw','水下鏡頭','魚靠近餌時切到水下看牠咬餌',save.uw!==false);
    h+=tg('scare','驚嚇效果','夜裡偶爾會有嚇人的事……心臟不好或小朋友玩請關閉',!save.noScare);
    h+=tg('imm','沉浸模式','隱藏上方大部分介面，只留設定和動作按鈕',!!save.imm);
    h+='<div class="note">真實魚模型：Barramundi Fish © Microsoft 2017，CC0 授權（Khronos glTF Sample Assets）</div>';
    h+='<div class="note">真實動物與魚類 3D 模型（Sketchfab，CC-BY 4.0）：<br>'+(window.__MDL?window.__MDL.credits():'')+'</div>';
    h+='<div class="note">實拍湖景、HDR 光照、碼頭與泥灘材質、枯木樹樁岩石蕨類模型：Poly Haven（CC0）</div>';
    h+=row('重置存檔','金幣、等級、裝備、圖鑑全部清除',`<button class="sbtn danger" data-a="reset">${resetArm?'再按一次確認':'重置'}</button>`);
  }
  else if(cur==='spot'){
    shT.textContent='釣點';
    if(window.__HOME&&window.__HOME.unlocked()){ const HM=window.__HOME, hd=HM.data(), t=HM.tank();
      h+=row('🏠 老漁人的小屋',`${t.n} ${hd.fresh.length}/${t.cap}${hd.seaTank?'・海水缸 '+hd.sea.length+'/'+HM.seaT().cap:''}・標本 ${hd.mounts.length}/${HM.MOUNT_MAX}`,'<div class="bb"><button class="sbtn" data-a="homeP">管理</button><button class="sbtn pri" data-a="homeGo">回家</button></div>'); }
    if(!save.kayak) h+=row('🛶 獨木舟','買了才能划到湖裡的其他釣點','<button class="sbtn pri" data-a="kayak">🪙 800</button>');
    if(!save.yacht){ const ok=window.__STORY&&window.__STORY.done('c5'), m=save.mat||{}, need=BOAT_COST, have=k=>(m[k]||0)>=need[k];
      h+=ok?row('🛥️ 修復老漁人的漁船',`停在河口船塢的舊漁船，修好就能出海。需要 🪙 ${need.coins.toLocaleString()}、魚鱗 ${need.scale}（有 ${m.scale||0}）、魚骨 ${need.bone}（有 ${m.bone||0}）、珍珠 ${need.pearl}（有 ${m.pearl||0}）`,`<button class="sbtn pri" data-a="yacht"${save.coins>=need.coins&&have('scale')&&have('bone')&&have('pearl')?'':' disabled'}>修復</button>`)
          :row('🔒 ？？？的漁船','完成主線第六章「月潮」後，霜汐會告訴你它在哪裡','<span class="lk">第六章後</span>'); }
    { const tl=window.__TIDE, hh=(window.__G&&window.__G.hour)||0, low=tl&&tl.low(hh), nx=tl?tl.nextLow(hh):0;   // 潮間帶：退潮時才能去
      h+=row('🦀 蚵仔寮潮間帶',low?'退潮中！看泥面痕跡，挖文蛤、赤嘴蛤、竹蟶、海瓜子、沙蟹':'滿潮中，下次退潮 '+String(Math.floor(nx%24)).padStart(2,'0')+':'+(nx%1?'30':'00'),low?'<button class="sbtn pri" data-a="tide">下灘</button>':'<span class="lk">等退潮</span>'); }
    h+=SPOTS.map((s,i)=>{ const why=window.__STORY?window.__STORY.lock(i):null, lock=window.__STORY?!!why:(save.lv<s.lv||(s.req==='mer1'&&!(save.mer&&save.mer.n>=1))), need=(s.kayak&&!save.kayak)||(s.yacht&&!save.yacht), here=c.curSpot()===i;
      const btn=here?'<span class="eqd">目前位置</span>':lock?`<span class="lk">${why||(s.req?'需要美人魚的認可':'Lv '+s.lv+' 解鎖')}</span>`:need?`<span class="lk">${s.yacht?'需要遊艇':'需要獨木舟'}</span>`:`<button class="sbtn pri" data-a="go" data-v="${i}">${s.yacht?'出海':s.kayak?'划過去':'回碼頭'}</button>`;
      return row(lock?'🔒 '+(s.req?'？？？':s.name):(s.yacht?'🛥️ ':s.kayak?'🛶 ':s.loc==='ice'?'❄️ ':'🪵 ')+s.name,lock?(s.req?'只在月光下才看得見的地方':'跟著老漁人的手記前進，就會找到這裡'):s.sub,btn); }).join('');
  }
  shB.innerHTML=h;
  { const dsp=cur==='log'&&dexSel&&SPECIES.find(s=>s.id===dexSel); if(dsp) DEXV.show(dsp,$('dexCv'),!!save.dex[dsp.id]); else { DEXV.stop(); if(cur==='log') DEXV.thumbs(SPECIES.map(s=>[s,!!save.dex[s.id]])); } }
}
// 圖鑑詳細頁：未釣獲只給出沒線索，釣獲後顯示完整資料
const TIME_N={dawn:'清晨',day:'白天',dusk:'傍晚',night:'夜晚'}, STAT_N=[['pow','力量'],['spd','速度'],['agi','靈活'],['stam','耐力'],['jump','跳躍']];
const SPECIAL_N={golden:'傳說魚：極少出現，月光灣機率較高',moonkoi:'傳說魚：只在月光灣的特殊夜晚現身',king:'終章 Boss：深淵之王'};
function dexWhere(sp){ const L=sp.loc||'lake';
  const ok=SPOTS.filter(s=>(s.loc||'lake')===L||(s.loc==='ice'&&sp.ice));
  const best=ok.filter(s=>(s.aff[sp.id]||0)>=1.3).sort((a,b)=>b.aff[sp.id]-a.aff[sp.id]).map(s=>s.name);
  const area=L==='sea'?'海上（需要漁船）':L==='ice'?'冰湖':'濕地湖區'+(sp.ice?'、冰湖':'');
  if(sp.spots){ const only=SPOTS.filter(s=>sp.spots.includes(s.id)).map(s=>s.name); return {area:'只在'+only.join('、')+'出現',best:[]}; }   // 釣點專屬魚種
  return {area,best}; }
function dexPage(sp){ const d=save.dex[sp.id], r=RAR[sp.rar], wh=dexWhere(sp), tm=sp.time||{};
  const tmax=Math.max(...Object.values(tm),0), bestT=Object.keys(TIME_N).filter(k=>tm[k]&&tm[k]>=tmax*.9).map(k=>TIME_N[k]).join('、')||'不限';
  let h=`<button class="sbtn" data-a="dexback">← 返回列表</button>`;
  h+=`<div class="dexview${d?'':' sil'}"><canvas id="dexCv"></canvas><small>${d?'拖曳旋轉':'剪影'}</small></div>`;
  h+=`<div class="dexhd" style="--rc:${r.col}"><div><b>${d?sp.name:'？？？'}</b><small>${r.name}${d?'｜'+sp.sci:''}</small></div></div>`;
  h+=`<div class="dexsec">出沒地點：${wh.area}${wh.best.length?'<br>最佳釣點：'+wh.best.join('、'):''}<br>活躍時段：${bestT}${sp.special&&SPECIAL_N[sp.special]?'<br>'+SPECIAL_N[sp.special]:''}</div>`;
  if(!d){ h+='<div class="dexsec dim">還沒釣到這種魚，釣到後會解鎖外觀、介紹與完整資料。</div>'; return `<div style="--rc:${r.col}">${h}</div>`; }
  const W=x=>sp.k*Math.pow(x/100,3), wl=W(sp.len[0])*.9, wu=W(sp.len[1])*1.12, val=w=>Math.round(sp.price*Math.pow(w+.3,.85)*r.mult*.4);
  h+=`<div class="dexsec">${sp.desc||''}</div>`;
  if(window.__layerOf&&!sp.special) h+=`<div class="dexsec" style="opacity:.85">🎚️ 常在水層：${window.__LAYER_N[window.__layerOf(sp)]}</div>`;
  h+=`<div class="dexgrid"><span>體長</span><b>${sp.len[0]}–${sp.len[1]} 公分</b><span>體重</span><b>${fmtW(wl)}–${fmtW(wu)}</b><span>等級</span><b>LVL ${sp.lvl[0]}–${sp.lvl[1]}</b><span>參考售價</span><b>${sp.noSell?'保育類・不可販售':'🪙 '+val(wl).toLocaleString()+'–'+val(wu).toLocaleString()}</b><span>拉扯型態</span><b>${styOf(sp.id).n}</b></div>`;
  if(sp.f){ h+='<div class="dexsec">'+STAT_N.map(([k,n])=>{ const mx=Math.max(...SPECIES.map(s=>s.f?s.f[k]||0:0),.01), v=Math.min(1,(sp.f[k]||0)/mx);
    return `<div class="dexbar"><span>${n}</span><i><em style="width:${(v*100).toFixed(0)}%"></em></i></div>`; }).join('')+'</div>'; }
  h+=`<div class="dexgrid"><span>累計釣獲</span><b>${d.n} 尾</b><span>最重紀錄</span><b>${fmtW(d.bw)}</b>${d.bl?`<span>最長紀錄</span><b>${Math.round(d.bl*100)} 公分</b>`:''}${d.f?`<span>首次釣獲</span><b>${new Date(d.f).toLocaleDateString('zh-TW')}</b>`:''}</div>`;
  return `<div style="--rc:${r.col}">${h}</div>`; }
// 圖鑑 3D 預覽：用遊戲裡同一個魚模型（真實模型優先），以主渲染器畫到離屏目標再複製到頁面畫布；
// 只在詳細頁開著時運作，關閉即停止。未釣獲顯示黑色剪影。
const DEXV=(()=>{ const T=THREE, R=c.W.renderer; let scene,cam,rt,cv,ctx,img,buf,holder,obj,sp0,caught,raf=0,last=0,yaw=.55,pitch=.12,drag=null,idle=0,real=false,chk=0;
  const sil=new T.MeshBasicMaterial({color:0x000000});
  function ensure(){ if(scene) return; scene=new T.Scene();
    scene.add(new T.HemisphereLight(0xe8f2ff,0x40382c,1.15));
    const k=new T.DirectionalLight(0xffffff,1.7); k.position.set(2,3,4); scene.add(k);
    const f=new T.DirectionalLight(0xa8ccff,.7); f.position.set(-3,1,-3); scene.add(f);
    cam=new T.PerspectiveCamera(28,1,.01,50); holder=new T.Group(); holder.position.y=5; scene.add(holder); }
  const isReal=id=>!!(window.__MDL&&window.__MDL.fishReady&&window.__MDL.fishReady(id));
  function fitClone(sp){ const o=c.P.getFish(sp).group.clone(true); o.visible=true; o.position.set(0,0,0); o.rotation.set(0,0,0); o.scale.set(1,1,1);
    o.traverse(x=>{ x.visible=true; x.frustumCulled=false; });
    const bx=new T.Box3().setFromObject(o), sz=bx.getSize(new T.Vector3()), ct=bx.getCenter(new T.Vector3()), s=1/Math.max(sz.x,sz.y,sz.z,1e-3);
    o.scale.setScalar(s); o.position.copy(ct).multiplyScalar(-s); const w=new T.Group(); w.add(o); return w; }
  function build(){ if(obj){ holder.remove(obj); obj=null; }
    real=isReal(sp0.id); obj=fitClone(sp0); holder.add(obj); }
  function size(){ const dpr=Math.min(2,window.devicePixelRatio||1), W=Math.max(2,Math.round(cv.clientWidth*dpr)), H=Math.max(2,Math.round(cv.clientHeight*dpr));
    if(cv.width!==W||cv.height!==H){ cv.width=W; cv.height=H; img=ctx.createImageData(W,H); buf=new Uint8Array(W*H*4);
      if(rt) rt.dispose(); rt=new T.WebGLRenderTarget(W,H,{depthBuffer:true}); rt.texture.encoding=T.sRGBEncoding; cam.aspect=W/H; cam.updateProjectionMatrix(); } }
  function frame(t){ raf=requestAnimationFrame(frame); if(!cv||!cv.isConnected){ stop(); return; } if(t-last<33) return; const dt=Math.min(.1,(t-last)/1000); last=t;
    if((chk+=dt)>1&&!real&&window.__MDL&&window.__MDL.fishReady&&window.__MDL.fishReady(sp0.id)){ chk=0; build(); }   // 真實模型晚一步載好就換上
    if(!drag&&(idle+=dt)>1.5) yaw+=dt*.5;
    size(); obj.rotation.set(pitch,yaw,0); const W=cv.width,H=cv.height, dist=1.25/Math.tan(cam.fov*Math.PI/360)/Math.max(.8,Math.min(1.6,cam.aspect))*.5;
    cam.position.set(0,5,dist); cam.lookAt(0,5,0); scene.overrideMaterial=caught?null:sil;
    const pRT=R.getRenderTarget(), pSc=R.getScissorTest(), cc=R.getClearColor(new T.Color()), ca=R.getClearAlpha();
    R.setScissorTest(false); R.setRenderTarget(rt); R.setClearColor(0x000000,0); R.clear(); R.render(scene,cam);
    R.readRenderTargetPixels(rt,0,0,W,H,buf); R.setRenderTarget(pRT); R.setScissorTest(pSc); R.setClearColor(cc,ca);
    const row=W*4; for(let y=0;y<H;y++) img.data.set(buf.subarray((H-1-y)*row,(H-y)*row),y*row);   // 讀出來是上下顛倒的
    ctx.putImageData(img,0,0); }
  function bind(){ const P=e=>e.touches?e.touches[0]:e;
    cv.onpointerdown=e=>{ drag={x:e.clientX,y:e.clientY,yaw,pitch}; idle=0; cv.setPointerCapture&&cv.setPointerCapture(e.pointerId); };
    cv.onpointermove=e=>{ if(!drag) return; yaw=drag.yaw+(e.clientX-drag.x)*.012; pitch=Math.max(-.9,Math.min(.9,drag.pitch+(e.clientY-drag.y)*.008)); };
    cv.onpointerup=cv.onpointercancel=()=>{ drag=null; idle=0; }; }
  function show(sp,el,isCaught){ if(!el) return; ensure(); if(isCaught&&window.__MDL&&window.__MDL.want) window.__MDL.want(sp.id); const same=sp0===sp&&caught===isCaught; sp0=sp; caught=isCaught; cv=el; ctx=cv.getContext('2d'); img=null; cv.width=cv.height=0;
    if(!same||!obj){ build(); yaw=.55; pitch=.12; } chk=0; idle=0; bind(); if(!raf){ last=0; raf=requestAnimationFrame(frame); } }
  function stop(){ if(raf) cancelAnimationFrame(raf); raf=0; cv=null; }
  // 列表縮圖：一幀畫一隻，畫好存成圖片快取；真實模型之後才載好會自動重畫
  const BLANK='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', TW=168, TH=84, cache={};
  let trt,tq=[],traf=0,tcv,tctx,tbuf,timg;
  const key=(id,cg)=>id+(cg?'1':'0');
  function cached(id,cg){ const e=cache[key(id,cg)]; return e&&e.url; }
  function thumb1(sp,cg){ ensure(); if(!trt){ trt=new T.WebGLRenderTarget(TW,TH,{depthBuffer:true}); trt.texture.encoding=T.sRGBEncoding;
      tcv=document.createElement('canvas'); tcv.width=TW; tcv.height=TH; tctx=tcv.getContext('2d'); tbuf=new Uint8Array(TW*TH*4); timg=tctx.createImageData(TW,TH); }
    const o=fitClone(sp); o.rotation.set(.06,.22,0); const tg=new T.Group(); tg.position.y=-5; tg.add(o); scene.add(tg); holder.visible=false;
    const ca=new T.PerspectiveCamera(26,TW/TH,.01,50); ca.position.set(0,-5,1.16); ca.lookAt(0,-5,0); scene.overrideMaterial=cg?null:sil;
    const pRT=R.getRenderTarget(), pSc=R.getScissorTest(), cc=R.getClearColor(new T.Color()), cA=R.getClearAlpha();
    R.setScissorTest(false); R.setRenderTarget(trt); R.setClearColor(0x000000,0); R.clear(); R.render(scene,ca);
    R.readRenderTargetPixels(trt,0,0,TW,TH,tbuf); R.setRenderTarget(pRT); R.setScissorTest(pSc); R.setClearColor(cc,cA);
    scene.remove(tg); holder.visible=true; scene.overrideMaterial=null;
    const rw=TW*4; for(let y=0;y<TH;y++) timg.data.set(tbuf.subarray((TH-1-y)*rw,(TH-y)*rw),y*rw); tctx.putImageData(timg,0,0);
    return tcv.toDataURL('image/png'); }
  function tstep(){ traf=0; let n=0;
    while(tq.length&&n<1){ const [sp,cg]=tq.shift(), k=key(sp.id,cg), e=cache[k], rl=isReal(sp.id);
      if(e&&(e.real||!rl)) continue;   // 已有且不需要升級成真實模型
      try{ cache[k]={url:thumb1(sp,cg),real:rl}; }catch(err){ console.warn('thumb',sp.id,err); continue; }
      const im=document.querySelector('img[data-th="'+sp.id+'"]'); if(im&&cur==='log'&&!dexSel) im.src=cache[k].url; n++; }
    if(tq.length&&cur==='log'&&!dexSel) traf=requestAnimationFrame(tstep); else tq=[]; }
  function thumbs(list){ tq=list.slice(); if(!traf) traf=requestAnimationFrame(tstep); }
  return {show,stop,thumbs,cached,BLANK}; })();
// 魚獲紀錄：每一尾都留下魚種、尺寸、釣點、時段、天氣、餌、釣法、釣棚與去向，可以排序比較
let logMode='dex', logSort='new';
const ZN={dock:'木碼頭',lily:'浮萍灣',wood:'倒木區',deep:'深水中央',moon:'月光灣',reef:'近海礁岩',blue:'遠洋深藍',ice:'冰湖'};
const perOf=h=>h>=5&&h<8?'清晨':h>=8&&h<17?'白天':h>=17&&h<19.5?'黃昏':'夜晚';
function logList(){ const L=(save.catchLog||[]).slice(); if(!L.length) return '<div class="note">還沒有紀錄。從這次更新開始，每釣起一尾都會記在這裡。</div>';
  const sorts={new:(a,b)=>b.t-a.t,w:(a,b)=>b.w-a.w,L:(a,b)=>b.L-a.L,sp:(a,b)=>a.id<b.id?-1:a.id>b.id?1:b.w-a.w,z:(a,b)=>(a.z||'').localeCompare(b.z||'')||b.w-a.w}; L.sort(sorts[logSort]||sorts.new);
  let o='<div class="tabs" style="flex-wrap:wrap">'+[['new','最新'],['w','最重'],['L','最長'],['sp','魚種'],['z','釣點']].map(([k,n])=>`<button class="tab${logSort===k?' on':''}" data-a="logsort" data-v="${k}">${n}</button>`).join('')+'</div>';
  o+=`<div class="note" style="font-size:12px">共 ${L.length} 筆（最多保留 300 筆）</div>`;
  const PH=window.__photoGet?window.__photoGet():{};
  o+=L.slice(0,120).map(r=>{ const sp=SPECIES.find(s=>s.id===r.id), b=BAITS.find(x=>x.id===r.b), d=new Date(r.t);
    const tag=(r.new?'<b style="color:#7ff0a8">首次</b> ':'')+(r.rec?'<b style="color:#ffd56a">新紀錄</b> ':'');
    const img=PH[r.t]?`<img src="${PH[r.t]}" style="width:100%;max-width:220px;border-radius:8px;margin-top:4px;display:block">`:'';
    return row(`${sp?sp.name:r.id} ${tag}`,`${r.w>=1?r.w.toFixed(2)+' kg':Math.round(r.w*1000)+' g'}・${Math.round(r.L*100)} cm<br><small>${ZN[r.z]||r.z||''}・${perOf(r.h)}・${r.wx}・${b?b.name:'—'}・${r.m}${r.m==='浮標'||r.m==='沉底'?'・'+['淺棚','中層','深棚'][r.dp]:''}${r.ft!=null?'・搏魚 '+Math.round(r.ft)+' 秒':''}</small>${img}`,`<small>${r.out||''}<br>${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</small>`); }).join('');
  return o; }
function open(k){ document.body.classList.add('sheetOn'); cur=k; if(k==='log') dexSel=null; resetArm=false; render(); sheet.classList.remove('hidden'); }
window.__openSheet=k=>open(k);
function close(){ sheet.classList.add('hidden'); document.body.classList.remove('sheetOn'); cur=null; DEXV.stop(); }
$('bShop').addEventListener('click',()=>open('shop'));
$('bQuest').addEventListener('click',()=>open('quest'));
$('bLog').addEventListener('click',()=>open('log'));
$('bSet').addEventListener('click',()=>open('set'));
window.__SHEET={refresh:k=>{ if(cur===k) render(); }};
$('bMap').addEventListener('click',()=>open('spot'));
$('baitChip').addEventListener('click',()=>{ shopTab='bait'; open('shop'); });
$('shX').addEventListener('click',close);
sheet.addEventListener('click',e=>{ if(e.target===sheet) close(); });
shB.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a, v=b.dataset.v; Snd.init(); if(a==='diag'&&window.__DIAG){ if(v==='copy') window.__DIAG.copy().then(ok=>toast(ok?'已複製診斷資訊，可以直接貼上':'複製失敗，請截圖設定頁','good',2200)); else { window.__DIAG.clear(); toast('已清除錯誤記錄','good',1200); } render(); return; }
  if(a==='gfx'){ save.gfx=v; persist(); if(window.__applyGfx) window.__applyGfx(v); toast('畫質：'+({auto:'自動',high:'高',mid:'中',low:'低'})[v],'good',1200); render(); return; } if(ECO.click(a,v,GEAR)){ render(); syncHUD(); return; }
  if(a==='tab') shopTab=v;
  else if(a==='buy'){ const it=GEAR[shopTab][+v]; if(save.coins<it.price){ toast('金幣不夠','bad'); return; }
    save.coins-=it.price; save.gear[shopTab].push(+v); save.eq[shopTab]=+v; persist(); setCoins(); Snd.coin(); toast('已購買並裝備：'+it.name,'good'); applyRod(); }
  else if(a==='eq'){ save.eq[shopTab]=+v; persist(); applyRod(); }
  else if(a==='bb'){ const bt=BAITS[+v]; if(save.coins<bt.price){ toast('金幣不夠','bad'); return; }
    save.coins-=bt.price; save.baits[bt.id]=(save.baits[bt.id]||0)+bt.pack; persist(); setCoins(); Snd.coin(); }
  else if(a==='ub'){ save.bait=BAITS[+v].id; persist(); toast('改用'+BAITS[+v].name); }
  else if(a==='claim') claim(+v);
  else if(a==='homeP'){ cur='home'; render(); shB.scrollTop=0; return; }
  else if(a==='homeGo'){ close(); if(window.__goHome) window.__goHome(); return; }
  else if(a==='mapBack'){ cur='spot'; render(); return; }
  else if(a==='hrel'){ const [wt,i]=v.split(':'), f=window.__HOME.release(wt,+i); if(f) toast(wt==='mounts'?'取下了標本，牆上空出一個位置':'把'+((SPECIES.find(s=>s.id===f.id)||{}).name||'魚')+'放回湖裡了','good'); render(); return; }
  else if(a==='fup'){ const m=window.__HOME.furnUp(v); if(m) toast(m,'bad'); else { toast('升級好了：'+window.__HOME.furnInfo(v).cur.n,'good'); if(window.__HOMEFURN) window.__HOMEFURN(); } render(); syncHUD(); return; }
  else if(a==='fuse'){ if(v==='rock'&&window.__HOME.furnInfo('rock').cur.pick){ close(); if(window.__HOMETAP) window.__HOMETAP('rock'); return; } const r=window.__HOME.furnUse(v); if(r.msg) toast(r.msg,r.kind||'good',r.kind?1800:3200); if(v==='rock'&&window.__HOMEFURN) window.__HOMEFURN(); render(); syncHUD(); return; }
  else if(a==='hbuy'){ const m=window.__HOME.buy(v); toast(m||'買好了，已經裝進小屋',m?'bad':'good'); render(); syncHUD(); return; }
  else if(a==='dex'){ dexSel=v; render(); shB.scrollTop=0; return; }
  else if(a==='dexrg'){ window.__DEXRG=v; render(); shB.scrollTop=0; return; }
  else if(a==='logmode'){ logMode=v; dexSel=null; render(); shB.scrollTop=0; return; }
  else if(a==='logsort'){ logSort=v; render(); return; }
  else if(a==='mag'){ save.mag=v; persist(); render(); return; }
  else if(a==='dexback'){ dexSel=null; render(); return; }
  else if(a==='wx'){ save.wxMode=v; persist(); }
  else if(a==='kayak'){ if(save.coins<800){ toast('金幣不夠','bad'); return; } save.coins-=800; save.kayak=true; persist(); setCoins(); Snd.coin(); toast('買了獨木舟！可以划到其他釣點了','good'); }
  else if(a==='yacht'){ const need=BOAT_COST, m=save.mat=save.mat||{};   // 修復條件寫在動作本身
    if(!(window.__STORY&&window.__STORY.done('c5'))){ toast('還不知道漁船在哪裡（完成第六章後）','warn',2200); return; }
    if(save.coins<need.coins){ toast('金幣不夠','bad'); return; } if((m.scale||0)<need.scale||(m.bone||0)<need.bone||(m.pearl||0)<need.pearl){ toast('修船素材不夠','bad'); return; }
    save.coins-=need.coins; m.scale-=need.scale; m.bone-=need.bone; m.pearl-=need.pearl; save.yacht=true; persist(); setCoins(); Snd.coin(); toast('🛥️ 老漁人的漁船修好了！可以出海了','good',3000); }
  else if(a==='go'){ close(); c.goSpot(+v); return; }
  else if(a==='tide'){ close(); if(window.__goTide) window.__goTide(); return; }
  else if(a==='time'){ setHour(PRESETS[+v][0]); toast(PRESETS[+v][1]); }
  else if(a==='tg'){ if(v==='sound'){ Snd.set(!Snd.isOn()); save.sound=Snd.isOn(); } else if(v==='imm'){ save.imm=!save.imm; document.body.classList.toggle('immersive',save.imm); } else if(v==='scare'){ save.noScare=!save.noScare; } else save[v]=!(save[v]!==false); persist(); }
  else if(a==='diff'){ save.diff=v; persist(); toast('釣魚難度：'+DIFF[v].n); }
  else if(a==='shop'){ if(window.__SHOP) window.__SHOP(); }
  else if(a==='cloud'){ if(v==='in') window.__CLOUD.login(); else if(v==='rescue') window.__CLOUD.rescue(); else if(v==='comp') window.__CLOUD.compensate(); else if(v==='copy') window.__CLOUD.copyMain(); else window.__CLOUD.logout(); }
  else if(a==='tut'){ const sh=document.getElementById('sheet'); if(sh) sh.classList.add('hidden'); setTimeout(()=>startTutorial(true),300); return; }
  else if(a==='pwa'){ PWA.install().then(r=>{ if(r==='ios') toast('iPhone：按 Safari 的「分享」→「加入主畫面」','',4200); else if(r==='manual') toast('瀏覽器選單 ⋮ →「加到主畫面」或「安裝應用程式」','',4200); else if(r==='installed') toast('已經安裝了','',1600); }); }
  else if(a==='reset'){ if(!resetArm) resetArm=true; else { try{ localStorage.removeItem(window.__SAVE_KEY||'swampAngler.v1'); }catch(_){} location.reload(); return; } }
  render(); syncHUD();
});
fillQuests(); applyRod(); syncHUD(); document.body.classList.toggle('immersive',!!save.imm);
return { gear, useBait, onCatch, onRelease, syncHUD, addXP };
}
/* ===== 第 3 段 · 天氣、野生動物、獨木舟與釣點 ===== */
const SPOTS=[
 {id:'dock',name:'木碼頭',sub:'岸邊碼頭，各種魚都有一點',pos:[0,0],head:0,eye:2.4,kayak:false,lv:1,aff:{},size:1,rare:0},
 {id:'lily',name:'浮萍灣',sub:'睡蓮和水草多，黑鱸、太陽魚聚集',pos:[-7,-17],head:.25,eye:1.0,kayak:true,lv:2,aff:{bluegill:1.5,crappie:1.3,lmbass:1.7,smbass:1.4},size:1,rare:.1},
 {id:'wood',name:'倒木區',sub:'枯樹和沉木，鯰魚、弓鰭魚的地盤',pos:[-27,-22],head:-.45,eye:1.0,kayak:true,lv:4,aff:{channel:1.8,bowfin:2,flathead:1.8,perch:1.5},size:1.05,rare:.2},
 {id:'deep',name:'深水中央',sub:'最深的水域，大型魚出沒',pos:[6,-58],head:.1,eye:1.0,kayak:true,lv:6,aff:{gar:2.5,flathead:1.5,reba:1.3,channel:1.3},size:1.15,rare:.35},
 {id:'moon',name:'月光灣',sub:'美人魚透露的秘境，夜裡傳說生物頻繁出沒',pos:[-10,-40],head:.35,eye:1.0,kayak:true,lv:1,req:'mer1',aff:{mermaid:4,ghost:3,golden:2},size:1.2,rare:.6},
 {id:'reef',name:'近海礁岩',loc:'sea',sub:'藍綠色海水下的礁區，石斑、紅甘出沒',pos:[0,0],head:0,eye:3.2,kayak:false,yacht:true,lv:8,aff:{grouper:2,amber:2,ribbon:1.5},size:1.05,rare:.15},
 {id:'blue',name:'遠洋深藍',loc:'sea',sub:'一望無際的深藍外海，大型洄游魚與鯊魚的領域',pos:[0,0],head:0,eye:3.2,kayak:false,yacht:true,lv:12,aff:{tuna:2,marlin:2,mahi:2,shark:1.5,gwhite:1.2,sail:1.6},size:1.2,rare:.4},
 {id:'ice',name:'冰湖',loc:'ice',sub:'結冰的湖面，鑿開冰洞垂釣鱒魚與狗魚',pos:[0,0],head:0,eye:1.6,kayak:false,yacht:false,lv:10,aff:{trout:2,pike:1.6,bluegill:1.3,crappie:1.3},size:1,rare:.1}
];
const WXT={clear:{c:0,r:0,f:0,w:1.5,g:.3,n:'晴',i:'☀️'},breezy:{c:.25,r:0,f:0,w:5.5,g:.8,n:'晴有風',i:'🍃'},cloudy:{c:.75,r:0,f:.15,w:3,g:.5,n:'陰',i:'☁️'},drizzle:{c:.85,r:.4,f:.35,w:2,g:.3,n:'毛毛雨',i:'🌦️'},rain:{c:1,r:.8,f:.3,w:4,g:.6,n:'雨',i:'🌧️'},storm:{c:1,r:1,f:.45,w:9,g:1,n:'雷雨',i:'⛈️'},fog:{c:.45,r:0,f:1,w:.5,g:.1,n:'霧',i:'🌫️'}};

function createWild(W,P,Snd,save,toast,vib,ctx){
'use strict';
const T=THREE, S=W.scene;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t, rand=(a,b)=>a+Math.random()*(b-a);
function hashI(x,y){ let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function vn(x,y){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hashI(xi,yi), b=hashI(xi+1,yi), c=hashI(xi,yi+1), d=hashI(xi+1,yi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,o){ let s=0,a=.5,n=0; for(let i=0;i<o;i++){ s+=a*vn(x,y); n+=a; x=x*2.03+17.1; y=y*2.03+9.7; a*=.5; } return s/n; }
function dataTex(w,h,fn){ const d=new Uint8Array(w*h*4), o=[0,0,0,255];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ o[3]=255; fn(x/w,y/h,o); const i=(y*w+x)*4; for(let k=0;k<4;k++){ const v=o[k]; d[i+k]=v<0?0:v>255?255:v; } }
  const t=new T.DataTexture(d,w,h,T.RGBAFormat); t.wrapS=t.wrapT=T.RepeatWrapping; t.magFilter=T.LinearFilter; t.minFilter=T.LinearMipmapLinearFilter; t.generateMipmaps=true; t.encoding=T.sRGBEncoding; t.needsUpdate=true; return t; }
const fwd=(a,out)=>out.set(-Math.sin(a),0,-Math.cos(a));
const inShore=(v,bx,bz,m)=>{ for(let k=0;k<20;k++){ const r=Math.hypot(v.x,v.z), R=W.shoreR(Math.atan2(v.x,-v.z))-m; if(r<=R) break; v.x=bx+(v.x-bx)*.9; v.z=bz+(v.z-bz)*.9; } return v; };
let spotI=0, zoneI=0; const spd={};
const sp=()=>{ const s=SPOTS[spotI], b=ctx.base?ctx.base():null, z=SPOTS[zoneI]; spd.pos=b?[b.x,b.z]:s.pos; spd.head=ctx.head?ctx.head():s.head; spd.kayak=s.kayak; spd.yacht=!!s.yacht; spd.eye=s.eye; spd.aff=z.aff; spd.size=z.size; spd.rare=z.rare; return spd; };
const tv=new T.Vector3(), tv2=new T.Vector3(), cw=new T.Vector3();

/* ---------- 倒木區的枯樹與浮木 ---------- */
const barkTex=dataTex(64,128,(u,v,o)=>{ const n=fbm(u*12,v*3,3), k=.5+.7*n; o[0]=52*k; o[1]=46*k; o[2]=38*k; });
const snagMat=new T.MeshStandardMaterial({map:barkTex,roughness:.9});
// 倒木區的枯樹：改用實拍掃描的枯樹幹（Poly Haven dead_tree_trunk_02），斜插在水裡、露出半截，取代原本用圓柱拼出來的假樹
const SNAGQ=[]; let snagSrc=null;
function snag(x,z,h){ SNAGQ.push([x,z,h]); if(snagSrc) placeSnag(x,z,h); }
function placeSnag(x,z,h){ const o=snagSrc.clone(true), g=new T.Group(); g.add(o);
  const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), long=Math.max(sz.x,sz.y,sz.z);
  if(long===sz.x) o.rotation.z=Math.PI/2; else if(long===sz.z) o.rotation.x=Math.PI/2;   // 長軸立起來
  o.updateMatrixWorld(true); const b2=new T.Box3().setFromObject(o), c=b2.getCenter(new T.Vector3()); o.position.set(-c.x,-b2.min.y,-c.z);
  const sc=(h+1.2)/long; g.scale.setScalar(sc); g.position.set(x,-1.0,z); g.rotation.set(rand(-.35,.35),Math.random()*6.28,rand(.25,.55)*(Math.random()<.5?-1:1));
  // 水面以下的部分裁掉（水不夠透，水下的樹幹會讓整棵樹看起來浮在半空）；水線處加深成濕木色，並不時冒出一圈漣漪
  W.renderer.localClippingEnabled=true;
  g.traverse(m=>{ if(m.isMesh){ m.frustumCulled=true; m.castShadow=false; const conv=mm=>{ const k=mm.clone(); k.clippingPlanes=[SNAG_CLIP]; k.clipShadows=true;
      k.onBeforeCompile=sh=>{ sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying float vWY;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWY=(modelMatrix*vec4(transformed,1.0)).y;');
        sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vWY;').replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb*=mix(0.45,1.0,smoothstep(0.0,0.55,vWY));'); };
      return k; }; m.material=Array.isArray(m.material)?m.material.map(conv):conv(m.material); } });
  g.userData.lake=true; g.visible=!(W.isSea&&W.isSea()); S.add(g); SNAG_RIP.push([x,z]); }
const SNAG_CLIP=new T.Plane(new T.Vector3(0,1,0),.01), SNAG_RIP=[];
if(T.GLTFLoader) new T.GLTFLoader().load('dead_tree_trunk_02.glb',gl=>{ snagSrc=gl.scene; SNAGQ.forEach(a=>placeSnag(...a)); });
snag(-33,-30,5); snag(-22,-35,3.6); snag(-36,-17,6.5); snag(-18,-29,2.4); snag(-29,-39,4.2); snag(-40,-26,3.2);
// 原本的圓柱浮木拿掉（像一根黑色水管）；倒木區已有實拍的倒木、樹樁、枯枝

/* ---------- 黃色獨木舟與槳 ---------- */
let padG=null; const paddleTilt={x:0,z:0};
/* 槳掛在鏡頭上（永遠在胸前、轉頭也跟著）：鏡頭座標下方 .27、前方 .82；padOn＝握槳程度（0 握竿、1 握槳），划船時升起、停下後收回畫面下方 */
const PAD_Y=-.27, PAD_Z=-.82; let padOn=0;
const boat=new T.Group(); boat.visible=false; S.add(boat);
/* 原木獨木舟（依玩家設定圖生成）：載入後取代程式做的塑膠艇；船頭朝 −Z，長 4.2 米 */
if(T.GLTFLoader) new T.GLTFLoader().load('models/canoe.glb',g=>{ const o=g.scene; o.traverse(x=>{ if(x.isMesh){ const mp=x.material.map; if(mp){ mp.generateMipmaps=false; mp.minFilter=T.LinearFilter; } x.material=new T.MeshStandardMaterial({map:mp||null,vertexColors:!mp&&!!x.geometry.attributes.color,roughness:.85,metalness:0}); x.castShadow=false; } });
  const w=new T.Group(); w.add(o); w.rotation.y=Math.PI; w.updateMatrixWorld(true); let b=new T.Box3().setFromObject(w); const sz=b.getSize(new T.Vector3()); w.scale.set(.78/Math.max(sz.x,1e-6),.42/Math.max(sz.y,1e-6),4.2/Math.max(sz.z,1e-6));   // 長寬高分開縮放成真實獨木舟比例
  w.updateMatrixWorld(true); b=new T.Box3().setFromObject(w); const c=b.getCenter(new T.Vector3()); w.position.set(-c.x,-.2-b.min.y,-.35-c.z);
  boat.children.forEach(ch=>{ if(ch!==padG) ch.visible=false; }); boat.add(w); });   // 只藏舊塑膠艇的船身，槳要留著
{ const yel=new T.MeshStandardMaterial({color:0xf2b705,roughness:.32}), blk=new T.MeshStandardMaterial({color:0x151515,roughness:.6}), gry=new T.MeshStandardMaterial({color:0x33363b,metalness:.5,roughness:.4});
  const hull=new T.Mesh(new T.SphereGeometry(1,48,20),yel); hull.scale.set(.36,.22,1.95); hull.position.set(0,.02,-.15); boat.add(hull);
  const ridge=new T.Mesh(new T.SphereGeometry(1,24,10),yel); ridge.scale.set(.06,.05,1.2); ridge.position.set(0,.215,-.9); boat.add(ridge);
  const hatch=new T.Mesh(new T.CylinderGeometry(.12,.12,.025,24),blk); hatch.scale.z=1.35; hatch.position.set(0,.235,-.75); boat.add(hatch);
  for(const s of [1,-1]){ const b=new T.Mesh(new T.CylinderGeometry(.004,.004,.62,5),blk); b.rotation.set(Math.PI/2,0,s*.45); b.position.set(0,.232,-1.3); boat.add(b); }
  const rim=new T.Mesh(new T.TorusGeometry(.3,.025,8,24),blk); rim.scale.set(.85,1.6,1); rim.rotation.x=Math.PI/2; rim.position.set(0,.22,.2); boat.add(rim);
  const pad=new T.Group(); pad.position.set(0,PAD_Y-.6,PAD_Z); pad.visible=false; W.camera.add(pad); padG=pad;
  /* 木槳（配原木獨木舟）：木色槳桿、兩端橢圓槳葉 */
  const wood=new T.MeshStandardMaterial({color:0x8a5a32,roughness:.7}), woodD=new T.MeshStandardMaterial({color:0x6e4524,roughness:.75});
  const sh=new T.Mesh(new T.CylinderGeometry(.018,.018,2.1,8),wood); sh.rotation.z=Math.PI/2; pad.add(sh);
  for(const s of [1,-1]){ const bl=new T.Mesh(new T.SphereGeometry(1,20,8),woodD); bl.scale.set(.24,.012,.085); bl.position.x=s*1.22; bl.rotation.x=s*.25; pad.add(bl);
    const nk=new T.Mesh(new T.CylinderGeometry(.018,.03,.12,8),wood); nk.rotation.z=Math.PI/2; nk.position.x=s*1.0; pad.add(nk); } }

/* ---------- 雨絲 ---------- */
const NR=1400, rpos=new Float32Array(NR*6), roff=new Float32Array(NR*3);
for(let i=0;i<NR;i++){ roff[i*3]=rand(-10,10); roff[i*3+1]=rand(-2,12); roff[i*3+2]=rand(-10,10); }
const rgeo=new T.BufferGeometry(); rgeo.setAttribute('position',new T.BufferAttribute(rpos,3));
const rmat=new T.LineBasicMaterial({color:0xb8c4cc,transparent:true,opacity:0,depthWrite:false});
const rainL=new T.LineSegments(rgeo,rmat); rainL.frustumCulled=false; rainL.visible=false; S.add(rainL);

/* ---------- 鱷魚 ---------- */
const gskin=dataTex(64,64,(u,v,o)=>{ const n=fbm(u*10,v*10,3), cx=u*12-Math.floor(u*12)-.5, cy=v*8-Math.floor(v*8)-.5, bump=1-Math.min(1,Math.hypot(cx,cy*1.3)*2);
  const k=.45+.5*n+.25*bump; o[0]=46*k; o[1]=49*k; o[2]=33*k; });
const gm=new T.MeshStandardMaterial({map:gskin,roughness:.5});
const gEye=new T.MeshStandardMaterial({color:0x2a2410,roughness:.08,emissive:0xff6a10,emissiveIntensity:0});
const gator=new T.Group(); gator.visible=false; S.add(gator);
{ const hd=new T.Mesh(new T.SphereGeometry(1,28,12),gm); hd.scale.set(.17,.07,.58); gator.add(hd);
  for(const s of [1,-1]){ const eb=new T.Mesh(new T.SphereGeometry(.055,14,8),gm); eb.scale.y=.8; eb.position.set(s*.085,.04,-.22); gator.add(eb);
    const e=new T.Mesh(new T.SphereGeometry(.027,12,8),gEye); e.position.set(s*.088,.076,-.2); gator.add(e); }
  const no=new T.Mesh(new T.SphereGeometry(.035,12,8),gm); no.scale.set(1.3,.6,1); no.position.set(0,.035,.5); gator.add(no);
  for(let i=0;i<14;i++){ const k=1-i/18, sc=new T.Mesh(new T.SphereGeometry(.055*k,10,6),gm); sc.scale.set(1,.45,1.4); sc.position.set(i<9?(i%2?.11:-.11)*k:0,-.008,-.78-i*.23); gator.add(sc); } }
const gH=window.__MDL?window.__MDL.attach(gator,'gator',{len:3.3,target:'+z',top:.07}):null;
// 鱷魚游動：模型沒有骨架，用頂點著色器做身體的 S 形擺動（頭幾乎不動、越往尾巴擺越大，波從頭傳到尾）
const GU={uGT:{value:0},uGA:{value:.3}}; let gPatched=false, gYaw=0, gYawInit=false;
function patchGator(){ if(gPatched) return; let hit=false;
  gator.traverse(o=>{ if(!o.isMesh||!o.material||o.userData.gw) return; o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox; if(bb.max.x-bb.min.x<2) return; hit=true; o.userData.gw=1;
    const head=bb.max.x, len=bb.max.x-bb.min.x, m=o.material=o.material.clone();
    m.onBeforeCompile=sh=>{ sh.uniforms.uGT=GU.uGT; sh.uniforms.uGA=GU.uGA;
      sh.vertexShader='uniform float uGT;\nuniform float uGA;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float tl_=clamp((${head.toFixed(3)}-position.x)/${len.toFixed(3)},0.0,1.0);
        float w_=0.05+0.95*pow(tl_,1.6);
        transformed.z+=uGA*w_*${(len*0.11).toFixed(3)}*sin(uGT-tl_*6.2);
        transformed.y+=uGA*${(len*0.006).toFixed(3)}*sin(uGT*0.5+tl_*2.0);`); };
    m.customProgramCacheKey=()=>'gatorswim'; m.needsUpdate=true; });
  if(hit) gPatched=true; }
let gs={mode:'off'}, gTimer=rand(40,90), gRip=0, chaseDelay=-1, chaseGet=null, stolenF=false;
const gS=new T.Vector3(), gE=new T.Vector3(), gP=new T.Vector3();
function placeGator(p,yaw){ gator.position.set(p.x,-.03+Math.sin(performance.now()*.0015)*.008,p.z);
  if(!gYawInit||!gator.visible){ gYaw=yaw; gYawInit=true; } else { let d=yaw-gYaw; while(d>Math.PI) d-=Math.PI*2; while(d<-Math.PI) d+=Math.PI*2; gYaw+=d*Math.min(1,.016*3); }
  gator.rotation.y=gYaw+Math.sin(GU.uGT.value)*.04*GU.uGA.value; gator.visible=true; }
function spawnPass(){ const s=sp(), bx=s.pos[0], bz=s.pos[1], sg=Math.random()<.5?1:-1;
  gS.copy(fwd(s.head-.75*sg,tv)).multiplyScalar(rand(24,32)).add(tv2.set(bx,0,bz)); inShore(gS,bx,bz,4);
  gE.copy(fwd(s.head+.75*sg,tv)).multiplyScalar(rand(24,32)).add(tv2.set(bx,0,bz)); inShore(gE,bx,bz,4);
  gs={mode:'pass',t:0,dur:gS.distanceTo(gE)/.55}; gP.copy(gS); if(gS.distanceTo(tv2.set(bx,0,bz))<26) Snd.gator(); }
/* ===== 鱷魚鬧場：直接衝向玩家；獨木舟可以撞開，碼頭上連拍水面嚇走 ===== */
const tapB=document.createElement('button'); tapB.id='gatorTap'; tapB.className='hidden'; tapB.textContent='🪵 拍水'; document.body.appendChild(tapB);
const tcss=document.createElement('style'); tcss.textContent='#gatorTap{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 190px);transform:translateX(-50%);z-index:7;padding:14px 26px;border-radius:999px;border:2px solid #ffb4a0;background:#c0392b;color:#fff;font-size:18px;font-weight:900;box-shadow:0 0 24px rgba(255,80,60,.7);animation:gtp .5s ease-in-out infinite alternate}#gatorTap.hidden{display:none}@keyframes gtp{to{transform:translateX(-50%) scale(1.08)}}';
document.head.appendChild(tcss);
let taps=0; tapB.addEventListener('pointerdown',e=>{ e.preventDefault(); if(gs.mode!=='raid') return; taps++; Snd.splash&&Snd.splash(.6); const b=ctx.base(); P.splash(b.x+Math.sin(ctx.head())*-1.2,0,b.z-Math.cos(ctx.head())*1.2,6,.4); vib(15); if(taps>=6) gatorFlee('scare'); });
function raidOk(){ const s=sp(); return !(ctx.loc&&ctx.loc()!=='lake')&&ctx.state&&['idle','wait'].indexOf(ctx.state())>=0&&!s.yacht; }
function spawnRaid(dist){ const b=ctx.base(), s=sp(), side=Math.random()<.5?1:-1, a=ctx.head()+side*rand(.25,.7), D=dist||16;
  gP.set(b.x-Math.sin(a)*D,0,b.z-Math.cos(a)*D); inShore(gP,b.x,b.z,4); gs={mode:'raid',t:0,d:16}; taps=0;
  Snd.gator(); vib([80,60,80,60,120]); W.addRipple(gP.x,gP.z,1.2);
  if(!save.gatorTip){ save.gatorTip=1; setTimeout(()=>toast(s.kayak?'🛶 划船撞開牠！':'🪵 快拍水嚇走牠！','warn',2600),900); }   // 只在第一次遇到時提示一次   // 不用文字宣告，只靠叫聲、震動、水紋讓玩家自己察覺
  if(!s.kayak) tapB.classList.remove('hidden'); }
function gatorFlee(why){ const b=ctx.base(); tapB.classList.add('hidden'); gs={mode:'flee',t:0,dir:tv3.subVectors(gP,b).setY(0).normalize().clone(),why};
  P.splash(gP.x,0,gP.z,why==='ram'?40:22,why==='ram'?1.4:.9); W.addRipple(gP.x,gP.z,why==='ram'?1.4:.9); vib(why==='ram'?[150,40,200]:[60,40,90]);
  if(ctx.onScare) ctx.onScare(why); }
const tv3=new T.Vector3(), bow=new T.Vector3();
function updateGator(dt){
  if(gator.visible){ patchGator(); const fast=gs.mode==='chase'||gs.mode==='raid'||gs.mode==='flee', slow=gs.mode==='sink'||gs.mode==='off';
    const tf=fast?7.5:slow?1.2:3.2, ta=fast?1:slow?.15:.5; GU.uGA.value+=(ta-GU.uGA.value)*Math.min(1,dt*2.5); GU.uGT.value+=dt*tf; }
  if((W.isSea&&W.isSea())||(ctx.loc&&ctx.loc()==='ice')){ gator.visible=false; if(gs.mode==='raid') tapB.classList.add('hidden'); return; }   // 海上、冰湖沒有鱷魚
  if(gs.mode==='off'){ if(chaseDelay<0){ gTimer-=dt; if(gTimer<=0){ if(raidOk()&&Math.random()<.35) spawnRaid(); else spawnPass(); gTimer=rand(55,140); } } }
  else if(gs.mode==='raid'){ gs.t+=dt; const b=ctx.base(); tv.subVectors(b,gP); tv.y=0; const d=tv.length(); tv.normalize(); gs.d=d;
    const spd=d<4?2.6:1.2+.04*gs.t; gP.addScaledVector(tv,Math.min(d,spd*dt)); placeGator(gP,Math.atan2(tv.x,tv.z)); gator.rotation.x=d<4?-.22*Math.sin(gs.t*9):0;   // 最後 4 米撲上來
    const k=ctx.kayak?ctx.kayak():null;
    if(k&&k.on&&k.v>.55){ bow.set(b.x-Math.sin(k.yaw)*1.6,0,b.z-Math.cos(k.yaw)*1.6); if(bow.distanceTo(tv3.set(gP.x,0,gP.z))<1.7){ gator.rotation.x=0; gatorFlee('ram'); return; } }   // 獨木舟夠快撞上 → 撞開
    if(d<1.4){ gator.rotation.x=0; tapB.classList.add('hidden'); if(ctx.onBite) ctx.onBite(gP); P.splash(gP.x,0,gP.z,30,1.1); gs={mode:'leave',t:0,dir:tv.clone().negate()}; }
    if(gs.mode==='raid'&&gs.t>40){ tapB.classList.add('hidden'); gs={mode:'sink',t:0}; } }
  else if(gs.mode==='flee'){ gs.t+=dt; gP.addScaledVector(gs.dir,dt*3.2); placeGator(gP,Math.atan2(gs.dir.x,gs.dir.z)); gator.rotation.z=gs.why==='ram'&&gs.t<.8?Math.sin(gs.t*20)*.6:0;
    if(gs.t>2.4){ gator.rotation.z=0; gs={mode:'sink',t:0}; } }
  else if(gs.mode==='pass'){ gs.t+=dt; const s=gs.t/gs.dur; gP.copy(gS).lerp(gE,Math.min(1,s)); placeGator(gP,Math.atan2(gE.x-gS.x,gE.z-gS.z)); if(s>=1) gs={mode:'sink',t:0}; }
  else if(gs.mode==='chase'){ const tg=chaseGet(); tv.subVectors(tg,gP); tv.y=0; const d=tv.length(); tv.normalize();
    gP.addScaledVector(tv,Math.min(d,1.15*dt)); placeGator(gP,Math.atan2(tv.x,tv.z)); gs.d=d;
    if(d<1.1){ stolenF=true; gs={mode:'sink',t:0}; vib([100,50,150]); } }
  else if(gs.mode==='leave'){ gs.t+=dt; gP.addScaledVector(gs.dir,dt); placeGator(gP,Math.atan2(gs.dir.x,gs.dir.z)); if(gs.t>3) gs={mode:'sink',t:0}; }
  else if(gs.mode==='sink'){ gs.t+=dt; gator.position.y-=dt*.12; if(gs.t>1.6){ gator.visible=false; gs={mode:'off'}; } }
  if(gator.visible&&gs.mode!=='sink'){ const fast=gs.mode==='chase'||gs.mode==='raid'||gs.mode==='flee'; gRip-=dt; if(gRip<=0){ W.addRipple(gator.position.x,gator.position.z,fast?.3:.14); gRip=fast?.45:1.7; } }
  if(chaseDelay>0){ chaseDelay-=dt; if(chaseDelay<=0){ chaseDelay=-1; const fp=chaseGet(), s=sp();
      tv.set(fp.x-s.pos[0],0,fp.z-s.pos[1]).normalize(); const side=Math.random()<.5?1:-1;
      gP.set(fp.x+tv.x*12+tv.z*side*5,0,fp.z+tv.z*12-tv.x*side*5); inShore(gP,fp.x,fp.z,3);
      gs={mode:'chase',d:99}; toast('⚠️ 鱷魚盯上你的魚了！快收線！','bad',2400); Snd.gator(); vib([60,60,60]); } }
}

/* ---------- 老鷹 ---------- */
const eagle=new T.Group(); eagle.visible=false; S.add(eagle);
const lw=new T.Group(), rw=new T.Group();
{ const eb=new T.MeshStandardMaterial({color:0x3a2818,roughness:.8,side:T.DoubleSide}), ew=new T.MeshStandardMaterial({color:0xece6d6,roughness:.7,side:T.DoubleSide}), ey=new T.MeshStandardMaterial({color:0xe0b030,roughness:.5});
  const bd=new T.Mesh(new T.SphereGeometry(1,16,10),eb); bd.scale.set(.15,.13,.42); eagle.add(bd);
  const hd=new T.Mesh(new T.SphereGeometry(.09,12,8),ew); hd.position.set(0,.05,.42); eagle.add(hd);
  const bk=new T.Mesh(new T.ConeGeometry(.028,.09,8),ey); bk.rotation.x=Math.PI/2; bk.position.set(0,.03,.53); eagle.add(bk);
  const ts=new T.Shape(); ts.moveTo(-.05,0); ts.lineTo(-.14,-.3); ts.lineTo(.14,-.3); ts.lineTo(.05,0); const tg=new T.ShapeGeometry(ts); tg.rotateX(Math.PI/2);
  const tl=new T.Mesh(tg,ew); tl.position.set(0,0,-.36); eagle.add(tl);
  const ws=new T.Shape(); ws.moveTo(0,-.12); ws.lineTo(.45,-.2); ws.lineTo(.85,-.14); ws.lineTo(1.0,-.06); ws.lineTo(1.03,0); ws.lineTo(.97,.04); ws.lineTo(1.0,.07); ws.lineTo(.9,.1); ws.lineTo(.6,.16); ws.lineTo(.2,.18); ws.lineTo(0,.15);
  const wg=new T.ShapeGeometry(ws); wg.rotateX(Math.PI/2);
  const l=new T.Mesh(wg,eb); lw.add(l); lw.position.set(.1,.03,0); eagle.add(lw);
  const r=new T.Mesh(wg,eb); r.scale.x=-1; rw.add(r); rw.position.set(-.1,.03,0); eagle.add(rw); }
if(window.__MDL) window.__MDL.attach(eagle,'eagle',{len:.95,target:'+z'});
let ea={mode:'off'}, eTimer=rand(45,100);
const eC=new T.Vector3(), eP=new T.Vector3(), eV=new T.Vector3(), e0=new T.Vector3(), e1=new T.Vector3(), eT=new T.Vector3();
function updateEagle(dt,t){
  const s=sp(), base=tv2.set(s.pos[0],0,s.pos[1]);
  if(ea.mode==='off'){ eTimer-=dt; if(eTimer<=0){ eTimer=rand(70,160); if(W.info.day>.5&&cur.r<.5){
      eC.copy(fwd(s.head+rand(-.5,.5),tv)).multiplyScalar(rand(35,55)).add(base); ea={mode:'circle',t:0,life:rand(12,20),R:rand(22,32),ang:rand(0,6.283),dive:Math.random()<.65,yell:false}; } } return; }
  const prev=tv.copy(eP); ea.t+=dt; let flap=0;
  if(ea.mode==='circle'){ ea.ang+=dt*.28; eP.set(eC.x+Math.cos(ea.ang)*ea.R,26+Math.sin(ea.t*.5)*2,eC.z+Math.sin(ea.ang)*ea.R); flap=Math.sin(ea.t*.35)>.55?1:0;
    if(!ea.yell&&ea.t>3){ ea.yell=true; Snd.eagle(); }
    if(ea.t>ea.life){ if(ea.dive){ e0.copy(eP); eT.copy(fwd(s.head+rand(-.35,.35),eV)).multiplyScalar(rand(14,28)).add(base); eT.y=.25; ea={mode:'dive',t:0}; Snd.eagle(); }
      else { e0.copy(eP); e1.copy(eP).add(eV.set(eP.x-base.x,0,eP.z-base.z).normalize().multiplyScalar(260)); e1.y=60; ea={mode:'exit',t:0}; } } }
  else if(ea.mode==='dive'){ const k=Math.min(1,ea.t/3.2), a=(1-k)*(1-k), b=2*(1-k)*k, c=k*k;
    eP.set(a*e0.x+b*eT.x+c*eT.x, a*e0.y+b*e0.y*.55+c*eT.y, a*e0.z+b*eT.z+c*eT.z); flap=-1;
    if(k>=1){ P.splash(eT.x,0,eT.z,45,1.3); W.addRipple(eT.x,eT.z,1); Snd.splash(1); e0.copy(eT); e1.copy(eT).addScaledVector(fwd(s.head,eV),45); e1.y=32; ea={mode:'climb',t:0}; } }
  else if(ea.mode==='climb'){ const k=Math.min(1,ea.t/3.5); eP.copy(e0).lerp(e1,k*k*(3-2*k)); flap=2; if(k>=1){ e0.copy(eP); e1.copy(eP).addScaledVector(fwd(s.head,eV),220); e1.y=70; ea={mode:'exit',t:0}; } }
  else if(ea.mode==='exit'){ const k=Math.min(1,ea.t/9); eP.copy(e0).lerp(e1,k); flap=1; if(k>=1){ eagle.visible=false; ea={mode:'off'}; return; } }
  eagle.visible=true; eagle.position.copy(eP); eV.subVectors(eP,prev);
  if(eV.lengthSq()>1e-8){ eagle.lookAt(tv.copy(eP).add(eV)); if(ea.mode==='circle') eagle.rotateZ(-.35); }
  const fa=flap===-1?-.15:flap===0?Math.sin(t*1.5)*.05+.08:Math.sin(t*(flap===2?11:7))*.6;
  lw.rotation.z=fa; rw.rotation.z=-fa;
}

/* ---------- 天氣 ---------- */
let wxType=WXT[save.wxCur]?save.wxCur:'cloudy', wxT=rand(45,90);
const onIce=()=>window.__G&&window.__G.loc==='ice', SNOWN={drizzle:['小雪','🌨️'],rain:['下雪','❄️'],storm:['暴風雪','🌨️']};
const wxName=k=>onIce()&&SNOWN[k]?SNOWN[k][0]:WXT[k].n, wxEmo=k=>onIce()&&SNOWN[k]?SNOWN[k][1]:WXT[k].i;
const cur={c:WXT[wxType].c,r:WXT[wxType].r,f:WXT[wxType].f,w:WXT[wxType].w};
let windAng=Math.random()*6.283, windNow=1, wt=0;
let thT=rand(20,40), flash=0, sT=rand(3,8), lastIcon='';
const wxIcon=$id=>document.getElementById($id);
function pickWx(){ for(let k=0;k<8;k++){ const n=pickWx0(); if(n!==wxType) return n; } return 'cloudy'; }
function pickWx0(){ let r=Math.random(); if(ctx.period()==='dawn'&&r<.3) return 'fog'; r=Math.random(); for(const [k,w] of [['clear',.3],['breezy',.15],['cloudy',.18],['drizzle',.1],['rain',.12],['storm',.06],['fog',.09]]){ r-=w; if(r<=0) return k; } return 'clear'; }
let wxPend=null;
function updateWeather(dt){
  const mode=save.wxMode||'auto';
  if(mode!=='auto'&&WXT[mode]) wxType=mode;
  else { wxT-=dt; if(wxT<=0){ const n=pickWx(); if(n!==wxType){ wxType=n; const tg0=WXT[n]; wxPend={n,d0:Math.max(.05,Math.abs(tg0.c-cur.c)+Math.abs(tg0.r-cur.r)+Math.abs(tg0.f-cur.f))}; } wxT=rand(70,150); save.wxCur=wxType; } }
  const tg=WXT[wxType], k=Math.min(1,dt*.22);
  cur.c+=(tg.c-cur.c)*k; cur.r+=(tg.r-cur.r)*k; cur.f+=(tg.f-cur.f)*k;
  // 天空、雨、霧真的變化過半時才提示，不會提示「轉晴」時還在下大雨
  if(wxPend){ const d=Math.abs(tg.c-cur.c)+Math.abs(tg.r-cur.r)+Math.abs(tg.f-cur.f); if(wxPend.n!==wxType) wxPend=null; else if(d<wxPend.d0*.45){ toast('天氣轉為'+wxName(wxType)+' '+wxEmo(wxType)); wxPend=null; } }
  wt+=dt; cur.w+=(tg.w-cur.w)*k; windAng+=dt*.012*Math.sin(wt*.05);
  windNow=Math.max(0,cur.w*(1+tg.g*(Math.sin(wt*.37)*.35+Math.sin(wt*1.13+1.7)*.25+Math.sin(wt*2.9+.4)*.12)));
  W.setWind(Math.cos(windAng),Math.sin(windAng),clamp(windNow*(W.isSea&&W.isSea()?1.6:1)/12,0,1));   // 海上沒有遮蔽，風比湖上大
  W.setWeather(cur.c,cur.r,cur.f); Snd.rain(cur.r);
  if(wxType==='storm'&&cur.r>.7){ thT-=dt; if(thT<=0){ thT=rand(25,60); flash=1; setTimeout(()=>Snd.thunder(),rand(300,1600)); } }
  if(flash>0){ W.renderer.toneMappingExposure*=1+flash*(Math.random()<.5?2.2:1.2); flash=Math.max(0,flash-dt*4); }
  const ic=((W.info.day<.2&&cur.c<.4)?(window.__MOONPH?window.__MOONPH.emo():'🌙'):wxEmo(wxType))+' '+Math.round(windNow*(W.isSea&&W.isSea()?1.6:1))+'m/s'; if(ic!==lastIcon){ lastIcon=ic; const el=wxIcon('wxI'); if(el) el.textContent=ic; }
}
function updateRain(dt){
  if(cur.r<.02||(window.__G&&window.__G.loc==='ice')){ rainL.visible=false; return; }
  rainL.visible=true; W.camera.getWorldPosition(cw); rainL.position.copy(cw);
  const ws=clamp(windNow/12,0,1), wvx=Math.cos(windAng)*ws, wvz=Math.sin(windAng)*ws;
  for(let i=0;i<NR;i++){ let y=roff[i*3+1]-dt*10; roff[i*3]+=wvx*dt*6; roff[i*3+2]+=wvz*dt*6; if(roff[i*3]>10) roff[i*3]-=20; if(roff[i*3]<-10) roff[i*3]+=20; if(roff[i*3+2]>10) roff[i*3+2]-=20; if(roff[i*3+2]<-10) roff[i*3+2]+=20; if(cw.y+y<-.1) y+=14; roff[i*3+1]=y; const x=roff[i*3], z=roff[i*3+2];
    rpos[i*6]=x; rpos[i*6+1]=y; rpos[i*6+2]=z; rpos[i*6+3]=x-wvx*.35+.01; rpos[i*6+4]=y+.38; rpos[i*6+5]=z-wvz*.35; }
  rgeo.attributes.position.needsUpdate=true; rmat.opacity=.45*cur.r; rmat.color.setScalar(.75*clamp(W.info.light,.2,1));
}

const OBST=[[-33,-30,.6],[-22,-35,.6],[-36,-17,.6],[-18,-29,.6],[-29,-39,.6],[-40,-26,.6],[-24,-28,1.8]];
let padPh=0; const bladeW=new T.Vector3();
// 到了某個釣點（含划獨木舟進入該區域）才下載這裡的專屬魚模型，不在一開始全部下載
function wantSpot(i){ const id=SPOTS[i]&&SPOTS[i].id; if(!id||!window.__MDL||!window.__MDL.want) return;
  P.SPECIES.forEach(sp=>{ if(sp.spots&&sp.spots.includes(id)) window.__MDL.want(sp.id); }); }
function paddle(dt,k,ringFn){
  if(!padG) return;
  padOn+=((k>.05?1:0)-padOn)*Math.min(1,dt*(k>.05?5:2.2)); padG.visible=padOn>.01;
  const low=(1-padOn)*.6;   // 還沒完全握好時槳在畫面下方
  if(k>.05){ const prev=Math.sin(padPh); padPh+=dt*(4.5+k*2.5); const sn=Math.sin(padPh);
    padG.rotation.z=sn*.4; padG.rotation.y=Math.cos(padPh)*.3; padG.position.y=PAD_Y-low+.04-Math.abs(sn)*.05; paddleTilt.z=sn*.025*k; paddleTilt.x=-.01*k;
    if(padOn>.6&&((prev<.85&&sn>=.85)||(prev>-.85&&sn<=-.85))){ bladeW.set(sn>0?-1.25:1.25,-.25,0); padG.localToWorld(bladeW);
      P.splash(bladeW.x,0,bladeW.z,10,.6); if(ringFn) ringFn(bladeW.x,bladeW.z,.5); Snd.paddle(); } }
  else { padG.rotation.z*=.9; padG.rotation.y*=.9; padG.position.y+=(PAD_Y-low-padG.position.y)*.15; paddleTilt.z*=.9; paddleTilt.x*=.9; }
}
const padGrip=(side,out)=>padG?padG.localToWorld(out.set(side==='L'?-.28:.28,0,0)):out;   // 兩手握在槳桿中段左右
let snagRipT=0;
function update(dt,t){
  snagRipT-=dt; if(snagRipT<=0&&SNAG_RIP.length&&!(W.isSea&&W.isSea())){ snagRipT=.7+Math.random()*.9; const r=SNAG_RIP[Math.floor(Math.random()*SNAG_RIP.length)]; W.addRipple(r[0]+(Math.random()-.5)*.4,r[1]+(Math.random()-.5)*.4,.22); }   // 樹幹入水處的小漣漪
  const s=sp(), bx=s.pos[0], bz=s.pos[1];
  if(s.kayak){ const sw=W.swell(bx,bz,t)*2.2; boat.visible=true; boat.position.set(bx,sw,bz); boat.rotation.set(Math.sin(t*1.3)*.012+paddleTilt.x,s.head,Math.sin(t*1.1)*.02+paddleTilt.z);
    W.player.position.set(bx,s.eye+sw,bz); W.head.rotation.z=Math.sin(t*1.1)*.012+paddleTilt.z*.5; }
  else if(s.yacht){ boat.visible=false; const sw=W.swell(bx,bz,t)*.9; W.player.position.set(bx,s.eye+sw,bz); W.head.rotation.z=(W.swell(bx+1.5,bz,t)-W.swell(bx-1.5,bz,t))*-.12; }
  else { boat.visible=false; W.player.position.set(0,2.4,0); W.head.rotation.z=0; }
  updateWeather(dt); updateRain(dt); updateGator(dt); updateEagle(dt,t);
  gEye.emissiveIntensity=(1-W.info.day)*2.2;
  sT-=dt; if(sT<=0){ sT=rand(3,9); if(cur.r<.5){ const per=ctx.period(); if(per==='night'||per==='dusk') Snd.frog(); else Snd.bird(); } }
}
return {
  update, paddle, padOn:()=>padOn, padGrip, obstacles:OBST, setZone(i){ zoneI=i; wantSpot(i); }, zoneId:()=>SPOTS[zoneI].id, setSpot(i){ spotI=i; zoneI=i; wantSpot(i); gs={mode:'off'}; gator.visible=false; tapB.classList.add('hidden'); },
  raid:dist=>{ if(gs.mode==='off'&&raidOk()){ spawnRaid(dist); return true; } return false; }, gatorMode:()=>gs.mode,
  spotAff:id=>sp().aff[id]||1, sizeB:()=>sp().size, rareB:()=>sp().rare+.15*cur.f,
  wxAff(id){ let m=1; if(cur.r>.5&&['lmbass','smbass','channel','bowfin'].includes(id)) m*=1.3; if(cur.c>.5&&['lmbass','smbass'].includes(id)) m*=1.15; return m; },
  waitK:()=>1-.2*cur.r,
  wind:()=>({x:Math.cos(windAng),z:Math.sin(windAng),s:clamp(windNow/12,0,1),speed:windNow}),
  wx:()=>({c:cur.c,r:cur.r,f:cur.f,type:wxType}),
  onHook(fd,get){ chaseGet=get; stolenF=false; chaseDelay=(fd.sp.rar>=1&&Math.random()<.22&&!(W.isSea&&W.isSea())&&!(window.__ECO&&window.__ECO.fxOn('repel')))?rand(3,7):-1; },
  endChase(){ chaseDelay=-1; if(gs.mode==='chase'){ const s=sp(); gs={mode:'leave',t:0,dir:new T.Vector3(gP.x-s.pos[0],0,gP.z-s.pos[1]).normalize()}; } },
  stolen(){ const v=stolenF; stolenF=false; return v; },
  chaseTxt:()=>gs.mode==='chase'?`，鱷魚距離 ${Math.max(0,gs.d-1.1).toFixed(1)} m`:''
};
}
/* ===== 沉浸感更新 · 難度、拉扯型態、空氣與水面生態、鏡頭效果 ===== */
const DIFF={
 easy:{n:'休閒',line:1.25,win:1.25,stam:.95,slack:1.9,jit:.8,rew:.8},
 normal:{n:'標準',line:.86,win:.74,stam:1.55,slack:1.15,jit:1.25,rew:1},
 hard:{n:'硬派',line:.76,win:.62,stam:1.85,slack:.9,jit:1.5,rew:1.3},
 expert:{n:'專家',line:.65,win:.5,stam:2.15,slack:.72,jit:1.85,rew:1.6}};
const STY={
 nibbler:{n:'小幅亂竄',run:[.4,.9],rest:[.4,1],mul:1.4,lat:1.6,spd:1,ev:null,evP:0,d:0},
 runner:{n:'長距離狂奔',run:[2.2,4.5],rest:[1.2,2.4],mul:1.5,lat:.6,spd:1.5,ev:'long',evP:.5,d:.8},
 jumper:{n:'甩頭跳水',run:[.8,1.8],rest:[.8,1.8],mul:1.7,lat:1.1,spd:1,ev:'shake',evP:.35,d:.8},
 digger:{n:'往深處鑽',run:[1.5,3],rest:[1,2.5],mul:1.5,lat:.7,spd:.8,ev:'dive',evP:.4,d:1},
 brawler:{n:'短促爆衝',run:[.6,1.2],rest:[.6,1.4],mul:2.0,lat:1.2,spd:1.1,ev:'shake',evP:.2,d:.6}};
const SP_STY={bluegill:'nibbler',crappie:'nibbler',reba:'runner',perch:'brawler',lmbass:'jumper',channel:'digger',bowfin:'brawler',smbass:'jumper',flathead:'digger',gar:'runner',golden:'brawler',ghost:'jumper',mermaid:'runner',barra:'jumper',amber:'runner',grouper:'digger',ribbon:'nibbler',mahi:'jumper',tuna:'runner',marlin:'jumper',shark:'brawler',gwhite:'brawler',sail:'jumper',trout:'jumper',pike:'brawler',moonkoi:'digger',seaking:'digger',crucian:'nibbler',tilapia:'brawler',snakehead:'digger',peacock:'brawler',clarias:'digger',spgar:'runner',carp:'runner',silvercarp:'jumper',grasscarp:'runner',blackcarp:'digger',arapaima:'jumper',char:'runner',burbot:'digger',porgy:'brawler',parrot:'brawler',redbream:'brawler',emperor:'runner',cobia:'runner',wrasse:'digger',skipjack:'runner',sawara:'runner',yellowfin:'runner',eel:'digger',mekong:'digger',yperch:'nibbler',whitefish:'nibbler',laketrout:'digger',taimen:'runner',gt:'digger',swordfish:'runner',clownfish:'nibbler',bluetang:'brawler',blenny:'nibbler',angelfish:'nibbler',copperband:'nibbler',threadfin:'runner',seahorse:'nibbler',seabeast:'runner'};
// 依魚種取拉扯型態；新魚種忘了填也不會讓畫面報錯（預設小幅亂竄）
const styOf=id=>STY[SP_STY[id]]||STY.nibbler;

const SH3={};
SH3.airVS=`
attribute float aPh;
uniform float uTime;
uniform float uScale;
uniform float uSize;
varying float vB;
void main(){
  vec3 p = position;
  p.x += sin(uTime*0.7 + aPh*6.0)*0.25; p.y += sin(uTime*0.9 + aPh*9.0)*0.15; p.z += cos(uTime*0.6 + aPh*4.0)*0.25;
  vec4 mv = modelViewMatrix*vec4(p, 1.0);
  gl_PointSize = max(1.0, uSize*uScale/max(-mv.z, 0.1));
  gl_Position = projectionMatrix*mv;
  vB = pow(max(0.0, sin(uTime*(0.8 + aPh) + aPh*20.0)), 3.0);
}`;
SH3.airFS=`
uniform vec3 uCol;
uniform float uA;
uniform float uBlink;
varying float vB;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  float a = 1.0 - smoothstep(0.0, 0.5, d); a = a*a;
  float b = mix(1.0, vB, uBlink);
  gl_FragColor = vec4(uCol*b, a*uA*b);
}`;

function createAtmos(W,P,Snd,WL,ctx){
'use strict';
const T=THREE, S=W.scene;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, rand=(a,b)=>a+Math.random()*(b-a);
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function hashI(x,y){ let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function vn(x,y){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hashI(xi,yi), b=hashI(xi+1,yi), c=hashI(xi,yi+1), d=hashI(xi+1,yi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,o){ let s=0,a=.5,n=0; for(let i=0;i<o;i++){ s+=a*vn(x,y); n+=a; x=x*2.03+17.1; y=y*2.03+9.7; a*=.5; } return s/n; }
function dataTex(w,h,fn,srgb){ const d=new Uint8Array(w*h*4), o=[0,0,0,255];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ o[3]=255; fn(x/w,y/h,o); const i=(y*w+x)*4; for(let k=0;k<4;k++){ const v=o[k]; d[i+k]=v<0?0:v>255?255:v; } }
  const t=new T.DataTexture(d,w,h,T.RGBAFormat); t.magFilter=T.LinearFilter; t.minFilter=T.LinearMipmapLinearFilter; t.generateMipmaps=true; if(srgb!==false) t.encoding=T.sRGBEncoding; t.needsUpdate=true; return t; }
const fwd=(a,o)=>o.set(-Math.sin(a),0,-Math.cos(a));
const tv=new T.Vector3(), tv2=new T.Vector3(), cw=new T.Vector3();
const base=()=>ctx.base(), head=()=>ctx.head();

/* ---------- 水面薄霧 ---------- */
const mistTex=dataTex(128,64,(u,v,o)=>{ const n=fbm(u*4,v*3,4), e=Math.sin(Math.PI*u)*Math.sin(Math.PI*v); o[0]=o[1]=o[2]=255; o[3]=255*clamp((n-.32)*2.4,0,1)*Math.pow(Math.max(e,0),1.2); },false);
const wisps=[];
function placeWisp(m,init){ const b=base(), wd=WL.wind(); const a=head()+rand(-1.3,1.3), d=init?rand(8,60):rand(30,60);
  m.position.copy(fwd(a,tv).multiplyScalar(d)).add(b); if(!init){ m.position.x-=wd.x*20; m.position.z-=wd.z*20; } m.position.y=rand(.4,1.5); }
for(let i=0;i<16;i++){ const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:mistTex,transparent:true,depthWrite:false,fog:false,opacity:0}));
  m.scale.set(rand(10,22),rand(1.5,3.2),1); m.renderOrder=3; placeWisp(m,true); S.add(m); wisps.push(m); }

/* ---------- 螢火蟲、陽光下的微塵 ---------- */
function airPts(n,spread,mkPos,col,size,blink,additive){
  const pos=new Float32Array(n*3), ph=new Float32Array(n);
  for(let i=0;i<n;i++){ mkPos(tv); pos[i*3]=tv.x; pos[i*3+1]=tv.y; pos[i*3+2]=tv.z; ph[i]=Math.random(); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('aPh',new T.BufferAttribute(ph,1));
  const u={uTime:W.U.uTime,uScale:{value:800},uSize:{value:size},uCol:{value:new T.Color().copy(col)},uA:{value:0},uBlink:{value:blink}};
  const p=new T.Points(g,new T.ShaderMaterial({uniforms:u,vertexShader:SH3.airVS,fragmentShader:SH3.airFS,transparent:true,depthWrite:false,blending:additive?T.AdditiveBlending:T.NormalBlending}));
  p.frustumCulled=false; S.add(p); return {p,u};
}
const flies=airPts(150,0,o=>{ const a=rand(-1.4,1.4), d=rand(3,26); o.set(-Math.sin(a)*d,rand(.25,2.2),-Math.cos(a)*d); },new T.Color(1.6,2.4,.5),.07,1,true);
const motes=airPts(240,0,o=>{ o.set(rand(-6,6),rand(-2.2,2.5),rand(-7,-1)); },new T.Color(1,.95,.85),.014,.35,false);

/* ---------- 蜻蜓 ---------- */
const dfMat=new T.MeshStandardMaterial({color:0x1f6f8a,metalness:.6,roughness:.3});
const wingMat=new T.MeshBasicMaterial({color:0xe8f0f4,transparent:true,opacity:.3,side:T.DoubleSide,depthWrite:false});
const wingG=new T.PlaneGeometry(.055,.012); wingG.rotateX(-Math.PI/2); wingG.translate(.0275,0,0);
const dflies=[];
for(let k=0;k<3;k++){ const g=new T.Group(); const b=new T.Mesh(new T.CylinderGeometry(.0035,.0022,.075,6),dfMat); b.rotation.x=Math.PI/2; g.add(b);
  const h=new T.Mesh(new T.SphereGeometry(.007,8,6),dfMat); h.position.z=.04; g.add(h); const ws=[];
  for(const zz of [.016,.002]) for(const s of [1,-1]){ const w=new T.Mesh(wingG,wingMat); w.position.set(0,.004,zz); w.scale.x=s; g.add(w); ws.push([w,s]); }
  g.scale.setScalar(1.7); g.visible=false; g.userData={ws,tgt:new T.Vector3(),hold:0}; S.add(g); dflies.push(g); }

/* ---------- 漂浮落葉 ---------- */
const leafTex=dataTex(32,32,(u,v,o)=>{ const x=u*2-1, y=v*2-1, e=x*x+(y*1.8)*(y*1.8); const n=fbm(u*6,v*6,2), t=hashI(Math.floor(u*3),7)*.0;
  o[0]=150+60*n; o[1]=96+40*n; o[2]=40; o[3]=e<1&&Math.abs(y)>.02?255:0; });
const leafMat=new T.MeshStandardMaterial({map:leafTex,alphaTest:.5,side:T.DoubleSide,roughness:.7});
const leafG=new T.PlaneGeometry(.09,.09); leafG.rotateX(-Math.PI/2);
const NL=30, leaves=new T.InstancedMesh(leafG,leafMat,NL), lf=[];
const m4=new T.Matrix4(), q4=new T.Quaternion(), eu=new T.Euler(), sv=new T.Vector3(1,1,1);
function placeLeaf(L,init){ const b=base(), wd=WL.wind(), a=head()+rand(-1.2,1.2), d=init?rand(3,30):rand(18,32);
  L.x=b.x-Math.sin(a)*d-(init?0:wd.x*10); L.z=b.z-Math.cos(a)*d-(init?0:wd.z*10); L.r=rand(0,6.28); L.sp=rand(-.3,.3); L.c=rand(.6,1.1); }
for(let i=0;i<NL;i++){ const L={}; placeLeaf(L,true); lf.push(L); leaves.setColorAt(i,new T.Color(L.c,L.c*rand(.7,1),L.c*rand(.5,.9))); }
leaves.frustumCulled=false; S.add(leaves);

/* ---------- 螢幕雨滴、太陽眩光 ---------- */
const dc=document.getElementById('drops'), dx=dc.getContext('2d'); let drops=[], dW=1, dH=1, dOn=false;
function rsz(){ dW=dc.width=Math.max(1,Math.round(innerWidth*.6)); dH=dc.height=Math.max(1,Math.round(innerHeight*.6)); }
rsz(); window.addEventListener('resize',rsz);
const fl=document.getElementById('flare'), fg=fl.querySelector('.fg'), ghs=[...fl.querySelectorAll('.gh')];
let flOp=-1;

/* ---------- 細碎漣漪圈（不占用主漣漪槽） ---------- */
const ringTex=dataTex(64,64,(u,v,o)=>{ const d=Math.hypot(u-.5,v-.5)*2, a=Math.exp(-Math.pow((d-.82)/.07,2))+.35*Math.exp(-Math.pow((d-.6)/.06,2)); o[0]=o[1]=o[2]=255; o[3]=d<1?255*clamp(a,0,1):0; },false);
const ringGeo=new T.PlaneGeometry(1,1); ringGeo.rotateX(-Math.PI/2);
const rings=[]; let ringI=0;
for(let i=0;i<28;i++){ const m=new T.Mesh(ringGeo,new T.MeshBasicMaterial({map:ringTex,transparent:true,depthWrite:false,opacity:0})); m.visible=false; m.renderOrder=2; S.add(m); rings.push({m,t:9,s:1}); }
function ring(x,z,size){ const r=rings[ringI]; ringI=(ringI+1)%rings.length; r.t=0; r.s=size; r.m.position.set(x,.016,z); r.m.visible=true; }
/* ---------- 水黽 ---------- */
const stMat=new T.MeshStandardMaterial({color:0x1a1a16,roughness:.5});
const legG=new T.CylinderGeometry(.0009,.0009,.06,3); legG.rotateZ(Math.PI/2); legG.translate(.03,0,0);
const striders=[];
for(let k=0;k<7;k++){ const g=new T.Group(); const bd=new T.Mesh(new T.SphereGeometry(1,8,6),stMat); bd.scale.set(.004,.003,.013); g.add(bd);
  [-.55,0,.55].forEach((a,j)=>{ for(const s of [1,-1]){ const l=new T.Mesh(legG,stMat); l.position.z=(1-j)*.006; l.rotation.y=s>0?a:Math.PI-a; g.add(l); } });
  g.scale.setScalar(1.6); g.visible=false; g.userData={vx:0,vz:0,t:0}; S.add(g); striders.push(g); }
/* ---------- 跳出水面的魚 ---------- */
const jumpers={}; let jf=null;
function startJump(x,z){ const ids=['bluegill','crappie','reba','lmbass'], id=ids[Math.floor(Math.random()*ids.length)];
  if(!jumpers[id]){ const src=P.getFish(P.SPECIES.find(s=>s.id===id)); const g=src.group.clone(); g.traverse(o=>{ o.frustumCulled=false; }); S.add(g); jumpers[id]={g,uni:src.uni}; }
  const J=jumpers[id]; J.g.visible=true; J.g.scale.setScalar(rand(.18,.32)); jf={J,x,z,t:0,dur:rand(.5,.7),h:rand(.25,.45),a:rand(0,6.28)};
  P.splash(x,0,z,10,.5); W.addRipple(x,z,.25); }
/* ---------- 夜裡偶爾露出的美人魚尾巴 ---------- */
const tailM=new T.MeshPhysicalMaterial({color:0x2fa8a0,metalness:.6,roughness:.3,clearcoat:.8,emissive:0x0a4848,emissiveIntensity:.5,side:T.DoubleSide});
const fluke=new T.Group(); fluke.visible=false; S.add(fluke);
{ const sh=new T.Shape(); sh.moveTo(0,.06); sh.quadraticCurveTo(-.25,.15,-.5,.42); sh.quadraticCurveTo(-.38,.12,-.32,0); sh.quadraticCurveTo(-.38,-.12,-.5,-.42); sh.quadraticCurveTo(-.25,-.15,0,-.06); sh.lineTo(0,.06);
  const f=new T.Mesh(new T.ShapeGeometry(sh,12),tailM); f.rotation.z=-Math.PI/2; f.position.y=.6; fluke.add(f);
  const shaft=new T.Mesh(new T.CylinderGeometry(.05,.09,.62,14),tailM); shaft.position.y=.3; fluke.add(shaft); fluke.scale.setScalar(1.2); }
/* 3D 美人魚：上下顛倒，只讓魚尾那一截露出水面（模型依玩家設定圖生成） */
if(T.GLTFLoader) new T.GLTFLoader().load('models/mermaid_v2.glb',gl=>{ const o=gl.scene;
  o.traverse(x=>{ if(x.isMesh){ const mp=x.material.map; if(mp){ mp.generateMipmaps=false; mp.minFilter=T.LinearFilter; } x.material=new T.MeshStandardMaterial({map:mp||null,vertexColors:!mp&&!!x.geometry.attributes.color,roughness:.4,metalness:.1,emissive:new T.Color(0x3a6f8a),emissiveIntensity:.25}); x.frustumCulled=false; } });
  const w=new T.Group(); w.add(o); o.updateMatrixWorld(true); let b=new T.Box3().setFromObject(o); o.scale.setScalar(1.6/Math.max(b.getSize(new T.Vector3()).y,1e-6));
  w.rotation.x=Math.PI; w.rotation.z=.18; w.updateMatrixWorld(true); b=new T.Box3().setFromObject(w); const c=b.getCenter(new T.Vector3());
  w.position.set(-c.x,(.85/1.2)-b.max.y,-c.z);
  fluke.children.forEach(ch=>{ ch.visible=false; }); fluke.add(w); });
let tease=null, teaseT=rand(60,140), teaseN=0;
let riseT=rand(3,8), t0=0;
function update(dt,t){
  const uw=ctx.underwater(), day=W.info.day, light=W.info.light, wd=WL.wind(), wx=WL.wx(), b=base(), per=ctx.period();
  W.camera.getWorldPosition(cw);
  // 薄霧
  const mist=W.U.uMist.value, fc=W.U.uFogCol.value;
  for(const m of wisps){ m.position.x+=wd.x*(.4+wd.s*3)*dt; m.position.z+=wd.z*(.4+wd.s*3)*dt;
    const d=Math.hypot(m.position.x-cw.x,m.position.z-cw.z); if(d>75||d<4) placeWisp(m,false);
    m.rotation.y=Math.atan2(cw.x-m.position.x,cw.z-m.position.z);
    m.material.opacity=clamp(mist*.42+(window.__MIST?window.__MIST.level()*.35:0),0,.62)*sstep(4,12,d)*(1-sstep(55,75,d));
    m.material.color.setRGB(fc.x*1.25+.02,fc.y*1.25+.02,fc.z*1.25+.02); }
  // 螢火蟲：黃昏後、無雨
  flies.p.position.copy(b); flies.p.rotation.y=head();
  flies.u.uA.value=(1-sstep(.12,.4,day))*(1-clamp(wx.r*2,0,1))*(W.isSea()?0:.9);
  // 微塵：晴天白天，跟著鏡頭
  motes.p.position.copy(cw); motes.p.rotation.y=W.player.rotation.y;
  motes.u.uA.value=clamp(day*1.2-.3,0,1)*(1-wx.c*.8)*(1-wx.r)*.55; motes.u.uCol.value.setRGB(light,light*.95,light*.85);
  const sc=window.innerHeight*W.getPR()/(2*Math.tan(W.camera.fov*Math.PI/360)); flies.u.uScale.value=sc; motes.u.uScale.value=sc;
  // 蜻蜓
  const dfOn=day>.55&&wx.r<.2&&wd.s<.6&&!W.isSea();
  for(const g of dflies){ if(!dfOn){ g.visible=false; continue; } const u=g.userData;
    if(!g.visible){ g.visible=true; fwd(head()+rand(-.6,.6),tv).multiplyScalar(rand(3,9)).add(b); g.position.set(tv.x,rand(.3,1.3),tv.z); u.hold=0; }
    u.hold-=dt; if(u.hold<=0){ fwd(head()+rand(-.7,.7),tv).multiplyScalar(rand(2.5,9)).add(b); u.tgt.set(tv.x,rand(.25,1.4),tv.z); u.hold=rand(.8,2.6); }
    tv.subVectors(u.tgt,g.position); const d=tv.length();
    if(d>.05){ g.position.addScaledVector(tv.normalize(),Math.min(d,5*dt)); g.lookAt(u.tgt); }
    else g.position.y+=Math.sin(t*9+g.id)*.002;
    for(const [w,s] of u.ws) w.rotation.z=s*Math.sin(t*95+s)*.5; }
  // 魚在水面覓食的漣漪
  riseT-=dt; if(riseT<=0){ riseT=(per==='dawn'||per==='dusk'?rand(3,8):rand(6,15))*(1+wx.r);
    if(!uw){ const a=head()+rand(-1,1), d=rand(8,40); fwd(a,tv).multiplyScalar(d).add(b);
      if(Math.hypot(tv.x,tv.z)<W.shoreR(Math.atan2(tv.x,-tv.z))-4){ if(!jf&&d<30&&day>.15&&Math.random()<.4) startJump(tv.x,tv.z); else { W.addRipple(tv.x,tv.z,.32); P.splash(tv.x,0,tv.z,5,.35); if(d<25) Snd.plip(); } } } }
  // 漣漪圈
  for(const r of rings){ if(r.t>=2.2){ r.m.visible=false; continue; } r.t+=dt; const k=r.t/2.2; r.m.scale.setScalar(r.s*(.15+k*1.6)); r.m.material.opacity=(1-k)*.35*clamp(light,.15,1); }
  // 水黽
  const stOn=day>.45&&wx.r<.15&&wd.s<.5&&!uw&&!W.isSea();
  for(const g of striders){ const u=g.userData; if(!stOn){ g.visible=false; continue; }
    if(!g.visible){ g.visible=true; fwd(head()+rand(-.8,.8),tv).multiplyScalar(rand(2.5,8)).add(b); g.position.set(tv.x,0,tv.z); u.t=rand(0,1); }
    u.t-=dt; if(u.t<=0){ u.t=rand(.5,1.8); const a=rand(0,6.28), s=rand(.4,.9); u.vx=Math.cos(a)*s; u.vz=Math.sin(a)*s; g.rotation.y=Math.atan2(u.vx,u.vz); ring(g.position.x,g.position.z,.14); }
    g.position.x+=u.vx*dt; g.position.z+=u.vz*dt; u.vx*=1-dt*2.2; u.vz*=1-dt*2.2; g.position.y=W.swell(g.position.x,g.position.z,t)+.002;
    if(Math.hypot(g.position.x-b.x,g.position.z-b.z)>11) g.visible=false; }
  // 跳魚
  if(jf){ jf.t+=dt; const s=jf.t/jf.dur, g=jf.J.g; g.position.set(jf.x+Math.cos(jf.a)*.5*s,4*jf.h*s*(1-s)-.05,jf.z+Math.sin(jf.a)*.5*s); g.rotation.set(0,-jf.a,(1-2*s)*1.1);
    jf.J.uni.uAmp.value=.12; jf.J.uni.uSwim.value+=dt*20;
    if(s>=1){ g.visible=false; P.splash(g.position.x,0,g.position.z,14,.6); W.addRipple(g.position.x,g.position.z,.3); Snd.plip(); jf=null; } }
  // 美人魚尾巴
  // 月潮回來後美人魚更常出現
  if(!tease){ teaseT-=dt; if(teaseT<=0&&!(window.__ENDON&&window.__ENDON())){ const ended=window.__STORY&&window.__STORY.done('c7'); teaseT=ended?rand(30,70):rand(60,140); if(day<.3&&!uw&&Math.random()<(ended?.7:.45)){ fwd(head()+rand(-.6,.6),tv).multiplyScalar(rand(18,40)).add(b);
      if(Math.hypot(tv.x,tv.z)<W.shoreR(Math.atan2(tv.x,-tv.z))-5){ tease={t:0,x:tv.x,z:tv.z,ry:rand(0,6.28),hit:false}; fluke.visible=true; } } } }
  else { tease.t+=dt; const tt=tease.t; let y,rx;
    if(tt<1.2){ const e=sstep(0,1,tt/1.2); y=-.9+1.2*e; rx=.5-.7*e; } else if(tt<1.8){ y=.3+Math.sin((tt-1.2)*8)*.03; rx=-.2+Math.sin((tt-1.2)*6)*.08; } else { const e=sstep(0,1,(tt-1.8)/.4); y=.3-1.3*e; rx=-.2+1.5*e; }
    fluke.position.set(tease.x,y,tease.z); fluke.rotation.set(rx,tease.ry,0);
    if(tt>2.0&&!tease.hit){ tease.hit=true; P.splash(tease.x,0,tease.z,60,1.6); W.addRipple(tease.x,tease.z,1.1); ring(tease.x,tease.z,2.5); Snd.splash(1.4); teaseN++;
      if(ctx.toast) ctx.toast(teaseN===1?'……剛剛那是什麼的尾巴？':'又是那條發光的尾巴……傳說也許是真的','warn',2600); }
    if(tt>2.4){ fluke.visible=false; tease=null; } }
  // 落葉
  for(let i=0;i<NL;i++){ const L=lf[i]; L.x+=(wd.x*(.05+wd.s*.4)+Math.sin(t*.3+i)*.01)*dt; L.z+=(wd.z*(.05+wd.s*.4)+Math.cos(t*.27+i)*.01)*dt; L.r+=L.sp*dt*(.3+wd.s);
    const d=Math.hypot(L.x-b.x,L.z-b.z); if(d>36||Math.hypot(L.x,L.z)>W.shoreR(Math.atan2(L.x,-L.z))-2) placeLeaf(L,false);
    q4.setFromEuler(eu.set(Math.sin(t*1.3+i)*.06,L.r,Math.cos(t*1.1+i)*.06)); tv2.set(L.x,W.swell(L.x,L.z,t)+.006,L.z); m4.compose(tv2,q4,sv); leaves.setMatrixAt(i,m4); }
  leaves.instanceMatrix.needsUpdate=true; leaves.visible=!W.isSea();
  // 環境音
  Snd.setAmb({wind:wd.s, lap:ctx.spot()===0?.7:.35, cic:(per==='day'&&wx.r<.2&&wx.c<.7)?1:0, crk:(per==='night'||per==='dusk')&&wx.r<.3?1:0});
  // 螢幕雨滴
  const rk=(uw||(window.__G&&window.__G.loc==='ice'))?0:W.U.uRain.value;
  if(rk>.05){ if(!dOn){ dOn=true; dc.style.opacity='1'; }
    if(Math.random()<dt*rk*7&&drops.length<42) drops.push({x:Math.random()*dW,y:Math.random()*dH*.9,r:rand(3,9)*dW/600,v:0,life:rand(4,10),sl:Math.random()<.35});
    dx.clearRect(0,0,dW,dH);
    for(const d of drops){ d.life-=dt; if(d.sl){ d.v+=dt*rand(0,40); d.y+=d.v*dt; }
      dx.globalAlpha=clamp(d.life,0,1);
      if(d.sl&&d.v>4){ dx.strokeStyle='rgba(220,230,235,.12)'; dx.lineWidth=d.r*.5; dx.beginPath(); dx.moveTo(d.x,d.y-d.r); dx.lineTo(d.x,d.y-d.r-Math.min(60,d.v*.8)); dx.stroke(); }
      const g=dx.createRadialGradient(d.x-d.r*.3,d.y-d.r*.35,d.r*.1,d.x,d.y,d.r); g.addColorStop(0,'rgba(255,255,255,.3)'); g.addColorStop(.55,'rgba(200,215,220,.07)'); g.addColorStop(1,'rgba(0,0,0,.24)');
      dx.fillStyle=g; dx.beginPath(); dx.ellipse(d.x,d.y,d.r,d.r*(d.sl?1.25:1),0,0,6.283); dx.fill(); }
    dx.globalAlpha=1; drops=drops.filter(d=>d.life>0&&d.y<dH+20);
  } else if(dOn){ dOn=false; dc.style.opacity='0'; setTimeout(()=>{ if(!dOn){ drops=[]; dx.clearRect(0,0,dW,dH); } },700); }
  // 太陽眩光
  let op=0;
  if(!uw){ tv.copy(cw).addScaledVector(W.U.uSunDisk.value,500).project(W.camera);
    if(tv.z<1&&Math.abs(tv.x)<1.3&&Math.abs(tv.y)<1.3){ const s=W.U.uSunCol.value, k=clamp((s.x+s.y+s.z)/3/2.2,0,1)*W.U.uSunVis.value;
      op=k*(1-sstep(.85,1.3,Math.max(Math.abs(tv.x),Math.abs(tv.y))));
      if(op>.01){ const X=(tv.x*.5+.5)*innerWidth, Y=(-tv.y*.5+.5)*innerHeight, cx=innerWidth/2, cy=innerHeight/2;
        fg.style.transform=`translate(${X.toFixed(0)}px,${Y.toFixed(0)}px)`;
        [.45,.8,1.25].forEach((f,i)=>{ ghs[i].style.transform=`translate(${(cx+(cx-X)*f).toFixed(0)}px,${(cy+(cy-Y)*f).toFixed(0)}px)`; }); } } }
  op=Math.round(op*50)/50; if(op!==flOp){ flOp=op; fl.style.opacity=op; }
}
return {update,ring};
}
/* ===== 真實場景：360° 實拍環境、HDR 光照、掃描 3D 模型（素材：Poly Haven，CC0） ===== */
function createReal(W,P,cb){
'use strict';
const T=THREE, U=W.U;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
// 三張同一腳架拍攝的湖景：dawn=破曉/黃昏、day=日出後白天、night=入夜
const SETS={
 lake:{pre:'env_',mask:'env_mask.png',meta:{dawn:{u:.3633,el:6.33,exp:.252,lc:[1.0,.72,.52],li:1.2,light:.7},day:{u:.3496,el:5.62,exp:1.0,lc:[1.0,.86,.7],li:2.4,light:1},night:{u:.6865,el:44.3,exp:.14,lc:[.55,.62,.85],li:.5,light:.3}}},
 ice:{pre:'ice_',mask:'ice_mask.png',meta:{dawn:{u:.6191,el:17.05,exp:.9,lc:[.9,.93,.97],li:1.4,light:.85},day:{u:.5996,el:28.3,exp:1.0,lc:[1.0,.96,.9],li:2.5,light:1},night:{u:.6191,el:17.05,exp:.9,lc:[.55,.62,.85],li:.5,light:.3}}},
 sea:{pre:'sea_',mask:'sea_mask.png',meta:{dawn:{u:.3623,el:4.92,exp:.305,lc:[1.0,.72,.5],li:1.3,light:.7},day:{u:.3447,el:48.16,exp:.568,lc:[1.0,.95,.88],li:2.6,light:1},night:{u:.3486,el:17.23,exp:1.343,lc:[.6,.68,.9],li:.45,light:.35}}}};
let SET='lake', META=SETS.lake.meta, started=false, envKey=null;
const YAW=.25; U.uYaw.value=YAW;
let total=0, errors=0;
const mgr=new T.LoadingManager();
mgr.onProgress=(u,l,t)=>{ window.__LASTURL=(u||'').split('/').pop(); window.__LOADN=l+'/'+t; total=t; if(cb) cb(l/t,false,errors); };
mgr.onError=(u)=>{ if(window.__CDN&&u&&u.indexOf(window.__CDN.base)===0) return;   /* CDN 失敗的檔案會自動改從本站重抓，不算失敗（原本只要有一個就整個退回簡化畫面） */
  errors++; if(cb) cb(0,false,errors); };
const tl=new T.TextureLoader(mgr);
const prep=t=>{ t.generateMipmaps=false; t.minFilter=T.LinearFilter; t.magFilter=T.LinearFilter; t.wrapS=T.RepeatWrapping; t.wrapT=T.ClampToEdgeWrapping; return t; };
const tex={}, env={}, masks={};
function loadKey(k){ const id=SET+'_'+k; if(tex[id]) return; const o={ready:false,n:0}; tex[id]=o; const fin=()=>{ if(++o.n===2) o.ready=true; }, p=SETS[SET].pre;
  o.band=prep(tl.load(`${p}${k}_band.jpg`,fin)); o.full=prep(tl.load(`${p}${k}_full.jpg`,fin)); }
const pmrem=new T.PMREMGenerator(W.renderer);
function loadEnv(k){ const id=SET+'_'+k; if(env[id]!==undefined) return; env[id]=null; if(!T.RGBELoader) return;
  new T.RGBELoader(mgr).setDataType(T.UnsignedByteType).load(`${SETS[SET].pre}${k}.hdr`,t=>{ env[id]=pmrem.fromEquirectangular(t).texture; t.dispose(); }); }
function useSet(name){ SET=name; META=SETS[name].meta; if(!masks[name]) masks[name]=prep(tl.load(SETS[name].mask)); U.uMask.value=masks[name];
  for(const id in tex){ if(!id.startsWith(name+'_')){ tex[id].band.dispose(); tex[id].full.dispose(); delete tex[id]; } }
  ['day','dawn','night'].forEach(k=>{ loadKey(k); loadEnv(k); }); envKey=null; }
useSet('lake');

function sched(h){
  const H=((h%24)+24)%24;
  const L=[[4.5,'night','dawn'],[6.0,'dawn','dawn'],[6.6,'dawn','day'],[8.0,'day','day'],[16.5,'day','dawn'],[18.0,'dawn','dawn'],[18.6,'dawn','night'],[20.0,'night','night']];
  let i=L.length-1; for(let k=0;k<L.length;k++) if(H>=L[k][0]) i=k;
  const s=L[i], e=L[(i+1)%L.length][0], len=((e-s[0])+24)%24||24, t=(((H-s[0])+24)%24)/len;
  return [s[1],s[2],s[1]===s[2]?0:t*t*(3-2*t)];
}
const dA=new T.Vector3(), dB=new T.Vector3(), dir=new T.Vector3();
const sunDir=(m,o)=>{ const th=(m.u-YAW)*Math.PI*2, e=m.el*Math.PI/180; return o.set(Math.sin(th)*Math.cos(e),Math.sin(e),-Math.cos(th)*Math.cos(e)); };
// 實拍陰天天空：輕陰（Kloofendal Overcast）與厚雲雨天（Overcast Soil），依雲量、雨量淡入
{ const ld=f=>{ const t=tl.load(f); t.wrapS=T.RepeatWrapping; t.wrapT=T.ClampToEdgeWrapping; t.minFilter=T.LinearFilter; t.generateMipmaps=false; return t; };
  U.uOvcA.value=ld('sky_ovc_light.jpg'); U.uOvcB.value=ld('sky_ovc_heavy.jpg'); }
W.setPhotoHook((h,wx)=>{
  { const k=Math.min(1,Math.max(0,(wx.cloud-.35)/.4)+wx.rain*.6); U.uOvcK.value+=(k-U.uOvcK.value)*.08; }
  const [a,b,m]=sched(h), A=tex[SET+'_'+a], B=tex[SET+'_'+b];
  if(!A||!A.ready||!B||!B.ready) return null;
  if(!started){ started=true; W.setPhotoActive(); if(cb) cb(1,true,errors); }
  U.uBandA.value=A.band; U.uFullA.value=A.full; U.uBandB.value=B.band; U.uFullB.value=B.full; U.uPMix.value=m;
  const k=m<.5?a:b, ek=SET+'_'+k;
  const MA=META[a], MB=META[b], L=(x,y)=>x+(y-x)*m;
  sunDir(MA,dA); sunDir(MB,dB); dir.copy(dA).lerp(dB,m).normalize();
  /* 深夜係數：19:20 起天色轉暗，21:00～04:00 為深夜，05:00 前天亮。照片曝光、光照一起壓暗，天空與水面反射一致 */
  const H=((h%24)+24)%24, ss=(a0,a1,x)=>{ const t=Math.min(1,Math.max(0,(x-a0)/(a1-a0))); return t*t*(3-2*t); };
  const nk=H>=12?ss(19.3,21,H):1-ss(4,5,H), deep=SET==='sea'?.018:.05; U.uNight.value=nk; U.uNightDeep.value=deep;
  { const want=nk>.6?null:(env[ek]||null); if(W.scene.environment!==want){ W.scene.environment=want; envKey=ek; } }
  const li=L(MA.li,MB.li)*(1-wx.cloud*.75-wx.rain*.15)*(1-.6*nk);
  return {dir, lc:[L(MA.lc[0],MB.lc[0])*li,L(MA.lc[1],MB.lc[1])*li,L(MA.lc[2],MB.lc[2])*li],
    exp:Math.exp(L(Math.log(MA.exp),Math.log(MB.exp)))*(1-wx.cloud*.15), light:L(MA.light,MB.light)*(1-wx.cloud*.3)*(1-.55*nk)};
});

/* ---------- 碼頭：實拍風化木板材質 ---------- */
const rep=(t,x,y,srgb)=>{ t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(x,y); t.anisotropy=8; if(srgb) t.encoding=T.sRGBEncoding; return t; };
const dDiff=tl.load('dock_diff.jpg'), dNor=tl.load('dock_nor.jpg'), dRough=tl.load('dock_rough.jpg');
if(P.dockMats){ const {plankMat,postMat,beamMat}=P.dockMats;
  Object.assign(plankMat,{map:rep(dDiff,.55,.09,true),normalMap:rep(dNor,.55,.09),roughnessMap:rep(dRough,.55,.09),roughness:1}); plankMat.needsUpdate=true;   // 一片木板只對到照片上一塊板子，少掉一節一節的接縫
  for(const m of [postMat,beamMat]){ Object.assign(m,{map:rep(dDiff.clone(),.4,1.6,true),normalMap:rep(dNor.clone(),.4,1.6),roughnessMap:rep(dRough.clone(),.4,1.6),roughness:1,color:new T.Color(.75,.72,.68)});
    m.map.needsUpdate=m.normalMap.needsUpdate=m.roughnessMap.needsUpdate=true; m.needsUpdate=true; }
  // 木樁：泡水多年的圓木樁——深褐、木紋直向、霧面不反光（原本用木板照片橫貼，加上反射天空，看起來像金屬管）
  { const pm=postMat; pm.map.rotation=Math.PI/2; pm.normalMap.rotation=Math.PI/2; pm.map.repeat.set(1.6,.5); pm.normalMap.repeat.set(1.6,.5); pm.roughnessMap=null;
    pm.color=new T.Color(.42,.34,.27); pm.roughness=.96; pm.metalness=0; pm.envMapIntensity=.25; pm.needsUpdate=true; } }

/* ---------- 岸邊泥灘（實拍泥土落葉材質） ---------- */
const mud={map:rep(tl.load('mud_diff.jpg'),5,5,true),normalMap:rep(tl.load('mud_nor.jpg'),5,5),roughnessMap:rep(tl.load('mud_rough.jpg'),5,5)};
const mudMat=new T.MeshStandardMaterial(Object.assign({roughness:1},mud));
const BANKS=[];
function bank(cx,cz,w,d,side){ const g=new T.PlaneGeometry(w,d,60,60); g.rotateX(-Math.PI/2); const p=g.attributes.position;
  for(let i=0;i<p.count;i++){ const x=p.getX(i), z=p.getZ(i), edge=side*x+Math.sin(z*.55)*1.1+Math.sin(z*1.7+1)*.35;
    p.setY(i,-.45+.95*sstep(-w*.32,w*.22,-edge)+.06*Math.sin(x*2.1+z*1.3)+.04*Math.sin(x*5.3-z*3.1)); }
  g.computeVertexNormals(); const m=new T.Mesh(g,mudMat); m.position.set(cx,0,cz); m.userData.lake=true; m.visible=!(W.isSea&&W.isSea()); W.scene.add(m); BANKS.push(m); }
bank(-10.5,-7,11,13,1); bank(12.5,-9,10,12,-1);

/* ---------- 掃描 3D 模型 ---------- */
if(T.GLTFLoader){
  const gl=new T.GLTFLoader(mgr);
  const place=(file,list)=>gl.load(file,g=>{ g.scene.traverse(o=>{ if(o.isMesh&&o.material){ o.material.envMapIntensity=1; } });
    for(const it of list){ const c=g.scene.clone(true); c.position.set(it[0],it[1],it[2]); c.rotation.set(it[4]||0,it[3]||0,it[5]||0); c.scale.setScalar(it[6]||1); c.userData.lake=true; c.visible=!(W.isSea&&W.isSea()); W.scene.add(c); } });
  place('dead_tree_trunk_02.glb',[[-5.8,-.2,-9.5,.6,0,.05,1.1],[7.5,-.25,-16,-1.1,0,0,1.0],[-13,-.15,-22,2.2,0,0,1.2],[2,-.3,-26,.2,0,0,1.3]]);
  place('tree_stump_01.glb',[[3.9,-.14,-7.6,1,0,0,1.0],[-8.2,-.12,-14,2,0,0,1.3],[10,-.18,-24,0,0,0,1.4],[-3,-.2,-30,1.2,0,0,1.5]]);
  place('tree_stump_02.glb',[[-3.4,-.12,-5.2,.4,0,0,.8],[12.5,-.12,-11,1.7,0,0,1.1],[5.5,-.15,-34,2.5,0,0,1.6]]);
  place('dry_branches_medium_01.glb',[[-1.6,.03,-13,.4,0,0,1.6],[4.6,.03,-19,1.2,0,0,1.8],[-6.8,.03,-20,2.6,0,0,1.5],[1.2,.03,-9,2.0,0,0,1.2]]);
  place('rock_moss_set_01.glb',[[-7.2,-.25,-6,.5,0,0,.8],[-9.8,0,-10.6,2,0,0,.7],[10.2,-.2,-7,1,0,0,.75]]);
  place('fern_02.glb',[[-9.2,.36,-4.6,0,0,0,1.6],[-11.2,.42,-8.2,1,0,0,1.8],[-8.8,.28,-9.6,2,0,0,1.4],[12,.4,-6,1.5,0,0,1.6],[14,.45,-10,.3,0,0,1.7]]);
  /* 岸邊散植（Poly Haven CC0）：每株單獨取出，射線貼地種在泥灘陸地側 */
  const ZONES=[[-15.5,-9.5,-12.5,-1.5],[12.5,17.5,-14.5,-3.5]], BACK=[[-15.8,-14.3,-12.5,-1.5],[16,17.3,-14.5,-3.5]], rc=new T.Raycaster(), dn=new T.Vector3(0,-1,0);
  let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; };
  function groundY(x,z){ rc.set(new T.Vector3(x,6,z),dn); const h=rc.intersectObjects(BANKS,false)[0]; return h?h.point.y:null; }
  const scatter=(file,n,hMin,hMax,zones,minY)=>gl.load(file,g=>{
    const kinds=g.scene.children.filter(o=>{ let m=false; o.traverse(x=>{ if(x.isMesh) m=true; }); return m; }).map(o=>{
      const w=new T.Group(); const c=o.clone(true); w.add(c); w.updateMatrixWorld(true); const b=new T.Box3().setFromObject(w), ct=b.getCenter(new T.Vector3());
      c.position.x-=ct.x; c.position.z-=ct.z; c.position.y-=b.min.y; return {w,h:b.max.y-b.min.y}; });
    if(!kinds.length) return;
    for(let i=0;i<n;i++){ const z=zones[i%zones.length], x=z[0]+rnd()*(z[1]-z[0]), zz=z[2]+rnd()*(z[3]-z[2]), y=groundY(x,zz);
      if(y===null||y<minY) continue; const k=kinds[Math.floor(rnd()*kinds.length)], inst=k.w.clone(true);
      inst.scale.setScalar((hMin+rnd()*(hMax-hMin))/Math.max(k.h,1e-3)); inst.position.set(x,y-.02,zz); inst.rotation.y=rnd()*Math.PI*2;
      inst.traverse(o=>{ if(o.isMesh){ o.castShadow=false; if(o.material){ o.material.envMapIntensity=.9; } } });
      inst.userData.lake=true; inst.userData.veg=true; inst.visible=!(W.isSea&&W.isSea()); W.scene.add(inst); } });
  scatter('grass_medium_01.glb',34,.3,.6,ZONES,.12);
  scatter('grass_medium_02.glb',14,.35,.7,ZONES,.12);
  scatter('shrub_03.glb',10,.6,1.1,ZONES,.2);
  scatter('fir_sapling_medium.glb',7,3.5,5.5,BACK,.25);
  place('shrub_02.glb',[[-12.8,.46,-5.6,.5,0,0,1.2],[-13.4,.46,-11,2,0,0,1.0],[15,.46,-8,1,0,0,1.1]]);
}
return {sched,useSet};
}
/* ===== 樂趣系統：起鉤計時、拋竿距離、連擊、尺寸獎牌、魚群熱點、寶物、釣魚大賽、拍照、美人魚相遇 ===== */
const ITEMS=[
 {id:'boot',name:'破舊雨靴',file:'item_rubber_boots.glb',w:1.4,val:8,size:.45,rare:0,p:24,desc:'不知道誰掉的雨靴，裡面還躲著一隻小蝌蚪。'},
 {id:'tyre',name:'廢棄輪胎',file:'item_old_tyre.glb',w:6,val:15,size:.7,rare:0,p:16,desc:'有人把輪胎丟進濕地，順手清掉，算是做了件好事。'},
 {id:'jug',name:'生鏽鐵壺',file:'item_metal_jug.glb',w:1.1,val:40,size:.35,rare:0,p:20,desc:'老式鐵壺，洗乾淨或許能賣給古董商。'},
 {id:'compass',name:'航海羅盤',file:'item_seadogs_compass.glb',w:.5,val:250,size:.3,rare:2,p:10,desc:'黃銅羅盤。拿到的瞬間，指針指向了一群正在覓食的魚。'},
 {id:'watch',name:'古董懷錶',file:'item_pocket_watch.glb',w:.2,val:400,size:.25,rare:2,p:8,desc:'背面刻著名字和年份，指針停在午夜。帶著它，好運加滿。'},
 {id:'chest',name:'沉沒的寶箱',file:'item_treasure_chest.glb',w:18,val:1200,size:.9,rare:3,p:4,desc:'滿滿的舊金幣！今天是你的幸運日。'},
 {id:'hairpin',name:'褪色的髮簪',file:'item_hairpin.glb',w:.05,val:0,size:.22,rare:3,p:0,desc:'銀質髮簪，花瓣已經褪色。背面刻著一個「蘅」字。釣起來的時候，水面安靜得不像話。'}];
const ITEM_SP={id:'item',name:'物品',rar:0,len:[30,30],k:1,price:0,sh:{H:.1,W:.1},f:{pow:.7,spd:.4,agi:.3,jump:0,stam:.6,win:1.5},time:{},desc:''};

function createFun(W,P,AT,c){
'use strict';
const T=THREE, $=id=>document.getElementById(id), G=c.G;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, rand=(a,b)=>a+Math.random()*(b-a);

/* ---------- 起鉤計時（仿參考影片的直立量表） ---------- */
const hk={on:false,t:0,win:1.8,w:3.5,ph:0,good:.3,perf:.22};
const hookEl=$('hook'), hgM=$('hgM'), htF=$('htF');
function hookStart(fd){ const r=fd.sp.rar||0, D=c.D();
  hk.on=true; hk.t=0; hk.win=1.9*(fd.sp.f.win||1)*D.win*(fd.item?1.4:1)*(1-.06*Math.min(5,r)); hk.w=(2.8+.7*r)*(.85+.25*D.jit); hk.ph=rand(0,6.28);
  hk.good=.3; hk.perf=Math.max(.1,.24-.025*r);
  $('hz2').style.bottom=(hk.good*100)+'%'; $('hz2').style.height=(hk.perf*100)+'%'; $('hz3').style.bottom=((hk.good+hk.perf)*100)+'%';
  hookEl.classList.remove('hidden'); }
const hpos=()=>.5+.5*Math.sin(hk.t*hk.w+hk.ph);
function hookPress(){ if(!hk.on) return 'miss'; const p=hpos(); hookEnd(); const r=p<hk.good?'good':p<hk.good+hk.perf?'perfect':'miss';
  pop(r==='perfect'?'完美起鉤！':r==='good'?'上鉤！':'錯過', r); return r; }
function hookEnd(){ hk.on=false; hookEl.classList.add('hidden'); }
const hookExpired=()=>hk.on&&hk.t>=hk.win;
/* ---------- 大字提示 ---------- */
const popEl=$('pop'); let popT=0;
function pop(txt,cls){ popEl.textContent=txt; popEl.className='show '+(cls||''); clearTimeout(popT); popT=setTimeout(()=>{ popEl.className=''; },1100); }
/* ---------- 拋竿距離 ---------- */
const ctEl=$('castTag'); let ctT=0;
function castTag(d){ ctEl.innerHTML='拋竿距離<b>'+d.toFixed(2)+' 米</b>'; ctEl.classList.remove('hidden'); clearTimeout(ctT); ctT=setTimeout(()=>ctEl.classList.add('hidden'),1500); }   // 只閃一下；之後由水面的距離標記接手，不重複顯示
/* ---------- 連擊 ---------- */
const cbEl=$('combo');
function combo(n){ if(n>=2){ cbEl.innerHTML='連擊 <b>×'+n+'</b><small>獎勵 +'+Math.min(n,6)*5+'%</small>'; cbEl.classList.remove('hidden'); cbEl.classList.remove('bump'); void cbEl.offsetWidth; cbEl.classList.add('bump'); } else cbEl.classList.add('hidden'); }
/* ---------- 尺寸獎牌 ---------- */
const medalLv=fd=>fd.u>=.9?3:fd.u>=.7?2:fd.u>=.4?1:0;
const MEDAL=['','🥉 銅牌尺寸','🥈 銀牌尺寸','👑 金冠尺寸'];
function medalBadge(fd){ const m=medalLv(fd), el=$('cMedal'); el.textContent=MEDAL[m]; el.classList.toggle('hidden',!m); el.className='badge md'+m+(m?'':' hidden'); }

/* ---------- 魚群熱點 ---------- */
const hot={on:false,x:0,z:0,t:0}; let hotT=rand(45,90), hotFx=0, hotRip=0;
const hotEl=$('hotChip');
function spawnHot(){ if(window.__ENDON&&window.__ENDON()) return false; const b=c.G.base, a=G.head+rand(-.5,.5), d=rand(14,30);
  const x=b.x-Math.sin(a)*d, z=b.z-Math.cos(a)*d; if(Math.hypot(x,z)>W.shoreR(Math.atan2(x,-z))-5) return false;
  Object.assign(hot,{on:true,x,z,t:55}); c.toast('🐟 魚群出現了！快拋過去','good',2000); c.vib(30); return true; }
const inHot=p=>hot.on&&Math.hypot(p.x-hot.x,p.z-hot.z)<5;
function updHot(dt){
  if(!hot.on){ hotT-=dt; if(hotT<=0){ hotT=rand(70,150); spawnHot(); } hotEl.classList.add('hidden'); return; }
  hot.t-=dt; if(hot.t<=0){ hot.on=false; c.toast('魚群散去了','',1400); return; }
  hotFx-=dt; if(hotFx<=0){ hotFx=rand(.15,.4); AT.ring(hot.x+rand(-3,3),hot.z+rand(-3,3),rand(.25,.5)); if(Math.random()<.35) P.splash(hot.x+rand(-2.5,2.5),0,hot.z+rand(-2.5,2.5),rand(3,8),.45); }
  hotRip-=dt; if(hotRip<=0){ hotRip=2.2; W.addRipple(hot.x+rand(-2,2),hot.z+rand(-2,2),.3); }
  const b=G.base, dx=hot.x-b.x, dz=hot.z-b.z, d=Math.hypot(dx,dz), fwd=G.head+G.yaw;
  let rel=Math.atan2(-dx,-dz)-fwd; while(rel>Math.PI) rel-=6.283; while(rel<-Math.PI) rel+=6.283;
  const arrow=Math.abs(rel)<.2?'⬆':rel>0?(rel>1.2?'⬅':'↖'):(rel<-1.2?'➡':'↗');
  hotEl.innerHTML='🐟 魚群 '+arrow+' '+Math.round(d)+' m <small>'+Math.ceil(hot.t)+' 秒</small>'; hotEl.classList.remove('hidden'); }

/* ---------- 寶物與雜物 ---------- */
const itemSrc={}; const gl=T.GLTFLoader?new T.GLTFLoader():null;
// 寶物模型不在開場載入（約 20MB）：開始遊戲 40 秒後在背景一個一個慢慢下載
const itemQ=[]; let itemK=0; if(gl) setTimeout(function nx(){ const it=ITEMS[itemK++]; if(!it) return; itemQ.push(it); loadItemModel(it); setTimeout(nx,2500); },40000);
function loadItemModel(it){ if(!gl||it._ld) return; it._ld=1; gl.load(it.file,g=>{ const s=g.scene, box=new T.Box3().setFromObject(s), sz=box.getSize(new T.Vector3()), ctr=box.getCenter(new T.Vector3());
  const k=1/Math.max(sz.x,sz.y,sz.z), wrap=new T.Group(); s.position.sub(ctr).multiplyScalar(k); s.scale.multiplyScalar(k); wrap.add(s); itemSrc[it.id]=wrap; },undefined,()=>{}); }
function rollItem(){ let tot=0; for(const it of ITEMS) tot+=it.p; let r=Math.random()*tot; for(const it of ITEMS){ r-=it.p; if(r<=0) return it; } return ITEMS[0]; }
function itemFish(it){ const g=new T.Group(); const src=itemSrc[it.id];
  if(src) g.add(src.clone(true));
  else { const ph=new T.Mesh(new T.IcosahedronGeometry(.5,2),new T.MeshStandardMaterial({color:0x4a4436,roughness:.8})); g.add(ph); loadItemModel(it);   // 還沒下載到：先放佔位，下載好立刻換成真的模型
    const iv=setInterval(()=>{ const s2=itemSrc[it.id]; if(s2){ clearInterval(iv); g.remove(ph); const o=s2.clone(true); o.traverse(m=>{ m.frustumCulled=false; }); g.add(o); } },300); setTimeout(()=>clearInterval(iv),60000); }
  g.traverse(o=>{ o.frustumCulled=false; }); return {group:g,uni:{uSwim:{value:0},uAmp:{value:0}},sp:ITEM_SP}; }
function itemCard(fd,show){ const it=fd.item, R=c.RAR[it.rare];
  $('catch').style.setProperty('--rc',it.rare>=2?R.col:'#9aa4ac');
  $('cLv').textContent='—'; $('cName').textContent=it.name; $('cRar').textContent=it.rare>=2?'寶物 TREASURE':'雜物 JUNK'; $('cSci').textContent='';
  $('cLen').textContent='—'; $('cW').textContent=fd.w.toFixed(1)+' kg'; $('cVal').textContent='🪙 '+fd.value.toLocaleString(); $('cDesc').textContent=it.desc;
  $('cXp').textContent=''; $('cNew').classList.add('hidden'); $('cMedal').classList.add('hidden');
  $('bSell').textContent='收下'; $('bSell').classList.remove('hidden'); $('bRel').classList.add('hidden');
  const tag=$('tag'); tag.style.animation='none'; void tag.offsetWidth; tag.style.animation='';
  show(); c.Snd.fanfare(it.rare>=2?it.rare:0); }
function itemEffect(it){ if(it.id==='compass'){ hotT=0; } else if(it.id==='watch'){ G.luck=.25; } }

/* ---------- 釣魚大賽（5 分鐘，比總重量） ---------- */
const RIV=['老王','釣魚阿伯','小美','阿凱','鬼頭刀阿明'];
const tour={on:false,t:0,me:0,riv:[]}; const tourEl=$('tour'), dlg=$('tourDlg');
const PRIZE=[750,350,150];
function tourOpen(){ if(tour.on) return; $('tourBody').innerHTML='和 5 位釣友比 <b>5 分鐘內釣到的總重量</b>。<br>報名費 🪙100，前三名獎金：🥇750 🥈350 🥉150。<br>小技巧：魚群熱點和大魚最能拉開差距。';
  $('tourGo').textContent='報名開賽（🪙100）'; $('tourGo').dataset.mode='start'; dlg.classList.remove('hidden'); }
function tourStart(){ if(c.save.coins<100){ c.toast('金幣不夠報名','bad'); return; }
  c.save.coins-=100; c.persist(); c.setCoins(); const lv=c.save.lv||1;
  tour.on=true; tour.t=300; tour.me=0; tour.riv=RIV.map((n,i)=>({n,s:0,next:rand(8,30),k:(.5+i*.18)*(1+lv*.06)}));
  dlg.classList.add('hidden'); c.toast('🏆 大賽開始！','good',1600); c.Snd.fanfare(1); }
function tourCatch(fd){ if(tour.on&&!fd.item){ tour.me+=fd.w; c.toast('大賽成績 +'+fd.w.toFixed(2)+' kg','good',1400); } }
let tourDraw=0;
function updTour(dt){ if(!tour.on){ tourEl.classList.add('hidden'); return; }
  tour.t-=dt;
  for(const r of tour.riv){ r.next-=dt; if(r.next<=0){ r.next=rand(14,42); r.s+=Math.exp(rand(-1.4,1.3))*r.k; } }
  tourDraw-=dt; if(tourDraw<=0||tour.t<=0){ tourDraw=.5;
    const list=[{n:'你',s:tour.me,me:true},...tour.riv].sort((a,b)=>b.s-a.s);
    const m=Math.floor(Math.max(0,tour.t)/60), s=Math.floor(Math.max(0,tour.t)%60);
    tourEl.innerHTML='<div class="th">🏆 大賽 '+m+':'+String(s).padStart(2,'0')+'</div>'+list.map((x,i)=>`<div class="tr${x.me?' me':''}"><span>${i+1}. ${x.n}</span><b>${x.s.toFixed(1)} kg</b></div>`).join('');
    tourEl.classList.remove('hidden');
    if(tour.t<=0) tourEnd(list); } }
function tourEnd(list){ tour.on=false; const rank=list.findIndex(x=>x.me)+1, prize=PRIZE[rank-1]||0;
  if(prize){ c.save.coins+=prize; c.setCoins(); }
  if(rank===1) c.save.trophies=(c.save.trophies||0)+1; c.persist();
  $('tourBody').innerHTML=`你的名次：<b>第 ${rank} 名</b>（${tour.me.toFixed(2)} kg）<br>${prize?'獎金 🪙'+prize:'這次沒拿到獎金，再接再厲！'}<br>冠軍獎盃累計：🏆×${c.save.trophies||0}`;
  $('tourGo').textContent='知道了'; $('tourGo').dataset.mode='close'; dlg.classList.remove('hidden'); c.Snd.fanfare(rank===1?4:rank<=3?2:0); }
$('bTour').addEventListener('click',tourOpen);
$('tourGo').addEventListener('click',e=>{ if(e.currentTarget.dataset.mode==='start') tourStart(); else dlg.classList.add('hidden'); });
$('tourX').addEventListener('click',()=>dlg.classList.add('hidden'));

/* ---------- 拍照留念 ---------- */
$('bPhoto').addEventListener('click',()=>{ try{
  W.render(); const src=W.renderer.domElement, cv=document.createElement('canvas'); cv.width=src.width; cv.height=src.height;
  const x=cv.getContext('2d'); x.drawImage(src,0,0); const fd=G.fd, s=cv.width/400;
  const gr=x.createLinearGradient(0,cv.height*.72,0,cv.height); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.75)'); x.fillStyle=gr; x.fillRect(0,cv.height*.72,cv.width,cv.height*.28);
  x.fillStyle='#fff'; x.font=`900 ${22*s}px sans-serif`; x.fillText(fd.item?fd.item.name:fd.sp.name,16*s,cv.height-46*s);
  x.font=`600 ${13*s}px sans-serif`; x.fillStyle='#f0d890';
  x.fillText((fd.item?'':(fd.L*100).toFixed(1)+' cm ・ ')+(fd.w<1?Math.round(fd.w*1000)+' g':fd.w.toFixed(2)+' kg')+' ・ '+new Date().toLocaleDateString('zh-TW')+' ・ 濕地垂釣',16*s,cv.height-22*s);
  const a=document.createElement('a'); a.download='濕地垂釣_'+Date.now()+'.jpg'; a.href=cv.toDataURL('image/jpeg',.92); document.body.appendChild(a); a.click(); a.remove();
  c.toast('照片已存到下載資料夾','good');
}catch(e){ c.toast('這個瀏覽器不支援拍照存檔','bad'); } });

/* ---------- 美人魚相遇（使用插畫，不再顯示簡陋 3D 模型） ---------- */
const mer=$('mer'), merImg=$('merImg'), merTx=$('merTx');
function vision(){ merImg.src='mer_b2.jpg'; merTx.innerHTML='水面下……有什麼在發光'; mer.className='vision'; setTimeout(()=>{ if(mer.className==='vision') mer.className='hidden'; },2600); }
function mermaidScene(live){ merImg.src='mer_a2.jpg'; merImg.style.display=live?'none':''; merTx.innerHTML=live?'<b>美人魚</b>她靜靜看著你，彷彿早就知道你會來。<br><small>點她和她說說話；送她回家，她會留下一份謝禮。</small>':'<b>美人魚</b>她靜靜看著你，彷彿早就知道你會來。<br><small>送她回家，她會留下一份謝禮。</small>'; mer.className='scene'+(live?' live':''); }   // live：她本人就在船前面，不用再顯示照片
$('merX').addEventListener('click',()=>{ mer.className='hidden'; });
merImg.addEventListener('error',()=>{ if(mer.className!=='hidden') mer.className='hidden'; });

/* ---------- 目標、成就與人魚之約 ---------- */
const S=c.save;
const dexV=()=>Object.values(S.dex||{});
const maxW=()=>dexV().reduce((m,d)=>Math.max(m,d.bw||0),0);
const golds=()=>dexV().filter(d=>(d.md||0)>=3).length;
const merN=()=>(S.mer&&S.mer.n)||0;
// 依釣點自動產生「專屬魚種全收集」成就：新增魚種或釣點時會自動跟著更新
const spotAch=()=>SPOTS.map(s=>{ const ids=P.SPECIES.filter(sp=>sp.spots&&sp.spots.includes(s.id)).map(sp=>sp.id); if(!ids.length) return null;
  return ['spot_'+s.id,s.name+'行家','收集'+s.name+'的全部專屬魚種（'+ids.length+' 種）',()=>[ids.filter(id=>S.dex&&S.dex[id]).length,ids.length],600*ids.length]; }).filter(Boolean);
const ACH=[
 ['first','第一條魚','釣到第一條魚',()=>[S.total||0,1],100],
 ['gram1','鱷口脫險','划獨木舟撞開鬧場的鱷魚',()=>[S.gatorRam||0,1],600],
 ['gram10','鱷魚剋星','撞開鬧場的鱷魚 10 次',()=>[S.gatorRam||0,10],3000],
 ['ice1','冰上漁人','在冰湖釣到第一條魚',()=>[S.iceN||0,1],1500],
 ['pike','冰下霸主','釣到白斑狗魚',()=>[(S.dex&&S.dex.pike&&S.dex.pike.n)||0,1],3000],
 ['c50','釣魚老手','累計釣到 50 尾',()=>[S.total||0,50],1000],
 ['c200','濕地傳奇','累計釣到 200 尾',()=>[S.total||0,200],5000],
 ['sp6','小小圖鑑家','發現 6 種魚',()=>[dexV().length,6],800],
 ['sp15','圖鑑新手','發現 15 種魚',()=>[dexV().length,15],1500],
 ['sp30','圖鑑達人','發現 30 種魚',()=>[dexV().length,30],4000],
 ['sp45','圖鑑大師','發現 45 種魚',()=>[dexV().length,45],7000],
 ['spAll','圖鑑全收集','發現所有魚種',()=>[dexV().length,c.SPN],10000],
 ['gold1','第一頂金冠','釣到金冠尺寸的魚',()=>[golds(),1],500],
 ['gold8','金冠收藏家','8 種魚拿到金冠',()=>[golds(),8],4000],
 ['big10','十公斤巨物','釣到 10 公斤以上的魚',()=>[maxW(),10],1500],
 ['big30','濕地巨獸','釣到 30 公斤以上的魚',()=>[maxW(),30],6000],
 ['combo5','五連擊','連續釣到 5 尾',()=>[S.maxCombo||0,5],800],
 ['combo10','十連擊大師','連續釣到 10 尾',()=>[S.maxCombo||0,10],3000],
 ['perf20','起鉤神手','完美起鉤 20 次',()=>[S.perf||0,20],1500],
 ['hot10','追魚群的人','在魚群熱點釣到 10 尾',()=>[S.hotC||0,10],1200],
 ['tour1','大賽冠軍','贏得 1 次釣魚大賽',()=>[S.trophies||0,1],1500],
 ['tour5','常勝軍','贏得 5 次釣魚大賽',()=>[S.trophies||0,5],6000],
 ['item10','拾荒者','撈起 10 件物品',()=>[S.items||0,10],600],
 ['chest','尋寶人','撈到沉沒的寶箱',()=>[S.chests||0,1],1000],
 ['lv10','十級釣手','等級達到 10',()=>[S.lv||1,10],3000],
 ['mer1','傳說之約','第一次遇見美人魚',()=>[merN(),1],3000],
 ['mer5','人魚的知己','和美人魚相遇 5 次',()=>[merN(),5],15000],
 ['sea1','揚帆出海','第一次開遊艇出海',()=>[S.seaTrips||0,1],2000],
 ['scene3','美景獵人','拍下 3 種美景',()=>[Object.keys(S.scenes||{}).length,3],1200],
 ['sceneAll','美景收藏家','拍下全部 8 種美景',()=>[Object.keys(S.scenes||{}).length,8],8000]];
ACH.push(...spotAch());
const MER_NEXT=['第 1 次相遇：她會告訴你一個秘密地點','第 2 次相遇：她會送你月光餌','第 3 次相遇：人魚之竿','第 4 次相遇：人魚的祝福','第 5 次相遇：月下之歌',
  '第 6 次相遇：月光餌 ×5','第 7 次相遇：潮汐之語（傳說魚 +15%）','第 8 次相遇：人魚的鱗片（賣魚收入 +10%）','第 9 次相遇：沉船裡的金幣','第 10 次相遇：人魚的祝福・貳（稀有魚再提升）',
  '第 11 次相遇：月光餌 ×10','第 12 次相遇：滄淵的回禮','第 13 次相遇：月潮之歌（傳說魚再 +15%）','第 14 次相遇：月光餌 ×15','第 15 次相遇：月潮的守護者（賣魚收入 +20%）'];
// 第 6 次以後的禮物（加成本身在釣魚與賣魚時依相遇次數判斷）
const MER_GIFT={6:{moon:5},9:{coins:20000},11:{moon:10},12:{coins:50000},14:{moon:15},15:{coins:100000}};
const STORY=[
 ['她把一片發光的鱗片放在你掌心，用指尖在水面畫出一個位置。「月光灣……只告訴你。」','解鎖秘境：月光灣（獨木舟可前往，夜裡傳說生物最多）'],
 ['她記得你了。這次她從水底撈起一串散發微光的餌，輕輕掛在你的釣竿上。','月光餌 ×3'],
 ['她送你一根像月光般潔白的釣竿，竿身刻著看不懂的古老文字。','人魚之竿（到釣具店免費裝備）'],
 ['她握住你的手，低聲唱了一段旋律。從今以後，濕地的魚似乎都對你特別友善。','人魚的祝福：稀有魚機率永久提升'],
 ['滿月的夜裡，她在月光灣為你唱完整首歌。整片濕地的螢火蟲同時亮了起來。','成就「人魚的知己」可以領取 🪙15000'],
 ['她從水底捧起一把發光的餌，像撒星星一樣撒進你的餌盒。','月光餌 ×5'],
 ['她教你聽水的聲音。「潮水會告訴你，傳說在哪裡呼吸。」','潮汐之語：傳說魚上鉤機率永久 +15%'],
 ['她拔下一片最亮的鱗片，繫在你的釣竿上。「魚市的人會知道，這是被人魚祝福過的魚。」','人魚的鱗片：賣魚收入永久 +10%'],
 ['她帶你看湖底一艘很老很老的沉船，從船艙裡推出一只生鏽的錢箱。','金幣 🪙20000'],
 ['她又握住你的手，這次唱得更久。湖面上的月光，一路鋪到你的船邊。','人魚的祝福・貳：稀有魚機率再提升'],
 ['「這些給你，滿月的晚上用。」她把餌一顆一顆排在你的船舷上。','月光餌 ×10'],
 ['她說：「爸爸（滄淵）要我把這個交給你。」是一袋被海水磨亮的古老金幣。','滄淵的回禮 🪙50000'],
 ['她在月光灣唱起一首你從沒聽過的歌，遠方的海也跟著輕輕應和。','月潮之歌：傳說魚上鉤機率再 +15%'],
 ['她把一整串發光的餌掛在你的燈下。「這樣，湖裡的大家都知道你來了。」','月光餌 ×15'],
 ['滿月正圓。她在你面前低下頭，像當年老漁人對她那樣，輕聲說：「謝謝你，一直守著這片湖。」','稱號「月潮的守護者」・賣魚收入 +20%・🪙100000']];
const fmt=v=>v%1?v.toFixed(1):v;
function merHearts(m){ return '💗'.repeat(Math.min(m,5))+'🤍'.repeat(Math.max(0,5-m))+(m>=5?' '+'🌕'.repeat(Math.min(m-5,10))+'🌑'.repeat(Math.max(0,10-(m-5))):''); }
function goalsRender(){ const m=merN();
  let h=`<div class="merbox"><b>🧜 人魚之約</b><span>${merHearts(m)}</span><small>${m<15?'下一步：'+MER_NEXT[m]:'你已是月潮的守護者，她仍會在夜裡來看你'}</small><small style="opacity:.7">每次相遇後，她要過一段時間才會再出現</small>${m===0?'<small>提示：夜晚、起霧或深水中央，用月光餌最容易遇見她。</small>':''}</div>`;
  h+=ACH.map(a=>{ const [cur,g]=a[3](), done=cur>=g, cl=S.ach&&S.ach[a[0]];
    return `<div class="row"><div class="nm"><b>${a[1]}</b><small>${a[2]}（${fmt(Math.min(cur,g))}/${g}）</small><span class="pbar"><i style="width:${Math.min(100,cur/g*100)}%"></i></span></div><div class="rt">${cl?'<span class="eqd">已領取</span>':done?`<button class="sbtn pri" data-ach="${a[0]}">領 🪙${Math.round(a[4]*.5)}</button>`:`<small>🪙${Math.round(a[4]*.5)}</small>`}</div></div>`; }).join('');
  $('goalB').innerHTML=h; }
function goalsDot(){ $('bGoal').classList.toggle('dotn',ACH.some(a=>{ const [cur,g]=a[3](); return cur>=g&&!(S.ach&&S.ach[a[0]]); })); }
$('bGoal').addEventListener('click',()=>{ goalsRender(); $('goal').classList.remove('hidden'); });
$('goalX').addEventListener('click',()=>$('goal').classList.add('hidden'));
$('goal').addEventListener('click',e=>{ if(e.target.id==='goal') $('goal').classList.add('hidden'); const b=e.target.closest('[data-ach]'); if(!b) return;
  const a=ACH.find(x=>x[0]===b.dataset.ach); if(!a) return; S.ach=S.ach||{}; if(S.ach[a[0]]) return;
  const ac=Math.round(a[4]*.5); S.ach[a[0]]=1; S.coins+=ac; c.persist(); c.setCoins(); c.Snd.coin(); c.toast('成就達成：'+a[1]+'　🪙'+ac,'good',2200); goalsRender(); goalsDot(); });
function merMeet(){ S.mer=S.mer||{n:0}; S.mer.n++; S.mer.last=Date.now(); const n=S.mer.n;
  if(n===2){ S.baits=S.baits||{}; S.baits.moon=(S.baits.moon||0)+3; }
  const gf=MER_GIFT[n]; if(gf){ if(gf.moon){ S.baits=S.baits||{}; S.baits.moon=(S.baits.moon||0)+gf.moon; } if(gf.coins){ S.coins+=gf.coins; if(c.setCoins) c.setCoins(); } }
  G.luck=.25; c.persist(); goalsDot();
  const st=STORY[n-1]||['她又來看你了，在你的浮標旁繞了一圈才離開。','好運加滿'];
  $('stT').textContent='人魚之約　'+merHearts(n); $('stB').textContent=st[0]; $('stR').textContent='獲得：'+st[1];
  $('story').classList.remove('hidden'); c.Snd.fanfare(4); }
$('stX').addEventListener('click',()=>$('story').classList.add('hidden'));
setTimeout(goalsDot,500);
let dotT=0;
function update(dt){
  dotT-=dt; if(dotT<=0){ dotT=3; goalsDot(); }
  if(hk.on){ hk.t+=dt; hgM.style.bottom=(hpos()*100)+'%'; htF.style.height=(clamp(1-hk.t/hk.win,0,1)*100)+'%'; }
  updHot(dt); updTour(dt);
}
// 落點和魚群的關係：砸在正中間會把魚群嚇散；落在魚群前方最好
function hotHit(p){ if(!hot.on) return null; const d=Math.hypot(p.x-hot.x,p.z-hot.z); if(d<1.6){ hot.on=false; hot.t=0; hotEl.classList.add('hidden'); return 'center'; } return d<5?'in':null; }
return {hotHit,items:ITEMS,spawnHot,goalsDot,merMeet,ITEM_SP,hookStart,hookPress,hookEnd,hookExpired,pop,castTag,combo,medalLv,medalBadge,inHot,rollItem,itemFish,itemCard,itemEffect,tourCatch,vision,mermaidScene,update};
}
/* ===== 出海與美景：遊艇、海豚、鯨魚、鯊魚、飛魚、彩虹、鳥群、流星雨、黃金時刻 ===== */
const SCENES={rainbow:'彩虹',flock:'歸鳥成群',meteor:'流星雨',golden:'黃金時刻',dolphin:'海豚群',whale:'鯨魚',shark:'鯊魚巡游',flyfish:'飛魚掠海'};
function createSea(W,P,AT,c){
'use strict';
const T=THREE, S=W.scene, G=c.G, $=id=>document.getElementById(id);
const clamp=(x,a,b)=>x<a?a:x>b?b:x, rand=(a,b)=>a+Math.random()*(b-a), sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const tv=new T.Vector3(), tv2=new T.Vector3(), tv3=new T.Vector3(), cw=new T.Vector3();
const fwd=(a,o)=>o.set(-Math.sin(a),0,-Math.cos(a));
const base=()=>G.base;
function gradTex(top,bot,mid){ const d=new Uint8Array(4*64); for(let i=0;i<64;i++){ const t=i/63, k=sstep(mid-.12,mid+.12,t); for(let j=0;j<3;j++) d[i*4+j]=bot[j]+(top[j]-bot[j])*k; d[i*4+3]=255; }
  const t=new T.DataTexture(d,1,64,T.RGBAFormat); t.encoding=T.sRGBEncoding; t.magFilter=T.LinearFilter; t.needsUpdate=true; return t; }

/* ---------- 遊艇（船頭甲板、柚木地板、不鏽鋼欄杆） ---------- */
const yacht=new T.Group(); yacht.visible=false; S.add(yacht);
{ const out=[[-1.6,2],[-1.6,-2],[-1.15,-4.5],[0,-6.3],[1.15,-4.5],[1.6,-2],[1.6,2]];
  const shp=new T.Shape(); out.forEach((p,i)=>i?shp.lineTo(p[0],-p[1]):shp.moveTo(p[0],-p[1]));
  const white=new T.MeshPhysicalMaterial({color:0xf4f4f0,roughness:.25,clearcoat:.9,clearcoatRoughness:.1});
  const hull=new T.Mesh(new T.ExtrudeGeometry(shp,{depth:1.6,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:3}),white); hull.rotation.x=-Math.PI/2; hull.position.y=0; yacht.add(hull);
  const stripe=new T.Mesh(new T.ExtrudeGeometry(shp,{depth:.12,bevelEnabled:false}),new T.MeshPhysicalMaterial({color:0x1d3f7a,roughness:.3,clearcoat:.8}));
  stripe.rotation.x=-Math.PI/2; stripe.position.y=1.2; stripe.scale.set(1.012,1.012,1); yacht.add(stripe);
  const teakT=new T.TextureLoader().load('dock_diff.jpg'); teakT.encoding=T.sRGBEncoding; teakT.wrapS=teakT.wrapT=T.RepeatWrapping; teakT.repeat.set(2,4);
  const inner=new T.Shape(); out.forEach((p,i)=>{ const x=p[0]*.9, z=-(p[1]*.94); i?inner.lineTo(x,z):inner.moveTo(x,z); });
  const deck=new T.Mesh(new T.ShapeGeometry(inner),new T.MeshStandardMaterial({map:teakT,color:0xc89a6a,roughness:.7})); deck.rotation.x=-Math.PI/2; deck.position.y=1.69; yacht.add(deck);
  const steel=new T.MeshStandardMaterial({color:0xe6e9ec,metalness:1,roughness:.15});
  const rp=out.slice(0,7).map(p=>new T.Vector3(p[0]*.93,2.45,p[1]*.95));
  yacht.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rp),80,.025,8),steel));
  rp.forEach((p,i)=>{ if(i===3) return; const s=new T.Mesh(new T.CylinderGeometry(.018,.018,.78,8),steel); s.position.set(p.x,2.07,p.z); yacht.add(s); });
  yacht.traverse(o=>{ o.frustumCulled=false; }); }

/* ---------- 船體避讓：所有靠近遊艇的東西都要在船殼外 ---------- */
let HX=1.6, HZ0=-6.3, HZ1=2;
function setHull(x,z0,z1){ HX=x; HZ0=z0; HZ1=z1; }
function hullLocal(p){ const b=base(), h=G.head, cs=Math.cos(h), sn=Math.sin(h), dx=p.x-b.x, dz=p.z-b.z; return [dx*cs-dz*sn, dx*sn+dz*cs, cs, sn, b]; }
function hullClear(p,m){ if(!yacht.visible) return false; const [lx,lz,cs,sn,b]=hullLocal(p), x0=-HX-m, x1=HX+m, z0=HZ0-m, z1=HZ1+m;
  if(!(lx>x0&&lx<x1&&lz>z0&&lz<z1)) return false;
  const dl=[lx-x0,x1-lx,lz-z0,z1-lz], k=dl.indexOf(Math.min(...dl)); let nx=lx, nz=lz;
  if(k===0) nx=x0; else if(k===1) nx=x1; else if(k===2) nz=z0; else nz=z1;
  p.x=b.x+nx*cs+nz*sn; p.z=b.z-nx*sn+nz*cs; return true; }
function hullOut(p,o){ const b=base(); if(!yacht.visible){ o.set(p.x-b.x,0,p.z-b.z); if(o.lengthSq()<1e-4) o.set(0,0,-1); return o.normalize(); }
  const [lx,lz,cs,sn]=hullLocal(p); let vx=lx-clamp(lx,-HX,HX), vz=lz-clamp(lz,HZ0,HZ1);
  if(vx*vx+vz*vz<1e-6){ vx=lx<0?-1:1; vz=0; } const l=Math.hypot(vx,vz); vx/=l; vz/=l; return o.set(vx*cs+vz*sn,0,-vx*sn+vz*cs); }

if(window.__MDL){ window.__MDL.attachYacht(yacht,setHull,SPOTS); }
/* ---------- 海豚 ---------- */
const dTex=gradTex([62,74,90],[214,220,226],.42);
const dMat=new T.MeshPhysicalMaterial({map:dTex,roughness:.35,clearcoat:.8,clearcoatRoughness:.2});
function makeDolphin(){ const g=new T.Group();
  const b=new T.Mesh(new T.SphereGeometry(1,24,16),dMat); b.scale.set(.2,.21,1); g.add(b);
  const sn=new T.Mesh(new T.CylinderGeometry(.03,.06,.22,10),dMat); sn.rotation.x=Math.PI/2; sn.position.set(0,-.04,1.02); g.add(sn);
  const fs=new T.Shape(); fs.moveTo(0,0); fs.quadraticCurveTo(.05,.28,-.18,.36); fs.quadraticCurveTo(-.1,.15,-.3,0); fs.lineTo(0,0);
  const fin=new T.Mesh(new T.ShapeGeometry(fs),dMat); fin.rotation.y=Math.PI/2; fin.position.set(0,.17,.1); g.add(fin);
  const fl=new T.Shape(); fl.moveTo(0,0); fl.quadraticCurveTo(.2,-.1,.38,-.22); fl.quadraticCurveTo(.15,-.18,0,-.08); fl.quadraticCurveTo(-.15,-.18,-.38,-.22); fl.quadraticCurveTo(-.2,-.1,0,0);
  const tail=new T.Mesh(new T.ShapeGeometry(fl),dMat); tail.rotation.x=-Math.PI/2; tail.position.set(0,0,-.92); g.add(tail);
  for(const s of [1,-1]){ const p=new T.Mesh(new T.SphereGeometry(1,10,6),dMat); p.scale.set(.16,.02,.07); p.position.set(s*.2,-.1,.35); p.rotation.y=s*.6; g.add(p); }
  g.scale.setScalar(2.2); g.visible=false; g.traverse(o=>{ o.frustumCulled=false; }); S.add(g); return g; }
const dolphins=[]; for(let i=0;i<6;i++) dolphins.push({g:makeDolphin(),ph:0,t:0,on:false});
if(window.__MDL) dolphins.forEach(o=>window.__MDL.attach(o.g,'dolphin',{len:2.4,target:'+z',clip:'Swim'}));

/* ---------- 鯨魚（座頭鯨） ---------- */
const wTex=gradTex([34,40,48],[180,186,190],.35);
const wMat=new T.MeshPhysicalMaterial({map:wTex,roughness:.55,clearcoat:.4,side:T.DoubleSide});
const whale=new T.Group(); whale.visible=false; whale.rotation.order='YXZ'; S.add(whale);
{ const b=new T.Mesh(new T.SphereGeometry(1,32,20),wMat); b.scale.set(1.6,1.5,7); whale.add(b);
  for(const s of [1,-1]){ const f=new T.Mesh(new T.SphereGeometry(1,12,8),wMat); f.scale.set(2.6,.12,.5); f.position.set(s*2.4,-.6,2.5); f.rotation.set(0,s*.5,s*-.3); whale.add(f); } }
// 座頭鯨（使用者提供側面、俯視設定圖生成）：模型原本頭朝上，載入後自動綁骨，再轉成水平、頭朝 +z
let whaleRig=null; const WP={tail:.18,tailF:1.2,bend:0,arch:0};
let whaleLoaded=false; function loadWhale(){ if(whaleLoaded||!T.GLTFLoader) return; whaleLoaded=true;   // 鯨魚模型 8.6MB：第一次出海才下載
 new T.GLTFLoader().load('models/whale2.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; if(m.material){ m.material.roughness=.42; m.material.metalness=.05; } } });
  o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()); o.scale.setScalar(13/Math.max(sz.y,1e-6)); o.updateMatrixWorld(true);
  const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-c2.y,-c2.z);
  const holder=new T.Group(); holder.add(o); holder.updateMatrixWorld(true); try{ whaleRig=autoRig(o,'tail'); }catch(e){ console.warn('whale rig',e); }
  const turn=new T.Group(); turn.rotation.set(-Math.PI/2,Math.PI,0,'YXZ'); turn.add(holder);
  whale.children.forEach(ch=>{ ch.visible=false; }); whale.add(turn); whale.userData.real=true; },undefined,()=>{ if(window.__MDL) window.__MDL.attach(whale,'whale',{len:13,target:'+z'}); }); }
const fluke=new T.Group(); fluke.visible=false; S.add(fluke);
{ const sh=new T.Shape(); sh.moveTo(0,.25); sh.quadraticCurveTo(-1.2,.5,-2.6,1.6); sh.quadraticCurveTo(-1.7,.6,-1.5,0); sh.quadraticCurveTo(-1.7,-.6,-2.6,-1.6); sh.quadraticCurveTo(-1.2,-.5,0,-.25); sh.lineTo(0,.25);
  const f=new T.Mesh(new T.ShapeGeometry(sh,14),wMat); f.rotation.z=-Math.PI/2; f.position.y=2.6; fluke.add(f);
  const st=new T.Mesh(new T.CylinderGeometry(.35,.9,2.8,14),wMat); st.position.y=1.3; fluke.add(st); }

/* 鯨魚的水花系統：水滴（受重力落回海面）、水霧（噴氣與落水後的白霧，飄散變淡）、海面泡沫圈（往外擴散） */
const dropTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), rg=g.createRadialGradient(16,16,0,16,16,16); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(.45,'rgba(240,248,255,.75)'); rg.addColorStop(1,'rgba(230,240,250,0)'); g.fillStyle=rg; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
function partSys(N,size,opacity,grav,drag){ const pos=new Float32Array(N*3), vel=new Float32Array(N*3), life=new Float32Array(N); const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3));
  const m=new T.PointsMaterial({map:dropTex,size,transparent:true,opacity,depthWrite:false,color:0xf2f8ff}); const pts=new T.Points(g,m); pts.frustumCulled=false; S.add(pts); let head=0;
  for(let i=0;i<N;i++) pos[i*3+1]=-999;
  return {mat:m,emit(x,y,z,n,spd,up,spread,lf){ for(let k=0;k<n;k++){ const i=head; head=(head+1)%N; const a=Math.random()*6.283, r=Math.random()*spread;
      pos[i*3]=x+Math.cos(a)*r; pos[i*3+1]=y+Math.random()*.5; pos[i*3+2]=z+Math.sin(a)*r;
      const hs=spd*(.3+Math.random()*.7); vel[i*3]=Math.cos(a)*hs; vel[i*3+1]=up*(.55+Math.random()*.6); vel[i*3+2]=Math.sin(a)*hs; life[i]=lf*(.6+Math.random()*.6); } },
    tick(dt,wind){ let any=false; for(let i=0;i<N;i++){ if(life[i]<=0) continue; any=true; life[i]-=dt; vel[i*3+1]-=grav*dt; const dk=Math.exp(-drag*dt); vel[i*3]=vel[i*3]*dk+(wind||0)*dt; vel[i*3+2]*=dk; vel[i*3+1]*=grav>3?1:dk;
        pos[i*3]+=vel[i*3]*dt; pos[i*3+1]+=vel[i*3+1]*dt; pos[i*3+2]+=vel[i*3+2]*dt; if(life[i]<=0||pos[i*3+1]<-.3) { life[i]=0; pos[i*3+1]=-999; } }
      if(any) g.attributes.position.needsUpdate=true; pts.visible=any; } }; }
// 霧氣貼圖：不規則的雲絮（多個小團疊成），不是一顆顆圓球
const mistTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=64; const g=cv.getContext('2d');
  for(let i=0;i<14;i++){ const x=16+Math.random()*32, y=16+Math.random()*32, r=6+Math.random()*12, rg=g.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,'rgba(255,255,255,.28)'); rg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=rg; g.fillRect(0,0,64,64); }
  return new T.CanvasTexture(cv); })();
const SPRAY=partSys(2400,.5,.95,9.8,.12), MIST=partSys(900,2.6,.16,1.2,.9); MIST.mat.map=mistTex; MIST.mat.needsUpdate=true;
const foamTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=256; const g=cv.getContext('2d');
  for(let i=0;i<900;i++){ const a=Math.random()*6.283, r=70+Math.random()*55*Math.random()+Math.random()*40, x=128+Math.cos(a)*r*.95, y=128+Math.sin(a)*r*.95, s2=1+Math.random()*4; g.fillStyle=`rgba(255,255,255,${.15+Math.random()*.5})`; g.beginPath(); g.arc(x,y,s2,0,7); g.fill(); }
  const rg=g.createRadialGradient(128,128,10,128,128,128); rg.addColorStop(0,'rgba(255,255,255,.35)'); rg.addColorStop(.6,'rgba(255,255,255,.12)'); rg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=rg; g.fillRect(0,0,256,256); return new T.CanvasTexture(cv); })();
const foams=[]; for(let i=0;i<4;i++){ const m=new T.Mesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:foamTex,transparent:true,opacity:0,depthWrite:false,color:0xf4fbff})); m.visible=false; m.renderOrder=2; S.add(m); foams.push({m,t:9,dur:1,r0:1,r1:1}); }
function foam(x,z,r0,r1,dur){ const f=foams.find(q=>q.t>=q.dur)||foams[0]; Object.assign(f,{t:0,dur,r0,r1}); f.m.position.set(x,.06,z); f.m.rotation.y=Math.random()*6.28; f.m.visible=true; }
function updFoam(dt){ for(const f of foams){ if(f.t>=f.dur){ f.m.visible=false; continue; } f.t+=dt; const k=f.t/f.dur, r=f.r0+(f.r1-f.r0)*(1-Math.pow(1-k,2)); f.m.scale.set(r*2,1,r*2); f.m.material.opacity=.9*(1-k); } }
// 噴氣：一道往上衝、被風吹斜、慢慢散開的白霧柱
function blow(x,z){ for(let k=0;k<6;k++) setTimeout(()=>{ SPRAY.emit(x,.8,z,110,.55,13,.25,1.9); MIST.emit(x,1.5+k*.6,z,26,.6,6.5,.35,3.6); },k*70); c.Snd.splash&&c.Snd.splash(.5); }
// 巨大落水：放射狀水牆、四散水滴、白霧、泡沫圈、海面漣漪、船身震動
function crash(x,z,big){ SPRAY.emit(x,.5,z,big?520:260,big?9:6,big?13:9,big?4:2.5,2.4); SPRAY.emit(x,.5,z,big?200:90,3,big?20:13,1.5,2.8);
  MIST.emit(x,.8,z,big?160:80,3.2,big?3.2:2,big?4:2.5,3.6); foam(x,z,big?3:2,big?22:12,big?9:6); foam(x,z,1,big?12:7,big?6:4);
  for(let i=0;i<3;i++) setTimeout(()=>W.addRipple(x,z,big?2.5:1.5),i*250);
  if(c.Snd.splash){ c.Snd.splash(big?2.6:1.6); if(big) setTimeout(()=>c.Snd.splash(1.8),180); }
  const d=Math.hypot(x-cw.x,z-cw.z); if(big&&d<80){ G.gShake=Math.max(G.gShake||0,1.6*(1-d/90)); if(navigator.vibrate) try{ navigator.vibrate([90,40,140]); }catch(e){} } }

/* ---------- 鯊魚背鰭 ---------- */
const sfMat=new T.MeshStandardMaterial({color:0x40464e,roughness:.45,side:T.DoubleSide});
const sfin=new T.Group(); sfin.visible=false; S.add(sfin);
{ const s=new T.Shape(); s.moveTo(.35,0); s.quadraticCurveTo(.2,.45,-.15,.75); s.quadraticCurveTo(-.12,.35,-.4,0); s.lineTo(.35,0);
if(window.__MDL){  window.__MDL.attach(fluke,'whale',{len:13,target:'+z',pitch:1.25,off:[0,-3.4,2.05]}); window.__MDL.attach(sfin,'gwhite',{len:4.2,target:'+x',top:.34,clip:'Swim'}); }
  const m=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.04,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:2}),sfMat); m.rotation.y=Math.PI/2; m.position.y=-.1; sfin.add(m); sfin.scale.setScalar(1.3); }

/* ---------- 飛魚 ---------- */
const ffMat=new T.MeshPhysicalMaterial({map:gradTex([40,70,120],[230,236,240],.5),metalness:.6,roughness:.25,clearcoat:.6,side:T.DoubleSide});
const flyers=[]; for(let i=0;i<7;i++){ const g=new T.Group(); const b=new T.Mesh(new T.SphereGeometry(1,12,8),ffMat); b.scale.set(.05,.05,.2); g.add(b);
  for(const s of [1,-1]){ const w=new T.Mesh(new T.PlaneGeometry(.22,.12),ffMat); w.rotation.x=-Math.PI/2; w.position.set(s*.13,.01,.05); g.add(w); }
  g.visible=false; S.add(g); flyers.push({g,t:0,on:false}); if(window.__MDL) window.__MDL.attach(g,'flyfish',{len:.32,target:'+z'}); }

/* ---------- 彩虹、鳥群、流星 ---------- */
const rbMat=new T.ShaderMaterial({uniforms:{uA:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:'uniform float uA; varying vec2 vP; vec3 sp(float t){ return clamp(vec3(abs(t*6.0-3.0)-1.0, 2.0-abs(t*6.0-2.0), 2.0-abs(t*6.0-4.0)),0.0,1.0); } void main(){ float r=length(vP); float t=clamp((r-700.0)/60.0,0.0,1.0); float e=smoothstep(0.0,0.15,t)*(1.0-smoothstep(0.85,1.0,t)); gl_FragColor=vec4(sp(1.0-t)*e*uA, e*uA); }'});
const rainbow=new T.Mesh(new T.RingGeometry(700,760,160,1,0,Math.PI),rbMat); rainbow.visible=false; rainbow.frustumCulled=false; rainbow.renderOrder=4; S.add(rainbow);
const birdMat=new T.MeshBasicMaterial({color:0x1a1a1a,side:T.DoubleSide});
const birdG=new T.BufferGeometry(); birdG.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.5,.08,-.15,-.05,0,-.05, 0,0,0,.5,.08,-.15,.05,0,-.05],3));
const flock=[]; for(let i=0;i<18;i++){ const m=new T.Mesh(birdG,birdMat); m.visible=false; m.scale.setScalar(1.6); S.add(m); flock.push(m); }
if(window.__MDL) flock.forEach(m=>window.__MDL.attach(m,'gull',{len:.42,target:'+z'}));
const metMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false});
const mets=[]; for(let i=0;i<6;i++){ const m=new T.Mesh(new T.PlaneGeometry(1,1),metMat.clone()); m.visible=false; m.renderOrder=4; S.add(m); mets.push({m,t:9}); }

/* ---------- 地點切換 ---------- */
let loc='lake';
function setLoc(l){ loc=l; G.loc=l; const sea=l==='sea', ice=l==='ice'; if(sea) loadWhale(); W.setSea(sea); if(W.setIce) W.setIce(ice); if(window.__MDL) window.__MDL.preload(l);
  S.children.forEach(o=>{ if(o.userData&&o.userData.lake) o.visible=l==='lake'; });
  if(window.__REAL&&window.__REAL.useSet) window.__REAL.useSet(l);
  yacht.visible=sea; endAll(); if(sea){ evT=6; forced='dolphin'; }
  if(sea){ c.save.seaTrips=(c.save.seaTrips||0)+1; c.persist(); } }

/* ---------- 美景事件 ---------- */
const ev={id:null,t:0,dur:0,shot:false,data:{}}; let evT=rand(20,40), lastRain=0, forced=null, lakeT=0;
const banner=$('scene');
function canEv(id,day,wx){
  const sea=loc==='sea', p=c.period();
  if(id==='rainbow') return day>.5&&wx.c<.75&&(lastRain>0||Math.random()<.2);
  if(id==='flock') return (p==='day'||p==='dusk'||p==='dawn')&&wx.r<.3;
  if(id==='meteor') return p==='night'&&wx.c<.4;
  if(id==='golden') return (p==='dusk'||p==='dawn')&&wx.c<.5;
  if(id==='dolphin'||id==='flyfish') return sea&&day>.3&&wx.r<.6;
  if(id==='whale') return sea&&wx.r<.8;
  if(id==='shark') return sea;
  return false; }
function startEv(id){ Object.assign(ev,{id,t:0,shot:false,data:{}}); const b=base(), hd=G.head;
  if(id==='rainbow'){ ev.dur=55; rainbow.visible=true; }
  else if(id==='flock'){ ev.dur=28; const side=Math.random()<.5?1:-1, d=rand(80,140);
    ev.data={o:fwd(hd,new T.Vector3()).multiplyScalar(d).add(b).add(new T.Vector3(Math.cos(hd)*side*120,rand(28,45),-Math.sin(hd)*side*120)),v:new T.Vector3(-Math.cos(hd)*side*9,0,Math.sin(hd)*side*9)};
    flock.forEach((m,i)=>{ m.visible=true; m.userData.off=new T.Vector3((i%2?1:-1)*Math.ceil(i/2)*2.2,rand(-1,1),Math.ceil(i/2)*2.2*side); m.userData.ph=rand(0,6); }); }
  else if(id==='meteor'){ ev.dur=40; }
  else if(id==='golden'){ ev.dur=40; }
  else if(id==='dolphin'){ ev.dur=26; const side=Math.random()<.5?1:-1, d=rand(18,32);
    ev.data={p:fwd(hd+side*.9,new T.Vector3()).multiplyScalar(d).add(b),v:fwd(hd-side*Math.PI/2,new T.Vector3()).multiplyScalar(-6)};
    dolphins.forEach((o,i)=>{ o.on=i<rand(3,6.9); o.off=new T.Vector3(rand(-4,4),0,rand(-4,4)); o.t=rand(0,2); o.cyc=rand(1.6,2.8); }); c.Snd.bird(); }
  else if(id==='whale'){ ev.dur=34; const a=hd+rand(-.35,.35), p=fwd(a,new T.Vector3()).multiplyScalar(rand(28,38)).add(b), dir=a+Math.PI/2*(Math.random()<.5?1:-1); ev.data={p,dir,stage:0}; }
  else if(id==='shark'){ ev.dur=22; ev.data={a:rand(0,6.28),r:rand(9,15)}; sfin.visible=true; }
  else if(id==='flyfish'){ ev.dur=8; flyers.forEach(f=>{ f.on=true; f.t=-rand(0,4); f.p=fwd(G.head+rand(-.6,.6),new T.Vector3()).multiplyScalar(rand(8,20)).add(b); f.a=G.head+rand(-1.5,1.5); }); }
  banner.innerHTML='✨ '+SCENES[id]+'<small>按 📷 拍下來</small>'; banner.classList.remove('hidden','mini'); clearTimeout(banner._t); banner._t=setTimeout(()=>banner.classList.add('mini'),3500); $('bCam').classList.add('pulse'); }
function endAll(){ ev.id=null; banner.classList.add('hidden'); $('bCam').classList.remove('pulse'); rainbow.visible=false; flock.forEach(m=>m.visible=false); dolphins.forEach(o=>{ o.on=false; o.g.visible=false; });
  whale.visible=false; fluke.visible=false; if(!chase) sfin.visible=false; flyers.forEach(f=>{ f.on=false; f.g.visible=false; }); mets.forEach(m=>m.m.visible=false); }
function updEv(dt,t,wx,day){
  if(c.G&&c.G.state==='home'){ if(ev.id) endAll(); return; }   // 在小屋裡不會發生、也不會提示外面的事件
  W.camera.getWorldPosition(cw); SPRAY.tick(dt,0); MIST.tick(dt,1.2); updFoam(dt);
  if(!ev.id){ evT-=dt; if(evT<=0){ evT=loc==='sea'?rand(30,60):rand(45,90); if(c.underwater()) return;
      if(forced&&canEv(forced,day,wx)){ startEv(forced); forced=null; return; } forced=null;
      const ids=Object.keys(SCENES).filter(id=>canEv(id,day,wx)); if(ids.length) startEv(ids[Math.floor(Math.random()*ids.length)]); } return; }
  ev.t+=dt; const k=ev.t/ev.dur, d=ev.data;
  if(ev.id==='rainbow'){ const sd=W.U.uSunDisk.value; tv.copy(sd).multiplyScalar(-800).add(cw); rainbow.position.copy(tv); rainbow.lookAt(cw); rbMat.uniforms.uA.value=.32*sstep(0,.15,k)*(1-sstep(.8,1,k))*(1-wx.c); }
  else if(ev.id==='flock'){ d.o.addScaledVector(d.v,dt); flock.forEach(m=>{ m.position.copy(d.o).add(m.userData.off); m.lookAt(tv.copy(m.position).add(d.v)); if(!m.userData.real) m.scale.y=1.6*(.4+.6*Math.abs(Math.sin(t*6+m.userData.ph))); }); }
  else if(ev.id==='meteor'){ if(window.__SKY&&Math.random()<dt*2.6) window.__SKY.spawn(Math.random()<.12); }
  else if(ev.id==='dolphin'){ d.p.addScaledVector(d.v,dt);
    for(const o of dolphins){ if(!o.on) continue; o.t+=dt; const cy=o.cyc, ph=(o.t%cy)/cy, jump=ph>.55; const g=o.g;
      tv.copy(d.p).add(o.off); const s=(ph-.55)/.45;
      if(jump){ g.visible=true; const h=1.6; g.position.set(tv.x+d.v.x*.1*s,4*h*s*(1-s)-.3,tv.z+d.v.z*.1*s); hullClear(g.position,1.4); g.lookAt(tv2.copy(g.position).add(d.v)); g.rotateX(-(1-2*s)*.9);
        if(!o.inA&&s>.02){ o.inA=true; P.splash(g.position.x,0,g.position.z,14,.8); AT.ring(g.position.x,g.position.z,.8); }
        if(s>.96&&o.inA){ o.inA=false; P.splash(g.position.x,0,g.position.z,22,1); W.addRipple(g.position.x,g.position.z,.5); } }
      else g.visible=false; } }
  else if(ev.id==='whale'){ const p=d.p, tt=ev.t, dx=Math.sin(d.dir), dz=Math.cos(d.dir), at=(k)=>tv2.set(p.x+dx*k,0,p.z+dz*k);
    // 骨架動作：平常緩緩擺尾；躍出時尾巴猛力上下拍、身體弓起；空中扭身；落水前身體反弓
    if(whaleRig){ const br=tt>16&&tt<20.2, q=(tt-16)/3.6;
      const tail=br?(q<.45?.55:.28):.16, tf=br?(q<.45?3.4:1.6):1.1, arch=br?(q<.45?-.18:q<.75?.12:.3):0, bend=br?(q<.45?0:.18*Math.sin(q*8)):0;
      whaleRig.pose({t:tt,tail,tailF:tf,tailX:true,tailBend:bend,arch,breathe:0}); }
    // 1. 兩次換氣：背脊浮出水面、噴起高高的白霧柱
    if(tt>1.2&&d.stage===0){ d.stage=1; const q=at(-8); blow(q.x,q.z); foam(q.x,q.z,1,5,4); }
    if(tt>7.5&&d.stage===1){ d.stage=2; const q=at(-2); blow(q.x,q.z); foam(q.x,q.z,1,5,4); }
    if(tt<13){ const seg=tt<6.5?(tt-.8)/5.7:(tt-6.8)/5.7, q=at(tt<6.5?-10+tt*1.1:-4+(tt-6.8)*1.1), up=Math.sin(Math.max(0,Math.min(1,seg))*Math.PI);
      whale.visible=seg>0&&seg<1; whale.position.set(q.x,-2.6+2.1*up,q.z); whale.rotation.set(.08-.16*seg,d.dir,0); if(whale.visible&&Math.random()<.2) SPRAY.emit(q.x,.2,q.z,6,1.5,1.2,3,1); }
    // 2. 海面下翻起白浪：要躍出水面了（鏡頭自動轉過去）
    const bp=at(8);
    if(tt>13.5&&d.stage===2){ d.stage=3; whale.visible=false; if(window.__FACE) window.__FACE(new T.Vector3(bp.x,3,bp.z),{dur:6,pitch:.12}); foam(bp.x,bp.z,1,7,5); if(c.toast) c.toast('🐋 鯨魚要躍出水面了！','good',2200); }
    if(tt>13.5&&tt<16) { if(Math.random()<.5) SPRAY.emit(bp.x,.2,bp.z,8,2,2.5,3,1); }
    // 3. 躍身擊浪：幾乎整隻衝出海面、在空中翻身、側身重重砸回海裡
    if(tt>16&&tt<20.2){ const q=(tt-16)/3.6, qq=Math.min(1,q), y=-9+4*12*qq*(1-qq)+ (q>1?-(q-1)*20:0), fw=6*qq;
      whale.visible=true; whale.position.set(bp.x+dx*fw,y,bp.z+dz*fw); whale.rotation.order='YXZ'; whale.rotation.set(-1.45+1.9*qq,d.dir,1.5*sstep(.2,1,qq));
      if(d.stage===3){ d.stage=4; crash(bp.x,bp.z,false); }
      if(qq<.6&&Math.random()<.9) SPRAY.emit(whale.position.x+(Math.random()-.5)*2,Math.max(.5,whale.position.y+(Math.random()-.5)*8),whale.position.z+(Math.random()-.5)*2,10,1.6,1,1.6,1.6);
      if(q>.93&&d.stage===4){ d.stage=5; const cp=tv3.set(bp.x+dx*6.5,0,bp.z+dz*6.5); crash(cp.x,cp.z,true); } }
    else if(tt>=20.2&&tt<23) whale.visible=false;
    // 4. 最後一次換氣，舉起尾鰭慢慢潛下去
    if(tt>23&&d.stage===5){ d.stage=6; const q=at(16); blow(q.x,q.z); }
    if(tt>25&&tt<31){ fluke.visible=true; const q=(tt-25)/6, fp=at(18); fluke.position.set(fp.x,(q<.45?-3+6.5*sstep(0,.45,q):3.5-7*sstep(.45,1,q)),fp.z); hullClear(fluke.position,3); fluke.rotation.set(.25*(1-q),d.dir,0); fluke.scale.setScalar(1.4);
      if(q<.5&&Math.random()<.6) SPRAY.emit(fp.x,fluke.position.y+1.5,fp.z,6,.6,.5,1.6,1.4);
      if(q>.8&&d.stage===6){ d.stage=7; crash(fp.x,fp.z,false); } } else fluke.visible=false; }
  else if(ev.id==='shark'&&!chase){ d.a+=dt*.22; const b=base(); sfin.position.set(b.x+Math.cos(d.a)*d.r,0,b.z+Math.sin(d.a)*d.r); hullClear(sfin.position,.6); sfin.rotation.y=-d.a; sfin.visible=true;
    if(Math.random()<dt*3) AT.ring(sfin.position.x,sfin.position.z,.35); }
  else if(ev.id==='flyfish'){ for(const f of flyers){ if(!f.on) continue; f.t+=dt; if(f.t<0){ f.g.visible=false; continue; } const q=f.t/1.4;
      if(q>1){ f.t=-rand(.5,2.5); P.splash(f.g.position.x,0,f.g.position.z,6,.4); f.p.add(tv.set(-Math.sin(f.a)*9,0,-Math.cos(f.a)*9)); continue; }
      f.g.visible=true; f.g.position.set(f.p.x-Math.sin(f.a)*9*q,.15+.6*Math.sin(q*Math.PI),f.p.z-Math.cos(f.a)*9*q); hullClear(f.g.position,.4); f.g.rotation.set(0,f.a+Math.PI,0); f.g.scale.setScalar(1.6);
      if(q<.03) P.splash(f.g.position.x,0,f.g.position.z,4,.3); } }
  if(ev.t>=ev.dur) endAll();
}
/* ---------- 鯊魚搶魚（出海時） ---------- */
let chase=null, stolenF=false;
function onHook(fd,get){ chase=null; stolenF=false; if(loc==='sea'&&fd.sp.rar>=2&&Math.random()<.2*(1-.12*(window.__TAL?window.__TAL.rank('sea'):0))&&!(window.__ECO&&window.__ECO.fxOn('repel'))) chase={delay:rand(3,7),get,p:null}; }
function updChase(dt){ if(!chase) return; if(chase.delay>0){ chase.delay-=dt; if(chase.delay<=0){ const f=chase.get(); chase.p=new T.Vector3(f.x+rand(-14,14),0,f.z+rand(-14,14)); sfin.visible=true; c.toast('⚠️ 鯊魚衝過來了！快收線！','bad',2400); c.vib([60,60,60]); } return; }
  const f=chase.get(); tv.subVectors(f,chase.p); tv.y=0; const d=tv.length(); tv.normalize(); chase.p.addScaledVector(tv,Math.min(d,1.6*dt)); hullClear(chase.p,.6);
  sfin.position.copy(chase.p); sfin.rotation.y=Math.atan2(tv.x,tv.z)-Math.PI/2; if(Math.random()<dt*4) AT.ring(chase.p.x,chase.p.z,.4);
  if(!chase.q&&d<9){ chase.q=true; const back=tv.clone(); if(window.__KK) window.__KK.offerDodge(()=>{ if(chase) chase.p.addScaledVector(back,-12); if(G.f) G.f.d=Math.max(2.8,G.f.d-3); }); }
  if(d<1.2){ chase=null; sfin.visible=false; if(window.__KK) window.__KK.snatch(f.clone(),()=>{ stolenF=true; }); else stolenF=true; } }
function endChase(){ chase=null; if(ev.id!=='shark') sfin.visible=false; }

/* ---------- 拍照收集 ---------- */
$('bCam').addEventListener('click',()=>{ if(window.__GHOST&&window.__GHOST.onPhoto&&window.__GHOST.onPhoto()) toast('……照片裡好像多了什麼','warn',2400); try{
  W.render(); const src=W.renderer.domElement, cv=document.createElement('canvas'); cv.width=src.width; cv.height=src.height; const x=cv.getContext('2d'); x.drawImage(src,0,0);
  const s=cv.width/400, lbl=ev.id?SCENES[ev.id]:(loc==='sea'?'外海':'濕地'); x.fillStyle='rgba(0,0,0,.45)'; x.fillRect(0,cv.height-44*s,cv.width,44*s);
  x.fillStyle='#fff'; x.font=`800 ${15*s}px sans-serif`; x.fillText('濕地垂釣・'+lbl+'・'+new Date().toLocaleDateString('zh-TW'),14*s,cv.height-17*s);
  const a=document.createElement('a'); a.download='濕地垂釣_美景_'+Date.now()+'.jpg'; a.href=cv.toDataURL('image/jpeg',.92); document.body.appendChild(a); a.click(); a.remove();
  if(ev.id&&!ev.shot){ ev.shot=true; const sv=c.save; sv.scenes=sv.scenes||{}; const first=!sv.scenes[ev.id]; sv.scenes[ev.id]=(sv.scenes[ev.id]||0)+1; if(window.__STORY) window.__STORY.onScene(ev.id);
    const rw=first?1000:200; sv.coins+=rw; c.persist(); c.setCoins(); c.Snd.coin(); c.toast((first?'📸 新美景收錄：':'📸 美景照片：')+SCENES[ev.id]+'　🪙'+rw,'good',2400); }
  else c.toast('照片已存到下載資料夾','good');
}catch(e){ c.toast('這個瀏覽器不支援拍照存檔','bad'); } });

function update(dt,t){
  const wx=c.wx(), day=W.info.day;
  if(wx.r>.4) lastRain=60; else lastRain=Math.max(0,lastRain-dt);
  updEv(dt,t,wx,day); updChase(dt);
  lakeT-=dt; if(lakeT<=0){ lakeT=.25; const sea=(G.loc||loc)!=='lake'; S.children.forEach(o=>{ if(o.userData&&o.userData.lake){ const want=!sea&&!(o.userData.veg&&window.__GFX==='low'); if(o.visible!==want) o.visible=want; } }); }
  if(yacht.visible){ const b=base(); const h0=W.swell(b.x,b.z,t), fx=-Math.sin(G.head), fz=-Math.cos(G.head);
    const hf=W.swell(b.x+fx*3,b.z+fz*3,t), hs=W.swell(b.x-fz*1.5,b.z+fx*1.5,t);
    yacht.position.set(b.x,h0*.9-.05,b.z); yacht.rotation.set((hf-h0)/3*.7,G.head,(hs-h0)/1.5*-.5,'YXZ'); }
}
return {hullClear,hullOut,hullDims:()=>({HX,HZ0,HZ1}),setLoc,update,onHook,endChase,stolen:()=>{ const v=stolenF; stolenF=false; return v; },loc:()=>loc};
}
/* ===== 雨打水面、大白鯊奪魚、閃避 ===== */
const SH4={};
SH4.rainVS=`
attribute vec3 aR;
uniform float uTime; uniform vec3 uC; uniform float uSea; uniform vec3 uWind; uniform float uRad;
varying vec2 vUv; varying float vT;
float hh(float n){ return fract(sin(n)*43758.5453); }
float seaH(vec2 p){
  vec2 wd = normalize(uWind.xy + vec2(1e-4)); float s = 0.45 + 1.1*uWind.z;
  vec2 D[6]; D[0]=wd; D[1]=vec2(wd.x*0.77-wd.y*0.64, wd.y*0.77+wd.x*0.64); D[2]=vec2(wd.x*0.77+wd.y*0.64, wd.y*0.77-wd.x*0.64); D[3]=vec2(wd.x*0.34-wd.y*0.94, wd.y*0.34+wd.x*0.94); D[4]=vec2(0.6,0.8); D[5]=vec2(-0.8,0.6);
  float L[6]; L[0]=38.0; L[1]=23.0; L[2]=15.0; L[3]=9.0; L[4]=5.5; L[5]=3.2;
  float A[6]; A[0]=0.42; A[1]=0.28; A[2]=0.18; A[3]=0.11; A[4]=0.06; A[5]=0.035;
  float h = 0.0; for(int i=0;i<6;i++){ float k = 6.2831853/L[i]; h += A[i]*s*sin(k*dot(D[i], p) - sqrt(9.81*k)*uTime); } return h;
}
void main(){
  float cyc = uTime*(1.2 + aR.y) + aR.x*7.0; float n = floor(cyc); vT = fract(cyc);
  float a = hh(aR.x*91.7 + n*12.9)*6.2831853, r = sqrt(hh(aR.x*37.1 + n*3.7))*uRad;
  vec2 p = uC.xz + vec2(cos(a), sin(a))*r;
  float y = uSea > 0.5 ? seaH(p) + 0.02 : 0.02;
  float sz = (0.18 + 0.28*aR.z)*(0.25 + vT*1.1);
  vUv = position.xz + 0.5;
  vec3 wp = vec3(p.x + position.x*sz, y, p.y + position.z*sz);
  gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
}`;
SH4.rainFS=`
uniform float uRain; uniform vec3 uCol;
varying vec2 vUv; varying float vT;
void main(){
  float d = length(vUv - 0.5)*2.0;
  float ring = exp(-pow((d - 0.82)/0.09, 2.0)) + 0.5*exp(-pow((d - 0.5)/0.07, 2.0));
  float a = ring*(1.0 - vT)*uRain*0.55;
  if(a < 0.01) discard;
  gl_FragColor = vec4(uCol, a);
}`;
SH4.dropVS=`
attribute vec3 aR;
uniform float uTime; uniform vec3 uC; uniform float uRad; uniform float uScale;
varying float vA;
float hh(float n){ return fract(sin(n)*43758.5453); }
void main(){
  float cyc = uTime*(1.6 + aR.y) + aR.x*5.0; float n = floor(cyc); float t = fract(cyc);
  float a = hh(aR.x*51.3 + n*7.7)*6.2831853, r = sqrt(hh(aR.x*17.9 + n*5.3))*uRad;
  vec3 p = vec3(uC.x + cos(a)*r, max(0.0, sin(t*3.14159)*0.12*(0.5 + aR.z)) + 0.02, uC.z + sin(a)*r);
  vec4 mv = viewMatrix*vec4(p, 1.0); gl_PointSize = max(1.0, 0.03*uScale/max(-mv.z, 0.1)); gl_Position = projectionMatrix*mv;
  vA = t < 0.6 ? 1.0 - t/0.6 : 0.0;
}`;
SH4.dropFS=`
uniform float uRain; uniform vec3 uCol; varying float vA;
void main(){ vec2 c = gl_PointCoord - 0.5; float a = (1.0 - smoothstep(0.2, 0.5, length(c)))*vA*uRain*0.8; if(a < 0.01) discard; gl_FragColor = vec4(uCol, a); }`;

function createThrill(W,P,AT,c){
'use strict';
const T=THREE, S=W.scene, G=c.G, $=id=>document.getElementById(id);
const clamp=(x,a,b)=>x<a?a:x>b?b:x, rand=(a,b)=>a+Math.random()*(b-a), sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

/* ---------- 雨滴打在水面：漣漪圈與水花點 ---------- */
const NR=260, rg=new T.InstancedBufferGeometry(), pl=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
rg.index=pl.index; rg.setAttribute('position',pl.attributes.position);
const ar=new Float32Array(NR*3); for(let i=0;i<NR;i++){ ar[i*3]=Math.random(); ar[i*3+1]=Math.random()*.8; ar[i*3+2]=Math.random(); }
rg.setAttribute('aR',new T.InstancedBufferAttribute(ar,3)); rg.instanceCount=NR;
const rU={uTime:W.U.uTime,uC:{value:new T.Vector3()},uSea:W.U.uSea,uWind:W.U.uWind,uRad:{value:20},uRain:{value:0},uCol:{value:new T.Color(1,1,1)}};
const rings=new T.Mesh(rg,new T.ShaderMaterial({uniforms:rU,vertexShader:SH4.rainVS,fragmentShader:SH4.rainFS,transparent:true,depthWrite:false}));
rings.frustumCulled=false; rings.renderOrder=3; S.add(rings);
const ND=300, dg=new T.BufferGeometry(), dp=new Float32Array(ND*3), dr=new Float32Array(ND*3);
for(let i=0;i<ND;i++){ dr[i*3]=Math.random(); dr[i*3+1]=Math.random()*.8; dr[i*3+2]=Math.random(); }
dg.setAttribute('position',new T.BufferAttribute(dp,3)); dg.setAttribute('aR',new T.BufferAttribute(dr,3));
const dU={uTime:W.U.uTime,uC:rU.uC,uRad:{value:14},uScale:{value:800},uRain:rU.uRain,uCol:rU.uCol};
const drops=new T.Points(dg,new T.ShaderMaterial({uniforms:dU,vertexShader:SH4.dropVS,fragmentShader:SH4.dropFS,transparent:true,depthWrite:false}));
drops.frustumCulled=false; S.add(drops); if(W.reflHide){ W.reflHide(rings); W.reflHide(drops); }

/* ---------- 大白鯊 ---------- */
function sharkTex(){ const w=64,h=128,d=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const u=x/w, v=y/h, vert=-Math.cos(u*6.2832), jag=Math.sin(v*40+u*9)*.06+Math.sin(v*97)*.03;
    const top=clamp((vert+.15+jag)*4,0,1); let r=232+(96-232)*top, g=232+(104-232)*top, b=228+(112-228)*top;
    if(v>.72&&v<.8&&Math.abs(vert)<.4&&Math.sin(v*260)>.6){ r*=.55; g*=.55; b*=.55; }
    const n=(Math.sin(x*12.9+y*78.2)*43758.5)%1*12; const i=(y*w+x)*4; d[i]=r+n; d[i+1]=g+n; d[i+2]=b+n; d[i+3]=255; }
  const t=new T.DataTexture(d,w,h,T.RGBAFormat); t.encoding=T.sRGBEncoding; t.magFilter=T.LinearFilter; t.needsUpdate=true; return t; }
const skin=new T.MeshPhysicalMaterial({map:sharkTex(),roughness:.45,clearcoat:.6,clearcoatRoughness:.3});
const finM=new T.MeshPhysicalMaterial({color:0x5f6870,roughness:.5,clearcoat:.4,side:T.DoubleSide});
const shark=new T.Group(), jaw=new T.Group(); shark.visible=false; S.add(shark);
{ const pts=[]; for(let i=0;i<=40;i++){ const t=i/40; let r=Math.pow(Math.max(0,Math.sin(Math.PI*Math.pow(t,1.25))),.75); if(t>.86) r*=1-.55*sstep(.86,1,t); pts.push(new T.Vector2(Math.max(r,.001)*.5,t)); }
  const g=new T.LatheGeometry(pts,40,Math.PI*1.5,Math.PI*2), p=g.attributes.position;
  for(let i=0;i<p.count;i++){ const x=p.getX(i), t=p.getY(i), z=p.getZ(i); p.setXYZ(i,-z*.85,x*(x<0?.85:1)-.04*sstep(.85,1,t),(t-.5)*4.6); }
  g.computeVertexNormals(); shark.add(new T.Mesh(g,skin));
  const fin=(pts,pos,rot,sc)=>{ const s=new T.Shape(); pts.forEach((q,i)=>i?s.lineTo(q[0],q[1]):s.moveTo(q[0],q[1])); const m=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.03,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:2}),finM); m.position.set(...pos); m.rotation.set(...rot); if(sc) m.scale.set(...sc); shark.add(m); return m; };
  fin([[.55,0],[.25,.5],[-.05,.92],[-.12,.55],[-.45,0]],[0,.4,.2],[0,Math.PI/2,0]);
  for(const s of [1,-1]) fin([[0,0],[.35,-.05],[1.1,-.55],[.9,-.6],[0,-.32]],[s*.38,-.15,.75],[0,s>0?Math.PI*.6:Math.PI*.4,s*.35]);
  fin([[0,.1],[.25,.4],[.7,1.25],[.55,1.2],[.35,.5],[.5,0],[.45,-.6],[.35,-.55],[0,-.1]],[0,-.02,-2.15],[0,Math.PI/2,0],[1.1,1,1]);
  const eye=new T.Mesh(new T.SphereGeometry(.045,10,8),new T.MeshStandardMaterial({color:0x050505,roughness:.05})); for(const s of [1,-1]){ const e=eye.clone(); e.position.set(s*.27,.12,1.65); shark.add(e); }
  const mouthM=new T.MeshStandardMaterial({color:0x7a2a30,roughness:.6,side:T.DoubleSide}), toothM=new T.MeshStandardMaterial({color:0xf2efe6,roughness:.3});
  const jw=new T.Mesh(new T.SphereGeometry(1,20,10,0,Math.PI*2,Math.PI/2,Math.PI/2),skin); jw.scale.set(.32,.18,.55); jaw.add(jw);
  const inner=new T.Mesh(new T.CircleGeometry(.3,20),mouthM); inner.rotation.x=-Math.PI/2; inner.scale.set(1,1.6,1); inner.position.y=.01; jaw.add(inner);
  for(let i=0;i<14;i++){ const a=Math.PI*(i/13), tth=new T.Mesh(new T.ConeGeometry(.022,.08,6),toothM); tth.position.set(Math.cos(a)*.27,.04,Math.sin(a)*.45-.05); jaw.add(tth); }
  jaw.position.set(0,-.12,1.55); shark.add(jaw);
  shark.scale.setScalar(1.15); shark.traverse(o=>{ o.frustumCulled=false; }); }
const sharkR=window.__MDL?window.__MDL.attach(shark,'gwhite',{len:4.6,target:'+z',clip:'Swim'}):null;

/* ---------- 慢動作、晃動、閃避按鈕 ---------- */
let slow=0, shake=0, snatchJob=null;
/* 咬點固定在鯊魚嘴上，身體一律在咬點的船外側，不會穿過船殼 */
const HL=2.3*1.15, uV=new T.Vector3(), nose=new T.Vector3(), mtx=new T.Matrix4(), zA=new T.Vector3(0,0,1);
function snatch(p,onBite){
  const q=p.clone(); q.y=0; c.hullClear(q,1.2); const out=c.hullOut(q,new T.Vector3());
  snatchJob={t:0,p:q,out,tan:new T.Vector3(-out.z,0,out.x).multiplyScalar(Math.random()<.5?1:-1),bit:false,onBite};
  shark.visible=true; slow=1; if(sharkR&&sharkR.loaded) sharkR.play('Bite'); c.vib([80,60,200]); c.toast('🦈 大白鯊！','bad',1800); c.Snd.gator(); }
function updSnatch(rdt){
  const J=snatchJob; if(!J) return; J.t+=rdt*(slow>0?.4:1); const t=J.t, p=J.p, o=J.out;
  const q=clamp(t/1.4,0,1), up=q<.48, a=sstep(0,.48,q), b=sstep(.48,1,q);
  const off=up?1.4*(1-a):2.6*b, ny=up?-3.2+4.8*a:1.6-3.9*b;
  nose.set(p.x+o.x*off,ny,p.z+o.z*off);
  const pitch=up?.85+.45*a:1.3-1.75*b;
  const hx=up?-o.x:(-o.x*(1-b)+J.tan.x*b), hz=up?-o.z:(-o.z*(1-b)+J.tan.z*b), hl=Math.hypot(hx,hz)||1;
  uV.set(hx/hl*Math.cos(pitch),Math.sin(pitch),hz/hl*Math.cos(pitch));
  shark.quaternion.setFromUnitVectors(zA,uV); shark.rotateZ(up?0:b*1.2);
  shark.position.copy(nose).addScaledVector(uV,-HL);
  jaw.rotation.x=up?.9*sstep(0,.35,q):.9*(1-sstep(.48,.58,q));
  if(q>.06&&!J.s1){ J.s1=true; for(let i=0;i<4;i++) P.splash(p.x+o.x*1.2+rand(-.8,.8),0,p.z+o.z*1.2+rand(-.8,.8),50,2.2); W.addRipple(p.x+o.x,p.z+o.z,1.4); c.Snd.splash(2); shake=.8; }
  if(q>.48&&!J.bit){ J.bit=true; if(G.fish) G.fish.group.visible=false; c.vib(120); shake=1; if(window.__FACE) window.__FACE(shark.position,{dur:2.4,pitch:-.15}); if(J.onBite) J.onBite(); }
  if(q>.95&&!J.s2){ J.s2=true; const sx=p.x+o.x*3, sz=p.z+o.z*3; for(let i=0;i<5;i++) P.splash(sx+rand(-1.5,1.5),0,sz+rand(-1.5,1.5),60,2.6); W.addRipple(sx,sz,1.6); AT.ring(sx,sz,4); c.Snd.splash(2.5); shake=1.2; }
  if(t>2.4){ shark.visible=false; snatchJob=null; slow=0; }
}
/* 出水瞬間：大白鯊從船的一側躍出、橫越船頭上空咬走魚、落到另一側（軌跡已驗證高過欄杆） */
let overJob=null; const ow=new T.Vector3(), od=new T.Vector3(), camW=new T.Vector3(), nP=new T.Vector3();
function overPos(J,u,out){ const t=2*u-1, lx=J.s*J.Wd*t, y=J.yb+(J.ya-J.yb)*(1-Math.pow(Math.abs(t),6)), b=G.base, cs=Math.cos(G.head), sn=Math.sin(G.head);
  return out.set(b.x+lx*cs+J.zc*sn,y,b.z-lx*sn+J.zc*cs); }
function snatchOver(p,onBite){ const hd=c.hullDims?c.hullDims():{HX:1.6,HZ0:-6.3}; W.camera.getWorldPosition(camW);
  overJob={u:0,s:Math.random()<.5?1:-1,Wd:hd.HX+4,zc:Math.max(hd.HZ0+.6,-4.2),ya:camW.y+1.2,yb:-2.2,bit:false,onBite,drip:0,s1:false,s2:false};
  shark.visible=true; slow=1; if(sharkR&&sharkR.loaded) sharkR.play('Bite'); c.vib([100,50,250]); c.toast('🦈 大白鯊躍出水面！','bad',2200); c.Snd.gator(); }
function updOver(rdt){ const J=overJob; if(!J) return;
  J.u+=rdt*((J.u>.34&&J.u<.66)?.3:1)/1.5; const u=Math.min(J.u,1);
  overPos(J,u,ow); overPos(J,u+.005,od); od.sub(ow).normalize();
  shark.quaternion.setFromUnitVectors(zA,od); shark.rotateZ(Math.sin(u*Math.PI)*.5*J.s); shark.position.copy(ow);
  nP.copy(ow).addScaledVector(od,2.1);
  if(!J.bit&&G.fish&&u>.3) G.fish.group.position.lerp(nP,Math.min(1,rdt*7));
  if(u>.04&&!J.s1){ J.s1=true; overPos(J,0,nP); for(let i=0;i<5;i++) P.splash(nP.x+rand(-1,1),0,nP.z+rand(-1,1),55,2.4); W.addRipple(nP.x,nP.z,1.5); c.Snd.splash(2.2); shake=.9; }
  J.drip-=rdt; if(ow.y>.3&&J.drip<=0){ J.drip=.05; P.splash(ow.x,ow.y-.3,ow.z,5,.35); }
  if(u>=.5&&!J.bit){ J.bit=true; if(G.fish) G.fish.group.visible=false; c.vib([150,40,150]); shake=1.5; if(window.__FACE) window.__FACE(shark.position,{dur:2.4,pitch:.1}); if(J.onBite) J.onBite(); }
  if(u>.96&&!J.s2){ J.s2=true; overPos(J,1,nP); for(let i=0;i<6;i++) P.splash(nP.x+rand(-1.5,1.5),0,nP.z+rand(-1.5,1.5),65,2.8); W.addRipple(nP.x,nP.z,1.8); AT.ring(nP.x,nP.z,4); c.Snd.splash(2.6); shake=1.1; }
  if(J.u>=1.08){ shark.visible=false; overJob=null; slow=0; }
}
const qEl=$('qte'), qBar=$('qteBar'); let qte=null;
function offerDodge(onOk){ if(qte) return; const need=7-Math.floor((window.__TAL?window.__TAL.rank('sea'):0)/2); qte={n:0,t:2.2,onOk,need}; const sm=qEl.querySelector('small'); if(sm) sm.textContent='連點 '+need+' 下'; qEl.classList.remove('hidden'); qBar.style.width='0%'; c.vib([30,30,30]); }
qEl.addEventListener('pointerdown',e=>{ e.preventDefault(); if(!qte) return; qte.n++; qBar.style.width=Math.min(100,qte.n/qte.need*100)+'%'; c.vib(15);
  if(qte.n>=qte.need){ const f=qte.onOk; qte=null; qEl.classList.add('hidden'); c.toast('閃過了！鯊魚撲空','good',1600); shake=.4; if(f) f(); } });
function updQte(dt){ if(!qte) return; qte.t-=dt; if(qte.t<=0){ qte=null; qEl.classList.add('hidden'); } }

function update(dt,t){
  const rain=W.U.uRain.value, cw=rU.uC.value; W.camera.getWorldPosition(cw);
  rU.uRain.value=rain>.03?Math.min(1,rain*1.2):0; rings.visible=drops.visible=rain>.03&&!c.underwater()&&G.loc!=='ice'&&window.__GFX!=='low';
  const L=clamp(W.info.light,.15,1); rU.uCol.value.setRGB(.85*L,.9*L,.95*L);
  dU.uScale.value=window.innerHeight*W.getPR()/(2*Math.tan(W.camera.fov*Math.PI/360));
  updSnatch(dt); updOver(dt); updQte(dt);
  if(shake>0){ shake=Math.max(0,shake-dt*1.8); W.head.position.set((Math.random()-.5)*.08*shake,(Math.random()-.5)*.08*shake,0); } else W.head.position.set(0,0,0);
}
return {update,snatch,snatchOver,offerDodge,busy:()=>!!(snatchJob||overJob)};
}
/* ===== 商店循環：素材掉落、裝備強化、道具、流浪商人、魚市行情、外觀 ===== */
const MATS={scale:{n:'魚鱗',i:'🐟'},bone:{n:'魚骨',i:'🦴'},pearl:{n:'珍珠',i:'⚪'},crystal:{n:'海晶',i:'💎'}};
const CONS=[
 {id:'lure',n:'魚群誘餌',i:'🧆',p:400,d:'立刻在附近引來一群魚'},
 {id:'repel',n:'鯊魚驅逐劑',i:'🧪',p:600,d:'10 分鐘內鯊魚和鱷魚不會來搶魚',min:10},
 {id:'luck',n:'幸運香',i:'🪔',p:800,d:'10 分鐘內稀有魚機率大幅提升',min:10},
 {id:'coin2',n:'金幣加倍券',i:'💰',p:1000,d:'10 分鐘內賣魚金幣 ×2',min:10},
 {id:'glow',n:'夜光浮標',i:'🔆',p:450,d:'15 分鐘內魚咬餌更快',min:15},
 {id:'leader',n:'鋼絲前導線',i:'⛓️',p:500,d:'下一次快斷線時自動撐住（自動使用）'}];
const SKINS={
 rod:[{id:'def',n:'原廠配色',c:null,p:0},{id:'black',n:'霧黑',c:'#1a1c20',p:2000},{id:'coral',n:'珊瑚紅',c:'#d8504a',p:3000},{id:'mint',n:'薄荷綠',c:'#3fbf9f',p:3000},{id:'galaxy',n:'星空紫',c:'#4a2a8a',p:6000,gold:true},{id:'gold',n:'鍍金',c:'#c9a227',p:15000,gold:true}],
 bob:[{id:'classic',n:'經典紅白',t:0xd8301a,b:0xf2efe8,p:0},{id:'lime',n:'螢光綠',t:0x7cff3a,b:0x1a1a1a,p:1500},{id:'panda',n:'熊貓黑白',t:0x111111,b:0xffffff,p:2500},{id:'sakura',n:'櫻花粉',t:0xff8fb8,b:0xfff0f5,p:2500},{id:'gold',n:'黃金浮標',t:0xd9b25a,b:0xf6e6b0,p:5000}]};

function createEco(c){
'use strict';
const capOf=()=>Math.min(10,Math.floor((c.save.lv||1)/3));   // 強化上限：每 3 級 +1，Lv 30 到 +10
const S=c.save, now=()=>Date.now();
S.mat=S.mat||{scale:0,bone:0,pearl:0,crystal:0}; S.enh=S.enh||{rod:{},line:{},reel:{}}; S.inv=S.inv||{}; S.fx=S.fx||{};
S.skin=S.skin||{rod:'def',bob:'classic'}; S.skinOwn=S.skinOwn||{rod:['def'],bob:['classic']}; S.merch=S.merch||{};
const fxOn=id=>(S.fx[id]||0)>now();
/* 強化 */
const lvOf=(k,i)=>(S.enh[k]&&S.enh[k][i])||0;
function enhance(g){ const r=lvOf('rod',S.eq.rod), l=lvOf('line',S.eq.line), e=lvOf('reel',S.eq.reel);
  return {rod:Object.assign({},g.rod,{cast:g.rod.cast*(1+.02*r),tens:g.rod.tens*(1-.025*r)}),line:Object.assign({},g.line,{s:g.line.s*(1+.06*l)}),reel:Object.assign({},g.reel,{spd:g.reel.spd*(1+.04*e),drag:g.reel.drag*(1-.03*e)})}; }
function enhCost(lv,tier){ const coins=Math.round(300*Math.pow(1.5,lv)*(1+tier*.5)/10)*10, m={};
  if(lv<3) m.scale=4*(lv+1); else if(lv<6) m.bone=lv-1; else if(lv<9) m.pearl=lv-4; else m.crystal=lv-7; return {coins,m}; }
const TIER=['scale','bone','pearl','crystal'];
/* 付素材：不夠時用上一階抵（1 抵 3），回傳實際扣除量；付不起回傳 null */
function plan(m){ const have={}, use={}; TIER.forEach(k=>{ have[k]=S.mat[k]||0; use[k]=0; });
  const need={}; TIER.forEach(k=>need[k]=m[k]||0);
  for(let i=0;i<TIER.length;i++){ const k=TIER[i]; let n=need[k]; const d=Math.min(n,have[k]); have[k]-=d; use[k]+=d; n-=d;
    if(n>0){ if(i===TIER.length-1) return null; need[TIER[i+1]]+=Math.ceil(n/3); have[k]+=Math.ceil(n/3)*3-n; } }
  use.left=have; return use; }
const has=m=>!!plan(m);
const mtxt=m=>Object.keys(m).filter(k=>MATS[k]&&m[k]>0).map(k=>MATS[k].i+m[k]).join(' ');
/* 掉落 */
let lastD='';
function drop(fd){ const r=fd.sp.rar||0, g={}; const add=(k,n)=>{ if(n>0){ g[k]=(g[k]||0)+n; S.mat[k]=(S.mat[k]||0)+n; } };
  if(r===0) add('scale',1+(Math.random()<.5?1:0)); else if(r===1){ add('scale',2); if(Math.random()<.5) add('bone',1); }
  else if(r===2){ add('scale',2); add('bone',1+(Math.random()<.5?1:0)); } else if(r===3){ add('scale',3); add('bone',2); add('pearl',1); }
  else if(r===4){ add('bone',2); add('pearl',1+(Math.random()<.4?1:0)); if(Math.random()<.3) add('crystal',1); } else { add('pearl',2); add('crystal',1+(Math.random()<.5?1:0)); }
  c.persist(); lastD=Object.keys(g).map(k=>MATS[k].i+'×'+g[k]).join(' '); return lastD; }
function dropItem(it){ if(it.id==='chest'){ S.mat.pearl=(S.mat.pearl||0)+3; S.mat.crystal=(S.mat.crystal||0)+1; c.persist(); setTimeout(()=>c.toast('寶箱裡還有 ⚪×3 💎×1','good',2200),1500); } }
/* 每日魚市 */
function rng(seed){ seed=Math.abs(seed)%2147483646+1; return ()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; }; }
const day=()=>Math.floor(now()/86400000);
let mk=null, mkDay=-1;
function market(){ if(mkDay===day()) return mk; mkDay=day(); const r=rng(mkDay*7919+13), pool=c.SPECIES.filter(s=>!s.special), pick=[];
  while(pick.length<4&&pool.length) pick.push(pool.splice(Math.floor(r()*pool.length),1)[0]);
  mk=[{sp:pick[0],m:2},{sp:pick[1],m:1.6},{sp:pick[2],m:1.3},{sp:pick[3],m:.6}]; return mk; }
function priceMul(id){ const e=market().find(x=>x.sp.id===id); return e?e.m:1; }
/* 流浪商人（每 4 小時換貨） */
const ROT=4*3600000, rot=()=>Math.floor(now()/ROT);
function offers(){ const r=rng(rot()*104729+7), pool=[
  {id:'b_lure',n:'魚群誘餌 ×3',i:'🧆',p:840,give:{inv:{lure:3}}},{id:'b_luck',n:'幸運香 ×2',i:'🪔',p:1100,give:{inv:{luck:2}}},
  {id:'b_coin',n:'金幣加倍券 ×2',i:'💰',p:1400,give:{inv:{coin2:2}}},{id:'b_repel',n:'鯊魚驅逐劑 ×3',i:'🧪',p:1260,give:{inv:{repel:3}}},
  {id:'b_moon',n:'月光餌 ×3',i:'🌙',p:1200,give:{bait:{moon:3}}},{id:'b_live',n:'活魚餌 ×10',i:'🐟',p:900,give:{bait:{live:10}}},
  {id:'m_bone',n:'魚骨 ×4',i:'🦴',p:1600,give:{mat:{bone:4}}},{id:'m_pearl',n:'珍珠 ×2',i:'⚪',p:3500,give:{mat:{pearl:2}}},
  {id:'m_crys',n:'海晶 ×1',i:'💎',p:6000,give:{mat:{crystal:1}}},{id:'s_glow',n:'夜光浮標 ×3',i:'🔆',p:950,give:{inv:{glow:3}}},
  {id:'s_lead',n:'鋼絲前導線 ×3',i:'⛓️',p:1050,give:{inv:{leader:3}}}], out=[];
  while(out.length<4) out.push(pool.splice(Math.floor(r()*pool.length),1)[0]); return out; }
const bought=()=>S.merch[rot()]||[];
/* 道具 */
function useCon(id){ const it=CONS.find(x=>x.id===id); if(!it||(S.inv[id]||0)<=0) return;
  if(id==='lure'){ if(!(window.__FUN&&window.__FUN.spawnHot())){ c.toast('這裡引不來魚群，換個方向試試','warn'); return; } }
  else if(id==='leader'){ c.toast('鋼絲前導線會在快斷線時自動使用','',1800); return; }
  else S.fx[id]=Math.max(now(),S.fx[id]||0)+it.min*60000;
  S.inv[id]--; c.persist(); c.Snd.coin(); if(id!=='lure') c.toast(it.i+' '+it.n+' 生效 '+it.min+' 分鐘','good'); }
function useLeader(){ if((S.inv.leader||0)>0){ S.inv.leader--; c.persist(); return true; } return false; }
/* 外觀 */
function applySkins(){ const rs=SKINS.rod.find(s=>s.id===S.skin.rod); if(rs&&rs.c) c.P.setRodLook(rs.c,!!rs.gold);
  const bs=SKINS.bob.find(s=>s.id===S.skin.bob)||SKINS.bob[0], ch=c.P.bobber.children; ch[0].material.color.setHex(bs.t); ch[1].material.color.setHex(bs.b); }
/* 介面 */
const row=(name,sub,right)=>`<div class="row"><div class="nm"><b>${name}</b><small>${sub}</small></div><div class="rt">${right}</div></div>`;
const matLine=()=>`<div class="note">${Object.keys(MATS).map(k=>MATS[k].i+' '+MATS[k].n+' '+(S.mat[k]||0)).join('　')}</div>`;
const fmtT=ms=>{ const s=Math.max(0,Math.floor(ms/1000)); return Math.floor(s/3600)+':'+String(Math.floor(s%3600/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };
function render(tab,GEAR){
  let h='';
  if(tab==='enh'){
    h+='<div class="note">釣魚會掉落素材。越稀有的魚掉越好的素材，強化越後面越需要稀有素材。</div>';
    [['rod','釣竿'],['line','釣線'],['reel','捲線器']].forEach(([k,label])=>{ const idx=S.eq[k], it=GEAR[k][idx], lv=lvOf(k,idx);
      const st='★'.repeat(Math.min(lv,10))+'☆'.repeat(Math.max(0,10-lv));
      const eff=k==='rod'?`拋投 +${lv*2}%、張力 −${(lv*2.5).toFixed(1)}%`:k==='line'?`強度 +${lv*6}%`:`收線 +${lv*4}%、爆線累積 −${lv*3}%`;
      if(lv>=10){ h+=row(`${label}：${it.name} +10`,`${st}<br>${eff}`,'<span class="eqd">已滿級</span>'); return; }
      if(lv>=capOf()){ h+=row(`${label}：${it.name} +${lv}`,`${st}<br>${eff}`,`<span class="lk">Lv ${(lv+1)*3} 解鎖 +${lv+1}</span>`); return; }
      const cs=enhCost(lv,idx), pl=plan(cs.m), cOk=S.coins>=cs.coins, ok=cOk&&!!pl;
      let st2=''; if(!cOk) st2+=`<span class="bad">金幣差 ${(cs.coins-S.coins).toLocaleString()}</span> `;
      if(!pl) st2+=`<span class="bad">素材不夠</span>`; else if(Object.keys(cs.m).some(x=>pl[x]!==cs.m[x])) st2+=`<span class="cv">將使用 ${mtxt(pl)}（高階素材自動抵扣）</span>`;
      h+=row(`${label}：${it.name} +${lv}`,`${st}<br>${eff}<br>下一級：🪙${cs.coins.toLocaleString()} ${mtxt(cs.m)}${st2?'<br>'+st2:''}`,`<button class="sbtn${ok?' pri':''}" data-a="enh" data-v="${k}">強化</button>`); });
    h+='<div class="note">素材不夠時，會自動用高一階的素材抵：1 魚骨＝3 魚鱗、1 珍珠＝3 魚骨、1 海晶＝3 珍珠。</div>';
    h+='<div class="note">換裝其他裝備時，各自的強化等級會保留。</div>';
  } else if(tab==='item'){
    const left=ROT-(now()%ROT), bs=bought();
    h+=`<div class="merch"><b>🧳 流浪商人</b><small>${fmtT(left)} 後換貨，每樣限購一次</small></div>`;
    h+=offers().map(o=>row(`${o.i} ${o.n}`,'限時商品',bs.includes(o.id)?'<span class="eqd">已購買</span>':`<button class="sbtn pri" data-a="merch" data-v="${o.id}">🪙 ${o.p.toLocaleString()}</button>`)).join('');
    h+='<div class="note" style="margin-top:12px">道具</div>';
    h+=CONS.map(it=>{ const n=S.inv[it.id]||0, act=fxOn(it.id)?`（剩 ${Math.ceil((S.fx[it.id]-now())/60000)} 分）`:'';
      return row(`${it.i} ${it.n} <small class="cnt">×${n}</small>`,it.d+act,`<div class="bb"><button class="sbtn" data-a="buyc" data-v="${it.id}">+1 🪙${it.p}</button>${n>0&&it.id!=='leader'?`<button class="sbtn pri" data-a="usec" data-v="${it.id}">使用</button>`:''}</div>`); }).join('');
  } else if(tab==='skin'){
    h+='<div class="note">釣竿配色（不影響數值）</div>';
    h+=SKINS.rod.map(s=>{ const own=S.skinOwn.rod.includes(s.id), on=S.skin.rod===s.id;
      return row(`<span class="sw" style="background:${s.c||'#1d4fb8'}"></span>${s.n}`,s.gold?'附金色導環':'',on?'<span class="eqd">使用中</span>':own?`<button class="sbtn" data-a="skine" data-v="rod:${s.id}">換上</button>`:`<button class="sbtn pri" data-a="skinb" data-v="rod:${s.id}">🪙 ${s.p.toLocaleString()}</button>`); }).join('');
    h+='<div class="note" style="margin-top:12px">浮標造型</div>';
    h+=SKINS.bob.map(s=>{ const own=S.skinOwn.bob.includes(s.id), on=S.skin.bob===s.id, hx=n=>'#'+n.toString(16).padStart(6,'0');
      return row(`<span class="sw" style="background:linear-gradient(${hx(s.t)} 50%,${hx(s.b)} 50%)"></span>${s.n}`,'',on?'<span class="eqd">使用中</span>':own?`<button class="sbtn" data-a="skine" data-v="bob:${s.id}">換上</button>`:`<button class="sbtn pri" data-a="skinb" data-v="bob:${s.id}">🪙 ${s.p.toLocaleString()}</button>`); }).join('');
  } else if(tab==='market'){
    const left=86400000-(now()%86400000);
    h+=`<div class="note">今日魚市行情（${fmtT(left)} 後更新）。賣出時自動套用。</div>`;
    h+=market().map(e=>row(`${e.m>1?'🔥':'🧊'} ${e.sp.name}`,`${e.sp.loc==='sea'?'海釣':'湖釣'}・${c.RAR[e.sp.rar].name}`,`<b style="color:${e.m>1?'#ffb347':'#8ab4d8'}">收購價 ×${e.m}</b>`)).join('');
  }
  return h;
}
function click(a,v,GEAR){
  if(a==='enh'){ const idx=S.eq[v], lv=lvOf(v,idx); if(lv>=10) return true; if(lv>=capOf()){ c.toast('等級不足：Lv '+(lv+1)*3+' 才能強化到 +'+(lv+1),'warn',2200); return true; } const cs=enhCost(lv,idx);
    const pl=plan(cs.m); if(S.coins<cs.coins||!pl) return true;
    S.coins-=cs.coins; TIER.forEach(k=>{ S.mat[k]=pl.left[k]; }); S.enh[v]=S.enh[v]||{}; S.enh[v][idx]=lv+1; c.persist(); c.setCoins(); c.Snd.fanfare(1); c.toast('強化成功！+'+(lv+1),'good'); return true; }
  if(a==='buyc'){ const it=CONS.find(x=>x.id===v); if(S.coins<it.p){ c.toast('金幣不夠','bad'); return true; } S.coins-=it.p; S.inv[v]=(S.inv[v]||0)+1; c.persist(); c.setCoins(); c.Snd.coin(); return true; }
  if(a==='usec'){ useCon(v); return true; }
  if(a==='merch'){ const o=offers().find(x=>x.id===v); if(!o||bought().includes(v)) return true; if(S.coins<o.p){ c.toast('金幣不夠','bad'); return true; }
    S.coins-=o.p; const g=o.give; for(const k in g.inv||{}) S.inv[k]=(S.inv[k]||0)+g.inv[k]; for(const k in g.bait||{}) S.baits[k]=(S.baits[k]||0)+g.bait[k]; for(const k in g.mat||{}) S.mat[k]=(S.mat[k]||0)+g.mat[k];
    S.merch={[rot()]:[...bought(),v]}; c.persist(); c.setCoins(); c.Snd.coin(); c.toast('買到了：'+o.n,'good'); return true; }
  if(a==='skinb'||a==='skine'){ const [k,id]=v.split(':'), s=SKINS[k].find(x=>x.id===id);
    if(a==='skinb'){ if(S.coins<s.p){ c.toast('金幣不夠','bad'); return true; } S.coins-=s.p; S.skinOwn[k].push(id); c.Snd.coin(); }
    S.skin[k]=id; c.persist(); c.setCoins(); c.applyRod(); return true; }
  return false;
}
/* 生效中的道具、自動調整提示位置 */
const fxBar=document.getElementById('fxBar');
function tick(){ const t1=document.getElementById('top'), t2=document.getElementById('top2');
  const bot=e=>{ if(!e) return 0; const r=e.getBoundingClientRect(); return r.height>0?r.bottom:0; }; const y=Math.max(bot(t1),bot(t2));
  document.documentElement.style.setProperty('--hudY',Math.round(y)+'px');
  if(fxBar) fxBar.innerHTML=CONS.filter(it=>it.min&&fxOn(it.id)).map(it=>`<span>${it.i} ${Math.ceil((S.fx[it.id]-now())/60000)}分</span>`).join('')+(fxOn('meal_str')?`<span>💪 ${Math.ceil((S.fx.meal_str-now())/60000)}分</span>`:''); }
setInterval(tick,1000); window.addEventListener('resize',tick); setTimeout(tick,300);
return {fxOn,enhance,drop,dropItem,lastDrop:()=>lastD,priceMul,useLeader,applySkins,render,click,matLine};
}
/* ===== 真實 3D 模型（Sketchfab CC-BY，作者見設定頁） ===== */
const REAL_DIR='models/';
// 魚：[檔名, 模型裡頭朝哪個軸, 選項]
const RFISH={bluegill:['bluegill','+x'],crappie:['crappie','+z'],lmbass:['lmbass','+z'],smbass:['smbass','+z'],channel:['channel','+z'],flathead:['flathead','+z'],
  gar:['gar','+z'],barra:['barra','+x'],golden:['koi','-x',{gold:1}],ghost:['koi','-x',{ghost:1}],grouper:['grouper','-x'],tuna:['tuna','+z'],marlin:['marlin','-z'],
  ribbon:['ribbon','+z',{one:1}],seaking:['seaking','up',{king:1}],mermaid:['mermaid_v2','up',{mer:1}],trout:['trout','+z'],pike:['pike','+z'],reba:['fish_reba','+z'],bowfin:['fish_bowfin','+z'],perch:['fish_mandarin','+z'],amber:['fish_amber','+z'],mahi:['fish_mahi','+z'],sail:['fish_sail','+z'],moonkoi:['koi','-x',{moon:1}],shark:['tigershark','+z'],gwhite:['gwhite','+z'],
  crucian:['fish_crucian','+z'],tilapia:['fish_tilapia','+z'],snakehead:['fish_snakehead','+z'],peacock:['fish_peacock','+z'],
  clarias:['fish_clarias','+z'],spgar:['fish_spgar','+z'],carp:['fish_carp','+z'],silvercarp:['fish_silvercarp','+z'],grasscarp:['fish_grasscarp','+z'],blackcarp:['fish_blackcarp','+z'],arapaima:['fish_arapaima','+z'],
  char:['fish_char','+z'],burbot:['fish_burbot','+z'],porgy:['fish_porgy','+z'],parrot:['fish_parrot','+z'],redbream:['fish_redbream','+z'],emperor:['fish_emperor','+z'],cobia:['fish_cobia','+z'],hardclam:['fish_hardclam','+z'],gomphina:['fish_gomphina','+z'],tellin:['fish_tellin','+z'],razor:['fish_razor','+z'],ghostcrab:['fish_ghostcrab','+z'],fiddler:['fish_fiddler','+z'],mudskip:['fish_mudskip','+z'],ragworm:['fish_ragworm','+z'],hermit:['fish_hermit','+z'],barracuda:['fish_barracuda','+z'],grouper2:['fish_grouper2','+z'],bigeye:['fish_bigeye','+z'],stingray:['fish_stingray','+z'],amberjack:['fish_amberjack','+z'],knifejaw:['fish_knifejaw','+z'],halibut:['fish_halibut','+z'],sunfish:['fish_sunfish','+z'],wrasse:['fish_wrasse','+z'],skipjack:['fish_skipjack','+z'],sawara:['fish_sawara','+z'],yellowfin:['fish_yellowfin','+z'],
  eel:['fish_eel','+z'],mekong:['fish_mekong','+z'],yperch:['fish_yperch','+z'],whitefish:['fish_whitefish','+z'],laketrout:['fish_laketrout','+z'],taimen:['fish_taimen','+z'],gt:['fish_gt','+z'],swordfish:['fish_swordfish','+z'],
  clownfish:['fish_clownfish','+z'],bluetang:['fish_bluetang','+z'],blenny:['fish_blenny','+z'],angelfish:['fish_angelfish','+z'],copperband:['fish_copperband','+z'],threadfin:['fish_threadfin','+z'],seabeast:['fish_seabeast','+z'],seahorse:['fish_seahorse','up',{upYaw:Math.PI/2}]};
const RHEAD={gwhite:'+z',tigershark:'+z',dolphin:'+z',whale:'+z',gator:'+x',eagle:'+z',gull:'-x',yacht:'-z',flyfish:'-x'};
const RSETS={lake:['mermaid_v2','fish_bowfin','fish_reba','fish_mandarin','bluegill','crappie','lmbass','smbass','channel','flathead','gar','barra','koi','gator','eagle'],
  ice:['trout','pike','bluegill','crappie'],
  tide:['fish_hardclam','fish_gomphina','fish_tellin','fish_razor','fish_ghostcrab','fish_fiddler','fish_mudskip','fish_ragworm','fish_hermit'],
  sea:['mermaid_v2','fish_amber','fish_barracuda','fish_grouper2','fish_bigeye','fish_stingray','fish_amberjack','fish_knifejaw','fish_halibut','fish_sunfish','fish_mahi','fish_sail','yacht','gwhite','dolphin','whale','gull','grouper','tuna','marlin','ribbon','tigershark','flyfish','seaking']};
const RCREDIT=[['大白鯊','Great White Shark','SealifeFan3'],['虎鯊','Tiger Shark','ra_in_coat'],['海豚','Bottlenose Dolphin','popcornbag'],['座頭鯨','Humpback Whale','ostapblendercg'],
  ['鱷魚','American Alligator','JeremyGrayson'],['白頭海鵰','Bald Eagle','ucdavisterc'],['海鷗','Seagull','Dayvable'],['遊艇',"Frickie's yacht",'dannzjs'],
  ['藍鰓太陽魚','Low-Poly Bluegill Fish','TepidGames'],['黑斑刺蓋太陽魚','Black Crappie','dgeraci'],['大口黑鱸','Largemouth bass','faerbogdan99'],['小口黑鱸','Smallmouth bass','faerbogdan99'],
  ['斑點叉尾鮰','Channel catfish','faerbogdan99'],['扁頭鯰','Flathead Catfish','faerbogdan99'],['鱷雀鱔','Alligator Gar','Jay_Tano'],['錦鯉','Koi Fish','7plus'],
  ['石斑','lowpoly freshwater grouper','Arrangemonk9'],['黑鮪魚','Bluefin Tuna','voltairevill'],['旗魚','Blue Marlin','Gotta_go_evi'],['飛魚','Exocoetidae','victorberdug'],
  ['金目鱸','Barramundi fish','ryan_saputra'],['白帶魚','hairtail fish','lingsound'],['第一人稱雙手','First Person arms','bumstrum'],['虹鱒','Rainbow Trout','ucdavisterc'],['白斑狗魚','Northern Pike','Nullifiedit'],['曲柄硬餌','Fishing lure Chubby 38','Zverev'],['亮片・米諾','Fishing Lures / Fishing Lures #2','xeofox'],['印度鯪・鱖魚・紅甘・鬼頭刀・雨傘旗魚・弓鰭魚・鯽魚・吳郭魚・線鱧・孔雀鱸・塘蝨・斑點雀鱔・鯉魚・鰱魚・草魚・青魚・巨骨舌魚・北極紅點鮭・江鱈・黑鯛・鸚哥魚・真鯛・青嘴龍占・海鱺・曲紋唇魚・正鰹・土魠・黃鰭鮪・鱸鰻・湄公河巨鯰・黃金鱸・白鮭・湖紅點鮭・哲羅鮭・浪人鰺・劍旗魚・公子小丑魚・擬刺尾鯛・鬚鳚・神仙魚・長吻蝴蝶魚・絲鰺・海馬・神話海馬獸・原木獨木舟','依玩家設定圖以 Hunyuan3D-2mv 生成（Apache 2.0）','Tencent'],['霜汐（美人魚）','依玩家設定圖以 Hunyuan3D-2mv 生成（Apache 2.0）','Tencent'],['滄淵','依玩家設定圖以 Hunyuan3D-2mv 生成（Apache 2.0）','Tencent']];

const GLOW=[];
const BAKED=new Set(['fish_clownfish','fish_bluetang','fish_blenny','fish_angelfish','fish_copperband','fish_threadfin','fish_seabeast','fish_seahorse','fish_eel','fish_mekong','fish_yperch','fish_whitefish','fish_laketrout','fish_taimen','fish_gt','fish_swordfish','fish_char','fish_burbot','fish_porgy','fish_parrot','fish_redbream','fish_emperor','fish_cobia','fish_wrasse','fish_skipjack','fish_sawara','fish_yellowfin','fish_clarias','fish_spgar','fish_carp','fish_silvercarp','fish_grasscarp','fish_blackcarp','fish_arapaima','fish_crucian','fish_tilapia','fish_snakehead','fish_peacock','fish_reba','fish_mandarin','fish_amber','fish_mahi','fish_sail','fish_bowfin','mermaid_v2','seaking']);   // 依設定圖烘焙貼圖的模型
function createModels(W){
'use strict';
const T=THREE, loader=new T.GLTFLoader(), files={}, waiters={}, mixers=[];
const ang=a=>({'+x':0,'-z':Math.PI/2,'-x':Math.PI,'+z':-Math.PI/2})[a];
function load(f){ if(files[f]) return; const e=files[f]={g:null};
  const ok=g=>{ e.g=g; (waiters[f]||[]).forEach(fn=>{ try{ fn(g); }catch(err){ console.warn('real',f,err); } }); waiters[f]=[]; };
  loader.load(REAL_DIR+f+'.glb',ok,undefined,()=>{ e.err=1; }); }
const ready=f=>files[f]&&files[f].g;
function onReady(f,fn){ if(ready(f)) fn(files[f].g); else (waiters[f]=waiters[f]||[]).push(fn); }
function preload(set){ (RSETS[set]||[]).forEach(load); }

/* 擺尾著色器：跟程序化魚同一套，頭在 +X、身長 1 */
function bendify(m,uni,K){ K=K||1; m.onBeforeCompile=s=>{ s.uniforms.uSwim=uni.uSwim; s.uniforms.uAmp=uni.uAmp;
  s.vertexShader='uniform float uSwim;\nuniform float uAmp;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat bx_=clamp(0.5-position.x,0.0,1.6);\ntransformed.z+=sin(uSwim-position.x*5.5)*bx_*bx_*uAmp*'+K.toFixed(2)+';'); }; }
/* 魚的骨架：沿身體（頭在 +X、身長 1）建 6 節骨頭，頂點依前後位置平滑分配權重；
   每格依 uSwim、uAmp 算出身體波形，換成每節骨頭的轉角。一般魚左右擺尾，扁平的魚（魟、比目魚）上下波動 */
const FLAT=new Set(['halibut']), FRIGS=new Set();
// 特殊游法：魟（左右胸鰭像翅膀上下拍動）、翻車魚（上下兩片大鰭左右划水，身體幾乎不擺）
const SWIMK={stingray:'ray',sunfish:'mola',ghostcrab:'crab',fiddler:'crab',hermit:'crab',hardclam:'stiff',gomphina:'stiff',tellin:'stiff',razor:'stiff'};   // 螃蟹：兩側的腳一起划動；貝類：殼不彎
const BX=[.46,.28,.1,-.08,-.25,-.4];
// 螃蟹、寄居蟹、海瓜子的貼圖在細腳、殼緣會投影到原圖的白色背景：把接近純白的部分挖掉，不再出現一塊塊白色
const CUTWHITE=new Set(['ghostcrab','fiddler','hermit','tellin','gomphina','hardclam']);
const cutWhite=sh=>{ sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n if(min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b))>0.86&&max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))-min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b))<0.08) discard;'); };
function rigFish(grp,uni,K,mode){ const bones=BX.map(()=>new T.Bone()); bones[0].position.set(BX[0],0,0); for(let i=1;i<bones.length;i++){ bones[i].position.set(BX[i]-BX[i-1],0,0); bones[i-1].add(bones[i]); }
  grp.add(bones[0]); const all=[...bones], band=.06, extra={};
  // 量出身體範圍：魟看左右寬度，翻車魚看上下高度
  let wz=0, hy=0; grp.children.forEach(m=>{ if(!m.isMesh) return; const P=m.geometry.attributes.position; for(let i=0;i<P.count;i++){ wz=Math.max(wz,Math.abs(P.getZ(i))); hy=Math.max(hy,Math.abs(P.getY(i))); } });
  const addB=(parent,x,y,z)=>{ const b=new T.Bone(); b.position.set(x,y,z); parent.add(b); all.push(b); return all.length-1; };
  if(mode==='ray'||mode==='crab'){ const r0=wz*(mode==='crab'?.42:.28), r1=wz*.62; extra.L=[addB(bones[2],0,0,r0)]; extra.L.push(addB(all[extra.L[0]],0,0,r1-r0)); extra.R=[addB(bones[2],0,0,-r0)]; extra.R.push(addB(all[extra.R[0]],0,0,-(r1-r0))); extra.r0=r0; extra.r1=r1; }
  if(mode==='mola'){ const y0=hy*.42; extra.D=addB(bones[2],0,y0,0); extra.A=addB(bones[2],0,-y0,0); extra.y0=y0; }
  if(mode==='stiff'){ extra.H=addB(bones[0],0,0,0); }
  if(mode==='crab'&&grp.userData.bigClaw){ // 大螯在哪一側：比較前半身左右兩邊的頂點數量，多的那邊就是大螯
    let zp=0,zn=0; grp.children.forEach(m=>{ if(!m.isMesh) return; const P=m.geometry.attributes.position; for(let i=0;i<P.count;i++){ if(P.getX(i)>.02){ if(P.getZ(i)>0) zp++; else zn++; } } });
    extra.clawSide=zp>zn?1:-1; extra.C=addB(bones[1],0,0,extra.clawSide*wz*.25); }   // 貝殼：上殼掛在殼頂的鉸鏈上，可以開合
  const skel=new T.Skeleton(all);
  grp.children.filter(o=>o.isMesh&&!o.isSkinnedMesh).forEach(m=>{ const g=m.geometry, P=g.attributes.position, n=P.count, si=new Uint16Array(n*4), sw=new Float32Array(n*4);
    for(let i=0;i<n;i++){ const x=P.getX(i), y=P.getY(i), z=P.getZ(i); let k=0; while(k<BX.length-1&&x<BX[k+1]) k++; let w=1, j=k; if(k>0&&x>BX[k]-band&&x<=BX[k]){ j=k-1; w=.5+.5*(BX[k]-x)/band; }
      let f=0, fb=0;
      if(mode==='ray'||mode==='crab'){ const az=Math.abs(z), side=z>0?extra.L:extra.R; if(az>extra.r0){ f=Math.min(1,(az-extra.r0)/(wz*.12)); fb=az>extra.r1?side[1]:side[0]; } }
      if(mode==='mola'){ const ay=Math.abs(y); if(ay>extra.y0){ f=Math.min(1,(ay-extra.y0)/(hy*.1)); fb=y>0?extra.D:extra.A; } }
      if(extra.C!=null&&x>.02&&z*extra.clawSide>wz*.28){ f=Math.min(1,(z*extra.clawSide-wz*.28)/(wz*.12)); fb=extra.C; }
      if(mode==='stiff'&&y>hy*.04){ f=Math.min(1,(y-hy*.04)/(hy*.08)); fb=extra.H; }
      si[i*4]=k; si[i*4+1]=j; si[i*4+2]=fb; sw[i*4]=w*(1-f); sw[i*4+1]=(1-w)*(1-f); sw[i*4+2]=f; }
    g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4)); g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
    const mats=(Array.isArray(m.material)?m.material:[m.material]); mats.forEach(mm=>{ mm.onBeforeCompile=grp.userData.cutWhite?cutWhite:()=>{}; if(grp.userData.cutWhite){ mm.side=T.DoubleSide; mm.customProgramCacheKey=()=>'cutw'; mm.metalness=0; mm.roughness=.62; mm.envMapIntensity=.4; }   /* 甲殼與貝殼：霧面，不像金屬反光 */ mm.skinning=true; mm.needsUpdate=true; });
    const sm=new T.SkinnedMesh(g,m.material); sm.frustumCulled=false; grp.remove(m); grp.add(sm); grp.updateMatrixWorld(true); sm.bind(skel,new T.Matrix4()); });
  const r={grp,uni,K:mode==='mola'?K*.25:mode==='ray'?K*.35:mode==='crab'?K*.06:mode==='stiff'?K*.02:K,flat:mode==='flat'||mode==='ray',mode,bones,all,extra,idle:0}; FRIGS.add(r); return r; }
function poseFish(r,dt){ if(!r.grp.parent){ r.idle+=dt; if(r.idle>12) FRIGS.delete(r); return; } r.idle=0;
  const u=r.uni.uSwim.value, A=r.uni.uAmp.value*r.K, off=x=>{ const bx=Math.max(0,Math.min(1.6,.5-x)); return Math.sin(u-x*5.5)*bx*bx*A; };
  let prev=0; for(let i=0;i<r.bones.length;i++){ const x0=BX[i], x1=i<BX.length-1?BX[i+1]:BX[i]-.12, sl=Math.atan2(off(x1)-off(x0),x0-x1), a=sl-prev; prev=sl;
    if(r.flat) r.bones[i].rotation.set(0,0,a); else r.bones[i].rotation.set(0,-a,0); }
  const amp=Math.min(1,.25+r.uni.uAmp.value*6), ph=u*.55, e=r.extra;
  if(r.mode==='ray'||r.mode==='crab'){ const cr=r.mode==='crab', a0=Math.sin(cr?u*2.2:ph)*(cr?.22:.38)*amp, a1=Math.sin((cr?u*2.2:ph)-.9)*(cr?.28:.45)*amp;   // 外側比內側慢半拍，翅膀呈波浪
    if(r.mode==='crab'){ const w=u*2.2, sw=Math.min(1,r.uni.uAmp.value*6)*.32;   // 螃蟹走路：左右兩側交替抬腳、往前後划，不是像翅膀一起拍
      r.all[e.L[0]].rotation.set(Math.max(0,Math.sin(w))*.3*amp,Math.sin(w)*sw,0); r.all[e.L[1]].rotation.set(Math.max(0,Math.sin(w+1.6))*.25*amp,Math.sin(w+1.6)*sw,0);
      r.all[e.R[0]].rotation.set(-Math.max(0,Math.sin(w+Math.PI))*.3*amp,Math.sin(w+Math.PI)*sw,0); r.all[e.R[1]].rotation.set(-Math.max(0,Math.sin(w+Math.PI+1.6))*.25*amp,Math.sin(w+Math.PI+1.6)*sw,0); }
    else { r.all[e.L[0]].rotation.set(a0,0,0); r.all[e.L[1]].rotation.set(a1,0,0); r.all[e.R[0]].rotation.set(-a0,0,0); r.all[e.R[1]].rotation.set(-a1,0,0); } }
  if(e.C!=null){ const wv=(Math.sin(u*.9)>.55)?Math.sin(u*6)*.5:0; r.all[e.C].rotation.set(e.clawSide*wv*.3,0,Math.max(0,wv)*.6); }   // 招潮蟹一陣一陣舉起大螯揮動
  if(r.mode==='stiff'&&e.H!=null){ const gape=Math.max(0,Math.sin(u*.35))*(.05+.25*Math.min(1,r.uni.uAmp.value*4)); r.all[e.H].rotation.set(0,0,gape); }   // 殼慢慢張開一條縫再合上，被挖出來掙扎時開合更大
  if(r.mode==='mola'){ const a=Math.sin(u*.8)*.55*amp; r.all[e.D].rotation.set(a,0,0); r.all[e.A].rotation.set(a,0,0); } }
// 有骨架的魚被複製時（水族箱、標本、烤魚、圖鑑…），複製成不帶骨架的普通網格：直接複製骨架網格會指向原本那副骨頭，畫不出來
function cloneSafe(grp){ grp.clone=function(){ const g=new T.Group(); this.traverse(ch=>{ if(!ch.isMesh) return; const mats=(Array.isArray(ch.material)?ch.material:[ch.material]).map(m=>{ const k=m.clone(); k.skinning=false; k.onBeforeCompile=()=>{}; k.needsUpdate=true; return k; });
    const m=new T.Mesh(ch.geometry,Array.isArray(ch.material)?mats:mats[0]); m.frustumCulled=false; g.add(m); }); g.position.copy(this.position); g.quaternion.copy(this.quaternion); g.scale.copy(this.scale); g.visible=this.visible; return g; }; }
const fishReady=id=>!!(RFISH[id]&&ready(RFISH[id][0]));
function fish(sp){ const c=RFISH[sp.id]; if(!c) return null; const g=ready(c[0]); if(!g) return null; const opt=c[2]||{};
  const sc=g.scene; sc.updateMatrixWorld(true); let ms=[]; sc.traverse(o=>{ if(o.isMesh) ms.push(o); });
  if(!ms.length) return null;
  ms.sort((a,b)=>b.geometry.attributes.position.count-a.geometry.attributes.position.count); if(opt.one) ms=[ms[0]];
  const R=c[1]==='up'?new T.Matrix4().makeRotationY(opt.upYaw||0):new T.Matrix4().makeRotationY(ang('+x')-ang(c[1])), box=new T.Box3(), parts=[];
  for(const m of ms){ const geo=m.geometry.clone(); geo.morphAttributes={};
    if(m.isSkinnedMesh&&m.skeleton&&geo.attributes.skinIndex){ sc.updateMatrixWorld(true); const pa=geo.attributes.position, v=new T.Vector3();
      for(let i=0;i<pa.count;i++){ m.boneTransform(i,v); v.applyMatrix4(m.matrixWorld); pa.setXYZ(i,v.x,v.y,v.z); }
      pa.needsUpdate=true; geo.computeVertexNormals(); }
    else geo.applyMatrix4(m.matrixWorld);
    ['skinIndex','skinWeight'].forEach(k=>{ if(geo.attributes[k]) geo.deleteAttribute(k); });
    if(!geo.attributes.normal) geo.computeVertexNormals(); geo.applyMatrix4(R); geo.computeBoundingBox(); box.union(geo.boundingBox); parts.push([geo,m.material]); }
  const sz=box.getSize(new T.Vector3()), ct=box.getCenter(new T.Vector3()), s=1/Math.max(c[1]==='up'?sz.y:sz.x,1e-6);
  const uni={uSwim:{value:0},uAmp:{value:0}}, grp=new T.Group();
  for(const [geo,mat] of parts){ geo.translate(-ct.x,-ct.y,-ct.z); geo.scale(s,s,s); geo.computeBoundingSphere();
    const conv=mm=>{ const n=new T.MeshStandardMaterial({color:mm.color?mm.color.clone():new T.Color(1,1,1),map:mm.map||null,normalMap:mm.normalMap||null,
        roughnessMap:mm.roughnessMap||null,metalnessMap:mm.metalnessMap||null,roughness:mm.roughness!==undefined?mm.roughness:.5,metalness:mm.metalness!==undefined?mm.metalness:0,
        transparent:!!mm.transparent,alphaTest:mm.alphaTest||0,opacity:mm.opacity!==undefined?mm.opacity:1,side:mm.side,envMapIntensity:1.25,vertexColors:!!geo.attributes.color});
      if(opt.moon){ n.color=new T.Color(0xc4d8f4); n.emissive=new T.Color(0x2a64a8); n.emissiveIntensity=.22; n.metalness=.55; n.roughness=.24; }   // 月神鯉：保留鯉魚本身的鱗片花紋，只帶銀藍色金屬光澤（不再整條洗成白色）
      if(opt.mer){ n.roughness=.42; n.metalness=.08; }
      if((opt.mer||opt.king)&&n.map){ n.emissive=new T.Color(0xdde6ff); n.emissiveMap=n.map; n.emissiveIntensity=.15; GLOW.push(n); }   // 夜裡用自己的顏色微微發光
      if(opt.king){ n.roughness=.42; n.metalness=.35; n.emissive=new T.Color(0x0a3a5a); n.emissiveIntensity=.35; }
      if(mm.normalScale) n.normalScale.copy(mm.normalScale);
      if(n.map&&BAKED.has(c[0])){ n.map.generateMipmaps=false; n.map.minFilter=T.LinearFilter; n.map.needsUpdate=true; }   // 烘焙貼圖（三角形成對打包）關閉多層級縮圖，避免方格之間滲色
      [n.map,n.normalMap,n.roughnessMap,n.metalnessMap].forEach(t=>{ if(t&&t.channel) t.channel=0; });
      if(opt.gold){ n.color=new T.Color(0xffc23a); n.emissive=new T.Color(0xffa010); n.emissiveIntensity=.18; n.metalness=.55; n.roughness=.25; }
      if(opt.ghost){ n.color=new T.Color(0xbfe6ff); n.transparent=true; n.opacity=.38; n.emissive=new T.Color(0x4ab8ff); n.emissiveIntensity=.55; n.depthWrite=false; n.side=T.DoubleSide; }   // 幽靈魚：真的半透明，看得到後面的水草
      bendify(n,uni,opt.king||opt.mer?.15:1); return n; };
    const mesh=new T.Mesh(geo,Array.isArray(mat)?mat.map(conv):conv(mat)); mesh.frustumCulled=false; grp.add(mesh); }
  try{ if(opt.mer&&window.__MER){ const ctl=window.__MER.rig(grp,{uni,horiz:()=>!!window.__UWON&&!(window.__G&&window.__G.merShow)}); grp.userData.merCtl=ctl; }   // 美人魚：完整骨架＋表情（眨眼、說話、微笑、揮手、尾巴波浪、頭髮）
    else if(c[1]==='up'){ if(typeof autoRig==='function'){ grp.children.forEach(m=>{ if(m.isMesh) (Array.isArray(m.material)?m.material:[m.material]).forEach(mm=>{ mm.onBeforeCompile=()=>{}; }); });
        const rg=autoRig(grp,'tail'); FRIGS.add({grp,uni,up:rg,idle:0}); } }
    else { grp.userData.cutWhite=CUTWHITE.has(sp.id); grp.userData.bigClaw=sp.id==='fiddler'; rigFish(grp,uni,opt.king||opt.mer?.15:1,SWIMK[sp.id]||(FLAT.has(sp.id)?'flat':'fish')); } cloneSafe(grp); }catch(e){ console.warn('fish rig',sp.id,e); }
  return {group:grp,uni,sp,real:true}; }

function measure(root){ root.updateMatrixWorld(true); const b=new T.Box3(), v=new T.Vector3();
  root.traverse(m=>{ if(!m.isMesh||!m.visible) return; const pa=m.geometry.attributes.position, step=Math.max(1,Math.floor(pa.count/4000));
    for(let i=0;i<pa.count;i+=step){ if(m.isSkinnedMesh&&m.skeleton) m.boneTransform(i,v); else v.fromBufferAttribute(pa,i); v.applyMatrix4(m.matrixWorld); b.expandByPoint(v); } });
  return b; }
/* 動物：把真模型掛進原本的物件，沿用原本的位置與朝向，保留模型自帶的骨架動畫 */
function attach(host,key,o){ const h={host,loaded:false,actions:{},mixer:null,play(n){ const a=this.actions[n]; if(!a) return; for(const k in this.actions) if(k!==n) this.actions[k].fadeOut(.2); a.reset().fadeIn(.15).play(); }};
  onReady(key,g=>{ const obj=T.SkeletonUtils?T.SkeletonUtils.clone(g.scene):g.scene.clone();
    const inner=new T.Group(); inner.add(obj); inner.rotation.y=ang(o.target||'+z')-ang(RHEAD[key]);
    const wrap=new T.Group(); wrap.add(inner); wrap.updateMatrixWorld(true);
    const b=measure(wrap), sz=b.getSize(new T.Vector3()), ax=(o.target||'+z')[1];
    const s=o.len/Math.max(ax==='x'?sz.x:sz.z,1e-6); inner.scale.setScalar(s); wrap.updateMatrixWorld(true);
    const b2=measure(wrap), c2=b2.getCenter(new T.Vector3());
    inner.position.set(-c2.x,o.top!==undefined?o.top-b2.max.y:-c2.y,-c2.z);
    if(o.pitch){ wrap.rotation.x=o.pitch; } if(o.off) wrap.position.set(...o.off);
    obj.traverse(m=>{ m.frustumCulled=false; if(m.isMesh&&m.material){ (Array.isArray(m.material)?m.material:[m.material]).forEach(mm=>{ mm.envMapIntensity=1.1; }); } });
    if(host.isMesh){ host.material=new T.MeshBasicMaterial({visible:false}); }
    host.children.slice().forEach(c=>{ c.visible=false; });
    host.add(wrap); host.userData.real=true; h.wrap=wrap;
    if(g.animations&&g.animations.length&&o.anim!==false){ const mx=new T.AnimationMixer(obj); h.mixer=mx; mixers.push(mx);
      g.animations.forEach(cl=>{ h.actions[cl.name]=mx.clipAction(cl); });
      const first=(o.clip&&Object.keys(h.actions).find(k=>k.indexOf(o.clip)>=0))||Object.keys(h.actions)[0];
      const a=h.actions[first]; a.play(); a.time=Math.random()*cl0(a); if(o.speed) a.timeScale=o.speed; }
    h.loaded=true; if(o.onLoad) o.onLoad(h,b2); });
  return h; }
const cl0=a=>a.getClip().duration||1;

/* 遊艇：船頭在前方 4.5m，鏡頭站在前甲板，甲板高度用射線量出來 */
function attachYacht(host,setHull,spots){ onReady('yacht',g=>{ const obj=g.scene.clone(), wrap=new T.Group(); wrap.add(obj);
  const L=26; let b=new T.Box3().setFromObject(wrap), sz=b.getSize(new T.Vector3()); obj.scale.setScalar(L/sz.z); wrap.updateMatrixWorld(true);
  b=new T.Box3().setFromObject(wrap); const c=b.getCenter(new T.Vector3()), H=b.max.y-b.min.y;
  obj.position.x-=c.x; obj.position.z+=-4.5-b.min.z; obj.position.y+=-(b.min.y+H*.1); wrap.updateMatrixWorld(true);
  const rc=new T.Raycaster(new T.Vector3(0,100,0),new T.Vector3(0,-1,0)); const hit=rc.intersectObject(wrap,true)[0];
  const deck=hit?hit.point.y:1.6;
  obj.traverse(m=>{ m.frustumCulled=false; if(m.isMesh) m.castShadow=false; });
  // 船的材質升級：原模型貼圖只有 128～256 像素。依材質實際顏色分類：木甲板換成實拍柚木板（含法線、粗糙度）、白色船身換成亮面玻璃纖維漆（清漆反光）、金屬換成拋光不鏽鋼
  try{ const TL=new T.TextureLoader(), tx=(f,r,srgb)=>{ const t=TL.load(f); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(r,r); if(srgb) t.encoding=T.sRGBEncoding; t.anisotropy=8; return t; };
    const teak=new T.MeshStandardMaterial({map:tx('dock_diff.jpg',3,true),normalMap:tx('dock_nor.jpg',3),roughnessMap:tx('dock_rough.jpg',3),color:0xc9a27a,roughness:.85});
    const gel=new T.MeshPhysicalMaterial({color:0xf2f4f5,roughness:.22,metalness:0,clearcoat:1,clearcoatRoughness:.06});
    const steel=new T.MeshStandardMaterial({color:0xd9dde1,metalness:1,roughness:.18});
    const navy=new T.MeshPhysicalMaterial({color:0x1b2a44,roughness:.25,metalness:0,clearcoat:1,clearcoatRoughness:.08});
    const vinylTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.fillStyle='#e9e6df'; x.fillRect(0,0,64,64); for(let i=0;i<900;i++){ x.fillStyle=Math.random()<.5?'rgba(0,0,0,.05)':'rgba(255,255,255,.07)'; x.fillRect(Math.random()*64,Math.random()*64,1,1); } const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(6,6); return t; })();
    const vinyl=new T.MeshStandardMaterial({color:0xffffff,map:vinylTex,bumpMap:vinylTex,bumpScale:.003,roughness:.62});
    const cvs=document.createElement('canvas'); cvs.width=cvs.height=8; const g2=cvs.getContext('2d');
    const avg=t=>{ try{ g2.clearRect(0,0,8,8); g2.drawImage(t.image,0,0,8,8); const d=g2.getImageData(0,0,8,8).data; let r=0,g=0,b=0; for(let i=0;i<d.length;i+=4){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; } const n=d.length/4; return [r/n,g/n,b/n]; }catch(e){ return null; } };
    const memo=new Map();
    obj.traverse(m=>{ if(!m.isMesh||!m.material) return; const mm=m.material; if(memo.has(mm)){ m.material=memo.get(mm); return; } let out=mm;
      if(mm.metalness>.6&&!mm.map) out=(mm.color&&(mm.color.r+mm.color.g+mm.color.b)<.5)?navy:steel;   // 很暗的金屬色其實是深藍船身漆，不是不鏽鋼
      else if(mm.map&&mm.map.image){ const c=avg(mm.map); if(c){ const [r,g,b]=c, mx=Math.max(r,g,b), mn=Math.min(r,g,b);
          if(r>g&&g>b&&r-b>30&&mx<210) out=teak; else if(mn>175&&mx-mn<30) out=gel;
          else if(b>r+15&&mx<140) out=navy;   // 深藍船身：換成深藍亮面漆（清漆反光）
          else if(mx-mn<22&&mx>95&&mx<=175) out=vinyl; } }   // 灰白座墊、帆布：換成船用防水皮革（細紋、半霧面）
      memo.set(mm,out); m.material=out; if(window.__YDBG) console.log('YM',mm.name,out===teak?'teak':out===gel?'gel':out===navy?'navy':out===vinyl?'vinyl':out===steel?'steel':'keep',mm.map&&mm.map.image?avg(mm.map).map(v=>v|0).join(','):'-',(mm.color&&mm.color.getHexString())); }); }catch(e){ console.warn('yacht mats',e); }
  host.children.slice().forEach(ch=>{ ch.visible=false; }); host.add(wrap);
  const b3=new T.Box3().setFromObject(wrap); setHull(Math.max(Math.abs(b3.min.x),b3.max.x),b3.min.z,b3.max.z);
  spots.forEach(s=>{ if(s.yacht) s.eye=deck+1.62; }); }); }

function update(dt){ for(const m of mixers) m.update(dt);
  for(const r of FRIGS){ if(r.up){ if(!r.grp.parent){ r.idle+=dt; if(r.idle>12) FRIGS.delete(r); continue; } r.idle=0; r.up.pose({t:r.uni.uSwim.value*.35,tail:.06+r.uni.uAmp.value*1.2,tailF:2.2}); } else poseFish(r,dt); } }
function credits(){ return RCREDIT.map(r=>`${r[0]}：「${r[1]}」by ${r[2]}`).join('<br>'); }
const want=id=>{ if(RFISH[id]) load(RFISH[id][0]); };   // 圖鑑詳細頁要看哪種魚，就只下載那一種
function glowTick(){ const lt=W.info?W.info.light:1, k=Math.max(0,.6-lt); GLOW.forEach(n=>n.emissiveIntensity=.12+k*1.0); }
return {glowTick,preload,want,fish,fishReady,attach,attachYacht,update,credits};
}
/* 耶魯亮星星表 BSC5（Hoffleit & Warren, NASA ADC / CDS V/50），星等≤6.0 */
const STAR_B64='8gDj96U+AwENE7s2HQEbU8coHwE1usAfJQFMW73/YgH+38YIbgFR0MBDfQFfKWX6eQF088c+oQEfVGoUmwHmGbw+qQEz2LkZrAHxvpM9yAHZD7v81QGFQa8Y1QGK+MQ6yAERi7Y/5wEc7sQ8AAIB6qwdDgJ32LlQFQIJzrUaKQJ+5rVYWgKYFXjzZgJcOsESbwL+2sZdmAK8HKpekgLw9LJhXgIgh8JnmgIT5aFjqQKLDMISpgJk8sH83gJI079RAwOCV8E0DAMwRMX7CQMDN6UDQgNQNKMDUAPSLMQAdAN084tJkQO9o5sioAP/K8X6sAPOLsJfqQOlC7hQwQP/NbMZqwP8nLv90wPJ1rM83gN647Jt0QPjkcdUUAT7Sb35aATvV7kAdgRxS8H9hATCAsIzkwQiknglrATWw21BqATiwZQK1wSr28c9/ARyGbBjBAUjP7MB9wQP0apiDgU8x7ldZAVMVcYAWgVPKrQOVwVg+sFdZgUs3rMHaQVuu8AVlgXCL8REpgWKTaj6ogUlS75FlQWYuqkBmwV3pp/8nAV0pqMJ3QWAWZoIywXcHLhAwgXkCb8A5QUSTsY+0QVcprEC/QX31bxMIAaFtb0cRAbk+rQhUQZI/8YabAYJTbH6ewbLVcIRWAa8u7saiQZFP7JgkgamTI30jgb0L5/4igapFcX3owZYMrs0owbH3L0r2gavKZ809gYwRrli/QbjK4NM/wY4HsQzGQd9HrhFMwdnUGlGPAfQ+cVCTwceOLc1MAdyq8UhegcSXsM+egfWR6r6WAd2vqQ6bQelr8AMugfgQq0KlwdMqsdPjAflorgevwds5mU95gcSRL/5tQdHrp8AHQilar8D8werRKP82wfq8Kk82wdcycVFDQiITrkC9Ae14LUT/QdPw8YQfQhyarn8IghgvMMmNgj537s6RggCFrhjjwhbZ8Q8XAgHEbs6agiDIpdDbAiWCcc4ewhR5sBOugg5UogiiQgc4b39lQhhCsZCmQiCB8E0rgh8SKz6pwjJCqBatQgXGLAe2whrOqP3yQi37L1OwAit3cU5BAlfW7gd6Qjd8LMeowhzlbBSwQkLd74FAgl9t7QVbwntVqofXQnd3bpKbAlg/qlexwneU6pItAlKG8EAiAmWpsBdxQmaIbo85wmO9cRbFApZVm/3EgoqVKU5GArYVbz89Qn777ZbFgrANpIHxwkfnbpBKwpNIaA4ZwpdXsf/SAo7KblAWgpIMMc8cArR7746awpA1p33OAysepxI5gqoyL1GLgvMOscJKgs7Lbv9TwvcVsYdGQsh07sEMAs4C505NQsg+blCbwuUV8QgYguqSsdYKgsEvrg2iAsLCMhakgtBFcAYrQuJHrf/rQuHHr38vwsC8r0AIwwbTrMpvwuPvYQ1Fwx+Pq8GLwzcUsIAFAx+HbwHDAwW8sMZJwwICLwUDQwAxbQJ9wslqLg02QxPcb8AMQyF8YhFWwwvQ5z8jwzQYbb/ZQyoMmVeKAxvsZT8aQz1G7wpfwzYO78kgAw0JMNYsgxOW7z8owxuTp4Kvgx3XL37iwx6A8ZapwymNcP6pAyxLLMNswzqHaY9vQzKKqJBwAzN/MZU7wwqysYQHA32IqY+Gw3FCrUTLQ3xFsf8OQ289LIbTQ2e/sAZXQ1Av64ing1y/Lk2eA0Mnqsc1A0jBbMEPA7QUq4oIA7GJqkBLw5H/8Qmaw7eKLRTow7AQKxA4A6jNb0P1A4cHcdmRg/kYKg/2A7+08Rg7w5d9Iw/QQ+qVXUH/g4r9sUYDQ/+xLk+WA/OPccdOA8966xJVQ9EG7gXaQ9cG7tClQ+TQKoZIA91pMZdcQ9v7b8VdQ+40cJ//RrzfmQkNxDtY8MctQ9lwodeBBDaQrU87Q8+4bIBCBC8CKtSERC72sZQQxDTFYw6nBDzUsBbOBA2upQ7ThDv1MNAshA9VKc8hRCTy7s9whD1NMX8qRAD9sIm2xBBGsVb0hC16b4EJRFKRcZIgxHgZ7Y5DRHLGMMkNRHiOpggEBEa6rlIcRF0Ur1SFxF41cATQhFEEb0VaxEoRYtMqREfP641gBENzMY/XxGarj33kxG/4b0UuBFUF8dD5RGTPb4M4RG1Oa37MRLEYL38TBJwZLP+GBKaPK0lEhK7Ksc8vREUsMQ2vREVsMI0CBLNB6FRJBIgMr/8XhIdVsL/FhLl78EaOBLTHLUybRIWSJf+KBIH0rU/JBKfy8EAQxLB+q5SGBKMqcBMOBKTs7wfgBJW6YkrvBIGDZw5JxPPWr4waBH/icQk1xLZ97dbyBJf3LYX3BK7t7tg3BLis7ACUBP5NcY6OxMdGMT/UhN9LsIhUxFyh8A4bBMeRMMRRhM9BcU6uRPbScUZlBOtH8QsexPO8KYT6BNtTrz2tRO0D8YS8BM8SML80BNO8Y9EtxOauMYIVhSMWob3IxTsOblPGhQRKocdLhRxG6okLhRwG6j+EBTt58MQnxSuYa76LxSIBKU4YRSXHXQHNBQnvqBfmhQENcVhphT6NL8/VBSQw7H9mBSHIcFH3BRWGbE37RSKJ8NgvRT336tVnRSbto4zRBXnW7UAExX6RcA89hSOIakQbhTMn6c51BSdvKo0rhXXZKMJQhXyHcQ98RX/ZpUAPhbobbgSXBVnBMUlShVj4rljVRUH4pZe2BVNXMgBaRXh87tbRRU6xL0/3hWSW70WvRV9TbD8HRVwqHkQUBY/bLQ5jRVW1bc0shXuA7QkshXuA54B3BVVL7sByhUqE8ZfohVpwLJZBhYzPGpSBxYzPKsB+xXiJL4g5hUuALkJ3BU86sQ6AhaF/8Y0/BUq+r5fIRZW1qf2gBY1IK8GmxZeIWRF4BYWU78k1xbXNaoHBxfCMX0IAhfkJK4TRBeFN77/OBe7G8Bj9RYdwsRHWRcwDL4hZRdo/cY6iBcYK60urhfnPqpYkxdeIsdSwBefSLY3mxcqHrUZpxe7FcBdpBeUDJ81mxeZ/LwipRcj4sQ8oBdP1Lb/KhhxL7YAIhirJMIaIBidI70d6hd1xcU6XRisMKskiBhYUsFGixjMUcc/aRgjMJYBWhje9rs53ReFn7xdjhhNHL4AwhhiQ7YAiRh/Ar0kRBi+tov5sxi8KK8CFRion8BOxRjE+35VDxlTR735ThlsT7MWZBnfOsMQ3xhwsMNdOxmQALZjRxm+/rkSPxmt8LoVQhni5sRJrBkeR7M6Vxkh3rQk4xmBR6dbZxlXt8YNvhkXD7r6MxlbnpgBgBrbX6MH8hmG7qz/9Bkv6sMJNxo6LbxDDxp/48VLwhk6qrcXZhlEl69BVxoxKrYkVhoIDJ39dBqRKsUiIRopvJz4UBrrz7IGwxrjI8YYzBpcAMgKChtoM7JY7ho5A7VMLRsgMcNADBuI/rc9CRtS6qgbGByPZ7M0OBu5zsU/BByAXcJdqxsQNcBTWRva16z9sRtUMbdjgBvT9MFUvxvLCcM6tRv0B6s05xsVN8Uc6xu6MLZduxvd9Lxf2BuzEcAd1hv+CsM+whtG1cE9CBws+7896BvTzsInOxw7H7kJ1B3Vc8JO9hp/j7Y6JBwP1cMc+xtHtbYQWhx3AJfzXRwe76sbkBx8JrYFehyP8sIf/BxeTsL5+RwfTMRD1xwpOawjaBwBw6gDqRwD/8AfTR11YMYG3Rx1HMD/kBxSx5g9uBxP68cZMB0CRpkdKx3/Prk2Dh1nJ6b5jxxssrQYBx2aBIgFXxzqnpj9QB3GFcIA5hzBt7khLR1L7Jz4Ux2zEbMOUh1iDpwSWR2X5aEc2R2YKaJC9h0AGsNIkh74YcMmAB7SI8T8ah1npcE3WB5+T5BkGB7WGLT9bR3Xn6sDOB7EJoz6Ux5+NpsUDx7q0aE7hR6eQsU1fR7cMaNdNB5E2LgBfB5zFbv7Qx4HzcY2aB4h4qg2Vx5EzbpLDB6uprUG+h4JS5Qs4R6FNrcYRx9+V70b3B4u4MY+2x5WycYaQR8SGsVY6R4NuZZ+XR+hGb4ZVB/rC8ccTh4+lahPhB9qLbEAXR9Z85NCZh+5+rMEqB9kHcMYxx9oOKcDFiHycLte1R8JMq1JiR8R3roN+B8oQ7o18B9bOsVW2x9ZHqUC2x9ZHqUCqR9u3sRPJyB0Srb9xB8L/LQA8h+rDKf5sB+uxoMIsR+vxp4E8R9//L387R8P3MAYISB1D8ZfViCiJcUIFCLdc8YJNCAb9cE/yR/ipK4HayAwBr76ZyDQBXFiVyDW8cNCSSAN2MUv2iAYTHsqeiAS9bc4/CClUKk9bCBn3pgJ6yA8N4ZjTCEaW8X/wiAx9bUMhSAyvcNOIiHBEr5AHyLNaasBpCALq7EUKiFY97VgcyE/Omf9nCGPRpcjZiC+mbz4sCHLP5E6tSFaKcEHASJVOKVC5CHiEMf9ESIOHJ49LCLDJsL5YSKERMU6NiJ5Cb1AnSONbroLRSJN/rAiJSLH1pIfziJDUcIrvyXCeL43NSLUwMYa4SJxSK9FuiJ1K7wApiLtHawAOyJ7rsF/ViGqj70SKSOcPrr90CJ186oNjSNeXav3KCPeN8cETyNsR7L9ZiM+R6/9VCOrMKpZRCOu/rg+NSMM18UTQyP936w2iiN/JsUzcSPLBKooUiOb5cAWGSMXvMRKnSNPKaFd4yPJRcYZzyOfPa0CeCMP4Y5heiOy3b5jxSMTHrb8KCMCp7wmwCM6BcA6iiPAwpwqYiTaW7R8PCMbp7UkICT9Rbb88iNDJ7xCCyR/HbFKzSNj3rw0UiTpRl4cWiSxL77/UiQpI7tH1iLxkbwaaSTXDIw1/CTGRa77KiU+VZsYISXkRr3+1CTXDY/7USW8U6MhCSUUML4BOCVpRqb7sCQn2cY4VSXcTrED+iTz78FCcSVpRMP+byVCRJ9R5SRCzcBNRSVT9sc9ZyUfELL/QiX67b0KtiVMRLr6jSRlnccZkiU2J8ckfCVlEphDdyXNCMY5xCWAQbYYcSXJ+Kj7+yUvTscGziVuMsX9USVew8IN+CW+OMMGyyVUDcL8cSWgvMcGOCV+pqgY2iWN8o80HybKIsYHfCaJRJv9ASY84Zz6yiVbuMBCfCVxocP9ZCYV8L02iibVAMA3cyYp57T5jSaSAJ0ififnWbFhmCa5xqQ+ciwye8QW1yZ99cQ6VCWSkMA37yYA+Mc3lydJVcJmTydyNb38FSdYBL04OSeX+Lz3oSf2Q335iCdNMK4ALiiSX8MVhScEHMAALygWWqow4CfrLZED6ifaM70DgieU0q/3CCiNPJAZsCce8oo3wCjKZLoFvicX8b4N9ieLIrr+LCj3QL/8+idLIo76nSfvyqRIByhTI7/8CSjLIp366SdZ/rX68yhyZaUBJSinIpL8/SeU/7xVKSjrIsL+HiiaCLf5zSgwXaFwPCgPIpr90SgFWsQKNCisCcU7MyjL7qBhcChIInn7CyimvME5QihH1sUHmChPIbr8Uyjw3psZlCjZD7D52yfWo5JD5ijzP78tzigPL7EEvSg1Ioz7vihTIrH8eCgM3rUEpShSAMVJhSgZ1bw6oyhG4sNi8ShgJLUMoyh/yrkAoyiAyqj/OSndMMIAjClzUsMKyiiFzJo5iSkwRcI/PilLCb8DcymkGMcUXSlh+Lv6nylYLXkHNSqzWa/7KCroVq9X8ykURLj8ZShsloNhECoZSLYYpinN+6k4jCkA3ab5iSmbzrH5CirkMbv/hSlQvcZK0ynL7sgTGyr3H74SqymbxsAkSCrmOHr2eyrmMpcAcyzEcrEhUCrK7Htfdyo5+MM8kyof7r5YzyrfGcUTySrDEYj5pyrZ3ab5vSusYcRcdSshVLAe+io3Dr8B8CrM/bb3ySqj1MYCcSquqKRhISuf/7geOiuECJMBcStIIrozVCu6B7f8XSuoC7oWgCtnH59AaCsFBLge1iubR50BnStMH8Ul0yqap6JjcSvP7b5A5Sojqa5V1ytAJ7T56Ss+KbQUNCzbQ5f/qiut2L0SMiwZNrsbFiypGMVaSyzjG7tARSwOE8YDnizEL8FWlyypJbkUUSyz6Lj3ri8wd735giwo9ro4rizaB8EVlSx188A/xixH9pcTuiwN48IKlyxIxK0TUC3YRJk5/y+Gdro0qy32V8D4UC2TOac8Ey35CrYVJC0sDaswti1JUsBBoy0+TLMDQy08DrT6eS/ycrlGOS1q8atGbS2lDJ396C2HR6UCYS0e9aAxJy3aw5JCVy6kXLUwvC1EHa0PFS4tR7oN7y2wHr8Qvi3M9sZAQS5rSLwAii5gVrhZOi0np4U2Qy51O8Y4gy3HtpwSHi4RHrf8TC2Op7pCJy73Hrj4jS5cUMUkSy4oMa046S2K4shkLy45Fo072C3vz4v5SC7lJq1Ffy4hQqv/Ni71E70QmC2qq6FAVC53FbUNVy64CMI3WS409cT5Fy4LwbdAei7d/8RPVi6m4rj/li4FFMETri5zJLj9pS6cHcVjzi0LpsT8vi7yGJA62S7XHccB1C7cF78SBC+KMMH9Cy9LMMIY8y7OGKoJ6C50DbIE4C6t+rMExS6a3MNaGi8UG8cWLS+0H5sHLy+SH7YPMi9/GZ0DTi+2LLY6Vy9xIJ0P8C6gz5VZWS82FqIPji7bpbU5ZS/sFKc6hC+0ILz6nzAmZ8YSjS/yD8UDpS+/HsEQuC9EF65Dti/2FMUTwC9HG4o8vi+zFpI5wi+SFocKyi+OEq8NvS/2Abz6IC/pqMZcXDCrTMIKwi9U5MdJBjA9Fr0T1y9y7b7z3S3sjcAyGTAHF6kKHTBRFrsPHDCEE7kPmi8Wp8E8VTDx/6xPHjBMzcc8IzFkW8b/dzBw+8P4JTASwLD1rjAcFaYP0jAwKcX9vDDrB8ADsTBr9sH5vjBM9LFmvjA/87VYnzCr1aI6MDGvOpxJZC77i8IVDTF6F0dcATFzDpwKHzE8+5T0/DCJ1JE6tTC4sYP6xTEMTLcTwjF9S7BASDFrAbb5dzFqHcb9czHNFsISczHKEZwHWTF8/LQQojCopsI+oDF4FrAJpTGjFqcJnjExC7gPdDGp65JBBjKxRL//lDHD7q8EyTFYEbr5qDGV67o/GjJwNsciAzKyKML/MzG3p7leXzISR8QBSzKsPbYAzDEv3b032zEG5J5gLTKmIJ354DF3xKEUJDIty7AWkDLaD7kPgDLp88X6VjI/1MBUMzO4ULYPgzJ05bwB+TJUOcc3RTI1uLY62TKlELgLwTJg+5b3rTK84cFYZDV4c7BM7DNQWrpebjNYLsQOajO1LL1DjDINq7UMITPr57sliTNQNaxWwjNRRb87TjPv98IlSzPH6MIhUjIgm7z5RjRZXp0BhjPmCYEbqTOoDJ8AzDPLGrEMljPw6K86DTSQPMAGBTQyNKlUxDP4B472DDSsJ8cWczSWTrwCATREFKhu0DNczsQEETQ/+J8PpDQwS8EGJzSRA7ditzP4s74TTzR4A4/22TRxTKH/ZzQ/ELMHbDRvDqYFaDQQC7dJajSqAMf5lzRjFcP8zDQrL3VbdjQy6MA5rzQ4E5dFfzSn6ME0sTSm+Lv53TRlGLtO8TQPIsJCKTZWacckATWgI8MAMzXjNa0CYzUGOMYYEzVwAqFU8DX1VZY3KDW26L8ZrjVTPnwgTTVo8bgwUTUs7qkPxTVqOo9JljXN9ar1qDUGAcZM4TW0HqYJljV846z9bDbeU7H80jUE+sRItzWi2q9AejRulbpb0jWV38FIwTXR0sZGhDZhSa8TJTboFaf9fTakOoH2iDcqabn5BjZR3b4G1TUaurgZHTaKzaNITTYw4IFXRDbP2sFGqDaEGq8niDZi+bL9uDYJHbYFxjaCIrsDvTbeHsULNzZ+ua9ZuzYWDLcTpjY97sckujbF+HcHPDfJQsAZ0Dau88L9/Tb6DbkO4jaq+bIaTzZErqgfDjcuFqoT0DWUmrY89TaN85z1kjgzaMEkaTfRFrNZVzmucLAcWDd2/MUbuDe7NqsKbDd5AcUnWzcm78BXrTbWpbRjhDcf76H6mzdj98U5sjcRBKFHoTf06IT6rzeZ7Z/6Ejh8Lq8NTDhqQTQw8zdVB7tSOzjMMMcN6jdW9DX/IDW3isQ3MDghEL3+9DgaWb5p6DfWzMI8lDjbPLtjEjiv2bD6kDh1L6NMvDgHOacltTj/L7n1djhF9oz6eTjG7Ls37jhuOrwGwjhsH6035DhLMK8QcDhgzqo8xzd0oKpMvjixA7cYrjg45sciNTl0O7T3gDnWUbb/GjkNKsIDzzhD7Z3x4jh97rb5xzgU2cf+ZDlZOrwH9zjM4af9MTn8C8P5KDlp/8D5Mzl1/6j2xjgIuLoeZDkKBa/3MznF3LAotzkrNa5VtjlKLMYCeTkI9MX/rDm4GK4fiznG/8D0gjky7LX0ljnm9Jk5rzm8/rE5rzmY/Ib2uzmgAq30zDkHCVrzATqvKFv5rjnc578AfjmSx8BhGTrpMMYIyDlQ8b5dsjqxWblmKDr2KsEJPzoHMbBUKTqLGbn6PjoyH6z3GjpnBKT09Dn+48UYRDqTFrsAUDqEGMJhiTrEI7r+zzr3OshCJTrGxcQNWjp64nkxjjoa+8JFvjrYFcYIpjqLAsL0njpz/qdeWzoOy70BAzo4rLI8zjp1CJv44jquBLr2JjvILakUDztxGp98EDtCGLr+3TpV4rwABTuU/2nzAjue9aXxsToNvbolSjteGsAAJDu9/bf14TqOzZJEXDtYFL/4Jjuo5nIM1jtoTcFhSjtc/rf28zqwvsRRbTtbBbgDYzvp/cZdojswIrj7hTt+DaD3LDs7ybtJlDsgDor2lDshDr4CODsHzsJAmDuQDr4Hjjt197/zkDt396nxnzsf+aT1mjtW+LIBnztN+LH7oTuZ93fyqzsZ+bUO7ztKJsP8xTtL/lz16zs7GLwN5Ds2DZg57DuxD8ZemTv10MJDBjwRHn311jtg98HzMzxdK7kb4DxvXb5KMjuppLc+Fzy5CsX8Tzshp5AxUTyMKccJZTzUJLP3ODxO/JHyMzyn9sfzTDzcBaT6Cjwz17YbPjy+9aoHWzzv+sgQrDyDF6v5NzwcxsP7lDw9/WX0lDw9/Zsklzxl/q30ADtuk7NDozx6AMYSYTyLz3T5aTyZ0bo34jwYAqxGgjshl8Jm1zwv4MQGmT3OT8YKfj3cRroB2Dyzzrb9Cj2c5cEAPD0U4IwcpT2AFsj9qj2KDcI0nT2pAcYuuj2aFMECwz02GbsS0D3EE7b2Ez64N6M4gj0O0rPwrj3s6ooG3T0tCbUNCz7wIqs80j1A8mX2+D0u+scmlz27vbY+JD79Eaz8Zz4ONahhfD6tN5VDZD7GJ706Oj4JDsM0Sj2Eop4MTj5YFLw8Qj5KBsdRvT1gt5IKJj5n67s08DuPjb8kTz7hAsc2Mz5V38QDGj8sVbQBsj48MMdgFT85T64Ddj5P9bf0pD4nFL390D5EJ6T/dD5P4pE7pz6jAqlSmT4l88cGZD4izYBFMD4fsKJCGz8VLcUIAD/WHKAjYD7ltbM7GT8WHMb2rD58yr4+xj7uz6v3ED9gAchQJD+ICj5vQT+xHLk7Mz7boLH4Dz9C779bMz9w+cRGoz63rsYnXj+GDcf8bz9iEMRC6j8zTY884j8AR8VJFj8tx71apD/pJKr9XD/a644TVD+F38dCMj82y65C6j/sP2EB/D9UQZxnWT9f07skFD8ltbYS8z/sNHP8zT83EsA1tz+cAsUMLEAgRMEA8z5HpqY/yj/JALQATUChRcdXjz/TzZ/21T9p8q8LNEAjLMcEAkCh+6NJwT9hwcNA2D8cw5VEbEC4DZkJRT4jj7r8U0Du8K35nEAAHLL6OUDGz7xe5UAgPcQSu0AVIZoxskCjHKUQJUAqt78MlECf2rBQwEB29rT9K0G6NrgP4UC1B78+4kDqBb4+4kCP6K0OxUA/0r/190Bv8cQWxkHRU7hBLkEK+rj5F0HD6qYD1EDkv8YdWEEAFaD290B/zcMBKUEi37oEFEGu1cMDSEJ2XbdQPEH74MJiXUG/5LZksUGOH8ZhQUE0z8P5ukHfIMEMl0GNA8EEVkEFy6/6l0Eb4LsAZkENxLsAs0FD671FDEK6IsNCvUGd38AaMUJ+LsJjIkIlHMH8F0EVosD/QEGbp7BLJELwFq34H0I1FKL24UFi2cFAyUJUVbdQzkGdxr1kG0Kw9rD0WUOVYqoB1EHUsarzkkJ3GcUNLkN8V65tpEICIINgeEKu+sM4u0LzKZ49o0I+G7QajUEYnrD8sEKyE8XzvUL1Frb4mEKB+cP2o0IU95VPzELZEbf/xEJG/78ewEID+ccFfEPsU6IA7EJ0EbAZsEIs48VPt0K65cc/zEJ+7K/8/0G5oq9hCkMjDrgG3UJe6Mb2EUNAB8Ak8UIHzp8860NwVMYkJUMW6LJO0UGxlbEr8kIpyMgJBkNVyrxE3kMETLgZDEMFy8QIPUOb47z2WUOm8rhKkUPWFMBgX0M+4sP3gEPg9LX1jUPQ+6xgf0MVz8L8nEM/1X31zkNC77//BUVQZMckFEQEIHpiBETgEcgkqUNxz7z1bEQYRqx2skQMUL8OxEQUU7RbCER35mPz7kNz0JI0OUSIBqEKS0Sb77RKe0QTCsdJQESg275dfUSo/sQhRETMy74+E0TVr74OM0TLtcc+vUTc/cQEQUQPtSAJeEW3UsU4E0VdK7wo3EQiBLw+1kRsALRG2ESc/7xSV0VlQsVWJUW+HJn5+EQ7+bD2TkRFqsMAkkR8u8L9BUR5nL1aH0UA9qX6H0X/9bn8H0X/9b4kFkUp58JDAUWr0aL2MkfsbsFYF0X30cH2XUWq8cZSz0SDrcNMxEUoLsQIp0VrELQJh0TknLg6lEVh7rJMeEWC2Mb3qEVm9LlSvkXnBsQ7TEWOuLUY2UVtCqIAwUWo974PqUWy3p7yjEXbzcQwPUUmr7RB+EUhFLxCs0ZvV8Y1+kVE/rH4NEcKZsZHzUVz0sD2QUbaJ7X/wEVkyrU8kEVMtr4gN0gncboesEbcUMQkf0atNrZ/RUY0DsVaREZEAcMAA0Z5zLlWrkVxrMD9O0ZY36P9JUZ50b78gEaX+Lz830YFOMBR5ka/OLT8tEZSF2IAd0Z35cAzSkayy7340kY4KcIA/UZtPKlJiUYP7cddhUae5JQ/N0aptJ//vEYR5qBFnkZly8D5t0YC0rVGEkd2EscD+0bi66patkaSwoH6SEcSDqbxqEdSP69YD0er1MBETUe0AML63UZtu600iUcYGbQDdEf38rNbN0iJVKsEz0e9I3xUUkhOUbc50UfPEqJFwkeXBcX/9EczKbpXTkj5PbUhDEhWEoYZeEhjRbRDDkkZYLL2Bkg76A0A50fQ07T5RUg2DMb2LEj26rcEEUjJ0sYcF0j908P1Skih8b/9aUhuC6lUU0h867b+gUhuA6FCdkg087Bsi0n4YbL51UhfLsBNlkgg/sEQKEh3tcNbBklrO69MakgPyrX820gLF8T5b0mLVLcnwkjF/MH6tEh36rj6VUgYt7lQ9kgTE79QaEgEsb5brUp5baNRKUnyHrX/CUk8/8IXPkmQIb9X80i158JW3EjF0ZXzYklMMIwG9Ejp0sAI30i1vbIbC0kgz65SkEjpp4MMY0nrC8IP4EgFuHtI3Ei+s6A3MEl6zMcKHkcSjb8MLkoWU54ztkm9EqYSeknv5L8QDErPQcT91EkWJMEihEk946r0q0lm/roKHkpsQsRAoUni7pdVn0mc3ZJn6EqzZMBPPUohQKwBIkrmL8U0yEn84sEEB0ooDsb840ld46cW+UkI7K9G6klg37b2+km/55/8fkodNshJJUkUm7n6O0r53LoVAEq2uq1l3VHCe7BhekofBcc/tkrdFsBjakrc2733a0rM1lf0Ykp9z7D3vEoM9Mf8GEtwIrM4GEtAGcZhEkvPFcEkHku2F8NkAkvd97Rk3Eok3L72SUu5KcYk+EpG2IhnQEv/DMcHLkv5+a70T0uTD7JTZUtBHZAvWkvpEcde0UrmtrJgNEsb3n38ZEtu+L5NVUvF6Zn5xEsHMbw2o0pqn7NUq0sQDcJb+UteMMVaYkvKw7QMXkv8wbwmW0t8ua0HPkvXq7v62kvx77gDDkygCsFGbktLr7P+J0yoFro9DkoNj7oD+ksZ3sD67kvYxcL2KEx32mAovEzrN6xXpUwDK6BL80sYtsc8sEwxJsIGe0z6+a09PUybx6r2C00kSbpkZEwe3MD34ExQIsQVsEyT/7oRgEzn2Lo8xkxN/5kAfk3QVLRAvkxN4sT+Ck37Fq9j1Uwb28b2lUxpurJKe00vQ70i/0wA8MJaR01kI8Nd30wHzMf42ExoxrYDQE07Eb48Nk1sBLdHL010+sFeM03b8cVbNky+m8AYOEy9m5A+yU0jSsZLgE2sJ8Bh5UyAvaITMFA0da5jM02G2qb1BE2+v6z/ck1YC8NgEk2EwLFdTE3t2ZL2Tk2N2b1J9U1ZRrAEdU3z8MZG300kOsIKZE1c1Lj2jU3W6boEUk0Wxcb3Sk1gvcH6RE1au6n64U2FF4sGnk3Y3qlmnU1a2KZgZE1XtcdCmk2BycP5qE32y6/2jk17vb9Wtk0+y3Vhc05SQMITPk5DH4oUHE7lA8VAL04oCsUf/E0T3a73/U2D3KD3u06eTrokBE4x2rY5603Cy6b6IE6v6MAV4E1ywcT5+k2/y7H39009yLUAlU5HNLJAkU4THbFbZE6U67o6lk5AAMf8aU4u28RiqE1bn5UvGk/KScNg9U7XObNJ1k6gI682pk5+98MVnU715K7+VU7ttbj8B09OJ8IUak/8Rab/wU6a0rn3Gk+YELYGPU+IJ5A9105r2Lhb2U400rj2DU/26Lf98k5U1m/8OU8xDa48J1BeYb9CIk9y7MIZQk/K98c3D0/E0rdAdE/PHMYSL08j3ML6y0+GRMH6fU/KC3r7mE9/HrQX/E+kRrgbpk/fCbUN1080LZoTfU+Y5r4TrE+xDJ5Vdk8r3775aU9zz8X24U/9J7AGnk+R78Iil09+38b790+zJ69CWk9yt7E/pE+K1rz89k8TEaNM4E9L/b1a5U9D9cQc4k9R8cFh1U9E08L1+U9C36sN1k/OyLn3UVBMGLlD3E9rwoNaX1C5ArUNH1D406Y3X1Bf88Ug/08ftcQ8o1CCFrUDkVCtBL0S0VBZLXoC0VBZLWMBF1CjssddNFFLT8ZD6VAILLc8l1Bl5L9Dj1Dc3MQKwVDLBMP/rFBZ665UKFGtQb9dDVFAJpdcuFBL4KEew1Ce3sMaxFCe3sQkrlBTzLz9Z1FdRcYN0FCW2cI/K1FWCMUkOE+Ej7xME1Fk68D59FCo16b6hFHYMb03SlEo+rIaL1H748H1oFEvMawYAVFKta1U0VGINsFhT1FFzqP7rlEiGbBd/VFzRL08MlGOusH9p1FuBzsZeVHu26f6T1J/U64EkVHj2aL2kVHi2aUk81G8IMVejVEZzMP3eVHiusAn2FFL6q1d0VEK5MZFrlGFyav1ulHDycH5vVGXycL8G1IrE8JkD1InBcb+JFI0FL1ixVGPysj+gFK5R7UA/1Fr8pQ9XVITKZ1D9lIXXcZGAFIzybn3glKrJLZckVKyIos3RlKH2r87uFLbJ048Z1KZ16RhWFK7zL75dFLT1pUKTVLCv7Au9VJbNbNeb1LJxbNC3VJTGqxXllLp3L71hFK3zMMS5FJQD7YAllIKysX6HFOFL7Jg2VJf9rtS1VJK67ATtVIByoxnxFJnz7gk31IOysX6DlP638X1GVK+mJQ+MFOp7rscNlMd26L9GFM7ybH6HVO3vbT4YVOT3Lctf1OA57NMbVOm3IVKQlMNvac/lVPx8r5Wa1Phzcb9e1Op0L5g5lN7G8dDa1MNvpj2alNdvcT421ODArL5ZVPHr71D3lM97LMkZFSlQ7pXLVQQJq4F21Pk4b45alNFqsIZoFMruMVBDVRI+MIY91Pj6sAWXVUfablV9FOlzq8a8lNMxo8+f1PcocL+LlYIcbn9BlS7yKL1GVRJzLlFj1RHHLf+iVSaDMQV/1OvssD3GVRxuaXzJFSXu5z4TFT6zLv1zFR0FsJMxlR235srEVV+F8dYbFSCrr5OklX5U8IXCVUpA7Y36lTc1KkJylQjwrf22lRFwbH2wlSntIj2rVTsqcFd81Qvv7NMSFXF+q1IK1Xa3rFDf1UcJMM9eFWdGLxPBFX3uaD2TlXW5aUEmVVnF8f/jFXwBr8AKFWyv8f48FQ9qr4iPVUdyLUXjFUG/qdZvFVRA59LIFWAqcP79VWHJ61DRFXWqbNonlX6ysYIelX9ssT4ZFWZpar24FXV0cNJ0lVAxbz3O1anErIA+FUcx2rxdFYxIMdjF1aI0bZy1VZASasDHlfWUsZTtlaxHrYlK1YOuMZIO1Z5tLxQnFdhYbc+oVbF4rgGrFZw3XgZhFagv7Ba3FbC+546MFdGJMEw71ai5KD3BFfl6MD2yldIUMQ8Oldh7Lwd9VbEusD5CVdAwbT1BFervJzzBleuvF7zgFcZGb4gVVee7ag5Ylfz9Lg1D1fUu7T0q1ctKr/8zli9a7w2CFc9sL8M71bSqKkZvVZqnp76WVeox6FhXVfewqgKUlcVu8P3s1eM6a5Ad1eqvcIjgFi4VL8JAVn5Zsdcu1fyzKn60FdYzLH13FeHzcI91FefxqFGwFcsvbL4wljlWMA1vleduLtgRFgQDYpY5FfRvsP091gfUsUXmlgJ7sctC1iGprMF5li1JrIc81iBHcNDlViVzb1K+1gpIsf/oVjey6ENZFlrPZxdkFmwS7sGIFly470ulliworBFOln+5sE/Iln+0KpXIFkdzLT1fFkSGsYKZ1lG9cdkZFmI2sUWGVmOrcf7VlkKu6r3s1mr+r4baFnftcQA2lhLmrj941hPmr/6n1q1X8U6CVqrJ71U4Vn9AsFb8FnCCrI4VVleq2BMw1kT38AD5Fly+pP/yVnO3bZYoFickpcXFVr/Ebtg8FnF6scKCFpV+r0NxFktw8f2tlpaVoYyFFot7rxH7lkNxLr33llvtrP3a1o1FMYLQVmdl7YAAFnOkZ5FdVoj8sgZTloQzsH37VkhpMc56FnyoZBDPVqAtLEPe1ulXLoK7lo/IsEQglozwcL38lq7GbddgFrXu7f4kVplwK73L1sQNsVCwFpE0r9Zn1ocvsf3JVsSHbdL71op5Ln9LlpRnLz/gVvLM8ICU1vDBsRAYVvx/MMACFtTtMAiT1vAyMf4TFx4XL8lqFntjMA9tFtqCccfo1um9MH/J1zyS785o1vT2ccWe1x8W6VG7Vu7DcUFgVv5uK9PUVz3SsVGJFymLsZDBlwcCJoAtVuDt8P5nFuBras8mVsyrbX4OFzABKFIEFyq2rX+n1wvQbg7BlzdwpkGSVzG37ArclxD7q5V91udpro9ZFz21aw2dlzKzZU4gFy9xrQAVVwAtLv3v1xU6aw/b1yMtLP4jFy7v8BjjVypvZIqfly9tIz2flybtL74Bl2IHqYBA10IEr8XqFy1vKkHolxtusX0BF3VBJ30ylxrv7QMjVwDq576GF239aUyR1zmm7QARl3RGZRA2FyZu7v2SV1WDr/62lx8tLz331x3tKv2FF3O0I72ol3mKJY8GF0lubP0OV1Zw5c0hF0X/cBCTl0sy8L3rF04EcQGpV0gCYYok1287J42R10ysmMCu11O/bYCg12GvpMA8V1NCJ/+mV21vroQvl1cvsEhol1Er6L2G14b+7b7rVy0j7r60l4fWMEQkV4vPrI6nF5xQMdLm168O8dLMl5i0bQ0Ol4a1sQ5KF6pxrsDUF6Y2JZMrV4vLr8NL16Rv60Drl5KKMY0gF7L9bwJSF4kxMj6UV7UvbH0Zl/gW70z+V59K7g/t17uyMNagV4Jrr36Ul4DobcZ/F5G+MgosF46u8X3Ol+3J7Q8fl3vjsJgb1/lQMFBYF8sOcUVLV90CH88Rl+IELlX515rvLcPJV8P5sFPdF/NLroHM1+i2KwG5V4rqsL8gl/KFbQJY1896MdckV8oFr8M219SRIALJV/VscAcHl/BqZL6ul/dEJwIWF8Ftaf56l8aLrQ3c2AuYKlbxV8P6cQfHGBsO5UadV/Eq631oV/susRAP2DeLcMAzF/TvLMPA2BVxaEntWAzTcEBpGAQQ4wAfGDGIrr+WWBR/79F5F/5q7MZfGBhCsRCPGB3xLz49WAERcYbImBNqcJITmDItbT5fWEbX7JaM2BSnsVhKGGvNqQ+D2E9B65JvGAFvY9IbmCToZYI2GF6X6odk2FkSaIQa2EsKrk1YGEsD7X68GFTWqYVkmEvMMYkj2HfJccnqWFaH7I6bWE626Rfi2HJ8779a2E8wmljoWFt7sI4nGHv5cEA5GEILMZktGGB87o8AGGvm6f36WC/mKIkw2HR1L0L0mK+Z8cKjGJaV7Iic2J2Pbf4IGLr48E692ExwK8NE2IryMj6DWLAvcL08mEkrIj10GKyULVdOGL6wb364GLUTKoLAGJgp5X2tWJBMcczjWJKA5P9tGI/FbdPaWKuvMb9gmI4wcT5S2KBq7wzj2KGwrX4HGOVQscCqGKGysQxaF8shrkSimL5sLU792L39rVGxmImya1C92KR87r7zGLLyqUbWGLanFwARmNLMsEkCmNH68Q/WWNWNJED6WIMwbJkA2P3x7dG4WIrrp5h3GOiULpgCWO0q2oKN2Nmt7X8eWN86cJNvWPpMIBdg2P57qk3UmOstsQgo2Np8qo3EmNQnrgZ0WMT26hhGGN9lbYBGmO3lcT/4WP+w71huGNAp6o4+2OEvsE3YWQ8JaFJ4WMNsb4LH2T/1qc37mPEsXD2g2S5+L1bSGRUqMc/GGXaQLk652Sw82NW2mQ64KdE72Re97gml2apc51YhWTmp8IJrGQWtLH6DmXhDLkkEGWlC8A+mmWvWY0TLmUQ/KUbMGV+4r9gdWXdL8Q/MmXfzKJWM2awZsEcm2XsMbhbUGUw2rtRIGZPY6QuZmXZ6cRIo2WqIJ1c1mV+SYEbHWVwp8ZC0WQsmrpArmXRDbBSrWUREK4/EWUkocUAWGW8trr6dGVzxowVr2VR/qQGmmWt0sYPm2U1zcRNZmUArcVmSmQcjbgbv2Vp5MEIMGYGSqIAFWbDM6M32mXH7MZajGXkroBdvmUxxrc25mX54a89O2ZZOKo78WV838UBI2aX971FVmbtMrku/2VPurL5EWYct6/2hmZRLL1fnWURmLpdA2esX8ZbH2bEq5gAlWZgF8BLnWa4Ca8/0WY6ObUNk2YH3MBDm2Y90r491WacBqdPqGarzMdDi2bPuZ4Kgmd3YsBEomfBZrM+nGats7oJwmaUwrs8FWdg/pNPKWee67D3ZGd7LMVgd2eKOL45UGcRDood/mbIqKP8Vmdz3qn5BWbkjLH4vWehKr8HgWf93a0fPGeKrbcMS2eSrsNBxWfwE7dhbWd6scj5RWg/UbRh22eC2KkeJmjPIXwwxGdcs73+NGiKCcJiPmjLEL5ZP2iKAr8UomhzQbElCmgbp45JRGhawLz2EGn2U5ERX2h1o30Qymgey8dKQ2njTKQB4Gj2vrH6OGmxIrcNPGjQkro1Jmnj6pk3A2lBvcFAYGn8JJNJVWl69LACH2lOvr5GL2nNvaRIGWl9q8JRDWnEpr1PjGl5CMZj52naRrUEYGqlZ8NEomkf26xJLGqoUcY1wGn45K1ekWlDt8b3pmmav8D6B2q0DMRDwGmMuMEAQGpjOrIbD2p60MRIWWqyEbX+o2rLULtXG2pmsor8mGopKsE/dmr1zLQSs2pwC6dg2GpmLbgnKms3H7/1e2ukTMEcBWsTqsYPYmtC5sT9cGt33cASk2ts7aX7/GsfMqIK92vWF4r/w2uivLE08Gug575aEmw3Dp9XE2x5/6L+J2wEEVP6y2oUi7wBd2wL9MUBQWxRtqv5dWzG7bYVqGwxNcRNjGxv7ow8NmxnorY6m2wI9L9OVGx4qL5gjmytxMdKWmxSnsMB8WyQBsJGwmxurcH8HG2fxsVIC20kt7YPD21ltsIISG0ZxJIDjW2vKbcAEW2cobMM3m2YXMMHmm1sIccooW1NIYgSom0VJMRItG0IPYgBoW2GE7lgbG2wwr5bG21lnIX8u23cIMMezG2H9LUSH27URMg9aG7FYccM423F1rcOs23HqIdcUG4bTchDLG6wG6kbF24v7sgP8m2+xMf9N243HHNFN243HJEk+W00sMMc8W/Sd7skJm6+saRhDm4FpL8DRW4qvL9km26iOsIgom4FO35f9G4/Xa79Ym5MsKL5xW45MMUIom7FxKpD9W70L7tG1W41+sf6MHBpdbUW127yybcPJ29+DL5hv27boK75RW8QMKgPPW/29b1bTW8P6JFYG2+yrMYTn280NJs2AG+3lpYVfW/R05xXbm/1sb1diW8HrqYeHHCdT6sfBHBbN8IEn293rJES528b/LT96G/R1b1V7G951L3+DHAZ/7H4zG+9pLZvLHCt7L3+VHAMLsUG53Cta6s5Y3AbFLpkknB+OagNf3A8DZL4PXCcs6weWHDpv8H3n3DCMb0BDnCdmagCdHCMwMU3W3BGqIX76nAuUbMULnDel61khXAova8+fnCRrMgTtnA73rFg2nDjCbE45HBNDL8D7HC9x7h/KXGc7sAf/XAlrqFhSHEE2axhV3H47Kp/IHFKq7FGnXFTTLxMjHF5LacwS3Fru5ISnnHqNcQiUnF5rLoehnEA6Kw3bXGTrsX4+HA1kJheGHJWYcFOjXHVq6ZYH3J1XbJImHFbrMZjp3HtsJ0+UnI9Yq9Sz3Fro7z3cHJYUcP/UHJwJbsKaHK1QbMTYnL6ILECX3LABsJGQnJ50b8ArXLeX8h/LHJSpKr4QHLJq7gPTXJspHfzZ3LeqaRm0XKiK7X9dnKhpMIAgXIKpar5G3KJjsf86nLdGrtD6nIvFLs2/3Jn57kG+nK4uXU25HJApLf67nKcpLT8A3NIr7T8/nJwpKv3UXM3/cZgPXPv0sUBa3P/DrcBNnPJqsgQtnKPjbo5fHP56H9LgXP98cRAzXJ2jaH1w3N4UL9DzXNdVL1Em3NZ88IJi3ORz74CcnOiq8UAv3Ob+8ZYLXRYY8Y7MHShTbFRJHSoMJE+QnRsPaf9AHSYrrUJLHRc47UcN3T5/Lo5UXRv7L8xb3RnMME8LHRNrJA5k3SnL69CjXQyI6IANnRtm8f/kXQMAcUZWnQTqMZpn3TLCMNXfnTwqcZAv3Qvy6U90nTOt8UKPHV/ObAkQHVUM8hfYHW/QLpYMXUG0MAWPnW+6MVhSnX65ZhBe3XEN7EOXXX568VabnUlBatFVHWzwcP8W3Xzw58GdnWtCK4JqHUvUG3/qHV4/KhhvnWyHKAD/nXSV15A6HXt77s4+XUAAMZJInZiNsgJOXZuCqUTInYyvL8ONHYVzbkBR3Yw2a0VZHYy2cD9j3bHArw6fnY5p6U9oHZdw7IBi3Yzm7395nYRI8AD/HajM8Fa4nYR2LoEDHdIP31EC3dyPcVe23YhrJNJ2nbnp7INFnf40cMCZ3eK36IBkHcsurgKknc4qqUhr3fmwMNjmXe+pLT9x3fn/7n/1ncwHXIH03d2C8JD3HfxFYUAwndMtMJPu3c2q8H6CHjYIKVjJnjsErdITHhdRsVAS3jP+qEMZ3jbArNbkHjXLKskkHjXLKAjnXgQL4lUu3hONqkHsXhYAsU+xXj86otDwngnpMcbFnmTCJf9EHmBspP3Y3nXPa47fHlL5bEZdXmSzK9XcXlAr8IAlXn5DpQYmnkAArg4fHmgo7H8tHmP8KpdxXlBEMNSwXna5pgMoXk9mb0D8XltT8Ek4nlnF70V3Hm3zLQ733lRysVc53kFpbMeDnoWqbb8KHpu7sYdGHpmtMMfTHoPBK08gHrcV8MVf3rxN7YAaXpQw7H/nHrrFcFPmXo23cIEwXpmPcYduHq7+6lcwHouGrw/6nqZYpJhFHveVrse+np3q7JA/Hpcq7IdEXti1sMfEXtj1r8fKXvf9MZSKXt/xr9eFHvFoMVDLnvK07BeMnuy0oo4T3tIxrgHcHtaBMIbgHvjF8b3kXvqTb49dntP0ccwgnvUsqX8vXuWYrQ8i3sfurs+l3uhvMBjyHuCJ8MNt3s/vLUPsXtgpoD+2nsQ8qf81XtC0ME95nvV/p08zHstqcP76XvZqLJDAnwZvLpKJXwLPr0T9HsQlL8VK3yRC7heDXzVn8c9G3wTqLL/NHw67bsfWnz/orMwe3yXzqf8lXxeHrU6oXykMLcrkXxAs8djmXyzp61FuHwmLcEZrXy2wrwkwHzI0bRY4XzsXrZMDn0cy8dXEX0hp68wSn3n5ag6YX2+C6sKe31JCZZahH3zQ45Gdn0Gv7b5cH0aoY0JrH0dT7VMmX3/qJg2mX1nxqwnvn3zrblk3H3BHKMh2X26C7cB6H37oKhc+n1QFMUR/3322bFgDX65FGcFKn6tMcAbKn5JpZ73NX4hnK5UWH6CAowhTX7npsAPZ35r+L8/bH7Cv6FOhX4m1MQhjH5Eo6z6m371rr0EvH7Hz5365n5dTG4ADn9v27Y0Hn8CDL04G38CpsULOn9AFrwGOn+B18ZaSH9+UMRCSn+c57P/lX8wp733sH/pr7r8yH+ApL4K338rL8dF7n/CkKz9/X8yBbgAIYAl8bwuJ4BoCaYHJoAL5LX0SoBCM708X4A3PbQPd4CZncX8iYD2pZ4QpoCnw7IYwoCEHsQNxIArpqj80oDTnrcA2IAuk7BZ4IBLqcdk7IBrDJk67oBfbcM8OIEcpJkUY4HRlLNOb4H0t6H3doHBurcAe4Het3L5foHV3JYTlIH2wMEOlIFdxbv8uIGyAsZDyYFCCMEVzIHV331P94Fv3roDEYKGtZX39IE0dMhhGoLKJL9UKII2Hb05MoJ6psYRKoJibrITYoKjyML5YoKYDsQQfoL5vrZVqYJc4sM/sIJzrHjzsILWY8BHvYIcUYQEzoIO53L614IwFbED3YLTOb9d54INIq067oIEL69EH4NZn5heG4OlS8NOHIMnKcAJQoM1j5z5RoP6pJf2UYPi/sUKX4OUsa9fWIPkarj/iYMO/5MBhYOqRbZjlYN34McxnIPbJbxBnYO2BK5Fp4No4LT6roNNGag8t4O27LI/y4MaqotVtINKUrxV5oPUr8Ze7oP5n7IL8YPbnsE+DoT6rbj6/4PBJKodJoSt3MBFMYSjzbf8OISqyML8RIRUSao0UYQdJbMEeoR978YBgYT2zcH9c4S/UMNhl4R9N685toQ7pqv5uoRDplPyuoRDpl3xtoTUtqr4sYTHJq0QxYRQ0bwA3oRIpcgEyYQzKJ9Dy4QmJq8E4oQbrLtX+4SRuJP15oQ7T8BdCoV6yLr8I4XaJLb9O4VJIrsZUIWdr8NdSIW3HcAEToWE6Hv9YoVN3r5kUoUQU7cMiYXHrlpfWYVqYq1hgoXwIroDoIV+q7slt4UumMVCrIWvpcYQxYVqmZL3s4X46J0Wy4VL7MEY94XB7b0zAIaP8rv/+oVIL7k8/4XROpwjHIa63nQ184VAY5L5KoZ4wMIqMYYuIKoAPoYiGq9FPoYeH8RJWoapxbINLIaVY61OZoZNx8MAm4aunXX0iYa198QEd4aZVLskkoZNGMBUs4b4upIDs4Zo2boT0YajAsBg4oYM5sgR8Ya81MVI+Yah9KZJ84b0Hbo5Focix6b8WodgvsRbYIdfumgAVYd+7ccZdIceq63+Z4fx/Y0VZ4fx/Y4kcYeODqwFdIeuCb0AnYdSprYQkYeVuqZBq4ccsMj8wYfC/cYz0oe417tQHIhHqac/OYgkn372/4fcN8YhBYifQK5/G4jpCrQTPoiqr6b3PoiRDb87T4if0MRQSoiTF7JRe4gdq1HzaIhJWcUknIjB2L8514igmbxGdIj8XrldsYgVFMABpYjJVcQbwogvJ8IBxYnxhro9DonutMEHAommz6z+64hbNcUJHok0qsEWO4mSx8f6MIkqJ60obonascZOfIk0qsITcIllup5Sf4ncxpwMkIkjqsUMuoiidsT9v4igdrb/eYk2Hqw2tonjq6X3tImvrpb2tImzrrP5p4lv78gEqYlw8qlgxYk2wcUmmomVT17/1Yn4wrpkC4pXmcZD8Yksr7cAw4kfQ8Rd4onUBIZeJIowt7P99Il9Nr4U9Yl+Nnr53IkQXbUQAYrwTMMLeYrCGKldmoqV+sIKEYs/moxGtorIK6xGxYo2+8dDpoq2XrdN3opaGMc5y4opUK0VDYuVD3g4S4uRuasB+4p3WsgYVYu74r0hx4sUu6f41YvbxL0/5IsHuZz1r4vpMrX8+4vfqscctYthQL5Dy4sVHscXzIsqIL5fBYz5s8D8G4wgo7v/8ItJJ6pYEYy68LNELow587xGRowg360/TYxADsI8ZoxQ8cZZZ4z2F8VXbowg+J8AxYyInMUZcIzuGLQbcIzuGLQkpYzww8Ifc4zANsURsIxTwrU/2YzJqqX8NI1wkMRA8YzRocUDzow9yqsqzoz36LAbxoylJ5wiC43mt8X/5YxvEMJaMI2LrMVAMo3yq60cYI1yn6r8L42o47c0R41gusU/Go0aOa0/P40dEL9agY2k47Q9uY0GoatabY0aOsILqo0y07E5uo11wcQMpY1nDbQju41yE7dOy43HB6pkyI2zOagS74325agqB44M33038o1+MMNR6I2oRrL8VY78tLv5U47Ky3YCZI5UvcJDRo4ZOb5IsI5EqaP5n47KtcMHhY73AsADmo5UB8QH7o44pKMzIY+AlbBCwY7H5rg7z44A+cVVJo9LpLYYQY+Pm7//B4+o+MEZ6o4dTmoB644bTpQHJI8h8ErzII/sIcIDT492x7FIUo9O/scLc4/8xMBYJo8zTpYJao/u7bVbVY91QcU6i49J6alB5Y88t7AEt4+YE64qT4/0ZsJh8o/k3q5g249iD78/8JEAhr0KuI9AVbkALpD1x5NGdI/Yb8IuWJAb96dhdZAy18ACgZAn6rxJhpCM8bQ5u5A0Ba0B1JA17cUB1ZAo/4YGu5C3Tr7/2ZDhNK4Y+pBU+ME5ypC1RacHR5FEqL4eQpE5wcc4NZFS2sINT5H5vcX5PZEBI8FdUpGeM6oNi5H21cMYzpEppMIXwZH3s2vzxpH3uMhavZEKx75Os5FID70TRpFRZbtIIpJlrLj/FZJosq/9sJFDS7oG5ZFhHMEA9ZH+H748D5Kg869hTJJFr8j86JHETaZiS5Ifxcc9bZItxMf8UZIIBbhCQpLCMcczCpIwXMQEk5L+6L4wxpLc2sMByZIC0ZsW9ZLbtqY51JJU7rs2ApNyzLL/GpOKuMURIpNwuLpR4ZJvOsQM5pLCNsY4GJOa5rlh+JKNJMYdP5IFb8U8EZPTGKIcBJPQNrs98pJpTcD8jpRwisZXd5O3xIfzHZMhRmD1dJMCz5pafJOZw37235NNncFnT5NbLL48h5M25q4/dZN3FpdbgJM9HqxVM5Kwdcc83pNOvcL37JPltLX74JMU0aT5gpNyV8c5wpNMMcRhNpQYtMUAaJTKn8BZ35P8MKhjH5SY0qj4L5RIzbwaH5SAGcAyzpMMXKZeHZS+KMUMepTStcD8iZTAvHHzY5Td/bJAYpQqGnUit5Q0ssguPJRpTMD9rZS9vcNE6ZRupadCs5R+AcUMuJQZJ69VBpUhxJH0GJVJwJL0EZV93LL6NJVeuMU5fJXCoccVF5XVFMhWF5XbHsL/VJVv3MIco5Ulv54kR5bJkrtdkZWmDMcFn5UyApwGwZX+2LtQ8ZUOsMZJApYkqkHzZ5ZwxZ/1dpYO2oNDhJZHzGU8hpbC8roUHJaNW439CJfBtsj9F5cAtKg4vZZePrVfzZZWRrVjQpfR6KxnkpjLjKwPLZevI6ogsJeus71WmZc72bFFgpdtA6/5n5dk8ZpP/ZfRrrD8w5fN/sUc8peAxL43SphNocH955ZJbqpR1ZduErwgupenSaMM+JddDrY8EZge5rn/eZe+YrVeT5kTjrD6LZh495gfHZoDiZ5OHZhHGzFJMJjlGscP3JjcqLQRNJgNSagMPpiLQZoEb5i1FcNmx5iAvor2pJhi5cUAtphK28Qex5hgy8YE8ZjPr54Hupj87KMHh5iAMqo/6pjEwr03A5m9v6kSwZh+ErkWzpjI/LI9/Jgfypf/15gwF6tJWpndrK0zTJmHzr37bZnPx6D2y5kEn74dkJlgtMhCb5mI2KlOfJkDDLL/mZm5C8YDvZm53Lc5JppkosRaoZlGCLEH+pmwv6T3/Jl3v54ZKppkvsMSz5m9SZceCJpYG7gNVpoP1q785Jqyn8M8WJrV/Koqbpow9rlZsJqMv7v8uZqUubgDopotAcYJ35q5yMc/a5rjRr0zIZs+uKD1S5vJscQcSZsVtcRB/ZoxK4tOOZqna5xWHZuoH8YVCJt7Nn0LpZv1xMT8pJsMxGv1HJvJTsJayZs8vrxYf5tNKqEV3JvQxsH595tkvrk8fps1RsFdEJy2uZf3Xpx8qTEqX5x8qVM0IJwGGsVC45yYo4EOH5wRPsBYn5ydzL/8IZzUTMQAPJwmP7gAyZybvGv01p2Wj5FVypxBypb2kZw/E8UMkpxZF63/kpxZF8UOpZyGE6okpZyGE6ADvJybC6s8v5yVEL04YZ2VprgRBJ1z3MEAF537zZdR/Jz095MWVJ30za0ADJ26JapjG52KOcFTmJ2IvMEEsJ2BtbQ6gp3R260Vh50T38M6/p1LocX8a50FAcD/X50gGKU6VJ2BJrIkVJ2BJnU6s52MycZPjZ2xAo8Ahp2FFb5ewJ2P274k0Z3n2rU4250b2sL/y57ql74xGJ6D3cBOGZ7h67YEU6Cjib85RZ492KBUrZ5BpcQrgp4Iwp73V55A6bIYYJ4w6XYJN56yKMMDGJ6VQcEcRJ4BIsQhZp67/K06Kp5KRcAcnp/5krdXTp4BNbs9up49yq/3d54qG6Mt2KDoib9ONp+CqrRFCKBEksY//Z713LZPC5+l0MNVap+3prEAeZ5TVLpR/54V78M6Vp/mtLgH+qFrh8X9PZ/az7cCYZ/pu7/+WJ52aWZYbJ/G77pZU5+LFML9jJ+M4cFCf5/S+aITvJ+ownXzkJ/E/7xDf59OF8A42Z8fxID0wp+r2L8OWp+URr4ezZ8n8MRL459/BsZgNqDgycVKK6Dj860A7Z/XN78SkZ/EXaVfO6AV/LxkX6AY2MQJ2aDwpLM3UaDN/8Bbh6CU0br5R55Ydb8oX6CQI6pag6D5AqA+V6BxOYk6uKAM3IRm6KAWvaj46KAWvaok8aCZxbI8QaCfVcYFjKARMrs9yaBSJqNKUaExusI3q6DFQ6knKaEI1Mf8r6GZoMIpLKHi6LRedKFJxsL4iaEJw8T6kaGbv5f29qB6RL0AS6FeI60ZHaGWTbU5zKHVyMckAKJKsbxEfaFnJb9KhqG1I8NK1KGN2sI/i6JWnMN/HqKwupL9H6KuusAILqLotYc3R6K3wKr2K6Lb46P8JKL8GsVbd6LA2sREmKIt06wW86JjqcH80qKiu8YMAqNPqbH9IqOJpatL2qL/xLMiHKNgrJcFW6NUnnoAgaI1LcdbsqIGB7dBkqJ6KbUB6KIl4LtSz6KHAL4KV6P3qbr6wKJhL4g5SqPqu5z8BaOo8nP6KqMg1Z5CXaP+xb36RqNZ/8VamaLHX7IfRaNCHcA6bqOCArAgzKMyxoLz7qPXu68e36NJu78nHqS9qb8cJ6Sjq6IL36NvzItcwKO497w+B6RywIb2lKMeKrs9vKMEAbdHHaSVy6P3qaTbnsU9CaMlZq9SkaPkSb8G36PWLrj8ZaSHx7j6PaRp7sE+TKRS8a0agKTqyKUA5aQ6pMBiBKRKOLtfH6QTK70isafhh70GmaWhl7v5BKQ+WMf/WaQoNZ0SrqMpZn4D2aS2y7r3BaQVWsJMlaTxFbNjq6TUMLpUOaWKvbVoBaU66L9dbaTcU4RFFqWeArMN8aRkKY4Qc6Vh6MM/86RIVsVWy6UH5LwKf6USOq9f2aUJ6Lv4C6YFx8NkhqawoZhG26VR/rtBpaUqOq8EJ6Yd2LJOPqZ1xXf0Eqaw8aU82qWZLJn5Hqbx8rP7YKYQwKP2K6eMl7/+bqbdwLlafqVQW8I5cqfNk8b+UKb46pM8L6b8DpEPL6b9DpEPKqb+JWn/lKb914tSw6Z3w55V5qaFtboAQ6Z6N7FifKY8DrU5GafNqsYce6bsFsYRt6YX38JCzaYd4sRARKavTMdG3qan1Y326qaN5LgzY6axTcEkEacQz6Y7uKZjObU0KKch3q5PUad8wKYYlaUBbq5eq6aFTcRAzaaOQsEV/6YaNMgk/6YaNLD52qa2R8Qxk6fHyrU6dKcE5Khelaejzqj4Yqf5G6MCbadFErcCsKaIYr5RcqdCGsMM4qeHxMYA1ae26bkNmKdlJZIA06eTA8Uo3qcjCXRG0ac+Lr0/nad3Srv8Eai/B70CTqitzr76Mahw/bn/NajuFY0DQah1CqAk6KhUtML8Z6gTFMAF4KhxusQEFam0scEDkaicE8hLsqiS+rwHR6jlTsZTqajMGZhhoagLKMQu0agg+4r+Dqku0JT+D6lh26b9S6gHWbMCd6jBTsQP8KgfA7Q90KgSJaUw3KlwnrFDCKleBo4JAqmFFbQkHKmb+7EHzKnLpXkRHKnVHalc3qlrqsIVGqm2Mqo8eqlS468A1Kejbp4Ch6n726T8+Kn8qcIDlKkd3bj/lann3bn+kKk26Jk9tqka3MT9XKlfPKUhxqlw5MYA3amm2r4Je6qCo8H9SqllT8M5s6niHLpfHKqyz7IHHaqzz74DHKp01pP0MaqKzMM8talZPbhjCKpGFpIcQKop4sQB6qn3NboT3amJPMH6LKp/FLxEV6qy66z6aaqw3Ln7k6qixK48dard2nr1PKo5JplJr6plyYfzuarU32z5uKp96Loft6sJmcBGeqodNL5Zk6rcJGQGzqoK9LwDRardTa0PSqvWraUOPKv9uaY30KpLBsM84qpXGbI7RKsayaz42apdL7kkQqs4269J66p0Kq78EqtuIKoEe6snysUYcKvU77AkcKvU76kc0avCv6gNCatBS8ZYKat4Qan6QasYNMMhoavW43P8oavX463//6pKU5Yf1auqy5v2v6tu3sb89au7y8ER36ub4pX+Uaycrb3++6tT4p4yG6yQ2rhjBKzg7cIAN6xR3sUBBawRDr4Ma6xL0Lz6Gaw+GK85K6wjDMFgQqzpBMVYTKwSCcc8rKyGxcQQaawS+7hXoKwr1rJDQqzlM6k8Cq0DscMUR64VkKdlTK4gkLVUBq2ss8N1OaznP5z8D61Psq0+yqtwYLr/y6xT5JYC2axJ2KT32KyW178AaK1upZJCzKyw8a0F0azZ87kHSqs2bb0ks61hn8EJu6xpIcBdeq2krb4IOK0O0cY9YK2hvLL5w6zNM75QBa0kB7tYIK0r77RVwqxDPMRXoq15s7pnNq2/+nZesK3MuK4wcK0Z9LsnRq0nML8eaq2/GsBD6q1P16kBGK5Qw7oGMK6suJZAS66VscI6pK10KcIE661U+YM5I64M1LscC67a6sZblqzpa7v6Va6h3aMyqK6Aubf+bq6b23oHqa6NwcVFu637VLlhQK1haMcEE669RcVSNK55OLoYLK7dQZP3lq52AaoU765DyLklj649G48Qua9UnKwhBq+Uyrn6nLDMj5M2l67vK6s68q6B46I8DK/C1cQjo64RMLRgqa7uL7hboq/mpLUV9q7hCcQANq+o3q8ONq+o3sYkr6+qrMAAf69fvKH8xq28a60WLq/1E6QAd6/B5aAQr68gy8JCLq8uNbwKJLBZqLRJiq5JYrVDAa+CTsEAl68y9bRnm68Z9KUK5K6+V7858a88vrch7a57V3Y25K9p2kptw7ALm7tJvq/yALhX9a9P68AxCLBJ3Kn6TLCIxLcTPrClzpv3wa+QO7BbM7Bg6J03CbCPHnc4KLDSApEABLHborw3GLAgHbVNYLB54aEHNrCQH8JgubBdwa0DdbDaB779dbBWEKtZo6/MYa/9ULDZQL8HUrLCkZw/IbENw7oYC7Hg13jxIbHdzZpeurBaPJsAbbCAVsYBILGy/MExBbLfnsX8PK9McL0Pf7FIwsP/RbH58HIBnLESy8UAGLFKQsI+GbE7S7z8GrFES7H+A7Knur8HErJjub//FrLd0MQn47EABsL/DrLF5q5Ca7GqT7ZAjbGVRaxdHLKq470Z9bKPoLL8FLKuAcETmrJptMdLALLxLHgnD7JHJsYYnLLsxcD557LNrMH7ULPVnWJWE7MIrb38SrJaN4o3+7IAyLs6drJoMMcR8LHbW6pJu7JkFr1jz7I0DLJbg7MJrJBeKLN2B7X/t7LBUKsWlLM7z2tFFLMSPMRghbOr8KYc1LNdxbQEerPcEsUB4rPkyX/0nLNOCrsGQ7SlrcZf97PvyYv0arNlQaoFzbO6AbsDNrTHwsdnq7NjKsFgRLSMxLoLQ7TBw6gdV7SXw8UmU7I9bscZKbT44sUo3bMQI7BLXrTCw4xSb7R6xcIJtLSltcb8QLV9ncL6FLQVLbcRXrRA97VAQ7R0Dp/8FbVgsIBgI7RvQ8hPbbTOHbk61LSz0LtfB7X7t7wBwrQU373/gbQ3GrdUQbVmtJdXWbVbsr8L6rRVDYJFabXRusg0UrVR3MRhW7V23MEYcLXmzMdF47VKtLYcn7SiXKwcqrVK0q/6hLX/+apYHbbtrcH61rKrdJs1YbX7K5QAgLUvIL9PA7a+ycUWnbW9L7UBvbVGJME9MLZ5z6sP47UKFK5g+rVZE8YAdbYPy8cEULa8/r8JSbYeEqwHc7ZoH71OzLb15sc85LbD1McPsbdwoMU/R7Z3TcMkR7Z3TcMcO7eiwLEzZrd/usRuErcJ8b0fwrYbM7gSLLej6W4DfbeCwoUYg7fRx78CB7f+ObFMi7cND7df5LZ1XYH5DbhK0LwAGrgdycciD7gr2rEzD7gs2rAzDrhD68dC77d3FIlW77d3FLgkvrgbq8VSXbiN0bweALhTI4AEQrlGnLn+RLi4AcUDSLhe/6hEt7iuvbswPbmfn6lIAbhZNIFWHrjEIcdOrLg+wcL9j7drWb0MiLh23bRCs7g+zsU+7LoBjcVkabgSL6r2i7ihGMgAo7hzD69deLgJNaYDZ7mArcVAmbmZpsD4cLmdr8M8rLj9KL86mbgyN8Y8ELn64Z8XCLm77Z4Bp7m3qcL8d7l+vLX68biuGa9hPrlz3IPz6rhRJLgBZ7kRy8ZAC7nXIrL/ALksLrgle7n617ddorkywbL91LkHsXlX2LnTr4X58rjDQb1e87n+t7Q/MbnZOLsouLmC4cQ3l7mXDMJLGrrOvrb8Krr/t8YEMrn5S79YnbmnIMEMsLkuF8AETbqgtcFGirnUNLokirnTNKP/BLqf3ZoQbLqKscZCMbqH1Z0YELrF+KMXPbq61cgA77kPGMdhC7rjBZ5a27qzqYz6GbqOHLz56LoNr8b8FrpXMcYAdLp4ALoNzLr2ynXzFbqiRMQH/boSuXv25blmVb8Bu7p+/rYr6rrs3aoAOLtyxcQD57rfA70yy7oiJaBWTrs8y1rz07pQLL450bj3ccFa/bpmKL4ASbvV974KgLuq0cACvbphSnc6q7vdvaT/Q7tiG78cULs0F8A8g7sE8LwB07sOyZ1B/bvPuMZCe7uiDcMBGrx+srUMOLunOsFB97vawmAYDLt7TqwPEbt3TqsQirvcEWYJA7wa6ooPA7zb6cYWA7vmYLBADrx19KUGHbx28MFJgry5uakYALySIsIGqrxFvcIAjbv/V7Qk17sYRbhF4rx/yG7zsbyx7ZwEdb30o4xH8rx1y7xdLb1JtrIqWLxtQZH2t7z6CMZLy7yvFrwWDb0q4asc5rvJYaoZRr08w8QJ4bzvIrxXD71+BndF77sLZ8Q8r7yxScc/Cb2ZIsAnyr3vxn0eyb1s2KMwJr2DTMEAy70P68YDTb7Bs8b8lr1sJ4ctgL5wqsI8tb0rGcEAEr7q0qr+2L3ZA48CMb5Sy4JGQL78xqoPybybZqQZyryeZsIf770/HcA4fr4ExsdfAr5wJLJFnb6DzsX6or4Oz8RDSb6zKbs/XL68H8ckDb44SK8B0r5gzr5E6r6UzscArr7bAcZeAr/8zscAy76tCMIZbb/wwKtIzr7mOLNGaL8X2MMMV7+E6cUDmr+txKxjV7/0AMMFLr8MJboUbb8y+rpFQr/yH71K2L7iUI9Geb8YAMcGzr+Vy8E21b/61LNqVL/6NJJR0r8a8oU79b8i3qn+H750bbAdmb+YKY44ZL85SWlb7b8l+cRdu7/vKqAXFcDB+qUWxL+bM8g4C8A2Bqb/AcDSF6ZLHMArBJUBVsCb38IAvMlpg7ZMT8DbAaEBgcB43bcfJL9nZroSGsA8L8da/L+2QL9eQ8C2HrM5Q8C2Hq4H/8ESlMRKi8Be9MYki8Be9LUWr8Bb3ccAa8ChHbb728DyzMhF48Dv1acuLcHDuI38hcF0pZ4NB8G81Hw8IsHHzMYlNsE/wsINNsE/wsIkO8I6l8Qb98CNA5YzFcEq9MQMG8E/+cI52sHTp7siEcGZH7Beb8GI16Q4CMHWLcBFYsGb57xCS8FrDKY5TcGZDY8HPsF2K7AfVsHnKJH/ysFN1Lw6Y8EeJcQHY8EdJcUI/sGmvqM8+MEvxcQRjcGaHZ/3Drske58BU8HPPa82bcHEM7tGk8GCHLEJssGtBcEWwcFvBMAc5MG6BLtHFMJL3q4/WMI3xbr2yMJTpr43xcHcM702BsDHccAezrqve8IPccIN4pINFsKRL8UAHMKpLK5jiMIf4bpb3sE0TcY40cIiwbo5CsNUsLf9s8KG4rgEs8IC48YBMcRHlboBIcO4y39dNcXmjcZFDcNL58Fe/8K6+8g1NMOL2aZjx8L1O736d8KVW68WOMPJGccBIMSMqJ9YZ8NTCrhAlMN96bhYusOV1XVSaMPEIrVb9sMGybFZzMMu5cE4tsLIYcY/tMPNBKs2h8MwKsdNm8M7H61fycPh+4M4EMTay7f4h8NKM55GK8R3zLw9UcRFwbX1uMN2Kr4Mu8MOKbIMS8Qaz2D/H8Tq7sEA78MdIblgA8QbEcUCM8RM86c5DcRaGbVMcsRD1L5E08PcRbBjx8SSu7oyNcT1HpJGgMTK4qpOysSgvon22cXPlsU6jsRsC783TcQvOLIBH8U3upk98cSZ1cYfUsUyrsI6DsWLyL8H+MTZ23g+k8Vup6b6ncRsKsMD1cRHALQer8N0ZZv6UcXZvMBLP8SfU64EvcNwZ4sd+MTPCMH/MMVJ66cDSsVE68f+XcVe5b8/pMW0vq76RsUu/bg5hcUW0bcJrMUgwsFQscXtvrD4v8WJx7MEQsXxIcX6lsXU5bIAncQ+XapHlcWm8MEO9MXTw6Y87sXtyL/9hcUTGMICrcWT/sYJ0MXc6rt2CMYM0bb6BcbT3btr+sXh6sIC0sWWIcRX1cV0K7v6OcZk8LI3QcZH9JJPQcbjGcIAycUhUakkT8aSIb48pcdrmpZECMZ0SrhBesb5DLgW+cbeu8QNg8Z9CboWvMaS4cYL18aT3sMBCMeVwrhkrsaQ/8EEgcaZL7n66cYQ4sQokMYoNzIAwMczpMI5ScVJbr9GHMfs9MRdE8i+o6kMrMbsWMH9g8ch86gVx8eAybIFFsc7Ssj84MdQzav2/ceQx7k0u8c89KxD98dv3MMDpMhzo8EOHcie2YH698fuAq/9y8dnLcAUPMgo4LhiFMjSB8MCk8f8TrD7fMiKxrUu4cdqOLAJ48dWOLIL48dWOLgkTcia8cAj9Md7NZ8L9sd3NcEQQsii/sUHHcg4HZobrsjiwbsHYshA+ZtCMMjrJapIysjavsM2cMjj97RYz8g7wr78W8jbGZ8HR8mPp5v438fSVsc508gZ47VU1MiY98dgTchbS8X7sMh9G8UBW8nltbM4Usm8vbxhD8ka8sMk2MiqLsX33chLLrUE5shyL4gAH8pioKEqSsl4Hrv8mMmg4cBJoMmo36pUIshcabU3ucnQ6bEKy8nC365P0sma2mTzAMpDw7g8KslXS7syPchHa7cDGcl1VKZH3cm26MIVaspjqrJS9MkM38b/Esrlyrj4jMmUNL33osmxJ75Rusk0IKQuY8q3tKv928loCb0+dckdSK02r8l6NJ1k/cn6BaUK/sn5Ba4MMMqg4rEHwMkqO7o9+Mm/GcBBJMqw96pAQsr84YlGb8o6y6sYvMl8RcIZ1cl/PpdfLcqbA70ASMs4nsUhIsrKLrQjWsqwGLgwjsq+7bz+csrHE8UPgMpfE7QfUMprNsX2Fco5Ur9FmMpuFZZAecp9LoP9qsllZapFnspNJbVKB8rPXL45N8sjxKj/Xctyt8ZKqsq3La1Y9srX95ZBIMuC1XIEGcuq3L9JP8uZycET5MpkJcD8Lsu++rkAtMreR7j2csvZ07sBysuQtbMfSsuWAsMK68q/Qq8Lf8sV4ZA8ysonT7sza8yxnrc25ctQu8f/i8tF+rlDzctLy60fzctLy64fjuF9gboQrMu76cf/5cum2IVHoMu3E3wAxssP+Yj7i8slLb1cJcxpxqRB58u+D7H8IsyR5Lz62Mt9IsIFicvwS7gA18u3KLwRWMwYypgCb8xsxMX8cswNyJhI+8s5LrQU9stXM7b6Zswa4noVQ8yjCLQVKcyOSsNBA80o28NSuM0zobwK6sy29LcHRc27v8Y2Bc2J7rtWwcx9LMf858ynHsYBGc1DA7L8ks1Xv7lRbc0V3KshvczdULI8HM2sN5/3Vs27HMg0Y81zFb1AYc0yHr8GZ81pK8Rkmc3gBr0EzM0M5a49i81rHqn9ls2vFL7/I80RUq5F5cw6YH48SszhbLISks07Np9L1M19ELYMKM6gzb350M2/ILkB9c2LAbFFqc3XQsgaVM4k4L0QtM3mS5A5uc6asrABKM6ZEbwPUc5N+K83U868/rv+sM7GwJb6hM6f5pQNhs5Q6aUGys5KwJ0UjM735cQ/6M49xpX6o86l/8NBbc1TaKFLRM77UcVeuc5ZJbP5Hs9S1sZLKM8l3a8NMs/s3blVLM897MBVm8++ssBUVs51XaQB884gKq76Gs/8ELMuV88I4b1JMs9uBIYTUc+Y6sEBdM+01b8A6860PcQ3NNCtnsdiMc8oHLM6YM97AKYkW8+FEsEcU8+VHL4AXs9KHMNd4883wsANUM+mM7L5s88qBMQA+c+g2bxD0s/GAsMExM8TI6Faz885I8M94s/CFL0/is9oSsEAg9BdtMESHdAJ/K9pmNCev77+INDDJ39DIdDFJ7H68c+RSZAIPdDaJcQ3u9ARx8UF7NCZu6xBT9D/MKj4O9CLR7xLudB+CqFG6ND88LJDEdHZ3L8Lz9AfHK/7MNGd3KX829DmKbghp9APRsdiQNET5r9L1NBRPLcDONEC9q0AMdEs/p/8xNDeSMEcV9Gq67oeONEIEMc0YdFk+boZatASY6cvStFpF789LNGQP7M3JNFsR6IWy9Gv3sc+odGtB7MBqdHiKqc6ytGeGZ8u59Ee/78GrNHlPLn8itEuTsMa9tHaGJ8/ONIS6bAT7NG+QLAYaNIA6rsbO9LRELUic9PkmLkNQ9IdLsYGGNLbR8cmb9KmJLs32NKf0rwBM9PYr7cMcNJoO8Re59Lm46s3iNIfNaw5yNLTCsUK49IYD3ZbqNIvQHn/r9PSq7kE6tL3L64cFtNbGpFUl9NevMZmKdMZJMY7GdOfNsL9UtPNEMEkitKcYsYDXtM5G68GBNTTscE34dNLx7f9sNOy8LgWsdOcDEUNvNPQDrEh8dPr5MY6p9PPLpttvtMnIK34p9MSN7JlqdO9OcD+/dNuAZM16dOLI70qJNST+78MqdNbS69MGNWjncENfNR1xJlAOtPuY5E1SdTP88Ji0NQ8rLUA59PhQr78b9VPmJX/7dMqRMX2KtQ+IqT9X9RN9MD8TtQIDKc/ZdRjAL4Gl9SZ2qctW9SWIrz/f9QcCY4zZdXKoMI+ydRd2aNXaNSdNMItI9TPUbL5n9SoF7goqdQ/ELYAqdXMoLZJmNS8Nq3899T46a8DrNTlMZM9JNW/2qo2jdSTSq0H7tTgF7z9SNXVzZ/3TdWozrYKo9WPq7Jb1tRpObr6YNViysY8edXYv8MQY9US0L8dmtSwU65fG9W4G4heStXX8cUiFtUQLLv9LtXaIL8kV9XpGLhkNtUYQcYJUNWuNLP2gdUrDMVbrtWc7MAEzdWY2KRj9tULyqlUhtV4J6YKD9VbWscFo9VFI8X5sNV3I7QVGdZp0q5IktVCR7BC6dVPGsdV89XMFr/64dbhoYstHNb+/sBOENZZCrw/+dWEKsArD9ZGGMMkpNbMtK1hl9UvXLVdJdbSLb8gP9ZuHLE/1NWHYKJPjtaVIbD2dtYoM7gzwdYK/8c9cNacS8QXUNYrWLhGUtepzLc0AddkNK35VtfV/oL8NddDJrwE4Ndqtb9aitcP7sQcbdcgJrtUd9eoJcb6rteR/rpVDNiO2cE03tedFa0EY9dJWMEcsdeUQqoF3NfPKLMKwNd5QpBM6ddYNK4IC9hlJKn2ttdzUJ0GFthuIbI+udc9VsJYEdj4L782ItiOJ6NLd9g27pxAiNj84MQ86daEbp/9FNjbQ5VbUNgWI7c5itgp7os4LdjSQMUWVthnObVjx9jQ5LZUfdgWNqoZjNjtOcQGndieNL0DpdjAMbMnANnb7an94thEE8YSENn76n8vUtkzxL0A8thOGcNZmtjITsIGcdgUX8YiP9vbjMJEk9mrw78MQNnEIrz949lRr2L00diKWMH9c9mZB7Y6SNlAOWkoQdkgQb1AYNlYOsZg2tk918RC59j1YbxfGNn9WsBdktnHLaBPjNlMNcX05NlyHr83JNxljMVmL9oa5rX8ddqr5qkWO9qrNr4DI9o7RsAPpdqT5cYEmdrm+6xFjtowK5YYi9rYM8UfkNq9T8X+rNqeRa37Ftv98b8pXNuxwLE8p9vYqakQltqWWZsM5doARrpdPNsTEJb5XduGErgEA9x/qKwZztypk8gaW9siMqVgAty/vH88W9toQsL3m9veFKcG29tg/KxgctzkqbIf7tqZarQE69uiJb38ydwOobL9AdzBFIwaDdwuELkDJdxu/p45T9y86rT5LdwmHqr/N9zvEsFbf9x10LpDLtxMIrD4MNytIcU6SdxYDrArVtyxALM/R9yGFsf4c9w15rFjWdrMc7o9Q9wkK8BBidwS6cM8YNyhFpD9kdpTc8c3sNwQ08JbUt3ZoYcJqty9FMdKc9zOPcZHKN0ptqIQoNzyLbs0stxlQFEFydxUO7/5Dt1wFaAT1dyXR7j6kd1ByLv6GN4xnrlDht0Q3JkZid1o4cYCTt3wI6xGct2wK5s/891xwbEVN91WUMJkAd3MXr0Nn93uFrIdn93uFpw+i91PMG89zt1/8pAA0d3a+KBjIN5Cvqxb1N2LCL3/ZN3jUaIgt93iMK1PYd3yV4c3F95W28T8wt3lM6P6Nt72z6w8fN6btrBD1N0GRL1XZt4VyrxSJ97XEccZV94p7sVAB96VQasYit642Zhied4A+McbO96pPrAMmd4s+Lz8Et/frI1L395jx7dPet4tKMIrsN4686gTmN6JJqQxEt+D5sJDy94gP6n45txfdcEAzt5BQLpC6d6NL7pbB9/nJ69YN9+DE7NDON/fEb0HbN+b2sAect828rtYyN2PcrhDld806cQKQd9vQ78c1eB2krIdY9/kP8cDXN8lSMMSXN/3RcU+D+AYt8Icft+MOpQBt99qD7s3sN/AH7ZU1N8bBrQbst8/P7w6AuCwCscPOeAg0qY1ut/ER773FOB9G79gbuA0ycZC99+VQ6j9huAQybYY5N+IVLtUNuA8M8c6NOCkQbj07eAssrNIuOC498Uox+DE46sKqeHwl8AjYeCYUMP8z+DTB75jI+ElxbxREeEp1cA9hOEVpcJGDeF+55cAIuEC0rNC9uB5CMYgq+DIS8U73+B5Po9jQ+Fw3KJgJ+FZLMMhOeEaN7RGhOHc4bYAK+HDQ6NeXuJFnK9es+HU76I4iOH1Kr361eFoDqcPIeGWZcQYK+K7xsMbUeLvx7Ua0uEtTMH5XeIzzMc6W+K52LlV+OAcb8X8zOJBtMELS+L8KoI7GOJPVb8GkuI7DqIexuKi4rVGy+Jt6rZioOIbNo8Xz+J2B5QfL+M/0qcDMONs5rn5h+P9s58LOuOT+cP5F+MGOJsHlOP5v8h/LuOhMaD6WePuD8djD+NaT8dXr+P3xaoBRuN/Pq8AcONhNsMevuOE+cQ3deNpRsL3TOMCWW4NvuN1CsNja+NfU79SvuPtIb0/s+MnLsBA8+MP6J02yeKGbcZacONCXLP+FuTD375h7OMqHJhCE+S/8sdcEeSvCbMDVuSvxcL9suQKo5sdSuRZ4rlF6OM9RsBCTOSw7bsRQuSFIsATeuQj8sAMG+UnnbddXeQ5JcASfeTy+rtXr+Q0yr5HzeR+w7sXvOQh4I881+Tb4cJWf+RvQr4TlOQlNMb8GuX94KI23OTJNLb4xeRzRbYE6uRDJ7kC/+TULcMTJuWLH8ZbUuWeIaRh7uQDX7r6O+UwQrU6s+VwxbZCuuW6z8cDm+UU+Hox7uU4wL0+F+VZZILzaeSFcsc3geX7VbwHMeZw48AY2uUTR8H/ReZW+sJCCebXQJY1bebI2sENXufxkZA8LebNNqxAluZR5Kf2Z+aHQLxetebV9KcKkOZ5Oa8KteZ5G7oS2OY1CL8P7ubSHMQTB+cwA7E+H+dO6I4TvOZKWKgSC+lcirYt7ObCUb4MYucG7LMnI+eLPbFgd+fr3rU5fufTAb9WlOcs5ag0gucTCLZip+eG68UPh+drOsAAeufNSKb50ucH68cM/OcJ0Z79qOeHOrtft+dyNr8A2ucLDm1b2OfgKKgc/+cW87FC6OesGJ5G6ecCFcYj7ud4JJkZu+eYU5h/cudqZaRCOOjP8shjROjW770AL+ijILZUW+gR6XkRk+i6vL0kp+faZrM/e+gP1K8C+ufUWMYSZOjRA78A4uj4o749Bun6nLxSE+jsVp0fUOggRpv5behQVrxb2+jpKrD/6eiVGLYWKukyHML6eOm77LEWzun9p8UXlendyn35VOnzKLwZbuneJLH2PulaT8D5h+n4G8AAoOns+cBGBeoFy7oES+rLsaAQwemCUMMrHuosEbwD3enlXMT9iepmybs8Neu/k8YXEep8Wqxqr+qNCcj5z+qJ17n7Qus+r6c/d+orWcZk2+rcAL1M2+qoEr4U3uq+C79Wh+oTaK8aPuu69rw5QOvw/Kf9/eo1S8L6QOsxEMP8COt8Ur0DL+uAP77/e+vb2cf4s+swq75Xg+u2/rYNwOvEx6FSrOsxB6tWsOuM/3w6levvJcJLWuvEWbZeVuvpW50UzutH7Jz8p+sxKcD9vOsEQLJeIOw3vV35jetKWbVUlOuSWLEE6OsLJJAaJ+wW0aIDKeyWz65Y/uuyG8EkDuzdHsL6Quyq5cP2beygz7gOd+y20a0cTewtL708eezQCIoEjeyO77r5cOwvL50bjeyIEMJexezQFsY5pexHSLkJl+zFUoVe0ex7I8ZaaOzhZqk3tex/VLAPG+0x3L0d1e3EkbsSw+zVULUejuy9Y7sW8Ow2MbdDNe2D2Ln3zexpVrdGNO0I4rcwOe6ajbFYFu2vKMVF3OwCWsJkIe17OKJTcO0zxakwHu2fQLwClu3NxLE3SO0WPcAAVe0gUZoQpu3B7bdEgO2vNZlXp+3v9Jo6qe0l88JF6O28s7gk8+1NqnlTtO1X+ME0SPC+hcI9lu1gUcU3C+4U7cY/5u1RWcFLQO7h9Lj9TO47CLj/Ce8+mbYngO5J4bJAg+4H/pL9fe5bEa/5dO5KKKoAZu4uQqT6xu6vvr4VI+/Wm8IW1+7J3Lw72O7F9cY8GO/Orbco8+4f+cL+Au/D7MI62e5HSqA9KO/1Aab/he+co6L/Be9dRqQFAe12erX/wO8FoLwMZe8/BsEfne+tBqk/we9ZyLo5me9ILcdX3e8lwpU9Se+mZLpIye/5/6Qkyu/5/6AW9O/IwZheeu+hXLoW1+/7DL1d9O9z2cYT2e8PJsJL/e9NBrsW2e8TU48k6e/ZQ59kHPDR8Kr9APBSLr/+Q/AA0p0Aae8McMMJFfBUPaL7h/Dap6pgOfCCR5AAbvCSOMUJt/DD/cU7+e8acLsD1PCN4rQapvCHUMA5/vDi3cc78vDW/5b7ZvBobMADKvH40sNBPPFGxsQDCvFdOMH3YPH9+a9ETvFOSaUOBfG7aLEXkvH00L8Dk/HDG8M36/FWrsdXh/HGULRepPGJN6z01/Fm1MROR/Exa8JeiPFtWrMD5PGL2Zr62fJDjJkM7vGxFMAr3fH4PqFP1PGUTMY3CPJnD4f7PfLcvMciP/JTvWZgCfI1ObX4FvKuKakAH/KlFMVCD/IXO8YkZfIaxas9afI55adSTvL6KnszgPIgOMZYxvLqs6tGgPJ5O7E5yPLOvbtPnvMNjrf39vJPEZoe3vJaP8IV7/KDIZRAHfMc5LU4JfMD7L/9S/MFt4kEOvM2NcU9evOs7JZejfP8Iok3vPNQyLlVgvOAT7lGnfOqO8YEyvP/1cc2fvMmXoo/APQ/0aH+zPO+V74u+vP8DbMcBPQ59Y9i6fOZPa1dGvNCdqhLF/TzF79DK/R778P8NPSkP8MPYPSA6YMDZfTc6L1ESPRsOcNDefTp+ME0e/SJDKwAcvS6NMUZm/S60Zs6wvTIu8ANkvSyM8H9sPQrO734svS6Rq1q6fTg1U8F4fSJHbsoz/Q8Rbn7vPNqecVPL/WuEMETQvUa1rsPO/VeAbk6WPU33L9LfPX6tJk6VvT0d6dVh/WLt8BVdPVIBMNQWPX8UK9VkPX41rxRmfVN+cY8q/UxPIz70PVS4sc4yvXPPLEF8/WVzrERMvYhnrwVCvYDxcJABPZuBaP5KPZBs7hXAPbwJ25k9fWVX7VLEvYuR6Y/LfafFXD+P/YP9bkSjfYcwp0ZhPY83qE2jvaxyL4Anvbrt8Mck/ZhDaNemPY4JKlQgfaBVKv/qPYOHscP0PYD1740sPb4QbdUtfYbRsAa3/YGA7k2Avfk4Y1JD/cO2MROGfcMw8McBfdXDLJYF/cQ4KcnIvdGxsNhu/Y2a6AwK/env5M9HPf3Dbj8D/dhVMATO/cFGcBQMPftPcYaavdmDLMHj/dDRqMRsPdNUb08uPe8D8M84Pdm95td/feLxcJGGfgI+7wDJ/gU85tCWPjTp78e7feRacQkSvi7wMY/bfgurZUYU/gD9bBgG/jQZL0OYfiqBI43TPitS7wfg/jx8p/3j/jxxbwae/i1RatkUfqWg7tMrfi80aBDs/hV8q7/uvjc7LEwx/i3+LwXx/hM5sZbpPjdYKgyy/gnRbo93PjXO8JY8vinB7BI//jDIaUKCPlBK71aG/mf2b8xC/lNNsIbOfk+Lbf6W/md6rQMaflq45VCbvmDEbFOVvmFVb1kovk0tsFf1Pknr71Av/kOLr36vvmTWK5k1/lIIaAk9fml4p9YD/oGtbwYLPrXrL46HvrJAa0BJvoHPcEAP/rKI8f9TfoSCZ1ALfoQZL4LfPo/psD2g/olEqM4q/pEU6z55PrNN7Q9QfvykcMoMPs4yp/7IfoqfL0NPvtC4qcBR/v/H7dgXfuMLK5SZvs6/sQShftS6sdRfPs5Ob0GfPujL749kPtlw6cEjPvjZcRszPv9AsAaKPyuksg2Bvxu7b89DvxOv6gEAfwSQpE8APwvP8P9E/wrGrwAG/yIPZ36SfzHR7b9Z/zH668ObvwACJkebfzDDccMS/wUa8YHU/w+acc1U/xoboI9jfxj0rY6g/wMP5n8pfxk78U8uPxd5rdewfyq5qoxyfxPCsUGzfyIAqIM4PwI6rZS7PxR66L+Cv2xDrBkRf3yj8FCL/1opMFUJv3BKa05MP0C5rX8gv1w5bYQg/0EQq1Ck/31BLB/nf35Xsb+u/2SuLP1sv1pU6tCu/0Q78FAsP20Ubtj2v0T/Ls42P1vYLAAB/7/16QAAv56WLkoH/6HAcIJKf7NM8UvKP4EKccLQ/7R8cZDUf6F68Fadf4+DcJjdf4c5bP4l/5bi7E3kf4qBLxbqf4xG7Fgqf6868RMr/6RD7YKuf4188FGvf6E+8ZA//7GUaNJEf8nAL5fNf+mUcgMNP9ZQ8hFef+qPMcpfP85T7wdhf93pscGj/8ki8E/kf+PpK8DmP/BI6Zftv8VSaptwv/y+qs3zv/9tLJD0f9LT6z83//CCZYZ5v8S1r5g+/+9oqL8MACWusA2PABquLxgSABnkqlMSQARV7wYUgCy+7H5YgCDJsEoWQBz96BhagC81a/3cQARDL4RdgABXsRBqgBZ56P9wACVWMUSxAB/6MJCzAAO8a1h1QCFX79A1QBomr356AAzV8P7';
/* ===== 真實星空：耶魯亮星星表、銀河、流星 ===== */
const SH5={};
SH5.starVS=`
attribute float aMag; attribute vec3 aCol; attribute float aSeed;
uniform float uTime, uPR, uVis, uHz0, uHz1;
varying vec3 vCol; varying float vA;
void main(){
  vec4 wp = modelMatrix*vec4(position, 1.0);
  vec3 dir = normalize(wp.xyz - cameraPosition);
  float alt = dir.y;
  float hz = smoothstep(uHz0, uHz1, alt);
  float air = 1.0/max(alt + 0.06, 0.06);                     // 大氣質量：低空變暗
  float flux = pow(10.0, -0.4*(aMag - 1.0));
  float tw = 1.0 + (0.12 + 0.5*(1.0 - smoothstep(0.05, 0.5, alt)))*sin(uTime*(7.0 + aSeed*9.0) + aSeed*40.0);  // 閃爍：越低越明顯
  vA = clamp(max(pow(flux, 0.32)*1.75, 0.24), 0.0, 1.0)*hz*uVis*tw*exp(-0.09*(air - 1.0));
  vCol = aCol;
  vec4 mv = viewMatrix*wp;
  gl_PointSize = clamp(2.0 + 3.4*sqrt(flux), 2.0, 9.0)*uPR;
  gl_Position = projectionMatrix*mv;
}`;
SH5.starFS=`
varying vec3 vCol; varying float vA;
void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c);
  float a = (exp(-r*r*28.0) + 0.25*exp(-r*r*7.0))*vA; if(a < 0.004) discard;
  gl_FragColor = vec4(vCol*a, a); }`;
SH5.mwVS=`varying vec3 vEq; varying vec3 vW; void main(){ vEq = position; vec4 wp = modelMatrix*vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`;
SH5.mwFS=`
uniform float uVis, uHz0, uHz1; varying vec3 vEq; varying vec3 vW;
float h1(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719)))*43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(h1(i), h1(i + vec3(1,0,0)), f.x), mix(h1(i + vec3(0,1,0)), h1(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h1(i + vec3(0,0,1)), h1(i + vec3(1,0,1)), f.x), mix(h1(i + vec3(0,1,1)), h1(i + vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  vec3 d = normalize(vEq);
  // J2000 銀河北極 (RA 192.86°, Dec 27.13°)、銀河中心 (RA 266.40°, Dec -28.94°)
  vec3 ngp = vec3(-0.8676, -0.1981, 0.4560), gc = vec3(-0.0549, -0.8734, -0.4838);
  float b = asin(clamp(dot(d, ngp), -1.0, 1.0));
  float l = acos(clamp(dot(normalize(d - ngp*dot(d, ngp)), gc), -1.0, 1.0));
  float band = exp(-pow(b/0.17, 2.0))*(0.45 + 0.9*exp(-pow(l/0.9, 2.0)));
  float n = n3(d*9.0)*0.6 + n3(d*23.0)*0.4;
  float dust = smoothstep(0.35, 0.75, n3(d*14.0 + 3.0))*exp(-pow(b/0.05, 2.0));
  float a = band*(0.55 + 0.6*n)*(1.0 - 0.75*dust)*0.75*uVis;
  vec3 wd = normalize(vW - cameraPosition); a *= smoothstep(uHz0, uHz1 + 0.15, wd.y);
  gl_FragColor = vec4(vec3(0.85, 0.88, 1.0)*a, a);
}`;
SH5.metVS=`attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix*viewMatrix*vec4(position, 1.0); }`;
SH5.metFS=`uniform float uA; uniform vec3 uCol; varying float vT; void main(){ float a = pow(vT, 2.2)*uA; gl_FragColor = vec4(mix(vec3(1.0), uCol, 0.35 + 0.4*vT)*a, a); }`;

function createNightSky(W,G){
'use strict';
const T=THREE, S=W.scene, R=820, LAT=23.7*Math.PI/180;
/* 星表 → 赤道座標單位向量 */
const raw=Uint8Array.from(atob(STAR_B64),ch=>ch.charCodeAt(0)), dv=new DataView(raw.buffer), N=raw.length/6;
const pos=new Float32Array(N*3), mag=new Float32Array(N), col=new Float32Array(N*3), seed=new Float32Array(N);
function bvRGB(bv){ // B-V 色指數 → 色溫 → 顏色
  const t=4600*(1/(.92*bv+1.7)+1/(.92*bv+.62)), x=t/100; let r,g,b;
  r=x<=66?1:Math.min(1,1.29*Math.pow(x-60,-.1332)); g=x<=66?Math.min(1,.39*Math.log(x)-.632):Math.min(1,1.13*Math.pow(x-60,-.0755)); b=x>=66?1:x<=19?0:Math.min(1,.543*Math.log(x-10)-1.196);
  return [Math.max(0,r),Math.max(0,g),Math.max(0,b)]; }
for(let i=0;i<N;i++){ const ra=dv.getUint16(i*6,true)/65535*2*Math.PI, de=dv.getInt16(i*6+2,true)/32767*Math.PI/2;
  pos[i*3]=Math.cos(de)*Math.cos(ra); pos[i*3+1]=Math.cos(de)*Math.sin(ra); pos[i*3+2]=Math.sin(de);
  mag[i]=dv.getUint8(i*6+4)/25-2; const c=bvRGB(dv.getInt8(i*6+5)/60); col[i*3]=c[0]; col[i*3+1]=c[1]; col[i*3+2]=c[2]; seed[i]=Math.random(); }
/* 無光害夜空的暗星：6.2～8.5 等、9,000 顆，靠近銀河面越密（與真實星表同一套座標與著色） */
const NF=9000, P2=new Float32Array((N+NF)*3), M2=new Float32Array(N+NF), C2=new Float32Array((N+NF)*3), S2=new Float32Array(N+NF);
P2.set(pos); M2.set(mag); C2.set(col); S2.set(seed);
{ const NG=[-0.8676,-0.1981,0.4560]; let k=N;
  while(k<N+NF){ const u=Math.random()*2-1, ph=Math.random()*2*Math.PI, r=Math.sqrt(1-u*u), x=r*Math.cos(ph), y=r*Math.sin(ph), z=u;
    const b=Math.asin(x*NG[0]+y*NG[1]+z*NG[2]); if(Math.random()>.22+.78*Math.exp(-Math.pow(b/.28,2))) continue;
    P2[k*3]=x; P2[k*3+1]=y; P2[k*3+2]=z; M2[k]=6.2+2.3*Math.pow(Math.random(),.6);
    const t=Math.random(), cc=t<.3?[.8,.88,1]:t<.75?[1,1,1]:[1,.92,.78]; C2[k*3]=cc[0]; C2[k*3+1]=cc[1]; C2[k*3+2]=cc[2]; S2[k]=Math.random(); k++; } }
const sg=new T.BufferGeometry(); sg.setAttribute('position',new T.BufferAttribute(P2,3)); sg.setAttribute('aMag',new T.BufferAttribute(M2,1)); sg.setAttribute('aCol',new T.BufferAttribute(C2,3)); sg.setAttribute('aSeed',new T.BufferAttribute(S2,1));
const U={uTime:W.U.uTime,uPR:{value:1},uVis:{value:0},uHz0:{value:.1},uHz1:{value:.2}};
const stars=new T.Points(sg,new T.ShaderMaterial({uniforms:U,vertexShader:SH5.starVS,fragmentShader:SH5.starFS,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false}));
const mw=new T.Mesh(new T.SphereGeometry(1,64,32),new T.ShaderMaterial({uniforms:U,vertexShader:SH5.mwVS,fragmentShader:SH5.mwFS,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.BackSide,fog:false}));
[stars,mw].forEach(o=>{ o.matrixAutoUpdate=false; o.frustumCulled=false; o.renderOrder=-1; S.add(o); });
/* 赤道座標 → 地平座標 → 世界座標（往 -Z 看是南方、+Z 是北方、-X 是東方） */
const M=new T.Matrix4(), Mh=new T.Matrix4(), Mw=new T.Matrix4(), cam=new T.Vector3();
Mw.set(-1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,1);                           // ENU → 世界
const sL=Math.sin(LAT), cL=Math.cos(LAT);
const Mlat=new T.Matrix4().set(0,-1,0,0, -sL,0,cL,0, cL,0,sL,0, 0,0,0,1); // 時角座標 → ENU
function skyMatrix(hour){ const lst=((hour-22)/24)*2*Math.PI;           // 十月底：午夜的恆星時約 2 時
  const c=Math.cos(lst), s=Math.sin(lst); Mh.set(c,s,0,0, s,-c,0,0, 0,0,1,0, 0,0,0,1);
  return M.copy(Mw).multiply(Mlat).multiply(Mh); }

/* 流星：頭亮尾暗的細長光帶，沿天球大圓移動 */
const mets=[]; for(let i=0;i<4;i++){ const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(12),3)); g.setAttribute('aT',new T.BufferAttribute(new Float32Array([0,0,1,1]),1)); g.setIndex([0,1,2,2,1,3]);
  const m=new T.Mesh(g,new T.ShaderMaterial({uniforms:{uA:{value:0},uCol:{value:new T.Color(.7,1,.85)}},vertexShader:SH5.metVS,fragmentShader:SH5.metFS,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false}));
  m.frustumCulled=false; m.visible=false; m.renderOrder=-1; S.add(m); mets.push({m,t:0,on:false}); }
const v1=new T.Vector3(), v2=new T.Vector3(), hd=new T.Vector3(), td=new T.Vector3(), sd=new T.Vector3(), vw=new T.Vector3();
function dirAE(az,el,o){ return o.set(-Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el)); }
function spawn(big){ const o=mets.find(x=>!x.on); if(!o||U.uVis.value<.15) return; const yaw=G.head+(G.yaw||0)+(Math.random()-.5)*1.6;
  const el=.09+Math.random()*.3+(G.pitch||0)*.85, len=(big?.45:.14+Math.random()*.22), ang=Math.random()*Math.PI*2;
  o.s=dirAE(yaw,el,new T.Vector3()); const ax=new T.Vector3(Math.cos(ang),-.35-Math.random()*.5,Math.sin(ang)).cross(o.s).normalize();
  o.e=o.s.clone().applyAxisAngle(ax,len); if(o.e.y>o.s.y){ const t=o.s; o.s=o.e; o.e=t; }
  o.dur=big?1.6:.35+Math.random()*.6; o.t=0; o.on=true; o.big=!!big; o.br=big?1:.45+Math.random()*.5; o.m.visible=true; }
function slerpDir(a,b,t,out){ const d=Math.acos(Math.min(1,a.dot(b))); if(d<1e-5) return out.copy(a); const s=Math.sin(d); return out.copy(a).multiplyScalar(Math.sin((1-t)*d)/s).addScaledVector(b,Math.sin(t*d)/s); }
function updMet(o,dt){ o.t+=dt; const q=o.t/o.dur; if(q>=1){ o.on=false; o.m.visible=false; return; }
  const head=Math.min(1,q*1.15), tail=Math.max(0,head-(o.big?.55:.4));
  slerpDir(o.s,o.e,head,hd); slerpDir(o.s,o.e,tail,td);
  v1.copy(hd).multiplyScalar(R).add(cam); v2.copy(td).multiplyScalar(R).add(cam);
  sd.subVectors(v1,v2).cross(vw.copy(hd)).normalize();
  const wH=R*(o.big?.0045:.0024), wT=wH*.25, p=o.m.geometry.attributes.position;
  p.setXYZ(0,v2.x+sd.x*wT,v2.y+sd.y*wT,v2.z+sd.z*wT); p.setXYZ(1,v2.x-sd.x*wT,v2.y-sd.y*wT,v2.z-sd.z*wT);
  p.setXYZ(2,v1.x+sd.x*wH,v1.y+sd.y*wH,v1.z+sd.z*wH); p.setXYZ(3,v1.x-sd.x*wH,v1.y-sd.y*wH,v1.z-sd.z*wH); p.needsUpdate=true;
  const fl=o.big&&q>.6&&q<.8?1.6:1;                                       // 火流星在後段閃一下
  o.m.material.uniforms.uA.value=o.br*Math.sin(Math.PI*Math.min(1,q*1.1))*U.uVis.value*fl; }

let nextT=20+Math.random()*40;
function update(dt,hour){ W.camera.getWorldPosition(cam);
  const day=W.U.uDay?W.U.uDay.value:1, cloud=W.U.uCloud?W.U.uCloud.value:0;
  const vis=Math.pow(Math.max(0,1-day*1.6),2)*(1-.85*Math.min(1,cloud))*(W.U.uRain?1-.9*W.U.uRain.value:1);
  U.uVis.value+=(vis-U.uVis.value)*Math.min(1,dt*2);
  const sea=G.loc==='sea'; U.uHz0.value=sea?.005:.018; U.uHz1.value=sea?.05:.1;
  U.uPR.value=W.getPR?W.getPR():1;
  const on=U.uVis.value>.01; stars.visible=mw.visible=on;
  if(on){ const m=skyMatrix(hour); stars.matrix.copy(m).scale(v1.set(R,R,R)).setPosition(cam); stars.matrixWorld.copy(stars.matrix);
    mw.matrix.copy(m).scale(v1.set(R*1.02,R*1.02,R*1.02)).setPosition(cam); mw.matrixWorld.copy(mw.matrix); }
  nextT-=dt; if(nextT<=0){ nextT=25+Math.random()*50; if(on) spawn(Math.random()<.06); }
  for(const o of mets) if(o.on) updMet(o,dt); }
return {update,spawn};
}
/* ===== 天賦與大師挑戰 ===== */
const TAL={
  cast:{n:'遠投',i:'🎯',d:r=>`拋投距離 +${r*4}%，稀有魚需要的拋投距離 −${r*5}%`},
  power:{n:'力量',i:'💪',d:r=>`線張力 −${r*3}%，爆線累積 −${r*5}%`},
  sea:{n:'海洋',i:'🌊',d:r=>`海上稀有魚 +${r*8}%，鯊魚搶魚機率 −${r*12}%，閃避少點 ${Math.floor(r/2)} 下`}};
const TAL_MAX=6, TAL_RESET=5000;
const BOSS=[
  {id:'gar',lv:15,name:'巨型鱷雀鱔',sp:'gar',loc:'lake',zone:'deep',per:['dusk','night'],size:1.5,pow:1.35,title:'鱷雀鱔獵人',hint:'深水中央・黃昏或夜晚',coins:15000,cry:2},
  {id:'flat',lv:18,name:'鯰魚之王',sp:'flathead',loc:'lake',zone:'wood',per:['night'],size:1.45,pow:1.45,title:'鯰魚王者',hint:'倒木區・夜晚',coins:20000,cry:3},
  {id:'marlin',lv:20,name:'旗魚王',sp:'marlin',loc:'sea',zone:'blue',per:['dawn','day'],size:1.35,pow:1.5,title:'怒海旗手',hint:'遠洋深藍・清晨或白天',coins:30000,cry:4},
  {id:'gw',lv:25,name:'大白鯊女王',sp:'gwhite',loc:'sea',zone:'blue',per:['dusk','night'],size:1.3,pow:1.6,title:'深海霸主',hint:'遠洋深藍・黃昏或夜晚',coins:50000,cry:6},
  {id:'king',lv:24,name:'滄淵',sp:'seaking',loc:'sea',zone:'blue',per:['night'],size:1,pow:1.75,title:'滄淵征服者',hint:'遠洋深藍・夜晚',coins:80000,cry:10}];
const PER_NAME={dawn:'清晨',day:'白天',dusk:'黃昏',night:'夜晚'};

function createTalents(c){
'use strict';
const S=c.save; S.tal=S.tal||{cast:0,power:0,sea:0}; S.boss=S.boss||{}; S.titles=S.titles||[];
const spent=()=>Object.values(S.tal).reduce((a,b)=>a+b,0), pts=()=>Math.max(0,(S.lv||1)-4)-spent(), rank=b=>S.tal[b]||0;
function apply(g){ g.rod.cast*=1+.04*rank('cast'); g.rod.tens*=1-.03*rank('power'); return g; }

/* Boss：指定釣點與時段，咬餌時 30% 機率出現，連續 4 次沒出現就保證出現 */
let tries=0;
function bossRoll(){ const b=BOSS.find(x=>x.id===S.bossOn); if(!b) return null;
  if(c.loc()!==b.loc||c.zoneId()!==b.zone||b.per.indexOf(c.period())<0) return null;
  tries++; if(Math.random()<.3||tries>=4){ tries=0; return b; } return null; }
function applyBoss(G,SPECIES,RAR){ const b=bossRoll(); if(!b) return false; const sp=SPECIES.find(x=>x.id===b.sp); if(!sp) return false;
  const L=sp.len[1]/100*b.size, w=sp.k*L*L*L, sp2=Object.assign({},sp);
  G.sp=sp2; G.fd={sp:sp2,L,w,u:1,lvl:99,boss:b,value:Math.round(sp.price*Math.pow(w+.3,.85)*RAR[sp.rar].mult*2.5),xpMul:3};
  c.toast('👑 有什麼巨大的東西在靠近……','warn',2400); c.vib([60,40,60]); return true; }
function bossWin(fd){ const b=fd.boss, first=!S.boss[b.id]; S.boss[b.id]=(S.boss[b.id]||0)+1; S.bossOn=null; if(window.__STORY) window.__STORY.onBoss(b.id);
  let bxp=0; if(first){ S.coins+=b.coins; S.mat=S.mat||{}; S.mat.crystal=(S.mat.crystal||0)+b.cry; if(S.titles.indexOf(b.title)<0) S.titles.push(b.title); c.setCoins(); if(c.addXP&&window.__LVINFO){ bxp=Math.round(window.__LVINFO.xpNext(S.lv||1)*.3); c.addXP(bxp); } }
  showTitle(); c.persist(); setTimeout(()=>c.toast(first?`👑 擊敗${b.name}！稱號「${b.title}」・🪙${b.coins.toLocaleString()}・💎×${b.cry}${bxp?'・經驗 '+bxp.toLocaleString():''}`:`👑 再次擊敗${b.name}！`,'good',4200),1600); c.Snd.fanfare(2); dot(); }

/* Boss 登場演出與光暈 */
const T=THREE, bc=document.createElement('canvas'); bc.width=bc.height=128; { const x=bc.getContext('2d'), gr=x.createRadialGradient(64,64,4,64,64,64); gr.addColorStop(0,'rgba(255,230,140,.9)'); gr.addColorStop(.35,'rgba(255,150,60,.45)'); gr.addColorStop(1,'rgba(255,80,40,0)'); x.fillStyle=gr; x.fillRect(0,0,128,128); }
const aura=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(bc),blending:T.AdditiveBlending,depthWrite:false,transparent:true})); aura.renderOrder=6;
const bb=document.createElement('div'); bb.id='bossBan'; bb.className='hidden'; document.body.appendChild(bb);
const fl=document.createElement('div'); fl.id='bossFlash'; document.body.appendChild(fl);
let auraOn=null;
function bossIntro(G,fx){ const b=G.fd&&G.fd.boss; if(!b) return;
  bb.innerHTML=`<b>👑 ${b.name}</b><small>大師挑戰・Boss 出現！</small>`; bb.classList.remove('hidden','out'); void bb.offsetWidth; bb.classList.add('in');
  setTimeout(()=>bb.classList.add('out'),2600); setTimeout(()=>bb.classList.add('hidden'),3300);
  fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
  c.vib([120,60,220,60,120]); if(fx) fx(b);
  if(G.fish&&G.fish.group){ auraOn=G.fish.group; auraOn.add(aura); aura.position.set(0,0,0); } }
function tick(G){ if(!auraOn) return; const live=G.fd&&G.fd.boss&&G.fish&&G.fish.group===auraOn&&['fight','land','catch'].indexOf(G.state)>=0;
  if(!live){ auraOn.remove(aura); auraOn=null; return; } const t=performance.now()*.004; aura.scale.setScalar(2.6+.5*Math.sin(t)); aura.material.opacity=.55+.25*Math.sin(t*1.7); }
/* 主畫面稱號 */
const lv=document.getElementById('lvN'); let tEl=null;
if(lv&&lv.closest('.chip')){ tEl=document.createElement('small'); tEl.id='titleC'; lv.closest('.chip').appendChild(tEl); }
function showTitle(){ if(!tEl) return; const t=S.titleSel&&S.titles.indexOf(S.titleSel)>=0?S.titleSel:S.titles[S.titles.length-1]; tEl.textContent=t?'「'+t+'」':''; tEl.style.display=t?'':'none'; }
showTitle();
/* 介面 */
const st=document.createElement('style'); st.textContent=`
#talBtn{position:relative}#talBtn.dot::after{content:'';position:absolute;top:2px;right:2px;width:9px;height:9px;border-radius:50%;background:#ff5a4a}
#talBox{position:fixed;inset:0;z-index:9;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}
#talBox.hidden{display:none}
#talBox .tb{width:min(560px,100%);max-height:86vh;overflow:auto;touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:rgba(18,22,26,.97);border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));color:var(--fg)}
#talBox h3{margin:0 0 4px;font-size:20px;display:flex;justify-content:space-between;align-items:center}
#talBox .pt{font-size:13px;color:#ffd56a;margin-bottom:6px}#talBox .sec{margin:14px 0 4px;font-size:13px;color:var(--fg-dim)}
#talBox .pips{letter-spacing:2px;color:#ffd56a}#talBox .tk{padding:6px 10px;margin:4px 0;border-radius:10px;background:rgba(255,255,255,.05);font-size:13px}#talBox .tk b{color:#ffd56a}#talBox .ttl{display:inline-block;margin:4px 6px 0 0;padding:4px 10px;border-radius:999px;border:1px solid rgba(255,213,106,.4);background:rgba(255,213,106,.08);color:#ffe9a8;font-size:13px}#talBox .ttl.on{background:#ffd56a;color:#2a1a00;font-weight:800}
#titleC{display:block;font-size:10px;color:#ffd56a;font-weight:800;line-height:1;margin-top:1px;white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis}
#bossBan{position:fixed;left:50%;top:30%;transform:translate(-50%,-50%) scale(.6);z-index:25;text-align:center;padding:14px 28px;border-radius:18px;background:linear-gradient(135deg,rgba(60,10,10,.92),rgba(120,40,10,.92));border:2px solid #ffd56a;box-shadow:0 0 40px rgba(255,150,60,.7);opacity:0;pointer-events:none;transition:transform .35s cubic-bezier(.2,1.6,.4,1),opacity .35s}
#bossBan.in{opacity:1;transform:translate(-50%,-50%) scale(1)}#bossBan.out{opacity:0;transform:translate(-50%,-60%) scale(.9)}#bossBan.hidden{display:none}
#bossBan b{display:block;font-size:30px;color:#ffe9a8;letter-spacing:2px;text-shadow:0 2px 12px rgba(255,120,40,.9)}#bossBan small{display:block;margin-top:4px;font-size:13px;color:#ffd0a0;font-weight:700}
#bossFlash{position:fixed;inset:0;z-index:24;background:#fff;opacity:0;pointer-events:none}#bossFlash.go{animation:bfl .6s ease-out}@keyframes bfl{0%{opacity:.85}100%{opacity:0}}#talBox .lock{color:var(--fg-dim);font-size:12px}#talBox .on{color:#7ff0a8;font-weight:800}`;
document.head.appendChild(st);
const box=document.createElement('div'); box.id='talBox'; box.className='hidden'; box.innerHTML='<div class="tb"></div>'; document.body.appendChild(box);
const btn=document.createElement('button'); btn.className='chip sm'; btn.id='talBtn'; btn.setAttribute('aria-label','天賦與挑戰'); btn.textContent='⭐';
const t2=document.getElementById('top2'); if(t2) t2.appendChild(btn);
function dot(){ btn.classList.toggle('dot',pts()>0||(!S.bossOn&&BOSS.some(b=>(S.lv||1)>=b.lv&&!S.boss[b.id]))); }
const row=(a,b,r)=>`<div class="row"><div class="nm"><b>${a}</b><small>${b}</small></div><div class="rt">${r}</div></div>`;
function render(){ const p=pts();
  let h=`<h3>天賦與大師挑戰<button class="sbtn" data-t="x">✕</button></h3>`;
  h+=`<div class="pt">${(S.lv||1)<5?'Lv 5 起每升一級得 1 點天賦':`可用天賦點：${p}（Lv ${S.lv}，已用 ${spent()}）`}</div>`;
  for(const k in TAL){ const r=rank(k), T=TAL[k];
    h+=row(`${T.i} ${T.n} <span class="pips">${'●'.repeat(r)}${'○'.repeat(TAL_MAX-r)}</span>`,r?T.d(r):'尚未投入',r>=TAL_MAX?'<span class="on">滿級</span>':`<button class="sbtn${p>0?' pri':''}" data-t="add" data-v="${k}">＋1</button>`); }
  if(spent()>0) h+=`<div style="text-align:right;margin-top:6px"><button class="sbtn danger" data-t="reset">重置天賦（🪙${TAL_RESET.toLocaleString()}）</button></div>`;
  h+='<div class="sec">大師挑戰：接受後，在指定釣點與時段會遇到 Boss。Boss 體型巨大、拉力極強，建議先強化裝備。</div>';
  for(const b of BOSS){ const done=S.boss[b.id], on=S.bossOn===b.id, lock=(S.lv||1)<b.lv;
    const sub=lock?`<span class="lock">Lv ${b.lv} 解鎖</span>`:`${b.hint}<br>首勝：稱號「${b.title}」・🪙${b.coins.toLocaleString()}・💎×${b.cry}${done?`<br>已擊敗 ${done} 次`:''}`;
    const r=lock?'🔒':on?'<span class="on">進行中</span><br><button class="sbtn" data-t="quit">放棄</button>':`<button class="sbtn${done?'':' pri'}" data-t="boss" data-v="${b.id}">${done?'再戰':'接受挑戰'}</button>`;
    h+=row(`${done?'👑':'🐉'} ${b.name}`,sub,r); }
  if(window.__LVINFO){ const L=window.__LVINFO, lv=S.lv||1, need=L.xpNext(lv), up=[]; for(let k=lv+1;k<=lv+12&&up.length<4;k++){ const g=L.gains(k).filter(x=>x!=='天賦點 +1'); if(g.length) up.push(`<div class="tk"><b>Lv ${k}</b>　${g.join('、')}</div>`); }
    h+=`<div class="sec">等級里程碑</div><div class="pt">Lv ${lv}：經驗 ${Math.floor(S.xp||0).toLocaleString()} / ${need.toLocaleString()}　｜　強化上限 +${Math.min(10,Math.floor(lv/3))}</div>${up.join('')}`; }
  if(S.titles.length){ const cur=S.titleSel&&S.titles.indexOf(S.titleSel)>=0?S.titleSel:S.titles[S.titles.length-1]; h+=`<div class="sec">已獲得稱號（點選要顯示在主畫面的稱號）</div><div>${S.titles.map(t=>`<button class="ttl${t===cur?' on':''}" data-t="title" data-v="${t}">${t}</button>`).join('')}</div>`; }
  box.firstChild.innerHTML=h; }
btn.addEventListener('click',()=>{ c.Snd.init&&c.Snd.init(); render(); box.classList.remove('hidden'); });
box.addEventListener('click',e=>{ if(e.target===box){ box.classList.add('hidden'); return; } const b=e.target.closest('[data-t]'); if(!b) return; const t=b.dataset.t, v=b.dataset.v;
  if(t==='x'){ box.classList.add('hidden'); return; }
  if(t==='add'&&pts()>0&&rank(v)<TAL_MAX){ S.tal[v]=rank(v)+1; c.Snd.coin(); }
  if(t==='reset'){ if(S.coins<TAL_RESET){ c.toast('金幣不夠','bad'); } else { S.coins-=TAL_RESET; S.tal={cast:0,power:0,sea:0}; c.setCoins(); } }
  if(t==='boss'){ S.bossOn=v; tries=0; const B=BOSS.find(x=>x.id===v); c.toast(`🐉 已接受挑戰：${B.name}（${B.hint}）`,'good',3000); }
  if(t==='quit') S.bossOn=null;
  if(t==='title'){ S.titleSel=v; showTitle(); }
  c.persist(); render(); dot(); });
setInterval(dot,3000); dot();
return {rank,apply,applyBoss,bossWin,bossIntro,tick};
}
/* ===== 月光灣：霜汐的故事 ===== */
const MOON_STORY=[
 {t:'序章・月下的人魚',b:'「你終於來了。我叫霜汐，是守護月潮的人魚。很久以前，這片濕地還是連著大海的河口……可是現在，我的七片月鱗散落在湖裡，沒有它們，我回不了海。」<br><br>「月鱗會吸引在月光下覓食的魚。請你在月夜的月光灣釣魚，幫我把它們找回來。」'},
 {t:'第一片・潮汐的記憶',b:'「每逢滿月，潮水會從海上漲進河口，我就順著月光回家。那時候的水是鹹的，夜裡會發光……就像你現在看到的這樣，只是比現在亮上一百倍。」'},
 {t:'第二片・提燈的漁人',b:'「有個老漁人，每晚都在碼頭掛一盞燈給我。我們從沒說過話，但我知道那盞燈是為我點的。你常站的那座碼頭，就是他當年一塊一塊釘起來的。」'},
 {t:'第三片・堤防',b:'「後來人們築起了堤防。潮水再也進不來，河口慢慢淤成沼澤。最後一次滿月那晚，水面的月光被堤防切斷，我就被困在這裡了。」'},
 {t:'第四片・月鱗的由來',b:'「每一片月鱗，都收著一小段月光。被困住的那一夜我哭了很久，眼淚落下的地方，鱗片也跟著剝落、沉進湖底。」'},
 {t:'第五片・幽靈魚',b:'「你釣過那種會發光的幽靈魚吧？牠們是我的眼淚變成的。牠們一直在湖裡游，替我記得回家的路。」'},
 {t:'第六片・月神鯉',b:'「最後一片月鱗被月神鯉吞下了。牠是月光灣的守護者，不肯把鱗片交給任何人，因為牠怕我一離開，這裡就再也沒有月光。」<br><br>「請你在月夜釣起月神鯉。牠很強，比你見過的任何魚都強。」'},
 {t:'終章・月光之路',b:'「七片月鱗都回來了……你看，水面上的月光連成一條路了。」<br><br>「謝謝你。從今以後，我可以順著月光往返大海與這片濕地。如果你在海上看見我，別驚訝。」<br><br>「這支月神之竿送給你。月神鯉會繼續守護這裡，月夜時牠還會出現——下次，別讓牠失望。」'}];

function createMoonBay(W,c){
'use strict';
const T=THREE, S=W.scene, G=c.G, SV=c.save; SV.moon=SV.moon||{met:false,sc:0,read:-1,done:false}; const MS=SV.moon;
const ss=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
/* 月亮：NASA 月球影像（公有領域），位置依時間與月相即時計算 */
const MD=new T.Vector3(-Math.sin(.35)*Math.cos(.22),Math.sin(.22),-Math.cos(.35)*Math.cos(.22)).normalize();
const moonTex=new T.TextureLoader().load('moon.jpg'); moonTex.encoding=T.sRGBEncoding;
const moon=new T.Mesh(new T.SphereGeometry(1,32,24),new T.MeshBasicMaterial({map:moonTex,color:new T.Color(1.7,1.7,1.75),fog:false,transparent:false,depthWrite:false,toneMapped:false}));
moon.rotation.y=-1.2; moon.renderOrder=-2; moon.frustumCulled=false; S.add(moon);
/* 月相：依真實日期算月齡（朔望月 29.53 天），以陽光方向即時照亮球體 */
const SYN=29.530588853, NEW0=Date.UTC(2000,0,6,18,14);
// 結局演出時可以暫時指定月相（滿月），演完恢復真實月相
let phaseFix=null;
const phase=()=>phaseFix!=null?phaseFix:((((Date.now()-NEW0)/864e5)/SYN)%1+1)%1, illum=()=>(1-Math.cos(2*Math.PI*phase()))/2;
const PH_EMO=['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'], phEmo=()=>PH_EMO[Math.round(phase()*8)%8];
window.__MOONPH={phase,illum,emo:phEmo,fix:v=>{ phaseFix=v; },dir:(h,out)=>moonDir(h,out)};
const uL={value:new T.Vector3(0,0,1)};
moon.material.onBeforeCompile=sh=>{ sh.uniforms.uL=uL;
  sh.vertexShader='varying vec3 vNw;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNw=normalize(mat3(modelMatrix)*normal);');
  sh.fragmentShader='uniform vec3 uL;\nvarying vec3 vNw;\n'+sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n  float lit_=smoothstep(-0.06,0.12,dot(normalize(vNw),uL));\n  diffuseColor.rgb*=mix(0.035,1.0,lit_);'); };
const toV=new T.Vector3(), rgt=new T.Vector3(), upY=new T.Vector3(0,1,0);
/* 月亮真實軌跡：月亮比太陽晚升（月相×24 小時），依台灣緯度 23.7° 算時角→高度角、方位角。
   世界座標與星空相同：往 −Z 是南、+Z 是北、−X 是東。 */
const LAT=23.7*Math.PI/180, DEC=8*Math.PI/180;
function moonDir(hour,out){ const H=((hour-12-phase()*24)/24)*2*Math.PI;            // 時角：0＝正南上中天
  const sa=Math.sin(LAT)*Math.sin(DEC)+Math.cos(LAT)*Math.cos(DEC)*Math.cos(H), alt=Math.asin(sa);
  const az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(LAT)-Math.tan(DEC)*Math.cos(LAT));   // 由南起算、往西為正
  const ch=Math.cos(alt); return out.set(-Math.sin(az)*ch*-1,Math.sin(alt),-Math.cos(az)*ch); }
const hc=document.createElement('canvas'); hc.width=hc.height=128; { const x=hc.getContext('2d'), g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(200,220,255,.55)'); g.addColorStop(.35,'rgba(150,180,255,.18)'); g.addColorStop(1,'rgba(120,150,255,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); }
const halo=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(hc),blending:T.AdditiveBlending,depthWrite:false,fog:false,transparent:true}));
halo.renderOrder=-2; S.add(halo);
/* 霜汐：坐在岩石上的美人魚（岩石用 Poly Haven 掃描模型） */
const spot=(typeof SPOTS!=='undefined'&&SPOTS.find(s=>s.id==='moon'))||{pos:[-10,-40],head:.35};
const fw=new T.Vector3(-Math.sin(spot.head),0,-Math.cos(spot.head)), rt=new T.Vector3(Math.cos(spot.head),0,-Math.sin(spot.head));
const NP=new T.Vector3(spot.pos[0],0,spot.pos[1]).addScaledVector(fw,11).addScaledVector(rt,3.5);
const npc=new T.Group(); npc.position.copy(NP); npc.visible=false; S.add(npc);
if(T.GLTFLoader) new T.GLTFLoader().load('rock_moss_set_01.glb',g=>{ const r=g.scene; r.scale.setScalar(1.3); r.position.y=-.35; npc.add(r); });
else { const r=new T.Mesh(new T.DodecahedronGeometry(.9,1),new T.MeshStandardMaterial({color:0x3a4238,roughness:.9})); r.scale.set(1.2,.6,1); npc.add(r); }
// 夜裡的霜汐：用自己的貼圖發光（天越暗越亮），旁邊再放一盞月光，照出臉、頭髮和鱗片的立體感
const merMats=[], moonL=new T.PointLight(0xc8d8ff,0,10,1.3); moonL.position.set(1.2,2.6,1.6); npc.add(moonL);
const moonL2=new T.PointLight(0x8fb0ff,0,7,1.5); moonL2.position.set(-1.4,1.4,-1.0); npc.add(moonL2);
function merNight(){ const lt=W.info?W.info.light:1, k=Math.max(0,.65-lt); merMats.forEach(m=>m.emissiveIntensity=.12+k*1.9); moonL.intensity=k*4.5; moonL2.intensity=k*2.2; }
const merT=new T.TextureLoader().load('mer_front2.png',t=>{ const a=t.image.width/t.image.height; mer.scale.set(1.9*a,1.9,1); }); merT.encoding=T.sRGBEncoding;
const mer=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:merT,transparent:true,alphaTest:.05,depthWrite:true,side:T.DoubleSide,fog:false}));
mer.position.y=1.25; npc.add(mer);
/* 3D 霜汐：載入後取代平面圖（依玩家設定圖生成的模型） */
let mer3=null;
if(T.GLTFLoader) new T.GLTFLoader().load('models/mermaid_v2.glb',g=>{ const o=g.scene; o.traverse(x=>{ if(x.isMesh){ const mp=x.material.map; if(mp){ mp.generateMipmaps=false; mp.minFilter=T.LinearFilter; } x.material=new T.MeshStandardMaterial({map:mp||null,vertexColors:!mp&&!!x.geometry.attributes.color,roughness:.42,metalness:.08,emissive:new T.Color(0xe4ecff),emissiveMap:mp||null,emissiveIntensity:.15}); merMats.push(x.material); x.frustumCulled=false; } });
  o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), s=1.9/Math.max(sz.y,1e-6); o.scale.setScalar(s);
  o.updateMatrixWorld(true); const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,.15-b2.min.y,-c2.z);
  mer3=new T.Group(); mer3.add(o); npc.add(mer3); mer.visible=false; mer3.updateMatrixWorld(true); try{ if(window.__MER){ const ctl=window.__MER.rig(o); merMats.push(ctl.mesh.material); let wv=0;
      merRig={pose:p=>{ ctl.swim(Math.min(.6,p.tail*2.2)); if(p.breathe>.015) ctl.talk(.3); if(p.tail>.17&&(wv-=.016)<=0){ wv=9; ctl.wave(); ctl.smile(4); } }}; }   // 霜汐：完整骨架與表情，靠近時微笑揮手、說話時嘴巴會動
    else merRig=autoRig(o,'tail'); }catch(e){ console.warn('mer rig',e); } });
let merRig=null;
const glow=new T.Sprite(new T.SpriteMaterial({map:halo.material.map,color:0x66ccff,blending:T.AdditiveBlending,depthWrite:false,transparent:true})); glow.scale.set(4,4,1); glow.position.y=1.2; npc.add(glow);
/* 對話介面 */
const st=document.createElement('style'); st.textContent=`
#moonTalk{position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 36px);z-index:6;width:62px;height:62px;padding:0;border-radius:50%;border:1px solid rgba(160,210,255,.6);background:radial-gradient(circle at 40% 35%,rgba(90,130,210,.95),rgba(50,40,120,.95));color:#eaf4ff;font-weight:800;font-size:11px;line-height:1.1;box-shadow:0 0 16px rgba(110,180,255,.55);font-family:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;white-space:nowrap}
#moonTalk.hidden,#moonBox.hidden{display:none}#moonTalk.dot::after{content:'';position:absolute;top:4px;right:6px;width:10px;height:10px;border-radius:50%;background:#ffd56a}#moonTalk .ic{font-size:24px}
#moonBox{position:fixed;inset:0;z-index:9;background:rgba(4,10,24,.72);display:flex;align-items:flex-end;justify-content:center}
#moonBox .mb{width:min(560px,100%);max-height:84vh;overflow:auto;touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:linear-gradient(180deg,rgba(18,30,58,.98),rgba(12,18,34,.98));border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));color:#e6f0ff;border-top:1px solid rgba(150,200,255,.35)}
#moonBox h3{margin:0 0 6px;font-size:19px;display:flex;justify-content:space-between;align-items:center;color:#cfe6ff}
#moonBox .ch{margin:14px 0;padding:12px 14px;border-radius:14px;background:rgba(120,170,255,.08);line-height:1.75;font-size:15px}
#moonBox .ch b{display:block;color:#ffd56a;margin-bottom:4px;font-size:14px}#moonBox .ch.lock{opacity:.55;padding:10px 14px}#moonBox .ch.lock b{color:#9fb8d8}#moonBox .ch small{color:#9fb8d8;font-size:12px}#moonBox .ch.tip{background:rgba(255,213,106,.1);border:1px solid rgba(255,213,106,.35)}#moonBox .ch.tip b{color:#ffd56a}#moonBox .ch em{font-style:normal;font-weight:800;color:#ffe9a8}#moonBox .pg{font-size:13px;color:#9fb8d8}`;
document.head.appendChild(st);
const tb=document.createElement('button'); tb.id='moonTalk'; tb.className='hidden'; tb.innerHTML='<span class="ic">🧜‍♀️</span>霜汐'; tb.setAttribute('aria-label','與霜汐說話'); document.body.appendChild(tb);
const box=document.createElement('div'); box.id='moonBox'; box.className='hidden'; box.innerHTML='<div class="mb"></div>'; document.body.appendChild(box);
const unlocked=()=>MS.done?7:MS.met?Math.min(6,MS.sc):0;
function render(){ const n=unlocked(), sc=Math.min(7,MS.sc);
  const pips='🌙'.repeat(sc)+'○'.repeat(7-sc);
  let h=`<h3>霜汐<button class="sbtn" data-m="x">✕</button></h3><div class="pg">月鱗 ${sc}/7　${pips}</div>`;
  if(!MS.done){ const next=MS.sc>=6?'最後一片在<em>月神鯉</em>的肚子裡。在月光灣的深夜釣起牠。':'在<em>月光灣</em>的<em>深夜（約 19:48～04:48）</em>釣魚，每釣到一條魚有 45% 機率從魚肚裡找到一片月鱗。';
    h+=`<div class="ch tip"><b>🧭 怎麼找月鱗</b>${next}<br><small>找到後回來找霜汐，就會解鎖下一段故事。</small></div>`; }
  for(let i=n;i>=0;i--) h+=`<div class="ch"><b>${MOON_STORY[i].t}</b>${MOON_STORY[i].b}</div>`;
  for(let i=n+1;i<MOON_STORY.length;i++){ const name=i===7?'終章・？？？':MOON_STORY[i].t, cond=i===7?'集齊 7 片月鱗後解鎖':i===6?`找到第 6 片月鱗後解鎖`:`找到第 ${i} 片月鱗後解鎖`;
    h+=`<div class="ch lock"><b>🔒 ${name}</b><small>${cond}</small></div>`; }
  box.firstChild.innerHTML=h; }
tb.addEventListener('click',()=>{ if(!MS.met){ MS.met=true; c.toast('🌙 任務：在月夜的月光灣釣魚，找回 7 片月鱗','good',3200); }
  MS.read=unlocked(); c.persist(); render(); box.classList.remove('hidden'); tb.classList.remove('dot'); });
box.addEventListener('click',e=>{ if(e.target===box||e.target.closest('[data-m=x]')) box.classList.add('hidden'); });

let act=0;
const active=()=>c.zoneId()==='moon'&&c.period()==='night'&&(G.loc||'lake')!=='sea';
function koiK(){ if(!active()) return 0; return MS.done?1.5:MS.sc>=6?40:0; }
function onCatch(fd){ if(!fd||fd.item||!active()||!MS.met) return;
  if(MS.sc<6&&fd.sp.id!=='moonkoi'&&Math.random()<.25+.3*illum()){ MS.sc++; c.persist(); tb.classList.add('dot'); setTimeout(()=>scaleFx(MS.sc),1200); }
  else if(fd.sp.id==='moonkoi'&&!MS.done&&MS.sc>=6){ MS.sc=7; MS.done=true; c.persist(); c.giveRod(); tb.classList.add('dot');
    setTimeout(()=>{ scaleFx(7); c.toast('🌙 第七片月鱗！月光連成了一條路……去找霜汐吧','good',4000); },1200); } }
/* 找到月鱗：發光的鱗片在畫面中央浮現、旋轉放大，再飛向霜汐按鈕 */
const fx=document.createElement('div'); fx.id='scaleFx'; fx.innerHTML='<i></i><b></b>'; document.body.appendChild(fx);
const st2=document.createElement('style'); st2.textContent=`#scaleFx{position:fixed;left:50%;top:42%;z-index:26;pointer-events:none;display:none;transform:translate(-50%,-50%)}
#scaleFx i{display:block;width:84px;height:110px;margin:0 auto;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:radial-gradient(ellipse at 40% 30%,#ffffff,#cfe6ff 35%,#7fb6ff 70%,rgba(80,140,255,0) 72%);box-shadow:0 0 30px 10px rgba(140,190,255,.8),0 0 70px 20px rgba(120,160,255,.4)}
#scaleFx b{display:block;margin-top:14px;text-align:center;color:#eaf4ff;font-size:22px;font-weight:900;text-shadow:0 0 12px rgba(120,170,255,.9);white-space:nowrap}
#scaleFx.go{display:block;animation:scF 2.6s ease-in-out forwards}#scaleFx.go i{animation:scS 2.6s ease-in-out forwards}
@keyframes scS{0%{transform:scale(.2) rotate(-30deg);opacity:0}20%{transform:scale(1.15) rotate(10deg);opacity:1}35%{transform:scale(1) rotate(0)}100%{transform:scale(.9) rotate(360deg)}}
@keyframes scF{0%,70%{left:50%;top:42%;opacity:1}100%{left:calc(100% - 46px);top:calc(100% - 70px);opacity:0;transform:translate(-50%,-50%) scale(.3)}}`;
document.head.appendChild(st2);
function scaleFx(n){ fx.querySelector('b').textContent=`🌙 月鱗 ${Math.min(7,n)}/7`; fx.classList.remove('go'); void fx.offsetWidth; fx.classList.add('go');
  if(c.Snd&&c.Snd.fanfare) c.Snd.fanfare(1); if(c.vib) c.vib([30,40,30,40,90]); setTimeout(()=>fx.classList.remove('go'),2700);
  if(n<7) setTimeout(()=>c.toast('找到新的月鱗！去聽霜汐的故事','good',2600),2300); }
let endGlow=0;
const cam=new T.Vector3();
// 靠近月光灣時，霜汐會轉頭看你、輕輕擺尾，並依故事進度主動說話（頭上的對話泡泡）
const say=document.createElement('div'); say.style.cssText='position:fixed;z-index:15;max-width:62vw;padding:9px 13px;border-radius:14px;background:rgba(14,22,40,.78);border:1px solid rgba(190,215,255,.35);color:#e9f1ff;font-size:14px;line-height:1.6;pointer-events:none;opacity:0;transition:opacity .6s;transform:translate(-50%,-100%);text-shadow:0 1px 3px #000;font-family:"Noto Serif TC",serif';
document.body.appendChild(say);
const SAYV=new T.Vector3(); let sayT=0, sayI=0, sayNear=false, sayLast='', sayOn=0;
function sayLines(){ const S=window.__STORY, d=id=>!!(S&&S.done&&S.done(id)), end=c.save&&c.save.story&&c.save.story.ending;
  if(end) return ['我回來看看你。海很好，爸爸（滄淵）也很好。','林秋月說，她在海的那一邊，也看得見碼頭的燈。','今晚的月潮，是為你亮的。','老漁人的椅子……你一直替他擦得很乾淨呢。'];
  const L=[]; if(d('lantern')) L.push('林秋月最近常常坐在浮萍灣，望著碼頭的方向。','謝謝你，把那盞燈帶給她（林秋月）。');
  if(d('c5')) L.push('河口的門外面就是海。我已經四十年沒聞過海的味道了。','如果你在海上遇見很大很大的影子……別怕他。','他（滄淵）其實不兇。他只是一直在找人。');
  else if(d('c3')) L.push('颱風那年倒下的樹，到現在還橫在湖裡。','他（老漁人）說過，總有一天會有人把手記找齊。','浮萍灣那邊……夜裡別划太近。');
  else L.push('……你也是來看燈的嗎？','這座湖，以前每個滿月都會有一盞燈。','你身上，有老漁人手記的味道。');
  return L; }
function updSay(dt,dist,show){ const want=show&&dist<20; if(want&&!sayNear){ sayNear=true; sayT=.6; } if(!want&&sayNear){ sayNear=false; sayT=0; say.style.opacity=0; }
  if(!sayNear) return; sayT-=dt; if(sayT<=0){ const L=sayLines(); let t=L[sayI%L.length]; if(t===sayLast&&L.length>1){ sayI++; t=L[sayI%L.length]; } sayI++; sayLast=t; say.textContent=t; say.style.opacity=1; sayOn=4.8; sayT=8.5; }
  sayOn-=dt; if(sayOn<=0) say.style.opacity=0;
  SAYV.set(NP.x,NP.y+2.55,NP.z).project(W.camera); const vis=SAYV.z<1; say.style.left=((SAYV.x+1)/2*innerWidth)+'px'; say.style.top=((1-SAYV.y)/2*innerHeight)+'px'; if(!vis) say.style.opacity=0; }
function update(dt){ W.camera.getWorldPosition(cam); merNight();
  const nk=W.U.uNight?W.U.uNight.value:0, cl=W.U.uCloud?W.U.uCloud.value:0, vis=nk*(1-.8*Math.min(1,cl));
  moonDir(c.hour?c.hour():22,MD); const above=MD.y>-.02;
  const th=2*Math.PI*phase(), il=illum(); toV.copy(MD).negate(); rgt.crossVectors(MD,upY).normalize();
  uL.value.copy(toV).multiplyScalar(-Math.cos(th)).addScaledVector(rgt,Math.sin(th)).normalize();
  W.U.uMoonDir.value.copy(MD); W.U.uMoonK.value=vis*Math.max(0,il)*(above?Math.min(1,MD.y*8+.2):0); if(W.U.uMoonCol) W.U.uMoonCol.value.set(0,0,0);   // 關掉天空著色器裡的程序化滿月，避免從暗面透出
  moon.visible=halo.visible=vis>.02&&il>.03&&above; if(moon.visible){ moon.position.copy(cam).addScaledVector(MD,780); moon.scale.setScalar(26); { const k=Math.min(1,vis*1.3); moon.material.color.setRGB(1.7*k,1.7*k,1.75*k); }
    halo.position.copy(cam).addScaledVector(MD,770); halo.scale.set(150,150,1); halo.material.opacity=vis*(.25+.75*il); }
  act+=((active()?1:0)-act)*Math.min(1,dt*.8);
  { const ended=c.save&&c.save.story&&c.save.story.ending, nightK=Math.max(0,Math.min(1,(.25-W.info.day)*5)), want=ended&&c.G&&c.G.loc==='lake'?.35*nightK:0;   // 月潮回來後：湖上夜晚永遠帶著淡淡的生物螢光
    endGlow+=(want-endGlow)*Math.min(1,dt*.5); W.U.uBio.value=Math.max(act,endGlow); }
  npc.visible=act>.05; if(npc.visible){ mer.material.opacity=act; mer.rotation.y=Math.atan2(cam.x-NP.x,cam.z-NP.z); if(mer3) mer3.rotation.y=mer.rotation.y; { const tt=performance.now()/1000, dd=Math.hypot(cam.x-NP.x,cam.z-NP.z), nearK=Math.max(0,Math.min(1,(22-dd)/10)), talk=sayOn>0?1:0;
      if(mer3) mer3.position.y=Math.sin(tt*1.1)*.05*(1+nearK);   // 在水裡輕輕上下浮動
      if(merRig) merRig.pose({t:tt,tail:.1+.12*nearK,tailF:1.6+.8*nearK,breathe:.012+.01*talk,headPitch:.06+.12*talk*Math.abs(Math.sin(tt*2.2))+.04*Math.sin(tt/2.3),headYaw:.15*Math.sin(tt/3.1)*(1-nearK),headRoll:.1*nearK*Math.sin(tt*.8)}); } glow.material.opacity=.5*act*(0.8+0.2*Math.sin(performance.now()*.002)); }
  updSay(dt,Math.hypot(cam.x-NP.x,cam.z-NP.z),npc.visible&&act>.5&&!(window.__ENDON&&window.__ENDON())&&!(c.G&&c.G.state==='home'));
  const near=npc.visible&&Math.hypot(cam.x-NP.x,cam.z-NP.z)<35; tb.classList.toggle('hidden',!near||act<.5);
  if(near&&MS.read<unlocked()) tb.classList.add('dot'); }
return {update,onCatch,koiK,active,scaleFx};
}
/* ===== 第一人稱雙手（Sketchfab「First Person arms」by bumstrum，CC-BY） ===== */
function createArms(W,P){
'use strict';
const T=THREE, S=W.scene, reel=P.reelObj, crank=P.crankObj, rod=P.rod;
const arms=[]; let ready=false;
// 左手：往前握前握把末端；右手：轉右側搖柄把手（捲線器座標：x 沿竿向前、y 向上、z 搖柄側）
const GRIP=new T.Vector3(-.2,-.012,-.006), KNOB=new T.Vector3(0,-.05,.03);
const SH_R=new T.Vector3(.2,-.8,.15), SH_L=new T.Vector3(-.28,-.8,.12);
const CURL=[.7,1,.8];                       // 手指三節的彎曲比例（−X 為握拳方向，實測）
function setup(g){
  for(const side of ['R','L']){
    const o=T.SkeletonUtils?T.SkeletonUtils.clone(g.scene):g.scene.clone(true);
    let wrist=null, root=null, other=null, palm=null; const fing=[];
    o.traverse(b=>{ if(!b.isBone) return; const n=b.name;
      if(n.indexOf(side+'_wrist')===0) wrist=b; if(n.indexOf(side+'_arm')===0) root=b; if(n.indexOf(side+'_palm')===0) palm=b;
      if(n.indexOf((side==='R'?'L':'R')+'_arm')===0) other=b;
      const m=n.match(new RegExp('^'+side+'_(point|middle|ring|pink)([123])')); if(m) fing.push({b,k:CURL[+m[2]-1],x0:b.rotation.x});
      const th=n.match(new RegExp('^'+side+'_thumb([123])')); if(th) fing.push({b,k:[.45,.6,.5][+th[1]-1],x0:b.rotation.x}); });   // 拇指同樣繞 −X 內收扣住竿子（實測）
    if(!wrist||!root) continue;
    if(other) other.scale.setScalar(1e-4);
    o.traverse(m=>{ m.frustumCulled=false; if(m.isMesh){ m.renderOrder=2; (Array.isArray(m.material)?m.material:[m.material]).forEach(mm=>{ mm.envMapIntensity=.32; mm.roughness=.95; mm.metalness=0; mm.bumpMap=WEAVE; mm.bumpScale=.0016; mm.needsUpdate=true; }); } });   // 布料不像塑膠：降低環境反光、全霧面，加上細細的布紋凹凸
    const grp=new T.Group(); grp.add(o); S.add(grp); grp.updateMatrixWorld(true);
    const wl=new T.Vector3().setFromMatrixPosition(wrist.matrixWorld), rl=new T.Vector3().setFromMatrixPosition(root.matrixWorld);
    const pl=palm?new T.Vector3().setFromMatrixPosition(palm.matrixWorld):wl.clone();
    const ld=new T.Vector3().subVectors(wl,rl), L0=ld.length(); ld.normalize();
    arms.push({side,grp,wl,rl,pl,ld,L0,fing,grip:.85});
    if(W.reflHide) W.reflHide(grp);
  }
  ready=arms.length===2; }
// 布紋：細密的斜紋織布凹凸（外套、袖子），近看有布料質感
const WEAVE=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); const d=x.createImageData(64,64);
  for(let j=0;j<64;j++) for(let i2=0;i2<64;i2++){ const v=128+60*Math.sin((i2+j)*.98)*Math.sin((i2-j)*.98*.5)+(Math.random()-.5)*40, k=(j*64+i2)*4; d.data[k]=d.data[k+1]=d.data[k+2]=v; d.data[k+3]=255; }
  x.putImageData(d,0,0); const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(14,14); return t; })();
if(T.GLTFLoader) new T.GLTFLoader().load('models/arms.glb',setup);
/* 雙手補光：掛在鏡頭上、只照 2 米內，亮度跟著日照，夜裡不會像戴頭燈 */
const fill=new T.PointLight(0xfff2e0,0,2.2,1.6); W.camera.add(fill); fill.position.set(.15,.1,.1); if(!W.camera.parent) S.add(W.camera);
const tg=new T.Vector3(), sh=new T.Vector3(), wd=new T.Vector3(), q=new T.Quaternion(), q2=new T.Quaternion(), cq=new T.Quaternion(),
  upW=new T.Vector3(), upM=new T.Vector3(), sd=new T.Vector3(), tmp=new T.Vector3(), off=new T.Vector3(), pg=new T.Vector3();
let back=0, fwd=0, lastSt='', reelK=0;
let pullK=0, lungeK=0;
function update(show,st,power,dt,pad){
  if(!ready) return; dt=dt||.016; fill.intensity=show?(W.info?W.info.light:1)*(window.__G&&window.__G.loc==='sea'?3.2:1.6):0;
  /* 揮臂：蓄力時往後上方拉，放開瞬間往前揮，再回原位 */
  if(lastSt==='charge'&&st!=='charge') fwd=1; lastSt=st;
  back+=((st==='charge'?Math.min(1,power||0):0)-back)*Math.min(1,dt*8); fwd=Math.max(0,fwd-dt*2.2);
  const swing=fwd>0?Math.sin((1-fwd)*Math.PI):0;
  const reeling=st==='fight'||st==='retrieve'; reelK+=((reeling?1:0)-reelK)*Math.min(1,dt*6);
  W.camera.getWorldQuaternion(cq);
  // 搏魚用力：按住收線撐魚時雙臂往後上方拉；魚衝刺時被往前拖；張力很大時手在發抖、握得更緊
  const GG=window.__G, ff=GG&&GG.state==='fight'?GG.f:null, T=ff?ff.T||0:0;
  pullK+=(((ff&&GG.held)?T:0)-pullK)*Math.min(1,dt*5); lungeK+=(((ff&&ff.run)?.5+.5*T:0)-lungeK)*Math.min(1,dt*4);
  const shake=T>.78?(T-.78)*.05:0;
  for(const a of arms){ a.grp.visible=show; if(!show) continue;
    if(a.side==='L'){ reel.getWorldPosition(tg); tmp.subVectors(rod.tipW,tg).normalize(); tg.addScaledVector(tmp,.2); }   // 沿竿身往竿尖 20cm，一定在竿上
    else crank.localToWorld(tg.copy(KNOB));
    const pk=pad&&pad.k>.001?pad.k:0; if(pk){ pad.grip(a.side,pg); tg.lerp(pg,pk); }   // 划船：握點移到槳桿
    off.copy(a.side==='R'?SH_R:SH_L); off.y+=.24*back-.08*swing+.06*pullK-.03*lungeK+(Math.random()-.5)*shake; off.z+=.32*back-.3*swing+.13*pullK-.12*lungeK+(Math.random()-.5)*shake; off.x+=(a.side==='R'?.06:-.04)*back;
    W.camera.localToWorld(sh.copy(off));
    wd.subVectors(tg,sh).normalize();
    q.setFromUnitVectors(a.ld,wd);
    upM.set(0,1,0).applyQuaternion(q); upW.set(0,1,0).applyQuaternion(cq);
    upM.addScaledVector(wd,-upM.dot(wd)).normalize(); upW.addScaledVector(wd,-upW.dot(wd)).normalize();
    let roll=Math.atan2(tmp.crossVectors(upM,upW).dot(wd),upM.dot(upW))+(a.side==='R'?-.35:-.6);
    if(a.side==='R') roll+=.45*Math.sin(rod.spin||0)*reelK;                    // 收線：前臂隨搖柄轉動
    q2.setFromAxisAngle(wd,roll); q.premultiply(q2);
    if(a.side==='R'&&reelK>.01){ sd.crossVectors(wd,upW).normalize(); q2.setFromAxisAngle(sd,.22*Math.cos(rod.spin||0)*reelK); q.premultiply(q2); }  // 手腕上下擺
    const s=.62/a.L0; a.grp.scale.setScalar(s); a.grp.quaternion.copy(q);
    // 用掌心對準握點，竿子穿過掌心與手指之間
    upM.set(0,1,0).applyQuaternion(q);
    a.grp.position.copy(tg).sub(tmp.copy(a.pl).multiplyScalar(s).applyQuaternion(q)).addScaledVector(upM,.018);
    const tight=a.grip+(reeling?.1:0)+(st==='charge'?.05:0)+.12*T;
    for(const f of a.fing) f.b.rotation.x=f.x0-tight*f.k; } }
return {update};
}
/* ===== 路亞：收線速度、抽竿、魚的興趣（假餌模型：Zverev、xeofox，CC-BY） ===== */
const LURE_CFG={
 crank:{file:'lure_crank',head:'+x',len:.11,drop:['Material__73'],band:[1.0,2.0],twitch:.03,pause:0,dive:1.4,float:true,tip:'曲柄：快速穩定收線，會往下潛'},
 spoon:{file:'lure_spoon',head:'+y',len:.09,pick:1,split:'x',band:[.45,1.7],twitch:.04,pause:0,dive:.5,sink:true,tip:'亮片：中速穩定收線，閃光吸引魚'},
 minnow:{file:'lure_minnow',head:'-z',len:.12,pick:1,split:'y',band:[.25,1.0],twitch:.18,pause:.1,dive:.6,float:true,tip:'米諾：抽一下、停一下，模仿受傷的小魚'}};
function createLure(W,P,c){
'use strict';
const T=THREE, S=W.scene, G=c.G, ang=a=>({'+x':0,'-z':Math.PI/2,'-x':Math.PI,'+z':-Math.PI/2})[a];
const models={}, holder=new T.Group(); holder.visible=false; S.add(holder);
const loader=T.GLTFLoader?new T.GLTFLoader():null;
/* 頂點資料若是交錯排列（模型工具常用），先轉成分開排列，切割與複製才不會讀錯位 */
function plainGeo(g){ const out=new T.BufferGeometry(); if(g.index) out.setIndex(g.index.clone());
  for(const name in g.attributes){ const a=g.attributes[name], n=a.count, it=a.itemSize, arr=new Float32Array(n*it);
    for(let i=0;i<n;i++){ arr[i*it]=a.getX(i); if(it>1) arr[i*it+1]=a.getY(i); if(it>2) arr[i*it+2]=a.getZ(i); if(it>3) arr[i*it+3]=a.getW(i); }
    out.setAttribute(name,new T.BufferAttribute(arr,it)); }
  out.groups=g.groups.slice(); return out; }
function getModel(k){ if(models[k]!==undefined) return models[k]; models[k]=null; const cf=LURE_CFG[k]; if(!loader) return null;
  loader.load('models/'+cf.file+'.glb',g=>{ try{ g.scene.updateMatrixWorld(true); let ms=[]; g.scene.traverse(o=>{ if(o.isMesh) ms.push(o); });
    /* 模型附帶的釣線（曲柄有一條比餌身還長的線）：拿掉，不然尺寸與朝向會把線算進去，餌身被縮成一小點；遊戲本身會畫釣線 */
    if(cf.drop) ms=ms.filter(m=>!cf.drop.includes(m.material&&m.material.name));
    if(cf.pick!==undefined&&ms.length>=3){ const ctr=m=>new T.Box3().setFromObject(m).getCenter(new T.Vector3()); ms.sort((a,b)=>ctr(a).length()-ctr(b).length()); ms=[ms[0]]; }
    /* 3 個假餌合併在同一個網格裡（米諾上下疊、亮片左右排）：只保留位在中間三分之一的三角面 */
    if(cf.split){ const ax=cf.split, B=new T.Box3(); ms.forEach(m=>B.expandByObject(m)); const lo=B.min[ax]+(B.max[ax]-B.min[ax])/3, hi=B.min[ax]+(B.max[ax]-B.min[ax])*2/3;
      ms=ms.map(m=>{ const gp=plainGeo(m.geometry), g0=gp.index?gp.toNonIndexed():gp; g0.applyMatrix4(m.matrixWorld); const P=g0.attributes.position, keep=[];
        for(let i=0;i<P.count;i+=3){ const gf=ax==='x'?'getX':ax==='y'?'getY':'getZ', cc=(P[gf](i)+P[gf](i+1)+P[gf](i+2))/3; if(cc>=lo&&cc<=hi) keep.push(i); }
        const ng=new T.BufferGeometry(); for(const name in g0.attributes){ const a=g0.attributes[name], it=a.itemSize, arr=new a.array.constructor(keep.length*3*it); keep.forEach((v,j)=>{ for(let q=0;q<3*it;q++) arr[j*3*it+q]=a.array[v*it+q]; }); ng.setAttribute(name,new T.BufferAttribute(arr,it,a.normalized)); }
        const nm=new T.Mesh(ng,m.material); nm.updateMatrixWorld(true); return nm; }).filter(m=>m.geometry.attributes.position.count>0); }
    const grp=new T.Group(); ms.forEach(m=>{ const k2=m.clone(); k2.matrixAutoUpdate=false; k2.matrix.copy(m.matrixWorld); grp.add(k2); });
    const inner=new T.Group(); inner.add(grp);
    if(cf.head==='+y') inner.rotation.x=Math.PI/2; else inner.rotation.y=ang('+z')-ang(cf.head);   // 頭朝 +Z
    const w=new T.Group(); w.add(inner); w.updateMatrixWorld(true);
    const b=new T.Box3().setFromObject(w), sz=b.getSize(new T.Vector3()), s=cf.len/Math.max(sz.z,1e-6); inner.scale.setScalar(s); w.updateMatrixWorld(true);
    const c2=new T.Box3().setFromObject(w).getCenter(new T.Vector3()); inner.position.sub(c2);
    w.traverse(o=>{ o.frustumCulled=false; }); if(window.__seeThrough) window.__seeThrough(w); models[k]=w; if(cur&&cur.k===k) show(k); }catch(e){ console.error('lure model '+k+': '+e.message); } },undefined,e=>console.error('lure load '+k));
  return null; }
let cur=null, chaser=null; const pos=new T.Vector3(), dir=new T.Vector3(), tmp=new T.Vector3();
function hideChaser(){ if(chaser){ chaser.group.visible=false; chaser=null; } }
function show(k){ holder.clear(); const m=models[k]; if(m) holder.add(m); }
/* 介面 */
const st=document.createElement('style'); st.textContent=`#lureHud{position:fixed;left:12px;top:calc(var(--hudY,150px) + 54px);z-index:5;width:min(190px,48vw);padding:6px 10px;border-radius:12px;background:rgba(16,22,28,.7);border:1px solid rgba(255,255,255,.16);color:#eaf2f8;font-size:11px;pointer-events:none}
#lureHud.hidden{display:none}#lureHud .bar{position:relative;height:8px;border-radius:4px;background:rgba(255,255,255,.12);margin:6px 0 4px;overflow:hidden}
#lureHud .bar i{position:absolute;top:0;bottom:0;background:rgba(127,240,168,.35)}#lureHud .bar b{position:absolute;top:-2px;width:4px;height:12px;border-radius:2px;background:#ffd56a}
#lureHud .st{display:flex;justify-content:space-between}#lureHud .chase{color:#7ff0a8;font-weight:800}`;
document.head.appendChild(st);
const hud=document.createElement('div'); hud.id='lureHud'; hud.className='hidden'; hud.innerHTML='<div class="st"><span class="t"></span><span class="chase"></span></div><div class="bar"><i></i><b></b></div><div class="h">按住收線・短按抽竿</div>'; document.body.appendChild(hud);
const hT=hud.querySelector('.t'), hC=hud.querySelector('.chase'), hBand=hud.querySelector('.bar i'), hDot=hud.querySelector('.bar b');
function bobberVis(v){ P.bobber.children.forEach(o=>{ o.visible=v; }); }
function start(at,bait,base){ const k=bait.lure, cf=LURE_CFG[k]; getModel(k); show(k);
  cur={k,cf,base:base.clone(),depth:0,heldT:0,pause:0,speed:0,twitchV:0,chase:null,delay:2+Math.random()*3,interest:0,maxSp:c.reelSpd()*.55,pressT:0};
  pos.copy(at); pos.y=0; holder.visible=true; bobberVis(false); hud.classList.remove('hidden');
  hT.textContent=bait.icon+' '+bait.name; hC.textContent='';
  const mx=2.4; hBand.style.left=(cf.band[0]/mx*100)+'%'; hBand.style.width=((cf.band[1]-cf.band[0])/mx*100)+'%';
  c.toast(cf.tip,'',2600); }
function press(){ if(cur) cur.pressT=performance.now(); }
function release(){ if(!cur) return; if(performance.now()-cur.pressT<220){ cur.twitchV=1.4; cur.twitched=true; c.Snd.plop&&c.Snd.plop(); W.addRipple(pos.x,pos.z,.12); } }
function end(keep){ P.shadow.scale.setScalar(1); if(!keep) hideChaser(); else chaser=null; cur=null; holder.visible=false; hud.classList.add('hidden'); P.shadow.material.opacity=0; }
function update(dt,held){ if(!cur) return null; const cf=cur.cf;
  if(held){ cur.heldT+=dt; cur.pause=0; } else { cur.heldT=0; cur.pause+=dt; }
  const target=held?cur.maxSp*Math.min(1,.4+.6*cur.heldT/1.5):0;
  cur.speed+=(target-cur.speed)*Math.min(1,dt*5); cur.twitchV=Math.max(0,cur.twitchV-dt*4);
  dir.set(cur.base.x-pos.x,0,cur.base.z-pos.z); const dist=dir.length(); dir.normalize();
  const v=cur.speed+cur.twitchV; pos.addScaledVector(dir,v*dt);
  const want=cur.speed>.2?cf.dive*Math.min(1,cur.speed/cf.band[1]):(cf.sink?Math.min(2.5,cur.depth+dt*.4):(cf.float?0:cur.depth));
  cur.depth+=(want-cur.depth)*Math.min(1,dt*1.5);
  holder.position.set(pos.x,-cur.depth-.05,pos.z); holder.lookAt(tmp.set(cur.base.x,holder.position.y,cur.base.z));
  holder.rotateZ(Math.sin(performance.now()*.02)*(.15+.6*cur.twitchV)); holder.rotateY(Math.sin(performance.now()*.013)*.25*Math.min(1,v));
  hDot.style.left=Math.min(98,v/2.4*100)+'%';
  /* 魚：先等一段時間才有魚注意到；之後依收線方式調整興趣 */
  let ev=null;
  if(!cur.chase){ cur.delay-=dt; if(cur.delay<=0){ cur.chase={d:3.2}; const f=c.onChase?c.onChase():null; if(f){ chaser=f; f.group.visible=true; if(!f.group.parent) S.add(f.group); f.group.scale.setScalar(f.L); } } }
  else { const inBand=cur.speed>=cf.band[0]&&cur.speed<=cf.band[1];
    // 魚況：清晨黃昏、陰天魚活躍——穩定收線最有效；正午、夜裡、冷天魚遲鈍——要多停頓、抽竿逗牠
    const md=c.mood?c.mood():1, act=md>1.1, slow=md<.9;
    let di=0; if(inBand) di+=(act?.42:slow?.16:.3)*dt; else if(cur.speed>cf.band[1]) di-=(slow?.55:.35)*dt;
    if(cur.pause>0){ if(cf.pause&&cur.pause<1.2) di+=cf.pause*(slow?1.8:act?.6:1)*dt; else if(cur.pause>(slow?2.4:1.6)) di-=.22*dt; else if(!cf.pause&&slow&&cur.pause<1) di+=.12*dt; }
    if(cur.twitched){ di+=cf.twitch*(slow?1.6:act?.8:1); cur.twitched=false; }
    if(!cur.moodShown){ cur.moodShown=true; c.toast(act?'🐟 魚況活躍：穩定收線最有效':slow?'🐟 魚況遲鈍：多停頓、抽竿逗牠':'🐟 魚況普通：收線中偶爾停頓','',2200); }
    cur.interest=Math.max(0,Math.min(1.1,cur.interest+di));
    cur.chase.d+=((3.2-2.8*cur.interest)-cur.chase.d)*Math.min(1,dt*2);
    tmp.copy(pos).addScaledVector(dir,-cur.chase.d); P.shadow.position.set(tmp.x,.02,tmp.z); P.shadow.material.opacity=.15+.35*cur.interest;
    P.shadow.rotation&&(P.shadow.rotation.y=Math.atan2(dir.x,dir.z));
    if(chaser){ /* 真實魚模型跟在假餌後面：越有興趣越靠近水面、跟得越緊、尾巴擺得越快 */
      const g=chaser.group, I=cur.interest, wob=Math.sin(performance.now()*.004)*.35*(1-I);
      g.position.set(tmp.x+dir.z*wob,-(.25-.3*I)+Math.sin(performance.now()*.006)*.01,tmp.z-dir.x*wob); g.rotation.set(0,Math.atan2(-dir.z,dir.x),0);
      chaser.uni.uSwim.value+=dt*(5+9*(cur.speed+I)); chaser.uni.uAmp.value=.05+.04*I;
      { const far=Math.min(1,Math.max(0,(dist-6)/14)); P.shadow.scale.setScalar(1+1.6*far); P.shadow.material.opacity=Math.min(.75,(.15+.35*I)*(.5+.9*far)); }   // 遠處時加強魚下方的暗影，讓人看得出有魚在跟
      if(I>.75&&Math.random()<dt*6) P.splash(g.position.x-dir.x*chaser.L*.3,0,g.position.z-dir.z*chaser.L*.3,2,.18); }   // 背鰭劃開水面
    cur.fx=(cur.fx||0)-dt; if(cur.interest>.45&&cur.fx<=0){ cur.fx=.9-.6*cur.interest; W.addRipple(tmp.x,tmp.z,.12+.25*cur.interest); if(cur.interest>.75) P.splash(tmp.x,0,tmp.z,4,.25); }   // 魚背攪水
    hC.textContent=cur.interest>.7?'🐟 快咬了！':cur.interest>.25?'🐟 有魚在追':'🐟 魚在觀察';
    if(cur.interest>=1&&Math.random()<dt*3){ ev='strike'; pip.strikeT=.9; pip.burst=false; }
    else if(cur.interest<=0&&cur.wasHigh){ hideChaser(); cur.chase=null; cur.delay=2+Math.random()*3; cur.wasHigh=false; hC.textContent=''; P.shadow.material.opacity=0; ev='lost'; }
    if(cur.interest>.3) cur.wasHigh=true; }
  if(!ev&&dist<3.2) ev='done';
  return ev; }
/* ===== 水下鏡頭小視窗：近距離側拍假餌與追逐的魚（只畫這幾樣，不重畫整個場景） ===== */
const pip={scene:new T.Scene(),cam:new T.PerspectiveCamera(42,4/3,.01,40),lure:null,lureK:'',fish:null,fishSrc:null,strikeT:0,x:0};
pip.scene.background=new T.Color(0x0a3644); pip.scene.fog=new T.Fog(0x0a3644,1.2,6.5);
pip.scene.add(new T.HemisphereLight(0xa8e0ff,0x041820,1.3)); { const dl=new T.DirectionalLight(0xdff4ff,.9); dl.position.set(.4,3,1); pip.scene.add(dl); }
{ const fl=new T.Mesh(new T.PlaneGeometry(30,10).rotateX(-Math.PI/2),new T.MeshLambertMaterial({color:0x2e4a3c})); fl.position.y=-.9; pip.scene.add(fl); }
const PN=220, pg2=new T.BufferGeometry(), pp=new Float32Array(PN*3); for(let i=0;i<PN;i++){ pp[i*3]=(Math.random()-.5)*8; pp[i*3+1]=-.8+Math.random()*2.4; pp[i*3+2]=(Math.random()-.5)*4; }
pg2.setAttribute('position',new T.BufferAttribute(pp,3)); const motes=new T.Points(pg2,new T.PointsMaterial({color:0xcfefff,size:.007,transparent:true,opacity:.55,depthWrite:false})); pip.scene.add(motes);
const rays=[]; for(let i=0;i<5;i++){ const m=new T.Mesh(new T.PlaneGeometry(.35,4),new T.MeshBasicMaterial({color:0x9fdcff,transparent:true,opacity:.07,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide})); m.position.set(-3+i*1.5,.6,-1.2); m.rotation.z=.35; pip.scene.add(m); rays.push(m); }
const bub=[]; for(let i=0;i<14;i++){ const b=new T.Mesh(new T.SphereGeometry(.012,8,6),new T.MeshBasicMaterial({color:0xe8f8ff,transparent:true,opacity:.7})); b.visible=false; pip.scene.add(b); bub.push({b,v:0}); }
const frame=document.createElement('div'); frame.id='pipFrame'; frame.innerHTML='<span>🎥 水下鏡頭</span>'; document.body.appendChild(frame);
const pst=document.createElement('style'); pst.textContent=`#pipFrame{position:fixed;z-index:5;border:2px solid rgba(160,220,255,.7);border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.4);pointer-events:none;display:none}#pipFrame span{position:absolute;left:6px;top:4px;font-size:11px;font-weight:800;color:#dff4ff;text-shadow:0 1px 3px #000}`; document.head.appendChild(pst);
function pipSync(){ if(!cur) return;
  if(!pip.glint){ pip.glint=new T.PointLight(0xfff4e0,1.6,5,1.5); pip.glint.position.set(.6,1,1.4); pip.scene.add(pip.glint); }   // 亮片轉動時的高光來源
  if(pip.lureK!==cur.k&&models[cur.k]){ if(pip.lure) pip.scene.remove(pip.lure);
    const m=models[cur.k].clone(true); m.position.set(0,0,0); m.rotation.set(0,0,0); m.scale.multiplyScalar(2.2); m.updateMatrixWorld(true);
    // 子畫面專用材質複本（只改複本，主畫面與魚不受影響）。子畫面沒有環境貼圖，金屬度高的表面會幾乎全黑，
    // 所以所有假餌都限制金屬度：亮片保留一點金屬感（.35）並靠點光源產生高光；米諾、曲柄實際是塑膠（.15）。
    // 原本就半透明的部分（例如曲柄的潛水板）保持半透明，其餘改為不透明。
    m.traverse(o=>{ if(!o.isMesh) return; const mt=o.material.clone(), seeThru=mt.opacity<.99;
      mt.transparent=seeThru; mt.depthWrite=!seeThru;
      if(mt.metalness!==undefined){ const sp=cur.k==='spoon'; mt.metalness=Math.min(mt.metalness,sp?.35:.15);
        mt.roughness=Math.min(mt.roughness==null?1:mt.roughness,sp?.28:.45);
        if(sp&&mt.emissive){ mt.emissive=new T.Color(0x223338); mt.emissiveIntensity=1; } }
      o.material=mt; o.renderOrder=seeThru?1:0; });
    // 自動量測：最薄的方向轉向鏡頭（正面朝你），最長的方向轉成水平（身體橫向）
    const sz=new T.Box3().setFromObject(m).getSize(new T.Vector3()), d=[sz.x,sz.y,sz.z], A=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)];
    const thin=d.indexOf(Math.min(...d)), lng=[0,1,2].filter(i=>i!==thin).sort((a,b)=>d[b]-d[a])[0];
    const aL=A[lng], aT=A[thin], aM=new T.Vector3().crossVectors(aT,aL);
    const src=new T.Matrix4().makeBasis(aL,aM,aT), dst=new T.Matrix4().makeBasis(new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1));
    m.quaternion.setFromRotationMatrix(dst.multiply(src.transpose()));
    const ctr=new T.Box3().setFromObject(m).getCenter(new T.Vector3()); m.position.sub(ctr);
    pip.lure=new T.Group(); pip.lure.add(m); pip.scene.add(pip.lure); pip.lureK=cur.k; }
  if(chaser&&pip.fishSrc!==chaser.group){ if(pip.fish) pip.scene.remove(pip.fish); pip.fish=chaser.group.clone(true); pip.fish.visible=true; pip.fishSrc=chaser.group; pip.scene.add(pip.fish); }
  if(!chaser&&pip.fish&&pip.strikeT<=0){ pip.scene.remove(pip.fish); pip.fish=null; pip.fishSrc=null; } }
const vs=new T.Vector2();
let pipEnv=null;
function makePipEnv(renderer){ const es=new T.Scene(), g=new T.Mesh(new T.SphereGeometry(10,32,16),new T.ShaderMaterial({side:T.BackSide,
    vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec3 vP; void main(){ float h=normalize(vP).y; vec3 c=mix(vec3(0.03,0.09,0.11),vec3(0.32,0.5,0.55),smoothstep(-0.3,0.9,h)); c+=vec3(0.55,0.65,0.6)*pow(max(h,0.0),10.0); gl_FragColor=vec4(c,1.0); }'}));
  es.add(g); const pm=new T.PMREMGenerator(renderer), rt=pm.fromScene(es,0,.1,50); pm.dispose(); return rt.texture; }   // 子畫面專屬的水下環境反射，金屬假餌才會發亮
function renderPiP(renderer,dt){ const on=(cur||pip.strikeT>0)&&(!c.uwOn||c.uwOn());
  if(!on){ frame.style.display='none'; return; } dt=dt||.016;  pipSync();
  const sp=cur?(cur.speed+cur.twitchV):0, I=cur?cur.interest:1, t=performance.now()*.001;
  const p=motes.geometry.attributes.position.array; for(let i=0;i<PN;i++){ p[i*3]+=dt*(.15+sp*.9); if(p[i*3]>4) p[i*3]-=8; } motes.geometry.attributes.position.needsUpdate=true;
  if(pip.lure){ const k=pip.lureK, tw=cur?cur.twitchV:0, ws=.6+(cur?cur.speed:0); pip.lure.position.set(0,.35+Math.sin(t*2.2)*.02,0);
    // 依假餌種類做真實泳姿（身體軸＝X、正面＝Z）：亮片沿長軸翻轉閃光；曲柄快速擺尾；米諾細微搖擺、抽竿時大擺。收線越快擺得越快
    if(k==='spoon') pip.lure.rotation.set(Math.sin(t*9*ws)*1.15,Math.sin(t*4.5)*.12,Math.sin(t*9*ws+1)*.06);
    else if(k==='crank') pip.lure.rotation.set(Math.sin(t*16*ws+1)*.16,Math.sin(t*16*ws)*.24,Math.sin(t*3)*.04);
    else pip.lure.rotation.set(Math.sin(t*7)*(.1+.5*tw),Math.sin(t*7)*(.07+.6*tw),Math.sin(t*2.6)*.04); }
  let span=.5;
  if(pip.fish){ const L=pip.fishSrc?pip.fishSrc.scale.x:.4; let dx;
    if(pip.strikeT>0){ pip.strikeT-=dt; const k=Math.min(1,(.9-pip.strikeT)/.25); dx=pip.x*(1-k); if(k>=1&&!pip.burst){ pip.burst=true; bub.forEach(o=>{ o.b.visible=true; o.b.position.set((Math.random()-.5)*.2,.35+(Math.random()-.5)*.15,(Math.random()-.5)*.2); o.v=.3+Math.random()*.5; }); } }
    else { dx=.12+L*.55+(cur?cur.chase.d*.32:0)*(1-.6*I); pip.x=dx; }
    pip.fish.position.set(dx,.35-.12*(1-I)+Math.sin(t*1.7)*.03,Math.sin(t*.9)*.08*(1-I)); pip.fish.rotation.set(0,Math.PI,0); span=dx+L*.6; }
  bub.forEach(o=>{ if(!o.b.visible) return; o.b.position.y+=o.v*dt; o.b.position.x+=dt*.2; if(o.b.position.y>1.4) o.b.visible=false; });
  if(pip.strikeT<=0&&!cur){ frame.style.display='none'; pip.burst=false; bub.forEach(o=>o.b.visible=false); return; }
  pip.cam.position.set(span*.45,.42,Math.max(.75,span*1.25)); pip.cam.lookAt(span*.4,.33,0);
  renderer.getSize(vs); const w=Math.round(Math.min(vs.x*.44,240)), h=Math.round(w*.75), x=vs.x-w-10;
  const hy=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hudY'))||150, top=hy+52, yb=vs.y-top-h;
  pip.cam.aspect=w/h; pip.cam.updateProjectionMatrix();
  const ac=renderer.autoClear; renderer.setScissorTest(true); renderer.setScissor(x,yb,w,h); renderer.setViewport(x,yb,w,h); renderer.autoClear=true;
  renderer.render(pip.scene,pip.cam); renderer.setScissorTest(false); renderer.setViewport(0,0,vs.x,vs.y); renderer.autoClear=ac;
  Object.assign(frame.style,{display:'block',left:x+'px',top:top+'px',width:w+'px',height:h+'px'}); }
return {renderPiP,start,update,press,release,end,chaser:()=>chaser,bobberVis,pos:()=>pos,interest:()=>cur?cur.interest:0,active:()=>!!cur};
}
/* ===== 晨霧：貼著水面的低霧層，迎光處被照亮 ===== */
const SH6={};
SH6.vs=`varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
SH6.fs=`
uniform float uTime, uK; uniform vec3 uFog, uSunDir, uSunCol; uniform vec2 uWind; varying vec3 vW;
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
void main(){
  vec2 p=vW.xz*0.045 + uWind*uTime*0.02;
  float n=n2(p)*0.55 + n2(p*2.3 + 7.0 - uWind*uTime*0.015)*0.3 + n2(p*5.1 + 3.0)*0.15;
  vec3 V=vW - cameraPosition; float d=length(V); V/=d;
  float graze=1.0 - smoothstep(0.05, 0.5, abs(V.y));            // 平視水面時最濃
  float a=uK*smoothstep(0.32, 0.85, n)*graze*smoothstep(3.0, 14.0, d)*(1.0 - smoothstep(90.0, 120.0, d));
  float fwd=pow(max(dot(V, normalize(uSunDir)), 0.0), 6.0);      // 迎著太陽：前向散射
  vec3 col=mix(uFog*1.15 + 0.03, uSunCol*0.9 + uFog*0.4, fwd*0.8);
  gl_FragColor=vec4(col, a*0.7);
}`;
function createMorningMist(W,c){
'use strict';
const T=THREE, U={uTime:W.U.uTime,uK:{value:0},uFog:W.U.uFogCol,uSunDir:W.U.uSunDir,uSunCol:W.U.uSunCol||{value:new T.Vector3(1,.85,.6)},uWind:{value:new T.Vector2(1,0)}};
const layers=[]; for(const y of [.35,.9]){ const m=new T.Mesh(new T.PlaneGeometry(240,240).rotateX(-Math.PI/2),new T.ShaderMaterial({uniforms:U,vertexShader:SH6.vs,fragmentShader:SH6.fs,transparent:true,depthWrite:false,side:T.DoubleSide,fog:false}));
  m.position.y=y; m.renderOrder=4; m.frustumCulled=false; W.scene.add(m); layers.push(m); if(W.reflHide) W.reflHide(m); }
const cam=new T.Vector3(); let k=0, wet=0;
/* 晨光光束：沿陽光方向斜射的細長光帶，繞光軸面向鏡頭（軸向看板） */
const sc=document.createElement('canvas'); sc.width=64; sc.height=256; { const x=sc.getContext('2d'), im=x.createImageData(64,256);
  const subs=[]; for(let k=0;k<5;k++) subs.push({c:(Math.random()-.5)*.7,w:.03+Math.random()*.07,b:.45+Math.random()*.55});   // 光帶內數條細光線，中間有暗縫
  for(let j=0;j<256;j++) for(let i=0;i<64;i++){ const u=(i+.5)/64-.5, v=j/255; let st=0; for(const q of subs) st=Math.max(st,q.b*Math.exp(-Math.pow((u-q.c)/q.w,2)));
    const a=(.25*Math.exp(-u*u*28)+.75*st)*Math.pow(Math.max(0,Math.sin(Math.PI*v)),.8)*(.35+.65*(1-v)); const o=(j*64+i)*4; im.data[o]=255; im.data[o+1]=240; im.data[o+2]=210; im.data[o+3]=Math.round(255*Math.min(1,a)); }
  x.putImageData(im,0,0); }
const sTex=new T.CanvasTexture(sc), shafts=[];
for(let i=0;i<10;i++){ const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:sTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false,opacity:0,color:0xffe2b8}));
  m.matrixAutoUpdate=false; m.frustumCulled=false; m.renderOrder=5; m.visible=false; W.scene.add(m); if(W.reflHide) W.reflHide(m);
  shafts.push({m,occ:1,occT:1,off:(i/9-.5)*0.9+(Math.random()-.5)*.12,dist:16+Math.random()*30,w:2.2+Math.random()*3.6,len:24+Math.random()*14,ph:Math.random()*6.28}); }
/* 遮擋：每 1.5 秒對每道光束的左中右三點往太陽方向打射線，被樹、枯木、岩石、遊艇擋住就變暗 */
const rc=new T.Raycaster(); rc.far=70; const ro=new T.Vector3(); let occClock=0;
function occluders(){ const list=[]; W.scene.children.forEach(o=>{ if(!o.visible) return; if((o.userData&&o.userData.lake)||o.userData.occ) list.push(o); }); if(c.extraOcc) c.extraOcc().forEach(o=>o&&o.visible&&list.push(o)); return list; }
function updOcc(sd2,rt2){ const occ=occluders(); if(!occ.length){ shafts.forEach(s2=>s2.occT=1); return; }
  for(const s2 of shafts){ let hit=0; const b=s2.base||ro;
    for(const k of [-.35,0,.35]){ ro.copy(b).addScaledVector(rt2,k*s2.w).setY(.3); rc.set(ro,sd2); if(rc.intersectObjects(occ,true).length) hit++; }
    s2.occT=1-.8*(hit/3); } }
const sd=new T.Vector3(), hs=new T.Vector3(), ctr=new T.Vector3(), vd=new T.Vector3(), rt=new T.Vector3(), nm=new T.Vector3(), base=new T.Vector3();
function updShafts(dt){ const sun=W.U.uSunDir.value, vis=(W.U.uSunVis?W.U.uSunVis.value:1)*(1-.9*Math.min(1,(W.U.uCloud?W.U.uCloud.value:0)));
  const K=Math.min(1,k*1.6)*vis*(sun.y>-.02?1:0); hs.set(sun.x,0,sun.z); const hl=hs.length(); if(hl<1e-3||K<.01){ shafts.forEach(s=>s.m.visible=false); return; } hs.divideScalar(hl);
  const el=Math.max(.42,Math.atan2(sun.y,hl)); sd.set(hs.x*Math.cos(el),Math.sin(el),hs.z*Math.cos(el));   // 太低時抬高光束角度，避免躺平
  W.camera.getWorldDirection(vd); const face=Math.max(0,vd.x*hs.x+vd.z*hs.z), tt=performance.now()*.001;
  occClock-=dt; if(occClock<=0){ occClock=1.5; rt.set(-hs.z,0,hs.x); updOcc(sd,rt); }
  for(const s of shafts){ const a=Math.atan2(hs.x,hs.z)+s.off; base.set(cam.x+Math.sin(a)*s.dist,0,cam.z+Math.cos(a)*s.dist); s.base=(s.base||new T.Vector3()).copy(base); s.occ+=(s.occT-s.occ)*Math.min(1,dt*1.5);
    ctr.copy(base).addScaledVector(sd,s.len*.5); vd.subVectors(cam,ctr).normalize();
    rt.crossVectors(sd,vd).normalize(); nm.crossVectors(rt,sd).normalize();
    s.m.matrix.makeBasis(rt.clone().multiplyScalar(s.w),sd.clone().multiplyScalar(s.len),nm).setPosition(ctr); s.m.matrixWorld.copy(s.m.matrix);
    s.m.material.opacity=Math.min(.9,K*(.25+.7*face)*(.55+.45*Math.sin(tt*.35+s.ph))*2.0*s.occ); s.m.visible=true; } }
function mistK(){ const h=((c.hour()%24)+24)%24; const dawn=Math.exp(-Math.pow((h-6.5)/1.1,2)), dusk=.35*Math.exp(-Math.pow((h-19.2)/.9,2)); return Math.max(dawn,dusk); }
function update(dt){ W.camera.getWorldPosition(cam); const wx=c.wx?c.wx():{r:0};
  wet=Math.max(wet-dt/240,(wx.r||0)>.3?1:0);                          // 雨後幾分鐘內的早晨更濃
  const target=mistK()*(.75+.5*wet)*(c.sea()?.5:1)*(c.underwater()?0:1);
  k+=(target-k)*Math.min(1,dt*.5); U.uK.value=k;
  const wd=c.wind?c.wind():null; if(wd) U.uWind.value.set(wd.x||1,wd.z||0);
  const q=window.__GFX||'high';
  for(const m of layers){ m.visible=k>.01&&q!=='low'; m.position.x=cam.x; m.position.z=cam.z; }
  if(q==='high') updShafts(dt); else shafts.forEach(s2=>s2.m.visible=false); }
return {update,level:()=>k};
}
/* ===== 冰湖：覆雪冰面與冰洞（雪地材質：Poly Haven snow_02，CC0） ===== */
function createIce(W,c){
'use strict';
const T=THREE, tl=new T.TextureLoader(), rep=(t,n)=>{ t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(n,n); t.anisotropy=4; return t; };
const col=rep(tl.load('snow_Diffuse.jpg'),90); col.encoding=T.sRGBEncoding;
const mat=new T.MeshStandardMaterial({map:col,normalMap:rep(tl.load('snow_nor_gl.jpg'),90),roughnessMap:rep(tl.load('snow_Rough.jpg'),90),roughness:.82,metalness:0,color:0xffffff,envMapIntensity:1.6,normalScale:new T.Vector2(.45,.45)});
// 真實結冰湖面：風吹乾淨的地方是深色透明冰（ambientCG Ice003，CC0，裂紋網），其他地方是積雪；用大範圍雜訊自然混合
const iceC=rep(tl.load('ice_Color.jpg'),60); iceC.encoding=T.sRGBEncoding; const iceN=rep(tl.load('ice_nor.jpg'),60);
mat.onBeforeCompile=sh=>{ sh.uniforms.iceMap={value:iceC}; sh.uniforms.iceNor={value:iceN};
  sh.fragmentShader='uniform sampler2D iceMap; uniform sampler2D iceNor;\nfloat hh_(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\nfloat vn_(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh_(i),hh_(i+vec2(1,0)),f.x),mix(hh_(i+vec2(0,1)),hh_(i+vec2(1,1)),f.x),f.y); }\n'+sh.fragmentShader;
  sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  vec4 t2_=mapTexelToLinear(texture2D(map,vUv*0.27+vec2(0.31,0.17)));
  diffuseColor.rgb=mix(diffuseColor.rgb,t2_.rgb*diffuse,0.45);
  vec2 q_=vUv*1.2; float n_=vn_(q_)*0.6+vn_(q_*2.7+3.1)*0.3+vn_(q_*7.3+8.2)*0.1;
  float iceK=smoothstep(0.47,0.62,n_);
  vec3 ic_=mapTexelToLinear(texture2D(iceMap,vUv*1.5)).rgb*vec3(0.78,0.9,0.95);
  float edge_=smoothstep(0.47,0.53,n_)*(1.0-smoothstep(0.53,0.6,n_));
  diffuseColor.rgb=mix(diffuseColor.rgb,ic_,iceK)+vec3(0.18,0.2,0.22)*edge_*0.6;`);
  sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n  roughnessFactor=mix(roughnessFactor,0.12,iceK);');
  sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n  { vec3 n2_=texture2D(iceNor,vUv*1.5).xyz*2.0-1.0; normal=normalize(mix(normal,normalize(normal+vec3(n2_.xy*0.25,0.0)),iceK)); }');
};
// 夜裡雪地反射月光與星光，呈藍灰色，不會全黑：依環境亮度補一點自發光
mat.emissive=new T.Color(0x3a4a62); mat.emissiveIntensity=0;
const g=new T.Group(); g.visible=false; W.scene.add(g);
const sheet=new T.Mesh(new T.CircleGeometry(600,96).rotateX(-Math.PI/2),mat); sheet.position.y=.01; g.add(sheet);
// 冰洞：看得到約 35 公分厚的冰層斷面（上白下藍綠、半透明），水面在冰層下，浮著冰沙；洞口一圈是冰鑽帶上來的雪屑
const hole=new T.Group(); hole.visible=false; g.add(hole);
let drilled=false, prog=0, lastKey='';
const wallTex=(()=>{ const cv=document.createElement('canvas'); cv.width=8; cv.height=128; const x=cv.getContext('2d'), gr=x.createLinearGradient(0,0,0,128);
  gr.addColorStop(0,'#eef6fa'); gr.addColorStop(.12,'#cfe6ee'); gr.addColorStop(.45,'#6fa8b8'); gr.addColorStop(.8,'#1e5868'); gr.addColorStop(1,'#0a2a34'); x.fillStyle=gr; x.fillRect(0,0,8,128);
  for(let i=0;i<10;i++){ x.fillStyle='rgba(255,255,255,'+(0.08+Math.random()*.12)+')'; x.fillRect(0,10+Math.random()*100,8,1); }
  const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return t; })();
const wallM=new T.MeshStandardMaterial({map:wallTex,roughness:.15,metalness:0,side:T.BackSide,transparent:true,opacity:.96,emissive:0x2a4a5a,emissiveIntensity:0});
const wall=new T.Mesh(new T.CylinderGeometry(.17,.16,.36,40,1,true),wallM); wall.position.y=-.17; hole.add(wall);
const water=new T.Mesh(new T.CircleGeometry(.165,40).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x07202a,roughness:.05,metalness:.1,envMapIntensity:1.6,emissive:0x12283a,emissiveIntensity:0})); water.position.y=-.06; hole.add(water);
const slushM=new T.MeshStandardMaterial({color:0xdcecf2,roughness:.4,transparent:true,opacity:.85,emissive:0x4a5a72,emissiveIntensity:0});
const slush=[]; for(let i=0;i<9;i++){ const sz=.012+Math.random()*.03, m=new T.Mesh(new T.CircleGeometry(sz,6).rotateX(-Math.PI/2),slushM); const a=Math.random()*6.28, r=Math.random()*.12; m.position.set(Math.cos(a)*r,-.055,Math.sin(a)*r); hole.add(m); slush.push({m,a,r,ph:Math.random()*6}); }
// 雪屑堆：用雪地同一個材質，做成高低不平的一圈
const rimM=new T.MeshStandardMaterial({map:col,color:0xffffff,roughness:.9,emissive:0x4a5a72,emissiveIntensity:0});
{ const rg=new T.RingGeometry(.17,.5,64,8).rotateX(-Math.PI/2), pp=rg.attributes.position;
  for(let i=0;i<pp.count;i++){ const x=pp.getX(i), z=pp.getZ(i), r=Math.hypot(x,z), a=Math.atan2(z,x);
    const bump=Math.sin(a*3+1.2)*.6+Math.sin(a*9+.4)*.35+Math.sin(a*17+2)*.2+(Math.random()-.5)*.9, k=Math.pow(Math.max(0,Math.sin(Math.min(1,Math.max(0,(r-.17)/.33))*Math.PI)),.7);
    pp.setY(i,Math.max(0,k*(.03+.035*bump))*(a>-.6&&a<1.4?1.7:1)); }
  rg.computeVertexNormals(); const rim=new T.Mesh(rg,rimM); rim.position.y=.012; hole.add(rim);
  const lip=new T.Mesh(new T.TorusGeometry(.175,.022,8,40).rotateX(Math.PI/2),rimM); lip.position.y=.02; hole.add(lip);
  // 冰鑽帶上來的壓實雪塊，散在洞口
  for(let i=0;i<11;i++){ const a=Math.random()*6.28, r=.24+Math.random()*.32, s=.018+Math.random()*.035, cl=new T.Mesh(new T.IcosahedronGeometry(s,1),rimM);
    const ps=cl.geometry.attributes.position; for(let j=0;j<ps.count;j++) ps.setXYZ(j,ps.getX(j)*(1+(Math.random()-.5)*.5),ps.getY(j)*(.5+Math.random()*.3),ps.getZ(j)*(1+(Math.random()-.5)*.5)); cl.geometry.computeVertexNormals();
    cl.position.set(Math.cos(a)*r,.015+s*.25,Math.sin(a)*r); cl.rotation.y=Math.random()*6; hole.add(cl); } }
const holePos=new T.Vector3();
// 手搖冰鑽：鑿冰時邊轉邊往下鑽，完成後拔出來
const auger=new T.Group(); auger.visible=false; g.add(auger);
let crankRef=null;
{ const steel=new T.MeshStandardMaterial({color:0x9aa4ac,metalness:.85,roughness:.32}), red=new T.MeshStandardMaterial({color:0xb02a20,metalness:.3,roughness:.45}), grip=new T.MeshStandardMaterial({color:0x1a1a1a,roughness:.8});
  const shaft=new T.Mesh(new T.CylinderGeometry(.018,.018,1.15,10),steel); shaft.position.y=.575; auger.add(shaft);
  const pts=[]; for(let i=0;i<=120;i++){ const a=i/120*Math.PI*2*5.5, y=i/120*.55; pts.push(new T.Vector3(Math.cos(a)*.075,y,Math.sin(a)*.075)); }
  const blade=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),240,.012,6,false),steel); blade.scale.set(1,1,1); auger.add(blade);
  const tip=new T.Mesh(new T.ConeGeometry(.06,.08,10),steel); tip.rotation.x=Math.PI; tip.position.y=-.03; auger.add(tip);
  const crank=new T.Group(); crank.position.y=1.15; auger.add(crank); crankRef=crank;
  const bar=new T.Mesh(new T.CylinderGeometry(.016,.016,.38,8),red); bar.rotation.z=Math.PI/2; bar.position.x=.19; crank.add(bar);
  const k1=new T.Mesh(new T.CylinderGeometry(.022,.022,.12,10),grip); k1.position.set(.38,.06,0); crank.add(k1);
  const top=new T.Mesh(new T.CylinderGeometry(.024,.024,.14,10),grip); top.position.y=.07; crank.add(top);
  auger.traverse(o=>{ o.frustumCulled=false; }); }
let liftT=0;
/* 下雪：冰湖的雨全部換成雪，陰天很重時也會飄小雪 */
const NF=2600, fg=new T.BufferGeometry(), fp=new Float32Array(NF*3), fs=new Float32Array(NF);
for(let i=0;i<NF;i++){ fp[i*3]=(Math.random()-.5)*40; fp[i*3+1]=Math.random()*18; fp[i*3+2]=(Math.random()-.5)*40; fs[i]=Math.random(); }
fg.setAttribute('position',new T.BufferAttribute(fp,3));
const fc=document.createElement('canvas'); fc.width=fc.height=32; { const x=fc.getContext('2d'), gr=x.createRadialGradient(16,16,0,16,16,16); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.5,'rgba(255,255,255,.6)'); gr.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=gr; x.fillRect(0,0,32,32); }
const flakes=new T.Points(fg,new T.PointsMaterial({map:new T.CanvasTexture(fc),size:.16,transparent:true,depthWrite:false,opacity:0,fog:false}));
flakes.frustumCulled=false; W.scene.add(flakes); if(W.reflHide) W.reflHide(flakes);
let snowK=0; const fcam=new T.Vector3();
function updSnow(dt){ const on=c.loc()==='ice', want=on?Math.min(1,Math.max(W.U.uRain.value*1.4,(W.U.uCloud.value-.7)*2.2)):0;
  snowK+=(want-snowK)*Math.min(1,dt*.6); flakes.visible=snowK>.02; if(!flakes.visible) return; flakes.material.opacity=Math.min(.95,snowK);
  W.camera.getWorldPosition(fcam); const p=fg.attributes.position.array, t=performance.now()*.001;
  for(let i=0;i<NF;i++){ const j=i*3; p[j+1]-=dt*(.5+fs[i]*.7); p[j]+=Math.sin(t*.8+fs[i]*20)*dt*.25; p[j+2]+=Math.cos(t*.6+fs[i]*13)*dt*.2;
    if(p[j+1]<0){ p[j+1]+=18; p[j]=(Math.random()-.5)*40; p[j+2]=(Math.random()-.5)*40; } }
  fg.attributes.position.needsUpdate=true; flakes.position.set(fcam.x,0,fcam.z); }
let strT=0;
function update(dt){ dt=dt||.016; updSnow(dt); const on=c.loc()==='ice'; g.visible=on;
  if(on){ const lt=W.info?W.info.light:1, k=Math.max(0,.55-lt); mat.emissiveIntensity=k*.9; rimM.emissiveIntensity=k*.9; water.material.emissiveIntensity=k*1.2; wallM.emissiveIntensity=k*1.2; slushM.emissiveIntensity=k;
    if(drilled){ const tt=performance.now()/1000; slush.forEach(o=>{ o.m.position.x=Math.cos(o.a+tt*.05)*o.r; o.m.position.z=Math.sin(o.a+tt*.05)*o.r; o.m.position.y=-.055+Math.sin(tt*1.3+o.ph)*.003; }); } }
  if(liftT>0){ liftT-=dt; auger.position.y+=dt*.6; auger.rotation.y+=dt*3; if(liftT<=0) auger.visible=false; }
  else if(!drilled&&on&&prog>0&&!(c.held&&c.held())) auger.visible=prog>0;
  if(on&&drilled&&c.state&&c.state()==='fight'){ const T2=c.tens?c.tens():.5; strT-=dt; if(strT<=0){ strT=.5-.35*Math.min(1,T2);   // 冰洞裡的掙扎：依張力冒出水紋與水花
      W.addRipple(holePos.x,holePos.z,.15+.2*T2); if(T2>.6){ c.chips&&0; if(c.splash) c.splash(holePos,T2); } } } if(!on){ drilled=false; prog=0; return; }
  const b=c.base(), h=c.head(), key=b.x.toFixed(1)+','+b.z.toFixed(1)+','+h.toFixed(2); if(key!==lastKey){ lastKey=key; drilled=false; prog=0; auger.visible=false; liftT=0; }
  holePos.set(b.x-Math.sin(h)*1.6,0,b.z-Math.cos(h)*1.6); hole.position.copy(holePos); hole.visible=drilled;
  sheet.position.x=b.x; sheet.position.z=b.z; col.offset.set(b.x/600*90/2,-b.z/600*90/2); }
/* 鑿冰洞：按住約 2 秒，冰屑四濺，完成後冰洞出現 */
function drill(dt){ if(drilled) return 1; prog=Math.min(1,prog+dt/2); auger.visible=true; auger.position.set(holePos.x,.02-prog*.42,holePos.z); auger.rotation.y+=dt*9; if(c.grind&&Math.random()<dt*10) c.grind(); if(Math.random()<dt*14&&c.chips) c.chips(holePos); if(prog>=1){ drilled=true; hole.visible=true; liftT=1.2; if(c.done) c.done(holePos); } return prog; }
const gripTmp=new T.Vector3();
function grip(side,out){ auger.updateMatrixWorld(true); if(side==='R'){ gripTmp.set(.38,.06,0); crankRef.localToWorld(gripTmp); } else { gripTmp.set(0,1.29,0); auger.localToWorld(gripTmp); } out.copy(gripTmp); return out; }
function drilling(){ return auger.visible&&!drilled&&prog>0&&prog<1; }
return {update,holePos:()=>holePos,drilled:()=>drilled,drill,progress:()=>prog,grip,drilling};
}
/* ===== 診斷：錯誤記錄、效能取樣、一鍵複製給開發者 ===== */
function createDiag(W,c){
'use strict';
const KEY='swampAngler.log'; let log=[]; try{ log=JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ log=[]; }
function add(kind,msg){ const t=new Date(); log.push(`${t.getMonth()+1}/${t.getDate()} ${t.toTimeString().slice(0,8)} [${kind}] ${String(msg).slice(0,300)}`); if(log.length>30) log=log.slice(-30); try{ localStorage.setItem(KEY,JSON.stringify(log)); }catch(e){} }
window.addEventListener('error',e=>{ if(e.target&&e.target!==window&&(e.target.src||e.target.href)) add('load',e.target.src||e.target.href); else add('error',(e.message||'')+' @'+(e.filename||'').split('/').pop()+':'+(e.lineno||'')); },true);
window.addEventListener('unhandledrejection',e=>add('promise',e.reason&&(e.reason.message||e.reason)));
const ce=console.error.bind(console); console.error=function(){ try{ add('console',[...arguments].map(a=>a&&a.message?a.message:String(a)).join(' ')); }catch(e){} ce(...arguments); };
/* 效能：最近 10 秒的平均與最低幀率 */
const fr=[]; let last=performance.now();
function tick(){ const n=performance.now(), dt=n-last; last=n; if(dt>0&&dt<2000){ fr.push([n,1000/dt]); } while(fr.length&&n-fr[0][0]>10000) fr.shift(); requestAnimationFrame(tick); }
requestAnimationFrame(tick);
function fps(){ if(!fr.length) return {avg:0,min:0}; let s=0,mn=999; for(const f of fr){ s+=f[1]; if(f[1]<mn) mn=f[1]; } return {avg:Math.round(s/fr.length),min:Math.round(mn)}; }
function gpu(){ try{ const gl=W.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info'); return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER); }catch(e){ return '?'; } }
function report(){ const f=fps(), G=c.G, S=c.save;
  return ['【濕地垂釣 診斷資訊】','時間：'+new Date().toLocaleString('zh-TW'),'裝置：'+navigator.userAgent,'螢幕：'+screen.width+'×'+screen.height+' DPR '+(window.devicePixelRatio||1)+'，畫布解析度 '+(W.getPR?W.getPR():'?'),
    '顯示晶片：'+gpu(),'畫質設定：'+(S.gfx||'high'),'幀率（近 10 秒）：平均 '+f.avg+'，最低 '+f.min,
    '位置：'+(G.loc||'?')+'／釣點 '+(G.spot)+'／狀態 '+G.state+'／時間 '+(((G.hour%24)+24)%24).toFixed(1)+'／Lv '+S.lv,
    '錯誤記錄（最近 '+log.length+' 筆）：',...(log.length?log:['（沒有錯誤）'])].join('\n'); }
async function copy(){ const txt=report();
  try{ await navigator.clipboard.writeText(txt); return true; }
  catch(e){ const ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(e2){} ta.remove(); return ok; } }
function clear(){ log=[]; try{ localStorage.removeItem(KEY); }catch(e){} }
return {report,copy,clear,add,count:()=>log.length};
}
/* ===== 主線故事「老漁人的手記」：章節、任務、地圖開放、手記面板 ===== */
function createStory(c){
'use strict';
const S=c.save;
/* 任務類型：catch（可限魚種 sp、地點 zone、地區 loc、時段 per、下雨 rain、稀有度 rar）、perfect、item、scene、boss、moon */
const CH=[
 {id:'c1',spot:'dock',name:'第一章　老漁人的碼頭',open:{},
  intro:'這是老漁人一根一根釘起來的碼頭。先在這裡找回釣魚的手感——他說過，湖會告訴你很多事，只要你願意等。',
  tasks:[{t:'catch',zone:'dock',n:5,txt:'在木碼頭釣到 5 尾魚'},{t:'catch',sp:'bluegill',n:1,txt:'釣到一尾藍鰓太陽魚'},{t:'perfect',n:2,txt:'完美揚竿 2 次'}],
  page:'手記第一頁\n「這座碼頭是我年輕時一根一根釘起來的。湖會告訴你很多事，只要你願意等。\n浮萍灣那邊，傍晚常有東西在葉子底下發光——我花了好幾年才看清楚那是什麼。」',
  xp:600,coins:250,unlock:'浮萍灣（需要獨木舟）'},
 {id:'c2',spot:'lily',name:'第二章　浮萍下的影子',open:{after:'c1',kayak:1},
  intro:'划進浮萍灣，水面鋪滿圓圓的葉子。手記說，老漁人第一次看見「她」，就是在這裡。',
  tasks:[{t:'catch',zone:'lily',sp:'crappie',n:2,txt:'在浮萍灣釣到 2 尾黑斑刺蓋太陽魚'},{t:'catch',loc:'lake',per:'dawn',n:3,txt:'在湖上清晨釣到 3 尾魚'},{t:'item',n:1,txt:'從水裡釣起任何一件寶物（任務進行中機率加倍）'}],
  page:'手記第二頁\n「那天清晨，浮萍下有條銀色的尾巴，比我見過的任何魚都大。我以為眼花了。\n後來那場暴風雨，把東岸的林子整片吹倒在水裡。人們說湖病了，開始在河口築堤。」',
  xp:1500,coins:600,unlock:'倒木區（Lv 5）'},
 {id:'c3',spot:'wood',name:'第三章　暴風雨之後',open:{after:'c2',lv:5},
  intro:'倒木區是那場暴風雨留下的傷口。枯樹橫躺在水裡，成了大魚躲藏的地方。',
  tasks:[{t:'catch',zone:'wood',sp:'channel',n:1,txt:'在倒木區釣到一尾斑點叉尾鮰'},{t:'catch',rain:1,n:3,txt:'下雨天釣到 3 尾魚（可在設定切換天氣）'},{t:'catch',rar:1,n:3,txt:'釣到稀有以上的魚 3 尾'}],
  page:'手記第三頁\n「堤防築好以後，海水不再進來，湖心那條大鱷雀鱔變得越來越兇。\n我在牠肚子裡找到過一張畫在魚皮上的圖——湖的西邊，有個只在月光下才看得見的灣。\n冬天我要去上游看看，河水是從哪裡來的。」',
  xp:3000,coins:1250,unlock:'深水中央（Lv 8）'},
 {id:'ice',spot:'ice',name:'第五章　冰下的歌聲',open:{after:'c4',lv:10},
  intro:'湖心的手記斷在一句「她在等一條回海的路」。剩下的答案，老漁人帶去了上游——他最後一個冬天，在冰湖上度過。',
  tasks:[{t:'catch',loc:'ice',n:3,txt:'在冰湖釣到 3 尾魚'},{t:'catch',sp:'trout',n:1,txt:'釣到一尾虹鱒'},{t:'catch',sp:'char',n:1,txt:'釣到一尾北極紅點鮭（老漁人說牠只在最冷的水裡）'}],
  page:'手記・冰湖（最後一個冬天）\n「冰洞裡傳上來歌聲。冰底下的水是活的，一路流向湖，再從灣底的石縫流進海——那就是霜汐回家的路。\n我老了，划不動了。你帶著這盞提燈，在月圓的晚上去灣裡找她。她會認得這盞燈。」',
  xp:3500,coins:1500,baits:{moon:3},unlock:'月光灣（並得到老漁人的提燈與月光餌 ×3）'},
 {id:'c4',spot:'deep',name:'第四章　湖心的秘密',open:{after:'c3',lv:8},
  intro:'深水中央沒有遮蔽，風浪最大，也最安靜。老漁人說，這裡住著湖的主人。',
  tasks:[{t:'catch',zone:'deep',rar:1,n:3,txt:'在深水中央釣到稀有以上的魚 3 尾'},{t:'catch',loc:'lake',per:'night',n:3,txt:'在湖上夜晚釣到 3 尾魚'},{t:'catch',sp:'gar',n:1,txt:'釣到一尾鱷雀鱔'}],
  page:'手記第四頁\n「月亮很圓的晚上，我照著魚皮上的圖划過去。灣裡的水是銀色的，岩石上坐著一個人——\n不，是一條人魚。她說她叫霜汐，在等一條回海的路。我答應她，每個滿月都提燈來陪她。」',
  xp:5000,coins:2000,unlock:'冰湖（Lv 10）'},
 {id:'c5',spot:'moon',name:'第六章　月潮',open:{after:'ice'},
  intro:'月光灣只在夜裡發光。霜汐還在這裡，等著那個提燈的人。\n提示：晚上（約 19:48～04:48）划獨木舟到月光灣釣魚，有機會在魚肚裡找到月鱗；月亮越圓，找到的機會越高。',
  tasks:[{t:'moon',n:1,txt:'集滿 7 片月鱗，聽完霜汐的故事'}],
  page:'手記第五頁\n「我老了，提不動燈了。霜汐說，等堤防打開、月潮回來，她就能回家。\n可是河口外的海不平靜——深海裡有什麼東西，從堤防築起那年就一直在發怒。\n我的舊漁船還停在河口的船塢裡。修好它，替我出海看看吧。」\n\n——霜汐游進水道前回頭說：「湖裡還有一個人在等燈。」',
  xp:8000,coins:3000,unlock:'近海礁岩（需修復老漁人的漁船，在 🗺️ 釣點清單）'},
 {id:'lantern',spot:'lily',hidden:1,name:'隱藏章節　湖裡還有人等燈',open:{after:'c5'},
  intro:'霜汐走之前回頭說了一句：「湖裡還有一個人在等燈。」她沒說是誰。浮萍灣的夜晚，好像有什麼在看你。',
  tasks:[{t:'item',id:'hairpin',n:1,txt:'夜裡在浮萍灣釣起一件遺物'},{t:'meet',n:3,txt:'在夜裡遇見「她」3 次'},{t:'scene',id:'lantern',n:1,txt:'滿月的夜晚（或掛上月光餌），提著老漁人的燈到浮萍灣——前兩項完成後，夜裡在湖上，燈會自動提在你手邊'}],
  page:'手記・最後一頁（夾在封底）\n「秋月，三十年前那個雨夜，妳提著燈在浮萍灣等我，我卻遲了一步。\n我每個滿月提燈去灣裡，不是為了霜汐，是想讓妳看見燈，知道回家的路。\n如果有人替我把燈提到妳面前——秋月，妳可以走了。爸爸不怪妳，妳也別怪自己。」',
  title:'守燈人',xp:6000,coins:3000,unlock:'稱號「守燈人」；她不會再嚇你，偶爾會在遠處安靜地看著燈'},
 {id:'c6',spot:'reef',name:'第七章　河口之外',open:{after:'c5',yacht:1},
  intro:'第一次把船開出河口。霜汐回到了大海，海卻變得不安：魚群躁動，鯊魚出現得比以前頻繁。',
  tasks:[{t:'catch',zone:'reef',sp:'amber',n:1,txt:'在近海礁岩釣到一尾紅甘'},{t:'catch',sp:'grouper',n:1,txt:'釣到一尾石斑'},{t:'scene',id:'dolphin',n:1,txt:'拍下一次海豚群（白天出海，海豚出現時按 📷）'}],
  page:'手記最後幾頁（字跡很淡）\n「滄淵守著深藍的海溝。他以為是人類偷走了月潮。\n只有親手證明人與海可以共處，月潮才會回來。這件事，我沒能做到。」',
  xp:12000,coins:4500,unlock:'遠洋深藍（Lv 18）'},
 {id:'c7',spot:'blue',name:'終章　深淵之王',open:{after:'c6',lv:18},
  intro:'遠洋深藍，海水深得發黑。這裡是滄淵的領域，也是老漁人一輩子沒能抵達的地方。',
  tasks:[{t:'catch',sp:'marlin',n:1,txt:'釣到一尾旗魚'},{t:'catch',sp:'sail',n:1,txt:'釣到一尾雨傘旗魚'},{t:'boss',id:'king',n:1,txt:'接受大師挑戰，擊敗滄淵（Lv 24，⭐ 面板）'}],
  page:'終章\n滄淵沉回深淵前，看了你很久。那天晚上，河口的堤防在大潮中自己裂開了一道縫，月光順著水流進湖裡。\n你回到碼頭，在手記最後一頁寫下：「月潮回來了。換我守著這片湖。」',
  xp:30000,coins:15000,unlock:'全部完成：獲得稱號「守湖人」'}
];
const SPOT_IDS=['dock','lily','wood','deep','moon','reef','blue','ice'];
S.story=S.story||null;
if(!S.story){ // 第一次載入：已經打開的地圖維持開放（沿用舊規則判斷）
  const OLD={dock:1,lily:2,wood:4,deep:6,moon:1,reef:8,blue:12,ice:10}, grand=[];
  SPOT_IDS.forEach(id=>{ if(id==='dock') return; const ok=S.lv>=OLD[id]&&(id!=='moon'||(S.mer&&S.mer.n>=1)); if(ok&&(S.total||0)>0) grand.push(id); });
  S.story={done:[],prog:{},read:[],grand}; }
const st=S.story; st.prog=st.prog||{}; st.done=st.done||[]; st.read=st.read||[]; st.grand=st.grand||[]; st.seen=st.seen||[];
const byId=id=>CH.find(x=>x.id===id), isDone=id=>st.done.indexOf(id)>=0;
function avail(ch){ if(window.__UNLOCK) return true; const o=ch.open; return (!o.after||isDone(o.after))&&(!o.lv||S.lv>=o.lv); }
function why(ch){ const o=ch.open, r=[]; if(o.after&&!isDone(o.after)) r.push('完成「'+byId(o.after).name.replace(/^.*　/,'')+'」'); if(o.lv&&S.lv<o.lv) r.push('Lv '+o.lv); if(o.kayak&&!S.kayak) r.push('獨木舟'); if(o.yacht&&!S.yacht) r.push('漁船'); return r; }
/* 地圖開放：以章節為準；舊存檔已開放的維持開放 */
function lock(i){ if(window.__UNLOCK) return null; const id=SPOT_IDS[i]; if(id==='dock'||st.grand.indexOf(id)>=0) return null; const ch=CH.find(x=>x.spot===id); if(!ch) return null;
  const r=why(ch).filter(x=>x!=='獨木舟'&&x!=='漁船'); return r.length?'需要：'+r.join('、'):null; }
function active(){ return CH.filter(ch=>!isDone(ch.id)&&avail(ch)); }
function prog(ch){ let p=st.prog[ch.id]; if(!Array.isArray(p)) p=[]; if(p.length!==ch.tasks.length) p=ch.tasks.map((t,i)=>Math.min(t.n,+p[i]||0)); return st.prog[ch.id]=p; }
function bump(match){ let changed=false;
  for(const ch of active()){ const p=prog(ch); ch.tasks.forEach((t,i)=>{ if(p[i]>=t.n) return; const d=match(t); if(d>0){ p[i]=Math.min(t.n,p[i]+d); changed=true; if(p[i]>=t.n) c.toast('📜 任務完成：'+t.txt,'good',2400); } });
    if(p.every((v,i)=>v>=ch.tasks[i].n)) finish(ch); }
  if(changed){ c.persist(); dot(); } }
function finish(ch){ if(isDone(ch.id)) return; st.done.push(ch.id); c.addXP(ch.xp); S.coins+=ch.coins; if(ch.title){ S.titles=S.titles||[]; if(S.titles.indexOf(ch.title)<0) S.titles.push(ch.title); } if(ch.baits){ S.baits=S.baits||{}; for(const k in ch.baits) S.baits[k]=(S.baits[k]||0)+ch.baits[k]; } c.setCoins(); if(c.syncHUD) c.syncHUD(); c.persist(); dot();
  if(ch.id==='c7'){ S.titles=S.titles||[]; if(S.titles.indexOf('守湖人')<0) S.titles.push('守湖人'); }
  setTimeout(()=>{ if(ch.id==='c7') showEnding(ch); else showPage(ch,true); c.Snd&&c.Snd.fanfare&&c.Snd.fanfare(2); c.vib&&c.vib([40,40,120]); },1800); }
/* 事件掛鉤 */
function onCatch(fd,ctx){ if(!fd||!fd.sp) return; bump(t=>{ if(t.t!=='catch') return 0;
  if(t.sp&&fd.sp.id!==t.sp) return 0; if(t.zone&&ctx.zone!==t.zone) return 0; if(t.loc&&ctx.loc!==t.loc) return 0; if(t.per&&ctx.per!==t.per) return 0; if(t.rain&&!ctx.rain) return 0; if(t.rar&&fd.sp.rar<t.rar) return 0; return 1; }); }
const onPerfect=()=>bump(t=>t.t==='perfect'?1:0), onItem=id=>bump(t=>t.t==='item'&&(!t.id||t.id===id)?1:0), onMeet=()=>bump(t=>t.t==='meet'?1:0);
const onScene=id=>bump(t=>t.t==='scene'&&t.id===id?1:0), onBoss=id=>bump(t=>t.t==='boss'&&t.id===id?1:0);
/* 主線正在追的魚：在指定地點（沒指定就任何地方）出現率 ×3；任務完成後恢復 */
function needs(type){ return active().some(ch=>{ const p=prog(ch); return ch.tasks.some((t,i)=>t.t===type&&p[i]<t.n); }); }
function boost(spId,zone){ for(const ch of active()){ const p=prog(ch); for(let i=0;i<ch.tasks.length;i++){ const t=ch.tasks[i]; if(t.t==='catch'&&t.sp===spId&&p[i]<t.n&&(!t.zone||t.zone===zone)) return 3; } } return 1; }
/* ===== 開場過場：電影黑邊＋旁白逐段淡入，背後是即時的湖面 ===== */
const OPEN=['三年前的冬天，湖邊的老漁人走了。','他把碼頭留給了你——一座歪斜的木碼頭，和一間堆滿釣具的小屋。','整理小屋時，你在漁具箱底找到一本泡過水的手記。','大半頁都被撕走了，封面上只剩一行字：','「給下一個守著這片湖的人。」','湖面起霧了。你拿起他留下的釣竿，走上碼頭。'];
const cin=document.createElement('div'); cin.id='cinBox'; cin.className='hidden'; document.body.appendChild(cin);
const ccss=document.createElement('style'); ccss.textContent=`#cinBox{position:fixed;inset:0;z-index:28;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:0 26px;text-align:center;color:#eef2f6;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.55) 50%,rgba(0,0,0,.25))}#cinBox.hidden{display:none}
#cinBox:before,#cinBox:after{content:'';position:absolute;left:0;right:0;height:11vh;background:#000;animation:barIn 1.2s ease forwards}#cinBox:before{top:0;transform:translateY(-100%)}#cinBox:after{bottom:0;transform:translateY(100%)}
@keyframes barIn{to{transform:none}}
body.cine>*:not(#cinBox):not(canvas):not(#toast){visibility:hidden!important}
#cinBox p{margin:8px 0;font-size:17px;line-height:1.75;font-family:serif;text-shadow:0 2px 10px #000;opacity:0;animation:cinIn 1.8s ease forwards}#cinBox p.gold{color:#ffe3a3;font-size:19px}
#cinBox .sk{position:absolute;top:calc(11vh + 10px);right:14px;z-index:2;background:rgba(0,0,0,.45);color:#ddd;border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:5px 14px;font-size:13px}
#cinBox .go{opacity:0;animation:cinIn 1s ease forwards;margin-top:20px;padding:10px 30px;border-radius:999px;border:0;background:#ffd56a;color:#2a1a00;font-weight:800;font-size:15px}
#cinBox .ct{font-size:13px;letter-spacing:4px;color:#d9c08a;opacity:0;animation:cinIn 1s ease forwards}#cinBox h2{margin:6px 0 4px;font-size:24px;color:#ffe3a3;opacity:0;animation:cinIn 1.2s ease forwards;font-family:serif}
#cinBox .tn{font-size:13px;color:#c9d2dc;opacity:0;animation:cinIn 1s ease forwards}
@keyframes cinIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`; document.head.appendChild(ccss);
let cinOn=false;
function showIntro(){ const step=2.6; cinOn=true;
  cin.innerHTML='<button class="sk" data-c="end">略過 ›</button>'+OPEN.map((t,i)=>`<p class="${i===4?'gold':''}" style="animation-delay:${(1+i*step).toFixed(1)}s">${t}</p>`).join('')+
    `<button class="go" data-c="end" style="animation-delay:${(1+OPEN.length*step).toFixed(1)}s">開始</button>`;
  cin.classList.remove('hidden'); document.body.classList.add('cine'); if(c.pan) c.pan(true); }
function endIntro(){ cin.classList.add('hidden'); document.body.classList.remove('cine'); cinOn=false; if(c.pan) c.pan(false); if(!st.intro){ st.intro=1; c.persist(); } cardAt=performance.now()+1200; }
/* ===== 章節開場卡：新章節開放且玩家空閒時出現一次 ===== */
const SPOTN={dock:'木碼頭',lily:'浮萍灣',wood:'倒木區',deep:'深水中央',moon:'月光灣',reef:'近海礁岩',blue:'遠洋深藍',ice:'冰湖'};
function showCard(ch){ cinOn=true; const i=SPOT_IDS.indexOf(ch.spot), here=c.curSpot&&c.curSpot()===i, lk=lock(i), boat=(ch.open.kayak&&!S.kayak)?'獨木舟':(ch.open.yacht&&!S.yacht)?'漁船':null;
  const act=here?'<button class="go" data-c="close" style="animation-delay:2.2s">開始</button>':(!lk&&!boat)?`<button class="go" data-c="go" data-v="${i}" style="animation-delay:2.2s">前往${SPOTN[ch.spot]}</button><br><button class="sk" style="position:static;margin-top:12px;opacity:.8" data-c="close">稍後再去</button>`:`<p class="tn" style="animation-delay:2s">${boat==='漁船'?'先到 🗺️ 釣點清單修復老漁人的漁船':boat?'先到 🗺️ 釣點清單購買'+boat:'尚未開放'}</p><button class="go" data-c="close" style="animation-delay:2.4s">知道了</button>`;
  cin.innerHTML=`<div class="ct" style="animation-delay:.6s">${ch.side?'支線':ch.hidden?'隱藏章節':'新章節'}</div><h2 style="animation-delay:1s">${ch.name.replace(/^.*　/,'')}</h2><div class="ct" style="animation-delay:1.2s;letter-spacing:1px">${ch.name.split('　')[0]}・${SPOTN[ch.spot]}</div><p style="animation-delay:1.6s;font-size:15px">${ch.intro.split('\n')[0]}</p><div class="tn" style="animation-delay:2s">${ch.tasks.length} 個任務，詳情在 📜 手記</div>`+act;
  cin.classList.remove('hidden'); document.body.classList.add('cine'); if(st.seen.indexOf(ch.id)<0){ st.seen.push(ch.id); c.persist(); } }
cin.addEventListener('click',e=>{ const b=e.target.closest('[data-c]'); if(!b) return; const a=b.dataset.c;
  if(a==='end') endIntro(); else { cin.classList.add('hidden'); document.body.classList.remove('cine'); cinOn=false; if(c.pan) c.pan(false); cardAt=performance.now()+1500; if(a==='go') c.goSpot(+b.dataset.v); } });
let cardAt=performance.now()+3000;   // 用真實時間計時，不受每幀時間差上限影響
function tryCard(){ if(cinOn||!st.intro) return; const now=performance.now(); if(now<cardAt) return; cardAt=now+2000;
  if(!box.classList.contains('hidden')||!document.getElementById('endBox').classList.contains('hidden')) return;
  if(c.idle&&!c.idle()) return; const ch=active().find(x=>st.seen.indexOf(x.id)<0); if(ch) showCard(ch); }
let moonClock=0; function tick(dt){ tryCard(); moonClock-=dt; if(moonClock>0) return; moonClock=2; if(S.moon&&S.moon.done) bump(t=>t.t==='moon'?1:0); }
const sb=document.getElementById('startBtn'); if(sb) sb.addEventListener('click',()=>{ if(!st.intro) setTimeout(showIntro,700); });
/* 手記面板 */
const btn=document.createElement('button'); btn.className='chip sm'; btn.id='storyBtn'; btn.setAttribute('aria-label','老漁人的手記'); btn.textContent='📜';
const t2=document.getElementById('top2'); if(t2) t2.appendChild(btn);
const box=document.createElement('div'); box.id='storyBox'; box.className='hidden'; document.body.appendChild(box);
const css=document.createElement('style'); css.textContent=`#storyBtn{position:relative;min-width:38px;min-height:27px;justify-content:center}#storyBtn.dot::after{content:'';position:absolute;top:2px;right:2px;width:9px;height:9px;border-radius:50%;background:#ff5a4a}
#storyBox{position:fixed;inset:0;z-index:9;background:rgba(4,8,7,.66);display:flex;align-items:flex-end;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 40px) 10px calc(env(safe-area-inset-bottom,0px) + 10px)}#storyBox.hidden{display:none}
#storyBox .pn{width:100%;max-width:520px;max-height:100%;overflow:auto;background:linear-gradient(180deg,#2a2216,#1a150e);border:1px solid rgba(230,200,140,.35);border-radius:18px;padding:16px 16px 18px;color:#f1e6cc;box-shadow:0 10px 40px rgba(0,0,0,.5)}
#storyBox h3{margin:0 0 4px;font-size:19px;color:#ffe3a3}#storyBox .x{float:right;background:none;border:0;color:#f1e6cc;font-size:22px}
#storyBox .intro{white-space:pre-line;font-size:14px;line-height:1.7;color:#e6d8b8;margin:6px 0 10px}#storyBox .tk{display:flex;gap:8px;align-items:center;padding:8px 10px;margin:6px 0;border-radius:10px;background:rgba(255,255,255,.05);font-size:14px}
#storyBox .tk.ok{color:#9ee6a0}#storyBox .tk b{margin-left:auto;font-variant-numeric:tabular-nums}#storyBox .sec{margin:14px 0 6px;font-size:13px;color:#d9c08a;font-weight:800}
#storyBox .ch{padding:8px 10px;margin:5px 0;border-radius:10px;border:1px solid rgba(230,200,140,.18);font-size:14px;display:flex;justify-content:space-between;gap:8px}#storyBox .ch small{color:#bfae88}#storyBox .ch button{background:#ffd56a;color:#2a1a00;border:0;border-radius:8px;padding:3px 10px;font-weight:800}
#storyBox .page{white-space:pre-line;font-size:15px;line-height:1.85;padding:14px;border-radius:12px;background:#efe2c4;color:#3a2b14;font-family:serif;box-shadow:inset 0 0 30px rgba(120,80,30,.25)}#storyBox .rw{margin-top:10px;font-size:13px;color:#ffe3a3}`;
document.head.appendChild(css);
function render(){ const act=active(); let h='<div class="pn"><button class="x" data-s="close">✕</button><h3>📜 老漁人的手記</h3>';
  if(!act.length&&isDone('c7')) h+='<div class="intro">所有章節都完成了。月潮回到了湖裡，你成了守湖人。</div>';
  for(const ch of act){ const p=prog(ch); h+=`<div class="sec">${ch.side?'支線':ch.hidden?'隱藏章節':'目前章節'}</div><h3 style="font-size:17px">${ch.name}</h3><div class="intro">${ch.intro}</div>`;
    h+=ch.tasks.map((t,i)=>`<div class="tk${p[i]>=t.n?' ok':''}">${p[i]>=t.n?'✅':'▫️'} ${t.txt}<b>${Math.min(p[i],t.n)}/${t.n}</b></div>`).join('');
    h+=`<div class="rw">完成獎勵：經驗 ${ch.xp.toLocaleString()}、金幣 ${ch.coins.toLocaleString()}，開放 ${ch.unlock}</div>`; }
  const nxt=CH.filter(ch=>!isDone(ch.id)&&!avail(ch));
  if(nxt.length){ h+='<div class="sec">尚未開放</div>'+nxt.map(ch=>`<div class="ch"><span>🔒 ${ch.name}</span><small>需要：${why(ch).join('、')}</small></div>`).join(''); }
  const dn=CH.filter(ch=>isDone(ch.id)); if(dn.length) h+='<div class="sec">已收集的手記</div>'+dn.map(ch=>`<div class="ch"><span>📖 ${ch.name}</span><button data-s="read" data-v="${ch.id}">閱讀</button></div>`).join('');
  box.innerHTML=h+'</div>'; }
/* 終章結局：全螢幕，文字逐段淡入 */
const END=['滄淵沉回了深淵。','那一夜大潮，河口的堤防在浪裡裂開一道縫。','月光順著海水流進河口，流過倒木、流過浮萍，一路回到碼頭前。','霜汐在浪頭上回頭看了你一眼，然後游向大海。','你翻開手記最後一頁，在老漁人的字跡下面寫——','「月潮回來了。換我守著這片湖。」'];
const ed=document.createElement('div'); ed.id='endBox'; ed.className='hidden'; document.body.appendChild(ed);
const ecss=document.createElement('style'); ecss.textContent=`#endBox{position:fixed;inset:0;z-index:27;background:radial-gradient(ellipse at 50% 30%,#1b2c4a,#05080f 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 26px;text-align:center;color:#e9f0ff}#endBox.hidden{display:none}
#endBox p{margin:9px 0;font-size:17px;line-height:1.7;font-family:serif;opacity:0;animation:endIn 1.6s ease forwards}#endBox p.last{font-size:20px;color:#ffe3a3;margin-top:18px}
#endBox .tt{opacity:0;animation:endIn 1.4s ease forwards;margin-top:26px;font-size:15px;color:#ffd56a}#endBox button{opacity:0;animation:endIn 1s ease forwards;margin-top:22px;padding:10px 26px;border-radius:999px;border:0;background:#ffd56a;color:#2a1a00;font-weight:800;font-size:15px}
#endBox#endBox#endBox{visibility:visible!important}
@keyframes endIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`; document.head.appendChild(ecss);
// 終章結局：播放結局動畫〈月潮〉（z.js）；播完或略過後顯示稱號與獎勵。沒有 3D 結局可播時才退回逐段文字
function showEnding(ch){ st.ending=1; if(st.read.indexOf(ch.id)<0) st.read.push(ch.id); c.persist(); dot();
  const reward=()=>{ ed.innerHTML=`<p class="last" style="animation-delay:.2s">「月潮回來了。換我守著這片湖。」</p><div class="tt" style="animation-delay:1s">🏆 獲得稱號「守湖人」<br><small>經驗 ${ch.xp.toLocaleString()}・金幣 ${ch.coins.toLocaleString()}</small><br><small style="opacity:.75">之後的滿月夜，湖面會亮起月潮；碼頭盡頭留著老漁人的椅子和燈。<br>想再看一次結局：📖 手記 →「終章」→ 閱讀</small></div><button data-e="ok" style="animation-delay:2s">回到碼頭</button>`; ed.classList.remove('hidden'); };
  if(window.__playEnding){ try{ window.__playEnding(reward); return; }catch(e){ console.warn('ending',e); } }
  const step=2.4; ed.innerHTML=END.map((t,i)=>`<p class="${i===END.length-1?'last':''}" style="animation-delay:${(i*step).toFixed(1)}s">${t}</p>`).join('')+`<button data-e="ok" style="animation-delay:${(END.length*step+1).toFixed(1)}s">回到碼頭</button>`; ed.classList.remove('hidden'); }
ed.addEventListener('click',e=>{ if(e.target.closest('[data-e=ok]')) ed.classList.add('hidden'); });
function showPage(ch,isNew){ box.innerHTML=`<div class="pn"><button class="x" data-s="back">✕</button><h3>${isNew?'📖 找回了一頁手記':'📖 '+ch.name}</h3><div class="page">${ch.page}</div>${isNew?`<div class="rw">獲得經驗 ${ch.xp.toLocaleString()}、金幣 ${ch.coins.toLocaleString()}<br>開放：${ch.unlock}</div>`:''}</div>`;
  box.classList.remove('hidden'); if(st.read.indexOf(ch.id)<0){ st.read.push(ch.id); c.persist(); } dot(); }
box.addEventListener('click',e=>{ const b=e.target.closest('[data-s]'); if(!b){ if(e.target===box) box.classList.add('hidden'); return; }
  const a=b.dataset.s; if(a==='close') box.classList.add('hidden'); else if(a==='back') render(); else if(a==='read'){ const ch=byId(b.dataset.v); if(ch.id==='c7'){ box.classList.add('hidden'); showEnding(ch); } else showPage(ch,false); } });
btn.addEventListener('click',()=>{ render(); box.classList.remove('hidden'); });
function dot(){ btn.classList.toggle('dot',st.done.some(id=>st.read.indexOf(id)<0)||active().some(ch=>!st.prog[ch.id])); }
dot();
function freePage(t,h){ box.innerHTML=`<div class="pn"><button class="x" data-s="close">✕</button><h3>📖 ${t}</h3><div class="page">${h}</div></div>`; box.classList.remove('hidden'); }
return {progOf:id=>{ const ch=byId(id); return ch?prog(ch).slice():null; },isActive:id=>active().some(ch=>ch.id===id),page:freePage,intro:showIntro,needs,boost,onMeet,wants:id=>active().some(ch=>ch.tasks.some((t,i)=>t.t==='item'&&t.id===id&&prog(ch)[i]<t.n)),showEnding:()=>showEnding(byId('c7')),lock,onCatch,onPerfect,onItem,onScene,onBoss,tick,done:isDone};
}
/* ===== 老漁人的小屋：水族箱與標本牆（資料與規則） ===== */
function createHome(c){
'use strict';
const S=c.save;
// 水族箱等級：容量、能放的最大體長（公尺）、價格、需要等級
const TANKS=[{n:'小水族箱',cap:6,maxL:.6,price:0},{n:'大型水族箱',cap:12,maxL:1.0,price:15000},{n:'展示牆水族箱',cap:20,maxL:1.5,price:60000},{n:'水族館',cap:30,maxL:1.6,price:150000}];
// 海水缸也能升級（原本只有一種，沒辦法變大）：越大能養越多、越大的海魚
const SEA_TANKS=[{n:'海水缸',cap:6,maxL:.8,price:25000},{n:'大型海水缸',cap:12,maxL:1.2,price:60000},{n:'珊瑚礁展示缸',cap:20,maxL:1.8,price:150000},{n:'海洋館',cap:30,maxL:2.4,price:300000}];
const SEA_TANK=SEA_TANKS[0], seaT=()=>SEA_TANKS[Math.min(SEA_TANKS.length-1,H().seaTier||0)];
const CHILLER={n:'冷水機',price:12000,lv:10}, MOUNT_MAX=8;
function H(){ const h=S.home=S.home||{}; h.fresh=h.fresh||[]; h.sea=h.sea||[]; h.mounts=h.mounts||[]; h.tier=h.tier||0; return h; }
// 小屋在完成主線第一章後開放（開場就說老漁人留下了小屋）
const unlocked=()=>!!(S.story&&S.story.done&&S.story.done.includes('c1'));
const tank=()=>TANKS[H().tier];
const waterOf=sp=>{ const w=sp.water||sp.loc||'lake'; return w==='sea'||w==='tide'?'sea':'fresh'; };   // 潮間帶生物養在海水缸   // 月光灣的海水魚雖然在湖區，仍要放海水缸
// 這條魚能不能帶回家：回傳是否可以、是否改做標本、原因、標本費用
function check(fd){
  const sp=fd&&fd.sp, h=H();
  if(!unlocked()) return {ok:false,why:'完成主線第一章後才能整理小屋'};
  if(!sp||fd.item||sp.special==='mermaid') return {ok:false,hide:true};
  if(sp.noSell) return {ok:false,why:'保育類只能放流，不能帶回家'};
  const sea=waterOf(sp)==='sea', t=sea?seaT():tank();
  if(sea&&!h.seaTank) return big(fd,'海水魚要先在小屋買海水缸','還沒有海水缸');
  if(!sea&&(sp.loc==='ice')&&!h.chiller) return big(fd,'冰湖的魚要先幫水族箱加裝冷水機','還沒有冷水機');
  if(fd.L>t.maxL) return big(fd,t.n+'放不下 '+Math.round(fd.L*100)+' 公分的魚','太大放不進水族箱');
  const list=sea?h.sea:h.fresh; if(list.length>=t.cap) return {ok:false,why:t.n+'已經滿了（'+t.cap+' 條），先回小屋放掉幾條'};
  return {ok:true,water:sea?'sea':'fresh'};
}
// 放不進水族箱的魚可以做成標本（要花錢：約賣價的一半）
function big(fd,why,short){ const h=H(), cost=Math.min(6000,Math.max(200,Math.round(fd.value*.5/10)*10));
  if(h.mounts.length>=MOUNT_MAX) return {ok:false,why:why+'；標本牆也掛滿了（'+MOUNT_MAX+' 個）'};
  return {ok:false,mount:true,cost,why,short}; }
const rec=(fd,spotName)=>({id:fd.sp.id,L:+fd.L.toFixed(3),w:+fd.w.toFixed(3),g:fd.grade||'',d:Date.now(),at:spotName||''});
function keep(fd,spotName){ const r=check(fd); if(!r.ok) return false; H()[r.water].push(rec(fd,spotName)); c.persist(); return true; }
function mount(fd,spotName){ const r=check(fd); if(!r.mount||S.coins<r.cost) return false; S.coins-=r.cost; H().mounts.push(rec(fd,spotName)); c.persist(); c.setCoins(); return true; }
function release(water,i){ const l=H()[water]; if(!l||!l[i]) return null; const f=l.splice(i,1)[0]; c.persist(); return f; }
function buy(what){ const h=H();
  if(what==='tier'){ const nx=TANKS[h.tier+1]; if(!nx) return '已經是最大的水族箱了'; if(S.coins<nx.price) return '金幣不夠';
    S.coins-=nx.price; h.tier++; }
  else if(what==='seaTier'){ if(!h.seaTank) return '還沒有海水缸'; const nx=SEA_TANKS[(h.seaTier||0)+1]; if(!nx) return '已經是最大的海水缸了'; if(S.coins<nx.price) return '金幣不夠'; S.coins-=nx.price; h.seaTier=(h.seaTier||0)+1; }
  else if(what==='sea'){ if(h.seaTank) return '已經有海水缸了'; if(!S.yacht) return '有漁船、能出海之後才需要海水缸'; if(S.coins<SEA_TANK.price) return '金幣不夠'; S.coins-=SEA_TANK.price; h.seaTank=true; }
  else if(what==='chiller'){ if(h.chiller) return '已經裝了冷水機'; if(S.coins<CHILLER.price) return '金幣不夠'; S.coins-=CHILLER.price; h.chiller=true; }
  c.persist(); c.setCoins(); return ''; }
/* 家具：每件都能升級（換真實模型或加擺件），也都真的能用；冷卻與累積都用真實時間 */
const BAITN={shrimp:'活蝦',live:'活魚餌',moon:'月光餌'};
const FURN=[
 {id:'sofa',n:'沙發',i:'🛋️',use:'坐下來看水族箱，心情放鬆',act:'坐下休息',lv:[
   {d:'🍀 好運 8 分鐘（稀有魚機率提升）・冷卻 30 分鐘',min:8,cd:30},
   {n:'加真皮腳凳',p:3000,need:6,d:'🍀 好運 15 分鐘・冷卻 25 分鐘',min:15,cd:25},
   {n:'換雕花古董沙發',p:9000,need:12,d:'🍀 好運 25 分鐘・冷卻 20 分鐘',min:25,cd:20}]},
 {id:'rock',n:'搖椅',i:'🪑',use:'在爐火邊打個盹',act:'打個盹',lv:[
   {d:'時間跳到下一個時段（清晨／正午／黃昏／夜晚）',fx:0},
   {n:'加邊桌',p:2000,need:5,d:'跳到下一個時段，睡醒 💪 力氣 10 分鐘',fx:10},
   {n:'加毛毯籃',p:6000,need:10,d:'可以選要睡到哪個時段，睡醒 💪 力氣 20 分鐘',fx:20,pick:true}]},
 {id:'shelf',n:'書架',i:'📚',use:'翻翻老漁人留下的釣魚手記',act:'讀手記',lv:[
   {d:'經驗 +等級×20・冷卻 20 分鐘',k:20,cd:20},
   {n:'擺滿手記',p:2500,need:6,d:'經驗 +等級×35・冷卻 20 分鐘',k:35,cd:20},
   {n:'換玻璃古董書櫃',p:8000,need:12,d:'經驗 +等級×55・冷卻 15 分鐘',k:55,cd:15}]},
 {id:'chest',n:'漁具箱',i:'🧰',use:'老漁人的漁具箱，每天補一次魚餌',act:'領補給',lv:[
   {d:'每天：活蝦 ×3',g:{shrimp:3}},
   {n:'疊上木箱',p:4000,need:8,d:'每天：活蝦 ×5、活魚餌 ×2',g:{shrimp:5,live:2}},
   {n:'再添長木箱',p:12000,need:14,d:'每天：活蝦 ×5、活魚餌 ×4、月光餌 ×1',g:{shrimp:5,live:4,moon:1}}]},
 {id:'herb',n:'窗邊香草',i:'🌿',use:'窗邊曬得到太陽，香草和檸檬會慢慢長出來（烤魚調味用）',act:'採收',lv:[
   {d:'每 60 分鐘長 1 份香草（最多存 2 份）',hb:60,hc:2},
   {n:'加香草木箱',p:1500,need:4,d:'每 30 分鐘 1 份香草（最多存 4 份）',hb:30,hc:4},
   {n:'加檸檬木箱',p:5000,need:9,d:'每 25 分鐘 1 份香草、每 40 分鐘 1 顆檸檬（各存 5 份）',hb:25,hc:5,lm:40,lc:5}]},
 {id:'fire',n:'壁爐',i:'🔥',use:'烤魚用的壁爐，點它就能烤魚',act:'烤魚',lv:[
   {d:'一般火力'},
   {n:'掛上鑄鐵燉鍋',p:3500,need:7,d:'火力更旺，烤熟速度 ×1.25',heat:1.25},
   {n:'加銅鍋',p:10000,need:13,d:'烤熟速度 ×1.25，吃下去的效果時間 ×1.3',heat:1.25,fxK:1.3}]}];
function FD(){ const h=H(); h.furn=h.furn||{}; FURN.forEach(d=>{ h.furn[d.id]=h.furn[d.id]||{lv:0}; }); return h.furn; }
const fdef=id=>FURN.find(d=>d.id===id);
const flv=id=>{ const f=FD()[id]; return f?f.lv:0; };
const now=()=>Date.now();
// 香草／檸檬：從上次採收起算累積了幾份
function grown(st,k,every,cap){ if(!every) return 0; const t=st[k]||(st[k]=now()); return Math.min(cap,Math.floor((now()-t)/(every*60000))); }
// 某件家具現在能不能用：ok、還要等幾分鐘、說明
function state(id){ const d=fdef(id), st=FD()[id], L=d.lv[st.lv];
  if(id==='sofa'||id==='shelf'){ const w=st.t?Math.ceil((st.t+L.cd*60000-now())/60000):0; return w>0?{ok:false,wait:w,txt:'還要 '+w+' 分鐘'}:{ok:true,txt:'可以使用'}; }
  if(id==='chest'){ const day=new Date().toDateString(); return st.day===day?{ok:false,txt:'今天領過了，明天再來'}:{ok:true,txt:'今天的補給還沒領'}; }
  if(id==='herb'){ const h=grown(st,'th',L.hb,L.hc), l=grown(st,'tl',L.lm,L.lc||0);
    return h+l>0?{ok:true,h,l,txt:'可以採收：香草 '+h+(L.lm?'、檸檬 '+l:'')}:{ok:false,txt:'還在長，'+Math.ceil(((st.th||now())+L.hb*60000-now())/60000)+' 分鐘後可以採'}; }
  return {ok:true,txt:''}; }
function info(id){ const d=fdef(id), lv=flv(id); return {def:d,lv,cur:d.lv[lv],next:d.lv[lv+1]||null,st:state(id)}; }
function upgrade(id){ const d=fdef(id), st=FD()[id], nx=d.lv[st.lv+1]; if(!nx) return '已經升到最高級了';
  if((S.lv||1)<nx.need) return '需要等級 Lv '+nx.need; if(S.coins<nx.p) return '金幣不夠';
  // 升級香草時，先把已經長好的收進去，免得換箱子後重新計時吃掉進度
  if(id==='herb'&&state('herb').ok) use('herb');
  S.coins-=nx.p; st.lv++; c.persist(); c.setCoins(); return ''; }
// 使用：回傳訊息與種類；種類有值時表示沒用成功
function use(id,opt){ const d=fdef(id), st=FD()[id], L=d.lv[st.lv], s=state(id), fx=S.fx=S.fx||{}, add=(k,m)=>{ fx[k]=Math.max(fx[k]||0,now())+m*60000; };
  if(id==='sofa'){ if(!s.ok) return {msg:'剛休息過，'+s.txt,kind:'warn'}; st.t=now(); add('luck',L.min); c.persist(); c.fxChanged&&c.fxChanged(); return {msg:'🛋️ 窩在沙發上看魚游來游去……🍀 好運 '+L.min+' 分鐘'}; }
  if(id==='shelf'){ if(!s.ok) return {msg:'剛讀過，'+s.txt,kind:'warn'}; st.t=now(); const xp=Math.round((S.lv||1)*L.k); c.persist(); c.addXP&&c.addXP(xp);
    const tips=['「霧天的清晨，大魚會游到淺水邊。」','「月亮越圓，月光灣的海水魚越多。」','「魚衝的時候放手，牠累了自然會回來。」','「冰洞底下的鱒魚，喜歡活蝦。」','「倒木區的鯰魚，入夜才肯開口。」'];
    return {msg:'📚 '+tips[Math.floor(Math.random()*tips.length)]+'　經驗 +'+xp}; }
  if(id==='chest'){ if(!s.ok) return {msg:s.txt,kind:'warn'}; st.day=new Date().toDateString(); S.baits=S.baits||{}; const got=[];
    for(const [b,n] of Object.entries(L.g)){ S.baits[b]=(S.baits[b]||0)+n; got.push((BAITN[b]||b)+' ×'+n); } c.persist(); c.syncHUD&&c.syncHUD(); return {msg:'🧰 打開漁具箱：'+got.join('、')}; }
  if(id==='herb'){ if(!s.ok) return {msg:s.txt,kind:'warn'}; const inv=S.inv=S.inv||{}, ev=L.hb*60000, el=(L.lm||0)*60000;
    if(s.h){ inv.herb=(inv.herb||0)+s.h; st.th=s.h>=L.hc?now():st.th+s.h*ev; }
    if(s.l){ inv.lemon=(inv.lemon||0)+s.l; st.tl=s.l>=L.lc?now():st.tl+s.l*el; }
    c.persist(); return {msg:'🌿 採收了'+[s.h?'香草 ×'+s.h:'',s.l?'檸檬 ×'+s.l:''].filter(Boolean).join('、')+'（烤魚調味用）'}; }
  if(id==='rock'){ const P=[[6.3,'清晨'],[11.5,'正午'],[17.6,'黃昏'],[21,'夜晚']], h=((c.hour()%24)+24)%24;
    let tg; if(L.pick&&opt!=null) tg=P[opt]; else { tg=P.find(p=>p[0]>h+.25)||P[0]; }
    c.setHour(tg[0]); if(L.fx) add('meal_str',L.fx); c.persist(); c.fxChanged&&c.fxChanged();
    return {msg:'🪑 搖著搖著睡著了……醒來已經是'+tg[1]+(L.fx?'・💪 力氣 '+L.fx+' 分鐘':'')}; }
  return {msg:''}; }
const grillHeat=()=>fdef('fire').lv[flv('fire')].heat||1;
const grillFxK=()=>fdef('fire').lv[flv('fire')].fxK||1;
return {TANKS,SEA_TANK,SEA_TANKS,seaT,CHILLER,MOUNT_MAX,unlocked,check,keep,mount,release,buy,data:H,tank,FURN,furnInfo:info,furnUp:upgrade,furnUse:use,furnLv:flv,grillHeat,grillFxK};
}

/* ===== 小屋內部：第一人稱木屋場景（獨立場景，回家時改畫這裡，外面的湖照常運作） ===== */
function createHomeScene(W,c){
'use strict';
const T=THREE, R=W.renderer, scene=new T.Scene(), cam=new T.PerspectiveCamera(62,1,.05,60), TL=new T.TextureLoader();
let on=false, yaw=0, pitch=-.08, yawT=0, pitchT=-.08, drag=null, t=0;
const EYE=1.6, ROOM={x:4.4,zb:-4.2,zf:2.8,h:2.9}   /* 房間加寬（6.4→8.8 公尺），兩個水族箱升到最大也能並排、一樣大 */;
// 站在房間中段：轉頭時左邊窗戶、右邊壁爐都在畫面中央
cam.position.set(0,EYE,.9); scene.background=new T.Color(0x1a120c);
// 真實木紋貼圖（碼頭用的那組），每個用途各自一份，才能設不同重複次數
const wood=(rx,ry,rot,tint)=>{ const mk=f=>{ const x=TL.load(f); x.wrapS=x.wrapT=T.RepeatWrapping; x.repeat.set(rx,ry); x.rotation=rot||0; x.anisotropy=4; return x; };
  const d=mk('dock_diff.jpg'); d.encoding=T.sRGBEncoding; return new T.MeshStandardMaterial({map:d,normalMap:mk('dock_nor.jpg'),roughnessMap:mk('dock_rough.jpg'),roughness:.85,color:tint||0xffffff}); };
const box=(w,h,d,m,x,y,z)=>{ const o=new T.Mesh(new T.BoxGeometry(w,h,d),m); o.position.set(x,y,z); scene.add(o); return o; };
const plane=(w,h,m,x,y,z,ry,rx)=>{ const o=new T.Mesh(new T.PlaneGeometry(w,h),m); o.position.set(x,y,z); o.rotation.set(rx||0,ry||0,0); scene.add(o); return o; };
const RW=ROOM.x*2, RD=ROOM.zf-ROOM.zb, H=ROOM.h, cz=(ROOM.zf+ROOM.zb)/2;
// 地板、牆、天花板
plane(RW,RD,wood(3,4,0,0xd8c0a0),0,0,cz,0,-Math.PI/2);
const wallM=wood(2,6,Math.PI/2,0xc8a888);
plane(RW,H,wallM,0,H/2,ROOM.zb,0); plane(RW,H,wallM,0,H/2,ROOM.zf,Math.PI);
plane(RD,H,wallM,ROOM.x,H/2,cz,-Math.PI/2);   // 左牆有窗，在下面分段做
plane(RW,RD,wood(2,3,0,0x9a7a5a),0,H,cz,0,Math.PI/2);
// 屋樑、牆角柱、踢腳板
const beamM=wood(.5,3,Math.PI/2,0x8a6040);
for(let z=ROOM.zb+.6;z<ROOM.zf;z+=1.3) box(RW,.18,.16,beamM,0,H-.09,z);
for(const x of [-ROOM.x+.08,ROOM.x-.08]) for(const z of [ROOM.zb+.08,ROOM.zf-.08]) box(.16,H,.16,beamM,x,H/2,z);
const trimM=new T.MeshStandardMaterial({color:0x5a3e28,roughness:.7});
box(RW,.12,.03,trimM,0,.06,ROOM.zb+.015); box(.03,.12,RD,trimM,-ROOM.x+.015,.06,cz); box(.03,.12,RD,trimM,ROOM.x-.015,.06,cz);
// 窗戶（左牆）：窗外是真實湖景全景，依時段換成白天／黃昏／夜晚
const WIN={w:1.6,h:1.1,y:1.55,z:.5}, WINROT=+(new URLSearchParams(location.search).get('winrot')||1.2), winTex={}; ['day','dawn','night'].forEach(k=>{ const x=TL.load('env_'+k+'_band.jpg'); x.encoding=T.sRGBEncoding; winTex[k]=x; });
const viewM=new T.MeshBasicMaterial({map:winTex.day,side:T.BackSide,fog:false});
// 窗外：把湖景全景貼在房子外面一圈 60 公尺遠的大圓筒內側（比例與實景一致、遠近有視差），原本是一張貼在窗後 60 公分的平面照片，又近又被壓扁
const rainGlass=(()=>{ const cv=document.createElement('canvas'); cv.width=256; cv.height=192; const g=cv.getContext('2d'), tex=new T.CanvasTexture(cv), drops=[];
  for(let i=0;i<70;i++) drops.push({x:Math.random()*256,y:Math.random()*192,r:1+Math.random()*2.6,v:0});
  const m=new T.Mesh(new T.PlaneGeometry(WIN.w,WIN.h),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:0})); m.rotation.y=Math.PI/2; m.position.set(-ROOM.x+.03,WIN.y,WIN.z); scene.add(m);
  return {m,tick(dt,k){ m.material.opacity=k; if(k<.02) return; g.clearRect(0,0,256,192); g.fillStyle='rgba(120,130,140,'+(.25*k)+')'; g.fillRect(0,0,256,192);   // 雨天窗外霧濛濛
    drops.forEach(d=>{ if(d.r>2.4&&Math.random()<dt*.6*k) d.v=40+Math.random()*60; d.y+=d.v*dt; if(d.v){ g.strokeStyle='rgba(220,230,240,.35)'; g.lineWidth=d.r*.8; g.beginPath(); g.moveTo(d.x,d.y-14); g.lineTo(d.x,d.y); g.stroke(); d.v*=.985; if(d.v<5) d.v=0; }   // 大水珠會滑下來
      if(d.y>196||Math.random()<dt*.05){ d.x=Math.random()*256; d.y=Math.random()*150; d.r=1+Math.random()*2.6; d.v=0; }
      const gr=g.createRadialGradient(d.x-d.r*.3,d.y-d.r*.3,0,d.x,d.y,d.r); gr.addColorStop(0,'rgba(255,255,255,.75)'); gr.addColorStop(.6,'rgba(200,210,220,.35)'); gr.addColorStop(1,'rgba(60,70,80,.25)'); g.fillStyle=gr; g.beginPath(); g.arc(d.x,d.y,d.r,0,6.3); g.fill(); });
    tex.needsUpdate=true; }}; })();
const view=(()=>{ const R=60, Hh=2*Math.PI*R*1366/8192, g=new T.CylinderGeometry(R,R,Hh,96,1,true), uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setX(i,1-uv.getX(i));   // 從內側看要左右翻
  const m=new T.Mesh(g,viewM); m.position.set(0,1.45+.3*Hh,WIN.z);   /* 全景的地平線在圖的下方兩成：對齊到眼睛高度 */ m.rotation.y=WINROT; m.renderOrder=-1; scene.add(m);
  const gr=new T.Mesh(new T.CircleGeometry(R,48).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0x4a3f33,fog:false})); gr.position.set(0,1.45+.3*Hh-Hh/2+.05,WIN.z); scene.add(gr); return m; })();
{ // 左牆分成窗戶上、下、前、後四塊，窗戶位置真的留空，才看得到窗外
  const yb=WIN.y-WIN.h/2, yt=WIN.y+WIN.h/2, z0=WIN.z-WIN.w/2, z1=WIN.z+WIN.w/2, X=-ROOM.x, r=Math.PI/2;
  plane(RD,yb,wallM,X,yb/2,cz,r); plane(RD,H-yt,wallM,X,(yt+H)/2,cz,r);
  plane(z0-ROOM.zb,WIN.h,wallM,X,WIN.y,(ROOM.zb+z0)/2,r); plane(ROOM.zf-z1,WIN.h,wallM,X,WIN.y,(z1+ROOM.zf)/2,r);
  plane(.3,WIN.h,wallM,X-.15,WIN.y,z0,0); plane(.3,WIN.h,wallM,X-.15,WIN.y,z1,Math.PI); }   // 窗框兩側的牆厚
const frameM=new T.MeshStandardMaterial({color:0xe8dcc8,roughness:.6});
box(.08,.08,WIN.w+.16,frameM,-ROOM.x+.04,WIN.y+WIN.h/2+.04,WIN.z); box(.12,.06,WIN.w+.24,frameM,-ROOM.x+.06,WIN.y-WIN.h/2-.03,WIN.z);
box(.08,WIN.h,.08,frameM,-ROOM.x+.04,WIN.y,WIN.z-WIN.w/2-.04); box(.08,WIN.h,.08,frameM,-ROOM.x+.04,WIN.y,WIN.z+WIN.w/2+.04);
box(.04,WIN.h,.04,frameM,-ROOM.x+.03,WIN.y,WIN.z); box(.04,.04,WIN.w,frameM,-ROOM.x+.03,WIN.y,WIN.z);
// 壁爐（右牆）：石砌、爐火會閃爍
// 壁爐：真實石牆貼圖（Poly Haven castle_brick_07，CC0）
const pbr=(name,rx,ry,extra)=>{ const mk=f=>{ const x=TL.load('models/home/'+name+'_'+f+'.jpg'); x.wrapS=x.wrapT=T.RepeatWrapping; x.repeat.set(rx,ry); x.anisotropy=4; return x; };
  const d=mk('Diffuse'); d.encoding=T.sRGBEncoding; return new T.MeshStandardMaterial(Object.assign({map:d,normalMap:mk('nor_gl'),roughnessMap:mk('Rough'),roughness:1},extra||{})); };
const stoneM=pbr('castle_brick_07',1.2,1.2);
// 壁爐（右牆）：左右石柱＋上方石樑，中間是真的爐口，爐火會閃爍
const FP={z:.5}, FX=ROOM.x-.28;
const fpParts=[];
// 場景裡的指引標籤：輕輕上下浮動，告訴玩家哪裡可以點
function drawTag(g,text,hot){ g.clearRect(0,0,512,128);
  g.fillStyle=hot?'rgba(120,70,10,.85)':'rgba(20,14,10,.72)'; g.beginPath(); g.roundRect?g.roundRect(8,14,496,100,50):g.rect(8,14,496,100); g.fill(); g.strokeStyle=hot?'rgba(255,214,110,.95)':'rgba(255,210,150,.6)'; g.lineWidth=hot?7:4; g.stroke();
  g.fillStyle=hot?'#fff2c0':'#ffe9c8'; g.font='bold 54px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,256,66); }
function makeTag(text){ const cv=document.createElement('canvas'); cv.width=512; cv.height=128; const g=cv.getContext('2d'); drawTag(g,text,false);
  const tx=new T.CanvasTexture(cv); tx.encoding=T.sRGBEncoding; const sp=new T.Sprite(new T.SpriteMaterial({map:tx,transparent:true,depthTest:false,depthWrite:false})); sp.scale.set(.62,.155,1); sp.renderOrder=20; sp.userData.g=g; sp.userData.txt=text; return sp; }
// 換標籤文字（有東西可以領、可以採時改成金色醒目的樣式）；文字沒變就不重畫
function setTag(sp,text,hot){ const k=text+(hot?'*':''); if(sp.userData.txt===k) return; sp.userData.txt=k; drawTag(sp.userData.g,text,hot); sp.material.map.needsUpdate=true; }
const tags=[];
// 靜月之光水晶展示櫃：深色實木櫃＋玻璃門、黑絲絨底板、每格作品照片裝框並有黃銅名牌、每層 LED 燈條、頂部招牌；
// 櫃子下方小檯面放一簇立體紫水晶和一顆水晶球，還有點點閃光——點任何一處都前往作者的蝦皮小店
const shopParts=[], sparkles=[];
{ const cab=new T.Group(); cab.position.set(0,1.55,ROOM.zf-.12); cab.rotation.y=Math.PI; scene.add(cab);
  const woodM=new T.MeshStandardMaterial({color:0x22140b,roughness:.38,metalness:.05}), brass=new T.MeshStandardMaterial({color:0xc9a35a,roughness:.3,metalness:.85}), velvet=new T.MeshStandardMaterial({color:0x14101a,roughness:1});
  const back=new T.Mesh(new T.BoxGeometry(1.7,1.32,.04),velvet); back.position.z=-.1; cab.add(back);
  for(const [w,h,d,x,y,z] of [[1.82,.09,.3,0,.7,0],[1.82,.09,.3,0,-.7,0],[.09,1.48,.3,-.87,0,0],[.09,1.48,.3,.87,0,0],[1.7,.035,.26,0,.22,-.01],[1.7,.035,.26,0,-.22,-.01]]){ const b=new T.Mesh(new T.BoxGeometry(w,h,d),woodM); b.position.set(x,y,z); cab.add(b); }
  // 頂冠＋招牌
  const crown=new T.Mesh(new T.BoxGeometry(1.95,.16,.34),woodM); crown.position.y=.82; cab.add(crown);
  const sc=document.createElement('canvas'); sc.width=1024; sc.height=128; { const g=sc.getContext('2d'); const gr=g.createLinearGradient(0,0,0,128); gr.addColorStop(0,'#2a1a10'); gr.addColorStop(1,'#1a0f08'); g.fillStyle=gr; g.fillRect(0,0,1024,128);
    g.strokeStyle='#c9a35a'; g.lineWidth=4; g.strokeRect(8,8,1008,112); g.font='bold 64px serif'; g.textAlign='center'; g.textBaseline='middle'; const tg2=g.createLinearGradient(0,30,0,100); tg2.addColorStop(0,'#fff2c4'); tg2.addColorStop(1,'#c9963a'); g.fillStyle=tg2; g.fillText('✦ 靜月之光 · 天然水晶 ✦',512,66); }
  const st=new T.CanvasTexture(sc); st.encoding=T.sRGBEncoding; const sign=new T.Mesh(new T.PlaneGeometry(1.8,.225),new T.MeshStandardMaterial({map:st,emissive:0xffffff,emissiveMap:st,emissiveIntensity:.35,roughness:.4})); sign.position.set(0,.82,.172); cab.add(sign); shopParts.push(sign);
  // 每層頂上的暖白 LED 燈條＋往下的柔光
  const ledM=new T.MeshBasicMaterial({color:0xfff1d6}); for(const y of [.64,.2,-.24]){ const l=new T.Mesh(new T.BoxGeometry(1.6,.012,.012),ledM); l.position.set(0,y,.06); cab.add(l);
    const glow=new T.Mesh(new T.PlaneGeometry(1.6,.36),new T.MeshBasicMaterial({color:0xffe2b0,transparent:true,opacity:.07,blending:T.AdditiveBlending,depthWrite:false})); glow.position.set(0,y-.18,-.06); cab.add(glow); }
  for(let i=0;i<9;i++){ const tx=TL.load('shop'+(i+1)+'.jpg'); tx.encoding=T.sRGBEncoding; const r=Math.floor(i/3), cI=i%3, x=(cI-1)*.54, y=(1-r)*.44;
    const fr=new T.Mesh(new T.BoxGeometry(.46,.38,.02),brass); fr.position.set(x,y+.01,-.075); cab.add(fr);   // 黃銅細框
    const ph=new T.Mesh(new T.PlaneGeometry(.42,.34),new T.MeshStandardMaterial({map:tx,roughness:.35,emissive:0xffffff,emissiveMap:tx,emissiveIntensity:.32})); ph.position.set(x,y+.01,-.063); cab.add(ph); shopParts.push(ph);
    const pl=new T.Mesh(new T.BoxGeometry(.14,.025,.01),brass); pl.position.set(x,y-.19,-.06); cab.add(pl); }   // 小名牌
  // 玻璃門（兩片＋把手），帶一點反光
  for(const s2 of [-1,1]){ const gl=new T.Mesh(new T.PlaneGeometry(.84,1.32),new T.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.1,roughness:.02,metalness:.4,depthWrite:false})); gl.position.set(s2*.42,0,.14); cab.add(gl); shopParts.push(gl);
    const hd=new T.Mesh(new T.CylinderGeometry(.008,.008,.12,8),brass); hd.position.set(s2*.05,0,.16); cab.add(hd); }
  // 下方小檯面：一簇立體紫水晶＋水晶球
  const ledge=new T.Mesh(new T.BoxGeometry(1.2,.05,.28),woodM); ledge.position.set(0,-.86,.06); cab.add(ledge);
  const amM=new T.MeshPhysicalMaterial({color:0x8a4fd0,roughness:.08,metalness:0,transparent:true,opacity:.82,clearcoat:1,emissive:0x2a0a50,emissiveIntensity:.6});
  const clu=new T.Group(); clu.position.set(-.3,-.83,.06); cab.add(clu);
  const rock=new T.Mesh(new T.IcosahedronGeometry(.075,1),new T.MeshStandardMaterial({color:0x5a5248,roughness:.9})); rock.scale.set(1.4,.55,1); clu.add(rock);
  for(let i=0;i<9;i++){ const h=.06+Math.random()*.1, cr=new T.Group(); const p=new T.Mesh(new T.CylinderGeometry(.016,.018,h,6),amM); p.position.y=h/2; cr.add(p); const tip=new T.Mesh(new T.ConeGeometry(.016,.035,6),amM); tip.position.y=h+.017; cr.add(tip);
    cr.position.set((Math.random()-.5)*.12,.02,(Math.random()-.5)*.06); cr.rotation.set((Math.random()-.5)*.8,Math.random()*6,(Math.random()-.5)*.8); clu.add(cr); }   // 六角柱＋尖頂的紫水晶簇
  shopParts.push(rock);
  const ball=new T.Mesh(new T.SphereGeometry(.07,32,24),new T.MeshPhysicalMaterial({color:0xeaf4ff,roughness:0,metalness:0,transparent:true,opacity:.45,clearcoat:1,emissive:0x203040,emissiveIntensity:.3})); ball.position.set(.3,-.76,.06); cab.add(ball); shopParts.push(ball);
  const bstand=new T.Mesh(new T.CylinderGeometry(.05,.065,.04,24),brass); bstand.position.set(.3,-.82,.06); cab.add(bstand);
  // 閃光
  const spT=(()=>{ const c2=document.createElement('canvas'); c2.width=c2.height=64; const g=c2.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.2,'rgba(255,240,220,.6)'); gr.addColorStop(1,'rgba(255,240,220,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); g.fillStyle='rgba(255,255,255,.9)'; g.fillRect(30,4,4,56); g.fillRect(4,30,56,4); return new T.CanvasTexture(c2); })();
  for(let i=0;i<10;i++){ const sp=new T.Sprite(new T.SpriteMaterial({map:spT,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:0})); sp.scale.setScalar(.05); sp.position.set((Math.random()-.5)*1.5,(Math.random()-.5)*1.2,.0); cab.add(sp); sparkles.push({sp,ph:Math.random()*20}); }
  const tg=makeTag('💎 靜月之光 水晶'); tg.position.set(0,2.55,ROOM.zf-.2); scene.add(tg); tags.push({s:tg,y:2.55,k:'shop'}); }
box(.55,1.3,.32,stoneM,FX,.65,FP.z-.66); box(.55,1.3,.32,stoneM,FX,.65,FP.z+.66);
box(.55,.5,1.0,stoneM,FX,1.05,FP.z); box(.45,1.6,1.0,stoneM,ROOM.x-.22,2.1,FP.z);
box(.75,.08,1.9,new T.MeshStandardMaterial({color:0x5a4030,roughness:.8}),ROOM.x-.36,1.34,FP.z);
box(.06,.8,1.0,new T.MeshBasicMaterial({color:0x0a0604}),ROOM.x-.04,.4,FP.z);   // 爐口後壁燻黑，不受光
box(.9,.06,1.8,stoneM,ROOM.x-.45,.03,FP.z);
// 火焰貼圖：底部亮黃、往上變橘紅再透明，兩片交叉擺放
const flameTex=(()=>{ const cv=document.createElement('canvas'); cv.width=128; cv.height=128; const g=cv.getContext('2d');
  for(let i=0;i<5;i++){ const x=20+i*22, gr=g.createRadialGradient(x,118,2,x,80,46); gr.addColorStop(0,'rgba(255,240,170,1)'); gr.addColorStop(.35,'rgba(255,150,40,.9)'); gr.addColorStop(.7,'rgba(200,50,10,.5)'); gr.addColorStop(1,'rgba(120,20,0,0)');
    g.fillStyle=gr; g.beginPath(); g.ellipse(x,85,20,44,0,0,Math.PI*2); g.fill(); }
  const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return t; })();
const fireM=new T.MeshBasicMaterial({map:flameTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
const fire=plane(.8,.55,fireM,ROOM.x-.3,.42,FP.z,-Math.PI/2); fpParts.push(fire);
{ const hitBox=new T.Mesh(new T.BoxGeometry(.5,1.3,1.5),new T.MeshBasicMaterial({visible:false})); hitBox.position.set(ROOM.x-.45,.65,FP.z); scene.add(hitBox); fpParts.push(hitBox);
  const tg=makeTag('🔥 點壁爐烤魚'); tg.position.set(ROOM.x-.55,1.62,FP.z); scene.add(tg); tags.push({s:tg,y:1.62,k:'grill'}); } plane(.7,.5,fireM,ROOM.x-.3,.4,FP.z,-Math.PI/2+.6);
fire.visible=false; fireM.visible=false;
// 火焰：每片是噪聲驅動、往上竄的火舌（底部白黃、中段橘、頂端暗紅漸透明），四片交叉成立體的火
const FU={uT:{value:0},uK:{value:1}};
const flameMat=new T.ShaderMaterial({uniforms:FU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:`uniform float uT; uniform float uK; varying vec2 vU;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=0.5; } return v; }
    void main(){ vec2 u=vU; float y=u.y;
      vec2 q=vec2(u.x*3.0, y*2.2-uT*1.9); float d=fbm(q+vec2(0.0,fbm(q*1.7+uT*0.6)*0.9));
      float w=1.0-abs(u.x-0.5)*2.0; w=smoothstep(0.05,0.9,w)*(1.0-y*0.55);
      float shape=w*(1.05-y*1.15)+(d-0.5)*0.85; float f=smoothstep(0.12,0.6,shape)*smoothstep(1.0,0.45,y)*smoothstep(0.0,0.14,y)*uK;
      vec3 c=mix(vec3(0.55,0.06,0.0),vec3(1.0,0.45,0.05),smoothstep(0.1,0.5,f)); c=mix(c,vec3(1.0,0.86,0.45),smoothstep(0.55,0.9,f)); c=mix(c,vec3(1.0,0.97,0.85),smoothstep(0.85,1.0,f)*(1.0-y));
      gl_FragColor=vec4(c*f*0.55,f*0.8); }`});
const flames=[]; for(let i=0;i<4;i++){ const fm=new T.Mesh(new T.PlaneGeometry(.7,.52),flameMat.clone()); fm.material.uniforms={uT:{value:i*3.1},uK:FU.uK}; fm.position.set(ROOM.x-.3+(i%2?.04:-.04),.4,FP.z+(i-1.5)*.05); fm.rotation.y=-Math.PI/2+(i-1.5)*.55; scene.add(fm); flames.push(fm); fpParts.push(fm); }
// 木柴：真實樹皮貼圖、不規則形狀；燒焦端用燒過的地面貼圖，裂縫透出橘紅餘燼光
const barkM=(()=>{ const ld=f=>{ const x=TL.load('models/home/bark_brown_02_'+f+'.jpg'); x.wrapS=x.wrapT=T.RepeatWrapping; x.repeat.set(1,2.2); return x; }; const d=ld('Diffuse'); d.encoding=T.sRGBEncoding; return new T.MeshStandardMaterial({map:d,normalMap:ld('nor_gl'),roughnessMap:ld('Rough'),roughness:1}); })();
const emberU={uT:{value:0}};
const charM=(()=>{ const ld=f=>{ const x=TL.load('models/home/burned_ground_01_'+f+'.jpg'); x.wrapS=x.wrapT=T.RepeatWrapping; x.repeat.set(.8,.8); return x; }; const d=ld('Diffuse'); d.encoding=T.sRGBEncoding;
  const m=new T.MeshStandardMaterial({map:d,normalMap:ld('nor_gl'),roughness:1,color:0x3a3430,emissive:0xff5a10});
  m.onBeforeCompile=sh=>{ sh.uniforms.uT=emberU.uT; sh.fragmentShader='uniform float uT;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float lum_=dot(texture2D(map,vUv).rgb,vec3(0.33)); float crack_=smoothstep(0.32,0.12,lum_); float pulse_=0.65+0.35*sin(uT*2.3+vUv.x*17.0)*sin(uT*1.7+vUv.y*11.0);
      totalEmissiveRadiance=vec3(1.0,0.32,0.05)*crack_*pulse_*1.6;`); }; m.customProgramCacheKey=()=>'ember'; return m; })();
for(let i=0;i<3;i++){ const geo=new T.CylinderGeometry(.065,.075,.72,14,6); const ps=geo.attributes.position; for(let j=0;j<ps.count;j++){ const y=ps.getY(j), a=Math.atan2(ps.getZ(j),ps.getX(j)); const r=1+.08*Math.sin(a*3+i)+.05*Math.sin(y*9+a*2); ps.setX(j,ps.getX(j)*r); ps.setZ(j,ps.getZ(j)*r); } geo.computeVertexNormals();
  const lg=new T.Mesh(geo,[barkM,charM,charM]); lg.rotation.x=Math.PI/2; lg.rotation.z=(i-1)*.18; lg.position.set(ROOM.x-.3,.11+(i===2?.11:0),FP.z+(i-1)*.12); scene.add(lg);
  const coal=new T.Mesh(new T.CylinderGeometry(.055,.06,.5,12,1,true),charM); coal.rotation.copy(lg.rotation); coal.position.copy(lg.position); coal.position.y+=.012; coal.scale.set(1.12,1,1.12); scene.add(coal); }
const bed=new T.Mesh(new T.CircleGeometry(.36,24).rotateX(-Math.PI/2),charM); bed.position.set(ROOM.x-.3,.035,FP.z); bed.scale.set(.8,1,1.3); scene.add(bed);
// 火星：從火堆往上飄、一閃一閃
const sparkTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=16; const g=cv.getContext('2d'), rg=g.createRadialGradient(8,8,0,8,8,8); rg.addColorStop(0,'rgba(255,230,160,1)'); rg.addColorStop(.4,'rgba(255,140,40,.8)'); rg.addColorStop(1,'rgba(255,80,0,0)'); g.fillStyle=rg; g.fillRect(0,0,16,16); return new T.CanvasTexture(cv); })();
const sparks=[]; for(let i=0;i<30;i++){ const s=new T.Sprite(new T.SpriteMaterial({map:sparkTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending})); s.scale.set(.025,.025,1); s.visible=false; scene.add(s); sparks.push({s,v:new T.Vector3(),t:0,life:1}); }
const fireL=new T.PointLight(0xff8a40,2.2,9,1.3); fireL.position.set(ROOM.x-1.1,.6,FP.z); scene.add(fireL);
// 家具：Poly Haven 真實模型（CC0），回家時才載入。位置以房間中央偏後的客廳區為主
const GL=new T.GLTFLoader(), mcache={}, glowM=[];
const ART={hanging_picture_frame_01:'mer_a2.jpg',hanging_picture_frame_02:'mer_a2.jpg'};
function put(name,x,y,z,ry,sc,fn){ const place=g=>{ const o=g.scene.clone(true); o.position.set(x,y,z); o.rotation.y=ry||0; o.scale.setScalar(sc||1);
    o.traverse(m=>{ if(!m.isMesh) return; m.frustumCulled=false; const mats=Array.isArray(m.material)?m.material:[m.material];
      mats.forEach((mm,i)=>{ if(!mm) return; if(mm.map) mm.map.anisotropy=4;
        if(/_artwork$/.test(mm.name)&&ART[name]){ const nm=mm.clone(); const tx=TL.load(ART[name]); tx.encoding=T.sRGBEncoding; tx.flipY=false; nm.map=tx; nm.color.set(0xffffff); if(Array.isArray(m.material)) m.material[i]=nm; else m.material=nm; }
        if(/_glass$/.test(mm.name)){ const nm=new T.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.12,roughness:.05,metalness:0,depthWrite:false}); if(Array.isArray(m.material)) m.material[i]=nm; else m.material=nm; }
        if(/_lamp$/.test(mm.name)){ const nm=mm.clone(); nm.emissive=new T.Color(0xffd080); nm.emissiveIntensity=1.2; if(Array.isArray(m.material)) m.material[i]=nm; else m.material=nm; glowM.push(nm); } }); });
    scene.add(o); addObs(o); if(fn) fn(o); };
  if(mcache[name]) place(mcache[name]); else GL.load('models/home/'+name+'.glb',g=>{ mcache[name]=g; place(g); },undefined,()=>console.warn('home model',name)); }
const LV={x:-.9,z:-.45};   /* 客廳區往前移：魚缸前留 1.4 公尺走道，可以走到玻璃前面看 */
// 碰撞：落地的家具用實際模型的外框當障礙（升級換模型也自動跟著變），走路時不能穿過去
const OBS=[];
function addObs(o){ o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o); if(b.isEmpty()||b.min.y>.25||b.max.y-b.min.y<.12) return;
  OBS.push({o,x0:b.min.x,x1:b.max.x,z0:b.min.z,z1:b.max.z}); }
function dropObs(o){ for(let i=OBS.length-1;i>=0;i--) if(OBS[i].o===o) OBS.splice(i,1); }
function blocked(x,z){ const r=.28; return OBS.some(b=>x>b.x0-r&&x<b.x1+r&&z>b.z0-r&&z<b.z1+r); }
// 地毯：真實織物貼圖
plane(2.8,2.0,pbr('fabric_pattern_07',2.2,1.6,{color:0xb86a48}),LV.x+.5,.006,LV.z,0,-Math.PI/2);
// 茶几與桌上的手記、煤油燈（不分等級，一直都在）
put('coffee_table_round_01',LV.x+.5,0,LV.z,0,.85);
put('book_encyclopedia_set_01',LV.x+.5,.42,LV.z+.15,.3,.8);
put('vintage_oil_lamp',LV.x+.2,.42,LV.z-.3,0,.8);
// 家具依等級擺放：每一項標明屬於哪件家具、在哪幾級出現；升級時換模型或加擺件
const FITEMS=[
 {f:'sofa',lv:[0,1],m:'sofa_02',p:[LV.x-1.0,0,LV.z,Math.PI/2,1]},
 {f:'sofa',lv:[0,1],m:'throw_pillows_01',p:[LV.x-1.0,.42,LV.z+.1,Math.PI/2,.9]},
 {f:'sofa',lv:[1,2],m:'Ottoman_01',p:[LV.x-.65,0,LV.z+1.15,Math.PI/2,.8]},
 {f:'sofa',lv:[2,2],m:'sofa_03',p:[LV.x-1.05,0,LV.z,Math.PI/2,.72]},
 {f:'shelf',lv:[0,1],m:'wooden_bookshelf_worn',p:[-ROOM.x+.32,0,-2.2,Math.PI/2,1]},
 {f:'shelf',lv:[1,1],m:'book_encyclopedia_set_01',p:[-ROOM.x+.32,2.06,-2.2,Math.PI/2,.8]},
 {f:'shelf',lv:[2,2],m:'vintage_cabinet_01',p:[-ROOM.x+.3,0,-2.25,Math.PI/2,.8]},
 {f:'rock',lv:[0,2],m:'Rockingchair_01',p:[1.7,-.1,-.2,-Math.PI/2+.4,1]},
 {f:'rock',lv:[1,2],m:'side_table_01',p:[2.4,0,.55,-.3,.85],tint:0x8a6448},
 {f:'rock',lv:[2,2],m:'wicker_basket_01',p:[2.5,0,-1.0,.4,1.7]},
 {f:'herb',lv:[0,2],m:'potted_plant_01',p:[-ROOM.x+.5,0,ROOM.zf-.55,0,.9]},
 {f:'herb',lv:[1,2],m:'planter_box_01',p:[-ROOM.x+.24,0,-.15,Math.PI/2,1],herbs:.46},
 {f:'herb',lv:[2,2],m:'planter_box_02',p:[-ROOM.x+.25,0,1.0,Math.PI/2,1],herbs:.62},
 {f:'chest',lv:[0,2],m:'treasure_chest',p:[ROOM.x-.5,0,-2.55,-Math.PI/2,.8]},   /* 漁具箱：原本被升級變大的海水缸蓋住，移到右牆邊 */
 {f:'chest',lv:[1,2],m:'wooden_crate_01',p:[ROOM.x-.25,0,-1.75,Math.PI/2,.75]},
 {f:'chest',lv:[2,2],m:'wooden_crate_02',p:[ROOM.x-.35,0,-1.15,0,1]},
 {f:'fire',lv:[1,2],m:'pot_enamel_01',p:[ROOM.x-.35,0,FP.z+1.55,0,1.4]},
 {f:'fire',lv:[2,2],m:'brass_pan_01',p:[ROOM.x-.3,0,FP.z-1.05,.8,1.4]}];
// 香草箱裡種真實的蕁麻草模型（Poly Haven nettle_plant），沿著木箱長邊排一排
function plantHerbs(o,half){ const ld=g=>{ const names=['nettle_plant_tall_a_LOD0','nettle_plant_medium_a_LOD0','nettle_plant_tall_b_LOD0','nettle_plant_medium_b_LOD0'];
    const n=Math.round(half*10); for(let i=0;i<n;i++){ const src=g.scene.getObjectByName(names[i%4]); if(!src) continue; const k=new T.Group(), sk=src.clone(true); sk.position.set(0,0,0); k.add(sk);
      k.position.set(-half+.08+(2*half-.16)*i/Math.max(1,n-1),.3,(i%2?.06:-.06)); k.rotation.set(0,i*1.7,0); k.scale.setScalar(1.9+(i%3)*.25); o.add(k); } };
  if(mcache.nettle_plant) ld(mcache.nettle_plant); else GL.load('models/home/nettle_plant.glb',g=>{ mcache.nettle_plant=g; ld(g); }); }
function syncFurn(){ const H=c.home&&c.home(); if(!H) return;
  for(const it of FITEMS){ const lv=H.furnLv(it.f), want=lv>=it.lv[0]&&lv<=it.lv[1];
    if(want&&!it.obj&&!it.loading){ it.loading=true; const [x,y,z,ry,sc]=it.p;
      put(it.m,x,y,z,ry,sc,o=>{ it.loading=false; o.userData.furn=it.f; if(it.herbs) plantHerbs(o,it.herbs);
        // 新木色太亮的家具壓暗成老木屋的舊木色
        if(it.tint) o.traverse(m=>{ if(m.isMesh){ m.material=m.material.clone(); m.material.color.multiply(new T.Color(it.tint)); } });
        if(!(H.furnLv(it.f)>=it.lv[0]&&H.furnLv(it.f)<=it.lv[1])){ scene.remove(o); dropObs(o); return; } it.obj=o; }); }
    else if(!want&&it.obj){ scene.remove(it.obj); dropObs(it.obj); it.obj=null; } } }
put('mantel_clock_01',ROOM.x-.36,1.38,FP.z+.45,-Math.PI/2,1,o=>{ o.userData.furn='clock'; });  // 壁爐架上：時鐘與木燈籠
put('wooden_lantern_01',ROOM.x-.36,1.38,FP.z-.5,0,.8);
// 美人魚的畫像：要真的釣到過美人魚，牆上才會掛出來
const merArt=[], merSeen=()=>!!(c.save&&c.save.mer&&c.save.mer.n>0), merArtSync=()=>merArt.forEach(o=>{ o.visible=merSeen(); });
put('hanging_picture_frame_01',-ROOM.x+.02,1.95,-1.0,Math.PI/2,1,o=>{ merArt.push(o); merArtSync(); });   // 掛畫：左牆、水族箱上方
put('hanging_picture_frame_02',0,2.5,ROOM.zb+.02,0,1,o=>{ merArt.push(o); merArtSync(); });
// 燈光：天花板鐵藝吊燈、水族箱兩側壁燈，夜裡全部點亮
put('lantern_chandelier_01',0,H-.02,-1.6,0,1,o=>{ o.userData.furn='light'; lampObj=o; });
const ceilL=new T.PointLight(0xffd9a8,2.4,14,1.0); ceilL.position.set(0,H-.95,-1.6); scene.add(ceilL);
const wallLs=[];
for(const x of [-2.85,2.85]){ put('industrial_wall_lamp',x,2.05,ROOM.zb+.06,0,1); const wl=new T.PointLight(0xffe2b8,1.3,7,1.2); wl.position.set(x,1.9,ROOM.zb+.4); wl.visible=false; scene.add(wl); wallLs.push(wl); }
const fillL=new T.AmbientLight(0xffe2c4,.6); scene.add(fillL);   // 用一盞不花效能的環境補光，取代兩盞壁燈＋煤油燈＋展示櫃燈的即時光
const lampL=new T.PointLight(0xffd8a0,1.2,5,1.4); lampL.position.set(LV.x+.2,.9,LV.z-.3); lampL.visible=false; scene.add(lampL);   // 煤油燈

// 水族箱：尺寸跟著等級變；淡水缸在後牆中央，有海水缸時放在右側
const TSPEC=[{w:1.2,h:.6,d:.45,st:.85},{w:1.8,h:.75,d:.55,st:.85},{w:2.6,h:1.0,d:.7,st:.7},{w:3.4,h:1.2,d:.8,st:.55}], SEA_SPEC={w:1.25,h:.62,d:.5,st:.85}, SEA_SPECS=TSPEC;   /* 海水缸每一級的尺寸和淡水缸相同 */
// 底砂壓暗成自然溪砂的灰褐色（原本在缸燈下太白、像雪）
const sandTex={fresh:pbr('clean_pebbles',2,1,{color:0x9c8f78}),sea:pbr('coral_gravel',2,1,{color:0xc8bca6})};
const rockM=new T.MeshStandardMaterial({color:0x6a665e,roughness:.95});
// 缸背景：像真正造景缸貼的霧面背景板——上亮下暗的柔和漸層，中間一團淡淡的光，沒有生硬的線條
const bgTex=(sea)=>{ const cv=document.createElement('canvas'); cv.width=512; cv.height=256; const g=cv.getContext('2d'), gr=g.createLinearGradient(0,0,0,256);
  gr.addColorStop(0,sea?'#3f9cc8':'#3f8f86'); gr.addColorStop(.45,sea?'#145a8a':'#175650'); gr.addColorStop(1,sea?'#04182c':'#06201c'); g.fillStyle=gr; g.fillRect(0,0,512,256);
  const rg=g.createRadialGradient(256,70,10,256,90,260); rg.addColorStop(0,sea?'rgba(190,235,255,.35)':'rgba(200,250,225,.3)'); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=rg; g.fillRect(0,0,512,256);
  const vg=g.createRadialGradient(256,128,120,256,128,330); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.55)'); g.fillStyle=vg; g.fillRect(0,0,512,256);
  const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return t; };
// 圓形柔光氣泡
const bubTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), rg=g.createRadialGradient(13,12,1,16,16,15); rg.addColorStop(0,'rgba(255,255,255,.95)'); rg.addColorStop(.45,'rgba(220,245,255,.35)'); rg.addColorStop(.8,'rgba(200,235,255,.5)'); rg.addColorStop(1,'rgba(200,235,255,0)'); g.fillStyle=rg; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
// 沙底的水波光影（焦散）
const causTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=256; const g=cv.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,256,256); g.strokeStyle='rgba(255,255,255,.9)'; g.lineWidth=2.2;
  for(let i=0;i<28;i++){ g.beginPath(); const x0=Math.random()*256, y0=Math.random()*256; g.moveTo(x0,y0); for(let k=0;k<5;k++) g.quadraticCurveTo(Math.random()*256,Math.random()*256,Math.random()*256,Math.random()*256); g.stroke(); }
  const t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; return t; })();
// 燈具打下來的柔和光束：上濃下淡、左右邊緣柔化
const shaftTex=(()=>{ const cv=document.createElement('canvas'); cv.width=64; cv.height=256; const g=cv.getContext('2d');
  for(let x=0;x<64;x++){ const e=Math.sin(Math.PI*x/63); const gr=g.createLinearGradient(0,0,0,256); gr.addColorStop(0,`rgba(255,255,255,${.9*e})`); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(x,0,1,256); }
  return new T.CanvasTexture(cv); })();
const BG={fresh:bgTex(false),sea:bgTex(true)};
const metalBlack=new T.MeshStandardMaterial({color:0x111214,roughness:.35,metalness:.6});
const glassEdgeM=new T.MeshStandardMaterial({color:0x7fd0b8,transparent:true,opacity:.5,roughness:.1,metalness:.1,depthWrite:false});
const siliconeM=new T.MeshStandardMaterial({color:0x0c0d0e,roughness:.8,transparent:true,opacity:.85});
const brassM=new T.MeshStandardMaterial({color:0xb08a4a,roughness:.3,metalness:.85});
// tanks 依水質存放每個缸：群組、尺寸、位置、魚、水草、氣泡
const tanks={}, causList=[], shaftList=[], tv2=new T.Vector3(), tv3=new T.Vector3();
// 造景缸的木製底櫃：檯面板、門框、內嵌門片、黃銅把手、踢腳
function standCabinet(g,W,Hs,D){ const add=(geo,m,px,py,pz)=>{ const o=new T.Mesh(geo,m); o.position.set(px,py,pz); g.add(o); return o; };
  const body=wood(1,1,0,0x4e3322), face=wood(1,1,Math.PI/2,0x5e3e28), top=wood(2,1,0,0x3e2818);
  add(new T.BoxGeometry(W-.04,Hs-.1,D-.04),body,0,(Hs-.1)/2+.06,0);
  add(new T.BoxGeometry(W+.04,.04,D+.04),top,0,Hs-.02,0);
  add(new T.BoxGeometry(W-.02,.06,D-.06),new T.MeshStandardMaterial({color:0x1e140c,roughness:.8}),0,.03,-.01);
  const n=W>2.4?4:W>1.5?3:2, dw=(W-.1)/n, dh=Hs-.22, fz=D/2-.015;
  for(let i=0;i<n;i++){ const cx=-W/2+.05+dw*(i+.5), cy=.1+dh/2+.02;
    add(new T.BoxGeometry(dw-.02,dh,.02),face,cx,cy,fz);
    for(const [w2,h2,ox,oy] of [[dw-.06,.035,0,dh/2-.045],[dw-.06,.035,0,-dh/2+.045],[.035,dh-.06,-(dw-.06)/2+.0175,0],[.035,dh-.06,(dw-.06)/2-.0175,0]]) add(new T.BoxGeometry(w2,h2,.016),body,cx+ox,cy+oy,fz+.017);
    const kb=add(new T.SphereGeometry(.014,12,8),brassM,cx+(i%2?-1:1)*(dw/2-.07),cy+.02,fz+.03); kb.scale.z=.7; } }
function buildTank(water,spec,x){
  const old=tanks[water]; if(old){ scene.remove(old.g); for(let i=causList.length-1;i>=0;i--) if(causList[i].g===old.g) causList.splice(i,1); for(let i=shaftList.length-1;i>=0;i--) if(shaftList[i].g===old.g) shaftList.splice(i,1); }
  const g=new T.Group(), z=ROOM.zb+spec.d/2+.08, y=spec.st||.85, W=spec.w, D=spec.d, Hh=spec.h; g.position.set(x,0,z); scene.add(g);
  const add=(geo,m,px,py,pz)=>{ const o=new T.Mesh(geo,m); o.position.set(px,py,pz); g.add(o); return o; };
  standCabinet(g,W+.06,y,D+.06);
  // 背景板
  add(new T.PlaneGeometry(W-.02,Hh-.02),new T.MeshBasicMaterial({map:BG[water]}),0,y+Hh/2,-D/2+.012);
  // 底砂：前低後高的斜坡（真正造景的作法），表面有細微起伏；正面看得到底砂的斷面
  const sg=new T.PlaneGeometry(W-.03,D-.03,Math.round(W*14),8).rotateX(-Math.PI/2), sp=sg.attributes.position, hAt=(px,pz)=>{ const back=(D/2-.015-pz)/(D-.03); return .05+back*Math.min(.13,Hh*.14)+Math.sin(px*7.3+pz*5)*.006+Math.sin(px*15)*.003; };
  for(let i=0;i<sp.count;i++) sp.setY(i,hAt(sp.getX(i),sp.getZ(i))); sg.computeVertexNormals();
  add(sg,sandTex[water],0,y,0);
  const sf=new T.PlaneGeometry(W-.03,.05,Math.round(W*14),1), sfp=sf.attributes.position; for(let i=0;i<sfp.count;i++){ if(sfp.getY(i)>0) sfp.setY(i,hAt(sfp.getX(i),D/2-.016)-.025); }
  const sfm=sandTex[water].clone(); sfm.color=new T.Color(0x9a9288); add(sf,sfm,0,y+.025,D/2-.016);
  // 石組：一大兩小呈三角構圖（岩組造景），放在黃金分割的位置
  // 每顆石頭取石組模型裡的單一顆（真實掃描岩石），依缸高決定大小，下半部埋進砂裡
  const rocks=[['rock04',-.19,-.14,.5,0],['rock02',.13,-.18,.3,1.3],['rock05',-.02,.02,.2,2.4],['rock06',.34,-.06,.22,4.1],['rock03',-.38,.06,.18,.7]].slice(0,W>2.5?5:W>1.5?4:3);
  rocks.forEach(([nm,fx,fz,hk,ry])=>GL.load('rock_moss_set_01.glb',gg=>{ const src=gg.scene.getObjectByName('rock_moss_set_01_'+nm); if(!src) return; const k=src.clone(true); k.position.set(0,0,0);
    const b=new T.Box3().setFromObject(k), ctr=b.getCenter(new T.Vector3()); k.position.set(-ctr.x,0,-ctr.z); const o=new T.Group(); o.add(k);
    const px=W*fx, pz=D*fz, sz=b.getSize(new T.Vector3()), sc=Math.min(Hh*hk/Math.max(.2,b.max.y),W*hk*.7/Math.max(sz.x,sz.z)); o.position.set(px,y+hAt(px,pz)-.01,pz); o.rotation.y=ry; o.scale.setScalar(sc); o.traverse(m=>{ m.frustumCulled=false; }); g.add(o); }));
  const woods=W>2.5?[[-.3,-.1,.6,.3],[.28,.05,2.6,.26]]:W>1.1?[[-.22,-.1,.6,.28]]:[];
  woods.forEach(([fx,fz,ry,sc])=>GL.load('dry_branches_medium_01.glb',gg=>{ const o=gg.scene.clone(true); const px=W*fx, pz=D*fz; o.position.set(px,y+hAt(px,pz),pz); o.rotation.set(0,ry,0); o.scale.setScalar(sc); o.traverse(m=>{ m.frustumCulled=false; }); g.add(o); }));
  const plants=[];
  // 水草分三層：後景高的有莖草（真實蕁麻草模型）、中景蕨類、前景低矮的草皮
  const putP=(file,pick,px,pz,sc,ry)=>GL.load(file,gg=>{ let o; if(pick){ const src=gg.scene.getObjectByName(pick); if(!src) return; o=new T.Group(); const k=src.clone(true); k.position.set(0,0,0); k.updateMatrixWorld(true); const c2=new T.Box3().setFromObject(k).getCenter(new T.Vector3()); k.position.set(-c2.x,0,-c2.z); o.add(k); } else o=gg.scene.clone(true);
    o.position.set(px,y+hAt(px,pz)-.005,pz); o.rotation.y=ry; o.scale.setScalar(sc); o.traverse(m=>{ m.frustumCulled=false; }); g.add(o); plants.push({o,ph:Math.random()*6}); });
  // 後景有莖草一叢一叢種：每叢 4～7 株擠在一起、高矮不齊，兩側最高、往中間漸低（造景常用的凹形構圖）
  const stems=['nettle_plant_tall_a_LOD0','nettle_plant_tall_b_LOD0','nettle_plant_medium_a_LOD0','nettle_plant_medium_b_LOD0'], NC=Math.max(3,Math.round(W*2.6));
  for(let c2=0;c2<NC;c2++){ const cx=-W/2+.1+(W-.2)*(c2+.5)/NC+(Math.random()-.5)*.08, edge=Math.abs(cx)/(W/2), hk=.42+.38*edge*edge, n=4+Math.floor(Math.random()*4);
    for(let k=0;k<n;k++){ const px=cx+(Math.random()-.5)*.13, pz=-D/2+.045+Math.random()*D*.2;
      putP('models/home/nettle_plant.glb',stems[(c2+k)%4],px,pz,(Hh*hk/.21)*(.65+Math.random()*.5),Math.random()*6); } }
  for(let i=0;i<Math.round(W*3.2);i++){ const side=i%3===0, px=side?(Math.random()<.5?-1:1)*(W/2-.12-Math.random()*.15):(Math.random()-.5)*(W-.3), pz=-D/2+.08+Math.random()*D*(side?.6:.35);
    putP('fern_02.glb',null,px,pz,(side?.2:.13)+Math.random()*.12,Math.random()*6); }
  for(let i=0;i<Math.round(W*6);i++){ const px=(Math.random()-.5)*(W-.12), pz=D*(.05+Math.random()*.3); putP('grass_medium_01.glb',['grass_medium_01_small_a_LOD0','grass_medium_01_small_b_LOD0','grass_medium_01_mid_c_LOD0'][i%3],px,pz,.5+Math.random()*.3,Math.random()*6); }
  // 氣泡：一半從後角的氣石往上冒成一串，一半零星散在水裡
  const NB=34, bp=new Float32Array(NB*3); for(let i=0;i<NB;i++){ const col=i<18; bp[i*3]=col?W*.42+(Math.random()-.5)*.03:(Math.random()-.5)*W*.8; bp[i*3+1]=y+Math.random()*Hh; bp[i*3+2]=col?-D*.32+(Math.random()-.5)*.03:(Math.random()-.5)*D*.6; }
  const bg=new T.BufferGeometry(); bg.setAttribute('position',new T.BufferAttribute(bp,3));
  const bub=new T.Points(bg,new T.PointsMaterial({map:bubTex,color:0xeaf8ff,size:.024,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending})); g.add(bub);
  add(new T.CylinderGeometry(.018,.022,.02,12),new T.MeshStandardMaterial({color:0x8a8f94,roughness:.9}),W*.42,y+hAt(W*.42,-D*.32)+.005,-D*.32);
  // 沙底焦散：兩層慢慢漂移的水波光影
  const cm=new T.MeshBasicMaterial({map:causTex,transparent:true,opacity:.2,blending:T.AdditiveBlending,depthWrite:false,color:water==='sea'?0x9fdcff:0xbfeedd});
  const cg=sg.clone(); cg.translate(0,.004,0); const ca=new T.Mesh(cg,cm); ca.position.y=y; g.add(ca); ca.renderOrder=2; causList.push({m:cm,s:W,g});
  // 燈具打下來的光束
  for(let i=0;i<Math.round(W*2.2);i++){ const sm=new T.MeshBasicMaterial({map:shaftTex,transparent:true,opacity:.07,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,color:water==='sea'?0xbfe6ff:0xdaf5e6});
    const sh=add(new T.PlaneGeometry(.12+Math.random()*.12,Hh-.1),sm,-W/2+.15+(W-.3)*Math.random(),y+Hh/2,-D*.2+Math.random()*D*.4); sh.rotation.set(0,Math.random()*.6-.3,(Math.random()-.5)*.25); sh.renderOrder=3; shaftList.push({m:sm,ph:Math.random()*6,g}); }
  // 水面：細微反光；正面水線有一條亮亮的彎月面
  const sm2=new T.MeshStandardMaterial({color:0xcfefff,transparent:true,opacity:.22,roughness:.05,metalness:.5,side:T.DoubleSide,depthWrite:false});
  add(new T.PlaneGeometry(W-.03,D-.03).rotateX(-Math.PI/2),sm2,0,y+Hh-.07,0).renderOrder=3;
  add(new T.PlaneGeometry(W-.03,.008),new T.MeshBasicMaterial({color:0xe8f8ff,transparent:true,opacity:.55,depthWrite:false}),0,y+Hh-.07,D/2-.008).renderOrder=5;
  const waterM=new T.MeshStandardMaterial({color:water==='sea'?0x0a4a7a:0x0e4a4a,transparent:true,opacity:.12,roughness:.1,depthWrite:false});   // 水體只輕輕染色，不要把整缸刷淡
  const wv=add(new T.BoxGeometry(W-.02,Hh-.08,D-.02),waterM,0,y+(Hh-.08)/2,0); wv.renderOrder=3;
  // 無框超白玻璃：幾乎透明，只有轉角的玻璃厚度透出淡綠色，接縫是黑色矽利康
  const gl=add(new T.BoxGeometry(W,Hh,D),new T.MeshStandardMaterial({color:0xeaf8ff,transparent:true,opacity:.04,roughness:.03,metalness:.2,depthWrite:false}),0,y+Hh/2,0); gl.renderOrder=4; gl.userData.tank=water;
  for(const sx of [-1,1]) for(const sz of [-1,1]){ add(new T.BoxGeometry(.012,Hh,.012),glassEdgeM,sx*(W/2-.006),y+Hh/2,sz*(D/2-.006)).renderOrder=5; add(new T.BoxGeometry(.006,Hh-.01,.006),siliconeM,sx*(W/2-.014),y+Hh/2,sz*(D/2-.014)); }
  for(const sz of [-1,1]) add(new T.BoxGeometry(W,.012,.012),glassEdgeM,0,y+Hh-.006,sz*(D/2-.006)).renderOrder=5;
  for(const sx of [-1,1]) add(new T.BoxGeometry(.012,.012,D),glassEdgeM,sx*(W/2-.006),y+Hh-.006,0).renderOrder=5;
  add(new T.BoxGeometry(W+.004,.012,D+.004),siliconeM,0,y+.006,0);
  // 吊燈式水族燈：黑色鋁燈架跨在缸上，底面發光
  const ly=y+Hh+.16; add(new T.BoxGeometry(W*.9,.022,Math.min(.16,D*.4)),metalBlack,0,ly,0);
  add(new T.PlaneGeometry(W*.88,Math.min(.14,D*.36)).rotateX(Math.PI/2),new T.MeshBasicMaterial({color:water==='sea'?0xd6eeff:0xfff6e6}),0,ly-.012,0);
  for(const sx of [-1,1]){ add(new T.BoxGeometry(.012,.17,.012),metalBlack,sx*(W*.45-.01),ly-.08,D*.12); add(new T.BoxGeometry(.012,.17,.012),metalBlack,sx*(W*.45-.01),ly-.08,-D*.12); }
  if(!tags.some(q=>q.k==='tank_'+water)){ const tg=makeTag(water==='sea'?'👆 點海水缸觀賞':'👆 點水族箱觀賞'); tg.position.set(x,ly+.2,z); scene.add(tg); tags.push({s:tg,y:ly+.2,k:'tank_'+water}); } else { const tg=tags.find(q=>q.k==='tank_'+water); tg.s.position.set(x,ly+.2,z); tg.y=ly+.2; }
  if(false&&W>2.5){ const L2=new T.PointLight(0x9ad8ff,.6,3,1.4); L2.position.set(-W*.3,y+Hh-.05,0); g.add(L2); const L3=L2.clone(); L3.position.x=W*.3; g.add(L3); }
  const L=new T.PointLight(water==='sea'?0x8ad0ff:0x9ad8ff,.75,3,1.4); L.position.set(0,y+Hh-.05,0); g.add(L);
  tanks[water]={g,spec,x,y,z,fish:[],plants,bub,glass:gl,sig:'',hAt};
}

// 把水族箱裡記錄的魚做成會游的模型（用遊戲同一個魚模型，按實際體長縮放）
function fishObj(rec){ const sp=c.species(rec.id); if(!sp) return null;
  if(window.__TIDE&&window.__TIDE.makeModel&&BENTHIC[rec.id]){ const m=window.__TIDE.makeModel(rec.id); if(m){ m.group.userData.uni=m.uni; return m.group; } }   // 貝類用兩片真殼的模型
  const src=c.getFish(sp).group.clone(true); src.position.set(0,0,0); src.rotation.set(0,0,0); src.scale.setScalar(1); src.visible=true;
  src.traverse(o=>{ o.visible=true; o.frustumCulled=false; if(o.isMesh&&o.material){ const mats=Array.isArray(o.material)?o.material:[o.material];
      const nm=mats.map(m=>{ const k=m.clone(); k.onBeforeCompile=()=>{}; k.customProgramCacheKey=()=>'tank'; const see=m.transparent&&m.opacity<.95; k.transparent=see; k.opacity=see?m.opacity:1; k.depthWrite=!see; k.needsUpdate=true; return k; });   // 半透明的幽靈魚保持半透明
      o.material=Array.isArray(o.material)?nm:nm[0]; o.renderOrder=1; } });
  const w=new T.Group(); w.add(src); const bones=rigFish(src); w.scale.setScalar(rec.L); w.userData.rec=rec; w.userData.real=c.isReal(rec.id); w.userData.bones=bones; return w; }
// 執行時綁骨：魚頭朝群組的 +x；在每個網格的本地座標裡找出「往前」與「往上」的方向，沿長軸放 7 節骨頭，依前後位置線性分配權重
const NB_=7;
function rigFish(root){ root.updateMatrixWorld(true); const inv=new T.Matrix4(), all=[]; const meshes=[]; root.traverse(o=>{ if(o.isMesh&&!o.isSkinnedMesh&&o.geometry&&o.geometry.attributes.position) meshes.push(o); });
  meshes.forEach(o=>{ const g=o.geometry.clone(); const pos=g.attributes.position;
    inv.copy(o.matrixWorld).invert(); const fw=new T.Vector3(1,0,0).transformDirection(inv).normalize(), up=new T.Vector3(0,1,0).transformDirection(inv).normalize();
    let lo=Infinity, hi=-Infinity; for(let i=0;i<pos.count;i++){ const s=pos.getX(i)*fw.x+pos.getY(i)*fw.y+pos.getZ(i)*fw.z; if(s<lo) lo=s; if(s>hi) hi=s; } const len=Math.max(1e-6,hi-lo);
    const si=new Uint16Array(pos.count*4), sw=new Float32Array(pos.count*4);
    for(let i=0;i<pos.count;i++){ const s=pos.getX(i)*fw.x+pos.getY(i)*fw.y+pos.getZ(i)*fw.z, u=(hi-s)/len*(NB_-1), a=Math.min(NB_-2,Math.max(0,Math.floor(u))), f=Math.min(1,Math.max(0,u-a)); si[i*4]=a; si[i*4+1]=a+1; sw[i*4]=1-f; sw[i*4+1]=f; }
    g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4)); g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
    const bones=[]; const c0=new T.Vector3(); g.computeBoundingBox(); g.boundingBox.getCenter(c0); const off=c0.clone().sub(fw.clone().multiplyScalar(c0.dot(fw))); 
    for(let k=0;k<NB_;k++){ const b=new T.Bone(); if(k===0) b.position.copy(off).addScaledVector(fw,hi); else b.position.copy(fw).multiplyScalar(-len/(NB_-1)); if(k>0) bones[k-1].add(b); bones.push(b); }
    const sm=new T.SkinnedMesh(g,o.material); sm.add(bones[0]); sm.bind(new T.Skeleton(bones)); sm.position.copy(o.position); sm.quaternion.copy(o.quaternion); sm.scale.copy(o.scale); sm.frustumCulled=false; sm.renderOrder=1;
    const mats=Array.isArray(sm.material)?sm.material:[sm.material]; mats.forEach(m=>{ m.skinning=true; m.needsUpdate=true; });
    o.parent.add(sm); o.parent.remove(o); all.push({bones,up}); });
  return all; }
const qb_=new T.Quaternion();
// 骨架游泳：擺動波從頭傳到尾，頭幾乎不動、尾巴擺最大；速度越快擺越快越大；轉彎時身體彎成 C 形
function swimBones(f,dt){ const rig=f.o.userData.bones; if(!rig||!rig.length) return; const spd=Math.min(1,f.v*10);
  f.sw=(f.sw||0)+dt*(2.2+spd*7.5); const A=.05+.13*spd, bend=Math.max(-.5,Math.min(.5,f.turnRate||0))*.22;
  rig.forEach(r=>{ r.bones.forEach((b,k)=>{ const u=k/(NB_-1); const amp=k===0?A*.12:A*(.25+.95*u*u); const ang=amp*Math.sin(f.sw-k*.9)+(k>0?bend*u:0); qb_.setFromAxisAngle(r.up,ang); b.quaternion.copy(qb_); }); }); }
// 缸內顯示長度：超過缸寬三成的大魚等比例壓小（保留大小順序），每條魚才有空間真的游來游去
function dispL(tk,L){ const cap=tk.spec.w*.3; return L<=cap?L:cap+(L-cap)*.18; }
function bounds(tk,L){ L=dispL(tk,L); const s=tk.spec, m=Math.min(L*.55,s.w*.4); return {x0:-s.w/2+m+.03,x1:s.w/2-m-.03,y0:tk.y+.16+L*.22,y1:tk.y+s.h-.12-L*.18,z0:-s.d/2+.06+L*.12,z1:s.d/2-.06-L*.12}; }
function pickTarget(f,tk){ const b=bounds(tk,f.rec.L), r=(a,b)=>a+Math.random()*Math.max(0,b-a); const cy=f.o?f.o.position.y:(b.y0+b.y1)/2, dyMax=(b.y1-b.y0)*.3; f.tgt.set(r(b.x0,b.x1),Math.max(b.y0,Math.min(b.y1,cy+(Math.random()-.5)*2*dyMax)),r(Math.min(b.z0,b.z1),Math.max(b.z0,b.z1))); }
function syncFish(){ const hd=c.data(), want={fresh:hd.fresh,sea:hd.seaTank?hd.sea:[]};
  const tierSig='t'+hd.tier+(hd.seaTank?'s'+(hd.seaTier||0):'');
  if(tanks._tier!==tierSig){ tanks._tier=tierSig; buildTank('fresh',TSPEC[hd.tier]||TSPEC[0],hd.seaTank?-ROOM.x*.42:0);   /* 有海水缸時兩缸左右對稱並排 */ if(hd.seaTank){ const ss=SEA_SPECS[Math.min(3,hd.seaTier||0)]; buildTank('sea',ss,ROOM.x*.42); } else if(tanks.sea){ scene.remove(tanks.sea.g); delete tanks.sea; } }
  for(const w of ['fresh','sea']){ const tk=tanks[w]; if(!tk) continue; const list=want[w]||[], sig=list.map(r=>r.id+r.d+(c.isReal(r.id)?'r':'')).join('|');
    if(sig===tk.sig) continue; tk.sig=sig; tk.fish.forEach(f=>tk.g.remove(f.o)); tk.fish=[];
    list.forEach(rec=>{ try{ c.want(rec.id); const o=fishObj(rec); if(!o) return; o.scale.setScalar(BENTHIC[rec.id]?Math.max(.1,dispL(tk,rec.L)*1.6):dispL(tk,rec.L));   /* 小小的螃蟹、貝類在缸裡放大一點才看得到 */ const f={o,rec,tgt:new T.Vector3(),sp:.09+Math.random()*.08,ph:Math.random()*6,uni:o.userData.uni}; const b=bounds(tk,rec.L);
      o.position.set(b.x0+Math.random()*(b.x1-b.x0),b.y0+Math.random()*(b.y1-b.y0),(Math.random()-.5)*.1); o.rotation.y=Math.random()<.5?0:Math.PI; f.yaw=o.rotation.y; f.o=o; pickTarget(f,tk); tk.g.add(o); tk.fish.push(f);
      }catch(err){ console.error('tank fish',rec&&rec.id,err); } }); } }
// 標本牆：右牆、壁爐後方，兩排各四個；大魚統一縮到木板放得下的長度
const MSLOT=[]; for(const y of [1.5,2.15]) for(const z of [-3.65,-2.85,-2.05,-1.25]) MSLOT.push({y,z});   // 先掛視線高度那一排
const mountG=new T.Group(); scene.add(mountG); let mountSig='';
const plaqueM=new T.MeshStandardMaterial({color:0x3a2416,roughness:.6}), plaqueEdge=new T.MeshStandardMaterial({color:0x8a6a3a,roughness:.4,metalness:.3});
function nameTex(t1,t2){ const cv=document.createElement('canvas'); cv.width=256; cv.height=64; const g=cv.getContext('2d');
  g.fillStyle='#c8a050'; g.fillRect(0,0,256,64); g.fillStyle='#3a2410'; g.font='bold 24px sans-serif'; g.textAlign='center'; g.fillText(t1,128,28); g.font='18px sans-serif'; g.fillText(t2,128,54);
  const tx=new T.CanvasTexture(cv); tx.encoding=T.sRGBEncoding; return tx; }
function syncMounts(){ const list=c.data().mounts, sig=list.map(r=>r.id+r.d+(c.isReal(r.id)?'r':'')).join('|'); if(sig===mountSig) return; mountSig=sig;
  while(mountG.children.length) mountG.remove(mountG.children[0]);
  list.slice(0,MSLOT.length).forEach((rec,i)=>{ try{ const sl=MSLOT[i], sp=c.species(rec.id); if(!sp) return; c.want(rec.id);
    const b=new T.Mesh(new T.BoxGeometry(.04,.48,.62),plaqueM); b.position.set(ROOM.x-.03,sl.y,sl.z); mountG.add(b);
    const e=new T.Mesh(new T.BoxGeometry(.02,.52,.66),plaqueEdge); e.position.set(ROOM.x-.015,sl.y,sl.z); mountG.add(e);
    const f=fishObj(rec); if(f){ f.scale.setScalar(.56); f.rotation.set(0,-Math.PI/2,0); f.position.set(ROOM.x-.13,sl.y+.04,sl.z); f.userData.rec=rec; mountG.add(f); }
    const np=new T.Mesh(new T.PlaneGeometry(.36,.09),new T.MeshBasicMaterial({map:nameTex(sp.name,(rec.w<1?Math.round(rec.w*1000)+' g':rec.w.toFixed(1)+' kg')+'・'+new Date(rec.d).toLocaleDateString('zh-TW'))}));
    np.position.set(ROOM.x-.055,sl.y-.2,sl.z); np.rotation.y=-Math.PI/2; mountG.add(np);
    }catch(err){ console.error('mount',rec&&rec.id,err); } }); }   // 單一個標本出錯就跳過，不影響其他東西
const tv=new T.Vector3();
// 底棲生物：貝類躺在沙上不動（偶爾微微張殼）、竹蟶半埋直立、螃蟹在缸底橫著走、沙蠶在沙上爬、彈塗魚趴著偶爾一跳——不會像魚一樣在水中游
const BENTHIC={hardclam:'shell',gomphina:'shell',tellin:'shell',razor:'razor',ghostcrab:'crab',fiddler:'crab',hermit:'crab',ragworm:'worm',mudskip:'skip'};
function benthic(f,tk,dt){ const o=f.o, kind=BENTHIC[f.rec.id], b=bounds(tk,f.rec.L), sc=o.scale.x, u=f.uni||{}; f.t=(f.t||0)+dt;
  if(!f.bInit){ f.bInit=1; f.yaw=Math.random()*6.28; o.rotation.set(0,f.yaw,0); f.bt=0; o.scale.multiplyScalar(1.6);
    o.position.x=b.x0+Math.random()*(b.x1-b.x0); o.position.z=(Math.random()-.5)*tk.spec.d*.6; f.wait=Math.random()*3; }   // 一開始散在缸底各處（原本全疊在同一點），畫面上放大一點
  const floorY=(x,z)=>tk.y+tk.hAt(x,z);
  if(kind==='shell'){ o.position.y=floorY(o.position.x,o.position.z)+sc*.05; o.rotation.set(0,f.yaw,0); if(u.uAmp){ u.uAmp.value=Math.max(0,Math.sin(f.t*.25+f.ph))*.12; u.uSwim.value+=dt*.5; } return; }
  if(kind==='razor'){ o.position.y=floorY(o.position.x,o.position.z)+sc*.18; o.rotation.set(0,f.yaw,Math.PI/2); return; }
  // 會走動的：在缸底慢慢走向一個點，到了停一下再換點
  f.bt-=dt; if(f.bt<=0||!f.bT){ f.bT=new T.Vector3(b.x0+Math.random()*(b.x1-b.x0),0,(Math.random()-.5)*tk.spec.d*.6); f.bt=4+Math.random()*6; f.wait=Math.random()*2.5; }
  if(f.wait>0){ f.wait-=dt; if(u.uAmp) u.uAmp.value=.02; }
  else { const dx=f.bT.x-o.position.x, dz=f.bT.z-o.position.z, dd=Math.hypot(dx,dz); if(dd>.02){ const sp=(kind==='crab'?.05:kind==='worm'?.015:.03)*Math.min(1,dd*4);
      const head=Math.atan2(-dz,dx); if(kind==='crab'){ const want=head+Math.PI/2; let dy=want-f.yaw; while(dy>Math.PI) dy-=Math.PI*2; while(dy<-Math.PI) dy+=Math.PI*2; f.yaw+=dy*Math.min(1,dt*1.5); }   // 螃蟹橫著走：身體側面朝前進方向
      else { let dy=head-f.yaw; while(dy>Math.PI) dy-=Math.PI*2; while(dy<-Math.PI) dy+=Math.PI*2; f.yaw+=dy*Math.min(1,dt*2); }
      o.position.x+=dx/dd*sp*dt; o.position.z+=dz/dd*sp*dt; if(u.uAmp){ u.uAmp.value=kind==='crab'?.18:kind==='worm'?.15:.06; u.uSwim.value+=dt*(kind==='crab'?10:6); } } }
  let hop=0; if(kind==='skip'){ f.hp=(f.hp||0)-dt; if(f.hp<=0&&Math.random()<dt*.3){ f.hp=.5; } if(f.hp>0) hop=Math.sin((1-f.hp/.5)*Math.PI)*.04; }
  o.position.y=floorY(o.position.x,o.position.z)+(kind==='crab'?0:sc*.02)+hop; o.rotation.set(0,f.yaw,0); }   /* 貼著缸底，不浮在水中 */
function updTanks(dt){ for(const w of ['fresh','sea']){ const tk=tanks[w]; if(!tk) continue;
  tk.plants.forEach(p=>{ p.o.rotation.z=Math.sin(t*1.2+p.ph)*.06; p.o.rotation.x=Math.sin(t*.9+p.ph)*.04; });
  causList.forEach(c2=>{ c2.m.map.offset.set(t*.012,t*.009); c2.m.map.repeat.set(c2.s*1.6,1.2); });
  shaftList.forEach(q=>{ q.m.opacity=.05+.035*Math.sin(t*.35+q.ph); });
  const bp=tk.bub.geometry.attributes.position; for(let i=0;i<bp.count;i++){ let yy=bp.getY(i)+dt*(.12+(i%5)*.03); if(yy>tk.y+tk.spec.h-.08) yy=tk.y+.1; bp.setY(i,yy); } bp.needsUpdate=true;
  const fs=tk.fish;
  fs.forEach(f=>{ const o=f.o; f.v=f.v||0; f.rest=f.rest||0; if(BENTHIC[f.rec.id]){ benthic(f,tk,dt); return; }
    // 偶爾停下來懸浮一會兒
    if(f.rest>0){ f.rest-=dt; f.v+=(0.015-f.v)*Math.min(1,dt*2); }
    else if(Math.random()<dt*.06){ f.rest=1.5+Math.random()*3; }
    tv.subVectors(f.tgt,o.position); const d=tv.length(); if(d<.06){ pickTarget(f,tk); }
    tv.normalize();
    // 跟其他魚保持距離
    fs.forEach(g2=>{ if(g2===f) return; tv2.subVectors(o.position,g2.o.position); const dd=tv2.length(), need=(dispL(tk,f.rec.L)+dispL(tk,g2.rec.L))*.5; if(dd<need&&dd>1e-4){ const k=(need-dd)/need; tv.addScaledVector(tv2.normalize(),k*3.2); if(k>.5) o.position.addScaledVector(tv2,dt*.08*k); } });
    tv.y*=.6; tv.normalize();
    // 航向與俯仰分開控制：航向平滑轉，俯仰限制在 ±17 度內，不會再垂直朝上
    f.yaw=f.yaw===undefined?o.rotation.y:f.yaw; f.pitch=f.pitch||0;
    const want=Math.atan2(-tv.z,tv.x); let dy=want-f.yaw; while(dy>Math.PI) dy-=Math.PI*2; while(dy<-Math.PI) dy+=Math.PI*2;
    const turn=Math.min(1,dt*(0.9+dispL(tk,f.rec.L)*.5)); const dYaw=dy*turn; f.yaw+=dYaw; f.turnRate=dt>0?dYaw/dt:0;
    const pT=Math.max(-.3,Math.min(.3,Math.atan2(tv.y,Math.hypot(tv.x,tv.z))*.7)); f.pitch+=(pT-f.pitch)*Math.min(1,dt*1.5);
    const vmax=f.sp*Math.min(1,.5+dispL(tk,f.rec.L)*2)*(Math.abs(dy)>1.2?.3:1); if(f.rest<=0) f.v+=(vmax-f.v)*Math.min(1,dt*1.2);
    const roll=Math.max(-.25,Math.min(.25,-(f.turnRate||0)*.12));
    o.rotation.order='YZX'; o.rotation.set(roll,f.yaw,f.pitch);
    swimBones(f,dt);
    const cp=Math.cos(f.pitch); const fwd=tv3.set(Math.cos(f.yaw)*cp,Math.sin(f.pitch),-Math.sin(f.yaw)*cp); o.position.addScaledVector(fwd,f.v*dt);
    const b=bounds(tk,f.rec.L); o.position.x=Math.max(b.x0,Math.min(b.x1,o.position.x)); o.position.y=Math.max(b.y0,Math.min(b.y1,o.position.y)); o.position.z=Math.max(Math.min(b.z0,b.z1),Math.min(Math.max(b.z0,b.z1),o.position.z)); }); } }
// 環境光：白天從窗戶進來的光多、夜裡靠爐火和檯燈
const hemi=new T.HemisphereLight(0xfff0dd,0x3a2a1a,.5); scene.add(hemi);
const sun=new T.DirectionalLight(0xfff4e0,.8); sun.position.set(-6,4,-1); sun.target.position.set(0,0,-1); scene.add(sun,sun.target);
function daylight(){ const h=((c.hour()%24)+24)%24; return Math.max(0,Math.min(1,Math.min(h-5.5,19-h)/2)); }
function syncTime(){ const dl=daylight(), h=((c.hour()%24)+24)%24;
  viewM.map=dl>.6?winTex.day:dl>.05?winTex.dawn:winTex.night; viewM.needsUpdate=true; viewM.color.setScalar(.35+.65*dl);
  const lk=lightsOff()?0:1;
  hemi.intensity=(.75+.15*dl)*(lk?1:.45+.55*dl); sun.intensity=.5*dl; ceilL.intensity=(5.0-2.4*dl)*lk; wallLs.forEach(w=>w.intensity=(2.6-1.3*dl)*lk); lampL.intensity=(1.6-.8*dl)*lk; glowM.forEach(m=>m.emissiveIntensity=(1.6-1.2*dl)*lk); }
// 吊燈：點它開關燈（關燈時只剩爐火和窗外的光）
function lightsOff(){ const H=c.home&&c.home(); return !!(H&&H.data().lightOff); }
function resize(){ const s=R.getSize(new T.Vector2()), a=s.x/s.y; cam.aspect=a;
  cam.fov=Math.max(62,Math.min(80,2*Math.atan(Math.tan(23*Math.PI/180)/a)*180/Math.PI)); cam.updateProjectionMatrix(); }   // 直式手機水平視野很窄，垂直視角放大一點
const HINT='點水族箱、壁爐、家具就能使用';
// 輸入：拖曳轉頭；輕點水族箱進入觀賞模式；觀賞模式裡點魚看資料
const el=R.domElement, ray=new T.Raycaster(), ndc=new T.Vector2();
let mode='room', viewTank=null, vb=0, pan=0, panT=0, down=null, dYaw=0, dPitch=0, dYawT=0, dPitchT=0;
const ui={view:document.getElementById('homeView'),card:document.getElementById('fishCard'),hint:document.querySelector('#homeUI .hh'),btns:document.querySelector('#homeUI .hb')};
function hit(e){ const r=el.getBoundingClientRect(); ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(ndc,cam); }
function furnOf(o){ while(o&&!(o.userData&&o.userData.furn)) o=o.parent; return o?o.userData.furn:null; }
function tapRoom(){ const gl=Object.keys(tanks).filter(k=>k!=='_tier').map(k=>tanks[k].glass), h=ray.intersectObjects(gl,false)[0], hm=ray.intersectObjects(mountG.children,true)[0];
  // 家具：取最靠近鏡頭、看得見的那個物體；它屬於某件家具才算點到
  const near=ray.intersectObjects(scene.children,true).find(x=>!x.object.isSprite&&x.object.visible&&!(x.object.material&&x.object.material.visible===false)), fu=near&&furnOf(near.object);
  if(fu&&(!h||near.distance<h.distance)&&(!hm||near.distance<hm.distance)){ ui.card.classList.add('hidden'); tapFurn(fu); return; }
  if(hm&&(!h||hm.distance<h.distance)){ let o=hm.object; while(o&&!o.userData.rec) o=o.parent; if(o){ c.showFish(o.userData.rec,ui.card); return; } }
  ui.card.classList.add('hidden'); if(h){ enterView(h.object.userData.tank); return; }
  const hf=ray.intersectObjects(fpParts,true)[0]; if(hf){ pickFish(); return; }
  const hs=ray.intersectObjects(shopParts,false)[0]; if(hs&&c.openShop) c.openShop(); }
function tapView(){ const tk=tanks[viewTank]; if(!tk) return; const h=ray.intersectObjects(tk.fish.map(f=>f.o),true)[0];
  if(!h){ ui.card.classList.add('hidden'); return; } let o=h.object; while(o&&!o.userData.rec) o=o.parent; if(o) c.showFish(o.userData.rec,ui.card); }
function enterView(w){ mode='view'; document.body.classList.add('tankview'); viewTank=w; pan=panT=0; ui.view.classList.remove('hidden'); ui.btns.classList.add('hidden'); ui.hint.textContent='點一條魚看牠的資料・左右拖曳移動'; }
function exitView(){ mode='room'; document.body.classList.remove('tankview'); ui.view.classList.add('hidden'); ui.card.classList.add('hidden'); ui.btns.classList.remove('hidden'); ui.hint.textContent=HINT; }
document.getElementById('bViewBack').addEventListener('click',()=>{ if(mode==='dive') exitDive(); exitView(); });
// 潛入缸內：鏡頭進到水裡，像人在缸中，可以四處轉頭近看魚；水裡有藍綠色的霧
const diveB=document.getElementById('bDive'), fogDive=new T.FogExp2(0x15565c,.42);
function enterDive(){ if(mode!=='view') return; mode='dive'; document.body.classList.add('tankdive'); dYaw=dYawT=0; dPitch=dPitchT=0; scene.fog=fogDive; diveB.textContent='↑ 浮出水面'; ui.hint.textContent='搖桿在缸裡游動・拖曳轉頭・點魚看資料'; }
const DV={on:false,p:new T.Vector3()};
function exitDive(){ if(mode!=='dive') return; DV.on=false; document.body.classList.remove('tankdive'); mode='view'; scene.fog=null; diveB.textContent='🤿 潛入缸內'; ui.hint.textContent='點一條魚看牠的資料・左右拖曳移動'; }
diveB.addEventListener('click',()=>{ if(mode==='dive') exitDive(); else enterDive(); });
el.addEventListener('pointerdown',e=>{ if(!on) return; down={x:e.clientX,y:e.clientY,t:performance.now()}; drag={x:e.clientX,y:e.clientY,yaw:yawT,pitch:pitchT,pan:panT,dy:dYawT,dp:dPitchT}; });
el.addEventListener('pointermove',e=>{ if(!on||!drag||mode==='act') return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(mode==='dive'){ dYawT=drag.dy-dx*.005; dPitchT=Math.max(-.8,Math.min(.8,drag.dp-dy*.004)); return; }   // 缸裡可以 360 度轉頭
  if(mode==='view'){ const w=tanks[viewTank]?tanks[viewTank].spec.w:1; panT=Math.max(-w*.35,Math.min(w*.35,drag.pan-dx*.003)); return; }
  yawT=drag.yaw-dx*.006; pitchT=Math.max(-.7,Math.min(.6,drag.pitch-dy*.005)); });
window.addEventListener('pointerup',e=>{ if(on&&down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<10&&performance.now()-down.t<450){ hit(e); if(mode==='room') tapRoom(); else if(mode!=='act') tapView(); } drag=null; down=null; });   // 移動很少、時間很短才算點擊
/* ===== 家具使用的動作演出：鏡頭走到家具前（坐下時視線變低），家具本身也會動，做完再回到原位 ===== */
let ACT=null;
const actFade=document.createElement('div'); actFade.style.cssText='position:fixed;inset:0;z-index:21;background:#000;opacity:0;pointer-events:none;display:flex;align-items:center;justify-content:center;color:#cfd8ff;font-size:28px;letter-spacing:.3em;transition:none';
document.body.appendChild(actFade);
const notePg=document.createElement('div'); notePg.className='hidden';
notePg.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:23;width:min(340px,86vw);padding:26px 22px 18px;border-radius:6px;background:linear-gradient(180deg,#efe2c2,#dcc79c);color:#3a2812;font-family:serif;box-shadow:0 12px 40px rgba(0,0,0,.6);line-height:1.9;font-size:17px';
document.body.appendChild(notePg);
notePg.addEventListener('click',()=>{ notePg.classList.add('hidden'); if(ACT) ACT.wait=false; });
const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
// 飄起來的小圖示：拿到魚餌、採到香草時，從家具上方飄起淡出
const pops=[];
function popIcons(list,x,y,z){ list.forEach((em,i)=>{ const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d'); g.font='96px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(em,64,70);
  const tx=new T.CanvasTexture(cv); const sp=new T.Sprite(new T.SpriteMaterial({map:tx,transparent:true,depthTest:false,depthWrite:false})); sp.scale.set(.2,.2,1); sp.renderOrder=21;
  sp.position.set(x+(i-(list.length-1)/2)*.2,y,z); scene.add(sp); pops.push({sp,t:-i*.18,y}); }); }
function updPops(dt){ for(let i=pops.length-1;i>=0;i--){ const q=pops[i]; q.t+=dt; const k=Math.max(0,q.t)/1.8; q.sp.visible=q.t>=0; q.sp.position.y=q.y+k*.55; q.sp.material.opacity=k<.7?1:Math.max(0,1-(k-.7)/.3);
  if(k>=1){ scene.remove(q.sp); q.sp.material.map.dispose(); pops.splice(i,1); } } }
const objOf=m=>{ const it=FITEMS.find(x=>x.m===m); return it&&it.obj; };
// 演出：pos 鏡頭位置、look 看向哪裡、hold 停留秒數、mid 停下來時套用效果、anim 每格的家具動作、fade 是否睡著變暗
function playAct(o){ closeFurn(); mode='act'; document.body.classList.add('acting'); ui.btns.classList.add('hidden'); ui.card.classList.add('hidden'); ui.hint.textContent=o.txt||'';
  const pT=new T.Vector3(...o.pos); lookM.lookAt(pT,tv.set(...o.look),cam.up);
  ACT=Object.assign({t:0,ph:'go',p0:cam.position.clone(),q0:cam.quaternion.clone(),pT,qT:new T.Quaternion().setFromRotationMatrix(lookM),go:.9,back:.8,fired:false,wait:false},o); }
function endAct(){ if(ACT&&ACT.end) ACT.end(); ACT=null; mode='room'; document.body.classList.remove('acting'); actFade.style.opacity=0; actFade.textContent=''; ui.btns.classList.remove('hidden'); ui.hint.textContent=HINT; updFurnTags(); }
function updAct(dt){ updPops(dt); if(!ACT) return; const A=ACT; A.t+=dt;
  if(A.ph==='go'){ const k=ease(A.t/A.go); cam.position.lerpVectors(A.p0,A.pT,k); cam.quaternion.copy(A.q0).slerp(A.qT,k); if(A.t>=A.go){ A.ph='hold'; A.t=0; } return; }
  if(A.ph==='hold'){ if(!A.fired&&A.t>=(A.midAt||0)){ A.fired=true; try{ A.mid&&A.mid(); }catch(e){ console.warn('act mid',e); } }
    cam.position.copy(A.pT); cam.quaternion.copy(A.qT); if(A.anim) A.anim(A.t,dt);
    if(A.t>=A.hold&&!A.wait){ A.ph='back'; A.t=0; A.p0=cam.position.clone(); A.q0=cam.quaternion.clone(); } return; }
  if(A.ph==='back'){ const k=ease(A.t/A.back); if(A.anim) A.anim(A.hold+A.t,dt,true); cam.position.lerpVectors(A.p0,pRoom,k); cam.quaternion.copy(A.q0).slerp(qRoom,k); if(A.t>=A.back) endAct(); } }
// 每件家具的演出
function actFor(id){ if(ACT) return; const H=c.home(), lv=H.furnLv(id), toastR=r=>{ if(r&&r.msg) c.toast&&c.toast(r.msg,r.kind||'good',r.kind?1800:3400); };
  if(id==='sofa'){ playAct({pos:[LV.x-.78,1.0,LV.z+.05],look:[0,1.3,ROOM.zb+.4],hold:3.4,txt:'窩在沙發上，看魚游來游去……',mid:()=>toastR(H.furnUse('sofa')),
    anim:(t)=>{ cam.position.y=1.0+Math.sin(t*1.6)*.006; }}); return; }
  if(id==='rock'){ const ch=objOf('Rockingchair_01'), ry=ch?ch.rotation.y:0; if(ch) ch.rotation.order='YXZ';
    let res=null; playAct({pos:[1.72,1.06,-.15],look:[ROOM.x-.3,.55,FP.z],hold:5.2,txt:'搖著搖著，眼皮越來越重……',midAt:2.4,mid:()=>{ res=H.furnUse('rock',ACT.opt); syncTime(); actFade.textContent='💤'; },opt:ACT_OPT,
      anim:(t,dt,back)=>{ const a=back?.12*Math.max(0,1-(t-5.2)/.8):.12; const sw=Math.sin(t*2.1)*a; if(ch){ ch.rotation.x=sw; ch.rotation.y=ry; } if(!back){ cam.position.y=1.06+sw*.25; cam.rotateX(sw*.35); }
        const f=t<1?0:t<2.3?(t-1)/1.3:t<3.6?1:t<4.8?1-(t-3.6)/1.2:0; actFade.style.opacity=back?0:f; if(t>=3.6&&actFade.textContent) actFade.textContent=''; },
      end:()=>{ if(ch) ch.rotation.x=0; toastR(res); }}); return; }
  if(id==='shelf'){ playAct({pos:[-1.72,1.56,-2.2],look:[-ROOM.x+.3,1.3,-2.2],hold:.6,txt:'從書架抽出一本手記……',wait:true,mid:()=>{ const r=H.furnUse('shelf'); const m=(r.msg||'').replace(/^📚 /,'').split('　');
      notePg.innerHTML=`<div style="font-size:13px;letter-spacing:.2em;opacity:.7;margin-bottom:8px">— 老漁人的手記 —</div><div>${m[0]||''}</div><div style="margin-top:14px;font-size:14px;color:#7a4a10;font-family:sans-serif">✨ ${m[1]||''}</div><div style="margin-top:12px;font-size:12px;opacity:.6;font-family:sans-serif;text-align:right">點一下闔上手記</div>`;
      notePg.classList.remove('hidden'); }}); return; }
  if(id==='chest'){ const ch=objOf('treasure_chest'), lid=ch&&ch.getObjectByName('treasure_chest_lid'), cur=H.furnInfo('chest').cur, IC={shrimp:'🦐',live:'🐟',moon:'🌙'};
    playAct({pos:[ROOM.x-1.75,1.38,-2.35],look:[ROOM.x-.5,.42,-2.55],hold:2.8,txt:'打開老漁人的漁具箱……',midAt:.7,mid:()=>{ toastR(H.furnUse('chest')); popIcons(Object.keys(cur.g).map(k=>IC[k]||'🎣'),ROOM.x-.5,.85,-2.55); },
      anim:(t,dt,back)=>{ if(lid) lid.rotation.x=back?-1.15*(1-ease((t-2.8)/.6)):-1.15*ease(t/.6); }, end:()=>{ if(lid) lid.rotation.x=0; }}); return; }
  if(id==='herb'){ const sp=lv>0, pl=FITEMS.filter(it=>it.f==='herb'&&it.obj).map(it=>it.obj), F=H.furnInfo('herb').st;
    const pos=sp?[-1.85,1.32,.4]:[-1.7,1.35,-2.75], look=sp?[-ROOM.x+.25,.38,.4]:[-2.5,.7,ROOM.zb+.5];
    playAct({pos,look,hold:2.4,txt:'彎下腰採收……',midAt:.6,mid:()=>{ toastR(H.furnUse('herb')); popIcons([...Array(Math.min(3,F.h||0)).fill('🌿'),...Array(Math.min(2,F.l||0)).fill('🍋')],look[0]+.15,look[1]+.45,look[2]); },
      anim:(t)=>{ pl.forEach((o,i)=>o.children.forEach((k,j)=>{ if(k.isGroup&&k.children.length===1) k.rotation.z=Math.sin(t*9+j+i)*.12*Math.max(0,1-t/2); })); }}); return; }
  if(id==='clock'){ playAct({pos:[ROOM.x-1.45,1.55,FP.z+.45],look:[ROOM.x-.36,1.46,FP.z+.45],hold:2.6,txt:'',midAt:.2,mid:()=>clockToast()}); return; } }
let ACT_OPT=null;
function clockToast(){ const h=((c.hour()%24)+24)%24, hh=Math.floor(h), mm=Math.floor((h-hh)*60), per=h>=4.8&&h<8.5?'清晨':h>=8.5&&h<16.5?'白天':h>=16.5&&h<19.8?'黃昏':'夜晚';
  const mi=window.__MOONPH&&window.__MOONPH.illum?Math.round(window.__MOONPH.illum()*100):null;
  c.toast&&c.toast(`🕰 ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}・${per}${mi!=null?'・今晚月亮 '+mi+'% 圓'+(mi>=85?'（滿月前後，月光灣的潮最旺）':''):''}`,'',3200); }
// 吊燈：開關燈時整盞燈輕輕晃幾下
let swingT=0; function swingLamp(dt){ const o=lampObj; if(!o||swingT<=0) return; swingT-=dt; o.rotation.z=Math.sin((2.5-swingT)*5)*.08*Math.max(0,swingT/2.5); if(swingT<=0) o.rotation.z=0; }
let lampObj=null;
/* ===== 家具面板：點家具跳出來，可以使用、看效果、升級 ===== */
const furnUI=document.createElement('div'); furnUI.id='furnPick'; furnUI.className='hidden'; document.body.appendChild(furnUI);
let furnId=null;
function closeFurn(){ furnUI.classList.add('hidden'); document.body.classList.remove('furnOn'); furnId=null; }
function tapFurn(id){ const H=c.home&&c.home(); if(!H||ACT) return;
  if(id==='light'){ const d=H.data(); d.lightOff=!d.lightOff; c.persist&&c.persist(); syncTime(); swingT=2.5; c.click&&c.click(); updFurnTags(); c.toast&&c.toast(d.lightOff?'💡 關燈了，只剩爐火和窗外的光':'💡 開燈','',1400); return; }
  if(id==='clock'){ actFor('clock'); return; }
  if(id==='mount') return;
  furnId=id; renderFurn(); furnUI.classList.remove('hidden'); document.body.classList.add('furnOn'); }
function renderFurn(){ const H=c.home(), F=H.furnInfo(furnId), d=F.def, nx=F.next, lvS=c.save.lv||1, coins=c.save.coins||0;
  const stars='★'.repeat(F.lv+1)+'☆'.repeat(d.lv.length-1-F.lv);
  let h=`<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:800;font-size:16px">${d.i} ${d.n} <span style="color:#e8b84a">${stars}</span></div><button class="sbtn" data-f="x">關閉</button></div>
    <div style="font-size:13px;opacity:.8;margin:4px 0 8px">${d.use}${F.cur.n?'・目前：'+F.cur.n:''}</div>
    <div class="it"><span>${F.cur.d}<br><small style="opacity:.75">${F.st.txt}</small></span></div>`;
  if(furnId==='fire') h+=`<div class="it"><span>點壁爐就能烤魚</span><button class="sbtn pri" data-f="grill">🔥 烤魚</button></div>`;
  else if(furnId==='rock'&&F.cur.pick) h+=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">`+['清晨','正午','黃昏','夜晚'].map((n,i)=>`<button class="sbtn pri" data-f="use" data-o="${i}" style="flex:1">睡到${n}</button>`).join('')+`</div>`;
  else h+=`<div style="margin:8px 0"><button class="btn pri" data-f="use" style="width:100%;padding:10px${F.st.ok?'':';opacity:.45'}">${d.act}</button></div>`;
  if(furnId==='shelf'&&window.__STORY&&window.__STORY.done&&window.__STORY.done('c7')) h+=`<div style="margin:8px 0"><button class="btn" data-f="book" style="width:100%;padding:10px;background:#f3e2bf;color:#3a2610">📖 月潮・完整的故事</button></div>`;
  if(nx){ const can=lvS>=nx.need&&coins>=nx.p;
    h+=`<div style="font-weight:700;margin-top:6px">升級：${nx.n}</div><div class="it"><span>${nx.d}<br><small style="opacity:.75">需要 Lv ${nx.need}${lvS<nx.need?'（目前 Lv '+lvS+'）':''}</small></span><button class="sbtn${can?' pri':''}" data-f="up">🪙 ${nx.p.toLocaleString()}</button></div>`; }
  else h+=`<div style="font-size:12px;opacity:.7;margin-top:6px">已經升到最高級</div>`;
  furnUI.innerHTML=h; }
furnUI.addEventListener('click',e=>{ const b=e.target.closest('[data-f]'); if(!b||!furnId) return; const H=c.home(), a=b.dataset.f;
  if(a==='x'){ closeFurn(); return; }
  if(a==='grill'){ closeFurn(); pickFish(); return; }
  if(a==='book'){ closeFurn(); if(typeof showStoryBook==='function') showStoryBook(); return; }
  if(a==='up'){ const m=H.furnUp(furnId); if(m){ c.toast&&c.toast(m,'warn',1600); return; } syncFurn(); c.toast&&c.toast('升級好了：'+H.furnInfo(furnId).cur.n,'good',1800); c.coin&&c.coin(); renderFurn(); return; }
  if(a==='use'){ const id=furnId, st=H.furnInfo(id).st; if(!st.ok&&id!=='rock'){ c.toast&&c.toast(st.txt,'warn',1800); return; }
    ACT_OPT=b.dataset.o!=null?+b.dataset.o:null; actFor(id); } });
// 每件能點的家具上方都有提示標籤；有東西可以領、可以採、可以用時變成金色
const FTAG=[['sofa',[LV.x-1.0,1.3,LV.z]],['rock',[1.7,1.48,-.2]],['shelf',[-ROOM.x+.35,2.45,-2.2]],['chest',[ROOM.x-.5,1.32,-2.55]],['herb',[-2.75,1.05,.35]],['light',[0,2.52,-1.15]],['clock',[ROOM.x-.4,2.0,FP.z+.6]],['mount',[ROOM.x-.12,2.62,-2.45]]];
const furnTags=FTAG.map(([f,pos])=>{ const tg=makeTag(''); tg.position.set(...pos); scene.add(tg); const r={s:tg,y:pos[1],k:'f_'+f,f,ready:false}; tags.push(r); return r; });
function tagTxt(f,H){ if(f==='light') return [lightsOff()?'💡 點吊燈開燈':'💡 點吊燈關燈',false];
  if(f==='clock') return ['🕰 點時鐘看時間',false];
  if(f==='mount') return ['🖼 點標本看資料',false];
  const F=H.furnInfo(f), ok=F.st.ok;
  if(f==='sofa') return ok?['🛋️ 坐下休息',true]:['🛋️ 沙發・'+F.st.wait+' 分後',false];
  if(f==='rock') return ['🪑 搖椅打個盹',false];
  if(f==='shelf') return ok?['📚 讀手記',true]:['📚 書架・'+F.st.wait+' 分後',false];
  if(f==='chest') return ok?['🧰 補給可以領！',true]:['🧰 漁具箱',false];
  if(f==='herb') return ok?['🌿 可以採收！',true]:['🌿 香草生長中',false];
  return ['',false]; }
function updFurnTags(){ const H=c.home&&c.home(); if(!H) return; const mounts=(c.data().mounts||[]).length;
  furnTags.forEach(t=>{ const [txt,hot]=tagTxt(t.f,H); setTag(t.s,txt,hot); t.ready=t.f==='mount'?mounts>0:true;
    if(t.f==='herb'){ if(H.furnLv('herb')===0){ t.s.position.set(-(ROOM.x-.7),1.6,ROOM.zb+.5); t.y=1.6; } else { t.s.position.set(-(ROOM.x-.45),1.05,.35); t.y=1.05; } } }); }
let furnTick=0;
// 開遊戲時就把目前等級的家具載好；其他等級的模型等一下在背景預先載入，升級時立刻換好，不用等
setTimeout(()=>{ try{ syncFurn(); }catch(e){ console.warn('furn init',e); } },1500);
setTimeout(()=>{ const names=[...new Set(FITEMS.map(it=>it.m).concat(['nettle_plant']))].filter(n=>!mcache[n]);
  const next=()=>{ const n=names.shift(); if(!n) return; if(mcache[n]){ next(); return; } GL.load('models/home/'+n+'.glb',g=>{ mcache[n]=g; setTimeout(next,400); },undefined,()=>setTimeout(next,400)); };
  next(); },25000);
window.__HOMEFURN=()=>{ syncFurn(); syncTime(); updFurnTags(); };
window.__HOMETAP=id=>{ if(on) tapFurn(id); };
/* ===== 壁爐烤魚：魚串在鐵叉上，靠火的那面會熟；魚皮依熟度從生色→金黃→焦黑，出現烤痕；冒煙、油滴竄火、滋滋聲 ===== */
const GR={on:false, drops:[]};
{ const dt_=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=16; const g=cv.getContext('2d'), rg=g.createRadialGradient(8,8,0,8,8,8); rg.addColorStop(0,'rgba(255,236,170,1)'); rg.addColorStop(.6,'rgba(230,170,60,.8)'); rg.addColorStop(1,'rgba(200,120,20,0)'); g.fillStyle=rg; g.fillRect(0,0,16,16); return new T.CanvasTexture(cv); })();
  for(let i=0;i<12;i++){ const s=new T.Sprite(new T.SpriteMaterial({map:dt_,transparent:true,depthWrite:false})); s.visible=false; scene.add(s); GR.drops.push({s,vy:0}); } }
const grillUI=document.getElementById('grillUI'), pickUI=document.getElementById('grillPick');
const smokeTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=64; const g=cv.getContext('2d'), rg=g.createRadialGradient(32,32,2,32,32,30); rg.addColorStop(0,'rgba(255,255,255,.55)'); rg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=rg; g.fillRect(0,0,64,64); return new T.CanvasTexture(cv); })();
const smokes=[]; for(let i=0;i<26;i++){ const m=new T.Sprite(new T.SpriteMaterial({map:smokeTex,transparent:true,depthWrite:false,opacity:0})); m.visible=false; scene.add(m); smokes.push({m,t:0,life:0}); }
const sparkM=new T.SpriteMaterial({map:smokeTex,color:0xffb050,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}); const flare=new T.Sprite(sparkM); flare.scale.set(.5,.5,1); flare.visible=false; scene.add(flare);
const GP=new T.Vector3(ROOM.x-.62,.66,FP.z);
const rig=new T.Group(); rig.position.copy(GP); rig.visible=false; scene.add(rig);
{ const iron=new T.MeshStandardMaterial({color:0x2a2622,metalness:.8,roughness:.45});
  const sk=new T.Mesh(new T.CylinderGeometry(.006,.006,.95,8),iron); sk.rotation.x=Math.PI/2; rig.add(sk);
  for(const z of [-.42,.42]){ const st=new T.Mesh(new T.CylinderGeometry(.01,.012,.66,8),iron); st.position.set(0,-.33,z); rig.add(st); const y1=new T.Mesh(new T.CylinderGeometry(.007,.007,.07,6),iron); y1.position.set(.025,.02,z); y1.rotation.z=.6; rig.add(y1); const y2=y1.clone(); y2.position.x=-.025; y2.rotation.z=-.6; rig.add(y2); } }
const spin=new T.Group(); rig.add(spin);
function cookMat(m,bb){ const k=m.clone(); const ax=(bb.max.x-bb.min.x)>=(bb.max.z-bb.min.z)?0:2, lo=ax?bb.min.z:bb.min.x, hi=ax?bb.max.z:bb.max.x, yl=bb.min.y, yh=bb.max.y;
  k.onBeforeCompile=sh=>{ sh.uniforms.uCA=GR.uA; sh.uniforms.uCB=GR.uB; sh.uniforms.uCurl=GR.uCurl;
    sh.vertexShader='uniform float uCurl;\nvarying float vSZ;\nvarying float vL;\nvarying float vH;\nvarying vec3 vOP;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vSZ=normal.${ax?'x':'z'}; float L_=(${ax?'position.z':'position.x'}-(${lo.toFixed(4)}))/(${(hi-lo).toFixed(4)}); vL=L_; vH=(position.y-(${yl.toFixed(4)}))/(${(yh-yl).toFixed(4)}); vOP=position;
      float e_=(L_-0.5)*2.0; transformed.y+=uCurl*e_*e_*${((hi-lo)*.05).toFixed(4)};`);
    sh.fragmentShader='uniform float uCA;\nuniform float uCB;\nvarying float vSZ;\nvarying float vL;\nvarying float vH;\nvarying vec3 vOP;\n'+
      'float hh_(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }\nfloat nn_(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(hh_(i),hh_(i+vec3(1,0,0)),f.x),mix(hh_(i+vec3(0,1,0)),hh_(i+vec3(1,1,0)),f.x),f.y),mix(mix(hh_(i+vec3(0,0,1)),hh_(i+vec3(1,0,1)),f.x),mix(hh_(i+vec3(0,1,1)),hh_(i+vec3(1,1,1)),f.x),f.y),f.z); }\n'+
      sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec3 P_=vOP*${(14/Math.max(1e-4,hi-lo)).toFixed(3)};
      float ck=mix(uCB,uCA,smoothstep(-0.35,0.35,vSZ));
      float edge=max(smoothstep(0.78,0.98,abs(vL-0.5)*2.0),smoothstep(0.82,0.98,vH)*0.8);
      float patchy=nn_(P_*0.9)*0.5+nn_(P_*2.3)*0.3+nn_(P_*5.1)*0.2;
      float k_=ck*(0.78+0.45*patchy)+edge*ck*0.55;
      vec3 skin=diffuseColor.rgb;
      vec3 c=skin*mix(vec3(1.0),vec3(1.06,0.95,0.80),smoothstep(0.1,0.4,k_));
      c=c*mix(vec3(1.0),vec3(0.80,0.56,0.30),smoothstep(0.35,0.85,k_));
      c=mix(c,c*vec3(0.62,0.38,0.18)+vec3(0.06,0.03,0.0),smoothstep(0.7,1.0,k_)*0.8);
      float crk=smoothstep(0.93,0.99,1.0-abs(nn_(P_*vec3(2.2,7.0,2.2))*2.0-1.0))*smoothstep(0.6,0.9,ck)*smoothstep(0.5,0.8,nn_(P_*0.7));
      c=mix(c,vec3(0.90,0.80,0.62),crk*0.55);
      float bl=smoothstep(0.78,0.95,nn_(P_*6.0))*smoothstep(0.6,0.95,k_);
      c=mix(c,c*0.45,bl*0.7);
      c=mix(c,vec3(0.05,0.035,0.03),smoothstep(0.95,1.3,k_));
      diffuseColor.rgb=c;`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=mix(roughnessFactor,0.28,smoothstep(0.3,0.75,ck))*mix(1.0,2.6,smoothstep(1.0,1.3,ck));
      roughnessFactor=clamp(roughnessFactor,0.15,1.0);`); };
  k.customProgramCacheKey=()=>'grillfish2'; k.needsUpdate=true; return k; }
GR.uA={value:0}; GR.uB={value:0}; GR.uCurl={value:0};
function pickFish(){ const list=(c.save.cooler||[]);
  const inv=c.save.inv=c.save.inv||{}, sea=GR.season||'salt';
  const SZ=[['salt','🧂 鹽','免費・效果時間 +20%',null],['lemon','🍋 檸檬','完美的範圍變寬・效果時間 +30%',150],['herb','🌿 香草','完美時再多一個效果（咬餌更快）',300]];
  const sz=SZ.map(([id,n,d,p])=>{ const have=p===null?'∞':(inv[id]||0), on=sea===id;
    return `<div class="it"><span>${n} <small>${d}</small><br><small style="opacity:.7">持有 ${have}</small></span><span>${p!==null?`<button class="sbtn" data-buy="${id}" data-p="${p}">買 🪙${p}</button> `:''}<button class="sbtn${on?' pri':''}" data-sz="${id}">${on?'使用中':'使用'}</button></span></div>`; }).join('');
  const ck=c.save.cook||{}, perf=Object.keys(ck).filter(k=>ck[k].best>=3);
  const dex=`<div style="margin-top:10px;font-weight:700">📖 料理圖鑑：完美 ${perf.length} 種</div><div style="font-size:12px;opacity:.85;line-height:1.8">${Object.keys(ck).map(k=>{ const sp=c.species(k); return (sp?sp.name:k)+(ck[k].best>=3?'⭐':ck[k].best>=1?'🟡':'⚫'); }).join('　')||'還沒烤過魚'}</div>`;
  const empty=list.length?'':'<div style="font-size:13px;line-height:1.7;opacity:.9;padding:6px 2px 10px">保冷箱是空的。<br>出門釣魚，釣到魚時在漁獲卡按「<b>🔥 放進保冷箱，帶回去烤</b>」，回來就能在這裡烤（最多 5 條）。</div>';
  pickUI.innerHTML='<div style="font-weight:700;margin-bottom:6px">🔥 壁爐烤魚・保冷箱（'+list.length+'/5）</div>'+empty+list.map((r,i)=>{ const sp=c.species(r.id); return `<div class="it"><span>${sp?sp.name:r.id}　<small>${Math.round(r.L*100)} 公分</small></span><button class="sbtn pri" data-g="${i}">烤這條</button></div>`; }).join('')
    +'<div style="margin-top:10px;font-weight:700">調味</div>'+sz+dex+'<div style="text-align:right;margin-top:8px"><button class="sbtn" data-g="x">關閉</button></div>';
  pickUI.classList.remove('hidden'); document.body.classList.add('grilling'); }
pickUI.addEventListener('click',e=>{ const bz=e.target.closest('[data-sz],[data-buy]');
  if(bz){ if(bz.dataset.buy){ if(c.buy&&c.buy(bz.dataset.buy,+bz.dataset.p)){ c.save.inv[bz.dataset.buy]=(c.save.inv[bz.dataset.buy]||0)+1; c.persist&&c.persist(); } }
    else { const id=bz.dataset.sz; if(id!=='salt'&&!(c.save.inv[id]>0)){ c.toast&&c.toast('先買一份','warn',1400); return; } GR.season=id; }
    document.body.classList.remove('grilling'); pickFish(); return; }
  if(e.target.closest('[data-eat]')) return; const b=e.target.closest('[data-g]'); if(!b) return; pickUI.classList.add('hidden'); if(b.dataset.g==='x'){ document.body.classList.remove('grilling'); return; } startGrill(+b.dataset.g); });
function startGrill(i){ const rec=(c.save.cooler||[])[i]; if(!rec) return; const sp=c.species(rec.id); if(!sp){ document.body.classList.remove('grilling'); return; }
  const src=c.getFish(sp).group.clone(true); src.position.set(0,0,0); src.rotation.set(0,0,0); src.scale.setScalar(1); src.visible=true;
  src.traverse(o=>{ o.visible=true; o.frustumCulled=false; if(o.isMesh&&o.material){ const ms=Array.isArray(o.material)?o.material:[o.material]; o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox; const nm=ms.map(mm=>cookMat(mm,bb)); o.material=Array.isArray(o.material)?nm:nm[0]; } });
  const L=Math.min(.55,Math.max(.18,rec.L)); const w=new T.Group(); w.add(src); w.scale.setScalar(L); w.rotation.y=Math.PI/2;
  spin.clear(); spin.add(w); spin.rotation.set(0,0,0); rig.visible=true;
  const need=7+Math.min(14,Math.sqrt(rec.w||.5)*6);
  let season=GR.season||'salt'; if(season!=='salt'){ const inv=c.save.inv||{}; if((inv[season]||0)>0) inv[season]--; else season='salt'; }
  Object.assign(GR,{on:true,i,rec,sp,a:0,b:0,face:0,flipT:0,need,t:0,dripT:1,smT:0,useSeason:season}); GR.uA.value=0; GR.uB.value=0;
  document.getElementById('gTitle').textContent='烤 '+sp.name+'（約 '+Math.round(need)+' 秒一面）';
  grillUI.classList.remove('hidden'); pickUI.classList.add('hidden'); document.body.classList.add('grilling'); mode='grill'; }
function endGrill(){ GR.drops.forEach(D=>D.s.visible=false); GR.on=false; rig.visible=false; spin.clear(); grillUI.classList.add('hidden'); document.body.classList.remove('grilling'); mode='room'; smokes.forEach(s=>{ s.m.visible=false; }); flare.visible=false; }
document.getElementById('gFlip').addEventListener('click',()=>{ if(!GR.on||GR.flipT>0) return; GR.flipT=.6; c.sizzle&&c.sizzle(.6); });
document.getElementById('gQuit').addEventListener('click',()=>{ if(!GR.on) return; endGrill(); });
document.getElementById('gDone').addEventListener('click',()=>{ if(!GR.on) return; const r=GR.rec, a=GR.a, b=GR.b, sz=GR.useSeason; c.save.cooler.splice(GR.i,1); c.persist&&c.persist(); endGrill();
  const sp=c.species(r.id); pickUI.innerHTML=`<div style="font-weight:700;margin-bottom:8px">🍽 ${sp?sp.name:''}起鍋了</div><div style="font-size:13px;opacity:.85;margin-bottom:10px">要自己吃，還是招待來訪的釣友？</div>
    <div class="gbtns" style="display:flex;gap:8px"><button class="btn pri" data-eat="me" style="flex:1;padding:10px">自己吃（得到效果）</button><button class="btn" data-eat="friend" style="flex:1;padding:10px">招待釣友（金幣＋魚餌）</button></div>`;
  pickUI.classList.remove('hidden'); document.body.classList.add('grilling');
  pickUI.onclick=e=>{ const bt=e.target.closest('[data-eat]'); if(!bt) return; pickUI.onclick=null; pickUI.classList.add('hidden'); document.body.classList.remove('grilling'); if(c.onGrilled) c.onGrilled(r,a,b,sz,bt.dataset.eat); }; });
const grade=x=>x<.55?'生':x<.78?'半熟':x<.92?'完美':'焦';
function updGrill(dt){ if(!GR.on) return; GR.t+=dt;
  // 翻面：整支鐵叉轉 180 度
  if(GR.flipT>0){ GR.flipT-=dt; const p=1-Math.max(0,GR.flipT)/.6; spin.rotation.z=(GR.face+p)*Math.PI; if(GR.flipT<=0){ GR.face=(GR.face+1)%2; spin.rotation.z=GR.face*Math.PI; } }
  const heat=(1/GR.need)*(fireM.opacity+.3)/1.15*(c.grillHeat?c.grillHeat():1);
  GR.uCurl.value=Math.min(1,(GR.a+GR.b)*.5);
  if(GR.flipT<=0){ if(GR.face===0) GR.a+=heat*dt; else GR.b+=heat*dt; }
  GR.uA.value=GR.a; GR.uB.value=GR.b;
  const top=GR.face===0?GR.a:GR.b, oth=GR.face===0?GR.b:GR.a;
  document.getElementById('gA').style.left=Math.min(100,top*82)+'%'; document.getElementById('gB').style.left=Math.min(100,oth*82)+'%';
  document.getElementById('gHint').textContent=top>1.05?'冒黑煙了！快翻面！':top>.78?'這面完美了，可以翻面':top>.55?'魚皮開始金黃…':top>.25?'滋滋作響，魚肉漸漸變白':'等魚皮慢慢變色…';
  // 煙：熟度越高越多，焦了變黑煙
  GR.smT-=dt; if(GR.smT<=0&&top>.15){ GR.smT=top>1?.06:.18; const s=smokes.find(x=>!x.m.visible); if(s){ s.m.visible=true; s.t=0; s.life=1.6+Math.random()*1.2; s.m.position.copy(GP).add(tv.set((Math.random()-.5)*.1,.03,(Math.random()-.5)*.35)); s.dark=top>1; s.m.material.color.set(top>1?0x2a2420:0xd8d4cc); } }
  smokes.forEach(s=>{ if(!s.m.visible) return; s.t+=dt; const k=s.t/s.life; if(k>=1){ s.m.visible=false; return; } s.m.position.y+=dt*.35; s.m.position.x-=dt*.05; const sc=.12+k*.45; s.m.scale.set(sc,sc,1); s.m.material.opacity=(s.dark?.55:.32)*Math.sin(k*Math.PI); });
  // 油滴進火：火光竄起、滋滋聲
  // 油滴：熟到一定程度，金黃的油從魚身滴下，落進火裡才竄起火光、滋一聲
  GR.dripT-=dt; if(GR.dripT<=0&&top>.3){ GR.dripT=(top>.7?.25:.6)+Math.random()*.9; const D=GR.drops.find(q=>!q.s.visible); if(D){ D.s.position.copy(GP).add(tv.set(.03,-.05,(Math.random()-.5)*Math.min(.45,GR.rec.L*.8))); D.vy=0; D.s.visible=true; } }
  GR.drops.forEach(D=>{ if(!D.s.visible) return; D.vy-=9.8*dt; D.s.position.y+=D.vy*dt; D.s.scale.set(.012,.02+Math.min(.03,-D.vy*.01),1);
    if(D.s.position.y<.3){ D.s.visible=false; flare.visible=true; flare.position.set(D.s.position.x+.05,.36,D.s.position.z); sparkM.opacity=.95; fireL.intensity*=1.5; c.sizzle&&c.sizzle(.3+Math.random()*.35); } });
  if(flare.visible){ sparkM.opacity-=dt*2.2; flare.scale.setScalar(.35+(.9-sparkM.opacity)*.3); if(sparkM.opacity<=0) flare.visible=false; }
  spin.position.y=Math.sin(GR.t*1.3)*.003; }
let prSaved=0; function enter(){ on=true; merArtSync(); if(W.getPR&&W.setPR&&W.getPR()>1.6){ prSaved=W.getPR(); W.setPR(1.6); }   /* 小屋裡燈多、魚多：解析度上限 1.6 倍（肉眼幾乎看不出差別，效能差很多） */ yaw=yawT=0; pitch=pitchT=-.08; vb=0; pRoom.set(0,EYE,.9); resize(); for(const f of [syncTime,syncFish,syncMounts,exitView,syncFurn,updFurnTags,closeFurn]){ try{ f(); }catch(err){ console.error('home enter',err); } } try{ if(c.onEnter) c.onEnter(); }catch(err){ console.error(err); } }
function exit(){ on=false; if(prSaved&&W.setPR){ W.setPR(prSaved); prSaved=0; } drag=null; if(GR.on) endGrill(); pickUI.classList.add('hidden'); closeFurn(); if(ACT) endAct(); notePg.classList.add('hidden'); document.body.classList.remove('grilling'); exitDive(); exitView(); }
const qDive=new T.Quaternion(), pDive=new T.Vector3(), qRoom=new T.Quaternion(), qView=new T.Quaternion(), pRoom=new T.Vector3(0,EYE,.9), bobT={v:0}, pView=new T.Vector3(), eul=new T.Euler(0,0,0,'YXZ'), lookM=new T.Matrix4();
let syncT=0;
function render(dt){ t+=dt; yaw+=(yawT-yaw)*Math.min(1,dt*8); pitch+=(pitchT-pitch)*Math.min(1,dt*8); pan+=(panT-pan)*Math.min(1,dt*6);
  vb+=((mode!=='room'&&mode!=='act'?1:0)-vb)*Math.min(1,dt*4); dYaw+=(dYawT-dYaw)*Math.min(1,dt*6); dPitch+=(dPitchT-dPitch)*Math.min(1,dt*6);
  // 在房間裡用搖桿走動：前進／後退、左右轉；不能走進水族箱、壁爐和牆
  if(mode==='room'&&c.joy){ const j=c.joy(); if(Math.abs(j.thr)>.05||Math.abs(j.turn)>.05){ yawT-=j.turn*dt*1.7; const sp=1.3*j.thr*dt, fx=-Math.sin(yaw), fz=-Math.cos(yaw); let nx=pRoom.x+fx*sp, nz=pRoom.z+fz*sp;
      nx=Math.max(-ROOM.x+.5,Math.min(ROOM.x-.5,nx)); nz=Math.max(ROOM.zb+1.12,Math.min(ROOM.zf-.5,nz)); if(nx>ROOM.x-1.3&&Math.abs(nz-FP.z)<1.2) nx=ROOM.x-1.3;
      // 撞到家具：先試沿 x、再試沿 z 滑過去，都不行就停住
      if(blocked(nx,nz)){ if(!blocked(nx,pRoom.z)) nz=pRoom.z; else if(!blocked(pRoom.x,nz)) nx=pRoom.x; else { nx=pRoom.x; nz=pRoom.z; } }
      pRoom.x=nx; pRoom.z=nz; bobT.v+=dt*7; } pRoom.y=EYE+Math.sin(bobT.v)*.012; }
  eul.set(pitch,yaw,0); qRoom.setFromEuler(eul);
  const tk=tanks[viewTank]||tanks.fresh;
  if(tk){ const s=tk.spec, hf=Math.atan(Math.tan(cam.fov*Math.PI/360)*cam.aspect), dist=Math.max(s.h*.75/Math.tan(cam.fov*Math.PI/360),(s.w*.42)/Math.tan(hf))+s.d/2;
    pView.set(tk.x+pan,tk.y+s.h/2,tk.z+dist);
    // 觀賞模式：把鏡頭和魚缸之間的家具（茶几等）裁掉，畫面只留魚缸
    { const nr=mode==='view'?Math.max(.05,(dist-s.d/2-.35)*vb):.05; if(Math.abs(cam.near-nr)>.01){ cam.near=nr; cam.updateProjectionMatrix(); } } lookM.lookAt(pView,tv.set(tk.x+pan,tk.y+s.h/2,tk.z),cam.up); qView.setFromRotationMatrix(lookM); }
  if(mode==='grill'){ pDive.set(ROOM.x-1.45,1.0,FP.z-.15); lookM.lookAt(pDive,tv.set(GP.x,GP.y-.05,GP.z),cam.up); qDive.setFromRotationMatrix(lookM); cam.position.lerp(pDive,Math.min(1,dt*3)); cam.quaternion.slerp(qDive,Math.min(1,dt*4)); }
  else if(mode==='dive'&&tk){ const s2=tk.spec; if(!DV.on){ DV.on=true; DV.p.set(tk.x,tk.y+s2.h*.5,tk.z+s2.d*.3); }
    // 缸內游動：搖桿前後游、左右轉向，拖曳畫面轉頭；碰到玻璃就停住
    if(c.joy){ const j=c.joy(); dYawT-=j.turn*dt*1.4; const sp=.35*j.thr*dt, cp=Math.cos(dPitch); DV.p.x+=-Math.sin(dYaw)*cp*sp; DV.p.z+=-Math.cos(dYaw)*cp*sp; DV.p.y+=Math.sin(dPitch)*sp; }
    DV.p.x=Math.max(tk.x-s2.w/2+.06,Math.min(tk.x+s2.w/2-.06,DV.p.x)); DV.p.y=Math.max(tk.y+.12,Math.min(tk.y+s2.h-.08,DV.p.y)); DV.p.z=Math.max(tk.z-s2.d/2+.05,Math.min(tk.z+s2.d/2-.05,DV.p.z));
    pDive.copy(DV.p); pDive.y+=Math.sin(t*.9)*.006; eul.set(dPitch,dYaw,0); qDive.setFromEuler(eul);
    cam.position.lerp(pDive,Math.min(1,dt*3)); cam.quaternion.slerp(qDive,Math.min(1,dt*4)); }
  else { const k=vb*vb*(3-2*vb); cam.position.lerpVectors(pRoom,pView,k); cam.quaternion.copy(qRoom).slerp(qView,k); }
  const fl=.85+.15*Math.sin(t*9)+.08*Math.sin(t*23)+.05*Math.sin(t*41); fireL.intensity=2.2*fl; fireM.opacity=.7+.3*fl;
  flames.forEach((f,i)=>{ f.material.uniforms.uT.value=t*(1+i*.07)+i*3.1; f.scale.y=.92+.12*Math.sin(t*(3.1+i))+.06*Math.sin(t*11+i); }); emberU.uT.value=t; FU.uK.value=1;
  if(Math.random()<dt*7){ const S=sparks.find(q=>!q.s.visible); if(S){ S.s.position.set(ROOM.x-.3+(Math.random()-.5)*.15,.25,FP.z+(Math.random()-.5)*.4); S.v.set((Math.random()-.5)*.15,.5+Math.random()*.6,(Math.random()-.5)*.15); S.t=0; S.life=.8+Math.random()*1.2; S.s.visible=true; } }
  sparks.forEach(S=>{ if(!S.s.visible) return; S.t+=dt; if(S.t>S.life){ S.s.visible=false; return; } S.v.x+=Math.sin(t*5+S.life*9)*dt*.3; S.s.position.addScaledVector(S.v,dt); S.s.material.opacity=(1-S.t/S.life)*(.6+.4*Math.sin(t*30+S.life*50)); });
  if((syncT+=dt)>1){ syncT=0; try{ syncTime(); syncFish(); syncMounts(); }catch(err){ console.error('home sync',err); } }   // 每秒同步一次：剛帶回的魚、升級的缸、晚一步載好的真實模型
  if(c.crackle&&Math.random()<dt*2.2) c.crackle();
  tags.forEach((g,j)=>{ g.s.position.y=g.y+Math.sin(t*2+j)*.03; g.s.visible=mode==='room'&&!GR.on&&pickUI.classList.contains('hidden')&&furnUI.classList.contains('hidden')&&(!g.f||g.ready); });
  updAct(dt); swingLamp(dt);
  furnTick-=dt; if(furnTick<=0){ furnTick=3; updFurnTags(); syncTime(); }
  updGrill(dt);   // 爐火劈啪聲，隨機間隔
  { const rk=c.rain?Math.min(1,c.rain()*1.6):0; rainGlass.tick(dt,rk); viewM.color.setScalar(1-.35*rk); }   // 下雨：窗上有水珠、水痕往下滑，外面變暗變霧
  sparkles.forEach(q=>{ const k=Math.max(0,Math.sin(t*1.7+q.ph)); q.sp.material.opacity=Math.pow(k,8); q.sp.scale.setScalar(.03+.05*Math.pow(k,4)); if(k<.02&&Math.random()<.02) q.sp.position.set((Math.random()-.5)*1.5,(Math.random()-.5)*1.2,.0); });   // 水晶閃光
  updTanks(dt); R.setRenderTarget(null); R.render(scene,cam); }
window.addEventListener('resize',()=>{ if(on) resize(); });
return {enter,exit,render,active:()=>on,scene,cam,grill:()=>pickFish(),grillSet:(a,b,f)=>{ if(!GR.on) return; GR.a=a; GR.b=b; if(f!=null){ GR.face=f; spin.rotation.z=f*Math.PI; } }};
}
/* ===== 湖裡還有人等燈：林秋月（夜裡偶爾出現的驚嚇事件，之後接隱藏章節） ===== */
function createGhost(W,c){
'use strict';
let ghostRig=null, aliveRig=null;
const T=THREE, S=c.save, GL=T.GLTFLoader?new T.GLTFLoader():null;
let model=null, loading=false, mats=[], ev=null, lastTry=0, sessionStart=performance.now();
let alive=null, aliveLoading=false, fin=null, calm=null, calmTry=0;
// 老漁人的提燈：髮簪與三次相遇完成後的夜裡提在手邊，結局時林秋月看的就是它
let lamp=null, lampLoading=false; const lampL=new T.PointLight(0xffb866,0,7,1.4); W.scene.add(lampL);
function loadLamp(fn){ if(lamp) return fn(lamp); if(lampLoading||!GL) return; lampLoading=true;
  GL.load('models/lantern.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ mt.emissive=new T.Color(0xffc070); mt.emissiveMap=mt.map; mt.emissiveIntensity=.35; } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), sc=.32/Math.max(sz.y,1e-6); o.scale.setScalar(sc); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z); lamp=new T.Group(); lamp.add(o); lamp.visible=false; W.scene.add(lamp); lampLoading=false; fn(lamp); },undefined,()=>{ lampLoading=false; }); }
function lampWanted(){ if(fin) return true; if(!c.storyActive||!c.storyActive('lantern')||!c.progOf) return false; const p=c.progOf('lantern'); return !!p&&p[0]>=1&&p[1]>=3&&c.period()==='night'&&c.loc()==='lake'; }
function updLamp(dt,t){ const want=lampWanted(); if(want&&!lamp){ loadLamp(()=>{}); }
  if(!lamp){ lampL.intensity=0; return; } lamp.visible=want; if(!want){ lampL.intensity=0; return; }
  if(!fin&&!S.lampHint&&c.toast){ S.lampHint=1; c.persist(); c.toast('🏮 老漁人的燈在你手邊亮了起來。滿月的夜晚（或掛上月光餌），提著它到浮萍灣。','good',5200); }
  const b=c.base(), h=c.head(), fw=new T.Vector3(-Math.sin(h),0,-Math.cos(h)), rt=new T.Vector3(Math.cos(h),0,-Math.sin(h));
  lamp.position.set(b.x,0,b.z).addScaledVector(fw,.9).addScaledVector(rt,-.4); lamp.position.y=1.02+Math.sin(t*1.7)*.015; lamp.rotation.y=h+Math.sin(t*.9)*.06; lamp.rotation.z=Math.sin(t*1.3)*.04;
  lampL.position.copy(lamp.position); lampL.position.y+=.18; lampL.intensity=1.6+Math.sin(t*11)*.15+Math.random()*.1; }
let tt=0;
const ov=document.getElementById('scare'), face=ov&&ov.querySelector('img');
// 條件：第六章（月潮）完成後、夜晚、湖區、沒關閉驚嚇效果、正在閒置或等魚
// 測試模式：網址加上 ghost 測試參數，不看章節、時段、次數，閒置或等魚約 5 秒出現、間隔 30 秒（只影響開這一頁的人）
const TEST=/[?&]ghost=(1|glide|peek|behind|jump|grab|creep|bow)/.test(location.search), TEST_MODE=(location.search.match(/[?&]ghost=(glide|peek|behind|jump|grab|creep|bow)/)||[])[1]; let testLast=0;
function eligible(){ if(TEST){ const st=c.state(); return (st==='idle'||st==='wait')&&!ev&&performance.now()-testLast>30000&&performance.now()-sessionStart>5000; }
  if(S.noScare) return false; if(c.storyDone&&c.storyDone('lantern')) return false;
  if(c.period()!=='night'||c.loc()!=='lake') return false; const st=c.state(); if(st!=='idle'&&st!=='wait') return false;
  // 隱藏章節進行中：還沒遇滿 3 次時她出現得更勤（任務才過得了）；遇滿 3 次後就不再嚇人
  const hp=c.storyActive&&c.storyActive('lantern')&&c.progOf?c.progOf('lantern'):null, hunt=!!hp&&hp[1]<3;
  if(hp&&hp[1]>=3) return false;
  if(performance.now()-sessionStart<(hunt?90*1000:10*60*1000)) return false;
  const g=S.ghost=S.ghost||{}; const day=new Date().toDateString(); if(g.day!==day){ g.day=day; g.n=0; }
  if(g.n>=(hunt?10:2)) return false; if(g.last&&Date.now()-g.last<(hunt?5:60)*60*1000) return false; return true; }
let hc=null; window.__GHOSTDBG=()=>({ev:ev&&{mode:ev.mode,phase:ev.phase,t:+ev.t.toFixed(1)},vis:!!(model&&model.visible),pos:model&&model.position.toArray().map(v=>+v.toFixed(2)),hc:!!hc,kids:model&&model.children.length,sk:hc&&hc.mesh.visible});   // 新的女鬼骨架控制器（表情、反頭、伸手、抽搐）
function load(fn){ if(model) return fn(model); if(loading||!GL) return; loading=true;
  if(window.__HUMAN){ GL.load('models/lin_v1.glb',g=>{ const o=g.scene; o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), s=1.68/Math.max(sz.y,1e-6); o.scale.setScalar(s); o.updateMatrixWorld(true);
      const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z); o.updateMatrixWorld(true);
      try{ hc=window.__HUMAN.rig(o,{ghost:true}); hc.mesh.material.transparent=true; hc.mesh.material.opacity=.93; hc.mesh.material.fog=true; }catch(e){ console.warn('lin rig',e); }
      model=new T.Group(); model.add(o); model.visible=false; W.scene.add(model); loading=false; fn(model); },undefined,()=>{ loading=false; }); return; }
  GL.load('models/ghost.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt){ mt.fog=true; mt.transparent=true; mt.opacity=.88; mt.depthWrite=true; mt.roughness=1; mt.metalness=0; if(mt.map){ mt.emissive=new T.Color(0x8fa0b8); mt.emissiveMap=mt.map; mt.emissiveIntensity=.12; } mats.push(mt); } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), s=1.68/Math.max(sz.y,1e-6); o.scale.setScalar(s); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z); o.updateMatrixWorld(true); try{ ghostRig=autoRig(o,'human'); }catch(e){ console.warn('ghost rig',e); }
    model=new T.Group(); model.add(o); model.visible=false; W.scene.add(model); loading=false; fn(model); },undefined,()=>{ loading=false; }); }
// 真人尖叫與哀鳴（OpenGameArt CC0）
const tv=new T.Vector3();
const SFX={}; function sfx(name,vol){ try{ let a=SFX[name]; if(!a){ a=new Audio(name+'.mp3'); a.preload='auto'; SFX[name]=a; } a.volume=Math.max(0,Math.min(1,vol==null?1:vol)); a.currentTime=0; a.play().catch(()=>{}); return a; }catch(e){ return null; } }
['scream_main','scream_b','wail','gasp'].forEach(n=>{ try{ const a=new Audio(n+'.mp3'); a.preload='auto'; SFX[n]=a; }catch(e){} });
// 喉嚨的「呃呃呃」：低頻鋸齒波＋一頓一頓的音量（咒怨伽椰子的聲音），脖子的喀喀聲，嚇人前把環境音壓到幾乎無聲
let AC=null, croakN=null; const actx=()=>{ try{ AC=AC||new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} return AC; };
function croak(on){ const a=actx(); if(!a) return; if(croakN){ try{ croakN.g.gain.setTargetAtTime(0,a.currentTime,.05); const n=croakN; setTimeout(()=>{ try{ n.o.stop(); n.l.stop(); }catch(e){} },400); }catch(e){} croakN=null; } if(!on) return;
  const o=a.createOscillator(), g=a.createGain(), f=a.createBiquadFilter(), l=a.createOscillator(), lg=a.createGain(); o.type='sawtooth'; o.frequency.value=62; f.type='bandpass'; f.frequency.value=480; f.Q.value=1.6;
  l.type='square'; l.frequency.value=13; lg.gain.value=.5; l.connect(lg); lg.connect(g.gain); g.gain.value=.5; o.connect(f); f.connect(g); g.connect(a.destination); o.start(); l.start();
  o.frequency.setValueAtTime(62,a.currentTime); o.frequency.linearRampToValueAtTime(74,a.currentTime+3); croakN={o,g,l}; }
function croakVol(v){ try{ if(croakN&&AC) croakN.g.gain.setTargetAtTime(v,AC.currentTime,.2); }catch(e){} }
function crack(){ const a=actx(); if(!a) return; const b=a.createBuffer(1,a.sampleRate*.06,a.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,6);
  const s=a.createBufferSource(), f=a.createBiquadFilter(), g=a.createGain(); f.type='highpass'; f.frequency.value=1800; g.gain.value=.9; s.buffer=b; s.connect(f); f.connect(g); g.connect(a.destination); s.start(); }
function muteAll(on){ try{ if(c.mute) c.mute(on); }catch(e){} }
const MODES=['glide','peek','behind','jump','grab','creep','bow']; let testIdx=0;
function pickMode(){ if(TEST){ if(TEST_MODE) return TEST_MODE; const m=MODES[testIdx%MODES.length]; testIdx++; return m; }
  const st=c.state(), c5=S.story&&S.story.done&&S.story.done.includes('c5');
  const w={glide:40,peek:st==='wait'?30:0,behind:18,jump:c5?22:6,grab:hc?(c5?16:6):0,creep:hc?12:0,bow:hc?12:0}; let tot=0; for(const k in w) tot+=w[k]; let r=Math.random()*tot; for(const k in w){ r-=w[k]; if(r<=0) return k; } return 'glide'; }
function placeRel(m,fw,rt,y){ const b=c.base(), h=c.head(), f=new T.Vector3(-Math.sin(h),0,-Math.cos(h)), r=new T.Vector3(Math.cos(h),0,-Math.sin(h));
  const p=new T.Vector3(b.x,0,b.z).addScaledVector(f,fw).addScaledVector(r,rt); m.position.set(p.x,y,p.z); return p; }
function faceMe(m){ const b=c.base(); m.rotation.y=Math.atan2(b.x-m.position.x,b.z-m.position.z); }
function lookingAt(p,tol){ const b=c.base(), yaw=c.head()+(c.yaw?c.yaw():0); const want=Math.atan2(-(p.x-b.x),-(p.z-b.z)); let d=want-yaw; while(d>Math.PI) d-=Math.PI*2; while(d<-Math.PI) d+=Math.PI*2; return Math.abs(d)<(tol||.45); }
function meet(){ if(TEST) return; const g=S.ghost=S.ghost||{}; g.last=Date.now(); g.n=(g.n||0)+1; g.met=(g.met||0)+1; c.persist(); if(c.onMeet) c.onMeet(g.met); }
// 四種出現方式：遠處飄過、水裡露頭、身後、撲臉
function trigger(force){ if(ev) return false; if(!force&&!eligible()) return false; const mode=pickMode();
  load(m=>{ ev={t:0,mode}; meet();
    if(mode==='jump'){ const side=Math.random()<.5?-1:1; const p=placeRel(m,1.4,side*1.9,-1.9); faceMe(m); ev.p=p; m.visible=true; c.drip&&c.drip(); waterFx(p,true); if(window.__FACE) window.__FACE(p,{dur:2.4,pitch:.05}); }
    else if(mode==='glide'){ const side=Math.random()<.5?-1:1, dist=9+Math.random()*3; const p=placeRel(m,dist,-side*3.5,-1.8); ev.rise=1; ev.p=p; ev.dir=new T.Vector3(Math.cos(c.head()),0,-Math.sin(c.head())).multiplyScalar(side*.55); m.rotation.y=Math.atan2(ev.dir.x,ev.dir.z); m.visible=true; ev.stare=0; ev.phase='glide'; ev.wail=sfx('wail',.35); }
    else if(mode==='peek'){ const to=c.state()==='wait'&&c.to?c.to():null; const b=c.base(); let p; if(to){ const dx=to.x-b.x, dz=to.z-b.z, L=Math.hypot(dx,dz)||1; const sd=(Math.random()<.5?-1:1)*1.4; p=new T.Vector3(to.x+dx/L*1.2-dz/L*sd,0,to.z+dz/L*1.2+dx/L*sd); m.position.set(p.x,-1.95,p.z); } else p=placeRel(m,6,(Math.random()<.5?-1:1)*1.8,-1.95); ev.p=p; faceMe(m); m.visible=true; ev.phase='rise'; ev.st0=c.state(); }
    else if(mode==='creep'&&hc){ const side=Math.random()<.5?-1:1; const p=placeRel(m,13,side*4,-.05); ev.p=p; faceMe(m); m.visible=true; ev.phase='creep'; ev.away=0; ev.jumps=0; hc.now('hy',0); hc.now('reach',0); hc.now('hp',.35); hc.now('hr',.4); hc.expr(-1); croak(true); croakVol(.08); }   /* 一二三木頭人：你看她時她不動，轉開視線她就更近一步 */
    else if(mode==='bow'&&hc){ const p=placeRel(m,5.5,(Math.random()-.5)*1.5,-.05); ev.p=p; faceMe(m); m.visible=true; ev.phase='bow'; hc.now('hy',0); hc.now('hp',1.25); hc.now('hairFace',1); hc.expr(5); muteAll(true); }   /* 貞子式：低頭、長髮蓋住臉，慢慢飄近 */
    else if(mode==='grab'&&hc){ const camY=(W.camera.getWorldPosition(new T.Vector3()).y), deck=camY-1.62; const p=placeRel(m,-.8,.12,deck); ev.deck=deck;   /* 站在你身後的碼頭上，臉跟你一樣高 */ ev.p=p; faceMe(m); m.rotation.y+=Math.PI; m.visible=true; ev.phase='silence'; hc.now('hy',0); hc.now('reach',0); hc.now('twitch',0); hc.expr(-1); muteAll(true); }   // 《大法師》式：她貼在你背後、身體背對你
    else { const p=placeRel(m,-2.1,0,-.28); ev.p=p; faceMe(m); m.visible=true; ev.phase='wait'; ev.wail=sfx('wail',.22); c.vib&&c.vib([15,60,15]); } });
  return true; }
// 入水／出水：水花、泡泡、擴散的水紋與水聲
// 她自己的水面效果（依人的尺度，不借用魚的小水花）：水線泡沫環、移動時的尾跡水紋、出入水的水花與大水圈
const ringGeo=new T.RingGeometry(.86,1,48).rotateX(-Math.PI/2);
const rings=[]; for(let i=0;i<18;i++){ const m=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:0xe6eef2,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide})); m.visible=false; m.renderOrder=11; W.scene.add(m); rings.push({m,t:0,life:1,r0:.3,r1:1.5,a:.5}); }
const dropTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), rg=g.createRadialGradient(16,16,1,16,16,15); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(.5,'rgba(230,240,248,.7)'); rg.addColorStop(1,'rgba(230,240,248,0)'); g.fillStyle=rg; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
const drops=[]; for(let i=0;i<70;i++){ const s=new T.Sprite(new T.SpriteMaterial({map:dropTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; W.scene.add(s); drops.push({s,v:new T.Vector3(),t:0,life:1}); }
const foam=new T.Mesh(new T.RingGeometry(.2,.46,40).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xf2f6f8,transparent:true,opacity:0,depthWrite:false})); foam.renderOrder=11; foam.visible=false; W.scene.add(foam);
function ring(p,r0,r1,life,a){ const R=rings.find(q=>!q.m.visible)||rings[0]; Object.assign(R,{t:0,life,r0,r1,a}); R.m.position.set(p.x,.035,p.z); R.m.visible=true; }
function burst(p,n,pow){ for(let i=0;i<n;i++){ const D=drops.find(q=>!q.s.visible); if(!D) break; const a=Math.random()*6.283, r=Math.random()*.35;
    D.s.position.set(p.x+Math.cos(a)*r,.05,p.z+Math.sin(a)*r); D.v.set(Math.cos(a)*(.4+Math.random())*pow,(1.6+Math.random()*2.2)*pow,Math.sin(a)*(.4+Math.random())*pow); D.t=0; D.life=.7+Math.random()*.6; const sc=.05+Math.random()*.09; D.s.scale.set(sc,sc,1); D.s.visible=true; } }
function waterFx(p,big){ if(!p) return; burst(p,big?46:22,big?1.15:.7); ring(p,.3,big?3.2:2,1.8,.7); setTimeout(()=>ring(p,.25,big?2.4:1.5,1.6,.55),220); setTimeout(()=>ring(p,.2,big?1.6:1.1,1.4,.45),480);
  c.splash&&c.splash(p.x,p.z,big?26:12,big?.9:.5); c.splashSnd&&c.splashSnd(big?1:.5); }
let bubT=0; function bubbles(p,dt,rate){ bubT-=dt; if(bubT<=0){ bubT=rate; burst(new T.Vector3(p.x+(Math.random()-.5)*.5,0,p.z+(Math.random()-.5)*.5),3,.25); ring({x:p.x+(Math.random()-.5)*.4,z:p.z+(Math.random()-.5)*.4},.08,.6,1.1,.5); } }
let wakeT=0;
function fxTick(dt){
  rings.forEach(R=>{ if(!R.m.visible) return; R.t+=dt; const k=R.t/R.life; if(k>=1){ R.m.visible=false; return; } const r=R.r0+(R.r1-R.r0)*(1-Math.pow(1-k,2)); R.m.scale.set(r,1,r); R.m.material.opacity=R.a*(1-k); });
  drops.forEach(D=>{ if(!D.s.visible) return; D.t+=dt; if(D.t>=D.life||D.s.position.y<0){ if(D.s.position.y<0&&D.t<D.life) ring(D.s.position,.03,.25,.6,.35); D.s.visible=false; return; } D.v.y-=9.8*dt; D.s.position.addScaledVector(D.v,dt); D.s.material.opacity=.9*(1-D.t/D.life); });
  // 水線泡沫環：她的身體穿過水面的地方
  const m=model; const inWater=m&&m.visible&&m.position.y<-.05&&m.position.y>-1.75;
  foam.visible=!!inWater; if(inWater){ foam.position.set(m.position.x,.03,m.position.z); const f=.35+.12*Math.sin(performance.now()*.006); foam.material.opacity=f; foam.scale.setScalar(1+.06*Math.sin(performance.now()*.004));
    wakeT-=dt; if(wakeT<=0){ wakeT=.45; ring(m.position,.35,1.8,2.2,.4); } } }
function endEv(){ croak(false); muteAll(false); if(model) model.visible=false; if(ov) ov.classList.remove('on'); if(ev&&ev.wail){ try{ ev.wail.pause(); }catch(e){} } ev=null; }
// 跟著環境亮度：越暗越只剩月光般的微光；腳下（水面交界）有一圈水紋
let ripT=0;
function blend(dt){ if(!model||!model.visible) return; const lt=W.info?W.info.light:1; mats.forEach(m=>{ if(m.emissiveIntensity!==undefined) m.emissiveIntensity=.1+Math.max(0,.5-lt)*.7; });
  ripT-=dt; if(ripT<=0&&model.position.y>-1.9){ ripT=.9+Math.random()*.6; if(W.addRipple) W.addRipple(model.position.x,model.position.z,.35); } }
function update(dt){ { const tt=performance.now()/1000; if(ghostRig&&!hc) ghostRig.pose({t:tt,breathe:.004,headRoll:.14+.05*Math.sin(tt*.7),headPitch:.12,skirt:.05}); if(aliveRig) aliveRig.pose({t:tt,headPitch:.08,skirt:.025}); } blend(dt);
  if(!ev){ lastTry+=dt; if(lastTry>1){ lastTry=0;
      if(!model&&!loading&&(TEST||!S.noScare&&c.period()==='night'&&c.loc()==='lake')) load(()=>{});
      // 每秒擲一次：平常約 40 分鐘可出現的時間才遇到一次；隱藏章節要遇見她時約 1～2 分鐘
      const hp=c.storyActive&&c.storyActive('lantern')&&c.progOf?c.progOf('lantern'):null, hunt=!!hp&&hp[1]<3;
      if(eligible()&&(TEST||Math.random()<(hunt?1/75:1/2400))){ if(TEST) testLast=performance.now(); trigger(TEST); } } return; }
  ev.t+=dt; const t=ev.t, m=model; if(!m) return;
  if(ev.mode==='jump'){ m.position.y=Math.min(-.28,-1.9+t*2.1); faceMe(m); m.rotation.y+=Math.sin(t*9)*.04;
    if(t>.9&&!ev.face){ ev.face=true; if(ov) ov.classList.add('on'); sfx('scream_main',1); c.vib&&c.vib([120,40,160,40,320]); c.shake&&c.shake(3.2); }
    if(t>2.3){ waterFx(m.position,true); endEv(); } return; }
  if(ev.mode==='glide'){ if(ev.phase==='glide'){ const sp=.28+.1*Math.sin(t*.35); m.position.addScaledVector(ev.dir,dt*sp/.55); const b=c.base(); tv.set(b.x-m.position.x,0,b.z-m.position.z); const dist=tv.length(); tv.normalize(); if(dist>4.2) m.position.addScaledVector(tv,dt*.32);
      if(ev.rise){ m.position.y=Math.min(-.45,m.position.y+dt*.9); if(m.position.y>=-.45){ ev.rise=0; } if(!ev.rose){ ev.rose=1; waterFx(m.position,false); } } else m.position.y=-.45+Math.sin(t*.8)*.04; m.rotation.z=Math.sin(t*.6)*.05; m.rotation.x=Math.sin(t*.45+1)*.03;
      if(ev.lookT===undefined) ev.lookT=0; ev.lookT+=dt; const tgt=Math.atan2(ev.dir.x,ev.dir.z)+Math.sin(ev.lookT*.3)*.5; let dd=tgt-m.rotation.y; while(dd>Math.PI) dd-=Math.PI*2; while(dd<-Math.PI) dd+=Math.PI*2; m.rotation.y+=dd*Math.min(1,dt*.8);
      if(Math.random()<dt*.8) c.ripple&&c.ripple(m.position.x,m.position.z,.25); if(ev.wail) ev.wail.volume=Math.max(0,.35*(1-t/16));
      if(lookingAt(m.position,.35)) ev.stare+=dt; else ev.stare=Math.max(0,ev.stare-dt*.5);
      if(ev.stare>4){ ev.phase='turn'; ev.t2=0; } if(t>16) ev.phase='sink'; }
    if(ev.phase==='turn'){ ev.t2+=dt; { const b2=c.base(); tv.set(b2.x-m.position.x,0,b2.z-m.position.z); const d2=tv.length(); if(d2>3.5) m.position.addScaledVector(tv.normalize(),dt*.55); } const b=c.base(), want=Math.atan2(b.x-m.position.x,b.z-m.position.z); let d=want-m.rotation.y; while(d>Math.PI) d-=Math.PI*2; while(d<-Math.PI) d+=Math.PI*2; m.rotation.y+=d*Math.min(1,dt*1.2); if(ev.t2>3) ev.phase='sink'; }
    if(ev.phase==='sink'){ if(!ev.sk){ ev.sk=0; waterFx(m.position,false); } ev.sk+=dt; m.position.y-=dt*(.2+ev.sk*1.1); m.rotation.z*=.95; bubbles(m.position,dt,.12); if(m.position.y<-2.1){ waterFx(m.position,false); endEv(); } } return; }
  if(ev.mode==='peek'){ if(ev.phase==='rise'){ if(!ev.rs){ ev.rs=1; c.ripple&&c.ripple(m.position.x,m.position.z,.5); } m.position.y=Math.min(-1.42,m.position.y+dt*.4); bubbles(m.position,dt,.25); if(m.position.y>=-1.42) ev.phase='stare'; }
    else if(ev.phase==='stare'){ faceMe(m); m.position.y=-1.42+Math.sin(t*1.1)*.015; if(c.state()!==ev.st0||t>8){ ev.phase='down'; ev.fast=c.state()!==ev.st0; if(ev.fast){ sfx('gasp',.6); c.vib&&c.vib(40); } waterFx(m.position,ev.fast); } }
    else { m.position.y-=dt*(ev.fast?2.4:.7); bubbles(m.position,dt,.1); if(m.position.y<-2.2){ c.ripple&&c.ripple(m.position.x,m.position.z,.4); endEv(); } } return; }
  if(ev.mode==='creep'&&hc){ const b=c.base(); tv.set(b.x-m.position.x,0,b.z-m.position.z); const dist=tv.length(); m.position.y=-.05; faceMe(m);
    if(ev.phase==='creep'){ const look=lookingAt(m.position,.5); if(look){ ev.away=0; ev.seen=(ev.seen||0)+dt; } else ev.away+=dt;   // 看著她：一動也不動
      if(ev.away>.9&&dist>1.8){ ev.away=0; ev.jumps++; const step=Math.min(dist-1.4,2.2+Math.random()*1.4); m.position.addScaledVector(tv.normalize(),step); hc.now('hr',(Math.random()-.5)*.9); hc.now('hp',.2+Math.random()*.5); hc.expr(ev.jumps>3?4:-1); crack(); croakVol(Math.min(.6,.1+ev.jumps*.1)); c.vib&&c.vib(18); }   // 轉開視線再轉回來：她更近了、頭的角度也變了
      if(dist<2.1){ ev.phase='face'; ev.tf=0; placeRel(m,.75,0,-.05); faceMe(m); hc.now('hp',0); hc.now('hr',0); hc.expr(3); hc.set('reach',1); croak(false); sfx('scream_main',1); if(ov) ov.classList.add('on'); c.vib&&c.vib([120,40,160,40,320]); c.shake&&c.shake(3); }
      if(t>45){ croak(false); endEv(); } }
    else { ev.tf+=dt; if(ev.tf>1.4){ hc.now('reach',0); hc.expr(-1); endEv(); } }
    return; }
  if(ev.mode==='bow'&&hc){ const b=c.base(); tv.set(b.x-m.position.x,0,b.z-m.position.z); const dist=tv.length(); faceMe(m);
    if(ev.phase==='bow'){ m.position.addScaledVector(tv.normalize(),dt*.35); m.position.y=-.05+Math.sin(t*1.3)*.02; hc.set('twitch',Math.random()<dt*1.5?1:0);
      if(dist<2.2||t>9){ ev.phase='up'; ev.tu=0; hc.now('hairFace',0); hc.now('hp',-.15); hc.expr(3); muteAll(false); sfx('scream_main',1); if(ov) ov.classList.add('on'); c.vib&&c.vib([150,40,200,40,300]); c.shake&&c.shake(3.4); } }   // 走到面前猛然抬頭：女鬼臉、尖叫
    else { ev.tu+=dt; hc.set('reach',ev.tu>.3?1:0); if(ev.tu>1.6){ hc.now('reach',0); hc.now('hp',0); hc.expr(-1); endEv(); } }
    return; }
  if(ev.mode==='grab'&&hc){ const st=ev.phase; m.position.y=ev.deck;
    if(st==='silence'&&t>1.2){ ev.phase='grab'; ev.tg=0; c.vib&&c.vib([200]); c.shake&&c.shake(1.6); sfx('gasp',.9); if(window.__FACE) window.__FACE(m.position.clone().setY(ev.deck+1.45),{dur:9,pitch:.02}); }   // 一片死寂後，一隻手抓住你的肩膀，你被扳過身
    if(st==='grab'){ ev.tg+=dt; if(ev.tg>1.4){ ev.phase='turn'; ev.hy=0; ev.step=0; croak(true); } }
    if(st==='turn'){ ev.step-=dt; if(ev.step<=0){ ev.step=.32+Math.random()*.25; ev.hy=Math.min(Math.PI,ev.hy+.28+Math.random()*.12); hc.set('hy',ev.hy); hc.now('twitch',1); setTimeout(()=>hc&&hc.set('twitch',0),110); crack(); c.vib&&c.vib(25); }   // 頭一格一格地喀、喀轉過來
      if(ev.hy>=Math.PI-.01){ ev.phase='stare'; ev.ts=0; hc.expr(4); } }   // 臉轉到背後，對你詭笑
    if(st==='stare'){ ev.ts+=dt; if(ev.ts>1.6&&!ev.scr){ ev.scr=1; croak(false); hc.expr(3); hc.set('reach',1); sfx('scream_main',1); if(ov) ov.classList.add('on'); c.vib&&c.vib([120,40,160,40,320]); c.shake&&c.shake(3.4); }   // 尖叫、伸手撲過來
      if(ev.ts>3.0){ hc.now('reach',0); hc.expr(-1); hc.now('hy',0); muteAll(false); endEv(); } }
    return; }
  if(ev.mode==='behind'){ if(ev.phase==='wait'){ faceMe(m); m.position.y=-.28+Math.sin(t*1.2)*.01; if(Math.random()<dt*.6) c.ripple&&c.ripple(m.position.x,m.position.z,.2);
      if(lookingAt(m.position,.6)||t>14){ ev.phase='drop'; ev.fast=t<14; if(ev.fast){ sfx('gasp',.7); c.vib&&c.vib([60,30,60]); } waterFx(m.position,ev.fast); } }
    else { m.position.y-=dt*(ev.fast?3:.8); bubbles(m.position,dt,.08); if(m.position.y<-2.1) endEv(); } return; }
}
// 拍到她：遠處飄過時按 📷，手記多一頁
function onPhoto(){ if(!ev||ev.mode!=='glide'||ev.phase==='sink') return false; const g=S.ghost=S.ghost||{}; if(!g.photo){ g.photo=1; c.persist(); if(window.__STORY&&window.__STORY.page) setTimeout(()=>window.__STORY.page('手記・夾頁：拍到了什麼','那晚我在灣裡拍湖面，回家洗出來，水上多了一個人影。<br><br>白衣，長髮，背對著我。放大看，她的腳不在水裡——她是浮著的。<br><br>我沒有刪掉那張照片。'),900); }
  return true; }
// 生前模樣的模型（結局與之後的安靜出現）
function loadAlive(fn){ if(alive) return fn(alive); if(aliveLoading||!GL) return; aliveLoading=true;
  GL.load('models/girl.glb',g=>{ const o=g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ mt.emissive=new T.Color(0xe8e2d8); mt.emissiveMap=mt.map; mt.emissiveIntensity=.7; mt.transparent=true; } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), sc=1.35/Math.max(sz.y,1e-6); o.scale.setScalar(sc); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z); o.updateMatrixWorld(true); try{ aliveRig=autoRig(o,'human'); }catch(e){ console.warn('alive rig',e); }
    alive=new T.Group(); alive.add(o); alive.visible=false; W.scene.add(alive); aliveLoading=false; fn(alive); },undefined,()=>{ aliveLoading=false; }); }
function placeAhead(m,dist,side){ const b=c.base(), h=c.head(), fw=new T.Vector3(-Math.sin(h),0,-Math.cos(h)), rt=new T.Vector3(Math.cos(h),0,-Math.sin(h));
  const p=new T.Vector3(b.x,0,b.z).addScaledVector(fw,dist).addScaledVector(rt,side||0); m.position.set(p.x,0,p.z); m.rotation.y=Math.atan2(b.x-p.x,b.z-p.z); return p; }
const setOpacity=(m,a)=>m.traverse(o=>{ if(o.isMesh&&o.material) o.material.opacity=a; });
// 結局：髮簪與三次相遇都完成後，滿月夜在浮萍灣提燈，她以生前的樣子出現
function finaleReady(){ if(!c.storyActive||!c.storyActive('lantern')||!c.progOf) return false; const p=c.progOf('lantern'); if(!p) return false;
  return p[0]>=1&&p[1]>=3&&p[2]<1&&c.period()==='night'&&c.zone&&c.zone()==='lily'&&(c.moon()>.85||(window.__G&&window.__G.baitUsed&&window.__G.baitUsed.id==='moon'))&&(c.state()==='idle'||c.state()==='wait'); }
const LINES=['……燈。','是爸爸的燈。','我等了好久……好久。','謝謝你，把燈提到這裡來。','替我跟他說——我要回家了。'];
function startFinale(){ loadAlive(m=>{ placeAhead(m,5.5,0); m.position.y=-.3; m.visible=true; setOpacity(m,0); fin={t:0,li:0}; c.drip&&c.drip(); }); }
function updFinale(dt){ fin.t+=dt; const t=fin.t; if(!alive) return;
  if(t<3){ setOpacity(alive,Math.min(1,t/3)); alive.position.y=-.3+Math.min(1,t/3)*.3; }
  const li=Math.floor((t-3)/3.4); if(t>3&&li<LINES.length&&li>=fin.li){ fin.li=li+1; c.say&&c.say(LINES[li]); }
  if(t>3+LINES.length*3.4+1&&t<3+LINES.length*3.4+5){ const k=1-(t-(3+LINES.length*3.4+1))/4; setOpacity(alive,Math.max(0,k)); alive.position.y+=dt*.25; }
  if(t>3+LINES.length*3.4+5){ alive.visible=false; fin=null; const g=S.ghost=S.ghost||{}; g.freed=1; c.persist(); if(c.scene) c.scene('lantern'); } }
// 章節完成後：夜裡偶爾在遠處水面安靜地站著看燈，不嚇人
function updCalm(dt){ if(calm){ calm.t+=dt; if(alive){ if(calm.t<2) setOpacity(alive,Math.min(.85,calm.t/2*.85)); if(calm.t>9) setOpacity(alive,Math.max(0,.85*(1-(calm.t-9)/2))); if(calm.t>11){ alive.visible=false; calm=null; } } return; }
  calmTry+=dt; if(calmTry<60) return; calmTry=0; if(c.period()!=='night'||c.loc()!=='lake'||Math.random()>.08) return;
  loadAlive(m=>{ placeAhead(m,12,(Math.random()-.5)*8); m.visible=true; setOpacity(m,0); calm={t:0}; }); }
function update2(dt){ tt+=dt; fxTick(dt); updLamp(dt,tt); if(fin){ updFinale(dt); return; }
  if(!TEST&&c.storyDone&&c.storyDone('lantern')){ updCalm(dt); return; }
  if(!ev&&finaleReady()&&!aliveLoading){ startFinale(); return; }
  update(dt); }
return {dbg:()=>({ev:ev&&{mode:ev.mode,phase:ev.phase,t:+ev.t.toFixed(1)},pos:model&&model.visible?[+model.position.x.toFixed(2),+model.position.y.toFixed(2),+model.position.z.toFixed(2)]:null,base:[+c.base().x.toFixed(2),+c.base().z.toFixed(2)],head:+c.head().toFixed(2),yaw:+(c.yaw?c.yaw():0).toFixed(2)}),update:update2,trigger,onPhoto,finale:()=>{ startFinale(); },active:()=>!!ev||!!fin};
}
/* ===== 雲端存檔：Google 帳號登入（Firebase），本機進度永遠不會被洗掉 ===== */
function createCloud(c){
'use strict';
// 向瀏覽器申請「持久儲存」：空間吃緊時，瀏覽器不會把這個遊戲的存檔和快取整個清掉（存檔不見的可能原因之一）
try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persisted().then(p=>{ if(!p) navigator.storage.persist(); }); }catch(e){}
// 測試帳號（網址帶 test 參數）：只限擁有者 Google 帳號，存檔另開一份，雲端存在同一份文件的 test 欄位，不會碰到正式存檔
const OWNER=['onerkk@gmail.com'];
const TEST=!!c.test, FIELD=TEST?'test':'save', TFIELD=TEST?'tt':'t';
const KEY='swampAngler.cloud', BK=TEST?'swampAngler.test.backup':'swampAngler.backup';
let auth=null, db=null, user=null, dirtyT=null, inited=null, busy=false, owner=false, gate=null;
const isOwner=u=>!!(u&&u.email&&u.emailVerified!==false&&OWNER.includes(u.email.toLowerCase()));
const score=s=>s?((s.lv||1)*1000+(s.xp||0)+Object.keys(s.dex||{}).length*60+Math.min(50000,(s.coins||0))/100):0;
function addScript(u){ return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=u; s.onload=ok; s.onerror=()=>no(new Error('載入失敗 '+u)); document.head.appendChild(s); }); }
async function init(){ if(inited) return inited; if(!window.FIREBASE_CFG) return null;
  inited=(async()=>{ const V='10.14.1'; for(const m of ['app','auth','firestore']) await addScript(`https://www.gstatic.com/firebasejs/${V}/firebase-${m}-compat.js`);
    firebase.initializeApp(window.FIREBASE_CFG); auth=firebase.auth(); db=firebase.firestore();
    try{ await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); }catch(e){}
    try{ const r=await auth.getRedirectResult(); if(r&&r.user) c.toast('已登入 '+(r.user.displayName||''),'good',2000); }catch(e){ c.toast('登入失敗：'+(e.message||e),'bad',3000); }
    auth.onAuthStateChanged(u=>{ user=u; owner=isOwner(u); if(u) localStorage.setItem(KEY,'1');
      if(TEST){ showGate(); if(owner){ if(!c.save().testSeeded) copyMain(true); else onLogin().then(()=>{ if(c.grant) c.grant(); }); } }
      else if(u) onLogin();
      c.refresh&&c.refresh(); }); return true; })();
  return inited; }
async function login(){ if(!window.FIREBASE_CFG){ c.toast('Google 登入尚未設定（需要專案擁有者填入 Firebase 設定）','warn',3200); return; }
  if(busy) return; busy=true; try{ await init(); const p=new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({prompt:'select_account'});
    try{ await auth.signInWithPopup(p); }catch(e){ if(/popup|blocked|cancelled|closed/i.test(e.code||'')) await auth.signInWithRedirect(p); else throw e; }
  }catch(e){ c.toast('登入失敗：'+(e.message||e),'bad',3200); } busy=false; }
async function logout(){ if(!auth) return; await push(); await auth.signOut(); localStorage.removeItem(KEY); c.toast('已登出，本機進度保留','',2000); }
function docRef(){ return db.collection('saves').doc(user.uid); }
// merge：正式存檔與測試存檔放在同一份文件的不同欄位，互相不覆蓋
async function push(){ if(!user||!db||(TEST&&!owner)) return; try{ await docRef().set({[FIELD]:c.save(),[TFIELD]:Date.now(),name:user.displayName||'',v:1},{merge:true}); c.refresh&&c.refresh(); }catch(e){ console.warn('cloud push',e); } }
// 登入當下：雲端沒有存檔 → 把本機進度存上去；雲端有而且進度較高 → 詢問；其他情況以本機為準
async function onLogin(){ try{ const d=await docRef().get(); const local=c.save();
    if(!d.exists||!d.data()[FIELD]){ await push(); if(!TEST) c.toast('已把目前的進度存到雲端','good',2400); return; }
    const cloud=d.data()[FIELD]; if(JSON.stringify(cloud)===JSON.stringify(local)) return;
    const sl=score(local), sc=score(cloud);
    // 雲端進度較高：預設就是載入雲端（不再有「沒按到確認就把雲端蓋掉」的情況）；本機進度先備份
    if(sc>sl+1){ try{ localStorage.setItem(BK,JSON.stringify(local)); }catch(e){}
      c.toast(`已載入雲端存檔（Lv ${cloud.lv||1}），本機原本的進度已備份`,'good',3200); c.apply(cloud); return; }
    // 要用本機蓋過雲端前，先把雲端原本那份留一份在伺服器上（prevSave），隨時可以救回
    try{ await docRef().set({['prev_'+FIELD]:cloud,['prevT_'+FIELD]:Date.now()},{merge:true}); }catch(e){}
    await push(); }catch(e){ console.warn('cloud pull',e); c.toast('雲端存檔讀取失敗，使用本機進度','warn',2600); } }
// 測試帳號：把正式版進度（本機或雲端，取進度較高的那份）複製過來，金幣維持 999,999
async function copyMain(auto){ if(!TEST||!owner) return; let best=null;
  try{ const l=JSON.parse(localStorage.getItem('swampAngler.v1')||'null'); if(l) best=l; }catch(e){}
  try{ const d=await docRef().get(); const cs=d.exists&&d.data().save; if(cs&&score(cs)>score(best)) best=cs; }catch(e){ console.warn('copy main',e); }
  if(!best){ const s=c.save(); s.testSeeded=1; if(auto){ await onLogin(); if(c.grant) c.grant(); } else c.toast('找不到正式版進度','warn',2000); return; }
  const o=JSON.parse(JSON.stringify(best)); o.testSeeded=1; o.coins=Math.max(999999,o.coins||0);
  c.toast(auto?'🧪 測試帳號：已複製正式版進度':'已複製正式版進度','good',1800);
  try{ const d0=await docRef().get(); const old=d0.exists&&d0.data()[FIELD]; if(old) await docRef().set({['prev_'+FIELD]:old,['prevT_'+FIELD]:Date.now()},{merge:true}); }catch(e){}   /* 蓋掉測試存檔前先在雲端留一份（救回存檔找得到） */
  try{ await docRef().set({[FIELD]:o,[TFIELD]:Date.now()},{merge:true}); }catch(e){}
  setTimeout(()=>c.apply(o),auto?900:600); }
function dirty(){ if(!user||(TEST&&!owner)) return; clearTimeout(dirtyT); dirtyT=setTimeout(push,6000); }
// 切到背景、關閉頁面前立刻把進度推上雲端（不等 6 秒），減少「玩了一段卻沒同步到」的情況
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&user){ clearTimeout(dirtyT); push(); } });
function status(){ if(!window.FIREBASE_CFG) return {state:'nocfg'}; if(!user) return {state:'out'}; return {state:'in',name:(user.displayName||user.email||'')+(TEST?'（測試帳號）':''),owner:isOwner(user)}; }
// 測試帳號的門：沒登入或不是擁有者就整個畫面擋住，驗證通過才放行
function showGate(){ if(!TEST) return;
  if(owner){ if(gate){ gate.remove(); gate=null; } return; }
  if(!gate){ gate=document.createElement('div'); gate.id='testGate';
    gate.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(6,10,14,.94);color:#eef;font-family:inherit;text-align:center';
    document.body.appendChild(gate);
    gate.addEventListener('click',e=>{ const a=e.target.dataset&&e.target.dataset.g; if(a==='in') login(); else if(a==='out') logout(); }); }
  const btn='height:48px;padding:0 22px;border-radius:14px;border:0;font:inherit;font-size:16px;font-weight:800;margin:6px;cursor:pointer';
  const home=location.pathname;
  const msg=!window.FIREBASE_CFG?'Google 登入尚未設定，測試帳號無法使用。'
    :user?`目前登入的是 ${user.email||user.displayName||'其他帳號'}，這個帳號沒有測試權限。`
    :'測試帳號只限擁有者的 Google 帳號，請先登入。';
  gate.innerHTML=`<div style="max-width:420px"><div style="font-size:40px">🧪</div><div style="font-size:20px;font-weight:900;margin:8px 0">濕地垂釣・測試帳號</div>
    <div style="opacity:.8;line-height:1.7;margin-bottom:14px">${msg}</div>
    ${window.FIREBASE_CFG?(user?`<button data-g="out" style="${btn};background:#444;color:#fff">登出換帳號</button>`:`<button data-g="in" style="${btn};background:#e8b84a;color:#1d1606">Google 登入</button>`):''}
    <a href="${home}" style="display:inline-block;${btn};line-height:48px;background:#2a3440;color:#fff;text-decoration:none">回到正式版</a></div>`; }
if(TEST){ const go=()=>{ showGate(); if(window.FIREBASE_CFG) init().catch(()=>{}); };
  if(document.body) go(); else document.addEventListener('DOMContentLoaded',go); }
// 之前登入過就自動接上
if(!TEST&&localStorage.getItem(KEY)==='1'&&window.FIREBASE_CFG) init().catch(()=>{});
window.addEventListener('beforeunload',()=>{ if(user&&dirtyT){ clearTimeout(dirtyT); push(); } });
async function rescue(){ if(!user){ c.toast('請先用 Google 登入','warn',2000); return; } try{ await init(); const d=await docRef().get(); const D=d.exists?d.data():{}; const C=[];
    if(D[FIELD]) C.push(['雲端存檔',D[FIELD]]); if(D['prev_'+FIELD]) C.push(['雲端備份（被覆蓋前的那份）',D['prev_'+FIELD]]);
    try{ const b=JSON.parse(localStorage.getItem(BK)||'null'); if(b) C.push(['本機備份',b]); }catch(e){}
    if(!TEST&&D.test){ const t=JSON.parse(JSON.stringify(D.test)); if(t.testSeeded){ t.coins=Math.min(t.coins||0,(D[FIELD]&&D[FIELD].coins)||0); delete t.testSeeded; } C.push(['測試帳號裡的進度副本（金幣不沿用）',t]); }
    if(!C.length){ c.toast('這個帳號找不到任何存檔','warn',2400); return; }
    C.sort((a,b)=>score(b[1])-score(a[1])); const [nm,best]=C[0], cur=c.save();
    const info=C.map(([n,s])=>`・${n}：Lv ${s.lv||1}、圖鑑 ${Object.keys(s.dex||{}).length} 種、金幣 ${(s.coins||0).toLocaleString()}`).join('\n');
    if(score(best)<=score(cur)+1){ alert('找到的存檔：\n'+info+'\n\n目前的進度已經是最高的，不需要救回。'); return; }
    if(confirm('找到的存檔：\n'+info+`\n\n要救回進度最高的「${nm}」嗎？目前的進度會先備份。`)){ try{ localStorage.setItem(BK,JSON.stringify(cur)); }catch(e){} c.apply(best); setTimeout(push,1500); c.toast('已救回存檔','good',2400); } }
  catch(e){ console.warn('rescue',e); c.toast('讀取雲端失敗，請稍後再試','warn',2400); } }
// 一次性補償（只限擁有者）：存檔救不回時，把等級、金幣、劇情進度恢復到遺失前的狀態（圖鑑與魚獲紀錄無法還原）
function compensate(){ if(!isOwner(user)){ c.toast('只有擁有者帳號可以使用','warn',2000); return; }
  if(!confirm('把目前的存檔恢復成：Lv 18、金幣 999,999、主線到第七章與隱藏章節完成（終章「深淵之王」待觸發）、獨木舟與漁船已有、稱號「見習漁人」「守燈人」。\n目前的進度會先備份。確定嗎？')) return;
  const s=JSON.parse(JSON.stringify(c.save())); try{ localStorage.setItem(BK,JSON.stringify(s)); }catch(e){}
  s.lv=18; s.xp=0; s.coins=Math.max(s.coins||0,999999); s.kayak=true; s.yacht=true; s.tutDone=1; s.loaded=1;
  s.story=s.story||{}; s.story.intro=1; s.story.done=['c1','c2','c3','c4','ice','c5','lantern','c6'];   /* 含隱藏章節「湖裡還有人等燈」 */ s.story.seen=s.story.seen||[]; s.story.read=s.story.read||[];
  s.titles=Array.from(new Set([...(s.titles||[]),'見習漁人','守燈人'])); if(!s.title) s.title='守燈人';
  s.spot=0; s.testSeeded=1; c.apply(s); setTimeout(push,1500); }
return {compensate,rescue,login,logout,dirty,status,isTest:()=>TEST,copyMain:()=>copyMain(false),restoreBackup:()=>{ const b=localStorage.getItem(BK); if(!b){ c.toast('沒有備份','warn',1600); return; } c.apply(JSON.parse(b)); }};
}
/* ===== 安裝到桌面（PWA） ===== */
const PWA=(()=>{ let deferred=null, installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; });
  window.addEventListener('appinstalled',()=>{ installed=true; deferred=null; });
/* 自動偵測新版本：網頁內建這次部署的版本號，定時（開啟時、每 10 分鐘、切回畫面時）比對伺服器上的 version.json；
   有新版就在畫面上方跳出「有新版本」，玩家按下後清掉舊快取並重新載入（存檔在 localStorage，不受影響） */
(()=>{ const APP_VER='20261030052941'; window.__APP_VER=APP_VER; if(APP_VER.indexOf('APP_BUILD')>=0) return;
  const bar=document.createElement('div'); bar.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);z-index:90;display:none;align-items:center;gap:10px;padding:9px 14px;border-radius:999px;background:rgba(20,30,48,.92);border:1px solid rgba(255,214,120,.6);color:#ffe3a3;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.45);font-family:sans-serif';
  bar.innerHTML='<span>🔄 有新版本</span><button style="border:0;border-radius:999px;padding:6px 14px;background:#ffcf66;color:#3a2600;font-weight:700">立即更新</button><button style="border:0;background:none;color:#aab;font-size:16px">✕</button>';
  document.body.appendChild(bar); const [upB,noB]=bar.querySelectorAll('button'); let dismissed='';
  async function doUpdate(){ upB.textContent='更新中…'; upB.disabled=true;
    try{ if(window.__saveNow) window.__saveNow(); }catch(e){}
    try{ const r=await navigator.serviceWorker.getRegistration(); if(r) await r.update(); }catch(e){}
    location.reload(true); }
  upB.addEventListener('click',doUpdate); noB.addEventListener('click',()=>{ bar.style.display='none'; dismissed=bar.dataset.v||''; });
  /* 自動更新：發現新版，等玩家不在搏魚、挖掘、劇情中（閒置、在小屋、在泥灘走路）時自動存檔並重新載入；
     網址加上 v=新版本號，瀏覽器一定重新下載網頁本身（不會拿到 GitHub 快取 10 分鐘的舊網頁） */
  const safe=()=>{ const G=window.__G; if(!G) return true; return (G.state==='idle'||G.state==='home'||G.state==='tide')&&!document.querySelector('#digBox[style*="flex"]'); };
  let pend='';
  function autoGo(v){ const u=new URL(location.href); if(u.searchParams.get('v')===v){ bar.dataset.v=v; bar.style.display='flex'; return; }   // 已經用新網址載過還是舊版（極少見）：改顯示按鈕，不無限重整
    try{ if(window.__saveNow) window.__saveNow(); }catch(e){} try{ localStorage.setItem('swampAngler.updatedTo',v); }catch(e){}
    u.searchParams.set('v',v); location.replace(u.toString()); }
  function tryPend(){ if(pend&&safe()) autoGo(pend); }
  async function check(){ try{ const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'}); if(!r.ok) return; const j=await r.json();
      if(j.v&&j.v!==APP_VER&&j.v>APP_VER){ pend=j.v; tryPend(); } }catch(e){} }
  setTimeout(check,1500); setInterval(check,3*60*1000); setInterval(tryPend,4000);
  try{ const up=localStorage.getItem('swampAngler.updatedTo'); if(up&&up===APP_VER){ localStorage.removeItem('swampAngler.updatedTo'); setTimeout(()=>{ const t=document.createElement('div'); t.textContent='✅ 已自動更新到最新版本'; t.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);z-index:90;padding:8px 14px;border-radius:999px;background:rgba(10,30,20,.85);color:#bff5c8;font-size:14px'; document.body.appendChild(t); setTimeout(()=>t.remove(),3000); },2500); } }catch(e){} document.addEventListener('visibilitychange',()=>{ if(!document.hidden) check(); });
})();
  if('serviceWorker' in navigator) window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
  async function install(){ if(installed) return 'installed'; if(deferred){ deferred.prompt(); const r=await deferred.userChoice; deferred=null; return r.outcome; }
    return /iPhone|iPad/.test(navigator.userAgent)?'ios':'manual'; }
  return {install,canPrompt:()=>!!deferred,installed:()=>installed};
})();
/* ===== 結局演出系統：在真實的湖與海場景裡運鏡，電影黑邊、字幕、配樂、略過、片尾名單 ===== */
function createEnding(W,c){
'use strict';
const T=THREE;
let on=false, shots=[], si=0, st=0, cur=null, onDone=null, hidden=[], frameHook=null;
const camP=new T.Vector3(), camL=new T.Vector3(), tA=new T.Vector3(), tB=new T.Vector3(), mtx=new T.Matrix4(), q=new T.Quaternion();
// 畫面層：上下黑邊、字幕、全黑轉場、略過鈕、片尾名單
const css=document.createElement('style');
css.textContent=`#endFX{position:fixed;inset:0;z-index:40;pointer-events:none;font-family:'Noto Serif TC','Songti TC',serif;color:#f2ecdf}
#endFX.hidden{display:none}
#endFX .bar{position:absolute;left:0;right:0;height:12vh;background:#000;transition:transform 1.6s ease}
#endFX .bt{top:0;transform:translateY(-100%)}#endFX .bb{bottom:0;transform:translateY(100%)}
#endFX.in .bt,#endFX.in .bb{transform:none}
#endFX .blk{position:absolute;inset:0;background:#000;opacity:0;transition:opacity 1.2s ease}
#endFX .sub{position:absolute;left:8%;right:8%;bottom:calc(12vh + 18px);text-align:center;font-size:18px;line-height:1.75;text-shadow:0 2px 12px #000,0 0 3px #000;opacity:0;transition:opacity 1.1s ease;white-space:pre-line}
#endFX .sub.show{opacity:1}#endFX .sub.q{color:#ffe7b0}#endFX .sub.big{font-size:22px;letter-spacing:.08em}
#endFX .skip{position:absolute;right:14px;top:calc(12vh + 10px);pointer-events:auto;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.25);color:#ddd;border-radius:999px;padding:6px 14px;font-size:13px;font-family:sans-serif}
#endFX .roll{position:absolute;left:0;right:0;top:100%;text-align:center;line-height:2.1;font-size:16px;text-shadow:0 2px 10px #000}
#endFX .roll h2{font-size:30px;letter-spacing:.25em;margin:0 0 6px;color:#ffe3a3}#endFX .roll .r{opacity:.65;font-size:13px;letter-spacing:.2em;margin-top:26px}
#endFX .roll .n{font-size:18px}#endFX .roll .last{margin-top:60px;font-size:19px;color:#ffe7b0}
body.ending>*:not(#endFX):not(canvas):not(#toast){visibility:hidden!important}
#endFX>*{visibility:visible!important}`;
document.head.appendChild(css);
const fx=document.createElement('div'); fx.id='endFX'; fx.className='hidden';
fx.innerHTML='<div class="blk"></div><div class="bar bt"></div><div class="bar bb"></div><div class="sub"></div><div class="roll"></div><button class="skip">略過 ›</button>';
document.body.appendChild(fx);
const blk=fx.querySelector('.blk'), sub=fx.querySelector('.sub'), roll=fx.querySelector('.roll'), skipB=fx.querySelector('.skip');
let skipArm=0;
skipB.addEventListener('click',()=>{ if(!skipArm){ skipArm=performance.now(); skipB.textContent='再按一次略過'; return; } finish(true); });
// 配樂：兩首 CC0 鋼琴曲（Centurion_of_war〈Emotional Piano〉獨奏版與弦樂版），淡入淡出切換
const MUS={piano:new Audio('end_piano.mp3'),theme:new Audio('end_theme.mp3')}; Object.values(MUS).forEach(a=>{ a.preload='none'; a.volume=0; });
let musWant=null, musVol=.75;
function music(k,vol){ musWant=k; if(vol!=null) musVol=vol; const a=MUS[k]; if(a&&c.soundOn()){ if(a.paused){ a.currentTime=0; a.play().catch(()=>{}); } } }
function updMusic(dt){ for(const [k,a] of Object.entries(MUS)){ const tg=on&&k===musWant&&c.soundOn()?musVol:0; a.volume=Math.max(0,Math.min(1,a.volume+(tg-a.volume)*Math.min(1,dt*.8)));
  if(!on&&a.volume<.01&&!a.paused) a.pause(); if(on&&k===musWant&&a.ended){ a.currentTime=0; a.play().catch(()=>{}); } } }
// 字幕：一次顯示一段，淡入淡出
let subQ=[], subT=0;
function say(txt,cls,d){ subQ.push({txt,cls:cls||'',d:d||4.2}); }
function updSub(dt){ subT-=dt; if(subT>0) return; if(sub.classList.contains('show')){ sub.classList.remove('show'); subT=1.1; return; }
  const n=subQ.shift(); if(!n) return; sub.className='sub '+n.cls; sub.textContent=n.txt; void sub.offsetWidth; sub.classList.add('show'); subT=n.d; }
// 鏡頭：每個鏡位有起點與終點（位置、看向的點），用緩動曲線慢慢推移；也可以每格自訂
const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
// 演出時把第一人稱的釣竿、雙手、頭燈都藏起來（釣竿在場景裡跟著鏡頭，不在頭部底下，所以另外列）
function hideRig(h){ if(h){ hidden=[]; [...W.head.children,...((c.rig&&c.rig())||[])].forEach(o=>{ if(o&&o!==W.camera&&o.visible){ o.visible=false; hidden.push(o); } }); } else { hidden.forEach(o=>o.visible=true); hidden=[]; } }
function place(p,l){ W.player.position.copy(p); W.player.rotation.set(0,0,0); W.head.rotation.set(0,0,0); W.camera.rotation.set(0,0,0); W.camera.position.set(0,0,0);
  mtx.lookAt(p,l,W.camera.up); q.setFromRotationMatrix(mtx); W.player.quaternion.copy(q); }
function startShot(i){ si=i; st=0; cur=shots[i]; if(!cur){ finish(false); return; }
  if(cur.sea!=null) c.setSea(cur.sea); if(cur.hour!=null) c.setHour(cur.hour);
  if(cur.music) music(cur.music,cur.vol); cur.subI=0;
  if(cur.enter) try{ cur.enter(); }catch(e){ console.warn('ending enter',e); }
  blk.style.opacity=cur.fadeIn===false?blk.style.opacity:0; }
function tick(dt){ if(!on) return; st+=dt; const s=cur; if(!s) return; const k=ease(st/s.d);
  // 字幕依鏡頭時間觸發（畫面卡頓時字幕和畫面仍然對得上）
  const sl=s.subs||[]; while(s.subI<sl.length&&st>=sl[s.subI][0]){ const x=sl[s.subI++]; say(x[1],x[2],x[3]); { const mc=window.__merCtlE; if(mc&&/^霜汐/.test(x[1])){ mc.talk(Math.min(4,(x[3]||3)*.8)); if(/謝謝|喜歡|回來|很好|燈/.test(x[1])) mc.smile((x[3]||3)+1); if(/再見|保重|下次|走了/.test(x[1])) mc.wave(); } } }   /* 霜汐說話時嘴巴跟著動，溫暖的話會微笑、道別會揮手 */
  tA.fromArray(s.from[0]).lerp(tB.fromArray(s.to[0]),k); camP.copy(tA); camL.fromArray(s.from[1]).lerp(tB.fromArray(s.to[1]),k);
  if(frameHook) try{ frameHook(st,si); }catch(e){}
  let hold=false; if(s.tick) try{ hold=s.tick(st,k,camP,camL)==='hold'; }catch(e){ console.warn('ending tick',e); }
  if(hold) st=Math.min(st,s.d-1.4);
  place(camP,camL); if(s.hour!=null&&s.hourTo!=null) c.setHour(s.hour+(s.hourTo-s.hour)*k);
  if(s.fadeOut!==false&&st>s.d-1.3) blk.style.opacity=1;
  if(st>=s.d){ if(s.exit) try{ s.exit(); }catch(e){} startShot(si+1); } }
function frame(dt){ updMusic(dt); if(on){ updSub(dt); if(skipArm&&performance.now()-skipArm>3000){ skipArm=0; skipB.textContent='略過 ›'; } } }
function play(list,done){ if(on) return; shots=list; onDone=done; on=true; subQ=[]; subT=0; skipArm=0; skipB.textContent='略過 ›';
  document.body.classList.add('ending'); fx.classList.remove('hidden'); roll.style.transition='none'; roll.style.transform='none'; roll.innerHTML='';
  blk.style.transition='none'; blk.style.opacity=1; void blk.offsetWidth; blk.style.transition='opacity 1.2s ease'; hideRig(true); c.begin&&c.begin();
  setTimeout(()=>fx.classList.add('in'),50); startShot(0); }
function finish(skipped){ if(!on) return; on=false; const cb=onDone; onDone=null; shots.forEach(s=>{ if(s.cleanup) try{ s.cleanup(); }catch(e){} });
  fx.classList.remove('in'); sub.classList.remove('show'); blk.style.opacity=1; hideRig(false);
  setTimeout(()=>{ fx.classList.add('hidden'); document.body.classList.remove('ending'); blk.style.opacity=0; c.end&&c.end(); if(cb) cb(skipped); },1300); }
// 片尾名單：由下往上慢慢捲動
function credits(lines,dur){ roll.innerHTML=lines; roll.style.transition='none'; roll.style.transform='translateY(0)'; void roll.offsetWidth;
  const h=roll.offsetHeight+window.innerHeight; roll.style.transition=`transform ${dur}s linear`; roll.style.transform=`translateY(${-h}px)`; }
// 結局裡的片名、手記等畫面元素要放進演出層，才不會被「演出時隱藏其他介面」的規則一起藏掉
return {layer:()=>fx,setFrameHook:f=>{ frameHook=f; },play,tick,frame,on:()=>on,say,music,credits,fade:v=>{ blk.style.opacity=v; },finish};
}
const ENDING_CREDITS=`<h2>濕地垂釣</h2><div>Swamp Angler</div>
<div class="r">製作</div><div class="n">歐那</div>
<div class="r">故事</div><div class="n">老漁人的手記</div>
<div class="r">音樂</div><div class="n">Emotional Piano — Centurion_of_war（CC0）</div>
<div class="r">3D 模型與貼圖</div><div class="n">Poly Haven（CC0）</div><div class="n">ambientCG（CC0）</div><div class="r">手寫字體</div><div class="n">霞鶩文楷 LXGW WenKai（SIL OFL）</div><div class="n">NASA 月球影像（公有領域）</div>
<div class="r">音效</div><div class="n">OpenGameArt（CC0）</div>
<div class="r">特別感謝</div><div class="n">每一個在碼頭上等過魚的人</div>
<div class="last">謝謝你，陪老漁人走完這一段。</div>`;
/* ===== 角色自動綁骨：AI 生成的角色模型本身沒有骨架，載入時依身高比例自動建立脊椎鏈（尾巴、臀、腰、胸、頸、頭），
   每個頂點依高度平滑分配權重，轉成 SkinnedMesh。人魚與滄淵多一條往下的尾巴鏈；人形多一節裙擺 ===== */
function autoRig(root,kind){ const T=THREE; root.updateMatrixWorld(true);
  const UP=kind==='tail'?[['hips',.5],['waist',.6],['chest',.7],['neck',.82],['head',.88]]:[['hips',.5],['waist',.6],['chest',.7],['neck',.83],['head',.89]];
  const DOWN=kind==='tail'?[['t1',.38],['t2',.26],['t3',.15],['t4',.06]]:[['skirt',.3],['hem',.12]];
  const rig={bones:{},meshes:[]}; const meshes=[]; root.traverse(m=>{ if(m.isMesh&&!m.isSkinnedMesh) meshes.push(m); });
  // 全身高度範圍（在 root 座標裡量）
  const inv=new T.Matrix4().copy(root.matrixWorld).invert(), box=new T.Box3();
  meshes.forEach(m=>{ const g=m.geometry.clone(); g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,m.matrixWorld)); g.computeBoundingBox(); box.union(g.boundingBox); });
  const y0=box.min.y, H=box.max.y-box.min.y, cx=(box.min.x+box.max.x)/2, cz=(box.min.z+box.max.z)/2;
  meshes.forEach(m=>{ const parent=m.parent; const g=m.geometry.clone(); g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,m.matrixWorld));
    // 骨頭：臀部為根，往上一條、往下一條；位置都是相對父骨的差
    const mk=(arr,parentB,ph)=>{ let pb=parentB, py=ph; return arr.map(([n,f])=>{ const b=new T.Bone(); b.name=n; b.position.set(0,(y0+f*H)-py,0); pb.add(b); pb=b; py=y0+f*H; return {n,b,y:y0+f*H}; }); };
    const hips=new T.Bone(); hips.name='hips'; hips.position.set(cx,y0+UP[0][1]*H,cz);
    const up=[{n:'hips',b:hips,y:y0+UP[0][1]*H},...mk(UP.slice(1),hips,y0+UP[0][1]*H)], dn=mk(DOWN,hips,y0+UP[0][1]*H);
    const all=[...up,...dn], idx=new Map(all.map((q,i)=>[q.b,i]));
    const P=g.attributes.position, n=P.count, si=new Uint16Array(n*4), sw=new Float32Array(n*4), band=.035*H;
    for(let i=0;i<n;i++){ const y=P.getY(i); let a,b2,w;
      if(y>=up[0].y){ let k=0; while(k<up.length-1&&y>=up[k+1].y) k++; a=up[k]; const nx=up[k+1]; const d=y-a.y; // 接近關節時與父骨混合
        if(k>0&&d<band){ b2=up[k-1]; w=.5+.5*d/band; } else { b2=a; w=1; } }
      else {
        // 往下的鏈：頂點跟著它上方最近的那根骨頭轉
        let j=-1; for(let q=0;q<dn.length;q++) if(y<dn[q].y) j=q; a=j<0?up[0]:dn[j]; const pa=j<=0?up[0]:dn[j-1]; const d=pa.y-y; if(j>=0&&d<band){ b2=pa; w=.5+.5*d/band; } else { b2=a; w=1; } }
      si[i*4]=idx.get(a.b); si[i*4+1]=idx.get(b2.b); sw[i*4]=w; sw[i*4+1]=1-w; }
    g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4)); g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
    const mats=(Array.isArray(m.material)?m.material:[m.material]).map(x=>{ x.skinning=true; x.needsUpdate=true; return x; });   // 沿用原本的材質（呼叫端可能留著材質參照來調透明度）
    const sm=new T.SkinnedMesh(g,mats.length>1?mats:mats[0]); sm.frustumCulled=false; sm.add(hips); root.add(sm); sm.updateMatrixWorld(true); sm.bind(new T.Skeleton(all.map(q=>q.b)));
    if(parent) parent.remove(m); all.forEach(q=>{ (rig.bones[q.n]=rig.bones[q.n]||[]).push(q.b); }); rig.meshes.push(sm); });
  // 動作：呼吸、轉頭、點頭、尾巴擺動、裙擺飄動；每格呼叫 rig.pose({...})
  const R=(n,x,y,z)=>(rig.bones[n]||[]).forEach(b=>b.rotation.set(x||0,y||0,z||0));
  rig.pose=o=>{ const t=o.t||0, br=Math.sin(t*1.6)*(o.breathe==null?.012:o.breathe);
    R('chest',br+(o.arch||0)*.5,0,0); R('waist',(o.bow||0)*.5+(o.arch||0)*.5,(o.headYaw||0)*.15,0); R('neck',(o.headPitch||0)*.4,(o.headYaw||0)*.35,(o.headRoll||0)*.5); R('head',(o.headPitch||0)*.6,(o.headYaw||0)*.5,(o.headRoll||0)*.5);
    R('hips',0,0,(o.sway||0)*Math.sin(t*1.1)*.03);
    const ta=o.tail==null?.12:o.tail, tf=o.tailF||1.6; ['t1','t2','t3','t4'].forEach((n,i)=>{ const a2=Math.sin(t*tf-i*.7)*ta*(.4+.3*i)+(o.tailBend||0)*(.5+.25*i); if(o.tailX) R(n,a2,0,0); else R(n,0,0,a2); });
    const sk=o.skirt==null?.02:o.skirt; R('skirt',Math.sin(t*.9)*sk,0,Math.sin(t*1.3)*sk*.6); R('hem',Math.sin(t*1.2+1)*sk*1.4,0,Math.sin(t*1.5)*sk); };
  return rig; }
/* ===== 結局共用：月潮水光貼圖、碼頭盡頭的紀念（舊搖椅＋竹竿），結局動畫與結局後的湖都用同一份 ===== */
function makeTideTex(){ const T=THREE, cv=document.createElement('canvas'); cv.width=cv.height=256; const g=cv.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,256,256);
  for(let i=0;i<220;i++){ const x=Math.random()*256, y=Math.random()*256, r=8+Math.random()*26, rg=g.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,`rgba(200,222,255,${.05+Math.random()*.09})`); rg.addColorStop(1,'rgba(200,222,255,0)'); g.fillStyle=rg; g.fillRect(x-r,y-r,r*2,r*2); }
  for(let i=0;i<700;i++){ const r=.6+Math.random()*1.4; g.fillStyle=`rgba(240,246,255,${.3+Math.random()*.7})`; g.beginPath(); g.arc(Math.random()*256,Math.random()*256,r,0,7); g.fill(); }
  const t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; return t; }
// 碼頭木板高 0.8 公尺、湖那一端在 z=-3.2；椅子面向湖
function makeMemorial(load){ const T=THREE, g=new T.Group();
  const chair=new T.Group(); load('models/home/Rockingchair_01.glb',m=>{ const o=m.scene.clone(true); o.traverse(x=>{ x.frustumCulled=false; }); chair.add(o); });
  chair.position.set(.42,.72,-2.55); chair.rotation.y=Math.PI; g.add(chair);
  const poleM=new T.MeshStandardMaterial({color:0xb8975a,roughness:.55}), pole=new T.Group();
  { const m=new T.Mesh(new T.CylinderGeometry(.009,.02,3.2,10),poleM); m.position.y=1.6; pole.add(m);
    for(let i=1;i<9;i++){ const r=new T.Mesh(new T.TorusGeometry(.02-.0011*i,.004,6,14),poleM); r.rotation.x=Math.PI/2; r.position.y=i*.36; pole.add(r); } }
  pole.position.set(.82,.83,-2.45); pole.rotation.set(-.32,0,.12); g.add(pole);
  return {g,chair,pole}; }
/* ===== 結局之後的湖：碼頭盡頭常駐老漁人的椅子、竹竿與月光色的燈；滿月前後的夜晚，湖面亮起月潮 ===== */
function createEndingWorld(W,c){
  const T=THREE, S=W.scene, GL=new T.GLTFLoader(), load=(u,f)=>GL.load(u,f,undefined,()=>console.warn('afterglow model',u));
  let built=false, mem=null, lamp=null, lampL=null, tide=null, tideM=null, t=0;
  // 平常釣魚時椅子往碼頭右側挪一點，不要擋在正前方的拋竿視線上
  function build(){ built=true; mem=makeMemorial(load); mem.g.position.x=.45; S.add(mem.g);
    lamp=new T.Group(); lampL=new T.PointLight(0xcfe0ff,1.6,7,1.6); lampL.position.y=.22; lamp.add(lampL); lamp.position.set(-.05,.86,-2.75); mem.g.add(lamp);
    load('models/lantern.glb',g=>{ const o=g.scene.clone(true); o.scale.setScalar(.26); o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ m.material=mt.clone(); m.material.emissive=new T.Color(0xcfe0ff); m.material.emissiveMap=mt.map; m.material.emissiveIntensity=.5; } } }); lamp.add(o); });
    tideM=new T.MeshBasicMaterial({map:makeTideTex(),transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,color:0xcfe0ff,fog:false}); tideM.map.repeat.set(7,7);
    tide=new T.Mesh(new T.PlaneGeometry(80,80).rotateX(-Math.PI/2),tideM); tide.position.set(-8,.27,-28); tide.renderOrder=3; S.add(tide); }
  function update(dt){ const done=c.done(); if(!done&&!built) return; if(!built) build(); t+=dt;
    const show=done&&c.lake()&&!c.ending(); mem.g.visible=show;
    const h=((c.hour()%24)+24)%24, night=h>=19.8||h<4.8, moon=window.__MOONPH?window.__MOONPH.illum():0;
    lampL.intensity=show?(night?1.8:.6)*(1+.08*Math.sin(t*5)):0;
    const want=show&&night&&moon>.85?.55:0; tideM.opacity+=(want-tideM.opacity)*Math.min(1,dt*.5); tide.visible=tideM.opacity>.01; if(tide.visible) tideM.map.offset.set(t*.004,-t*.006); }
  return {update};
}
/* ===== 結局分鏡（依劇本 src/ENDING.md 分段製作；已完成：演出系統、片尾名單、序幕、第一幕、第二幕、第三幕、第四幕） ===== */
function endingShots(E,c){
  const T=THREE, W=c.W, S=W.scene, GL=new T.GLTFLoader(), cache={}, made=[];
  // 角色骨架：每格依各角色的姿勢參數擺動（呼吸、轉頭、點頭、尾巴、裙擺）
  const rigs=[], RP={mer:{},heng:{},ghost:{},king:{},old:{}}; let rt=0; E.setFrameHook(()=>{ rt+=1/60; rigs.forEach(r=>r.rig.pose(Object.assign({t:rt},RP[r.k]))); });
  let pending=0; const load=(u,f)=>{ if(cache[u]) return f(cache[u]); pending++; GL.load(u,g=>{ cache[u]=g; pending--; f(g); },undefined,()=>{ pending--; console.warn('ending model',u); }); };
  const keep=o=>{ S.add(o); made.push(o); return o; };
  const drop=()=>{ made.splice(0).forEach(o=>{ S.remove(o); o.traverse&&o.traverse(m=>{ if(m.material&&m.material.map&&m.material.map.isCanvasTexture) m.material.map.dispose(); }); }); };
  const sw=(x,z,t)=>W.swell?W.swell(x,z,t):0;
  let T0=0; const now=()=>performance.now()/1000-T0;
  // 老漁人的提燈：掛在漁船船頭，暖黃色的燈火（之後幾幕也會用到）
  const lampG=new T.Group(), lampL=new T.PointLight(0xffb866,0,9,1.6); lampG.add(lampL);
  load('models/lantern.glb',g=>{ const o=T.SkeletonUtils?T.SkeletonUtils.clone(g.scene):g.scene.clone(true); o.scale.setScalar(.26); o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ m.material=mt.clone(); m.material.emissive=new T.Color(0xffc070); m.material.emissiveMap=mt.map; m.material.emissiveIntensity=.5; } } }); lampG.add(o); });
  // 滄淵：深淵之王的模型（約 9 公尺高），面向漁船
  const king=new T.Group(); // 滄淵模型有骨架（SkinnedMesh），要用 SkeletonUtils 複製，骨頭才會跟著搬到新位置
  load('models/seaking.glb',g=>{ const o=T.SkeletonUtils?T.SkeletonUtils.clone(g.scene):g.scene; o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; if(m.material){ m.material=m.material.clone(); m.material.emissive=new T.Color(0x000000); m.material.color.setScalar(.82); } } }); o.scale.setScalar(5); king.add(o); king.updateMatrixWorld(true); rigs.push({k:'king',rig:autoRig(o,'tail')}); });
  const kingEye=new T.PointLight(0x9fe8ff,0,14,2); kingEye.position.set(0,4.2,1.2); king.add(kingEye);
  // 月光海路：從月亮正下方一路鋪到船邊的碎銀光，隨浪閃爍
  const glitTex=(()=>{ const cv=document.createElement('canvas'); cv.width=256; cv.height=512; const g=cv.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,256,512);
    for(let i=0;i<2600;i++){ const y=Math.random()*512, w=(1-y/512)*.7+.3, x=128+(Math.random()-.5)*256*Math.pow(Math.random(),.6)*w; g.fillStyle=`rgba(230,240,255,${.25+Math.random()*.75})`; g.fillRect(x,y,1+Math.random()*3*w,1); }
    const fade=g.createLinearGradient(0,0,256,0); fade.addColorStop(0,'rgba(0,0,0,1)'); fade.addColorStop(.25,'rgba(0,0,0,0)'); fade.addColorStop(.75,'rgba(0,0,0,0)'); fade.addColorStop(1,'rgba(0,0,0,1)'); g.globalCompositeOperation='destination-out'; g.fillStyle=fade; g.fillRect(0,0,256,512);
    const t=new T.CanvasTexture(cv); t.wrapT=T.RepeatWrapping; return t; })();
  const glitM=new T.MeshBasicMaterial({map:glitTex,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,color:0xdfe8ff,fog:false});
  const glit=new T.Mesh(new T.PlaneGeometry(26,420).rotateX(-Math.PI/2).translate(0,0,-210),glitM); glit.renderOrder=3;
  const md=new T.Vector3();
  // 堤防：河口窄灣（湖的正南方約 100 公尺）橫著一道老石堤，三座鐵閘門；石材是真實的城堡石牆貼圖
  const DY={x:12,z:-99,len:34,h:3.2,th:3}, dyke=new T.Group(), chunks=[], cracks=[];
  { const TL=new T.TextureLoader(), mk=f=>{ const x=TL.load('models/home/castle_brick_07_'+f+'.jpg'); x.wrapS=x.wrapT=T.RepeatWrapping; x.repeat.set(2.2,1); x.anisotropy=4; return x; };
    const d=mk('Diffuse'); d.encoding=T.sRGBEncoding; const stoneM=new T.MeshStandardMaterial({map:d,normalMap:mk('nor_gl'),roughnessMap:mk('Rough'),color:0x9a9284,roughness:1,emissive:0x8090b0,emissiveMap:d,emissiveIntensity:.35});   // 夜裡讓石面帶一點月光的冷色，才看得出石材
    const ironM=new T.MeshStandardMaterial({color:0x2a2622,roughness:.55,metalness:.75});
    const n=8, seg=DY.len/n;
    for(let i=0;i<n;i++){ const b=new T.Mesh(new T.BoxGeometry(seg-.04,DY.h+1.2,DY.th),stoneM); b.position.set(-DY.len/2+seg*(i+.5),(DY.h+1.2)/2-1.2,0); dyke.add(b); chunks.push({o:b,mid:i===3||i===4,v:new T.Vector3(),w:new T.Vector3(),p0:b.position.clone()}); }
    for(const gx of [-10,0,10]){ const gt=new T.Mesh(new T.BoxGeometry(2.6,2.2,.18),ironM); gt.position.set(gx,1.2,DY.th/2+.1); dyke.add(gt); chunks.push({o:gt,mid:gx===0,v:new T.Vector3(),w:new T.Vector3(),p0:gt.position.clone()}); }
    const cap=new T.Mesh(new T.BoxGeometry(DY.len+.6,.35,DY.th+.5),stoneM); cap.position.y=DY.h+.18; dyke.add(cap); chunks.push({o:cap,mid:false,split:true,v:new T.Vector3(),w:new T.Vector3(),p0:cap.position.clone()});
    // 裂縫：堤面上透出銀色月光的細線，慢慢往外長
    const crM=new T.MeshBasicMaterial({color:0xcfe6ff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,fog:false});
    for(let i=0;i<14;i++){ let x=(Math.random()-.5)*12, y=Math.random()*DY.h; const pts=[]; for(let k=0;k<6;k++){ pts.push(new T.Vector3(x,y,DY.th/2+.03)); x+=(Math.random()-.5)*1.4; y+=(Math.random()-.4)*.9; }
      const l=new T.Line(new T.BufferGeometry().setFromPoints(pts),crM); dyke.add(l); cracks.push(l); }
    cracks.mat=crM;
    const dir=Math.atan2(DY.x,-DY.z); dyke.position.set(DY.x,0,DY.z); dyke.rotation.y=-dir; }
  // 銀色潮水：從堤防缺口灌進來、往碼頭推進的發光水流
  const floodTex=(()=>{ const cv=document.createElement('canvas'); cv.width=128; cv.height=256; const g=cv.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,128,256);
    // 柔和的月光水紋（模糊的橢圓光斑）＋細碎的閃光
    for(let i=0;i<160;i++){ const x=Math.random()*128, y=Math.random()*256, r=6+Math.random()*16, rg=g.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,`rgba(190,215,255,${.06+Math.random()*.1})`); rg.addColorStop(1,'rgba(190,215,255,0)'); g.fillStyle=rg; g.save(); g.translate(x,y); g.scale(1,2.2); g.translate(-x,-y); g.fillRect(x-r,y-r,r*2,r*2); g.restore(); }
    for(let i=0;i<420;i++){ g.fillStyle=`rgba(235,242,255,${.3+Math.random()*.6})`; g.fillRect(Math.random()*128,Math.random()*256,1+Math.random()*1.5,1); }
    const e=g.createLinearGradient(0,0,128,0); e.addColorStop(0,'rgba(0,0,0,1)'); e.addColorStop(.35,'rgba(0,0,0,0)'); e.addColorStop(.65,'rgba(0,0,0,0)'); e.addColorStop(1,'rgba(0,0,0,1)'); g.globalCompositeOperation='destination-out'; g.fillStyle=e; g.fillRect(0,0,128,256);
    const t=new T.CanvasTexture(cv); t.wrapT=T.RepeatWrapping; return t; })();
  // 月潮水光：只用柔和的光斑與零星亮點，不畫成一條條直線（避免看起來像下雨）
  const tideTex=makeTideTex();
  const floodM=new T.MeshBasicMaterial({map:tideTex,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,color:0xd8e8ff,fog:false});
  const flood=new T.Mesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),floodM); flood.renderOrder=3;
  const fromD=new T.Vector3(DY.x,0,DY.z).multiplyScalar(.97), toD=new T.Vector3(0,0,-6);
  function setFlood(k,t){ const head=fromD.clone().lerp(toD,k), mid=fromD.clone().add(head).multiplyScalar(.5), len=fromD.distanceTo(head)+.01;
    flood.position.set(mid.x,.28,mid.z); flood.rotation.y=-Math.atan2(head.x-fromD.x,-(head.z-fromD.z)); flood.scale.set(8+6*k,1,len); floodM.map.repeat.set(1.2,len/10); floodM.map.offset.y=-t*.18; floodM.map.offset.x=Math.sin(t*.3)*.05;
    return head; }
  const spl=(x,z,n,s)=>{ if(c.P&&c.P.splash) c.P.splash(x,0,z,n,s); };
  const sc={};
  // 結局專用月光：冷藍色的平行光，讓夜景裡的石堤、滄淵、船看得清楚
  const moonL=keep(new T.DirectionalLight(0xa9bfe8,2.3)), fillL=keep(new T.HemisphereLight(0x6a7ca0,0x141820,.9)); moonL.position.set(-60,45,-20); moonL.target.position.set(0,0,-30); keep(moonL.target);
  // 湖面的月潮：一大片柔和水光，慢慢漂移
  const lakeM=new T.MeshBasicMaterial({map:tideTex,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,color:0xcfe0ff,fog:false});
  lakeM.map=tideTex.clone(); lakeM.map.needsUpdate=true; lakeM.map.repeat.set(6,6);
  const lake=new T.Mesh(new T.PlaneGeometry(70,70).rotateX(-Math.PI/2),lakeM); lake.position.set(-8,.27,-24); lake.renderOrder=3;
  // 螢火蟲：岸邊與浮萍間一閃一閃、慢慢飄
  const FN=160, ffP=new Float32Array(FN*3), ffB=[]; for(let i=0;i<FN;i++){ const a=Math.random()*6.283, r=10+Math.random()*26; ffB.push([-10+Math.cos(a)*r,.6+Math.random()*2.2,-22+Math.sin(a)*r*.8,Math.random()*6]); }
  const ffG=new T.BufferGeometry(); ffG.setAttribute('position',new T.BufferAttribute(ffP,3));
  const ffTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), rg=g.createRadialGradient(16,16,0,16,16,16); rg.addColorStop(0,'rgba(255,255,210,1)'); rg.addColorStop(.3,'rgba(220,255,150,.6)'); rg.addColorStop(1,'rgba(200,255,120,0)'); g.fillStyle=rg; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
  const ffM=new T.PointsMaterial({map:ffTex,size:.22,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,color:0xe8ffb0,fog:false}), ff=new T.Points(ffG,ffM); ff.frustumCulled=false;
  function ffTick(t){ for(let i=0;i<FN;i++){ const b=ffB[i]; ffP[i*3]=b[0]+Math.sin(t*.3+b[3])*.8; ffP[i*3+1]=b[1]+Math.sin(t*.7+b[3]*2)*.25*(Math.sin(t*2.3+b[3])>.2?1:.2); ffP[i*3+2]=b[2]+Math.cos(t*.25+b[3])*.8; } ffG.attributes.position.needsUpdate=true; }
  // 魚群躍出水面：用遊戲裡的真實魚模型，拋物線跳起、落水濺起水花
  const JF=['models/bluegill.glb','models/lmbass.glb','models/koi.glb','models/crappie.glb'], jumps=[];
  JF.forEach(u=>load(u,()=>{}));
  function jump(x,z){ const u=JF[Math.floor(Math.random()*JF.length)], g=cache[u]; if(!g) return; const o=g.scene.clone(true); o.traverse(m=>{ m.frustumCulled=false; });
    const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()); o.scale.setScalar(.45/Math.max(sz.x,sz.y,sz.z)); const w=new T.Group(); w.add(o); keep(w);
    const dir=Math.random()*6.283; jumps.push({w,x,z,dx:Math.cos(dir),dz:Math.sin(dir),t:0,h:.8+Math.random()*.7}); spl(x,z,8,1); W.addRipple&&W.addRipple(x,z,2); }
  function updJumps(dt){ for(let i=jumps.length-1;i>=0;i--){ const j=jumps[i]; j.t+=dt; const u=j.t/1.1;
    j.w.position.set(j.x+j.dx*u*1.6,.2+j.h*4*u*(1-u),j.z+j.dz*u*1.6); j.w.rotation.set(0,-Math.atan2(j.dz,j.dx),(.5-u)*2.2);
    if(u>=1){ spl(j.w.position.x,j.w.position.z,10,1.1); W.addRipple&&W.addRipple(j.w.position.x,j.w.position.z,2.5); S.remove(j.w); jumps.splice(i,1); } } }
  // 林秋月（生前的模樣）與她提的燈；只有完成隱藏章節「湖裡還有人等燈」的玩家才會看到她
  const met=!!(c.save&&c.save.story&&c.save.story.done&&c.save.story.done.indexOf('lantern')>=0);
  // 林秋月：鬼魂模樣（ghost.glb，白衣長髮）與生前模樣（girl.glb，十歲小女孩）兩個模型疊在同一處，用透明度交錯，月光照到她時慢慢變回生前的樣子
  const heng=new T.Group(), hGhost=new T.Group(), hAlive=new T.Group(); heng.add(hGhost); heng.add(hAlive);
  const setOp=(o,a)=>o.traverse(m=>{ if(m.isMesh&&m.material){ m.material.transparent=true; m.material.opacity=a; m.visible=a>.01; } });
  function loadHuman(url,dst,glow,key,hgt){ load(url,g=>{ const o=g.scene.clone(true); o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt){ m.material=mt.clone(); if(mt.map){ m.material.emissive=new T.Color(glow); m.material.emissiveMap=mt.map; m.material.emissiveIntensity=.55; } } } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()); o.scale.setScalar((hgt||1.62)/Math.max(sz.y,1e-6)); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y,-c2.z); dst.add(o); dst.updateMatrixWorld(true); rigs.push({k:key||(dst===hGhost?'ghost':'heng'),rig:autoRig(o,'human')}); }); }
  loadHuman('models/ghost.glb',hGhost,0xb8c8d8); loadHuman('models/girl.glb',hAlive,0xf0e8dc,'heng',1.35);   // 生前的林秋月：十歲的小女孩
  // 老漁人（使用者提供設定圖生成）：只在最後的晨光裡出現
  const oldG=new T.Group(); loadHuman('models/oldman.glb',oldG,0xfff0d8,'old');
  // 林秋月的舊髮簪：天亮時留在老漁人的椅子上
  const pin=new T.Group(); load('item_hairpin.glb',g=>{ const o=g.scene.clone(true); o.traverse(m=>{ m.frustumCulled=false; }); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()); o.scale.setScalar(.2/Math.max(sz.x,sz.y,sz.z,1e-6)); pin.add(o); });
  const hengLook=(x,z)=>Math.atan2(x-heng.position.x,z-heng.position.z);
  const lamp2=new T.Group(), lamp2L=new T.PointLight(0xffb866,0,8,1.6); lamp2.add(lamp2L);
  load('models/lantern.glb',g=>{ const o=g.scene.clone(true); o.scale.setScalar(.24); o.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map){ m.material=mt.clone(); m.material.emissive=new T.Color(0xffc070); m.material.emissiveMap=mt.map; m.material.emissiveIntensity=.5; } } }); lamp2.add(o); });
  // 第三幕：月光灣的岩石與霜汐（玩家設定圖生成的 3D 模型），夜裡用自己的貼圖微微發光
  const BAY=new T.Vector3(-12,0,-44), merG=new T.Group(), merW=new T.Group(); merG.add(merW); merG.position.copy(BAY);
  // 只取石組裡的一顆石頭，半露出水面放在她身後，不要整組散在鏡頭前
  load('rock_moss_set_01.glb',g=>{ const src=g.scene.getObjectByName('rock_moss_set_01_rock02'); if(!src) return; const r=src.clone(true); r.position.set(0,0,0); r.updateMatrixWorld(true);
    const bb=new T.Box3().setFromObject(r), cc=bb.getCenter(new T.Vector3()); const w=new T.Group(); r.position.set(-cc.x,-.75,-cc.z); w.add(r); w.scale.setScalar(.75); w.position.set(-.55,0,-.65); r.traverse(m=>{ m.frustumCulled=false; }); merG.add(w); });
  load('models/mermaid_v2.glb',g=>{ const o=g.scene.clone(true); o.traverse(x=>{ if(x.isMesh){ const mp=x.material&&x.material.map; x.frustumCulled=false;
      x.material=new T.MeshStandardMaterial({map:mp||null,roughness:.55,metalness:.05,emissive:new T.Color(0xffffff),emissiveMap:mp||null,emissiveIntensity:.32}); } });
    o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()); o.scale.setScalar(1.9/Math.max(sz.y,1e-6)); o.updateMatrixWorld(true);
    const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-.38-b2.min.y,-c2.z); merW.add(o); merW.updateMatrixWorld(true);
    if(window.__MER){ const ctl=window.__MER.rig(o); window.__merCtlE=ctl; rigs.push({k:'mer',rig:{pose:p=>{ ctl.swim(Math.min(.9,(p.tail||.1)*2.4)); ctl.head(p.headYaw||0,p.headPitch||0); }}}); }   // 結局的霜汐：完整骨架與表情
    else rigs.push({k:'mer',rig:autoRig(o,'tail')}); });   // 尾巴沒在淺水裡，像從水裡探出半身
  const merL=new T.PointLight(0xcfe0ff,0,7,1.5); merL.position.set(.8,2.2,1.4); merG.add(merL);
  // 最亮的那片月鱗：從霜汐手上飄進提燈，燈火由暖黃變成月光色
  const scaleTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=64; const g=cv.getContext('2d'), rg=g.createRadialGradient(32,32,0,32,32,32); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(.25,'rgba(210,230,255,.85)'); rg.addColorStop(1,'rgba(160,200,255,0)'); g.fillStyle=rg; g.fillRect(0,0,64,64); return new T.CanvasTexture(cv); })();
  const moonScale=new T.Sprite(new T.SpriteMaterial({map:scaleTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false})); moonScale.scale.set(.32,.32,1);
  const silverC=new T.Color(0xcfe0ff), warmC=new T.Color(0xffb866);
  // 霜汐游走時留下的銀光尾跡
  const trail=[]; function trailDot(x,y,z){ const sp=new T.Sprite(new T.SpriteMaterial({map:scaleTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false,opacity:.9})); sp.scale.set(.5,.5,1); sp.position.set(x,y,z); keep(sp); trail.push({sp,t:0}); }
  function updTrail(dt){ for(let i=trail.length-1;i>=0;i--){ const d=trail[i]; d.t+=dt; d.sp.material.opacity=Math.max(0,.9-d.t/3); d.sp.position.y+=dt*.08; if(d.t>3){ S.remove(d.sp); trail.splice(i,1); } } }
  const merFace=()=>Math.atan2(CAMB.x-BAY.x,CAMB.z-BAY.z), CAMB=new T.Vector3(-10,1.45,-37.2);
  // 第四幕：碼頭盡頭（碼頭木板高 0.8 公尺、湖那一端在 z=-3.2）老漁人的舊椅子（Poly Haven WoodenChair_01）與靠在椅邊的竹竿
  // 老漁人的椅子：和小屋裡同款的舊搖椅（Poly Haven Rockingchair_01），面向湖
  const memo=makeMemorial(load), chair=memo.chair, pole=memo.pole;
  // 手記：真實紙張貼圖（ambientCG Paper001，CC0），老漁人的字一個字一個字浮現；最後一行是你自己的字
  const fl=document.createElement('link'); fl.rel='stylesheet'; fl.href='https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&display=swap';
  const LETTER=['孩子：','如果你讀到這一頁，代表月潮回來了。','我這輩子沒能把秋月帶回家，','所以想讓另一個孩子回家。','秋月，那天是妳的生日。我答應過要早點回家。','這件事我做了四十年，最後還是交給了你。','對不起，也謝謝你。','湖就交給你了。記得——','湖會告訴你很多事，只要你願意等。'];
  const MINE='月潮回來了。換我守著這片湖。';
  const page=document.createElement('div');
  page.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-52%) rotate(-1.2deg);width:min(330px,84vw);padding:30px 26px 26px;z-index:41;pointer-events:none;opacity:0;transition:opacity 1.4s ease;"+
    "background:linear-gradient(rgba(214,180,120,.42),rgba(150,110,60,.32)),url(end_paper.jpg) center/cover;min-height:58vh;box-sizing:border-box;box-shadow:0 18px 50px rgba(0,0,0,.65),inset 0 0 60px rgba(90,60,20,.45);border-radius:3px;"+
    "font-family:'LXGW WenKai TC','Kaiti TC','STKaiti','BiauKai',serif;color:#2c1e0e;font-size:18px;line-height:2.05;letter-spacing:.04em";
  const pageTxt=document.createElement('div'), pageMine=document.createElement('div'); pageMine.style.cssText='margin-top:14px;color:#1d3150;font-size:19px;border-top:1px dashed rgba(60,40,20,.35);padding-top:10px';
  page.appendChild(pageTxt); page.appendChild(pageMine);
  const FULL=LETTER.join('\n'); let pn=0, pm=0;
  function writePage(dt){ if(pn<FULL.length){ pn=Math.min(FULL.length,pn+dt*7.5); } else if(pm<MINE.length){ pm=Math.min(MINE.length,pm+dt*5); }
    const a=FULL.slice(0,Math.floor(pn)); pageTxt.innerHTML=a.replace(/\n/g,'<br>')+(pn<FULL.length?'<span style="opacity:.35">▍</span>':'');
    pageMine.textContent=pn>=FULL.length?MINE.slice(0,Math.floor(pm)):''; pageMine.style.display=pn>=FULL.length?'block':'none'; return pn>=FULL.length&&pm>=MINE.length; }
  // 回憶：三十年前的颱風夜。畫面褪色、暴雨、閃電；浮萍灣的小木棧橋、林秋月划出去的小船
  const fbCan=W.renderer.domElement, fbFilter=on=>{ fbCan.style.filter=on?'grayscale(.65) sepia(.3) contrast(1.08) brightness(.82)':''; };
  const flash=document.createElement('div'); flash.style.cssText='position:absolute;inset:0;background:#dfe8ff;opacity:0;pointer-events:none;transition:opacity .08s';
  const RN=1100, rainP=new Float32Array(RN*6), rainG=new T.BufferGeometry(); rainG.setAttribute('position',new T.BufferAttribute(rainP,3));
  const rainS=[]; for(let i=0;i<RN;i++) rainS.push([(Math.random()-.5)*24,Math.random()*14,(Math.random()-.5)*24]);
  const rain=new T.LineSegments(rainG,new T.LineBasicMaterial({color:0xaab4c0,transparent:true,opacity:.55,fog:false})); rain.frustumCulled=false;
  function rainTick(P,dt){ for(let i=0;i<RN;i++){ const r=rainS[i]; r[1]-=dt*16; r[0]+=dt*2.5; if(r[1]<-1){ r[1]=13; r[0]=(Math.random()-.5)*24; r[2]=(Math.random()-.5)*24; }
      const x=P.x+r[0], y=r[1], z=P.z+r[2]; rainP.set([x,y,z,x-.06,y+.55,z],i*6); } rainG.attributes.position.needsUpdate=true; if(Math.random()<.04) W.addRipple&&W.addRipple(P.x+(Math.random()-.5)*10,P.z-3-Math.random()*8,1); }
  const pier=new T.Group(); { const wm=new T.MeshStandardMaterial({color:0x4a3a2a,roughness:.9});
    for(let i=0;i<9;i++){ const b=new T.Mesh(new T.BoxGeometry(1.3,.05,.22),wm); b.position.set(0,.55,-i*.25); b.rotation.y=(Math.random()-.5)*.04; pier.add(b); }
    for(const x of [-.6,.6]) for(const z of [0,-1.9]){ const p2=new T.Mesh(new T.CylinderGeometry(.06,.07,1.4,8),wm); p2.position.set(x,.1,z); pier.add(p2); } }
  pier.position.set(-5.4,0,-12.4);
  const boat=new T.Group(); load('models/canoe.glb',g=>{ const o=g.scene.clone(true); o.traverse(m=>{ m.frustumCulled=false; }); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3());
    const L=Math.max(sz.x,sz.z); o.scale.setScalar(2.8/L); if(sz.x>sz.z) o.rotation.y=Math.PI/2; const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,-b2.min.y-.12,-c2.z); boat.add(o); });
  const title=document.createElement('div'); title.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:41;pointer-events:none;color:#f2ecdf;font-family:serif;opacity:0;transition:opacity 1.6s ease';
  title.innerHTML='<div style="font-size:13px;letter-spacing:.6em;opacity:.7">終章之後</div><div style="font-size:34px;letter-spacing:.5em;margin-top:14px;color:#ffe3a3">月潮</div>';
  return [
    // 開場：黑底片名〈月潮〉；同時等模型載完（最多 12 秒），避免主角還沒出現就開演
    {d:6,hour:20.4,sea:true,music:'piano',vol:.7,fadeOut:true,from:[[3.2,1.5,-3.5],[0,3.2,-28]],to:[[3.2,1.5,-3.5],[0,3.2,-28]],
      enter:()=>{ E.layer().appendChild(title); E.fade(1); setTimeout(()=>title.style.opacity=1,300); sc.wait=0; },
      tick:(t)=>{ E.fade(1); if(t>4.2&&pending>0&&sc.wait<8){ sc.wait+=1/60; return 'hold'; } if(t>4.2) title.style.opacity=0; },
      exit:()=>{ title.remove(); }, cleanup:()=>title.remove()},
    // 序幕一：滄淵沉向深淵，沉到一半停住，抬頭看船頭的燈
    {d:13,hour:20.4,sea:true,from:[[2.4,1.7,-6.5],[0,4,-22]],to:[[1.3,1.45,-9.5],[0,2.6,-22]],
      enter:()=>{ T0=performance.now()/1000; keep(lampG); lampG.position.set(0,1.95,-5.6); lampL.intensity=1.6; keep(king); king.position.set(0,1.2,-22); king.rotation.set(0,0,0); kingEye.intensity=1.2; sc.rip=0; },
      tick:(t)=>{ const sink=t<7?1.2-3.8*(t/7)*(t/7):t<9?-2.6+.3*Math.sin((t-7)/2*Math.PI/2):-2.3; king.position.y=sink+sw(0,-22,t)*.5; king.rotation.x=0; RP.king.headPitch=t>7?-.45*Math.min(1,(t-7)/2):0; RP.king.tail=.18;
        lampG.position.y=1.95+sw(0,-5.6,t)*.9; lampG.rotation.z=Math.sin(t*1.3)*.06;
        sc.rip-=1/60; if(sc.rip<=0&&t<7.5){ sc.rip=.6; W.addRipple&&W.addRipple((Math.random()-.5)*5,-22+(Math.random()-.5)*4,3+Math.random()*3); if(Math.random()<.5) spl((Math.random()-.5)*4,-20.5,8,1.4); } },
      subs:[[2.2,'滄淵沉回深淵之前，停了下來。','',4.2],[8,'他（滄淵）抬起頭，看著船頭那盞燈（老漁人的提燈），\n看了很久。','',4.6]]},
    // 序幕二：反打——從滄淵身後看向漁船上的燈
    {d:11,hour:20.45,sea:true,from:[[-5.2,5.4,-32.5],[0,2.4,-5.6]],to:[[-4,4.8,-30.5],[0,2.2,-5.6]],
      tick:(t)=>{ king.position.y=-2.3+sw(0,-22,t)*.4+Math.sin(t*.6)*.08; lampG.position.y=1.95+sw(0,-5.6,t)*.9; lampL.intensity=1.6+Math.sin(t*7)*.12; },
      subs:[[1,'他（滄淵）以為，是人類偷走了月潮。','',4.4],[6,'他口中的「月潮」，\n是他的女兒——霜汐。','q big',4.8]]},
    // 第一幕一：月亮從雲後出來，月光在海面鋪成一條路
    {d:12,hour:20.5,sea:true,from:[[0,3.4,-1],[0,2.2,-60]],to:[[0,3.6,-1],[0,0,0]],
      enter:()=>{ window.__MOONPH&&window.__MOONPH.dir&&window.__MOONPH.dir(20.5,md); md.y=0; md.normalize(); keep(glit); glit.position.set(0,.08,-1); glit.rotation.y=Math.atan2(-md.x,-md.z); glitM.opacity=0; S.remove(king); },
      tick:(t,k,P,L)=>{ window.__MOONPH.dir(20.5,md); L.set(P.x+md.x*100,P.y+Math.max(8,md.y*100)*Math.min(1,.25+t/9),P.z+md.z*100); const m2=new T.Vector3(md.x,0,md.z).normalize(); L.lerp(new T.Vector3(P.x+m2.x*100,P.y+24*Math.min(1,t/8),P.z+m2.z*100),.5);
        glitM.opacity=Math.min(.85,t/6); glitM.map.offset.y=t*.05; lampG.position.y=1.95+sw(0,-5.6,t)*.9; },
      subs:[[1.5,'那一夜，月亮從雲後出來。','',4.2],[6.4,'海面湧起銀色的大潮，\n一路往河口推過去。','',4.6]]},
    // 第一幕二：河口的老石堤，在浪裡一道一道裂開，中間崩出缺口
    {d:15,hour:21.2,sea:false,from:[[3.5,4.6,-83],[12,1.6,-99]],to:[[6.5,3.3,-88.5],[12,1.8,-99]],
      enter:()=>{ S.remove(glit); S.remove(lampG); S.remove(king); if(W.setRefl) W.setRefl(false); keep(dyke); chunks.forEach(q=>{ q.o.position.copy(q.p0); q.o.rotation.set(0,0,0); q.v.set(0,0,0); q.w.set(0,0,0); }); cracks.mat.opacity=0; cracks.forEach(l=>l.scale.set(.2,.2,1)); keep(flood); floodM.opacity=0; sc.sp=0; sc.fell=false; },
      tick:(t)=>{ sc.sp-=1/60; const back=new T.Vector3(); if(sc.sp<=0&&t<11){ sc.sp=t<5?.7:.35; const a=(Math.random()-.5)*DY.len*.8; const p=dyke.localToWorld(back.set(a,DY.h+.4,-DY.th/2)); spl(p.x,p.z,10+Math.floor(t),2+t*.2); }
        if(t>4.5){ const g=Math.min(1,(t-4.5)/3.5); cracks.mat.opacity=.9*g; cracks.forEach((l,i)=>{ const s2=.2+.8*Math.min(1,g*1.4-(i%4)*.1); l.scale.set(s2,s2,1); }); }
        if(t>8.6&&!sc.fell){ sc.fell=true; chunks.forEach(q=>{ if(q.mid){ q.v.set((Math.random()-.5)*1.5,1.5+Math.random()*1.5,2.5+Math.random()*2); q.w.set(Math.random()*1.5,Math.random(),Math.random()*1.5); } }); W.addRipple&&W.addRipple(DY.x,DY.z+2,8); }
        if(sc.fell){ chunks.forEach(q=>{ if(!q.mid) return; q.v.y-=9.8/60; q.o.position.addScaledVector(q.v,1/60); q.o.rotation.x+=q.w.x/60; q.o.rotation.z+=q.w.z/60; if(q.o.position.y<-4){ q.v.set(0,0,0); q.w.set(0,0,0); } }); floodM.opacity=Math.min(.7,(t-8.6)/1.4); setFlood(Math.min(.35,(t-8.6)*.06),t); }
        cracks.forEach(l=>{ l.material.opacity=cracks.mat.opacity*(.75+.25*Math.sin(t*9+l.id)); }); },
      subs:[[1,'河口的堤防，在浪裡一道一道裂開。','',4.4],[9.6,'四十年來關住的門，終於開了。','q',4.6]]},
    // 第一幕三：銀色的月潮順著窄灣灌進湖裡（接第二幕）
    {d:11,hour:21.3,sea:false,from:[[4,8.5,-78],[8,0,-62]],to:[[2,7.5,-38],[0,0,-12]],
      tick:(t,k)=>{ const head=setFlood(.35+.65*k,t); floodM.opacity=.7; if(Math.random()<.3) spl(head.x+(Math.random()-.5)*6,head.z,6,1); },
      subs:[[1.5,'月光順著河道流進湖裡。','',4.5]]},
    // 第二幕一：月潮流過倒木區與深水中央，魚群躍出水面、岸邊螢火飛起
    {d:13,hour:21.5,sea:false,from:[[-31,3.2,-33],[-22,.4,-17]],to:[[-12,2.6,-26],[2,.3,-12]],
      enter:()=>{ S.remove(dyke); S.remove(flood); keep(lake); lakeM.opacity=0; keep(ff); ffM.opacity=0; sc.jt=0; },
      tick:(t,k,P)=>{ lakeM.opacity=Math.min(.8,t/3); lakeM.map.offset.set(t*.012,-t*.02); ffM.opacity=Math.min(.95,t/4); ffTick(t);
        sc.jt-=1/60; if(sc.jt<=0){ sc.jt=.9+Math.random()*1.2; jump(P.x+(Math.random()-.4)*14,P.z-8-Math.random()*14); } updJumps(1/60); },
      subs:[[1.2,'銀光流過倒木區，流過深水中央。','',4.4],[6.6,'沉在湖底四十年的月光，\n回來了。','',4.8]]},
    // 第二幕二：浮萍灣——不論有沒有完成隱藏章節，林秋月都會出現。完成過的玩家看到她提著燈、是生前的模樣；沒完成的玩家看到的是白衣的鬼魂
    {d:16,hour:21.7,sea:false,from:[[-1.6,1.7,-8.5],[-7,1.25,-17.5]],to:[[-3.4,1.45,-11.2],[-7,1.35,-17.5]],
      enter:()=>{ lakeM.opacity=.55; keep(heng); heng.position.set(-7.35,.12,-17.9); heng.rotation.set(0,hengLook(-1.6,-8.5),0); setOp(hGhost,0); setOp(hAlive,0);
        if(met){ keep(lamp2); lamp2.position.set(-7.1,1.05,-17.4); lamp2L.intensity=1.4; } },
      tick:(t)=>{ ffTick(t+20); updJumps(1/60); lakeM.map.offset.set(t*.01,-t*.015); const a=t<2.5?t/2.5:t<11?1:Math.max(0,1-(t-11)/3);
        setOp(met?hAlive:hGhost,a); heng.position.y=.12+Math.sin(t*1.2)*.02; const rk=met?'heng':'ghost'; RP[rk].headPitch=t>4.5&&t<7?.32*Math.sin((t-4.5)/2.5*Math.PI):0; RP[rk].headYaw=t>8&&t<10?-.5*Math.sin((t-8)/2*Math.PI):0; RP[rk].skirt=.03;
        // 她轉身，朝月光灣的方向走去
        if(t>8){ heng.rotation.y=hengLook(-1.6,-8.5)+Math.min(1,(t-8)/2)*2.4; heng.position.z=-17.9-Math.max(0,t-9.5)*.35; }
        if(met){ lamp2.position.set(heng.position.x+.25,.9+heng.position.y-.12,heng.position.z+.2); lamp2L.intensity=1.4*a; lamp2.visible=a>.02; } },
      subs:met?[[1,'浮萍灣的水面上，站著一個提燈的女孩（林秋月）。','',4.4],[6.4,'她（林秋月）朝你點點頭，提著燈，\n往月光灣的方向走去。','',4.8]]
              :[[1,'浮萍灣的水面上，站著一個白衣的女孩（林秋月）。','',4.4],[6.2,'三十年來，她（林秋月）一直在這裡，\n等一盞燈。','',4.6],[11.2,'她（林秋月）轉過身，往月光灣的方向走去。','',4]]},
    // 第三幕一：月光灣——霜汐坐在岩石上，等你
    {d:15,hour:22,sea:false,music:'theme',vol:.7,from:[[-6.5,2.3,-31],[-12,1.6,-44]],to:[[-9.6,1.6,-36.6],[-12,1.7,-44]],
      enter:()=>{ S.remove(lake); S.remove(ff); S.remove(heng); S.remove(lamp2); keep(merG); merW.rotation.set(0,merFace(),0); merW.position.set(0,0,0); merL.intensity=1.6; keep(lampG); lampG.position.set(-8.95,.96,-37.75); lampL.intensity=1.4; lampL.color.copy(warmC); },
      tick:(t)=>{ merW.position.y=Math.sin(t*.9)*.015; lampG.rotation.z=Math.sin(t*1.1)*.04; },
      subs:[[1.2,'霜汐：「四十年前，堤防關上的那晚，\n我回不去了。」','q',5],[7.6,'霜汐：「是他（老漁人）第一個發現我。他什麼也沒問，\n只說：『我會想辦法讓妳回家。』」','q',6]]},
    // 第三幕二：近一點——她說起老漁人
    {d:15,hour:22.05,sea:false,from:[[-10.2,1.5,-38.6],[-12,1.85,-44]],to:[[-10.6,1.5,-40],[-12,1.9,-44]],
      tick:(t)=>{ merW.position.y=Math.sin(t*.9)*.015; merW.rotation.y=merFace()+Math.sin(t*.4)*.05; },
      subs:[[1,'霜汐：「每個滿月，他（老漁人）都提燈來。後來他走不動了，\n就坐在碼頭上，把燈舉得高高的，讓我看得見。」','q',6.4],[8.6,'霜汐：「他（老漁人）說，他欠一個女孩一盞燈。」','q big',5.4]]},
    // 第三幕二之一：霜汐說出林秋月的事；白衣的女孩沿著月光，從浮萍灣那頭走過水面來到灣裡
    {d:18,hour:22.08,sea:false,from:[[-10.4,1.5,-39.6],[-11.4,1.5,-43.4]],to:[[-9.8,1.6,-38.4],[-10.4,1.2,-42.2]],
      enter:()=>{ keep(heng); heng.position.set(BAY.x+3.4,.12,BAY.z+5.2); setOp(hGhost,met?0:0); setOp(hAlive,0); if(met){ keep(lamp2); } sc.ha=0; },
      tick:(t)=>{ merW.position.y=Math.sin(t*.9)*.015; const u=Math.min(1,Math.max(0,(t-6)/7)), a=Math.min(1,Math.max(0,(t-6)/2));
        heng.position.set(BAY.x+3.4-2.2*u,.12+Math.sin(t*1.2)*.02,BAY.z+5.2-3.6*u); heng.rotation.y=hengLook(BAY.x,BAY.z); setOp(met?hAlive:hGhost,a);
        if(met){ lamp2.position.set(heng.position.x+.25,.9,heng.position.z+.15); lamp2L.intensity=1.4*a; }
        merW.rotation.y=merFace()+Math.min(1,Math.max(0,(t-7)/3))*.9; },
      subs:[[1,'霜汐：「那個女孩叫林秋月，是他（老漁人）的女兒。」','q',4.2],[5.4,'霜汐：「三十年前的颱風夜，是她（林秋月）的生日。\n他（老漁人）答應過，那天會早點回家。」','q',5.4],[11.2,'霜汐：「可是那一夜，我被倒下的樹困住了。\n他（老漁人）冒著雨，划來救我……」','q',5.4]]},
    // 回憶一：三十年前，颱風夜。林秋月提著燈站在浮萍灣的小棧橋上，等著湖上的船
    {d:11,hour:18.9,sea:false,from:[[-3.4,1.5,-9.6],[-5.6,1.2,-14.6]],to:[[-3.9,1.4,-10.6],[-5.6,1.3,-15]],
      enter:()=>{ S.remove(merG); S.remove(king); S.remove(lampG); fbFilter(true); E.layer().appendChild(flash); keep(rain); keep(pier); keep(heng); keep(lamp2);
        heng.position.set(-5.4,.58,-14.2); heng.rotation.set(0,Math.PI,0); setOp(hGhost,0); setOp(hAlive,1); lamp2L.color.copy(warmC); lamp2L.intensity=1.8; RP.heng={}; },
      tick:(t,k,P)=>{ rainTick(P,1/60); RP.heng.headYaw=.35*Math.sin(t*.5); RP.heng.skirt=.08; lamp2.position.set(-5.15,1.28,-14.05); lamp2.rotation.z=Math.sin(t*2.3)*.15;
        flash.style.opacity=(t>6.2&&t<6.35)||(t>6.5&&t<6.6)?.7:0; },
      cleanup:()=>{ fbFilter(false); flash.remove(); },
      subs:[[.6,'三十年前。','big',3],[4.2,'霜汐：「她（林秋月）提著燈，在浮萍灣等。」','q',5]]},
    // 回憶二：天黑了，等不到。她划著小船出去找，浪越來越大
    {d:11,hour:20.2,sea:false,from:[[-2.5,1.6,-15],[-7,.7,-21]],to:[[-3.2,1.8,-18],[-8.5,.8,-25]],
      enter:()=>{ keep(boat); S.remove(pier); sc.bx=0; },
      tick:(t,k,P)=>{ rainTick(P,1/60); const z=-17.5-t*.6, roll=Math.sin(t*1.7)*.18+Math.sin(t*3.1)*.08, sw2=Math.sin(t*1.3)*.15;
        boat.position.set(-6.8,sw2,z); boat.rotation.set(Math.sin(t*1.1)*.08,.2,roll); heng.position.set(-6.8,.15+sw2,z+.2); heng.rotation.set(0,Math.PI+.2,roll*.6);
        lamp2.position.set(-6.55,1.05+sw2,z-.35); lamp2.rotation.z=roll*1.8; RP.heng.headYaw=.5*Math.sin(t*.7);
        if(Math.random()<.08) spl(-6.8+(Math.random()-.5)*2,z,6,1); flash.style.opacity=(t>3&&t<3.12)||(t>8.1&&t<8.2)?.75:0; },
      subs:[[1,'霜汐：「等不到爸爸，她（林秋月）就自己划了出去。」','q',5]]},
    // 回憶三：小船翻覆，燈落進水裡熄滅；水面上只剩漂著的髮簪
    {d:12,hour:20.4,sea:false,from:[[-4.4,1.3,-21.5],[-6.8,.4,-24.5]],to:[[-4.8,1.1,-22.2],[-6.8,.2,-24.6]],
      enter:()=>{ keep(pin); pin.position.set(-6.5,.2,-24); pin.visible=false; sc.cap=0; },
      tick:(t,k,P)=>{ rainTick(P,1/60); const z=-24.1, cap=Math.min(1,Math.max(0,(t-2.2)/1.2));
        boat.position.set(-6.8,Math.sin(t*1.5)*.18-cap*.25,z); boat.rotation.set(0,.2,Math.sin(t*1.9)*.25*(1-cap)+cap*2.6);
        const sink=Math.max(0,t-2.6); heng.position.set(-6.8+cap*.7,.15-sink*.55,z+.2); heng.rotation.set(cap*.4,Math.PI+.2,cap*1.1); setOp(hAlive,Math.max(0,1-sink/2.5));
        lamp2.position.set(-6.5+cap*.9,1.05-cap*.9-sink*.25,z-.35); lamp2L.intensity=t<3.4?1.8:Math.max(0,1.8-(t-3.4)*1.2)*(Math.random()>.3?1:.4); lamp2.visible=t<6;
        if(t>2.4&&!sc.cap){ sc.cap=1; spl(-6.6,z,40,2.2); W.addRipple&&W.addRipple(-6.6,z,3); } if(t>6){ pin.visible=true; pin.position.y=.12+Math.sin(t*1.4)*.03; }
        flash.style.opacity=(t>2.3&&t<2.42)?.8:0; },
      subs:[[4.2,'霜汐：「我聽見她（林秋月）的聲音，\n卻游不過那些倒木。」','q',5.4],[9.6,'燈，熄了。','big',2.4]]},
    // 第三幕二之二：月光照在林秋月身上，她變回生前的樣子；她請你帶一句話給爸爸
    {d:17,hour:22.1,sea:false,from:[[-9.4,1.45,-39.2],[-10.4,1.25,-42.2]],to:[[-9.7,1.4,-40.1],[-10.5,1.3,-42.4]],
      enter:()=>{ fbFilter(false); flash.remove(); S.remove(rain); S.remove(boat); S.remove(pier); S.remove(pin); keep(merG);
        heng.position.set(BAY.x+1.2,.12,BAY.z+1.6); heng.rotation.set(0,hengLook(BAY.x,BAY.z),0); setOp(met?hAlive:hGhost,1); setOp(met?hGhost:hAlive,0); if(met){ lamp2L.color.copy(warmC); lamp2.position.set(heng.position.x+.25,.9,heng.position.z+.15); } else S.remove(lamp2); sc.tw=0; },
      tick:(t)=>{ merW.position.y=Math.sin(t*.9)*.015; heng.position.y=.12+Math.sin(t*1.2)*.02;
        if(!met){ const k=Math.min(1,Math.max(0,(t-3)/4)); setOp(hGhost,1-k); setOp(hAlive,k); }
        RP.heng.headPitch=RP.ghost.headPitch=t<11?.28:Math.max(-.1,.28-(t-11)*.25); RP.heng.headYaw=RP.ghost.headYaw=t>12?Math.min(.5,(t-12)*.3):0;
        sc.tw-=1/60; if(sc.tw<=0&&t>2.5&&t<8){ sc.tw=.08; trailDot(heng.position.x+(Math.random()-.5)*.6,.2+Math.random()*1.6,heng.position.z+(Math.random()-.5)*.6); } updTrail(1/60); },
      subs:[[.8,'霜汐：「我趕到的時候，\n只撈起了她（林秋月）的髮簪。」','q',5.2],[7,'霜汐：「堤防關著，月潮進不來。\n困在湖裡的，不只我一個。」','q',4.8],[12.4,'林秋月：「……幫我跟爸爸（老漁人）說，\n我不怪他。」','q big',4.6]]},
    // 第三幕三：水道口，滄淵浮了起來——眼裡的光不再兇狠
    {d:25,hour:22.1,sea:false,from:[[-9,1.9,-37],[-13,3,-58]],to:[[-9.4,1.7,-38],[-13.5,3.6,-60]],
      enter:()=>{ keep(king); king.position.set(-14,-6,-62); king.rotation.set(0,Math.atan2(BAY.x+14,BAY.z+62),0); kingEye.intensity=0; kingEye.color.set(0xcfe8ff); },
      tick:(t)=>{ king.position.y=Math.min(-2.2,-6+t*.9)+Math.sin(t*.7)*.08; kingEye.intensity=Math.min(1,Math.max(0,(t-3)/3)); if(t<5&&Math.random()<.25) spl(-14+(Math.random()-.5)*4,-60,8,1.3); merW.rotation.y=merFace()+Math.min(1,t/3)*1.1; RP.mer.headYaw=Math.min(1,t/3)*.75; RP.king.headPitch=.15; },
      subs:[[5.2,'霜汐：「……爸爸。」','q',3.4],[9,'霜汐：「對不起。我只是想看看人類的燈。」','q',4.8],[14.4,'滄淵：「是我不好。四十年，\n我把整片海都翻了過來……」','q',5],[19.8,'滄淵：「卻沒想過，妳（霜汐）只是在等一盞燈，\n帶妳回家。」','q big',5.4]]},
    // 第三幕四：她把最亮的一片月鱗放進你的燈
    {d:12,hour:22.15,sea:false,from:[[-10.3,1.42,-38.3],[-11.4,1.4,-42.6]],to:[[-10.5,1.36,-38.9],[-11.2,1.3,-41.6]],
      enter:()=>{ merW.rotation.y=merFace(); RP.mer.headYaw=0; keep(moonScale); moonScale.visible=false; lampG.position.set(-10.22,1.06,-39.7); sc.ms=0; },
      tick:(t)=>{ merW.position.y=Math.sin(t*.9)*.015; const u=Math.min(1,Math.max(0,(t-2)/3)); moonScale.visible=t>2&&u<1;
        const a=new T.Vector3(BAY.x+.25,1.75,BAY.z+.45), b2=lampG.position.clone().add(new T.Vector3(0,.12,0)); moonScale.position.copy(a.lerp(b2,u)); moonScale.position.y+=Math.sin(u*Math.PI)*.35;
        moonScale.material.rotation=t*2; RP.mer.headPitch=t>6&&t<8.5?.25*Math.sin((t-6)/2.5*Math.PI):0; const g2=Math.min(1,Math.max(0,(t-5)/1.5)); lampL.color.copy(warmC).lerp(silverC,g2); lampL.intensity=1.4+1.4*g2*(1+.15*Math.sin(t*6));
        lampG.traverse(m=>{ if(m.isMesh&&m.material&&m.material.emissive) m.material.emissive.copy(new T.Color(0xffc070).lerp(silverC,g2)); }); },
      subs:[[6.2,'霜汐：「謝謝你，替他（老漁人）把路走完。」','q big',5]]},
    // 第三幕五：霜汐滑進水裡，游向水道口，回頭看你一次，和滄淵一起沉回大海
    {d:15,hour:22.2,sea:false,from:[[-9.2,2.4,-36],[-12.5,.5,-50]],to:[[-8.6,2.9,-35],[-13.6,.4,-58]],
      enter:()=>{ S.remove(moonScale); sc.tr=0; },
      tick:(t)=>{ const u=Math.min(1,t/9), path=new T.Vector3(BAY.x,0,BAY.z).lerp(new T.Vector3(-13.6,0,-59),u);
        merW.position.set(path.x-BAY.x,(t<1.5?-.4*t/1.5:-.4-.5*Math.min(1,Math.max(0,(t-9)/2)))+(t>4.6&&t<6.6?.35*Math.sin((t-4.6)/2*Math.PI):0),path.z-BAY.z);
        merW.rotation.y=Math.atan2(-13.6-BAY.x,-59-BAY.z); RP.mer.tail=t>1.5?.35:.12; RP.mer.tailF=t>1.5?3.2:1.6; RP.mer.headYaw=t>4.6&&t<6.6?2.2*Math.sin((t-4.6)/2*Math.PI)*.45:0; RP.heng.headYaw=RP.mer.headYaw;
        sc.tr-=1/60; if(sc.tr<=0&&t>1&&t<10.5){ sc.tr=.12; const wp=merW.getWorldPosition(new T.Vector3()); trailDot(wp.x+(Math.random()-.5)*.3,.3,wp.z+(Math.random()-.5)*.3); }
        { const hp=new T.Vector3(BAY.x+1.2,0,BAY.z+1.6).lerp(new T.Vector3(-13.2,0,-58.4),Math.min(1,Math.max(0,(t-.8)/9))); heng.position.set(hp.x,.12,hp.z); heng.rotation.y=Math.atan2(-13.2-hp.x,-58.4-hp.z);
 const fa=Math.max(0,1-Math.max(0,t-9)/2.2); setOp(hAlive,fa); setOp(hGhost,0); if(met){ lamp2.position.set(hp.x+.25,.9,hp.z+.15); lamp2L.intensity=1.4*fa; } }
        RP.king.headPitch=t<4?.45*Math.sin(Math.min(1,t/1.5)*Math.PI/2):Math.max(0,.45-(t-4)*.3);
        if(t>9){ king.position.y=-2.2-(t-9)*.9; kingEye.intensity=Math.max(0,1-(t-9)/3); } if(t>10&&t<11) spl(-13.8,-59.5,12,1.6); updTrail(1/60); },
      subs:[[.4,'滄淵朝著碼頭的方向，低下了頭：\n「人類……謝謝你。」','q',4.2],[5,'她們（霜汐和林秋月）回頭看了你一眼。','',3.6],[10.5,'月潮帶著霜汐和林秋月，回到了大海。','',4.4]]},
    // 第四幕一：天快亮了，划回碼頭。碼頭盡頭，老漁人的舊椅子和竹竿
    {d:14,hour:5.3,hourTo:5.8,sea:false,music:'piano',vol:.72,from:[[3.4,2.1,-15],[.3,1.1,-2.4]],to:[[1.6,1.7,-8.5],[.4,1.05,-2.6]],
      enter:()=>{ S.remove(merG); S.remove(king); S.remove(lampG); S.remove(heng); S.remove(lamp2); S.remove(oldG); trail.splice(0).forEach(d=>S.remove(d.sp)); keep(chair); keep(pole); document.head.appendChild(fl); },
      subs:[[1.4,'天快亮的時候，你划回了碼頭。','',4.4],[7.2,'碼頭盡頭，老漁人的舊椅子還在。\n椅邊靠著他的竹竿。','',5.4]]},
    // 第四幕二：你把那盞月光色的燈，放在椅子旁邊
    {d:9,hour:5.85,sea:false,from:[[-1.05,1.62,-.9],[.35,.95,-2.75]],to:[[-.8,1.48,-1.35],[.3,.95,-2.75]],
      enter:()=>{ keep(lampG); lampG.position.set(-.05,1.35,-2.5); lampL.color.copy(silverC); lampL.intensity=2; keep(pin); pin.position.set(.42,1.2,-2.55); pin.rotation.set(Math.PI/2,0,.6); },
      tick:(t)=>{ const u=Math.min(1,t/2.6); lampG.position.set(-.05,1.35-(1.35-.86)*(u*u*(3-2*u)),-2.5-.25*u); lampG.rotation.z=(1-u)*Math.sin(t*3)*.06; },
      subs:[[1,'你把燈，放在椅子旁邊。','',3.6],[5,'椅子上，多了一支舊髮簪——是林秋月的。','q',4]]},
    // 第四幕三：手記自己翻到最後，出現一頁從沒看過的字
    {d:12,hour:5.95,sea:false,from:[[-.6,1.45,-1.6],[.25,.9,-2.75]],to:[[-.5,1.4,-1.75],[.25,.9,-2.75]],fadeOut:true,
      enter:()=>{ E.layer().appendChild(page); pn=0; pm=0; pageTxt.innerHTML=''; pageMine.textContent=''; setTimeout(()=>page.style.opacity=1,200); sc.pageEnd=0; },
      tick:(t)=>{ if(t<1.2) return; const done=writePage(1/60); if(!done) return 'hold'; sc.pageEnd+=1/60; if(sc.pageEnd<4) return 'hold'; page.style.opacity=0; },
      exit:()=>{ page.remove(); }, cleanup:()=>page.remove()},
    // 第四幕四：太陽升起，一條藍鰓太陽魚躍出水面——就是你在這座碼頭釣到的第一種魚
    {d:12,hour:6.25,hourTo:6.9,sea:false,from:[[1.6,1.05,-4.6],[-.4,.9,-2.4]],to:[[2.2,1.25,-5.6],[-1.5,1.2,-1.8]],
      enter:()=>{ sc.jf=0; },
      tick:(t)=>{ if(t>3.2&&!sc.jf){ sc.jf=1; const u='models/bluegill.glb'; if(cache[u]){ const o=cache[u].scene.clone(true); o.traverse(m=>{ m.frustumCulled=false; }); const bb=new T.Box3().setFromObject(o), sz=bb.getSize(new T.Vector3()); o.scale.setScalar(.32/Math.max(sz.x,sz.y,sz.z)); const w=new T.Group(); w.add(o); keep(w); jumps.push({w,x:.2,z:-4.3,dx:-.7,dz:.7,t:0,h:1.1}); spl(.2,-4.3,10,1); } }
        updJumps(1/60); },
      subs:[[5.6,'陽光照上了碼頭。','',4.2]]},
    // 最後一鏡：晨光裡，碼頭盡頭站著老漁人和林秋月；女兒提著燈牽著父親，一起往光裡走去
    {d:17,hour:6.9,hourTo:7.2,sea:false,from:[[-.55,1.62,1.4],[.15,1.2,-3.2]],to:[[-.35,1.55,.4],[.15,1.3,-3.6]],
      enter:()=>{ keep(oldG); oldG.position.set(.15,.83,-2.95); oldG.rotation.set(0,Math.PI,0); setOp(oldG,0); keep(heng); heng.position.set(-.45,.83,-3.0); heng.rotation.set(0,Math.PI,0); setOp(hGhost,0); setOp(hAlive,0);
        keep(lamp2); lamp2L.color.copy(silverC); lamp2L.intensity=0; RP.old={}; RP.heng={}; },
      tick:(t)=>{ const a=t<3?t/3:t<12.5?1:Math.max(0,1-(t-12.5)/3); setOp(oldG,a*.92); setOp(hAlive,a*.92);
        if(t>5.5&&t<9){ const u=Math.sin((t-5.5)/3.5*Math.PI); RP.heng.headYaw=-.55*u; RP.old.headYaw=.45*u; RP.old.headPitch=.15*u; }
        const w=Math.max(0,t-9.5)*.32; oldG.position.set(.15,.83+w*.12,-2.95-w); heng.position.set(-.3+Math.min(.12,w*.4),.83+w*.12,-3.0-w);
        lamp2.position.set(heng.position.x-.22,heng.position.y+.72,heng.position.z+.05); lamp2L.intensity=1.6*a; lamp2.visible=a>.02; },
      subs:[[2,'晨光裡，碼頭盡頭站著兩個人——\n老漁人，和林秋月。','',4.2],[7,'林秋月：「爸，我們回家了。」','q big',4.6],[12.6,'月潮回來了。','',3.8]]},
    // 片尾名單（第二到第四幕完成後，會插在這之前）
    {d:30,hour:6.6,hourTo:8,sea:false,music:'theme',vol:.85,from:[[0,10,14],[0,0,-30]],to:[[0,28,26],[0,0,-40]],
      enter:()=>{ drop(); E.credits(ENDING_CREDITS,28); }, cleanup:drop}
  ];
}
/* ===== 破關後：小屋書架上的《月潮》完整故事（紙張貼圖、手寫字體、分章翻頁） ===== */
const STORY_BOOK=[
 ['序　月潮','河口外的海，住著滄淵。\n他只有一個女兒，叫霜汐。母后生下她的那天就走了，滄淵把她看得比整片海還重，從不讓她靠近人類。\n霜汐從小聽海龜說，每年夏天，河口那頭的湖上會漂滿人類放的燈，一盞一盞，像掉進水裡的星星。\n她一直想看一次。'],
 ['一　關上的門','四十年前的一個大潮夜，月亮又圓又低。霜汐偷偷順著月潮，游過河口，第一次看見了湖上的燈。\n她看得太入迷，沒發現鎮上的人正在河口關上新築好的堤防閘門。\n月潮退了。門再也沒有打開。\n霜汐被困在了湖裡。\n滄淵找遍整片海，最後只知道一件事：人類關上了門，他的月潮再也沒有回來。\n從那天起，深藍的海不再平靜。'],
 ['二　提燈的人','三十歲的林老伯（老漁人）在月光灣發現了受傷的霜汐。\n他沒有問她是什麼，只蹲在岸邊說：「我會想辦法讓妳回家。」\n他去鎮上求人打開閘門，沒有人相信一個漁夫說的人魚。\n他能做的，只有每個滿月提著燈划到灣裡，陪她說話，唱歌給她聽，告訴她：海還在等妳。'],
 ['三　小女孩和燈','林老伯有一個女兒，叫林秋月。\n她十歲那年的生日，剛好是滿月。爸爸摸著她的頭說：「今天爸爸早點回來，陪妳吃麵線。」\n那天下午，颱風來了。東岸的林子被吹倒，一棵一棵倒進湖裡，把月光灣的水道堵住，霜汐被困在倒木中間。\n林老伯穿上雨衣，划著船衝進了風雨裡。'],
 ['四　颱風夜','林秋月提著家裡那盞燈，坐在浮萍灣的小木棧橋上等。\n天黑了，雨越下越大，湖上一艘船也沒有。\n她想，爸爸一定是迷路了，看不到燈。\n於是她解開小船，提著燈，自己划了出去。\n霜汐在倒木後面聽見了她的聲音，拚命往那裡游，卻怎麼也游不過去。\n等她趕到的時候，湖面上只剩下一支漂著的髮簪。\n燈，熄了。'],
 ['五　欠一盞燈','林老伯天亮才回到家。\n他再也沒有原諒自己。\n之後的每個滿月，他還是提著燈出門。一盞給霜汐，讓她知道回家的路還在；一盞給林秋月——\n「我欠一個女孩一盞燈。」\n他把這些都寫進了手記裡，寫到字一年比一年淡，寫到再也划不動船。\n最後幾年，他只能坐在碼頭盡頭的舊搖椅上，把燈舉得高高的，讓湖裡的人看得見。'],
 ['六　湖裡的白衣女孩','林秋月沒有離開那座湖。\n她一夜一夜地在浮萍灣等，在湖上找，找每一盞燈、每一艘船，看看是不是爸爸終於來接她了。\n三十年過去，湖上的人換了一批又一批，沒有一個是爸爸。\n她以為，那天晚上爸爸選了別人，不要她了。'],
 ['七　你','後來，碼頭來了一個新的釣客——就是你。\n你撿到了老漁人的手記，一頁一頁把它找回來；你在浮萍灣釣起了那支髮簪；你在滿月的夜裡，提著老漁人的燈，走到了林秋月面前。\n她第一次看見爸爸的燈火。\n你修好了老漁人的船，開出河口，一路到了他一輩子沒能抵達的深藍。'],
 ['八　月潮回來了','滄淵沉回深淵前，看見了你船頭的燈——那正是霜汐小時候一直說想看的，人類的燈。\n那一夜大潮，堤防在浪裡裂開了。月光順著河道流回湖裡。\n霜汐終於見到了爸爸：「對不起，我只是想看看人類的燈。」\n滄淵低下頭：「是我不好。我把整片海都翻過來，卻沒想過，妳只是在等一盞燈帶妳回家。」\n月光照在林秋月身上，她變回了那個十歲的小女孩。\n「幫我跟爸爸說，我不怪他。」'],
 ['終　換我守著這片湖','天亮的時候，你把燈放在老漁人的舊搖椅旁。\n椅子上，多了一支髮簪。\n晨光裡，碼頭盡頭站著兩個人。小女孩提著燈，牽起爸爸的手：「爸，我們回家了。」\n手記的最後一頁，是你寫下的字：\n「月潮回來了。換我守著這片湖。」']
];
function showStoryBook(){ let i=0; const el=document.createElement('div');
  el.style.cssText="position:fixed;inset:0;z-index:60;background:rgba(10,8,6,.82);display:flex;align-items:center;justify-content:center;padding:16px";
  const fl=document.createElement('link'); fl.rel='stylesheet'; fl.href='https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&display=swap'; document.head.appendChild(fl);
  const pg=document.createElement('div'); pg.style.cssText="position:relative;width:min(380px,92vw);height:min(640px,82vh);display:flex;flex-direction:column;padding:28px 24px 18px;box-sizing:border-box;border-radius:4px;"+
    "background:linear-gradient(rgba(214,180,120,.42),rgba(150,110,60,.32)),url(end_paper.jpg) center/cover;box-shadow:0 18px 50px rgba(0,0,0,.7),inset 0 0 60px rgba(90,60,20,.45);color:#2c1e0e;font-family:'LXGW WenKai TC','Kaiti TC','STKaiti','BiauKai',serif";
  el.appendChild(pg); document.body.appendChild(el);
  const draw=()=>{ const [t,b]=STORY_BOOK[i]; pg.innerHTML=`<div style="font-size:12px;letter-spacing:.3em;opacity:.6;text-align:center">月潮・老漁人的手記</div><h3 style="margin:10px 0 12px;text-align:center;font-weight:400;font-size:22px;letter-spacing:.12em">${t}</h3>`+
    `<div style="flex:1;overflow:auto;font-size:17px;line-height:2.05;white-space:pre-line">${b}</div>`+
    `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-family:sans-serif"><button data-b="p" style="border:0;background:rgba(60,40,20,.15);padding:8px 14px;border-radius:999px;color:#2c1e0e;${i?'':'visibility:hidden'}">‹ 上一章</button><span style="font-size:12px;opacity:.6">${i+1} / ${STORY_BOOK.length}</span><button data-b="${i<STORY_BOOK.length-1?'n':'x'}" style="border:0;background:rgba(60,40,20,.25);padding:8px 14px;border-radius:999px;color:#2c1e0e">${i<STORY_BOOK.length-1?'下一章 ›':'闔上'}</button></div>`+
    `<button data-b="x" style="position:absolute;right:10px;top:8px;border:0;background:none;font-size:20px;color:#5a4028">✕</button>`; };
  el.addEventListener('click',e=>{ const b=e.target.closest('[data-b]'); if(!b){ if(e.target===el) el.remove(); return; } const a=b.dataset.b; if(a==='x') el.remove(); else { i=Math.max(0,Math.min(STORY_BOOK.length-1,i+(a==='n'?1:-1))); draw(); } });
  draw(); }
/* ===== 被咬特效：鱷魚或鯊魚咬到時，畫面閃紅、出現兩排咬痕與流下的血痕，再慢慢淡掉 ===== */
function biteFX(kind){ try{
  const big=kind==='shark', el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:55;pointer-events:none;opacity:1;transition:opacity 1.6s ease 1s';
  // 齒痕：上下兩排尖牙孔，略帶弧度、大小不一；鯊魚的牙比較密、弧度比較大
  const W=innerWidth, H=innerHeight, n=big?13:9, cx=W/2+(Math.random()-.5)*W*.15, cy=H*.48, rx=W*(big?.46:.38), ry=H*(big?.2:.15);
  let teeth=''; for(const s of [-1,1]) for(let i=0;i<n;i++){ const a=Math.PI*(.12+.76*i/(n-1)), x=cx-Math.cos(a)*rx, y=cy+s*(Math.sin(a)*ry*.55+ry*.25), w=(big?20:16)*(.7+Math.random()*.6), h=w*1.7;
    // 牙尖朝向咬合中心（上排往下、下排往上）；只有部分齒孔流下短短的血痕
    const tip=y-s*h; teeth+=`<path d="M${x-w/2},${y} Q${x},${y-s*h*.35} ${x},${tip} Q${x},${y-s*h*.35} ${x+w/2},${y} Z" fill="url(#g)" opacity="${.8+Math.random()*.2}"/>`;
    if(Math.random()<.4){ const sy=Math.max(y,tip); teeth+=`<path d="M${x},${sy} q${(Math.random()-.5)*5},${H*.02} ${(Math.random()-.5)*3},${H*(.025+Math.random()*.05)}" stroke="#6a0006" stroke-width="${2.5+Math.random()*2.5}" fill="none" stroke-linecap="round" opacity=".8"/>`; } }
  el.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(150,0,0,0) 30%,rgba(150,0,0,.55) 75%,rgba(90,0,0,.85) 100%)"></div>
<div class="bf" style="position:absolute;inset:0;background:rgba(220,20,20,.45);transition:opacity .35s"></div>
<svg width="${W}" height="${H}" style="position:absolute;inset:0"><defs><radialGradient id="g"><stop offset="0" stop-color="#3a0004"/><stop offset=".6" stop-color="#8a0010"/><stop offset="1" stop-color="#c41a1a" stop-opacity=".2"/></radialGradient></defs>${teeth}</svg>`;
  document.body.appendChild(el); void el.offsetWidth; setTimeout(()=>{ el.querySelector('.bf').style.opacity=0; el.style.opacity=0; },60);
  // 畫面震動
  const cv=document.getElementById('c'); if(cv){ let k=0; const sh=setInterval(()=>{ k++; cv.style.transform=k>10?'':`translate(${(Math.random()-.5)*16*(1-k/11)}px,${(Math.random()-.5)*16*(1-k/11)}px)`; if(k>10) clearInterval(sh); },35); }
  setTimeout(()=>el.remove(),2900); }catch(e){ console.warn('biteFX',e); } }

/* ===== 新手指引：第一次開始遊戲時，一步一步圈出每個按鈕並說明用途；可略過，也能從設定重看 ===== */
const TUT_STEPS=[
 [null,'歡迎來到濕地','這裡是老漁人留下的碼頭。跟著指引，一分鐘學會怎麼玩。'],
 ['#actBtn','拋竿','按住這個按鈕蓄力，力道條最滿時放開，就能拋得最遠。'],
 [null,'提竿與收線','浮標被拉進水裡時，立刻點一下提竿。拉扯時按住收線；魚衝刺時先放手，往魚游走的反方向滑動拉竿，別讓張力爆表。'],
 [null,'轉向瞄準','在畫面空白處左右拖曳，就能轉身換方向拋竿。'],
 ['#baitChip','魚餌','點這裡換魚餌。不同的餌吸引不同的魚，稀有的餌要到釣具店買。'],
 ['#bMap','釣點','到不同的釣點，會遇到不同的魚。有些地方要獨木舟或修好的漁船才去得了。'],
 ['#bShop','釣具店','買釣竿、魚餌、道具，也能升級裝備。'],
 ['#bQuest','任務','每天都有新委託，完成可以拿金幣和經驗。'],
 ['#bLog','圖鑑與手記','記錄釣過的每一種魚，老漁人的手記故事也在這裡。'],
 ['#bGoal','目標與成就','看看下一個目標，還有「人魚之約」的進度。'],
 ['#bTour','釣魚大賽','限時比賽，釣得越大名次越高。'],
 ['#bCam','拍照','把風景或剛釣到的魚拍下來。'],
 ['#bSet','設定','音效、畫質、存檔，想重看這份新手指引也在這裡。'],
 [null,'開始吧','湖會告訴你很多事，只要你願意等。祝你好運！']];
function startTutorial(force){ try{
  const S=window.__G&&window.__G.saveRef; if(!force&&S&&S.tutDone) return;
  // 開場故事、結局或其他全畫面演出還在播時先等，播完再開始指引
  if(document.body.classList.contains('cine')||document.body.classList.contains('ending')||document.querySelector('#story:not(.hidden)')){ setTimeout(()=>startTutorial(force),1200); return; }
  if(document.getElementById('tutOv')) return;
  let i=0; const ov=document.createElement('div'); ov.id='tutOv';
  ov.style.cssText='position:fixed;inset:0;z-index:70;pointer-events:auto';
  ov.innerHTML='<div class="hole" style="position:absolute;border-radius:14px;box-shadow:0 0 0 9999px rgba(0,0,0,.66);border:2px solid #ffcf66;transition:all .35s;pointer-events:none"></div>'+
   '<div class="box" style="position:absolute;left:50%;transform:translateX(-50%);width:min(330px,86vw);background:rgba(18,26,40,.96);border:1px solid rgba(255,207,102,.55);border-radius:16px;padding:14px 16px;color:#eef3fa;font-size:14px;line-height:1.65;box-shadow:0 10px 30px rgba(0,0,0,.5)">'+
   '<div style="display:flex;justify-content:space-between;align-items:center"><b class="tt" style="color:#ffd27a;font-size:16px"></b><small class="no" style="opacity:.6"></small></div><div class="tx" style="margin:6px 0 10px"></div>'+
   '<div style="display:flex;gap:8px;justify-content:flex-end"><button class="sk" style="border:0;background:none;color:#9aa8bb;padding:8px 10px">略過指引</button><button class="nx" style="border:0;border-radius:999px;background:#ffcf66;color:#3a2600;font-weight:700;padding:8px 18px">下一步</button></div></div>';
  document.body.appendChild(ov);
  const hole=ov.querySelector('.hole'), box=ov.querySelector('.box');
  const done=()=>{ ov.remove(); const S2=window.__G&&window.__G.saveRef; if(S2){ S2.tutDone=1; if(window.__saveNow) window.__saveNow(); } };
  function show(){ const [sel,t,x]=TUT_STEPS[i]; ov.querySelector('.tt').textContent=t; ov.querySelector('.tx').textContent=x; ov.querySelector('.no').textContent=(i+1)+' / '+TUT_STEPS.length;
    ov.querySelector('.nx').textContent=i<TUT_STEPS.length-1?'下一步':'開始釣魚';
    const el=sel&&document.querySelector(sel), r=el&&el.offsetParent!==null?el.getBoundingClientRect():null;
    if(r&&r.width){ const p=6; Object.assign(hole.style,{left:(r.left-p)+'px',top:(r.top-p)+'px',width:(r.width+p*2)+'px',height:(r.height+p*2)+'px',opacity:1});
      const below=r.top<innerHeight*.5; box.style.top=below?(r.bottom+16)+'px':''; box.style.bottom=below?'':(innerHeight-r.top+16)+'px'; }
    else { Object.assign(hole.style,{left:'50%',top:'50%',width:'0px',height:'0px'}); box.style.top=''; box.style.bottom=Math.round(innerHeight*.38)+'px'; } }
  ov.querySelector('.nx').addEventListener('click',()=>{ if(i<TUT_STEPS.length-1){ i++; show(); } else done(); });
  ov.querySelector('.sk').addEventListener('click',done);
  show(); }catch(e){ console.warn('tutorial',e); } }
/* ===== 水面魚群：湖與海偶爾會有一群小魚貼著水面游，背鰭與水紋露出水面、偶爾有一尾跳起；船靠太近會受驚散開往下鑽 ===== */
function createSchools(W,P,c){
'use strict';
const T=THREE, S=W.scene, rand=(a,b)=>a+Math.random()*(b-a);
// 小魚外型：細長紡錘身體＋叉狀尾鰭，頭朝 +x；用 InstancedMesh 一次畫整群
function fishGeo(){ const body=new T.SphereGeometry(.5,10,6); body.scale(1,.24,.13);
  const tail=new T.BufferGeometry(); tail.setAttribute('position',new T.Float32BufferAttribute([-.45,0,0,-.72,.16,0,-.62,0,0,-.45,0,0,-.62,0,0,-.72,-.16,0],3)); tail.computeVertexNormals();
  // 自己把身體和尾鰭的頂點接在一起（不依賴額外的合併工具）
  const b=body.toNonIndexed(), pa=b.attributes.position.array, ta=tail.attributes.position.array, all=new Float32Array(pa.length+ta.length); all.set(pa); all.set(ta,pa.length);
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(all,3)); g.computeVertexNormals(); return g; }
const GEO=fishGeo();
const MATS={lake:new T.MeshStandardMaterial({color:0x6d7a64,roughness:.35,metalness:.55,side:T.DoubleSide}),
  sea:new T.MeshStandardMaterial({color:0x5f88a8,roughness:.3,metalness:.65,side:T.DoubleSide})};
// 水面上的閃光：魚轉身時鱗片反光
const glintTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=32; const g=cv.getContext('2d'), rg=g.createRadialGradient(16,16,0,16,16,16); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(.3,'rgba(230,245,255,.5)'); rg.addColorStop(1,'rgba(230,245,255,0)'); g.fillStyle=rg; g.fillRect(0,0,32,32); return new T.CanvasTexture(cv); })();
const N=36, schools=[], M=new T.Matrix4(), Q=new T.Quaternion(), V=new T.Vector3(), SC=new T.Vector3(), E=new T.Euler(0,0,0,'YXZ'), cam=new T.Vector3();
for(let s=0;s<3;s++){ const im=new T.InstancedMesh(GEO,MATS.lake,N); im.frustumCulled=false; im.visible=false; S.add(im);
  const gl=new T.Points(new T.BufferGeometry(),new T.PointsMaterial({map:glintTex,size:.35,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.9}));
  gl.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(6*3),3)); gl.frustumCulled=false; gl.visible=false; S.add(gl);
  const off=[]; for(let i=0;i<N;i++) off.push({x:rand(-1.6,1.6),z:rand(-.9,.9),d:rand(0,.12),ph:rand(0,6.28),sz:rand(.75,1.25)});
  schools.push({im,gl,off,on:false,t:0,life:0,x:0,z:0,h:0,sp:0,turn:0,fear:0,depth:0,next:rand(4,14)+s*6,jump:null,gt:0}); }
function waterY(x,z,t){ return (c.loc()==='sea'&&W.swell)?W.swell(x,z,t):0; }
function spawn(s){ W.camera.getWorldPosition(cam); const a=rand(0,6.28), d=rand(16,42), x=cam.x+Math.sin(a)*d, z=cam.z+Math.cos(a)*d;
  if(c.loc()!=='sea'&&W.shoreR&&Math.hypot(x,z)>W.shoreR(Math.atan2(x,-z))-6) return false;
  const sea=c.loc()==='sea'; s.im.material=sea?MATS.sea:MATS.lake; s.scale=sea?rand(.28,.42):rand(.16,.26);
  Object.assign(s,{on:true,t:0,life:rand(35,70),x,z,h:rand(0,6.28),sp:rand(.6,1.2),turn:0,fear:0,depth:0,jump:null,gt:rand(.5,2)}); s.im.visible=true; s.gl.visible=true; return true; }
function update(dt,t){ const ok=c.ok(); W.camera.getWorldPosition(cam);
  const p=c.period(), want=ok?(p==='dawn'||p==='dusk'?3:p==='day'?2:1):0;   // 清晨黃昏魚群最活躍，夜裡少
  let active=0; schools.forEach(s=>{ if(s.on) active++; });
  schools.forEach((s,si)=>{
    if(!s.on){ s.next-=dt; if(ok&&active<want&&s.next<=0){ if(spawn(s)) active++; s.next=rand(20,50); } return; }
    s.t+=dt; const dCam=Math.hypot(s.x-cam.x,s.z-cam.z);
    if(dCam<7&&s.fear<=0){ s.fear=4; s.h=Math.atan2(s.x-cam.x,s.z-cam.z); s.sp=3.2; if(P&&P.splash) P.splash(s.x,0,s.z,14,.6); }   // 船靠太近：受驚散開
    if(s.fear>0){ s.fear-=dt; s.depth=Math.min(1,s.depth+dt*.6); } else { s.sp+=(1-s.sp)*dt*.5; s.depth=Math.max(0,s.depth-dt*.2); }
    s.turn-=dt; if(s.turn<=0){ s.turn=rand(3,7); s.ht=s.h+rand(-1.2,1.2); } if(s.ht!==undefined) s.h+=(s.ht-s.h)*Math.min(1,dt*.6);
    s.x+=Math.sin(s.h)*s.sp*dt; s.z+=Math.cos(s.h)*s.sp*dt;
    const fade=Math.min(1,s.t/2)*Math.min(1,(s.life-s.t)/3)*(1-s.depth*.9);
    if(s.t>s.life||dCam>70||!ok){ s.on=false; s.im.visible=false; s.gl.visible=false; return; }
    const sc=s.scale, wy=waterY(s.x,s.z,t);
    for(let i=0;i<N;i++){ const o=s.off[i], wob=Math.sin(t*3.1+o.ph)*.22, lx=o.x+Math.sin(t*.7+o.ph)*.25, lz=o.z+Math.cos(t*.9+o.ph)*.2;
      const ch=Math.cos(s.h), sh=Math.sin(s.h), px=s.x+sh*lx+ch*lz, pz=s.z+ch*lx-sh*lz;
      V.set(px,wy-.04-o.d-s.depth*.9-(1-fade)*.4,pz); E.set(0,s.h-Math.PI/2+wob*.35,Math.sin(t*9+o.ph)*.12); Q.setFromEuler(E); SC.setScalar(sc*o.sz);
      M.compose(V,Q,SC); s.im.setMatrixAt(i,M); }
    s.im.instanceMatrix.needsUpdate=true;
    // 水面騷動：魚群上方不時冒出小水紋，偶爾一尾跳出水面
    if(Math.random()<dt*1.4*fade&&W.addRipple) W.addRipple(s.x+rand(-1.2,1.2),s.z+rand(-1.2,1.2),.25);
    if(!s.jump&&s.fear<=0&&Math.random()<dt*.18*fade) s.jump={t:0,i:Math.floor(rand(0,N))};
    if(s.jump){ const j=s.jump; j.t+=dt; const u=j.t/.55, o=s.off[j.i], px=s.x+Math.sin(s.h)*o.x, pz=s.z+Math.cos(s.h)*o.x;
      V.set(px,wy+Math.sin(Math.min(1,u)*Math.PI)*.45,pz); E.set(-.9+1.8*Math.min(1,u),s.h-Math.PI/2,0); Q.setFromEuler(E); SC.setScalar(sc*1.1); M.compose(V,Q,SC); s.im.setMatrixAt(j.i,M);
      if(u>=1){ if(P&&P.splash) P.splash(px,0,pz,6,.25); if(W.addRipple) W.addRipple(px,pz,.3); s.jump=null; } }
    // 鱗片反光
    s.gt-=dt; const ga=s.gl.geometry.attributes.position; if(s.gt<=0){ s.gt=rand(.3,1.2); for(let k=0;k<6;k++){ const o=s.off[Math.floor(rand(0,N))]; ga.setXYZ(k,s.x+Math.sin(s.h)*o.x+rand(-.3,.3),wy+.02,s.z+Math.cos(s.h)*o.x+rand(-.3,.3)); } ga.needsUpdate=true; }
    s.gl.material.opacity=.75*fade*(c.period()==='night'?.2:1)*(.6+.4*Math.sin(t*7+si));
  }); }
// 受驚：落水點附近的魚群往外逃、往下鑽；如果附近沒有魚群，就在落水點炸出一群逃竄的小魚（讓玩家看得到魚被嚇跑）
function scare(x,z,r){ let hit=0; schools.forEach(s=>{ if(!s.on) return; const d=Math.hypot(s.x-x,s.z-z); if(d<r){ s.fear=5; s.h=Math.atan2(s.x-x,s.z-z); s.sp=3.4; hit++; } });
  if(!hit){ const s=schools.find(q=>!q.on); if(s&&spawn(s)){ s.x=x; s.z=z; s.t=2.5; s.life=12; s.fear=5; s.h=Math.random()*6.28; s.sp=3.6; if(P&&P.splash) P.splash(x,0,z,18,.7); } } }
// 回來：警戒退了以後，一群魚從外側慢慢游回落水點附近
function comeBack(x,z){ const s=schools.find(q=>!q.on)||schools[0]; if(!spawn(s)) return false; const a=Math.random()*6.28, d=rand(9,13);
  s.x=x+Math.sin(a)*d; s.z=z+Math.cos(a)*d; s.h=Math.atan2(x-s.x,z-s.z); s.ht=s.h; s.turn=8; s.sp=.9; s.t=0; s.life=60; return true; }
// 測試用：在鏡頭正前方放一群
function force(d){ const s=schools.find(q=>!q.on)||schools[0]; W.camera.getWorldPosition(cam); const dir=new T.Vector3(); W.camera.getWorldDirection(dir); dir.y=0; dir.normalize();
  spawn(s); s.x=cam.x+dir.x*(d||12); s.z=cam.z+dir.z*(d||12); s.h=Math.atan2(dir.z,dir.x); s.t=3; }
// 受驚炸水：一群小魚從落點往外跳出水面逃開（每尾一道弧線＋入水水花）
const BN=14, burstIM=new T.InstancedMesh(GEO,MATS.lake,BN); burstIM.frustumCulled=false; burstIM.visible=false; S.add(burstIM); const BU=[];
function burst(x,z,n){ BU.length=0; burstIM.material=c.loc()==='sea'?MATS.sea:MATS.lake; n=Math.min(BN,n||10);
  for(let i=0;i<n;i++){ const a=rand(0,6.28), sp=rand(1.4,3.2); BU.push({x:x+Math.cos(a)*rand(0,.6),z:z+Math.sin(a)*rand(0,.6),vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,vy:rand(1.6,2.8),y:-.05,t:-rand(0,.45),sz:rand(.13,.22),done:false}); }
  burstIM.visible=true; }
function burstTick(dt){ if(!BU.length) return; let live=0;
  BU.forEach((b,i)=>{ b.t+=dt; if(b.t<0||b.done){ M.compose(V.set(0,-50,0),Q.identity(),SC.setScalar(.001)); burstIM.setMatrixAt(i,M); if(!b.done) live++; return; }
    if(b.y===-.05&&b.t<dt*1.5&&P&&P.splash) P.splash(b.x,0,b.z,5,.25);
    b.vy-=9.8*dt; b.x+=b.vx*dt; b.z+=b.vz*dt; b.y+=b.vy*dt;
    if(b.y<0&&b.vy<0){ b.done=true; if(P&&P.splash) P.splash(b.x,0,b.z,6,.3); if(W.addRipple) W.addRipple(b.x,b.z,.28); }
    const h=Math.atan2(b.vz,b.vx); E.set(Math.atan2(b.vy,Math.hypot(b.vx,b.vz))*.8,-h,Math.sin(b.t*30)*.3,'YXZ'); Q.setFromEuler(E); M.compose(V.set(b.x,b.y,b.z),Q,SC.setScalar(b.sz)); burstIM.setMatrixAt(i,M); if(!b.done) live++; });
  for(let i=BU.length;i<BN;i++){ M.compose(V.set(0,-50,0),Q.identity(),SC.setScalar(.001)); burstIM.setMatrixAt(i,M); }
  burstIM.instanceMatrix.needsUpdate=true; if(!live){ BU.length=0; burstIM.visible=false; } }
return {update:(dt,t)=>{ update(dt,t); burstTick(dt); },force,scare,comeBack,burst};
}
/* ===== 潮間帶（蚵仔寮泥灘）：退潮時才能下灘；看泥面痕跡判斷底下是什麼，用手指刮開沙泥把牠挖出來
   ・潮汐：每天兩次退潮（04:30～07:30、16:30～19:30），漲潮前 40／20 分鐘警告並亮出撤離路線，時間到強制撤離
   ・痕跡：單孔會噴水＝文蛤、鑰匙孔雙孔＝赤嘴蛤、細長凹痕＝竹蟶、細爪痕＋小沙球＝海瓜子、大洞＋沙堆＝沙蟹洞、盤繞泥條＝沙蠶、平坦＝多半是空的
   ・挖掘：刮開濕沙→黏泥→碎貝殼層，每層聲音與震動不同；碰到硬殼要放慢清周圍，刮太快會刮破；竹蟶會往下縮、沙蟹會想逃
   ・泥面上還有招潮蟹、彈塗魚、寄居蟹在活動，點牠們可以抓
   ・挖到的放進桶子，離開時可以全部賣掉，或放進保冷箱帶回家烤（文蛤、赤嘴蛤、海瓜子、竹蟶、沙蟹）；沙蠶變成魚餌 ===== */
function createTide(W,c){
'use strict';
const T=THREE, rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const S=new T.Scene(), cam=new T.PerspectiveCamera(58,1,.05,400);
const sky=new T.Color(0xb9c4c8); S.background=sky; new T.TextureLoader().load('sky_ovc_light.jpg',t=>{ t.encoding=T.sRGBEncoding; const dome=new T.Mesh(new T.SphereGeometry(300,48,24),new T.MeshBasicMaterial({map:t,side:T.BackSide,fog:false,depthWrite:false})); dome.renderOrder=-10; dome.onBeforeRender=()=>dome.position.copy(cam.position); S.add(dome); });   /* 實拍海邊陰天天空（360 度全景貼在大球內側） */ S.fog=new T.Fog(sky,40,260);
S.add(new T.HemisphereLight(0xeef4f8,0x6a6050,1.7)); const sun=new T.DirectionalLight(0xfff2dc,1.6); sun.position.set(30,60,-20); S.add(sun);
// 泥灘地面（3D 地形）：沙紋起伏、潮溝、低窪積水都是真的高低差，不是平面貼圖
//   ・岸邊是沙、往海那邊是泥，兩種用噪聲邊界自然融合（不是一條直線交接）
//   ・低於積水面的地方有真正會反射天空的水窪
const TL=new T.TextureLoader(), tx=(f,srgb)=>{ const t=TL.load(f); t.wrapS=t.wrapT=T.RepeatWrapping; if(srgb) t.encoding=T.sRGBEncoding; t.anisotropy=8; return t; };
const mudT=tx('models/tide/mud_diff.jpg',true), mudN=tx('models/tide/mud_nor.jpg'), sandT=tx('models/tide/sand_diff.jpg',true), sandN=tx('models/tide/sand_nor.jpg');
const hn=(x,z)=>Math.sin(x*.13+Math.sin(z*.07)*1.7)*.5+Math.sin(z*.11-x*.05)*.5;
function sandK(x,z){ const e=34+hn(x*1.7,z*1.3)*7+Math.sin(x*.21)*2.5; return Math.min(1,Math.max(0,(z-(e-4))/8)); }   // 越靠岸（z 大）越是沙
function hAt(x,z){ const sk=sandK(x,z);
  const rip=Math.sin(z*5.2+Math.sin(x*.6)*1.4+hn(x,z)*2)*.022*(.6+.4*sk);   // 沙紋（細波浪狀起伏）
  const und=hn(x*.35,z*.35)*.12;                                             // 大範圍的起伏
  const ch=Math.exp(-Math.pow((x-6*Math.sin(z*.045)-4)/2.6,2))*.16+Math.exp(-Math.pow((x+14+5*Math.sin(z*.06+1))/2,2))*.12;   // 兩條彎曲的潮溝
  return und+rip-ch*(1-sk)+sk*.18; }
window.__tideH=hAt;
// 粗地面在任一點的實際高度（和地面網格一樣的雙線性插值）：挖掘面的邊緣要剛好貼齊，才不會出現鋸齒裂縫
function gAt(x,z){ const cs=200/GN, fx=(x+100)/cs, fz=(z+100)/cs, i=Math.floor(fx), j=Math.floor(fz), u=fx-i, v=fz-j, X=k=>-100+k*cs;
  const h00=hAt(X(i),X(j)), h10=hAt(X(i+1),X(j)), h01=hAt(X(i),X(j+1)), h11=hAt(X(i+1),X(j+1)); return (h00*(1-u)+h10*u)*(1-v)+(h01*(1-u)+h11*u)*v; }
const edgeK=(lx,lz)=>{ const e=Math.max(Math.abs(lx),Math.abs(lz))/(.8/2); return 1-Math.min(1,Math.max(0,(e-.7)/.3)); };   // 挖掘面中間用精細高度、邊緣過渡到粗地面高度
const GN=220, gg=new T.PlaneGeometry(200,200,GN,GN).rotateX(-Math.PI/2), gp=gg.attributes.position;
for(let k=0;k<gp.count;k++) gp.setY(k,hAt(gp.getX(k),gp.getZ(k)));
gg.computeVertexNormals();
const gmat=new T.MeshStandardMaterial({color:0xb8aea0,map:mudT,normalMap:mudN,normalScale:new T.Vector2(1.1,1.1),roughness:.42,metalness:0});
const HOLES=[]; for(let i=0;i<8;i++) HOLES.push(new T.Vector3(0,0,0));
const GU={uHoles:{value:HOLES},uHoleOn:{value:1},uTW:{value:0},uSkyK:{value:1},uSeepY:{value:-9}}; gmat.userData.sh={uniforms:GU};   /* 地面和挖掘區共用同一組時間／天光參數 */
gmat.onBeforeCompile=sh=>{ sh.uniforms.tSand={value:sandT}; sh.uniforms.tSandN={value:sandN}; sh.uniforms.uTW=GU.uTW; sh.uniforms.uHoles=GU.uHoles; sh.uniforms.uHoleOn=GU.uHoleOn; sh.uniforms.uSkyK=GU.uSkyK; sh.uniforms.uSeepY=GU.uSeepY;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP2;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWP2=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform vec3 uHoles[8]; uniform float uHoleOn; uniform sampler2D tSand; uniform sampler2D tSandN; uniform float uTW; uniform float uSkyK; uniform float uSeepY; varying vec3 vWP2;
float th(vec2 p){ return sin(p.x*.13+sin(p.y*.07)*1.7)*.5+sin(p.y*.11-p.x*.05)*.5; }
float sandKf(vec2 p){ float e=34.+th(p*vec2(1.7,1.3))*7.+sin(p.x*.21)*2.5; return clamp((p.y-(e-4.))/8.,0.,1.); }`)
  .replace('#include <map_fragment>',`
  if(uHoleOn>.5){ for(int i=0;i<8;i++){ vec3 h=uHoles[i]; if(h.z>0.&&abs(vWP2.x-h.x)<h.z&&abs(vWP2.z-h.y)<h.z) discard; } }   // 挖掘區那一塊的粗地面挖空，換成細緻的挖掘面（不然原本的地面會蓋住洞）
  vec2 uvA=vWP2.xz*.29, uvB=vec2(vWP2.x*.83-vWP2.z*.55,vWP2.x*.55+vWP2.z*.83)*.071;   // 兩種尺度、旋轉錯開，看不出重複
  float sk=sandKf(vWP2.xz) + (texture2D(tSand,vWP2.xz*.9).r-.5)*.25; sk=clamp(sk,0.,1.);
  vec3 mudC=mix(texture2D(map,uvA).rgb,texture2D(map,uvB).rgb,.35), sandC=mix(texture2D(tSand,uvA*1.1).rgb,texture2D(tSand,uvB).rgb,.3);
  float wet=1.-smoothstep(-.06,.06,vWP2.y);   // 越低越濕越暗
  vec4 texelColor=vec4(mix(pow(mudC,vec3(1.25))*.82*(1.-.25*wet),sandC*(.9-.1*wet),sk),1.);   // 泥比較深、對比高
  texelColor=mapTexelToLinear(texelColor); diffuseColor*=texelColor;
  float macro=th(vWP2.xz*.4)*.5+.5; diffuseColor.rgb*=.85+.2*macro;`)
  .replace('#include <normal_fragment_maps>',`
  { vec3 nm=mix(texture2D(normalMap,vWP2.xz*.29).xyz,texture2D(tSandN,vWP2.xz*.3).xyz,clamp(sandKf(vWP2.xz),0.,1.))*2.-1.; nm.xy*=normalScale;
    #ifdef USE_TANGENT
    normal=normalize(vTBN*nm);
    #else
    normal=perturbNormal2Arb(-vViewPosition,normal,nm,faceDirection);
    #endif
  }`)
  .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
  { float skR=clamp(sandKf(vWP2.xz),0.,1.); float wetR=1.-smoothstep(-.12,.02,vWP2.y);
    roughnessFactor=mix(mix(.3,.16,wetR),.88,skR);   // 泥：濕亮（越靠水越像抹了一層水）；沙：乾霧
    roughnessFactor+= (texture2D(map,vWP2.xz*1.7).r-.5)*.25; }`)
  .replace('#include <dithering_fragment>',`#include <dithering_fragment>
  if(uHoleOn>.5){ float wl=-.105, dep=wl-vWP2.y;   /* 只有地面算潮溝積水；挖掘洞裡的水由滲水處理 */                                            // 水深
    if(dep>-.02&&uHoleOn>.5){ vec3 V=normalize(cameraPosition-vWP2);   /* 挖掘面不套用潮溝積水（洞底原本被當成水面、反射天空變灰白） */ 
      vec2 p=vWP2.xz; float t=uTW; vec3 n=normalize(vec3((sin(p.x*3.1+p.y*1.3+t*1.6)+sin(p.x*7.9-p.y*6.1+t*3.3)*.4+sin(p.x*17.-p.y*13.+t*5.)*.25)*.07,1.,(cos(p.x*2.3-p.y*3.7-t*1.4)+cos(p.x*5.3+p.y*2.9+t*2.6)*.5+cos(p.x*15.+p.y*19.-t*4.)*.25)*.07));
      float fr=.03+.97*pow(1.-max(dot(n,V),0.),5.);                            // 斜看反射多、正看透明
      vec3 R=reflect(-V,n); float up=clamp(R.y,0.,1.); vec3 skyC=mix(vec3(.4,.43,.46),vec3(.24,.27,.31),up)*uSkyK*(.85+.3*sin(p.x*1.7+p.y*1.1+t*.4));   /* 天空倒影暗一點、有起伏，不再像一團白霧 */   // 天空反射（陰天灰）
      vec3 under=gl_FragColor.rgb*mix(.85,.45,clamp(dep*8.,0.,1.));               // 淺水看得到泥，越深越暗
      float a=smoothstep(-.02,.012,dep);                                           // 水邊柔和過渡，不再是鋸齒多邊形
      float rim=smoothstep(.0,.01,dep)*(1.-smoothstep(.01,.03,dep));   /* 水邊一圈濕暗的泥線 */
      gl_FragColor.rgb=mix(gl_FragColor.rgb*(1.-.35*rim), mix(under,skyC,fr*.7)+pow(max(dot(R,normalize(vec3(.3,.8,-.5))),0.),160.)*.18, a*(1.-.4*rim)); } }`);
};
gmat.customProgramCacheKey=()=>'tideGround';
const ground=new T.Mesh(gg,gmat); S.add(ground);
gmat.envMapIntensity=.45;
// 積水：一片略高於最低處的水面，只在低窪地方露出來；反射天空
const pud=new T.Mesh(new T.PlaneGeometry(200,200).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x9aa6a8,roughness:.04,metalness:.9,transparent:true,opacity:.75}));
pud.position.y=-.105; pud.visible=false; S.add(pud);   /* 水改在地面著色器裡算（水邊柔和），這片平面不再顯示 */
const sandBand={position:new T.Vector3()};
// 泥面上的碎貝殼、小石頭：真的 3D 小物件（近看有厚度、有影子），只撒在鏡頭附近的範圍
{ const shellG=new T.SphereGeometry(1,10,6,0,Math.PI*2,0,Math.PI/2); shellG.scale(1,.32,.8);   // 半顆蛋殼形＝碎貝殼
  const stoneG=new T.IcosahedronGeometry(1,1); { const P=stoneG.attributes.position; for(let k=0;k<P.count;k++){ const f=.8+Math.random()*.35; P.setXYZ(k,P.getX(k)*f,P.getY(k)*f*.55,P.getZ(k)*f); } stoneG.computeVertexNormals(); }
  const shellM=new T.MeshStandardMaterial({color:0x8a8072,roughness:.8,side:T.DoubleSide}), stoneM=new T.MeshStandardMaterial({color:0xffffff,roughness:.85});
  const NS=900, NT=260, IS=new T.InstancedMesh(shellG,shellM,NS), IT=new T.InstancedMesh(stoneG,stoneM,NT), m4=new T.Matrix4(), q=new T.Quaternion(), e=new T.Euler(), v=new T.Vector3(), sc=new T.Vector3(), col=new T.Color();
  const SH=[0xe8dccb,0xd9c3a5,0xc9b8a8,0xf0e6da,0xb89a86,0xa8a092], ST=[0x5d574f,0x7a7066,0x4a4540,0x8b8174];
  for(let i=0;i<NS;i++){ const x=(Math.random()-.5)*44, z=Math.random()*-46+22, r=.01+Math.pow(Math.random(),2.5)*.035;
    e.set((Math.random()-.5)*.6+(Math.random()<.3?Math.PI:0),Math.random()*6.28,(Math.random()-.5)*.6); q.setFromEuler(e); v.set(x,hAt(x,z)+r*.1,z); sc.setScalar(r);
    m4.compose(v,q,sc); IS.setMatrixAt(i,m4); IS.setColorAt(i,col.setHex(SH[i%SH.length]).multiplyScalar(.8+Math.random()*.3)); }
  for(let i=0;i<NT;i++){ const x=(Math.random()-.5)*44, z=Math.random()*-46+22, r=.012+Math.pow(Math.random(),3)*.05;
    e.set(Math.random()*.4,Math.random()*6.28,Math.random()*.4); q.setFromEuler(e); v.set(x,hAt(x,z)+r*.2,z); sc.setScalar(r);
    m4.compose(v,q,sc); IT.setMatrixAt(i,m4); IT.setColorAt(i,col.setHex(ST[i%ST.length]).multiplyScalar(.85+Math.random()*.3)); }
  S.add(IS); S.add(IT); }
// 潮溝積水：表面有細細的流水波紋（不再是靜止的鏡子）
pud.material.onBeforeCompile=sh=>{ sh.uniforms.uT={value:0}; pud.userData.sh=sh;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWQ;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWQ=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uT; varying vec3 vWQ;').replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
  { vec2 p=vWQ.xz; float a=sin(p.x*3.1+p.y*1.3+uT*1.6)+sin(p.x*-1.7+p.y*4.3-uT*2.1)*.7+sin(p.x*7.9-p.y*6.1+uT*3.3)*.3;
    float b=cos(p.x*2.3-p.y*3.7-uT*1.4)+cos(p.x*5.3+p.y*2.9+uT*2.6)*.5; normal=normalize(normal+vec3(a*.035,0.,b*.035)); }`); };
pud.material.customProgramCacheKey=()=>'tidePud';   // 舊程式相容用（沙地已併入地形）
new T.TextureLoader().load('sky_ovc_light.jpg',t=>{ t.mapping=T.EquirectangularReflectionMapping; t.encoding=T.sRGBEncoding; try{ const pm=new T.PMREMGenerator(W.renderer); const env=pm.fromEquirectangular(t).texture; gmat.envMap=env; gmat.envMapIntensity=.45; pud.material.envMap=env; pud.material.envMapIntensity=1.2; gmat.needsUpdate=pud.material.needsUpdate=true; pm.dispose(); }catch(e){} });
// 海水：從遠處慢慢漲回來
const sea=new T.Mesh(new T.PlaneGeometry(400,300).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x4d6a72,roughness:.12,metalness:.3,transparent:true,opacity:.92})); sea.position.set(0,.06,-200); S.add(sea);
// 撤離路線：竹竿＋褪色的布旗（漲潮警告時亮起），布會隨風飄
const route=new T.Group(); S.add(route); route.visible=false; const flags=[];
const bambooM=new T.MeshStandardMaterial({color:0xb59a62,roughness:.6}), nodeM=new T.MeshStandardMaterial({color:0x8d7444,roughness:.7});
const clothTex=(()=>{ const c=document.createElement('canvas'); c.width=64; c.height=40; const g=c.getContext('2d'); g.fillStyle='#d4502a'; g.fillRect(0,0,64,40);
  for(let i=0;i<500;i++){ g.fillStyle=`rgba(${Math.random()<.5?'255,220,190':'90,30,10'},${Math.random()*.12})`; g.fillRect(Math.random()*64,Math.random()*40,1+Math.random()*2,1); }
  g.fillStyle='rgba(255,255,255,.18)'; g.fillRect(0,0,64,3); g.fillRect(0,37,64,3); const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; })();
for(let i=0;i<9;i++){ const x=Math.sin(i*.6)*1.5, z=30-i*7, y0=hAt(x,z), H=1.6;
  const pole=new T.Mesh(new T.CylinderGeometry(.022,.028,H,8),bambooM); pole.position.set(x,y0+H/2-.15,z); pole.rotation.z=(Math.random()-.5)*.08; route.add(pole);
  for(let n=1;n<5;n++){ const nd=new T.Mesh(new T.TorusGeometry(.026,.006,5,10),nodeM); nd.rotation.x=Math.PI/2; nd.position.set(0,-H/2+n*H/5,0); pole.add(nd); }   // 竹節
  const fg=new T.PlaneGeometry(.5,.32,14,6); fg.translate(.25,0,0);
  const fl=new T.Mesh(fg,new T.MeshStandardMaterial({map:clothTex,side:T.DoubleSide,roughness:.95})); fl.position.set(0,H/2-.2,0); pole.add(fl);
  flags.push({g:fg,base:fg.attributes.position.array.slice(),ph:Math.random()*6}); }
// 撤離指引：地上一排發光的箭頭，從腳下一路指向岸邊，依序閃爍（像跑馬燈）；越接近滿潮越紅、閃得越快
const chev=new T.Group(); S.add(chev); chev.visible=false;
{ const sh=new T.Shape(); sh.moveTo(0,.32); sh.lineTo(.36,-.05); sh.lineTo(.22,-.05); sh.lineTo(0,.17); sh.lineTo(-.22,-.05); sh.lineTo(-.36,-.05); sh.closePath();
  const cg=new T.ShapeGeometry(sh).rotateX(-Math.PI/2); for(let i=0;i<10;i++){ const m=new T.Mesh(cg,new T.MeshBasicMaterial({color:0xffc23a,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending})); m.rotation.y=Math.PI; chev.add(m); } }
function chevTick(t,left){ chev.visible=left<=40&&!dig; if(!chev.visible) return; const urg=clamp(1-left/40,0,1), col=new T.Color().setHSL(.12-.12*urg,1,.55);
  chev.children.forEach((m,i)=>{ const z=pos.z+1.6+i*1.5, x=pos.x+(0-pos.x)*Math.min(1,i/8)*.3; m.position.set(x,hAt(x,z)+.02,z); m.rotation.y=Math.PI; m.scale.setScalar(1.6);
    const ph=((t*(1.2+urg*1.8))-i*.18)%1; m.material.color.copy(col); m.material.opacity=Math.min(1,.25+Math.max(0,1-ph*2.2)*1.2)*(z>34?.2:1); }); }
function flagTick(t){ if(!route.visible) return; flags.forEach(f=>{ const P=f.g.attributes.position, b=f.base;
  for(let k=0;k<P.count;k++){ const x=b[k*3], y=b[k*3+1], w=x/.5; P.setZ(k,Math.sin(t*6+f.ph-x*9)*.06*w+Math.sin(t*3.3+y*6)*.015*w); P.setY(k,y-w*w*.04); } P.needsUpdate=true; f.g.computeVertexNormals(); }); }
/* ---------- 生物資料 ---------- */
const CR={
  hardclam:{n:'文蛤',sign:'hole',depth:2.0,size:[.04,.09],hard:1,price:90,desc:'泥面上一個會噴水的小圓孔。'},
  gomphina:{n:'赤嘴蛤',sign:'key',depth:1.8,size:[.03,.06],hard:1,price:110,desc:'並排的兩個小孔，是入水管和出水管。'},
  tellin:{n:'海瓜子',sign:'pellet',depth:1.2,size:[.015,.03],hard:.5,fragile:1,price:60,desc:'細細的爪痕和小沙球附近，殼又薄又脆。'},
  razor:{n:'竹蟶',sign:'slit',depth:2.3,size:[.07,.13],hard:.8,dive:1,price:140,desc:'細長的凹痕，牠直立埋在泥裡，一受驚就往下縮。'},
  ghostcrab:{n:'沙蟹',sign:'burrow',depth:1.6,size:[.04,.07],hard:.6,flee:1,price:70,desc:'洞口有一堆新挖出來的沙。動作太慢牠會從另一頭溜走。'},
  ragworm:{n:'沙蠶',sign:'cast',depth:1.0,size:[.1,.2],hard:0,soft:1,price:20,bait:1,desc:'盤繞的泥條是牠排出來的。挖到可以當魚餌。'}
};
const SURF={fiddler:{n:'招潮蟹',price:40},mudskip:{n:'彈塗魚',price:55},hermit:{n:'寄居蟹',price:35}};
const ALL=Object.assign({},CR,SURF);
/* ---------- 泥面痕跡貼花（程式畫，跟實拍泥地融在一起） ---------- */
function decal(kind){ const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d'); g.translate(64,64);
  const hole=(x,y,r)=>{ const rg=g.createRadialGradient(x,y,0,x,y,r*2.2); rg.addColorStop(0,'rgba(20,16,10,1)'); rg.addColorStop(.45,'rgba(40,32,22,.9)'); rg.addColorStop(.6,'rgba(150,140,120,.5)'); rg.addColorStop(1,'rgba(150,140,120,0)'); g.fillStyle=rg; g.beginPath(); g.arc(x,y,r*2.2,0,7); g.fill(); };
  if(kind==='hole') hole(0,0,6);
  if(kind==='key'){ hole(-6,0,4.5); hole(6,0,4.5); }
  if(kind==='slit'){ g.fillStyle='rgba(28,22,14,.95)'; g.beginPath(); g.ellipse(0,0,14,4,0,0,7); g.fill(); g.strokeStyle='rgba(160,150,128,.6)'; g.lineWidth=3; g.stroke(); }
  if(kind==='pellet'){ for(let i=0;i<46;i++){ const a=Math.random()*7, r=8+Math.random()*34; g.fillStyle='rgba(120,108,88,.95)'; g.beginPath(); g.arc(Math.cos(a)*r,Math.sin(a)*r,2.2+Math.random()*1.6,0,7); g.fill(); }
    g.strokeStyle='rgba(60,50,36,.6)'; g.lineWidth=1.4; for(let i=0;i<12;i++){ const a=Math.random()*7; g.beginPath(); g.moveTo(Math.cos(a)*6,Math.sin(a)*6); g.lineTo(Math.cos(a)*30,Math.sin(a)*30); g.stroke(); } hole(0,0,3); }
  if(kind==='burrow'){ g.fillStyle='rgba(176,164,138,.95)'; g.beginPath(); g.ellipse(14,10,26,16,.4,0,7); g.fill(); hole(-8,-6,9); }
  if(kind==='cast'){ g.strokeStyle='rgba(84,70,50,.95)'; g.lineWidth=6; g.lineCap='round'; g.beginPath(); for(let t=0;t<14;t+=.2){ const r=4+t*2.2; g.lineTo(Math.cos(t)*r,Math.sin(t)*r); } g.stroke(); }
  if(kind==='flat'){ g.fillStyle='rgba(90,80,64,.25)'; g.beginPath(); g.arc(0,0,10,0,7); g.fill(); }
  const t=new T.CanvasTexture(cv); return new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}); }
const DEC={}; ['hole','key','slit','pellet','burrow','cast','flat'].forEach(k=>DEC[k]=decal(k));
let signs=[];
const ringG=new T.RingGeometry(.36,.5,40).rotateX(-Math.PI/2), ringM=new T.MeshBasicMaterial({color:0xffe08a,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
// 立體的痕跡細節：讓每種痕跡一眼看得出差別（找哪裡挖本身就是樂趣）
const SD={wet:new T.MeshStandardMaterial({color:0x140f0b,roughness:.08,metalness:.2}),lip:new T.MeshStandardMaterial({color:0x3d3227,roughness:.25}),sand:new T.MeshStandardMaterial({color:0x8a7558,roughness:.85}),cast:new T.MeshStandardMaterial({color:0x4a3d30,roughness:.35})};
function signDetail(kind){ const g=new T.Group();
  const hole=(r,x,z)=>{ const d=new T.Mesh(new T.CircleGeometry(r,16).rotateX(-Math.PI/2),SD.wet); d.position.set(x,.004,z); g.add(d); const l=new T.Mesh(new T.TorusGeometry(r*1.25,r*.35,6,16),SD.lip); l.rotation.x=Math.PI/2; l.scale.z=.45; l.position.set(x,.004,z); g.add(l); };
  if(kind==='hole') hole(.022,0,0);                                        // 文蛤：一個濕亮的小圓孔，孔邊微微隆起
  else if(kind==='key'){ hole(.016,-.02,0); hole(.016,.02,0); }              // 赤嘴蛤：兩個並排的孔
  else if(kind==='slit'){ const d=new T.Mesh(new T.CircleGeometry(.05,20).rotateX(-Math.PI/2),SD.wet); d.scale.set(.35,1,1); d.position.y=.004; g.add(d); const l=new T.Mesh(new T.TorusGeometry(.05,.012,6,20),SD.lip); l.rotation.x=Math.PI/2; l.scale.set(.4,1,.4); l.position.y=.004; g.add(l); }   // 竹蟶：細長的鑰匙孔
  else if(kind==='mound'){ hole(.035,0,0); const c2=new T.Mesh(new T.ConeGeometry(.14,.05,14),SD.sand); c2.position.set(.13,.02,.04); c2.scale.z=.7; g.add(c2); for(let i=0;i<10;i++){ const b=new T.Mesh(new T.SphereGeometry(.008,6,4),SD.sand); b.position.set(.05+Math.random()*.2,.006,(Math.random()-.5)*.2); g.add(b); } }   // 沙蟹：大洞＋新挖出來的沙堆
  else if(kind==='pellet'){ for(let i=0;i<34;i++){ const a=Math.random()*6.28, r=.03+Math.random()*.18; const b=new T.Mesh(new T.SphereGeometry(.0055,5,4),SD.sand); b.position.set(Math.cos(a)*r,.005,Math.sin(a)*r); g.add(b); } hole(.01,0,0); }   // 海瓜子：一圈小沙球
  else if(kind==='coil'){ const pts=[]; for(let i=0;i<40;i++){ const a=i*.42, r=.015+i*.0028; pts.push(new T.Vector3(Math.cos(a)*r,.008+Math.sin(i*1.7)*.002,Math.sin(a)*r)); } g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),80,.0065,6),SD.cast)); }   // 沙蠶：一圈圈盤繞的泥條
  else return null; return g; }
const TIDETEST=/[?&]tidetest=1/.test(location.search);
function spawnSigns(){ signs.forEach(s=>{ S.remove(s.m); if(s.m.userData.det) S.remove(s.m.userData.det); }); signs=[]; const kinds=Object.keys(CR);
  if(TIDETEST){ const kinds=Object.keys(CR); let n=0;   // 測試版：每種生物 6 個，排成好找的幾排，就在下灘處前方
    for(let r=0;r<kinds.length;r++) for(let q=0;q<6;q++){ const k=kinds[r], sign=CR[k].sign, m=new T.Mesh(new T.PlaneGeometry(.9,.9).rotateX(-Math.PI/2),DEC[sign]); const x=-7.5+q*3+(r%2)*1.5, z=14-r*3.2;
      m.position.set(x,hAt(x,z)+.015,z); m.rotation.y=rand(0,6.28); m.scale.setScalar(1.35); S.add(m); const det=signDetail(sign); if(det){ det.position.copy(m.position); det.position.y=m.position.y-.012; det.rotation.y=m.rotation.y; S.add(det); m.userData.det=det; }
      signs.push({m,k,sign,ring:null,done:false,spurt:rand(2,6)}); n++; } return; }
  const beds=[]; for(let b=0;b<16;b++) beds.push([rand(-15,15),rand(-30,13),kinds[Math.floor(Math.random()*kinds.length)]]);   // 一片片的生物床：同一區常是同一種
  for(let i=0;i<110;i++){ const bd=beds[i%beds.length], k=Math.random()<.12?null:(Math.random()<.65?bd[2]:kinds[Math.floor(Math.random()*kinds.length)]);
    const sign=k?CR[k].sign:'flat', m=new T.Mesh(new T.PlaneGeometry(.9,.9).rotateX(-Math.PI/2),DEC[sign]); m.position.set(bd[0]+rand(-3.5,3.5),0,bd[1]+rand(-3.5,3.5)); m.position.y=hAt(m.position.x,m.position.z)+.015; m.rotation.y=rand(0,6.28); S.add(m);
    const ring=null; m.scale.setScalar(1.35);   // 不再用提示光圈：痕跡本身放大、做成立體的
    const det=signDetail(sign); if(det){ det.position.copy(m.position); det.position.y=m.position.y-.012; det.rotation.y=m.rotation.y; S.add(det); m.userData.det=det; }
    signs.push({m,k,sign,ring,done:false,spurt:rand(2,6)}); } }
/* ---------- 泥面上的活生物（3D 模型＋骨架） ---------- */
let roamers=[];
function spawnRoamers(){ roamers.forEach(r=>S.remove(r.g)); roamers=[];
  for(const [id,n] of (TIDETEST?[['fiddler',18],['mudskip',12],['hermit',12]]:[['fiddler',12],['mudskip',8],['hermit',7]])) for(let i=0;i<n;i++){ const sp=c.species(id); let f=null; try{ if(creaReady(id)) f=creaModel(sp); }catch(e){} if(!f) continue;
    const L=sp?(sp.len[0]+Math.random()*(sp.len[1]-sp.len[0]))/100:.05; f.group.scale.setScalar(L*2.4); f.group.position.set(rand(-12,12),0,rand(-22,10));   /* 手機螢幕小：畫面上放大一些才看得到 */ f.group.position.y=hAt(f.group.position.x,f.group.position.z)+.01; S.add(f.group);
    roamers.push({id,g:f.group,uni:f.uni,h:rand(0,6.28),t:rand(0,3),hop:0,L,flee:0}); } }
/* ---------- 狀態 ---------- */
let on=false, yaw=0, pitch=-.32, pos=new T.Vector3(0,1.6,18), bag=[], warned=0, evac=false, endH=0;
const LOW=[[3,8],[15,20]];   /* 退潮 5 小時；在泥灘上時間走得比較慢（見 d.js），實際可以玩約 20 分鐘 */
function lowWin(h){ for(const w of LOW) if(h>=w[0]&&h<w[1]) return w; return null; }
function nextLow(h){ for(const w of LOW) if(h<w[0]) return w[0]; return LOW[0][0]+24; }
/* ---------- HUD ---------- */
const hud=document.createElement('div'); hud.id='tideHud'; hud.innerHTML=`<button id="tdCageB">🧺 拖籠</button><button id="tdStomp">👣 跺腳</button><div id="tdClock"></div><div id="tdBag"></div><div id="tdShore"><span id="tdArr">⬆</span> 岸邊 <b id="tdDist"></b></div><div id="tdHint">看泥面的痕跡判斷底下是什麼，點痕跡開挖・拖曳轉頭・兩指或上下拖曳前進</div><button id="tdExit">⬅ 回岸上</button>`;
document.body.appendChild(hud);
const st=document.createElement('style'); st.textContent=`body.attide #top,body.attide #top2,body.attide #act,body.attide #joy,body.attide #hint,body.attide #magWin,body.attide #hotChip,body.attide #steer,body.attide #dragBtn,body.attide #combo,body.attide #goal,body.attide #castTag,body.attide #depthChip,body.attide #uwTag,body.attide #tag,body.attide #scare,body.attide #fxBar,body.attide #bTour,body.attide #bViewBack,body.attide #bShot,body.attide #scene{display:none!important}
#tideHud{position:fixed;inset:0;pointer-events:none;z-index:6;display:none;font-family:inherit}
#tideHud>div,#tideHud>button{position:absolute;pointer-events:auto}
#tdClock{left:12px;max-width:52vw!important;top:calc(env(safe-area-inset-top,0px) + 12px);background:rgba(10,20,24,.72);color:#fff;border-radius:14px;padding:8px 12px;font-weight:700;font-size:14px;max-width:62vw}
#tdShore{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 70px);background:rgba(10,20,24,.72);color:#fff;border-radius:999px;padding:6px 14px;font-size:14px;font-weight:700;z-index:6}
#tdShore.warn{background:#c0392b;font-size:16px;animation:tdp 1s infinite}@keyframes tdp{50%{transform:translateX(-50%) scale(1.08)}}
#tdArr{display:inline-block;transition:transform .15s}
#tdStomp{position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 90px);z-index:7;border:0;border-radius:999px;padding:12px 16px;background:rgba(10,20,24,.78);color:#fff;font-weight:800;font-size:15px}
#tdCageB{position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 146px);z-index:7;border:0;border-radius:999px;padding:12px 16px;background:rgba(10,20,24,.78);color:#fff;font-weight:800;font-size:15px}
#tdCage{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:9;display:none;flex-direction:column;align-items:center;pointer-events:none;background:linear-gradient(transparent,rgba(0,0,0,.55) 30%);padding:26px 0 6px;color:#fff;text-align:center;font-size:14px;text-shadow:0 1px 2px #000}
#tdCage i{display:block;width:170px;height:9px;border-radius:9px;background:rgba(255,255,255,.2);overflow:hidden;margin:6px 0}#tdCage b{display:block;height:100%;background:#c9a76a}
#cgBtns{display:flex;gap:10px;pointer-events:auto}#cgBtns button{border:0;border-radius:999px;padding:10px 18px;font-weight:800}
#tdCoach{position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 168px);z-index:11;display:none;background:rgba(255,248,226,.96);color:#3a2a10;border-radius:16px;padding:12px 14px;font-size:14px;line-height:1.55;box-shadow:0 6px 24px rgba(0,0,0,.45);pointer-events:auto}
#tdCoach button{display:block;margin:8px 0 0 auto;border:0;background:none;color:#8a6a3a;font-size:12px;text-decoration:underline}
#tdBag{right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);background:rgba(10,20,24,.72);color:#fff;border-radius:14px;padding:8px 12px;font-size:13px}
#tdHint{left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 74px);text-align:center;color:#fff;text-shadow:0 1px 3px #000;font-size:13px}
#tdExit{left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);border:0;border-radius:999px;padding:12px 22px;background:#ffcf66;color:#3a2600;font-weight:800;font-size:15px}
#tdWarn{position:fixed;left:50%;top:30%;transform:translateX(-50%);z-index:8;background:rgba(170,30,20,.92);color:#fff;border-radius:16px;padding:14px 18px;font-weight:800;font-size:15px;text-align:center;display:none;max-width:86vw;line-height:1.5}
#digBox{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:9;display:none;align-items:center;justify-content:center;flex-direction:column;pointer-events:none;background:linear-gradient(transparent,rgba(0,0,0,.55) 30%);padding:28px 0 6px}
#digSpd{display:flex;align-items:center;gap:8px;color:#fff;font-size:12px;font-weight:700;margin-bottom:6px;text-shadow:0 1px 2px #000}#digSpd i{display:block;width:150px;height:9px;border-radius:9px;background:rgba(255,255,255,.18);overflow:hidden}#digSpd b{display:block;height:100%;width:0;border-radius:9px;transition:width .08s}
#digInfo{color:#fff;margin-top:0;font-size:14px;text-align:center;min-height:42px;padding:0 16px;text-shadow:0 1px 2px #000}
#digBtns{display:flex;gap:8px;margin-top:8px;pointer-events:auto;flex-wrap:wrap;justify-content:center;padding:0 10px}#digBtns button{border:0;border-radius:999px;padding:10px 14px;font-weight:800;font-size:14px;white-space:nowrap}`;
document.head.appendChild(st);
const warnEl=document.createElement('div'); warnEl.id='tdWarn'; document.body.appendChild(warnEl);
const $=id=>document.getElementById(id);
function bagText(){ $('tdBag').textContent='🪣 桶子 '+bag.length+' 個・約 🪙'+bag.reduce((a,b)=>a+b.v,0).toLocaleString(); }
/* ---------- 聲音與震動（每一層不同） ---------- */
let AC=null; function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function noise(dur,f,q,vol){ const a=ac(); if(!a) return; const b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
  const s=a.createBufferSource(); s.buffer=b; const fl=a.createBiquadFilter(); fl.type='bandpass'; fl.frequency.value=f; fl.Q.value=q; const g=a.createGain(); g.gain.value=vol; s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(); }
/* ---------- 貝類模型：兩片真的殼（上下兩片拱起的殼瓣，殼頂鉸鏈相連），殼面用你提供的實拍圖，殼的輪廓照原圖裁切 ----------
   （AI 生成的貝類模型像一片缺角的碎殼，改成程式組出來的兩片殼，開合也是真的兩片在動） */
const SHELLS=new Set(['hardclam','gomphina','tellin']), shellTex={}, shellOk={};
const SHELL_SHAPE={hardclam:{w:1,l:.9,h:.2},gomphina:{w:1,l:.92,h:.17},tellin:{w:1,l:.72,h:.07}};
function shellModel(id){ if(!shellTex[id]){ const t=new T.TextureLoader().load('models/tide/shell_'+id+'.png',()=>{ shellOk[id]=1; }); t.encoding=T.sRGBEncoding; t.anisotropy=8; shellTex[id]=t; }
  const sh=SHELL_SHAPE[id]||SHELL_SHAPE.hardclam, mat=new T.MeshStandardMaterial({map:shellTex[id],alphaTest:.5,side:T.DoubleSide,roughness:id==='tellin'?.25:.4,metalness:0});
  mat.onBeforeRender=null; const tx0=shellTex[id];
  const valve=(up)=>{ const g=new T.SphereGeometry(.5,40,14,0,Math.PI*2,0,Math.PI/2); const P=g.attributes.position, uv=g.attributes.uv;
    for(let i=0;i<P.count;i++){ const x=P.getX(i)*sh.w, z=P.getZ(i)*sh.l, y=P.getY(i)*sh.h*2; P.setXYZ(i,x,up?y:-y,z); uv.setXY(i,x/sh.w+.5,1-(z/sh.l+.5)); }   // 殼面照片從正上方投影
    g.translate(0,0,sh.l*.47); g.computeVertexNormals(); return new T.Mesh(g,mat); };   // 鉸鏈（殼頂）放在原點
  const group=new T.Group(), body=new T.Group(), top=new T.Group(), bot=valve(false); top.add(valve(true)); body.add(top); body.add(bot); body.position.z=-sh.l*.47; group.add(body);
  const meat=new T.Mesh(new T.SphereGeometry(.42,16,8),new T.MeshStandardMaterial({color:0xe9d6c3,roughness:.6})); meat.scale.set(sh.w*.9,.12,sh.l*.85); meat.position.z=sh.l*.47; body.add(meat);   // 殼張開時看得到裡面的肉
  body.rotation.y=Math.PI/2;   // 殼頂朝 +X，和其他模型一樣「頭朝前」
  const uni={uSwim:{value:0},uAmp:{value:0}}; group.onBeforeRender=()=>{}; body.onBeforeRender=()=>{};
  group.traverse(o=>{ if(o.isMesh&&o.material===mat){ o.visible=!!shellOk[id]; } });   // 殼面照片還沒下載完不顯示（避免出現白色圓盤）
  const ob=()=>{ [top.children[0],bot].forEach(m=>{ m.visible=!!shellOk[id]; }); }; ob(); if(!shellOk[id]){ const iv=setInterval(()=>{ ob(); if(shellOk[id]) clearInterval(iv); },300); }
  top.children[0].onBeforeRender=()=>{ meat.visible=!uni.closed&&uni.uAmp.value>.04; top.rotation.x=uni.closed?0:-Math.min(.32,uni.uAmp.value*1.6)*(.6+.4*Math.max(0,Math.sin(uni.uSwim.value*.5))); };   // 上殼繞鉸鏈開合
  return {group,uni,shell:true}; }
function razorModel(){ if(!shellTex.razor){ const t=new T.TextureLoader().load('models/tide/shell_razor.png',()=>{ shellOk.razor=1; }); t.encoding=T.sRGBEncoding; t.anisotropy=8; shellTex.razor=t; }
  const mat=new T.MeshStandardMaterial({map:shellTex.razor,alphaTest:.4,side:T.DoubleSide,roughness:.28,metalness:0}), group=new T.Group(), body=new T.Group(); group.add(body);
  const valve=up=>{ const g=new T.CylinderGeometry(.5,.5,1,28,1,true,up?0:Math.PI,Math.PI); g.rotateZ(Math.PI/2); const P=g.attributes.position, uv=g.attributes.uv;
    for(let i=0;i<P.count;i++){ const x=P.getX(i), y=P.getY(i)*.13, z=P.getZ(i)*.17; P.setXYZ(i,x,y,z); uv.setXY(i,x+.5,.5+z/.34*.9); } g.computeVertexNormals(); return new T.Mesh(g,mat); };   // 長筒形的兩片殼，各半圈
  const top=valve(true), bot=valve(false); body.add(top); body.add(bot);
  const foot=new T.Mesh(new T.SphereGeometry(.5,12,8),new T.MeshStandardMaterial({color:0xefe2cf,roughness:.55})); foot.scale.set(.14,.1,.12); foot.position.x=-.5; body.add(foot);   // 白色的斧足
  const uni={uSwim:{value:0},uAmp:{value:0}}; top.onBeforeRender=()=>{ const k=Math.min(1,uni.uAmp.value*5); foot.scale.x=.08+.12*k*(.5+.5*Math.sin(uni.uSwim.value*2)); foot.position.x=-.5-foot.scale.x*.4; };
  return {group,uni,shell:true}; }
/* ---------- 螃蟹（程式組裝）：背甲、眼柄、8 隻三節腳、一對螯，各部位貼使用者提供的實拍分件照片 ----------
   每隻腳都有髖、膝、腳尖三個關節，走路時左右交替抬腳；招潮蟹雄蟹的大螯會舉起來揮 */
const CRAB_TEX={}, crabTex=f=>{ if(!CRAB_TEX[f]){ const t=new T.TextureLoader().load('models/tide/crab/'+f+'.webp'); t.encoding=T.sRGBEncoding; t.anisotropy=8; CRAB_TEX[f]=t; } return CRAB_TEX[f]; };
const CRAB_DEF={ghostcrab:{cara:'ghost_cara',leg:'ghost_leg',clawR:'ghost_claw',clawL:'ghost_claw',cl:.86,cw:1,ch:.26,legL:1.25,clawRS:.62,clawLS:.62,eye:.34,eyeTall:1},
  fiddler:{cara:'fid_cara',leg:'fid_leg',clawR:'fid_major',clawL:'fid_minor',cl:.72,cw:1,ch:.22,legL:1.05,clawRS:1.35,clawLS:.42,eye:.4,eyeTall:.85,wave:1}};
function partMat(f){ return new T.MeshStandardMaterial({map:crabTex(f),alphaTest:.45,side:T.DoubleSide,roughness:.55,metalness:0}); }
// 一段腳／螯：照片中某一段（u0～u1）貼在十字交叉的兩片上（從上面、側面看都有形狀）
function seg(f,u0,u1,len,thick){ const g=new T.Group(), mat=partMat(f);
  const mk=(rx)=>{ const pg=new T.PlaneGeometry(len,thick); const uv=pg.attributes.uv; for(let i=0;i<uv.count;i++) uv.setX(i,u0+(u1-u0)*uv.getX(i)); pg.translate(len/2,0,0); const m=new T.Mesh(pg,mat); m.rotation.x=rx; return m; };
  g.add(mk(0)); g.add(mk(Math.PI/2)); return g; }
function crabModel(id){ const D=CRAB_DEF[id], group=new T.Group(), body=new T.Group(); group.add(body);
  // 背甲：拱起的殼，殼面照片從正上方投影；照片上方＝前（+X）
  const cg=new T.SphereGeometry(.5,40,16,0,Math.PI*2,0,Math.PI/2), P=cg.attributes.position, uv=cg.attributes.uv;
  for(let i=0;i<P.count;i++){ const x=P.getX(i)*D.cl, y=P.getY(i)*D.ch*2, z=P.getZ(i)*D.cw; P.setXYZ(i,x,y,z); uv.setXY(i,.5-z/D.cw,.5+x/D.cl); }
  cg.computeVertexNormals(); const cara=new T.Mesh(cg,partMat(D.cara)); cara.position.y=.16; body.add(cara);
  const belly=new T.Mesh(new T.CircleGeometry(.5,24).rotateX(Math.PI/2),new T.MeshStandardMaterial({color:0xd9cbb0,roughness:.7})); belly.scale.set(D.cl*.92,1,D.cw*.92); belly.position.y=.15; body.add(belly);
  // 眼柄＋眼睛
  const eyeM=new T.MeshStandardMaterial({color:0x111111,roughness:.15}), stalkM=new T.MeshStandardMaterial({color:id==='fiddler'?0xc8b48a:0xe0cfa8,roughness:.6});
  for(const s of [-1,1]){ const st=new T.Mesh(new T.CylinderGeometry(.022,.028,D.eye,8),stalkM); st.position.set(D.cl*.44,.2+D.eye*.42*D.eyeTall,s*.13); st.rotation.z=-.25; st.rotation.x=s*.12; body.add(st);
    const e=new T.Mesh(new T.SphereGeometry(.045,12,8),eyeM); e.scale.set(1,1.5,1); e.position.set(D.cl*.44+.04,.2+D.eye*.9*D.eyeTall,s*.15); body.add(e); }
  // 8 隻腳：左右各 4，沿殼的側緣從前到後排開，向外張開
  const legs=[], L=D.legL;
  for(const s of [-1,1]) for(let i=0;i<4;i++){ const hip=new T.Group(); const ax=D.cl*(.22-i*.17); hip.position.set(ax,.13,s*D.cw*.44); hip.rotation.y=-s*(Math.PI/2)+s*(i-1.5)*.32;
    const thigh=seg(D.leg,.06,.45,L*.42,.13*L); thigh.rotation.z=.5; hip.add(thigh);   // 大腿往上抬
    const knee=new T.Group(); knee.position.x=L*.42; thigh.add(knee); const shin=seg(D.leg,.45,.8,L*.34,.11*L); shin.rotation.z=-1.25; knee.add(shin);   // 小腿往下彎
    const ank=new T.Group(); ank.position.x=L*.34; shin.add(ank); const tip=seg(D.leg,.8,1,L*.24,.09*L); tip.rotation.z=-.45; ank.add(tip);
    if(s<0) hip.scale.z=-1; body.add(hip); legs.push({hip,thigh,shin,tip,s,i,y0:hip.rotation.y}); }
  // 一對螯（右邊大、左邊小；沙蟹兩邊一樣）
  const claws=[];
  for(const s of [-1,1]){ const f=s>0?D.clawR:D.clawL, sc=s>0?D.clawRS:D.clawLS, root=new T.Group(); root.position.set(D.cl*.4,.12,s*D.cw*.26); root.rotation.y=s*.55;
    const arm=seg(f,0,.35,.42*sc,.2*sc), hand=seg(f,.35,1,.78*sc,.36*sc); arm.rotation.z=.35; root.add(arm); const wr=new T.Group(); wr.position.x=.42*sc; arm.add(wr); hand.rotation.z=-.55; hand.rotation.y=-s*1.2; wr.add(hand);
    body.add(root); claws.push({root,arm,hand,s,big:sc>1}); }
  // 正規化：整體長度約 1（跟其他生物模型一樣的尺寸慣例）
  body.scale.setScalar(.8);
  const uni={uSwim:{value:0},uAmp:{value:0}};
  cara.onBeforeRender=()=>{ const ph=uni.uSwim.value, a=Math.min(1,uni.uAmp.value*4);
    legs.forEach(l=>{ const p=ph*1.6+(l.i%2?Math.PI:0)+(l.s>0?Math.PI/2:0), up=Math.max(0,Math.sin(p));   // 左右交替、前後錯開
      l.hip.rotation.y=l.y0+Math.sin(p)*.28*a*l.s; l.thigh.rotation.z=.5+up*.45*a; l.shin.rotation.z=-1.25-up*.2*a; });
    claws.forEach(c2=>{ if(D.wave&&c2.big){ const w=Math.sin(ph*.35)>.6?Math.sin(ph*3)*.5+.5:0; c2.arm.rotation.z=.35+w*.9; } else c2.arm.rotation.z=.35+Math.sin(ph*.8+c2.s)*.08*a; });
    body.position.y=Math.abs(Math.sin(ph*1.6))*.01*a; };
  return {group,uni,crab:true}; }
/* ---------- 寄居蟹（程式組裝）：立體螺殼（使用者的螺殼照片從側面投影）、從殼口探出的前半身、左右各兩隻三節腳；受驚會縮進殼裡 ---------- */
function hermitModel(){ const group=new T.Group(), body=new T.Group(); group.add(body);
  // 螺殼：沿 X 軸旋轉出來的殼形，殼口（大）在前、螺塔（尖）在後，表面有一圈圈起伏的螺肋
  const prof=[]; for(let i=0;i<=40;i++){ const t=i/40, r=(.34*Math.pow(1-t,.85)+.015)*(1+.08*Math.sin(t*44)); prof.push(new T.Vector2(Math.max(.004,r),t)); }
  const sg=new T.LatheGeometry(prof,36); sg.rotateZ(Math.PI/2); sg.translate(.1,0,0);   // 現在殼軸沿 -X：x=.1 是殼口，x=-.9 是螺塔
  const P=sg.attributes.position, uv=sg.attributes.uv; for(let i=0;i<P.count;i++){ const x=P.getX(i), y=P.getY(i); uv.setXY(i,.3+(.1-x)/1.0*.62,.5+y/.34*.3); }   // 只取照片中螺殼外表的部分（避開殼口與透明邊緣，原本取到透明處變成黑色破圖）
  sg.computeVertexNormals(); const shell=new T.Mesh(sg,new T.MeshStandardMaterial({map:crabTex('her_shell'),roughness:.5,side:T.FrontSide})); shell.position.y=.22; body.add(shell);
  const inner=new T.Mesh(sg,new T.MeshStandardMaterial({color:0xefe2d4,roughness:.2,metalness:.1,side:T.BackSide})); inner.position.y=.22; body.add(inner);   // 殼內側是珍珠白，從殼口看進去不會是黑的
  const cap=new T.Mesh(new T.CircleGeometry(.31,24),new T.MeshStandardMaterial({color:0x5a3424,roughness:.7})); cap.rotation.y=Math.PI/2; cap.position.set(.06,.22,0); body.add(cap);   // 殼口深處：蟹身的暗紅色（不是透空）
  const lip=new T.Mesh(new T.TorusGeometry(.33,.03,8,28),new T.MeshStandardMaterial({color:0xf2e6d8,roughness:.25})); lip.rotation.y=Math.PI/2; lip.position.set(.1,.22,0); body.add(lip);   // 殼口珍珠白的邊
  // 從殼口探出來的前半身（眼柄、觸角、大小螯都在這張照片上）
  const fr=new T.Group(); fr.position.set(.12,.2,0); body.add(fr);
  const fg=new T.PlaneGeometry(.62,.49); const front=new T.Mesh(fg,partMat('her_front')); front.rotation.y=Math.PI/2; front.position.set(.02,.04,0); fr.add(front);
  for(const s2 of [-1,1]){ const big=s2<0, f=big?'her_clawB':'her_clawS', sc=big?1:.75, root=new T.Group(); root.position.set(.1,-.04,s2*.09); root.rotation.y=s2*.35;
    const arm=seg(f,0,.42,.26*sc,.09*sc), hand=seg(f,.42,1,.4*sc,.15*sc); arm.rotation.z=.15; root.add(arm); const wr=new T.Group(); wr.position.x=.26*sc; arm.add(wr); hand.rotation.z=-.35; hand.rotation.y=-s2*.6; wr.add(hand); fr.add(root); }   // 從殼口伸出的立體大小螯
  const front2=front.clone(); front2.rotation.set(-Math.PI/2+.5,0,Math.PI/2); front2.position.set(.08,-.02,0); front2.scale.set(.9,.7,1); fr.add(front2);   // 從上面看也看得到螯
  // 走路的腳：左右各兩隻
  const legs=[], L=.62;
  for(const s of [-1,1]) for(let i=0;i<2;i++){ const hip=new T.Group(); hip.position.set(.08-i*.1,.12,s*.12); hip.rotation.y=-s*(Math.PI/2)+s*(i-.5)*.5;
    const a=seg('her_leg',.08,.45,L*.42,.12*L); a.rotation.z=.4; hip.add(a); const k=new T.Group(); k.position.x=L*.42; a.add(k); const b=seg('her_leg',.45,.8,L*.34,.1*L); b.rotation.z=-1.2; k.add(b);
    const k2=new T.Group(); k2.position.x=L*.34; b.add(k2); const c2=seg('her_leg',.8,1,L*.24,.08*L); c2.rotation.z=-.4; k2.add(c2); if(s<0) hip.scale.z=-1; fr.add(hip); legs.push({hip,a,s,i,y0:hip.rotation.y}); }
  body.scale.setScalar(.9);
  const uni={uSwim:{value:0},uAmp:{value:0}};
  shell.onBeforeRender=()=>{ const ph=uni.uSwim.value, a=Math.min(1,uni.uAmp.value*4), hide=uni.hide||0;
    fr.position.x=.12-.2*hide; fr.scale.setScalar(1-.5*hide);   // 縮進殼裡
    legs.forEach(l=>{ const p=ph*1.4+(l.i?Math.PI:0)+(l.s>0?Math.PI/2:0), up=Math.max(0,Math.sin(p)); l.hip.rotation.y=l.y0+Math.sin(p)*.3*a*l.s; l.a.rotation.z=.4+up*.4*a; });
    shell.rotation.x=Math.sin(ph*1.4)*.05*a; };   // 拖著殼走，殼左右晃
  return {group,uni,crab:true}; }
/* ---------- 彈塗魚、沙蠶（程式組裝）：身體照輪廓做成立體，貼使用者的實拍照片；鰭用照片本身的透明輪廓 ---------- */
// 彈塗魚：頭大、圓鼓眼、身體往尾巴漸細；側面照片投影在身上，背鰭尾鰭用貫穿身體的側面照片片、胸鰭用俯視照片片
// 彈塗魚（依使用者提供的側面、俯視、頭、胸鰭照片組裝）：身寬照俯視輪廓、身高照側面比例；背上半圈貼俯視照片、其餘貼側面照片；
// 頭頂一對突出的金色大眼、像手臂一樣撐地的胸鰭；鰭的輪廓用側面照片本身
const MUD_W=[0.03,0.22,0.33,0.38,0.4,0.46,0.52,0.55,0.55,0.52,0.48,0.46,0.44,0.42,0.40,0.38,0.36,0.35,0.34,0.34,0.34,0.33,0.33,0.33,0.31,0.3,0.29,0.29,0.3,0.31,0.31,0.31,0.3,0.3,0.29,0.28,0.27,0.26,0.24,0.21,0.18,0.17,0.16,0.15,0.14,0.12,0.11,0.11,0.11,0.11,0.1,0.1,0.09,0.08,0.07,0.06,0.05,0.04,0.03,0.01];   // 俯視圖每一段的寬（胸鰭那段已扣掉）
function mudskipModel(){ const group=new T.Group(), body=new T.Group(); group.add(body);
  const NS=59, NR=20, half=t=>{ const f=t*NS, i=Math.min(NS-1,Math.floor(f)), r=f-i; return (MUD_W[i]*(1-r)+MUD_W[i+1]*r)*.327/2; };
  const mk=(a0,a1,top)=>{ const g=new T.BufferGeometry(), pos=[], uvs=[], idx=[];
    for(let i=0;i<=NS;i++){ const t=i/NS, x=.5-t, w=half(t), h=w*(t<.25?1.05:.95);
      for(let j=0;j<=NR;j++){ const a=a0+(a1-a0)*j/NR, y=Math.cos(a)*h+.012, z=Math.sin(a)*w; pos.push(x,y,z); uvs.push(t*.985+.008, top?.5-z/.327*.95:.36+(y-.012)/.307*.9); } }
    for(let i=0;i<NS;i++) for(let j=0;j<NR;j++){ const a=i*(NR+1)+j, b=a+NR+1; idx.push(a,b,a+1,b,b+1,a+1); }
    g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const skinS=new T.MeshStandardMaterial({map:crabTex('mud2_side'),roughness:.32,metalness:0}), skinT=new T.MeshStandardMaterial({map:crabTex('mud2_top'),roughness:.32,metalness:0});
  const gTop=mk(-1.05,1.05,true), gSide=mk(1.05,Math.PI*2-1.05,false), mT=new T.Mesh(gTop,skinT), mS=new T.Mesh(gSide,skinS); body.add(mT); body.add(mS);
  const finS=new T.Mesh((()=>{ const g=new T.PlaneGeometry(1,.307), uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setX(i,1-uv.getX(i)); return g; })(),partMat('mud2_side'));   /* 照片頭在左；模型頭朝 +X：把貼圖左右翻過來對齊 */ finS.position.y=.012+(.36-.5)*-.307*.0; body.add(finS);   // 背鰭、第二背鰭、臀鰭、尾鰭（照片輪廓）
  finS.position.y=.012+(.5-.36)*.307/.9;
  // 胸鰭：兩側像手臂撐在地上
  const pecs=[]; for(const s of [-1,1]){ const p=new T.Group(); p.position.set(.29,-.02,s*.07); const fin=new T.Mesh(new T.PlaneGeometry(.2,.11).translate(.1,0,0),partMat('mud2_pec')); fin.rotation.x=-Math.PI/2; p.add(fin); p.rotation.y=-s*1.9; p.rotation.z=-.35; body.add(p); pecs.push({p,s}); }
  // 眼睛：頭頂突出的金色眼球＋黑瞳，眼底下一圈皮膚
  const eyeG=new T.MeshStandardMaterial({color:0x5e4a1c,roughness:.12,metalness:.1}), pupil=new T.MeshStandardMaterial({color:0x050505,roughness:.05});
  for(const s of [-1,1]){ const e=new T.Mesh(new T.SphereGeometry(.036,16,12),eyeG); e.position.set(.415,.1,s*.034); body.add(e); const pu=new T.Mesh(new T.SphereGeometry(.027,12,8),pupil); pu.position.set(.425,.108,s*.047); body.add(pu);
    const sock=new T.Mesh(new T.CylinderGeometry(.03,.042,.05,14),skinT); sock.position.set(.415,.065,s*.034); body.add(sock); }
  body.scale.setScalar(1);
  const P1=gTop.attributes.position.array.slice(), P2=gSide.attributes.position.array.slice(), uni={uSwim:{value:0},uAmp:{value:0}};
  mS.onBeforeRender=()=>{ const ph=uni.uSwim.value, a=Math.min(1,uni.uAmp.value*3);
    for(const [g,P0] of [[gTop,P1],[gSide,P2]]){ const P=g.attributes.position; for(let k=0;k<P.count;k++){ const t=.5-P0[k*3]; P.setZ(k,P0[k*3+2]+Math.sin(ph-t*5)*t*t*.18*a); } P.needsUpdate=true; }
    finS.rotation.y=Math.sin(ph-2.5)*.12*a; pecs.forEach(q=>{ q.p.rotation.z=-.35+Math.sin(ph*1.3)*.35*a; }); };   // 尾巴擺、胸鰭一撐一撐
  return {group,uni,fishLike:true}; }
// 沙蠶：一節一節的長條身體，俯視照片沿身長貼上（兩側的疣足在照片輪廓裡），整條蠕動
function wormModel(){ const group=new T.Group(), NS=60, NR=8, g=new T.BufferGeometry(), pos=[], uvs=[], idx=[];
  for(let i=0;i<=NS;i++){ const t=i/NS; for(let j=0;j<=NR;j++){ const a=j/NR*Math.PI*2; pos.push(.5-t,0,0); uvs.push(t*.98+.01,.5+Math.sin(a)*.42); } }
  for(let i=0;i<NS;i++) for(let j=0;j<NR;j++){ const a=i*(NR+1)+j, b=a+NR+1; idx.push(a,b,a+1,b,b+1,a+1); }
  g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2)); g.setIndex(idx);
  const m=new T.Mesh(g,new T.MeshStandardMaterial({map:crabTex('worm'),alphaTest:.35,side:T.DoubleSide,roughness:.25,metalness:.15})); group.add(m);
  const uni={uSwim:{value:0},uAmp:{value:0}}, P=g.attributes.position;
  const build=()=>{ const ph=uni.uSwim.value+performance.now()*.002, a=.7+uni.uAmp.value*2;   // 整條側向 S 形蠕動，越往尾越大
    for(let i=0;i<=NS;i++){ const t=i/NS, cx=.5-t, cz=Math.sin(ph*1.2-t*9)*.035*a, r=.03*(1-.6*Math.pow(t,3))*(t<.04?.6+t*10:1), seg=1+.12*Math.max(0,Math.sin(t*NS*3.14));   // 一節一節微微鼓起
      for(let j=0;j<=NR;j++){ const an=j/NR*Math.PI*2, k=i*(NR+1)+j; P.setXYZ(k,cx,Math.cos(an)*r*.55*seg+r*.5,cz+Math.sin(an)*r*1.6*seg); } }
    P.needsUpdate=true; g.computeVertexNormals(); };
  build(); m.onBeforeRender=build;
  return {group,uni,fishLike:true}; }
const creaModel=sp=>SHELLS.has(sp.id)?shellModel(sp.id):sp.id==='razor'?razorModel():sp.id==='hermit'?hermitModel():sp.id==='mudskip'?mudskipModel():sp.id==='ragworm'?wormModel():CRAB_DEF[sp.id]?crabModel(sp.id):window.__MDL.fish(sp);
const creaReady=id=>SHELLS.has(id)||id==='razor'||id==='hermit'||id==='mudskip'||id==='ragworm'||!!CRAB_DEF[id]||!!(window.__MDL&&window.__MDL.fishReady(id));
/* ---------- 挖掘（3D 實景）：蹲下來，用蛤耙在真的泥面上挖出一個洞 ----------
   ・點痕跡 → 鏡頭蹲低看著那塊泥面，先判斷要不要挖（顯示痕跡的線索），按「開挖」才開始
   ・手指在泥面上拖：蛤耙的齒跟著手指刮過，泥面真的被挖低（高解析度地形即時變形），挖出的泥堆在洞邊、泥塊噴起落下
   ・越往下：濕沙 → 黏泥 → 碎貝殼層，顏色、聲音、震動、好不好挖都不同；洞挖深了地下水會慢慢滲進來
   ・生物是真的 3D 模型埋在泥裡：挖到時耙子碰到硬物（震動＋喀聲），太用力會刮傷殼；露出夠多才能「取出」
   ・竹蟶發現被挖會往下鑽、沙蟹太慢會從旁邊鑽走 */
const vib=p=>{ try{ navigator.vibrate&&navigator.vibrate(p); }catch(e){} };
const LAYER=[{n:'濕沙',d:0,col:[1,1,1],snd:()=>noise(.06,2600,1.2,.12),vib:4,hard:1},{n:'黏泥',d:.035,col:[.62,.58,.54],snd:()=>noise(.12,420,3,.2),vib:10,hard:.55},{n:'碎貝殼層',d:.075,col:[.9,.86,.8],snd:()=>noise(.04,5200,6,.14),vib:6,hard:.42}];
const layerOf=d=>d>=LAYER[2].d?2:d>=LAYER[1].d?1:0;
const box=document.createElement('div'); box.id='digBox'; box.innerHTML='<div id="digInfo"></div><div id="digBtns"></div>'; document.body.appendChild(box);
const PS=.8, PG=72, holePatches=[];   // 挖掘區 80 公分見方、72×72 格（約 1.1 公分一格）
let dig=null;
// 蛤耙：木柄＋橫桿＋六根鐵齒
const digLight=new T.PointLight(0xfff0dc,0,2.4,1.2); S.add(digLight);
let rakeMud=0; const rake=new T.Group(), rakeHead=new T.Group(); rake.add(rakeHead);
{ const wood=new T.MeshStandardMaterial({color:0x9a7a52,roughness:.7}), steel=new T.MeshStandardMaterial({color:0x6d6c69,metalness:.85,roughness:.38}), rust=new T.MeshStandardMaterial({color:0x6b4a32,metalness:.4,roughness:.7});
  // 木柄：從耙頭往你這邊、往上延伸（像你蹲著握住柄的尾端）
  const hg=new T.CylinderGeometry(.011,.013,.3,10); hg.translate(0,.15,0); const h=new T.Mesh(hg,wood); h.rotation.x=1.05; h.rotation.z=-.35; h.position.set(0,.03,.0); rake.add(h);   // 短柄手耙（真實蛤耙柄約 30 公分），握在右下方
  const fer=new T.Mesh(new T.CylinderGeometry(.014,.014,.04,10),steel); fer.rotation.x=1.05; fer.rotation.z=-.35; fer.position.set(.004,.04,.016); rake.add(fer);   // 金屬套管
  const bar=new T.Mesh(new T.BoxGeometry(.15,.012,.012),rust); bar.position.set(0,.028,0); rakeHead.add(bar);
  for(let i=0;i<7;i++){ const tg=new T.CylinderGeometry(.0022,.0012,.055,6); tg.translate(0,-.0275,0); const t=new T.Mesh(tg,steel.clone()); t.position.set(-.066+i*.022,.028,0); t.rotation.x=-.35; rakeHead.add(t); } }   // 七根鐵齒，往前彎、插進泥裡
rake.visible=false; S.add(rake);
// 桶子：蹲下挖的時候放在身邊；取出的生物飛進桶子裡，看得到裡面裝了什麼
const bucket=new T.Group(), bucketIn=new T.Group(); bucket.add(bucketIn); bucket.visible=false; S.add(bucket);
{ const blue=new T.MeshStandardMaterial({color:0x2f6fa8,roughness:.45,side:T.DoubleSide}), dark=new T.MeshStandardMaterial({color:0x1f4a72,roughness:.5}), wire=new T.MeshStandardMaterial({color:0x9a9a96,metalness:.8,roughness:.35});
  const body=new T.Mesh(new T.CylinderGeometry(.14,.115,.22,28,1,true),blue); body.position.y=.11; bucket.add(body);
  const bot=new T.Mesh(new T.CircleGeometry(.115,28).rotateX(-Math.PI/2),dark); bot.position.y=.003; bucket.add(bot);
  const rim=new T.Mesh(new T.TorusGeometry(.14,.007,8,32),dark); rim.rotation.x=Math.PI/2; rim.position.y=.22; bucket.add(rim);
  for(const y of [.07,.15]){ const r=new T.Mesh(new T.TorusGeometry(.115+y*.11,.004,6,32),dark); r.rotation.x=Math.PI/2; r.position.y=y; bucket.add(r); }   // 塑膠桶的加強圈
  const hd=new T.Mesh(new T.TorusGeometry(.14,.0028,6,24,Math.PI),wire); hd.position.y=.22; hd.rotation.z=.25; bucket.add(hd);
  const water=new T.Mesh(new T.CircleGeometry(.122,24).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x6b6a5c,roughness:.05,metalness:.4,transparent:true,opacity:.75})); water.position.y=.05; bucket.add(water); }   // 桶底一點海水
const inBucket=[];
function bucketAdd(id,size){ const sp=c.species(id); try{ if(!creaReady(id)) return; const f=creaModel(sp); const g=f.group; g.scale.setScalar(Math.min(size,.09)); g.position.set(rand(-.06,.06),.03+inBucket.length*.012,rand(-.06,.06)); g.rotation.set(rand(-.3,.3),rand(0,6),rand(-.3,.3)); bucketIn.add(g); inBucket.push(f); }catch(e){} }
function placeBucket(){ const d=dig; if(!d) return; const fx=-Math.sin(yaw), fz=-Math.cos(yaw), rx=Math.cos(yaw), rz=-Math.sin(yaw), x=d.c.x-fx*.28+rx*.38, z=d.c.z-fz*.28+rz*.38; bucket.position.set(x,hAt(x,z)-.01,z); bucket.rotation.y=yaw; bucket.visible=true; }   // 放在右手邊、靠近膝蓋的地方，不擋住洞
// 噴起來的泥塊
const mudGeo=new T.IcosahedronGeometry(1,2); { const P=mudGeo.attributes.position; for(let i=0;i<P.count;i++){ const f=.7+Math.random()*.5; P.setXYZ(i,P.getX(i)*f,P.getY(i)*f*.55,P.getZ(i)*f); } mudGeo.computeVertexNormals(); }
const MUDN=90, mudIM=new T.InstancedMesh(mudGeo,new T.MeshStandardMaterial({color:0x2a231c,roughness:.6,envMapIntensity:.2}),MUDN); mudIM.frustumCulled=false; S.add(mudIM); const muds=[];
for(let i=0;i<MUDN;i++){ muds.push({a:0,p:new T.Vector3(),v:new T.Vector3(),s:0}); }
const m4=new T.Matrix4(), qI=new T.Quaternion(), vS=new T.Vector3();
function spawnMud(p,dir,n,dark){ for(let i=0;i<n;i++){ const m=muds.find(q=>q.a<=0); if(!m) return; m.a=1.2; m.p.copy(p); m.v.set(dir.x*rand(.3,.9)+rand(-.25,.25),rand(.5,1.1),dir.z*rand(.3,.9)+rand(-.25,.25)); m.s=rand(.003,.007)*(dark?1.2:1); } }
function mudTick(dt){ let any=false; muds.forEach((m,i)=>{ if(m.a>0){ any=true; m.a-=dt; m.v.y-=9.8*dt; m.p.addScaledVector(m.v,dt); const gy=dig?patchY(m.p.x,m.p.z):hAt(m.p.x,m.p.z); if(m.p.y<gy){ m.p.y=gy-.002; m.v.set(0,0,0); if(m.a>.25) m.a=.25; m.s*=1-dt*3; } }   // 落地就攤平、陷進泥裡消失
    m4.compose(m.p,qI,vS.setScalar(m.a>0?m.s:0)); mudIM.setMatrixAt(i,m4); }); mudIM.instanceMatrix.needsUpdate=true; }
// 跺腳時看得到的水柱：細長的水柱往上噴 40～60 公分再落下，四周濺起水花
const jets=[]; const jetM=new T.MeshStandardMaterial({color:0xe9f2f4,transparent:true,opacity:.75,roughness:.05,metalness:.2});
function jet(p){ const m=new T.Mesh(new T.CylinderGeometry(.014,.026,1,10,1,true),jetM.clone()); m.position.copy(p); m.scale.set(1,.001,1); S.add(m); jets.push({m,t:0,h:rand(.55,.9),p:p.clone()}); }   // 跺腳噴出的水柱：粗一點、高 55～90 公分，幾公尺外也看得到
function jetTick(dt){ for(let i=jets.length-1;i>=0;i--){ const j=jets[i]; j.t+=dt; const k=j.t<.25?j.t/.25:Math.max(0,1-(j.t-.25)/.45), H=j.h*k; j.m.scale.y=Math.max(.001,H); j.m.position.y=j.p.y+H/2; j.m.material.opacity=.75*Math.min(1,k*1.5);
    if(j.t>.2&&!j.spray){ j.spray=1; for(let n=0;n<16;n++){ const w=drops.find(q=>q.a<=0); if(!w) break; w.a=1.2; w.p.copy(j.p).setY(j.p.y+j.h*.9); w.v.set(rand(-.5,.5),rand(.2,.9),rand(-.5,.5)); w.s=rand(.006,.012); } }
    if(j.t>.75){ S.remove(j.m); jets.splice(i,1); } } }
// 水滴：文蛤受驚噴水、取出時滴水
const WN=70, wIM=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshStandardMaterial({color:0x8a9497,roughness:.04,metalness:.5,transparent:true,opacity:.32,envMapIntensity:.6,depthWrite:false}),WN); wIM.frustumCulled=false; S.add(wIM); const drops=[];
for(let i=0;i<WN;i++) drops.push({a:0,p:new T.Vector3(),v:new T.Vector3(),s:0});
function squirt(p,up,n){ for(let i=0;i<n;i++){ const w=drops.find(q=>q.a<=0); if(!w) return; w.a=1; w.p.copy(p); w.v.set(rand(-.12,.12),up*rand(.75,1.1),rand(-.12,.12)); w.s=rand(.0025,.005); } }
function drip(p,n){ for(let i=0;i<n;i++){ const w=drops.find(q=>q.a<=0); if(!w) return; w.a=.8; w.p.copy(p).add(vS.set(rand(-.02,.02),rand(-.01,0),rand(-.02,.02))); w.v.set(0,-.1,0); w.s=rand(.002,.0035); } }
function dropTick(dt){ drops.forEach((w,i)=>{ if(w.a>0){ w.a-=dt; w.v.y-=9.8*dt; w.p.addScaledVector(w.v,dt); const gy=dig?patchY(w.p.x,w.p.z):hAt(w.p.x,w.p.z); if(w.p.y<gy){ w.a=0; } }
  m4.compose(w.p,qI,vS.setScalar(w.a>0?w.s:0)); wIM.setMatrixAt(i,m4); }); wIM.instanceMatrix.needsUpdate=true; }
// 地下水：洞挖深了慢慢從底部滲上來
const seepOff=false, seep=new T.Mesh(new T.CircleGeometry(.16,40).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x4a4234,roughness:.06,metalness:.35,transparent:true,opacity:.86,envMapIntensity:.8})); seep.visible=false; S.add(seep);
function patchY(x,z){ const d=dig; if(!d) return hAt(x,z); const u=(x-d.c.x)/PS+.5, v=(z-d.c.z)/PS+.5; if(u<0||v<0||u>1||v>1) return hAt(x,z); const i=Math.round(v*PG)*(PG+1)+Math.round(u*PG); return d.base[i]-d.D[i]; }
const CLUE={hole:'單一個小圓孔，邊緣濕濕的，偶爾會噴出一道水──底下多半是文蛤',key:'兩個並排的小孔，像鑰匙孔──這是赤嘴蛤的入水管和出水管',slit:'一道細長的橢圓凹痕──竹蟶是直立埋在泥裡的，牠一察覺就會往下鑽',pellet:'細細的爪痕和一顆顆小沙球──附近可能有海瓜子，殼很薄要輕挖',mound:'大洞旁邊一堆新挖出來的沙──沙蟹的洞，挖太慢牠會從別的出口溜走',coil:'一圈圈盤繞的泥條──沙蠶吐出來的，牠很軟，太用力會扯斷',flat:'平平的泥面，看不出什麼痕跡'};
function startDig(s){ const k=s.k, cr=k?CR[k]:null, c0=s.m.position.clone();
  const geo=new T.PlaneGeometry(PS,PS,PG,PG).rotateX(-Math.PI/2), P=geo.attributes.position, n=P.count, base=new Float32Array(n), D=new Float32Array(n), col=new Float32Array(n*3), uv=geo.attributes.uv;
  for(let i=0;i<n;i++){ const x=P.getX(i)+c0.x, z=P.getZ(i)+c0.z; base[i]=gAt(x,z)*(1-edgeK(P.getX(i),P.getZ(i)))+hAt(x,z)*edgeK(P.getX(i),P.getZ(i))+.0015; P.setY(i,base[i]-c0.y); uv.setXY(i,x*.29,z*.29); col[i*3]=0; col[i*3+1]=0; col[i*3+2]=1; }
  geo.setAttribute('color',new T.BufferAttribute(col,3)); geo.computeVertexNormals();
  const mat=gmat.clone(); mat.onBeforeCompile=sh=>{ gmat.onBeforeCompile(sh); sh.uniforms.uHoleOn={value:0}; mat.envMapIntensity=.08;
    sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`
#ifdef USE_COLOR
  { float dk=vColor.r, ly=vColor.g, ao=vColor.b; vec3 gq=floor(vWP2*260.); float nz=fract(sin(dot(gq,vec3(12.99,78.23,37.71)))*43758.5)*.5+fract(sin(dot(floor(vWP2*70.),vec3(4.1,7.7,3.3)))*9631.7)*.5;   /* 立體的顆粒雜訊：洞壁不會再被貼圖拉成一條條 */
    vec3 wetSand=vec3(.055,.043,.032), clay=vec3(.032,.028,.024), shellL=vec3(.075,.066,.054);   /* 翻開的泥是深褐、深灰（線性色彩空間，原本太亮看起來像白灰） */
    vec3 cc=ly<.25?wetSand:ly<.75?clay:shellL; cc*=.75+.4*nz;
    if(ly>.75){ float sp=step(.78,texture2D(map,vWP2.xz*3.1).g); cc=mix(cc,vec3(.75,.7,.62),sp*.6); }   // 碎貝殼層：一點點白色碎殼
    diffuseColor.rgb=mix(diffuseColor.rgb,cc,dk)*ao*mix(1.,.72,dk);   /* 挖開的濕泥再暗一點，越深的地方光越少 */
    float wd=uSeepY-vWP2.y; if(dk>.6&&wd>0.){ float a=smoothstep(0.,.006,wd); vec3 V=normalize(cameraPosition-vWP2); float fr=.04+.96*pow(1.-max(V.y,0.),5.);
      diffuseColor.rgb=mix(diffuseColor.rgb,mix(diffuseColor.rgb*.55,vec3(.05,.055,.06),fr*.5)+.015*sin(vWP2.x*90.+uTW*3.)*sin(vWP2.z*80.-uTW*2.),a*.85); } }   // 洞底滲出的混濁地下水
#endif`); sh.fragmentShader=sh.fragmentShader.replace('roughnessFactor+= (texture2D(map,vWP2.xz*1.7).r-.5)*.25; }','roughnessFactor+= (texture2D(map,vWP2.xz*1.7).r-.5)*.25; }\n#ifdef USE_COLOR\n roughnessFactor=mix(roughnessFactor,.92,clamp(vColor.r*5.,0.,1.));\n#endif'); }; mat.vertexColors=true;   /* 挖開的泥比較霧、不會閃 */ mat.customProgramCacheKey=()=>'tidePatch';   // 和地面同一套材質：看起來就是同一片泥，洞挖到水位以下自然積水
  const patch=new T.Mesh(geo,mat); patch.position.copy(c0); S.add(patch); holePatches.push(patch); if(holePatches.length>8){ const o=holePatches.shift(); S.remove(o); } holePatches.forEach((p2,i)=>HOLES[i].set(p2.position.x,p2.position.z,PS/2*.985)); for(let i=holePatches.length;i<8;i++) HOLES[i].set(0,0,0); s.m.visible=false; if(s.m.userData.det) s.m.userData.det.visible=false; if(s.ring) s.ring.visible=false;
  let crea=null, size=cr?rand(cr.size[0],cr.size[1]):0, depth=cr?.012+cr.depth*.014:0, off=new T.Vector2(rand(-.03,.03),rand(-.03,.03));   // 就在痕跡正下方，深度 3～6 公分（真實的文蛤、赤嘴蛤大多埋在這個深度）
  if(cr){ try{ const sp=c.species(k); if(creaReady(k)){ const f=creaModel(sp); crea=f; const g=f.group; g.scale.setScalar(size); g.position.set(c0.x+off.x,0,c0.z+off.y);
        g.scale.setScalar(size*1.6);   // 畫面上放大一點，挖到時一眼看得出來
        if(k==='razor'){ g.rotation.set(0,rand(0,6),Math.PI/2); } else if(k==='ragworm'){ g.rotation.set(0,rand(0,6),0); } else { g.rotation.set(0,rand(0,6),0); }   // 竹蟶直立，其他平躺
        S.add(g); } }catch(e){}
    if(!crea){ const sh=new T.Mesh(new T.SphereGeometry(.5,20,12),new T.MeshStandardMaterial({color:0xcdbb9c,roughness:.5})); sh.scale.set(1,.45,.8); const g=new T.Group(); g.add(sh); g.scale.setScalar(size); g.position.set(c0.x+off.x,0,c0.z+off.y); S.add(g);
      crea={group:g,uni:{uSwim:{value:0},uAmp:{value:0}},stub:true}; try{ window.__MDL&&window.__MDL.preload&&window.__MDL.preload('tide'); }catch(e){} } }   // 模型還沒下載好：先埋一個替代的身體，一樣挖得到
  const BED={hardclam:[2,5],gomphina:[2,4],tellin:[3,7],razor:[1,2],ghostcrab:[1,1],ragworm:[1,3]}, bb=k&&BED[k]?BED[k]:[1,1];
  dig={s,k,cr,c:c0,patch,geo,base,D,crea,size,depth,off,phase:'ask',left:k?Math.floor(rand(bb[0],bb[1]+.99))-1:0,got:0,dmg:0,found:false,hit:0,t:0,fled:false,ptr:null,lastSnd:0,removed:0,camT:0,lift:0};
  placeCrea(); placeBucket();
  $('digInfo').innerHTML='<b>'+(CLUE[s.sign]||'')+'</b><br><small>要在這裡挖嗎？</small>';
  $('digBtns').innerHTML='<button id="dgGo" style="background:#ffcf66;color:#3a2600">🪏 開挖</button><button id="dgNo" style="background:#333;color:#fff">不挖，換個地方</button>';
  // 竹蟶的真實抓法：在細長的孔裡撒一撮鹽，竹蟶以為漲潮了會自己往上冒出來，要趁牠冒出來的一兩秒內抓住
  if(k==='razor'&&crea){ $('digBtns').insertAdjacentHTML('afterbegin','<button id="dgSalt" style="background:#f2f2ee;color:#333">🧂 撒鹽</button>'); $('dgSalt').onclick=saltRazor; }
  $('dgGo').onclick=()=>{ tut('go'); dig.phase='dig'; rake.visible=false; dig.handP=new T.Vector3(dig.c.x+Math.cos(yaw)*.08,patchY(dig.c.x,dig.c.z)+.03,dig.c.z-Math.sin(yaw)*.08); $('digInfo').innerHTML='手指在泥面上來回撥，用手把泥撥開<br><small>碰到硬物就放慢，沿著周圍清</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#333;color:#fff">放棄</button>'; $('dgNo').onclick=()=>endDig(false); };
  $('dgNo').onclick=()=>endDig(false,true); box.style.display='flex'; tut('ask'); ['tdHint','tdExit','tdStomp','tdCageB'].forEach(id=>{ const e=$(id); if(e) e.style.visibility='hidden'; }); }
const cbox=new T.Box3();
function placeCrea(){ const d=dig; if(!d||!d.crea) return; const g=d.crea.group, x=g.position.x, z=g.position.z; g.position.y=0; g.updateMatrixWorld(true); cbox.setFromObject(g);
  const top=hAt(x,z)-d.depth; g.position.y=top-cbox.max.y; g.updateMatrixWorld(true); cbox.setFromObject(g);   // 用模型真正的外框：最上緣剛好在泥面下 depth
  d.bx={cx:(cbox.min.x+cbox.max.x)/2,cz:(cbox.min.z+cbox.max.z)/2,rx:Math.max(.018,(cbox.max.x-cbox.min.x)/2),rz:Math.max(.018,(cbox.max.z-cbox.min.z)/2),top:cbox.max.y,bot:cbox.min.y}; }
// 生物的上緣在哪裡（用來判斷耙子有沒有碰到、露出多少）
function creaTopAt(x,z){ const d=dig; if(!d||!d.crea||d.fled||!d.bx) return null; const b=d.bx, u=(x-b.cx)/b.rx, v=(z-b.cz)/b.rz, q=u*u+v*v; if(q>1) return null; return b.top-(b.top-b.bot)*.35*q; }   /* 外框內的橢圓：中間最高、邊緣較低（殼的弧度） */
function brush(d,px,pz,R,amt,info){ const P=d.geo.attributes.position, C=d.geo.attributes.color, n=PG+1, u=(px-d.c.x)/PS+.5, v=(pz-d.c.z)/PS+.5, ci=Math.round(u*PG), cj=Math.round(v*PG), rr=Math.ceil(R*1.8/PS*PG)+1;
  for(let j=Math.max(1,cj-rr);j<=Math.min(PG-1,cj+rr);j++) for(let i=Math.max(1,ci-rr);i<=Math.min(PG-1,ci+rr);i++){ const k=j*n+i, x=P.getX(k)+d.c.x, z=P.getZ(k)+d.c.z, r=Math.hypot(x-px,z-pz);
    if(r<R){ const f=.5+.5*Math.cos(Math.PI*r/R), dep=d.D[k], li=layerOf(Math.max(0,dep)); let a=amt*f*LAYER[li].hard; const top=creaTopAt(x,z);
      if(top!==null){ const lim=d.base[k]-top-.002; if(dep+a>lim){ a=Math.max(0,lim-dep); info.touch=true; } }
      if(dep+a>.17) a=Math.max(0,.17-dep); d.D[k]+=a; info.moved+=a; info.layer=Math.max(info.layer,layerOf(d.D[k]));
      const dd=Math.max(0,d.D[k]); C.setXYZ(k,Math.min(1,dd/.006),layerOf(dd)/2,1-Math.min(.6,dd/.11*.6)); }   // 挖開多少、哪一層、越深越暗（洞壁和洞底的陰影）
    else if(r<R*1.8&&amt>0&&d.D[k]>-.008){ d.D[k]-=amt*.05*(.5+.5*Math.cos(Math.PI*(r-R)/(R*.8))); if(d.D[k]<0) C.setXYZ(k,Math.max(C.getX(k),Math.min(.55,-d.D[k]/.008*.55)),Math.max(C.getY(k),.5),Math.min(C.getZ(k),.92)); }   /* 推到洞邊的是翻出來的濕泥：顏色深、霧面，不再是一圈反光的亮邊 */   // 推開的泥只在旁邊微微堆起（大部分被耙子帶出洞外），不會把洞又填回去
    P.setY(k,d.base[k]-d.D[k]-d.c.y); } }
function scrape3(p,spd,dir,dist){ const d=dig; if(!d||d.phase!=='dig') return; const info={moved:0,layer:0,touch:false};
  const px=-dir.z, pz=dir.x;   // 耙頭橫在拖動方向的垂直方向
  const k=Math.min(1,dist/.012);  // 刮多少泥取決於拖動的距離，不是速度：慢慢刮也一樣挖得動
  brush(d,p.x,p.z,.065,.0062*k,info);   // 手掌把一層泥撥開（加快：一般 10～20 次來回就碰到）
  for(let t=0;t<4;t++){ const o=-.03+t*.02; brush(d,p.x+px*o,p.z+pz*o,.012,.009*k,info); }   // 四根手指各劃出一道溝
  d.dirty=true; d.removed+=info.moved; { const H=d.useL?handL:hand; H.mud=Math.min(1,(H.mud||0)+info.moved*4); } rakeMud=Math.min(1,rakeMud+info.moved*6);
  if(info.moved>.0004) spawnMud(p.clone().setY(patchY(p.x,p.z)+.006),dir,Math.min(5,1+Math.round(info.moved*300)),info.layer>0);
  const now=performance.now(); if(now-d.lastSnd>90&&info.moved>.0002){ d.lastSnd=now; LAYER[info.layer].snd(); vib(LAYER[info.layer].vib); }
  if(info.touch&&d.cr){ d.touchT=0; d.poke=Math.min(1,(d.poke||0)+.35); if(!d.found){ d.found=true; tut('found'); if(d.mud){ vib(25); noise(.07,500,3,.22); } else { vib([30,40,30]); noise(.05,1600,8,.25); } $('digInfo').innerHTML=d.cr.soft?'碰到軟軟的東西了<br><small>輕一點，把周圍的泥撥開</small>':'喀！手指碰到硬硬的東西了<br><small>放慢速度（看下面的力道條），沿著周圍把泥清掉</small>'; }
    const lim=digLim(); if(spd>lim&&now-d.hit>1000&&d.dmg<3){ d.hit=now; if(!d.warned){ d.warned=1; vib(30); $('digInfo').innerHTML='手指太快了！碰到殼要放慢<br><small>力道條保持綠色，再快就會刮傷</small>'; return; } d.dmg++; vib(60); noise(.08,900,4,.35); $('digInfo').innerHTML=d.cr.soft?'太用力了，'+d.cr.n+'被扯斷了一截！':'喀啦！刮太快把殼刮傷了（'+d.dmg+'）<br><small>力道條要保持在綠色</small>'; } }
  if(!d.found&&d.cr&&!d.fled&&now-(d.hintT||0)>1500){ d.hintT=now; const g=d.crea.group, dc=Math.round((patchY(g.position.x,g.position.z)-(hAt(g.position.x,g.position.z)-d.depth))*100);
    const far=Math.hypot(p.x-g.position.x,p.z-g.position.z)>.12; $('digInfo').innerHTML=far?(d.got?'震動是從洞的另一邊傳來的<br><small>沿著洞的邊緣往外挖</small>':'痕跡在洞的正中間<br><small>往中間挖，'+d.cr.n+'通常就在孔的正下方</small>'):(dc>1?'再往下挖一點…<br><small>還差大約 '+dc+' 公分</small>':'快碰到了，放慢…'); }
  if(d.found&&!d.fled){ const rv=reveal3(); if(rv>.62&&!d.ready){ d.ready=true; tut('ready'); exposeCrea(); $('digInfo').innerHTML='<b>'+d.cr.n+'露出來了！</b><br><small>可以取出了，再多清一點周圍也可以</small>'; $('digBtns').innerHTML='<button id="dgTake" style="background:#ffcf66;color:#3a2600">✋ 取出</button><button id="dgNo" style="background:#333;color:#fff">放棄</button>'; $('dgTake').onclick=takeOut; $('dgNo').onclick=()=>endDig(false); }
    else if(!d.ready&&rv>.15&&now-(d.rvT||0)>600){ d.rvT=now; $('digInfo').innerHTML='露出 '+Math.round(rv*100)+'%<br><small>繼續沿著周圍清</small>'; } }
  if(!d.cr&&d.removed>.35&&!d.ready){ d.ready=true; $('digInfo').innerHTML='挖了一陣子，只有泥和碎貝殼<br><small>平坦的泥面多半是空的，看痕跡再挖比較準</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#555;color:#fff">好吧</button>'; $('dgNo').onclick=()=>endDig(false); } }
function exposeCrea(){ const d=dig; if(!d||!d.crea||!d.bx) return; d.popRise=0;   /* 露出後牠會被泥擠得往上浮一點，整個看得到 */ const g={position:new T.Vector3(d.bx.cx,0,d.bx.cz)}, P=d.geo.attributes.position, C=d.geo.attributes.color, n=P.count, R=Math.max(d.bx.rx,d.bx.rz)*1.25+.015, want=d.bx.bot+(d.bx.top-d.bx.bot)*.3;   /* 把泥撥到身體七成都露出來 */
  for(let k=0;k<n;k++){ const x=P.getX(k)+d.c.x, z=P.getZ(k)+d.c.z, r=Math.hypot(x-g.position.x,z-g.position.z); if(r>R*1.6) continue; const f=r<R?1:1-(r-R)/(R*.6), target=d.base[k]-want; if(d.D[k]<target*f+(1-f)*d.D[k]) d.D[k]=Math.min(.17,target*f+(1-f)*d.D[k]); const dd=Math.max(0,d.D[k]); C.setXYZ(k,Math.min(1,dd/.006),layerOf(dd)/2,1-Math.min(.6,dd/.11*.6)); }
  d.dirty=true; spawnMud(g.position.clone(),vS.set(0,0,0),5,true); }   // 取出前把牠周圍的泥撥開：看得到牠躺在洞裡
function smoothHole(d){ const n=PG+1, D=d.D, P=d.geo.attributes.position, C=d.geo.attributes.color, T2=d.tmpD||(d.tmpD=new Float32Array(D.length));
  for(let j=1;j<PG;j++) for(let i=1;i<PG;i++){ const k=j*n+i; if(D[k]<=.002&&D[k-1]<=.002&&D[k+1]<=.002&&D[k-n]<=.002&&D[k+n]<=.002){ T2[k]=D[k]; continue; }
    T2[k]=D[k]*.5+(D[k-1]+D[k+1]+D[k-n]+D[k+n])*.125; }
  for(let j=1;j<PG;j++) for(let i=1;i<PG;i++){ const k=j*n+i; if(T2[k]===D[k]) continue; let v=T2[k]; const x=P.getX(k)+d.c.x, z=P.getZ(k)+d.c.z, top=creaTopAt(x,z); if(top!==null) v=Math.min(v,d.base[k]-top-.002);
    D[k]=v; P.setY(k,d.base[k]-v-d.c.y); const dd=Math.max(0,v); C.setXYZ(k,Math.min(1,dd/.006),layerOf(dd)/2,1-Math.min(.6,dd/.11*.6)); }
  d.geo.attributes.color.needsUpdate=true; }   // 洞壁、洞底柔和平滑（不再是一階一階的鋸齒）
function reveal3(){ const d=dig; if(!d||!d.crea) return 0; const P=d.geo.attributes.position, n=PG+1; let tot=0,vis=0;
  for(let k=0;k<P.count;k++){ const x=P.getX(k)+d.c.x, z=P.getZ(k)+d.c.z, top=creaTopAt(x,z); if(top===null) continue; tot++; if(d.base[k]-d.D[k]<=top+.006) vis++; } return tot?vis/tot:0; }
function takeOut(){ const d=dig; if(!d||!d.crea) return;
  if(d.mud){ noise(.15,220,2,.25); vib(15); $('digInfo').innerHTML='<b>是個空殼，裡面塞滿了泥</b><br><small>殼上有個小圓洞──被玉螺吃掉了。拿起來輕輕的、敲起來悶悶的，就是空殼</small>'; S.remove(d.crea.group); d.crea=null;
    if(d.left>0){ $('digBtns').innerHTML='<button id="dgGo2" style="background:#ffcf66;color:#3a2600">繼續挖這一窩</button><button id="dgNo" style="background:#333;color:#fff">站起來</button>'; $('dgGo2').onclick=()=>nextInBed(); } else $('digBtns').innerHTML='<button id="dgNo" style="background:#333;color:#fff">站起來</button>';
    $('dgNo').onclick=()=>endDig(true); d.phase='done'; return; }
  d.phase='lift'; d.lift=0; rake.visible=false; d.crea.uni.closed=true; d.crea.group.scale.setScalar(d.size*1.15);   /* 拿起來時殼緊閉、尺寸回到真實大小附近 */ const ok=d.dmg<3, cr=d.cr, v=Math.round(cr.price*(.6+d.size*6)*(ok?1-d.dmg*.2:.3)); d.val=v; d.ok=ok;
  vib([20,30,60]); noise(.2,300,4,.18); if(c.dex) c.dex(d.k,d.size);
  $('digInfo').innerHTML=`<b>${ok?'完整取出':'取出了，但殼傷得很重'}：${cr.n}</b> ${Math.round(d.size*100)} 公分・🪙${v}<br><small>${cr.desc}</small>`; $('digBtns').innerHTML='<button id="dgOk" style="background:#ffcf66;color:#3a2600">放進桶子</button>'; $('digBtns').innerHTML='<button id="dgCook" style="background:#ffcf66;color:#3a2600">🔥 帶回家烤</button><button id="dgTank" style="background:#3b7bb8;color:#fff">🐚 帶回家養</button><button id="dgSell" style="background:#2e8b57;color:#fff">🪙 賣掉 '+v+'</button><button id="dgFree" style="background:#333;color:#fff">放回去</button>';
  const fin=(how)=>{ const d2=dig; if(!d2) return; if(how==='cook'){ if(!d2.ok){ c.toast('殼破了，不能放保冷箱','warn',1500); return; } if(c.toCooler&&!c.toCooler(d2.k,+d2.size.toFixed(3))){ c.toast('保冷箱滿了（最多 5 個），先回家烤掉一些','warn',2000); return; } c.toast('放進保冷箱，回小屋就能烤','good',1500); }
      else if(how==='tank'){ const r=c.keepTank?c.keepTank(d2.k,+d2.size.toFixed(3)):false; if(r!==true){ c.toast(r||'放不進水族箱','warn',2200); return; } c.toast('放進小屋的海水缸了','good',1500); }
      else if(how==='sell'){ if(c.sellNow) c.sellNow(d2.val); c.toast('賣了 🪙'+d2.val,'good',1300); }
      else { c.toast('放回泥裡了','',1000); }
      if(how!=='free'){ bag.push({id:d2.k,v:0,L:+d2.size.toFixed(3),broken:!d2.ok,done:true}); bagText(); }
      tut('done'); d2.fate=how; d2.phase='bucket'; d2.bk=0; $('digBtns').innerHTML=''; };
  $('dgCook').onclick=()=>fin('cook'); $('dgTank').onclick=()=>fin('tank'); $('dgSell').onclick=()=>fin('sell'); $('dgFree').onclick=()=>fin('free'); }
// 同一窩的下一個：埋在洞的周圍、比較淺；繼續擴大同一個洞就會碰到
function saltRazor(){ const d=dig; if(!d||d.k!=='razor'||!d.crea||d.salted) return; d.salted=1; d.phase='salt'; d.saltT=0; d.popT=rand(1.4,3); $('digBtns').innerHTML='';
  $('digInfo').innerHTML='撒了一撮鹽進孔裡…<br><small>盯著孔，竹蟶冒出來就馬上抓</small>'; const p=d.c.clone(); p.y=hAt(p.x,p.z)+.25;
  for(let i=0;i<26;i++){ const w=drops.find(q=>q.a<=0); if(!w) break; w.a=1.2; w.p.copy(p).add(vS.set(rand(-.02,.02),rand(0,.06),rand(-.02,.02))); w.v.set(rand(-.05,.05),-.2,rand(-.05,.05)); w.s=rand(.0015,.003); }   // 白色鹽粒落進孔裡
  noise(.35,5200,1.5,.05); }
function saltTick(dt){ const d=dig; if(!d||d.phase!=='salt'||!d.crea) return; d.saltT+=dt; const g=d.crea.group, base=hAt(d.c.x,d.c.z);
  if(d.saltT>d.popT&&!d.popped){ d.popped=1; d.popUp=0; vib([15,20,15]); noise(.12,600,3,.15); squirt(vS.set(d.c.x,base+.005,d.c.z).clone(),1.2,8);
    $('digInfo').innerHTML='<b>冒出來了！</b><br><small>快抓！</small>'; $('digBtns').innerHTML='<button id="dgGrab" style="background:#ffcf66;color:#3a2600;font-size:17px">✋ 抓住</button>'; $('dgGrab').onclick=()=>{ if(!dig||dig.phase!=='salt') return; dig.phase='dig'; dig.found=true; dig.ready=true; takeOut(); }; }
  if(d.popped){ d.popUp+=dt; const up=d.popUp<.35?d.popUp/.35:d.popUp<1.6?1:Math.max(-1,1-(d.popUp-1.6)*3);   // 往上冒出約半截、停一下、又縮回去
    g.position.set(d.c.x,base-d.size*.5+up*d.size*.68,d.c.z); g.rotation.set(0,g.rotation.y,Math.PI/2); d.crea.uni.uAmp.value=.2; d.crea.uni.uSwim.value+=dt*8;
    if(d.popUp>2.1){ d.phase='dig'; d.salted=1; d.depth+=.05; placeCrea(); $('digInfo').innerHTML='竹蟶縮回去了，而且鑽得更深<br><small>只能用挖的了──發現牠後要挖得又快又準</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#333;color:#fff">放棄</button>'; $('dgNo').onclick=()=>endDig(false); } } }
function nextInBed(){ const d=dig; d.left--; const cr=d.cr, k=d.k; S.remove(d.crea.group); d.crea=null;
  d.size=rand(cr.size[0],cr.size[1]); d.depth=.01+cr.depth*.012+rand(-.006,.008); const a=rand(0,6.28), r=rand(.08,.2); d.off.set(Math.cos(a)*r,Math.sin(a)*r);
  try{ const f=creaModel(c.species(k)); const g=f.group; g.scale.setScalar(d.size*1.6); g.position.set(d.c.x+d.off.x,0,d.c.z+d.off.y); g.rotation.set(0,rand(0,6),k==='razor'?Math.PI/2:0); S.add(g); d.crea=f; }catch(e){ const sh=new T.Mesh(new T.SphereGeometry(.5,20,12),new T.MeshStandardMaterial({color:0xcdbb9c,roughness:.5})); sh.scale.set(1,.45,.8); const g=new T.Group(); g.add(sh); g.scale.setScalar(d.size); g.position.set(d.c.x+d.off.x,0,d.c.z+d.off.y); S.add(g); d.crea={group:g,uni:{uSwim:{value:0},uAmp:{value:0}},stub:true}; }
  d.base0=null; d.liftFrom=null; d.found=false; d.ready=false; d.dmg=0; d.fled=false; d.esc=0; d.phase='dig'; d.t=0; d.mud=Math.random()<(k==='hardclam'||k==='gomphina'?.15:0); placeCrea(); rake.visible=false;
  $('digInfo').innerHTML='旁邊的泥裡還有動靜…<br><small>同一窩通常不只一個，把洞往周圍挖大</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#333;color:#fff">夠了，站起來</button>'; $('dgNo').onclick=()=>endDig(true); }
function endDig(got,skip){ const d=dig; if(!d) return; if(!skip){ d.s.done=true; } else { d.s.m.visible=true; if(d.s.m.userData.det) d.s.m.userData.det.visible=true; }
  if(!skip||d.removed>.01){ /* 挖過的洞留在泥面上 */ d.patch.userData.left=true; } else { S.remove(d.patch); const i=holePatches.indexOf(d.patch); if(i>=0) holePatches.splice(i,1); holePatches.forEach((p2,j)=>HOLES[j].set(p2.position.x,p2.position.z,PS/2*.985)); for(let j=holePatches.length;j<8;j++) HOLES[j].set(0,0,0); }
  if(d.crea){ S.remove(d.crea.group); }   /* 不再把生物丟在地上 */
  rake.visible=false; seep.visible=false; GU.uSeepY.value=-9; bucket.visible=false; dig=null; box.style.display='none'; ['tdHint','tdExit','tdStomp','tdCageB'].forEach(id=>{ const e=$(id); if(e) e.style.visibility=''; }); }
// 竹蟶往下鑽、沙蟹想溜、滲水、取出的動畫、耙子跟著手指
function digTick(dt){ mudTick(dt); dropTick(dt); saltTick(dt); { const want=dig?1.9:cage.on?1.4:0; digLight.intensity+=(want-digLight.intensity)*Math.min(1,dt*4); if(dig||cage.on){ digLight.position.copy(cam.position).add(vS.set(.15,.1,cage.on?-.9:0).applyQuaternion(cam.quaternion)); } }   /* 蹲下時洞口有柔和補光（黃昏也看得清洞裡） */ if(dig&&dig.ready&&dig.crea&&dig.popRise!==undefined&&dig.popRise<1&&dig.phase==='dig'){ const r0=dig.popRise; dig.popRise=Math.min(1,dig.popRise+dt*1.5); dig.crea.group.position.y+=(dig.popRise-r0)*dig.size*.55; if(Math.random()<dt*10) spawnMud(dig.crea.group.position.clone(),vS.set(0,0,0),1,true); } if(typeof spdEl!=='undefined') spdEl.style.visibility=dig&&dig.phase==='dig'?'visible':'hidden'; if(bucket.visible) inBucket.forEach(f=>{ f.uni.uSwim.value+=dt*2; f.uni.uAmp.value=.03; }); const d=dig; if(!d) return; d.t+=dt; if(d.dirty){ smoothHole(d); d.dirty=false; d.geo.attributes.position.needsUpdate=true; d.geo.attributes.color.needsUpdate=true; d.geo.computeVertexNormals(); } d.camT=Math.min(1,d.camT+dt*1.6);
  if(d.phase==='dig'&&d.cr&&d.crea&&!d.fled&&!d.crea.stub||d.phase==='dig'&&d.cr&&d.crea&&!d.fled){
    if(d.cr.dive&&d.found&&!d.ready){ d.depth+=dt*.012; placeCrea(); if(Math.random()<dt*3) squirt(vS.set(d.c.x,patchY(d.c.x,d.c.z)+.003,d.c.z).clone(),.25,3);   /* 孔裡冒泡：牠正在往下鑽 */ if(d.depth>.17){ d.fled=true; d.crea.group.visible=false; $('digInfo').innerHTML='竹蟶鑽到深處去了…<br><small>發現竹蟶後要挖得又快又準</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#555;color:#fff">好吧</button>'; $('dgNo').onclick=()=>endDig(false); } }
    if(d.cr.flee&&!d.found&&d.t>14){ d.fled=true; const g=d.crea.group; g.position.y=patchY(g.position.x,g.position.z)+.01; d.esc=1; $('digInfo').innerHTML='沙蟹從旁邊鑽出來溜走了！<br><small>洞口有沙堆的要挖快一點</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#555;color:#fff">可惜</button>'; $('dgNo').onclick=()=>endDig(false); } }
  // 生物在泥裡的反應（真實行為）
  if(d.crea&&!d.fled&&d.phase!=='lift'&&d.phase!=='bucket'){ const g=d.crea.group, u=d.crea.uni, k=d.k; d.touchT=(d.touchT||99)+dt; d.poke=Math.max(0,(d.poke||0)-dt*1.5);
    const shell=k==='hardclam'||k==='gomphina'||k==='tellin', crab=k==='ghostcrab', rv=d.found?reveal3():0;
    if(!d.base0) d.base0={x:g.position.x,z:g.position.z,ry:g.rotation.y,rz:g.rotation.z};
    // 被耙子碰到：整個抖一下
    g.position.x=d.base0.x+Math.sin(d.t*60)*.004*d.poke; g.rotation.z=d.base0.rz+Math.sin(d.t*45)*.08*d.poke;
    if(shell){ u.uAmp.value=d.found?0:.02; u.uSwim.value+=dt*(d.found?0:1.5);   // 沒被發現時殼微開；一碰到就緊緊閉上
      d.sqT=(d.sqT||rand(1,3))-dt; if(d.found&&d.sqT<=0&&k!=='tellin'){ d.sqT=rand(2.5,5); const p=g.position.clone(); p.y=patchY(p.x,p.z)+.004; squirt(p,1.6,10); noise(.12,3000,2,.06); } }   // 受驚從水管噴出一道水
    if(crab){ const act=d.found?Math.min(1,.3+rv):.05; u.uAmp.value=.08+.25*act; u.uSwim.value+=dt*(3+12*act);   // 露出來越多掙扎越兇，螯舉起來
      g.rotation.y=d.base0.ry+Math.sin(d.t*3)*.15*act; }
    if(k==='ragworm'){ u.uAmp.value=.18+.25*d.poke; u.uSwim.value+=dt*(6+10*d.poke); }   // 一直扭動，碰到扭得更兇
    if(k==='razor'&&d.found){ g.position.y-=Math.max(0,Math.sin(d.t*7))*.0006; u.uAmp.value=.04; } }   // 竹蟶一抽一抽往下拉
  if(d.esc&&d.crea){ const g=d.crea.group; g.position.x+=dt*.35; g.position.y=hAt(g.position.x,g.position.z)+.01; d.crea.uni.uAmp.value=.25; d.crea.uni.uSwim.value+=dt*20; }
  // 洞深了，地下水慢慢滲進來
  let maxD=0; for(let i=0;i<d.D.length;i+=7) maxD=Math.max(maxD,d.D[i]); if(!seepOff&&maxD>.045&&d.phase!=='lift'&&d.phase!=='bucket'){ seep.visible=true; if(!seep.material.envMap) seep.material.envMap=gmat.envMap; seep.position.set(d.c.x,0,d.c.z); let target=hAt(d.c.x,d.c.z)-maxD+Math.min(maxD*.35,(d.t-(d.seepT||(d.seepT=d.t)))*.0025); if(d.crea&&!d.fled){ const ct=hAt(d.crea.group.position.x,d.crea.group.position.z)-d.depth; target=Math.min(target,ct-.015); }   /* 水不會淹過生物 */ target=Math.min(target,hAt(d.c.x,d.c.z)-.035); if(!d.seepInit){ d.seepInit=1; seep.position.y=hAt(d.c.x,d.c.z)-maxD; }   /* 水面永遠在泥面下 3.5 公分以下，只看得到洞裡那一小窪 */   /* 混濁的地下水慢慢從洞底滲上來 */ seep.position.y+=((target)-seep.position.y)*Math.min(1,dt*2); seep.visible=false; GU.uSeepY.value=seep.position.y; }
  if(d.phase==='lift'&&d.crea){ const g0=d.crea.group; if(Math.random()<dt*14) spawnMud(g0.position.clone(),vS.set(0,0,0),1,true); if(Math.random()<dt*20) drip(g0.position,1); if(d.k==='ghostcrab'||d.k==='ragworm'){ d.crea.uni.uAmp.value=.3; d.crea.uni.uSwim.value+=dt*14; } }
  if(d.phase==='bucket'&&d.crea){ d.bk=Math.min(1,(d.bk||0)+dt*1.8); const g=d.crea.group, tgt=d.fate==='free'?vS.set(d.c.x,hAt(d.c.x,d.c.z)-.03,d.c.z).clone():bucket.position.clone().add(vS.set(0,.08+.25*Math.sin(d.bk*Math.PI),0)); g.position.lerp(tgt,Math.min(1,dt*(3+d.bk*6))); g.rotation.x+=dt*3; if(d.bk>=1){ noise(.1,700,3,.2); noise(.08,2200,2,.06); vib(20); if(d.fate!=='free'&&d.fate!=='sell') bucketAdd(d.k,d.size); d.got++; if(d.left>0){ nextInBed(); } else { $('digInfo').innerHTML='這一窩挖完了，共 '+d.got+' 個<br><small>換個痕跡再找</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#ffcf66;color:#3a2600">站起來</button>'; $('dgNo').onclick=()=>endDig(true); d.phase='done'; } return; } }   /* 拋物線飛進桶子，噗通落進桶裡的水 */
  if(d.phase==='lift'&&d.crea){ d.lift=Math.min(1,d.lift+dt*1.8); const g=d.crea.group, e=d.lift*d.lift*(3-2*d.lift); { const hold=cam.position.clone().add(new T.Vector3(.03,-.015,-.26).applyQuaternion(cam.quaternion)); if(!d.liftFrom) d.liftFrom=g.position.clone(); const from=vS.copy(d.liftFrom); g.position.copy(from.lerp(hold,e)); }   /* 拿到眼前看 */ g.rotation.y+=dt*1.2; g.rotation.x+=(-.6-g.rotation.x)*dt*2; { const shell=d.k==='hardclam'||d.k==='gomphina'||d.k==='tellin'||d.k==='razor'; d.crea.uni.uAmp.value=shell?0:.15; d.crea.uni.uSwim.value+=shell?0:dt*6; } }   /* 貝類被拿起來會把殼緊緊閉上 */ }
// 蹲下來的鏡頭
function digCam(){ const d=dig, e=d.camT*d.camT*(3-2*d.camT), fx=-Math.sin(yaw), fz=-Math.cos(yaw), cy=hAt(d.c.x,d.c.z);
  const kp=vS.set(d.c.x-fx*.5,cy+.42,d.c.z-fz*.5); cam.position.lerpVectors(pos,kp,e); const look=new T.Vector3(d.c.x+fx*.04,cy-.03,d.c.z+fz*.04); cam.fov=58-12*e; cam.updateProjectionMatrix();   // 跪姿斜看進洞裡，看得到洞壁的深度
  const m=new T.Matrix4().lookAt(cam.position,look,new T.Vector3(0,1,0)); const q=new T.Quaternion().setFromRotationMatrix(m); const q0=new T.Quaternion().setFromEuler(new T.Euler(pitch,yaw,0,'YXZ')); cam.quaternion.slerpQuaternions(q0,q,e); }
// 挖掘時的手指操作：射線打到泥面，耙子跟過去並刮泥
const digRay=new T.Raycaster(), dv2=new T.Vector2();
function digPoint(e){ dv2.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); digRay.setFromCamera(dv2,cam); const h=digRay.intersectObject(dig.patch); return h.length?h[0].point:null; }
window.addEventListener('pointerdown',e=>{ if(!dig||dig.phase!=='dig') return; if(e.target&&e.target.closest&&e.target.closest('button')) return; const p=digPoint(e); dig.ptr=p?{p,t:performance.now()}:{p:null,t:performance.now()}; });
let spdS=0;
const spdEl=document.createElement('div'); spdEl.id='digSpd'; spdEl.innerHTML='<span>力道</span><i><b></b></i>'; box.insertBefore(spdEl,box.firstChild);
function digLim(){ const d=dig; return d&&d.cr?(d.cr.fragile?1.5:d.cr.soft?1.7:2.2):2.2; }   /* 公尺／秒：手機上快速撥動換算成實際距離常超過 1，原本太容易刮傷 */   /* 公尺／秒：一般手指慢慢撥約 0.3～0.8 */
function spdShow(v){ const b=spdEl.querySelector('b'), lim=digLim(), f=Math.min(1,v/(lim*1.4)); b.style.width=(f*100)+'%'; b.style.background=v<lim*.7?'#5fd38a':v<lim?'#f4c542':'#ff5b4a'; }
window.addEventListener('pointermove',e=>{ if(!dig||dig.phase!=='dig') return; const p=digPoint(e); if(!p) return;
  rake.visible=false; dig.handP=p.clone().setY(patchY(p.x,p.z)+.025); scoop=Math.min(1,scoop+.25);
  { const ld=dig.lastDir; if(dig.ptr&&dig.ptr.p){ const nd=vS.subVectors(p,dig.ptr.p); if(nd.lengthSq()>1e-6){ nd.normalize(); if(ld&&ld.dot(nd)<-.3&&flick<.2&&dig.removed>.002){   // 換方向：把手裡那把泥甩到洞外
          flick=1; scoop=0; const out=vS.set(Math.cos(yaw),.0,-Math.sin(yaw)).clone(); spawnMud(p.clone().setY(patchY(p.x,p.z)+.02),out,6,true); noise(.09,380,2,.12); vib(8); }
        dig.lastDir=(dig.lastDir||new T.Vector3()).copy(nd); } } }
  if(!dig.ptr||!dig.ptr.p){ if(dig.ptr) dig.ptr.p=p; return; }
  const now=performance.now(), dt=Math.max(8,now-dig.ptr.t)/1000, dist=p.distanceTo(dig.ptr.p), raw=Math.min(3,dist/dt); spdS+=(raw-spdS)*.18; spdShow(spdS);   // 真實速度（公尺／秒），平滑過
  if(dist<.002) return; const dir=vS.subVectors(p,dig.ptr.p).normalize().clone(); const steps=Math.max(1,Math.ceil(dist/.008));
  for(let i=1;i<=steps;i++){ const q=dig.ptr.p.clone().lerp(p,i/steps); scrape3(q,spdS,dir,dist/steps); }
  // 耙子跟著手指：耙頭貼著泥面、齒插進泥裡，柄朝你，順著拖的方向；拖越快越往前傾
  rake.position.copy(p).setY(patchY(p.x,p.z)+.012); rake.rotation.y=yaw+Math.max(-.35,Math.min(.35,(p.x-dig.c.x)*-1.2));   /* 柄永遠朝著你（你握著），左右挖時柄跟著轉一點 */ rakeHead.rotation.x=-Math.min(.35,spdS*.6); rakeHead.children.forEach((m,i)=>{ if(i>0) m.material.color.setRGB(.43-.2*rakeMud,.42-.22*rakeMud,.41-.24*rakeMud); });   /* 鐵齒越挖越沾泥 */
  dig.ptr={p,t:now}; });
window.addEventListener('pointerup',()=>{ if(dig) { if(dig.ptr&&dig.ptr.p&&dig.phase==='dig'&&scoop>.3){ const p=dig.ptr.p.clone(); p.y=patchY(p.x,p.z)+.01; spawnMud(p,vS.set(Math.cos(yaw)*.8,0,-Math.sin(yaw)*.8).clone(),7,true); flick=1; noise(.1,350,2,.12); }   /* 放手的瞬間：手往上一撈，把一把泥甩到洞外 */
    scoop=0; dig.ptr=null; rakeHead.rotation.x=0; spdS=0; spdShow(0); const fx=-Math.sin(yaw), fz=-Math.cos(yaw), rx=Math.cos(yaw), rz=-Math.sin(yaw); const x=dig.c.x+rx*.2-fx*.12, z=dig.c.z+rz*.2-fz*.12; rake.position.set(x,patchY(x,z)+.012,z); } });   /* 放開手：耙子放到洞的右前方，不擋住洞裡的東西 */

/* ---------- 拖籠（嘉義布袋好美里的挖法）：把籠子插進泥沙裡，倒退著拖，到有水的地方搖晃淘洗，泥沙洗掉就剩下蛤 ----------
   ・按「🧺 拖籠」拿出籠子，籠子在你前面插進泥裡；手指往下拖＝倒退走，籠子跟著被拉動，後面留下一道刮痕
   ・拖過有蛤的地方（痕跡附近）會「喀啦」一聲、手機震一下，表示有東西進籠子了
   ・籠子滿了（或你想洗了）走到低窪有水的地方，左右快速滑動搖晃，泥沙被水沖掉，籠裡的收穫露出來，倒進桶子 */
const cage={on:false,fill:0,items:[],dist:0,g:new T.Group(),wash:0,shake:0,trail:[]};
{ const texMud=null; const iron=new T.MeshStandardMaterial({color:0x8f8d88,metalness:.75,roughness:.35}), wood=new T.MeshStandardMaterial({color:0x8d6e47,roughness:.7});
  const net=new T.MeshStandardMaterial({color:0x4a4a46,metalness:.5,roughness:.5,wireframe:true});
  const W2=.42,H2=.2,D2=.32, fr=[[-W2/2,0,0,W2/2,0,0],[-W2/2,H2,0,W2/2,H2,0],[-W2/2,0,0,-W2/2,H2,0],[W2/2,0,0,W2/2,H2,0],[-W2/2,H2,0,-W2/2,H2*.7,D2],[W2/2,H2,0,W2/2,H2*.7,D2],[-W2/2,0,0,-W2/2,0,D2],[W2/2,0,0,W2/2,0,D2],[-W2/2,0,D2,W2/2,0,D2],[-W2/2,H2*.7,D2,W2/2,H2*.7,D2]];
  fr.forEach(([a,b,c2,d,e,f])=>{ const v1=new T.Vector3(a,b,c2), v2=new T.Vector3(d,e,f), L=v1.distanceTo(v2), m=new T.Mesh(new T.CylinderGeometry(.006,.006,L,6),iron); m.position.copy(v1).add(v2).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v2.clone().sub(v1).normalize()); cage.g.add(m); });
  for(let i=0;i<12;i++){ const t=new T.Mesh(new T.CylinderGeometry(.003,.002,.07,5),iron); t.position.set(-W2/2+.02+i*(W2-.04)/11,-.03,-.01); t.rotation.x=-.5; cage.g.add(t); }   // 前緣一排插進泥裡的鐵齒
  // 籠底與籠背：一根根實心鋼條（間距約 1.5 公分，泥沙漏得出去、蛤留在裡面），不是線框
  const rodG=new T.CylinderGeometry(.0042,.0042,1,6), NR=60, rods=new T.InstancedMesh(rodG,iron,NR); let ri=0; const M4=new T.Matrix4(), Q=new T.Quaternion(), Vp=new T.Vector3(), Vs=new T.Vector3(), upV=new T.Vector3(0,1,0);
  const rod=(a,b)=>{ const L=a.distanceTo(b); Q.setFromUnitVectors(upV,Vp.subVectors(b,a).normalize()); M4.compose(Vp.addVectors(a,b).multiplyScalar(.5),Q,Vs.set(1,L,1)); rods.setMatrixAt(ri++,M4); };
  for(let i=0;i<27;i++){ const x=-W2/2+.015+i*(W2-.03)/26; rod(new T.Vector3(x,.004,0),new T.Vector3(x,.004,D2)); }   // 底部縱向鋼條
  for(let i=0;i<4;i++){ const z=.03+i*(D2-.06)/3; rod(new T.Vector3(-W2/2,.008,z),new T.Vector3(W2/2,.008,z)); }       // 底部橫向補強
  for(let i=0;i<22;i++){ const x=-W2/2+.02+i*(W2-.04)/21; rod(new T.Vector3(x,.004,D2),new T.Vector3(x,H2*.7,D2)); }  // 籠背直條
  rods.count=ri; cage.g.add(rods);
  const pole=new T.Mesh(new T.CylinderGeometry(.014,.016,1.5,8),wood); pole.position.set(0,.5,D2+.86); pole.rotation.x=1.1; pole.scale.y=1.3; cage.g.add(pole);   // 長竿伸到你手上
  cage.inside=new T.Group(); cage.g.add(cage.inside); cage.sand=new T.Mesh((()=>{ const g=new T.SphereGeometry(.5,28,12,0,Math.PI*2,0,Math.PI/2), P=g.attributes.position; for(let i=0;i<P.count;i++){ const x=P.getX(i), y=P.getY(i), z=P.getZ(i), n=1+.18*Math.sin(x*37+z*21)*Math.sin(z*29-x*13)+.1*Math.sin(x*71+z*53); P.setXYZ(i,x*(1+.06*Math.sin(z*40)),y*n,z); } g.computeVertexNormals(); return g; })(),new T.MeshStandardMaterial({map:texMud||null,color:texMud?0x5a4a3a:0x2c241c,roughness:.55}));   /* 一坨坑坑疤疤的濕泥（不是平滑的盤子） */ cage.sand.scale.set(W2-.03,.004,D2-.04); cage.sand.position.set(0,.004,D2/2); cage.g.add(cage.sand);   /* 籠裡越積越高的一坨濕泥 */ }
cage.g.visible=false; S.add(cage.g);
// 籠子拖過的刮痕：一條翻開的濕泥帶，上面有一道道鐵齒刮出的細溝，會慢慢積水反光、很久之後被抹平
const trailTex=(()=>{ const c2=document.createElement('canvas'); c2.width=64; c2.height=32; const g=c2.getContext('2d'); g.fillStyle='rgba(28,22,16,.62)'; g.fillRect(0,0,64,32);
  for(let i=0;i<12;i++){ const x=3+i*5.2; g.fillStyle='rgba(10,8,6,.55)'; g.fillRect(x,0,1.6,32); g.fillStyle='rgba(90,80,68,.14)'; g.fillRect(x+1.8,0,1,32); }   // 十二道齒溝＋溝邊翻起的亮泥
  const gr=g.createLinearGradient(0,0,64,0); gr.addColorStop(0,'rgba(0,0,0,1)'); gr.addColorStop(.06,'rgba(0,0,0,0)'); gr.addColorStop(.94,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,1)'); g.globalCompositeOperation='destination-out'; g.fillStyle=gr; g.fillRect(0,0,64,32);
  return new T.CanvasTexture(c2); })();
const trailG=new T.PlaneGeometry(.44,.24).rotateX(-Math.PI/2), trails=[]; let trailAcc=0;
function trailStamp(x,z){ const m=new T.Mesh(trailG,new T.MeshStandardMaterial({map:trailTex,transparent:true,depthWrite:false,roughness:.3,metalness:.1,opacity:.95,polygonOffset:true,polygonOffsetFactor:-2}));
  m.position.set(x,hAt(x,z)+.004,z); m.rotation.y=yaw; S.add(m); trails.push({m,t:0}); if(trails.length>120){ const o=trails.shift(); S.remove(o.m); } }
function trailTick(dt){ trails.forEach(o=>{ o.t+=dt; o.m.material.roughness=Math.max(.06,.3-o.t*.006); o.m.material.opacity=Math.max(0,.95-Math.max(0,o.t-120)/60); }); }
const cageEl=document.createElement('div'); cageEl.id='tdCage'; cageEl.innerHTML='<div id="cgInfo"></div><i><b></b></i><div id="cgBtns"></div>'; document.body.appendChild(cageEl);
function cageUI(){ const b=cageEl.querySelector('b'); b.style.width=Math.round(cage.fill*100)+'%'; const inW=hAt(pos.x,pos.z)<-.075;
  $('cgInfo').innerHTML=cage.wash>0?'左右快速滑動搖晃籠子，讓水把泥沙沖掉（'+Math.round(cage.wash*100)+'%）':cage.fill>=1?'籠子滿了！<br><small>'+(inW?'在水裡左右快速滑動搖晃淘洗':'走到有水的低窪處淘洗')+'</small>':'手指往下拖＝倒退著把籠子拉過泥沙<br><small>經過痕跡附近比較容易拖到東西</small>';
  $('cgBtns').innerHTML=(cage.wash>0||cage.fill<.15?'':'<button id="cgWash" style="background:#ffcf66;color:#3a2600">'+(inW?'🌊 在這裡淘洗':'淘洗（要有水）')+'</button>')+'<button id="cgOff" style="background:#333;color:#fff">收起籠子</button>';
  const w=$('cgWash'); if(w) w.onclick=()=>{ if(hAt(pos.x,pos.z)>=-.075){ c.toast('這裡沒有水，走到潮溝或低窪積水的地方','',1600); return; } cage.wash=.001; walkReq=0; cageUI(); };
  $('cgOff').onclick=()=>cageOff(); }
function cageOn(){ if(dig) return; cage.on=true; cage.g.visible=true; cageEl.style.display='flex'; ['tdHint','tdStomp'].forEach(id=>{ const e=$(id); if(e) e.style.visibility='hidden'; }); cageUI(); }
function cageOff(){ cage.on=false; pitch=-.32; cage.g.visible=false; cageEl.style.display='none'; ['tdHint','tdStomp'].forEach(id=>{ const e=$(id); if(e) e.style.visibility=''; }); }
function cageTick(dt){ if(!cage.on) return; pitch+=(-.5-pitch)*Math.min(1,dt*3); const fx=-Math.sin(yaw), fz=-Math.cos(yaw), x=pos.x+fx*1.9, z=pos.z+fz*1.9;   /* 低頭看著前面的籠子 */
  cage.shakeX=(cage.shakeX||0)+(((cage.wash>0&&cage.wash<1)?(cage.swipeDir||0)*.14:0)-(cage.shakeX||0))*Math.min(1,dt*14); const rx=Math.cos(yaw), rz=-Math.sin(yaw);
  cage.g.position.set(x+rx*cage.shakeX,hAt(x,z)-.028+(cage.wash>0&&cage.wash<1?.06:0),z+rz*cage.shakeX);   /* 淘洗時整個籠子提起來，跟著手指左右甩 */   // 籠底和鐵齒陷在泥裡 cage.g.rotation.set(0,yaw,-(cage.shakeX||0)*1.6);   /* 籠口朝前、竿子朝你 */
  if(cage.wash===0&&walkV<-.05&&cage.fill<1){ const dd=-walkV*dt; cage.dist+=dd; trailAcc+=dd; if(trailAcc>.2){ trailAcc=0; trailStamp(x-fx*.05,z-fz*.05); } cage.fill=Math.min(1,cage.fill+dd*.06);   // 倒退拖：約 17 公尺裝滿
    if(Math.random()<dt*6){ spawnMud(cage.g.position.clone().add(vS.set(fx*.05,.02,fz*.05)),vS.set(-fx,0,-fz).clone(),2,true); noise(.05,700+Math.random()*400,2,.05); }
    let near=null,nd=2.5; signs.forEach(s=>{ if(s.done||!s.k||!CR[s.k]||s.k==='ghostcrab'||s.k==='ragworm') return;   /* 拖籠拖得到文蛤、赤嘴蛤、海瓜子、竹蟶 */ const d=Math.hypot(s.m.position.x-x,s.m.position.z-z); if(d<nd){ nd=d; near=s; } });
    const p=cage.items.length>=6?0:near?dt*1.1:dt*.32;   // 比較容易中：空地大約每 3 秒一個，痕跡附近更快；一籠最多 6 個
    if(Math.random()<p){ const k=near?near.k:['hardclam','hardclam','gomphina','tellin','tellin','razor'][Math.floor(Math.random()*6)]; const cr=CR[k]; cage.items.push({k,size:rand(cr.size[0],cr.size[1])}); if(near&&Math.random()<.45) { near.done=true; near.m.visible=false; if(near.m.userData.det) near.m.userData.det.visible=false; if(near.ring) near.ring.visible=false; }
      vib([15,25,15]); noise(.04,1900,7,.2); c.toast('喀啦！有東西進籠子了','',900); }
    cage.sand.scale.y=.004+cage.fill*.12; if(cage.fill>=1){ walkReq=0; } if(Math.random()<dt*2) cageUI(); }
  if(cage.wash>0){ cage.sand.scale.y=Math.max(.002,(1-cage.wash)*(.004+cage.fill*.12)); if(Math.random()<dt*10) squirt(cage.g.position.clone().add(vS.set(rand(-.15,.15),.05,rand(-.1,.1))),.6,3); } }
// 淘洗：左右快速滑動
let lastSX=null, lastDir=0;
window.addEventListener('pointermove',e=>{ if(!cage.on||!(cage.wash>0)||cage.wash>=1) return; if(lastSX===null){ lastSX=e.clientX; return; } const dx=e.clientX-lastSX; if(Math.abs(dx)>25){ const d=Math.sign(dx); cage.swipeDir=d; if(d!==lastDir){ lastDir=d; cage.wash=Math.min(1,cage.wash+.09); for(let n=0;n<8;n++){ const w=drops.find(q=>q.a<=0); if(!w) break; w.a=1; w.p.copy(cage.g.position).add(vS.set(rand(-.2,.2),.04,rand(-.1,.3))); w.v.set(-d*rand(.3,.8)*Math.cos(yaw),rand(.2,.6),d*rand(.3,.8)*Math.sin(yaw)); w.s=rand(.003,.006); } spawnMud(cage.g.position.clone(),vS.set(-d*Math.cos(yaw),0,d*Math.sin(yaw)).clone(),3,true); hand.mud=Math.max(0,(hand.mud||0)-.04); handL.mud=Math.max(0,(handL.mud||0)-.04); cage.shake+=1.4; noise(.15,500,1.5,.12); vib(12); cageUI();
      if(cage.wash>=1) cageReveal(); } lastSX=e.clientX; } });
window.addEventListener('pointerup',()=>{ lastSX=null; });
function cageReveal(){ cage.inside.clear(); cage.sand.visible=false; const shown=cage.items.slice(0,14);
  shown.forEach((it,i)=>{ try{ const f=creaModel(c.species(it.k)); f.group.scale.setScalar(it.size); f.group.position.set(rand(-.17,.17),.012,rand(.04,.28)); f.group.rotation.set(0,rand(0,6),0); cage.inside.add(f.group); }catch(e){} });
  const names={}; cage.items.forEach(it=>{ names[CR[it.k].n]=(names[CR[it.k].n]||0)+1; });
  $('cgInfo').innerHTML=cage.items.length?'<b>泥沙洗掉了！</b><br>'+Object.entries(names).map(([n,c2])=>n+' ×'+c2).join('、'):'<b>洗乾淨了…只有碎貝殼</b><br><small>下次拖過痕跡附近</small>';
  const tot=cage.items.reduce((a,it)=>a+Math.round(CR[it.k].price*(.6+it.size*6)),0);
  $('cgBtns').innerHTML=(cage.items.length?'<button id="cgCook" style="background:#ffcf66;color:#3a2600">🔥 帶回家烤</button><button id="cgTank" style="background:#3b7bb8;color:#fff">🐚 帶回家養</button><button id="cgSell" style="background:#2e8b57;color:#fff">🪙 賣掉 '+tot+'</button>':'')+'<button id="cgPour" style="background:#555;color:#fff">'+(cage.items.length?'🪣 先放桶子':'倒掉')+'</button>';
  const clr=()=>{ cage.items=[]; cage.fill=0; cage.dist=0; cage.wash=0; cage.inside.clear(); cage.sand.visible=true; cage.sand.scale.y=.004; cageUI(); };
  const each=(fn,okMsg)=>{ let n=0,fail=null; cage.items=cage.items.filter(it=>{ const r=fn(it); if(r===true){ n++; if(c.dex) c.dex(it.k,it.size); bag.push({id:it.k,v:0,L:+it.size.toFixed(3),done:true}); return false; } fail=fail||r; return true; }); bagText();
    if(n) c.toast(okMsg.replace('#',n),'good',1600); if(fail&&cage.items.length) c.toast(fail+'（剩下的 '+cage.items.length+' 個還在籠裡）','warn',2400); if(!cage.items.length) clr(); };
  const ck=$('cgCook'); if(ck) ck.onclick=()=>each(it=>c.toCooler?(c.toCooler(it.k,+it.size.toFixed(3))?true:'保冷箱滿了（最多 5 個）'):'不能放保冷箱','放進保冷箱 # 個，回小屋就能烤');
  const tk2=$('cgTank'); if(tk2) tk2.onclick=()=>each(it=>{ const r=c.keepTank?c.keepTank(it.k,+it.size.toFixed(3)):'放不進去'; return r===true?true:(r||'放不進水族箱'); },'放進海水缸 # 個');
  const sl=$('cgSell'); if(sl) sl.onclick=()=>{ if(c.sellNow) c.sellNow(tot); cage.items.forEach(it=>{ if(c.dex) c.dex(it.k,it.size); bag.push({id:it.k,v:0,L:+it.size.toFixed(3),done:true}); }); bagText(); c.toast('賣了 🪙'+tot,'good',1500);
    cage.items=[]; cage.fill=0; cage.dist=0; cage.wash=0; cage.inside.clear(); cage.sand.visible=true; cage.sand.scale.y=.004; cageUI(); };   // 桶子裡的回岸時再決定烤、養或賣
  $('cgPour').onclick=()=>{ cage.items.forEach(it=>{ const cr=CR[it.k], v=Math.round(cr.price*(.6+it.size*6)); bag.push({id:it.k,v,L:+it.size.toFixed(3),broken:false}); bucketAdd(it.k,it.size); }); if(cage.items.length){ bagText(); vib([20,30,60]); noise(.25,600,2,.2); c.toast('倒進桶子了：'+cage.items.length+' 個','good',1600); }
    cage.items=[]; cage.fill=0; cage.dist=0; cage.wash=0; cage.inside.clear(); cage.sand.visible=true; cage.sand.scale.y=.004; cageUI(); }; }

/* ---------- 握著工具的手：沿用遊戲裡第一人稱的手臂模型（戴手套），右手握住手耙的柄／拖籠的竹竿 ---------- */
// 兩隻手：右手、左手各一份（同一個手臂模型，各自只留那一側）；挖洞時哪一邊近就用哪隻手，不會一隻手橫過整個畫面
function mkHand(side){ return {side,ready:false,grp:new T.Group(),fing:[],pl:null,ld:null,L0:1}; }
const hand=mkHand('R'), handL=mkHand('L');
if(T.GLTFLoader) new T.GLTFLoader().load('models/arms.glb',g=>{ for(const h of [hand,handL]){ const sd=h.side, os=sd==='R'?'L':'R';
  const o=T.SkeletonUtils?T.SkeletonUtils.clone(g.scene):g.scene.clone(true); let wrist=null,root=null,palm=null,other=null;
  o.traverse(b=>{ if(!b.isBone) return; const n=b.name; if(n.indexOf(sd+'_wrist')===0) wrist=b; if(n.indexOf(sd+'_arm')===0) root=b; if(n.indexOf(sd+'_palm')===0) palm=b; if(n.indexOf(os+'_arm')===0) other=b;
    const m=n.match(new RegExp('^'+sd+'_(point|middle|ring|pink)([123])')); if(m) h.fing.push({b,k:[.7,1,.8][+m[2]-1],x0:b.rotation.x}); const th=n.match(new RegExp('^'+sd+'_thumb([123])')); if(th) h.fing.push({b,k:[.45,.6,.5][+th[1]-1],x0:b.rotation.x}); });
  if(!wrist||!root) continue; if(other) other.scale.setScalar(1e-4);
  o.traverse(m=>{ m.frustumCulled=false; if(m.isMesh){ m.material=(Array.isArray(m.material)?m.material:[m.material]).map(mm=>{ const c2=mm.clone(); c2.envMapIntensity=.3; c2.roughness=.95; c2.metalness=0; h.mats=(h.mats||[]).concat(c2); return c2; }); if(m.material.length===1) m.material=m.material[0]; } });   // 每隻手自己的材質（才能各自沾泥）
  h.mud=0; h.grp.add(o); h.grp.updateMatrixWorld(true); const wl=new T.Vector3().setFromMatrixPosition(wrist.matrixWorld), rl=new T.Vector3().setFromMatrixPosition(root.matrixWorld);
  h.pl=palm?new T.Vector3().setFromMatrixPosition(palm.matrixWorld):wl.clone(); h.ld=new T.Vector3().subVectors(wl,rl); h.L0=h.ld.length(); h.ld.normalize(); h.ready=true; } });
hand.grp.visible=false; handL.grp.visible=false; S.add(hand.grp); S.add(handL.grp);
const hq=new T.Quaternion(), hq2=new T.Quaternion(), hsh=new T.Vector3(), hwd=new T.Vector3(), hup=new T.Vector3(), hupW=new T.Vector3(), htmp=new T.Vector3(), hcq=new T.Quaternion();
// tg：手要到的點（世界座標）；sx,sy,sz：肩膀相對鏡頭的位置
function handTo(tg,grip,sx,sy,sz,cap,H){ H=H||hand; sx=sx??.2; sy=sy??-.62; sz=sz??.18; cap=cap??.7; if(!H.ready){ H.grp.visible=false; return; } H.grp.visible=true; cam.updateMatrixWorld(); cam.getWorldQuaternion(hcq);
  cam.localToWorld(hsh.set(sx,sy,sz)); hwd.subVectors(tg,hsh).normalize(); hq.setFromUnitVectors(H.ld,hwd);
  hup.set(0,1,0).applyQuaternion(hq); hupW.set(0,1,0).applyQuaternion(hcq); hup.addScaledVector(hwd,-hup.dot(hwd)).normalize(); hupW.addScaledVector(hwd,-hupW.dot(hwd)).normalize();
  const roll=Math.atan2(htmp.crossVectors(hup,hupW).dot(hwd),hup.dot(hupW))+(H.side==='R'?-.35:.35); hq2.setFromAxisAngle(hwd,roll); hq.premultiply(hq2);
  const s=Math.min(cap,hsh.distanceTo(tg)*1.02)/H.L0; H.grp.scale.setScalar(s); H.grp.quaternion.copy(hq);
  hup.set(0,1,0).applyQuaternion(hq); H.grp.position.copy(tg).sub(htmp.copy(H.pl).multiplyScalar(s).applyQuaternion(hq)).addScaledVector(hup,.016);
  H.fing.forEach(f=>{ f.b.rotation.x=f.x0-grip*f.k; });
  if(H.mats&&Math.abs((H.mudShown||0)-H.mud)>.01){ H.mudShown=H.mud; const k=Math.min(.7,H.mud*.7); H.mats.forEach(m=>{ m.color.setRGB(1-k*.55,1-k*.62,1-k*.7); m.roughness=.95-.5*k; }); } }   // 手套越挖越沾泥：變成濕濕的泥褐色、帶一點水光

const gripW=new T.Vector3();
const handCur=new T.Vector3(), handGoal=new T.Vector3(); let scoop=0, flick=0;
function handTick(){ if(dig&&(dig.phase==='dig'||dig.phase==='ask'&&false)&&dig.c){ const d=dig, fx=-Math.sin(yaw), fz=-Math.cos(yaw), rx=Math.cos(yaw), rz=-Math.sin(yaw);
    if(d.ptr&&d.handP&&!d.ready){ handGoal.copy(d.handP); handGoal.y-=.016*Math.min(1,scoop); handGoal.y+=.05*flick*flick; }   // 拖的時候手指插進泥裡往後扒；換方向時手往上一抬（把泥撈出來）
    else { const x=d.c.x+rx*.24-fx*.14, z=d.c.z+rz*.24-fz*.14; handGoal.set(x,patchY(x,z)+.06+.04*flick,z); }   // 沒在撥：手退到右邊，不擋住洞   // 沒在撥：手停在洞的右前方邊緣
    if(!handCur.lengthSq()) handCur.copy(handGoal); handCur.lerp(handGoal,.35); flick=Math.max(0,flick-.045);
    { const side=((handCur.x-d.c.x)*rx+(handCur.z-d.c.z)*rz)<-.03?'L':'R'; if(d.useL===undefined) d.useL=false; if(side==='L'&&!d.useL) d.useL=true; else if(side==='R'&&d.useL&&((handCur.x-d.c.x)*rx+(handCur.z-d.c.z)*rz)>.03) d.useL=false;   // 洞的左邊用左手、右邊用右手（有一點緩衝，不會一直換）
      const act=d.useL?handL:hand, rest=d.useL?hand:handL, rsx=d.useL?.24:-.24, rx2=d.c.x+rx*rsx-fx*.16, rz2=d.c.z+rz*rsx-fz*.16;
      handTo(handCur,d.ptr?.55+.35*Math.min(1,spdS):.25,d.useL?-.3:.3,-.26,.06,.36,act);
      vS.set(rx2,patchY(rx2,rz2)+.07,rz2); handTo(vS.clone(),.3,d.useL?.3:-.3,-.26,.06,.36,rest); }   // 另一隻手撐在洞的另一邊
    return; }   /* 肩膀在畫面右下外側：只有手和前臂從右邊伸進來 */   /* 徒手挖：手指半彎像在撥泥，撥得越快握得越緊 */
  else if(false){ rake.updateMatrixWorld(true); const hm=rake.children.find(m=>m.geometry&&m.geometry.parameters&&m.geometry.parameters.height===.3); if(hm){ gripW.set(0,.13,0); hm.localToWorld(gripW); handTo(gripW,.95,.34,-.36,.42,.4); }   /* 跪著挖時鏡頭很近：手從右下角伸進來、比例縮小，不擋住洞 */ else hand.grp.visible=false; }   // 握住手耙木柄的尾端
  else if(cage.on){ handL.grp.visible=false; cage.g.updateMatrixWorld(); const pole=cage.g.children.find(m=>m.geometry&&m.geometry.parameters&&m.geometry.parameters.height===1.5); if(pole){ gripW.set(0,-.2,0); pole.localToWorld(gripW); handTo(gripW,.9); } else hand.grp.visible=false; }
  else { hand.grp.visible=false; handL.grp.visible=false; } }

let hold=null;
function holdCatch(id,L,r){ const sp=c.species(id); let f=null; try{ if(creaReady(id)) f=creaModel(sp); }catch(e){} if(!f) return;
  f.group.scale.setScalar(L); S.add(f.group); const v=SURF[id].price+Math.round(L*400); hold={f,id,L,v,t:0}; if(c.dex) c.dex(id,L); vib([20,30,60]);
  $('digInfo').innerHTML='<b>抓到'+SURF[id].n+'了！</b> '+Math.round(L*100)+' 公分<br><small>'+({fiddler:'雄蟹那隻大螯是用來求偶和打架的',mudskip:'牠用胸鰭在泥上爬、會跳，離開水也能呼吸',hermit:'牠背的殼是撿來的空螺殼，長大了會換'}[id]||'')+'</small>';
  $('digBtns').innerHTML='<button id="hdTank" style="background:#3b7bb8;color:#fff">🐚 帶回家養</button><button id="hdSell" style="background:#2e8b57;color:#fff">🪙 賣掉 '+v+'</button><button id="hdFree" style="background:#333;color:#fff">放牠走</button>';
  box.style.display='flex'; ['tdHint','tdExit','tdStomp','tdCageB'].forEach(i=>{ const e=$(i); if(e) e.style.visibility='hidden'; });
  const fin=how=>{ if(!hold) return; if(how==='tank'){ const rr=c.keepTank?c.keepTank(id,+L.toFixed(3)):false; if(rr!==true){ c.toast(rr||'放不進水族箱','warn',2200); return; } c.toast('放進小屋的海水缸了','good',1500); bag.push({id,v:0,L,done:true}); }
    else if(how==='sell'){ if(c.sellNow) c.sellNow(v); c.toast('賣了 🪙'+v,'good',1300); bag.push({id,v:0,L,done:true}); } else c.toast('放牠回泥灘了','',1000);
    bagText(); hold.end=how; box.style.display='none'; ['tdHint','tdExit','tdStomp','tdCageB'].forEach(i=>{ const e=$(i); if(e) e.style.visibility=''; }); };
  $('hdTank').onclick=()=>fin('tank'); $('hdSell').onclick=()=>fin('sell'); $('hdFree').onclick=()=>fin('free'); }
function holdTick(dt){ if(!hold) return; hold.t+=dt; const g=hold.f.group, u=hold.f.uni; u.uAmp.value=hold.id==='mudskip'?.06:.2; u.uSwim.value+=dt*(hold.id==='mudskip'?7:14);   // 拿在手上還在掙扎
  if(!hold.end){ g.position.copy(cam.position).add(vS.set(.0,-.035,-.2).applyQuaternion(cam.quaternion)); g.quaternion.copy(cam.quaternion); g.rotateY(Math.PI/2+Math.sin(hold.t*1.2)*.6); g.rotateX(-.5); return; }
  hold.k=(hold.k||0)+dt; if(hold.end==='free'){ g.position.y-=dt*.8; g.rotation.y+=dt*3; } else { g.scale.multiplyScalar(1-dt*4); g.position.y-=dt*.3; }
  if(hold.k>.6){ S.remove(g); hold=null; } }
/* ---------- 挖出來的生物：在洞旁邊用 3D 模型＋骨架動一下 ---------- */
const shown=[];
function showCatch(id,p){ const sp=c.species(id); if(!sp) return; try{ if(!creaReady(id)) return; const f=creaModel(sp); f.group.scale.setScalar(Math.max(.06,(sp.len[0]+sp.len[1])/200)*1.5); f.group.position.set(p.x+.3,hAt(p.x+.3,p.z)+.05,p.z); S.add(f.group); shown.push({f,t:0}); }catch(e){} }
/* ---------- 進入／離開 ---------- */
function enter(){ const h=c.hour(), w=TIDETEST?[h,h+24]:lowWin(h); if(!w){ const n=nextLow(h); c.toast(`🌊 現在是滿潮，泥灘都在水下。下次退潮 ${String(Math.floor(n%24)).padStart(2,'0')}:${n%1?'30':'00'}`,'warn',3200); return false; }
  on=true; rakeMud=0; setTimeout(tutShow,1200); ambStart(); inBucket.forEach(f=>bucketIn.remove(f.group)); inBucket.length=0; walkReq=0; walkV=0; sink=0; prints.forEach(p=>S.remove(p.m)); prints.length=0; endH=w[1]; warned=0; evac=false; bag=[]; yaw=0; pitch=-.32; pos.set(0,1.6,18); spawnSigns(); spawnRoamers(); bagText(); hud.style.display='block'; document.body.classList.add('attide');
  c.toast('🦀 退潮了！看泥面痕跡找生物。注意右上角的漲潮時間','good',3200); return true; }
function exit(forced){ if(!on) return; on=false; coach.style.display='none'; holePatches.forEach(p2=>S.remove(p2)); holePatches.length=0; HOLES.forEach(h=>h.set(0,0,0)); ambStop(); cageOff(); trails.forEach(o=>S.remove(o.m)); trails.length=0; cage.items=[]; cage.fill=0; cage.wash=0; hud.style.display='none'; warnEl.style.display='none'; box.style.display='none'; dig=null; document.body.classList.remove('attide');
  roamers.forEach(r=>S.remove(r.g)); roamers=[]; shown.forEach(s=>S.remove(s.f.group)); shown.length=0;
  if(forced&&bag.length){ bag.splice(Math.ceil(bag.length/2)); }
  c.onExit(bag.slice(),forced); bag=[]; }
$('tdExit').onclick=()=>exit(false);
/* ---------- 第一次來：一步一步教（找痕跡→跺腳→走過去點→開挖→撥泥→碰到放慢→取出），做到了才跳下一步 ---------- */
const coach=document.createElement('div'); coach.id='tdCoach'; document.body.appendChild(coach);
const TUT_K='swampAngler.tideTut'; let tutStep=+(localStorage.getItem(TUT_K)||0);
const TUT=[
  ['stomp','<b>① 先找哪裡有東西</b><br>泥面上的小孔、兩個並排的孔、細長的孔、大洞旁的沙堆，都是生物住的地方。<br>先按右下角的「👣 跺腳」──附近埋著貝類的話，會噴出一道水柱。'],
  ['ask','<b>② 走過去，點那個痕跡</b><br>手指<b>往上拖</b>往前走、<b>左右拖</b>轉頭。走到噴水或有孔的地方，<b>點一下那個痕跡</b>。'],
  ['go','<b>③ 看線索，決定要不要挖</b><br>下面會告訴你這種痕跡底下多半是什麼。按「🪏 開挖」。'],
  ['found','<b>④ 用手撥開泥</b><br>手指在洞上<b>來回撥</b>，手會扒泥、甩泥。往孔的正中間挖，下面會告訴你「還差幾公分」。'],
  ['ready','<b>⑤ 碰到了！放慢</b><br>力道條保持<b>綠色</b>，沿著牠周圍慢慢清，太快會刮傷殼。'],
  ['done','<b>⑥ 取出</b><br>露出來就按「✋ 取出」，再選帶回家烤、帶回家養、賣掉或放回去。<br><small>同一窩通常不只一個，把洞往周圍挖大還有。</small>']];
function tutShow(){ if(!on||tutStep>=TUT.length){ coach.style.display='none'; return; } coach.innerHTML=TUT[tutStep][1]+'<button id="tdCoachX">略過教學</button>'; coach.style.display='block';
  $('tdCoachX').onclick=()=>{ tutStep=TUT.length; localStorage.setItem(TUT_K,tutStep); tutShow(); }; }
function tut(ev){ if(tutStep>=TUT.length) return; const i=TUT.findIndex(t=>t[0]===ev); if(i>=tutStep){ tutStep=i+1; localStorage.setItem(TUT_K,tutStep); vib(10); setTimeout(tutShow,250); } }   // 玩家跳過某步（例如沒跺腳就直接挖）也會跟上目前的進度
$('tdCageB').onclick=()=>{ if(cage.on) cageOff(); else cageOn(); };
// 跺腳：附近 5 公尺內埋著的貝類受到震動，縮回水管、噴出一道水（真實挖蛤的人就是這樣找的）
$('tdStomp').onclick=()=>{ if(!on||dig) return;
  if(tutStep===0){ const fx=-Math.sin(yaw), fz=-Math.cos(yaw); let s0=signs.find(q=>!q.done&&q.k==='hardclam'); if(s0&&Math.hypot(s0.m.position.x-pos.x,s0.m.position.z-pos.z)>4.5){ const x=pos.x+fx*3, z=pos.z+fz*3; s0.m.position.set(x,hAt(x,z)+.015,z); if(s0.m.userData.det){ s0.m.userData.det.position.set(x,hAt(x,z)+.003,z); } } }   // 教學第一次跺腳：保證前方 3 公尺有一個文蛤會噴水
  tut('stomp'); vib([40,30,60]); noise(.18,120,1,.35); sink=Math.min(.12,sink+.05); let n=0;
  signs.forEach(s=>{ if(s.done||!s.k) return; const d=Math.hypot(s.m.position.x-pos.x,s.m.position.z-pos.z); if(d>5) return;
    const sq=s.k==='hardclam'||s.k==='gomphina'||s.k==='razor'; setTimeout(()=>{ const p=s.m.position.clone(); if(sq){ jet(p); squirt(p,1.5+Math.random()*.6,14); noise(.12,2800,2,.09); } if(s.ring){ s.ring.material.opacity=1; } },200+d*120+Math.random()*250); if(sq) n++; });
  setTimeout(()=>{ c.toast(n?'噗！附近有 '+n+' 道水柱噴出來──底下有東西':'附近沒什麼反應，換個地方再跺跺看','',1600); },700); };
/* ---------- 操作：拖曳轉頭與前進、點痕跡或活生物 ---------- */
const canvas=W.renderer.domElement;
/* ---------- 走在泥灘上的體感 ----------
   ・每一步：腳步聲（沙地沙沙、泥地「啵」的吸附聲）、手機輕震、鏡頭隨步伐上下晃、左右微傾
   ・低窪的軟泥：走得慢、鏡頭往下沉、拔腳時有「噗滋」的吸附聲和比較長的震動
   ・腳印：左右交替留在泥上，泥地的腳印會慢慢積水反光，一段時間後被抹平
   ・環境聲：海風、遠處浪聲（漲潮越近越大聲）、偶爾的海鳥叫聲 */
let walkReq=0, walkV=0, stepAcc=0, stepSide=1, bobT=0, sink=0;
const fpG=new T.PlaneGeometry(.13,.3).rotateX(-Math.PI/2);
const fpTex=(()=>{ const c=document.createElement('canvas'); c.width=32; c.height=64; const g=c.getContext('2d'); const r=g.createRadialGradient(16,22,2,16,26,16); r.addColorStop(0,'rgba(30,24,18,.75)'); r.addColorStop(1,'rgba(30,24,18,0)'); g.fillStyle=r; g.beginPath(); g.ellipse(16,22,11,18,0,0,7); g.fill(); g.beginPath(); g.ellipse(16,52,9,10,0,0,7); g.fill(); return new T.CanvasTexture(c); })();
const prints=[];
function footprint(x,z,ang,soft){ const m=new T.Mesh(fpG,new T.MeshStandardMaterial({map:fpTex,transparent:true,depthWrite:false,roughness:.25,metalness:.1,color:soft?0x3a3632:0x4a433b,opacity:.85}));
  m.position.set(x,hAt(x,z)+.006,z); m.rotation.y=ang; S.add(m); prints.push({m,t:0,soft}); if(prints.length>40){ const o=prints.shift(); S.remove(o.m); } }
function stepSound(soft,sandy){ const a=ac(); if(!a) return; if(sandy){ noise(.12,2600,1.2,.06); return; }
  noise(.09,500,2,.16); if(soft) setTimeout(()=>{ noise(.22,320,5,.14); noise(.06,1400,3,.05); },120); }   // 泥：落腳的悶響＋拔腳的吸附聲
let amb=null;
function ambStart(){ const a=ac(); if(!a||amb) return; const mk=(f,q,vol)=>{ const n=a.sampleRate*3, b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0); let l=0; for(let i=0;i<n;i++){ l=l*.97+(Math.random()*2-1)*.03; d[i]=l*6; }
    const s=a.createBufferSource(); s.buffer=b; s.loop=true; const fl=a.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=f; fl.Q.value=q; const g=a.createGain(); g.gain.value=vol; s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(); return {s,g,fl}; };
  amb={wind:mk(900,.4,.05),wave:mk(380,.7,.03),bird:0}; }
function ambStop(){ if(!amb) return; try{ amb.wind.s.stop(); amb.wave.s.stop(); }catch(e){} amb=null; }
function birdCall(){ const a=ac(); if(!a) return; const o=a.createOscillator(), g=a.createGain(); o.type='sine'; const t=a.currentTime, f=1800+Math.random()*900;
  o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f*1.6,t+.08); o.frequency.exponentialRampToValueAtTime(f*.9,t+.18);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.025,t+.03); g.gain.exponentialRampToValueAtTime(.0005,t+.22); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+.25); }
function walkTick(dt,left){ const soft=hAt(pos.x,pos.z)<-.06, sandy=sandK(pos.x,pos.z)>.5, maxV=soft?.55:sandy?1.5:1.1;   // 公尺／秒：軟泥很慢
  walkV+=((walkReq*maxV)-walkV)*Math.min(1,dt*(soft?2:5));
  pos.x+=-Math.sin(yaw)*walkV*dt; pos.z+=-Math.cos(yaw)*walkV*dt; pos.x=clamp(pos.x,-18,18); pos.z=clamp(pos.z,-30,24);
  const sp=Math.abs(walkV); stepAcc+=sp*dt; bobT+=sp*dt*(Math.PI/.7);
  sink+=((soft&&sp>.05?.09:soft?.05:0)-sink)*Math.min(1,dt*2);   // 站在軟泥裡會慢慢陷下去
  if(stepAcc>.7){ stepAcc=0; stepSide=-stepSide; const sx=pos.x+Math.cos(yaw)*.12*stepSide, sz=pos.z-Math.sin(yaw)*.12*stepSide; footprint(sx,sz,yaw,soft); stepSound(soft,sandy); vib(soft?[10,60,25]:12);
    if(soft&&Math.random()<.12) c.toast('腳陷進軟泥裡了，走慢一點','',1200); }
  prints.forEach(p=>{ p.t+=dt; const m=p.m.material; if(p.soft) m.color.setHex(p.t<20?0x6a6a70:0x7d8a90); m.roughness=p.soft?Math.max(.05,.25-p.t*.01):.5; m.opacity=Math.max(0,.9-Math.max(0,p.t-50)/30); });   // 泥地腳印慢慢積水、反光，之後被抹平
  if(amb){ amb.wind.g.gain.value=.04+.02*Math.sin(performance.now()*.0003); amb.wave.g.gain.value=.02+.08*Math.max(0,1-left/40); amb.bird-=dt; if(amb.bird<=0){ amb.bird=4+Math.random()*9; birdCall(); if(Math.random()<.5) setTimeout(birdCall,180); } } }
 let drag=null;
const ray=new T.Raycaster(), v2=new T.Vector2();
function down(e){ if(!on||dig) return; drag={x:e.clientX,y:e.clientY,yaw,moved:0,t:performance.now()}; }
function move(e){ if(!on||!drag||dig||(cage.on&&cage.wash>0)) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y; drag.moved=Math.max(drag.moved,Math.hypot(dx,dy)); yaw=drag.yaw-dx*.005;
  walkReq=clamp(-dy*.012,-1,1); }   // 上下拖曳的距離＝走路的意圖（快慢），實際移動在每格畫面裡算（軟泥會變慢）
function up(e){ walkReq=0; if(!on||!drag||dig||cage.on||hold){ drag=null; return; } const was=drag; drag=null; if(was.moved>10) return;
  v2.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(v2,cam);
  let rTap=null,rBest=120; roamers.forEach(q=>{ const v=q.g.position.clone().project(cam); if(v.z>1) return; const sx=(v.x+1)/2*innerWidth, sy=(1-v.y)/2*innerHeight, dd=Math.hypot(sx-e.clientX,sy-e.clientY); if(dd<rBest&&q.g.position.distanceTo(pos)<8){ rBest=dd; rTap=q; } });   // 點在牠附近 80 像素內就算點到
  const rh=rTap?[{object:rTap.g}]:[]; if(rh.length){ let o=rh[0].object; const r=roamers.find(q=>{ let x=o; while(x){ if(x===q.g) return true; x=x.parent; } return false; });
      if(r){ const dd=Math.hypot(r.g.position.x-pos.x,r.g.position.z-pos.z); if(dd>6){ c.toast(SURF[r.id].n+'在 '+dd.toFixed(1)+' 公尺外，再走近一點','',1500); return; }   // 6 公尺內都能抓（手機操作方便）；越遠越難：機率隨距離降低
        // 機率：寄居蟹慢最好抓、招潮蟹中等、彈塗魚很難；走太快靠近會驚動牠；牠正在逃更難
        const sneak=Math.abs(walkV)>.6||r.spook>0?.45:1, far=dd<2?1:1-(dd-2)/4*.45, pc=(r.id==='hermit'?.8:r.id==='fiddler'?.55:.38)*sneak*far*(r.flee>0?.4:1);
        vib(15); noise(.08,900,2,.12);   // 撲過去的聲音
        if(Math.random()<pc){ S.remove(r.g); roamers.splice(roamers.indexOf(r),1); holdCatch(r.id,r.L,r); }
        else { r.flee=2.5; r.h=Math.atan2(r.g.position.x-pos.x,r.g.position.z-pos.z); if(r.id==='fiddler'&&Math.random()<.6) r.burrow=1;   // 招潮蟹一溜煙鑽進洞裡
          c.toast(r.id==='fiddler'?(r.burrow?'招潮蟹一溜煙鑽回洞裡了':'招潮蟹橫著逃走了'):r.id==='mudskip'?'彈塗魚一彈就跳開了':'寄居蟹縮進殼裡滾開了',''+'',1300); c.toast((sneak<1?'走太快把牠驚動了，放慢腳步再靠近':'差一點！再試一次'),'',1500); } return; } }
  let hits=ray.intersectObjects(signs.filter(s=>!s.done).map(s=>s.m));
  if(!hits.length){ const gh=ray.intersectObject(ground); if(gh.length){ const p=gh[0].point; let best=null,bd=1.3; signs.forEach(s=>{ if(s.done) return; const d=Math.hypot(s.m.position.x-p.x,s.m.position.z-p.z); if(d<bd){ bd=d; best=s; } }); if(best) hits=[{object:best.m}]; else { c.toast('這裡看不出痕跡，找找泥面上的小孔、雙孔、細長的孔、沙堆或一圈小沙球，也可以按「跺腳」看哪裡噴水','',1800); return; } } }
  if(hits.length){ const s=signs.find(q=>q.m===hits[0].object); if(s.m.position.distanceTo(pos)>7){ c.toast('走近一點才能挖','',1200); return; } startDig(s); } }
window.addEventListener('pointerdown',e=>{ if(!on||dig) return; const t=e.target; if(t&&t.closest&&t.closest('button,#tdDig,#tdBag,#tdClock,.sheet,#sheet')) return; down(e); });   /* 原本只聽 3D 畫布，畫布上面還蓋著遊戲的其他觸控層，點了沒反應 */ window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
/* ---------- 每一格 ---------- */
let t=0;
let rspawn=0;
function render(dt){ if(!on) return; if(!dig) dropTick(dt); jetTick(dt); t+=dt; if(!roamers.length&&(rspawn-=dt)<=0){ rspawn=2; spawnRoamers(); } /* 模型下載好就放出泥面上的生物 */ const h=c.hour(), left=(endH-h)*60;   // 剩下幾分鐘（遊戲時間）
  $('tdClock').innerHTML=left>40?`🌊 退潮中・離漲潮還有 ${Math.floor(left)} 分`:`<span style="color:#ffb39a">⚠️ 漲潮倒數 ${Math.max(0,Math.floor(left))} 分</span>`;
  if(left<=40&&warned<1){ warned=1; warnEl.innerHTML='🌊 潮水開始回漲了！<br><small>跟著地上發亮的箭頭往岸邊走</small>'; warnEl.style.display='block'; setTimeout(()=>warnEl.style.display='none',3800); vib([80,60,80]); /* 不再插旗子 */ }
  if(left<=20&&warned<2){ warned=2; warnEl.innerHTML='⚠️ 二十分鐘後滿潮！立刻撤離<br><small>真實的泥灘：漲潮速度常比走路快，泥灘也會陷住腳。一定要先查潮汐表、結伴、提早離開</small>'; warnEl.style.display='block'; setTimeout(()=>warnEl.style.display='none',5200); vib([120,80,120,80,120]); }
  if(left<=0&&!evac){ evac=true; c.toast('🌊 潮水漲上來了！你被救生員帶回岸邊，桶子裡掉了一半','warn',4200); setTimeout(()=>exit(true),600); }
  // 海水往岸邊推進
  const k=clamp(1-left/40,0,1); sea.position.z=-200+k*k*175;
  // 噴水的文蛤孔、會動的痕跡
  signs.forEach(s=>{ if(s.done||s.k!=='hardclam') return; s.spurt-=dt; if(s.spurt<=0){ s.spurt=rand(3,7); if(s.m.position.distanceTo(pos)<9&&window.__P_splash) window.__P_splash(s.m.position.x,0,s.m.position.z); } });
  // 活生物：招潮蟹橫著走、彈塗魚一跳一跳、寄居蟹慢慢爬；骨架擺動
  roamers=roamers.filter(r=>!r.gone); roamers.forEach(r=>{ r.t-=dt; if(r.t<=0){ r.t=rand(1.5,4); r.h+=rand(-1.4,1.4); } const fast=Math.abs(walkV)>.6, near=r.g.position.distanceTo(pos)<(fast?3.5:.9); r.spook=fast&&r.g.position.distanceTo(pos)<3.5?1:Math.max(0,(r.spook||0)-dt); if(near&&r.flee<=0){ r.flee=1.5;   /* 慢慢走近不太會驚動牠，走太快就跑 */ r.h=Math.atan2(r.g.position.x-pos.x,r.g.position.z-pos.z); }
    if(r.burrow){ r.burrow+=dt; r.g.position.y=hAt(r.g.position.x,r.g.position.z)-r.burrow*.06; if(r.burrow>1.6){ S.remove(r.g); r.gone=1; } return; }   // 鑽進洞裡
    r.flee-=dt; const sp=(r.id==='hermit'?.05:r.id==='fiddler'?.18:.12)*(r.flee>0?3:1);
    if(r.id==='mudskip'){ r.hop-=dt; if(r.hop<=0){ r.hop=rand(.8,2.2); r.jy=.35; } r.jy=Math.max(0,(r.jy||0)-dt*1.4); r.g.position.y=Math.sin(Math.min(1,(.35-r.jy)/.35)*Math.PI)*.08; } else r.g.position.y=0;
    const side=r.id==='fiddler'?Math.PI/2:0; r.g.position.x+=Math.sin(r.h)*sp*dt; r.g.position.z+=Math.cos(r.h)*sp*dt; r.g.rotation.y=r.h-Math.PI/2+side;
    r.g.position.x=clamp(r.g.position.x,-18,18); r.g.position.z=clamp(r.g.position.z,-30,20); r.g.position.y+=hAt(r.g.position.x,r.g.position.z)+.01; r.uni.uSwim.value+=dt*(4+sp*30); r.uni.uAmp.value=.05+sp*.4; });
  shown.forEach(s=>{ s.t+=dt; s.f.uni.uSwim.value+=dt*8; s.f.uni.uAmp.value=.08+.06*Math.sin(s.t*3); s.f.group.rotation.y+=dt*.6; });
  digTick(dt); cageTick(dt); trailTick(dt); holdTick(dt); flagTick(performance.now()*.001); chevTick(performance.now()*.001,left); if(gmat.userData.sh){ gmat.userData.sh.uniforms.uTW.value=performance.now()*.001; gmat.userData.sh.uniforms.uSkyK.value=Math.min(1.2,.35+.8*(S.children.find(o=>o.isHemisphereLight)||{intensity:1.7}).intensity/1.7); }
  walkTick(dt,left);
  pos.y=hAt(pos.x,pos.z)+1.55-sink+Math.abs(Math.sin(bobT))*-.035*Math.min(1,Math.abs(walkV));   // 跟著地形、走路上下晃、軟泥會陷
  { const fx=-Math.sin(yaw), fz=-Math.cos(yaw), rel=Math.atan2(0,1)-Math.atan2(fx,fz); const ar=document.getElementById('tdArr'); if(ar) ar.style.transform='rotate('+(-rel)+'rad)';   // 岸在 +z 方向
    const dd=document.getElementById('tdDist'); if(dd) dd.textContent=Math.max(0,Math.round(34-pos.z))+' m'; const sh=document.getElementById('tdShore'); if(sh) sh.classList.toggle('warn',!!warned); }
  signs.forEach(s=>{ if(!s.ring) return; const d=Math.hypot(s.m.position.x-pos.x,s.m.position.z-pos.z); s.ring.visible=!s.done&&!dig; s.ring.material.opacity=s.done?0:Math.max(0,1-d/12)*(.55+.4*Math.sin(performance.now()*.005+s.m.position.x)); const sc=1+.12*Math.sin(performance.now()*.005+s.m.position.x); s.ring.scale.set(sc,1,sc); });   // 12 公尺內的痕跡發光、呼吸，越近越亮   // 跟著地形高低走
  if(dig) digCam(); else { if(cam.fov!==58){ cam.fov=58; cam.updateProjectionMatrix(); }  cam.position.copy(pos); cam.rotation.set(pitch+Math.sin(bobT*2)*.006*Math.min(1,Math.abs(walkV)),yaw,Math.sin(bobT)*.01*Math.min(1,Math.abs(walkV)),'YXZ'); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
  handTick(); W.renderer.render(S,cam); }
return {makeModel:id=>{ try{ return creaModel(c.species(id)); }catch(e){ return null; } },testMat:()=>{ const d=dig; if(!d) return null; const m=d.patch.material, C=d.geo.attributes.color; let mx=0; for(let i=0;i<C.count;i++) mx=Math.max(mx,C.getX(i)); return {vis:d.patch.visible,inS:d.patch.parent===S,progs:(W.renderer.info.programs||[]).map(p=>(p.cacheKey||'').slice(-24)).filter(k=>/tide/.test(k)),props:Object.keys(W.renderer.properties.get(m)),vc:m.vertexColors,key:m.customProgramCacheKey&&m.customProgramCacheKey(),maxR:mx,same:m===gmat,prog:!!(W.renderer.properties.get(m).program),src:(W.renderer.properties.get(m).program||{}).name}; },testScrape:n=>{ const d=dig; if(!d) return 'nodig'; d.phase='dig'; for(let i=0;i<n;i++){ const a=Math.random()*6.28, r=Math.random()*.09; const p=new T.Vector3(d.c.x+Math.cos(a)*r,0,d.c.z+Math.sin(a)*r); p.y=patchY(p.x,p.z); scrape3(p,.3,new T.Vector3(Math.cos(a+1.57),0,Math.sin(a+1.57)),.008); if(d.ready) return 'ready@'+i; } return 'notyet'; },testModel:(id,dd=3,sc=.6)=>{ const f=creaModel(c.species(id)); f.group.scale.setScalar(sc); const fx=-Math.sin(yaw), fz=-Math.cos(yaw); f.group.position.set(pos.x+fx*dd,hAt(pos.x+fx*dd,pos.z+fz*dd)+.2,pos.z+fz*dd); S.add(f.group); return true; },testCatch:()=>{ const r=roamers[0]; if(!r) return 'none'; S.remove(r.g); roamers.splice(0,1); holdCatch(r.id,r.L,r); return r.id; },handInfo:()=>({ready:hand.ready,vis:hand.grp.visible,pos:hand.grp.position.toArray().map(v=>+v.toFixed(2)),s:+hand.grp.scale.x.toFixed(3),cam:cam.position.toArray().map(v=>+v.toFixed(2))}),testInfo:()=>{ const d=dig; if(!d) return null; const g=d.crea&&d.crea.group; return {depth:d.depth,k:d.k,stub:!!(d.crea&&d.crea.stub),gy:g&&g.position.y,surf:g&&patchY(g.position.x,g.position.z),hA:g&&hAt(g.position.x,g.position.z),maxD:Math.max(...d.D),found:d.found}; },testTake:()=>{ if(dig&&dig.crea){ dig.phase='dig'; dig.found=true; dig.ready=true; for(let i=0;i<dig.D.length;i++) dig.D[i]=Math.max(dig.D[i],0); takeOut(); return true; } return false; },showRoute:v=>{ route.visible=v; },testDig:k=>{ const s=signs.find(q=>q.k===k&&!q.done)||signs.find(q=>q.k); if(s) startDig(s); return !!s; },enter,exit,render,active:()=>on,low:h=>!!lowWin(h),nextLow,CR,SURF,ALL};
}
/* ===== 第 1 段 · 遊戲邏輯、操作、介面、音效 ===== */
function startGame(W, P){
'use strict';
const T=THREE, $=id=>document.getElementById(id);
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t, rand=(a,b)=>a+Math.random()*(b-a);
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const RAR=P.RAR, SPECIES=P.SPECIES, MAX_LINE=80;
// 捲線器的線量：湖、冰湖 80 公尺；出海用大型捲線器 250 公尺（旗魚、鮪魚一衝就是上百公尺，80 公尺根本留不住，最後一章的旗魚因此釣不到）
const maxLine=()=>G.loc==='sea'?250:MAX_LINE;

/* ---------- 存檔 ---------- */
// 測試帳號：網址加 test 參數，存檔另開一份（只限擁有者 Google 帳號，驗證在 y.js）
const TESTACC=/[?&]test=1(&|$)/.test(location.search);
/* 全開測試網址 ?unlock=1：獨立的一份存檔（不碰正式存檔、不上傳雲端），等級 60、金幣、獨木舟、遊艇、美人魚認可全部到位，所有釣點與章節都能進去 */
const UNLOCK=/[?&]unlock=1(&|$)/.test(location.search); window.__UNLOCK=UNLOCK;
const SAVE_KEY=UNLOCK?'swampAngler.unlockTest':TESTACC?'swampAngler.test':'swampAngler.v1';
window.__SAVE_KEY=SAVE_KEY;
let save={coins:0,total:0,sound:true,dex:{}};
try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); if(s) save=Object.assign(save,s); }catch(e){}
if(UNLOCK){ save.lv=Math.max(save.lv||1,60); save.coins=Math.max(save.coins||0,2000000); save.kayak=1; save.yacht=1; save.mer=Object.assign({n:20},save.mer||{}); if((save.mer.n||0)<20) save.mer.n=20; save.total=Math.max(save.total||0,500); save.intro=1; }
function persist(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(save)); }catch(e){} if(window.__CLOUD&&!UNLOCK) window.__CLOUD.dirty(); }   /* 全開測試的存檔絕不上傳雲端 */

/* ---------- 音效（全程序合成） ---------- */
const Snd=(()=>{
  let ctx=null,out=null,nb=null,rainG=null,AMB=null,on=save.sound!==false; const SMP={}; let reelSrc=null, reelG=null;
  // 捲線器循環：rate 決定轉速（收線慢轉、魚拉走線時高速尖叫），vol 0 就淡出
  function reelLoop(vol,rate){ if(!ctx||!SMP.reel) return false; if(!reelSrc&&vol>.01){ reelSrc=ctx.createBufferSource(); reelSrc.buffer=SMP.reel; reelSrc.loop=true; reelG=ctx.createGain(); reelG.gain.value=0; reelSrc.connect(reelG); reelG.connect(out); reelSrc.start(); }
    if(reelSrc){ reelG.gain.setTargetAtTime(vol,ctx.currentTime,.06); reelSrc.playbackRate.setTargetAtTime(rate,ctx.currentTime,.08); if(vol<=.01){ const s=reelSrc; reelSrc=null; setTimeout(()=>{ try{ s.stop(); }catch(e){} },400); } } return true; }
  function sample(k,vol,rate){ if(!ctx||!SMP[k]) return false; const s=ctx.createBufferSource(); s.buffer=SMP[k]; s.playbackRate.value=rate||1; const g=ctx.createGain(); g.gain.value=vol; s.connect(g); g.connect(out); s.start(); return true; }
  function init(){
    if(ctx){ if(ctx.state==='suspended') ctx.resume(); return; }
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    try{ ctx=new AC(); }catch(e){ return; }
    out=ctx.createGain(); out.gain.value=on?.8:0; out.connect(ctx.destination);
    // 真實錄音音效（OpenGameArt「Fisheefects」，CC0）：捲線器、水花；載入失敗就沿用合成音
    ['reel','splash'].forEach(k=>fetch('sfx_'+k+'.mp3').then(r=>r.arrayBuffer()).then(b=>ctx.decodeAudioData(b)).then(buf=>{ SMP[k]=buf; }).catch(()=>{}));
    nb=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate); const d=nb.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const amb=(rate,type,f,q,g0,lf,lg)=>{ const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true; s.playbackRate.value=rate;
      const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q; const g=ctx.createGain(); g.gain.value=g0;
      const o=ctx.createOscillator(); o.frequency.value=lf; const og=ctx.createGain(); og.gain.value=lg; o.connect(og); og.connect(g.gain);
      s.connect(fl); fl.connect(g); g.connect(out); s.start(); o.start(); };
    amb(1,'lowpass',320,.4,.06,.17,.035);
    amb(.7,'bandpass',2600,.6,.012,.06,.01);
    rainG=ctx.createGain(); rainG.gain.value=0; { const rs=ctx.createBufferSource(); rs.buffer=nb; rs.loop=true; const rf=ctx.createBiquadFilter(); rf.type='highpass'; rf.frequency.value=1800; rs.connect(rf); rf.connect(rainG); rainG.connect(out); rs.start(); }
    const bed=(type,f,q,rate,amHz)=>{ const s=ctx.createBufferSource(); s.buffer=nb; s.loop=true; s.playbackRate.value=rate; const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.value=f; fl.Q.value=q;
      const am=ctx.createGain(); am.gain.value=amHz?.5:1; if(amHz){ const o=ctx.createOscillator(); o.frequency.value=amHz; const og=ctx.createGain(); og.gain.value=.5; o.connect(og); og.connect(am.gain); o.start(); }
      const g=ctx.createGain(); g.gain.value=0; s.connect(fl); fl.connect(am); am.connect(g); g.connect(out); s.start(); return {g,fl}; };
    AMB={wind:bed('bandpass',420,.7,.8,0),lap:bed('lowpass',240,.6,.6,.45),cic:bed('bandpass',4800,8,1,31),crk:bed('bandpass',4300,14,1,3.2)};
  }
  function nz(dur,type,f,q,gain,f2){ if(!ctx) return; const t=ctx.currentTime, s=ctx.createBufferSource(); s.buffer=nb;
    const fl=ctx.createBiquadFilter(); fl.type=type; fl.frequency.setValueAtTime(f,t); if(f2) fl.frequency.exponentialRampToValueAtTime(f2,t+dur); fl.Q.value=q;
    const g=ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+.008); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(t,Math.random()*1.2,dur+.05); }
  function tn(f,dur,type,gain,delay,f2){ if(!ctx) return; const t=ctx.currentTime+(delay||0), o=ctx.createOscillator(); o.type=type;
    o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
    const g=ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t+dur+.05); }
  document.addEventListener('visibilitychange',()=>{ if(!ctx) return; if(document.hidden) ctx.suspend(); else ctx.resume(); });
  return { init, isOn:()=>on, set(v){ on=v; if(out) out.gain.value=v?.8:0; },
    whoosh(){ nz(.4,'bandpass',2400,.9,.18,500); },
    splash(s){ s=s||1; if(sample('splash',Math.min(1,.25+.45*s),.85+Math.random()*.3+(s<.5?.25:0))) return; nz(.18+.3*s,'bandpass',1100,.7,.22*s,400); nz(.35+.4*s,'lowpass',700,.5,.16*s); tn(140,.12,'sine',.12*s,0,60); },
    plop(){ tn(320,.09,'sine',.14,0,120); nz(.06,'bandpass',1800,2,.05); },
    reelLoop,
    nibble(){ tn(260,.06,'sine',.07,0,140); },
    creak(k){ k=k||1; tn(70+Math.random()*50,.16,'sawtooth',.035*k,0,40); nz(.08,'bandpass',900+Math.random()*500,3,.02*k); },   // 竿身承受重量的吱嘎聲
    bite(){ tn(180,.22,'sine',.28,0,55); nz(.25,'lowpass',900,.6,.12); },
    click(p){ nz(.014,'highpass',p||3200,.8,.09); },
    snap(){ nz(.05,'highpass',3000,.6,.5); tn(110,.3,'triangle',.25,0,40); },
    fanfare(r){ const b=[523.25,659.25,783.99,1046.5,1318.5]; for(let i=0;i<3+r;i++) tn(b[i%5]*(i>=5?2:1),.35,'triangle',.11,i*.09); if(r>=3) tn(261.6,.9,'sine',.12,0); },
    coin(){ tn(1318,.08,'square',.04); tn(1760,.14,'square',.04,.07); },
    rain(k){ if(rainG) rainG.gain.setTargetAtTime(k*.16,ctx.currentTime,.5); },
    thunder(){ nz(2.6,'lowpass',160,.7,.5,60); nz(.5,'lowpass',900,.5,.22); },
    eagle(){ for(let i=0;i<3;i++) tn(2900-i*120,.12,'sine',.05,i*.13,2300); tn(2400,.5,'sine',.04,.45,1700); },
    frog(){ const n=2+Math.floor(Math.random()*2); for(let i=0;i<n;i++) tn(140+Math.random()*40,.09,'square',.025,i*.14,110); },
    bird(){ const b=2600+Math.random()*1200; for(let i=0;i<3;i++) tn(b+i*200,.07,'sine',.03,i*.09,b+600); },
    gator(){ nz(1.2,'lowpass',90,.8,.35); tn(55,1,'sawtooth',.05,0,40); },
    paddle(){ nz(.35,'bandpass',700,.8,.14,300); },
    drip(){ tn(1200,.08,'sine',.05,0,300); },
    rumble(){ nz(1.2,'lowpass',140,.6,.18,90); tn(48,1.0,'sine',.12,0,38); },
    sizzle(k){ nz(.5+.6*(k||.5),'highpass',3800,.5,.12*(k||.5),6000); },
    scream(){ if(!ctx) return; const t=ctx.currentTime, o=ctx.createOscillator(), o2=ctx.createOscillator(), g=ctx.createGain(), lfo=ctx.createOscillator(), lg=ctx.createGain();
      o.type='sawtooth'; o2.type='square'; o.frequency.setValueAtTime(850,t); o.frequency.exponentialRampToValueAtTime(1500,t+.35); o.frequency.exponentialRampToValueAtTime(1100,t+1.1);
      o2.frequency.setValueAtTime(1710,t); o2.frequency.exponentialRampToValueAtTime(2900,t+.4); lfo.frequency.value=28; lg.gain.value=60; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.45,t+.04); g.gain.setValueAtTime(.45,t+.8); g.gain.exponentialRampToValueAtTime(.001,t+1.25);
      o.connect(g); o2.connect(g); g.connect(ctx.destination); o.start(t); o2.start(t); lfo.start(t); o.stop(t+1.3); o2.stop(t+1.3); lfo.stop(t+1.3); nz(.5,'highpass',2500,.6,.25,4000); },
    grind(){ nz(.06,'bandpass',1200+Math.random()*900,1.2,.05,500); },
    crackle(){ nz(.03+Math.random()*.05,'highpass',1800+Math.random()*2600,.8,.04+Math.random()*.06,900); },
    plip(){ tn(900,.05,'sine',.03,0,500); nz(.08,'bandpass',2500,1.5,.03); },
    setAmb(o){ if(!AMB) return; const t=ctx.currentTime;
      AMB.wind.g.gain.setTargetAtTime(.02+o.wind*.32,t,.6); AMB.wind.fl.frequency.setTargetAtTime(300+o.wind*700,t,.6);
      AMB.lap.g.gain.setTargetAtTime(o.lap*.06,t,1); AMB.cic.g.gain.setTargetAtTime(o.cic*.02,t,2); AMB.crk.g.gain.setTargetAtTime(o.crk*.05,t,2); } };
})();
function vib(p){ if(save.vibe===false) return; try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
const D=()=>DIFF[save.diff]||DIFF.normal;
const stars=fd=>{ const n=Math.max(1,Math.min(5,Math.round(1+fd.sp.rar*.6+Math.log2(fd.w+1)*.7+styOf(fd.sp.id).d))); return '★'.repeat(n)+'☆'.repeat(5-n); };

/* ---------- 介面 ---------- */
const ui={coin:$('coin'),clock:$('clock'),toast:$('toast'),fight:$('fight'),fName:$('fName'),fDist:$('fDist'),tBar:$('tBar'),tFill:$('tFill'),sFill:$('sFill'),
  fTens:$('fTens'),fStam:$('fStam'),steer:$('steer'),actWrap:$('act'),act:$('actBtn'),actLbl:$('actLbl'),pw:$('pw'),sub:$('actSub'),catch:$('catch'),log:$('log')};
ui.netBtn=$('netBtn'); ui.dragBtn=$('dragBtn');
// 洩力按鈕：鬆／中／緊循環切換，記在存檔；搏魚中切換立即生效
const DRAGN=['鬆','中','緊'], dragLbl=()=>{ if(ui.dragBtn) ui.dragBtn.textContent=DRAGN[save.drag==null?1:save.drag]; };
if(ui.dragBtn){ dragLbl(); ui.dragBtn.addEventListener('pointerdown',e=>{ e.stopPropagation(); save.drag=((save.drag==null?1:save.drag)+1)%3; dragLbl(); if(G.f) G.f.drag=save.drag; vib(10); persist(); }); }
if(ui.netBtn) ui.netBtn.addEventListener('pointerdown',e=>{ e.stopPropagation(); if(G.f&&G.f.netOn) G.f.netGo=true; });
// 釣棚按鈕：點一下切換淺／中／深；浮標吃水深度跟著改，提示目前這個水層容易遇到哪類魚
const depthTxt=$('depthTxt'), DEPTH_TIP=['水面附近：藍鰓、鱷雀鱔、鬼頭刀、鮪魚等中上層魚','中層：大部分鱸魚、鱒魚、鯛類','觸底：鯰魚、鯉魚、石斑、比目魚、魟等底棲魚'];
const depthLbl=()=>{ if(depthTxt) depthTxt.textContent=['淺棚','中層','深棚'][save.depth==null?1:save.depth]; };
depthLbl(); if($('depthChip')) $('depthChip').addEventListener('click',()=>{ save.depth=((save.depth==null?1:save.depth)+1)%3; depthLbl(); persist(); toast('🎚️ 釣棚：'+window.__LAYER_N[save.depth]+'<br><small>'+DEPTH_TIP[save.depth]+'</small>','',2400); });
let toastTimer=0;
let homeToast=false;   // 小屋裡自己的提示（家具、水族箱、烤魚…）才顯示
function toastHome(...a){ homeToast=true; try{ toast(...a); } finally{ homeToast=false; } }
function toast(msg,cls,ms){ if(G.state==='tide'&&!homeToast) return;   /* 在泥灘上不顯示釣魚那邊的提示（魚群出現等） */ if(window.__ENDON&&window.__ENDON()) return;
  if(G.state==='home'&&!homeToast&&!document.body.classList.contains('sheetOn')) return;   // 在小屋裡（選單開著時除外）收不到外面（湖上、海上、天氣、魚群、鯨魚…）的訊息   // 結局演出時，遊戲裡的任何提示都不顯示
  ui.toast.innerHTML=msg; ui.toast.className='show '+(cls||''); clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ ui.toast.className=''; },ms||1700); }
function setCoins(){ ui.coin.textContent=save.coins.toLocaleString(); }
setCoins();
let lastLbl='', lastSub='', lastHot=null;
function setAct(lbl,sub,hot){ if(lbl!==lastLbl){ ui.actLbl.innerHTML=lbl; lastLbl=lbl; } if(sub!==lastSub){ ui.sub.textContent=sub; lastSub=sub; ui.sub.classList.remove('fade'); void ui.sub.offsetWidth; if(['idle','wait','cast','lure'].indexOf(G.state)>=0) ui.sub.classList.add('fade'); }
  if(hot!==lastHot){ ui.act.classList.toggle('hot',!!hot); lastHot=hot; } }
function setPower(p){ ui.pw.setAttribute('stroke-dashoffset',(301.6*(1-p)).toFixed(1)); }

/* ---------- 狀態 ---------- */
const G={state:'intro',t:0,hour:7.1,yaw:0,yawT:0,power:0,chargeT:0,rodSide:0,rodSideT:0,luck:0,held:false,
  to:new T.Vector3(),from:new T.Vector3(),castT:0,castDur:1,apex:1,castDist:0,delay:0,timer:0,nib:0,dip:0,approach:0,biteT:0,
  sp:null,fd:null,f:null,fish:null,stT:0,landFrom:new T.Vector3(),landQ:new T.Quaternion(),snapped:false,endV:new T.Vector3(),base:new T.Vector3(),head:0,spot:0,chaseV:new T.Vector3()};
const tv=new T.Vector3(), tv2=new T.Vector3(), tq=new T.Quaternion(), te=new T.Euler(0,0,0,'YZX');
const bob=P.bobber, rod=P.rod;
function period(h){ h=((h%24)+24)%24; return h>=4.8&&h<8.5?'dawn':h<16.5&&h>=8.5?'day':h>=16.5&&h<19.8?'dusk':'night'; }
const PER_WAIT={dawn:.75,day:1.1,dusk:.75,night:1.0};
const tv2b=new T.Vector3(), tv3b=new T.Vector3(), tv4b=new T.Vector3();
function hangPos(out){ return out.copy(rod.tipW).add(tv2.set(Math.sin(G.t*1.3)*.012,-.24,Math.cos(G.t*1.1)*.01)); }   // 浮標收到竿尖下方約 25 公分，像真的釣客收好線

/* ---------- 選魚 ---------- */
function specialK(sp){ if(!sp.special) return 1;
  // 神話海馬獸只在月亮八成五以上、深夜出現
  if(sp.special==='seabeast') return (period(G.hour)==='night'&&window.__MOONPH&&window.__MOONPH.illum()>.85)?1:0;
  const wx=WL.wx(); if(sp.special==='mermaid'){ if(save.mer&&save.mer.last&&Date.now()-save.mer.last<30*60*1000) return 0; return (KY.zone>=3||G.spot>=3||wx.f>.5)?.5:.05; } if(sp.special==='golden') return wx.c<.4?1:.3; if(sp.special==='king') return 0; if(sp.special==='moonkoi') return window.__MOON?window.__MOON.koiK():0; return 1; }
/* 魚群警覺：同一個方向一直釣，魚會變少、變小、變慢咬；換方向或換釣點就恢復（每分鐘消退 1） */
/* 透水：水下物體在水面之後繪製，越深越透明、越帶水色（湖底沒有地形，所以讓物體透出來，而不是讓水變透明） */
const SEE_U={value:new THREE.Vector3(.04,.13,.15)}, SEE_K={value:1}; window.__SEE_K=SEE_K;
function seeThrough(obj){ if(!obj) return; obj.traverse(m=>{ if(!m.isMesh&&!m.isSkinnedMesh) return; m.renderOrder=10;
  (Array.isArray(m.material)?m.material:[m.material]).forEach(mat=>{ if(!mat||mat.userData.see) return; mat.userData.see=true; mat.transparent=true;
    const prev=mat.onBeforeCompile, prevKey=mat.customProgramCacheKey?mat.customProgramCacheKey.bind(mat):null;
    mat.onBeforeCompile=(s,r)=>{ if(prev) prev(s,r); s.uniforms.uSeeCol=SEE_U; s.uniforms.uSeeK=SEE_K;
      s.vertexShader='varying float vWy_;\n'+s.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvWy_=(modelMatrix*vec4(transformed,1.0)).y;');
      s.fragmentShader='uniform vec3 uSeeCol;\nuniform float uSeeK;\nvarying float vWy_;\n'+s.fragmentShader.replace(/}\s*$/,'  { float d_=max(0.0,-vWy_)*uSeeK; gl_FragColor.rgb=mix(gl_FragColor.rgb,uSeeCol,1.0-exp(-d_*1.3)); gl_FragColor.a*=exp(-d_*1.1); }\n}'); };
    mat.customProgramCacheKey=()=>(prevKey?prevKey():'')+'|see'; mat.needsUpdate=true; }); }); }
window.__seeThrough=seeThrough;
const DEPL={}; const TR=b=>window.__TAL?window.__TAL.rank(b):0;
function depKey(){ const A=((G.head+G.yaw)%(2*Math.PI)+2*Math.PI)%(2*Math.PI); return (WL.zoneId?WL.zoneId():'')+':'+Math.floor(A/(Math.PI/3)); }
function depNow(k){ const e=DEPL[k]; return e?Math.max(0,e.v-(performance.now()-e.t)/60000):0; }
function depAdd(k,n){ const v=depNow(k)+n, w=v>=2&&DEPL[k]&&DEPL[k].warned; DEPL[k]={v,t:performance.now(),warned:w}; if(v>=4&&!w){ DEPL[k].warned=true; setTimeout(()=>toast('這一帶的魚變警覺了，轉個方向或換釣點吧','warn',2600),1800); } }
const reachK=()=>G.loc==='ice'?.78:clamp((G.castDist-4)/(24*(1-.05*TR('cast'))),0,1);
// 釣棚：浮標調淺、中、深（觸底）；每種魚有偏好水層，水層對了比較容易咬，差太多就很少咬（路亞、冰釣不受影響）
const LAYER_B=new Set(['channel','flathead','clarias','mekong','eel','carp','crucian','blackcarp','grasscarp','arapaima','reba','burbot','grouper','grouper2','halibut','stingray','emperor','porgy','knifejaw','redbream','wrasse','laketrout','taimen','ghost','moonkoi','golden']);
const LAYER_S=new Set(['bluegill','crappie','tilapia','silvercarp','gar','spgar','mahi','sail','marlin','swordfish','skipjack','yellowfin','tuna','bigeye','flyfish','ribbon','amberjack','barracuda','sunfish','threadfin','sawara','amber','peacock']);
const layerOf=sp=>LAYER_B.has(sp.id)?2:LAYER_S.has(sp.id)?0:1, LAYER_N=['淺棚・水面','中層','深棚・觸底'];
window.__layerOf=layerOf; window.__LAYER_N=LAYER_N;
function layerK(sp){ const bt=G.baitUsed||BAITS[0]; if(bt.lure||G.loc==='ice'||sp.special) return 1; const d=Math.abs((save.depth==null?1:save.depth)-layerOf(sp)); return d===0?1.6:d===1?.9:.35; }
function pickSpecies(){
  const per=period(G.hour), pw=clamp((G.castDist-6)/30,0,1); let tot=0;
  const ws=SPECIES.map(sp=>{ const bt=G.baitUsed||BAITS[0]; const w=RAR[sp.rar].w*(sp.time[per]??1)*specialK(sp)*(1+sp.rar*(.35*pw+WL.rareB()+(G.hot?.3:0)+(window.__ECO&&window.__ECO.fxOn('luck')?.4:0)+(save.mer&&save.mer.n>=4?.1:0)+(save.mer&&save.mer.n>=10?.1:0)))*(1+sp.rar*G.luck*2)*(sp.rar>=5&&sp.special!=='mermaid'?1+(save.mer&&save.mer.n>=7?.15:0)+(save.mer&&save.mer.n>=13?.15:0):1)*(sp.tide&&window.__MOONPH?(.25+1.5*window.__MOONPH.illum()):1)*WL.spotAff(sp.id)*(sp.spots?(sp.spots.includes(WL.zoneId())?1:0):1)*WL.wxAff(sp.id)*(((sp.loc==='both'&&G.loc!=='ice')||(sp.loc||'lake')===(G.loc||'lake')||(G.loc==='ice'&&sp.ice))?1:0)*(G.loc==='sea'?1+sp.rar*.08*TR('sea'):1)*Math.pow(.12+.88*reachK(),sp.rar)/(1+.3*depNow(G.depK||'')*sp.rar)*(bt.aff[sp.id]||(bt.lure&&G.loc!=='ice'?0:1))*layerK(sp)*(window.__STORY?window.__STORY.boost(sp.id,(SPOTS[G.spot]||{}).id):1)*Math.max(.2,1+sp.rar*bt.rare*.5); tot+=w; return w; });
  let x=Math.random()*tot; for(let i=0;i<ws.length;i++){ x-=ws[i]; if(x<=0) return SPECIES[i]; } return SPECIES[0];
}

/* ---------- 動作 ---------- */
function startCharge(){ if(G.scareT>0){ toast('驚魂未定，等一下再拋竿…','warn',1400); return; } G.state='charge'; G.chargeT=0; G.aimYawCast=G.yawT; }
function cast(){
  G.baitUsed=META.useBait(); G.noBait=false; LURE.bobberVis(!(G.baitUsed&&G.baitUsed.lure));
  const p=G.power, dist=6+p*META.gear().rod.cast, A=G.head+G.yaw, fw=tv.set(-Math.sin(A),0,-Math.cos(A)), bx=G.base.x, bz=G.base.z;
  let x=bx+fw.x*dist+rand(-.6,.6), z=bz+fw.z*dist+rand(-.6,.6);
  for(let k=0;k<14;k++){ const r=Math.hypot(x,z), maxR=W.shoreR(Math.atan2(x,-z))-6; if(r<=maxR) break; x=bx+(x-bx)*.9; z=bz+(z-bz)*.9; }
  if(G.spot===0&&z>-4.5) z=-4.5;
  G.to.set(x,0,z); G.castDist=Math.max(3,Math.hypot(x-bx,z-bz)); G.castDur=.55+G.castDist*.028; G.apex=1.2+G.castDist*.12;
  G.castT=0; G.delay=.12; G.state='cast'; rod.pitchT=-.32; Snd.whoosh(); setPower(0);
}
function landBobber(){
  if(G.baitUsed&&G.baitUsed.lure){ G.state='lure'; P.splash(G.to.x,0,G.to.z,10,.4); W.addRipple(G.to.x,G.to.z,.4); Snd.plop(); G.sp=null; G.fd=null; FUN.castTag(G.castDist); LURE.start(G.to,G.baitUsed,G.base); return; }
  G.state='wait'; P.splash(G.to.x,0,G.to.z,16,.7); W.addRipple(G.to.x,G.to.z,.55); Snd.plop();
  // 沉底釣：釣棚調到「深棚」又不是路亞時，鉛墜帶著餌沉到底，不看浮標、改看竿尖；結構區會有掛底風險
  G.bottom=save.depth===2&&!(G.baitUsed&&G.baitUsed.lure)&&G.loc!=='ice'; setTimeout(()=>{ if(G.state==='wait') ambStart(); },400); G.snag=false; G.snagMv=0; G.snagFlip=0; G.snagOnce=false;
  if(G.bottom&&!save.bottomTip){ save.bottomTip=1; persist(); setTimeout(()=>toast('🎣 沉底釣：沒有浮標，看竿尖——輕抖是試咬，竿尖被拉彎才揚竿','',3600),600); }
  G.timer=rand(6,15)*PER_WAIT[period(G.hour)]*(1-G.luck*.6)*(G.baitUsed?G.baitUsed.wait:1)*WL.waitK()*(window.__ECO&&window.__ECO.fxOn('glow')?.6:1)*(1+.2*depNow(depKey())); G.nib=Math.floor(rand(0,3.99)); G.approach=0; G.sp=null; G.fd=null;
  FUN.castTag(G.castDist);
  // 魚的警戒：同一個地方連續打水、或直接砸進魚群，附近的魚會警戒一陣子（咬口變慢），之後慢慢恢復
  const now=performance.now()/1000, near=G.lastLand&&Math.hypot(G.to.x-G.lastLand.x,G.to.z-G.lastLand.z)<3&&now-G.lastLand.t<25;
  G.spook=Math.min(1.5,(G.spook||0)+(near?.35:0)); G.lastLand={x:G.to.x,z:G.to.z,t:now};
  const hh=FUN.hotHit?FUN.hotHit(G.to):null;
  if(hh==='center'||near){ SCH.scare(G.to.x,G.to.z,14); ambScare(G.to.x,G.to.z); G.spookAt={x:G.to.x,z:G.to.z}; setTimeout(()=>{ if(G.state==='wait') SCH.burst(G.to.x,G.to.z,hh==='center'?14:9); },180); }   // 水面看得到：一群小魚從落點炸開跳逃
  if(hh==='center'){ G.hot=false; G.spook=Math.min(1.5,G.spook+.6); toast('💦 砸進魚群正中間，魚嚇散了！要拋在魚群前方','warn',2400); }
  else { G.hot=FUN.inHot(G.to); if(G.hot){ G.timer*=.3; toast('正中魚群！','good',1200); } }
  if(G.spook>.01){ G.timer*=1+G.spook; if(G.spook>.5&&hh!=='center') toast('水面太吵，附近的魚有點警戒；等一下或換個落點','warn',2200); }
}
/* ===== 餌附近的水下魚：拋竿後落點周圍有幾尾真的在游的魚；之後來咬的就是其中一尾（同魚種就用牠，否則從遠處游進來），
   試咬時會衝向餌又退開、咬住時直接吞下；揚竿錯過或受驚時游走 ===== */
const AMB={list:[],app:null};
function ambMake(sp,L){ let f=null; try{ if(window.__MDL&&window.__MDL.fishReady(sp.id)) f=window.__MDL.fish(sp); }catch(e){} if(!f) return null;
  f.group.scale.setScalar(L); seeThrough(f.group); W.scene.add(f.group);
  // 隔著水看魚：只看得到被水染色、半透明的暗影，不是清清楚楚浮在水面上的魚
  f.group.traverse(m=>{ if(!m.isMesh||!m.material) return; const conv=mm=>{ const k=mm.clone(); k.transparent=true; k.opacity=.32; k.depthWrite=false; if(k.color) k.color.multiply(new THREE.Color(.42,.5,.46)); if(k.emissive) k.emissive.setRGB(0,0,0); k.roughness=1; k.metalness=0; return k; };
    m.material=Array.isArray(m.material)?m.material.map(conv):conv(m.material); m.renderOrder=-1; });
  // 每尾魚自己對這次的餌有多少興趣：魚餌偏好 × 水層對不對
  const bt=G.baitUsed||BAITS[0], aff=bt.aff&&bt.aff[sp.id]!=null?bt.aff[sp.id]:1, lay=layerK(sp), want=Math.min(2,aff)*lay;
  return {f,sp,L,pos:new THREE.Vector3(),h:Math.random()*6.28,sp0:rand(.25,.55),dep:rand(.45,1.1),wt:0,flee:0,want,aff,lay,insp:0}; }
function ambStart(){ ambClear(); if(G.loc==='ice'||(G.baitUsed&&G.baitUsed.lure)) return; const n=Math.floor(rand(2,4.99)), seen={};
  for(let i=0;i<n;i++){ const sp=pickSpecies(); if(!sp||sp.special||seen[sp.id]) continue; seen[sp.id]=1; const L=lerp(sp.len[0],sp.len[1],Math.random()*.7)/100, a=ambMake(sp,L); if(!a) continue;
    const ang=rand(0,6.28), r=rand(2.2,6); a.pos.set(G.to.x+Math.cos(ang)*r,-a.dep,G.to.z+Math.sin(ang)*r); AMB.list.push(a); } }
function ambClear(){ AMB.told=false; AMB.inspT=null; AMB.list.forEach(a=>{ a.f.group.visible=false; if(a.f.group.parent) a.f.group.parent.remove(a.f.group); }); AMB.list=[]; AMB.app=null; }
function ambScare(x,z){ AMB.list.forEach(a=>{ a.flee=3; a.h=Math.atan2(a.pos.z-z,a.pos.x-x); }); }
function ambUpdate(dt){ if(!AMB.list.length) return; if(G.state!=='wait'&&G.state!=='bite'){ ambClear(); return; }
  // 巡游的魚會輪流過來看餌：有興趣的在旁邊多待（咬口來得快一點）；沒興趣的看一眼就走，並告訴玩家可能的原因（每次拋竿最多提示一次）
  AMB.inspT=(AMB.inspT==null?rand(4,7):AMB.inspT)-dt;
  if(AMB.inspT<=0&&G.state==='wait'){ AMB.inspT=rand(6,10); const c=AMB.list.filter(a=>a!==AMB.app&&!a.flee&&!a.insp); if(c.length){ const a=c[Math.floor(Math.random()*c.length)]; a.insp=5; } }
  AMB.list.forEach(a=>{ if(!(a.insp>0)) return; a.insp-=dt; const dx=G.to.x-a.pos.x, dz=G.to.z-a.pos.z, d=Math.hypot(dx,dz);
    if(a.insp>2.2){ a.ht=Math.atan2(dz,dx); a.wt=1; }
    else if(!a.judged){ a.judged=true;
      if(a.want>=1.1){ a.insp=0; if(G.state==='wait'&&G.timer>2) G.timer=Math.max(1.5,G.timer-2); }   // 有興趣：留在附近，咬口提早
      else { a.ht=a.h+Math.PI; a.wt=3; a.sp0=.9;
        if(!AMB.told){ { const fx=G.to.x, fz=G.to.z; W.addRipple(fx+.25,fz+.15,.35); setTimeout(()=>W.addRipple(fx+.1,fz-.2,.25),250); G.inspDip=.5; let k=0; const away=Math.random()*6.28, iv=setInterval(()=>{ k++; W.addRipple(fx+Math.cos(away)*k*.45,fz+Math.sin(away)*k*.45,.16); if(k>6) clearInterval(iv); },140); }   // 浮標旁一個漩渦、浮標被碰得晃一下，接著一道小水痕往外離開
          AMB.told=true; const why=a.lay<.9?`牠常在「${window.__LAYER_N[layerOf(a.sp)]}」，試試調整釣棚`:a.aff<.8?'牠對這個餌興趣不大，換個餌試試':'牠今天有點警戒';
          toast(`🐟 一尾${a.sp.name}靠近看了看又走了——${why}`,'',3200); } } } });
  // 決定要來咬的那一尾：同魚種就用水裡那條，不然從遠處游一條進來
  if(G.fd&&!G.fd.item&&!AMB.app&&G.nib===0&&G.timer<3.5){ let a=AMB.list.find(q=>q.sp.id===G.fd.sp.id&&!q.flee);
    if(!a){ a=ambMake(G.fd.sp,G.fd.L); if(a){ const ang=rand(0,6.28); a.pos.set(G.to.x+Math.cos(ang)*7,-.9,G.to.z+Math.sin(ang)*7); AMB.list.push(a); } }
    else { a.L=G.fd.L; a.f.group.scale.setScalar(G.fd.L); } AMB.app=a; }
  const bait=tv2.set(G.to.x,G.bottom?-1.1:-.35,G.to.z);
  AMB.list.forEach(a=>{ let sp=a.sp0, ty=-a.dep;
    if(a.flee>0){ a.flee-=dt; sp=2.6; ty=-1.6; a.f.group.visible=a.flee>.4; }
    else if(a===AMB.app){ const dx=bait.x-a.pos.x, dz=bait.z-a.pos.z, d=Math.hypot(dx,dz);
      const want=G.state==='bite'?0:G.dip>0?.05:(G.timer<1.2?.35:.9);   // 試咬時衝到嘴邊，平常在餌旁邊繞
      const th=Math.atan2(dz,dx)+(d<want+.2&&G.dip<=0&&G.state!=='bite'?1.4:0); let dh=th-a.h; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); a.h+=dh*Math.min(1,dt*3);
      sp=d>want?Math.min(1.6,.4+d*.5):.15; ty=bait.y; if(G.state==='bite'){ a.pos.lerp(bait,Math.min(1,dt*6)); sp=0; } }
    else { a.wt-=dt; if(a.wt<=0){ a.wt=rand(1.5,4); a.ht=a.h+rand(-1.2,1.2); const dx=G.to.x-a.pos.x, dz=G.to.z-a.pos.z; if(Math.hypot(dx,dz)>7) a.ht=Math.atan2(dz,dx); } if(a.ht!==undefined) a.h+=(a.ht-a.h)*Math.min(1,dt*.8); }
    a.pos.x+=Math.cos(a.h)*sp*dt; a.pos.z+=Math.sin(a.h)*sp*dt; a.pos.y+=(ty-a.pos.y)*Math.min(1,dt*1.5);
    const g=a.f.group; g.position.copy(a.pos); g.rotation.set(0,-a.h,0); a.f.uni.uSwim.value+=dt*(4+sp*7); a.f.uni.uAmp.value=.04+.05*Math.min(1,sp); });
  if(G.state==='bite'&&AMB.app){ /* 咬住：那條魚就在餌上 */ } }
// 水面距離標記：在浮標／入水點／路亞／搏魚中的魚的位置標一個小點和距離（像真實釣魚時估落點），手機上一眼知道線在多遠
const DMK=document.createElement('div'); DMK.style.cssText='position:fixed;z-index:4;pointer-events:none;transform:translate(-50%,-130%);color:#f4f8fa;font:600 12px/1 system-ui,sans-serif;text-shadow:0 1px 3px #000,0 0 6px rgba(0,0,0,.6);display:none;text-align:center';
DMK.innerHTML='<span></span><div style="width:6px;height:6px;border-radius:50%;background:#fff;margin:3px auto 0;box-shadow:0 0 6px rgba(255,255,255,.9)"></div>'; document.body.appendChild(DMK); const DMKt=DMK.querySelector('span'), DMV=new THREE.Vector3();
function updDistMark(){ const st=G.state; let p=null;
  if(st==='wait'||st==='bite') p=G.bottom&&G.entry?G.entry:bob.position; else if(st==='lure'&&LURE.active()) p=LURE.pos(); else if(st==='fight'&&G.f){ fishPos(DMV,0); p=DMV; }
  if(!p||document.body.classList.contains('sheetOn')||UW.active()){ DMK.style.display='none'; return; }   // 水下鏡頭時不顯示水面距離
  const d=Math.hypot(p.x-G.base.x,p.z-G.base.z); DMV.set(p.x,(p.y||0)+.05,p.z).project(W.camera); if(DMV.z>1){ DMK.style.display='none'; return; }
  DMK.style.display='block'; DMK.style.left=((DMV.x+1)/2*innerWidth)+'px'; DMK.style.top=((1-DMV.y)/2*innerHeight)+'px'; DMKt.textContent=d.toFixed(d<10?1:0)+' 米'; }
function startRetrieve(msg,cls){ exitUW(); G.fd=null; G.sp=null; if(msg) toast(msg,cls); G.state='retrieve'; G.stT=0; G.from.copy(bob.position); P.shadow.material.opacity=0; }
function nibble(){ const big=Math.random()<.25; G.dip=big?.75:.28; G.dipMax=G.dip; G.dipAmp=big?.14:.035; W.addRipple(G.to.x,G.to.z,big?.5:.18); if(big){ P.splash(G.to.x,0,G.to.z,5,.35); Snd.bite(); vib([40,30,60]); } else { Snd.nibble(); vib(12); } G.approach=Math.max(G.approach,.01); }
// 體型等級：u 是這條魚在該魚種體型範圍內的位置（0 最小、1 最大，巨物可再超出）
const GRADES=[[.2,'幼魚'],[.7,'成魚'],[.93,'大物'],[9,'巨物']];
const gradeOf=u=>GRADES.find(g=>u<g[0])[1];
const MERTEST=/[?&]mertest=1/.test(location.search);
function prepFish(){ if(MERTEST){ const sp=SPECIES.find(q=>q.special==='mermaid'); if(sp){ G.sp=sp; G.fd={sp,L:1.7,w:55,u:.5,grade:'A',lvl:1,value:500,xpMul:1}; return; } }   /* 美人魚測試網址：每一次咬餌都是美人魚 */ const wantPin=window.__STORY&&window.__STORY.wants('hairpin')&&WL.zoneId()==='lily'&&period(G.hour)==='night';
  if(wantPin&&Math.random()<.45){ const it=ITEMS_BY('hairpin'); if(it){ G.sp=FUN.ITEM_SP; G.fd={sp:FUN.ITEM_SP,item:it,L:it.size,w:it.w,lvl:1,value:0,xpMul:1}; return; } }
  if(Math.random()<.085*(window.__STORY&&window.__STORY.needs('item')?2:1)){ const it=FUN.rollItem(); G.sp=FUN.ITEM_SP; G.fd={sp:FUN.ITEM_SP,item:it,L:it.size,w:it.w*rand(.85,1.15),lvl:1,value:Math.round(it.val*rand(.8,1.25)),u:.5,xpMul:0}; return; }
  G.depK=depKey(); const sp=pickSpecies(), pw=clamp((G.castDist-6)/30,0,1), seaK=(G.loc||'lake')==='sea'?.62:1, u=Math.pow(Math.random(),(1.6-.5*pw)/WL.sizeB()*(1+(1-reachK())*1.2+.15*depNow(G.depK))*seaK);   // 海裡的魚個頭普遍偏大
  const big=u>.96?1+(u-.96)/.04*.15:1, L=lerp(sp.len[0],sp.len[1],u)/100*big, w=sp.k*L*L*L*rand(.9,1.12);
  G.sp=sp; G.fd={sp,L,w,u,grade:gradeOf(u),lvl:Math.round(lerp(sp.lvl[0],sp.lvl[1],u)),value:Math.round(sp.price*Math.pow(w+.3,.85)*RAR[sp.rar].mult*D().rew*.4*(window.__ECO?window.__ECO.priceMul(sp.id):1)),xpMul:D().rew}; if(window.__TAL) window.__TAL.applyBoss(G,SPECIES,RAR); }
function bite(){ if(!G.fd) prepFish(); UW.bite(); G.state='bite'; G.biteT=0; FUN.hookStart(G.fd); W.addRipple(G.to.x,G.to.z,.75); P.splash(G.to.x,0,G.to.z,8,.5); Snd.bite(); vib([60,40,60]); }
// 沒揚到竿：魚大多會把餌吃掉，沒餌就不會再有魚咬，要收線重新上餌（路亞不會被吃掉）
function missBite(){ const lastFd=G.fd; FUN.hookEnd(); if(AMB.app){ AMB.app.flee=3; AMB.app.h+=Math.PI; AMB.app=null; } toast('太晚了：魚已經把餌吐掉，浮標一沉就要揚竿','warn',1800); G.combo=0; FUN.combo(0); G.state='wait'; G.timer=rand(4,9); G.nib=Math.floor(rand(0,2.99)); G.sp=null; G.fd=null; exitUW(); vib(40);
  const lost=fd0=>{ const id=G.baitUsed&&G.baitUsed.id, base={corn:.35,worm:.45,shrimp:.5,live:.3}[id]??.45, sty=fd0?SP_STY[fd0.sp.id]:'';
    return Math.max(.15,Math.min(.75,base+(sty==='nibbler'?.15:sty==='brawler'||sty==='runner'?-.1:0))); };
  if(!(G.baitUsed&&G.baitUsed.lure)){ if(Math.random()<lost(lastFd)){ G.noBait=true; G.stealT=1.6; setTimeout(()=>toast('餌被吃掉了，收線重新上餌','warn',2400),300); } else setTimeout(()=>toast('魚跑了，餌還在','',1600),300); } }
function hook(q){
  const sp=G.sp, L=G.fd.L; exitUW(); ambClear();
  const perfect=!!q; if(perfect){ save.perf=(save.perf||0)+1; if(window.__STORY) window.__STORY.onPerfect(); }
  G.f={perfect,hq:perfect?1:.7,drag:save.drag==null?1:save.drag,cover:0,abr:0,coverSide:Math.random()<.5?-1:1,d:G.loc==='ice'?rand(10,18):G.castDist,az0:Math.atan2(-(G.to.x-G.base.x),-(G.to.z-G.base.z)),theta:0,latDir:0,run:true,phaseT:rand(.8,1.6),stam:perfect?85:100,T:.3,brk:0,slk:0,jumpT:0,jumpDur:1,ripT:0,vibT:0,clickA:0};
  G.state='fight'; P.splash(G.to.x,0,G.to.z,22,1); W.addRipple(G.to.x,G.to.z,.7); Snd.splash(.7); vib(40);
  toast(perfect?'完美揚竿！':'上鉤了！',perfect?'good':'',1200);
  ui.fight.classList.remove('hidden'); WL.onHook(G.fd,()=>fishPos(G.chaseV,0));
  // 結構物：在倒木區、礁岩中到愛躲的魚，就在牠要鑽的那一側放上看得到的倒木或礁石，讓玩家知道往哪邊拉
  { const zid=WL.zoneId?WL.zoneId():''; const stru=zid==='wood'||zid==='reef'||(zid==='lily'&&G.loc!=='sea'); const hider=!G.fd.item&&(LAYER_B.has(G.fd.sp.id)||(G.fd.sp.spots&&G.fd.sp.spots.includes('reef')));
    if(stru&&hider&&G.loc!=='ice') showSnag(zid==='reef'); } SEA.onHook(G.fd,()=>fishPos(G.chaseV,0));
  const fish=G.fd.item?FUN.itemFish(G.fd.item):P.getFish(sp); G.fish=fish; fish.group.scale.setScalar(L); fish.group.visible=false; if(!fish.group.parent) W.scene.add(fish.group); seeThrough(fish.group);
  if(G.fd.boss&&window.__TAL) window.__TAL.bossIntro(G,b=>{ P.splash(G.to.x,0,G.to.z,70,2.4); W.addRipple(G.to.x,G.to.z,1.6); Snd.splash(2.2); if(G.loc!=='ice') setTimeout(()=>{ if(G.state==='fight'&&G.f) startJump(); },500); });
}
function fishPos(out,y){ const az=G.f.az0+G.f.theta; out.set(G.base.x-Math.sin(az)*G.f.d,y,G.base.z-Math.cos(az)*G.f.d); if(G.loc==='sea') SEA.hullClear(out,.35); else if(G.loc==='ice'&&window.__ICE){ const hp=window.__ICE.holePos(); out.x=hp.x; out.z=hp.z; } return out; }
function sizeWord(w){ return w<.6?'小傢伙':w<2.5?'中型魚':w<8?'大魚！':'巨物！！'; }
// 搏魚用的結構物模型（真實倒木與礁石），中魚時放在魚要鑽的那一側，搏魚結束收起
const SNAG={g:new THREE.Group(),wood:null,rock:null}; W.scene.add(SNAG.g); SNAG.g.visible=false;
{ const L=new THREE.GLTFLoader(); L.load('dry_branches_medium_01.glb',g=>{ SNAG.wood=g.scene; SNAG.wood.traverse(m=>{ m.frustumCulled=false; }); });
  L.load('rock_moss_set_01.glb',g=>{ const r=g.scene.getObjectByName('rock_moss_set_01_rock04')||g.scene; SNAG.rock=r.clone(true); SNAG.rock.position.set(0,0,0); SNAG.rock.traverse(m=>{ m.frustumCulled=false; }); }); }
function showSnag(reef){ const f=G.f; SNAG.g.clear(); const src=reef?SNAG.rock:SNAG.wood; if(!src) return; const o=src.clone(true); SNAG.g.add(o);
  const az=f.az0+f.coverSide*.62, d=Math.max(6,f.d*.9); SNAG.g.position.set(G.base.x-Math.sin(az)*d,reef?-.7:-.15,G.base.z-Math.cos(az)*d);
  SNAG.g.rotation.y=Math.random()*6.28; SNAG.g.scale.setScalar(reef?1.1:3.2); SNAG.g.visible=true; }
// 魚訊放大視窗：等魚時在右上角放大顯示浮標（浮標釣）或竿尖（沉底釣），小螢幕也看得清楚試咬與咬口
const MAG=document.createElement('div'); MAG.id='magWin'; MAG.style.cssText='position:fixed;right:10px;top:calc(var(--hudY,150px) + 54px);z-index:6;width:74px;height:96px;border-radius:12px;background:rgba(10,30,40,.62);border:1px solid rgba(255,255,255,.22);display:none;pointer-events:none;overflow:hidden';
// 放大視窗裡的浮標：用和 3D 浮標同一份外形與配色畫出立體感（左右明暗、清漆高光），不再是平面圖示
function floatImage(){ const P0=window.__FLOAT_PROFILE||[[0,-.095],[.028,0],[.004,.06]], S=560, H=.27, cv=document.createElement('canvas'); cv.width=60; cv.height=Math.round(H*S); const g=cv.getContext('2d'), cx=30, Y=y=>(.17-y)*S;
  const col=y=>{ const v=(y+.095)/.157; return v<.18?'#1d2a22':v<.2?'#c9a24a':v<.58?'#141414':v<.6?'#e8d27a':'#ff4a12'; };
  const rAt=y=>{ for(let i=1;i<P0.length;i++){ const [r0,y0]=P0[i-1],[r1,y1]=P0[i]; if(y>=y0&&y<=y1) return r0+(r1-r0)*(y-y0)/Math.max(1e-6,y1-y0); } return 0; };
  for(let py=0;py<cv.height;py++){ const y=.17-py/S; let r=0, c; if(y<=.062){ r=rAt(y); c=col(y); } else { r=.0035; const k=(y-.06)/.125; c=k<.24?'#ff3b10':k<.44?'#d8ff2a':k<.64?'#ff3b10':k<.8?'#f4f4f0':'#ff3b10'; if(y>.185){ r=.0055*Math.sqrt(Math.max(0,1-((y-.19)/.0055)**2)); c='#fff080'; } }
    const w=r*S; if(w<.3) continue; const gr=g.createLinearGradient(cx-w,0,cx+w,0); gr.addColorStop(0,'rgba(0,0,0,.9)'); gr.addColorStop(.12,c); gr.addColorStop(.38,c); gr.addColorStop(.48,'rgba(255,255,255,.85)'); gr.addColorStop(.58,c); gr.addColorStop(1,'rgba(0,0,0,.95)');
    g.fillStyle=c; g.fillRect(cx-w,py,w*2,1); g.globalAlpha=.55; g.fillStyle=gr; g.fillRect(cx-w,py,w*2,1); g.globalAlpha=1; }
  return {url:cv.toDataURL(),w:cv.width,h:cv.height,wl:Math.round(.17*S)}; }
const FIMG=floatImage();
MAG.innerHTML=`<svg viewBox="0 0 74 96" width="74" height="96"><defs><linearGradient id="mw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f7f8c" stop-opacity=".9"/><stop offset="1" stop-color="#0b2c36" stop-opacity=".95"/></linearGradient><linearGradient id="ms" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb7c2"/><stop offset="1" stop-color="#55707c"/></linearGradient></defs>
<rect x="0" y="0" width="74" height="58" fill="url(#ms)" opacity=".55"/>
<g id="magF"><image href="${FIMG.url}" x="${37-FIMG.w/4}" y="${58-FIMG.wl/2}" width="${FIMG.w/2}" height="${FIMG.h/2}"/></g>
<rect x="0" y="58" width="74" height="38" fill="url(#mw)"/><ellipse id="magRip" cx="37" cy="58" rx="9" ry="1.6" fill="none" stroke="rgba(230,250,255,.75)" stroke-width="1"/><line x1="0" y1="58" x2="74" y2="58" stroke="rgba(220,245,255,.55)" stroke-width="1"/>
<g id="magRod" style="display:none"><path id="magR1" d="" stroke="#1a1c20" stroke-width="4.2" fill="none" stroke-linecap="round"/><path id="magR2" d="" stroke="#22252a" stroke-width="3" fill="none" stroke-linecap="round"/><path id="magR3" d="" stroke="#f4f4f0" stroke-width="2" fill="none" stroke-linecap="round"/>
<path id="magRh" d="" stroke="rgba(255,255,255,.28)" stroke-width="1" fill="none" transform="translate(-.8 0)"/>
<circle id="magG0" r="2.4" fill="none" stroke="#a9adb3" stroke-width=".9"/><circle id="magG1" r="2" fill="none" stroke="#a9adb3" stroke-width=".8"/><circle id="magG2" r="1.6" fill="none" stroke="#a9adb3" stroke-width=".7"/><circle id="magG3" r="1.3" fill="none" stroke="#a9adb3" stroke-width=".6"/><circle id="magTip" r="1.6" fill="#ff5a1f"/></g></svg><div id="magT" style="position:absolute;left:0;right:0;bottom:3px;text-align:center;font-size:10px;color:#dff;text-shadow:0 1px 2px #000"></div>`;
document.body.appendChild(MAG); const magF=MAG.querySelector('#magF'), magT=MAG.querySelector('#magT');
function updMag(){ const magOn=save.mag==='on'||(save.mag!=='off'&&(D().n==='休閒'||D().n==='標準')); const on=(G.state==='wait'||G.state==='bite')&&!LURE.active?.()&&G.loc!=='ice'&&magOn; MAG.style.display=on?'block':'none'; if(!on) return;
  if(G.bottom){ magF.style.display='none'; const b=Math.min(1.2,rod.bendT||0), x2=37+b*24, y2=14+b*52, cx=37, cy=46;
    const qp=t=>{ const u=1-t; return [u*u*37+2*u*t*cx+t*t*x2, u*u*96+2*u*t*cy+t*t*y2]; };
    let d=''; const seg=(t0,t1)=>{ const a=qp(t0), m=qp((t0+t1)/2), c=qp(t1); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${(2*m[0]-(a[0]+c[0])/2).toFixed(1)} ${(2*m[1]-(a[1]+c[1])/2).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`; };
    MAG.querySelector('#magR1').setAttribute('d',seg(0,.45)); MAG.querySelector('#magR2').setAttribute('d',seg(.45,.82)); MAG.querySelector('#magR3').setAttribute('d',seg(.82,1));
    MAG.querySelector('#magRh').setAttribute('d',seg(.05,.8));
    [.3,.55,.74,.9].forEach((t,i)=>{ const p=qp(t), gd=MAG.querySelector('#magG'+i); gd.setAttribute('cx',(p[0]+.8).toFixed(1)); gd.setAttribute('cy',p[1].toFixed(1)); });
    const tp=qp(1); MAG.querySelector('#magTip').setAttribute('cx',tp[0].toFixed(1)); MAG.querySelector('#magTip').setAttribute('cy',tp[1].toFixed(1));
    MAG.querySelector('#magRod').style.display=''; magT.textContent=G.state==='bite'?'竿尖拉彎！':G.snag?'掛底':'竿尖'; magT.style.color=G.state==='bite'?'#ffd060':'#dff'; }
  else { MAG.querySelector('#magRod').style.display='none'; magF.style.display=''; const dip=G.state==='bite'?34:Math.max(0,(W.swell(G.to.x,G.to.z,G.t)-bob.position.y))*160; magF.setAttribute('transform',`translate(0 ${Math.min(40,dip).toFixed(1)})`); { const rp=MAG.querySelector('#magRip'); if(rp){ const k=Math.min(1,dip/14); rp.setAttribute('rx',(6+k*16+Math.sin(G.t*3)*.6).toFixed(1)); rp.setAttribute('opacity',(.35+.6*k).toFixed(2)); } } magT.textContent=G.state==='bite'?'沉下去了！':G.dip>0?'輕點（試咬）':'浮標'; magT.style.color=G.state==='bite'?'#ffd060':'#dff'; } }
// 搏魚臨場感：魚衝刺時水面拖出 V 形水痕、線繃緊時入水點甩出細水珠（距離標示原本就有）
const WKV=new THREE.Vector3();
// 搏魚鏡頭：中魚後視角微微拉近、略往水面看；張力越大拉得越近；魚躍出水面時再拉近並輕晃。結束後平滑回到原本
G.fovK=G.fovK||1;
function fightBody(dt){ const f=G.f, fight=G.state==='fight'&&f; G.lean=G.lean||{z:0,y:0,r:0};
  const tz=fight?(f.run?-.07*(.5+f.T):(G.held?.05*f.T:0)):0, ty=fight?-.03*f.T:0, tr=fight?clamp((f.theta||0)*.06,-.05,.05):0;
  G.lean.z+=(tz-G.lean.z)*Math.min(1,dt*4); G.lean.y+=(ty-G.lean.y)*Math.min(1,dt*4); G.lean.r+=(tr-G.lean.r)*Math.min(1,dt*3);
  W.head.position.z=G.lean.z; W.head.position.y=(W.head.userData.y0??(W.head.userData.y0=W.head.position.y))+G.lean.y; W.camera.rotation.z+=G.lean.r; }
function fightCam(dt){ try{ fightBody(dt); }catch(e){} const f=G.f, fight=G.state==='fight'&&f, want=fight?(.86-.08*(f.T||0)-(f.jumpT>0?.08:0)):(G.state==='land'?.9:1);
  G.fovK+=(want-G.fovK)*Math.min(1,dt*(fight?2.2:1.5)); const base=W.camera.aspect<1?70:52, nf=base*G.fovK; if(Math.abs(W.camera.fov-nf)>.05){ W.camera.fov=nf; W.camera.updateProjectionMatrix(); }
  document.body.classList.toggle('fighting',!!fight);
  if(fight&&f.jumpT>0){ G.gShake=Math.max(G.gShake||0,.35); } }
function fightFx(dt){ fightCam(dt); const f=G.f; if(G.state!=='fight'||!f){ if(Snd.reelLoop) Snd.reelLoop(G.state==='retrieve'?.22:0,1.25); return; } fishPos(WKV,0);
  f.wk=(f.wk||0)-dt; if(f.run&&f.wk<=0){ f.wk=.09; const az=f.az0+f.theta, sx=Math.cos(az), sz=-Math.sin(az); W.addRipple(WKV.x+sx*.25,WKV.z+sz*.25,.18); W.addRipple(WKV.x-sx*.25,WKV.z-sz*.25,.18); }
  if(f.T>.6&&Math.random()<dt*(f.T-.5)*12) P.splash(WKV.x,.05,WKV.z,2,.12);
  // 聲音：張力很大時竿身吱嘎作響；魚在水面衝刺時有破水聲
  { const out=f.run&&f.T>.3, vol=G.held?.32:out?.45*f.T+.12:0, rate=G.held?.85+.35*(1-f.T):out?1.5+.6*f.T:1; f.usedLoop=Snd.reelLoop&&Snd.reelLoop(vol,rate); }
  f.ck=(f.ck||0)-dt; if(f.T>.72&&f.ck<=0){ f.ck=rand(.35,.9)*(1.4-f.T); Snd.creak&&Snd.creak(f.T); }
  f.sw=(f.sw||0)-dt; if(f.run&&f.d<18&&f.sw<=0){ f.sw=rand(.5,1.1); Snd.splash&&Snd.splash(.18+.25*f.T); } }
/* ===== 抄網：鋁合金網框＋會下垂的網袋（打結網目貼圖、半透明）＋伸縮手把。按下抄網後：網子從右下伸出→探進水裡到魚底下→
   魚被兜進網袋→整網提出水面（網袋被魚的重量拉垂、一路滴水）→拉到眼前 ===== */
const NET=(()=>{ const g=new THREE.Group(); g.visible=false; W.scene.add(g);
  const cv=document.createElement('canvas'); cv.width=cv.height=64; const c2=cv.getContext('2d'); c2.clearRect(0,0,64,64); c2.strokeStyle='rgba(30,34,30,.95)'; c2.lineWidth=2.2;
  for(let i=-64;i<128;i+=11){ c2.beginPath(); c2.moveTo(i,0); c2.lineTo(i+64,64); c2.stroke(); c2.beginPath(); c2.moveTo(i+64,0); c2.lineTo(i,64); c2.stroke(); }
  const mt=new THREE.CanvasTexture(cv); mt.wrapS=mt.wrapT=THREE.RepeatWrapping; mt.repeat.set(6,3);
  const meshMat=new THREE.MeshStandardMaterial({map:mt,alphaTest:.35,transparent:true,side:THREE.DoubleSide,roughness:.9,color:0x3c4338});
  const alu=new THREE.MeshStandardMaterial({color:0xb9bec4,metalness:.9,roughness:.3}), grip=new THREE.MeshStandardMaterial({color:0x1d1e21,roughness:.85});
  const hoop=new THREE.Mesh(new THREE.TorusGeometry(.5,.012,8,40),alu); hoop.rotation.x=Math.PI/2; g.add(hoop);
  const bagG=new THREE.CylinderGeometry(.5,.1,.7,24,6,true); bagG.translate(0,-.35,0); const bag=new THREE.Mesh(bagG,meshMat); g.add(bag);
  const bp=bagG.attributes.position, b0=Float32Array.from(bp.array);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.016,.02,2.4,10),alu); handle.rotation.z=Math.PI/2; handle.position.set(1.7,0,0); g.add(handle);
  const hg=new THREE.Mesh(new THREE.CylinderGeometry(.024,.024,.5,10),grip); hg.rotation.z=Math.PI/2; hg.position.set(2.7,0,0); g.add(hg);
  // 網袋形狀：sag 0~1 被魚拉垂的程度，sw 擺動
  function shape(sag,sw){ for(let i=0;i<bp.count;i++){ const x=b0[i*3], y=b0[i*3+1], z=b0[i*3+2], k=-y/.7; bp.setXYZ(i,x+Math.sin(sw)*.08*k,y-sag*.35*k*k,z+Math.cos(sw*1.3)*.05*k); } bp.needsUpdate=true; }
  return {g,shape}; })();
function endFightUI(){ SNAG.g.visible=false; if(ui.netBtn) ui.netBtn.classList.add('hidden'); ui.fight.classList.add('hidden'); ui.steer.classList.add('hidden'); ui.tBar.classList.remove('danger'); ui.tBar.classList.remove('slack'); ui.tBar.classList.remove('rub'); }
function lose(reason){ if(MERTEST&&G.fd&&G.fd.sp&&G.fd.sp.special==='mermaid'&&G.state==='fight'){ if(G.f){ G.f.brk=0; G.f.slk=0; G.f.abr=0; G.f.lostWhy=null; } return; }   /* 美人魚測試：任何原因都不會跑掉 */
  endFightUI(); WL.endChase(); SEA.endChase(); G.combo=0; FUN.combo(0); P.shadow.material.opacity=0; if(G.fish){ G.fish.group.visible=false; }
  if(reason==='gator'||reason==='shark'){ fishPos(tv,0); P.splash(tv.x,0,tv.z,60,1.6); W.addRipple(tv.x,tv.z,1.2); Snd.splash(1.5); Snd.gator(); biteFX(reason); }
  const msg={snap:'啪！線斷了……',slack:'線太鬆，魚脫鉤了',spool:'線放光了，魚跑掉了',gator:'鱷魚把你的魚搶走了！',shark:'鯊魚把你的魚咬走了！',shook:'魚甩頭，把鉤甩掉了',jump:'魚在空中甩脫了鉤',rub:'線在障礙物上磨斷了……'}[reason];
  // 失敗原因與改善方法：慢一點跳出，讓玩家知道下次怎麼做
  const tip={snap:'原因：張力在紅區停太久。改善：魚衝刺時先放手，或把洩力調「鬆」。',slack:'原因：魚停下時線鬆太久。改善：魚一停就按住收線。',spool:'原因：魚跑太遠把線放光。改善：魚停下時趁機收線，或把洩力調「緊」一點。',
    gator:'原因：搏魚拖太久引來鱷魚。改善：張力保持在綠黃區、加快收線。',shark:'原因：搏魚拖太久引來鯊魚。改善：張力保持在綠黃區、加快收線。',
    shook:'原因：揚竿不夠準＋甩頭時線鬆。改善：浮標「沉下去」的瞬間揚竿；魚甩頭時保持收線。',jump:'原因：魚跳起時還在硬拉。改善：看到魚躍出水面先放手。',rub:'原因：魚鑽進結構物，線一直在上面磨。改善：看到警告就往反方向控竿；換粗一點的線，或帶鋼絲前導線。'}[reason];
  if(tip) setTimeout(()=>toast('💡 '+tip,'',4200),1900);
  if(reason==='snap'){ Snd.snap(); vib([80,40,120]); toast(msg,'bad',1800); G.state='lost'; G.stT=0; G.snapped=true; bob.visible=false; rod.bendT=0; rod.pitchT=.1; rod.end=null; }
  else { vib(60); startRetrieve(msg,'bad'); }
}
function startJump(){ const f=G.f; f.jumpT=f.jumpDur=.85+.25*Math.sqrt(G.fd.L); fishPos(tv,0); P.splash(tv.x,0,tv.z,30,1.2); W.addRipple(tv.x,tv.z,.9); Snd.splash(1);
  toast('魚躍出水面！先放手！','warn',1100); vib(30); G.fish.group.visible=true; }
function dispDist(){ return Math.max(.42,G.fd.L*(G.fd.sp.sh.snout?3:2.6))*(W.camera.aspect<1?1:.8); }   // 拿在手上的魚約佔畫面寬度七成，看得清楚又不會塞滿
function land(){
  if(G.loc==='sea'&&!G.fd.item&&!G.fd.sp.special&&G.fd.sp.id!=='shark'&&G.fd.sp.id!=='gwhite'&&Math.random()<.12*(1-.12*TR('sea'))&&!KK.busy()&&!(window.__ECO&&window.__ECO.fxOn('repel'))){ G.state='snatch'; fishPos(tv,-.05); toast('就在魚出水的瞬間……','warn',1200); KK.snatchOver(tv.clone(),()=>{ G.state='fight'; lose('shark'); }); return; }
  G.state='land'; G.stT=0; G.netting=!!(G.f&&G.f.netted); endFightUI(); WL.endChase(); SEA.endChase(); G.combo=(G.combo||0)+1; FUN.combo(G.combo); save.maxCombo=Math.max(save.maxCombo||0,G.combo); fishPos(G.landFrom,-.05); P.splash(G.landFrom.x,0,G.landFrom.z,40,1.3); W.addRipple(G.landFrom.x,G.landFrom.z,1);
  Snd.splash(1.2); vib([30,40,30]); const g=G.fish.group; g.visible=G.fd.sp.special!=='mermaid'; if(g.parent!==W.scene) W.scene.attach(g);
  g.position.copy(G.landFrom); te.set(0,G.f.az0+G.f.theta+Math.PI/2,0); g.quaternion.setFromEuler(te); G.landQ.copy(g.quaternion); P.shadow.material.opacity=0;
}
function showCard(){
  if(G.fd&&!G.fd.item) depAdd(G.depK||depKey(),1+.5*G.fd.sp.rar);
  if(G.fd&&G.fd.boss&&window.__TAL) window.__TAL.bossWin(G.fd);
  if(window.__MOON) window.__MOON.onCatch(G.fd);
  if(G.fd.item){ if(window.__STORY) window.__STORY.onItem(G.fd.item&&G.fd.item.id); save.items=(save.items||0)+1; if(G.fd.item.id==='chest') save.chests=(save.chests||0)+1; if(window.__ECO) window.__ECO.dropItem(G.fd.item); persist(); FUN.goalsDot();
    return FUN.itemCard(G.fd,()=>{ ui.catch.classList.remove('hidden'); ui.actWrap.classList.add('hidden'); ui.sub.classList.add('hidden'); document.body.classList.add('catching'); }); }
  { const cb=1+.05*Math.min(G.combo||0,6); G.fd.value=Math.round(G.fd.value*cb*(window.__ECO&&window.__ECO.fxOn('coin2')?2:1)); G.fd.xpMul=(G.fd.xpMul||1)*cb; }
  FUN.tourCatch(G.fd); if(G.hot) save.hotC=(save.hotC||0)+1; $('bSell').textContent='賣出'; $('bRel').classList.remove('hidden');
  const fd=G.fd, sp=fd.sp, r=RAR[sp.rar], rec=save.dex[sp.id];
  const isNew=!rec, isRec=!!rec&&fd.w>rec.bw;
  // 首次釣獲日期只在第一次釣到時記錄；更新前的舊紀錄沒有日期就不顯示，不亂填
  save.dex[sp.id]={n:(rec?rec.n:0)+1,bw:Math.max(rec?rec.bw:0,fd.w),bl:Math.max(rec?rec.bl:0,fd.L),md:Math.max(rec&&rec.md||0,FUN.medalLv(fd)),f:rec?rec.f:Date.now()}; save.total++;
  // 魚獲紀錄：魚種、尺寸、釣點、時段、天氣、餌、釣法、釣棚，放生或賣出都保留紀錄與圖鑑進度
  if(!fd.item){ const wx=WL.wx?WL.wx():{}, wn=wx.r>.5?'雨':wx.r>.15?'毛毛雨':wx.f>.5?'霧':wx.c>.55?'陰':'晴', bt=G.baitUsed||{};
    save.catchLog=save.catchLog||[]; save.catchLog.unshift({id:sp.id,L:+fd.L.toFixed(3),w:+fd.w.toFixed(3),t:Date.now(),h:+G.hour.toFixed(2),z:(WL.zoneId&&WL.zoneId())||'',loc:G.loc||'lake',wx:wn,b:bt.id||'',m:G.loc==='ice'?'冰釣':bt.lure?'路亞':G.bottom?'沉底':'浮標',dp:save.depth==null?1:save.depth,new:isNew,rec:isRec});
    if(save.catchLog.length>300) save.catchLog.length=300; G.logRec=save.catchLog[0]; }
  persist();
  if(window.__STORY&&!G.fd.item) window.__STORY.onCatch(fd,{zone:(SPOTS[G.spot]||{}).id,loc:G.loc,per:period(G.hour),rain:W.U.uRain.value>.25});
  { const xp=META.onCatch(fd,{perfect:!!(G.f&&G.f.perfect),per:period(G.hour)}), pm=window.__ECO?window.__ECO.priceMul(sp.id):1; $('cXp').textContent='+'+xp+' 經驗　'+(window.__ECO?window.__ECO.lastDrop():'')+(pm>1?'　🔥行情 ×'+pm:''); }
  ui.catch.style.setProperty('--rc',r.col);
  $('cLv').textContent=fd.lvl; $('cName').textContent=sp.name; $('cRar').textContent=r.name+' '+r.en+(fd.grade?'｜'+fd.grade:''); $('cSci').textContent=sp.sci;
  $('cLen').textContent=(fd.L*100).toFixed(1)+' cm'; $('cW').textContent=fd.w<1?Math.round(fd.w*1000)+' g':fd.w.toFixed(2)+' kg';
  $('cVal').textContent='🪙 '+fd.value.toLocaleString(); $('cDesc').textContent=sp.desc+' 拉扯型態：'+styOf(sp.id).n+'，難度 '+stars(fd)+'。';
  // 搏魚結算：花了多久、揚竿品質、最高張力、魚衝了幾次；刷新最快紀錄時標示
  if(G.f&&!fd.item){ const f=G.f, ft=f.ft||0, mm=Math.floor(ft/60), ss=Math.round(ft%60), bestK='bf_'+sp.id, best=(save.fightBest||{})[bestK];
    const fast=!best||ft<best; save.fightBest=save.fightBest||{}; if(fast) save.fightBest[bestK]=+ft.toFixed(1);
    $('cDesc').textContent+=` 搏魚 ${mm?mm+' 分 ':''}${ss} 秒${fast&&best?'（最快紀錄！）':''}・${f.perfect?'完美揚竿':'普通揚竿'}・最高張力 ${Math.round((f.maxT||0)*100)}%・魚衝刺 ${f.runs||0} 次。`;
    if(G.logRec){ G.logRec.ft=+ft.toFixed(1); G.logRec.hq=f.perfect?1:0; } }
  { const mm=sp.special==='mermaid', ns=mm||!!sp.noSell; $('bSell').classList.toggle('hidden',ns); $('bRel').textContent=mm?'送她回家（收下謝禮）':sp.noSell?'拍照後放流':'放生'; if(mm) $('cW').textContent='？？？';
    if(sp.noSell&&!mm) $('cVal').textContent='保育類・不可販售'; }
  $('bShot').classList.toggle('hidden',!!fd.item||!G.logRec);
  if(G.logRec&&(G.logRec.new||G.logRec.rec)) setTimeout(()=>{ if(G.state==='catch'&&G.logRec&&!G.logRec.ph&&snapPhoto(G.logRec,true)) $('bShot').classList.add('hidden'); },700);
  $('bGrill').classList.toggle('hidden',!canGrill(fd)||!HOME.unlocked()); $('bGrill').textContent='🔥 放進保冷箱，帶回去烤（'+((save.cooler||[]).length)+'/5）';
  { const hr=HOME.check(fd), b=$('bHome'); b.classList.toggle('hidden',!!hr.hide||!HOME.unlocked()); b.textContent=hr.mount?'🖼 '+hr.short+'，做成標本 🪙'+hr.cost.toLocaleString():'🏠 帶回家';
    b.dataset.mode=hr.ok?'keep':hr.mount?'mount':'no'; b.dataset.why=hr.why||''; b.classList.toggle('dim',!hr.ok&&!hr.mount); }
  FUN.medalBadge(fd); FUN.goalsDot(); if(sp.special==='mermaid'){ if(!G.fish.group.userData.merCtl&&window.__MER){ try{ G.fish.group.userData.merCtl=window.__MER.rig(G.fish.group,{}); }catch(e){} } const ctl=G.fish.group.userData.merCtl; if(ctl){ G.merShow={t:0,ctl}; G.fish.group.visible=true; FUN.mermaidScene(true); ctl.smile(6); setTimeout(()=>ctl.talk(3.2),900); } else { G.fish.group.visible=false; FUN.mermaidScene(); } }
  const nb=$('cNew'); nb.textContent=isNew?'新魚種':'新紀錄'; nb.classList.toggle('hidden',!(isNew||isRec));
  const tag=$('tag'); tag.style.animation='none'; void tag.offsetWidth; tag.style.animation='';
  ui.catch.classList.remove('hidden'); document.body.classList.add('catching'); ui.actWrap.classList.add('hidden'); ui.sub.classList.add('hidden');
  Snd.fanfare(sp.rar); setTimeout(()=>$('bSell').focus({preventScroll:true}),50);
}
// 回家／出門：小屋是獨立場景，回家時改畫小屋，外面的湖照常運作；出門回到木碼頭
// 回到小屋時：第一次會看到手記附頁；之後每天第一次回家，若收藏了 3 種以上的魚，釣友會來參觀並留下魚餌
function homeEnter(){ const hd=HOME.data();
  if(!hd.page){ hd.page=1; persist(); setTimeout(()=>{ if(window.__STORY&&window.__STORY.page) window.__STORY.page('手記・附頁：小屋的水族箱',
    '牆角那個蒙著灰的玻璃缸，是我年輕時從鎮上扛回來的。<br><br>有些魚，我實在捨不得賣。牠們在缸裡游的樣子，讓我想起釣到牠們的那個早晨、那陣風、那片霧。<br><br>如果你也遇到捨不得的魚，就帶回來吧。太大的就做成標本，掛在牆上，每次經過都會想起那場拉扯。<br><br>對了，常有釣友來敲門想看看缸裡的魚。他們總會留下一點魚餌當謝禮——缸裡的魚越多樣，他們越大方。'); },900); return; }
  const day=new Date().toDateString(); if(hd.visit===day) return;
  const kinds=new Set([...hd.fresh,...hd.sea,...hd.mounts].map(r=>r.id)).size; if(kinds<3) return;
  const pool=BAITS.filter(b=>['corn','shrimp','live'].includes(b.id)&&save.lv>=b.lv), bt=pool[Math.floor(Math.random()*pool.length)]; if(!bt) return;
  const n=Math.min(8,1+Math.floor(kinds/2)); hd.visit=day; save.baits[bt.id]=(save.baits[bt.id]||0)+n; persist();
  setTimeout(()=>toast('釣友來參觀你的 '+kinds+' 種收藏，留下了 '+bt.icon+bt.name+' ×'+n,'good',2600),1200); }
function goHome(){ if(G.state==='home') return; if(G.state!=='idle'){ toast('先收線再回家','warn'); return; } if(!HOME.unlocked()){ toast('完成主線第一章後才能整理小屋','warn'); return; }
  G.state='travel'; fadeEl.classList.add('on'); Snd.paddle();
  setTimeout(()=>{ try{ HOME3D.enter(); }catch(err){ console.error('goHome',err); } G.state='home'; document.body.classList.add('athome'); fadeEl.classList.remove('on'); toast('回到老漁人的小屋','good',1400); },650); }
function leaveHome(then){ if(G.state!=='home') return; G.state='travel'; fadeEl.classList.add('on');
  setTimeout(()=>{ HOME3D.exit(); document.body.classList.remove('athome'); G.state='idle'; fadeEl.classList.remove('on'); if(then) then(); else if(G.spot!==0) goSpot(0); },650); }
window.__goHome=goHome;
$('bOut').addEventListener('click',()=>leaveHome());
$('bGrillH').addEventListener('click',()=>{ if(window.__GRILL) window.__GRILL(); });
$('bTankM').addEventListener('click',()=>{ if(window.__openSheet) window.__openSheet('home'); });
// 釣到美人魚：她從船前方的水裡浮上來（腰以上露出水面），轉向你、眨眼、微笑、說話；送她回家時揮手、慢慢沉回水裡
function merPresent(dt){ const m=G.merShow; if(!m) return; const g=G.fish.group; if(!g||!m.ctl){ G.merShow=null; return; } m.t+=dt;
  const cam=W.camera; if(g.parent!==cam){ cam.add(g); }   // 掛在鏡頭前面：不管鏡頭朝哪裡，她一定在畫面中
  const H=1.75; g.scale.setScalar(H); g.visible=true;
  const rise=m.leave?Math.max(0,1-m.leave/2.2):Math.min(1,m.t/1.8), e=1-Math.pow(1-rise,3);
  g.position.set(.05,-.55-(1-e)*1.6+Math.sin(m.t*1.3)*.03,-4.2); g.rotation.set(.04,Math.sin(m.t*.5)*.08,0);   // 從下方浮上來、輕輕晃
  m.ctl.swim(.2); if(!m.waved&&m.t>2.6){ m.waved=1; m.ctl.wave(); }
  if(m.leave){ m.leave+=dt; if(m.leave>2.4){ g.visible=false; cam.remove(g); W.scene.add(g); G.merShow=null; } }
  if(Math.random()<dt*.15&&!m.leave) m.ctl.look(); }
// 釣到美人魚時可以和她互動：點畫面上方（她所在的位置），她會有不同的反應和一句話
const MER_LINES=[['「你的燈……好溫暖。」','smile'],['「我叫霜汐。你呢？」','talk'],['「謝謝你，沒有傷害我。」','smile'],['「月亮圓的時候，我會再來。」','wave'],['「人類的手，原來是暖的。」','smile'],['「別告訴別人你看過我，好嗎？」','look'],['「湖底很安靜……但有點寂寞。」','talk']];
window.addEventListener('pointerdown',e=>{ const m=G.merShow; if(!m||m.leave||m.t<1.6||e.clientY>innerHeight*.62) return; const L=MER_LINES[(m.li=((m.li||0)+1+Math.floor(Math.random()*2))%MER_LINES.length)];
  m.ctl.talk(2.6); if(L[1]==='smile') m.ctl.smile(4); if(L[1]==='wave') m.ctl.wave(); if(L[1]==='look') m.ctl.look(); vib(12);
  const tx=document.getElementById('merTx'); if(tx) tx.innerHTML='<b>霜汐</b>'+L[0]+'<br><small>點她可以再說說話，送她回家，她會留下一份謝禮。</small>'; });
function finishCatch(sell){
  const keep=sell==='keep'; if(keep) sell=false;   // 帶回家：不賣、也不算放生
  if(sell&&G.fd&&G.fd.sp&&(G.fd.sp.noSell||G.fd.sp.special==='mermaid')) sell=false;   // 保育類、美人魚：任何途徑都不能賣
  ui.catch.classList.add('hidden'); document.body.classList.remove('catching'); ui.actWrap.classList.remove('hidden'); ui.sub.classList.remove('hidden');
  const g=G.fish.group;
  if(G.fd.item) FUN.itemEffect(G.fd.item);
  if(sell){ const v=Math.round(G.fd.value*(1+(save.mer&&save.mer.n>=15?.2:save.mer&&save.mer.n>=8?.1:0))); save.coins+=v; persist(); Snd.coin(); coinFly(v); }
  else if(keep){ Snd.coin(); }
  else { META.onRelease(); if(G.fd.sp.special==='mermaid'){ if(G.merShow){ G.merShow.leave=.01; G.merShow.ctl.wave(); G.merShow.ctl.smile(3); } const v=G.fd.value; save.coins+=v; persist(); Snd.coin(); coinFly(v); G.luck=.25; FUN.merMeet(); } else { G.luck=Math.min(.25,G.luck+.08); toast('放生了，下一竿稀有魚機率提高','good',1800); } }
  W.scene.attach(g); G.state='post'; G.stT=0; G.postSell=sell||keep; G.from.copy(g.position);
}
function coinFly(v){ const el=document.createElement('div'); el.className='fly'; el.textContent='+'+v.toLocaleString()+' 🪙';
  const r=ui.coin.getBoundingClientRect(); el.style.left='42%'; el.style.top='58%';
  el.style.setProperty('--dx',(r.left-window.innerWidth*.42)+'px'); el.style.setProperty('--dy',(r.top-window.innerHeight*.58)+'px');
  document.body.appendChild(el); setTimeout(()=>{ el.remove(); setCoins(); },900); }

/* ---------- 輸入 ---------- */
let actPtr=null, actX0=0, dragPtr=null, dragX0=0, yaw0=0;
function actDown(){
  Snd.init(); G.held=true; ui.act.classList.add('held');
  switch(G.state){
    case 'idle': if(G.loc==='ice'){ if(ICE.drilled()) iceDrop(); } else startCharge(); break;
    case 'lure': LURE.press(); break;
    case 'wait': if(G.snag){ G.snag=false; Snd.snap&&Snd.snap(); vib([60,30,80]); G.noBait=false; startRetrieve('掛底時硬收，線斷了，損失一組釣組','bad'); setTimeout(()=>toast('💡 原因：卡在障礙物上硬拉。改善：左右來回拖曳畫面解掛，或改在開闊水域用沉底釣。','',4000),1900); break; }
      startRetrieve(G.dip>0?'太早了：剛剛只是魚在試咬，要等浮標整個沉下去再揚竿':'收線','warn'); break;
    case 'bite': { const r=FUN.hookPress(); if(r==='miss') missBite(); else hook(r==='perfect'); } break;
  }
}
function actUp(){ G.held=false; ui.act.classList.remove('held'); if(G.state==='lure') LURE.release(); if(G.state==='charge') cast(); }
ui.act.addEventListener('pointerdown',e=>{ e.preventDefault(); try{ ui.act.setPointerCapture(e.pointerId); }catch(_){} actPtr=e.pointerId; actX0=e.clientX; actDown(); });
ui.act.addEventListener('pointermove',e=>{ if(e.pointerId!==actPtr) return; if(G.state==='fight') G.rodSideT=clamp((e.clientX-actX0)/70,-1,1); });
const actRel=e=>{ if(e.pointerId!==actPtr) return; actPtr=null; actUp(); if(dragPtr===null) G.rodSideT=0; };
ui.act.addEventListener('pointerup',actRel); ui.act.addEventListener('pointercancel',actRel);
ui.act.addEventListener('contextmenu',e=>e.preventDefault());
const cv=W.renderer.domElement;
cv.addEventListener('pointerdown',e=>{ if(dragPtr!==null) return; dragPtr=e.pointerId; dragX0=e.clientX; yaw0=G.yawT; dragY0=e.clientY; pitch0=G.pitchT||0; try{ cv.setPointerCapture(e.pointerId); }catch(_){} });
cv.addEventListener('pointermove',e=>{ if(e.pointerId!==dragPtr) return; const dx=e.clientX-dragX0;
  if(G.state==='fight') G.rodSideT=clamp(dx/70,-1,1); else if(G.state==='idle'||G.state==='charge'||G.state==='wait'||G.state==='bite'||G.state==='lure') G.yawT=clamp(yaw0-dx*.005,-.95,.95);   // 拋竿後（等魚、咬餌、路亞）也能自由轉視角
  if(G.state==='idle'||G.state==='wait') G.pitchT=clamp(pitch0+(e.clientY-dragY0)*.004,0,.62); });   // 上下拖曳：抬頭看天空
const dragRel=e=>{ if(e.pointerId!==dragPtr) return; dragPtr=null; if(actPtr===null) G.rodSideT=0; };
cv.addEventListener('pointerup',dragRel); cv.addEventListener('pointercancel',dragRel); cv.addEventListener('lostpointercapture',dragRel);
ui.act.addEventListener('lostpointercapture',actRel);
// 保險：手機瀏覽器偶爾會漏掉「放開」事件，讓按鈕／拖曳／搖桿永遠卡住。視窗層級再接一次，螢幕上沒有手指時全部清掉
function releaseAll(){ if(actPtr!==null){ actPtr=null; actUp(); } dragPtr=null; G.rodSideT=0; try{ if(KY.ptr!==null){ KY.ptr=null; KY.thr=0; KY.turn=0; joyK.style.transform=''; } }catch(e){} }   /* KY 還沒建立時（剛開頁就切到背景）不會報錯 */
window.addEventListener('pointerup',e=>{ if(e.pointerId===dragPtr) dragRel(e); if(e.pointerId===actPtr) actRel(e); if(typeof KY!=='undefined'&&e.pointerId===KY.ptr) joyEnd(e); },true);
window.addEventListener('pointercancel',e=>{ if(e.pointerId===dragPtr) dragRel(e); if(e.pointerId===actPtr) actRel(e); if(typeof KY!=='undefined'&&e.pointerId===KY.ptr) joyEnd(e); },true);
window.addEventListener('touchend',e=>{ if(e.touches.length===0) setTimeout(()=>{ if(!(navigator.maxTouchPoints>0&&(dragPtr!==null||actPtr!==null))) return; releaseAll(); },120); },{passive:true});
document.addEventListener('visibilitychange',()=>{ if(document.hidden) releaseAll(); });
let dragY0=0, pitch0=0;
const keys={};
window.addEventListener('keydown',e=>{ if(e.repeat) return; keys[e.code]=true; if(e.code==='Space'&&G.state!=='intro'&&G.state!=='catch'){ e.preventDefault(); actDown(); } });
window.addEventListener('keyup',e=>{ keys[e.code]=false; if(e.code==='Space'){ e.preventDefault(); actUp(); } });

$('startBtn').addEventListener('click',()=>{ Snd.init(); $('intro').classList.add('hidden'); G.state='idle'; toast('按住按鈕蓄力，放開拋竿','',2200);
  // 預覽結局：網址帶 ending 參數時，開始後直接播放結局（測試與重看用）
  if(/[?&]ending=[1-9]/.test(location.search)) setTimeout(()=>window.__playEnding(),1200);
  else if(!save.tutDone&&!(save.total>0)) setTimeout(()=>startTutorial(),2400);   // 新玩家：第一次開始遊戲時跑新手指引
  else if(!save.tutDone){ save.tutDone=1; persist(); } });
// 魚獲照片：截目前畫面縮成小圖（約 6KB），另存一個獨立的位置（不塞進存檔與雲端同步），最多保留 60 張
const PHOTO_KEY='swampAngler.photos';
function photoGet(){ try{ return JSON.parse(localStorage.getItem(PHOTO_KEY)||'{}'); }catch(e){ return {}; } }
function snapPhoto(rec,quiet){ if(!rec) return false; try{ W.render(); const src=W.renderer.domElement, cv=document.createElement('canvas'), w=200, h=Math.round(200*src.height/src.width*.62);
    cv.width=w; cv.height=h; const g=cv.getContext('2d'), sh=src.height*.62, sy=src.height*.12; g.drawImage(src,0,sy,src.width,sh,0,0,w,h);
    const url=cv.toDataURL('image/jpeg',.62); if(url.length<800) return false;   // 空白畫面不存
    const P2=photoGet(); P2[rec.t]=url; const ks=Object.keys(P2).sort(); while(ks.length>60) delete P2[ks.shift()];
    localStorage.setItem(PHOTO_KEY,JSON.stringify(P2)); rec.ph=1; persist(); if(!quiet){ toast('📸 已存進魚獲紀錄','good',1200); vib(15); } return true; }catch(e){ if(!quiet) toast('照片存不下了（手機空間不足）','warn',1600); return false; } }
window.__photoGet=photoGet;
$('bShot').addEventListener('click',()=>{ if(G.state==='catch'&&G.logRec&&!G.logRec.ph) snapPhoto(G.logRec,false); $('bShot').classList.add('hidden'); });
$('bSell').addEventListener('click',()=>{ if(G.state==='catch'){ if(G.logRec) G.logRec.out='賣出'; finishCatch(true); } });
$('bRel').addEventListener('click',()=>{ if(G.state==='catch'){ if(G.logRec) G.logRec.out='放生'; finishCatch(false); } });
// 保冷箱：魚帶回小屋烤（最多 5 條；保冷類、寶物、美人魚與幻想生物不能烤）
function canGrill(fd){ return fd&&fd.sp&&!fd.item&&!fd.sp.noSell&&!fd.sp.special&&fd.sp.rar<5; }
$('bGrill').addEventListener('click',()=>{ if(G.state!=='catch'||!G.fd) return; save.cooler=save.cooler||[];
  if(save.cooler.length>=5){ toast('保冷箱滿了（5 條），先回小屋烤掉幾條','warn',2200); return; }
  save.cooler.push({id:G.fd.sp.id,L:+G.fd.L.toFixed(3),w:+G.fd.w.toFixed(3),d:Date.now()}); persist(); toast('放進保冷箱，回小屋點壁爐就能烤','good',2000); finishCatch('keep'); });
$('bHome').addEventListener('click',()=>{ if(G.state!=='catch'||!G.fd) return; const b=$('bHome'), at=(SPOTS.find(s=>s.id===WL.zoneId())||SPOTS[G.spot]||{}).name;
  if(b.dataset.mode==='keep'){ if(HOME.keep(G.fd,at)){ toast('把'+G.fd.sp.name+'帶回小屋的水族箱了','good',1800); finishCatch('keep'); } return; }
  if(b.dataset.mode==='mount'){ const r=HOME.check(G.fd); if(save.coins<r.cost){ toast('金幣不夠做標本（需要 🪙'+r.cost.toLocaleString()+'）','bad'); return; }
    if(HOME.mount(G.fd,at)){ toast('做成標本，掛在小屋的牆上了','good',1800); finishCatch('keep'); } return; }
  toast(b.dataset.why||'現在不能帶回家','warn',2200); });
const PRESETS=[[6.3,'清晨'],[11.5,'正午'],[17.6,'黃昏'],[21,'夜晚']];
const ITEMS_BY=id=>(FUN.items||[]).find(x=>x.id===id);
window.__GRILL=()=>HOME3D.grill();
// 結局演出：接管主場景的鏡頭；演完回到原本的釣點
// 開始時：天氣改晴、月亮固定滿月、漁船停在原點；結束時全部恢復，並回到原本釣點的海或湖
const ENDSV={};
const END=createEnding(W,{rig:()=>[P.rodGroup,bob],soundOn:()=>save.sound!==false,setSea:on=>{ if((G.loc==='sea')!==on) SEA.setLoc(on?'sea':'lake'); },setHour:h=>{ G.hour=h; W.setTime(h,true); },
  begin:()=>{ ENDSV.hour=G.hour; ENDSV.wx=save.wxMode; ENDSV.loc=G.loc||'lake'; ENDSV.base=G.base.clone(); G.state='ending'; save.wxMode='clear'; G.base.set(0,0,0); if(window.__MOONPH&&window.__MOONPH.fix) window.__MOONPH.fix(.5); },
  end:()=>{ G.state='idle'; W.player.rotation.set(0,0,0); save.wxMode=ENDSV.wx; if(ENDSV.wx===undefined) delete save.wxMode; G.base.copy(ENDSV.base); G.hour=ENDSV.hour; W.setTime(G.hour,true); if(window.__MOONPH&&window.__MOONPH.fix) window.__MOONPH.fix(null); if((G.loc||'lake')!==ENDSV.loc) SEA.setLoc(ENDSV.loc); if(window.__applyGfx) window.__applyGfx(save.gfx||'high'); }});
window.__END=END;
const SCH=createSchools(W,P,{loc:()=>G.loc||'lake',period:()=>period(G.hour),ok:()=>(G.loc==='lake'||G.loc==='sea'||!G.loc)&&G.state!=='home'&&!END.on()&&!UW.active()}); window.__saveNow=()=>persist(); window.__ENDON=()=>END.on();
// 結局之後的湖：碼頭盡頭的紀念與滿月夜的月潮
const AFTER=createEndingWorld(W,{done:()=>!!(save.story&&save.story.ending),lake:()=>(G.loc||'lake')==='lake'&&G.state!=='home',ending:()=>END.on(),hour:()=>G.hour});
window.__playEnding=done=>{ if(G.state==='home'){ leaveHome(()=>window.__playEnding(done)); return; } END.play(endingShots(END,{save,W,P,G}),done); };
// 靜月之光：作者的水晶小店（遊戲免費，喜歡的話可以支持作者）
const SHOP_URL='https://tw.shp.ee/BcamsN2F';
function openShop(){ const ui=$('shopUI'); ui.innerHTML=`<div class="box"><h3>💎 靜月之光・水晶手作</h3>
  <div class="sub">《濕地垂釣》完全免費。做這個遊戲的人，平常也親手挑選、串製天然水晶。<br>老漁人說：「月光灣的石頭會發光，這些也是。」喜歡的話，歡迎逛逛。</div>
  <div class="grid">${[1,2,3,4,5,6,7,8,9].map(i=>`<img src="shop${i}.jpg" alt="水晶作品" loading="lazy">`).join('')}</div>
  <a class="go" href="${SHOP_URL}" target="_blank" rel="noopener">🛍 前往蝦皮賣場「靜月之光」</a><button class="x" data-x="1">關閉</button></div>`;
  ui.classList.remove('hidden'); ui.onclick=e=>{ if(e.target===ui||e.target.dataset.x) ui.classList.add('hidden'); }; }
window.__SHOP=openShop;
window.__CLOUD=createCloud({save:()=>save,toast,test:TESTACC,
  grant:()=>{ if((save.coins||0)<999999){ save.coins=999999; setCoins(); META.syncHUD(); persist(); } toast('🧪 測試帳號：金幣 999,999','good',2600); },refresh:()=>{ if(window.__SHEET&&window.__SHEET.refresh) window.__SHEET.refresh('set'); },
  apply:obj=>{ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(obj)); }catch(e){} location.reload(); }});
const GHOST=createGhost(W,{toast:(m,c2,ms)=>toast(m,c2,ms),splash:(x,z,n,s)=>P.splash(x,0,z,n,s),ripple:(x,z,r)=>W.addRipple(x,z,r),splashSnd:k=>Snd.splash&&Snd.splash(k),save,persist:()=>persist(),period:()=>period(G.hour),loc:()=>G.loc||'lake',state:()=>uiBusy()?'menu':G.state,base:()=>G.base,head:()=>G.head,yaw:()=>G.yaw,to:()=>G.to,scream:()=>Snd.scream(),drip:()=>Snd.drip(),vib:p=>vib(p),shake:k=>{ G.gShake=k; },onMeet:()=>{ if(window.__STORY) window.__STORY.onMeet(); },storyDone:id=>!!(window.__STORY&&window.__STORY.done(id)),storyActive:id=>!!(window.__STORY&&window.__STORY.isActive&&window.__STORY.isActive(id)),moon:()=>window.__MOONPH?window.__MOONPH.illum():0,progOf:id=>window.__STORY&&window.__STORY.progOf?window.__STORY.progOf(id):null,say:t=>toast(t,'',3200),zone:()=>WL.zoneId(),scene:id=>{ if(window.__STORY) window.__STORY.onScene(id); }});
window.__GHOST=GHOST;
// 烤好了：依兩面熟度評分，吃下去依魚的來源得到效果
// 吃下料理的效果演出：畫面中央浮起效果圖示、發光擴散
function fxBurst(icon){ const el=document.createElement('div'); el.textContent=icon; el.style.cssText='position:fixed;left:50%;top:46%;z-index:40;font-size:64px;transform:translate(-50%,-50%) scale(.4);opacity:0;transition:transform .6s cubic-bezier(.2,1.6,.4,1),opacity .4s;filter:drop-shadow(0 0 18px rgba(255,220,120,.9));pointer-events:none';
  document.body.appendChild(el); requestAnimationFrame(()=>{ el.style.transform='translate(-50%,-50%) scale(1.15)'; el.style.opacity='1'; }); setTimeout(()=>{ el.style.transition='transform 1s,opacity 1s'; el.style.transform='translate(-50%,-140%) scale(.8)'; el.style.opacity='0'; },1100); setTimeout(()=>el.remove(),2300); vib([20,40,20]); }
function onGrilled(rec,a,b,season,who){ const sp=SPECIES.find(s=>s.id===rec.id); if(!sp) return; const lo=season==='lemon'?.72:.78, hi=season==='lemon'?.95:.92, g=x=>x<.55?0:x<lo?1:x<hi?3:-1, ga=g(a), gb=g(b);
  const burnt=ga<0||gb<0, q=burnt?0:Math.min(ga,gb), name=burnt?'烤焦了':q>=3?'完美':q>=1?'半熟':'還是生的';
  // 潮間帶的海味：文蛤好運、海瓜子咬餌更快、竹蟶與沙蟹力氣；赤嘴蛤把身上所有效果延長
  const TFX={hardclam:{id:'luck',n:'好運',i:'🍀'},tellin:{id:'glow',n:'咬餌更快',i:'♨️'},razor:{id:'meal_str',n:'力氣（魚累得更快）',i:'💪'},ghostcrab:{id:'meal_str',n:'力氣（魚累得更快）',i:'💪'},gomphina:{id:'extend',n:'所有效果延長',i:'⏳'}};
  const fx=TFX[rec.id]?TFX[rec.id]:sp.loc==='sea'||sp.water==='sea'?{id:'luck',n:'好運',i:'🍀'}:sp.loc==='ice'||(sp.spots||[]).includes('ice')?{id:'glow',n:'暖身（咬餌更快）',i:'♨️'}:{id:'meal_str',n:'力氣（魚累得更快）',i:'💪'};
  save.cook=save.cook||{}; const ck=save.cook[rec.id]=save.cook[rec.id]||{n:0,best:0}; ck.n++; if(q>ck.best) ck.best=q;
  // 料理圖鑑稱號：完美過的魚種數
  { const perf=Object.keys(save.cook).filter(k=>save.cook[k].best>=3).length; save.titles=save.titles||[]; for(const [n,tt] of [[5,'烤魚師傅'],[15,'爐火大師']]) if(perf>=n&&save.titles.indexOf(tt)<0){ save.titles.push(tt); setTimeout(()=>toastHome('🏅 獲得稱號「'+tt+'」：完美烤過 '+n+' 種魚','good',3200),1600); } }
  if(q<=0){ persist(); toastHome('🔥 '+sp.name+'：'+name+(who==='friend'?'……釣友客氣地吃了一口':'……吞不下去，沒有效果'),'warn',2600); return; }
  const legend=(sp.rar||0)>=4&&q>=3;
  if(who==='friend'){ const coins=Math.round((sp.price||20)*Math.pow((rec.w||.5)+.3,.85)*(q>=3?2.2:1.2)*(legend?2:1)); save.coins+=coins; setCoins();
    save.baits=save.baits||{}; const bt=q>=3?(legend?'moon':'live'):'shrimp', bn=q>=3?(legend?1:3):2; save.baits[bt]=(save.baits[bt]||0)+bn; persist();
    toastHome('🎁 釣友吃得很開心'+(q>=3?'，直說好吃！':'')+' 🪙'+coins+'・'+({moon:'月光餌',live:'活魚餌',shrimp:'活蝦'}[bt])+' ×'+bn,'good',3200); Snd.coin&&Snd.coin(); return; }
  const min=Math.round((q>=3?12:5)*Math.min(2,.6+Math.sqrt(rec.w||.5)*.5)*({salt:1.2,lemon:1.3}[season]||1)*(legend?2:1)*HOME.grillFxK()); save.fx=save.fx||{}; if(fx.id==='extend'){ const now=Date.now(); let any=0; for(const k of Object.keys(save.fx)){ if(save.fx[k]>now){ save.fx[k]+=min*60000; any++; } } if(!any) save.fx.luck=now+Math.round(min*.5)*60000; }   /* 赤嘴蛤：延長身上所有效果；沒有效果時給一點好運 */
  else save.fx[fx.id]=Math.max(save.fx[fx.id]||0,Date.now())+min*60000;
  // 香草：不論熟度都附加「咬餌更快」，完美時效果時間更長
  if(season==='herb') save.fx.glow=Math.max(save.fx.glow||0,Date.now())+Math.round(min*(q>=3?.6:.35))*60000;
  if(legend){ const other=fx.id==='luck'?'meal_str':'luck'; save.fx[other]=Math.max(save.fx[other]||0,Date.now())+min*60000; }
  persist(); if(window.__ECO&&window.__ECO.render) window.__ECO.render();
  toastHome((legend?'👑 傳說料理！':'🍽 ')+sp.name+'：'+name+'！<br>'+fx.i+' '+fx.n+' '+min+' 分鐘'+(season==='herb'?'・♨️ 咬餌更快 '+Math.round(min*(q>=3?.6:.35))+' 分鐘':'')+(legend?'・雙重效果':'')+'<br><small>'+({salt:'🧂 鹽：效果時間 +20%',lemon:'🍋 檸檬：效果時間 +30%、完美更好烤',herb:'🌿 香草：附加咬餌更快'}[season]||'')+'（出門釣魚時生效）</small>','good',4200); fxBurst(fx.i); Snd.coin&&Snd.coin(); }
/* ===== 潮間帶 ===== */
const TIDE=createTide(W,{species:id=>SPECIES.find(q=>q.id===id),hour:()=>G.hour,toast:(...a)=>toastHome(...a),onExit:(bag,forced)=>tideDone(bag,forced),
  sellNow:v=>{ save.coins+=v; setCoins(); persist(); Snd.coin&&Snd.coin(); },
  toCooler:(id,L)=>{ save.cooler=save.cooler||[]; if(save.cooler.length>=5) return false; save.cooler.push({id,L,w:+(L*L*L*600).toFixed(3),d:Date.now()}); persist(); return true; },
  keepTank:(id,L)=>{ const sp=SPECIES.find(q=>q.id===id); if(!sp||!window.__HOME) return '小屋還沒開放'; const fd={sp,L,w:+(L*L*L*600).toFixed(3)}; const r=window.__HOME.check(fd); if(!r.ok) return r.why||'放不進去'; window.__HOME.keep(fd,'潮間帶'); return true; },
  dex:(id,L)=>{ const r=save.dex[id]; save.dex[id]={n:(r?r.n:0)+1,bw:Math.max(r?r.bw||0:0,L),bl:Math.max(r?r.bl||0:0,L),md:r?r.md||0:0,f:r?r.f:Date.now()}; persist(); }}); window.__TIDE=TIDE;
window.__P_splash=(x,y,z)=>{ try{ P.splash(x,.02,z,8,.25); }catch(e){} };
function goTide(){ if(G.state!=='idle'){ toast('先收線再下灘','warn'); return; } MDL.preload('tide'); G.state='travel'; fadeEl.classList.add('on');
  setTimeout(()=>{ if(TIDE.enter()) G.state='tide'; else G.state='idle'; fadeEl.classList.remove('on'); },650); }
window.__W=W; window.__testMer=()=>{ const sp=SPECIES.find(q=>q.special==='mermaid'); G.sp=sp; G.fd={sp,L:1.7,w:55,lvl:1,value:500,xpMul:1,grade:'A',u:.5}; const fish=P.getFish(sp); G.fish=fish; if(!fish.group.parent) W.scene.add(fish.group); G.state='catch'; try{ showCard(); }catch(e){ return 'card '+e.message; } if(G.merShow) G.merShow.t=2; return !!fish.group.userData.merCtl; }; window.__HS=()=>HOME3D; window.__goTide=goTide;
function tideDone(bag0,forced){ const handled=bag0.filter(b=>b.done).length; let bag=bag0.filter(b=>!b.done); if(!bag.length&&handled){ persist(); toast(forced?'被救回岸邊':'回到岸上了，這次處理了 '+handled+' 個收穫','good',2000); G.state='idle'; return; } G.state='idle';
  // 圖鑑：挖到的都算發現
  bag.forEach(b=>{ const r=save.dex[b.id]; save.dex[b.id]={n:(r?r.n:0)+1,bw:Math.max(r?r.bw||0:0,b.L),bl:Math.max(r?r.bl||0:0,b.L),md:r?r.md||0:0,f:r?r.f:Date.now()}; });
  if(!bag.length){ persist(); toast(forced?'被救回岸邊，這次什麼都沒帶到':'回到岸上了','',1800); return; }
  // 挖到的沙蠶直接變成魚餌（不賣、不烤）
  { const nw=bag.filter(b=>b.id==='ragworm'&&!b.broken).length*3; if(nw){ save.baits=save.baits||{}; save.baits.ragworm=(save.baits.ragworm||0)+nw; bag=bag.filter(b=>b.id!=='ragworm'); setTimeout(()=>toast('🪱 沙蠶 ×'+nw+' 放進魚餌盒了（海釣萬用餌）','good',2600),400); if(!bag.length){ persist(); return; } } }
  const grill=['hardclam','gomphina','tellin','razor','ghostcrab'], total=bag.reduce((a,b)=>a+b.v,0), canKeep=bag.filter(b=>grill.includes(b.id)&&!b.broken);
  const el=document.createElement('div'); el.style.cssText='position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center';
  const names={}; bag.forEach(b=>{ const sp=SPECIES.find(q=>q.id===b.id); names[b.id]=(names[b.id]||0)+1; });
  el.innerHTML=`<div style="background:#1b2226;color:#fff;border-radius:18px;padding:18px;width:min(88vw,360px);line-height:1.6"><div style="font-weight:800;font-size:17px;margin-bottom:8px">🪣 這次的收穫</div>
    <div style="font-size:14px;opacity:.9">${Object.entries(names).map(([id,n])=>(SPECIES.find(q=>q.id===id)||{name:id}).name+' ×'+n).join('、')}</div>
    <div style="margin:10px 0;font-size:13px;opacity:.8">保冷箱可以帶回家烤：文蛤、赤嘴蛤、海瓜子、竹蟶、沙蟹（完整的才行，最多 5 個）</div>
    <div style="display:flex;gap:8px;flex-direction:column"><button id="tdSell" class="sbtn pri" style="padding:10px">全部賣掉 🪙${total.toLocaleString()}</button>
    ${canKeep.length?`<button id="tdKeep" class="sbtn" style="padding:10px">能烤的放保冷箱，其他賣掉</button>`:''}</div></div>`;
  document.body.appendChild(el);
  const fin=keep=>{ let earn=0; save.cooler=save.cooler||[]; bag.forEach(b=>{ if(keep&&grill.includes(b.id)&&!b.broken&&save.cooler.length<5) save.cooler.push({id:b.id,L:b.L,w:+(b.L*b.L*b.L*600).toFixed(3),d:Date.now()}); else earn+=b.v; });
    save.coins+=earn; setCoins(); persist(); Snd.coin&&Snd.coin(); el.remove(); toast(earn?'賣了 🪙'+earn.toLocaleString():'放進保冷箱了，回小屋就能烤','good',2200); };
  el.querySelector('#tdSell').onclick=()=>fin(false); const k=el.querySelector('#tdKeep'); if(k) k.onclick=()=>fin(true); }
const HOME3D=createHomeScene(W,{openShop:()=>openShop(),save,home:()=>HOME,grillHeat:()=>HOME.grillHeat(),coin:()=>{ Snd.coin&&Snd.coin(); },toast:(...a)=>toastHome(...a),persist:()=>persist(),onGrilled,buy:(id,p)=>{ if(save.coins<p){ toast('金幣不夠','warn',1400); return false; } save.coins-=p; setCoins(); persist(); return true; },sizzle:k=>{ Snd.sizzle&&Snd.sizzle(k); },joy:()=>({thr:KY.thr,turn:KY.turn}),hour:()=>G.hour,data:()=>HOME.data(),species:id=>SPECIES.find(s=>s.id===id),getFish:sp=>P.getFish(sp),
  isReal:id=>!!(window.__MDL&&window.__MDL.fishReady(id)),want:id=>{ if(window.__MDL&&window.__MDL.want) window.__MDL.want(id); },
  crackle:()=>Snd.crackle(), onEnter:()=>homeEnter(), rain:()=>{ if(window.__rainTest!=null) return window.__rainTest; const wx=WL.wx?WL.wx():{}; return wx.r||0; },
  showFish:(rec,card)=>{ const sp=SPECIES.find(s=>s.id===rec.id)||{name:rec.id,rar:0}, r=RAR[sp.rar]; card.style.setProperty('--rc',r.col);
    card.innerHTML=`<b>${sp.name}</b><small>${r.name}${rec.g?'｜'+rec.g:''}</small><div class="fg"><span>長度</span><div>${(rec.L*100).toFixed(1)} 公分</div><span>重量</span><div>${rec.w<1?Math.round(rec.w*1000)+' 公克':rec.w.toFixed(2)+' 公斤'}</div><span>釣到地點</span><div>${rec.at||'—'}</div><span>釣到日期</span><div>${new Date(rec.d).toLocaleDateString('zh-TW')}</div></div>`;
    card.classList.remove('hidden'); }});
window.__HOME=createHome({save,persist:()=>persist(),toast:(...a)=>toastHome(...a),setCoins:()=>setCoins(),addXP:x=>META.addXP(x),syncHUD:()=>META.syncHUD(),hour:()=>G.hour,setHour:h=>{ G.hour=h; W.setTime(h,true); },fxChanged:()=>{ if(window.__ECO&&window.__ECO.render) window.__ECO.render(); }}); const HOME=window.__HOME;
const META=createMeta({W,save,persist,toast,Snd,SPECIES,RAR,P,setCoins,vib,PRESETS,goSpot,curSpot:()=>G.spot,setHour:h=>{ G.hour=h; W.setTime(h,true); }});
const UW=createUnderwater(W,P);
const tvSea=new THREE.Vector3();
window.__MDL=createModels(W); const MDL=window.__MDL; MDL.preload('lake');
// 打開設定、商店等面板或新手指引時，鱷魚與女鬼都不會發動（玩家沒在看湖面）
const uiBusy=()=>{ const sh=document.getElementById('sheet'); return (sh&&!sh.classList.contains('hidden'))||!!document.getElementById('tutOv'); };
const WL=createWild(W,P,Snd,save,toast,vib,{period:()=>period(G.hour),base:()=>G.base,head:()=>G.head,
  state:()=>uiBusy()?'menu':G.state, loc:()=>G.loc||'lake', kayak:()=>({on:!!SPOTS[G.spot].kayak,v:Math.abs(KY.v),yaw:G.head}),
  onBite:(pos)=>{ faceThreat(pos,{dur:2.6,pitch:-.25}); if(G.state==='wait'||G.state==='bite'){ G.state='lost'; G.stT=0; G.snapped=true; }   // 鱷魚咬船：斷線、連擊歸零、驚魂未定
    G.combo=0; FUN.combo(0); G.scareT=6; G.gShake=1.6; vib([200,60,260,60,200]); biteFX('gator'); Snd.splash(2); toast('🐊 ……！','bad',1600); },
  onScare:why=>{ const ram=why==='ram', xp=Math.round(window.__LVINFO.xpNext(save.lv)*(ram?.04:.02)), cn=Math.round((ram?20:10)+save.lv*(ram?10:5));
    if(ram) save.gatorRam=(save.gatorRam||0)+1; else save.gatorScare=(save.gatorScare||0)+1; META.addXP(xp); save.coins+=cn; setCoins(); META.syncHUD(); persist(); G.gShake=ram?.9:.3;
    toast(`+${xp} 經驗　🪙${cn}`,'good',2200); } });
const AT=createAtmos(W,P,Snd,WL,{underwater:()=>UW.active(),period:()=>period(G.hour),base:()=>G.base,head:()=>G.head,spot:()=>G.spot,toast});
const FUN=createFun(W,P,AT,{G,save,persist,toast,Snd,vib,RAR,setCoins,D,SPN:SPECIES.length,period:()=>period(G.hour)}); window.__FUN=FUN;
const SEA=createSea(W,P,AT,{G,save,persist,toast,Snd,vib,setCoins,period:()=>period(G.hour),wx:()=>WL.wx(),underwater:()=>UW.active()});
const KK=createThrill(W,P,AT,{G,toast,Snd,vib,underwater:()=>UW.active(),hullDims:()=>SEA.hullDims(),hullClear:(p,m)=>SEA.hullClear(p,m),hullOut:(p,o)=>SEA.hullOut(p,o)}); window.__KK=KK;
G.saveRef=save;
window.__STORY=createStory({save,persist,toast,Snd,vib,goSpot:i=>goSpot(i),curSpot:()=>G.spot,idle:()=>G.state==='idle',pan:on=>{ G.cinePan=on; if(!on) G.yawT=0; },addXP:x=>META.addXP(x),setCoins:()=>setCoins(),syncHUD:()=>META.syncHUD()});
const SKY=createNightSky(W,G); window.__SKY=SKY;
/* 畫質：高／中／低，影響倒影、霧層光束、雨圈、草叢與解析度上限 */
// 自動（預設）：特效全開，解析度依實際幀率上下調整；高／中／低：固定，不自動改
window.__gfxCap=()=>Math.min(window.devicePixelRatio||1,2.5);
window.__applyGfx=q=>{ window.__GFX=q; const dpr=window.devicePixelRatio||1;
  // 高：手機原生解析度＋完整倒影；中：約 6 成解析度＋簡化倒影；低：約 4 成解析度、沒有倒影（最省電，畫面會明顯變糊）
  const pr={high:Math.min(dpr,2.5),mid:Math.min(dpr,2.5)*.62,low:Math.min(dpr,2.5)*.42,auto:Math.min(dpr,2.5)}[q]||dpr;
  if(W.setRefl) W.setRefl(q!=='low',q==='mid'?.22:.35); W.setPR(Math.max(.6,pr));
  document.body.dataset.gfx=q; if(window.__toastGfx) window.__toastGfx(q); };
window.__applyGfx(save.gfx||'auto');
const ICE=createIce(W,{loc:()=>G.loc,base:()=>G.base,head:()=>G.head,state:()=>G.state,tens:()=>G.f?G.f.T:0,held:()=>G.held,grind:()=>Snd.grind&&Snd.grind(),splash:(p,k)=>{ P.splash(p.x,.02,p.z,Math.round(4+10*k),.25+.35*k); if(k>.85) vib(15); },chips:p=>{ P.splash(p.x+(Math.random()-.5)*.3,.05,p.z+(Math.random()-.5)*.3,3,.25); if(Math.random()<.5) Snd.click(); vib(8); },done:p=>{ P.splash(p.x,.05,p.z,24,.6); W.addRipple(p.x,p.z,.3); Snd.plop(); vib([20,30,40]); toast('冰洞鑿開了！點擊放線','good',1800); }});
function iceDrop(){ G.noBait=false; const bt=META.useBait(); G.baitUsed=bt&&bt.lure?Object.assign({},bt,{lure:null,wait:(bt.wait||1)*.85}):bt; LURE.bobberVis(true); G.to.copy(ICE.holePos()); G.castDist=1.6; bob.position.set(G.to.x,.6,G.to.z); Snd.plop(); landBobber(); } window.__ICE=ICE;
const MIST=createMorningMist(W,{hour:()=>G.hour,wx:()=>WL.wx(),sea:()=>G.loc==='sea',underwater:()=>UW.active(),wind:()=>WL.wind()}); window.__MIST=MIST;
const ARMS=createArms(W,P); window.__ARMS=ARMS;
const LURE=createLure(W,P,{G,toast,Snd,mood:()=>{ const p=period(G.hour), wx=WL.wx(); return (p==='dawn'||p==='dusk'?1.25:p==='day'?.85:.8)*(wx.c>.5?1.12:1)*(G.loc==='ice'?.8:1); },uwOn:()=>save.uw!==false,reelSpd:()=>META.gear().reel.spd,onChase:()=>{ if(!G.fd) prepFish(); if(!G.fd||G.fd.item) return null; const f=P.getFish(G.fd.sp); if(f) seeThrough(f.group); return f?{group:f.group,uni:f.uni,L:G.fd.L}:null; }}); window.__G=G;
window.__MOON=createMoonBay(W,{G,save,persist,toast,Snd,vib,hour:()=>((G.hour%24)+24)%24,zoneId:()=>WL.zoneId?WL.zoneId():'',period:()=>period(G.hour),giveRod:()=>{ const i=GEAR.rod.findIndex(r=>r.req==='moon'); if(i>=0&&save.gear.rod.indexOf(i)<0){ save.gear.rod.push(i); persist(); } }});
window.__TAL=createTalents({save,persist,toast,Snd,vib,setCoins,addXP:x=>META.addXP(x),loc:()=>G.loc||'lake',zoneId:()=>WL.zoneId?WL.zoneId():'',period:()=>period(G.hour)}); window.__SEA=SEA;
if(!SPOTS[save.spot]||(SPOTS[save.spot].kayak&&!save.kayak)||(SPOTS[save.spot].yacht&&!save.yacht)) save.spot=0;
{ const s=SPOTS[save.spot]; G.spot=save.spot; G.base.set(s.pos[0],0,s.pos[1]); G.head=s.head; WL.setSpot(save.spot); SEA.setLoc(s.loc||'lake'); }
function goSpot(i){ if(G.state==='home'){ leaveHome(()=>goSpot(i)); return; }   // 在小屋裡選了釣點：先出門再過去
  if(G.state!=='idle'){ toast('先收線再移動','warn'); return; } { const lk=window.__STORY&&window.__STORY.lock(i); if(lk){ toast('🔒 '+lk,'warn',2400); return; } }
  // 上一行：所有入口共用的開放檢查
  const s=SPOTS[i]; G.state='travel'; fadeEl.classList.add('on'); Snd.paddle(); setTimeout(()=>Snd.paddle(),380);
  setTimeout(()=>{ G.spot=i; G.base.set(s.pos[0],0,s.pos[1]); G.head=s.head; G.yaw=G.yawT=0; save.spot=i; persist(); WL.setSpot(i); if((s.loc||'lake')!==SEA.loc()) SEA.setLoc(s.loc||'lake'); fadeEl.classList.remove('on'); G.state='idle'; toast('抵達'+s.name); if(s.id==='moon'&&!save.lagoonPg){ save.lagoonPg=1; persist(); setTimeout(()=>{ if(window.__STORY&&window.__STORY.page) window.__STORY.page('手記・附頁：月光灣的秘密','月光灣不是普通的湖灣。<br><br>灣底有一條很深的石縫，一路通到外海。平常潮水進不來，可是每逢月圓、大潮漲到最高的那幾夜，海水就會從石縫湧進灣裡。<br><br>那幾夜，我在這裡釣過小丑魚、藍色的刺尾鯛、拖著長絲的鰺……都是海裡才有的魚。月亮越圓，牠們越多。<br><br>霜汐說，她就是順著那條水道游進來的。<br><br>還有一件事，我只敢寫在這裡：有一年滿月的深夜，我看見一隻長著鹿角的海馬，比我的船還長，在月光下慢慢游過灣口。'); },1600); }; },750); }
const KY={v:0,w:0,thr:0,turn:0,wake:0,ptr:null,x0:0,y0:0,zone:-1};
const joy=$('joy'), joyK=$('joyK');
function joyMove(e){ if(e.pointerId!==KY.ptr) return; let dx=(e.clientX-KY.x0)/45, dy=(e.clientY-KY.y0)/45; const L=Math.hypot(dx,dy); if(L>1){ dx/=L; dy/=L; }
  KY.thr=-dy; KY.turn=dx; joyK.style.transform=`translate(${(dx*34).toFixed(0)}px,${(dy*34).toFixed(0)}px)`; }
joy.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); Snd.init(); try{ joy.setPointerCapture(e.pointerId); }catch(_){} KY.ptr=e.pointerId; const r=joy.getBoundingClientRect(); KY.x0=r.left+r.width/2; KY.y0=r.top+r.height/2; joyMove(e); });
joy.addEventListener('pointermove',joyMove);
const joyEnd=e=>{ if(e.pointerId!==KY.ptr) return; KY.ptr=null; KY.thr=0; KY.turn=0; joyK.style.transform=''; };
joy.addEventListener('pointerup',joyEnd); joy.addEventListener('pointercancel',joyEnd);
function zoneOf(x,z){ let best=G.spot, bd=22; for(let i=1;i<SPOTS.length;i++){ const s=SPOTS[i]; if(s.loc==='sea') continue; if(s.req==='mer1'&&!(save.mer&&save.mer.n>=1)) continue; const d=Math.hypot(x-s.pos[0],z-s.pos[1]); if(d<bd){ bd=d; best=i; } } return best; }
// 握槳時把竿子降低、竿尖朝前放倒在船裡（pk＝握槳程度 0～1）
function stowRod(pk){ P.rodGroup.position.set(0,-.55*pk,.1*pk); P.rodGroup.rotation.x=-.75*pk; }
function updateKayak(dt){
  if(HOME3D.active()){ joy.classList.remove('hidden'); return; }
  const s=SPOTS[G.spot], can=(s.kayak||s.yacht)&&G.state==='idle'&&!document.body.classList.contains('catching');
  joy.classList.toggle('hidden',!can);
  const z=s.kayak?zoneOf(G.base.x,G.base.z):G.spot; if(z!==KY.zone){ KY.zone=z; WL.setZone(z); }
  let thr=KY.thr, turn=KY.turn;
  if(keys.KeyW) thr=1; if(keys.KeyS) thr=-.6; if(keys.KeyA) turn=-1; if(keys.KeyD) turn=1;
  if(!can){ thr=0; turn=0; }
  if(!s.kayak&&!s.yacht){ KY.v=0; KY.w=0; WL.paddle(dt,0); stowRod(WL.padOn()); return; }
  KY.v+=(thr*(s.yacht?4:1.5)-KY.v*.65)*dt; KY.w+=(turn*.55*(.4+Math.min(1,Math.abs(KY.v)))-KY.w)*Math.min(1,dt*3);
  WL.paddle(dt,s.yacht?0:clamp(Math.max(Math.abs(thr),Math.abs(turn)*.7),0,1),AT.ring);   // 遊艇靠引擎，不划槳
  stowRod(WL.padOn());
  if(Math.abs(KY.v)<.002&&Math.abs(KY.w)<.002) return;
  G.head-=KY.w*dt;
  const fx=-Math.sin(G.head), fz=-Math.cos(G.head);
  let nx=G.base.x+fx*KY.v*dt, nz=G.base.z+fz*KY.v*dt;
  const r=Math.hypot(nx,nz), Rm=W.shoreR(Math.atan2(nx,-nz))-5; if(r>Rm){ nx*=Rm/r; nz*=Rm/r; KY.v*=-.2; }
  if(G.loc!=='sea'&&Math.abs(nx)<2.2&&nz>-4.6&&nz<7){ if(2.2-Math.abs(nx)<nz+4.6){ nx=nx<0?-2.2:2.2; } else nz=-4.6; KY.v*=.3; }
  if(G.loc!=='sea') for(const o of WL.obstacles){ const dx=nx-o[0], dz=nz-o[1], dd=Math.hypot(dx,dz)||.01, m=o[2]+1; if(dd<m){ nx=o[0]+dx/dd*m; nz=o[1]+dz/dd*m; KY.v*=.5; } }
  G.base.x=nx; G.base.z=nz;
  if(Math.abs(thr)>.1) G.yawT+=(0-G.yawT)*Math.min(1,dt*1.5);
  KY.wake-=dt; const spd=Math.abs(KY.v);
  if(spd>.25&&KY.wake<=0){ KY.wake=.4; AT.ring(G.base.x-fx*1.9,G.base.z-fz*1.9,.6+spd*.5); AT.ring(G.base.x+fx*1.8,G.base.z+fz*1.8,.3+spd*.3); if(spd>.9) P.splash(G.base.x+fx*1.9,0,G.base.z+fz*1.9,3,.3); }
}
const fadeEl=$('fade'), uwTag=$('uwTag');
let uwBusy=false;
function enterUW(){ if(UW.active()||uwBusy||(G.uwBlock&&G.t<G.uwBlock)) return; uwBusy=true; fadeEl.classList.add('on');
  setTimeout(()=>{ if(G.fd&&(G.state==='wait'||G.state==='bite')){ UW.start(G.fd); if(G.state==='bite') UW.bite(); const r=RAR[G.fd.sp.rar];
    // 咬餌之前不揭露魚種：只給模糊的體型暗示，留住期待感（稀有以上有低沉的提示聲）
    const L=G.fd.L||.3, hint=G.fd.item?'好像勾到什麼東西…':L>1.2?'水裡有個很大的影子…':L>.6?'看起來不小…':L>.3?'有東西靠過來了…':'小小的影子在打轉…';
    uwTag.style.setProperty('--rc','#9aa4ae'); $('uLv').textContent='?'; $('uName').textContent='？？？'; $('uRar').textContent=hint; uwTag.classList.remove('hidden');
    if(!G.fd.item&&(G.fd.sp.rar||0)>=2) Snd.rumble&&Snd.rumble(); }
    fadeEl.classList.remove('on'); uwBusy=false; },180); }
// 強制面對威脅（鯊魚、鱷魚、林秋月）：鏡頭轉向攻擊者（可超過平常的轉頭限制），持續一段時間後回到原本視角；水下鏡頭立刻關閉且幾秒內不重開
function faceThreat(pos,opt){ opt=opt||{}; if(!pos) return; G.look={x:pos.x,z:pos.z,until:G.t+(opt.dur||2.4),snap:!!opt.snap,prev:G.look?G.look.prev:G.yawT,pitch:opt.pitch||0}; exitUW(); G.uwBlock=G.t+5; }
window.__FACE=faceThreat;
let uwExiting=false;
function exitUW(){ uwTag.classList.add('hidden'); if(!UW.active()||uwExiting) return; uwExiting=true; fadeEl.classList.add('on'); setTimeout(()=>{ UW.end(); fadeEl.classList.remove('on'); uwExiting=false; },160); }
// 水下鏡頭只屬於「等魚、咬餌」：任何原因離開這兩個狀態（鱷魚、斷線、拉魚…）都自動關掉
function guardUW(){ if(UW.active()&&!uwExiting&&G.state!=='wait'&&G.state!=='bite') exitUW(); }

/* ---------- 每幀更新 ---------- */
function updateFight(dt){
  const f=G.f, sp=G.fd.sp, fs=sp.f, fd=G.fd;
  f.ft=(f.ft||0)+dt; f.maxT=Math.max(f.maxT||0,f.T); if(f.run&&!f.wasRun) f.runs=(f.runs||0)+1; f.wasRun=f.run;   // 搏魚統計：時間、最高張力、衝刺次數
  const ST=styOf(fd.sp.id), DF=D();
  f.phaseT-=dt;
  if(f.phaseT<=0){
    if(f.run){ f.run=false; f.ev=null; f.phaseT=rand(ST.rest[0],ST.rest[1])*(1.3-fs.agi*.3); f.latDir=0; }
    else { f.run=true; f.phaseT=rand(ST.run[0],ST.run[1]); f.latDir=Math.abs(f.theta)>.45?-Math.sign(f.theta):(Math.random()<.5?-1:1); vib(25);
      if(ST.ev&&f.stam>15&&Math.random()<ST.evP){ f.ev={k:ST.ev,t:0};
        if(ST.ev==='long'){ f.phaseT*=1.6; toast('魚在長距離狂奔！先放線','warn',1400); }
        else if(ST.ev==='shake') toast('魚在甩頭！放手卸力！','warn',1200);
        else if(ST.ev==='dive'){ f.phaseT=Math.max(f.phaseT,2.6); toast('魚往水底鑽！穩住別硬拉','warn',1400); } } }
  }
  if(f.ev) f.ev.t+=dt;
  const shake=(f.ev&&f.ev.k==='shake'&&f.ev.t<1.15&&((f.ev.t/.28)%1)<.45)?1:0;
  const dive=(f.ev&&f.ev.k==='dive')?1:0;
  if(shake&&!f.shV) vib(30); f.shV=shake;
  // 掛鉤品質：揚竿不完美時，魚甩頭又剛好線鬆、或魚躍出水面你還硬拉，就可能把鉤甩掉
  if(shake&&f.T<.18&&!fd.item&&Math.random()<dt*1.6*(1-f.hq)) { f.lostWhy='shook'; }
  if(f.jumpT>0&&G.held&&f.T>.85&&!fd.item&&Math.random()<dt*1.2*(1.15-f.hq)) { f.lostWhy='jump'; }
  const stamF=.4+.6*f.stam/100;
  const F=fs.pow*(.8+.25*Math.pow(fd.w,.45))*(1+.22*sp.rar)*(fd.boss?fd.boss.pow:1)*stamF*(f.run?ST.mul:1)*(dive?1.35:1);
  const good=-f.latDir*G.rodSide, steerMul=1-.28*clamp(good,0,1)+.15*clamp(-good,0,1);
  // 障礙物磨線：在倒木區、礁岩中魚時，愛躲的魚（底棲魚、礁岩魚）衝刺時會往結構物鑽；線一碰到就開始磨損。
  // 往牠鑽的反方向控竿就能把牠帶離；線越粗、鋼絲前導線越耐磨
  { const zid=WL.zoneId?WL.zoneId():'', stru=zid==='wood'||zid==='reef'||(zid==='lily'&&G.loc!=='sea'), hider=!fd.item&&(LAYER_B.has(fd.sp.id)||(fd.sp.spots&&fd.sp.spots.includes('reef')));
    if(stru&&hider&&G.loc!=='ice'){
      if(f.run){ if(f.latDir!==f.coverSide&&Math.random()<dt*.8) f.latDir=f.coverSide;   // 衝刺時偏向結構物那一側
        const toward=f.latDir===f.coverSide; f.cover=clamp(f.cover+(toward?(good>.4?-.35:.45):-.2)*dt,0,1); }
      else f.cover=clamp(f.cover-(good>.4?.5:.15)*dt,0,1);
      if(f.cover>.55&&f.T>.25){ f.abr+=dt*(.18+.5*f.T)*(f.cover-.4)/((.7+.3*META.gear().line.s)*DF.line); if(!f.rubW){ f.rubW=1; toast(zid==='reef'?'🪨 魚往礁石鑽！往反方向控竿把牠帶出來':'🪵 魚往倒木裡鑽！往反方向控竿把牠帶出來','warn',2000); vib([30,30,30]); } }
      else if(f.cover<.3) f.rubW=0;
      ui.tBar.classList.toggle('rub',f.cover>.55); } }
  let Tt=(F*(G.held?1:.35)+(G.held?.5:0))/(META.gear().line.s*DF.line)*steerMul*META.gear().rod.tens;
  if(f.jumpT>0&&G.held) Tt+=.45;
  if(shake) Tt+=G.held?.38:.12;
  Tt+=(Math.sin(G.t*13.1)+Math.sin(G.t*7.3))*.015*(f.run?2:1)*DF.jit;
  // 洩力：鬆／中／緊。拉力超過洩力門檻的部分改成出線（魚把線拉走），而不是全部變成張力
  const dcap=[.66,.8,.94][f.drag], over=Math.max(0,Tt-dcap); if(over>0){ Tt=dcap+over*.3; f.d+=over*2.2*dt; if(Math.random()<dt*8) Snd.click(4800); }
  f.T+=(Tt-f.T)*Math.min(1,dt*5);
  if(f.T>.9) f.brk+=dt*(f.T-.9)*14*META.gear().reel.drag*(1-.05*TR('power')); else f.brk=Math.max(0,f.brk-dt*.8);
  // 線太鬆：只有「沒在收線」而且張力過低時才累積——按住收線時線一定是繃的；小魚、漂流物本來就拉不出張力，不能因此判脫鉤
  const lightCatch=!!(fd.item||fs.pow<.7||fd.w<.25);   // 漂流物、遺物（fd.item）、力氣很小或很輕的魚
  if(f.T<.1&&!G.held&&!lightCatch) f.slk+=dt/(2.8*DF.slack); else f.slk=Math.max(0,f.slk-dt*(G.held?3:1.5));
  const zone=f.T>.4&&f.T<.8;
  const drain=(3+18*f.T)*(1+.8*clamp(good,0,1))*(zone?1.2:1)/(fs.stam*DF.stam*(.7+.25*Math.sqrt(fd.w)));
  f.stam=clamp(f.stam-drain*(window.__ECO&&window.__ECO.fxOn('meal_str')?1.3:1)*dt+(f.T<.2?2.5*dt:0),0,100);
  const reel=G.held?[.75,1,1.2][f.drag]*META.gear().reel.spd*clamp(1.25-f.T,.15,1)*(f.stam<8?1.4:1)*(zone?1.15:1)*(dive?.3:1):0;
  const run=f.run?fs.spd*ST.spd*stamF*1.5*(G.held?.35:1)*(dive?.4:1):(G.held?0:.05);
  f.d=Math.max(0,f.d+(run-reel)*dt);
  f.theta=clamp(f.theta+f.latDir*fs.agi*ST.lat*.16*stamF*dt*(G.held?.7:1),-.85,.85);
  const az=f.az0+f.theta; { fishPos(tv,0); const r=Math.hypot(tv.x,tv.z), Rm=W.shoreR(Math.atan2(tv.x,-tv.z))-3; if(r>Rm) f.d=Math.max(2,f.d-(r-Rm)); }
  if(G.held){ f.clickA+=reel*dt*9; while(f.clickA>=1){ Snd.click(); f.clickA-=1; } rod.spin-=reel*dt*14; }
  else if(f.run&&f.T>.3){ f.clickA+=dt*28; while(f.clickA>=1){ Snd.click(4500); f.clickA-=1; } }
  f.vibT-=dt; if(f.vibT<=0){ if(f.T>.85){ vib(14); f.vibT=.22; } else if(f.run){ vib(Math.round(5+8*f.T)); f.vibT=.32; } else f.vibT=.2; }
  fishPos(tv,0);
  f.ripT-=dt; if(f.ripT<=0){ f.ripT=f.run?rand(.12,.3):rand(.4,.8); W.addRipple(tv.x,tv.z,.15+.35*f.T+(f.run?.12:0)); if(f.run) P.splash(tv.x,0,tv.z,Math.round(3+8*f.T),.25+.35*f.T); }
  // 跳水
  const g=G.fish.group;
  if(f.jumpT>0){
    f.jumpT-=dt; const s=1-f.jumpT/f.jumpDur, h=.5+.45*Math.sqrt(fd.L), y=4*h*s*(1-s)-.15*fd.L;
    g.position.set(tv.x,y,tv.z); te.set(0,az+(f.latDir<0?Math.PI:0)+Math.PI/2,clamp(4*h*(1-2*s)/(1.2*fd.L+.5),-1.2,1.2)); g.quaternion.setFromEuler(te);
    G.fish.uni.uAmp.value=.14; G.fish.uni.uSwim.value+=dt*18;
    if(f.jumpT<=0){ g.visible=false; P.splash(tv.x,0,tv.z,30,1.1); W.addRipple(tv.x,tv.z,.9); Snd.splash(1); }
  } else if(f.run&&fs.jump>0&&fd.sp.special!=='mermaid'&&f.stam>20&&f.d>4&&G.loc!=='ice'&&Math.random()<fs.jump*.3*dt) startJump();
  // 魚影
  const sh=P.shadow; sh.position.set(tv.x-Math.sin(az)*.4,.012,tv.z-Math.cos(az)*.4); sh.rotation.y=az+(f.latDir<0?-Math.PI/2:Math.PI/2); sh.scale.setScalar(fd.L*1.15);
  sh.material.opacity=f.jumpT>0?0:.4*(1-sstep(3,10,f.d));
  // 浮標與釣竿
  { const pull=clamp(f.T*1.1+(f.run?.15:0),0,1);   // 浮標被拖進水裡、朝釣竿方向傾斜
    { const rt=rod.tipW, k=Math.min(.35,1.2/Math.max(2,f.d)); bob.position.set(tv.x+(rt.x-tv.x)*k,-.03-.28*pull+Math.sin(G.t*9)*.012*(f.run?1:.4),tv.z+(rt.z-tv.z)*k); }   // 浮標滑在線上、在魚前方靠釣竿這側
    bob.rotation.set(-.6*pull,0,Math.sin(G.t*7)*.25*(1-pull*.6)); bob.visible=!(f.jumpT>0)&&!G.bottom; }
  { const load=clamp(.25+.35*Math.min(1,fd.w/3),.25,.6), jit=(f.run||shake)?Math.sin(G.t*38)*.05*(.5+f.T):0;   // 掛上魚就有弧度，張力再加深，衝刺甩頭時竿尖抖動
    rod.end=G.endV.copy(tv); rod.pitchT=.18+.08*f.T; rod.bendT=clamp(load+.85*f.T+(f.run?.12:0)+jit,0,1.25);
    // 竿子跟著魚：魚往哪邊衝，竿身就被往那邊拖過去；衝刺時再往下壓
    rod.side=clamp((rod.side||0)+((G.rodSide||0)*.5+clamp(f.theta*.7,-.4,.4)-(rod.side||0))*Math.min(1,dt*3),-.6,.6); /* 竿子跟著魚擺，但不會甩出畫面 */ rod.pitchT-=(f.run?.06:0)+.05*f.T; }
  G.yawT=clamp(az-G.head,-.95,.95);
  // HUD
  ui.tFill.style.width=(f.T*100).toFixed(1)+'%'; ui.tFill.style.background=f.T<.65?'var(--good)':f.T<.9?'var(--warn)':'var(--bad)';
  ui.tBar.classList.toggle('danger',f.T>.9); ui.fTens.textContent=Math.round(f.T*100)+'%';
  ui.sFill.style.width=f.stam.toFixed(1)+'%'; ui.fStam.textContent=Math.round(f.stam)+'%';
  ui.fDist.textContent=f.d.toFixed(1)+' m'; ui.fName.textContent=(fd.boss?'👑 '+fd.boss.name+'　':'')+stars(fd)+' '+sizeWord(fd.w)+(dive?'，往深處鑽':shake?'，甩頭中':f.run?'，正在衝刺':'')+WL.chaseTxt();
  if(f.latDir!==0){ ui.steer.classList.remove('hidden'); ui.steer.textContent=f.latDir>0?'◀ 往左拉竿':'往右拉竿 ▶'; ui.steer.classList.toggle('ok',good>.4); }
  else ui.steer.classList.add('hidden');
  if(f.slk>.3&&!f.slkW){ f.slkW=1; vib([40,40,40]); } if(f.slk<.1) f.slkW=0; ui.tBar.classList.toggle('slack',f.slk>.3);
  setAct(G.held?'收線中':'按住<br>收線', f.cover>.55?'🪨 線在磨！往反方向拉竿，把魚帶離障礙物':f.slk>.3?'⚠️ 線太鬆了，快按住收線！':f.run&&G.held&&f.T>.8?'魚在衝刺，先放手！':!f.run&&!G.held?'魚停了，快按住收線':'魚往哪游，就往反方向滑動拉竿', false);
  if(WL.stolen()) return lose('gator');
  if(SEA.stolen()) return lose('shark');
  if(f.brk>=1){ if(window.__ECO&&window.__ECO.useLeader()){ f.brk=.35; toast('⛓️ 鋼絲前導線撐住了！','good',1600); vib(60); } else return lose('snap'); }
  if(f.abr>=1){ if(window.__ECO&&window.__ECO.useLeader()){ f.abr=.4; f.cover=.2; toast('⛓️ 鋼絲前導線擋住了磨擦！','good',1600); vib(60); } else return lose('rub'); }
  if(f.slk>=1) return lose('slack');
  if(f.lostWhy) return lose(f.lostWhy);
  if(f.d>maxLine()*.7) f.stam=Math.max(0,f.stam-dt*(f.d/maxLine())*8);   /* 線快放光時捲線器剩下的線越少、阻力越大，魚衝不動、體力掉得快 */
  if(f.d>maxLine()) return lose('spool');
  if(f.d<(G.spot===0?4.0:2.6)){
    // 魚還有力氣就拉不上來：靠近時再衝出去，要遛到沒力才能收進來
    // 衝出去會消耗魚的體力，最多衝兩次；體力低於 45% 或衝過兩次就拉得上來
    f.surges=f.surges||0; if(f.stam<=45||f.surges>=2){
      const big=!fd.item&&(fd.w>3||(fd.u>.9&&fd.w>1.5)||fd.boss); /* 3 公斤以上（或接近該魚種最大且超過 1.5 公斤）才需要抄網 */ if(!big) return land();
      // 大魚要抄網：魚靠近又沒在衝刺時按「抄網」才算起魚；急著在牠衝刺時抄網會讓牠再衝出去
      if(!f.netOn){ f.netOn=true; ui.netBtn.classList.remove('hidden'); toast('🥅 大魚靠近了！按鈕變亮時按「抄網」','good',2200); }
      // 按鈕即時顯示能不能抄：魚在衝＝灰色等待；魚停下＝亮起並震一下。魚剛開始衝的 0.4 秒內按下仍算成功
      if(f.run){ f.calmT=0; f.runT=(f.runT||0)+dt; ui.netBtn.textContent='⏳ 魚在衝，等一下'; ui.netBtn.style.background='rgba(255,255,255,.22)'; ui.netBtn.style.color='#fff'; }
      else { if(!(f.calmT>0)) vib(25); f.calmT=(f.calmT||0)+dt; f.runT=0; ui.netBtn.textContent='🥅 現在抄網！'; ui.netBtn.style.background='#7dff9a'; ui.netBtn.style.color='#0b3a14'; }
      if(f.netGo){ f.netGo=false; if(!f.run||f.runT<.4){ ui.netBtn.classList.add('hidden'); f.netted=true; return land(); } f.netOn=false; ui.netBtn.classList.add('hidden'); f.d+=3+Math.random()*2; f.stam=Math.max(0,f.stam-10); toast('魚還在衝，被網子嚇到又衝出去了！','warn',1600); vib([30,30,60]); }
      return; }
    f.surges++; f.stam=Math.max(0,f.stam-25); f.d+=2+Math.random()*2; f.run=true; f.phaseT=rand(1,1.8); P.splash(G.to.x,0,G.to.z,14,.8); vib([30,20,40]);
    if(!f.surgeTip){ f.surgeTip=1; toast('魚還有力氣，又衝出去了','warn',1500); } }
}

function update(dt){
  // 拉魚開始時記住拋竿瞄準的方向；離開拉魚（釣到、跑掉、斷線）就轉回去。放在最前面，不受後面任何錯誤影響
  // 離開拉魚：釣竿傾斜一律歸零，不受手指狀態影響
  if(G.prevSt==='fight'&&G.state!=='fight'){ G.yawT=G.aimYaw||0; G.rodSideT=0; }
  if(G.state==='fight'&&G.prevSt!=='fight') G.aimYaw=G.aimYawCast!=null?G.aimYawCast:G.yawT; G.prevSt=G.state;
  G.t+=dt; G.hour+=dt/(G.state==='tide'?240:40);   // 在泥灘上時間放慢 6 倍，退潮有足夠的時間慢慢找、慢慢挖
  G.hSave=(G.hSave||0)+dt; if(G.hSave>10){ G.hSave=0; save.hour=((G.hour%24)+24)%24; persist(); }
  const info=W.setTime(G.hour); W.update(dt,G.t); updateKayak(dt);
  if(keys.ArrowLeft||keys.ArrowRight){ const k=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0); if(G.state==='fight') G.rodSideT=k; else if(G.state==='idle'||G.state==='charge'||G.state==='wait'||G.state==='bite'||G.state==='lure') G.yawT=clamp(G.yawT-k*dt*1.2,-.95,.95); }
  G.rodSide+=(G.rodSideT-G.rodSide)*Math.min(1,dt*8); rod.side=G.rodSide;
  if(G.state!=='fight'){ rod.end=null; rod.bendT=.03; } bob.visible=!G.snapped&&!((G.drillK||0)>.5)&&!(G.bottom&&(G.state==='wait'||G.state==='bite'||G.state==='fight'))&&!(G.state==='fight'&&G.f&&G.f.jumpT>0); bob.rotation.set(0,0,0);
  let lineEnd=null, slack=.35, lineOn=!G.snapped, trem=0;
  const st=G.state;
  if(st==='intro'||st==='idle'||st==='charge'){
    rod.pitchT=st==='charge'?.15+.5*G.power:Math.sin(G.t*.8)*.01;
    if(st==='charge'){ G.chargeT+=dt; G.power=(1-Math.cos(G.chargeT*2.4))/2; setPower(G.power); setAct('放開<br>拋竿','力道條滿格時放開最遠',false); }
    else if(st==='idle'){ if(G.loc==='ice'){ if(!ICE.drilled()){ if(G.held) ICE.drill(dt); setAct(G.held?'鑿冰中 '+Math.round(ICE.progress()*100)+'%':'按住<br>鑿冰洞','冰釣：先在前方鑿開冰洞',false); } else setAct('點擊<br>放線','把浮標從冰洞放下去',false); } else setAct('按住<br>蓄力','左右拖曳畫面可以轉向瞄準',false); }
  }
  P.updateRod(dt);
  { const near=st==='idle'||st==='intro'||st==='charge'||(st==='cast'&&G.delay>0)||st==='retrieve'; const ts=near?1:2; bob.scale.setScalar(bob.scale.x+(ts-bob.scale.x)*Math.min(1,dt*(near?6:2.5))); }   // 浮標在手邊是真實大小，拋到遠處才放大方便看魚訊
  if(st==='idle'&&rod.guidesW&&rod.guidesW.length>3){ /* 沒拋竿時：像真的釣客把鉤子扣在竿上的掛鉤環，浮標貼著竿身中段，不在眼前晃 */
    G.idleF=Math.min(1,(G.idleF||0)+dt*1.5); hangPos(tv2b); bob.position.copy(tv2b).lerp(tv3b.copy(rod.guidesW[2]).add(tv4b.set(0,-.05,0)),sstep(0,1,G.idleF)); lineEnd=bob.position; slack=.02; }
  else if(st==='intro'||st==='idle'||st==='charge'){ G.idleF=0; hangPos(bob.position); lineEnd=bob.position; slack=.05; }
  else if(st==='cast'){
    if(G.delay>0){ G.delay-=dt; hangPos(bob.position); if(G.delay<=0) G.from.copy(bob.position); }
    else { G.castT+=dt; const s=Math.min(1,G.castT/G.castDur);
      bob.position.set(lerp(G.from.x,G.to.x,s),lerp(G.from.y,0,s)+4*G.apex*s*(1-s),lerp(G.from.z,G.to.z,s));
      if(G.castT>.25) rod.pitchT=.05; if(s>=1) landBobber(); }
    lineEnd=bob.position; slack=.1; setAct('・・・','',false);
  }
  else if(st==='lure'){
      const ev=LURE.update(dt,G.held); bob.position.copy(LURE.pos()); lineEnd=bob.position; slack=.08; if(G.held){ rod.spin-=dt*14; if(Math.random()<dt*10) Snd.click(); }
      setAct(G.held?'收線中':'按住收線<br>點擊抽竿',LURE.interest()>.25?'魚在追！照這個節奏繼續':'按住收線、短按抽竿，找出魚喜歡的節奏',false);
      if(ev==='strike'){ G.to.set(bob.position.x,0,bob.position.z); G.castDist=Math.hypot(G.to.x-G.base.x,G.to.z-G.base.z); { const ch=LURE.chaser(); if(ch){ ch.group.position.set(G.to.x,-.05,G.to.z); } } LURE.end(); if(!G.fd) prepFish(); P.splash(G.to.x,0,G.to.z,40,1.3); W.addRipple(G.to.x,G.to.z,.9); Snd.splash&&Snd.splash(1.2); vib([40,30,80]); bite(); toast('咬了！','good',900); }
      else if(ev==='lost'){ G.fd=null; toast('魚失去興趣游走了','warn',1400); }
      else if(ev==='done'){ LURE.end(); startRetrieve('路亞收回來了，這次沒有魚咬','warn'); LURE.bobberVis(true); }
    }
  else if(st==='wait'||st==='bite'){
    rod.pitchT=.05;
    const y=W.swell(G.to.x,G.to.z,G.t)-.005;
    if(st==='wait'){
      G.timer-=dt; if(G.dip>0) G.dip-=dt;
      if(G.noBait) G.timer=99;
if(G.timer<=0){ if(G.nib>0){ G.nib--; nibble(); G.timer=rand(.7,2.2); } else bite(); }
      if(G.state==='wait'&&G.nib===0&&G.timer<3&&!G.fd){ prepFish(); if(!G.fd.item&&(save.uw!==false||G.fd.sp.special==='mermaid')) enterUW(); }
      if(UW.active()&&G.state==='wait') UW.setProgress(1-G.timer/3);
      if(G.fd&&G.state==='wait'){ G.bubT=(G.bubT||0)-dt; if(G.bubT<=0){ G.bubT=rand(.25,.7); W.addRipple(G.to.x+rand(-.3,.3),G.to.z+rand(-.3,.3),.05); P.splash(G.to.x+rand(-.25,.25),0,G.to.z+rand(-.25,.25),1,.15); } }
      { const wv=WL.wind(); G.to.x+=wv.x*wv.s*.05*dt; G.to.z+=wv.z*wv.s*.05*dt; }
      const dip=G.dip>0?Math.sin((G.dip/(G.dipMax||.28))*Math.PI)*(G.dipAmp||.035):0;
      bob.position.set(G.to.x,y-dip,G.to.z);
      if(G.nib===0&&G.timer<3) G.approach=Math.min(1,G.approach+dt*.5);
      if(G.approach>0){ const a=G.t*.8; P.shadow.position.set(G.to.x+Math.cos(a)*.9,.012,G.to.z+Math.sin(a)*.9); P.shadow.rotation.y=-a; P.shadow.scale.setScalar(.45); P.shadow.material.opacity=.18*G.approach; }
      if(G.stealT>0){ G.stealT-=dt; const tap=Math.max(0,Math.sin(G.stealT*22))*.03; bob.position.y-=tap; if(Math.random()<dt*5) W.addRipple(G.to.x,G.to.z,.12); }   // 小魚一口一口啄餌：浮標快速點水
      if(G.noBait&&!(G.stealT>0)&&!G.bottom) bob.position.y+=.025*bob.scale.x;   // 餌沒了：浮標少了重量，浮得比較高
      if(G.inspDip>0){ G.inspDip-=dt; bob.position.y-=Math.sin(G.inspDip*18)*.02; bob.rotation.z=Math.sin(G.inspDip*14)*.25; }
      setAct('收線',G.snag?'掛底了！左右來回拖曳畫面試著解開（硬收會斷線）':UW.active()?'魚正在靠近餌……':G.bottom?'看竿尖：被拉彎時立刻點擊！':'浮標被拉進水裡時，立刻點擊！',false);
      if(G.bottom){ bob.position.y=-1.2; rod.bendT=.1+(G.dip>0?.22*Math.sin((G.dip/(G.dipMax||.28))*Math.PI):0)+Math.sin(G.t*1.3)*.012;   // 竿尖：試咬時輕抖、平常隨水流微微晃
        const zid=WL.zoneId?WL.zoneId():''; const snagK=(zid==='reef'?1:.8)*({休閒:.4,標準:1,硬派:1.3,專家:1.6}[D().n]||1); if(!G.snag&&!G.fd&&!G.snagOnce&&(zid==='wood'||zid==='reef')&&Math.random()<dt*.012*snagK){ G.snagOnce=true; G.snag=true; G.timer=99; G.snagYaw=G.yawT; vib([40,40]); toast('🪨 掛底了！左右來回拖曳畫面試著解開','warn',2400); }
        if(G.snag){ const dy=G.yawT-G.snagYaw; if(Math.abs(dy)>.12){ const sg=Math.sign(dy); if(sg!==G.snagLast){ G.snagFlip++; G.snagLast=sg; } G.snagYaw=G.yawT; }
          rod.bendT=.42+Math.sin(G.t*20)*.03+(Math.random()<dt*2?.12:0);
          G.snRip=(G.snRip||0)-dt; if(G.snRip<=0&&G.entry){ G.snRip=rand(.35,.8); W.addRipple(G.entry.x,G.entry.z,.12); P.splash(G.entry.x,0,G.entry.z,2,.08); }   // 卡住的線在入水點不斷冒小泡、小漣漪
          if(G.snagFlip>=3&&G.entry){ P.splash(G.entry.x,0,G.entry.z,14,.45); W.addRipple(G.entry.x,G.entry.z,.6); rod.bendT=0; }   // 解開：線一鬆、竿子彈回、入水點噴出一團水花
          if(G.snagFlip>=3){ G.snag=false; G.snagFlip=0; G.timer=rand(3,8); toast('解開了！','good',1200); vib(20); } } }
    } else {
      G.biteT+=dt; bob.position.set(G.to.x+Math.sin(G.biteT*3)*.15,G.bottom?-1.2:y-.13-.04*Math.sin(G.biteT*12),G.to.z+G.biteT*.2); if(G.bottom){ rod.bendT=.55+.08*Math.sin(G.biteT*14); rod.pitchT=-.02; }
      P.shadow.material.opacity=0;
      setAct('起鉤','藍色區按下＝完美，黃色區＝上鉤',true);
      if(FUN.hookExpired()){ FUN.pop('錯過','miss'); missBite(); }
    }
    lineEnd=bob.position; slack=.35;
    if(G.bottom){ const pull=st==='bite'?Math.min(1,G.biteT*1.5):0, tw=G.dip>0?.15:0;
      G.entry=G.entry||new THREE.Vector3(); G.entry.set(G.to.x*.82+G.base.x*.18+Math.sin(G.t*.4)*.12+pull*.6, W.swell(G.to.x,G.to.z,G.t), G.to.z*.82+G.base.z*.18+pull*.4);
      lineEnd=G.entry; slack=G.snag?.0:.22-.18*pull-tw;   // 魚咬時線被拉直；掛底時線完全繃直
      G.entT=(G.entT||0)-dt; if(G.entT<=0){ G.entT=pull>0?.25:rand(1.2,2.4); W.addRipple(G.entry.x,G.entry.z,pull>0?.22:.08); } }
  }
  else if(st==='fight'){ updateFight(dt); if(G.state==='fight'){ const f=G.f; lineEnd=rod.end; slack=clamp(.1*(1-f.T*1.4),0,.1);   // 魚掛在線上：線幾乎繃直
      trem=(.012+.05*f.T)*(f.run?1.6:1); } }
  else if(st==='retrieve'){
    G.stT+=dt; const s=Math.min(1,G.stT/.9), e=sstep(0,1,s); hangPos(tv);
    bob.position.set(lerp(G.from.x,tv.x,e),s<.7?W.swell(bob.position.x,bob.position.z,G.t):lerp(0,tv.y,(s-.7)/.3),lerp(G.from.z,tv.z,e));
    rod.spin-=dt*20; if(Math.random()<dt*14) Snd.click(); lineEnd=bob.position; slack=.15; setAct('收線中','',false);
    if(s>=1) G.state='idle';
  }
  else if(st==='lost'){ G.stT+=dt; lineOn=false; setAct('・・・','',false); if(G.stT>1.3){ G.snapped=false; G.state='idle'; } }
  else if(st==='land'||st==='catch'||st==='post'){
    const g=G.fish.group, D=dispDist(); rod.pitchT=.45; bob.visible=false; lineOn=st!=='post';
    W.head.updateMatrixWorld(true);
    if(st==='land'&&G.netting){
      // 抄網起魚：①網子伸到魚旁、探進水裡 ②魚被兜進網袋 ③整網提出水面（網袋被拉垂、滴水）④拉到眼前，魚在網裡掙扎
      G.stT+=dt; const t=G.stT, L=G.fd.L, n=NET.g, hoopR=Math.max(.55,L*.6);
      // 抄網時低頭看水面（魚就在船邊），提起來後再抬頭
      n.visible=true; n.scale.setScalar(hoopR/.5); W.head.getWorldQuaternion(tq); const yaw=new THREE.Euler().setFromQuaternion(tq,'YXZ').y;
      const fishAt=G.landFrom, start=W.head.localToWorld(tv2.set(.7,-.35,-1.6)), lift=W.head.localToWorld(new THREE.Vector3(.15,-.05,-Math.max(1.6,L*2.2)));
      const p1=Math.min(1,t/.7), p2=sstep(.7,1.15,t), p3=sstep(1.25,2.2,t);
      if(!G.netAt){ const dx=fishAt.x-G.base.x, dz=fishAt.z-G.base.z, dd=Math.max(.01,Math.hypot(dx,dz)), r=Math.max(4.2,dd); G.netAt=new THREE.Vector3(G.base.x+dx/dd*r,0,G.base.z+dz/dd*r); G.fish.group.position.set(G.netAt.x,-.15,G.netAt.z); }
      const pos=new THREE.Vector3().copy(start).lerp(new THREE.Vector3(G.netAt.x,.08,G.netAt.z),sstep(0,1,p1)); pos.y-=.2*p2*(1-p3); pos.lerp(lift,p3);   /* 網框貼著水面探過去，兜魚時半沉入水 */
      n.position.copy(pos); n.rotation.set(0,yaw-Math.PI/4,0,'YXZ'); n.rotateZ(-.25-(1-p3)*.2);   /* 手把朝向右下的自己，網框微微朝鏡頭傾斜看得到網袋 */
      NET.shape(p2*(1-.4*p3)+.15,t*6);
      const g=G.fish.group; if(t>.7){ const inBag=new THREE.Vector3(0,-.25*hoopR/.5,0).applyQuaternion(n.quaternion).add(n.position); g.position.lerp(inBag,Math.min(1,dt*10)); te.set(0,yaw+Math.PI/2,0,'YXZ'); g.quaternion.slerp(tq.setFromEuler(te).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),.5)),Math.min(1,dt*6)); }
      if(t>.7&&!G.netSplash){ G.netSplash=true; P.splash(G.netAt.x,0,G.netAt.z,50,1.4); W.addRipple(G.netAt.x,G.netAt.z,1.2); Snd.splash(1.2); vib([40,30,60]); }
      if(p3>0&&p3<1&&Math.random()<dt*30) P.splash(n.position.x+rand(-.3,.3),n.position.y-.35*hoopR,n.position.z+rand(-.3,.3),1,.14);   // 網袋一路滴水
      G.fish.uni.uAmp.value=.08+.25*Math.max(0,Math.sin(t*7)); G.fish.uni.uSwim.value+=dt*14;
      rod.pitchT=.3; rod.bendT=.35;
      if(t>=2.5){ G.netting=false; G.netSplash=false; G.netAt=null; n.visible=false; W.head.attach(g); g.position.set(0,.14*D,-D); g.rotation.set(0,0,0); G.state='catch'; G.stT=0; showCard(); }
    }
    else if(st==='land'){
      // 起魚三段：①竿子高舉，魚被線吊出水面、頭朝上掛在竿尖下甩動掙扎、身上滴水 ②把吊著的魚拉到眼前晃著 ③轉成展示角度
      G.stT+=dt; const T1=1.1, T2=2.3, T3=2.75, t=G.stT, L=G.fd.L;
      rod.pitchT=t<T1?.38:t<T2?.3:.45; rod.bendT=t<T2?.55+.12*Math.sin(t*9):.3;
      const tip=rod.tipW, hangLen=.55+L*.2;
      if(!G.swing) G.swing={a:0,v:1.6};
      G.swing.v+=(-9.8/Math.max(.4,hangLen)*Math.sin(G.swing.a))*dt+(Math.random()-.5)*dt*6*(t<T2?1:.3); G.swing.v*=Math.exp(-dt*.8); G.swing.a+=G.swing.v*dt;   // 擺盪＋魚掙扎
      W.head.getWorldQuaternion(tq); const yaw=new THREE.Euler().setFromQuaternion(tq,'YXZ').y;
      if(t<T2){ const hl=.55+L*.2; let hang=tv.copy(tip); if(t>=T1){ const DD=Math.max(D*1.15,L*1.7+.5); W.head.localToWorld(tv2.set(.06,.3*DD+.12+L*.35,-DD)); hang.lerp(tv2,sstep(T1,T2,t)); }   // 大魚吊得遠一點、高一點，不會穿過鏡頭和手
        const sx=Math.sin(G.swing.a)*hl, mouth=tv2.set(hang.x+Math.cos(yaw)*sx,hang.y-hl*Math.cos(G.swing.a),hang.z-Math.sin(yaw)*sx);
        if(t<T1){ const e=sstep(0,T1,t), from=new THREE.Vector3().copy(G.landFrom); mouth.copy(from.lerp(mouth,e)); mouth.y+=Math.sin(Math.PI*e)*.35; }   // 從水裡被拉起、劃一道弧線到竿尖下
        te.set(0,yaw+Math.sin(t*1.7)*.35,0,'YXZ'); g.quaternion.setFromEuler(te); /* 魚身側面朝向鏡頭，隨吊線慢慢轉 */ g.rotateZ(Math.PI/2+G.swing.a*.6); g.updateMatrixWorld(true);
        const off=new THREE.Vector3(.5,0,0).applyQuaternion(g.quaternion).multiplyScalar(L); g.position.copy(mouth).sub(off);
        // 吊著的魚：不是一直細碎抖動，而是一陣一陣用力彎成 C 字甩動，甩完短暫垂著喘氣
        G.hf=(G.hf||0)-dt; if(G.hf<=0){ G.hf=rand(.7,1.5); G.hfT=.5; } const fl=G.hfT>0?(G.hfT-=dt,Math.sin((.5-G.hfT)/.5*Math.PI)):0;
        G.fish.uni.uAmp.value=.05+.42*fl; G.fish.uni.uSwim.value+=dt*(3+fl*16); G.swing.v+=fl*dt*(Math.random()<.5?-6:6);
        if(t<T1&&g.position.y>-.1&&!G.liftSplash){ G.liftSplash=true; P.splash(g.position.x,0,g.position.z,46,1.4); W.addRipple(g.position.x,g.position.z,1.1); Snd.splash(1.3); vib([20,30,60]); }
        if(Math.random()<dt*14) P.splash(g.position.x,g.position.y-L*.45,g.position.z,1,.12);   // 身上滴水
      } else { const s=sstep(T2,T3,t); W.head.localToWorld(tv.set(0,.14*D,-D)); g.position.lerp(tv,s); g.quaternion.slerp(tq,s); G.fish.uni.uAmp.value=.1; G.fish.uni.uSwim.value+=dt*12; }
      if(t>=T3){ G.swing=null; G.liftSplash=false; W.head.attach(g); g.position.set(0,.14*D,-D); g.rotation.set(0,0,0); G.state='catch'; G.stT=0; showCard(); }
    } else if(st==='catch'){
      // 拿在手上的魚：不時用力甩尾掙扎（整條魚跟著扭），身上一直滴水，鰓蓋呼吸般微微起伏
      G.stT+=dt; G.thr=(G.thr||0)-dt; if(G.thr<=0){ G.thr=rand(1.6,3.4); G.thrT=.55; vib(12); }
      const th=G.thrT>0?(G.thrT-=dt,Math.sin(G.thrT*28)*Math.min(1,G.thrT*3)):0;
      g.rotation.set(th*.12,Math.sin(G.stT*.6)*.3+th*.25,Math.sin(G.stT*.9)*.05+th*.18);
      G.fish.uni.uAmp.value=.035+.03*Math.max(0,Math.sin(G.stT*2.1))+Math.abs(th)*.14; G.fish.uni.uSwim.value+=dt*(7+Math.abs(th)*30);
      G.drip=(G.drip||0)-dt; if(G.drip<=0){ G.drip=rand(.08,.25); g.updateMatrixWorld(true); const dp=g.localToWorld(new THREE.Vector3(rand(-.4,.4),-.12,0)); P.splash(dp.x,dp.y,dp.z,1,.08); }
    } else {
      G.stT+=dt; const s=Math.min(1,G.stT/.6);
      if(G.postSell){ g.scale.setScalar(G.fd.L*(1-s)); }
      else { g.position.y=G.from.y-9.8*.5*G.stT*G.stT; if(g.position.y<0&&!G.splashed){ G.splashed=true; P.splash(g.position.x,0,g.position.z,30,1); W.addRipple(g.position.x,g.position.z,.8); Snd.splash(.8); } }
      if(s>=1&&(G.postSell||g.position.y<-1)){ g.visible=false; g.scale.setScalar(1); G.splashed=false; G.state='idle'; }
    }
    // 魚線一直綁在魚嘴上：起魚飛上來的過程中，線跟著魚走，不會先跑到手邊等魚
    if(lineOn){ g.updateMatrixWorld(true); g.localToWorld(tv.set(.5,.02,0)); lineEnd=tv; slack=st==='land'?.02:.05; }
  }
  if((G.drillK||0)>.5) lineOn=false;
  P.setLine(lineEnd||rod.tipW, slack, lineOn&&!!lineEnd, info.light, trem);
  if(st!=='fight'&&st!=='wait'&&st!=='lure') { if(st!=='bite') P.shadow.material.opacity=Math.max(0,P.shadow.material.opacity-dt); }
  const showing=st==='land'||st==='catch';
  P.updateFx(dt,info.light); UW.update(dt); WL.update(dt,G.t); AT.update(dt,G.t); FUN.update(dt); SEA.update(dt,G.t); KK.update(dt,G.t); MDL.update(dt); SCH.update(dt,G.t);
  { const z=WL.zoneId?WL.zoneId():'dock'; if(z!==G.wzone&&G.loc!=='sea'){ G.wzone=z; const T2={dock:[[.010,.019,.011],[.018,.045,.026]],lily:[[.010,.026,.010],[.028,.07,.028]],wood:[[.020,.019,.009],[.05,.044,.02]],deep:[[.006,.015,.017],[.012,.034,.04]],moon:[[.007,.017,.02],[.016,.04,.05]]}[z]; if(T2&&W.setWaterTint) W.setWaterTint(T2[0],T2[1]); } if(W.tintTick) W.tintTick(dt); } try{ fightFx(dt); }catch(e){} try{ updDistMark(); }catch(e){} try{ ambUpdate(dt); }catch(e){ console.warn('amb',e); } try{ updMag(); }catch(e){} if(G.spook>0){ const was=G.spook; G.spook=Math.max(0,G.spook-dt*.03);
    // 警戒退下來時，嚇跑的魚群從外側游回剛才的落水點附近
    if(was>=.15&&G.spook<.15&&G.spookAt&&(G.loc==='lake'||G.loc==='sea')){ if(SCH.comeBack(G.spookAt.x,G.spookAt.z)) toast('🐟 剛才嚇跑的魚慢慢游回來了，可以再試試','good',2200); G.spookAt=null; } } if(!save.lookTip&&W.info.day<.15&&G.state==='idle'&&G.t>20){ save.lookTip=1; persist(); toast('🌌 上下拖曳畫面可以抬頭看星空','good',3500); }
  if(G.cinePan) G.yawT=Math.sin(performance.now()*.00011)*.55;   // 開場過場：鏡頭緩慢左右擺動
  window.__MOON.update(dt); if(window.__TAL) window.__TAL.tick(G); if(window.__STORY) window.__STORY.tick(dt); { const dr=G.loc==='ice'&&G.held&&G.state==='idle'&&ICE.drilling&&ICE.drilling(); G.drillK=(G.drillK||0)+((dr?1:0)-(G.drillK||0))*Math.min(1,dt*8); if(G.drillK>.01){ stowRod(Math.max(WL.padOn(),G.drillK)); G.pitchT=Math.min(G.pitchT||0,-.4*G.drillK); }
    ARMS.update(!UW.active()&&G.state!=='ending',G.state,G.power,dt,G.drillK>.01?{k:G.drillK,grip:(sd,o)=>ICE.grip(sd,o)}:{k:WL.padOn(),grip:WL.padGrip}); } SKY.update(dt,((G.hour%24)+24)%24); MIST.update(dt); ICE.update(dt);
  { const z=WL.zoneId?WL.zoneId():'', tgt=G.loc==='ice'?[.03,.08,.12]:G.loc==='sea'?(z==='reef'?[.02,.2,.25]:[.01,.08,.2]):[.04,.13,.15], v=SEE_U.value, k=Math.min(1,dt*1.5);   // 水下物體混入的水色依地點
    v.set(v.x+(tgt[0]-v.x)*k,v.y+(tgt[1]-v.y)*k,v.z+(tgt[2]-v.z)*k); }
  { const zr=WL.zoneId&&WL.zoneId()==='reef'?1:0, k=Math.min(1,dt*.8); W.U.uReef.value+=(zr-W.U.uReef.value)*k;
    const sc=W.U.uSeaCol.value; if(zr) sc.lerp(tvSea.set(.02,.30,.40),k); else sc.lerp(tvSea.set(.012,.12,.30),k); }
  if(G.look){ if(G.t>G.look.until){ G.yawT=clamp(G.look.prev,-.95,.95); G.look=null; }
    else { let a=Math.atan2(-(G.look.x-G.base.x),-(G.look.z-G.base.z))-G.head; while(a-G.yaw>Math.PI) a-=Math.PI*2; while(a-G.yaw<-Math.PI) a+=Math.PI*2; G.yawT=a; if(G.look.snap){ G.yaw=a; G.look.snap=false; } } }
  G.yaw+=(G.yawT-G.yaw)*Math.min(1,dt*(G.look?9:st==='fight'?2.5:6)); W.player.rotation.y=G.head+G.yaw;
  if(G.state!=='idle'&&G.state!=='wait') G.pitchT=0; if(G.look) G.pitchT=G.look.pitch; if(G.netting&&G.state==='land') G.pitchT=(G.stT||0)<1.3?-.12:0;   /* 抄網時低頭看船邊的魚 */ G.pitch=(G.pitch||0)+((G.pitchT||0)-(G.pitch||0))*Math.min(1,dt*5);   // 蓄力、拉魚時視角自動回正
  if(G.scareT>0) G.scareT-=dt; if(G.gShake>0) G.gShake=Math.max(0,G.gShake-dt*.7);
  { const f=G.state==='fight'?G.f:null, want=(f?((f.run?.45:0)+(f.ev&&f.ev.k==='shake'?.6:0)+(f.T>.85?.35:0)):0)+(G.gShake||0); G.shk=(G.shk||0)+(want-(G.shk||0))*Math.min(1,dt*6);
    W.head.rotation.x=-.16+(G.pitch||0)+Math.sin(G.t*.5)*.004+Math.sin(G.t*29)*.005*G.shk; W.camera.rotation.z=Math.sin(G.t*.37)*.003+Math.sin(G.t*23+1.7)*.004*G.shk; }
  showLightSet(showing);
  const hh=((G.hour%24)+24)%24, cl=String(Math.floor(hh)).padStart(2,'0')+':'+String(Math.floor((hh%1)*60)).padStart(2,'0');
  if(ui.clock.textContent!==cl) ui.clock.textContent=cl;
}
let showL=null; W.head.children.forEach(c=>{ if(c.isPointLight) showL=c; });
function showLightSet(on){ if(showL) showL.intensity+=((on?1.4:0)-showL.intensity)*.1; }

/* ---------- 主迴圈與自動畫質 ---------- */
function onResize(){ W.resize(window.innerWidth,window.innerHeight); UW.resize(window.innerWidth,window.innerHeight); }
window.addEventListener('resize',onResize); onResize();
if(typeof save.hour==='number'&&isFinite(save.hour)) G.hour=save.hour;
W.setTime(G.hour,true);
let last=performance.now(), prAcc=0, prN=0, prChecks=0;
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000)); last=now;
  try{ window.__UWON=UW.active(); update(dt); merPresent(dt); if(MERTEST&&G.state==='fight'){ if(G.f){ G.f.brk=0; G.f.slk=0; G.f.abr=0; G.f.d=Math.min(G.f.d,20); G.f.lostWhy=null; } G.mtT=(G.mtT||0)+dt;   /* 測試：線不會斷、不會鬆脫、不會被拉光 */ if(G.mtT>3){ G.mtT=0; try{ land(); }catch(e){} } } else G.mtT=0;   /* 測試：拉 3 秒自動上岸 */ if(END.on()){ END.tick(dt); bob.visible=false; P.setLine(rod.tipW,0,false,0,0); } END.frame(dt); AFTER.update(dt); guardUW(); MDL.glowTick(); if(!HOME3D.active()&&!END.on()) GHOST.update(dt); if(TIDE.active()) TIDE.render(dt); else if(HOME3D.active()) HOME3D.render(dt); else if(UW.active()) UW.render(); else { W.render(); LURE.renderPiP(W.renderer,dt); } }catch(e){ console.error(e); }
  prAcc+=dt; prN++;
  if(prAcc>2){ const fps=prN/prAcc, mode=save.gfx||'auto', ready=window.__REALDONE&&document.getElementById('intro').classList.contains('hidden')&&!document.hidden;
    if(ready){ G.gfxWarm=(G.gfxWarm||0)+1; }
    // 載入與剛開始的前 3 個量測區間不算（下載、編譯著色器時本來就會卡），之後連續偏慢才降、連續很順才升
    if(ready&&G.gfxWarm>3&&mode==='auto'){ const pr=W.getPR(), cap=window.__gfxCap();
      if(fps<27){ G.gSlow=(G.gSlow||0)+1; G.gFast=0; } else if(fps>=50){ G.gFast=(G.gFast||0)+1; G.gSlow=0; } else { G.gSlow=0; G.gFast=0; }
      if(G.gSlow>=2&&pr>1.01){ W.setPR(Math.max(1,pr-.25)); G.gSlow=0; }
      else if(G.gSlow>=3&&pr<=1.01&&!G.gReflOff){ G.gReflOff=true; if(W.setRefl) W.setRefl(true,.22); G.gSlow=0; }
      else if(G.gFast>=4&&pr<cap-.01){ W.setPR(Math.min(cap,pr+.25)); G.gFast=0; } }
    else if(ready&&G.gfxWarm===8&&fps<27&&mode==='high'&&!G.gfxHint){ G.gfxHint=true; toast('畫面有點卡，可以到設定把畫質調成「自動」或「中」','warn',3500); }
    window.__FPS=fps; prChecks++; prAcc=0; prN=0; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
}

(function boot(){
  if(!window.THREE){ boot.n=(boot.n||0)+1; { const t=document.getElementById('loadTip'); if(t&&boot.n%20===0) t.textContent='正在下載 3D 引擎…（'+Math.round(boot.n/20)+' 秒）'; } if(boot.n>2400){ showErr('3D 引擎載入失敗。請確認網路連線後重新整理頁面。'); return; } setTimeout(boot,50); return; }
  // 模型、貼圖、音效從 jsDelivr 下載（實測比 GitHub 快約 8 倍）；某個檔案從 CDN 下載失敗，就只對那個檔案改從本站重抓，不影響其他檔案
  try{ const C=window.__CDN, wrap=(proto)=>{ const orig=proto.load; proto.load=function(url,onLoad,onProg,onErr){ const cu=C.url(url); if(cu===url) return orig.call(this,url,onLoad,onProg,onErr);
      const self=this; return orig.call(this,cu,onLoad,onProg,e=>{ console.warn('CDN 失敗，改從本站下載',url); orig.call(self,url,onLoad,onProg,onErr); }); }; };
    wrap(THREE.FileLoader.prototype); wrap(THREE.ImageLoader.prototype);
    // 所有模型都經過 Draco 幾何壓縮（體積約剩 1/4）：每個 GLTF 載入器自動接上同一個 Draco 解壓器
    if(THREE.DRACOLoader&&THREE.GLTFLoader){ const dl=new THREE.DRACOLoader(); dl.setDecoderPath('vendor/draco/'); dl.preload();
      for(const k of ['load','parse']){ const o=THREE.GLTFLoader.prototype[k]; THREE.GLTFLoader.prototype[k]=function(...a){ if(!this.dracoLoader) this.setDRACOLoader(dl); return o.apply(this,a); }; } } if(THREE.ImageBitmapLoader) wrap(THREE.ImageBitmapLoader.prototype); }catch(e){ console.warn('cdn',e); }
  try{
    const W=createWorld({canvas:document.getElementById('c')}); window.__DIAG=createDiag(W,{get G(){ return window.__G||{}; },get save(){ return (window.__G&&window.__G.saveRef)||{}; }}); const P=createProps(W);
    // 主畫面的載入提示：進度條、第一次進入的說明、網路慢時的提醒（避免玩家以為當機）
    const ln=document.getElementById('loadNote'), lbox=document.getElementById('loadBox'), lbar=document.querySelector('#loadBar i'), ltip=document.getElementById('loadTip'), sb=document.getElementById('startBtn');
    const first=!localStorage.getItem('swampAngler.loaded'); let lastP=-1, lastT=performance.now();
    if(ltip) ltip.textContent=first?'第一次進入需要下載真實的湖景、模型與貼圖（約 60MB），視網路速度約 1～3 分鐘。下載完會存在裝置裡，下次幾秒就好。':'正在從裝置讀取場景，請稍候…';
    if(sb&&first){ sb.dataset.t=sb.textContent; sb.textContent='場景下載中，請稍候…'; sb.style.opacity=.7; }
    const slow=setInterval(()=>{ if(lbox&&lbox.classList.contains('done')){ clearInterval(slow); return; } if(performance.now()-lastT>15000&&ltip) ltip.textContent='網路比較慢，仍在下載中，請不要關閉畫面…（也可以先按「開始釣魚」，畫面會在下載完後自動變成真實場景）\n目前：'+(window.__LASTURL||'')+'（'+(window.__LOADN||'')+'）'; },3000);
    try{ window.__REAL=createReal(W,P,(p,done,err)=>{ if(!ln) return; if(p!==lastP){ lastP=p; lastT=performance.now(); }
      if(lbar) lbar.style.width=Math.max(3,Math.round((done?1:p)*100))+'%';
      if(done||Math.round(p*100)>=100){ window.__REALDONE=true; ln.textContent='✅ 真實場景已載入'; if(lbox) lbox.classList.add('done'); try{ localStorage.setItem('swampAngler.loaded','1'); }catch(e){} if(sb&&sb.dataset.t){ sb.textContent=sb.dataset.t; sb.style.opacity=''; } }
      else if(err&&p===0) ln.textContent='部分場景檔案載入失敗，暫用簡化畫面（'+err+'）';
      else ln.textContent='正在載入真實場景… '+Math.round(p*100)+'%'; }); }catch(e){ console.warn(e); }
    startGame(W,P); }
  catch(e){ console.error(e); showErr('這個瀏覽器無法啟動 WebGL 3D 畫面。<br><small>'+String(e&&e.message||e)+'</small>'); }
})();
