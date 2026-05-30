/* V21 - ROLETA TESTADA: SOMENTE SUPABASE, SEM LOCALSTORAGE
   Resultado esperado no ADM: "Roleta V21 - SUPABASE OK".
   Este arquivo deve ser o ÚNICO script de roleta carregado no index.html. */
(function(){
  'use strict';
  const CHAVE = 'config_roleta';
  const VERSAO = 'v21-testada-supabase';

  window.descontoRoleta = null;
  window.roletaGirando = false;
  window.roletaJaGirou = false;
  window.roletaConfigAtual = { limite:0, premios:[], fonte:'não carregada', updated_at:null, erro:null, versao:VERSAO };

  function numero(v){
    const n = Number(String(v ?? '0').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  function html(v){
    if(typeof escaparHtml === 'function') return escaparHtml(v);
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function moeda(v){
    if(typeof formatarMoeda === 'function') return formatarMoeda(v);
    return 'R$ ' + Number(v || 0).toFixed(2);
  }

  function limparLocal(){
    try{ localStorage.removeItem(CHAVE); }catch(e){}
    try{ sessionStorage.removeItem(CHAVE); }catch(e){}
  }

  function bloquearLocalStorage(){
    limparLocal();
    if(window.__ROLETA_V21_STORAGE_BLOQUEADO__) return;
    window.__ROLETA_V21_STORAGE_BLOQUEADO__ = true;
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v){
      if(String(k) === CHAVE){
        console.warn('[ROLETA V21] Bloqueado: config_roleta não pode ser salva localmente. Use Supabase.');
        try{ this.removeItem(CHAVE); }catch(e){}
        return;
      }
      return originalSet.call(this, k, v);
    };
    const originalGet = Storage.prototype.getItem;
    Storage.prototype.getItem = function(k){
      if(String(k) === CHAVE) return null;
      return originalGet.call(this, k);
    };
    if(typeof window.salvarJsonLocal === 'function'){
      const salvarOriginal = window.salvarJsonLocal;
      window.salvarJsonLocal = function(k, v){
        if(String(k) === CHAVE){
          console.warn('[ROLETA V21] Bloqueado salvarJsonLocal(config_roleta).');
          limparLocal();
          return false;
        }
        return salvarOriginal(k, v);
      };
    }
    if(typeof window.lerJsonLocal === 'function'){
      const lerOriginal = window.lerJsonLocal;
      window.lerJsonLocal = function(k, padrao){
        if(String(k) === CHAVE) return padrao;
        return lerOriginal(k, padrao);
      };
    }
  }

  function supa(){
    return (typeof window._supabase !== 'undefined' && window._supabase) || (typeof _supabase !== 'undefined' && _supabase) || null;
  }

  function normalizarPremio(p){
    const texto = String((p && (p.texto || p.nome || p.codigo)) || '').trim();
    const tipoBruto = String((p && p.tipo) || 'nenhum').toLowerCase().trim();
    const tipo = ['percentual','valor','nenhum'].includes(tipoBruto) ? tipoBruto : 'nenhum';
    const valor = tipo === 'nenhum' ? 0 : numero(p && p.valor);
    if(!texto) return null;
    return { texto, tipo, valor };
  }

  function normalizarConfig(valor, fonte, updated_at, erro){
    const premios = Array.isArray(valor && valor.premios) ? valor.premios.map(normalizarPremio).filter(Boolean).slice(0, 8) : [];
    return {
      limite: numero(valor && valor.limite),
      premios,
      fonte: fonte || 'Supabase',
      updated_at: updated_at || null,
      erro: erro || null,
      versao: VERSAO,
      bruto: valor || null
    };
  }

  function memorizar(cfg){
    window.roletaConfigAtual = cfg;
    limparLocal();
    return cfg;
  }

  async function lerRoletaSupabase(){
    bloquearLocalStorage();
    const cliente = supa();
    if(!cliente){
      return memorizar(normalizarConfig(null, 'ERRO', null, 'Supabase não carregou. Verifique config.js e ordem dos scripts.'));
    }
    try{
      const { data, error } = await cliente
        .from('configuracoes')
        .select('chave,valor,updated_at')
        .eq('chave', CHAVE)
        .maybeSingle();
      if(error) return memorizar(normalizarConfig(null, 'ERRO SUPABASE', null, error.message || String(error)));
      if(!data || !data.valor) return memorizar(normalizarConfig(null, 'SUPABASE VAZIO', null, 'Não existe linha config_roleta na tabela configuracoes. Rode o SQL v21.'));
      const cfg = normalizarConfig(data.valor, 'Supabase', data.updated_at, null);
      if(!cfg.premios.length) cfg.erro = 'Linha config_roleta existe, mas está sem prêmios válidos.';
      return memorizar(cfg);
    }catch(e){
      return memorizar(normalizarConfig(null, 'ERRO JS', null, e.message || String(e)));
    }
  }

  async function salvarRoletaSupabase(cfg){
    bloquearLocalStorage();
    const cliente = supa();
    if(!cliente) return { data:null, error:{ message:'Supabase não carregou. Verifique config.js.' } };
    const valor = {
      limite: numero(cfg && cfg.limite),
      premios: Array.isArray(cfg && cfg.premios) ? cfg.premios.map(normalizarPremio).filter(Boolean).slice(0,8) : [],
      _versao: VERSAO,
      _salvo_em: new Date().toISOString()
    };
    if(!valor.premios.length) return { data:null, error:{ message:'Adicione pelo menos 1 prêmio válido antes de salvar.' } };

    try{
      const { data, error } = await cliente
        .from('configuracoes')
        .upsert([{ chave:CHAVE, valor, updated_at:new Date().toISOString() }], { onConflict:'chave' })
        .select('chave,valor,updated_at')
        .maybeSingle();
      if(error) return { data:null, error };
      if(!data) return { data:null, error:{ message:'Supabase não retornou a linha gravada.' } };

      const lida = await lerRoletaSupabase();
      if(lida.erro) return { data:null, error:{ message:'Gravou, mas falhou ao reler: ' + lida.erro } };
      const esperado = JSON.stringify(valor.premios) + '|L=' + valor.limite;
      const recebido = JSON.stringify(lida.premios) + '|L=' + lida.limite;
      if(esperado !== recebido){
        return { data:null, error:{ message:'Gravou, mas a leitura voltou diferente. Esperado: '+esperado+' / Lido: '+recebido } };
      }
      limparLocal();
      return { data:lida, error:null };
    }catch(e){
      return { data:null, error:{ message:e.message || String(e) } };
    }
  }

  function premiosAtuais(){
    const cfg = window.roletaConfigAtual || {};
    return Array.isArray(cfg.premios) ? cfg.premios : [];
  }

  window.obterLimiteRoleta = function(){
    return numero(window.roletaConfigAtual && window.roletaConfigAtual.limite);
  };

  window.getConfigRoleta = function(){
    return { limite:window.obterLimiteRoleta(), premios:premiosAtuais() };
  };

  function coletarPremiosEditados(){
    const premios = [];
    document.querySelectorAll('[data-premio-roleta-index]').forEach(row => {
      const i = row.getAttribute('data-premio-roleta-index');
      const p = normalizarPremio({
        texto:document.getElementById('premio-edit-texto-'+i)?.value || '',
        tipo:document.getElementById('premio-edit-tipo-'+i)?.value || 'nenhum',
        valor:document.getElementById('premio-edit-valor-'+i)?.value || 0
      });
      if(p) premios.push(p);
    });
    return premios;
  }

  window.renderizarFatiasRoleta = function(){
    const labels = document.getElementById('roleta-labels');
    const wheel = document.getElementById('roleta-wheel');
    const premios = premiosAtuais();
    if(labels){
      labels.innerHTML = premios.length
        ? premios.map((p,i)=>`<span style="transform:rotate(${(360/premios.length)*i}deg)">${html(p.texto)}</span>`).join('')
        : '<span>SEM PRÊMIOS</span>';
      labels.dataset.fonte = 'supabase-v21';
    }
    if(wheel){
      wheel.dataset.fonte = 'supabase-v21';
      wheel.title = premios.length ? premios.map(p=>p.texto).join(' | ') : 'Sem prêmios no Supabase';
    }
  };

  window.atualizarBotaoRoleta = function(){
    const btnCarrinho = document.getElementById('btn-abrir-roleta');
    const btnGirar = document.getElementById('btn-girar-roleta');
    const cfg = window.roletaConfigAtual || {};
    const semPremios = !premiosAtuais().length || !!cfg.erro;
    const esgotada = typeof cupomTemLimiteDisponivel === 'function' ? !cupomTemLimiteDisponivel({ codigo:'ROLETA', limite:window.obterLimiteRoleta() }) : false;
    if(btnCarrinho){
      btnCarrinho.disabled = !!window.roletaJaGirou || semPremios || esgotada;
      btnCarrinho.classList.toggle('opacity-50', btnCarrinho.disabled);
      btnCarrinho.innerHTML = semPremios ? '<i class="fas fa-triangle-exclamation mr-2"></i> Roleta sem prêmios no Supabase' : (esgotada ? '<i class="fas fa-ban mr-2"></i> Cupons esgotados' : (window.roletaJaGirou ? '<i class="fas fa-check mr-2"></i> Roleta já usada' : '<i class="fas fa-gift mr-2"></i> Girar roleta de desconto'));
    }
    if(btnGirar){
      btnGirar.disabled = !!window.roletaJaGirou || !!window.roletaGirando || semPremios || esgotada;
      btnGirar.textContent = semPremios ? 'Sem prêmios no Supabase' : (esgotada ? 'Cupons esgotados' : (window.roletaJaGirou ? 'Roleta já usada' : 'Girar agora'));
    }
  };

  window.abrirRoleta = async function(){
    const modal = document.getElementById('modal-roleta-cupom');
    const resultado = document.getElementById('resultado-roleta');
    if(resultado) resultado.textContent = 'Carregando prêmios do Supabase...';
    const cfg = await lerRoletaSupabase();
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
    if(modal) modal.classList.add('active');
    if(resultado){
      if(cfg.erro) resultado.textContent = 'Erro: ' + cfg.erro;
      else if(window.roletaJaGirou) resultado.textContent = window.descontoRoleta ? 'Cupom já liberado: '+window.descontoRoleta.texto : 'Você já girou a roleta neste pedido.';
      else resultado.textContent = cfg.premios.length + ' prêmio(s) carregado(s) do Supabase.';
    }
  };

  window.fecharRoleta = function(){
    const modal = document.getElementById('modal-roleta-cupom');
    if(modal) modal.classList.remove('active');
  };

  window.girarRoleta = async function(){
    if(window.roletaGirando) return;
    const resultado = document.getElementById('resultado-roleta');
    const wheel = document.getElementById('roleta-wheel');
    if(resultado) resultado.textContent = 'Buscando prêmios atualizados no Supabase...';
    const cfg = await lerRoletaSupabase();
    const premios = cfg.premios || [];
    window.renderizarFatiasRoleta();
    if(cfg.erro){ if(resultado) resultado.textContent = 'Erro: '+cfg.erro; window.atualizarBotaoRoleta(); return; }
    if(!premios.length){ if(resultado) resultado.textContent = 'Nenhum prêmio salvo no Supabase.'; window.atualizarBotaoRoleta(); return; }
    if(window.roletaJaGirou){ if(resultado) resultado.textContent = 'A roleta só pode ser girada uma vez por pedido.'; window.atualizarBotaoRoleta(); return; }
    if(typeof cupomTemLimiteDisponivel === 'function' && !cupomTemLimiteDisponivel({ codigo:'ROLETA', limite:window.obterLimiteRoleta() })){
      if(resultado) resultado.textContent = 'Os cupons da roleta acabaram.'; window.atualizarBotaoRoleta(); return;
    }
    window.roletaGirando = true;
    window.atualizarBotaoRoleta();
    const index = Math.floor(Math.random() * premios.length);
    const graus = 360 * 5 + (360 / premios.length) * index + 25;
    if(wheel) wheel.style.transform = `rotate(${graus}deg)`;
    setTimeout(() => {
      const premio = premios[index];
      window.roletaGirando = false;
      window.roletaJaGirou = true;
      if(premio.tipo === 'nenhum'){
        window.descontoRoleta = null;
        if(resultado) resultado.textContent = 'Resultado: ' + premio.texto;
      }else{
        window.descontoRoleta = { ...premio, codigo:'ROLETA' };
        const input = document.getElementById('cupom-cliente');
        if(input) input.value = 'ROLETA';
        if(resultado) resultado.textContent = 'Cupom liberado: ' + premio.texto;
      }
      window.atualizarBotaoRoleta();
      if(typeof atualizarCarrinho === 'function') atualizarCarrinho();
    }, 1200);
  };

  window.resetarRoletaParaNovoPedido = function(){
    window.descontoRoleta = null;
    window.roletaGirando = false;
    window.roletaJaGirou = false;
    const input = document.getElementById('cupom-cliente');
    if(input && input.value.trim().toUpperCase() === 'ROLETA') input.value = '';
    const resultado = document.getElementById('resultado-roleta');
    if(resultado) resultado.textContent = '';
    window.atualizarBotaoRoleta();
  };

  window.renderizarRoletaAdmin = async function(){
    bloquearLocalStorage();
    const box = document.getElementById('lista-premios-roleta');
    const limiteEl = document.getElementById('roleta-limite-admin');
    if(!box) return;
    box.innerHTML = '<div class="admin-card text-gray-300">Lendo roleta direto do Supabase...</div>';
    const cfg = await lerRoletaSupabase();
    if(limiteEl) limiteEl.value = cfg.limite || 0;
    const usados = typeof usoCupomCodigo === 'function' ? usoCupomCodigo('ROLETA') : 0;
    const status = cfg.erro
      ? `<span class="text-red-300">ERRO: ${html(cfg.erro)}</span>`
      : `<span class="text-green-300">SUPABASE OK. ${cfg.premios.length} prêmio(s) ativo(s).</span>`;
    box.innerHTML = `
      <div class="bg-green-500/10 border border-green-500/40 text-green-100 p-3 rounded-xl text-sm mb-3">
        <b>Roleta V21 - SOMENTE SUPABASE</b><br>
        Fonte: <b>${html(cfg.fonte)}</b><br>
        Chave: <b>${CHAVE}</b><br>
        Cache/localStorage: <b>BLOQUEADO</b><br>
        ${cfg.updated_at ? 'Atualizado: '+new Date(cfg.updated_at).toLocaleString('pt-BR')+'<br>' : ''}
        ${status}
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
            <input id="premio-edit-valor-${i}" type="number" step="0.01" value="${Number(p.valor || 0)}" class="p-3 rounded-xl" placeholder="Valor">
            <button onclick="removerPremioRoletaAdmin(${i})" class="bg-red-600 hover:bg-red-700 text-white rounded-xl p-3">Excluir</button>
          </div>
        </div>`).join('') : '<p class="text-yellow-300 bg-yellow-500/10 p-3 rounded-xl">Nenhum prêmio salvo no Supabase.</p>'}
      <button onclick="salvarTodosPremiosRoletaAdmin()" class="w-full btn-primary p-4 rounded-xl mt-3 text-lg">SALVAR TUDO NO SUPABASE</button>
      <button onclick="diagnosticoRoletaSupabase()" class="w-full bg-gray-700 p-3 rounded-xl mt-2">Testar leitura Supabase</button>
      <button onclick="limparCacheRoletaLocal()" class="w-full bg-red-900/70 p-3 rounded-xl mt-2">Limpar roleta local deste aparelho</button>
    `;
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
  };

  window.salvarTodosPremiosRoletaAdmin = async function(){
    const limite = numero(document.getElementById('roleta-limite-admin')?.value || 0);
    const premios = coletarPremiosEditados();
    const resp = await salvarRoletaSupabase({ limite, premios });
    if(resp.error){
      alert('NÃO SALVOU NO SUPABASE. Erro: ' + (resp.error.message || resp.error));
      await window.renderizarRoletaAdmin();
      return;
    }
    await window.renderizarRoletaAdmin();
    alert('SALVO NO SUPABASE COM SUCESSO. Prêmios ativos: ' + resp.data.premios.map(p=>p.texto).join(', '));
  };

  window.salvarRoletaConfigAdmin = window.salvarTodosPremiosRoletaAdmin;

  window.salvarPremioRoletaAdmin = async function(){
    const novo = normalizarPremio({
      texto:document.getElementById('premio-texto')?.value || '',
      tipo:document.getElementById('premio-tipo')?.value || 'nenhum',
      valor:document.getElementById('premio-valor')?.value || 0
    });
    if(!novo){ alert('Informe o nome do prêmio.'); return; }
    if(novo.tipo !== 'nenhum' && !novo.valor){ alert('Informe o valor do prêmio.'); return; }
    const cfg = await lerRoletaSupabase();
    if(cfg.erro && cfg.fonte !== 'SUPABASE VAZIO'){
      alert('Não consegui ler a roleta no Supabase: ' + cfg.erro);
      return;
    }
    const premios = [...(cfg.premios || []), novo].slice(0, 8);
    const limite = numero(document.getElementById('roleta-limite-admin')?.value || cfg.limite || 0);
    const resp = await salvarRoletaSupabase({ limite, premios });
    if(resp.error){ alert('NÃO SALVOU NO SUPABASE. Erro: ' + (resp.error.message || resp.error)); return; }
    const t = document.getElementById('premio-texto'); if(t) t.value = '';
    const v = document.getElementById('premio-valor'); if(v) v.value = '';
    await window.renderizarRoletaAdmin();
    alert('Prêmio adicionado e salvo no SUPABASE.');
  };

  window.removerPremioRoletaAdmin = async function(i){
    const cfg = await lerRoletaSupabase();
    if(cfg.erro){ alert('Não consegui ler do Supabase: ' + cfg.erro); return; }
    const premios = (cfg.premios || []).filter((_,idx)=>idx !== i);
    if(!premios.length){ alert('A roleta precisa ter pelo menos 1 prêmio.'); return; }
    const resp = await salvarRoletaSupabase({ limite:cfg.limite, premios });
    if(resp.error){ alert('NÃO REMOVEU NO SUPABASE. Erro: ' + (resp.error.message || resp.error)); return; }
    await window.renderizarRoletaAdmin();
  };

  window.diagnosticoRoletaSupabase = async function(){
    const cfg = await lerRoletaSupabase();
    if(cfg.erro){ alert('ERRO AO LER SUPABASE: ' + cfg.erro); return; }
    alert('SUPABASE OK. Prêmios lidos agora: ' + cfg.premios.map(p=>p.texto + ' (' + p.tipo + ':' + p.valor + ')').join(' | '));
  };

  window.limparCacheRoletaLocal = function(){
    bloquearLocalStorage();
    alert('Cache/localStorage da roleta removido e bloqueado neste aparelho.');
  };

  window.atualizarRoletaDepoisDoAdm = async function(){
    await lerRoletaSupabase();
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
    if(typeof atualizarCarrinho === 'function') atualizarCarrinho();
  };

  const renderConfigOriginal = window.renderizarConfigAdmin;
  window.renderizarConfigAdmin = function(){
    if(typeof renderConfigOriginal === 'function') renderConfigOriginal();
    setTimeout(() => window.renderizarRoletaAdmin(), 50);
  };

  bloquearLocalStorage();
  document.addEventListener('DOMContentLoaded', async function(){
    bloquearLocalStorage();
    await lerRoletaSupabase();
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
    setTimeout(() => window.renderizarRoletaAdmin(), 300);
  });
})();
