// Synchronous local posting: one atomic localStorage replacement is the commit point.
// Intermediate save() calls are suppressed. Never await or render inside the mutation.
const bookClone=value=>JSON.parse(JSON.stringify(value));

// Keep original object identities too: open forms may hold a payment or product reference.
function bookUndo(){
  const objects=[],seen=new Set();
  function capture(value){
    if(!value||typeof value!=='object'||seen.has(value))return;
    seen.add(value);
    const fields=Object.entries(value),length=Array.isArray(value)?value.length:null;
    objects.push({value,fields,length});fields.forEach(([,child])=>capture(child));
  }
  Object.values(DB).forEach(capture);capture(S);
  return ()=>objects.forEach(({value,fields,length})=>{
    Object.keys(value).forEach(k=>delete value[k]);
    if(length!==null)value.length=length;
    fields.forEach(([key,child])=>{value[key]=child});
  });
}

function bookTransaction(action, ref, mutate){
  if(bookTransactionActive)throw new Error('A posting operation is already running');
  const before=bookClone(storePayload()), undo=bookUndo();
  bookTransactionActive=true;
  let result;
  try{
    if(window._noSave)throw new Error('Saving is disabled. Reopen the app before posting.');
    result=mutate();
    if(result===false)throw new Error('The operation was refused.');
    const health=ledHealthy();
    if(health.diff!==0||health.bad.length)throw new Error('The ledger does not balance.');
    const reference=typeof ref==='function'?ref():ref;
    const previous=before.INVD[reference]||before.PAYM.find(p=>p.id===reference)||null;
    const current=INVD[reference]||PAYM.find(p=>p.id===reference)||null;
    AUDIT.push({id:'audit-'+Date.now()+'-'+AUDIT.length,at:new Date().toISOString(),
      action,ref:reference,by:S.user?S.user.n:'',byId:S.user?S.user.id:'',
      before:previous,after:bookClone(current),
      ledgerBefore:before.JRN.filter(e=>e.ref===reference),
      ledgerAfter:bookClone(JRN.filter(e=>e.ref===reference)),
      changed:Object.keys(DB).filter(k=>k!=='AUDIT'&&JSON.stringify(before[k])!==JSON.stringify(DB[k]))});
    // If this throws (quota, disabled storage, serialization), the old stored book is intact.
    localStorage.setItem(STORE_KEY,JSON.stringify(storePayload()));
  }catch(error){
    undo();
    return {ok:false,error:'Nothing was saved. '+(error.message||'Device storage is unavailable.')};
  }finally{bookTransactionActive=false}
  // Cloud bookkeeping is a post-commit effect; its failure must never roll back a saved book.
  try{if(typeof cloudTouch==='function')cloudTouch()}catch(e){}
  return {ok:true,value:result};
}

function showPostingHistory(){
  if(!can('reports')){toast('You do not have access to posting history');return}
  const rows=AUDIT.slice().reverse().map(e=>e.at+' | '+e.action+' | '+e.ref+' | '+(e.by||'Local user')+'\n'+
    JSON.stringify({before:e.before,after:e.after,ledgerBefore:e.ledgerBefore,ledgerAfter:e.ledgerAfter},null,2));
  textSheet('Posting history','Invoice and payment changes saved on this device',rows.join('\n\n')||'No posting history yet. New invoice and payment operations appear here.',
    'Newest first. Each entry shows who saved the change, its time in UTC, and the document and ledger before and after. You can copy this history.');
}

// Feature operations can join an enclosing transaction (for example a salary batch).
function featureTransaction(action,ref,mutate){if(bookTransactionActive)return mutate();const result=bookTransaction(action,ref,mutate);if(!result.ok){toast(result.error);return false}return result.value}
