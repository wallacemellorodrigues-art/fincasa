/* FinCasa: navegacao por etapas na pagina Inicio, sem modificar dados ou calculos. */
(function(){
'use strict';
if(typeof document==='undefined')return;
const CSS=`
/* O scroll principal vem do documento e do container main; travar ambos somente neste modo. */
html:has(body.fc-guided-home){height:100%!important;overflow:hidden!important;overscroll-behavior:none!important}
body.fc-guided-home{height:100dvh!important;max-height:100dvh!important;overflow:hidden!important;overscroll-behavior:none!important}
body.fc-guided-home .app{height:100dvh!important;max-height:100dvh!important;min-height:0!important;overflow:hidden!important}
body.fc-guided-home main.main,body.fc-guided-home .main{height:100dvh!important;max-height:100dvh!important;min-height:0!important;overflow:hidden!important;overscroll-behavior:none!important}
body.fc-guided-home #inicio,body.fc-guided-home #home,body.fc-guided-home #dashboard,body.fc-guided-home #visaoGeral{min-height:0!important;max-height:calc(100dvh - 155px)!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain!important;scrollbar-width:thin}
#fcStepBar{position:sticky;top:0;z-index:60;margin:12px 0 16px;padding:13px 15px;background:#fff;border:1px solid #dbe5f0;border-radius:16px;box-shadow:0 5px 18px rgba(17,42,68,.08);color:#18334d}
#fcStepBar .fc-step-line{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
#fcStepBar .fc-step-title{font-size:15px;font-weight:850}
#fcStepBar .fc-step-caption{font-size:12px;color:#65758b;margin-top:3px}
#fcStepBar .fc-step-buttons{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
#fcStepBar button{border:1px solid #d6e2ed;border-radius:10px;padding:9px 13px;background:#f5f8fc;color:#17344c;font:inherit;font-size:12px;font-weight:750;cursor:pointer}
#fcStepBar button.fc-primary{background:#178b8a;color:white;border-color:#178b8a}
#fcStepBar button:disabled{opacity:.4;cursor:not-allowed}
#fcStepBar button:focus-visible{outline:3px solid #477af8;outline-offset:2px}
#fcStepBar .fc-step-dots{display:flex;gap:5px;margin-top:10px}
#fcStepBar .fc-step-dot{height:5px;border-radius:10px;background:#e3eaf2;flex:1}
#fcStepBar .fc-step-dot.on{background:#168c87}
#fcStepBar .fc-mode{font-size:11px}
.fc-home-step-hidden{display:none!important}
@media(max-width:820px){body.fc-guided-home #inicio,body.fc-guided-home #home,body.fc-guided-home #dashboard,body.fc-guided-home #visaoGeral{max-height:calc(100dvh - 205px)!important}#fcStepBar{position:relative;top:auto;margin:9px 0 12px;padding:12px}#fcStepBar .fc-step-buttons{width:100%;justify-content:space-between}#fcStepBar button{padding:10px}}
`;
function install(){
 if(document.getElementById('fcStepBar'))return;
 const nav=[...document.querySelectorAll('.nav a[href^="#"], #sidebar a[href^="#"]')].find(a=>/^(in[ií]cio|home)\b/i.test((a.textContent||'').trim()));
 let home=nav&&document.querySelector(nav.getAttribute('href'));
 if(!home)home=document.querySelector('#inicio,#home,#dashboard,#visaoGeral');
 if(!home||!home.querySelector)return;
 const excluded=e=>!e||/^(SCRIPT|STYLE|TEMPLATE)$/.test(e.tagName)||e.id==='fcStepBar'||e.matches('[hidden],.modal,.toast');
 let host=home,parts=[...home.children].filter(e=>!excluded(e));
 // Alguns layouts usam um container interno unico; dividir apenas se houver blocos independentes.
 if(parts.length<4&&parts.length===1&&parts[0].children.length>=4){
   host=parts[0];parts=[...host.children].filter(e=>!excluded(e));
 }
 if(parts.length<4)return;
 const sheet=document.createElement('style');sheet.id='fcStepStyle';sheet.textContent=CSS;document.head.append(sheet);
 const bar=document.createElement('div');bar.id='fcStepBar';bar.setAttribute('aria-label','Navegacao por etapas do resumo financeiro');
 bar.innerHTML='<div class="fc-step-line"><div><div class="fc-step-title" id="fcStepTitle">Resumo financeiro</div><div class="fc-step-caption" id="fcStepCaption" aria-live="polite"></div></div><div class="fc-step-buttons"><button type="button" id="fcStepMode" aria-pressed="true">Visão completa</button><button type="button" id="fcStepPrev">← Anterior</button><button type="button" id="fcStepNext" class="fc-primary">Próximo →</button></div></div><div class="fc-step-dots" id="fcStepDots" aria-hidden="true"></div>';
 host.prepend(bar);
 // Preservar elementos existentes no DOM e seus eventos: nunca mover ou recriar cards.
 const count=Math.min(parts.length,24);
 const groups=Array.from({length:count},()=>[]);
 parts.forEach((e,i)=>groups[Math.min(count-1,Math.floor(i*count/parts.length))].push(e));
 const main=home.closest('main')||document.querySelector('main.main');
 const siblings=main?[...main.querySelectorAll(':scope > section')].filter(e=>e!==home&&!e.contains(home)):[];
 let index=0,compact=true;
 const titleFor=(els,i)=>{
  const h=els.map(e=>e.matches('h1,h2,h3')?e:e.querySelector('h1,h2,h3')).find(Boolean);
  const t=(h?.textContent||'').replace(/\s+/g,' ').trim();
  return t&&t.length<65?t:['Visão geral','Indicadores do mês','Análise financeira','Planejamento','Decisões'][i]||'Resumo';
 };
 const titles=groups.map(titleFor);
 function refresh(){
   groups.forEach((g,i)=>g.forEach(el=>el.classList.toggle('fc-home-step-hidden',compact&&i!==index)));
   siblings.forEach(el=>el.classList.toggle('fc-home-step-hidden',compact));
   document.body.classList.toggle('fc-guided-home',compact);
   bar.querySelector('#fcStepTitle').textContent=compact?titles[index]:'Visão financeira completa';
   bar.querySelector('#fcStepCaption').textContent=compact?'Etapa '+(index+1)+' de '+groups.length+' · use Anterior ou Próximo':'Todas as informações disponíveis na mesma página';
   bar.querySelector('#fcStepPrev').disabled=!compact||index===0;
   bar.querySelector('#fcStepNext').disabled=!compact||index===groups.length-1;
   const mode=bar.querySelector('#fcStepMode');mode.textContent=compact?'Visão completa':'Por etapas';mode.setAttribute('aria-pressed',String(compact));
   bar.querySelector('#fcStepDots').innerHTML=compact?groups.map((_,i)=>'<span class="fc-step-dot '+(i<=index?'on':'')+'"></span>').join(''):'';
 }
 function move(diff){index=Math.max(0,Math.min(groups.length-1,index+diff));refresh();home.scrollTop=0;if(main)main.scrollTop=0;window.scrollTo(0,0);}
 bar.querySelector('#fcStepPrev').addEventListener('click',()=>move(-1));
 bar.querySelector('#fcStepNext').addEventListener('click',()=>move(1));
 bar.querySelector('#fcStepMode').addEventListener('click',()=>{compact=!compact;refresh();if(compact){home.scrollTop=0;if(main)main.scrollTop=0;window.scrollTo(0,0)}});
 document.addEventListener('keydown',e=>{if(!compact||!home.contains(document.activeElement)||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();move(-1)}});
 document.querySelectorAll('#sidebar a[href^="#"],.nav a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{const id=(a.getAttribute('href')||'').slice(1);if(id&&id!==home.id&&compact){compact=false;refresh()}}));
 refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,300),{once:true});
else setTimeout(install,300);
})();