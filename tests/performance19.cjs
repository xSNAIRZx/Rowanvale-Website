'use strict';
const {chromium}=require('./browser-runtime.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const BASE=process.env.ROWANVALE_TEST_URL||'http://localhost:8199',K='mindforge.momentum.data';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.ROWANVALE_BROWSER||undefined,headless:true});
 const runs=[];
 try{
  for(let sample=0;sample<3;sample++){
   const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
   await context.route('https://**/*',r=>r.abort());const p=await context.newPage();
   const before=performance.now();await p.goto(BASE,{waitUntil:'load'});await p.locator('#authSkipIntro').waitFor();const coldShellMs=performance.now()-before;
   await p.locator('#authSkipIntro').click();
   await p.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.settings.online185={automaticArtwork:false,autoSync:false};d.backlog=Array.from({length:2000},(_,i)=>({id:'perf-'+i,title:'Audit story '+String(i).padStart(4,'0'),type:['Game','Movie','Show','Anime','Book'][i%5],status:'Want to Try',createdAt:new Date().toISOString(),metadata184:{genres:i%2?'Adventure':'Cozy'}}));localStorage.setItem(k,JSON.stringify(d));},K);
   const reloadStart=performance.now();await p.reload({waitUntil:'load'});await p.locator('#appShell').waitFor({state:'visible'});const reload2000Ms=performance.now()-reloadStart;
   const navigationMs=await p.evaluate(async()=>{const start=performance.now();document.querySelector('.nav-item[data-view=media]').click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-start;});
   assert.equal(await p.locator('.living-card').count()>0,true);
   const searchMs=await p.evaluate(async()=>{const start=performance.now(),input=document.querySelector('#living-query');input.value='Audit story 1999';input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-start;});
   assert.ok((await p.locator('#living-results').innerText()).includes('Audit story 1999'));
   assert.equal(await p.locator('.living-card').count(),1);
   runs.push({coldShellMs:Math.round(coldShellMs),reload2000Ms:Math.round(reload2000Ms),navigationMs:Math.round(navigationMs),searchMs:Math.round(searchMs)});
   await context.close();
  }
 }finally{await browser.close();}
 const out=path.resolve(__dirname,'../docs/evidence/1.0.0');fs.mkdirSync(out,{recursive:true});
 const report={date:new Date().toISOString(),environment:'Headless Chrome on this Windows PC, 1440×1000; local server; external requests blocked; service workers disabled; three fresh contexts. Not CPU/network throttled. Timings include two paint frames for navigation/search and are observations, not universal budgets.',records:2000,runs};
 fs.writeFileSync(path.join(out,'performance-baseline.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
