/* 遠近細節（LOD）：倒木、樹樁、岸邊岩石原檔一個就有 4～8 萬面，湖區同時有十幾個，主畫面、倒影、陰影各畫一次。
   遠處改用預先簡化的幾何（約 12% 面數，models/lod/），材質、貼圖完全不變，切換時不會重新編譯著色器；近處仍是原檔。
   切換距離依材質等級：高 18 公尺、中 11 公尺、低 7 公尺，並留 15% 緩衝避免在邊界來回閃。
   中、低畫質的近處改用中間版本（約 35% 面數，_lod0），高畫質近處一律原檔。 */
const LOD_MODELS=['dead_tree_trunk_02.glb','tree_stump_01.glb','tree_stump_02.glb','rock_moss_set_01.glb','fern_02.glb','grass_medium_01.glb','nettle_plant.glb'];
function lodFileFor(url,level=1){const name=String(url).split('?')[0].split('/').pop();return LOD_MODELS.includes(name)?'models/lod/'+name.replace(/\.glb$/,'_lod'+level+'.glb'):null;}
function lodDistance(tier){return tier==='high'?18:tier==='mid'?11:7;}
function pairLODMeshes(full,lod,lodOf,fullOf,slot='far'){
 const a=[],b=[],byName=new Map();full.traverse(o=>{if(o.isMesh)a.push(o);});lod.traverse(o=>{if(o.isMesh)b.push(o);});
 for(const m of b){if(!byName.has(m.name))byName.set(m.name,[]);byName.get(m.name).push(m);}
 let paired=0;
 a.forEach((m,i)=>{const list=byName.get(m.name),cand=list&&list.length?list.shift():b[i];if(!cand||!cand.geometry||m.isSkinnedMesh)return;const g=cand.geometry;
  // 屬性必須一致（例如都有 uv），否則同一個材質程式讀不到資料
  for(const k of Object.keys(m.geometry.attributes))if(!g.attributes[k])return;
  g.computeBoundingSphere();g.computeBoundingBox();const e=lodOf.get(m.geometry)||{};e[slot]=g;lodOf.set(m.geometry,e);fullOf.set(g,m.geometry);paired++;});
 return paired;
}
function createGeometryLOD(){
 const lodOf=new WeakMap(),fullOf=new WeakMap(),stats={paired:0,near:0,far:0};let list=[],scanT=0,cam=null,pos=null;
 function install(T){
  if(!T||!T.GLTFLoader||T.GLTFLoader.prototype.__geometryLOD)return;const load=T.GLTFLoader.prototype.load;T.GLTFLoader.prototype.__geometryLOD=true;
  T.GLTFLoader.prototype.load=function(url,onLoad,onProgress,onError){
   const lodURL=lodFileFor(url);if(!lodURL||typeof onLoad!=='function')return load.call(this,url,onLoad,onProgress,onError);
   const loader=this;let full=null,lod=null,mid=null,left=3;
   // 簡化檔載入失敗也照常交出原檔，只是沒有遠景簡化
   const done=()=>{if(--left>0)return;try{if(lod)stats.paired+=pairLODMeshes(full.scene,lod.scene,lodOf,fullOf,'far');if(mid)pairLODMeshes(full.scene,mid.scene,lodOf,fullOf,'mid');}catch(e){console.warn('lod pair',e);}onLoad(full);};
   load.call(loader,lodURL,g=>{lod=g;done();},undefined,()=>done());
   load.call(loader,lodFileFor(url,0),g=>{mid=g;done();},undefined,()=>done());
   return load.call(loader,url,g=>{full=g;done();},onProgress,onError);
  };
 }
 function update(scene,camera,dt,tier){
  if(!scene||!camera)return;if(!cam){cam=new camera.position.constructor();pos=new camera.position.constructor();}
  const now=typeof performance!=='undefined'?performance.now()/1000:scanT+dt;if(now>=scanT){scanT=now+2;list=[];scene.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&!o.isInstancedMesh&&lodOf.has(fullOf.get(o.geometry)||o.geometry))list.push(o);});}
  camera.getWorldPosition(cam);const d=lodDistance(tier),near2=d*d,far2=(d*1.15)*(d*1.15);let n=0,f=0;
  // 高畫質：7 公尺內原檔、7～18 公尺中間版、更遠簡化版（一根 8 萬面的枯木在 10 公尺外用 35% 面數已看不出差別）；中低畫質近處就用中間版
  const fullD=tier==='high'?7:0;
  for(const m of list){const full=fullOf.get(m.geometry)||m.geometry,e=lodOf.get(full),lod=e&&e.far;if(!lod)continue;const mid=e.mid||full;
   if(!full.boundingSphere)full.computeBoundingSphere();pos.setFromMatrixPosition(m.matrixWorld);const r=full.boundingSphere?full.boundingSphere.radius*Math.max(m.matrixWorld.getMaxScaleOnAxis(),1e-3):0,dd=Math.max(0,pos.distanceTo(cam)-r);
   let want=m.geometry;
   if(dd>d*1.15)want=lod;else if(dd<d){if(fullD===0)want=mid;else if(dd<fullD)want=full;else if(dd>fullD*1.15)want=mid;else want=m.geometry===lod?mid:m.geometry;}
   /* 緩衝帶（切換距離～再遠 15%）：原本只寫「已經是簡化版就維持」，一開始就落在這段距離的物件會永遠停在原檔（實測 21～23 公尺外的枯木、樹樁還在用 6～8 萬面）。
      現在緩衝帶裡最多只用中間版，沒有中間版就用簡化版 */
   else want=m.geometry===lod?lod:(e.mid||lod);
   m.geometry=want;if(m.geometry===lod)f++;else n++;}
  stats.near=n;stats.far=f;
 }
 // 取某個幾何的簡化版本（mid＝35%、far＝12%），沒有就回傳原檔；水族箱水草這類實例化物件自己決定什麼時候用哪一版
 function variant(geo,which){const full=fullOf.get(geo)||geo,e=lodOf.get(full);return which==='full'?full:(e&&e[which])||full;}
 return{install,update,variant,stats};
}
if(typeof module!=='undefined'&&module.exports)module.exports={LOD_MODELS,lodFileFor,lodDistance,pairLODMeshes,createGeometryLOD};
