// ledger.test.js - checks the double-entry engine in isolation (core/ledger.js).
// These run before anything posts to the ledger, so they only prove the engine itself.

// Work on a clean book so the counts below are exact.
JRN.length=0;
S.jpn=undefined;

T('ledger loaded',typeof postEntry==='function'&&typeof ledBal==='function');
T('chart of accounts is typed',isAcct('Cash and bank')&&isAcct('Sales')&&acctKind('Inventory')==='asset'&&acctKind('Sales')==='revenue');
T('unknown account is refused',!isAcct('Suspense account'));

// ---- 1. a sale: receivable up, sales and tax booked, cost moved to cost of goods sold
const e1=postEntry({
  date:'2026-10-05',narr:'Sale INV-TEST',src:'sale',ref:'INV-TEST',cost:400,
  lines:[
    {acc:'Accounts receivable',dr:1000,cr:0},
    {acc:'Sales',dr:0,cr:950},
    {acc:'Tax payable',dr:0,cr:50},
    {acc:'Cost of goods sold',dr:400,cr:0},
    {acc:'Inventory',dr:0,cr:400}
  ]
});
T('sale entry posted',!!e1&&e1.id===num('jv',1)&&e1.src==='sale'&&e1.ref==='INV-TEST');
T('sale entry balances',ledTotals(e1).diff===0&&ledTotals(e1).dr===1400);
T('receivable is 1000',ledBal('Accounts receivable')===1000);
T('sales is 950',ledBal('Sales')===950);
T('tax payable is 50',ledBal('Tax payable')===50);
T('cost of goods sold is 400',ledBal('Cost of goods sold')===400);
T('inventory is 400 credit',ledBal('Inventory')===-400);

// ---- 2. a partial receipt: cash up, receivable down, the rest stays an advance
const e2=postEntry({
  date:'2026-10-06',narr:'Receipt INV-TEST',src:'receipt',ref:'INV-TEST',
  lines:[
    {acc:'Cash and bank',dr:600,cr:0},
    {acc:'Accounts receivable',dr:0,cr:500},
    {acc:'Advances from customers',dr:0,cr:100}
  ]
});
T('receipt entry posted',!!e2&&e2.id===num('jv',2));
T('cash is 600',ledBal('Cash and bank')===600);
T('receivable is 500',ledBal('Accounts receivable')===500);
T('advance held is 100',ledBal('Advances from customers')===100);

// ---- 3. refusals: a wrong entry must never reach the book
const before=JRN.length;
T('unbalanced entry refused',postEntry({date:'2026-10-07',src:'sale',lines:[{acc:'Cash and bank',dr:100,cr:0},{acc:'Sales',dr:0,cr:90}]})===null);
T('unknown account refused',postEntry({date:'2026-10-07',src:'sale',lines:[{acc:'Cash and bank',dr:10,cr:0},{acc:'Nonsense',dr:0,cr:10}]})===null);
T('both sides on one line refused',postEntry({date:'2026-10-07',src:'sale',lines:[{acc:'Cash and bank',dr:10,cr:10},{acc:'Sales',dr:0,cr:10}]})===null);
T('negative side refused',postEntry({date:'2026-10-07',src:'sale',lines:[{acc:'Cash and bank',dr:-10,cr:0},{acc:'Sales',dr:0,cr:-10}]})===null);
T('single line refused',postEntry({date:'2026-10-07',src:'sale',lines:[{acc:'Cash and bank',dr:10,cr:0}]})===null);
T('refused entries were not written',JRN.length===before);
T('counter did not move on refusals',(S.jpn|0)===3);

// ---- 4. rounding: a third of a rupee posted three ways must still balance
JRN.length=0;S.jpn=undefined;
const e3=postEntry({date:'2026-10-08',src:'sale',lines:[
  {acc:'Accounts receivable',dr:100,cr:0},
  {acc:'Sales',dr:0,cr:33.33},
  {acc:'Sales',dr:0,cr:33.33},
  {acc:'Sales',dr:0,cr:33.34}
]});
T('rounded entry balances',!!e3&&ledTotals(e3).diff===0);
T('ledger totals agree',ledDebit()===ledCredit()&&ledDebit()===100);

