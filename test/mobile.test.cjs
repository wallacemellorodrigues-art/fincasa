'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('assets mobile carregados pela aplicação',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.ok(html.includes('href="/mobile-v10.css"'));
 assert.ok(html.includes('src="/notifications-v10.js"'));
 assert.ok(html.includes('src="/features-v9.js"'));
});
test('layout modal Android é responsivo e tem áreas seguras',()=>{
 const css=fs.readFileSync('mobile-v10.css','utf8');
 assert.match(css,/100dvh/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/font-size:16px!important/);
 assert.match(css,/fc-mobile-nav/);
});
test('formulário rápido tem etiquetas e ações identificáveis',()=>{
 const js=fs.readFileSync('features-v9.js','utf8');
 for(const id of ['fcQuickKindValue','fcQuickAmount','fcQuickDesc','fcQuickDate','fcQuickOwner','fcQuickCategory','fcQuickPayment'])
  assert.ok(js.includes(id),id+' ausente');
 assert.ok(js.includes("type=\"button\" data-fc-type="));
});
test('dados do casal não são incorporados ao HTML estático',()=>{
 const s=fs.readFileSync('index.html','utf8');const p=s.slice(s.indexOf('\n<body>'),s.indexOf('<script id="fincasa-data"'));
 assert.ok(!/data:image\/[a-zA-Z0-9+.-]+;base64,/.test(p));
});
