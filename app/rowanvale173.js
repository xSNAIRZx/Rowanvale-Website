/* Rowanvale 17.2.3: accessible chrome refinements, no stored state or feature rewrites. */
(() => {
  'use strict';
  function setup() {
    if (document.documentElement.dataset.rv173Ready) return;
    document.documentElement.dataset.rv173Ready = 'true';
    const actions = [
      ['hb12ThemeOpen', 'Customize app appearance'],
      ['comfortToggle', 'Toggle comfortable reading'],
      ['hb12UndoButton', 'Undo last change'],
      ['focusModeToggle', 'Toggle focus view'],
      ['hb13WorkspaceOpen', 'Configure workspace layout'],
      ['rv163Launcher', 'Open quick paths']
    ];
    for (const [id, label] of actions) {
      const el = document.getElementById(id);
      if (el) {el.setAttribute('aria-label',label); if (!el.title) el.title=label;}
    }
    const pulse = document.querySelector('.topbar .hb11-pulse-trigger');
    if (pulse) pulse.setAttribute('aria-label','Open quick action deck');
    const top = document.querySelector('.topbar');
    if (top) top.setAttribute('aria-label','Rowanvale navigation and utilities');
    const skip = document.querySelector('.skip-link');
    if (skip) {
      const update = () => {
        const signedIn = document.body.classList.contains('signed-in');
        skip.href=signedIn?'#viewRoot':'#authTitle';
        skip.textContent=signedIn?'Skip to page content':'Skip to welcome';
      };
      update();
      new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['class']});
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
