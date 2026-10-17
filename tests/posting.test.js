// posting.test.js - Priority 1: a document that is recorded must also reach the book.
//
// This is the file that proves the two agree. It drives the REAL feature functions (post, savePm,
// saveRet, saveExp, saveTransfer, postJournal) and then reads the LEDGER, not the records, comparing
// them against each other. It runs after app.test.js, ledger.test.js and persist.test.js, so it builds
// its own fixtures from nothing rather than trusting whatever those left behind.

// ---- fixtures -------------------------------------------------------------------------------------
// A clean book, clean records, and 1000 of opening capital so cash never has to go negative.
JRN.length=0;S.jpn=1;
wipeData();
ACCTS.length=0;ACCTS.push('Cash','Bank');
Object.keys(BAL).forEach(k=>delete BAL[k]);Object.keys(ACT).forEach(k=>delete ACT[k]);
BAL.Cash=1000;BAL.Bank=0;ACT.Cash='Cash';ACT.Bank='Bank';
SET.cost='avg';SET.taxOn=true;SET.negStock='allow';SET.done=true;S.dist=true;
if(!USERS.some(u=>u.n==='Admin'))USERS.push({n:'Admin',role:'admin',pin:'1234',active:true});ensureUserIds();
signIn('Admin','1234');
SET.taxRates.length=0;SET.taxRates.push({n:'Sales tax',p:5,def:true});
CUST.push('Acme Stores');SUPP.push('Supply Co');
DIST.push({n:'Dist One',a:'',p:'',t:'',b:'',owed:0,sold:0});DCU['Dist One']=['His Shop'];
PRD.push(['Widget','W-1',0,10,'']);
PRICE['Widget']=100;DRATE['Widget']=80;

const accCash=()=>ACCTS.reduce((a,n)=>a+(BAL[n]||0),0);
const accPay=()=>PAYB.reduce((a,x)=>a+x[3],0);
const accAr=()=>INV.filter(r=>live(r)&&r[1].indexOf(' > ')<0).reduce((a,r)=>a+r[3]-(PAID[r[0]]||0),0)+distOwed();
const accStock=()=>PRD.reduce((a,p)=>a+stockVal(p),0);

postOpeningLedger({acct:'Cash',date:tdy,amount:1000,ref:'OPEN-Cash',narr:'Opening capital'});
eq('opening money entered the book',ledBal('Cash and bank'),1000);
eq('and it is owed back to the owner',ledBal('Owner equity'),1000);

// ---- a purchase: stock in, payable up -------------------------------------------------------------
openScr('inv','pur');S.sup='Supply Co';
S.items=[{n:'Widget',q:20,r:60,d:0,dt:'amt',tx:0,tt:'pct',s:0}];
post();
const purNo=S.lastNo;
eq('the purchase posted one entry',ledFor(purNo).length,1);
eq('the purchase reached the book',ledFor(purNo)[0].src,'purchase');
eq('inventory went up by the bill',ledBal('Inventory'),1200);
eq('accounts payable holds the bill',ledBal('Accounts payable'),1200);
eq('the ledger payable matches the payables list',ledBal('Accounts payable'),accPay());
eq('inventory value agrees with the stock report',ledBal('Inventory'),accStock());

// ---- a sale: receivable, income, tax, and the cost of the goods -----------------------------------
openScr('inv','sale');S.cust='Acme Stores';
S.items=[{n:'Widget',q:10,r:100,d:0,dt:'amt',tx:5,tt:'pct',s:20}];
post();
const saleNo=S.lastNo;
eq('the sale posted one entry',ledFor(saleNo).length,1);
eq('receivable is the rounded invoice total',ledBal('Accounts receivable'),1050);
eq('the record stores the same total',INV.find(x=>x[0]===saleNo)[3],1050);
eq('sales is the unrounded line arithmetic',ledBal('Sales'),1000);
eq('tax is the rest of the total',ledBal('Tax payable'),50);
eq('the cost of the goods left inventory',ledBal('Inventory'),600);
eq('and landed in cost of goods sold',ledBal('Cost of goods sold'),600);
eq('the sale entry balances',ledTotals(ledFor(saleNo)[0]).diff,0);

