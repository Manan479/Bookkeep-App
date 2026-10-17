# Posting rules (what each action changes)

This is how the prototype behaves today. It is the starting spec for the accounting core of the real build.
Have an accountant check it before launch. Amounts are plain numbers here; the real build should use whole minor units.

Every action below that says "posts" writes **one balanced entry** through `core/posting.js` into the ledger
(`core/ledger.js`). One document makes one entry, grouped by its reference, which is what lets an edit or a
void reverse the whole thing. The account names are in `data/seed.js` (`COA`) and their kinds in `ledger.js`
(`ACCT_TYPES`).

## Sale invoice
- Stock goes down by each line's quantity. FIFO layers are used up oldest first. The weighted average cost does not change.
- A receivable is created for the invoice total. Status comes from payments: Unpaid, Partial, Paid. Draft is saved without any effect.
- Line total = quantity x rate, minus line discount (percent or amount), plus line tax (percent or amount).
  Invoice total = sum of lines.
- Posts: **Dr Accounts receivable** the rounded invoice total, **Cr Sales** the unrounded line arithmetic,
  **Cr Tax payable** whatever is left (`round(total) - sub`, so the entry balances even when the lines carry
  fractions), then **Dr Cost of goods sold / Cr Inventory** the cost of the units that left, accumulated
  while the layers are walked so the ledger cannot disagree with the layers it just changed.
- If "Block the sale" is set for negative stock, an invoice that sells more than the stock is refused.
- Optional: the customer's previous balance and total due are stored on the invoice when it is posted, and printed if the switch is on.

## Purchase invoice
- Stock goes up. Weighted average cost = (old stock x old cost + quantity x rate) / (old stock + quantity). The
  figure is stored in `CO`; it is the costing basis and is only ever moved by what was actually paid. A FIFO layer is added at the rate.
- A payable is created with a due date (30 days after the invoice date if none is given).
- Posts: **Dr Inventory / Cr Accounts payable** the rounded invoice total. Inventory is carried tax-inclusive.

## Distributor invoice
- Stock goes down like a sale. The invoice shows his customer's price. Only the distributor price counts in the books.
- The distributor owes you the sum of quantity x distributor price. His customer's total is kept only as "sold through him".
- Posts: **Dr Accounts receivable / Cr Sales** the distributor price, plus **Dr Cost of goods sold / Cr Inventory** the cost.
- Nothing is tracked for his customer. The fixed rate is never printed.
- Placeholders to replace: with no distributor price set, 85% of the line price is used; with no cost on record, 80% of the sale price is used.

## Payments
- Received from a customer or distributor, or paid to a supplier. The user picks which invoices or bills it covers and how much to each.
- Money entered moves the chosen cash or bank account. Extra money beyond what is applied is kept as an advance for that party and role.
- An advance can be used on later invoices. Using it does not move cash.
- A distributor payment lowers what he owes; anything above that becomes an advance.
- Posts: **Dr Cash and bank** the money moved, against **Accounts receivable** for what was applied and
  **Advances from customers** for the rest. Outgoing is the mirror: **Cr Cash and bank**, against
  **Accounts payable** and **Advances paid to suppliers**. The advance line is `amount - applied`, which is
  the same number cash moved by, so an advance being *spent* rather than kept lands on the other side of the
  same account out of the same signed figure.
- Paying a bill straight from the Payables screen posts **Dr Accounts payable / Cr Cash and bank**, or
  **Dr Expenses** when the bill never came from an expense record.
- A payment can be voided: allocations, advances and the account balance go back, and its ledger entry is flagged void.

## Returns (credit and debit notes)
- Choose a posted invoice and the quantities. Value per unit = that line's total (with discount and tax) / quantity. Distributor returns use the distributor price.
- Sale return: stock goes up. The value first lowers what the customer still owes on that invoice; any rest becomes customer credit or a cash refund.
  Posts: **Dr Sales** the unrounded line figure, **Dr Tax payable** the rest of the rounded value,
  **Cr Accounts receivable** what was applied, **Cr Advances from customers** or **Cr Cash and bank** the rest,
  plus **Dr Inventory / Cr Cost of goods sold** the exact cost the goods went back into stock at. That cost is
  kept on the note as `ret.cost`.
- Purchase return: stock goes down. The value first lowers what you still owe; any rest becomes supplier credit or a refund.
  Posts: **Dr Accounts payable** what was applied, **Cr Inventory** the return value, and **Dr Advances paid to
  suppliers** or **Dr Cash and bank** the rest.
- Distributor return: lowers what he owes; any rest becomes an advance. Posts like a sale return at distributor prices.
- You cannot return more than was sold or bought. Returns cannot be voided yet.

## Editing a posted invoice
- The old stock effect, payable and distributor balance are reversed, then the invoice is posted again under the same number.
- The ledger entry is reversed with them, so an edit cannot leave the book still showing the old invoice.
- Allowed only if: it has no returns; the party is unchanged when payments exist; the new total is not below what is already paid.
- Payments stay attached. Status is worked out again from what was paid.
- Invoices have no Void in this version.
- **Known gap:** if the edit changes what a product cost, the units already sold keep their old cost, so the
  books stop adding up to what was paid. See "Changing a product's cost" below.

