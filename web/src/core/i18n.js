// core/i18n.js - Languages and translation. No screen code, no DOM: it only answers "what is this called in the
// current language, and which way does it read".
//
// The key is the ENGLISH UI text, looked up word for word. That keeps the screens readable (you see the phrase
// that will appear) and makes it impossible for a missing translation to show a key like `sales.searchPlaceholder`
// to a shopkeeper: a phrase with no entry simply stays in English.
//
// What is deliberately NOT translated: the chart of accounts, party and product names, the ledger, exports, and
// printed documents. Those are the book's own language - an accountant reading the trial balance expects the
// account names the books were set up with.
const LANGS={en:'English',ur:'اردو'};

const UR={
 // ---- navigation and the More screen
 'Dashboard':'ڈیش بورڈ','Sales':'فروخت','Purchases':'خریداری','Inventory':'اسٹاک','More':'مزید',
 'Parties':'فریقین','Payments':'ادائیگیاں','Expenses':'اخراجات','Returns':'واپسیاں',
 'Quotations':'کوٹیشنز','Cash and Bank':'نقد و بینک','Reports':'رپورٹس','Accounts':'کھاتے',
 'Distributor':'ڈسٹریبیوٹر','Journal':'جرنل','Notifications':'اطلاعات','Employees':'ملازمین',
 'Company Profile':'کمپنی پروفائل','Templates':'ٹیمپلیٹس','Theme':'تھیم','Users':'صارفین',
 'Settings':'ترتیبات','Language':'زبان',
 'Distributor module':'ڈسٹریبیوٹر ماڈیول',
 "Invoices for a distributor's customers":'ڈسٹریبیوٹر کے گاہکوں کے لیے انوائسز',
 'Signed in':'سائن اِن','Sign out':'سائن آؤٹ',

 // ---- theme screen
 'Light or dark':'روشن یا تاریک','System':'سسٹم','Light':'روشن','Dark':'تاریک',
 'Accent colour':'نمایاں رنگ','Any other colour — tap the circle':'کوئی بھی دوسرا رنگ — دائرے پر ٹیپ کریں',
 'Use app accent on invoices':'انوائس پر ایپ کا منتخب رنگ استعمال کریں',
 'Off uses neutral ink in previews, PDFs and print.':'بند ہونے پر پیش منظر، پی ڈی ایف اور پرنٹ میں غیر رنگین سیاہی استعمال ہوتی ہے۔',
 'Used for buttons and highlights.':'بٹن اور نمایاں حصوں کے لیے استعمال ہوتا ہے۔',
 'Saved automatically. Display mode stays on this device only. Invoice colours are optional.':'خود محفوظ ہوتا ہے۔ ڈسپلے کا انداز صرف اس ڈیوائس پر رہتا ہے۔ انوائس کے رنگ اختیاری ہیں۔',
 'Used by the buttons, the tab bar and your printed invoices.':'بٹن، ٹیب بار اور آپ کے پرنٹ شدہ انوائسز میں استعمال ہوتا ہے۔',
 'The theme is saved on this device only, so a phone and a computer can look different. The invoice title and the currency live with your documents and your company.':'تھیم صرف اسی ڈیوائس پر محفوظ ہوتی ہے، اس لیے فون اور کمپیوٹر مختلف دکھ سکتے ہیں۔ انوائس کا عنوان اور کرنسی آپ کے دستاویزات اور کمپنی کے ساتھ محفوظ ہیں۔',

 // ---- language screen
 'Choose the language for the app. The books, the numbers and the printed documents are not changed.':'ایپ کی زبان منتخب کریں۔ کھاتے، اعداد اور پرنٹ شدہ دستاویزات تبدیل نہیں ہوتے۔',
 'Urdu reads right to left, so the whole app turns around.':'اردو دائیں سے بائیں پڑھی جاتی ہے، اس لیے پوری ایپ کا رخ بدل جاتا ہے۔',

 // ---- periods
 'All time':'ہمہ وقت','Today':'آج','This Week':'اس ہفتے','This Month':'اس ماہ','Last Month':'پچھلا ماہ',
 'This Quarter':'اس سہ ماہی','This Year':'اس سال','Custom':'حسبِ ضرورت',

 // ---- statuses and filters
 'All':'سب','Paid':'ادا شدہ','Partial':'جزوی','Unpaid':'غیر ادا شدہ','Overdue':'زائد المیعاد',
 'Draft':'مسودہ','Void':'منسوخ','Sent':'بھیجا گیا','Accepted':'قبول شدہ','Rejected':'مسترد',
 'Expired':'میعاد ختم','Converted':'تبدیل شدہ','Received':'وصول شدہ','Advances':'پیشگی',

 // ---- dashboard
 'Receivables':'وصولیاں','Payables':'واجبات','Stock value':'اسٹاک کی قیمت','Net profit':'خالص منافع',
 'Distributors owe you':'ڈسٹریبیوٹرز آپ کے مقروض ہیں',
 'Nothing to compare with yet':'موازنے کے لیے ابھی کچھ نہیں',
 'vs the period before':'پچھلی مدت کے مقابلے میں',
 'This period at a glance':'اس مدت ایک نظر میں',
 'Revenue':'آمدنی','Cost of goods':'مال کی لاگت','Net':'خالص',
 'Nothing here yet':'یہاں ابھی کچھ نہیں',
 'Load the sample business':'نمونہ کاروبار لوڈ کریں',
 'Load the sample business to see how it all fits together — six weeks of purchases, sales, payments, returns and expenses, with books that balance. You can clear it again from Settings.':'نمونہ کاروبار لوڈ کریں تاکہ سب کچھ جڑا ہوا دکھائی دے — چھ ہفتوں کی خریداری، فروخت، ادائیگیاں، واپسیاں اور اخراجات، متوازن کھاتوں کے ساتھ۔ آپ اسے ترتیبات سے دوبارہ صاف کر سکتے ہیں۔',
 'low stock':'کم اسٹاک','negative stock':'منفی اسٹاک',
 'Items below their reorder level':'وہ اشیاء جو دوبارہ خریدنے کی سطح سے کم ہیں',
 'Items with negative stock':'منفی اسٹاک والی اشیاء',

 // ---- sales, purchases and the shared list furniture
 'New Invoice':'نیا انوائس','New Purchase':'نئی خریداری',
 'Search sales or parties':'فروخت یا فریقین تلاش کریں',
 'Search purchases or parties':'خریداری یا فریقین تلاش کریں',
 'No matches':'کوئی نتیجہ نہیں','Try another status or search.':'دوسری حالت یا تلاش آزمائیں۔',

 // ---- expenses
 'Total spent':'کل خرچ','Search expenses':'اخراجات تلاش کریں','Add expense':'خرچ شامل کریں',
 'No expenses here':'یہاں کوئی خرچ نہیں','Try another period or category.':'دوسری مدت یا قسم آزمائیں۔',

 // ---- payments
 'Search by party':'فریق سے تلاش کریں','New payment':'نئی ادائیگی',
 'Nothing to pay here':'یہاں ادا کرنے کو کچھ نہیں',
 'Unpaid items of this type will show up here.':'اس قسم کی غیر ادا شدہ اشیاء یہاں دکھائی دیں گی۔',
 'No payments':'کوئی ادائیگی نہیں','Recorded payments will show up here.':'درج شدہ ادائیگیاں یہاں دکھائی دیں گی۔',
 'Advance':'پیشگی','Total payable':'کل واجب الادا','Due':'باقی','items':'اشیاء',
 'Suppliers':'سپلائرز','Salaries':'تنخواہیں','Commission':'کمیشن','Other':'دیگر',

 // ---- parties
 'Search parties':'فریقین تلاش کریں','Add party':'فریق شامل کریں',
 'Customers':'گاہک','Distributors':'ڈسٹریبیوٹرز',

 // ---- inventory
 'Search products or scan':'مصنوعات تلاش کریں یا اسکین کریں','Add product':'مصنوعہ شامل کریں',
 'Negative':'منفی','Low stock':'کم اسٹاک','In stock':'دستیاب','units':'یونٹ','brands':'برانڈز',

 // ---- quotations, returns, journal
 'No quotations':'کوئی کوٹیشن نہیں','Create one and send it to a customer.':'ایک بنائیں اور گاہک کو بھیجیں۔',
 'No returns yet':'ابھی کوئی واپسی نہیں','Returned goods will show up here.':'واپس شدہ مال یہاں دکھائی دے گا۔',
 'No journal entries':'کوئی جرنل اندراج نہیں',
 'Use journals for opening balances and adjustments.':'ابتدائی بیلنس اور ایڈجسٹمنٹ کے لیے جرنل استعمال کریں۔',
 'Sale returns':'فروخت کی واپسی','Purchase returns':'خریداری کی واپسی',
 'New entry':'نیا اندراج','New quotation':'نیا کوٹیشن','New return':'نئی واپسی'
};

