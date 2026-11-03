/* Rowanvale 15: additive UX enhancements only. Existing router and storage remain authoritative. */
(()=>{'use strict';
 const root=document.documentElement;
 // Keep the browser theme chrome aligned with the selected whole-app appearance.
 const paintChrome=()=>{const body=document.body,mode=body.dataset.appearanceResolved;
  const color=mode==='light'?'#fbf8f1':'#0b1f2a';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);
 };
 const applyLabels=()=>{
  const main=document.getElementById('viewRoot'); if(!main)return;
  // Semantic controls are intentionally retained. Route metadata is never removed.
  main.querySelectorAll('button[data-view]:not([aria-label])').forEach(btn=>{
   if(!btn.textContent.trim())btn.setAttribute('aria-label',`Open ${btn.dataset.view}`);
  });
 };
 const observer=new MutationObserver(records=>{
  // Observe only app mount/route updates, not attrs we ourselves change.
  if(records.some(r=>r.type==='childList')){paintChrome();applyLabels();}
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 function init(){paintChrome();applyLabels();const shell=document.getElementById('appShell');if(shell)observer.observe(shell,{subtree:true,childList:true});}
})();
