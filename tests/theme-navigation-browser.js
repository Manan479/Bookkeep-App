// Real-browser checks for the Android theme bridge contract and responsive navigation.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.BOOKKEEP_NODE_MODULES||process.cwd()]}));
const root=path.join(__dirname,'..'),out=path.join(root,'dist/theme-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.addInitScript(()=>{
   window.themeCalls=[];window.Appearance={setTheme:(background,dark)=>window.themeCalls.push({background,dark})};
  });
  await page.goto(pathToFileURL(path.join(root,'dist/bookkeep.html')).href);
  await page.evaluate(()=>{USERS.length=0;S.user=null;S.quiet=true;go('dash');theme('light');setAccent('#2196F3')});
  const verifyTheme=async dark=>{
   const result=await page.evaluate(()=>{
    const rgb=getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).slice(0,3).map(Number);
    return {expected:rgb2hex(rgb),last:window.themeCalls.at(-1)};
   });
   assert.equal(result.last.background,result.expected);assert.equal(result.last.dark,dark);
  };
  await verifyTheme(false);
  await page.evaluate(()=>{theme('dark');render()});await verifyTheme(true);
  await page.evaluate(()=>{theme('system');render()});
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(()=>window.themeCalls.at(-1).dark===true);await verifyTheme(true);
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(()=>window.themeCalls.at(-1).dark===false);await verifyTheme(false);
  assert.equal(await page.locator('.desktop-nav').isVisible(),true);
  assert.equal(await page.locator('.mobile-nav').isVisible(),false);
  assert.equal(await page.locator('.desktop-nav').getByText('More',{exact:true}).count(),0);
  assert.equal(await page.locator('.desktop-nav .nav-module').count(),18);
  await page.locator('.desktop-nav').getByText('Theme',{exact:true}).click();
  assert.equal(await page.evaluate(()=>S.screen),'th');
  assert.equal(await page.locator('.desktop-nav').isVisible(),true,'sidebar persists inside module');
  assert.equal(await page.locator('.desktop-nav [aria-current="page"]').innerText(),'Theme');
  await page.evaluate(()=>{theme('dark');render()});
  await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
  await page.screenshot({path:path.join(out,'desktop-theme.png')});
  await page.locator('.desktop-nav').getByText('Payments',{exact:true}).click();
  assert.equal(await page.evaluate(()=>S.screen),'pm');
  await page.evaluate(()=>{
   USERS.push({id:'restricted',n:'Reader',role:'viewer',active:true});S.user={id:'restricted',n:'Reader',role:'viewer'};go('dash');
  });
  assert.equal(await page.locator('.desktop-nav').getByText('Settings',{exact:true}).count(),0);
  assert.equal(await page.locator('.desktop-nav').getByText('Reports',{exact:true}).count(),1);
  await page.evaluate(()=>{USERS.length=0;S.user=null;go('dash')});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('.desktop-nav').isVisible(),false);
  assert.equal(await page.locator('.mobile-nav').getByRole('button',{name:'More',exact:true}).isVisible(),true);
  await page.locator('.mobile-nav').getByRole('button',{name:'More',exact:true}).click();
  const shortcut=page.locator('.appearance-shortcut');
  assert((await shortcut.boundingBox()).y<200,'Theme shortcut is near the top of More');
  await shortcut.click();
  assert.equal(await page.locator('.mobile-nav').count(),0,'phone forms retain their full viewport');
  await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
  await page.screenshot({path:path.join(out,'mobile-theme.png')});
  await page.getByRole('button',{name:'Light',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Light',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Emerald',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Emerald',exact:true}).getAttribute('aria-pressed'),'true');
  await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
  await page.screenshot({path:path.join(out,'mobile-theme-light.png')});
  await page.locator('input[type=color]').evaluate(input=>{input.value='#876543';input.dispatchEvent(new Event('change',{bubbles:true}))});
  assert.equal(await page.locator('.custom-hex').innerText(),'#876543');
  assert.equal(await page.locator('.accent-swatch.chosen').count(),0);
  await page.setViewportSize({width:320,height:740});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=320),true,'appearance fits a narrow phone');
  const swatches=await page.locator('.accent-swatch').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {w:r.width,h:r.height}}));
  assert(swatches.every(r=>r.w>=43.99&&r.h>=43.99),'mobile colour choices have 44px targets: '+JSON.stringify(swatches));
  await page.evaluate(()=>{S.lang='ur';render()});
  assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=320),true,'appearance fits Urdu RTL');
  assert.deepEqual(errors,[]);
  console.log('Theme bridge colours, live system appearance, full desktop sidebar, module navigation and mobile More passed.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
