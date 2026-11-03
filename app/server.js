'use strict';
// Hearthbyte server-side RAWG proxy + static file server. Requires Node.js 18+.
// Keep RAWG_API_KEY in .env or your host's secret manager; never in app.js.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const ROOT = __dirname;
const watchCatalog=require('./watch-catalog').createWatchCatalog();
const booksCatalog=require('./books-catalog');
const {handleResources} = require('./resources');
const {makeBackup,restoreBackup} = require('./artwork-pack');
const {fetchArtwork}=require('./artwork-fetch');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !m[1].startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
loadEnv();
const metadataService=require('./metadata-service').createMetadataService();
const PORT = Number(process.env.PORT || 8080);
// PC beta uses loopback only by default. Explicit HOST=0.0.0.0 enables LAN previews.
const HOST = process.env.HOST === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1';
const SECURITY_HEADERS = { 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin', 'X-Frame-Options':'SAMEORIGIN', 'Content-Security-Policy':"default-src 'self' https: data: blob:; connect-src 'self' https:; img-src 'self' https: data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" };
function staticHeaders(type, cache='no-store'){ return { 'Content-Type':type, ...SECURITY_HEADERS, 'Cache-Control':cache }; }
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon' };
const WINDOW_MS = 60_000, MAX_REQUESTS = 90, buckets = new Map();
function send(res, status, body, type='application/json; charset=utf-8') {
  res.writeHead(status, { ...staticHeaders(type, 'no-store') });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}
let igdbToken=null,igdbExpire=0;
async function searchIGDB(search){
 const client=process.env.IGDB_CLIENT_ID,secret=process.env.IGDB_CLIENT_SECRET;
 if(!client||!secret)return [];
 if(!igdbToken||Date.now()>igdbExpire){
  const tokenURL=new URL('https://id.twitch.tv/oauth2/token');
  tokenURL.searchParams.set('client_id',client);tokenURL.searchParams.set('client_secret',secret);tokenURL.searchParams.set('grant_type','client_credentials');
  const r=await fetch(tokenURL,{method:'POST',signal:AbortSignal.timeout(9000)});
  if(!r.ok)throw Error('IGDB authentication failed');const auth=await r.json();
  if(!auth.access_token)throw Error('IGDB authentication failed');
  igdbToken=auth.access_token;igdbExpire=Date.now()+Math.max(60,Number(auth.expires_in||3600)-120)*1000;
 }
 // Escape Apicalypse query input; no user-supplied query operators can execute.
 const term=search.replace(/[\"\;\\\r\n]/g,' ').replace(/\s+/g,' ').trim().slice(0,90);
 const statement=`search "${term}"; fields name,slug,cover.image_id,first_release_date,platforms.name; limit 12;`;
 const r=await fetch('https://api.igdb.com/v4/games',{method:'POST',headers:{'Client-ID':client,Authorization:`Bearer ${igdbToken}`,'Content-Type':'text/plain'},body:statement,signal:AbortSignal.timeout(10000)});
 if(r.status===401){igdbToken=null;igdbExpire=0;throw Error('IGDB token expired');}
 if(!r.ok)throw Error('IGDB returned '+r.status);
 const games=await r.json();if(!Array.isArray(games))return [];
 return games.filter(g=>g&&g.cover?.image_id&&/^[a-zA-Z0-9_]+$/.test(g.cover.image_id)).map(g=>({id:`igdb-${g.id}`,provider_id:g.id,name:g.name,description:'Game cover and metadata from IGDB.',genres:[],platforms:(g.platforms||[]).map(x=>x.name).filter(Boolean),background_image:`https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`,released:g.first_release_date?new Date(g.first_release_date*1000).toISOString().slice(0,10):null,rating:null,source:'IGDB',source_url:`https://www.igdb.com/games/${encodeURIComponent(g.slug||'')}`}));
}
async function gamesSearch(req, res, url) {
  const ip = (req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
  const now = Date.now(); let b = buckets.get(ip);
  if (!b || now - b.start > WINDOW_MS) b = { start:now, count:0 };
  b.count++; buckets.set(ip,b);
  if (b.count > MAX_REQUESTS) return send(res,429,{error:'Too many searches. Wait a minute and try again.'});
  const search = (url.searchParams.get('search') || '').trim().slice(0,100);
  if (search.length < 2) return send(res,200,{count:0,next:null,previous:null,sources:[],results:[]});
  const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page') || '1',10) || 1));
  const results = [], sources = [], errors = [];
  // Steam's public store search provides a useful no-key PC catalog fallback.
  // It does not replace console/retro databases; RAWG remains the broader catalog when configured.
  try {
    const steam = new URL('https://store.steampowered.com/api/storesearch/');
    steam.searchParams.set('term', search); steam.searchParams.set('l','english'); steam.searchParams.set('cc','us');
    const response = await fetch(steam, {headers:{Accept:'application/json'},signal:AbortSignal.timeout(7000)});
    if (!response.ok) throw new Error(`Steam HTTP ${response.status}`);
    const payload = await response.json();
    const items = Array.isArray(payload.items) ? payload.items : [];
    for (const g of items) results.push({id:`steam-${g.id}`,provider_id:g.id,name:g.name||'Unknown title',description:'PC game from the Steam store catalog.',genres:[],platforms:['PC (Steam)'],background_image:g.tiny_image||null,released:null,rating:null,source:'Steam',source_url:`https://store.steampowered.com/app/${encodeURIComponent(g.id)}/`});
    if (items.length) sources.push('Steam');
  } catch (err) { errors.push('Steam search temporarily unavailable.'); }
  const key = process.env.RAWG_API_KEY;
  if (key) {
    try {
      const upstream = new URL('https://api.rawg.io/api/games');
      upstream.searchParams.set('key', key); upstream.searchParams.set('search', search);
      upstream.searchParams.set('page', String(page)); upstream.searchParams.set('page_size','20');
      const response = await fetch(upstream, { headers:{Accept:'application/json'}, signal:AbortSignal.timeout(10000) });
      if (response.status === 401 || response.status === 403) errors.push('RAWG rejected the configured API key. Check the key and account access.');
      else if (response.status === 429) errors.push('RAWG rate limit reached.');
      else if (!response.ok) errors.push(`RAWG returned HTTP ${response.status}.`);
      else {
        const payload = await response.json();
        const rawg = (Array.isArray(payload.results) ? payload.results : []).map(g => ({
          id:`rawg-${g.id}`, provider_id:g.id, name:g.name || 'Unknown title', description:g.description_raw || '',
          genres:Array.isArray(g.genres)?g.genres.map(x=>x.name).filter(Boolean):[],
          platforms:Array.isArray(g.platforms)?g.platforms.map(x=>x.platform?.name).filter(Boolean):[],
          background_image:g.background_image || null, released:g.released || null,
          rating:typeof g.rating==='number'?g.rating:null, source:'RAWG',
          source_url:g.slug?`https://rawg.io/games/${encodeURIComponent(g.slug)}`:'https://rawg.io/'
        }));
        results.push(...rawg); sources.push('RAWG');
      }
    } catch (err) { errors.push(err.name==='TimeoutError'?'RAWG search timed out.':'RAWG could not be reached.'); }
  }
  if(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET){
    try{const games=await searchIGDB(search);results.unshift(...games);if(games.length)sources.unshift('IGDB');}
    catch{errors.push('IGDB lookup unavailable. Verify credentials or try again.')}
  }
  const unique = new Map();
  for (const g of results) { const k = String(g.source).toLocaleLowerCase()+':'+String(g.id); if (!unique.has(k)) unique.set(k,g); else {
    const old=unique.get(k); old.platforms=[...new Set([...(old.platforms||[]),...(g.platforms||[])])];
    if (!old.background_image && g.background_image) old.background_image=g.background_image;
    if (old.source!==g.source) old.source='Steam + RAWG';
    if (!old.source_url && g.source_url) old.source_url=g.source_url;
  }}
  const merged=[...unique.values()];
  send(res,200,{count:merged.length,next:null,previous:null,sources,errors,configured:Boolean(key||process.env.IGDB_CLIENT_ID),results:merged});
}


// User-selected, rights-aware offline artwork storage. Never blindly bulk-fetch a catalog.
// Caches only deliberately submitted HTTPS images from supported game-art CDN hosts.
const ART_DIR=path.join(process.env.ROWANVALE_DATA_DIR||path.join(os.homedir(),'.rowanvale'),'artwork');
const coverService=require('./cover-service1861').createCoverService({metadataService,cacheFile:path.join(ART_DIR,'catalog-covers1861.json')});
const ART_LIMIT_FILES=4500, ART_LIMIT_BYTES=2*1024*1024*1024, ART_MAX_IMAGE=3*1024*1024;
const artHosts = ['covers.openlibrary.org',...(process.env.ROWANVALE_TMDB_CACHE==='1'?['image.tmdb.org']:[]),'steamstatic.com','steamusercontent.com','media.rawg.io','images.igdb.com','steamcdn-a.akamaihd.net'];
const artMime={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'};
const artKnownHost = h=>artHosts.some(x=>h===x||(x!=='steamcdn-a.akamaihd.net'&&x!=='media.rawg.io'&&x!=='images.igdb.com'&&h.endsWith('.'+x)));
function artUrl(v){
 try {const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&artKnownHost(u.hostname.toLowerCase())&&u.port===''?u:null}
 catch{return null}
}
async function cacheArtwork(req,res){
 const host=req.headers.host||'';
 if(req.headers.origin!==`http://${host}` || req.headers['x-rowanvale-intent']!=='cache-artwork' || !/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,403,{error:'Artwork downloads require an action from the local Rowanvale app.'});
 let body='';
 try {for await(const c of req){body+=c.toString();if(body.length>4500)throw Error('too large')}}
 catch {return send(res,413,{error:'Request too large.'})}
 let source;try{source=artUrl(JSON.parse(body).url)}catch{}
 if(!source)return send(res,400,{error:'Only supported HTTPS game-art catalogs can be cached. You can upload your own cover instead.'});
 const id=crypto.createHash('sha256').update(source.href).digest('hex');
 try{
   fs.mkdirSync(ART_DIR,{recursive:true,mode:0o700});
   const files=fs.readdirSync(ART_DIR).filter(x=>/^[a-f0-9]{64}\.(jpg|png|webp)$/.test(x));
   const existing=files.find(x=>x.startsWith(id+'.'));
   if(existing)return send(res,200,{src:`/api/artwork/file/${existing}`,cached:true,already:true});
   const used=files.reduce((n,f)=>{try{return n+fs.statSync(path.join(ART_DIR,f)).size}catch{return n}},0);
   if(files.length>=ART_LIMIT_FILES||used+ART_MAX_IMAGE>ART_LIMIT_BYTES)return send(res,507,{error:'Artwork storage limit reached. Existing covers are still safe.'});
   const reply=await fetchArtwork(source,artUrl);
   if(!reply.ok)return send(res,502,{error:'The artwork source could not be downloaded.'});
   const mime=(reply.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
   if(!artMime[mime])return send(res,415,{error:'Artwork must be PNG, JPG or WebP.'});
   if(Number(reply.headers.get('content-length')||0)>ART_MAX_IMAGE)return send(res,413,{error:'Artwork exceeds the 3 MB offline file limit.'});
   const pieces=[], reader=reply.body.getReader();let bytes=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>ART_MAX_IMAGE)throw Error('too large');pieces.push(Buffer.from(value))}}
   catch{await reader.cancel().catch(()=>{});return send(res,413,{error:'Artwork exceeds the 3 MB offline limit.'})}
   const content=Buffer.concat(pieces);
   const valid=mime==='image/png'?content.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):mime==='image/jpeg'?content[0]===255&&content[1]===216&&content[2]===255:content.toString('ascii',0,4)==='RIFF'&&content.toString('ascii',8,12)==='WEBP';
   if(!valid)return send(res,415,{error:'Invalid image content.'});
   const filename=id+artMime[mime],dest=path.join(ART_DIR,filename);
   fs.writeFileSync(dest,content,{flag:'wx',mode:0o600});
   return send(res,200,{src:`/api/artwork/file/${filename}`,cached:true,already:false,bytes:content.length});
 }catch(e){return send(res,503,{error:'Could not store artwork locally. Check disk space and try again.'})}
}
function serveArtwork(req,res,pathname){
 const filename=pathname.slice('/api/artwork/file/'.length);
 if(!/^[a-f0-9]{64}\.(jpg|png|webp)$/.test(filename))return send(res,404,{error:'No such artwork.'});
 const dest=path.join(ART_DIR,filename);const ext=path.extname(dest);
 fs.stat(dest,(e,st)=>{
  if(e||!st.isFile())return send(res,404,{error:'Cover is not cached on this PC.'});
  res.writeHead(200,staticHeaders(MIME[ext],'private, max-age=86400'));
  if(req.method==='HEAD')return res.end();
  fs.createReadStream(dest).on('error',()=>res.destroy()).pipe(res);
 });
}
function artworkStats(req,res){
 try{const files=fs.readdirSync(ART_DIR).filter(x=>/^[a-f0-9]{64}\.(jpg|png|webp)$/.test(x));return send(res,200,{cached:files.length,bytes:files.reduce((v,x)=>v+fs.statSync(path.join(ART_DIR,x)).size,0),deviceOnly:true})}
 catch{return send(res,200,{cached:0,bytes:0,deviceOnly:true})}
}


const allowedIntent=(req,action)=>{
 const host=req.headers.host||'';
 return req.headers.origin===`http://${host}`&&req.headers['x-rowanvale-intent']===action&&HOST==='127.0.0.1';
};
async function readLimited(req,max){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>max)throw Error('Request too large.');chunks.push(c);}return Buffer.concat(chunks);}
async function workspacePack(req,res,mode){
 if(!allowedIntent(req,mode))return send(res,403,{error:'Only your local Rowanvale session can use private backups.'});
 try{
  if(mode==='backup-export'){
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,415,{error:'Expected JSON workspace data.'});
   const source=JSON.parse((await readLimited(req,12*1024*1024)).toString('utf8'));
   const {buffer,manifest}=makeBackup(source,ART_DIR);
   res.writeHead(200,{...staticHeaders('application/zip','no-store'),'Content-Disposition':'attachment; filename="rowanvale-private-artwork-backup.zip"','X-Rowanvale-Included-Covers':String(manifest.includedCovers),'X-Rowanvale-Missing-Covers':String(manifest.referencedCovers-manifest.includedCovers)});
   return res.end(buffer);
  }
  if(mode==='backup-import'){
   if(!/^application\/zip(?:;|$)/i.test(req.headers['content-type']||''))return send(res,415,{error:'Expected a Rowanvale ZIP archive.'});
   const restored=restoreBackup(await readLimited(req,80*1024*1024),ART_DIR);
   return send(res,200,restored);
  }
 }catch(e){return send(res,e.message.includes('too large')||e.message.includes('exceeds')?413:400,{error:String(e.message||'Could not process archive').slice(0,220)});}
}
async function artworkVerify(req,res){
 if(!allowedIntent(req,'artwork-verify'))return send(res,403,{error:'Local verification required.'});
 let input;try{input=JSON.parse((await readLimited(req,240000)).toString('utf8'));}catch{return send(res,400,{error:'Invalid reference list.'});}
 if(!Array.isArray(input.files)||input.files.length>4500||input.files.some(x=>!(/^[a-f0-9]{64}\.(png|jpg|webp)$/.test(x))))return send(res,400,{error:'Invalid cover filename.'});
 const missing=[];
 for(const f of new Set(input.files)){try{if(!fs.statSync(path.join(ART_DIR,f)).isFile())missing.push(f)}catch{missing.push(f)}}
 return send(res,200,{checked:new Set(input.files).size,missing,allPresent:!missing.length});
}
async function artworkCleanup(req,res){
 if(!allowedIntent(req,'artwork-cleanup'))return send(res,403,{error:'Local confirmation required.'});
 let input;try{input=JSON.parse((await readLimited(req,120000)).toString('utf8'));}catch{return send(res,400,{error:'Invalid cleanup request.'});}
 const keep=new Set(Array.isArray(input.keep)?input.keep.filter(x=>/^[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(x)):[]);
 if(input.confirm!=='DELETE-UNUSED'||!Array.isArray(input.keep))return send(res,400,{error:'Explicit cleanup confirmation required.'});
 try{let deleted=0,bytes=0;for(const entry of fs.readdirSync(ART_DIR)){
  if(!/^[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(entry)||keep.has(entry))continue;
  const f=path.join(ART_DIR,entry),st=fs.lstatSync(f);if(!st.isFile())continue;
  fs.unlinkSync(f);deleted++;bytes+=st.size;
 }return send(res,200,{deleted,bytes});}
 catch(e){if(e.code==='ENOENT')return send(res,200,{deleted:0,bytes:0});return send(res,503,{error:'Cache cleanup was not completed.'});}
}

// Reject DNS rebinding before any private cache or backup endpoint is reached.
const localNames=new Set(['localhost','127.0.0.1','[::1]']);
if(HOST==='0.0.0.0')for(const entries of Object.values(os.networkInterfaces()))for(const entry of entries||[])localNames.add(entry.family==='IPv6'?'['+entry.address+']':entry.address);
const server = http.createServer(async (req,res) => {
  let authority,url;
  try{
    const host=req.headers.host||'';
    authority=new URL('http://'+host);
    if(authority.host!==host.toLowerCase()||!localNames.has(authority.hostname)||Number(authority.port||80)!==PORT)return send(res,421,{error:'Use the local Rowanvale address shown by the launcher.'});
    url=new URL(req.url,authority.origin);
  }catch{return send(res,400,{error:'Invalid request address.'});}

  if (url.pathname.startsWith('/api/artwork/') && HOST !== '127.0.0.1') return send(res,403,{error:'Local artwork cache is disabled for LAN/public hosting.'});
  if (req.method === 'POST' && url.pathname === '/api/workshop/export') return workspacePack(req,res,'backup-export');
  if (req.method === 'POST' && url.pathname === '/api/workshop/import') return workspacePack(req,res,'backup-import');
  if (req.method === 'POST' && url.pathname === '/api/artwork/verify') return artworkVerify(req,res);
  if (req.method === 'POST' && url.pathname === '/api/artwork/cleanup') return artworkCleanup(req,res);
  if (req.method === 'POST' && url.pathname === '/api/artwork/cache') return cacheArtwork(req,res);
  if (req.method === 'GET' && url.pathname === '/api/artwork/stats') return artworkStats(req,res);
  if (['GET','HEAD'].includes(req.method) && url.pathname.startsWith('/api/artwork/file/')) return serveArtwork(req,res,url.pathname);
  if(req.method==='GET'&&url.pathname==='/api/connectivity'){try{return send(res,200,await metadataService.probe());}catch(e){return send(res,503,{error:'The metadata sources could not be checked.'});}}
  if(req.method==='GET'&&url.pathname==='/api/launch')return send(res,200,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Opening Rowanvale 19.3.0</title><body><p>Opening the installed Rowanvale build. Your saved workspace stays in this browser.</p><script>(async()=>{try{if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();for(const reg of regs){const url=reg.active?.scriptURL||reg.waiting?.scriptURL||reg.installing?.scriptURL;if(url===location.origin+'/sw.js')await reg.unregister();}}}catch{}location.replace('/index.html?build=19.3.0');})();</script><noscript><a href="/index.html?build=19.3.0">Open Rowanvale</a></noscript></body></html>`,'text/html; charset=utf-8');
  if(url.pathname==='/api/artwork/resolve'){if(req.method!=='POST')return send(res,405,{error:'Use POST for artwork resolution.'});if(!allowedIntent(req,'resolve-artwork'))return send(res,403,{error:'Artwork resolution requires your local Rowanvale session.'});try{const input=JSON.parse((await readLimited(req,24000)).toString('utf8'));return send(res,200,await coverService.resolve(input.items,{refresh:input.refresh===true}));}catch(e){return send(res,e instanceof SyntaxError?400:e.status||502,{error:e.message});}}
  if(req.method==='GET'&&url.pathname.startsWith('/api/metadata/')){try{
 const ip=req.socket.remoteAddress||'local',now=Date.now();let b=buckets.get('metadata:'+ip);if(!b||now-b.start>60000)b={start:now,count:0};b.count++;buckets.set('metadata:'+ip,b);if(b.count>36)return send(res,429,{error:'Too many catalog requests. Retry in one minute.',retryAfter:60});
 if(url.pathname==='/api/metadata/status')return send(res,200,metadataService.status());
 if(url.pathname==='/api/metadata/search')return send(res,200,await metadataService.search(url.searchParams.get('type'),url.searchParams.get('q')));
 if(url.pathname==='/api/metadata/details')return send(res,200,await metadataService.details(url.searchParams.get('type'),url.searchParams.get('provider'),url.searchParams.get('id')));
 return send(res,404,{error:'Unknown metadata endpoint.'});
 }catch(e){return send(res,e.status||503,{error:e.message,retryAfter:e.retryAfter||0});}}
 if (req.method === 'GET' && url.pathname === '/api/health') return send(res,200,{ok:true,provider:'RAWG',configured:Boolean(process.env.RAWG_API_KEY)});
  if(req.method==='GET'&&url.pathname==='/api/books/search'){try{const ip=(req.socket.remoteAddress||'local');const now=Date.now();const bucket=buckets.get('books:'+ip)||{start:now,count:0};if(now-bucket.start>60000){bucket.start=now;bucket.count=0;}bucket.count++;buckets.set('books:'+ip,bucket);if(bucket.count>18)return send(res,429,{error:'Too many book searches. Try again in a minute.'});return send(res,200,await booksCatalog.search(url.searchParams.get('q')));}catch(err){return send(res,err.status||503,{error:err.message||'Book directory unavailable.'});}}
  if(req.method==='GET'&&url.pathname==='/api/watch/search'){try{return send(res,200,await watchCatalog.search(url.searchParams.get('type'),url.searchParams.get('q')));}catch(e){return send(res,e.status||503,{error:e.message||'Catalog unavailable. Use your local watchlist.'});}}
  if (req.method === 'GET' && url.pathname === '/api/games') return gamesSearch(req,res,url);
  if (url.pathname.startsWith('/api/resources/') || ['/api/recipes','/api/exercises','/api/barcode'].includes(url.pathname)) {if(await handleResources(req,res,url,send))return;}
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res,405,{error:'Method not allowed.'});
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return send(res,400,{error:'Invalid path.'}); }
  if(pathname.includes('\\')||pathname.includes('\0'))return send(res,400,{error:'Invalid path.'});
  if (pathname === '/') pathname = '/index.html';
  // Never serve hidden files, local credentials, test fixtures, or distributable archives.
  const segments = pathname.split('/').filter(Boolean);
  if (segments.some(part=>part.startsWith('.') || ['node_modules','tests','screenshots'].includes(part)) || /\.(?:zip|bak|sqlite|db|log)$/i.test(pathname)) return send(res,404,{error:'Not found.'});
  const file = path.resolve(ROOT, '.' + pathname);
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) return send(res,403,{error:'Forbidden.'});
  if (file === path.join(ROOT,'.env') || file === path.join(ROOT,'artwork-fetch.js') || file === path.join(ROOT,'metadata-service.js') || file === path.join(ROOT,'cover-service1861.js') || file === path.join(ROOT,'books-catalog.js') || file === path.join(ROOT,'server.js') || file === path.join(ROOT,'watch-catalog.js') || file === path.join(ROOT,'resources.js') || file === path.join(ROOT,'artwork-pack.js')) return send(res,404,{error:'Not found.'});
  // Test reports, archived backups, scripts, installer files and local configuration are not public web resources.
  // JSON is only served for the version manifest; the application and all feature assets remain available.
  const ext=path.extname(file).toLowerCase();
  if(!Object.hasOwn(MIME,ext) || (ext==='.json' && path.basename(file)!=='version.json')) return send(res,404,{error:'Not found.'});
  fs.stat(file,(err,st)=>{
    if (err || !st.isFile()) return send(res,404,{error:'Not found.'});
    const type=MIME[path.extname(file).toLowerCase()]||'application/octet-stream';
    res.writeHead(200,staticHeaders(type,path.basename(file)==='sw.js'?'no-cache':'no-store'));
    if(req.method==='HEAD') return res.end();
    fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  });
});
server.listen(PORT, HOST, () => {
 console.log(`Rowanvale running at http://localhost:${PORT} · RAWG ${process.env.RAWG_API_KEY?'configured':'not configured (see .env.example)'}`);
 // The Windows launcher opens only after THIS copy owns the port. An old
 // running copy must never be mistaken for a successful update.
 if(process.platform==='win32'&&process.env.ROWANVALE_OPEN_BROWSER==='1') {
  require('node:child_process').execFile('cmd.exe',['/c','start','',`http://localhost:${PORT}/api/launch`],{windowsHide:true},err=>{if(err)console.log(`Open http://localhost:${PORT} in your browser.`)});
 }
});
