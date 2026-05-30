/* V16 DEFINITIVO - Roleta 100% ligada ao Supabase, sem modo padrão escondido.
   Salva e lê a chave nova roleta_premios_site_v16 e também atualiza config_roleta. */
const ROLETA_CHAVE_PRINCIPAL_V16 = 'roleta_premios_site_v16';
const ROLETA_CHAVE_LEGADA_V16 = 'config_roleta';
let ROLETA_CONFIG_V16 = { limite: 0, premios: [], fonte: 'não carregada', updated_at: null, erro: null };

function normalizarPremioV16(p){
  const texto = String(p && (p.texto || p.nome || p.codigo) || '').trim();
  const tipoRaw = String(p && p.tipo || 'nenhum').toLowerCase().trim();
  const tipo = ['percentual','valor','nenhum'].includes(tipoRaw) ? tipoRaw : 'nenhum';
  const valor = tipo === 'nenhum' ? 0 : Number(p && p.valor || 0);
  if(!texto) return null;
  return { texto, tipo, valor };
}

function normalizarConfigV16(cfg, fonte, updated_at, erro){
  const premios = Array.isArray(cfg && cfg.premios) ? cfg.premios.map(normalizarPremioV16).filter(Boolean).slice(0,8) : [];
  return {
    limite: Number(cfg && cfg.limite || 0),
    premios,
    fonte: fonte || 'Supabase',
    updated_at: updated_at || cfg?._salvo_em || null,
    erro: erro || null,
    _versao: cfg && cfg._versao || 'v16'
  };
}

async function buscarUmaConfigV16(chave){
  if(typeof _supabase === 'undefined') throw new Error('Supabase não carregou.');
  return await _supabase
    .from('configuracoes')
    .select('chave,valor,updated_at')
    .eq('chave', chave)
    .maybeSingle();
}

async function salvarUmaConfigV16(chave, valor){
  const payload = { chave, valor, updated_at: new Date().toISOString() };
  let resp = await _supabase
    .from('configuracoes')
    .upsert([payload], { onConflict: 'chave' })
    .select('chave,valor,updated_at')
    .maybeSingle();

  if(resp.error){
    // fallback para projetos onde upsert fica bloqueado por política antiga
    resp = await _supabase.from('configuracoes').update(payload).eq('chave', chave).select('chave,valor,updated_at').maybeSingle();
  }
  if(resp.error || !resp.data){
    resp = await _supabase.from('configuracoes').insert([payload]).select('chave,valor,updated_at').maybeSingle();
  }
  return resp;
}

async function salvarRoletaSupabaseV16(cfg){
  const normalizada = normalizarConfigV16(cfg, 'ADM').premios;
  const valor = {
    limite: Number(cfg && cfg.limite || 0),
    premios: normalizada,
    _versao: 'v16-definitivo',
    _salvo_em: new Date().toISOString()
  };

  const r1 = await salvarUmaConfigV16(ROLETA_CHAVE_PRINCIPAL_V16, valor);
  if(r1.error) return { error: r1.error };

  // Mantém compatibilidade com qualquer parte antiga do sistema.
  await salvarUmaConfigV16(ROLETA_CHAVE_LEGADA_V16, valor);

  const leitura = await buscarUmaConfigV16(ROLETA_CHAVE_PRINCIPAL_V16);
  if(leitura.error) return { error: leitura.error };
  if(!leitura.data || !leitura.data.valor) return { error: { message: 'Salvou, mas não conseguiu reler a roleta no Supabase.' } };

  ROLETA_CONFIG_V16 = normalizarConfigV16(leitura.data.valor, 'Supabase v16', leitura.data.updated_at);
  try{
    localStorage.setItem(ROLETA_CHAVE_PRINCIPAL_V16, JSON.stringify(leitura.data.valor));
    localStorage.setItem(ROLETA_CHAVE_LEGADA_V16, JSON.stringify(leitura.data.valor));
  }catch(e){}
  return { data: ROLETA_CONFIG_V16, error: null };
}

