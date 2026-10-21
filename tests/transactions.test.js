// Real posting paths, with failures injected at the durability boundary.
const originalBook=bookClone(storePayload()),originalState=bookClone(S);
const originalStorage=localStorage.setItem;
try{
  wipeData();USERS.length=0;S.user=null;SET.cost='avg';SET.negStock='allow';
  PRD.length=0;PRD.push(['Transaction widget','TX',0,0,'']);
  CUST.push('Transaction customer');SUPP.push('Transaction supplier');
  ACCTS.length=0;ACCTS.push('Cash');BAL.Cash=0;
  const invoice=(type='sale')=>{
    openScr('inv',type);S.cust='Transaction customer';S.sup='Transaction supplier';
    S.sacct='Sales';S.items=[{n:'Transaction widget',q:2,r:10,d:0,dt:'amt',tx:0,tt:'pct',s:20}];
  };
  invoice('pur');post();
  const purchase=S.lastNo;
  let stored=JSON.parse(localStorage.getItem(STORE_KEY));
  T('purchase snapshot and ledger durable before Done',!!stored.INVD[purchase]&&stored.JRN.some(e=>e.ref===purchase));
  eq('purchase stock durable before Done',stored.PRD[0][2],2);
  invoice();
  const beforeFailure=backupJSON(),diskBefore=localStorage.getItem(STORE_KEY),counter=S.n;
  localStorage.setItem=(key,value)=>{if(key===STORE_KEY)throw new Error('Storage full');originalStorage(key,value)};
  eq('failed invoice reports failure',post(),false);
  eq('failed invoice restores all business data',backupJSON(),beforeFailure);
  eq('failed invoice keeps previous durable book',localStorage.getItem(STORE_KEY),diskBefore);
  eq('failed invoice restores counter',S.n,counter);
  eq('failed invoice retains form',S.items[0].q,2);
  localStorage.setItem=originalStorage;
  post();const sale=S.lastNo,afterSale=backupJSON();
  post();eq('double submission cannot post twice',backupJSON(),afterSale);
  stored=JSON.parse(localStorage.getItem(STORE_KEY));
  T('sale document, ledger and audit committed together',!!stored.INVD[sale]&&stored.JRN.some(e=>e.ref===sale)&&stored.AUDIT.some(e=>e.ref===sale));
  const committedSale=backupJSON();
  wipeData();load();eq('reload restores the entire committed book',backupJSON(),committedSale);
  newPay('in','Transaction customer',sale);S.pm.amt=5;S.pm.alloc={[sale]:5};
  const beforePayment=backupJSON();
  localStorage.setItem=(key,value)=>{if(key===STORE_KEY)throw new Error('Storage full');originalStorage(key,value)};
  eq('failed payment reports failure',savePm(),false);
  eq('failed payment rolls back balance, allocation and ledger',backupJSON(),beforePayment);
  localStorage.setItem=originalStorage;savePm();
  const receipt=PAYM[0].id,afterPayment=backupJSON();savePm();
  eq('double payment submission is ignored',backupJSON(),afterPayment);
  stored=JSON.parse(localStorage.getItem(STORE_KEY));
  eq('partial payment amount is durable',stored.PAID[sale],5);
  eq('partial status is durable',stored.INV.find(r=>r[0]===sale)[4],'Partial');
  T('payment ledger and audit are durable',stored.JRN.some(e=>e.ref===receipt)&&stored.AUDIT.some(e=>e.ref===receipt));
  wipeData();load();eq('payment survives reload with all records',backupJSON(),afterPayment);
  loadDraft(sale,true);S.items[0].r=12;
  const beforeEdit=backupJSON(),entryFn=postSaleLedger;
  try{postSaleLedger=()=>false;eq('refused edit fails',post(),false)}finally{postSaleLedger=entryFn}
  eq('refused edit restores original ledger, invoice and stock',backupJSON(),beforeEdit);
  post();T('successful edit retains both document versions',AUDIT.some(e=>e.action==='Update invoice'&&e.before.T.g===20&&e.after.T.g===24));
  const payment=PAYM.find(p=>p.id===receipt),beforeVoid=backupJSON();
  localStorage.setItem=(key,value)=>{if(key===STORE_KEY)throw new Error('Storage full');originalStorage(key,value)};
  eq('failed void reports failure',voidPm(payment),false);
  eq('failed void restores all data',backupJSON(),beforeVoid);
  localStorage.setItem=originalStorage;
  T('void can retry using the original payment reference',voidPm(payment));
  T('invoice void succeeds after payment void',voidDoc(sale));
  stored=JSON.parse(localStorage.getItem(STORE_KEY));
  T('voids and history durable before rendering',stored.INVD[sale].void&&stored.PAYM.find(p=>p.id===receipt).void&&stored.AUDIT.some(e=>e.action==='Void invoice'));
  invoice();S.invNoOv=sale;const duplicateBefore=backupJSON();
  eq('existing invoice number refused',post(),false);
  eq('duplicate refusal leaves book unchanged',backupJSON(),duplicateBefore);
  invoice();const errorBefore=backupJSON();
  const ledgerFn=postEntry;
  try{postEntry=()=>{throw new Error('Injected posting interruption')};eq('posting interruption fails safely',post(),false)}finally{postEntry=ledgerFn}
  eq('interrupted posting leaves no partial records',backupJSON(),errorBefore);
}finally{
  localStorage.setItem=originalStorage;applyStore(originalBook);
  Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,originalState);save();
}
