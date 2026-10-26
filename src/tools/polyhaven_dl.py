import json,urllib.request,os,sys
OP=urllib.request.build_opener(); OP.addheaders=[('User-Agent','Mozilla/5.0 (X11; Linux x86_64) swamp-angler-build')]; urllib.request.install_opener(OP)
MODELS=['sofa_02','throw_pillows_01','Rockingchair_01','coffee_table_round_01','wooden_bookshelf_worn','decorative_book_set_01','book_encyclopedia_set_01','lantern_chandelier_01','vintage_oil_lamp','wooden_lantern_01','mantel_clock_01','treasure_chest','wooden_barrels_01','potted_plant_01','hanging_picture_frame_01','hanging_picture_frame_02','industrial_wall_lamp']
TEX=['castle_brick_07','coral_gravel','clean_pebbles','fabric_pattern_07']
def get(u,p):
    if os.path.exists(p): return
    os.makedirs(os.path.dirname(p),exist_ok=True); urllib.request.urlretrieve(u,p)
for m in MODELS:
    try:
        d=json.load(urllib.request.urlopen(f'https://api.polyhaven.com/files/{m}'))['gltf']['1k']['gltf']
        get(d['url'],f'{m}/{os.path.basename(d["url"])}')
        for k,v in (d.get('include') or {}).items(): get(v['url'],f'{m}/{k}')
        tot=sum(os.path.getsize(os.path.join(r,f)) for r,_,fs in os.walk(m) for f in fs); print(m,'ok',tot//1024,'KB')
    except Exception as e: print(m,'ERR',str(e)[:80])
for t in TEX:
    try:
        d=json.load(urllib.request.urlopen(f'https://api.polyhaven.com/files/{t}'))
        for ch in ['Diffuse','nor_gl','Rough','Displacement']:
            if ch in d and '1k' in d[ch] and 'jpg' in d[ch]['1k']: get(d[ch]['1k']['jpg']['url'],f'tex/{t}_{ch}.jpg')
        print(t,'ok',[f for f in os.listdir('tex') if f.startswith(t)])
    except Exception as e: print(t,'ERR',str(e)[:80])
