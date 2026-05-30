let descontoRoleta = null;
let roletaGirando = false;
let roletaJaGirou = false;

function normalizarPremioRoleta(p){
  const texto = String(p?.texto || p?.nome || p?.codigo || 'Prêmio').trim();
  const tipo = String(p?.tipo || 'nenhum').trim();
  const valor = Number(p?.valor || 0);
  return { texto, tipo, valor };
}

function obterConfigRoletaAtualizada(){
  const cfg = getConfigRoleta();
  const premios = Array.isArray(cfg.premios) ? cfg.premios.map(normalizarPremioRoleta).filter(p=>p.texto) : [];
  return { limite:Number(cfg.limite || 0), premios: premios.length ? premios.slice(0,8) : getConfigRoleta().premios.map(normalizarPremioRoleta).slice(0,8) };
}
function obterPremiosRoleta(){ return obterConfigRoletaAtualizada().premios; }
function obterLimiteRoleta(){ return obterConfigRoletaAtualizada().limite; }

function limparVisualRoleta(){
  const labels=document.getElementById('roleta-labels');
  if(labels){ labels.dataset.ok=''; labels.innerHTML=''; }
  const wheel=document.getElementById('roleta-wheel');
  if(wheel) wheel.style.transform='rotate(0deg)';
}

function atualizarBotaoRoleta() {
  const btnCarrinho = document.getElementById('btn-abrir-roleta');
  const btnGirar = document.getElementById('btn-girar-roleta');
  const roletaEsgotada = !cupomTemLimiteDisponivel({ codigo: 'ROLETA', limite: obterLimiteRoleta() });
  if (btnCarrinho) {
    btnCarrinho.disabled = roletaJaGirou || roletaEsgotada;
    btnCarrinho.classList.toggle('opacity-60', roletaJaGirou || roletaEsgotada);
    btnCarrinho.classList.toggle('cursor-not-allowed', roletaJaGirou || roletaEsgotada);
    btnCarrinho.innerHTML = roletaEsgotada ? '<i class="fas fa-ban mr-2"></i> Cupons da roleta esgotados' : (roletaJaGirou ? '<i class="fas fa-lock mr-2"></i> Roleta já utilizada neste pedido' : '<i class="fas fa-gift mr-2"></i> Girar roleta de desconto');
  }
  if (btnGirar) {
    btnGirar.disabled = roletaJaGirou || roletaGirando || roletaEsgotada;
    btnGirar.classList.toggle('opacity-60', roletaJaGirou || roletaGirando || roletaEsgotada);
    btnGirar.classList.toggle('cursor-not-allowed', roletaJaGirou || roletaGirando || roletaEsgotada);
    btnGirar.textContent = roletaEsgotada ? 'Cupons esgotados' : (roletaJaGirou ? 'Roleta já usada' : 'Girar agora');
  }
}
function abrirRoleta() {
  const modal=document.getElementById('modal-roleta-cupom');
  const resultado=document.getElementById('resultado-roleta');
  if(!modal)return;
  renderizarFatiasRoleta(true);
  if(resultado&&roletaJaGirou){resultado.textContent=descontoRoleta&&descontoRoleta.tipo!=='nenhum'?`Cupom já liberado: ${descontoRoleta.texto}`:'Você já girou a roleta neste pedido.';}
  atualizarBotaoRoleta();
  modal.classList.add('active');
  document.body.style.overflow='hidden';
}
function fecharRoleta(){const modal=document.getElementById('modal-roleta-cupom'); if(modal)modal.classList.remove('active'); document.body.style.overflow='';}
function renderizarFatiasRoleta(forcar=false){
  const labels=document.getElementById('roleta-labels');
  if(!labels||(!forcar&&labels.dataset.ok))return;
  const premios=obterPremiosRoleta();
  if(!premios.length){ labels.innerHTML='<span>Sem prêmios</span>'; return; }
  const passo=360/premios.length;
  labels.innerHTML=premios.map((p,i)=>`<span style="transform:rotate(${i*passo+passo/2}deg) translateY(-105px) rotate(-${i*passo+passo/2}deg)">${escaparHtml(p.texto)}</span>`).join('');
  labels.dataset.ok='1';
}
function girarRoleta(){
  if(roletaGirando)return;
  const wheel=document.getElementById('roleta-wheel');
  const resultado=document.getElementById('resultado-roleta');
  if(!wheel||!resultado)return;
  if(roletaJaGirou){resultado.textContent='A roleta só pode ser girada uma vez por pedido.'; atualizarBotaoRoleta(); return;}
  if(!cupomTemLimiteDisponivel({codigo:'ROLETA',limite:obterLimiteRoleta()})){resultado.textContent='Os cupons da roleta acabaram.'; atualizarBotaoRoleta(); return;}
  const premios=obterPremiosRoleta();
  renderizarFatiasRoleta(true);
  if(!premios.length){resultado.textContent='Cadastre prêmios no ADM.'; return;}
  roletaGirando=true;
  atualizarBotaoRoleta();
  resultado.textContent='Girando...';
  const index=Math.floor(Math.random()*premios.length);
  const passo=360/premios.length;
  const voltas=5+Math.floor(Math.random()*3);
  const anguloFinal=(voltas*360)+(360-(index*passo+passo/2));
  wheel.style.transform=`rotate(${anguloFinal}deg)`;
  setTimeout(()=>{
    const premio=premios[index];
    roletaGirando=false;
    roletaJaGirou=true;
    if(premio.tipo==='nenhum'){
      descontoRoleta=null;
      resultado.textContent='Quase! Não ganhou desconto desta vez.';
    }else{
      descontoRoleta={...premio,codigo:'ROLETA'};
      resultado.textContent=`Cupom liberado: ${premio.texto}`;
      const input=document.getElementById('cupom-cliente');
      if(input)input.value='ROLETA';
    }
    atualizarBotaoRoleta();
    atualizarCarrinho();
  },3200);
}
function resetarRoletaParaNovoPedido(){
  descontoRoleta=null; roletaGirando=false; roletaJaGirou=false;
  const input=document.getElementById('cupom-cliente'); if(input&&input.value.trim().toUpperCase()==='ROLETA')input.value='';
  const resultado=document.getElementById('resultado-roleta'); if(resultado)resultado.textContent='';
  limparVisualRoleta(); renderizarFatiasRoleta(true); atualizarBotaoRoleta();
}
function atualizarRoletaDepoisDoAdm(){
  descontoRoleta=null; roletaJaGirou=false; roletaGirando=false;
  const input=document.getElementById('cupom-cliente'); if(input&&input.value.trim().toUpperCase()==='ROLETA')input.value='';
  const resultado=document.getElementById('resultado-roleta'); if(resultado)resultado.textContent='Prêmios atualizados pelo ADM.';
  limparVisualRoleta(); renderizarFatiasRoleta(true); atualizarBotaoRoleta(); atualizarCarrinho();
}
window.abrirRoleta=abrirRoleta; window.fecharRoleta=fecharRoleta; window.girarRoleta=girarRoleta; window.resetarRoletaParaNovoPedido=resetarRoletaParaNovoPedido; window.atualizarBotaoRoleta=atualizarBotaoRoleta; window.obterLimiteRoleta=obterLimiteRoleta; window.renderizarFatiasRoleta=renderizarFatiasRoleta; window.atualizarRoletaDepoisDoAdm=atualizarRoletaDepoisDoAdm;