async function carregarConfigRoletaAtualizada(){
  try{
    let leitura = await buscarUmaConfigV16(ROLETA_CHAVE_PRINCIPAL_V16);
    if(leitura.error) throw leitura.error;

    if(!leitura.data || !leitura.data.valor || !Array.isArray(leitura.data.valor.premios) || !leitura.data.valor.premios.length){
      leitura = await buscarUmaConfigV16(ROLETA_CHAVE_LEGADA_V16);
      if(leitura.error) throw leitura.error;
    }

    if(!leitura.data || !leitura.data.valor){
      ROLETA_CONFIG_V16 = { limite:0, premios:[], fonte:'Supabase sem roleta salva', updated_at:null, erro:null };
    }else{
      const chave = leitura.data.chave === ROLETA_CHAVE_PRINCIPAL_V16 ? 'Supabase v16' : 'Supabase legado';
      ROLETA_CONFIG_V16 = normalizarConfigV16(leitura.data.valor, chave, leitura.data.updated_at);
    }
  }catch(e){
    ROLETA_CONFIG_V16 = { limite:0, premios:[], fonte:'ERRO Supabase', updated_at:null, erro:e && (e.message || String(e)) };
  }
  window.ROLETA_CONFIG_V16 = ROLETA_CONFIG_V16;
  return ROLETA_CONFIG_V16;
}

function obterPremiosRoleta(){ return Array.isArray(ROLETA_CONFIG_V16.premios) ? ROLETA_CONFIG_V16.premios : []; }
function obterLimiteRoleta(){ return Number(ROLETA_CONFIG_V16.limite || 0); }

function aplicarCoresRoletaV16(){
  const wheel=document.getElementById('roleta-wheel');
  if(!wheel) return;
  const premios=obterPremiosRoleta();
  if(!premios.length){ wheel.style.background='conic-gradient(#333 0deg 360deg)'; return; }
  const cores=['#ff7a00','#1f1f22','#ff9d00','#2a2a2d','#e86800','#111','#b45309','#3f3f46'];
  const passo=360/premios.length;
  wheel.style.background=`conic-gradient(${premios.map((_,i)=>`${cores[i%cores.length]} ${i*passo}deg ${(i+1)*passo}deg`).join(',')})`;
}

function limparVisualRoletaV16(){
  const labels=document.getElementById('roleta-labels');
  if(labels){ labels.removeAttribute('data-ok'); labels.innerHTML=''; }
  const wheel=document.getElementById('roleta-wheel');
  if(wheel) wheel.style.transform='rotate(0deg)';
}

function renderizarFatiasRoleta(){
  const labels=document.getElementById('roleta-labels');
  if(!labels) return;
  const premios=obterPremiosRoleta();
  aplicarCoresRoletaV16();
  labels.removeAttribute('data-ok');
  if(!premios.length){
    labels.innerHTML='<span style="transform:translateY(-105px)">Configure no ADM</span>';
    return;
  }
  const passo=360/premios.length;
  labels.innerHTML=premios.map((p,i)=>{
    const ang=i*passo+passo/2;
    return `<span style="transform:rotate(${ang}deg) translateY(-105px) rotate(-${ang}deg)">${escaparHtml(p.texto)}</span>`;
  }).join('');
  labels.dataset.ok=String(premios.length);
}

function textoFonteRoletaV16(cfg){
  if(cfg.erro) return `Erro ao ler a roleta: ${cfg.erro}`;
  return `${cfg.premios.length} prêmio(s) carregado(s) de ${cfg.fonte}${cfg.updated_at ? ' • '+new Date(cfg.updated_at).toLocaleString('pt-BR') : ''}.`;
}

