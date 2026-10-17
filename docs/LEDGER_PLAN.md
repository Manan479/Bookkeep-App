# Double-entry ledger — implementation plan

Priority 1 from the launch list: *"every posted sale, purchase, payment, return, and expense should create
appropriate accounting entries. Total debits must equal total credits, and reports should reconcile to those
entries."*

## Where the plugs were (all now removed)

**Every row in this table has been dealt with.** It is kept as the record of where the numbers used to
come from, because those are exactly the places a regression would reappear.

| Location | Behaviour |
|---|---|
| `core/derived.js:22` | Trial balance appended `'Owner equity (balancing)'` and forced totals to `Math.max(dr,cr)`. **Deleted** — `tb` now prints `trialRows()` and the real totals. |
| `core/derived.js:19` | Balance sheet set `Owner equity = A − L` — plugged by construction. **Deleted** — equity is read from the ledger, and `Assets less liabilities` must equal `Total equity`. |
| `core/derived.js:23` | Only `JRN` entered the trial balance; sales, purchases, payments, returns and expenses posted **nothing**. **Fixed** — every one of them posts through `core/posting.js`. |
| `features/reports.js:2-3` | P&L was synthetic: `PER[period].k[] × 10000`, previous period × hardcoded 0.85/0.89/0.91. **Rebuilt** from `ledKindWin`/`ledBalWin` over the period, with the previous period computed for real. |
| `core/derived.js:24-25` | Cash flow summed from raw records, not the ledger. **Rebuilt** from `ledCashFlow`, which reads movements of the Cash and bank account and splits them by document. |
| `data/seed.js:16` | `PAID`/`ADV`/`BAL` hardcoded; cash derived from nothing. **Dropped** — the seed has no money in it at all. |
| `features/dashboard.js` | Six invented figures (`×11500`, `×17400`, `318200`, `1845000`, `×10000`) and fixed alert counts. **Rebuilt** from the ledger. |

Existing building blocks: `COA` (11 accounts) and `JRN` with the right shape
(`{id,date,narr,lines:[{acc,dr,cr}],void,of}`). Nothing posts to them.

## Design

### Account taxonomy

Derived from `COA`, so no new account names are introduced:

| Account | Kind | Normal side |
|---|---|---|
| Cash and bank | asset | debit |
| Accounts receivable | asset | debit |
| Inventory | asset | debit |
| Advances paid to suppliers | asset | debit |
| Accounts payable | liability | credit |
| Advances from customers | liability | credit |
| Tax payable | liability | credit |
| Owner equity | equity | credit |
| Sales | revenue | credit |
| Cost of goods sold | expense | debit |
| Expenses | expense | debit |
| Stock adjustments | expense | debit |

**One account was added after the fact.** The original design said no new names would be introduced. The
user chose to give damage and losses their own line, so `Stock adjustments` was added to `COA` and
`ACCT_TYPES`. The profit and loss reports "Expenses" as every expense account *except* cost of goods sold
and stock adjustments, so a further expense account added later appears without that screen being changed.
`persist.js` re-attaches any `COA` name the restored `ACCT_TYPES` does not know, so a book saved before the
account existed does not end up with an unpostable account.

### Entry shape

Journal entries gain provenance and period fields; existing manual entries keep working:

```
{ id, date, narr, lines:[{acc,dr,cr}], void, of,
  src:'sale|purchase|dist|receipt|payment|return|expense|opening|manual',
  ref:'INV-0232',        // source document
  cost: 6100 }           // COGS relieved, stored so returns reverse the exact amount
```

### Posting rules

Inventory is carried at **tax-inclusive cost** for purchases, matching the existing
`(old*oldCost + qty*rate)/(old+qty)` average. Tax is not split out as recoverable on purchases.

| Event | Debit | Credit |
|---|---|---|
| Sale | Accounts receivable `total` | Sales `netOfTax`; Tax payable `tax` |
| Sale (cost) | Cost of goods sold `cost` | Inventory `cost` |
| Purchase | Inventory `total` | Accounts payable `total` |
| Payment in | Cash and bank `amt` | Accounts receivable `applied`; Advances from customers `advance` |
| Payment out | Accounts payable `applied`; Advances paid to suppliers `advance` | Cash and bank `amt` |
| Expense | Expenses `amt` | Cash and bank `amt` or Accounts payable `amt` |
| Cash transfer | receiving account | sending account |
| Sale return | Sales `net`; Tax payable `tax` | Accounts receivable / cash / Advances from customers |
| Sale return (cost) | Inventory `cost` | Cost of goods sold `cost` |
| Purchase return | Accounts payable | Inventory |
| Advance applied to an invoice | Advances from customers | Accounts receivable |
| Opening balances (wizard) | per account | Owner equity |
| Manual journal | as entered | as entered |

