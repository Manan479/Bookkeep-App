// features/expenses.js - Feature: expenses (screens and the actions behind them).
const setEX=t=>{S.exf=t;tick();render(false,true)};
function exRows(){const f=S.exf||'All',q=(S.q||'').toLowerCase();const r=EXP.map((e,i)=>[e,i]).filter(x=>(f==='All'||x[0].cat===f)&&inP(x[0].date)&&(x[0].payee+x[0].cat+x[0].notes).toLowerCase().includes(q));
return r.length?r.map((x,k)=>{const e=x[0],row=PAYB.find(y=>y[2]===e.id),st=e.void?'Void':e.acct==='Pay later'?(!row?'Paid':row[3]<e.amt?'Partial':'Unpaid'):'Paid';return `<button class="row${selIn(e.id)?' sel':''}" data-sel="${e.id}" style="animation-delay:${k*30}ms" onclick="S.xk=EXP[${x[1]}];S.screen='exd';render()"><div class="av">${e.cat[0]}</div><div class="grow"><div class="t">${e.payee||e.cat}</div><div class="lbl sm">${e.cat} · ${fmtS(e.date)}${e.img?' · 📎':''}</div></div><div class="r"><div class="t">${fmt(e.amt)}</div><span class="badge b-${st}">${tr(st)}</span></div></button>`}).join(''):`<div class="card" style="text-align:center;padding:30px"><div style="font-size:30px">🧾</div><div class="t">${tr('No expenses here')}</div><div class="lbl">${tr('Try another period or category.')}</div></div>`}
function exScr(){const _f=S.exf||'All',_q=(S.q||'').toLowerCase(),_rows=EXP.filter(e=>inP(e.date)&&(_f==='All'||e.cat===_f)&&(e.payee+e.cat+(e.notes||'')).toLowerCase().includes(_q));S.selRows=_rows.map(e=>({id:e.id,cells:[e.date,e.cat,e.payee,e.paidBy||e.acct,e.amt]}));S.selCols=['Date','Category','Payee','Paid from','Amount'];S.selTitle='Expenses';setExport('Expenses',S.selCols,_rows.map(e=>[e.date,e.cat,e.payee,e.paidBy||e.acct,e.amt]));return `<div class="scr"><div class="top"><button class="ic" onclick="S.screen=null;S.q='';render()">‹</button><h1>${tr('Expenses')}</h1><button class="ic" onclick="exportSheet()">⇪</button></div><div class="shead">${chips(Object.keys(PER),S.period,'setP')}<input class="search" placeholder="${tr('Search expenses')}" value="${docAttr(S.q||'')}" oninput="S.q=this.value;render(false,true)">${chips(['All',...CATS],S.exf||'All','setEX')}</div><div class="hero" style="display:block"><div class="lbl">${tr('Total spent')}</div><div class="num" data-n="${expTotal()}"></div></div><div id="exl">${exRows()}</div></div><button class="fab" style="bottom:24px" onclick="newExp()">+ ${tr('Add expense')}</button>`}
const newExp=()=>{S.ef={cat:CATS[0],amt:'',date:tdy,payee:'',acct:'Cash',inv:'',notes:'',img:'',paidBy:''};S.screen='exf';render()};
function efImg(inp){const f=inp.files&&inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const m=900,k=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);S.ef.img=c.toDataURL('image/jpeg',.6);render(false,true)};im.src=r.result};r.readAsDataURL(f)}
function exfScr(){const e=S.ef;return `<div class="scr full"><div class="top"><button class="ic" onclick="expenseBack()">‹</button><h1>${e.editId?'Edit '+esc(e.editId):'Add expense'}</h1><span style="width:38px"></span></div>
<div class="f"><label><small>Category</small><select data-add="category" onchange="S.ef.cat=this.value">${CATS.map(c=>`<option ${e.cat===c?'selected':''}>${c}</option>`).join('')}</select></label><label><small>Amount</small><input type="number" value="${docAttr(e.amt)}" onchange="S.ef.amt=this.value"></label>
<label><small>Date</small><button class="dbtn" onclick="pick(S.ef.date,v=>{if(v)S.ef.date=v;render(false,true)},false)">${fmtD(e.date)}</button></label>
<label><small>Payment status</small><select aria-label="Expense payment status" onchange="expensePaymentMode(this.value)">${[['company','Paid by company'],['employee','Paid personally by employee'],['unpaid','Unpaid — pay later']].map(([v,label])=>`<option value="${docAttr(v)}" ${expenseMode(e)===v?'selected':''}>${label}</option>`).join('')}</select></label>
${expenseMode(e)==='company'?`<label class="w"><small>Company cash / bank account</small><select aria-label="Expense company account" onchange="S.ef.acct=this.value">${ACCTS.map(a=>`<option ${e.acct===a?'selected':''}>${a}</option>`).join('')}</select></label>`:''}
${expenseMode(e)==='employee'?`<label class="w"><small>Employee who paid personally</small><select aria-label="Expense paid by employee" onchange="S.ef.paidBy=this.value"><option value="">Select employee</option>${EMP.filter(x=>x.active!==false||x.n===e.paidBy).map(x=>`<option value="${docAttr(x.n)}" ${e.paidBy===x.n?'selected':''}>${esc(x.n)}</option>`).join('')}</select></label><div class="lbl w">The company owes this employee reimbursement. Company cash and bank balances stay unchanged.</div>`:''}

<label class="w"><small>Payee (who you paid or will pay)</small><input value="${docAttr(e.payee||'')}" oninput="S.ef.payee=this.value"></label>
<label class="w"><small>Related sales invoice (optional)</small><select onchange="S.ef.inv=this.value;S.ef.billToInvoice=null"><option value="">None</option>${INV.filter(x=>x[4]!=='Draft'&&x[4]!=='Void').map(x=>`<option ${e.inv===x[0]?'selected':''}>${x[0]}</option>`).join('')}</select></label>
<label class="w"><small>Notes</small><input value="${docAttr(e.notes||'')}" oninput="S.ef.notes=this.value"></label></div>
<input type="file" accept="image/*" id="efile" style="display:none" onchange="efImg(this)"><button class="btn" style="width:100%;flex:none" onclick="document.getElementById('efile').click()">${e.img?'Change receipt photo':'Add receipt photo'}</button>${e.img?'<img src="'+e.img+'" style="width:100%;border-radius:12px;margin-top:10px">':''}
${expenseMode(e)==='unpaid'?'<div class="card lbl" style="margin-top:10px">This goes to Payables and stays unpaid until you pay it.</div>':''}</div>
<div class="bar-act"><button class="btn" onclick="expenseBack()">Cancel</button><button class="btn p" onclick="saveExp()">${e.editId?'Save changes':'Save expense'}</button></div>`}
function saveExp(){const e=S.ef,amt=+e.amt;if(e.committed)return;if(e.inv&&e.billToInvoice==null){expenseChargePrompt();return}if(!e.cat||!(amt>0)||!Number.isFinite(amt)){toast('Enter a category and a valid amount');return}
const result=bookTransaction(e.editId?'Edit expense':'Post expense',()=>e.editId||EXP[0].id,()=>{
 if(!can('expenses')||(e.editId&&!isAdmin()))throw new Error('You cannot change this expense.');
 if(expenseMode(e)==='employee'&&(!e.paidBy||!EMP.some(x=>x.n===e.paidBy)))throw new Error('Select the employee who paid personally.');
 if(expenseMode(e)==='unpaid'&&!e.payee.trim())throw new Error('Enter who the unpaid expense is owed to.');
 if(!e.date||(!e.paidBy&&!['Pay later',...ACCTS].includes(e.acct)))throw new Error('Check the date and payment account.');
 const old=e.editId?EXP.find(x=>x.id===e.editId):null;if(e.editId&&(!old||old.void))throw new Error('This expense cannot be edited.');
 if(old){const problem=registerRemovalProblem('ex',[old],'void');if(problem)throw new Error(problem);const payable=PAYB.find(x=>x[2]===old.id);if(!old.paidBy){if(old.acct==='Pay later'){if(payable)PAYB.splice(PAYB.indexOf(payable),1)}else BAL[old.acct]=r2((BAL[old.acct]||0)+old.amt)}ledReverse(old.id,'Expense revised');}
 const rec={id:e.editId||num('exp',S.en++),cat:e.cat,amt,date:e.date,payee:e.payee.trim(),acct:e.acct,inv:e.inv,notes:e.notes,img:e.img,void:false,paidBy:e.paidBy||'',billToInvoice:!!e.billToInvoice};
 if(old){AUDIT.push({id:'audit-'+Date.now()+'-'+AUDIT.length,at:new Date().toISOString(),action:'Expense before edit',ref:old.id,by:S.user?S.user.n:'',before:bookClone(old),after:bookClone(rec)});EXP.splice(EXP.indexOf(old),1)}EXP.unshift(rec);
 if(!e.paidBy){if(e.acct==='Pay later')PAYB.push(['Expenses',rec.payee||rec.cat,rec.id,amt,plus(e.date,14),false]);else BAL[e.acct]=r2((BAL[e.acct]||0)-amt)}
 if(!postExpenseLedger({ref:rec.id,date:e.date,amt,payLater:e.acct==='Pay later',byStaff:!!e.paidBy,narr:'Expense '+rec.id+' · '+rec.cat}))throw new Error('The ledger entry was refused.');
 applyExpenseInvoiceCharge(rec);e.committed=true;return rec;
});if(!result.ok){toast(result.error);return}S.xk=result.value;S.screen='exd';render();toast(e.editId?'Expense updated':'Expense saved')}
function editExpense(id){const e=EXP.find(x=>x.id===id);if(!e||e.void||!isAdmin()||!can('expenses')){toast('This expense cannot be edited');return}const problem=registerRemovalProblem('ex',[e],'void');if(problem){editLinkedRecordMetadata('ex',id,problem);return}S.ef=Object.assign(bookClone(e),{editId:id,committed:false,billToInvoice:undefined});S.sel=null;S.screen='exf';render()}
const expenseBack=()=>{S.screen=S.ef&&S.ef.editId?'exd':'ex';render()};

