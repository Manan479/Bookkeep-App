// features/parties.js - Feature: parties (screens and the actions behind them).
const newCust=n=>{if(S.itype==='dist'&&!S.dsel){toast('Choose a distributor first');return}S.cf={name:n,dist:S.itype==='dist'?S.dsel:'',sup:S.itype==='pur'};S.back=S.screen;S.screen='cust';render()};
const custBack=()=>{S.screen=S.back||null;S.back=null;render()};
const termsDue=q=>{const d=CUSTD[S.itype==='pur'?S.sup:S.cust];if(d){S.d.due=plus(S.d.inv,d.terms);S.noDue=false}if(!q)render(false,true)};
function custScr(){const c=S.cf||{};return `<div class="scr full"><div class="top"><button class="ic" onclick="custBack()">‹</button><h1>${c.edit?'Edit '+c.edit:c.party?'New party':c.dealer?'New distributor':c.sup?'New supplier':c.dist?'New customer of '+c.dist:'New customer'}</h1><span style="width:38px"></span></div>
<div class="gh" style="margin-top:0"><b>Basic details</b></div>
<div class="f"><label class="w"><small>Name *</small><input id="c_n" value="${c.name||''}"></label><label class="w"><small>Business or company name</small><input id="c_b"></label><label><small>Phone</small><input id="c_p" type="tel"></label><label><small>WhatsApp</small><input id="c_w" type="tel"></label><label class="w"><small>Email</small><input id="c_e" type="email"></label></div>
<div class="gh"><b>Address</b></div>
<div class="f"><label class="w"><small>Street address</small><input id="c_a"></label><label><small>City</small><input id="c_c"></label><label><small>Country</small><input id="c_k"></label></div>
<div class="gh"><b>Tax</b></div>
<div class="f"><label><small>Tax ID type</small><select id="c_tt">${['Tax ID','NTN','STRN','CNIC','VAT number','GSTIN','PAN','EIN','TRN'].map(x=>'<option>'+x+'</option>').join('')}</select></label><label><small>Tax ID number</small><input id="c_tn"></label></div>
<div class="gh"><b>Credit and balance</b></div>
<div class="f"><label><small>Credit limit</small><input id="c_cl" type="number"></label><label><small>Payment terms</small><select id="c_pt"><option value="0">Due on receipt</option><option value="7">Net 7 days</option><option value="15" selected>Net 15 days</option><option value="30">Net 30 days</option><option value="60">Net 60 days</option></select></label><label><small>Opening balance</small><input id="c_ob" type="number"></label><label><small>Balance type</small><select id="c_bt"><option value="r">They owe me</option><option value="p">I owe them</option></select></label></div>
<div class="gh"><b>Other</b></div>
<div class="f"><label class="w"><small>Notes</small><input id="c_no"></label></div>
${c.dist?'':'<div class="gh"><b>Roles</b><span>One party can be all three</span></div><div class="card" style="margin-bottom:10px">'+[['c_rc','Customer',roleOn(c,'c')],['c_rs','Supplier',roleOn(c,'s')]].concat(S.dist?[['c_rd','Distributor',roleOn(c,'d')]]:[]).map(r=>'<div class="row" style="border:0;padding:8px 0;margin:0;background:none"><span class="grow t">'+r[1]+'</span><button class="tg '+(r[2]?'on':'')+'" id="'+r[0]+'" onclick="this.classList.toggle(\'on\')"></button></div>').join('')+'</div>'}</div>
<div class="bar-act"><button class="btn" onclick="custBack()">Cancel</button><button class="btn p" onclick="saveCust()">Save customer</button></div>`}
function saveCust(){const g=id=>$('#'+id).value.trim(),name=g('c_n');if(!name){toast('Enter a name');return}
const cf=S.cf||{},has=(a,n)=>a.some(x=>x.toLowerCase()===n.toLowerCase()),on=id=>{const e=$('#'+id);return !!e&&e.classList.contains('on')};
const det={biz:g('c_b'),phone:g('c_p'),wa:g('c_w'),email:g('c_e'),addr:g('c_a'),city:g('c_c'),country:g('c_k'),taxType:g('c_tt'),taxNo:g('c_tn'),limit:+g('c_cl')||0,terms:+$('#c_pt').value,ob:+g('c_ob')||0,obt:$('#c_bt').value,notes:g('c_no')};
if(cf.dist){const l=DCU[cf.dist];if(has(l,name)){toast(name+' already exists');return}l.push(name);CUSTD[name]=det;if(S.back==='inv')S.dcust=name;S.screen=S.back||null;S.back=null;render();toast('Customer added');return}
const rc=on('c_rc'),rs=on('c_rs'),rd=on('c_rd');
if(!rc&&!rs&&!rd){toast('Pick at least one role');return}
const ex=has(CUST,name)||has(SUPP,name)||DIST.some(x=>x.n.toLowerCase()===name.toLowerCase());
if(!cf.edit&&ex){toast(name+' already exists. Open them in Parties and add the role there.');return}
if(cf.edit){const d0=DIST.find(x=>x.n===name);
if(!rc&&CUST.includes(name)&&INV.some(x=>x[1]===name)){toast('Has sales, so the customer role stays');return}
if(!rs&&SUPP.includes(name)&&(PUR.some(x=>x[1]===name)||PAYB.some(x=>x[1]===name))){toast('Has purchases, so the supplier role stays');return}
if(!rd&&d0&&(d0.owed!==0||(DCU[name]||[]).length)){toast('Has distributor activity, so the role stays');return}}
const ad=(a,r)=>{const i=a.indexOf(name);if(r&&i<0)a.push(name);if(!r&&i>=0)a.splice(i,1)};
ad(CUST,rc);ad(SUPP,rs);
let d=DIST.find(x=>x.n===name);
if(rd&&!d){d={n:name,a:'',p:'',t:'',b:'',owed:0,sold:0};DIST.push(d);DCU[name]=DCU[name]||[]}
if(!rd&&d)DIST.splice(DIST.indexOf(d),1);
if(rd&&d){d.a=[det.addr,det.city].filter(Boolean).join(', ')||d.a||'-';d.p=det.phone||d.p||'-';d.t=(det.taxType+' '+det.taxNo).trim()||d.t}
CUSTD[name]=det;
if(S.back==='inv'){if(cf.sup&&rs){S.sup=name;termsDue(true)}else if(!cf.sup&&rc){S.cust=name;termsDue(true)}}
S.screen=S.back||null;S.back=null;render();toast(cf.edit?'Details saved':'Party added')}
const setPT=t=>{S.ptf=t;tick();render(false,true)};
function ptRows(){const f=S.ptf||'All',q=(S.q||'').toLowerCase(),map={Customers:'c',Suppliers:'s',Distributors:'d'};
const r=parties().map((p,i)=>[p,i]).filter(x=>(f==='All'||x[0][map[f]])&&x[0].n.toLowerCase().includes(q));
return r.length?r.map((x,k)=>{const p=x[0],b=pbal(p),d=CUSTD[p.n]||{};return `<button class="row" style="animation-delay:${k*30}ms" onclick="openParty(${x[1]})"><div class="av">${p.n.split(' ').map(w=>w[0]).join('').slice(0,2)}</div><div class="grow"><div class="t">${p.n}</div><div class="lbl sm">${roleTxt(p)}${d.phone?' · '+d.phone:''}</div></div><div class="r"><div class="t ${b>0?'grn':b<0?'red':''}">${fmt(Math.abs(b))}</div><div class="lbl sm">${b>0?'owes you':b<0?'you owe':'settled'}</div></div></button>`}).join(''):'<div class="card" style="text-align:center;padding:30px"><div style="font-size:30px">👥</div><div class="t">No parties found</div><div class="lbl">Try another filter or add a new party.</div></div>'}
function ptScr(){const _f=S.ptf||'All',_q=(S.q||'').toLowerCase(),_all=parties().filter(p=>_q?p.n.toLowerCase().includes(_q):true).filter(p=>_f==='All'||(_f==='Customers'&&p.c)||(_f==='Suppliers'&&p.s)||(_f==='Distributors'&&p.d));
 // A balance goes out as a SIDE, never as a signed number: positive means they owe you (a debit), negative
 // means you owe them (a credit). Adding c-s, as this first did, ADDED the two sides instead of netting them.
 setExport('Parties',['Name','Customer','Supplier','Distributor','Debit (owes you)','Credit (you owe)'],_all.map(p=>{const b=pbals({n:p.n,c:true,s:true,d:true}),net=r2(b.c+b.s+b.d);return[p.n,p.c?'yes':'',p.s?'yes':'',p.d?'yes':'',net>0?net:0,net<0?r2(-net):0]}));const T=S.dist?['All','Customers','Suppliers','Distributors']:['All','Customers','Suppliers'];
return `<div class="scr"><div class="top"><button class="ic" onclick="S.screen=null;S.q='';render()">‹</button><h1>${tr('Parties')}</h1><button class="ic" onclick="exportSheet()">⇪</button></div><div class="shead"><input class="search" placeholder="${tr('Search parties')}" value="${S.q||''}" oninput="S.q=this.value;document.getElementById('ptl').innerHTML=ptRows()">${chips(T,S.ptf||'All','setPT')}</div><div id="ptl">${ptRows()}</div></div><button class="fab" style="bottom:24px" onclick="newParty()">+ ${tr('Add party')}</button>`}
const openParty=i=>{S.pk=parties()[i];S.screen='pd';render()};
const newParty=()=>{S.cf={name:'',party:true};S.back='pt';S.screen='cust';render()};
function pdScr(){const p=parties().find(x=>x.n===S.pk.n)||S.pk,d=CUSTD[p.n]||{},B=pbals(p),b=B.c+B.s+B.d;
const tx=[...INV.filter(x=>x[1]===p.n).map(x=>[x,'Sale']),...(p.d?INV.filter(x=>x[1].indexOf(p.n+' >')===0).map(x=>[x,'Distributor sale']):[]),...PUR.filter(x=>x[1]===p.n).map(x=>[x,'Purchase'])];
const info=[['Phone',d.phone],['WhatsApp',d.wa],['Email',d.email],['Address',[d.addr,d.city,d.country].filter(Boolean).join(', ')],['Tax ID',[d.taxType,d.taxNo].filter(Boolean).join(' ')],['Credit limit',d.limit?fmt(d.limit):''],['Payment terms',d.terms!=null?(d.terms?'Net '+d.terms+' days':'Due on receipt'):''],['Notes',d.notes]].filter(x=>x[1]);
const br=[p.c&&['As customer',B.c],p.d&&['As distributor',B.d],p.s&&['As supplier',B.s]].filter(Boolean);
return `<div class="scr full"><div class="top"><button class="ic" onclick="S.screen='pt';render()">‹</button><h1>${p.n}</h1><button class="ic" onclick="editParty()">✎</button></div>
<div class="hero" style="display:block"><div class="lbl">${b>0?'Owes you':b<0?'You owe':'Settled'}${br.length>1?' (net)':''}</div><div class="num" data-n="${Math.abs(b)}"></div><div class="sm">${roleTxt(p)}</div></div>
<div style="display:flex;gap:10px;margin-bottom:10px">${p.c||p.d?'<button class="btn p" onclick="newPay(\'in\',S.pk.n)">Receive</button>':''}${p.s?'<button class="btn" onclick="newPay(\'out\',S.pk.n)">Pay</button>':''}<button class="btn" onclick="openStmt(S.pk.n)">Statement</button></div>
${br.length>1?'<div class="card tbl" style="margin-bottom:10px">'+br.map(x=>'<div class="tr"><span class="lbl">'+x[0]+'</span><span class="'+(x[1]>0?'grn':x[1]<0?'red':'')+'">'+(x[1]>0?'owes you ':x[1]<0?'you owe ':'')+fmt(Math.abs(x[1]))+'</span></div>').join('')+'</div>':''}
${p.d?'<button class="btn p" style="width:100%;flex:none;margin-bottom:10px" onclick="S.di=DIST.findIndex(x=>x.n===S.pk.n);S.screen=\'dd\';render()">Open distributor page</button>':''}
${info.length?'<div class="card tbl">'+info.map(x=>'<div class="tr"><span class="lbl">'+x[0]+'</span><span style="text-align:right">'+x[1]+'</span></div>').join('')+'</div>':'<div class="card lbl">No details saved yet. Tap the pencil to add phone, address and more.</div>'}
<div class="gh"><b>Transactions</b><span>${tx.length}</span></div>${tx.map(x=>`<div class="row"><div class="grow"><div class="t">${x[0][0]}</div><div class="lbl sm">${x[0][5]} · ${x[1]}</div></div><div class="r"><div class="t">${fmt(x[0][3])}</div><span class="badge b-${x[0][4]}">${x[0][4]}</span></div></div>`).join('')||'<div class="lbl" style="padding:8px">No transactions yet.</div>'}</div>`}
function editParty(){S.cf={edit:S.pk.n};S.back='pd';S.screen='cust';render();fillParty()}
function fillParty(){const n=S.cf.edit,d=CUSTD[n]||{},set=(id,v)=>{const e=$('#'+id);if(e&&v!=null&&v!=='')e.value=v};set('c_n',n);$('#c_n').disabled=true;set('c_b',d.biz);set('c_p',d.phone);set('c_w',d.wa);set('c_e',d.email);set('c_a',d.addr);set('c_c',d.city);set('c_k',d.country);set('c_tt',d.taxType);set('c_tn',d.taxNo);set('c_cl',d.limit);set('c_pt',d.terms!=null?String(d.terms):'15');set('c_ob',d.ob);set('c_bt',d.obt);set('c_no',d.notes)}
