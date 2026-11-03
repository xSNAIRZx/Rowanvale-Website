'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('./browser-runtime.cjs');
const BASE = process.env.ROWANVALE_TEST_URL || 'http://localhost:8187';
const K = 'mindforge.momentum.data';
(async () => {
 const browser = await chromium.launch({executablePath:process.env.ROWANVALE_BROWSER || undefined,headless:true});
 const results=[],errors=[];
 try {
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
  await context.route('https://**/*',r=>r.abort());
  const p=await context.newPage();p.setDefaultTimeout(12000);
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  const data=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),K);
  const go=async view=>{await p.evaluate(v=>document.querySelector('.nav-item[data-view="'+v+'"]').click(),view);};
  const check=async(name,fn)=>{await fn();results.push({name,pass:true});console.log('PASS '+name);};
  const click=async action=>p.locator('[data-action="'+action+'"]').filter({visible:true}).first().click();
  await p.goto(BASE);await p.locator('#authSkipIntro').click();
  let questId,sessionId,baseXP;
  await check('Quest create, edit and reload preserve title, note and reward',async()=>{
   await go('quests');await click('new-quest');await p.locator('#questTitle').fill('Prepare movie night');await p.locator('#questNote').fill('Choose a local favorite');await p.locator('#questXP').selectOption('20');await p.locator('#questForm [type=submit]').click();
   let q=(await data()).quests.find(q=>q.title==='Prepare movie night');assert.ok(q);questId=q.id;
   await p.locator('[data-action=edit-quest][data-id="'+questId+'"]').click();await p.locator('#questTitle').fill('Prepare our movie night');await p.locator('#questForm [type=submit]').click();
   await p.reload();await go('quests');q=(await data()).quests.find(q=>q.id===questId);assert.equal(q.title,'Prepare our movie night');assert.equal(q.note,'Choose a local favorite');assert.equal(q.xp,20);
  });
  await check('Quest completion, reopen and recompletion reconcile XP without duplicate awards',async()=>{
   baseXP=(await data()).xp;
   const toggle=()=>p.locator('[data-action=toggle-quest][data-id="'+questId+'"]').click();
   await toggle();assert.equal((await data()).xp,baseXP+20);await toggle();assert.equal((await data()).xp,baseXP);await toggle();assert.equal((await data()).xp,baseXP+20);
   assert.equal((await data()).xpEvents.filter(e=>e.key.startsWith('quest:'+questId+':')).length,1);
  });
  await check('Quest deletion and undo restore the record and reconcile its XP',async()=>{
   await p.locator('[data-action=delete-quest][data-id="'+questId+'"]').click();assert.ok(!(await data()).quests.some(q=>q.id===questId));assert.equal((await data()).xp,baseXP);
   await go('safety');await click('hb12-undo');assert.ok((await data()).quests.some(q=>q.id===questId));assert.equal((await data()).xp,baseXP+20);
  });
  await check('Movement session create, edit and reload retain corrected duration and notes',async()=>{
   await go('fitness');await click('fitness-log-open');await p.locator('#fitnessTitle').fill('Gentle afternoon walk');await p.locator('#fitnessMinutes').fill('20');await p.locator('#fitnessNote').fill('At my own pace');await p.locator('#fitnessLogForm [type=submit]').click();
   let s=(await data()).fitnessLogs.find(s=>s.title==='Gentle afternoon walk');assert.ok(s);sessionId=s.id;
   await p.locator('[data-action=fitness-edit][data-id="'+sessionId+'"]').click();await p.locator('#fitnessMinutes').fill('12');await p.locator('#fitnessLogForm [type=submit]').click();await p.reload();await go('fitness');
   s=(await data()).fitnessLogs.find(s=>s.id===sessionId);assert.equal(s.minutes,12);assert.equal(s.note,'At my own pace');
  });
  await check('Movement deletion and undo retain the corrected session',async()=>{
   await p.locator('[data-action=fitness-delete][data-id="'+sessionId+'"]').click();assert.ok(!(await data()).fitnessLogs.some(s=>s.id===sessionId));await go('safety');await click('hb12-undo');assert.equal((await data()).fitnessLogs.find(s=>s.id===sessionId).minutes,12);
  });
  await check('Food servings calculate saved nutrition totals; deletion and undo preserve entries',async()=>{
   await go('fitness');await click('food-open');await p.locator('#foodName').fill('Homemade soup');await p.locator('#foodServings').fill('2');await p.locator('#foodCalories').fill('150');await p.locator('#foodProtein').fill('7.5');await p.locator('#foodLogForm [type=submit]').click();
   let food=(await data()).foodLogs.find(x=>x.name==='Homemade soup');assert.ok(food);assert.equal(Number(food.calories),300);assert.equal(Number(food.protein),15);
   await p.locator('[data-action=food-delete][data-id="'+food.id+'"]').click();assert.ok(!(await data()).foodLogs.some(x=>x.id===food.id));await go('safety');await click('hb12-undo');await p.reload();assert.ok((await data()).foodLogs.some(x=>x.id===food.id));
  });
  await check('Hydration quick adds persist exact amounts; deletion undo restores the entry',async()=>{
   await go('fitness');await p.locator('[data-action=water-add][data-amount="250"]').click();await p.locator('[data-action=water-add][data-amount="500"]').click();assert.equal((await data()).waterLogs.reduce((s,x)=>s+Number(x.ml),0),750);
   const water=(await data()).waterLogs[0];await p.locator('[data-action=water-delete][data-id="'+water.id+'"]').click();assert.equal((await data()).waterLogs.length,1);await go('safety');await click('hb12-undo');await p.reload();assert.equal((await data()).waterLogs.reduce((s,x)=>s+Number(x.ml),0),750);
  });
  await check('My Day layout persists and its Movement shortcut reaches the saved activity',async()=>{
   await go('myday');await p.locator('#hb12LayoutSelect').selectOption('minimal');await p.reload();await go('myday');assert.equal(await p.locator('#hb12LayoutSelect').inputValue(),'minimal');
   await p.locator('.hb12-wellbeing [data-view=fitness]').click();assert.ok(await p.locator('[data-action=fitness-edit][data-id="'+sessionId+'"]').count());
  });
  await check('Overview care check and reopen persist across reload',async()=>{
   await go('dashboard');const habit=p.locator('[data-action=habit]').first();const id=await habit.getAttribute('data-id');await habit.check();assert.equal((await data()).habits.find(h=>h.id===id).done,true);await p.reload();await go('dashboard');await p.locator('[data-action=habit][data-id="'+id+'"]').uncheck();assert.equal((await data()).habits.find(h=>h.id===id).done,false);
  });
  assert.deepEqual(errors,[]);
  const out=path.resolve(__dirname,'../docs/evidence/19.3.0');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'legacy-daily-results.json'),JSON.stringify({date:new Date().toISOString(),results,errors},null,2));
  console.log(results.length+' daily-life outcome workflows passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
