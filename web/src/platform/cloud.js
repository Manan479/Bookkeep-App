// platform/cloud.js - optional sync between devices through a Supabase project.
//
// The model is deliberately small for the first step: the server holds ONE row per book with the same JSON the
// app already saves, plus a version number. A device may only write if the version it last read is still the
// current one; otherwise the write is refused and the user chooses which copy to keep. That is what stops two
// devices silently overwriting each other's invoices.
//
// Nothing here is required to use the app: with no configuration every function returns early, and the book
// stays exactly as it is on the device.
const CLOUD_CFG_KEY='bk_cloud_cfg', CLOUD_AUTH_KEY='bk_cloud_auth', CLOUD_BOOK_KEY='bk_cloud_book', CLOUD_META_KEY='bk_cloud_meta';

const cloudRead=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const cloudWrite=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const cloudCfg=()=>cloudRead(CLOUD_CFG_KEY,null);
const cloudSaveCfg=(url,key)=>{cloudWrite(CLOUD_CFG_KEY,{url:String(url||'').replace(/\/+$/,''),key:String(key||'').trim()})};
const cloudAuth=()=>cloudRead(CLOUD_AUTH_KEY,null);
const cloudBookId=()=>cloudRead(CLOUD_BOOK_KEY,null);
const cloudMeta=()=>cloudRead(CLOUD_META_KEY,{version:0,dirty:false,lastSync:null});
const cloudSetMeta=m=>cloudWrite(CLOUD_META_KEY,m);
const cloudConfigured=()=>{const c=cloudCfg();return !!(c&&c.url&&c.key)};
const cloudSignedIn=()=>{const a=cloudAuth();return !!(a&&a.access_token&&a.user_id)};

// The decision table is pure and tested: same version and clean means do nothing; a newer server with a dirty
// local copy is a conflict, never a guess.
function cloudVersionState(meta,remoteVersion){
  const base=(meta&&meta.version)||0, dirty=!!(meta&&meta.dirty), rv=Number(remoteVersion)||0;
  if(rv>base)return dirty?'conflict':'pull';
  if(rv<base)return 'push';
  return dirty?'push':'same';
}

function cloudJwtSub(t){try{return JSON.parse(atob(String(t).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub}catch(e){return null}}

async function cloudApi(path,opts){
  const c=cloudCfg(),a=cloudAuth();
  if(!c)throw new Error('No cloud project configured');
  const o=Object.assign({},opts||{});
  o.headers=Object.assign({'apikey':c.key,'Content-Type':'application/json'},o.headers||{});
  o.headers.Authorization='Bearer '+((a&&a.access_token)||c.key);
  const r=await fetch(c.url+path,o);
  const text=await r.text();
  let body=null;try{body=text?JSON.parse(text):null}catch(e){body=text}
  if(!r.ok)throw new Error((body&&(body.message||body.error_description||body.msg||body.hint))||('HTTP '+r.status));
  return body;
}

async function cloudSignIn(email,password){
  const c=cloudCfg();if(!c)throw new Error('No cloud project configured');
  const r=await fetch(c.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'apikey':c.key,'Content-Type':'application/json'},body:JSON.stringify({email:email,password:password})});
  const b=await r.json();
  if(!r.ok)throw new Error(b.error_description||b.msg||'Sign-in failed');
  cloudWrite(CLOUD_AUTH_KEY,{access_token:b.access_token,refresh_token:b.refresh_token,expires_at:Date.now()+(b.expires_in||3600)*1000,user_id:(b.user&&b.user.id)||cloudJwtSub(b.access_token),email:(b.user&&b.user.email)||email});
  return cloudAuth();
}
async function cloudSignUp(email,password){
  const c=cloudCfg();if(!c)throw new Error('No cloud project configured');
  const r=await fetch(c.url+'/auth/v1/signup',{method:'POST',headers:{'apikey':c.key,'Content-Type':'application/json'},body:JSON.stringify({email:email,password:password})});
  const b=await r.json();
  if(!r.ok)throw new Error(b.msg||b.error_description||'Could not create the account');
  // With email confirmation switched on there is no session yet; say so instead of pretending.
  if(!b.access_token)return {confirm:true};
  cloudWrite(CLOUD_AUTH_KEY,{access_token:b.access_token,refresh_token:b.refresh_token,expires_at:Date.now()+(b.expires_in||3600)*1000,user_id:(b.user&&b.user.id)||cloudJwtSub(b.access_token),email:(b.user&&b.user.email)||email});
  return {confirm:false};
}
async function cloudSignOut(){
  try{await cloudApi('/auth/v1/logout',{method:'POST'})}catch(e){}
  try{localStorage.removeItem(CLOUD_AUTH_KEY)}catch(e){}
}
// Access tokens last an hour; refresh rather than making the user sign in again.
async function cloudFreshToken(){
  const c=cloudCfg(),a=cloudAuth();
  if(!c||!a)return null;
  if(a.expires_at&&a.expires_at>Date.now()+60000)return a.access_token;
  if(!a.refresh_token)return a.access_token;
  try{
    const r=await fetch(c.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':c.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:a.refresh_token})});
    const b=await r.json();if(!r.ok)throw new Error(b.error_description||'refresh failed');
    const na=Object.assign({},a,{access_token:b.access_token,refresh_token:b.refresh_token||a.refresh_token,expires_at:Date.now()+(b.expires_in||3600)*1000});
    cloudWrite(CLOUD_AUTH_KEY,na);return na.access_token;
  }catch(e){return a.access_token}
}

async function cloudEnsureBook(name){
  if(cloudBookId())return cloudBookId();
  // The second device has no book id yet: adopt the account's existing book rather than making a second one.
  const list=await cloudApi('/rest/v1/sync_books?select=id,name&order=created_at.asc');
  if(list&&list.length){cloudWrite(CLOUD_BOOK_KEY,list[0].id);return list[0].id}
  const id=await cloudApi('/rest/v1/rpc/create_sync_book',{method:'POST',body:JSON.stringify({p_name:name||COMP.name||'My books'})});
  if(id)cloudWrite(CLOUD_BOOK_KEY,id);
  return id;
}
async function cloudPull(){
  const id=cloudBookId();if(!id)return null;
  const rows=await cloudApi('/rest/v1/sync_state?book_id=eq.'+id+'&select=version,payload,updated_at,device_id');
  return rows&&rows[0]?rows[0]:null;
}
async function cloudPush(force){
  const id=cloudBookId();if(!id)throw new Error('No book chosen');
  const m=cloudMeta(),a=cloudAuth();
  const base=force!=null?force:m.version;
  const payload=JSON.parse(backupJSON());
  const rows=await cloudApi('/rest/v1/sync_state?book_id=eq.'+id+'&version=eq.'+base,{
    method:'PATCH',
    headers:{'Prefer':'return=representation'},
    body:JSON.stringify({version:base+1,payload:payload,updated_by:a&&a.user_id,device_id:cloudDeviceId()})});
  if(!rows||!rows.length)return {ok:false,conflict:true};
  cloudSetMeta({version:base+1,dirty:false,lastSync:Date.now(),hash:cloudHash(backupJSON())});
  return {ok:true,version:base+1};
}
const cloudDeviceId=()=>{let d=cloudRead('bk_device_id',null);if(!d){d='dev-'+Math.random().toString(36).slice(2,10);cloudWrite('bk_device_id',d)}return d};
// save() runs after every render, so "dirty" cannot mean "save ran". A cheap hash of the saved payload decides
// whether anything actually changed; without it every screen would upload the book every couple of seconds.
function cloudHash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return s.length+'-'+h}

