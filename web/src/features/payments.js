// features/payments.js - Feature: payments (screens and the actions behind them).
const setPF=t=>{S.pf=t;tick();render(false,true)};
function payScr(){const T=['All','Suppliers','Expenses','Salaries','Commission','Other'],f=S.pf||'All',rows=PAYB.filter(x=>f==='All'||x[0]===f).sort((a,b)=>a[4]<b[4]?-1:1);
const groups=f==='All'?T.slice(1):[f];
const body=groups.map(g=>{const r=rows.filter(x=>x[0]===g);if(!r.length)return '';return '<div class="gh"><b>'+g+'</b><span>'+fmt(r.reduce((a,x)=>a+x[3],0))+'</span></div>'+r.map(x=>`<button class="row" onclick="payOpen(${PAYB.indexOf(x)})"><div class="av">${x[1][0]}</div><div class="grow"><div class="t">${x[1]}</div><div class="lbl sm">${x[2]} · Due ${fmtS(x[4])}</div></div><div class="r"><div class="t">${fmt(x[3])}</div><span class="badge b-${pst(x)}">${pst(x)}</span></div></button>`).join('')}).join('');
return `<div class="scr full"><div class="top"><button class="ic" onclick="S.screen=null;render()">‹</button><h1>Payables</h1><button class="ic" onclick="exportSheet()">⇪</button></div>
<div class="hero" style="display:block"><div class="lbl">Total payable</div><div class="num" data-n="${payTotal()}"></div><div class="sm">Overdue ${fmt(payOver())} · ${PAYB.length} items</div></div>
${chips(T,f,'setPF')}${body||'<div class="card" style="text-align:center;padding:30px"><div style="font-size:30px">✅</div><div class="t">Nothing to pay here</div><div class="lbl">Unpaid items of this type will show up here.</div></div>'}</div>`}
function payRow(i){const x=PAYB[i],o=document.createElement('div');o.className='ov';o.innerHTML=`<div class="sheet"><div class="grab"></div><b style="font-size:17px">${x[1]}</b><div class="lbl">${x[0]} - ${x[2]} - Balance ${fmt(x[3])}</div><div class="f" style="margin-top:12px"><label><small>Amount to pay</small><input id="pa" type="number" value="${docAttr(x[3])}"></label><label><small>Pay from</small><select id="pf"><option>Cash</option><option>Meezan Bank</option></select></label></div><button class="btn p" style="width:100%;flex:none" id="pp">Record payment</button></div>`;
o.onclick=e=>{if(e.target===o)o.remove()};$('#app').append(o);
$('#pp').onclick=()=>{const current=PAYB.find(y=>y[0]===x[0]&&y[1]===x[1]&&y[2]===x[2]);if(!current){toast('This bill has already been paid');return}const amt=Math.min(+$('#pa').value||0,current[3]);if(amt<=0||!Number.isFinite(amt))return;const ac=$('#pf')?$('#pf').value:'Cash';
const committed=bookTransaction('Post bill payment',()=>PAYM[0].id,()=>{
if(!can('payments')||!ACCTS.includes(ac))throw new Error('Check your permission and payment account.');
const x=current,i=PAYB.indexOf(x);BAL[ac]-=amt;const rec={id:num('pay',S.vn++),dir:'out',party:x[1],role:'x',amt,used:0,date:tdy,method:ac==='Cash'?'Cash':'Bank transfer',acct:ac,ref:x[2],notes:'',alloc:{[x[2]]:amt},adv:0};PAYM.unshift(rec);x[3]-=amt;x[5]=true;if(x[3]<=0)PAYB.splice(i,1);
// A bill raised by an expense was already recognised as a cost, so this clears the payable. Anything
// else on the list (a salary, commission or other bill) is a cost being paid now.
const entry=postBillPayLedger({ref:rec.id,date:tdy,amount:amt,payable:!!EXP.find(e=>e.id===x[2]),narr:'Payment '+rec.id+' · '+x[1]});
if(entry===false)throw new Error('The ledger entry was refused.');
if(PAYM.some(p=>p!==rec&&p.id===rec.id))throw new Error('That payment number is already in use.');
});if(!committed.ok){toast(committed.error);return false}
o.remove();render(false,true);tick();toast('Payment recorded')}}
const payOpen=i=>{const x=PAYB[i];if(x[0]==='Suppliers')newPay('out',x[1],x[2]);else payRow(i)};
function newPay(dir,party,key,role){S.pm={dir,party:party||'',role:'',amt:'',date:tdy,method:'Cash',acct:'Cash',ref:'',notes:'',alloc:{},useAdv:false};const m=S.pm;if(party){const r=roleOpts();m.role=r.includes(role)?role:r[0]||''}
if(key){const it=openItems().find(x=>x.key===key);if(it){m.amt=it.rem;m.alloc[key]=it.rem}}
S.payBack=S.screen;S.screen='pmf';render()}
const pmBack=()=>{S.screen=S.payBack||'pm';render()};
const pmParty=n=>{const m=S.pm;m.party=n;m.alloc={};m.useAdv=false;m.role=roleOpts()[0]||'';render(false,true)};
const pmRole=r=>{S.pm.role=r;S.pm.alloc={};S.pm.useAdv=false;render(false,true)};
const pmClamp=()=>{const m=S.pm;let left=availAmt();Object.keys(m.alloc).forEach(k=>{const it=openItems().find(x=>x.key===k);if(!it){delete m.alloc[k];return}m.alloc[k]=Math.max(0,Math.min(m.alloc[k],it.rem,left));left-=m.alloc[k]})};
const pmTog=k=>{const m=S.pm,it=openItems().find(x=>x.key===k);if(m.alloc[k]!==undefined)delete m.alloc[k];else{const left=availAmt()-allocSum();if(left<=0){toast('Enter an amount first');return}m.alloc[k]=Math.min(it.rem,left)}tick();render(false,true)};
const pmSet=(k,v)=>{const m=S.pm,it=openItems().find(x=>x.key===k),other=allocSum()-(m.alloc[k]||0);m.alloc[k]=Math.max(0,Math.min(+v||0,it.rem,availAmt()-other));render(false,true)};
const pickPmDate=()=>pick(S.pm.date,v=>{if(v)S.pm.date=v;render(false,true)},false);
function pmfScr(){const m=S.pm,rl=m.role==='x'?['x']:roleOpts(),items=openItems(),avail=availAmt(),applied=m.role==='d'?Math.min(avail,owedD()):allocSum(),un=Math.max(0,avail-applied),ab=advBal();
return `<div class="scr full"><div class="top"><button class="ic" onclick="pmBack()">‹</button><h1>${m.editId?'Edit '+esc(m.editId):m.dir==='in'?'Receive payment':'Make payment'}</h1><span style="width:38px"></span></div>
<div class="f"><label class="w"><small>${m.dir==='in'?'Received from':'Paid to'}</small><select onchange="pmParty(this.value)"><option value="">Select party</option>${[...new Set(partyNames().concat(m.party?[m.party]:[]))].map(n=>`<option ${m.party===n?'selected':''}>${n}</option>`).join('')}</select></label>
${rl.length>1?`<div style="grid-column:1/3"><div class="lbl" style="margin-bottom:6px">As</div><div class="sw" style="margin:0">${rl.map(r=>`<button class="chip ${m.role===r?'on':''}" onclick="pmRole(${docAttr(JSON.stringify(r))})">${RL[r]}</button>`).join('')}</div></div>`:''}
<label><small>Amount</small><input type="number" value="${docAttr(m.amt)}" onchange="S.pm.amt=this.value;pmClamp();render(false,true)"></label><label><small>Date</small><button class="dbtn" onclick="pickPmDate()">${fmtD(m.date)}</button></label>
<label><small>Method</small><select data-add="method" onchange="S.pm.method=this.value;render(false,true)">${METHODS.map(x=>`<option ${m.method===x?'selected':''}>${x}</option>`).join('')}</select></label><label><small>${m.dir==='in'?'Paid into':'Paid from'}</small><select onchange="S.pm.acct=this.value">${ACCTS.map(x=>`<option ${m.acct===x?'selected':''}>${x}</option>`).join('')}</select></label>
<label class="w"><small>${m.method==='Cheque'?'Cheque number':'Reference (optional)'}</small><input value="${docAttr(m.ref||'')}" oninput="S.pm.ref=this.value"></label><label class="w"><small>Notes</small><input value="${docAttr(m.notes||'')}" oninput="S.pm.notes=this.value"></label></div>
${ab>0?`<div class="card row" style="margin-bottom:10px"><div class="grow"><div class="t">Use advance</div><div class="lbl sm">Available ${fmt(ab)}</div></div><button class="tg ${m.useAdv?'on':''}" onclick="S.pm.useAdv=!S.pm.useAdv;pmClamp();render(false,true)"></button></div>`:''}
${m.role==='c'||m.role==='s'||m.role==='x'?`<div class="gh"><b>Apply to ${m.role==='c'?'invoices':'bills'}</b><span>Pick what this covers</span></div>${items.map(it=>{const on=m.alloc[it.key]!==undefined;return `<div class="row" style="cursor:default"><button class="tg ${on?'on':''}" onclick="pmTog(${docAttr(JSON.stringify(it.key))})"></button><div class="grow"><div class="t">${it.key}</div><div class="lbl sm">${it.date} · Balance ${fmt(it.rem)}</div></div>${on?`<input type="number" class="search" style="margin:0;width:100px;padding:8px;text-align:right" value="${docAttr(m.alloc[it.key])}" onchange="pmSet('${it.key}',this.value)">`:''}</div>`}).join('')||'<div class="card lbl">Nothing open for this party. The whole amount will be kept as an advance.</div>'}`:''}
${m.role==='d'?`<div class="card lbl" style="margin-bottom:10px">He owes you ${fmt(owedD())}. This payment reduces it.</div>`:''}
<div class="card tot"><div><span>${m.dir==='in'?'Money received':'Money paid'}</span><span>${fmt(+m.amt||0)}</span></div>${m.useAdv?`<div><span>Advance used</span><span>${fmt(ab)}</span></div>`:''}<div><span>Applied</span><span>${fmt(applied)}</span></div><div class="g"><span>Kept as advance</span><span class="${un>0?'grn':''}">${fmt(un)}</span></div></div></div>
<div class="bar-act"><button class="btn" onclick="pmBack()">Cancel</button><button class="btn p" onclick="savePm()">${m.editId?'Save changes':'Save payment'}</button></div>`}
function savePm(){const m=S.pm;if(!m.party){toast('Select a party');return}const avail=availAmt();if(!(avail>0)){toast('Enter an amount');return}
if(m.committed)return;
const committed=bookTransaction(m.editId?'Edit payment':'Post payment',()=>m.editId||PAYM[0].id,()=>{
if(!can('payments'))throw new Error('You cannot record payments.');
let previous=null;if(m.editId){previous=PAYM.find(p=>p.id===m.editId);if(!previous||previous.void||!isAdmin())throw new Error('This payment cannot be edited.');const problem=registerRemovalProblem('pm',[previous],'void');if(problem)throw new Error(problem);if(!voidPmChanges(previous))throw new Error('Could not reverse the original payment.');}
if(!Number.isFinite(+m.amt)||+m.amt<0||!Number.isFinite(avail)||!ACCTS.includes(m.acct)||!['c','s','d','x'].includes(m.role))throw new Error('Check the payment amount, account and party role.');
const items=openItems();
for(const [key,amount] of Object.entries(m.alloc)){
 const item=items.find(x=>x.key===key);
 if(!Number.isFinite(amount)||amount<0||!item||amount>item.rem+0.001)throw new Error('An invoice balance changed. Review the payment allocations.');
}
if(allocSum()>avail+0.001)throw new Error('Allocated payments exceed the available amount.');
if(m.role==='x'&&(!previous||m.useAdv||Math.abs(allocSum()-avail)>.001||Object.keys(m.alloc).some(key=>!Object.prototype.hasOwnProperty.call(previous.alloc||{},key))))throw new Error('Apply this bill payment to its original bill, without an advance.');
const R=m.role,key=R+':'+m.party,al={};let applied=0;
if(R==='c'){Object.entries(m.alloc).forEach(([k,a])=>{if(a>0){PAID[k]=(PAID[k]||0)+a;const r=INV.find(x=>x[0]===k);if(r)r[4]=r[3]-PAID[k]<=0?'Paid':'Partial';al[k]=a;applied+=a}})}
else if(R==='s'||R==='x'){Object.entries(m.alloc).forEach(([k,a])=>{if(a>0){const ix=PAYB.findIndex(x=>(R==='s'?x[0]==='Suppliers':x[0]!=='Suppliers')&&x[1]===m.party&&x[2]===k);if(ix>=0){const x=PAYB[ix],pr=PUR.find(y=>y[0]===k);x[3]-=a;x[5]=true;if(x[3]<=0){PAYB.splice(ix,1);if(pr)pr[4]='Paid'}else if(pr)pr[4]='Partial';al[k]=a;applied+=a}}})}
else if(R==='d'){const d=DIST.find(x=>x.n===m.party);applied=Math.min(avail,d?d.owed:0);if(d)d.owed-=applied;al['Distributor balance']=applied}
const un=Math.round((avail-applied)*100)/100,used=m.useAdv?advBal():0,amt=+m.amt||0;
const nb=(ADV[key]||0)-used+un;if(nb>0)ADV[key]=nb;else delete ADV[key];
BAL[m.acct]=(BAL[m.acct]||0)+(m.dir==='in'?amt:-amt);
const rec={id:m.editId||num(m.dir==='in'?'rcp':'pay',m.dir==='in'?S.rn++:S.vn++),dir:m.dir,party:m.party,role:R,amt,used,date:m.date,method:m.method,acct:m.acct,ref:m.ref,notes:m.notes,alloc:al,adv:un};if(previous)PAYM.splice(PAYM.indexOf(previous),1);PAYM.unshift(rec);
// F3: the ledger moves the advance by amt - applied, which is the same number cash moves by, not by
// the rounded `un` the record keeps.
const ent=R==='x'?postBillPayLedger({ref:rec.id,date:m.date,amount:amt,payable:Object.keys(al).every(key=>EXP.some(e=>e.id===key)),narr:'Payment '+rec.id+' · '+m.party}):postPmLedger({ref:rec.id,date:m.date,dir:m.dir,amt:amt,applied:applied,narr:(m.dir==='in'?'Receipt ':'Payment ')+rec.id+' · '+m.party});
if(ent===false)throw new Error('The ledger entry for '+rec.id+' was refused.');
if(PAYM.some(p=>p!==rec&&p.id===rec.id))throw new Error('That payment number is already in use.');
m.committed=true;
return {rec,amt,used,un};
});
if(!committed.ok){toast(committed.error);return false}
const {rec,amt,used,un}=committed.value;if(m.editId)S.pmk=rec;
tick('confirm');
const o=document.createElement('div');o.className='ok';o.innerHTML='<svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="50"/><path d="M33 57l15 15 30-33"/></svg><h1>'+(m.editId?'Payment updated':'Payment recorded')+'</h1><div class="lbl">'+fmt(amt||used)+(m.dir==='in'?' received from ':' paid to ')+m.party+(un>0?'. '+fmt(un)+' kept as advance.':'')+'</div><button class="btn p" style="flex:none;width:100%;margin-top:14px" id="p1">Done</button><button class="btn" style="flex:none;width:100%" id="p2">View receipt</button>';
$('#app').append(o);$('#p1').onclick=()=>{o.remove();S.screen=S.payBack||'pm';render()};$('#p2').onclick=()=>{o.remove();S.pmk=rec;S.screen='pmd';render()}}
const setPMF=t=>{S.pmf=t;tick();render(false,true)};
function pmRows(){const f=S.pmf||'All',q=(S.q||'').toLowerCase();const r=PAYM.map((p,i)=>[p,i]).filter(x=>(f==='All'||(f==='Received'?x[0].dir==='in':f==='Paid'?x[0].dir==='out':x[0].adv>0))&&inP(x[0].date)&&x[0].party.toLowerCase().includes(q));
return r.length?r.map((x,k)=>{const p=x[0];return `<button class="row" data-sel="${docAttr(p.id)}" style="animation-delay:${k*30}ms" onclick="openPm(${x[1]})"><div class="av">${p.dir==='in'?'↓':'↑'}</div><div class="grow"><div class="t">${p.party}</div><div class="lbl sm">${p.id} · ${fmtS(p.date)} · ${p.method}${p.void?' · VOID':''}</div></div><div class="r"><div class="t ${p.dir==='in'?'grn':'red'}">${p.dir==='in'?'+':'-'}${fmt(p.amt||p.used)}</div>${p.adv>0?'<div class="lbl sm">'+tr('Advance')+' '+fmt(p.adv)+'</div>':''}</div></button>`}).join(''):`<div class="card" style="text-align:center;padding:30px"><div style="font-size:30px">💸</div><div class="t">${tr('No payments')}</div><div class="lbl">${tr('Recorded payments will show up here.')}</div></div>`}
function pmScr(){const _f=S.pmf||'All',_q=(S.q||'').toLowerCase(),_rows=PAYM.filter(p=>inP(p.date)&&(_f==='All'||(_f==='Received'?p.dir==='in':_f==='Paid'?p.dir==='out':p.adv>0))&&p.party.toLowerCase().includes(_q));setExport('Payments',['Date','Party','Direction','Method','Amount'],_rows.map(p=>[p.date,p.party,p.dir==='in'?'Received':'Paid',p.method,p.amt]));S.selRows=_rows.map(p=>({id:p.id,cells:[p.date,p.party,p.dir==='in'?'Received':'Paid',p.method,p.amt||p.used]}));S.selCols=S.xp.cols;S.selTitle='Payments';const tin=PAYM.filter(p=>p.dir==='in'&&!p.void).reduce((a,p)=>a+p.amt,0),tout=PAYM.filter(p=>p.dir==='out'&&!p.void).reduce((a,p)=>a+p.amt,0);
 return `<div class="scr full tablemode"><div class="top"><button class="ic" onclick="S.screen=null;S.q='';render()">‹</button><h1>${tr('Payments')}</h1><button class="btn p deskonly"  onclick="payType()">+ ${tr('New payment')}</button><button class="ic" onclick="exportSheet()">⇪</button></div><div class="shead">${chips(Object.keys(PER),S.period,'setP')}<input class="search" placeholder="${tr('Search by party')}" value="${docAttr(S.q||'')}" oninput="S.q=this.value;render(false,true)">${chips(['All','Received','Paid','Advances'],S.pmf||'All','setPMF')}</div><div class="grid two"><div class="card"><div class="lbl">${tr('Received')}</div><div class="num grn">${fmt(tin)}</div></div><div class="card"><div class="lbl">${tr('Paid')}</div><div class="num red">${fmt(tout)}</div></div></div><div id="pml" class="listcards">${pmRows()}</div>
 <div class="tablewrap"><table class="dtable record-table"><colgroup><col class="col-date"><col><col class="col-status"><col class="col-method"><col class="col-amount"></colgroup><thead><tr><th>${tr('Date')}</th><th>${tr('Party')}</th><th>${tr('Direction')||'Direction'}</th><th>${tr('Method')||'Method'}</th><th class="rt">${tr('Amount')||'Amount'}</th></tr></thead><tbody>${_rows.length?_rows.map(p=>{const dir=p.dir==='in';return `<tr data-sel="${docAttr(p.id)}" tabindex="0" onclick="openPm(${PAYM.indexOf(p)})" onkeydown="if(event.key==='Enter'){openPm(${PAYM.indexOf(p)})}"><td class="dim">${fmtS(p.date)}</td><td class="party">${p.party}</td><td>${tr(dir?'Received':'Paid')}</td><td class="dim">${p.method||'-'}</td><td class="rt amt ${dir?'grn':'red'}">${dir?'+':'-'}${fmt(p.amt||p.used)}</td></tr>`}).join(''):`<tr><td colspan="5" class="empty">${tr('No payments')} — ${tr('Recorded payments will show up here.')}</td></tr>`}</tbody></table></div></div><button class="fab" style="bottom:24px" onclick="payType()">+ ${tr('New payment')}</button>`}
