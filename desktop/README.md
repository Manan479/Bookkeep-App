# Desktop app

The same `web/` app the phone runs, in its own window. No second copy of any screen or accounting rule.

## Run it

```
cd desktop
npm install
npm start
```

`npm install` downloads Electron once (roughly 100 MB). It is a development dependency only; the app itself still
has no runtime packages.

## Build a double-clickable app

```
cd desktop
npm install
npm run dist
```

That writes `desktop/release/Bookkeep-win32-x64/Bookkeep.exe` (the folder name depends on the platform). Double-click
the executable — no Node, no terminal and no install step is needed. The web screens are bundled beside it in
`resources/web`, so the packaged app and the phone run the same files.

`npm run smoke` starts the shell, captures the first screen to the temp folder and exits; it is how the build was
checked without a human at the keyboard.

## What the shell adds

| Bridge | Used by |
|---|---|
| `Saver.save` / `Saver.saveBytes` | CSV, PDF-by-print, PNG exports, backup files — through the system "Save as" dialog |
| `Printer.printPage` | Printing a preview/batch, using the print CSS already in `styles/documents.css` |

Everything else — storage, screens, the ledger — is the web app. Data lives in this Electron profile's local
storage, and the automatic backups live in IndexedDB, exactly as on the phone.

## Sync

Cloud sync is configured per device: Settings → Cloud sync, sign in with the same Supabase account as the phone,
and the desktop adopts the existing book rather than creating a second one.

## Security

`nodeIntegration` is off, `contextIsolation` is on, and the renderer is sandboxed. The page can only call the two
handlers above, and the file dialog is always the user's.
