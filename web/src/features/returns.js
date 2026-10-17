// features/returns.js - Feature: returns (screens and the actions behind them).
function newReturn(no){S.rf={inv:no||'',qty:{},settle:'credit',acct:ACCTS[0]||'Cash',notes:'',date:tdy};S.retBack=S.screen;S.screen='rtf';render()}
const rtBack=()=>{S.screen=S.retBack&&S.retBack!=='rtf'?S.retBack:'rt';render()};
const rfQ=(k,v)=>{const d=INVD[S.rf.inv],i=d.items[k],left=i.q-((d.ret||{})[i.n]||0);S.rf.qty[i.n]=Math.max(0,Math.min(+v||0,left));render(false,true)};
function rtfScr(){const f=S.rf,d=INVD[f.inv],isD=d&&d.type==='dist',isP=d&&d.type==='pur';
const rows=d?d.items.map(i=>{const left=i.q-((d.ret||{})[i.n]||0),q=+f.qty[i.n]||0;return{i,left,q,amt:q*lineUnit(d,i)}}):[],A=rows.reduce((a,x)=>a+x.amt,0);
return `<div class="scr full"><div class="top"><button class="ic" onclick="rtBack()">‹</button><h1>${isP?'Purchase return':'Return'}</h1><span style="width:38px"></span></div>
<div class="f"><label class="w"><small>Original invoice</small><select onchange="S.rf.inv=this.value;S.rf.qty={};render(false,true)"><option value="">Select invoice</option>${eligible().map(n=>`<option value="${n}" ${f.inv===n?'selected':''}>${n} - ${INVD[n].party}</option>`).join('')}</select></label>
<label><small>Date</small><button class="dbtn" onclick="pick(S.rf.date,v=>{if(v)S.rf.date=v;render(false,true)},false)">${fmtD(f.date)}</button></label>${d&&!isD?`<label><small>Settle as</small><select onchange="S.rf.settle=this.value;render(false,true)"><option value="credit" ${f.settle==='credit'?'selected':''}>Credit</option><option value="refund" ${f.settle==='refund'?'selected':''}>Refund</option></select></label>`:'<span></span>'}
${d&&!isD&&f.settle==='refund'?`<label class="w"><small>${isP?'Refund received in':'Refund paid from'}</small><select onchange="S.rf.acct=this.value">${ACCTS.map(a=>`<option ${f.acct===a?'selected':''}>${a}</option>`).join('')}</select></label>`:''}
<label class="w"><small>Notes</small><input value="${f.notes}" oninput="S.rf.notes=this.value"></label></div>
${d?`<div class="gh"><b>Items to return</b><span>Enter quantities</span></div>${rows.map((x,k)=>`<div class="row" style="cursor:default"><div class="grow"><div class="t">${x.i.n}</div><div class="lbl sm">Sold ${x.i.q} · Can return ${x.left}</div></div><input type="number" class="search" style="margin:0;width:90px;padding:8px;text-align:right" placeholder="0" value="${x.q||''}" onchange="rfQ(${k},this.value)"></div>`).join('')}<div class="card tot"><div><span>Return value</span><span>${fmt(A)}</span></div><div class="lbl sm">${isD?'Lowers what he owes you at your distributor prices.':isP?'Lowers what you owe the supplier, and stock goes down.':'Lowers what the customer owes, and stock comes back.'}</div></div>`:'<div class="card lbl">Pick a posted invoice first.</div>'}</div>
<div class="bar-act"><button class="btn" onclick="rtBack()">Cancel</button><button class="btn p" onclick="saveRet()">Save return</button></div>`}
function saveRet(){const f=S.rf,d=INVD[f.inv];if(!d){toast('Pick an invoice');return}
const lines=d.items.map(i=>({i,q:+f.qty[i.n]||0})).filter(x=>x.q>0);if(!lines.length){toast('Enter a quantity to return');return}
d.ret=d.ret||{};for(const x of lines){const left=x.i.q-(d.ret[x.i.n]||0);if(x.q>left){toast('Only '+left+' of '+x.i.n+' can be returned');return}}
const isP=d.type==='pur',isD=d.type==='dist',no=f.inv,A=Math.round(lines.reduce((a,x)=>a+x.q*lineUnit(d,x.i),0)*100)/100;let applied=0,extra=0,party=isD?d.dsel:d.party;
if(isD){const x=DIST.find(y=>y.n===d.dsel);applied=Math.min(A,x?x.owed:0);if(x)x.owed-=applied;extra=A-applied;if(extra>0)ADV['d:'+party]=(ADV['d:'+party]||0)+extra}
else if(isP){const x=PAYB.find(y=>y[0]==='Suppliers'&&y[1]===party&&y[2]===no),pr=PUR.find(y=>y[0]===no);applied=Math.min(A,x?x[3]:0);if(x){x[3]-=applied;if(x[3]<=0){PAYB.splice(PAYB.indexOf(x),1);if(pr)pr[4]='Paid'}else if(pr)pr[4]='Partial'}extra=A-applied;if(extra>0){if(f.settle==='refund')BAL[f.acct]=(BAL[f.acct]||0)+extra;else ADV['s:'+party]=(ADV['s:'+party]||0)+extra}}
else{const r=INV.find(y=>y[0]===no),rem=r?r[3]-(PAID[no]||0):0;applied=Math.min(A,rem);PAID[no]=(PAID[no]||0)+applied;if(r)r[4]=r[3]-PAID[no]<=0?'Paid':'Partial';extra=A-applied;if(extra>0){if(f.settle==='refund')BAL[f.acct]=(BAL[f.acct]||0)-extra;else ADV['c:'+party]=(ADV['c:'+party]||0)+extra}}
let goods=0;
lines.forEach(x=>{d.ret[x.i.n]=(d.ret[x.i.n]||0)+x.q;const p=PRD.find(y=>dn(y)===x.i.n);if(p){const L=lay(x.i.n),cu=ccost(x.i);if(isP){p[2]-=x.q;buyOut(x.i.n,x.q,r2(x.q*lineUnit(d,x.i)));let need=x.q;while(need>0&&L.length){const t=Math.min(need,L[L.length-1].q);L[L.length-1].q-=t;need-=t;if(L[L.length-1].q<=0)L.pop()}}else{p[2]+=x.q;L.push({q:x.q,c:cu});goods+=x.q*cu}STK.unshift({d:f.date,n:x.i.n,q:isP?-x.q:x.q,t:isP?'Purchase return':'Sale return',ref:no})}});
// A purchase return takes the goods out at the figure the return is worth, because purchases are
// carried at cost. A sale return puts them back at exactly what the layer above was pushed back with,
// so the ledger and the layers agree to the rupee. That figure is kept on the note as its cost.
const cost=r2(isP?A:goods);
// The tax part of a return is what is left of its rounded value once the unrounded line arithmetic is
// taken off, the same way the invoice itself was posted (F1). Rounding the net first is what keeps the
// two sides of the entry equal when the lines carry fractions.
const net=r2(isP||isD?A:lines.reduce((a,x)=>a+x.q*((x.i.q*x.i.r-ld(x.i))/x.i.q),0));
const rec={id:num(isP?'dn':'cn',isP?S.dnn++:S.cn++),inv:no,type:d.type,party,lines:lines.map(x=>({n:x.i.n,q:x.q,amt:Math.round(x.q*lineUnit(d,x.i))})),amt:A,applied,extra,cost,settle:isD?'credit':f.settle,acct:f.acct,date:f.date,notes:f.notes,void:false};RET.unshift(rec);
const ent=postReturnLedger({ref:rec.id,date:f.date,type:isP?'pur':isD?'dist':'sale',amt:A,applied:applied,extra:extra,cost:cost,net:net,tax:r2(A-net),settle:isD?'credit':f.settle,acct:f.acct,narr:(isP?'Debit note ':'Credit note ')+rec.id+' · '+party});
// A purchase return takes units back out of the pool at the price they went in at, which re-costs what
// is left. The book follows the shelf, so the return can never leave the two apart.
if(ent===false)toast('Saved, but the ledger entry for '+rec.id+' was refused. The book will not agree until it is put right.');
else if(isP)reconcileStock(rec.id,f.date,'Cost restated by '+rec.id);
tick('confirm');
okOverlay(isP?'Debit note saved':'Credit note saved',rec.id+' for '+fmt(A)+'.','Done',()=>{S.screen=S.retBack&&S.retBack!=='rtf'?S.retBack:'rt';render()},'View note',()=>{S.rk=rec;S.screen='rtd';render()})}
const setRT=t=>{S.rtf=t;tick();render(false,true)};
function rtScr(){const f=S.rtf||'All',r=RET.filter(x=>!x.void&&(f==='All'||(f==='Sale returns'?x.type!=='pur':x.type==='pur')));setExport('Returns',['Note','Type','Party','Invoice','Date','Value'],r.map(x=>[x.id,x.type,x.party,x.inv,x.date,x.amt]));
return `<div class="scr"><div class="top"><button class="ic" onclick="S.screen=null;render()">‹</button><h1>Returns</h1><button class="ic" onclick="exportSheet()">⇪</button></div>${chips(Object.keys(PER),S.period,'setP')}${chips(['All','Sale returns','Purchase returns'],f,'setRT')}${r.map((x,k)=>`<button class="row" style="animation-delay:${k*30}ms" onclick="S.rk=RET[${RET.indexOf(x)}];S.screen='rtd';render()"><div class="av">${x.type==='pur'?'DN':'CN'}</div><div class="grow"><div class="t">${x.party}</div><div class="lbl sm">${x.id} · ${x.inv} · ${fmtS(x.date)}</div></div><div class="t">${fmt(x.amt)}</div></button>`).join('')||'<div class="card" style="text-align:center;padding:30px"><div style="font-size:30px">↩️</div><div class="t">No returns yet</div><div class="lbl">Returned goods will show up here.</div></div>'}</div><button class="fab" style="bottom:24px" onclick="newReturn()">＋ New return</button>`}
function rtdScr(){const r=S.rk,isP=r.type==='pur';return docScr({title:isP?'Debit Note':'Credit Note',no:r.id,date:r.date,partyLabel:isP?'Supplier':r.type==='dist'?'Distributor':'Customer',party:r.party,rows:[['Original invoice',r.inv],['Settled as',r.type==='dist'?'Distributor balance':r.settle==='refund'?'Refund':'Credit']],amountLabel:'Return value',amount:r.amt,list:['Items returned',r.lines.map(l=>[l.n+' x '+l.q,fmt(l.amt)])],notes:r.notes,back:"S.screen='rt';render()"})}
