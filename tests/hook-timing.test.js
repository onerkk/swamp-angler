const {test}=require('node:test');
const assert=require('node:assert/strict');
const {hookTiming,hookResult}=require('../src/i.js');
const {gameplayElapsed,stepFishingPhysics}=require('../src/frame-timing.js');

test('the first visible bite frame always allows a perfect hook',()=>{
  for(const rarity of [0,2,5]){
    for(const win of [.5,.74,1.25]){
      const timing=hookTiming({sp:{rar:rarity,f:{win:1}}},{win},false);
      assert.equal(hookResult(0,timing),'perfect');
      assert.equal(hookResult(timing.duration*timing.perfect,timing),'good');
      assert.equal(hookResult(timing.duration,timing),'miss');
    }
  }
});

test('the practice window and fishing physics preserve elapsed time at 8 FPS',()=>{
  const timing=hookTiming({sp:{rar:0,f:{win:1}}},{win:.74},true);
  for(const fps of [8,30,60,120]){
    let countdown=5,simulated=0,elapsed=0;
    for(let i=0;i<fps*5;i++){
      const seconds=gameplayElapsed(1/fps);
      elapsed+=seconds;countdown-=seconds;
      stepFishingPhysics(seconds,step=>{assert(step<=.05);simulated+=step;});
    }
    assert(Math.abs(countdown)<1e-10);
    assert(Math.abs(simulated-5)<1e-10);
    assert.equal(hookResult(elapsed/2,timing),'good');
    assert.equal(hookResult(elapsed,timing),'miss');
  }
});

test('a stalled render bounds physics work and stops stepping after a state transition',()=>{
  const steps=[];
  stepFishingPhysics(gameplayElapsed(10),step=>{steps.push(step);return steps.length<2;});
  assert.deepEqual(steps,[.05,.05]);
  assert.equal(gameplayElapsed(Infinity),0);
});
