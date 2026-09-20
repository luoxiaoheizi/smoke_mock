// 将真实 WXML/WXSS 和 Page 初始状态转换为只读浏览器视觉预览。
// 不是微信运行时，不替代微信开发者工具/真机验收。
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=join(root,'artifacts/preview');
await mkdir(out,{recursive:true});
const app=JSON.parse(await readFile(join(root,'apps/miniprogram/src/app.json'),'utf8'));
let baseCss=await readFile(join(root,'apps/miniprogram/src/app.wxss'),'utf8');
const toCss=css=>css.replace(/(-?\d*\.?\d+)rpx/g,(_,n)=>(Number(n)*.52)+'px').replace(/(^|\n)page\s*\{/g,'$1.screen {').replace(/\bview\b/g,'div').replace(/\btext(?=\s*[:{>,])/g,'span');
const pages=[];
for(const route of app.pages){
 const code=await readFile(join(root,'apps/miniprogram/dist',route+'.js'),'utf8');let definition;
 vm.runInNewContext(code,{Page:value=>{definition=value},wx:{},console,setTimeout,clearTimeout,setInterval,clearInterval});
 const data=JSON.parse(JSON.stringify(definition.data));data.loading=false;data.error='';data.coins=100;
 if(route.includes('experience'))Object.assign(data,{time:'10:16',period:'day',theme:'toilet',showStory:true,eventText:'点上一支烟，开启粑粑时间。'});
 pages.push({route,data,template:await readFile(join(root,'apps/miniprogram/src',route+'.wxml'),'utf8'),css:toCss(baseCss+'\n'+await readFile(join(root,'apps/miniprogram/src',route+'.wxss'),'utf8'))});
}
await build({entryPoints:[join(root,'apps/miniprogram/src/rendering/scene.ts')],outfile:join(out,'renderer.js'),bundle:true,format:'iife',globalName:'SmokeRenderer',target:'es2020'});
const html='<!doctype html><html><head><meta charset="utf-8"><title>此刻 · 页面视觉预览</title><style>body{margin:0;background:#d9ddd4;font-family:Arial,sans-serif}header{padding:24px 30px;color:#43533c}main{display:flex;gap:24px;padding:0 30px 30px;align-items:flex-start}iframe{width:390px;height:780px;border:0;border-radius:22px;box-shadow:0 12px 35px #23331825;flex-shrink:0}button,input{font:inherit}</style></head><body><header>此刻 / 页面视觉预览 · 使用真实模板与样式转换，非微信运行时</header><main id="previews"></main><script>window.previewPages='+JSON.stringify(pages).replaceAll('<','\\u003c')+'</script><script src="preview-runtime.js"></script></body></html>';
await writeFile(join(out,'index.html'),html);
await writeFile(join(out,'preview-runtime.js'),await readFile(join(root,'scripts/preview-runtime.js')));
console.log('预览生成至 artifacts/preview/index.html');
