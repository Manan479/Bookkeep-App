// app/boot.js - starts the app. Loaded last.
load();
// A fresh install has nothing saved, so load() returns before its repair step: the seeded administrator
// would have no id until the first reload, and anything posted before then would record an empty one.
ensureUserIds();
// Nobody is signed in at start-up: S.user is filled by a PIN and is deliberately not part of the saved
// book, so closing the app signs you out. The wizard only comes after the log-in, so a new phone asks for
// the administrator PIN before it asks anything about the business.
if(USERS.length&&!S.user)S.screen='login';
else if(window.PERSIST&&!SET.done)wzInit();
render();
