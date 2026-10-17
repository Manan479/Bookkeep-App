# Roadmap

## What the prototype already covers
Parties with several roles, products with brands, units and lot/expiry, sale, purchase and distributor invoices
(drafts, editing, per-line percent or amount discount and tax, custom charges, optional pending balance), payments with
manual allocation and advances, returns, quotations with partial conversion, expenses with receipt photos, cash and bank with
transfers, journal, reports and statements, notifications, company profile, print templates (A4, A5, thermal), settings,
setup wizard, saved data on the device. Tested by `npm test`.

## Not built yet
- Commission and payroll modules, cheque register (post-dated cheques), bank reconciliation, period locking, multi-currency.
- Real Excel, PDF and image export, real printing (Bluetooth thermal), emailing or WhatsApp sending.
- A true double-entry ledger, tax-payable accounting, fixed assets, barcode scanning, stock by lot and expiry.
- Editing or voiding returns; voiding invoices (left out on purpose for now).
- Multiple users and roles, security (PIN, 2FA), encryption of saved data.
- Sync between devices, backup to Google Drive, desktop version.

## Suggested order for the real build
1. **Data model and accounting core.** Database schema with ids, double-entry ledger, stock movements, costing (average and FIFO),
   posting rules from `POSTING_RULES.md`. No screens. Tests first; the checks in `tests/` are a starting list.
2. **Android screens on the core.** Re-use the prototype's look. Replace the sample data with the database.
3. **Backup and restore to Drive**, then the multi-device sync in `SYNC.md`.
4. **Desktop** on the same core.
5. **Remaining modules**: commission, payroll, cheques, reconciliation, period locking, exports and printing.

## Decisions still open
- One shared codebase (Flutter or Kotlin Multiplatform) versus keeping web screens in a shell.
- A single business per install, or several companies per login.
- Whether this is one business's own tool or a product sold to many (affects hosting, billing and data separation).
- Which countries first (tax labels, number rules and invoice requirements differ).
