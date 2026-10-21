// core/payments.js - Payables, open items, advances and distributor books. No screen code.
const payTotal=()=>PAYB.reduce((a,x)=>a+x[3],0);
const payOver=()=>PAYB.filter(x=>x[4]<tdy).reduce((a,x)=>a+x[3],0);
const pst=x=>x[4]<tdy?'Overdue':x[5]?'Partial':'Unpaid';
const distOwed=()=>DIST.reduce((a,d)=>a+d.owed,0);
const books=()=>{const it=S.items||[],owed=it.reduce((a,i)=>a+(i.charge?lineCost(i):i.q*drate(i)),0),cogs=it.reduce((a,i)=>a+(i.charge?0:i.q*ccost(i)),0);return{owed,cogs,profit:owed-cogs}};
// Editing shows the balances as if the original payment had not yet been posted.
const originalPayment=()=>{const m=S.pm||{};return m.editId?PAYM.find(p=>p.id===m.editId&&!p.void):null};
const originalPartyPayment=()=>{const p=originalPayment(),m=S.pm;return p&&p.party===m.party&&p.role===m.role?p:null};
const openItems=()=>{const m=S.pm,old=originalPartyPayment(),alloc=old?old.alloc||{}:{};
 if(m.role==='c')return INV.filter(x=>x[1]===m.party&&x[4]!=='Draft'&&x[4]!=='Void').map(x=>({key:x[0],date:x[5],rem:r2(x[3]-(PAID[x[0]]||0)+(alloc[x[0]]||0))})).filter(x=>x.rem>0);
 if(m.role==='s'||m.role==='x'){const rows=PAYB.filter(x=>(m.role==='s'?x[0]==='Suppliers':x[0]!=='Suppliers')&&x[1]===m.party).map(x=>({key:x[2],date:'Due '+fmtS(x[4]),rem:x[3]}));for(const [key,amt]of Object.entries(alloc)){const row=rows.find(x=>x.key===key);if(row)row.rem=r2(row.rem+amt);else rows.push({key,date:'Previously paid',rem:amt})}return rows}return[]};
const advBal=()=>{const old=originalPartyPayment();return Math.max(0,r2((ADV[S.pm.role+':'+S.pm.party]||0)+(old?(old.used||0)-(old.adv||0):0)))};
const availAmt=()=>(+S.pm.amt||0)+(S.pm.useAdv?advBal():0);
const allocSum=()=>Object.values(S.pm.alloc).reduce((a,x)=>a+x,0);
const owedD=()=>{const old=originalPartyPayment();return (DIST.find(x=>x.n===S.pm.party)||{owed:0}).owed+(old?(old.alloc||{})['Distributor balance']||0:0)};