// ---- F1: a total with a fraction in it must still balance -----------------------------------------
// 1 x 100.50 at 5% is 105.525, which rounds to 106. Sales keeps 100.50 and tax takes 5.50.
openScr('inv','sale');S.cust='Acme Stores';
S.items=[{n:'Widget',q:1,r:100.50,d:0,dt:'amt',tx:5,tt:'pct',s:10}];
post();
const fracNo=S.lastNo;
eq('the fractional invoice still balances',ledTotals(ledFor(fracNo)[0]).diff,0);
eq('its receivable is the rounded total',INV.find(x=>x[0]===fracNo)[3],106);
eq('sales kept the unrounded line figure',ledBal('Sales'),1000+100.50);
eq('tax absorbed the rounding difference',ledBal('Tax payable'),50+5.50);
eq('inventory came down by another unit',ledBal('Inventory'),600-60);

// ---- F3: a receipt splits into what was applied and what is kept ----------------------------------
newPay('in','Acme Stores');S.pm.amt='50';S.pm.alloc={[fracNo]:40};savePm();
eq('cash moved by the amount received',ledBal('Cash and bank'),1050);
eq('the ledger cash matches the app accounts',ledBal('Cash and bank'),accCash());
eq('receivable came down by what was applied',ledBal('Accounts receivable'),1156-40);
eq('the rest is held as an advance',ledBal('Advances from customers'),10);
eq('the ledger receivable matches the open invoices',ledBal('Accounts receivable'),accAr());

// Spending an advance instead of keeping one moves the advance the other way out of the same number.
newPay('in','Acme Stores');S.pm.amt='0';S.pm.useAdv=true;S.pm.alloc={[fracNo]:10};savePm();
eq('the advance went the other way',ledBal('Advances from customers'),0);
eq('receivable came down again',ledBal('Accounts receivable'),1156-50);
eq('no cash moved this time',ledBal('Cash and bank'),1050);

// ---- editing a posted invoice reverses the book first, then re-posts -------------------------------
const arBeforeEdit=ledBal('Accounts receivable');
openInv(saleNo);
T('the editor opened on the posted invoice',S.editPosted===true&&S.editNo===saleNo);
S.items[0].q=4;
post();
eq('there is still only one live entry for the invoice',ledFor(saleNo).length,1);
eq('the old entry was flagged void, not left live',JRN.filter(e=>e.ref===saleNo&&e.void).length,1);
eq('the receivable moved by the difference',ledBal('Accounts receivable'),arBeforeEdit-630);
eq('the edited entry balances',ledTotals(JRN[JRN.length-1]).diff,0);
eq('inventory still agrees with the stock report after the edit',ledBal('Inventory'),accStock());

// ---- a sale return: income and tax off, goods back into stock at cost ------------------------------
const invBeforeRet=ledBal('Inventory'),cogsBeforeRet=ledBal('Cost of goods sold'),arBeforeRet=ledBal('Accounts receivable');
newReturn(saleNo);S.rf.qty={'Widget':2};saveRet();
const cn=RET[0];
eq('the return posted one entry',ledFor(cn.id).length,1);
eq('the return value is the note total',cn.amt,210);
eq('the note carries the exact cost put back into stock',ledFor(cn.id)[0].cost,120);
eq('the ledger inventory went back up by that cost',ledBal('Inventory'),invBeforeRet+120);
eq('cost of goods sold came back down',ledBal('Cost of goods sold'),cogsBeforeRet-120);
eq('receivable came down by the applied part',ledBal('Accounts receivable'),arBeforeRet-210);
eq('the return entry balances',ledTotals(ledFor(cn.id)[0]).diff,0);
eq('inventory still agrees with the stock report after the return',ledBal('Inventory'),accStock());

// ---- a distributor invoice books what he owes you, not what his customer pays ----------------------
const salesBeforeDist=ledBal('Sales'),cogsBeforeDist=ledBal('Cost of goods sold');
openScr('inv','dist');S.dsel='Dist One';S.dcust='His Shop';
S.items=[{n:'Widget',q:5,r:100,d:0,dt:'amt',tx:0,tt:'pct',s:17}];
chk('inv-dist',inv());
post();
const distNo=S.lastNo;
eq('the distributor invoice posted one entry',ledFor(distNo).length,1);
eq('it is marked as a distributor sale',ledFor(distNo)[0].src,'dist');
eq('his price on 5 units is the income',ledBal('Sales'),salesBeforeDist+400);
eq('and the cost of those units left stock',ledBal('Cost of goods sold'),cogsBeforeDist+300);
eq('the receivable matches his balance',ledBal('Accounts receivable'),accAr());

newPay('in','Dist One');S.pm.amt='200';savePm();
eq('the distributor receipt lowered the receivable',ledBal('Accounts receivable'),accAr());
eq('and put cash in',ledBal('Cash and bank'),accCash());

