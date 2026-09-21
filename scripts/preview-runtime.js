/* 开发视觉预览，模板表达式仅来自本项目可信源码。 */
window.renderPreview=function(page,existingFrame){
 const frame=existingFrame||document.createElement('iframe');frame.dataset.route=page.route;if(!existingFrame)document.querySelector('#previews').append(frame);
 const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0}.screen{--rpx:calc(100vw / 750);width:100%;min-height:100vh}view{display:block}text{display:inline}button{font-family:inherit;border:none;width:100%}button.small{width:auto}button:disabled{opacity:.6}input[type=checkbox]{accent-color:#516e48;width:36px;height:22px}'+page.css+'</style></head><body><div class="screen"></div></body></html>');doc.close();
 const evaluate=(s,ctx)=>Function('state','with(state){return ('+s+')}')(ctx);
 const interpolate=(value,ctx)=>value.replace(/{{([\s\S]*?)}}/g,(_,expr)=>{const r=evaluate(expr,ctx);return r==null?'':String(r)});
 const template=doc.createElement('template');template.innerHTML=page.template.replace(/<(view|text|canvas|picker|switch|image)([^>]*?)\/>/g,'<$1$2></$1>');
 function append(parent,nodes,ctx){let matched=false;
  for(const node of nodes){
   if(node.nodeType===3){parent.append(doc.createTextNode(interpolate(node.textContent,ctx)));continue;}
   if(node.nodeType!==1)continue;
   if(node.hasAttribute('wx:for')){
    const expr=node.getAttribute('wx:for').replace(/^{{|}}$/g,'');const list=evaluate(expr,ctx);
    list.forEach((item,index)=>{const copy=node.cloneNode(true);copy.removeAttribute('wx:for');append(parent,[copy],{...ctx,[node.getAttribute('wx:for-item')||'item']:item,[node.getAttribute('wx:for-index')||'index']:index});});continue;
   }
   if(node.hasAttribute('wx:if')){matched=!!evaluate(node.getAttribute('wx:if').replace(/^{{|}}$/g,''),ctx);if(!matched)continue;}
   else if(node.hasAttribute('wx:else')){if(matched)continue;matched=true;}
   else if(node.hasAttribute('wx:elif')){if(matched)continue;matched=!!evaluate(node.getAttribute('wx:elif').replace(/^{{|}}$/g,''),ctx);if(!matched)continue;}
   const tag=node.tagName.toLowerCase();const el=doc.createElement(tag==='view'?'div':tag==='text'?'span':tag==='picker'?'div':tag==='switch'?'input':tag==='image'?'img':tag);
   for(const attr of node.attributes){if(attr.name.startsWith('wx:')||attr.name.startsWith('bind')||attr.name.startsWith('catch'))continue;const value=interpolate(attr.value,ctx);if(attr.name==='disabled'){if(value==='true')el.setAttribute('disabled','');}else if(attr.name==='checked'){if(value==='true')el.setAttribute('checked','');}else el.setAttribute(attr.name,attr.name==='src' && value.startsWith('/assets/') ? value.slice(1) : value);}
   if(tag==='switch')el.setAttribute('type','checkbox');parent.append(el);append(el,[...node.childNodes],ctx);
  }
 }
 append(doc.querySelector('.screen'),[...template.content.childNodes],page.data);
 if(page.route.includes('experience')){
  const script=doc.createElement('script');script.src='renderer.js';script.onload=()=>{const canvas=doc.querySelector('canvas');const width=canvas.clientWidth,height=canvas.clientHeight;canvas.width=width*2;canvas.height=height*2;const c=canvas.getContext('2d');c.scale(2,2);new frame.contentWindow.SmokeRenderer.SceneRenderer().draw(c,width,height,{theme:page.data.theme||'toilet',period:page.data.period||'day',phase:page.data.phase||'ready',remaining:page.data.remaining??100,ash:0,color:page.data.color||'#d4c5aa',time:1000,exhaleAt:0,ashAt:0,highQuality:true});};doc.body.append(script);
 }
};
for(const page of window.previewPages)window.renderPreview(page);