### Invariants to enforce and test

1. Every posting entry balances: `sum(dr) === sum(cr)` within rounding.
2. Trial balance totals equal and net to zero, with **no balancing line**.
3. `BAL[account]` equals the ledger balance of the matching account.
4. Balance sheet: `assets − liabilities === Owner equity` from the ledger, not `A − L`.
5. Accounts receivable equals the sum of open invoice balances (plus distributor balances).
6. Inventory value equals `sum(stockVal(p))`.
7. `ret.cost` on a return equals the exact cost relieved at posting time.

### Engine

New file `web/src/core/ledger.js`, loaded after `state.js` and before `derived.js`, holding:

```
ACCT_TYPES             account -> asset|liability|equity|revenue|expense
postEntry({date,narr,lines,src,ref})   validates balanced, assigns JV number, pushes to JRN
ledgerBal(acc)         debit-positive balance of one account
ledgerBalances()       all accounts
ledgerByType(kind)     totals for a kind
```

Because the test suite forbids screen code in `core/` (`tests/run.js:13`), this file must contain no DOM access.

## THE BLOCKING PROBLEM: sample data — RESOLVED, Option A

**Decision taken: Option A.** The seeder used to hardcode `INV`, `PUR`, `BAL={Cash:86400,'Meezan Bank':512900}`,
`PAID`, `PAYB` and `EXP`. Those records had **no ledger entries**. The moment the trial balance read the
ledger instead of plugging: the trial balance would not balance, cash would not equal `BAL`, and
receivables would not equal the open invoices. A plug could not fix it without recreating the very thing
being removed.

What was implemented: the **money** is gone and the **furniture** is kept.

- Dropped: every sample invoice, bill, payment, expense, cash balance, advance and stock quantity.
- Kept: the chart of accounts, the category and method lists, the cash accounts, the product list with
  **zero stock**, the party and distributor names and contact details with every figure zeroed, and the
  price lists. None of that can put the book out of balance.
- `wipeData()` clears every record, balance and stock quantity but keeps that furniture, and zeroes
  quantities rather than dropping the products — a quantity with no purchase behind it would make the
  stock report disagree with the Inventory account on the first screen after setup.
- The wizard's step 3 posts opening balances (`Dr Cash and bank / Cr Owner equity`), so a fresh set of
  books has a trial balance that stands up from the first report. Its destructive switch defaults on for a
  first run and off when re-running setup, so "Run setup again" cannot silently delete real records or
  double-count opening money.
- Document counters start at 1, so a fresh install numbers its first invoice `INV-0001`.

The cost the plan predicted was real: `tests/app.test.js` relied on `openInv('INV-0230')`, `INV-0232` and
`PUR-0111`, and those assertions have been replaced. The flows they covered are now built from fixtures in
`tests/posting.test.js`, which drives the real functions and checks the ledger.

## Reconciliation findings from the posting paths

**All three are implemented.** The table below records what was found and why each decision was made;
`core/posting.js` is where each one now lives. F1 is the tax credit in `postSaleLedger`, F2 is the cost
accumulated in `postRec`, and F3 is the signed advance figure handed to `ledSide` in `postPmLedger`.

Read from `features/invoices.js` and `features/payments.js`. Each of these will stop the ledger from
agreeing with the records, so each needs an explicit decision before step 3.

### F1 — The invoice total is rounded, but its parts are not

`postRec` (invoices.js:32) stores the receivable as `Math.round(T.g)`. The parts are unrounded:
`T.sub` and `T.tax` from `totals()`. So the entry

    Dr Accounts receivable  round(g)
    Cr Sales                g - tax        (unrounded)
    Cr Tax payable          tax            (unrounded)

does not balance whenever `g` has a fractional part. Example: `g = 100.50`, `tax = 5.00`, `sub = 95.50`.
Debit rounds to 101, credits total 100.50. The entry is off by 0.50.

**Decision:** derive the tax credit as `round(g) - sub`, so the debit equals the sum of the credits and the
difference is absorbed by the tax account. This changes the trial balance, not the invoice: sales keeps the
unrounded line arithmetic that the invoice total is built from.

### F2 — The cost relieved on a sale is never captured

`postRec` (invoices.js:29) consumes FIFO layers inline:

    while(need>0&&L.length){const t=Math.min(need,L[0].q);L[0].q-=t;need-=t;...}

It updates `p[2]` and the layers, but never records the cost of the units that left. The entry
`Dr Cost of goods sold / Cr Inventory` needs that number, and priority 2 needs it later for returns.

