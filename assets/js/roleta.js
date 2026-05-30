
let descontoRoleta = null;
let roletaGirando = false;
let roletaJaGirou = false;
let assinaturaPremiosRoleta = '';

function obterPremiosRoleta(){
  const cfg = getConfigRoleta();
  const premios = Array.isArray(cfg.premios) ? cfg.premios : [];
  return premios
    .filter(p => p && String(p.texto || '').trim())
    .map(p => ({
      texto: String(p.texto || '').trim(),
      tipo: p.tipo || 'nenhum',
      valor: Number(p.valor || 0)
    }))
    .slice(0, 8);
}

function assinaturaRoleta(){
  return JSON.stringify({ premios: obterPremiosRoleta(), limite: obterLimiteRoleta() });
}

function obterLimiteRoleta(){ return Number(getConfigRoleta().limite || 0); }

function invalidarRoletaVisual(){
  assinaturaPremiosRoleta = '';
  descontoRoleta = null;
  roletaGirando = false;
  roletaJaGirou = false;
  const inputCupom=document.getElementById('cupom-cliente');
  if(inputCupom && inputCupom.value.trim().toUpperCase()==='ROLETA') inputCupom.value='';
  const labels = document.getElementById('roleta-labels');
  if(labels){ labels.dataset.ok=''; labels.innerHTML=''; }
  const wheel = document.getElementById('roleta-wheel');
  if(wheel) wheel.style.transform = 'rotate(0deg)';
}

function atualizarBotaoRoleta() {
  const btnCarrinho = document.getElementById('btn-abrir-roleta');
  const btnGirar = document.getElementById('btn-girar-roleta');
  const premios = obterPremiosRoleta();
  const semPremios = premios.length === 0;
  const roletaEsgotada = !semPremios && !cupomTemLimiteDisponivel({ codigo: 'ROLETA', limite: obterLimiteRoleta() });
  const travar = roletaJaGirou || roletaEsgotada || semPremios;
  if (btnCarrinho) {
    btnCarrinho.disabled = travar;
    btnCarrinho.classList.toggle('opacity-60', travar);
    btnCarrinho.classList.toggle('cursor-not-allowed', travar);
    btnCarrinho.innerHTML = semPremios
      ? '<i class="fas fa-ban mr-2"></i> Roleta sem prêmios cadastrados'
      : roletaEsgotada
        ? '<i class="fas fa-ban mr-2"></i> Cupons da roleta esgotados'
        : (roletaJaGirou ? '<i class="fas fa-lock mr-2"></i> Roleta já utilizada neste pedido' : '<i class="fas fa-gift mr-2"></i> Girar roleta de desconto');
  }
  if (btnGirar) {
    btnGirar.disabled = travar || roletaGirando;
    btnGirar.classList.toggle('opacity-60', travar || roletaGirando);
    btnGirar.classList.toggle('cursor-not-allowed', travar || roletaGirando);
    btnGirar.textContent = semPremios ? 'Cadastre prêmios no ADM' : (roletaEsgotada ? 'Cupons esgotados' : (roletaJaGirou ? 'Roleta já usada' : 'Girar agora'));
  }
}

function abrirRoleta() {
  const modal=document.getElementById('modal-roleta-cupom');
  const resultado=document.getElementById('resultado-roleta');
  if(!modal)return;
  renderizarFatiasRoleta(true);
  if(resultado&&roletaJaGirou){
    resultado.textContent=descontoRoleta&&descontoRoleta.tipo!=='nenhum'?`Cupom já liberado: ${descontoRoleta.texto}`:'Você já girou a roleta neste pedido.';
  }
  atualizarBotaoRoleta();
  modal.classList.add('active');
  document.body.style.overflow='hidden';
}

function fecharRoleta(){const modal=document.getElementById('modal-roleta-cupom'); if(modal)modal.classList.remove('active'); document.body.style.overflow='';}

