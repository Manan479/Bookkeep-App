// platform/backups.js - automatic snapshots of the whole book, kept on the device.
//
// Why this exists: the book lives in one browser storage entry on one device. A bad edit, a failed restore or a
// lost phone can take it. These snapshots are cheap insurance and, unlike a file the user remembers to save,
// they happen without anybody deciding to.
//
// Storage: IndexedDB, because a book with receipt photos does not fit in localStorage's few megabytes. If
// IndexedDB is unavailable (a locked-down WebView, the test harness) the snapshots are held in memory for the
// life of the page and the screen says so.
const BK_DB='bookkeep_backups', BK_STORE='snapshots', BK_LIMIT=5, BK_META='bk_backup_meta';
let bkMem=[];

function bkIdb(){return new Promise((res,rej)=>{try{
  if(typeof indexedDB==='undefined')return rej(new Error('no IndexedDB'));
  const r=indexedDB.open(BK_DB,1);
  // A blocked upgrade can leave open() silent forever (another tab holding the old version), so give up and
  // let the caller fall back to memory rather than leaving the Backups screen spinning.
  const timer=setTimeout(()=>rej(new Error('IndexedDB timed out')),1500);
  r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(BK_STORE)){const st=db.createObjectStore(BK_STORE,{keyPath:'id',autoIncrement:true});st.createIndex('at','at')}};
  r.onsuccess=()=>{clearTimeout(timer);res(r.result)};
  r.onerror=()=>{clearTimeout(timer);rej(r.error)};
  r.onblocked=()=>{clearTimeout(timer);rej(new Error('IndexedDB blocked'))};
}catch(e){rej(e)}})}

async function bkStorage(){try{await bkIdb();return 'indexeddb'}catch(e){return 'memory'}}

async function bkAdd(rec){try{const db=await bkIdb();
  await new Promise((res,rej)=>{const t=db.transaction(BK_STORE,'readwrite');t.objectStore(BK_STORE).add(rec);t.oncomplete=res;t.onerror=()=>rej(t.error)});
  return 'indexeddb';
}catch(e){bkMem.push(Object.assign({id:'mem'+Date.now()+Math.random()},rec));return 'memory'}}

async function bkAll(){try{const db=await bkIdb();
  const rows=await new Promise((res,rej)=>{const t=db.transaction(BK_STORE,'readonly'),q=t.objectStore(BK_STORE).getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)});
  return rows.concat(bkMem).sort((a,b)=>b.at-a.at);
}catch(e){return bkMem.slice().sort((a,b)=>b.at-a.at)}}

async function bkRemove(id){try{const db=await bkIdb();
  await new Promise((res,rej)=>{const t=db.transaction(BK_STORE,'readwrite');t.objectStore(BK_STORE).delete(id);t.oncomplete=res;t.onerror=()=>rej(t.error)});
}catch(e){}bkMem=bkMem.filter(r=>r.id!==id)}

async function bkPrune(){const all=await bkAll();for(const r of all.slice(BK_LIMIT))await bkRemove(r.id);return Math.min(all.length,BK_LIMIT)}

const bkMeta=()=>{try{return JSON.parse(localStorage.getItem(BK_META)||'null')}catch(e){return null}};
const bkWriteMeta=m=>{try{localStorage.setItem(BK_META,JSON.stringify(m))}catch(e){}};
const bkDaysAt=at=>at?Math.floor((Date.now()-at)/864e5):null;
const bkDays=m=>bkDaysAt(m&&m.at);
// ok under two days, warn after that, bad after a week - or when there has never been one.
function bkHealth(m){const d=bkDays(m);
  if(d===null)return{level:'bad',days:null,text:'never'};
  if(d>=7)return{level:'bad',days:d,text:d+' days ago'};
  if(d>=2)return{level:'warn',days:d,text:d+' days ago'};
  return{level:'ok',days:d,text:d===0?'today':d===1?'yesterday':d+' days ago'}}

// Take a snapshot of exactly what save() would write, so a backup cannot contain something the app would not
// have saved. The counts are kept beside it so the Backups screen can say what is inside without parsing it.
async function snapshotBook(reason){
  const payload=backupJSON(),at=Date.now();
  const rec={at,reason:reason||'manual',payload,bytes:payload.length,
    counts:{invoices:INV.length,purchases:PUR.length,expenses:EXP.length,journal:JRN.length,products:PRD.length}};
  const where=await bkAdd(rec);
  await bkPrune();
  bkWriteMeta({at,reason:rec.reason,bytes:rec.bytes,counts:rec.counts});
  return {rec,where};
}

const bkHasData=()=>INV.length+PUR.length+EXP.length+JRN.length+PRD.length>0;
// Once a day is enough: the point is to survive a bad day, not to keep every keystroke.
async function maybeAutoBackup(){try{
  if(!bkHasData())return null;
  const d=bkDays(bkMeta());
  if(d!==null&&d<1)return null;
  return await snapshotBook('automatic');
}catch(e){return null}}

// Restore one snapshot, checking it before and after: the current book is captured first, and if the restored
// copy does not balance, the current one is put back rather than leaving a half-good book in place.
async function bkRestore(id){const all=await bkAll(),rec=all.find(r=>r.id===id);
  if(!rec)return {ok:false,reason:'That backup is no longer here'};
  const before=backupJSON();
  const bad=restoreJSON(rec.payload);
  if(bad)return {ok:false,reason:bad};
  const trial=trialRows(),broken=ledHealthy().bad.length;
  if(trial.diff!==0||broken){restoreJSON(before);return {ok:false,reason:'That backup does not balance, so the current book was kept'}}
  S.screen=null;S.tab='dash';render();
  return {ok:true};
}
