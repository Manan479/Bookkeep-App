# Bookkeep

Bookkeeping, inventory and invoicing for small trading businesses. Android first, desktop later.
This folder holds the working prototype and the notes for the real build.

## Folders

```
bookkeep/
  web/                 The app: screens and logic. Android and desktop both use this folder.
    index.html         Page shell. The order of its <script> tags is the load order.
    styles/            theme.css (colours, light and dark), components.css, documents.css (printed paper)
    src/
      data/            Sample data and empty stores. Replaced by a database later.
      core/            Logic with no screen code: totals, costing, balances, periods, report data.
      ui/              Shared screen pieces: sheets, calendar, pickers, charts, print fitting.
      app/             Routing, the render loop, startup.
      features/        One file per feature: invoices, payments, returns, expenses, quotations, ...
      platform/        Saving to the device. Swap for a database or Google Drive later.
  android/             Android Studio project (a WebView shell that reads ../web)
  desktop/             Placeholder for the desktop version
  docs/                Posting rules, data model, sync plan, roadmap
  tests/               Run with: npm test
  tools/build.js       Makes the single-file build in dist/
  dist/                Generated. One self-contained bookkeep.html for previews.
```

## Commands

```
npm test              Loads the app the way the page does, then runs all checks (needs Node 18 or newer)
npm run build         Writes dist/bookkeep.html (everything in one file)
npm run test:bundle   Runs the same checks against the single-file build
npm run test:browser  Writes dist/tests.html: the same checks as a page, for when you have no terminal
npm run test:all      Both of the above
```

`dist/tests.html` is the escape hatch: open it in any browser and it runs the whole app and every test
with no Node, npm or terminal, printing the pass count and each failure. Use it on a phone or a locked-down
machine. Tests always run against a throwaway in-memory store, never your saved data.

To try it in a browser without Android: open `web/index.html`. Data is kept in the browser's storage.
For Android, open the `android` folder in Android Studio (see `android/README.md`).

## Where new code goes

| You are adding | Put it in |
|---|---|
| A money, stock or balance rule that needs no screen | `web/src/core/` (a test fails if screen code sneaks in) |
| A screen or a button action | `web/src/features/<feature>.js` |
| A widget used by several screens | `web/src/ui/kit.js` |
| Colours, spacing, dark mode | `web/styles/theme.css` |
| Anything about saving or syncing | `web/src/platform/` |
| A new file | add its `<script>` tag to `web/index.html` in the right place |

## Be aware

- **There is a double-entry ledger, and it is the source of truth.** Every posted document writes a balanced
  entry, and the trial balance, balance sheet, profit and loss, cash flow, dashboard and every account page
  read that book rather than adding up records. The ledger is `web/src/core/ledger.js`; the shape of each
  entry is `docs/POSTING_RULES.md`.
- The feature files still mix accounting steps with screen code (for example saving a payment updates balances
  and then shows the success sheet). `core/` holds only the rules and the arithmetic, and `tests/run.js`
  enforces that it contains no screen code.
- `HANDOFF.md` is the current state of the work: read the top of it first, then the section that matches what
  you are about to touch. `docs/STRUCTURE.png` is the folder map, redrawn by `tools/structure.py`.
- What is still genuinely missing is one shared book across devices (a server and a database — see
  `docs/SYNC.md`), real authentication, and a year-end close. `HANDOFF.md` lists them at the top.
