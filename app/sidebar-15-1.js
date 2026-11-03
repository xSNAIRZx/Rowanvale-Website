/* Rowanvale 15.0.1: progressive desktop navigation. Adds no new account or data schema. */
(()=>{
 'use strict';
 const areas={
  today:{label:'YOUR HOME',name:'Today',main:'myday',routes:[['myday','My Day'],['dashboard','Home Base']]},
  games:{label:'GAMES & MEDIA',name:'Games & Media',main:'media',routes:[['media','Games & Media Hub'],['discover','Discover Games'],['backlog','My Game Collection'],['watch','Movies, Anime & TV'],['books','Books Directory'],['fan','Fan Lounge'],['quests','Quest Circuit']]},
  balance:{label:'REST & MOVEMENT',name:'Balance',main:'focus',routes:[['fitness','Fitness & Movement'],['focus','Quiet Room'],['wellness','Reset Studio'],['resources','Offline Guides']]},
  people:{label:'YOUR PEOPLE',name:'People',main:'friends',routes:[['clubhouse','Clubhouse'],['friends','Friends'],['connections','Connections'],['space','Your Orbit']]},
  studio:{label:'MAKE IT YOURS',name:'Studio',main:'customize',routes:[['customize','Profile Studio & Themes']]}
 };
 const sectionByArea={games:'games',balance:'reset',people:'social',studio:'world'};
 const routeArea=Object.fromEntries(Object.entries(areas).flatMap(([key,item])=>item.routes.map(([route])=>[route,key])));
 const sidebar=document.getElementById('appSidebar'), shell=document.getElementById('appShell');
 if(!sidebar||!shell)return;
 const primary=Array.from(sidebar.querySelectorAll('.rv-area-button')),
       flyout=document.getElementById('rvAreaFlyout'), flyoutLinks=document.getElementById('rvFlyoutLinks');
 const narrow=()=>matchMedia('(min-width: 761px)').matches && shell.classList.contains('sidebar-collapsed');
 let selectedArea='today', trigger=null;
 const navRoute=route=>{ // Route through the existing app controller, without duplicating app state.
  const original=sidebar.querySelector(`.nav-item[data-view="${route}"]`);
  if(original){original.click();return true;}return false;
 };
 function setArea(area,{focus=false}={}){
  if(!areas[area])return;
  selectedArea=area; sidebar.dataset.rvArea=area;
  const title=document.getElementById('rvAreaTitle');if(title)title.textContent=areas[area].label;
  primary.forEach(button=>{
   const active=button.dataset.rvArea===area;
   button.classList.toggle('is-current',active);
   button.setAttribute('aria-pressed',String(active));
   button.setAttribute('aria-expanded',String(narrow()&&active&&!flyout.hidden));
  });
  const details=sidebar.querySelector(`.nav-section[data-nav-section="${sectionByArea[area]||''}"]`);
  if(details)details.open=true;
  if(focus)sidebar.querySelector(`.rv-area-button[data-rv-area="${area}"]`)?.focus();
 }
 function closeFlyout({returnFocus=false}={}){
  if(!flyout||flyout.hidden)return;
  flyout.hidden=true;
  primary.forEach(b=>b.setAttribute('aria-expanded','false'));
  if(returnFocus&&trigger?.isConnected)trigger.focus();trigger=null;
 }
 function openFlyout(area,source){
  if(!flyout||!flyoutLinks)return;
  if(!areas[area])return;
  const wasOpen=!flyout.hidden&&selectedArea===area;
  closeFlyout();setArea(area);
  if(wasOpen)return;
  trigger=source;
  document.getElementById('rvFlyoutTitle').textContent=areas[area].name;
  flyoutLinks.replaceChildren();
  const active=sidebar.querySelector('.nav-item.active')?.dataset.view;
  for(const [route,label] of areas[area].routes){
   const b=document.createElement('button');b.type='button';b.className='rv-flyout-link';
   b.textContent=label;b.dataset.rvRoute=route;
   if(route===active){b.classList.add('is-current');b.setAttribute('aria-current','page');}
   flyoutLinks.appendChild(b);
  }
  flyout.hidden=false;
  source.setAttribute('aria-expanded','true');
  flyoutLinks.querySelector('.is-current')?.focus()||flyoutLinks.querySelector('button')?.focus();
 }
 function syncRoute(){
  const route=sidebar.querySelector('.nav-item.active')?.dataset.view;
  if(route&&routeArea[route]){
    setArea(routeArea[route]);
    if(!flyout.hidden)closeFlyout();
  }
 }
 const svg=(paths)=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
 const icons={
   today:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/>',
   games:'<path d="M6 9h12a4 4 0 0 1 3.8 3l1.1 5a3 3 0 0 1-4.8 3L15 17H9l-3.1 3a3 3 0 0 1-4.8-3L2.2 12A4 4 0 0 1 6 9Z"/><path d="M7 12v5M4.5 14.5h5"/><path d="M16 13h.01M19 15h.01"/>',
   balance:'<path d="M20 4c-10 .5-16 5-16 12a4 4 0 0 0 4 4c7 0 11.5-7 12-16Z"/><path d="M4 20c2-5 6-9 12-12"/>',
   people:'<circle cx="9" cy="8" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2zM16 5a3 3 0 0 1 0 6M18 15a6 6 0 0 1 4 6"/>',
   studio:'<path d="m12 2 2.1 6 6 2.1-6 2.1-2.1 6-2.1-6L3.8 10.1l6.1-2.1z"/><path d="m19 17 .7 2 .3.3 2 .7-2 .7-.3.3-.7 2-.7-2-.3-.3-2-.7 2-.7.3-.3z"/>'
 };
 const toolIcons={
   'open-command':'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
   'open-pulse':'<path d="M4 12h4l3-8 4 16 3-8h2"/>',
   'safety':'<path d="M3 7h18v14H3zM3 7l3-4h12l3 4M9 12h6M12 9v6"/>',
   'updates':'<circle cx="12" cy="12" r="9"/><path d="M10 9a2 2 0 1 1 4 0c0 2-2 2-2 4M12 17h.01"/>'
 };
 function init(){
  primary.forEach(b=>{const i=b.querySelector('.rv-area-icon');if(i&&icons[b.dataset.rvArea])i.innerHTML=svg(icons[b.dataset.rvArea]);});
  sidebar.querySelectorAll('.rv-rail-tool').forEach(b=>{const key=b.dataset.action||b.dataset.view,i=b.querySelector('span');if(i&&toolIcons[key])i.innerHTML=svg(toolIcons[key]);});
  const scroll=document.getElementById('lwNavScroll');
  const pins=document.getElementById('lwPinBlock');
  if(scroll&&pins)scroll.appendChild(pins); // Existing pin editor and stored shortcuts remain unchanged.
  setArea('today'); syncRoute();
  primary.forEach(button=>button.addEventListener('click',()=>{
    const area=button.dataset.rvArea;
    if(narrow())openFlyout(area,button);
    else {closeFlyout();setArea(area);navRoute(areas[area].main);}
  }));
  flyoutLinks?.addEventListener('click',event=>{
    const item=event.target.closest('[data-rv-route]');if(!item)return;
    navRoute(item.dataset.rvRoute);closeFlyout();
  });
  document.getElementById('rvFlyoutClose')?.addEventListener('click',()=>closeFlyout({returnFocus:true}));
  sidebar.addEventListener('click',event=>{
   if(!event.target.closest('#rvAreaFlyout')&&!event.target.closest('.rv-area-button')&&event.target.closest('[data-view]')){
      closeFlyout();queueMicrotask(syncRoute);
   }
  });
  document.addEventListener('pointerdown',e=>{
   if(!flyout.hidden&&!e.target.closest('#rvAreaFlyout')&&!e.target.closest('.rv-area-button'))closeFlyout();
  });
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&!flyout.hidden){event.stopPropagation();closeFlyout({returnFocus:true});}
  },true);
  const watcher=new MutationObserver(ms=>{
    if(ms.some(m=>m.target.matches?.('#appSidebar .nav-item')))queueMicrotask(syncRoute);
  });
  // Only observe original route nodes, never primary active state: avoids observer recursion.
  const targets=sidebar.querySelectorAll('.nav-item[data-view]');
  targets.forEach(t=>watcher.observe(t,{attributes:true,attributeFilter:['class']}));
  document.getElementById('sidebarToggle')?.addEventListener('click',()=>{
    closeFlyout();requestAnimationFrame(()=>setArea(selectedArea));
  });
  matchMedia('(min-width: 761px)').addEventListener?.('change',()=>closeFlyout());
  window.addEventListener('resize',()=>{if(!narrow())closeFlyout()},{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
