'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {amountParse,toDate,rowsFromSheet,keyMovement,classify,detectColumns}=require('../features-v9.js');

test('valores brasileiros e sinal',()=>{
  assert.equal(amountParse('R$ 1.234,56'),1234.56);
  assert.equal(amountParse('-R$ 1.234,56'),-1234.56);
  assert.equal(amountParse('(1.234,56)'),-1234.56);
  assert.ok(Number.isNaN(amountParse('')));
});

test('datas do extrato',()=>{
  assert.equal(toDate('15/10/2026'),'2026-10-15');
  assert.equal(toDate('2026-10-16'),'2026-10-16');
  assert.equal(toDate('31/02/2026'),'');
});

test('extrato com colunas de entrada e saída',()=>{
  const rows=[
    ['Banco XYZ','Extrato'],
    ['Data','Descrição','Crédito','Débito'],
    ['15/10/2026','Pix recebido','150,00',''],
    ['16/10/2026','Posto de combustível','','125,90']
  ];
  const result=rowsFromSheet(rows);
  assert.equal(result.length,2);
  assert.equal(result[0].amount,150);
  assert.equal(result[1].amount,-125.9);
  assert.equal(result[0].unknown,false);
  assert.equal(result[1].unknown,false);
});

test('valor sem D/C deve pedir conferência',()=>{
  const result=rowsFromSheet([['Data','Histórico','Valor'],['16/10/2026','Movimentação','199,99']]);
  assert.equal(result[0].unknown,true);
});

test('sem cabeçalhos confiáveis falha sem importar',()=>{
 assert.equal(detectColumns([['qualquer','coisa'],['x','y']]),null);
 assert.throws(()=>rowsFromSheet([['qualquer','coisa'],['x','y']]));
});

test('deduplicação preserva ocorrências reais',()=>{
 const x={accountId:'conta1',date:'2026-10-16',description:'PIX TESTE',amount:-100,occurrence:1};
 assert.notEqual(keyMovement(x),keyMovement({...x,occurrence:2}));
 assert.equal(keyMovement(x),keyMovement({...x,description:' pix teste '}));
});
test('classificações preventivas',()=>{
 assert.equal(classify('Pagamento fatura Nubank',-125),'card_payment');
 assert.equal(classify('Transferencia entre contas',-100),'transfer');
 assert.equal(classify('Supermercado',-95),'expense');
 assert.equal(classify('Pix recebido',250),'income');
});
