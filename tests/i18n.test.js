// tests/i18n.test.js - the language layer: what translates, what must not, and which way it reads.
T('the app starts in English',lang()==='en'&&!isRTL());
T('there is an Urdu translation to switch to',!!LANGS.ur);

// Every filter word a screen offers must have an entry, or Urdu mode silently falls back to English on a chip.
const FILTER_WORDS=['All time','Today','This Week','This Month','Last Month','This Quarter','This Year','Custom',
  'All','Paid','Partial','Unpaid','Overdue','Draft','Void','Sent','Accepted','Rejected','Expired','Converted',
  'Received','Advances','Customers','Suppliers','Distributors','Sale returns','Purchase returns'];
T('every filter word is translated',FILTER_WORDS.every(k=>!!UR[k]));

S.lang='ur';
T('Urdu reads right to left',isRTL());
eq('a known phrase is translated',tr('Sales'),'فروخت');
eq('an unknown phrase stays in English rather than showing a key',tr('Something nobody translated'),'Something nobody translated');

// A chip shows Urdu but must keep the English value in its onclick: the filters compare English strings, so a
// translated VALUE would break every filter on the screen.
const chipHtml=chips(['Paid','Unpaid'],'Paid','setS');
T('a chip shows the Urdu word',chipHtml.includes('ادا شدہ')&&chipHtml.includes('غیر ادا شدہ'));
T('but the value it sends is still English',chipHtml.includes("setS('Paid')")&&chipHtml.includes("setS('Unpaid')"));
T('the tab bar is translated',tabs().includes('فروخت')&&tabs().includes('اسٹاک'));
T('the dashboard is translated',dash().includes('ڈیش بورڈ')&&dash().includes('خالص منافع'));

// The book's own language does not change: account names, party names and export columns stay as they are.
T('account names are not translated',tr('Cost of goods sold')==='Cost of goods sold');

S.lang='en';
T('switching back restores English',tr('Sales')==='Sales'&&!isRTL());
