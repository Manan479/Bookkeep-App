// ui/kit.js - Shared screen pieces: toast, sheets, calendar, pickers, charts, print fitting.
const $=s=>{const matches=[...document.querySelectorAll(s)];return matches.length?(matches.find(e=>!e.closest?.('.off'))||null):document.querySelector(s)};
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
   this._leaving=1;cls.add('off');this.setAttribute('aria-hidden','true');this.inert=true;
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
// The accent is not just a button colour: the neutrals take the same hue, at a very low saturation, so the whole
// book (background, cards, borders, text) belongs to the chosen colour instead of fighting a green-black base.
const rgb2hsl=a=>{const r=a[0]/255,g=a[1]/255,b=a[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;const l=(mx+mn)/2;if(d){const s=l>.5?d/(2-mx-mn):d/(mx+mn);if(mx===r)h=((g-b)/d+(g<b?6:0));else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60}return[h,l>.5?(d?d/(2-mx-mn):0):(d?d/(mx+mn):0),l]};
const hsl=(h,s,l)=>`hsl(${Math.round(h)} ${Math.round(Math.max(0,Math.min(1,s))*100)}% ${l}%)`;
function applyAccent(){try{const a=TPL.accent||'#0F5B3F',r=document.documentElement,dark=isDarkNow();
 const pr=dark?rgb2hex(shade(a,.4)):a,tint=dark?('rgba('+hex2rgb(pr).join(',')+',.16)'):rgb2hex(shade(a,.86));
 r.style.setProperty('--pr',pr);
 r.style.setProperty('--prt',tint);
 r.style.setProperty('--onpr',lightOn(pr)?'#06190F':'#ffffff');
 r.style.setProperty('--bar2',rgb2hex(shade(a,dark?.5:.5)));
 const [h,s]=rgb2hsl(hex2rgb(a)),ns=Math.min(.34,s*.45);
 if(dark){
   r.style.setProperty('--bg',hsl(h,ns*.7,5));
   r.style.setProperty('--sf',hsl(h,ns*.65,8));
   r.style.setProperty('--sf2',hsl(h,ns*.6,11));
   r.style.setProperty('--bd',hsl(h,ns*.55,17));
   r.style.setProperty('--tx',hsl(h,ns*.35,92));
   r.style.setProperty('--tx2',hsl(h,ns*.3,64));
   r.style.setProperty('--mut',hsl(h,ns*.25,52));
 }else{
   r.style.setProperty('--bg',hsl(h,ns*.9,97));
   r.style.setProperty('--sf','#ffffff');
   r.style.setProperty('--sf2',hsl(h,ns*.8,95));
   r.style.setProperty('--bd',hsl(h,ns*.75,88));
   r.style.setProperty('--tx',hsl(h,ns*.9,12));
   r.style.setProperty('--tx2',hsl(h,ns*.55,42));
   r.style.setProperty('--mut',hsl(h,ns*.4,54));
 }
 syncNativeTheme();
}catch(e){}}
let nativeThemeState='';
function syncNativeTheme(){try{
  if(!window.Appearance||!window.Appearance.setTheme)return;
  // Native system bars cannot participate in the web body's CSS transition. Switch both together.
  document.documentElement.classList.add('native-theme');
  const channels=getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g);
  if(!channels||channels.length<3)return;
  const color=rgb2hex(channels.slice(0,3).map(Number)),dark=isDarkNow(),key=color+dark;
  if(key!==nativeThemeState){window.Appearance.setTheme(color,dark);nativeThemeState=key}
}catch(e){}}
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
function tabs(showMobile=true){
 const primary=[['dash','▦','Dashboard'],['sales','🧾','Sales'],['pur','🛒','Purchases'],['inv','📦','Inventory']].filter(t=>canTab(t[0]));
 const rootLink=(t,desktop=false)=>`<button class="tab ${S.tab===t[0]&&!S.screen?'on':''}" ${S.tab===t[0]&&!S.screen?'aria-current="page"':''} onclick="go('${t[0]}')">${desktop?uiIcon(({dash:'dashboard',sales:'invoice',pur:'purchase',inv:'inventory'})[t[0]]):'<i aria-hidden="true">'+t[1]+'</i>'}<span>${tr(t[2])}</span></button>`;
 const mobile=showMobile?'<nav class="tabs mobile-nav" aria-label="'+tr('Navigation')+'">'+primary.concat([['more','⋯','More']]).map(t=>rootLink(t)).join('')+'</nav>':'';
 const family={pt:['pd','stmt'],pm:['pmf','pmd'],ex:['exf','exd'],rt:['rtf','rtd'],qt:['qd'],cb:['cbd','tfr'],rp:['rpt','pl'],ac:['acd'],dl:['dd'],stf:['stfp','skd'],jl:['jf','jd'],st:['bk','cl']};
 let group='';
 const modules=moreModules().filter(([name])=>name!=='Theme').map(([name,screen,section])=>{
   const header=section!==group?'<div class="nav-section">'+tr(section)+'</div>':'';group=section;
   const active=S.screen===screen||(family[screen]||[]).includes(S.screen);
   return header+`<button class="tab nav-module ${active?'on':''}" ${active?'aria-current="page"':''} onclick="moreGo('${name}')">${uiIcon(moduleIcon(name))}<span>${tr(name)}</span></button>`;
 }).join('');
 const appearanceShortcut='<button class="tab nav-module nav-appearance-shortcut '+(S.screen==='th'?'on':'')+'" '+(S.screen==='th'?'aria-current="page"':'')+' onclick="moreGo(\'Theme\')">'+uiIcon('theme')+'<span>'+tr('Theme')+'</span></button>';
 return mobile+'<nav class="tabs desktop-nav" aria-label="'+tr('Navigation')+'"><div class="nav-brand">Bookkeep</div>'+primary.map(t=>rootLink(t,true)).join('')+appearanceShortcut+modules+
   (USERS.length&&S.user?'<div class="nav-session"><span class="lbl">'+esc(S.user.n)+'</span><button class="tab" onclick="signOut();render()">'+uiIcon('logout')+'<span>'+tr('Sign out')+'</span></button></div>':'')+'</nav>';
}
// The language is a device preference like the theme, saved with the book so it survives a restart. Applying it
// means telling the document which way to read; every screen inherits that, which is why RTL needs so little CSS.
function applyLang(){try{const h=document.documentElement,r=isRTL();h.lang=lang();h.dir=r?'rtl':'ltr';document.body.classList.toggle('ur',r)}catch(e){}}
const setLang=l=>{S.lang=l;save();applyLang();render();toast(l==='ur'?'زبان: اردو':'Language: English')};
// ---- export -----------------------------------------------------------------------------------------
// A screen registers what it is SHOWING as it renders (setExport), and the export button in its header
// writes that out. One shape for every screen, so a new screen gets a working export by calling setExport
// once, and there is no second copy of the data to drift from what is on screen.
const setExport=(title,cols,rows)=>{S.xp={title:title,cols:cols,rows:rows}};
const csvCell=v=>{const raw=String(v==null?'':v),s=typeof v==='string'&&/^[\s]*[=+@-]/.test(raw)?"'"+raw:raw;return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
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
function textSheet(title,name,text,description){const o=document.createElement('div');o.className='ov';
 o.innerHTML='<div class="sheet"><div class="grab"></div><b style="font-size:17px">'+title+'</b><div class="lbl" style="margin:6px 0 10px">'+(description||('This build cannot save a file on a phone yet. Copy this ('+name+') and paste it into a note, an email or a spreadsheet.'))+'</div><textarea id="tx" style="width:100%;height:170px;font-family:ui-monospace,monospace;font-size:11px;border-radius:12px;border:1px solid var(--bd);background:var(--sf2);color:var(--tx);padding:8px" readonly>'+String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</textarea><div class="bar-row"><button class="btn" id="tc">Close</button><button class="btn p" id="tp">Copy</button></div></div>';
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
function exportColumnGroups(x){const groups=[];for(let start=1;start<x.cols.length;start+=5)groups.push([0,...Array.from({length:Math.min(5,x.cols.length-start)},(_,i)=>start+i)]);return groups.length?groups:[[0]]}
function pdfTableHtml(x){return exportColumnGroups(x).map((columns,k)=>'<div class="paperwrap"><div class="paper paper-table"><h2>'+esc(x.title)+'</h2><div>'+esc(COMP.name)+' · '+tdy+' · '+x.rows.length+' rows'+(x.cols.length>6?' · Columns '+(k+1)+' of '+exportColumnGroups(x).length:'')+'</div><table style="table-layout:fixed;width:100%"><thead><tr>'+columns.map(i=>'<th>'+esc(x.cols[i])+'</th>').join('')+'</tr></thead><tbody>'+x.rows.map(row=>'<tr>'+columns.map(i=>'<td>'+esc(row[i])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></div>').join('')}
async function exportPdf(){const x=S.xp;if(!x||!x.rows.length){toast('Nothing to export');return}try{toast('Preparing table PDF');const host=document.createElement('div');host.innerHTML=pdfTableHtml(x);const docs=[...host.querySelectorAll('.paper')].map((p,k)=>({no:fileName(x.title)+'-'+(k+1),format:'A4',html:p.outerHTML}));const bytes=await makeInvoicePdf(docs);await saveDocumentFiles([{name:fileName(x.title)+'-'+tdy+'.pdf',bytes,mime:'application/pdf'}],'combined');toast('PDF prepared')}catch(e){toast('Could not export PDF: '+e.message)}}
function tableImage(x){try{const canvas=document.createElement('canvas'),c=canvas.getContext('2d');if(!c)return null;const pad=24,fs=14,line=20,widths=x.cols.map(()=>190);c.font=fs+'px sans-serif';const wrap=(value,width)=>{const lines=[];for(const paragraph of String(value??'').split(/\r?\n/)){let text='';for(const ch of paragraph){if(c.measureText(text+ch).width>width-18&&text){lines.push(text);text=ch}else text+=ch}lines.push(text)}return lines};const all=[x.cols,...x.rows].map(row=>row.map((v,i)=>wrap(v,widths[i]))),heights=all.map(row=>Math.max(1,...row.map(lines=>lines.length))*line+18);canvas.width=pad*2+widths.reduce((a,w)=>a+w,0);canvas.height=pad*2+74+heights.reduce((a,h)=>a+h,0);if(canvas.height>32760)throw new Error('Export fewer rows per image or use CSV/PDF');c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.font='bold 22px sans-serif';c.fillStyle='#222';c.fillText(x.title,pad,pad+20);c.font=fs+'px sans-serif';c.fillText(COMP.name+' · '+tdy,pad,pad+46);let y=pad+74;all.forEach((row,k)=>{const height=heights[k];c.fillStyle=k===0?'#e7ece9':k%2?'#fff':'#f5f7f6';c.fillRect(pad,y,canvas.width-pad*2,height);let left=pad;row.forEach((lines,i)=>{c.font=(k===0?'bold ':'')+fs+'px sans-serif';c.fillStyle='#222';lines.forEach((text,j)=>c.fillText(text,left+8,y+17+j*line));left+=widths[i]});y+=height});return canvas.toDataURL('image/png')}catch(e){return null}}

function exportImage(){const x=S.xp,url=tableImage(x);
 if(!url){toast('This device cannot draw an image');return}
 const name=fileName(x.title)+'-'+tdy+'.png',r=saveBlob(name,url,'image/png');
 if(r===true)toast('Image saved as '+name);else if(r==='ask')toast('Choose where to save the image');
 else textSheet('Image export',name,'This device cannot save an image file.')}
// The chooser every export button opens. Three formats; the rows are always what the screen is showing.
function exportSheet(){const x=S.xp;if(x&&x.invoiceIds){invoiceExportSheet(x.invoiceIds);return}if(!x||!x.rows||!x.rows.length){toast('Nothing to export on this screen');return}
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
const doPrint=()=>{fitPaper();toast('Sending to printer');setTimeout(()=>{try{const format=S.fmt||SET.fmt||'A4';let style=document.getElementById('document-print-size');if(!style){style=document.createElement('style');style.id='document-print-size';document.head.appendChild(style)}style.textContent='@page{size:'+({'A4':'A4','A5':'A5','80mm':'80mm 297mm','58mm':'58mm 297mm'}[format]||'A4')+';margin:0}';if(window.Printer&&window.Printer.printDocument)window.Printer.printDocument(document.title||'Bookkeep',format);else if(window.Printer&&window.Printer.printPage)window.Printer.printPage(document.title||'Bookkeep');else window.print()}catch(e){}},400)};

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
const selMode=()=>!!S.sel&&selAt()===(S.screen||S.tab);
const selStart=()=>{if(selMode()){selClear();return}S.sel={ids:[],at:S.screen||S.tab};syncSel()};
const selIn=id=>selHere()&&selIds().indexOf(id)>=0;
// Selection changes the look of a row, not the contents of the screen, so it is applied in place: redrawing the
// whole list destroyed the row under the finger mid-press, which made the tap animation snap back. Only the bar
// is rebuilt, because which buttons it offers (PDF needs every pick to be a printable document) can change.
const syncSel=()=>{try{
  const screen=document.querySelector('.scr'),top=screen?screen.scrollTop:0;
  document.querySelectorAll('[data-sel]').forEach(el=>{el.classList.toggle('sel',selIn(el.dataset.sel));el.setAttribute('aria-selected',selIn(el.dataset.sel)?'true':'false')});
  document.querySelectorAll('[data-doc-check]').forEach(el=>{el.checked=selIn(el.dataset.docCheck)});
  document.querySelectorAll('[data-doc-all]').forEach(el=>{el.checked=selAllOn();el.indeterminate=selHere()&&!selAllOn()});
  document.querySelectorAll('.select-start').forEach(el=>{el.textContent='Select';el.style.display='';el.style.visibility=selMode()?'hidden':'';el.setAttribute('aria-pressed','false')});
  document.querySelectorAll('.selbar').forEach(e=>e.remove());
  const app=document.getElementById('app'),bar=selBar();
  if(app){app.classList.toggle('selon',bar!=='');if(bar)app.insertAdjacentHTML('beforeend',bar)}layoutAppChrome();if(screen)screen.scrollTop=top;
}catch(e){}};
function selToggle(id){if(!S.sel||selAt()!==(S.screen||S.tab))S.sel={ids:[],at:S.screen||S.tab};const i=S.sel.ids.indexOf(id);if(i>=0)S.sel.ids.splice(i,1);else S.sel.ids.push(id);if(!S.sel.ids.length)S.sel=null;syncSel()}
const selClear=()=>{S.sel=null;syncSel()};
// Select every row the list is showing - not every record, which the period filter may well have narrowed.
const selAllRows=()=>{const all=(S.selRows||[]).map(r=>r.id);S.sel=all.length?{ids:all,at:S.screen||S.tab}:null;syncSel()};
// One bar button does both jobs: it reads "Select all" until every row is picked, then "Deselect all". Two
// separate buttons would be one more thing to fit in a bar that already holds four.
const selAllOn=()=>{const all=(S.selRows||[]).map(r=>r.id);return all.length>0&&all.every(selIn)};
const selToggleAll=()=>{if(selAllOn()){S.sel=null}else{const all=(S.selRows||[]).map(r=>r.id);if(all.length)S.sel={ids:all,at:S.screen||S.tab}}syncSel()};
const selCsv=()=>{if(selDocs().length===selIds().length&&selIds().length){invoiceExportSheet(selIds());return}const rows=(S.selRows||[]).filter(r=>selIn(r.id)).map(r=>r.cells);
 if(!rows.length){toast('Nothing selected');return}setExport('Selected '+(S.selTitle||'rows'),S.selCols||[],rows);exportSheet()};
const lpRow=e=>{const t=e.target;return (t&&t.closest)?t.closest('[data-sel]'):null};
let lpTimer=null;
// The release that ends a long press normally fires a click, which would open the row - so exactly that click
// must be swallowed. A boolean was wrong: a long press on a phone often fires no click at all, and the flag
// then stayed set and ate the *next* tap instead (the first tap on Cancel, or the tap that takes the only
// selected row back out, appeared to do nothing). A timestamp expires by itself, so a missing click is harmless.
const lpSwallow=()=>!!(S.lpAt&&Date.now()-S.lpAt<700);
let lpTouchAt=0,lpGestureUntil=0,lpTouchOrigin=null;
const lpUp=()=>{clearTimeout(lpTimer);lpTimer=null};
const lpDown=e=>{
 lpUp();
 const touch=e.touches&&e.touches[0];
 if(touch){lpTouchAt=Date.now();lpTouchOrigin={x:touch.clientX,y:touch.clientY};
  // Android owns the side edges for Back. Never arm a selection timer there.
  if(e.touches.length!==1||touch.clientX<28||touch.clientX>window.innerWidth-28){lpGestureUntil=Date.now()+600;return}
 }else if(e.button!==0||Date.now()-lpTouchAt<800||e.sourceCapabilities&&e.sourceCapabilities.firesTouchEvents)return;
 lpGestureUntil=0;
 if(e.target&&e.target.closest&&e.target.closest('[data-select-control]'))return;
 const row=lpRow(e),route=S.screen||S.tab;if(!row)return;
 lpTimer=setTimeout(()=>{lpTimer=null;if((S.screen||S.tab)!==route||!row.isConnected)return;S.lpAt=Date.now();selToggle(row.dataset.sel)},450);
};
const lpMove=e=>{const touch=e.touches&&e.touches[0];if(touch&&lpTouchOrigin&&Math.hypot(touch.clientX-lpTouchOrigin.x,touch.clientY-lpTouchOrigin.y)>8){lpUp();lpGestureUntil=Date.now()+600}};
const lpCancel=()=>{lpUp();lpTouchOrigin=null;lpTouchAt=Date.now();lpGestureUntil=Date.now()+600};
root_addLP();
function root_addLP(){try{
 document.addEventListener('touchstart',lpDown,{passive:true});
 document.addEventListener('mousedown',lpDown);
 document.addEventListener('touchend',()=>{lpUp();lpTouchOrigin=null;lpTouchAt=Date.now()},true);
 document.addEventListener('touchcancel',lpCancel,true);
 document.addEventListener('touchmove',lpMove,{capture:true,passive:true});
 document.addEventListener('mouseup',lpUp,true);
 document.addEventListener('mousemove',lpUp,true);
 document.addEventListener('contextmenu',e=>{if(lpRow(e))e.preventDefault()});
 document.addEventListener('scroll',lpUp,true);
 document.addEventListener('click',e=>{
   if(Date.now()<lpGestureUntil&&lpRow(e)){e.preventDefault();e.stopPropagation();return}
   if(e.target&&e.target.closest&&e.target.closest('[data-select-control]')){e.stopPropagation();return}
       if(lpSwallow()){S.lpAt=0;e.preventDefault();e.stopPropagation();return}
   if(!selMode())return;
   const b=lpRow(e);if(!b)return;
   e.preventDefault();e.stopPropagation();selToggle(b.dataset.sel);
 },true);
}catch(e){}}
// The documents selected, if they are documents this app can print as one file.
const selDocs=()=>selIds().map(no=>INVD[no]).filter(Boolean);
const screenError=(where,err)=>`<div class="scr"><div class="top"><h1>This screen did not open</h1><span style="width:38px"></span></div><div class="card"><div class="t">${where} failed to draw.</div><div class="lbl sm" style="margin-top:6px">${String((err&&err.message)||err)}</div></div><button class="btn" style="width:100%;flex:none" onclick="go('dash')">Back to the dashboard</button></div>`;
const selBar=()=>!selMode()?'':`<div class="selbar" role="region" aria-label="Selected document actions"><span class="lbl selcount" role="status" aria-live="polite" aria-atomic="true">${selIds().length} selected</span><button class="btn" onclick="selToggleAll()">${selAllOn()?'Deselect all':'Select all'}</button>${selOn()?'<button class="btn" onclick="selCsv()">Export</button>':''}${selOn()&&registerSelectionKind()?registerSelectionButtons():''}${selOn()&&selDocs().length===selIds().length?`<button class="btn p" onclick="documentActions()">PDF / Share</button><button class="btn" onclick="batchOpen()">Print</button>${can('sales')||can('purchases')?'<button class="btn bulk-danger" onclick="bulkRemoveAsk()">Delete / Void</button>':''}`:''}<button class="btn" onclick="selClear()">Cancel</button></div>`;
function fitPage(p){
 const f=p.classList.contains('t80')?'80mm':p.classList.contains('t58')?'58mm':p.classList.contains('a5')?'A5':'A4',a=invoiceAppearance(f);
 p.style.fontSize=a.size+'px';p.style.fontFamily=a.font;p.style.height='auto';
 p.querySelectorAll('td').forEach(td=>td.style.padding=a.padding+'px 0');p.querySelectorAll('th').forEach(th=>th.style.fontSize=a.size*.82+'px');
 if(p.classList.contains('paper-table')){p.style.fontSize='12px';p.querySelectorAll('td,th').forEach(c=>{c.style.padding='6px';c.style.fontSize='12px';c.style.overflowWrap='anywhere'});p.style.minHeight='1123px';return}
 if(f==='80mm'||f==='58mm'){p.style.minHeight='0px';return}
 const H=f==='A5'?794:1123;
 // Measure at the selected paper size before reducing row gaps and creating sheets.
 p.style.minHeight=H+'px';
 const lg=p.querySelector('.company-heading>.lgimg,.company-heading>.logo');
 if(lg)lg.style.width=lg.style.height=Math.round(Math.min(f==='A5'?120:170,Math.max(f==='A5'?82:116,(p.querySelector('.company-heading-copy')||{}).offsetHeight||0)))+'px';
}
// Reduce item padding first; only then create real sheets with repeated invoice headers.
function paginateInvoicePaper(p){
 const table=p.querySelector('.invoice-lines');if(!table||p.classList.contains('t80')||p.classList.contains('t58'))return [p];
 const H=p.classList.contains('a5')?794:1123,requested=invoiceAppearance(p.classList.contains('a5')?'A5':'A4').padding;
 const fits=page=>page.offsetHeight<=H+1&&page.scrollHeight<=H+1;
 let padding=requested;
 while(!fits(p)&&padding>Math.min(4,requested)){
  padding=Math.max(Math.min(4,requested),padding-1);
  p.querySelectorAll('td').forEach(td=>td.style.padding=padding+'px 0');
 }
 if(fits(p)){p.style.height=H+'px';return [p]}
 const rows=Array.from(table.querySelectorAll('tbody>tr')),summary=p.querySelector('.invoice-summary'),footer=p.querySelector('[data-paper-footer]');
 if(!summary||!footer||!rows.length)return [p];
 const template=p.cloneNode(true);template.querySelector('tbody').innerHTML='';template.querySelector('.invoice-summary').remove();template.querySelector('[data-paper-footer]').remove();
 const pages=[];
 function sheet(){const page=template.cloneNode(true);page.style.height='auto';p.parentNode.insertBefore(page,p);pages.push(page);return page}
 let page=sheet();
 for(const row of rows){
  let body=page.querySelector('tbody');body.appendChild(row);
  if(!fits(page)&&body.children.length>1){row.remove();page=sheet();page.querySelector('tbody').appendChild(row)}
 }
 page.append(summary,footer);
 if(!fits(page)){
  const previous=page;summary.remove();footer.remove();page=sheet();page.append(summary,footer);
  const source=previous.querySelector('tbody'),target=page.querySelector('tbody');
  // Keep as many of the final items as possible with totals, terms and signing fields.
  while(source.lastElementChild){const row=source.lastElementChild;target.prepend(row);if(!fits(page)){source.appendChild(row);break}}
  if(!source.children.length){previous.remove();pages.splice(pages.indexOf(previous),1)}
 }
 p.remove();
 pages.forEach((page,index)=>{if(fits(page))page.style.height=H+'px';const number=document.createElement('div');number.className='invoice-page-number';number.textContent=(index+1)+' / '+pages.length;page.appendChild(number)});
 return pages;
}
function fitPaper(){document.querySelectorAll('.paperwrap').forEach(w=>{
 if(w._paperSource)w.innerHTML=w._paperSource;
 const p=w.querySelector(':scope > .paper');if(!p)return;
 if(p.querySelector('.invoice-lines'))w._paperSource=p.outerHTML;
 fitPage(p);p.style.transform='none';const pages=paginateInvoicePaper(p);
 const wide=window.matchMedia&&window.matchMedia('(min-width:900px)').matches,thermal=p.classList.contains('t80')||p.classList.contains('t58');
 const isZoom=S.pvZoom&&!wide;
 const pageHeight=p.classList.contains('a5')?794:1123,availH=wide?Math.max(400,window.innerHeight-210):1e9;
 const available=Math.max(1,w.parentElement.clientWidth-32),scale=isZoom?1:Math.min(1,available/pages[0].offsetWidth,thermal?1:availH/pageHeight);
 let top=0;
 pages.forEach(page=>{page.style.transform='scale('+scale+')';page.style.position='absolute';page.style.left='0';page.style.top=top+'px';top+=page.offsetHeight*scale+16});
 w.style.width=pages[0].offsetWidth*scale+'px';w.style.height=Math.max(0,top-16)+'px';
})}

window.addEventListener('resize',fitPaper);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitPaper);
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
function skinSelects(){document.querySelectorAll('select').forEach(sel=>{if(sel.dataset.sk)return;sel.dataset.sk=1;sel.style.display='none';const b=document.createElement('button');b.type='button';b.className='skl'+(sel.classList.contains('search')?' search':'');b.disabled=sel.disabled;b.setAttribute('aria-disabled',String(sel.disabled));b.setAttribute('aria-label',sel.getAttribute('aria-label')||sel.closest('label')?.querySelector('small')?.textContent||'Choose');
const txt=()=>{const op=sel.options[sel.selectedIndex];b.innerHTML='<span'+(op&&op.value===''?' class="lbl"':'')+'>'+esc(op?tr(op.text):'')+'</span><span class="lbl">⌄</span>'};txt();sel.after(b);b.onclick=()=>choose(sel,txt)})}
function choose(sel,txt){const opts=[...sel.options],o=document.createElement('div');o.className='ov';
const pv=sel.previousElementSibling,title=sel.dataset.title||(sel.closest('label')&&sel.closest('label').querySelector('small')&&sel.closest('label').querySelector('small').textContent)||(pv&&pv.classList.contains('lbl')?pv.textContent:'Choose');
o.innerHTML='<div class="sheet" style="max-height:80%;display:flex;flex-direction:column"><div class="grab"></div><b style="font-size:17px">'+esc(title)+'</b>'+(opts.length>5?'<input class="search" id="cq" placeholder="Search" style="margin-top:10px">':'')+'<div id="cl" style="overflow-y:auto;margin-top:10px"></div></div>';
const draw=()=>{const q=(($('#cq')||{}).value||'').toLowerCase();
$('#cl').innerHTML=opts.map((op,i)=>[op,i]).filter(x=>!x[0].disabled&&x[0].text.toLowerCase().includes(q)).map(x=>'<button class="row" data-i="'+x[1]+'"><span class="grow t">'+esc(tr(x[0].text))+'</span>'+(x[1]===sel.selectedIndex?'<span class="grn">✓</span>':'')+'</button>').join('')+(sel.dataset.add?'<button class="row" data-add="1"><span class="grow t grn">+ Add new '+sel.dataset.add+'</span></button>':'')+(!opts.some(x=>!x.disabled&&x.text.toLowerCase().includes(q))&&!sel.dataset.add?'<div class="lbl" style="text-align:center;padding:16px">No results</div>':'');
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
function compImg(inp,max,cb){const f=inp.files&&inp.files[0];if(!f)return;if(f.type&&!f.type.startsWith('image/')){toast('Choose an image file');return}const reader=new FileReader();reader.onerror=()=>toast('The image could not be read');reader.onload=()=>{const image=new Image();image.onerror=()=>toast('This image format could not be loaded. Try PNG or JPEG.');image.onload=()=>{try{const scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);cb(canvas.toDataURL('image/png'))}catch(e){toast('Could not prepare this image. Try a PNG or JPEG file.')}};image.src=reader.result};reader.readAsDataURL(f)}

document.addEventListener('scroll',e=>{const t=e.target;if(!t||!t.classList)return;if(t.classList.contains('scr')){headsStuck()}if(t.classList.contains('chips'))chipFades()},true);

function registerMatches(key,values){const q=((S.registerQueries||{})[key]||'').trim().toLocaleLowerCase();return !q||values.flat().filter(v=>v!=null).join(' ').toLocaleLowerCase().includes(q)}
function registerSearch(key,label){const esc=v=>String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');return `<input type="search" class="search" id="register-search-${key}" aria-label="${esc(tr(label))}" placeholder="${esc(tr(label))}" value="${esc((S.registerQueries||{})[key]||'')}" oninput="updateRegisterSearch('${key}',this)">`}
function updateRegisterSearch(key,input){S.registerQueries=S.registerQueries||{};S.registerQueries[key]=input.value;render(false,true);const next=document.getElementById('register-search-'+key);if(next)next.focus({preventScroll:true})}

function localizeInterface(){if(!isRTL())return;try{document.querySelectorAll('h1,h2,.gh b,button.btn,button.ut,label small,.lbl,.sm,.t,.sheet>b,.top button').forEach(el=>{if(el.closest('.paper'))return;Array.from(el.childNodes).filter(n=>n.nodeType===3).forEach(node=>{const raw=node.textContent,text=raw.trim();if(UR[text])node.textContent=raw.replace(text,UR[text])})});document.querySelectorAll('[aria-label]').forEach(el=>{const text=el.getAttribute('aria-label');if(UR[text])el.setAttribute('aria-label',UR[text])})}catch(e){}}

document.addEventListener('keydown',event=>{if(event.key==='Tab'){const dialogs=document.querySelectorAll('.ov:not(.off) .sheet'),sheet=dialogs[dialogs.length-1];if(sheet){const focusable=[...sheet.querySelectorAll('button,input,select,textarea,[tabindex]')].filter(e=>!e.disabled&&e.getBoundingClientRect().width>0);const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}return}if(event.key!=='Escape')return;const overlays=document.querySelectorAll('.ov:not(.off)');const overlay=overlays[overlays.length-1];if(overlay){event.preventDefault();overlay.remove()}else if(selMode()){event.preventDefault();selClear()}});

// Give persistent controls their own space instead of covering otherwise visible rows.
function layoutAppChrome(){try{const app=document.getElementById('app'),screen=app.querySelector('.scr');if(!screen)return;if(screen.classList.contains('auth-screen')){screen.style.bottom='0px';screen.style.removeProperty('padding-bottom');screen.style.removeProperty('scroll-padding-bottom');return}const bounds=app.getBoundingClientRect(),bars=[...app.querySelectorAll(':scope>.bar-act,:scope>.selbar,:scope>.fab,:scope>.mobile-nav')].filter(e=>e.getBoundingClientRect().height>0&&getComputedStyle(e).display!=='none');const bottom=bars.length?Math.max(0,bounds.bottom-Math.min(...bars.map(b=>b.getBoundingClientRect().top))+10):0;screen.style.bottom=bottom+'px';screen.style.paddingBottom='24px';screen.style.scrollPaddingBottom='24px'}catch(e){}}
window.addEventListener('resize',layoutAppChrome);
