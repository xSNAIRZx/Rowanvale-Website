'use strict';
const {chromium}=require('playwright'),{start}=require('./server.cjs'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),net=require('node:net');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rowanvale-hosted-browser-'));
 const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 const origin='http://127.0.0.1:'+port,password='browser-fixture-password-123456';
 const app=await start({...process.env,PUBLIC_URL:origin,PORT:String(port),WEB_BIND:'127.0.0.1',ROWANVALE_WEB_USER:'owner',ROWANVALE_WEB_PASSWORD:password,ROWANVALE_DATA_DIR:dir});
 const browser=await chromium.launch({headless:true,executablePath:process.env.ROWANVALE_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const checks=[],errors=[];
 try{
  const context=await browser.newContext({httpCredentials:{username:'owner',password},viewport:{width:1440,height:1000}});
  await context.route('https://**/*',r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.locator('#authSkipIntro').click();checks.push('Browser owner authentication and device sign-in work');
  await page.evaluate(()=>{const k='mindforge.momentum.data',d=JSON.parse(localStorage.getItem(k));d.settings.online185.automaticArtwork=false;d.settings.coverArtwork1861={enabled:false};d.backlog=[{id:'host-book',type:'Book',title:'My hosted book',status:'On Hold'}];localStorage.setItem(k,JSON.stringify(d));});
  await page.reload();
  for(const view of ['media','fitness','wellness','focus','customize']){await page.evaluate(v=>document.querySelector('.nav-item[data-view="'+v+'"]').click(),view);assert.ok((await page.locator('#viewRoot').innerText()).length>50);}
  checks.push('Library, workout, wellbeing, focus and customization screens render through hosted entry point');
  assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/artwork/resolve',{method:'POST',headers:{'content-type':'application/json','x-rowanvale-intent':'resolve-artwork'},body:'{"items":[]}'});return r.status;}),200);checks.push('Real browser POST Origin and intent are accepted by hosted gateway');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));checks.push('Hosted mobile settings fit390px');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await context.setOffline(true);await page.reload();await page.locator('#viewRoot').waitFor();
  await page.evaluate(()=>document.querySelector('.nav-item[data-view=media]').click());assert.match(await page.locator('#viewRoot').innerText(),/My hosted book/);checks.push('Installed PWA restarts offline and preserves saved library');
  assert.deepEqual(errors,[]);checks.push('No page errors');
  fs.writeFileSync(path.join(__dirname,'BROWSER_RESULTS.json'),JSON.stringify({date:new Date().toISOString(),checks,limits:'Local HTTP loopback simulation of owner-private hosted entry. Docker, production HTTPS and live third-party providers were not tested.'},null,2));
  console.log(checks.length+' hosted browser checks passed');
 }finally{await browser.close();await app.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