function renderizarFatiasRoleta(forcar=false){
  const labels=document.getElementById('roleta-labels');
  if(!labels)return;
  const assinatura = assinaturaRoleta();
  if(!forcar && labels.dataset.ok === '1' && assinaturaPremiosRoleta === assinatura) return;
  const premios=obterPremiosRoleta();
  assinaturaPremiosRoleta = assinatura;
  labels.dataset.ok='1';
  if(!premios.length){
    labels.innerHTML='<span>Sem prêmios</span>';
    return;
  }
  const passo=360/premios.length;
  labels.innerHTML=premios.map((p,i)=>`<span style="transform:rotate(${i*passo+passo/2}deg) translateY(-105px) rotate(-${i*passo+passo/2}deg)">${escaparHtml(p.texto)}</span>`).join('');
}

function girarRoleta(){
  if(roletaGirando)return;
  const wheel=document.getElementById('roleta-wheel');
  const resultado=document.getElementById('resultado-roleta');
  if(!wheel||!resultado)return;

  // Sempre lê os prêmios salvos pelo ADM no momento do clique.
  // Isso evita a roleta usar lista antiga que ficou carregada em tela/cache.
  const premios=obterPremiosRoleta();
  assinaturaPremiosRoleta='';
  renderizarFatiasRoleta(true);

  if(roletaJaGirou){resultado.textContent='A roleta só pode ser girada uma vez por pedido.'; atualizarBotaoRoleta(); return;}
  if(!premios.length){resultado.textContent='Cadastre prêmios no ADM.'; atualizarBotaoRoleta(); return;}
  if(!cupomTemLimiteDisponivel({codigo:'ROLETA',limite:obterLimiteRoleta()})){resultado.textContent='Os cupons da roleta acabaram.'; atualizarBotaoRoleta(); return;}

  roletaGirando=true;
  roletaJaGirou=true;
  atualizarBotaoRoleta();
  resultado.textContent='Girando...';

  const index=Math.floor(Math.random()*premios.length);
  const passo=360/premios.length;
  const voltas=5+Math.floor(Math.random()*3);
  const anguloFinal=(voltas*360)+(360-(index*passo+passo/2));
  wheel.style.transform=`rotate(${anguloFinal}deg)`;

  setTimeout(()=>{
    const premiosAtuais=obterPremiosRoleta();
    const premio=premiosAtuais[index] || premios[index];
    roletaGirando=false;

    if(!premio || premio.tipo==='nenhum'){
      descontoRoleta=null;
      resultado.textContent=premio ? `Resultado: ${premio.texto}` : 'Quase! Tente no próximo pedido.';
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
  descontoRoleta=null;
  roletaGirando=false;
  roletaJaGirou=false;
  const input=document.getElementById('cupom-cliente');
  if(input&&input.value.trim().toUpperCase()==='ROLETA')input.value='';
  const resultado=document.getElementById('resultado-roleta');
  if(resultado)resultado.textContent='';
  invalidarRoletaVisual();
  renderizarFatiasRoleta(true);
  atualizarBotaoRoleta();
}

window.addEventListener('storage', e => {
  if(e.key === 'config_roleta'){
    invalidarRoletaVisual();
    renderizarFatiasRoleta(true);
    atualizarBotaoRoleta();
  }
});
window.addEventListener('roleta-config-atualizada', () => {
  invalidarRoletaVisual();
  renderizarFatiasRoleta(true);
  atualizarBotaoRoleta();
});

window.abrirRoleta=abrirRoleta;
window.fecharRoleta=fecharRoleta;
window.girarRoleta=girarRoleta;
window.resetarRoletaParaNovoPedido=resetarRoletaParaNovoPedido;
window.atualizarBotaoRoleta=atualizarBotaoRoleta;
window.obterLimiteRoleta=obterLimiteRoleta;
window.renderizarFatiasRoleta=renderizarFatiasRoleta;
window.invalidarRoletaVisual=invalidarRoletaVisual;