function exdScr(){const e=S.xk,row=PAYB.find(y=>y[2]===e.id),st=e.void?'Void':e.acct==='Pay later'?(!row?'Paid':row[3]<e.amt?'Partial':'Unpaid'):'Paid';
const info=[['Category',e.cat],['Date',fmtD(e.date)],['Payee',e.payee],['Paid by',e.paidBy],['Paid from',e.paidBy?'':e.acct],['Notes',e.notes]].filter(x=>x[1]);
return `<div class="scr full"><div class="top"><button class="ic" onclick="S.screen='ex';render()">‹</button><h1>${e.id}</h1><span class="badge b-${st}">${st}</span></div><div class="hero" style="display:block"><div class="lbl">${e.cat}</div><div class="num" data-n="${e.amt}"></div></div>
<div class="card tbl">${info.map(x=>'<div class="tr"><span class="lbl">'+x[0]+'</span><span style="text-align:right">'+x[1]+'</span></div>').join('')}${e.inv?'<div class="tr"><span class="lbl">Linked invoice</span><button class="ut" onclick="openInv(\''+e.inv+'\')">'+e.inv+'</button></div>':''}</div>
${e.img?'<div class="gh"><b>Receipt</b></div><img src="'+e.img+'" style="width:100%;border-radius:12px">':''}
</div>`}
const legacyVoidExpC=()=>confirmSheet('Void '+S.xk.id+'?','This puts the money or the payable back.','Void',()=>voidExp(S.xk));
function voidExp(e){const row=PAYB.find(x=>x[2]===e.id);
 if(e.paidBy){/* it was never paid out of the accounts: the ledger reversal takes it off their payable */}
 else if(e.acct==='Pay later'){if(PAYM.some(p=>!p.void&&p.alloc&&p.alloc[e.id]!==undefined)){toast('Void its payments first');return}if(row)PAYB.splice(PAYB.indexOf(row),1)}else BAL[e.acct]=(BAL[e.acct]||0)+e.amt;
// The mirror entry takes the cost back out of the book; the original stays and is flagged void.
ledReverse(e.id,'Void '+e.id);e.void=true;render();toast(e.id+' voided')}

