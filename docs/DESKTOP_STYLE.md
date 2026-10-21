# Desktop typography and icons

`web/styles/desktop.css` owns the desktop scale under a screen-only 900px breakpoint:

- Page title: 24px / 700.
- Section heading: 18px / 600.
- Body, table rows, navigation, inputs and action labels: 14px.
- Supporting labels, metadata, table headings and status badges: 12px.
- Main financial highlight: 28px; ordinary card values: 18px.
- Standard action target: 40px; filter chips: 36px; compact inline actions: 32px.
- Interface icons: 20px on a shared 24-unit outline grid; empty-state illustrations: 32px.

Desktop uses the installed Segoe UI/system font stack so its typography works without web fonts.
Urdu retains the existing Urdu font setup. Screen-only overrides do not restyle printed invoices.

`web/src/ui/icons.js` supplies shared SVGs for the desktop sidebar, icon actions, decorative row
icons and empty states. Icon buttons gain accessible labels. Original glyphs remain available for
the mobile layout; initials and business data are not converted. Overlay icons are handled through
a mutation observer, while full renders normalize their icons immediately.

Keep new components on this scale rather than setting local font sizes or using emoji for desktop
actions. Form labels and their entered values have separate, consistent text roles. Widths can vary
with the action, while text size, icon footprint and control height stay shared.

`node tests/desktop-style-browser.js` checks actual computed sizes across Dashboard, Sales,
Payments, Reports, Company, Settings, Theme and invoice editing, plus overlays, dark mode, several
desktop widths and mobile fallback. Screenshots are saved to dist/desktop-style-qa/.
The check requires Playwright/Edge; BOOKKEEP_NODE_MODULES can point at bundled dependencies.
