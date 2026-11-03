/* Rowanvale 16.2: additive, offline-first desktop customization and library workflows. */
const RV162=(()=>{
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const widgets={next:'Next step',continue:'Continue playing',activity:'Activity calendar',wellbeing:'Breathing room',pick:'Game picker',resources:'Offline guides'};
 const routes={myday:'My Day',dashboard:'Home Base',discover:'Discover',backlog:'Collection',quests:'Quest Circuit',focus:'Quiet Room',wellness:'Reset Studio',fitness:'Fitness & Nutrition',space:'Your Orbit',friends:'Friends',connections:'Connections',clubhouse:'Clubhouse',customize:'Creative Studio',resources:'Offline Guides',safety:'Data & Beta',updates:'Updates & Help'};
 const layouts={balanced:['next','continue','activity','wellbeing','pick','resources'],gaming:['continue','pick','activity','next','wellbeing','resources'],focus:['next','activity','wellbeing','continue','pick','resources'],rest:['wellbeing','resources','pick','next','continue','activity']};
 const palette={sage:'#9cb7a3',apricot:'#e6a26b',mint:'#63e9cd',violet:'#aa9ced',blue:'#8ab9d6',rose:'#e4a3b3'};
 let selected=new Set(),lastBulk=null,lastLayout=null,dragging=null;
 const config=data=>{if(!data.settings.rv162||typeof data.settings.rv162!=='object'||Array.isArray(data.settings.rv162))data.settings.rv162={};return data.settings.rv162};
 const pageConfig=(data,view)=>config(data).pages?.[view]||{};
 function dashboard(data){const cfg=config(data),preset=cfg.dayPreset||'balanced';return `<section class="panel rv162-workbench" aria-labelledby="rv162DayTitle"><div class="rv162-workbench-head"><div><span class="eyebrow">MY DAY / PERSONAL DASHBOARD</span><h2 id="rv162DayTitle">Make the day your own.</h2><p>Arrange the cards, choose their size, or start from a layout. The rest of Rowanvale stays untouched.</p></div><span class="rv162-local-mark">Saved on this device</span></div>
 <div class="rv162-preset-bar" role="group" aria-label="Dashboard arrangements">${[['balanced','Everyday'],['gaming','Game night'],['focus','One thing'],['rest','Take it easy']].map(([id,label])=>`<button class="rv162-preset ${preset===id?'active':''}" aria-pressed="${preset===id}" data-action="rv162-layout" data-value="${id}">${label}</button>`).join('')}</div>
 <details class="rv162-day-manage" id="rv162Manage"><summary>Customize cards and sizes <span aria-hidden="true">⌄</span></summary><div class="rv162-card-editor">${Object.entries(widgets).map(([id,name])=>`<div class="rv162-card-row"><label><input type="checkbox" class="rv162-visible" data-id="${id}" ${data.settings.dayWidgets.includes(id)?'checked':''}>${name}</label><select class="rv162-size" data-id="${id}" aria-label="Size of ${name}"><option value="normal" ${cfg.sizes?.[id]!=='wide'?'selected':''}>Standard</option><option value="wide" ${cfg.sizes?.[id]==='wide'?'selected':''}>Wide</option></select></div>`).join('')}</div><div class="rv162-actions"><button class="button button-quiet" data-action="rv162-layout-reset">Reset dashboard</button><button class="button button-quiet" data-action="rv162-layout-undo" ${lastLayout?'':'disabled'}>Undo arrangement</button></div><p class="small-note">On desktop, drag a card by its grip to reorder it. Keyboard ↑ and ↓ buttons remain available on every card.</p></details></section>`}
 function studio(data){const cfg=config(data),page=cfg.editorPage||'myday',style=pageConfig(data,page),keys=Object.keys(routes);const accent=palette[style.accent]?'':(style.accent||'');return `<section class="panel panel-pad rv162-page-studio" aria-labelledby="rv162StudioTitle"><div class="rv162-title"><div><span class="eyebrow">CREATIVE STUDIO / PAGE-BY-PAGE</span><h2 id="rv162StudioTitle">Every room can have its own mood.</h2><p>Customize individual sections without changing the global Forest Dusk theme. Page styles can be reset individually and travel with your ordinary backup.</p></div><span class="rv162-local-mark">16 rooms · one home</span></div>
 <div class="rv162-style-grid"><label>Choose a page<select id="rv162Page">${keys.map(v=>`<option value="${v}" ${v===page?'selected':''}>${routes[v]}</option>`).join('')}</select></label><label>Accent<select id="rv162Accent"><option value="">Follow whole-app theme</option>${Object.entries(palette).map(([id,col])=>`<option value="${col}" ${style.accent===col?'selected':''}>${id[0].toUpperCase()+id.slice(1)}</option>`).join('')}</select></label><label>Page atmosphere<select id="rv162Backdrop"><option value="default" ${(!style.backdrop||style.backdrop==='default')?'selected':''}>Theme default</option><option value="mist" ${style.backdrop==='mist'?'selected':''}>Soft mist</option><option value="stars" ${style.backdrop==='stars'?'selected':''}>Star map</option><option value="paper" ${style.backdrop==='paper'?'selected':''}>Clean paper</option></select></label><label>Section spacing<select id="rv162Gap"><option value="default" ${(!style.gap||style.gap==='default')?'selected':''}>Theme default</option><option value="compact" ${style.gap==='compact'?'selected':''}>Compact</option><option value="open" ${style.gap==='open'?'selected':''}>Roomy</option></select></label></div>
 <div class="rv162-page-preview" style="--rv162-preview-accent:${esc(style.accent||data.settings.accent||'#e6a26b')}"><div class="eyebrow">LIVE PAGE SAMPLE</div><strong>${esc(routes[page])}</strong><p>Cards, highlights, and reading space with your chosen page settings.</p><div><span>Something to enjoy</span><span>Something to return to</span></div></div>
 <div class="rv162-actions"><button class="button button-primary" data-action="rv162-page-save">Save this page</button><button class="button button-quiet" data-action="rv162-page-reset">Reset this page</button><button class="button button-quiet" data-action="rv162-page-export">Export my room styles</button><button class="button button-quiet" data-action="rv162-page-import">Import room styles</button></div><input type="file" id="rv162PageFile" hidden accept=".json,application/json"><p class="small-note">Room-style exports contain appearance choices only. They never include journal entries, friend lists, or game history.</p></section>`}
 const snapshot=(data,save,render,toast,fn,msg)=>{const before=JSON.parse(JSON.stringify(data));try{fn();if(!save())throw Error('Unable to save changes.');render();if(msg)toast(msg,'success');return true;}catch(e){for(const k of Object.keys(data))delete data[k];Object.assign(data,before);render();toast(e.message||'Changes were not saved.','error');return false;}};
 function afterRender(view,root,data){if(!root)return;
  const page=pageConfig(data,view);root.style.removeProperty('--accent');root.style.removeProperty('--rv162-page-accent');root.style.removeProperty('--rv162-widget-gap');root.removeAttribute('data-rv162-backdrop');
  if(/^#[0-9a-f]{6}$/i.test(page.accent||'')){root.style.setProperty('--accent',page.accent);root.style.setProperty('--rv162-page-accent',page.accent)}
  if(['mist','stars','paper'].includes(page.backdrop))root.dataset.rv162Backdrop=page.backdrop;
  if(['compact','open'].includes(page.gap))root.style.setProperty('--rv162-widget-gap',page.gap==='compact'?'12px':'26px');
  if(view==='myday'){
   const cfg=config(data),grid=root.querySelector('.hb12-widget-grid');if(grid){grid.classList.add('rv162-board');for(const [key] of Object.entries(widgets)){
    const card=grid.querySelector('.hb12-'+key);if(!card)continue;
    card.dataset.rv162Key=key;card.draggable=true;card.style.order=(data.settings.dayWidgets||[]).indexOf(key)+1;
    card.classList.toggle('rv162-wide',cfg.sizes?.[key]==='wide');
    const bar=card.querySelector('.hb12-widget-head');if(bar&&!bar.querySelector('.rv162-drag'))bar.insertAdjacentHTML('afterbegin',`<span class="rv162-drag" title="Drag to reorder" aria-hidden="true">⠿</span>`);
   }}
  }
  if(view==='backlog')decorateLibrary(root.querySelector('#libraryResults'),data);
  if(view==='clubhouse'){
   const plans=data.clubPlans||[];const target=root.querySelector('.rv16-lists');if(target&&!root.querySelector('.rv162-night-overview')){
    const upcoming=plans.filter(x=>x.when&&!isNaN(Date.parse(x.when))&&Date.parse(x.when)>=Date.now()-86400000).sort((a,b)=>Date.parse(a.when)-Date.parse(b.when)).slice(0,4);
    target.insertAdjacentHTML('beforebegin',`<section class="panel panel-pad rv162-night-overview"><div><span class="eyebrow">CLUBHOUSE / AT A GLANCE</span><h2>Upcoming game nights</h2><p>Only plans you've saved locally. Nothing is sent automatically.</p></div><div class="rv162-night-list">${upcoming.length?upcoming.map(x=>`<div><strong>${esc(x.title)}</strong><span>${esc(new Date(x.when).toLocaleDateString())} · ${esc(x.game||'Game to decide')}</span></div>`).join(''):'<p>No upcoming dates yet. Your plans are ready whenever you are.</p>'}</div></section>`);
   }
  }
  if(view==='fitness'){
   const foods=(data.foodLogs||[]),seen=new Set(),quick=[];
   for(const x of foods){const key=String(x.name||'').toLowerCase().trim();if(key&&!seen.has(key)){seen.add(key);quick.push(x)}if(quick.length>=5)break;}
   const anchor=root.querySelector('.hb10-nutrition .hb-nutri-heading');
   if(anchor&&quick.length&&!root.querySelector('.rv162-food-shortcuts')){
    anchor.insertAdjacentHTML('afterend',`<section class="panel panel-pad rv162-food-shortcuts"><div><span class="eyebrow">FOOD DIARY / QUICK ADD</span><h3>Meals you've logged before</h3><p class="small-note">Copy an earlier entry to the selected diary date. Edit amounts directly in the diary.</p></div><div class="rv162-actions">${quick.map(x=>`<button class="button button-quiet" data-action="rv162-food-repeat" data-id="${esc(x.id)}">+ ${esc(x.name)}</button>`).join('')}</div></section>`);
   }
  }
 }
 function decorateLibrary(root,data){if(!root)return;
  root.querySelectorAll('.rv162-select-game').forEach(x=>x.checked=selected.has(x.value));
  const manager=root.closest('.hb10-library-manager');if(!manager)return;
  let toolbar=manager.querySelector('.rv162-bulk');if(!toolbar){toolbar=document.createElement('div');toolbar.className='rv162-bulk';toolbar.innerHTML=`<span class="rv162-bulk-count" role="status">No titles selected</span><button type="button" data-action="rv162-select-visible" class="button button-quiet">Select visible</button><button type="button" data-action="rv162-select-clear" class="button button-quiet">Clear</button><label>Move selected<select id="rv162BulkStatus" aria-label="New status for selected games"><option value="">Choose status…</option>${['Wishlist','Backlog','Currently Playing','Completed','On Hold','Dropped'].map(x=>`<option>${x}</option>`).join('')}</select></label><button class="button button-primary" data-action="rv162-bulk-apply">Apply status</button><button class="button button-quiet" data-action="rv162-bulk-undo" disabled>Undo</button>`;
   root.before(toolbar);
  }
  const counter=toolbar.querySelector('.rv162-bulk-count');if(counter)counter.textContent=`${selected.size} selected of ${(data.backlog||[]).filter(x=>(x.type||'Game')==='Game').length} saved games`;
  const undo=toolbar.querySelector('[data-action="rv162-bulk-undo"]');if(undo)undo.disabled=!lastBulk;
 }
 function exportJson(name,obj){const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}
 function action(a,el,h){const {data,save,render,toast,uid}=h;const cfg=config(data),v=el.dataset.value,id=el.dataset.id;
  if(a==='rv162-layout'||a==='rv162-layout-reset'){
   const preset=a==='rv162-layout-reset'?'balanced':v;if(!layouts[preset])return;
   const old=JSON.parse(JSON.stringify({widgets:data.settings.dayWidgets,layout:data.settings.dayLayout,rv162:cfg}));
   const ok=snapshot(data,save,render,toast,()=>{data.settings.dayWidgets=[...layouts[preset]];data.settings.dayLayout=preset==='focus'?'minimal':'balanced';cfg.dayPreset=preset;if(a==='rv162-layout-reset')cfg.sizes={};},`${preset==='balanced'?'Everyday':preset} dashboard saved.`);
   if(ok)lastLayout=old;return;
  }
  if(a==='rv162-layout-undo'){if(!lastLayout)return;const old=lastLayout;lastLayout=null;snapshot(data,save,render,toast,()=>{data.settings.dayWidgets=old.widgets;data.settings.dayLayout=old.layout;data.settings.rv162=old.rv162;},'Previous dashboard restored.');return;}
  if(a==='rv162-page-save'||a==='rv162-page-reset'){
   const page=document.getElementById('rv162Page')?.value;if(!routes[page])return;
   const raw={accent:document.getElementById('rv162Accent')?.value||'',backdrop:document.getElementById('rv162Backdrop')?.value||'default',gap:document.getElementById('rv162Gap')?.value||'default'};
   if(raw.accent&&!/^#[0-9a-f]{6}$/i.test(raw.accent))return toast('Invalid accent color.','error');
   snapshot(data,save,render,toast,()=>{cfg.pages=cfg.pages||{};if(a==='rv162-page-reset')delete cfg.pages[page];else cfg.pages[page]=raw;cfg.editorPage=page;},a==='rv162-page-reset'?'Page styling reset.':'Page look saved.');return;
  }
  if(a==='rv162-page-export'){exportJson('rowanvale-room-styles.json',{format:'rowanvale-room-styles',version:1,pages:cfg.pages||{}});toast('Private page-style file downloaded.','success');return}
  if(a==='rv162-page-import'){document.getElementById('rv162PageFile')?.click();return}
  if(a==='rv162-select-visible'){document.querySelectorAll('#libraryResults .rv162-select-game').forEach(x=>selected.add(x.value));decorateLibrary(document.getElementById('libraryResults'),data);return}
  if(a==='rv162-select-clear'){selected.clear();decorateLibrary(document.getElementById('libraryResults'),data);return}
  if(a==='rv162-bulk-apply'){
   const status=document.getElementById('rv162BulkStatus')?.value;const allowed=['Wishlist','Backlog','Currently Playing','Completed','On Hold','Dropped'];if(!allowed.includes(status))return toast('Choose a status first.','error');
   const games=(data.backlog||[]).filter(x=>selected.has(x.id)&&(x.type||'Game')==='Game');if(!games.length)return toast('Select at least one game.','error');
   lastBulk=games.map(x=>({id:x.id,status:x.status}));const count=games.length;
   if(!snapshot(data,save,render,toast,()=>games.forEach(x=>x.status=status),`Updated ${count} games. You can undo this change.`))lastBulk=null;
   return;
  }
  if(a==='rv162-bulk-undo'){
   if(!lastBulk)return;const changes=lastBulk;lastBulk=null;
   snapshot(data,save,render,toast,()=>{for(const change of changes){const x=data.backlog.find(g=>g.id===change.id);if(x)x.status=change.status}},'Previous game statuses restored.');return;
  }
  if(a==='rv162-food-repeat'){
   const entry=(data.foodLogs||[]).find(x=>x.id===id);if(!entry)return;
   const date=document.getElementById('nutritionDate')?.value||new Date().toLocaleDateString('en-CA');
   snapshot(data,save,render,toast,()=>{data.foodLogs.unshift({...entry,id:uid(),day:date,time:new Date().toISOString()})},`Added ${entry.name} to ${date}.`);return;
  }
  if(a==='rv162-fitness-repeat'){
   const entry=(data.fitnessLogs||[]).find(x=>x.id===id);if(!entry)return;
   snapshot(data,save,render,toast,()=>{data.fitnessLogs.unshift({...entry,id:uid(),date:new Date().toISOString()})},'Movement session copied to today.');return;
  }
 }
 function change(e,h){const el=e.target,{data,save,render,toast}=h,cfg=config(data);
  if(el.matches('.rv162-select-game')){el.checked?selected.add(el.value):selected.delete(el.value);decorateLibrary(document.getElementById('libraryResults'),data);return true}
  if(el.matches('.rv162-visible')){
   const id=el.dataset.id;if(!widgets[id])return true;
   snapshot(data,save,render,toast,()=>{const ids=data.settings.dayWidgets||[];data.settings.dayWidgets=el.checked?[...new Set([...ids,id])]:ids.filter(x=>x!==id)},'Dashboard cards updated.');return true;
  }
  if(el.matches('.rv162-size')){
   const id=el.dataset.id;if(!widgets[id])return true;
   snapshot(data,save,render,toast,()=>{cfg.sizes=cfg.sizes||{};cfg.sizes[id]=el.value==='wide'?'wide':'normal'},'Card size saved.');return true;
  }
  if(el.id==='rv162Page'){
   cfg.editorPage=routes[el.value]?el.value:'myday';render();return true; // selection is UI-only until Save
  }
  if(el.id==='rv162PageFile'){
   const file=el.files?.[0];el.value='';if(!file)return true;
   (async()=>{try{
    if(file.size>40000)throw Error('Room style file must be under 40 KB.');
    const obj=JSON.parse(await file.text());if(!obj||obj.format!=='rowanvale-room-styles'||obj.version!==1||!obj.pages||typeof obj.pages!=='object'||Array.isArray(obj.pages))throw Error('Not a Rowanvale room style file.');
    const next={};for(const [key,val] of Object.entries(obj.pages)){
     if(!routes[key]||!val||typeof val!=='object'||Array.isArray(val))continue;
     const accent=/^#[0-9a-f]{6}$/i.test(val.accent||'')?val.accent:'';
     const backdrop=['default','mist','stars','paper'].includes(val.backdrop)?val.backdrop:'default';
     const gap=['default','compact','open'].includes(val.gap)?val.gap:'default';next[key]={accent,backdrop,gap};
    }
    if(!Object.keys(next).length)throw Error('There are no supported page styles in this file.');
    snapshot(data,save,render,toast,()=>{cfg.pages={...(cfg.pages||{}),...next}},`Imported styles for ${Object.keys(next).length} rooms.`);
   }catch(err){toast('Import rejected: '+(err.message||'Invalid file.'),'error')}})();
   return true;
  }
  return false;
 }
 function mountDrag(){document.addEventListener('dragstart',e=>{const card=e.target.closest?.('.rv162-board .hb12-widget');if(!card)return;dragging=card.dataset.rv162Key;card.classList.add('rv162-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragging)});
  document.addEventListener('dragover',e=>{if(dragging&&e.target.closest?.('.rv162-board .hb12-widget'))e.preventDefault()});
  document.addEventListener('dragend',()=>{dragging=null;document.querySelectorAll('.rv162-dragging').forEach(el=>el.classList.remove('rv162-dragging'))});
  // Actual model update is routed through app.js; no uncontrolled storage writes.
 }
 mountDrag();
 let helper=null;
 function bindDrop(getHelper){helper=getHelper;document.addEventListener('drop',e=>{const target=e.target.closest?.('.rv162-board .hb12-widget');if(!target||!dragging)return;e.preventDefault();const source=dragging,goal=target.dataset.rv162Key;dragging=null;if(source===goal||!widgets[source]||!widgets[goal]||!helper)return;
  const h=helper(),{data,save,render,toast}=h;const ids=[...(data.settings.dayWidgets||[])],a=ids.indexOf(source),b=ids.indexOf(goal);if(a<0||b<0)return;
  lastLayout=JSON.parse(JSON.stringify({widgets:ids,layout:data.settings.dayLayout,rv162:config(data)}));ids.splice(a,1);ids.splice(b,0,source);snapshot(data,save,render,toast,()=>{data.settings.dayWidgets=ids;config(data).dayPreset='custom'},'Dashboard cards rearranged.');
 })}
 return {dashboard,studio,afterRender,decorateLibrary,action,change,bindDrop,routes};
})();
