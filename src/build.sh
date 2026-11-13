#!/bin/bash
# 組裝 index.html，並替這次部署蓋上同一個版本號：網頁內 APP_VER、version.json、sw.js 的快取版本
set -e
cd "$(dirname "$0")"
JS="resource-budget.js lod.js batching.js crust.js effect-budget.js aquarium-display.js aquarium.js assist.js home-interactions.js home-runtime.js screenshot.js frame-timing.js graphics.js presentation.js physics.js landing.js shop.js water.js optics.js submerged.js godrays.js taa.js wake.js surface-life.js finishes.js material-lighting.js marine.js yacht-layout.js radiance.js b.js mer.js human.js c.js e.js f.js g.js h.js i.js j.js k.js l.js m.js stars.js n.js o.js p.js q.js r.js s.js t.js u.js v.js mermaid-reward.js mergift.js poster.js hall.js w.js x.js y.js z.js tut.js sch.js tide.js d.js"
bundle=$(mktemp)
trap 'rm -f "$bundle"' EXIT
cat $JS > "$bundle"
node --check < "$bundle"
python3 tools/lintc.py >/dev/null
STAMP=$(python3 - <<'BUILDSTAMP'
from datetime import datetime,timedelta,timezone
import json,subprocess
now=datetime.now(timezone.utc).replace(tzinfo=None)
try:
    versions=[json.load(open('../version.json'))['v']]
    try:versions.append(json.loads(subprocess.check_output(['git','show','HEAD:version.json'],cwd='..'))['v'])
    except subprocess.CalledProcessError:pass
    previous=max(datetime.strptime(v,'%Y%m%d%H%M%S')for v in versions)
    now=max(now,previous+timedelta(seconds=1))
except (OSError,ValueError,KeyError):pass
print(now.strftime('%Y%m%d%H%M%S'))
BUILDSTAMP
)
# 掃描魚是可選資產。主程式單獨啟動，需要時才載入掃描魚。
if ! tail -n +2 ../app_scan.js 2>/dev/null | cmp -s scan.js -; then
  { echo "/*APPV:$STAMP*/"; cat scan.js; } > ../app_scan.js
fi
SCAN_VERSION=$(sha256sum scan.js | cut -c1-12)
{ echo "/*APPV:$STAMP*/"; cat "$bundle"; } > ../app_main.js
sed -i -e "s/__APP_BUILD__/$STAMP/" -e "s/__SCAN_BUILD__/$SCAN_VERSION/" ../app_main.js
sed "s/__APP_BUILD__/$STAMP/g" a.html > ../index.html


# 資產指紋：Service Worker 用來判斷哪些模型／貼圖換過、需要重新下載（沒換過的保留在手機裡）
( cd .. && python3 - <<'PY'
import os,hashlib,json
out={}
for root,ds,fs in os.walk('.'):
    ds[:]=sorted(d for d in ds if d not in ('.git','src','dist','tests','.openai'))
    if root.startswith('./src') or root.startswith('./.git'): continue
    for f in sorted(fs):
        if f.lower().endswith(('.glb','.jpg','.jpeg','.png','.webp','.hdr','.mp3')):
            p=os.path.join(root,f)[2:]; out[p]=hashlib.md5(open(os.path.join(root,f),'rb').read()).hexdigest()[:12]
try:
    with open('assets.json') as f: unchanged=json.load(f)==out
except (OSError,ValueError):
    unchanged=False
if not unchanged:
    with open('assets.json','w') as f: json.dump(out,f,separators=(',',':'))
PY
)

sed -i "s/const VER='[^']*'/const VER='swamp-$STAMP'/" ../sw.js
echo "{\"v\":\"$STAMP\"}" > ../version.json
echo "BUILT $STAMP"
