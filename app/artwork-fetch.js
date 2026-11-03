'use strict';
// Cover-provider redirects remain constrained at every hop; no arbitrary archive URLs are accepted.
function allowedArchiveCover(original,next){
 if(original.hostname!=='covers.openlibrary.org'||next.protocol!=='https:'||next.username||next.password||next.port)return false;
 if(next.hostname==='archive.org')return !next.search&&/^\/download\/[lms]_covers_\d+\/[lms]_covers_\d+_\d+\.zip\/\d+-[LMS]\.jpg$/.test(next.pathname);
 if(!/^ia\d+\.(us|eu)\.archive\.org$/.test(next.hostname)||next.pathname!=='/view_archive.php')return false;
 return [...next.searchParams.keys()].every(k=>['archive','file'].includes(k))&&next.searchParams.getAll('archive').length===1&&next.searchParams.getAll('file').length===1&&/^\/\d+\/items\/[lms]_covers_\d+\/[lms]_covers_\d+_\d+\.zip$/.test(next.searchParams.get('archive')||'')&&/^\d+-[LMS]\.jpg$/.test(next.searchParams.get('file')||'');
}
async function fetchArtwork(source,validate,fetcher=globalThis.fetch){const original=new URL(source),signal=AbortSignal.timeout(12000);let current=original;for(let hop=0;hop<4;hop++){const response=await fetcher(current,{redirect:'manual',signal,headers:{Accept:'image/webp,image/png,image/jpeg'}});if(![301,302,303,307,308].includes(response.status))return response;const target=response.headers.get('location');if(!target)throw Error('Artwork redirect is missing its destination.');const next=new URL(target,current);if(!validate(next.href)&&!allowedArchiveCover(original,next))throw Error('Artwork redirect destination is not supported.');await response.body?.cancel?.().catch(()=>{});current=next;}throw Error('Too many artwork redirects.');}
module.exports={allowedArchiveCover,fetchArtwork};
