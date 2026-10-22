// Presentation preferences stay on this device, outside business backups/sync.
const DASH_SECTIONS=[['sales','Sales'],['purchases','Purchases'],['receivables','Receivables'],['payables','Payables'],['expenses','Expenses'],['stock','Stock value'],['profit','Net profit'],['distributors','Distributor balances'],['accounts','Cash and Bank'],['alerts','Stock alerts'],['chart','Period chart']];
const DASH_PREF_KEY='bookkeep.dashboard-layout.v1';
function dashboardPreferences(){
 let saved;try{saved=JSON.parse(localStorage.getItem(DASH_PREF_KEY)||'null')}catch(e){}
 const ids=DASH_SECTIONS.map(x=>x[0]),order=[...new Set((Array.isArray(saved?.order)?saved.order:[]).filter(id=>ids.includes(id)))];
 return {order:order.concat(ids.filter(id=>!order.includes(id))),hidden:(Array.isArray(saved?.hidden)?saved.hidden:[]).filter(id=>ids.includes(id))};
}
function mountDashboardLayout(screen){
 if(!screen.classList.contains('dashboard'))return;
 const prefs=dashboardPreferences(),nodes={},metrics=screen.querySelector('.dashboard-metrics');
 [...metrics.children].forEach((node,i)=>nodes[DASH_SECTIONS[i][0]]=node);
 nodes.profit=screen.querySelector('.dashboard-summary>.hero');
 nodes.distributors=screen.querySelector('.dashboard-summary>.card');
 nodes.accounts=screen.querySelector('.dashboard-accounts');nodes.alerts=screen.querySelector(':scope>.alerts');nodes.chart=screen.querySelector(':scope>button.card');
 const grid=document.createElement('div');grid.className='dashboard-widgets';
 prefs.order.forEach(id=>{const node=nodes[id];if(!node)return;if(prefs.hidden.includes(id)){node.remove();return}node.dataset.widget=id;node.classList.add('dashboard-widget');grid.append(node)});
 metrics.before(grid);metrics.remove();screen.querySelector('.dashboard-overview')?.remove();
 if(!grid.children.length){grid.innerHTML='<div class="card dashboard-empty"><h2>Your dashboard is clear</h2><p class="lbl">Choose the figures and sections you want to see.</p><button class="btn" onclick="customizeDashboard()">Customize dashboard</button></div>'}
 const action=document.createElement('button');action.className='btn dashboard-customize';action.textContent=tr('Customize');action.setAttribute('aria-label','Customize dashboard');action.onclick=customizeDashboard;screen.querySelector('.top').append(action);
}
function customizeDashboard(){
 const prefs=dashboardPreferences(),overlay=document.createElement('div'),previous=document.activeElement;let dragged=null;
 overlay.className='ov dashboard-customizer';
 overlay.innerHTML='<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="dashboard-customize-title"><div class="preview-tools"><h2 id="dashboard-customize-title">Customize dashboard</h2><button class="ic" aria-label="Close customization" data-close>✕</button></div><p class="lbl">Show what matters to you. Drag to reorder on desktop, or use the arrows. Saved on this device.</p><div class="dashboard-options"></div><div class="dashboard-customizer-actions"><button class="btn" data-reset>Restore defaults</button><button class="btn" data-close>Cancel</button><button class="btn p" data-save>Save layout</button></div></div>';
 const list=overlay.querySelector('.dashboard-options');
 const draw=()=>{list.innerHTML=prefs.order.map((id,i)=>{const label=DASH_SECTIONS.find(x=>x[0]===id)[1];return '<div class="dashboard-option" data-id="'+id+'"><label><input type="checkbox" '+(!prefs.hidden.includes(id)?'checked':'')+'><span>'+tr(label)+'</span></label><button class="ic dashboard-drag" draggable="true" aria-label="Drag '+label+' to reorder" title="Drag to reorder">⠿</button><button class="ic" data-move="-1" aria-label="Move '+label+' up" '+(i===0?'disabled':'')+'>↑</button><button class="ic" data-move="1" aria-label="Move '+label+' down" '+(i===prefs.order.length-1?'disabled':'')+'>↓</button></div>'}).join('');
  list.querySelectorAll('.dashboard-option').forEach(row=>{const id=row.dataset.id;row.querySelector('input').onchange=e=>{prefs.hidden=prefs.hidden.filter(x=>x!==id);if(!e.target.checked)prefs.hidden.push(id)};
   row.querySelectorAll('[data-move]').forEach(button=>button.onclick=()=>{const i=prefs.order.indexOf(id),target=i+Number(button.dataset.move);if(target<0||target>=prefs.order.length)return;[prefs.order[i],prefs.order[target]]=[prefs.order[target],prefs.order[i]];draw();list.querySelector('[data-id="'+id+'"] input').focus({preventScroll:true})});
   row.querySelector('[draggable]').ondragstart=e=>{dragged=id;e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move'};
   row.ondragover=e=>{if(dragged){e.preventDefault();e.dataTransfer.dropEffect='move'}};
   row.ondrop=e=>{e.preventDefault();if(!dragged||dragged===id)return;const from=prefs.order.indexOf(dragged),to=prefs.order.indexOf(id);prefs.order.splice(from,1);prefs.order.splice(to,0,dragged);dragged=null;draw()};row.ondragend=()=>dragged=null;
  });
 };
 const close=()=>{overlay.remove();if(previous?.isConnected)previous.focus({preventScroll:true})};
 overlay.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);overlay.onclick=e=>{if(e.target===overlay)close()};overlay.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();close()}};
 overlay.querySelector('[data-reset]').onclick=()=>{prefs.order=DASH_SECTIONS.map(x=>x[0]);prefs.hidden=[];draw()};
 overlay.querySelector('[data-save]').onclick=()=>{try{localStorage.setItem(DASH_PREF_KEY,JSON.stringify(prefs))}catch(e){toast('Could not save dashboard preferences on this device.');return}overlay.remove();render(false,true);document.querySelector('.dashboard-customize')?.focus({preventScroll:true})};
 draw();document.getElementById('app').append(overlay);overlay.querySelector('[data-close]').focus();
}
