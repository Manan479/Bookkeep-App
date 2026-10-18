// users.test.js - who may open what. Runs last, so the books are not disturbed for the other files.
//
// The point of these checks is the shape of the rule, not the wording: an install with no users is open
// (everyone who used the app before still can), the administrator holds every capability, and each lesser
// role is refused the screens it should be. A wrong role model here is a wrong app.

// ---- no users at all: the app is open, exactly as it was before users existed -------------------------
USERS.length=0;S.user=null;
T('with no users the app is open',can('settings')&&canScreen('st')&&canScreen('inv'));

// ---- one administrator, and nobody signed in ----------------------------------------------------------
USERS.push({n:'Boss',role:'admin',pin:'1111',active:true});
T('with users, nothing is open until somebody signs in',!can('settings')&&!canScreen('st'));
T('a wrong PIN is refused',signIn('Boss','9999')===false&&!S.user);
eq('and it says whose PIN is wrong, not just that it failed',signInProblem('Boss','9999'),'Wrong PIN for Boss');
eq('an unknown name is a different problem',signInProblem('Nobody','1111'),'No user called Nobody');
eq('a working sign-in has no problem to report',signInProblem('Boss','1111'),'');
T('an unknown name is refused',signIn('Nobody','1111')===false);
T('the right PIN signs in',signIn('Boss','1111')===true&&S.user.n==='Boss'&&S.user.role==='admin');
eq('the session carries the role',S.user.role,'admin');
T('the administrator holds every capability',Object.keys(CAP_LABEL).every(c=>can(c)));
T('and can open every restricted screen',['st','tp','co','users','ex','pm','jl','rpt','ac','inv','prod','rt','cb','qt'].every(a=>canScreen(a)));

// ---- the lesser roles ----------------------------------------------------------------------------------
T('a cashier is added',saveUser(-1,{n:'Till',role:'cashier',pin:'2222',active:true}));
T('so is a viewer',saveUser(-1,{n:'Auditor',role:'viewer',pin:'3333',active:true}));
T('and a manager',saveUser(-1,{n:'Helper',role:'manager',pin:'4444',active:true}));
T('a name cannot be used twice',saveUser(-1,{n:'Till',role:'viewer',pin:'5555',active:true})===false);
T('a user needs a PIN',saveUser(-1,{n:'Nameless',role:'cashier',pin:'',active:true})===false);

T('the manager signs in',signIn('Helper','4444')===true);
T('a manager runs the shop',canScreen('inv')&&canScreen('ex')&&canScreen('pm')&&canScreen('rpt')&&canScreen('jl'));
T('but not the company settings',!canScreen('st')&&!canScreen('co')&&!canScreen('users')&&!can('users'));
T('and not the wizard',!canScreen('wz'));

T('the cashier signs in',signIn('Till','2222')===true);
T('a cashier can bill and take money',canScreen('inv')&&canScreen('pm')&&canScreen('rt')&&canScreen('pt'));
T('but cannot see the books',!canScreen('rpt')&&!canScreen('ac')&&!canScreen('st')&&!canScreen('ex')&&!canScreen('jl'));
T('nor the supplier bills',!canScreen('pay')&&!canTab('pur'));

T('the viewer signs in',signIn('Auditor','3333')===true);
T('a viewer can read the reports',canScreen('rpt')&&canScreen('ac')&&canScreen('pl'));
T('and nothing else',!canScreen('inv')&&!canScreen('ex')&&!canScreen('pm')&&!canScreen('st')&&!can('sales'));

// ---- turning a user off, and the one administrator who must stay ---------------------------------------
T('a disabled user cannot sign in',(USERS[USERS.findIndex(u=>u.n==='Till')].active=false,signIn('Till','2222')===false));
T('a signed-in user can be signed out',(signIn('Auditor','3333'),signOut(),S.user===null&&S.screen==='login'));
T('the last administrator cannot be deleted',delUser(USERS.findIndex(u=>u.n==='Boss'))===false);
T('but another administrator can be added',saveUser(-1,{n:'Boss2',role:'admin',pin:'1112',active:true}));
T('and then the first one can go',delUser(USERS.findIndex(u=>u.n==='Boss'))===true);
T('a deleted user cannot sign in',signIn('Boss','1111')===false);
T('the roles still leave somebody in charge',USERS.some(u=>u.role==='admin'&&u.active!==false));

// ---- editing yourself must not leave the session pointing at an old name or role ------------------------
signIn('Boss2','1112');
T('an administrator can rename themselves',saveUser(USERS.findIndex(u=>u.n==='Boss2'),{n:'Owner',role:'admin',pin:'1112',active:true}));
T('and the session follows',S.user.n==='Owner');
T('and a role change follows too',(saveUser(USERS.findIndex(u=>u.n==='Owner'),{n:'Owner',role:'manager',pin:'1112',active:true}),S.user.role==='manager'&&!canScreen('st')));

// ---- the screens themselves render ----------------------------------------------------------------------
chk('the log-in screen',loginScr());
chk('the users screen for an administrator',(S.user={n:'Owner',role:'admin'},usersScr()));
chk('the refusal screen',noAccess());
T('the log-in screen asks for a PIN',loginScr().includes('PIN')&&loginScr().includes('Sign in'));
T('and it says what the first-run PIN is while it is still the default',(USERS.push({n:'Fresh',role:'admin',pin:'1234',active:true}),loginScr().includes('1234')));
T('but stops saying it once it is changed',(USERS[USERS.length-1].pin='9876',!loginScr().includes('1234')));
T('the users screen lists what each role may open',usersScr().includes('Administrator')&&usersScr().includes('Cashier')&&usersScr().includes('Sales, invoices, quotations'));

