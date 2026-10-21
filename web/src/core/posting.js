// core/posting.js - Turns one posted document into one balanced ledger entry. No screen code.
//
// Invoice and payment actions run inside bookTransaction: records and ledger entries commit together.
// Other feature callers still own their persistence. Amounts use the document's rounding rules.
//
// One document, one entry: the ref groups every line the document posted, and ledReverse(ref) undoes
// the whole thing when the document is edited or voided.
//
// The shape of each entry, and why, is in docs/LEDGER_PLAN.md.
//
// What each function returns matters to its caller:
//   null  - there was nothing to book. Normal: a zero-amount document, or a payment that only moved
//           an advance against itself. Nothing is wrong.
//   false - the entry was refused. The book would not have balanced, so the record and the ledger have
//           drifted and the caller must say so rather than hide it.
//   entry - it was posted.

// postEntry() answers null to both "nothing to book" and "refused". This is the one place that tells
// them apart, so no feature file has to guess.
function ledCommit(o,ls){
  const lines=ledLines(ls);
  if(lines.length<2)return null;
  const e=postEntry({date:o.date,narr:o.narr,src:o.src,ref:o.ref,cost:o.cost,lines:lines});
  return e||false;
}

// ---- sales and distributor invoices -----------------------------------------------------------------
// F1: the invoice total is rounded but its line parts are not. The tax credit is whatever is left
// after the unrounded line arithmetic, so the debit and the credits always agree.
// F2: the cost of the units that left stock is passed in, so it is the exact number the layer walk
// consumed rather than a second guess at it.
function postSaleLedger(o){
  const tot=r2(o.total),sub=r2(o.sub),tax=r2(tot-sub),cost=r2(o.cost),src=o.src||'sale';
  // Which income account it belongs to: a sale of goods and a sale of services can be told apart, and the
  // profit and loss already groups every account of kind 'revenue', so a new one appears on its own there.
  const ls=[ledSide('Accounts receivable',tot),ledSide(o.acct||'Sales',sub),ledSide('Tax payable',tax)];
  // Removing stock is a second pair of lines on the same entry: it never touches the customer.
  if(cost!==0){ls.push(ledSide('Cost of goods sold',cost));ls.push(ledSide('Inventory',-cost))}
  return ledCommit({date:o.date,src:src,ref:o.ref,cost:Math.abs(cost),
    narr:o.narr||((src==='dist'?'Distributor invoice ':'Sale ')+o.ref)},ls);
}

// ---- purchases --------------------------------------------------------------------------------------
// Inventory is carried at tax-inclusive cost, matching the app's own average-cost figure.
function postPurchaseLedger(o){
  const tot=r2(o.total);
  return ledCommit({date:o.date,src:'purchase',ref:o.ref,narr:o.narr||('Purchase '+o.ref)},
    [ledSide('Inventory',r2(tot-(o.charges||0))),ledSide('Expenses',r2(o.charges||0)),ledSide('Accounts payable',tot)]);
}

// ---- money in and money out -------------------------------------------------------------------------
// F3: the advance kept is amt - applied, so cash and the advance move by the same number. Passing that
// one signed figure to ledSide() also covers the case where an existing advance is spent instead of
// kept: then it is negative and lands on the other side of the advance account by itself.
function postPmLedger(o){
  const amt=r2(o.amt),ap=r2(o.applied),adv=r2(amt-ap),inn=o.dir==='in';
  const ls=[ledSide('Cash and bank',inn?amt:-amt)];
  if(inn){
    ls.push(ledSide('Accounts receivable',-ap));
    ls.push(ledSide('Advances from customers',adv));
  }else{
    ls.push(ledSide('Accounts payable',-ap));
    ls.push(ledSide('Advances paid to suppliers',adv));
  }
  return ledCommit({date:o.date,src:inn?'receipt':'payment',ref:o.ref,
    narr:o.narr||((inn?'Receipt ':'Payment ')+o.ref)},ls);
}

// Paying a bill that is already on the payables list. When the bill came from an expense the cost was
// recognised then, so this only clears the payable; otherwise it is a cost being paid now.
function postBillPayLedger(o){
  const a=r2(o.amount);
  const acc=o.payable?'Accounts payable':'Expenses';
  return ledCommit({date:o.date,src:'payment',ref:o.ref,narr:o.narr||('Payment '+o.ref)},
    [ledSide(acc,o.payable?-a:a),ledSide('Cash and bank',-a)]);
}

// ---- staff ------------------------------------------------------------------------------------------
// A salary run posts the COST when the work is earned, not when the money leaves: not every employee is
// paid the same day the month ends. What is recovered from an advance is not a cost now - it was paid out
// earlier and sat as an asset - so it comes off Advances to staff instead of being paid out again.
function postSalaryLedger(o){
  const t=runTotals(o.basic,o.bonus,o.recov),ls=[ledSide('Salaries',t.gross),ledSide('Employee payable',t.net)];
  if(t.recov!==0)ls.push(ledSide('Advances to staff',-t.recov));
  return ledCommit({date:o.date,src:'salary',ref:o.ref,narr:o.narr||('Salary · '+o.emp)},ls);
}
// Paying an employee what they are owed: the liability comes down and so does the money.
// The money side is always the LEDGER account 'Cash and bank': every cash and bank account rolls up into
// that one line, so which app account it left is a fact for the cash screens, not for the book.
function postStaffPayLedger(o){
  const a=r2(o.amt);
  return ledCommit({date:o.date,src:'staffpay',ref:o.ref,narr:o.narr||('Paid · '+o.emp)},
    [ledSide('Employee payable',-a),ledSide('Cash and bank',-a)]);
}
// An advance is money they now owe back, not a cost. It becomes a cost only as it is earned.
function postAdvanceLedger(o){
  const a=r2(o.amt);
  return ledCommit({date:o.date,src:'advance',ref:o.ref,narr:o.narr||('Advance · '+o.emp)},
    [ledSide('Advances to staff',a),ledSide('Cash and bank',-a)]);
}