**Decision:** `postRec` accumulates the consumed cost as it walks the layers and returns it, rather than a
second helper recomputing what the first one already knows. In average mode this is `qty x ccost(line)`.
Storing it on the entry lets a return relieve `ret.cost`, which is the exact cost originally removed — that
is what keeps the return from drifting away from stock valuation.

### F3 — The advance kept on a receipt is not the same number in both places

`savePm` (payments.js:41) computes the advance as `adv: un` where `un = round(avail - applied)`.
The cash actually moves by `m.amt` (payments.js:42). The ledger's advance line must therefore be
`m.amt - applied`, not `un`.

**Decision:** use `m.amt - applied` for the ledger credit to Advances from customers. If the two differ,
the payment record and the ledger disagree and priority 4's audit trail would be unable to explain why.

## Order of work

**Status: Priority 1 is complete. Steps 1 to 6 are done and the suite is green. Step 7 (stock costing)
and the three gaps listed in `HANDOFF.md` are what is left.**

1. `core/ledger.js` + `ACCT_TYPES` + `postEntry()` validation. **DONE**
2. Route existing `JRN` manual posting through `postEntry()`; keep `revJ()` behaviour. **DONE** — manual
   entries now share one door, one counter and one shape with the documents. `revJ` reverses through
   `ledReverseEntry()`.
3. Post from: sale, purchase, distributor invoice, payment in/out, advance use, expense, transfer,
   returns. **DONE** — all of them go through `core/posting.js`. A transfer is deliberately not posted;
   see `HANDOFF.md`.
4. Rewrite `bs` and `tb` in `derived.js` to read the ledger; delete both plugs. **DONE**
5. Rewrite `pl` and `cf` from the ledger, including the synthetic P&L screen in `features/reports.js`.
   **DONE** — and the dashboard, which was inventing six figures of its own.
6. Add the invariant tests above to a new `tests/ledger.test.js`. **DONE** — `tests/ledger.test.js` covers
   the engine and `tests/posting.test.js` covers the end-to-end invariants by driving the real feature
   functions.
7. Stock costing (priority 2) — **DONE.** `BQ`/`BA` in `data/seed.js` hold the units that entered stock at
   a cost and what they were worth; `core/inventory.js` derives `CO` from them (`buyIn`, `buyOut`,
   `reconcileStock`), so a corrected purchase is an exact subtraction and the restatement lands in **Cost of
   goods sold** rather than a new account. Negative stock keeps its last cost instead of being valued at
   zero, and a purchase return takes its units back out of the pool, which is what closes the return-cost
   gap. `tests/posting.test.js` carries the acceptance case (buy 10@60, buy 10@80, sell 5, correct the first
   invoice to 70 → cost 75, stock 1125, Inventory 1125, cost of goods sold 375, gap 0). The reasoning and
   the worked example are in `HANDOFF.md`.

### One correction found while wiring

`ledReverse()` originally wrote a mirror entry **and** flagged the original void. Since `ledBal()` skips
void entries, that counted the reversal and not the thing being reversed, leaving every account at the
**negative** of what the document had done. It now just voids the originals. The full explanation is in
`HANDOFF.md`; the old `ledger.test.js` assertions that described the negation as correct were wrong and
have been replaced.

## Verification requirement

Every step above must be confirmed by the test suite before the next one starts. The agent editing this
repo **cannot execute anything**: its shell fails with `STATUS_DLL_INIT_FAILED` (0xC0000142), both
confined and unconfined, across a restart. So it must never treat an edit as working because it looks right.

Ask the user to run **`CHECK.bat`** in the project root (a double-click) and report what it says. That is
the route that actually works on this machine. `node tests/run.js` with the full path to the bundled Node
does the same thing:

```
& "C:\Users\Abdul Mannan\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" tests\run.js
```

`All good: N checks passed, M files loaded.` means green. Anything else lists exactly what is broken.

`tests/run.js` reads the app's load order straight out of `web/index.html`, so its file list cannot drift
from the page's. Tests always use a throwaway in-memory store, never real saved data.

Three traps found while building it, worth remembering before editing these files:

- `tests/run.js` needs `require('./harness.js')`. It has no `const harness = …` binding, so removing that
  line silently leaves `chk`, `T`, `outs` and `passed` undefined and takes down every test.
- Any `note()` call makes the run fail; it is a temporary probe, not a log.
- `tests/run.js` rejects screen code in `src/core/` and `src/data/` by regex against the **whole file**,
  comments included. `/window\./` matches the words "a window." in a sentence.

`dist/bookkeep.html` is a prebuilt single-file bundle and goes stale whenever `web/src` changes. The
default run does not use it (`BUNDLE=1` does), so it is only rebuilt when it is actually wanted.
