// Focused checks for the October 23 layout review. Uses disposable demo data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.BOOKKEEP_NODE_MODULES]}));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const results=[],errors=[];
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.goto(pathToFileURL(path.resolve('dist/bookkeep.html')).href);
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
  await page.evaluate(()=>{USERS.length=0;S.user=null;S.quiet=true;loadDemo();USERS.length=0;S.user=null;S.dist=true;S.period='All time'});
  for(const width of [1440,900,390,320]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(()=>{S.lang='en';theme('light');moreGo('Templates')});
   await page.getByRole('button',{name:'Open full preview',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'Invoice preview'});
   await dialog.waitFor();
   const fit=await dialog.locator('.paperwrap').evaluate(e=>e.getBoundingClientRect().width);
   await dialog.getByRole('button',{name:'Actual size',exact:true}).click();
   const zoom=await dialog.locator('.paperwrap').evaluate(e=>e.getBoundingClientRect().width);
   assert(zoom>=fit&&zoom>700,'Preview zoom must show actual A4 width');
   await dialog.getByRole('button',{name:'Fit to screen',exact:true}).click();
   assert(Math.abs(await dialog.locator('.paperwrap').evaluate(e=>e.getBoundingClientRect().width)-fit)<2);
   await page.keyboard.press('Escape');await page.locator('.template-preview-dialog').waitFor({state:'detached'});assert.equal(await dialog.count(),0);
   assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Open full preview');
   await page.evaluate(()=>moreGo('Settings'));
   const jumps=page.locator('.settings-jumps button');assert(await jumps.count()>2);
   await jumps.last().click();
   assert(await page.evaluate(()=>document.querySelector('.scr').scrollTop>0));
   await page.evaluate(()=>newParty());
   if(width>=900)assert(await page.evaluate(()=>document.getElementById('app').classList.contains('bounded-workspace')));
   await page.evaluate(()=>{S.xk=EXP[0];S.screen='exd';render()});
   await page.screenshot({path:`dist/layout-review/fixed-expense-detail-${width}.png`});
   if(width<900)assert(await page.locator('.record-header-actions').evaluate(e=>e.getBoundingClientRect().top>e.parentElement.querySelector('h1').getBoundingClientRect().top));
   await page.evaluate(()=>{S.qk=QUOT[0].no;S.screen='qd';render()});
   assert.equal(await page.getByRole('button',{name:'Edit',exact:true}).count(),1);
   await page.evaluate(()=>{moreGo('Reports');openRpt('pl')});
   if(width>=900)assert(await page.locator('.scr>.top [onclick="exportSheet()"]').isVisible());
   for(const name of ['Payments','Expenses','Journal','Parties']){
    await page.evaluate(name=>moreGo(name),name);
    const data=await page.evaluate(()=>{const search=document.querySelector('.shead>.search'),period=document.querySelector('.shead>.chips');return{ordered:!search||!period||search.getBoundingClientRect().top<period.getBoundingClientRect().top,create:!!document.querySelector('.top>.desktop-create,.top>.deskonly.btn.p')}});
    assert(data.ordered,`${name} search before period`);
    if(width>=900)assert(data.create,`${name} header create button`);
   }
   await page.evaluate(()=>{S.lang='ur';theme('dark');go('sales')});
   assert(await page.locator('.scr bdi[dir=ltr]').count()>0);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   results.push({width,passed:true});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync('dist/layout-review/regression.json',JSON.stringify({results,errors},null,2));
  console.log(JSON.stringify({results,errors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
