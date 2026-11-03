'use strict';
// Portable private artwork backups. All ZIP entries are STORED (method 0),
// checksum verified and whitelisted. No third-party packages or unzip commands.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const LIMIT = 80 * 1024 * 1024;
const FILE_RE = /^artwork\/([a-f0-9]{64}\.(?:jpg|png|webp))$/;
const URL_RE = /^\/api\/artwork\/file\/([a-f0-9]{64}\.(?:jpg|png|webp))$/;
const sha = buf=>crypto.createHash('sha256').update(buf).digest('hex');
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(data){let c=0xFFFFFFFF;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function buildZip(entries){
 let at=0;const parts=[],directory=[];
 for(const [name,bytes] of entries){const file=Buffer.from(name,'utf8'),len=bytes.length,crc=crc32(bytes),header=Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt32LE(crc,14);header.writeUInt32LE(len,18);header.writeUInt32LE(len,22);header.writeUInt16LE(file.length,26);
  parts.push(header,file,bytes);const center=Buffer.alloc(46);center.writeUInt32LE(0x02014b50,0);center.writeUInt16LE(20,4);center.writeUInt16LE(20,6);center.writeUInt16LE(0x800,8);center.writeUInt32LE(crc,16);center.writeUInt32LE(len,20);center.writeUInt32LE(len,24);center.writeUInt16LE(file.length,28);center.writeUInt32LE(at,42);
  directory.push(center,file);at+=header.length+file.length+len;
 }
 const dLength=directory.reduce((n,b)=>n+b.length,0),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(dLength,12);end.writeUInt32LE(at,16);
 return Buffer.concat([...parts,...directory,end]);
}
function validImage(name,data){
 if(!Buffer.isBuffer(data)||data.length<16)return false;
 if(name.endsWith('.png'))return data.length>=24&&data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))&&data.toString('ascii',12,16)==='IHDR';
 if(name.endsWith('.jpg'))return data[0]===255&&data[1]===216&&data[2]===255;
 if(name.endsWith('.webp'))return data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
 return false;
}
function inspectZip(buf){
 if(buf.length>LIMIT||buf.length<22)throw Error('Invalid or oversized backup.');
 // Read central directory rather than trusting local file headers; forbid ZIP64, encrypted entries and arbitrary paths.
 let end=-1;for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i--){if(buf.readUInt32LE(i)===0x06054b50){end=i;break;}}
 if(end<0||buf.readUInt16LE(end+4)!==0||buf.readUInt16LE(end+6)!==0)throw Error('Multidisk archives are not supported.');
 const count=buf.readUInt16LE(end+10),offset=buf.readUInt32LE(end+16),length=buf.readUInt32LE(end+12);if(count<2||count>4600||offset+length>end)throw Error('Corrupt ZIP directory.');
 let at=offset;const entries=new Map();
 for(let i=0;i<count;i++){
  if(at+46>buf.length||buf.readUInt32LE(at)!==0x02014b50)throw Error('Corrupt ZIP entry.');
  const flags=buf.readUInt16LE(at+8),method=buf.readUInt16LE(at+10),crc=buf.readUInt32LE(at+16),size=buf.readUInt32LE(at+24),compressed=buf.readUInt32LE(at+20),namelen=buf.readUInt16LE(at+28),extra=buf.readUInt16LE(at+30),comment=buf.readUInt16LE(at+32),start=buf.readUInt32LE(at+42);
  const name=buf.subarray(at+46,at+46+namelen).toString('utf8');at+=46+namelen+extra+comment;
  if(!['manifest.json','rowanvale.json'].includes(name)&&!FILE_RE.test(name))throw Error('Unexpected ZIP file name.');
  if(entries.has(name)||method!==0||(flags&1)||compressed!==size||size>4*1024*1024&&name!=='rowanvale.json'||size>LIMIT)throw Error('Unsupported or unsafe ZIP file.');
  if(start+30>offset||buf.readUInt32LE(start)!==0x04034b50)throw Error('Invalid ZIP offsets.');
  const headName=buf.readUInt16LE(start+26),headExtra=buf.readUInt16LE(start+28),dataStart=start+30+headName+headExtra;
  if(dataStart+size>offset)throw Error('ZIP entry exceeds permitted area.');
  if(buf.subarray(start+30,start+30+headName).toString('utf8')!==name)throw Error('ZIP header mismatch.');
  const data=buf.subarray(dataStart,dataStart+size);if(crc32(data)!==crc)throw Error('ZIP checksum mismatch.');entries.set(name,data);
 }
 if(at!==offset+length||entries.size!==count)throw Error('ZIP directory mismatch.');
 const manifest=JSON.parse((entries.get('manifest.json')||Buffer.alloc(0)).toString('utf8'));
 if(manifest.format!=='rowanvale-private-artwork-pack'||manifest.version!==1)throw Error('Not a compatible Rowanvale artwork backup.');
 if(!Array.isArray(manifest.files)||manifest.files.length!==entries.size-2)throw Error('Artwork manifest is incomplete.');
 if(new Set(manifest.files.map(x=>x?.path)).size!==manifest.files.length)throw Error('Duplicate artwork manifest entries.');
 const raw=entries.get('rowanvale.json');if(!raw||sha(raw)!==manifest.dataSha256)throw Error('Workspace backup checksum mismatch.');
 for(const item of manifest.files){if(!item||!FILE_RE.test(item.path)||!entries.has(item.path)||item.bytes!==entries.get(item.path).length||sha(entries.get(item.path))!==item.sha256||!validImage(item.path,entries.get(item.path)))throw Error('An artwork file is missing, invalid or damaged.');}
 const data=JSON.parse(raw.toString('utf8'));
 if(!data||typeof data!=='object'||Array.isArray(data)||!data.settings||!Array.isArray(data.backlog))throw Error('Workspace data is not valid.');
 return {manifest,data,entries};
}
function makeBackup(data,artDir){
 if(!data||typeof data!=='object'||!data.settings||!Array.isArray(data.backlog))throw Error('Workspace data is invalid.');
 const raw=Buffer.from(JSON.stringify(data),'utf8');if(raw.length>12*1024*1024)throw Error('Workspace is too large to archive. Try a JSON backup.');
 const refs=new Set();const covers=data.settings?.rv17?.covers||{};
 for(const v of Object.values(covers)){const id=String(v?.src||'').match(URL_RE);if(id)refs.add(id[1]);}
 for(const g of data.backlog){for(const value of [g?.background_image,g?.metadata184?.artwork,g?.watch?.cover]){const id=String(value||'').match(URL_RE);if(id)refs.add(id[1]);}}
 const entries=[],files=[];let size=raw.length;
 for(const filename of refs){const name=path.join(artDir,filename);if(!fs.existsSync(name)||!fs.statSync(name).isFile())continue;
  const bytes=fs.readFileSync(name);
  // Check the same image requirements as restore before reporting export success.
  // Preserve damaged source bytes so recovery remains the user's choice.
  if(!validImage(filename,bytes))throw Error('A saved cover is damaged. Export a JSON backup to protect your workspace, then repair the cover before making an artwork backup.');
  size+=bytes.length;if(bytes.length>3*1024*1024||size>LIMIT-1024*1024)throw Error('Selected artwork exceeds the 80 MB pack limit. Back up in smaller sets.');
  const entry=`artwork/${filename}`;entries.push([entry,bytes]);files.push({path:entry,bytes:bytes.length,sha256:sha(bytes)});
 }
 const manifest={format:'rowanvale-private-artwork-pack',version:1,createdAt:new Date().toISOString(),dataSha256:sha(raw),includedCovers:files.length,referencedCovers:refs.size,files,notice:'Private, user-selected archive. Artwork belongs to its respective rightsholders; do not redistribute without permission.'};
 return {buffer:buildZip([['manifest.json',Buffer.from(JSON.stringify(manifest))],['rowanvale.json',raw],...entries]),manifest};
}
function restoreBackup(buf,artDir){
 const payload=inspectZip(buf),created=[];
 fs.mkdirSync(artDir,{recursive:true,mode:0o700});
 const existing=fs.readdirSync(artDir).filter(x=>/^[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(x));
 const used=existing.reduce((n,f)=>n+fs.statSync(path.join(artDir,f)).size,0);
 const newFiles=payload.manifest.files.filter(f=>!existing.includes(f.path.slice(8)));
 if(existing.length+newFiles.length>4500||used+newFiles.reduce((n,f)=>n+f.bytes,0)>2*1024*1024*1024)throw Error('Insufficient private artwork cache quota for this backup.');
 try{for(const {path:entry} of payload.manifest.files){const name=path.join(artDir,entry.slice(8)),contents=payload.entries.get(entry);
   // Never clobber a file belonging to an existing workspace.
   try{fs.writeFileSync(name,contents,{flag:'wx',mode:0o600});created.push(name)}catch(e){if(e.code!=='EEXIST'||sha(fs.readFileSync(name))!==sha(contents))throw e;}
  }}catch(err){for(const p of created){try{fs.unlinkSync(p)}catch{}}throw err;}
 return {data:payload.data,importedCovers:created.length,reusedCovers:payload.manifest.files.length-created.length,referencedCovers:payload.manifest.referencedCovers};
}
module.exports={makeBackup,restoreBackup,inspectZip,crc32};
