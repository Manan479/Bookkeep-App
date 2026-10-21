// One 24-unit outline grid for desktop navigation and action buttons.
const UI_ICONS={
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 invoice:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
 purchase:'<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
 inventory:'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/>',
 parties:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
 payments:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
 expenses:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h5M8 16h3"/>',
 returns:'<path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12"/>',
 quotations:'<path d="M6 3h9l4 4v14H6V3ZM15 3v5h4M9 12h7M9 16h5"/>',
 bank:'<path d="m3 9 9-6 9 6H3ZM5 10v8M10 10v8M14 10v8M19 10v8M3 21h18"/>',
 reports:'<path d="M4 3v18h17M8 16v-4M13 16V7M18 16v-7"/>',
 accounts:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h3M8 18h3M15 15h1M15 18h1"/>',
 distributor:'<path d="M3 6h12v12H3V6ZM15 10h4l3 4v4h-7"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
 journal:'<path d="M5 3h14v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM7 3v18M10 8h6M10 12h6"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 employees:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2M9 15l3 3 3-3M12 18v4"/>',
 company:'<path d="M4 21V3h12v18M16 10h4v11M2 21h20M8 7h1M12 7h1M8 11h1M12 11h1M8 15h1M12 15h1M9 21v-3h3v3"/>',
 templates:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
 theme:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor" stroke="none"/>',
 language:'<path d="M3 5h12M9 3v2M5 5c0 6 5 10 10 12M13 5c0 6-5 10-10 12M14 21l4-10 4 10M16 17h4"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 11l4 2v4c0 2-4 4-4 4s-4-2-4-4v-4l4-2Z"/>',
 settings:'<path d="m9 3-.7 3-2.5 1L3 6l-2 4 2.3 2-2.3 2 2 4 2.8-1 2.5 1L9 21h6l.7-3 2.5-1 2.8 1 2-4-2.3-2 2.3-2-2-4-2.8 1-2.5-1L15 3H9Z"/><circle cx="12" cy="12" r="3"/>',
 back:'<path d="m14 5-7 7 7 7"/>',forward:'<path d="m10 5 7 7-7 7"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
 export:'<path d="M12 15V3m-4 4 4-4 4 4M5 13v7h14v-7"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
 print:'<path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6v-7Z"/>',
 scan:'<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 7v10M10 7v10M14 7v10M17 7v10"/>',
 cash:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h1M17 15h1"/>',
 download:'<path d="M12 3v14m-5-5 5 5 5-5M4 18v3h16v-3"/>',
 upload:'<path d="M12 17V3m-5 5 5-5 5 5M4 18v3h16v-3"/>',
 logout:'<path d="M9 3H4v18h5M9 12h12m-5-5 5 5-5 5"/>'
};
const uiIcon=name=>'<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(UI_ICONS[name]||UI_ICONS.templates)+'</svg>';
const moduleIcon=name=>({'Parties':'parties','Payments':'payments','Expenses':'expenses','Returns':'returns','Quotations':'quotations','Cash and Bank':'bank','Reports':'reports','Accounts':'accounts','Distributor':'distributor','Journal':'journal','Notifications':'bell','Employees':'employees','Company Profile':'company','Templates':'templates','Theme':'theme','Language':'language','Users':'users','Settings':'settings'})[name]||'templates';

function syncUiIcons(){
 localizeInterface();
 document.querySelectorAll('button.tg').forEach(b=>{b.setAttribute('role','switch');b.setAttribute('aria-checked',b.classList.contains('on')?'true':'false');if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',(b.closest('.row')?.querySelector('.t,.grow,b')?.textContent||'Toggle option').trim())});
 const symbols={'✎':['edit','Edit'],'⌄':['more','Choose'],'›':['forward','Open'],'‹':['back','Back'],'✕':['close','Close'],'×':['close','Close'],'⇪':['export','Export'],'👁':['eye','Preview'],'⋯':['more','More actions'],'🔔':['bell','Notifications'],'⌗':['scan','Scan barcode'],'+':['plus','Add'],'−':['minus','Remove'],'🖨':['print','Print']};
 document.querySelectorAll('button.ic:not([data-ui-icon])').forEach(button=>{
  const node=Array.from(button.childNodes).find(child=>child.nodeType===3&&child.textContent.trim());
  const spec=node&&symbols[node.textContent.trim()];if(!spec)return;
  const original=document.createElement('span');original.className='icon-original';original.textContent=node.textContent;node.replaceWith(original);
  button.insertAdjacentHTML('afterbegin',uiIcon(spec[0]));button.dataset.uiIcon=spec[0];
  if(!button.hasAttribute('aria-label'))button.setAttribute('aria-label',tr(spec[1]));
 });
 const decorative={'📦':'inventory','🧾':'invoice','🛒':'purchase','📒':'journal','👷':'employees','🏦':'bank','💵':'cash','📈':'reports','📊':'reports','↓':'download','↑':'upload','🚚':'distributor','💸':'payments','👥':'parties','›':'forward'};
 document.querySelectorAll('.av:not([data-ui-icon]),.row>span:first-child:not([data-ui-icon]),.row>span:last-child:not([data-ui-icon]),.hero>span:last-child:not([data-ui-icon]),.card>div[style*="font-size:30px"]:not([data-ui-icon])').forEach(element=>{
  const name=decorative[element.textContent.trim()];if(!name||element.children.length)return;
  const original=document.createElement('span');original.className='icon-original';original.textContent=element.textContent;
  element.textContent='';element.appendChild(original);element.insertAdjacentHTML('beforeend',uiIcon(name));element.dataset.uiIcon=name;
  if(element.style.fontSize==='30px')element.classList.add('ui-empty-icon');
 });
}
function installUiIcons(){
 syncUiIcons();new MutationObserver(records=>{
  document.querySelectorAll('.ov:not([data-dialog-ready])').forEach((o,i)=>{o.dataset.dialogReady='1';const sheet=o.querySelector('.sheet');if(!sheet)return;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');const title=sheet.querySelector('h2,h1,b');if(title){title.id=title.id||'dialog-'+Date.now()+'-'+i;sheet.setAttribute('aria-labelledby',title.id)}});
  if(records.some(record=>Array.from(record.addedNodes).some(node=>node.nodeType===1)))syncUiIcons();
 }).observe(document.getElementById('app'),{childList:true,subtree:true});
}
