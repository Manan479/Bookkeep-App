// export.test.js - the export, backup and restore that every screen shares.
//
// The screens themselves are covered elsewhere; what is checked here is the part that was fake until now:
// that a screen registers what it is showing, that the CSV is written the way a spreadsheet expects, and
// that a backup can be restored into a clean app and bring the books back exactly.

signIn('Admin','1234');
// ---- what a screen registers is what gets exported ------------------------------------------------------
S.xp=null;S.screen='dash';dash();T('the dashboard registers what it is showing',!!S.xp&&S.xp.rows.length>=8);
S.screen='rp';S.rpk='tb';rptScr();T('a report registers its own table',!!S.xp&&S.xp.rows.length>0&&S.xp.cols.length===S.xp.rows[0].length);
S.rpk='pl';pl();T('the profit and loss registers',S.xp.title==='Profit and Loss'&&S.xp.rows.length>=5);
S.screen=null;S.tab='sales';list(INV,'Sales','New Invoice');T('the sales list registers',S.xp.title==='Sales');
S.tab='pur';list(PUR,'Purchases','New Purchase');T('the purchases list registers in its own name',S.xp.title==='Purchases');
S.screen='ex';exScr();T('expenses register',S.xp.title==='Expenses');
S.screen='ac';acScr();T('the accounts list registers',S.xp.title==='Accounts'&&S.xp.rows.length>0);
S.screen='stf';stfScr();T('employees register',S.xp.title==='Employees');
S.screen=null;S.tab='inv';inventory();T('stock registers',S.xp.title==='Stock'&&S.xp.rows.length===PRD.length);

// ---- the CSV itself --------------------------------------------------------------------------------------
eq('a cell with a comma is quoted',csvCell('Smith, Jones'),'"Smith, Jones"');
eq('a cell with a quote is doubled and quoted',csvCell('say "hi"'),'"say ""hi"""');
eq('a plain cell is left alone',csvCell(1200),'1200');
eq('an empty cell is empty',csvCell(null),'');
T('the header comes first',csvText(['A','B'],[[1,2]]).indexOf('A,B')===0);
eq('and the rows follow it',csvText(['A','B'],[[1,2],[3,4]]).split('\r\n').length,3);

// ---- a backup is the whole book, and restoring it brings the book back --------------------------------------
// ---- on the phone: the WebView cannot save a file, so it must not claim it did -------------------------
T('the shell is not detected in a browser',!inShell());
window.Haptics={tick:function(){}};
T('and is detected inside the app',inShell());
T('so no download is attempted there',downloadFile('x.csv','a,b','text/csv')===false);
T('and the text is offered to copy instead',(textSheet('Export','x.csv','A,1'),true));
let handed=null;window.Saver={save:function(n,t,m){handed=[n,m]}};
eq('an app that can save is asked to, rather than copied',downloadFile('a.csv','x','text/csv'),'ask');
eq('and it is handed the file name and type',handed.join('|'),'a.csv|text/csv');
window.Saver=undefined;
window.Haptics=undefined;
T('a browser is not treated as the shell',!inShell());
 loadDemo();
const salesBefore=ledBal('Sales'),stockBefore=ledBal('Inventory'),rowsBefore=INV.length,usersBefore=USERS.length;
const file=backupJSON();
T('a backup is a file of text',typeof file==='string'&&file.length>1000);
T('and it carries every store',['PRD','JRN','INV','EMP','USERS'].every(k=>file.indexOf('"'+k+'"')>=0));
// Wipe the app right down, the way a different device would be, then restore.
wipeData();JRN.length=0;INV.length=0;PUR.length=0;EMP.length=0;SAL.length=0;USERS.length=0;
eq('the books are empty before the restore',ledBal('Sales'),0);
eq('and the staff are gone',EMP.length,0);
eq('a file that is not a backup is refused',restoreJSON('{"hello":1}'),'That file is not a bookkeep backup');
eq('and so is nonsense',restoreJSON('not json at all'),'That file is not readable as a backup');
eq('a real backup is accepted',restoreJSON(file),'');
eq('the sales came back',ledBal('Sales'),salesBefore);
eq('the stock came back',ledBal('Inventory'),stockBefore);
eq('the invoices came back',INV.length,rowsBefore);
eq('the staff came back',EMP.length,3);
eq('the users came back',USERS.length,usersBefore);
T('the trial balance still balances after a restore',trialRows().diff===0);
T('and every entry still balances',ledHealthy().bad.length===0);
eq('what staff are owed still equals the account',r2(EMP.reduce((a,e)=>a+empBal(e.n),0)),ledBal('Employee payable'));

// ---- restoring somebody else's book must not leave you signed in as a stranger ------------------------------
signIn(USERS[0].n,USERS[0].pin);
T('signed in as a user of this book',!!S.user);
const other=JSON.parse(file);other.USERS=[{id:'u99',n:'Someone Else',role:'admin',pin:'4321',active:true}];
eq('a book with different users is accepted',restoreJSON(JSON.stringify(other)),'');
T('and the session is signed out rather than left pointing at a user who is not here',!S.user&&S.screen==='login');
T('no export is registered before a screen is drawn',(S.xp=null,typeof exportSheet==='function'));
// The rest of this file drives real screens, and a screen is only drawn for somebody signed in (a selection
// bar belongs to the screen its rows are on, so a gated log-in screen rightly shows none). Sign back in as the
// restored book's own user, which is what happens when a real person opens the app.
signIn(USERS[0].n,USERS[0].pin);
T('signed back in to carry on',!!S.user);
// ---- on the phone: the WebView cannot save a file, so it must not claim it did -------------------------
T('the shell is not detected in a browser',!inShell());
window.Haptics={tick:function(){}};
T('and is detected inside the app',inShell());
T('so no download is attempted there',downloadFile('x.csv','a,b','text/csv')===false);
T('and the text is offered to copy instead',(textSheet('Export','x.csv','A,1'),true));
window.Haptics=undefined;
T('a browser is not treated as the shell',!inShell());
 loadDemo();