// ---- expenses ---------------------------------------------------------------------------------------
const cashBeforeExp=ledBal('Cash and bank');
newExp();S.ef.amt='300';S.ef.payee='Power Co';S.ef.cat='Utilities';S.ef.acct='Cash';saveExp();
eq('an expense paid from cash is a cost',ledBal('Expenses'),300);
eq('and less cash',ledBal('Cash and bank'),cashBeforeExp-300);
eq('the ledger cash still matches the app accounts',ledBal('Cash and bank'),accCash());
newExp();S.ef.amt='400';S.ef.payee='Phone Co';S.ef.cat='Utilities';S.ef.acct='Pay later';saveExp();
eq('a Pay later expense is a payable, not less cash',ledBal('Accounts payable'),1200+400);
eq('the ledger payable matches the payables list',ledBal('Accounts payable'),accPay());

const cashBeforeVoid=ledBal('Cash and bank');
voidExp(EXP[0]);
eq('voiding it took the payable back out',ledBal('Accounts payable'),1200);
eq('and the cost is gone from the book',ledBal('Expenses'),300);
eq('a Pay later void moves no cash',ledBal('Cash and bank'),cashBeforeVoid);
eq('its entry is kept and flagged void',JRN.filter(e=>e.void&&e.ref===EXP[0].id).length,1);

// ---- a transfer between two of our own accounts ------------------------------------------------------
// It changes no total the book keeps, and it must not break the cash invariant either.
const ledgerCash=ledBal('Cash and bank');
newTransfer();S.tf.from='Cash';S.tf.to='Bank';S.tf.amt='100';saveTransfer();
eq('a transfer leaves the ledger cash total alone',ledBal('Cash and bank'),ledgerCash);
eq('and the ledger cash still matches the app accounts',ledBal('Cash and bank'),accCash());

// ---- the manual journal now shares one door, one counter and one shape --------------------------------
newJournal();S.jf.lines=[{acc:'Expenses',dr:'100',cr:''},{acc:'Owner equity',dr:'',cr:'100'}];
chk('jf',jfScr());
postJournal();
const mj=JRN[JRN.length-1];
eq('the manual entry is in the book',mj.src,'manual');
eq('it is numbered from the same counter as everything else',mj.id,num('jv',S.jpn-1));
eq('every entry number in the book is unique',new Set(JRN.map(e=>e.id)).size,JRN.length);
chk('jl',jlScr());S.jk=mj;chk('jd',jdScr());
// An automatic entry must not offer a Reverse button: reversing it would leave its document behind.
S.jk=ledFor(saleNo)[0];
T('an automatic entry cannot be reversed from the journal',!jdScr().includes('onclick="revJ()"'));

const expBeforeRevJ=ledBal('Expenses');
const rev=ledReverseEntry(mj.id,'Reversed');
T('a manual entry reverses and keeps its place',!!rev&&rev.id===mj.id&&mj.void===true);
eq('and its effect is gone from the book',ledBal('Expenses'),expBeforeRevJ-100);
// A journal CAN move cash, as long as it names the account: the book gets the one rolled-up 'Cash and bank'
// line, the cash screen gets the account that was picked, and reversing moves both back.
newJournal();S.jf.lines=[{acc:'Expenses',dr:'250',cr:''},{acc:'Cash',dr:'',cr:'250'}];
const cashJ=ledBal('Cash and bank'),balJ=BAL.Cash||0;
postJournal();const cj=JRN[JRN.length-1];
eq('a journal can credit the cash account',BAL.Cash,r2(balJ-250));
eq('and the book moves with it',ledBal('Cash and bank'),r2(cashJ-250));
eq('the ledger line carries the rolled-up account',cj.lines.filter(l=>l.cr>0)[0].acc,'Cash and bank');
T('the journal offers the real cash accounts',jfScr().includes('>Cash<'));
T('reversing it takes the cash with it',!!revJournal(cj.id));
eq('reversing puts the cash screen back',BAL.Cash,r2(balJ));
eq('and the book back',ledBal('Cash and bank'),r2(cashJ));
eq('and the cash screen still matches the book',ledBal('Cash and bank'),accCash());

