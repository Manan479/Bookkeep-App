// features/staff.js - employees: salaries, bonuses, what they are owed, and advances they owe back.
const empId=()=>num('emp',EMP.length+1);
function stfScr(){setExport('Employees',['Name','Code','Designation','Phone','Joined','Salary','Owed to them','Advance out'],EMP.map(e=>[e.n,e.code||'',e.desig||'',e.phone||'',e.join||'',e.basic||0,empBal(e.n),staffAdv(e.n)]));const due=salaryDue(monthOf(tdy)),owed=activeEmp().reduce((a,e)=>a+empBal(e.n),0),adv=EMP.reduce((a,e)=>a+staffAdv(e.n),0);
 return `<div class="scr"><div class="top"><button class="ic" onclick="S.screen=null;render()">‹</button><h1>Employees</h1><button class="ic" onclick="exportSheet()">⇪</button><button class="ic" onclick="stfForm(-1)">＋</button></div>
 ${due.length?`<div class="card" style="margin-bottom:10px"><div class="t">${due.length} salary${due.length===1?'':'ies'} due for ${monthOf(tdy)}</div><div class="lbl sm">${due.map(e=>e.n).join(', ')}. Nothing is accrued until you say so.</div><button class="btn p" style="width:100%;flex:none;margin-top:10px" onclick="accrueSalaries()">Run them now</button></div>`:''}
 <div class="grid"><div class="card"><div class="lbl">Owed to staff</div><div class="num">${fmt(owed)}</div></div><div class="card"><div class="lbl">Advances out</div><div class="num">${fmt(adv)}</div></div></div>
 ${EMP.map((e,k)=>`<button class="row" onclick="stfPage(${k})"><div class="av">${ini2(e.n)}</div><div class="grow"><div class="t">${e.n}${e.active===false?' · left':''}</div><div class="lbl sm">${[e.desig,e.recur?'recurring':'',empBal(e.n)>0?fmt(empBal(e.n))+' owed':''].filter(Boolean).join(' · ')||'—'}</div></div><div class="r">${staffAdv(e.n)>0?`<span class="badge b-Partial">${fmt(staffAdv(e.n))} adv</span>`:''}<span>›</span></div></button>`).join('')||'<div class="card" style="text-align:center;padding:30px"><div style="font-size:30px">👷</div><div class="t">No employees yet</div><div class="lbl">Add one to pay salaries and keep advances straight.</div></div>'}
 </div>`}
function stfPage(k){S.stfk=k;S.screen='stfp';render()}
function stfPageScr(){const k=S.stfk,e=EMP[k]||{};if(!e.n)return '<div class="scr"><div class="card lbl">That employee is no longer here.</div></div>';
 const b=empBal(e.n),a=staffAdv(e.n),runs=SAL.filter(x=>x.emp===e.n),pays=STFP.filter(x=>x.emp===e.n),advs=EMPA.filter(x=>x.emp===e.n);
 return `<div class="scr full"><div class="top"><button class="ic" onclick="S.screen='stf';render()">‹</button><h1>${e.n}</h1><button class="ic" onclick="stfForm(${k})">✎</button></div>
 <div class="grid"><div class="card"><div class="lbl">You owe ${e.n.split(' ')[0]}</div><div class="num">${fmt(b)}</div></div><div class="card"><div class="lbl">Advance outstanding</div><div class="num">${fmt(a)}</div></div></div>
 <div class="card tbl"><div class="tr"><span class="lbl">Designation</span><span>${e.desig||'-'}</span></div><div class="tr"><span class="lbl">Code</span><span>${e.code||'-'}</span></div><div class="tr"><span class="lbl">Phone</span><span>${e.phone||'-'}</span></div><div class="tr"><span class="lbl">Joined</span><span>${e.join?fmtS(e.join):'-'}</span></div><div class="tr"><span class="lbl">Salary</span><span>${fmt(e.basic||0)}${e.recur?' · every month on day '+e.day:' · run when you like'}</span></div>${e.notes?'<div class="tr"><span class="lbl">Notes</span><span style="text-align:right">'+e.notes+'</span></div>':''}</div>
 <div class="bar-act"><button class="btn" onclick="advanceSheet(${k})">Advance</button><button class="btn" onclick="staffPaySheet(${k})">Pay ${e.n.split(' ')[0]}</button><button class="btn p" onclick="salarySheet(${k})">Run salary</button></div>
 <div class="gh"><b>Salary runs</b><span>${runs.length}</span></div>
 ${runs.slice().reverse().map(x=>`<button class="row" onclick="S.skk=x;S.screen='skd';render()"><div class="grow"><div class="t">${fmt(x.net)}</div><div class="lbl sm">${fmtS(x.date)}${x.bonus?' · bonus '+fmt(x.bonus):''}${x.recov?' · advance back '+fmt(x.recov):''}</div></div><span>›</span></button>`).join('')||'<div class="lbl" style="padding:8px">No salary run yet.</div>'}
 <div class="gh"><b>Paid to ${e.n.split(' ')[0]}</b><span>${pays.length}</span></div>
 ${pays.slice().reverse().map(x=>`<div class="row" style="cursor:default"><div class="grow"><div class="t">${fmt(x.amt)}</div><div class="lbl sm">${fmtS(x.date)} · ${x.acct}</div></div></div>`).join('')||'<div class="lbl" style="padding:8px">Nothing paid yet.</div>'}
 <div class="gh"><b>Advances</b><span>${advs.length}</span></div>
 ${advs.slice().reverse().map(x=>`<div class="row" style="cursor:default"><div class="grow"><div class="t">${fmt(x.amt)}</div><div class="lbl sm">${fmtS(x.date)}${x.per?' · '+fmt(x.per)+' back a month':''}</div></div></div>`).join('')||'<div class="lbl" style="padding:8px">No advances.</div>'}
 </div>`}
