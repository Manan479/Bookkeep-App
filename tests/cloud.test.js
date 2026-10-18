// tests/cloud.test.js - the version rule is the whole safety of cloud sync, so it is tested on its own.
T('a device with no cloud project is configured as off',!cloudConfigured()&&cloudSignedIn()===false);
const m0={version:0,dirty:false},m1={version:1,dirty:false},m1d={version:1,dirty:true};
eq('nothing to do when both are at the same version',cloudVersionState(m1,1),'same');
eq('a clean device downloads a newer server copy',cloudVersionState(m1,2),'pull');
eq('a dirty device and a newer server copy is a conflict',cloudVersionState(m1d,2),'conflict');
eq('a local copy ahead of the server is uploaded',cloudVersionState({version:3,dirty:true},2),'push');
eq('a clean device at the same version does nothing',cloudVersionState(m0,0),'same');
T('the payload hash notices a change',cloudHash('a')!==cloudHash('b')&&cloudHash('a')===cloudHash('a'));
T('saving an unchanged book does not mark it dirty',(()=>{const was=cloudMeta();cloudTouch();return JSON.stringify(cloudMeta())===JSON.stringify(was)})());
chk('the cloud screen renders the setup step when nothing is configured',clScr());
T('and it explains where the SQL lives',clScr().includes('supabase.sql'));
T('Settings offers cloud sync',stScr().includes('Cloud sync'));
