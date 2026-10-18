// ui/kit.js - Shared screen pieces: toast, sheets, calendar, pickers, charts, print fitting.
const $=s=>document.querySelector(s);
// Wire a button that lives inside a freshly built overlay. Every overlay in the app uses the same ids ('o1',
// 'cc', 'wo'...), so looking them up document-wide finds an OLD overlay that is still on the page and gives
// its button the handler instead - which leaves the new one on top and completely dead. Scope the lookup to
// the node, and fall back to the document only for the fake browser in tests/, where querySelector returns
// nothing. `okOverlay` also clears any stale overlay before drawing, and render() sweeps them up.
const wire=(o,id,fn)=>{const e=(o.querySelector&&o.querySelector(id))||$(id);if(e)e.onclick=fn};
const toast=m=>{if(S.quiet)return;const t=document.createElement('div');t.className='toast';t.textContent=m;$('#app').append(t);setTimeout(()=>t.remove(),1800)};
const tick=k=>{try{const n=Date.now();if(window._lt&&n-window._lt<50)return;window._lt=n;if(window.Haptics)window.Haptics.tick(k||'tick');else if(navigator.vibrate)navigator.vibrate(6)}catch(e){}};
// ---- closing a popup ----------------------------------------------------------------------------------
// A sheet used to disappear the instant it was dismissed. Every overlay is taken off the page with
// o.remove(), from a dozen different screens, so the animation is installed once here instead: an overlay
// that is being removed is marked .off first, the CSS plays the fade and the slide-down, and the element
// leaves a moment later. Nothing else in the app has to know.
(function(){try{
 const rm=Element.prototype.remove;
 Element.prototype.remove=function(){
  const cls=this.classList;
  if(cls&&(cls.contains('ov')||cls.contains('ok'))&&!this._leaving){
   this._leaving=1;cls.add('off');
   const el=this;setTimeout(()=>{try{rm.call(el)}catch(e){}},210);
   return}
  return rm.call(this)};
}catch(e){}})();
function theme(t){S.theme=t;t==='system'?document.documentElement.removeAttribute('data-theme'):document.documentElement.setAttribute('data-theme',t);applyAccent()}
// ---- the accent colour --------------------------------------------------------------------------------
// One colour the shop picks. It drives the buttons, the tab bar and the printed documents alike: the theme's
// --pr, and the two colours derived from it so nothing becomes unreadable. --prt is a tint for backgrounds
// and --onpr is the text that sits ON the colour, chosen by how light it is - a pale accent with white text
// is the usual way this goes wrong. A dark theme lightens the accent a little, or a deep green vanishes
// against a dark background.
// A spectrum rather than a handful of presets: the same colour wheel the eye expects, so picking one is a
// case of pointing at it. The last circle in the picker is the full colour chooser for anything not here.
const ACCENTS=[['#2B5FBF','Blue'],['#2196F3','Azure'],['#00BCD4','Cyan'],['#00BFA5','Teal'],['#00C853','Emerald'],['#2E7D32','Green'],['#3F51B5','Indigo'],['#7C4DFF','Violet'],['#D500F9','Magenta'],['#E91E63','Pink'],['#D23B3B','Red'],['#607D8B','Slate']];
const hex2rgb=h=>{const s=String(h||'').replace('#',''),v=s.length===3?s.split('').map(c=>c+c).join(''):(s+'000000').slice(0,6);
 return [parseInt(v.slice(0,2),16)||0,parseInt(v.slice(2,4),16)||0,parseInt(v.slice(4,6),16)||0]};
