/* Fixed-host, on-demand public catalog lookup. No private workspace is sent. */
'use strict';
const clean=(x,n=240)=>String(x??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const safe=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
function createWatchCatalog(fetcher=fetch){
 const cache=new Map();let lastRequest=0;
 async function search(kind,q){
  if(!['Movie','Anime','Show'].includes(kind)||typeof q!=='string'||q.trim().length<2||q.length>120)throw Object.assign(Error('Choose a media type and enter 2–120 characters.'),{status:400});
  q=q.trim();const key=kind+':'+q.toLowerCase(),hit=cache.get(key);if(hit&&Date.now()-hit.time<6*3600000)return {...hit.value,cached:true};
  if(Date.now()-lastRequest<500)throw Object.assign(Error('Please wait a moment before searching again.'),{status:429});lastRequest=Date.now();
  const options={signal:AbortSignal.timeout(9000),redirect:'error',headers:{Accept:'application/json','User-Agent':'RowanvaleLocal/18.1 (personal local watchlist)'}};let url,provider,body;
  if(kind==='Movie'){provider='Wikidata';url=new URL('https://www.wikidata.org/w/api.php');for(const [k,v] of Object.entries({action:'wbsearchentities',language:'en',search:q,format:'json',limit:'20'}))url.searchParams.set(k,v);}
  if(kind==='Show'){provider='TVmaze';url=new URL('https://api.tvmaze.com/search/shows');url.searchParams.set('q',q);}
  if(kind==='Anime')throw Object.assign(Error('Use Games & Media artwork lookup for anime. AniList access is disabled under its tracker restrictions.'),{status:412});
  if(false){provider='AniList';url='https://graphql.anilist.co';options.method='POST';options.headers['Content-Type']='application/json';options.body=JSON.stringify({query:'query ($search:String){Page(perPage:12){media(search:$search,type:ANIME,isAdult:false){id title{romaji english} episodes duration seasonYear genres siteUrl}}}',variables:{search:q}});}
  const r=await fetcher(url,options);if(!r.ok)throw Error(provider+' is unavailable ('+r.status+'). Your local watchlist still works.');
  const text=await r.text();if(text.length>2000000)throw Error('Catalog response was too large.');body=JSON.parse(text);let results;
  if(kind==='Movie')results=(body.search||[]).filter(x=>/\b(film|movie)\b/i.test(x.description||'')&&/^Q\d+$/.test(x.id)).map(x=>({title:clean(x.label,140),type:kind,sourceId:x.id,sourceUrl:'https://www.wikidata.org/wiki/'+x.id,year:Number((x.description||'').match(/\b(18|19|20)\d{2}\b/)?.[0])||0,description:clean(x.description)}));
  if(kind==='Show')results=(Array.isArray(body)?body:[]).map(x=>x.show).filter(Boolean).map(x=>({title:clean(x.name,140),type:kind,sourceId:String(x.id),sourceUrl:safe(x.url),year:Number(String(x.premiered||'').slice(0,4))||0,minutes:Number(x.averageRuntime||x.runtime)||0,genres:(x.genres||[]).map(x=>clean(x,40)).slice(0,6).join(', '),description:clean(x.summary)}));
  if(kind==='Anime'){if(body.errors)throw Error('AniList could not complete this search. Try again later.');results=(body.data?.Page?.media||[]).map(x=>({title:clean(x.title?.english||x.title?.romaji,140),type:kind,sourceId:String(x.id),sourceUrl:safe(x.siteUrl),year:Number(x.seasonYear)||0,minutes:Number(x.duration)||0,totalEpisodes:Number(x.episodes)||0,genres:(x.genres||[]).map(x=>clean(x,40)).slice(0,6).join(', ')}));}
  const value={provider,results:results.filter(x=>x.title).slice(0,12),cached:false};cache.set(key,{time:Date.now(),value});if(cache.size>60)cache.delete(cache.keys().next().value);return value;
 }
 return {search};
}
module.exports={createWatchCatalog};
