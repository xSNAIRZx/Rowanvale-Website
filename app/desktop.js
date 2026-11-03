/* Rowanvale 14 · Desktop workstation controls. Standalone preferences: no migration and no personal-data changes. */
(()=>{
  'use strict';
  const KEY='hearthbyte.desktop.preferences.v13';
  const allowed=new Set(['relaxed','balanced','compact']);
  const qs=(id)=>document.getElementById(id);
  let settings={density:'balanced',sectionMap:false};
  try {const saved=JSON.parse(localStorage.getItem(KEY)||'{}');if(allowed.has(saved.density))settings.density=saved.density;if(typeof saved.sectionMap==='boolean')settings.sectionMap=saved.sectionMap;}catch{}
  function apply(){document.body.dataset.hb13Density=settings.density;document.body.dataset.hb13SectionMap=settings.sectionMap?'show':'hide';document.querySelectorAll('input[name="hb13Density"]').forEach(i=>i.checked=i.value===settings.density);if(qs('hb13SectionMap'))qs('hb13SectionMap').checked=settings.sectionMap;}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(settings))}catch{}apply()}
  function open(){const d=qs('hb13WorkspaceDialog');if(!d)return;apply();if(!d.open)d.showModal();qs('hb13WorkspaceClose')?.focus()}
  function close(){const d=qs('hb13WorkspaceDialog');if(d?.open)d.close()}
  function updateTop(){const t=qs('hb13BackTop');if(!t)return;t.classList.toggle('visible',window.scrollY>480);}
  function setup(){apply();qs('hb13WorkspaceOpen')?.addEventListener('click',open);qs('hb13WorkspaceMenuOpen')?.addEventListener('click',open);qs('hb13WorkspaceClose')?.addEventListener('click',close);qs('hb13WorkspaceDone')?.addEventListener('click',close);
    document.querySelectorAll('input[name="hb13Density"]').forEach(i=>i.addEventListener('change',()=>{if(i.checked&&allowed.has(i.value)){settings.density=i.value;persist()}}));
    qs('hb13SectionMap')?.addEventListener('change',e=>{settings.sectionMap=!!e.target.checked;persist()});
    qs('hb13BackTop')?.addEventListener('click',()=>{window.scrollTo({top:0,behavior:'instant'});qs('viewRoot')?.focus({preventScroll:true})});
    window.addEventListener('scroll',updateTop,{passive:true});updateTop();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
