// Shared screen presentation. Called once after each new screen is mounted.
function mountScreenLayout(){
 const app=document.getElementById('app'),screen=app.querySelector('.scr'),top=screen?.querySelector(':scope>.top');if(!screen)return;
 mountDashboardLayout(screen);
 screen.querySelectorAll('.shead').forEach(band=>{const search=band.querySelector(':scope>.search');if(search)band.prepend(search)});
 // Keep the same action handlers; only their desktop placement changes.
 const fab=app.querySelector(':scope>.fab');
 if(top&&fab){
  if(!top.querySelector('.deskonly.btn.p')){const create=fab.cloneNode(true);create.removeAttribute('style');create.className='btn p deskonly desktop-create';top.append(create)}
  fab.classList.add('desktop-relocated');
 }
 if(top&&S.screen==='stf'){
  const add=[...top.querySelectorAll('.ic')].find(b=>b.textContent.trim()==='+');
  if(add){const create=add.cloneNode(true);create.className='btn p deskonly desktop-create';create.textContent='+ Add employee';top.append(create);add.classList.add('mobile-create')}
 }
 if(top){
  top.querySelectorAll(':scope>span[style]').forEach(spacer=>{if(!spacer.textContent.trim()&&spacer.style.width==='38px')spacer.remove()});
  const select=top.querySelector('.select-start'),create=top.querySelector('.deskonly.btn.p'),exp=top.querySelector('[onclick="exportSheet()"]');
  if(select)top.append(select);if(create)top.append(create);if(exp)top.append(exp);
 }
 // Details have a title row and a secondary action group on small screens.
 if(['record','skd','pmd','exd','qd','rtd','jd'].includes(S.screen)){
  const header=top||screen.querySelector('.pvhead>.top');
  if(header){header.classList.add('record-header');const actions=document.createElement('div');actions.className='record-header-actions';
   [...header.querySelectorAll(':scope>button')].slice(1).forEach(b=>actions.append(b));if(actions.children.length)header.append(actions);
  }
 }
 // Report exports live in their header on desktop, retaining the mobile footer.
 if(top&&['rpt','pl'].includes(S.screen)){
  const bar=app.querySelector(':scope>.bar-act'),button=bar?.querySelector('[onclick="exportSheet()"]');
  if(button){bar.classList.add('report-export-bar');const action=button.cloneNode(true);action.className='btn deskonly';top.append(action)}
 }
 if(['st','tp'].includes(S.screen))mountSettingsSections(screen,top);
 // Isolate formatted Latin dates so RTL does not reorder day/month/year.
 const walker=document.createTreeWalker(screen,NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode()){const node=walker.currentNode;if(!node.parentElement.closest('bdi,script,style,textarea,option,.paper')&&/\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/.test(node.data))nodes.push(node)}
 nodes.forEach(node=>{const fragment=document.createDocumentFragment(),re=/\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/g;let last=0;for(const m of node.data.matchAll(re)){fragment.append(node.data.slice(last,m.index));const date=document.createElement('bdi');date.dir='ltr';date.textContent=m[0];fragment.append(date);last=m.index+m[0].length}fragment.append(node.data.slice(last));node.replaceWith(fragment)});
}
function mountSettingsSections(screen,top){
 screen.classList.add('settings-workspace');const headings=[...screen.querySelectorAll(':scope>.gh')];
 const nav=document.createElement('nav');nav.className='settings-jumps';nav.setAttribute('aria-label','Settings sections');
 headings.forEach((heading,i)=>{
  const section=document.createElement('section');section.className='settings-section';section.id='settings-section-'+i;heading.before(section);section.append(heading);
  while(section.nextElementSibling&&!section.nextElementSibling.classList.contains('gh'))section.append(section.nextElementSibling);
  const link=document.createElement('button');link.className='chip';link.textContent=heading.querySelector('b')?.textContent||heading.textContent;link.onclick=()=>{section.scrollIntoView({block:'start'});heading.tabIndex=-1;heading.focus({preventScroll:true})};nav.append(link);
 });
 if(top&&nav.children.length)top.after(nav);
 if(S.screen==='tp'){
  const paper=screen.querySelector('.paperwrap');if(!paper)return;
  const button=document.createElement('button');button.className='btn';button.textContent='Open full preview';button.onclick=()=>openTemplatePreview(paper);paper.before(button);
 }
}
function openTemplatePreview(source){
 const previousFocus=document.activeElement;
 const overlay=document.createElement('div');overlay.className='ov template-preview-dialog';
 overlay.innerHTML='<div class="sheet"><div class="preview-tools"><h2>Invoice preview</h2><button class="btn" data-zoom>Actual size</button><button class="ic" aria-label="Close preview" data-close>✕</button></div><div class="preview-scroll"><div class="paperwrap"></div></div></div>';
 const paper=overlay.querySelector('.paperwrap');paper.innerHTML=source._paperSource||source.innerHTML;
 const sheet=overlay.querySelector('.sheet');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','Invoice preview');
 const close=()=>{overlay.remove();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true})};
 overlay.querySelector('[data-close]').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};
 overlay.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();close()}else if(e.key==='Tab'){e.stopPropagation();const buttons=[...sheet.querySelectorAll('button')],first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};
 overlay.querySelector('[data-zoom]').onclick=e=>{paper.dataset.previewZoom=paper.dataset.previewZoom==='true'?'false':'true';e.currentTarget.textContent=paper.dataset.previewZoom==='true'?'Fit to screen':'Actual size';fitPaper()};
 document.getElementById('app').append(overlay);fitPaper();overlay.querySelector('[data-close]').focus();
}