function atualizarBotaoRoleta(){
  const btnCarrinho=document.getElementById('btn-abrir-roleta');
  const btnGirar=document.getElementById('btn-girar-roleta');
  const semPremios=!obterPremiosRoleta().length;
  const esgotada=!cupomTemLimiteDisponivel({codigo:'ROLETA',limite:obterLimiteRoleta()});
  const travada=(typeof roletaJaGirou !== 'undefined' && roletaJaGirou) || semPremios || esgotada;
  if(btnCarrinho){
    btnCarrinho.disabled=travada;
    btnCarrinho.classList.toggle('opacity-60',travada);
    btnCarrinho.classList.toggle('cursor-not-allowed',travada);
    btnCarrinho.innerHTML=semPremios?'<i class="fas fa-triangle-exclamation mr-2"></i> Roleta sem prêmios':(esgotada?'<i class="fas fa-ban mr-2"></i> Cupons da roleta esgotados':((typeof roletaJaGirou !== 'undefined' && roletaJaGirou)?'<i class="fas fa-lock mr-2"></i> Roleta já utilizada neste pedido':'<i class="fas fa-gift mr-2"></i> Girar roleta de desconto'));
  }
  if(btnGirar){
    btnGirar.disabled=travada || (typeof roletaGirando !== 'undefined' && roletaGirando);
    btnGirar.classList.toggle('opacity-60',btnGirar.disabled);
    btnGirar.textContent=semPremios?'Sem prêmios':(esgotada?'Cupons esgotados':((typeof roletaJaGirou !== 'undefined' && roletaJaGirou)?'Roleta já usada':'Girar agora'));
  }
}

async function abrirRoleta(){
  const modal=document.getElementById('modal-roleta-cupom');
  const resultado=document.getElementById('resultado-roleta');
  if(!modal) return;
  const cfg=await carregarConfigRoletaAtualizada();
  limparVisualRoletaV16();
  renderizarFatiasRoleta();
  if(resultado){
    if(typeof roletaJaGirou !== 'undefined' && roletaJaGirou){
      resultado.textContent=(typeof descontoRoleta !== 'undefined' && descontoRoleta && descontoRoleta.tipo!=='nenhum') ? `Cupom já liberado: ${descontoRoleta.texto}` : 'Você já girou a roleta neste pedido.';
    }else{
      resultado.textContent=textoFonteRoletaV16(cfg);
    }
  }
  atualizarBotaoRoleta();
  modal.classList.add('active');
  document.body.style.overflow='hidden';
}

