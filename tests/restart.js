// Fresh JavaScript runtimes sharing only the serialized device storage.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),disk={};
const html=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
const files=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
function boot(){
  const context=vm.createContext({console,setTimeout:()=>0,clearTimeout(){}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'harness.js'),'utf8'),context);
  context.localStorage={getItem:k=>disk[k]??null,setItem:(k,v)=>{disk[k]=String(v)},removeItem:k=>delete disk[k]};
  for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,'web',file),'utf8'),context,{filename:file});
  return context;
}
const first=boot();
vm.runInContext(`
wipeData();USERS.length=0;S.user=null;SET.negStock='allow';SET.cost='avg';
PRD.length=0;PRD.push(['Restart widget','RW',0,0,'']);
CUST.push('Restart buyer');SUPP.push('Restart supplier');
ACCTS.length=0;ACCTS.push('Cash');BAL.Cash=0;
openScr('inv','pur');S.sup='Restart supplier';
S.items=[{n:'Restart widget',q:5,r:4,d:0,dt:'amt',tx:0,tt:'pct',s:0}];post();
openScr('inv','sale');S.cust='Restart buyer';
S.items=[{n:'Restart widget',q:2,r:10,d:0,dt:'amt',tx:0,tt:'pct',s:5}];post();
newPay('in','Restart buyer',S.lastNo);S.pm.amt=5;S.pm.alloc={[S.lastNo]:5};savePm();
`,first);
const durable=JSON.parse(disk.bk_v2);
assert.equal(durable.AUDIT.length,3);
assert.equal(durable.PRD[0][2],3);
assert.equal(durable.PAID[durable.INV[0][0]],5);
// No Done click, pagehide, or explicit save before this new process-equivalent boot.
const second=boot();
const restored=JSON.parse(vm.runInContext('backupJSON()',second));
for(const key of ['INVD','INV','PUR','PAYM','PAID','BAL','JRN','PRD','STK','LAY','AUDIT']){
  assert.deepStrictEqual(restored[key],durable[key],key+' survives fresh startup');
}
assert.equal(vm.runInContext('ledHealthy().diff',second),0);
console.log('Fresh startup restores invoices, payments, stock, ledger and history.');
