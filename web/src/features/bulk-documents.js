// Selection actions operate on saved snapshots, never the open invoice editor.
const docAttr=value=>esc(value).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function docRowKey(event,no){
  if(event.target!==event.currentTarget)return;
  if(event.key===' '){event.preventDefault();selToggle(no)}
  else if(event.key==='Enter'){event.preventDefault();if(selHere())selToggle(no);else openInv(no)}
}
function selectedDocuments(ids){
  if(!Array.isArray(ids)&&!selHere()&&S.screen!=='batch')return [];
  return (Array.isArray(ids)?ids:selIds()).map(no=>{
    const row=INV.find(r=>r[0]===no)||PUR.find(r=>r[0]===no);
    if(!row)return null;
    const d=INVD[no];if(!d)throw new Error('Open '+no+' once to prepare its saved document.');
    const distributor=d.type==='dist'&&d.under==='Distributor';
    const owner=distributor?DIST.find(x=>x.n===d.dsel):null;
    return {title:d.type==='pur'?'Purchase Invoice':d.type==='dist'?'Distributor Invoice':(S.title||'Invoice'),
      no,date:d.date,due:d.noDue?'':d.due,dueLabel:'Due',partyLabel:d.type==='pur'?'Supplier':'Customer',party:d.party||'',
      partyDetails:bookClone(d.partyDetails===undefined?partyContact(d.party):d.partyDetails),marks:bookClone(d.marks||{}),items:bookClone(d.items||[]),T:bookClone(d.T||{sub:0,dis:0,tax:0,g:0}),
      showBal:!!d.showBal,bal:d.bal?bookClone(d.bal):null,status:d.void?'Void':d.draft?'Draft':row[4],
      seller:owner?{n:owner.n,a:owner.a,p:owner.p,t:owner.t,own:true,b:owner.b}:
        {n:COMP.name,a:COMP.addr,p:COMP.phone,t:taxLine(),own:false}};
  }).filter(Boolean);
}

function bulkRemovalPlan(ids,mode='void'){
  const drafts=[],posted=[],blocked=[];
  for(const no of ids){
    const d=INVD[no],row=INV.find(r=>r[0]===no)||PUR.find(r=>r[0]===no);
    if(!d||!row){blocked.push(no+': document not available');continue}
    if(!can(d.type==='pur'?'purchases':'sales')){blocked.push(no+': access denied');continue}
    if((d.void||row[4]==='Void')&&mode!=='delete'){blocked.push(no+': already void; choose Delete permanently to remove it');continue}
    if(d.draft||row[4]==='Draft'){drafts.push(no);continue}
    if(!isAdmin()){blocked.push(no+': only an administrator can remove posted documents');continue}
    if(RET.some(r=>r.inv===no&&!r.void)){blocked.push(no+': void its returns first');continue}
    if(PAYM.some(p=>!p.void&&p.alloc&&p.alloc[no]!==undefined)||(PAID[no]||0)>0){blocked.push(no+': void its payments first');continue}
    if(mode==='delete'&&EXP.some(expense=>expense.inv===no&&!expense.void)){blocked.push(no+': remove its expense link first');continue}
    posted.push(no);
  }
  return {drafts,posted,blocked};
}

function bulkRemove(ids,mode='void'){
  if(!['void','delete'].includes(mode))return {ok:false,error:'Choose Void or Delete permanently.'};
  const plan=bulkRemovalPlan(ids,mode);
  if(plan.blocked.length||!ids.length)return {ok:false,error:plan.blocked.join('\n')||'Select documents first.'};
  // One transaction for the whole selection: a failure restores every selected document.
  return bookTransaction(mode==='delete'?'Delete selected documents':'Void selected documents',ids.join(', '),()=>{
    for(const no of plan.drafts){
      const previous=bookClone(INVD[no]);
      [INV,PUR].forEach(rows=>{const i=rows.findIndex(r=>r[0]===no);if(i>=0)rows.splice(i,1)});
      delete INVD[no];recordBulkHistory('Delete draft',no,previous);
    }
    for(const no of plan.posted){
      const previous=bookClone(INVD[no]);
      const ledgerBefore=bookClone(JRN.filter(entry=>entry.ref===no));
      if(!INVD[no].void&&!voidDocChanges(no))throw new Error('Could not reverse '+no);
      if(mode==='delete'){
        [INV,PUR].forEach(rows=>{const i=rows.findIndex(row=>row[0]===no);if(i>=0)rows.splice(i,1)});
        delete INVD[no];delete PAID[no];
        QUOT.forEach(quote=>{if(quote.conv){const length=quote.conv.length;quote.conv=quote.conv.filter(conversion=>conversion.inv!==no);if(quote.conv.length!==length&&quote.status==='Converted')quote.status='Accepted'}});
      }
      recordBulkHistory(mode==='delete'?'Delete invoice permanently':'Void invoice',no,previous,ledgerBefore);
    }
    return {deleted:plan.drafts.length+(mode==='delete'?plan.posted.length:0),voided:mode==='delete'?0:plan.posted.length};
  });
}

