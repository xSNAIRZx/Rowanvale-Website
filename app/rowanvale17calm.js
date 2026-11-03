/* Rowanvale 17: calmer all-page presentation and progressive Studio navigation. */
const RV17Calm=(()=>{
 'use strict';
 const labels={start:'Start here',looks:'Themes & looks',pages:'Page styles',lab:'Design Lab',comfort:'Comfort',advanced:'Advanced'};
 const groups={start:['.hb13-customizer-hub'],looks:['.rv16-studio','.hb12-theme-studio'],pages:['.rv162-page-studio'],lab:['.rv161-studio'],comfort:['.hb12-support-studio'],advanced:['.hb13-advanced-tools']};
 let latest=null;
 document.addEventListener('click',e=>{const trigger=e.target.closest('[data-action="hb12-theme-open"],[data-action="hb12-support-open"]');if(!trigger||!latest)return;const target=trigger.dataset.action==='hb12-theme-open'?'looks':'comfort';settingsChange('studioTab',target);},true);
 const get=data=>{const src=data.settings.rv17calm;if(!src||typeof src!=='object'||Array.isArray(src))data.settings.rv17calm={};const p=data.settings.rv17calm;p.studioTab=Object.hasOwn(labels,p.studioTab)?p.studioTab:'start';p.quiet=p.quiet===true;return p};
 function paintQuiet(data){document.body.classList.toggle('rv17calm-quiet',get(data).quiet)}
 function settingsChange(k,value){if(!latest)return false;const {data,save,toast}=latest,p=get(data),old=p[k];p[k]=value;if(!save()){p[k]=old;toast?.('Could not save that preference. Your previous choice remains.','error');return false}return true}
 function setupQuiet(root,data){const old=root.querySelector('.hb11-context-tools');if(!old)return;
  const btn=document.createElement('button');btn.type='button';btn.className='rv17calm-switch';btn.id='rv17calmToggle';btn.setAttribute('aria-label','Toggle calm presentation across Rowanvale');btn.title='Hide decorative scenery and background effects; keep pages and tools';
  const refresh=()=>{const on=get(data).quiet;btn.setAttribute('aria-pressed',String(on));btn.innerHTML=`<span aria-hidden="true">${on?'◉':'◯'}</span> ${on?'Calm view on':'Calm view off'}`};refresh();
  btn.addEventListener('click',()=>{if(settingsChange('quiet',!get(data).quiet)){paintQuiet(data);refresh();latest.toast?.(get(data).quiet?'Calm view on. Decorative scenery and background effects are hidden.':'Calm view off. Your normal presentation is restored.')}});
  old.append(btn);
 }
 function setupStudio(root,data){
  root.classList.add('rv17calm-studio');
  const headline=root.querySelector('.page-heading');
  const top=document.createElement('section');top.className='rv17calm-studio-hub panel';top.setAttribute('aria-labelledby','rv17calmTitle');
  top.innerHTML='<div class="rv17calm-hub-head"><div><span class="eyebrow">CREATIVE STUDIO / YOUR WAY</span><h1 id="rv17calmTitle">Change one thing, or change everything.</h1><p>Start with a look you love. Every advanced control is still here whenever you need it.</p></div><span class="rv17calm-keep">Saved on this device</span></div><div class="rv17calm-tabs" role="tablist" aria-label="Customization categories"></div><p class="rv17calm-hint" id="rv17calmHint" role="status"></p>';
  const slots=document.createElement('div');slots.className='rv17calm-sections';
  for(const [id,selectors] of Object.entries(groups)){
   const pane=document.createElement('section');pane.id='rv17calm-panel-'+id;pane.className='rv17calm-pane';pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby','rv17calm-tab-'+id);pane.tabIndex=0;
   for(const selector of selectors){const el=root.querySelector(selector);if(el)pane.append(el)}
   if(id==='advanced'&&get(data).editorMode!=='advanced'&&data.settings.editorMode!=='advanced')pane.insertAdjacentHTML('afterbegin','<div class="rv17calm-guide"><div><h2>Advanced controls are tucked away.</h2><p>Turn on Advanced when you want the full set of profile, data, and connection tools. No settings will reset.</p></div><div class="rv17calm-quick"><button type="button" data-rv17calm-enable-advanced>Show advanced controls ↗</button></div></div>');
   if(id==='start')pane.insertAdjacentHTML('afterbegin','<div class="rv17calm-guide"><div><h2>Make yourself at home.</h2><p>A whole new look is one click away. Or fine-tune just the things you care about.</p></div><div class="rv17calm-quick"><button type="button" data-rv17calm-open="looks">Choose a complete look ↗</button><button type="button" data-rv17calm-open="comfort">Make things quieter ↗</button></div></div>');
   slots.append(pane);
  }
  const tabs=top.querySelector('[role=tablist]');
  for(const [id,label] of Object.entries(labels)){
   const b=document.createElement('button');b.id='rv17calm-tab-'+id;b.type='button';b.role='tab';b.textContent=label;b.dataset.rv17calmTab=id;b.setAttribute('aria-controls','rv17calm-panel-'+id);tabs.append(b);
  }
  const open=(id,focus=false)=>{
   if(!Object.hasOwn(labels,id))id='start';
   for(const pane of slots.children){const shown=pane.id==='rv17calm-panel-'+id;pane.hidden=!shown;pane.setAttribute('aria-hidden',String(!shown))}
   for(const tab of tabs.children){const chosen=tab.dataset.rv17calmTab===id;tab.setAttribute('aria-selected',String(chosen));tab.tabIndex=chosen?0:-1}
   const msg={start:'Simple choices first.',looks:'Choose from all your saved and built-in looks.',pages:'Customize one area without changing everything.',lab:'Preview adjustments before applying them.',comfort:'Set your preferred reading and stimulation levels.',advanced:'All original detailed controls are here.'};
   top.querySelector('#rv17calmHint').textContent=msg[id];
   if(focus){tabs.querySelector('[data-rv17calm-tab="'+id+'"]').focus({preventScroll:true});top.scrollIntoView({block:'start',behavior:'instant'})}
  };
  tabs.addEventListener('click',event=>{const b=event.target.closest('[data-rv17calm-tab]');if(!b)return;const id=b.dataset.rv17calmTab;if(settingsChange('studioTab',id))open(id)});
  tabs.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const ids=Object.keys(labels),pos=ids.indexOf(get(data).studioTab);let next=event.key==='Home'?0:event.key==='End'?ids.length-1:(pos+(event.key==='ArrowRight'?1:-1)+ids.length)%ids.length;
   if(settingsChange('studioTab',ids[next]))open(ids[next],true);
  });
  slots.addEventListener('click',e=>{if(e.target.closest('[data-rv17calm-enable-advanced]')){root.querySelector('[data-action="editor-mode"][data-value="advanced"]')?.click();return}const b=e.target.closest('[data-rv17calm-open]');if(b){const id=b.dataset.rv17calmOpen;if(settingsChange('studioTab',id))open(id,true)}});
  if(headline)headline.hidden=true; // Original text is preserved in the DOM; updated clear heading is shown here.
  root.querySelector('.rv163-studio-nav')?.setAttribute('hidden',''); // Replaced by categories; all linked tools remain.
  root.querySelector('.rv161-page-outline')?.setAttribute('hidden',''); // Its anchors otherwise jump into closed sections.
  const before=root.querySelector('.rv162-page-studio,.rv161-studio,.rv16-studio,.hb13-customizer-hub,.hb12-support-studio,.hb12-theme-studio,.hb13-advanced-tools,.rv16-route-tools');
  if(before)before.before(top,slots);else root.append(top,slots);
  open(get(data).studioTab);
 }
 function afterRender(view,root,data,save,render,go,toast){latest={view,root,data,save,toast};paintQuiet(data);setupQuiet(root,data);if(view==='customize')setupStudio(root,data)}
 return {afterRender,get};
})();
