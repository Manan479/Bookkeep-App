// features/users.js - signing in, and the users screen. The rules live in core/users.js.
const DEFAULT_PIN='1234';
const defaultPin=()=>USERS.some(u=>u.role==='admin'&&(String(u.pin)===DEFAULT_PIN||u.wasDefault));
function loginScr(){const u=USERS.filter(x=>x.active!==false);
 // One centred column, so the title, the fields, the button and the small notes all share the same edges on a
 // desktop. Before this the notes were left-aligned against the window while the card sat in the middle.
 return `<div class="scr"><div class="auth"><div class="top"><h1>Sign in</h1><span style="width:38px"></span></div>
 <div class="card" style="margin-bottom:12px"><div class="t">${COMP.name}</div><div class="lbl sm">Enter your PIN to open the books.</div></div>
 ${u.length?`<div class="f"><label class="w"><small>User</small><select id="lu">${u.map(x=>`<option value="${docAttr(x.id||x.n)}" ${S.lu===(x.id||x.n)?'selected':''}>${x.n} · ${ROLE_LABEL[x.role]||x.role}</option>`).join('')}</select></label>
 <label class="w"><small>PIN</small><input id="lp" type="password" inputmode="numeric" placeholder="••••" onkeydown="if(event.key==='Enter')tryPin()"></label></div>
 <button class="btn p" style="width:100%;flex:none;margin-top:12px" onclick="tryPin()">Sign in</button>
 ${defaultPin()?`<div class="lbl sm" style="margin-top:12px;text-align:center">First run: the administrator PIN is ${DEFAULT_PIN}. Change it under Users once you are in.</div>`:''}
 <button class="ut" style="display:block;margin:14px auto 0" onclick="forgotPin()">Can\'t sign in?</button>`
 :'<div class="card lbl">No users yet. This should not happen — reopen the app, or reset the data from Settings.</div>'}
 </div></div>`}
async function tryPin(){const s=$('#lu'),p=$('#lp')?$('#lp').value:'';
 // The select's value is the user's id, but fall back to the name in front of the " · role" label, so a book
 // saved by an older build cannot leave the owner locked out.
 const key=s?String(s.value||'').split(' · ')[0]:'';
 const u=userBy(key)||USERS.filter(x=>x.active!==false)[0];
 if(!u){toast('There is no user to sign in as');return}
 // The PIN is hashed, so the check is asynchronous; the old synchronous signIn cannot verify a hash.
 const r=await signInHashed(u.id,p);
 if(!r.ok){toast(r.reason);return}
 S.screen=null;render();toast('Signed in as '+S.user.n)}
// Losing the PIN must not lose the books. Anyone holding the phone could clear this anyway - the PIN keeps
// out a casual user, not the owner - so the honest thing is to offer it rather than pretend otherwise.
const forgotPin=()=>confirmSheet('Remove the sign-in lock?','Every user on this device will be deleted and the books will open without a PIN. Add them again under Settings, Users.','Remove it',()=>{USERS.length=0;S.user=null;S.screen=null;render();toast('Sign-in lock removed')});
const noAccess=()=>`<div class="scr"><div class="top"><button class="ic" onclick="go('dash');render()">‹</button><h1>Not allowed</h1><span style="width:38px"></span></div><div class="card" style="text-align:center;padding:30px"><div style="font-size:30px">🔒</div><div class="t">${S.user?S.user.n:'This user'} cannot open this screen</div><div class="lbl">An administrator can change your role under Users.</div></div></div>`;
function usersScr(){return `<div class="scr full"><div class="top"><button class="ic" onclick="S.screen='st';render()">‹</button><h1>Users</h1><button class="ic" onclick="userForm(-1)">+</button></div>
 <div class="lbl sm" style="padding:0 4px 10px">Signed in as ${S.user?S.user.n+' · '+(ROLE_LABEL[S.user.role]||S.user.role):'-'}. The book is kept on this device, so a PIN keeps out a casual user, not somebody who owns the phone.</div>
 ${USERS.map((u,k)=>`<button class="row" onclick="userForm(${k})"><div class="grow"><div class="t">${u.n}${S.user&&S.user.n===u.n?' · you':''}</div><div class="lbl sm">${ROLE_LABEL[u.role]||u.role}${u.active===false?' · cannot sign in':''}</div></div><span>›</span></button>`).join('')||'<div class="card lbl">No users yet. Add one with +.</div>'}
 <div class="gh"><b>What each role can open</b></div>
 ${ROLES.map(r=>`<div class="card" style="margin-bottom:8px"><div class="t">${ROLE_LABEL[r]}</div><div class="lbl sm">${(CAPS[r]||[]).map(c=>CAP_LABEL[c]||c).join(' · ')}</div></div>`).join('')}
 <button class="row" onclick="signOut();render()"><span class="grow t red">Sign out</span></button></div>`}
function userForm(k){const u=k<0?{n:'',role:'cashier',pin:'',active:true}:USERS[k];if(!u)return;
 const o=document.createElement('div');o.className='ov';
 o.innerHTML=`<div class="sheet"><div class="grab"></div><b style="font-size:17px">${k<0?'Add user':'Edit user'}</b>
 <div class="f" style="margin-top:10px"><label class="w"><small>Name</small><input id="un" value="${docAttr(u.n)}"></label>
 <label class="w"><small>Role</small><select id="ur">${ROLES.map(r=>`<option value="${docAttr(r)}" ${u.role===r?'selected':''}>${ROLE_LABEL[r]}</option>`).join('')}</select></label>
 <label class="w"><small>PIN</small><input id="up" inputmode="numeric" value="${docAttr(u.pin||'')}" placeholder="${u.pinHash?'Leave blank to keep it':'New PIN'}"></label>
 <label class="w"><small>Can sign in</small><select id="ua"><option value="1" ${u.active!==false?'selected':''}>Yes</option><option value="0" ${u.active===false?'selected':''}>No</option></select></label></div>
 <div class="lbl sm" style="margin-top:8px">The PIN is saved as a hash, not the digits. It still keeps out a casual user, not somebody who owns the phone and copies the saved file.</div>
 <div class="bar-row" style="margin-top:12px">${k<0?'':'<button class="btn" id="ud" style="background:var(--bad);border-color:var(--bad);color:#fff">Delete</button>'}<button class="btn" id="uc">Cancel</button><button class="btn p" id="us">Save</button></div></div>`;
 o.onclick=e=>{if(e.target===o)o.remove()};$('#app').append(o);
 $('#uc').onclick=()=>o.remove();
 if(k>=0)$('#ud').onclick=()=>{const bad=delProblem(k);if(bad){toast(bad);return}delUser(k);o.remove();render()};
 $('#us').onclick=async()=>{const pin=$('#up').value.trim(),r={n:$('#un').value,role:$('#ur').value,active:$('#ua').value==='1'};
  if(pin)r.pin=pin;
  else if(k<0&&!pin){toast('Set a PIN');return}
  const bad=userProblem(k,r);
  if(bad){toast(bad);return}
  if(pin){
    // Hash before saving, so the digits never reach the saved book. If the browser has no WebCrypto the plain
    // form is stored and the boot sweep upgrades it on the next launch.
    if(pinCrypto()){try{const s=pinSalt();r.pinHash=await pinHash(pin,s);r.pinSalt=s;r.pinAlgo=PIN_ALGO;r.wasDefault=pin===DEFAULT_PIN;delete r.pin}catch(e){}}
    else r.wasDefault=pin===DEFAULT_PIN;
  }
  saveUser(k,r);o.remove();render();toast('User saved')}}
