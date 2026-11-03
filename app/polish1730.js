/* 17.3: quiet chrome, explicit utilities; existing actions and listeners are retained. */
(()=>{'use strict';
 function setup(){
  const menu=document.getElementById('shellAccountMenu'),trigger=document.getElementById('shellAccountToggle');if(!menu||!trigger)return;
  trigger.innerHTML='<span aria-hidden="true">☷</span><span>Tools</span>';trigger.setAttribute('aria-label','Open tools and account menu');trigger.title='Tools, backups and account';
  const quick=document.getElementById('rv163Launcher'),undo=document.getElementById('hb12UndoButton');
  for(const el of [quick,undo])if(el)menu.insertBefore(el,menu.firstChild);
  const version=document.createElement('button');version.type='button';version.className='rv1730-build';version.dataset.view='updates';version.textContent='19.3.0 · Beta';version.title='View this build and update information';version.setAttribute('aria-label','Rowanvale version 19.3.0, open Update Center');
  document.querySelector('.topbar-context')?.append(version);
  if(!version.isConnected)document.querySelector('.sidebar-footer')?.prepend(version);
  // Keep the version available even in sidebar configurations without a footer.
  if(!version.isConnected)document.querySelector('.topbar-context')?.append(version);
  const home=document.querySelector('.rv-area-button[data-rv-area="today"] .rv-area-label');if(home)home.firstChild.textContent='Home';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
