// tests/void.test.js - the admin-only "delete" for invoices, purchases and payments.
// It is a void, not a hard delete: the document stays in the register marked Void, while its stock, ledger and
// payable/receivable effects are reversed. The tests below prove both the book and the stock come back.
(function(){
  USERS.length=0;USERS.push({id:'u1',n:'Admin',role:'admin',pin:'1234',active:true});
  S.user={id:'u1',n:'Admin',role:'admin'};
  loadDemo();
  if(!USERS.length)USERS.push({id:'u1',n:'Admin',role:'admin',pin:'1234',active:true});

  const hasPay=no=>PAYM.some(p=>!p.void&&p.alloc&&p.alloc[no]!==undefined)||(PAID[no]||0)>0;
  const hasRet=no=>RET.some(r=>r.inv===no&&!r.void);
  const pick=arr=>arr.find(r=>r[4]!=='Void'&&!hasPay(r[0])&&!hasRet(r[0])&&INVD[r[0]]&&!INVD[r[0]].draft);

  // ---- a sale -----------------------------------------------------------------------------------------------
  const sale=pick(INV);
  T('there is a posted sale with no payments or returns to test with',!!sale);
  if(sale){
    const no=sale[0],d=INVD[no],line=d.items.find(i=>i.q>0),p=PRD.find(x=>dn(x)===line.n);
    const stockBefore=p?p[2]:0, ledgerBefore=ledFor(no).length;
    T('the sale has a ledger entry before it is voided',ledgerBefore>0);
    T('an administrator can void it',voidDoc(no)===true);
    eq('the row is marked Void, not removed',INV.find(r=>r[0]===no)[4],'Void');
    T('the snapshot is flagged void too',d.void===true);
    T('its ledger entries no longer count',ledFor(no).length===0);
    T('the goods came back into stock',!p||p[2]===stockBefore+line.q);
    eq('the trial balance still balances',trialRows().diff,0);
  }

  // ---- a purchase -------------------------------------------------------------------------------------------
  // The sample business pays most purchases; voiding the document is only allowed once its payments are void,
  // so clear them first — which is also the rule the screen follows.
  const pur=PUR.find(r=>r[4]!=='Void'&&!hasRet(r[0])&&INVD[r[0]]&&!INVD[r[0]].draft);
  T('there is a posted purchase to test with',!!pur);
  if(pur){
    PAYM.filter(p=>!p.void&&p.alloc&&p.alloc[pur[0]]!==undefined).forEach(p=>voidPm(p));
    const no=pur[0],d=INVD[no],line=d.items.find(i=>i.q>0),p=PRD.find(x=>dn(x)===line.n);
    const stockBefore=p?p[2]:0;
    T('an administrator can void the purchase',voidDoc(no)===true);
    eq('the purchase is marked Void',PUR.find(r=>r[0]===no)[4],'Void');
    T('the trial balance still balances after it',trialRows().diff===0);
    T('the payable for it is gone',!PAYB.some(x=>x[2]===no&&x[0]==='Suppliers'));
    T('the purchased stock was taken back out',!p||p[2]===stockBefore-line.q);
  }

  // ---- refusals ---------------------------------------------------------------------------------------------
  const paid=INV.find(r=>r[4]!=='Void'&&hasPay(r[0])&&INVD[r[0]]&&!INVD[r[0]].draft);
  T('there is a paid invoice to test the refusal with',!!paid);
  if(paid){
    const before=paid[4];
    T('an invoice with payments cannot be voided until they are',voidDoc(paid[0])===false);
    eq('and its status is untouched',INV.find(r=>r[0]===paid[0])[4],before);
  }

  // ---- only an administrator --------------------------------------------------------------------------------
  const victim=pick(INV);
  if(victim){
    S.user={id:'u2',n:'Manager',role:'manager'};
    USERS.push({id:'u2',n:'Manager',role:'manager',pin:'1111',active:true});
    T('a manager cannot void an invoice',voidDoc(victim[0])===false&&INV.find(r=>r[0]===victim[0])[4]!=='Void');
    T('and is not treated as an administrator',isAdmin()===false);
    S.user={id:'u1',n:'Admin',role:'admin'};
  }

  // ---- a payment --------------------------------------------------------------------------------------------
  const pm=PAYM.find(x=>!x.void&&x.amt>0);
  T('there is a payment to void',!!pm);
  if(pm){
    S.user={id:'u2',n:'Manager',role:'manager'};
    T('a manager cannot void a payment',voidPm(pm)===false&&pm.void!==true);
    S.user={id:'u1',n:'Admin',role:'admin'};
    T('an administrator can void the payment',voidPm(pm)===true);
    T('and it is marked void',pm.void===true);
    eq('the trial balance balances after the payment void',trialRows().diff,0);
  }
})();
