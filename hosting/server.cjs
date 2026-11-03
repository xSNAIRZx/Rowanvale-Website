'use strict';
// Owner-private website adapter. The original desktop server remains loopback-only.
const http=require('node:http'),crypto=require('node:crypto'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process');
const hash=v=>crypto.createHash('sha256').update(v).digest();
function configuration(env=process.env){
 const url=new URL(env.PUBLIC_URL||'http://localhost:8080');
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||(!local&&url.protocol!=='https:')||!['http:','https:'].includes(url.protocol))throw Error('PUBLIC_URL must be an HTTPS origin (HTTP is allowed only on localhost).');
 const username=env.ROWANVALE_WEB_USER,password=env.ROWANVALE_WEB_PASSWORD;
 if(!username||username.includes(':')||!password||password.length<20)throw Error('Set ROWANVALE_WEB_USER and a ROWANVALE_WEB_PASSWORD of at least 20 characters.');
 if(!env.ROWANVALE_DATA_DIR||!path.isAbsolute(env.ROWANVALE_DATA_DIR))throw Error('ROWANVALE_DATA_DIR must name an absolute private persistent directory.');
 return {origin:url.origin,host:url.host,port:Number(env.PORT||8080),bind:env.WEB_BIND||'0.0.0.0',credentials:hash(username+':'+password),env};
}
function gateway(config,backendPort){
 const attempts=new Map(),internal='127.0.0.1:'+backendPort;
 const server=http.createServer((req,res)=>{
  const fail=(code,message,extra={})=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...extra});res.end(JSON.stringify({error:message}));};
  if(req.headers.host?.toLowerCase()!==config.host.toLowerCase())return fail(421,'Use the configured website address.');
  if(req.url==='/healthz'&&['GET','HEAD'].includes(req.method)){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(req.method==='HEAD'?'':'{"ok":true}');}
  const ip=req.socket.remoteAddress||'unknown',now=Date.now();
  if(attempts.size>10000)for(const [k,v]of attempts)if(now-v.at>60000)attempts.delete(k);
  const bucket=attempts.get(ip);
  if(bucket&&now-bucket.at<60000&&bucket.count>=15)return fail(429,'Too many sign-in attempts. Retry in one minute.',{'retry-after':'60'});
  const auth=req.headers.authorization||'';let decoded='';
  if(/^Basic [A-Za-z0-9+/]+={0,2}$/.test(auth)){try{decoded=Buffer.from(auth.slice(6),'base64').toString('utf8');}catch{}}
  if(!crypto.timingSafeEqual(hash(decoded),config.credentials)){
   if(auth){const v=bucket&&now-bucket.at<60000?bucket:{at:now,count:0};v.count++;attempts.set(ip,v);}
   return fail(401,'Owner sign-in required.',{'www-authenticate':'Basic realm="Rowanvale private beta", charset="UTF-8"'});
  }
  attempts.delete(ip);
  if(req.headers.origin&&req.headers.origin!==config.origin)return fail(403,'This action must come from your Rowanvale website.');
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin!==config.origin)return fail(403,'A same-origin browser action is required.');
  if(req.headers['sec-fetch-site']==='cross-site')return fail(403,'Cross-site requests are not allowed.');
  if(!req.url?.startsWith('/')||req.url.startsWith('//'))return fail(400,'Invalid request path.');
  const limit=80*1024*1024;
  if(Number(req.headers['content-length']||0)>limit)return fail(413,'Upload exceeds the 80 MB transport limit.');
  const headers={...req.headers,host:internal};
  for(const name of ['authorization','cookie','connection','proxy-authorization','proxy-connection','forwarded','x-forwarded-host','x-forwarded-proto','x-forwarded-for','upgrade','transfer-encoding'])delete headers[name];
  if(req.headers.origin===config.origin)headers.origin='http://'+internal;
  if(headers.referer){try{const r=new URL(headers.referer);if(r.origin!==config.origin)return fail(403,'Unexpected request source.');headers.referer='http://'+internal+r.pathname+r.search;}catch{return fail(400,'Invalid request source.');}}
  let responded=false,bytes=0;
  const upstream=http.request({hostname:'127.0.0.1',port:backendPort,path:req.url,method:req.method,headers},reply=>{
   responded=true;const h={...reply.headers,'cache-control':'private, no-store','x-content-type-options':'nosniff'};
   delete h.connection;delete h['set-cookie'];
   if(req.url==='/sw.js')h['service-worker-allowed']='/';
   if(config.origin.startsWith('https:'))h['strict-transport-security']='max-age=31536000';
   res.writeHead(reply.statusCode,h);reply.pipe(res);
  });
  upstream.setTimeout(120000,()=>upstream.destroy(Error('Upstream timeout')));
  upstream.on('error',()=>{if(!responded&&!res.headersSent)fail(502,'The application server is unavailable. Retry shortly.');else res.destroy();});
  req.on('data',chunk=>{bytes+=chunk.length;if(bytes>limit){upstream.destroy();if(!res.headersSent)fail(413,'Upload exceeds the transport limit.');req.unpipe(upstream);}});
  req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableEnded)upstream.destroy();});
  req.pipe(upstream);
 });
 server.headersTimeout=20000;server.requestTimeout=120000;server.maxHeadersCount=80;
 return server;
}
async function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});}
async function start(env=process.env){
 const config=configuration(env),backendPort=await freePort();
 const child=spawn(process.execPath,[path.join(__dirname,'../app/server.js')],{env:{...env,HOST:'127.0.0.1',PORT:String(backendPort),ROWANVALE_OPEN_BROWSER:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
 child.stdout.resume();child.stderr.resume();
 let exited=false;child.on('error',()=>{exited=true;});child.on('exit',()=>{exited=true;});
 try{let ready=false;for(let n=0;n<100;n++){if(exited)throw Error('Application server failed to start.');try{const r=await fetch('http://127.0.0.1:'+backendPort+'/api/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error('Application server did not become ready.');
 const server=gateway(config,backendPort);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(config.port,config.bind,resolve);});
 const close=()=>new Promise(resolve=>{server.close(()=>{child.kill();resolve();});server.closeAllConnections();});
 child.once('exit',()=>{if(server.listening)server.close();});
 return {server,child,backendPort,close};
 }catch(e){child.kill();throw e;}
}
if(require.main===module)start().then(app=>{console.log('Rowanvale owner-private website is ready at '+configuration().origin);for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>app.close().then(()=>process.exit(0)));}).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={configuration,gateway,start};
