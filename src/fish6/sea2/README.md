# 2026-11-02 新物種素材
- 5 魚（scat tarpon maori puffer rabbit）：prep.py → gen.py → bake_planar.py（BAKE_FACES=16000）→ gt/fishfix.mjs v 模式
- 棘鰆 wahoo：同上（prep3.py）
- 龍蝦 lobster、泰國蝦 prawn：AI 只生成身體（crust.py 的 body() 用大核開運算去掉腳、螯、觸角），腳／螯／觸角之後用程式做成分節零件與骨架；模型 models/crust_lobster.glb、crust_prawn.glb
- 原圖：269762–269771（5 魚）、269772–269777（棘鰆、龍蝦、蝦；俯視在前、側面在後）
