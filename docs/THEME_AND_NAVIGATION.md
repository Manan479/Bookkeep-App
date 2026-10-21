# Theme and navigation

Android's system bars are transparent. A native background surface behind the WebView matches the
web app's computed background, and the Appearance bridge updates it when light/dark mode or the
accent changes. Status/navigation icon contrast follows the effective light/dark mode. Insets keep
content clear of the status icons, display cutouts, gesture navigation and on-screen keyboard.
The Android launch background also follows system light/dark appearance rather than fixed green.

Native theme changes switch surfaces together; the web body's colour transition is disabled when
the bridge exists so system bars cannot get stuck on an intermediate colour. System appearance
changes while the app is open refresh System mode. Accent colours remain strongest on controls;
backgrounds and borders use the existing subtle tint.

Desktop navigation shows the primary tabs and every permitted More module in a scrollable sidebar,
grouped under Business, Accounting and Preferences. It stays visible inside modules and shows the
current page. Users with restricted roles see only permitted modules. Sign out is available there.
Phones retain the compact More tab. Login and setup do not display desktop navigation.

Theme now has a dedicated shortcut at the top of More and near the top of the desktop sidebar.
The appearance editor uses Light/Dark/System preview cards, accessible compact colour swatches,
and a custom colour picker. Invoice preview and document controls live in Settings → Invoice
appearance and templates. Choices save immediately. The editor is
checked at 320px phone width, in Urdu/RTL, and in light and dark modes.

Checks: `node tests/theme-navigation-browser.js` verifies the native bridge contract against actual
CSS colours, light/dark/System updates, module links, role filtering and mobile navigation using
Playwright with installed Edge. Set BOOKKEEP_NODE_MODULES to the dependency directory if needed.
Android builds verify native compilation and resources; physical-device system bar and keyboard
behaviour still need a phone check.