function recordBulkHistory(action,ref,before,ledgerBefore=[]){
  AUDIT.push({id:'audit-'+Date.now()+'-'+AUDIT.length,at:new Date().toISOString(),action,ref,
    by:S.user?S.user.n:'',byId:S.user?S.user.id:'',before,after:INVD[ref]?bookClone(INVD[ref]):null,
    ledgerBefore,ledgerAfter:bookClone(JRN.filter(entry=>entry.ref===ref))});
}

function bulkRemoveAsk(documents){
 const ids=Array.isArray(documents)?documents:selIds();if(!ids.length){toast('Select documents first');return}
 const isPurchase=ids.every(no=>PUR.some(row=>row[0]===no));
 const posted=ids.some(no=>INVD[no]&&!INVD[no].draft&&!INVD[no].void);
 const o=document.createElement('div');o.className='ov';
 o.innerHTML='<div class="sheet"><div class="grab"></div><h2>Remove '+ids.length+' document(s)</h2>'+
  (posted?'<button class="row" data-remove-mode="void"><span class="grow"><b>Void</b><span class="lbl" style="display:block;margin-top:6px">Keep posted invoices in the register, marked Void. Reverse their stock and accounting effects.</span></span></button>':'')+
  '<button class="row" data-remove-mode="delete"><span class="grow"><b class="red">Delete permanently</b><span class="lbl" style="display:block;margin-top:6px">Remove invoices from the register after reversing posted amounts and stock. An audit record is retained.</span></span></button>'+
  '<button class="btn" data-remove-cancel style="width:100%">Cancel</button></div>';
 o.onclick=e=>{if(e.target===o)o.remove()};$('#app').append(o);
 wire(o,'[data-remove-cancel]',()=>o.remove());
 o.querySelectorAll('[data-remove-mode]').forEach(button=>button.onclick=()=>{
  const mode=button.dataset.removeMode,plan=bulkRemovalPlan(ids,mode);o.remove();
  if(plan.blocked.length){textSheet('Documents cannot be removed','Selected documents',plan.blocked.join('\n'),'No documents have changed. Resolve the listed links or deselect these documents.');return}
  const description=mode==='delete'?'The invoices will be removed from the register. Posted stock and accounting effects are reversed first. Audit history is retained. This cannot be undone.':
   'Posted invoices stay in the register as Void, with stock and accounting effects reversed. Any selected drafts will be deleted.';
  confirmSheet((mode==='delete'?'Delete permanently':'Void')+' '+ids.length+' document(s)?',description,mode==='delete'?'Delete permanently':'Void documents',()=>{
   const result=bulkRemove(ids,mode);
   if(!result.ok){textSheet('Nothing was changed','Selection',result.error,'Correct the issue and try again.');return}
   selClear();S.screen=null;S.items=null;S.editNo=null;S.editPosted=false;S.tab=isPurchase?'pur':'sales';render();
   toast(result.value.deleted+' deleted; '+result.value.voided+' voided.');
  });
 });
}