// ---- the gate itself, which is the part that was wrong: it decides what the renderer draws -------------
// Every screen test above calls the screen function directly, so none of them would notice if the renderer
// inverted its answer. These do, because they ask the gate, not the screen.
USERS.length=0;S.user=null;S.screen='st';S.tab='dash';
T('with no users the gate lets any screen through',screenAllowed()&&gateScreen()==='st');
USERS.push({n:'Boss',role:'admin',pin:'1111',active:true});
eq('nobody signed in: the gate forces the log-in screen',gateScreen(),'login');
T('and lets that through',screenAllowed());
S.screen='users';eq('and nothing else is drawn in its place, not even a harmless screen',gateScreen(),'login');S.screen='st';
signIn('Boss','1111');
eq('signed in: the gate returns the screen that was asked for',gateScreen(),'st');
T('and lets an administrator through it',screenAllowed());
S.screen='users';T('the users screen is allowed for an administrator',screenAllowed());
saveUser(-1,{n:'Till',role:'cashier',pin:'2222',active:true});signIn('Till','2222');
S.screen='st';T('a cashier asking for settings is refused by the gate',!screenAllowed());
S.screen='inv';T('but allowed the invoice screen',screenAllowed());
S.screen=null;S.tab='pur';T('a cashier is refused the purchases tab',!screenAllowed());
S.tab='sales';T('and allowed the sales tab',screenAllowed());
S.screen='login';T('the log-in screen is always allowed',screenAllowed());

// ---- users are identified by an id, not by their name ----------------------------------------------------
USERS.length=0;S.user=null;
USERS.push({n:'Boss',role:'admin',pin:'1111',active:true});
T('a user with no id is given one by the repair',!USERS[0].id&&(ensureUserIds(),!!USERS[0].id));
const bossId=USERS[0].id;
T('and that id is not their name',bossId!==USERS[0].n);
T('an id is not handed out twice',(saveUser(-1,{n:'Till',role:'cashier',pin:'2222',active:true}),USERS[1].id!==bossId));
T('signing in by name still works',signIn('Boss','1111')&&S.user.id===bossId);
T('and by id works too',signIn(bossId,'1111')&&S.user.n==='Boss');
T('the session carries the id, the name and the role',S.user.id===bossId&&S.user.n==='Boss'&&S.user.role==='admin');
const renamed=USERS.findIndex(u=>u.id===bossId);
saveUser(renamed,{n:'Owner',role:'admin',pin:'1111',active:true});
eq('renaming keeps the same id',USERS[renamed].id,bossId);
T('and the session follows the new name',S.user.n==='Owner'&&S.user.id===bossId);
T('the old name no longer signs in',signIn('Boss','1111')===false);
T('the id still signs in',signIn(bossId,'1111')&&S.user.n==='Owner');
T('the log-in picker offers ids, not labels',(S.user=null,loginScr().includes('value="'+bossId+'"')));
T('and its options do not carry the role into the value',!loginScr().includes('value="Owner ·'));

// ---- signing out has to be reachable by every role, not only by the administrator ------------------------
// The Users screen is administrator-only, so a cashier who is signed in would otherwise have no way out.
USERS.length=0;USERS.push({n:'Boss',role:'admin',pin:'1111',active:true});
saveUser(-1,{n:'Till',role:'cashier',pin:'2222',active:true});
signIn('Till','2222');S.tab='more';
T('a cashier can sign out from More',more().includes('Sign out')&&more().includes('Till'));
T('and More names the role they are signed in as',more().includes('Cashier'));
T('the administrator can too',(signIn('Boss','1111'),more().includes('Sign out')));
S.user=null;T('with nobody signed in there is nothing to sign out of',!more().includes('Sign out'));
T('and with no users at all either',(USERS.length=0,more().indexOf('Sign out')<0));

// ---- the book and the session are separate: signing out must not be saved with the books ----------------
T('the session is not part of the saved book',!SKEYS.includes('user'));
(function(){USERS.length=0;USERS.push({n:'H',role:'admin',pinHash:'abc',pinSalt:'def',active:true});
T('a user whose PIN is only a hash cannot be signed in synchronously',signIn('H','anything')===false);
T('the hashed sign-in is asynchronous, so the check can be slow on purpose',signInHashed('H','anything') instanceof Promise);
T('a blank PIN on an edit keeps the stored hash',saveUser(0,{n:'H',role:'admin',active:true})&&USERS[0].pinHash==='abc'&&USERS[0].pinSalt==='def');
T('and that edit is allowed without a PIN',userProblem(0,{n:'H',role:'admin'})==='');
T('a new user without a PIN is still refused',userProblem(-1,{n:'NoPin',role:'cashier'})==='Set a PIN');
T('a hashed user has no plain PIN field at all',!('pin' in USERS[0]));
T('the upgrade sweep exists',typeof ensurePinHashes==='function'&&typeof pinCrypto==='function');
})();
T('the login screen is one centred column, so the button and notes share the card edges',loginScr().includes('class="auth"'));
