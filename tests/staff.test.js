// staff.test.js - employees: what they are owed, what they owe back, and that the two agree with the book.
//
// The balances are derived from the records every time, so the real check is that DERIVED figures equal the
// LEDGER accounts. If somebody stores a balance twice, or a posting forgets a side, this is what fails.

JRN.length=0;S.jpn=1;EMP.length=0;SAL.length=0;STFP.length=0;EMPA.length=0;EXP.length=0;
signIn('Admin','1234');
const stCash=ledBal('Cash and bank'),stSal=ledBal('Salaries'),stBal=BAL.Cash;
eq('the staff accounts start empty',ledBal('Employee payable'),0);
eq('and so do the advances',ledBal('Advances to staff'),0);

// ---- an employee, and an advance ---------------------------------------------------------------
saveEmp(-1,{n:'Rafiq',code:'E-1',desig:'Driver',phone:'0300',join:tdy,basic:30000,recur:true,day:1,active:true});
eq('the employee is on the list',EMP.length,1);
eq('nothing is owed to somebody who has not worked yet',empBal('Rafiq'),0);
T('an advance is paid',payAdvance('Rafiq',10000,'Cash',2500));
eq('an advance is money they owe back',staffAdv('Rafiq'),10000);
eq('and it is an asset on the book, not a cost',ledBal('Advances to staff'),10000);
eq('the cash went out',ledBal('Cash and bank'),r2(stCash-10000));
eq('the recovery plan says how much comes back a month',recovDue('Rafiq',30000),2500);
eq('but a recovery never takes back more than is left',recovDue('Rafiq',1000),1000);

// ---- a salary run: the cost is earned here, the money may not have moved --------------------------
T('the salary run is accepted',postSalary(0,runTotals(30000,2000,2500)));
eq('the cost is salary plus bonus',ledBal('Salaries'),r2(stSal+32000));
eq('the advance came down by what was recovered',staffAdv('Rafiq'),7500);
eq('and so did the asset',ledBal('Advances to staff'),7500);
eq('the rest is owed to the employee',empBal('Rafiq'),29500);
eq('and that is the liability on the book',ledBal('Employee payable'),29500);

// ---- an expense the employee paid out of his own pocket ---------------------------------------------
newExp();S.ef.amt='1500';S.ef.payee='Diesel';S.ef.cat='Fuel';S.ef.paidBy='Rafiq';saveExp();
eq('the expense is in the list',EXP[0].paidBy,'Rafiq');
eq('it joins what the company owes him',empBal('Rafiq'),31000);
eq('the liability grew by it',ledBal('Employee payable'),31000);
eq('and no cash moved, because he paid',ledBal('Cash and bank'),r2(stCash-10000));
eq('the expense is still a cost',EXP[0].amt,1500);
voidExp(EXP[0]);
eq('voiding it takes the debt off him again',empBal('Rafiq'),29500);
eq('and off the book',ledBal('Employee payable'),29500);

// ---- paying him --------------------------------------------------------------------------------------
T('paying him is accepted',payStaff('Rafiq',20000,'Cash'));
eq('the cash went out',ledBal('Cash and bank'),r2(stCash-30000));
eq('and he is owed the rest',empBal('Rafiq'),9500);
eq('the account agrees with the person',ledBal('Employee payable'),empBal('Rafiq'));

// ---- recurring salaries are offered, never posted behind anybody's back --------------------------------
saveEmp(-1,{n:'Bilal',code:'E-2',desig:'Loader',basic:20000,recur:true,day:1,active:true});
eq('only the employee whose salary has not been run is due',salaryDue(monthOf(tdy)).length,1);
eq('and it is him',salaryDue(monthOf(tdy))[0].n,'Bilal');
accrueSalaries();
eq('after the run nothing is due',salaryDue(monthOf(tdy)).length,0);
eq('and his salary is on the book',ledBal('Salaries'),r2(stSal+32000+20000));
eq('Bilal has no advance to recover',staffAdv('Bilal'),0);
eq('and he is owed his salary',empBal('Bilal'),20000);
eq('running it a second time is not possible',(accrueSalaries(),ledBal('Salaries')),r2(stSal+52000));
eq('so the run cannot be paid twice either',empBal('Bilal'),20000);
T('an employee who has left is not due',(EMP[1].active=false,!salaryDue('2099-01').some(e=>e.n==='Bilal')));
eq('and the app cash account moved by the same money, not just the book',BAL.Cash,r2(stBal-30000));

// ---- the whole point: every person's balance adds up to the account ------------------------------------
const owed=EMP.reduce((a,e)=>a+empBal(e.n),0),out=EMP.reduce((a,e)=>a+staffAdv(e.n),0);
eq('what the company owes staff equals the employee payable account',r2(owed),ledBal('Employee payable'));
eq('and what staff owe back equals the advances account',r2(out),ledBal('Advances to staff'));
T('the book still balances with staff money in it',ledHealthy().diff===0);

// ---- the screens ---------------------------------------------------------------------------------------
S.screen='stf';chk('the employees list',stfScr());
S.screen='stfp';S.stfk=0;chk('an employee page',stfPageScr());
S.skk=SAL[0];chk('the salary slip',skdScr());
T('the slip is a document with a net pay on it',skdScr().includes('Net pay')&&skdScr().includes('Salary Slip'));
T('the balance sheet carries the staff accounts',trialRows().rows.some(r=>r.acc==='Employee payable')&&trialRows().rows.some(r=>r.acc==='Advances to staff'));
T('salaries are their own line on the profit and loss',pl().includes('Salaries'));
