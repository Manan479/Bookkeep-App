# Layout review — 23 October 2026

Audit of the current standalone HTML/shared web source. This is a findings list, not an implementation change.

## Coverage and limits

- Exercised 71 screen states: dashboard, all primary modules, company/settings/theme/templates/users, invoice variants, payment/expense/product/party/return/journal editors, record details, salary slip, reports and setup steps.
- Broad render checks at 1440, 1024 and 390 CSS px; additional screenshot/geometry pass at 1440, 900 and 390. Focused selection, theme, login, user dialog, party form and payments checks also included 320px.
- Reviewed overview screenshots for the screen inventory, with full-size inspection of suspect screens; inspected the bottom of Settings and Templates, export dialog, and representative dark/Urdu Sales layouts.
- No render exceptions or document-level horizontal overflow in the broad checks. This does NOT prove correct child layouts: the 900px table problem below passes those checks.
- Used isolated browser data loaded from the demo. User records were not changed. External Google Fonts requests were blocked for deterministic offline behavior. Amount animations can show intermediate values in captures; these are not accounting findings.
- Desktop screenshots use Edge's web renderer, not the installed Electron package. Mobile screenshots emulate viewport sizes, not an Android device, gesture navigation, keyboard or native print dialog. Dark/RTL coverage was representative, not every state. Long custom data, every dialog, every scroll position and large text settings are not exhaustively covered.
- Evidence: `dist/layout-review/` PNG files, `inventory.json`, and `focused.json`; broad results also in `dist/full-audit/inventory.json`. Generated evidence is local and ignored by Git.

## Confirmed defects

1. **High — Narrow desktop invoice tables crush the Party column.** At 900px, fixed columns consume almost all the table's 640px minimum, leaving Party around 56px before cell padding. Even `PARTY` wraps into three lines; `Walk-in` and other names wrap into fragments. Status is outside the initial visible region. Applies to Sales/Purchases. Use a realistic minimum for every column, a larger scrollable table minimum, or switch to cards at the actual available content width. Evidence: `focus-selection-900.png`; `desktop.css` record-table widths.

2. **High — Mobile selection checkboxes intrude on card corners/content.** On Sales/Purchases the circular checkbox container projects outside the top-left edge and crowds the first text line. It looks detached from the row. Use a reserved selection position that preserves text width without crossing the card boundary. Evidence: `focus-selection-390.png`, `focus-selection-320.png`; mobile `.doccard:not(:has(.av))` rules.

3. **Medium — Mobile detail headers squeeze record numbers.** Expense and receipt detail titles split `EXP-0007` / `RCP-0007` into multiple lines while the Edit button takes a large share of the row. Keep the record identifier together and move secondary actions to a second row or compact menu. Evidence: `Expense-detail-390.png`, `Receipt-detail-390.png`.

4. **Medium — Sign-in user selector loses its input styling.** The custom-select enhancer replaces the styled native select with `.skl`. The replacement is borderless and only about 25px high on desktop / 23px on mobile, while PIN has a 48px field. Apply the auth input treatment to the replacement button too. Evidence: `focus-login-1440.png`, `focused.json`; `users.js`, `desktop.css`, custom-select implementation in `ui/kit.js`.

5. **Medium — Party/customer/supplier editor still stretches across desktop.** The `cust` route is absent from `boundedRoutes`; New/Edit party uses the wide content area while product, invoice and expense editors use 840px. Its footer consequently follows a different column. Evidence: `Party-add-1440.png`; `router.js` bounded route list.

6. **Medium — Several mobile controls are smaller than the intended touch target.** Filter chips measure about 34px high, header icon buttons 38px, and toggle buttons 28px. Company upload/add buttons are also visually very small. Increase the hit area without making every visual element bulky. Evidence: `focused.json`, `Company-Profile-390.png`; base `.chip`, `.ic`, `.tg`, `.ut` rules. Input interiors were excluded from this finding because their enclosing labels may supply additional clickable space.

