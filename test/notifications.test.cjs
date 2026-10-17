'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {notifications,nextDue,daysTo}=require('../notifications-v10.js');
const make=()=>({settings:{},cards:[],bankMovements:[],transactions:[],expenses:[],actuals:[],budgets:{},imports:[]});
test('vencimento para mês seguinte e último dia ajustado',()=>{
 assert.equal(nextDue(10,'2026-10-16').date,'2026-11-10');
 assert.equal(nextDue(31,'2026-02-04').date,'2026-02-28');
 assert.equal(daysTo('2026-10-16','2026-10-19'),3);
});
test('alerta cartões próximos, sem afirmar pagamento pendente',()=>{
 const s=make();s.cards=[{id:'c',name:'Nubank',dueDay:18}];
 const a=notifications(s,'2026-10','2026-10-16');
 assert.ok(a.some(x=>x.kind==='card'&&x.body.includes('Confira se')));
});
test('pendência bancária não gera despesa duplicada',()=>{
 const s=make();s.bankMovements=[{status:'pending',amount:-88,description:'Fatura cartão'}];
 const a=notifications(s,'2026-10','2026-10-16');
 assert.ok(a.some(x=>x.kind==='bank'));
 assert.ok(!a.some(x=>/gasto.+88/.test(x.body)));
});
test('alerta orçamento reconhece comprometimento, não gasto realizado',()=>{
 const s=make();s.budgets={'Transporte':200};s.expenses=[{category:'Transporte',amount:180,startMonth:'2026-10',recurrence:'once'}];
 const list=notifications(s,'2026-10','2026-10-16');
 assert.ok(list.some(x=>x.kind==='budget'&&x.body.includes('Compromissos cadastrados')));
});
test('nenhuma entrada recente sugere revisão',()=>{
 const s=make();const arr=notifications(s,'2026-10','2026-10-16');
 assert.ok(arr.some(x=>x.kind==='reminder'&&x.title.includes('lançamentos')));
});
test('lançamento recente remove aviso de falta de inputs',()=>{
 const s=make();s.actuals=[{date:'2026-10-15'}];
 const arr=notifications(s,'2026-10','2026-10-16');
 assert.ok(!arr.some(x=>x.id.startsWith('input-')));
});
test('riscos do Advisor são apresentados sem inventar novos números',()=>{
 const a=notifications(make(),'2026-10','2026-10-16',[{title:'Renda pressionada',summary:'Atenção ao comprometimento'}]);
 assert.ok(a.some(x=>x.kind==='advisor'&&x.title==='Renda pressionada'));
});
test('sem movimentos mantém detalhes neutros',()=>{
 const s=make();s.cards=[{id:'c',name:'Cartão',dueDay:0}];
 assert.ok(!notifications(s,'2026-10','2026-10-16').some(x=>x.kind==='card'));
});