Object.assign(UR,{
 'Appearance':'ظاہری انداز',
 'Appearance and colours':'ظاہری انداز اور رنگ',
 'Make your workspace comfortable.':'اپنے کام کی جگہ کو اپنی پسند کے مطابق بنائیں۔',
 'Light or dark. Or let your device decide.':'روشن، گہرا، یا ڈیوائس کی ترتیب کے مطابق۔',
 'Used for buttons, highlights and invoices.':'بٹنوں، نمایاں حصوں اور انوائس کے لیے۔',
 'Custom colour':'اپنی پسند کا رنگ',
 'Choose any shade':'کوئی بھی رنگ منتخب کریں',
 'Live preview':'براہِ راست پیش نظارہ',
 'Sample invoice':'نمونہ انوائس',
 'Saved automatically. Display mode stays on this device only; your accent also colours printed invoices.':'تبدیلیاں خود محفوظ ہوتی ہیں۔ ڈسپلے کا انداز صرف اس ڈیوائس پر رہتا ہے؛ منتخب رنگ پرنٹ شدہ انوائس پر بھی استعمال ہوتا ہے۔'
});

const lang=()=>S.lang==='ur'?'ur':'en';
const isRTL=()=>lang()==='ur';
// Look a phrase up. A phrase with no entry stays English, which is the safe way round for a shopkeeper.
const tr=s=>lang()==='ur'?(UR[s]||s):s;