// ---- a stock adjustment moves goods with no invoice behind it, and the book follows -------------------
const invBeforeAdj=ledBal('Inventory'),stockBeforeAdj=accStock(),adjLoss=stockOutVal('Widget',2);
// The entry is captured and asserted, not ignored: a refused entry would otherwise leave the ledger
// quietly short and only the totals below would notice.
T('the stock adjustment posted an entry',!!applyStockAdj(PRD.findIndex(p=>dn(p)==='Widget'),-2,'Damage'));
eq('the adjustment charged the loss to its own account',ledBal('Stock adjustments'),adjLoss);
eq('inventory came down by what left the shelf',ledBal('Inventory'),r2(invBeforeAdj-adjLoss));
eq('and the stock report agrees with the book after an adjustment',ledBal('Inventory'),accStock());
T('the stock really did move',accStock()<stockBeforeAdj);

// Stock a new product starts with is goods the owner brought in, so it goes to equity and not to a loss.
// These are the same three things saveProd() does for a new product, in the same order, because the
// posting needs the cost to have been set first.
PRD.push(['Coil','COIL-1',5,5,'']);PRICE['Coil']=300;CO['Coil']=240;
const eqBeforeOpen=ledBal('Owner equity'),invBeforeOpen=ledBal('Inventory');
T('the opening stock entry posted',!!postStockLedger({ref:'OPEN-STK-Coil',date:tdy,value:stockInVal('Coil',5),acc:'Owner equity',narr:'Opening stock · Coil'}));
eq('and opening stock is valued at what the stock report will put on it',stockInVal('Coil',5),1200);
eq('opening stock is money the owner put in',ledBal('Owner equity'),r2(eqBeforeOpen+1200));
eq('and it lands in inventory',ledBal('Inventory'),r2(invBeforeOpen+1200));
eq('the stock report agrees after opening stock too',ledBal('Inventory'),accStock());

// ---- editing what a product is expected to cost must never restate stock already owned ----------------
// This is the safety property that stands in for a prompt on the form. The form's cost is a default for
// the next purchase; CO, the figure the stock report values stock with, is only ever moved by what was
// actually paid. If this ever fails, retyping a price has silently restated the balance sheet.
const wIdx=PRD.findIndex(p=>dn(p)==='Widget'),stockBeforeCost=stockVal(PRD[wIdx]),invBeforeCost=ledBal('Inventory');
S.pi=wIdx;chk('product form',prodForm());
setProductCost('Widget',999,false);
eq('the expected purchase cost is recorded',BUY['Widget'],999);
eq('the costing cost is untouched by an edit',CO['Widget'],60);
eq('so the stock report did not move',stockVal(PRD[wIdx]),stockBeforeCost);
eq('and the ledger did not move either',ledBal('Inventory'),invBeforeCost);
setProductCost('Seedling',50,true);
eq('a brand-new product does seed its costing cost',CO['Seedling'],50);
delete BUY['Seedling'];delete CO['Seedling'];

// ---- priority 2: correcting a purchase restates the goods that have already sold ---------------------
// Buy 10 at 60, buy 10 at 80, sell 5, then correct the first invoice to 70. The truth is an average of
// 75: the shelf is 15 x 75 = 1125 and the five that sold cost 375. Every figure below is that truth, not
// the app's own arithmetic read back.
const cogsBeforeCost=ledBal('Cost of goods sold');
PRD.push(['Costly','COST-1',0,5,'']);PRICE['Costly']=120;
const buyCostly=(q,r)=>{openScr('inv','pur');S.sup='Supply Co';S.items=[{n:'Costly',q,r,d:0,dt:'amt',tx:0,tt:'pct',s:0}];post();return S.lastNo};
const costlyPur=buyCostly(10,60);buyCostly(10,80);
openScr('inv','sale');S.cust='Acme Stores';S.items=[{n:'Costly',q:5,r:120,d:0,dt:'amt',tx:0,tt:'pct',s:5}];post();
const costlyP=PRD.find(p=>dn(p)==='Costly');
eq('two purchases at 60 and 80 average to 70',CO['Costly'],70);
eq('and the shelf is worth what was paid for what is left',stockVal(costlyP),1050);
openInv(costlyPur);S.items[0].r=70;post();
eq('the corrected average is the truth',CO['Costly'],75);
eq('the pool remembers how many units went in',BQ['Costly'],20);
eq('and exactly what was paid for them',BA['Costly'],1500);
eq('the stock report puts 75 a unit on the 15 still there',stockVal(costlyP),1125);
eq('the sold half of the correction reached cost of goods sold',ledBal('Cost of goods sold'),r2(cogsBeforeCost+375));
eq('the book holds exactly what the shelf is worth',ledBal('Inventory'),accStock());
eq('so the gap between them is nothing',r2(accStock()-ledBal('Inventory')),0);

