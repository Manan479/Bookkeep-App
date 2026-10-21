// app/router.js - Screen routing, render loop and the Android back button.
const go=t=>{S.tab=t;S.screen=null;S.q='';S.sel=null;tick();render()};
const openScr=(s,t)=>{if(s==='pl'){openProfit();return}S.addStamp=false;S.addSignature=false;S.invoiceStamp='';S.invoiceSignature='';S.posted=false;S.screen=s;S.items=null;S.paid=0;S.cust='';S.itype=t||'sale';S.dsel='';S.dcust='';S.sup='';S.editNo=null;S.editPosted=false;S.fromQ='';S.showBal=undefined;S.under=S.under||'Distributor';S.noDue=false;S.short=null;S.d.inv=tdy;S.d.due=plus(tdy,t==='qt'?30:14);S.sel=null;render()};
const BK={inv:()=>invCloseAsk(),record:()=>{S.screen=S.recordKind==='tf'?'cb':'stfp';render()},pl:()=>profitBack(),cust:()=>custBack(),prev:()=>prevBack(),pmf:()=>pmBack(),rtf:()=>rtBack(),dd:()=>{S.screen='dl';render()},pd:()=>{S.screen='pt';render()},pmd:()=>{S.screen='pm';render()},rtd:()=>{S.screen='rt';render()},exf:()=>expenseBack(),exd:()=>{S.screen='ex';render()},qd:()=>{S.screen='qt';render()},cbd:()=>{S.screen='cb';render()},tfr:()=>{S.screen='cb';render()},jf:()=>{S.screen='jl';render()},jd:()=>{S.screen='jl';render()},rpt:()=>{S.screen='rp';render()},ac:()=>{S.screen='rp';render()},acd:()=>{S.screen='ac';render()},users:()=>{S.screen='st';render()},batch:()=>{S.screen=null;render()},th:()=>{S.screen=null;render()},bk:()=>{S.screen='st';render()},cl:()=>{S.screen='st';render()},stf:()=>{S.screen=null;render()},stfp:()=>{S.screen='stf';render()},skd:()=>{S.screen='stfp';render()},stmt:()=>{S.screen=S.stBack||'pd';render()},wz:()=>{}};
window.appBack=()=>{const ov=document.querySelector('.ov:not(.off)');if(ov){const off=()=>{ov.remove()};if(ov.classList.contains('off')){off();return true}ov.classList.add('off');setTimeout(off,200);return true}if(selMode()){selClear();return true}if(S.screen){const f=BK[S.screen];if(f){f();return true}S.screen=null;render();return true}if(S.tab!=='dash'){go('dash');return true}return false};
// Positions belong to the displayed route, not the next route already assigned in S.
const routeScrollMemory=new Map();
let desktopNavScroll=0;
function scrollRouteKey(){const sc=S.screen||'tab:'+S.tab;const detail=({rpt:S.rpk,pd:S.pk&&S.pk.n,pmd:S.pmk&&S.pmk.id,qd:S.qk,cbd:S.ac,acd:S.acct,dd:S.di,stfp:S.stfk,inv:S.editNo,prod:S.pi,jd:S.jk&&S.jk.id,rtd:S.rk&&S.rk.id,stmt:S.stn})[S.screen];return sc+(detail!=null?':'+detail:'')}
function render(skel,soft){lpUp();applyAccent();applyLang();const a=$('#app');
// The figures on screen now, in order, so a soft render can move from the old value to the new one instead of
// snapping. Read before the screen is torn down; it is the only place the previous numbers still exist.
let focused=null;try{const e=document.activeElement;if(soft&&e&&a.contains(e)&&e.matches('input,textarea')){focused={id:e.id,index:[...a.querySelectorAll('input,textarea')].indexOf(e),start:e.selectionStart,end:e.selectionEnd}}}catch(e){}
let prevN=[];try{prevN=[...a.querySelectorAll('[data-n]')].map(e=>+e.dataset.n||0)}catch(e){}
// Where the page and each horizontal filter row were scrolled to. A soft render rebuilds the screen, and a
// rebuilt element starts at zero - so tapping a filter used to jump both chip rows back to their left edge.
let prevChips=[],prevTop=0,previousRoute=null;try{prevChips=[...a.querySelectorAll('.chips')].map(c=>c.scrollLeft);const cur=a.querySelector('.scr');if(cur){previousRoute=cur.dataset.scrollRoute;prevTop=cur.scrollTop;if(cur.dataset.scrollRoute)routeScrollMemory.set(cur.dataset.scrollRoute,{top:prevTop,chips:prevChips})}const nav=a.querySelector('.desktop-nav');if(nav)desktopNavScroll=nav.scrollTop}catch(e){}
// `.selbar` is in this list for a reason: the selection bar is appended beside the screen, not inside it, so
// leaving it out left one bar behind on every render - and Cancel drew a screen with no bar while an old one
// stayed on top, which reads as "the bar is stuck".
a.querySelectorAll('.scr,.fab,.tabs,.bar-act,.ok,.selbar').forEach(e=>e.remove());
// Nothing is drawn except the log-in screen until somebody signs in, and a role that cannot open a screen is
// told so here, in one place, rather than every feature having to remember to check. The rules are in
// core/users.js; an install with no users is ungated.
S.screen=gateScreen();
// Every navigation path (including direct assignments and entity changes) ends list selection.
if(S.sel){if(previousRoute&&previousRoute!==scrollRouteKey())S.sel=null;if(S.sel&&selAt()!==(S.screen||S.tab))S.sel=null}
const sc=S.screen,ok=screenAllowed();let body;try{body=!ok?noAccess():sc==='record'?cashRecordScreen():sc==='login'?loginScr():sc==='users'?usersScr():sc==='stf'?stfScr():sc==='stfp'?stfPageScr():sc==='skd'?skdScr():sc==='th'?thScr():sc==='lg'?lgScr():sc==='bk'?bkScr():sc==='cl'?clScr():sc==='batch'?batchScr():sc==='inv'?inv():sc==='prod'?prodForm():sc==='pay'?payScr():sc==='cust'?custScr():sc==='dl'?distList():sc==='dd'?distDet():sc==='pt'?ptScr():sc==='pd'?pdScr():sc==='co'?coScr():sc==='tp'?tpScr():sc==='st'?stScr():sc==='wz'?wzScr():sc==='rp'?rpScr():sc==='rpt'?rptScr():sc==='ac'?acScr():sc==='acd'?acdScr():sc==='stmt'?stmtScr():sc==='nt'?ntScr():sc==='jl'?jlScr():sc==='jf'?jfScr():sc==='jd'?jdScr():sc==='ex'?exScr():sc==='exf'?exfScr():sc==='exd'?exdScr():sc==='qt'?qtScr():sc==='qd'?qdScr():sc==='cb'?cbScr():sc==='cbd'?cbdScr():sc==='tfr'?tfrScr():sc==='rt'?rtScr():sc==='rtf'?rtfScr():sc==='rtd'?rtdScr():sc==='pm'?pmScr():sc==='pmf'?pmfScr():sc==='pmd'?pmdScr():sc==='prev'?prev():sc==='pl'?pl():({dash,sales:()=>list(INV,'Sales','New Invoice'),pur:()=>list(PUR,'Purchases','New Purchase'),inv:inventory,more})[S.tab]()}catch(err){body=screenError(sc||S.tab,err)}
const routeKey=scrollRouteKey(),remembered=routeScrollMemory.get(routeKey),sy=remembered?remembered.top:0;
const put=()=>{const chipTap=!!S.pop;let bar='';try{bar=selBar()}catch(e){}try{a.classList.toggle('selon',bar!=='')}catch(e){}
// Desktop keeps its sidebar inside modules; phone forms keep their full width without bottom tabs.
const navigation=sc==='login'||sc==='wz'?'':tabs(!sc);
try{a.classList.toggle('hasnav',!!navigation)}catch(e){}
// Forms and text-led detail screens need a readable column even when the sidebar stays open.
const boundedRoutes=['inv','prod','pmf','exf','rtf','tfr','jf','co','tp','st','cl','wz','jd','exd','pmd','qd','rtd','stfp','pd','dd'];
a.classList.toggle('bounded-workspace',boundedRoutes.includes(sc));
a.insertAdjacentHTML('beforeend',body+bar+navigation);a.querySelectorAll('.scr .bar-act').forEach(toolbar=>a.append(toolbar));const actionBar=a.querySelector(':scope > .bar-act');a.classList.toggle('has-actions',!!actionBar);a.style.setProperty('--action-bar-height',actionBar?actionBar.offsetHeight+'px':'0px');mountRegisterActions();syncSel();syncUiIcons();const s=$('.scr');
// A chip tap is a content change worth animating, so the rows are allowed to play their entrance. Typing in a
// search box is the same soft render and must stay perfectly still under the thumb, which is what `still` is for.
if(s){s.dataset.scrollRoute=routeKey;if(soft){s.style.animation='none';if(!chipTap)s.classList.add('still')}}
// Put the chip rows back where they were, then let them decide which edges deserve a fade.
try{const cs=[...a.querySelectorAll('.chips')];if(remembered)cs.forEach((c,i)=>{if(remembered.chips[i]!=null)c.scrollLeft=remembered.chips[i]})}catch(e){}
try{chipFades()}catch(e){}
try{document.querySelectorAll('.ic').forEach(b=>b.classList.toggle('flip',isRTL()&&b.textContent.trim()==='‹'))}catch(e){}
try{headsStuck()}catch(e){}
countUp(soft,prevN);grow(soft&&!chipTap);S.pop=null;layoutAppChrome();fitPaper();if(focused){const e=focused.id?document.getElementById(focused.id):a.querySelectorAll('input,textarea')[focused.index];if(e){e.focus({preventScroll:true});try{if(focused.start!==null)e.setSelectionRange(focused.start,focused.end)}catch(error){}}}if(s)s.scrollTop=sy;const nav=a.querySelector('.desktop-nav');if(nav)nav.scrollTop=desktopNavScroll;try{headsStuck()}catch(e){}if(window.saveNow)window.saveNow()};
if(skel){a.insertAdjacentHTML('beforeend','<div class="scr">'+'<div class="skel"></div>'.repeat(5)+'</div>');setTimeout(()=>{a.querySelector('.scr').remove();put()},350)}else put()}