function documentActions(documents){
  let docs;try{docs=Array.isArray(documents)?documents:selectedDocuments()}catch(e){toast(e.message);return}
  if(!docs.length){toast('Select at least one document');return}
  docs=docs.map(d=>{const format=d.format||S.fmt||SET.fmt||'A4';return Object.assign({},d,{format,html:d.html||invPaper(d,format)})});
  // Freeze this selection while files are being prepared.
  const o=document.createElement('div');o.className='ov';
  o.innerHTML='<div class="sheet exportchooser"><div class="grab"></div><h2>'+(docs.length===1?'Export '+esc(docs[0].no):docs.length+' selected documents')+'</h2>'+
    '<p class="lbl">Save or share the same layout shown in Preview, using your selected paper size.</p>'+
    (docs.length>1?'<button class="row" data-doc-export="combined"><span class="grow"><b>One combined PDF</b><span class="lbl">Every invoice starts on a new page</span></span></button>'+
    '<button class="row" data-doc-export="separate"><span class="grow"><b>Separate PDFs</b><span class="lbl">One PDF per invoice, saved together in a ZIP</span></span></button>':'')+
    '<p class="lbl" role="status" aria-live="polite" data-export-status>Preparing PDFs…</p>'+
    '<div class="bar-row"><button class="btn" data-doc-save disabled>Save file</button><button class="btn p" data-doc-share disabled>Share</button></div>'+
    '<button class="btn" data-doc-close style="width:100%;margin-top:8px">Close</button></div>';
  $('#app').append(o);o.onclick=e=>{if(e.target===o)o.remove()};
  let mode='combined',files=null,generation=0;
  const status=o.querySelector('[data-export-status]'),save=o.querySelector('[data-doc-save]'),share=o.querySelector('[data-doc-share]');
  const prepare=async()=>{
    const token=++generation;files=null;save.disabled=share.disabled=true;
    o.querySelectorAll('[data-doc-export]').forEach(b=>{b.classList.toggle('sel',b.dataset.docExport===mode);b.setAttribute('aria-pressed',b.dataset.docExport===mode?'true':'false')});
    status.textContent=docs.length===1?'Preparing PDF…':'Preparing PDFs…';
    try{
      const ready=await prepareDocumentFiles(docs,mode);
      if(token!==generation)return;files=ready;save.disabled=share.disabled=false;
      save.textContent=mode==='separate'?'Save ZIP':'Save PDF';
      status.textContent=mode==='separate'?docs.length+' PDFs ready. Share sends the PDFs individually; Save puts them in one ZIP.':(docs.length===1?'PDF ready to save or share.':'Combined PDF ready to save or share.');
    }catch(e){if(token===generation)status.textContent='Could not prepare PDFs: '+e.message}
  };
  o.querySelectorAll('[data-doc-export]').forEach(b=>b.onclick=()=>{mode=b.dataset.docExport;prepare()});
  save.onclick=async()=>{if(!files)return;save.disabled=true;try{await saveDocumentFiles(files,mode)}catch(e){status.textContent=e.message}finally{save.disabled=false}};
  // Sharing is a direct click after preparation, preserving browser user activation.
  share.onclick=()=>{if(files)shareDocumentFiles(files).then(message=>{status.textContent=message}).catch(e=>{status.textContent=e.name==='AbortError'?'Sharing cancelled.':e.message})};
  o.querySelector('[data-doc-close]').onclick=()=>{generation++;o.remove()};prepare();
}

// Invoice spreadsheets use saved document values, rather than the five visible register columns.
function invoiceExportData(ids,lines=false){
 const cols=lines?['Number','Type','Party','Date','Due date','Status','Line','Item','Quantity','Unit rate','Discount type','Discount value','Line discount','Tax type','Tax value','Line tax','Line total','Data availability']:
 ['Number','Type','Party','Distributor','Date','Due date','Status','Subtotal','Discount','Tax','Total','Paid','Outstanding','Account','Source quotation','Item count','Data availability'];
 const rows=[];
 ids.forEach(no=>{const row=INV.find(r=>r[0]===no)||PUR.find(r=>r[0]===no);if(!row)return;const d=INVD[no],full=d&&!d.synth,T=full?d.T||{}:{},status=d&&d.void?'Void':row[4],type=d?d.type:(PUR.includes(row)?'pur':'sale');
 const common=[no,type==='pur'?'Purchase':type==='dist'?'Distributor':'Sale',d&&d.party||row[1],d&&d.date||row[5],d&&!d.noDue?d.due||'':'',status],availability=full?'Saved invoice details':'Summary only; original item details unavailable';
 if(lines){if(full&&(d.items||[]).length)(d.items||[]).forEach((i,k)=>rows.push(common.concat([k+1,i.n,i.q,i.r,i.dt||'amt',i.d||0,r2(ld(i)),i.tt||'pct',i.tx||0,r2(lt(i)),r2(i.q*i.r-ld(i)+lt(i)),availability])));else rows.push(common.concat(['','','','','','','','','','','',availability]));}
 else{const payable=type==='pur'?PAYB.filter(x=>x[0]==='Suppliers'&&x[2]===no).reduce((a,x)=>a+(+x[3]||0),0):0;const paid=full&&!d.draft?(type==='pur'?Math.max(0,r2((T.g||0)-payable)):(PAID[no]||0)):0;rows.push([no,common[1],common[2],d&&d.dsel||'',common[3],common[4],status,T.sub??'',T.dis??'',T.tax??'',T.g??row[3],full&&type!=='dist'&&!d.void?paid:'',full&&!d.void&&!d.draft&&type!=='dist'?(type==='pur'?payable:Math.max(0,r2((T.g||0)-paid))):'',d&&d.acct||'',d&&d.from||'',full?(d.items||[]).length:'',availability]);}
 });return {title:(ids.length===1?ids[0]:'Invoices')+(lines?' - line items':' - details'),cols,rows};
}
function invoiceExportSheet(ids){
 ids=ids.slice();if(!ids.length){toast('Nothing to export');return}
 const o=document.createElement('div');o.className='ov';
 const details=invoiceExportData(ids),items=invoiceExportData(ids,true);
 o.innerHTML='<div class="sheet"><div class="grab"></div><h2>'+(ids.length===1?'Export '+esc(ids[0]):'Export '+ids.length+' invoices')+'</h2><p class="lbl">Export the selected data as a table. Amounts use your company currency.</p><label style="display:block;margin:12px 0"><span class="lbl">Include</span><select class="search" aria-label="Export data" data-invoice-content><option value="details">Invoice details</option><option value="items">Line items</option></select></label><button class="row" data-invoice-export="img"><span class="grow"><b>Image (PNG)</b><span class="lbl" style="display:block">An image of the selected data</span></span></button><button class="row" data-invoice-export="pdf"><span class="grow"><b>PDF</b><span class="lbl" style="display:block">A printable table of the selected data</span></span></button><button class="row" data-invoice-export="csv"><span class="grow"><b>Spreadsheet (CSV)</b><span class="lbl" style="display:block">Open in Excel, Sheets or Numbers</span></span></button><button class="btn" data-invoice-close style="width:100%">Cancel</button></div>';
 o.onclick=e=>{if(e.target===o)o.remove()};$('#app').append(o);o.querySelector('[data-invoice-close]').onclick=()=>o.remove();
 o.querySelectorAll('[data-invoice-export]').forEach(b=>b.onclick=()=>{const mode=b.dataset.invoiceExport,data=o.querySelector('[data-invoice-content]').value==='items'?items:details;o.remove();setExport(data.title,data.cols,data.rows);if(mode==='csv')exportCsv();else if(mode==='pdf')exportPdf();else exportImage()});
}

