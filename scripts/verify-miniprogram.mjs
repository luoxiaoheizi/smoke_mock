import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await readFile(join(root,'project.config.json'),'utf8'));
const output=join(root,config.miniprogramRoot);
const app=JSON.parse(await readFile(join(output,'app.json'),'utf8'));
await access(join(output,'app.js'));
const tags=new Set(['view','text','canvas','button','picker','switch']);
for(const page of app.pages){
 for(const ext of ['js','json','wxml','wxss'])await access(join(output,page+'.'+ext));
 const script=await readFile(join(output,page+'.js'),'utf8');
 assert(!/require\(["'](?:node:|@smoke\/)/.test(script),'小程序中不允许 Node 或未打包的工作区导入');
 const wxml=await readFile(join(output,page+'.wxml'),'utf8');
 for(const [,tag] of wxml.matchAll(/<\/?([a-z][\w-]*)\b/g))assert(tags.has(tag),'未知的原生标签：'+tag);
 let definition;
 vm.runInNewContext(script,{Page:value=>definition=value,wx:{},console,setTimeout,clearTimeout,setInterval,clearInterval});
 for(const [,method] of wxml.matchAll(/(?:bind\w+|catch\w+)="([a-zA-Z]\w*)"/g))assert.equal(typeof definition[method],'function',page+' 缺少事件方法 '+method);
}
for(const tab of app.tabBar.list)assert(app.pages.includes(tab.pagePath),'Tab 必须指向已声明页面');
for(const audio of ['ignite','ash','end'])await access(join(output,'assets/audio/'+audio+'.wav'));
console.log('小程序产物检查通过：'+app.pages.length+' 个页面、事件绑定、原生标签、Tab 路由和音效资源完整。');

