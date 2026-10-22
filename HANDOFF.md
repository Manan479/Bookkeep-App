# Bookkeep handoff

Updated **23 October 2026**. Read this first. This file describes the current state; older implementation notes are preserved in `docs/HANDOFF_HISTORY.md` and may be obsolete.

## User preferences and working rules

- **Keep committing to Git.** Commit each completed, coherent set of changes with a useful message. Check status before and after; preserve unrelated work. The user explicitly reaffirmed this on 21 October 2026.
- **Ask before generating an APK**, unless the current request explicitly asks for an APK. Do not rebuild it after every UI edit. The latest APK was explicitly requested and built successfully.
- Update the shared standalone HTML and existing packaged desktop web resources when delivering shared UI changes. Restart is needed to load them. Avoid closing the user's app or repackaging the executable without need.
- Explain changes in plain language. Complete authorized work without repeatedly asking for approval. Do not push commits or publish artifacts merely because local commits were requested.
- Test/verification work should follow the active user request and session instructions. Documentation-only edits do not require app test runs. Use disposable books for automated feature checks, not the user's saved book.
- Do not infer that broad screen checks prove every control or visual alignment is correct. A date-field misalignment was found after the broad audit; inspect the exact reported state and add a focused check when verification is authorized.

## Latest completed work

Source checkpoint before this documentation update: **`a0ac0a2`**, on branch `main` — invoice customization, record actions, accounting safety and layouts. Generated artifacts are ignored by Git.

- Invoice appearance settings include font/size/style/spacing and visibility. Preview, saved invoice PDFs and printing share the paper renderer. App accent on invoice paper is optional.
- Logo sizing, slogan styling, party tax/contact details, stamp/signature uploads and editor controls were added. Signing areas reserve room for manual stamps/signatures.
- Custom charge rows use the normal invoice arithmetic. A linked expense prompts whether it should be charged to the customer invoice; updates/removal use a transaction.
- Invoice selection, export and PDF sharing distinguish one record from multiple. Data export offers image/PDF/CSV; PDF / Share produces full invoice documents.
- Payments, expenses, quotations, returns, journals, salary runs, employee payments/advances and transfers have expanded selection/detail/edit/removal paths. Accounting dependencies can block financial edits or removal; linked payment/expense notes can still be corrected where appropriate.
- Posting coverage was expanded; discount/revenue classification and two-decimal totals were corrected. Saved historic entries require explicit review in **Settings → Check saved invoice accounting**.
- Scroll positions and return routes are remembered. Search focus/caret, optional dropdown choices, disabled states, action-bar overlap, dialog closing/focus, dark textareas, icons and Urdu labels received fixes.
- **Most recent UI fix:** invoice and due/expiry dates have matching header rows and aligned values. The oversized filled toggle is now a quiet Add/Remove action. This applies to sales, purchases and quotations, with date enabled or disabled.

## Latest mobile inset correction

After the APK build, the user reported excessive empty space above the dashboard and below navigation. Android was padding the native surface but forwarding the same insets to WebView; CSS also reserved safe areas at the root and again on bottom controls. The native listener now consumes handled insets, `.native-theme` disables web safe-area padding, and bottom controls use ordinary spacing inside the already safe viewport. Browser safe areas remain at the root once. Keyboard padding still uses the larger of the keyboard/navigation insets.

Shared HTML and packaged desktop web resources were refreshed. **The user then approved rebuilding: the APK below now includes this correction; Gradle assembleDebug succeeded.** Native device verification remains outstanding; do not claim the reported phone layout has been verified from a desktop render.

## Invoice density, page breaks and printing update

Invoice rows now reduce vertical padding from the selected spacing down to a 4 px minimum (or retain a smaller explicitly selected setting). Beyond that, `paginateInvoicePaper` creates separate A4/A5 sheets with repeated invoice/column headers. Final rows are kept with the totals, terms and footer where possible. Preview and PDF invoke the same paginator; sharing from preview uses its full source rather than only the first sheet. Thermal paper retains continuous flow. Extremely tall individual rows or an oversized final section can still require overflow handling; avoid claiming every content combination was verified.

The footer is raised by extra bottom paper padding; the blank stamp/signature area is retained. Print styles clear preview offsets/scaling, app backgrounds and chrome. Android's new `Printer.printDocument(job, format)` selects A4/A5 or thermal dimensions with zero requested margins; `printPage(job)` remains as the compatibility path. Printing must not default a selected A4 invoice to Letter.

