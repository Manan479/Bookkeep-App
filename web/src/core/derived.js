// core/derived.js - Read-only derived figures and report data. No screen code.
const eligible=()=>Object.keys(INVD).filter(no=>INVD[no]&&!INVD[no].draft&&!INVD[no].void);
const expTotal=()=>EXP.filter(e=>!e.void&&inP(e.date)).reduce((a,e)=>a+e.amt,0);
// What is owed and what is on the shelf are balances, not period figures, so they are read as of now.
// Overdue needs a due date, which only the invoice snapshot carries, so that part comes from the records.
const arOver=()=>INV.filter(r=>live(r)&&r[1].indexOf(' > ')<0&&r[3]-(PAID[r[0]]||0)>0).filter(r=>{const d=INVD[r[0]];return !!d&&!!d.due&&d.due<tdy}).reduce((a,r)=>a+r[3]-(PAID[r[0]]||0),0);
const lowCount=()=>PRD.filter(p=>p[2]>=0&&p[2]<p[3]).length;
const negCount=()=>PRD.filter(p=>p[2]<0).length;
const qStat=q=>(q.status==='Draft'||q.status==='Sent')&&q.valid&&q.valid<tdy?'Expired':q.status;
function acctRows(a){const r=[];PAYM.filter(p=>!p.void&&p.acct===a&&p.amt>0).forEach(p=>r.push({d:p.date,t:p.party,s:p.id+' · '+p.method,a:p.dir==='in'?p.amt:-p.amt}));EXP.filter(e=>!e.void&&!e.paidBy&&e.acct===a).forEach(e=>r.push({d:e.date,t:e.payee||e.cat,s:e.id+' · '+e.cat,a:-e.amt}));TRF.filter(t=>!t.void).forEach(t=>{if(t.to===a)r.push({d:t.date,t:'Transfer in',s:t.id+' from '+t.from,a:t.amt});if(t.from===a)r.push({d:t.date,t:'Transfer out',s:t.id+' to '+t.to,a:-t.amt})});RET.filter(x=>!x.void&&x.settle==='refund'&&x.extra>0&&x.acct===a).forEach(x=>r.push({d:x.date,t:x.party,s:x.id+' refund',a:x.type==='pur'?x.extra:-x.extra}));STFP.filter(p=>!p.void&&p.acct===a).forEach(p=>r.push({d:p.date,t:p.emp,s:p.id+' · Employee payment',a:-p.amt}));EMPA.filter(p=>!p.void&&p.acct===a).forEach(p=>r.push({d:p.date,t:p.emp,s:p.id+' · Employee advance',a:-p.amt}));JRN.filter(j=>!j.void&&j.cash&&j.cash[a]).forEach(j=>r.push({d:j.date,t:j.narr||'Journal',s:j.id,a:j.cash[a]}));return r.sort((x,y)=>x.d<y.d?1:-1)}
function repSum(k){const T=(title,cols,rows,total,o)=>Object.assign({title,cols,rows,total},o||{}),sum=(a,f)=>a.reduce((x,y)=>x+f(y),0),today=new Date(tdy+'T00:00').getTime();
if(k==='sp'){const m={};INV.filter(r=>live(r)&&r[1].indexOf(' > ')<0&&inP(r[5])).forEach(r=>{const o=m[r[1]]||(m[r[1]]={n:0,a:0});o.n++;o.a+=r[3]});const e=Object.entries(m);return T('Sales by party',['Party','Invoices','Amount'],e.map(([p,o])=>[p,o.n,fmt(o.a)]),['Total',sum(e,x=>x[1].n),fmt(sum(e,x=>x[1].a))])}
if(k==='ts'){const w=piso(),accts=ledAccts('revenue'),pick=S.tsAcct||'All',use=pick==='All'?accts:accts.filter(a=>a===pick),ls=[];
  // The account rows come from the LEDGER, so they add up to the total and agree with the profit and loss:
  // a credit note is a debit against the account it came out of, and is already taken off here. The invoice
  // lines are counted from the documents, and the tax with them, because tax is not an income account.
  Object.entries(INVD).filter(x=>x[1].type!=='pur'&&!x[1].draft&&!x[1].void&&inP(x[1].date)).forEach(x=>(x[1].items||[]).forEach(i=>ls.push([x[1].acct||'Sales',r2(i.q*i.r-ld(i)),r2(lt(i))])));
  const mine=ls.filter(l=>use.indexOf(l[0])>=0);
  const rows=use.map(a=>[a,fmt(r2(ledBalWin(a,w[0],w[1]))),String(mine.filter(x=>x[0]===a).length)]);
  const net=r2(use.reduce((s,a)=>s+ledBalWin(a,w[0],w[1]),0)),tax=r2(sum(mine,x=>x[2]));
  return T('Detailed sales report',['Income account','Net sales','Invoice lines'],rows,['Total net sales',fmt(net),String(mine.length)],
   {opts:['All'].concat(accts),skey:'tsAcct',set:'setTsAcct',
    note:'Tax charged on sales this period: '+fmt(tax)+' - total billed including tax: '+fmt(r2(net+tax))+'. Returns are already off the net sales.'})}
if(k==='sq'){const m={};Object.values(INVD).filter(d=>d.type==='sale'&&!d.draft&&!d.void&&inP(d.date)).forEach(d=>d.items.filter(i=>!i.charge).forEach(i=>{const o=m[i.n]||(m[i.n]={q:0,a:0});o.q+=i.q;o.a+=i.q*i.r-ld(i)}));const e=Object.entries(m);return T('Sales by product',['Product','Qty','Amount'],e.map(([p,o])=>[p,o.q,fmt(o.a)]),['Total',sum(e,x=>x[1].q),fmt(sum(e,x=>x[1].a))],{note:'Counts the invoices made in this app.'})}
if(k==='pp'){const m={};PUR.filter(r=>live(r)&&inP(r[5])).forEach(r=>{const o=m[r[1]]||(m[r[1]]={n:0,a:0});o.n++;o.a+=r[3]});const e=Object.entries(m);return T('Purchases by supplier',['Supplier','Bills','Amount'],e.map(([p,o])=>[p,o.n,fmt(o.a)]),['Total',sum(e,x=>x[1].n),fmt(sum(e,x=>x[1].a))])}
if(k==='ar'){const m={};INV.filter(r=>live(r)&&r[1].indexOf(' > ')<0&&r[3]-(PAID[r[0]]||0)>0).forEach(r=>{const age=Math.floor((today-new Date(r[5]).getTime())/864e5),b=age<=30?0:age<=60?1:age<=90?2:3,o=m[r[1]]||(m[r[1]]=[0,0,0,0]);o[b]+=r[3]-(PAID[r[0]]||0)});const e=Object.entries(m),col=i=>sum(e,x=>x[1][i]);return T('Receivables aging',['Party','0-30','31-60','61-90','90+','Total'],e.map(([p,o])=>[p,...o.map(fmt),fmt(sum(o,x=>x))]),['Total',...[0,1,2,3].map(i=>fmt(col(i))),fmt(sum([0,1,2,3],col))],{nop:true})}
if(k==='ap'){const m={};PAYB.forEach(x=>{const over=Math.floor((today-new Date(x[4]+'T00:00').getTime())/864e5),b=over<=0?0:over<=30?1:over<=60?2:3,o=m[x[1]]||(m[x[1]]=[0,0,0,0]);o[b]+=x[3]});const e=Object.entries(m),col=i=>sum(e,x=>x[1][i]);return T('Payables aging',['Pay to','Not due','1-30','31-60','60+','Total'],e.map(([p,o])=>[p,...o.map(fmt),fmt(sum(o,x=>x))]),['Total',...[0,1,2,3].map(i=>fmt(col(i))),fmt(sum([0,1,2,3],col))],{nop:true})}
if(k==='sv'){const r=PRD.map(p=>[dn(p),p[2],stockVal(p)]);return T('Stock valuation',['Product','Qty','Cost','Value'],r.map(x=>[x[0],x[1],x[1]>0?fmt(x[2]/x[1]):fmt(0),fmt(x[2])]),['Total',sum(r,x=>x[1]),'',fmt(sum(r,x=>x[2]))],{nop:true,note:SET.cost==='fifo'?'Valued with FIFO layers.':'Valued at weighted average cost.'})}
if(k==='ls'){const r=PRD.filter(p=>p[2]<p[3]);return T('Low stock',['Product','Qty','Reorder at','Short by'],r.map(p=>[dn(p),p[2],p[3],p[3]-p[2]]),null,{nop:true})}
if(k==='sm'){const r=STK.filter(x=>inP(x.d));return T('Stock movement',['Date','Item','Type','Qty'],r.map(x=>[fmtS(x.d),x.n,x.t,(x.q>0?'+':'')+x.q]),null,{note:'Shows movements made in this app.'})}
if(k==='ex'){const m={};EXP.filter(e=>!e.void&&inP(e.date)).forEach(e=>{const o=m[e.cat]||(m[e.cat]={n:0,a:0});o.n++;o.a+=e.amt});const e=Object.entries(m);return T('Expenses by category',['Category','Entries','Amount'],e.map(([c,o])=>[c,o.n,fmt(o.a)]),['Total',sum(e,x=>x[1].n),fmt(sum(e,x=>x[1].a))])}
if(k==='dr'){return T('Distributor report',['Distributor','Customers','Sold','Owes you'],DIST.map(d=>[d.n,(DCU[d.n]||[]).length,fmt(d.sold),fmt(d.owed)]),['Total',sum(DIST,d=>(DCU[d.n]||[]).length),fmt(sum(DIST,d=>d.sold)),fmt(distOwed())],{nop:true})}
if(k==='tx'){const ds=Object.values(INVD).filter(d=>!d.draft&&!d.void&&inP(d.date)),c=sum(ds.filter(d=>d.type==='sale'),d=>d.T.tax),p=sum(ds.filter(d=>d.type==='pur'),d=>d.T.tax);return T('Tax summary',['Item','Amount'],[['Tax collected on sales',fmt(c)],['Tax paid on purchases',fmt(p)]],['Net tax payable',fmt(c-p)],{note:'Counts invoices made in this app.'})}
if(k==='tb'){const t=trialRows();
return T('Trial balance',['Account','Debit','Credit'],t.rows.map(r=>[r.acc,r.dr?fmt(r.dr):'',r.cr?fmt(r.cr):'']),['Total',fmt(t.dr),fmt(t.cr)],{nop:true,note:t.diff===0?'Every entry in the book balances. There is no balancing line here, and there should never need to be one.':'The two columns differ by '+fmt(Math.abs(t.diff))+'. Something has gone into the book out of balance.'})}
if(k==='bs'){const b=ledBalances(),A=ledByKind('asset'),L=ledByKind('liability'),E=ledByKind('equity'),prof=r2(ledByKind('revenue')-ledByKind('expense'));
// Every account is listed by its own kind, so an account added to the chart of accounts later appears
// here on its own line instead of being silently left out of the totals.
const byKind=kind=>Object.keys(ACCT_TYPES).filter(a=>ACCT_TYPES[a]===kind);
const line=a=>[a,fmt(b[a])];
const rows=byKind('asset').map(line).concat([['Total assets',fmt(A)]],byKind('liability').map(line),[['Total liabilities',fmt(L)]],byKind('equity').map(line),[['Earned and kept in the business',fmt(prof)],['Total equity',fmt(r2(E+prof))]]);
return T('Balance sheet',['Item','Amount'],rows,['Assets less liabilities',fmt(r2(A-L))],{nop:true,note:'Built from the ledger, not from the records. Total equity is what the owner put in plus what the business has earned. "Assets less liabilities" must equal total equity; if it does not, the book is out of balance.'})}
if(k==='cf'){const w=piso(),c=ledCashFlow(w[0],w[1]);
const label={receipt:'Received from customers and distributors',payment:'Paid to suppliers and bills',expense:'Expenses paid',return:'Refunds',opening:'Money put in by the owner'},known=['receipt','payment','expense','return','opening'];
const rows=known.filter(s=>Math.abs(c.bySrc[s]||0)>0.005).map(s=>[label[s],fmt(c.bySrc[s])]);
const rest=r2(c.net-known.reduce((x,s)=>x+(c.bySrc[s]||0),0));
if(Math.abs(rest)>0.005)rows.push(['Other movements',fmt(rest)]);
return T('Cash flow',['Item','Amount'],rows,['Net cash flow',fmt(c.net)],{note:'Every line is a movement of the Cash and bank account in the ledger over this period, so the lines add up to the net figure by construction. A transfer between two of your own accounts is not a cash flow, so it is not listed.'})}
return T('Report',['Item'],[],null)}
const jTot=d=>{const dr=d.lines.reduce((a,l)=>a+(+l.dr||0),0),cr=d.lines.reduce((a,l)=>a+(+l.cr||0),0);return{dr,cr,diff:Math.round((dr-cr)*100)/100}};
const taxLine=()=>COMP.taxIds.filter(x=>x.show).map(x=>x.t+' '+x.v).join(' · ');
// ---- the detail behind a report ------------------------------------------------------------------------
// The screen shows the summary and the file gets every line that made it: an invoice number, the party, the
// item, the price it went out at. repData() is the summary plus its detail, so a report gains a detailed
// export by being named here and nothing on the screens has to change.
function repDetail(k){const sum=(a,f)=>a.reduce((x,y)=>x+f(y),0),today=new Date(tdy+'T00:00').getTime();
 // The invoice number is the KEY of INVD, not a field on the snapshot, so it has to be carried across.
 const docs=()=>Object.entries(INVD).filter(x=>!x[1].draft&&!x[1].void&&inP(x[1].date)).map(x=>Object.assign({no:x[0]},x[1]));
 const lines=()=>{const m=[];docs().forEach(d=>{(d.items||[]).forEach(i=>{const kind=d.type==='pur'?'Purchase':d.type==='dist'?'Distributor':(d.acct||'Sales');
   m.push([d.date,d.no,d.party||'',kind,i.n,i.q,d.type==='dist'?r2(lineUnit(d,i)):i.r,r2(i.q*i.r-ld(i))])})});return m};
 const L=lines();
 if(k==='sq'||k==='ts'){const pick=S.tsAcct||'All',rows=(k==='ts'&&pick!=='All')?L.filter(l=>l[3]===pick):L;
  return[['Date','Invoice','Party','Income account','Item','Qty','Rate','Net'],rows.filter(l=>l[3]!=='Purchase')]}
 if(k==='pp')return[['Date','Bill','Supplier','Item','Qty','Rate','Net'],L.filter(l=>l[3]==='Purchase')];
 if(k==='dr'){const m=[];docs().filter(d=>d.type==='dist').forEach(d=>(d.items||[]).forEach(i=>m.push([d.date,d.no,d.dsel||'',d.party||'',i.n,i.q,r2(lineUnit(d,i)),r2(i.q*lineUnit(d,i))])));
  return[['Date','Invoice','Distributor','His customer','Item','Qty','Distributor price','Amount'],m]}
 if(k==='sp')return[['Date','Invoice','Party','Total','Status'],INV.filter(r=>live(r)&&r[1].indexOf(' > ')<0&&inP(r[5])).map(r=>[r[5],r[0],r[1],r[3],r[4]])];
 if(k==='ar')return[['Date','Invoice','Party','Total','Paid','Balance','Days'],INV.filter(r=>live(r)&&r[3]-(PAID[r[0]]||0)>0).map(r=>[r[5],r[0],r[1],r[3],r2(PAID[r[0]]||0),r2(r[3]-(PAID[r[0]]||0)),Math.floor((today-new Date(r[5]).getTime())/864e5)])];
 if(k==='ap')return[['Bill','Party','Due','Amount','Days over'],PAYB.map(x=>[x[2],x[1],x[4],x[3],Math.floor((today-new Date(x[4]+'T00:00').getTime())/864e5)])];
 if(k==='sm')return[['Date','Item','Type','Qty','Reference'],STK.filter(x=>inP(x.d)).map(x=>[x.d,x.n,x.t,x.q,x.ref||''])];
 if(k==='ex')return[['Date','Entry','Category','Payee','Paid from','Amount','Notes'],EXP.filter(e=>!e.void&&inP(e.date)).map(e=>[e.date,e.id,e.cat,e.payee||'',e.paidBy?('Paid by '+e.paidBy):e.acct,e.amt,e.notes||''])];
 if(k==='tx')return[['Date','Invoice','Type','Party','Net','Tax','Total'],docs().map(d=>[d.date,d.no,d.type==='pur'?'Purchase':d.type==='dist'?'Distributor':'Sale',d.party||'',r2((d.T&&d.T.sub)||0),r2((d.T&&d.T.tax)||0),r2((d.T&&d.T.g)||0)])];
 if(k==='sv')return[['Product','Code','Brand','Qty','Cost','Value'],PRD.map(p=>[dn(p),p[1],p[4]||'',p[2],p[2]>0?r2(stockVal(p)/p[2]):0,r2(stockVal(p))])];
 if(k==='ls')return[['Product','Code','Qty','Reorder at','Short by','Value'],PRD.filter(p=>p[2]<p[3]).map(p=>[dn(p),p[1],p[2],p[3],p[3]-p[2],r2(stockVal(p))])];
 return null}
function repData(k){const d=repSum(k);if(d){const det=repDetail(k);if(det){d.detailCols=det[0];d.detailRows=det[1]}}return d}