// ---- long-press selection: choosing rows and doing something with all of them --------------------------
loadDemo();
S.screen=null;S.tab='sales';list(INV,'Sales','New Invoice');
T('the list offers its rows for selection',S.selRows.length>0&&S.selRows[0].id===INV[0][0]);
T('and says what its columns are',S.selCols.length===5&&S.selTitle==='Sales');
T('nothing is selected to start with',!selOn()&&selBar()==='');
selToggle(S.selRows[0].id);
T('a row can be selected',selOn()&&selIds().length===1&&selIn(S.selRows[0].id));
T('and the bar appears with what can be done',selBar().includes('Export')&&selBar().includes('Cancel'));
selToggle(S.selRows[1].id);
eq('a second row joins it',selIds().length,2);
selToggle(S.selRows[1].id);
eq('and tapping a selected row takes it back out',selIds().length,1);
S.sel=null;selAllRows();
eq('Select all takes every row the list is showing, not every record',selIds().length,S.selRows.length);
T('and the button then offers to undo it',selBar().includes('Deselect all')&&!selBar().includes('Select all<'));
selToggleAll();
T('Deselect all clears the selection',!selOn());
selAllRows();
T('an invoice selection can be printed as one file',selDocs().length===selIds().length&&selBar().includes('PDF'));
selCsv();
eq('CSV exports exactly the selected rows',S.xp.rows.length,selIds().length);
eq('with the list columns',S.xp.cols.length,5);
S.sel={ids:[selIds()[0],selIds()[1]]};
S.screen='batch';chk('the batch print view',batchScr());
eq('one paper per selected document',(batchScr().match(/class="paperwrap"/g)||[]).length,2);
T('and it has its own Print button',batchScr().includes('doPrint()')&&batchScr().includes('Save / share PDFs'));
S.screen='ex';exScr();S.sel={ids:(S.selRows[0]?[S.selRows[0].id]:['EXP-1'])};
T('expense selections offer their printable documents',selBar().includes('PDF'));
T('but can still be exported',selBar().includes('Export'));
selClear();T('Cancel clears the selection',!selOn());
// The click that ends a long press must be swallowed so it does not open the row - but only that click. A flag
// used to stay set when the phone fired no click, and then ate the next tap: Cancel and deselection each took
// two taps. The rule is now a timestamp that expires.
S.lpAt=Date.now();T('the click ending a long press is swallowed',lpSwallow());
S.lpAt=Date.now()-800;T('but an old long press cannot eat a later tap',!lpSwallow());
S.lpAt=0;

// ---- the export chooser: CSV, PDF or an image ----------------------------------------------------------
S.xp={title:'Sales & Co',cols:['Number','Party','Total'],rows:[['INV-1','Smith, Jones',1200],['INV-2','<b>Zara</b>',900]]};
T('CSV is the table as a spreadsheet',csvText(S.xp.cols,S.xp.rows).split('\r\n').length===3);
T('PDF is a printable page',pdfTableHtml(S.xp).includes('<table')&&pdfTableHtml(S.xp).includes('class="paper paper-table"'));
T('and it escapes what people typed',pdfTableHtml(S.xp).includes('&lt;b&gt;Zara&lt;/b&gt;')&&pdfTableHtml(S.xp).includes('Sales &amp; Co'));
T('the PDF names the company and the row count',pdfTableHtml(S.xp).includes('rows'));
T('an image cannot be drawn where there is no canvas, and says so rather than throwing',tableImage(S.xp)===null);
T('so the image export refuses instead of saving nothing',(exportImage(),true));
let saved=null;window.Saver={save:function(n,t,m){saved=[n,m,t.length]},saveBytes:function(n,b,m){saved=[n,m,'bytes']}};
exportCsv();eq('a CSV goes to the shell as text',saved[0],'sales-co-'+tdy+'.csv');
eq('with the spreadsheet type',saved[1],'text/csv;charset=utf-8');
eq('an image goes as bytes',(saveBlob('x.png','data:image/png;base64,AAAA','image/png'),saved[2]),'bytes');
window.Saver=undefined;
T('exporting nothing says so',(S.xp=null,typeof exportSheet==='function'));
S.xp={title:'Sales',cols:['A'],rows:[]};
T('an empty table is refused',(exportSheet(),true));

// ---- a balance is a side, not a signed number ----------------------------------------------------------
// The parties export put a netted figure in one column, which in a spreadsheet reads as "minus nine hundred"
// with no way to tell whether it means they owe you or you owe them - and the first version added the two
// sides together instead of netting them.
S.screen='pt';S.ptf='All';S.q='';ptScr();
T('parties export a debit and a credit column',S.xp.cols.indexOf('Debit (owes you)')>=0&&S.xp.cols.indexOf('Credit (you owe)')>=0);
T('and no column is a signed balance any more',S.xp.cols.indexOf('Balance')<0);
T('nothing exported is negative',S.xp.rows.every(r=>r[4]>=0&&r[5]>=0));
T('a party sits on one side or the other, never both',S.xp.rows.every(r=>r[4]===0||r[5]===0));
T('and the side shown agrees with what the screen says beside that party',S.xp.rows.every(r=>{
 const p=parties().filter(x=>x.n===r[0])[0],net=pbal(p);return net>0?r[4]===net:r[5]===r2(-net)}));
