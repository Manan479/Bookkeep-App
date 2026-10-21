# Bookkeep

Bookkeeping, inventory and invoicing for small trading businesses. The Android and Windows desktop apps share the same web screens and accounting logic.

## Current capabilities

- Sales and purchase invoices, quotations, returns, payments, expenses, inventory and party balances.
- Double-entry ledger, journals, account histories and financial reports.
- Employees, salary runs, payments, advances and recovery of advances.
- Invoice appearance settings: text size, font, Classic/Clean/Bold styles, spacing and visible sections. Preview, PDF and printing use the shared document layout.
- Company logo, slogan, contact details, stamp and signature uploads; document controls for including the uploaded marks. Public party contact and tax details appear on invoices.
- Custom invoice charges, including a prompt to bill a linked expense to a customer invoice. Editing or removing a linked charge updates the invoice through a transaction.
- Record selection and actions across document registers. Export selected data as image, PDF or CSV; use PDF / Share for full invoice documents, combined or separate when multiple invoices are selected.
- Editing and confirmed void/permanent-delete actions, subject to permissions and accounting dependencies. Posted records retain audit history.
- Light/dark/system appearance, accent selection, English/Urdu, desktop sidebar navigation and mobile selection mode. Applying the accent to invoice paper is optional.
- Local persistence, backup/restore, posting history and a review tool for older saved invoice accounting.
- Optional Supabase cloud-sync client and SQL setup. Live multi-device operation still needs deployment and verification.

## Project layout

```text
web/                    Shared app loaded by Android and desktop
  index.html            Shell and explicit script/style load order
  styles/               Theme, components, desktop overrides and document paper
  src/
    data/               Initial stores and catalogue
    core/               Arithmetic, costing, balances and ledger rules; no screen code
    features/           Screens and feature actions
    platform/           Persistence, transactions, cloud and document export
    ui/                 Shared controls, icons and layout helpers
    vendor/             Local export libraries and their licenses
android/                Kotlin WebView shell; packages web/ directly as assets
desktop/                Electron shell and packaging script
db/                     Supabase SQL
docs/                   Accounting rules, feature notes, audits and historical handoff
tests/                  Domain, integration and browser checks
tools/                  Standalone builder, probes and audit tools
dist/                   Generated HTML, APK and verification artifacts; ignored by Git
```

## Run and build

Run commands from this directory unless a different directory is shown. Node.js 18 or newer is needed for the shared build/checks.

### Shared web app

Open `web/index.html` in a browser, or create the standalone file:

```powershell
node tools/build.js
```

Output: `dist/bookkeep.html`. Browser, Android and Electron profiles have separate local books unless cloud sync is configured. Do not use a different profile expecting it to contain the same saved data.

### Windows desktop

```powershell
cd desktop
npm install
npm start
```

`npm run dist` in `desktop/` creates `desktop/release/Bookkeep-win32-x64/Bookkeep.exe` and its supporting files. Distribute the complete packaged folder. It loads `resources/web`; the source runner loads `../web`.

For shared web-only changes, update an existing package from the project root:

```powershell
Copy-Item -Path web\* -Destination desktop\release\Bookkeep-win32-x64\resources\web -Recurse -Force
```

Restart the app to load updated resources. Changes to the Electron shell itself require repackaging. See `desktop/README.md`.

### Android APK

Open `android/` in Android Studio and build the debug APK. The project uses an installed Android SDK and JDK, with Java/Kotlin bytecode targeting Java 17. Native save, share, print, image-picker and appearance bridges live in the Android shell.

With a compatible Gradle installation available:

```powershell
gradle -p android :app:assembleDebug
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk dist\Bookkeep-android-debug.apk -Force
```

The latest local debug APK was built successfully on **21 October 2026**, including the invoice date-field alignment fix and the correction for duplicated mobile system-bar spacing. It is available as `dist/Bookkeep-android-debug.apk`; generated APKs are not committed. This is a debug build, not a release-store package.

**Contributor workflow:** ask before building an APK unless the user explicitly requests one. Commit completed changes to Git. See `HANDOFF.md` for current machine commands and preferences.

## Verification commands

```powershell
node tests/run.js
node tools/build.js
$env:BUNDLE='1'
node tests/run.js
Remove-Item Env:\BUNDLE
node tests/restart.js
```

`npm test` and `npm run build` also work. The existing `npm run test:bundle` script uses POSIX environment assignment; use the PowerShell sequence above on Windows. There are no `test:browser` or `test:all` npm scripts.

Browser suites use Playwright and installed Microsoft Edge. Set `BOOKKEEP_NODE_MODULES` to a node_modules directory containing Playwright, then run the relevant script, for example:

```powershell
node tests/invoice-export-browser.js
node tests/ui-fixes-browser.js
node tests/date-fields-browser.cjs
```

The last broad audit recorded 901 source checks, 901 standalone checks, restart checks, 213 screen scenarios and 132 additional UI screen runs. A subsequent focused check passed 18 invoice/purchase/quotation date alignment and toggle combinations. These are historical results, not a guarantee that every possible layout or feature works. See `docs/AUDIT_FIXES_2026-10-21.md` for evidence and scope. No checks were rerun for this documentation update.

## Accounting and remaining limits

- Ledger entries drive financial reports. Keep pure rules in `core/`, screen actions in `features/`, and storage/export operations in `platform/`. Add new shared scripts to `web/index.html` in dependency order.
- Posting transactions restore records, balances and ledger state if persistence or validation fails. See `docs/POSTING_TRANSACTIONS.md` for coverage and limits.
- Existing saved invoice entries are not silently rewritten. Use **Settings → Check saved invoice accounting** to review repairs and create a safety copy before applying them.
- Server-side authorization, production multi-user accounting, period locks and year-end close remain unfinished. Local role/PIN checks are not a server security boundary.
- Native Android device behavior, physical printing, camera hardware, OS share targets and live cloud accounts were not exercised in the latest audit. APK compilation succeeded separately.

Start future work with `HANDOFF.md`. Feature notes include `docs/INVOICE_CHARGES.md`, `docs/BULK_DOCUMENTS.md`, `docs/THEME_AND_NAVIGATION.md` and `docs/CLOUD_SYNC.md`.
