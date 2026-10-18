// app/boot.js - starts the app. Loaded last.
load();
// A fresh install has nothing saved, so load() returns before its repair step: the seeded administrator
// would have no id until the first reload, and anything posted before then would record an empty one.
ensureUserIds();
// A book saved before PINs were hashed still holds the digits. Upgrade it once, in the background: the log-in
// screen can accept either form, so the owner is never locked out while this runs.
ensurePinHashes();
// Nobody is signed in at start-up: S.user is filled by a PIN and is deliberately not part of the saved
// book, so closing the app signs you out. The wizard only comes after the log-in, so a new phone asks for
// the administrator PIN before it asks anything about the business.
if(USERS.length&&!S.user)S.screen='login';
else if(window.PERSIST&&!SET.done)wzInit();
render();
// A daily snapshot, taken after the screen is up so it never delays opening the app. The once-a-day rule lives
// in maybeAutoBackup(), not here.
setTimeout(function(){try{maybeAutoBackup()}catch(e){}},1500);
// If this device is signed in to a cloud project, see whether another device has saved a newer copy. A conflict
// is reported on the Cloud sync screen rather than resolved silently.
setTimeout(function(){try{if(typeof cloudBoot==='function')cloudBoot()}catch(e){}},2200);
// A phone app is often left open for days, so the daily snapshot is also reconsidered whenever the app comes
// back to the foreground - the rule itself lives in maybeAutoBackup().
document.addEventListener('visibilitychange',function(){if(!document.hidden){try{maybeAutoBackup()}catch(e){}}});
