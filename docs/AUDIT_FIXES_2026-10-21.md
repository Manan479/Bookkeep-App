# Audit fixes — 21 October 2026

## Result

Addressed the 16 findings from APP_AUDIT_2026-10-21.md and the additional UI defects reproduced during the fix pass. The original audit remains as a historical record. This report is the current status.

## Accounting and record behavior

- Invoice discounts reduce the selected revenue account, rather than tax payable.
- Currency values use two-decimal precision consistently in totals, register rows, posting, charges and displayed amounts. Grand totals derive from the rounded subtotal, discount and tax components.
- Return creation, manual-journal creation, salary creation, staff payments/advances, cash-account openings and transfers commit through transactions. Product creation/updates also protect opening-stock posting. Failed-storage regression checks restore balances, rows, ledger entries and counters.
- Return notes now support editing and void/deletion. Stock quantities, cost pools, invoice balances, credits/refunds and ledger effects are reversed together; consumed credit or unavailable returned stock blocks an unsafe reversal. Reversal reconciles current stock valuation and keeps the history.
- Manual cash journals can be edited while retaining the selected cash/bank account mapping.
- Employee payments, employee advances and transfers have working detail, edit and removal paths. Advance reductions are constrained by amounts already recovered.
- Linked payments/expenses whose amounts are locked still allow corrections to descriptive notes/reference, without changing settlements.
- Cash-account histories include employee payments, advances and manual cash-journal movements, and exclude void transfers and personally paid employee expenses.

### Existing saved invoices

New or edited invoices use the corrected accounting immediately. Existing journal entries are not silently rewritten.

Use **Settings → Check saved invoice accounting** to review corrections for older saved invoice snapshots. **Apply repairs** creates a safety snapshot, then commits corrections and audit history together. If IndexedDB is unavailable, the safety copy must be saved to localStorage before repairs proceed. Correctable overpayments remain party credit; cash and physical stock quantities are preserved. A record with an overpayment that cannot be traced to a saved payment is refused with an explanation rather than guessed at. The tool and its idempotence/credit retention have unit and browser coverage.

## Documents and exports

- The tested short purchase invoice is now exactly 794 × 1123 px and exports as one A4 page in Classic, Clean and Bold. Both signing spaces remain 160 px (approximately 42 mm).
- Margins, header, terms and footer spacing were adjusted; the signing area was not shrunk to pass pagination checks.
- Detailed table PDFs group columns into readable sections and repeat the identifying first column. The tested table measures 718 px within a 794 px paper, rather than overflowing to 854 px.
- Table image exports wrap complete values instead of shortening them with ellipses.
- Text descriptions, document names, notes, party details and company footer values are escaped. Document image sources and accent values are constrained to safe formats.
- Spreadsheet exports neutralize formula-like text while keeping numeric values numeric.
- The head-office/branch display setting continues to work.

## Interface and interaction fixes

- Searches preserve keyboard focus/caret during redraws; typing `Rent` retains the whole word rather than only `R`.
- Textarea text uses theme colours; invoice terms remain readable in dark mode.
- Custom dropdowns mirror disabled state and expose a descriptive accessible name.
- Optional empty choices such as **None** are selectable again, including removing an expense's related invoice link.
- Persistent add buttons, action bars, selection bars and phone tabs have space outside the content's scroll viewport. They no longer cover otherwise visible list controls.
- Closing dialogs immediately stop receiving pointer input. Queries and Back/Escape handling ignore closing overlays, preventing stale dialogs from capturing the next action.
- Escape dismisses the active dialog or selection. Modal Tab navigation stays within the active dialog.
- Additional icon labels, switch roles/states and dialog semantics were added.
- Dynamic values in input attributes and quoted click arguments are escaped, protecting names/account labels that contain quotes.
- Salary/recovery wording is clearer; the outdated Settings claim that payroll is unavailable was removed. Common headings, action labels, fields and new flows have expanded Urdu translations and RTL coverage.
- The scanner control now supports product-code entry, USB-scanner keyboard input and camera barcode capture on supported browsers. Unsupported or denied camera access has a manual-entry fallback. Camera streams stop when the dialog closes.
- Invalid image uploads report an error. Product/stock/tax inputs reject invalid numeric values, and renaming a product with transaction history is blocked with an explanation.

## Verification

- **901 source checks passed.**
- **901 standalone HTML checks passed.**
- Fresh-process restart/persistence checks passed.
- **71 screen scenarios × 3 widths = 213 render/field/handler checks**, including 828 inventoried field instances; no screen errors, malformed inline handlers or viewport overflow were detected.
- **132 additional UI screen runs across 12 combinations** of width (1440, 1024, 390), light/dark and English/Urdu; no unexpected blocked controls or browser errors remained.
- Direct UI checks passed for scanner entry, clearing optional links, disabled dropdowns, employee payment/advance editing, transfer editing, return editing, Escape and applying the historical invoice-repair tool.
- Existing invoice/PDF, bulk-selection/PDF/ZIP, desktop-style and theme/navigation browser suites passed.
- The targeted behavior probes now report: net revenue 90 and tax 0 for a 100 sale less 10 discount; saved/register totals both 100.49; no orphaned billed charge after expense removal; full search text; readable dark textarea; one-page A4 output in all styles; literal item descriptions; neutralized CSV formula text; no table-width overflow.

Evidence is in `dist/fix-tests.txt`, `dist/fix-bundle.txt`, `dist/fix-restart.txt`, `dist/fix-documents.txt`, `dist/fix-bulk.txt`, `dist/fix-desktop.txt`, `dist/fix-theme.txt`, `dist/fix-screen-summary.json`, `dist/fix-behavior.json`, `dist/fix-ui.txt` and `dist/ui-fixes/results.json`.

## Scope

Checks used disposable local sample books. They did not alter the user's working book. Native Android execution, physical printers, camera hardware, operating-system share targets and live multi-device cloud accounts were not exercised. The camera fallback and web UI behavior were checked locally. No APK was built.

`dist/bookkeep.html` and the packaged desktop application's shared web resources were updated. Restart the desktop app to load them.
