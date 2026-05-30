/* Roleta v15 - sem valores fixos: sempre lê config_roleta do Supabase */
let descontoRoleta = null;
let roletaGirando = false;
let roletaJaGirou = false;
let roletaConfigAtual = { limite: 0, premios: [], fonte: 'não carregada', updated_at: null };

function normalizarPremioRoleta(p){
  const texto = String(p?.texto || p?.nome || p?.codigo || '').trim();
  const tipoRaw = String(p?.tipo || 'nenhum').trim().toLowerCase();
  const tipo = ['percentual','valor','nenhum'].includes(tipoRaw) ? tipoRaw : 'nenhum';
  const valor = Number(p?.valor || 0);
  if(!texto) return null;
  return { texto, tipo, valor: tipo === 'nenhum' ? 0 : valor };
}

function normalizarConfigRoleta(cfg, fonte, updated_at){
  const premios = Array.isArray(cfg?.premios) ? cfg.premios.map(normalizarPremioRoleta).filter(Boolean).slice(0, 8) : [];
  return { limite: Number(cfg?.limite || 0), premios, fonte: fonte || 'Supabase', updated_at: updated_at || null };
}

function salvarConfigRoletaMemoria(cfg){
  roletaConfigAtual = normalizarConfigRoleta(cfg, cfg?.fonte || 'memória', cfg?.updated_at || null);
  try { localStorage.setItem('config_roleta_ultima_supabase', JSON.stringify(roletaConfigAtual)); } catch(e) {}
  return roletaConfigAtual;
}

async function carregarConfigRoletaAtualizada(){
  if(typeof buscarConfiguracaoBanco !== 'function'){
    roletaConfigAtual = { limite:0, premios:[], fonte:'erro: supabase-service.js não carregou', updated_at:null };
    return roletaConfigAtual;
  }
  try{
    const { data, error } = await buscarConfiguracaoBanco('config_roleta');
    if(error) throw error;
    if(!data || !data.valor){
      roletaConfigAtual = { limite:0, premios:[], fonte:'Supabase sem config_roleta', updated_at:null };
      return roletaConfigAtual;
    }
    return salvarConfigRoletaMemoria({ ...data.valor, fonte:'Supabase', updated_at:data.updated_at || null });
  }catch(e){
    console.error('Roleta não conseguiu ler Supabase:', e);
    roletaConfigAtual = { limite:0, premios:[], fonte:'ERRO Supabase: '+(e?.message || e), updated_at:null };
    return roletaConfigAtual;
  }
}

function obterPremiosRoleta(){ return Array.isArray(roletaConfigAtual.premios) ? roletaConfigAtual.premios : []; }
function obterLimiteRoleta(){ return Number(roletaConfigAtual.limite || 0); }

function limparVisualRoleta(){
  const labels=document.getElementById('roleta-labels');
  if(labels){ labels.removeAttribute('data-ok'); labels.innerHTML=''; }
  const wheel=document.getElementById('roleta-wheel');
  if(wheel) wheel.style.transform='rotate(0deg)';
}

function aplicarCoresRoleta(){
  const wheel=document.getElementById('roleta-wheel');
  if(!wheel) return;
  const premios=obterPremiosRoleta();
  if(!premios.length){
    wheel.style.background='conic-gradient(#333 0deg 360deg)';
    return;
  }
  const cores=['#ff7a00','#1f1f22','#ff9d00','#2a2a2d','#e86800','#111','#b45309','#3f3f46'];
  const passo=360/premios.length;
  const partes=premios.map((_,i)=>`${cores[i%cores.length]} ${i*passo}deg ${(i+1)*passo}deg`);
  wheel.style.background=`conic-gradient(${partes.join(',')})`;
}

