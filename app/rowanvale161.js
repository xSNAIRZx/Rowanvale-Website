/* Rowanvale 16.1: progressive enhancement for the existing offline desktop app.
   Studio preview is transient: settings are only saved when explicitly applied. */
const RV161=(()=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const options={uiFont:['system','rounded','serif','mono'],uiDensity:['relaxed','balanced','compact'],uiCorners:['soft','square','pill'],uiBackdrop:['ambient','plain','pattern'],interfaceWidth:['standard','wide','focus'],typeScale:['normal','comfortable','large']};
 const fonts={system:'ui-sans-serif,system-ui,-apple-system,"Segoe UI",Arial,sans-serif',rounded:'"Trebuchet MS",ui-rounded,system-ui,sans-serif',serif:'Georgia,"Times New Roman",serif',mono:'ui-monospace,Consolas,monospace'};
 let previewing=false,previousApplied=null;let pageOutlineCount=0;
 const picker=(id,label,current,choices)=>`<label class="rv161-field">${label}<select id="rv161${id}">${choices.map(([value,text])=>`<option value="${value}" ${value===current?'selected':''}>${text}</option>`).join('')}</select></label>`;
 const take=()=>{
  const val=k=>document.getElementById('rv161'+k)?.value;
  const settings={};for(const k of Object.keys(options)){const v=val(k);if(!options[k].includes(v))throw Error('Unsupported '+k);settings[k]=v;}
  const accent=val('accent');if(!/^#[a-f\d]{6}$/i.test(accent))throw Error('Choose a valid accent color.');
  settings.accent=accent;settings.reducedMotion=!!document.getElementById('rv161Motion')?.checked;
  return settings;
 };
 function studio(data){const s=data.settings;return `<section class="panel panel-pad rv161-studio" id="rv161DesignLab" aria-labelledby="rv161DesignTitle">
  <div class="rv161-title"><div><span class="eyebrow">CREATIVE STUDIO / DESIGN LAB</span><h2 id="rv161DesignTitle">See it before you save it.</h2><p>Shape every screen with a safe preview. Nothing changes in your saved Rowanvale until you choose <strong>Apply & save</strong>. Your older themes, Canvas and presets are still below.</p></div><span class="rv161-pill">App-wide · offline</span></div>
  <div class="rv161-lab-layout"><div class="rv161-lab-controls">
   <label class="rv161-field">Accent color<input id="rv161accent" type="color" value="${esc(/^#[\da-f]{6}$/i.test(s.accent||'')?s.accent:'#e6a26b')}"></label>
   ${picker('uiFont','Typography',s.uiFont||'system',[['system','Clean sans'],['rounded','Friendly rounded'],['serif','Bookish serif'],['mono','Monospace']])}
   ${picker('uiDensity','Spacing',s.uiDensity||'balanced',[['relaxed','Roomy'],['balanced','Balanced'],['compact','Compact']])}
   ${picker('uiCorners','Card shape',s.uiCorners||'soft',[['soft','Soft'],['square','Structured'],['pill','Extra rounded']])}
   ${picker('uiBackdrop','Backdrop',s.uiBackdrop||'ambient',[['ambient','Ambient'],['plain','Plain'],['pattern','Pattern']])}
   ${picker('interfaceWidth','Workspace width',s.interfaceWidth||'standard',[['standard','Standard'],['wide','Panoramic'],['focus','Reading width']])}
   ${picker('typeScale','Text size',s.typeScale||'comfortable',[['normal','Standard'],['comfortable','Comfortable'],['large','Large']])}
   <label class="rv161-check"><input type="checkbox" id="rv161Motion" ${s.reducedMotion?'checked':''}> Reduce decorative motion</label>
  </div><div class="rv161-lab-right">
  <div class="rv161-live-sample" id="rv161Sample"><span class="eyebrow">LIVE SAMPLE</span><div class="rv161-sample-title">A little room to explore.</div><p>Your colors, reading size and shapes update here before you commit.</p><div class="rv161-sample-cards"><div><strong>4,010</strong><small>Worlds to discover</small></div><div><strong>✦</strong><small>Your next chapter</small></div></div><span class="rv161-demo-button">Find your next world ↗</span></div>
  <div class="rv161-lab-actions"><button type="button" class="button button-quiet" data-action="rv161-preview">Preview across app</button><button type="button" class="button button-primary" data-action="rv161-apply">Apply & save</button><button type="button" class="button button-quiet" data-action="rv161-cancel">Cancel preview</button><button type="button" class="button button-quiet" data-action="rv161-undo" ${previousApplied?'':'disabled'}>Undo last change</button></div>
  <p id="rv161PreviewStatus" class="small-note" role="status">Preview is private and unsaved. You can always return to your previous look.</p></div></div>
 </section>`}
 function sample(){const sampleEl=document.getElementById('rv161Sample');if(!sampleEl)return;let s;try{s=take()}catch{return};sampleEl.style.setProperty('--rv161-demo-accent',s.accent);sampleEl.style.fontFamily=fonts[s.uiFont];sampleEl.style.setProperty('--rv161-demo-radius',{square:'4px',soft:'16px',pill:'30px'}[s.uiCorners]);sampleEl.style.setProperty('--rv161-demo-pad',{compact:'12px',balanced:'18px',relaxed:'25px'}[s.uiDensity]);sampleEl.style.fontSize={normal:'14px',comfortable:'16px',large:'18px'}[s.typeScale];sampleEl.dataset.demoBackdrop=s.uiBackdrop;}
 function clearPreview(applySettings){if(!previewing)return;previewing=false;document.body.classList.remove('rv161-previewing');if(typeof applySettings==='function')applySettings();}
 function preview(settings){
  previewing=true;const b=document.body;b.classList.add('rv161-previewing');
  for(const k of Object.keys(options))b.dataset[k]=settings[k];
  b.dataset.motion=settings.reducedMotion?'reduced':'full';b.classList.toggle('reduce-motion',settings.reducedMotion);
  b.style.setProperty('--accent',settings.accent);b.style.setProperty('--hb12-font',fonts[settings.uiFont]);
  document.documentElement.style.setProperty('--accent',settings.accent);
 }
 function download(name,html){const blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000)}
 function inviteCard(plan){let date='Time to decide';if(plan.when&&Number.isFinite(Date.parse(plan.when))){date=new Date(plan.when).toLocaleString();}
   return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(plan.title)} | Game night</title><style>*{box-sizing:border-box}body{margin:0;background:#091b21;color:#f5f1e6;font:16px/1.6 system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:28px}.card{width:min(100%,650px);padding:clamp(28px,6vw,54px);border:1px solid #73918b;border-radius:28px;background:radial-gradient(circle at top right,#294b4d,#102630 70%);box-shadow:0 30px 80px #0005}.label{color:#e6a26b;letter-spacing:.14em;font-size:12px;text-transform:uppercase}h1{font:normal clamp(36px,6vw,58px)/1.12 Georgia,serif;overflow-wrap:anywhere}dl{display:grid;grid-template-columns:130px 1fr;gap:10px 18px;overflow-wrap:anywhere}dt{color:#b4c7c1}dd{margin:0}blockquote{border-left:3px solid #e6a26b;padding-left:15px;margin:25px 0 0;white-space:pre-wrap}.foot{color:#b4c7c1;font-size:12px;margin-top:35px}@media print{body{background:white;color:#17302f}.card{background:#fff;box-shadow:none;border-color:#888}.label{color:#8e4b25}}</style></head><body><article class="card"><div class="label">Rowanvale · your game night</div><h1>${esc(plan.title)}</h1><dl><dt>Game</dt><dd>${esc(plan.game||'To be decided')}</dd><dt>When</dt><dd>${esc(date)}</dd><dt>Playing with</dt><dd>${esc(plan.friend||'Whoever can join')}</dd><dt>Length</dt><dd>${esc(plan.minutes)} minutes</dd></dl>${plan.note?`<blockquote>${esc(plan.note)}</blockquote>`:''}<p class="foot">Created locally in Rowanvale. This file is not an online invitation; share it yourself if you wish.</p></article></body></html>`;
 }
 function action(a,el,h){const {data,save,render,go,toast,uid,applySettings,clone}=h;
  const update=(fn,msg)=>{const before=clone(data);fn();if(!save()){for(const k of Object.keys(data))delete data[k];Object.assign(data,before);render();return false}render();if(msg)toast(msg,'success');return true};
  if(a==='rv161-preview'){try{preview(take());document.getElementById('rv161PreviewStatus').textContent='Preview active · not saved. Cancel or apply to keep this look.';toast('Previewing changes. Nothing has been saved.','success')}catch(e){toast(e.message,'error')}return}
  if(a==='rv161-cancel'){clearPreview(applySettings);sample();const p=document.getElementById('rv161PreviewStatus');if(p)p.textContent='Preview canceled. Your saved look is unchanged.';return}
  if(a==='rv161-apply'){let changes;try{changes=take()}catch(e){toast(e.message,'error');return}clearPreview(applySettings);const was=clone(data.settings);previousApplied=was;const ok=update(()=>Object.assign(data.settings,changes),'Design Lab changes saved across Rowanvale.');if(ok){applySettings()}else previousApplied=null;return}
  if(a==='rv161-undo'){if(!previousApplied)return;clearPreview(applySettings);const back=previousApplied,now=clone(data.settings);previousApplied=now;if(update(()=>Object.assign(data.settings,back),'Previous design restored.')){applySettings()}else previousApplied=back;return}
  if(a==='rv161-plan-duplicate'){const found=(data.clubPlans||[]).find(p=>p.id===el.dataset.id);if(!found)return;update(()=>{data.clubPlans.unshift({...clone(found),id:uid(),title:(found.title+' (copy)').slice(0,90),createdAt:new Date().toISOString()});data.clubPlans=data.clubPlans.slice(0,150)},'Game night duplicated.');return}
  if(a==='rv161-plan-card'){const p=(data.clubPlans||[]).find(p=>p.id===el.dataset.id);if(!p)return;const slug=(p.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,44)||'game-night');download(`rowanvale-invitation-${slug}.html`,inviteCard(p));toast('Private invitation card downloaded. Open it or print it offline.','success');return}
  if(a==='rv161-kit-preview'){const kit=(data.questKits||[]).find(k=>k.id===el.dataset.id);if(!kit)return;const panel=document.getElementById('rv161KitPreview');if(!panel)return;panel.hidden=false;panel.querySelector('.rv161-kit-title').textContent=kit.name;const list=panel.querySelector('ul');list.replaceChildren();for(const q of kit.quests.slice(0,30)){const li=document.createElement('li');li.textContent=`${q.title} · ${q.category||'Personal'} · ${q.xp||0} potential XP`;list.append(li)}panel.scrollIntoView({block:'nearest',behavior:'instant'});panel.querySelector('[data-action="rv161-kit-close"]').focus({preventScroll:true});return}
  if(a==='rv161-kit-close'){const panel=document.getElementById('rv161KitPreview');if(panel)panel.hidden=true;return}
  if(a==='rv161-plan-template'){const configs={cozy:['Cozy game night',60,'A few low-pressure games and a relaxed pace.'],quick:['Quick co-op session',30,'One session, everyone welcome.'],adventure:['Adventure evening',180,'Pick a story and enjoy the journey.']};const c=configs[el.dataset.value];if(!c)return;for(const [id,value] of [['rv16PlanTitle',c[0]],['rv16PlanMinutes',String(c[1])],['rv16PlanNote',c[2]]]){const input=document.getElementById(id);if(input)input.value=value}document.getElementById('rv16PlanTitle')?.focus();return}
  if(a==='rv161-library-pick'){const games=(data.backlog||[]).filter(g=>(g.type||'Game')==='Game'&&g.status!=='Completed'&&g.status!=='Dropped');const box=document.getElementById('rv161LibraryPick');if(!box)return;if(!games.length){box.textContent='Add a game you want to play first, then Rowanvale can choose one.';return}const game=games[Math.floor(Math.random()*games.length)];box.textContent=`Try ${game.title} · ${game.status||'Backlog'} shelf`;return}
 }
 function afterRender(view,root,data){
  // Rendering a different page ends unsaved UI preview without modifying stored settings.
  if(view!=='customize'&&previewing){previewing=false;document.body.classList.remove('rv161-previewing')}
  if(view==='customize'){sample()}
  if(view==='clubhouse'){
   const plan=document.getElementById('rv16GameNight');if(plan){const toolbar=document.createElement('div');toolbar.className='rv161-template-choices';toolbar.innerHTML='<span>Start from a plan</span><button type="button" data-action="rv161-plan-template" data-value="cozy">Cozy</button><button type="button" data-action="rv161-plan-template" data-value="quick">Quick</button><button type="button" data-action="rv161-plan-template" data-value="adventure">Adventure</button>';plan.parentElement.querySelector('p')?.after(toolbar)}
   const kit=document.createElement('section');kit.id='rv161KitPreview';kit.className='panel panel-pad rv161-kit-preview';kit.hidden=true;kit.innerHTML='<div class="rv161-title"><div><span class="eyebrow">QUEST KIT / PREVIEW</span><h2 class="rv161-kit-title"></h2></div><button type="button" class="button button-quiet" data-action="rv161-kit-close">Close preview</button></div><p>Using a kit adds quests you do not already have. Previewing and importing a kit never awards XP.</p><ul></ul>';root.querySelector('.rv16-clubhouse')?.append(kit);
  }
  if(view==='backlog'){const list=root.querySelector('.hb10-library-manager');if(list){const bar=document.createElement('div');bar.className='rv161-library-helper';bar.innerHTML='<span>Can’t decide what to play?</span><button type="button" class="button button-quiet" data-action="rv161-library-pick">Pick from my unfinished games</button><span id="rv161LibraryPick" role="status"></span>';list.before(bar)}}
  // A small, closed-by-default outline keeps long sections navigable by keyboard.
  root.querySelectorAll('.rv161-page-outline').forEach(el=>el.remove());pageOutlineCount=0;
  // Individual library cards are items, not page sections; hidden panels are not destinations.
  const headings=[...root.querySelectorAll('h2')].filter(h=>!h.closest('.rv16-route-tools,.hb11-context-tools,.living-card,.game-card,.watch-card,.fan-card,.media-book-card,[hidden],dialog') && h.textContent.trim());
  const candidate=headings.slice(0,30);if(candidate.length<2)return;
  const details=document.createElement('details');details.className='rv161-page-outline';details.innerHTML='<summary>On this page <span class="rv161-outline-count"></span><span class="rv161-outline-chev" aria-hidden="true">⌄</span></summary><nav aria-label="Jump to a section"></nav>';
  details.querySelector('.rv161-outline-count').textContent=`${candidate.length} sections`;
  const nav=details.querySelector('nav');candidate.forEach((h,i)=>{const id='rv161-jump-'+view+'-'+i;h.id=h.id||id;const a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent.trim().slice(0,75);a.addEventListener('click',e=>{e.preventDefault();h.scrollIntoView({behavior:'instant',block:'start'});h.setAttribute('tabindex','-1');h.focus({preventScroll:true});});nav.append(a)});
  const anchor=root.querySelector('.hb11-context-tools');if(anchor)anchor.after(details);else root.prepend(details);pageOutlineCount=candidate.length;
 }
 // Accessible, unobtrusive input preview. Pure DOM demo edits do not persist.
 document.addEventListener('input',event=>{if(event.target.closest('#rv161DesignLab'))sample()});
 document.addEventListener('change',event=>{if(event.target.closest('#rv161DesignLab'))sample()});
 return {studio,afterRender,action,clearPreview,get pageOutlineCount(){return pageOutlineCount}};
})();
