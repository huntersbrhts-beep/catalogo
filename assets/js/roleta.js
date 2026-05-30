/* V17 - Roleta definitiva: uma única fonte = Supabase tabela configuracoes, chave config_roleta.
   Não usa prêmios padrão escondidos e não usa localStorage para decidir prêmio. */
let descontoRoleta = null;
let roletaGirando = false;
let roletaJaGirou = false;
let roletaConfigAtual = { limite: 0, premios: [], fonte: 'não carregada', updated_at: null, erro: null };

const ROLETA_CHAVE = 'config_roleta';

function normalizarPremioRoleta(p){
  const texto = String((p && (p.texto || p.nome || p.codigo)) || '').trim();
  const tipoRaw = String((p && p.tipo) || 'nenhum').trim().toLowerCase();
  const tipo = ['percentual','valor','nenhum'].includes(tipoRaw) ? tipoRaw : 'nenhum';
  const valor = tipo === 'nenhum' ? 0 : Number((p && p.valor) || 0);
  if(!texto) return null;
  return { texto, tipo, valor };
}

function normalizarConfigRoleta(cfg, fonte, updated_at, erro){
  const premios = Array.isArray(cfg && cfg.premios)
    ? cfg.premios.map(normalizarPremioRoleta).filter(Boolean).slice(0, 8)
    : [];
  return {
    limite: Number((cfg && cfg.limite) || 0),
    premios,
    fonte: fonte || 'Supabase',
    updated_at: updated_at || (cfg && cfg._salvo_em) || null,
    erro: erro || null
  };
}

function statusRoletaTexto(cfg){
  if(cfg.erro) return `ERRO: ${cfg.erro}`;
  return `${cfg.premios.length} prêmio(s) carregado(s) do ${cfg.fonte}${cfg.updated_at ? ' • '+new Date(cfg.updated_at).toLocaleString('pt-BR') : ''}`;
}

async function lerRoletaSupabase(){
  if(typeof _supabase === 'undefined'){
    return { data:null, error:{ message:'Supabase não carregou no site.' } };
  }
  return await _supabase
    .from('configuracoes')
    .select('chave,valor,updated_at')
    .eq('chave', ROLETA_CHAVE)
    .maybeSingle();
}

async function salvarRoletaSupabase(cfg){
  const valor = {
    limite: Number((cfg && cfg.limite) || 0),
    premios: Array.isArray(cfg && cfg.premios) ? cfg.premios.map(normalizarPremioRoleta).filter(Boolean).slice(0,8) : [],
    _salvo_em: new Date().toISOString(),
    _versao: 'v17'
  };

  if(!valor.premios.length){
    return { data:null, error:{ message:'Nenhum prêmio válido para salvar.' } };
  }

  const gravacao = await _supabase
    .from('configuracoes')
    .upsert([{ chave: ROLETA_CHAVE, valor, updated_at: new Date().toISOString() }], { onConflict: 'chave' })
    .select('chave,valor,updated_at')
    .maybeSingle();

  if(gravacao.error){
    return { data:null, error:gravacao.error };
  }

  const leitura = await lerRoletaSupabase();
  if(leitura.error){
    return { data:null, error:leitura.error };
  }
  if(!leitura.data || !leitura.data.valor){
    return { data:null, error:{ message:'Salvou, mas a leitura do Supabase voltou vazia.' } };
  }

  const cfgLida = normalizarConfigRoleta(leitura.data.valor, 'Supabase', leitura.data.updated_at);
  const nomesSalvos = valor.premios.map(p=>p.texto).join('|');
  const nomesLidos = cfgLida.premios.map(p=>p.texto).join('|');
  if(nomesSalvos !== nomesLidos){
    return { data:null, error:{ message:'O Supabase leu prêmios diferentes dos que foram salvos. Verifique se há gatilho/política alterando a tabela configuracoes.' } };
  }

  roletaConfigAtual = cfgLida;
  window.roletaConfigAtual = roletaConfigAtual;
  return { data:cfgLida, error:null };
}