function atualizarBotaoRoleta() {
  const btnCarrinho = document.getElementById('btn-abrir-roleta');
  const btnGirar = document.getElementById('btn-girar-roleta');
  const premios = obterPremiosRoleta();
  const roletaSemPremios = premios.length === 0;
  const roletaEsgotada = !cupomTemLimiteDisponivel({ codigo: 'ROLETA', limite: obterLimiteRoleta() });
  if (btnCarrinho) {
    btnCarrinho.disabled = roletaJaGirou || roletaEsgotada || roletaSemPremios;
    btnCarrinho.classList.toggle('opacity-60', roletaJaGirou || roletaEsgotada || roletaSemPremios);
    btnCarrinho.classList.toggle('cursor-not-allowed', roletaJaGirou || roletaEsgotada || roletaSemPremios);
    btnCarrinho.innerHTML = roletaSemPremios ? '<i class="fas fa-triangle-exclamation mr-2"></i> Roleta sem prêmios' : (roletaEsgotada ? '<i class="fas fa-ban mr-2"></i> Cupons da roleta esgotados' : (roletaJaGirou ? '<i class="fas fa-lock mr-2"></i> Roleta já utilizada neste pedido' : '<i class="fas fa-gift mr-2"></i> Girar roleta de desconto'));
  }
  if (btnGirar) {
    btnGirar.disabled = roletaJaGirou || roletaGirando || roletaEsgotada || roletaSemPremios;
    btnGirar.classList.toggle('opacity-60', roletaJaGirou || roletaGirando || roletaEsgotada || roletaSemPremios);
    btnGirar.classList.toggle('cursor-not-allowed', roletaJaGirou || roletaGirando || roletaEsgotada || roletaSemPremios);
    btnGirar.textContent = roletaSemPremios ? 'Sem prêmios' : (roletaEsgotada ? 'Cupons esgotados' : (roletaJaGirou ? 'Roleta já usada' : 'Girar agora'));
  }
}

function renderizarFatiasRoleta(){
  const labels=document.getElementById('roleta-labels');
  if(!labels) return;
  const premios=obterPremiosRoleta();
  labels.removeAttribute('data-ok');
  aplicarCoresRoleta();
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

function textoFonteRoleta(cfg){
  return `${cfg.premios.length} prêmio(s) carregado(s) de ${cfg.fonte}${cfg.updated_at ? ' • '+new Date(cfg.updated_at).toLocaleString('pt-BR') : ''}.`;
}

async function abrirRoleta() {
  const modal=document.getElementById('modal-roleta-cupom');
  const resultado=document.getElementById('resultado-roleta');
  if(!modal) return;
  const cfg = await carregarConfigRoletaAtualizada();
  limparVisualRoleta();
  renderizarFatiasRoleta();
  if(resultado && !roletaJaGirou){
    resultado.textContent = cfg.premios.length ? textoFonteRoleta(cfg) : `Nenhum prêmio encontrado. Fonte: ${cfg.fonte}. Salve no ADM.`;
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

  const cfg = await carregarConfigRoletaAtualizada();
  limparVisualRoleta();
  renderizarFatiasRoleta();

  if(roletaJaGirou){resultado.textContent='A roleta só pode ser girada uma vez por pedido.'; atualizarBotaoRoleta(); return;}
  if(!cupomTemLimiteDisponivel({codigo:'ROLETA',limite:obterLimiteRoleta()})){resultado.textContent='Os cupons da roleta acabaram.'; atualizarBotaoRoleta(); return;}

  const premios=obterPremiosRoleta();
  if(!premios.length){resultado.textContent=`Nenhum prêmio configurado. Fonte: ${cfg.fonte}.`; atualizarBotaoRoleta(); return;}

  roletaGirando=true;
  atualizarBotaoRoleta();
  resultado.textContent=`Girando com ${premios.length} prêmio(s) de ${cfg.fonte}...`;

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

async function atualizarRoletaDepoisDoAdm(){
  descontoRoleta=null; roletaJaGirou=false; roletaGirando=false;
  const input=document.getElementById('cupom-cliente'); if(input&&input.value.trim().toUpperCase()==='ROLETA')input.value='';
  await carregarConfigRoletaAtualizada();
  limparVisualRoleta(); renderizarFatiasRoleta(); atualizarBotaoRoleta();
  const resultado=document.getElementById('resultado-roleta'); if(resultado)resultado.textContent=textoFonteRoleta(roletaConfigAtual);
  if(typeof atualizarCarrinho==='function')atualizarCarrinho();
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
window.salvarConfigRoletaMemoria=salvarConfigRoletaMemoria;
window.obterPremiosRoleta=obterPremiosRoleta;
