const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
const modules=[process.env.BOOKKEEP_NODE_MODULES||process.cwd()];
const {chromium}=require(require.resolve('playwright',{paths:modules}));
const {PDFDocument}=require(require.resolve('pdf-lib',{paths:modules}));
const root=path.join(__dirname,'..'),out=path.join(root,'dist/invoice-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.goto(pathToFileURL(path.join(root,'dist/bookkeep.html')).href);
  const number=await page.evaluate(()=>{
   USERS.length=0;S.user=null;S.quiet=true;loadDemo();theme('light');S.cur='Rs ';S.fmt='A4';
   COMP.name='Pak Medical & Services';COMP.addr='83 Poonch Rd, Samanabad, Lahore';COMP.phone='03228008308';TPL.accent='#4055c5';
   const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;const ctx=canvas.getContext('2d');ctx.fillStyle='#d90020';ctx.beginPath();ctx.arc(50,50,45,0,Math.PI*2);ctx.fill();ctx.fillStyle='white';ctx.font='bold 40px sans-serif';ctx.fillText('PM',16,64);COMP.logo=canvas.toDataURL('image/png');
   const no=PUR.find(row=>!INVD[row[0]].void)[0];openInv(no);S.screen='prev';render();return no;
  });
  assert.equal(await page.locator('.paper').getByText('No: '+number,{exact:true}).count(),1,'preview uses actual opened document number');
  await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
  await page.screenshot({path:path.join(out,'preview.png')});
  await page.evaluate(()=>{
   const capture=window.html2canvas;window.paperCaptures=[];
   window.html2canvas=(paper,options)=>{window.paperCaptures.push({html:paper.innerHTML,font:paper.style.fontFamily,size:paper.style.fontSize,classes:paper.className});return capture(paper,options)};
  });
  const previewHtml=await page.locator('.paper').evaluate(p=>p.innerHTML);
  await page.locator('.bar-act').getByRole('button',{name:'Share PDF',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-doc-save]')&&!document.querySelector('[data-doc-save]').disabled);
  assert.equal(await page.evaluate(()=>window.paperCaptures.at(-1).html),previewHtml,'export captures the exact preview markup');
  const pending=page.waitForEvent('download');await page.locator('[data-doc-save]').click();
  await (await pending).saveAs(path.join(out,'matching-preview.pdf'));
  const first=await PDFDocument.load(fs.readFileSync(path.join(out,'matching-preview.pdf')));
  assert.equal(first.getPageCount(),1);assert(Math.abs(first.getPage(0).getWidth()-595.28)<.1);
  await page.locator('[data-doc-close]').click();await page.locator('.ov.off').waitFor({state:'detached'});
  await page.evaluate(()=>{TPL.font='serif';TPL.textScale=1.2;TPL.paperStyle='bold';TPL.density='spacious';S.fmt='A5';render()});
  await page.locator('.bar-act').getByRole('button',{name:'Share PDF',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('[data-doc-save]').disabled);
  const custom=await page.evaluate(()=>window.paperCaptures.at(-1));
  assert.equal(custom.font,'Georgia, serif');assert(Math.abs(parseFloat(custom.size)-14.4)<.01);assert(custom.classes.includes('paper-style-bold'));
  const secondDownload=page.waitForEvent('download');await page.locator('[data-doc-save]').click();await (await secondDownload).saveAs(path.join(out,'custom-a5.pdf'));
  const second=await PDFDocument.load(fs.readFileSync(path.join(out,'custom-a5.pdf')));assert(Math.abs(second.getPage(0).getWidth()-419.53)<.1);
  await page.locator('[data-doc-close]').click();await page.locator('.ov.off').waitFor({state:'detached'});
  await page.evaluate(()=>{moreGo('Theme')});assert.equal(await page.locator('.theme-live-preview').count(),0);
  await page.evaluate(()=>{moreGo('Settings')});await page.getByRole('button',{name:'Invoice appearance and templates',exact:true}).click();
  assert.equal(await page.locator('select[aria-label="Invoice text size"]').count(),1);
  await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
  await page.screenshot({path:path.join(out,'invoice-settings.png')});
  // Use an unlinked invoice to verify the two-stage removal chooser in the real browser.
  await page.evaluate(()=>{
   openScr('inv','sale');S.cust=CUST[0];S.items=[{n:'Removal test',q:1,r:5,d:0,dt:'amt',tx:0,tt:'pct',s:0}];post();window.removalNo=S.lastNo;openInv(S.lastNo);invMenu();
  });
  await page.locator('[data-a="void"]').click();
  assert.equal(await page.locator('[data-remove-mode="void"]').count(),1);assert.equal(await page.locator('[data-remove-mode="delete"]').count(),1);
  await page.locator('[data-remove-mode="delete"]').click();
  assert.equal(await page.evaluate(()=>!!INVD[window.removalNo]),true,'chooser cannot delete before final confirmation');
  await page.locator('.ov:not(.off)').getByRole('button',{name:'Delete permanently',exact:true}).click();
  assert.equal(await page.evaluate(()=>!!INVD[window.removalNo]),false,'confirmed deletion removes invoice');
  assert.equal(await page.evaluate(()=>ledHealthy().diff),0);
  assert.deepEqual(errors,[]);
  console.log('PDF captures exact preview markup, custom A5 styling, correct invoice number, Settings controls and explicit removal choices passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
