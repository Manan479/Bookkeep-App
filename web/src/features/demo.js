// features/demo.js - one small trading business, built by posting real documents.
//
// Nothing here is written straight into the book. Every purchase, sale, receipt, return, expense and
// journal entry goes through the same function the screens use, so the sample books balance by
// construction: the trial balance, the stock report, the dashboard and the P&L all agree with the
// records behind them. S.quiet stops the success sheets from stacking up while it runs.
//
// Six weeks back from today, so "This Month" and "Last Month" both have figures in them, and nothing
// is left with negative stock.
const demoSheet=()=>confirmSheet('Load the sample business?','This replaces everything you have entered with six weeks of a small trading business: purchases, sales, distributor invoices, receipts and payments, returns, expenses, a stock adjustment, transfers, journal entries and quotations. Every screen gets something in it, and the books it makes are balanced.','Load it',async()=>{await snapshotBook('before sample business');loadDemo()});
function loadDemo(){const was=!!S.quiet;S.quiet=true;
const D=n=>plus(tdy,-n),st=n=>{const p=PRD.find(x=>dn(x)===n);return p?Math.max(p[2],0):0};
const item=(n,q,r,tx)=>({n,q,r,d:0,dt:'amt',tx:tx===undefined?defTax():tx,tt:'pct'});
const pur=(days,sup,its)=>{openScr('inv','pur');S.sup=sup;S.d.inv=D(days);S.d.due=plus(S.d.inv,30);S.items=its.map(x=>Object.assign({s:st(x.n)},x));post();return S.lastNo};
const sale=(days,cust,its)=>{openScr('inv','sale');S.cust=cust;S.d.inv=D(days);S.d.due=plus(S.d.inv,14);S.items=its.map(x=>Object.assign({s:st(x.n)},x));post();return S.lastNo};
const distSale=(days,who,its)=>{openScr('inv','dist');S.dsel='Karim Brothers';S.dcust=who;S.d.inv=D(days);S.d.due=plus(S.d.inv,14);S.items=its.map(x=>Object.assign({s:st(x.n),tx:0},x));post();return S.lastNo};
const pay=(days,dir,party,key,amt,acct,role)=>{newPay(dir,party,key,role);const m=S.pm;m.date=D(days);m.acct=acct||'Cash';m.method=m.acct==='Cash'?'Cash':'Bank transfer';if(amt!=null){m.amt=String(amt);pmClamp()}savePm()};
const exp=(days,cat,payee,amt,acct,paidBy)=>{newExp();S.ef.date=D(days);S.ef.amt=String(amt);S.ef.payee=payee;S.ef.cat=cat;if(acct)S.ef.acct=acct;if(paidBy)S.ef.paidBy=paidBy;saveExp()};
const jrn=(days,narr,lines)=>{newJournal();S.jf.date=D(days);S.jf.narr=narr;S.jf.lines=lines;postJournal()};
const trf=(days,from,to,amt)=>{newTransfer();S.tf.date=D(days);S.tf.from=from;S.tf.to=to;S.tf.amt=String(amt);saveTransfer()};
const cn=(days,inv,qty)=>{newReturn(inv);S.rf.date=D(days);S.rf.qty=qty;saveRet()};
const quote=(days,valid,cust,its)=>{openScr('inv','qt');S.cust=cust;S.d.inv=D(days);S.d.due=plus(S.d.inv,valid);S.items=its.map(x=>Object.assign({s:st(x.n)},x));post();return S.lastNo};
try{
wipeData();
// The two accounts this shop keeps money in, and what the owner opened with.
ACCTS.length=0;ACCTS.push('Cash','Main bank');
Object.keys(BAL).forEach(k=>delete BAL[k]);Object.keys(ACT).forEach(k=>delete ACT[k]);
BAL.Cash=180000;BAL['Main bank']=650000;ACT.Cash='Cash';ACT['Main bank']='Bank';
postOpeningLedger({acct:'Cash',date:D(45),amount:180000,ref:'OPEN-Cash',narr:'Opening cash in hand'});
postOpeningLedger({acct:'Main bank',date:D(45),amount:650000,ref:'OPEN-Main bank',narr:'Opening balance · Main bank'});

// ---- stock in ---------------------------------------------------------------------------------------
const p1=pur(45,'Global Foods Ltd',[item('Basmati Rice 5kg - Guard',20,2000),item('Sugar 1kg',40,122)]);
const p2=pur(38,'Prime Oils',[item('Cooking Oil 1L - Dalda',24,440),item('Cooking Oil 1L - Eva',30,420)]);
const p3=pur(30,'Global Foods Ltd',[item('Tea 500g - Tapal',12,620),item('Wheat Flour 10kg - Sunridge',15,1000)]);
const p4=pur(12,'Prime Oils',[item('Cooking Oil 1L - Dalda',12,455),item('Cooking Oil 1L - Eva',12,435)]);

// ---- six weeks of trading ---------------------------------------------------------------------------
exp(43,'Rent','Shop rent for the month',8000);
const s1=sale(42,'Al Noor Traders',[item('Basmati Rice 5kg - Guard',3,2800),item('Sugar 1kg',6,180)]);
pay(41,'in','Al Noor Traders',s1,null,'Cash');
const s2=sale(40,'Zara Mart',[item('Cooking Oil 1L - Dalda',5,620),item('Cooking Oil 1L - Eva',6,595)]);
pay(39,'in','Zara Mart',s2,null,'Main bank');
exp(36,'Utilities','Electricity bill',3200);
pay(35,'out','Prime Oils',p2,null,'Main bank');
const s3=sale(34,'City Hardware',[item('Sugar 1kg',8,180),item('Tea 500g - Tapal',3,900)]);
pay(33,'in','City Hardware',s3,3000,'Cash');
exp(29,'Transport','Delivery van hire',2500,'Pay later');
const s4=sale(28,'Hamza Stores',[item('Basmati Rice 5kg - Guard',2,2800),item('Wheat Flour 10kg - Sunridge',3,1450)]);
pay(26,'out','Global Foods Ltd',p1,20000,'Main bank');
const s5=sale(25,'Metro Retail',[item('Cooking Oil 1L - Dalda',8,620),item('Cooking Oil 1L - Eva',10,595)]);
exp(23,'Salaries','Shop staff',12000,'Main bank');
// Two manual entries: a cost reclassified between two accounts, and the owner taking cash. The second names
// the account ('Cash'), so the cash screen and the book move together.
jrn(22,'Packing and delivery carried into the cost of goods',[{acc:'Cost of goods sold',dr:'6700',cr:''},{acc:'Expenses',dr:'',cr:'6700'}]);
const s6=sale(21,'Al Noor Traders',[item('Sugar 1kg',10,180),item('Tea 500g - Tapal',4,900)]);
pay(20,'in','Al Noor Traders',s6,null,'Cash');
pay(20,'out','Global Foods Ltd',p3,20000,'Main bank');
trf(19,'Cash','Main bank',100000);
const s7=sale(18,'Sana Mart',[item('Cooking Oil 1L - Eva',8,595),item('Cooking Oil 1L - Dalda',4,620)]);
distSale(16,'Noor Mart',[item('Basmati Rice 5kg - Guard',4,2500),item('Wheat Flour 10kg - Sunridge',2,1300)]);
const q1=quote(15,-1,'Al Noor Traders',[item('Basmati Rice 5kg - Guard',10,2750)]);
const s8=sale(14,'Zara Mart',[item('Basmati Rice 5kg - Guard',4,2800),item('Sugar 1kg',6,180)]);
pay(13,'in','Zara Mart',s8,8000,'Main bank');
exp(11,'Packing','Cartons and bags',1800);
distSale(10,'Bilal General Store',[item('Cooking Oil 1L - Eva',6,540),item('Tea 500g - Tapal',1,800)]);
const s9=sale(9,'Hamza Stores',[item('Wheat Flour 10kg - Sunridge',4,1450),item('Tea 500g - Tapal',2,900)]);
jrn(8,'Owner took cash',[{acc:'Owner equity',dr:'25000',cr:''},{acc:'Cash',dr:'',cr:'25000'}]);
pay(8,'in','Karim Brothers',null,8000,'Cash','d');
applyStockAdj(PRD.findIndex(p=>dn(p)==='Sugar 1kg'),-2,'Damage');
cn(7,s6,{'Tea 500g - Tapal':1});
const s10=sale(6,'City Hardware',[item('Cooking Oil 1L - Dalda',6,620),item('Cooking Oil 1L - Eva',5,595)]);
trf(6,'Main bank','Cash',60000);
const q2=quote(6,8,'Zara Mart',[item('Sugar 1kg',20,175),item('Tea 500g - Tapal',6,880)]);setQS(q2,'Accepted');
cn(5,p4,{'Cooking Oil 1L - Eva':1});
pay(4,'in','Sana Mart',s7,9000,'Cash');
const s11=sale(3,'Metro Retail',[item('Sugar 1kg',5,180),item('Basmati Rice 5kg - Guard',2,2800)]);
exp(2,'Fuel','Delivery fuel',1400);
quote(2,3,'City Hardware',[item('Wheat Flour 10kg - Sunridge',8,1420)]);
sale(1,'Walk-in',[item('Tea 500g - Tapal',1,900),item('Sugar 1kg',2,180)]);
// ---- staff ------------------------------------------------------------------------------------------
// Three employees, last month's salaries already run and mostly paid, one advance being recovered, a
// purchase the driver paid for himself - and this month's salaries deliberately left DUE, so the reminder
// that recurring salaries are waiting is visible the moment the sample loads.
const emp=(n,code,desig,phone,age,basic)=>{saveEmp(-1,{n:n,code:code,desig:desig,phone:phone,join:D(age),basic:basic,recur:true,day:1,active:true});return EMP.length-1};
emp('Rafiq Ahmed','E-1','Driver','0300 1112223',200,30000);
emp('Bilal Khan','E-2','Loader','0301 2223334',120,22000);
emp('Nadia Bibi','E-3','Cashier','0302 3334445',60,35000);
payAdvance('Rafiq Ahmed',30000,'Main bank',5000);
const sal=(k,basic,bonus,recov)=>postSalary(k,runTotals(basic,bonus,recov),D(34));
sal(0,30000,0,5000);sal(1,22000,2000,0);sal(2,35000,0,0);
payStaff('Rafiq Ahmed',25000,'Main bank');
payStaff('Nadia Bibi',35000,'Main bank');
exp(20,'Transport','Van diesel, paid by the driver himself',4200,'Cash','Bilal Khan');
}finally{S.quiet=was}
S.items=null;S.screen=null;S.tab='dash';S.q='';S.short=null;render();
toast('Sample business loaded — every screen has something in it now')}
