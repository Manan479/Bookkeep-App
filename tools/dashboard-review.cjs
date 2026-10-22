// Browser regression checks for dashboard customization, alert geometry and accent readability.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.BOOKKEEP_NODE_MODULES]}));
const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
const luminance=a=>a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(rgb(a)),y=luminance(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),out='dist/dashboard-review',results=[],errors=[];
 fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.goto(pathToFileURL(path.resolve('dist/bookkeep.html')).href);
  const initialize=async()=>{await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});await page.evaluate(()=>{USERS.length=0;S.user=null;S.quiet=true;loadDemo();USERS.length=0;S.user=null;S.dist=true;S.period='All time';localStorage.removeItem(DASH_PREF_KEY);TPL.accent='#00BCD4';theme('dark');go('dash')})};
  await initialize();
  for(const width of [1440,1024,390,320]){
   await page.setViewportSize({width,height:1000});
   for(const count of [1,2]){
    await page.evaluate(count=>{go('dash');const alerts=document.querySelector('[data-widget="alerts"]');while(alerts.children.length>1)alerts.lastElementChild.remove();if(count===2){const second=alerts.firstElementChild.cloneNode(true);second.className='alert a2';second.textContent='2 negative stock';alerts.append(second)}},count);
    const geometry=await page.locator('[data-widget="alerts"]').evaluate(e=>{const box=e.getBoundingClientRect(),cards=[...e.children].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,w:r.width}});return{left:box.left,right:box.right,width:box.width,cards}});
    assert(Math.abs(geometry.cards[0].x-geometry.left)<2,'Alert starts at widget edge');
    assert(Math.abs(geometry.cards.at(-1).right-geometry.right)<2,'Alerts fill widget width');
    if(count===1)assert(Math.abs(geometry.cards[0].w-geometry.width)<2,'One alert must use full width');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow');
    await page.screenshot({path:`${out}/dashboard-${width}-${count}-alerts.png`});results.push({name:'Alert layout',width,count,passed:true});
   }
  }
  // Check actual computed colors, not only the token-selection arithmetic.
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   for(const mode of ['light','dark'])for(const color of await page.evaluate(()=>ACCENTS.map(x=>x[0]).concat(['#ffffff','#000000','#ffff00','#7f7f7f']))){
    await page.evaluate(({mode,color})=>{TPL.accent=color;theme(mode);go('dash')},{mode,color});
    const colors=await page.evaluate(()=>{const hero=document.querySelector('.hero'),hs=getComputedStyle(hero),chip=getComputedStyle(document.querySelector('.chip.on'));return {hero:[...hero.querySelectorAll('.lbl,.num,.sm')].map(e=>[getComputedStyle(e).color,hs.backgroundColor]),chip:[chip.color,chip.backgroundColor]}});
    for(const pair of [...colors.hero,colors.chip])assert(contrast(...pair)>=4.5,`Text contrast: ${width} ${mode} ${color} ${pair}`);
   }
   results.push({name:'Rendered summary and selected-filter contrast',width,accents:16,themes:2,passed:true});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>{TPL.accent='#00BCD4';theme('dark');go('dash')});
  await page.getByRole('button',{name:'Customize dashboard',exact:true}).click();
  await page.locator('.dashboard-option[data-id="sales"] input').uncheck();
  await page.locator('.dashboard-customizer [data-close]').last().click();
  await page.locator('.dashboard-customizer').waitFor({state:'detached'});
  assert.equal(await page.locator('[data-widget="sales"]').count(),1,'Cancel preserves dashboard');
  await page.getByRole('button',{name:'Customize dashboard',exact:true}).click();
  await page.locator('.dashboard-option[data-id="sales"] input').uncheck();
  await page.getByRole('button',{name:'Move Net profit up',exact:true}).click();
  await page.locator('[data-save]').click();await page.locator('.dashboard-customizer').waitFor({state:'detached'});
  assert.equal(await page.locator('[data-widget="sales"]').count(),0);
  let ids=await page.locator('[data-widget]').evaluateAll(nodes=>nodes.map(n=>n.dataset.widget));assert(ids.indexOf('profit')<ids.indexOf('stock'));
  await page.reload();await page.evaluate(()=>{USERS.length=0;S.user=null;go('dash')});
  assert.equal(await page.locator('[data-widget="sales"]').count(),0,'Visibility survives reload');
  ids=await page.locator('[data-widget]').evaluateAll(nodes=>nodes.map(n=>n.dataset.widget));assert(ids.indexOf('profit')<ids.indexOf('stock'),'Order survives reload');
  await page.getByRole('button',{name:'Customize dashboard',exact:true}).click();
  await page.locator('[data-reset]').click();await page.locator('[data-save]').click();await page.locator('.dashboard-customizer').waitFor({state:'detached'});
  assert.equal(await page.locator('[data-widget]').first().getAttribute('data-widget'),'sales');
  results.push({name:'Cancel, save, reorder, reload and restore defaults',passed:true});
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
