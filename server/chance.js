/* 中獎機率：常見魚（0 級）十萬分之一，每高一級乘以 1000^(1/5)≈3.98，魚王（5 級）1% */
function rollChance(tier){ tier=Math.max(0,Math.min(5,tier|0)); return 1e-5*Math.pow(1000,tier/5); }
module.exports={rollChance};
