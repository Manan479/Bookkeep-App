# Selecting invoices and purchases

Sales and Purchases have visible checkboxes on desktop tables. Phone cards show checkboxes only after
tapping Select or long-pressing an invoice. Cancel or Android back exits selection and hides them again.
Select opens selection mode without choosing any documents. The desktop header checkbox
selects all filtered rows and shows a mixed state for partial selection. Space selects a focused
desktop row; Enter opens it or toggles it when selecting. Long-press remains available on phones.
Changing filters drops selections that are no longer visible. Cancel ends selection.

The selection bar offers:

- Export list: summary CSV, PDF table, or image through the existing export chooser.
- PDF / Share: generate full invoices from saved snapshots, as one combined PDF or separate PDFs.
- Print: the existing HTML invoice templates, including paper-size controls.
- Delete / Void: choose Void or Delete permanently, subject to permissions and linked records.

Direct PDF downloads capture the same paper HTML and styles as Preview, including the selected A4,
A5 or thermal size. Preview's Share PDF button exports that exact visible document rather than a
separate selection or a separate layout. The PDFs contain high-resolution page images; their text
is not selectable. Long invoices paginate without splitting ordinary item rows or the footer block
where possible. Separate invoices start on new pages. html2canvas is bundled locally with its license.

Settings → Invoice appearance and templates controls text size, font, document style, row spacing,
descriptions, logo, footer, terms and other existing visibility settings. Text is not silently shrunk
to fit: longer documents continue to additional pages. Theme contains no sample invoice preview.

Void retains the document marked Void. Delete permanently reverses any active stock/accounting
effects, removes the document and snapshot from the register, and retains audit history and reversed
ledger entries. Drafts are deleted directly. Both actions require a final confirmation. Deleting a
previously voided document does not reverse its effects twice. Deleted numbers cannot be reused.

Separate PDFs save in one ZIP to avoid multiple download prompts. Web Share sends the PDFs as
individual files on supported browsers. Browsers without file-sharing support give an explicit
save-and-attach instruction. All export libraries are bundled locally, with licenses in src/vendor.

Android's new Sharer bridge uses ACTION_SEND / ACTION_SEND_MULTIPLE and FileProvider grants limited
to a dedicated cache folder. Native sharing requires rebuilding the Android app. The offline
`:app:assembleDebug` build passed using Java 21 and Gradle 8.9. The signed debug APK is copied to
`dist/Bookkeep-android-debug.apk`; its APK signature verifies. The Windows package in
`desktop/release/Bookkeep-win32-x64/` was rebuilt and launched successfully with a separate test profile.
All shared web files match the source in both packages. Sharing is not yet tested on an Android device.

Bulk removal preflights every selected document, then runs the full selection in one local transaction.
A linked payment, return, permission failure, ledger refusal, or storage failure prevents partial
removal. Individual history entries retain deleted draft versions and voided invoice/ledger versions.

Run `node tests/run.js` for selection and transaction checks. `node tests/bulk-browser.js` uses
Playwright, pdf-lib, jszip and installed Microsoft Edge to check the actual standalone HTML at desktop
and phone widths, download/open combined PDFs and ZIP files, check sharing fallback, and test pagination.
Set BOOKKEEP_NODE_MODULES to an external node_modules directory if those tools are not installed locally.
The browser check writes disposable outputs under dist/bulk-qa/.
