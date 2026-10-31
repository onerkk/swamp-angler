/* One animated surface model for mesh displacement, normals, bobbers and boat motion. */
const WATER_WAVES={
 lake:[[4.8,.028,0,.3],[2.7,.016,.72,2.1],[1.45,.009,-.85,4.7],[.8,.004,1.4,1.4],[3.67,.011,-.39,3.6],[1.93,.006,.28,5.9],[.56,.002,-1.9,.9],[.35,.001,2.4,4.1]],
 sea:[[38,.26,0,1.7],[23,.17,.69,4.1],[15,.11,-.69,.6],[9,.065,1.22,2.8],[5.5,.036,.35,5.3],[3.2,.018,-1.05,3.7],[11.7,.038,-.23,4.6],[7.6,.024,.92,.2],[2.3,.009,-.35,2.3],[1.2,.004,.47,5.7],[.7,.0014,-1.8,1.1],[4.2,.028,1.9,2.4],[1.7,.010,-.65,3.2],[.9,.004,2.3,5.6]]
};
function sampleWater(x,z,t,wind,sea){
  const len=Math.hypot(wind.x,wind.y),wx=len>.001?wind.x/len:1,wz=len>.001?wind.y/len:0;
  const strength=sea?.55+1.3*wind.z+1.5*Math.max(0,wind.z-.6):.45+1.8*wind.z;
  let height=0,dx=0,dz=0;
  for(const [L,A,angle,offset] of WATER_WAVES[sea?'sea':'lake']){
    const cs=Math.cos(angle),sn=Math.sin(angle),ux=wx*cs-wz*sn,uz=wx*sn+wz*cs,k=2*Math.PI/L;
    const phase=k*(ux*x+uz*z)-Math.sqrt(9.81*k)*t+offset,a=A*strength;
    height+=a*Math.sin(phase);dx+=ux*k*a*Math.cos(phase);dz+=uz*k*a*Math.cos(phase);
  }
  return {height,dx,dz};
}
function waterWaveGLSL(){
  const n=v=>Number(v).toFixed(9);
  const lines=sea=>WATER_WAVES[sea?'sea':'lake'].map(([L,A,angle,offset])=>`waterTerm(p,clock,vec2(wd.x*${n(Math.cos(angle))}-wd.y*${n(Math.sin(angle))},wd.x*${n(Math.sin(angle))}+wd.y*${n(Math.cos(angle))}),${n(L)},${n(A)}*strength,${n(offset)},s);`).join('\n');
  return `void waterTerm(vec2 p,float clock,vec2 d,float L,float A,float offset,inout vec3 s){float k=6.283185307/L;float phase=k*dot(d,p)-sqrt(9.81*k)*clock+offset;float slope=k*A*cos(phase);s+=vec3(d.x*slope,A*sin(phase),d.y*slope);}
vec3 waterSample(vec2 p,float clock,vec3 wind,float sea){vec2 wd=length(wind.xy)>.001?normalize(wind.xy):vec2(1.0,0.0);vec3 s=vec3(0.0);float strength;
if(sea>.5){strength=.55+1.3*wind.z+1.5*max(0.0,wind.z-.6);${lines(true)}}else{strength=.45+1.8*wind.z;${lines(false)}}return s;}`;
}
function makeWaterGrid(T,radius=150,rings=112,segments=192){
  const points=[0,0,0],indices=[];
  for(let r=1;r<=rings;r++){const distance=radius*Math.pow(r/rings,1.8);for(let i=0;i<segments;i++){const a=2*Math.PI*i/segments;points.push(Math.sin(a)*distance,0,-Math.cos(a)*distance);}}
  for(let i=0;i<segments;i++)indices.push(0,1+(i+1)%segments,1+i);
  for(let r=1;r<rings;r++)for(let i=0;i<segments;i++){const j=(i+1)%segments,a=1+(r-1)*segments+i,b=1+(r-1)*segments+j,c=1+r*segments+i,d=1+r*segments+j;indices.push(a,b,c,b,d,c);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);return g;
}
if(typeof module!=='undefined'&&module.exports)module.exports={WATER_WAVES,sampleWater,waterWaveGLSL,makeWaterGrid};