// ---- expenses ---------------------------------------------------------------------------------------
// An expense the COMPANY paid is a cost and less cash; Pay later is a cost and a payable. An expense an
// EMPLOYEE paid out of their own pocket is a cost and money owed to that employee, which settles with the
// next salary - so it lands on the employee payable, not on a supplier.
function postExpenseLedger(o){
  const amt=r2(o.amt),other=o.byStaff?ledSide('Employee payable',amt):(o.payLater?ledSide('Accounts payable',amt):ledSide('Cash and bank',-amt));
  return ledCommit({date:o.date,src:'expense',ref:o.ref,narr:o.narr||('Expense '+o.ref)},
    [ledSide('Expenses',amt),other]);
}

// ---- returns ----------------------------------------------------------------------------------------
// A sale return takes income and tax back off and puts the goods back into stock at what they cost.
// A purchase return takes the goods back out of stock and lowers what is owed, and the goods leave at
// the same figure the return is worth, because purchases are carried at cost.
// `applied` and `extra` are the split the return already made: what came off the account, and what was
// refunded or kept as an advance.
function postReturnLedger(o){
  const A=r2(o.amt),applied=r2(o.applied),extra=r2(o.extra),cost=r2(o.cost),ls=[];
  if(o.type==='pur'){
    ls.push(ledSide('Accounts payable',-applied));
    ls.push(ledSide('Inventory',-A));
    if(extra>0)ls.push(o.settle==='refund'?ledSide('Cash and bank',extra):ledSide('Advances paid to suppliers',extra));
  }else{
    ls.push(ledSide(o.incomeAcct||'Sales',-r2(o.net)));
    if(r2(o.tax)!==0)ls.push(ledSide('Tax payable',-r2(o.tax)));
    if(applied!==0)ls.push(ledSide('Accounts receivable',-applied));
    if(extra>0)ls.push(o.settle==='refund'?ledSide('Cash and bank',-extra):ledSide('Advances from customers',extra));
    if(cost!==0){ls.push(ledSide('Inventory',cost));ls.push(ledSide('Cost of goods sold',-cost))}
  }
  return ledCommit({date:o.date,src:'return',ref:o.ref,cost:Math.abs(cost),
    narr:o.narr||('Return '+o.ref)},ls);
}

// ---- stock adjustments ------------------------------------------------------------------------------
// Goods that move with no invoice behind them: damage, loss, stock found, a count correction. `value` is
// positive when goods joined the shelf and negative when they left it. The figure comes from
// stockInVal()/stockOutVal(), which value the movement the same way the stock report does, so Inventory
// and the stock report cannot drift apart.
// A shortage lands on 'Stock adjustments' as an expense; stock a new product starts with lands on
// 'Owner equity', because it is goods the owner brought in.
function postStockLedger(o){
  const v=r2(o.value);
  if(v===0)return null;
  const acc=o.acc||'Stock adjustments';
  // Inventory takes the movement. The counter-account takes the other side of it, whatever kind of
  // account it is: a shortage debits it and stock found credits it. That is NOT ledSide()'s "increase on
  // the natural side" rule - which would put stock found against Owner equity on the wrong side and make
  // the entry unbalanced and therefore refused - so the line is built as the mirror of the Inventory one.
  const inv=ledSide('Inventory',v);
  const other={acc:acc,dr:inv.cr,cr:inv.dr};
  return ledCommit({date:o.date||tdy,src:'stock',ref:o.ref,narr:o.narr||'Stock adjustment'},[inv,other]);
}

// ---- opening balances -------------------------------------------------------------------------------
// Money that starts in an account came from somewhere, and until the owner says otherwise it is owed
// back to them. So an opening balance is cash in and equity up, which is what makes the first trial
// balance of a fresh set of books stand up on its own.
function postOpeningLedger(o){
  const a=r2(o.amount);
  if(a===0)return null;
  return ledCommit({date:o.date||tdy,src:'opening',ref:o.ref||('OPEN-'+o.acct),
    narr:o.narr||('Opening balance '+o.acct)},
    [ledSide('Cash and bank',a),ledSide('Owner equity',a)]);
}

// ---- an internal transfer is deliberately NOT posted ------------------------------------------------
// Every cash and bank account in the app rolls up into the single ledger account 'Cash and bank', so
// moving money from Cash to Meezan Bank changes no total the book keeps. Posting it would need one
// ledger account per bank account; until the chart of accounts is that fine-grained, leaving it out is
// what keeps the ledger cash equal to the sum of the app's account balances.