Object.assign(UR,{'Run salaries':'تنخواہیں درج کریں','Advance recovered':'وصول شدہ پیشگی رقم','Monthly advance recovery':'پیشگی رقم کی ماہانہ وصولی','Employee payment':'ملازم کو ادائیگی','Employee payments':'ملازمین کو ادائیگیاں','Employee advance':'ملازم کو پیشگی رقم','Employee advances':'ملازمین کی پیشگی رقوم','Record actions':'ریکارڈ کے اختیارات','Edit':'ترمیم','Export':'برآمد کریں','Delete / Void':'حذف / منسوخ','Delete permanently':'مستقل حذف کریں','Void':'منسوخ','Save changes':'تبدیلیاں محفوظ کریں','Save payment':'ادائیگی محفوظ کریں','Save expense':'خرچ محفوظ کریں','Add expense':'خرچ شامل کریں','Payment status':'ادائیگی کی حالت','Paid by company':'کمپنی نے ادا کیا','Paid personally by employee':'ملازم نے ذاتی طور پر ادا کیا','Unpaid — pay later':'غیر ادا شدہ — بعد میں ادائیگی','Company cash / bank account':'کمپنی کا نقد / بینک کھاتہ','Employee who paid personally':'ذاتی ادائیگی کرنے والا ملازم','Related sales invoice (optional)':'متعلقہ فروخت کا انوائس (اختیاری)','Charge name':'اضافی رقم کا نام','Amount':'رقم','Additional charge':'اضافی رقم','Add charge':'اضافی رقم شامل کریں','Remove charge':'اضافی رقم ہٹائیں','Tax (%)':'ٹیکس (%)','Subtotal':'ذیلی کل','Discount':'رعایت','Grand total':'مجموعی رقم','Balance due':'واجب الادا رقم','Salary runs':'تنخواہوں کے اندراجات','Advances':'پیشگی رقوم','Advance outstanding':'باقی پیشگی رقم','Owed to staff':'ملازمین کی واجب الادا رقم','Advances out':'دی گئی پیشگی رقوم','Monthly recovery':'ماہانہ وصولی','Transfers':'کھاتوں میں منتقلی','Transfer':'منتقلی','From':'سے','To':'کو','Paid from':'ادائیگی کا کھاتہ','Notes':'نوٹس','Employee':'ملازم','Date':'تاریخ','Category':'زمرہ','Designation':'عہدہ','Joined':'شمولیت','Basic':'بنیادی تنخواہ','Bonus':'اضافی تنخواہ','Net pay':'خالص تنخواہ','Scan or enter product code':'اسکین کریں یا پروڈکٹ کوڈ لکھیں','Barcode / product code':'بارکوڈ / پروڈکٹ کوڈ','Use camera':'کیمرہ استعمال کریں','Add product':'پروڈکٹ شامل کریں','Select employee':'ملازم منتخب کریں','Invoice title':'انوائس کا عنوان','Text size':'متن کا سائز','Font style':'فونٹ کا انداز','Document style':'دستاویز کا انداز','Row spacing':'قطاروں کا فاصلہ','Typography and layout':'متن اور ترتیب','Invoice templates':'انوائس کے نمونے','Company profile':'کمپنی کی معلومات','Edit notes':'نوٹس میں ترمیم','Phone':'فون','Email':'ای میل','Back':'واپس','Close':'بند کریں','Preview':'پیش نظارہ','Print':'پرنٹ','Save PDF':'پی ڈی ایف محفوظ کریں','Share':'شیئر کریں','Discard invoice?':'انوائس منسوخ کریں؟','You have unsaved items or changes in this invoice. Discard them?':'اس انوائس میں غیر محفوظ شدہ اندراجات موجود ہیں۔ کیا آپ انہیں منسوخ کرنا چاہتے ہیں؟','Discard':'منسوخ کریں','Fit to screen':'اسکرین کے مطابق','Zoom to full size':'مکمل سائز دیکھیں'});
