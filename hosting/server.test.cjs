'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {configuration,start}=require('./server.cjs');
test('hosted configuration fails closed for missing secrets, insecure remote origin and relative data storage',()=>{
 const env={PUBLIC_URL:'https://rowanvale.example',ROWANVALE_WEB_USER:'owner',ROWANVALE_WEB_PASSWORD:'a-unique-test-password-12345',ROWANVALE_DATA_DIR:os.tmpdir()};
 assert.throws(()=>configuration({...env,ROWANVALE_WEB_PASSWORD:''}),/20 characters/);
 assert.throws(()=>configuration({...env,PUBLIC_URL:'http://rowanvale.example'}),/HTTPS/);
 assert.throws(()=>configuration({...env,ROWANVALE_DATA_DIR:'relative'}),/absolute/);
 assert.throws(()=>configuration({...env,PUBLIC_URL:'https://rowanvale.example/path'}),/origin/);
});
test('real desktop backend works behind authenticated hosted gateway',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rowanvale-hosted-'));
 const origin='http://localhost:8080',auth='Basic '+Buffer.from('owner:a-unique-test-password-12345').toString('base64');
 const app=await start({...process.env,PUBLIC_URL:origin,PORT:'0',ROWANVALE_WEB_USER:'owner',ROWANVALE_WEB_PASSWORD:'a-unique-test-password-12345',ROWANVALE_DATA_DIR:dir,WEB_BIND:'127.0.0.1'});
 const base='http://127.0.0.1:'+app.server.address().port;
 const request=(p,options={})=>new Promise((resolve,reject)=>{const r=require('node:http').request(base+p,{method:options.method||'GET',headers:{host:'localhost:8080',authorization:auth,...options.headers}},reply=>{const chunks=[];reply.on('data',c=>chunks.push(c));reply.on('end',()=>{const b=Buffer.concat(chunks);resolve({status:reply.statusCode,headers:{get:k=>reply.headers[k.toLowerCase()]},text:async()=>b.toString(),json:async()=>JSON.parse(b),bytes:b});});});r.on('error',reject);r.end(options.body);});
 try{
  await t.test('unauthenticated visitors cannot read app, artwork or backup tools',async()=>{for(const p of ['/','/api/artwork/stats','/api/workshop/export']){const r=await request(p,{headers:{authorization:''}});assert.equal(r.status,401);assert.match(r.headers.get('www-authenticate'),/Basic/);}});
  await t.test('wrong account cannot access the private server',async()=>{assert.equal((await request('/api/artwork/stats',{headers:{authorization:'Basic '+Buffer.from('other:wrong-password').toString('base64')}})).status,401);});
  await t.test('host allowlist rejects an unexpected domain',async()=>assert.equal((await request('/',{headers:{host:'attacker.example'}})).status,421));
  await t.test('same-origin private APIs forward correctly',async()=>{const r=await request('/api/artwork/stats');assert.equal(r.status,200);assert.equal((await r.json()).cached,0);const h=await request('/api/health');assert.equal((await h.json()).ok,true);});
  await t.test('original app and version are served without exposing server source',async()=>{assert.match(await (await request('/')).text(),/Rowanvale 1.1.0/);assert.equal((await (await request('/version.json')).json()).version,'1.0.0');for(const p of ['/server.js','/.env','/hosting/server.cjs'])assert.equal((await request(p)).status,404);});
  await t.test('cross-origin writes fail before intent rewriting',async()=>{for(const headers of [{origin:'https://attacker.example'},{},{origin, 'sec-fetch-site':'cross-site'}])assert.equal((await request('/api/artwork/resolve',{method:'POST',headers:{...headers,'content-type':'application/json','x-rowanvale-intent':'resolve-artwork'},body:'{"items":[]}'})).status,403);});
  await t.test('verified same-origin intent reaches the real resolver',async()=>{const r=await request('/api/artwork/resolve',{method:'POST',headers:{origin,'content-type':'application/json','x-rowanvale-intent':'resolve-artwork'},body:'{"items":[]}'});assert.equal(r.status,200);});
  await t.test('valid origin without the required intent remains rejected',async()=>assert.equal((await request('/api/artwork/resolve',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{"items":[]}'})).status,403));
  await t.test('real ZIP export and import round-trip workspace and selected artwork',async()=>{
   const artwork=path.join(dir,'artwork');fs.mkdirSync(artwork,{recursive:true});const filename='a'.repeat(64)+'.png';const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1kAAAAASUVORK5CYII=','base64');fs.writeFileSync(path.join(artwork,filename),bytes);
   const workspace={profile:{name:'Hosted test'},settings:{rv17:{covers:{fixture:{src:'/api/artwork/file/'+filename}}}},backlog:[]};
   const r=await request('/api/workshop/export',{method:'POST',headers:{origin,'content-type':'application/json','x-rowanvale-intent':'backup-export'},body:JSON.stringify(workspace)});
   assert.equal(r.status,200);assert.equal(r.bytes.toString('ascii',0,2),'PK');
   fs.unlinkSync(path.join(artwork,filename));
   const restored=await request('/api/workshop/import',{method:'POST',headers:{origin,'content-type':'application/zip','x-rowanvale-intent':'backup-import'},body:r.bytes});
   assert.equal(restored.status,200);assert.deepEqual((await restored.json()).data,workspace);assert.deepEqual(fs.readFileSync(path.join(artwork,filename)),bytes);
  });
  await t.test('offline shell and new feature modules remain available behind owner sign-in',async()=>{for(const p of ['/sw.js','/training193.js','/wellbeing193.js','/media193.js','/import193.js'])assert.equal((await request(p)).status,200);});
 }finally{await app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