const rgb2hex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const shade=(h,f)=>{const a=hex2rgb(h);return a.map(v=>f>0?v+(255-v)*f:v*(1+f))};
const lightOn=h=>{const a=hex2rgb(h);return (0.299*a[0]+0.587*a[1]+0.114*a[2])>150};
const isDarkNow=()=>{const r=document.documentElement;
 return r.getAttribute('data-theme')==='dark'||(!r.getAttribute('data-theme')&&typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme:dark)').matches)};
function applyAccent(){try{const a=TPL.accent||'#0F5B3F',r=document.documentElement,dark=isDarkNow();
 const pr=dark?rgb2hex(shade(a,.4)):a,tint=dark?('rgba('+hex2rgb(pr).join(',')+',.16)'):rgb2hex(shade(a,.86));
 r.style.setProperty('--pr',pr);
 r.style.setProperty('--prt',tint);
 r.style.setProperty('--onpr',lightOn(pr)?'#06190F':'#ffffff');
 r.style.setProperty('--bar2',rgb2hex(shade(a,dark?.5:.5)))}catch(e){}}
const setAccent=h=>{TPL.accent=h;applyAccent();save();render();toast('Accent colour saved')};
const accentName=()=>{const a=String(TPL.accent||'').toLowerCase(),f=ACCENTS.filter(x=>x[0].toLowerCase()===a)[0];return f?f[1]:'Your colour'};
// The count-up is for opening a screen. On a soft render (a filter tap, typing in the search box) the cards stay
// put and only the figures change, so they tween from what was there before - counting up from zero made a
// filter look like the page reloading.
function countUp(instant,prev){document.querySelectorAll('[data-n]').forEach((e,i)=>{const n=+e.dataset.n;
  if(!instant){const s=performance.now();(function f(t){const p=Math.min(1,(t-s)/700);e.textContent=fmt(n*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(s);return}
  const from=(prev&&prev[i]!=null&&isFinite(prev[i]))?prev[i]:n;
  if(from===n || Math.abs(n-from)<1){e.textContent=fmt(n);return}
  const s=performance.now();(function f(t){const p=Math.min(1,(t-s)/260);e.textContent=fmt(from+(n-from)*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(s)})}
function grow(instant){const set=()=>document.querySelectorAll('.bar').forEach(b=>b.style.height=b.dataset.h+'%');if(instant)set();else setTimeout(set,30)}
function chart(l,v,pv){const m=Math.max(1,...v,...(pv||[0]));return `<div class="chart">${l.map((_,i)=>`<div class="col">${pv?`<div class="bar p" data-h="${pv[i]/m*100}"></div>`:''}<div class="bar" data-h="${v[i]/m*100}"></div></div>`).join('')}</div><div class="xl">${l.map(x=>`<span>${x}</span>`).join('')}</div>`}
// `S.pop` is the value of the chip that was just tapped, set by the chip itself. Only that chip plays the pop:
// every `.chip.on` used to animate on every redraw, so tapping "Paid" made the period chip dance too. It also
// tells the render loop that a filter changed (so the list may animate in) rather than a search box being typed
// into (where replaying row animations under the thumb is exactly what `still` exists to stop).
// A chip shows the translated word but keeps the ENGLISH value in its onclick: the filters compare English values
// ('Paid', 'This Month'), so translating the value would quietly break every filter.
const chips=(arr,cur,fn)=>`<div class="chips">${arr.map(a=>`<button class="chip ${a===cur?'on':''}${a===S.pop?' pop':''}" onclick="S.pop='${a}';${fn}('${a}')">${a==='Custom'&&S.cr&&cur==='Custom'?fmtS(S.cr[0])+' - '+fmtS(S.cr[1]):tr(a)}</button>`).join('')}</div>`;
// Fade only the side the row can actually scroll to. Scroll position is asked for, not guessed, so a row that
// fits on the screen keeps crisp edges. Under RTL the start is the RIGHT edge and scrollLeft runs negative, so
// the sides swap - otherwise the first chip is faded as though it were the last.
function chipFades(){document.querySelectorAll('.chips').forEach(c=>{try{
  const max=c.scrollWidth-c.clientWidth, rtl=isRTL();
  if(max<=2){c.classList.remove('fade-l','fade-r');return}
  const sl=rtl?Math.abs(c.scrollLeft):c.scrollLeft, start=sl<=2, end=sl>=max-2;
  c.classList.toggle('fade-l',rtl?!end:!start);
  c.classList.toggle('fade-r',rtl?!start:!end);
}catch(e){}})}
// A sticky filter band only needs its shadow once rows are actually passing underneath it, which is when its
// top has reached the top of its scrolling screen. Asked of the browser, not guessed from a scroll count.
function headsStuck(){document.querySelectorAll('.shead').forEach(h=>{try{const sc=h.closest('.scr');if(!sc)return;const a=h.getBoundingClientRect(),b=sc.getBoundingClientRect();h.classList.toggle('stuck',a.top<=b.top+1)}catch(e){}})}
const setP=p=>{tick();if(p==='Custom'){pick(null,v=>{S.cr=v.split('|');S.period='Custom';render(false,true)},false,true);return}S.period=p;render(false,true)};
const tabs=()=>`<nav class="tabs">${[['dash','▦','Dashboard'],['sales','🧾','Sales'],['pur','🛒','Purchases'],['inv','📦','Inventory'],['more','⋯','More']].filter(t=>canTab(t[0])).map(t=>`<button class="tab ${S.tab===t[0]&&!S.screen?'on':''}" onclick="go('${t[0]}')"><i>${t[1]}</i>${tr(t[2])}</button>`).join('')}</nav>`;
// The language is a device preference like the theme, saved with the book so it survives a restart. Applying it
// means telling the document which way to read; every screen inherits that, which is why RTL needs so little CSS.
function applyLang(){try{const h=document.documentElement,r=isRTL();h.lang=lang();h.dir=r?'rtl':'ltr';document.body.classList.toggle('ur',r)}catch(e){}}
const setLang=l=>{S.lang=l;save();applyLang();render();toast(l==='ur'?'زبان: اردو':'Language: English')};
// ---- export -----------------------------------------------------------------------------------------
// A screen registers what it is SHOWING as it renders (setExport), and the export button in its header
// writes that out. One shape for every screen, so a new screen gets a working export by calling setExport
// once, and there is no second copy of the data to drift from what is on screen.
const setExport=(title,cols,rows)=>{S.xp={title:title,cols:cols,rows:rows}};
const csvCell=v=>{const s=String(v==null?'':v);return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const csvText=(cols,rows)=>[cols].concat(rows||[]).map(r=>(r||[]).map(csvCell).join(',')).join('\r\n');
// Three ways to save a file, best first:
//   window.Saver      - the Android shell's native "save to..." bridge (see MainActivity.kt)
//   a download        - a desktop browser
//   neither           - the text is offered to copy, because a WebView download silently does nothing
const inShell=()=>!!window.Haptics;
function downloadFile(name,text,mime){
 if(window.Saver&&window.Saver.save){try{window.Saver.save(name,text,mime||'text/csv');return 'ask'}catch(e){return false}}
 if(inShell())return false;
 try{const b=new Blob([text],{type:mime||'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();
  setTimeout(()=>{try{URL.revokeObjectURL(u);a.remove()}catch(e){}},0);return true}catch(e){return false}}
// The shell reports what happened to the "save to..." dialog, so the app never claims a file it did not write.
window.saveResult=ok=>toast(ok?'Saved':'Nothing was saved');
// What a phone gets instead of a saved file: the same text, ready to copy somewhere.
function textSheet(title,name,text){const o=document.createElement('div');o.className='ov';
 o.innerHTML='<div class="sheet"><div class="grab"></div><b style="font-size:17px">'+title+'</b><div class="lbl" style="margin:6px 0 10px">This build cannot save a file on a phone yet. Copy this ('+name+') and paste it into a note, an email or a spreadsheet.</div><textarea id="tx" style="width:100%;height:170px;font-family:ui-monospace,monospace;font-size:11px;border-radius:12px;border:1px solid var(--bd);background:var(--sf2);color:var(--tx);padding:8px" readonly>'+String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</textarea><div class="bar-row"><button class="btn" id="tc">Close</button><button class="btn p" id="tp">Copy</button></div></div>';
 o.onclick=e=>{if(e.target===o)o.remove()};$('#app').append(o);
 wire(o,'#tc',()=>o.remove());
 wire(o,'#tp',()=>{const t=o.querySelector?o.querySelector('#tx'):null;try{if(t){t.select();document.execCommand('copy')}}catch(e){}try{navigator.clipboard.writeText(text)}catch(e){}toast('Copied')});
 return o}
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fileName=t=>String(t||'bookkeep').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
// A picture is bytes, not text, so it goes to the shell's byte-saving bridge; in a browser the data URL
// becomes a Blob and downloads like any other file.
function saveBlob(name,dataUrl,mime){const b64=String(dataUrl).split(',')[1]||'';
 if(window.Saver&&window.Saver.saveBytes){try{window.Saver.saveBytes(name,b64,mime||'image/png');return 'ask'}catch(e){}}
 try{const bin=atob(b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  const b=new Blob([arr],{type:mime||'image/png'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();
  setTimeout(()=>{try{URL.revokeObjectURL(u);a.remove()}catch(e){}},0);return true}catch(e){return false}}
function exportCsv(){const x=S.xp,name=fileName(x.title)+'-'+tdy+'.csv',text=csvText(x.cols,x.rows);
 const r=downloadFile(name,text,'text/csv;charset=utf-8');
 if(r===true)toast(x.rows.length+' rows exported to '+name);else if(r==='ask')toast('Choose where to save it');
 else textSheet('Export - '+x.rows.length+' rows',name,text)}
// PDF is a printable page; saving it AS a PDF is the print dialog's job on every platform that has one.
const pdfTableHtml=x=>'<div class="paperwrap" id="xpp"><div class="paper"><div style="font-size:22px;font-weight:800">'+esc(x.title)+'</div>'
 +'<div style="color:#555;font-size:13px;margin-bottom:8px">'+esc(COMP.name)+' - '+tdy+' - '+x.rows.length+' rows</div>'
 +'<table><tr>'+x.cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr>'
 +x.rows.map(r=>'<tr>'+x.cols.map((c,i)=>'<td'+(i?' class="rt"':'')+'>'+esc(r[i])+'</td>').join('')+'</tr>').join('')
 +'</table></div></div>';
function exportPdf(){const x=S.xp;
 if(inShell()&&!(window.Printer&&window.Printer.printPage)){toast('Update the app to make a PDF here');return}
 const d=document.createElement('div');d.innerHTML=pdfTableHtml(x);$('#app').append(d);
 toast('Choose "Save as PDF" in the print dialog');
 setTimeout(()=>{try{doPrint()}catch(e){}setTimeout(()=>{try{d.remove()}catch(e){}},2000)},80)}
// An image of the table, drawn on a canvas: no library, no network, the same result everywhere.
function tableImage(x){try{const cnv=document.createElement('canvas');if(!cnv.getContext)return null;
 const c=cnv.getContext('2d'),pad=26,fs=15,lh=28,rows=x.rows,cols=x.cols;if(!c)return null;
 const num=cols.map((_,i)=>rows.every(r=>{const v=String(r[i]==null?'':r[i]).replace(/[,\s]/g,'');return v===''||!isNaN(Number(v))}));
 c.font=fs+'px sans-serif';
 const w=cols.map((col,i)=>{let m=String(col).length;rows.forEach(r=>{m=Math.max(m,String(r[i]==null?'':r[i]).length)});return Math.min(Math.max(m*fs*0.56,76),320)});
 cnv.width=Math.max(760,Math.round(w.reduce((a,b)=>a+b,0)+pad*2));
 cnv.height=Math.max(320,Math.round(pad*3+72+lh*(rows.length+2)));
 c.fillStyle='#ffffff';c.fillRect(0,0,cnv.width,cnv.height);
 c.fillStyle=TPL.accent||'#0f5b3f';c.font='bold 22px sans-serif';c.fillText(String(x.title||'Export'),pad,pad+16);
 c.fillStyle='#6b7a72';c.font='13px sans-serif';c.fillText(COMP.name+' - '+tdy+' - '+rows.length+' rows',pad,pad+40);
 let y=pad+74,xx=pad;
 c.fillStyle='#eef3f0';c.fillRect(pad-8,y-20,cnv.width-pad*2+16,lh);
 c.fillStyle='#111';c.font='bold 13px sans-serif';
 cols.forEach((col,i)=>{c.fillText(String(col).slice(0,Math.max(3,Math.floor(w[i]/(fs*0.56)))),xx,y);xx+=w[i]});
 y+=lh;c.font=fs+'px sans-serif';
 rows.forEach((r,ri)=>{if(ri%2){c.fillStyle='#f7faf8';c.fillRect(pad-8,y-20,cnv.width-pad*2+16,lh)}
  c.fillStyle='#111';xx=pad;
  cols.forEach((col,i)=>{const t=String(r[i]==null?'':r[i]),max=Math.max(3,Math.floor(w[i]/(fs*0.56))),s=t.length>max?t.slice(0,max-1)+'...':t;
   if(num[i])c.fillText(s,xx+w[i]-8-c.measureText(s).width,y);else c.fillText(s,xx,y);xx+=w[i]});
  y+=lh});
 c.fillStyle='#6b7a72';c.font='12px sans-serif';c.fillText('Bookkeep - '+x.rows.length+' rows',pad,y+8);
 return cnv.toDataURL('image/png')}catch(e){return null}}
function exportImage(){const x=S.xp,url=tableImage(x);
 if(!url){toast('This device cannot draw an image');return}
 const name=fileName(x.title)+'-'+tdy+'.png',r=saveBlob(name,url,'image/png');
 if(r===true)toast('Image saved as '+name);else if(r==='ask')toast('Choose where to save the image');
 else textSheet('Image export',name,'This device cannot save an image file.')}
// The chooser every export button opens. Three formats; the rows are always what the screen is showing.
function exportSheet(){const x=S.xp;if(!x||!x.rows||!x.rows.length){toast('Nothing to export on this screen');return}
 const o=document.createElement('div');o.className='ov';
 o.innerHTML='<div class="sheet"><div class="grab"></div><b style="font-size:17px">Export '+esc(x.title)+'</b>'
  +'<div class="lbl sm" style="margin:6px 0 12px">'+x.rows.length+' rows, exactly what the screen is showing.</div>'
  +'<button class="row" data-x="csv"><span>SUMMARY</span><div class="grow"><div class="t">Spreadsheet (CSV)</div><div class="lbl sm">Opens in Excel, Sheets or Numbers</div></div></button>'
  +'<button class="row" data-x="pdf"><span>PDF</span><div class="grow"><div class="t">PDF</div><div class="lbl sm">A printable page; save as PDF from the print dialog</div></div></button>'
  +'<button class="row" data-x="img"><span>IMG</span><div class="grow"><div class="t">Image (PNG)</div><div class="lbl sm">A picture of the table, for WhatsApp or a report</div></div></button></div>';
 o.onclick=e=>{if(e.target===o)o.remove()};
 (o.querySelectorAll?o.querySelectorAll('[data-x]'):[]).forEach(b=>b.onclick=()=>{const k=b.dataset.x;o.remove();
  if(k==='csv')exportCsv();else if(k==='pdf')exportPdf();else exportImage()});
 $('#app').append(o)}
const doPrint=()=>{toast('Sending to printer');setTimeout(()=>{try{if(window.Printer&&window.Printer.printPage)window.Printer.printPage(document.title||'Bookkeep');else window.print()}catch(e){}},400)};

// ---- long press to select rows ------------------------------------------------------------------------
// Any list that gives its rows data-sel="id" gets this for nothing: press and hold starts a selection, a
// normal tap still opens the row, and once something is selected a tap adds or removes it. The listeners
// are on the document because the rows are rebuilt from HTML on every render, and the release after a long
// press still fires a click, which would open the row - so that one click is swallowed.
const selIds=()=>S.sel?S.sel.ids.slice():[];
const selOn=()=>selIds().length>0;
// A selection belongs to the screen it was started on. Without that, the floating bar stayed on every screen
// the user went to next - including the dashboard - because the rows it referred to had long gone.
const selAt=()=>S.sel&&S.sel.at?S.sel.at:(S.screen||S.tab);
const selHere=()=>selOn()&&selAt()===(S.screen||S.tab);
const selIn=id=>selIds().indexOf(id)>=0;
// Selection changes the look of a row, not the contents of the screen, so it is applied in place: redrawing the
// whole list destroyed the row under the finger mid-press, which made the tap animation snap back. Only the bar
// is rebuilt, because which buttons it offers (PDF needs every pick to be a printable document) can change.
const syncSel=()=>{try{
  document.querySelectorAll('[data-sel]').forEach(el=>el.classList.toggle('sel',selIn(el.dataset.sel)));
  document.querySelectorAll('.selbar').forEach(e=>e.remove());
  const app=document.getElementById('app'),bar=selBar();
  if(app){app.classList.toggle('selon',bar!=='');if(bar)app.insertAdjacentHTML('beforeend',bar)}
}catch(e){}};
function selToggle(id){if(!S.sel)S.sel={ids:[],at:S.screen||S.tab};const i=S.sel.ids.indexOf(id);if(i>=0)S.sel.ids.splice(i,1);else S.sel.ids.push(id);if(!S.sel.ids.length)S.sel=null;syncSel()}
const selClear=()=>{S.sel=null;syncSel()};
// Select every row the list is showing - not every record, which the period filter may well have narrowed.
const selAllRows=()=>{const all=(S.selRows||[]).map(r=>r.id);S.sel=all.length?{ids:all,at:S.screen||S.tab}:null;syncSel()};
// One bar button does both jobs: it reads "Select all" until every row is picked, then "Deselect all". Two
// separate buttons would be one more thing to fit in a bar that already holds four.
const selAllOn=()=>{const all=(S.selRows||[]).map(r=>r.id);return all.length>0&&all.every(selIn)};
const selToggleAll=()=>{if(selAllOn()){S.sel=null}else{const all=(S.selRows||[]).map(r=>r.id);if(all.length)S.sel={ids:all,at:S.screen||S.tab}}syncSel()};
const selCsv=()=>{const rows=(S.selRows||[]).filter(r=>selIn(r.id)).map(r=>r.cells);
 if(!rows.length){toast('Nothing selected');return}setExport('Selected '+(S.selTitle||'rows'),S.selCols||[],rows);exportSheet()};
const lpRow=e=>{const t=e.target;return (t&&t.closest)?t.closest('[data-sel]'):null};
let lpTimer=null;
// The release that ends a long press normally fires a click, which would open the row - so exactly that click
// must be swallowed. A boolean was wrong: a long press on a phone often fires no click at all, and the flag
// then stayed set and ate the *next* tap instead (the first tap on Cancel, or the tap that takes the only
// selected row back out, appeared to do nothing). A timestamp expires by itself, so a missing click is harmless.
const lpSwallow=()=>!!(S.lpAt&&Date.now()-S.lpAt<700);
const lpDown=e=>{const b=lpRow(e);if(!b)return;clearTimeout(lpTimer);lpTimer=setTimeout(()=>{lpTimer=null;S.lpAt=Date.now();selToggle(b.dataset.sel)},450)};
const lpUp=()=>{clearTimeout(lpTimer);lpTimer=null};
root_addLP();
function root_addLP(){try{
 document.addEventListener('touchstart',lpDown,{passive:true});
 document.addEventListener('mousedown',lpDown);
 document.addEventListener('touchend',lpUp,true);
 document.addEventListener('touchmove',lpUp,true);
 document.addEventListener('mouseup',lpUp,true);
 document.addEventListener('scroll',lpUp,true);
 document.addEventListener('click',e=>{
       if(lpSwallow()){S.lpAt=0;e.preventDefault();e.stopPropagation();return}
   if(!selOn())return;
   const b=lpRow(e);if(!b)return;
   e.preventDefault();e.stopPropagation();selToggle(b.dataset.sel);
 },true);
}catch(e){}}
// The documents selected, if they are documents this app can print as one file.
const selDocs=()=>selIds().map(no=>INVD[no]).filter(Boolean);
const screenError=(where,err)=>`<div class="scr"><div class="top"><h1>This screen did not open</h1><span style="width:38px"></span></div><div class="card"><div class="t">${where} failed to draw.</div><div class="lbl sm" style="margin-top:6px">${String((err&&err.message)||err)}</div></div><button class="btn" style="width:100%;flex:none" onclick="go('dash')">Back to the dashboard</button></div>`;
const selBar=()=>!selHere()?'':`<div class="selbar"><span class="lbl" style="min-width:22px;text-align:center">${selIds().length}</span><button class="btn" onclick="selToggleAll()">${selAllOn()?'Deselect all':'Select all'}</button><button class="btn" onclick="selCsv()">CSV</button>${selDocs().length===selIds().length?`<button class="btn p" onclick="batchOpen()">PDF</button>`:''}<button class="btn" onclick="selClear()">Cancel</button></div>`;
function fitPage(p){if(p.classList.contains('t80')||p.classList.contains('t58'))return;const a5=p.classList.contains('a5'),H=a5?794:1123;let pad=a5?11:16;const set=v=>p.querySelectorAll('td').forEach(td=>td.style.padding=v+'px 0');let fs=a5?12:17;const setF=v=>{p.style.fontSize=v+'px';p.querySelectorAll('th').forEach(t=>t.style.fontSize=v*.82+'px');const lg=p.querySelector('.logo,.lgimg');if(lg)lg.style.width=lg.style.height=Math.max(40,v*5.35)+'px'};p.style.minHeight=H+'px';setF(fs);set(pad);while(p.scrollHeight>H&&pad>4){pad--;set(pad)}while(p.scrollHeight>H&&fs>(a5?8:10)){fs-=.5;setF(fs)}while(p.scrollHeight>H&&pad>2){pad--;set(pad)}if(p.scrollHeight>H)p.style.minHeight=Math.ceil(p.scrollHeight/H)*H+'px'}
function fitPaper(){const w=document.querySelector('.paperwrap'),p=w&&w.firstElementChild;if(!p)return;fitPage(p);
 const wide=window.matchMedia&&window.matchMedia('(min-width:900px)').matches;
 // On a desktop the whole page should be visible, not a 794px sheet that is taller than the window. Fit to the
 // available height as well as the width; on a phone the page keeps scaling to width and scrolling.
 const availH=wide?Math.max(320,window.innerHeight-250):1e9;
 const s=Math.min(1,(w.parentElement.clientWidth-32)/p.offsetWidth,availH/p.offsetHeight);
 p.style.transform='scale('+s+')';w.style.width=p.offsetWidth*s+'px';w.style.height=p.offsetHeight*s+'px'}
window.addEventListener('resize',fitPaper);
function pick(cur,cb,clr,range){const base=new Date((cur||tdy)+'T00:00');let y=base.getFullYear(),m=base.getMonth(),a=null,b=null;const o=document.createElement('div');o.className='ov';
const draw=()=>{const first=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate(),iso=d=>y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');let h='';for(let i=0;i<first;i++)h+='<span></span>';
for(let d=1;d<=n;d++){const k=iso(d),on=range?(k===a||k===b):k===cur,inr=range&&a&&b&&k>a&&k<b;h+='<button class="cd'+(on?' on':'')+(inr?' inr':'')+(k===tdy?' td':'')+'" data-d="'+k+'">'+d+'</button>'}
o.innerHTML='<div class="sheet"><div class="grab"></div><div class="calh"><button class="ic" data-n="-1">‹</button><b>'+new Date(y,m,1).toLocaleDateString('en-GB',{month:'long',year:'numeric'})+'</b><button class="ic" data-n="1">›</button></div><div class="cal">'+['S','M','T','W','T','F','S'].map(x=>'<i>'+x+'</i>').join('')+h+'</div>'+(range?'<div class="lbl sm" style="text-align:center;margin-bottom:8px">'+(a&&b?fmtD(a)+' to '+fmtD(b):a?'Now pick the end date':'Pick the start date')+'</div>':'')+'<div class="bar-row"><button class="btn" data-t="today">'+(range?'Cancel':'Today')+'</button>'+(clr?'<button class="btn" data-t="clear">Clear</button>':'')+(range?'<button class="btn p" data-t="apply"'+(a&&b?'':' disabled')+'>Apply</button>':'')+'</div></div>';
if(o.dataset.s)o.querySelector('.sheet').style.animation='none';o.dataset.s=1;
o.querySelectorAll('[data-n]').forEach(x=>x.onclick=()=>{m+=+x.dataset.n;if(m<0){m=11;y--}if(m>11){m=0;y++}draw()});
o.querySelectorAll('[data-d]').forEach(x=>x.onclick=()=>{const v=x.dataset.d;if(range){if(!a||b){a=v;b=null}else if(v<a){b=a;a=v}else b=v;draw()}else{o.remove();cb(v)}});
o.querySelectorAll('[data-t]').forEach(x=>x.onclick=()=>{const t=x.dataset.t;o.remove();if(t==='today'){if(!range)cb(tdy)}else if(t==='clear')cb('');else cb(a+'|'+b)})};
o.onclick=e=>{if(e.target===o)o.remove()};draw();$('#app').append(o)}
function pd(key,k){const cur=key==='exp'?S.items[k].exp:S.d[key];pick(cur,v=>{if(key==='exp')S.items[k].exp=v;else S.d[key]=v;render(false,true)},key==='exp')}
function skinSelects(){document.querySelectorAll('select').forEach(sel=>{if(sel.dataset.sk)return;sel.dataset.sk=1;sel.style.display='none';const b=document.createElement('button');b.type='button';b.className='skl'+(sel.classList.contains('search')?' search':'');
const txt=()=>{const op=sel.options[sel.selectedIndex];b.innerHTML='<span'+(op&&op.value===''?' class="lbl"':'')+'>'+(op?op.text:'')+'</span><span class="lbl">⌄</span>'};txt();sel.after(b);b.onclick=()=>choose(sel,txt)})}
function choose(sel,txt){const opts=[...sel.options],o=document.createElement('div');o.className='ov';
const pv=sel.previousElementSibling,title=sel.dataset.title||(sel.closest('label')&&sel.closest('label').querySelector('small')&&sel.closest('label').querySelector('small').textContent)||(pv&&pv.classList.contains('lbl')?pv.textContent:'Choose');
o.innerHTML='<div class="sheet" style="max-height:80%;display:flex;flex-direction:column"><div class="grab"></div><b style="font-size:17px">'+title+'</b>'+(opts.length>5?'<input class="search" id="cq" placeholder="Search" style="margin-top:10px">':'')+'<div id="cl" style="overflow-y:auto;margin-top:10px"></div></div>';
const draw=()=>{const q=(($('#cq')||{}).value||'').toLowerCase();
$('#cl').innerHTML=opts.map((op,i)=>[op,i]).filter(x=>x[0].value!==''&&x[0].text.toLowerCase().includes(q)).map(x=>'<button class="row" data-i="'+x[1]+'"><span class="grow t">'+x[0].text+'</span>'+(x[1]===sel.selectedIndex?'<span class="grn">✓</span>':'')+'</button>').join('')+(sel.dataset.add?'<button class="row" data-add="1"><span class="grow t grn">+ Add new '+sel.dataset.add+'</span></button>':'')+(!opts.some(x=>x.value!==''&&x.text.toLowerCase().includes(q))&&!sel.dataset.add?'<div class="lbl" style="text-align:center;padding:16px">No results</div>':'');
$('#cl').querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{sel.selectedIndex=+b.dataset.i;sel.dispatchEvent(new Event('change',{bubbles:true}));txt();o.remove();tick()});
const ad=$('#cl [data-add]');if(ad)ad.onclick=()=>{const nm=$('#cq')?$('#cq').value.trim():'';o.remove();if(ADDL[sel.dataset.add])addList(sel.dataset.add,sel,txt);else newCust(nm)}};
o.onclick=e=>{if(e.target===o)o.remove()};$('#app').append(o);if($('#cq'))$('#cq').oninput=draw;draw()}
new MutationObserver(()=>skinSelects()).observe($('#app'),{childList:true,subtree:true});
function okOverlay(h,sub,b1,f1,b2,f2){if(S.quiet){if(f1)f1();return}
 document.querySelectorAll('.ok').forEach(e=>e.remove());
 const o=document.createElement('div');o.className='ok';o.innerHTML='<svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="50"/><path d="M33 57l15 15 30-33"/></svg><h1>'+h+'</h1><div class="lbl">'+sub+'</div><button class="btn p" style="flex:none;width:100%;margin-top:14px" id="o1">'+b1+'</button>'+(b2?'<button class="btn" style="flex:none;width:100%" id="o2">'+b2+'</button>':'');$('#app').append(o);o.onclick=e=>{if(e.target===o)o.remove()};wire(o,'#o1',()=>{o.remove();f1()});if(b2)wire(o,'#o2',()=>{o.remove();f2()})}
function confirmSheet(t,m,lab,fn){const o=document.createElement('div');o.className='ov';o.innerHTML='<div class="sheet"><div class="grab"></div><b style="font-size:17px">'+t+'</b><div class="lbl" style="margin:6px 0 14px">'+m+'</div><div class="bar-row"><button class="btn" id="cc">Cancel</button><button class="btn p" id="cy" style="background:var(--bad);border-color:var(--bad)">'+lab+'</button></div></div>';o.onclick=e=>{if(e.target===o)o.remove()};$('#app').append(o);wire(o,'#cc',()=>o.remove());wire(o,'#cy',()=>{o.remove();fn()})}
function addList(kind,sel,txt){const c=ADDL[kind],o=document.createElement('div');o.className='ov';o.innerHTML='<div class="sheet"><div class="grab"></div><b style="font-size:17px">'+c.t+'</b><div class="f" style="margin-top:12px"><label class="w"><small>Name</small><input id="ln" placeholder="'+c.ph+'"></label></div>'+(kind==='account'?'<div class="f"><label class="w"><small>What kind of account is it?</small><select id="lk">'+'<option value="asset" '+((sel.dataset.kind||'asset')==='asset'?'selected':'')+'>Asset - something the business owns</option>'+'<option value="liability" '+(sel.dataset.kind==='liability'?'selected':'')+'>Liability - something it owes</option>'+'<option value="equity" '+(sel.dataset.kind==='equity'?'selected':'')+'>Equity - the owner\'s share</option>'+'<option value="revenue" '+(sel.dataset.kind==='revenue'?'selected':'')+'>Income</option>'+'<option value="expense" '+(sel.dataset.kind==='expense'?'selected':'')+'>Expense</option>'+'</select></label></div>':'')+'<button class="btn p" style="width:100%;flex:none" id="ls">Save</button></div>';o.onclick=e=>{if(e.target===o)o.remove()};$('#app').append(o);$('#ln').focus();
$('#ls').onclick=()=>{const v=$('#ln').value.trim();if(!v)return;if(c.arr.some(x=>x.toLowerCase()===v.toLowerCase())){toast('Already in the list');return}c.arr.push(v);
// A new account needs a side before anything can be posted to it: the ledger refuses an account it
// cannot place. Ledger.js owns the map, and it is saved with the rest of the data.
if(kind==='account'&&$('#lk'))ACCT_TYPES[v]=$('#lk').value;
sel.add(new Option(v,v));sel.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}));txt();o.remove();toast('Added')}}
const fmtCls=f=>f==='A4'?'':f==='A5'?'a5':f==='80mm'?'t80':'t58';
const fmtChips=f=>`<div class="sw">${['A4','A5','80mm','58mm'].map(x=>`<button class="chip ${f===x?'on':''}" onclick="S.fmt='${x}';render(false,true)">${x}</button>`).join('')}</div>`;
const sizeCap=f=>'<div class="lbl sm" style="text-align:center;margin-top:8px">'+({A4:'A4 - 210 x 297 mm',A5:'A5 - 148 x 210 mm','80mm':'Thermal roll - 80 mm wide','58mm':'Thermal roll - 58 mm wide'})[f]+'</div>';
function compImg(inp,max,cb){const f=inp.files&&inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/png'))};im.src=r.result};r.readAsDataURL(f)}
document.addEventListener('scroll',e=>{const t=e.target;if(!t||!t.classList)return;if(t.classList.contains('scr')){window._sy=t.scrollTop;headsStuck()}if(t.classList.contains('chips'))chipFades()},true);
