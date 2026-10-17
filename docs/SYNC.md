# Sync and backup plan (Google Drive now, more devices later)

Not built yet. This is the design the data model and posting rules are shaped for.

## Step 1: backup and restore to Google Drive (small, do first)
- The app writes one data file to a private app folder in the user's Drive and can restore from it.
- Android: Google sign-in plus the Drive API, limited to the app's own folder (the narrowest access Google offers).
  Only that folder is touched, never the rest of the user's Drive. Check Google's current rules for the scope you choose.
- Setup you need to do once (cannot be done from code): create a Google Cloud project, turn on the Drive API, set up the
  consent screen, and create an Android sign-in client using the package name `com.bookkeep.app` and your signing key's fingerprint.
- Add a passphrase option so the backup file is encrypted before upload. This is financial data.
- Keep the last few backups, not just one.
- Where it plugs in: `web/src/platform/` (the page asks for save/load; Android supplies the Drive part).

## Step 2: two or more devices on the same books
Drive is a file store, not a database, so two phones writing the same file will overwrite each other. Avoid that by design:

1. Every record has a unique id, a device id and an updated time (see DATA_MODEL.md).
2. Each device only ever writes its own change file (`changes-<deviceId>.json`). It appends; it never edits old lines.
3. On opening, each device reads the other devices' files and merges them into its local database.
4. Money records only get added, never changed: documents, payments, stock movements, ledger entries.
   A correction is a new reversing entry, so merging never loses anything.
5. Master data (parties, products, settings) changing on two devices: last update wins by time, per field where possible.
6. Document numbers: each device has its own series or number block (for example INV-A-0001, INV-B-0001) so two devices never issue the same number.
7. Stock: two devices can sell the last item while offline. After merging, stock may be negative. That is allowed and raises the existing negative-stock alert.
8. Deleting is a flag, not a removal, so a delete also travels between devices.

## Alternative: a small server
A hosted database (Firebase, Supabase or your own) handles several devices and live updates more smoothly.
Costs: hosting, accounts, and the business data lives on that server instead of only in the user's own Drive.
The change-file design above works with either; only the transport changes.

## What the code needs before any of this
- A real database on the device (SQLite) in place of the saved JSON text.
- Ids that are UUIDs, soft deletes, and updated times on every record.
- Accounting rules in a core layer with no screens, so Android and desktop run the identical code.