async function carregarConfigRoletaAtualizada(){
  try{
    const { data, error } = await lerRoletaSupabase();
    if(error) throw error;
    if(!data || !data.valor){
      roletaConfigAtual = { limite:0, premios:[], fonte:'Supabase sem config_roleta', updated_at:null, erro:'Nenhuma configuração da roleta salva no Supabase.' };
    }else{
      roletaConfigAtual = normalizarConfigRoleta(data.valor, 'Supabase', data.updated_at);
      if(!roletaConfigAtual.premios.length){
        roletaConfigAtual.erro = 'Configuração encontrada, mas sem prêmios válidos.';
      }
    }
  }catch(e){
    roletaConfigAtual = { limite:0, premios:[], fonte:'ERRO Supabase', updated_at:null, erro:(e && (e.message || String(e))) || 'Erro desconhecido' };
  }
  window.roletaConfigAtual = roletaConfigAtual;
  return roletaConfigAtual;
}

function obterPremiosRoleta(){
  return Array.isArray(roletaConfigAtual.premios) ? roletaConfigAtual.premios : [];
}

function obterLimiteRoleta(){
  return Number(roletaConfigAtual.limite || 0);
}

function limparVisualRoleta(){
  const labels = document.getElementById('roleta-labels');
  if(labels){ labels.removeAttribute('data-ok'); labels.innerHTML = ''; }
  const wheel = document.getElementById('roleta-wheel');
  if(wheel) wheel.style.transform = 'rotate(0deg)';
}

function aplicarCoresRoleta(){
  const wheel = document.getElementById('roleta-wheel');
  if(!wheel) return;
  const premios = obterPremiosRoleta();
  if(!premios.length){
    wheel.style.background = 'conic-gradient(#333 0deg 360deg)';
    return;
  }
  const cores = ['#ff7a00','#1f1f22','#ff9d00','#2a2a2d','#e86800','#111','#b45309','#3f3f46'];
  const passo = 360 / premios.length;
  wheel.style.background = `conic-gradient(${premios.map((_,i)=>`${cores[i%cores.length]} ${i*passo}deg ${(i+1)*passo}deg`).join(',')})`;
}

function renderizarFatiasRoleta(){
  const labels = document.getElementById('roleta-labels');
  if(!labels) return;
  const premios = obterPremiosRoleta();
  aplicarCoresRoleta();
  labels.removeAttribute('data-ok');
  if(!premios.length){
    labels.innerHTML = '<span style="transform:translateY(-105px)">Sem prêmios</span>';
    return;
  }
  const passo = 360 / premios.length;
  labels.innerHTML = premios.map((p,i)=>{
    const ang = i * passo + passo / 2;
    return `<span style="transform:rotate(${ang}deg) translateY(-105px) rotate(-${ang}deg)">${escaparHtml(p.texto)}</span>`;
  }).join('');
  labels.dataset.ok = String(premios.length);
}

function atualizarBotaoRoleta(){
  const btnCarrinho = document.getElementById('btn-abrir-roleta');
  const btnGirar = document.getElementById('btn-girar-roleta');
  const semPremios = !obterPremiosRoleta().length;
  const esgotada = !cupomTemLimiteDisponivel({ codigo:'ROLETA', limite:obterLimiteRoleta() });
  const travada = roletaJaGirou || roletaGirando || semPremios || esgotada;

  if(btnCarrinho){
    btnCarrinho.disabled = roletaJaGirou || semPremios || esgotada;
    btnCarrinho.classList.toggle('opacity-60', btnCarrinho.disabled);
    btnCarrinho.classList.toggle('cursor-not-allowed', btnCarrinho.disabled);
    btnCarrinho.innerHTML = semPremios
      ? '<i class="fas fa-triangle-exclamation mr-2"></i> Roleta sem prêmios'
      : (esgotada
        ? '<i class="fas fa-ban mr-2"></i> Cupons da roleta esgotados'
        : (roletaJaGirou
          ? '<i class="fas fa-lock mr-2"></i> Roleta já utilizada neste pedido'
          : '<i class="fas fa-gift mr-2"></i> Girar roleta de desconto'));
  }

  if(btnGirar){
    btnGirar.disabled = travada;
    btnGirar.classList.toggle('opacity-60', travada);
    btnGirar.classList.toggle('cursor-not-allowed', travada);
    btnGirar.textContent = semPremios ? 'Sem prêmios' : (esgotada ? 'Cupons esgotados' : (roletaJaGirou ? 'Roleta já usada' : 'Girar agora'));
  }
}

