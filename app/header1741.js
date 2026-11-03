/* Header owns page context and view controls; sidebar owns destinations. */
(()=>{function setup(){
 const menu=document.getElementById('shellAccountMenu'),trigger=document.getElementById('shellAccountToggle');if(!menu||!trigger)return;
 trigger.innerHTML='<span aria-hidden="true">☷</span><span>View options</span>';trigger.setAttribute('aria-label','Open view options');trigger.title='Layout, comfort, undo and sign out';menu.setAttribute('aria-label','View options');
 const version=document.querySelector('.rv1730-build');if(version){const label=document.createElement('span');label.className='rv1741-version';label.textContent='19.3.0 · Beta';version.replaceWith(label);}
 document.querySelector('.topbar-context-kicker>span:nth-child(2)')?.replaceChildren(document.createTextNode('WORKSPACE'));
 const caption=menu.querySelector('.rv173-menu-caption');if(caption)caption.textContent='READING & FOCUS';
}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();})();
