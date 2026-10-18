# Setting the app up in a database

This is the plan for moving the books out of one browser JSON file and into PostgreSQL. The schema itself is in
`db/schema.sql` — it is runnable as-is on an empty database. Nothing in the app talks to it yet; this document is
the order of work and the reasons behind each table.

## What "set up in the database" actually involves

Three separate jobs, often confused:

1. **Create the empty database** — run `db/schema.sql`. Ten minutes, no code.
2. **Get the existing book into it** — export the JSON the app already saves and convert it (a one-off script).
3. **Give the apps something to talk to** — a small API that authenticates, validates and posts. Without this,
   the database is a filing cabinet nobody can reach.

Doing 1 and staying on the local JSON is fine. Doing 3 without 1 is impossible. Doing 2 before 3 means the data
is in the database but the app cannot use it.

## Step 1: create the database

### Option A — Supabase (fastest, recommended to start)
1. Create a project at supabase.com (free tier is enough to build on).
2. Open **SQL Editor**, paste the whole of `db/schema.sql`, run it once.
3. Copy the connection string (Project Settings → Database) — that is your `DATABASE_URL`.

### Option B — your own Postgres
```
docker run --name bookkeep-db -e POSTGRES_PASSWORD=secret -p 5432:5432 -d postgres:16
psql "postgres://postgres:secret@localhost:5432/postgres" -f db/schema.sql
```

Either way you should end up with the tables listed below and a `books` table that is empty.

## What each table is for

| Group | Tables | Plain meaning |
|---|---|---|
| Business & people | `books`, `users`, `book_users`, `parties`, `party_roles` | One `book` per business. People can be customers, suppliers, distributors or agents at once. |
| Catalogue | `products`, `product_costs` | Products, and the cost pool: total units bought and total paid. Average cost is a query. |
| Stock | `stock_movements` | Every in and out, signed. Quantity on hand is `sum(qty)`, never an edited number. |
| Book | `accounts`, `ledger_entries`, `ledger_lines` | The double-entry book. Unbalanced entries are rejected by the database. |
| Documents | `documents`, `document_lines`, `document_counters` | Invoices, purchases, quotations, credit/debit notes, with their lines and numbering. |
| Money | `payments`, `payment_allocations`, `expenses`, `transfers` | Receipts, payments, allocations against invoices, expenses, cash↔bank transfers. |
| Staff | `employees`, `salary_runs`, `staff_advances` | Salaries, bonuses, advances, and expenses a staff member paid for the company. |
| Support | `lookup_values`, `attachments`, `audit_log`, `sync_changes` | Categories/methods/rates, file references, who changed what, and the sync cursor. |

## Where today's saved data goes

Every key the prototype writes is in `DB` in `web/src/platform/persist.js`. This is the mapping:

| Today (JSON) | Becomes | Note |
|---|---|---|
| `INV`, `PUR` | `documents` (`type` = sale / purchase) + `document_lines` | Array positions become named columns |
| `INVD` (invoice snapshots) | `documents.snapshot` (jsonb) | What was printed, frozen at posting |
| `QUOT` | `documents` (`type` = quote) | Statuses sent/accepted/expired already in the check list |
| `RET` | `documents` (`credit_note` / `debit_note`) | A return is a document, not a separate thing |
| `PAYM`, `PAID`, `ADV` | `payments` + `payment_allocations` | `PAID`/`ADV` are derived, so they stop being stored |
| `EXP` | `expenses` | `paiedBy` → `paid_by_employee`, "Pay later" → `account_id is null` |
| `TRF` | `transfers` | |
| `JRN` (ledger) | `ledger_entries` + `ledger_lines` | `{acc,dr,cr}` lines → `account_id`, `debit`, `credit` |
| `JRN` (manual entries) | `ledger_entries` with `source = 'manual'` | Same table; the journal screen is just a filtered view |
| `STK` | `stock_movements` | |
| `CO` / `LAY` | `product_costs` + movements | Cost pool replaces the rolling average |
| `BUY` | `products.expected_cost` | The form's default, not a valuation |
| `PRICE`, `DRATE` | `products.sale_price`, `products.distributor_price` | |
| `PRD` | `products` | |
| `CUST`, `SUPP`, `DIST`, `DCU` | `parties` + `party_roles` | Distributor customers become parties with an agent relationship in `notes`/join table |
| `ACCTS`, `ACT`, `BAL` | `accounts` (`cash_kind`) + opening ledger entries | A balance is not a column; it is the ledger |
| `COA`, `ACCT_TYPES` | `accounts.name`, `accounts.kind` | The side of the book lives in `kind` |
| `CATS`, `METHODS`, tax rates | `lookup_values` | |
| `EMP`, `SAL`, `STFP`, `EMPA` | `employees`, `salary_runs`, `staff_advances` | |
| `COMP`, `TPL`, `SET` | `books.settings` (jsonb) | Low-value, high-shape-change: keep as JSON |
| `USERS` | `users` + `book_users` | PINs become `pin_hash` |
| `S.n`, `S.pn`, … | `document_counters` | |