Source syntax checks and standalone generation were performed; functional/browser/device checks were not run for this change. Shared HTML and packaged desktop web resources were refreshed. **The existing APK predates these pagination/print changes. Ask before building it.**

## Profit and Loss return route correction

`openProfit()` records the actual entry screen/tab in `S.profitOrigin`. Both the page back arrow and Android `appBack` call `profitBack()`. Dashboard cards therefore return to Dashboard; the Reports entry returns to Reports. Redraws/period changes do not overwrite the origin, and the existing route scroll memory restores the originating page's position. `openScr('pl')` delegates to this helper; `openRpt('pl')` uses it directly. Syntax checking and the shared build were performed; no functional checks or APK build were requested for this change. The user is listing further UI issues, so handle them as they arrive.

## Mobile selection behavior correction

Mobile register checkboxes now overlay the avatar slot instead of consuming row width. Card padding and text width remain constant, Select is hidden with visibility rather than removing its layout space, scroll anchoring is disabled on mobile lists, and in-place selection updates retain scrollTop. Cards without avatars use an overlaid corner indicator.

Long-press selection ignores the outer 28 CSS px on either side, multi-touch, non-primary mouse buttons and compatibility mouse events after touch. Movement beyond 8 px, touchcancel, scrolling and rendering cancel pending holds. Cancelled/edge gesture clicks do not toggle rows, and a fresh intentional touch resets that suppression.

Render compares the old displayed route (including entity detail) with the new route and discards selection on navigation, even where features assign S.screen directly. Invoice batch previews capture their document snapshots before leaving the list, so they work without retaining selection state or its toolbar. No APK or functional/browser/device checks were run for this change; syntax checking and shared HTML generation were performed. Shared packaged desktop web resources were refreshed. The user is still reporting further UX issues.

## Bounded desktop editing and detail columns

The desktop/HTML invoice form was spanning the whole workspace whenever the sidebar was present. Router now applies `bounded-workspace` to invoice/quotation/purchase editors, product/payment/expense/return/transfer/journal forms, company/templates/settings/cloud/setup pages and text-led record detail screens. Desktop CSS centres direct screen sections in an 840 px column and aligns persistent action groups with its right edge, including RTL. Registers, dashboards and report tables retain their existing wider layouts; mobile sizes and printed paper are not changed by this screen-only rule. Existing modal forms were already width-constrained.

Source syntax and shared build completed; browser/native checks and APK generation were not performed. Shared desktop resources were refreshed. Preserve this route-based distinction when adding forms instead of applying a narrow global max-width to every screen.

## Follow-up alignment fixes

The user showed two remaining desktop defects: the expense receipt-upload button sat left of the centred form, and employee search sat left of the surrounding list/cards. Shared rules now make bounded standalone action buttons block-level flex boxes (auto margins can centre them), centre direct/sticky-band search inputs as block boxes within the same list width, and display standalone receipt images as blocks. Employee search drops an extra top-padding gap. `.f > .w` now spans both columns for explanatory text as well as labels, including employee-reimbursement guidance. The same standalone-button rule covers journal add-line, quotation conversion and party/distributor actions on bounded screens.

Source inspection and shared generation completed; no browser/device suite or APK build was performed. Packaged desktop web resources were refreshed. Keep looking for controls whose inline display or sticky negative margins bypass their parent column.

## Desktop package rebuilt — 23 October 2026

User explicitly requested updating the desktop app. With no Bookkeep process running, `node tools/build.js` and `node desktop/build.js` completed successfully. The full Electron package (including native shell and shared web resources) was regenerated at `desktop/release/Bookkeep-win32-x64/Bookkeep.exe`, using Electron 31.7.7. Packaged web files were compared byte-for-byte against current source. This includes the latest bounded desktop forms, search/action alignment and earlier UI/navigation/invoice changes through `712b64d`. The executable was not launched and no functional suite was run in this update. No APK was built. Generated package files remain ignored by Git.

## Current generated artifacts

- `dist/bookkeep.html`: standalone shared app, rebuilt after the date-field fix.
- `dist/Bookkeep-android-debug.apk`: latest explicitly requested debug APK, built successfully on 21 October 2026; approximately 3.8 MB, including the mobile inset correction from `dcbd9c1`. Gradle `:app:assembleDebug` succeeded using the installed JDK 21. No device install/run was performed in that build task.
- `desktop/release/Bookkeep-win32-x64/Bookkeep.exe`: existing packaged desktop application. Its `resources/web` was refreshed after the date-field fix. This did not repackage the executable.
- `dist/invoice-date-fields.png`: visual evidence from the focused date-field check.

