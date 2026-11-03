import subprocess,os,time,urllib.request,urllib.error,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'app';port=8897
proc=subprocess.Popen(['node','server.js'],cwd=root,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1'},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 for i in range(25):
  try:urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health',timeout=1);break
  except Exception:time.sleep(.15)
 def fetch(url):
  try:
   r=urllib.request.urlopen(f'http://127.0.0.1:{port}'+url,timeout=4)
   return r.status,r.read(200000),r.headers
  except urllib.error.HTTPError as e:return e.code,e.read(200000),e.headers
 tests=[('/api/health',200),('/index.html',200),('/media183.js',200),('/media183.css',200),('/book-starters.js',200),('/version.json',200),('/api/books/search?q=a',400),('/api/books/search?q=',400),('/.env',404),('/api/workshop/secrets',404)]
 for url,expected in tests:
  code,body,headers=fetch(url);assert code==expected,(url,code,body[:100]);assert headers.get('X-Content-Type-Options')=='nosniff';print('PASS',url,expected)
 v=json.loads(fetch('/version.json')[1]);assert v['version']=='18.3.0';print('PASS version 18.3.0')
finally:
 proc.terminate()
 try:proc.wait(timeout=2)
 except:proc.kill()
