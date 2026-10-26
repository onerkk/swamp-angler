import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(process.argv[2]), r=doc.getRoot();
for(const m of r.listMaterials()){ const bc=m.getBaseColorTexture();
  console.log('MAT',m.getName(),'col',m.getBaseColorFactor().map(v=>v.toFixed(2)).join(','),'alpha',m.getAlphaMode(),m.getAlphaCutoff(),'met',m.getMetallicFactor(),'rgh',m.getRoughnessFactor(),
   'tex',bc?(bc.getMimeType()+' '+bc.getSize()):'-','ext',m.listExtensions().map(e=>e.extensionName).join('|'),'dbl',m.getDoubleSided()); }
for(const n of r.listNodes()){ const me=n.getMesh(); if(!me) continue;
  for(const p of me.listPrimitives()){ const pos=p.getAttribute('POSITION'), mn=pos.getMinNormalized?null:null; const lo=pos.getMin([]),hi=pos.getMax([]);
    console.log('PRIM node',n.getName(),'mat',p.getMaterial()&&p.getMaterial().getName(),'verts',pos.getCount(),'size',hi.map((v,i)=>(v-lo[i]).toFixed(3)).join('x'),'scale',n.getScale().map(v=>v.toFixed(3)).join(',')); } }
