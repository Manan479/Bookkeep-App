# Durable invoice and payment posting

Invoice/purchase posting and edits, customer/supplier/distributor payments, bill payments,
and invoice/payment voids now use `bookTransaction` in `web/src/platform/transactions.js`.

The operation snapshots the book and retains original object references for rollback, suppresses
intermediate saves, applies record/stock/ledger changes, checks ledger balance, appends history,
then replaces `bk_v2` with one synchronous localStorage write. Success UI runs only after that
write returns. Storage failure or a refused ledger entry restores records, form state, counters,
and object references. Cloud notification occurs after the local commit.

The single-key replacement provides atomic application storage: interruption before replacement
leaves the old saved book; interruption after replacement leaves the complete new book. This is
subject to browser/OS storage durability and does not protect against clearing app data, device
failure, or concurrent writers. Backups remain necessary. This is not a database transaction server.

History is available from Settings → Posting history and travels with saved books, backups, and
cloud snapshots. Entries include UTC time, actor ID/name, action, document reference, before/after
document and ledger versions, and names of affected collections. Existing books start with empty
history; old events are not reconstructed. Local history is not tamper-proof. Reset/sample-data
operations clear it along with the book. Full-book snapshots and growing history limit scalability.

Other operations (expenses, returns, staff, manual journals, transfers, restore and sync adoption)
have not been moved into this boundary. The render loop still saves for these legacy workflows.
Permissions are checked locally for the covered posting commands; server enforcement is separate work.

Validation: `node tests/run.js` includes injected storage failures, ledger refusals and exceptions,
retry, duplicate submission, invoice edit/void, partial payment, persisted history and reload checks.
`node tests/restart.js` boots fresh VM instances against shared throwaway storage to verify restart.
Build with `node tools/build.js`, then run the suite with the BUNDLE environment variable set to 1.
