'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('HTML carrega módulo e manifesto',()=>{
 const s=fs.readFileSync('index.html','utf8');
 assert.ok(s.includes('<script src="/features-v9.js"></script>'));
 assert.ok(s.includes('href="/manifest.webmanifest"'));
});
test('HTML inicial não incorpora fotos em base64 nem saldos pré-renderizados',()=>{
 const s=fs.readFileSync('index.html','utf8');
 const body=s.slice(s.indexOf('\n<body>'),s.indexOf('<script id="fincasa-data"'));
 assert.ok(!/data:image\/[a-zA-Z0-9+.-]+;base64,/.test(body));
 assert.ok(!/R\$(?:&nbsp;|\s)*[\d.]+/.test(body));
});
