// core/users.js - who may do what. No screen code.
//
// Read this before trusting it: the books live in this device's browser storage, so a role decides what the
// app OFFERS, not what somebody determined could reach. There is no server to enforce anything. It keeps a
// cashier out of the accounts and stops accidents; it is not security against the phone's owner.
//
// An install with NO users is open, which is how the app behaved before users existed - so nothing breaks
// for somebody who never turns them on.
const ROLES=['admin','manager','cashier','viewer'];
const ROLE_LABEL={admin:'Administrator',manager:'Manager',cashier:'Cashier',viewer:'Viewer'};
// One capability per group of screens. The administrator is the only role holding every one of them.
const CAP_LABEL={dash:'Dashboard, alerts',sales:'Sales, invoices, quotations',purchases:'Purchases, suppliers bills',parties:'Customers and suppliers',inventory:'Products, stock',payments:'Receipts and payments',expenses:'Expenses',returns:'Returns',cashbank:'Cash and bank',journal:'Journal',reports:'Reports and accounts',distributor:'Distributor module',settings:'Company, templates, settings',users:'Users and roles'};
const CAPS={
  admin:['dash','sales','purchases','parties','inventory','payments','expenses','returns','cashbank','journal','reports','distributor','settings','users','employees'],
  manager:['dash','sales','purchases','parties','inventory','payments','expenses','returns','cashbank','journal','reports','distributor','employees'],
  cashier:['dash','sales','payments','returns','parties','inventory'],
  viewer:['dash','reports']
};
CAP_LABEL.employees='Employees, salaries, advances';
const can=c=>!USERS.length||!!(S.user&&(CAPS[S.user.role]||[]).indexOf(c)>=0);
// Which capability each screen needs. A screen missing from this map needs nothing (the log-in screen, a
// preview, a sheet), so the map only has to name what is restricted.
const SCREEN_CAP={inv:'sales',prod:'inventory',pay:'purchases',cust:'parties',dl:'distributor',dd:'distributor',pt:'parties',pd:'parties',co:'settings',tp:'settings',st:'settings',wz:'settings',users:'users',stf:'employees',stfp:'employees',skd:'employees',rp:'reports',rpt:'reports',ac:'reports',acd:'reports',stmt:'reports',pl:'reports',jl:'journal',jf:'journal',jd:'journal',ex:'expenses',exf:'expenses',exd:'expenses',qt:'sales',qd:'sales',cb:'cashbank',cbd:'cashbank',tfr:'cashbank',rt:'returns',rtf:'returns',rtd:'returns',pm:'payments',pmf:'payments',pmd:'payments'};
const canScreen=sc=>!USERS.length||!SCREEN_CAP[sc]||can(SCREEN_CAP[sc]);
const TAB_CAP={dash:'dash',sales:'sales',pur:'purchases',inv:'inventory'};
const canTab=t=>!USERS.length||!TAB_CAP[t]||can(TAB_CAP[t]);
// What the renderer must draw right now, and whether the role may have it. These two live here, pure, so the
// gate itself can be tested without a browser: the first version of it was inverted, so every allowed screen
// drew the refusal and the log-in screen could never be reached. Testing the screens does not catch that -
// only testing the gate does.
const gateScreen=()=>(USERS.length&&!S.user)?'login':S.screen;
function screenAllowed(){const sc=gateScreen();return sc?canScreen(sc):canTab(S.tab)}
const isAdmin=()=>!USERS.length||!!(S.user&&S.user.role==='admin');
// The More screen's rows, and the capability each one needs, so a cashier is not shown a door they cannot
// open. A row missing from here needs nothing but the dashboard.
const MCAP={'Parties':'parties','Payments':'payments','Expenses':'expenses','Returns':'returns','Quotations':'sales','Cash and Bank':'cashbank','Reports':'reports','Accounts':'reports','Distributor':'distributor','Journal':'journal','Notifications':'dash','Company Profile':'settings','Templates':'settings','Users':'users','Settings':'settings','Employees':'employees','Theme':'dash','Language':'dash'};
// A user is identified by an id, never by their name: a name gets changed, and anything still holding the
// old one would lose the thread. The name is what a person reads and what is written on each entry.
const highestId=()=>USERS.reduce((m,u)=>Math.max(m,Number(String(u.id||'').replace(/\D/g,''))||0),0);
const nextUserId=()=>'u'+(highestId()+1);
const userByName=n=>USERS.find(u=>u.n===n);
const userById=id=>id?USERS.find(u=>u.id===id):undefined;
const userBy=a=>userById(a)||userByName(a);
// A book saved before users had ids gets them on the way in, rather than every reader coping with both.
function ensureUserIds(){USERS.forEach(u=>{if(!u.id)u.id=nextUserId()})}
// Signing in copies the id, name and role onto the session. S.user is deliberately NOT saved with the book,
// so closing the app signs you out.
// ---- PINs -------------------------------------------------------------------------------------------------
// A PIN is stored as a PBKDF2-SHA256 hash with a per-user salt, never as the digits themselves. The upgrade is
// automatic: the first time this build opens a book that still has plain PINs, each one is hashed and the plain
// field is removed. A four-digit PIN is still guessable by somebody who is allowed to keep trying; what this
// fixes is the far more common case of a PIN being read straight out of the saved file.
const PIN_ROUNDS=150000, PIN_ALGO='pbkdf2-sha256-150000';
const pinCrypto=()=>{try{return typeof crypto!=='undefined'&&!!crypto.subtle&&!!crypto.getRandomValues}catch(e){return false}};
const pinB64=b=>btoa(String.fromCharCode.apply(null,new Uint8Array(b)));
const pinBytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function pinSalt(){const a=new Uint8Array(16);crypto.getRandomValues(a);return pinB64(a)}
async function pinHash(pin,salt){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(pin)),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:pinBytes(salt),iterations:PIN_ROUNDS,hash:'SHA-256'},key,256);
  return pinB64(bits)}