// ---- selling before buying: the shelf keeps the last cost, and the book agrees -----------------------
// Nothing on the shelf and no purchase behind it, so the sale is really a missing purchase. The book
// relieves a cost for those units; the stock report must not pretend they were free.
const cogsBeforeShort=ledBal('Cost of goods sold');
PRD.push(['Short','SH-1',0,5,'']);PRICE['Short']=500;CO['Short']=400;
openScr('inv','sale');S.cust='Acme Stores';S.items=[{n:'Short',q:3,r:600,d:0,dt:'amt',tx:0,tt:'pct',s:0}];post();
const shortP=PRD.find(p=>dn(p)==='Short');
eq('a sale with nothing on the shelf goes negative',shortP[2],-3);
eq('the shelf keeps the last cost instead of dropping to nothing',stockVal(shortP),-1200);
eq('so the book and the shelf still agree',ledBal('Inventory'),accStock());
eq('and those goods cost what the book says they cost',ledBal('Cost of goods sold'),r2(cogsBeforeShort+1200));
eq('the missing purchase is offered when the sale is posted',(S.short||[]).length,1);
eq('with the units that were not there',S.short[0].q,3);
eq('and the last cost as the starting figure',S.short[0].c,400);
eq('flagged as a real last cost, not a guess',S.short[0].k,true);
T('and it is in notifications until the purchase is recorded',notifs().some(x=>x.g==='Negative stock'&&x.t==='Short'));
chk('the prompt that asks what they cost',shortHtml(S.short));
T('the prompt names the goods and the units',shortHtml(S.short).includes('Short')&&shortHtml(S.short).includes('3 x'));

// ---- recording that purchase fills the form in, and posting it is what values the goods for real ------
SET.taxOn=false;
newPurFor([{n:'Short',q:3,c:450}]);
T('the missing units are on a new purchase',S.itype==='pur'&&S.items.length===1);
eq('the units that were missing are carried over',S.items[0].q,3);
eq('and the cost that was answered',S.items[0].r,450);
S.sup='Supply Co';post();
eq('posting the purchase brings the stock back to zero',PRD.find(p=>dn(p)==='Short')[2],0);
eq('and the book and the shelf still agree',ledBal('Inventory'),accStock());
eq('the difference between the last cost and what was really paid is a cost of sales',ledBal('Cost of goods sold'),r2(cogsBeforeShort+1350));
eq('so nothing is left showing as negative',notifs().some(x=>x.g==='Negative stock'&&x.t==='Short'),false);

// ---- a product that was never bought has no last cost, and the prompt must say so rather than present
// ---- the app's own four-fifths-of-the-sale-price guess as a figure somebody actually paid
PRD.push(['Unknown','UNK-1',0,5,'']);PRICE['Unknown']=1000;
openScr('inv','sale');S.cust='Acme Stores';S.items=[{n:'Unknown',q:1,r:1000,d:0,dt:'amt',tx:0,tt:'pct',s:0}];post();
eq('a sale with no cost behind it goes negative',PRD.find(p=>dn(p)==='Unknown')[2],-1);
eq('there is no last cost to use',S.short[0].k,false);
eq('so the book falls back to four fifths of the sale price',S.short[0].c,800);
eq('and the shelf and the book still agree on it',ledBal('Inventory'),accStock());
chk('the prompt for a product with no cost',shortHtml(S.short));
T('the prompt says the figure is an assumption, not a cost',/never bought|no cost is known/i.test(shortHtml(S.short)));
T('notifications say the same',notifs().some(x=>x.g==='Negative stock'&&x.t==='Unknown'&&/never bought/i.test(x.s)));

