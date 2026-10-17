// core/staff.js - what an employee is owed, what they owe, and what a salary run works out to. No screen code.
//
// Two balances per person, and they are different things:
//   empBal() - what the company owes them: salary and bonus earned, plus anything they paid for the company
//              out of their own pocket, less what has already been paid to them.
//   staffAdv() - what they owe the company: advances paid out, less what salary runs have recovered.
// Neither is stored. Both are worked out from the records every time, so the employee page, the Employees
// list and the ledger account cannot drift apart.
const pad4n=n=>String(n).padStart(4,'0');
const empByName=n=>EMP.find(e=>e.n===n);
const activeEmp=()=>EMP.filter(e=>e.active!==false);
const empBal=n=>r2(SAL.filter(x=>x.emp===n).reduce((a,x)=>a+r2(x.net),0)
  +EXP.filter(e=>e.paidBy===n&&!e.void).reduce((a,e)=>a+r2(e.amt),0)
  -STFP.filter(p=>p.emp===n).reduce((a,p)=>a+r2(p.amt),0));
const staffAdv=n=>r2(EMPA.filter(a=>a.emp===n).reduce((a,x)=>a+r2(x.amt),0)
  -SAL.filter(x=>x.emp===n).reduce((a,x)=>a+r2(x.recov),0));
// What a salary run would recover this month: the plan on their advances, capped at what is still owed and
// at the salary itself, so a recovery can never turn a payslip negative or take back more than was lent.
const recovDue=(n,netBasic)=>Math.max(0,r2(Math.min(EMPA.filter(a=>a.emp===n).reduce((a,x)=>a+r2(x.per),0),staffAdv(n),r2(netBasic))));
// A salary run's own arithmetic, in one place: what is earned, what is taken back, what is left to pay.
const runTotals=(basic,bonus,recov)=>{const b=r2(basic),o=r2(bonus),r=r2(recov);return{basic:b,bonus:o,recov:r,gross:r2(b+o),net:r2(b+o-r)}};
// Salaries that recur and have not been run for the month given ('YYYY-MM'). Returns the employees, so the
// caller can show what is due and let a person decide - nothing is accrued behind their back.
const salaryDue=m=>activeEmp().filter(e=>e.recur&&e.basic>0&&!SAL.some(x=>x.emp===e.n&&(x.date||'').slice(0,7)===m));
const monthOf=d=>(d||tdy).slice(0,7);
