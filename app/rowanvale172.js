/* Rowanvale 17.2: private, portable Game Identity + Cover Workshop. */
const RV172=(()=>{
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=x=>String(x||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const fileRe=/^\/api\/artwork\/file\/([a-f0-9]{64}\.(?:png|jpg|webp))$/;
 const cfg=d=>{d.settings.rv172??={};return d.settings.rv172;};
 const games=d=>(d.backlog||[]).filter(g=>(g.type||'Game')==='Game');
 let missingFiles=new Set();
 let ctx=null,query='',view='grid',statusFilter='all',sort='recent',page=1,stats=null,statsChecked=false,undo=null,queue=[],running=false,paused=false,abort=false,queueIndex=0,queueMode='scan',queueMessage='',busy=false,scannedIds=new Set(),preferencesLoaded=false;
 const PAGE_SIZE=30;
 function identity(g){return String(g.gameId||'local:'+String(g.id||norm(g.title))).slice(0,120)}
 function getCover(g,d){return RV17.coverFor(g.title,g.background_image,d,g.id)}
 function state(g,d){const s=getCover(g,d),file=String(s||'').match(fileRe);return !s?'missing':file&&missingFiles.has(file[1])?'broken':s.startsWith('data:image/')||file?'offline':'online'}
 function canCache(src){try{const u=new URL(src),h=u.hostname.toLowerCase();return u.protocol==='https:'&&(['media.rawg.io','images.igdb.com','steamcdn-a.akamaihd.net'].includes(h)||h==='steamstatic.com'||h.endsWith('.steamstatic.com')||h==='steamusercontent.com'||h.endsWith('.steamusercontent.com'));}catch{return false}}
 function getCoverRecord(g){const covers=RV17.config(ctx.d).covers,key='game:'+g.id;if(Object.hasOwn(covers,key))return covers[key]?.source==='removed'?null:covers[key];return games(ctx.d).filter(x=>norm(x.title)===norm(g.title)).length===1?covers[norm(g.title)]||null:null}
 function saveSafe(work,success){const d=ctx.d,old=JSON.stringify(d);work();if(!ctx.save()){try{const previous=JSON.parse(old);Object.keys(d).forEach(k=>delete d[k]);Object.assign(d,previous)}catch{}ctx.toast('Save failed. Previous data is retained.','error');return false}if(success)ctx.toast(success,'success');return true}
 function ensureIdentities(){
  const changes=[];
  for(const g of games(ctx.d)){
   const previous={};
   if(!g.gameId){previous.gameId={had:Object.hasOwn(g,'gameId'),value:g.gameId};g.gameId=identity(g);}
   if(!g.providerIds||typeof g.providerIds!=='object'||Array.isArray(g.providerIds)){
    previous.providerIds={had:Object.hasOwn(g,'providerIds'),value:g.providerIds};g.providerIds={};
   }
   if(Object.keys(previous).length)changes.push([g,previous]);
  }
  if(changes.length&&!ctx.save()){
   for(const [g,previous] of changes)for(const [key,item] of Object.entries(previous)){
    if(item.had)g[key]=item.value;else delete g[key];
   }
   ctx.toast('Could not store identity migration. Export a backup before editing.','error');
  }
 }

 function counters(){const list=games(ctx.d),n={offline:0,online:0,missing:0,broken:0};list.forEach(g=>{const stateName=state(g,ctx.d);n[stateName]++;if(stateName==='broken')n.missing++;});return {total:list.length,...n};}
 function marker(g){let h=0;for(const c of String(g.title||''))h=((h*31)+c.charCodeAt(0))>>>0;return h%360;}
 function placeholder(g,broken=false){const title=String(g.title||'Game').trim(),initials=title.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x.charAt(0).toLocaleUpperCase()).join('').slice(0,2);
  return `<div class="rv172-art-core" aria-hidden="true"><span class="rv172-art-orbit"></span><span class="rv172-art-letters">${esc(initials||'✦')}</span></div><span class="rv172-placeholder-tag">${broken?'Cover unavailable':'CUSTOM COVER SPACE'}</span>`;
 }
 function card(g){const src=getCover(g,ctx.d),stateLabel=state(g,ctx.d),r=getCoverRecord(g),source=r?.credit||r?.provider||r?.source||'',ident=esc(g.id),hue=marker(g),pattern=hue%4;
  const art=src?`<img src="${esc(src)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="Cover for ${esc(g.title)}" data-rv172-img>`:placeholder(g);
  const label=stateLabel==='offline'?'Saved offline':stateLabel==='online'?'Needs internet':stateLabel==='broken'?'Offline file missing':'No cover';
  return `<article class="rv172-tile rv172-tile--${stateLabel}" style="--cover-hue:${hue};--rv172-pattern:${pattern}"><div ${RVCovers.mark(g)} class="rv172-art rv172-art--${stateLabel}" data-rv172-pattern="${pattern}">${art}<span class="rv172-cover-tag" data-cover-state="${stateLabel}">${label}</span></div><div class="rv172-tile-info"><strong title="${esc(g.title)}">${esc(g.title)}</strong><small>${esc(g.status||'Backlog')}${g.platform?' · '+esc(g.platform):''}${g.edition?' · '+esc(g.edition):''}</small>${source?`<small class="rv172-credit" title="Artwork credit: ${esc(source)}">Art: ${esc(source)}</small>`:''}<div class="rv172-tile-actions"><button type="button" class="button ${['missing','broken'].includes(stateLabel)?'button-primary':'button-quiet'}" data-rv172-cover="${ident}">${stateLabel==='broken'?'Repair cover':stateLabel==='missing'?'Add cover':'Edit cover'}</button><button type="button" class="button button-quiet" data-rv172-details="${ident}" aria-expanded="false" aria-label="Edit details for ${esc(g.title)}">Details</button></div><div class="rv172-detail" hidden></div></div></article>`;
 }
 function emptyMarkup(count){return `<div class="rv172-empty"><span class="rv172-empty-symbol" aria-hidden="true">✧</span><h3>${count?'No games match those filters':'Start your collection'}</h3><p>${count?'Try a different title or cover status. Your games are still here.':'Save a game from Discover and it will show up here, ready for its own artwork and notes.'}</p><button type="button" class="button button-primary" ${count?'data-rv172-reset':'data-rv172-discover'}>${count?'Clear filters':'Explore games'}</button></div>`}
 function gallery(){const counts=counters(),filteredGames=filtered(),items=filteredGames.slice(0,page*PAGE_SIZE),duplicates=findDuplicates(games(ctx.d)),percent=counts.total?Math.round(counts.offline/counts.total*100):0;
  return `<section class="rv172-workshop panel" aria-label="Personal game collection">
   <div class="rv172-head"><div class="rv172-head-copy"><span class="eyebrow">YOUR LIBRARY · ON THIS DEVICE</span><h2>Your collection</h2><p>All your games, one beautiful shelf. Organize them, make the artwork yours, and take it offline.</p></div><div class="rv172-hero-action"><button type="button" class="button button-primary" data-rv172-scan ${!counts.missing?'disabled':''}>${counts.missing?'✦ Find missing covers':'✓ Covers up to date'}</button>${counts.missing?`<small>${counts.missing} game${counts.missing===1?'':'s'} without artwork</small>`:''}</div></div>
   <div class="rv172-metrics" aria-label="Collection artwork status"><span><b>${counts.total}</b><small>Saved games</small></span><span><b>${counts.offline}</b><small>Available offline</small></span><span><b>${counts.online}</b><small>Online covers</small></span><span><b>${counts.missing}</b><small>Missing art</small></span></div>
   <div class="rv172-coverage" role="img" aria-label="${percent} percent of saved games have offline artwork"><div class="rv172-coverage-offline" style="width:${percent}%"></div><div class="rv172-coverage-online" style="width:${counts.total?counts.online/counts.total*100:0}%"></div></div>
   <div class="rv172-tools-heading"><div><h3>Browse games</h3><p>Find what you're looking for and pick up where you left off.</p></div><span class="rv172-result-count" id="rv172ResultCount" role="status" aria-live="polite">${filteredGames.length} ${filteredGames.length===1?'game':'games'}</span></div>
   <div class="rv172-controls"><label>Find a game<input id="rv172Search" type="search" value="${esc(query)}" placeholder="Title, platform, edition…" autocomplete="off"></label><label>Artwork<select id="rv172Status"><option value="all" ${statusFilter==='all'?'selected':''}>All artwork</option><option value="missing" ${statusFilter==='missing'?'selected':''}>Missing covers</option><option value="online" ${statusFilter==='online'?'selected':''}>Online only</option><option value="offline" ${statusFilter==='offline'?'selected':''}>Available offline</option></select></label><label>Sort<select id="rv172Sort"><option value="recent" ${sort==='recent'?'selected':''}>Recently added</option><option value="title" ${sort==='title'?'selected':''}>Title A to Z</option><option value="status" ${sort==='status'?'selected':''}>Game status</option></select></label><div class="rv172-view-switch" role="group" aria-label="Gallery view"><button type="button" data-rv172-view="grid" aria-pressed="${view==='grid'}" aria-label="Grid layout">▦ <span>Grid</span></button><button type="button" data-rv172-view="list" aria-pressed="${view==='list'}" aria-label="List layout">☷ <span>List</span></button></div></div>
   <div id="rv172Gallery" class="rv172-gallery rv172-${view}">${items.length?items.map(card).join(''):emptyMarkup(games(ctx.d).length)}</div>
   <div class="rv172-pagination" aria-live="polite"><span>Showing ${items.length} of ${filteredGames.length} matching games</span><button type="button" class="button button-quiet" data-rv172-more ${items.length>=filteredGames.length?'disabled':''}>${items.length>=filteredGames.length?'All games shown':'Show '+Math.min(PAGE_SIZE,filteredGames.length-items.length)+' more'}</button></div>
   <details class="rv172-dup-review"><summary>Review duplicates <span>${duplicates.length}</span></summary><p>Only exact title, platform and edition matches are suggested. Nothing merges without your approval. A merge can be undone in this session.</p>${duplicates.slice(0,40).map(([a,b])=>`<div><span>${esc(a.title)} ${a.platform?'· '+esc(a.platform):''} ${a.edition?'· '+esc(a.edition):''}</span><button type="button" class="button button-quiet" data-rv172-merge="${esc(a.id)}" data-rv172-duplicate="${esc(b.id)}">Review merge</button></div>`).join('')||'<p>No exact duplicates found.</p>'}<button type="button" class="button button-quiet" data-rv172-undo ${undo&&JSON.stringify(ctx.d.backlog)===undo.after?'':'disabled'}>Undo last merge</button></details>
  </section>`;
 }
 function findDuplicates(arr){const index=new Map(),matches=[];for(const g of arr){const key=[norm(g.title),norm(g.platform),norm(g.edition)].join('|');if(index.has(key))matches.push([index.get(key),g]);else index.set(key,g)}return matches}
 function detailHtml(g){const rec=getCoverRecord(g),link=rec?.sourceUrl&&/^https:\/\//.test(rec.sourceUrl)?rec.sourceUrl:'';return `<div class="rv172-detail-panel"><div class="rv172-detail-title">Game identity: <code>${esc(identity(g))}</code></div><label>Platform<input data-rv172-meta="platform" maxlength="90" value="${esc(g.platform||'')}"></label><label>Edition<input data-rv172-meta="edition" maxlength="80" value="${esc(g.edition||'')}"></label><label>Release year<input data-rv172-meta="releaseYear" type="number" min="1950" max="2100" value="${esc(g.releaseYear||'')}"></label><label>Language<input data-rv172-meta="language" maxlength="50" value="${esc(g.language||'')}"></label><p>Image credit: ${esc(rec?.credit||'Not specified')}${link?` · <a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Source</a>`:''}</p><p class="small-note">Cover art and game titles remain the property of their respective owners. A cached cover is private to your device unless you explicitly include it in a personal backup.</p>${Array.isArray(g.rv172MergedEntries)&&g.rv172MergedEntries.length?`<details class="rv172-archive"><summary>Archived entries from duplicate merges (${g.rv172MergedEntries.length})</summary><p>Nothing was discarded. Restore an archived record if these editions or play histories should remain separate.</p>${g.rv172MergedEntries.map((item,i)=>`<div><span>${esc(item.title)} · ${esc(item.status||'Backlog')} (${esc(item.platform||'Unknown platform')})</span> <button type="button" class="button button-quiet" data-rv172-unmerge="${esc(g.id)}" data-rv172-archive-index="${i}">Restore entry</button></div>`).join('')}</details>`:''}<button type="button" class="button button-primary" data-rv172-save-meta="${esc(g.id)}">Save details</button></div>`}
 function merge(aId,bId){
  const d=ctx.d,a=games(d).find(g=>String(g.id)===String(aId)),b=games(d).find(g=>String(g.id)===String(bId));
  if(!a||!b||a===b||[norm(a.title),norm(a.platform),norm(a.edition)].join('|')!==[norm(b.title),norm(b.platform),norm(b.edition)].join('|'))return;
  if(!confirm(`Merge these exact-title entries?\n\nKeep: ${a.title} [${a.status}]\nArchive duplicate: ${b.title} [${b.status}]\n\nThe removed record, including notes and play history, is stored inside the kept game and can be restored later. You can also undo immediately.`))return;
  const old=JSON.stringify(d.backlog),coversOld=JSON.stringify(RV17.config(d).covers);
  const merged={...a,rv172MergedEntries:[...(Array.isArray(a.rv172MergedEntries)?a.rv172MergedEntries:[]),JSON.parse(JSON.stringify(b))]};
  for(const field of ['note','shelf','lastPlayedAt'])if(!merged[field]&&b[field])merged[field]=b[field];
  // Keep the archived game's own artwork mapping so backup, restore and cleanup never lose it.
  const covers=RV17.config(d).covers;
  if(covers['game:'+bId]&&!covers['game:'+aId])covers['game:'+aId]={...covers['game:'+bId],title:a.title,gameId:identity(a)};
  d.backlog=d.backlog.map(g=>g===a?merged:g).filter(g=>g!==b);
  if(!ctx.save()){d.backlog=JSON.parse(old);d.settings.rv17.covers=JSON.parse(coversOld);ctx.toast('Could not merge; nothing was removed.','error');return;}
  undo={backlog:old,covers:coversOld,after:JSON.stringify(d.backlog)};
  ctx.render();ctx.toast('Duplicates merged. Original entry safely archived; undo is available.','success');
 }
 function undoMerge(){
  if(!undo)return;
  if(JSON.stringify(ctx.d.backlog)!==undo.after){ctx.toast('The collection changed since the merge. Restore the archived entry from game details instead.','error');return;}
  const previous=JSON.stringify(ctx.d.backlog),covers=JSON.stringify(RV17.config(ctx.d).covers);
  ctx.d.backlog=JSON.parse(undo.backlog);ctx.d.settings.rv17.covers=JSON.parse(undo.covers);
  if(!ctx.save()){ctx.d.backlog=JSON.parse(previous);ctx.d.settings.rv17.covers=JSON.parse(covers);ctx.toast('Unable to undo. Earlier data is retained.','error');return;}
  undo=null;ctx.render();ctx.toast('Merge undone.','success');
 }
 function restoreArchivedEntry(gameId,index){
  const parent=games(ctx.d).find(g=>String(g.id)===String(gameId)),arr=parent?.rv172MergedEntries;
  const record=arr?.[index];if(!record)return;
  if(games(ctx.d).some(g=>String(g.id)===String(record.id))){ctx.toast('That game ID already exists; no entry was overwritten.','error');return;}
  if(!confirm(`Restore ${record.title} as a separate game with its saved details?`))return;
  if(saveSafe(()=>{
   parent.rv172MergedEntries=arr.filter((_,i)=>i!==index);
   if(!parent.rv172MergedEntries.length)delete parent.rv172MergedEntries;
   ctx.d.backlog.push(JSON.parse(JSON.stringify(record)));
  },'Archived game restored with its original details.'))ctx.render();
 }

 function report(open=false){const v=counters(),bytes=stats?.bytes||0;const mb=(bytes/1048576).toFixed(1),images=stats?.cached??'?';return `<details class="rv172-offline panel" aria-label="Offline readiness and portable backups" ${open?'open':''}><summary><span class="rv172-offline-title"><strong>Offline readiness & backups</strong><small>${v.offline} of ${v.total} saved games have offline covers · Manage portable backups here</small></span><span class="rv172-offline-chevron" aria-hidden="true">⌄</span></summary><div class="rv172-offline-body"><div class="rv172-report-grid"><span><b>${esc(images)}</b><small>Artwork files on this PC</small></span><span><b>${mb} MB</b><small>Artwork disk usage</small></span><span><b>${stats?'✓':statsChecked?'!':'…'}</b><small>${stats?'Local artwork cache reachable':statsChecked?'Local artwork server unavailable':'Checking the local server'}</small></span></div><div class="rv172-report-actions"><button type="button" class="button button-primary" data-rv172-export>↓ Export private ZIP backup</button><button type="button" class="button button-quiet" data-rv172-import>↑ Restore ZIP backup</button><button type="button" class="button button-quiet" data-rv172-clean>Review unused artwork</button></div><p class="small-note">${stats?.missingReferences==null?'Local cache verification unavailable':stats.missingReferences+' referenced artwork files missing'}${stats?.missingReferences?' · Restore or reselect affected covers':''}. Backup includes locally saved data and cached images that exist on this PC. Keep private; image rights belong to their owners.</p><input id="rv172ZipFile" type="file" accept=".zip,application/zip" hidden><p id="rv172BackupStatus" role="status" aria-live="polite"></p></div></details>`}
 function dataPanel(){let date=cfg(ctx.d).lastPackExport;const last=date&&!isNaN(Date.parse(date))?new Date(date).toLocaleString():'No portable ZIP exported yet';return `<section class="rv172-data panel" aria-label="Portable game artwork backup"><span class="eyebrow">17.2 / DATA & BETA</span><h2>One backup, artwork included.</h2><p>Portable ZIP: ${esc(last)}. Keep your existing JSON backup too until a restore has been tested.</p><div class="rv172-report-actions"><button type="button" class="button button-primary" data-rv172-export>Export portable backup</button><button type="button" class="button button-quiet" data-rv172-import>Restore portable backup</button><button type="button" class="button button-quiet" data-rv172-diagnostics>Download private-free diagnostics</button><button type="button" class="button button-quiet" data-rv172-clean>Clean unused cached art</button></div><input id="rv172ZipFile" type="file" accept=".zip,application/zip" hidden><p id="rv172BackupStatus" role="status" aria-live="polite"></p><p class="small-note">Diagnostics never include private notes, the names of your games or people, artwork files, login data, or API credentials.</p></section>`}
 function setMsg(t){const el=document.getElementById('rv172BackupStatus');if(el)el.textContent=t;else ctx?.toast(t)}
 async function refreshStats(){try{const r=await fetch('/api/artwork/stats',{cache:'no-store'});if(!r.ok)throw Error();stats=await r.json();const refs=new Set();Object.values(RV17.config(ctx.d).covers).forEach(g=>{const m=String(g?.src||'').match(fileRe);if(m)refs.add(m[1]);});games(ctx.d).forEach(g=>{const m=String(g.background_image||'').match(fileRe);if(m)refs.add(m[1]);});(ctx.d.backlog||[]).forEach(g=>{for(const v of [g.metadata184?.artwork,g.watch?.cover]){const m=String(v||'').match(fileRe);if(m)refs.add(m[1]);}});const chk=await fetch('/api/artwork/verify',{method:'POST',headers:{'Content-Type':'application/json','X-Rowanvale-Intent':'artwork-verify'},body:JSON.stringify({files:[...refs]})});if(chk.ok){const health=await chk.json();const next=new Set(Array.isArray(health.missing)?health.missing:[]);const changed=next.size!==missingFiles.size||[...next].some(x=>!missingFiles.has(x));missingFiles=next;stats.missingReferences=next.size;if(changed&&ctx.view==='backlog'){
     const workshop=ctx.root.querySelector('.rv172-workshop');if(workshop){const fresh=document.createElement('template');fresh.innerHTML=gallery();const replacement=fresh.content.firstElementChild;workshop.replaceWith(replacement);bindImageFailures();}
    }}else stats.missingReferences=null;}catch{stats=null;}statsChecked=true;const current=ctx?.root;if(current){const element=current.querySelector('.rv172-offline');if(element)element.outerHTML=report(element.open);}}
 function afterRender(pageName,root,d,save,render,go,toast,restore){if(ctx?.d&&ctx.d!==d){queue=[];running=false;paused=false;abort=true;preferencesLoaded=false;}ctx={view:pageName,root,d,save,render,go,toast,restore};if(!d?.settings)return;if(!preferencesLoaded){view=cfg(d).galleryView==='list'?'list':'grid';preferencesLoaded=true;}ensureIdentities();
  if(pageName==='backlog'){
   root.querySelector('.page-heading')?.classList.add('rv172-compact-page-heading');
   root.querySelector('.rv17-visual-shelf')?.remove();const manager=root.querySelector('.hb10-library-manager');if(manager){const collection=root.querySelector('.hb10-collection');if(collection)collection.insertAdjacentHTML('afterbegin',gallery()+report());else manager.insertAdjacentHTML('beforebegin',gallery()+report());if(queue.length){ctx.root.querySelector('.rv172-workshop')?.insertAdjacentHTML('afterend',queuePanel());scanProgress();}}bindImageFailures();refreshStats();
  }
  if(pageName==='safety'){const target=root.querySelector('.panel');if(target)target.insertAdjacentHTML('beforebegin',dataPanel());}
  if(pageName==='discover'){const info=root.querySelector('.rv17-art-info');if(info){info.querySelector('p').textContent='Find verified title matches from available game catalogs. Personal uploads and explicitly selected cached covers work offline. Your library and game credits stay local.'}}
  if(['fitness','wellness','resources','clubhouse','quests','customize'].includes(pageName)){
   const intro=root.querySelector('.rv163-entry,.rv162-panel,.page-hero,.section-hero');if(intro&&intro.querySelector('p')){intro.querySelector('p')?.classList.add('rv172-compact-intro');}
  }
 }
 async function exportPack(){if(busy)return;busy=true;setMsg('Creating your personal workspace and artwork backup…');try{
  const res=await fetch('/api/workshop/export',{method:'POST',headers:{'Content-Type':'application/json','X-Rowanvale-Intent':'backup-export'},body:JSON.stringify(ctx.d)});
  if(!res.ok){const out=await res.json().catch(()=>({}));throw Error(out.error||'Backup service unavailable. Start the Rowanvale local server.');}
  const blob=await res.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`rowanvale-18.6-private-backup-${new Date().toISOString().slice(0,10)}.zip`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
  cfg(ctx.d).lastPackExport=new Date().toISOString();const remembered=ctx.save();if(!remembered){setMsg('Backup downloaded, but its freshness date could not be saved. Keep the downloaded file.');return;}setMsg(`Backup downloaded (${res.headers.get('X-Rowanvale-Included-Covers')||'0'} offline images included; ${res.headers.get('X-Rowanvale-Missing-Covers')||'0'} referenced images unavailable).`);
 }catch(e){setMsg('Export failed: '+e.message)}finally{busy=false}}
 async function importPack(file){if(!file)return;if(file.size>80*1048576){setMsg('ZIP exceeds the 80 MB import limit.');return;}
  if(!confirm('This will REPLACE your current local Rowanvale workspace after verifying its contents. Download your existing backup first. Continue?'))return;
  setMsg('Verifying archive checksums and importing referenced artwork…');try{
   const r=await fetch('/api/workshop/import',{method:'POST',headers:{'Content-Type':'application/zip','X-Rowanvale-Intent':'backup-import'},body:file});const result=await r.json();if(!r.ok)throw Error(result.error||'Restore failed');
   if(!ctx.restore(result.data))throw Error('The archive was valid, but browser storage rejected the restore. Previous workspace is unchanged.');
   ctx.toast(`Portable backup restored. ${result.importedCovers} new covers, ${result.reusedCovers} already present.`,'success');
  }catch(e){setMsg('Import failed: '+e.message)}
 }
 function downloadDiagnostics(){const data={product:'Rowanvale',version:window.ROWANVALE_VERSION||'unknown',createdAt:new Date().toISOString(),userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],online:navigator.onLine,collectionCounts:counters(),artworkCache:{fileCount:stats?.cached??null,bytes:stats?.bytes??null},storage:{supported:true,bytesUsedEstimate:JSON.stringify(ctx.d).length},notes:'Does not include personal game titles, notes, names, images, credentials, or social links.'};const file=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=`rowanvale-${window.ROWANVALE_VERSION||'unknown'}-diagnostics.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
 async function clean(){if(!stats){setMsg('Cannot verify local artwork storage. Restart the Rowanvale server, then try cleanup again.');return;}const refs=new Set();const covers=RV17.config(ctx.d).covers;Object.values(covers).forEach(g=>{const m=String(g?.src||'').match(fileRe);if(m)refs.add(m[1]);});games(ctx.d).forEach(g=>{const m=String(g.background_image||'').match(fileRe);if(m)refs.add(m[1]);});(ctx.d.backlog||[]).forEach(g=>{for(const v of [g.metadata184?.artwork,g.watch?.cover]){const m=String(v||'').match(fileRe);if(m)refs.add(m[1]);}});
  const unused=Math.max(0,(stats?.cached||0)-refs.size);if(!confirm(`Review local artwork cleanup?\n\n${stats?.cached??'Unknown'} images stored; ${refs.size} explicitly referenced here. Up to ${unused} images may be unused.\n\nOnly images not referenced by this current workspace are deleted. Backups that are not currently imported might still refer to them. Continue?`))return;
  try{const r=await fetch('/api/artwork/cleanup',{method:'POST',headers:{'Content-Type':'application/json','X-Rowanvale-Intent':'artwork-cleanup'},body:JSON.stringify({keep:[...refs],confirm:'DELETE-UNUSED'})});const out=await r.json();if(!r.ok)throw Error(out.error||'Cleanup unavailable');setMsg(`${out.deleted} unused images removed; ${(out.bytes/1048576).toFixed(1)} MB freed.`);await refreshStats()}catch(e){setMsg('Cleanup failed: '+e.message)}}
 function saveMetadata(id,container){const g=games(ctx.d).find(x=>x.id===id);if(!g)return;const next={};for(const field of ['platform','edition','releaseYear','language']){let raw=String(container.querySelector(`[data-rv172-meta="${field}"]`)?.value||'').trim();if(field==='releaseYear')raw=/^(19[5-9]\d|20\d\d|2100)$/.test(raw)?raw:'';next[field]=raw.slice(0,100);}
  if(saveSafe(()=>Object.assign(g,next),'Game details saved.'))ctx.render();
 }
 function scanProgress(){const region=ctx?.root?.querySelector('#rv172Queue');if(!region)return;const scanned=queue.filter(x=>x.status!=='pending').length;
  region.innerHTML=`<div class="rv172-queue-top"><div><b>Cover matching queue</b><p>${esc(queueMessage||'Only your saved collection is searched. Each match requires your approval before downloading.')}</p><small>${scanned} of ${queue.length} checked · ${queue.filter(x=>x.status==='ready').length} ready to review</small></div><div><button type="button" class="button button-quiet" data-rv172-pause ${!running?'disabled':''}>${paused?'Resume':'Pause'}</button><button type="button" class="button button-quiet" data-rv172-cancel>Cancel</button></div></div><progress max="${queue.length||1}" value="${scanned}"></progress><div class="rv172-queue-items">${queue.map((job,i)=>`<div class="rv172-queue-item"><span>${esc(job.title)}</span><small>${esc(job.status==='ready'?'Review recommended match':job.status==='none'?'No reliable cover found':job.status==='done'?'Saved offline':job.status==='error'?job.error||'Unavailable':job.status)}</small>${job.status==='ready'?`<label><input type="checkbox" data-rv172-check="${i}" ${job.checked?'checked':''}> Select</label><span>${esc(job.match?.name||'')}</span><small>${esc(job.match?.source||'')}${job.confidence?' · '+esc(job.confidence):''}</small><button type="button" class="button button-quiet" data-rv172-approve="${i}">Review & save</button>`:''}</div>`).join('')}</div><button type="button" class="button button-primary" data-rv172-apply-selected ${!queue.some(x=>x.checked&&x.status==='ready')?'disabled':''}>Save selected verified covers offline</button><p class="small-note">Cover owners retain all rights. Select only matches you have checked. Some sources may not allow caching or may be unavailable. The app never auto-downloads the entire catalog.</p>`;
 }
 function queuePanel(){return `<section id="rv172Queue" class="rv172-queue panel" aria-label="Artwork matching progress"></section>`;}
 const pauseMs=ms=>new Promise(ok=>setTimeout(ok,ms));
 async function scan(){if(running||busy)return;const list=games(ctx.d).filter(g=>['missing','broken'].includes(state(g,ctx.d)));if(!list.length){ctx.toast('Every saved game already has a cover.','success');return;}
  let selected=list.filter(g=>!scannedIds.has(g.id)).slice(0,60);if(!selected.length){scannedIds.clear();selected=list.slice(0,60);}selected.forEach(g=>scannedIds.add(g.id));queue=selected.map(g=>({id:g.id,title:g.title,status:'pending',checked:false}));queueIndex=0;running=true;paused=false;abort=false;queueMessage=`Checking ${queue.length} missing games${list.length>queue.length?' (use Find missing covers again to continue through the library)':''}. No covers download until you approve them.`;
  const panel=ctx.root.querySelector('.rv172-workshop');if(panel&&!ctx.root.querySelector('#rv172Queue')){panel.insertAdjacentHTML('afterend',queuePanel());}scanProgress();
  for(;queueIndex<queue.length;queueIndex++){if(abort)break;while(paused&&!abort)await pauseMs(200);if(abort)break;const job=queue[queueIndex];job.status='searching';scanProgress();
   try{const r=await fetch('/api/games?search='+encodeURIComponent(job.title),{signal:AbortSignal.timeout(13000)});if(!r.ok)throw Error('Provider unavailable');const raw=await r.json();
    const list=Array.isArray(raw.results)?raw.results.filter(g=>g?.background_image&&RV17.safeUrl(g.background_image)):[];
    const exact=list.filter(g=>norm(g.name)===norm(job.title));const chosen=exact.find(g=>g.source==='IGDB')||exact.find(g=>g.source==='Steam')||exact[0];
    if(chosen){job.match=chosen;job.status='ready';job.confidence=exact.length>1?'Exact title · check edition':'Exact title · review edition';}else job.status='none';
   }catch(e){job.status='error';job.error='Lookup unavailable; try later'}scanProgress();await pauseMs(300);
  }
  running=false;queueMessage=abort?'Matching canceled. Reviewed results remain available.':'Matching complete. Review each candidate before approving any downloads.';scanProgress();
 }
 async function applyOne(index){const job=queue[index],g=games(ctx.d).find(x=>x.id===job?.id);if(!job||job.status!=='ready'||!g||!['missing','broken'].includes(state(g,ctx.d)))return;
  const m=job.match;if(!m?.background_image)return;
  if(!canCache(m.background_image)){job.status='error';job.error='This source cannot be cached; choose a manual cover instead.';scanProgress();return;}
  job.status='saving';scanProgress();try{
   const r=await fetch('/api/artwork/cache',{method:'POST',headers:{'Content-Type':'application/json','X-Rowanvale-Intent':'cache-artwork'},body:JSON.stringify({url:m.background_image})}),result=await r.json();if(!r.ok||!fileRe.test(result.src||''))throw Error(result.error||'Unable to cache artwork');
   const c=RV17.config(ctx.d).covers;
   const current=state(g,ctx.d),key='game:'+g.id,prior=c[key],hadOwn=Object.hasOwn(c,key);
   if((prior&&prior.source!=='removed'&&current!=='broken')||(games(ctx.d).filter(x=>norm(x.title)===norm(g.title)).length===1&&c[norm(g.title)]&&current!=='broken')||!['missing','broken'].includes(current))throw Error('Game has changed; no cover overwritten.');
   const cover={src:result.src,title:g.title,gameId:identity(g),source:m.source||'IGDB',provider:m.source||'IGDB',providerId:String(m.provider_id||''),credit:m.source||'Game artwork provider',sourceUrl:m.source_url||'',imageUrl:m.background_image,rights:'Copyright belongs to game artwork owners; privately cached by user choice.',addedAt:new Date().toISOString()};
   c[key]=cover;
   const oldProviderIds=g.providerIds;
   g.providerIds={...(g.providerIds||{}),[String(m.source||'provider').toLowerCase()]:String(m.provider_id||'')};
   if(!ctx.save()){
    if(hadOwn)c[key]=prior;else delete c[key];g.providerIds=oldProviderIds;
    throw Error('Browser storage is full; image was cached but no game changes saved.');
   }
   job.status='done';job.checked=false;ctx.toast(`${g.title}: cover saved offline.`,'success');
  }catch(e){job.status='error';job.error=e.message||'Download failed';}scanProgress();
 }
 async function applySelected(index){if(busy)return;const indices=index!==undefined?[index]:queue.map((q,i)=>q.checked&&q.status==='ready'?i:-1).filter(i=>i>=0);if(!indices.length)return;
  const names=indices.map(i=>queue[i].title).slice(0,8).join(', ');if(!confirm(`Download and apply ${indices.length} explicitly selected cover(s) for personal offline use?\n\n${names}${indices.length>8?' and more':''}\n\nVerify these are the correct games and editions. Artwork stays credited to its sources and owners.`))return;
  busy=true;abort=false;for(const i of indices){if(abort)break;await applyOne(i);await pauseMs(250)}busy=false;if(ctx.view==='backlog')ctx.render();
 }
 function updateShelf(){const galleryEl=document.getElementById('rv172Gallery');if(!galleryEl)return;const parent=galleryEl.closest('.rv172-workshop');galleryEl.outerHTML=galleryMarkupOnly();const pagination=parent?.querySelector('.rv172-pagination');if(pagination)pagination.innerHTML=pageMarkup();const result=parent?.querySelector('#rv172ResultCount'),total=filtered().length;if(result)result.textContent=total+' '+(total===1?'game':'games');parent?.querySelectorAll('[data-rv172-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rv172View===view)));bindImageFailures();}
 function bindImageFailures(){ctx.root.querySelectorAll('[data-rv172-img]').forEach(img=>{if(img.dataset.rv172Bound)return;img.dataset.rv172Bound='true';img.addEventListener('error',()=>{const art=img.closest('.rv172-art');if(!art)return;const id=art.closest('.rv172-tile')?.querySelector('[data-rv172-cover]')?.dataset.rv172Cover,g=games(ctx.d).find(x=>x.id===id);img.remove();if(g)art.insertAdjacentHTML('afterbegin',placeholder(g,true));art.classList.add('rv172-art--missing');const tag=art.querySelector('.rv172-cover-tag');if(tag){tag.textContent='Image unavailable';tag.dataset.coverState='broken';}},{once:true});});}
 document.addEventListener('click',async e=>{
  const a=e.target.closest('[data-rv172-reset],[data-rv172-discover],[data-rv172-cover],[data-rv172-details],[data-rv172-save-meta],[data-rv172-view],[data-rv172-more],[data-rv172-merge],[data-rv172-undo],[data-rv172-unmerge],[data-rv172-scan],[data-rv172-pause],[data-rv172-cancel],[data-rv172-approve],[data-rv172-apply-selected],[data-rv172-export],[data-rv172-import],[data-rv172-diagnostics],[data-rv172-clean]');if(!a||!ctx)return;
  if(a.hasAttribute('data-rv172-reset')){query='';statusFilter='all';sort='recent';page=1;const search=document.getElementById('rv172Search');if(search)search.value='';const st=document.getElementById('rv172Status');if(st)st.value='all';const so=document.getElementById('rv172Sort');if(so)so.value='recent';updateShelf();}
  else if(a.hasAttribute('data-rv172-discover'))ctx.go('discover');
  else if(a.hasAttribute('data-rv172-cover')){const g=games(ctx.d).find(x=>x.id===a.dataset.rv172Cover);if(g)RV17.openArtwork(g.title,g.id);}
  else if(a.hasAttribute('data-rv172-details')){const g=games(ctx.d).find(x=>x.id===a.dataset.rv172Details),tile=a.closest('.rv172-tile'),box=tile?.querySelector('.rv172-detail');if(!g||!box)return;box.hidden=!box.hidden;a.setAttribute('aria-expanded',String(!box.hidden));if(!box.hidden)box.innerHTML=detailHtml(g);}
  else if(a.hasAttribute('data-rv172-save-meta'))saveMetadata(a.dataset.rv172SaveMeta,a.closest('.rv172-detail-panel'));
  else if(a.hasAttribute('data-rv172-view')){view=a.dataset.rv172View;cfg(ctx.d).galleryView=view;ctx.save();updateShelf();}
  else if(a.hasAttribute('data-rv172-more')){page++;updateShelf();}
  else if(a.hasAttribute('data-rv172-merge'))merge(a.dataset.rv172Merge,a.dataset.rv172Duplicate);
  else if(a.hasAttribute('data-rv172-undo'))undoMerge();
  else if(a.hasAttribute('data-rv172-unmerge'))restoreArchivedEntry(a.dataset.rv172Unmerge,Number(a.dataset.rv172ArchiveIndex));
  else if(a.hasAttribute('data-rv172-scan'))scan();
  else if(a.hasAttribute('data-rv172-pause')){paused=!paused;scanProgress();}
  else if(a.hasAttribute('data-rv172-cancel')){abort=true;paused=false;queueMessage='Canceled. Previously reviewed results are retained.';scanProgress();}
  else if(a.hasAttribute('data-rv172-approve'))applySelected(Number(a.dataset.rv172Approve));
  else if(a.hasAttribute('data-rv172-apply-selected'))applySelected();
  else if(a.hasAttribute('data-rv172-export'))exportPack();
  else if(a.hasAttribute('data-rv172-import'))document.getElementById('rv172ZipFile')?.click();
  else if(a.hasAttribute('data-rv172-diagnostics'))downloadDiagnostics();
  else if(a.hasAttribute('data-rv172-clean'))clean();
 });
 document.addEventListener('input',e=>{if(e.target.id==='rv172Search'){query=e.target.value;page=1;updateShelf();}});
 function filtered(){let a=games(ctx.d).filter(g=>[g.title,g.platform,g.edition,g.status,g.releaseYear,identity(g)].some(x=>norm(x).includes(norm(query)))&&(statusFilter==='all'||state(g,ctx.d)===statusFilter||(statusFilter==='missing'&&state(g,ctx.d)==='broken')));if(sort==='title')a.sort((x,y)=>String(x.title).localeCompare(y.title));else if(sort==='status')a.sort((x,y)=>String(x.status).localeCompare(String(y.status)));else a.sort((x,y)=>(Date.parse(y.createdAt)||0)-(Date.parse(x.createdAt)||0));return a;}
 function galleryMarkupOnly(){const a=filtered();return `<div id="rv172Gallery" class="rv172-gallery rv172-${view}">${a.slice(0,page*PAGE_SIZE).map(card).join('')||emptyMarkup(games(ctx.d).length)}</div>`;}
 function pageMarkup(){const a=filtered();return `<span>Showing ${Math.min(page*PAGE_SIZE,a.length)} of ${a.length} matching games</span><button type="button" class="button button-quiet" data-rv172-more ${page*PAGE_SIZE>=a.length?'disabled':''}>${page*PAGE_SIZE>=a.length?'All games shown':'Show '+Math.min(PAGE_SIZE,Math.max(0,a.length-page*PAGE_SIZE))+' more'}</button>`;}
 document.addEventListener('change',async e=>{const t=e.target;if(t.id==='rv172Status'){statusFilter=t.value;page=1;updateShelf();}if(t.id==='rv172Sort'){sort=t.value;page=1;updateShelf();}if(t.hasAttribute('data-rv172-check')){const j=queue[Number(t.dataset.rv172Check)];if(j)j.checked=t.checked;scanProgress();}if(t.id==='rv172ZipFile'){const f=t.files?.[0];t.value='';if(f)await importPack(f);}});
 return {afterRender,counters,identity,findDuplicates};
})();
