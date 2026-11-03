/* Rowanvale 14 Desktop Navigator: additive, safe for existing profile data. */
(()=>{
 'use strict';
 const KEY='liltwood.sidebar.v14';
 const routes={myday:'My Day',dashboard:'Home',discover:'Discover',backlog:'Collection',watch:'Movies, Anime & TV',fan:'Fan Lounge',quests:'Quest Circuit',fitness:'Fitness & Movement',focus:'Quiet Room',wellness:'Reset Studio',resources:'Offline Guides',clubhouse:'Clubhouse',friends:'Friends',connections:'Connections',space:'Your Orbit',customize:'Profile Studio',safety:'Data & Beta',updates:'Update Center'};
 const ids=Object.keys(routes), groups=['games','reset','social','world','tools'];
 let preferences={pins:['myday','discover','focus'],open:['games','reset']};
 const $=id=>document.getElementById(id);
 try{let stored=JSON.parse(localStorage.getItem(KEY)||'{}');if(Array.isArray(stored.pins))preferences.pins=[...new Set(stored.pins.filter(id=>ids.includes(id)))].slice(0,5);if(Array.isArray(stored.open))preferences.open=stored.open.filter(id=>groups.includes(id));}catch{}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(preferences))}catch{}};
 function renderPins(){const outlet=$('lwPinned');if(!outlet)return;outlet.replaceChildren();for(const id of preferences.pins){const btn=document.createElement('button');btn.type='button';btn.className='lw-pin-item';btn.dataset.view=id;btn.textContent=routes[id];outlet.append(btn);}const block=$('lwPinBlock');if(block)block.dataset.empty=preferences.pins.length?'false':'true';syncActive();}
 function syncActive(){document.querySelectorAll('.lw-pin-item').forEach(button=>{const original=document.querySelector(`#appSidebar .nav-item[data-view="${button.dataset.view}"]`);const active=original?.classList.contains('active')||false;button.classList.toggle('active',active);if(active&&button.getAttribute('aria-current')!=='page')button.setAttribute('aria-current','page');else if(!active&&button.hasAttribute('aria-current'))button.removeAttribute('aria-current');});}
 function showEditor(){const dlg=$('lwPinDialog'),outlet=$('lwPinOptions');if(!dlg||!outlet)return;outlet.replaceChildren();for(const [id,name] of Object.entries(routes)){const row=document.createElement('label');row.className='lw-pin-row';const input=document.createElement('input');input.type='checkbox';input.value=id;input.checked=preferences.pins.includes(id);const text=document.createElement('span');text.textContent=name;row.append(input,text);outlet.append(row);input.addEventListener('change',()=>{const all=[...outlet.querySelectorAll('input:checked')];if(all.length>5){input.checked=false;outlet.dataset.message='Choose up to five shortcuts.';return;}outlet.dataset.message='';preferences.pins=all.map(c=>c.value);save();renderPins();});}if(!dlg.open)dlg.showModal();}
 function filterNav(){const q=($('lwSidebarSearch')?.value||'').trim().toLocaleLowerCase();$('lwClearSearch').hidden=!q;const nav=$('appSidebar');nav.classList.toggle('lw-searching',!!q);let results=0;for(const item of nav.querySelectorAll('.sidebar-nav-scroll .nav-item')){const label=item.querySelector('.nav-label')?.textContent||'';const match=!q||label.toLocaleLowerCase().includes(q);item.hidden=!match;if(match)results++;}for(const d of nav.querySelectorAll('.nav-section')){const any=[...d.querySelectorAll('.nav-item')].some(x=>!x.hidden);d.hidden=!!q&&!any;if(q&&any)d.open=true;else if(!q)d.open=preferences.open.includes(d.dataset.navSection);}const empty=$('lwNoResults');if(empty)empty.hidden=!q||!!results;}
 function initialize(){
   if(!$('lwPinned'))return;
   // Group open state saves only on real user summaries, not when app auto-expands the current route.
   for(const d of document.querySelectorAll('#hb12NavGroups details')){
     d.open=preferences.open.includes(d.dataset.navSection);
     const heading=d.querySelector('summary');heading?.addEventListener('click',()=>{const isOpen=d.open;requestAnimationFrame(()=>{if(isOpen)preferences.open=preferences.open.filter(x=>x!==d.dataset.navSection);else if(!preferences.open.includes(d.dataset.navSection))preferences.open.push(d.dataset.navSection);save()})});
   }
   renderPins();
   $('lwEditPins')?.addEventListener('click',showEditor);
   $('lwPinDone')?.addEventListener('click',()=>$('lwPinDialog')?.close());
   $('lwPinClose')?.addEventListener('click',()=>$('lwPinDialog')?.close());
   $('lwPinReset')?.addEventListener('click',()=>{preferences.pins=['myday','discover','focus'];save();renderPins();$('lwPinDialog')?.close()});
   $('lwSidebarSearch')?.addEventListener('input',filterNav);
   $('lwClearSearch')?.addEventListener('click',()=>{$('lwSidebarSearch').value='';filterNav();$('lwSidebarSearch').focus()});
   document.addEventListener('click',e=>{if(e.target.closest('#lwDownloadBug')){const d=$('lwBugDescription')?.value.trim()||'',steps=$('lwBugSteps')?.value.trim()||'';if(!d){$('lwBugDescription')?.focus();return}const route=document.querySelector('#appSidebar .nav-item[aria-current="page"]')?.dataset.view||'unknown';const report=`ROWANVALE LOCAL BETA · ISSUE REPORT\nVersion: ${window.ROWANVALE_VERSION||'unknown'}\nDate: ${new Date().toISOString()}\nRoute: ${route}\nScreen: ${innerWidth} x ${innerHeight}
Display pixel ratio: ${devicePixelRatio}\nBrowser: ${navigator.userAgent}\nImpact: ${$('lwBugImpact')?.value||''}\n\nWhat happened:\n${d}\n\nHow to reproduce:\n${steps}\n\nThis report is stored on your computer until you choose to share it.\n`;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([report],{type:'text/plain'}));a.href=u;a.download='rowanvale-beta-issue.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}});
   // Preserve search context until the user navigates, then return to a complete sidebar.
   document.addEventListener('click',e=>{if(e.target.closest('#appSidebar [data-view]')&&$('lwSidebarSearch')?.value){$('lwSidebarSearch').value='';filterNav()}},true);
   const watcher=new MutationObserver(mutations=>{if(mutations.some(m=>m.target.matches?.('.nav-item')))syncActive();});watcher.observe($('appSidebar'),{subtree:true,attributes:true,attributeFilter:['aria-current']});
   // We do not duplicate the game's router or store any profile data here.
   syncActive();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
