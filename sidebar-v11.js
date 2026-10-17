/* FinCasa: corrige drawer lateral mobile sem alterar dados do usuário */
(function(){
'use strict';
if(typeof document==='undefined')return;
const BREAKPOINT=820;
const mobile=()=>window.innerWidth<=BREAKPOINT;
function install(){
 const sidebar=document.getElementById('sidebar');
 const toggle=document.getElementById('sidebarToggleBtn');
 if(!sidebar||!toggle||document.getElementById('fcSidebarBackdrop'))return;
 const backdrop=document.createElement('button');
 backdrop.id='fcSidebarBackdrop';
 backdrop.className='fc-sidebar-backdrop';
 backdrop.type='button';
 backdrop.tabIndex=-1;
 backdrop.setAttribute('aria-label','Fechar menu lateral');
 document.body.appendChild(backdrop);
 const bar=document.createElement('div');bar.className='fc-sidebar-close';
 const label=document.createElement('span');label.textContent='Menu do FinCasa';
 const closeButton=document.createElement('button');closeButton.type='button';closeButton.id='fcSidebarClose';
 closeButton.textContent='×';closeButton.setAttribute('aria-label','Fechar menu');
 bar.append(label,closeButton);
 sidebar.prepend(bar);
 sidebar.setAttribute('aria-label','Menu principal');
 toggle.setAttribute('aria-controls','sidebar');
 const isOpen=()=>sidebar.classList.contains('open');
 let restoreFocus=false;
 const sync=()=>{
  const on=mobile()&&isOpen();
  document.body.classList.toggle('fc-sidebar-active',on);
  sidebar.setAttribute('aria-hidden',mobile()?String(!on):'false');
  toggle.setAttribute('aria-expanded',String(on));
  backdrop.setAttribute('aria-hidden',String(!on));
  if('inert' in sidebar)sidebar.inert=mobile()&&!on;
 };
 const close=(focus=false)=>{
  restoreFocus=focus;
  sidebar.classList.remove('open');
  sync();
  if(restoreFocus&&mobile()){restoreFocus=false;toggle.focus({preventScroll:true})}
 };
 backdrop.addEventListener('click',()=>close(true));
 closeButton.addEventListener('click',()=>close(true));
 sidebar.addEventListener('click',event=>{
   if(!mobile())return;
   const item=event.target.closest('a[href],.nav button');
   if(item)close(false);
 });
 document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&mobile()&&isOpen()){event.preventDefault();close(true)}
 });
 // O menu não pode ficar atrás da barra inferior nem permanecer aberto ao navegar.
 document.getElementById('fcMobileNav')?.addEventListener('click',()=>{if(isOpen())close(false)},true);
 window.addEventListener('resize',()=>{
   if(!mobile())sidebar.classList.remove('open');
   sync();
 },{passive:true});
 const observer=new MutationObserver(sync);
 observer.observe(sidebar,{attributes:true,attributeFilter:['class']});
 // A tela inicial abre com o menu recolhido; o botão ☰ abre quando solicitado.
 sidebar.classList.remove('open');
 sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
