// data/seed.js - The catalogue a new set of books starts with, and the empty data stores.
// Replaced by the real database later.
//
// THERE IS DELIBERATELY NO SAMPLE MONEY IN HERE.
// Reports now read the ledger. A hardcoded invoice, payment, expense or cash balance has no ledger
// entry behind it, so the trial balance could never agree with it, and the only way to hide that is a
// balancing plug - which is exactly what was being removed. So every record below starts empty.
//
// What is left is furniture, none of which can put the book out of balance:
//   - the chart of accounts, the category and method lists, the cash accounts
//   - the product list, with NO stock on hand (a quantity with no purchase behind it would make the
//     stock report disagree with the Inventory account)
//   - the party and distributor names and their contact details, with every figure zeroed
//   - the price lists and the distributor rates
// The first real numbers a business has come from the setup wizard, which posts the opening balances
// as proper ledger entries.

// Period names only. The invented figures that used to sit beside them drove a synthetic P&L and
// dashboard; both now read the ledger, so only the names are left.
// 'All time' sits first because it is the widest range, so the chips read as a widening timeline left to right.
const PER={'All time':1,'Today':1,'This Week':1,'This Month':1,'Last Month':1,'This Quarter':1,'This Year':1,'Custom':1};
const INV=[];
const PUR=[];
// Quantities are all zero: nothing has been bought yet.
const PRD=[['Basmati Rice 5kg','RICE-5',0,15,'Guard'],['Cooking Oil 1L','OIL-D1',0,25,'Dalda'],['Cooking Oil 1L','OIL-E1',0,25,'Eva'],['Sugar 1kg','SUG-1',0,20,''],['Wheat Flour 10kg','FLR-10',0,15,'Sunridge'],['Tea 500g','TEA-5',0,10,'Tapal']];
const PRICE={'Basmati Rice 5kg - Guard':2800,'Cooking Oil 1L - Dalda':620,'Cooking Oil 1L - Eva':595,'Sugar 1kg':180,'Wheat Flour 10kg - Sunridge':1450,'Tea 500g - Tapal':900};
const CO={};
// Users of this device. Empty means the app is open, as it was before users existed. One administrator is
// created on a fresh install with the PIN below, so the books are not left open on a new phone.
const USERS=[{n:'Admin',role:'admin',pin:'1234',active:true}];
// The cost pool behind CO: how many units have entered stock at a cost, and what they were worth
// together. CO is derived from these two, so a corrected purchase can be taken back out exactly and the
// average that comes out is the true one. A rolling average would be impossible to un-do.
const BQ={},BA={};
// What each product is expected to cost the next time it is bought, typed on the product form.
// Deliberately separate from CO. CO is the costing basis: it is what the stock report values stock with,
// and it comes from what was actually paid. Editing a product must never move it, or retyping a price
// would silently restate stock that is already on the shelf. See core/inventory.js setProductCost().
const BUY={};
const PAYB=[];
const CUST=['Walk-in','Al Noor Traders','Zara Mart','City Hardware','Hamza Stores','Metro Retail','Sana Mart','Karim Brothers','Sunrise Traders'];
const CUSTD={};
const DIST=[{n:'Karim Brothers',a:'Shop 4, Anarkali Bazaar, Lahore',p:'0321 5550123',t:'NTN 7654321-0',b:'HBL, Karim Brothers, PK36 HABB 0000 5678 9012',owed:0,sold:0},{n:'Lahore Wholesale',a:'12 Mall Road, Lahore',p:'0333 5550456',t:'NTN 3344556-1',b:'UBL, Lahore Wholesale, PK12 UNIL 0000 3456 7890',owed:0,sold:0}];
const DCU={'Karim Brothers':['Bilal General Store','Noor Mart','Rafi Traders'],'Lahore Wholesale':['Green Corner','Madina Store']};
const DRATE={'Basmati Rice 5kg - Guard':2500,'Cooking Oil 1L - Dalda':560,'Cooking Oil 1L - Eva':540,'Sugar 1kg':160,'Wheat Flour 10kg - Sunridge':1300,'Tea 500g - Tapal':800};
const SUPP=['Prime Oils','Metro Packaging','Sunrise Traders','Global Foods Ltd'];
// Cash starts at nothing. The setup wizard posts whatever the business actually opened with.
const PAID={},ADV={},BAL={Cash:0,'Meezan Bank':0},METHODS=['Cash','Bank transfer','Cheque','Card or online wallet'],ACCTS=['Cash','Meezan Bank'];
const PAYM=[];
const INVD={},RET=[],QUOT=[],JRN=[],TRF=[],STK=[],LAY={};
const EXP=[];
// Staff. An employee is not a user: most have no login, and the two are only linked when one is given.
// More than one store is needed because staff money moves four ways and the books treat each differently:
//   SAL  - salary runs (a cost earned: salary + bonus, less any advance recovered)
//   STFP - money paid to an employee, settling what is owed to them
//   EMPA - advances paid out, which they owe back; `per` is the amount recovered each month
// Balances are DERIVED from these, never stored twice, so the employee page and the ledger cannot drift.
const EMP=[],SAL=[],STFP=[],EMPA=[];
const CATS=['Rent','Utilities','Transport','Salaries','Repairs','Fuel','Packing','Other'];
const ACT={Cash:'Cash','Meezan Bank':'Bank'};
const COA=['Cash and bank','Accounts receivable','Inventory','Accounts payable','Advances from customers','Advances paid to suppliers','Sales','Cost of goods sold','Expenses','Stock adjustments','Salaries','Employee payable','Advances to staff','Owner equity','Tax payable'];
