/* V18 - Correção visível e definitiva do ADM da roleta.
   Este arquivo carrega por último e sobrescreve qualquer função antiga do ADM. */
(function(){
  const CHAVE = 'config_roleta';

  function esc(v){
    if(typeof escaparHtml === 'function') return escaparHtml(v);
    return String(v ?? '').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }

  function n(v){
    const x = Number(String(v ?? '0').replace(',', '.'));
    return Number.isFinite(x) ? x : 0;
  }

  function normalizarPremio(p){
    const texto = String((p && (p.texto || p.nome || p.codigo)) || '').trim();
    const tipoRaw = String((p && p.tipo) || 'nenhum').toLowerCase().trim();
    const tipo = ['percentual','valor','nenhum'].includes(tipoRaw) ? tipoRaw : 'nenhum';
    const valor = tipo === 'nenhum' ? 0 : n(p && p.valor);
    if(!texto) return null;
    return { texto, tipo, valor };
  }

  function normalizarCfg(valor){
    return {
      limite: n(valor && valor.limite),
      premios: Array.isArray(valor && valor.premios) ? valor.premios.map(normalizarPremio).filter(Boolean).slice(0,8) : []
    };
  }

  async function lerSupabaseRoletaV18(){
    if(typeof _supabase === 'undefined') return { cfg:{limite:0,premios:[]}, error:{message:'Supabase não carregou.'}, updated_at:null };
    const { data, error } = await _supabase
      .from('configuracoes')
      .select('chave,valor,updated_at')
      .eq('chave', CHAVE)
      .maybeSingle();
    if(error) return { cfg:{limite:0,premios:[]}, error, updated_at:null };
    if(!data || !data.valor) return { cfg:{limite:0,premios:[]}, error:{message:'Ainda não existe config_roleta no Supabase.'}, updated_at:null };
    return { cfg:normalizarCfg(data.valor), error:null, updated_at:data.updated_at || null };
  }

  async function salvarSupabaseRoletaV18(cfg){
    if(typeof _supabase === 'undefined') return { error:{message:'Supabase não carregou.'}, data:null };
    const valor = normalizarCfg(cfg);
    valor._salvo_em = new Date().toISOString();
    valor._versao = 'v18';
    if(!valor.premios.length) return { error:{message:'Adicione pelo menos 1 prêmio válido antes de salvar.'}, data:null };

    const gravacao = await _supabase
      .from('configuracoes')
      .upsert([{ chave:CHAVE, valor, updated_at:new Date().toISOString() }], { onConflict:'chave' })
      .select('chave,valor,updated_at')
      .maybeSingle();
    if(gravacao.error) return { error:gravacao.error, data:null };

    const leitura = await lerSupabaseRoletaV18();
    if(leitura.error) return { error:leitura.error, data:null };
    const antes = valor.premios.map(p=>p.texto+'|'+p.tipo+'|'+p.valor).join(';;');
    const depois = leitura.cfg.premios.map(p=>p.texto+'|'+p.tipo+'|'+p.valor).join(';;');
    if(antes !== depois){
      return { error:{message:'Supabase salvou, mas leu dados diferentes. Verifique duplicidade/política da tabela configuracoes.'}, data:null };
    }
    return { error:null, data:{...leitura.cfg, updated_at:leitura.updated_at} };
  }

  function coletarPremiosTelaV18(){
    const premios = [];
    document.querySelectorAll('[data-premio-roleta-index]').forEach(row=>{
      const idx = row.getAttribute('data-premio-roleta-index');
      const p = normalizarPremio({
        texto: document.getElementById('premio-edit-texto-'+idx)?.value || '',
        tipo: document.getElementById('premio-edit-tipo-'+idx)?.value || 'nenhum',
        valor: document.getElementById('premio-edit-valor-'+idx)?.value || 0
      });
      if(p) premios.push(p);
    });
    return premios;
  }

  window.renderizarRoletaAdmin = async function(){
    const box = document.getElementById('lista-premios-roleta');
    const limiteEl = document.getElementById('roleta-limite-admin');
    if(!box) return;

    box.innerHTML = '<div class="admin-card text-gray-300">Carregando roleta do Supabase...</div>';
    const { cfg, error, updated_at } = await lerSupabaseRoletaV18();
    if(limiteEl) limiteEl.value = cfg.limite || 0;
    const usados = typeof usoCupomCodigo === 'function' ? usoCupomCodigo('ROLETA') : 0;

    box.innerHTML =
      `<div class="bg-green-500/10 border border-green-500/30 text-green-200 p-3 rounded-xl text-sm mb-3">
        <b>Roleta V18</b><br>
        Fonte: <b>Supabase</b><br>
        Chave: <b>${CHAVE}</b><br>
        ${updated_at ? 'Atualizado: '+new Date(updated_at).toLocaleString('pt-BR')+'<br>' : ''}
        ${error ? '<span class="text-red-300">Aviso: '+esc(error.message || error)+'</span>' : '<span class="text-green-300">Configuração carregada.</span>'}
      </div>`+
      `<p class="text-sm text-gray-400 mb-2">Usados: ${usados}/${cfg.limite || 'sem limite'} • Prêmios: ${cfg.premios.length}</p>`+
      (cfg.premios.length ? cfg.premios.map((p,i)=>`
        <div class="admin-card space-y-2" data-premio-roleta-index="${i}">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input id="premio-edit-texto-${i}" value="${esc(p.texto)}" class="p-3 rounded-xl" placeholder="Nome">
            <select id="premio-edit-tipo-${i}" class="p-3 rounded-xl">
              <option value="percentual" ${p.tipo==='percentual'?'selected':''}>%</option>
              <option value="valor" ${p.tipo==='valor'?'selected':''}>R$</option>
              <option value="nenhum" ${p.tipo==='nenhum'?'selected':''}>Sem desconto</option>
            </select>
            <input id="premio-edit-valor-${i}" type="number" step="0.01" value="${Number(p.valor || 0)}" class="p-3 rounded-xl" placeholder="Valor">
            <button onclick="removerPremioRoletaAdmin(${i})" class="bg-red-600 hover:bg-red-700 text-white rounded-xl p-3">Excluir</button>
          </div>
        </div>`).join('') : '<p class="text-yellow-300 bg-yellow-500/10 p-3 rounded-xl">Nenhum prêmio salvo no Supabase. Adicione um prêmio abaixo.</p>')+
      '<button onclick="salvarTodosPremiosRoletaAdmin()" class="w-full btn-primary p-4 rounded-xl mt-3 text-lg">SALVAR TUDO NO SUPABASE</button>'+
      '<button onclick="diagnosticoRoletaSupabase && diagnosticoRoletaSupabase()" class="w-full bg-gray-700 p-3 rounded-xl mt-2">Testar leitura da roleta</button>';
  };

  window.salvarTodosPremiosRoletaAdmin = async function(){
    const limite = n(document.getElementById('roleta-limite-admin')?.value || 0);
    const premios = coletarPremiosTelaV18();
    const resp = await salvarSupabaseRoletaV18({ limite, premios });
    if(resp.error){
      alert('NÃO salvou no Supabase. Erro real: ' + (resp.error.message || resp.error));
      return;
    }
    if(typeof carregarConfigRoletaAtualizada === 'function') await carregarConfigRoletaAtualizada();
    if(typeof atualizarRoletaDepoisDoAdm === 'function') await atualizarRoletaDepoisDoAdm();
    await window.renderizarRoletaAdmin();
    alert('Salvo no Supabase com sucesso. Prêmios ativos: ' + resp.data.premios.map(p=>p.texto).join(', '));
  };

  window.salvarRoletaConfigAdmin = async function(){
    await window.salvarTodosPremiosRoletaAdmin();
  };

  window.salvarPremioRoletaAdmin = async function(){
    const novo = normalizarPremio({
      texto: document.getElementById('premio-texto')?.value || '',
      tipo: document.getElementById('premio-tipo')?.value || 'nenhum',
      valor: document.getElementById('premio-valor')?.value || 0
    });
    if(!novo){ alert('Informe o nome do prêmio.'); return; }
    if(novo.tipo !== 'nenhum' && !novo.valor){ alert('Informe o valor do prêmio.'); return; }

    const leitura = await lerSupabaseRoletaV18();
    let premios = leitura.cfg.premios || [];
    if(premios.length >= 8){ alert('Limite de 8 prêmios na roleta.'); return; }
    premios = [...premios, novo];
    const limite = n(document.getElementById('roleta-limite-admin')?.value || leitura.cfg.limite || 0);
    const resp = await salvarSupabaseRoletaV18({ limite, premios });
    if(resp.error){ alert('NÃO salvou no Supabase. Erro real: '+(resp.error.message || resp.error)); return; }

    const txt = document.getElementById('premio-texto'); if(txt) txt.value = '';
    const val = document.getElementById('premio-valor'); if(val) val.value = '';
    if(typeof carregarConfigRoletaAtualizada === 'function') await carregarConfigRoletaAtualizada();
    await window.renderizarRoletaAdmin();
    alert('Prêmio adicionado e salvo no Supabase.');
  };

  window.removerPremioRoletaAdmin = async function(i){
    const leitura = await lerSupabaseRoletaV18();
    if(leitura.error){ alert('Não consegui ler do Supabase: '+(leitura.error.message || leitura.error)); return; }
    const premios = (leitura.cfg.premios || []).filter((_,idx)=>idx !== i);
    if(!premios.length){ alert('A roleta precisa ter pelo menos 1 prêmio.'); return; }
    const resp = await salvarSupabaseRoletaV18({ limite:leitura.cfg.limite, premios });
    if(resp.error){ alert('NÃO removeu no Supabase. Erro real: '+(resp.error.message || resp.error)); return; }
    if(typeof carregarConfigRoletaAtualizada === 'function') await carregarConfigRoletaAtualizada();
    await window.renderizarRoletaAdmin();
  };

  window.diagnosticoRoletaSupabase = async function(){
    const leitura = await lerSupabaseRoletaV18();
    if(leitura.error){ alert('Erro ao ler Supabase: '+(leitura.error.message || leitura.error)); return; }
    alert('Lendo do Supabase: '+ leitura.cfg.premios.map(p=>p.texto).join(', '));
  };

  const antigoRenderConfig = window.renderizarConfigAdmin;
  window.renderizarConfigAdmin = function(){
    if(typeof antigoRenderConfig === 'function') antigoRenderConfig();
    setTimeout(()=>window.renderizarRoletaAdmin(), 50);
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(()=>window.renderizarRoletaAdmin(), 500);
  });
})();
