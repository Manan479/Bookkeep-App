const assert=require('assert');
const path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.BOOKKEEP_NODE_MODULES]}));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage();await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.goto(pathToFileURL(path.resolve('dist/bookkeep.html')).href);
await page.evaluate(()=>{USERS.length=0;S.user=null;S.quiet=true;loadDemo();USERS.length=0;S.user=null});
let checks=0;
for(const width of [1440,1024,390])for(const type of ['sale','pur','qt'])for(const noDue of [false,true]){
await page.setViewportSize({width,height:1000});await page.evaluate(({type,noDue})=>{openScr('inv',type);S.noDue=noDue;render()},{type,noDue});
const fields=page.locator('.invoice-date-field');assert.equal(await fields.count(),2);
const a=await fields.nth(0).locator('.dbtn').boundingBox(),b=await fields.nth(1).locator('.dbtn').boundingBox();
assert(Math.abs(a.y-b.y)<1,JSON.stringify({width,type,noDue,a,b}));assert.equal(await fields.nth(1).locator('.dbtn').isDisabled(),noDue);
await fields.nth(1).locator('.date-optional').click();assert.equal(await page.evaluate(()=>S.noDue),!noDue);checks++;
}
await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>{openScr('inv','sale');theme('dark')});await page.waitForTimeout(350);await page.screenshot({path:'dist/invoice-date-fields.png'});console.log(`${checks} date alignment and toggle checks passed`);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