## Verification already recorded

These results predate this documentation-only update; do not present them as newly rerun:

- 901 source checks and 901 standalone HTML checks passed, plus fresh-process restart/persistence checks.
- 71 screen scenarios at three widths: 213 render/field/handler checks and 828 inventoried field instances.
- 132 further screen runs over desktop/tablet/mobile widths, light/dark and English/Urdu; no unexpected blocked controls or browser errors in that suite.
- Document/export, bulk actions, desktop styling, theme/navigation and targeted behavior suites passed.
- The later `tests/date-fields-browser.cjs` check passed 18 combinations: three widths × sales/purchases/quotations × date enabled/disabled. It compares date value positions and clicks the toggle.
- The short purchase invoice tested as one A4 page in Classic/Clean/Bold with signing space preserved. This does not prove pagination for all content lengths.

Reports: `docs/AUDIT_FIXES_2026-10-21.md` is the fix-pass report; `docs/APP_AUDIT_2026-10-21.md` is the historical findings list; `docs/AUDIT_SCREEN_INVENTORY.md` lists scenarios and fields. The fix-pass report's “No APK was built” refers to that audit task; the later explicitly requested APK build succeeded.

Latest audit exclusions: native Android execution, camera hardware, physical printers, OS share targets and live multi-device Supabase accounts. Checks used disposable sample books.

## Architecture and important invariants

- Plain JavaScript globals; `web/index.html` supplies explicit dependency order. `tools/build.js` bundles the styles/scripts into `dist/bookkeep.html`. Both native shells use `web/`.
- `core/` and `data/` must contain no screen code. The structure checks enforce this. `features/` handles screens/actions; `ui/kit.js` has shared widgets, focus and chrome layout; `platform/` handles persistence, transactions, cloud and exports.
- Reports read the double-entry ledger. `ledSide` uses the account's natural side. `ledReverse` voids original entries; it does not also add a mirror reversal. Doing both would count the reversal twice.
- `bookTransaction` makes one synchronous localStorage replacement the commit point and restores object identities on failure. Never await or render inside its mutation. Feature wrappers join existing transactions rather than nesting `bookTransaction`.
- `invoiceTotals` derives grand total from rounded subtotal, discount and tax. Discounts reduce the selected revenue account. Charges are snapshot items with `charge:true`; exclude them from physical stock and stock returns.
- Linked expense charges are keyed by `expenseId` so edits update rather than duplicate them. Removing an expense must remove its billed charge atomically.
- Return reversal must protect consumed credits, invoice balances, stock layers/valuation and refund history. `postReturnLedger` has separate `incomeAcct` and refund `acct` fields.
- Repairing historic invoice accounting is explicit, creates a safety copy and keeps audit history. Do not silently rewrite saved books or guess untraceable overpayments.
- Documents escape business text and constrain image/accent inputs. PDFs use the shared paper through html2canvas/pdf-lib. CSV neutralizes formula-like text. Local vendor licenses live beside the libraries.
- Use `layoutAppChrome()` when changing persistent action/selection bars; it reserves scroll space. Closing overlays stop receiving input immediately. Custom dropdowns must preserve native disabled and optional-empty choices.
- Stable record IDs must not be reused after deletion. Financial removal retains audit entries and respects admin/dependency guards.

## Useful files

- Invoice editor/math: `web/src/features/invoices.js`, `web/src/core/invoice-math.js`.
- Paper/appearance/export: `features/documents.js`, `features/templates.js`, `platform/document-export.js`, `styles/documents.css` under `web/src/` or `web/` as appropriate.
- Record actions: `web/src/features/bulk-documents.js`; expenses/payments/returns/staff/cashbank own their forms.
- Persistence/atomic posting: `web/src/platform/persist.js`, `transactions.js`; ledger builders: `web/src/core/posting.js`.
- Routing/scroll: `web/src/app/router.js`; controls/layout: `web/src/ui/kit.js`; desktop overrides: `web/styles/desktop.css`.
- Native Android bridges: `android/app/src/main/java/com/bookkeep/app/MainActivity.kt`. Native theme, save, binary save, share and printing bridges already exist.

## Commands and this Windows machine

Repository: `C:\Users\Abdul Mannan\Documents\deepseek-harness\Bookkeep\bookkeep` (nested inside the workspace). PowerShell; `git` and `node` are currently on PATH. Do not rely on obsolete runtime paths in the historical handoff.

