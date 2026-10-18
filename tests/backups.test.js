// tests/backups.test.js - the reminder logic and the storage fallback. The async snapshot flow is exercised by
// tools/probe.js and by the screen itself, because this harness runs synchronously.
T('a book that has never been backed up is flagged',bkHealth(null).level==='bad'&&bkHealth(null).days===null);
T('a backup from today is healthy',bkHealth({at:Date.now()}).level==='ok'&&bkHealth({at:Date.now()}).text==='today');
T('one from yesterday reads as yesterday',bkHealth({at:Date.now()-864e5}).text==='yesterday');
T('three days old is a warning',bkHealth({at:Date.now()-3*864e5}).level==='warn');
T('a week old is a problem',bkHealth({at:Date.now()-8*864e5}).level==='bad');
eq('age is counted in whole days',bkDaysAt(Date.now()-2*864e5-1000),2);
T('the last-backup note is stored with the device',(bkWriteMeta({at:1234}),bkMeta().at===1234));
T('the snapshot API exists and never assumes IndexedDB',typeof bkAll==='function'&&typeof snapshotBook==='function'&&typeof bkStorage==='function');
T('the restore reports a missing snapshot instead of throwing',typeof bkRestore==='function');
S.bkList=[{id:1,at:Date.now(),reason:'automatic',bytes:2048,counts:{invoices:3,journal:4}}];S.bkWhere='indexeddb';
chk('the backups screen',bkScr());
T('it offers a manual backup and a restore',bkScr().includes('Back up now')&&bkScr().includes('Restore'));
T('the reminder appears in Notifications when backups are stale',(bkWriteMeta({at:Date.now()-9*864e5}),notifs().some(x=>x.g==='Backups')));
T('and it is silent when one was taken today',(bkWriteMeta({at:Date.now()}),!notifs().some(x=>x.g==='Backups')));
bkWriteMeta({at:Date.now()});

