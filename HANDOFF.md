# Handoff — where bookkeep stands

Written at the end of a long session. Read this first; it is written for a fresh session with no memory
of the work that produced it.

## The one-line status

**The app is a working small-business system, not a prototype any more.** Every posted document writes a
balanced entry into the double-entry engine and every screen reads that engine; costing is exact (a
corrected purchase restates the goods already sold); negative stock is valued instead of hidden; staff have
salaries, bonuses, advances and a payable that also absorbs expenses they paid for the company; users have
roles, stable ids, and every entry records who posted it; reports export their detail as CSV, PDF or an
image; backup and restore work on the phone; and the accent colour, the layouts and the popup animations
have had a pass.

**Read the sections in order, oldest first.** The top of this file is the oldest work and the bottom is the
newest — the file was appended to, not rewritten, so a section can describe a state that later sections
changed. When two disagree, the later one is right.

## What is genuinely left

1. **One device, one book.** Two devices hold two copies; nothing syncs, and two people cannot work on the
   same books. That is the database job — see `docs/SYNC.md` — and it brings the next four items with it.
2. **Permission checks still run in the browser.** PINs are no longer stored in plain text: `core/users.js`
   keeps a PBKDF2-SHA256 hash with a per-user salt (`pinHash`/`pinSalt`), migrates a book's old plain PINs at
   boot, login and restore, and the log-in screen verifies asynchronously via `signInHashed`. That stops a PIN
   being read out of the saved file, but the book beside it is still readable and every screen still decides
   for itself what a role may open. On a server: Argon2 on the server, and the server decides every request.
3. **No period locking and no year-end close.** The balance sheet is all-time, the P&L is by period, and
   "earned and kept" is the accumulated result rather than a closed figure.
4. **A transfer between cash and bank posts nothing**, on purpose: every cash account rolls up into one
   ledger account. One ledger account per bank account would be needed to show it.
5. **Small stuff**: the Android status bar colour is fixed in `MainActivity.kt` and ignores the accent, and
   the phone needs the app rebuilt before the native printing and file-saving bridges exist. `README.md`,
   `package.json` and `docs/LEDGER_PLAN.md` were brought up to date with the code at the end of the last
   session; if you change the shape of the project, they will rot again.

## Working cheaply — read before adding to this file

Cost is dominated by **context re-sent every turn**, so a long session gets expensive roughly with the
square of its length. A fresh session that reads this file is far cheaper than continuing a long one.

- **Delegate reading.** More than about two files to read → use a subagent, take back the summary.
- **Never read a whole file** unless it is short. `grep` to find it, then `read` with `offset`/`limit`.
- **Never re-read** a file in the same session. Keep notes in a scratch file if you must.
- **`edit`, not `write`.** Whole-file writes for new files only.
- **One test run per change-set**, not per file.
- **Answer first, keep replies short.** Long explanations are the biggest avoidable cost here.
- **Keep this file short.** Append a line; do not rewrite it.

## Version control — commit before you finish

This folder is a **git repository** (branch `main`). **The user does not use git and should not have to**:
committing is part of finishing a piece of work, like running the tests. At the end of a session, commit with
a message that says what changed and why.

