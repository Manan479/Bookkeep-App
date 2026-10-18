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
function signIn(key,pin){const u=userBy(key);if(!u||u.active===false||String(u.pin)!==String(pin))return false;S.user={id:u.id,n:u.n,role:u.role};return true}
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
  if(!n)return 'Enter a name';if(!p)return 'Set a PIN';
  if(USERS.some((x,i)=>i!==k&&x.n===n))return 'There is already a user called '+n;
  return ''}
// Changing a user must not leave a session pointing at a name or role that no longer exists. The id does
// not change on an edit, which is the whole reason it exists.
function saveUser(k,o){if(userProblem(k,o))return false;
  const n=String(o.n).trim(),old=k>=0?USERS[k]:null,
        rec={id:old&&old.id?old.id:nextUserId(),n:n,role:o.role||'cashier',pin:String(o.pin).trim(),active:o.active!==false};
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