Shared build and checks, when needed:

```powershell
node tools/build.js
node tests/run.js
$env:BUNDLE='1'
node tests/run.js
Remove-Item Env:\BUNDLE
node tests/restart.js
```

Browser checks require Playwright and installed Edge:

```powershell
$env:BOOKKEEP_NODE_MODULES='C:\Users\Abdul Mannan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node tests/date-fields-browser.cjs
node tests/ui-fixes-browser.js
```

Other suites: `tests/invoice-export-browser.js`, `bulk-browser.js`, `desktop-style-browser.js`, `theme-navigation-browser.js`. Broader probes: `tools/full-audit.cjs`, `tools/behavior-audit.cjs`, `tools/layout-audit.cjs`. `tools/probe.js` loads a disposable book for domain snippets. Choose checks relevant to the requested change.

Refresh an existing desktop package after shared web edits:

```powershell
Copy-Item -Path web\* -Destination desktop\release\Bookkeep-win32-x64\resources\web -Recurse -Force
```

For an **explicitly authorized** APK build, the last successful machine command from `android/` was:

```powershell
$env:JAVA_HOME='C:\Users\Abdul Mannan\.jdks\jbr-21.0.11'
& 'C:\Users\Abdul Mannan\.gradle\wrapper\dists\gradle-8.7-bin\bhs2wmbdwecv87pi65oeuq5iu\gradle-8.7\bin\gradle.bat' :app:assembleDebug --offline --no-daemon
```

Then copy `android/app/build/outputs/apk/debug/app-debug.apk` to `dist/Bookkeep-android-debug.apk` from the repository root. Gradle failed to load `native-platform.dll` in the sandbox; retrying through the normal escalation tool succeeded. Request escalation when required rather than bypassing sandbox restrictions. Do not change the project bytecode target just because the build uses JDK 21.

## Remaining work and limits

- Supabase client/SQL exist, but real deployment, live multi-device conflicts and production server-side posting/authorization are not verified. Read `docs/CLOUD_SYNC.md` and `docs/SYNC.md`.
- Local PIN hashing and UI roles do not protect a readable local book from a device owner.
- Period locking and year-end close remain unfinished.
- Cash/bank subaccounts still roll into a shared ledger account; internal transfers need that context when interpreting ledger reports.
- Long-document pagination, native device behaviors and arbitrary combinations of content, localization and window size need targeted verification when touched. The latest date-field defect demonstrates the limits of broad render checks.
- The app still mixes some posting orchestration and screen code in feature files. Preserve the pure-core boundary when improving it.

### Desktop list consistency (23 October 2026)
- Shared desktop toolbar/filter controls use the same 40px control scale; removed inline New-action padding from invoices and payments.
- Sales/purchases and payments use explicit record table column widths, with the party column taking remaining space. Long content wraps instead of moving other columns.
- Screen/sidebar scrollbar gutters reserve space to prevent shifts when record counts change. Table overflow stays within its container.
- Rebuilt standalone HTML only. Desktop package intentionally left untouched at user request; no APK. Syntax and whitespace checks passed; visual verification remains pending.


### Party and product selection (23 October 2026)
- Connected Parties and Inventory to shared selection controls, including mobile long press, checkboxes, select all and selected-row image/PDF/CSV export.
- Party search now refreshes export and selection data with its visible rows. Hidden selections are pruned consistently.
- Master records do not receive invoice void actions. Also aligned Payments' generated selection column with its explicit column group.
- Standalone HTML updated; desktop package and APK untouched. Syntax checks passed; interactive verification pending.


### Payments column alignment
- Payments declares its checkbox column explicitly alongside Date, Party, Direction, Method and Amount; selection mounting avoids duplicating it. Empty rows span the selection column too.
- Rebuilt HTML, syntax checked. Desktop package unchanged; visual verification pending.


### Dashboard desktop layout (23 October 2026)
- Replaced auto-fit KPI layout with three columns (two on narrower desktop widths), so six metrics form complete rows with aligned labels.
- Grouped profit/distributor summaries beside cash and bank balances. Stock alerts share the main content width and expand cleanly when only one is present.
- Standalone HTML regenerated. Desktop and APK packages untouched. Syntax/whitespace checks passed; visual verification pending.


- Dashboard metrics now place overdue details beside the amount when space permits, wrap on narrow cards, and remove the forced minimum height that left empty space below ordinary totals. HTML updated; desktop package untouched.