// Shared register actions. The source register, selected IDs and documents are frozen before dialogs open.
const REGISTER_ACTIONS={ep:{title:'Employee payments',cap:'employees',rows:()=>STFP},ea:{title:'Employee advances',cap:'employees',rows:()=>EMPA},tf:{title:'Transfers',cap:'cashbank',rows:()=>TRF},sr:{title:'Salary runs',cap:'employees',rows:()=>SAL},pm:{title:'Payments',cap:'payments',rows:()=>PAYM},ex:{title:'Expenses',cap:'expenses',rows:()=>EXP},qt:{title:'Quotations',cap:'sales',rows:()=>QUOT},rt:{title:'Returns',cap:'returns',rows:()=>RET},jl:{title:'Journal',cap:'journal',rows:()=>JRN}};
const registerSelectionKind=()=>selMode()&&REGISTER_ACTIONS[S.screen==='stfp'?'sr':S.screen]?(S.screen==='stfp'?'sr':S.screen):null;
const registerRecord=(kind,id)=>REGISTER_ACTIONS[kind].rows().find(x=>(x.id||x.no)===id);
function registerSelectionButtons(){return '<button class="btn p" onclick="registerDocuments()">PDF / Share</button><button class="btn" onclick="registerDocuments(true)">Print</button>'+(isAdmin()?'<button class="btn bulk-danger" onclick="registerRemoveAsk()">Delete / Void</button>':'')}
function mountRegisterActions(){
 const kind=S.screen==='stfp'?'sr':S.screen,config=REGISTER_ACTIONS[kind],app=document.getElementById('app');if(!app)return;
 if(config||S.screen==='pt'||(!S.screen&&S.tab==='inv')){
  const top=app.querySelector('.scr>.top');if(top&&!top.querySelector('.select-start')){const b=document.createElement('button');b.className='btn select-start';b.textContent='Select';b.onclick=selStart;b.disabled=!(S.selRows||[]).length;top.insertBefore(b,top.querySelector('button:last-child'))}
  // Drop selections hidden by the current period, category or search.
  if(selMode()){const visible=new Set((S.selRows||[]).map(r=>r.id));S.sel.ids=S.sel.ids.filter(id=>visible.has(id))}
  app.querySelectorAll('.scr [data-sel]').forEach(row=>{
   const id=row.dataset.sel,pick=document.createElement('label');pick.className='docpick';pick.dataset.selectControl='';pick.innerHTML='<input type="checkbox" data-doc-check="'+docAttr(id)+'" aria-label="Select '+docAttr(id)+'"><span aria-hidden="true"></span>';pick.querySelector('input').onchange=()=>selToggle(id);
   if(row.tagName==='TR'){const cell=document.createElement('td');cell.className='pickcell';cell.append(pick);row.prepend(cell)}
   else if(row.tagName==='BUTTON'){const wrap=document.createElement('div');wrap.className='row doccard register-card';wrap.dataset.sel=id;row.removeAttribute('data-sel');row.classList.remove('row');row.classList.add('docopen');row.before(wrap);wrap.append(pick,row)}
  });
  app.querySelectorAll('.dtable colgroup').forEach(group=>{if(group.querySelector('.col-pick'))return;const col=document.createElement('col');col.className='col-pick';group.prepend(col)});
  app.querySelectorAll('.dtable tbody td.empty[colspan]').forEach(cell=>{cell.colSpan=cell.closest('table').querySelectorAll('thead th').length+1});
  app.querySelectorAll('.dtable thead tr').forEach(row=>{const cell=document.createElement('th');cell.className='pickcell';cell.innerHTML='<label class="docpick" data-select-control><input type="checkbox" data-doc-all aria-label="Select all visible records" onchange="selToggleAll()"><span aria-hidden="true"></span></label>';row.prepend(cell)});
 }
 const details={record:[S.recordKind,S.recordId],skd:['sr',S.skk&&S.skk.id],pmd:['pm',S.pmk&&S.pmk.id],exd:['ex',S.xk&&S.xk.id],qd:['qt',S.qk],rtd:['rt',S.rk&&S.rk.id],jd:['jl',S.jk&&S.jk.id]},detail=details[S.screen];
 if(detail&&detail[1]&&isAdmin()){
  const b=document.createElement('button');b.className='ic';b.textContent='⋯';b.setAttribute('aria-label','Record actions');b.onclick=()=>registerRecordMenu(detail[0],detail[1]);const top=app.querySelector('.scr .top');if(top){const record=registerRecord(detail[0],detail[1]);if(record&&!record.void&&record.status!=='Void'){const edit=document.createElement('button');edit.className='btn';edit.textContent='Edit';edit.onclick=()=>editRegisterRecord(detail[0],detail[1]);top.append(edit)}top.append(b)}
 }
}
function registerDocumentSnapshots(kind,ids){
 const previous={skk:S.skk,pmk:S.pmk,xk:S.xk,rk:S.rk,jk:S.jk};
 try{return ids.map(id=>{const r=registerRecord(kind,id);if(!r)throw new Error(id+' is no longer available');const format=S.fmt||SET.fmt||'A4';let html;
  if(kind==='qt')html=invPaper({title:'Quotation',no:r.no,date:r.date,due:r.valid,dueLabel:'Valid until',partyLabel:'Customer',party:r.party,partyDetails:r.partyDetails===undefined?partyContact(r.party):r.partyDetails,items:r.items,T:r.T,status:qStat(r),seller:{n:COMP.name,a:COMP.addr,p:COMP.phone,t:taxLine(),own:false}},format);
  else{let screen;
   if(kind==='pm'){S.pmk=r;screen=pmdScr()}
   else if(kind==='rt'){S.rk=r;screen=rtdScr()}
   else if(kind==='sr'){S.skk=r;screen=skdScr()}
   else if(['ep','ea','tf'].includes(kind))screen=cashRecordPaper(kind,r);
   else if(kind==='ex')screen=docScr({title:'Expense',no:r.id,date:r.date,partyLabel:'Payee',party:r.payee||r.cat,rows:[['Category',r.cat],['Paid from',r.acct],['Paid by employee',r.paidBy||'-'],['Linked invoice',r.inv||'-']],amountLabel:'Amount',amount:r.amt,notes:r.notes,back:'',stamp:r.void?'Void':''});
   else screen=docScr({title:'Journal entry',no:r.id,date:r.date,partyLabel:'Narration',party:r.narr||'-',rows:[['Reference',r.ref||'-']],amountLabel:'Total debit',amount:jTot(r).dr,list:['Account — Debit / Credit',r.lines.map(l=>[l.acc,fmt(l.dr||0)+' / '+fmt(l.cr||0)])],back:'',stamp:r.void?'Reversed':''});
   const host=document.createElement('div');host.innerHTML=screen;html=host.querySelector('.paper').outerHTML;
  }return {no:id,format,html};
 })}finally{Object.assign(S,previous)}
}
function registerDocuments(print=false){const kind=registerSelectionKind(),ids=selIds();if(!kind||!ids.length)return;try{const docs=registerDocumentSnapshots(kind,ids);if(!print){documentActions(docs);return}const o=document.createElement('div');o.className='ov';o.innerHTML='<div class="sheet" style="max-width:95vw;max-height:95vh;overflow:auto"><button class="btn" data-close-print>Close</button><div class="paperbatch">'+docs.map(d=>'<div class="paperwrap">'+d.html+'</div>').join('')+'</div></div>';document.getElementById('app').append(o);o.querySelector('[data-close-print]').onclick=()=>o.remove();doPrint()}catch(e){toast(e.message)}}
function registerRemovalProblem(kind,records,mode){
 if(!isAdmin()||!can(REGISTER_ACTIONS[kind].cap))return 'Only an administrator with access to this register can remove records.';
 if(records.some(r=>!r))return 'A selected record is no longer available.';
 if(mode==='void'&&records.some(r=>r.void||r.status==='Void'))return 'An item is already void. Choose Delete permanently or deselect it.';
 for(const r of records){
  if(kind==='qt'&&(r.conv||[]).length)return r.no+': remove its converted invoices first.';
  if(kind==='jl'&&(r.of||(r.src&&r.src!=='manual')))return r.id+': change or void its source document instead.';
  if(kind==='ex'&&!r.void){if(PAYM.some(p=>!p.void&&p.alloc&&p.alloc[r.id]!==undefined))return r.id+': void linked payments first.';if(r.paidBy&&empBal(r.paidBy)<r.amt)return r.id+': employee reimbursements or salary payments must be resolved first.';}
  if(['ep','ea','tf'].includes(kind)&&!r.void){const issue=cashRecordRemovalProblem(kind,r);if(issue)return issue}
  if(kind==='sr'&&!r.void&&empBal(r.emp)<r.net)return r.id+': resolve employee payments before removing this salary.';
  if(kind==='rt'&&!r.void){const issue=returnRemovalProblem(r);if(issue)return r.id+': '+issue}
 }
 if(kind==='pm'){
  const balances={};for(const r of records.filter(r=>!r.void)){const key=r.role+':'+r.party;balances[key]=(balances[key]||0)+(r.used||0)-(r.adv||0)}
  for(const [key,change]of Object.entries(balances))if(r2((ADV[key]||0)+change)<0)return 'An advance from these payments has already been used. Void the payments using it first.';
 }
 return '';
}
function removeRegisterRecords(kind,ids,mode){
 const config=REGISTER_ACTIONS[kind];if(!config||!['void','delete'].includes(mode))return {ok:false,error:'Invalid removal action.'};
 const records=ids.map(id=>registerRecord(kind,id)),problem=registerRemovalProblem(kind,records,mode);if(problem)return {ok:false,error:problem};
 return bookTransaction((mode==='delete'?'Delete ':'Void ')+config.title,ids.join(', '),()=>{
  for(const r of records){const currentProblem=registerRemovalProblem(kind,[r],mode);if(currentProblem)throw new Error(currentProblem);const id=r.id||r.no,before=bookClone(r),ledgerBefore=bookClone(JRN.filter(j=>j.ref===id||j.id===id));
   if(!r.void&&r.status!=='Void'){
    if(kind==='pm'){if(!voidPmChanges(r))throw new Error('Could not reverse '+id)}
    else if(kind==='ex'){applyExpenseInvoiceCharge(Object.assign({},r,{billToInvoice:false}));const payable=PAYB.find(x=>x[2]===id);if(!r.paidBy){if(r.acct==='Pay later'){if(payable)PAYB.splice(PAYB.indexOf(payable),1)}else BAL[r.acct]=r2((BAL[r.acct]||0)+r.amt)}ledReverse(id,'Void '+id);r.void=true}
    else if(['ep','ea','tf'].includes(kind))reverseCashRecord(kind,r);
    else if(kind==='rt')voidReturnChanges(r);
    else if(kind==='qt')r.status='Void';
    else if(kind==='sr'){ledReverse(id,'Void '+id);r.void=true}
    else if(kind==='jl'){if(!revJournal(id))throw new Error('Could not reverse '+id)}
   }
   if(mode==='delete'){const rows=config.rows();rows.splice(rows.indexOf(r),1)}
   AUDIT.push({id:'audit-'+Date.now()+'-'+AUDIT.length,at:new Date().toISOString(),action:(mode==='delete'?'Delete permanently':'Void')+' '+kind,ref:id,by:S.user?S.user.n:'',before,after:mode==='delete'?null:bookClone(r),ledgerBefore,ledgerAfter:bookClone(JRN.filter(j=>j.ref===id||j.id===id))});
  }return records.length;
 });
}
function registerRemoveAsk(kind=registerSelectionKind(),ids=selIds()){
 if(!REGISTER_ACTIONS[kind]||!ids.length)return;ids=ids.slice();const o=document.createElement('div');o.className='ov';o.innerHTML='<div class="sheet"><div class="grab"></div><h2>Remove '+ids.length+' '+(ids.length===1?'record':'records')+'</h2><p class="lbl">Void keeps the record and reverses its accounting effects. Delete permanently removes it after reversal. Audit history is retained.</p><button class="row" data-register-remove="void"><b>Void</b></button><button class="row" data-register-remove="delete"><b class="red">Delete permanently</b></button><button class="btn" data-register-cancel>Cancel</button></div>';document.getElementById('app').append(o);o.onclick=e=>{if(e.target===o)o.remove()};o.querySelector('[data-register-cancel]').onclick=()=>o.remove();o.querySelectorAll('[data-register-remove]').forEach(b=>b.onclick=()=>{const mode=b.dataset.registerRemove,problem=registerRemovalProblem(kind,ids.map(id=>registerRecord(kind,id)),mode);if(problem){toast(problem);return}o.remove();confirmSheet((mode==='delete'?'Delete permanently':'Void')+' '+ids.length+' '+(ids.length===1?'record?':'records?'),'Accounting effects are reversed and an audit record is kept. '+(mode==='delete'?'Deletion cannot be undone.':''),mode==='delete'?'Delete permanently':'Void',()=>{const result=removeRegisterRecords(kind,ids,mode);if(!result.ok){toast(result.error);return}S.sel=null;S.screen=['sr','ep','ea'].includes(kind)?'stfp':kind==='tf'?'cb':kind;render();toast(result.value+' '+(mode==='delete'?'deleted':'voided'))})});
}

