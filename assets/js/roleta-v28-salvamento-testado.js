/* V28 - ROLETA SOMENTE SUPABASE
   Correção focada no painel ADM: salvar, reler e confirmar no Supabase.
   Não lê nem grava config_roleta no localStorage. */
(function(){
  'use strict';

  const VERSAO = 'Roleta V28 - SALVAMENTO SUPABASE TESTADO';
  const TABELA_CONFIG = 'roleta_config';
  const TABELA_PREMIOS = 'roleta_premios';

  window.__ROLETA_OFICIAL__ = VERSAO;
  window.descontoRoleta = null;
  window.roletaGirando = false;
  window.roletaJaGirou = false;
  window.roletaConfigAtual = { limite:0, premios:[], erro:'Aguardando leitura do Supabase.', fonte:'não carregada', versao:VERSAO };

  function supa(){
    try{ if(window._supabase) return window._supabase; }catch(e){}
    try{ if(typeof _supabase !== 'undefined') return _supabase; }catch(e){}
    return null;
  }
  function numero(v){ const n = Number(String(v ?? '0').replace(',', '.')); return Number.isFinite(n) ? n : 0; }
  function html(v){ return String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function limparConfigRoletaLocal(){ try{ localStorage.removeItem('config_roleta'); }catch(e){} }

  function normalizar(p, ordemPadrao){
    const texto = String((p && (p.texto || p.nome || p.codigo)) || '').trim();
    const tipoBruto = String(p && p.tipo || 'nenhum').toLowerCase();
    const tipo = ['percentual','valor','nenhum'].includes(tipoBruto) ? tipoBruto : 'nenhum';
    const valor = tipo === 'nenhum' ? 0 : numero(p && p.valor);
    if(!texto) return null;
    return {
      id:p && p.id,
      texto,
      tipo,
      valor,
      ordem:Number.isFinite(Number(p && p.ordem)) ? Number(p.ordem) : ordemPadrao,
      ativo:p && p.ativo === false ? false : true
    };
  }

  async function obterSessao(){
    const db = supa();
    if(!db || !db.auth || !db.auth.getSession) return { session:null, error:null };
    try{
      const resp = await db.auth.getSession();
      return { session: resp && resp.data ? resp.data.session : null, error: resp && resp.error };
    }catch(e){ return { session:null, error:e }; }
  }

  async function lerRoletaSupabase(){
    limparConfigRoletaLocal();
    const db = supa();
    if(!db){
      window.roletaConfigAtual = { limite:0, premios:[], erro:'Supabase não carregou no navegador.', fonte:'ERRO', versao:VERSAO };
      return window.roletaConfigAtual;
    }
    try{
      const cfg = await db.from(TABELA_CONFIG).select('id,limite,updated_at').eq('id',1).maybeSingle();
      if(cfg.error){
        window.roletaConfigAtual = { limite:0, premios:[], erro:'Erro ao ler roleta_config: '+cfg.error.message, fonte:'ERRO SUPABASE', versao:VERSAO };
        return window.roletaConfigAtual;
      }
      const premiosResp = await db
        .from(TABELA_PREMIOS)
        .select('id,texto,tipo,valor,ordem,ativo,created_at,updated_at')
        .eq('ativo', true)
        .order('ordem', { ascending:true })
        .order('created_at', { ascending:true });
      if(premiosResp.error){
        window.roletaConfigAtual = { limite:numero(cfg.data && cfg.data.limite), premios:[], erro:'Erro ao ler roleta_premios: '+premiosResp.error.message, fonte:'ERRO SUPABASE', versao:VERSAO };
        return window.roletaConfigAtual;
      }
      const premios = (premiosResp.data || []).map((p,i)=>normalizar(p,i+1)).filter(Boolean);
      window.roletaConfigAtual = {
        limite: numero(cfg.data && cfg.data.limite),
        premios,
        erro: premios.length ? null : 'Tabela roleta_premios está vazia.',
        fonte: 'Supabase / roleta_premios',
        updated_at: cfg.data && cfg.data.updated_at,
        versao: VERSAO
      };
      return window.roletaConfigAtual;
    }catch(e){
      window.roletaConfigAtual = { limite:0, premios:[], erro:'Erro JS ao ler roleta: '+(e.message || String(e)), fonte:'ERRO JS', versao:VERSAO };
      return window.roletaConfigAtual;
    }
  }

  async function salvarRoletaSupabase(limite, premios){
    limparConfigRoletaLocal();
    const db = supa();
    if(!db) return { error:{ message:'Supabase não carregou. Confira config.js e internet.' } };

    const sess = await obterSessao();
    if(sess.error) return { error:{ message:'Erro ao verificar login: '+(sess.error.message || String(sess.error)) } };
    if(!sess.session) return { error:{ message:'Você não está logado no Supabase. Saia e entre novamente no ADM antes de salvar.' } };

    const lista = (Array.isArray(premios) ? premios : []).map((p,i)=>normalizar(p,i+1)).filter(Boolean);
    if(!lista.length) return { error:{ message:'Adicione pelo menos um prêmio com nome preenchido.' } };

    const agora = new Date().toISOString();

    const cfg = await db
      .from(TABELA_CONFIG)
      .upsert({ id:1, limite:numero(limite), updated_at:agora }, { onConflict:'id' })
      .select('id,limite,updated_at')
      .single();
    if(cfg.error) return { error:{ message:'Erro ao salvar roleta_config: '+cfg.error.message } };

    const apagou = await db.from(TABELA_PREMIOS).delete().gte('ordem', 0);
    if(apagou.error) return { error:{ message:'Erro ao limpar roleta_premios: '+apagou.error.message } };

    const linhas = lista.map((p,i)=>({
      texto:p.texto,
      tipo:p.tipo,
      valor:p.valor,
      ordem:i+1,
      ativo:true,
      updated_at:agora
    }));

    const inseriu = await db
      .from(TABELA_PREMIOS)
      .insert(linhas)
      .select('id,texto,tipo,valor,ordem,ativo');
    if(inseriu.error) return { error:{ message:'Erro ao inserir roleta_premios: '+inseriu.error.message } };

    const relida = await lerRoletaSupabase();
    if(relida.erro) return { error:{ message:'Salvou, mas falhou ao reler do Supabase: '+relida.erro } };

    const lidos = relida.premios || [];
    if(lidos.length !== lista.length){
      return { error:{ message:`Salvou, mas a conferência falhou. Enviados: ${lista.length}. Lidos: ${lidos.length}.` } };
    }
    for(let i=0;i<lista.length;i++){
      if(String(lista[i].texto) !== String(lidos[i].texto) || String(lista[i].tipo) !== String(lidos[i].tipo) || numero(lista[i].valor) !== numero(lidos[i].valor)){
        return { error:{ message:'Salvou, mas a conferência encontrou dados diferentes do que foi enviado.' } };
      }
    }

    limparConfigRoletaLocal();
    return { data:relida, error:null };
  }

  function premios(){ return Array.isArray(window.roletaConfigAtual.premios) ? window.roletaConfigAtual.premios : []; }
  window.obterLimiteRoleta = function(){ return numero(window.roletaConfigAtual && window.roletaConfigAtual.limite); };
  window.getConfigRoleta = function(){ return { limite:window.obterLimiteRoleta(), premios:premios() }; };

  function atualizarPainelStatus(extra){
    let el = document.getElementById('status-roleta-supabase-v28');
    const box = document.getElementById('lista-premios-roleta');
    if(!el && box){
      el = document.createElement('div');
      el.id = 'status-roleta-supabase-v28';
      el.className = 'admin-card text-sm text-green-300 mb-3';
      box.parentNode.insertBefore(el, box);
    }
    if(el){
      const cfg = window.roletaConfigAtual || {};
      el.innerHTML = `<b>${VERSAO}</b><br>Fonte: ${html(cfg.fonte || '')}<br>Prêmios carregados: ${premios().length}<br>Limite: ${window.obterLimiteRoleta()}${cfg.erro?'<br><span class="text-red-300">Erro: '+html(cfg.erro)+'</span>':''}${extra?'<br>'+extra:''}`;
    }
  }

  window.renderizarFatiasRoleta = function(){
    const labels = document.getElementById('roleta-labels');
    const wheel = document.getElementById('roleta-wheel');
    const lista = premios();
    if(labels){
      labels.innerHTML = lista.length ? lista.map((p,i)=>`<span style="transform:rotate(${(360/lista.length)*i}deg)">${html(p.texto)}</span>`).join('') : '<span>SEM DADOS</span>';
      labels.dataset.fonte = VERSAO;
    }
    if(wheel){ wheel.dataset.fonte = VERSAO; wheel.title = lista.map(p=>p.texto).join(' | '); }
  };

  window.atualizarBotaoRoleta = function(){
    const erro = window.roletaConfigAtual && window.roletaConfigAtual.erro;
    const semPremios = !!erro || !premios().length;
    const esgotada = typeof cupomTemLimiteDisponivel === 'function' ? !cupomTemLimiteDisponivel({ codigo:'ROLETA', limite:window.obterLimiteRoleta() }) : false;
    const btnCarrinho = document.getElementById('btn-abrir-roleta');
    const btnGirar = document.getElementById('btn-girar-roleta');
    const texto = semPremios ? 'Roleta sem dados do Supabase' : (esgotada ? 'Cupons esgotados' : (window.roletaJaGirou ? 'Roleta já usada' : 'Girar roleta de desconto'));
    if(btnCarrinho){
      btnCarrinho.disabled = semPremios || esgotada || !!window.roletaJaGirou;
      btnCarrinho.classList.toggle('opacity-50', btnCarrinho.disabled);
      btnCarrinho.innerHTML = `<i class="fas fa-gift mr-2"></i> ${texto}`;
    }
    if(btnGirar){
      btnGirar.disabled = semPremios || esgotada || !!window.roletaJaGirou || !!window.roletaGirando;
      btnGirar.textContent = semPremios ? 'Sem dados do Supabase' : (esgotada ? 'Cupons esgotados' : (window.roletaJaGirou ? 'Roleta já usada' : 'Girar agora'));
    }
  };

  window.abrirRoleta = async function(){
    const modal = document.getElementById('modal-roleta-cupom');
    const resultado = document.getElementById('resultado-roleta');
    if(resultado) resultado.textContent = 'Lendo prêmios do Supabase...';
    await lerRoletaSupabase();
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
    if(modal) modal.classList.add('active');
    if(resultado) resultado.textContent = window.roletaConfigAtual.erro ? window.roletaConfigAtual.erro : 'Prêmios carregados do Supabase.';
  };

  window.fecharRoleta = function(){ document.getElementById('modal-roleta-cupom')?.classList.remove('active'); };

  window.girarRoletaV28 = async function(){
    if(window.roletaGirando) return;
    const resultado = document.getElementById('resultado-roleta');
    const wheel = document.getElementById('roleta-wheel');
    await lerRoletaSupabase();
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
    const lista = premios();
    if(window.roletaConfigAtual.erro || !lista.length){ if(resultado) resultado.textContent = window.roletaConfigAtual.erro || 'Sem prêmios no Supabase.'; return; }
    if(window.roletaJaGirou){ if(resultado) resultado.textContent = 'A roleta só pode girar uma vez por pedido.'; return; }
    const idx = Math.floor(Math.random() * lista.length);
    const premio = lista[idx];
    window.roletaGirando = true;
    if(resultado) resultado.textContent = 'Girando...';
    if(wheel) wheel.style.transform = `rotate(${1440 + (360 - (360/lista.length)*idx)}deg)`;
    setTimeout(()=>{
      window.descontoRoleta = { codigo:'ROLETA', texto:premio.texto, tipo:premio.tipo, valor:premio.valor };
      window.roletaGirando = false;
      window.roletaJaGirou = true;
      if(resultado) resultado.textContent = `🎁 Você ganhou: ${premio.texto}`;
      window.atualizarBotaoRoleta();
      if(typeof atualizarCarrinho === 'function') atualizarCarrinho();
    }, 2300);
  };
  window.girarRoleta = window.girarRoletaV28;

  window.resetarRoletaPedido = function(){
    window.descontoRoleta = null;
    window.roletaGirando = false;
    window.roletaJaGirou = false;
    const r = document.getElementById('resultado-roleta'); if(r) r.textContent='';
    if(typeof atualizarCarrinho === 'function') atualizarCarrinho();
    window.atualizarBotaoRoleta();
  };
  window.resetarRoletaParaNovoPedido = window.resetarRoletaPedido;

  function coletarPremiosTela(){
    const lista = [];
    document.querySelectorAll('[data-premio-roleta-index]').forEach((row,idx)=>{
      const i = row.getAttribute('data-premio-roleta-index');
      const p = normalizar({
        texto:document.getElementById('premio-edit-texto-'+i)?.value || '',
        tipo:document.getElementById('premio-edit-tipo-'+i)?.value || 'nenhum',
        valor:document.getElementById('premio-edit-valor-'+i)?.value || 0,
        ordem:idx+1,
        ativo:true
      }, idx+1);
      if(p) lista.push(p);
    });
    const novo = normalizar({
      texto:document.getElementById('premio-texto')?.value || '',
      tipo:document.getElementById('premio-tipo')?.value || 'nenhum',
      valor:document.getElementById('premio-valor')?.value || 0,
      ordem:lista.length+1,
      ativo:true
    }, lista.length+1);
    if(novo) lista.push(novo);
    return lista;
  }

  window.renderizarRoletaAdmin = async function(){
    const box = document.getElementById('lista-premios-roleta');
    const limiteEl = document.getElementById('roleta-limite-admin');
    if(!box) return;
    box.innerHTML = '<div class="admin-card text-gray-300">Lendo Supabase...</div>';
    await lerRoletaSupabase();
    if(limiteEl) limiteEl.value = window.obterLimiteRoleta();
    atualizarPainelStatus();
    const lista = premios();
    if(window.roletaConfigAtual.erro){
      box.innerHTML = `<div class="admin-card text-red-300"><b>${VERSAO}</b><br>${html(window.roletaConfigAtual.erro)}<br><br>Confira se você rodou o supabase-sql.txt e se está logado no ADM.</div>`;
      return;
    }
    box.innerHTML = lista.map((p,i)=>`
      <div class="admin-card space-y-2" data-premio-roleta-index="${i}">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input id="premio-edit-texto-${i}" value="${html(p.texto)}" class="p-3 rounded-xl">
          <select id="premio-edit-tipo-${i}" class="p-3 rounded-xl">
            <option value="percentual" ${p.tipo==='percentual'?'selected':''}>%</option>
            <option value="valor" ${p.tipo==='valor'?'selected':''}>R$</option>
            <option value="nenhum" ${p.tipo==='nenhum'?'selected':''}>Sem desconto</option>
          </select>
          <input id="premio-edit-valor-${i}" type="number" step="0.01" value="${p.valor}" class="p-3 rounded-xl">
          <button onclick="removerPremioRoletaAdmin(${i})" class="bg-red-600 hover:bg-red-700 text-white rounded-xl p-3">Excluir</button>
        </div>
      </div>`).join('') || '<p class="text-gray-500">Nenhum prêmio cadastrado no Supabase.</p>';
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
  };

  window.salvarTodosPremiosRoletaAdmin = async function(){
    const limite = numero(document.getElementById('roleta-limite-admin')?.value || 0);
    const lista = coletarPremiosTela();
    const btns = [...document.querySelectorAll('button')].filter(b => /SUPABASE|Adicionar prêmio/i.test(b.textContent || ''));
    btns.forEach(b=>b.disabled=true);
    atualizarPainelStatus('<span class="text-yellow-300">Salvando no Supabase...</span>');
    const resp = await salvarRoletaSupabase(limite, lista);
    btns.forEach(b=>b.disabled=false);
    if(resp.error){
      atualizarPainelStatus('<span class="text-red-300">Falha ao salvar: '+html(resp.error.message)+'</span>');
      alert('ERRO AO SALVAR NO SUPABASE:\n' + resp.error.message);
      return;
    }
    const textoEl = document.getElementById('premio-texto');
    const valorEl = document.getElementById('premio-valor');
    if(textoEl) textoEl.value = '';
    if(valorEl) valorEl.value = '';
    await window.renderizarRoletaAdmin();
    atualizarPainelStatus('<span class="text-green-300">Salvo e conferido no Supabase agora.</span>');
    alert('Salvo no Supabase e conferido com sucesso.');
  };
  window.salvarRoletaConfigAdmin = window.salvarTodosPremiosRoletaAdmin;
  window.salvarPremioRoletaAdmin = window.salvarTodosPremiosRoletaAdmin;

  window.removerPremioRoletaAdmin = async function(i){
    const lista = premios().filter((_,idx)=>idx !== i);
    const limite = numero(document.getElementById('roleta-limite-admin')?.value || window.obterLimiteRoleta());
    const resp = await salvarRoletaSupabase(limite, lista);
    if(resp.error){ alert('ERRO AO REMOVER NO SUPABASE:\n' + resp.error.message); return; }
    await window.renderizarRoletaAdmin();
  };

  window.testarLeituraRoletaSupabase = async function(){
    const cfg = await lerRoletaSupabase();
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
    atualizarPainelStatus();
    alert(cfg.erro ? ('ERRO: '+cfg.erro) : (`OK: ${cfg.premios.length} prêmio(s) lido(s) do Supabase. Fonte: ${cfg.fonte}`));
  };

  document.addEventListener('DOMContentLoaded', async ()=>{
    limparConfigRoletaLocal();
    await lerRoletaSupabase();
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
  });
})();