// Check a PIN against either form. A plain PIN that still matches is upgraded on the spot, so a book is fixed
// the first time its owner signs in even if the boot-time sweep never ran.
async function pinMatches(u,pin){if(!u||u.active===false)return false;
  if(u.pinHash&&u.pinSalt){try{return (await pinHash(pin,u.pinSalt))===u.pinHash}catch(e){return false}}
  if(String(u.pin)!==String(pin))return false;
  if(pinCrypto()){try{const s=pinSalt();u.pinSalt=s;u.pinHash=await pinHash(pin,s);u.pinAlgo=PIN_ALGO;u.wasDefault=String(pin)==='1234';delete u.pin;save()}catch(e){}}
  return true}
// Boot-time sweep: hashes every plain PIN that is still in the book and saves once.
async function ensurePinHashes(){if(!pinCrypto())return 0;let n=0;
  for(const u of USERS){
    if(u.pinHash||!u.pin)continue;
    try{const s=pinSalt();u.pinSalt=s;u.pinHash=await pinHash(u.pin,s);u.pinAlgo=PIN_ALGO;u.wasDefault=String(u.pin)==='1234';delete u.pin;n++}catch(e){}
  }
  if(n)save();
  return n}
// The async sign-in the log-in screen uses. Kept separate from signIn() because hashing is asynchronous and the
// old synchronous signIn is still used by tests and by any book that has not been upgraded yet.
async function signInHashed(key,pin){const u=userBy(key);
  if(!u)return {ok:false,reason:'No user called '+key};
  if(u.active===false)return {ok:false,reason:u.n+' cannot sign in'};
  if(!(await pinMatches(u,pin)))return {ok:false,reason:'Wrong PIN for '+u.n};
  S.user={id:u.id,n:u.n,role:u.role};
  return {ok:true,u}}
function signIn(key,pin){const u=userBy(key);if(!u||u.active===false)return false;
  // A hashed PIN cannot be checked in a synchronous call; the screen uses signInHashed for those.
  if(u.pinHash)return false;
  if(String(u.pin)!==String(pin))return false;S.user={id:u.id,n:u.n,role:u.role};return true}
// Why a sign-in failed, or '' when it would work. A wrong PIN and a user that does not exist are different
// problems, and saying "that name and PIN do not match" for both leaves the owner with nothing to act on.
function signInProblem(key,pin){const u=userBy(key);
  if(!u)return 'No user called '+key;
  if(u.active===false)return u.n+' cannot sign in';
  if(String(u.pin)!==String(pin))return 'Wrong PIN for '+u.n;
  return ''}
// Clearing the session is all this does; the caller draws the log-in screen, because core/ holds no screens.
function signOut(){S.user=null;S.screen='login'}
// What is wrong with a user, or '' when nothing is. Kept separate from saveUser so the caller can say the
// reason and core/ never has to know how a message is shown.
function userProblem(k,o){const n=String(o.n||'').trim(),p=String(o.pin||'').trim();
  const kept=k>=0&&USERS[k]&&USERS[k].pinHash;
  if(!n)return 'Enter a name';
  if(!p&&!o.pinHash&&!kept)return 'Set a PIN';
  if(USERS.some((x,i)=>i!==k&&x.n===n))return 'There is already a user called '+n;
  return ''}
// Changing a user must not leave a session pointing at a name or role that no longer exists. The id does
// not change on an edit, which is the whole reason it exists. A blank PIN on an edit keeps the stored hash.
function saveUser(k,o){if(userProblem(k,o))return false;
  const n=String(o.n).trim(),old=k>=0?USERS[k]:null,
        rec={id:old&&old.id?old.id:nextUserId(),n:n,role:o.role||'cashier',active:o.active!==false};
  if(o.pin){rec.pin=String(o.pin).trim();rec.wasDefault=!!o.wasDefault}
  else if(o.pinHash){rec.pinHash=o.pinHash;rec.pinSalt=o.pinSalt;rec.pinAlgo=o.pinAlgo;rec.wasDefault=!!o.wasDefault}
  else if(old&&old.pinHash){rec.pinHash=old.pinHash;rec.pinSalt=old.pinSalt;rec.pinAlgo=old.pinAlgo;rec.wasDefault=!!old.wasDefault}
  if(k<0)USERS.push(rec);else USERS[k]=rec;
  if(S.user&&old&&S.user.id===old.id)S.user={id:rec.id,n:n,role:rec.role};
  return true}
// The last active administrator cannot be removed: the app would be left with nobody who can add one back.
function delProblem(k){const u=USERS[k];if(!u)return 'No such user';
  if(u.role==='admin'&&USERS.filter(x=>x.role==='admin'&&x.active!==false).length<2)return 'Keep at least one active administrator';
  return ''}
function delUser(k){if(delProblem(k))return false;
  const u=USERS[k];USERS.splice(k,1);
  if(S.user&&S.user.id===u.id){S.user=null;S.screen='login'}
  return true}