- `git` is installed but **not on PATH**: `C:\Program Files\Git\cmd\git.exe`.
- Ignored on purpose: `dist/` (regenerate with `node tools/build.js`), `android/app/build/`, `.gradle/`,
  `.idea/`, `android/local.properties` (it holds this machine's SDK path).
- `.gitattributes` keeps every file LF in the repository. Do not fight it; a CRLF checkout turns the first
  real diff into "the whole project changed".
- `git status` before you start tells you whether the last session left anything uncommitted.

## How to run the tests

`node` is **not on PATH** on this machine. Use the full path:

```
& "C:\Users\Abdul Mannan\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" tests\run.js
```

Run it yourself. **You can execute commands** — see below. `CHECK.bat` in the project root does exactly the
same thing with a double-click and a pause; it exists for the user, not for you.

Expected: **`All good: N checks passed, M files loaded.`** — the first word is the signal. Anything else prints
one line per problem and exits non-zero.

- **`M` is the number of `<script src="…">` tags in `web/index.html`**, which `tests/run.js` reads directly
  and then loads in that order. Add a file and `M` goes up by one, so the two can never disagree.
- **`N` grows every time a test is added.** Neither number is a target; do not copy a value of either from
  this file into another doc as an expectation.

**Never write either count into a doc or a comment as an expectation.** The previous handoff said
`205 checks passed, 21 files loaded`; the check count was roughly right and the file count was simply wrong,
and it was repeated for a whole session before anyone noticed, because the only part anybody reads is
`All good`. If you want a number in a doc, say how it is derived, not what it was.

### Poking at the app directly

`tests/run.js` only answers pass/fail about checks somebody already wrote. When the question is *"what does
the app actually do here?"*, use `tools/probe.js`. It loads `web/index.html`'s script list in order — so it
cannot drift from the page — and then runs a snippet of your choosing against a throwaway in-memory store,
so it never touches real saved data:

```
node tools\probe.js "console.log(ledBal('Inventory'))"
```

For anything with quotes in it, a PowerShell here-string piped in is easier than escaping:

```
@'
(function(){ ... })();
'@ | node tools\probe.js -
```

Wrap the snippet in a function: the app's globals are all in one scope, and a top-level `const` in your
snippet can collide with one of them (`snap`, `lay`, `net`, `row`, `line` and `cost` are all taken).

This is how the costing problem below was *proved* rather than argued. Prefer it to reasoning about
arithmetic in your head.

`RUN-TESTS.bat` exists and `tools/browser-test.js` once did (a browser runner, since deleted). They are **not needed** and
were a dead end: Chrome blocks a `file://` page from reading local files. Prefer the terminal.

## What an earlier session established — now outdated

### The shell tool used to be broken on this machine

For several sessions every command failed with exit code `3221225794` (`0xC0000142`,
`STATUS_DLL_INIT_FAILED`) before the command line was parsed, and the agent genuinely could not execute
anything, so all verification had to go through the user running `CHECK.bat`. **That is fixed.** The shell
works, the test suite has been run from inside the session, and `tools/probe.js` exists now because it can
be. Full record: `docs/DSH_SHELL_FAILURE.md`.

Practical rule for a new session: **run the tests yourself after every change.** Do not assume an edit works
because it looks right, and do not ask the user to run anything you can run. Only a real run counts as
evidence — the lesson that outlived the outage is the *verifying*, not the *asking*.

### Test output is detailed on purpose

`tests/harness.js` provides:
- `T(name, condition)` — plain assertion
- `eq(name, actual, expected)` — **use this.** On failure it prints `got X, wanted Y`
- `note(label, value)` — records a value, **and a `note()` call makes the whole run fail**; it is for
  dragging a value out during debugging, so take it back out afterwards.

A failure that says only `FAIL something` costs another whole round trip. Always use `eq` for anything
involving a number.

### Traps in the test harness itself

- `tests/run.js` needs `require('./harness.js')`. It has no `const harness = …` binding, so removing that
  line silently leaves `chk`, `T`, `outs` and `passed` undefined and takes down every test.
- Test files run in **alphabetical order**: `app.test.js`, `ledger.test.js`, `persist.test.js`,
  `posting.test.js`. Later files cannot assume what earlier ones left behind — build your own fixtures.
- `chk(name, text)` fails the run if the rendered screen contains `undefined`, `NaN`, `${`, `[object` or
  `Infinity`. It is a cheap way to catch a broken template, and it is why every screen render is wrapped
  in one.
- `tests/run.js` also checks the structure of the app: every `.js` under `web/src` must be listed in
  `web/index.html`, and **no file under `src/core/` or `src/data/` may contain screen code**. That check
  is a list of regular expressions, and two of them are easy to trip by accident in a *comment*:
  `/window\./` matches the words "a window." in a sentence, and `/\btick\(/` matches "tick(".
- **A posting that is refused is silent.** `postEntry()` validates, and a rejected entry is not written
  and no screen says so. Every test that posts therefore asserts the entry exists —
  `eq('the sale posted one entry',ledFor(no).length,1)` — because otherwise a refused entry only shows up
  as a wrong total somewhere far away, or not at all. The stock-adjustment round learned this the hard
  way: `postStockLedger` built its counter-line with `ledSide(acc,-v)`, which is right for an expense and
  wrong for Owner equity, so opening stock produced an unbalanced entry that was refused and the test
  reported a wrong balance three steps later. Capture the return of anything that posts and assert it.

## What exists now

| File | State |
|---|---|
| `web/src/core/ledger.js` | The double-entry engine, **wired in**. `postEntry`, `ledSide`, `ledBal`, `ledBalWin`, `ledKindWin`, `ledCashFlow`, `trialRows`, `ledReverse`. |
| `web/src/core/posting.js` | New. One entry-builder per document. Every posting path calls it. |
| `tests/posting.test.js` | New. Drives the real feature functions and checks the **ledger** against the records. |
| `tests/ledger.test.js` | The engine in isolation. Its reversal checks were **corrected** — see below. |
| `web/src/data/seed.js` | Sample money **removed**. Only the catalogue is left. See "The sample data" below. |
| `web/src/core/derived.js` | `bs`, `tb` and `cf` rebuilt from the ledger. Both plugs **deleted**. |
| `web/src/features/reports.js` | The P&L screen reads the ledger. The `PER[...] × 10000` invention is gone. |
| `web/src/features/dashboard.js` | Every card reads the ledger. The hardcoded figures are gone. |
| `docs/LEDGER_PLAN.md` | The design and the findings. Read this next. |
| `docs/POSTING_RULES.md` | **The spec:** what every action changes, account by account. Kept up to date. |
| `docs/DATA_MODEL.md` | What is saved, what each map means, and what the real database should look like. |

## How the source is laid out

Do not let anything grow into one big file. The split is:

| Folder | Holds |
|---|---|
| `web/src/data/` | `seed.js` — the starting catalogue and the empty stores. No behaviour. |
| `web/src/core/` | State, rules and arithmetic. **No screen code** — `tests/run.js` enforces it. `ledger.js` is the book, `posting.js` turns documents into entries, `inventory.js` values stock, `derived.js` builds report data, `periods.js` maps a period to dates. |
| `web/src/ui/` | Shared screen pieces: toasts, sheets, the calendar, charts. |
| `web/src/features/` | One file per screen, each with the actions behind it. |
| `web/src/app/` | `router.js` (the render loop) and `boot.js`. |
| `web/src/platform/` | `persist.js` — save and load. The only file that knows about device storage. |
| `tests/` | `run.js` loads every file in `index.html` order, then every `*.test.js` in alphabetical order. |
| `docs/` | This handoff, the plan, the posting spec and the data model. |

A new rule or a new figure goes in `core/`; a new screen or button goes in `features/`; the one place that
decides an accounting shape is `core/posting.js`. **Adding a file means adding it to `web/index.html`**, which
is the load order, and `tests/run.js` fails the run if a file is missing from it. `docs/STRUCTURE.png` draws
the whole tree with a note on what each folder is for, and **`node tools/build.js` makes `dist/bookkeep.html`** (the whole app in one file) and
`tools/structure.py` redraws the folder graph. Neither `node` nor `python` is on PATH:
`C:\Users\Abdul Mannan\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe` and
`...\dependencies\python\python.exe`.

## The engine, briefly

`ACCT_TYPES` maps the existing `COA` names to asset / liability / equity / revenue / expense.
`postEntry({date,narr,lines,src,ref,cost,noSave})` validates and writes a balanced entry, refusing
anything unbalanced, unknown, negative, or double-sided on one line. A refusal returns `null` and writes
nothing.

`ledSide(account, amount)` builds one line from "how far this account moves, **in the direction of its
own side**": a positive amount increases the account, a negative amount decreases it and crosses to the
other column by itself. That one helper is what makes the payment rule (F3) and every contra case work
without sign juggling.

`ledBal(account, till)` returns a **signed, natural-side** balance, so an asset reads positive when it is
a debit balance and a liability reads positive when it is a credit balance. `trialRows()` is what decides
which column a balance prints in.

`ledReverse(ref)` reverses a whole document; `ledReverseEntry(id)` reverses one manual entry. Both flag
the entry **void** and write **no mirror entry**.

### The reversal bug that was fixed (read this before "correcting" the tests)

The first version of `ledReverse()` wrote a **mirror entry** and *also* flagged the original `void`.
Because `ledBal()` skips void entries, that counted the reversal and not the thing being reversed, so a
reversed entry left every account at the **negative** of what it had done, instead of removing it.
Reversing a 250 expense left `Expenses` at −250 rather than 0.

The old `tests/ledger.test.js` had that written down as intended behaviour — "a reversal leaves an account
at the negation of its original balance, so `Math.abs(ledBal(...))===0` is the wrong assertion". It was
not intended; it was observed and rationalised. Every invoice edit and every voided payment would have
been wrong by twice the amount.

`ledReverse()` now **just voids the originals** and writes nothing else, so a reversal restores the state
exactly. The void flag is what remains as the record of the reversal. `ledCounted()` also ignores entries
with `src==='reversal'`, so a book already saved on this device with old mirror entries in it does not
have those mirrors counted twice.

## The sample data — what was dropped and what was kept

The seeder used to hardcode `INV`, `PUR`, `PAYB`, `PAYM`, `EXP`, `PAID`, `ADV`, `BAL={Cash:86400,…}` and
stock quantities. None of it had a ledger entry behind it, so the moment the trial balance read the book,
none of it could agree. The user chose **Option A: drop the samples.**

`data/seed.js` now keeps only **furniture**, none of which can put the book out of balance:

- the chart of accounts, category and method lists, and the cash accounts
- the product list, with **zero** stock on hand
- the party and distributor names and contact details, with every figure zeroed
- the price lists and the distributor rates

`wipeData()` (run by the setup wizard) clears every record, every balance and every stock quantity but
**keeps that furniture**, and zeroes stock quantities rather than dropping the products — a quantity with
no purchase behind it would make the stock report disagree with the Inventory account on the first screen
after setup. The wizard's step 3 is now opening balances, and its destructive switch defaults **on for a
first run and off when re-running setup**, because "Run setup again" must not silently delete a real
business's records or post its opening balances twice.

Document counters (`S.n`, `S.pn`, …) now start at 1, so a fresh install numbers its first invoice
`INV-0001`. The wizard resets them too.

## The three reconciliation defects from the plan, now fixed

- **F1** The invoice total is `Math.round(T.g)` but its parts are not. The tax credit is now derived as
  `round(total) − sub`, so the entry balances and the rounding difference is absorbed by the tax account.
- **F2** `postRec` used to consume FIFO layers and throw the cost away. It now accumulates what the layer
  walk actually consumed and passes it to the ledger, so the ledger cannot disagree with the layers it
  just changed.
- **F3** `savePm` kept the advance as `round(avail − applied)` while cash moved by `m.amt`. The ledger's
  advance line is now `m.amt − applied`, and the same signed figure lands on either side of the advance
  account by itself, which also covers an advance being *spent* rather than kept.

## Known gaps — the honest list

1. **A cost correction does not reach the goods already sold.** This is the first thing priority 2 should
   settle, and it is the one the user has asked for twice. When what a product cost changes, the units still
   on the shelf and the units already sold both need restating, or total recognised cost stops equalling what
   was actually paid. Only the shelf half is reachable today.
   **The blocker, precisely:** `CO` is a **rolling average** — `postRec` recomputes it as
   `(old stock × old cost + quantity × rate) / (old stock + quantity)`. A rolling average cannot be
   un-done. `reverseOld` takes the purchased quantity back out of stock but has no way to take the old
   value back out of `CO`, so after a purchase edit the average is simply wrong (a worked example:
   buy 10@60, buy 10@80, sell 5 → cost 70 and everything ties; correct the first invoice to 70 and the app
   recomputes 70 where the truth is 75, so the stock report and the ledger differ by 100 and there is no
   single correct number to post).
   **The fix:** store, per product, **total quantity bought and total amount paid**, and derive the average
   from those instead of rolling it forward. Then a purchase edit is an exact subtraction and addition, the
   average is exactly right, and the restatement follows: after re-posting the corrected invoice,
   `Inventory` needs to move to `sum(stockVal)` and the difference belongs to **Cost of goods sold** —
   which is exactly the already-sold half, and needs no new account. Keep `CO` as a maintained map so no
   reader has to change. That is a contained piece of work, but it touches `postRec`, `reverseOld`,
   `saveProd`, `applyStockAdj`, `saveRet` and the product returns, so it deserves its own round.
2. **A stock adjustment on a product already in negative stock may not tie exactly.** `stockVal()` values
   negative stock at zero, so the report does not move while the ledger does. Negative-stock costing is
   already on the priority 2 list; this is a symptom of it.
3. **A purchase return relieves stock at the return price, not at cost.** `saveRet` credits Inventory by the
   return value while the average cost write-off would be `qty × CO`. The two differ whenever the purchase
   price has moved. Same family as gap 1.
4. **A cash transfer posts nothing, on purpose.** Every cash and bank account rolls up into the single
   ledger account `Cash and bank`, so moving money between them changes no total. One ledger account per
   bank account would be needed to show it. The reasoning is written at the end of `core/posting.js`.
5. **No closing process.** The balance sheet is all-time and the profit and loss is period-based, so
   "earned and kept in the business" is the whole accumulated result rather than a closed-off figure. That
   is consistent, but a year-end close would need real work.

### Fixed in the last rounds

- **Editing a product's cost silently revalued stock.** `saveProd()` used to write `CO[name]` from the form,
  and in average mode the stock report is `qty × CO`, so retyping a price moved the balance sheet with no
  entry. `CO` is now the costing basis and is only ever moved by what was paid; the form edits `BUY`, the
  expected purchase cost, which fills in the next purchase and values opening stock. The form shows the
  costing figure next to the field, and `setProductCost()` is split out so a test can prove the property.
- **A stock adjustment posted nothing** — it now posts `Dr Stock adjustments / Cr Inventory` for a shortage
  and the other way round for stock found, valued by `stockInVal()`/`stockOutVal()` in `core/inventory.js`,
  which apply exactly the rule `stockVal()` does. `applyStockAdj()` is split out of the sheet's click handler
  so a test can drive it. Its first version built the counter-line with `ledSide(acc,-v)`, which is right for
  an expense and wrong for Owner equity, so opening stock produced an unbalanced entry that `postEntry`
  refused in silence — see the harness traps above.
- **A new product's opening stock posted nothing** — it now posts `Dr Inventory / Cr Owner equity`, the same
  shape as the wizard's opening cash, because it is goods the owner brought in.
- **The balance sheet listed four fixed asset and three fixed liability lines.** It now walks `ACCT_TYPES` by
  kind, so an account added later appears on its own line instead of vanishing from the totals.

## Why the product form has no "should this affect stock?" prompt

The user asked for one, and it was considered properly. It does not work, and the reason is worth keeping:

- **"Yes" is not one operation.** Buy 10 at 60, sell 4, correct the cost to 70. Revaluing only what is left
  gives Inventory 420 and cost of goods sold 240 — a total of 660, when 700 was paid. Restating the sold
  units too gives 420 + 280 = 700 ✓. A checkbox saying "affect stock I own" reads like the first and can only
  correctly mean the second.
- **The counterpart decides it.** Restating the sold units is only right when the cost really was higher,
  in which case the other side is what you owe the supplier — so the correct trigger is the purchase invoice,
  not the product form. A pure valuation change has no supplier behind it and must *not* restate sold goods,
  because there is no extra cost to recognise.
- So the app does the right thing without asking: the form's cost is a default, and the guidance on the form
  points at the purchase invoice. When gap 1 is fixed, correcting a purchase invoice will restate the sold
  units automatically, and there will be no prompt to get wrong.

## The chart of accounts gained one account

`Stock adjustments` (an expense) was added to `COA` and to `ACCT_TYPES`. The plan originally said no new
account names would be introduced; this one was added deliberately, and the user chose it, so that damage
and losses are visible on their own line in the profit and loss instead of being buried in general
expenses. The profit and loss now reports "Expenses" as *every expense account except cost of goods sold
and stock adjustments*, so a further expense account added later shows up without that screen having to
know its name.

`persist.js` repairs the chart of accounts after a restore: any name in `COA` that the restored
`ACCT_TYPES` does not know is re-attached as an expense, so a book saved before this account existed does
not end up with an unpostable account.

## The old priorities 2 to 4, and where they ended up

Kept because the plan is the history of the project, but **all three have since been built**; the sections
further down describe them. Only the parts that need a server or a bigger design are still open, and they
are listed under "What is genuinely left" at the top.

2. Stock costing and returns: partial returns, edited invoices, negative stock, out-of-order entries —
   **done**: the cost pool (`BQ`/`BA`), `reconcileStock`, negative stock valued at its last cost.
3. Exports, printing, backups — **done**: CSV, PDF and image exports from every screen, backup and restore,
   real printing through the Android shell.
4. User accounts, permissions, audit trail — **done** as far as a device-only app can: roles, ids, and the
   author on every entry. Authentication proper is the server job.

## How to work with this user

They are not a coder and are building with AI tools. Explain changes in plain language, lead with what is
right and wrong rather than how, and avoid assuming they can read code or run commands. They found the
terminal shortcut and asked for more detailed test output — both were better calls than the ones the agent
was making.

**Run the tests, probes and anything else you need yourself.** Do not hand them a command you could have
run. They are the customer and the decision-maker, not your build server. The one thing worth asking them
for is a decision: which account something lands on, what a prompt should say, whether a feature is worth
its cost. Ask those with a recommendation attached and the tradeoff stated.

When you find something the previous session recorded as a deliberate design decision and you believe it
is a bug — as happened with the reversal logic — say so plainly, show the arithmetic, and fix it. Do not
quietly work around it, and do not preserve a wrong test to avoid an argument. `tools/probe.js` is usually
the fastest way to turn an argument into numbers.

## Priority 2, the costing rebuild

`CO` is now derived from a cost pool: `BQ`/`BA` in `data/seed.js` (saved, wiped and renamed with `CO`) hold
how many units have entered stock at a cost and what they were worth. `core/inventory.js` has `buyIn`,
`buyOut` and `reconcileStock`. A purchase adds its tax-inclusive line value to the pool, a corrected or
returned purchase takes it out exactly, and `reconcileStock` then moves `Inventory` to `sum(stockVal)` with
the difference going to **Cost of goods sold** — no new account. `postRec`, `reverseOld` and `saveRet` were
the only callers to change. `tests/posting.test.js` has the acceptance block: buy 10@60, buy 10@80, sell 5,
correct the first invoice to 70 → `CO` 75, stock report 1125, Inventory 1125, cost of goods sold 375, gap 0.
**Run and green:** `All good: …`. The shell failed with `0xC0000142` on plain
`workspace-write`, exactly as `docs/DSH_SHELL_FAILURE.md` records; it works when the command is retried
with the `danger-full-access` policy. Try that first if commands stop running again. `tests/posting.test.js`
carries the acceptance block, so run `tests\run.js` (or `CHECK.bat`) after any change to `CO`, `BQ`/`BA` or
the restatement.

## Negative stock — done too

`stockVal()` now values goods sold before they were bought at their **last known cost** instead of zero, so
the stock report and the Inventory account agree immediately (gap 2 is closed; a stock adjustment on the
same product ties too). When a sale leaves a product short, `shortSheet()` in `features/invoices.js` asks
what the goods cost and offers **Record the purchase** (opens a new purchase with the missing units and that
cost filled in — posting it is what re-values them) or **Keep the last cost**, which leaves the item in
Notifications under "Negative stock" until a purchase is recorded. The sheet's text is a plain string,
`shortHtml(list)`, because the fake browser in `tests/` cannot click a button, so anything left inside a
handler is untested. The handlers themselves are still the one part no test can reach; drive them by hand in
a browser if you change them.
A product that has **never been bought** has no last cost, and the app's long-standing fallback is four
fifths of the sale price. That is a guess, so both the sheet and the notification now say so (`k` on each
short line is false when there is no `CO`), instead of printing the guess as a figure somebody paid.

## The sample business — `features/demo.js`

A blank app tells nobody anything, so there is now **one small trading business** available: six weeks of
purchases, sales, two distributor invoices, ten payments, two returns, six expenses, a stock adjustment, two
transfers, two journal entries and three quotations, ending profitable with low stock, an overdue bill, an
unallocated advance and expiring quotations in Notifications.

It is **not** seed data. Every document is posted by calling the same function the screen calls
(`post`, `savePm`, `saveRet`, `saveExp`, `saveTransfer`, `postJournal`), with `S.quiet` set so the success
sheets do not stack up (`okOverlay` and `toast` no-op while it is set). That is why the books balance:
`tests/posting.test.js` loads it and then asserts the ledger against the records — Inventory against the
stock report, cash against the accounts, payables and receivables against their lists, and that every
invoice and purchase has an entry behind it. If a demo figure ever drifts from its own book, that fails.

It is offered in **two places** — the Data section of Settings, and a card on the dashboard that appears only
when there are no documents at all — and `confirmSheet` warns that it replaces what is there. It is never
loaded automatically. `openScr()` resets the invoice date, so each helper sets `S.d.inv` **after** opening
the screen; setting it before silently dated every purchase and sale today, which no total noticed and only
the period reports showed. `tests/posting.test.js` now checks the sample spans six weeks and that this month
is a *part* of it.

## Users and roles

**Ids, not names.** Every user carries an `id` (`nextUserId()`), and anything pointing at a user points at
that id — the session, the log-in picker's option values, and each ledger entry's `byId`. Names are what a
person reads; they get changed, and anything still holding the old one would lose the thread. A book saved
before ids existed gets them from `ensureUserIds()`, which `persist.load()` runs after a restore **and**
`app/boot.js` runs on every start: a fresh install has nothing saved, so `load()` returns early and its
repair step never happens.

**Who posted what.** `postEntry()` writes `by` (the name) and `byId` on every entry, because every entry in
the book is created there. Both are kept deliberately: the id still points at the user after a rename, the
name still reads correctly after the user is deleted. Reversals record `voidBy`. The journal entry screen
shows "Entered by" and "Reversed by", and an account page shows the author of each line. Entries posted
before this change have no author and never will — nothing can recover it.

`core/users.js` holds the rules — `ROLES`, `CAPS` (the capability each role has), and the three maps that
say what a screen, a tab and a More row need (`SCREEN_CAP`, `TAB_CAP`, `MCAP`) — plus `signIn`, `signOut`,
`userProblem`, `saveUser`, `delProblem`, `delUser`. It is **screen-free**: it returns reasons, the feature
shows them, because `tests/run.js` fails a `core/` file containing screen code. `features/users.js` has the
log-in screen, the refusal screen and the Users editor.

Four roles. Administrator holds every capability; Manager runs the shop but not the company settings, the
templates, the wizard or the users; Cashier bills and takes money but cannot see the reports, banks or
journal; Viewer can open reports and nothing else. `usersScr()` prints that list on screen, so nobody has to
read this paragraph.

The gate is in **one place**, the top of `render()` in `app/router.js`: nothing but the log-in screen is drawn
while `!S.user`, and a screen or tab the role cannot open renders `noAccess()`. `tabs()` filters the tab bar
and `more()` filters its rows, so a cashier is not shown a door they cannot open. An install with **no users
is ungated**, which is how the app behaved before users existed — nothing breaks for somebody who never turns
them on.

`S.user` is a **session** value and is deliberately not in `SKEYS`, so closing the app signs you out. A fresh
install seeds one administrator, `Admin` / `1234`, and the log-in screen says so until the PIN is changed.
Be clear about what this is: the book is a file on the device, so a PIN keeps out a casual user, not somebody
who owns the phone. Two known holes to close later: **Reset all data removes the users too**, leaving the app
open again, and everything is kept in the same browser storage a determined person could read.

**A screen that throws now says so.** `render()` wraps the screen in a try/catch and draws `screenError()` -
the tab or screen that failed, the message, and a way back to the dashboard. Before this, anything that threw
left an empty page with no clue: the Parties screen went blank on one device and could not be reproduced
here, and a blank page is the worst possible way to find out. **If Parties is blank again, send the message
on it.**

**An export follows the filters on screen**, not the whole table: the period, the status/type/category chips
and the search box. Every list builds its filtered rows once and hands the same array to the screen and to
`setExport()`, so what you see and what you get cannot drift.
## Long-press selection, and the bottom of a list

`.scr` keeps **176px** of bottom padding, not 110: the "New Invoice" button floats above the tab bar and was
covering the last row of every list. If a screen grows a taller floating button, that number has to move.

**Long press to select** rows, in `ui/kit.js`: any list whose rows carry `data-sel="id"` gets it for free.
The listeners are on the document because rows are rebuilt from HTML every render, and a long press is
followed by a real click that would otherwise open the row — so `S.lpAt` (a timestamp, not a flag) swallows that
one click. It is a timestamp because a long press on a phone often fires no click at all: a flag stayed set and
ate the *next* tap, so Cancel and deselecting the only selected row each needed two taps.
While a selection is active, a tap adds or removes a row, `#app.selon` hides the floating button, and
`selBar()` draws the bar: **All** (every row the list is *showing*, not every record — the period filter may
have narrowed it), **CSV**, **PDF** and **Cancel**.

**PDF is a batch print.** `batchScr()` puts every selected document on one page each, using the same
`invPaper()` the preview uses, and the print CSS needed a rule of its own: `.paper` is absolutely positioned
so papers stacked on top of one another, and `.paperbatch .paper` makes them flow with a page break. The PDF
button only appears when every selected id is a document the app can print.

A list becomes selectable by adding `data-sel` to its rows and setting `S.selRows`/`S.selCols`/`S.selTitle`
when it renders — sales, purchases and expenses do. **Mark paid, delete and duplicate are deliberately not
in the bar:** payments and voiding have their own rules, and a bulk action that half-obeys them would be
worse than none.

## Export, backup and restore

**Three formats, chosen from a sheet** (`exportSheet()`): **CSV**, **PDF** and **Image (PNG)**, always of what
the screen is showing. CSV is `csvText()`. PDF builds a printable `.paper` from the same cols/rows
(`pdfTableHtml`) and hands it to the print dialog. The image is drawn on a canvas (`tableImage`) — no library,
no network — and saved as bytes rather than text. On the phone both need the shell: `Saver.saveBytes()` for
the PNG, and `Printer.printPage()`, because **`window.print()` does nothing at all in a WebView**; that bridge
is also what makes the batch invoice printing work on the phone. An older app build gets a "Update the app"
toast instead of a silent nothing.
**Export is a CSV** of whatever the screen is showing, with the period filter already applied. Every screen
that shows a table calls `setExport(title,cols,rows)` **as it renders**, and the export button in its header
writes that out (`exportSheet()` in `ui/kit.js`). One shape, one button, and no second copy of the data that
could drift from the screen. The old placeholder sheet offering "Excel/PDF/Image" is gone — it only ever
printed a toast. Real xlsx or PDF output is still not built.

**Backup and restore** live in Settings → Backup and use the same object `save()` writes
(`storePayload()`/`applyStore()` in `platform/persist.js`), so a backup cannot hold something the app would
not have saved. A backup is one JSON file; a restore **replaces** everything and says why it refused a file
that is not one. If the restored book has different users, the session is signed out rather than left as a
stranger. `resetSheet` still removes the key outright.

**Saving a file** happens three ways, best first, in `downloadFile()`: `window.Saver` — the Android shell's
native bridge (`MainActivity.kt`, `Saver` → `ACTION_CREATE_DOCUMENT`, and it reports the result back through
`window.saveResult` so the app never claims a file it did not write); a Blob download in a desktop browser;
and, when neither is available, a sheet with the text and a Copy button, because a WebView download does
nothing at all and does not throw. **Restoring** works in the app already: the file picker is the one built
for receipt photos, and reading the chosen file is plain JavaScript. The restore input accepts any file type
(`accept="*/*"`) so a backup renamed `.txt` can still be picked; `restoreJSON()` validates it either way.

**Period filtering** is `inP(date)` on the records, and the chips set `S.period`: sales, purchases, payments,
quotations, journal, returns, expenses, reports, the dashboard, and one account's history. Lists that are not
a set of dated documents — stock on hand, employees, the customers list, the chart of accounts — deliberately
have no period chips, because filtering a list of people or of products by a date range means nothing. They
have the export.

## Popups open and close with an animation

A sheet slides up from the bottom while the backdrop fades (`up` + `fd`); closing it slides back down while
the overlay fades out (`down` + `fo`, `.ov.off`). The closing half is installed **once**, in `ui/kit.js`: the
app takes overlays off the page with `o.remove()` from a dozen screens, so `Element.prototype.remove` is
wrapped to mark an `.ov`/`.ok` with `.off` first and remove it 210ms later. That keeps every existing call
site working and animates all of them at once. **The 210ms in kit.js and the .2s in components.css have to
stay in step** — if the CSS is slowed down, the element would be pulled out mid-slide.
**The accent picker is a row of round swatches** (`.dot`, ui/kit.js `ACCENTS`), with a ring on the chosen one,
its name beside the label, and a rainbow circle at the end for any colour at all. Eight coloured pills with
white text was the first go and it looked like a bag of sweets.

**Two scrolling faults fixed, both from entry animations.** `.row` used `animation:in .3s both`, and filling
forwards leaves a `transform` on every row for ever - each row gets its own compositing layer, and a screen
full of them shimmers against whatever is not animated while it scrolls. It is `backwards` now. And a *soft*
render (typing in a search box, tapping a chip) redraws the whole screen, so every row replayed its entry
animation and the list jumped under your thumb; `put()` now adds `.still` to the screen on a soft render and
`.scr.still *{animation:none}` stops it. **If a screen still shifts while scrolling, it is neither of these
and worth another look.**
## The Theme module

Light or dark and the accent colour moved off the top of the More screen
into **More → Theme** (`thScr()` in `features/more.js`), so they behave like every other module and stop
sitting in the way of the list. Its capability is `dash`, so anyone signed in can change how the app looks. The **invoice title** is on Templates (where the documents are) and the **currency** on Company Profile; `CURRENCIES` in core/config.js is the one list both the wizard and the profile use.
The accent is saved with the books; `S.theme` is saved too but is a device preference in practice.
## The accent colour

`TPL.accent` has always driven the printed documents; now it drives the whole app. **More → Accent colour**
offers a **spectrum** of twelve - Blue through Azure, Cyan, Teal, Emerald, Green, Indigo, Violet, Magenta, Pink, Red to Slate - and a colour picker for any other. A colour of your own rings no preset, which is deliberate: the label says 'Your colour'. `applyAccent()` (ui/kit.js) writes three CSS
variables from it: `--pr` (the colour itself, lightened a little in a dark theme or a deep green disappears
into the background), `--prt` (a tint for backgrounds) and `--onpr` (the text that sits ON the colour —
chosen by luminance, because a pale accent with white text is the usual way this looks broken). `theme()`
calls it and so does every `render()`, so switching light/dark or restoring a backup cannot leave it stale.
The colour is part of `TPL`, so it rides along in the backup and the export image uses it too. The Android
status bar is still fixed in `MainActivity.kt` and does not follow it.
## Income accounts, the detailed sales report, and detailed exports

**An invoice can be posted to any income account.** The invoice form has an *Income account* picker listing
every account of kind `revenue` (`ledAccts('revenue')`), and it can raise a new one in place: the kind prompt
preselects Income because the select carries `data-kind="revenue"`. `postSaleLedger` credits `o.acct||'Sales'`,
the snapshot keeps `acct`, and reopening an invoice restores it. The profit and loss already groups every
revenue account, so a new one gets its own line with no change there.

**The detailed sales report** (`repData('ts')`) shows one row per income account with its net sales, and **filters by income account**: a report can offer a filter of its own by returning `opts`/`skey`/`set` and `rptScr` draws the chips beside the period ones. The filter narrows the summary, the total and the export together. The rows
come from the **ledger**, not from the documents, so they add up to the total and agree with the profit and
loss — the first version summed invoice lines and was out by the value of a credit note. Tax is counted from
the documents because tax is not an income account.

**Every report exports its detail.** `repData` is a wrapper: `repSum(k)` builds the summary the screen shows
and `repDetail(k)` builds the lines behind it, attached as `detailCols`/`detailRows`. `rptScr` registers the
detail for the export when there is one, so the file has the invoice numbers, the party, the item, the rate
it went out at and the tax — while the screen stays a summary. The distributor report therefore exports one
line per item at the **distributor's price** (`lineUnit`). One trap: **the invoice number is the key of
`INVD`, not a field on the snapshot** — `docs()` carries it across with `Object.entries`.
## Employees — More → Employees

Three new accounts: **Salaries** (expense, its own line on the profit and loss), **Employee payable**
(liability, what the company owes staff) and **Advances to staff** (asset, what staff owe back). The
capability is `employees`, held by the administrator and the manager, so a cashier cannot see wages.

The money moves four ways and each is a different shape:

| Action | Posts |
|---|---|
| Salary run (salary + bonus) | Dr Salaries · Cr Employee payable · Cr Advances to staff for what is recovered |
| Pay an employee | Dr Employee payable · Cr Cash and bank |
| Advance | Dr Advances to staff · Cr Cash and bank |
| An expense an employee paid for the company | Dr Expenses · Cr Employee payable |

The cost lands when the salary is **run**, not when it is paid, so what is owed sits on the balance sheet
until the money moves. An advance is an **asset**, not a cost, until the work is done; recovery is capped at
what is still owed and at the salary, so a payslip can never go negative. An employee-paid expense comes off
their payable at the next salary instead of touching cash or a supplier.

Balances are **derived, never stored**: `empBal()` and `staffAdv()` in `core/staff.js` work them out from
`SAL`, `STFP`, `EMPA` and `EXP` every time. The test that matters is that they equal the ledger accounts —
if a balance is ever cached, or a posting forgets a side, `tests/staff.test.js` fails.

Recurring salaries are **offered, never posted behind anybody's back**: `salaryDue()` lists who has not been
run this month, the Employees screen and Notifications show it, and `accrueSalaries()` posts one entry each
when somebody says so. Running it twice is impossible because the check is "no run for this month".

**Two traps paid for here, both worth remembering.** A posting refused by `postEntry` comes back as `null`
(not `false`), so `if(ent===false)` lets the record be written anyway and the book silently drifts — the
Staff functions check `!ent`. And the ledger knows one cash account, `Cash and bank`: passing an app account
like `'Cash'` is refused, so the staff postings always credit the rolled-up account while `BAL` moves the
account the person chose.

## Accounts module — Reports → All accounts, and More → Accounts

`acScr()` lists every account in the chart with its kind and the side its balance actually sits on;
tapping one opens `acdScr()`, that account's own page: every debit and credit line with the balance after
each, oldest first. `ledHistory(acc,from,to)` in `core/ledger.js` is the engine, and it orders by **date**
rather than by when the entry was typed, so a back-dated document lands where it belongs. The running
balance is signed to the account's natural side (`ledBal`), so a liability reads positive when owed; the
list screen's figure comes from `trialRows()` and is signed the other way (its column), which is why the
side label there is simply `v<0?'Cr':'Dr'` and must not be given the natural-side rule too.

**Fixed:** a manual journal line on **Cash and bank** used to move the book without moving the cash screens,
because `BAL` is kept separately from the single ledger cash account. The journal now offers the **real**
accounts instead — `COA` minus 'Cash and bank', plus `ACCTS`. A line naming 'Cash' or 'Main bank' is posted
to the rolled-up ledger account and the same movement is applied to that account's balance; the name picked
is stored on the entry as `rec.cash`, and `revJournal()` moves it back on reversal, so a reversed cash
journal leaves nothing behind. Probed: opening 1000 cash and 5000 in the bank, a journal crediting Cash 250
now leaves the cash screen at 750 and the book at 5750 — and 750 + 5000 = 5750.

## Sticky filter bands and chip feedback

List screens put their search and filter chips in one `.shead` (sticky, opaque, shadow only once rows pass
under it via `headsStuck()`). The title scrolls away; only controls stay. `Expenses` and `Payments` keep their
total card *below* the band so both chip rows stay together. Only the tapped chip pops (`.chip.pop`, set from
`S.pop`), and a filter tap lets rows animate while search typing stays still.

## The server database (design only)

`db/schema.sql` is a runnable PostgreSQL schema and `docs/DATABASE_PLAN.md` explains it, maps every saved JSON
key to a table, and gives the import/verification order. Nothing in the app talks to it yet. The schema was
executed against a live Postgres and its guarantees exercised (unbalanced entry refused, posted entry and its
lines immutable, retried `client_uuid` refused, trial balance zero). No pgcrypto is needed: gen_random_uuid()
is core from PostgreSQL 13.

## Urdu, and the language layer

`core/i18n.js` holds `LANGS` and the Urdu dictionary `UR`, keyed by the ENGLISH phrase, so a missing entry stays
English instead of showing a key. `tr()` reads it, `S.lang` is saved with the book, and More → Language (`lg`)
switches. `applyLang()` in `render()` sets `<html lang dir>`; the handful of RTL fixes live at the end of
`components.css` (Nastaliq line-height, amount columns, numeric direction, back-arrow flip). Chips translate what
they SHOW but keep the English value in the onclick - translating the value would break every filter.

Translated so far: tab bar, More/Theme/Language, dashboard, and the Sales, Purchases, Expenses, Payments, Parties,
Inventory, Journal, Quotations and Returns lists (titles, search boxes, status badges, empty states, period and
status chips). Still English: forms, reports, settings and printed documents.

## PINs are hashed now

`core/users.js` stores `pinHash`/`pinSalt` (PBKDF2-SHA256, 150k rounds, 16-byte salt) and never the digits. A
book from an older build is upgraded automatically at boot, on `load()` and after a restore (`ensurePinHashes`),
and opportunistically on the first successful sign-in. The log-in screen uses the async `signInHashed`; the old
synchronous `signIn` still exists for tests and returns false for a hashed user, so nothing can "verify" a hash by
string comparison. A blank PIN on an edit keeps the stored hash; the default-PIN hint now follows `wasDefault`.
Measured: ~60 ms per hash on this desktop, so a phone pays a few hundred ms on sign-in - deliberate.

## Automatic backups, the reminder, and a checked restore

`platform/backups.js` keeps the last five snapshots in IndexedDB (falls back to memory with a warning if the
browser blocks it; `bkIdb` times out rather than hanging on a blocked upgrade). One is taken automatically once a
day — at boot, and again when the app returns to the foreground — plus before anything that replaces the book
(load sample, reset, restore from file, restore a snapshot). `platform/backups.js` also owns `bkHealth`, which
Notifications and Settings read to say "never" / "3 days ago".

The Backups screen is `features/backups.js` (`openBackups()` loads the list asynchronously, then renders `bkScr`).
A restore keeps the current book in memory first, and if the restored copy does not balance it puts the current
one back instead of leaving a broken book. Verified against a real IndexedDB (fake-indexeddb in Node):
storage=indexeddb, snapshot written, restore ok, trial balance 0, pruning to 5. On `file://` the browser gives
IndexedDB no usable origin, so the screen warns that snapshots are memory-only — the Android shell serves over
`https://appassets`, where IndexedDB is available.

## Cloud sync (Supabase) and the desktop shell - first slice

`db/supabase.sql` creates `sync_books`, `sync_members` and `sync_state` with row-level security and a
`create_sync_book()` RPC. `platform/cloud.js` implements sign-up/sign-in/refresh, book adoption, pull, push and the
version rule (`cloudVersionState`); `features/cloud.js` is the screen (Settings → Cloud sync). Every push is
`PATCH ... where version = N`; a mismatch is a conflict, never an overwrite, and the user chooses which copy wins.
`cloudTouch()` is called from `save()` but hashes the payload first, so rendering a screen does not upload.

Verified against a local stand-in that follows the same PostgREST rules: push v1, pull "From the phone", conflict at
v2 with local edits, force-upload to v4. NOT yet run against a real Supabase project - that needs the owner to
create it and run `db/supabase.sql`. Setup notes: `docs/CLOUD_SYNC.md`.

The desktop shell is `desktop/` (Electron, `npm install && npm start`): contextIsolation on, nodeIntegration off,
and only two bridges - `Saver` (system save dialog) and `Printer`. It loads `../web`, so there is no second copy of
any screen. Electron itself was not downloaded here, so the shell is syntax-checked, not launched.

## Desktop app: built and launched

`desktop/` is now a real Electron app, not a plan. `npm start` runs it from source; `npm run dist` packages it with
@electron/packager into `desktop/release/Bookkeep-win32-x64/Bookkeep.exe` (172 MB, double-click, no Node needed).
The packager places `../web` into `resources/web`, and `main.js` loads that when `app.isPackaged`, so the packaged
app runs the same screens as the phone instead of a stale copy.

`--smoke` captures the first window to the temp folder and exits. Verified twice: from source, and from the packaged
exe - both reached the real sign-in screen. Note for this machine only: the harness exports ELECTRON_RUN_AS_NODE=1,
which makes Electron behave as plain Node; the smoke runs remove it. A normal double-click is unaffected.

## Desktop layout

At 900px and wider the tab bar becomes a left sidebar (or right in Urdu), lists and dashboards use the width
(3 cards per row, 4 above 1500px), dialogs become centred modals, FABs move to the bottom-right, and no-nav
screens such as the log-in sit in a centred column. `render()` toggles `#app.hasnav` when a tab screen is showing,
which is what decides whether the sidebar is reserved - CSS alone cannot know. The phone layout below 900px is
unchanged. `.row.tap` is forced back to flex: `.tap` came later in the file and turned those rows into blocks,
which is why the cash/bank amounts used to sit against the label.

The packaged exe was rebuilt after this and smoke-tested with `--smoke-app --smoke-tab=sales`: SMOKE_INFO reported
app="hasnav", and the capture showed the sidebar layout.

## Desktop shell polish

Single-instance lock: a second launch focuses the existing window instead of opening another copy of the app (two
copies would each write their own browser storage, and the second window is what shows as a strip of UI at the
edge of the first). Native menu bar is auto-hidden (Alt shows it), the window carries `desktop/icon.ico` and the
packaged exe is built with it, and a resize forces a repaint after 120ms to clear stale edge pixels. A maximised
capture at 1920x1052 confirmed the log-in stays a centred 720px column.

## Stale strip on the desktop window

The strip at the window edge is a compositor artefact, not the page: a page capture never showed it, an OS-level
capture did. The shell now: disables hardware acceleration, disables `CalculateNativeWinOcclusion`, sets
`backgroundThrottling:false`, paints the first frame before showing the window, repaints after a resize, and keeps
its own title (`Bookkeep 0.1.0`) instead of letting the page's `<title>` overwrite it. Single-instance lock was
already added; four `Bookkeep` processes in Task Manager are Electron helpers for one window, not four windows.

## Stale desktop windows

The user's screenshot had the old title "Bookkeep", not "Bookkeep 0.1.0": they were looking at a window from a build
made before the single-instance lock existed, so the new launch could not displace it. Packaged builds now close any
other Bookkeep process that owns a window 600ms after start (PowerShell `CloseMainWindow`; helper processes have no
window and are untouched). Verified: launching twice leaves one window titled "Bookkeep 0.1.0".

## Log-in column

The Sign in button is an inline-block, so `margin:auto` never centred it; the notes are block text with no align.
`loginScr()` now returns one `.auth` column (`max-width:520px;margin:0 auto`) holding the title, card, fields,
button, first-run hint and "Can't sign in?", so all of them share the same edges on desktop and phone.

## Desktop screens, not stretched phone screens

Print/Preview: paper-size choice is a compact segmented control (`.sw` no longer flexes to full width on desktop),
the page is scaled to fit the *height* as well as the width (fitPaper), and the action bar's buttons are grouped at
the right with fixed widths instead of stretching. The invoice editor keeps its 720px centred form column with the
same compact action group. More is a two-column module grid (`modgrid`). Sidebar layout, ready-to-show and the
single-instance/cleanup rules are unchanged.

## No-nav screens: centred buttons and notes

`display:block` is what makes `max-width` + `margin:auto` centre a button; as inline-blocks they sat left. Standalone
`.lbl` notes on those screens are now centred too. This is the same class of bug as the log-in button, fixed once for
every screen without a sidebar (Backups, statements, report notes), rather than per screen.
