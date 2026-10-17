// features/notifications.js - Feature: notifications (screens and the actions behind them).
const openPN=nm=>{const i=parties().findIndex(p=>p.n===nm);if(i>=0)openParty(i)};
let NT=[];
function notifs(){const a=SET.alerts,n=[];
if(a.low)PRD.filter(p=>p[2]>=0&&p[2]<p[3]).forEach(p=>n.push({g:'Low stock',t:dn(p),s:p[2]+' left, reorder level '+p[3],go:()=>{S.tab='inv';S.screen=null;S.q='';render()}}));
if(a.neg)PRD.filter(p=>p[2]<0).forEach(p=>{const nm=dn(p),sh=-p[2],c=stockFallback(nm),kn=CO[nm]!==undefined;n.push({g:'Negative stock',t:nm,s:sh+' sold before it was bought. '+(kn?'Valued at their last cost of '+fmt(c)+' each; record the purchase, or keep that cost.':'Never bought, so no cost is known: the book is assuming '+fmt(c)+' each. Record the purchase.'),go:()=>newPurFor([{n:nm,q:sh,c:c}])})});
// Salaries that recur: the cost is not posted behind anybody's back, so this is a reminder with the run
// one tap away. It clears itself the moment the month's salary has been run.
const dueS=USERS.length&&!can('employees')?[]:salaryDue(monthOf(tdy));
if(dueS.length)n.push({g:'Salaries due',t:dueS.length+' for '+monthOf(tdy),s:dueS.map(e=>e.n+' '+fmt(e.basic)).join(' · ')+'. Nothing is posted until you run them.',go:()=>{S.screen='stf';render()}});
// Money owed to staff sits on the balance sheet until it is paid, so it is worth showing.
activeEmp().filter(e=>empBal(e.n)>0).forEach(e=>{const b=empBal(e.n),ex=EXP.filter(x=>x.paidBy===e.n&&!x.void).reduce((a,x)=>a+x.amt,0);if(ex>0)n.push({g:'Owed to staff',t:e.n,s:fmt(b)+' owed, including '+fmt(ex)+' they paid out of their own pocket.',go:()=>{S.stfk=EMP.indexOf(e);S.screen='stfp';render()}})});
if(a.adv)Object.entries(ADV).forEach(([k,v])=>{const nm=k.slice(2);n.push({g:'Unallocated payments',t:nm,s:fmt(v)+' kept as advance',go:()=>openPN(nm)})});
if(a.over){INV.filter(r=>r[4]==='Overdue').forEach(r=>n.push({g:'Overdue',t:r[1]+' · '+r[0],s:fmt(r[3]-(PAID[r[0]]||0))+' unpaid',go:()=>openInv(r[0])}));PAYB.filter(x=>x[4]<tdy).forEach(x=>n.push({g:'Overdue',t:x[1]+' · '+x[2],s:fmt(x[3])+' to pay, was due '+fmtS(x[4]),go:()=>{S.pf='All';S.screen='pay';render()}}))}
if(a.quote)QUOT.filter(q=>qStat(q)==='Expired'||(q.status==='Sent'&&q.valid&&q.valid>=tdy&&(new Date(q.valid)-new Date(tdy))/864e5<=3)).forEach(q=>n.push({g:'Quotations',t:(q.party||'No customer')+' · '+q.no,s:qStat(q)==='Expired'?'Expired':'Expires '+fmtS(q.valid),go:()=>{S.qk=q.no;S.screen='qd';render()}}));
return n}
function ntScr(){NT=notifs();const groups=[...new Set(NT.map(x=>x.g))];
return `<div class="scr"><div class="top"><button class="ic" onclick="S.screen=null;render()">‹</button><h1>Notifications</h1><button class="ic" onclick="S.screen='st';render()">⚙</button></div>${groups.map(g=>`<div class="gh"><b>${g}</b><span>${NT.filter(x=>x.g===g).length}</span></div>`+NT.map((x,i)=>x.g===g?`<button class="row" onclick="NT[${i}].go()"><div class="grow"><div class="t">${x.t}</div><div class="lbl sm">${x.s}</div></div><span>›</span></button>`:'').join('')).join('')||'<div class="card" style="text-align:center;padding:30px"><div style="font-size:30px">✅</div><div class="t">All clear</div><div class="lbl">Nothing needs your attention.</div></div>'}</div>`}
