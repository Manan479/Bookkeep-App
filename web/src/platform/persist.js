// platform/persist.js - saves and restores all app data on the device (browser storage).
// Replace this file with a database or Drive adapter later; the rest of the app only calls save() and load().
const DB={PRD,PRICE,CO,BQ,BA,BUY,USERS,EMP,SAL,STFP,EMPA,INV,PUR,PAYB,DIST,DCU,DRATE,CUST,SUPP,CUSTD,PAID,ADV,BAL,PAYM,METHODS,ACCTS,ACT,INVD,RET,QUOT,JRN,TRF,STK,LAY,EXP,CATS,COA,ACCT_TYPES,NUMP,COMP,TPL,SET};
const SKEYS=['n','pn','rn','vn','qn','cn','dnn','jv','jpn','en','theme','cur','title','dist','under','cmp','period','cr','fmt','grp'];
const STORE_KEY='bk_v2';
(function(){try{localStorage.setItem('bk_probe','1');localStorage.removeItem('bk_probe');window.PERSIST=true}catch(e){window.PERSIST=false}})();
// Everything that is saved, as one object. save() writes it to the device and a backup writes the same
// thing to a file, so a backup can never hold something the app itself would not have saved.
const storePayload=()=>{const o={s:{}};SKEYS.forEach(k=>{if(S[k]!==undefined)o.s[k]=S[k]});for(const k in DB)o[k]=DB[k];return o};
// The one place a saved book goes back into the app, used by load() and by a restore.
function applyStore(o){if(!o||typeof o!=='object')return false;
 for(const k in DB){if(o[k]===undefined)continue;const t=DB[k];if(Array.isArray(t)){t.length=0;o[k].forEach(x=>t.push(x))}else{Object.keys(t).forEach(x=>delete t[x]);Object.assign(t,o[k])}}
 Object.assign(S,o.s||{});
 // A book saved before an account existed will not carry that account's type, which would leave it
 // unpostable and missing from every report. Put the chart of accounts back together after a restore.
 for(const a of COA)if(!Object.prototype.hasOwnProperty.call(ACCT_TYPES,a))ACCT_TYPES[a]='expense';
 // A book saved before users had ids gets them here, so nothing later has to cope with both shapes. The
 // entries already posted keep the author's NAME, which is what makes them readable after a rename.
 ensureUserIds();
 // Restoring somebody else's file must not leave this session signed in as a user who is not in it.
 if(S.user&&!userBy(S.user.id)){S.user=null;S.screen='login'}
 return true}
function save(){if(window._noSave)return;try{localStorage.setItem(STORE_KEY,JSON.stringify(storePayload()))}catch(e){}}
function load(){try{const r=localStorage.getItem(STORE_KEY);if(!r)return;if(applyStore(JSON.parse(r)))theme(S.theme||'system')}catch(e){}}
// A backup is the saved book as a file. A restore says WHY it refused rather than half-loading the file.
const backupJSON=()=>JSON.stringify(storePayload());
function restoreJSON(txt){let o=null;try{o=JSON.parse(txt)}catch(e){return 'That file is not readable as a backup'}
 if(!o||typeof o!=='object'||!o.PRD||!o.COA)return 'That file is not a bookkeep backup';
 applyStore(o);save();return ''}
window.saveNow=save;
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
