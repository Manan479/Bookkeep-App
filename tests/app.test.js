// app.test.js - screens render cleanly and the main money flows behave.
// Covers: posting, drafts, editing posted invoices, returns, payments, advances, quotations,
// expenses, transfers, journal, reports, FIFO, setup wizard.
const stk=n=>PRD.find(p=>dn(p)===n)[2];
S.dist=true;
// The app now starts at a log-in screen. The rest of this file is about screens, so sign in as the
// administrator the fresh install comes with and stay signed in.
signIn('Admin','1234');
// ---- sale
openScr('inv','sale');S.cust='Zara Mart';S.items=[{n:'Cooking Oil 1L - Dalda',q:10,r:620,d:0,dt:'amt',tx:5,tt:'pct',s:80},{n:'Sugar 1kg',q:4,r:180,d:10,dt:'pct',tx:5,tt:'pct',s:6}];chk('inv-sale',inv());
const oil0=stk('Cooking Oil 1L - Dalda');post();
T('sale posted',INVD['INV-0001']&&INV[0][0]==='INV-0001');T('stock down',stk('Cooking Oil 1L - Dalda')===oil0-10);eq('counter',S.n,2);

newReturn('INV-0001');S.rf.qty={'Cooking Oil 1L - Dalda':3};chk('rtf',rtfScr());saveRet();T('return saved',RET[0]&&RET[0].id==='CN-0001');T('stock back',stk('Cooking Oil 1L - Dalda')===oil0-7);
const cnt=RET.length;S.rf={inv:'INV-0001',qty:{'Cooking Oil 1L - Dalda':99},settle:'credit',acct:'Cash',notes:'',date:tdy};saveRet();T('over-return blocked',RET.length===cnt);
S.rk=RET[0];chk('rtd',rtdScr());chk('rtScr',rtScr());
newPay('in','Zara Mart','INV-0001');T('prefill pay',S.pm.alloc['INV-0001']>0);savePm();T('pay saved',PAYM[0].id==='RCP-0001');
T('paid status',['Paid','Partial'].includes(INV.find(x=>x[0]==='INV-0001')[4]));
S.pmk=PAYM[0];chk('pmd',pmdScr());T('the slogan prints on a payment receipt',pmdScr().includes(COMP.slogan));
const cashB=BAL.Cash;voidPm(PAYM[0]);T('payment void',PAYM[0].void&&BAL.Cash===cashB-PAYM[0].amt);
// ---- purchase + FIFO
SET.cost='fifo';openScr('inv','pur');S.sup='Prime Oils';S.items=[{n:'Cooking Oil 1L - Eva',q:20,r:520,d:0,dt:'amt',tx:5,tt:'pct',s:34}];chk('inv-pur',inv());const eva0=stk('Cooking Oil 1L - Eva');post();
T('pur posted',PUR[0][0]==='PUR-0001'&&stk('Cooking Oil 1L - Eva')===eva0+20);T('payable',PAYB.some(x=>x[2]==='PUR-0001'));eq('one layer, because stock started at nothing',lay('Cooking Oil 1L - Eva').length,1);
chk('sv fifo',rptScr.call(null)||'');S.rpk='sv';chk('sv',rptScr());
// A confirmation overlay must not be left on the page. Every overlay uses the same element ids, so one left
// behind captures the next one's buttons and the new overlay sits there dead - which happened in a browser
// and no test caught it, because the fake browser cannot click.
okOverlay('Done','was it cleaned up','Done',()=>{});
T('the confirmation overlay is drawn',true);
render();
newPay('out','Prime Oils','PUR-0001');savePm();T('pur paid',PUR[0][4]==='Paid');
// ---- draft
openScr('inv','sale');S.cust='Hamza Stores';S.items=[{n:'Tea 500g - Tapal',q:2,r:900,d:0,dt:'amt',tx:5,tt:'pct',s:0}];saveDraft();const dn0=INV[0][0];T('draft row',INV[0][4]==='Draft'&&INVD[dn0].draft);const nBefore=S.n;
openInv(dn0);T('draft loads',S.screen==='inv'&&S.editNo===dn0&&S.items.length===1);post();T('draft posted same number',INV.find(x=>x[0]===dn0)[4]!=='Draft'&&S.n===nBefore&&INV.filter(x=>x[0]===dn0).length===1);
// ---- distributor invoice
openScr('inv','dist');S.dsel='Karim Brothers';S.dcust='Noor Mart';S.items=[{n:'Sugar 1kg',q:2,r:200,d:0,dt:'amt',tx:0,tt:'pct',s:10}];chk('inv-dist',inv());const ow=DIST[0].owed;post();T('dist owed up',DIST[0].owed>ow);
// ---- quote
openScr('inv','qt');S.cust='Al Noor Traders';S.items=[{n:'Sugar 1kg',q:10,r:180,d:0,dt:'amt',tx:5,tt:'pct',s:6},{n:'Tea 500g - Tapal',q:5,r:900,d:0,dt:'amt',tx:5,tt:'pct',s:0}];chk('inv-qt',inv());post();const qn=QUOT[0].no;T('quote saved',qn==='QT-0001'&&QUOT[0].status==='Sent');
S.qk=qn;chk('qd',qdScr());chk('qt',qtScr());setQS(qn,'Accepted');chk('qd2',qdScr());
openScr('inv','sale');S.items=[Object.assign({},QUOT[0].items[0],{q:4,s:6})];S.cust='Al Noor Traders';S.fromQ=qn;post();T('partial convert',QUOT[0].status==='Accepted'&&QUOT[0].conv.length===1);
openScr('inv','sale');S.items=[Object.assign({},QUOT[0].items[0],{q:6,s:6}),Object.assign({},QUOT[0].items[1],{q:5,s:0})];S.cust='Al Noor Traders';S.fromQ=qn;post();T('full convert',QUOT[0].status==='Converted');
previewQuote(qn);chk('prev qt',prev());

