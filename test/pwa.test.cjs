'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('manifesto atende à instalação Android',()=>{
 const m=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
 assert.equal(m.display,'standalone');
 assert.ok(m.name&&m.short_name);
 assert.ok(m.start_url.startsWith('/'));
 for(const px of [192,512]){
  const icon=m.icons.find(x=>x.type==='image/png'&&x.sizes===px+'x'+px);
  assert.ok(icon,'ícone PNG '+px+' ausente');
  const p=icon.src.replace(/^\//,'');
  const buf=fs.readFileSync(p);
  assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(buf.readUInt32BE(16),px);
  assert.equal(buf.readUInt32BE(20),px);
 }
});
test('service worker mantém navegação financeira fora do cache',()=>{
 const sw=fs.readFileSync('sw.js','utf8');
 assert.ok(sw.includes('event.request.method'));
 assert.ok(sw.includes('STATIC.includes(u.pathname)'));
 assert.ok(sw.includes('icon-192.png'));
 assert.ok(sw.includes('icon-512.png'));
});
