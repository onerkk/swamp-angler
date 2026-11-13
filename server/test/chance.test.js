const {test}=require('node:test'); const assert=require('node:assert/strict'); const {rollChance}=require('../chance');
test('0.001% for common fish, 1% for the hardest, rising with difficulty',()=>{
  assert.equal(rollChance(0),1e-5); assert(Math.abs(rollChance(5)-.01)<1e-12);
  for(let t=1;t<=5;t++) assert(rollChance(t)>rollChance(t-1)); assert.equal(rollChance(9),rollChance(5)); });
