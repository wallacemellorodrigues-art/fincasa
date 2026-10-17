'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const css=fs.readFileSync('sidebar-v11.css','utf8');
const source=fs.readFileSync('sidebar-v11.js','utf8');
function element(name){
 const classes=new Set();
 return {name,attributes:{},events:{},classList:{
  add(x){classes.add(x)},remove(x){classes.delete(x)},contains(x){return classes.has(x)},
  toggle(x,on){if(on===undefined)on=!classes.has(x);on?classes.add(x):classes.delete(x);return on}
 },setAttribute(k,v){this.attributes[k]=v},addEventListener(ev,cb){this.events[ev]=cb},
 append(...items){this.children=(this.children||[]).concat(items)},prepend(x){this.first=x},focus(){this.focused=true},inert:false,closest(){return null}};
}
function setup(width=390){
 const sidebar=element('sidebar'),toggle=element('toggle'),nav=element('nav'),body=element('body');
 const elements={sidebar,sidebarToggleBtn:toggle,fcMobileNav:nav};
 const doc={readyState:'complete',body,events:{},getElementById:id=>elements[id]||null,
  createElement:tag=>element(tag),addEventListener(type,fn){this.events[type]=fn}};
 body.appendChild=item=>{if(item.id)elements[item.id]=item};
 const win={innerWidth:width,events:{},addEventListener(type,fn){this.events[type]=fn}};
 let observer;
 class MutationObserverFake{constructor(fn){this.fn=fn;observer=this}observe(el,opt){this.target=el;this.options=opt}}
 vm.runInNewContext(source,{document:doc,window:win,MutationObserver:MutationObserverFake});
 return {sidebar,toggle,nav,body,doc,win,get backdrop(){return elements.fcSidebarBackdrop},get x(){return sidebar.first?.name==='div'?sidebar.first:null},observe:()=>observer.fn()};
}
test('CSS mobile abre menu na frente, só com .open',()=>{
 assert.match(css,/body \.side#sidebar\.open\s*\{/);
 assert.match(css,/transform:translateX\(-110%\)!important/);
 assert.match(css,/transform:translateX\(0\)!important/);
 assert.match(css,/body\.fc-sidebar-active \.fc-sidebar-backdrop/);
 assert.match(css,/z-index:3101!important/);
});
test('no Android menu inicia fechado e o botão é acessível',()=>{
 const a=setup();assert.equal(a.sidebar.classList.contains('open'),false);
 assert.equal(a.toggle.attributes['aria-expanded'],'false');
 assert.equal(a.sidebar.attributes['aria-hidden'],'true');
 assert.equal(a.body.classList.contains('fc-sidebar-active'),false);
});
test('tocar no fundo fecha e devolve foco ao botão',()=>{
 const a=setup();a.sidebar.classList.add('open');a.observe();
 assert.equal(a.toggle.attributes['aria-expanded'],'true');assert.equal(a.body.classList.contains('fc-sidebar-active'),true);
 a.backdrop.events.click();
 assert.equal(a.sidebar.classList.contains('open'),false);assert.equal(a.toggle.focused,true);
});
test('botão interno de fechar e tecla Escape recolhem menu',()=>{
 const a=setup();const close=a.sidebar.first;assert.equal(close.className,'fc-sidebar-close');
 assert.ok(close.children?.[1], 'botão de fechar presente');
 a.sidebar.classList.add('open');a.observe();a.doc.events.keydown({key:'Escape',preventDefault(){}});
 assert.equal(a.sidebar.classList.contains('open'),false);
 a.sidebar.classList.add('open');a.observe();
 const closeButton=a.sidebar.first.children[1];closeButton.events.click();
 assert.equal(a.sidebar.classList.contains('open'),false);
});
test('navegar no app recolhe menu sem persistir estados financeiros',()=>{
 const a=setup();a.sidebar.classList.add('open');a.observe();a.nav.events.click();
 assert.equal(a.sidebar.classList.contains('open'),false);
 assert.ok(!source.includes('saveState('));assert.ok(!source.includes('localStorage.setItem'));
});
test('ao expandir para desktop não deixa menu aberto nem oculta lateral',()=>{
 const a=setup();a.sidebar.classList.add('open');a.observe();a.win.innerWidth=1000;a.win.events.resize();
 assert.equal(a.sidebar.classList.contains('open'),false);
 assert.equal(a.sidebar.attributes['aria-hidden'],'false');
});
test('assets são carregados no HTML e atualizados no service worker',()=>{
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 assert.ok(html.includes('sidebar-v11.css'));assert.ok(html.includes('sidebar-v11.js'));
 assert.ok(sw.includes('/sidebar-v11.css'));assert.ok(sw.includes('/sidebar-v11.js'));
});