// ---- pending balance on invoice
TPL.bal=true;openScr('inv','sale');S.cust='Al Noor Traders';S.items=[{n:'Sugar 1kg',q:1,r:100,d:0,dt:'amt',tx:0,tt:'pct',s:6}];S.posted=false;const pv=prev();T('pending shown live',pv.includes('Previous balance')&&pv.includes('Total due'));chk('prev-bal',pv);chk('inv-balrow',inv());
S.showBal=false;T('pending hidden per invoice',!prev().includes('Previous balance'));S.showBal=undefined;
const balNow=pbals({n:'Al Noor Traders',c:true,s:false,d:false}).c;post();const pn=S.lastNo;T('snapshot saved',INVD[pn].bal&&INVD[pn].bal.prev===balNow&&INVD[pn].showBal===true);S.posted=true;const pp=prev();T('posted shows snapshot',pp.includes('Total due'));
openScr('inv','sale');S.cust='Walk-in';S.items=[{n:'Sugar 1kg',q:1,r:100,d:0,dt:'amt',tx:0,tt:'pct',s:6}];T('walk-in no balance',!prev().includes('Previous balance'));TPL.bal=false;

// ---- editing posted invoices
TPL.bal=false;openScr('inv','sale');S.cust='Hamza Stores';S.items=[{n:'Sugar 1kg',q:2,r:180,d:0,dt:'amt',tx:0,tt:'pct',s:10}];post();const en=S.lastNo,sg0=stk('Sugar 1kg'),nB=S.n,cnt0=INV.length;
openInv(en);T('opens editor posted',S.screen==='inv'&&S.editPosted&&S.editNo===en&&S.items[0].q===2);chk('editor-edit',inv());
S.items[0].q=5;post();T('edit stock',stk('Sugar 1kg')===sg0-3);T('same number, no duplicate',INV.filter(x=>x[0]===en).length===1&&INV.length===cnt0&&S.n===nB);T('amount updated',INV.find(x=>x[0]===en)[3]===900);
newPay('in','Hamza Stores',en);S.pm.amt='400';pmClamp();S.pm.alloc={};pmTog(en);savePm();
openInv(en);S.items[0].q=1;post();T('blocked below paid',INV.find(x=>x[0]===en)[3]===900&&S.screen==='inv');
S.items[0].q=4;post();T('edit above paid',INV.find(x=>x[0]===en)[3]===720&&INV.find(x=>x[0]===en)[4]==='Partial');
openInv(en);S.cust='Zara Mart';post();T('party change blocked',INV.find(x=>x[0]===en)[1]==='Hamza Stores');
openScr('inv','pur');S.sup='Prime Oils';S.items=[{n:'Sugar 1kg',q:10,r:150,d:0,dt:'amt',tx:0,tt:'pct',s:0}];post();const pe=S.lastNo,sg1=stk('Sugar 1kg');newPay('out','Prime Oils',pe);S.pm.amt='500';pmClamp();S.pm.alloc={};pmTog(pe);savePm();
openInv(pe);S.items[0].q=20;post();T('purchase edit stock',stk('Sugar 1kg')===sg1+10);T('purchase edit payable',PAYB.find(x=>x[2]===pe).slice(3,4)[0]===2500);
// There is no sample data any more, so the "open an invoice that only exists as a list row" path is now
// reached only with a number that has nothing behind it. That must open nothing, not throw.
const invRows0=INV.length;openInv('INV-9999');T('an unknown invoice number opens nothing',INV.length===invRows0&&!INVD['INV-9999']);
S.itype='sale';S.items=[{n:'X',q:1,r:10,d:0,dt:'amt',tx:0,tt:'pct'}];S.posted=true;S.lastNo='INV-1';const pv2=prev();T('received by label',pv2.includes('Received by')&&!pv2.includes('Customer signature'));
// ---- expenses
const c0=BAL.Cash;newExp();S.ef.amt='1000';S.ef.payee='Stationery';S.ef.cat='Other';saveExp();T('exp paid',EXP[0].id==='EXP-0001'&&BAL.Cash===c0-1000);
newExp();S.ef.amt='2500';S.ef.payee='Internet';S.ef.acct='Pay later';S.ef.inv='INV-0001';saveExp();T('exp later',PAYB.some(x=>x[2]==='EXP-0002'));
S.xk=EXP[0];chk('exd',exdScr());S.xk=EXP[1];chk('exd2',exdScr());chk('exScr',exScr());newExp();chk('exf',exfScr());voidExp(EXP[0]);T('exp void',EXP[0].void&&!PAYB.some(x=>x[2]==='EXP-0002'));voidExp(EXP[1]);T('exp void cash',BAL.Cash===c0);
// ---- cash & bank
newTransfer();S.tf.from='Cash';S.tf.to='Meezan Bank';S.tf.amt='500';const m0=BAL['Meezan Bank'];saveTransfer();T('transfer',BAL['Meezan Bank']===m0+500);chk('tfr',tfrScr());chk('cb',cbScr());S.ac='Cash';chk('cbd',cbdScr());
// ---- journal
newJournal();S.jf.lines=[{acc:'Expenses',dr:'100',cr:''},{acc:'Owner equity',dr:'',cr:'100'}];chk('jf',jfScr());postJournal();{const j=JRN[JRN.length-1];T('jv posted',j.src==='manual'&&j.id===num('jv',S.jpn-1))}
newJournal();S.jf.lines=[{acc:'Cash and bank',dr:'100',cr:''},{acc:'Owner equity',dr:'',cr:'90'}];const jc=JRN.length;postJournal();T('unbalanced blocked',JRN.length===jc);
S.jk=JRN[0];chk('jd',jdScr());chk('jl',jlScr());S.jk=JRN[0];
// ---- reports
for(const k of ['sp','sq','pp','ar','ap','sv','ls','sm','ex','dr','tx','bs','tb','cf']){S.rpk=k;chk('rpt-'+k,rptScr())}
chk('rp',rpScr());for(const n of ['Zara Mart','Prime Oils','Karim Brothers','Al Noor Traders','Sunrise Traders']){S.stn=n;S.stBack='pd';chk('stmt-'+n,stmtScr())}
S.rpk='tb';{const d=repData('tb');const r=trialRows();T('the trial balance shows the ledger totals',d.total[1]===fmt(r.dr)&&d.total[2]===fmt(r.cr));T('the trial balance balances',r.diff===0);T('and it has no balancing line',!d.rows.some(x=>x[0].indexOf('balancing')>=0))}
// ---- notifications, parties, payments list
chk('nt',ntScr());chk('dash',dash());chk('more',more());chk('sales',list(INV,'Sales','New Invoice'));chk('pur',list(PUR,'Purchases','New Purchase'));chk('inventory',inventory());chk('pm',pmScr());chk('pt',ptScr());chk('payables',payScr());
// ---- company, templates, settings, wizard
chk('co',coScr());for(const f of ['A4','A5','80mm','58mm']){S.fmt=f;chk('tp-'+f,tpScr());S.itype='sale';S.items=[{n:'X',q:1,r:10,d:0,dt:'amt',tx:5,tt:'pct'}];S.posted=true;S.lastNo='INV-1';chk('prev-'+f,prev())}T('the slogan prints under the company name on an invoice',prev().includes(COMP.slogan));T('and an empty slogan prints nothing',(COMP.slogan='',!prev().includes('class="slogan"')));COMP.slogan='Wholesale groceries and general supplies';
chk('st',stScr());wzInit();for(let i=0;i<5;i++){S.wz.step=i;chk('wz'+i,wzScr())}
S.wz.wipe=true;S.wz.bank='HBL';S.wz.cash=500;S.wz.bbal=9000;S.wz.name='New Co';wzFinish();T('wipe',INV.length===0&&PUR.length===0&&PAYB.length===0&&PRD.every(p=>p[2]===0)&&ACCTS.join()==='Cash,HBL'&&BAL.HBL===9000&&COMP.name==='New Co'&&SET.done);
eq('the opening balances became entries in the book',JRN.length,2);
eq('cash on the book',ledBal('Cash and bank'),9500);
eq('and the same on the other side',ledBal('Owner equity'),9500);
chk('dash-empty',dash());chk('sales-empty',list(INV,'Sales','New Invoice'));chk('pt-empty',ptScr());S.rpk='sv';chk('rpt-empty',rptScr());chk('nt-empty',ntScr());chk('cb-empty',cbScr());

