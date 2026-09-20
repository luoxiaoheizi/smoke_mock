const { chromium } = require(process.argv[2] || 'playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.argv[3],headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../artifacts/preview/index.html')).href);
  await page.waitForFunction(()=>document.querySelectorAll('iframe').length===7);
  await page.waitForTimeout(700);
  for(const name of ['experience','shop','collection','product','settings','wallet','history']){
   const locator=page.locator('iframe[data-route="pages/'+name+'/index"]');
   await locator.screenshot({path:path.resolve(__dirname,'../artifacts/preview/'+name+'.png')});
  }
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('7 个页面视觉预览截图完成，无浏览器脚本错误。');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});

