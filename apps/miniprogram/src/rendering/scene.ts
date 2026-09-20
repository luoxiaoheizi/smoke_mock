/** 原创代码绘制的第一人称画面。微信与开发预览共用此渲染器。 */
export type Phase = 'ready' | 'lighting' | 'burning' | 'inhaling' | 'ashing' | 'extinguishing';
export interface SceneState {
  theme: 'toilet' | 'balcony'; period: 'day' | 'dusk' | 'night'; phase: Phase;
  remaining: number; ash: number; color: string; time: number; exhaleAt: number; ashAt: number;
  highQuality: boolean;
}
type C = WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D;
function fillGradient(c: C, x: number, y: number, w: number, h: number, a: string, b: string) {
  const g = c.createLinearGradient(x,y,x+w,y+h); g.addColorStop(0,a); g.addColorStop(1,b); c.fillStyle=g; c.fillRect(x,y,w,h);
}
function ellipse(c: C,x:number,y:number,rx:number,ry:number,color:string) { c.fillStyle=color; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fill(); }
function path(c:C, points:number[][], fill:string, stroke?:string) {
  c.beginPath(); points.forEach((p,i)=>{ if(i===0)c.moveTo(p[0]!,p[1]!); else if(p.length===6)c.bezierCurveTo(p[0]!,p[1]!,p[2]!,p[3]!,p[4]!,p[5]!); else c.lineTo(p[0]!,p[1]!); }); c.closePath(); c.fillStyle=fill; c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}
}
function line(c:C,x1:number,y1:number,x2:number,y2:number,color:string,width=1) { c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke(); }
function rounded(c:C,x:number,y:number,w:number,h:number,r:number,color:string) {
  c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.fillStyle=color;c.fill();
}
function balcony(c:C,s:SceneState){
  const day=s.period==='day', dusk=s.period==='dusk';
  fillGradient(c,0,0,390,760,day?'#668b92':dusk?'#675e69':'#162d3a',day?'#c1c6af':dusk?'#c8a186':'#577177');
  ellipse(c,310,150,day?33:20,day?33:20,day?'rgba(239,230,193,.4)':'rgba(225,215,181,.18)');
  for(let i=0;i<12;i++){
    const x=i*39-20, y=264+Math.sin(i*8)*37, h=220+Math.sin(i*9)*30;
    c.fillStyle=day?'#6c8585':'#29434c';c.fillRect(x,y,35,h);
    c.fillStyle=day?'rgba(201,220,211,.26)':'rgba(225,190,119,.54)';
    for(let row=0;row<8;row++)for(let col=0;col<3;col++)if((i*7+row*3+col)%5>1)c.fillRect(x+6+col*9,y+14+row*22,4,8);
  }
  fillGradient(c,0,419,390,130,'rgba(74,98,98,.04)','#1d343a');
  c.fillStyle='#172b2e';c.fillRect(0,389,390,12);
  line(c,0,390,390,390,'#627675',2);
  for(let x=17;x<390;x+=65){fillGradient(c,x,400,6,205,'#344c4f','#14282c');}
  c.fillStyle='#203337';c.fillRect(0,565,390,54);line(c,0,565,390,565,'#62706b',3);
  // 左侧盆栽，为场景增加近景深度。
  rounded(c,15,501,43,57,4,'#74624e');
  for(let i=0;i<7;i++){c.save();c.translate(37,510);c.rotate((i-3)*.29);ellipse(c,0,-29-i%3*6,6,36,'#344b3d');c.restore();}
  ellipse(c,260,571,38,11,'#101e22');ellipse(c,260,567,37,11,'#8d9a96');ellipse(c,260,567,28,6,'#35464a');
}
function toilet(c:C,s:SceneState){
  const dark=s.period==='night';
  fillGradient(c,0,0,390,760,dark?'#1d3033':'#516662',dark?'#354644':'#a0a592');
  // 隔间门、透光缝和透视侧墙。
  path(c,[[0,0],[45,58],[45,624],[0,692]],'#314b49');
  path(c,[[390,0],[344,58],[344,624],[390,692]],'#28413f');
  fillGradient(c,48,80,294,520,'#6b7d73','#455e58');
  c.fillStyle='rgba(10,25,24,.36)';c.fillRect(57,89,276,4);c.fillRect(56,91,3,495);c.fillRect(330,91,3,495);
  for(let y=182;y<583;y+=100)line(c,60,y,329,y,'rgba(209,213,185,.04)');
  c.fillStyle='#d6cfad';c.fillRect(47,600,297,4);
  ellipse(c,190,619,116,15,'rgba(235,219,157,.06)');
  // 门锁与小标牌。
  rounded(c,290,312,19,57,3,'#a7b3aa');ellipse(c,299,330,6,6,'#40554e');line(c,295,331,303,328,'#b7c6bb',3);
  rounded(c,142,226,105,32,3,'#435b53');c.font='10px sans-serif';c.fillStyle='#abb8a4';c.textAlign='center';c.fillText('给自己一点时间',195,246);
  // 左墙纸卷，不使用参考产品的任何图像资源。
  rounded(c,4,424,39,15,4,'#536862');ellipse(c,26,461,22,32,'#c3c4ad');ellipse(c,26,461,12,25,'#a3aa93');ellipse(c,26,461,5,12,'#6c806e');
  c.fillStyle='#c6c6b1';c.fillRect(31,452,12,62);line(c,32,511,43,511,'#9fa58e',1);
  fillGradient(c,0,626,390,134,'#364641','#15262a');
}
function hand(c:C,left:boolean) {
  const skin=c.createLinearGradient(-44,-77,49,91);
  skin.addColorStop(0,'#b99377');skin.addColorStop(.4,'#d2af8e');skin.addColorStop(1,'#8d6f59');
  // 指根、指尖、掌心和手腕为连续曲线，衣袖独立于皮肤。
  c.beginPath();c.moveTo(-37,103);c.bezierCurveTo(-39,65,-54,47,-45,11);c.bezierCurveTo(-44,-12,-45,-55,-29,-59);
  c.bezierCurveTo(-21,-60,-16,-48,-16,-24);c.lineTo(-15,-67);c.bezierCurveTo(-15,-82,-1,-84,3,-71);c.lineTo(10,-26);
  c.bezierCurveTo(15,-50,28,-45,30,-31);c.lineTo(34,9);c.bezierCurveTo(48,-5,62,2,59,15);
  c.bezierCurveTo(55,33,34,45,33,66);c.lineTo(36,105);c.closePath();c.fillStyle=skin;c.fill();c.strokeStyle='#8f745c';c.lineWidth=1;c.stroke();
  c.strokeStyle='rgba(106,73,54,.32)';c.lineWidth=1;
  for(let i=0;i<3;i++){c.beginPath();c.moveTo(-24+i*17,12+i*7);c.quadraticCurveTo(-9+i*15,27,0+i*12,24+i*9);c.stroke();}
  rounded(c,-12,-67,12,19,5,'#d9bda0');line(c,-9,-51,0,-51,'#b89175');
  c.beginPath();c.moveTo(-21,44);c.quadraticCurveTo(9,32,28,52);c.stroke();
  path(c,[[-44,79],[40,80],[65,190],[-73,190]],left?'#2b4146':'#2a373f');
  path(c,[[-44,79],[40,80],[43,99],[-48,100]],left?'#3e5759':'#48545a');
  for(let x=-36;x<40;x+=7)line(c,x,83,x+1,95,'rgba(170,179,168,.15)');
}
export class SceneRenderer {
  private rightPose=0;private leftPose=0;
  draw(c:C,width:number,height:number,s:SceneState){
    c.save();c.clearRect(0,0,width,height);c.scale(width/390,height/760);
    if(s.theme==='balcony')balcony(c,s);else toilet(c,s);
    const breathing=Math.sin(s.time*.0013)*1.4;
    this.rightPose+=(s.phase==='inhaling'?1-this.rightPose:-this.rightPose)*.13;
    this.leftPose+=(s.phase==='lighting'?1-this.leftPose:-this.leftPose)*.12;
    const ashMove=s.phase==='ashing'?Math.sin(s.time*.045)*4:0;
    const extinguish=s.phase==='extinguishing'?30:0;
    c.save();c.translate(105+this.leftPose*113,556-this.leftPose*100+breathing);c.rotate(.25-this.leftPose*.5);
    hand(c,true);
    const metal=c.createLinearGradient(-22,0,28,0);metal.addColorStop(0,'#7a827c');metal.addColorStop(.3,'#d2d4bd');metal.addColorStop(.7,'#a3ad9f');metal.addColorStop(1,'#66776d');
    rounded(c,-27,-83,49,87,7,'#7f9184');c.fillStyle=metal;c.fillRect(-25,-78,45,79);
    rounded(c,-27,-91,49,22,5,'#485d57');line(c,-20,-85,15,-85,'#c0c6b0',2);
    for(let i=0;i<4;i++)line(c,-20+i*9,-76,-20+i*9,-69,'#263e38',2);
    // 大拇指压住打火机，形成遮挡。
    path(c,[[22,0],[0,-10],[-12,-20,-7,-36,7,-30],[34,-17],[39,-6,33,5,22,0]],'#bd987b','#9e7d60');
    if(s.phase==='lighting'){
      const flicker=Math.sin(s.time*.03)*3;c.shadowColor='#edb46d';c.shadowBlur=25;
      path(c,[[-11,-94],[-22,-108,-8,-132+flicker,-7,-142],[-2,-125,15,-107,4,-95]],'#e8b25c');
      c.shadowBlur=0;ellipse(c,-5,-105,4,11,'#f4d991');
    }c.restore();
    c.save();c.translate(300+this.rightPose*45+ashMove,523+this.rightPose*95+extinguish+breathing);
    c.rotate(-.32-this.rightPose*.6+(s.phase==='ashing'?-.16:0));c.scale(1+this.rightPose*.14,1+this.rightPose*.14);
    // 烟支与持握指的分层。
    const top=-72-(s.remaining/100)*108;
    const paper=c.createLinearGradient(-15,0,-2,0);paper.addColorStop(0,'#b9b5a0');paper.addColorStop(.45,'#f1e8d0');paper.addColorStop(1,'#d5cbb3');
    c.fillStyle=paper;c.fillRect(-15,top,13,-25-top);c.fillStyle=s.color;c.fillRect(-15,-67,13,42);
    for(let i=0;i<10;i++)line(c,-14,-65+i*4,-3,-66+i*4,'rgba(136,111,73,.16)');
    if(s.phase!=='ready' && s.phase!=='lighting' && s.remaining>0){
      const amount=Math.min(s.ash,16);c.fillStyle='#858780';c.fillRect(-15,top,13,amount);
      for(let i=0;i<amount;i+=3)line(c,-14,top+i,-3,top+i+2,'#b9b6a5');
      c.fillStyle=s.phase==='inhaling'?'#efaa60':'#b5653e';c.shadowColor='#e3994f';c.shadowBlur=s.phase==='inhaling'?18:5;c.fillRect(-15,top+amount,13,3);c.shadowBlur=0;
      if(s.phase!=='inhaling' && s.phase!=='extinguishing')this.wisp(c,-8,top-1,s.time,s.highQuality,0);
    }
    hand(c,false);
    path(c,[[-23,-23],[-27,-36,-20,-44,-6,-39],[18,-28],[27,-16,14,-9,4,-13],[-23,-23]],'#cdaa88','#9f7e60');
    rounded(c,-22,-36,13,8,3,'#d9bda0');c.restore();
    const age=(s.time-s.exhaleAt)/1000;
    if(s.exhaleAt>0 && age>=0 && age<3.5){
      for(let i=0;i<(s.highQuality?12:6);i++){
        const x=205+Math.sin(i*2.3)*30+age*Math.sin(i)*22,y=650-age*(70+i*6);
        const r=14+age*22+i*2;
        const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(222,226,213,'+(Math.max(0,1-age/3.5)*.07)+')');g.addColorStop(1,'rgba(222,226,213,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
      }
    }
    if(s.ashAt>0 && s.time-s.ashAt<900){const t=(s.time-s.ashAt)/1000;for(let i=0;i<7;i++){c.fillStyle='#a6a491';c.fillRect(251+Math.sin(i*9)*12+t*i*9,404+t*t*200+i*3,2,3);}}
    const vignette=c.createRadialGradient(195,380,130,195,380,470);vignette.addColorStop(0,'rgba(8,17,19,0)');vignette.addColorStop(1,'rgba(8,17,19,.6)');c.fillStyle=vignette;c.fillRect(0,0,390,760);
    c.restore();
  }
  private wisp(c:C,x:number,y:number,time:number,high:boolean,offset:number){
    const count=high?3:1;
    for(let i=0;i<count;i++){c.beginPath();c.moveTo(x+i*2,y);for(let j=1;j<15;j++){const yy=y-j*9;c.lineTo(x+Math.sin(time*.0018+j*.5+i)*j*.7,yy);}c.strokeStyle='rgba(211,220,210,'+(.1-i*.025)+')';c.lineWidth=1.7+i;c.stroke();}
  }
}

