import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,weld,simplify,textureCompress,resample} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [src,dst,tex,ratio,noanim]=process.argv.slice(2);
const doc=await io.read(src);
if(noanim==='1'){ for(const a of doc.getRoot().listAnimations()) a.dispose(); for(const m of doc.getRoot().listMeshes()) for(const pr of m.listPrimitives()) for(const t of pr.listTargets()) t.dispose(); }
const tf=[dedup(),prune()];
if(+ratio<1){ await MeshoptSimplifier.ready; tf.push(weld(),simplify({simplifier:MeshoptSimplifier,ratio:+ratio,error:.002})); }
tf.push(resample(), textureCompress({encoder:sharp,targetFormat:'jpeg',resize:[+tex,+tex],quality:80}));
await doc.transform(dedup(),prune());
const hasAlpha=doc.getRoot().listMaterials().some(m=>m.getAlphaMode()!=='OPAQUE');
for(const m of doc.getRoot().listMeshes()) for(const pr of m.listPrimitives()) if(pr.getAttribute('TANGENT')) pr.setAttribute('TANGENT',null);
await doc.transform(...tf.slice(0,-1), textureCompress({encoder:sharp,targetFormat:hasAlpha?'png':'jpeg',resize:[+tex,+tex],quality:80}), prune());
await io.write(dst,doc);
