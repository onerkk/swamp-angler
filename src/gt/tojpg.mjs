import {NodeIO} from '@gltf-transform/core'; import {ALL_EXTENSIONS} from '@gltf-transform/extensions'; import {textureCompress} from '@gltf-transform/functions'; import sharp from 'sharp';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
for(const f of process.argv.slice(2)){ const d=await io.read(f); await d.transform(textureCompress({encoder:sharp,targetFormat:'jpeg',quality:85})); await io.write(f,d); }
