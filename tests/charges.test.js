// Charge posting and expense recovery must not move stock or partially save a book.
const undo=bookUndo();try{
 USERS.length=0;S.user=null;S.quiet=true;loadDemo();USERS.length=0;S.user=null;SET.negStock='block';S.period='All time';
 const stock=JSON.stringify(PRD),beforeSales=ledBal('Sales');
 openScr('inv','sale');S.cust='Walk-in';S.items=[{charge:true,n:'Delivery',q:1,r:250,d:0,dt:'amt',tx:0,tt:'pct',s:0}];post();const no=S.lastNo;
 T('a charge-only invoice posts even when negative stock is blocked',!!INVD[no]);eq('charge-only invoice total',INVD[no].T.g,250);eq('charges never move stock',JSON.stringify(PRD),stock);eq('charges post as revenue',r2(ledBal('Sales')-beforeSales),250);
 newExp();Object.assign(S.ef,{amt:80,cat:'Transport',payee:'Courier',inv:no,billToInvoice:true});saveExp();const expense=EXP[0];
 eq('linked expense increases invoice total',INVD[no].T.g,330);eq('one charge per expense',INVD[no].items.filter(i=>i.expenseId===expense.id).length,1);
 editExpense(expense.id);S.ef.amt=90;S.ef.billToInvoice=true;saveExp();eq('editing billed expense updates rather than duplicates charge',INVD[no].T.g,340);eq('expense charge remains unique',INVD[no].items.filter(i=>i.expenseId===expense.id).length,1);
 editExpense(expense.id);S.ef.billToInvoice=false;saveExp();eq('declining recovery removes the prior billed charge',INVD[no].T.g,250);eq('expense remains recorded',EXP.find(e=>e.id===expense.id).amt,90);
 editExpense(expense.id);S.ef.billToInvoice=true;saveExp();const removed=removeRegisterRecords('ex',[expense.id],'delete');T('billed expense can be removed atomically',removed.ok);eq('removing an expense removes its billed charge',INVD[no].T.g,250);
 const count=EXP.length,cash=BAL.Cash;newExp();Object.assign(S.ef,{amt:10,payee:'Courier',inv:'MISSING',billToInvoice:true});saveExp();eq('missing invoice rolls expense back',EXP.length,count);eq('missing invoice rolls cash back',BAL.Cash,cash);T('charge and expense entries balance',ledHealthy().diff===0&&ledHealthy().bad.length===0);
 openScr('inv','pur');S.sup=SUPP[0];S.items=[{charge:true,n:'Handling',q:1,r:40,d:0,dt:'amt',tx:0,tt:'pct',s:0}];const invBalance=ledBal('Inventory'),exBalance=ledBal('Expenses');post();eq('purchase charges do not inflate inventory',ledBal('Inventory'),invBalance);eq('purchase charges go to expenses',r2(ledBal('Expenses')-exBalance),40);
}finally{undo()}
