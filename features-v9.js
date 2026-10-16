/* FinCasa 9 - contas, conciliação e lançamento rápido; extension without destructive migrations */
(function fincasaV9(){
'use strict';
const $q=id=>document.getElementById(id);
const h=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reais=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const newid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
const isoDate=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const safeState=()=>typeof state!=='undefined'&&state&&typeof state==='object';
const month=()=>($q('monthSel')?.value||new Date().toISOString().slice(0,7));
let draftImport=null;
function initArrays(){if(!safeState())return false;for(const key of ['bankAccounts','bankMovements'])if(!Array.isArray(state[key]))state[key]=[];return true}
function amountParse(v){
 if(typeof v==='number')return Number.isFinite(v)?v:NaN;
 let t=String(v??'').trim().replace(/[R$\s]/g,'');const negative=/^\(|^-|-$/.test(t);t=t.replace(/[()]/g,'').replace(/[+\-]/g,'');
 if(!/\d/.test(t))return NaN;
 const c=t.lastIndexOf(','),d=t.lastIndexOf('.');
 if(c>=0&&d>=0)t=c>d?t.replace(/\./g,'').replace(',','.'):t.replace(/,/g,'');
 else if(c>=0)t=t.replace(/\./g,'').replace(',','.');
 else if(d>=0&&/^\d{1,3}(?:\.\d{3})+$/.test(t))t=t.replace(/\./g,'');
 t=t.replace(/[^0-9.]/g,'');const n=Number(t);return Number.isFinite(n)?(negative?-n:n):NaN;
}
function toDate(v){
 if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);
 if(typeof v==='number'&&v>35000&&v<90000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10)}
 const t=String(v??'').trim();let m=t.match(/^(\d{4})-(\d\d)-(\d\d)/);if(m)return m[0];
 m=t.match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/);
 if(!m)return '';let y=m[3]?+m[3]:new Date().getFullYear();if(y<100)y+=y>70?1900:2000;
 const d=new Date(Date.UTC(y,+m[2]-1,+m[1]));return d.getUTCFullYear()===y&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[1]?d.toISOString().slice(0,10):'';
}
function keyMovement(x){return [x.accountId,x.date,normal(x.description),Number(x.amount).toFixed(2),x.occurrence||1].join('|')}
function classify(desc,amount){const n=normal(desc);
 if(/fatura|pagamento cartao|pagamento de cartao|credito cartao/.test(n))return 'card_payment';
 if(/transferencia entre contas|resgate investimento|aplicacao investimento/.test(n))return 'transfer';
 if(/reembolso/.test(n))return 'reimbursement';
 return amount>0?'income':'expense';
}
function category(desc){if(typeof inferCategory==='function')return inferCategory(desc,Math.abs(1));return 'Outros'}
function afterSave(){renderAll();if(typeof notify==='function')notify('Alterações registradas.','success')}
function mount(){
 if($q('bankAccountsSection'))return;
 const nav=document.querySelector('.nav');
 const link=document.createElement('a');link.href='#bankAccountsSection';link.innerHTML='Contas &amp; Extratos <span>09+</span>';
 nav?.querySelector('a[href="#parcelamentos"]')?.before(link);
 const sec=document.createElement('section');sec.className='section';sec.id='bankAccountsSection';
 sec.innerHTML=`<div class="section-head"><div><h2>Contas bancárias &amp; extratos</h2><p>Organize as contas, importe movimentações e concilie cada lançamento sem contar gastos duas vezes.</p></div><div class="actions"><button class="btn" id="f9AddBank">＋ Conta</button><button class="btn accent" id="f9Import">📥 Importar extrato</button></div></div><div id="f9Dashboard"></div><div id="f9Transactions"></div>`;
 ($q('cartoes')||document.querySelector('main'))?.insertAdjacentElement('afterend',sec);
 // Sections are direct children of main; keep bank section inside main rather than beside it.
 const main=document.querySelector('main.main');if(main&&sec.parentNode!==main)main.append(sec);
 const css=document.createElement('style');css.id='f9css';
 css.textContent=`#bankAccountsSection .f9-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:16px 0}#bankAccountsSection .f9-card{border:1px solid #dbe4ef;border-radius:18px;background:#fff;padding:20px;box-shadow:0 10px 24px rgba(25,43,71,.05)}#bankAccountsSection .f9-head{display:flex;align-items:center;justify-content:space-between;gap:8px}#bankAccountsSection .f9-bank{font-size:18px;font-weight:800}#bankAccountsSection .f9-secondary{font-size:13px;color:#66758b}#bankAccountsSection .f9-stat{font-size:24px;font-weight:900;margin:12px 0}#bankAccountsSection .f9-wrap{overflow-x:auto;border:1px solid #dce4ef;border-radius:14px;background:white}#bankAccountsSection .f9-table{width:100%;min-width:730px;border-collapse:collapse;text-align:left}#bankAccountsSection .f9-table th,#bankAccountsSection .f9-table td{padding:12px;border-bottom:1px solid #e6eaf1;font-size:13px}#bankAccountsSection .f9-chips{display:flex;flex-wrap:wrap;gap:8px;margin:15px 0}.f9-chip{border-radius:9px;background:#e9f1ff;color:#29426a;padding:7px 10px;font-size:13px;font-weight:700}.f9-warning{padding:12px;border-left:4px solid #e5a63d;background:#fff9ed;border-radius:9px;margin:12px 0;font-size:13px}.f9-quick-btn{position:fixed;bottom:22px;right:24px;z-index:120;border:0;border-radius:32px;background:#1c4f93;color:white;font-weight:800;font-size:15px;padding:14px 21px;box-shadow:0 8px 25px #0b315249;cursor:pointer}.f9-preview{max-height:320px;overflow:auto;border:1px solid #e4eaf1;border-radius:10px}.f9-preview table{border-collapse:collapse;width:100%;min-width:590px}.f9-preview th,.f9-preview td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:12px}.f9-preview select{max-width:150px;padding:7px;border-radius:7px;border:1px solid #ccd3df}.f9-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}.f9-toolbar select{padding:9px;border-radius:9px;border:1px solid #d4ddea}#f9Advisor{margin-top:12px;border:1px solid #dfe8f3;border-radius:12px;background:#f6f9ff;padding:14px;color:#274268;font-size:13px;line-height:1.5}@media(max-width:820px){.f9-quick-btn{bottom:15px;right:14px;padding:16px 20px;font-size:16px}#bankAccountsSection .f9-stat{font-size:22px}#bankAccountsSection .section-head{display:block}}`;
 document.head.appendChild(css);
 const quick=document.createElement('button');quick.className='f9-quick-btn';quick.type='button';quick.textContent='＋ Lançar rápido';quick.onclick=openQuick;document.body.appendChild(quick);
 $q('f9AddBank').onclick=openAccount;
 $q('f9Import').onclick=openImport;
 // A visible in-app install explanation works on both Android and iOS without assuming browser install support.
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('/sw.js').catch(()=>{});
}
function renderBank(){
 if(!$q('f9Dashboard')||!initArrays())return;
 const ac=state.bankAccounts.filter(a=>!a.archived),mov=state.bankMovements||[];
 const pending=mov.filter(x=>x.status!=='reconciled').length, matched=mov.filter(x=>x.status==='reconciled').length;
 $q('f9Dashboard').innerHTML=`<div class="f9-chips"><span class="f9-chip">${ac.length} conta(s)</span><span class="f9-chip">${mov.length} movimentação(ões)</span><span class="f9-chip">${pending} aguardando conciliação</span><span class="f9-chip">${matched} conciliadas</span></div><div class="f9-grid">${ac.length?ac.map(a=>{const rows=mov.filter(x=>x.accountId===a.id),credit=rows.filter(x=>x.amount>0).reduce((n,x)=>n+x.amount,0),debit=rows.filter(x=>x.amount<0).reduce((n,x)=>n-x.amount,0);return `<div class="f9-card"><div class="f9-head"><div class="f9-bank">${h(a.bank)}</div><button class="btn tiny" data-f9-edit="${h(a.id)}">Editar</button></div><div class="f9-secondary">${h(a.name||'Conta')} • ${h(a.owner||'Casa')}${a.last4?' •••• '+h(a.last4):''}</div><div class="f9-secondary" style="margin-top:12px">Saldo informado manualmente</div><div class="f9-stat">${a.reportedBalance==null?'—':reais(a.reportedBalance)}</div><div class="f9-secondary">Entradas importadas: <b>${reais(credit)}</b></div><div class="f9-secondary">Saídas importadas: <b>${reais(debit)}</b></div></div>`}).join(''):'<div class="f9-card">Cadastre a primeira conta de vocês para habilitar a importação de extratos.</div>'}</div><div class="f9-warning">Os extratos são registros bancários. Somente movimentações conciliadas como novas receitas/despesas entram nos indicadores do orçamento. Transferências, pagamentos de faturas e reembolsos vinculados não são somados novamente.</div>`;
 $q('f9Dashboard').querySelectorAll('[data-f9-edit]').forEach(b=>b.onclick=()=>openAccount(b.getAttribute('data-f9-edit')));
 const filter=$q('f9CurrentFilter')?.value||'all';
 const rows=mov.slice().filter(x=>filter==='all'||(filter==='pending'?x.status!=='reconciled':x.accountId===filter)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,250);
 const acopts=ac.map(a=>`<option value="${h(a.id)}" ${filter===a.id?'selected':''}>${h(a.bank)} — ${h(a.name)}</option>`).join('');
 $q('f9Transactions').innerHTML=`<div class="section-head"><div><h3>Movimentações bancárias</h3><p>Confira o extrato e vincule cada valor a uma operação existente ou crie uma nova classificação.</p></div></div><div class="f9-toolbar"><label for="f9CurrentFilter">Mostrar</label><select id="f9CurrentFilter"><option value="all">Todas</option><option value="pending" ${filter==='pending'?'selected':''}>Pendentes</option>${acopts}</select></div><div class="f9-wrap"><table class="f9-table"><thead><tr><th>Data</th><th>Conta</th><th>Descrição</th><th>Entrada / Saída</th><th>Classificação</th><th>Ação</th></tr></thead><tbody>${rows.length?rows.map(t=>{const a=ac.find(a=>a.id===t.accountId);return `<tr><td>${h(t.date?.split('-').reverse().join('/')||'—')}</td><td>${h(a?.bank||'Conta')}</td><td><b>${h(t.description)}</b><br><span class="f9-secondary">${h(t.origin||'extrato')}</span></td><td style="color:${t.amount<0?'#be394b':'#247e56'}"><b>${reais(t.amount)}</b></td><td>${t.status==='reconciled'?'✓ '+h(t.classification||'Conciliado'):'Aguardando revisão'}</td><td><button class="btn tiny" data-f9-review="${h(t.id)}">${t.status==='reconciled'?'Detalhes':'Conciliar'}</button></td></tr>`}).join(''):'<tr><td colspan="6">Nenhuma movimentação nesta seleção.</td></tr>'}</tbody></table></div>`;
 $q('f9CurrentFilter').onchange=renderBank;
 $q('f9Transactions').querySelectorAll('[data-f9-review]').forEach(b=>b.onclick=()=>reviewMovement(b.getAttribute('data-f9-review')));
 renderBankAdvisor();
}
function renderBankAdvisor(){
 const el=$q('advisorShell');if(!el||!initArrays())return;
 let box=$q('f9Advisor');if(!box){box=document.createElement('div');box.id='f9Advisor';el.appendChild(box)}
 const mm=month(),ms=state.bankMovements.filter(x=>x.date?.startsWith(mm)),pending=ms.filter(x=>x.status!=='reconciled'),credits=ms.filter(x=>x.amount>0).reduce((a,x)=>a+x.amount,0),debits=ms.filter(x=>x.amount<0).reduce((a,x)=>a-x.amount,0);
 box.innerHTML=`<b>🏦 Leitura bancária do mês</b> • ${ms.length} movimentos importados (${pending.length} pendentes). Entradas ${reais(credits)} e saídas ${reais(debits)} nos extratos cadastrados. ${pending.length?'Concilie os itens pendentes antes de usar essas movimentações para decisões de orçamento.':'Sem pendências bancárias nesta competência.'} Valores de movimentação não são necessariamente receitas ou despesas.`;
}
function openAccount(id){
 initArrays();const x=state.bankAccounts.find(a=>a.id===id)||{id:'',bank:'',name:'Conta corrente',owner:state.settings.person1,last4:'',reportedBalance:null};
 openModal(id?'Editar conta bancária':'Cadastrar conta bancária',`<form id="f9AccountForm"><div class="form-grid"><div class="field"><label>Banco / instituição</label><input name="bank" required maxlength="80" value="${h(x.bank)}" placeholder="Ex.: Nubank"></div><div class="field"><label>Nome da conta</label><input name="name" required maxlength="80" value="${h(x.name)}"></div><div class="field"><label>Titular</label><select name="owner">${[state.settings.person1,state.settings.person2,'Casa'].map(a=>`<option ${a===x.owner?'selected':''}>${h(a)}</option>`).join('')}</select></div><div class="field"><label>Últimos 4 dígitos (opcional)</label><input name="last4" maxlength="4" pattern="[0-9]{0,4}" value="${h(x.last4)}"></div><div class="field"><label>Saldo informado (opcional)</label><input name="balance" inputmode="decimal" placeholder="0,00" value="${x.reportedBalance==null?'':h(x.reportedBalance)}"></div><div class="field full"><small>Saldo manual informativo, não será calculado automaticamente a partir de extratos incompletos. Não informe agência, número completo, CPF nem senhas.</small></div></div><div class="form-actions"><button class="btn" type="button" onclick="closeModal()">Cancelar</button><button class="btn accent" type="submit">Salvar conta</button></div></form>`);
 $q('f9AccountForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const v=f.get('balance').trim(),balance=v===''?null:amountParse(v);if(v!==''&&!Number.isFinite(balance))return notify('Saldo inválido','error');const obj={...x,id:x.id||newid('bank'),bank:f.get('bank').trim(),name:f.get('name').trim(),owner:f.get('owner'),last4:f.get('last4').trim(),reportedBalance:balance,updatedAt:new Date().toISOString()};if(x.id)state.bankAccounts=state.bankAccounts.map(a=>a.id===x.id?obj:a);else state.bankAccounts.push(obj);closeModal();afterSave()};
}
function detectColumns(rows){
 for(let i=0;i<Math.min(rows.length,35);i++){
  const a=(rows[i]||[]).map(normal),find=re=>a.findIndex(v=>re.test(v));
  const date=find(/\bdata\b|data lanc|dt\.?\s*mov/),desc=find(/descri|hist[oó]ric|lan[cç]amento|detalhe|opera[cç]/),amount=find(/^valor$|^valor \(|^montante$|^quantia$/),deb=find(/d[eé]bit|^saida|^sa[ií]das$/),cred=find(/cr[eé]dit|^entrada|^entradas$/),type=find(/tipo|natureza|^d\/c$/);
  if(date>=0&&desc>=0&&(amount>=0||deb>=0||cred>=0))return {row:i,date,desc,amount,deb,cred,type};
 }
 return null;
}
function rowsFromSheet(rows){
 const columns=detectColumns(rows);if(!columns)throw new Error('Não identifiquei com segurança as colunas de data, descrição e valores. Exporte um extrato com cabeçalhos claros.');
 const items=[];for(const row of rows.slice(columns.row+1)){
  const d=toDate(row[columns.date]),descr=String(row[columns.desc]??'').trim();
  if(!d||descr.length<2)continue;
  const debit=columns.deb<0?NaN:amountParse(row[columns.deb]),credit=columns.cred<0?NaN:amountParse(row[columns.cred]);
  const hasDebit=Number.isFinite(debit)&&Math.abs(debit)>.001,hasCredit=Number.isFinite(credit)&&Math.abs(credit)>.001;
  let amount=NaN,unknown=false;
  if(hasDebit&&!hasCredit)amount=-Math.abs(debit);
  else if(hasCredit&&!hasDebit)amount=Math.abs(credit);
  else if(columns.amount>=0){
    const raw=String(row[columns.amount]??'');amount=amountParse(row[columns.amount]);if(!Number.isFinite(amount)||amount===0)continue;
    const ty=columns.type<0?'':normal(row[columns.type]);
    if(/deb|saida|^d$/.test(ty))amount=-Math.abs(amount);
    else if(/cred|entrada|^c$/.test(ty))amount=Math.abs(amount);
    else if(!/[-+()]/.test(raw))unknown=true;
  }
  if(!Number.isFinite(amount)||Math.abs(amount)<.001)continue;
  items.push({date:d,description:descr.slice(0,250),amount:Math.round(amount*100)/100,unknown});
 }
 return items;
}
async function rowsFromPdf(file){
 if(!window.pdfjsLib)throw new Error('O leitor de PDF não está disponível neste dispositivo.');
 const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,rows=[];
 for(let i=1;i<=Math.min(pdf.numPages,100);i++){
  const page=await pdf.getPage(i),content=await page.getTextContent(),lines=new Map();
  for(const item of content.items||[]){if(!item.str)continue;const y=Math.round(item.transform?.[5]||0);if(!lines.has(y))lines.set(y,[]);lines.get(y).push({x:item.transform?.[4]||0,t:item.str})}
  for(const ln of [...lines.values()].sort((a,b)=>b[0].t-a[0].t)){const str=ln.sort((a,b)=>a.x-b.x).map(x=>x.t).join(' ').replace(/\s+/g,' ').trim();const m=str.match(/(?:^|\s)(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+([+\-]?\s*(?:R\$\s*)?[\d.]+,\d{2})(?:\s*[DC])?(?:\s|$)/i);if(!m)continue;const d=toDate(m[1]),a=amountParse(m[3]);if(!d||!Number.isFinite(a)||!a)continue;const typ=/\sD(?:\s|$)/.test(str)?'debit':/\sC(?:\s|$)/.test(str)?'credit':'';rows.push({date:d,description:m[2].trim(),amount:typ==='debit'?-Math.abs(a):typ==='credit'?Math.abs(a):a,unknown:!typ&&!/^\s*[+\-]/.test(m[3])})}
 }
 if(!rows.length)throw new Error('Nenhuma movimentação legível encontrada. PDF digitalizado/imagem ou layout não reconhecido; nenhuma linha foi importada.');
 return rows;
}
async function parseFile(file){
 if(file.size>15*1024*1024)throw new Error('O arquivo ultrapassa o limite de 15 MB.');
 const ext=file.name.split('.').pop().toLowerCase();
 if(ext==='pdf')return rowsFromPdf(file);
 if(['xlsx','xls','csv'].includes(ext)){
  if(!window.XLSX)throw new Error('O leitor de planilhas não carregou.');
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
  let first=[],best=0;
  for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:false,dateNF:'dd/mm/yyyy'});if(detectColumns(rows)&&rows.length>best){first=rows;best=rows.length}}
  if(!first.length)throw new Error('Não identifiquei colunas de extrato em nenhuma aba. Nenhum dado foi alterado.');
  return rowsFromSheet(first);
 }
 throw new Error('Formato não suportado. Use PDF, XLS, XLSX ou CSV.');
}
function openImport(){
 initArrays();if(!state.bankAccounts.length){notify('Cadastre uma conta bancária primeiro.','error');openAccount();return}
 draftImport=null;
 openModal('Importar extrato bancário',`<div class="f9-warning">Revise todas as movimentações: nenhuma entrada ou saída alterará o orçamento automaticamente. Não envie dados protegidos por senha nem documentos com credenciais.</div><form id="f9ImportForm"><div class="form-grid"><div class="field"><label>Conta</label><select name="account" required>${state.bankAccounts.filter(a=>!a.archived).map(a=>`<option value="${h(a.id)}">${h(a.bank)} — ${h(a.name)}</option>`).join('')}</select></div><div class="field"><label>Extrato</label><input name="file" type="file" accept=".xlsx,.xls,.csv,.pdf" required></div></div><div class="form-actions"><button type="button" class="btn" onclick="closeModal()">Cancelar</button><button type="submit" class="btn accent">Ler arquivo e conferir</button></div></form>`);
 $q('f9ImportForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),file=f.get('file');if(!(file instanceof File))return;const btn=e.target.querySelector('[type="submit"]');btn.disabled=true;btn.textContent='Lendo…';try{const rows=await parseFile(file);if(!rows.length)throw new Error('O extrato não contém movimentos válidos.');if(rows.length>1000)throw new Error('Limite de 1.000 movimentações por arquivo; divida o extrato por período.');draftImport={accountId:f.get('account'),filename:file.name,rows};showImportReview()}catch(err){notify(err.message,'error');btn.disabled=false;btn.textContent='Ler arquivo e conferir'}};
}
function showImportReview(){
 if(!draftImport)return;const found=new Map(),old=new Set(state.bankMovements.map(keyMovement));let repeats=0,uncertain=0;
 draftImport.rows=draftImport.rows.map(row=>{const base=[draftImport.accountId,row.date,normal(row.description),row.amount].join('|'),occurrence=(found.get(base)||0)+1;found.set(base,occurrence);const entry={...row,accountId:draftImport.accountId,occurrence};entry.duplicate=old.has(keyMovement(entry));if(entry.duplicate)repeats++;if(entry.unknown)uncertain++;return entry});
 openModal('Conferência do extrato',`<div class="f9-warning">${draftImport.rows.length} movimentos encontrados. ${repeats} possíveis duplicados; ${uncertain} sem direção financeira segura. Confira crédito/débito antes de importar. Os itens ficam pendentes de conciliação e NÃO alteram o orçamento.</div><div class="f9-preview"><table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Direção</th><th>Importar?</th></tr></thead><tbody>${draftImport.rows.map((r,i)=>`<tr><td>${h(r.date)}</td><td>${h(r.description)}${r.duplicate?' <b>(já existe)</b>':''}</td><td>${reais(r.amount)}</td><td><select id="f9dir${i}"><option value="" ${r.unknown?'selected':''}>Conferir</option><option value="debit" ${!r.unknown&&r.amount<0?'selected':''}>Débito</option><option value="credit" ${!r.unknown&&r.amount>0?'selected':''}>Crédito</option></select></td><td><input type="checkbox" id="f9incl${i}" ${r.duplicate?'disabled':'checked'}></td></tr>`).join('')}</tbody></table></div><div class="form-actions"><button type="button" class="btn" id="f9CancelImport">Cancelar</button><button type="button" class="btn accent" id="f9SaveImport">Confirmar importação revisada</button></div>`);
 $q('f9CancelImport').onclick=()=>{draftImport=null;closeModal()};
 $q('f9SaveImport').onclick=commitImport;
}
function commitImport(){
 if(!draftImport)return;let added=0,skipped=0;const existing=new Set(state.bankMovements.map(keyMovement));
 draftImport.rows.forEach((r,i)=>{if(!$q('f9incl'+i)?.checked){skipped++;return}const dir=$q('f9dir'+i)?.value;if(!dir){skipped++;return}
  const row={id:newid('bm'),accountId:r.accountId,date:r.date,description:r.description,amount:Math.abs(r.amount)*(dir==='debit'?-1:1),occurrence:r.occurrence,origin:draftImport.filename,classification:classify(r.description,dir==='debit'?-1:1),status:'pending',linkedKind:'',linkedId:'',importedAt:new Date().toISOString()};
  if(existing.has(keyMovement(row))){skipped++;return}state.bankMovements.push(row);existing.add(keyMovement(row));added++});
 draftImport=null;closeModal();afterSave();notify(`${added} movimentações salvas como pendentes; ${skipped} ignoradas/duplicadas. Revise a conciliação.`,added?'success':'error')
}
function matchesFor(row){
 const arr=row.amount<0?state.expenses:state.incomes;
 return arr.filter(x=>x.startMonth===row.date.slice(0,7)&&Math.abs((Number(x.amount)||0)-Math.abs(row.amount))<.015).slice(0,30);
}
function reviewMovement(id){
 initArrays();const t=state.bankMovements.find(x=>x.id===id);if(!t)return;
 const matches=matchesFor(t),choices=matches.map(x=>`<option value="${h(x.id)}">${h(x.description)} — ${reais(x.amount)}</option>`).join('');
 const defaultAction=t.classification==='card_payment'?'card_payment':t.classification==='transfer'?'transfer':t.classification==='reimbursement'?'reimbursement':t.amount<0?'expense':'income';
 openModal('Conciliar movimentação',`<div class="f9-warning"><b>${h(t.description)}</b><br>${h(t.date)} • ${reais(t.amount)}<br>Vincular ou registrar uma vez: o pagamento de uma fatura não é uma segunda despesa.</div><form id="f9ReviewForm"><div class="form-grid"><div class="field"><label>Natureza</label><select name="action" id="f9Act"><option value="pending">Manter pendente</option><option value="match">Vincular a lançamento existente</option><option value="expense" ${defaultAction==='expense'?'selected':''}>Nova despesa</option><option value="income" ${defaultAction==='income'?'selected':''}>Nova receita</option><option value="card_payment" ${defaultAction==='card_payment'?'selected':''}>Pagamento de fatura (sem duplicar)</option><option value="transfer" ${defaultAction==='transfer'?'selected':''}>Transferência entre contas</option><option value="reimbursement" ${defaultAction==='reimbursement'?'selected':''}>Reembolso / liquidação já registrada</option><option value="ignore">Ignorar no orçamento</option></select></div><div class="field"><label>Vincular existente, se aplicável</label><select name="match"><option value="">Selecione…</option>${choices}</select></div><div class="field"><label>Categoria para nova despesa</label><select name="category">${CATEGORIES.map(c=>`<option ${c===category(t.description)?'selected':''}>${h(c)}</option>`).join('')}</select></div></div><div class="form-actions"><button type="button" class="btn" onclick="closeModal()">Cancelar</button><button type="submit" class="btn accent">Salvar conciliação</button></div></form>`);
 $q('f9ReviewForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),action=f.get('action');if(action==='match'&&!f.get('match'))return notify('Escolha um lançamento para vincular.','error');
 if(action==='expense'&&t.amount>0||action==='income'&&t.amount<0)return notify('A direção do movimento não corresponde à classificação.','error');
 if(t.status==='reconciled')return notify('Este movimento já foi conciliado. Não será contabilizado novamente.','error');
 if(action==='match'){const row=matches.find(x=>x.id===f.get('match'));if(!row)return notify('Lançamento não encontrado.','error');const kind=t.amount<0?'expense':'income';t.linkedKind=kind;t.linkedId=row.id;setActualRecord(kind,row.id,t.date.slice(0,7),Math.abs(t.amount),t.date,'Conciliado pelo extrato bancário')}
 if(action==='expense'||action==='income'){const kind=action,person=state.bankAccounts.find(a=>a.id===t.accountId)?.owner||'Casa',id=newid(kind==='expense'?'exp':'inc'),obj=kind==='expense'?{id,description:t.description,category:f.get('category'),owner:person,amount:Math.abs(t.amount),type:'variable',recurrence:'once',startMonth:t.date.slice(0,7),endMonth:'',dueDay:Number(t.date.slice(-2)),bankMovementId:t.id}:{id,description:t.description,person,amount:Math.abs(t.amount),recurrence:'once',startMonth:t.date.slice(0,7),endMonth:'',bankMovementId:t.id};
 if(kind==='expense')state.expenses.push(obj);else state.incomes.push(obj);
 t.linkedKind=kind;t.linkedId=id;setActualRecord(kind,id,t.date.slice(0,7),Math.abs(t.amount),t.date,'Extrato bancário')}
 t.classification=action;t.status=action==='pending'?'pending':'reconciled';t.reviewedAt=new Date().toISOString();t.reviewedBy=typeof cloudSession!=='undefined'?cloudSession?.user?.id||'':'';closeModal();afterSave()};
}
function openQuick(){
 if(!initArrays())return notify('Carregando seus dados.','error');
 if(typeof cloudSession!=='undefined'&&!cloudSession)return notify('Faça login para registrar lançamentos compartilhados.','error');
 const options=CATEGORIES.map(c=>`<option value="${h(c)}" ${c==='Transporte'?'selected':''}>${h(c)}</option>`).join('');
 openModal('＋ Lançamento rápido',`<form id="f9QuickForm"><div class="form-grid"><div class="field"><label>Movimentação</label><select name="kind" id="f9QuickKind"><option value="expense">Despesa</option><option value="income">Receita</option></select></div><div class="field"><label>Valor (R$)</label><input name="amount" required inputmode="decimal" placeholder="Ex.: 150,00" autocomplete="off"></div><div class="field full"><label>Descrição</label><input name="description" required maxlength="150" placeholder="Ex.: Abastecimento, mercado, Uber..."></div><div class="field"><label>Data</label><input type="date" name="date" required value="${isoDate()}"></div><div class="field"><label>Responsável</label><select name="owner">${[state.settings.person1,state.settings.person2,'Casa'].map(p=>`<option>${h(p)}</option>`).join('')}</select></div><div class="field"><label>Categoria</label><select name="category">${options}</select></div><div class="field"><label>Pagamento</label><select name="payment"><option value="pix">Pix / transferência</option><option value="debit">Cartão de débito</option><option value="cash">Dinheiro</option><option value="third_party">Cartão de terceiro — reembolsar</option><option value="other">Outro meio</option></select></div><div class="field full"><small>Compras em cartões próprios já cadastrados devem ser registradas na área Cartões, para conciliar com a fatura.</small></div></div><div class="form-actions"><button class="btn" type="button" onclick="closeModal()">Cancelar</button><button class="btn accent" type="submit">Salvar agora</button></div></form>`);
 $q('f9QuickForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),kind=f.get('kind'),v=amountParse(f.get('amount')),date=f.get('date'),description=f.get('description').trim(),owner=f.get('owner'),payment=f.get('payment');if(!(v>0)&&!(v<0))return notify('Valor inválido.','error');if(!date||!description)return;
 const id=newid(kind==='expense'?'exp':'inc'),extra={id,description,amount:Math.abs(v),recurrence:'once',startMonth:date.slice(0,7),endMonth:'',quickEntry:true,quickDate:date,paymentMethod:payment,thirdPartyReimbursementPending:kind==='expense'&&payment==='third_party'};
 if(kind==='expense')state.expenses.push({...extra,category:f.get('category'),owner,type:'variable',dueDay:Number(date.slice(-2))});else state.incomes.push({...extra,person:owner});
 setActualRecord(kind,id,date.slice(0,7),Math.abs(v),date,'Lançamento rápido no celular');
 closeModal();afterSave();notify('Lançamento salvo e sincronização solicitada.','success')};
}
function hook(){const old=window.renderAll;if(typeof old==='function'&&!old.__f9){const wrapped=function(){const ret=old.apply(this,arguments);renderBank();return ret};wrapped.__f9=true;window.renderAll=wrapped} }
mount();hook();if(safeState())renderBank();
})();