// ---- the sample business: six weeks built only by posting real documents ------------------------------
// Every figure below is checked against the records, not against a number written down here, so a demo
// that drifts from its own book cannot pass. This is what the app loads on a fresh phone.
signIn('Admin','1234');loadDemo();
eq('the sample business posted twelve sales and two distributor invoices',INV.filter(r=>r[4]!=='Draft').length,14);
eq('purchases',PUR.length,4);
eq('of which distributor invoices',INV.filter(r=>r[1].indexOf(' > ')>=0).length,2);
eq('returns, one credit and one debit',RET.length,2);
eq('expenses',EXP.length,7);
eq('employees',EMP.length,3);
eq('salary runs',SAL.length,3);
eq('and what staff are owed equals the employee payable account',r2(EMP.reduce((a,e)=>a+empBal(e.n),0)),ledBal('Employee payable'));
eq('as do the advances outstanding',r2(EMP.reduce((a,e)=>a+staffAdv(e.n),0)),ledBal('Advances to staff'));
eq('this month the recurring salaries are still due',salaryDue(monthOf(tdy)).length,3);
eq('quotations',QUOT.length,3);
eq('payments',PAYM.length,10);
eq('transfers',TRF.length,2);
eq('manual journal entries',JRN.filter(e=>e.src==='manual').length,2);
eq('stock movements were recorded',STK.length>0,true);
T('every product has a cost basis behind it',PRD.filter(p=>p[2]>0).every(p=>CO[dn(p)]>0));
T('nothing was left with negative stock',PRD.every(p=>p[2]>=0));
T('and nothing is flagged negative',notifs().every(x=>x.g!=='Negative stock'));
T('the ledger inventory equals the stock report',ledBal('Inventory')===accStock());
T('the ledger cash equals the sum of the app accounts',ledBal('Cash and bank')===accCash());
T('the ledger payables equal the payables list',ledBal('Accounts payable')===accPay());
T('the ledger receivable equals the open invoices plus distributor balances',ledBal('Accounts receivable')===accAr());
T('and the sample business has actually made a profit',ledKindWin('revenue',piso()[0],piso()[1])>0);
T('every invoice in the sample has an entry behind it',INV.filter(r=>r[4]!=='Draft').every(r=>ledFor(r[0]).length>0));
T('every purchase too',PUR.every(r=>PUR.length&&ledFor(r[0]).length>0));
// Dates: openScr() resets the invoice date, so the demo must set it AFTER opening the screen. Without this
// check the whole sample silently landed on today, which made every period report read the same.
const dates=JRN.filter(ledCounted).map(e=>e.date).sort();
T('the sample business really does span six weeks',(new Date(tdy)-new Date(dates[0]))/864e5>35);
T('and it is not all dated today',dates[0]<dates[dates.length-1]);
T('so this month is only part of the trade',ledKindWin('revenue',piso()[0],piso()[1])<ledByKind('revenue'));

// ---- the accounts module: every account, and the debits and credits behind any one of them ------------
// The running balance at the end of an account's own page must be the balance the rest of the app reads,
// or the page is worse than useless. Checked on the sample business, which has all five kinds of account.
S.screen='ac';S.acct='Sales';S.tab='more';
chk('accounts list',acScr());
S.acct='Sales';chk('sales account',acdScr());
const salesH=ledHistory('Sales');
T('the sales page has a line per sales entry',salesH.length>=14);
eq('its last running balance is the account balance',salesH[salesH.length-1].bal,r2(ledBal('Sales')));
T('the credit notes show as debits on the sales page',salesH.some(l=>l.dr>0));
eq('and the credits are the sales themselves',salesH.filter(l=>l.cr>0).length,14);
// The same must hold for the other kinds, including the ones with a natural credit side.
for(const a of ['Inventory','Cash and bank','Accounts payable','Owner equity','Expenses','Tax payable']){
  const h=ledHistory(a);
  eq('the page for '+a+' ends on the account balance',h.length?h[h.length-1].bal:0,r2(ledBal(a)));
  T('and its lines are in date order '+a,h.every((l,i)=>i===0||l.date>=h[i-1].date));
}
S.acct='Cash and bank';chk('cash account',acdScr());
S.acct='No Such Account';chk('an account with nothing in it',acdScr());

