/* 17.4 navigation: reuse the original route controls and pin editor. */
(()=>{'use strict';function setup(){
 const side=document.getElementById('appSidebar');if(!side)return;side.classList.add('rv174-sidebar');
 const route=id=>side.querySelector(`.nav-item[data-view="${id}"]`);
 const labels={media:'Games & Media',books:'Books Directory',myday:'My Day',dashboard:'Overview',quests:'Quests',discover:'Discover Games',backlog:'Game Collection',fitness:'Movement',focus:'Quiet Room',wellness:'Reset Studio',resources:'Offline guides',clubhouse:'Clubhouse',friends:'Friends',connections:'Connections',space:'Your Orbit',customize:'Settings',safety:'Backups & Data',updates:'Help & Updates'};
 const paths={home:'M3 10 12 3l9 7v10H3Z M9 20v-7h6v7',grid:'M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z',check:'m5 12 4 4L19 6',search:'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',book:'M4 3h14v18H4Z M8 3v18',move:'M3 12h4l3-8 4 16 3-8h4',moon:'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11',leaf:'M4 20C1 10 9 4 20 3c0 11-6 18-16 17Z M4 20 16 7',people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-2a7 7 0 0 1 14 0v2 M18 4a4 4 0 0 1 0 8 M19 15a6 6 0 0 1 3 6',link:'m8 16 8-8 M9 7l3-3a5 5 0 0 1 7 7l-3 3 M8 10l-3 3a5 5 0 0 0 7 7l3-3',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z'};
 const icons={media:'grid',books:'book',myday:'home',dashboard:'grid',quests:'check',discover:'search',backlog:'book',fitness:'move',focus:'moon',wellness:'leaf',resources:'book',clubhouse:'people',friends:'people',connections:'link',space:'people',customize:'spark'};
 for(const [id,label] of Object.entries(labels)){const b=route(id);if(!b)continue;b.querySelector('.nav-label').textContent=label;b.title=label;const icon=b.querySelector('.nav-icon');if(icon&&icons[id])icon.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[icons[id]]}"/></svg>`;}
 document.getElementById('sideNav')?.append(route('quests')); /* Media pages remain grouped under Games & Media. */
 const title=side.querySelector('.lw-browse-title span');if(title)title.textContent='YOUR DAY';
 // User-defined shortcuts remain intact; this only changes their presentation.
 const pins=document.getElementById('lwPinBlock'),scroll=document.getElementById('lwNavScroll');if(pins&&scroll)scroll.append(pins);
 const pinTitle=pins?.querySelector('.lw-blockhead span');if(pinTitle)pinTitle.textContent='PINNED';
 const search=document.createElement('button');search.type='button';search.className='rv174-search';search.dataset.action='open-command';search.innerHTML='<span aria-hidden="true">⌕</span><span>Search Rowanvale</span><kbd>Ctrl K</kbd>';search.setAttribute('aria-label','Search Rowanvale, Control K');side.querySelector('.lw-sidehead').after(search);
 const studio=side.querySelector('[data-nav-section="world"]');if(studio)studio.open=true;
 const brand=side.querySelector('.brand');brand.addEventListener('click',e=>{e.preventDefault();route('myday')?.click()});brand.setAttribute('aria-label','Rowanvale — open My Day');
 for(const d of side.querySelectorAll('details.nav-section')){const s=d.querySelector('summary');if(s)s.setAttribute('aria-label',s.textContent.trim());}
 const groups=[...side.querySelectorAll('details.nav-section')].filter(d=>['games','reset','social'].includes(d.dataset.navSection));
 // Only one secondary group is expanded; opening a group never changes page.
 const current=side.querySelector('.nav-item.active')?.closest('details.nav-section');
 for(const d of groups)d.open=d===current;
 for(const d of groups)d.querySelector('summary').addEventListener('click',()=>{if(!d.open)for(const other of groups)if(other!==d)other.open=false},true);
 let previousRoute=null;
 function sync(){const active=side.querySelector('.nav-item.active');if(active?.dataset.view!==previousRoute){previousRoute=active?.dataset.view;const group=active?.closest('details.nav-section');for(const d of groups)d.open=d===group;}for(const b of side.querySelectorAll('.nav-item')){if(b.classList.contains('active'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}}
 const observer=new MutationObserver(sync);side.querySelectorAll('.nav-item').forEach(b=>observer.observe(b,{attributes:true,attributeFilter:['class']}));sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();})();