7. **Medium — Desktop selection footer wraps into an unbalanced layout.** At 900px, five actions occupy the first row and Cancel stretches across the entire second row. The footer becomes disproportionately tall. Use explicit responsive action groups instead of unconstrained flex growth. Evidence: `focus-selection-900.png`.

8. **Medium — Quotation detail duplicates Edit.** Edit appears in the heading and again as a wide button beside Preview. Three large action rows compete with the quotation information. Remove the duplicate and consolidate secondary status actions. Evidence: `Quotation-detail-1440.png`, `Quotation-detail-390.png`; generic record actions plus quotation-specific actions.

9. **Medium — English dates reorder in the Urdu layout.** The Sales date column displays sequences such as `Oct 2026 22`; the Latin date string is not isolated from RTL direction. Use bidi isolation or a locale-aware date representation. Evidence: `dark-rtl-sales-1440.png`.

## Design inconsistencies / improvements

10. **Filter order is inconsistent.** Sales/Purchases/Journal put Search before Period, while Payments/Expenses put Period before Search. Standardize the sequence and spacing across lists. Evidence: corresponding desktop and mobile captures.

11. **Create-action placement varies across desktop lists.** Sales/Payments have labelled header buttons; Inventory, Parties, Expenses and Journal use a floating bottom button; Employees uses a plus icon in the header. Similar tasks require looking in different places. Adopt a shared desktop list toolbar.

12. **Mobile icons use a different visual language.** Mobile navigation uses emoji and text symbols while desktop uses monochrome SVG icons. Shapes, stroke weights and perceived sizes differ, and emoji appearance depends on the platform. Use the existing SVG system at mobile sizes too. Evidence: `Tab-dash-390.png`, `Tab-inv-390.png`; desktop-only icon substitution CSS.

13. **Document/editor heading alignment varies.** Invoice editors center their titles; product/expense/party editors align them beside Back; printable details use another centered arrangement with edit/menu controls. Establish separate but consistent editor and document-viewer header patterns. Evidence: editor and receipt/salary captures.

14. **Settings and Templates require excessive vertical scanning.** Long runs of individual full-width toggle cards push later settings and the preview far down. Group related settings into compact sections and add section navigation on desktop. Evidence: `settings-bottom-1440.png`, `Templates-390.png`, `templates-bottom-390.png`.

15. **The mobile template preview is hard to inspect at its default scale.** A whole A4 page fits the phone width, making document text tiny, with no visible zoom control beside this embedded preview. Provide an obvious full-preview/zoom action. This is a discoverability issue, not a claim that the document itself is malformed. Evidence: `templates-bottom-390.png`.

16. **Desktop report actions consume a full-width persistent footer for one Export button.** Short reports leave a large blank area while Export is separated at the bottom of the window. Put this action in the report header consistently. Evidence: Balance sheet, Low stock, Tax summary and other report captures.

## Source-based risks needing additional verification

- Online vs offline fonts: the HTML requests Google Fonts; the audit blocked those requests. Font loading may change wrapping and perceived sizing, especially Urdu. Repeat with the real online/offline font stacks before treating typography as finalized.
- Very long company/party names and large monetary values: fixed widths and several two-column mobile forms still need dedicated stress cases. No claim of a reproduced overflow for those data was made here.
- Actual Android keyboard and safe-area behavior, native print, installed Electron zoom/DPI and Windows scaling were not validated by this web audit.

## Recent fixes that passed this review

- Desktop bounded-form action columns matched form right edges in the measured screens.
- Sign-in panel with an active user was centered at 1440x800: x=510, width=420, y≈96.5, height≈607, giving equal top/bottom space.
- Updated Payments column structure did not reproduce the previous shifted-width bug at the normal desktop width.
- Dashboard uses complete metric rows in the reviewed desktop layouts.

Suggested order: 1–4 first, then 5–9, then consolidate shared list/header/action patterns (10–16). No app fixes or package builds were made during this audit.
