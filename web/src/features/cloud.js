// features/cloud.js - the Cloud sync screen: project settings, sign-in, and choosing which copy wins a conflict.
// All the network and version rules are in platform/cloud.js; this file only draws them and reports what happened.
async function openCloud(){S.screen='cl';S.cloudErr='';render();
  if(!cloudConfigured()||!cloudSignedIn())return;
  try{await cloudEnsureBook();S.cloudRemote=await cloudPull();S.cloudState=cloudVersionState(cloudMeta(),S.cloudRemote?S.cloudRemote.version:0)}
  catch(e){S.cloudErr=e.message}
  render()}

function clScr(){const cfg=cloudCfg(),auth=cloudAuth(),meta=cloudMeta(),r=S.cloudRemote;
 const status=!cfg?'setup':!auth?'signin':'ready';
 return `<div class="scr full"><div class="top"><button class="ic" onclick="S.screen='st';render()">‹</button><h1>Cloud sync</h1><span style="width:38px"></span></div>
 ${S.cloudErr?'<div class="alert a2" style="margin-bottom:10px">'+S.cloudErr+'</div>':''}
 ${status==='setup'?`<div class="card"><div class="t">Connect a Supabase project</div><div class="lbl sm" style="margin:6px 0 10px">Create a free project at supabase.com, open its SQL editor and run <b>db/supabase.sql</b>, then paste the Project URL and the <b>anon</b> key from Project Settings → API. The anon key is public by design; row-level security is what protects the data.</div>
  <div class="f"><label class="w"><small>Project URL</small><input id="cu" placeholder="https://xxxx.supabase.co" value="${cfg?cfg.url:''}"></label>
  <label class="w"><small>Anon key</small><input id="ck" placeholder="eyJhbGci..." value="${cfg?cfg.key:''}"></label></div>
  <button class="btn p" style="width:100%;flex:none;margin-top:10px" onclick="clSaveCfg()">Save and continue</button>
  <div class="lbl sm" style="margin-top:10px">Without this the app works exactly as before, entirely on this device.</div></div>`:''}
 ${status==='signin'?`<div class="card"><div class="t">Sign in for ${cfg.url.replace(/^https?:\/\//,'')}</div>
  <div class="f" style="margin-top:10px"><label class="w"><small>Email</small><input id="ce" type="email" autocomplete="username"></label>
  <label class="w"><small>Password</small><input id="cp" type="password" autocomplete="current-password"></label></div>
  <div style="display:flex;gap:10px;margin-top:10px"><button class="btn" onclick="clSignUp()">Create account</button><button class="btn p" onclick="clSignIn()">Sign in</button></div>
  <div class="lbl sm" style="margin-top:10px">This account is for sync only. The PIN still unlocks the book on each device. If your project asks for email confirmation, confirm it before signing in.</div>
  <button class="ut" style="margin-top:12px" onclick="clForgetCfg()">Change project</button></div>`:''}
 ${status==='ready'?`<div class="card"><div class="t">${auth.email||'Signed in'}</div>
  <div class="lbl sm" style="margin-top:6px">Server version ${r?r.version:'-'} · this device ${meta.version||0}${meta.dirty?' · changes waiting':''}</div>
  <div class="lbl sm">Last sync ${meta.lastSync?new Date(meta.lastSync).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'never'}</div>
  <div style="display:flex;gap:10px;margin-top:12px"><button class="btn p" onclick="clSyncNow()">Sync now</button><button class="btn" onclick="clUseRemote()">Use cloud copy</button></div>
  <button class="ut" style="margin-top:10px;background:var(--bad);color:#fff" onclick="clKeepLocal()">Upload this device's copy</button>
  <div class="lbl sm" style="margin-top:10px">The book is sent as the same JSON the app saves, readable by the project owner and by Supabase. It is protected by row-level security in transit and at rest, not encrypted end to end.</div></div>
  ${S.cloudState==='conflict'?'<div class="alert a2" style="margin-top:10px">Another device saved a newer copy while this one had unsaved changes. Choose which copy to keep — the losing copy is kept as a local snapshot first.</div>':''}
  <button class="row" style="margin-top:12px" onclick="cloudSignOut().then(()=>openCloud())"><span class="grow t red">Sign out of sync</span><span class="lbl">${auth.email||''}</span></button>
  <button class="row" onclick="clForgetCfg()"><span class="grow t">Change project</span></button>`:''}
 </div>`}

const clSaveCfg=()=>{const u=$('#cu')?$('#cu').value.trim():'',k=$('#ck')?$('#ck').value.trim():'';
 if(!/^https?:\/\//.test(u)||!k){toast('Enter the project URL and the anon key');return}
 cloudSaveCfg(u,k);openCloud()};
const clForgetCfg=()=>{try{localStorage.removeItem(CLOUD_CFG_KEY);localStorage.removeItem(CLOUD_AUTH_KEY)}catch(e){}S.screen='cl';render()};
async function clSignIn(){try{await cloudSignIn($('#ce').value.trim(),$('#cp').value);await cloudEnsureBook();await openCloud();toast('Signed in')}catch(e){toast(e.message)}}
async function clSignUp(){try{const r=await cloudSignUp($('#ce').value.trim(),$('#cp').value);if(r.confirm){toast('Check your email, confirm the account, then sign in');return}await cloudEnsureBook();await openCloud();toast('Account created')}catch(e){toast(e.message)}}
async function clSyncNow(){try{const r=await cloudSync();if(r.conflict){S.cloudConflict=true;S.cloudState='conflict';toast('Another device has a newer copy — choose below')}else if(r.off){toast('Cloud sync is not set up')}else toast('Synced');await openCloud()}catch(e){toast(e.message)}}
async function clKeepLocal(){try{const r=await cloudSync({keepLocal:true});if(r.conflict){toast('The server moved again — try once more')}else{S.cloudConflict=false;toast('This device\'s copy was uploaded')}await openCloud()}catch(e){toast(e.message)}}
async function clUseRemote(){try{const row=await cloudPull();if(!row){toast('Nothing on the server yet');return}
 await snapshotBook('before cloud download');await cloudApplyRemote(row);save();S.cloudConflict=false;S.screen=null;S.tab='dash';render();toast('Cloud copy downloaded and checked')}catch(e){toast(e.message)}}
