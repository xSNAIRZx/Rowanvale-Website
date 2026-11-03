'use strict';
/* Open Library: deliberate, low-volume searches only. Never bulk-harvest metadata. */
const cache=new Map();let lastUpstream=0;
const clean=(s,n=140)=>String(s??'').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,n);
const number=(x,max)=>Number.isFinite(+x)?Math.max(0,Math.min(max,Math.floor(+x))):0;
function transform(d){
 if(!d||typeof d!=='object'||!clean(d.title))return null;
 const rawKey=String(d.key||'');const work=/\bOL\d+W\b/.exec(rawKey)?.[0]||'';
 const isbn=(Array.isArray(d.isbn)?d.isbn:[]).map(String).find(x=>/^(?:\d{10}|\d{13})$/.test(x))||'';
 return {title:clean(d.title),author:clean(Array.isArray(d.author_name)?d.author_name.slice(0,2).join(', '):'',160),year:number(d.first_publish_year,2200),pages:number(d.number_of_pages_median,20000),coverId:number(d.cover_i,999999999),workId:work,isbn,genres:(Array.isArray(d.subject)?d.subject:[]).slice(0,4).map(x=>clean(x,45)).filter(Boolean).join(', '),provider:'Open Library'};
}
async function search(query,fetcher=globalThis.fetch){
 const q=clean(query,100);if(q.length<2)throw Object.assign(Error('Enter at least 2 characters.'),{status:400});
 const key=q.toLocaleLowerCase();let item=cache.get(key);
 if(item&&Date.now()-item.at<10*60_000)return {...item.value,cached:true};
 if(Date.now()-lastUpstream<1100)throw Object.assign(Error('Please wait a moment between catalog searches.'),{status:429});
 lastUpstream=Date.now();
 const url=new URL('https://openlibrary.org/search.json');
 url.searchParams.set('q',q);url.searchParams.set('limit','18');url.searchParams.set('fields','key,title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,subject');
 let r;try{r=await fetcher(url,{headers:{Accept:'application/json','User-Agent':'Rowanvale-LocalBookSearch/18.3 (human-initiated; openlibrary.org/developers/api)'},signal:AbortSignal.timeout(9000)});}catch{throw Object.assign(Error('Open Library is unavailable. Offline books and manual entry still work.'),{status:503});}
 if(r.status===429)throw Object.assign(Error('Open Library rate limit reached. Try again later.'),{status:429});
 if(!r.ok)throw Object.assign(Error('Open Library returned HTTP '+r.status+'.'),{status:503});
 const len=Number(r.headers?.get?.('content-length')||0);if(len>1_600_000)throw Object.assign(Error('Catalog response is too large.'),{status:502});
 const text=await r.text();if(text.length>1_600_000)throw Object.assign(Error('Catalog response is too large.'),{status:502});
 let raw;try{raw=JSON.parse(text)}catch{throw Object.assign(Error('Catalog response is invalid.'),{status:502});}
 const value={provider:'Open Library',results:(Array.isArray(raw.docs)?raw.docs:[]).slice(0,18).map(transform).filter(Boolean),count:number(raw.numFound||raw.num_found,10000000),cached:false};
 if(cache.size>=65)cache.delete(cache.keys().next().value);cache.set(key,{at:Date.now(),value});return value;
}
module.exports={search,transform};
