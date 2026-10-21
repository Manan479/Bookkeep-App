// features/backups.js - the Backups screen: what is kept, restoring one, and keeping one now.
// The storage and the checks live in platform/backups.js; this file only draws them and asks before acting.
async function openBackups(){S.bkList=await bkAll();S.bkWhere=await bkStorage();S.screen='bk';render()}

const bkStamp=at=>new Date(at).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const bkSize=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';

function bkScr(){const list=S.bkList||[],h=bkHealth(bkMeta()),mem=S.bkWhere==='memory';
 return `<div class="scr full"><div class="top"><button class="ic" onclick="S.screen='st';render()">‹</button><h1>Backups</h1><span style="width:38px"></span></div>
 <div class="card" style="margin-bottom:10px"><div class="t">${list.length} snapshot${list.length===1?'':'s'} on this device</div>
 <div class="lbl sm">One is taken automatically once a day, and before anything that replaces the book. The last ${BK_LIMIT} are kept; the oldest is dropped.</div>
 <div class="lbl sm" style="margin-top:6px">Last: ${h.text}${h.level==='bad'?' — that is too long.':''}</div></div>
 ${mem?'<div class="alert a2" style="margin-bottom:10px">This browser refused local storage for snapshots, so these last only until the app closes. Save a backup file as well.</div>':''}
 <button class="btn p" style="width:100%;flex:none;margin-bottom:12px" onclick="bkNow()">Back up now</button>
 ${list.map(r=>`<div class="card" style="margin-bottom:8px"><div class="row" style="border:0;padding:0;margin:0;background:none">
   <div class="grow"><div class="t">${bkStamp(r.at)}</div><div class="lbl sm">${r.reason||'manual'} · ${bkSize(r.bytes||0)}${r.counts?' · '+r.counts.invoices+' invoices, '+r.counts.journal+' entries':''}</div></div>
   <button class="ut" onclick="bkAskRestore(${docAttr(JSON.stringify(r.id))})">Restore</button>
   <button class="ut" style="background:var(--bad);color:#fff" onclick="bkAskDelete(${docAttr(JSON.stringify(r.id))})">✕</button>
 </div></div>`).join('')||'<div class="card" style="text-align:center;padding:26px"><div class="t">No snapshots yet</div><div class="lbl">One will be taken the next time the app opens with a book in it.</div></div>'}
 <div class="lbl sm" style="margin-top:10px">A snapshot is restored into this device only. To move the book to another phone, use “Back up all data” in Settings, which saves a file.</div></div>`}

const bkNow=async()=>{const r=await snapshotBook('manual');toast(r.where==='memory'?'Kept, but only until the app closes':'Backup kept');await openBackups()};
const bkAskRestore=id=>confirmSheet('Restore this snapshot?','The book on this device is replaced by the snapshot. The current state is saved as a new snapshot first, so this can be undone.','Restore',async()=>{
  const r=await bkRestore(id);if(!r.ok){toast(r.reason);await openBackups();return}toast('Backup restored and checked')});
const bkAskDelete=id=>confirmSheet('Delete this snapshot?','Only this saved copy is removed. The book itself is not touched.','Delete',async()=>{await bkRemove(id);await openBackups()});
