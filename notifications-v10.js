/* FinCasa v10 — identidade WJ, alertas e lembretes locais. Sem serviço de push remoto. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const d2=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return d.getFullYear()+'-'+d2(d.getMonth()+1)+'-'+d2(d.getDate())};
const monthNow=()=>today().slice(0,7);
const daysTo=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
const opts={reminders:true,budget:true,cardDue:true,advisor:true,bank:true,quiet:true,at:'20:00',cadence:2,os:false};
function nextDue(day,now=today()){
 const [y,m,d]=now.split('-').map(Number); if(!(day>=1&&day<=31))return null;
 for(let offset=0;offset<=1;offset++){const dt=new Date(y,m-1+offset,1),yr=dt.getFullYear(),mo=dt.getMonth(),end=new Date(yr,mo+1,0).getDate(),due=yr+'-'+d2(mo+1)+'-'+d2(Math.min(day,end));
  if(due>=now)return {date:due,days:daysTo(now,due)};
 }return null;
}
function notifications(s,ym,now,advisorRisks=[]){
 if(!s||typeof s!=='object')return [];
 const notices=[],st=s.settings||{},card=Array.isArray(s.cards)?s.cards:[],mov=Array.isArray(s.bankMovements)?s.bankMovements:[],tx=Array.isArray(s.transactions)?s.transactions:[],expenses=Array.isArray(s.expenses)?s.expenses:[],actuals=Array.isArray(s.actuals)?s.actuals:[];
 const add=(id,kind,title,body,where,priority=1)=>notices.push({id,kind,title,body,where,priority});
 const pending=mov.filter(x=>x.status!=='reconciled');
 if(pending.length)add('bank-'+pending.length,'bank','Extratos aguardando conciliação',pending.length+' movimentação(ões) precisam ser conferidas antes de entrar no orçamento.','bankAccountsSection',3);
 for(const c of card){
  const due=nextDue(Number(c.dueDay)||0,now);
  if(due&&due.days<=3)add('card-'+c.id+'-'+due.date,'card',due.days===0?'Vencimento de cartão hoje':'Vencimento do cartão se aproxima',String(c.name||'Cartão')+' vence '+(due.days===0?'hoje':'em '+due.days+' dia(s)')+'. Confira se a fatura já foi paga.','cartoes',due.days===0?3:2);
 }
 const budgets=s.budgets&&typeof s.budgets==='object'?s.budgets:{};
 const cat={};
 for(const x of expenses){if(x.startMonth<=ym&&(!x.endMonth||x.endMonth>=ym)&&(x.recurrence!=='once'||x.startMonth===ym)){cat[x.category||'Outros']=(cat[x.category||'Outros']||0)+(Number(x.amount)||0)}}
 for(const x of tx){if(x.statementMonth===ym)cat[x.category||'Outros']=(cat[x.category||'Outros']||0)+(Number(x.amount)||0)}
 for(const [c,max] of Object.entries(budgets)){const b=Number(max)||0,k=cat[c]||0;if(b>0&&k>=.85*b)add('budget-'+c+'-'+ym,'budget','Orçamento de '+c+' em atenção','Compromissos cadastrados representam '+Math.round(k/b*100)+'% do limite da categoria. Confira os lançamentos projetados.','categorias',k>b?3:2)}
 const relevant=actuals.some(x=>x.date&&daysTo(x.date,now)>=0&&daysTo(x.date,now)<2)
  ||expenses.some(x=>x.quickDate&&daysTo(x.quickDate,now)>=0&&daysTo(x.quickDate,now)<2)
  ||mov.some(x=>x.importedAt&&daysTo(String(x.importedAt).slice(0,10),now)>=0&&daysTo(String(x.importedAt).slice(0,10),now)<2);
 if(!relevant)add('input-'+now.slice(0,7),'reminder','Hora de revisar os lançamentos','Não identifiquei despesas, receitas rápidas ou extratos registrados nos últimos 2 dias. Se houve movimentações, vale atualizá-las.','despesas',1);
 if(card.length&&Number(now.slice(8,10))>=8&&!((s.imports||[]).some(x=>x.statementMonth===ym)))add('import-'+ym,'reminder','Revisar faturas do mês','Nenhuma importação de fatura desta competência foi identificada. Importe quando estiver disponível.','cartoes',1);
 for(const [i,r] of advisorRisks.slice(0,2).entries())if(r?.title)add('advisor-'+ym+'-'+i,'advisor',String(r.title),String(r.summary||'Confira a análise financeira deste mês.'),'inicio',2);
 return notices.sort((a,b)=>b.priority-a.priority||a.kind.localeCompare(b.kind)).slice(0,25);
}
if(typeof document==='undefined'){if(typeof module!=='undefined')module.exports={notifications,nextDue,daysTo};return}
const read=(k,fallback)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??fallback}catch(e){return fallback}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const userKey=()=>{const id=typeof cloudSession!=='undefined'?cloudSession?.user?.id:'local';return 'fcv10:'+String(id||'local')};
const pref=()=>({...opts,...read(userKey()+':prefs',{})});
const setPref=(part)=>write(userKey()+':prefs',{...pref(),...part});
const seen=()=>read(userKey()+':seen',{});
const markSeen=ids=>{let s=seen();ids.forEach(id=>s[id]=today());const keys=Object.keys(s);if(keys.length>200)for(const k of keys.slice(0,keys.length-200))delete s[k];write(userKey()+':seen',s)};
const isReady=()=>typeof state!=='undefined'&&!!state?.settings&&typeof cloudSession!=='undefined'&&!!cloudSession;
let activeTab='all',noticeCache=[],refreshTimer=null,notificationDialogOpen=false;
const allowed=(x,p)=>x.kind==='reminder'?p.reminders:x.kind==='bank'?p.bank:x.kind==='card'?p.cardDue:x.kind==='budget'?p.budget:x.kind==='advisor'?p.advisor:true;
function getNotices(){
 if(!isReady())return [];
 const ym=$('monthSel')?.value||monthNow(),p=pref();
 let risks=[];try{risks=typeof computeAdvisor==='function'?computeAdvisor(ym)?.risks||[]:[]}catch(e){}
 const data=notifications(state,ym,today(),risks);
 return data.filter(x=>allowed(x,p));
}
function go(where){closePanel();if(where==='bankAccountsSection'&&$('bankAccountsSection')){if(typeof closeModal==='function')closeModal();$('bankAccountsSection').scrollIntoView({behavior:'smooth'});return}
 if(where==='inicio'||where==='cartoes'||where==='categorias'||where==='despesas'){if(typeof closeModal==='function')closeModal();$(where)?.scrollIntoView({behavior:'smooth'});return}}
function paintBell(){
 const v=noticeCache=getNotices(),unread=v.filter(x=>!seen()[x.id]).length;
 for(const b of document.querySelectorAll('.fc-notice-count')){b.hidden=!unread;b.textContent=unread>9?'9+':String(unread)}
 for(const b of document.querySelectorAll('[data-fc-bell]'))b.setAttribute('aria-label','Avisos: '+unread+' não lidos');
 if(notificationDialogOpen&&$('fcNoticePanel'))paintPanel();
}
function panelBody(){
 const tabs=[['all','Todos'],['reminder','Lembretes'],['advisor','Insights'],['bank','Pendências']];
 const list=activeTab==='all'?noticeCache:activeTab==='bank'?noticeCache.filter(x=>x.kind==='bank'||x.kind==='card'||x.kind==='budget'):noticeCache.filter(x=>x.kind===activeTab);
 const icon={reminder:'◷',bank:'↔',card:'▣',budget:'!',advisor:'✦'};
 return `<div class="fc-notice-toolbar"><div class="fc-notice-tabs" role="tablist">${tabs.map(([id,t])=>`<button type="button" data-fc-tab="${id}" class="${activeTab===id?'active':''}" role="tab" aria-selected="${activeTab===id}">${t}</button>`).join('')}</div><button type="button" class="fc-notice-prefs-btn" id="fcOpenPrefs">⚙ Preferências</button></div><div class="fc-notice-summary">Avisos do FinCasa são baseados nos dados cadastrados. As análises são estimativas e podem mudar quando vocês importam novas informações.</div><div class="fc-notice-cards">${list.length?list.map(x=>`<article class="fc-notice-item ${x.priority>=3?'urgent':x.kind==='advisor'?'good':''}"><div class="fc-notice-icon">${icon[x.kind]||'•'}</div><div><h4>${clean(x.title)}${seen()[x.id]?'':' <span aria-label="Novo">•</span>'}</h4><p>${clean(x.body)}</p><span class="fc-notice-meta">${x.kind==='advisor'?'Insight':'Atualização financeira'}</span><div><button type="button" data-fc-go="${clean(x.id)}">Ver detalhes</button></div></div></article>`).join(''):'<div class="fc-empty">Tudo em dia por aqui. Os alertas aparecerão conforme suas movimentações forem atualizadas.</div>'}</div>`;
}
function paintPanel(){
 const div=$('fcNoticePanel');if(!div)return;div.innerHTML=panelBody();
 div.querySelectorAll('[data-fc-tab]').forEach(el=>el.onclick=()=>{activeTab=el.dataset.fcTab;paintPanel()});
 div.querySelectorAll('[data-fc-go]').forEach(el=>el.onclick=()=>{const target=noticeCache.find(x=>x.id===el.dataset.fcGo);if(target){markSeen([target.id]);go(target.where);paintBell()}});
 const settings=$('fcOpenPrefs');if(settings)settings.onclick=openPrefs;
}
function closePanel(){notificationDialogOpen=false}
function openPanel(){
 if(!isReady())return;
 activeTab='all';noticeCache=getNotices();notificationDialogOpen=true;markSeen(noticeCache.map(x=>x.id));
 openModal('Avisos e insights',`<div id="fcNoticePanel"></div>`);
 paintPanel();paintBell();
}
function openPrefs(){
 const p=pref();notificationDialogOpen=false;
 const switches=[['reminders','Lembretes de lançamentos','Avisar quando faltarem registros recentes'],['cardDue','Vencimento de cartões','Avisar até 3 dias antes dos vencimentos cadastrados'],['budget','Orçamento','Monitorar categorias acima de 85% do orçamento'],['bank','Extratos pendentes','Avisar sobre conciliações ainda abertas'],['advisor','Insights financeiros','Mostrar recomendações do Advisor']];
 openModal('Preferências de avisos',`<div class="fc-notice-settings"><p style="margin:0;color:#52657b;font-size:13px">Essas escolhas valem para seu perfil neste dispositivo.</p>${switches.map(([key,title,desc])=>`<label class="fc-pref-row"><span><b>${title}</b><small>${desc}</small></span><input type="checkbox" data-fc-pref="${key}" ${p[key]?'checked':''}></label>`).join('')}<label class="fc-pref-row"><span><b>Hora do lembrete</b><small>Somente quando o app estiver aberto ou for retomado</small></span><input type="time" id="fcPrefTime" value="${clean(p.at)}"></label><label class="fc-pref-row"><span><b>Notificação no dispositivo</b><small>Opcional; uma mensagem discreta, sem exibir valores na tela bloqueada</small></span><input type="checkbox" id="fcPrefOs" ${p.os?'checked':''}></label><button class="btn" type="button" id="fcNotifyPerm">Autorizar notificações Android</button><small>Para receber avisos com o app totalmente fechado, será necessário habilitar push remoto em uma etapa futura.</small></div><div class="form-actions"><button type="button" class="btn" id="fcCancelPref">Voltar</button><button type="button" class="btn accent" id="fcSavePref">Salvar preferências</button></div>`);
 $('fcCancelPref').onclick=()=>{closeModal();openPanel()};
 $('fcSavePref').onclick=()=>{const part={};document.querySelectorAll('[data-fc-pref]').forEach(el=>part[el.dataset.fcPref]=el.checked);part.at=$('fcPrefTime').value||'20:00';part.os=$('fcPrefOs').checked;setPref(part);closeModal();paintBell();if(typeof notify==='function')notify('Preferências de avisos salvas.','success')};
 $('fcNotifyPerm').onclick=async()=>{if(!('Notification' in window))return alert('Notificações do sistema indisponíveis neste navegador');const res=await Notification.requestPermission();if(res==='granted'){$('fcPrefOs').checked=true;if(typeof notify==='function')notify('Permissão concedida. Salve as preferências.','success')}else alert('Permissão não concedida; os avisos continuarão dentro do aplicativo.')};
}
function mount(){
 if($('fcMobileNav'))return;
 const top=document.querySelector('.toprow');if(top){
  const head=document.createElement('div');head.className='fc-mobile-header';head.innerHTML='<div class="fc-mobile-logo" aria-label="WJ">WJ</div><div class="fc-mobile-welcome"><strong>Wallace &amp; Juliana</strong><small>Seu espaço financeiro</small></div>';
  top.prepend(head);
  const photo=document.createElement('img');photo.className='fc-mobile-photo';photo.alt='Foto do casal';photo.id='fcMobilePhoto';photo.hidden=true;head.appendChild(photo);
  const bell=document.createElement('button');bell.className='fc-notice-btn';bell.type='button';bell.dataset.fcBell='1';bell.innerHTML='♧<span class="fc-notice-count" hidden>0</span>';bell.setAttribute('aria-label','Abrir avisos');bell.innerHTML='🔔<span class="fc-notice-count" hidden>0</span>';bell.onclick=openPanel;top.appendChild(bell);
 }
 const nav=document.createElement('nav');nav.id='fcMobileNav';nav.className='fc-mobile-nav';nav.setAttribute('aria-label','Navegação do aplicativo');nav.innerHTML='<button type="button" data-fc-dest="inicio" class="active"><b>⌂</b>Início</button><button type="button" data-fc-dest="bankAccountsSection"><b>▣</b>Contas</button><button type="button" data-fc-dest="quick" class="fast"><b>＋</b>Lançar</button><button type="button" data-fc-dest="alerts"><b>♧</b>Avisos<span class="fc-notice-count" hidden>0</span></button>';
 document.body.append(nav);
 nav.querySelectorAll('button').forEach(b=>b.onclick=()=>{const d=b.dataset.fcDest;if(d==='quick'){if(typeof openQuick==='function')openQuick();else document.querySelector('.f9-quick-btn')?.click();return}if(d==='alerts'){openPanel();return}document.querySelectorAll('#fcMobileNav button').forEach(n=>n.classList.remove('active'));b.classList.add('active');go(d)});
}
function paintPhoto(){
 const img=$('fcMobilePhoto');if(!img||!isReady())return;
 const data=state.settings?.couplePhotoData;
 if(typeof data==='string'&&/^data:image\/(?:jpeg|png|webp);base64,/i.test(data)){if(img.src!==data)img.src=data;img.hidden=false}else img.hidden=true;
}
function poll(){
 if(!isReady())return;
 paintPhoto();paintBell();
 const p=pref();
 if(!p.os||!p.reminders||document.visibilityState!=='visible'||!('Notification' in window)||Notification.permission!=='granted')return;
 const current=new Date(),at=String(p.at||'20:00');const hh=d2(current.getHours())+':'+d2(current.getMinutes());
 const day=today(),key=userKey()+':lastOS';if(hh<at||read(key,'')===day)return;
 const unread=noticeCache.filter(x=>!seen()[x.id]&&x.kind==='reminder');
 if(!unread.length)return;
 write(key,day);
 navigator.serviceWorker?.ready.then(reg=>reg.showNotification('FinCasa • Lembrete do casal',{body:'Há um lembrete de atualização financeira. Abra o FinCasa para conferir.',tag:'fincasa-daily-reminder',icon:'/icons/icon-192.png'})).catch(()=>{});
}
function boot(){
 mount();const old=window.renderAll;
 if(typeof old==='function'&&!old.__fcv10){const wrap=function(){const v=old.apply(this,arguments);queueMicrotask(()=>{paintPhoto();paintBell()});return v};wrap.__fcv10=true;window.renderAll=wrap}
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')poll()});
 window.addEventListener('focus',poll);
 refreshTimer=setInterval(poll,60000);
 setTimeout(poll,900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
