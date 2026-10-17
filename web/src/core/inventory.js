// core/inventory.js - Product naming, FIFO layers, stock valuation and cost. No screen code.
const dn=p=>p[0]+(p[4]?' - '+p[4]:'');
const bc=p=>PRD.filter(x=>x[0]===p[0]).length;
const drate=i=>i.dr!=null?+i.dr:(DRATE[i.n]||Math.round(i.r*.85)),ccost=i=>SET.cost==='fifo'?((lay(i.n)[0]||{}).c||CO[i.n]||Math.round((PRICE[i.n]||i.r)*.8)):(CO[i.n]||Math.round((PRICE[i.n]||i.r)*.8));
const lay=n=>{if(!LAY[n]){const p=PRD.find(x=>dn(x)===n),st=p?Math.max(p[2],0):0;LAY[n]=st>0?[{q:st,c:CO[n]||Math.round((PRICE[n]||0)*.8)}]:[]}return LAY[n]};
const stockVal=p=>{const n=dn(p),q=p[2];if(q===0)return 0;const c=CO[n]||Math.round((PRICE[n]||0)*.8);
// Goods sold before they were bought keep their last known cost. Valuing them at nothing would make the
// shelf disagree with the book, which has relieved a real cost for them; a negative figure is the honest
// one, and it is what the missing purchase will settle.
if(q<0)return q*c;
if(SET.cost!=='fifo')return q*c;let v=0,left=q;for(const l of lay(n)){const t=Math.min(left,l.q);v+=t*l.c;left-=t;if(left<=0)break}return v+left*c};

// Records what a product is expected to cost next time, and, for a brand-new product, the cost its
// opening stock is valued at. An EDIT must never touch CO: CO is the costing basis, it comes from what
// was actually paid, and moving it here would silently restate stock that is already on the shelf.
// Whether the figure should ever move that stock is a separate question - see HANDOFF.md, "changing a
// product's cost".
function setProductCost(name,expected,isNew){
  const v=r2(expected);
  BUY[name]=v>0?v:0;
  if(isNew&&v>0)CO[name]=v;
}

// ---- valuing a quantity that moves with no invoice behind it --------------------------------------
// The stock report falls back to the average purchase cost, or four fifths of the sale price when
// nothing has been bought yet. stockVal() applies that same rule to stock it has no layer for.
const stockFallback=n=>CO[n]||Math.round((PRICE[n]||0)*.8);
// What a quantity joining the shelf is worth. The caller adds its layer at the same cost, so the report
// and the ledger put the same figure on what arrived.
const stockInVal=(name,qty)=>r2(qty*stockFallback(name));
// What a quantity leaving the shelf is worth, valued exactly as stockVal() values it: FIFO costs the
// layers it actually takes and values any shortfall at the fallback; average cost takes the average.
function stockOutVal(name,qty){
  const c=stockFallback(name);
  if(SET.cost!=='fifo')return r2(qty*c);
  let v=0,left=qty;
  for(const l of lay(name)){const t=Math.min(left,l.q);v+=t*l.c;left-=t;if(left<=0)break}
  return r2(v+left*c);
}

// ---- the cost pool behind CO ------------------------------------------------------------------------
// CO is what the stock report values stock with, and it is DERIVED from what was actually paid, never
// rolled forward. BQ/BA remember how many units have entered stock at a cost and what they were worth
// together, so a purchase can be taken back out exactly when its invoice is corrected and the average
// that comes out is the true one. A rolling average cannot be un-done, which is what made a correction
// to a purchase whose goods had partly sold impossible to post.
// The pool is a cost basis, not an accounting total: an opening stock seeds it on the first purchase,
// and documents that move goods at the current average (sale returns, stock adjustments) leave it alone.
const recost=n=>{if(BQ[n]>0)CO[n]=Math.round(BA[n]/BQ[n]);return CO[n]};
function buyIn(n,q,amt){
  if(BQ[n]===undefined){const p=PRD.find(x=>dn(x)===n),st=p?Math.max(p[2],0):0;BQ[n]=st;BA[n]=r2(st*stockFallback(n))}
  BQ[n]=r2(BQ[n]+q);BA[n]=r2(BA[n]+amt);return recost(n);
}
function buyOut(n,q,amt){
  if(BQ[n]===undefined)return CO[n];
  BQ[n]=r2(BQ[n]-q);BA[n]=r2(BA[n]-amt);
  if(BQ[n]<=0){BQ[n]=0;BA[n]=0;return CO[n]}
  return recost(n);
}
// What one purchase line puts into the pool. It is the whole tax-inclusive value of the line, the same
// figure the ledger puts into Inventory: quantity x rate, less its discount, plus its tax.
const lineCost=i=>r2(i.q*i.r-ld(i)+lt(i));

// Inventory on the book and the stock report must be the same number. Correcting a purchase whose goods
// have partly sold leaves them apart by exactly the half that has already sold, so moving Inventory to
// what the shelf is worth puts that difference in Cost of goods sold - where the sold half belongs.
// No new account is needed, and the two can never drift apart again.
function reconcileStock(ref,date,narr){
  const diff=r2(PRD.reduce((a,p)=>a+stockVal(p),0)-ledBal('Inventory'));
  if(diff===0)return null;
  return postStockLedger({ref:ref,date:date||tdy,value:diff,acc:'Cost of goods sold',narr:narr||('Cost restated · '+ref)});
}