// ---- who posted it: every entry carries the author, written in the one place entries are created --------
// The name and the id are both kept: the id still points at the user after a rename, the name still reads
// correctly after the user is deleted. A book with no users records an empty author and shows nothing.
if(!S.user)signIn(USERS[0].n,USERS[0].pin);
const byNow=JRN[JRN.length-1];
const me=USERS.find(u=>u.n==='Admin')||USERS[0];signIn(me.n,me.pin);T('an entry carries who posted it',byNow.by===me.n&&byNow.byId===me.id);
saveUser(USERS.findIndex(u=>u.id===me.id),{n:'Owner',role:'admin',pin:me.pin,active:true});
eq('a rename does not rewrite what was posted',byNow.by,me.n);
T('but the id still points at the same person',(userById(byNow.byId)||{}).n==='Owner');
signIn('Owner',me.pin);
openScr('inv','sale');S.cust='Acme Stores';S.items=[{n:'Widget',q:1,r:100,d:0,dt:'amt',tx:0,tt:'pct',s:9}];post();
eq('the next entry is in the new name',JRN[JRN.length-1].by,'Owner');
openScr('inv','pur');S.sup='Supply Co';S.items=[{n:'Widget',q:1,r:60,d:0,dt:'amt',tx:0,tt:'pct',s:0}];post();
eq('a purchase records its author too',JRN[JRN.length-1].by,'Owner');
newJournal();S.jf.date=tdy;S.jf.narr='Stock take adjustment';S.jf.lines=[{acc:'Stock adjustments',dr:'50',cr:''},{acc:'Owner equity',dr:'',cr:'50'}];postJournal();
const mj2=JRN[JRN.length-1];
T('and a manual journal entry, which is the one a person actually types',mj2.by==='Owner'&&mj2.src==='manual');
S.jk=mj2;chk('the journal entry shows who entered it',jdScr());
T('the screen names the author',jdScr().includes('Entered by')&&jdScr().includes('Owner'));
revJournal(mj2.id);
eq('a reversal records who reversed it',mj2.voidBy,'Owner');
T('and the screen says so',jdScr().includes('Reversed by'));
signOut();
openScr('inv','sale');S.cust='Acme Stores';S.items=[{n:'Widget',q:1,r:100,d:0,dt:'amt',tx:0,tt:'pct',s:8}];post();
eq('with nobody signed in the author is empty, not a wrong name',JRN[JRN.length-1].by,'');
signIn('Owner',me.pin);
T('an account page shows the author of each line',(S.acct='Stock adjustments',acdScr().includes('Entered by')));

// ---- the invariants from docs/LEDGER_PLAN.md, on a book built only by posting documents --------------
const health=ledHealthy();
eq('every entry in the book balances',health.bad.length,0);
eq('total debits equal total credits',health.diff,0);
const tb=trialRows();
eq('the trial balance totals are equal',tb.diff,0);
T('the trial balance has no balancing line',!tb.rows.some(r=>r.acc.indexOf('balancing')>=0));
eq('the ledger cash equals the sum of the app accounts',ledBal('Cash and bank'),accCash());
eq('the ledger inventory equals the stock report',ledBal('Inventory'),accStock());
eq('the ledger payables equal the payables list',ledBal('Accounts payable'),accPay());
eq('the ledger receivable equals the open invoices plus distributor balances',ledBal('Accounts receivable'),accAr());
eq('assets minus liabilities equals equity plus the result',Math.round((ledByKind('asset')-ledByKind('liability'))*100)/100,Math.round((ledByKind('equity')+ledByKind('revenue')-ledByKind('expense'))*100)/100);

// ---- the reports read the ledger now, so they must agree with it and with each other -----------------
const bsRep=repData('bs'),cfRep=repData('cf');
const bsOf=n=>{const r=bsRep.rows.filter(x=>x[0]===n)[0];return r?r[1]:''};
eq('the balance sheet cash line is the ledger',bsOf('Cash and bank'),fmt(ledBal('Cash and bank')));
eq('the balance sheet inventory line is the ledger',bsOf('Inventory'),fmt(ledBal('Inventory')));
T('the balance sheet has no plug in it',!bsRep.rows.some(x=>x[0].indexOf('balancing')>=0));
eq('assets less liabilities equals total equity from the ledger',bsRep.total[1],bsOf('Total equity'));
const cfWin=piso(),flow=ledCashFlow(cfWin[0],cfWin[1]);
eq('the cash flow net figure is the ledger cash movement',cfRep.total[1],fmt(flow.net));
eq('and the cash flow lines add up to it',r2(Object.values(flow.bySrc).reduce((a,v)=>a+v,0)),flow.net);
eq('the profit and loss revenue is the ledger revenue for the period',ledKindWin('revenue',cfWin[0],cfWin[1]),ledBalWin('Sales',cfWin[0],cfWin[1]));
for(const k of ['bs','tb','cf']){S.rpk=k;chk('rpt-'+k,rptScr())}
chk('pl-screen',pl());chk('dash-screen',dash());

// Leave a clean book for anything that runs after this file.
JRN.length=0;S.jpn=1;