function registerRecordMenu(kind,id){const o=document.createElement('div');o.className='ov';o.innerHTML='<div class="sheet"><div class="grab"></div><h2>'+esc(id)+'</h2>'+(['pm','ex','qt','jl','sr','rt','ep','ea','tf'].includes(kind)&&registerRecord(kind,id)&&!registerRecord(kind,id).void&&registerRecord(kind,id).status!=='Void'?'<button class="row" data-record-action="edit"><b>Edit</b></button>':'')+'<button class="row" data-record-action="export"><b>Export — image, PDF or CSV</b></button><button class="row" data-record-action="pdf"><b>PDF / Share</b></button><button class="row" data-record-action="remove"><b class="red">Delete / Void</b></button><button class="btn" data-record-close>Cancel</button></div>';document.getElementById('app').append(o);o.onclick=e=>{if(e.target===o)o.remove()};o.querySelector('[data-record-close]').onclick=()=>o.remove();o.querySelectorAll('[data-record-action]').forEach(b=>b.onclick=()=>{o.remove();const action=b.dataset.recordAction;if(action==='edit'){editRegisterRecord(kind,id);return}if(action==='remove'){registerRemoveAsk(kind,[id]);return}if(action==='pdf'){try{documentActions(registerDocumentSnapshots(kind,[id]))}catch(e){toast(e.message)}return}const r=registerRecord(kind,id);if(!r)return;const summary=kind==='qt'?[id,r.party,r.date,qStat(r),r.T.g]:kind==='jl'?[id,r.narr||'',r.date,r.void?'Reversed':'Posted',jTot(r).dr]:[id,r.party||r.emp||r.payee||r.cat,r.date,r.void?'Void':'Posted',r.net??r.amt??0];setExport(id,['Number','Party / Description','Date','Status','Amount'],[summary]);exportSheet()})}