function payType(){const o=document.createElement('div');o.className='ov';o.innerHTML='<div class="sheet"><div class="grab"></div><b style="font-size:17px">New payment</b><div style="margin-top:12px"><button class="row" data-t="in"><span>↓</span><div class="grow"><div class="t">Receive money</div><div class="lbl sm">From a customer or distributor</div></div></button><button class="row" data-t="out"><span>↑</span><div class="grow"><div class="t">Pay money</div><div class="lbl sm">To a supplier</div></div></button></div></div>';o.onclick=e=>{if(e.target===o)o.remove()};o.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{o.remove();newPay(b.dataset.t)});$('#app').append(o)}
const openPm=i=>{S.pmk=PAYM[i];S.screen='pmd';render()};
function voidPm(p){
 p=PAYM.find(row=>row.id===p.id);if(!p)return false;
 const result=bookTransaction('Void payment',p.id,()=>voidPmChanges(p));
 if(!result.ok){toast(result.error);return false}
 render();toast(p.id+' voided');return true;
}
function voidPmChanges(p){if(p.void)return false;if(!isAdmin()){toast('Only an administrator can void a payment');return false}const R=p.role,key=R+':'+p.party;
// The book is mirrored and the original flagged void, so the payment's effect disappears from the
// trial balance without the trail disappearing from the register.
ledReverse(p.id,'Void '+p.id);
if(R==='c'){Object.entries(p.alloc).forEach(([k,a])=>{PAID[k]=Math.max(0,(PAID[k]||0)-a);const r=INV.find(x=>x[0]===k);if(r&&r[4]!=='Void')r[4]=PAID[k]>0?'Partial':'Unpaid'})}
else if(R==='s'||R==='x'){Object.entries(p.alloc).forEach(([k,a])=>{let x=PAYB.find(y=>y[1]===p.party&&y[2]===k);if(x)x[3]+=a;else{x=[R==='s'?'Suppliers':'Expenses',p.party,k,a,tdy,false];PAYB.push(x)}const pr=PUR.find(y=>y[0]===k);if(pr&&pr[4]!=='Void')pr[4]=x[3]>=pr[3]?'Unpaid':'Partial'})}
else if(R==='d'){const d=DIST.find(x=>x.n===p.party);if(d)d.owed+=p.alloc['Distributor balance']||0}
const nb=(ADV[key]||0)-(p.adv||0)+(p.used||0);if(nb>0)ADV[key]=nb;else delete ADV[key];
BAL[p.acct]=(BAL[p.acct]||0)-(p.dir==='in'?p.amt:-p.amt);p.void=true;return true}
function pmdScr(){const p=S.pmk;return docScr({title:p.dir==='in'?'Payment Receipt':'Payment Voucher',no:p.id,date:p.date,partyLabel:p.dir==='in'?'Received from':'Paid to',party:p.party,rows:[['Method',p.method]].concat(p.ref?[['Reference',p.ref]]:[],[[p.dir==='in'?'Paid into':'Paid from',p.acct]]),amountLabel:'Amount',amount:p.amt,list:['Applied to',Object.entries(p.alloc||{}).map(([k,v])=>[k,fmt(v)]).concat(p.used?[['Advance used',fmt(p.used)]]:[],p.adv>0?[['Kept as advance',fmt(p.adv)]]:[])],notes:p.notes,back:"S.screen='pm';render()",stamp:p.void?'Void':'',voidBtn:''})}

function editPayment(id){const p=PAYM.find(x=>x.id===id);if(!p||p.void||!isAdmin()||!can('payments')){toast('This payment cannot be edited');return}const problem=registerRemovalProblem('pm',[p],'void');if(problem){editLinkedRecordMetadata('pm',id,problem);return}S.pm={editId:id,dir:p.dir,party:p.party,role:p.role,amt:p.amt,date:p.date,method:p.method,acct:p.acct,ref:p.ref||'',notes:p.notes||'',alloc:bookClone(p.role==='d'?{}:p.alloc||{}),useAdv:!!p.used};S.payBack='pmd';S.pmk=p;S.sel=null;S.screen='pmf';render()}