// ---- income accounts: a sale can be posted to the account it belongs to --------------------------------
ACCT_TYPES['Services']='revenue';COA.push('Services');
signIn('Admin','1234');
const salesBefore2=r2(ledBal('Sales')),servBefore=r2(ledBal('Services'));
openScr('inv','sale');S.cust='Acme Stores';S.sacct='Services';S.items=[{n:'Widget',q:2,r:100,d:0,dt:'amt',tx:0,tt:'pct',s:99}];post();
const servNo=S.lastNo;
eq('the sale went to the account the invoice named',r2(ledBal('Services')),r2(servBefore+200));
eq('and not to Sales',r2(ledBal('Sales')),salesBefore2);
eq('the invoice remembers which account it used',INVD[servNo].acct,'Services');
openInv(servNo);
eq('and reopens with that account selected',S.sacct,'Services');
T('the invoice form offers the income accounts',ledAccts('revenue').indexOf('Services')>=0&&ledAccts('revenue').indexOf('Sales')>=0);
T('an income account is a revenue account, not an expense',ACCT_TYPES['Services']==='revenue');

// ---- the total sales report ----------------------------------------------------------------------------
const ts=repData('ts'),w=piso();
T('there is a detailed sales report',!!ts&&ts.title==='Detailed sales report');
T('and it offers a filter of the income accounts',!!ts.opts&&ts.opts[0]==='All'&&ts.opts.length===ledAccts('revenue').length+1);
T('the filter is wired to the screen',ts.set==='setTsAcct'&&ts.skey==='tsAcct');
T('it lists every income account',ts.rows.length===ledAccts('revenue').length);
const netAll=r2(ledAccts('revenue').reduce((a,acc)=>a+ledBalWin(acc,w[0],w[1]),0));
eq('and its total is the ledger revenue for the period',ts.total[1],fmt(netAll));
T('it says what the tax was',/Tax charged/.test(ts.note||''));
T('and it exports every sale line, not just the accounts',ts.detailRows.length>ts.rows.length&&ts.detailCols.indexOf('Income account')>=0);
T('the detail names the party and the item',ts.detailCols.indexOf('Party')>=0&&ts.detailCols.indexOf('Item')>=0);

// ---- every report exports its detail --------------------------------------------------------------------
const need={sq:'Rate',pp:'Rate',sp:'Invoice',ar:'Days',ap:'Days over',sm:'Reference',ex:'Notes',tx:'Tax',sv:'Brand',ls:'Short by',dr:'Distributor price'};
Object.keys(need).forEach(k=>{const d=repData(k);
 T('the '+k+' export is detailed, with '+need[k],!!d&&!!d.detailCols&&d.detailCols.indexOf(need[k])>=0&&d.detailRows.length>=d.rows.length);
 T('and the screen still shows the summary for '+k,d.rows.length<=d.detailRows.length)});
const dr=repData('dr');
T('the distributor detail has a line per item sold at his price',dr.detailRows.length>0&&dr.detailRows[0].length===8);
T('and it carries the invoice and the customer',dr.detailRows.every(r=>r[1]&&r[2]&&r[3]));
S.rpk='dr';S.screen='rpt';rptScr();
eq('so the export button registers the detail, not the summary',S.xp.rows.length,dr.detailRows.length);

// the account rows must add up to the report's own total, and to the ledger
const ts2=repData('ts'),amtOf=s=>Number(String(s).replace(/[^0-9.-]/g,''))||0;
eq('the income account rows add up to the total',r2(ts2.rows.reduce((a,r)=>a+amtOf(r[1]),0)),amtOf(ts2.total[1]));
eq('and the total is the ledger revenue for the period',amtOf(ts2.total[1]),r2(netAll2()));
function netAll2(){return ledAccts('revenue').reduce((a,acc)=>a+ledBalWin(acc,piso()[0],piso()[1]),0)}

// the income account filter narrows the report AND its export, and the chips are drawn
S.tsAcct='Services';
const tsS=repData('ts');
eq('filtering to one account leaves one row',tsS.rows.length,1);
eq('and it is that account',tsS.rows[0][0],'Services');
eq('the total is that account on the ledger',tsS.total[1],fmt(r2(ledBalWin('Services',piso()[0],piso()[1]))));
T('the export is narrowed with it',tsS.detailRows.every(r=>r[3]==='Services'));
T('and every exported line is from that account only',tsS.detailRows.length>0);
S.rpk='ts';S.screen='rpt';chk('the detailed sales report screen',rptScr());
T('the screen draws the filter chips',rptScr().includes('Services')&&rptScr().includes("setTsAcct"));
S.tsAcct='All';
eq('and All puts every account back',repData('ts').rows.length,ledAccts('revenue').length);
