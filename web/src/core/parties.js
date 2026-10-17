// core/parties.js - Party roles (customer, supplier, distributor) and balances. No screen code.
const roleOn=(c,k)=>c.edit?(k==='c'?CUST.includes(c.edit):k==='s'?SUPP.includes(c.edit):DIST.some(x=>x.n===c.edit)):(k==='s'?!!c.sup:k==='d'?!!c.dealer:!c.sup&&!c.dealer);
const parties=()=>{const names=[];[...CUST.filter(n=>n!=='Walk-in'),...SUPP,...(S.dist?DIST.map(d=>d.n):[])].forEach(n=>{if(!names.some(x=>x.toLowerCase()===n.toLowerCase()))names.push(n)});return names.map(n=>({n,c:CUST.includes(n),s:SUPP.includes(n),d:!!S.dist&&DIST.some(x=>x.n===n)}))};
const pbals=p=>{const o=CUSTD[p.n]||{},ob=o.ob?(o.obt==='p'?-o.ob:o.ob):0;return{c:p.c?INV.filter(x=>x[1]===p.n&&x[4]!=='Paid'&&x[4]!=='Draft'&&x[4]!=='Void').reduce((a,x)=>a+x[3]-(PAID[x[0]]||0),0)+ob-(ADV['c:'+p.n]||0):0,s:p.s?-PAYB.filter(x=>x[1]===p.n).reduce((a,x)=>a+x[3],0)+(p.c?0:ob)+(ADV['s:'+p.n]||0):0,d:p.d?(DIST.find(x=>x.n===p.n)||{owed:0}).owed-(ADV['d:'+p.n]||0):0}};
const pbal=p=>{const b=pbals(p);return b.c+b.s+b.d};
const roleTxt=p=>[p.c&&'Customer',p.s&&'Supplier',p.d&&'Distributor'].filter(Boolean).join(' · ');
const roleOpts=()=>{const m=S.pm,n=m.party;if(!n)return[];return m.dir==='in'?[CUST.includes(n)&&'c',S.dist&&DIST.some(x=>x.n===n)&&'d'].filter(Boolean):[SUPP.includes(n)&&'s'].filter(Boolean)};
const partyNames=()=>{const l=S.pm.dir==='in'?[...CUST.filter(n=>n!=='Walk-in'),...(S.dist?DIST.map(d=>d.n):[])]:SUPP;return l.filter((n,i)=>l.indexOf(n)===i)};