async function girarRoleta(){
  const resultado=document.getElementById('resultado-roleta');
  const wheel=document.getElementById('roleta-wheel');
  if(!wheel || !resultado) return;
  const cfg=await carregarConfigRoletaAtualizada();
  limparVisualRoletaV16();
  renderizarFatiasRoleta();
  if(typeof roletaJaGirou !== 'undefined' && roletaJaGirou){ resultado.textContent='A roleta só pode ser girada uma vez por pedido.'; atualizarBotaoRoleta(); return; }
  const premios=obterPremiosRoleta();
  if(!premios.length){ resultado.textContent='Nenhum prêmio carregado do Supabase. Vá no ADM > Configurações > Prêmios da roleta e clique em Salvar tudo.'; atualizarBotaoRoleta(); return; }
  if(!cupomTemLimiteDisponivel({codigo:'ROLETA',limite:obterLimiteRoleta()})){ resultado.textContent='Os cupons da roleta acabaram.'; atualizarBotaoRoleta(); return; }
  roletaGirando=true;
  atualizarBotaoRoleta();
  resultado.textContent=`Girando com ${premios.length} prêmio(s) de ${cfg.fonte}...`;
  const index=Math.floor(Math.random()*premios.length);
  const passo=360/premios.length;
  const voltas=6+Math.floor(Math.random()*3);
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

async function atualizarRoletaDepoisDoAdm(){
  descontoRoleta=null; roletaJaGirou=false; roletaGirando=false;
  const input=document.getElementById('cupom-cliente'); if(input && input.value.trim().toUpperCase()==='ROLETA') input.value='';
  await carregarConfigRoletaAtualizada();
  limparVisualRoletaV16();
  renderizarFatiasRoleta();
  atualizarBotaoRoleta();
  const resultado=document.getElementById('resultado-roleta'); if(resultado) resultado.textContent=textoFonteRoletaV16(ROLETA_CONFIG_V16);
  if(typeof atualizarCarrinho==='function') atualizarCarrinho();
}

function resetarRoletaParaNovoPedido(){
  descontoRoleta=null; roletaGirando=false; roletaJaGirou=false;
  const input=document.getElementById('cupom-cliente'); if(input && input.value.trim().toUpperCase()==='ROLETA') input.value='';
  const resultado=document.getElementById('resultado-roleta'); if(resultado) resultado.textContent='';
  limparVisualRoletaV16(); renderizarFatiasRoleta(); atualizarBotaoRoleta();
}

async function lerRoletaParaAdminV16(){
  await carregarConfigRoletaAtualizada();
  return ROLETA_CONFIG_V16;
}

async function salvarTodosPremiosRoletaAdmin(){
  const limite=parseInt(document.getElementById('roleta-limite-admin')?.value || '0') || 0;
  const premios=[];
  document.querySelectorAll('[data-premio-roleta-index]').forEach(row=>{
    const idx=row.getAttribute('data-premio-roleta-index');
    const premio=normalizarPremioV16({
      texto:document.getElementById('premio-edit-texto-'+idx)?.value || '',
      tipo:document.getElementById('premio-edit-tipo-'+idx)?.value || 'nenhum',
      valor:document.getElementById('premio-edit-valor-'+idx)?.value || 0
    });
    if(premio) premios.push(premio);
  });
  const resp=await salvarRoletaSupabaseV16({limite,premios});
  if(resp.error){ alert('NÃO salvou no Supabase: '+(resp.error.message || resp.error)); return; }
  await renderizarRoletaAdmin();
  await atualizarRoletaDepoisDoAdm();
  alert('Roleta salva definitivamente no Supabase. Prêmios salvos: '+premios.map(p=>p.texto).join(', '));
}
async function salvarRoletaConfigAdmin(){ await salvarTodosPremiosRoletaAdmin(); }

async function salvarPremioRoletaAdmin(){
  const premio=normalizarPremioV16({
    texto:document.getElementById('premio-texto')?.value || '',
    tipo:document.getElementById('premio-tipo')?.value || 'nenhum',
    valor:document.getElementById('premio-valor')?.value || 0
  });
  if(!premio){ alert('Informe o nome do prêmio.'); return; }
  if(premio.tipo!=='nenhum' && !premio.valor){ alert('Informe o valor do prêmio.'); return; }
  const cfg=await lerRoletaParaAdminV16();
  const premios=[...(cfg.premios || [])];
  if(premios.length>=8){ alert('Limite de 8 prêmios na roleta.'); return; }
  premios.push(premio);
  const limite=parseInt(document.getElementById('roleta-limite-admin')?.value || cfg.limite || '0') || 0;
  const resp=await salvarRoletaSupabaseV16({limite,premios});
  if(resp.error){ alert('NÃO salvou no Supabase: '+(resp.error.message || resp.error)); return; }
  const t=document.getElementById('premio-texto'); if(t) t.value='';
  const v=document.getElementById('premio-valor'); if(v) v.value='';
  await renderizarRoletaAdmin();
  await atualizarRoletaDepoisDoAdm();
}

async function removerPremioRoletaAdmin(i){
  const cfg=await lerRoletaParaAdminV16();
  const premios=(cfg.premios || []).filter((_,idx)=>idx!==i);
  const resp=await salvarRoletaSupabaseV16({limite:cfg.limite || 0,premios});
  if(resp.error){ alert('NÃO removeu no Supabase: '+(resp.error.message || resp.error)); return; }
  await renderizarRoletaAdmin();
  await atualizarRoletaDepoisDoAdm();
}

async function renderizarRoletaAdmin(){
  const cfg=await lerRoletaParaAdminV16();
  const limiteEl=document.getElementById('roleta-limite-admin'); if(limiteEl) limiteEl.value=cfg.limite || 0;
  const box=document.getElementById('lista-premios-roleta'); if(!box) return;
  const usados=usoCupomCodigo('ROLETA');
  const premios=cfg.premios || [];
  box.innerHTML =
    `<div class="bg-green-500/10 border border-green-500/30 text-green-200 p-3 rounded-xl text-sm mb-3">Fonte: <b>${escaparHtml(cfg.fonte)}</b><br>Chave: <b>${ROLETA_CHAVE_PRINCIPAL_V16}</b>${cfg.updated_at ? '<br>Atualizado: '+new Date(cfg.updated_at).toLocaleString('pt-BR') : ''}${cfg.erro ? '<br><span class="text-red-300">Erro: '+escaparHtml(cfg.erro)+'</span>' : ''}</div>`+
    `<p class="text-sm text-gray-400 mb-2">Usados: ${usados}/${cfg.limite || 'sem limite'} • Prêmios carregados: ${premios.length}</p>`+
    (premios.length ? premios.map((p,i)=>`<div class="admin-card space-y-2" data-premio-roleta-index="${i}"><div class="grid grid-cols-1 md:grid-cols-4 gap-2"><input id="premio-edit-texto-${i}" value="${escaparHtml(p.texto || '')}" class="p-3 rounded-xl" placeholder="Nome"><select id="premio-edit-tipo-${i}" class="p-3 rounded-xl"><option value="percentual" ${p.tipo==='percentual'?'selected':''}>%</option><option value="valor" ${p.tipo==='valor'?'selected':''}>R$</option><option value="nenhum" ${p.tipo==='nenhum'?'selected':''}>Sem desconto</option></select><input id="premio-edit-valor-${i}" type="number" step="0.01" value="${Number(p.valor || 0)}" class="p-3 rounded-xl" placeholder="Valor"><button onclick="removerPremioRoletaAdmin(${i})" class="bg-red-600 hover:bg-red-700 text-white rounded-xl">Excluir</button></div></div>`).join('') : '<p class="text-yellow-300 bg-yellow-500/10 p-3 rounded-xl">Nenhum prêmio salvo no Supabase. Adicione um prêmio e clique em Salvar tudo.</p>')+
    '<button onclick="salvarTodosPremiosRoletaAdmin()" class="w-full btn-primary p-3 rounded-xl mt-3">Salvar tudo definitivamente no Supabase</button>';
  renderizarFatiasRoleta();
  atualizarBotaoRoleta();
}

window.carregarConfigRoletaAtualizada=carregarConfigRoletaAtualizada;
window.obterPremiosRoleta=obterPremiosRoleta;
window.obterLimiteRoleta=obterLimiteRoleta;
window.renderizarFatiasRoleta=renderizarFatiasRoleta;
window.atualizarBotaoRoleta=atualizarBotaoRoleta;
window.abrirRoleta=abrirRoleta;
window.girarRoleta=girarRoleta;
window.atualizarRoletaDepoisDoAdm=atualizarRoletaDepoisDoAdm;
window.resetarRoletaParaNovoPedido=resetarRoletaParaNovoPedido;
window.salvarTodosPremiosRoletaAdmin=salvarTodosPremiosRoletaAdmin;
window.salvarRoletaConfigAdmin=salvarRoletaConfigAdmin;
window.salvarPremioRoletaAdmin=salvarPremioRoletaAdmin;
window.removerPremioRoletaAdmin=removerPremioRoletaAdmin;
window.renderizarRoletaAdmin=renderizarRoletaAdmin;