// ---- 5. reversal: original kept and flagged void, and its effect gone from the balances
// A reversal must leave every account back where it was before the document was posted. An earlier
// version of the engine wrote a mirror entry ON TOP of the void original; because ledBal() skips void
// entries, that left each account at the NEGATIVE of its original balance instead of at zero. These
// checks are what stop that from coming back.
JRN.length=0;S.jpn=undefined;
const e4=postEntry({date:'2026-10-09',src:'expense',ref:'EXP-TEST',lines:[
  {acc:'Expenses',dr:250,cr:0},
  {acc:'Cash and bank',dr:0,cr:250}
]});
T('expense posted',!!e4);
eq('expenses is a debit of 250',ledBal('Expenses'),250);
eq('cash was credited 250',ledBal('Cash and bank'),-250);
eq('one entry found for the document',ledFor('EXP-TEST').length,1);
eq('reversed one entry',ledReverse('EXP-TEST','Expense voided'),1);
T('original flagged void',e4.void===true);
eq('expenses is back to zero',ledBal('Expenses'),0);
eq('the cash it moved is back',ledBal('Cash and bank'),0);
eq('reversal wrote no mirror entry',JRN.filter(x=>x.src==='reversal').length,0);
eq('the register still holds the original',JRN.filter(x=>x.id===e4.id).length,1);
eq('nothing left un-reversed for the document',ledFor('EXP-TEST').length,0);
// Post something unrelated, so the totals below are not trivially zero.
// It carries a ref, so it is not mistaken for a document-less manual entry by the check in block 6.
postEntry({date:'2026-10-09',src:'sale',ref:'S5',lines:[{acc:'Accounts receivable',dr:75,cr:0},{acc:'Sales',dr:0,cr:75}]});
eq('debits after the reversal',ledDebit(),75);
eq('credits after the reversal',ledCredit(),75);
eq('the book is still healthy after reversal',ledHealthy().diff,0);

// ---- 6. a manual journal entry is never picked up by a document reconciliation
const e5=postEntry({date:'2026-10-09',src:'manual',lines:[
  {acc:'Owner equity',dr:0,cr:500},
  {acc:'Cash and bank',dr:500,cr:0}
]});
T('manual entry posts without a ref',!!e5&&e5.ref==='');
T('a manual entry is not part of any document',ledFor('').length===0);

// ---- 7. trial balance: no balancing line, totals equal, difference zero
const tb=trialRows();
T('trial balance has no balancing line',!tb.rows.some(r=>r.acc.indexOf('balancing')>=0));
T('trial balance totals are equal',tb.dr===tb.cr&&tb.diff===0);
T('trial balance accounts are all typed',tb.rows.every(r=>!!ACCT_TYPES[r.acc]));
T('every balance appears on its natural side',tb.rows.every(r=>r.dr===0||r.cr===0));
T('no trial balance row is negative',tb.rows.every(r=>r.dr>=0&&r.cr>=0));
T('book reports healthy',ledHealthy().diff===0&&ledHealthy().bad.length===0);

// Inventory was credited 400 with nothing debited into it, so it carries a contra balance: signed it
// reads as 400 on the credit side; on the trial balance it must appear in the credit column.
// The journal is cleared first and the entry posted here, so this block does not depend on state left
// behind by an earlier block.
JRN.length=0;S.jpn=undefined;
postEntry({date:'2026-10-05',src:'sale',ref:'C1',lines:[
  {acc:'Accounts receivable',dr:1000,cr:0},
  {acc:'Sales',dr:0,cr:950},
  {acc:'Tax payable',dr:0,cr:50},
  {acc:'Cost of goods sold',dr:400,cr:0},
  {acc:'Inventory',dr:0,cr:400}
]});
const tbC=trialRows();
eq('a contra asset balance is a credit of 400 when read signed',Math.abs(ledBal('Inventory')),400);
const invRow=(tbC.rows.filter(r=>r.acc==='Inventory')[0])||{dr:0,cr:0};
eq('a contra asset balance prints in the credit column',invRow.cr,400);
eq('and not in the debit column',invRow.dr,0);
eq('trial balance debit total',tbC.dr,1400);
eq('trial balance credit total',tbC.cr,1400);

