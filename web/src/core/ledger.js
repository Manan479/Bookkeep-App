// core/ledger.js - The double-entry book. Every posted document writes one balanced entry here.
// No screen code. Reports read balances from this file instead of adding up records.
//
// An entry is {id,date,narr,lines:[{acc,dr,cr}],void,of,src,ref,cost}.
// Lines carry a debit or a credit, never both, and always non-negative or zero.
// Signs live in the account type, not in the numbers: see ledBal().

// Which side each account sits on. Names come from COA in data/seed.js, with one addition:
// 'Stock adjustments' absorbs damage, loss and stock found, so a shortage is visible on its own line in
// the profit and loss instead of being hidden inside general expenses.
const ACCT_TYPES={
  'Cash and bank':'asset',
  'Accounts receivable':'asset',
  'Inventory':'asset',
  'Advances paid to suppliers':'asset',
  'Accounts payable':'liability',
  'Advances from customers':'liability',
  'Tax payable':'liability',
  'Owner equity':'equity',
  'Sales':'revenue',
  'Cost of goods sold':'expense',
  'Expenses':'expense',
  'Stock adjustments':'expense',
  'Salaries':'expense',
  'Employee payable':'liability',
  'Advances to staff':'asset'
};

// A debit increases assets and expenses; a credit increases the other three.
const DEBIT_SIDE=k=>k==='asset'||k==='expense';
const acctKind=a=>ACCT_TYPES[a];
// Every account of one kind, in the order they were added: what the invoice offers as income accounts.
const ledAccts=k=>Object.keys(ACCT_TYPES).filter(a=>ACCT_TYPES[a]===k);
const isAcct=a=>Object.prototype.hasOwnProperty.call(ACCT_TYPES,a);

// Everything is rounded to 2 decimals before it is added up, so 0.1+0.2 never fails a balance check.
const r2=n=>Math.round((Number(n)||0)*100)/100;
const r3=n=>Math.round((Number(n)||0)*1000)/1000;

// Debit and credit totals for one entry or for any object shaped like one.
function ledTotals(e){
  const ls=(e&&e.lines)||[];
  let dr=0,cr=0;
  for(const l of ls){dr+=Number(l.dr)||0;cr+=Number(l.cr)||0}
  return{dr:r2(dr),cr:r2(cr),diff:r2(dr-cr)};
}

// Builds one line from "how far this account moves, in the direction of its own side".
// A positive amount increases the account (a debit for an asset, a credit for a liability);
// a negative amount decreases it and switches to the other column. Returns null for zero or for an
// unknown account, so callers can list their lines and drop the blanks.
// This is what lets a payment write the same signed number for cash and for an advance, even when
// the advance goes the other way (see F3 in docs/LEDGER_PLAN.md).
function ledSide(acc,amt){
  const a=r2(amt);
  if(a===0||!isAcct(acc))return null;
  const debit=DEBIT_SIDE(acctKind(acc))?a>0:a<0;
  return debit?{acc:acc,dr:Math.abs(a),cr:0}:{acc:acc,dr:0,cr:Math.abs(a)};
}

// Drops the null lines ledSide() returns for zero amounts, for zero lines, or for a blank account.
const ledLines=ls=>ls.filter(l=>!!l);

// Writes one entry into JRN. Returns the entry, or null if it was rejected.
// A rejected entry is never written: an unbalanced book is worse than a missing entry.
function postEntry(e){
  const reject=()=>{if(typeof bookTransactionActive!=='undefined'&&bookTransactionActive)throw new Error('The ledger entry was refused.');return null};
  if(!e||!Array.isArray(e.lines))return reject();
  const lines=[];
  for(const l of (e.lines||[])){
    if(!l)continue;                        // a blank line from ledLines(): drop it, never throw
    if(!Number.isFinite(Number(l.dr||0))||!Number.isFinite(Number(l.cr||0)))return reject();
    const dr=r2(l.dr),cr=r2(l.cr);
    if(dr===0&&cr===0)continue;            // blank line: drop it rather than book a zero
    if(dr<0||cr<0)return reject();             // a negative side is a sign error, not a credit
    if(dr>0&&cr>0)return reject();             // a line is one side or the other, never both
    if(!isAcct(l.acc))return reject();         // unknown account: fail loudly at the source
    lines.push({acc:l.acc,dr:dr,cr:cr});
  }
  if(lines.length<2)return reject();
  const t=ledTotals({lines:lines});
  if(t.dr<=0||t.diff!==0)return reject();
  // Its own counter, never the manual one, and persisted with the rest of S so a reload cannot
  // reissue a number. pad4() needs an integer, so this is floored rather than passed as a float.
  const n=Math.floor((Number(S.jpn)||1));
  const rec={
    id:num('jv',n),date:e.date||tdy,narr:e.narr||'',lines:lines,void:false,of:'',
    src:e.src||'manual',ref:e.ref||'',cost:r2(e.cost||0),
    // Who posted it. Every entry in the book comes through here, so this is the one place the author has to
    // be written. The NAME is kept as well as the id on purpose: the id still points at the user after a
    // rename, the name still reads correctly after the user is deleted.
    by:S.user?S.user.n:'',byId:S.user?S.user.id:''
  };
  S.jpn=n+1;
  // noSave lets a multi-entry operation (a reversal) write all of its entries and save once at the
  // end, instead of persisting a half-finished book between them.
  JRN.push(rec);
  if(!e.noSave)save();
  return rec;
}

