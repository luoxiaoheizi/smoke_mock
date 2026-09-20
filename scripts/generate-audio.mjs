// 原创短音效：确定性噪声与正弦包络合成，无第三方录音。
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','apps/miniprogram/src/assets/audio');
await mkdir(root,{recursive:true});
for(const [name,duration] of [['ignite',.42],['ash',.19],['end',.3]]){
 const rate=22050,count=Math.floor(rate*duration),buffer=Buffer.alloc(44+count*2);
 buffer.write('RIFF');buffer.writeUInt32LE(36+count*2,4);buffer.write('WAVE',8);buffer.write('fmt ',12);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(count*2,40);
 let seed=12345;
 for(let i=0;i<count;i++){const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1;
 let value=0;
 if(name==='ignite')value=noise*Math.exp(-t*90)*.6+noise*Math.exp(-Math.max(0,t-.08)*15)*.06;
 if(name==='ash')value=noise*(Math.exp(-t*120)+.5*Math.exp(-Math.abs(t-.07)*160))*.2;
 if(name==='end')value=noise*Math.sin(Math.PI*t/duration)*.05+Math.sin(t*330)*Math.exp(-t*35)*.08;
 buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+i*2);}
 await writeFile(join(root,name+'.wav'),buffer);
}
console.log('已生成 3 段原创操作音效。');

