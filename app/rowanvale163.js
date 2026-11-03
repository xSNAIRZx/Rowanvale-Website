/* Rowanvale 16.3: The Flow Update. Additive usability enhancements; no cloud or accounts required. */
const RV163 = (() => {
  'use strict';
  const routes = {
    myday:'My Day', dashboard:'Home Base', discover:'Find a game', backlog:'My collection',
    quests:'Quest Circuit', focus:'Quiet Room', fitness:'Movement & Food', wellness:'Reset Studio',
    resources:'Offline Guides', clubhouse:'Clubhouse', friends:'Friends', connections:'Connections',
    space:'Your Orbit', customize:'Creative Studio', safety:'Data & Backups', updates:'Updates & Help'
  };
  const ESC = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const preference = data => { if (!data.settings.rv163 || typeof data.settings.rv163!=='object' || Array.isArray(data.settings.rv163)) data.settings.rv163={}; return data.settings.rv163; };
  const tasks = [
    {label:'Find something to play',detail:'Search 4,010 offline titles',view:'discover',focus:'gameSearch',icon:'🎮'},
    {label:'Open my collection',detail:'Continue or organize saved games',view:'backlog',icon:'📚'},
    {label:'Make a quest',detail:'Create a small goal',view:'quests',action:'new-quest',icon:'✦'},
    {label:'Take a quiet moment',detail:'No pressure, just a reset',view:'focus',icon:'🌿'},
    {label:'Log a meal',detail:'Add food to today',view:'fitness',action:'food-open',icon:'🥗'},
    {label:'Log movement',detail:'Keep track of an activity',view:'fitness',action:'fitness-log-open',icon:'↗'},
    {label:'Plan a game night',detail:'Use the offline Clubhouse',view:'clubhouse',icon:'☾'},
    {label:'Change my space',detail:'Colors, layouts, and profiles',view:'customize',icon:'🎨'},
    {label:'Browse offline recipes',detail:'Find and save 43 meals without internet',view:'resources',focus:'rv163RecipeSearch',icon:'🍳'}
  ];
  const escTask = task => `<button type="button" class="rv163-task" data-rv163-task="${tasks.indexOf(task)}"><span class="rv163-task-icon" aria-hidden="true">${task.icon}</span><span><b>${ESC(task.label)}</b><small>${ESC(task.detail)}</small></span><span aria-hidden="true">↗</span></button>`;
  let currentView='myday', currentGo=null, currentData=null, currentSave=null, currentRender=null, currentToast=null;
  const routeHistory=[];
  function quickPanel(){
    let dlg=document.getElementById('rv163GoDialog');if(dlg)return dlg;
    dlg=document.createElement('dialog');dlg.id='rv163GoDialog';dlg.className='rv163-go-dialog';dlg.setAttribute('aria-labelledby','rv163GoTitle');
    dlg.innerHTML=`<div class="rv163-go-title"><div><span class="eyebrow">ROWANVALE / QUICK PATHS</span><h2 id="rv163GoTitle">Where to?</h2><p>Pick one thing. Every page is still here.</p></div><button class="rv163-go-close" type="button" aria-label="Close quick paths">×</button></div><label class="rv163-search-label" for="rv163GoSearch">Search pages and actions<input id="rv163GoSearch" autocomplete="off" placeholder="Games, meals, quests, themes…"></label><div class="rv163-go-list" id="rv163GoList"></div><p class="rv163-go-tip">Tip: Alt + G opens Quick Paths anywhere in the app. Escape closes it.</p>`;
    document.body.append(dlg);
    dlg.querySelector('.rv163-go-close').addEventListener('click',()=>dlg.close());
    dlg.querySelector('#rv163GoSearch').addEventListener('input',()=>populate());
    dlg.querySelector('#rv163GoSearch').addEventListener('keydown',e=>{
      if(e.key==='Enter'){const first=dlg.querySelector('.rv163-go-list button:not([hidden])');if(first){e.preventDefault();first.click();}}
    });
    dlg.querySelector('.rv163-go-list').addEventListener('click',e=>{
      const task=e.target.closest('[data-rv163-task]');const route=e.target.closest('[data-rv163-route]');
      if(task){const choice=tasks[+task.dataset.rv163Task];dlg.close();execute(choice)}
      else if(route){const dest=route.dataset.rv163Route;dlg.close();if(routes[dest])currentGo?.(dest)}
    });
    return dlg;
  }
  function populate(){const dlg=quickPanel(),input=dlg.querySelector('#rv163GoSearch');const q=input.value.trim().toLowerCase();const taskResults=tasks.filter(t=>(t.label+' '+t.detail+' '+t.view).toLowerCase().includes(q));
    const routeResults=Object.entries(routes).filter(([k,v])=>(k+' '+v).toLowerCase().includes(q));
    const recent=[...routeHistory].reverse().filter((v,i,a)=>a.indexOf(v)===i).slice(0,4);
    let html='';if(!q&&recent.length)html+=`<div class="rv163-go-group">Recently visited</div>${recent.map(k=>`<button class="rv163-go-route" type="button" data-rv163-route="${k}"><span>${ESC(routes[k])}</span><span aria-hidden="true">↗</span></button>`).join('')}`;
    if(taskResults.length)html+=`<div class="rv163-go-group">Things to do</div>${taskResults.map(escTask).join('')}`;
    if(routeResults.length)html+=`<div class="rv163-go-group">All spaces</div>${routeResults.map(([k,v])=>`<button class="rv163-go-route" type="button" data-rv163-route="${k}"><span>${ESC(v)}</span><span aria-hidden="true">↗</span></button>`).join('')}`;
    dlg.querySelector('#rv163GoList').innerHTML=html||'<p class="rv163-no-match">No match. Try a shorter word or use the sidebar.</p>';
  }
  function showQuick(){if(document.getElementById('appShell')?.hidden)return;const dlg=quickPanel();dlg.querySelector('#rv163GoSearch').value='';populate();if(!dlg.open)dlg.showModal();dlg.querySelector('#rv163GoSearch').focus();}
  function execute(task){if(!task||!currentGo)return;currentGo(task.view);if(task.focus){const input=document.getElementById(task.focus);if(input){input.scrollIntoView({behavior:'instant',block:'center'});input.focus({preventScroll:true})}}
    if(task.action){const control=document.querySelector(`#viewRoot [data-action="${task.action}"]`);if(control)control.click();else currentToast?.('Open that tool from this page.','info')}
  }
  function moveTo(node,target){if(node&&target)target.append(node)}
  function renderMyDay(root,data,save){const editor=root.querySelector('.rv162-workbench');if(!editor)return;
    const cfg=preference(data);
    const details=document.createElement('details');details.id='rv163EditDay';details.className='rv163-edit-day';details.open=cfg.dayEditorOpen===true;
    details.innerHTML=`<summary><span aria-hidden="true">⚙</span><span><strong>Edit dashboard</strong><small>Layouts, card order, sizes and visibility</small></span><span class="rv163-summary-arrow" aria-hidden="true">⌄</span></summary>`;
    editor.before(details);moveTo(editor,details);
    details.addEventListener('toggle',()=>{if(!currentData||currentView!=='myday')return;const s=preference(currentData);if(s.dayEditorOpen!==details.open){s.dayEditorOpen=details.open;if(!save())currentToast?.('Could not remember your dashboard preference.','error')}});
    const starter=document.createElement('section');starter.className='rv163-starter panel';starter.innerHTML=`<div class="rv163-starter-head"><div><span class="eyebrow">THE SHORTCUT SHELF</span><h2>What feels right today?</h2><p>Go straight to it. You can always explore everything else.</p></div><button type="button" class="rv163-open-quick button button-quiet">All quick paths ↗</button></div><div class="rv163-starter-grid">${[0,1,2,3,4,5].map(i=>escTask(tasks[i])).join('')}</div>`;
    const hero=root.querySelector('.rv-home-hero,.hb12-day-hero,.rv15-day-hero,.home-command-hero,.hb12-day-intro,.hb12-myday');
    if(hero&&!hero.contains(starter)){hero.after(starter);starter.after(details)}else details.after(starter);
    starter.querySelector('.rv163-open-quick').addEventListener('click',showQuick);
    starter.querySelector('.rv163-starter-grid').addEventListener('click',e=>{const btn=e.target.closest('[data-rv163-task]');if(btn)execute(tasks[+btn.dataset.rv163Task])});
  }
  function smallRouteBar(root,view,data,save){
    const sets={discover:{label:'Game Discovery',target:'#gameSearch',actionLabel:'Search games',hide:['.discover-hero','.discover-stats']},wellness:{label:'Reset Studio',target:'.wellness-checkin',actionLabel:'Check in',hide:['.wellness-hero']},fitness:{label:'Movement & Nutrition',target:'#fitnessLogForm, [data-action="fitness-log-open"]',actionLabel:'Log movement',hide:['.fitness-hero']},resources:{label:'Offline kitchen',target:'#rv163RecipeSearch',actionLabel:'Find a recipe',hide:['.hb12-resources-intro']}};
    const c=sets[view];if(!c)return;
    const cfg=preference(data);cfg.quickBrowse=cfg.quickBrowse&&typeof cfg.quickBrowse==='object'&&!Array.isArray(cfg.quickBrowse)?cfg.quickBrowse:{};
    if(view==='resources'&&typeof cfg.quickBrowse.resources!=='boolean')cfg.quickBrowse.resources=true;
    const minimized=cfg.quickBrowse[view]===true;
    const box=document.createElement('div');box.className='rv163-skip panel';box.innerHTML=`<span class="rv163-skip-label">${ESC(c.label)}</span><div class="rv163-skip-actions"><button class="button button-primary" type="button" data-rv163-jump>${ESC(c.actionLabel)} ↗</button>${view==='fitness'?'<button class="button button-quiet" type="button" data-rv163-food>Log food ↗</button>':''}<button class="button button-quiet" type="button" data-rv163-compact aria-pressed="${minimized}">${minimized?'Show inspiration':'Show less intro'}</button></div>`;
    const head=root.querySelector('.page-heading');head?.after(box);
    const apply=()=>root.classList.toggle('rv163-compact-'+view,!!cfg.quickBrowse[view]);apply();
    box.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.hasAttribute('data-rv163-jump')){
        const el=root.querySelector(c.target);if(!el)return;el.scrollIntoView({behavior:'instant',block:'start'});if(el.matches('input,textarea,button'))el.focus({preventScroll:true});
      } else if(b.hasAttribute('data-rv163-food'))root.querySelector('[data-action="food-open"]')?.click();
      else if(b.hasAttribute('data-rv163-compact')){
        cfg.quickBrowse[view]=!cfg.quickBrowse[view];if(save()){
          b.setAttribute('aria-pressed',String(cfg.quickBrowse[view]));b.textContent=cfg.quickBrowse[view]?'Show inspiration':'Show less intro';apply();
        }else{cfg.quickBrowse[view]=!cfg.quickBrowse[view];currentToast?.('Could not save the view preference.','error')}
      }
    });
  }
  function studioNav(root){const tabs=[['Page styles','.rv162-page-studio'],['Design Lab','#rv161DesignLab'],['Saved looks','#rv16Studio'],['Simple setup','.hb13-customizer-hub'],['Theme gallery','.hb12-theme-studio, .hb12-theme-settings']];
    const panel=document.createElement('nav');panel.className='rv163-studio-nav panel';panel.setAttribute('aria-label','Creative Studio sections');panel.innerHTML='<div><span class="eyebrow">YOUR CREATIVE TOOLKIT</span><b>What would you like to change?</b></div><div class="rv163-studio-shortcuts"></div>';
    const bar=panel.querySelector('.rv163-studio-shortcuts');for(const [name,target] of tabs){if(!root.querySelector(target))continue;const btn=document.createElement('button');btn.type='button';btn.textContent=name+' ↗';btn.addEventListener('click',()=>{const dest=root.querySelector(target);dest.scrollIntoView({behavior:'instant',block:'start'});const focus=dest.querySelector('h2,select,input');if(focus){if(!focus.hasAttribute('tabindex')&&!focus.matches('input,select'))focus.tabIndex=-1;focus.focus({preventScroll:true})}});bar.append(btn)}
    const first=root.querySelector('.rv162-page-studio');if(first)first.before(panel);
  }
  function insertQuickLauncher(){const header=document.querySelector('.command-launch');if(!header||document.getElementById('rv163Launcher'))return;
    const btn=document.createElement('button');btn.id='rv163Launcher';btn.className='rv163-launcher';btn.type='button';btn.title='Quick Paths (Alt + G)';btn.setAttribute('aria-label','Open quick paths to pages and common tasks');btn.innerHTML='<span aria-hidden="true">✦</span><span>Quick paths</span>';
    (document.getElementById('shellAccountMenu')||document.querySelector('.topbar .top-actions')||header.parentElement).prepend(btn);btn.addEventListener('click',showQuick);
  }
  function once(){if(window.__rv163Initialized)return;window.__rv163Initialized=true;
    insertQuickLauncher();
    document.addEventListener('keydown',e=>{if(e.altKey&&!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='g'){
      if(e.target.closest('input,textarea,[contenteditable="true"]'))return;e.preventDefault();showQuick();
    }});
  }
  function afterRender(view,root,data,save,render,go,toast){if(!root)return;once();currentView=view;currentGo=go;currentData=data;currentSave=save;currentRender=render;currentToast=toast;
    if(routes[view]&&routeHistory.at(-1)!==view){routeHistory.push(view);if(routeHistory.length>12)routeHistory.shift()}
    if(view==='myday')renderMyDay(root,data,save);
    if(['discover','wellness','fitness','resources'].includes(view))smallRouteBar(root,view,data,save);
    if(view==='customize')studioNav(root);
    if(view==='resources')Rowanvale163Recipes.bind(root);
  }
  return {afterRender,showQuick};
})();

