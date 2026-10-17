// persist.test.js - saved data comes back after a reload.
INVD['INV-9']={type:'sale',party:'Z',items:[{n:'a',q:1,r:2}],T:{g:2},bal:{prev:5,total:7},showBal:true,synth:true};
EXP.unshift({id:'EXP-0099',cat:'Rent',amt:7,date:'2026-10-01',payee:'p',acct:'Cash',inv:'',notes:'',img:'data:image/png;base64,AAA',void:false});
QUOT.unshift({no:'QT-0009',party:'Q',items:[],T:{g:1},date:'2026-10-01',valid:'',status:'Sent',conv:[]});
COMP.name='Persist Co';COMP.logo='data:image/png;base64,BBB';TPL.accent='#B4232C';TPL.bal=true;SET.cost='fifo';SET.done=true;S.n=777;S.en=42;
JRN.unshift({id:'JV-0009',date:'2026-10-01',narr:'x',lines:[],void:false,of:''});RET.unshift({id:'CN-0009'});CATS.push('Insurance');COA.push('Loan');
save();
delete INVD['INV-9'];EXP.length=0;QUOT.length=0;COMP.name='';COMP.logo='';TPL.accent='';TPL.bal=false;SET.cost='avg';SET.done=false;S.n=1;S.en=1;JRN.length=0;RET.length=0;CATS.pop();COA.pop();
load();
T('invoice snapshot restored',INVD['INV-9']&&INVD['INV-9'].bal.prev===5&&INVD['INV-9'].synth===true);
T('expense and photo restored',EXP[0].id==='EXP-0099'&&EXP[0].img.length>10);
T('quote restored',QUOT[0].no==='QT-0009');
T('company restored',COMP.name==='Persist Co'&&COMP.logo.length>5);
T('template restored',TPL.accent==='#B4232C'&&TPL.bal===true);
T('settings restored',SET.cost==='fifo'&&SET.done===true);
T('counters restored',S.n===777&&S.en===42);
T('journal, return, lists restored',JRN[0].id==='JV-0009'&&RET[0].id==='CN-0009'&&CATS.includes('Insurance')&&COA.includes('Loan'));
