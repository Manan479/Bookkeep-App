// core/invoice-math.js - Line discount, tax and totals, numbering, snapshots, customer balance. No screen code.
const ld=i=>i.dt==='pct'?i.q*i.r*i.d/100:(+i.d||0);
const lt=i=>{const b=i.q*i.r-ld(i);return i.tt==='amt'?(+i.tx||0):b*(+i.tx||0)/100};
const totals=()=>{const it=S.items||[],sub=it.reduce((a,i)=>a+i.q*i.r,0),dis=it.reduce((a,i)=>a+ld(i),0),tax=it.reduce((a,i)=>a+lt(i),0);return{sub,dis,tax,g:sub-dis+tax}};
const invNo=()=>S.invNoOv||(S.itype==='pur'?num('pur',S.pn):S.itype==='dist'?num('dist',S.n):S.itype==='qt'?num('qt',S.qn):num('inv',S.n));
const pno=()=>S.posted?S.lastNo:invNo();
const defTax=()=>SET.taxOn?((SET.taxRates.find(r=>r.def)||{p:0}).p):0;
function snap(status,owed){return{type:S.itype,party:S.itype==='pur'?S.sup:S.itype==='dist'?S.dcust:S.cust,dsel:S.dsel,under:S.under,items:JSON.parse(JSON.stringify(S.items)),T:totals(),date:S.d.inv,due:S.d.due,noDue:S.noDue,status,owed:owed||0,acct:S.sacct||'',from:S.fromQ||'',ret:{},showBal:S.showBal===undefined?TPL.bal:S.showBal}}
const lineUnit=(d,i)=>d.type==='dist'?drate(i):(i.q*i.r-ld(i)+lt(i))/i.q;
const balSnap=()=>{if(S.itype!=='sale'||!S.cust||S.cust==='Walk-in')return null;const pv=prevBalCust();return{prev:pv,total:pv+totals().g}};
const balFor=T=>{const pk=S.posted&&INVD[S.lastNo]?INVD[S.lastNo]:null,show=pk?pk.showBal:(S.showBal===undefined?TPL.bal:S.showBal);let bal=null;if(show&&S.itype==='sale'&&S.cust&&S.cust!=='Walk-in'){bal=pk&&pk.bal?pk.bal:(()=>{const pv=prevBalCust();return{prev:pv,total:pv+T.g}})()}return{showBal:show,bal}};
const prevBalCust=()=>{let pv=pbals({n:S.cust,c:true,s:false,d:false}).c;if(S.editNo&&S.itype==='sale'){const r=INV.find(x=>x[0]===S.editNo&&x[4]!=='Draft'&&x[4]!=='Void');if(r)pv-=r[3]-(PAID[r[0]]||0)}return pv};
