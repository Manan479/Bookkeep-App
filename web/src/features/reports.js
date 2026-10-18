// features/reports.js - Feature: reports (screens and the actions behind them).
function pl(){const now=piso(),before=pisoPrev();
// Cost of goods is reported on its own line, stock adjustments on theirs, and whatever is left of the
// expense accounts is "Expenses". An expense account added later therefore appears without this screen
// having to know its name.
const val=(f,t)=>{const rev=ledKindWin('revenue',f,t),cogs=ledBalWin('Cost of goods sold',f,t),sa=ledBalWin('Stock adjustments',f,t),sal=ledBalWin('Salaries',f,t),tot=ledKindWin('expense',f,t);return{rev:rev,cogs:cogs,sa:sa,sal:sal,ex:r2(tot-cogs-sa-sal),gp:r2(rev-cogs),net:r2(rev-tot)}};
const c=val(now[0],now[1]),q=S.cmp?val(before[0],before[1]):null;
const rows=[['📈','Revenue',c.rev,q?q.rev:0],['🛒','Cost of goods',c.cogs,q?q.cogs:0],['📊','Gross profit',c.gp,q?q.gp:0],['👷','Salaries',c.sal,q?q.sal:0],['🧾','Expenses',c.ex,q?q.ex:0]];
if(c.sa!==0||(q&&q.sa!==0))rows.push(['📦','Stock adjustments',c.sa,q?q.sa:0]);
rows.push(['◔','Net profit',c.net,q?q.net:0]);
setExport('Profit and Loss',['Item','This period','Previous'],rows.map(r=>[r[1],r[2],q?r[3]:'']));
 return `<div class="scr full"><div class="top"><button class="ic" onclick="S.screen=null;render()">‹</button><h1>Profit and Loss</h1></div>
<div class="shead">${chips(Object.keys(PER),S.period,'setP')}</div><div class="card row" style="margin-bottom:10px"><span class="grow t">Compare the previous period</span><button class="tg ${S.cmp?'on':''}" onclick="S.cmp=!S.cmp;render(false,true)"></button></div>
<div class="card" style="margin-bottom:10px"><div class="lbl">This period at a glance</div>${chart(['Revenue','Cost of goods','Expenses','Net'],[Math.max(c.rev,0),Math.max(c.cogs,0),Math.max(c.ex,0),Math.max(c.net,0)])}</div>
<div class="card tbl"><div class="tr lbl"><span>Item</span><span>This · Previous</span></div>${rows.map(r=>`<div class="tr"><span>${r[0]} ${r[1]}</span><span><b>${fmt(r[2])}</b> <span class="lbl">${S.cmp?fmt(r[3]):''}</span></span></div>`).join('')}</div>
<div class="lbl sm" style="margin-top:8px">Read straight from the ledger: what was posted between the first and the last day of the period shown. Nothing here is estimated or carried over from a previous screen.</div></div>
<div class="bar-act"><button class="btn p" onclick="exportSheet()">⇪ Export</button></div>`}
function rpScr(){return `<div class="scr"><div class="top"><button class="ic" onclick="S.screen=null;render()">‹</button><h1>Reports</h1><span style="width:38px"></span></div>${RPTS.map(g=>`<div class="gh"><b>${g[0]}</b></div>`+g[1].map(r=>`<button class="row" onclick="openRpt('${r[0]}')"><span class="grow t">${r[1]}</span><span>›</span></button>`).join('')).join('')}</div>`}
// ---- accounts: every account in the chart, and the story behind any of them ---------------------------------
// The trial balance answers "does it balance". This answers "what happened in this account", which is the
// question somebody actually asks when a figure looks wrong. Both read the same book.
function acScr(){const r=trialRows();setExport('Accounts',['Account','Kind','Debit','Credit'],r.rows.map(x=>[x.acc,x.kind,x.dr,x.cr]));
 const bal=a=>{const x=r.rows.find(y=>y.acc===a);return x?(x.dr?x.dr:-x.cr):0};
 return `<div class="scr"><div class="top"><button class="ic" onclick="S.screen='rp';render()">‹</button><h1>Accounts</h1><span style="width:38px"></span></div>
 <div class="lbl sm" style="padding:0 4px 10px">Every account in the chart and what it stands at. Tap one to see every debit and credit behind it.</div>
 ${COA.map(a=>{const k=ACCT_TYPES[a]||'expense',v=bal(a),nat=DEBIT_SIDE(k);return `<button class="row" onclick="openAcctPage('${a.replace(/'/g,"\\'")}')"><div class="grow"><div class="t">${a}</div><div class="lbl sm">${k}</div></div><div class="r"><div class="t">${fmt(Math.abs(v))}</div><div class="lbl sm">${v<0?'Cr':'Dr'}</div></div></button>`}).join('')}
 <div class="card tot" style="margin-top:10px"><div><span>Total debit</span><span>${fmt(r.dr)}</span></div><div><span>Total credit</span><span>${fmt(r.cr)}</span></div><div class="g"><span>Difference</span><span class="${r.diff===0?'grn':'red'}">${fmt(r.diff)}</span></div></div></div>`}
const openAcctPage=a=>{S.acct=a;S.screen='acd';render()};
function acdScr(){const a=S.acct,k=ACCT_TYPES[a]||'expense',nat=DEBIT_SIDE(k),w=piso(),h=ledHistory(a,w[0],w[1]),bal=ledBal(a);setExport('Account '+a,['Date','Entry','Narration','Debit','Credit','Balance'],h.map(l=>[l.date,l.id,l.narr||l.src,l.dr,l.cr,l.bal]));const tot=h.reduce((x,l)=>({dr:x.dr+l.dr,cr:x.cr+l.cr}),{dr:0,cr:0});
 return `<div class="scr full"><div class="top"><button class="ic" onclick="S.screen='ac';render()">‹</button><h1>${a}</h1><span style="width:38px"></span></div>
 <div class="card tot"><div><span>Balance now</span><span>${fmt(Math.abs(bal))} ${nat?(bal<0?'credit':'debit'):(bal<0?'debit':'credit')}</span></div><div><span>Debits in</span><span>${fmt(r2(tot.dr))}</span></div><div><span>Credits in</span><span>${fmt(r2(tot.cr))}</span></div><div class="lbl sm">${k} account. A ${nat?'debit':'credit'} increases it.</div></div>
 <div class="gh"><b>All movement</b><span>${h.length} line${h.length===1?'':'s'}</span></div>
 ${h.map(l=>`<div class="card" style="margin-bottom:8px"><div class="card tbl" style="margin:0"><div class="tr"><span class="lbl">${fmtS(l.date)}</span><span>${l.id}${l.ref?' · '+l.ref:''}</span></div><div class="tr"><span>${l.narr||l.src||'-'}</span><span><b>${l.dr?fmt(l.dr):'-'}</b> <span class="lbl">Dr</span></span></div>${l.by?'<div class="tr"><span class="lbl">Entered by</span><span>'+l.by+'</span></div>':''}<div class="tr"><span class="lbl">Balance after</span><span>${fmt(Math.abs(l.bal))} ${nat?(l.bal<0?'Cr':'Dr'):(l.bal<0?'Dr':'Cr')} · ${l.cr?fmt(l.cr):'-'} <span class="lbl">Cr</span></span></div></div></div>`).join('')||'<div class="card lbl">Nothing has moved in this account yet.</div>'}
 </div>`}
// A report can offer a filter of its own: repData returns opts/skey/set and the screen draws the chips.
const setTsAcct=v=>{S.tsAcct=v;render()};
function openRpt(k){if(k==='pl'){S.screen='pl';render();return}if(k==='stm'){stPick();return}if(k==='ac'){S.screen='ac';render();return}S.rpk=k;S.screen='rpt';render()}
function rptScr(){const d=repData(S.rpk);setExport(d.title,d.detailCols||d.cols,d.detailRows||d.rows);const g='minmax(0,1.5fr) '+d.cols.slice(1).map(()=>'minmax(0,1fr)').join(' ');
const row=(c,b,h)=>`<div style="display:grid;grid-template-columns:${g};gap:6px;padding:10px 0;border-bottom:1px solid var(--bd);font-size:${d.cols.length>4?12:13.5}px;${b?'font-weight:800;':''}${h?'color:var(--tx2);font-weight:700;':''}">${c.map((x,i)=>`<span style="${i?'text-align:right;':''}overflow-wrap:anywhere">${x}</span>`).join('')}</div>`;
return `<div class="scr full"><div class="top"><button class="ic" onclick="S.screen='rp';render()">‹</button><h1>${d.title}</h1><span style="width:38px"></span></div><div class="shead">${d.nop?'':chips(Object.keys(PER),S.period,'setP')}${d.opts?chips(d.opts,S[d.skey]||'All',d.set):''}</div><div class="card">${row(d.cols,0,1)}${d.rows.map(r=>row(r)).join('')||'<div class="lbl" style="padding:14px 0">Nothing to show for this period.</div>'}${d.total?row(d.total,1):''}</div>${d.note?'<div class="lbl sm" style="margin-top:8px">'+d.note+'</div>':''}</div><div class="bar-act"><button class="btn p" onclick="exportSheet()">⇪ Export</button></div>`}
function stPick(){const o=document.createElement('div');o.className='ov';o.innerHTML='<div class="sheet" style="max-height:80%;display:flex;flex-direction:column"><div class="grab"></div><b style="font-size:17px">Party statement</b><input class="search" id="sq3" placeholder="Search parties" style="margin-top:10px"><div id="sl3" style="overflow-y:auto"></div></div>';
const draw=()=>{const q=$('#sq3').value.toLowerCase();$('#sl3').innerHTML=parties().filter(p=>p.n.toLowerCase().includes(q)).map(p=>'<button class="row" data-n="'+p.n.replace(/"/g,'&quot;')+'"><span class="grow t">'+p.n+'</span><span class="lbl sm">'+roleTxt(p)+'</span></button>').join('');$('#sl3').querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{o.remove();openStmt(b.dataset.n,'rp')})};
o.onclick=e=>{if(e.target===o)o.remove()};$('#app').append(o);$('#sq3').oninput=draw;draw()}
const openStmt=(n,back)=>{S.stn=n;S.stBack=back||'pd';S.screen='stmt';render()};
function stmtScr(){const p=parties().find(x=>x.n===S.stn)||{n:S.stn,c:true,s:false,d:false},rows=[],T=x=>new Date(x).getTime();
if(p.c)INV.filter(r=>live(r)&&r[1]===p.n).forEach(r=>rows.push({d:T(r[5]),t:'Invoice',ref:r[0],a:r[3]}));
if(p.d)INV.filter(r=>live(r)&&r[1].indexOf(p.n+' > ')===0).forEach(r=>rows.push({d:T(r[5]),t:'Distributor invoice',ref:r[0],a:r[3]}));
if(p.s)PUR.filter(r=>live(r)&&r[1]===p.n).forEach(r=>rows.push({d:T(r[5]),t:'Purchase',ref:r[0],a:-r[3]}));
PAYM.filter(x=>!x.void&&x.party===p.n&&x.role!=='x'&&x.amt>0).forEach(x=>rows.push({d:T(x.date),t:x.dir==='in'?'Payment received':'Payment made',ref:x.id,a:x.dir==='in'?-x.amt:x.amt}));
RET.filter(x=>!x.void&&x.party===p.n).forEach(x=>rows.push({d:T(x.date),t:x.type==='pur'?'Debit note':'Credit note',ref:x.id,a:x.type==='pur'?x.amt:-x.amt}));
rows.sort((a,b)=>a.d-b.d);const cur=pbal(p),got=rows.reduce((a,r)=>a+r.a,0),diff=Math.round((cur-got)*100)/100;if(diff)rows.unshift({d:0,t:'Earlier activity',ref:'not itemised',a:diff});
let run=0;const L=rows.map(r=>{run+=r.a;return Object.assign({},r,{b:run})});
return `<div class="scr full"><div class="top"><button class="ic" onclick="S.screen='${S.stBack}';render()">‹</button><h1>Statement</h1><button class="ic" onclick="exportSheet()">⇪</button></div><div class="hero" style="display:block"><div class="lbl">${p.n}</div><div class="num" data-n="${Math.abs(cur)}"></div><div class="sm">${cur>0?'Owes you':cur<0?'You owe':'Settled'} · ${roleTxt(p)}</div></div>${L.map((r,k)=>`<div class="row" style="cursor:default;animation-delay:${k*20}ms"><div class="grow"><div class="t">${r.t}</div><div class="lbl sm">${r.ref}${r.d?' · '+fmtS(new Date(r.d).toISOString().slice(0,10)):''}</div></div><div class="r"><div class="t ${r.a>0?'':'grn'}">${r.a>0?'+':'-'}${fmt(Math.abs(r.a))}</div><div class="lbl sm">Bal ${fmt(Math.abs(r.b))}${r.b>0?' dr':r.b<0?' cr':''}</div></div></div>`).join('')||'<div class="card lbl">No activity yet.</div>'}</div>`}