// Debit-positive balance of one account. Read this: an asset shows as a positive number here,
// and a liability or income account also shows as positive, because each is read on its own side.
function ledBal(a,till){
  let dr=0,cr=0;
  for(const e of JRN){
    if(!ledCounted(e))continue;
    if(till&&e.date>till)continue;
    for(const l of (e.lines||[])){
      if(l.acc!==a)continue;
      dr+=Number(l.dr)||0;cr+=Number(l.cr)||0;
    }
  }
  const k=acctKind(a);
  if(k===undefined)return 0;
  return r2(DEBIT_SIDE(k)?dr-cr:cr-dr);
}

// Every account's balance on its own side, plus how many accounts are non-zero.
function ledBalances(till){
  const o={};
  for(const a in ACCT_TYPES)o[a]=ledBal(a,till);
  return o;
}

// Totals per account kind, for the profit and loss and the balance sheet.
// Amounts are always on the account's own side, so no sign juggling is needed to total them.
function ledByKind(kind,till){
  let v=0;
  for(const a in ACCT_TYPES)if(ACCT_TYPES[a]===kind)v+=ledBal(a,till);
  return r2(v);
}

// True when an entry falls inside a range. Both ends are inclusive; either end may be left out to
// mean "from the beginning" or "up to now".
const ledInWin=(e,from,to)=>(!from||e.date>=from)&&(!to||e.date<=to);

// Debit-positive balance of one account over a window of dates. A profit and loss covers a stretch of
// time rather than a point in it, so it cannot use ledBal()'s single as-of date. Same sign convention
// as ledBal(): the account's own side reads positive.
function ledBalWin(a,from,to){
  let dr=0,cr=0;
  for(const e of JRN){
    if(!ledCounted(e)||!ledInWin(e,from,to))continue;
    for(const l of (e.lines||[])){
      if(l.acc!==a)continue;
      dr+=Number(l.dr)||0;cr+=Number(l.cr)||0;
    }
  }
  const k=acctKind(a);
  if(k===undefined)return 0;
  return r2(DEBIT_SIDE(k)?dr-cr:cr-dr);
}

// The same total per account kind, over a range of dates.
function ledKindWin(kind,from,to){
  let v=0;
  for(const a in ACCT_TYPES)if(ACCT_TYPES[a]===kind)v+=ledBalWin(a,from,to);
  return r2(v);
}

// What one kind of document posted over a window, taken from its debit side. Used where the question
// is "how much did we buy", which the balance of an account cannot answer on its own.
function ledSrcWin(src,from,to){
  let v=0;
  for(const e of JRN){
    if(!ledCounted(e)||e.src!==src||!ledInWin(e,from,to))continue;
    v+=ledTotals(e).dr;
  }
  return r2(v);
}

// What moved in and out of Cash and bank over a window, split by the kind of document that moved it.
// `net` is the change in cash, and the bySrc figures always add up to it, because every line counted
// here is a movement of the same account. A transfer between two of our own accounts is deliberately
// not in here: it changes no total the book keeps. See the note at the end of core/posting.js.
function ledCashFlow(from,to){
  const bySrc={};
  let net=0;
  for(const e of JRN){
    if(!ledCounted(e)||!ledInWin(e,from,to))continue;
    let v=0;
    for(const l of (e.lines||[]))if(l.acc==='Cash and bank')v+=(Number(l.dr)||0)-(Number(l.cr)||0);
    if(v===0)continue;
    net+=v;
    const k=e.src||'manual';
    bySrc[k]=r2((bySrc[k]||0)+v);
  }
  return{bySrc:bySrc,net:r2(net)};
}

// A day-by-day running balance for one account, oldest first.
// A document can post several entries on one date, so rows are tie-broken by position rather than
// left to the sort's discretion: a running balance must not depend on the engine's sort stability.
function ledStatement(a,till){
  const rows=[];
  let run=0,seq=0;
  const side=DEBIT_SIDE(acctKind(a))?1:-1;
  for(const e of JRN){
    if(!ledCounted(e))continue;
    if(till&&e.date>till)continue;
    for(const l of (e.lines||[])){
      if(l.acc!==a)continue;
      run+=(Number(l.dr)||0)-(Number(l.cr)||0);
      rows.push({d:e.date,id:e.id,narr:e.narr,src:e.src,ref:e.ref,dr:l.dr,cr:l.cr,b:r2(run*side),n:seq++});
    }
  }
  rows.sort((x,y)=>x.d<y.d?-1:x.d>y.d?1:x.n-y.n);
  return rows;
}

