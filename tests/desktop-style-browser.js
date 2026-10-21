// Check computed styles, rather than trusting declarations in competing media queries.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.BOOKKEEP_NODE_MODULES||process.cwd()]}));
const root=path.join(__dirname,'..'),out=path.join(root,'dist/desktop-style-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.goto(pathToFileURL(path.join(root,'dist/bookkeep.html')).href);
  await page.evaluate(()=>{USERS.length=0;S.user=null;S.quiet=true;loadDemo();theme('light');S.period='All time';go('dash')});
  const pages=[['dashboard',()=>go('dash')],['sales',()=>go('sales')],['payments',()=>moreGo('Payments')],
   ['reports',()=>moreGo('Reports')],['company',()=>moreGo('Company Profile')],['settings',()=>moreGo('Settings')],
   ['theme',()=>moreGo('Theme')],['invoice',()=>openScr('inv','sale')]];
  for(const [name,open] of pages){
   await page.evaluate(open);
   await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
   const sizes=await page.evaluate(()=>{
    const visible=element=>element.getBoundingClientRect().width>0&&element.getBoundingClientRect().height>0;
    const styles=selector=>Array.from(document.querySelectorAll(selector)).filter(visible).map(element=>{
     const css=getComputedStyle(element),rect=element.getBoundingClientRect();
     return {text:element.textContent.trim().slice(0,35),font:css.fontSize,w:rect.width,h:rect.height};
    });
    return {base:getComputedStyle(document.querySelector('.scr')).fontSize,
     titles:styles('.scr h1'),buttons:styles('.btn'),nav:styles('.desktop-nav .tab'),
     icons:styles('.desktop-nav .ui-icon,button.ic>.ui-icon'),labels:styles('.f small,.lbl,.sm'),
     inputs:styles('.f input,.skl,.dbtn'),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.equal(sizes.base,'14px',name+' body');
   assert(sizes.titles.every(s=>s.font==='24px'),name+' titles: '+JSON.stringify(sizes.titles));
   assert(sizes.buttons.every(s=>s.font==='14px'&&s.h>=40),name+' buttons: '+JSON.stringify(sizes.buttons));
   assert(sizes.nav.every(s=>s.font==='14px'),name+' navigation');
   assert(sizes.icons.every(s=>s.w===20&&s.h===20),name+' icons: '+JSON.stringify(sizes.icons));
   assert(sizes.labels.every(s=>s.font==='12px'),name+' labels: '+JSON.stringify(sizes.labels));
   assert(sizes.inputs.every(s=>s.font==='14px'),name+' inputs: '+JSON.stringify(sizes.inputs));
   assert.equal(sizes.overflow,false,name+' fits viewport');
   if(name==='sales'||name==='payments')assert.equal(await page.locator('.fab:visible').count(),0,name+' uses its header action without a duplicate floating button');
   await page.screenshot({path:path.join(out,name+'.png')});
  }
  await page.evaluate(()=>{moreGo('Company Profile');theme('dark');render()});
  await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
  await page.screenshot({path:path.join(out,'company-dark.png')});
  await page.evaluate(()=>{go('sales');exportSheet()});
  await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
  assert.equal(await page.locator('.sheet').evaluate(e=>getComputedStyle(e).fontSize),'14px','modal body');
  await page.screenshot({path:path.join(out,'export-modal.png')});
  await page.locator('.ov').evaluate(e=>e.remove());
  for(const width of [900,1180,1920]){
   await page.setViewportSize({width,height:1000});
   await page.evaluate(()=>moreGo('Theme'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'width '+width);
  }
  // At phone width the original compact controls and symbols retain their mobile sizing.
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>moreGo('Company Profile'));
  assert.equal(await page.locator('.top .ic').first().evaluate(e=>getComputedStyle(e).width),'38px');
  assert.equal(await page.locator('.top .ic .icon-original').first().isVisible(),true);
  assert.equal(await page.locator('.top .ic>.ui-icon').first().isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('Computed desktop type, controls and icon sizes agree across eight screens; modal, dark, narrow desktop and mobile checks passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
