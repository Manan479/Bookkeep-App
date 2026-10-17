// core/payments.js - Payables, open items, advances and distributor books. No screen code.
const payTotal=()=>PAYB.reduce((a,x)=>a+x[3],0);
const payOver=()=>PAYB.filter(x=>x[4]<tdy).reduce((a,x)=>a+x[3],0);
const pst=x=>x[4]<tdy?'Overdue':x[5]?'Partial':'Unpaid';
const distOwed=()=>DIST.reduce((a,d)=>a+d.owed,0);
const books=()=>{const it=S.items||[],owed=it.reduce((a,i)=>a+i.q*drate(i),0),cogs=it.reduce((a,i)=>a+i.q*ccost(i),0);return{owed,cogs,profit:owed-cogs}};
const openItems=()=>{const m=S.pm;if(m.role==='c')return INV.filter(x=>x[1]===m.party&&x[4]!=='Draft'&&x[4]!=='Void'&&x[3]-(PAID[x[0]]||0)>0).map(x=>({key:x[0],date:x[5],rem:x[3]-(PAID[x[0]]||0)}));if(m.role==='s')return PAYB.filter(x=>x[0]==='Suppliers'&&x[1]===m.party).map(x=>({key:x[2],date:'Due '+fmtS(x[4]),rem:x[3]}));return[]};
const advBal=()=>ADV[S.pm.role+':'+S.pm.party]||0;
const availAmt=()=>(+S.pm.amt||0)+(S.pm.useAdv?advBal():0);
const allocSum=()=>Object.values(S.pm.alloc).reduce((a,x)=>a+x,0);
const owedD=()=>(DIST.find(x=>x.n===S.pm.party)||{owed:0}).owed;