// Apply the server's copy locally without the save that follows being mistaken for a local edit.
async function cloudApplyRemote(row){
  window._cloudApplying=true;
  try{applyStore(row.payload);ensurePinHashes();cloudSetMeta({version:Number(row.version)||0,dirty:false,lastSync:Date.now(),hash:cloudHash(backupJSON())});theme(S.theme||'system')}
  finally{setTimeout(function(){window._cloudApplying=false},300)}
}

// The one entry point every screen and save uses. It never overwrites silently: a newer server row with local
// edits outstanding is reported as a conflict for the user to settle.
async function cloudSync(opts){
  opts=opts||{};
  if(!cloudConfigured()||!cloudSignedIn())return {ok:false,off:true};
  await cloudFreshToken();
  await cloudEnsureBook();
  const remote=await cloudPull();
  if(!remote)return {ok:false,reason:'No cloud copy yet'};
  const m=cloudMeta(),state=cloudVersionState(m,remote.version);
  if(state==='same'&&!opts.force)return {ok:true,state:'same'};
  if(state==='pull'){
    // Never replace the book under somebody's hands: a background pull waits until they leave the form.
    if(opts.auto&&['inv','pay','exp','cust','jf','tfr','prod','wz','users','pmf','rtf','exf','stmt'].indexOf(S.screen)>=0)return {ok:false,pendingUpdate:true};
    await cloudApplyRemote(remote);render();return {ok:true,state:'pull',version:remote.version}}
  if(state==='conflict'&&!opts.force&&!opts.keepLocal)return {ok:false,conflict:true,remoteVersion:remote.version,localVersion:m.version};
  const push=await cloudPush(opts.keepLocal?remote.version:(state==='push'?m.version:remote.version));
  if(push.conflict)return {ok:false,conflict:true,remoteVersion:remote.version,localVersion:m.version};
  return {ok:true,state:'push',version:push.version};
}

// Called from save(). Debounced so typing in a form does not upload on every keystroke.
let cloudTimer=null;
function cloudTouch(){
  if(!cloudConfigured()||!cloudSignedIn()||window._cloudApplying)return;
  const m=cloudMeta();
  if(m.hash&&m.hash===cloudHash(backupJSON()))return;   // save() ran, but the book is byte-for-byte the same
  m.dirty=true;cloudSetMeta(m);
  clearTimeout(cloudTimer);
  cloudTimer=setTimeout(function(){cloudSync().catch(function(e){try{toast('Cloud sync: '+e.message)}catch(_){}})},1500);
}
async function cloudBoot(){
  if(!cloudConfigured()||!cloudSignedIn())return;
  try{await cloudSync({auto:true})}catch(e){}
}
