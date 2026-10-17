# Data model

How the prototype stores things, and what the real database should look like.

## Today (prototype)
Everything lives in a few global lists and objects, saved together as one JSON text under the key `bk_v2`
(`web/src/platform/persist.js`). Many records are arrays read by position, for example an invoice row is
`[number, party, initials, amount, status, date]`. Fine for a prototype, wrong for a database.

The saved set is the list in `DB` in `persist.js`: the record lists (`INV`, `PUR`, `PAYB`, `PAYM`, `EXP`,
`RET`, `QUOT`, `JRN`, `TRF`, `STK`), the lookup maps (`INVD` invoice snapshots, `PAID`, `ADV`, `BAL`, `CO`,
`BUY`, `PRICE`, `LAY`, `CUSTD`), the catalogues (`PRD`, `CUST`, `SUPP`, `DIST`, `DCU`, `DRATE`, `METHODS`,
`ACCTS`, `ACT`, `CATS`, `COA`, `NUMP`), the settings objects (`COMP`, `TPL`, `SET`) and `ACCT_TYPES`, which
says which side of the book each account sits on. The counters on `S` are saved too.

Two pairs are easy to confuse, and both matter:

- `CO` is the **costing basis** — what a product actually cost, worked out from the purchase invoices. It is
  what the stock report values stock with, and it must never be moved by hand.
- `BUY` is the **expected purchase cost**, typed on the product form. It fills in the price on the next
  purchase and values opening stock, and it changes nothing about stock already owned.

The double-entry book itself is `JRN`: one entry per document, `{id, date, narr, lines, void, of, src, ref,
cost}`, with each line `{acc, dr, cr}`. `trialRows()` and the other readers in `core/ledger.js` are the only
things that turn it into balances.

## Real build: tables and ids
Use a unique id (UUID) on every record, never a counter, so devices can sync. Keep a `createdAt`, `updatedAt`,
`deviceId` and a `deleted` flag (records are never really deleted).

| Table | Main fields |
|---|---|
| Party | id, name, business, phone, whatsapp, email, address, city, country, taxIdType, taxId, creditLimit, paymentTermsDays, openingBalance, notes |
| PartyRole | partyId, role (customer, supplier, distributor, agent). One party can have several roles. |
| Product | id, name, brand, code, unit, salePrice, expectedPurchaseCost, lowStockLevel, distributorPrice (default) |
| UnitConversion | productId, unit, factor |
| StockMovement | id, productId, quantity (+/-), unitCost, kind (purchase, sale, return, adjustment, edit), documentId, date, lot, expiry |
| Document | id, type (sale, purchase, distributor, quote, creditNote, debitNote), number, partyId, date, dueDate, status, notes |
| DocumentLine | documentId, productId, description, quantity, rate, discountValue and discountType, taxValue and taxType, distributorPrice, lot, expiry |
| DocumentCharge | documentId, name, amount, taxable, addToCost |
| Payment | id, direction, partyId, role, amount, date, method, accountId, reference, notes, voided |
| PaymentAllocation | paymentId, documentId, amount |
| Advance | partyId, role, amount (derived from payments, returns and usage) |
| Account | id, name, kind (cash, bank), openingBalance |
| Transfer | id, fromAccountId, toAccountId, amount, date |
| Expense | id, category, amount, date, payee, accountId or "pay later", linkedDocumentId, receipt, notes, voided |
| JournalEntry and JournalLine | entry id, date, narration; line: account, debit, credit |
| LedgerEntry | id, date, account, debit, credit, documentId. Written by posting. This is the double-entry book. |
| Settings, Company, Template | one row each; lists inside (tax ids, social accounts, bank accounts, branches) |

## Rules
- Money is stored in whole minor units (cents, paisa), never as decimals.
- Stock quantity is the sum of StockMovement rows; it is never edited directly. **The prototype does edit it
  directly**, which is why a stock adjustment has to post its own entry to stay in step.
- Cost of a product is derived from what was paid, never typed. `expectedPurchaseCost` is a default for the
  next purchase only.
- **The real build should store total quantity bought and total amount paid per product**, so the average cost
  can be recomputed from scratch after an edit. The prototype keeps a rolling average that cannot be un-done,
  which is what stops a cost correction from being exact. See `HANDOFF.md`.
- Balances (customer owes, you owe, advances) are derived from documents, payments and returns. In the
  prototype they live in `PAID`/`ADV`/`PAYB`, and the ledger's own balances are asserted against them by
  `tests/posting.test.js`.
- A posted document keeps a snapshot of what was printed (party details, branches, bank accounts, balance shown).
- Document numbers come from a series per type and per device (see SYNC.md).
