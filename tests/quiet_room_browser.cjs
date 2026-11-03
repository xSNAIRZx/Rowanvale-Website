'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('./browser-runtime.cjs');
const K='mindforge.momentum.data',out=path.resolve(__dirname,'../docs/evidence/audit-polish');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ROWANVALE_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const results=[];
 try{
 const c=await b.newContext({serviceWorkers:'block'}),p=await c.newPage();
 await p.route('https://**/*',r=>r.abort());
 await p.goto(process.env.ROWANVALE_TEST_URL||'http://localhost:8287');await p.locator('#authSkipIntro').click();
 const focus=async()=>p.evaluate(()=>document.querySelector('.nav-item[data-view=focus]').click());
 const saved=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);
 const check=async(name,fn)=>{await fn();results.push({name,pass:true});console.log('PASS '+name)};
 await check('Quiet Room duration survives reload before starting',async()=>{
 await focus();await p.locator('[data-action=duration][data-value="2"]').click();await p.reload();await focus();assert.equal(await p.locator('#timerDisplay').innerText(),'2:00');
 });
 await check('Paused Quiet Room countdown survives reload',async()=>{
 await p.clock.install();await p.locator('#timerStart').click();await p.clock.fastForward(30000);await p.locator('#timerStart').click();await p.reload();await focus();assert.equal(await p.locator('#timerDisplay').innerText(),'1:30');
 });
 await check('Finished timer retains retry state after quota failure and reload',async()=>{
 await p.evaluate(()=>{window.auditSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mindforge.momentum.data')throw new DOMException('Full','QuotaExceededError');return window.auditSet.call(this,k,v)}});
 const before=await saved();await p.locator('#timerStart').click();await p.clock.fastForward(90000);
 assert.match(await p.locator('#timerStatus').innerText(),/SAVE NEEDED/);assert.equal((await saved()).focusLog.length,before.focusLog.length);
 await p.locator('[data-action=timer-reset]').click();assert.match(await p.locator('#timerStart').innerText(),/Retry/);
 await p.reload();await focus();assert.match(await p.locator('#timerStart').innerText(),/Retry/);
 await p.locator('#timerStart').click();assert.equal((await saved()).focusLog.length,before.focusLog.length+1);assert.match(await p.locator('#timerStatus').innerText(),/SESSION COMPLETE/);
 });
 await check('Saved completion remains complete after reload without duplicate log or XP',async()=>{
 const before=await saved();await p.reload();await focus();assert.equal(await p.locator('#timerDisplay').innerText(),'0:00');assert.equal((await saved()).focusLog.length,before.focusLog.length);assert.equal((await saved()).xp,before.xp);
 await p.locator('[data-action=timer-reset]').click();assert.equal(await p.locator('#timerDisplay').innerText(),'2:00');
 });
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'quiet-room-results.json'),JSON.stringify({date:new Date().toISOString(),results},null,2));
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