function stfForm(k){const e=k<0?{n:'',code:empId(),desig:'',phone:'',join:tdy,basic:0,recur:false,day:1,active:true,notes:''}:EMP[k];
 const o=document.createElement('div');o.className='ov';
 o.innerHTML=`<div class="sheet"><div class="grab"></div><b style="font-size:17px">${k<0?'Add employee':'Edit employee'}</b>
 <div class="f" style="margin-top:10px"><label class="w"><small>Name</small><input id="en" value="${e.n}"></label>
 <label><small>Code</small><input id="ec" value="${e.code}"></label>
 <label><small>Designation</small><input id="ed" value="${e.desig}"></label>
 <label><small>Phone</small><input id="ep" value="${e.phone}"></label>
 <label><small>Joined</small><button class="dbtn" onclick="pick(S.efm.join,v=>{S.efm.join=v;render(false,true)},false)">${fmtS(e.join||tdy)}</button></label>
 <label><small>Monthly salary</small><input id="eb" type="number" value="${e.basic||0}"></label>
 <label><small>Paid every month</small><select id="er"><option value="1" ${e.recur?'selected':''}>Yes, recurring</option><option value="0" ${e.recur?'':'selected'}>No, run it myself</option></select></label>
 <label><small>On day</small><input id="ey" type="number" value="${e.day||1}"></label>
 <label><small>Still working</small><select id="ea"><option value="1" ${e.active!==false?'selected':''}>Yes</option><option value="0" ${e.active===false?'selected':''}>No, left</option></select></label>
 <label class="w"><small>Notes</small><input id="ez" value="${e.notes||''}"></label></div>
 <div class="lbl sm" style="margin-top:8px">A recurring salary shows up as due each month; nothing is posted until you run it.</div>
 <div class="bar-row" style="margin-top:12px"><button class="btn" id="eu">Cancel</button><button class="btn p" id="es">Save</button></div></div>`;
 S.efm={join:e.join||tdy};o.onclick=t=>{if(t.target===o)o.remove()};$('#app').append(o);
 $('#eu').onclick=()=>o.remove();
 $('#es').onclick=()=>{const bad=saveEmp(k,{n:$('#en').value,code:$('#ec').value,desig:$('#ed').value,phone:$('#ep').value,join:S.efm.join,basic:+$('#eb').value||0,recur:$('#er').value==='1',day:+$('#ey').value||1,active:$('#ea').value==='1',notes:$('#ez').value});
  if(bad){toast(bad);return}o.remove();render();toast('Employee saved')}}
const empProblem=(k,o)=>{const n=String(o.n||'').trim();if(!n)return 'Enter a name';if(EMP.some((x,i)=>i!==k&&x.n===n))return 'There is already an employee called '+n;return ''};
function saveEmp(k,o){if(empProblem(k,o))return 'blocked';const n=String(o.n).trim();
 if(k<0)EMP.push({n:n,code:o.code||empId(),desig:o.desig||'',phone:o.phone||'',join:o.join||tdy,basic:r2(o.basic),recur:!!o.recur,day:o.day||1,active:o.active!==false,notes:o.notes||''});
 else EMP[k]=Object.assign({},EMP[k],{n:n,code:o.code,desig:o.desig,phone:o.phone,join:o.join,basic:r2(o.basic),recur:!!o.recur,day:o.day||1,active:o.active!==false,notes:o.notes||''});
 return ''}
function sheetWrap(title,body,ok,onOk){const o=document.createElement('div');o.className='ov';
 o.innerHTML=`<div class="sheet"><div class="grab"></div><b style="font-size:17px">${title}</b>${body}<div class="bar-row" style="margin-top:12px"><button class="btn" id="wc">Cancel</button><button class="btn p" id="wo">${ok}</button></div></div>`;
 o.onclick=t=>{if(t.target===o)o.remove()};$('#app').append(o);wire(o,'#wc',()=>o.remove());
 wire(o,'#wo',()=>{if(onOk()!==false){o.remove();render()}});return o}
