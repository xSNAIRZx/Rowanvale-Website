/* Rowanvale 17.2.4 — local launch guard + non-destructive app health diagnostic.
   This module never reads, transmits, or displays private user content. */
(() => {
 'use strict';
 const fileMode = location.protocol === 'file:';
 const id = x => document.getElementById(x);
 const checks = [
  ['Core workspace', () => Boolean(id('appShell') && id('viewRoot') && id('appSidebar'))],
  ['Games and artwork modules', () => typeof RV17 !== 'undefined' && typeof RV172 !== 'undefined' && typeof RV171 !== 'undefined'],
  ['Navigation and quick actions', () => typeof RV163 !== 'undefined' && typeof RV162 !== 'undefined'],
  ['Dialog support', () => typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal === 'function'],
 ];
 function warning() {
  if (!fileMode) return;
  const markup = `<strong>⚠ Rowanvale was opened as a file, not as the desktop app.</strong>
  <p>Some buttons can appear to work while artwork, live lookup and ZIP backups fail. <b>Before switching, export a JSON backup from Data &amp; Beta in this file-opened copy.</b> Saved browser data does not automatically move from <code>file:///</code> to <code>localhost</code>.</p>
  <p>Then open the extracted app folder and double-click <b>START_ROWANVALE_WINDOWS.bat</b> (Node.js 18+ required). Use <b>http://localhost:8080</b> in the browser, then import your JSON backup there.</p>`;
  const auth = document.querySelector('.auth-entry');
  const main = document.querySelector('.main-area');
  if (auth && !id('rv1724FileGate')) {const box=document.createElement('aside');box.id='rv1724FileGate';box.className='rv1724-file-warning';box.setAttribute('role','alert');box.innerHTML=markup;auth.prepend(box);}
  if (main && !id('rv1724FileApp')) {const box=document.createElement('aside');box.id='rv1724FileApp';box.className='rv1724-file-warning';box.setAttribute('role','alert');box.innerHTML=markup;main.prepend(box);}
  const label=id('connectionLabel');if(label)label.textContent='⚠ Opened as a file';
 }
 function dialog() {
  let d=id('rv1724HealthDialog');if(d)return d;
  d=document.createElement('dialog');d.id='rv1724HealthDialog';d.className='modal rv1724-health-dialog';d.setAttribute('aria-labelledby','rv1724HealthTitle');
  d.innerHTML=`<div class="modal-head"><div><span class="eyebrow">ROWANVALE / SUPPORT</span><h2 id="rv1724HealthTitle">App Health Check</h2></div><button class="icon-button" type="button" data-rv1724-close aria-label="Close diagnostics">✕</button></div><p>Checks whether the app can actually save and reach its local services. No profile, game titles, personal notes, or account data are included.</p><div id="rv1724Results" class="rv1724-health-results" role="status" aria-live="polite"></div><div class="modal-actions"><button class="button button-quiet" type="button" data-rv1724-copy>Copy results</button><button class="button button-primary" type="button" data-rv1724-run>Check again</button><button class="button button-quiet" type="button" data-rv1724-close>Close</button></div>`;
  document.body.append(d);return d;
 }
 let latest='';
 async function run() {
  const container=id('rv1724Results');if(!container)return;
  container.replaceChildren();const results=[];
  const add=(label,passed,detail='')=>{results.push({label,passed,detail});const item=document.createElement('div');item.className='rv1724-health-row '+(passed?'is-ok':'is-fail');const mark=document.createElement('strong');mark.textContent=passed?'✓':'!';const message=document.createElement('span');const headline=document.createElement('b');headline.textContent=label;const subtitle=document.createElement('small');subtitle.textContent=detail;message.append(headline,subtitle);item.append(mark,message);container.append(item);};
  for(const [name,test] of checks){try{add(name,!!test())}catch{add(name,false,'The feature is unavailable in this session.')}}
  let storageOk=false;try{const key='rowanvale.healthcheck.temporary';const val='test-'+Date.now();localStorage.setItem(key,val);storageOk=localStorage.getItem(key)===val;localStorage.removeItem(key)}catch{}
  add('Browser saving',storageOk,storageOk?'Temporary write and read passed; personal data was untouched.':'Storage blocked or full. Back up existing data if possible.');
  if(fileMode){add('Local app server',false,'Opened as file:/// — run START_ROWANVALE_WINDOWS.bat and use localhost:8080.');}
  else if(!/^https?:$/.test(location.protocol)){add('Local app server',false,'Not opened through an HTTP server.');}
  else{
   let ok=false,description='The server did not answer. Start the Rowanvale launcher.';
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),4500);
   try{const response=await fetch(new URL('./api/health',location.href),{signal:controller.signal,cache:'no-store'});const data=await response.json();ok=Boolean(response.ok&&data?.ok===true);description=ok?'Local server answered successfully.':'The health endpoint returned an unexpected response.';}catch{}
   finally{clearTimeout(timeout)}add('Local app server',ok,description);
  }
  const failed=results.filter(r=>!r.passed).length;
  const header=document.createElement('p');header.className='rv1724-result-summary';header.textContent=failed?`${results.length-failed} of ${results.length} checks passed. Fix the warnings before relying on online artwork and portable backups.`:`All ${results.length} checks passed. This is a readiness check, not a complete functionality certification.`;
  container.prepend(header);
  latest=['Rowanvale app health check','Run mode: '+(fileMode?'file':'HTTP'),'User data: NOT included',...results.map(r=>(r.passed?'PASS':'WARN')+' '+r.label+(r.detail?' — '+r.detail:''))].join('\n');
 }
 function open(){const d=dialog();if(!d.open)d.showModal();run();}
 function setup(){
  warning();dialog();
  const menu=id('shellAccountMenu');if(menu&&!id('rv1724AccountCheck')){const button=document.createElement('button');button.id='rv1724AccountCheck';button.type='button';button.dataset.rv1724Check='';button.textContent='✚  App Health Check';const signout=id('signOutTop');menu.insertBefore(button,signout||null);}
  const root=id('viewRoot');if(root){const add=()=>{if(!root.querySelector('.rv172-data')||id('rv1724CheckOnPage'))return;const button=document.createElement('button');button.id='rv1724CheckOnPage';button.type='button';button.className='button button-quiet';button.dataset.rv1724Check='';button.textContent='✚ Run App Health Check';root.querySelector('.rv172-data .rv172-report-actions')?.append(button);};new MutationObserver(add).observe(root,{childList:true,subtree:false});add();}
  document.addEventListener('click',event=>{
   const target=event.target.closest('[data-rv1724-check],[data-rv1724-run],[data-rv1724-copy],[data-rv1724-close]');if(!target)return;
   event.preventDefault();
   if(target.hasAttribute('data-rv1724-check'))open();
   else if(target.hasAttribute('data-rv1724-run'))run();
   else if(target.hasAttribute('data-rv1724-close')){const d=id('rv1724HealthDialog');if(d?.open)d.close();}
   else if(target.hasAttribute('data-rv1724-copy')){
    const fallback=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([latest],{type:'text/plain'}));a.href=u;a.download='rowanvale-app-check.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(latest).catch(fallback);else fallback();
   }
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
 window.RV1724={run,open};
})();