async function abrirRoleta(){
  const modal = document.getElementById('modal-roleta-cupom');
  const resultado = document.getElementById('resultado-roleta');
  if(!modal) return;

  const cfg = await carregarConfigRoletaAtualizada();
  limparVisualRoleta();
  renderizarFatiasRoleta();

  if(resultado){
    if(roletaJaGirou){
      resultado.textContent = descontoRoleta && descontoRoleta.tipo !== 'nenhum' ? `Cupom já liberado: ${descontoRoleta.texto}` : 'Você já girou a roleta neste pedido.';
    }else{
      resultado.textContent = cfg.erro ? `Não carregou do Supabase: ${cfg.erro}` : statusRoletaTexto(cfg);
    }
  }
  atualizarBotaoRoleta();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharRoleta(){
  const modal = document.getElementById('modal-roleta-cupom');
  if(modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

async function girarRoleta(){
  if(roletaGirando) return;
  const resultado = document.getElementById('resultado-roleta');
  const wheel = document.getElementById('roleta-wheel');
  if(!wheel || !resultado) return;

  const cfg = await carregarConfigRoletaAtualizada();
  limparVisualRoleta();
  renderizarFatiasRoleta();

  if(roletaJaGirou){ resultado.textContent = 'A roleta só pode ser girada uma vez por pedido.'; atualizarBotaoRoleta(); return; }
  if(cfg.erro){ resultado.textContent = 'Roleta não carregou do Supabase: ' + cfg.erro; atualizarBotaoRoleta(); return; }
  if(!cupomTemLimiteDisponivel({ codigo:'ROLETA', limite:obterLimiteRoleta() })){ resultado.textContent = 'Os cupons da roleta acabaram.'; atualizarBotaoRoleta(); return; }

  const premios = obterPremiosRoleta();
  if(!premios.length){ resultado.textContent = 'Nenhum prêmio salvo no Supabase. Vá no ADM, adicione prêmios e salve.'; atualizarBotaoRoleta(); return; }

  roletaGirando = true;
  atualizarBotaoRoleta();
  resultado.textContent = `Girando com ${premios.length} prêmio(s) do Supabase...`;

  const index = Math.floor(Math.random() * premios.length);
  const passo = 360 / premios.length;
  const voltas = 6 + Math.floor(Math.random() * 3);
  const anguloFinal = (voltas * 360) + (360 - (index * passo + passo / 2));
  wheel.style.transform = `rotate(${anguloFinal}deg)`;

  setTimeout(()=>{
    const premio = premios[index];
    roletaGirando = false;
    roletaJaGirou = true;
    if(premio.tipo === 'nenhum'){
      descontoRoleta = null;
      resultado.textContent = `Resultado: ${premio.texto}`;
    }else{
      descontoRoleta = { ...premio, codigo:'ROLETA' };
      resultado.textContent = `Cupom liberado: ${premio.texto}`;
      const input = document.getElementById('cupom-cliente');
      if(input) input.value = 'ROLETA';
    }
    atualizarBotaoRoleta();
    if(typeof atualizarCarrinho === 'function') atualizarCarrinho();
  }, 3200);
}

function resetarRoletaParaNovoPedido(){
  descontoRoleta = null;
  roletaGirando = false;
  roletaJaGirou = false;
  const input = document.getElementById('cupom-cliente');
  if(input && input.value.trim().toUpperCase() === 'ROLETA') input.value = '';
  const resultado = document.getElementById('resultado-roleta');
  if(resultado) resultado.textContent = '';
  limparVisualRoleta();
  renderizarFatiasRoleta();
  atualizarBotaoRoleta();
}

async function atualizarRoletaDepoisDoAdm(){
  descontoRoleta = null;
  roletaJaGirou = false;
  roletaGirando = false;
  const input = document.getElementById('cupom-cliente');
  if(input && input.value.trim().toUpperCase() === 'ROLETA') input.value = '';
  const cfg = await carregarConfigRoletaAtualizada();
  limparVisualRoleta();
  renderizarFatiasRoleta();
  atualizarBotaoRoleta();
  const resultado = document.getElementById('resultado-roleta');
  if(resultado) resultado.textContent = cfg.erro ? `ERRO: ${cfg.erro}` : statusRoletaTexto(cfg);
  if(typeof atualizarCarrinho === 'function') atualizarCarrinho();
}

function coletarPremiosRoletaAdmin(){
  const premios = [];
  document.querySelectorAll('[data-premio-roleta-index]').forEach(row=>{
    const idx = row.getAttribute('data-premio-roleta-index');
    const premio = normalizarPremioRoleta({
      texto: document.getElementById('premio-edit-texto-'+idx)?.value || '',
      tipo: document.getElementById('premio-edit-tipo-'+idx)?.value || 'nenhum',
      valor: document.getElementById('premio-edit-valor-'+idx)?.value || 0
    });
    if(premio) premios.push(premio);
  });
  return premios;
}

async function salvarTodosPremiosRoletaAdmin(){
  const limite = parseInt(document.getElementById('roleta-limite-admin')?.value || '0') || 0;
  const premios = coletarPremiosRoletaAdmin();
  if(!premios.length){ alert('Adicione pelo menos 1 prêmio antes de salvar.'); return; }

  const resp = await salvarRoletaSupabase({ limite, premios });
  if(resp.error){
    alert('NÃO salvou no Supabase. Erro real: ' + (resp.error.message || resp.error));
    return;
  }

  await renderizarRoletaAdmin();
  await atualizarRoletaDepoisDoAdm();
  alert('Salvo no Supabase com sucesso. Prêmios ativos: ' + resp.data.premios.map(p=>p.texto).join(', '));
}

async function salvarRoletaConfigAdmin(){
  await salvarTodosPremiosRoletaAdmin();
}

async function salvarPremioRoletaAdmin(){
  const premio = normalizarPremioRoleta({
    texto: document.getElementById('premio-texto')?.value || '',
    tipo: document.getElementById('premio-tipo')?.value || 'nenhum',
    valor: document.getElementById('premio-valor')?.value || 0
  });

  if(!premio){ alert('Informe o nome do prêmio.'); return; }
  if(premio.tipo !== 'nenhum' && !premio.valor){ alert('Informe o valor do prêmio.'); return; }

  await carregarConfigRoletaAtualizada();
  const premios = [...obterPremiosRoleta(), premio].slice(0,8);
  const limite = parseInt(document.getElementById('roleta-limite-admin')?.value || roletaConfigAtual.limite || '0') || 0;

  const resp = await salvarRoletaSupabase({ limite, premios });
  if(resp.error){ alert('NÃO salvou no Supabase. Erro real: ' + (resp.error.message || resp.error)); return; }

  const texto = document.getElementById('premio-texto'); if(texto) texto.value = '';
  const valor = document.getElementById('premio-valor'); if(valor) valor.value = '';
  await renderizarRoletaAdmin();
  await atualizarRoletaDepoisDoAdm();
}

async function removerPremioRoletaAdmin(i){
  await carregarConfigRoletaAtualizada();
  const premios = obterPremiosRoleta().filter((_,idx)=>idx !== i);
  if(!premios.length){ alert('A roleta precisa ter pelo menos 1 prêmio.'); return; }
  const resp = await salvarRoletaSupabase({ limite:obterLimiteRoleta(), premios });
  if(resp.error){ alert('NÃO removeu no Supabase. Erro real: ' + (resp.error.message || resp.error)); return; }
  await renderizarRoletaAdmin();
  await atualizarRoletaDepoisDoAdm();
}

async function renderizarRoletaAdmin(){
  const cfg = await carregarConfigRoletaAtualizada();
  const limiteEl = document.getElementById('roleta-limite-admin');
  if(limiteEl) limiteEl.value = cfg.limite || 0;
  const box = document.getElementById('lista-premios-roleta');
  if(!box) return;
  const usados = typeof usoCupomCodigo === 'function' ? usoCupomCodigo('ROLETA') : 0;
  const premios = obterPremiosRoleta();

  box.innerHTML =
    `<div class="bg-green-500/10 border border-green-500/30 text-green-200 p-3 rounded-xl text-sm mb-3">Fonte: <b>${escaparHtml(cfg.fonte)}</b><br>Chave Supabase: <b>${ROLETA_CHAVE}</b>${cfg.updated_at ? '<br>Atualizado: '+new Date(cfg.updated_at).toLocaleString('pt-BR') : ''}${cfg.erro ? '<br><span class="text-red-300">Erro: '+escaparHtml(cfg.erro)+'</span>' : ''}</div>`+
    `<p class="text-sm text-gray-400 mb-2">Usados: ${usados}/${cfg.limite || 'sem limite'} • Prêmios carregados: ${premios.length}</p>`+
    (premios.length
      ? premios.map((p,i)=>`<div class="admin-card space-y-2" data-premio-roleta-index="${i}"><div class="grid grid-cols-1 md:grid-cols-4 gap-2"><input id="premio-edit-texto-${i}" value="${escaparHtml(p.texto)}" class="p-3 rounded-xl" placeholder="Nome"><select id="premio-edit-tipo-${i}" class="p-3 rounded-xl"><option value="percentual" ${p.tipo==='percentual'?'selected':''}>%</option><option value="valor" ${p.tipo==='valor'?'selected':''}>R$</option><option value="nenhum" ${p.tipo==='nenhum'?'selected':''}>Sem desconto</option></select><input id="premio-edit-valor-${i}" type="number" step="0.01" value="${Number(p.valor || 0)}" class="p-3 rounded-xl" placeholder="Valor"><button onclick="removerPremioRoletaAdmin(${i})" class="bg-red-600 hover:bg-red-700 text-white rounded-xl">Excluir</button></div></div>`).join('')
      : '<p class="text-yellow-300 bg-yellow-500/10 p-3 rounded-xl">Nenhum prêmio carregado do Supabase. Adicione um prêmio e salve.</p>')+
    '<button onclick="salvarTodosPremiosRoletaAdmin()" class="w-full btn-primary p-3 rounded-xl mt-3">Salvar tudo no Supabase</button>';

  renderizarFatiasRoleta();
  atualizarBotaoRoleta();
}

async function diagnosticoRoletaSupabase(){
  const cfg = await carregarConfigRoletaAtualizada();
  alert(cfg.erro ? 'Erro na roleta: '+cfg.erro : 'Roleta lendo do Supabase: '+cfg.premios.map(p=>p.texto).join(', '));
}

window.abrirRoleta = abrirRoleta;
window.fecharRoleta = fecharRoleta;
window.girarRoleta = girarRoleta;
window.resetarRoletaParaNovoPedido = resetarRoletaParaNovoPedido;
window.atualizarBotaoRoleta = atualizarBotaoRoleta;
window.obterLimiteRoleta = obterLimiteRoleta;
window.obterPremiosRoleta = obterPremiosRoleta;
window.renderizarFatiasRoleta = renderizarFatiasRoleta;
window.atualizarRoletaDepoisDoAdm = atualizarRoletaDepoisDoAdm;
window.carregarConfigRoletaAtualizada = carregarConfigRoletaAtualizada;
window.renderizarRoletaAdmin = renderizarRoletaAdmin;
window.salvarTodosPremiosRoletaAdmin = salvarTodosPremiosRoletaAdmin;
window.salvarRoletaConfigAdmin = salvarRoletaConfigAdmin;
window.salvarPremioRoletaAdmin = salvarPremioRoletaAdmin;
window.removerPremioRoletaAdmin = removerPremioRoletaAdmin;
window.diagnosticoRoletaSupabase = diagnosticoRoletaSupabase;

window.addEventListener('DOMContentLoaded', async ()=>{
  await carregarConfigRoletaAtualizada();
  renderizarFatiasRoleta();
  atualizarBotaoRoleta();
});