## Stock adjustments
- Product form, "Adjust stock": a positive number adds stock, a negative removes it, with a reason (damage, loss, found stock, count correction).
- Posts: **Dr Stock adjustments / Cr Inventory** for a shortage, the other way round for stock found. The
  amount comes from `stockInVal()`/`stockOutVal()` in `core/inventory.js`, which value the movement by exactly
  the rule the stock report uses, so the two cannot drift apart.
- **Opening stock on a new product** posts **Dr Inventory / Cr Owner equity**, the same shape as the wizard's
  opening cash, because it is goods the owner brought in rather than a shortage.

## Employees
- **Salary run** (basic + bonus, less any advance recovered): **Dr Salaries** the gross, **Cr Employee
  payable** what is left to pay, and **Cr Advances to staff** for the recovery. The cost is recognised when
  the work is run, not when it is paid, so a month-end run that is paid later still shows the cost.
- **Paying an employee**: **Dr Employee payable / Cr Cash and bank**. Cash and bank is the one ledger cash
  account however the money left the business.
- **Advance**: **Dr Advances to staff / Cr Cash and bank**. An advance is money they owe back, not a cost; it
  becomes a cost only as the salary it is recovered from is earned. Recovery is capped at what is still owed
  and at the salary itself.
- **An expense an employee paid for the company** (the Paid by field on an expense): **Dr Expenses / Cr
  Employee payable**. No cash and no supplier moves; it settles with the next salary.
- Recurring salaries are only ever **offered** (the Employees screen and Notifications); nothing is posted
  until a person runs them, and a month can be run once.

## Selling before buying (negative stock)
- A sale of goods that are not on the shelf relieves **Dr Cost of goods sold / Cr Inventory** at their **last
  known cost**, exactly like any other sale.
- The stock report keeps that same last cost, so a negative quantity shows a negative value rather than zero
  and the report still equals the Inventory account. The missing purchase is what will settle it.
- When the sale is posted, the app asks what the goods really cost and offers either to record the purchase
  (a new purchase invoice for those units, which is what re-values them) or to keep the last cost. Keeping it
  leaves the item in **Notifications** under "Negative stock" until a purchase is recorded.
- Restating after a purchase: **Dr/Cr Inventory** to `sum(stockVal)` with the difference in
  **Cost of goods sold** — `reconcileStock()` in `core/inventory.js`. This is also what makes correcting a
  purchase invoice whose goods have partly sold exact.

## Changing a product's cost
- The cost box on the product form is **"Expected purchase cost"**: it fills in the price on your next
  purchase, and it values opening stock. It is stored in `BUY`.
- It deliberately does **not** touch `CO`, the costing basis. Editing a product can therefore never restate
  stock that is already on the shelf.
- The form shows the figure stock is actually valued at, next to the field, so the difference is visible.
- To change what your stock is worth, correct the purchase invoice, or use Adjust stock.
- **Known gap:** correcting a purchase invoice does not restate the units that were already sold. Fixing that
  needs `CO` to be rebuildable from total bought and total paid per product. See `HANDOFF.md`.

## Quotations
- No stock or money effect. Statuses: Draft, Sent, Accepted, Rejected, Expired (past the valid-until date), Converted.
- Converting can be partial. It becomes Converted when every line has been invoiced in full.

## Expenses
- Paid now: the account balance goes down. Pay later: a payable is created (due 14 days after the expense date).
- Posts: **Dr Expenses** against **Cr Cash and bank** or **Cr Accounts payable**.
- Paying a "pay later" expense from the Payables screen records a payment voucher. An expense can be voided if nothing was paid on it.

## Transfers and journal
- A transfer moves money between accounts and has no effect on profit. It posts **nothing**: every cash and
  bank account rolls up into the one ledger account `Cash and bank`, so an internal transfer changes no total
  the book keeps. One ledger account per bank account would be needed to show it.
- A journal entry must have debits equal to credits, and goes through the same door as every document, so
  manual and automatic entries share one counter and one shape.
- Reversing an entry flags it void and writes no mirror. The entry stays in the register and drops out of the
  balances. A **mirror entry on top of a void original would be counted once too often, in the wrong
  direction**, leaving the account at the negative of what it did instead of where it was.

## Opening balances
- The setup wizard's cash and bank figures post **Dr Cash and bank / Cr Owner equity**, so a fresh set of books
  has a trial balance that stands up from the first report instead of needing a balancing line.
- Adding a cash or bank account with an opening balance posts the same entry.
- Running setup again does **not** wipe or re-post by default: that would delete a real business's records and
  count its opening money twice.

## Reports
- Every report reads the ledger. There are no plug lines: the trial balance prints its real two columns and
  says how far apart they are if they disagree, and the balance sheet shows "Assets less liabilities" next to
  "Total equity", which must match.
- The profit and loss sums the ledger over the period shown, and compares against the real previous period of
  the same length. Stock adjustments get their own line; "Expenses" is every other expense account.
- The cash flow reads movements of the Cash and bank account and splits them by the document that moved them,
  so the lines add up to the net figure by construction.

## Known gaps
- No period locking and no year-end close. The balance sheet is all-time and the profit and loss is
  period-based, so "earned and kept in the business" is the whole accumulated result.
- Overdue is not worked out from the due date for invoices the app did not create; the aging reports use dates.
- Exports and printing are placeholders. Commission, payroll and a cheque register are not built.