## Rules the database now enforces (not the screens)

These were checked by actually running `db/schema.sql` against a live PostgreSQL and exercising each rule, not
by reading the SQL:

| Test | Result |
|---|---|
| Schema applies to an empty database | passes |
| A balanced entry is accepted | passes |
| An unbalanced entry is refused at commit | passes |
| A posted entry cannot be edited | passes |
| Its lines cannot be updated or deleted | passes |
| A posted entry cannot be deleted | passes |
| A retried write (same `client_uuid`) is refused | passes |
| The trial balance reads zero afterwards | passes |

- An entry whose lines do not balance **cannot be committed** (`ledger_balanced`, deferred to commit).
- A posted entry **cannot be edited**, and its lines cannot be updated or deleted — a correction is a new entry
  with `reverses_id` set. This is the difference between a book you can audit and one you cannot.
- A line cannot have both a debit and a credit, or neither.
- Every retryable write carries `client_uuid`; the unique index makes a retried payment harmless.
- Money is `bigint` minor units, so `0.1 + 0.2` can never become `0.30000000000000004`.
- Deleting is `deleted_at`, so a delete is a fact that syncs rather than a hole in the data.

## Getting the existing book in (one-off import)

Order matters, because of the foreign keys:

1. `books` (one row), `users` + `book_users`, `accounts` (from `COA`/`ACCT_TYPES`), `lookup_values`.
2. `parties` + `party_roles`, `products` + `product_costs`.
3. `documents` + `document_lines` (dates, numbers, totals), then `payments` + `payment_allocations`,
   `expenses`, `transfers`, `stock_movements`.
4. `ledger_entries` + `ledger_lines` last, from `JRN`, keeping `source`/`ref` so each entry still points at its
   document. Insert the lines **without** deferring anything: the balance trigger will refuse any entry that
   does not balance, which is exactly the check you want on imported data.

The import is a script in `tools/`, run once per book, reading the exported JSON and writing SQL. It should be
able to run twice without duplicating rows (use the old record ids as `client_uuid`).

## Verifying the import — three queries that must agree

```sql
-- 1. The trial balance balances, always zero.
select sum(debit) - sum(credit) as difference
from ledger_lines l join ledger_entries e on e.id = l.entry_id
where e.book_id = :book and not e.is_void;

-- 2. Stock on hand per product equals the sum of its movements.
select p.name, sum(m.qty) as on_hand
from stock_movements m join products p on p.id = m.product_id
where p.book_id = :book
group by p.name order by p.name;

-- 3. What customers owe, from the ledger, must equal the unpaid part of their invoices.
select coalesce(sum(l.debit - l.credit), 0) as receivable
from ledger_lines l
join ledger_entries e on e.id = l.entry_id
join accounts a on a.id = l.account_id
where e.book_id = :book and not e.is_void and a.name = 'Accounts receivable';
```

If (1) is not zero, an import or a posting is wrong — stop and fix it before going further. The app's own
`tests/posting.test.js` makes the same three assertions locally, which is why the import has something to match.

## Order of work from here

| Phase | What is built | What changes for the user |
|---|---|---|
| 0 (this) | Schema + import plan | Nothing yet |
| 1 | Auth API (login, hashed PIN, book membership) | The same app, but signing in reaches the server |
| 2 | Server-side backup/restore of the whole book | A lost phone stops being a lost book |
| 3 | Per-document sync (`sync_changes`, `client_uuid`, soft deletes) | Two devices, one book |
| 4 | Posting rules moved server-side (`core/posting.js` → API) | Clients become views; the server can refuse a bad entry |

Do not skip to 3: sync without server-side posting is how two devices produce two different sets of books.

## Decisions still open (need your answer, not code)

1. **One business per account, or several books per login?** The schema allows many (`book_users`); the screens
   currently assume one.
2. **Currency** — `books.currency` is per business. Multi-currency invoices would need an exchange-rate table.
3. **Where taxable totals are rounded** — currently the invoice total is rounded and the difference absorbed by
   the tax account. The server must round identically or imported and new documents will differ by a cent.
4. **Hosting** — Supabase (managed, fastest) or your own Postgres (more control, more operations).
