'use strict';
const {chromium}=require('./browser-runtime.cjs'),fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ROWANVALE_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.route('https://**/*',r=>r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.ROWANVALE_TEST_URL||'http://localhost:8287');await page.locator('#authSkipIntro').click();
 const routes=['myday','dashboard','media','discover','backlog','books','watch','fan','quests','fitness','focus','wellness','resources','clubhouse','friends','connections','space','customize','safety','updates'];
 const inventory=[];
 for(const route of routes){
  await page.evaluate(id=>document.querySelector('.nav-item[data-view="'+id+'"]').click(),route);
  const entry=await page.evaluate(()=>{
   const name=e=>e.getAttribute('aria-label')||[...(e.getAttribute('aria-labelledby')||'').split(' ')].map(id=>document.getElementById(id)?.textContent||'').join(' ').trim()||[...e.labels||[]].map(l=>l.textContent).join(' ').trim()||e.textContent.trim()||e.getAttribute('title')||(e.type==='submit'?e.value:'');
   const elements=[...document.querySelectorAll('#viewRoot button,#viewRoot input,#viewRoot select,#viewRoot textarea,#viewRoot a[href],#viewRoot summary,#viewRoot [role=button]')];
   const controls=elements.map(e=>({tag:e.tagName.toLowerCase(),id:e.id,type:e.type||'',name:name(e).replace(/\s+/g,' ').slice(0,160),visible:!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'),disabled:!!e.disabled,actions:Object.fromEntries([...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])),href:e.getAttribute('href'),directHandler:!!(e.onclick||e.onchange||e.oninput||e.onsubmit),form:!!e.closest('form')}));
   return {controls,counts:{total:controls.length,visible:controls.filter(c=>c.visible).length,buttons:controls.filter(c=>c.tag==='button').length,formControls:controls.filter(c=>['input','select','textarea'].includes(c.tag)).length},missingName:controls.filter(c=>c.visible&&!c.name&&c.type!=='hidden'),needsHandlerReview:controls.filter(c=>c.visible&&!c.disabled&&c.tag==='button'&&!c.directHandler&&!c.form&&!Object.keys(c.actions).length)};
  });inventory.push({route,...entry});
 }
 const out=path.resolve(__dirname,'../docs/evidence/audit-polish');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'control-inventory.json'),JSON.stringify({date:new Date().toISOString(),browser:await browser.version(),viewport:'1440 × 1000',scope:'Fresh local guest workspace; 20 routes. Read-only DOM inventory; no destructive controls clicked.',limits:['Counts include controls hidden by collapsed sections; visible count separately reported.','Dialog contents and populated-state controls are covered only by workflow suites, not this inventory.','Accessible-name approximation is not a browser accessibility-tree or screen-reader certification.','Delegated listeners are not proven by DOM inspection. needsHandlerReview is a manual review queue, not a broken-button claim.','External network blocked; no authenticated provider or hosted-social interactions tested.'],totals:{controls:inventory.reduce((s,r)=>s+r.counts.total,0),visible:inventory.reduce((s,r)=>s+r.counts.visible,0),missingName:inventory.reduce((s,r)=>s+r.missingName.length,0)},errors,routes:inventory},null,2));
 console.log(JSON.stringify(inventory.map(r=>({route:r.route,...r.counts,missingName:r.missingName.map(x=>({id:x.id,tag:x.tag,actions:x.actions})),needsHandlerReview:r.needsHandlerReview.map(x=>({id:x.id,name:x.name}))})),null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