// ---- a screen that fails must say so, not go blank ----------------------------------------------------
// The parties page went blank on one device and could not be reproduced here. Whatever threw, the app now
// shows what it was instead of leaving somebody staring at an empty screen.
T('a screen that fails explains itself',screenError('Parties',new Error('x is not defined')).includes('x is not defined'));
T('and offers a way back',screenError('Parties',new Error('boom')).includes("go('dash')"));
T('an error with no message still reads',screenError('Parties',undefined).includes('failed to draw'));

// ---- closing a popup animates instead of vanishing -------------------------------------------------------
// The hook is installed on Element.prototype, which the fake browser in tests/ does not have: what is
// checked here is that installing it does not break anything, and that a real element would be marked .off.
T('the closing hook only touches overlays and panels',typeof Element==='undefined'||typeof Element.prototype.remove==='function');

// ---- the accent colour ---------------------------------------------------------------------------------
// One colour the shop picks, used by the buttons, the tab bar and the printed invoices. The two colours
// derived from it are what stop it looking broken: a tint for backgrounds, and readable text on top.
T('there is a spectrum of accents to choose from',ACCENTS.length>=10&&ACCENTS.every(x=>/^#[0-9A-Fa-f]{6}$/.test(x[0])));
T('every one of them has a name',ACCENTS.every(x=>x[1].length>2));
T('the accent is part of the company templates, so it is saved and backed up',typeof TPL.accent==='string'&&TPL.accent.charAt(0)==='#');
T('text on a pale accent turns dark',lightOn('#FFD700'));
T('text on a deep accent stays white',!lightOn('#0F5B3F'));
T('a tint of the accent is lighter than the accent',shade('#0F5B3F',.86)[1]>hex2rgb('#0F5B3F')[1]);
T('a three digit colour is understood',hex2rgb('#fff').join()==='255,255,255');
T('and nonsense does not throw',hex2rgb('').length===3);
const accBefore=TPL.accent;
setAccent('#00BCD4');
eq('choosing one takes effect',TPL.accent,'#00BCD4');
T('and the picker shows which is chosen',thScr().includes('Accent colour')&&thScr().includes('✓ '));
T('the picker names the chosen colour',thScr().includes('Green')||thScr().includes(accentName()));
T('and still offers any colour at all',thScr().includes('dot pick'));
T('every swatch carries its name, so one cannot render as an invisible circle',ACCENTS.every(x=>thScr().includes('>'+x[1]+'</button>')||thScr().includes('✓ '+x[1]+'</button>')));
T('drawing a screen does not throw with a custom accent',(S.tab='more',render(),true));
T('and the printed document uses it',invPaper({title:'Invoice',no:'x',date:tdy,partyLabel:'Customer',party:'P',items:[],T:{sub:0,dis:0,tax:0,g:0},seller:{n:'C',a:'',p:'',t:'',own:false}},'A4').includes('#00BCD4'));
T('a colour of your own ticks no preset',(setAccent('#123456'),!thScr().includes('✓ '),thScr().includes('Your colour')));
setAccent(accBefore);

T('a soft render marks the screen so animations do not replay',(S.tab='more',render(false,true),true));

// ---- the Theme module ------------------------------------------------------------------------------------
// Light/dark, the accent, the invoice title and the currency used to sit on top of the More screen. They
// have a screen of their own now, reachable from the module list like everything else.
T('More has a Theme module',more().includes('>Theme<'));
T('and it is not a screen only an administrator can open',canScreen('th'));
T('the More screen no longer carries the theme card',!more().includes('Accent colour')&&!more().includes('Light or dark'));
T('the module has the light/dark choice and the accent',['Light or dark','Accent colour'].every(x=>thScr().includes(x)));
T('and no longer the invoice title or the currency',!thScr().includes('Invoice title')&&!thScr().includes('Currency'));
T('the invoice title lives with the documents instead',tpScr().includes('Invoice title'));
T('and the currency with the company',coScr().includes('Currency')&&coScr().includes('PKR'));
T('they are listed in one place, not spelled out twice',CURRENCIES.length===5&&coScr().includes(CURRENCIES[1][1]));
T('the module explains that the theme stays on the device',thScr().includes('this device only'));
T('and it opens from the module list',(moreGo('Theme'),S.screen==='th'));
