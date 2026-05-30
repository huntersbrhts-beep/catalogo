/* V23 - ROLETA DEFINITIVA EM TABELA PRÓPRIA
   Não usa config_roleta, não usa localStorage e não tem modo padrão.
   Tabelas usadas: roleta_premios e roleta_config. */
(function(){
  'use strict';

  const VERSAO = 'v23-tabela-supabase';
  const BLOQUEADAS = ['config_roleta','roleta_premios_site_v16','config_roleta_ANTIGO_BLOQUEADO'];

  window.__ROLETA_OFICIAL__ = VERSAO;
  window.descontoRoleta = null;
  window.roletaGirando = false;
  window.roletaJaGirou = false;
  window.roletaConfigAtual = {
    limite: 0,
    premios: [],
    erro: 'Ainda não carregou da tabela roleta_premios.',
    fonte: 'não carregada',
    versao: VERSAO
  };

  function clienteSupabase(){ return window._supabase || (typeof _supabase !== 'undefined' ? _supabase : null); }
  function numero(v){ const n = Number(String(v ?? '0').replace(',', '.')); return Number.isFinite(n) ? n : 0; }
  function html(v){ return typeof escaparHtml === 'function' ? escaparHtml(v) : String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

  function limparStorageAntigo(){
    BLOQUEADAS.forEach(k=>{ try{ localStorage.removeItem(k); sessionStorage.removeItem(k); }catch(e){} });
  }

  function bloquearStorageAntigo(){
    limparStorageAntigo();
    if(window.__ROLETA_V23_STORAGE_BLOQUEADO__) return;
    window.__ROLETA_V23_STORAGE_BLOQUEADO__ = true;
    const setOriginal = Storage.prototype.setItem;
    const getOriginal = Storage.prototype.getItem;
    Storage.prototype.setItem = function(k,v){
      if(BLOQUEADAS.includes(String(k))){
        console.warn('[ROLETA V23] Bloqueado uso local antigo:', k);
        try{ this.removeItem(k); }catch(e){}
        return;
      }
      return setOriginal.call(this,k,v);
    };
    Storage.prototype.getItem = function(k){
      if(BLOQUEADAS.includes(String(k))) return null;
      return getOriginal.call(this,k);
    };
  }

  function normalizarPremio(p){
    const texto = String((p && (p.texto || p.nome || p.codigo)) || '').trim();
    const tipoRaw = String((p && p.tipo) || 'nenhum').toLowerCase().trim();
    const tipo = ['percentual','valor','nenhum'].includes(tipoRaw) ? tipoRaw : 'nenhum';
    const valor = tipo === 'nenhum' ? 0 : numero(p && p.valor);
    if(!texto) return null;
    return {
      id: p && p.id ? p.id : undefined,
      texto,
      tipo,
      valor,
      ordem: Number.isFinite(Number(p && p.ordem)) ? Number(p.ordem) : 0,
      ativo: p && p.ativo === false ? false : true
    };
  }

  async function lerConfigTabela(){
    const supa = clienteSupabase();
    if(!supa) return { limite:0, error:{ message:'Supabase não carregou.' } };
    const { data, error } = await supa.from('roleta_config').select('id,limite,updated_at').eq('id',1).maybeSingle();
    if(error) return { limite:0, error };
    return { limite: numero(data && data.limite), updated_at:data && data.updated_at, error:null };
  }

  async function lerPremiosTabela(){
    bloquearStorageAntigo();
    const supa = clienteSupabase();
    if(!supa){
      window.roletaConfigAtual = { limite:0, premios:[], erro:'Supabase não carregou.', fonte:'ERRO', versao:VERSAO };
      return window.roletaConfigAtual;
    }
    try{
      const cfgResp = await lerConfigTabela();
      if(cfgResp.error){
        window.roletaConfigAtual = { limite:0, premios:[], erro:cfgResp.error.message || String(cfgResp.error), fonte:'ERRO roleta_config', versao:VERSAO };
        return window.roletaConfigAtual;
      }
      const { data, error } = await supa
        .from('roleta_premios')
        .select('id,texto,tipo,valor,ordem,ativo,updated_at')
        .eq('ativo', true)
        .order('ordem', { ascending:true })
        .order('created_at', { ascending:true });
      if(error){
        window.roletaConfigAtual = { limite:cfgResp.limite, premios:[], erro:error.message || String(error), fonte:'ERRO roleta_premios', versao:VERSAO };
        return window.roletaConfigAtual;
      }
      const premios = (data || []).map(normalizarPremio).filter(Boolean).slice(0, 12);
      window.roletaConfigAtual = {
        limite: cfgResp.limite,
        premios,
        erro: premios.length ? null : 'Tabela roleta_premios está vazia. Adicione prêmios no ADM e salve.',
        fonte: 'Supabase tabela V23',
        updated_at: cfgResp.updated_at || (data && data[0] && data[0].updated_at) || null,
        versao: VERSAO
      };
      limparStorageAntigo();
      return window.roletaConfigAtual;
    }catch(e){
      window.roletaConfigAtual = { limite:0, premios:[], erro:e.message || String(e), fonte:'ERRO JS', versao:VERSAO };
      return window.roletaConfigAtual;
    }
  }

  async function salvarPremiosTabela({ limite, premios }){
    bloquearStorageAntigo();
    const supa = clienteSupabase();
    if(!supa) return { data:null, error:{ message:'Supabase não carregou.' } };
    const lista = Array.isArray(premios) ? premios.map(normalizarPremio).filter(Boolean).slice(0, 12) : [];
    if(!lista.length) return { data:null, error:{ message:'Adicione pelo menos 1 prêmio válido.' } };
    try{
      const { error:cfgError } = await supa
        .from('roleta_config')
        .upsert([{ id:1, limite:numero(limite), updated_at:new Date().toISOString() }], { onConflict:'id' });
      if(cfgError) return { data:null, error:cfgError };

      const { error:deleteError } = await supa.from('roleta_premios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if(deleteError) return { data:null, error:deleteError };

      const linhas = lista.map((p,i)=>({ texto:p.texto, tipo:p.tipo, valor:p.valor, ordem:i+1, ativo:true, updated_at:new Date().toISOString() }));
      const { error:insertError } = await supa.from('roleta_premios').insert(linhas);
      if(insertError) return { data:null, error:insertError };

      const lida = await lerPremiosTabela();
      if(lida.erro) return { data:null, error:{ message:'Salvou, mas não conseguiu reler da tabela: '+lida.erro } };
      const esperado = lista.map(p=>`${p.texto}|${p.tipo}|${p.valor}`).join('||') + '|L=' + numero(limite);
      const recebido = lida.premios.map(p=>`${p.texto}|${p.tipo}|${p.valor}`).join('||') + '|L=' + numero(lida.limite);
      if(esperado !== recebido){
        return { data:null, error:{ message:'Conferência falhou. Salvo: '+esperado+' / Lido: '+recebido } };
      }
      return { data:lida, error:null };
    }catch(e){
      return { data:null, error:{ message:e.message || String(e) } };
    }
  }

  function premiosAtuais(){ return Array.isArray(window.roletaConfigAtual && window.roletaConfigAtual.premios) ? window.roletaConfigAtual.premios : []; }
  window.obterLimiteRoleta = function(){ return numero(window.roletaConfigAtual && window.roletaConfigAtual.limite); };
  window.getConfigRoleta = function(){ return { limite:window.obterLimiteRoleta(), premios:premiosAtuais() }; };

  function coletarPremiosTela(){
    const premios = [];
    document.querySelectorAll('[data-premio-roleta-index]').forEach((row,idx)=>{
      const i = row.getAttribute('data-premio-roleta-index');
      const p = normalizarPremio({
        texto:document.getElementById('premio-edit-texto-'+i)?.value || '',
        tipo:document.getElementById('premio-edit-tipo-'+i)?.value || 'nenhum',
        valor:document.getElementById('premio-edit-valor-'+i)?.value || 0,
        ordem:idx+1,
        ativo:true
      });
      if(p) premios.push(p);
    });

    const novoTexto = document.getElementById('premio-texto')?.value || '';
    const novoTipo = document.getElementById('premio-tipo')?.value || 'nenhum';
    const novoValor = document.getElementById('premio-valor')?.value || 0;
    const novo = normalizarPremio({ texto:novoTexto, tipo:novoTipo, valor:novoValor, ordem:premios.length+1 });
    if(novo) premios.push(novo);

    return premios;
  }

  window.renderizarFatiasRoleta = function(){
    const labels = document.getElementById('roleta-labels');
    const wheel = document.getElementById('roleta-wheel');
    const premios = premiosAtuais();
    if(labels){
      labels.innerHTML = premios.length ? premios.map((p,i)=>`<span style="transform:rotate(${(360/premios.length)*i}deg)">${html(p.texto)}</span>`).join('') : '<span>SEM SUPABASE</span>';
      labels.dataset.fonte = VERSAO;
    }
    if(wheel){ wheel.dataset.fonte = VERSAO; wheel.title = premios.map(p=>p.texto).join(' | '); }
  };

  window.atualizarBotaoRoleta = function(){
    const btnCarrinho = document.getElementById('btn-abrir-roleta');
    const btnGirar = document.getElementById('btn-girar-roleta');
    const erro = window.roletaConfigAtual && window.roletaConfigAtual.erro;
    const semPremios = !!erro || !premiosAtuais().length;
    const esgotada = typeof cupomTemLimiteDisponivel === 'function' ? !cupomTemLimiteDisponivel({ codigo:'ROLETA', limite:window.obterLimiteRoleta() }) : false;
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
    if(resultado) resultado.textContent = 'Buscando prêmios na tabela roleta_premios...';
    const cfg = await lerPremiosTabela();
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
    if(modal) modal.classList.add('active');
    if(resultado) resultado.textContent = cfg.erro ? ('Erro Supabase: '+cfg.erro) : `${cfg.premios.length} prêmio(s) carregado(s) do Supabase.`;
  };

  window.fecharRoleta = function(){ document.getElementById('modal-roleta-cupom')?.classList.remove('active'); };

  window.girarRoleta = async function(){
    if(window.roletaGirando) return;
    const resultado = document.getElementById('resultado-roleta');
    const wheel = document.getElementById('roleta-wheel');
    if(resultado) resultado.textContent = 'Atualizando prêmios no Supabase...';
    const cfg = await lerPremiosTabela();
    window.renderizarFatiasRoleta();
    if(cfg.erro){ if(resultado) resultado.textContent = 'Erro Supabase: '+cfg.erro; window.atualizarBotaoRoleta(); return; }
    const premios = cfg.premios;
    if(!premios.length){ if(resultado) resultado.textContent = 'Nenhum prêmio salvo no Supabase.'; window.atualizarBotaoRoleta(); return; }
    if(window.roletaJaGirou){ if(resultado) resultado.textContent = 'A roleta só pode girar uma vez por pedido.'; return; }
    const index = Math.floor(Math.random() * premios.length);
    const graus = 720 + (360 - (index * (360 / premios.length)));
    window.roletaGirando = true;
    if(wheel) wheel.style.transform = `rotate(${graus}deg)`;
    window.atualizarBotaoRoleta();
    setTimeout(()=>{
      const premio = premios[index];
      window.descontoRoleta = { codigo:'ROLETA', texto:premio.texto, tipo:premio.tipo, valor:premio.valor };
      window.roletaGirando = false;
      window.roletaJaGirou = true;
      const cupom = document.getElementById('cupom-cliente'); if(cupom) cupom.value = 'ROLETA';
      if(resultado) resultado.textContent = `🎉 Você ganhou: ${premio.texto}`;
      window.atualizarBotaoRoleta();
      if(typeof atualizarCarrinho === 'function') atualizarCarrinho();
    }, 1200);
  };

  window.resetarRoletaParaNovoPedido = function(){
    window.descontoRoleta = null; window.roletaGirando = false; window.roletaJaGirou = false;
    const input = document.getElementById('cupom-cliente'); if(input && input.value.trim().toUpperCase()==='ROLETA') input.value='';
    const r = document.getElementById('resultado-roleta'); if(r) r.textContent='';
    window.atualizarBotaoRoleta();
  };

  window.renderizarRoletaAdmin = async function(){
    bloquearStorageAntigo();
    const box = document.getElementById('lista-premios-roleta');
    const limiteEl = document.getElementById('roleta-limite-admin');
    if(!box) return;
    box.innerHTML = '<div class="admin-card text-gray-300">Lendo tabela roleta_premios no Supabase...</div>';
    const cfg = await lerPremiosTabela();
    if(limiteEl) limiteEl.value = cfg.limite || 0;
    const usados = typeof usoCupomCodigo === 'function' ? usoCupomCodigo('ROLETA') : 0;
    box.innerHTML = `
      <div class="${cfg.erro ? 'bg-red-500/10 border-red-500/40 text-red-200' : 'bg-green-500/10 border-green-500/40 text-green-100'} border p-3 rounded-xl text-sm mb-3">
        <b>Roleta V23 - TABELA SUPABASE</b><br>
        Fonte: <b>${html(cfg.fonte)}</b><br>
        Tabelas: <b>roleta_premios</b> e <b>roleta_config</b><br>
        LocalStorage: <b>não usado</b><br>
        ${cfg.updated_at ? 'Atualizado: '+new Date(cfg.updated_at).toLocaleString('pt-BR')+'<br>' : ''}
        ${cfg.erro ? 'Erro: '+html(cfg.erro) : 'Status: Supabase OK'}
      </div>
      <p class="text-sm text-gray-400 mb-2">Usados: ${usados}/${cfg.limite || 'sem limite'} • Prêmios: ${cfg.premios.length}</p>
      ${cfg.premios.length ? cfg.premios.map((p,i)=>`
        <div class="admin-card space-y-2" data-premio-roleta-index="${i}">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input id="premio-edit-texto-${i}" value="${html(p.texto)}" class="p-3 rounded-xl" placeholder="Nome do prêmio">
            <select id="premio-edit-tipo-${i}" class="p-3 rounded-xl">
              <option value="percentual" ${p.tipo==='percentual'?'selected':''}>%</option>
              <option value="valor" ${p.tipo==='valor'?'selected':''}>R$</option>
              <option value="nenhum" ${p.tipo==='nenhum'?'selected':''}>Sem desconto</option>
            </select>
            <input id="premio-edit-valor-${i}" type="number" step="0.01" value="${Number(p.valor||0)}" class="p-3 rounded-xl" placeholder="Valor">
            <button onclick="removerPremioRoletaAdmin(${i})" class="bg-red-600 hover:bg-red-700 text-white rounded-xl p-3">Excluir</button>
          </div>
        </div>`).join('') : '<p class="text-yellow-300 bg-yellow-500/10 p-3 rounded-xl">Nenhum prêmio salvo na tabela.</p>'}
      <button onclick="salvarTodosPremiosRoletaAdmin()" class="w-full btn-primary p-4 rounded-xl mt-3 text-lg">SALVAR TUDO NA TABELA SUPABASE</button>
      <button onclick="diagnosticoRoletaSupabase()" class="w-full bg-gray-700 p-3 rounded-xl mt-2">Testar leitura Supabase</button>
      <button onclick="limparCacheRoletaLocal()" class="w-full bg-red-900/70 p-3 rounded-xl mt-2">Limpar roleta local antiga</button>
    `;
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
  };

  window.salvarTodosPremiosRoletaAdmin = async function(){
    const limite = numero(document.getElementById('roleta-limite-admin')?.value || 0);
    const premios = coletarPremiosTela();
    const resp = await salvarPremiosTabela({ limite, premios });
    if(resp.error){ alert('NÃO SALVOU NO SUPABASE: ' + (resp.error.message || resp.error)); await window.renderizarRoletaAdmin(); return; }
    document.getElementById('premio-texto') && (document.getElementById('premio-texto').value='');
    document.getElementById('premio-valor') && (document.getElementById('premio-valor').value='');
    await window.renderizarRoletaAdmin();
    alert('SALVO NA TABELA SUPABASE. Prêmios ativos: ' + resp.data.premios.map(p=>p.texto).join(', '));
  };
  window.salvarRoletaConfigAdmin = window.salvarTodosPremiosRoletaAdmin;

  window.salvarPremioRoletaAdmin = async function(){
    await window.salvarTodosPremiosRoletaAdmin();
  };

  window.removerPremioRoletaAdmin = async function(i){
    const cfg = await lerPremiosTabela();
    if(cfg.erro){ alert('Não consegui ler Supabase: '+cfg.erro); return; }
    const premios = (cfg.premios || []).filter((_,idx)=>idx !== i);
    if(!premios.length){ alert('A roleta precisa ter pelo menos 1 prêmio.'); return; }
    const resp = await salvarPremiosTabela({ limite:cfg.limite, premios });
    if(resp.error){ alert('NÃO REMOVEU NO SUPABASE: ' + (resp.error.message || resp.error)); return; }
    await window.renderizarRoletaAdmin();
  };

  window.diagnosticoRoletaSupabase = async function(){
    const cfg = await lerPremiosTabela();
    if(cfg.erro) alert('ERRO SUPABASE: ' + cfg.erro);
    else alert('SUPABASE OK. Prêmios lidos da tabela: ' + cfg.premios.map(p=>p.texto+' ('+p.tipo+':'+p.valor+')').join(' | '));
    await window.renderizarRoletaAdmin();
  };

  window.limparCacheRoletaLocal = function(){ limparStorageAntigo(); alert('Cache local antigo da roleta removido. A V23 usa somente tabela Supabase.'); };
  window.atualizarRoletaDepoisDoAdm = async function(){ await lerPremiosTabela(); window.renderizarFatiasRoleta(); window.atualizarBotaoRoleta(); if(typeof atualizarCarrinho === 'function') atualizarCarrinho(); };

  bloquearStorageAntigo();
  document.addEventListener('DOMContentLoaded', async function(){
    await lerPremiosTabela();
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
    await window.renderizarRoletaAdmin();
  });
})();
