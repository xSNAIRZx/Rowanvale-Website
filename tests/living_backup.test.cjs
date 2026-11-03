'use strict';const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto'),{makeBackup,restoreBackup,inspectZip}=require('../app/artwork-pack');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rowanvale184-test-'));const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5RkAAAAASUVORK5CYII=','base64'),name=crypto.createHash('sha256').update(png).digest('hex')+'.png';fs.writeFileSync(path.join(tmp,name),png);
const data={settings:{theme:'plum'},xp:55,backlog:[{id:'b',title:'Book',type:'Book',metadata184:{artwork:'/api/artwork/file/'+name}}],living184:{version:1,registry:{'book:completed':true},sessions:[],preferences:{moodConsent:true}}};
test('portable ZIP includes covers selected in the new shared library',()=>{const {buffer,manifest}=makeBackup(data,tmp);assert.equal(manifest.includedCovers,1);assert.equal(inspectZip(buffer).data.xp,55);});
test('restore verifies hashes and preserves workspace metadata and artwork',()=>{const {buffer}=makeBackup(data,tmp),dest=path.join(tmp,'restored'),out=restoreBackup(buffer,dest);assert.equal(out.importedCovers,1);assert.deepEqual(fs.readFileSync(path.join(dest,name)),png);assert.deepEqual(out.data,data);assert.equal(restoreBackup(buffer,dest).reusedCovers,1);});
test('archive corruption is rejected before modifying the destination',()=>{const {buffer}=makeBackup(data,tmp),bad=Buffer.from(buffer);bad[100]^=1;assert.throws(()=>restoreBackup(bad,path.join(tmp,'bad')),/checksum|header|JSON|ZIP/i);assert.ok(!fs.existsSync(path.join(tmp,'bad')));});
test('unsafe archive paths are rejected',()=>{const {buffer}=makeBackup(data,tmp),bad=Buffer.from(buffer),original=Buffer.from('artwork/'+name),malicious=Buffer.from('../oops/'+name);malicious.copy(bad,bad.lastIndexOf(original));assert.throws(()=>inspectZip(bad),/Unexpected ZIP file name/);});

test('damaged cached artwork cannot produce an apparently successful but unrestorable backup',()=>{
 const damaged=fs.mkdtempSync(path.join(os.tmpdir(),'rowanvale-damaged-cover-'));
 try{fs.writeFileSync(path.join(damaged,name),Buffer.from('damaged image bytes'));
  assert.throws(()=>makeBackup(data,damaged),/damaged.*JSON backup/i);
  assert.equal(fs.readFileSync(path.join(damaged,name),'utf8'),'damaged image bytes');
 }finally{fs.unlinkSync(path.join(damaged,name));fs.rmdirSync(damaged);}
});