function editRegisterRecord(kind,id){if(!isAdmin()||!can(REGISTER_ACTIONS[kind].cap)){toast('You cannot edit this record');return}if(kind==='pm'){editPayment(id);return}if(kind==='ex'){editExpense(id);return}if(kind==='qt'){loadQuote(id);return}if(kind==='jl'){editManualJournal(id);return}if(kind==='sr'){editSalaryRun(id);return}if(['ep','ea','tf'].includes(kind)){editCashRecord(kind,id);return}if(kind==='rt')editReturn(id)}

function openCashRecord(kind,id){S.recordKind=kind;S.recordId=id;S.screen='record';render()}
function cashRecordPaper(kind,r){return docScr({title:kind==='ep'?'Employee Payment':kind==='ea'?'Employee Advance':'Account Transfer',no:r.id,date:r.date,partyLabel:kind==='tf'?'From account':'Employee',party:kind==='tf'?r.from:r.emp,rows:kind==='tf'?[['To account',r.to]]:[['Paid from',r.acct]].concat(kind==='ea'?[['Monthly recovery',fmt(r.per||0)]]:[]),amountLabel:'Amount',amount:r.amt,notes:r.notes||'',stamp:r.void?'Void':'',back:kind==='tf'?"S.screen='cb';render()":"S.screen='stfp';render()"})}
function cashRecordScreen(){const r=registerRecord(S.recordKind,S.recordId);return r?cashRecordPaper(S.recordKind,r):'<div class="scr"><div class="card">Record not found.</div></div>'}
function cashRecordRemovalProblem(kind,r){if(kind==='ea'&&staffAdv(r.emp)+.001<r.amt)return 'Some of this advance has been recovered. Reverse the salary recovery first';if(kind==='tf'&&(ACT[r.to]||'Bank')==='Cash'&&(BAL[r.to]||0)+.001<r.amt)return 'The receiving cash account no longer has enough funds to reverse this transfer';return ''}
function reverseCashRecord(kind,r,editing=false){const issue=editing&&kind==='ea'?'':cashRecordRemovalProblem(kind,r);if(issue)throw new Error(issue);if(kind==='tf'){BAL[r.from]=r2((BAL[r.from]||0)+r.amt);BAL[r.to]=r2((BAL[r.to]||0)-r.amt)}else{BAL[r.acct]=r2((BAL[r.acct]||0)+r.amt);ledReverse(r.id,'Record reversed')}r.void=true}
function editCashRecord(kind,id){const r=registerRecord(kind,id);if(!r||r.void)return;if(kind==='tf'){S.tf=Object.assign(bookClone(r),{editId:id});S.screen='tfr';render();return}const o=document.createElement('div');o.className='ov';o.innerHTML='<div class="sheet"><div class="grab"></div><h2>Edit '+esc(id)+'</h2><div class="f"><label><small>Amount</small><input type="number" min="0.01" step="0.01" data-cash-amount value="'+r.amt+'"></label><label><small>Date</small><input type="date" data-cash-date value="'+docAttr(r.date)+'"></label><label class="w"><small>Paid from</small><select data-cash-acct>'+ACCTS.map(a=>'<option '+(a===r.acct?'selected':'')+'>'+esc(a)+'</option>').join('')+'</select></label>'+(kind==='ea'?'<label class="w"><small>Monthly advance recovery</small><input type="number" min="0" step="0.01" data-cash-per value="'+(r.per||0)+'"></label>':'')+'</div><div class="bar-row"><button class="btn" data-cash-cancel>Cancel</button><button class="btn p" data-cash-save>Save changes</button></div></div>';document.getElementById('app').append(o);o.onclick=e=>{if(e.target===o)o.remove()};o.querySelector('[data-cash-cancel]').onclick=()=>o.remove();o.querySelector('[data-cash-save]').onclick=()=>{const amount=+o.querySelector('[data-cash-amount]').value,acct=o.querySelector('[data-cash-acct]').value,date=o.querySelector('[data-cash-date]').value,per=kind==='ea'?+o.querySelector('[data-cash-per]').value:0;const result=bookTransaction('Edit '+REGISTER_ACTIONS[kind].title,id,()=>{if(!isAdmin()||!can('employees')||r.void||!registerRecord(kind,id)||!Number.isFinite(amount)||amount<=0||!ACCTS.includes(acct)||!date||!Number.isFinite(per)||per<0)throw new Error('Check the amount, date and account');const before=bookClone(r);if(kind==='ea'&&staffAdv(r.emp)-r.amt+amount<-.001)throw new Error('The revised advance cannot be less than the amount already recovered');reverseCashRecord(kind,r,true);if(kind==='ep'&&amount>empBal(r.emp)+.001)throw new Error('Payment exceeds the amount owed to this employee');const entry=kind==='ep'?postStaffPayLedger({date,ref:id,emp:r.emp,amt:amount,acct,narr:'Employee payment revised'}):postAdvanceLedger({date,ref:id,emp:r.emp,amt:amount,acct,narr:'Employee advance revised'});if(!entry)throw new Error('The ledger entry was refused');BAL[acct]=r2((BAL[acct]||0)-amount);Object.assign(r,{amt:r2(amount),date,acct,void:false});if(kind==='ea')r.per=per;AUDIT.push({id:'audit-'+Date.now()+'-'+AUDIT.length,at:new Date().toISOString(),action:'Record before edit',ref:id,before,after:bookClone(r)});return true});if(!result.ok){toast(result.error);return}o.remove();openCashRecord(kind,id);toast('Record updated')}}

