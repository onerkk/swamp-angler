import http.server,threading,os,time,json,sys
from playwright.sync_api import sync_playwright
os.chdir('/mnt/user-data/outputs/swamp-real')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',9766),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--ignore-gpu-blocklist'])
    for spot in [0]:
        pg=b.new_page(viewport={'width':390,'height':760})
        pg.add_init_script("localStorage.setItem('swampAngler.v1',%r)"%json.dumps({"coins":20000,"lv":18,"spot":spot,"yacht":1,"seaTrips":1,"hour":12,"baits":{"minnow":3},"bait":"minnow"}))
        pg.on('pageerror',lambda e: errs.append('spot%d %s'%(spot,str(e)[:200]))); pg.on('console',lambda m: errs.append('spot%d C:%s'%(spot,m.text[:150])) if m.type=='error' else None)
        pg.goto('http://127.0.0.1:9766/index.html',timeout=90000); time.sleep(10); pg.evaluate("document.getElementById('startBtn').click()"); time.sleep(6)
        print('spot',spot,'loc',pg.evaluate("window.__G.loc"),'state',pg.evaluate("window.__G.state")); pg.close()
    b.close()
print(errs or 'no errors')