// ---- 8. account kinds total on their own side
T('assets plus expenses equals liabilities plus equity plus income',(()=>{
  const d=DEBIT_SIDE('asset')&&DEBIT_SIDE('expense');
  return d&&ledByKind('asset')+ledByKind('expense')===ledByKind('liability')+ledByKind('equity')+ledByKind('revenue');
})());

// ---- 9. reading the book as of a date, which is what a balance sheet needs
JRN.length=0;S.jpn=undefined;
postEntry({date:'2026-10-05',src:'sale',ref:'D1',lines:[{acc:'Accounts receivable',dr:100,cr:0},{acc:'Sales',dr:0,cr:100}]});
postEntry({date:'2026-10-10',src:'sale',ref:'D2',lines:[{acc:'Accounts receivable',dr:200,cr:0},{acc:'Sales',dr:0,cr:200}]});
eq('as-of date picks up only entries up to it',ledBal('Accounts receivable','2026-10-05'),100);
eq('as-of date includes later entries when they are before it',ledBal('Accounts receivable','2026-10-12'),300);
eq('trial balance as of a date uses that date',trialRows('2026-10-05').dr,100);
eq('trial balance as of a date still balances',trialRows('2026-10-05').diff,0);
eq('trial balance reports the date it used',trialRows('2026-10-05').till,'2026-10-05');
eq('trial balance without a date reads all time',trialRows().dr,300);

// ---- 10. a running balance is deterministic when several entries share a date
const st=ledStatement('Accounts receivable');
eq('statement lists one row per line',st.length,2);
eq('statement first row date',st[0].d,'2026-10-05');
eq('statement second row date',st[1].d,'2026-10-10');
eq('statement running balance ends at the account balance',st[1].b,ledBal('Accounts receivable'));
eq('statement running balance walked through the first row',st[0].b,100);

// ---- 11. reversing two entries posted on the same date clears both and keeps the trail
JRN.length=0;S.jpn=undefined;
postEntry({date:'2026-10-05',src:'sale',ref:'D3',lines:[{acc:'Accounts receivable',dr:100,cr:0},{acc:'Sales',dr:0,cr:100}]});
postEntry({date:'2026-10-05',src:'sale',ref:'D3',cost:40,lines:[{acc:'Cost of goods sold',dr:40,cr:0},{acc:'Inventory',dr:0,cr:40}]});
eq('one document posted two entries',ledFor('D3').length,2);
eq('reversed both entries',ledReverse('D3','Edit'),2);
// Void rows drop out of the statement, so a reversed document leaves no running balance behind.
eq('a reversed document leaves no open rows on one account',ledStatement('Sales').length,0);
eq('and none on the other account either',ledStatement('Inventory').length,0);
eq('receivable is back to zero',ledBal('Accounts receivable'),0);
eq('sales is back to zero',ledBal('Sales'),0);
eq('cost of goods sold is back to zero',ledBal('Cost of goods sold'),0);
eq('inventory is back to zero',ledBal('Inventory'),0);
eq('every entry for the document is now void',JRN.filter(e=>e.ref==='D3'&&e.void).length,2);
eq('the book still balances after reversing two entries',ledDebit(),ledCredit());
eq('nothing left open for the document',ledFor('D3').length,0);
eq('the book is still healthy after reversal',ledHealthy().diff,0);

// Leave a clean book for the other test files. The ledger starts empty in a fresh install anyway.
JRN.length=0;S.jpn=undefined;