const voidExpC=()=>registerRemoveAsk('ex',[S.xk.id]);

function expenseMode(e){return e.paymentMode||(e.paidBy?'employee':e.acct==='Pay later'?'unpaid':'company')}
function expensePaymentMode(mode){const e=S.ef;if(ACCTS.includes(e.acct))e.companyAccount=e.acct;e.paymentMode=mode;e.paidBy='';e.acct=mode==='unpaid'?'Pay later':mode==='company'?(e.companyAccount||ACCTS[0]||'Cash'):'';render(false,true)}

function expenseChargePrompt(){const e=S.ef,o=document.createElement('div');o.className='ov';o.innerHTML='<div class="sheet"><div class="grab"></div><h2>Add this cost to '+esc(e.inv)+'?</h2><p class="lbl">Add '+fmt(+e.amt||0)+' as a named invoice charge, or keep the expense as a company cost only. The expense is recorded either way.</p><button class="row" data-expense-bill="yes"><b>Add charge to invoice</b></button><button class="row" data-expense-bill="no"><b>Keep as company cost only</b></button><button class="btn" data-expense-bill-cancel>Cancel</button></div>';document.getElementById('app').append(o);o.onclick=event=>{if(event.target===o)o.remove()};o.querySelector('[data-expense-bill-cancel]').onclick=()=>o.remove();o.querySelectorAll('[data-expense-bill]').forEach(b=>b.onclick=()=>{e.billToInvoice=b.dataset.expenseBill==='yes';o.remove();saveExp()})}
function applyExpenseInvoiceCharge(expense){
 const affected=Object.entries(INVD).filter(([no,d])=>(d.items||[]).some(i=>i.expenseId===expense.id)||(expense.billToInvoice&&no===expense.inv));
 if(expense.billToInvoice&&!affected.some(([no])=>no===expense.inv))throw new Error('The linked invoice is unavailable');
 for(const [no,d]of affected){if(!can('sales')||d.type!=='sale'||d.void||d.draft)throw new Error(no+': only a posted sale invoice can receive this expense charge');if(RET.some(r=>r.inv===no&&!r.void))throw new Error(no+': resolve its returns before changing charges');
  const before=bookClone(d),oldTotals=d.T,items=(d.items||[]).filter(i=>i.expenseId!==expense.id);if(expense.billToInvoice&&expense.inv===no)items.push({charge:true,expenseId:expense.id,n:expense.cat+(expense.notes?' — '+expense.notes:''),q:1,r:expense.amt,d:0,dt:'amt',tx:0,tt:'pct',s:0});
  const total=invoiceTotals(items),row=INV.find(r=>r[0]===no);if(!row)throw new Error('Invoice '+no+' is unavailable');if(r2(total.g)<(PAID[no]||0))throw new Error(no+': the total cannot fall below its payments');
  const delta=r2(total.g)-row[3],revenue=r2(total.sub-total.dis-(oldTotals.sub-oldTotals.dis));if(delta||revenue){if(postSaleLedger({ref:no,date:expense.date,total:delta,sub:revenue,cost:0,acct:d.acct||'Sales',narr:'Expense charge '+expense.id+' · '+no})===false)throw new Error('Could not post the invoice charge')}
  d.items=items;d.T=total;row[3]=r2(total.g);row[4]=row[3]-(PAID[no]||0)<=0?'Paid':(PAID[no]||0)>0?'Partial':'Unpaid';if(d.bal)d.bal.total=r2(d.bal.prev+total.g);
  AUDIT.push({id:'audit-'+Date.now()+'-'+AUDIT.length,at:new Date().toISOString(),action:'Update linked expense charge',ref:no,by:S.user?S.user.n:'',before,after:bookClone(d)});
 }
}
