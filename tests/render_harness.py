from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json,traceback,html
ROOT=Path(__file__).resolve().parents[1]/'app'

def page_html(stored=None):
 src=(ROOT/'index.html').read_text()
 # Replace linked stylesheets with the actual CSS; avoid external network.
 src=re.sub(r'<link\s+rel="stylesheet"\s+href="\./([^"?#]+)"\s*/?>',lambda m:'<style>\n'+(ROOT/m.group(1)).read_text()+'\n</style>' if (ROOT/m.group(1)).exists() else '',src)
 src=re.sub(r'<script\s+src="\./([^"?#]+)"\s+defer\s*></script>',lambda m:'<script>\n'+(ROOT/m.group(1)).read_text()+'\n</script>' if (ROOT/m.group(1)).exists() else '',src)
 src=re.sub(r'<script\s+src="https?://[^"]+"\s+defer\s*></script>','',src)
 shim="""<base href=\"https://rowanvale.test/\"><script>
 window.__rvSaved=__STORED__;
 const backing={...(window.__rvSaved||{})};
 const fakeStore={getItem:k=>Object.hasOwn(backing,k)?backing[k]:null,setItem:(k,v)=>{backing[k]=String(v);},removeItem:k=>{delete backing[k];},clear:()=>{for(const k of Object.keys(backing))delete backing[k]},key:n=>Object.keys(backing)[n]||null,get length(){return Object.keys(backing).length;}};
 Object.defineProperty(window,'localStorage',{configurable:true,value:fakeStore});Object.defineProperty(window,'sessionStorage',{configurable:true,value:fakeStore});
 window.__rvStorage=backing;
 window.fetch=async(url,opts)=>{if(String(url).includes('/api/books/search'))return new Response(JSON.stringify({provider:'Open Library',results:[{title:'Dune',author:'Frank Herbert',year:1965,pages:400,coverId:0,workId:'OL893415W',genres:'Science Fiction',provider:'Open Library'}]}),{status:200,headers:{'Content-Type':'application/json'}});return new Response('{}',{status:503,headers:{'Content-Type':'application/json'}})};
 </script>""".replace('__STORED__',json.dumps(stored or {}))
 src=src.replace('<head>','<head>'+shim,1)
 return src

if __name__=='__main__':
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':920})
  errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  try:
   page.set_content(page_html(),wait_until='domcontentloaded',timeout=12000)
   page.wait_for_timeout(300)
   print('ERRORS:',errors[:7]);print('GATE',page.locator('#authSkipIntro').is_visible(),'app',page.locator('#appShell').is_visible(),'scripts:',page.evaluate('typeof RVMedia'),flush=True)
   if page.locator('#authSkipIntro').is_visible():page.locator('#authSkipIntro').click(timeout=1500);page.wait_for_timeout(250)
   print('AFTER GUEST',page.locator('#appShell').is_visible(),errors[:5],flush=True)
   page.evaluate("document.querySelector('.nav-item[data-view=books]').click()");page.wait_for_timeout(150)
   print('BOOKS',page.locator('.media-book-card').count(),page.locator('.media-books-page').count(),errors[:4],flush=True)
   page.screenshot(path=str(ROOT.parent/'docs'/'BOOKS_ACTUAL_DESKTOP.png'))
  except Exception as e:print('ERR',str(e)[:800],traceback.format_exc(limit=2))
  browser.close()
