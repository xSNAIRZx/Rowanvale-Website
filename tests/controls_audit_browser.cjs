'use strict';
const {chromium}=require('./browser-runtime.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const OUT=path.resolve(__dirname,'../docs/evidence/audit-controls');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ROWANVALE_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 const page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('https://**/*',r=>r.abort());
 const nav=v=>page.evaluate(v=>document.querySelector('.nav-item[data-view="'+v+'"]').click(),v);
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mindforge.momentum.data')));
 async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
 try{
 await page.goto(process.env.ROWANVALE_TEST_URL||'http://localhost:8197');await page.locator('#authSkipIntro').click();
 await page.evaluate(()=>{const key='mindforge.momentum.data',d=JSON.parse(localStorage.getItem(key));d.settings.lowStimulation=false;d.settings.reducedMotion=false;d.settings.rv17calm={quiet:false};d.settings.online185={automaticArtwork:false,autoSync:false};d.settings.rv18={...d.settings.rv18,effect:'rain',startView:'myday'};localStorage.setItem(key,JSON.stringify(d));});
 await page.reload();await nav('myday');
 await check('Calm View hides current decorative effects and persists across reload',async()=>{
  assert.equal(await page.locator('#viewRoot>.rv18-effects').isVisible(),true);
  await page.screenshot({path:path.join(OUT,'calm-before.png')});
  await page.locator('#rv17calmToggle').click();
  assert.equal(await page.locator('#viewRoot>.rv18-effects').isVisible(),false,'Calm View should hide rain, stars and snow');
  assert.equal((await read()).settings.rv17calm.quiet,true);
  await page.reload();assert.equal(await page.locator('#rv17calmToggle').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#viewRoot>.rv18-effects').isVisible(),false);
  await page.screenshot({path:path.join(OUT,'calm-after.png')});
  await page.locator('#rv17calmToggle').click();assert.equal(await page.locator('#viewRoot>.rv18-effects').isVisible(),true);
 });
 await nav('customize');
 await check('Live appearance preview updates without saving; discard restores saved appearance',async()=>{
  const before=(await read()).settings.theme;
  await page.locator('[data-rv18-field="settings.theme"]').selectOption('rv18-ocean');
  await page.waitForFunction(()=>document.querySelector('#rv18-preview')?.contentDocument?.body?.dataset.theme==='rv18-ocean');
  assert.equal((await read()).settings.theme,before);
  await page.locator('[data-rv18-action=discard]').click();
  assert.equal(await page.locator('[data-rv18-field="settings.theme"]').inputValue(),before);
 });
 await check('Calm View is discoverable in Comfort settings and applies after save',async()=>{
  await page.locator('[data-rv18-action=category][data-id=comfort]').click();
  await page.locator('[data-rv18-field="settings.rv17calm.quiet"]').check();
  await page.waitForFunction(()=>document.querySelector('#rv18-preview')?.contentDocument?.body?.classList.contains('rv17calm-quiet'));
  assert.equal((await read()).settings.rv17calm.quiet,false);
  await page.locator('[data-rv18-action=save]').click();assert.equal((await read()).settings.rv17calm.quiet,true);
 });
 await check('New media and book destinations can be chosen as the starting page',async()=>{
  await page.locator('[data-rv18-action=category][data-id=space]').click();
  const start=page.locator('[data-rv18-field="settings.rv18.startView"]');
  await start.selectOption('books');await start.selectOption('media');
  await page.locator('[data-rv18-action=save]').click();await page.reload();
  assert.equal(await page.locator('.nav-item[data-view=media]').getAttribute('aria-current'),'page');
 });
 await nav('customize');
 await check('Mobile settings tabs expose preview, remain within viewport and save across restart',async()=>{
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-rv18-action=category][data-id=appearance]').click();
  await page.locator('[data-rv18-field="settings.theme"]').selectOption('rv18-lavender');
  await page.locator('[data-rv18-action=preview-panel]').click();
  await page.locator('[data-rv18-action=mobile]').click();
  await page.waitForFunction(()=>document.querySelector('#rv18-preview')?.contentDocument?.body?.dataset.theme==='rv18-lavender');
  assert.equal(await page.locator('.rv18-preview-pane').isVisible(),true);
  assert.equal(await page.locator('.rv18-form').isVisible(),false);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.evaluate(()=>window.scrollTo({top:550,behavior:'instant'}));await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.querySelector('.rv18-mobile-tabs').getBoundingClientRect().top>=document.querySelector('.topbar').getBoundingClientRect().bottom),'Sticky settings tabs must remain below the header'); await page.screenshot({path:path.join(OUT,'settings-mobile-preview.png')});
  await page.locator('[data-rv18-action=edit-panel]').click();
  assert.equal(await page.locator('.rv18-form').isVisible(),true);
  await page.locator('[data-rv18-action=save]').click();await page.reload();
  assert.equal((await read()).settings.theme,'rv18-lavender');
 });
 await nav('customize');
 await check('Settings remain within phone, tablet and desktop viewports',async()=>{
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Settings overflow at '+width+'px');
  }
 });
 await check('Keyboard skip link stays hidden until focused and moves focus to page content',async()=>{
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  assert.ok(await page.locator('.skip-link').evaluate(e=>e.getBoundingClientRect().bottom<0));
  await page.locator('.skip-link').focus();
  assert.ok(await page.locator('.skip-link').evaluate(e=>e.getBoundingClientRect().top>=0));
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'viewRoot');
 });
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
