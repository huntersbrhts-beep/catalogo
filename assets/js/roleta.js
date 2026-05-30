let descontoRoleta = null;
let roletaGirando = false;
let roletaJaGirou = false;

function normalizarPremioRoleta(p){
  const texto = String(p?.texto || p?.nome || p?.codigo || '').trim();
  const tipo = String(p?.tipo || 'nenhum').trim();
  const valor = Number(p?.valor || 0);
  if(!texto) return null;
  return { texto, tipo, valor };
}

function getConfigRoletaLocal(){
  const cfg = getConfigRoleta ? getConfigRoleta() : { limite:0, premios:[] };
  return {
    limite: Number(cfg?.limite || 0),
    premios: Array.isArray(cfg?.premios) ? cfg.premios.map(normalizarPremioRoleta).filter(Boolean).slice(0,8) : []
  };
}

async function carregarConfigRoletaAtualizada(){
  // Fonte principal: Supabase configuracoes/config_roleta. Fallback: localStorage.
  try{
    if(typeof buscarConfiguracaoBanco === 'function'){
      const { data, error } = await buscarConfiguracaoBanco('config_roleta');
      if(!error && data && data.valor){
        localStorage.setItem('config_roleta', JSON.stringify(data.valor));
      }
    }
  }catch(e){
    console.warn('Roleta usando cache local:', e?.message || e);
  }
  return getConfigRoletaLocal();
}

function obterPremiosRoleta(){ return getConfigRoletaLocal().premios; }
function obterLimiteRoleta(){ return getConfigRoletaLocal().limite; }

function limparVisualRoleta(){
  const labels=document.getElementById('roleta-labels');
  if(labels){ labels.removeAttribute('data-ok'); labels.innerHTML=''; }
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

function renderizarFatiasRoleta(){
  const labels=document.getElementById('roleta-labels');
  if(!labels) return;
  const premios=obterPremiosRoleta();
  labels.removeAttribute('data-ok');
  if(!premios.length){
    labels.innerHTML='<span style="transform:translateY(-105px)">Sem prêmios</span>';
    return;
  }
  const passo=360/premios.length;
  labels.innerHTML=premios.map((p,i)=>{
    const ang=i*passo+passo/2;
    return `<span style="transform:rotate(${ang}deg) translateY(-105px) rotate(-${ang}deg)">${escaparHtml(p.texto)}</span>`;
  }).join('');
  labels.dataset.ok=String(premios.length);
}

async function abrirRoleta() {
  const modal=document.getElementById('modal-roleta-cupom');
  const resultado=document.getElementById('resultado-roleta');
  if(!modal) return;
  await carregarConfigRoletaAtualizada();
  limparVisualRoleta();
  renderizarFatiasRoleta();
  const premios=obterPremiosRoleta();
  if(resultado && !roletaJaGirou){
    resultado.textContent = premios.length ? `${premios.length} prêmio(s) carregado(s).` : 'Nenhum prêmio encontrado. Salve no ADM e confira o SQL configuracoes.';
  }
  if(resultado && roletaJaGirou){
    resultado.textContent=descontoRoleta&&descontoRoleta.tipo!=='nenhum'?`Cupom já liberado: ${descontoRoleta.texto}`:'Você já girou a roleta neste pedido.';
  }
  atualizarBotaoRoleta();
  modal.classList.add('active');
  document.body.style.overflow='hidden';
}

function fecharRoleta(){
  const modal=document.getElementById('modal-roleta-cupom');
  if(modal) modal.classList.remove('active');
  document.body.style.overflow='';
}

async function girarRoleta(){
  if(roletaGirando) return;
  const resultado=document.getElementById('resultado-roleta');
  const wheel=document.getElementById('roleta-wheel');
  if(!wheel || !resultado) return;

  await carregarConfigRoletaAtualizada();
  limparVisualRoleta();
  renderizarFatiasRoleta();

  if(roletaJaGirou){resultado.textContent='A roleta só pode ser girada uma vez por pedido.'; atualizarBotaoRoleta(); return;}
  if(!cupomTemLimiteDisponivel({codigo:'ROLETA',limite:obterLimiteRoleta()})){resultado.textContent='Os cupons da roleta acabaram.'; atualizarBotaoRoleta(); return;}

  const premios=obterPremiosRoleta();
  if(!premios.length){resultado.textContent='Nenhum prêmio configurado. Salve os prêmios no ADM e rode o SQL da tabela configuracoes.'; return;}

  roletaGirando=true;
  atualizarBotaoRoleta();
  resultado.textContent=`Girando com ${premios.length} prêmio(s) configurado(s)...`;

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
      resultado.textContent=`Resultado: ${premio.texto}`;
    }else{
      descontoRoleta={...premio,codigo:'ROLETA'};
      resultado.textContent=`Cupom liberado: ${premio.texto}`;
      const input=document.getElementById('cupom-cliente');
      if(input) input.value='ROLETA';
    }
    atualizarBotaoRoleta();
    if(typeof atualizarCarrinho==='function') atualizarCarrinho();
  },3200);
}

function resetarRoletaParaNovoPedido(){
  descontoRoleta=null; roletaGirando=false; roletaJaGirou=false;
  const input=document.getElementById('cupom-cliente'); if(input&&input.value.trim().toUpperCase()==='ROLETA')input.value='';
  const resultado=document.getElementById('resultado-roleta'); if(resultado)resultado.textContent='';
  limparVisualRoleta(); renderizarFatiasRoleta(); atualizarBotaoRoleta();
}
function atualizarRoletaDepoisDoAdm(){
  descontoRoleta=null; roletaJaGirou=false; roletaGirando=false;
  const input=document.getElementById('cupom-cliente'); if(input&&input.value.trim().toUpperCase()==='ROLETA')input.value='';
  const resultado=document.getElementById('resultado-roleta'); if(resultado)resultado.textContent='Prêmios atualizados pelo ADM.';
  limparVisualRoleta(); renderizarFatiasRoleta(); atualizarBotaoRoleta(); if(typeof atualizarCarrinho==='function')atualizarCarrinho();
}

window.abrirRoleta=abrirRoleta;
window.fecharRoleta=fecharRoleta;
window.girarRoleta=girarRoleta;
window.resetarRoletaParaNovoPedido=resetarRoletaParaNovoPedido;
window.atualizarBotaoRoleta=atualizarBotaoRoleta;
window.obterLimiteRoleta=obterLimiteRoleta;
window.renderizarFatiasRoleta=renderizarFatiasRoleta;
window.atualizarRoletaDepoisDoAdm=atualizarRoletaDepoisDoAdm;
window.carregarConfigRoletaAtualizada=carregarConfigRoletaAtualizada;