/* Recipe library: progressive discovery, no additional stored keys and no network calls. */
const Rowanvale163Recipes=(()=>{
 const state={query:'',category:'',minutes:'',all:false};
 function update(root){const cards=[...root.querySelectorAll('.rv163-recipe-card')];if(!cards.length)return;const q=state.query.toLowerCase().trim();const matches=cards.filter(card=>(!q||card.dataset.rv163Query.includes(q))&&(!state.category||card.dataset.rv163Category===state.category)&&(!state.minutes||Number(card.dataset.rv163Minutes)<=Number(state.minutes)));
  let shown=0;for(const card of cards){const visible=matches.includes(card)&&(state.all||shown<10);card.hidden=!visible;if(visible)shown++;}
  const count=root.querySelector('#rv163RecipeCount');if(count)count.textContent=`Showing ${shown} of ${matches.length} matching recipes · ${cards.length} available offline.`;
  const more=root.querySelector('#rv163RecipeMore');if(more){more.hidden=state.all||matches.length<=10;more.textContent=`Show ${matches.length-10} more matching recipes ↓`;}
 }
 function bind(root){if(!root?.querySelector('#rv163RecipeList'))return;const search=root.querySelector('#rv163RecipeSearch'),category=root.querySelector('#rv163RecipeCategory'),minutes=root.querySelector('#rv163RecipeTime');search.value=state.query;category.value=state.category;minutes.value=state.minutes;
  search.addEventListener('input',()=>{state.query=search.value;state.all=false;update(root)});
  for(const [control,key] of [[category,'category'],[minutes,'minutes']])control.addEventListener('change',()=>{state[key]=control.value;state.all=false;update(root)});
  root.querySelector('#rv163RecipeMore').addEventListener('click',()=>{state.all=true;update(root)});
  update(root);
 }
 return {bind};
})();