// Entries belonging to one source document, used when a document is edited or reversed.
// A reversal is not "open postings for the document": once a document has been reversed, ledFor must
// come back empty, or an edit would reverse the reversal and double the effect.
const ledFor=ref=>JRN.filter(e=>!e.void&&e.ref===ref&&e.src!=='manual'&&e.src!=='reversal');

// True when an entry is part of the book's arithmetic.
// Reversed entries are flagged void and drop out. Entries with src 'reversal' also drop out: an early
// version of ledReverse() wrote a mirror entry ON TOP of the void original, which cancelled nothing.
// Books already saved on this device can still hold those mirrors, and leaving them in the arithmetic
// would invert the balances they were meant to undo. New reversals write no mirror at all.
const ledCounted=e=>!e.void&&e.src!=='reversal';

// Reverses every posting for a document by flagging the entries void. The entries are kept, so the
// register still shows what was posted and the trail survives; the book simply stops counting them.
// Returns the number of entries reversed.
//
// There is deliberately NO mirror entry. A mirror on top of a voided original is counted once too
// often, in the wrong direction: ledBal() skips void entries, so the mirror alone would leave every
// account at the NEGATIVE of what the document did, instead of at what it was before. Voiding the
// original removes its effect exactly, and the void flag is what remains as the record of the reversal.
function ledReverse(ref,narr){
  const ls=ledFor(ref);
  if(!ls.length)return 0;
  for(const e of ls){e.void=true;e.voidBy=S.user?S.user.n:'';if(narr)e.narr=e.narr?narr+' · '+e.narr:narr}
  save();
  return ls.length;
}

// Reverses ONE entry, found by its id. A manual journal entry has no document ref to group by, so the
// id is all it has. Returns the entry that was voided, or null when there was nothing to reverse.
function ledReverseEntry(id,narr){
  const e=JRN.find(x=>x.id===id&&!x.void);
  if(!e)return null;
  e.void=true;e.voidBy=S.user?S.user.n:'';
  if(narr)e.narr=e.narr?narr+' · '+e.narr:narr;
  save();
  return e;
}

// True when nothing is out of balance anywhere. Reports and tests both lean on this.
function ledHealthy(){
  const bad=[];
  for(const e of JRN){
    if(!ledCounted(e))continue;
    const t=ledTotals(e);
    if(t.diff!==0)bad.push(e.id);
  }
  return{diff:r3(ledDebit()-ledCredit()),bad:bad};
}
const ledDebit=()=>r2(JRN.filter(ledCounted).reduce((a,e)=>a+e.lines.reduce((x,l)=>x+(Number(l.dr)||0),0),0));
const ledCredit=()=>r2(JRN.filter(ledCounted).reduce((a,e)=>a+e.lines.reduce((x,l)=>x+(Number(l.cr)||0),0),0));

// One account's own page: every line that touched it, oldest first, with the balance after each line.
// The balance is signed to the account's natural side, exactly as ledBal() reads it, so a liability reads
// positive when it is owed. Entries are ordered by DATE, not by when they were typed, so a back-dated
// document lands where it belongs and the running balance is the one the book itself would show.
function ledHistory(acc,from,to){
  const nat=DEBIT_SIDE(ACCT_TYPES[acc])?1:-1,raw=[];let seq=0;
  for(const e of JRN){
    if(!ledCounted(e)||!ledInWin(e,from,to))continue;
    for(const l of e.lines){
      if(l.acc!==acc)continue;
      raw.push({d:e.date,k:seq++,date:e.date,id:e.id,src:e.src,ref:e.ref,narr:e.narr,by:e.by||'',voidBy:e.voidBy||'',dr:Number(l.dr)||0,cr:Number(l.cr)||0});
    }
  }
  raw.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:a.k-b.k);
  let bal=0;
  return raw.map(l=>{bal=r2(bal+(l.dr-l.cr)*nat);return{date:l.date,id:l.id,src:l.src,ref:l.ref,narr:l.narr,by:l.by,voidBy:l.voidBy,dr:l.dr,cr:l.cr,bal:bal}});
}

// The trial balance: one line per account that has moved, each shown on its natural side.
// There is deliberately no balancing line here. If the totals disagree, the book is wrong.
// Pass a date to read the book as of that date, which is what a balance sheet needs. Omit it for all time.
function trialRows(till){
  const rows=[];
  for(const a in ACCT_TYPES){
    const net=ledBal(a,till);
    if(net===0)continue;
    const natural=DEBIT_SIDE(ACCT_TYPES[a]);
    // A balance on the wrong side of its account goes in the opposite column. An asset showing a
    // credit balance must print as a credit, never as a negative debit. So: a natural-debit account
    // sits in the debit column unless its balance has gone negative, and vice versa.
    const debit=natural?net>0:net<0;
    const amt=Math.abs(net);
    rows.push({acc:a,kind:ACCT_TYPES[a],dr:debit?amt:0,cr:debit?0:amt});
  }
  const dr=r2(rows.reduce((x,r)=>x+r.dr,0)),cr=r2(rows.reduce((x,r)=>x+r.cr,0));
  return{rows:rows,dr:dr,cr:cr,diff:r2(dr-cr),till:till||''};
}
