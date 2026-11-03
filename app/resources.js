'use strict';
// Fixed-provider, bounded external resource lookups. No personal logs leave Hearthbyte.
const {URL} = require('node:url');
const IP_LIMIT = 25, WINDOW = 60_000;
const hits = new Map();
const cache = new Map();
function rateLimited(ip){
  const now=Date.now();const value=hits.get(ip);
  const next=(!value||now-value.start>WINDOW)?{start:now,count:1}:{...value,count:value.count+1};
  hits.set(ip,next);
  if(hits.size>5000)for(const [key,v] of hits){if(now-v.start>WINDOW)hits.delete(key)}
  return next.count>IP_LIMIT;
}
function cached(key){const value=cache.get(key);return value&&value.until>Date.now()?value.body:null}
function store(key,body){if(cache.size>=150){cache.delete(cache.keys().next().value)}cache.set(key,{until:Date.now()+15*60_000,body});return body}
function text(value,max=400){return String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}
function number(value){const n=Number(value);return Number.isFinite(n)&&n>=0&&n<100_000?Math.round(n*10)/10:null}
async function getJSON(url, headers={}){
  const resp=await fetch(url,{headers:{Accept:'application/json',...headers},signal:AbortSignal.timeout(8000)});
  if(!resp.ok)throw Error('Resource provider unavailable (HTTP '+resp.status+').');
  return resp.json();
}
function recipe(meal){
  const ingredients=[];
  for(let i=1;i<=20;i++){const n=text(meal['strIngredient'+i],80),q=text(meal['strMeasure'+i],80);if(n)ingredients.push(`${q} ${n}`.trim())}
  return {id:text(meal.idMeal,24),title:text(meal.strMeal,130),category:text(meal.strCategory,60),area:text(meal.strArea,60),ingredients:ingredients.slice(0,20),instructions:text(meal.strInstructions,4500),url:(/^https:\/\/[a-z0-9.-]+(?:[\/:?#]|$)/i.test(String(meal.strSource||''))?String(meal.strSource).slice(0,350):'https://www.themealdb.com/'),source:'TheMealDB',nutritionAvailable:false};
}
function exercise(item){
  const tr=(Array.isArray(item.translations)?item.translations.find(t=>t.language===2&&t.name):null)||item;
  const name=text(tr.name||item.name,120);if(!name)return null;
  return {id:String(item.id||''),name,description:text(tr.description||item.description,650),category:text(item.category?.name||'',60),equipment:(item.equipment||[]).map(v=>text(v.name||v,50)).filter(Boolean).slice(0,6),source:'wger',url:`https://wger.de/en/exercise/${encodeURIComponent(String(item.id||''))}/`};
}
async function lookup(kind,raw){
 const query=String(raw||'').trim().slice(0,80);
 if((kind==='recipes'||kind==='exercises')&&query.length<2)throw Object.assign(Error('Enter at least two characters to search.'),{status:400});
 if(kind==='barcode'&&!/^\d{8,14}$/.test(query))throw Object.assign(Error('Enter a barcode with 8–14 digits.'),{status:400});
 const key=kind+':'+query.toLowerCase();const match=cached(key);if(match)return match;
 if(kind==='recipes'){
  const mealKey=(process.env.MEALDB_API_KEY||'1').trim();
  const url=new URL(`https://www.themealdb.com/api/json/v1/${encodeURIComponent(mealKey)}/search.php`);url.searchParams.set('s',query);
  const payload=await getJSON(url);
  return store(key,{results:(Array.isArray(payload.meals)?payload.meals:[]).slice(0,16).map(recipe),source:'TheMealDB',developmentKey:mealKey==='1'});
 }
 if(kind==='exercises'){
  // Public read-only wger exercises; these are suggestions, not personal routines.
  const url=new URL('https://wger.de/api/v2/exercise/search/');url.searchParams.set('language','english');url.searchParams.set('term',query);url.searchParams.set('format','json');
  const payload=await getJSON(url);
  const suggestions=Array.isArray(payload.suggestions)?payload.suggestions:[];
  const results=suggestions.slice(0,15).map(s=>{const d=s.data||{};return exercise({id:d.id,name:d.name||s.value||s.label,description:d.description||'',category:{name:d.category||''}})}).filter(Boolean);
  return store(key,{results,source:'wger'});
 }
 if(kind==='barcode'){
  const url=new URL(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(query)}.json`);
  url.searchParams.set('fields','code,product_name,brands,quantity,nutriments');
  const ua=`Hearthbyte/10.1.0 (${process.env.HEARTHBYTE_CONTACT||'https://github.com/openfoodfacts/openfoodfacts-server'})`;
  const payload=await getJSON(url,{'User-Agent':ua});
  if(payload.status!==1||!payload.product)return store(key,{found:false,source:'Open Food Facts'});
  const p=payload.product,n=p.nutriments||{};
  return store(key,{found:true,source:'Open Food Facts',product:{barcode:query,name:text(p.product_name,140)||'Unnamed product',brand:text(p.brands,100),quantity:text(p.quantity,80),per100g:{calories:number(n['energy-kcal_100g']),protein:number(n.proteins_100g),carbs:number(n.carbohydrates_100g),fat:number(n.fat_100g)}}});
 }
 throw Object.assign(Error('Unknown resource type.'),{status:404});
}
async function handleResources(req,res,url,send){
  const kind=url.pathname.split('/').pop();
  if(!['recipes','exercises','barcode'].includes(kind))return false;
  if(req.method!=='GET'){send(res,405,{error:'Method not allowed.'});return true}
  const ip=(req.socket.remoteAddress||'unknown').replace(/^::ffff:/,'');
  if(rateLimited(ip)){send(res,429,{error:'Too many resource searches. Try again in a minute.'});return true}
  try{const result=await lookup(kind,url.searchParams.get(kind==='barcode'?'code':'search'));send(res,200,result)}
  catch(e){send(res,e.status||503,{error:e.status?e.message:'Online resource unavailable. Your existing local data is safe; try again when connected.'})}
  return true;
}
module.exports={handleResources,lookup};