function editLinkedRecordMetadata(kind,id,reason){const r=registerRecord(kind,id),o=document.createElement('div');o.className='ov';o.innerHTML='<div class="sheet"><div class="grab"></div><h2>Edit details — '+esc(id)+'</h2><p class="lbl">Amount and settlement fields are locked: '+esc(reason)+'. You can still correct notes'+(kind==='pm'?' and the reference':'')+'.</p>'+(kind==='pm'?'<label><small>Reference</small><input class="search" data-linked-ref value="'+docAttr(r.ref||'')+'"></label>':'')+'<label><small>Notes</small><textarea class="search" data-linked-notes>'+esc(r.notes||'')+'</textarea></label><div class="bar-row"><button class="btn" data-linked-cancel>Cancel</button><button class="btn p" data-linked-save>Save changes</button></div></div>';document.getElementById('app').append(o);o.onclick=e=>{if(e.target===o)o.remove()};o.querySelector('[data-linked-cancel]').onclick=()=>o.remove();o.querySelector('[data-linked-save]').onclick=()=>{const notes=o.querySelector('[data-linked-notes]').value,ref=o.querySelector('[data-linked-ref]')?.value;const result=bookTransaction('Edit linked record details',id,()=>{if(!isAdmin()||!can(REGISTER_ACTIONS[kind].cap)||r.void||registerRecord(kind,id)!==r)throw new Error('This record cannot be edited');const before=bookClone(r);r.notes=notes;if(kind==='pm')r.ref=ref;AUDIT.push({id:'audit-'+Date.now()+'-'+AUDIT.length,at:new Date().toISOString(),action:'Record details before edit',ref:id,before,after:bookClone(r)});return true});if(!result.ok){toast(result.error);return}o.remove();if(kind==='pm'){S.pmk=r;S.screen='pmd'}else{S.xk=r;S.screen='exd'}render();toast('Details updated')}}