function salarySheet(k){const e=EMP[k],rec=recovDue(e.n,e.basic),body=`<div class="f" style="margin-top:10px"><label class="w"><small>Basic</small><input id="sb" type="number" value="${e.basic||0}"></label><label><small>Bonus</small><input id="so" type="number" value="0"></label><label><small>Advance back</small><input id="sr" type="number" value="${rec}"></label></div><div class="lbl sm" style="margin-top:8px">${rec?('Recovering the advance leaves '+fmt(r2((e.basic||0)-rec))+' to pay.'):(staffAdv(e.n)>0?('They still owe '+fmt(staffAdv(e.n))+' in advances.'):'No advance outstanding.')}</div>`;
 sheetWrap('Salary · '+e.n,body,'Post salary',()=>{const t=runTotals(+$('#sb').value||0,+$('#so').value||0,+$('#sr').value||0);return postSalary(k,t)})}
function postSalary(k,t,date){const e=EMP[k],d=date||tdy,id='SAL-'+pad4(SAL.length+1);
 const rec={id:id,date:d,emp:e.n,basic:t.basic,bonus:t.bonus,recov:t.recov,net:t.net,void:false,note:S.sfn||''};
 const ent=postSalaryLedger({date:d,ref:id,emp:e.n,basic:t.basic,bonus:t.bonus,recov:t.recov,narr:(e.n+' salary '+fmtS(d))});
 if(!ent){toast('The salary entry was refused. The book will not agree until it is put right.');return false}
 SAL.push(rec);return true}
function staffPaySheet(k){const e=EMP[k],b=empBal(e.n),body=`<div class="f" style="margin-top:10px"><label><small>Amount</small><input id="pa" type="number" value="${b>0?b:0}"></label><label><small>Paid from</small><select id="pc">${ACCTS.map(a=>`<option>${a}</option>`).join('')}</select></label></div><div class="lbl sm" style="margin-top:8px">You owe ${e.n} ${fmt(b)}.</div>`;
 sheetWrap('Pay '+e.n,body,'Pay',()=>{const amt=r2($('#pa').value),acct=$('#pc').value;if(!(amt>0)){toast('Enter an amount');return false}return payStaff(e.n,amt,acct)})}
function payStaff(name,amt,acct){const id='STF-'+pad4(STFP.length+1);
 const ent=postStaffPayLedger({date:tdy,ref:id,emp:name,amt:amt,acct:acct,narr:'Paid '+name+' '+fmtS(tdy)});
 if(!ent){toast('The payment entry was refused.');return false}
 STFP.push({id:id,date:tdy,emp:name,amt:r2(amt),acct:acct});BAL[acct]=r2((BAL[acct]||0)-amt);save();return true}
function advanceSheet(k){const e=EMP[k],body=`<div class="f" style="margin-top:10px"><label><small>Advance</small><input id="aa" type="number" value="0"></label><label><small>Paid from</small><select id="ac">${ACCTS.map(a=>`<option>${a}</option>`).join('')}</select></label><label class="w"><small>Take back each month</small><input id="ar2" type="number" value="0"></label></div><div class="lbl sm" style="margin-top:8px">Leave the monthly figure at 0 to recover it by hand on each salary run. Otherwise ${e.n} pays it back a slice at a time, and a salary run never takes back more than the salary or more than is left.</div>`;
 sheetWrap('Advance · '+e.n,body,'Pay advance',()=>{const amt=r2($('#aa').value);if(!(amt>0)){toast('Enter an amount');return false}return payAdvance(e.n,amt,$('#ac').value,r2($('#ar2').value))})}
function payAdvance(name,amt,acct,per){const id='EAD-'+pad4(EMPA.length+1);
 const ent=postAdvanceLedger({date:tdy,ref:id,emp:name,amt:amt,acct:acct,narr:'Advance '+name+' '+fmtS(tdy)});
 if(!ent){toast('The advance entry was refused.');return false}
 EMPA.push({id:id,date:tdy,emp:name,amt:r2(amt),acct:acct,per:r2(per||0)});BAL[acct]=r2((BAL[acct]||0)-amt);save();return true}
// Recurring salaries: what is due is only ever OFFERED. This posts the run for every employee who is due and
// whose salary is set, one entry each, so a wrong figure can still be reversed on its own.
function accrueSalaries(){const due=salaryDue(monthOf(tdy));let n=0;
 due.forEach(e=>{const t=runTotals(e.basic,0,recovDue(e.n,e.basic));if(postSalary(EMP.indexOf(e),t))n++});
 render();toast(n?n+' salary run'+(n===1?'':'s')+' posted. Nothing has been paid out yet.':'Nothing was due')}
// The payslip is a document like any other, so it prints and shares through the same paper as an invoice.
function skdScr(){const x=S.skk,e=empByName(x.emp)||{n:x.emp};
 return docScr({title:'Salary Slip',no:x.id,date:x.date,partyLabel:'Employee',party:x.emp,
  rows:[['Basic',fmt(x.basic)],['Bonus',fmt(x.bonus)],['Advance recovered',fmt(x.recov)],['Designation',e.desig||'-'],['Still owed to them',fmt(empBal(x.emp))]],
  amountLabel:'Net pay',amount:x.net,notes:x.note||'The cost was posted when this run was made; paying it is the step on their page.',
  back:"S.screen='stfp';render()"})}
